# Guardrail Pipeline
from .input_validator import InputValidator
from .output_filter import OutputFilter
from .confidence_checker import ConfidenceChecker
from .pii_detector import PIIDetector
from typing import Dict
from transformers import AutoTokenizer, AutoModelForSequenceClassification
import torch
import asyncio

class GuardrailPipeline:
    """Layered safety checks for inputs and outputs"""
    
    def __init__(self):
        self.input_validator = InputValidator()
        self.output_filter = OutputFilter()
        self.confidence_checker = ConfidenceChecker()
        self.pii_detector = PIIDetector()

        # Initialize NLI model for hallucination detection
        self.nli_model_name = "microsoft/deberta-v3-base-mnli"
        self.nli_tokenizer = None
        self.nli_model = None
        self._init_nli_model()
        
    async def validate_input(self, ticket: Dict) -> Dict:
        """Multi-layer input validation"""
        
        # Length checks
        if len(ticket.get('body', '')) > 10000:
            return {"safe": False, "reason": "Ticket body too long"}
        
        # Injection detection
        injection_check = self.input_validator.detect_prompt_injection(
            ticket['body']
        )
        if not injection_check['safe']:
            return injection_check
        
        # Rate limiting (check cache)
        rate_check = await self._check_rate_limit(ticket['user_id'])
        if not rate_check['safe']:
            return rate_check
        
        return {"safe": True}
    
    async def validate_output(self, text: str, confidence: float) -> Dict:
        """Multi-layer output validation"""
        
        # PII detection
        pii_check = self.pii_detector.scan(text)
        if not pii_check['safe']:
            return pii_check
        
        # Confidence gating
        if not self.confidence_checker.meets_threshold(confidence):
            return {
                "safe": False, 
                "reason": f"Confidence {confidence} below threshold 0.75"
            }
        
        # Content safety
        toxicity_check = await self.output_filter.check_toxicity(text)
        if not toxicity_check['safe']:
            return toxicity_check
        
        # Factual consistency check
        consistency = await self._check_consistency(text)
        if consistency['score'] < 0.7:
            return {
                "safe": False,
                "reason": "Potential hallucination detected"
            }
        
        return {"safe": True}
    
    async def _check_rate_limit(self, user_id: str) -> Dict:
        """Rate limiting per user"""
        from ..services.cache import CacheService
        
        cache = CacheService()
        key = f"rate_limit:{user_id}"
        
        count = await cache.increment(key)
        if count == 1:
            await cache.expire(key, 3600)  # 1 hour window
        
        if count > 10:  # Max 10 tickets/hour
            return {"safe": False, "reason": "Rate limit exceeded"}
        
        return {"safe": True}
    
    def _init_nli_model(self):
        """Lazy load NLI model"""
        try:
            self.nli_tokenizer = AutoTokenizer.from_pretrained(self.nli_model_name)
            self.nli_model = AutoModelForSequenceClassification.from_pretrained(
                self.nli_model_name
            )
            self.nli_model.eval()

            # Move to GPU if available
            if torch.cuda.is_available():
                self.nli_model = self.nli_model.cuda()
        except Exception as e:
            print(f"Warning: Failed to load NLI model: {e}")
            self.nli_model = None

    async def _check_consistency(self, text: str, premise: str = None) -> Dict:
        """Check for hallucinations using NLI model

        Args:
            text: Generated response text to check
            premise: Optional ground truth/context to verify against

        Returns:
            Dict with 'score' indicating consistency (0-1, higher is better)
        """
        if self.nli_model is None or self.nli_tokenizer is None:
            # Fallback if model not loaded
            return {"score": 0.8}

        try:
            # If no premise provided, use general factual checks
            if premise is None:
                premise = self._extract_knowledge_base_context(text)
                if premise is None:
                    return {"score": 0.85}  # No context to verify

            # Run NLI inference in thread pool to avoid blocking
            consistency_score = await asyncio.to_thread(
                self._run_nli_inference,
                premise,
                text
            )

            return {"score": consistency_score}

        except Exception as e:
            print(f"Error in consistency check: {e}")
            return {"score": 0.75}  # Conservative fallback

    def _run_nli_inference(self, premise: str, hypothesis: str) -> float:
        """Run NLI model to check if hypothesis is entailed by premise

        Returns:
            Float score between 0-1 where:
            - 1.0 = entailment (hypothesis is supported by premise)
            - 0.5 = neutral
            - 0.0 = contradiction (hallucination detected)
        """
        # Tokenize input
        inputs = self.nli_tokenizer(
            premise,
            hypothesis,
            truncation=True,
            max_length=512,
            padding=True,
            return_tensors="pt"
        )

        # Move to same device as model
        if torch.cuda.is_available():
            inputs = {k: v.cuda() for k, v in inputs.items()}

        # Run inference
        with torch.no_grad():
            outputs = self.nli_model(**inputs)
            logits = outputs.logits
            probs = torch.nn.functional.softmax(logits, dim=-1)

        # Extract probabilities: [contradiction, neutral, entailment]
        contradiction_prob = probs[0][0].item()
        neutral_prob = probs[0][1].item()
        entailment_prob = probs[0][2].item()

        # Calculate consistency score
        # High entailment = good, high contradiction = bad
        consistency_score = entailment_prob + (0.5 * neutral_prob)

        return consistency_score

    def _extract_knowledge_base_context(self, text: str) -> str:
        """Extract relevant context from knowledge base for verification

        This is a placeholder - should integrate with RAG service
        to retrieve factual context related to the generated text
        """
        # TODO: Integrate with RAG service to get relevant docs
        # For now, return None to skip verification without context
        return None
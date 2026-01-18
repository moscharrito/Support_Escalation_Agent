# Output Filter - Validates AI-generated responses for safety
import re
import os
from typing import Dict, Optional
import httpx


class OutputFilter:
    """Filters and validates AI-generated output for safety and quality"""

    BLOCKED_PATTERNS = [
        r'\b\d{3}[-\s]?\d{2}[-\s]?\d{4}\b',  # SSN
        r'\b(?:\d{4}[-\s]?){3}\d{4}\b',  # Credit card
        r'password[:\s]+\S+',  # Password in text
        r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b',  # Email
    ]

    TOXIC_PATTERNS = [
        r'\b(kill|murder|harm|attack)\s+(yourself|themselves|himself|herself)\b',
        r'\b(stupid|idiot|moron|dumb)\s+(customer|user|person)\b',
        r'\b(hate|despise)\s+(you|them|customers)\b',
    ]

    HALLUCINATION_INDICATORS = [
        r'as an ai',
        r'i cannot',
        r'i don\'t have access',
        r'i\'m not able to',
        r'my training data',
        r'my knowledge cutoff',
    ]

    def __init__(self):
        self._compiled_blocked = [
            re.compile(p, re.IGNORECASE) for p in self.BLOCKED_PATTERNS
        ]
        self._compiled_toxic = [
            re.compile(p, re.IGNORECASE) for p in self.TOXIC_PATTERNS
        ]
        self._compiled_hallucination = [
            re.compile(p, re.IGNORECASE) for p in self.HALLUCINATION_INDICATORS
        ]
        self.perspective_api_key = os.getenv("PERSPECTIVE_API_KEY")

    def validate_output(self, text: str, confidence: float) -> Dict:
        """Multi-layered output validation

        Args:
            text: Generated response text
            confidence: Model confidence score

        Returns:
            Dict with 'safe' boolean and 'reason' if unsafe
        """
        # PII detection
        for pattern in self._compiled_blocked:
            if pattern.search(text):
                return {"safe": False, "reason": "PII detected in output"}

        # Confidence threshold check
        if confidence < 0.7:
            return {"safe": False, "reason": "Low confidence score"}

        # Basic toxicity check
        for pattern in self._compiled_toxic:
            if pattern.search(text):
                return {"safe": False, "reason": "Toxic content detected"}

        # Check for AI self-reference (potential hallucination)
        hallucination_count = sum(
            1 for p in self._compiled_hallucination if p.search(text)
        )
        if hallucination_count >= 2:
            return {"safe": False, "reason": "Potential hallucination detected"}

        return {"safe": True}

    async def check_toxicity(self, text: str) -> Dict:
        """Check text toxicity using Perspective API

        Args:
            text: Text to check for toxicity

        Returns:
            Dict with 'safe' boolean, 'score', and details
        """
        if not self.perspective_api_key:
            # Fallback to pattern-based detection
            return self._pattern_based_toxicity_check(text)

        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"https://commentanalyzer.googleapis.com/v1alpha1/comments:analyze?key={self.perspective_api_key}",
                    json={
                        "comment": {"text": text},
                        "languages": ["en"],
                        "requestedAttributes": {
                            "TOXICITY": {},
                            "SEVERE_TOXICITY": {},
                            "INSULT": {},
                            "THREAT": {}
                        }
                    },
                    timeout=5.0
                )

                if response.status_code == 200:
                    data = response.json()
                    scores = data.get("attributeScores", {})

                    toxicity_score = scores.get("TOXICITY", {}).get(
                        "summaryScore", {}
                    ).get("value", 0)

                    severe_toxicity = scores.get("SEVERE_TOXICITY", {}).get(
                        "summaryScore", {}
                    ).get("value", 0)

                    if toxicity_score > 0.8 or severe_toxicity > 0.5:
                        return {
                            "safe": False,
                            "reason": "High toxicity detected",
                            "score": toxicity_score,
                            "severe_score": severe_toxicity
                        }

                    return {"safe": True, "score": toxicity_score}

        except Exception as e:
            print(f"Perspective API error: {e}")

        # Fallback to pattern-based detection
        return self._pattern_based_toxicity_check(text)

    def _pattern_based_toxicity_check(self, text: str) -> Dict:
        """Pattern-based toxicity detection fallback

        Args:
            text: Text to check

        Returns:
            Dict with 'safe' boolean and 'reason' if toxic
        """
        for pattern in self._compiled_toxic:
            if pattern.search(text):
                return {
                    "safe": False,
                    "reason": "Toxic content detected",
                    "score": 0.9
                }

        return {"safe": True, "score": 0.1}

    def check_response_quality(self, text: str) -> Dict:
        """Check response quality metrics

        Args:
            text: Response text to evaluate

        Returns:
            Dict with quality metrics
        """
        # Length check
        if len(text) < 20:
            return {
                "quality": "poor",
                "reason": "Response too short",
                "score": 0.3
            }

        if len(text) > 5000:
            return {
                "quality": "poor",
                "reason": "Response too long",
                "score": 0.5
            }

        # Check for incomplete sentences
        if text.rstrip()[-1] not in ".!?\"'":
            return {
                "quality": "medium",
                "reason": "Response may be incomplete",
                "score": 0.6
            }

        # Check for repetition
        words = text.lower().split()
        if len(words) > 10:
            unique_ratio = len(set(words)) / len(words)
            if unique_ratio < 0.4:
                return {
                    "quality": "poor",
                    "reason": "High word repetition",
                    "score": 0.4
                }

        return {"quality": "good", "score": 0.9}

    async def filter(self, text: str, confidence: float) -> Dict:
        """Full output filtering pipeline

        Args:
            text: Generated text to filter
            confidence: Model confidence score

        Returns:
            Dict with 'safe' boolean and filtering details
        """
        # Basic validation
        basic_check = self.validate_output(text, confidence)
        if not basic_check["safe"]:
            return basic_check

        # Toxicity check
        toxicity_check = await self.check_toxicity(text)
        if not toxicity_check["safe"]:
            return toxicity_check

        # Quality check
        quality_check = self.check_response_quality(text)
        if quality_check["quality"] == "poor":
            return {
                "safe": False,
                "reason": quality_check["reason"]
            }

        return {"safe": True, "quality": quality_check["quality"]}
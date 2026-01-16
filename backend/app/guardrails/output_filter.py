# output filter module for guardrails

import re

class OutputGuardrails:
    BLOCKED_PATTERNS = [
        r'\b\d{3}--\d{2}--\d{4}\b',
        r'\b\d{16}\b',
        r'password[:\s]+\S+',
    ]

    def validate_output(self, text: str, confidence: float) -> dict:
        """Multi-layererd output validation"""

        # PII detection
        for pattern in self.BLOCKED_PATTERNS:
            if re.search(pattern, text, re.IGNORECASE):
                return {
                    "safe": False, "reason": "PII detected"
                }
            # Confidence threshold check
            if confidence < 0.7:
                return {
                    "safe": False, "reason": "Low confidence"
                }
            
            # Toxicity check (integrate Perspective API)
            toxicity_score = self._check_toxicity(text)
            if toxicity_score > 0.8:
                return {
                    "safe": False, "reason": "Toxic content detected"
                }
            return {"safe": True, "reason": "Output is safe"}
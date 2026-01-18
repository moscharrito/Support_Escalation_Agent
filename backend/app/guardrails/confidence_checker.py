# Confidence Checker - Validates model confidence levels for safe auto-responses
from typing import Dict, Optional
from dataclasses import dataclass


@dataclass
class ConfidenceThresholds:
    """Configurable confidence thresholds for different actions"""
    auto_respond: float = 0.85
    gather_info: float = 0.70
    escalate: float = 0.50  # Below this always escalate


class ConfidenceChecker:
    """Checks and validates model confidence scores for response decisions"""

    def __init__(self, thresholds: Optional[ConfidenceThresholds] = None):
        self.thresholds = thresholds or ConfidenceThresholds()
        self.default_threshold = 0.75

    def meets_threshold(
        self,
        confidence: float,
        threshold: Optional[float] = None
    ) -> bool:
        """Check if confidence meets the specified threshold

        Args:
            confidence: Model confidence score (0-1)
            threshold: Optional custom threshold, uses default if not specified

        Returns:
            True if confidence meets or exceeds threshold
        """
        target = threshold if threshold is not None else self.default_threshold
        return confidence >= target

    def get_action_for_confidence(
        self,
        confidence: float,
        category: Optional[str] = None
    ) -> str:
        """Determine appropriate action based on confidence level

        Args:
            confidence: Model confidence score (0-1)
            category: Optional ticket category for context-specific decisions

        Returns:
            Action string: 'auto_respond', 'gather_info', or 'escalate'
        """
        # Always escalate for very low confidence
        if confidence < self.thresholds.escalate:
            return "escalate"

        # High-risk categories always need human review
        high_risk_categories = ["billing", "account_security", "legal", "refund"]
        if category and category.lower() in high_risk_categories:
            return "escalate"

        # Auto-respond only for high confidence
        if confidence >= self.thresholds.auto_respond:
            return "auto_respond"

        # Medium confidence: gather more information
        if confidence >= self.thresholds.gather_info:
            return "gather_info"

        return "escalate"

    def validate_confidence_score(self, confidence: float) -> Dict:
        """Validate that confidence score is within valid range

        Args:
            confidence: Model confidence score to validate

        Returns:
            Dict with 'valid' boolean and optional 'error' message
        """
        if not isinstance(confidence, (int, float)):
            return {
                "valid": False,
                "error": "Confidence must be a numeric value"
            }

        if confidence < 0 or confidence > 1:
            return {
                "valid": False,
                "error": f"Confidence {confidence} out of valid range [0, 1]"
            }

        return {"valid": True}

    def check(
        self,
        confidence: float,
        category: Optional[str] = None
    ) -> Dict:
        """Full confidence check with validation and action recommendation

        Args:
            confidence: Model confidence score (0-1)
            category: Optional ticket category

        Returns:
            Dict with 'safe' boolean, 'action' recommendation, and details
        """
        # Validate the confidence score
        validation = self.validate_confidence_score(confidence)
        if not validation["valid"]:
            return {
                "safe": False,
                "reason": validation["error"],
                "action": "escalate"
            }

        # Determine action
        action = self.get_action_for_confidence(confidence, category)

        # Confidence too low is not "safe" for auto-response
        if not self.meets_threshold(confidence):
            return {
                "safe": False,
                "reason": f"Confidence {confidence:.2f} below threshold {self.default_threshold}",
                "action": action,
                "confidence": confidence
            }

        return {
            "safe": True,
            "action": action,
            "confidence": confidence
        }

    def get_confidence_band(self, confidence: float) -> str:
        """Get human-readable confidence band

        Args:
            confidence: Model confidence score (0-1)

        Returns:
            String describing confidence level
        """
        if confidence >= 0.9:
            return "very_high"
        elif confidence >= 0.8:
            return "high"
        elif confidence >= 0.7:
            return "medium"
        elif confidence >= 0.5:
            return "low"
        else:
            return "very_low"

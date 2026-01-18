# PII Detector - Detects and flags personally identifiable information
import re
from typing import Dict, List, Optional
from dataclasses import dataclass


@dataclass
class PIIMatch:
    """Represents a detected PII instance"""
    pii_type: str
    value: str
    start: int
    end: int
    confidence: float


class PIIDetector:
    """Detects personally identifiable information in text"""

    # Regex patterns for various PII types
    PII_PATTERNS = {
        "ssn": {
            "pattern": r"\b\d{3}[-\s]?\d{2}[-\s]?\d{4}\b",
            "description": "Social Security Number"
        },
        "credit_card": {
            "pattern": r"\b(?:\d{4}[-\s]?){3}\d{4}\b",
            "description": "Credit Card Number"
        },
        "email": {
            "pattern": r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b",
            "description": "Email Address"
        },
        "phone": {
            "pattern": r"\b(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b",
            "description": "Phone Number"
        },
        "ip_address": {
            "pattern": r"\b(?:\d{1,3}\.){3}\d{1,3}\b",
            "description": "IP Address"
        },
        "date_of_birth": {
            "pattern": r"\b(?:0?[1-9]|1[0-2])[/-](?:0?[1-9]|[12]\d|3[01])[/-](?:19|20)\d{2}\b",
            "description": "Date of Birth"
        },
        "passport": {
            "pattern": r"\b[A-Z]{1,2}\d{6,9}\b",
            "description": "Passport Number"
        },
        "drivers_license": {
            "pattern": r"\b[A-Z]{1,2}\d{5,8}\b",
            "description": "Driver's License"
        },
        "bank_account": {
            "pattern": r"\b\d{8,17}\b",
            "description": "Bank Account Number"
        },
        "api_key": {
            "pattern": r"\b(?:sk|pk|api|key|token)[-_]?[a-zA-Z0-9]{20,}\b",
            "description": "API Key/Token"
        },
        "password_in_text": {
            "pattern": r"(?:password|passwd|pwd)\s*[:=]\s*\S+",
            "description": "Password in Text"
        },
    }

    # Context keywords that increase PII detection confidence
    CONTEXT_KEYWORDS = {
        "ssn": ["social security", "ssn", "ss#", "social"],
        "credit_card": ["card", "credit", "visa", "mastercard", "amex", "discover"],
        "phone": ["phone", "mobile", "cell", "tel", "call", "contact"],
        "email": ["email", "e-mail", "mail", "contact"],
        "date_of_birth": ["born", "birthday", "dob", "birth date", "date of birth"],
    }

    def __init__(self, sensitivity: str = "high"):
        """Initialize PII detector

        Args:
            sensitivity: Detection sensitivity level ('low', 'medium', 'high')
        """
        self.sensitivity = sensitivity
        self._compile_patterns()

    def _compile_patterns(self):
        """Compile regex patterns for efficiency"""
        self._compiled_patterns = {
            pii_type: re.compile(config["pattern"], re.IGNORECASE)
            for pii_type, config in self.PII_PATTERNS.items()
        }

    def detect(self, text: str) -> List[PIIMatch]:
        """Detect all PII instances in text

        Args:
            text: Text to scan for PII

        Returns:
            List of PIIMatch objects for each detected PII
        """
        matches = []
        text_lower = text.lower()

        for pii_type, pattern in self._compiled_patterns.items():
            for match in pattern.finditer(text):
                # Calculate confidence based on context
                confidence = self._calculate_confidence(
                    pii_type, text_lower, match.start()
                )

                # Filter by sensitivity
                if self._meets_sensitivity_threshold(confidence):
                    matches.append(PIIMatch(
                        pii_type=pii_type,
                        value=match.group(),
                        start=match.start(),
                        end=match.end(),
                        confidence=confidence
                    ))

        return matches

    def _calculate_confidence(
        self,
        pii_type: str,
        text_lower: str,
        position: int
    ) -> float:
        """Calculate detection confidence based on context

        Args:
            pii_type: Type of PII detected
            text_lower: Lowercase text for context analysis
            position: Position of match in text

        Returns:
            Confidence score (0-1)
        """
        base_confidence = 0.7

        # Check for context keywords nearby
        context_window = text_lower[max(0, position - 50):position + 50]
        keywords = self.CONTEXT_KEYWORDS.get(pii_type, [])

        for keyword in keywords:
            if keyword in context_window:
                base_confidence = min(1.0, base_confidence + 0.15)

        return base_confidence

    def _meets_sensitivity_threshold(self, confidence: float) -> bool:
        """Check if confidence meets sensitivity threshold"""
        thresholds = {
            "low": 0.9,
            "medium": 0.7,
            "high": 0.5
        }
        return confidence >= thresholds.get(self.sensitivity, 0.7)

    def scan(self, text: str) -> Dict:
        """Scan text for PII and return safety assessment

        Args:
            text: Text to scan

        Returns:
            Dict with 'safe' boolean, 'pii_found' list, and 'reason' if unsafe
        """
        matches = self.detect(text)

        if matches:
            pii_types = list(set(m.pii_type for m in matches))
            return {
                "safe": False,
                "reason": f"PII detected: {', '.join(pii_types)}",
                "pii_found": [
                    {
                        "type": m.pii_type,
                        "confidence": m.confidence,
                        "description": self.PII_PATTERNS[m.pii_type]["description"]
                    }
                    for m in matches
                ],
                "pii_count": len(matches)
            }

        return {"safe": True, "pii_found": [], "pii_count": 0}

    def redact(self, text: str, replacement: str = "[REDACTED]") -> str:
        """Redact detected PII from text

        Args:
            text: Text to redact
            replacement: String to replace PII with

        Returns:
            Text with PII redacted
        """
        matches = self.detect(text)

        # Sort matches by position (descending) to avoid offset issues
        matches.sort(key=lambda m: m.start, reverse=True)

        redacted = text
        for match in matches:
            redacted = (
                redacted[:match.start] +
                replacement +
                redacted[match.end:]
            )

        return redacted

    def get_pii_summary(self, text: str) -> Dict:
        """Get summary of PII types found in text

        Args:
            text: Text to analyze

        Returns:
            Dict with PII type counts and risk assessment
        """
        matches = self.detect(text)

        type_counts = {}
        for match in matches:
            type_counts[match.pii_type] = type_counts.get(match.pii_type, 0) + 1

        # Assess risk level
        high_risk_types = {"ssn", "credit_card", "bank_account", "password_in_text"}
        has_high_risk = any(t in type_counts for t in high_risk_types)

        return {
            "pii_types": type_counts,
            "total_count": len(matches),
            "risk_level": "high" if has_high_risk else ("medium" if matches else "low"),
            "contains_pii": len(matches) > 0
        }

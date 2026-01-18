# Input Validator - Detects prompt injection and malicious inputs
import re
from typing import Dict, List


class InputValidator:
    """Validates incoming ticket content for security threats and quality"""

    # Common prompt injection patterns
    INJECTION_PATTERNS: List[str] = [
        r"ignore\s+(previous|all|above)\s+(instructions?|prompts?)",
        r"disregard\s+(previous|all|your)\s+(instructions?|prompts?|rules?)",
        r"forget\s+(everything|all|your)\s+(instructions?|training)",
        r"you\s+are\s+now\s+(a|an)\s+\w+",
        r"pretend\s+(you\s+are|to\s+be)",
        r"act\s+as\s+(a|an|if)",
        r"new\s+instructions?:",
        r"system\s*:\s*",
        r"\[INST\]",
        r"<\|im_start\|>",
        r"<\|system\|>",
        r"###\s*(instruction|system|human|assistant)",
        r"jailbreak",
        r"DAN\s*mode",
        r"bypass\s+(safety|filter|restriction)",
    ]

    # Patterns for malicious content
    MALICIOUS_PATTERNS: List[str] = [
        r"<script[^>]*>",
        r"javascript:",
        r"on\w+\s*=",
        r"eval\s*\(",
        r"exec\s*\(",
        r"__import__",
        r"subprocess",
        r"os\.system",
        r"rm\s+-rf",
        r"DROP\s+TABLE",
        r"DELETE\s+FROM",
        r";\s*--",
    ]

    def __init__(self):
        # Compile regex patterns for efficiency
        self._injection_regex = [
            re.compile(p, re.IGNORECASE) for p in self.INJECTION_PATTERNS
        ]
        self._malicious_regex = [
            re.compile(p, re.IGNORECASE) for p in self.MALICIOUS_PATTERNS
        ]

    def detect_prompt_injection(self, text: str) -> Dict:
        """Detect potential prompt injection attempts

        Args:
            text: Input text to analyze

        Returns:
            Dict with 'safe' boolean and 'reason' if unsafe
        """
        text_lower = text.lower()

        # Check for prompt injection patterns
        for pattern in self._injection_regex:
            match = pattern.search(text_lower)
            if match:
                return {
                    "safe": False,
                    "reason": f"Potential prompt injection detected: {match.group()}"
                }

        # Check for malicious code patterns
        for pattern in self._malicious_regex:
            match = pattern.search(text)
            if match:
                return {
                    "safe": False,
                    "reason": f"Malicious content detected: {match.group()}"
                }

        return {"safe": True}

    def validate_format(self, ticket: Dict) -> Dict:
        """Validate ticket format and required fields

        Args:
            ticket: Ticket dictionary

        Returns:
            Dict with 'safe' boolean and 'reason' if invalid
        """
        required_fields = ["id", "body"]

        for field in required_fields:
            if field not in ticket:
                return {
                    "safe": False,
                    "reason": f"Missing required field: {field}"
                }

        # Validate field types
        if not isinstance(ticket.get("body", ""), str):
            return {
                "safe": False,
                "reason": "Ticket body must be a string"
            }

        if not isinstance(ticket.get("id", ""), str):
            return {
                "safe": False,
                "reason": "Ticket ID must be a string"
            }

        return {"safe": True}

    def validate_content_length(
        self,
        text: str,
        min_length: int = 10,
        max_length: int = 10000
    ) -> Dict:
        """Validate content length bounds

        Args:
            text: Text to validate
            min_length: Minimum allowed length
            max_length: Maximum allowed length

        Returns:
            Dict with 'safe' boolean and 'reason' if invalid
        """
        if len(text) < min_length:
            return {
                "safe": False,
                "reason": f"Content too short (min: {min_length} chars)"
            }

        if len(text) > max_length:
            return {
                "safe": False,
                "reason": f"Content too long (max: {max_length} chars)"
            }

        return {"safe": True}

    def detect_spam(self, text: str) -> Dict:
        """Detect potential spam content

        Args:
            text: Text to analyze

        Returns:
            Dict with 'safe' boolean and 'reason' if spam detected
        """
        # Check for excessive repeated characters
        if re.search(r"(.)\1{10,}", text):
            return {
                "safe": False,
                "reason": "Excessive character repetition detected"
            }

        # Check for excessive capitalization
        if len(text) > 20:
            upper_ratio = sum(1 for c in text if c.isupper()) / len(text)
            if upper_ratio > 0.7:
                return {
                    "safe": False,
                    "reason": "Excessive capitalization detected"
                }

        # Check for excessive special characters
        special_chars = sum(1 for c in text if not c.isalnum() and not c.isspace())
        if len(text) > 20 and special_chars / len(text) > 0.4:
            return {
                "safe": False,
                "reason": "Excessive special characters detected"
            }

        return {"safe": True}

    def validate(self, ticket: Dict) -> Dict:
        """Run all input validations

        Args:
            ticket: Ticket dictionary to validate

        Returns:
            Dict with 'safe' boolean and 'reason' if invalid
        """
        # Format validation
        format_check = self.validate_format(ticket)
        if not format_check["safe"]:
            return format_check

        body = ticket.get("body", "")

        # Length validation
        length_check = self.validate_content_length(body)
        if not length_check["safe"]:
            return length_check

        # Injection detection
        injection_check = self.detect_prompt_injection(body)
        if not injection_check["safe"]:
            return injection_check

        # Spam detection
        spam_check = self.detect_spam(body)
        if not spam_check["safe"]:
            return spam_check

        return {"safe": True}

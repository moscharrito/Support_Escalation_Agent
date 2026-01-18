# Ticket Classifier Agent - Classifies support tickets using Claude
import os
import json
from typing import Dict, Optional
from anthropic import AsyncAnthropic


class TicketClassifier:
    """Classifies support tickets into categories, priorities, and sentiment"""

    def __init__(self):
        self.client = AsyncAnthropic(
            api_key=os.getenv("ANTHROPIC_API_KEY")
        )
        self.model = "claude-sonnet-4-20250514"

    async def classify(self, ticket: Dict) -> Dict:
        """Classify a support ticket into predefined categories.

        Args:
            ticket: Dictionary containing ticket details (subject, body, etc.)

        Returns:
            Classification result with priority, category, sentiment, confidence
        """
        prompt = f"""Analyze the support ticket details below and classify it.

Ticket Details:
Subject: {ticket.get('subject', 'No subject')}
Body: {ticket['body']}
User History: {ticket.get('user_context', 'None')}

Classify into:
- priority: one of [critical, high, medium, low]
- category: one of [billing, technical, account_security, product_question, how_to, bug_report, feature_request, general]
- sentiment: one of [negative, neutral, positive]
- confidence: float between 0 and 1 indicating your confidence in this classification
- reasoning: brief explanation of your classification

Return ONLY valid JSON in this exact format:
{{
    "priority": "medium",
    "category": "product_question",
    "sentiment": "neutral",
    "confidence": 0.85,
    "reasoning": "Brief explanation here"
}}"""

        try:
            response = await self.client.messages.create(
                model=self.model,
                max_tokens=500,
                messages=[{"role": "user", "content": prompt}]
            )

            # Parse the response content correctly
            response_text = response.content[0].text

            # Extract JSON from the response
            classification = self._parse_classification(response_text)

            return classification

        except Exception as e:
            print(f"Classification error: {e}")
            # Return a safe default that triggers escalation
            return {
                "priority": "high",
                "category": "general",
                "sentiment": "neutral",
                "confidence": 0.0,
                "reasoning": f"Classification failed: {str(e)}",
                "error": True
            }

    def _parse_classification(self, response_text: str) -> Dict:
        """Parse the classification JSON from response text.

        Args:
            response_text: Raw response text from Claude

        Returns:
            Parsed classification dictionary
        """
        # Try to extract JSON from the response
        try:
            # First, try direct JSON parsing
            return json.loads(response_text)
        except json.JSONDecodeError:
            pass

        # Try to find JSON in the response
        import re
        json_match = re.search(r'\{[^{}]*\}', response_text, re.DOTALL)
        if json_match:
            try:
                return json.loads(json_match.group())
            except json.JSONDecodeError:
                pass

        # Fallback: return default classification
        return {
            "priority": "medium",
            "category": "general",
            "sentiment": "neutral",
            "confidence": 0.5,
            "reasoning": "Could not parse classification response"
        }

    async def classify_batch(self, tickets: list[Dict]) -> list[Dict]:
        """Classify multiple tickets.

        Args:
            tickets: List of ticket dictionaries

        Returns:
            List of classification results
        """
        import asyncio
        tasks = [self.classify(ticket) for ticket in tickets]
        return await asyncio.gather(*tasks)

    def validate_classification(self, classification: Dict) -> bool:
        """Validate that classification has required fields.

        Args:
            classification: Classification result to validate

        Returns:
            True if valid, False otherwise
        """
        required_fields = ["priority", "category", "sentiment", "confidence"]
        return all(field in classification for field in required_fields)
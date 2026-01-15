# Ticket Classifier Agent
from anthropic import Anthropic
from typing import Literal

class TicketClassifier:
    def __init__(self):
        self.client = Anthropic()

    async def classify(self, ticket: dict) -> dict:
        """Classify a support ticket into predefined categories."""

        #Implementation of the classification logic
        prompt = f""" Analyze the support ticket details below and
Classify the following support ticket into one of these categories:
- priority: critical, high, medium, low
- category: billing, technical, account, product
- sentiment: negative, neutral, positive
- confidence: 0 to 1
- reasoning: brief explanation

Ticket Details:
Subject: {ticket['subject']}
Body: {ticket['body']}
User History: {ticket.get('user_context', 'None')}

Return JSON with the classification results.
"""
        response = await self.client.messages.create(
            model= "claude-sonnet-4-20250514",
            max_tokens=500,
            messages=[{"role": "user", "content": prompt}]
        )

        # Parse and return the classification result
        classification = response['messages'][0]['content']
        return classification
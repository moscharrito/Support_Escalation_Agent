# responder module for handling agent responses

from anthropic import Anthropic

class ResponseAgent:
    TOOLS = [
        {
            "name": "search_knowledge_base",
            "description": "Search documentation for relevant information",
            "input_schema": {
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string"
                    }
                }
            }
        },
        {
            "name": "check_ticket_history",
            "description": "Get past tickets from user",
            "input_schema": {
                "type": "object",
                "properties": {
                    "user_id": {"type": "string"}
                }
            }
        }
    ]

    async def generate_response(self, ticket: dict, context: list) -> dict:
        """Generate response with tool usage"""
        
        system_prompt = """You are a support agent. Use Tools to gather information before responding.
        
Rules: 
- Be emphathetic and professional.
- Cite sources from knowledge base when applicable.
- Escalate if unsure or unable to resolve
- Never make up information."""

        messages = [{
            "role": "user",
            "content": f"Ticket: {ticket['body']}\n\nContext: {context}"
        }]

        response = self.client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=1500,
            system=system_prompt,
            tools=self.TOOLS,
            messages=messages
        )

        # Parse and return the response Loop
        return await self.parse_response(response, ticket)
# Response Agent - Generates support responses using Claude with tool usage
import os
import json
from typing import Dict, List, Any, Optional
from anthropic import AsyncAnthropic
from ..services.rag import RAGService


class ResponseAgent:
    """Agent for generating support ticket responses with tool integration"""

    TOOLS = [
        {
            "name": "search_knowledge_base",
            "description": "Search documentation for relevant information",
            "input_schema": {
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "Search query for the knowledge base"
                    }
                },
                "required": ["query"]
            }
        },
        {
            "name": "check_ticket_history",
            "description": "Get past tickets from user",
            "input_schema": {
                "type": "object",
                "properties": {
                    "user_id": {
                        "type": "string",
                        "description": "User ID to look up history for"
                    }
                },
                "required": ["user_id"]
            }
        }
    ]

    def __init__(self):
        self.client = AsyncAnthropic(
            api_key=os.getenv("ANTHROPIC_API_KEY")
        )
        self.rag_service = RAGService()
        self.model = "claude-sonnet-4-20250514"
        self.max_tool_iterations = 5

    async def generate_response(
        self,
        ticket: Dict,
        context: List[Dict],
        classification: Optional[Dict] = None
    ) -> Dict:
        """Generate response with tool usage

        Args:
            ticket: The ticket to respond to
            context: Pre-retrieved context from RAG
            classification: Optional ticket classification

        Returns:
            Dict with response text, confidence, and metadata
        """
        system_prompt = self._build_system_prompt(classification)

        # Format context for the prompt
        context_text = self._format_context(context)

        messages = [{
            "role": "user",
            "content": f"""Please help with the following support ticket:

Subject: {ticket.get('subject', 'No subject')}

Ticket Content:
{ticket['body']}

Available Context:
{context_text}

Please provide a helpful, professional response to resolve this ticket."""
        }]

        # Agentic loop with tool use
        response = await self._run_agent_loop(messages, system_prompt, ticket)

        return response

    def _build_system_prompt(self, classification: Optional[Dict] = None) -> str:
        """Build system prompt based on classification"""
        base_prompt = """You are a helpful customer support agent. Your goal is to resolve customer issues efficiently and professionally.

Rules:
- Be empathetic and professional in all responses
- Cite sources from the knowledge base when applicable
- If you need more information, use the available tools
- Escalate if you are unsure or unable to resolve the issue
- NEVER make up information or provide inaccurate details
- Keep responses concise but thorough
- Always acknowledge the customer's concern"""

        if classification:
            priority = classification.get("priority", "medium")
            category = classification.get("category", "general")
            base_prompt += f"""

Ticket Context:
- Priority: {priority}
- Category: {category}
- Adjust your response tone and urgency accordingly."""

        return base_prompt

    def _format_context(self, context: List[Dict]) -> str:
        """Format retrieved context for the prompt"""
        if not context:
            return "No additional context available."

        formatted = []
        for i, ctx in enumerate(context, 1):
            source = ctx.get("source", "unknown")
            content = ctx.get("content", "")
            score = ctx.get("score", 0)
            formatted.append(f"[{i}] Source: {source} (relevance: {score:.2f})\n{content}")

        return "\n\n".join(formatted)

    async def _run_agent_loop(
        self,
        messages: List[Dict],
        system_prompt: str,
        ticket: Dict
    ) -> Dict:
        """Run the agent loop with tool usage

        Args:
            messages: Conversation messages
            system_prompt: System prompt for the agent
            ticket: Original ticket for context

        Returns:
            Final response dict
        """
        iteration = 0
        tool_uses = []

        while iteration < self.max_tool_iterations:
            iteration += 1

            response = await self.client.messages.create(
                model=self.model,
                max_tokens=1500,
                system=system_prompt,
                tools=self.TOOLS,
                messages=messages
            )

            # Check if we got tool use or final response
            if response.stop_reason == "tool_use":
                # Handle tool calls
                tool_results = await self._handle_tool_calls(
                    response.content, ticket
                )
                tool_uses.extend(tool_results["tool_uses"])

                # Add assistant message and tool results to conversation
                messages.append({
                    "role": "assistant",
                    "content": response.content
                })
                messages.append({
                    "role": "user",
                    "content": tool_results["content"]
                })
            else:
                # Final response
                return self._parse_final_response(response, tool_uses)

        # Max iterations reached
        return {
            "text": "I apologize, but I'm having difficulty resolving this issue. Let me escalate this to a human agent who can help you better.",
            "confidence": 0.3,
            "should_escalate": True,
            "tool_uses": tool_uses,
            "reason": "Max tool iterations reached"
        }

    async def _handle_tool_calls(
        self,
        content: List,
        ticket: Dict
    ) -> Dict:
        """Handle tool calls from the model

        Args:
            content: Response content with tool use blocks
            ticket: Original ticket

        Returns:
            Dict with tool results and uses
        """
        tool_results = []
        tool_uses = []

        for block in content:
            if block.type == "tool_use":
                tool_name = block.name
                tool_input = block.input

                # Execute the tool
                result = await self._execute_tool(tool_name, tool_input, ticket)

                tool_uses.append({
                    "tool": tool_name,
                    "input": tool_input,
                    "output": result
                })

                tool_results.append({
                    "type": "tool_result",
                    "tool_use_id": block.id,
                    "content": json.dumps(result)
                })

        return {
            "content": tool_results,
            "tool_uses": tool_uses
        }

    async def _execute_tool(
        self,
        tool_name: str,
        tool_input: Dict,
        ticket: Dict
    ) -> Any:
        """Execute a tool and return results

        Args:
            tool_name: Name of the tool to execute
            tool_input: Input parameters for the tool
            ticket: Original ticket for context

        Returns:
            Tool execution result
        """
        if tool_name == "search_knowledge_base":
            query = tool_input.get("query", ticket.get("body", ""))
            results = await self.rag_service.retrieve_context(
                query=query,
                collection="product_docs",
                limit=3
            )
            return {
                "results": results,
                "query": query
            }

        elif tool_name == "check_ticket_history":
            user_id = tool_input.get("user_id", ticket.get("user_id"))
            # This would integrate with the database
            # For now, return placeholder
            return {
                "user_id": user_id,
                "past_tickets": [],
                "message": "User history lookup completed"
            }

        return {"error": f"Unknown tool: {tool_name}"}

    def _parse_final_response(
        self,
        response,
        tool_uses: List[Dict]
    ) -> Dict:
        """Parse the final response from the model

        Args:
            response: Anthropic API response
            tool_uses: List of tool uses during generation

        Returns:
            Parsed response dict
        """
        # Extract text from response content
        text = ""
        for block in response.content:
            if hasattr(block, "text"):
                text += block.text

        # Calculate confidence based on response characteristics
        confidence = self._calculate_confidence(text, tool_uses)

        return {
            "text": text.strip(),
            "confidence": confidence,
            "should_escalate": confidence < 0.7,
            "tool_uses": tool_uses,
            "tokens_used": response.usage.input_tokens + response.usage.output_tokens,
            "model": self.model
        }

    def _calculate_confidence(
        self,
        text: str,
        tool_uses: List[Dict]
    ) -> float:
        """Calculate confidence score for the response

        Args:
            text: Response text
            tool_uses: Tool uses during generation

        Returns:
            Confidence score (0-1)
        """
        confidence = 0.8  # Base confidence

        # Increase confidence if tools were used successfully
        if tool_uses:
            successful_tools = sum(
                1 for t in tool_uses if "error" not in t.get("output", {})
            )
            confidence += 0.05 * min(successful_tools, 2)

        # Decrease confidence for uncertainty indicators
        uncertainty_phrases = [
            "i'm not sure",
            "i don't know",
            "i cannot",
            "might be",
            "possibly",
            "unclear"
        ]
        text_lower = text.lower()
        for phrase in uncertainty_phrases:
            if phrase in text_lower:
                confidence -= 0.1

        # Decrease confidence for very short responses
        if len(text) < 100:
            confidence -= 0.1

        return max(0.1, min(1.0, confidence))
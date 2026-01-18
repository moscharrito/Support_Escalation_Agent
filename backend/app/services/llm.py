# LLM Service - Unified interface for LLM interactions
import os
from typing import Dict, List, Optional, AsyncIterator, Any
from anthropic import AsyncAnthropic
from dataclasses import dataclass


@dataclass
class LLMResponse:
    """Structured LLM response"""
    text: str
    model: str
    input_tokens: int
    output_tokens: int
    stop_reason: str


class LLMService:
    """Unified service for LLM interactions with Anthropic Claude"""

    def __init__(self):
        self.client = AsyncAnthropic(
            api_key=os.getenv("ANTHROPIC_API_KEY")
        )
        self.default_model = os.getenv(
            "DEFAULT_MODEL",
            "claude-sonnet-4-20250514"
        )
        self.max_tokens = int(os.getenv("MAX_TOKENS", "2000"))

    async def generate(
        self,
        prompt: str,
        system: Optional[str] = None,
        model: Optional[str] = None,
        max_tokens: Optional[int] = None,
        temperature: float = 0.7,
        stop_sequences: Optional[List[str]] = None
    ) -> LLMResponse:
        """Generate a response from the LLM

        Args:
            prompt: User prompt/message
            system: Optional system prompt
            model: Model to use (defaults to configured default)
            max_tokens: Maximum tokens in response
            temperature: Sampling temperature (0-1)
            stop_sequences: Optional stop sequences

        Returns:
            LLMResponse with generated text and metadata
        """
        messages = [{"role": "user", "content": prompt}]

        kwargs: Dict[str, Any] = {
            "model": model or self.default_model,
            "max_tokens": max_tokens or self.max_tokens,
            "messages": messages,
        }

        if system:
            kwargs["system"] = system

        if temperature != 0.7:
            kwargs["temperature"] = temperature

        if stop_sequences:
            kwargs["stop_sequences"] = stop_sequences

        response = await self.client.messages.create(**kwargs)

        return LLMResponse(
            text=response.content[0].text,
            model=response.model,
            input_tokens=response.usage.input_tokens,
            output_tokens=response.usage.output_tokens,
            stop_reason=response.stop_reason
        )

    async def generate_with_tools(
        self,
        prompt: str,
        tools: List[Dict],
        system: Optional[str] = None,
        model: Optional[str] = None,
        max_tokens: Optional[int] = None
    ) -> Dict:
        """Generate a response with tool use capabilities

        Args:
            prompt: User prompt/message
            tools: List of tool definitions
            system: Optional system prompt
            model: Model to use
            max_tokens: Maximum tokens

        Returns:
            Response dict with content and tool use information
        """
        messages = [{"role": "user", "content": prompt}]

        kwargs: Dict[str, Any] = {
            "model": model or self.default_model,
            "max_tokens": max_tokens or self.max_tokens,
            "messages": messages,
            "tools": tools
        }

        if system:
            kwargs["system"] = system

        response = await self.client.messages.create(**kwargs)

        return {
            "content": response.content,
            "stop_reason": response.stop_reason,
            "model": response.model,
            "usage": {
                "input_tokens": response.usage.input_tokens,
                "output_tokens": response.usage.output_tokens
            }
        }

    async def stream(
        self,
        prompt: str,
        system: Optional[str] = None,
        model: Optional[str] = None,
        max_tokens: Optional[int] = None
    ) -> AsyncIterator[str]:
        """Stream a response from the LLM

        Args:
            prompt: User prompt/message
            system: Optional system prompt
            model: Model to use
            max_tokens: Maximum tokens

        Yields:
            Text chunks as they are generated
        """
        messages = [{"role": "user", "content": prompt}]

        kwargs: Dict[str, Any] = {
            "model": model or self.default_model,
            "max_tokens": max_tokens or self.max_tokens,
            "messages": messages,
        }

        if system:
            kwargs["system"] = system

        async with self.client.messages.stream(**kwargs) as stream:
            async for text in stream.text_stream:
                yield text

    async def chat(
        self,
        messages: List[Dict[str, str]],
        system: Optional[str] = None,
        model: Optional[str] = None,
        max_tokens: Optional[int] = None
    ) -> LLMResponse:
        """Multi-turn chat with conversation history

        Args:
            messages: List of message dicts with 'role' and 'content'
            system: Optional system prompt
            model: Model to use
            max_tokens: Maximum tokens

        Returns:
            LLMResponse with generated text
        """
        kwargs: Dict[str, Any] = {
            "model": model or self.default_model,
            "max_tokens": max_tokens or self.max_tokens,
            "messages": messages,
        }

        if system:
            kwargs["system"] = system

        response = await self.client.messages.create(**kwargs)

        return LLMResponse(
            text=response.content[0].text,
            model=response.model,
            input_tokens=response.usage.input_tokens,
            output_tokens=response.usage.output_tokens,
            stop_reason=response.stop_reason
        )

    async def count_tokens(self, text: str) -> int:
        """Estimate token count for text

        Args:
            text: Text to count tokens for

        Returns:
            Estimated token count
        """
        # Rough estimation: ~4 characters per token for English
        return len(text) // 4

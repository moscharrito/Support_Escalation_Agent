# app/services/cost_optimizer.py
from functools import lru_cache
import tiktoken

class CostOptimizer:
    """Optimize LLM costs through caching and prompt compression"""
    
    def __init__(self):
        self.encoding = tiktoken.get_encoding("cl100k_base")
        
    @lru_cache(maxsize=1000)
    def get_cached_classification(self, ticket_hash: str):
        """Cache classifications for similar tickets"""
        # Check Redis cache first
        pass
    
    def compress_context(self, contexts: List[Dict], max_tokens: int = 2000) -> str:
        """Compress contexts to fit token budget"""
        
        combined = ""
        token_count = 0
        
        for ctx in contexts:
            ctx_text = f"{ctx['source']}: {ctx['content']}\n\n"
            ctx_tokens = len(self.encoding.encode(ctx_text))
            
            if token_count + ctx_tokens > max_tokens:
                # Truncate or summarize
                remaining = max_tokens - token_count
                truncated = self._truncate_to_tokens(ctx_text, remaining)
                combined += truncated
                break
            
            combined += ctx_text
            token_count += ctx_tokens
        
        return combined
    
    def _truncate_to_tokens(self, text: str, max_tokens: int) -> str:
        """Truncate text to max tokens"""
        tokens = self.encoding.encode(text)
        truncated = tokens[:max_tokens]
        return self.encoding.decode(truncated)
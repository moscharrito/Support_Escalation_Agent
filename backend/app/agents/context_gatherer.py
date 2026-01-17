# Context Gatherer Agent
from ..services.rag import RAGService
from ..services.cache import CacheService
from ..models.ticket import Ticket
from typing import List, Dict
import asyncio
import hashlib

class ContextGatherer:
    """Retrieves relevant context using RAG + metadata filtering"""
    
    def __init__(self):
        self.rag = RAGService()
        self.cache = CacheService()
        
    async def gather(self, ticket: Dict) -> List[Dict]:
        """Multi-source context retrieval with caching"""
        
        # Generate cache key
        cache_key = self._generate_cache_key(ticket)
        cached = await self.cache.get(cache_key)
        if cached:
            return cached
        
        # Parallel context gathering
        results = await asyncio.gather(
            self._get_documentation_context(ticket),
            self._get_user_history(ticket),
            self._get_similar_resolved_tickets(ticket)
        )
        
        docs_context, user_history, similar_tickets = results
        
        # Combine and rank
        combined_context = self._rank_and_merge(
            docs_context, 
            user_history, 
            similar_tickets
        )
        
        # Cache for 1 hour
        await self.cache.set(cache_key, combined_context, ttl=3600)
        
        return combined_context
    
    async def _get_documentation_context(self, ticket: Dict) -> List[Dict]:
        """RAG over product documentation"""
        query = f"{ticket['subject']} {ticket['body']}"
        return await self.rag.retrieve_context(
            query=query,
            collection="product_docs",
            limit=5,
            filters={"status": "published"}
        )
    
    async def _get_user_history(self, ticket: Dict) -> List[Dict]:
        """Retrieve past user interactions"""
        from ..database import get_db
        
        db = get_db()
        past_tickets = await db.tickets.find({
            "user_id": ticket['user_id'],
            "status": "resolved"
        }).sort("created_at", -1).limit(3).to_list(3)
        
        return [
            {
                "content": f"Past issue: {t['subject']} - Resolution: {t['resolution']}",
                "source": "user_history",
                "score": 1.0
            }
            for t in past_tickets
        ]
    
    async def _get_similar_resolved_tickets(self, ticket: Dict) -> List[Dict]:
        """Find similar successfully resolved tickets"""
        query = ticket['body']
        return await self.rag.retrieve_context(
            query=query,
            collection="resolved_tickets",
            limit=3,
            filters={"resolution_type": "auto_resolved"}
        )
    
    def _rank_and_merge(self, *contexts) -> List[Dict]:
        """Re-rank combined contexts by relevance"""
        all_contexts = []
        for ctx_list in contexts:
            all_contexts.extend(ctx_list)
        
        # Sort by score, deduplicate
        seen = set()
        ranked = []
        
        for ctx in sorted(all_contexts, key=lambda x: x['score'], reverse=True):
            content_hash = hashlib.md5(ctx['content'].encode()).hexdigest()
            if content_hash not in seen:
                seen.add(content_hash)
                ranked.append(ctx)
        
        return ranked[:8]  # Top 8 contexts
    
    def _generate_cache_key(self, ticket: Dict) -> str:
        """Generate deterministic cache key"""
        key_data = f"{ticket['subject']}:{ticket['body'][:100]}:{ticket['user_id']}"
        return f"context:{hashlib.md5(key_data.encode()).hexdigest()}"
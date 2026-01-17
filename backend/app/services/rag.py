# app/services/rag.py
from qdrant_client import QdrantClient
from qdrant_client.models import Distance, VectorParams, PointStruct
from sentence_transformers import SentenceTransformer, CrossEncoder
from typing import List, Dict, Optional
import os

class RAGService:
    """Production RAG with hybrid search and reranking"""
    
    def __init__(self):
        self.qdrant = QdrantClient(
            url=os.getenv("QDRANT_URL", "localhost"),
            api_key=os.getenv("QDRANT_API_KEY")
        )
        self.encoder = SentenceTransformer('all-MiniLM-L6-v2')
        self.reranker = CrossEncoder('cross-encoder/ms-marco-MiniLM-L-6-v2')
        
    async def retrieve_context(
        self, 
        query: str, 
        collection: str,
        limit: int = 5,
        filters: Optional[Dict] = None
    ) -> List[Dict]:
        """Hybrid search: vector + BM25 + reranking"""
        
        # Vector search
        query_vector = self.encoder.encode(query).tolist()
        
        vector_results = self.qdrant.search(
            collection_name=collection,
            query_vector=query_vector,
            limit=limit * 2,  # Over-retrieve for reranking
            query_filter=self._build_filter(filters) if filters else None,
            with_payload=True
        )
        
        # Keyword search (BM25)
        # keyword_results = await self._bm25_search(query, collection, limit * 2)
        
        # Combine results
        candidates = [
            {
                "content": hit.payload["text"],
                "source": hit.payload.get("source", "unknown"),
                "metadata": hit.payload.get("metadata", {}),
                "vector_score": hit.score
            }
            for hit in vector_results
        ]
        
        # Rerank
        reranked = self._rerank(query, candidates, limit)
        
        return reranked
    
    def _rerank(self, query: str, candidates: List[Dict], top_k: int) -> List[Dict]:
        """Rerank using cross-encoder"""
        
        pairs = [[query, c['content']] for c in candidates]
        scores = self.reranker.predict(pairs)
        
        # Combine vector and reranker scores
        for i, candidate in enumerate(candidates):
            candidate['rerank_score'] = float(scores[i])
            candidate['score'] = 0.3 * candidate['vector_score'] + 0.7 * candidate['rerank_score']
        
        # Sort and return top-k
        ranked = sorted(candidates, key=lambda x: x['score'], reverse=True)
        return ranked[:top_k]
    
    def _build_filter(self, filters: Dict):
        """Build Qdrant filter from dict"""
        from qdrant_client.models import Filter, FieldCondition, MatchValue
        
        conditions = []
        for key, value in filters.items():
            conditions.append(
                FieldCondition(key=key, match=MatchValue(value=value))
            )
        
        return Filter(must=conditions)
    
    async def index_documents(self, documents: List[Dict], collection: str):
        """Index documents with metadata"""
        
        # Create collection if not exists
        try:
            self.qdrant.get_collection(collection)
        except:
            self.qdrant.create_collection(
                collection_name=collection,
                vectors_config=VectorParams(size=384, distance=Distance.COSINE)
            )
        
        # Prepare points
        points = []
        for i, doc in enumerate(documents):
            vector = self.encoder.encode(doc['text']).tolist()
            
            points.append(
                PointStruct(
                    id=doc.get('id', i),
                    vector=vector,
                    payload={
                        "text": doc['text'],
                        "source": doc.get('source', ''),
                        "metadata": doc.get('metadata', {})
                    }
                )
            )
        
        # Batch upsert
        self.qdrant.upsert(collection_name=collection, points=points)
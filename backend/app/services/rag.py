# Rag Service
from qdrant_client import QdrantClient
from sentence_transformers import SentenceTransformer

class RAGService:
    def __init__(self):
        self.client = QdrantClient(":memory")
        self.encoder = SentenceTransformer("all-MiniLM-L6-v2")

    async def retrieve_context(self, query: str, limit: int = 5) -> list:
        """Hybrid Search to retrieve relevant documents based on the query"""

        # Vector Search
        query_vector = self.encoder.encode(query).tolist()

        results = self.client.search(
            collection_name="support_docs",
            query_vector=query_vector,
            limit=limit,
            score_threshold=0.7
        )

        return [
            { 
                "content": hit.payload["text"],
                "source": hit.payload["source"],
                "score": hit.score
            }
            for hit in results
        ]
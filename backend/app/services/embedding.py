# Embedding Service - Generate text embeddings for RAG and similarity search
import os
from typing import List, Optional
from sentence_transformers import SentenceTransformer
import numpy as np


class EmbeddingService:
    """Service for generating text embeddings using sentence transformers"""

    def __init__(self, model_name: Optional[str] = None):
        self.model_name = model_name or os.getenv(
            "EMBEDDING_MODEL",
            "all-MiniLM-L6-v2"
        )
        self._model: Optional[SentenceTransformer] = None

    @property
    def model(self) -> SentenceTransformer:
        """Lazy load the embedding model"""
        if self._model is None:
            self._model = SentenceTransformer(self.model_name)
        return self._model

    def embed_text(self, text: str) -> List[float]:
        """Generate embedding for a single text

        Args:
            text: Text to embed

        Returns:
            List of floats representing the embedding vector
        """
        embedding = self.model.encode(text, convert_to_numpy=True)
        return embedding.tolist()

    def embed_texts(self, texts: List[str]) -> List[List[float]]:
        """Generate embeddings for multiple texts

        Args:
            texts: List of texts to embed

        Returns:
            List of embedding vectors
        """
        embeddings = self.model.encode(texts, convert_to_numpy=True)
        return embeddings.tolist()

    def embed_query(self, query: str) -> List[float]:
        """Generate embedding optimized for queries

        Args:
            query: Query text to embed

        Returns:
            Query embedding vector
        """
        # Some models have specific query prefixes
        return self.embed_text(query)

    def embed_document(self, document: str) -> List[float]:
        """Generate embedding optimized for documents

        Args:
            document: Document text to embed

        Returns:
            Document embedding vector
        """
        return self.embed_text(document)

    def similarity(self, embedding1: List[float], embedding2: List[float]) -> float:
        """Calculate cosine similarity between two embeddings

        Args:
            embedding1: First embedding vector
            embedding2: Second embedding vector

        Returns:
            Cosine similarity score (0-1)
        """
        vec1 = np.array(embedding1)
        vec2 = np.array(embedding2)

        dot_product = np.dot(vec1, vec2)
        norm1 = np.linalg.norm(vec1)
        norm2 = np.linalg.norm(vec2)

        if norm1 == 0 or norm2 == 0:
            return 0.0

        return float(dot_product / (norm1 * norm2))

    def find_most_similar(
        self,
        query_embedding: List[float],
        document_embeddings: List[List[float]],
        top_k: int = 5
    ) -> List[tuple]:
        """Find most similar documents to a query

        Args:
            query_embedding: Query embedding vector
            document_embeddings: List of document embedding vectors
            top_k: Number of top results to return

        Returns:
            List of (index, similarity_score) tuples
        """
        similarities = [
            (i, self.similarity(query_embedding, doc_emb))
            for i, doc_emb in enumerate(document_embeddings)
        ]

        # Sort by similarity descending
        similarities.sort(key=lambda x: x[1], reverse=True)

        return similarities[:top_k]

    @property
    def embedding_dimension(self) -> int:
        """Get the dimension of embeddings produced by the model"""
        return self.model.get_sentence_embedding_dimension()

from functools import lru_cache

from sentence_transformers import SentenceTransformer


class EmbeddingService:
    """Service for generating text embeddings using Sentence Transformers."""

    MODEL_NAME = "all-MiniLM-L6-v2"
    _instance = None
    _model = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    def __init__(self):
        if EmbeddingService._model is None:
            EmbeddingService._model = SentenceTransformer(self.MODEL_NAME)

    @property
    def model(self) -> SentenceTransformer:
        return EmbeddingService._model

    def embed_text(self, text: str) -> list[float]:
        """Generate embedding for a single text."""
        embedding = self.model.encode(text, convert_to_numpy=True)
        return embedding.tolist()

    def embed_texts(self, texts: list[str]) -> list[list[float]]:
        """Generate embeddings for multiple texts."""
        embeddings = self.model.encode(texts, convert_to_numpy=True)
        return embeddings.tolist()

    def create_book_text(
        self,
        title: str,
        author: str,
        description: str = "",
        categories: list[str] = None,
        moods: list[str] = None,
    ) -> str:
        """Create a searchable text representation of a book."""
        parts = [f"Title: {title}", f"Author: {author}"]

        if description:
            parts.append(f"Description: {description}")

        if categories:
            parts.append(f"Categories: {', '.join(categories)}")

        if moods:
            parts.append(f"Moods: {', '.join(moods)}")

        return " | ".join(parts)


@lru_cache
def get_embedding_service() -> EmbeddingService:
    return EmbeddingService()

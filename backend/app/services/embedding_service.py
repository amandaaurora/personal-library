import os
from functools import lru_cache


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
        # Lazy load - don't initialize model here
        pass

    @property
    def model(self):
        """Lazy load the sentence transformer model."""
        if EmbeddingService._model is None:
            if os.environ.get("DISABLE_EMBEDDINGS") == "true":
                raise RuntimeError("Embeddings are disabled. Set DISABLE_EMBEDDINGS=false to enable.")
            from sentence_transformers import SentenceTransformer
            EmbeddingService._model = SentenceTransformer(self.MODEL_NAME)
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
        """Create a searchable text representation of a book.

        Includes expanded genre keywords to improve semantic matching.
        """
        parts = [f"Title: {title}", f"Author: {author}"]

        if description:
            parts.append(f"Description: {description}")

        if categories:
            # Add expanded genre keywords for better semantic matching
            expanded_categories = self._expand_categories(categories)
            parts.append(f"Categories: {', '.join(expanded_categories)}")

        if moods:
            # Add expanded mood keywords
            expanded_moods = self._expand_moods(moods)
            parts.append(f"Moods: {', '.join(expanded_moods)}")

        return " | ".join(parts)

    def _expand_categories(self, categories: list[str]) -> list[str]:
        """Expand categories with related keywords for better matching."""
        expansions = {
            "mystery": ["mystery", "detective", "whodunit", "crime", "sleuth", "investigation"],
            "thriller": ["thriller", "suspense", "tension", "danger", "action"],
            "fiction": ["fiction", "novel", "story"],
            "sci-fi": ["sci-fi", "science fiction", "futuristic", "space", "technology"],
            "fantasy": ["fantasy", "magic", "mythical", "epic", "quest"],
            "romance": ["romance", "love story", "romantic", "relationship"],
            "horror": ["horror", "scary", "frightening", "dark", "supernatural"],
            "non-fiction": ["non-fiction", "factual", "true", "informative"],
            "self-help": ["self-help", "personal development", "improvement", "growth"],
            "biography": ["biography", "life story", "memoir", "autobiographical"],
        }

        result = list(categories)
        for cat in categories:
            if cat in expansions:
                result.extend([kw for kw in expansions[cat] if kw not in result])
        return result

    def _expand_moods(self, moods: list[str]) -> list[str]:
        """Expand moods with related keywords for better matching."""
        expansions = {
            "cozy": ["cozy", "cosy", "comforting", "warm", "gentle", "light", "feel-good", "wholesome"],
            "thrilling": ["thrilling", "exciting", "suspenseful", "tense", "gripping", "edge-of-seat"],
            "heartwarming": ["heartwarming", "touching", "emotional", "sweet", "tender"],
            "funny": ["funny", "humorous", "comedic", "witty", "amusing", "lighthearted"],
            "dark": ["dark", "gritty", "bleak", "intense", "heavy"],
            "inspiring": ["inspiring", "motivational", "uplifting", "empowering"],
            "relaxing": ["relaxing", "calm", "peaceful", "soothing", "easy read"],
            "adventurous": ["adventurous", "exciting", "action-packed", "journey"],
            "thought-provoking": ["thought-provoking", "philosophical", "deep", "reflective"],
            "suspenseful": ["suspenseful", "tense", "nail-biting", "page-turner"],
        }

        result = list(moods)
        for mood in moods:
            if mood in expansions:
                result.extend([kw for kw in expansions[mood] if kw not in result])
        return result


@lru_cache
def get_embedding_service() -> EmbeddingService:
    return EmbeddingService()

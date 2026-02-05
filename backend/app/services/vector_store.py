import os
from typing import Optional

from ..config import get_settings
from ..models.book import Book
from .embedding_service import get_embedding_service


class VectorStore:
    """Service for storing and searching book embeddings using ChromaDB."""

    COLLECTION_NAME = "books"
    _instance = None
    _client = None
    _collection = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    def __init__(self):
        # Lazy load - don't initialize chromadb here
        pass

    def _ensure_initialized(self):
        """Lazy initialize ChromaDB client and collection."""
        if VectorStore._client is None:
            if os.environ.get("DISABLE_EMBEDDINGS") == "true":
                raise RuntimeError("Embeddings are disabled. Set DISABLE_EMBEDDINGS=false to enable.")

            import chromadb
            from chromadb.config import Settings

            settings = get_settings()
            persist_path = settings.CHROMA_PERSIST_PATH

            # Ensure the directory exists
            os.makedirs(persist_path, exist_ok=True)

            VectorStore._client = chromadb.PersistentClient(
                path=persist_path,
                settings=Settings(anonymized_telemetry=False),
            )
            VectorStore._collection = VectorStore._client.get_or_create_collection(
                name=self.COLLECTION_NAME,
                metadata={"hnsw:space": "cosine"},
            )

    @property
    def collection(self):
        self._ensure_initialized()
        return VectorStore._collection

    def add_book(
        self, book: Book, categories: list[str] = None, moods: list[str] = None
    ):
        """Add a book to the vector store."""
        embedding_service = get_embedding_service()

        # Create searchable text
        text = embedding_service.create_book_text(
            title=book.title,
            author=book.author,
            description=book.description or "",
            categories=categories or [],
            moods=moods or [],
        )

        # Generate embedding
        embedding = embedding_service.embed_text(text)

        # Store in ChromaDB
        self.collection.add(
            ids=[str(book.id)],
            embeddings=[embedding],
            metadatas=[
                {
                    "title": book.title,
                    "author": book.author,
                    "format": book.format,
                    "reading_status": book.reading_status,
                    "categories": ",".join(categories or []),
                    "moods": ",".join(moods or []),
                }
            ],
            documents=[text],
        )

    def update_book(
        self, book: Book, categories: list[str] = None, moods: list[str] = None
    ):
        """Update a book in the vector store."""
        # Delete existing and re-add
        self.delete_book(book.id)
        self.add_book(book, categories, moods)

    def delete_book(self, book_id: int):
        """Delete a book from the vector store."""
        try:
            self.collection.delete(ids=[str(book_id)])
        except Exception:
            pass  # Book may not exist in vector store

    def search(
        self,
        query: str,
        n_results: int = 10,
        category: Optional[str] = None,
        mood: Optional[str] = None,
        format: Optional[str] = None,
        reading_status: Optional[str] = None,
    ) -> list[dict]:
        """Search for books similar to the query."""
        embedding_service = get_embedding_service()
        query_embedding = embedding_service.embed_text(query)

        # Build where filter
        where_filter = None
        conditions = []

        if category:
            conditions.append({"categories": {"$contains": category}})
        if mood:
            conditions.append({"moods": {"$contains": mood}})
        if format:
            conditions.append({"format": format})
        if reading_status:
            conditions.append({"reading_status": reading_status})

        if len(conditions) == 1:
            where_filter = conditions[0]
        elif len(conditions) > 1:
            where_filter = {"$and": conditions}

        # Search
        results = self.collection.query(
            query_embeddings=[query_embedding],
            n_results=n_results,
            where=where_filter,
            include=["metadatas", "documents", "distances"],
        )

        # Format results
        formatted = []
        if results["ids"] and results["ids"][0]:
            for i, book_id in enumerate(results["ids"][0]):
                metadata = results["metadatas"][0][i] if results["metadatas"] else {}
                distance = results["distances"][0][i] if results["distances"] else 0
                document = results["documents"][0][i] if results["documents"] else ""

                formatted.append(
                    {
                        "id": int(book_id),
                        "title": metadata.get("title", ""),
                        "author": metadata.get("author", ""),
                        "format": metadata.get("format", ""),
                        "reading_status": metadata.get("reading_status", ""),
                        "categories": metadata.get("categories", "").split(",")
                        if metadata.get("categories")
                        else [],
                        "moods": metadata.get("moods", "").split(",")
                        if metadata.get("moods")
                        else [],
                        "similarity": 1 - distance,  # Convert distance to similarity
                        "document": document,
                    }
                )

        return formatted

    def get_all_book_ids(self) -> list[int]:
        """Get all book IDs in the vector store."""
        results = self.collection.get(include=[])
        return [int(id) for id in results["ids"]]

    def count(self) -> int:
        """Get the number of books in the vector store."""
        return self.collection.count()

    def sync_from_database(self, books: list) -> int:
        """
        Sync the vector store with books from the database.
        Returns the number of books added.
        """
        import logging
        logger = logging.getLogger(__name__)

        existing_ids = set(self.get_all_book_ids())
        added_count = 0

        for book in books:
            if book.id not in existing_ids:
                try:
                    categories = [c.category for c in book.categories]
                    moods = [m.mood for m in book.moods]
                    self.add_book(book, categories, moods)
                    added_count += 1
                except Exception as e:
                    logger.warning(f"Failed to sync book {book.id}: {e}")

        return added_count

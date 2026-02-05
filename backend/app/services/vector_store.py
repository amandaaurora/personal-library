import logging
import os
from typing import Optional

from sqlmodel import Session, select, text
from sqlalchemy import func

from ..database import engine
from ..models.book import Book, EMBEDDING_DIM
from .embedding_service import get_embedding_service

logger = logging.getLogger(__name__)


class VectorStore:
    """Service for storing and searching book embeddings using pgvector."""

    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    def __init__(self):
        pass

    def add_book(
        self, book: Book, categories: list[str] = None, moods: list[str] = None
    ) -> list[float]:
        """Generate and store embedding for a book. Returns the embedding."""
        if os.environ.get("DISABLE_EMBEDDINGS") == "true":
            return []

        embedding_service = get_embedding_service()

        # Create searchable text
        text_content = embedding_service.create_book_text(
            title=book.title,
            author=book.author,
            description=book.description or "",
            categories=categories or [],
            moods=moods or [],
        )

        # Generate embedding
        embedding = embedding_service.embed_text(text_content)
        return embedding

    def update_book(
        self, book: Book, categories: list[str] = None, moods: list[str] = None
    ) -> list[float]:
        """Update embedding for a book. Returns the new embedding."""
        return self.add_book(book, categories, moods)

    def delete_book(self, book_id: int):
        """No-op for pgvector - embedding is deleted with the book row."""
        pass

    def search(
        self,
        query: str,
        n_results: int = 10,
        category: Optional[str] = None,
        mood: Optional[str] = None,
        format: Optional[str] = None,
        reading_status: Optional[str] = None,
    ) -> list[dict]:
        """Search for books similar to the query using pgvector."""
        if os.environ.get("DISABLE_EMBEDDINGS") == "true":
            return []

        embedding_service = get_embedding_service()
        query_embedding = embedding_service.embed_text(query)

        with Session(engine) as session:
            # Build the query with cosine distance
            # pgvector uses <=> for cosine distance
            stmt = (
                select(
                    Book,
                    Book.embedding.cosine_distance(query_embedding).label("distance")
                )
                .where(Book.embedding.isnot(None))
            )

            # Apply filters
            if format:
                stmt = stmt.where(Book.format == format)
            if reading_status:
                stmt = stmt.where(Book.reading_status == reading_status)

            # Order by distance and limit
            stmt = stmt.order_by("distance").limit(n_results * 2)  # Get extra for filtering

            results = session.exec(stmt).all()

            # Format results and apply category/mood filters
            formatted = []
            for book, distance in results:
                # Filter by category if specified
                if category:
                    book_categories = [c.category for c in book.categories]
                    if category not in book_categories:
                        continue

                # Filter by mood if specified
                if mood:
                    book_moods = [m.mood for m in book.moods]
                    if mood not in book_moods:
                        continue

                formatted.append(
                    {
                        "id": book.id,
                        "title": book.title,
                        "author": book.author,
                        "format": book.format,
                        "reading_status": book.reading_status,
                        "categories": [c.category for c in book.categories],
                        "moods": [m.mood for m in book.moods],
                        "similarity": 1 - distance,  # Convert distance to similarity
                    }
                )

                if len(formatted) >= n_results:
                    break

            return formatted

    def count(self) -> int:
        """Get the number of books with embeddings."""
        with Session(engine) as session:
            result = session.exec(
                select(func.count()).select_from(Book).where(Book.embedding.isnot(None))
            ).one()
            return result

    def get_all_book_ids(self) -> list[int]:
        """Get all book IDs that have embeddings."""
        with Session(engine) as session:
            results = session.exec(
                select(Book.id).where(Book.embedding.isnot(None))
            ).all()
            return list(results)

    def sync_from_database(self, session: Session) -> int:
        """
        Generate embeddings for all books that don't have them.
        Returns the number of books updated.
        """
        if os.environ.get("DISABLE_EMBEDDINGS") == "true":
            logger.info("Embeddings disabled, skipping sync")
            return 0

        # Get books without embeddings
        books = session.exec(
            select(Book).where(Book.embedding.is_(None))
        ).unique().all()

        if not books:
            return 0

        added_count = 0
        for book in books:
            try:
                categories = [c.category for c in book.categories]
                moods = [m.mood for m in book.moods]
                embedding = self.add_book(book, categories, moods)
                book.embedding = embedding
                added_count += 1

                # Commit in batches of 50
                if added_count % 50 == 0:
                    session.commit()
                    logger.info(f"Synced {added_count} books...")

            except Exception as e:
                logger.warning(f"Failed to generate embedding for book {book.id}: {e}")

        session.commit()
        return added_count

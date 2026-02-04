"""
Service for enriching book data with cover URLs, page counts, and metadata.
Uses Open Library API to search by title and author when ISBN is not available.
"""
from typing import Optional

import httpx

from .openlibrary import OpenLibraryService
from .categorization import CategorizationService


class BookEnrichmentService:
    """Service for enriching book data with metadata from external sources."""

    def __init__(self):
        self.openlibrary = OpenLibraryService()
        self._categorization: Optional[CategorizationService] = None

    @property
    def categorization(self) -> CategorizationService:
        """Lazy load categorization service."""
        if self._categorization is None:
            self._categorization = CategorizationService()
        return self._categorization

    async def enrich_book(
        self,
        title: str,
        author: str,
        isbn: Optional[str] = None,
        description: Optional[str] = None,
        cover_url: Optional[str] = None,
        page_count: Optional[int] = None,
        categories: Optional[list[str]] = None,
        moods: Optional[list[str]] = None,
        fetch_metadata: bool = True,
        auto_categorize: bool = True,
    ) -> dict:
        """
        Enrich book data by fetching missing information.

        Args:
            title: Book title
            author: Book author
            isbn: ISBN (optional)
            description: Book description (optional)
            cover_url: Cover URL (optional, will be fetched if missing)
            page_count: Page count (optional, will be fetched if missing)
            categories: Categories (optional, will be AI-generated if missing)
            moods: Moods (optional, will be AI-generated if missing)
            fetch_metadata: Whether to fetch metadata from Open Library
            auto_categorize: Whether to auto-categorize with AI

        Returns:
            Dict with enriched book data (only includes fields that were enriched)
        """
        enriched = {}

        # Try to fetch metadata if we're missing cover_url or page_count
        if fetch_metadata and (not cover_url or not page_count):
            metadata = await self._fetch_metadata(title, author, isbn)
            if metadata:
                if not cover_url and metadata.get("cover_url"):
                    enriched["cover_url"] = metadata["cover_url"]
                if not page_count and metadata.get("page_count"):
                    enriched["page_count"] = metadata["page_count"]
                if not description and metadata.get("description"):
                    enriched["description"] = metadata["description"]

        # Auto-categorize if no categories or moods
        if auto_categorize and (not categories or not moods):
            try:
                suggestions = await self.categorization.categorize_book(
                    title, author, description or enriched.get("description", "")
                )
                if not categories and suggestions.get("categories"):
                    enriched["categories"] = suggestions["categories"]
                if not moods and suggestions.get("moods"):
                    enriched["moods"] = suggestions["moods"]
            except Exception:
                pass

        return enriched

    async def _fetch_metadata(
        self,
        title: str,
        author: str,
        isbn: Optional[str] = None,
    ) -> Optional[dict]:
        """Fetch book metadata from Open Library."""
        # First try by ISBN if available
        if isbn:
            result = await self.openlibrary.fetch_book_metadata(isbn)
            if result:
                return {
                    "cover_url": result.cover_url,
                    "page_count": result.page_count,
                    "description": result.description,
                }

        # Otherwise search by title and author
        try:
            results = await self._search_openlibrary(title, author)
            if results:
                return results[0]
        except Exception:
            pass

        return None

    async def _search_openlibrary(
        self,
        title: str,
        author: str,
    ) -> list[dict]:
        """Search Open Library by title and author."""
        # Clean up the title (remove series info in parentheses)
        clean_title = title.split("(")[0].strip()

        # Clean up author (remove prefixes like "by")
        clean_author = author.replace("by ", "").strip()

        # Build search query
        query = f"{clean_title} {clean_author}"

        async with httpx.AsyncClient(timeout=10.0) as client:
            url = f"https://openlibrary.org/search.json?q={query}&limit=3"
            response = await client.get(url)

            if response.status_code != 200:
                return []

            data = response.json()
            results = []

            for doc in data.get("docs", []):
                # Check if this is a reasonable match
                doc_title = doc.get("title", "").lower()
                doc_authors = [a.lower() for a in doc.get("author_name", [])]

                # Basic relevance check
                title_match = clean_title.lower() in doc_title or doc_title in clean_title.lower()
                author_match = any(
                    clean_author.lower() in a or a in clean_author.lower()
                    for a in doc_authors
                )

                if not (title_match or author_match):
                    continue

                result = {
                    "title": doc.get("title"),
                    "author": ", ".join(doc.get("author_name", [])),
                    "cover_url": f"https://covers.openlibrary.org/b/id/{doc['cover_i']}-L.jpg"
                    if doc.get("cover_i")
                    else None,
                    "page_count": doc.get("number_of_pages_median"),
                    "description": doc.get("first_sentence", [None])[0]
                    if doc.get("first_sentence")
                    else None,
                }
                results.append(result)

            return results

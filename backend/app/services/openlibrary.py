from typing import Optional

import httpx

from ..models.book import BookLookupResult


class OpenLibraryService:
    """Service for fetching book metadata from Open Library API.

    Falls back to Google Books API if Open Library doesn't have the book.
    """

    BASE_URL = "https://openlibrary.org"

    async def fetch_book_metadata(self, isbn: str, use_fallback: bool = True) -> Optional[BookLookupResult]:
        """Fetch book metadata from Open Library by ISBN."""
        # Clean up ISBN
        isbn = isbn.replace("-", "").replace(" ", "")

        async with httpx.AsyncClient(timeout=15.0) as client:
            # Try the books API first
            url = f"{self.BASE_URL}/api/books?bibkeys=ISBN:{isbn}&format=json&jscmd=data"
            response = await client.get(url)

            if response.status_code != 200:
                return None

            data = response.json()
            key = f"ISBN:{isbn}"

            if key not in data:
                # Try searching by ISBN
                search_url = f"{self.BASE_URL}/search.json?isbn={isbn}"
                search_response = await client.get(search_url)

                if search_response.status_code != 200:
                    return None

                search_data = search_response.json()
                if not search_data.get("docs"):
                    # Not found in Open Library, try Google Books as fallback
                    if use_fallback:
                        return await self._fallback_to_google_books(isbn)
                    return None

                doc = search_data["docs"][0]
                return BookLookupResult(
                    title=doc.get("title", "Unknown"),
                    author=", ".join(doc.get("author_name", ["Unknown"])),
                    description=doc.get("first_sentence", [None])[0]
                    if doc.get("first_sentence")
                    else None,
                    cover_url=f"https://covers.openlibrary.org/b/id/{doc['cover_i']}-L.jpg"
                    if doc.get("cover_i")
                    else None,
                    page_count=doc.get("number_of_pages_median"),
                    isbn=isbn,
                )

            book_data = data[key]

            # Extract authors
            authors = book_data.get("authors", [])
            author_names = [a.get("name", "") for a in authors]
            author = ", ".join(author_names) if author_names else "Unknown"

            # Extract cover URL
            cover_url = None
            if "cover" in book_data:
                cover_url = book_data["cover"].get("large") or book_data["cover"].get(
                    "medium"
                )

            # Extract description
            description = None
            if "excerpts" in book_data and book_data["excerpts"]:
                description = book_data["excerpts"][0].get("text")

            return BookLookupResult(
                title=book_data.get("title", "Unknown"),
                author=author,
                description=description,
                cover_url=cover_url,
                page_count=book_data.get("number_of_pages"),
                isbn=isbn,
            )

    async def search_books(self, query: str, limit: int = 10) -> list[dict]:
        """Search for books by title/author."""
        async with httpx.AsyncClient(timeout=15.0) as client:
            url = f"{self.BASE_URL}/search.json?q={query}&limit={limit}"
            response = await client.get(url)

            if response.status_code != 200:
                return []

            data = response.json()
            results = []

            for doc in data.get("docs", []):
                result = {
                    "title": doc.get("title", "Unknown"),
                    "author": ", ".join(doc.get("author_name", ["Unknown"])),
                    "isbn": doc.get("isbn", [None])[0] if doc.get("isbn") else None,
                    "cover_url": f"https://covers.openlibrary.org/b/id/{doc['cover_i']}-M.jpg"
                    if doc.get("cover_i")
                    else None,
                    "first_publish_year": doc.get("first_publish_year"),
                }
                results.append(result)

            return results

    async def _fallback_to_google_books(self, isbn: str) -> Optional[BookLookupResult]:
        """Try Google Books API as a fallback."""
        from .googlebooks import GoogleBooksService

        try:
            google_service = GoogleBooksService()
            return await google_service.fetch_book_metadata(isbn)
        except Exception:
            return None

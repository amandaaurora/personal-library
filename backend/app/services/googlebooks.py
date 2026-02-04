"""Service for fetching book metadata from Google Books API."""

import os
from typing import Optional

import httpx

from ..models.book import BookLookupResult


class GoogleBooksService:
    """Service for fetching book metadata from Google Books API."""

    BASE_URL = "https://www.googleapis.com/books/v1"

    def __init__(self):
        self.api_key = os.getenv("GOOGLE_BOOKS_API_KEY")

    async def fetch_book_metadata(self, isbn: str) -> Optional[BookLookupResult]:
        """Fetch book metadata from Google Books by ISBN."""
        isbn = isbn.replace("-", "").replace(" ", "")

        params = {"q": f"isbn:{isbn}"}
        if self.api_key:
            params["key"] = self.api_key

        async with httpx.AsyncClient(timeout=10.0) as client:
            url = f"{self.BASE_URL}/volumes"
            response = await client.get(url, params=params)

            if response.status_code != 200:
                return None

            data = response.json()

            if data.get("totalItems", 0) == 0:
                return None

            items = data.get("items", [])
            if not items:
                return None

            volume = items[0].get("volumeInfo", {})

            # Extract cover URL (prefer larger images)
            cover_url = None
            image_links = volume.get("imageLinks", {})
            for size in ["large", "medium", "small", "thumbnail"]:
                if size in image_links:
                    cover_url = image_links[size]
                    # Google returns http URLs, upgrade to https
                    if cover_url.startswith("http://"):
                        cover_url = cover_url.replace("http://", "https://")
                    break

            # Extract description
            description = volume.get("description")

            return BookLookupResult(
                title=volume.get("title", "Unknown"),
                author=", ".join(volume.get("authors", ["Unknown"])),
                description=description,
                cover_url=cover_url,
                page_count=volume.get("pageCount"),
                isbn=isbn,
            )

    async def search_books(self, query: str, limit: int = 10) -> list[dict]:
        """Search for books by title/author."""
        params = {"q": query, "maxResults": min(limit, 40)}
        if self.api_key:
            params["key"] = self.api_key

        async with httpx.AsyncClient(timeout=10.0) as client:
            url = f"{self.BASE_URL}/volumes"
            response = await client.get(url, params=params)

            if response.status_code != 200:
                return []

            data = response.json()
            results = []

            for item in data.get("items", []):
                volume = item.get("volumeInfo", {})

                # Get ISBN
                isbn = None
                for identifier in volume.get("industryIdentifiers", []):
                    if identifier.get("type") in ["ISBN_13", "ISBN_10"]:
                        isbn = identifier.get("identifier")
                        break

                # Get cover
                cover_url = None
                image_links = volume.get("imageLinks", {})
                if "thumbnail" in image_links:
                    cover_url = image_links["thumbnail"]
                    if cover_url.startswith("http://"):
                        cover_url = cover_url.replace("http://", "https://")

                result = {
                    "title": volume.get("title", "Unknown"),
                    "author": ", ".join(volume.get("authors", ["Unknown"])),
                    "isbn": isbn,
                    "cover_url": cover_url,
                    "first_publish_year": volume.get("publishedDate", "")[:4]
                    if volume.get("publishedDate")
                    else None,
                }
                results.append(result)

            return results

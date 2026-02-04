from typing import Optional

from fastapi import APIRouter, Query
from pydantic import BaseModel

from ..services.rag_service import RAGService

router = APIRouter(prefix="/api/search", tags=["search"])


class SearchQuery(BaseModel):
    query: str
    n_results: int = 10
    category: Optional[str] = None
    mood: Optional[str] = None
    format: Optional[str] = None
    reading_status: Optional[str] = None


class SearchBookResult(BaseModel):
    id: int
    title: str
    author: str
    format: str
    reading_status: str
    categories: list[str]
    moods: list[str]
    similarity: float


class SearchResponse(BaseModel):
    response: str
    books: list[SearchBookResult]


@router.post("/query", response_model=SearchResponse)
async def search_books(search: SearchQuery):
    """
    Perform RAG-powered natural language search.

    Examples:
    - "cozy mystery books for winter"
    - "inspiring books about space exploration"
    - "something thrilling I haven't read yet"
    """
    rag_service = RAGService()
    result = await rag_service.search(
        query=search.query,
        n_results=search.n_results,
        category=search.category,
        mood=search.mood,
        format=search.format,
        reading_status=search.reading_status,
    )

    # Convert raw results to response model
    books = [
        SearchBookResult(
            id=book["id"],
            title=book["title"],
            author=book["author"],
            format=book["format"],
            reading_status=book["reading_status"],
            categories=book["categories"],
            moods=book["moods"],
            similarity=book["similarity"],
        )
        for book in result["books"]
    ]

    return SearchResponse(response=result["response"], books=books)

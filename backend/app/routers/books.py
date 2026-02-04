import logging
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select

from ..database import get_session

logger = logging.getLogger(__name__)
from ..models.book import (
    Book,
    BookCategory,
    BookMood,
    BookCreate,
    BookUpdate,
    BookRead,
    BookLookupResult,
)
from ..services.openlibrary import OpenLibraryService
from ..services.categorization import CategorizationService
from ..services.vector_store import VectorStore

router = APIRouter(prefix="/api/books", tags=["books"])


def book_to_read(book: Book) -> BookRead:
    """Convert a Book model to BookRead schema."""
    return BookRead(
        id=book.id,
        title=book.title,
        author=book.author,
        isbn=book.isbn,
        description=book.description,
        format=book.format,
        reading_status=book.reading_status,
        purchase_date=book.purchase_date,
        date_started=book.date_started,
        date_finished=book.date_finished,
        rating=book.rating,
        notes=book.notes,
        cover_url=book.cover_url,
        page_count=book.page_count,
        created_at=book.created_at,
        updated_at=book.updated_at,
        categories=[c.category for c in book.categories],
        moods=[m.mood for m in book.moods],
    )


@router.get("", response_model=list[BookRead])
def list_books(
    session: Session = Depends(get_session),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
    category: Optional[str] = None,
    mood: Optional[str] = None,
    format: Optional[str] = None,
    reading_status: Optional[str] = None,
    search: Optional[str] = None,
):
    """List books with optional filters."""
    query = select(Book)

    if category:
        query = query.join(BookCategory).where(BookCategory.category == category)

    if mood:
        query = query.join(BookMood).where(BookMood.mood == mood)

    if format:
        query = query.where(Book.format == format)

    if reading_status:
        query = query.where(Book.reading_status == reading_status)

    if search:
        search_term = f"%{search}%"
        query = query.where(
            (Book.title.ilike(search_term))
            | (Book.author.ilike(search_term))
            | (Book.description.ilike(search_term))
        )

    query = query.offset(skip).limit(limit).order_by(Book.created_at.desc())
    books = session.exec(query).unique().all()

    return [book_to_read(book) for book in books]


@router.get("/lookup", response_model=BookLookupResult)
async def lookup_book(isbn: str):
    """Look up book metadata from Open Library by ISBN."""
    service = OpenLibraryService()
    result = await service.fetch_book_metadata(isbn)
    if not result:
        raise HTTPException(status_code=404, detail="Book not found")
    return result


@router.get("/{book_id}", response_model=BookRead)
def get_book(book_id: int, session: Session = Depends(get_session)):
    """Get a single book by ID."""
    book = session.get(Book, book_id)
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")
    return book_to_read(book)


@router.post("", response_model=BookRead, status_code=201)
async def create_book(
    book_data: BookCreate,
    session: Session = Depends(get_session),
    auto_categorize: bool = Query(True, description="Auto-suggest categories and moods"),
):
    """Create a new book. Optionally auto-categorize using AI."""
    # Create the book
    book = Book(
        title=book_data.title,
        author=book_data.author,
        isbn=book_data.isbn,
        description=book_data.description,
        format=book_data.format,
        reading_status=book_data.reading_status,
        purchase_date=book_data.purchase_date,
        date_started=book_data.date_started,
        date_finished=book_data.date_finished,
        rating=book_data.rating,
        notes=book_data.notes,
        cover_url=book_data.cover_url,
        page_count=book_data.page_count,
    )
    session.add(book)
    session.commit()
    session.refresh(book)

    # Get categories and moods
    categories = book_data.categories
    moods = book_data.moods

    # Auto-categorize if enabled and no categories/moods provided
    if auto_categorize and not categories and not moods:
        try:
            categorization = CategorizationService()
            suggestions = await categorization.categorize_book(
                book.title, book.author, book.description or ""
            )
            categories = suggestions.get("categories", [])
            moods = suggestions.get("moods", [])
        except Exception:
            logger.warning(f"Auto-categorization failed for book '{book.title}'", exc_info=True)

    # Add categories
    for cat in categories:
        book_cat = BookCategory(book_id=book.id, category=cat)
        session.add(book_cat)

    # Add moods
    for mood in moods:
        book_mood = BookMood(book_id=book.id, mood=mood)
        session.add(book_mood)

    session.commit()
    session.refresh(book)

    # Add to vector store
    try:
        vector_store = VectorStore()
        vector_store.add_book(book, categories, moods)
    except Exception:
        logger.warning(f"Failed to add book {book.id} to vector store", exc_info=True)

    return book_to_read(book)


@router.patch("/{book_id}", response_model=BookRead)
def update_book(
    book_id: int,
    book_data: BookUpdate,
    session: Session = Depends(get_session),
):
    """Update a book."""
    book = session.get(Book, book_id)
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")

    # Update fields
    update_data = book_data.model_dump(exclude_unset=True)
    categories = update_data.pop("categories", None)
    moods = update_data.pop("moods", None)

    for key, value in update_data.items():
        setattr(book, key, value)

    book.updated_at = datetime.utcnow()

    # Update categories if provided
    if categories is not None:
        # Delete existing categories
        for cat in book.categories:
            session.delete(cat)
        # Add new categories
        for cat in categories:
            book_cat = BookCategory(book_id=book.id, category=cat)
            session.add(book_cat)

    # Update moods if provided
    if moods is not None:
        # Delete existing moods
        for mood in book.moods:
            session.delete(mood)
        # Add new moods
        for mood in moods:
            book_mood = BookMood(book_id=book.id, mood=mood)
            session.add(book_mood)

    session.commit()
    session.refresh(book)

    # Update vector store
    try:
        vector_store = VectorStore()
        final_categories = categories if categories is not None else [c.category for c in book.categories]
        final_moods = moods if moods is not None else [m.mood for m in book.moods]
        vector_store.update_book(book, final_categories, final_moods)
    except Exception:
        logger.warning(f"Failed to update book {book.id} in vector store", exc_info=True)

    return book_to_read(book)


@router.delete("/{book_id}", status_code=204)
def delete_book(book_id: int, session: Session = Depends(get_session)):
    """Delete a book."""
    book = session.get(Book, book_id)
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")

    # Remove from vector store
    try:
        vector_store = VectorStore()
        vector_store.delete_book(book_id)
    except Exception:
        logger.warning(f"Failed to delete book {book_id} from vector store", exc_info=True)

    session.delete(book)
    session.commit()
    return None

import logging
import re
from datetime import datetime
from typing import Optional
from collections import defaultdict

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlmodel import Session, select
from sqlalchemy.orm import selectinload

from ..database import get_session

logger = logging.getLogger(__name__)


def normalize_name(name: str) -> str:
    """Normalize a name for comparison by removing punctuation and extra spaces."""
    if not name:
        return ""
    # Lowercase
    name = name.lower()
    # Remove punctuation
    name = re.sub(r'[^\w\s]', '', name)
    # Normalize whitespace
    name = ' '.join(name.split())
    return name
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
    limit: int = Query(10000, ge=1, le=10000),
    category: Optional[str] = None,
    mood: Optional[str] = None,
    format: Optional[str] = None,
    reading_status: Optional[str] = None,
    search: Optional[str] = None,
):
    """List books with optional filters."""
    query = select(Book).options(
        selectinload(Book.categories),
        selectinload(Book.moods)
    )

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


class DuplicateGroup(BaseModel):
    """A group of duplicate books."""
    key: str
    books: list[BookRead]


class DuplicatesResponse(BaseModel):
    """Response containing duplicate book groups."""
    duplicate_groups: list[DuplicateGroup]
    total_duplicates: int


@router.get("/duplicates", response_model=DuplicatesResponse)
def find_duplicates(session: Session = Depends(get_session)):
    """Find duplicate books based on normalized title+author or ISBN."""
    books = session.exec(select(Book)).unique().all()

    # Group by normalized title+author
    title_author_groups: dict[str, list[Book]] = defaultdict(list)
    # Group by ISBN
    isbn_groups: dict[str, list[Book]] = defaultdict(list)

    for book in books:
        # Title + Author grouping
        key = f"{normalize_name(book.title)}|{normalize_name(book.author)}"
        title_author_groups[key].append(book)

        # ISBN grouping (if ISBN exists)
        if book.isbn:
            # Normalize ISBN (remove hyphens and spaces)
            normalized_isbn = re.sub(r'[\s-]', '', book.isbn)
            if normalized_isbn:
                isbn_groups[normalized_isbn].append(book)

    # Collect duplicate groups (more than 1 book)
    seen_book_ids: set[int] = set()
    duplicate_groups: list[DuplicateGroup] = []

    # First, add ISBN-based duplicates (higher confidence)
    for isbn, group_books in isbn_groups.items():
        if len(group_books) > 1:
            book_ids = {b.id for b in group_books}
            if not book_ids.issubset(seen_book_ids):
                duplicate_groups.append(DuplicateGroup(
                    key=f"ISBN: {isbn}",
                    books=[book_to_read(b) for b in group_books]
                ))
                seen_book_ids.update(book_ids)

    # Then, add title+author duplicates (not already found by ISBN)
    for key, group_books in title_author_groups.items():
        if len(group_books) > 1:
            # Filter out books already in an ISBN group
            remaining_books = [b for b in group_books if b.id not in seen_book_ids]
            if len(remaining_books) > 1:
                duplicate_groups.append(DuplicateGroup(
                    key=f"Title+Author: {key}",
                    books=[book_to_read(b) for b in remaining_books]
                ))
                seen_book_ids.update(b.id for b in remaining_books)

    total_duplicates = sum(len(g.books) - 1 for g in duplicate_groups)

    return DuplicatesResponse(
        duplicate_groups=duplicate_groups,
        total_duplicates=total_duplicates
    )


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

    logger.info(f"Creating book '{book.title}': auto_categorize={auto_categorize}, categories={categories}, moods={moods}")

    # Auto-categorize if enabled and no categories/moods provided
    if auto_categorize and not categories and not moods:
        logger.info(f"Auto-categorizing book '{book.title}'...")
        try:
            categorization = CategorizationService()
            suggestions = await categorization.categorize_book(
                book.title, book.author, book.description or ""
            )
            categories = suggestions.get("categories", [])
            moods = suggestions.get("moods", [])
            logger.info(f"Auto-categorization result: categories={categories}, moods={moods}")
        except Exception:
            logger.warning(f"Auto-categorization failed for book '{book.title}'", exc_info=True)
    else:
        logger.info(f"Skipping auto-categorization: auto_categorize={auto_categorize}, has_categories={bool(categories)}, has_moods={bool(moods)}")

    # Add categories
    for cat in categories:
        book_cat = BookCategory(book_id=book.id, category=cat)
        session.add(book_cat)

    # Add moods
    for mood in moods:
        book_mood = BookMood(book_id=book.id, mood=mood)
        session.add(book_mood)

    # Generate and store embedding
    try:
        vector_store = VectorStore()
        embedding = vector_store.add_book(book, categories, moods)
        book.embedding = embedding
    except Exception:
        logger.warning(f"Failed to generate embedding for book {book.id}", exc_info=True)

    session.commit()
    session.refresh(book)

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

    # Update embedding
    try:
        vector_store = VectorStore()
        final_categories = categories if categories is not None else [c.category for c in book.categories]
        final_moods = moods if moods is not None else [m.mood for m in book.moods]
        embedding = vector_store.update_book(book, final_categories, final_moods)
        book.embedding = embedding
    except Exception:
        logger.warning(f"Failed to update embedding for book {book.id}", exc_info=True)

    session.commit()
    session.refresh(book)

    return book_to_read(book)


@router.post("/{book_id}/categorize", response_model=BookRead)
async def categorize_book(
    book_id: int,
    session: Session = Depends(get_session),
    fetch_description: bool = Query(True, description="Fetch description from Open Library if missing"),
):
    """Auto-categorize a book using AI. Optionally fetches description from Open Library."""
    book = session.get(Book, book_id)
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")

    logger.info(f"Categorizing book '{book.title}' via API...")
    try:
        description = book.description or ""

        # Fetch description from Open Library if missing
        if fetch_description and not description:
            logger.info(f"Fetching description from Open Library for '{book.title}'...")
            try:
                openlibrary = OpenLibraryService()
                if book.isbn:
                    metadata = await openlibrary.fetch_book_metadata(book.isbn)
                    if metadata and metadata.description:
                        description = metadata.description
                        book.description = description
                        logger.info(f"Found description via ISBN for '{book.title}'")

                # If no description from ISBN, try searching by title/author
                if not description:
                    results = await openlibrary.search_books(f"{book.title} {book.author}", limit=1)
                    if results and results[0].get("first_sentence"):
                        description = results[0]["first_sentence"]
                        book.description = description
                        logger.info(f"Found description via search for '{book.title}'")
            except Exception as e:
                logger.warning(f"Failed to fetch description for '{book.title}': {e}")

        categorization = CategorizationService()
        suggestions = await categorization.categorize_book(
            book.title, book.author, description
        )
        categories = suggestions.get("categories", [])
        moods = suggestions.get("moods", [])
        logger.info(f"Categorization result: categories={categories}, moods={moods}")

        if not categories and not moods:
            raise HTTPException(status_code=500, detail="AI categorization returned no results")

        # Delete existing categories and moods
        for cat in book.categories:
            session.delete(cat)
        for mood in book.moods:
            session.delete(mood)

        # Add new categories
        for cat in categories:
            book_cat = BookCategory(book_id=book.id, category=cat)
            session.add(book_cat)

        # Add new moods
        for mood in moods:
            book_mood = BookMood(book_id=book.id, mood=mood)
            session.add(book_mood)

        book.updated_at = datetime.utcnow()

        # Update embedding
        try:
            vector_store = VectorStore()
            embedding = vector_store.update_book(book, categories, moods)
            book.embedding = embedding
        except Exception:
            logger.warning(f"Failed to update embedding for book {book.id}", exc_info=True)

        session.commit()
        session.refresh(book)

        return book_to_read(book)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Categorization failed for book {book_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Categorization failed: {str(e)}")


class RecategorizeResponse(BaseModel):
    """Response from batch recategorization."""
    total: int
    updated: int
    failed: int
    skipped: int


@router.post("/recategorize", response_model=RecategorizeResponse)
async def recategorize_all_books(
    session: Session = Depends(get_session),
    force: bool = Query(False, description="Re-categorize even books that already have categories/moods"),
    limit: int = Query(100, ge=1, le=500, description="Max books to process (to avoid timeout)"),
):
    """
    Batch re-categorize books using improved AI categorization.

    By default, only processes books missing categories OR moods.
    Use force=true to re-categorize all books.

    This endpoint is rate-limited by the Groq API free tier.
    Process in batches of 50-100 to avoid timeouts.
    """
    query = select(Book).options(
        selectinload(Book.categories),
        selectinload(Book.moods)
    )

    if not force:
        # Only get books missing categories or moods
        query = query.outerjoin(BookCategory).outerjoin(BookMood).where(
            (BookCategory.id.is_(None)) | (BookMood.id.is_(None))
        )

    query = query.limit(limit)
    books = session.exec(query).unique().all()

    total = len(books)
    updated = 0
    failed = 0
    skipped = 0

    categorization = CategorizationService()
    vector_store = VectorStore()

    for book in books:
        try:
            # Skip if already has both categories and moods (unless force)
            if not force and book.categories and book.moods:
                skipped += 1
                continue

            logger.info(f"Re-categorizing book '{book.title}'...")
            suggestions = await categorization.categorize_book(
                book.title, book.author, book.description or ""
            )
            categories = suggestions.get("categories", [])
            moods = suggestions.get("moods", [])

            if not categories and not moods:
                logger.warning(f"No categories/moods returned for '{book.title}'")
                failed += 1
                continue

            # Delete existing categories and moods
            for cat in book.categories:
                session.delete(cat)
            for mood in book.moods:
                session.delete(mood)

            # Add new categories
            for cat in categories:
                book_cat = BookCategory(book_id=book.id, category=cat)
                session.add(book_cat)

            # Add new moods
            for mood in moods:
                book_mood = BookMood(book_id=book.id, mood=mood)
                session.add(book_mood)

            book.updated_at = datetime.utcnow()

            # Update embedding with new categories/moods
            try:
                embedding = vector_store.update_book(book, categories, moods)
                book.embedding = embedding
            except Exception:
                logger.warning(f"Failed to update embedding for book {book.id}", exc_info=True)

            updated += 1

            # Commit every 10 books to avoid losing progress
            if updated % 10 == 0:
                session.commit()
                logger.info(f"Progress: {updated}/{total} books updated")

        except Exception as e:
            logger.error(f"Failed to re-categorize book {book.id}: {e}", exc_info=True)
            failed += 1

    session.commit()

    return RecategorizeResponse(
        total=total,
        updated=updated,
        failed=failed,
        skipped=skipped
    )


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

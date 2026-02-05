import csv
import io
import logging
import re
from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, File, UploadFile, HTTPException
from fastapi.responses import StreamingResponse
from sqlmodel import Session, select

from ..database import get_session

logger = logging.getLogger(__name__)
from ..models.book import Book, BookCategory, BookMood, BookCreate, BookRead
from ..services.vector_store import VectorStore
from ..services.enrichment import BookEnrichmentService
from .books import book_to_read

router = APIRouter(prefix="/api", tags=["import/export"])


# Column name mappings for different CSV formats
COLUMN_MAPPINGS = {
    # Standard format
    "title": "title",
    "author": "author",
    "format": "format",
    "isbn": "isbn",
    "description": "description",
    "reading_status": "reading_status",
    "purchase_date": "purchase_date",
    "date_started": "date_started",
    "date_finished": "date_finished",
    "rating": "rating",
    "notes": "notes",
    "cover_url": "cover_url",
    "page_count": "page_count",
    "categories": "categories",
    "moods": "moods",
    # Goodreads-style mappings
    "ISBN": "isbn",
    "ISBN13": "isbn",
    "Date Added": "purchase_date",
    "date_added": "purchase_date",
    "Date Read": "date_finished",
    "My Rating": "rating",
    "Number of Pages": "page_count",
    "Original Publication Year": "year",
    "Exclusive Shelf": "reading_status",
    "Bookshelves": "categories",
}

# Status mappings for different formats
STATUS_MAPPINGS = {
    # Standard
    "unread": "unread",
    "reading": "reading",
    "completed": "completed",
    "dnf": "dnf",
    # Goodreads-style
    "to-read": "unread",
    "currently-reading": "reading",
    "read": "completed",
    "did-not-finish": "dnf",
}

# Format mappings
FORMAT_MAPPINGS = {
    "kindle": "kindle",
    "kindle edition": "kindle",
    "ebook": "kindle",
    "paperback": "physical",
    "hardcover": "physical",
    "physical": "physical",
    "audiobook": "audiobook",
    "audio": "audiobook",
    "pdf": "pdf",
    "epub": "epub",
}


def parse_date(value: str) -> Optional[date]:
    """Parse date from various string formats."""
    if not value or value.strip() == "":
        return None

    value = value.strip()

    # Try ISO format first (YYYY-MM-DD)
    try:
        return date.fromisoformat(value)
    except ValueError:
        pass

    # Try MM/DD/YY format
    match = re.match(r"(\d{1,2})/(\d{1,2})/(\d{2,4})", value)
    if match:
        month, day, year = match.groups()
        year = int(year)
        if year < 100:
            year = 2000 + year if year < 50 else 1900 + year
        try:
            return date(year, int(month), int(day))
        except ValueError:
            pass

    return None


def parse_int(value: str) -> Optional[int]:
    """Parse int from string, return None if invalid."""
    if not value or value.strip() == "":
        return None
    try:
        return int(float(value.strip()))
    except (ValueError, TypeError):
        return None


def normalize_column_name(col: str) -> str:
    """Normalize column name to standard format."""
    col = col.strip().lower()
    return COLUMN_MAPPINGS.get(col, COLUMN_MAPPINGS.get(col.title(), col))


def get_row_value(row: dict, field: str, mappings: dict = COLUMN_MAPPINGS) -> str:
    """Get value from row, trying multiple possible column names."""
    # Try direct field name
    if field in row:
        return row[field]

    # Try to find a matching mapped column
    for original, mapped in mappings.items():
        if mapped == field and original in row:
            return row[original]

    return ""


def normalize_status(status: str) -> str:
    """Normalize reading status to standard format."""
    if not status:
        return "unread"
    status = status.strip().lower()
    return STATUS_MAPPINGS.get(status, "unread")


def normalize_format(fmt: str) -> str:
    """Normalize book format to standard format."""
    if not fmt:
        return "kindle"
    fmt = fmt.strip().lower()
    return FORMAT_MAPPINGS.get(fmt, "kindle")


@router.post("/import/csv")
async def import_csv(
    file: UploadFile = File(...),
    auto_categorize: bool = True,
    enrich_metadata: bool = True,
    session: Session = Depends(get_session),
):
    """
    Import books from a CSV file.

    Supports multiple CSV formats including Goodreads exports.

    Expected CSV columns (header row required):
    - title (required)
    - author (required)
    - format (required: kindle, physical, audiobook, pdf, epub - or common variants)
    - isbn/ISBN/ISBN13 (optional)
    - description (optional)
    - reading_status/Exclusive Shelf (optional: unread, reading, completed, dnf or Goodreads equivalents)
    - purchase_date/Date Added (optional: YYYY-MM-DD or MM/DD/YY)
    - date_started (optional: YYYY-MM-DD or MM/DD/YY)
    - date_finished/Date Read (optional: YYYY-MM-DD or MM/DD/YY)
    - rating/My Rating (optional: 1-5)
    - notes (optional)
    - cover_url (optional - will be fetched if missing and enrich_metadata=true)
    - page_count/Number of Pages (optional - will be fetched if missing and enrich_metadata=true)
    - categories/Bookshelves (optional: comma-separated - will be AI-generated if missing)
    - moods (optional: comma-separated - will be AI-generated if missing)
    """
    if not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="File must be a CSV")

    content = await file.read()

    # Try different encodings
    for encoding in ["utf-8", "utf-8-sig", "latin-1"]:
        try:
            text = content.decode(encoding)
            break
        except UnicodeDecodeError:
            continue
    else:
        raise HTTPException(status_code=400, detail="Could not decode CSV file")

    # Handle tab-separated values
    if "\t" in text.split("\n")[0]:
        reader = csv.DictReader(io.StringIO(text), delimiter="\t")
    else:
        reader = csv.DictReader(io.StringIO(text))

    imported = []
    errors = []
    vector_store = VectorStore()
    enrichment = BookEnrichmentService() if (auto_categorize or enrich_metadata) else None

    for row_num, row in enumerate(reader, start=2):  # Start at 2 (header is row 1)
        try:
            # Get values using flexible column mapping
            title = (get_row_value(row, "title") or row.get("title", "")).strip()
            author = (get_row_value(row, "author") or row.get("author", "")).strip()
            book_format = normalize_format(
                get_row_value(row, "format") or row.get("format", "")
            )

            if not title or not author:
                errors.append(
                    {
                        "row": row_num,
                        "error": "Missing required fields: title or author",
                    }
                )
                continue

            # Get optional fields
            isbn = get_row_value(row, "isbn") or row.get("ISBN", "") or row.get("ISBN13", "")
            isbn = isbn.replace("=", "").replace('"', "").strip() or None

            description = (get_row_value(row, "description") or "").strip() or None

            reading_status = normalize_status(
                get_row_value(row, "reading_status") or
                row.get("Exclusive Shelf", "") or
                row.get("reading_status", "")
            )

            purchase_date = parse_date(
                get_row_value(row, "purchase_date") or
                row.get("Date Added", "") or
                row.get("date_added", "")
            )

            date_started = parse_date(get_row_value(row, "date_started"))

            date_finished = parse_date(
                get_row_value(row, "date_finished") or
                row.get("Date Read", "")
            )

            rating = parse_int(
                get_row_value(row, "rating") or
                row.get("My Rating", "")
            )
            # Ensure rating is 1-5
            if rating is not None:
                if rating == 0:
                    rating = None
                elif rating > 5:
                    rating = 5
                elif rating < 1:
                    rating = 1

            notes = (get_row_value(row, "notes") or "").strip() or None

            cover_url = (get_row_value(row, "cover_url") or "").strip() or None

            page_count = parse_int(
                get_row_value(row, "page_count") or
                row.get("Number of Pages", "")
            )

            # Get categories and moods
            categories_str = (
                get_row_value(row, "categories") or
                row.get("Bookshelves", "") or
                ""
            ).strip()
            moods_str = (get_row_value(row, "moods") or "").strip()

            categories = (
                [c.strip() for c in categories_str.split(",") if c.strip()]
                if categories_str
                else []
            )
            moods = (
                [m.strip() for m in moods_str.split(",") if m.strip()]
                if moods_str
                else []
            )

            # Enrich book data if enabled
            if enrichment:
                try:
                    enriched = await enrichment.enrich_book(
                        title=title,
                        author=author,
                        isbn=isbn,
                        description=description,
                        cover_url=cover_url,
                        page_count=page_count,
                        categories=categories,
                        moods=moods,
                        fetch_metadata=enrich_metadata and (not cover_url or not page_count),
                        auto_categorize=auto_categorize and (not categories or not moods),
                    )

                    if enriched.get("cover_url"):
                        cover_url = enriched["cover_url"]
                    if enriched.get("page_count"):
                        page_count = enriched["page_count"]
                    if enriched.get("description") and not description:
                        description = enriched["description"]
                    if enriched.get("categories") and not categories:
                        categories = enriched["categories"]
                    if enriched.get("moods") and not moods:
                        moods = enriched["moods"]
                except Exception:
                    logger.warning(f"Failed to enrich book '{title}' during import", exc_info=True)

            # Create book
            book = Book(
                title=title,
                author=author,
                format=book_format,
                isbn=isbn,
                description=description,
                reading_status=reading_status,
                purchase_date=purchase_date,
                date_started=date_started,
                date_finished=date_finished,
                rating=rating,
                notes=notes,
                cover_url=cover_url,
                page_count=page_count,
            )

            session.add(book)
            session.commit()
            session.refresh(book)

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

            # Generate and store embedding
            try:
                embedding = vector_store.add_book(book, categories, moods)
                if embedding:
                    book.embedding = embedding
                    session.commit()
            except Exception:
                logger.warning(f"Failed to generate embedding for imported book {book.id}", exc_info=True)

            imported.append(book_to_read(book))

        except Exception as e:
            errors.append({"row": row_num, "error": str(e)})

    return {
        "imported_count": len(imported),
        "error_count": len(errors),
        "imported": imported,
        "errors": errors,
    }


@router.get("/export/csv")
def export_csv(session: Session = Depends(get_session)):
    """Export all books to a CSV file."""
    books = session.exec(select(Book)).all()

    output = io.StringIO()
    writer = csv.writer(output)

    # Write header
    writer.writerow(
        [
            "title",
            "author",
            "format",
            "isbn",
            "description",
            "reading_status",
            "purchase_date",
            "date_started",
            "date_finished",
            "rating",
            "notes",
            "cover_url",
            "page_count",
            "categories",
            "moods",
        ]
    )

    # Write books
    for book in books:
        categories = ",".join([c.category for c in book.categories])
        moods = ",".join([m.mood for m in book.moods])

        writer.writerow(
            [
                book.title,
                book.author,
                book.format,
                book.isbn or "",
                book.description or "",
                book.reading_status,
                book.purchase_date.isoformat() if book.purchase_date else "",
                book.date_started.isoformat() if book.date_started else "",
                book.date_finished.isoformat() if book.date_finished else "",
                book.rating or "",
                book.notes or "",
                book.cover_url or "",
                book.page_count or "",
                categories,
                moods,
            ]
        )

    output.seek(0)

    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=library_export.csv"},
    )

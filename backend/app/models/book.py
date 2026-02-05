from datetime import date, datetime
from typing import Optional, Any

from sqlmodel import SQLModel, Field, Relationship
from sqlalchemy import Column
from pgvector.sqlalchemy import Vector

# Embedding dimension for all-MiniLM-L6-v2 model
EMBEDDING_DIM = 384


# Database Models
class BookCategory(SQLModel, table=True):
    __tablename__ = "book_categories"

    id: Optional[int] = Field(default=None, primary_key=True)
    book_id: int = Field(foreign_key="books.id", ondelete="CASCADE")
    category: str = Field(max_length=50)

    book: Optional["Book"] = Relationship(back_populates="categories")


class BookMood(SQLModel, table=True):
    __tablename__ = "book_moods"

    id: Optional[int] = Field(default=None, primary_key=True)
    book_id: int = Field(foreign_key="books.id", ondelete="CASCADE")
    mood: str = Field(max_length=50)

    book: Optional["Book"] = Relationship(back_populates="moods")


class Book(SQLModel, table=True):
    __tablename__ = "books"

    id: Optional[int] = Field(default=None, primary_key=True)
    title: str = Field(max_length=500)
    author: str = Field(max_length=300)
    isbn: Optional[str] = Field(default=None, max_length=20)
    description: Optional[str] = Field(default=None)
    format: str = Field(max_length=20)  # kindle, physical, audiobook, pdf, epub
    reading_status: str = Field(default="unread", max_length=20)
    purchase_date: Optional[date] = Field(default=None)
    date_started: Optional[date] = Field(default=None)
    date_finished: Optional[date] = Field(default=None)
    rating: Optional[int] = Field(default=None, ge=1, le=5)
    notes: Optional[str] = Field(default=None)
    cover_url: Optional[str] = Field(default=None, max_length=500)
    page_count: Optional[int] = Field(default=None)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    # Vector embedding for semantic search (384 dimensions for all-MiniLM-L6-v2)
    embedding: Optional[Any] = Field(default=None, sa_column=Column(Vector(EMBEDDING_DIM)))

    categories: list[BookCategory] = Relationship(
        back_populates="book", sa_relationship_kwargs={"cascade": "all, delete-orphan"}
    )
    moods: list[BookMood] = Relationship(
        back_populates="book", sa_relationship_kwargs={"cascade": "all, delete-orphan"}
    )


# Pydantic Schemas for API
class BookCreate(SQLModel):
    title: str
    author: str
    isbn: Optional[str] = None
    description: Optional[str] = None
    format: str
    reading_status: str = "unread"
    purchase_date: Optional[date] = None
    date_started: Optional[date] = None
    date_finished: Optional[date] = None
    rating: Optional[int] = Field(default=None, ge=1, le=5)
    notes: Optional[str] = None
    cover_url: Optional[str] = None
    page_count: Optional[int] = None
    categories: list[str] = []
    moods: list[str] = []


class BookUpdate(SQLModel):
    title: Optional[str] = None
    author: Optional[str] = None
    isbn: Optional[str] = None
    description: Optional[str] = None
    format: Optional[str] = None
    reading_status: Optional[str] = None
    purchase_date: Optional[date] = None
    date_started: Optional[date] = None
    date_finished: Optional[date] = None
    rating: Optional[int] = Field(default=None, ge=1, le=5)
    notes: Optional[str] = None
    cover_url: Optional[str] = None
    page_count: Optional[int] = None
    categories: Optional[list[str]] = None
    moods: Optional[list[str]] = None


class BookRead(SQLModel):
    id: int
    title: str
    author: str
    isbn: Optional[str] = None
    description: Optional[str] = None
    format: str
    reading_status: str
    purchase_date: Optional[date] = None
    date_started: Optional[date] = None
    date_finished: Optional[date] = None
    rating: Optional[int] = None
    notes: Optional[str] = None
    cover_url: Optional[str] = None
    page_count: Optional[int] = None
    created_at: datetime
    updated_at: datetime
    categories: list[str] = []
    moods: list[str] = []


class BookLookupResult(SQLModel):
    title: str
    author: str
    description: Optional[str] = None
    cover_url: Optional[str] = None
    page_count: Optional[int] = None
    isbn: str

import logging
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlmodel import Session, select

from .database import create_db_and_tables, engine
from .routers import books_router, search_router, import_export_router
from .config import get_settings

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)


def sync_vector_store():
    """Sync the vector store with books from the database."""
    if os.environ.get("DISABLE_EMBEDDINGS") == "true":
        logger.info("Embeddings disabled, skipping vector store sync")
        return

    try:
        from .services.vector_store import VectorStore
        from .models.book import Book

        vector_store = VectorStore()
        vector_count = vector_store.count()

        # Get all books from database
        with Session(engine) as session:
            books = session.exec(select(Book)).unique().all()
            db_count = len(books)

        logger.info(f"Vector store has {vector_count} books, database has {db_count} books")

        if vector_count < db_count:
            logger.info("Syncing vector store from database...")
            with Session(engine) as session:
                books = session.exec(select(Book)).unique().all()
                added = vector_store.sync_from_database(books)
            logger.info(f"Added {added} books to vector store")
        else:
            logger.info("Vector store is in sync with database")

    except Exception as e:
        logger.warning(f"Failed to sync vector store: {e}")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: create database tables
    create_db_and_tables()
    # Sync vector store with database (for Railway deployments where ChromaDB is wiped)
    sync_vector_store()
    yield
    # Shutdown: cleanup if needed


app = FastAPI(
    title="Personal Library API",
    description="A personal library database with RAG-powered search",
    version="1.0.0",
    lifespan=lifespan,
)

# Configure CORS
settings = get_settings()
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(books_router)
app.include_router(search_router)
app.include_router(import_export_router)


@app.get("/api/health")
def health_check():
    """Health check endpoint."""
    return {"status": "healthy", "version": "1.0.0"}


@app.get("/api/config")
def get_config():
    """Get available categories, moods, formats, and statuses."""
    settings = get_settings()
    return {
        "categories": settings.CATEGORIES,
        "moods": settings.MOODS,
        "formats": settings.FORMATS,
        "reading_statuses": settings.READING_STATUSES,
    }

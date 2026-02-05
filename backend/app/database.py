import logging
from sqlmodel import SQLModel, create_engine, Session, text
from .config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

# Handle connection args based on database type
connect_args = {}
db_url = settings.DATABASE_URL

if db_url.startswith("sqlite"):
    connect_args["check_same_thread"] = False
elif db_url.startswith("postgresql"):
    # Railway Postgres - try different SSL modes
    connect_args["sslmode"] = "disable"  # Try without SSL first

engine = create_engine(
    db_url,
    connect_args=connect_args,
    echo=False,
    pool_pre_ping=True,
    pool_recycle=300,
    pool_size=5,
    max_overflow=10,
)


def create_db_and_tables():
    # Enable pgvector extension if using PostgreSQL
    if db_url.startswith("postgresql"):
        with Session(engine) as session:
            try:
                session.exec(text("CREATE EXTENSION IF NOT EXISTS vector"))
                session.commit()
                logger.info("pgvector extension enabled")
            except Exception as e:
                logger.warning(f"Could not enable pgvector extension: {e}")

    SQLModel.metadata.create_all(engine)


def get_session():
    with Session(engine) as session:
        yield session

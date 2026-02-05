import os
from functools import lru_cache

from dotenv import load_dotenv

load_dotenv()


class Settings:
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./library.db")
    GROQ_API_KEY: str = os.getenv("GROQ_API_KEY", "")

    # CORS allowed origins (comma-separated list)
    CORS_ORIGINS: list[str] = [
        origin.strip()
        for origin in os.getenv("CORS_ORIGINS", "http://localhost:3000").split(",")
        if origin.strip()
    ]

    # Predefined categories for books
    CATEGORIES: list[str] = [
        "fiction",
        "non-fiction",
        "sci-fi",
        "fantasy",
        "mystery",
        "thriller",
        "romance",
        "horror",
        "biography",
        "history",
        "science",
        "self-help",
        "business",
        "philosophy",
        "classic",
        "young-adult",
        "children",
    ]

    # Predefined moods for books
    MOODS: list[str] = [
        "inspiring",
        "relaxing",
        "thrilling",
        "thought-provoking",
        "funny",
        "heartwarming",
        "dark",
        "adventurous",
        "romantic",
        "educational",
        "cozy",
        "suspenseful",
        "uplifting",
    ]

    # Book formats
    FORMATS: list[str] = ["kindle", "physical", "audiobook", "pdf", "epub"]

    # Reading statuses
    READING_STATUSES: list[str] = ["unread", "reading", "completed", "dnf"]


@lru_cache
def get_settings() -> Settings:
    return Settings()

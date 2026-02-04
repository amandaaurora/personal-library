import json
import logging
from typing import Optional

from groq import Groq

from ..config import get_settings

logger = logging.getLogger(__name__)


class CategorizationService:
    """Service for auto-categorizing books using Groq LLM."""

    MODEL = "llama-3.1-8b-instant"

    def __init__(self):
        settings = get_settings()
        api_key = settings.GROQ_API_KEY
        if not api_key:
            logger.warning("GROQ_API_KEY is not set - categorization will not work")
        self.client = Groq(api_key=api_key) if api_key else None
        self.valid_categories = settings.CATEGORIES
        self.valid_moods = settings.MOODS

    async def categorize_book(
        self,
        title: str,
        author: str,
        description: Optional[str] = None,
    ) -> dict:
        """
        Auto-suggest categories and moods for a book.

        Returns dict with 'categories' and 'moods' lists.
        """
        system_prompt = f"""You are a book categorization assistant. Given a book's title, author, and optional description, suggest appropriate categories and moods.

Available categories: {', '.join(self.valid_categories)}
Available moods: {', '.join(self.valid_moods)}

Rules:
- Select 1-3 categories that best fit the book
- Select 1-3 moods that best describe the reading experience
- Only use categories and moods from the provided lists
- If you're unsure, make educated guesses based on the title and author

Respond ONLY with a JSON object in this exact format:
{{"categories": ["category1", "category2"], "moods": ["mood1", "mood2"]}}"""

        user_message = f"""Title: {title}
Author: {author}
Description: {description or 'Not provided'}

Categorize this book."""

        if not self.client:
            logger.warning("Groq client not initialized - skipping categorization")
            return {"categories": [], "moods": []}

        try:
            logger.info(f"Categorizing book: {title} by {author}")
            response = self.client.chat.completions.create(
                model=self.MODEL,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_message},
                ],
                temperature=0.3,
                max_tokens=150,
            )

            content = response.choices[0].message.content.strip()
            logger.debug(f"Groq response: {content}")

            # Try to parse JSON from response
            # Handle potential markdown code blocks
            if "```" in content:
                content = content.split("```")[1]
                if content.startswith("json"):
                    content = content[4:]
                content = content.strip()

            result = json.loads(content)

            # Validate categories and moods
            categories = [
                c for c in result.get("categories", []) if c in self.valid_categories
            ]
            moods = [m for m in result.get("moods", []) if m in self.valid_moods]

            logger.info(f"Categorization result: categories={categories}, moods={moods}")
            return {
                "categories": categories[:3],  # Max 3
                "moods": moods[:3],  # Max 3
            }

        except Exception as e:
            logger.error(f"Categorization failed for '{title}': {e}", exc_info=True)
            # Return empty suggestions on error
            return {"categories": [], "moods": []}

from typing import Optional

from groq import Groq

from ..config import get_settings
from .vector_store import VectorStore


class RAGService:
    """RAG (Retrieval-Augmented Generation) service using Groq LLM."""

    MODEL = "llama-3.3-70b-versatile"

    def __init__(self):
        settings = get_settings()
        self.client = Groq(api_key=settings.GROQ_API_KEY)
        self.vector_store = VectorStore()

    async def search(
        self,
        query: str,
        n_results: int = 10,
        category: Optional[str] = None,
        mood: Optional[str] = None,
        format: Optional[str] = None,
        reading_status: Optional[str] = None,
    ) -> dict:
        """
        Perform RAG search: retrieve relevant books and generate response.

        Returns both the raw search results and an LLM-generated response.
        """
        # Step 1: Retrieve relevant books from vector store
        search_results = self.vector_store.search(
            query=query,
            n_results=n_results,
            category=category,
            mood=mood,
            format=format,
            reading_status=reading_status,
        )

        if not search_results:
            return {
                "response": "I couldn't find any books matching your query. Try adding some books to your library first!",
                "books": [],
            }

        # Step 2: Build context from search results
        context = self._build_context(search_results)

        # Step 3: Generate response using Groq
        response = await self._generate_response(query, context, search_results)

        return {
            "response": response,
            "books": search_results,
        }

    def _build_context(self, books: list[dict]) -> str:
        """Build context string from book search results."""
        context_parts = []

        for i, book in enumerate(books, 1):
            parts = [
                f"{i}. {book['title']} by {book['author']}",
                f"   Format: {book['format']}, Status: {book['reading_status']}",
            ]

            if book.get("categories"):
                parts.append(f"   Categories: {', '.join(book['categories'])}")

            if book.get("moods"):
                parts.append(f"   Moods: {', '.join(book['moods'])}")

            context_parts.append("\n".join(parts))

        return "\n\n".join(context_parts)

    async def _generate_response(
        self, query: str, context: str, books: list[dict]
    ) -> str:
        """Generate a natural language response using Groq."""
        system_prompt = """You are a helpful personal librarian assistant. You help users find books from their personal library based on their queries.

Given the user's query and a list of books from their library, provide a helpful and personalized response. Be conversational but concise.

Guidelines:
- Recommend books that best match the user's query
- Explain why each recommendation fits their request
- If the query is about mood or genre, focus on those aspects
- Keep responses focused and helpful
- If no books are a great match, be honest about it
- Reference specific book titles and authors"""

        user_message = f"""Query: {query}

Books in library:
{context}

Based on these books in the user's library, provide a helpful response to their query."""

        try:
            response = self.client.chat.completions.create(
                model=self.MODEL,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_message},
                ],
                temperature=0.7,
                max_tokens=500,
            )
            return response.choices[0].message.content
        except Exception as e:
            # Fallback to a simple response if Groq fails
            book_list = ", ".join([f"'{b['title']}'" for b in books[:3]])
            return f"Based on your query, you might enjoy: {book_list}. (Note: AI-enhanced responses are currently unavailable.)"

# Personal Library

A personal library database app to catalog books (Kindle, physical, audiobook, PDF, ePub) with AI-powered auto-categorization by genre and mood, plus RAG-enabled natural language search.

## Features

- **Book Management** - Add, edit, delete books with full metadata
- **Auto-fetch Metadata** - Enter ISBN/title to auto-populate cover, description from Open Library
- **AI Auto-Categorization** - Groq LLM suggests categories and moods when adding books
- **RAG Search** - Natural language queries like "cozy mystery books for winter"
- **Import/Export** - CSV bulk import and export
- **Multiple Formats** - Track Kindle, physical, audiobook, PDF, and ePub books

## Tech Stack

| Component | Technology |
|-----------|------------|
| Frontend | Next.js 14 + TypeScript + Tailwind CSS |
| Backend | Python FastAPI |
| Database | SQLite (dev) / PostgreSQL (prod) |
| Vector DB | ChromaDB |
| Embeddings | Sentence Transformers (all-MiniLM-L6-v2) |
| LLM | Groq API (Llama 3.3 70B) |
| Book Metadata | Open Library API |

## Prerequisites

- Python 3.10+
- Node.js 18+
- pnpm (or npm/yarn)
- [Groq API Key](https://console.groq.com/keys)

## Getting Started

### 1. Clone the repository

```bash
git clone <your-repo-url>
cd personal-library
```

### 2. Backend Setup

```bash
cd backend

# Create and activate virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Copy environment file and add your Groq API key
cp ../.env.example .env
# Edit .env and set your GROQ_API_KEY

# Run the backend server
uvicorn app.main:app --reload --port 8000
```

The API will be available at http://localhost:8000

### 3. Frontend Setup

```bash
cd frontend

# Install dependencies
pnpm install  # or npm install

# Run the development server
pnpm dev  # or npm run dev
```

The app will be available at http://localhost:3000

## Environment Variables

Create a `.env` file in the `backend/` directory:

```bash
# Database URL (SQLite for local development)
DATABASE_URL=sqlite:///./library.db

# Groq API Key (required for AI features)
GROQ_API_KEY=gsk_your_api_key_here

# ChromaDB persistence path
CHROMA_PERSIST_PATH=./chroma_data

# CORS allowed origins
CORS_ORIGINS=http://localhost:3000
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/books` | List books (paginated, filterable) |
| `GET` | `/api/books/{id}` | Get single book |
| `POST` | `/api/books` | Add book (auto-categorizes) |
| `PATCH` | `/api/books/{id}` | Update book |
| `DELETE` | `/api/books/{id}` | Delete book |
| `GET` | `/api/books/lookup?isbn={isbn}` | Fetch metadata from Open Library |
| `POST` | `/api/search/query` | RAG natural language search |
| `POST` | `/api/import/csv` | Import books from CSV |
| `GET` | `/api/export/csv` | Export library to CSV |

## Project Structure

```
personal-library/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI entry point
│   │   ├── database.py          # Database connection
│   │   ├── models/
│   │   │   └── book.py          # SQLModel schemas
│   │   ├── routers/
│   │   │   └── search.py        # RAG search endpoint
│   │   └── services/
│   │       ├── embedding_service.py
│   │       ├── vector_store.py
│   │       ├── rag_service.py
│   │       └── categorization.py
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── app/                 # Next.js pages
│   │   ├── components/          # React components
│   │   └── lib/                 # API client & types
│   └── package.json
├── .env.example
└── README.md
```

## Categories & Moods

### Predefined Categories
fiction, non-fiction, sci-fi, fantasy, mystery, thriller, romance, horror, biography, history, science, self-help, business, philosophy, classic, young-adult, children

### Predefined Moods
inspiring, relaxing, thrilling, thought-provoking, funny, heartwarming, dark, adventurous, romantic, educational, cozy, suspenseful, uplifting

## Deployment

### Backend (Railway)

1. Sign up at [railway.app](https://railway.app)
2. Create a new project and add PostgreSQL
3. Deploy from GitHub
4. Set environment variables:
   - `GROQ_API_KEY`
   - `DATABASE_URL` (auto-provided by Railway)
   - `CHROMA_PERSIST_PATH=/data/chroma`

### Frontend (Vercel)

1. Sign up at [vercel.com](https://vercel.com)
2. Import your GitHub repository
3. Set environment variable:
   - `NEXT_PUBLIC_API_URL=https://your-app.railway.app/api`

## Free Tier Limits

| Service | Limit |
|---------|-------|
| Groq | 30 requests/min, 14.4K req/day |
| Railway | $5 credit/month |
| Vercel | 100GB bandwidth |
| Open Library | No hard limit |

## License

MIT

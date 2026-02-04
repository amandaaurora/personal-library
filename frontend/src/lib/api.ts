import type {
  Book,
  BookCreate,
  BookUpdate,
  BookLookup,
  SearchResponse,
  Config,
  ImportResult,
  BookFilters,
  DuplicatesResponse,
} from './types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

async function fetchApi<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Request failed' }));
    let message = 'Request failed';
    if (typeof error.detail === 'string') {
      message = error.detail;
    } else if (Array.isArray(error.detail)) {
      // Handle Pydantic validation errors (array of {loc, msg, type})
      message = error.detail
        .map((e: { loc?: string[]; msg?: string }) => {
          const field = e.loc?.slice(-1)[0] || 'field';
          return `${field}: ${e.msg || 'Invalid value'}`;
        })
        .join(', ');
    }
    throw new Error(message);
  }

  return response.json();
}

// Config
export async function getConfig(): Promise<Config> {
  return fetchApi<Config>('/config');
}

// Books
export async function getBooks(filters?: BookFilters): Promise<Book[]> {
  const params = new URLSearchParams();
  if (filters?.category) params.set('category', filters.category);
  if (filters?.mood) params.set('mood', filters.mood);
  if (filters?.format) params.set('format', filters.format);
  if (filters?.reading_status) params.set('reading_status', filters.reading_status);
  if (filters?.search) params.set('search', filters.search);

  const query = params.toString();
  return fetchApi<Book[]>(`/books${query ? `?${query}` : ''}`);
}

export async function getBook(id: number): Promise<Book> {
  return fetchApi<Book>(`/books/${id}`);
}

export async function createBook(book: BookCreate, autoCategorize = true): Promise<Book> {
  return fetchApi<Book>(`/books?auto_categorize=${autoCategorize}`, {
    method: 'POST',
    body: JSON.stringify(book),
  });
}

export async function updateBook(id: number, book: BookUpdate): Promise<Book> {
  return fetchApi<Book>(`/books/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(book),
  });
}

export async function deleteBook(id: number): Promise<void> {
  await fetch(`${API_URL}/books/${id}`, { method: 'DELETE' });
}

export async function bulkUpdateBooks(
  ids: number[],
  update: BookUpdate
): Promise<void> {
  await Promise.all(ids.map((id) => updateBook(id, update)));
}

export async function bulkDeleteBooks(ids: number[]): Promise<void> {
  await Promise.all(ids.map((id) => deleteBook(id)));
}

export async function lookupBook(isbn: string): Promise<BookLookup> {
  return fetchApi<BookLookup>(`/books/lookup?isbn=${encodeURIComponent(isbn)}`);
}

export async function getDuplicates(): Promise<DuplicatesResponse> {
  return fetchApi<DuplicatesResponse>('/books/duplicates');
}

export async function categorizeBook(id: number): Promise<Book> {
  return fetchApi<Book>(`/books/${id}/categorize`, {
    method: 'POST',
  });
}

// Search
export async function searchBooks(
  query: string,
  filters?: Partial<BookFilters>
): Promise<SearchResponse> {
  return fetchApi<SearchResponse>('/search/query', {
    method: 'POST',
    body: JSON.stringify({
      query,
      n_results: 10,
      ...filters,
    }),
  });
}

// Import/Export
export async function importCSV(
  file: File,
  autoCategorize = true,
  enrichMetadata = true
): Promise<ImportResult> {
  const formData = new FormData();
  formData.append('file', file);

  const params = new URLSearchParams({
    auto_categorize: String(autoCategorize),
    enrich_metadata: String(enrichMetadata),
  });

  const response = await fetch(
    `${API_URL}/import/csv?${params}`,
    {
      method: 'POST',
      body: formData,
    }
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Import failed' }));
    let message = 'Import failed';
    if (typeof error.detail === 'string') {
      message = error.detail;
    } else if (Array.isArray(error.detail)) {
      message = error.detail
        .map((e: { loc?: string[]; msg?: string }) => {
          const field = e.loc?.slice(-1)[0] || 'field';
          return `${field}: ${e.msg || 'Invalid value'}`;
        })
        .join(', ');
    }
    throw new Error(message);
  }

  return response.json();
}

export function getExportUrl(): string {
  return `${API_URL}/export/csv`;
}

export interface Book {
  id: number;
  title: string;
  author: string;
  isbn: string | null;
  description: string | null;
  format: BookFormat;
  reading_status: ReadingStatus;
  purchase_date: string | null;
  date_started: string | null;
  date_finished: string | null;
  rating: number | null;
  notes: string | null;
  cover_url: string | null;
  page_count: number | null;
  created_at: string;
  updated_at: string;
  categories: string[];
  moods: string[];
}

export interface BookCreate {
  title: string;
  author: string;
  isbn?: string;
  description?: string;
  format: BookFormat;
  reading_status?: ReadingStatus;
  purchase_date?: string;
  date_started?: string;
  date_finished?: string;
  rating?: number;
  notes?: string;
  cover_url?: string;
  page_count?: number;
  categories?: string[];
  moods?: string[];
}

export interface BookUpdate {
  title?: string;
  author?: string;
  isbn?: string;
  description?: string;
  format?: BookFormat;
  reading_status?: ReadingStatus;
  purchase_date?: string;
  date_started?: string;
  date_finished?: string;
  rating?: number;
  notes?: string;
  cover_url?: string;
  page_count?: number;
  categories?: string[];
  moods?: string[];
}

export interface BookLookup {
  title: string;
  author: string;
  description: string | null;
  cover_url: string | null;
  page_count: number | null;
  isbn: string;
}

export interface SearchResult {
  id: number;
  title: string;
  author: string;
  format: string;
  reading_status: string;
  categories: string[];
  moods: string[];
  similarity: number;
}

export interface SearchResponse {
  response: string;
  books: SearchResult[];
}

export interface Config {
  categories: string[];
  moods: string[];
  formats: string[];
  reading_statuses: string[];
}

export interface ImportResult {
  imported_count: number;
  error_count: number;
  imported: Book[];
  errors: { row: number; error: string }[];
}

export type BookFormat = 'kindle' | 'physical' | 'audiobook' | 'pdf' | 'epub';
export type ReadingStatus = 'unread' | 'reading' | 'completed' | 'dnf';

export interface BookFilters {
  category?: string;
  mood?: string;
  format?: string;
  reading_status?: string;
  search?: string;
}

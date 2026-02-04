'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import Link from 'next/link';
import { Search, Loader2, BookOpen, Sparkles } from 'lucide-react';
import { searchBooks } from '@/lib/api';
import type { SearchResponse } from '@/lib/types';

export default function SearchInterface() {
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<SearchResponse | null>(null);

  const searchMutation = useMutation({
    mutationFn: (q: string) => searchBooks(q),
    onSuccess: (data) => setResult(data),
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      searchMutation.mutate(query.trim());
    }
  };

  return (
    <div className="space-y-6">
      {/* Search Form */}
      <form onSubmit={handleSearch}>
        <p className="text-sm mb-4" style={{ color: '#666' }}>
          Search your library using natural language. Try queries like:
        </p>
        <div className="flex flex-wrap gap-2 mb-4">
          {[
            'cozy mystery for winter',
            'epic sci-fi with political intrigue',
            'inspiring books about habits',
            'something thrilling to read',
          ].map((example) => (
            <button
              key={example}
              type="button"
              onClick={() => {
                setQuery(example);
                searchMutation.mutate(example);
              }}
              className="text-sm px-3 py-1.5 rounded-lg border transition-colors"
              style={{
                backgroundColor: '#ede7f6',
                borderColor: '#1a1a1a',
                color: '#1a1a1a',
              }}
            >
              {example}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="What kind of book are you looking for?"
            className="input flex-1"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button
            type="submit"
            disabled={searchMutation.isPending || !query.trim()}
            className="btn btn-primary flex items-center"
          >
            {searchMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Search className="h-4 w-4" />
            )}
            <span className="ml-2">Search</span>
          </button>
        </div>
      </form>

      {/* Error */}
      {searchMutation.error && (
        <div
          className="p-4 rounded-lg border text-sm"
          style={{ backgroundColor: '#fef2f2', borderColor: '#dc2626', color: '#dc2626' }}
        >
          Search failed. Make sure the backend is running.
        </div>
      )}

      {/* Results */}
      {result && (
        <div className="space-y-4">
          {/* AI Response */}
          <div
            className="card p-5"
            style={{ backgroundColor: '#ede7f6' }}
          >
            <div className="flex items-start gap-3">
              <div
                className="p-2 rounded-lg border"
                style={{ backgroundColor: '#fefffe', borderColor: '#1a1a1a' }}
              >
                <Sparkles className="h-5 w-5" style={{ color: '#1a1a1a' }} />
              </div>
              <div>
                <h3 className="font-bold mb-2" style={{ color: '#1a1a1a' }}>AI Recommendation</h3>
                <p className="text-sm whitespace-pre-wrap" style={{ color: '#666' }}>{result.response}</p>
              </div>
            </div>
          </div>

          {/* Books */}
          {result.books.length > 0 && (
            <div>
              <h3 className="text-lg font-bold mb-4" style={{ color: '#1a1a1a' }}>
                Matching Books ({result.books.length})
              </h3>
              <div className="space-y-2">
                {result.books.map((book) => (
                  <Link
                    key={book.id}
                    href={`/books/${book.id}`}
                    className="card p-4 flex items-center gap-4 transition-all hover:shadow-[4px_4px_0_#1a1a1a] hover:-translate-y-0.5"
                  >
                    <div
                      className="w-12 h-16 rounded flex items-center justify-center flex-shrink-0 border"
                      style={{ backgroundColor: '#e3f2fd', borderColor: '#1a1a1a' }}
                    >
                      <BookOpen className="h-6 w-6" style={{ color: '#1a1a1a' }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h4 className="font-bold truncate" style={{ color: '#1a1a1a' }}>
                            {book.title}
                          </h4>
                          <p className="text-sm" style={{ color: '#666' }}>{book.author}</p>
                        </div>
                        <div className="flex-shrink-0 text-right">
                          <div className="text-sm font-semibold" style={{ color: '#1a1a1a' }}>
                            {Math.round(book.similarity * 100)}% match
                          </div>
                        </div>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-1">
                        <span className="badge badge-format text-xs">
                          {book.format}
                        </span>
                        {book.categories.slice(0, 2).map((cat) => (
                          <span key={cat} className="badge badge-category text-xs">
                            {cat}
                          </span>
                        ))}
                        {book.moods.slice(0, 2).map((mood) => (
                          <span key={mood} className="badge badge-mood text-xs">
                            {mood}
                          </span>
                        ))}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* No results */}
          {result.books.length === 0 && (
            <div className="text-center py-8">
              <BookOpen className="h-12 w-12 mx-auto mb-3" style={{ color: '#999' }} />
              <p style={{ color: '#666' }}>
                No matching books found. Try a different query or add more books!
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

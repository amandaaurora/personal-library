'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { Plus, BookOpen, Loader2, Download } from 'lucide-react';
import { getBooks, getExportUrl } from '@/lib/api';
import BookCard from '@/components/BookCard';
import BookFilters from '@/components/BookFilters';
import type { BookFilters as BookFiltersType } from '@/lib/types';

export default function BooksPage() {
  const [filters, setFilters] = useState<BookFiltersType>({});

  const { data: books = [], isLoading, error } = useQuery({
    queryKey: ['books', filters],
    queryFn: () => getBooks(filters),
  });

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Library</h1>
          <p className="text-gray-600">
            {books.length} book{books.length !== 1 ? 's' : ''} in your collection
          </p>
        </div>
        <div className="flex gap-2">
          <a
            href={getExportUrl()}
            download
            className="btn btn-secondary flex items-center"
          >
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </a>
          <Link href="/books/add" className="btn btn-primary flex items-center">
            <Plus className="h-4 w-4 mr-2" />
            Add Book
          </Link>
        </div>
      </div>

      {/* Filters */}
      <BookFilters filters={filters} onChange={setFilters} />

      {/* Loading */}
      {isLoading && (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg">
          Failed to load books. Make sure the backend is running.
        </div>
      )}

      {/* Books Grid */}
      {!isLoading && !error && books.length > 0 && (
        <div className="grid gap-4">
          {books.map((book) => (
            <BookCard key={book.id} book={book} />
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !error && books.length === 0 && (
        <div className="text-center py-12">
          <BookOpen className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          {Object.values(filters).some((v) => v) ? (
            <>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                No books match your filters
              </h2>
              <p className="text-gray-600 mb-6">
                Try adjusting your search criteria
              </p>
              <button
                onClick={() => setFilters({})}
                className="btn btn-secondary"
              >
                Clear Filters
              </button>
            </>
          ) : (
            <>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                Your library is empty
              </h2>
              <p className="text-gray-600 mb-6">
                Start building your collection!
              </p>
              <Link href="/books/add" className="btn btn-primary">
                Add Your First Book
              </Link>
            </>
          )}
        </div>
      )}
    </div>
  );
}

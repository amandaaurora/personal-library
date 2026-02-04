'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { getBooks } from '@/lib/api';
import {
  BookOpen,
  Star,
  Loader2,
} from 'lucide-react';
import type { Book } from '@/lib/types';

const statusConfig: Record<string, { label: string }> = {
  unread: { label: 'To Read' },
  reading: { label: 'Reading' },
  completed: { label: 'Completed' },
  dnf: { label: 'DNF' },
};

const pastelColors = ['#fff8e1', '#fce4ec', '#e8f5e9', '#e3f2fd', '#ede7f6', '#fff3e0'];

function BookCard({ book, colorIndex }: { book: Book; colorIndex: number }) {
  const bgColor = pastelColors[colorIndex % pastelColors.length];
  const status = statusConfig[book.reading_status];
  const progress = book.reading_status === 'completed' ? 100 :
                   book.reading_status === 'reading' ? 50 :
                   book.reading_status === 'dnf' ? 30 : 0;

  return (
    <Link href={`/books/${book.id}`} className="book-card block">
      {/* Image area with pastel background */}
      <div className="book-image" style={{ backgroundColor: bgColor }}>
        <div className="absolute inset-0 flex items-center justify-center p-4">
          {book.cover_url ? (
            <img
              src={book.cover_url}
              alt=""
              className="max-h-full max-w-full object-contain rounded"
            />
          ) : (
            <div
              className="w-20 h-28 rounded flex items-center justify-center border"
              style={{ backgroundColor: '#ffffff', borderColor: '#1a1a1a' }}
            >
              <BookOpen className="h-8 w-8" style={{ color: '#999' }} />
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="book-content">
        {/* Progress bar */}
        <div className="flex items-center justify-between text-xs mb-2" style={{ color: '#999' }}>
          <span>Progress</span>
          <span>{progress}%</span>
        </div>
        <div className="progress-bar mb-3">
          <div className="progress-fill" style={{ width: `${progress}%` }} />
        </div>

        {/* Title and author */}
        <h3 className="font-bold text-sm mb-1 line-clamp-1" style={{ color: '#1a1a1a' }}>
          {book.title}
        </h3>
        <p className="text-xs mb-3 line-clamp-1" style={{ color: '#666' }}>
          {book.author}
        </p>

        {/* Tags */}
        <div className="flex items-center gap-2">
          <span className="badge text-xs">{status.label}</span>
          {book.rating && (
            <span className="flex items-center text-xs" style={{ color: '#1a1a1a' }}>
              <Star className="h-3 w-3 fill-current mr-0.5" />
              {book.rating}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

function EmptyState() {
  return (
    <div className="flex items-center justify-center h-full">
      <div className="card p-12 text-center max-w-md">
        <div
          className="w-20 h-20 rounded-xl mx-auto mb-6 flex items-center justify-center border"
          style={{ backgroundColor: '#ede7f6', borderColor: '#1a1a1a' }}
        >
          <BookOpen className="h-10 w-10" style={{ color: '#1a1a1a' }} />
        </div>
        <h2 className="text-xl font-bold mb-2" style={{ color: '#1a1a1a' }}>
          Welcome to MyLibrary
        </h2>
        <p className="text-sm mb-6" style={{ color: '#666' }}>
          Start building your personal library. Track your reading progress and discover new books with AI-powered search.
        </p>
        <Link href="/books/add" className="btn btn-primary">
          Add Your First Book
        </Link>
      </div>
    </div>
  );
}

export default function HomePage() {
  const [statusFilter, setStatusFilter] = useState<string>('');

  const { data: books = [], isLoading } = useQuery({
    queryKey: ['books'],
    queryFn: () => getBooks(),
  });

  const filteredBooks = books.filter((book) => {
    return !statusFilter || book.reading_status === statusFilter;
  });

  const stats = {
    total: books.length,
    reading: books.filter((b) => b.reading_status === 'reading').length,
    completed: books.filter((b) => b.reading_status === 'completed').length,
    toRead: books.filter((b) => b.reading_status === 'unread').length,
  };

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" style={{ color: '#666' }} />
      </div>
    );
  }

  if (books.length === 0) {
    return <EmptyState />;
  }

  return (
    <div className="space-y-6">
      {/* Page title */}
      <h1 className="text-2xl font-bold" style={{ color: '#1a1a1a' }}>
        Dashboard
      </h1>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="stat-card">
          <div className="stat-label">Total Books</div>
          <div className="stat-number">{stats.total}</div>
        </div>

        <div className="stat-card">
          <div className="stat-label">Reading</div>
          <div className="stat-number">{stats.reading}</div>
        </div>

        <div className="stat-card">
          <div className="stat-label">Completed</div>
          <div className="stat-number">{stats.completed}</div>
        </div>

        <div className="stat-card">
          <div className="stat-label">To Read</div>
          <div className="stat-number">{stats.toRead}</div>
        </div>
      </div>

      {/* Books section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold" style={{ color: '#1a1a1a' }}>
            Your Books
          </h2>
          <div className="flex items-center gap-3">
            <select
              className="input py-1.5 text-sm w-auto"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">All Books</option>
              <option value="reading">Reading</option>
              <option value="unread">To Read</option>
              <option value="completed">Completed</option>
              <option value="dnf">DNF</option>
            </select>
            <Link
              href="/books/add"
              className="btn btn-primary text-sm"
            >
              + Add Book
            </Link>
          </div>
        </div>

        {filteredBooks.length === 0 ? (
          <div className="card p-8 text-center">
            <BookOpen className="h-10 w-10 mx-auto mb-3" style={{ color: '#999' }} />
            <p className="text-sm" style={{ color: '#666' }}>No books match your filter</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredBooks.map((book, index) => (
              <BookCard key={book.id} book={book} colorIndex={index} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { getBooks, bulkUpdateBooks, bulkDeleteBooks } from '@/lib/api';
import {
  BookOpen,
  Star,
  Loader2,
  LayoutGrid,
  List,
  Check,
  X,
  Trash2,
  Search,
} from 'lucide-react';
import type { Book } from '@/lib/types';

const statusConfig: Record<string, { label: string }> = {
  unread: { label: 'To Read' },
  reading: { label: 'Reading' },
  completed: { label: 'Completed' },
  dnf: { label: 'DNF' },
};

const pastelColors = ['#fff8e1', '#fce4ec', '#e8f5e9', '#e3f2fd', '#ede7f6', '#fff3e0'];

interface BookCardProps {
  book: Book;
  colorIndex: number;
  isSelected: boolean;
  onToggleSelect: (id: number) => void;
}

function BookCard({ book, colorIndex, isSelected, onToggleSelect }: BookCardProps) {
  const bgColor = pastelColors[colorIndex % pastelColors.length];
  const status = statusConfig[book.reading_status];

  return (
    <div className="book-card block relative">
      {/* Checkbox */}
      <button
        onClick={(e) => {
          e.preventDefault();
          onToggleSelect(book.id);
        }}
        className={`absolute top-2 left-2 z-10 w-5 h-5 rounded border flex items-center justify-center transition-colors ${
          isSelected
            ? 'bg-[#1a1a1a] border-[#1a1a1a]'
            : 'bg-white border-[#1a1a1a] hover:bg-gray-100'
        }`}
      >
        {isSelected && <Check className="h-3 w-3 text-white" />}
      </button>

      <Link href={`/books/${book.id}`}>
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
    </div>
  );
}

interface BookListItemProps {
  book: Book;
  isSelected: boolean;
  onToggleSelect: (id: number) => void;
}

function BookListItem({ book, isSelected, onToggleSelect }: BookListItemProps) {
  const status = statusConfig[book.reading_status];

  return (
    <div className="book-list-item flex items-center gap-4 p-4">
      {/* Checkbox */}
      <button
        onClick={(e) => {
          e.preventDefault();
          onToggleSelect(book.id);
        }}
        className={`w-5 h-5 rounded border flex-shrink-0 flex items-center justify-center transition-colors ${
          isSelected
            ? 'bg-[#1a1a1a] border-[#1a1a1a]'
            : 'bg-white border-[#1a1a1a] hover:bg-gray-100'
        }`}
      >
        {isSelected && <Check className="h-3 w-3 text-white" />}
      </button>

      <Link href={`/books/${book.id}`} className="flex items-center gap-4 flex-1 min-w-0">
        {/* Cover thumbnail */}
        <div className="w-12 h-16 flex-shrink-0 rounded overflow-hidden bg-gray-100 flex items-center justify-center">
          {book.cover_url ? (
            <img
              src={book.cover_url}
              alt=""
              className="w-full h-full object-cover"
            />
          ) : (
            <BookOpen className="h-5 w-5" style={{ color: '#999' }} />
          )}
        </div>

        {/* Book info */}
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-sm truncate" style={{ color: '#1a1a1a' }}>
            {book.title}
          </h3>
          <p className="text-xs truncate" style={{ color: '#666' }}>
            {book.author}
          </p>
        </div>

        {/* Status and rating */}
        <div className="flex items-center gap-3 flex-shrink-0">
          <span className="badge text-xs">{status.label}</span>
          {book.rating && (
            <span className="flex items-center text-xs" style={{ color: '#1a1a1a' }}>
              <Star className="h-3 w-3 fill-current mr-0.5" />
              {book.rating}
            </span>
          )}
        </div>
      </Link>
    </div>
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

interface BulkActionsBarProps {
  selectedCount: number;
  onClearSelection: () => void;
  onMarkAs: (status: string) => void;
  onDelete: () => void;
  isLoading: boolean;
}

function BulkActionsBar({ selectedCount, onClearSelection, onMarkAs, onDelete, isLoading }: BulkActionsBarProps) {
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
      <div className="card flex items-center gap-3 px-4 py-3 shadow-lg" style={{ boxShadow: '4px 4px 0 #1a1a1a' }}>
        <span className="text-sm font-semibold" style={{ color: '#1a1a1a' }}>
          {selectedCount} selected
        </span>
        <div className="w-px h-6 bg-gray-300" />
        <button
          onClick={() => onMarkAs('completed')}
          disabled={isLoading}
          className="btn text-xs py-1.5 px-3"
        >
          Mark Completed
        </button>
        <button
          onClick={() => onMarkAs('reading')}
          disabled={isLoading}
          className="btn text-xs py-1.5 px-3"
        >
          Mark Reading
        </button>
        <button
          onClick={() => onMarkAs('unread')}
          disabled={isLoading}
          className="btn text-xs py-1.5 px-3"
        >
          Mark To Read
        </button>
        <div className="w-px h-6 bg-gray-300" />
        <button
          onClick={onDelete}
          disabled={isLoading}
          className="btn btn-danger text-xs py-1.5 px-3"
        >
          <Trash2 className="h-3 w-3 mr-1" />
          Delete
        </button>
        <button
          onClick={onClearSelection}
          className="p-1.5 rounded hover:bg-gray-100 transition-colors"
          title="Clear selection"
        >
          <X className="h-4 w-4" style={{ color: '#666' }} />
        </button>
      </div>
    </div>
  );
}

export default function HomePage() {
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [titleFilter, setTitleFilter] = useState<string>('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  const queryClient = useQueryClient();

  const { data: books = [], isLoading } = useQuery({
    queryKey: ['books'],
    queryFn: () => getBooks(),
  });

  const bulkUpdateMutation = useMutation({
    mutationFn: ({ ids, status }: { ids: number[]; status: string }) =>
      bulkUpdateBooks(ids, { reading_status: status as 'unread' | 'reading' | 'completed' | 'dnf' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['books'] });
      setSelectedIds(new Set());
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: (ids: number[]) => bulkDeleteBooks(ids),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['books'] });
      setSelectedIds(new Set());
    },
  });

  const filteredBooks = books.filter((book) => {
    const matchesStatus = !statusFilter || book.reading_status === statusFilter;
    const matchesTitle = !titleFilter || book.title.toLowerCase().includes(titleFilter.toLowerCase());
    return matchesStatus && matchesTitle;
  });

  const stats = {
    total: books.length,
    reading: books.filter((b) => b.reading_status === 'reading').length,
    completed: books.filter((b) => b.reading_status === 'completed').length,
    toRead: books.filter((b) => b.reading_status === 'unread').length,
  };

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredBooks.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredBooks.map((b) => b.id)));
    }
  };

  const handleBulkMarkAs = (status: string) => {
    bulkUpdateMutation.mutate({ ids: Array.from(selectedIds), status });
  };

  const handleBulkDelete = () => {
    if (confirm(`Are you sure you want to delete ${selectedIds.size} book(s)?`)) {
      bulkDeleteMutation.mutate(Array.from(selectedIds));
    }
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

  const isActionLoading = bulkUpdateMutation.isPending || bulkDeleteMutation.isPending;

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
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-bold" style={{ color: '#1a1a1a' }}>
              Your Books
            </h2>
            {filteredBooks.length > 0 && (
              <button
                onClick={toggleSelectAll}
                className="text-xs underline"
                style={{ color: '#666' }}
              >
                {selectedIds.size === filteredBooks.length ? 'Deselect all' : 'Select all'}
              </button>
            )}
          </div>
          <div className="flex items-center gap-3">
            {/* Title search */}
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: '#999' }} />
              <input
                type="text"
                placeholder="Filter by title..."
                value={titleFilter}
                onChange={(e) => setTitleFilter(e.target.value)}
                className="input py-1.5 pl-8 pr-3 text-sm w-48"
              />
            </div>
            {/* View toggle */}
            <div className="flex items-center border rounded-lg overflow-hidden" style={{ borderColor: '#1a1a1a' }}>
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 transition-colors ${viewMode === 'grid' ? 'bg-gray-100' : 'hover:bg-gray-50'}`}
                title="Grid view"
              >
                <LayoutGrid className="h-4 w-4" style={{ color: viewMode === 'grid' ? '#1a1a1a' : '#999' }} />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 transition-colors ${viewMode === 'list' ? 'bg-gray-100' : 'hover:bg-gray-50'}`}
                title="List view"
              >
                <List className="h-4 w-4" style={{ color: viewMode === 'list' ? '#1a1a1a' : '#999' }} />
              </button>
            </div>
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
        ) : viewMode === 'grid' ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredBooks.map((book, index) => (
              <BookCard
                key={book.id}
                book={book}
                colorIndex={index}
                isSelected={selectedIds.has(book.id)}
                onToggleSelect={toggleSelect}
              />
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {filteredBooks.map((book) => (
              <BookListItem
                key={book.id}
                book={book}
                isSelected={selectedIds.has(book.id)}
                onToggleSelect={toggleSelect}
              />
            ))}
          </div>
        )}
      </div>

      {/* Bulk Actions Bar */}
      {selectedIds.size > 0 && (
        <BulkActionsBar
          selectedCount={selectedIds.size}
          onClearSelection={() => setSelectedIds(new Set())}
          onMarkAs={handleBulkMarkAs}
          onDelete={handleBulkDelete}
          isLoading={isActionLoading}
        />
      )}
    </div>
  );
}

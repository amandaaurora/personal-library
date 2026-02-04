'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Edit,
  Trash2,
  BookOpen,
  Calendar,
  Star,
  Loader2,
  Sparkles,
} from 'lucide-react';
import { getBook, deleteBook, categorizeBook } from '@/lib/api';

const statusConfig: Record<string, { label: string }> = {
  unread: { label: 'To Read' },
  reading: { label: 'Reading' },
  completed: { label: 'Completed' },
  dnf: { label: 'Did Not Finish' },
};

const pastelColors = ['#fff8e1', '#fce4ec', '#e8f5e9', '#e3f2fd', '#ede7f6', '#fff3e0'];

export default function BookDetailPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const bookId = parseInt(params.id as string);

  const { data: book, isLoading, error } = useQuery({
    queryKey: ['book', bookId],
    queryFn: () => getBook(bookId),
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteBook(bookId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['books'] });
      router.push('/');
    },
  });

  const categorizeMutation = useMutation({
    mutationFn: () => categorizeBook(bookId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['book', bookId] });
      queryClient.invalidateQueries({ queryKey: ['books'] });
    },
  });

  const handleDelete = () => {
    if (confirm('Are you sure you want to delete this book?')) {
      deleteMutation.mutate();
    }
  };

  const handleCategorize = () => {
    categorizeMutation.mutate();
  };

  if (isLoading) {
    return (
      <div className="h-full flex justify-center items-center">
        <Loader2 className="h-8 w-8 animate-spin" style={{ color: '#666' }} />
      </div>
    );
  }

  if (error || !book) {
    return (
      <div className="h-full flex flex-col items-center justify-center">
        <div className="card p-12 text-center">
          <BookOpen className="h-12 w-12 mx-auto mb-4" style={{ color: '#999' }} />
          <h2 className="text-lg font-bold mb-4" style={{ color: '#1a1a1a' }}>
            Book not found
          </h2>
          <Link href="/" className="btn btn-primary">
            Back to Library
          </Link>
        </div>
      </div>
    );
  }

  const status = statusConfig[book.reading_status];
  const bgColor = pastelColors[book.id % pastelColors.length];

  return (
    <div className="max-w-4xl mx-auto">
      {/* Back link */}
      <Link
        href="/"
        className="inline-flex items-center mb-6 text-sm font-medium"
        style={{ color: '#666' }}
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Library
      </Link>

      <div className="card overflow-hidden">
        {/* Header with cover */}
        <div className="flex flex-col md:flex-row">
          {/* Cover area */}
          <div
            className="md:w-64 flex-shrink-0 p-8 flex items-center justify-center"
            style={{ backgroundColor: bgColor }}
          >
            {book.cover_url ? (
              <img
                src={book.cover_url}
                alt={book.title}
                className="max-w-full max-h-64 object-contain rounded"
              />
            ) : (
              <div
                className="w-32 h-48 rounded flex items-center justify-center border"
                style={{ backgroundColor: '#ffffff', borderColor: '#1a1a1a' }}
              >
                <BookOpen className="h-12 w-12" style={{ color: '#999' }} />
              </div>
            )}
          </div>

          {/* Book info */}
          <div className="flex-1 p-6">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <h1 className="text-2xl font-bold mb-1" style={{ color: '#1a1a1a' }}>
                  {book.title}
                </h1>
                <p className="text-lg" style={{ color: '#666' }}>{book.author}</p>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <Link
                  href={`/books/${book.id}/edit`}
                  className="btn btn-secondary"
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Link>
                <button
                  onClick={handleDelete}
                  disabled={deleteMutation.isPending}
                  className="btn btn-danger"
                >
                  {deleteMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Tags */}
            <div className="flex flex-wrap gap-2 mb-6">
              <span className="badge">{status.label}</span>
              <span className="badge badge-format">{book.format}</span>
              {book.rating && (
                <span className="badge flex items-center">
                  <Star className="h-3 w-3 mr-1 fill-current" />
                  {book.rating}/5
                </span>
              )}
              {book.page_count && (
                <span className="badge">{book.page_count} pages</span>
              )}
            </div>

            {/* Categories & Moods */}
            <div className="mb-6">
              {book.categories.length > 0 && (
                <div className="mb-3">
                  <div className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: '#999' }}>
                    Categories
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {book.categories.map((cat) => (
                      <span key={cat} className="badge badge-category">
                        {cat}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {book.moods.length > 0 && (
                <div className="mb-3">
                  <div className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: '#999' }}>
                    Moods
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {book.moods.map((mood) => (
                      <span key={mood} className="badge badge-mood">
                        {mood}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {/* AI Categorize Button */}
              <button
                onClick={handleCategorize}
                disabled={categorizeMutation.isPending}
                className="btn text-sm mt-2"
                style={{ backgroundColor: '#ede9fe', borderColor: '#1a1a1a', color: '#7c3aed' }}
              >
                {categorizeMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Categorizing...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    {book.categories.length > 0 || book.moods.length > 0
                      ? 'Re-categorize with AI'
                      : 'Categorize with AI'}
                  </>
                )}
              </button>
              {categorizeMutation.isError && (
                <p className="text-xs mt-2" style={{ color: '#dc2626' }}>
                  {categorizeMutation.error?.message || 'Failed to categorize'}
                </p>
              )}
            </div>

            {/* Dates */}
            {(book.purchase_date || book.date_started || book.date_finished) && (
              <div className="flex flex-wrap gap-4 text-sm" style={{ color: '#666' }}>
                {book.purchase_date && (
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    <span>Purchased: {book.purchase_date}</span>
                  </div>
                )}
                {book.date_started && (
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    <span>Started: {book.date_started}</span>
                  </div>
                )}
                {book.date_finished && (
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    <span>Finished: {book.date_finished}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Description */}
        {book.description && (
          <div className="p-6 border-t" style={{ borderColor: '#1a1a1a' }}>
            <div className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: '#999' }}>
              Description
            </div>
            <p className="text-sm leading-relaxed" style={{ color: '#666' }}>
              {book.description}
            </p>
          </div>
        )}

        {/* Notes */}
        {book.notes && (
          <div className="p-6 border-t" style={{ borderColor: '#1a1a1a' }}>
            <div className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: '#999' }}>
              Notes
            </div>
            <div
              className="p-4 rounded-lg text-sm whitespace-pre-wrap border"
              style={{ backgroundColor: '#faf6fc', color: '#666', borderColor: '#e5e5e5' }}
            >
              {book.notes}
            </div>
          </div>
        )}

        {/* Metadata */}
        <div className="p-6 border-t text-xs" style={{ borderColor: '#1a1a1a', color: '#999' }}>
          {book.isbn && <span className="mr-4">ISBN: {book.isbn}</span>}
          <span className="mr-4">Added: {new Date(book.created_at).toLocaleDateString()}</span>
          <span>Updated: {new Date(book.updated_at).toLocaleDateString()}</span>
        </div>
      </div>
    </div>
  );
}

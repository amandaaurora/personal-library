'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { getDuplicates, deleteBook } from '@/lib/api';
import { BookOpen, Loader2, Trash2, ExternalLink, AlertTriangle } from 'lucide-react';
import type { Book, DuplicateGroup } from '@/lib/types';

function BookRow({ book, onDelete, isDeleting }: { book: Book; onDelete: (id: number) => void; isDeleting: boolean }) {
  return (
    <div className="flex items-center gap-4 p-3 border-b last:border-b-0" style={{ borderColor: '#e5e5e5' }}>
      {/* Cover thumbnail */}
      <div className="w-10 h-14 flex-shrink-0 rounded overflow-hidden bg-gray-100 flex items-center justify-center">
        {book.cover_url ? (
          <img src={book.cover_url} alt="" className="w-full h-full object-cover" />
        ) : (
          <BookOpen className="h-4 w-4" style={{ color: '#999' }} />
        )}
      </div>

      {/* Book info */}
      <div className="flex-1 min-w-0">
        <h4 className="font-semibold text-sm truncate" style={{ color: '#1a1a1a' }}>
          {book.title}
        </h4>
        <p className="text-xs truncate" style={{ color: '#666' }}>
          {book.author}
        </p>
        <div className="flex items-center gap-2 mt-1">
          {book.isbn && (
            <span className="text-xs" style={{ color: '#999' }}>
              ISBN: {book.isbn}
            </span>
          )}
          <span className="badge text-xs">{book.reading_status}</span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <Link
          href={`/books/${book.id}`}
          className="btn text-xs py-1 px-2"
          title="View book"
        >
          <ExternalLink className="h-3 w-3" />
        </Link>
        <button
          onClick={() => onDelete(book.id)}
          disabled={isDeleting}
          className="btn btn-danger text-xs py-1 px-2"
          title="Delete this copy"
        >
          <Trash2 className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}

function DuplicateGroupCard({
  group,
  onDelete,
  deletingId,
}: {
  group: DuplicateGroup;
  onDelete: (id: number) => void;
  deletingId: number | null;
}) {
  return (
    <div className="card overflow-hidden">
      <div className="px-4 py-3 border-b" style={{ borderColor: '#1a1a1a', backgroundColor: '#faf6fc' }}>
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4" style={{ color: '#f59e0b' }} />
          <span className="text-sm font-semibold" style={{ color: '#1a1a1a' }}>
            {group.books.length} copies found
          </span>
          <span className="text-xs" style={{ color: '#666' }}>
            ({group.key})
          </span>
        </div>
      </div>
      <div>
        {group.books.map((book) => (
          <BookRow
            key={book.id}
            book={book}
            onDelete={onDelete}
            isDeleting={deletingId === book.id}
          />
        ))}
      </div>
    </div>
  );
}

export default function DuplicatesPage() {
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ['duplicates'],
    queryFn: getDuplicates,
  });

  const deleteMutation = useMutation({
    mutationFn: deleteBook,
    onMutate: (id) => {
      setDeletingId(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['duplicates'] });
      queryClient.invalidateQueries({ queryKey: ['books'] });
    },
    onSettled: () => {
      setDeletingId(null);
    },
  });

  const handleDelete = (id: number) => {
    if (confirm('Are you sure you want to delete this book?')) {
      deleteMutation.mutate(id);
    }
  };

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" style={{ color: '#666' }} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="card p-8 text-center">
        <p className="text-sm" style={{ color: '#dc2626' }}>
          Failed to load duplicates. Please try again.
        </p>
      </div>
    );
  }

  const { duplicate_groups, total_duplicates } = data || { duplicate_groups: [], total_duplicates: 0 };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: '#1a1a1a' }}>
          Duplicate Books
        </h1>
        <p className="text-sm mt-1" style={{ color: '#666' }}>
          Find and remove duplicate entries based on title, author, or ISBN.
        </p>
      </div>

      {/* Stats */}
      <div className="stat-card inline-block">
        <div className="stat-label">Duplicates Found</div>
        <div className="stat-number">{total_duplicates}</div>
      </div>

      {/* Duplicate groups */}
      {duplicate_groups.length === 0 ? (
        <div className="card p-8 text-center">
          <BookOpen className="h-10 w-10 mx-auto mb-3" style={{ color: '#999' }} />
          <h3 className="font-semibold mb-1" style={{ color: '#1a1a1a' }}>
            No duplicates found
          </h3>
          <p className="text-sm" style={{ color: '#666' }}>
            Your library is clean! No duplicate books were detected.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {duplicate_groups.map((group, index) => (
            <DuplicateGroupCard
              key={index}
              group={group}
              onDelete={handleDelete}
              deletingId={deletingId}
            />
          ))}
        </div>
      )}
    </div>
  );
}

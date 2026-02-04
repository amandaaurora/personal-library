'use client';

import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { Search, Loader2 } from 'lucide-react';
import { getConfig, lookupBook, createBook, updateBook } from '@/lib/api';
import type { Book, BookCreate, BookUpdate } from '@/lib/types';

interface BookFormProps {
  book?: Book;
  onSuccess?: () => void;
}

export default function BookForm({ book, onSuccess }: BookFormProps) {
  const router = useRouter();
  const isEditing = !!book;

  const { data: config } = useQuery({
    queryKey: ['config'],
    queryFn: getConfig,
  });

  const [isbn, setIsbn] = useState('');
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [lookupError, setLookupError] = useState('');

  const [formData, setFormData] = useState<BookCreate>({
    title: book?.title || '',
    author: book?.author || '',
    isbn: book?.isbn || '',
    description: book?.description || '',
    format: book?.format || 'kindle',
    reading_status: book?.reading_status || 'unread',
    purchase_date: book?.purchase_date || '',
    date_started: book?.date_started || '',
    date_finished: book?.date_finished || '',
    rating: book?.rating || undefined,
    notes: book?.notes || '',
    cover_url: book?.cover_url || '',
    page_count: book?.page_count || undefined,
    categories: book?.categories || [],
    moods: book?.moods || [],
  });

  const createMutation = useMutation({
    mutationFn: (data: BookCreate) => createBook(data),
    onSuccess: () => {
      router.push('/');
      onSuccess?.();
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: BookUpdate) => updateBook(book!.id, data),
    onSuccess: () => {
      router.push(`/books/${book!.id}`);
      onSuccess?.();
    },
  });

  const handleLookup = async () => {
    if (!isbn.trim()) return;

    setIsLookingUp(true);
    setLookupError('');

    try {
      const data = await lookupBook(isbn.trim());
      setFormData((prev) => ({
        ...prev,
        title: data.title,
        author: data.author,
        isbn: data.isbn,
        description: data.description || prev.description,
        cover_url: data.cover_url || prev.cover_url,
        page_count: data.page_count || prev.page_count,
      }));
    } catch {
      setLookupError('Book not found. Try entering details manually.');
    } finally {
      setIsLookingUp(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const data = {
      ...formData,
      rating: formData.rating || undefined,
      page_count: formData.page_count || undefined,
      purchase_date: formData.purchase_date || undefined,
      date_started: formData.date_started || undefined,
      date_finished: formData.date_finished || undefined,
    };

    if (isEditing) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  const toggleCategory = (cat: string) => {
    setFormData((prev) => ({
      ...prev,
      categories: prev.categories?.includes(cat)
        ? prev.categories.filter((c) => c !== cat)
        : [...(prev.categories || []), cat],
    }));
  };

  const toggleMood = (mood: string) => {
    setFormData((prev) => ({
      ...prev,
      moods: prev.moods?.includes(mood)
        ? prev.moods.filter((m) => m !== mood)
        : [...(prev.moods || []), mood],
    }));
  };

  const isSubmitting = createMutation.isPending || updateMutation.isPending;
  const error = createMutation.error || updateMutation.error;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* ISBN Lookup */}
      {!isEditing && (
        <div
          className="p-4 rounded-lg"
          style={{ backgroundColor: '#ede9fe' }}
        >
          <label className="label" style={{ color: '#7c3aed' }}>Quick Add by ISBN</label>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Enter ISBN (e.g., 9780441172719)"
              className="input flex-1"
              value={isbn}
              onChange={(e) => setIsbn(e.target.value)}
            />
            <button
              type="button"
              onClick={handleLookup}
              disabled={isLookingUp || !isbn.trim()}
              className="btn btn-primary flex items-center"
            >
              {isLookingUp ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Search className="h-4 w-4" />
              )}
              <span className="ml-2">Lookup</span>
            </button>
          </div>
          {lookupError && (
            <p className="text-sm mt-2" style={{ color: '#dc2626' }}>{lookupError}</p>
          )}
        </div>
      )}

      {/* Basic Info */}
      <div>
        <div className="text-xs font-medium uppercase tracking-wider mb-4" style={{ color: '#9ca3af' }}>
          Book Details
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="label">Title *</label>
            <input
              type="text"
              required
              className="input"
              value={formData.title}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, title: e.target.value }))
              }
            />
          </div>
          <div>
            <label className="label">Author *</label>
            <input
              type="text"
              required
              className="input"
              value={formData.author}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, author: e.target.value }))
              }
            />
          </div>
          <div>
            <label className="label">Format *</label>
            <select
              required
              className="input"
              value={formData.format}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, format: e.target.value as any }))
              }
            >
              {config?.formats.map((format) => (
                <option key={format} value={format}>
                  {format}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Reading Status</label>
            <select
              className="input"
              value={formData.reading_status}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  reading_status: e.target.value as any,
                }))
              }
            >
              <option value="unread">To Read</option>
              <option value="reading">Reading</option>
              <option value="completed">Completed</option>
              <option value="dnf">DNF</option>
            </select>
          </div>
          <div>
            <label className="label">ISBN</label>
            <input
              type="text"
              className="input"
              value={formData.isbn || ''}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, isbn: e.target.value }))
              }
            />
          </div>
          <div>
            <label className="label">Page Count</label>
            <input
              type="number"
              min="1"
              className="input"
              value={formData.page_count || ''}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  page_count: e.target.value ? parseInt(e.target.value) : undefined,
                }))
              }
            />
          </div>
          <div>
            <label className="label">Cover URL</label>
            <input
              type="url"
              className="input"
              placeholder="https://..."
              value={formData.cover_url || ''}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, cover_url: e.target.value }))
              }
            />
          </div>
          <div>
            <label className="label">Rating (1-5)</label>
            <select
              className="input"
              value={formData.rating || ''}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  rating: e.target.value ? parseInt(e.target.value) : undefined,
                }))
              }
            >
              <option value="">No rating</option>
              {[1, 2, 3, 4, 5].map((n) => (
                <option key={n} value={n}>
                  {n} star{n > 1 ? 's' : ''}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-4">
          <label className="label">Description</label>
          <textarea
            rows={3}
            className="input"
            value={formData.description || ''}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, description: e.target.value }))
            }
          />
        </div>
      </div>

      {/* Dates */}
      <div>
        <div className="text-xs font-medium uppercase tracking-wider mb-4" style={{ color: '#9ca3af' }}>
          Dates
        </div>
        <div className="grid md:grid-cols-3 gap-4">
          <div>
            <label className="label">Purchase Date</label>
            <input
              type="date"
              className="input"
              value={formData.purchase_date || ''}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, purchase_date: e.target.value }))
              }
            />
          </div>
          <div>
            <label className="label">Date Started</label>
            <input
              type="date"
              className="input"
              value={formData.date_started || ''}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, date_started: e.target.value }))
              }
            />
          </div>
          <div>
            <label className="label">Date Finished</label>
            <input
              type="date"
              className="input"
              value={formData.date_finished || ''}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, date_finished: e.target.value }))
              }
            />
          </div>
        </div>
      </div>

      {/* Categories */}
      <div>
        <div className="text-xs font-medium uppercase tracking-wider mb-2" style={{ color: '#9ca3af' }}>
          Categories
        </div>
        <p className="text-xs mb-3" style={{ color: '#6b7280' }}>
          {isEditing
            ? 'Select categories that describe this book.'
            : 'Select categories or leave empty for AI auto-categorization.'}
        </p>
        <div className="flex flex-wrap gap-2">
          {config?.categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => toggleCategory(cat)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
              style={{
                backgroundColor: formData.categories?.includes(cat) ? '#d1fae5' : '#f3f4f6',
                color: formData.categories?.includes(cat) ? '#10b981' : '#6b7280',
              }}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Moods */}
      <div>
        <div className="text-xs font-medium uppercase tracking-wider mb-2" style={{ color: '#9ca3af' }}>
          Moods
        </div>
        <p className="text-xs mb-3" style={{ color: '#6b7280' }}>
          {isEditing
            ? 'Select moods that describe the reading experience.'
            : 'Select moods or leave empty for AI auto-suggestion.'}
        </p>
        <div className="flex flex-wrap gap-2">
          {config?.moods.map((mood) => (
            <button
              key={mood}
              type="button"
              onClick={() => toggleMood(mood)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
              style={{
                backgroundColor: formData.moods?.includes(mood) ? '#ede9fe' : '#f3f4f6',
                color: formData.moods?.includes(mood) ? '#8b5cf6' : '#6b7280',
              }}
            >
              {mood}
            </button>
          ))}
        </div>
      </div>

      {/* Notes */}
      <div>
        <div className="text-xs font-medium uppercase tracking-wider mb-2" style={{ color: '#9ca3af' }}>
          Notes
        </div>
        <textarea
          rows={4}
          className="input"
          placeholder="Your personal notes about this book..."
          value={formData.notes || ''}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, notes: e.target.value }))
          }
        />
      </div>

      {/* Error */}
      {error && (
        <div
          className="p-4 rounded-lg text-sm"
          style={{ backgroundColor: '#fef2f2', color: '#dc2626' }}
        >
          {error.message}
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-4 border-t" style={{ borderColor: '#e5e7eb' }}>
        <button
          type="button"
          onClick={() => router.back()}
          className="btn btn-secondary"
        >
          Cancel
        </button>
        <button type="submit" disabled={isSubmitting} className="btn btn-primary">
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              {isEditing ? 'Saving...' : 'Adding...'}
            </>
          ) : isEditing ? (
            'Save Changes'
          ) : (
            'Add Book'
          )}
        </button>
      </div>
    </form>
  );
}

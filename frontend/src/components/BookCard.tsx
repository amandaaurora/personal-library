'use client';

import Link from 'next/link';
import { BookOpen, Star } from 'lucide-react';
import type { Book } from '@/lib/types';

interface BookCardProps {
  book: Book;
}

const statusColors: Record<string, string> = {
  unread: 'bg-gray-100 text-gray-800',
  reading: 'bg-yellow-100 text-yellow-800',
  completed: 'bg-green-100 text-green-800',
  dnf: 'bg-red-100 text-red-800',
};

const statusLabels: Record<string, string> = {
  unread: 'To Read',
  reading: 'Reading',
  completed: 'Completed',
  dnf: 'DNF',
};

export default function BookCard({ book }: BookCardProps) {
  return (
    <Link
      href={`/books/${book.id}`}
      className="card hover:shadow-md transition-shadow group"
    >
      <div className="flex">
        {/* Cover */}
        <div className="w-24 sm:w-32 flex-shrink-0">
          <div className="aspect-[2/3] bg-gray-100 flex items-center justify-center overflow-hidden">
            {book.cover_url ? (
              <img
                src={book.cover_url}
                alt={book.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <BookOpen className="h-10 w-10 text-gray-400" />
            )}
          </div>
        </div>

        {/* Details */}
        <div className="flex-1 p-4 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="font-semibold text-gray-900 truncate group-hover:text-indigo-600 transition-colors">
                {book.title}
              </h3>
              <p className="text-sm text-gray-600">{book.author}</p>
            </div>
            {book.rating && (
              <div className="flex items-center text-yellow-500 flex-shrink-0">
                <Star className="h-4 w-4 fill-current" />
                <span className="ml-1 text-sm font-medium">{book.rating}</span>
              </div>
            )}
          </div>

          {/* Status and Format */}
          <div className="mt-2 flex flex-wrap gap-1.5">
            <span className={`badge ${statusColors[book.reading_status]}`}>
              {statusLabels[book.reading_status]}
            </span>
            <span className="badge badge-format">{book.format}</span>
          </div>

          {/* Categories */}
          {book.categories.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {book.categories.slice(0, 3).map((cat) => (
                <span key={cat} className="badge badge-category">
                  {cat}
                </span>
              ))}
              {book.categories.length > 3 && (
                <span className="badge badge-category">
                  +{book.categories.length - 3}
                </span>
              )}
            </div>
          )}

          {/* Moods */}
          {book.moods.length > 0 && (
            <div className="mt-1.5 flex flex-wrap gap-1">
              {book.moods.slice(0, 2).map((mood) => (
                <span key={mood} className="badge badge-mood">
                  {mood}
                </span>
              ))}
              {book.moods.length > 2 && (
                <span className="badge badge-mood">
                  +{book.moods.length - 2}
                </span>
              )}
            </div>
          )}

          {/* Description preview */}
          {book.description && (
            <p className="mt-2 text-sm text-gray-500 line-clamp-2">
              {book.description}
            </p>
          )}
        </div>
      </div>
    </Link>
  );
}

'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, BookOpen, Loader2 } from 'lucide-react';
import { getBook } from '@/lib/api';
import BookForm from '@/components/BookForm';

export default function EditBookPage() {
  const params = useParams();
  const queryClient = useQueryClient();
  const bookId = parseInt(params.id as string);

  const { data: book, isLoading, error } = useQuery({
    queryKey: ['book', bookId],
    queryFn: () => getBook(bookId),
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (error || !book) {
    return (
      <div className="text-center py-12">
        <BookOpen className="h-16 w-16 text-gray-400 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          Book not found
        </h2>
        <Link href="/books" className="btn btn-primary">
          Back to Library
        </Link>
      </div>
    );
  }

  return (
    <div>
      <Link
        href={`/books/${bookId}`}
        className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-6"
      >
        <ArrowLeft className="h-4 w-4 mr-1" />
        Back to Book
      </Link>

      <h1 className="text-2xl font-bold text-gray-900 mb-6">Edit Book</h1>

      <BookForm
        book={book}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['book', bookId] });
          queryClient.invalidateQueries({ queryKey: ['books'] });
        }}
      />
    </div>
  );
}

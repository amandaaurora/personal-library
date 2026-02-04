'use client';

import BookForm from '@/components/BookForm';

export default function AddBookPage() {
  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-2xl font-semibold mb-6" style={{ color: '#1f2937' }}>
        Add a Book
      </h1>
      <div className="card p-6">
        <BookForm />
      </div>
    </div>
  );
}

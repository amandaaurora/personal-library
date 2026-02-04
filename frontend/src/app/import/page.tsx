'use client';

import CSVImporter from '@/components/CSVImporter';
import { Upload } from 'lucide-react';

export default function ImportPage() {
  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <Upload className="h-5 w-5" style={{ color: '#3b82f6' }} />
          <h1 className="text-2xl font-semibold" style={{ color: '#1f2937' }}>
            Import Books
          </h1>
        </div>
        <p className="text-sm" style={{ color: '#6b7280' }}>
          Import your book collection from a CSV file. The file should include columns for title, author, and format.
        </p>
      </div>
      <div className="card p-6">
        <CSVImporter />
      </div>
    </div>
  );
}

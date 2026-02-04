'use client';

import SearchInterface from '@/components/SearchInterface';
import { Sparkles } from 'lucide-react';

export default function SearchPage() {
  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="h-5 w-5" style={{ color: '#8b5cf6' }} />
          <h1 className="text-2xl font-semibold" style={{ color: '#1f2937' }}>
            AI-Powered Search
          </h1>
        </div>
        <p className="text-sm" style={{ color: '#6b7280' }}>
          Ask natural language questions about your library. Try "What should I read if I'm feeling adventurous?" or "Find me a thought-provoking sci-fi book."
        </p>
      </div>
      <div className="card p-6">
        <SearchInterface />
      </div>
    </div>
  );
}

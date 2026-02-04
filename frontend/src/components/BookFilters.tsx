'use client';

import { useQuery } from '@tanstack/react-query';
import { X } from 'lucide-react';
import { getConfig } from '@/lib/api';
import type { BookFilters as BookFiltersType } from '@/lib/types';

interface BookFiltersProps {
  filters: BookFiltersType;
  onChange: (filters: BookFiltersType) => void;
}

export default function BookFilters({ filters, onChange }: BookFiltersProps) {
  const { data: config } = useQuery({
    queryKey: ['config'],
    queryFn: getConfig,
  });

  const updateFilter = (key: keyof BookFiltersType, value: string) => {
    onChange({
      ...filters,
      [key]: value || undefined,
    });
  };

  const clearFilters = () => {
    onChange({});
  };

  const hasFilters = Object.values(filters).some((v) => v);

  return (
    <div className="card p-4 mb-6">
      <div className="flex flex-wrap gap-4">
        {/* Search */}
        <div className="flex-1 min-w-[200px]">
          <input
            type="text"
            placeholder="Search title, author, description..."
            className="input"
            value={filters.search || ''}
            onChange={(e) => updateFilter('search', e.target.value)}
          />
        </div>

        {/* Category */}
        <select
          className="input w-auto"
          value={filters.category || ''}
          onChange={(e) => updateFilter('category', e.target.value)}
        >
          <option value="">All Categories</option>
          {config?.categories.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>

        {/* Mood */}
        <select
          className="input w-auto"
          value={filters.mood || ''}
          onChange={(e) => updateFilter('mood', e.target.value)}
        >
          <option value="">All Moods</option>
          {config?.moods.map((mood) => (
            <option key={mood} value={mood}>
              {mood}
            </option>
          ))}
        </select>

        {/* Format */}
        <select
          className="input w-auto"
          value={filters.format || ''}
          onChange={(e) => updateFilter('format', e.target.value)}
        >
          <option value="">All Formats</option>
          {config?.formats.map((format) => (
            <option key={format} value={format}>
              {format}
            </option>
          ))}
        </select>

        {/* Status */}
        <select
          className="input w-auto"
          value={filters.reading_status || ''}
          onChange={(e) => updateFilter('reading_status', e.target.value)}
        >
          <option value="">All Statuses</option>
          <option value="unread">To Read</option>
          <option value="reading">Reading</option>
          <option value="completed">Completed</option>
          <option value="dnf">DNF</option>
        </select>

        {/* Clear */}
        {hasFilters && (
          <button
            onClick={clearFilters}
            className="btn btn-secondary flex items-center"
          >
            <X className="h-4 w-4 mr-1" />
            Clear
          </button>
        )}
      </div>
    </div>
  );
}

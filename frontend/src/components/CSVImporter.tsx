'use client';

import { useState, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Upload, FileText, Check, X, Loader2, Download } from 'lucide-react';
import { importCSV, getExportUrl } from '@/lib/api';
import type { ImportResult } from '@/lib/types';

export default function CSVImporter() {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [autoCategorize, setAutoCategorize] = useState(true);
  const [enrichMetadata, setEnrichMetadata] = useState(true);
  const [result, setResult] = useState<ImportResult | null>(null);

  const importMutation = useMutation({
    mutationFn: () => importCSV(file!, autoCategorize, enrichMetadata),
    onSuccess: (data) => {
      setResult(data);
      setFile(null);
      queryClient.invalidateQueries({ queryKey: ['books'] });
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setResult(null);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && droppedFile.name.endsWith('.csv')) {
      setFile(droppedFile);
      setResult(null);
    }
  };

  const handleImport = () => {
    if (file) {
      importMutation.mutate();
    }
  };

  return (
    <div className="space-y-6">
      {/* Instructions */}
      <div>
        <h2 className="text-lg font-bold mb-3" style={{ color: '#1a1a1a' }}>CSV Format</h2>
        <p className="text-sm mb-4" style={{ color: '#666' }}>
          Your CSV file should have a header row with these columns (title, author, format are required):
        </p>
        <div
          className="p-4 rounded-lg overflow-x-auto border"
          style={{ backgroundColor: '#faf6fc', borderColor: '#1a1a1a' }}
        >
          <code className="text-xs" style={{ color: '#1a1a1a' }}>
            title,author,format,isbn,description,reading_status,purchase_date,date_started,date_finished,rating,notes,cover_url,page_count,categories,moods
          </code>
        </div>
        <div className="mt-4 text-sm space-y-1" style={{ color: '#666' }}>
          <p><strong style={{ color: '#1a1a1a' }}>Required:</strong> title, author, format (kindle/physical/audiobook/pdf/epub)</p>
          <p><strong style={{ color: '#1a1a1a' }}>Optional:</strong> All other columns</p>
          <p><strong style={{ color: '#1a1a1a' }}>Dates:</strong> Use YYYY-MM-DD format</p>
          <p><strong style={{ color: '#1a1a1a' }}>Categories/Moods:</strong> Comma-separated within quotes (e.g., "sci-fi,classic")</p>
        </div>
        <div className="mt-4">
          <a
            href={getExportUrl()}
            download
            className="text-sm font-semibold inline-flex items-center"
            style={{ color: '#1a1a1a' }}
          >
            <Download className="h-4 w-4 mr-1" />
            Download example (export your current library)
          </a>
        </div>
      </div>

      {/* Upload Area */}
      <div
        className="card p-8 border-2 border-dashed cursor-pointer transition-all"
        style={{
          borderColor: file ? '#1a1a1a' : '#e5e5e5',
          backgroundColor: file ? '#e8f5e9' : '#fefffe',
        }}
        onClick={() => fileInputRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          className="hidden"
          onChange={handleFileChange}
        />
        <div className="text-center">
          {file ? (
            <>
              <FileText className="h-12 w-12 mx-auto mb-3" style={{ color: '#1a1a1a' }} />
              <p className="text-lg font-bold" style={{ color: '#1a1a1a' }}>{file.name}</p>
              <p className="text-sm" style={{ color: '#666' }}>
                {(file.size / 1024).toFixed(1)} KB
              </p>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setFile(null);
                }}
                className="mt-2 text-sm font-medium"
                style={{ color: '#dc2626' }}
              >
                Remove
              </button>
            </>
          ) : (
            <>
              <Upload className="h-12 w-12 mx-auto mb-3" style={{ color: '#999' }} />
              <p className="text-lg font-bold" style={{ color: '#1a1a1a' }}>
                Drop a CSV file here or click to browse
              </p>
              <p className="text-sm mt-1" style={{ color: '#666' }}>
                Only .csv files are accepted
              </p>
            </>
          )}
        </div>
      </div>

      {/* Options */}
      {file && (
        <div
          className="p-4 rounded-lg border space-y-3"
          style={{ backgroundColor: '#fefffe', borderColor: '#1a1a1a' }}
        >
          <label className="flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={enrichMetadata}
              onChange={(e) => setEnrichMetadata(e.target.checked)}
              className="w-4 h-4 rounded border-2"
              style={{ borderColor: '#1a1a1a', accentColor: '#1a1a1a' }}
            />
            <span className="ml-2 text-sm" style={{ color: '#666' }}>
              Fetch cover images & page counts from Open Library (for books missing this data)
            </span>
          </label>
          <label className="flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={autoCategorize}
              onChange={(e) => setAutoCategorize(e.target.checked)}
              className="w-4 h-4 rounded border-2"
              style={{ borderColor: '#1a1a1a', accentColor: '#1a1a1a' }}
            />
            <span className="ml-2 text-sm" style={{ color: '#666' }}>
              Auto-generate categories & moods with AI (requires Groq API key)
            </span>
          </label>
        </div>
      )}

      {/* Import Button */}
      {file && (
        <button
          onClick={handleImport}
          disabled={importMutation.isPending}
          className="btn btn-primary w-full flex items-center justify-center"
        >
          {importMutation.isPending ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
              Importing...
            </>
          ) : (
            <>
              <Upload className="h-5 w-5 mr-2" />
              Import Books
            </>
          )}
        </button>
      )}

      {/* Error */}
      {importMutation.error && (
        <div
          className="p-4 rounded-lg border text-sm"
          style={{ backgroundColor: '#fef2f2', borderColor: '#dc2626', color: '#dc2626' }}
        >
          Import failed: {importMutation.error.message}
        </div>
      )}

      {/* Results */}
      {result && (
        <div className="space-y-4">
          {/* Summary */}
          <div className="card p-6">
            <h3 className="text-lg font-bold mb-4" style={{ color: '#1a1a1a' }}>Import Complete</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center">
                <div
                  className="p-2 rounded-lg mr-3 border"
                  style={{ backgroundColor: '#e8f5e9', borderColor: '#1a1a1a' }}
                >
                  <Check className="h-5 w-5" style={{ color: '#1a1a1a' }} />
                </div>
                <div>
                  <div className="text-2xl font-bold" style={{ color: '#1a1a1a' }}>
                    {result.imported_count}
                  </div>
                  <div className="text-sm" style={{ color: '#666' }}>Books imported</div>
                </div>
              </div>
              {result.error_count > 0 && (
                <div className="flex items-center">
                  <div
                    className="p-2 rounded-lg mr-3 border"
                    style={{ backgroundColor: '#fef2f2', borderColor: '#dc2626' }}
                  >
                    <X className="h-5 w-5" style={{ color: '#dc2626' }} />
                  </div>
                  <div>
                    <div className="text-2xl font-bold" style={{ color: '#dc2626' }}>
                      {result.error_count}
                    </div>
                    <div className="text-sm" style={{ color: '#666' }}>Errors</div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Errors List */}
          {result.errors.length > 0 && (
            <div className="card p-6">
              <h4 className="font-bold mb-3" style={{ color: '#dc2626' }}>Import Errors</h4>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {result.errors.map((err, i) => (
                  <div key={i} className="text-sm" style={{ color: '#dc2626' }}>
                    Row {err.row}: {err.error}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Imported Books Preview */}
          {result.imported.length > 0 && (
            <div className="card p-6">
              <h4 className="font-bold mb-3" style={{ color: '#1a1a1a' }}>
                Recently Imported
              </h4>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {result.imported.slice(0, 10).map((book) => (
                  <div
                    key={book.id}
                    className="flex items-center justify-between text-sm p-3 rounded-lg border"
                    style={{ backgroundColor: '#faf6fc', borderColor: '#e5e5e5' }}
                  >
                    <div>
                      <span className="font-semibold" style={{ color: '#1a1a1a' }}>{book.title}</span>
                      <span style={{ color: '#666' }}> by {book.author}</span>
                    </div>
                    <div className="flex gap-1">
                      {book.categories.slice(0, 2).map((cat) => (
                        <span key={cat} className="badge badge-category text-xs">
                          {cat}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
                {result.imported.length > 10 && (
                  <p className="text-sm text-center pt-2" style={{ color: '#666' }}>
                    And {result.imported.length - 10} more...
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

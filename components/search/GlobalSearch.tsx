'use client';

import { useState } from 'react';
import Link from 'next/link';
import { SearchResult } from '@/lib/search';

interface GlobalSearchProps {
  initialQuery?: string;
}

export function GlobalSearch({ initialQuery = '' }: GlobalSearchProps) {
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) {
      setResults([]);
      setHasSearched(false);
      return;
    }

    setLoading(true);
    setError('');
    setHasSearched(true);

    try {
      const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
      if (!response.ok) {
        throw new Error('Failed to search');
      }
      const data = await response.json();
      setResults(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to search');
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <form onSubmit={handleSearch} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-text-primary mb-2">
            Search Resources
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name across all clusters..."
              className="flex-1 px-4 py-2 bg-surface border border-border rounded text-text-primary placeholder:text-text-secondary focus:outline-none focus:border-accent"
            />
            <button
              type="submit"
              className="px-6 py-2 bg-accent hover:bg-accent/90 text-black font-medium rounded transition-colors"
            >
              Search
            </button>
          </div>
          <p className="text-xs text-text-secondary mt-2">
            Searches pods, deployments, services, configmaps, secrets, and more across all clusters
          </p>
        </div>
      </form>

      {error && (
        <div className="p-4 bg-error/10 border border-error rounded text-error text-sm">
          {error}
        </div>
      )}

      {loading && (
        <div className="text-text-secondary">Searching...</div>
      )}

      {hasSearched && !loading && results.length === 0 && (
        <div className="p-8 text-center border border-border rounded-lg">
          <p className="text-text-secondary">No resources found matching "{query}"</p>
        </div>
      )}

      {results.length > 0 && (
        <div className="space-y-4">
          <p className="text-sm text-text-secondary">
            Found {results.length} result{results.length !== 1 ? 's' : ''}
          </p>
          <div className="bg-surface-elevated rounded-lg border border-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left px-4 py-3 font-semibold text-text-primary">Kind</th>
                    <th className="text-left px-4 py-3 font-semibold text-text-primary">Name</th>
                    <th className="text-left px-4 py-3 font-semibold text-text-primary">Namespace</th>
                    <th className="text-left px-4 py-3 font-semibold text-text-primary">Cluster</th>
                    <th className="text-left px-4 py-3 font-semibold text-text-primary">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((result, idx) => (
                    <tr key={idx} className="border-b border-border hover:bg-surface/50">
                      <td className="px-4 py-3">
                        <span className="px-2 py-1 bg-accent/20 text-accent rounded text-xs font-medium">
                          {result.kind}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-text-primary font-medium">{result.name}</td>
                      <td className="px-4 py-3 text-text-secondary">{result.namespace || '-'}</td>
                      <td className="px-4 py-3 text-text-secondary">
                        <Link
                          href={`/clusters/${result.clusterId}`}
                          className="hover:text-accent transition-colors"
                        >
                          {result.cluster}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-text-secondary text-xs">
                        {result.createdAt ? new Date(result.createdAt).toLocaleDateString() : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

'use client';

import { GlobalSearch } from '@/components/search/GlobalSearch';

export default function SearchPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-text-primary">Global Search</h1>
        <p className="text-text-secondary mt-1">
          Search for resources across all clusters
        </p>
      </div>

      <div className="bg-surface-elevated rounded-lg border border-border p-6">
        <GlobalSearch />
      </div>
    </div>
  );
}

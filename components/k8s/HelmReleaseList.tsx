'use client';

import { HelmRelease } from '@/lib/k8s/helm';

interface HelmReleaseListProps {
  releases: HelmRelease[];
  loading: boolean;
  error?: string;
}

export function HelmReleaseList({
  releases,
  loading,
  error,
}: HelmReleaseListProps) {
  if (error) {
    return (
      <div className="p-4 bg-error/10 border border-error rounded text-error">
        {error}
      </div>
    );
  }

  if (loading) {
    return <div className="text-text-secondary">Loading helm releases...</div>;
  }

  if (releases.length === 0) {
    return (
      <div className="p-8 text-center border border-border rounded-lg">
        <p className="text-text-secondary">No helm releases found</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border">
            <th className="text-left px-4 py-3 font-semibold text-text-primary">Name</th>
            <th className="text-left px-4 py-3 font-semibold text-text-primary">Namespace</th>
            <th className="text-left px-4 py-3 font-semibold text-text-primary">Chart</th>
            <th className="text-left px-4 py-3 font-semibold text-text-primary">App Version</th>
            <th className="text-left px-4 py-3 font-semibold text-text-primary">Revision</th>
            <th className="text-left px-4 py-3 font-semibold text-text-primary">Status</th>
            <th className="text-left px-4 py-3 font-semibold text-text-primary">Updated</th>
          </tr>
        </thead>
        <tbody>
          {releases.map((release) => (
            <tr key={`${release.namespace}/${release.name}`} className="border-b border-border hover:bg-surface/50">
              <td className="px-4 py-3 text-text-primary font-medium">{release.name}</td>
              <td className="px-4 py-3 text-text-secondary">{release.namespace}</td>
              <td className="px-4 py-3 text-text-secondary text-xs">{release.chart}</td>
              <td className="px-4 py-3 text-text-secondary">{release.appVersion}</td>
              <td className="px-4 py-3 text-text-secondary">{release.revision}</td>
              <td className="px-4 py-3">
                <span className={`px-2 py-1 rounded text-xs ${
                  release.status === 'deployed'
                    ? 'bg-success/20 text-success'
                    : release.status === 'failed'
                    ? 'bg-error/20 text-error'
                    : 'bg-warning/20 text-warning'
                }`}>
                  {release.status}
                </span>
              </td>
              <td className="px-4 py-3 text-text-secondary text-xs">
                {new Date(release.updated).toLocaleString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

'use client';

import { useState } from 'react';
import { DeploymentRevision } from '@/lib/k8s/deploymentRollout';

interface DeploymentRolloutHistoryProps {
  clusterId: string;
  deploymentName: string;
  namespace: string;
  history: DeploymentRevision[];
  onRollback?: () => void;
}

export function DeploymentRolloutHistory({
  clusterId,
  deploymentName,
  namespace,
  history,
  onRollback,
}: DeploymentRolloutHistoryProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleRollback = async (toRevision: number) => {
    if (!confirm(`Rollback deployment to revision ${toRevision}?`)) return;

    try {
      setLoading(true);
      setError('');
      const response = await fetch(
        `/api/clusters/${clusterId}/deployments/${deploymentName}/rollout`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ namespace, toRevision }),
        }
      );

      if (response.ok) {
        onRollback?.();
      } else {
        setError('Failed to rollback deployment');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to rollback');
    } finally {
      setLoading(false);
    }
  };

  if (history.length === 0) {
    return <div className="text-text-secondary py-4">No rollout history available</div>;
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="p-3 bg-error/10 border border-error rounded text-error text-sm">
          {error}
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b border-border">
            <tr>
              <th className="text-left py-3 px-4 text-text-secondary font-medium">
                Revision
              </th>
              <th className="text-left py-3 px-4 text-text-secondary font-medium">
                Image
              </th>
              <th className="text-left py-3 px-4 text-text-secondary font-medium">
                Created
              </th>
              <th className="text-left py-3 px-4 text-text-secondary font-medium">
                Status
              </th>
              <th className="text-left py-3 px-4 text-text-secondary font-medium">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {history.map((revision) => (
              <tr key={revision.revision} className="border-b border-border hover:bg-surface/50">
                <td className="py-3 px-4 text-text-primary font-medium">
                  {revision.revision}
                </td>
                <td className="py-3 px-4 text-text-secondary text-xs font-mono break-all">
                  {revision.image}
                </td>
                <td className="py-3 px-4 text-text-secondary text-xs">
                  {new Date(revision.createdAt).toLocaleDateString()}
                  {' '}
                  {new Date(revision.createdAt).toLocaleTimeString()}
                </td>
                <td className="py-3 px-4">
                  <span
                    className={`px-2 py-1 rounded text-xs font-medium ${
                      revision.status === 'Active'
                        ? 'bg-success/20 text-success'
                        : 'bg-warning/20 text-warning'
                    }`}
                  >
                    {revision.status}
                  </span>
                </td>
                <td className="py-3 px-4">
                  {revision.status !== 'Active' && (
                    <button
                      onClick={() => handleRollback(revision.revision)}
                      disabled={loading}
                      className="text-accent hover:text-accent/80 transition-colors text-xs disabled:opacity-50"
                    >
                      {loading ? 'Rolling back...' : 'Rollback'}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

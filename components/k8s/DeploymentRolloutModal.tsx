'use client';

import { useEffect, useState } from 'react';
import { DeploymentRevision } from '@/lib/k8s/deploymentRollout';
import { DeploymentRolloutHistory } from './DeploymentRolloutHistory';

interface DeploymentRolloutModalProps {
  isOpen: boolean;
  deploymentName: string;
  namespace: string;
  clusterId: string;
  onClose: () => void;
  onRollback?: () => void;
}

export function DeploymentRolloutModal({
  isOpen,
  deploymentName,
  namespace,
  clusterId,
  onClose,
  onRollback,
}: DeploymentRolloutModalProps) {
  const [history, setHistory] = useState<DeploymentRevision[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      fetchHistory();
    }
  }, [isOpen, deploymentName]);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      setError('');
      const params = new URLSearchParams({ namespace });
      const response = await fetch(
        `/api/clusters/${clusterId}/deployments/${deploymentName}/rollout?${params}`,
        { method: 'GET' }
      );

      if (response.ok) {
        const data = await response.json();
        setHistory(data);
      } else {
        setError('Failed to fetch rollout history');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch history');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-surface-elevated rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-border flex items-center justify-between sticky top-0 bg-surface-elevated">
          <h2 className="text-xl font-bold text-text-primary">
            Rollout History: {deploymentName}
          </h2>
          <button
            onClick={onClose}
            className="text-text-secondary hover:text-text-primary transition-colors"
          >
            ✕
          </button>
        </div>

        <div className="p-6">
          {loading ? (
            <div className="text-text-secondary">Loading history...</div>
          ) : (
            <DeploymentRolloutHistory
              clusterId={clusterId}
              deploymentName={deploymentName}
              namespace={namespace}
              history={history}
              onRollback={() => {
                fetchHistory();
                onRollback?.();
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}

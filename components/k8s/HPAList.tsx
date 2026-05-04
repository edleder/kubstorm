'use client';

import { useState } from 'react';
import { HPAInfo } from '@/lib/k8s/hpa';
import { ResourceEditorModal } from './ResourceEditorModal';

interface HPAListProps {
  hpaList: HPAInfo[];
  loading: boolean;
  error?: string;
  clusterId?: string;
  onResourceUpdated?: () => void;
}

export function HPAList({
  hpaList,
  loading,
  error,
  clusterId,
  onResourceUpdated,
}: HPAListProps) {
  const [selectedResource, setSelectedResource] = useState<{
    namespace: string;
    name: string;
  } | null>(null);

  if (error) {
    return (
      <div className="p-4 bg-error/10 border border-error rounded text-error">
        {error}
      </div>
    );
  }

  if (loading) {
    return <div className="text-text-secondary">Loading HPA...</div>;
  }

  if (hpaList.length === 0) {
    return (
      <div className="p-8 text-center border border-border rounded-lg">
        <p className="text-text-secondary">No HPA found</p>
      </div>
    );
  }

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border">
            <th className="text-left px-4 py-3 font-semibold text-text-primary">Name</th>
            <th className="text-left px-4 py-3 font-semibold text-text-primary">Namespace</th>
            <th className="text-left px-4 py-3 font-semibold text-text-primary">Target</th>
            <th className="text-left px-4 py-3 font-semibold text-text-primary">Min</th>
            <th className="text-left px-4 py-3 font-semibold text-text-primary">Max</th>
            <th className="text-left px-4 py-3 font-semibold text-text-primary">Current</th>
            <th className="text-left px-4 py-3 font-semibold text-text-primary">Desired</th>
            <th className="text-left px-4 py-3 font-semibold text-text-primary">Action</th>
          </tr>
        </thead>
        <tbody>
          {hpaList.map((hpa) => (
            <tr key={`${hpa.namespace}/${hpa.name}`} className="border-b border-border hover:bg-surface/50">
              <td className="px-4 py-3 text-text-primary font-medium">{hpa.name}</td>
              <td className="px-4 py-3 text-text-secondary">{hpa.namespace}</td>
              <td className="px-4 py-3 text-text-secondary text-xs">{hpa.target}</td>
              <td className="px-4 py-3 text-text-secondary">{hpa.minReplicas}</td>
              <td className="px-4 py-3 text-text-secondary">{hpa.maxReplicas}</td>
              <td className="px-4 py-3">
                <span className="px-2 py-1 bg-success/20 text-success rounded text-xs">
                  {hpa.currentReplicas}
                </span>
              </td>
              <td className="px-4 py-3">
                <span className="px-2 py-1 bg-accent/20 text-accent rounded text-xs">
                  {hpa.desiredReplicas}
                </span>
              </td>
              <td className="px-4 py-3">
                {clusterId && (
                  <button
                    onClick={() =>
                      setSelectedResource({
                        namespace: hpa.namespace,
                        name: hpa.name,
                      })
                    }
                    className="px-2 py-1 bg-accent/20 hover:bg-accent/30 text-accent rounded text-xs font-medium transition-colors"
                  >
                    View/Edit
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>

      {selectedResource && clusterId && (
        <ResourceEditorModal
          isOpen={!!selectedResource}
          clusterId={clusterId}
          kind="HorizontalPodAutoscaler"
          namespace={selectedResource.namespace}
          name={selectedResource.name}
          onClose={() => setSelectedResource(null)}
          onSave={() => {
            setSelectedResource(null);
            onResourceUpdated?.();
          }}
        />
      )}
    </>
  );
}

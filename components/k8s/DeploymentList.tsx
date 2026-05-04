'use client';

import { useState } from 'react';
import { DeploymentInfo } from '@/lib/k8s/deployments';
import { ResourceEditorModal } from './ResourceEditorModal';

interface DeploymentListProps {
  deployments: DeploymentInfo[];
  loading: boolean;
  error?: string;
  clusterId?: string;
  namespace?: string;
  onResourceUpdated?: () => void;
  onShowRollout?: (deploymentName: string, namespace: string) => void;
}

export function DeploymentList({
  deployments,
  loading,
  error,
  clusterId,
  namespace,
  onResourceUpdated,
  onShowRollout,
}: DeploymentListProps) {
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
    return <div className="text-text-secondary">Loading deployments...</div>;
  }

  if (deployments.length === 0) {
    return (
      <div className="p-8 text-center border border-border rounded-lg">
        <p className="text-text-secondary">No deployments found</p>
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
              <th className="text-left px-4 py-3 font-semibold text-text-primary">Image</th>
              <th className="text-left px-4 py-3 font-semibold text-text-primary">Replicas</th>
              <th className="text-left px-4 py-3 font-semibold text-text-primary">Ready</th>
              <th className="text-left px-4 py-3 font-semibold text-text-primary">Updated</th>
              <th className="text-left px-4 py-3 font-semibold text-text-primary">Available</th>
              <th className="text-left px-4 py-3 font-semibold text-text-primary">Actions</th>
            </tr>
          </thead>
          <tbody>
            {deployments.map((dep) => (
              <tr key={`${dep.namespace}/${dep.name}`} className="border-b border-border hover:bg-surface/50">
                <td className="px-4 py-3 text-text-primary font-medium whitespace-nowrap">{dep.name}</td>
                <td className="px-4 py-3 text-text-secondary whitespace-nowrap">{dep.namespace}</td>
                <td className="px-4 py-3 text-text-secondary text-xs max-w-sm truncate" title={dep.image}>{dep.image}</td>
                <td className="px-4 py-3 text-text-secondary">{dep.replicas}</td>
                <td className="px-4 py-3">
                  <span className="px-2 py-1 bg-accent/20 text-accent rounded text-xs">
                    {dep.ready}
                  </span>
                </td>
                <td className="px-4 py-3 text-text-secondary">{dep.updated}</td>
                <td className="px-4 py-3">
                  <span className="px-2 py-1 bg-success/20 text-success rounded text-xs">
                    {dep.available}
                  </span>
                </td>
                <td className="px-4 py-3 flex gap-2">
                  {clusterId && (
                    <>
                      <button
                        onClick={() =>
                          setSelectedResource({
                            namespace: dep.namespace,
                            name: dep.name,
                          })
                        }
                        className="px-2 py-1 bg-accent/20 hover:bg-accent/30 text-accent rounded text-xs font-medium transition-colors"
                      >
                        View/Edit
                      </button>
                      {onShowRollout && (
                        <button
                          onClick={() => onShowRollout(dep.name, dep.namespace)}
                          className="px-2 py-1 bg-warning/20 hover:bg-warning/30 text-warning rounded text-xs font-medium transition-colors"
                        >
                          Rollout
                        </button>
                      )}
                    </>
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
          kind="Deployment"
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

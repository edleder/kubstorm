'use client';

import { useState } from 'react';
import { ConfigMapInfo } from '@/lib/k8s/configmaps';
import { ResourceEditorModal } from './ResourceEditorModal';

interface ConfigMapListProps {
  configMaps: ConfigMapInfo[];
  loading: boolean;
  error?: string;
  clusterId?: string;
  onResourceUpdated?: () => void;
}

export function ConfigMapList({
  configMaps,
  loading,
  error,
  clusterId,
  onResourceUpdated,
}: ConfigMapListProps) {
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
    return <div className="text-text-secondary">Loading config maps...</div>;
  }

  if (configMaps.length === 0) {
    return (
      <div className="p-8 text-center border border-border rounded-lg">
        <p className="text-text-secondary">No config maps found</p>
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
            <th className="text-left px-4 py-3 font-semibold text-text-primary">Keys</th>
            <th className="text-left px-4 py-3 font-semibold text-text-primary">Size</th>
            <th className="text-left px-4 py-3 font-semibold text-text-primary">Created</th>
            <th className="text-left px-4 py-3 font-semibold text-text-primary">Action</th>
          </tr>
        </thead>
        <tbody>
          {configMaps.map((cm) => (
            <tr key={`${cm.namespace}/${cm.name}`} className="border-b border-border hover:bg-surface/50">
              <td className="px-4 py-3 text-text-primary font-medium">{cm.name}</td>
              <td className="px-4 py-3 text-text-secondary">{cm.namespace}</td>
              <td className="px-4 py-3 text-text-secondary">{cm.keys}</td>
              <td className="px-4 py-3 text-text-secondary">{cm.size}</td>
              <td className="px-4 py-3 text-text-secondary">{new Date(cm.createdAt).toLocaleDateString()}</td>
              <td className="px-4 py-3">
                {clusterId && (
                  <button
                    onClick={() =>
                      setSelectedResource({
                        namespace: cm.namespace,
                        name: cm.name,
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
          kind="ConfigMap"
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

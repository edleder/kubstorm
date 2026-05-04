'use client';

import { useState } from 'react';
import { SecretInfo } from '@/lib/k8s/secrets';
import { ResourceEditorModal } from './ResourceEditorModal';

interface SecretListProps {
  secrets: SecretInfo[];
  loading: boolean;
  error?: string;
  clusterId?: string;
  onResourceUpdated?: () => void;
}

export function SecretList({
  secrets,
  loading,
  error,
  clusterId,
  onResourceUpdated,
}: SecretListProps) {
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
    return <div className="text-text-secondary">Loading secrets...</div>;
  }

  if (secrets.length === 0) {
    return (
      <div className="p-8 text-center border border-border rounded-lg">
        <p className="text-text-secondary">No secrets found</p>
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
            <th className="text-left px-4 py-3 font-semibold text-text-primary">Type</th>
            <th className="text-left px-4 py-3 font-semibold text-text-primary">Keys</th>
            <th className="text-left px-4 py-3 font-semibold text-text-primary">Created</th>
            <th className="text-left px-4 py-3 font-semibold text-text-primary">Action</th>
          </tr>
        </thead>
        <tbody>
          {secrets.map((secret) => (
            <tr key={`${secret.namespace}/${secret.name}`} className="border-b border-border hover:bg-surface/50">
              <td className="px-4 py-3 text-text-primary font-medium">{secret.name}</td>
              <td className="px-4 py-3 text-text-secondary">{secret.namespace}</td>
              <td className="px-4 py-3">
                <span className="px-2 py-1 bg-accent/20 text-accent rounded text-xs">
                  {secret.type}
                </span>
              </td>
              <td className="px-4 py-3 text-text-secondary">{secret.keys}</td>
              <td className="px-4 py-3 text-text-secondary">{new Date(secret.createdAt).toLocaleDateString()}</td>
              <td className="px-4 py-3">
                {clusterId && (
                  <button
                    onClick={() =>
                      setSelectedResource({
                        namespace: secret.namespace,
                        name: secret.name,
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
          kind="Secret"
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

'use client';

import { useState } from 'react';
import { NamespaceInfo } from '@/lib/k8s/namespaces';
import { Button } from '@/components/ui/button';

interface NamespaceManagerProps {
  namespaces: NamespaceInfo[];
  loading: boolean;
  error?: string;
  clusterId?: string;
  onNamespaceCreated?: () => void;
}

export function NamespaceManager({
  namespaces,
  loading,
  error,
  clusterId,
  onNamespaceCreated,
}: NamespaceManagerProps) {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newNamespaceName, setNewNamespaceName] = useState('');
  const [creating, setCreating] = useState(false);
  const [creatingError, setCreatingError] = useState('');

  const handleCreateNamespace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNamespaceName || !clusterId) return;

    setCreating(true);
    setCreatingError('');

    try {
      const response = await fetch(`/api/clusters/${clusterId}/namespace-manager`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newNamespaceName }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create namespace');
      }

      setNewNamespaceName('');
      setShowCreateForm(false);
      onNamespaceCreated?.();
    } catch (err) {
      setCreatingError(err instanceof Error ? err.message : 'Failed to create namespace');
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteNamespace = async (name: string) => {
    if (!confirm(`Are you sure you want to delete namespace "${name}"?`) || !clusterId) {
      return;
    }

    try {
      const response = await fetch(`/api/clusters/${clusterId}/namespace-manager`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete namespace');
      }

      onNamespaceCreated?.();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete namespace');
    }
  };

  if (error) {
    return (
      <div className="p-4 bg-error/10 border border-error rounded text-error">
        {error}
      </div>
    );
  }

  if (loading) {
    return <div className="text-text-secondary">Loading namespaces...</div>;
  }

  return (
    <>
      <div className="mb-6 flex justify-between items-center">
        <h3 className="text-lg font-semibold text-text-primary">Namespaces</h3>
        {!showCreateForm && (
          <Button
            onClick={() => setShowCreateForm(true)}
            className="bg-accent hover:bg-accent/90 text-black font-medium"
          >
            + New Namespace
          </Button>
        )}
      </div>

      {showCreateForm && (
        <form
          onSubmit={handleCreateNamespace}
          className="mb-6 p-4 bg-surface rounded-lg border border-border space-y-4"
        >
          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">
              Namespace Name
            </label>
            <input
              type="text"
              value={newNamespaceName}
              onChange={(e) => setNewNamespaceName(e.target.value)}
              className="w-full px-3 py-2 bg-surface-elevated border border-border rounded text-text-primary focus:outline-none focus:border-accent"
              required
              disabled={creating}
            />
          </div>

          {creatingError && (
            <div className="p-3 bg-error/10 border border-error rounded text-error text-sm">
              {creatingError}
            </div>
          )}

          <div className="flex gap-2">
            <Button
              type="submit"
              disabled={creating}
              className="bg-accent hover:bg-accent/90 text-black font-medium"
            >
              {creating ? 'Creating...' : 'Create'}
            </Button>
            <button
              type="button"
              onClick={() => {
                setShowCreateForm(false);
                setNewNamespaceName('');
                setCreatingError('');
              }}
              className="px-4 py-2 bg-surface border border-border rounded text-text-primary hover:bg-surface-dark transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left px-4 py-3 font-semibold text-text-primary">Name</th>
              <th className="text-left px-4 py-3 font-semibold text-text-primary">Status</th>
              <th className="text-left px-4 py-3 font-semibold text-text-primary">Created</th>
              <th className="text-left px-4 py-3 font-semibold text-text-primary">Action</th>
            </tr>
          </thead>
          <tbody>
            {namespaces.map((ns) => (
              <tr key={ns.name} className="border-b border-border hover:bg-surface/50">
                <td className="px-4 py-3 text-text-primary font-medium">{ns.name}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 rounded text-xs ${
                    ns.status === 'Active' 
                      ? 'bg-success/20 text-success' 
                      : 'bg-warning/20 text-warning'
                  }`}>
                    {ns.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-text-secondary">{new Date(ns.createdAt).toLocaleDateString()}</td>
                <td className="px-4 py-3">
                  {ns.name !== 'default' && ns.name !== 'kube-system' && ns.name !== 'kube-node-lease' && ns.name !== 'kube-public' && (
                    <button
                      onClick={() => handleDeleteNamespace(ns.name)}
                      className="px-2 py-1 bg-error/20 hover:bg-error/30 text-error rounded text-xs font-medium transition-colors"
                    >
                      Delete
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {namespaces.length === 0 && (
        <div className="p-8 text-center border border-border rounded-lg">
          <p className="text-text-secondary">No namespaces found</p>
        </div>
      )}
    </>
  );
}

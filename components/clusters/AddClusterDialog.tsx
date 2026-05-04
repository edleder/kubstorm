'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { useClusterStore } from '@/store/clusterStore';

interface AddClusterDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddClusterDialog({ open, onOpenChange }: AddClusterDialogProps) {
  const [name, setName] = useState('');
  const [provider, setProvider] = useState<'generic' | 'gke' | 'eks' | 'aks'>('generic');
  const [serverUrl, setServerUrl] = useState('');
  const [gcpProjectId, setGcpProjectId] = useState('');
  const [kubeconfig, setKubeconfig] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { addCluster } = useClusterStore();

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setKubeconfig(event.target?.result as string);
      };
      reader.readAsText(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/clusters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          provider,
          serverUrl,
          gcpProjectId: gcpProjectId || undefined,
          kubeconfig,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to add cluster');
      }

      const cluster = await response.json();
      addCluster(cluster);
      onOpenChange(false);
      setName('');
      setProvider('generic');
      setServerUrl('');
      setGcpProjectId('');
      setKubeconfig('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-surface-elevated rounded-lg border border-border p-6 max-w-md w-full mx-4">
        <h2 className="text-xl font-bold text-text-primary mb-4">Add Cluster</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">
              Cluster Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 bg-surface border border-border rounded text-text-primary focus:outline-none focus:border-accent"
              placeholder="e.g., prod-gke"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">
              Provider
            </label>
            <select
              value={provider}
              onChange={(e) => setProvider(e.target.value as any)}
              className="w-full px-3 py-2 bg-surface border border-border rounded text-text-primary focus:outline-none focus:border-accent"
            >
              <option value="generic">Generic Kubernetes</option>
              <option value="gke">Google GKE</option>
              <option value="eks">AWS EKS</option>
              <option value="aks">Azure AKS</option>
            </select>
          </div>

          {provider === 'generic' && (
            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">
                Server URL
              </label>
              <input
                type="url"
                value={serverUrl}
                onChange={(e) => setServerUrl(e.target.value)}
                className="w-full px-3 py-2 bg-surface border border-border rounded text-text-primary focus:outline-none focus:border-accent"
                placeholder="https://k8s-api.example.com"
              />
            </div>
          )}

          {provider === 'gke' && (
            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">
                GCP Project ID
              </label>
              <input
                type="text"
                value={gcpProjectId}
                onChange={(e) => setGcpProjectId(e.target.value)}
                className="w-full px-3 py-2 bg-surface border border-border rounded text-text-primary focus:outline-none focus:border-accent"
                placeholder="e.g., my-gcp-project-id"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">
              Kubeconfig File
            </label>
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileUpload}
              accept=".yaml,.yml,.json"
              className="w-full text-sm text-text-secondary"
            />
            {kubeconfig && (
              <p className="text-xs text-success mt-1">✓ Kubeconfig loaded</p>
            )}
          </div>

          {error && (
            <div className="p-3 bg-error/10 border border-error rounded text-error text-sm">
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              onClick={() => onOpenChange(false)}
              className="flex-1 bg-surface hover:bg-surface-elevated text-text-primary border border-border"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading || !name || !kubeconfig}
              className="flex-1 bg-accent hover:bg-accent-hover text-black font-medium"
            >
              {loading ? 'Adding...' : 'Add Cluster'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

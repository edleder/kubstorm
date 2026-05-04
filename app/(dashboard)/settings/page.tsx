'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { UserManagement } from '@/components/settings/UserManagement';

export default function SettingsPage() {
  const router = useRouter();
  const [uploading, setUploading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleImportFromDefault = async () => {
    setImporting(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/settings/import-kubeconfig', {
        method: 'POST',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to import kubeconfig');
      }

      const data = await response.json();
      setSuccess(
        data.message +
          '. You can now add these clusters from the Clusters page.'
      );

      setTimeout(() => {
        router.push('/clusters');
      }, 2000);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to import kubeconfig'
      );
    } finally {
      setImporting(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError('');
    setSuccess('');

    try {
      const fileContent = await file.text();

      setSuccess('Kubeconfig file processed. You can now add clusters from the Clusters page.');

      setTimeout(() => {
        router.push('/clusters');
      }, 2000);
    } catch (err) {
      setError('Failed to read kubeconfig file: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="max-w-2xl">
      <h1 className="text-3xl font-bold text-text-primary mb-2">Settings</h1>
      <p className="text-text-secondary mb-8">Manage your Kubstorm configuration</p>

      <div className="bg-surface-elevated rounded-lg border border-border p-6 space-y-6">
        {/* Kubeconfig Import */}
        <div>
          <h2 className="text-lg font-semibold text-text-primary mb-4">Add Clusters</h2>
          <p className="text-sm text-text-secondary mb-4">
            Import your kubeconfig to automatically discover your Kubernetes clusters.
          </p>

          <div className="space-y-4">
            {/* Import from default location */}
            <div className="p-4 bg-surface rounded-lg border border-accent/30">
              <p className="text-sm text-text-primary mb-3">
                Import from default location:
              </p>
              <Button
                onClick={handleImportFromDefault}
                disabled={importing}
                className="w-full bg-accent hover:bg-accent/90 text-black font-medium"
              >
                {importing ? 'Importing...' : '📁 Import from ~/.kube/config'}
              </Button>
            </div>

            {/* Or upload file */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border"></div>
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="px-2 bg-surface-elevated text-text-secondary">
                  Or upload a file
                </span>
              </div>
            </div>

            <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
              <input
                type="file"
                accept=".yaml,.yml,.json"
                onChange={handleFileUpload}
                disabled={uploading}
                className="hidden"
                id="kubeconfig-upload"
              />
              <label
                htmlFor="kubeconfig-upload"
                className="cursor-pointer block"
              >
                <p className="text-sm font-medium text-text-primary mb-2">
                  {uploading ? 'Processing...' : 'Click to upload or drag and drop'}
                </p>
                <p className="text-xs text-text-secondary">
                  YAML or JSON kubeconfig files
                </p>
              </label>
            </div>
          </div>

          {error && (
            <div className="mt-4 p-3 bg-error/10 border border-error rounded text-error text-sm">
              {error}
            </div>
          )}

          {success && (
            <div className="mt-4 p-3 bg-success/10 border border-success rounded text-success text-sm">
              {success}
            </div>
          )}
        </div>

        {/* Help Section */}
        <div className="border-t border-border pt-6">
          <h3 className="text-lg font-semibold text-text-primary mb-4">How to export kubeconfig</h3>
          <div className="space-y-4 text-sm text-text-secondary">
            <div>
              <p className="font-medium text-text-primary mb-1">For GKE Clusters:</p>
              <code className="block bg-surface rounded p-2 mt-1 text-xs">
                gcloud container clusters get-credentials CLUSTER_NAME --zone ZONE --project PROJECT
              </code>
            </div>
            <div>
              <p className="font-medium text-text-primary mb-1">Then copy your kubeconfig:</p>
              <code className="block bg-surface rounded p-2 mt-1 text-xs">
                cat ~/.kube/config
              </code>
            </div>
          </div>
        </div>
      </div>

      {/* User Management */}
      <div className="bg-surface-elevated rounded-lg border border-border p-6 mt-6">
        <UserManagement />
      </div>
    </div>
  );
}

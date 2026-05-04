'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';

interface ResourceEditorModalProps {
  isOpen: boolean;
  clusterId: string;
  kind: string;
  namespace: string;
  name: string;
  onClose: () => void;
  onSave?: () => void;
}

export function ResourceEditorModal({
  isOpen,
  clusterId,
  kind,
  namespace,
  name,
  onClose,
  onSave,
}: ResourceEditorModalProps) {
  const [yaml, setYaml] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [mode, setMode] = useState<'view' | 'edit'>('view');

  const fetchResource = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await fetch(
        `/api/clusters/${clusterId}/resources?kind=${kind}&namespace=${namespace}&name=${name}`
      );
      if (response.ok) {
        const data = await response.json();
        setYaml(data.yaml);
      } else {
        setError('Failed to fetch resource');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch resource');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      setError('');
      const response = await fetch(`/api/clusters/${clusterId}/resources`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ yaml }),
      });
      if (response.ok) {
        setMode('view');
        onSave?.();
        alert('Resource updated successfully!');
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to update resource');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update resource');
    } finally {
      setIsSaving(false);
    }
  };

  useEffect(() => {
    if (isOpen && !yaml) {
      fetchResource();
    }
  }, [isOpen, clusterId, kind, namespace, name]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-surface-elevated border border-border rounded-lg max-w-4xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="border-b border-border p-4 flex justify-between items-center">
          <div>
            <h2 className="text-lg font-semibold text-text-primary">
              {kind} / {name}
            </h2>
            <p className="text-sm text-text-secondary">{namespace}</p>
          </div>
          <button
            onClick={onClose}
            className="text-text-secondary hover:text-text-primary text-2xl leading-none"
          >
            ×
          </button>
        </div>

        {/* Mode Tabs */}
        <div className="border-b border-border flex gap-2 px-4">
          <button
            onClick={() => setMode('view')}
            className={`px-3 py-2 text-sm font-medium ${
              mode === 'view'
                ? 'text-accent border-b-2 border-accent'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            View
          </button>
          <button
            onClick={() => setMode('edit')}
            className={`px-3 py-2 text-sm font-medium ${
              mode === 'edit'
                ? 'text-accent border-b-2 border-accent'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            Edit
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-4">
          {error && (
            <div className="mb-4 p-3 bg-error/10 border border-error rounded text-error text-sm">
              {error}
            </div>
          )}

          {loading && !yaml ? (
            <div className="text-text-secondary">Loading resource...</div>
          ) : (
            <textarea
              value={yaml}
              onChange={(e) => setYaml(e.target.value)}
              readOnly={mode === 'view'}
              className={`w-full h-full font-mono text-sm p-4 bg-surface border border-border rounded ${
                mode === 'view'
                  ? 'text-text-secondary'
                  : 'text-text-primary focus:outline-none focus:border-accent'
              }`}
              style={{
                resize: 'none',
                minHeight: '300px',
                backgroundColor: 'var(--surface)',
              }}
            />
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-border p-4 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-surface border border-border rounded text-text-primary hover:bg-surface-dark transition-colors"
          >
            Close
          </button>
          {mode === 'edit' && (
            <Button
              onClick={handleSave}
              disabled={isSaving}
              className="bg-accent hover:bg-accent/90 text-black font-medium"
            >
              {isSaving ? 'Saving...' : 'Save Changes'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

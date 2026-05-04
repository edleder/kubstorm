'use client';

import { useState } from 'react';

interface PodExecProps {
  clusterId: string;
  namespace: string;
  podName: string;
}

export function PodExec({ clusterId, namespace, podName }: PodExecProps) {
  const [command, setCommand] = useState('');
  const [output, setOutput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleExecute = async () => {
    if (!command.trim()) return;

    try {
      setLoading(true);
      setError('');
      setOutput('');

      const response = await fetch(`/api/clusters/${clusterId}/pods/exec`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          namespace,
          podName,
          command,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setOutput(data.output);
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to execute command');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to execute command');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-text-primary mb-2">
          Command
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={command}
            onChange={(e) => setCommand(e.target.value)}
            placeholder="e.g., ls -la, pwd, echo hello"
            className="flex-1 px-3 py-2 bg-surface border border-border rounded text-text-primary focus:outline-none focus:border-accent"
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleExecute();
            }}
          />
          <button
            onClick={handleExecute}
            disabled={loading || !command.trim()}
            className="px-4 py-2 bg-accent text-black rounded font-medium hover:bg-accent/90 transition-colors disabled:opacity-50"
          >
            {loading ? 'Executing...' : 'Execute'}
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-error/10 border border-error rounded text-error text-sm">
          {error}
        </div>
      )}

      {output && (
        <div>
          <label className="block text-sm font-medium text-text-primary mb-2">
            Output
          </label>
          <div className="bg-surface border border-border rounded p-4 max-h-96 overflow-y-auto">
            <pre className="text-xs text-text-secondary font-mono whitespace-pre-wrap break-words">
              {output}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}

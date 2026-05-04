'use client';

import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { AlertCircle, Loader2, X } from 'lucide-react';

interface PodShellTerminalProps {
  clusterId: string;
  namespace: string;
  podName: string;
  container?: string;
  onClose?: () => void;
}

export function PodShellTerminal({
  clusterId,
  namespace,
  podName,
  container,
  onClose,
}: PodShellTerminalProps) {
  const [command, setCommand] = useState('');
  const [output, setOutput] = useState<string[]>(['Welcome to Pod Shell Terminal', '> ']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const outputEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const executeCommand = async (cmd: string) => {
    if (!cmd.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/clusters/${clusterId}/pods/exec`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            namespace,
            podName,
            command: cmd,
            container: container || undefined,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to execute command');
        setOutput((prev) => [
          ...prev,
          `Error: ${data.error || 'Unknown error'}`,
          '> ',
        ]);
      } else {
        setOutput((prev) => [
          ...prev,
          `$ ${cmd}`,
          data.output || '(no output)',
          '> ',
        ]);
      }
    } catch (err) {
      const errorMsg =
        err instanceof Error ? err.message : 'Connection error';
      setError(errorMsg);
      setOutput((prev) => [...prev, `Error: ${errorMsg}`, '> ']);
    } finally {
      setLoading(false);
      setCommand('');
    }
  };

  useEffect(() => {
    outputEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [output]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      executeCommand(command);
    }
  };

  return (
    <div className="flex flex-col h-full bg-surface-dark rounded-lg border border-accent/30">
      <div className="flex items-center justify-between p-4 border-b border-accent/20 bg-surface">
        <div>
          <h3 className="text-sm font-semibold text-accent">Shell Terminal</h3>
          <p className="text-xs text-text-secondary mt-1">
            {podName} in {namespace}
            {container && ` (container: ${container})`}
          </p>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="text-text-secondary hover:text-text-primary transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 font-mono text-xs bg-surface">
        {output.map((line, index) => (
          <div
            key={index}
            className={`${
              line.startsWith('Error:')
                ? 'text-error'
                : line.startsWith('$')
                ? 'text-accent'
                : 'text-text-secondary'
            } whitespace-pre-wrap break-words`}
          >
            {line}
          </div>
        ))}
        <div ref={outputEndRef} />
      </div>

      {error && (
        <div className="p-3 bg-error/10 border-t border-error/20 text-xs text-error flex items-center gap-2">
          <AlertCircle className="h-3 w-3 flex-shrink-0" />
          {error}
        </div>
      )}

      <div className="p-4 border-t border-accent/20 bg-surface flex gap-2">
        <input
          ref={inputRef}
          type="text"
          value={command}
          onChange={(e) => setCommand(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Enter command (e.g., ls, pwd, cat file.txt)"
          className="flex-1 px-3 py-2 bg-surface-elevated border border-accent/30 rounded text-text-primary text-xs focus:outline-none focus:border-accent"
          disabled={loading}
        />
        <Button
          onClick={() => executeCommand(command)}
          disabled={loading || !command.trim()}
          className="bg-accent text-black hover:bg-accent-hover text-xs"
        >
          {loading ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            'Execute'
          )}
        </Button>
      </div>
    </div>
  );
}

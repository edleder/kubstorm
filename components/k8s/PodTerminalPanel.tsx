'use client';

import { useEffect, useRef, useState } from 'react';
import { X, ChevronUp, ChevronDown } from 'lucide-react';

interface ShellSession {
  id: string;
  podName: string;
  namespace: string;
  container?: string;
  output: string[];
  isActive: boolean;
}

interface PodTerminalPanelProps {
  clusterId: string;
  activePod?: { name: string; namespace: string; container?: string };
}

export function PodTerminalPanel({
  clusterId,
  activePod,
}: PodTerminalPanelProps) {
  const [sessions, setSessions] = useState<ShellSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const outputRef = useRef<HTMLDivElement>(null);
  const pollIntervalsRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

  const openShell = (podName: string, namespace: string, container?: string) => {
    const id = `${podName}-${namespace}-${container || 'default'}`;

    // Check if already open
    if (sessions.some((s) => s.id === id)) {
      setActiveSessionId(id);
      return;
    }

    const session: ShellSession = {
      id,
      podName,
      namespace,
      container,
      output: [`Connecting to ${podName} in ${namespace}...`],
      isActive: true,
    };

    setSessions((prev) => [...prev, session]);
    setActiveSessionId(id);

    initializeShellWithSession(session, id, podName, namespace, container);
  };

  const initializeShellWithSession = async (
    session: ShellSession,
    sessionId: string,
    podName: string,
    namespace: string,
    container?: string
  ) => {
    if (!session) {
      console.error('Session not found', sessionId);
      return;
    }

    const params = new URLSearchParams({
      namespace,
      pod: podName,
      ...(container && { container }),
      sessionId,
    });

    try {
      const response = await fetch(
        `/api/clusters/${clusterId}/pods/shell/connect?${params.toString()}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        }
      );

      if (!response.ok) {
        const error = await response.json();
        setSessions((prev) =>
          prev.map((s) =>
            s.id === sessionId
              ? { ...s, output: [...s.output, `Error: ${error.error}`] }
              : s
          )
        );
        return;
      }

      setSessions((prev) =>
        prev.map((s) =>
          s.id === sessionId
            ? { ...s, output: [...s.output, 'Shell initialized. Type "exit" to close.\n'] }
            : s
        )
      );

      pollSessionOutput(sessionId);
    } catch (error) {
      setSessions((prev) =>
        prev.map((s) =>
          s.id === sessionId
            ? {
                ...s,
                output: [
                  ...s.output,
                  `Connection error: ${error instanceof Error ? error.message : 'Unknown error'}`,
                ],
              }
            : s
        )
      );
    }
  };

  const sendCommand = async (sessionId: string, command: string) => {
    try {
      const response = await fetch(
        `/api/clusters/${clusterId}/pods/shell/connect`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId, command }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        setSessions((prev) =>
          prev.map((s) =>
            s.id === sessionId
              ? { ...s, output: [...s.output, `Error: ${error.error}`] }
              : s
          )
        );
      }
    } catch (error) {
      setSessions((prev) =>
        prev.map((s) =>
          s.id === sessionId
            ? {
                ...s,
                output: [
                  ...s.output,
                  `Command error: ${error instanceof Error ? error.message : 'Unknown error'}`,
                ],
              }
            : s
        )
      );
    }
  };

  const pollSessionOutput = async (sessionId: string) => {
    const pollInterval = setInterval(async () => {
      try {
        const params = new URLSearchParams({ sessionId });
        const response = await fetch(
          `/api/clusters/${clusterId}/pods/shell/connect?${params.toString()}`
        );

        if (response.ok) {
          const output = await response.text();
          if (output) {
            setSessions((prev) =>
              prev.map((s) =>
                s.id === sessionId
                  ? { ...s, output: [...s.output, output] }
                  : s
              )
            );
          }
        }
      } catch (error) {
        // Polling error, continue trying
      }
    }, 200);

    pollIntervalsRef.current.set(sessionId, pollInterval);
  };

  const closeShell = (sessionId: string) => {
    const interval = pollIntervalsRef.current.get(sessionId);
    if (interval) {
      clearInterval(interval);
      pollIntervalsRef.current.delete(sessionId);
    }
    setSessions((prev) => prev.filter((s) => s.id !== sessionId));
    if (activeSessionId === sessionId) {
      setActiveSessionId(sessions.find((s) => s.id !== sessionId)?.id || null);
    }
  };

  useEffect(() => {
    if (activePod) {
      openShell(activePod.name, activePod.namespace, activePod.container);
    }
  }, [activePod]);

  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [sessions, activeSessionId]);

  const handleSendCommand = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue || !activeSessionId) return;

    const session = sessions.find((s) => s.id === activeSessionId);
    if (!session) return;

    // Add input to output
    setSessions((prev) =>
      prev.map((s) =>
        s.id === activeSessionId
          ? { ...s, output: [...s.output, inputValue] }
          : s
      )
    );

    // Send command to backend
    sendCommand(activeSessionId, inputValue + '\n');
    setInputValue('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Tab' && activeSessionId) {
      e.preventDefault();
      sendCommand(activeSessionId, '\t');
    }
  };


  if (sessions.length === 0) {
    return null;
  }

  const activeSession = sessions.find((s) => s.id === activeSessionId);

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-surface-dark border-t border-accent/30 z-40">
      <div className="flex items-center justify-between px-4 py-2 border-b border-accent/20 bg-surface">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-1 hover:bg-surface-elevated rounded transition-colors"
          >
            {collapsed ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </button>
          <span className="text-xs font-semibold text-accent">Terminal</span>
          <div className="flex gap-1 ml-2 border-l border-accent/20 pl-2">
            {sessions.map((session) => (
              <button
                key={session.id}
                onClick={() => setActiveSessionId(session.id)}
                className={`px-3 py-1 rounded text-xs transition-colors flex items-center gap-2 ${
                  activeSessionId === session.id
                    ? 'bg-accent/20 text-accent'
                    : 'text-text-secondary hover:text-text-primary hover:bg-surface-elevated'
                }`}
              >
                {session.podName}
                <div
                  onClick={(e) => {
                    e.stopPropagation();
                    closeShell(session.id);
                  }}
                  className="hover:text-error cursor-pointer"
                >
                  <X className="h-3 w-3" />
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {!collapsed && activeSession && (
        <div className="h-96 bg-surface flex flex-col">
          <div ref={outputRef} className="flex-1 overflow-y-auto p-4 font-mono text-sm text-text-primary whitespace-pre-wrap break-all">
            {activeSession.output.map((line, i) => (
              <div key={i} className="mb-0.5">{line}</div>
            ))}
          </div>
          <form onSubmit={handleSendCommand} className="border-t border-border p-3 flex gap-2 flex-shrink-0">
            <span className="text-accent text-sm py-2 px-2">$</span>
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="type command..."
              className="flex-1 px-3 py-2 bg-surface-elevated border border-border rounded text-text-primary text-sm focus:outline-none focus:border-accent placeholder-text-secondary/50"
              autoFocus
            />
            <button
              type="submit"
              className="px-3 py-2 bg-accent text-black rounded text-xs font-medium hover:bg-accent-hover transition-colors flex-shrink-0"
            >
              Send
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

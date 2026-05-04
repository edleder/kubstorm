'use client';

import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { AlertCircle, Loader2, RotateCcw } from 'lucide-react';

interface PodLogsViewerProps {
  clusterId: string;
  namespace: string;
  podName: string;
  container?: string;
}

const parseLogLine = (log: string) => {
  const timeRegex = /^\[?(\d{2}:\d{2}:\d{2}|\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})[^\]]*\]?/;
  const match = log.match(timeRegex);

  if (match) {
    const time = match[0];
    const rest = log.slice(match[0].length);
    return { time, rest, fullLog: log };
  }

  return { time: null, rest: log, fullLog: log };
};

const isErrorLog = (log: string) => {
  const errorPatterns = /\[ERR\]|\bERROR\b|\bFAIL|\bFAILED\b|Exception|Traceback|error:|failed:/i;
  return errorPatterns.test(log);
};

export function PodLogsViewer({
  clusterId,
  namespace,
  podName,
  container,
}: PodLogsViewerProps) {
  const [logs, setLogs] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isStreaming, setIsStreaming] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const logsEndRef = useRef<HTMLDivElement>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const intentionallyClosed = useRef(false);
  const autoRefreshRef = useRef<NodeJS.Timeout | null>(null);

  const startStreaming = () => {
    setLogs([]);
    setError(null);
    setLoading(true);
    setIsStreaming(true);
    intentionallyClosed.current = false;

    const params = new URLSearchParams({
      namespace,
      pod: podName,
      ...(container && { container }),
    });

    const url = `/api/clusters/${clusterId}/logs?${params.toString()}`;

    try {
      const eventSource = new EventSource(url);

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.done) {
            intentionallyClosed.current = true;
            setIsStreaming(false);
            eventSource.close();
          } else if (data.message) {
            setLogs((prev) => [...prev, data.message]);
            setLoading(false);
          } else if (data.error) {
            setError(data.error);
            setLoading(false);
          }
        } catch (err) {
          console.error('Error parsing log message:', err);
        }
      };

      eventSource.onerror = () => {
        if (!intentionallyClosed.current) {
          setError('Connection lost');
        }
        setIsStreaming(false);
        eventSource.close();
      };

      eventSourceRef.current = eventSource;
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to connect to log stream'
      );
      setLoading(false);
      setIsStreaming(false);
    }
  };

  useEffect(() => {
    startStreaming();

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, [clusterId, namespace, podName, container]);

  useEffect(() => {
    if (autoRefresh) {
      autoRefreshRef.current = setInterval(() => {
        startStreaming();
      }, 60000);
    }

    return () => {
      if (autoRefreshRef.current) {
        clearInterval(autoRefreshRef.current);
      }
    };
  }, [autoRefresh, clusterId, namespace, podName, container]);

  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  return (
    <div className="flex flex-col h-full bg-surface-dark rounded-lg border border-lime-dark/30">
      <div className="flex items-center justify-between p-4 border-b border-lime-dark/20">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-lime-accent">Logs</h3>
          {isStreaming && (
            <div className="flex items-center gap-1 text-xs text-lime-accent/70">
              <Loader2 className="h-3 w-3 animate-spin" />
              Streaming
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2 cursor-pointer text-xs text-text-secondary hover:text-text-primary">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="w-3 h-3"
            />
            Auto-refresh
          </label>
          <Button
            variant="ghost"
            size="sm"
            onClick={startStreaming}
            className="text-xs"
          >
            <RotateCcw className="h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 font-mono text-xs bg-surface" style={{ width: '100%', overflowX: 'hidden' }}>
        {loading && logs.length === 0 ? (
          <div className="flex items-center justify-center h-full gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Fetching logs...
          </div>
        ) : error && logs.length === 0 ? (
          <div className="flex items-center gap-2 text-red-400">
            <AlertCircle className="h-4 w-4" />
            <span>{error}</span>
          </div>
        ) : logs.length === 0 ? (
          <div className="text-muted-foreground">No logs available</div>
        ) : (
          <div className="space-y-0">
            {logs.map((log, index) => {
              const { time, rest } = parseLogLine(log);
              const isError = isErrorLog(log);

              return (
                <div
                  key={index}
                  className={`${isError ? 'text-red-400' : 'text-slate-300'}`}
                  style={{
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                    overflowWrap: 'break-word',
                  }}
                >
                  {time && <span className="text-accent">{time}</span>}
                  {rest}
                </div>
              );
            })}
            <div ref={logsEndRef} />
          </div>
        )}
      </div>

      {error && logs.length > 0 && (
        <div className="p-3 bg-red-900/20 border-t border-red-900/30 text-xs text-red-300 flex items-center gap-2">
          <AlertCircle className="h-3 w-3 flex-shrink-0" />
          {error}
        </div>
      )}
    </div>
  );
}

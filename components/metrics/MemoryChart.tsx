'use client';

import { useEffect, useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { parseMetricValue, formatMetricValue } from '@/lib/metrics-utils';

interface ChartDataPoint {
  timestamp: string;
  [key: string]: string | number;
}

interface MemoryChartProps {
  clusterId: string;
  namespace?: string;
  type: 'nodes' | 'pods';
  refreshInterval?: number;
}

export function MemoryChart({
  clusterId,
  namespace,
  type,
  refreshInterval = 5000,
}: MemoryChartProps) {
  const [data, setData] = useState<ChartDataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const params = new URLSearchParams({
          type,
          ...(namespace && { namespace }),
        });

        const response = await fetch(
          `/api/clusters/${clusterId}/metrics?${params.toString()}`
        );

        if (!response.ok) {
          throw new Error('Failed to fetch metrics');
        }

        const result = await response.json();

        if (result.error) {
          setError(result.error);
          setLoading(false);
          return;
        }

        const metrics = result.metrics || [];
        const newDataPoint: ChartDataPoint = {
          timestamp: new Date().toLocaleTimeString(),
        };

        metrics.forEach((metric: any) => {
          const key =
            type === 'nodes' ? metric.name : `${metric.namespace}/${metric.name}`;
          const memValue = parseMetricValue(metric.memory);
          newDataPoint[key] = parseFloat(memValue.toFixed(0));
        });

        setData((prev) => {
          const updated = [...prev, newDataPoint];
          return updated.slice(-20);
        });
        setError(null);
      } catch (err) {
        console.error('Error fetching memory metrics:', err);
        setError(
          err instanceof Error ? err.message : 'Failed to fetch metrics'
        );
      } finally {
        setLoading(false);
      }
    };

    fetchMetrics();
    const interval = setInterval(fetchMetrics, refreshInterval);

    return () => clearInterval(interval);
  }, [clusterId, namespace, type, refreshInterval]);

  if (loading && data.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        Loading memory metrics...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-sm text-text-secondary gap-2">
        <p className="text-center">Metrics Server not available</p>
        <p className="text-xs text-text-secondary/70 max-w-xs text-center">
          Install metrics-server on your cluster to enable memory metrics
        </p>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        No metrics data available
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#333" />
        <XAxis
          dataKey="timestamp"
          stroke="#888"
          tick={{ fontSize: 12 }}
          interval={data.length > 10 ? Math.floor(data.length / 5) : 0}
        />
        <YAxis stroke="#888" tick={{ fontSize: 12 }} />
        <Tooltip
          contentStyle={{
            backgroundColor: '#111118',
            border: '1px solid #333',
            borderRadius: '0.5rem',
          }}
          formatter={(value: any) => {
            if (typeof value === 'number') {
              return formatMetricValue(value, 'memory');
            }
            return value;
          }}
        />
        <Legend />
        {Object.keys(data[0])
          .filter((key) => key !== 'timestamp')
          .map((key, index) => (
            <Line
              key={key}
              type="monotone"
              dataKey={key}
              stroke={
                [
                  '#CCFF00',
                  '#22C55E',
                  '#F59E0B',
                  '#3B82F6',
                  '#8B5CF6',
                ][index % 5]
              }
              dot={false}
              isAnimationActive={false}
            />
          ))}
      </LineChart>
    </ResponsiveContainer>
  );
}

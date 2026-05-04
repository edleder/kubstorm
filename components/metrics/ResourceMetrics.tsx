'use client';

import { useEffect, useState } from 'react';
import { PodInfo } from '@/lib/k8s/pods';
import { DeploymentInfo } from '@/lib/k8s/deployments';

interface ResourceMetric {
  podName: string;
  deploymentName?: string;
  namespace: string;
  cpuUsage: string;
  memoryUsage: string;
  cpuLimit?: string;
  memoryLimit?: string;
}

interface ResourceMetricsProps {
  clusterId: string;
  namespace?: string;
  type: 'pods' | 'deployments';
  pods?: PodInfo[];
  deployments?: DeploymentInfo[];
}

export function ResourceMetrics({
  clusterId,
  namespace,
  type,
  pods = [],
  deployments = [],
}: ResourceMetricsProps) {
  const [metrics, setMetrics] = useState<ResourceMetric[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchMetrics();
  }, [clusterId, namespace, type]);

  const fetchMetrics = async () => {
    if (!namespace) return;

    try {
      setLoading(true);
      const params = new URLSearchParams({
        namespace,
        type,
      });

      const response = await fetch(
        `/api/clusters/${clusterId}/metrics/resources?${params}`,
        { method: 'GET' }
      );

      if (response.ok) {
        const data = await response.json();
        setMetrics(data);
      }
    } catch (err) {
      console.error('Failed to fetch resource metrics:', err);
    } finally {
      setLoading(false);
    }
  };

  const parseResource = (value: string): number => {
    if (!value) return 0;
    if (value.endsWith('m')) return parseInt(value) / 1000;
    if (value.endsWith('Mi')) return parseInt(value);
    if (value.endsWith('Gi')) return parseInt(value) * 1024;
    return parseInt(value);
  };

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b border-border">
            <tr>
              <th className="text-left py-3 px-4 text-text-secondary font-medium">
                {type === 'pods' ? 'Pod Name' : 'Deployment Name'}
              </th>
              {type === 'pods' && (
                <th className="text-left py-3 px-4 text-text-secondary font-medium">
                  Deployment
                </th>
              )}
              <th className="text-left py-3 px-4 text-text-secondary font-medium">
                CPU Usage
              </th>
              <th className="text-left py-3 px-4 text-text-secondary font-medium">
                Memory Usage
              </th>
              <th className="text-left py-3 px-4 text-text-secondary font-medium">
                Status
              </th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={type === 'pods' ? 5 : 4} className="py-4 px-4 text-center text-text-secondary">
                  Loading metrics...
                </td>
              </tr>
            ) : metrics.length === 0 ? (
              <tr>
                <td colSpan={type === 'pods' ? 5 : 4} className="py-4 px-4 text-center text-text-secondary">
                  No metrics available
                </td>
              </tr>
            ) : (
              metrics.map((metric, idx) => {
                const cpuNum = parseResource(metric.cpuUsage);
                const cpuLimit = parseResource(metric.cpuLimit || '1000m');
                const cpuPercent = Math.min((cpuNum / cpuLimit) * 100, 100);

                const memNum = parseResource(metric.memoryUsage);
                const memLimit = parseResource(metric.memoryLimit || '512Mi');
                const memPercent = Math.min((memNum / memLimit) * 100, 100);

                return (
                  <tr key={idx} className="border-b border-border hover:bg-surface/50">
                    <td className="py-3 px-4 text-text-primary font-mono text-xs">
                      {metric.podName}
                    </td>
                    {type === 'pods' && (
                      <td className="py-3 px-4 text-text-secondary text-xs">
                        {metric.deploymentName || '-'}
                      </td>
                    )}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <div className="w-20 bg-surface-dark rounded h-2">
                          <div
                            className={`h-2 rounded transition-all ${
                              cpuPercent > 80
                                ? 'bg-error'
                                : cpuPercent > 50
                                ? 'bg-warning'
                                : 'bg-success'
                            }`}
                            style={{ width: `${cpuPercent}%` }}
                          ></div>
                        </div>
                        <span className="text-xs text-text-secondary w-12">
                          {cpuPercent.toFixed(0)}%
                        </span>
                      </div>
                      <p className="text-xs text-text-secondary mt-1">{metric.cpuUsage}</p>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <div className="w-20 bg-surface-dark rounded h-2">
                          <div
                            className={`h-2 rounded transition-all ${
                              memPercent > 80
                                ? 'bg-error'
                                : memPercent > 50
                                ? 'bg-warning'
                                : 'bg-success'
                            }`}
                            style={{ width: `${memPercent}%` }}
                          ></div>
                        </div>
                        <span className="text-xs text-text-secondary w-12">
                          {memPercent.toFixed(0)}%
                        </span>
                      </div>
                      <p className="text-xs text-text-secondary mt-1">{metric.memoryUsage}</p>
                    </td>
                    <td className="py-3 px-4">
                      {cpuPercent > 80 || memPercent > 80 ? (
                        <span className="px-2 py-1 rounded text-xs font-medium bg-error/20 text-error">
                          High
                        </span>
                      ) : cpuPercent > 50 || memPercent > 50 ? (
                        <span className="px-2 py-1 rounded text-xs font-medium bg-warning/20 text-warning">
                          Medium
                        </span>
                      ) : (
                        <span className="px-2 py-1 rounded text-xs font-medium bg-success/20 text-success">
                          Low
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

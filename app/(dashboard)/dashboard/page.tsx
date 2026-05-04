'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface ClusterMetrics {
  id: string;
  name: string;
  nodes: number;
  readyNodes: number;
  pods: number;
  runningPods: number;
  deployments: number;
  healthyDeployments: number;
}

export default function DashboardPage() {
  const [clusters, setClusters] = useState<ClusterMetrics[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchClusters();
  }, []);

  const fetchClusters = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await fetch('/api/clusters/metrics');
      if (response.ok) {
        const data = await response.json();
        setClusters(data);
      } else {
        setError('Failed to fetch clusters');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch clusters');
    } finally {
      setLoading(false);
    }
  };

  const totalMetrics = {
    nodes: clusters.reduce((sum, c) => sum + c.nodes, 0),
    readyNodes: clusters.reduce((sum, c) => sum + c.readyNodes, 0),
    pods: clusters.reduce((sum, c) => sum + c.pods, 0),
    runningPods: clusters.reduce((sum, c) => sum + c.runningPods, 0),
    deployments: clusters.reduce((sum, c) => sum + c.deployments, 0),
    healthyDeployments: clusters.reduce((sum, c) => sum + c.healthyDeployments, 0),
  };

  if (loading) {
    return <div className="text-text-secondary py-4">Loading dashboard...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-text-primary">Multi-Cluster Dashboard</h1>
        <p className="text-text-secondary mt-1">
          Overview of all your Kubernetes clusters
        </p>
      </div>

      {error && (
        <div className="p-3 bg-error/10 border border-error rounded text-error text-sm">
          {error}
        </div>
      )}

      {/* Total Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="bg-surface-elevated rounded-lg border border-border p-4">
          <p className="text-xs text-text-secondary font-medium mb-2">Total Nodes</p>
          <p className="text-2xl font-bold text-accent">{totalMetrics.nodes}</p>
          <p className="text-xs text-success mt-2">
            {totalMetrics.readyNodes} ready
          </p>
        </div>
        <div className="bg-surface-elevated rounded-lg border border-border p-4">
          <p className="text-xs text-text-secondary font-medium mb-2">Total Pods</p>
          <p className="text-2xl font-bold text-accent">{totalMetrics.pods}</p>
          <p className="text-xs text-success mt-2">
            {totalMetrics.runningPods} running
          </p>
        </div>
        <div className="bg-surface-elevated rounded-lg border border-border p-4">
          <p className="text-xs text-text-secondary font-medium mb-2">Total Deployments</p>
          <p className="text-2xl font-bold text-accent">{totalMetrics.deployments}</p>
          <p className="text-xs text-text-secondary mt-2">
            {totalMetrics.healthyDeployments} healthy
          </p>
        </div>
        <div className="bg-surface-elevated rounded-lg border border-border p-4">
          <p className="text-xs text-text-secondary font-medium mb-2">Node Health</p>
          <p className="text-2xl font-bold text-accent">
            {totalMetrics.nodes > 0
              ? Math.round((totalMetrics.readyNodes / totalMetrics.nodes) * 100)
              : 0}
            %
          </p>
          <p className="text-xs text-text-secondary mt-2">Ready nodes</p>
        </div>
        <div className="bg-surface-elevated rounded-lg border border-border p-4">
          <p className="text-xs text-text-secondary font-medium mb-2">Pod Health</p>
          <p className="text-2xl font-bold text-accent">
            {totalMetrics.pods > 0
              ? Math.round((totalMetrics.runningPods / totalMetrics.pods) * 100)
              : 0}
            %
          </p>
          <p className="text-xs text-text-secondary mt-2">Running pods</p>
        </div>
        <div className="bg-surface-elevated rounded-lg border border-border p-4">
          <p className="text-xs text-text-secondary font-medium mb-2">Deploy Health</p>
          <p className="text-2xl font-bold text-accent">
            {totalMetrics.deployments > 0
              ? Math.round((totalMetrics.healthyDeployments / totalMetrics.deployments) * 100)
              : 0}
            %
          </p>
          <p className="text-xs text-text-secondary mt-2">Healthy deployments</p>
        </div>
      </div>

      {/* Per-Cluster Metrics */}
      <div>
        <h2 className="text-xl font-semibold text-text-primary mb-4">Clusters</h2>
        {clusters.length === 0 ? (
          <div className="p-8 text-center border border-border rounded-lg">
            <p className="text-text-secondary">No clusters configured</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {clusters.map((cluster) => (
              <Link
                key={cluster.id}
                href={`/clusters/${cluster.id}`}
                className="bg-surface-elevated border border-border rounded-lg p-4 hover:border-accent transition-colors cursor-pointer"
              >
                <h3 className="text-lg font-semibold text-accent mb-4">{cluster.name}</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-text-secondary">Nodes</p>
                    <p className="text-lg font-bold text-text-primary">
                      {cluster.readyNodes}/{cluster.nodes}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-text-secondary">Pods</p>
                    <p className="text-lg font-bold text-text-primary">
                      {cluster.runningPods}/{cluster.pods}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-text-secondary">Deployments</p>
                    <p className="text-lg font-bold text-text-primary">
                      {cluster.healthyDeployments}/{cluster.deployments}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-text-secondary">Health</p>
                    <div className="flex gap-1">
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${
                          cluster.nodes > 0 && cluster.readyNodes === cluster.nodes
                            ? 'bg-success/20 text-success'
                            : 'bg-warning/20 text-warning'
                        }`}
                      >
                        {cluster.nodes > 0
                          ? Math.round((cluster.readyNodes / cluster.nodes) * 100)
                          : 0}
                        %
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

'use client';

import Link from 'next/link';
import { KubernetesCluster } from '@/types/k8s';

interface ClusterCardProps {
  cluster: KubernetesCluster;
  onDelete?: (clusterId: string) => void;
}

export function ClusterCard({ cluster, onDelete }: ClusterCardProps) {
  const isHealthy = cluster.lastConnected &&
    new Date().getTime() - new Date(cluster.lastConnected).getTime() < 5 * 60 * 1000;

  return (
    <Link href={`/clusters/${cluster.id}`}>
      <div className="h-48 bg-surface-elevated rounded-lg border border-border p-4 hover:border-accent transition-colors cursor-pointer group flex flex-col">
        <div className="flex justify-between items-start mb-3">
          <div className="min-w-0 flex-1">
            <h3 className="text-base font-semibold text-text-primary group-hover:text-accent transition-colors line-clamp-2">
              {cluster.name}
            </h3>
            <p className="text-xs text-text-secondary capitalize">
              {cluster.provider}
            </p>
          </div>
          <div className="flex items-center gap-1 ml-2 flex-shrink-0">
            <span
              className={`inline-block w-2 h-2 rounded-full ${
                isHealthy ? 'bg-success' : 'bg-warning'
              }`}
            ></span>
            <span className="text-xs text-text-secondary whitespace-nowrap">
              {isHealthy ? 'Healthy' : 'Disconnected'}
            </span>
          </div>
        </div>

        <div className="space-y-1 text-xs mb-3 flex-1 min-w-0">
          {cluster.serverUrl && (
            <div className="flex gap-2 min-w-0">
              <span className="text-text-primary font-medium flex-shrink-0">URL:</span>
              <span className="text-text-secondary truncate">{cluster.serverUrl}</span>
            </div>
          )}
          {cluster.gcpProjectId && (
            <div className="flex gap-2 min-w-0">
              <span className="text-text-primary font-medium flex-shrink-0">GCP Project:</span>
              <span className="text-text-secondary truncate">{cluster.gcpProjectId}</span>
            </div>
          )}
          <div className="flex gap-2">
            <span className="text-text-primary font-medium flex-shrink-0">Created:</span>
            <span className="text-text-secondary">{new Date(cluster.createdAt).toLocaleDateString()}</span>
          </div>
        </div>

        {onDelete && (
          <button
            onClick={(e) => {
              e.preventDefault();
              onDelete(cluster.id);
            }}
            className="w-full py-1 text-xs text-error hover:bg-error/10 rounded transition-colors"
          >
            Delete Cluster
          </button>
        )}
      </div>
    </Link>
  );
}

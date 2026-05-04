'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { AddClusterDialog } from '@/components/clusters/AddClusterDialog';
import { ClusterCard } from '@/components/clusters/ClusterCard';
import { useClusterStore } from '@/store/clusterStore';
import { KubernetesCluster } from '@/types/k8s';

export default function ClustersPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { clusters, setClusters, removeCluster } = useClusterStore();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchClusters();
    checkClustersHealth();
  }, []);

  const fetchClusters = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/clusters');
      if (response.ok) {
        const data = await response.json();
        setClusters(data);
      }
    } catch (error) {
      console.error('Failed to fetch clusters:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkClustersHealth = async () => {
    try {
      const response = await fetch('/api/clusters');
      if (response.ok) {
        const clusterList = await response.json();

        clusterList.forEach(async (cluster: KubernetesCluster) => {
          try {
            await fetch(`/api/clusters/${cluster.id}/health`, {
              method: 'POST',
              signal: AbortSignal.timeout(5000),
            });
          } catch (error) {
            console.debug(`Cluster ${cluster.id} health check failed:`, error);
          }
        });
      }
    } catch (error) {
      console.error('Failed to check clusters health:', error);
    }
  };

  const handleDeleteCluster = async (clusterId: string) => {
    if (!confirm('Are you sure you want to delete this cluster?')) return;

    try {
      const response = await fetch(`/api/clusters/${clusterId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        removeCluster(clusterId);
      }
    } catch (error) {
      console.error('Failed to delete cluster:', error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-text-primary">Clusters</h1>
          <p className="text-text-secondary mt-1">
            {clusters.length} cluster{clusters.length !== 1 ? 's' : ''} connected
          </p>
        </div>
        <Button
          onClick={() => setIsDialogOpen(true)}
          className="bg-accent text-black hover:bg-accent-hover font-medium"
        >
          + Add Cluster
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <p className="text-text-secondary">Loading clusters...</p>
        </div>
      ) : clusters.length === 0 ? (
        <div className="bg-surface-elevated rounded-lg border-2 border-dashed border-border p-12 text-center">
          <p className="text-5xl mb-4">🚀</p>
          <p className="text-text-primary font-medium text-lg mb-2">
            No clusters yet
          </p>
          <p className="text-text-secondary mb-6">
            Connect your first Kubernetes cluster to get started
          </p>
          <Button
            onClick={() => setIsDialogOpen(true)}
            className="bg-accent text-black hover:bg-accent-hover font-medium"
          >
            Add Your First Cluster
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {clusters.map((cluster) => (
            <ClusterCard
              key={cluster.id}
              cluster={cluster}
              onDelete={handleDeleteCluster}
            />
          ))}

          <button
            onClick={() => setIsDialogOpen(true)}
            className="bg-surface-elevated rounded-lg border-2 border-dashed border-border p-6 flex items-center justify-center hover:border-accent transition-colors cursor-pointer group"
          >
            <div className="text-center">
              <p className="text-5xl mb-2 group-hover:text-accent transition-colors">
                +
              </p>
              <p className="text-text-primary font-medium">Add Cluster</p>
              <p className="text-sm text-text-secondary mt-1">
                Connect a new cluster
              </p>
            </div>
          </button>
        </div>
      )}

      <AddClusterDialog open={isDialogOpen} onOpenChange={setIsDialogOpen} />
    </div>
  );
}

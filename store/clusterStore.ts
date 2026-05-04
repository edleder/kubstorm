import { create } from 'zustand';
import { KubernetesCluster } from '@/types/k8s';

interface ClusterStore {
  clusters: KubernetesCluster[];
  selectedClusterId: string | null;
  loading: boolean;
  error: string | null;

  setClusters: (clusters: KubernetesCluster[]) => void;
  setSelectedCluster: (clusterId: string | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  addCluster: (cluster: KubernetesCluster) => void;
  removeCluster: (clusterId: string) => void;
}

export const useClusterStore = create<ClusterStore>((set) => ({
  clusters: [],
  selectedClusterId: null,
  loading: false,
  error: null,

  setClusters: (clusters) => set({ clusters }),
  setSelectedCluster: (clusterId) => set({ selectedClusterId: clusterId }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  addCluster: (cluster) =>
    set((state) => ({
      clusters: [...state.clusters, cluster],
    })),
  removeCluster: (clusterId) =>
    set((state) => ({
      clusters: state.clusters.filter((c) => c.id !== clusterId),
    })),
}));

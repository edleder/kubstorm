export interface KubernetesCluster {
  id: string;
  name: string;
  provider: 'gke' | 'eks' | 'aks' | 'generic';
  serverUrl?: string;
  gcpProjectId?: string;
  createdAt: Date;
  lastConnected?: Date;
}

export interface AddClusterPayload {
  name: string;
  provider: 'gke' | 'eks' | 'aks' | 'generic';
  kubeconfig?: string;
  saToken?: string;
  serverUrl?: string;
  gcpProjectId?: string;
}

export interface ClusterStatus {
  healthy: boolean;
  nodeCouunt: number;
  podCount: number;
  version: string;
}

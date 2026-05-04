'use client';

import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { PodList } from '@/components/k8s/PodList';
import { DeploymentList } from '@/components/k8s/DeploymentList';
import { NodeList } from '@/components/k8s/NodeList';
import { ServiceList } from '@/components/k8s/ServiceList';
import { IngressList } from '@/components/k8s/IngressList';
import { ConfigMapList } from '@/components/k8s/ConfigMapList';
import { SecretList } from '@/components/k8s/SecretList';
import { HPAList } from '@/components/k8s/HPAList';
import { NamespaceManager } from '@/components/k8s/NamespaceManager';
import { EventList } from '@/components/k8s/EventList';
import { PersistentVolumeList } from '@/components/k8s/PersistentVolumeList';
import { HelmReleaseList } from '@/components/k8s/HelmReleaseList';
import { PodLogsViewer } from '@/components/k8s/PodLogsViewer';
import { PodTerminalPanel } from '@/components/k8s/PodTerminalPanel';
import { DeploymentRolloutModal } from '@/components/k8s/DeploymentRolloutModal';
import { PodExec } from '@/components/k8s/PodExec';
import { NamespaceSelector } from '@/components/k8s/NamespaceSelector';
import { ResourceMetrics } from '@/components/metrics/ResourceMetrics';
import { CpuChart } from '@/components/metrics/CpuChart';
import { MemoryChart } from '@/components/metrics/MemoryChart';
import { PodInfo } from '@/lib/k8s/pods';
import { DeploymentInfo } from '@/lib/k8s/deployments';
import { NodeInfo } from '@/lib/k8s/nodes';
import { ServiceInfo } from '@/lib/k8s/services';
import { IngressInfo } from '@/lib/k8s/ingresses';
import { ConfigMapInfo } from '@/lib/k8s/configmaps';
import { SecretInfo } from '@/lib/k8s/secrets';
import { HPAInfo } from '@/lib/k8s/hpa';
import { NamespaceInfo } from '@/lib/k8s/namespaces';
import { EventInfo } from '@/lib/k8s/events';
import { PersistentVolumeInfo, PersistentVolumeClaimInfo } from '@/lib/k8s/persistentvolumes';
import { HelmRelease } from '@/lib/k8s/helm';
import { KubernetesVersion } from '@/lib/k8s/version';
import { CertificateInfo } from '@/lib/k8s/certificates';

type Tab = 'overview' | 'pods' | 'deployments' | 'nodes' | 'services' | 'ingresses' | 'configmaps' | 'secrets' | 'hpa' | 'namespaces' | 'events' | 'pv' | 'pvc' | 'helm' | 'logs' | 'exec' | 'metrics';

function formatClusterName(name: string): string {
  const match = name.match(/^gke_([^_]+)_/);
  if (match) {
    const projectPart = match[1];
    return projectPart.replace('-gcorp', '').slice(0, 40);
  }
  return name.slice(0, 40);
}

export default function ClusterDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const clusterId = params.clusterId as string;

  const [tab, setTab] = useState<Tab>('overview');
  const [namespace, setNamespace] = useState<string>('');
  const [overviewNamespace, setOverviewNamespace] = useState<string[]>([]);
  const [selectedPod, setSelectedPod] = useState<{ name: string; namespace: string } | null>(null);
  const [selectedDeploymentRollout, setSelectedDeploymentRollout] = useState<{ name: string; namespace: string } | null>(null);
  const [clusterName, setClusterName] = useState<string>('');
  const [namespaces, setNamespaces] = useState<NamespaceInfo[]>([]);
  const [pods, setPods] = useState<PodInfo[]>([]);
  const [deployments, setDeployments] = useState<DeploymentInfo[]>([]);
  const [nodes, setNodes] = useState<NodeInfo[]>([]);
  const [services, setServices] = useState<ServiceInfo[]>([]);
  const [ingresses, setIngresses] = useState<IngressInfo[]>([]);
  const [configMaps, setConfigMaps] = useState<ConfigMapInfo[]>([]);
  const [secrets, setSecrets] = useState<SecretInfo[]>([]);
  const [hpaList, setHpaList] = useState<HPAInfo[]>([]);
  const [events, setEvents] = useState<EventInfo[]>([]);
  const [persistentVolumes, setPersistentVolumes] = useState<PersistentVolumeInfo[]>([]);
  const [persistentVolumeClaims, setPersistentVolumeClaims] = useState<PersistentVolumeClaimInfo[]>([]);
  const [helmReleases, setHelmReleases] = useState<HelmRelease[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedPodForShell, setSelectedPodForShell] = useState<{ name: string; namespace: string } | null>(null);
  const [error, setError] = useState('');
  const [k8sVersion, setK8sVersion] = useState<KubernetesVersion | null>(null);
  const [clusterMetrics, setClusterMetrics] = useState<any>(null);
  const [allServices, setAllServices] = useState<ServiceInfo[]>([]);
  const [allIngresses, setAllIngresses] = useState<IngressInfo[]>([]);
  const [certificates, setCertificates] = useState<CertificateInfo[]>([]);
  const [lastSync, setLastSync] = useState<Date | null>(null);

  useEffect(() => {
    const fetchClusterInfo = async () => {
      try {
        const response = await fetch(`/api/clusters/${clusterId}`);
        if (response.ok) {
          const data = await response.json();
          setClusterName(data.name || '');
        }

        await fetch(`/api/clusters/${clusterId}/health`, { method: 'POST' }).catch(() => {});
      } catch (err) {
        console.error('Failed to fetch cluster info:', err);
      }
    };

    fetchClusterInfo();
  }, [clusterId]);

  useEffect(() => {
    const tabFromUrl = searchParams.get('tab');
    if (tabFromUrl) {
      setTab(tabFromUrl as Tab);
    }
  }, [searchParams]);

  useEffect(() => {
    fetchNamespaces();
    fetchNodes();
    fetchAllPods();
    fetchAllDeployments();
    fetchOverviewData();
  }, [clusterId]);

  useEffect(() => {
    fetchOverviewData();
  }, [overviewNamespace]);

  const fetchOverviewData = async () => {
    try {
      const nsParams = overviewNamespace && overviewNamespace.length > 0
        ? `?${overviewNamespace.map((ns) => `namespace=${ns}`).join('&')}`
        : '';
      const [versionRes, certRes, metricsRes, servicesRes, ingressesRes] = await Promise.all([
        fetch(`/api/clusters/${clusterId}/version`),
        fetch(`/api/clusters/${clusterId}/certificates${nsParams}`),
        fetch(`/api/clusters/${clusterId}/metrics/gcp?type=nodes`),
        fetch(`/api/clusters/${clusterId}/services${nsParams}`),
        fetch(`/api/clusters/${clusterId}/ingresses${nsParams}`),
      ]);

      if (versionRes.ok) {
        const versionData = await versionRes.json();
        setK8sVersion(versionData);
      } else {
        console.warn('Failed to fetch version:', versionRes.status);
      }

      if (certRes.ok) {
        const certData = await certRes.json();
        setCertificates(certData.certificates || []);
      } else {
        console.warn('Failed to fetch certificates:', certRes.status);
      }

      if (metricsRes.ok) {
        const metricsData = await metricsRes.json();
        setClusterMetrics(Array.isArray(metricsData) ? metricsData : []);
      } else {
        console.warn('Failed to fetch metrics:', metricsRes.status);
      }

      if (servicesRes.ok) {
        const servicesData = await servicesRes.json();
        setAllServices(Array.isArray(servicesData) ? servicesData : []);
      } else {
        console.warn('Failed to fetch services:', servicesRes.status);
      }

      if (ingressesRes.ok) {
        const ingressesData = await ingressesRes.json();
        setAllIngresses(Array.isArray(ingressesData) ? ingressesData : []);
      } else {
        console.warn('Failed to fetch ingresses:', ingressesRes.status);
      }

      setLastSync(new Date());
    } catch (err) {
      console.error('Failed to fetch overview data:', err);
    }
  };

  useEffect(() => {
    if (tab === 'pods' || tab === 'logs') fetchPods();
    else if (tab === 'deployments') fetchDeployments();
    else if (tab === 'services') fetchServices();
    else if (tab === 'ingresses') fetchIngresses();
    else if (tab === 'configmaps') fetchConfigMaps();
    else if (tab === 'secrets') fetchSecrets();
    else if (tab === 'hpa') fetchHPA();
    else if (tab === 'namespaces') fetchNamespacesForTab();
    else if (tab === 'events') fetchEvents();
    else if (tab === 'pv') fetchPersistentVolumes();
    else if (tab === 'pvc') fetchPersistentVolumeClaims();
    else if (tab === 'helm') fetchHelmReleases();
  }, [tab, namespace]);

  const fetchNamespaces = async () => {
    try {
      const response = await fetch(`/api/clusters/${clusterId}/namespaces`);
      if (response.ok) {
        const data = await response.json();
        setNamespaces(data);
      }
    } catch (err) {
      console.error('Failed to fetch namespaces:', err);
    }
  };

  const fetchNodes = async () => {
    try {
      const response = await fetch(`/api/clusters/${clusterId}/nodes`);
      if (response.ok) {
        const data = await response.json();
        setNodes(data);
      }
    } catch (err) {
      console.error('Failed to fetch nodes:', err);
    }
  };

  const fetchAllPods = async () => {
    try {
      const response = await fetch(`/api/clusters/${clusterId}/pods`);
      if (response.ok) {
        const data = await response.json();
        setPods(data);
      }
    } catch (err) {
      console.error('Failed to fetch pods:', err);
    }
  };

  const fetchPods = async () => {
    try {
      setLoading(true);
      setError('');
      const params = new URLSearchParams();
      if (namespace) params.append('namespace', namespace);
      const url = `/api/clusters/${clusterId}/pods${params.toString() ? `?${params.toString()}` : ''}`;
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setPods(data);
      } else {
        const errorData = await response.json().catch(() => ({}));
        setError(errorData.error || `Failed to fetch pods (${response.status})`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch pods');
    } finally {
      setLoading(false);
    }
  };

  const fetchAllDeployments = async () => {
    try {
      const response = await fetch(`/api/clusters/${clusterId}/deployments`);
      if (response.ok) {
        const data = await response.json();
        setDeployments(data);
      }
    } catch (err) {
      console.error('Failed to fetch deployments:', err);
    }
  };

  const fetchDeployments = async () => {
    try {
      setLoading(true);
      setError('');
      const params = new URLSearchParams();
      if (namespace) params.append('namespace', namespace);
      const url = `/api/clusters/${clusterId}/deployments${params.toString() ? `?${params.toString()}` : ''}`;
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setDeployments(data);
      } else {
        setError('Failed to fetch deployments');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch deployments');
    } finally {
      setLoading(false);
    }
  };

  const fetchServices = async () => {
    try {
      setLoading(true);
      setError('');
      const params = new URLSearchParams();
      if (namespace) params.append('namespace', namespace);
      const url = `/api/clusters/${clusterId}/services${params.toString() ? `?${params.toString()}` : ''}`;
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setServices(data);
      } else {
        setError('Failed to fetch services');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch services');
    } finally {
      setLoading(false);
    }
  };

  const fetchIngresses = async () => {
    try {
      setLoading(true);
      setError('');
      const params = new URLSearchParams();
      if (namespace) params.append('namespace', namespace);
      const url = `/api/clusters/${clusterId}/ingresses${params.toString() ? `?${params.toString()}` : ''}`;
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setIngresses(data);
      } else {
        setError('Failed to fetch ingresses');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch ingresses');
    } finally {
      setLoading(false);
    }
  };

  const fetchConfigMaps = async () => {
    try {
      setLoading(true);
      setError('');
      const params = new URLSearchParams();
      if (namespace) params.append('namespace', namespace);
      const url = `/api/clusters/${clusterId}/configmaps${params.toString() ? `?${params.toString()}` : ''}`;
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setConfigMaps(data);
      } else {
        setError('Failed to fetch config maps');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch config maps');
    } finally {
      setLoading(false);
    }
  };

  const fetchSecrets = async () => {
    try {
      setLoading(true);
      setError('');
      const params = new URLSearchParams();
      if (namespace) params.append('namespace', namespace);
      const url = `/api/clusters/${clusterId}/secrets${params.toString() ? `?${params.toString()}` : ''}`;
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setSecrets(data);
      } else {
        setError('Failed to fetch secrets');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch secrets');
    } finally {
      setLoading(false);
    }
  };

  const fetchHPA = async () => {
    try {
      setLoading(true);
      setError('');
      const params = new URLSearchParams();
      if (namespace) params.append('namespace', namespace);
      const url = `/api/clusters/${clusterId}/hpa${params.toString() ? `?${params.toString()}` : ''}`;
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setHpaList(data);
      } else {
        setError('Failed to fetch HPA');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch HPA');
    } finally {
      setLoading(false);
    }
  };

  const fetchNamespacesForTab = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await fetch(`/api/clusters/${clusterId}/namespace-manager`);
      if (response.ok) {
        const data = await response.json();
        setNamespaces(data);
      } else {
        setError('Failed to fetch namespaces');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch namespaces');
    } finally {
      setLoading(false);
    }
  };

  const fetchEvents = async () => {
    try {
      setLoading(true);
      setError('');
      const params = new URLSearchParams();
      if (namespace) params.append('namespace', namespace);
      const url = `/api/clusters/${clusterId}/events${params.toString() ? `?${params.toString()}` : ''}`;
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setEvents(data);
      } else {
        setError('Failed to fetch events');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch events');
    } finally {
      setLoading(false);
    }
  };

  const fetchPersistentVolumes = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await fetch(`/api/clusters/${clusterId}/persistent-volumes`);
      if (response.ok) {
        const data = await response.json();
        setPersistentVolumes(data);
      } else {
        setError('Failed to fetch persistent volumes');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch persistent volumes');
    } finally {
      setLoading(false);
    }
  };

  const fetchPersistentVolumeClaims = async () => {
    try {
      setLoading(true);
      setError('');
      const params = new URLSearchParams();
      params.append('type', 'pvc');
      if (namespace) params.append('namespace', namespace);
      const url = `/api/clusters/${clusterId}/persistent-volumes?${params.toString()}`;
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setPersistentVolumeClaims(data);
      } else {
        setError('Failed to fetch persistent volume claims');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch persistent volume claims');
    } finally {
      setLoading(false);
    }
  };

  const fetchHelmReleases = async () => {
    try {
      setLoading(true);
      setError('');
      const params = new URLSearchParams();
      if (namespace) params.append('namespace', namespace);
      const url = `/api/clusters/${clusterId}/helm${params.toString() ? `?${params.toString()}` : ''}`;
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setHelmReleases(data);
      } else {
        setError('Failed to fetch helm releases');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch helm releases');
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePod = async (podName: string, podNamespace: string) => {
    if (!confirm(`Delete pod ${podName}?`)) return;
    try {
      const response = await fetch(`/api/clusters/${clusterId}/pods`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ namespace: podNamespace, podName }),
      });
      if (response.ok) {
        fetchPods();
      }
    } catch (err) {
      console.error('Failed to delete pod:', err);
    }
  };

  const handleOpenShell = (podName: string, namespace: string) => {
    setSelectedPodForShell({ name: podName, namespace });
  };

  const handleOpenLogs = (podName: string, namespace: string) => {
    setSelectedPod({ name: podName, namespace });
  };

  const handleScaleDeployment = async (deploymentName: string, deploymentNamespace: string, currentReplicas: number) => {
    const newReplicas = prompt(`Scale ${deploymentName} to how many replicas?`, currentReplicas.toString());
    if (!newReplicas) return;

    try {
      const response = await fetch(`/api/clusters/${clusterId}/deployments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'scale',
          namespace: deploymentNamespace,
          deploymentName,
          replicas: parseInt(newReplicas),
        }),
      });
      if (response.ok) {
        fetchDeployments();
      }
    } catch (err) {
      console.error('Failed to scale deployment:', err);
    }
  };

  const handleDeleteDeployment = async (deploymentName: string, deploymentNamespace: string) => {
    if (!confirm(`Delete deployment ${deploymentName}?`)) return;
    try {
      const response = await fetch(`/api/clusters/${clusterId}/deployments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'delete',
          namespace: deploymentNamespace,
          deploymentName,
        }),
      });
      if (response.ok) {
        fetchDeployments();
      }
    } catch (err) {
      console.error('Failed to delete deployment:', err);
    }
  };

const tabs: { id: Tab; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'nodes', label: 'Nodes' },
    { id: 'pods', label: 'Pods' },
    { id: 'deployments', label: 'Deployments' },
    { id: 'services', label: 'Services' },
    { id: 'ingresses', label: 'Ingresses' },
    { id: 'configmaps', label: 'Config Maps' },
    { id: 'secrets', label: 'Secrets' },
    { id: 'hpa', label: 'HPA' },
    { id: 'namespaces', label: 'Namespaces' },
    { id: 'events', label: 'Events' },
    { id: 'pv', label: 'Persistent Volumes' },
    { id: 'pvc', label: 'PVC' },
    { id: 'helm', label: 'Helm Releases' },
    { id: 'exec', label: 'Pod Exec' },
    { id: 'metrics', label: 'Metrics' },
    { id: 'logs', label: 'Logs' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-text-primary">Cluster Resources</h1>
      </div>


      {/* Namespace Selector */}
      {(tab === 'pods' || tab === 'deployments' || tab === 'services' || tab === 'ingresses' || tab === 'configmaps' || tab === 'secrets' || tab === 'hpa' || tab === 'events' || tab === 'pvc' || tab === 'logs' || tab === 'metrics') && (
        <NamespaceSelector namespaces={namespaces} value={namespace} onChange={setNamespace} />
      )}

      {/* Error Message */}
      {error && (
        <div className="p-3 bg-error/10 border border-error rounded text-error text-sm">
          {error}
        </div>
      )}

      {/* Content */}
      <div className="bg-surface-elevated rounded-lg border border-border p-3">
        {tab === 'overview' && (() => {
          const overviewPods = overviewNamespace && overviewNamespace.length > 0
            ? pods.filter((p) => overviewNamespace.includes(p.namespace))
            : pods;
          const overviewDeployments = overviewNamespace && overviewNamespace.length > 0
            ? deployments.filter((d) => overviewNamespace.includes(d.namespace))
            : deployments;
          const overviewNodes = overviewNamespace && overviewNamespace.length > 0
            ? nodes.filter((n) => overviewPods.some((p) => p.node === n.name))
            : nodes;

          return (
          <div className="space-y-3">
            <NamespaceSelector namespaces={namespaces} value={overviewNamespace} onChange={setOverviewNamespace} multi={true} />

            <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
              <div className="bg-surface rounded-lg border border-border p-3">
                <p className="text-xs text-text-secondary font-medium mb-1">Total Nodes</p>
                <p className="text-2xl font-bold text-accent">{overviewNodes.length}</p>
                <p className="text-xs text-success mt-1">
                  {overviewNodes.filter((n) => n.status === 'Ready').length} ready
                </p>
              </div>
              <div className="bg-surface rounded-lg border border-border p-3">
                <p className="text-xs text-text-secondary font-medium mb-1">Total Pods</p>
                <p className="text-2xl font-bold text-accent">{overviewPods.length}</p>
                <p className="text-xs text-success mt-1">
                  {overviewPods.filter((p) => p.phase === 'Running').length} running
                </p>
              </div>
              <div className="bg-surface rounded-lg border border-border p-3">
                <p className="text-xs text-text-secondary font-medium mb-1">Deployments</p>
                <p className="text-2xl font-bold text-accent">{overviewDeployments.length}</p>
                <p className="text-xs text-text-secondary mt-1">
                  {overviewDeployments.filter((d) => d.ready === d.replicas).length} healthy
                </p>
              </div>
              <div className="bg-surface rounded-lg border border-border p-3">
                <p className="text-xs text-text-secondary font-medium mb-1">Namespaces</p>
                <p className="text-2xl font-bold text-accent">{namespaces.length}</p>
                <p className="text-xs text-text-secondary mt-1">Total in cluster</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
              <div className="flex flex-col">
                <h3 className="text-sm font-semibold text-text-primary mb-1">Pod Status</h3>
                <div className="bg-surface rounded-lg border border-border p-3 space-y-1 flex-1">
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm text-text-secondary">Running</span>
                      <span className="text-lg font-bold text-success">
                        {overviewPods.filter((p) => p.phase === 'Running').length}
                      </span>
                    </div>
                    <div className="w-full bg-surface-dark rounded h-2">
                      <div
                        className="bg-success h-2 rounded"
                        style={{
                          width: `${overviewPods.length > 0 ? (overviewPods.filter((p) => p.phase === 'Running').length / overviewPods.length) * 100 : 0}%`,
                        }}
                      ></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm text-text-secondary">Pending</span>
                      <span className="text-lg font-bold text-warning">
                        {overviewPods.filter((p) => p.phase === 'Pending').length}
                      </span>
                    </div>
                    <div className="w-full bg-surface-dark rounded h-2">
                      <div
                        className="bg-warning h-2 rounded"
                        style={{
                          width: `${overviewPods.length > 0 ? (overviewPods.filter((p) => p.phase === 'Pending').length / overviewPods.length) * 100 : 0}%`,
                        }}
                      ></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm text-text-secondary">Failed</span>
                      <span className="text-lg font-bold text-error">
                        {overviewPods.filter((p) => p.phase === 'Failed').length}
                      </span>
                    </div>
                    <div className="w-full bg-surface-dark rounded h-2">
                      <div
                        className="bg-error h-2 rounded"
                        style={{
                          width: `${overviewPods.length > 0 ? (overviewPods.filter((p) => p.phase === 'Failed').length / overviewPods.length) * 100 : 0}%`,
                        }}
                      ></div>
                    </div>
                  </div>
                  <div className="h-px bg-border my-2"></div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-text-primary">Total Restarts</span>
                    <span className="text-lg font-bold text-text-primary">
                      {overviewPods.reduce((sum, p) => sum + p.restarts, 0)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col">
                <h3 className="text-sm font-semibold text-text-primary mb-1">Resources</h3>
                <div className="space-y-1 flex-1 flex flex-col">
                  <div className="bg-surface rounded-lg border border-border p-3 flex-1 flex flex-col justify-center">
                    <p className="text-xs text-text-secondary mb-1">Deployment Health</p>
                    <div className="text-2xl font-bold text-accent">
                      {overviewDeployments.length > 0
                        ? Math.round(
                            (overviewDeployments.filter((d) => d.ready === d.replicas).length /
                              overviewDeployments.length) *
                              100
                          )
                        : 0}%
                    </div>
                    <p className="text-xs text-text-secondary mt-1">
                      {overviewDeployments.filter((d) => d.ready === d.replicas).length} of{' '}
                      {overviewDeployments.length} healthy
                    </p>
                  </div>
                  <div className="bg-surface rounded-lg border border-border p-3 flex-1 flex flex-col justify-center">
                    <p className="text-xs text-text-secondary mb-1">Node Status</p>
                    <div className="text-2xl font-bold text-accent">
                      {overviewNodes.length > 0
                        ? Math.round(
                            (overviewNodes.filter((n) => n.status === 'Ready').length / overviewNodes.length) *
                              100
                          )
                        : 0}%
                    </div>
                    <p className="text-xs text-text-secondary mt-1">
                      {overviewNodes.filter((n) => n.status === 'Ready').length} of {overviewNodes.length} ready
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* New Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2">
              {/* CPU Usage */}
              <div className="bg-surface rounded-lg border border-border p-3">
                <p className="text-xs text-text-secondary font-medium mb-1">CPU Usage</p>
                <div className="text-2xl font-bold text-accent">
                  {clusterMetrics && clusterMetrics.length > 0
                    ? (() => {
                        const totalUsage = clusterMetrics.reduce((sum: number, m: any) => sum + (m.cpuUsage || 0), 0);
                        const totalLimit = clusterMetrics.reduce((sum: number, m: any) => sum + (m.cpuLimit || 0), 0);
                        return totalLimit > 0 ? Math.round((totalUsage / totalLimit) * 100) : 0;
                      })()
                    : 0}%
                </div>
                <p className="text-xs text-text-secondary mt-1">of cluster capacity</p>
              </div>

              {/* Memory Usage */}
              <div className="bg-surface rounded-lg border border-border p-3">
                <p className="text-xs text-text-secondary font-medium mb-1">Memory Usage</p>
                <div className="text-2xl font-bold text-accent">
                  {clusterMetrics && clusterMetrics.length > 0
                    ? (() => {
                        const totalUsage = clusterMetrics.reduce((sum: number, m: any) => sum + (m.memoryUsage || 0), 0);
                        const totalLimit = clusterMetrics.reduce((sum: number, m: any) => sum + (m.memoryLimit || 0), 0);
                        return totalLimit > 0 ? Math.round((totalUsage / totalLimit) * 100) : 0;
                      })()
                    : 0}%
                </div>
                <p className="text-xs text-text-secondary mt-1">of cluster capacity</p>
              </div>

              {/* Kubernetes Version */}
              <div className="bg-surface rounded-lg border border-border p-3">
                <p className="text-xs text-text-secondary font-medium mb-1">Kubernetes Version</p>
                <p className="text-lg font-bold text-accent">
                  {k8sVersion?.serverVersion ? k8sVersion.serverVersion : '-'}
                </p>
                <p className="text-xs text-text-secondary mt-1">API Server</p>
              </div>

              {/* Last Sync */}
              <div className="bg-surface rounded-lg border border-border p-3">
                <p className="text-xs text-text-secondary font-medium mb-1">Last Sync</p>
                <p className="text-lg font-bold text-accent">
                  {lastSync
                    ? lastSync.toLocaleTimeString('pt-BR', {
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      })
                    : 'Not synced'}
                </p>
                <p className="text-xs text-text-secondary mt-1">
                  {lastSync ? new Date().toLocaleDateString('pt-BR') : '-'}
                </p>
              </div>
            </div>

            {/* Problems/Alerts */}
            <div className="bg-surface rounded-lg border border-border p-3">
              <h3 className="text-sm font-semibold text-text-primary mb-1">Status de Problemas</h3>
              <div className="space-y-1">
                {overviewPods.filter((p) => p.phase === 'Failed').length > 0 && (
                  <div className="flex items-center gap-3 p-3 bg-error/10 rounded border border-error/20">
                    <span className="text-error font-medium">⚠</span>
                    <span className="text-sm text-error">
                      {overviewPods.filter((p) => p.phase === 'Failed').length} pods failed
                    </span>
                  </div>
                )}
                {overviewPods.filter((p) => p.phase === 'Pending').length > 0 && (
                  <div className="flex items-center gap-3 p-3 bg-warning/10 rounded border border-warning/20">
                    <span className="text-warning font-medium">⚠</span>
                    <span className="text-sm text-warning">
                      {overviewPods.filter((p) => p.phase === 'Pending').length} pods pending
                    </span>
                  </div>
                )}
                {overviewNodes.filter((n) => n.status !== 'Ready').length > 0 && (
                  <div className="flex items-center gap-3 p-3 bg-error/10 rounded border border-error/20">
                    <span className="text-error font-medium">⚠</span>
                    <span className="text-sm text-error">
                      {overviewNodes.filter((n) => n.status !== 'Ready').length} nodes not ready
                    </span>
                  </div>
                )}
                {overviewPods.filter((p) => p.phase === 'Failed').length === 0 &&
                  overviewPods.filter((p) => p.phase === 'Pending').length === 0 &&
                  overviewNodes.filter((n) => n.status !== 'Ready').length === 0 && (
                    <div className="flex items-center gap-3 p-3 bg-success/10 rounded border border-success/20">
                      <span className="text-success font-medium">✓</span>
                      <span className="text-sm text-success">All systems operational</span>
                    </div>
                  )}
              </div>
            </div>

            {/* Services & Ingresses & Certificates */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              <div className="bg-surface rounded-lg border border-border p-3">
                <h3 className="text-sm font-semibold text-text-primary mb-1">Services</h3>
                <div className="space-y-1">
                  <div className="flex justify-between items-center pb-2 border-b border-border">
                    <span className="text-xs text-text-secondary">Total</span>
                    <span className="text-lg font-bold text-accent">{allServices.length}</span>
                  </div>
                  <div className="flex justify-between items-center pb-2 border-b border-border">
                    <span className="text-xs text-text-secondary">LB</span>
                    <span className="text-sm font-bold text-text-primary">
                      {allServices.filter((s) => s.type === 'LoadBalancer').length}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-text-secondary">External IPs</span>
                    <span className="text-sm font-bold text-text-primary">
                      {allServices.filter((s) => s.externalIP).length}
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-surface rounded-lg border border-border p-3">
                <h3 className="text-sm font-semibold text-text-primary mb-1">Ingresses</h3>
                <div className="space-y-1">
                  <div className="flex justify-between items-center pb-2 border-b border-border">
                    <span className="text-xs text-text-secondary">Total</span>
                    <span className="text-lg font-bold text-accent">{allIngresses.length}</span>
                  </div>
                  <div className="flex justify-between items-center pb-2 border-b border-border">
                    <span className="text-xs text-text-secondary">Hosts</span>
                    <span className="text-sm font-bold text-text-primary">
                      {new Set(allIngresses.flatMap((ing) => ing.hosts || [])).size}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-text-secondary">With IP</span>
                    <span className="text-sm font-bold text-success">
                      {allIngresses.filter((ing) => ing.ingressIP).length}
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-surface rounded-lg border border-border p-3">
                <h3 className="text-sm font-semibold text-text-primary mb-1">TLS Certs</h3>
                {certificates.length === 0 ? (
                  <p className="text-text-secondary text-xs">No certs</p>
                ) : (
                  <div className="space-y-1 max-h-36 overflow-y-auto">
                    {certificates
                      .filter((cert) => cert.daysUntilExpiry < 30)
                      .map((cert) => (
                        <div
                          key={`${cert.namespace}-${cert.name}`}
                          className={`p-1 rounded border text-xs ${
                            cert.isExpired
                              ? 'bg-error/10 border-error/50'
                              : cert.daysUntilExpiry < 7
                                ? 'bg-error/10 border-error/50'
                                : 'bg-warning/10 border-warning/50'
                          }`}
                        >
                          <div className="flex justify-between items-center">
                            <span className="font-medium truncate text-xs">
                              {cert.name}
                            </span>
                            <span
                              className={`text-xs font-bold ml-1 whitespace-nowrap ${
                                cert.isExpired
                                  ? 'text-error'
                                  : cert.daysUntilExpiry < 7
                                    ? 'text-error'
                                    : 'text-warning'
                              }`}
                            >
                              {cert.isExpired
                                ? 'EXP'
                                : `${cert.daysUntilExpiry}d`}
                            </span>
                          </div>
                        </div>
                      ))}
                    {certificates.filter((c) => c.daysUntilExpiry < 30).length === 0 && (
                      <p className="text-text-secondary text-xs">
                        All valid
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
          );
        })()}

        {tab === 'nodes' && <NodeList nodes={nodes} loading={loading} />}

        {tab === 'pods' && (
          <div className="space-y-4">
            {selectedPod ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-text-primary">
                      {selectedPod.name}
                    </h3>
                    <span className="text-xs text-text-secondary">
                      ({selectedPod.namespace})
                    </span>
                  </div>
                  <button
                    onClick={() => setSelectedPod(null)}
                    className="px-3 py-2 bg-surface border border-border rounded text-sm text-text-primary hover:bg-surface-dark transition-colors"
                  >
                    ← Back to Pods
                  </button>
                </div>
                <div style={{ height: '600px' }}>
                  <PodLogsViewer
                    clusterId={clusterId}
                    namespace={selectedPod.namespace}
                    podName={selectedPod.name}
                  />
                </div>
              </div>
            ) : (
              <PodList pods={pods} loading={loading} onDeletePod={handleDeletePod} onOpenShell={handleOpenShell} onOpenLogs={handleOpenLogs} />
            )}
          </div>
        )}

        {tab === 'deployments' && (
          <DeploymentList
            deployments={deployments}
            loading={loading}
            error={error}
            clusterId={clusterId}
            namespace={namespace}
            onResourceUpdated={fetchDeployments}
            onShowRollout={(deploymentName, ns) =>
              setSelectedDeploymentRollout({ name: deploymentName, namespace: ns })
            }
          />
        )}

        {tab === 'services' && <ServiceList services={services} loading={loading} />}

        {tab === 'ingresses' && <IngressList ingresses={ingresses} loading={loading} />}

        {tab === 'configmaps' && (
          <ConfigMapList
            configMaps={configMaps}
            loading={loading}
            error={error}
            clusterId={clusterId}
            onResourceUpdated={fetchConfigMaps}
          />
        )}

        {tab === 'secrets' && (
          <SecretList
            secrets={secrets}
            loading={loading}
            error={error}
            clusterId={clusterId}
            onResourceUpdated={fetchSecrets}
          />
        )}

        {tab === 'hpa' && (
          <HPAList
            hpaList={hpaList}
            loading={loading}
            error={error}
            clusterId={clusterId}
            onResourceUpdated={fetchHPA}
          />
        )}

        {tab === 'namespaces' && (
          <NamespaceManager
            namespaces={namespaces}
            loading={loading}
            error={error}
            clusterId={clusterId}
            onNamespaceCreated={fetchNamespacesForTab}
          />
        )}

        {tab === 'events' && (
          <EventList
            events={events}
            loading={loading}
            error={error}
          />
        )}

        {tab === 'pv' && (
          <PersistentVolumeList
            volumes={persistentVolumes}
            loading={loading}
            error={error}
            type="pv"
          />
        )}

        {tab === 'pvc' && (
          <PersistentVolumeList
            claims={persistentVolumeClaims}
            loading={loading}
            error={error}
            type="pvc"
          />
        )}

        {tab === 'helm' && (
          <HelmReleaseList
            releases={helmReleases}
            loading={loading}
            error={error}
          />
        )}

        {tab === 'metrics' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-text-primary mb-4">Node Metrics</h2>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-surface rounded-lg border border-border p-4" style={{ height: '300px' }}>
                  <CpuChart clusterId={clusterId} type="nodes" />
                </div>
                <div className="bg-surface rounded-lg border border-border p-4" style={{ height: '300px' }}>
                  <MemoryChart clusterId={clusterId} type="nodes" />
                </div>
              </div>
            </div>

            {namespace && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-semibold text-text-primary mb-4">Pod Metrics ({namespace})</h2>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="bg-surface rounded-lg border border-border p-4" style={{ height: '300px' }}>
                      <CpuChart clusterId={clusterId} namespace={namespace} type="pods" />
                    </div>
                    <div className="bg-surface rounded-lg border border-border p-4" style={{ height: '300px' }}>
                      <MemoryChart clusterId={clusterId} namespace={namespace} type="pods" />
                    </div>
                  </div>
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-text-primary mb-4">Resource Usage</h2>
                  <div className="bg-surface rounded-lg border border-border p-4">
                    <ResourceMetrics
                      clusterId={clusterId}
                      namespace={namespace}
                      type="pods"
                      pods={pods}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {tab === 'logs' && (
          <div className="space-y-4">
            {!selectedPod ? (
              <div>
                <p className="text-text-secondary mb-4">Select a pod to view its logs</p>
                <div className="bg-surface rounded-lg border border-border">
                  <PodList
                    pods={pods}
                    loading={loading}
                    onSelectPod={(pod) =>
                      setSelectedPod({ name: pod.name, namespace: pod.namespace })
                    }
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <button
                  onClick={() => setSelectedPod(null)}
                  className="px-3 py-2 bg-surface border border-border rounded text-sm text-text-primary hover:bg-surface-dark transition-colors"
                >
                  ← Back to Pod List
                </button>
                <div style={{ height: '600px' }}>
                  <PodLogsViewer
                    clusterId={clusterId}
                    namespace={selectedPod.namespace}
                    podName={selectedPod.name}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {tab === 'exec' && selectedPod ? (
          <div className="space-y-4">
            <button
              onClick={() => setSelectedPod(null)}
              className="px-3 py-2 bg-surface border border-border rounded text-sm text-text-primary hover:bg-surface-dark transition-colors"
            >
              ← Back to Pod List
            </button>
            <div className="bg-surface rounded-lg border border-border p-4">
              <h3 className="text-lg font-semibold text-text-primary mb-4">
                Execute Command: {selectedPod.name}
              </h3>
              <PodExec
                clusterId={clusterId}
                namespace={selectedPod.namespace}
                podName={selectedPod.name}
              />
            </div>
          </div>
        ) : tab === 'exec' ? (
          <div>
            <p className="text-text-secondary mb-4">Select a pod to execute commands</p>
            <div className="bg-surface rounded-lg border border-border">
              <PodList
                pods={pods}
                loading={loading}
                onSelectPod={(pod) =>
                  setSelectedPod({ name: pod.name, namespace: pod.namespace })
                }
              />
            </div>
          </div>
        ) : null}
      </div>

{selectedDeploymentRollout && (
        <DeploymentRolloutModal
          isOpen={!!selectedDeploymentRollout}
          deploymentName={selectedDeploymentRollout.name}
          namespace={selectedDeploymentRollout.namespace}
          clusterId={clusterId}
          onClose={() => setSelectedDeploymentRollout(null)}
          onRollback={fetchDeployments}
        />
      )}

      <PodTerminalPanel clusterId={clusterId} activePod={selectedPodForShell || undefined} />
    </div>
  );
}

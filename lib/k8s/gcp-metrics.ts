import { MetricServiceClient } from '@google-cloud/monitoring';

interface NodeMetric {
  podName: string;
  cpuUsage: string;
  memoryUsage: string;
  cpuLimit: string;
  memoryLimit: string;
}

interface PodMetric {
  podName: string;
  cpuUsage: string;
  memoryUsage: string;
  namespace: string;
}

export async function getGCPNodeMetrics(projectId: string): Promise<NodeMetric[]> {
  try {
    const client = new MetricServiceClient();

    const now = new Date();
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);

    const interval = {
      endTime: { seconds: Math.floor(now.getTime() / 1000) },
      startTime: { seconds: Math.floor(fiveMinutesAgo.getTime() / 1000) },
    };

    // Query CPU metrics
    const cpuRequest = {
      name: client.projectPath(projectId),
      filter: `resource.type="k8s_node" AND metric.type="kubernetes.io/node/cpu/core_usage_time"`,
      interval,
    };

    // Query Memory metrics
    const memoryRequest = {
      name: client.projectPath(projectId),
      filter: `resource.type="k8s_node" AND metric.type="kubernetes.io/node/memory/used_bytes"`,
      interval,
    };

    const [cpuResult] = await client.listTimeSeries(cpuRequest);
    const [memoryResult] = await client.listTimeSeries(memoryRequest);

    const metrics: NodeMetric[] = [];
    const nodeMap = new Map<string, any>();

    // Process CPU metrics
    for (const series of cpuResult || []) {
      const nodeName = series.resource?.labels?.node_name;
      const cpuValue = series.points?.[0]?.value?.doubleValue;
      if (nodeName && cpuValue !== undefined && cpuValue !== null) {
        if (!nodeMap.has(nodeName)) {
          nodeMap.set(nodeName, {});
        }
        const data = nodeMap.get(nodeName);
        if (data) {
          data.cpuUsage = `${Math.round(cpuValue * 100)}m`;
        }
      }
    }

    // Process Memory metrics
    for (const series of memoryResult || []) {
      const nodeName = series.resource?.labels?.node_name;
      const memValue = series.points?.[0]?.value?.int64Value;
      if (nodeName && memValue !== undefined && memValue !== null) {
        if (!nodeMap.has(nodeName)) {
          nodeMap.set(nodeName, {});
        }
        const data = nodeMap.get(nodeName);
        if (data) {
          const memoryBytes = Number(memValue);
          data.memoryUsage = `${Math.round(memoryBytes / 1024 / 1024)}Mi`;
        }
      }
    }

    // Convert to array format expected by frontend
    for (const [nodeName, data] of nodeMap.entries()) {
      metrics.push({
        podName: nodeName,
        cpuUsage: data.cpuUsage || '0m',
        memoryUsage: data.memoryUsage || '0Mi',
        cpuLimit: '0m', // GCP doesn't provide limits directly
        memoryLimit: '0Mi',
      });
    }

    return metrics;
  } catch (error) {
    console.error('Error fetching GCP node metrics:', error);
    return [];
  }
}

export async function getGCPPodMetrics(projectId: string, namespace: string): Promise<PodMetric[]> {
  try {
    const client = new MetricServiceClient();

    const now = new Date();
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);

    const interval = {
      endTime: { seconds: Math.floor(now.getTime() / 1000) },
      startTime: { seconds: Math.floor(fiveMinutesAgo.getTime() / 1000) },
    };

    // Query CPU metrics
    const cpuRequest = {
      name: client.projectPath(projectId),
      filter: `resource.type="k8s_pod" AND resource.labels.namespace_name="${namespace}" AND metric.type="kubernetes.io/pod/cpu/core_usage_time"`,
      interval,
    };

    // Query Memory metrics
    const memoryRequest = {
      name: client.projectPath(projectId),
      filter: `resource.type="k8s_pod" AND resource.labels.namespace_name="${namespace}" AND metric.type="kubernetes.io/pod/memory/used_bytes"`,
      interval,
    };

    const [cpuResult] = await client.listTimeSeries(cpuRequest);
    const [memoryResult] = await client.listTimeSeries(memoryRequest);

    const metrics: PodMetric[] = [];
    const podMap = new Map<string, any>();

    // Process CPU metrics
    for (const series of cpuResult || []) {
      const podName = series.resource?.labels?.pod_name;
      const cpuValue = series.points?.[0]?.value?.doubleValue;
      if (podName && cpuValue !== undefined && cpuValue !== null) {
        if (!podMap.has(podName)) {
          podMap.set(podName, { namespace });
        }
        const data = podMap.get(podName);
        if (data) {
          data.cpuUsage = `${Math.round(cpuValue * 100)}m`;
        }
      }
    }

    // Process Memory metrics
    for (const series of memoryResult || []) {
      const podName = series.resource?.labels?.pod_name;
      const memValue = series.points?.[0]?.value?.int64Value;
      if (podName && memValue !== undefined && memValue !== null) {
        if (!podMap.has(podName)) {
          podMap.set(podName, { namespace });
        }
        const data = podMap.get(podName);
        if (data) {
          const memoryBytes = Number(memValue);
          data.memoryUsage = `${Math.round(memoryBytes / 1024 / 1024)}Mi`;
        }
      }
    }

    // Convert to array format
    for (const [podName, data] of podMap.entries()) {
      metrics.push({
        podName,
        cpuUsage: data.cpuUsage || '0m',
        memoryUsage: data.memoryUsage || '0Mi',
        namespace: data.namespace,
      });
    }

    return metrics;
  } catch (error) {
    console.error('Error fetching GCP pod metrics:', error);
    return [];
  }
}

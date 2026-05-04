'use client';

import { PodInfo } from '@/lib/k8s/pods';

interface PodListProps {
  pods: PodInfo[];
  loading?: boolean;
  onDeletePod?: (podName: string, namespace: string) => void;
  onSelectPod?: (pod: PodInfo) => void;
  onOpenShell?: (podName: string, namespace: string, container?: string) => void;
  onOpenLogs?: (podName: string, namespace: string) => void;
}

export function PodList({ pods, loading, onDeletePod, onSelectPod, onOpenShell, onOpenLogs }: PodListProps) {
  if (loading) {
    return <div className="text-text-secondary py-4">Loading pods...</div>;
  }

  if (pods.length === 0) {
    return <div className="text-text-secondary py-4">No pods found</div>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="border-b border-border">
          <tr>
            <th className="text-left py-3 px-4 text-text-secondary font-medium">
              Name
            </th>
            <th className="text-left py-3 px-4 text-text-secondary font-medium">
              Namespace
            </th>
            <th className="text-left py-3 px-4 text-text-secondary font-medium">
              Status
            </th>
            <th className="text-left py-3 px-4 text-text-secondary font-medium">
              Health
            </th>
            <th className="text-left py-3 px-4 text-text-secondary font-medium">
              Containers
            </th>
            <th className="text-left py-3 px-4 text-text-secondary font-medium">
              Restarts
            </th>
            <th className="text-left py-3 px-4 text-text-secondary font-medium">
              Age
            </th>
            {(onDeletePod || onOpenShell || onOpenLogs) && (
              <th className="text-left py-3 px-4 text-text-secondary font-medium">
                Actions
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {pods.map((pod) => (
            <tr key={`${pod.namespace}-${pod.name}`} className="border-b border-border hover:bg-surface/50">
              <td className="py-3 px-4 text-text-primary font-mono text-xs">
                {onSelectPod ? (
                  <button
                    onClick={() => onSelectPod(pod)}
                    className="text-accent hover:text-accent/80 transition-colors cursor-pointer"
                  >
                    {pod.name}
                  </button>
                ) : (
                  pod.name
                )}
              </td>
              <td className="py-3 px-4 text-text-secondary">{pod.namespace}</td>
              <td className="py-3 px-4">
                <span
                  className={`px-2 py-1 rounded text-xs font-medium ${
                    pod.phase === 'Running'
                      ? 'bg-success/20 text-success'
                      : pod.phase === 'Pending'
                      ? 'bg-warning/20 text-warning'
                      : 'bg-error/20 text-error'
                  }`}
                >
                  {pod.phase}
                </span>
              </td>
              <td className="py-3 px-4">
                <div className="flex items-center gap-2">
                  {pod.containerStatuses && pod.containerStatuses.length > 0 ? (
                    pod.containerStatuses.every((cs) => cs.ready) ? (
                      <span className="px-2 py-1 rounded text-xs font-medium bg-success/20 text-success">
                        Healthy
                      </span>
                    ) : (
                      <span className="px-2 py-1 rounded text-xs font-medium bg-error/20 text-error">
                        Unhealthy
                      </span>
                    )
                  ) : (
                    <span className="text-text-secondary text-xs">-</span>
                  )}
                </div>
              </td>
              <td className="py-3 px-4 text-text-secondary">{pod.containers}</td>
              <td className="py-3 px-4 text-text-secondary">{pod.restarts}</td>
              <td className="py-3 px-4 text-text-secondary">
                {Math.floor(
                  (Date.now() - new Date(pod.createdAt).getTime()) / (1000 * 60)
                )}m
              </td>
              {(onDeletePod || onOpenShell || onOpenLogs) && (
                <td className="py-3 px-4 flex gap-2">
                  {onOpenShell && (
                    <button
                      onClick={() => onOpenShell(pod.name, pod.namespace)}
                      className="text-accent text-xs hover:underline"
                    >
                      Shell
                    </button>
                  )}
                  {onOpenLogs && (
                    <button
                      onClick={() => onOpenLogs(pod.name, pod.namespace)}
                      className="text-accent text-xs hover:underline"
                    >
                      Logs
                    </button>
                  )}
                  {onDeletePod && (
                    <button
                      onClick={() => onDeletePod(pod.name, pod.namespace)}
                      className="text-error text-xs hover:underline"
                    >
                      Delete
                    </button>
                  )}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

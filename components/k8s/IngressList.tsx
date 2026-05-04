'use client';

import { IngressInfo } from '@/lib/k8s/ingresses';

interface IngressListProps {
  ingresses: IngressInfo[];
  loading?: boolean;
}

export function IngressList({ ingresses, loading }: IngressListProps) {
  if (loading) {
    return <div className="text-text-secondary py-4">Loading ingresses...</div>;
  }

  if (ingresses.length === 0) {
    return <div className="text-text-secondary py-4">No ingresses found</div>;
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
              Hosts
            </th>
            <th className="text-left py-3 px-4 text-text-secondary font-medium">
              IP/Hostname
            </th>
          </tr>
        </thead>
        <tbody>
          {ingresses.map((ingress) => (
            <tr
              key={`${ingress.namespace}-${ingress.name}`}
              className="border-b border-border hover:bg-surface/50"
            >
              <td className="py-3 px-4 text-text-primary font-mono text-xs">
                {ingress.name}
              </td>
              <td className="py-3 px-4 text-text-secondary">
                {ingress.namespace}
              </td>
              <td className="py-3 px-4 text-text-secondary text-xs">
                {ingress.hosts.map((host, i) => (
                  <div key={i}>{host}</div>
                ))}
              </td>
              <td className="py-3 px-4 text-text-secondary text-xs font-mono">
                {ingress.ingressIP || 'Pending'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

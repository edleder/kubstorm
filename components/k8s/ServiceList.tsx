'use client';

import { ServiceInfo } from '@/lib/k8s/services';

interface ServiceListProps {
  services: ServiceInfo[];
  loading: boolean;
  error?: string;
}

export function ServiceList({
  services,
  loading,
  error,
}: ServiceListProps) {
  if (error) {
    return (
      <div className="p-4 bg-error/10 border border-error rounded text-error">
        {error}
      </div>
    );
  }

  if (loading) {
    return <div className="text-text-secondary">Loading services...</div>;
  }

  if (services.length === 0) {
    return (
      <div className="p-8 text-center border border-border rounded-lg">
        <p className="text-text-secondary">No services found</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border">
            <th className="text-left px-4 py-3 font-semibold text-text-primary">Name</th>
            <th className="text-left px-4 py-3 font-semibold text-text-primary">Namespace</th>
            <th className="text-left px-4 py-3 font-semibold text-text-primary">Type</th>
            <th className="text-left px-4 py-3 font-semibold text-text-primary">Cluster IP</th>
            <th className="text-left px-4 py-3 font-semibold text-text-primary">External IP</th>
            <th className="text-left px-4 py-3 font-semibold text-text-primary">Ports</th>
            <th className="text-left px-4 py-3 font-semibold text-text-primary">Created</th>
          </tr>
        </thead>
        <tbody>
          {services.map((svc) => (
            <tr key={`${svc.namespace}/${svc.name}`} className="border-b border-border hover:bg-surface/50">
              <td className="px-4 py-3 text-text-primary font-medium">{svc.name}</td>
              <td className="px-4 py-3 text-text-secondary">{svc.namespace}</td>
              <td className="px-4 py-3">
                <span className="px-2 py-1 bg-accent/20 text-accent rounded text-xs">
                  {svc.type}
                </span>
              </td>
              <td className="px-4 py-3 text-text-secondary text-xs">{svc.clusterIP}</td>
              <td className="px-4 py-3 text-text-secondary">{svc.externalIP || '-'}</td>
              <td className="px-4 py-3 text-text-secondary text-xs">{svc.ports}</td>
              <td className="px-4 py-3 text-text-secondary">{new Date(svc.createdAt).toLocaleDateString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

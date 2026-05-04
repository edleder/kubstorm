'use client';

import { NodeInfo } from '@/lib/k8s/nodes';

interface NodeListProps {
  nodes: NodeInfo[];
  loading?: boolean;
}

export function NodeList({ nodes, loading }: NodeListProps) {
  if (loading) {
    return <div className="text-text-secondary py-4">Loading nodes...</div>;
  }

  if (nodes.length === 0) {
    return <div className="text-text-secondary py-4">No nodes found</div>;
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
              Status
            </th>
            <th className="text-left py-3 px-4 text-text-secondary font-medium">
              Version
            </th>
            <th className="text-left py-3 px-4 text-text-secondary font-medium">
              CPU
            </th>
            <th className="text-left py-3 px-4 text-text-secondary font-medium">
              Memory
            </th>
            <th className="text-left py-3 px-4 text-text-secondary font-medium">
              Pods
            </th>
            <th className="text-left py-3 px-4 text-text-secondary font-medium">
              IP
            </th>
          </tr>
        </thead>
        <tbody>
          {nodes.map((node) => (
            <tr
              key={node.name}
              className="border-b border-border hover:bg-surface/50"
            >
              <td className="py-3 px-4 text-text-primary font-mono text-xs">
                {node.name}
              </td>
              <td className="py-3 px-4">
                <span
                  className={`px-2 py-1 rounded text-xs font-medium ${
                    node.status === 'Ready'
                      ? 'bg-success/20 text-success'
                      : 'bg-error/20 text-error'
                  }`}
                >
                  {node.status}
                </span>
              </td>
              <td className="py-3 px-4 text-text-secondary text-xs">
                {node.version}
              </td>
              <td className="py-3 px-4 text-text-secondary">
                {node.cpuCapacity}
              </td>
              <td className="py-3 px-4 text-text-secondary">
                {node.memoryCapacity}
              </td>
              <td className="py-3 px-4 text-text-secondary">{node.pods}</td>
              <td className="py-3 px-4 text-text-secondary text-xs font-mono">
                {node.internalIP || 'N/A'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

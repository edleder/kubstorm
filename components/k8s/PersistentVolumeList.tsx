'use client';

import { useState } from 'react';
import { PersistentVolumeInfo, PersistentVolumeClaimInfo } from '@/lib/k8s/persistentvolumes';

interface PersistentVolumeListProps {
  volumes?: PersistentVolumeInfo[];
  claims?: PersistentVolumeClaimInfo[];
  loading: boolean;
  error?: string;
  type: 'pv' | 'pvc';
}

export function PersistentVolumeList({
  volumes,
  claims,
  loading,
  error,
  type,
}: PersistentVolumeListProps) {
  if (error) {
    return (
      <div className="p-4 bg-error/10 border border-error rounded text-error">
        {error}
      </div>
    );
  }

  if (loading) {
    return <div className="text-text-secondary">Loading volumes...</div>;
  }

  const isEmpty = type === 'pv' ? !volumes?.length : !claims?.length;

  if (isEmpty) {
    return (
      <div className="p-8 text-center border border-border rounded-lg">
        <p className="text-text-secondary">
          No {type === 'pv' ? 'persistent volumes' : 'persistent volume claims'} found
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border">
            {type === 'pv' ? (
              <>
                <th className="text-left px-4 py-3 font-semibold text-text-primary">Name</th>
                <th className="text-left px-4 py-3 font-semibold text-text-primary">Capacity</th>
                <th className="text-left px-4 py-3 font-semibold text-text-primary">Access Mode</th>
                <th className="text-left px-4 py-3 font-semibold text-text-primary">Reclaim Policy</th>
                <th className="text-left px-4 py-3 font-semibold text-text-primary">Status</th>
                <th className="text-left px-4 py-3 font-semibold text-text-primary">Claim Ref</th>
                <th className="text-left px-4 py-3 font-semibold text-text-primary">Created</th>
              </>
            ) : (
              <>
                <th className="text-left px-4 py-3 font-semibold text-text-primary">Name</th>
                <th className="text-left px-4 py-3 font-semibold text-text-primary">Namespace</th>
                <th className="text-left px-4 py-3 font-semibold text-text-primary">Volume</th>
                <th className="text-left px-4 py-3 font-semibold text-text-primary">Capacity</th>
                <th className="text-left px-4 py-3 font-semibold text-text-primary">Access Mode</th>
                <th className="text-left px-4 py-3 font-semibold text-text-primary">Status</th>
                <th className="text-left px-4 py-3 font-semibold text-text-primary">Created</th>
              </>
            )}
          </tr>
        </thead>
        <tbody>
          {type === 'pv' && volumes?.map((pv) => (
            <tr key={pv.name} className="border-b border-border hover:bg-surface/50">
              <td className="px-4 py-3 text-text-primary font-medium">{pv.name}</td>
              <td className="px-4 py-3 text-text-secondary">{pv.capacity}</td>
              <td className="px-4 py-3 text-text-secondary text-xs">{pv.accessMode}</td>
              <td className="px-4 py-3">
                <span className="px-2 py-1 bg-accent/20 text-accent rounded text-xs">
                  {pv.reclaimPolicy}
                </span>
              </td>
              <td className="px-4 py-3">
                <span className={`px-2 py-1 rounded text-xs ${
                  pv.status === 'Available'
                    ? 'bg-success/20 text-success'
                    : pv.status === 'Bound'
                    ? 'bg-accent/20 text-accent'
                    : 'bg-warning/20 text-warning'
                }`}>
                  {pv.status}
                </span>
              </td>
              <td className="px-4 py-3 text-text-secondary text-xs">{pv.claimRef || '-'}</td>
              <td className="px-4 py-3 text-text-secondary text-xs">{new Date(pv.createdAt).toLocaleDateString()}</td>
            </tr>
          ))}
          {type === 'pvc' && claims?.map((claim) => (
            <tr key={`${claim.namespace}/${claim.name}`} className="border-b border-border hover:bg-surface/50">
              <td className="px-4 py-3 text-text-primary font-medium">{claim.name}</td>
              <td className="px-4 py-3 text-text-secondary">{claim.namespace}</td>
              <td className="px-4 py-3 text-text-secondary text-xs">{claim.volume || '-'}</td>
              <td className="px-4 py-3 text-text-secondary">{claim.capacity}</td>
              <td className="px-4 py-3 text-text-secondary text-xs">{claim.accessMode}</td>
              <td className="px-4 py-3">
                <span className={`px-2 py-1 rounded text-xs ${
                  claim.status === 'Bound'
                    ? 'bg-success/20 text-success'
                    : 'bg-warning/20 text-warning'
                }`}>
                  {claim.status}
                </span>
              </td>
              <td className="px-4 py-3 text-text-secondary text-xs">{new Date(claim.createdAt).toLocaleDateString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

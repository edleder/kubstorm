'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  clusterAccess: {
    clusterId: string;
    cluster: {
      name: string;
    };
  }[];
}

interface Cluster {
  id: string;
  name: string;
  provider: string;
}

export default function AdminPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [clusters, setClusters] = useState<Cluster[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    email: '',
    name: '',
    password: '',
  });
  const [selectedClusterIds, setSelectedClusterIds] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchUsers();
    fetchClusters();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/users');
      if (response.ok) {
        const data = await response.json();
        setUsers(data);
      } else {
        setError('Failed to fetch users');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  const fetchClusters = async () => {
    try {
      const response = await fetch('/api/clusters');
      if (response.ok) {
        const data = await response.json();
        setClusters(data);
      } else {
        console.error('Failed to fetch clusters:', response.status);
        setError(`Failed to fetch clusters: ${response.status}`);
      }
    } catch (err) {
      console.error('Failed to fetch clusters:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch clusters');
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        setSuccess('User created successfully!');
        setFormData({ email: '', name: '', password: '' });
        setShowCreateModal(false);
        fetchUsers();
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to create user');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create user');
    }
  };

  const handleAssignCluster = async () => {
    if (!selectedUserId || selectedClusterIds.length === 0) {
      setError('Please select a user and at least one cluster');
      return;
    }

    setError('');
    setSuccess('');

    try {
      let successCount = 0;
      for (const clusterId of selectedClusterIds) {
        const response = await fetch(
          `/api/admin/users/${selectedUserId}/clusters`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ clusterId }),
          }
        );

        if (response.ok) {
          successCount++;
        } else {
          const data = await response.json();
          if (data.error && !data.error.includes('already has access')) {
            setError(data.error || 'Failed to assign cluster');
            return;
          }
        }
      }

      if (successCount > 0) {
        setSuccess(`${successCount} cluster(s) assigned successfully!`);
        setSelectedClusterIds([]);
        setShowAssignModal(false);
        fetchUsers();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to assign clusters');
    }
  };

  const handleRemoveAccess = async (userId: string, clusterId: string) => {
    if (
      !confirm(
        'Are you sure you want to remove access to this cluster?'
      )
    ) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/users/${userId}/clusters`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clusterId }),
      });

      if (response.ok) {
        setSuccess('Access removed successfully!');
        fetchUsers();
      } else {
        setError('Failed to remove access');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove access');
    }
  };

  if (loading) {
    return <div className="text-text-secondary">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-text-primary">Admin Panel</h1>
        <p className="text-text-secondary mt-1">Manage users and cluster access</p>
      </div>

      {error && (
        <div className="p-3 bg-error/10 border border-error rounded text-error text-sm">
          {error}
        </div>
      )}

      {success && (
        <div className="p-3 bg-success/10 border border-success rounded text-success text-sm">
          {success}
        </div>
      )}

      <div className="flex gap-4">
        <Button
          onClick={() => setShowCreateModal(true)}
          className="bg-accent text-black hover:bg-accent-hover font-medium"
        >
          + Create User
        </Button>
        <Button
          onClick={() => setShowAssignModal(true)}
          className="bg-accent/20 text-accent hover:bg-accent/30 font-medium"
        >
          Assign Cluster
        </Button>
      </div>

      {/* Users Table */}
      <div className="bg-surface-elevated rounded-lg border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-surface">
                <th className="text-left px-4 py-3 font-semibold text-text-primary">
                  Email
                </th>
                <th className="text-left px-4 py-3 font-semibold text-text-primary">
                  Name
                </th>
                <th className="text-left px-4 py-3 font-semibold text-text-primary">
                  Clusters
                </th>
                <th className="text-left px-4 py-3 font-semibold text-text-primary">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-b border-border hover:bg-surface/50">
                  <td className="px-4 py-3 text-text-primary font-medium">
                    {user.email}
                  </td>
                  <td className="px-4 py-3 text-text-secondary">{user.name}</td>
                  <td className="px-4 py-3 text-text-secondary text-xs">
                    <div className="space-y-1">
                      {user.clusterAccess.length === 0 ? (
                        <span className="text-text-secondary/50">No clusters</span>
                      ) : (
                        user.clusterAccess.map((access) => (
                          <div
                            key={access.clusterId}
                            className="flex items-center justify-between bg-surface rounded px-2 py-1"
                          >
                            <span>{access.cluster.name}</span>
                            <button
                              onClick={() =>
                                handleRemoveAccess(user.id, access.clusterId)
                              }
                              className="ml-2 text-error hover:text-error/80 text-xs"
                            >
                              ✕
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => {
                        setSelectedUserId(user.id);
                        setShowAssignModal(true);
                      }}
                      className="px-2 py-1 bg-accent/20 hover:bg-accent/30 text-accent rounded text-xs font-medium"
                    >
                      Add Cluster
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create User Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-surface-elevated rounded-lg border border-border p-6 max-w-md w-full mx-4">
            <h2 className="text-xl font-bold text-text-primary mb-4">
              Create New User
            </h2>
            <form onSubmit={handleCreateUser} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-surface border border-border rounded text-text-primary focus:outline-none focus:border-accent"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">
                  Name (optional)
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-surface border border-border rounded text-text-primary focus:outline-none focus:border-accent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">
                  Password
                </label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-surface border border-border rounded text-text-primary focus:outline-none focus:border-accent"
                  required
                />
              </div>
              <div className="flex gap-2 justify-end pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-text-secondary hover:text-text-primary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-accent text-black hover:bg-accent-hover rounded font-medium"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assign Cluster Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-surface-elevated rounded-lg border border-border p-6 max-w-md w-full mx-4 flex flex-col max-h-96">
            <h2 className="text-xl font-bold text-text-primary mb-4">
              Assign Clusters to User
            </h2>
            <div className="space-y-4 flex-1 overflow-y-auto">
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  Select User
                </label>
                <select
                  value={selectedUserId || ''}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                  className="w-full px-3 py-2 bg-surface border border-border rounded text-text-primary focus:outline-none focus:border-accent"
                >
                  <option value="">Choose a user...</option>
                  {users.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.email} ({user.name})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  Select Clusters (multiple)
                </label>
                <div className="space-y-2 bg-surface rounded p-3 max-h-48 overflow-y-auto border border-border">
                  {clusters.length === 0 ? (
                    <p className="text-text-secondary text-sm">No clusters available</p>
                  ) : (
                    clusters.map((cluster) => (
                      <label
                        key={cluster.id}
                        className="flex items-center gap-2 cursor-pointer hover:bg-surface-elevated/50 p-2 rounded"
                      >
                        <input
                          type="checkbox"
                          checked={selectedClusterIds.includes(cluster.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedClusterIds([...selectedClusterIds, cluster.id]);
                            } else {
                              setSelectedClusterIds(
                                selectedClusterIds.filter((id) => id !== cluster.id)
                              );
                            }
                          }}
                          className="w-4 h-4 cursor-pointer"
                        />
                        <span className="text-sm text-text-primary">
                          {cluster.name} ({cluster.provider})
                        </span>
                      </label>
                    ))
                  )}
                </div>
              </div>
              <div className="flex gap-2 justify-end pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowAssignModal(false);
                    setSelectedUserId(null);
                    setSelectedClusterIds([]);
                  }}
                  className="px-4 py-2 text-text-secondary hover:text-text-primary"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleAssignCluster}
                  className="px-4 py-2 bg-accent text-black hover:bg-accent-hover rounded font-medium"
                >
                  Assign ({selectedClusterIds.length})
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

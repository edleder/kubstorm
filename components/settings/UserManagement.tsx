'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';

interface User {
  id: string;
  email: string;
  name: string | null;
  createdAt: string;
}

export function UserManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    email: '',
    name: '',
    password: '',
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await fetch('/api/admin/users');
      if (!response.ok) {
        throw new Error('Failed to fetch users');
      }
      const data = await response.json();
      setUsers(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to fetch users'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!formData.email || !formData.password) {
      setError('Email and password are required');
      return;
    }

    try {
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create user');
      }

      setSuccess('User created successfully');
      setFormData({ email: '', name: '', password: '' });
      setShowAddForm(false);
      fetchUsers();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to create user'
      );
    }
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId) return;

    setError('');
    setSuccess('');

    try {
      const response = await fetch(`/api/users/${editingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name || undefined,
          password: formData.password || undefined,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update user');
      }

      setSuccess('User updated successfully');
      setFormData({ email: '', name: '', password: '' });
      setEditingId(null);
      fetchUsers();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to update user'
      );
    }
  };

  const handleDeleteUser = async (id: string) => {
    if (!confirm('Are you sure you want to delete this user?')) {
      return;
    }

    setError('');
    setSuccess('');

    try {
      const response = await fetch(`/api/users/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete user');
      }

      setSuccess('User deleted successfully');
      fetchUsers();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to delete user'
      );
    }
  };

  const handleEditClick = (user: User) => {
    setEditingId(user.id);
    setFormData({
      email: user.email,
      name: user.name || '',
      password: '',
    });
    setShowAddForm(false);
  };

  const handleCancel = () => {
    setEditingId(null);
    setShowAddForm(false);
    setFormData({ email: '', name: '', password: '' });
    setError('');
  };

  if (loading) {
    return <div className="text-text-secondary">Loading users...</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-lg font-semibold text-text-primary">Users</h2>
        {!showAddForm && !editingId && (
          <Button
            onClick={() => setShowAddForm(true)}
            className="bg-accent hover:bg-accent/90 text-black font-medium"
          >
            + Add User
          </Button>
        )}
      </div>

      {error && (
        <div className="mb-4 p-3 bg-error/10 border border-error rounded text-error text-sm">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-4 p-3 bg-success/10 border border-success rounded text-success text-sm">
          {success}
        </div>
      )}

      {(showAddForm || editingId) && (
        <form
          onSubmit={editingId ? handleUpdateUser : handleAddUser}
          className="mb-6 p-4 bg-surface rounded-lg border border-border space-y-4"
        >
          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">
              Email
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
              disabled={!!editingId}
              className="w-full px-3 py-2 bg-surface-elevated border border-border rounded text-text-primary disabled:opacity-50 disabled:cursor-not-allowed"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">
              Name
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              className="w-full px-3 py-2 bg-surface-elevated border border-border rounded text-text-primary focus:outline-none focus:border-accent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">
              Password {editingId && '(leave empty to keep current)'}
            </label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) =>
                setFormData({ ...formData, password: e.target.value })
              }
              className="w-full px-3 py-2 bg-surface-elevated border border-border rounded text-text-primary focus:outline-none focus:border-accent"
              required={!editingId}
            />
          </div>

          <div className="flex gap-2">
            <Button
              type="submit"
              className="bg-accent hover:bg-accent/90 text-black font-medium"
            >
              {editingId ? 'Update User' : 'Create User'}
            </Button>
            <button
              type="button"
              onClick={handleCancel}
              className="px-4 py-2 bg-surface border border-border rounded text-text-primary hover:bg-surface-dark transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left px-4 py-3 font-semibold text-text-primary">
                Email
              </th>
              <th className="text-left px-4 py-3 font-semibold text-text-primary">
                Name
              </th>
              <th className="text-left px-4 py-3 font-semibold text-text-primary">
                Created
              </th>
              <th className="text-left px-4 py-3 font-semibold text-text-primary">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr
                key={user.id}
                className="border-b border-border hover:bg-surface/50"
              >
                <td className="px-4 py-3 text-text-primary font-medium">
                  {user.email}
                </td>
                <td className="px-4 py-3 text-text-secondary">
                  {user.name || '-'}
                </td>
                <td className="px-4 py-3 text-text-secondary">
                  {new Date(user.createdAt).toLocaleDateString()}
                </td>
                <td className="px-4 py-3 space-x-2">
                  <button
                    onClick={() => handleEditClick(user)}
                    className="px-2 py-1 bg-accent/20 hover:bg-accent/30 text-accent rounded text-xs font-medium transition-colors"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDeleteUser(user.id)}
                    className="px-2 py-1 bg-error/20 hover:bg-error/30 text-error rounded text-xs font-medium transition-colors"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {users.length === 0 && (
        <div className="p-8 text-center border border-border rounded-lg">
          <p className="text-text-secondary">No users found</p>
        </div>
      )}
    </div>
  );
}

'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';

interface Cluster {
  id: string;
  name: string;
  provider: string;
}

function formatClusterName(name: string): string {
  // Extract project-hdg-env from GKE format: gke_gglobo-project-hdg-env_region_context
  const match = name.match(/^gke_([^_]+)_/);
  if (match) {
    const projectPart = match[1];
    // Remove 'gcorp' suffix if present
    return projectPart.replace('-gcorp', '').slice(0, 40);
  }
  return name.slice(0, 40);
}

export function Sidebar() {
  const pathname = usePathname();
  const [clusters, setClusters] = useState<Cluster[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeClusterId, setActiveClusterId] = useState<string | null>(null);
  const [openTabs, setOpenTabs] = useState<Set<string>>(new Set());
  const [isAdmin, setIsAdmin] = useState(false);

  const tabs = [
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
    { id: 'metrics', label: 'Metrics' },
    { id: 'logs', label: 'Logs' },
  ];

  useEffect(() => {
    const fetchClustersAndUser = async () => {
      try {
        const response = await fetch('/api/clusters');
        if (response.ok) {
          const data = await response.json();
          setClusters(data);
        }
      } catch (error) {
        console.error('Failed to fetch clusters:', error);
      }

      try {
        const userResponse = await fetch('/api/users');
        if (userResponse.ok) {
          const userData = await userResponse.json();
          setIsAdmin(userData.role === 'admin');
        }
      } catch (error) {
        console.error('Failed to fetch user:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchClustersAndUser();
  }, []);

  useEffect(() => {
    const match = pathname?.match(/\/clusters\/([^/?]+)/);
    if (match) {
      setActiveClusterId(match[1]);
    } else {
      setActiveClusterId(null);
      setOpenTabs(new Set());
    }
  }, [pathname]);

  const toggleTabsMenu = (clusterId: string) => {
    const newOpen = new Set(openTabs);
    if (newOpen.has(clusterId)) {
      newOpen.delete(clusterId);
    } else {
      newOpen.clear();
      newOpen.add(clusterId);
    }
    setOpenTabs(newOpen);
  };

  const navItems = [
    { href: '/dashboard', label: 'Dashboard', icon: '📊' },
    { href: '/clusters', label: 'Clusters', icon: '🎯' },
    { href: '/search', label: 'Search', icon: '🔍' },
    { href: '/settings', label: 'Settings', icon: '⚙️' },
  ];

  const isActive = (href: string) => pathname?.startsWith(href);
  const isClusterActive = (clusterId: string) => pathname?.includes(`/clusters/${clusterId}`);

  return (
    <aside className="w-56 bg-surface-elevated border-r border-border flex flex-col">
      {/* Logo */}
      <div className="py-3 px-3 border-b border-border flex items-center justify-center">
        <Image
          src="/images/kubstorm-logo.png"
          alt="Kubstorm"
          width={240}
          height={110}
          priority
          className="w-full h-auto max-h-44"
        />
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Clusters Link */}
        <div className="space-y-2">
          <Link
            href="/clusters"
            className={`block px-4 py-3 rounded-md text-sm font-medium transition-colors ${
              isActive('/clusters')
                ? 'bg-accent text-black'
                : 'text-text-primary hover:bg-surface'
            }`}
          >
            <span className="mr-3">🎯</span>
            Clusters
          </Link>
        </div>

        {/* Clusters List */}
        {clusters.length > 0 && (
          <div className="border-t border-border pt-4">
            <p className="text-xs font-semibold text-text-secondary px-4 mb-2">
              CLUSTERS ({clusters.length})
            </p>
            <div className="space-y-1">
              {clusters.sort((a, b) => formatClusterName(a.name).localeCompare(formatClusterName(b.name))).map((cluster) => (
                <div key={cluster.id}>
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/clusters/${cluster.id}`}
                      className={`flex-1 px-4 py-2 rounded-md text-xs transition-colors truncate ${
                        isClusterActive(cluster.id)
                          ? 'bg-accent/20 text-accent font-medium'
                          : 'text-text-secondary hover:text-text-primary hover:bg-surface/50'
                      }`}
                      title={cluster.name}
                    >
                      {formatClusterName(cluster.name)}
                    </Link>
                    {isClusterActive(cluster.id) && (
                      <button
                        onClick={() => toggleTabsMenu(cluster.id)}
                        className="px-2 py-2 text-text-secondary hover:text-text-primary transition-colors"
                        title="Toggle tabs menu"
                      >
                        <svg
                          className={`w-4 h-4 transition-transform ${
                            openTabs.has(cluster.id) ? 'rotate-180' : ''
                          }`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 14l-7 7m0 0l-7-7m7 7V3"
                          />
                        </svg>
                      </button>
                    )}
                  </div>

                  {/* Tabs Submenu */}
                  {isClusterActive(cluster.id) && openTabs.has(cluster.id) && (
                    <div className="pl-2 mt-1 border-l-2 border-accent/30 space-y-0.5">
                      {tabs.map((tab) => (
                        <Link
                          key={tab.id}
                          href={`/clusters/${cluster.id}?tab=${tab.id}`}
                          className="block px-3 py-1.5 text-xs text-text-secondary hover:text-text-primary hover:bg-surface/50 rounded transition-colors truncate"
                          title={tab.label}
                        >
                          {tab.label}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Admin and Settings - Only for admins */}
        {isAdmin && (
          <div className="border-t border-border pt-4 space-y-2">
            <Link
              href="/admin"
              className={`block px-4 py-3 rounded-md text-sm font-medium transition-colors ${
                isActive('/admin')
                  ? 'bg-accent text-black'
                  : 'text-text-primary hover:bg-surface'
              }`}
            >
              <span className="mr-3">👤</span>
              Admin
            </Link>
            <Link
              href="/settings"
              className={`block px-4 py-3 rounded-md text-sm font-medium transition-colors ${
                isActive('/settings')
                  ? 'bg-accent text-black'
                  : 'text-text-primary hover:bg-surface'
              }`}
            >
              <span className="mr-3">⚙️</span>
              Settings
            </Link>
          </div>
        )}

        {/* Search - For all users */}
        <div className="border-t border-border pt-4 space-y-2">
          <Link
            href="/search"
            className={`block px-4 py-3 rounded-md text-sm font-medium transition-colors ${
              isActive('/search')
                ? 'bg-accent text-black'
                : 'text-text-primary hover:bg-surface'
            }`}
          >
            <span className="mr-3">🔍</span>
            Search
          </Link>
        </div>
      </nav>

      {/* Logout */}
      <div className="p-4 border-t border-border">
        <Button
          onClick={() => signOut({ redirect: true, callbackUrl: '/login' })}
          className="w-full bg-error hover:bg-red-600 text-white"
        >
          Logout
        </Button>
      </div>
    </aside>
  );
}

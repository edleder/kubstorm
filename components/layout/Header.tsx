'use client';

import { useSession } from 'next-auth/react';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';

export function Header() {
  const { data: session } = useSession();
  const params = useParams();
  const clusterId = params?.clusterId as string | undefined;
  const [date, setDate] = useState('');
  const [clusterName, setClusterName] = useState('');

  useEffect(() => {
    setDate(new Date().toLocaleDateString());
  }, []);

  useEffect(() => {
    if (clusterId) {
      fetch(`/api/clusters/${clusterId}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.name) {
            setClusterName(data.name);
          }
        })
        .catch(() => {
          // Ignore error
        });
    }
  }, [clusterId]);

  return (
    <header className="border-b border-border bg-surface-elevated px-6 py-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-semibold text-text-primary">
            Dashboard
          </h2>
          <p className="text-sm text-text-secondary">
            {clusterName || session?.user?.email}
          </p>
        </div>
        <div className="text-sm text-text-secondary">
          {date}
        </div>
      </div>
    </header>
  );
}

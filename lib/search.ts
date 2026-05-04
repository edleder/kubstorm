import { prisma } from '@/lib/prisma';
import { decryptKubeconfig } from '@/lib/crypto';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export interface SearchResult {
  kind: string;
  name: string;
  namespace: string;
  cluster: string;
  clusterId: string;
  createdAt?: Date;
}

export async function globalSearch(
  query: string,
  kind?: string
): Promise<SearchResult[]> {
  const clusters = await prisma.cluster.findMany();
  const results: SearchResult[] = [];

  for (const cluster of clusters) {
    try {
      const kubeconfig = decryptKubeconfig(cluster.kubeconfigEnc || '');
      const tmpDir = os.tmpdir();
      const tmpFile = path.join(tmpDir, `kubeconfig-${Date.now()}-${Math.random().toString(36).substring(7)}`);
      fs.writeFileSync(tmpFile, kubeconfig, 'utf8');

      try {
        const kindFilter = kind ? `${kind}` : 'all';
        const output = execSync(
          `kubectl get ${kindFilter} -A -o json 2>/dev/null || true`,
          {
            env: { ...process.env, KUBECONFIG: tmpFile },
            encoding: 'utf-8',
            maxBuffer: 10 * 1024 * 1024,
          }
        );

        if (output.trim()) {
          const data = JSON.parse(output);
          const items = data.items || [];

          items.forEach((item: any) => {
            const name = item.metadata?.name || '';
            const namespace = item.metadata?.namespace || '';
            const itemKind = item.kind || 'Unknown';

            if (name.toLowerCase().includes(query.toLowerCase())) {
              results.push({
                kind: itemKind,
                name,
                namespace,
                cluster: cluster.name,
                clusterId: cluster.id,
                createdAt: item.metadata?.creationTimestamp ? new Date(item.metadata.creationTimestamp) : undefined,
              });
            }
          });
        }
      } finally {
        fs.unlinkSync(tmpFile);
      }
    } catch (error) {
      console.error(`Failed to search cluster ${cluster.name}:`, error);
    }
  }

  return results.sort((a, b) => a.cluster.localeCompare(b.cluster));
}

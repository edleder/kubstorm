import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const SALT_LENGTH = 16;
const TAG_LENGTH = 16;
const IV_LENGTH = 12;

function getEncryptionKey(): Buffer {
  const secret = process.env.ENCRYPTION_KEY || 'default-unsafe-key-change-in-production';
  return crypto.scryptSync(secret, 'salt', 32);
}

export function encryptKubeconfig(kubeconfig: string): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(kubeconfig, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag();

  return iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted;
}

export function decryptKubeconfig(encrypted: string): string {
  const key = getEncryptionKey();
  const parts = encrypted.split(':');

  if (parts.length !== 3) {
    throw new Error('Invalid encrypted data format');
  }

  const iv = Buffer.from(parts[0], 'hex');
  const authTag = Buffer.from(parts[1], 'hex');
  const encryptedData = parts[2];

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

export function encryptSAToken(token: string): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(token, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag();

  return iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted;
}

export function decryptSAToken(encrypted: string): string {
  return decryptKubeconfig(encrypted);
}

export function extractClusterNameFromKubeconfig(kubeconfig: string): string | null {
  try {
    // Split by lines for better parsing
    const lines = kubeconfig.split('\n');
    let inClusters = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Check if we're in the clusters section
      if (line.trim() === 'clusters:') {
        inClusters = true;
        continue;
      }

      // Check if we've moved to a new section
      if (inClusters && line.match(/^[a-z]/)) {
        inClusters = false;
      }

      // If in clusters section, look for "name:"
      if (inClusters && line.includes('name:')) {
        const match = line.match(/name:\s*(.+)/);
        if (match && match[1]) {
          return match[1].trim();
        }
      }
    }

    // Try to extract from current-context as fallback
    const contextMatch = kubeconfig.match(/current-context:\s*([^\n]+)/);
    if (contextMatch && contextMatch[1]) {
      const contextName = contextMatch[1].trim();
      // Remove context- prefix if present
      return contextName.replace(/^context-/, '');
    }

    // Last resort: look for any cluster name pattern
    const gkeMatch = kubeconfig.match(/gke_[a-zA-Z0-9_-]+/);
    if (gkeMatch) {
      return gkeMatch[0];
    }

    return null;
  } catch (error) {
    console.error('Error extracting cluster name:', error);
    return null;
  }
}

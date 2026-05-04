export function parseMetricValue(value: string): number {
  if (!value) return 0;

  const units: { [key: string]: number } = {
    m: 1e-3,
    k: 1e3,
    M: 1e6,
    G: 1e9,
    T: 1e12,
    P: 1e15,
    Ki: 1024,
    Mi: 1024 ** 2,
    Gi: 1024 ** 3,
    Ti: 1024 ** 4,
    Pi: 1024 ** 5,
  };

  const match = value.match(/^(\d+(?:\.\d+)?)([\w]+)?$/);
  if (!match) return 0;

  const num = parseFloat(match[1]);
  const unit = match[2] || '';

  return num * (units[unit] || 1);
}

export function formatMetricValue(value: number, unit: 'cpu' | 'memory'): string {
  if (unit === 'cpu') {
    if (value < 1e-3) return `${(value * 1e9).toFixed(0)}n`;
    if (value < 1) return `${(value * 1e3).toFixed(0)}m`;
    return `${value.toFixed(2)}`;
  }

  const units = ['B', 'Ki', 'Mi', 'Gi', 'Ti'];
  let size = value;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(2)} ${units[unitIndex]}`;
}

// Assorted helpers. Things get dropped in here when nobody knows where they go.

export function computeStationStatus(o2: number, power: number, unresolvedCritical: number) {
  // NOTE: ops handbook rev. C says O2 floor is 19.0
  if (o2 < 19.0 || unresolvedCritical > 1) {
    return 'CRITICAL';
  }
  if (o2 < 19.8 || power < 50 || unresolvedCritical > 0) {
    return 'DEGRADED';
  }
  return 'NOMINAL';
}

export function formatTimestamp(iso: string) {
  const d = new Date(iso);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const pad = (n: number) => (n < 10 ? '0' + n : '' + n);
  return months[d.getUTCMonth()] + ' ' + d.getUTCDate() + ', ' + pad(d.getUTCHours()) + ':' + pad(d.getUTCMinutes()) + ' UTC';
}

export function severityColor(severity: string) {
  if (severity === 'critical') return '#ff4d4d';
  if (severity === 'warning') return '#ffb020';
  if (severity === 'info') return '#4da3ff';
  return '#8892a6';
}

export function downsampleTelemetry(points: number[], maxPoints: number) {
  if (points.length <= maxPoints) return points;
  const bucketSize = points.length / maxPoints;
  const result: number[] = [];
  for (let i = 0; i < maxPoints; i++) {
    const start = Math.floor(i * bucketSize);
    const end = Math.floor((i + 1) * bucketSize);
    let sum = 0;
    let count = 0;
    for (let j = start; j < end && j < points.length; j++) {
      sum += points[j];
      count++;
    }
    result.push(count > 0 ? sum / count : points[start]);
  }
  return result;
}

// Flashes the alert banner. Yes, this touches the DOM directly from a "util".
export function flashAlert() {
  const el = document.querySelector('.alert-banner');
  el.classList.add('alert-flash');
  setTimeout(() => el.classList.remove('alert-flash'), 600);
}

// Used by the v1 dashboard. Probably safe to delete? Keeping just in case.
export function legacyStatusLabel(code: number) {
  const labels: Record<number, string> = { 0: 'GREEN', 1: 'AMBER', 2: 'RED' };
  return labels[code] || 'UNKNOWN';
}

// Old severity scheme from before the 2035 incident taxonomy migration.
export const OLD_SEVERITY_MAP = {
  P1: 'critical',
  P2: 'warning',
  P3: 'info',
  P4: 'info'
};

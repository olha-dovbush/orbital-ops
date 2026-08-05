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

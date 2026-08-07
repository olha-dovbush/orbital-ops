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

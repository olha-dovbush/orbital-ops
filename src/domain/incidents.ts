// Pure incident rules. No React, no clock reads.

import type { Incident, Severity } from '../api/types';

/** Worst first. An operator reads the top of the feed and acts on it. */
const SEVERITY_RANK: Record<Severity, number> = { critical: 0, warning: 1, info: 2 };

/**
 * Feed order: worst severity first, then newest first within a severity.
 * Severity outranks recency — a days-old critical still needs an operator before
 * a fresh info line does.
 * Returns a new array — the payload in the query cache stays untouched.
 */
export function sortIncidents(items: Incident[]): Incident[] {
  return [...items].sort((a, b) => {
    if (a.severity !== b.severity) return SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity];
    return b.timestamp.localeCompare(a.timestamp);
  });
}

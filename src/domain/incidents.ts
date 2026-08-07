// Pure incident rules. No React, no clock reads.

import type { Incident, Severity } from '../api/types';
import { isSameDay } from './board-time';

/** Worst first. An operator reads the top of the feed and acts on it. */
const SEVERITY_RANK: Record<Severity, number> = { critical: 0, warning: 1, info: 2 };

/** A severity the feed invented since this was written sorts below all three. */
const UNRANKED = Object.keys(SEVERITY_RANK).length;

const rank = (severity: Severity): number => SEVERITY_RANK[severity] ?? UNRANKED;

/**
 * Feed order: worst severity first, then newest first within a severity.
 * Severity outranks recency — a days-old critical still needs an operator before
 * a fresh info line does.
 * Returns a new array — the payload in the query cache stays untouched.
 */
export function sortIncidents(items: Incident[]): Incident[] {
  return [...items].sort((a, b) => {
    const bySeverity = rank(a.severity) - rank(b.severity);
    if (bySeverity !== 0) return bySeverity;
    return b.timestamp.localeCompare(a.timestamp);
  });
}

/** What the Open Incidents tile says, in the three numbers it prints. */
export interface IncidentCounts {
  unresolvedCritical: number;
  unresolvedWarning: number;
  resolvedToday: number;
}

/**
 * The feed reduced to the counts the board reports: what is still open and wants
 * an operator, split by how loudly, and what the station cleared today. "Today"
 * is the UTC day of Board Time, never the wall clock — see
 * docs/decisions/board-time.md.
 */
export function summariseIncidents(items: Incident[], boardTime: string): IncidentCounts {
  const counts: IncidentCounts = { unresolvedCritical: 0, unresolvedWarning: 0, resolvedToday: 0 };

  for (const item of items) {
    if (item.resolved) {
      if (isSameDay(item.timestamp, boardTime)) counts.resolvedToday++;
    } else if (item.severity === 'critical') {
      counts.unresolvedCritical++;
    } else if (item.severity === 'warning') {
      counts.unresolvedWarning++;
    }
  }

  return counts;
}

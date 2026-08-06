// Pure roster rules. No React, no clock reads.

import type { CrewMember } from '../api/types';

/**
 * Roster order: on duty first, then by name. Who is working now is the first
 * thing an operator looks for, so duty outranks the alphabet.
 * Returns a new array — the payload in the query cache stays untouched.
 */
export function sortRoster(members: CrewMember[]): CrewMember[] {
  return [...members].sort((a, b) => {
    if (a.onDuty !== b.onDuty) return a.onDuty ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
}

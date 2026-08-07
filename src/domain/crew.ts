// Pure roster rules. No React, no clock reads.

import { CREW_REST_HOURS, type Tone } from '../config';
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

/** Who is working now and who is resting, each side keeping roster order. */
export interface DutySplit {
  onDuty: CrewMember[];
  offDuty: CrewMember[];
}

export function dutySplit(members: CrewMember[]): DutySplit {
  return {
    onDuty: members.filter((member) => member.onDuty),
    offDuty: members.filter((member) => !member.onDuty)
  };
}

/**
 * Heads per shift, whoever is on duty right now — the shift board reports how the
 * roster is staffed, not who happens to be awake. A shift nobody is rostered to
 * is absent rather than zero; the board supplies the zero where it prints one.
 */
export function shiftHeadcount(members: CrewMember[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const member of members) {
    counts[member.shift] = (counts[member.shift] || 0) + 1;
  }
  return counts;
}

/** Crew Rest: the roster's average sleep, and how hard it is to ignore. */
export interface CrewRest {
  hours: number;
  tone: Tone;
}

/**
 * Average sleep across the whole roster, to a tenth of an hour, banded against
 * `CREW_REST_HOURS`. Changing but never actionable — Reference Data, not a Live
 * Resource, so the tone is a nudge rather than an alarm.
 */
export function crewRest(members: CrewMember[]): CrewRest {
  const total = members.reduce((sum, member) => sum + member.sleepHours, 0);
  const hours = Math.round((total / members.length) * 10) / 10;

  if (hours < CREW_REST_HOURS.BAD) return { hours, tone: 'bad' };
  return { hours, tone: hours < CREW_REST_HOURS.WARN ? 'warn' : 'ok' };
}

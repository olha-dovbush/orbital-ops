// Station Status, as CONTEXT.md defines it. Pure — no React, no clock reads.
// This is the only definition of the rules; the board reads it, nothing
// recomputes it.

import { O2, POWER_FLOOR_KW, type Tone } from '../config';

export type Status = 'NOMINAL' | 'DEGRADED' | 'CRITICAL';

export interface StationStatus {
  status: Status;
  /** The tint the status pill and the alert banner take. */
  tone: Tone;
}

/**
 * Station Status from the newest readings and the open incident counts.
 *
 * CRITICAL below the O2 Floor, or with more than one unresolved critical
 * incident. DEGRADED between the floor and the warning band, under the power
 * floor, or with a single unresolved critical. NOMINAL otherwise. The worst
 * band that applies wins.
 *
 * The O2 Floor is 19.5 % and the warning band 19.9 % — see
 * docs/decisions/o2-threshold.md.
 */
export function stationStatus(o2: number, power: number, unresolvedCritical: number): StationStatus {
  if (o2 < O2.FLOOR || unresolvedCritical > 1) {
    return { status: 'CRITICAL', tone: 'bad' };
  }
  if (o2 < O2.WARN || power < POWER_FLOOR_KW || unresolvedCritical > 0) {
    return { status: 'DEGRADED', tone: 'warn' };
  }
  return { status: 'NOMINAL', tone: 'ok' };
}

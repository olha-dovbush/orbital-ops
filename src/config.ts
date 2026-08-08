// Every threshold, interval, and domain→token mapping the board reads. A number
// that means something lives here, not at its call site: one place to change a
// rule, and no second copy left behind to drift from it.
//
// The palette itself stays in `src/styles.css` as custom properties. This module
// maps a domain concept to the class name that carries the colour, so no hex
// code has to be written twice.

import type { Severity, TelemetryMetric } from './api/types';

// ---- cadence ---------------------------------------------------------------

/** How often a Live Resource re-reads. Reference Data does not poll. */
export const POLL_INTERVAL_MS = 5000;

/** Attempts after the first failure, before a resource reports an error. */
export const RETRY_COUNT = 3;

/** Reference Data never goes stale: one reading serves the whole board open. */
export const REFERENCE_STALE_TIME_MS = Infinity;

// ---- threshold bands -------------------------------------------------------

/**
 * The O2 Floor is 19.5 % — below it the station is CRITICAL, and between it and
 * the warning band DEGRADED. This is the only definition; see
 * docs/decisions/o2-threshold.md for why the rival 19.0 / 19.8 pair lost.
 * `NOMINAL` is the cabin figure the O2 tile prints beside the floor.
 */
export const O2 = { FLOOR: 19.5, WARN: 19.9, NOMINAL: 20.9 } as const;

/** Power output as a percentage of rated capacity. */
export const POWER_BUDGET_PCT = { WARN: 75, BAD: 55 } as const;

/** The normal day/night swing. Outside it, the hull temperature tile turns amber. */
export const HULL_TEMP_C = { MIN: -30, MAX: 40 } as const;

/** Hull integrity percentage. `RATED` is the MMOD shielding figure the tile prints. */
export const HULL_INTEGRITY = { WARN: 99, BAD: 98, RATED: 97 } as const;

/** Crew Rest: average sleep hours across the roster. */
export const CREW_REST_HOURS = { WARN: 7, BAD: 6 } as const;

/** Days until the next resupply. */
export const RESUPPLY_DAYS = { WARN: 14, BAD: 7 } as const;

/**
 * Fuel Endurance: days the Fuel Reserve lasts at the reported burn. Reasoned off
 * the resupply window rather than sharing it — a resupply is raised at
 * `RESUPPLY_DAYS.WARN`, so an endurance under 14 days means running dry before a
 * resupply that has only just been flagged, and 30 leaves one full cycle of
 * margin. "When is resupply due" and "when do we run dry" are two questions;
 * tying them to one pair of numbers breaks the moment either moves.
 */
export const FUEL_ENDURANCE_DAYS = { WARN: 30, BAD: 14 } as const;

// ---- scalars ---------------------------------------------------------------

/** Rated power output, the denominator of the power budget percentage. */
export const POWER_RATED_KW = 90;

/** Below this the station is DEGRADED, whatever the budget percentage says. */
export const POWER_FLOOR_KW = 50;

/** How many readings back a trend arrow compares against. */
export const TREND_LOOKBACK = 4;

/** Movement over the lookback that counts as a trend rather than noise. */
export const O2_TREND_DELTA = 0.15;
export const POWER_TREND_DELTA_KW = 2;

/** Sparklines thin to at most this many points so the line stays readable. */
export const SPARKLINE_MAX_POINTS = 12;

// ---- domain → token --------------------------------------------------------

/** The shifts the board reports, in the order it reports them, each with the mark it prints. */
export const SHIFTS: readonly { name: string; mark: string }[] = [
  { name: 'alpha', mark: 'α' },
  { name: 'beta', mark: 'β' },
  { name: 'gamma', mark: 'γ' }
];

/** The metrics the telemetry panel offers, in the order it offers them. */
export const TELEMETRY_METRICS: readonly TelemetryMetric[] = ['o2', 'power', 'hullTemp', 'hullIntegrity'];

/** How urgently a reading wants an operator: fine, watch it, act on it. */
export type Tone = 'ok' | 'warn' | 'bad';

/** The class that carries a tone's colour. Tiles, the status pill, and the alert banner all take it. */
export const TONE_CLASS: Record<Tone, string> = {
  ok: 'tone-ok',
  warn: 'tone-warn',
  bad: 'tone-bad'
};

/** The class that carries an incident severity's colour. */
export const SEVERITY_CLASS: Record<Severity, string> = {
  critical: 'sev-critical',
  warning: 'sev-warning',
  info: 'sev-info'
};

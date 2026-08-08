// Pure propellant rules. No React, no clock reads — Fuel Endurance is a count of
// days, not a measurement from Board Time.

import { FUEL_ENDURANCE_DAYS, type Tone } from '../config';
import type { FuelTank } from '../api/types';

/** The reading the panel renders: the pooled reserve, the days it buys, and how hard to ignore. */
export interface FuelEndurance {
  reserveKg: number;
  /** Absent when nothing is being burned — no rate, no count of days. */
  days: number | null;
  tone: Tone;
}

/**
 * Fuel Reserve over the reported daily burn, pooled across every tank whatever
 * its propellant type: the feed reports one station-wide rate and carries no
 * per-type split, so a per-type endurance would be a number with no source —
 * see docs/decisions/fuel-pooling.md.
 *
 * Days are floored: the partial day at the end is not a day of flight, and the
 * board must never promise one it does not have. A rate of zero or less means
 * nothing is being consumed, so the endurance is absent rather than infinite,
 * and absent is not an alarm. An empty tank collection needs no guard of its
 * own — it sums to zero, divides to zero days, and lands in the worst band,
 * which is the right reading for no propellant aboard.
 */
export function fuelEndurance(tanks: FuelTank[], dailyConsumptionKg: number): FuelEndurance {
  const reserveKg = tanks.reduce((sum, tank) => sum + tank.currentKg, 0);

  if (dailyConsumptionKg <= 0) return { reserveKg, days: null, tone: 'ok' };

  const days = Math.floor(reserveKg / dailyConsumptionKg);

  if (days < FUEL_ENDURANCE_DAYS.BAD) return { reserveKg, days, tone: 'bad' };
  return { reserveKg, days, tone: days < FUEL_ENDURANCE_DAYS.WARN ? 'warn' : 'ok' };
}

/**
 * How full one tank is, to the whole percent, so tanks of different capacities
 * are comparable at a glance. No tone: the station's endurance is what an
 * operator acts on, and colouring a tank would invent an urgency for it.
 */
export function tankFill(tank: FuelTank): number {
  return Math.round((tank.currentKg / tank.capacityKg) * 100);
}

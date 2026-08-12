// Pure telemetry maths. No React, no clock reads — a series is always an
// argument. Every band and delta below comes from src/config.ts, so a threshold
// is stated once and read here, never recomputed at a call site.

import {
  HULL_INTEGRITY,
  HULL_TEMP_C,
  O2,
  POWER_BUDGET_PCT,
  POWER_RATED_KW,
  SPARKLINE_MAX_POINTS,
  TREND_LOOKBACK,
  type Tone
} from '../config';
import type { TelemetryMetric } from '../api/types';

/** Which way a series is moving, as the tile prints it. */
export type Trend = '↑' | '↓' | '→';

/** The newest reading in a series — what every tile shows. */
export function latest(points: number[]): number {
  return points[points.length - 1];
}

/** The mean of the whole series. */
export function average(points: number[]): number {
  return points.reduce((sum, point) => sum + point, 0) / points.length;
}

/** Power output as a whole percentage of rated capacity. */
export function powerBudgetPct(power: number): number {
  return Math.round((power / POWER_RATED_KW) * 100);
}

/**
 * Which way the series is moving: the latest reading against the one
 * `TREND_LOOKBACK` readings back, called a trend only when it moves further than
 * `delta`. Anything at or inside the delta is noise and reads flat. A series
 * shorter than the lookback compares against the oldest reading it has, so a
 * feed that has only just come up still shows a plunge rather than a calm arrow.
 */
export function trend(points: number[], delta: number): Trend {
  const previous = points[Math.max(0, points.length - TREND_LOOKBACK)];
  const movement = latest(points) - previous;

  if (movement > delta) return '↑';
  if (movement < -delta) return '↓';
  return '→';
}

/**
 * A series thinned to at most `SPARKLINE_MAX_POINTS` so the sparkline stays
 * readable. Each surviving point is the mean of its bucket, not a sample of it —
 * a dip between two samples still bends the line. A series already inside the cap
 * is returned as it came.
 */
export function thin(points: number[]): number[] {
  if (points.length <= SPARKLINE_MAX_POINTS) {
    return points;
  }

  const bucketSize = points.length / SPARKLINE_MAX_POINTS;
  const thinned: number[] = [];
  for (let i = 0; i < SPARKLINE_MAX_POINTS; i++) {
    const start = Math.floor(i * bucketSize);
    const end = Math.floor((i + 1) * bucketSize);
    thinned.push(average(points.slice(start, end)));
  }
  return thinned;
}

/**
 * How urgently a reading wants an operator. Each metric has its own bands: O2 is
 * read against the O2 Floor (see docs/decisions/o2-threshold.md), power against
 * its budget percentage rather than its raw output, hull temperature against the
 * normal day/night swing, and hull integrity against its own two marks.
 */
const TONE_BANDS: Record<TelemetryMetric, (reading: number) => Tone> = {
  o2: (reading) => (reading < O2.FLOOR ? 'bad' : reading < O2.WARN ? 'warn' : 'ok'),
  power: (reading) => {
    const pct = powerBudgetPct(reading);
    return pct < POWER_BUDGET_PCT.BAD ? 'bad' : pct < POWER_BUDGET_PCT.WARN ? 'warn' : 'ok';
  },
  hullTemp: (reading) => (reading > HULL_TEMP_C.MAX || reading < HULL_TEMP_C.MIN ? 'warn' : 'ok'),
  hullIntegrity: (reading) => (reading < HULL_INTEGRITY.BAD ? 'bad' : reading < HULL_INTEGRITY.WARN ? 'warn' : 'ok')
};

export function metricTone(metric: TelemetryMetric, reading: number): Tone {
  return TONE_BANDS[metric](reading);
}

import { test, expect } from 'vitest';
import { average, latest, metricTone, powerBudgetPct, thin, trend } from './telemetry';
import { O2_TREND_DELTA, POWER_TREND_DELTA_KW, SPARKLINE_MAX_POINTS } from '../config';

test('reads the newest point as the latest reading', () => {
  expect(latest([20.9, 20.4, 20.1])).toBe(20.1);
});

test('averages the whole series', () => {
  expect(average([80, 85, 90])).toBe(85);
});

test('reads the power budget as a whole percentage of rated output', () => {
  expect(powerBudgetPct(90)).toBe(100);
  expect(powerBudgetPct(85)).toBe(94);
});

// ---- trends ----------------------------------------------------------------
//
// The trend compares the latest reading against the one TREND_LOOKBACK back, and
// only movement *over* the delta counts — so each direction is pinned on the
// delta itself as well as past it. The power delta is a whole number of kW, which
// keeps the boundary cases exact rather than a float comparison in disguise.

const FOUR_BACK = (from: number, to: number) => [from, from, from, to];

test('calls a rise over the delta rising', () => {
  expect(trend(FOUR_BACK(50, 52.5), POWER_TREND_DELTA_KW)).toBe('↑');
});

test('calls a fall over the delta falling', () => {
  expect(trend(FOUR_BACK(50, 47.5), POWER_TREND_DELTA_KW)).toBe('↓');
});

test('calls movement of exactly the delta flat, in either direction', () => {
  expect(trend(FOUR_BACK(50, 52), POWER_TREND_DELTA_KW)).toBe('→');
  expect(trend(FOUR_BACK(50, 48), POWER_TREND_DELTA_KW)).toBe('→');
});

test('reads the delta it is given: the same move is noise for O2 and a trend for power', () => {
  expect(trend(FOUR_BACK(20.0, 20.1), O2_TREND_DELTA)).toBe('→');
  expect(trend(FOUR_BACK(20.0, 20.3), O2_TREND_DELTA)).toBe('↑');
});

test('compares against the oldest reading it has when the series is shorter than the lookback', () => {
  expect(trend([20.0, 20.9], O2_TREND_DELTA)).toBe('↑');
  expect(trend([20.9, 20.0], O2_TREND_DELTA)).toBe('↓');
});

test('calls a single reading flat — it has nothing to compare against', () => {
  expect(trend([20.0], O2_TREND_DELTA)).toBe('→');
});

// ---- thinning ---------------------------------------------------------------

const series = (length: number) => Array.from({ length }, (_, i) => i);

test('passes a series under the cap through untouched', () => {
  const short = series(SPARKLINE_MAX_POINTS - 1);

  expect(thin(short)).toEqual(short);
});

test('passes a series exactly at the cap through untouched', () => {
  const atCap = series(SPARKLINE_MAX_POINTS);

  expect(thin(atCap)).toEqual(atCap);
});

test('reduces a longer series to exactly the cap', () => {
  expect(thin(series(SPARKLINE_MAX_POINTS * 2 + 1))).toHaveLength(SPARKLINE_MAX_POINTS);
  expect(thin(series(1000))).toHaveLength(SPARKLINE_MAX_POINTS);
});

test('averages each bucket rather than sampling it', () => {
  // Twice the cap: every bucket is one pair, so each point is that pair's mean.
  const thinned = thin(series(SPARKLINE_MAX_POINTS * 2));

  expect(thinned[0]).toBe(0.5);
  expect(thinned[SPARKLINE_MAX_POINTS - 1]).toBe(SPARKLINE_MAX_POINTS * 2 - 1.5);
});

// ---- tone bands -------------------------------------------------------------

test('tints O2 by the floor and its warning band', () => {
  expect(metricTone('o2', 19.4)).toBe('bad');
  expect(metricTone('o2', 19.5)).toBe('warn');
  expect(metricTone('o2', 19.9)).toBe('ok');
});

test('tints power by its budget percentage, not its raw output', () => {
  expect(metricTone('power', 49)).toBe('bad');
  expect(metricTone('power', 60)).toBe('warn');
  expect(metricTone('power', 68)).toBe('ok');
});

test('tints hull temperature amber outside the day/night swing, either side', () => {
  expect(metricTone('hullTemp', 41)).toBe('warn');
  expect(metricTone('hullTemp', 40)).toBe('ok');
  expect(metricTone('hullTemp', -30)).toBe('ok');
  expect(metricTone('hullTemp', -31)).toBe('warn');
});

test('tints hull integrity by its warning and bad bands', () => {
  expect(metricTone('hullIntegrity', 97.9)).toBe('bad');
  expect(metricTone('hullIntegrity', 98)).toBe('warn');
  expect(metricTone('hullIntegrity', 99)).toBe('ok');
});

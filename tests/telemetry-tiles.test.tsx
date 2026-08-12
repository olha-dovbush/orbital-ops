import { test, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import TelemetryTiles from '../src/components/TelemetryTiles';
import type { TelemetryMetric, TelemetrySeries } from '../src/api/types';

// The telemetry tile group at its props seam. No fetch and no provider: the group
// takes a series set and renders four tiles from one primitive, so what is under
// test is the mapping from readings to value, unit, trend, and tint.
//
// The readings below mirror public/api/telemetry.json, so the first test doubles
// as the tint-for-tint check that the board renders what an operator sees today.
// The rest walk each metric's own bands, which the fixture never reaches.

const NOMINAL: Record<TelemetryMetric, number[]> = {
  o2: [20.9, 20.8, 20.9, 20.7, 20.6, 20.8, 20.5, 20.4, 20.6, 20.3, 20.1, 20.2, 19.9, 19.8, 20.0, 19.7, 19.6, 19.8, 19.9, 20.1, 20.2, 20.0, 20.3, 20.4],
  power: [84, 86, 88, 85, 82, 79, 74, 70, 66, 61, 58, 55, 52, 49, 47, 51, 56, 62, 68, 73, 78, 81, 83, 85],
  hullTemp: [-12, -9, -4, 3, 11, 18, 24, 29, 31, 28, 22, 14, 5, -3, -10, -14, -16, -13, -8, -2, 6, 13, 19, 23],
  hullIntegrity: [99.2, 99.2, 99.2, 99.1, 99.1, 99.1, 99.1, 99.0, 99.0, 99.0, 99.0, 99.0, 98.9, 98.9, 98.9, 98.9, 98.9, 98.8, 98.8, 98.8, 98.8, 98.8, 98.7, 98.7]
};

const LABELS: Record<TelemetryMetric, string> = {
  o2: 'O2 Partial Pressure',
  power: 'Power Output',
  hullTemp: 'Hull Temperature',
  hullIntegrity: 'Hull Integrity'
};

const UNITS: Record<TelemetryMetric, string> = {
  o2: 'kPa-eq %',
  power: 'kW',
  hullTemp: '°C',
  hullIntegrity: '%'
};

/** The nominal series set, with the named metrics' readings replaced. */
function seriesWith(overrides: Partial<Record<TelemetryMetric, number[]>>): Record<TelemetryMetric, TelemetrySeries> {
  const metrics = Object.keys(NOMINAL) as TelemetryMetric[];
  return Object.fromEntries(
    metrics.map((metric) => [
      metric,
      { label: LABELS[metric], unit: UNITS[metric], points: overrides[metric] ?? NOMINAL[metric] }
    ])
  ) as Record<TelemetryMetric, TelemetrySeries>;
}

function renderTiles(overrides: Partial<Record<TelemetryMetric, number[]>> = {}) {
  return render(<TelemetryTiles series={seriesWith(overrides)} />);
}

function tile(label: string) {
  const body = screen.getByText(label).closest('.tile');
  if (body === null) throw new Error(`no tile labelled ${label}`);
  return body;
}

afterEach(cleanup);

test('renders the four telemetry tiles with the values and tints the feed implies', () => {
  renderTiles();

  const expected: [string, string, string][] = [
    ['O2 Level', 'tone-ok', '20.4%↑floor 19.5 · cabin nominal 20.9'],
    ['Power Output', 'tone-ok', '85kW↑avg 70 kW · budget 94%'],
    ['Hull Temp', 'tone-ok', '23°Cday/night swing normal'],
    ['Hull Integrity', 'tone-warn', '98.7%MMOD shielding rated to 97.0']
  ];

  for (const [label, tint, body] of expected) {
    expect(tile(label).className).toBe(`tile ${tint}`);
    expect(tile(label).textContent).toBe(label + body);
  }
});

test('the O2 tile is red below the O2 Floor and amber in the warning band', () => {
  renderTiles({ o2: [20.4, 20.0, 19.6, 19.3, 19.1] });
  expect(tile('O2 Level').className).toBe('tile tone-bad');
  expect(tile('O2 Level').textContent).toContain('19.1%↓');

  cleanup();

  renderTiles({ o2: [19.8, 19.8, 19.7, 19.7, 19.7] });
  expect(tile('O2 Level').className).toBe('tile tone-warn');
  expect(tile('O2 Level').textContent).toContain('19.7%→');
});

test('the power tile tints against its budget bands and prints its average', () => {
  renderTiles({ power: [70, 66, 62, 60, 58] });
  expect(tile('Power Output').className).toBe('tile tone-warn');
  expect(tile('Power Output').textContent).toBe('Power Output58kW↓avg 63 kW · budget 64%');

  cleanup();

  renderTiles({ power: [60, 55, 50, 46, 44] });
  expect(tile('Power Output').className).toBe('tile tone-bad');
  expect(tile('Power Output').textContent).toContain('budget 49%');
});

test('the hull tiles tint against the day/night swing and their own two marks', () => {
  renderTiles({ hullTemp: [30, 35, 41, 44, 46], hullIntegrity: [98.6, 98.4, 98.2, 98.0, 97.6] });

  expect(tile('Hull Temp').className).toBe('tile tone-warn');
  expect(tile('Hull Temp').textContent).toBe('Hull Temp46°Cday/night swing normal');
  expect(tile('Hull Integrity').className).toBe('tile tone-bad');
  expect(tile('Hull Integrity').textContent).toBe('Hull Integrity97.6%MMOD shielding rated to 97.0');
});

test('a hull temperature below the swing is amber too, not just above it', () => {
  renderTiles({ hullTemp: [-20, -25, -28, -31, -34] });

  expect(tile('Hull Temp').className).toBe('tile tone-warn');
});

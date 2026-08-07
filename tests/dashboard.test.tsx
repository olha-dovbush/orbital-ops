import { test, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act, cleanup } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Dashboard from '../src/components/Dashboard';
import { POLL_INTERVAL_MS } from '../src/config';
import type { ApiResources } from '../src/api/types';

// The board at the global.fetch seam. The board is the only place that reads all
// four resources at once, so what is under test here is the cadence contract:
// Live Resources re-read, Reference Data does not, and one unreadable feed takes
// the whole board to the uplink-lost panel rather than a half-rendered grid.
//
// Payloads mirror public/api/** so the tile assertions below double as a
// regression net for the arithmetic that still lives inside the component.

const payloads: ApiResources = {
  station: {
    id: 'kruger-60',
    name: 'ISS Kruger-60',
    orbit: 'LEO 412 km',
    inclinationDeg: 51.6,
    velocityKms: 7.66,
    crewCapacity: 8,
    crewOnboard: 6,
    commissioned: '2031-04-12',
    nextResupply: '2036-08-02T14:30:00Z',
    daysInService: 1916
  },
  telemetry: {
    updated: '2036-07-11T09:00:00Z',
    intervalMinutes: 10,
    series: {
      o2: {
        label: 'O2 Partial Pressure',
        unit: 'kPa-eq %',
        points: [20.9, 20.8, 20.9, 20.7, 20.6, 20.8, 20.5, 20.4, 20.6, 20.3, 20.1, 20.2, 19.9, 19.8, 20.0, 19.7, 19.6, 19.8, 19.9, 20.1, 20.2, 20.0, 20.3, 20.4]
      },
      power: {
        label: 'Power Output',
        unit: 'kW',
        points: [84, 86, 88, 85, 82, 79, 74, 70, 66, 61, 58, 55, 52, 49, 47, 51, 56, 62, 68, 73, 78, 81, 83, 85]
      },
      hullTemp: {
        label: 'Hull Temperature',
        unit: '°C',
        points: [-12, -9, -4, 3, 11, 18, 24, 29, 31, 28, 22, 14, 5, -3, -10, -14, -16, -13, -8, -2, 6, 13, 19, 23]
      },
      hullIntegrity: {
        label: 'Hull Integrity',
        unit: '%',
        points: [99.2, 99.2, 99.2, 99.1, 99.1, 99.1, 99.1, 99.0, 99.0, 99.0, 99.0, 99.0, 98.9, 98.9, 98.9, 98.9, 98.9, 98.8, 98.8, 98.8, 98.8, 98.8, 98.7, 98.7]
      }
    }
  },
  crew: {
    updated: '2036-07-11T09:00:00Z',
    members: [
      { id: 'cdr-01', name: 'Yuki Tanaka', role: 'Commander', shift: 'alpha', onDuty: true, heartRate: 64, sleepHours: 7.2, missionDay: 148 },
      { id: 'flt-02', name: 'Marcus Webb', role: 'Flight Engineer', shift: 'alpha', onDuty: true, heartRate: 71, sleepHours: 6.8, missionDay: 148 },
      { id: 'sci-03', name: 'Elena Petrova', role: 'Science Officer', shift: 'beta', onDuty: false, heartRate: 58, sleepHours: 8.1, missionDay: 92 },
      { id: 'med-04', name: 'Amara Okafor', role: 'Medical Officer', shift: 'beta', onDuty: false, heartRate: 61, sleepHours: 7.9, missionDay: 92 },
      { id: 'eng-05', name: 'Lars Eriksen', role: 'Systems Engineer', shift: 'gamma', onDuty: true, heartRate: 77, sleepHours: 5.4, missionDay: 233 },
      { id: 'bot-06', name: 'Priya Sharma', role: 'Payload Specialist', shift: 'gamma', onDuty: false, heartRate: 66, sleepHours: 7.5, missionDay: 233 }
    ]
  },
  incidents: {
    updated: '2036-07-11T09:00:00Z',
    items: [
      { id: 'INC-2107', severity: 'critical', system: 'life-support', title: 'CO2 scrubber cartridge 3 efficiency below 80%', timestamp: '2036-07-11T07:42:00Z', resolved: false, assignee: 'eng-05' },
      { id: 'INC-2106', severity: 'warning', system: 'power', title: 'Solar array B tracking lag during eclipse exit', timestamp: '2036-07-11T05:15:00Z', resolved: false, assignee: 'flt-02' },
      { id: 'INC-2105', severity: 'info', system: 'comms', title: 'Ku-band handover delay 4.2s (nominal < 2s)', timestamp: '2036-07-10T22:03:00Z', resolved: true, assignee: 'cdr-01' },
      { id: 'INC-2104', severity: 'warning', system: 'thermal', title: 'Radiator loop A pump vibration trending up', timestamp: '2036-07-10T18:47:00Z', resolved: false, assignee: 'eng-05' },
      { id: 'INC-2103', severity: 'info', system: 'payload', title: 'Crystal growth experiment batch 12 complete', timestamp: '2036-07-10T14:20:00Z', resolved: true, assignee: 'bot-06' },
      { id: 'INC-2102', severity: 'critical', system: 'hull', title: 'MMOD strike detected on node 2 shielding, no breach', timestamp: '2036-07-09T11:58:00Z', resolved: true, assignee: 'cdr-01' },
      { id: 'INC-2101', severity: 'info', system: 'crew', title: 'Quarterly medical checks completed for beta shift', timestamp: '2036-07-09T09:30:00Z', resolved: true, assignee: 'med-04' },
      { id: 'INC-2100', severity: 'warning', system: 'life-support', title: 'Water reclamation yield 91% (target 93%)', timestamp: '2036-07-08T16:12:00Z', resolved: false, assignee: 'med-04' }
    ]
  }
};

function renderBoard() {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <Dashboard />
    </QueryClientProvider>
  );
}

// getData sleeps 200-400ms before it reaches fetch, so nothing has been read yet
// on first paint. Run the clock past that.
async function advance(ms: number) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
}

// Step the clock until the board gives up and offers Retry. Waiting on the
// rendered output rather than a hand-computed deadline keeps the test independent
// of the backoff schedule, which is the query library's to choose.
async function advanceUntilFailed(budgetMs = 60_000) {
  for (let elapsed = 0; screen.queryByRole('button', { name: /retry/i }) === null; elapsed += 250) {
    if (elapsed >= budgetMs) throw new Error(`board never settled within ${budgetMs}ms`);
    await advance(250);
  }
}

type FetchMock = ReturnType<typeof vi.fn<(url: string) => Promise<unknown>>>;

function stub(impl: (url: string) => Promise<unknown>): FetchMock {
  const fetchMock = vi.fn(impl);
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

function everyFeedReadable() {
  return stub((url: string) => {
    const resource = url.slice('/api/'.length, -'.json'.length) as keyof ApiResources;
    return Promise.resolve({ ok: true, json: () => Promise.resolve(payloads[resource]) });
  });
}

// The uplink is broken at the transport, not with ?fail=1: the query parameter is
// a demo affordance, and a test that leaned on it would stop covering the real
// failure the day it goes away.
function noFeedReadable() {
  return stub(() => Promise.reject(new Error('Uplink to ISS Kruger-60 lost')));
}

function onlyThisFeedUnreadable(unreadable: keyof ApiResources) {
  return stub((url: string) => {
    const resource = url.slice('/api/'.length, -'.json'.length) as keyof ApiResources;
    if (resource === unreadable) return Promise.reject(new Error(`Uplink to the ${resource} feed lost`));
    return Promise.resolve({ ok: true, json: () => Promise.resolve(payloads[resource]) });
  });
}

function readsOf(fetchMock: FetchMock, resource: keyof ApiResources) {
  return fetchMock.mock.calls.filter(([url]) => url === `/api/${resource}.json`).length;
}

function tile(label: string) {
  const body = screen.getByText(label).closest('.tile');
  if (body === null) throw new Error(`no tile labelled ${label}`);
  return body;
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  // vitest runs without `globals: true`, so testing-library does not auto-unmount
  // between tests. Without this the tiles of the previous test are still in the
  // document when the next one queries it.
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

test('renders the uplink copy on first paint, before any feed has answered', () => {
  stub(() => new Promise(() => {}));

  renderBoard();

  expect(screen.getByText('Establishing uplink to ISS Kruger-60…')).toBeTruthy();
});

test('shows the uplink-lost panel with the reason when the feeds cannot be read', async () => {
  noFeedReadable();

  renderBoard();
  await advanceUntilFailed();

  expect(screen.getByText(/Uplink lost/)).toBeTruthy();
  expect(screen.getByText('Uplink to ISS Kruger-60 lost')).toBeTruthy();
});

test('Retry re-requests the feeds and brings the board back without a reload', async () => {
  const failing = noFeedReadable();

  renderBoard();
  await advanceUntilFailed();
  const attemptsBeforeRetry = failing.mock.calls.length;

  everyFeedReadable();
  await act(async () => {
    screen.getByRole('button', { name: /retry/i }).click();
  });
  await advance(1_000);

  expect(failing.mock.calls.length).toBe(attemptsBeforeRetry);
  expect(screen.queryByText(/Uplink lost/)).toBeNull();
  expect(screen.getByText('ISS Kruger-60')).toBeTruthy();
});

test('re-reads each Live Resource once per interval and each Reference Data feed once', async () => {
  const fetchMock = everyFeedReadable();

  renderBoard();
  await advance(1_000);
  expect(readsOf(fetchMock, 'telemetry')).toBe(1);
  expect(readsOf(fetchMock, 'station')).toBe(1);

  // The poll timer restarts when a read settles, so three intervals drift by the
  // three reads' latency (200-400ms each). The slack covers the drift and stays
  // well short of a fourth interval.
  await advance(POLL_INTERVAL_MS * 3 + 2_000);

  expect(readsOf(fetchMock, 'telemetry')).toBe(4);
  expect(readsOf(fetchMock, 'incidents')).toBe(4);
  expect(readsOf(fetchMock, 'station')).toBe(1);
  expect(readsOf(fetchMock, 'crew')).toBe(1);
});

test('holds the last good reading while a refresh is in flight', async () => {
  everyFeedReadable();

  renderBoard();
  await advance(1_000);

  stub(() => new Promise(() => {}));
  await advance(POLL_INTERVAL_MS * 2);

  expect(screen.queryByText('Establishing uplink to ISS Kruger-60…')).toBeNull();
  expect(tile('O2 Level').textContent).toContain('20.4');
});

test('gives up the last good reading once a feed has failed past its retry budget', async () => {
  everyFeedReadable();

  renderBoard();
  await advance(1_000);
  expect(tile('O2 Level').textContent).toContain('20.4');

  onlyThisFeedUnreadable('telemetry');
  await advanceUntilFailed();

  // Tiles frozen at their last good values, with nothing saying so, are how a
  // dead uplink reads as a calm station.
  expect(screen.getByText('Uplink to the telemetry feed lost')).toBeTruthy();
  expect(screen.queryByText('O2 Level')).toBeNull();
});

test('Retry re-requests only the feed that failed, leaving Reference Data read once', async () => {
  const fetchMock = onlyThisFeedUnreadable('incidents');

  renderBoard();
  await advanceUntilFailed();
  const stationReadsBeforeRetry = readsOf(fetchMock, 'station');
  const incidentReadsBeforeRetry = readsOf(fetchMock, 'incidents');

  await act(async () => {
    screen.getByRole('button', { name: /retry/i }).click();
  });
  await advance(1_000);

  expect(readsOf(fetchMock, 'incidents')).toBeGreaterThan(incidentReadsBeforeRetry);
  expect(readsOf(fetchMock, 'station')).toBe(stationReadsBeforeRetry);
  expect(readsOf(fetchMock, 'crew')).toBe(1);
});

test('renders the station header and the degraded status pill', async () => {
  everyFeedReadable();

  renderBoard();
  await advance(1_000);

  expect(screen.getByText('LEO 412 km · 7.66 km/s · inc 51.6°')).toBeTruthy();
  expect(screen.getByText(/Mission day 1916 · crew 6\/8 · last sync \d\d:\d\d:\d\d/)).toBeTruthy();
  expect(screen.getByText('DEGRADED')).toBeTruthy();
  expect(screen.getByText(/INC-2107: CO2 scrubber cartridge 3 efficiency below 80%/)).toBeTruthy();
});

test('renders every tile with the value and tint its feeds imply', async () => {
  everyFeedReadable();

  renderBoard();
  await advance(1_000);

  const expected: [string, string, string][] = [
    ['O2 Level', 'tone-ok', '20.4%↑floor 19.5 · cabin nominal 20.9'],
    ['Power Output', 'tone-ok', '85kW↑avg 70 kW · budget 94%'],
    ['Hull Temp', 'tone-ok', '23°Cday/night swing normal'],
    ['Hull Integrity', 'tone-warn', '98.7%MMOD shielding rated to 97.0'],
    ['Open Incidents', 'tone-bad', '4open1 critical · 3 warning · 0 resolved today'],
    ['Next Resupply', 'tone-ok', '22d 5hAug 2 14:30z'],
    ['Crew Rest', 'tone-ok', '7.2h avg3 on duty · 3 off duty'],
    ['Shift Board', 'tone-ok', 'α 2 · β 2 · γ 2commissioned Apr 12 00:00z']
  ];

  for (const [label, tint, body] of expected) {
    expect(tile(label).className).toBe(`tile ${tint}`);
    expect(tile(label).textContent).toBe(label + body);
  }
});

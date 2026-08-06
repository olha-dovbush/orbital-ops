import { test, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act, cleanup } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import IncidentFeed from '../src/components/IncidentFeed';
import { POLL_INTERVAL_MS } from '../src/hooks/query-config';
import type { IncidentsResponse } from '../src/api/types';

// The Incident panel at the global.fetch seam. The claim that matters most here
// is that a dead uplink and a calm station look different: an unreachable feed
// renders the shared error panel, and only a feed that genuinely returns nothing
// renders the no-incidents copy.

const incidents: IncidentsResponse = {
  updated: '2036-07-11T09:00:00Z',
  items: [
    { id: 'INC-2100', severity: 'warning', system: 'life-support', title: 'Water reclamation yield 91%', timestamp: '2036-07-08T16:12:00Z', resolved: false, assignee: 'med-04' },
    { id: 'INC-2105', severity: 'info', system: 'comms', title: 'Ku-band handover delay 4.2s', timestamp: '2036-07-10T22:03:00Z', resolved: true, assignee: 'cdr-01' },
    { id: 'INC-2107', severity: 'critical', system: 'life-support', title: 'CO2 scrubber cartridge 3 efficiency below 80%', timestamp: '2036-07-11T07:42:00Z', resolved: false, assignee: 'eng-05' },
    { id: 'INC-2106', severity: 'warning', system: 'power', title: 'Solar array B tracking lag', timestamp: '2036-07-11T05:15:00Z', resolved: false, assignee: 'flt-02' }
  ]
};

function renderPanel() {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <IncidentFeed />
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

// Step the clock until the panel gives up and offers Retry. Waiting on the
// rendered output rather than a hand-computed deadline keeps the test independent
// of the backoff schedule, which is the query library's to choose.
async function advanceUntilFailed(budgetMs = 60_000) {
  for (let elapsed = 0; screen.queryByRole('button', { name: /retry/i }) === null; elapsed += 250) {
    if (elapsed >= budgetMs) throw new Error(`panel never settled within ${budgetMs}ms`);
    await advance(250);
  }
}

function feedReturning(items: IncidentsResponse['items']) {
  const fetchMock = vi.fn(() =>
    Promise.resolve({ ok: true, json: () => Promise.resolve({ ...incidents, items }) })
  );
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

// The uplink is broken at the transport, not with ?fail=1: the query parameter is
// a demo affordance, and a test that leaned on it would stop covering the real
// failure the day it goes away.
function deadUplink() {
  const fetchMock = vi.fn(() => Promise.reject(new Error('Uplink to incident feed lost')));
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  // vitest runs without `globals: true`, so testing-library does not auto-unmount
  // between tests. Without this the rows of the previous test are still in the
  // document when the next one queries it.
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

test('shows its own loading copy while the feed is in flight', () => {
  vi.stubGlobal(
    'fetch',
    vi.fn(() => new Promise(() => {}))
  );

  renderPanel();

  expect(screen.getByText(/Loading incident feed…/i)).toBeTruthy();
});

test('renders the shared error panel, not an empty list, when the uplink is unreachable', async () => {
  deadUplink();

  renderPanel();
  await advanceUntilFailed();

  expect(screen.getByText(/Uplink to incident feed lost/)).toBeTruthy();
  expect(screen.queryByText(/No incidents to show/i)).toBeNull();
});

test('renders the no-incidents copy, not an error, when the feed genuinely returns nothing', async () => {
  feedReturning([]);

  renderPanel();
  await advance(1_000);

  expect(screen.getByText(/No incidents to show/i)).toBeTruthy();
  expect(screen.queryByRole('button', { name: /retry/i })).toBeNull();
});

test('re-requests the feed when Retry is pressed', async () => {
  const fetchMock = deadUplink();

  renderPanel();
  await advanceUntilFailed();
  const attemptsBeforeRetry = fetchMock.mock.calls.length;

  await act(async () => {
    screen.getByRole('button', { name: /retry/i }).click();
  });
  await advance(1_000);

  expect(fetchMock.mock.calls.length).toBeGreaterThan(attemptsBeforeRetry);
});

test('refetches on the shared poll interval as a Live Resource', async () => {
  const fetchMock = feedReturning(incidents.items);

  renderPanel();
  await advance(1_000);
  expect(fetchMock).toHaveBeenCalledTimes(1);

  await advance(POLL_INTERVAL_MS);

  expect(fetchMock).toHaveBeenCalledTimes(2);
});

test('lists open incidents worst first, then newest first', async () => {
  feedReturning(incidents.items);

  renderPanel();
  await advance(1_000);

  const rows = screen.getAllByRole('listitem').map((row) => row.textContent);
  expect(rows.map((text) => text?.match(/INC-\d+/)?.[0])).toEqual(['INC-2107', 'INC-2106', 'INC-2100']);
});

test('renders each row with id, title, affected system, timestamp, and open state', async () => {
  feedReturning(incidents.items);

  renderPanel();
  await advance(1_000);

  const row = screen.getAllByRole('listitem')[0].textContent;
  expect(row).toContain('INC-2107');
  expect(row).toContain('CO2 scrubber cartridge 3 efficiency below 80%');
  expect(row).toContain('life-support');
  expect(row).toContain('Jul 11, 07:42 UTC');
  expect(row).toContain('open');
});

test('hides resolved incidents until the show-resolved toggle is on', async () => {
  feedReturning(incidents.items);

  renderPanel();
  await advance(1_000);
  expect(screen.queryByText(/INC-2105/)).toBeNull();

  await act(async () => {
    screen.getByRole('checkbox').click();
  });

  const resolvedRow = screen.getAllByRole('listitem').find((row) => row.textContent?.includes('INC-2105'));
  expect(resolvedRow?.textContent).toContain('resolved');
});

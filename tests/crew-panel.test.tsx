import { test, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act, cleanup } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import CrewPanel from '../src/components/CrewPanel';
import { POLL_INTERVAL_MS } from '../src/config';
import type { CrewResponse } from '../src/api/types';

// The Crew panel at the global.fetch seam. Crew is Reference Data, so the claim
// under test is the absence of a second request: the clock runs past several
// poll intervals and the feed is still read exactly once.

const crew: CrewResponse = {
  updated: '2036-07-11T09:00:00Z',
  members: [
    { id: 'med-04', name: 'Amara Okafor', role: 'Medical Officer', shift: 'beta', onDuty: false, heartRate: 61, sleepHours: 7.9, missionDay: 92 },
    { id: 'flt-02', name: 'Marcus Webb', role: 'Flight Engineer', shift: 'alpha', onDuty: true, heartRate: 71, sleepHours: 6.8, missionDay: 148 },
    { id: 'sci-03', name: 'Elena Petrova', role: 'Science Officer', shift: 'beta', onDuty: false, heartRate: 58, sleepHours: 8.1, missionDay: 92 },
    { id: 'eng-05', name: 'Lars Eriksen', role: 'Systems Engineer', shift: 'gamma', onDuty: true, heartRate: 77, sleepHours: 5.4, missionDay: 233 }
  ]
};

function renderPanel() {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <CrewPanel />
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

function okFetch() {
  const fetchMock = vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve(crew) }));
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  // vitest runs without `globals: true`, so testing-library does not auto-unmount
  // between tests. Without this the roster rows of the previous test are still in
  // the document when the next one queries it.
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

test('shows its own loading copy while the roster is in flight', () => {
  vi.stubGlobal(
    'fetch',
    vi.fn(() => new Promise(() => {}))
  );

  renderPanel();

  expect(screen.getByText(/Loading crew roster…/i)).toBeTruthy();
});

test('reads the roster once per board open and not again on the poll interval', async () => {
  const fetchMock = okFetch();

  renderPanel();
  await advance(1_000);
  expect(fetchMock).toHaveBeenCalledTimes(1);

  await advance(POLL_INTERVAL_MS * 4);

  expect(fetchMock).toHaveBeenCalledTimes(1);
});

test('lists the roster on duty first, then by name', async () => {
  okFetch();

  renderPanel();
  await advance(1_000);

  const rows = screen.getAllByRole('listitem').map((row) => row.textContent);
  expect(rows.map((text) => text?.split(' ')[0])).toEqual(['Lars', 'Marcus', 'Amara', 'Elena']);
});

test('renders each member with role, shift, heart rate, sleep hours, and mission day', async () => {
  okFetch();

  renderPanel();
  await advance(1_000);

  const row = screen.getAllByRole('listitem')[0].textContent;
  expect(row).toContain('Systems Engineer');
  expect(row).toContain('shift gamma');
  expect(row).toContain('77');
  expect(row).toContain('5.4h');
  expect(row).toContain('d233');
});

// Step the clock until the panel gives up and offers Retry. Waiting on the
// rendered output rather than a hand-computed deadline keeps the test independent
// of the backoff schedule, which is the query library's to choose.
async function advanceUntilFailed(budgetMs = 60_000) {
  for (let elapsed = 0; screen.queryByRole('button', { name: /retry/i }) === null; elapsed += 250) {
    if (elapsed >= budgetMs) throw new Error(`panel never settled within ${budgetMs}ms`);
    await advance(250);
  }
}

test('renders the shared error panel once the roster has rejected past the retry budget', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn(() => Promise.resolve({ ok: false, status: 503 }))
  );

  renderPanel();
  await advanceUntilFailed();

  expect(screen.getByText(/Request failed: 503/)).toBeTruthy();
});

test('re-requests the roster when Retry is pressed', async () => {
  const fetchMock = vi.fn(() => Promise.resolve({ ok: false, status: 503 }));
  vi.stubGlobal('fetch', fetchMock);

  renderPanel();
  await advanceUntilFailed();
  const attemptsBeforeRetry = fetchMock.mock.calls.length;

  await act(async () => {
    screen.getByRole('button', { name: /retry/i }).click();
  });
  await advance(1_000);

  expect(fetchMock.mock.calls.length).toBeGreaterThan(attemptsBeforeRetry);
});

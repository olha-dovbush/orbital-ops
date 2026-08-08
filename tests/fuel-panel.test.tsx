import { test, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act, cleanup } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import FuelPanel from '../src/components/FuelPanel';
import { POLL_INTERVAL_MS } from '../src/config';
import type { FuelResponse } from '../src/api/types';

// The Fuel panel at the global.fetch seam. Fuel is Reference Data, so the claim
// under test is the absence of a second request: the clock runs past several
// poll intervals and the feed is still read exactly once. Nothing else in the
// suite would catch someone later handing the hook a refetchInterval.

const fuel: FuelResponse = {
  updated: '2036-07-11T09:00:00Z',
  tanks: [
    { id: 'main-a', type: 'hydrazine', capacityKg: 1200, currentKg: 830 },
    { id: 'main-b', type: 'hydrazine', capacityKg: 1200, currentKg: 764 },
    { id: 'rcs', type: 'cold-gas', capacityKg: 300, currentKg: 211 }
  ],
  dailyConsumptionKg: 14.2
};

function renderPanel() {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <FuelPanel />
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
  const fetchMock = vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve(fuel) }));
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

test('shows its own loading copy while the reserves are in flight', () => {
  vi.stubGlobal(
    'fetch',
    vi.fn(() => new Promise(() => {}))
  );

  renderPanel();

  expect(screen.getByText(/Loading fuel reserves…/i)).toBeTruthy();
});

test('reads the reserves once per board open and not again on the poll interval', async () => {
  const fetchMock = okFetch();

  renderPanel();
  await advance(1_000);
  expect(fetchMock).toHaveBeenCalledTimes(1);

  await advance(POLL_INTERVAL_MS * 4);

  expect(fetchMock).toHaveBeenCalledTimes(1);
});

test('leads with the endurance in days, over the reserve and the burn that produced it', async () => {
  okFetch();

  renderPanel();
  await advance(1_000);

  expect(screen.getByText('127')).toBeTruthy();
  expect(screen.getByText(/Fuel Reserve 1805 kg · burning 14.2 kg\/day/)).toBeTruthy();
});

test('lists every tank with its propellant type, masses and fill percentage', async () => {
  okFetch();

  renderPanel();
  await advance(1_000);

  const rows = screen.getAllByRole('listitem').map((row) => row.textContent);
  expect(rows).toHaveLength(3);
  expect(rows[0]).toContain('main-a');
  expect(rows[0]).toContain('hydrazine');
  expect(rows[0]).toContain('830 / 1200 kg');
  expect(rows[0]).toContain('69%');
  expect(rows[2]).toContain('cold-gas');
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

test('renders the shared error panel with a retry control once the feed has rejected past the retry budget', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn(() => Promise.resolve({ ok: false, status: 503 }))
  );

  renderPanel();
  await advanceUntilFailed();

  expect(screen.getByText(/Request failed: 503/)).toBeTruthy();
});

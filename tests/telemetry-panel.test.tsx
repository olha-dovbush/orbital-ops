import { test, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import TelemetryChart from '../src/components/TelemetryChart';
import { POLL_INTERVAL_MS } from '../src/config';
import type { TelemetryResponse } from '../src/api/types';

// The Telemetry panel, exercised at the global.fetch seam: the API client, the
// hook, and the query cache all stay real, so what is under test is the whole
// loading / error / poll path rather than a mock of it.

const telemetry: TelemetryResponse = {
  updated: '2036-07-11T09:00:00Z',
  intervalMinutes: 5,
  series: {
    o2: { label: 'O2', unit: '%', points: [20.9, 20.8, 20.7] },
    power: { label: 'Power', unit: 'kW', points: [82, 80, 79] },
    hullTemp: { label: 'Hull Temp', unit: '°C', points: [21, 22, 23] },
    hullIntegrity: { label: 'Hull Integrity', unit: '%', points: [99.4, 99.4, 99.3] }
  }
};

function renderPanel() {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <TelemetryChart />
    </QueryClientProvider>
  );
}

// getData sleeps 200-400ms before it reaches fetch, and the shared retry budget
// backs off exponentially between attempts. Run the clock past both.
async function advance(ms: number) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
}

// Step the clock until the panel reaches `settled`. Waiting on the rendered
// output rather than on a hand-computed deadline keeps the test independent of
// the backoff schedule, which is the query library's to choose.
async function advanceUntil(settled: () => boolean, budgetMs = 60_000) {
  for (let elapsed = 0; !settled(); elapsed += 250) {
    if (elapsed >= budgetMs) {
      throw new Error(`panel never settled within ${budgetMs}ms`);
    }
    await advance(250);
  }
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

test('shows its own loading copy while the feed is in flight', () => {
  vi.stubGlobal(
    'fetch',
    vi.fn(() => new Promise(() => {}))
  );

  renderPanel();

  expect(screen.getByText(/Loading telemetry…/i)).toBeTruthy();
});

test('renders the error panel once the feed has rejected past the retry budget', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn(() => Promise.resolve({ ok: false, status: 503 }))
  );

  renderPanel();
  await advanceUntil(() => screen.queryByRole('button', { name: /retry/i }) !== null);

  expect(screen.getByText(/Request failed: 503/)).toBeTruthy();
});

test('refetches on the shared poll interval as a Live Resource', async () => {
  const fetchMock = vi.fn(() =>
    Promise.resolve({ ok: true, json: () => Promise.resolve(telemetry) })
  );
  vi.stubGlobal('fetch', fetchMock);

  renderPanel();
  await advance(1_000);
  expect(fetchMock).toHaveBeenCalledTimes(1);

  await advance(POLL_INTERVAL_MS);
  expect(fetchMock).toHaveBeenCalledTimes(2);
});

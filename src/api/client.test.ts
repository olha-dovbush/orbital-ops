import { test, expect, vi, afterEach } from 'vitest';
import { getData } from './client';
import type { ApiResources } from './types';

afterEach(() => {
  vi.unstubAllGlobals();
  window.history.pushState({}, '', '/');
});

test('a resource key resolves to its own fixture and response type', async () => {
  const fetchMock = vi.fn(() =>
    Promise.resolve({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ updated: '2036-07-11T09:00:00Z', members: [] })
    })
  );
  vi.stubGlobal('fetch', fetchMock);

  const crew = await getData('crew');

  expect(fetchMock).toHaveBeenCalledWith('/api/crew.json');
  expect(crew.members).toEqual([]);
});

test('only registered resource keys are accepted', () => {
  const registered: keyof ApiResources = 'crew';
  // @ts-expect-error a typo in a resource key is a compile error, not a runtime undefined
  const typo: keyof ApiResources = 'crw';

  expect([registered, typo]).toEqual(['crew', 'crw']);
});

test('a failed request throws with its status', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn(() => Promise.resolve({ ok: false, status: 503, json: () => Promise.resolve({}) }))
  );

  await expect(getData('station')).rejects.toThrow('Request failed: 503');
});

test('?fail=1 injects an uplink failure before the request is made', async () => {
  const fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
  window.history.pushState({}, '', '/?fail=1');

  await expect(getData('telemetry')).rejects.toThrow(/Simulated uplink failure/);
  expect(fetchMock).not.toHaveBeenCalled();
});

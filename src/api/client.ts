// Fetch wrapper for the station API. Generic over the resource registry, so
// requesting one resource can only produce that resource's response.

import type { ApiResources } from './types';

export async function getData<K extends keyof ApiResources>(resource: K): Promise<ApiResources[K]> {
  const url = '/api/' + resource + '.json';
  // simulated network latency so loading states are visible
  await new Promise((resolve) => setTimeout(resolve, 200 + Math.random() * 200));
  if (typeof window !== 'undefined' && window.location.search.indexOf('fail=1') !== -1) {
    throw new Error('Simulated uplink failure (remove ?fail=1 from the URL)');
  }
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error('Request failed: ' + res.status);
  }
  return (await res.json()) as ApiResources[K];
}

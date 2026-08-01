// Fetch wrapper for the station API.
// TODO: someone should type this properly some day.

export async function getData(path: string): Promise<any> {
  const url = '/api/' + path + '.json';
  // simulated network latency so loading states are visible
  await new Promise((resolve) => setTimeout(resolve, 200 + Math.random() * 200));
  if (typeof window !== 'undefined' && window.location.search.indexOf('fail=1') !== -1) {
    throw new Error('Simulated uplink failure (remove ?fail=1 from the URL)');
  }
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error('Request failed: ' + res.status);
  }
  const data = await res.json();
  return data as any;
}

export function getDataOrNull(path: string): Promise<any> {
  return getData(path).catch(() => null);
}

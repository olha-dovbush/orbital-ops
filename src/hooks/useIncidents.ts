import { useQuery } from '@tanstack/react-query';
import { getData } from '../api/client';
import { POLL_INTERVAL_MS, RETRY_COUNT } from '../config';

/**
 * Incidents are a Live Resource, so the feed re-reads on the shared poll
 * interval. Retries, cancellation on unmount, and de-duplication across mounts
 * all come from the query cache — no panel hand-rolls them. A feed that fails
 * past the retry budget reports an error rather than resolving to nothing:
 * substituting an empty list is what made a dead uplink look like a calm
 * station.
 */
export function useIncidents() {
  return useQuery({
    queryKey: ['incidents'],
    queryFn: () => getData('incidents'),
    refetchInterval: POLL_INTERVAL_MS,
    retry: RETRY_COUNT
  });
}

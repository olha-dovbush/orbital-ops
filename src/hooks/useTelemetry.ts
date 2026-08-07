import { useQuery } from '@tanstack/react-query';
import { getData } from '../api/client';
import { POLL_INTERVAL_MS, RETRY_COUNT } from '../config';

/**
 * Telemetry is a Live Resource, so it re-reads on the shared poll interval.
 * Retries, cancellation on unmount, and de-duplication across mounts all come
 * from the query cache — no panel hand-rolls them.
 */
export function useTelemetry() {
  return useQuery({
    queryKey: ['telemetry'],
    queryFn: () => getData('telemetry'),
    refetchInterval: POLL_INTERVAL_MS,
    retry: RETRY_COUNT
  });
}

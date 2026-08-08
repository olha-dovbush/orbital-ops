import { useQuery } from '@tanstack/react-query';
import { getData } from '../api/client';
import { REFERENCE_STALE_TIME_MS, RETRY_COUNT } from '../config';

/**
 * Fuel reserves are Reference Data: read once when the board opens. No
 * `refetchInterval` — the test is actionability, not motion, and at the reported
 * burn the reserve moves under a gram between two poll intervals. Crew Rest is
 * the precedent. Retries and cancellation come from the query cache.
 */
export function useFuel() {
  return useQuery({
    queryKey: ['fuel'],
    queryFn: () => getData('fuel'),
    staleTime: REFERENCE_STALE_TIME_MS,
    retry: RETRY_COUNT
  });
}

import { useQuery } from '@tanstack/react-query';
import { getData } from '../api/client';
import { REFERENCE_STALE_TIME_MS, RETRY_COUNT } from '../config';

/**
 * The crew roster is Reference Data: read once when the board opens. No
 * `refetchInterval`, and the reading never goes stale, so nothing re-requests it
 * for the life of the board. Retries and cancellation come from the query cache.
 */
export function useCrew() {
  return useQuery({
    queryKey: ['crew'],
    queryFn: () => getData('crew'),
    staleTime: REFERENCE_STALE_TIME_MS,
    retry: RETRY_COUNT
  });
}

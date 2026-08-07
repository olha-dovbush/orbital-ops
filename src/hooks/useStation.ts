import { useQuery } from '@tanstack/react-query';
import { getData } from '../api/client';
import { REFERENCE_STALE_TIME_MS, RETRY_COUNT } from './query-config';

/**
 * The station record is Reference Data: read once when the board opens. Orbit,
 * capacity, and commissioning date do not change between two readings, so no
 * `refetchInterval` and a reading that never goes stale. Retries and
 * cancellation come from the query cache.
 */
export function useStation() {
  return useQuery({
    queryKey: ['station'],
    queryFn: () => getData('station'),
    staleTime: REFERENCE_STALE_TIME_MS,
    retry: RETRY_COUNT
  });
}

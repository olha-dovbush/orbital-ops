// Cadence and retry budget shared by every resource hook. `src/config.ts` will
// own both once it exists; until then this is the one place they are written,
// so the panels cannot drift apart again.

/** How often a Live Resource re-reads. Reference Data does not poll. */
export const POLL_INTERVAL_MS = 5000;

/** Attempts after the first failure, before a resource reports an error. */
export const RETRY_COUNT = 3;

/** Reference Data never goes stale: one reading serves the whole board open. */
export const REFERENCE_STALE_TIME_MS = Infinity;

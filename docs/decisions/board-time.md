# Board Time comes from the telemetry feed, not the wall clock

**Status:** accepted

## The problem

The board needs a "now" for two things: the resupply countdown and the
"resolved today" incident count. `Dashboard.tsx` hardcoded the present twice —
`new Date('2036-07-11T09:00:00Z')` for the countdown, and a
`timestamp.indexOf('2036-07-11')` string prefix for the count.

The real clock cannot be used naively: the fixtures in `public/api/**` are dated
2036-07-11, so `Date.now()` renders the resupply tile as thousands of days out
and pins "resolved today" at zero forever.

## The decision

**Board Time** is the `updated` timestamp of the telemetry feed. It is read from
the payload and passed as an explicit argument into the domain functions that
need it (`timeUntil`, `summarize`). No module reads the clock on its own.

## Why not a frozen constant

A `MISSION_NOW` constant in `src/config.ts` was the obvious alternative, and it
was rejected for two reasons:

1. It copies a value the fixtures already publish, creating a second place to
   keep in sync — the exact failure mode that produced the O2 threshold
   discrepancy (see [o2-threshold.md](o2-threshold.md)).
2. It is a lie with no expiry. The day a real backend replaces the fixtures, a
   data-derived clock becomes correct for free, while a frozen constant keeps
   reporting 2036 until somebody notices.

## Consequences

- The resupply countdown depends on the telemetry payload, not the station
  payload. `station.json` has no `updated` field, so there is nothing closer to
  use. This is a real coupling; it is safe today only because `Dashboard` gates
  on all four resources before rendering.
- Domain functions take an instant as a parameter and never call `Date.now()`.
  Their tests are deterministic without freezing timers.
- If a feed ever ships without `updated`, this decision must be revisited
  rather than patched with a `Date.now()` fallback — a silent fallback would
  reintroduce the wrong-decade countdown.

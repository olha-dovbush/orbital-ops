# Refactor Plan — Exercise 1

Written before any code change. The six commits below land in order; each one is a
single smell-cluster, and `npm run validate` runs after every one.

## Baseline, measured

| Tool | State before |
|---|---|
| `npm run lint` | 29 errors (`any` ×15, `max-lines-per-function` ×3, `complexity` 13, `exhaustive-deps`, unused vars) |
| `npm run typecheck` | 4 errors — incl. `utils.ts(49): 'el' is possibly 'null'` |
| `npm run test:coverage` | lines 20.65 / functions 19.04 / branches 5.57 (gates: 60 / 60 / 50) |
| `npx jscpd src` | 3 clones, all of them the three panels' loading/error blocks |
| `validate:structure` | `E1.1`–`E1.7` all failing |

## The threshold discrepancy

The repo shipped two O2 alert thresholds: **19.5 / 19.9** (rendered — the
`Dashboard` status computation, the O2 tile class, the tile's own `floor 19.5`
label, and `TelemetryChart`'s breach marker) and **19.0 / 19.8** (unreachable —
`utils.computeStationStatus`, which has no importers, and `OldDashboard.tsx`,
which is deleted in commit 2).

**Decision: 19.5 is the O2 floor, 19.9 the warning.** It is what actually
reaches a pixel, the UI already commits to it in text, and the rival pair exists
only in code nothing calls. The full reasoning is
[docs/decisions/o2-threshold.md](decisions/o2-threshold.md); the value lives in
`src/config.ts` and is read from there by every consumer.

A second, quieter discrepancy: `Dashboard`'s `POLL_INTERVAL` constant is never
read — line 61 uses a bare `5000` — so the comment claiming the copies are "kept
in sync by hand" describes a sync that does not exist. Both become
`POLL_INTERVAL_MS` in `src/config.ts`.

## Decisions taken before writing code

- **Server state is `@tanstack/react-query`**, provider mounted in `src/App.tsx`
  (`tests/smoke.test.tsx` renders `<App />` directly). `src/hooks/` holds one
  thin typed wrapper per resource.
- **Queries live at the section boundary only** — `Dashboard`, `TelemetryChart`,
  `CrewPanel`, `IncidentFeed`. Everything below them is pure props-in
  presentational code, which is where the coverage gate is cheap.
- **Only Live Resources poll.** `telemetry` and `incidents` refetch every
  `POLL_INTERVAL_MS`; `station` and `crew` are Reference Data and fetch once.
  A resource is live if a value in it can change between readings in a way an
  operator must act on — see [CONTEXT.md](../CONTEXT.md).
- **`IncidentFeed` stops swallowing errors.** It renders the same error panel as
  the other panels. An empty incident list on a dead uplink is the dangerous
  failure mode on a mission-control board. Deliberate behaviour change.
- **"Now" comes from the data, not the clock** — the telemetry feed's `updated`
  field, threaded into domain functions as an argument. See
  [docs/decisions/board-time.md](decisions/board-time.md).
- **The palette stays in `:root`**; `config.ts` owns the domain→token mapping
  (`TONE_CLASS`, `SEVERITY_COLORS`). No hex in `src/**/*.tsx`. One home per
  concern beats copying nine hex codes into TypeScript.
- **No runtime schema validation.** Hand-written models plus an `ApiResources`
  registry so `getData('crew')` can only return `CrewResponse`.
- **Tests stub `global.fetch`, never `src/api/client`** — mocking the client
  module would leave the API layer and hooks at 0% coverage, which is the code
  being graded.

## Commits, in order

| # | Commit | Cluster | Clears |
|---|---|---|---|
| 1 | plan, glossary, board-time decision, deletion policy | process | `E1.1` |
| 2 | delete the dead | target 5 | `E1.3`, typecheck green |
| 3 | typed API layer + shared query hooks | targets 2, 3 | `E1.4`, `E1.6` |
| 4 | centralize constants in `config.ts` | target 6 | `E1.7` |
| 5 | extract pure domain logic + colocated tests | target 4 | `E1.5` |
| 6 | decompose `Dashboard` + component tests | target 1 | `E1.2`, coverage |

### 1 — Docs
`docs/refactor-plan.md`, `CONTEXT.md`, `docs/decisions/board-time.md`, and a
`## Deletion policy` section in `CLAUDE.md`.
**Verify:** `validate:structure` reports `E1.1` green.

### 2 — Delete the dead
`OldDashboard.tsx` (incl. `renderStatusBadge`), `utils.legacyStatusLabel`,
`utils.OLD_SEVERITY_MAP`, `utils.downsampleTelemetry`, `utils.flashAlert` and
its call site, `client.getDataOrNull`, the commented-out v1 poller at
`Dashboard:220-229`, and the unread `POLL_INTERVAL`/`REFRESH_MS` constants.
`utils.computeStationStatus` deliberately survives until commit 5 — the O2
decision record requires its replacement to exist first.
**Verify:** `npm run typecheck` clean; `E1.3` green; app still renders.

### 3 — Typed API layer + shared hooks
Install `@tanstack/react-query`. Complete `src/api/types.ts`
(`TelemetryResponse`, `TelemetrySeries`, `CrewResponse`, `CrewMember`,
`IncidentsResponse`, `Incident`). `getData<K extends keyof ApiResources>`
replaces `getData(path): Promise<any>`. `src/hooks/` gains `useStation`,
`useTelemetry`, `useCrew`, `useIncidents`. All four containers rewired; `tick`,
`retryCount`, and the hand-rolled `setInterval` deleted.
**Verify:** zero `any` in `src/api/` (`E1.6`); `E1.4` green; jscpd clone count
drops as the four fetch copies collapse into one hook; smoke test still passes.

### 4 — Constants
`src/config.ts`: threshold bands as objects (`O2`, `POWER_BUDGET_PCT`,
`HULL_INTEGRITY`, `CREW_REST_HOURS`, `RESUPPLY_DAYS`, `HULL_TEMP_C`), scalars
(`POLL_INTERVAL_MS`, `RETRY_COUNT`, `TREND_LOOKBACK`, trend deltas,
`SPARKLINE_MAX_POINTS`, `POWER_RATED_KW`, `POWER_FLOOR_KW`),
`TELEMETRY_METRICS`, `TONE_CLASS`, `SEVERITY_CLASS`.

`SEVERITY_CLASS`, not `SEVERITY_COLORS`: the palette stays in `:root`, so the
mapping's values are class names and the module holds no hex at all. The tone
token is generic (`tone-ok`) rather than tile-specific, because the tiles, the
status pill, and the alert banner all take their tint from it.
**Verify:** `E1.7` green; no numeric literal thresholds left in `src/`.

### 5 — Domain
Five modules with colocated tests: `station-status.ts`, `telemetry.ts`,
`incidents.ts`, `crew.ts`, `board-time.ts`. `src/utils.ts` is deleted —
every survivor has a home. `formatInstant` and `formatDay` replace the two
diverged date formatters (and stop rendering a fake midnight for the
commissioning date).
**Verify:** `E1.5` green; branch coverage climbs; `computeStationStatus` tested
against 19.5 / 19.9.

### 6 — Decompose
`DashHeader`, `AlertBanner`, `Tile`, `TelemetryTiles`, `OpsTiles`. `Dashboard`
becomes four hooks, one loading/error gate, and a composition. Status-pill and
alert-banner colours move to CSS classes; the `flashAlert` behaviour returns as
`alert-flash` applied when the banner mounts in `CRITICAL`.
**Verify:** `E1.2` (< 150 non-empty lines); coverage crosses 60 / 60 / 50;
jscpd under 3%; full `validate` green apart from Exercises 2–4.

## Risks

1. **Coverage is red from commit 2 to commit 5 and green at 6.** 60% line
   coverage is unreachable until the god component is split into testable
   pieces. `validate` runs after each commit regardless, and the failure list
   shrinks monotonically.
2. **`npm run validate` cannot be fully green until Exercise 4.** `E2.x`–`E4.x`
   fail by design. Because the script chains with `&&`, structural output is
   read via `npm run validate:structure` directly during this exercise.
3. **`tests/smoke.test.tsx` pins the string `Establishing uplink to ISS
   Kruger-60…`** and renders `<App />` with a `fetch` that never resolves. The
   provider must mount in `App.tsx` and `Dashboard` must render that copy on
   first paint.
4. **jscpd is a live constraint on decomposition.** Eight bespoke tile
   components would trip the 8-line / 45-token clone detector, hence one generic
   `Tile` primitive fed by domain-computed tone.
5. **`max-lines-per-function` is 80 for `src/components/**`.** The tile grid is
   split into `TelemetryTiles` + `OpsTiles` rather than one component sitting a
   tile away from the cap.
6. **React Query needs `package-lock.json` committed** — CI runs `npm ci`, and
   `.github/` is a locked path.
7. **Board Time couples the resupply countdown to the telemetry payload.** Safe
   only because `Dashboard` gates on all four resources before rendering; noted
   in the decision record.

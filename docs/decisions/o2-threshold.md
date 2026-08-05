# The O2 floor is 19.5 %

**Status:** accepted · **Supersedes:** ops handbook rev. C (19.0 / 19.8)

## The problem

The repo ships two different O2 alert thresholds and no way to tell which is
authoritative by reading the code. Both are live-looking, both are commented as
if deliberate.

| Value | Where |
|---|---|
| **19.5 / 19.9** | `Dashboard.tsx` — status computation, the O2 tile class, and the tile's own `floor 19.5` label; `TelemetryChart.tsx` — the breach marker |
| 19.0 / 19.8 | `utils.computeStationStatus`; `OldDashboard.tsx` |

Each carries a `NOTE:` comment vouching for itself — one cites the mission
control wall display, the other cites ops handbook rev. C. Reading the source
surfaces the conflict but cannot settle it, which is the only reason this
decision is written down.

## Why 19.5 wins

1. **It is what actually renders.** Both call sites a user can reach today use
   19.5. The 19.0 pair reaches no pixel.
2. **The UI already commits to it in text.** The O2 tile prints
   `floor 19.5 · cabin nominal 20.9`. Adopting 19.0 would mean the dashboard
   labels a floor it does not enforce.
3. **The rival lives only in unreachable code.** `computeStationStatus` has no
   importers — its sole reference is its own definition in `src/utils.ts`.
   `OldDashboard.tsx` had no importers either and has since been deleted.
   Handbook rev. C predates the 2035 migration.

So the 19.0 / 19.8 pair is not a competing requirement; it is a fossil that was
never updated because nothing called it.

## Consequences

- The canonical rules live in `src/config.ts` and are consumed from there.
  Nothing recomputes a threshold locally.
- Deleting `computeStationStatus` is safe **only once its replacement exists**
  in `src/domain/` — it is unreachable, but it encodes the status rules and is
  the last written record of them outside this file.
- If ops later insists on 19.0, change `src/config.ts` and update this record.
  Do not reintroduce a second threshold to satisfy both.

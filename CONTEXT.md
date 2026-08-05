# Orbital Ops

Mission control for a single crewed station. Operators watch one board and are
expected to act on what it shows, so the language here separates what demands a
reaction from what is merely true.

## Language

**Station Status**:
The station's overall health as one of `NOMINAL`, `DEGRADED`, or `CRITICAL`,
derived from telemetry and open incidents.
_Avoid_: health, state, condition, status code

**O2 Floor**:
The oxygen percentage below which the station is `CRITICAL`. It is 19.5 — see
[docs/decisions/o2-threshold.md](docs/decisions/o2-threshold.md).
_Avoid_: O2 threshold, O2 limit, minimum O2

**Live Resource**:
A station feed whose values can change between two readings in a way an operator
must act on — telemetry and incidents. Live resources are re-read continuously.
_Avoid_: real-time data, streaming data, hot data

**Reference Data**:
A station feed an operator reads for context, not for reaction — the station
record and the crew roster. Read once when the board opens.
_Avoid_: static data, cold data, metadata

**Board Time**:
The instant the board treats as "now" when counting down or asking what happened
today. It is the telemetry feed's own last-updated time, never the wall clock —
see [docs/decisions/board-time.md](docs/decisions/board-time.md).
_Avoid_: now, current time, mission time, wall clock

**Crew Rest**:
Average sleep hours across the roster. Changing, but never actionable — it is
Reference Data, not a Live Resource.
_Avoid_: fatigue, sleep debt

# Orbital Ops

Mission-control dashboard. The stack, the scripts, and the lint/coverage caps
live in `package.json`, `vite.config.ts`, and `eslint.config.js` — read those
rather than a copy of them here.

This file records only what you cannot recover by reading the source.

## Commands

`npm run validate` is the full gauntlet and must be green before every commit.
The scripts it chains are in `package.json`.

## Architecture

There is no backend. `public/api/*.json` is a static fixture set served as-is;
if you go looking for a server, there isn't one.

Server state will be owned by `@tanstack/react-query`. It is **not installed
yet**, so every panel currently hand-rolls its own fetch/retry/loading logic.
Do not copy that pattern — removing it is the point of Exercise 1. When you add
the provider, mount it in `src/App.tsx`, not `src/main.tsx`:
`tests/smoke.test.tsx` renders `<App />` directly.

Pure logic goes in `src/domain/` with colocated tests — panels are expensive to
test and the coverage gate is cheapest to satisfy there.

## Conventions

Never suppress a lint rule. The caps in `eslint.config.js` are the grading
contract; restructure the code to fit them. Do not add
`@tanstack/eslint-plugin-query` — that config file is locked.

### Alert thresholds — resolved

The source contradicts itself here, so it cannot answer this. Canonical values,
to be single-sourced from `src/config.ts`:

- **CRITICAL** — O2 < 19.5 %, or more than one unresolved critical incident
- **DEGRADED** — O2 < 19.9 %, or power < 50 kW, or any unresolved critical incident
- **NOMINAL** — otherwise

19.5 wins: it is what the live call sites render and what the UI labels as the
floor. The rival 19.0 / 19.8 pair survives only in unreachable code. Never
introduce a second threshold.

→ [Why 19.5](docs/decisions/o2-threshold.md)

## Locked files

Never edit `vite.config.ts`, `eslint.config.js`, `tsconfig*.json`,
`.jscpd.json`, `scripts/validate.ts`, `RUBRIC.md`, or `ASSIGNMENT.md`. They are
the grading contract — fix `src/`, not the config. `public/api/**` is read-only,
with one exception: creating `public/api/fuel.json` for Exercise 4.

## Plan Mode

- Make the plan extremely concise. Sacrifice grammar for the sake of concision.
- At the end of each plan, give me a list of unresolved questions to answer, if any.

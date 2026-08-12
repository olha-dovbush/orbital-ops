# Orbital Ops

Mission-control dashboard.

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

Domain vocabulary lives in `CONTEXT.md`; decisions that the source cannot settle
on its own live in `docs/decisions/`. Read both before renaming a concept.

## Conventions

Never suppress a lint rule. The caps in `eslint.config.js` are the grading
contract; restructure the code to fit them. Do not add
`@tanstack/eslint-plugin-query` — that config file is locked.

Where things go:

- `src/api/` — models and one generic `getData`. Every payload is registered in
  `ApiResources`, so a path can only return its own type. No `any`, ever.
- `src/hooks/` — one thin `useQuery` wrapper per resource. Only Live Resources
  poll; Reference Data fetches once. Nothing else fetches.
- `src/domain/` — pure functions, colocated `*.test.ts`. No React, no `Date.now()`
  — an instant is always an argument.
- `src/config.ts` — every threshold, interval, and domain→token mapping. A number
  that means something belongs here, not at its call site.
- `src/components/` — flat. Queries live in section containers; everything
  below them takes typed props.
- `tests/` — rendering tests. They stub `global.fetch`, never `src/api/client`.

## Deletion policy

Delete without asking:

- Code with no importers that no test covers — dead exports, dead files.
- Commented-out code. Git remembers it.
- A local copy of something that now exists in `src/domain/` or `src/config.ts`.
- Imports, variables, and helpers that your own change just orphaned.

Ask first:

- Anything a `docs/decisions/` record says to keep, and anything that is the last
  written record of a rule — replace it before removing it.
- Anything under `public/api/**` or in the locked list below.
- Behaviour a user can see, even if the code implementing it is ugly. Removing a
  visible behaviour is a product decision, not a cleanup.

## Locked files

Never edit `vite.config.ts`, `eslint.config.js`, `tsconfig*.json`,
`.jscpd.json`, `scripts/validate.ts`, `RUBRIC.md`, or `ASSIGNMENT.md`. They are
the grading contract — fix `src/`, not the config. `public/api/**` is read-only,
with one exception: creating `public/api/fuel.json` for Exercise 4.

## Agent skills

### Issue tracker

GitHub Issues on `olha-dovbush/orbital-ops`, via the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

The five canonical roles, each label named after its role. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: `CONTEXT.md` + `docs/decisions/` at the repo root. See `docs/agents/domain.md`.

Don't use the AskUserQuestion tool.

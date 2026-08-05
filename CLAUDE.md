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

## Conventions

Never suppress a lint rule. The caps in `eslint.config.js` are the grading
contract; restructure the code to fit them. Do not add
`@tanstack/eslint-plugin-query` — that config file is locked.

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

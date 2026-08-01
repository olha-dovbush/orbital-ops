# Orbital Ops 🛰

Mission control dashboard for the (fictional) space station **ISS Kruger-60** —
and the hands-on playground for the AIGENSA **AI-Assisted Coding** course,
weeks 2-3.

The app works. The code is a mess. That is the assignment.

You will refactor a deliberately smelly React dashboard using agentic
engineering: plan mode, `CLAUDE.md`, hooks, and Agent Skills. A validation
gauntlet tells you, deterministically, when you are done — and Claude grades
your PR against [RUBRIC.md](RUBRIC.md).

## Prerequisites

- Node.js 22+
- [Claude Code](https://claude.com/claude-code) (or another agentic coding tool — but the exercises target Claude Code mechanics)

## Getting started

```bash
npm ci
npm run dev        # open the dashboard — it works!
npm run validate   # watch it fail — 5 kinds of red, all expected
```

Do not fix anything yet. Read [ASSIGNMENT.md](ASSIGNMENT.md) first — the
process is the point.

## Scripts

| Script | What it does | Baseline |
|---|---|---|
| `npm run dev` | Dev server | ✅ works |
| `npm run build` | Production build (no typecheck, on purpose) | ✅ works |
| `npm run test` | Smoke test only | ✅ green |
| `npm run validate` | Lint + strict typecheck + coverage + duplication + structure | ❌ red until you finish |

`npm run validate` runs the exact checks CI runs. Sub-checks:
`lint`, `typecheck`, `test:coverage`, `dupcheck`, `validate:structure`.

## How to work

1. Create this repo from the template (green **Use this template** button), clone it.
2. Create a working branch: `git checkout -b work`.
3. Work through [ASSIGNMENT.md](ASSIGNMENT.md) exercise by exercise.
4. Open a PR from `work` to `main` **in your own repo**. CI gives you
   instant red/green per check.
5. Iterate until everything is green and the Claude grade says `pass`.

## Automated grading (optional but recommended)

The `Claude Grade` workflow reviews your PR against [RUBRIC.md](RUBRIC.md)
and posts a scored review comment plus a `claude-grade` commit status.

Enable it once:

1. Get an Anthropic API key.
2. In your repo: **Settings → Secrets and variables → Actions → New repository secret**.
3. Name: `ANTHROPIC_API_KEY`, value: your key.

Without the secret, the workflow skips politely and the deterministic checks
still work.

## Rules of the game

- **Locked files** — the validation contract is part of the assignment. CI
  fails the PR if you touch: `RUBRIC.md`, `.github/`, `eslint.config.js`,
  `tsconfig.strict.json`, `.jscpd.json`, `vite.config.ts`,
  `scripts/validate.ts`, `public/api/` (except adding `fuel.json` — see
  ASSIGNMENT.md Exercise 4 for how that interacts with your own hook).
- Fix the code, not the checks.
- The data is fictional. No astronauts were harmed.

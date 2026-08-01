# The Assignment

Five exercises. Each one practices a specific mechanic of agentic
engineering from weeks 2-3: instruction files, plan mode, hooks, skills, and
the Research → Plan → Implement → Validate loop.

**The iron rule:** every exercise starts in plan mode and ends with
`npm run validate`. The structural checks (`E0.1`, `E1.2`, …) below map 1:1
to the output of `npm run validate:structure` — you can self-audit at any time.

---

## Exercise 0 — Orient & Instruct (~30 min)

Research before touching anything.

1. Run `npm run dev`. Click around. The app works.
2. Run `npm run validate`. Read **every** failure. This is your work list.
3. Explore the code with your agent. Ask it to map the smells: where is the
   duplication? What is dead? What is untyped? What is inconsistent?
4. Extend `CLAUDE.md` so your agent stops guessing. Document what YOU decide:
   commands, architecture, conventions (naming, file layout, what goes in
   `src/domain/` vs components), and an explicit deletion policy (what the
   agent may remove without asking).

Checks:
- [ ] `E0.1` CLAUDE.md has ≥ 30 non-empty lines
- [ ] `E0.2` CLAUDE.md has `## Commands`, `## Architecture`, `## Conventions` sections

> Why: a thin CLAUDE.md is the #1 reason agents flail. You just felt it.

---

## Exercise 1 — The Great Refactor (~2-3 h)

**Enter plan mode first.** Produce a written refactoring plan BEFORE any
edit and commit it as `docs/refactor-plan.md` — targets, order, risks, and
how you'll verify each step. Then implement in **at least 4 separate
commits**, one smell-cluster per commit, running `npm run validate` after
each.

The targets (your plan should find all of these during Research):

1. **The god component.** `Dashboard.tsx` does everything. Decompose it.
2. **Copy-pasted fetching.** Three panels each own a diverged copy of the
   same fetch/retry/loading dance. One shared, typed abstraction.
3. **The `any` API.** `src/api/client.ts` is untyped and `types.ts` is
   half-finished. Type it end to end.
4. **Homeless logic.** Status computation, downsampling, and formatting live
   in components and a `utils.ts` grab-bag. Pure logic goes to `src/domain/`,
   with unit tests.
5. **The dead.** Something in `src/components/` has been dead since 2035.
   Delete it, and everything only it used.
6. **Magic numbers.** Poll intervals, thresholds, colors — scattered and
   hardcoded. Centralize them in `src/config.ts`.

One more thing: something about the alert thresholds doesn't add up. Find it
during Research, decide which value is right, and document your decision in
`docs/refactor-plan.md`.

Checks:
- [ ] `E1.1` docs/refactor-plan.md committed, ≥ 20 lines
- [ ] `E1.2` Dashboard.tsx < 150 non-empty lines
- [ ] `E1.3` OldDashboard.tsx deleted
- [ ] `E1.4` src/hooks/ has a shared hook
- [ ] `E1.5` src/domain/ has extracted pure logic
- [ ] `E1.6` zero `any` in src/api/
- [ ] `E1.7` src/config.ts exists
- [ ] plus: lint, typecheck, coverage, and duplication all green

---

## Exercise 2 — Wire Up Hooks (~45 min)

Configure three hooks in `.claude/settings.json` (it ships empty), with
scripts in `.claude/hooks/`:

1. **PostToolUse** — after any Edit/Write to `src/**`, run the test suite
   (e.g. `npx vitest run tests/ src/`) and fail loudly so the agent sees
   broken tests immediately.
2. **PreToolUse** — block edits to `public/api/**` and `RUBRIC.md`:
   exit code **2** with a clear message on stderr. (Exit 2 blocks the tool
   call; the message is fed back to the agent.)
3. **UserPromptSubmit** — inject a one-line reminder of your project
   conventions (exit 0, message on stdout).

Prove it works: put a short session excerpt into `docs/hooks-demo.md`
showing your PreToolUse hook actually blocking an edit attempt.

Checks:
- [ ] `E2.1` .claude/settings.json is valid JSON
- [ ] `E2.2` PreToolUse, PostToolUse, UserPromptSubmit all configured
- [ ] `E2.3` ≥ 2 executable scripts in .claude/hooks/
- [ ] `E2.4` docs/hooks-demo.md shows a hook firing, ≥ 10 lines

---

## Exercise 3 — Author an Agent Skill (~45 min)

Create `.claude/skills/new-widget/SKILL.md`: a skill that teaches your agent
to scaffold a new dashboard widget following **your** refactored
conventions — typed data via your shared hook, pure logic in `src/domain/`,
a colocated unit test, registered in the dashboard grid.

Requirements:
- Valid frontmatter: `name`, `description`, and `allowed-tools` scoped to
  what scaffolding actually needs (e.g. `Read, Write, Edit, Bash(npx vitest:*)`).
- Progressive disclosure: keep SKILL.md under 100 lines; put the full
  annotated code template in `references/widget-template.md` and link it.

Checks:
- [ ] `E3.1` exactly one skill under .claude/skills/
- [ ] `E3.2` frontmatter has name + description
- [ ] `E3.3` frontmatter restricts allowed-tools
- [ ] `E3.4` SKILL.md < 100 non-empty lines
- [ ] `E3.5` references/ exists and is linked from SKILL.md

---

## Exercise 4 — Prove It: Fuel Reserves widget (~45 min)

Use **your own skill from Exercise 3** to add a Fuel Reserves widget:
current reserves, consumption rate, and a computed **days-of-fuel-remaining**.

Data — save as `public/api/fuel.json`:

```json
{
  "updated": "2036-07-11T09:00:00Z",
  "tanks": [
    { "id": "main-a", "type": "hydrazine", "capacityKg": 1200, "currentKg": 830 },
    { "id": "main-b", "type": "hydrazine", "capacityKg": 1200, "currentKg": 764 },
    { "id": "rcs", "type": "cold-gas", "capacityKg": 300, "currentKg": 211 }
  ],
  "dailyConsumptionKg": 14.2
}
```

Heads-up: your own PreToolUse hook from Exercise 2 blocks writes to
`public/api/**`. Handle it consciously — scope the hook to allow this one
file, or disable-and-re-enable with intent. Either way, note what you did in
`docs/hooks-demo.md`. That's the lesson.

Checks:
- [ ] `E4.1` public/api/fuel.json exists
- [ ] `E4.2` a Fuel widget component exists
- [ ] `E4.3` fuel domain logic in src/domain/ (with a unit test)
- [ ] plus: the full gauntlet stays green

---

## Submitting

1. Push your `work` branch and open a PR to `main` in your own repo.
2. All CI checks green: Smoke, Validate (6 jobs), and — if you configured
   the API key — a `pass` from Claude Grade.
3. The Claude review comment on your PR is your feedback. Iterate if it says
   `needs-work`.

Scoring: see [RUBRIC.md](RUBRIC.md). Pass ≥ 80/100.

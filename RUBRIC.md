# Grading Rubric

This rubric is public on purpose: it is the spec. The automated grader reads
the copy of this file from the `main` branch, never the copy in your PR.

Total: 100 points.

## 1. Refactoring quality — 35 pts

| Criterion | Pts |
|---|---|
| God component decomposed: `Dashboard.tsx` is a thin composition of focused components | 10 |
| Duplicated fetch logic replaced by one shared abstraction (hook or typed client) used by all panels | 8 |
| API layer fully typed: complete models in `src/api/types.ts`, generic fetch, zero `any` | 7 |
| Business logic extracted into pure, testable `src/domain/` modules | 5 |
| Dead code removed (`OldDashboard.tsx`, unused exports, commented-out blocks) | 2 |
| Constants centralized in `src/config.ts`; the O2 threshold discrepancy found and its resolution documented | 3 |

## 2. Process discipline — 15 pts

| Criterion | Pts |
|---|---|
| `docs/refactor-plan.md` committed BEFORE the refactoring commits, and the plan is real (targets, order, risks) | 5 |
| Incremental commits that map to the plan (not one mega-commit) | 5 |
| `CLAUDE.md` meaningfully extended: commands, architecture, conventions, deletion policy | 5 |

## 3. Hooks — 15 pts

| Criterion | Pts |
|---|---|
| `PostToolUse` hook runs tests after source edits and reports failures back | 6 |
| `PreToolUse` hook blocks edits to protected paths using exit code 2 with a clear stderr message | 6 |
| `UserPromptSubmit` hook injects useful project context | 3 |

## 4. Agent Skill — 15 pts

| Criterion | Pts |
|---|---|
| Valid frontmatter with `name`, `description`, and scoped `allowed-tools` | 5 |
| Progressive disclosure: lean SKILL.md, full template in `references/` | 5 |
| The skill genuinely encodes the repo's post-refactor conventions (typed data, domain module, test) | 5 |

## 5. Feature: Fuel Reserves widget — 10 pts

| Criterion | Pts |
|---|---|
| Follows the refactored architecture (shared hook, domain module, no copy-paste) | 5 |
| Typed end-to-end and unit-tested (days-of-fuel-remaining calculation) | 5 |

## 6. Tests — 10 pts

| Criterion | Pts |
|---|---|
| Domain logic covered by focused unit tests | 6 |
| Assertions are meaningful (edge cases, not snapshot spam) | 4 |

## Verdicts

| Verdict | Score |
|---|---|
| `pass` | >= 80 |
| `needs-work` | 60–79 |
| `fail` | < 60 |

## Grader output contract

The grader must produce a JSON verdict:

```json
{
  "verdict": "pass | needs-work | fail",
  "score": 87,
  "per_criterion": [{ "criterion": "...", "points": 8, "max": 10, "note": "..." }],
  "top_3_improvements": ["...", "...", "..."]
}
```

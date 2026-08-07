# Hooks, firing

Three hooks are wired in `.claude/settings.json`; the scripts live in
`.claude/hooks/`. Every excerpt below is copied verbatim out of a real session —
nothing here is reconstructed from what the scripts *should* print.

| Event | Script | Effect |
| --- | --- | --- |
| `PreToolUse` (Edit\|Write) | `block-locked-files.sh` | exit 2 — the write never happens |
| `PostToolUse` (Edit\|Write) | `run-tests.sh` | exit 2 on a red suite — failures land back in context |
| `UserPromptSubmit` | `remind-conventions.sh` | exit 0 — one line of stdout joins the prompt |

## PreToolUse — the block

The point of the exercise. An attempt to write a new fixture under
`public/api/`, which `CLAUDE.md` marks read-only:

```
● Write(public/api/hook-demo-probe.json)
  ⎿  Error: PreToolUse:Write hook error:
     ["$CLAUDE_PROJECT_DIR"/.claude/hooks/block-locked-files.sh]:
     BLOCKED: public/api/hook-demo-probe.json

     public/api/** is a read-only fixture set. Change what reads it, not it.
```

No file was created — exit 2 stops the tool call before it runs, and the stderr
message is what the agent reads instead of a success. The same script guards
`RUBRIC.md`, `ASSIGNMENT.md`, and the locked configs, each with its own reason;
the reason is the useful half, because "blocked" alone just invites a retry.

## PostToolUse — the red suite

Provoked deliberately: `pad()` in `src/domain/board-time.ts` was changed to drop
its leading zero, and the hook answered the edit before anything else could run.

```
● Update(src/domain/board-time.ts)
  ⎿  PostToolUse:Edit hook blocking error: Tests FAILED after editing
     src/domain/board-time.ts

     ❯ tests/incident-feed.test.tsx (8 tests | 1 failed) 144ms
     ❯ src/domain/board-time.test.ts (8 tests | 1 failed) 4ms

     FAIL  src/domain/board-time.test.ts > formats an instant in UTC, whatever
     the reader clock says
     AssertionError: expected 'Jul 11 7:42z' to be 'Jul 11 07:42z'

      Test Files  2 failed | 11 passed (13)
           Tests  2 failed | 111 passed (113)
```

Worth noting what the second failure bought: the unit test and the rendering
test both broke, so the excerpt shows the blast radius of a one-character change
in `src/domain/` without anyone going looking for it. Reverting `pad()` ran the
hook again; a green suite exits 0 and says nothing at all.

## UserPromptSubmit — the reminder

Fires on every prompt, before the model sees it. From the top of the session
that produced this file:

```
UserPromptSubmit hook success: Convention: never suppress a lint rule and never
write `any` in src/api/ — restructure to fit the caps in eslint.config.js.
```

One line on purpose. It is paid on every single turn, so a paragraph here would
crowd out the thing it was meant to defend.

## Reproducing

The PreToolUse excerpt costs nothing to re-run: ask the agent to write any file
under `public/api/`, and read the error. The PostToolUse one needs a break and a
revert — `pad()` is a good target precisely because two different test files
depend on it.

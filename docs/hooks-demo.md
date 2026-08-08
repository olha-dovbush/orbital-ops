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

## PreToolUse — the one exception, scoped

Exercise 4 needs `public/api/fuel.json`, which the block above refuses. The
guard was widened by exactly one path, and only far enough to **create** it:

```bash
public/api/fuel.json)
  # The one exception CLAUDE.md carves out, scoped to *creating* the file.
  # Once it exists it is guarded like the rest of the fixture set.
  [ -e "$root/$rel" ] || exit 0
  reason="public/api/fuel.json already exists. The exception covers creating it, not editing it." ;;
```

The write went through once. Editing the file afterwards is refused again, with
its own reason rather than the generic fixture one:

```
● Update(public/api/fuel.json)
  ⎿  Error: PreToolUse:Edit hook error:
     ["$CLAUDE_PROJECT_DIR"/.claude/hooks/block-locked-files.sh]:
     BLOCKED: public/api/fuel.json

     public/api/fuel.json already exists. The exception covers creating it,
     not editing it.
```

That is the whole widening: one path, one direction, and every other path under
`public/api/` keeps the refusal it had. The alternative — disabling the hook for
a turn and re-enabling it — leaves nothing behind to say the exception was
deliberate, and nothing to stop it quietly becoming "this fixture is editable".

**The honest limit.** The matcher is `Edit|Write`. A `cat > public/api/…`
heredoc in a Bash call never reaches this script and is not blocked by anything.
That is a property of the guard's matcher, not a workaround anyone should reach
for; a `PreToolUse` entry matching `Bash` would be the fix, and it is not in
scope here.

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

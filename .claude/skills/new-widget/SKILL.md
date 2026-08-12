---
name: new-widget
description: Scaffold a new dashboard widget as one vertical slice — fixture, payload type, hook, domain module with colocated tests, component, and its line in the grid. Use when asked to add a widget, add a panel, add a tile, or surface a new resource on the dashboard.
allowed-tools: Read, Write, Edit, Bash(npx vitest run:*), Bash(npm run validate)
---

# New widget

A widget is a **slice**: one payload type, one hook, one domain module, one
component, one line in the grid. Build the slice in the order below.

The annotated template for every file of a slice is
[`references/widget-template.md`](references/widget-template.md) — read it before
step 2 and copy the reasoning in its comments. Name everything from the
vocabulary in `CONTEXT.md`.

## 1. Preflight

Three answers decide the slice. **Derive what the repo can answer and propose the
rest** — a question handed back unanswered is legwork you skipped.

- **Payload** — the fields `public/api/<resource>.json` actually carries.
- **Cadence** — Live Resource or Reference Data. A static fixture cannot settle
  this: name the hook in `src/hooks/` you matched, and what made it match.
- **Reading** — the value computed, and the bands. Where the spec is silent,
  propose the number and the reasoning that picks it.

Then resolve the slice against the repo. For each file, report the exact path
and whether it exists — a slice built at a guessed path passes its own tests and
fails the board.

| # | Path | Action |
|---|---|---|
| 1 | `public/api/<resource>.json` | hand-off — see below |
| 2 | `src/api/types.ts` | edit — payload interface + `ApiResources` entry |
| 3 | `src/config.ts` | edit — every threshold and interval the reading needs |
| 4 | `src/domain/<concept>.ts` | create — the pure reading |
| 5 | `src/domain/<concept>.test.ts` | create — colocated |
| 6 | `src/hooks/use<Resource>.ts` | create — one `useQuery` wrapper |
| 7 | `src/components/<Widget>.tsx` | create — the container |
| 8 | `src/App.tsx` | edit — one line inside `<div className="grid">` |

Row 1 is a hand-off: `public/api/**` is read-only and the PreToolUse hook
refuses writes to it. If the fixture is absent, the user places it or scopes the
hook — their call, and they note what they chose in `docs/hooks-demo.md`.

Present the three answers and the table together, each answer marked **read**,
**proposed**, or **open**, then **wait for the user's go**. One approval covers
the whole slice: correcting a proposal is a reply, never a restart. Reserve
**open** for what the repo cannot answer and no proposal can be defended for —
and ask it here, inside the approval, rather than stopping the run.

## 2. Build the slice

In table order, because each file compiles against the one above it.

1. **Register the payload.** Add the interface, then the `ApiResources` entry
   that binds the resource path to it. Every field the fixture carries is typed.
   Done when the registry entry is what makes `getData('<resource>')` compile.
2. **Name the numbers.** Every threshold and interval the approved reading needs
   goes in `src/config.ts` with a comment saying what it means. Done when no
   number is left to write at a call site.
3. **Write the reading.** A pure module in `src/domain/`. Done when every band it
   applies reads from `src/config.ts`.
4. **Test the reading.** Colocated `*.test.ts`, one `test()` per rule. Done when
   every rule in the template's test list has a test and
   `npx vitest run src/domain/<concept>.test.ts` is green.
5. **Wrap the resource.** One thin `useQuery` per resource. The approved cadence
   decides the options: a Live Resource takes `refetchInterval`, Reference Data
   takes `staleTime`. Done when the hook is one `useQuery` call and its options.
6. **Compose the widget.** The container calls the hook, gates on it with
   `PanelNotice`, and passes typed props down. Done when every number it shows
   comes from the domain module.
7. **Hang it on the board.** One line in the grid in `src/App.tsx`. Done when
   `src/App.tsx` imports the widget and renders it inside `<div className="grid">`.

## 3. Validate

Run `npm run validate` — the whole gauntlet, including the structural checks.
Green is the finish line; a passing test file is not.

Then report the slice back: the eight paths, what each one now holds, and any
proposal the user accepted that the spec never named.

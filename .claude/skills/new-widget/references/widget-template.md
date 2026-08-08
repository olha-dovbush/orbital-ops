# Widget template

The eight files of a slice, annotated. Where the repo already has a working
example, this file points at it rather than copying it — the copy is what goes
stale.

Placeholders:

- `<resource>` — the API path, lowercase: `public/api/<resource>.json`
- `<Resource>` — its payload type, PascalCase: `CrewResponse`, `Station`
- `<collection>` — the key the payload uses for its collection, the fixture's
  own word: `members`, `items`, `series`
- `<Item>` — that collection's element type, PascalCase: `CrewMember`, `Incident`
- `<concept>` — the domain module's file, kebab-case: `src/domain/<concept>.ts`
- `<conceptFn>` — the function it exports, camelCase, a verb the domain uses:
  `sortRoster`, `timeUntil` — never the file name
- `<Concept>` — the shape that function returns, PascalCase
- `<CONCEPT>_<UNIT>` — its band in `src/config.ts`, SCREAMING_SNAKE
- `<Widget>` — the component, PascalCase
- `<Heading>` — what the panel calls itself to an operator: `Crew`, `Fuel`

`fuel`, `crew`, and `telemetry` below are examples, not a vocabulary — name
everything from `CONTEXT.md`.

---

## 1. `public/api/<resource>.json` — the fixture

Read it before typing it: the payload on disk is the contract, and a field the
fixture does not carry is a field the widget cannot read.

Most payloads carry an `updated` instant — `station.json` does not. Type what
this fixture carries, not what its neighbours carry.

---

## 2. `src/api/types.ts` — the payload, registered

`src/api/types.ts` holds the four existing payloads; read it for the house
style. Two things it will not tell you on its own:

**Name the collection the fixture's way.** `crew.json` carries `members`,
`telemetry.json` carries `series`, `incidents.json` carries `items`, and
`Station` is flat with no collection at all. There is no house `items`.

**The registry entry is what makes the resource fetchable** — without it,
`getData('<resource>')` does not compile:

```ts
export interface ApiResources {
  // …existing resources
  <resource>: <Resource>;
}
```

A field the fixture always sends is required, not optional.

---

## 3. `src/config.ts` — the numbers, named

Bands go in one `as const` object per concept, so a rule changes in one place:

```ts
/** What the band means, in the domain's words — not "the warn value". */
export const <CONCEPT>_<UNIT> = { WARN: 0, BAD: 0 } as const;
```

A Live Resource reuses `POLL_INTERVAL_MS`; Reference Data reuses
`REFERENCE_STALE_TIME_MS`. Both reuse `RETRY_COUNT`. A second interval is a new
cadence, and a new cadence is a decision — say so rather than inventing one.

---

## 4. `src/domain/<concept>.ts` — the reading

```ts
// One line on what this module is responsible for.

import { <CONCEPT>_<UNIT>, type Tone } from '../config';
import type { <Item> } from '../api/types';

/** The shape the component renders: the value, and how hard it is to ignore. */
export interface <Concept> {
  value: number;
  tone: Tone;
}

/** What the reading means, and why the bands sit where they do. */
export function <conceptFn>(<collection>: <Item>[]): <Concept> {
  // Guard the degenerate payload here, once, rather than at every call site.
  // Decide what an empty collection *means* — often not zero.

  const value = 0; // …the computation

  // Compare against the band in the direction this concept reads. O2 and power
  // fall towards trouble; hull temperature leaves a range on either side. The
  // comparison below is the falling case — invert it or bracket it to match.
  if (value < <CONCEPT>_<UNIT>.BAD) return { value, tone: 'bad' };
  return { value, tone: value < <CONCEPT>_<UNIT>.WARN ? 'warn' : 'ok' };
}
```

Take `boardTime: string` as a parameter only when the reading counts from an
instant — most do not. When it does, it is always a parameter; the module never
reads a clock.

Returning a new array rather than sorting in place keeps the payload in the
query cache untouched — assert that.

---

## 5. `src/domain/<concept>.test.ts` — colocated

```ts
import { test, expect } from 'vitest';
import { <conceptFn> } from './<concept>';
import type { <Item> } from '../api/types';

// A builder with defaults, so each test states only the field it is about.
function item(overrides: Partial<<Item>> = {}): <Item> {
  return { id: 'a', /* …every required field */ ...overrides };
}

test('says what the rule is, in the words the domain uses', () => {
  expect(<conceptFn>([item()]).value).toBe(0);
});
```

One `test()` per rule. What earns a test:

- **Each boundary a threshold creates** — at it, and either side of it. A band
  with three tests has its `<` vs `<=` pinned; with one, it does not.
- **The degenerate payload** — empty collection, zero denominator, a field at
  its floor.
- **Purity** — call the function, then assert the input is unchanged.

Assert the value, not the shape of the object.

---

## 6. `src/hooks/use<Resource>.ts` — the resource

Copy the hook whose cadence matches: `src/hooks/useTelemetry.ts` for a Live
Resource, `src/hooks/useCrew.ts` for Reference Data. Swap the resource, and say
in the doc comment which cadence this one is and what makes it that.

A hook that shapes data is a domain module hiding in the wrong folder.

---

## 7. `src/components/<Widget>.tsx` — the container

`src/components/CrewPanel.tsx` is the shape: the hook, the `isPending` gate, the
`isError` gate, then the section. Copy it and swap the reading in:

```tsx
const reading = <conceptFn>(query.data.<collection>);

return (
  <section className="panel">
    <h2><Heading></h2>
    <span className={TONE_CLASS[reading.tone]}>{reading.value}</span>
  </section>
);
```

Gating on the panel's own query keeps one dead feed inside its own section of
the board. Colour comes from `TONE_CLASS`, never a hex code at the call site.

If the reading counts from Board Time, the container calls `useTelemetry()` as
well and passes `telemetry.updated` down. Board Time is the telemetry feed's
instant — never this payload's own `updated`, never the wall clock. See
`docs/decisions/board-time.md`. Gate on both queries before reading either.

---

## 8. `src/App.tsx` — the grid

```tsx
<div className="grid">
  {/* …existing panels */}
  <<Widget> />
</div>
```

One import, one line.

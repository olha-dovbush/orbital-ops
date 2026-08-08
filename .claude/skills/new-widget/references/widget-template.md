# Widget template

The eight files of a slice, annotated. Placeholders:

- `<resource>` — the API path, lowercase: `public/api/<resource>.json`
- `<Resource>` — its type name, PascalCase
- `<concept>` — the domain concept, kebab-case: `src/domain/<concept>.ts`
- `<Widget>` — the component, PascalCase

Copy the structure and the reasoning in the comments. Do not copy the nouns —
`fuel`, `crew`, and `telemetry` are examples, not a vocabulary.

---

## 1. `public/api/<resource>.json` — the fixture

Read-only, and the PreToolUse hook blocks writes to it. The user places it. Read
it before typing it: the payload on disk is the contract, and a field the
fixture does not carry is a field the widget cannot read.

Every payload the board serves carries an `updated` instant. Type it.

---

## 2. `src/api/types.ts` — the payload, registered

```ts
export interface <Resource>Item {
  id: string;
  // …one field per key the fixture actually carries. No `any`, no optional
  // field the fixture always sends.
}

export interface <Resource>Response {
  updated: string;
  items: <Resource>Item[];
  // …plus any top-level scalar the fixture carries alongside the collection.
}
```

Then the registry entry — without it, `getData('<resource>')` does not compile:

```ts
export interface ApiResources {
  // …existing resources
  <resource>: <Resource>Response;
}
```

---

## 3. `src/config.ts` — the numbers, named

A number that means something lives here, not at its call site. Bands go in one
`as const` object per concept so a rule changes in one place:

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
// One line on what this module is responsible for. No React, no clock reads.

import { <CONCEPT>_<UNIT>, type Tone } from '../config';
import type { <Resource>Item } from '../api/types';

/** The shape the component renders: the value, and how hard it is to ignore. */
export interface <Concept> {
  value: number;
  tone: Tone;
}

/**
 * What the reading means and why the bands sit where they do. An instant is an
 * argument — `boardTime: string` — never `Date.now()`, so the test can pin it.
 */
export function <concept>(items: <Resource>Item[], boardTime: string): <Concept> {
  // Guard the degenerate payload here, once, rather than at every call site.
  // Decide what an empty collection *means* — often not zero.

  const value = 0; // …the computation

  if (value < <CONCEPT>_<UNIT>.BAD) return { value, tone: 'bad' };
  return { value, tone: value < <CONCEPT>_<UNIT>.WARN ? 'warn' : 'ok' };
}
```

Returning a new array rather than sorting in place keeps the payload in the
query cache untouched — assert that.

---

## 5. `src/domain/<concept>.test.ts` — colocated

```ts
import { test, expect } from 'vitest';
import { <concept> } from './<concept>';
import type { <Resource>Item } from '../api/types';

// A builder with defaults, so each test states only the field it is about.
function item(overrides: Partial<<Resource>Item> = {}): <Resource>Item {
  return { id: 'a', /* …every required field */ ...overrides };
}

test('says what the rule is, in the words the domain uses', () => {
  expect(<concept>([item()], '2036-07-11T09:00:00Z').value).toBe(0);
});
```

One `test()` per rule. What earns a test:

- **Each boundary a threshold creates** — at it, and either side of it. A band
  with three tests has its `<` vs `<=` pinned; with one, it does not.
- **The degenerate payload** — empty collection, zero denominator, a field at
  its floor.
- **Purity** — call the function, then assert the input is unchanged.

Snapshot spam is not coverage. Assert the value, not the shape of the object.

---

## 6. `src/hooks/use<Resource>.ts` — the resource

A Live Resource re-reads on the shared interval:

```ts
import { useQuery } from '@tanstack/react-query';
import { getData } from '../api/client';
import { POLL_INTERVAL_MS, RETRY_COUNT } from '../config';

/**
 * <Resource> is a Live Resource, so it re-reads on the shared poll interval.
 * Retries, cancellation on unmount, and de-duplication across mounts all come
 * from the query cache — no panel hand-rolls them.
 */
export function use<Resource>() {
  return useQuery({
    queryKey: ['<resource>'],
    queryFn: () => getData('<resource>'),
    refetchInterval: POLL_INTERVAL_MS,
    retry: RETRY_COUNT
  });
}
```

Reference Data reads once instead — swap `refetchInterval` for
`staleTime: REFERENCE_STALE_TIME_MS` and say in the comment why the reading
never goes stale.

Nothing else belongs in this file: no `useState`, no `useEffect`, no
transformation of the payload. A hook that shapes data is a domain module
hiding in the wrong folder.

---

## 7. `src/components/<Widget>.tsx` — the container

```tsx
import { use<Resource> } from '../hooks/use<Resource>';
import { <concept> } from '../domain/<concept>';
import { TONE_CLASS } from '../config';
import PanelNotice from './PanelNotice';

// One line on what an operator reads here. The fetch, the retry budget, and the
// loading/error chrome are shared code's; what is left is the reading itself.

export default function <Widget>() {
  const query = use<Resource>();

  if (query.isPending) {
    return <PanelNotice title="<Widget>" kind="loading" message="Loading…" />;
  }

  if (query.isError) {
    return (
      <PanelNotice
        title="<Widget>"
        kind="error"
        message={query.error.message}
        onRetry={() => void query.refetch()}
      />
    );
  }

  const reading = <concept>(query.data.items, query.data.updated);

  return (
    <section className="panel">
      <h2><Widget></h2>
      <span className={TONE_CLASS[reading.tone]}>{reading.value}</span>
    </section>
  );
}
```

Gating on the panel's own query keeps one dead feed inside its own section of
the board. Colour comes from `TONE_CLASS`, never a hex code at the call site.

`src/components/` is flat: a presentational child of this widget is a sibling
file taking typed props, not a nested folder.

Board Time is the payload's own `updated` instant, never the wall clock — see
`docs/decisions/board-time.md`. Pass it down as a prop.

---

## 8. `src/App.tsx` — the grid

```tsx
<div className="grid">
  {/* …existing panels */}
  <<Widget> />
</div>
```

One import, one line. The widget mounts inside the existing
`QueryClientProvider`; a second provider would give it a second cache.

---

## Before you call it done

- `npm run validate` is green — lint, typecheck, coverage, duplication, structure.
- The slice reads its numbers from `src/config.ts`, not from its own source.
- No lint rule was suppressed. The caps are the contract; restructure to fit them.

# Fuel Endurance is pooled across every tank

**Status:** accepted

## The problem

The station carries two propellants that are not physically interchangeable:
hydrazine in `main-a` and `main-b`, cold-gas in `rcs`. A reader who notices that
will reasonably expect two endurance figures — the hydrazine will not fly the
RCS thrusters and vice versa — and will assume a single pooled number is a bug
someone missed.

It is not. It is the only number the feed can support, and this record exists so
the next reader does not re-derive that from scratch.

## Why one number

`public/api/fuel.json` reports **one station-wide `dailyConsumptionKg`**. It
carries no per-type split, and no per-tank burn.

A per-type endurance therefore needs a per-type rate, and there is nowhere to
get one. Splitting the 14.2 kg/day by tank count, by capacity share, or by
current mass share would each produce a different answer, all three defensible,
none sourced. That is a number invented at the call site wearing the authority
of a reading — precisely what `src/config.ts` and `src/domain/` exist to
prevent.

So: **Fuel Reserve** sums every tank whatever its type (`CONTEXT.md` already
defines it that way), and **Fuel Endurance** is that sum over the single
reported rate.

## What keeps the asymmetry visible

The panel prints each tank's propellant type and its own fill percentage. An
operator who wants to know that the cold-gas tank is the low one can read it off
the rows; what they cannot do is get a cold-gas endurance, because the station
does not report one.

## Consequences

- `fuelEndurance` takes the whole tank collection and one rate. It does not
  group, and it does not weight.
- Per-tank rows carry no tone. Colouring one would assert an urgency the pooled
  reading does not support — see user-visible rationale in `src/domain/fuel.ts`.
- **Revisit this if the feed gains a per-type split.** At that point a per-type
  endurance is sourced rather than invented, and this record should be
  superseded rather than worked around.

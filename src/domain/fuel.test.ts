import { test, expect } from 'vitest';
import { fuelEndurance, tankFill } from './fuel';
import type { FuelTank } from '../api/types';

function tank(overrides: Partial<FuelTank> = {}): FuelTank {
  return { id: 'main-a', type: 'hydrazine', capacityKg: 1200, currentKg: 830, ...overrides };
}

// One kilogram a day, so the reserve and the day count are the same number and a
// band test states only the band it is about.
const lasting = (days: number) => fuelEndurance([tank({ currentKg: days })], 1);

test('sums the reserve across every tank whatever its propellant type', () => {
  const reading = fuelEndurance(
    [tank({ currentKg: 830 }), tank({ id: 'main-b', currentKg: 764 }), tank({ id: 'rcs', type: 'cold-gas', capacityKg: 300, currentKg: 211 })],
    14.2
  );

  expect(reading.reserveKg).toBe(1805);
});

test('an endurance above the warning band reads ok', () => {
  expect(lasting(31).tone).toBe('ok');
});

test('an endurance at the warning band still reads ok — the band is the floor of nominal', () => {
  expect(lasting(30).tone).toBe('ok');
});

test('an endurance under the warning band reads warn', () => {
  expect(lasting(29).tone).toBe('warn');
});

test('an endurance above the bad band reads warn', () => {
  expect(lasting(15).tone).toBe('warn');
});

test('an endurance at the bad band still reads warn', () => {
  expect(lasting(14).tone).toBe('warn');
});

test('an endurance under the bad band reads bad', () => {
  expect(lasting(13).tone).toBe('bad');
});

test('floors the day count — a part-day of flight is not a day of flight', () => {
  expect(fuelEndurance([tank({ currentKg: 59 })], 2).days).toBe(29);
});

test('nothing being consumed leaves the endurance absent rather than infinite', () => {
  const reading = fuelEndurance([tank({ currentKg: 830 })], 0);

  expect(reading.days).toBeNull();
  expect(reading.reserveKg).toBe(830);
});

test('an absent endurance is not an alarm — a halted burn is not a low tank', () => {
  expect(fuelEndurance([tank({ currentKg: 830 })], 0).tone).toBe('ok');
});

test('no tanks aboard reads as zero days in the worst band', () => {
  const reading = fuelEndurance([], 14.2);

  expect(reading.reserveKg).toBe(0);
  expect(reading.days).toBe(0);
  expect(reading.tone).toBe('bad');
});

test('leaves the tanks it was given untouched', () => {
  const tanks = [tank({ currentKg: 830 }), tank({ id: 'rcs', currentKg: 211 })];

  fuelEndurance(tanks, 14.2);

  expect(tanks.map((t) => t.currentKg)).toEqual([830, 211]);
});

test('reports a part-filled tank as a whole percent of its capacity', () => {
  expect(tankFill(tank({ capacityKg: 1200, currentKg: 830 }))).toBe(69);
});

test('reports a full tank as a hundred percent', () => {
  expect(tankFill(tank({ capacityKg: 300, currentKg: 300 }))).toBe(100);
});

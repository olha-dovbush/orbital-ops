import { test, expect } from 'vitest';
import { formatDay, formatInstant, isSameDay, timeUntil } from './board-time';

// Board Time is an argument in every one of these tests: no frozen timers, no
// stubbed clock. A function that took the wall clock could not be tested this
// way, which is the point — see docs/decisions/board-time.md.

const BOARD_TIME = '2036-07-11T09:00:00Z';

test('reads the countdown in whole days and the hours left over', () => {
  expect(timeUntil('2036-08-02T14:30:00Z', BOARD_TIME).label).toBe('22d 5h');
});

// The bands are read from the day the resupply falls on, so each is pinned on
// the day it turns as well as inside it: an off-by-one lives on the boundary.
test('leaves a resupply a full fortnight out untinted', () => {
  expect(timeUntil('2036-07-25T09:00:00Z', BOARD_TIME).tone).toBe('ok');
});

test('turns amber inside the last fortnight', () => {
  const countdown = timeUntil('2036-07-24T09:00:00Z', BOARD_TIME);

  expect(countdown.tone).toBe('warn');
  expect(countdown.label).toBe('13d 0h');
});

test('is still amber, unmarked, a full week out', () => {
  const countdown = timeUntil('2036-07-18T09:00:00Z', BOARD_TIME);

  expect(countdown.tone).toBe('warn');
  expect(countdown.label).toBe('7d 0h');
});

test('turns red with a warning mark inside the last week', () => {
  const countdown = timeUntil('2036-07-17T12:00:00Z', BOARD_TIME);

  expect(countdown.tone).toBe('bad');
  expect(countdown.label).toBe('6d 3h ⚠');
});

test('formats an instant in UTC, whatever the reader clock says', () => {
  expect(formatInstant('2036-07-11T07:42:00Z')).toBe('Jul 11 07:42z');
});

test('formats a day-only value as a date, not as a midnight nobody published', () => {
  expect(formatDay('2031-04-12')).toBe('Apr 12');
});

test('reads two instants on the same UTC day as the same day', () => {
  expect(isSameDay('2036-07-11T00:03:00Z', BOARD_TIME)).toBe(true);
  expect(isSameDay('2036-07-10T23:59:00Z', BOARD_TIME)).toBe(false);
});

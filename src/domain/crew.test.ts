import { test, expect } from 'vitest';
import { crewRest, dutySplit, shiftHeadcount, sortRoster } from './crew';
import type { CrewMember } from '../api/types';

function member(name: string, onDuty: boolean, shift = 'alpha', sleepHours = 7.2): CrewMember {
  return {
    id: name.toLowerCase(),
    name,
    role: 'Flight Engineer',
    shift,
    onDuty,
    heartRate: 64,
    sleepHours,
    missionDay: 148
  };
}

const rested = (hours: number) => [member('Yuki', true, 'alpha', hours)];

const names = (members: CrewMember[]) => members.map((m) => m.name);

test('puts every on-duty member ahead of every off-duty one', () => {
  const roster = [member('Amara', false), member('Yuki', true), member('Priya', false), member('Lars', true)];

  expect(names(sortRoster(roster))).toEqual(['Lars', 'Yuki', 'Amara', 'Priya']);
});

test('orders by name within a duty group', () => {
  const roster = [member('Yuki', true), member('Lars', true), member('Marcus', true)];

  expect(names(sortRoster(roster))).toEqual(['Lars', 'Marcus', 'Yuki']);
});

test('leaves the roster it was given untouched', () => {
  const roster = [member('Yuki', false), member('Lars', true)];

  sortRoster(roster);

  expect(names(roster)).toEqual(['Yuki', 'Lars']);
});

test('splits the roster into who is working now and who is not', () => {
  const roster = [member('Amara', false), member('Yuki', true), member('Priya', false), member('Lars', true)];

  const split = dutySplit(roster);

  expect(names(split.onDuty)).toEqual(['Yuki', 'Lars']);
  expect(names(split.offDuty)).toEqual(['Amara', 'Priya']);
});

test('a roster nobody is on duty for splits to an empty on-duty side', () => {
  const split = dutySplit([member('Amara', false)]);

  expect(split.onDuty).toEqual([]);
  expect(names(split.offDuty)).toEqual(['Amara']);
});

test('counts heads per shift, on duty or not', () => {
  const roster = [
    member('Yuki', true, 'alpha'),
    member('Lars', false, 'alpha'),
    member('Amara', true, 'beta'),
    member('Priya', false, 'gamma'),
    member('Marcus', true, 'gamma')
  ];

  expect(shiftHeadcount(roster)).toEqual({ alpha: 2, beta: 1, gamma: 2 });
});

test('a shift nobody is rostered to does not appear in the headcount', () => {
  expect(shiftHeadcount([member('Yuki', true, 'alpha')])).toEqual({ alpha: 1 });
});

test('averages sleep across the whole roster, to a tenth of an hour', () => {
  const roster = [
    member('Yuki', true, 'alpha', 7.4),
    member('Lars', false, 'alpha', 6.9),
    member('Amara', true, 'beta', 8.0)
  ];

  expect(crewRest(roster).hours).toBe(7.4);
});

test('rest above the warning band reads ok', () => {
  expect(crewRest(rested(7.2)).tone).toBe('ok');
});

test('rest at the warning band reads ok — the band is the floor of nominal', () => {
  expect(crewRest(rested(7)).tone).toBe('ok');
});

test('rest under the warning band reads warn', () => {
  expect(crewRest(rested(6.4)).tone).toBe('warn');
});

test('rest at the bad band still reads warn', () => {
  expect(crewRest(rested(6)).tone).toBe('warn');
});

test('rest under the bad band reads bad', () => {
  expect(crewRest(rested(5.4)).tone).toBe('bad');
});

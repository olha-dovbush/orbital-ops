import { test, expect } from 'vitest';
import { sortRoster } from './crew';
import type { CrewMember } from '../api/types';

function member(name: string, onDuty: boolean): CrewMember {
  return {
    id: name.toLowerCase(),
    name,
    role: 'Flight Engineer',
    shift: 'alpha',
    onDuty,
    heartRate: 64,
    sleepHours: 7.2,
    missionDay: 148
  };
}

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

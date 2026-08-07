import { test, expect } from 'vitest';
import { sortIncidents, summariseIncidents } from './incidents';
import type { Incident, Severity } from '../api/types';

function incident(id: string, severity: Severity, timestamp: string, resolved = false): Incident {
  return {
    id,
    severity,
    system: 'life-support',
    title: 'CO2 scrubber cartridge 3 efficiency below 80%',
    timestamp,
    resolved,
    assignee: 'eng-05'
  };
}

const ids = (items: Incident[]) => items.map((i) => i.id);

test('ranks critical ahead of warning, and warning ahead of info', () => {
  const feed = [
    incident('INC-2105', 'info', '2036-07-11T08:00:00Z'),
    incident('INC-2106', 'warning', '2036-07-11T08:00:00Z'),
    incident('INC-2107', 'critical', '2036-07-11T08:00:00Z')
  ];

  expect(ids(sortIncidents(feed))).toEqual(['INC-2107', 'INC-2106', 'INC-2105']);
});

test('puts the newest first within one severity', () => {
  const feed = [
    incident('INC-2100', 'warning', '2036-07-08T16:12:00Z'),
    incident('INC-2106', 'warning', '2036-07-11T05:15:00Z'),
    incident('INC-2104', 'warning', '2036-07-10T18:47:00Z')
  ];

  expect(ids(sortIncidents(feed))).toEqual(['INC-2106', 'INC-2104', 'INC-2100']);
});

test('ranks severity before recency, so an old critical outranks a fresh info', () => {
  const feed = [
    incident('INC-2105', 'info', '2036-07-11T08:00:00Z'),
    incident('INC-2102', 'critical', '2036-07-09T11:58:00Z')
  ];

  expect(ids(sortIncidents(feed))).toEqual(['INC-2102', 'INC-2105']);
});

test('leaves the feed it was given untouched', () => {
  const feed = [
    incident('INC-2105', 'info', '2036-07-11T08:00:00Z'),
    incident('INC-2107', 'critical', '2036-07-11T07:42:00Z')
  ];

  sortIncidents(feed);

  expect(ids(feed)).toEqual(['INC-2105', 'INC-2107']);
});

test('ranks a severity it does not know below every one it does, newest first among them', () => {
  const feed = [
    incident('INC-2109', 'meltdown' as Severity, '2036-07-11T06:00:00Z'),
    incident('INC-2105', 'info', '2036-07-11T08:00:00Z'),
    incident('INC-2110', 'meltdown' as Severity, '2036-07-11T09:00:00Z')
  ];

  expect(ids(sortIncidents(feed))).toEqual(['INC-2105', 'INC-2110', 'INC-2109']);
});

const BOARD_TIME = '2036-07-11T14:30:00Z';

test('counts the unresolved criticals and warnings, and ignores resolved ones', () => {
  const feed = [
    incident('INC-2107', 'critical', '2036-07-11T07:42:00Z'),
    incident('INC-2102', 'critical', '2036-07-09T11:58:00Z', true),
    incident('INC-2106', 'warning', '2036-07-11T05:15:00Z'),
    incident('INC-2104', 'warning', '2036-07-10T18:47:00Z'),
    incident('INC-2100', 'warning', '2036-07-08T16:12:00Z', true),
    incident('INC-2105', 'info', '2036-07-11T08:00:00Z')
  ];

  const counts = summariseIncidents(feed, BOARD_TIME);

  expect(counts.unresolvedCritical).toBe(1);
  expect(counts.unresolvedWarning).toBe(2);
});

test('an unresolved info line is neither critical nor warning', () => {
  const counts = summariseIncidents([incident('INC-2105', 'info', '2036-07-11T08:00:00Z')], BOARD_TIME);

  expect(counts.unresolvedCritical).toBe(0);
  expect(counts.unresolvedWarning).toBe(0);
});

test('counts resolved today against Board Time, whatever severity resolved', () => {
  const feed = [
    incident('INC-2102', 'critical', '2036-07-11T02:10:00Z', true),
    incident('INC-2100', 'warning', '2036-07-11T23:59:00Z', true),
    incident('INC-2098', 'info', '2036-07-10T23:59:00Z', true),
    incident('INC-2107', 'critical', '2036-07-11T07:42:00Z')
  ];

  expect(summariseIncidents(feed, BOARD_TIME).resolvedToday).toBe(2);
});

test('moving Board Time to another day moves what counts as resolved today', () => {
  const feed = [
    incident('INC-2102', 'critical', '2036-07-11T02:10:00Z', true),
    incident('INC-2098', 'info', '2036-07-10T23:59:00Z', true)
  ];

  expect(summariseIncidents(feed, '2036-07-10T14:30:00Z').resolvedToday).toBe(1);
});

test('an empty feed counts to zero on every line', () => {
  expect(summariseIncidents([], BOARD_TIME)).toEqual({
    unresolvedCritical: 0,
    unresolvedWarning: 0,
    resolvedToday: 0
  });
});

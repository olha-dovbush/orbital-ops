import { test, expect } from 'vitest';
import { sortIncidents } from './incidents';
import type { Incident, Severity } from '../api/types';

function incident(id: string, severity: Severity, timestamp: string): Incident {
  return {
    id,
    severity,
    system: 'life-support',
    title: 'CO2 scrubber cartridge 3 efficiency below 80%',
    timestamp,
    resolved: false,
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

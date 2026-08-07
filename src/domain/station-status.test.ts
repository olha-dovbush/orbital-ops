import { test, expect } from 'vitest';
import { stationStatus } from './station-status';
import { O2, POWER_FLOOR_KW } from '../config';

// The bands are pinned on their boundaries as well as inside them: a status rule
// is an inequality, and an inequality is wrong on the boundary or nowhere.
// The O2 numbers here are the O2 Floor and its warning band — see
// docs/decisions/o2-threshold.md for why they are 19.5 / 19.9 and not 19.0 / 19.8.

const HEALTHY_POWER = 80;
const HEALTHY_O2 = O2.NOMINAL;

test('reads a station inside every band as NOMINAL', () => {
  expect(stationStatus(HEALTHY_O2, HEALTHY_POWER, 0)).toEqual({ status: 'NOMINAL', tone: 'ok' });
});

test('reads O2 below the floor as CRITICAL', () => {
  expect(stationStatus(19.4, HEALTHY_POWER, 0).status).toBe('CRITICAL');
});

test('reads O2 exactly at the floor as DEGRADED, not CRITICAL', () => {
  expect(stationStatus(19.5, HEALTHY_POWER, 0)).toEqual({ status: 'DEGRADED', tone: 'warn' });
});

test('reads O2 between the floor and the warning band as DEGRADED', () => {
  expect(stationStatus(19.8, HEALTHY_POWER, 0).status).toBe('DEGRADED');
});

test('reads O2 exactly at the warning band as NOMINAL', () => {
  expect(stationStatus(19.9, HEALTHY_POWER, 0).status).toBe('NOMINAL');
});

test('reads a single unresolved critical incident as DEGRADED', () => {
  expect(stationStatus(HEALTHY_O2, HEALTHY_POWER, 1).status).toBe('DEGRADED');
});

test('reads more than one unresolved critical incident as CRITICAL', () => {
  expect(stationStatus(HEALTHY_O2, HEALTHY_POWER, 2)).toEqual({ status: 'CRITICAL', tone: 'bad' });
});

test('reads power exactly at the floor as NOMINAL', () => {
  expect(stationStatus(HEALTHY_O2, POWER_FLOOR_KW, 0).status).toBe('NOMINAL');
});

test('reads power below the floor as DEGRADED, whatever the budget percentage says', () => {
  expect(stationStatus(HEALTHY_O2, POWER_FLOOR_KW - 1, 0).status).toBe('DEGRADED');
});

test('lets the worst band win when several are breached at once', () => {
  expect(stationStatus(19.4, 40, 3).status).toBe('CRITICAL');
});

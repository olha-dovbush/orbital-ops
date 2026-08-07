// Pure time rules. No React, no clock reads — the instant is always an argument.
//
// The board's "now" is Board Time: the telemetry feed's own `updated` field,
// threaded in by the caller. Nothing here reaches for the wall clock, so every
// answer is reproducible from the payloads that produced it. See
// docs/decisions/board-time.md.

import { RESUPPLY_DAYS, type Tone } from '../config';

const MS_PER_HOUR = 60 * 60 * 1000;
const MS_PER_DAY = 24 * MS_PER_HOUR;

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const pad = (n: number) => (n < 10 ? '0' + n : '' + n);

export interface Countdown {
  /** How much time is left, as the tile prints it — the warning mark included. */
  label: string;
  tone: Tone;
}

/**
 * How long from Board Time until an instant, in whole days and the hours over.
 * Amber inside the last fortnight, red and marked inside the last week: the
 * band and the mark are decided together so they cannot drift apart.
 */
export function timeUntil(target: string, boardTime: string): Countdown {
  const msLeft = new Date(target).getTime() - new Date(boardTime).getTime();
  const days = Math.floor(msLeft / MS_PER_DAY);
  const hours = Math.floor((msLeft % MS_PER_DAY) / MS_PER_HOUR);
  const label = days + 'd ' + hours + 'h';

  if (days < RESUPPLY_DAYS.BAD) {
    return { label: label + ' ⚠', tone: 'bad' };
  }
  return { label, tone: days < RESUPPLY_DAYS.WARN ? 'warn' : 'ok' };
}

/** A day, as the board prints it. */
export function formatDay(iso: string): string {
  const d = new Date(iso);
  return MONTHS[d.getUTCMonth()] + ' ' + d.getUTCDate();
}

/**
 * An instant, as the board prints it: the day plus the time of day in UTC. The
 * board reads the same clock everywhere it is opened from, so the operator's
 * time zone never moves a timestamp onto another day.
 */
export function formatInstant(iso: string): string {
  const d = new Date(iso);
  return formatDay(iso) + ' ' + pad(d.getUTCHours()) + ':' + pad(d.getUTCMinutes()) + 'z';
}

/** Whether an instant falls on the same UTC day as another — "today", against Board Time. */
export function isSameDay(instant: string, boardTime: string): boolean {
  return new Date(instant).toISOString().slice(0, 10) === new Date(boardTime).toISOString().slice(0, 10);
}

import { test, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import OperationsTiles from '../src/components/OperationsTiles';
import type { CrewMember, Incident, Station } from '../src/api/types';

// The operations tile group at its props seam. No fetch and no provider: the
// group takes the three payloads and Board Time, and renders four tiles from one
// primitive, so what is under test is the mapping from feeds to value and tint.
//
// The fixtures below mirror public/api/**, so the first test doubles as the
// tint-for-tint check that the board renders what an operator sees today. The
// rest walk the bands the fixtures never reach.

const BOARD_TIME = '2036-07-11T09:00:00Z';

const STATION: Station = {
  id: 'kruger-60',
  name: 'ISS Kruger-60',
  orbit: 'LEO 412 km',
  inclinationDeg: 51.6,
  velocityKms: 7.66,
  crewCapacity: 8,
  crewOnboard: 6,
  commissioned: '2031-04-12',
  nextResupply: '2036-08-02T14:30:00Z',
  daysInService: 1916
};

const CREW: CrewMember[] = [
  { id: 'cdr-01', name: 'Yuki Tanaka', role: 'Commander', shift: 'alpha', onDuty: true, heartRate: 64, sleepHours: 7.2, missionDay: 148 },
  { id: 'flt-02', name: 'Marcus Webb', role: 'Flight Engineer', shift: 'alpha', onDuty: true, heartRate: 71, sleepHours: 6.8, missionDay: 148 },
  { id: 'sci-03', name: 'Elena Petrova', role: 'Science Officer', shift: 'beta', onDuty: false, heartRate: 58, sleepHours: 8.1, missionDay: 92 },
  { id: 'med-04', name: 'Amara Okafor', role: 'Medical Officer', shift: 'beta', onDuty: false, heartRate: 61, sleepHours: 7.9, missionDay: 92 },
  { id: 'eng-05', name: 'Lars Eriksen', role: 'Systems Engineer', shift: 'gamma', onDuty: true, heartRate: 77, sleepHours: 5.4, missionDay: 233 },
  { id: 'bot-06', name: 'Priya Sharma', role: 'Payload Specialist', shift: 'gamma', onDuty: false, heartRate: 66, sleepHours: 7.5, missionDay: 233 }
];

const INCIDENTS: Incident[] = [
  { id: 'INC-2107', severity: 'critical', system: 'life-support', title: 'CO2 scrubber cartridge 3 efficiency below 80%', timestamp: '2036-07-11T07:42:00Z', resolved: false, assignee: 'eng-05' },
  { id: 'INC-2106', severity: 'warning', system: 'power', title: 'Solar array B tracking lag during eclipse exit', timestamp: '2036-07-11T05:15:00Z', resolved: false, assignee: 'flt-02' },
  { id: 'INC-2105', severity: 'info', system: 'comms', title: 'Ku-band handover delay 4.2s (nominal < 2s)', timestamp: '2036-07-10T22:03:00Z', resolved: true, assignee: 'cdr-01' },
  { id: 'INC-2104', severity: 'warning', system: 'thermal', title: 'Radiator loop A pump vibration trending up', timestamp: '2036-07-10T18:47:00Z', resolved: false, assignee: 'eng-05' },
  { id: 'INC-2100', severity: 'warning', system: 'life-support', title: 'Water reclamation yield 91% (target 93%)', timestamp: '2036-07-08T16:12:00Z', resolved: false, assignee: 'med-04' }
];

type Overrides = {
  station?: Partial<Station>;
  crew?: CrewMember[];
  incidents?: Incident[];
  boardTime?: string;
};

function renderTiles({ station, crew, incidents, boardTime }: Overrides = {}) {
  return render(
    <OperationsTiles
      station={{ ...STATION, ...station }}
      crew={crew ?? CREW}
      incidents={incidents ?? INCIDENTS}
      boardTime={boardTime ?? BOARD_TIME}
    />
  );
}

/** One crew member — only their shift, duty, and sleep reach a tile. */
function member(shift: string, onDuty: boolean, sleepHours: number): CrewMember {
  return {
    id: shift + (onDuty ? '-on' : '-off'),
    name: 'Yuki Tanaka',
    role: 'Flight Engineer',
    shift,
    onDuty,
    heartRate: 64,
    sleepHours,
    missionDay: 148
  };
}

function incident(id: string, severity: Incident['severity'], timestamp: string, resolved = false): Incident {
  return { id, severity, system: 'hull', title: 'MMOD strike detected', timestamp, resolved, assignee: 'cdr-01' };
}

function tile(label: string) {
  const body = screen.getByText(label).closest('.tile');
  if (body === null) throw new Error(`no tile labelled ${label}`);
  return body;
}

afterEach(cleanup);

test('renders the four operations tiles with the values and tints the feeds imply', () => {
  renderTiles();

  const expected: [string, string, string][] = [
    ['Open Incidents', 'tone-bad', '4open1 critical · 3 warning · 0 resolved today'],
    ['Next Resupply', 'tone-ok', '22d 5hAug 2 14:30z'],
    ['Crew Rest', 'tone-ok', '7.2h avg3 on duty · 3 off duty'],
    ['Shift Board', 'tone-ok', 'α 2 · β 2 · γ 2commissioned Apr 12']
  ];

  for (const [label, tint, body] of expected) {
    expect(tile(label).className).toBe(`tile ${tint}`);
    expect(tile(label).textContent).toBe(label + body);
  }
});

test('sets the two phrase values smaller than a reading, as the board set them before', () => {
  renderTiles();

  const value = (label: string) => tile(label).querySelector('.tile-value')?.className;

  expect(value('Next Resupply')).toBe('tile-value tile-value-md');
  expect(value('Shift Board')).toBe('tile-value tile-value-sm');
  expect(value('Open Incidents')).toBe('tile-value');
});

test('the open-incidents tile counts what resolved on Board Time’s own day', () => {
  const feed = [
    incident('INC-2107', 'critical', '2036-07-11T07:42:00Z'),
    incident('INC-2105', 'info', '2036-07-11T02:03:00Z', true),
    incident('INC-2102', 'critical', '2036-07-10T11:58:00Z', true),
    incident('INC-2101', 'warning', '2036-07-10T14:00:00Z', true)
  ];

  renderTiles({ incidents: feed });
  expect(tile('Open Incidents').textContent).toContain('1 critical · 0 warning · 1 resolved today');

  cleanup();

  // The same feed, read a day earlier: what counts as today moves with Board Time.
  renderTiles({ incidents: feed, boardTime: '2036-07-10T09:00:00Z' });
  expect(tile('Open Incidents').textContent).toContain('2 resolved today');
});

test('the open-incidents tile takes the worst open severity, not an average of them', () => {
  renderTiles({ incidents: [incident('INC-2106', 'warning', '2036-07-11T05:15:00Z')] });
  expect(tile('Open Incidents').className).toBe('tile tone-warn');
  expect(tile('Open Incidents').textContent).toContain('1open');

  cleanup();

  renderTiles({ incidents: [incident('INC-2105', 'info', '2036-07-11T05:15:00Z')] });
  expect(tile('Open Incidents').className).toBe('tile tone-ok');
  expect(tile('Open Incidents').textContent).toContain('0open');
});

test('the resupply tile counts down from Board Time and closes amber, then red and marked', () => {
  renderTiles({ boardTime: '2036-07-20T09:30:00Z' });
  expect(tile('Next Resupply').className).toBe('tile tone-warn');
  expect(tile('Next Resupply').textContent).toContain('13d 5h');

  cleanup();

  renderTiles({ boardTime: '2036-07-27T09:30:00Z' });
  expect(tile('Next Resupply').className).toBe('tile tone-bad');
  expect(tile('Next Resupply').textContent).toContain('6d 5h ⚠');
});

test('the Crew Rest tile tints the roster average against its bands', () => {
  renderTiles({ crew: [member('alpha', true, 6.8), member('beta', false, 6.4)] });
  expect(tile('Crew Rest').className).toBe('tile tone-warn');
  expect(tile('Crew Rest').textContent).toBe('Crew Rest6.6h avg1 on duty · 1 off duty');

  cleanup();

  renderTiles({ crew: [member('alpha', true, 5.4), member('beta', true, 6.2)] });
  expect(tile('Crew Rest').className).toBe('tile tone-bad');
  expect(tile('Crew Rest').textContent).toBe('Crew Rest5.8h avg2 on duty · 0 off duty');
});

test('the shift board prints a zero for a shift nobody is rostered to', () => {
  renderTiles({ crew: [member('alpha', true, 7.2), member('gamma', false, 7.2)] });

  expect(tile('Shift Board').textContent).toBe('Shift Boardα 1 · β 0 · γ 1commissioned Apr 12');
});

test('the shift board renders the commissioning date as a date, not a timestamp', () => {
  renderTiles({ station: { commissioned: '2031-12-01' } });

  expect(tile('Shift Board').textContent).toContain('commissioned Dec 1');
});

import StatusTile from './StatusTile';
import { openIncidentTone, summariseIncidents } from '../domain/incidents';
import { crewRest, dutySplit, shiftHeadcount } from '../domain/crew';
import { formatDay, formatInstant, timeUntil } from '../domain/board-time';
import { SHIFTS } from '../config';
import type { CrewMember, Incident, Station } from '../api/types';

// The four operations tiles, composed from the one tile primitive. Every count,
// countdown, and band here is a domain module's answer; this component only says
// which number goes in which tile.
//
// Split from the telemetry group deliberately: eight tiles in one function sits
// one tile away from the 80-line cap components are held to.

type OperationsTilesProps = {
  station: Station;
  crew: CrewMember[];
  incidents: Incident[];
  /** The instant the board counts from — see docs/decisions/board-time.md. */
  boardTime: string;
};

/**
 * Heads per shift, in the order the board reports them. A shift nobody is
 * rostered to counts absent rather than zero, so the zero is supplied here.
 */
function shiftBoard(crew: CrewMember[]): string {
  const counts = shiftHeadcount(crew);
  return SHIFTS.map(({ name, mark }) => `${mark} ${counts[name] ?? 0}`).join(' · ');
}

export default function OperationsTiles({ station, crew, incidents, boardTime }: OperationsTilesProps) {
  const counts = summariseIncidents(incidents, boardTime);
  const resupply = timeUntil(station.nextResupply, boardTime);
  const { onDuty, offDuty } = dutySplit(crew);
  const rest = crewRest(crew);

  return (
    <>
      <StatusTile
        label="Open Incidents"
        value={String(counts.unresolvedCritical + counts.unresolvedWarning)}
        unit="open"
        subtitle={`${counts.unresolvedCritical} critical · ${counts.unresolvedWarning} warning · ${counts.resolvedToday} resolved today`}
        tone={openIncidentTone(counts)}
      />
      <StatusTile
        label="Next Resupply"
        value={resupply.label}
        subtitle={formatInstant(station.nextResupply)}
        tone={resupply.tone}
        valueSize="md"
      />
      <StatusTile
        label="Crew Rest"
        value={String(rest.hours)}
        unit="h avg"
        subtitle={`${onDuty.length} on duty · ${offDuty.length} off duty`}
        tone={rest.tone}
      />
      <StatusTile
        label="Shift Board"
        value={shiftBoard(crew)}
        subtitle={`commissioned ${formatDay(station.commissioned)}`}
        tone="ok"
        valueSize="sm"
      />
    </>
  );
}

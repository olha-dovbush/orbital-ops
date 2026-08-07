import { useStation } from '../hooks/useStation';
import { useTelemetry } from '../hooks/useTelemetry';
import { useCrew } from '../hooks/useCrew';
import { useIncidents } from '../hooks/useIncidents';
import { sortIncidents, summariseIncidents } from '../domain/incidents';
import { stationStatus } from '../domain/station-status';
import { latest } from '../domain/telemetry';
import AlertBanner from './AlertBanner';
import BoardHeader from './BoardHeader';
import TelemetryTiles from './TelemetryTiles';
import OperationsTiles from './OperationsTiles';

// The main mission control view. The tiles it once held tile by tile now belong
// to the two tile groups, and the header and the escalation to their own
// components; what is left here is four hook calls, one gate, and a composition.
//
// The board reads all four resources, so unlike the panels it gates on the whole
// set: a tile grid missing a feed is worse than no grid.

export default function Dashboard() {
  const stationQuery = useStation();
  const telemetryQuery = useTelemetry();
  const crewQuery = useCrew();
  const incidentsQuery = useIncidents();

  const queries = [stationQuery, telemetryQuery, crewQuery, incidentsQuery];
  const reason = queries.find((query) => query.isError)?.error;

  // A feed that has failed past its retry budget takes the whole board, even
  // though a reading is still cached: tiles frozen at their last good values with
  // nothing to say so are how a dead uplink reads as a calm station. A refresh
  // merely in flight is not a failure and never reaches here — the board renders
  // its last good reading straight through one. Retry re-requests only what
  // failed, so a Reference Data feed that answered is still read once per open.
  if (reason) {
    return (
      <div className="dashboard dashboard-error">
        <h1>⚠ Uplink lost</h1>
        <p>{reason.message}</p>
        <button onClick={() => queries.filter((query) => query.isError).forEach((query) => void query.refetch())}>
          Retry uplink
        </button>
      </div>
    );
  }

  const station = stationQuery.data;
  const telemetry = telemetryQuery.data;
  const crew = crewQuery.data;
  const incidents = incidentsQuery.data;

  if (!station || !telemetry || !crew || !incidents) {
    return (
      <div className="dashboard dashboard-loading">
        <div className="spinner" />
        <p>Establishing uplink to ISS Kruger-60…</p>
      </div>
    );
  }

  // Board Time: the instant the board counts from. It is the telemetry feed's
  // own reading, never the wall clock — see docs/decisions/board-time.md.
  const boardTime = telemetry.updated;

  // ---- telemetry readings ----------------------------------------------------
  // The tiles' own readings, arrows, and tones belong to TelemetryTiles. What the
  // board still needs here is the two readings Station Status is derived from.
  const latestO2 = latest(telemetry.series.o2.points);
  const latestPower = latest(telemetry.series.power.points);

  // The operations tiles' own counts, countdown, and tones belong to
  // OperationsTiles. What the board still needs here is the count Station Status
  // is derived from.
  const { unresolvedCritical } = summariseIncidents(incidents.items, boardTime);

  // Station Status is the domain module's — see src/domain/station-status.ts and
  // docs/decisions/o2-threshold.md.
  const { status, tone: statusTone } = stationStatus(latestO2, latestPower, unresolvedCritical);

  // ---- most urgent incident ---------------------------------------------------
  // What the escalation is about: the worst incident still open, newest first
  // within a severity.
  const [topIncident] = sortIncidents(incidents.items.filter((item) => !item.resolved));

  return (
    <div className="dashboard">
      <BoardHeader
        station={station}
        status={status}
        tone={statusTone}
        syncedAt={telemetryQuery.dataUpdatedAt}
      />

      {/* Keyed by status so each arrival at CRITICAL mounts a fresh banner and
          flashes once, rather than flashing again on every poll. The escalation
          is the status', not the feed's: a reading can escalate the station with
          nothing open to blame it on, and that still gets a banner. */}
      {status !== 'NOMINAL' && (
        <AlertBanner key={status} status={status} tone={statusTone} incident={topIncident} />
      )}

      <div className="tiles">
        <TelemetryTiles series={telemetry.series} />
        <OperationsTiles
          station={station}
          crew={crew.members}
          incidents={incidents.items}
          boardTime={boardTime}
        />
      </div>
    </div>
  );
}

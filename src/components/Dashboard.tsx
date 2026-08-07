import { useStation } from '../hooks/useStation';
import { useTelemetry } from '../hooks/useTelemetry';
import { useCrew } from '../hooks/useCrew';
import { useIncidents } from '../hooks/useIncidents';
import { sortIncidents, summariseIncidents } from '../domain/incidents';
import { formatInstant } from '../domain/board-time';
import { stationStatus } from '../domain/station-status';
import { latest } from '../domain/telemetry';
import TelemetryTiles from './TelemetryTiles';
import OperationsTiles from './OperationsTiles';
import { TONE_CLASS } from '../config';

// The main mission control view. The tiles it once held tile by tile now belong
// to the two tile groups; what is left here is the header, the alert banner, and
// the composition itself.
//
// The board reads all four resources, so unlike the panels it gates on the whole
// set: a tile grid missing a feed is worse than no grid.

const pad = (n: number) => (n < 10 ? '0' + n : '' + n);

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
  const unresolved = sortIncidents(incidents.items.filter((item) => !item.resolved));
  const topIncident = unresolved.length > 0 ? unresolved[0] : null;

  // When the newest Live Resource reading landed, in the operator's own clock.
  // This is a wall-clock fact about the uplink, not Board Time.
  const syncedAt = new Date(telemetryQuery.dataUpdatedAt);
  const lastSync = pad(syncedAt.getHours()) + ':' + pad(syncedAt.getMinutes()) + ':' + pad(syncedAt.getSeconds());

  return (
    <div className="dashboard">
      <header className="dash-header">
        <div>
          <h1 style={{ margin: 0, fontSize: 26, letterSpacing: 1 }}>
            {station.name}
            <span className="dash-orbit">
              {station.orbit} · {station.velocityKms} km/s · inc {station.inclinationDeg}°
            </span>
          </h1>
          <p className="dash-meta">
            Mission day {station.daysInService} · crew {station.crewOnboard}/{station.crewCapacity} · last sync {lastSync}
          </p>
        </div>
        <div className={'status-pill ' + TONE_CLASS[statusTone]}>
          <span className="status-dot" />
          {status}
        </div>
      </header>

      {status !== 'NOMINAL' && topIncident && (
        <div className={'alert-banner ' + TONE_CLASS[statusTone]}>
          <strong>{status === 'CRITICAL' ? 'CRITICAL ALERT' : 'ATTENTION'}</strong>
          <span style={{ marginLeft: 10 }}>
            {topIncident.id}: {topIncident.title}
          </span>
          <span className="alert-time">{formatInstant(topIncident.timestamp)}</span>
        </div>
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

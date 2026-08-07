import { useStation } from '../hooks/useStation';
import { useTelemetry } from '../hooks/useTelemetry';
import { useCrew } from '../hooks/useCrew';
import { useIncidents } from '../hooks/useIncidents';
import { sortIncidents, summariseIncidents } from '../domain/incidents';
import { crewRest, dutySplit, shiftHeadcount } from '../domain/crew';
import { formatDay, formatInstant, timeUntil } from '../domain/board-time';
import { stationStatus } from '../domain/station-status';
import { average, latest, metricTone, powerBudgetPct, trend } from '../domain/telemetry';
import { HULL_INTEGRITY, O2, O2_TREND_DELTA, POWER_TREND_DELTA_KW, TONE_CLASS } from '../config';

// The main mission control view. Started small in 2034. It has... grown.
// Header, summary tiles, alert banner, resupply countdown, shift board --
// everything lives here because it was "just one more tile" every sprint.
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
  const o2Points = telemetry.series.o2.points;
  const powerPoints = telemetry.series.power.points;
  const latestO2 = latest(o2Points);
  const latestPower = latest(powerPoints);
  const latestHullTemp = latest(telemetry.series.hullTemp.points);
  const latestIntegrity = latest(telemetry.series.hullIntegrity.points);

  const { unresolvedCritical, unresolvedWarning, resolvedToday } = summariseIncidents(incidents.items, boardTime);

  // Station Status and the telemetry tiles' tones are the domain modules' — see
  // src/domain/station-status.ts and docs/decisions/o2-threshold.md.
  const { status, tone: statusTone } = stationStatus(latestO2, latestPower, unresolvedCritical);

  const o2Trend = trend(o2Points, O2_TREND_DELTA);
  const powerTrend = trend(powerPoints, POWER_TREND_DELTA_KW);
  const powerAvg = average(powerPoints);
  const powerBudget = powerBudgetPct(latestPower);

  // ---- resupply countdown ----------------------------------------------------
  const resupply = timeUntil(station.nextResupply, boardTime);

  // ---- crew on duty ----------------------------------------------------------
  const { onDuty, offDuty } = dutySplit(crew.members);
  const shifts = shiftHeadcount(crew.members);
  const rest = crewRest(crew.members);

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
        <div className={'tile ' + TONE_CLASS[metricTone('o2', latestO2)]}>
          <div className="tile-label">O2 Level</div>
          <div className="tile-value">
            {latestO2.toFixed(1)}
            <span className="tile-unit">%</span>
            <span className="tile-trend">{o2Trend}</span>
          </div>
          <div className="tile-sub">floor {O2.FLOOR} · cabin nominal {O2.NOMINAL}</div>
        </div>

        <div className={'tile ' + TONE_CLASS[metricTone('power', latestPower)]}>
          <div className="tile-label">Power Output</div>
          <div className="tile-value">
            {latestPower}
            <span className="tile-unit">kW</span>
            <span className="tile-trend">{powerTrend}</span>
          </div>
          <div className="tile-sub">avg {powerAvg.toFixed(0)} kW · budget {powerBudget}%</div>
        </div>

        <div className={'tile ' + TONE_CLASS[metricTone('hullTemp', latestHullTemp)]}>
          <div className="tile-label">Hull Temp</div>
          <div className="tile-value">
            {latestHullTemp}
            <span className="tile-unit">°C</span>
          </div>
          <div className="tile-sub">day/night swing normal</div>
        </div>

        <div className={'tile ' + TONE_CLASS[metricTone('hullIntegrity', latestIntegrity)]}>
          <div className="tile-label">Hull Integrity</div>
          <div className="tile-value">
            {latestIntegrity.toFixed(1)}
            <span className="tile-unit">%</span>
          </div>
          <div className="tile-sub">MMOD shielding rated to {HULL_INTEGRITY.RATED.toFixed(1)}</div>
        </div>

        <div className={'tile ' + TONE_CLASS[unresolvedCritical > 0 ? 'bad' : unresolvedWarning > 0 ? 'warn' : 'ok']}>
          <div className="tile-label">Open Incidents</div>
          <div className="tile-value">
            {unresolvedCritical + unresolvedWarning}
            <span className="tile-unit">open</span>
          </div>
          <div className="tile-sub">
            {unresolvedCritical} critical · {unresolvedWarning} warning · {resolvedToday} resolved today
          </div>
        </div>

        <div className={'tile ' + TONE_CLASS[resupply.tone]}>
          <div className="tile-label">Next Resupply</div>
          <div className="tile-value" style={{ fontSize: 24 }}>{resupply.label}</div>
          <div className="tile-sub">{formatInstant(station.nextResupply)}</div>
        </div>

        <div className={'tile ' + TONE_CLASS[rest.tone]}>
          <div className="tile-label">Crew Rest</div>
          <div className="tile-value">
            {rest.hours}
            <span className="tile-unit">h avg</span>
          </div>
          <div className="tile-sub">{onDuty.length} on duty · {offDuty.length} off duty</div>
        </div>

        <div className={'tile ' + TONE_CLASS.ok}>
          <div className="tile-label">Shift Board</div>
          <div className="tile-value" style={{ fontSize: 20 }}>
            α {shifts['alpha'] || 0} · β {shifts['beta'] || 0} · γ {shifts['gamma'] || 0}
          </div>
          <div className="tile-sub">commissioned {formatDay(station.commissioned)}</div>
        </div>
      </div>
    </div>
  );
}

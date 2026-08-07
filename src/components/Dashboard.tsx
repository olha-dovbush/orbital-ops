import { useStation } from '../hooks/useStation';
import { useTelemetry } from '../hooks/useTelemetry';
import { useCrew } from '../hooks/useCrew';
import { useIncidents } from '../hooks/useIncidents';
import { sortIncidents } from '../domain/incidents';
import {
  CREW_REST_HOURS,
  HULL_INTEGRITY,
  HULL_TEMP_C,
  O2,
  O2_TREND_DELTA,
  POWER_BUDGET_PCT,
  POWER_FLOOR_KW,
  POWER_RATED_KW,
  POWER_TREND_DELTA_KW,
  RESUPPLY_DAYS,
  TONE_CLASS,
  TREND_LOOKBACK,
  type Tone
} from '../config';

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

  // ---- inline status computation -------------------------------------------
  const o2Points = telemetry.series.o2.points;
  const powerPoints = telemetry.series.power.points;
  const hullTempPoints = telemetry.series.hullTemp.points;
  const integrityPoints = telemetry.series.hullIntegrity.points;
  const latestO2 = o2Points[o2Points.length - 1];
  const latestPower = powerPoints[powerPoints.length - 1];
  const latestHullTemp = hullTempPoints[hullTempPoints.length - 1];
  const latestIntegrity = integrityPoints[integrityPoints.length - 1];

  let unresolvedCritical = 0;
  let unresolvedWarning = 0;
  let resolvedToday = 0;
  for (let i = 0; i < incidents.items.length; i++) {
    const inc = incidents.items[i];
    if (!inc.resolved && inc.severity === 'critical') {
      unresolvedCritical++;
    } else if (!inc.resolved && inc.severity === 'warning') {
      unresolvedWarning++;
    } else if (inc.resolved && inc.timestamp.indexOf('2036-07-11') === 0) {
      resolvedToday++;
    }
  }

  // The O2 Floor, and every band below it, is the config module's — see
  // docs/decisions/o2-threshold.md.
  let status = 'NOMINAL';
  let statusTone: Tone = 'ok';
  if (latestO2 < O2.FLOOR || unresolvedCritical > 1) {
    status = 'CRITICAL';
    statusTone = 'bad';
  } else if (latestO2 < O2.WARN || latestPower < POWER_FLOOR_KW || unresolvedCritical > 0) {
    status = 'DEGRADED';
    statusTone = 'warn';
  }

  // ---- O2 trend arrow --------------------------------------------------------
  let o2Trend = '→';
  const o2Prev = o2Points[o2Points.length - TREND_LOOKBACK];
  if (latestO2 - o2Prev > O2_TREND_DELTA) {
    o2Trend = '↑';
  } else if (latestO2 - o2Prev < -O2_TREND_DELTA) {
    o2Trend = '↓';
  }

  let powerTrend = '→';
  const powerPrev = powerPoints[powerPoints.length - TREND_LOOKBACK];
  if (latestPower - powerPrev > POWER_TREND_DELTA_KW) {
    powerTrend = '↑';
  } else if (latestPower - powerPrev < -POWER_TREND_DELTA_KW) {
    powerTrend = '↓';
  }

  // ---- power budget ----------------------------------------------------------
  let powerAvg = 0;
  for (let i = 0; i < powerPoints.length; i++) {
    powerAvg += powerPoints[i];
  }
  powerAvg = powerAvg / powerPoints.length;
  const powerBudgetPct = Math.round((latestPower / POWER_RATED_KW) * 100);
  let powerTone: Tone = 'ok';
  if (powerBudgetPct < POWER_BUDGET_PCT.BAD) {
    powerTone = 'bad';
  } else if (powerBudgetPct < POWER_BUDGET_PCT.WARN) {
    powerTone = 'warn';
  }

  // ---- resupply countdown ----------------------------------------------------
  const resupplyDate = new Date(station.nextResupply);
  const nowMs = new Date('2036-07-11T09:00:00Z').getTime();
  const msLeft = resupplyDate.getTime() - nowMs;
  const daysLeft = Math.floor(msLeft / (1000 * 60 * 60 * 24));
  const hoursLeft = Math.floor((msLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  let resupplyLabel = daysLeft + 'd ' + hoursLeft + 'h';
  let resupplyTone: Tone = 'ok';
  if (daysLeft < RESUPPLY_DAYS.BAD) {
    resupplyTone = 'bad';
    resupplyLabel = resupplyLabel + ' ⚠';
  } else if (daysLeft < RESUPPLY_DAYS.WARN) {
    resupplyTone = 'warn';
  }

  // ---- crew on duty ----------------------------------------------------------
  const onDuty = [];
  const offDuty = [];
  for (let i = 0; i < crew.members.length; i++) {
    if (crew.members[i].onDuty) {
      onDuty.push(crew.members[i]);
    } else {
      offDuty.push(crew.members[i]);
    }
  }
  const shifts: Record<string, number> = {};
  for (let i = 0; i < crew.members.length; i++) {
    const s = crew.members[i].shift;
    shifts[s] = (shifts[s] || 0) + 1;
  }
  let crewRestHours = 0;
  for (let i = 0; i < crew.members.length; i++) {
    crewRestHours += crew.members[i].sleepHours;
  }
  crewRestHours = Math.round((crewRestHours / crew.members.length) * 10) / 10;
  let crewRestTone: Tone = 'ok';
  if (crewRestHours < CREW_REST_HOURS.BAD) {
    crewRestTone = 'bad';
  } else if (crewRestHours < CREW_REST_HOURS.WARN) {
    crewRestTone = 'warn';
  }

  // ---- most urgent incident ---------------------------------------------------
  const unresolved = sortIncidents(incidents.items.filter((item) => !item.resolved));
  const topIncident = unresolved.length > 0 ? unresolved[0] : null;

  // date formatting, local copy (utils.ts has one too but it formats differently)
  const fmtDate = (iso: string) => {
    const d = new Date(iso);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return months[d.getUTCMonth()] + ' ' + d.getUTCDate() + ' ' + pad(d.getUTCHours()) + ':' + pad(d.getUTCMinutes()) + 'z';
  };

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
          <span className="alert-time">{fmtDate(topIncident.timestamp)}</span>
        </div>
      )}

      <div className="tiles">
        <div className={'tile ' + TONE_CLASS[latestO2 < O2.FLOOR ? 'bad' : latestO2 < O2.WARN ? 'warn' : 'ok']}>
          <div className="tile-label">O2 Level</div>
          <div className="tile-value">
            {latestO2.toFixed(1)}
            <span className="tile-unit">%</span>
            <span className="tile-trend">{o2Trend}</span>
          </div>
          <div className="tile-sub">floor {O2.FLOOR} · cabin nominal {O2.NOMINAL}</div>
        </div>

        <div className={'tile ' + TONE_CLASS[powerTone]}>
          <div className="tile-label">Power Output</div>
          <div className="tile-value">
            {latestPower}
            <span className="tile-unit">kW</span>
            <span className="tile-trend">{powerTrend}</span>
          </div>
          <div className="tile-sub">avg {powerAvg.toFixed(0)} kW · budget {powerBudgetPct}%</div>
        </div>

        <div className={'tile ' + TONE_CLASS[latestHullTemp > HULL_TEMP_C.MAX || latestHullTemp < HULL_TEMP_C.MIN ? 'warn' : 'ok']}>
          <div className="tile-label">Hull Temp</div>
          <div className="tile-value">
            {latestHullTemp}
            <span className="tile-unit">°C</span>
          </div>
          <div className="tile-sub">day/night swing normal</div>
        </div>

        <div className={'tile ' + TONE_CLASS[latestIntegrity < HULL_INTEGRITY.BAD ? 'bad' : latestIntegrity < HULL_INTEGRITY.WARN ? 'warn' : 'ok']}>
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

        <div className={'tile ' + TONE_CLASS[resupplyTone]}>
          <div className="tile-label">Next Resupply</div>
          <div className="tile-value" style={{ fontSize: 24 }}>{resupplyLabel}</div>
          <div className="tile-sub">{fmtDate(station.nextResupply)}</div>
        </div>

        <div className={'tile ' + TONE_CLASS[crewRestTone]}>
          <div className="tile-label">Crew Rest</div>
          <div className="tile-value">
            {crewRestHours}
            <span className="tile-unit">h avg</span>
          </div>
          <div className="tile-sub">{onDuty.length} on duty · {offDuty.length} off duty</div>
        </div>

        <div className={'tile ' + TONE_CLASS.ok}>
          <div className="tile-label">Shift Board</div>
          <div className="tile-value" style={{ fontSize: 20 }}>
            α {shifts['alpha'] || 0} · β {shifts['beta'] || 0} · γ {shifts['gamma'] || 0}
          </div>
          <div className="tile-sub">commissioned {fmtDate(station.commissioned + 'T00:00:00Z')}</div>
        </div>
      </div>
    </div>
  );
}

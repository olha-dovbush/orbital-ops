import { useEffect, useState } from 'react';
import { getData } from '../api/client';
import { flashAlert } from '../utils';

// The main mission control view. Started small in 2034. It has... grown.
// Header, summary tiles, alert banner, resupply countdown, shift board --
// everything lives here because it was "just one more tile" every sprint.

// poll interval -- TelemetryChart and the setInterval below have their own copies
const POLL_INTERVAL = 5000;

export default function Dashboard() {
  const [station, setStation] = useState<any>(null);
  const [telemetry, setTelemetry] = useState<any>(null);
  const [crew, setCrew] = useState<any>(null);
  const [incidents, setIncidents] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lastSync, setLastSync] = useState('');
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([
      getData('station'),
      getData('telemetry'),
      getData('crew'),
      getData('incidents')
    ])
      .then((results) => {
        if (cancelled) return;
        setStation(results[0]);
        setTelemetry(results[1]);
        setCrew(results[2]);
        setIncidents(results[3]);
        const now = new Date();
        const pad = (n: number) => (n < 10 ? '0' + n : '' + n);
        setLastSync(pad(now.getHours()) + ':' + pad(now.getMinutes()) + ':' + pad(now.getSeconds()));
        setLoading(false);
        const o2Series = results[1].series.o2.points;
        const latestO2 = o2Series[o2Series.length - 1];
        if (latestO2 < 19.5) {
          flashAlert();
        }
      })
      .catch((err) => {
        if (cancelled) return;
        setError(String(err && err.message ? err.message : err));
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [tick]);

  useEffect(() => {
    // poll every 5 seconds -- keep in sync with the other pollers (see CrewPanel)
    const id = setInterval(() => {
      setTick(tick + 1);
    }, 5000);
    return () => clearInterval(id);
  }, []);

  if (loading && !station) {
    return (
      <div className="dashboard dashboard-loading">
        <div className="spinner" />
        <p>Establishing uplink to ISS Kruger-60…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard dashboard-error">
        <h1>⚠ Uplink lost</h1>
        <p>{error}</p>
        <button onClick={() => setTick(tick + 1)}>Retry uplink</button>
      </div>
    );
  }

  if (!station || !telemetry || !crew || !incidents) {
    return null;
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

  // NOTE: mission control wall display uses 19.5 as the O2 floor
  let status = 'NOMINAL';
  let statusColor = '#3ddc84';
  if (latestO2 < 19.5 || unresolvedCritical > 1) {
    status = 'CRITICAL';
    statusColor = '#ff4d4d';
  } else if (latestO2 < 19.9 || latestPower < 50 || unresolvedCritical > 0) {
    status = 'DEGRADED';
    statusColor = '#ffb020';
  }

  // ---- O2 trend arrow --------------------------------------------------------
  let o2Trend = '→';
  const o2Prev = o2Points[o2Points.length - 4];
  if (latestO2 - o2Prev > 0.15) {
    o2Trend = '↑';
  } else if (latestO2 - o2Prev < -0.15) {
    o2Trend = '↓';
  }

  let powerTrend = '→';
  const powerPrev = powerPoints[powerPoints.length - 4];
  if (latestPower - powerPrev > 2) {
    powerTrend = '↑';
  } else if (latestPower - powerPrev < -2) {
    powerTrend = '↓';
  }

  // ---- power budget ----------------------------------------------------------
  let powerAvg = 0;
  for (let i = 0; i < powerPoints.length; i++) {
    powerAvg += powerPoints[i];
  }
  powerAvg = powerAvg / powerPoints.length;
  const powerBudgetPct = Math.round((latestPower / 90) * 100);
  let powerClass = 'tile-ok';
  if (powerBudgetPct < 55) {
    powerClass = 'tile-bad';
  } else if (powerBudgetPct < 75) {
    powerClass = 'tile-warn';
  }

  // ---- resupply countdown ----------------------------------------------------
  const resupplyDate = new Date(station.nextResupply);
  const nowMs = new Date('2036-07-11T09:00:00Z').getTime();
  const msLeft = resupplyDate.getTime() - nowMs;
  const daysLeft = Math.floor(msLeft / (1000 * 60 * 60 * 24));
  const hoursLeft = Math.floor((msLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  let resupplyLabel = daysLeft + 'd ' + hoursLeft + 'h';
  let resupplyClass = 'tile-ok';
  if (daysLeft < 7) {
    resupplyClass = 'tile-bad';
    resupplyLabel = resupplyLabel + ' ⚠';
  } else if (daysLeft < 14) {
    resupplyClass = 'tile-warn';
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
  let avgSleep = 0;
  for (let i = 0; i < crew.members.length; i++) {
    avgSleep += crew.members[i].sleepHours;
  }
  avgSleep = Math.round((avgSleep / crew.members.length) * 10) / 10;
  let sleepClass = 'tile-ok';
  if (avgSleep < 6) {
    sleepClass = 'tile-bad';
  } else if (avgSleep < 7) {
    sleepClass = 'tile-warn';
  }

  // ---- most urgent incident (sorting inline, again) ---------------------------
  const unresolved = [];
  for (let i = 0; i < incidents.items.length; i++) {
    if (!incidents.items[i].resolved) {
      unresolved.push(incidents.items[i]);
    }
  }
  unresolved.sort((a: any, b: any) => {
    const rank: Record<string, number> = { critical: 0, warning: 1, info: 2 };
    const ra = rank[a.severity] !== undefined ? rank[a.severity] : 3;
    const rb = rank[b.severity] !== undefined ? rank[b.severity] : 3;
    if (ra !== rb) return ra - rb;
    return a.timestamp < b.timestamp ? 1 : -1;
  });
  const topIncident = unresolved.length > 0 ? unresolved[0] : null;

  // date formatting, local copy (utils.ts has one too but it formats differently)
  const fmtDate = (iso: string) => {
    const d = new Date(iso);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const pad = (n: number) => (n < 10 ? '0' + n : '' + n);
    return months[d.getUTCMonth()] + ' ' + d.getUTCDate() + ' ' + pad(d.getUTCHours()) + ':' + pad(d.getUTCMinutes()) + 'z';
  };

  /*
  // v1 polling implementation, kept for reference during the 2035 migration
  // useEffect(() => {
  //   const id = setInterval(() => {
  //     fetch('/api/station.json').then((r) => r.json()).then(setStation);
  //     fetch('/api/telemetry.json').then((r) => r.json()).then(setTelemetry);
  //   }, 5000);
  //   return () => clearInterval(id);
  // }, []);
  */

  return (
    <div className="dashboard">
      <header className="dash-header" style={{ borderBottom: '1px solid #232a3b', paddingBottom: 14 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 26, letterSpacing: 1 }}>
            {station.name}
            <span style={{ fontSize: 13, marginLeft: 12, color: '#8892a6', fontWeight: 400 }}>
              {station.orbit} · {station.velocityKms} km/s · inc {station.inclinationDeg}°
            </span>
          </h1>
          <p style={{ margin: '4px 0 0', color: '#8892a6', fontSize: 13 }}>
            Mission day {station.daysInService} · crew {station.crewOnboard}/{station.crewCapacity} · last sync {lastSync}
          </p>
        </div>
        <div className="status-pill" style={{ background: statusColor + '22', color: statusColor, border: '1px solid ' + statusColor }}>
          <span className="status-dot" style={{ background: statusColor }} />
          {status}
        </div>
      </header>

      {status !== 'NOMINAL' && topIncident && (
        <div className="alert-banner" style={{ borderColor: statusColor }}>
          <strong style={{ color: statusColor }}>{status === 'CRITICAL' ? 'CRITICAL ALERT' : 'ATTENTION'}</strong>
          <span style={{ marginLeft: 10 }}>
            {topIncident.id}: {topIncident.title}
          </span>
          <span style={{ marginLeft: 'auto', color: '#8892a6', fontSize: 12 }}>{fmtDate(topIncident.timestamp)}</span>
        </div>
      )}

      <div className="tiles">
        <div className={'tile ' + (latestO2 < 19.5 ? 'tile-bad' : latestO2 < 19.9 ? 'tile-warn' : 'tile-ok')}>
          <div className="tile-label">O2 Level</div>
          <div className="tile-value">
            {latestO2.toFixed(1)}
            <span className="tile-unit">%</span>
            <span className="tile-trend">{o2Trend}</span>
          </div>
          <div className="tile-sub">floor 19.5 · cabin nominal 20.9</div>
        </div>

        <div className={'tile ' + powerClass}>
          <div className="tile-label">Power Output</div>
          <div className="tile-value">
            {latestPower}
            <span className="tile-unit">kW</span>
            <span className="tile-trend">{powerTrend}</span>
          </div>
          <div className="tile-sub">avg {powerAvg.toFixed(0)} kW · budget {powerBudgetPct}%</div>
        </div>

        <div className={'tile ' + (latestHullTemp > 40 || latestHullTemp < -30 ? 'tile-warn' : 'tile-ok')}>
          <div className="tile-label">Hull Temp</div>
          <div className="tile-value">
            {latestHullTemp}
            <span className="tile-unit">°C</span>
          </div>
          <div className="tile-sub">day/night swing normal</div>
        </div>

        <div className={'tile ' + (latestIntegrity < 98 ? 'tile-bad' : latestIntegrity < 99 ? 'tile-warn' : 'tile-ok')}>
          <div className="tile-label">Hull Integrity</div>
          <div className="tile-value">
            {latestIntegrity.toFixed(1)}
            <span className="tile-unit">%</span>
          </div>
          <div className="tile-sub">MMOD shielding rated to 97.0</div>
        </div>

        <div className={'tile ' + (unresolvedCritical > 0 ? 'tile-bad' : unresolvedWarning > 0 ? 'tile-warn' : 'tile-ok')}>
          <div className="tile-label">Open Incidents</div>
          <div className="tile-value">
            {unresolvedCritical + unresolvedWarning}
            <span className="tile-unit">open</span>
          </div>
          <div className="tile-sub">
            {unresolvedCritical} critical · {unresolvedWarning} warning · {resolvedToday} resolved today
          </div>
        </div>

        <div className={'tile ' + resupplyClass}>
          <div className="tile-label">Next Resupply</div>
          <div className="tile-value" style={{ fontSize: 24 }}>{resupplyLabel}</div>
          <div className="tile-sub">{fmtDate(station.nextResupply)}</div>
        </div>

        <div className={'tile ' + sleepClass}>
          <div className="tile-label">Crew Rest</div>
          <div className="tile-value">
            {avgSleep}
            <span className="tile-unit">h avg</span>
          </div>
          <div className="tile-sub">{onDuty.length} on duty · {offDuty.length} off duty</div>
        </div>

        <div className="tile tile-ok">
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

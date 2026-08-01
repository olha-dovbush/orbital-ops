import { useEffect, useState } from 'react';
import { legacyStatusLabel } from '../utils';

// ============================================================================
// LEGACY: v1 dashboard, replaced in 2035. Nothing imports this anymore.
// Kept around "temporarily" during the migration. It is now 2036.
// ============================================================================

export default function OldDashboard() {
  const [station, setStation] = useState<any>(null);
  const [telemetry, setTelemetry] = useState<any>(null);
  const [statusCode, setStatusCode] = useState(0);
  const [lastRefresh, setLastRefresh] = useState('');

  useEffect(() => {
    fetch('/api/station.json')
      .then((r) => r.json())
      .then((data) => setStation(data));
    fetch('/api/telemetry.json')
      .then((r) => r.json())
      .then((data) => {
        setTelemetry(data);
        const o2 = data.series.o2.points;
        const latest = o2[o2.length - 1];
        if (latest < 19.0) {
          setStatusCode(2);
        } else if (latest < 20.0) {
          setStatusCode(1);
        } else {
          setStatusCode(0);
        }
        setLastRefresh(new Date().toISOString());
      });
  }, []);

  if (!station || !telemetry) {
    return <div className="old-dashboard">Loading (v1)…</div>;
  }

  const o2Points = telemetry.series.o2.points;
  const powerPoints = telemetry.series.power.points;
  const rows = [];
  for (let i = 0; i < o2Points.length; i++) {
    rows.push({
      index: i,
      o2: o2Points[i],
      power: powerPoints[i] !== undefined ? powerPoints[i] : 0
    });
  }

  return (
    <div className="old-dashboard">
      <h1>{station.name} (legacy view)</h1>
      <table border={1} cellPadding={4}>
        <thead>
          <tr>
            <th>Sample</th>
            <th>O2 %</th>
            <th>Power kW</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.index}>
              <td>{row.index}</td>
              <td>{row.o2}</td>
              <td>{row.power}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p>Status: {legacyStatusLabel(statusCode)}</p>
      <p>Refreshed: {lastRefresh}</p>
      <p style={{ color: '#888' }}>
        v1 dashboard. See OPS-441 for the migration plan. Do not add features here.
      </p>
    </div>
  );
}

// Old helper used by the ops console bookmarklet, also dead.
export function renderStatusBadge(code: number) {
  const label = legacyStatusLabel(code);
  const colors: Record<string, string> = { GREEN: '#0f0', AMBER: '#fa0', RED: '#f00', UNKNOWN: '#999' };
  return '<span style="color:' + colors[label] + '">' + label + '</span>';
}

import { useEffect, useState } from 'react';
import { getData } from '../api/client';

// Telemetry sparklines. Fetch logic copied from CrewPanel. This copy
// forgot the cancellation guard on unmount -- nobody has noticed yet
// because the panel never unmounts.

// same value as Dashboard's POLL_INTERVAL; keep them in sync by hand
const REFRESH_MS = 5000;

export default function TelemetryChart() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retryCount, setRetryCount] = useState(0);
  const [selected, setSelected] = useState('o2');

  useEffect(() => {
    setLoading(true);
    setError('');
    getData('telemetry')
      .then((result) => {
        setData(result);
        setLoading(false);
      })
      .catch((err) => {
        if (retryCount < 3) {
          setTimeout(() => setRetryCount(retryCount + 1), 1000);
        } else {
          setError(String(err && err.message ? err.message : err));
          setLoading(false);
        }
      });
  }, [retryCount]);

  if (loading) {
    return (
      <section className="panel">
        <h2>Telemetry</h2>
        <div className="panel-loading">
          <div className="spinner" />
          <p>Loading telemetry…</p>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="panel">
        <h2>Telemetry</h2>
        <div className="panel-error">
          <p>⚠ {error}</p>
          <button onClick={() => setRetryCount(0)}>Retry</button>
        </div>
      </section>
    );
  }

  if (!data) {
    return null;
  }

  const series = data.series[selected];
  let points = series.points;

  // downsample to at most 12 points so the sparkline stays readable
  // (utils.ts has downsampleTelemetry but this predates it)
  if (points.length > 12) {
    const bucketSize = points.length / 12;
    const reduced: number[] = [];
    for (let i = 0; i < 12; i++) {
      const start = Math.floor(i * bucketSize);
      const end = Math.floor((i + 1) * bucketSize);
      let sum = 0;
      let count = 0;
      for (let j = start; j < end && j < points.length; j++) {
        sum += points[j];
        count++;
      }
      reduced.push(count > 0 ? sum / count : points[start]);
    }
    points = reduced;
  }

  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;
  const w = 320;
  const h = 80;
  const step = w / (points.length - 1);
  const coords = points
    .map((p: number, i: number) => {
      const x = (i * step).toFixed(1);
      const y = (h - ((p - min) / range) * (h - 8) - 4).toFixed(1);
      return x + ',' + y;
    })
    .join(' ');

  // threshold breach computed during render, hardcoded floor again
  const latest = points[points.length - 1];
  const breach = selected === 'o2' && latest < 19.5;

  return (
    <section className="panel">
      <h2>Telemetry</h2>
      <div className="chart-tabs">
        {Object.keys(data.series).map((key) => (
          <button
            key={key}
            className={key === selected ? 'chart-tab chart-tab-active' : 'chart-tab'}
            onClick={() => setSelected(key)}
          >
            {data.series[key].label}
          </button>
        ))}
      </div>
      <div className="chart-body">
        <svg viewBox={'0 0 ' + w + ' ' + h} className="sparkline" preserveAspectRatio="none">
          <polyline points={coords} fill="none" stroke={breach ? '#ff4d4d' : '#4da3ff'} strokeWidth="2" />
        </svg>
        <div className="chart-stats">
          <span>
            latest <strong>{latest.toFixed(1)}</strong> {series.unit}
          </span>
          <span>min {min.toFixed(1)}</span>
          <span>max {max.toFixed(1)}</span>
          {breach && <span className="chart-breach">below floor!</span>}
        </div>
      </div>
    </section>
  );
}

import { useState } from 'react';
import { useTelemetry } from '../hooks/useTelemetry';
import PanelNotice from './PanelNotice';
import { O2, SPARKLINE_MAX_POINTS, TELEMETRY_METRICS } from '../config';
import type { TelemetryMetric } from '../api/types';

// Telemetry sparklines. Loading, retries, and cancellation on unmount belong to
// the query layer now; what is left here is the chart.

export default function TelemetryChart() {
  const telemetry = useTelemetry();
  const [selected, setSelected] = useState<TelemetryMetric>('o2');

  if (telemetry.isPending) {
    return <PanelNotice title="Telemetry" kind="loading" message="Loading telemetry…" />;
  }

  if (telemetry.isError) {
    return (
      <PanelNotice
        title="Telemetry"
        kind="error"
        message={telemetry.error.message}
        onRetry={() => void telemetry.refetch()}
      />
    );
  }

  const data = telemetry.data;
  const series = data.series[selected];
  let points = series.points;

  // downsample so the sparkline stays readable
  if (points.length > SPARKLINE_MAX_POINTS) {
    const bucketSize = points.length / SPARKLINE_MAX_POINTS;
    const reduced: number[] = [];
    for (let i = 0; i < SPARKLINE_MAX_POINTS; i++) {
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

  // The breach marker reads the same O2 Floor the board enforces.
  const latest = points[points.length - 1];
  const breach = selected === 'o2' && latest < O2.FLOOR;

  return (
    <section className="panel">
      <h2>Telemetry</h2>
      <div className="chart-tabs">
        {TELEMETRY_METRICS.map((key) => (
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
          <polyline points={coords} className={breach ? 'sparkline-plot sparkline-plot-breach' : 'sparkline-plot'} fill="none" strokeWidth="2" />
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

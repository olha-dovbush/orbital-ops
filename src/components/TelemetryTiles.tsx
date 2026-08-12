import StatusTile from './StatusTile';
import { average, latest, metricTone, powerBudgetPct, trend } from '../domain/telemetry';
import { HULL_INTEGRITY, O2, O2_TREND_DELTA, POWER_TREND_DELTA_KW } from '../config';
import type { TelemetryMetric, TelemetrySeries } from '../api/types';

// The four telemetry tiles, composed from the one tile primitive. Every band and
// arrow here is the domain module's answer (src/domain/telemetry.ts); this
// component only says which reading goes in which tile.
//
// Hull temperature and hull integrity carry no arrow: a swing that returns is not
// a direction, and integrity only ever falls.

type TelemetryTilesProps = { series: Record<TelemetryMetric, TelemetrySeries> };

export default function TelemetryTiles({ series }: TelemetryTilesProps) {
  const o2 = series.o2.points;
  const power = series.power.points;
  const o2Level = latest(o2);
  const powerOutput = latest(power);
  const hullTemp = latest(series.hullTemp.points);
  const integrity = latest(series.hullIntegrity.points);

  return (
    <>
      <StatusTile
        label="O2 Level"
        value={o2Level.toFixed(1)}
        unit="%"
        trend={trend(o2, O2_TREND_DELTA)}
        subtitle={`floor ${O2.FLOOR} · cabin nominal ${O2.NOMINAL}`}
        tone={metricTone('o2', o2Level)}
      />
      <StatusTile
        label="Power Output"
        value={String(powerOutput)}
        unit="kW"
        trend={trend(power, POWER_TREND_DELTA_KW)}
        subtitle={`avg ${average(power).toFixed(0)} kW · budget ${powerBudgetPct(powerOutput)}%`}
        tone={metricTone('power', powerOutput)}
      />
      <StatusTile
        label="Hull Temp"
        value={String(hullTemp)}
        unit="°C"
        subtitle="day/night swing normal"
        tone={metricTone('hullTemp', hullTemp)}
      />
      <StatusTile
        label="Hull Integrity"
        value={integrity.toFixed(1)}
        unit="%"
        subtitle={`MMOD shielding rated to ${HULL_INTEGRITY.RATED.toFixed(1)}`}
        tone={metricTone('hullIntegrity', integrity)}
      />
    </>
  );
}

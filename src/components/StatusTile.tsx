import { TONE_CLASS, type Tone } from '../config';
import type { Trend } from '../domain/telemetry';

// One tile, for every tile on the board. The differences between tiles are data:
// what a tile shows arrives as props, and the tint arrives as a domain-computed
// tone that this component only maps to its class — no colour is decided here.
//
// Four near-identical tile components would read as four bespoke ones to a
// reader and as a clone to jscpd, which is why there is exactly one.

type StatusTileProps = {
  label: string;
  /** Already formatted: a tile decides its own precision, not this primitive. */
  value: string;
  /** Sits beside the value so a percentage is never read as a temperature. */
  unit?: string;
  trend?: Trend;
  subtitle: string;
  tone: Tone;
};

export default function StatusTile({ label, value, unit, trend, subtitle, tone }: StatusTileProps) {
  return (
    <div className={'tile ' + TONE_CLASS[tone]}>
      <div className="tile-label">{label}</div>
      <div className="tile-value">
        {value}
        {unit !== undefined && <span className="tile-unit">{unit}</span>}
        {trend !== undefined && <span className="tile-trend">{trend}</span>}
      </div>
      <div className="tile-sub">{subtitle}</div>
    </div>
  );
}

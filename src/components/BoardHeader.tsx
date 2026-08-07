import { TONE_CLASS, type Tone } from '../config';
import type { Status } from '../domain/station-status';
import type { Station } from '../api/types';

// Who the station is, and how it is doing: the record an operator reads once on
// opening the board, plus the one word they keep glancing back at.

type BoardHeaderProps = {
  station: Station;
  status: Status;
  tone: Tone;
  /** When the newest Live Resource reading landed, in epoch milliseconds. */
  syncedAt: number;
};

const pad = (n: number) => (n < 10 ? '0' + n : '' + n);

/**
 * The time of day the operator's own clock reads. Deliberately not Board Time
 * and not `src/domain/board-time.ts`: last sync is a fact about the uplink in
 * front of this operator, not about the instant the station's feeds describe.
 */
function clockTime(instant: number): string {
  const at = new Date(instant);
  return pad(at.getHours()) + ':' + pad(at.getMinutes()) + ':' + pad(at.getSeconds());
}

export default function BoardHeader({ station, status, tone, syncedAt }: BoardHeaderProps) {
  return (
    <header className="dash-header">
      <div>
        <h1 className="dash-title">
          {station.name}
          <span className="dash-orbit">
            {station.orbit} · {station.velocityKms} km/s · inc {station.inclinationDeg}°
          </span>
        </h1>
        <p className="dash-meta">
          Mission day {station.daysInService} · crew {station.crewOnboard}/{station.crewCapacity} · last sync{' '}
          {clockTime(syncedAt)}
        </p>
      </div>
      <div className={'status-pill ' + TONE_CLASS[tone]}>
        <span className="status-dot" />
        {status}
      </div>
    </header>
  );
}

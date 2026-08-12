import { TONE_CLASS, type Tone } from '../config';
import { formatInstant } from '../domain/board-time';
import type { Status } from '../domain/station-status';
import type { Incident } from '../api/types';

// The escalation, with its cause attached: whenever Station Status is not
// NOMINAL the board says so, and names the one incident an operator should open
// first.
//
// The flash is a class this component mounts with, never a class poked onto the
// DOM after the fact. The board mounts a fresh banner per status, so the
// animation plays once each time the station arrives at CRITICAL and never again
// on the polls that follow.

type AlertBannerProps = {
  status: Status;
  tone: Tone;
  /**
   * The most urgent incident still open — what the escalation is about. Absent
   * when the readings alone escalated the station and the feed is all clear: an
   * escalation with nothing to name is still an escalation, so the banner says
   * so and names nothing.
   */
  incident?: Incident;
};

export default function AlertBanner({ status, tone, incident }: AlertBannerProps) {
  const critical = status === 'CRITICAL';
  const className = ['alert-banner', TONE_CLASS[tone], critical ? 'alert-flash' : ''].join(' ').trim();

  return (
    <div className={className}>
      <strong>{critical ? 'CRITICAL ALERT' : 'ATTENTION'}</strong>
      {incident !== undefined && (
        <>
          <span className="alert-detail">
            {incident.id}: {incident.title}
          </span>
          <span className="alert-time">{formatInstant(incident.timestamp)}</span>
        </>
      )}
    </div>
  );
}

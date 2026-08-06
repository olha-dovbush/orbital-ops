import { useState } from 'react';
import { useIncidents } from '../hooks/useIncidents';
import { sortIncidents } from '../domain/incidents';
import PanelNotice from './PanelNotice';
import { formatTimestamp, severityColor } from '../utils';

// Incident feed. The fetch, the retry budget, and the loading/error chrome all
// belong to shared code now; what is left here is the feed itself.
//
// The empty list renders only for a feed that returned no incidents. An
// unreachable feed renders the error panel instead — an operator has to be able
// to tell a calm station from a dead one.

export default function IncidentFeed() {
  const incidents = useIncidents();
  const [showResolved, setShowResolved] = useState(false);

  if (incidents.isPending) {
    return <PanelNotice title="Incidents" kind="loading" message="Loading incident feed…" />;
  }

  if (incidents.isError) {
    return (
      <PanelNotice
        title="Incidents"
        kind="error"
        message={incidents.error.message}
        onRetry={() => void incidents.refetch()}
      />
    );
  }

  const items = sortIncidents(incidents.data.items.filter((i) => showResolved || !i.resolved));

  return (
    <section className="panel">
      <h2>
        Incidents
        <label className="toggle">
          <input type="checkbox" checked={showResolved} onChange={(e) => setShowResolved(e.target.checked)} />
          show resolved
        </label>
      </h2>
      <ul className="incident-list">
        {items.map((inc) => (
          <li key={inc.id} className={inc.resolved ? 'incident-row incident-resolved' : 'incident-row'}>
            <span className="incident-sev" style={{ background: severityColor(inc.severity) }}>
              {inc.severity}
            </span>
            <div className="incident-main">
              <span className="incident-title">
                {inc.id} · {inc.title}
              </span>
              <span className="incident-meta">
                {inc.system} · {formatTimestamp(inc.timestamp)} · {inc.resolved ? 'resolved' : 'open'}
              </span>
            </div>
          </li>
        ))}
        {items.length === 0 && <li className="incident-empty">No incidents to show.</li>}
      </ul>
    </section>
  );
}

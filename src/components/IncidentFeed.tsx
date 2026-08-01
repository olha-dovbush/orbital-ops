import { useEffect, useState } from 'react';
import { getData } from '../api/client';
import { formatTimestamp, severityColor } from '../utils';

// Incident feed. Fetch logic copied from CrewPanel (which was copied from
// Dashboard). This one silently swallows errors after the retries run out,
// which ops has complained about twice.

export default function IncidentFeed() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retryCount, setRetryCount] = useState(0);
  const [showResolved, setShowResolved] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    getData('incidents')
      .then((result) => {
        if (cancelled) return;
        setData(result);
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        if (retryCount < 2) {
          setTimeout(() => setRetryCount(retryCount + 1), 1500);
        } else {
          // swallow the error, just stop loading
          setData({ items: [] });
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [retryCount]);

  if (loading) {
    return (
      <section className="panel">
        <h2>Incidents</h2>
        <div className="panel-loading">
          <div className="spinner" />
          <p>Loading incident feed…</p>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="panel">
        <h2>Incidents</h2>
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

  const items = data.items.filter((i: any) => showResolved || !i.resolved);
  const rank: Record<string, number> = { critical: 0, warning: 1, info: 2 };
  items.sort((a: any, b: any) => {
    const ra = rank[a.severity] !== undefined ? rank[a.severity] : 3;
    const rb = rank[b.severity] !== undefined ? rank[b.severity] : 3;
    if (ra !== rb) return ra - rb;
    return a.timestamp < b.timestamp ? 1 : -1;
  });

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
        {items.map((inc: any) => (
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

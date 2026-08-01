import { useEffect, useState } from 'react';
import { getData } from '../api/client';

// Crew roster panel. The fetch logic here was copied from Dashboard,
// then tweaked to add retries. TelemetryChart and IncidentFeed have
// their own copies too. They have all drifted apart a little.

export default function CrewPanel() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    getData('crew')
      .then((result) => {
        if (cancelled) return;
        setData(result);
        setLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        if (retryCount < 3) {
          setTimeout(() => setRetryCount(retryCount + 1), 1000);
        } else {
          setError(String(err && err.message ? err.message : err));
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
        <h2>Crew</h2>
        <div className="panel-loading">
          <div className="spinner" />
          <p>Loading crew roster…</p>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="panel">
        <h2>Crew</h2>
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

  const sorted = [...data.members].sort((a: any, b: any) => {
    if (a.onDuty !== b.onDuty) return a.onDuty ? -1 : 1;
    return a.name < b.name ? -1 : 1;
  });

  return (
    <section className="panel">
      <h2>Crew</h2>
      <ul className="crew-list">
        {sorted.map((m: any) => (
          <li key={m.id} className={m.onDuty ? 'crew-row crew-on' : 'crew-row'}>
            <span className="crew-dot" style={{ background: m.onDuty ? '#3ddc84' : '#8892a6' }} />
            <div className="crew-main">
              <span className="crew-name">{m.name}</span>
              <span className="crew-role">{m.role} · shift {m.shift}</span>
            </div>
            <div className="crew-vitals">
              <span title="heart rate">♥ {m.heartRate}</span>
              <span title="sleep last night">☾ {m.sleepHours}h</span>
              <span title="mission day">d{m.missionDay}</span>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

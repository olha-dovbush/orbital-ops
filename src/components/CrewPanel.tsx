import { useCrew } from '../hooks/useCrew';
import { sortRoster } from '../domain/crew';
import PanelNotice from './PanelNotice';

// Crew roster. The fetch, the retry budget, and the loading/error chrome all
// belong to shared code now; what is left here is the roster itself.

export default function CrewPanel() {
  const crew = useCrew();

  if (crew.isPending) {
    return <PanelNotice title="Crew" kind="loading" message="Loading crew roster…" />;
  }

  if (crew.isError) {
    return (
      <PanelNotice
        title="Crew"
        kind="error"
        message={crew.error.message}
        onRetry={() => void crew.refetch()}
      />
    );
  }

  return (
    <section className="panel">
      <h2>Crew</h2>
      <ul className="crew-list">
        {sortRoster(crew.data.members).map((m) => (
          <li key={m.id} className={m.onDuty ? 'crew-row crew-on' : 'crew-row'}>
            <span className={m.onDuty ? 'crew-dot crew-dot-on' : 'crew-dot'} />
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

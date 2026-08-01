import Dashboard from './components/Dashboard';
import TelemetryChart from './components/TelemetryChart';
import CrewPanel from './components/CrewPanel';
import IncidentFeed from './components/IncidentFeed';

export default function App() {
  return (
    <div className="app">
      <Dashboard />
      <div className="grid">
        <TelemetryChart />
        <CrewPanel />
        <IncidentFeed />
      </div>
      <footer className="footer">
        Orbital Ops · training playground · data is fictional
      </footer>
    </div>
  );
}

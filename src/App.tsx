import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Dashboard from './components/Dashboard';
import TelemetryChart from './components/TelemetryChart';
import CrewPanel from './components/CrewPanel';
import IncidentFeed from './components/IncidentFeed';

// The query provider mounts here rather than in main.tsx: tests render <App />
// directly, and a provider at the browser entry point would leave them without
// one.
const queryClient = new QueryClient();

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
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
    </QueryClientProvider>
  );
}

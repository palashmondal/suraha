import AppShell from './layout/AppShell';
import Dashboard from './pages/Dashboard';

// Milestone 1 stops at the shell + dashboard. Routing to the individual modules
// (pregnancy, birth, complaint, appointment, …) arrives in Milestones 3–9.
export default function App() {
  return (
    <AppShell>
      <Dashboard />
    </AppShell>
  );
}

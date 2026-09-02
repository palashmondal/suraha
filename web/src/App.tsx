import { Navigate, Route, Routes } from 'react-router-dom';
import AppShell from './layout/AppShell';
import Dashboard from './pages/Dashboard';
import CitizenLayout from './layout/citizen/CitizenLayout';
import CitizenHome from './pages/citizen/CitizenHome';
import FileComplaint from './pages/citizen/FileComplaint';
import BookAppointment from './pages/citizen/BookAppointment';
import Applications from './pages/citizen/Applications';
import ApplicationDetail from './pages/citizen/ApplicationDetail';
import Notices from './pages/citizen/Notices';
import CitizenProfile from './pages/citizen/CitizenProfile';
import OfficerLogin from './pages/auth/OfficerLogin';
import CitizenLogin from './pages/auth/CitizenLogin';
import InstallPrompt from './pwa/InstallPrompt';
import { useAuth } from './auth/AuthContext';
import { RequireCitizen, RequireOfficer } from './auth/guards';
import { homePathFor } from './auth/roles';

// One PWA, three route trees (SURAHA_BUILD_PROMPT §1.1(2)): public auth, the officer/DC/SEAL app
// shell, and the citizen mobile area. Role guards route each user to the area their role owns; the
// module screens (pregnancy, complaints, appointments…) land inside these shells in Milestones 4–9.
function RootRedirect() {
  const { user } = useAuth();
  return <Navigate to={user ? homePathFor(user.role) : '/login'} replace />;
}

export default function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={<RootRedirect />} />

        {/* Public auth */}
        <Route path="/login" element={<OfficerLogin />} />
        <Route path="/citizen/login" element={<CitizenLogin />} />

        {/* Officer / DC / SEAL app shell */}
        <Route
          path="/app"
          element={
            <RequireOfficer>
              <AppShell>
                <Dashboard />
              </AppShell>
            </RequireOfficer>
          }
        />

        {/* Citizen mobile-first area */}
        <Route
          path="/citizen"
          element={
            <RequireCitizen>
              <CitizenLayout />
            </RequireCitizen>
          }
        >
          <Route index element={<CitizenHome />} />
          <Route path="complaint/new" element={<FileComplaint />} />
          <Route path="appointment/new" element={<BookAppointment />} />
          <Route path="applications" element={<Applications />} />
          <Route path="applications/:id" element={<ApplicationDetail />} />
          <Route path="notices" element={<Notices />} />
          <Route path="profile" element={<CitizenProfile />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      <InstallPrompt />
    </>
  );
}

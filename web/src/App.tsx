import { Box, CircularProgress } from '@mui/material';
import { Navigate, Route, Routes } from 'react-router-dom';
import type { ReactNode } from 'react';
import AppShell from './layout/AppShell';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import Profile from './pages/Profile';
import Instances from './pages/admin/Instances';
import InstanceDetail from './pages/admin/InstanceDetail';
import Showcase from './pages/ui/Showcase';
import PregnancyList from './pages/pregnancy/PregnancyList';
import PregnancyAdd from './pages/pregnancy/PregnancyAdd';
import PregnancyDetail from './pages/pregnancy/PregnancyDetail';
import BirthRegList from './pages/birth/BirthRegList';
import ComplaintList from './pages/complaint/ComplaintList';
import ComplaintDetail from './pages/complaint/ComplaintDetail';
import AppointmentList from './pages/appointment/AppointmentList';
import AppointmentDetail from './pages/appointment/AppointmentDetail';
import Landing from './pages/public/Landing';
import Track from './pages/public/Track';
import FileComplaint from './pages/public/FileComplaint';
import BookAppointment from './pages/public/BookAppointment';
import MySubmissions from './pages/public/MySubmissions';
import OfficerList from './pages/officers/OfficerList';
import SliderManage from './pages/content/SliderManage';
import GeneralInfoManage from './pages/content/GeneralInfoManage';
import Reports from './pages/reports/Reports';
import NotificationsPage from './pages/NotificationsPage';
import { useAuth } from './auth/AuthContext';

function Spinner() {
  return (
    <Box sx={{ height: '100vh', display: 'grid', placeItems: 'center' }}>
      <CircularProgress />
    </Box>
  );
}

// Officer-only guard: citizens and the public never reach the internal app shell (the API also
// enforces this server-side). `role` further restricts to one officer role (e.g. seal_admin).
function RequireAuth({ children, roles }: { children: ReactNode; roles?: string[] }) {
  const { user, loading } = useAuth();
  if (loading) return <Spinner />;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === 'citizen') return <Navigate to="/" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
  return <AppShell>{children}</AppShell>;
}

// Any authenticated user (used by the citizen filing pages); sends the public to login.
function RequireLogin({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <Spinner />;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

// Root: officers get the internal dashboard; everyone else (public + citizens) gets the landing.
function Home() {
  const { user, loading } = useAuth();
  if (loading) return <Spinner />;
  if (user && user.role !== 'citizen') return <AppShell><Dashboard /></AppShell>;
  return <Landing />;
}

export default function App() {
  return (
    <Routes>
      {/* Public (per-subdomain) */}
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/track" element={<Track />} />

      {/* Citizen filing (account required) */}
      <Route path="/file-complaint" element={<RequireLogin><FileComplaint /></RequireLogin>} />
      <Route path="/book-appointment" element={<RequireLogin><BookAppointment /></RequireLogin>} />
      <Route path="/my-submissions" element={<RequireLogin><MySubmissions /></RequireLogin>} />

      {/* Internal app (officers) */}
      <Route path="/profile" element={<RequireAuth><Profile /></RequireAuth>} />
      <Route path="/ui" element={<RequireAuth><Showcase /></RequireAuth>} />
      <Route path="/pregnancy" element={<RequireAuth><PregnancyList /></RequireAuth>} />
      <Route path="/pregnancy/new" element={<RequireAuth><PregnancyAdd /></RequireAuth>} />
      <Route path="/pregnancy/:id" element={<RequireAuth><PregnancyDetail /></RequireAuth>} />
      <Route path="/birth" element={<RequireAuth><BirthRegList /></RequireAuth>} />
      <Route path="/complaint" element={<RequireAuth><ComplaintList /></RequireAuth>} />
      <Route path="/complaint/:id" element={<RequireAuth><ComplaintDetail /></RequireAuth>} />
      <Route path="/appointment" element={<RequireAuth><AppointmentList /></RequireAuth>} />
      <Route path="/appointment/:id" element={<RequireAuth><AppointmentDetail /></RequireAuth>} />
      <Route path="/reports" element={<RequireAuth><Reports /></RequireAuth>} />
      <Route path="/notifications" element={<RequireAuth><NotificationsPage /></RequireAuth>} />
      <Route path="/officers" element={<RequireAuth roles={['uno', 'seal_admin']}><OfficerList /></RequireAuth>} />
      <Route path="/sliders" element={<RequireAuth roles={['uno', 'seal_admin']}><SliderManage /></RequireAuth>} />
      <Route path="/general-info" element={<RequireAuth roles={['uno', 'seal_admin']}><GeneralInfoManage /></RequireAuth>} />
      <Route path="/instances" element={<RequireAuth roles={['seal_admin']}><Instances /></RequireAuth>} />
      <Route path="/instances/:id" element={<RequireAuth roles={['seal_admin']}><InstanceDetail /></RequireAuth>} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

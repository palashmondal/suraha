import { Box, CircularProgress, Typography } from '@mui/material';
import { Navigate, Route, Routes } from 'react-router-dom';
import type { ReactNode } from 'react';
import AppShell from './layout/AppShell';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import Profile from './pages/Profile';
import ChangePassword from './pages/ChangePassword';
import Instances from './pages/admin/Instances';
import Districts from './pages/admin/Districts';
import InstanceDetail from './pages/admin/InstanceDetail';
import Showcase from './pages/ui/Showcase';
import PregnancyList from './pages/pregnancy/PregnancyList';
import PregnancyAdd from './pages/pregnancy/PregnancyAdd';
import PregnancyDetail from './pages/pregnancy/PregnancyDetail';
import BirthRegList from './pages/birth/BirthRegList';
import BirthRegDetail from './pages/birth/BirthRegDetail';
import ComplaintList from './pages/complaint/ComplaintList';
import ComplaintDetail from './pages/complaint/ComplaintDetail';
import InvestigatingOfficers from './pages/complaint/InvestigatingOfficers';
import InvestigatorCases from './pages/complaint/InvestigatorCases';
import HearingSchedule from './pages/complaint/HearingSchedule';
import AppointmentList from './pages/appointment/AppointmentList';
import AppointmentDetail from './pages/appointment/AppointmentDetail';
import AppointmentSchedule from './pages/appointment/AppointmentSchedule';
import ProductLanding from './pages/public/ProductLanding';
import UpazilaLanding from './pages/public/UpazilaLanding';
import Track from './pages/public/Track';
import FileComplaint from './pages/public/FileComplaint';
import BookAppointment from './pages/public/BookAppointment';
import MySubmissions from './pages/public/MySubmissions';
import UserList from './pages/users/UserList';
import SmsSettings from './pages/settings/SmsSettings';
import AssistanceList from './pages/assistance/AssistanceList';
import AssistanceDetail from './pages/assistance/AssistanceDetail';
import SuggestionList from './pages/suggestion/SuggestionList';
import SuggestionDetail from './pages/suggestion/SuggestionDetail';
import ApplyAssistance from './pages/public/ApplyAssistance';
import SubmitSuggestion from './pages/public/SubmitSuggestion';
import SliderManage from './pages/content/SliderManage';
import GeneralInfoManage from './pages/content/GeneralInfoManage';
import Reports from './pages/reports/Reports';
import NotificationsPage from './pages/NotificationsPage';
import { useAuth } from './auth/AuthContext';
import { bnStrings as S } from './i18n';
import { useHostContext } from './tenant/host';
import InstallPrompt from './pwa/InstallPrompt';

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
  // A real officer on a page their role may not open belongs back in the app, not on the
  // citizen site — /app is the one page every officer role can render.
  if (roles && !roles.includes(user.role)) return <Navigate to="/app" replace />;
  return <AppShell>{children}</AppShell>;
}

// Any authenticated user (used by the citizen filing pages); sends the public to login.
function RequireLogin({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <Spinner />;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

/**
 * "/" is the public site and nothing else — the officer app lives under /app on every host, so a
 * URL means one thing wherever it is opened. What differs per host is only which public site:
 *   suraha.net            → the product's own landing page
 *   {upazila}.suraha.net  → that upazila's citizen site
 *   admin.suraha.net      → none (SEAL's console), so "/" hands straight over to /app
 *   {district}.suraha.net → none either (the DC's dashboard; there is no tenant behind it)
 * /app itself sends a signed-out visitor to the login, so both of those land there when nobody
 * is signed in.
 */
function Home() {
  const host = useHostContext();

  if (!host) return <Spinner />;
  if (host.kind === 'district' || host.is_admin) return <Navigate to="/app" replace />;

  return host.kind === 'central' ? <ProductLanding /> : <UpazilaLanding />;
}

// A deactivated upazila serves this and nothing else. The API refuses every other endpoint on
// that host (EnsureTenantActive), so there is no usable app behind this screen — showing it is
// what keeps a disabled subdomain from rendering as a half-broken site.
function InactiveSite() {
  return (
    <Box sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center', p: 3 }}>
      <Box sx={{ maxWidth: 520, textAlign: 'center', display: 'grid', gap: 1.5 }}>
        <Typography sx={{ fontSize: 22, fontWeight: 800 }}>{S.inactiveSite.title}</Typography>
        <Typography sx={{ color: 'text.secondary' }}>{S.inactiveSite.body}</Typography>
        <Typography sx={{ color: 'text.secondary', fontSize: 14 }}>{S.inactiveSite.contact}</Typography>
      </Box>
    </Box>
  );
}

// An investigating officer's অভিযোগ list is their own desk, so they get the same page the UNO
// sees for them rather than the register view, which for them would only ever show their own
// rows anyway — with the wrong tabs and no caseload summary.
function ComplaintIndex() {
  const { user } = useAuth();

  // Both investigating roles land on their own desk; everyone else gets the full register.
  const ownDesk = user?.role === 'investigating_officer' || user?.role === 'up_sochib';

  return ownDesk ? <InvestigatorCases /> : <ComplaintList />;
}

export default function App() {
  // Resolves the host once for the whole app, which is also what sets the tab title
  // (see tenant/host.ts). Routes that never render TopBar still get the right title.
  const host = useHostContext();

  if (!host) return <Spinner />;
  if (host.kind === 'upazila' && host.is_active === false) return <InactiveSite />;

  return (
    <>
    <Routes>
      {/* Public (per-subdomain) */}
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/track" element={<Track />} />

      {/* Citizen filing (account required) */}
      <Route path="/file-complaint" element={<RequireLogin><FileComplaint /></RequireLogin>} />
      <Route path="/book-appointment" element={<RequireLogin><BookAppointment /></RequireLogin>} />
      <Route path="/apply-assistance" element={<RequireLogin><ApplyAssistance /></RequireLogin>} />
      <Route path="/submit-suggestion" element={<RequireLogin><SubmitSuggestion /></RequireLogin>} />
      <Route path="/my-submissions" element={<RequireLogin><MySubmissions /></RequireLogin>} />

      {/* Internal app (officers) — everything an officer does hangs off /app */}
      <Route path="/app" element={<RequireAuth><Dashboard /></RequireAuth>} />
      <Route path="/app/profile" element={<RequireAuth><Profile /></RequireAuth>} />
      <Route path="/app/change-password" element={<RequireAuth><ChangePassword /></RequireAuth>} />
      <Route path="/app/ui" element={<RequireAuth><Showcase /></RequireAuth>} />
      <Route path="/app/pregnancy" element={<RequireAuth><PregnancyList /></RequireAuth>} />
      {/* Entering a mother is the FWA's job — the সচিব/UNO/DC only read the register (the API
          gates this too; this keeps the UI from offering a form that would 403 on save). */}
      <Route path="/app/pregnancy/new" element={<RequireAuth roles={['fwa', 'seal_admin']}><PregnancyAdd /></RequireAuth>} />
      <Route path="/app/pregnancy/:id/edit" element={<RequireAuth roles={['fwa', 'seal_admin']}><PregnancyAdd /></RequireAuth>} />
      <Route path="/app/pregnancy/:id" element={<RequireAuth><PregnancyDetail /></RequireAuth>} />
      <Route path="/app/birth" element={<RequireAuth><BirthRegList /></RequireAuth>} />
      <Route path="/app/birth/:id" element={<RequireAuth><BirthRegDetail /></RequireAuth>} />
      <Route path="/app/complaint" element={<RequireAuth><ComplaintIndex /></RequireAuth>} />
      <Route path="/app/investigators" element={<RequireAuth roles={['uno', 'seal_admin']}><InvestigatingOfficers /></RequireAuth>} />
      <Route path="/app/investigators/:id" element={<RequireAuth roles={['uno', 'seal_admin']}><InvestigatorCases /></RequireAuth>} />
      <Route path="/app/hearings" element={<RequireAuth roles={['uno', 'seal_admin']}><HearingSchedule /></RequireAuth>} />
      <Route path="/app/complaint/:id" element={<RequireAuth><ComplaintDetail /></RequireAuth>} />
      <Route path="/app/appointment" element={<RequireAuth><AppointmentList /></RequireAuth>} />
      <Route path="/app/appointment-schedule" element={<RequireAuth roles={['uno', 'seal_admin']}><AppointmentSchedule /></RequireAuth>} />
      <Route path="/app/appointment/:id" element={<RequireAuth><AppointmentDetail /></RequireAuth>} />
      <Route path="/app/reports" element={<RequireAuth><Reports /></RequireAuth>} />
      <Route path="/app/notifications" element={<RequireAuth><NotificationsPage /></RequireAuth>} />
      <Route path="/app/sms-settings" element={<RequireAuth roles={['uno', 'seal_admin']}><SmsSettings /></RequireAuth>} />
      <Route path="/app/users" element={<RequireAuth roles={['uno', 'seal_admin']}><UserList /></RequireAuth>} />

      {/* মানবিক সহায়তা + নাগরিক পরামর্শ — officer views */}
      <Route path="/app/humanitarian" element={<RequireAuth><AssistanceList /></RequireAuth>} />
      <Route path="/app/humanitarian/:id" element={<RequireAuth><AssistanceDetail /></RequireAuth>} />
      <Route path="/app/advice" element={<RequireAuth><SuggestionList /></RequireAuth>} />
      <Route path="/app/advice/:id" element={<RequireAuth><SuggestionDetail /></RequireAuth>} />
      <Route path="/app/sliders" element={<RequireAuth roles={['uno', 'seal_admin']}><SliderManage /></RequireAuth>} />
      <Route path="/app/general-info" element={<RequireAuth roles={['uno', 'seal_admin']}><GeneralInfoManage /></RequireAuth>} />
      <Route path="/app/instances" element={<RequireAuth roles={['seal_admin']}><Instances /></RequireAuth>} />
      <Route path="/app/districts" element={<RequireAuth roles={['seal_admin']}><Districts /></RequireAuth>} />
      <Route path="/app/instances/:id" element={<RequireAuth roles={['seal_admin']}><InstanceDetail /></RequireAuth>} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    <InstallPrompt />
    </>
  );
}

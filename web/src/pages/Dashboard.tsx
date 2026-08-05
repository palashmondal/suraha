import { useEffect, useState } from 'react';
import { Box, Button, Chip, Typography } from '@mui/material';
import MoreVertRoundedIcon from '@mui/icons-material/MoreVertRounded';
import { useTheme } from '@mui/material/styles';
import { useNavigate } from 'react-router-dom';
import ModuleSummaryCard from '../components/ModuleSummaryCard';
import SectionCard from '../components/SectionCard';
import EmptyState from '../components/EmptyState';
import { bnStrings as S } from '../i18n';
import { bn } from '../utils/bnNum';
import { useAuth } from '../auth/AuthContext';
import { useSelectedTenant } from '../tenant/SelectedTenantContext';
import { getDashboardStats, type DashboardStats } from '../api/dashboard';
import { listAppointments, type Appointment } from '../api/appointment';
import { listComplaints, type Complaint } from '../api/complaint';
import { getPublicSliders, type Slider } from '../api/content';
import SliderCarousel from '../components/SliderCarousel';

function ListRow({ title, who, date, last }: { title: string; who: string; date: string; last: boolean }) {
  return (
    <Box sx={{ py: 1.5, display: 'flex', alignItems: 'flex-start', gap: 1.5, borderBottom: last ? 'none' : '1px solid', borderColor: 'divider' }}>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography sx={{ fontSize: 15, fontWeight: 600 }} noWrap>{title}</Typography>
        <Typography sx={{ fontSize: 13.5, color: 'text.secondary', mt: 0.5 }}>{who}</Typography>
      </Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexShrink: 0, pt: 0.25 }}>
        <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>{date}</Typography>
        <MoreVertRoundedIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
      </Box>
    </Box>
  );
}

export default function Dashboard() {
  const theme = useTheme();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { version } = useSelectedTenant();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [slides, setSlides] = useState<Slider[]>([]);

  const role = user?.role ?? '';
  const can = (roles: string[]) => roles.includes(role);
  const showAppointments = can(['uno', 'dc', 'seal_admin']);
  const showComplaints = can(['uno', 'investigating_officer', 'dc', 'seal_admin']);
  const showSliders = can(['uno', 'dc', 'seal_admin']);

  useEffect(() => {
    getDashboardStats().then(setStats).catch(() => setStats(null));
    if (showAppointments) listAppointments().then((r) => setAppointments(r.data.slice(0, 4))).catch(() => setAppointments([]));
    if (showComplaints) listComplaints().then((r) => setComplaints(r.data.slice(0, 4))).catch(() => setComplaints([]));
    if (showSliders) getPublicSliders().then((r) => setSlides(r.sliders)).catch(() => setSlides([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [version, role]);

  if (!stats) return null;

  const P = S.common.person;
  const isAggregate = stats.scope.level !== 'tenant';

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3, flexWrap: 'wrap' }}>
        <Typography variant="h5">{S.dashboard.title}</Typography>
        {isAggregate && (
          <Chip
            label={`${S.dashboard.aggregateOf} · ${stats.scope.label} (${bn(stats.scope.upazila_count)}${S.dashboard.upazilaCount})`}
            color="primary"
            variant="outlined"
            size="small"
          />
        )}
      </Box>

      {/* Row 1 — module summary cards (role-filtered, real numbers) */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, minmax(0, 1fr))' }, gap: 2.5, mb: 2.5 }}>
        {can(['uno', 'dc', 'seal_admin']) && (
          <ModuleSummaryCard
            title={S.dashboard.officer.title}
            accent={theme.suraha.module.officer}
            actionLabel={S.common.details}
            tiles={[
              { label: S.dashboard.officer.totalHealthWorker, value: bn(stats.officers.fwa), unit: P },
              { label: S.dashboard.officer.totalFpWorker, value: bn(stats.officers.investigators), unit: P },
              { label: S.dashboard.officer.totalSochib, value: bn(stats.officers.sochib), unit: P, full: true },
            ]}
          />
        )}
        {can(['fwa', 'up_sochib', 'dc', 'seal_admin']) && (
          <ModuleSummaryCard
            title={S.dashboard.pregnancy.title}
            accent={theme.suraha.module.pregnancy}
            actionLabel={S.common.details}
            tiles={[
              { label: S.dashboard.pregnancy.todayNew, value: bn(stats.pregnancy.today_new), unit: P, full: true },
              { label: S.dashboard.pregnancy.total, value: bn(stats.pregnancy.total), unit: P },
              { label: S.dashboard.pregnancy.totalDelivery, value: bn(stats.pregnancy.delivered), unit: P },
            ]}
          />
        )}
        {can(['up_sochib', 'dc', 'seal_admin']) && (
          <ModuleSummaryCard
            title={S.dashboard.birth.title}
            accent={theme.suraha.module.birth}
            actionLabel={S.common.details}
            tiles={[
              { label: S.dashboard.birth.todayNew, value: bn(stats.birth.today_new), unit: P, full: true },
              { label: S.dashboard.birth.total, value: bn(stats.birth.total), unit: S.common.count },
              { label: S.dashboard.birth.pendingEntry, value: bn(stats.birth.pending_entry), unit: P },
            ]}
          />
        )}
      </Box>

      {/* Row 2 — recent lists + awareness slider (role-filtered) */}
      {(showAppointments || showComplaints || showSliders) && (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(auto-fit, minmax(280px, 1fr))' }, gap: 2.5 }}>
          {showAppointments && (
            <SectionCard
              title={S.dashboard.appointment.title}
              count={stats.appointments.total}
              action={<Button size="small" variant="outlined" color="inherit" onClick={() => navigate('/appointment')} sx={{ borderRadius: '8px', borderColor: 'divider', color: 'text.secondary', px: 2 }}>{S.common.all}</Button>}
            >
              {appointments.length === 0 ? <EmptyState /> : appointments.map((a, i) => (
                <ListRow key={a.id} title={a.purpose} who={a.applicant_name} date={a.appointment_date ? bn(a.appointment_date) : ''} last={i === appointments.length - 1} />
              ))}
            </SectionCard>
          )}
          {showComplaints && (
            <SectionCard
              title={S.dashboard.complaint.title}
              count={stats.complaints.total}
              action={<Button size="small" variant="outlined" color="inherit" onClick={() => navigate('/complaint')} sx={{ borderRadius: '8px', borderColor: 'divider', color: 'text.secondary', px: 2 }}>{S.common.all}</Button>}
            >
              {complaints.length === 0 ? <EmptyState /> : complaints.map((c, i) => (
                <ListRow key={c.id} title={c.title} who={c.complainant_name} date={c.complaint_date ? bn(c.complaint_date) : ''} last={i === complaints.length - 1} />
              ))}
            </SectionCard>
          )}
          {showSliders && (
            <SectionCard
              title={S.dashboard.slider.title}
              action={<Button size="small" variant="outlined" color="inherit" onClick={() => navigate('/sliders')} sx={{ borderRadius: '8px', borderColor: 'divider', color: 'text.secondary', px: 2 }}>{S.common.addNew}</Button>}
            >
              {slides.length === 0 ? <EmptyState /> : <SliderCarousel slides={slides} height={200} />}
            </SectionCard>
          )}
        </Box>
      )}
    </Box>
  );
}

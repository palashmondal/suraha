import { useEffect, useState } from 'react';
import { Box, Chip, Paper, Stack, Typography } from '@mui/material';
import EventRoundedIcon from '@mui/icons-material/EventRounded';
import ScheduleRoundedIcon from '@mui/icons-material/ScheduleRounded';
import { useNavigate } from 'react-router-dom';
import { bnStrings as S } from '../../i18n';
import { bn } from '../../utils/bnNum';
import PageHeader from '../../components/PageHeader';
import EmptyState from '../../components/EmptyState';
import LoadingState from '../../components/LoadingState';
import { useSelectedTenant } from '../../tenant/SelectedTenantContext';
import { listAppointmentSchedule, type ScheduledAppointment } from '../../api/appointment';

// The UNO's appointment calendar (§8.3) — approved appointments grouped by date.
export default function AppointmentSchedule() {
  const navigate = useNavigate();
  const { selectedUpazilaId } = useSelectedTenant();
  const [rows, setRows] = useState<ScheduledAppointment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    listAppointmentSchedule()
      .then((r) => setRows(r.appointments))
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, [selectedUpazilaId]);

  const groups = rows.reduce<Record<string, ScheduledAppointment[]>>((acc, a) => {
    const key = a.appointment_date ?? '—';
    (acc[key] ??= []).push(a);
    return acc;
  }, {});

  return (
    <Box>
      <PageHeader title={S.appointment.scheduleTitle} />

      {loading && <LoadingState />}
      {!loading && rows.length === 0 && <EmptyState title={S.appointment.scheduleEmpty} />}

      <Stack spacing={2.5} sx={{ mt: 1 }}>
        {Object.entries(groups).map(([date, items]) => (
          <Box key={date}>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
              <EventRoundedIcon sx={{ color: 'primary.main' }} />
              <Typography sx={{ fontWeight: 800 }}>{bn(date)}</Typography>
              <Chip size="small" label={`${bn(items.length)} ${S.appointment.countSuffix}`} />
            </Stack>
            <Stack spacing={1}>
              {items.map((a) => (
                <Paper
                  key={a.id}
                  elevation={0}
                  onClick={() => navigate(`/appointment/${a.id}`)}
                  sx={{ p: 2, borderRadius: '14px', cursor: 'pointer', border: (t) => `1px solid ${t.palette.divider}`, '&:hover': { borderColor: 'primary.main' } }}
                >
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <Typography sx={{ fontWeight: 700, flex: 1 }}>{a.applicant_name}</Typography>
                    {a.appointment_time && (
                      <Stack direction="row" alignItems="center" spacing={0.5} sx={{ color: 'text.secondary' }}>
                        <ScheduleRoundedIcon sx={{ fontSize: 16 }} />
                        <Typography sx={{ fontSize: 13.5 }}>{bn(a.appointment_time.slice(0, 5))}</Typography>
                      </Stack>
                    )}
                  </Stack>
                  <Typography sx={{ fontSize: 13.5, color: 'text.secondary' }}>{a.purpose}</Typography>
                </Paper>
              ))}
            </Stack>
          </Box>
        ))}
      </Stack>
    </Box>
  );
}

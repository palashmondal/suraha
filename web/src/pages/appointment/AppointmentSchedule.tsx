import { useEffect, useState } from 'react';
import { Box, Chip, Paper, Stack, Typography } from '@mui/material';
import EventRoundedIcon from '@mui/icons-material/EventRounded';
import ScheduleRoundedIcon from '@mui/icons-material/ScheduleRounded';
import { useNavigate } from 'react-router-dom';
import { bnStrings as S } from '../../i18n';
import { bn, bnDate, bnTime } from '../../utils/bnNum';
import PageHeader from '../../components/PageHeader';
import EmptyState from '../../components/EmptyState';
import LoadingState from '../../components/LoadingState';
import { useSelectedTenant } from '../../tenant/SelectedTenantContext';
import { listAppointmentSchedule, type ScheduledAppointment } from '../../api/appointment';
import { ApiError } from '../../api/client';
import { Button, TextField } from '@mui/material';
import ContentCopyRoundedIcon from '@mui/icons-material/ContentCopyRounded';
import ApartmentRoundedIcon from '@mui/icons-material/ApartmentRounded';

// The UNO's appointment calendar (§8.3) — approved appointments grouped by date.
export default function AppointmentSchedule() {
  const navigate = useNavigate();
  const { selectedUpazilaId } = useSelectedTenant();
  const [rows, setRows] = useState<ScheduledAppointment[]>([]);
  const [feedUrl, setFeedUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const [needsUpazila, setNeedsUpazila] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    listAppointmentSchedule()
      .then((r) => { setRows(r.appointments); setFeedUrl(r.feed_url); setNeedsUpazila(false); })
      .catch((e) => {
        setRows([]);
        setFeedUrl('');
        // A সূচি is one UNO's calendar, so it means nothing across "সকল উপজেলা". The API is the
        // authority on whether an upazila was resolved — it answers 400 when none was — which
        // holds on the central host, a district host, and a subdomain alike.
        setNeedsUpazila(e instanceof ApiError && e.status === 400);
      })
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

      {/* Optional: subscribe to the সূচি from Google Calendar. One-way, read-only. */}
      {feedUrl && (
        <Paper elevation={0} sx={{ p: 2, mb: 2, borderRadius: '14px', border: (t) => `1px solid ${t.palette.divider}` }}>
          <Typography sx={{ fontWeight: 800, mb: 0.5 }}>{S.appointment.gcalTitle}</Typography>
          <Typography sx={{ fontSize: 13, color: 'text.secondary', mb: 1.5 }}>{S.appointment.gcalHint}</Typography>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
            <TextField value={feedUrl} size="small" fullWidth slotProps={{ htmlInput: { readOnly: true } }} />
            <Button
              variant="outlined"
              startIcon={<ContentCopyRoundedIcon />}
              onClick={() => {
                void navigator.clipboard.writeText(feedUrl);
                setCopied(true);
              }}
              sx={{ flexShrink: 0 }}
            >
              {copied ? S.appointment.gcalCopied : S.appointment.gcalCopy}
            </Button>
          </Stack>
        </Paper>
      )}

      {loading && <LoadingState />}
      {!loading && needsUpazila && (
        <EmptyState
          title={S.appointment.schedulePickUpazila}
          helper={S.appointment.schedulePickUpazilaHelp}
          icon={<ApartmentRoundedIcon />}
        />
      )}
      {!loading && !needsUpazila && rows.length === 0 && <EmptyState title={S.appointment.scheduleEmpty} />}

      <Stack spacing={2.5} sx={{ mt: 1 }}>
        {Object.entries(groups).map(([date, items]) => (
          <Box key={date}>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
              <EventRoundedIcon sx={{ color: 'primary.main' }} />
              <Typography sx={{ fontWeight: 800 }}>{bnDate(date)}</Typography>
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
                        <Typography sx={{ fontSize: 13.5 }}>{bnTime(a.appointment_time)}</Typography>
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

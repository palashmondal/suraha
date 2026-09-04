import { useEffect, useState } from 'react';
import { Alert, Box, Button, IconButton, Paper, Stack, Typography } from '@mui/material';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import EventAvailableRoundedIcon from '@mui/icons-material/EventAvailableRounded';
import ReportProblemOutlinedIcon from '@mui/icons-material/ReportProblemOutlined';
import { useNavigate, useParams } from 'react-router-dom';
import { bnStrings as S } from '../../i18n';
import { bn, bnDate, bnTime } from '../../utils/bnNum';
import SectionTitle from '../../components/SectionTitle';
import DetailRow from '../../components/DetailRow';
import SummaryPanel from '../../components/SummaryPanel';
import TrackingCard from '../../components/TrackingCard';
import StatusPill from '../../components/StatusPill';
import AppDialog from '../../components/AppDialog';
import NotesPanel from '../../components/NotesPanel';
import { ApiError } from '../../api/client';
import { DateField, FormField } from '../../components/form/FormFields';
import PhoneLink from '../../components/PhoneLink';
import { useAuth } from '../../auth/AuthContext';
import {
  getAppointment, approveAppointment, rejectAppointment, addAppointmentNote, deleteAppointmentNote,
  googleCalendarUrl,
  type Appointment,
} from '../../api/appointment';

export default function AppointmentDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [a, setA] = useState<Appointment | null>(null);
  const [dlg, setDlg] = useState<null | 'approve' | 'reject'>(null);
  const [flash, setFlash] = useState<string | null>(null);

  const load = () => { if (id) getAppointment(id).then((r) => setA(r.data)).catch(() => setA(null)); };
  useEffect(load, [id]);

  if (!a) return null;

  const isManager = user?.role === 'uno' || user?.role === 'seal_admin';
  const decided = a.status === 'approved' || a.status === 'rejected'; // done once decided
  const showNote = !!a.decision_note && a.status !== 'rejected';
  const done = () => { setDlg(null); setFlash(S.appointment.done); load(); };

  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 320px' }, gap: 3, alignItems: 'start' }}>
      <Box sx={{ display: 'grid', gap: 2 }}>
        <Paper elevation={0} sx={{ borderRadius: '16px', p: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
          <IconButton onClick={() => navigate('/app/appointment')}><ArrowBackRoundedIcon /></IconButton>
          <Typography sx={{ fontSize: 18, fontWeight: 700, flex: 1 }}>{S.appointment.detailTitle} — {a.applicant_name}</Typography>
          <StatusPill label={a.status_label} tone={a.status_tone} />
        </Paper>

        {flash && <Alert severity="success" onClose={() => setFlash(null)}>{flash}</Alert>}

        <Paper elevation={0} sx={{ borderRadius: '16px', p: 2.5 }}>
          <SectionTitle>{S.appointment.secApplicant}</SectionTitle>
          {/* Paired side by side like the অভিযোগ detail page; dividers off, they would cut
              across each pair. */}
          <Box sx={{ mt: 1, display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, columnGap: 3 }}>
            <DetailRow label={S.appointment.fName} value={a.applicant_name} divider={false} />
            <DetailRow label={S.appointment.fMobile} value={<PhoneLink phone={a.mobile} />} divider={false} />
            <DetailRow label={S.appointment.fUnion} value={a.union ?? '—'} divider={false} />
            <DetailRow label={S.appointment.fWard} value={a.ward_no ? bn(a.ward_no) : '—'} divider={false} />
            <DetailRow label={S.appointment.fAddress} value={a.address ?? '—'} divider={false} />
          </Box>
        </Paper>

        <Paper elevation={0} sx={{ borderRadius: '16px', p: 2.5 }}>
          <SectionTitle>{S.appointment.secRequest}</SectionTitle>
          <Box sx={{ mt: 1 }}>
            <DetailRow label={S.appointment.fPurpose} value={a.purpose} />
            <DetailRow label={decided ? S.appointment.confirmDate : S.appointment.proposedDate} value={a.appointment_date ? bnDate(a.appointment_date) : '—'} />
            <DetailRow label={decided ? S.appointment.confirmTime : S.appointment.proposedTime} value={bnTime(a.appointment_time) || '—'} />
            {/* A rejection's note has its own panel on the right; don't say it twice. */}
            <DetailRow label={S.appointment.fDesc} value={a.description ?? '—'} divider={showNote} />
            {showNote && <DetailRow label={S.appointment.decision} value={a.decision_note!} divider={false} />}
          </Box>
        </Paper>
      </Box>

      {/* Dropped clear of the back/title bar so the panel starts level with the আবেদনকারী card,
          not with the header above it. */}
      <Box sx={{ position: 'sticky', top: 16, mt: { md: 9 } }}>
        <TrackingCard token={a.tracking_token} sx={{ mb: 2 }} />

        <SummaryPanel
          title={a.applicant_name}
          lines={[
            { label: decided ? S.appointment.confirmDate : S.appointment.proposedDate, value: a.appointment_date ? bnDate(a.appointment_date) : '—' },
            { label: decided ? S.appointment.confirmTime : S.appointment.proposedTime, value: bnTime(a.appointment_time) || '—' },
          ]}
        >
          {isManager && !decided && (
            <Stack spacing={1.75}>
              <Button variant="contained" color="success" onClick={() => setDlg('approve')}>{S.appointment.approve}</Button>
              <Button variant="outlined" color="error" onClick={() => setDlg('reject')}>{S.appointment.reject}</Button>
              <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>{S.appointment.notifyHint}</Typography>
            </Stack>
          )}

          {a.status === 'approved' && googleCalendarUrl(a) && (
            <Button
              fullWidth
              variant="outlined"
              startIcon={<EventAvailableRoundedIcon />}
              href={googleCalendarUrl(a)!}
              target="_blank"
              rel="noopener"
            >
              {S.appointment.gcalAddOne}
            </Button>
          )}
        </SummaryPanel>

        {/* A nakoch decision is only useful with its reason, so it gets its own panel rather than
            a row buried in the request details. */}
        {a.status === 'rejected' && (
          <Paper
            elevation={0}
            sx={{
              mt: 2,
              p: 2.5,
              borderRadius: '16px',
              border: (t) => `1px solid ${t.palette.error.light}`,
            }}
          >
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
              <ReportProblemOutlinedIcon fontSize="small" color="error" />
              <Typography sx={{ fontWeight: 700, color: 'error.main' }}>
                {S.appointment.rejectedReason}
              </Typography>
            </Stack>
            <Typography
              sx={{
                fontSize: 14.5,
                whiteSpace: 'pre-wrap',
                color: a.decision_note ? 'text.primary' : 'text.secondary',
                fontStyle: a.decision_note ? 'normal' : 'italic',
              }}
            >
              {a.decision_note || S.appointment.noReason}
            </Typography>
          </Paper>
        )}

        <NotesPanel
          title={S.appointment.notesTitle}
          placeholder={S.appointment.notePlaceholder}
          notes={a.notes ?? []}
          canAdd={isManager}
          onAdd={(body) => addAppointmentNote(a.id, body)}
          onDelete={(noteId) => deleteAppointmentNote(a.id, noteId)}
          onChanged={setA}
        />
      </Box>

      <ActionDialogs which={dlg} appointment={a} onClose={() => setDlg(null)} onDone={done} />
    </Box>
  );
}

function ActionDialogs({
  which, appointment, onClose, onDone,
}: {
  which: null | 'approve' | 'reject';
  appointment: Appointment;
  onClose: () => void;
  onDone: () => void;
}) {
  const [note, setNote] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Prefill the accept dialog with the citizen's proposed time so the UNO can confirm or modify it.
  useEffect(() => {
    setNote('');
    setDate(appointment.appointment_date ?? '');
    setTime(appointment.appointment_time ? appointment.appointment_time.slice(0, 5) : '');
  }, [which, appointment]);

  if (!which) return null;

  const run = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      if (which === 'approve') {
        await approveAppointment(appointment.id, {
          appointment_date: date || undefined,
          appointment_time: time || undefined,
          decision_note: note || undefined,
        });
      } else {
        await rejectAppointment(appointment.id, note || undefined);
      }
      onDone();
    } catch (e) {
      // A rejected submission used to reject into nothing: the dialog stayed open, unchanged and
      // unexplained, which reads as a button that does not work.
      setErr(e instanceof ApiError ? (Object.values(e.errors ?? {})[0]?.[0] ?? e.message) : S.auth.genericError);
    } finally {
      setBusy(false);
    }
  };

  const titles: Record<string, string> = { approve: S.appointment.approve, reject: S.appointment.reject };

  return (
    <AppDialog open title={titles[which]} onClose={onClose} onSubmit={run} submitting={busy} maxWidth="xs">
      {err && <Alert severity="error">{err}</Alert>}
      {which === 'approve' && (
        <>
          <DateField label={S.appointment.confirmDate} value={date} onChange={setDate} />
          <FormField label={S.appointment.confirmTime} value={time} onChange={setTime} type="time" />
        </>
      )}
      <FormField label={S.appointment.decisionNote} value={note} onChange={setNote} multiline rows={3} />
      <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>{S.appointment.notifyHint}</Typography>
    </AppDialog>
  );
}

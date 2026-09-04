import { useEffect, useState } from 'react';
import { Alert, Box, Button, IconButton, Paper, Stack, TextField, Tooltip, Typography } from '@mui/material';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import EventAvailableRoundedIcon from '@mui/icons-material/EventAvailableRounded';
import ReportProblemOutlinedIcon from '@mui/icons-material/ReportProblemOutlined';
import StickyNote2OutlinedIcon from '@mui/icons-material/StickyNote2Outlined';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import { useNavigate, useParams } from 'react-router-dom';
import { bnStrings as S } from '../../i18n';
import { bn, bnDate, bnTime } from '../../utils/bnNum';
import SectionTitle from '../../components/SectionTitle';
import DetailRow from '../../components/DetailRow';
import SummaryPanel from '../../components/SummaryPanel';
import StatusPill from '../../components/StatusPill';
import StatusTimeline from '../../components/StatusTimeline';
import AppDialog from '../../components/AppDialog';
import ConfirmDialog from '../../components/ConfirmDialog';
import { ApiError } from '../../api/client';
import { DateField, FormField } from '../../components/form/FormFields';
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
          <IconButton onClick={() => navigate('/appointment')}><ArrowBackRoundedIcon /></IconButton>
          <Typography sx={{ fontSize: 18, fontWeight: 700, flex: 1 }}>{S.appointment.detailTitle} — {a.applicant_name}</Typography>
          <StatusPill label={a.status_label} tone={a.status_tone} />
        </Paper>

        {flash && <Alert severity="success" onClose={() => setFlash(null)}>{flash}</Alert>}

        <Paper elevation={0} sx={{ borderRadius: '16px', p: 2.5 }}>
          <SectionTitle>{S.appointment.secApplicant}</SectionTitle>
          <Box sx={{ mt: 1 }}>
            <DetailRow label={S.appointment.fName} value={a.applicant_name} />
            <DetailRow label={S.appointment.fUnion} value={a.union ?? '—'} />
            <DetailRow label={S.appointment.fWard} value={a.ward_no ? bn(a.ward_no) : '—'} />
            <DetailRow label={S.appointment.fAddress} value={a.address ?? '—'} />
            <DetailRow label={S.appointment.fMobile} value={a.mobile ? bn(a.mobile) : '—'} divider={false} />
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

        <NotesPanel appointment={a} canAdd={isManager} onAdded={setA} />
      </Box>

      <ActionDialogs which={dlg} appointment={a} onClose={() => setDlg(null)} onDone={done} />
    </Box>
  );
}

/**
 * The UNO's running notes on a সাক্ষাৎকার — read as a dated timeline, appended to at any time.
 * Everyone who can open the appointment can read them; only the UNO / SEAL can add one.
 */
function NotesPanel({ appointment, canAdd, onAdded }: {
  appointment: Appointment;
  canAdd: boolean;
  onAdded: (a: Appointment) => void;
}) {
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [doomed, setDoomed] = useState<number | null>(null); // note awaiting delete confirmation
  const notes = appointment.notes ?? [];

  // A rejected save must say so. Without the catch the promise rejected into nothing: the button
  // appeared dead and the only trace was an unhandled rejection in the console. The text is kept
  // on failure so a retry does not mean retyping the note.
  const save = async () => {
    if (!body.trim()) return;
    setBusy(true);
    setErr(null);
    try {
      const r = await addAppointmentNote(appointment.id, body.trim());
      setBody('');
      onAdded(r.data);
    } catch (e) {
      setErr(e instanceof ApiError ? (Object.values(e.errors ?? {})[0]?.[0] ?? e.message) : S.auth.genericError);
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (doomed === null) return;
    setBusy(true);
    setErr(null);
    try {
      const r = await deleteAppointmentNote(appointment.id, doomed);
      setDoomed(null);
      onAdded(r.data);
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : S.auth.genericError);
      setDoomed(null);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Paper elevation={0} sx={{ mt: 2, p: 2.5, borderRadius: '16px' }}>
      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5 }}>
        <StickyNote2OutlinedIcon fontSize="small" sx={{ color: 'text.secondary' }} />
        <Typography sx={{ fontWeight: 700 }}>{S.appointment.notesTitle}</Typography>
      </Stack>

      {notes.length === 0 ? (
        <Typography sx={{ fontSize: 13.5, color: 'text.secondary', fontStyle: 'italic' }}>
          {S.appointment.notesEmpty}
        </Typography>
      ) : (
        <StatusTimeline
          nodes={notes.map((n) => ({
            key: String(n.id),
            label: n.body,
            timestamp: [bnDate(n.created_at), n.author].filter(Boolean).join(' • '),
            done: true,
            action: canAdd ? (
              <Tooltip title={S.appointment.noteDelete}>
                <IconButton
                  size="small"
                  color="error"
                  aria-label={S.appointment.noteDelete}
                  onClick={() => setDoomed(n.id)}
                  sx={{
                    border: (t) => `1px solid ${t.palette.error.main}`,
                    p: 0.375,
                    '&:hover': { bgcolor: 'error.main', color: 'error.contrastText' },
                  }}
                >
                  <CloseRoundedIcon sx={{ fontSize: 15 }} />
                </IconButton>
              </Tooltip>
            ) : undefined,
          }))}
        />
      )}

      {canAdd && (
        <Stack spacing={1} sx={{ mt: notes.length ? 2.5 : 1.5 }}>
          {err && <Alert severity="error" onClose={() => setErr(null)}>{err}</Alert>}
          <TextField
            multiline
            minRows={2}
            size="small"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder={S.appointment.notePlaceholder}
          />
          <Button
            variant="outlined"
            startIcon={<AddRoundedIcon />}
            disabled={busy || !body.trim()}
            onClick={() => void save()}
          >
            {S.appointment.noteAdd}
          </Button>
        </Stack>
      )}

      <ConfirmDialog
        open={doomed !== null}
        title={S.appointment.noteDelete}
        message={S.appointment.noteDeleteConfirm}
        confirmLabel={S.appointment.noteDeleteYes}
        destructive
        busy={busy}
        onConfirm={() => void remove()}
        onClose={() => setDoomed(null)}
      />
    </Paper>
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

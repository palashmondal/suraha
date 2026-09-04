import { useEffect, useState } from 'react';
import { Alert, Box, Button, IconButton, Paper, Stack, Tooltip, Typography } from '@mui/material';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import StarRoundedIcon from '@mui/icons-material/StarRounded';
import StarOutlineRoundedIcon from '@mui/icons-material/StarOutlineRounded';
import { useNavigate, useParams } from 'react-router-dom';
import { bnStrings as S } from '../../i18n';
import { bn, bnDate } from '../../utils/bnNum';
import DetailRow from '../../components/DetailRow';
import SectionTitle from '../../components/SectionTitle';
import StatusPill from '../../components/StatusPill';
import SummaryPanel from '../../components/SummaryPanel';
import TrackingCard from '../../components/TrackingCard';
import AppDialog from '../../components/AppDialog';
import NotesPanel from '../../components/NotesPanel';
import AttachmentGallery from '../../components/AttachmentGallery';
import { FormField } from '../../components/form/FormFields';
import PhoneLink from '../../components/PhoneLink';
import { ApiError } from '../../api/client';
import { useAuth } from '../../auth/AuthContext';
import {
  approveAssistance, getAssistance, rejectAssistance, addAssistanceNote, deleteAssistanceNote,
  setAssistanceImportant, type Assistance,
} from '../../api/assistance';

type Dlg = null | 'approve' | 'reject';

export default function AssistanceDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [a, setA] = useState<Assistance | null>(null);
  const [dlg, setDlg] = useState<Dlg>(null);
  const [flash, setFlash] = useState<string | null>(null);

  const isManager = user?.role === 'uno' || user?.role === 'seal_admin';

  const [marking, setMarking] = useState(false);

  const load = () => { if (id) getAssistance(id).then((r) => setA(r.data)).catch(() => setA(null)); };
  useEffect(load, [id]);

  if (!a) return null;

  const toggleImportant = async () => {
    setMarking(true);
    try {
      const r = await setAssistanceImportant(a.id, !a.is_important);
      setA(r.data);
    } catch {
      /* the mark is a convenience; a failed toggle leaves the page as it was */
    } finally {
      setMarking(false);
    }
  };

  const taka = (v: number | null) => (v == null ? '—' : `${bn(v)} ${S.assistance.taka}`);

  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 340px' }, gap: 3, alignItems: 'start' }}>
      <Box sx={{ display: 'grid', gap: 2 }}>
        <Paper elevation={0} sx={{ borderRadius: '16px', p: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
          <IconButton onClick={() => navigate('/app/humanitarian')}><ArrowBackRoundedIcon /></IconButton>
          <Typography sx={{ fontSize: 18, fontWeight: 700, flex: 1 }}>{a.title}</Typography>
          {/* The mark is the UNO's; everyone else sees whether it is set, but only as an icon. */}
          {(isManager || a.is_important) && (
            <Tooltip title={a.is_important ? S.assistance.unmarkImportant : S.assistance.markImportant}>
              <span>
                <IconButton
                  aria-label={a.is_important ? S.assistance.unmarkImportant : S.assistance.markImportant}
                  disabled={!isManager || marking}
                  onClick={() => void toggleImportant()}
                >
                  {a.is_important
                    ? <StarRoundedIcon sx={{ color: 'warning.main' }} />
                    : <StarOutlineRoundedIcon />}
                </IconButton>
              </span>
            </Tooltip>
          )}
          <StatusPill label={a.status_label} tone={a.status_tone} />
        </Paper>

        {flash && <Alert severity="success" onClose={() => setFlash(null)}>{flash}</Alert>}

        <Paper elevation={0} sx={{ borderRadius: '16px', p: 2.5 }}>
          <SectionTitle>{S.assistance.secApplicant}</SectionTitle>
          {/* Paired side by side like the অভিযোগ detail page; dividers off, they would cut
              across each pair. */}
          <Box sx={{ mt: 1, display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, columnGap: 3 }}>
            <DetailRow label={S.assistance.fName} value={a.applicant_name} divider={false} />
            <DetailRow label={S.assistance.fMobile} value={<PhoneLink phone={a.mobile} />} divider={false} />
            <DetailRow label={S.assistance.fNid} value={a.nid ? bn(a.nid) : '—'} divider={false} />
            <DetailRow label={S.assistance.fUnion} value={a.union ?? '—'} divider={false} />
            <DetailRow label={S.assistance.fWard} value={a.ward_no ? bn(a.ward_no) : '—'} divider={false} />
            <DetailRow label={S.assistance.fAddress} value={a.address ?? '—'} divider={false} />
          </Box>
        </Paper>

        <Paper elevation={0} sx={{ borderRadius: '16px', p: 2.5 }}>
          <SectionTitle>{S.assistance.secRequest}</SectionTitle>
          <Box sx={{ mt: 1.5 }}>
            <DetailRow label={S.assistance.fKind} value={a.kind_label} />
            <DetailRow label={S.assistance.colDate} value={a.created_at ? bnDate(a.created_at) : '—'} />
            <DetailRow label={S.assistance.amountRequested} value={taka(a.amount_requested)} />
            <DetailRow label={S.assistance.decisionNote} value={a.decision_note ?? '—'} />
            <DetailRow label={S.assistance.fDesc} value={a.description ?? '—'} divider={false} />
          </Box>
        </Paper>

        {(a.attachments?.length ?? 0) > 0 && (
          <Paper elevation={0} sx={{ borderRadius: '16px', p: 2.5 }}>
            <SectionTitle>{S.attachments.title}</SectionTitle>
            <Box sx={{ mt: 1.5 }}>
              <AttachmentGallery attachments={a.attachments!} />
            </Box>
          </Paper>
        )}
      </Box>

      <Box sx={{ position: 'sticky', top: 16 }}>
        <TrackingCard token={a.tracking_token} sx={{ mb: 2 }} />

        <SummaryPanel
          title={a.applicant_name}
          lines={[
            { label: S.assistance.colKind, value: a.kind_label },
            { label: S.assistance.amountRequested, value: taka(a.amount_requested) },
          ]}
        >
          {isManager && a.status === 'pending' && (
            <Stack spacing={1}>
              <Button variant="contained" onClick={() => setDlg('approve')}>{S.assistance.approve}</Button>
              <Button variant="outlined" color="error" onClick={() => setDlg('reject')}>{S.assistance.reject}</Button>
            </Stack>
          )}
        </SummaryPanel>

        <NotesPanel
          title={S.assistance.notesTitle}
          placeholder={S.assistance.notePlaceholder}
          notes={a.notes ?? []}
          canAdd={isManager}
          onAdd={(body) => addAssistanceNote(a.id, body)}
          onDelete={(noteId) => deleteAssistanceNote(a.id, noteId)}
          onChanged={setA}
        />
      </Box>

      <DecisionDialog
        which={dlg}
        assistance={a}
        onClose={() => setDlg(null)}
        onDone={() => { setDlg(null); setFlash(S.assistance.done); load(); }}
      />
    </Box>
  );
}

function DecisionDialog({ which, assistance, onClose, onDone }: {
  which: Dlg;
  assistance: Assistance;
  onClose: () => void;
  onDone: () => void;
}) {
  // Pre-fill with what was asked for: approving the requested figure is the common case, and
  // typing it again invites a typo.
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setAmount(assistance.amount_requested ? String(assistance.amount_requested) : '');
    setNote('');
    setErr(null);
  }, [which, assistance.amount_requested]);

  if (!which) return null;

  const run = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      if (which === 'approve') {
        await approveAssistance(assistance.id, {
          amount_approved: amount ? Number(amount) : undefined,
          decision_note: note || undefined,
        });
      } else {
        await rejectAssistance(assistance.id, note || undefined);
      }
      onDone();
    } catch (e) {
      setErr(e instanceof ApiError ? (Object.values(e.errors ?? {})[0]?.[0] ?? e.message) : S.auth.genericError);
    } finally {
      setBusy(false);
    }
  };

  return (
    <AppDialog
      open
      title={which === 'approve' ? S.assistance.approveTitle : S.assistance.rejectTitle}
      onClose={onClose}
      onSubmit={run}
      submitting={busy}
      maxWidth="xs"
    >
      {err && <Alert severity="error">{err}</Alert>}
      {which === 'approve' && (
        <FormField label={S.assistance.fApproved} value={amount} onChange={setAmount} type="number" />
      )}
      <FormField label={S.assistance.decisionNote} value={note} onChange={setNote} multiline rows={3} />
    </AppDialog>
  );
}

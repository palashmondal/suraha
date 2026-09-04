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
import AttachmentGallery from '../../components/AttachmentGallery';
import NotesPanel from '../../components/NotesPanel';
import { FormField } from '../../components/form/FormFields';
import PhoneLink from '../../components/PhoneLink';
import { ApiError } from '../../api/client';
import { useAuth } from '../../auth/AuthContext';
import {
  acceptSuggestion, getSuggestion, rejectSuggestion, setSuggestionImportant,
  addSuggestionNote, deleteSuggestionNote, type Suggestion,
} from '../../api/suggestion';

type Dlg = null | 'accept' | 'reject';

export default function SuggestionDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [s, setS] = useState<Suggestion | null>(null);
  const [dlg, setDlg] = useState<Dlg>(null);
  const [flash, setFlash] = useState<string | null>(null);

  const isManager = user?.role === 'uno' || user?.role === 'seal_admin';

  const [marking, setMarking] = useState(false);

  const load = () => { if (id) getSuggestion(id).then((r) => setS(r.data)).catch(() => setS(null)); };
  useEffect(load, [id]);

  if (!s) return null;

  const toggleImportant = async () => {
    setMarking(true);
    try {
      const r = await setSuggestionImportant(s.id, !s.is_important);
      setS(r.data);
    } catch {
      setFlash(null); // the mark is a convenience; a failed toggle leaves the page as it was
    } finally {
      setMarking(false);
    }
  };

  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 340px' }, gap: 3, alignItems: 'start' }}>
      <Box sx={{ display: 'grid', gap: 2 }}>
        <Paper elevation={0} sx={{ borderRadius: '16px', p: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
          <IconButton onClick={() => navigate('/app/advice')}><ArrowBackRoundedIcon /></IconButton>
          <Typography sx={{ fontSize: 18, fontWeight: 700, flex: 1 }}>{s.title}</Typography>
          {/* The mark is the UNO's; everyone else sees whether it is set, but only as an icon. */}
          {(isManager || s.is_important) && (
            <Tooltip title={s.is_important ? S.suggestion.unmarkImportant : S.suggestion.markImportant}>
              <span>
                <IconButton
                  aria-label={s.is_important ? S.suggestion.unmarkImportant : S.suggestion.markImportant}
                  disabled={!isManager || marking}
                  onClick={() => void toggleImportant()}
                >
                  {s.is_important
                    ? <StarRoundedIcon sx={{ color: 'warning.main' }} />
                    : <StarOutlineRoundedIcon />}
                </IconButton>
              </span>
            </Tooltip>
          )}
          <StatusPill label={s.status_label} tone={s.status_tone} />
        </Paper>

        {flash && <Alert severity="success" onClose={() => setFlash(null)}>{flash}</Alert>}
        {s.is_confidential && <Alert severity="info">{S.suggestion.confidentialNote}</Alert>}

        {/* Only shown when there is an identity to show — a confidential suggestion has none. */}
        {!s.is_confidential && (
          <Paper elevation={0} sx={{ borderRadius: '16px', p: 2.5 }}>
            <SectionTitle>{S.suggestion.secGiver}</SectionTitle>
            {/* Paired side by side like the অভিযোগ detail page; dividers off, they would cut
                across each pair. */}
            <Box sx={{ mt: 1, display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, columnGap: 3 }}>
              <DetailRow label={S.suggestion.fName} value={s.applicant_name ?? '—'} divider={false} />
              <DetailRow label={S.suggestion.fMobile} value={<PhoneLink phone={s.mobile} />} divider={false} />
              <DetailRow label={S.suggestion.fUnion} value={s.union ?? '—'} divider={false} />
              <DetailRow label={S.suggestion.fWard} value={s.ward_no ? bn(s.ward_no) : '—'} divider={false} />
              <DetailRow label={S.suggestion.fAddress} value={s.address ?? '—'} divider={false} />
            </Box>
          </Paper>
        )}

        <Paper elevation={0} sx={{ borderRadius: '16px', p: 2.5 }}>
          <SectionTitle>{S.suggestion.secSuggestion}</SectionTitle>
          <Box sx={{ mt: 1.5 }}>
            <DetailRow label={S.suggestion.fKind} value={s.kind_label} />
            <DetailRow label={S.suggestion.colDate} value={s.created_at ? bnDate(s.created_at) : '—'} />
            <DetailRow label={S.suggestion.decisionNote} value={s.decision_note ?? '—'} />
            <DetailRow label={S.suggestion.fDesc} value={s.description} divider={false} />
          </Box>
        </Paper>

        {(s.attachments?.length ?? 0) > 0 && (
          <Paper elevation={0} sx={{ borderRadius: '16px', p: 2.5 }}>
            <SectionTitle>{S.attachments.title}</SectionTitle>
            <Box sx={{ mt: 1.5 }}>
              <AttachmentGallery attachments={s.attachments!} />
            </Box>
          </Paper>
        )}
      </Box>

      <Box sx={{ position: 'sticky', top: 16 }}>
        <TrackingCard token={s.tracking_token} sx={{ mb: 2 }} />

        <SummaryPanel
          title={s.is_confidential ? S.suggestion.confidential : (s.applicant_name ?? '—')}
          lines={[
            { label: S.suggestion.colKind, value: s.kind_label },
          ]}
        >
          {isManager && s.status === 'pending' && (
            <Stack spacing={1}>
              <Button variant="contained" onClick={() => setDlg('accept')}>{S.suggestion.accept}</Button>
              <Button variant="outlined" color="error" onClick={() => setDlg('reject')}>{S.suggestion.reject}</Button>
            </Stack>
          )}
        </SummaryPanel>

        <NotesPanel
          title={S.suggestion.notesTitle}
          placeholder={S.suggestion.notePlaceholder}
          notes={s.notes ?? []}
          canAdd={isManager}
          onAdd={(body) => addSuggestionNote(s.id, body)}
          onDelete={(noteId) => deleteSuggestionNote(s.id, noteId)}
          onChanged={setS}
        />
      </Box>

      <DecisionDialog
        which={dlg}
        suggestion={s}
        onClose={() => setDlg(null)}
        onDone={() => { setDlg(null); setFlash(S.suggestion.done); load(); }}
      />
    </Box>
  );
}

function DecisionDialog({ which, suggestion, onClose, onDone }: {
  which: Dlg;
  suggestion: Suggestion;
  onClose: () => void;
  onDone: () => void;
}) {
  const [note, setNote] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => { setNote(''); setErr(null); }, [which]);

  if (!which) return null;

  const run = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      if (which === 'accept') await acceptSuggestion(suggestion.id, note || undefined);
      else await rejectSuggestion(suggestion.id, note || undefined);
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
      title={which === 'accept' ? S.suggestion.acceptTitle : S.suggestion.rejectTitle}
      onClose={onClose}
      onSubmit={run}
      submitting={busy}
      maxWidth="xs"
    >
      {err && <Alert severity="error">{err}</Alert>}
      <FormField label={S.suggestion.decisionNote} value={note} onChange={setNote} multiline rows={3} />
    </AppDialog>
  );
}

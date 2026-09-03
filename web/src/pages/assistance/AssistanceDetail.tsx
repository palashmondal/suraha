import { useEffect, useState } from 'react';
import { Alert, Box, Button, IconButton, Paper, Stack, Typography } from '@mui/material';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import { useNavigate, useParams } from 'react-router-dom';
import { bnStrings as S } from '../../i18n';
import { bn, bnDate } from '../../utils/bnNum';
import DetailRow from '../../components/DetailRow';
import SectionTitle from '../../components/SectionTitle';
import StatusPill from '../../components/StatusPill';
import SummaryPanel from '../../components/SummaryPanel';
import AppDialog from '../../components/AppDialog';
import { FormField } from '../../components/form/FormFields';
import { ApiError } from '../../api/client';
import { useAuth } from '../../auth/AuthContext';
import { approveAssistance, getAssistance, rejectAssistance, type Assistance } from '../../api/assistance';

type Dlg = null | 'approve' | 'reject';

export default function AssistanceDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [a, setA] = useState<Assistance | null>(null);
  const [dlg, setDlg] = useState<Dlg>(null);
  const [flash, setFlash] = useState<string | null>(null);

  const isManager = user?.role === 'uno' || user?.role === 'seal_admin';

  const load = () => { if (id) getAssistance(id).then((r) => setA(r.data)).catch(() => setA(null)); };
  useEffect(load, [id]);

  if (!a) return null;

  const taka = (v: number | null) => (v == null ? '—' : `${bn(v)} ${S.assistance.taka}`);

  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 340px' }, gap: 3, alignItems: 'start' }}>
      <Box sx={{ display: 'grid', gap: 2 }}>
        <Paper elevation={0} sx={{ borderRadius: '16px', p: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
          <IconButton onClick={() => navigate('/humanitarian')}><ArrowBackRoundedIcon /></IconButton>
          <Typography sx={{ fontSize: 18, fontWeight: 700, flex: 1 }}>{a.title}</Typography>
          <StatusPill label={a.status_label} tone={a.status_tone} />
        </Paper>

        {flash && <Alert severity="success" onClose={() => setFlash(null)}>{flash}</Alert>}

        <Paper elevation={0} sx={{ borderRadius: '16px', p: 2.5 }}>
          <SectionTitle>{S.assistance.secApplicant}</SectionTitle>
          <Box sx={{ mt: 1.5 }}>
            <DetailRow label={S.assistance.fName} value={a.applicant_name} />
            <DetailRow label={S.assistance.fMobile} value={a.mobile ? bn(a.mobile) : '—'} />
            <DetailRow label={S.assistance.fNid} value={a.nid ? bn(a.nid) : '—'} />
            <DetailRow label={S.assistance.fUnion} value={a.union ?? '—'} />
            <DetailRow label={S.assistance.fWard} value={a.ward_no ? bn(a.ward_no) : '—'} />
            <DetailRow label={S.assistance.fAddress} value={a.address ?? '—'} divider={false} />
          </Box>
        </Paper>

        <Paper elevation={0} sx={{ borderRadius: '16px', p: 2.5 }}>
          <SectionTitle>{S.assistance.secRequest}</SectionTitle>
          <Box sx={{ mt: 1.5 }}>
            <DetailRow label={S.assistance.fKind} value={a.kind_label} />
            <DetailRow label={S.assistance.colDate} value={a.created_at ? bnDate(a.created_at) : '—'} />
            <DetailRow label={S.assistance.amountRequested} value={taka(a.amount_requested)} />
            <DetailRow label={S.assistance.amountApproved} value={taka(a.amount_approved)} />
            <DetailRow label={S.assistance.decisionNote} value={a.decision_note ?? '—'} />
            <DetailRow label={S.assistance.fDesc} value={a.description ?? '—'} divider={false} />
          </Box>
        </Paper>
      </Box>

      <Box sx={{ position: 'sticky', top: 16 }}>
        <SummaryPanel
          title={a.applicant_name}
          lines={[
            { label: S.assistance.colKind, value: a.kind_label },
            { label: S.assistance.amountRequested, value: taka(a.amount_requested) },
            { label: S.assistance.colToken, value: a.tracking_token ?? '—' },
          ]}
        >
          {isManager && a.status === 'pending' && (
            <Stack spacing={1}>
              <Button variant="contained" onClick={() => setDlg('approve')}>{S.assistance.approve}</Button>
              <Button variant="outlined" color="error" onClick={() => setDlg('reject')}>{S.assistance.reject}</Button>
            </Stack>
          )}
        </SummaryPanel>
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

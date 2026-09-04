import { useEffect, useState } from 'react';
import { Alert, Box, Button, Container, MenuItem, Paper, TextField } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { bnStrings as S } from '../../i18n';
import PublicLayout from './PublicLayout';
import PageHero from './PageHero';
import VolunteerActivismOutlinedIcon from '@mui/icons-material/VolunteerActivismOutlined';
import { FormField, SelectField } from '../../components/form/FormFields';
import { useUnionOptions } from '../../tenant/useUnionOptions';
import { api, ApiError } from '../../api/client';
import { type Assistance, type Kind } from '../../api/assistance';
import { useSync } from '../../offline/SyncProvider';
import { uploadAttachments } from '../../api/attachments';
import AttachmentPicker from '../../components/form/AttachmentPicker';
import SubmittedCard from './SubmittedCard';
import QueuedOfflineCard from './QueuedOfflineCard';

/** মানবিক সহায়তার আবেদন — filed by a logged-in citizen; returns a tracking token. */
export default function ApplyAssistance() {
  const navigate = useNavigate();
  const unions = useUnionOptions();
  const [kinds, setKinds] = useState<Kind[]>([]);
  const [f, setF] = useState<Record<string, string>>({});
  const { submit: submitOrQueue } = useSync();
  const [token, setToken] = useState<string | null>(null);
  const [queued, setQueued] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [warn, setWarn] = useState<string | null>(null);
  const set = (k: string) => (v: string) => setF((s) => ({ ...s, [k]: v }));

  // The category list comes from the API so the form cannot drift from what the server accepts.
  useEffect(() => {
    api<{ kinds: Kind[] }>('/assistances')
      .then((r) => setKinds(r.kinds))
      .catch(() => setKinds([]));
  }, []);

  // Files go up after the record exists, so the offline outbox stays plain JSON. A failed upload
  // must not read as a failed application — the submission is already filed and tracked.
  const sendFiles = async (resource: 'complaints' | 'assistances' | 'suggestions', id: number) => {
    if (files.length === 0) return;
    try {
      await uploadAttachments(resource, id, files);
    } catch {
      setWarn(S.attachments.uploadFailed);
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      const res = await submitOrQueue({
        kind: 'assistance.create',
        endpoint: '/assistances',
        method: 'POST',
        label: f.title,
        payload: {
          applicant_name: f.applicant_name,
          kind: f.kind,
          title: f.title,
          description: f.description || undefined,
          union_id: f.union_id ? Number(f.union_id) : undefined,
          ward_no: f.ward_no ? Number(f.ward_no) : undefined,
          address: f.address || undefined,
          mobile: f.mobile || undefined,
          nid: f.nid || undefined,
          amount_requested: f.amount_requested ? Number(f.amount_requested) : undefined,
        },
      });
      if (res.queued) {
        setQueued(true);
      } else {
        const created = (res.data as { data: Assistance }).data;
        await sendFiles('assistances', created.id);
        setToken(created.tracking_token);
      }
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) navigate('/login');
      else setErr(e instanceof ApiError ? (Object.values(e.errors ?? {})[0]?.[0] ?? e.message) : S.auth.genericError);
    } finally {
      setBusy(false);
    }
  };

  return (
    <PublicLayout>
      <PageHero title={S.assistance.submitTitle} subtitle={S.assistance.submitLead} icon={<VolunteerActivismOutlinedIcon />} />
      <Container maxWidth="sm" sx={{ py: { xs: 4, md: 6 } }}>
        {queued ? (
          <QueuedOfflineCard />
        ) : token ? (
          <>
            {warn && <Alert severity="warning" sx={{ mb: 2 }}>{warn}</Alert>}
            <SubmittedCard token={token} />
          </>
        ) : (
          <Paper component="form" onSubmit={submit} elevation={0} sx={{ display: 'grid', gap: 2, background: 'transparent' }}>
            {err && <Alert severity="error">{err}</Alert>}
            <FormField label={S.assistance.fName} value={f.applicant_name ?? ''} onChange={set('applicant_name')} />
            <TextField
              select
              label={S.assistance.fKind}
              value={f.kind ?? ''}
              onChange={(e) => set('kind')(e.target.value)}
              fullWidth
            >
              {kinds.map((k) => <MenuItem key={k.value} value={k.value}>{k.label}</MenuItem>)}
            </TextField>
            <FormField label={S.assistance.fTitle} value={f.title ?? ''} onChange={set('title')} />
            <FormField label={S.assistance.fDesc} value={f.description ?? ''} onChange={set('description')} multiline rows={4} />
            <FormField label={S.assistance.fAmount} value={f.amount_requested ?? ''} onChange={set('amount_requested')} type="number" />
            <SelectField label={S.assistance.fUnion} value={f.union_id ?? ''} onChange={set('union_id')} options={unions} placeholder="নির্বাচন করুন" />
            <FormField label={S.assistance.fWard} value={f.ward_no ?? ''} onChange={set('ward_no')} type="number" />
            <FormField label={S.assistance.fAddress} value={f.address ?? ''} onChange={set('address')} />
            <FormField label={S.assistance.fMobile} value={f.mobile ?? ''} onChange={set('mobile')} placeholder="01XXXXXXXXX" />
            <FormField label={S.assistance.fNid} value={f.nid ?? ''} onChange={set('nid')} />
            <AttachmentPicker files={files} onChange={setFiles} />
            <Box>
              <Button type="submit" variant="contained" disabled={busy}>{S.assistance.submit}</Button>
            </Box>
          </Paper>
        )}
      </Container>
    </PublicLayout>
  );
}

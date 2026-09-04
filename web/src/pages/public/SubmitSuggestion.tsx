import { useEffect, useState } from 'react';
import {
  Alert, Box, Button, Container, FormControlLabel, MenuItem, Paper, Switch, TextField,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { bnStrings as S } from '../../i18n';
import PublicLayout from './PublicLayout';
import PageHero from './PageHero';
import ForumOutlinedIcon from '@mui/icons-material/ForumOutlined';
import { FormField, SelectField } from '../../components/form/FormFields';
import { useUnionOptions } from '../../tenant/useUnionOptions';
import { api, ApiError } from '../../api/client';
import type { Suggestion } from '../../api/suggestion';
import type { Kind } from '../../api/assistance';
import { useSync } from '../../offline/SyncProvider';
import { uploadAttachments } from '../../api/attachments';
import AttachmentPicker from '../../components/form/AttachmentPicker';
import SubmittedCard from './SubmittedCard';
import QueuedOfflineCard from './QueuedOfflineCard';

/** নাগরিক পরামর্শ — a citizen's proposal to the UNO, optionally confidential. */
export default function SubmitSuggestion() {
  const navigate = useNavigate();
  const unions = useUnionOptions();
  const [kinds, setKinds] = useState<Kind[]>([]);
  const [f, setF] = useState<Record<string, string>>({});
  const [confidential, setConfidential] = useState(false);
  const { submit: submitOrQueue } = useSync();
  const [token, setToken] = useState<string | null>(null);
  const [queued, setQueued] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [warn, setWarn] = useState<string | null>(null);
  const set = (k: string) => (v: string) => setF((s) => ({ ...s, [k]: v }));

  useEffect(() => {
    api<{ kinds: Kind[] }>('/suggestions')
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
        kind: 'suggestion.create',
        endpoint: '/suggestions',
        method: 'POST',
        label: f.title,
        payload: {
          applicant_name: f.applicant_name,
          kind: f.kind,
          title: f.title,
          description: f.description,
          is_confidential: confidential,
          union_id: f.union_id ? Number(f.union_id) : undefined,
          ward_no: f.ward_no ? Number(f.ward_no) : undefined,
          address: f.address || undefined,
          mobile: f.mobile || undefined,
        },
      });
      if (res.queued) {
        setQueued(true);
      } else {
        const created = (res.data as { data: Suggestion }).data;
        await sendFiles('suggestions', created.id);
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
      <PageHero title={S.suggestion.submitTitle} subtitle={S.suggestion.submitLead} icon={<ForumOutlinedIcon />} />
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
            <TextField
              select
              label={S.suggestion.fKind}
              value={f.kind ?? ''}
              onChange={(e) => set('kind')(e.target.value)}
              fullWidth
            >
              {kinds.map((k) => <MenuItem key={k.value} value={k.value}>{k.label}</MenuItem>)}
            </TextField>
            <FormField label={S.suggestion.fTitle} value={f.title ?? ''} onChange={set('title')} />
            <FormField label={S.suggestion.fDesc} value={f.description ?? ''} onChange={set('description')} multiline rows={5} />

            {/* Confidential is offered before the identity fields, so the choice is made before
                the name is typed rather than after. */}
            <FormControlLabel
              control={<Switch checked={confidential} onChange={(e) => setConfidential(e.target.checked)} />}
              label={S.suggestion.fConfidential}
            />

            <FormField label={S.suggestion.fName} value={f.applicant_name ?? ''} onChange={set('applicant_name')} />
            <SelectField label={S.suggestion.fUnion} value={f.union_id ?? ''} onChange={set('union_id')} options={unions} placeholder="নির্বাচন করুন" />
            <FormField label={S.suggestion.fWard} value={f.ward_no ?? ''} onChange={set('ward_no')} type="number" />
            <FormField label={S.suggestion.fAddress} value={f.address ?? ''} onChange={set('address')} />
            <FormField label={S.suggestion.fMobile} value={f.mobile ?? ''} onChange={set('mobile')} placeholder="01XXXXXXXXX" />
            <AttachmentPicker files={files} onChange={setFiles} />
            <Box>
              <Button type="submit" variant="contained" disabled={busy}>{S.suggestion.submit}</Button>
            </Box>
          </Paper>
        )}
      </Container>
    </PublicLayout>
  );
}

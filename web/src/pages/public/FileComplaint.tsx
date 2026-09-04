import { useState } from 'react';
import { Alert, Box, Button, Container, Paper, Typography } from '@mui/material';
import MyLocationRoundedIcon from '@mui/icons-material/MyLocationRounded';
import { useNavigate } from 'react-router-dom';
import { bnStrings as S } from '../../i18n';
import PublicLayout from './PublicLayout';
import FieldCard from '../../components/form/FieldCard';
import { FormField, SelectField } from '../../components/form/FormFields';
import { useUnionOptions } from '../../tenant/useUnionOptions';
import { ApiError } from '../../api/client';
import type { Complaint } from '../../api/complaint';
import { useSync } from '../../offline/SyncProvider';
import { uploadAttachments } from '../../api/attachments';
import AttachmentPicker from '../../components/form/AttachmentPicker';
import SubmittedCard from './SubmittedCard';
import QueuedOfflineCard from './QueuedOfflineCard';

export default function FileComplaint() {
  const navigate = useNavigate();
  const [f, setF] = useState<Record<string, string>>({});
  const unions = useUnionOptions();
  const { submit: submitOrQueue } = useSync();
  const [token, setToken] = useState<string | null>(null);
  const [queued, setQueued] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [warn, setWarn] = useState<string | null>(null);
  const set = (k: string) => (v: string) => setF((s) => ({ ...s, [k]: v }));

  const track = () => navigator.geolocation?.getCurrentPosition((p) =>
    setF((s) => ({ ...s, latitude: String(p.coords.latitude), longitude: String(p.coords.longitude) })));

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
      // Submit-or-queue: reaches the server when online, otherwise stores in the offline outbox and
      // background-syncs on reconnect (SURAHA_BUILD_PROMPT §1.1(2)).
      const res = await submitOrQueue({
        kind: 'complaint.create',
        endpoint: '/complaints',
        method: 'POST',
        label: f.title,
        payload: {
          title: f.title,
          complainant_name: f.complainant_name,
          father_name: f.father_name || undefined,
          union_id: f.union_id ? Number(f.union_id) : undefined,
          ward_no: f.ward_no ? Number(f.ward_no) : undefined,
          address: f.address || undefined,
          latitude: f.latitude ? Number(f.latitude) : undefined,
          longitude: f.longitude ? Number(f.longitude) : undefined,
          mobile: f.mobile || undefined,
          description: f.description || undefined,
        },
      });
      if (res.queued) {
        setQueued(true);
      } else {
        const created = (res.data as { data: Complaint }).data;
        await sendFiles('complaints', created.id);
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
      <Container maxWidth="sm" sx={{ py: { xs: 4, md: 6 } }}>
        <Typography sx={{ fontSize: 26, fontWeight: 800, mb: 3 }}>{S.public.fileComplaintTitle}</Typography>
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
            <FormField label={S.complaint.fTitle} value={f.title ?? ''} onChange={set('title')} />
            <FormField label={S.complaint.fName} value={f.complainant_name ?? ''} onChange={set('complainant_name')} />
            <FormField label={S.complaint.fFather} value={f.father_name ?? ''} onChange={set('father_name')} />
            <SelectField label={S.complaint.fUnion} value={f.union_id ?? ''} onChange={set('union_id')} options={unions} placeholder="নির্বাচন করুন" />
            <FormField label={S.complaint.fWard} value={f.ward_no ?? ''} onChange={set('ward_no')} type="number" />
            <FormField label={S.complaint.fAddress} value={f.address ?? ''} onChange={set('address')} />
            <FieldCard label={S.complaint.fPlace} action={<Button size="small" startIcon={<MyLocationRoundedIcon />} onClick={track}>{S.common.track}</Button>}>
              <Typography sx={{ fontSize: 14, color: 'text.secondary' }}>{f.latitude ? `${f.latitude}, ${f.longitude}` : '—'}</Typography>
            </FieldCard>
            <FormField label={S.complaint.fMobile} value={f.mobile ?? ''} onChange={set('mobile')} placeholder="01XXXXXXXXX" />
            <FormField label={S.complaint.fDesc} value={f.description ?? ''} onChange={set('description')} multiline />
            <AttachmentPicker files={files} onChange={setFiles} />
            <Box><Button type="submit" variant="contained" size="large" disabled={busy}>{S.public.submit}</Button></Box>
          </Paper>
        )}
      </Container>
    </PublicLayout>
  );
}

import { useState } from 'react';
import { Alert, Box, Button, Container, Paper, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { bnStrings as S } from '../../i18n';
import PublicLayout from './PublicLayout';
import { FormField, SelectField, DateField, TimeField } from '../../components/form/FormFields';
import { useUnionOptions } from '../../tenant/useUnionOptions';
import { ApiError } from '../../api/client';
import type { Appointment } from '../../api/appointment';
import { useSync } from '../../offline/SyncProvider';
import SubmittedCard from './SubmittedCard';
import QueuedOfflineCard from './QueuedOfflineCard';

export default function BookAppointment() {
  const navigate = useNavigate();
  const [f, setF] = useState<Record<string, string>>({});
  const unions = useUnionOptions();
  const { submit: submitOrQueue } = useSync();
  const [token, setToken] = useState<string | null>(null);
  const [queued, setQueued] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const set = (k: string) => (v: string) => setF((s) => ({ ...s, [k]: v }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      const res = await submitOrQueue({
        kind: 'appointment.create',
        endpoint: '/appointments',
        method: 'POST',
        label: f.purpose,
        payload: {
          applicant_name: f.applicant_name,
          purpose: f.purpose,
          union_id: f.union_id ? Number(f.union_id) : undefined,
          ward_no: f.ward_no ? Number(f.ward_no) : undefined,
          address: f.address || undefined,
          mobile: f.mobile || undefined,
          description: f.description || undefined,
          appointment_date: f.appointment_date || undefined,
          appointment_time: f.appointment_time || undefined,
        },
      });
      if (res.queued) setQueued(true);
      else setToken((res.data as { data: Appointment }).data.tracking_token);
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
        <Typography sx={{ fontSize: 26, fontWeight: 800, mb: 3 }}>{S.public.bookAppointmentTitle}</Typography>
        {queued ? (
          <QueuedOfflineCard />
        ) : token ? (
          <SubmittedCard token={token} />
        ) : (
          <Paper component="form" onSubmit={submit} elevation={0} sx={{ display: 'grid', gap: 2, background: 'transparent' }}>
            {err && <Alert severity="error">{err}</Alert>}
            <FormField label={S.complaint.fName} value={f.applicant_name ?? ''} onChange={set('applicant_name')} />
            <FormField label={S.appointment.fPurpose} value={f.purpose ?? ''} onChange={set('purpose')} />
            <SelectField label={S.complaint.fUnion} value={f.union_id ?? ''} onChange={set('union_id')} options={unions} placeholder="নির্বাচন করুন" />
            <FormField label={S.complaint.fWard} value={f.ward_no ?? ''} onChange={set('ward_no')} type="number" />
            <FormField label={S.complaint.fAddress} value={f.address ?? ''} onChange={set('address')} />
            <FormField label={S.complaint.fMobile} value={f.mobile ?? ''} onChange={set('mobile')} placeholder="01XXXXXXXXX" />
            <DateField label={S.appointment.colDate} value={f.appointment_date ?? ''} onChange={set('appointment_date')} />
            <TimeField label={S.appointment.colTime} value={f.appointment_time ?? ''} onChange={set('appointment_time')} />
            <FormField label={S.complaint.fDesc} value={f.description ?? ''} onChange={set('description')} multiline />
            <Box><Button type="submit" variant="contained" size="large" disabled={busy}>{S.public.submit}</Button></Box>
          </Paper>
        )}
      </Container>
    </PublicLayout>
  );
}

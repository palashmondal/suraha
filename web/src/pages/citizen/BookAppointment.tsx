import { useState } from 'react';
import { Alert, Box, Button, Stack, TextField } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import SubPageHeader from './SubPageHeader';
import { bnStrings as S } from '../../i18n';
import { useAuth } from '../../auth/AuthContext';
import { useSync } from '../../offline/SyncProvider';

// Citizen books a UNO appointment (SURAHA_BUILD_PROMPT §8.3): reason + preferred date + contact.
export default function BookAppointment() {
  const nav = useNavigate();
  const { user } = useAuth();
  const { submit } = useSync();

  const [reason, setReason] = useState('');
  const [details, setDetails] = useState('');
  const [date, setDate] = useState('');
  const [mobile, setMobile] = useState(user?.mobile ?? '');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<'submitted' | 'queued' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await submit({
        kind: 'appointment.create',
        endpoint: '/appointments',
        method: 'POST',
        label: reason,
        payload: { reason, details, preferred_date: date, contact_mobile: mobile },
      });
      setResult(res.queued ? 'queued' : 'submitted');
      setTimeout(() => nav('/citizen/applications', { replace: true }), 1400);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'জমা দেওয়া যায়নি');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Box>
      <SubPageHeader title={S.citizen.bookAppointment} />
      {result ? (
        <Alert severity={result === 'queued' ? 'warning' : 'success'}>
          {result === 'queued' ? S.citizen.queued : S.citizen.submitted}
        </Alert>
      ) : (
        <Box component="form" onSubmit={onSubmit}>
          <Stack spacing={2}>
            {error ? <Alert severity="error">{error}</Alert> : null}
            <TextField label={S.citizen.reason} value={reason} onChange={(e) => setReason(e.target.value)} required fullWidth />
            <TextField label={S.citizen.description} value={details} onChange={(e) => setDetails(e.target.value)} fullWidth multiline minRows={3} />
            <TextField
              label={S.citizen.preferredDate}
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              fullWidth
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              label={S.citizen.contactMobile}
              value={mobile}
              onChange={(e) => setMobile(e.target.value.replace(/\D/g, '').slice(0, 11))}
              inputMode="numeric"
              required
              fullWidth
            />
            <Button type="submit" variant="contained" size="large" disabled={busy}>
              {S.citizen.submit}
            </Button>
          </Stack>
        </Box>
      )}
    </Box>
  );
}

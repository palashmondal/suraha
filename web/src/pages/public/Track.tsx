import { useState } from 'react';
import { Alert, Box, Button, Container, Paper, Stack, TextField, Typography } from '@mui/material';
import { bnStrings as S } from '../../i18n';
import { bn, bnDate } from '../../utils/bnNum';
import PublicLayout from './PublicLayout';
import StatusPill from '../../components/StatusPill';
import StatusTimeline, { type TimelineNode } from '../../components/StatusTimeline';
import { trackByToken, type TrackResult } from '../../api/track';
import { ApiError } from '../../api/client';

export default function Track() {
  const [token, setToken] = useState('');
  const [result, setResult] = useState<TrackResult | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const search = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setResult(null);
    setBusy(true);
    try {
      setResult(await trackByToken(token.trim()));
    } catch (e) {
      setErr(e instanceof ApiError && e.status === 404 ? S.public.trackNotFound : S.auth.genericError);
    } finally {
      setBusy(false);
    }
  };

  const nodes: TimelineNode[] = (result?.timeline ?? []).map((n, i) => ({
    key: String(i),
    label: n.label,
    timestamp: n.timestamp ? bn(n.timestamp) : undefined,
    done: n.done,
  }));

  return (
    <PublicLayout>
      <Container maxWidth="sm" sx={{ py: { xs: 5, md: 8 } }}>
        <Typography sx={{ fontSize: 28, fontWeight: 800, textAlign: 'center' }}>{S.public.trackTitle}</Typography>
        <Typography sx={{ color: 'text.secondary', textAlign: 'center', mt: 1, mb: 3 }}>{S.public.trackHelp}</Typography>

        <Paper component="form" onSubmit={search} elevation={0} sx={{ p: 2, borderRadius: '16px', border: (t) => `1px solid ${t.palette.divider}`, display: 'flex', gap: 1 }}>
          <TextField
            fullWidth
            value={token}
            onChange={(e) => setToken(e.target.value.toUpperCase())}
            placeholder="SUR-CMP-XXXXXX"
            inputProps={{ style: { fontFamily: 'monospace' } }}
          />
          <Button type="submit" variant="contained" disabled={busy || !token.trim()}>{S.public.trackBtn}</Button>
        </Paper>

        {err && <Alert severity="error" sx={{ mt: 2 }}>{err}</Alert>}

        {result && (
          <Paper elevation={0} sx={{ mt: 3, p: 3, borderRadius: '16px', border: (t) => `1px solid ${t.palette.divider}` }}>
            <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.5 }}>
              <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>{result.type_label}</Typography>
              <Box sx={{ flex: 1 }} />
              <StatusPill label={result.status_label} tone={result.status_tone} />
            </Stack>
            <Typography sx={{ fontSize: 19, fontWeight: 700 }}>{result.title}</Typography>
            <Typography sx={{ fontSize: 13.5, color: 'text.secondary', mb: 2 }}>
              {result.applicant}{result.date ? ` · ${bnDate(result.date)}` : ''}
            </Typography>
            <StatusTimeline nodes={nodes} />
          </Paper>
        )}
      </Container>
    </PublicLayout>
  );
}

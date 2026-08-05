import { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Paper,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { bnStrings as S } from '../i18n';
import { useAuth } from '../auth/AuthContext';
import { ApiError } from '../api/client';

export default function Login() {
  const [tab, setTab] = useState(0);
  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        bgcolor: 'background.default',
        p: 2,
      }}
    >
      <Paper elevation={0} sx={{ width: '100%', maxWidth: 420, p: 4, borderRadius: '20px' }}>
        <Typography sx={{ fontSize: 26, fontWeight: 800, textAlign: 'center', mb: 0.5 }}>
          {S.appName}
        </Typography>
        <Typography sx={{ textAlign: 'center', color: 'text.secondary', mb: 3 }}>
          {S.auth.loginTitle}
        </Typography>

        <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="fullWidth" sx={{ mb: 3 }}>
          <Tab label={S.auth.officerTab} />
          <Tab label={S.auth.citizenTab} />
        </Tabs>

        {tab === 0 ? <OfficerForm /> : <CitizenForm />}
      </Paper>
    </Box>
  );
}

function useApiError() {
  const [error, setError] = useState<string | null>(null);
  const show = (e: unknown) => {
    if (e instanceof ApiError) {
      const first = e.errors && Object.values(e.errors)[0]?.[0];
      setError(first ?? e.message ?? S.auth.genericError);
    } else {
      setError(S.auth.genericError);
    }
  };
  return { error, show, clear: () => setError(null) };
}

function OfficerForm() {
  const { officerLogin } = useAuth();
  const navigate = useNavigate();
  const { error, show, clear } = useApiError();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    clear();
    setBusy(true);
    try {
      await officerLogin(username, password);
      navigate('/', { replace: true });
    } catch (err) {
      show(err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Box component="form" onSubmit={submit} sx={{ display: 'grid', gap: 2 }}>
      {error && <Alert severity="error">{error}</Alert>}
      <TextField
        label={S.auth.username}
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        autoFocus
        fullWidth
      />
      <TextField
        label={S.auth.password}
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        fullWidth
      />
      <Button type="submit" variant="contained" size="large" disabled={busy}>
        {busy ? S.auth.loggingIn : S.auth.login}
      </Button>
    </Box>
  );
}

function CitizenForm() {
  const { requestOtp, verifyOtp } = useAuth();
  const navigate = useNavigate();
  const { error, show, clear } = useApiError();
  const [phase, setPhase] = useState<'phone' | 'otp'>('phone');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [devCode, setDevCode] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const sendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    clear();
    setBusy(true);
    try {
      const dev = await requestOtp(phone);
      setDevCode(dev);
      if (dev) setCode(dev); // dev convenience: prefill the code outside production
      setPhase('otp');
    } catch (err) {
      show(err);
    } finally {
      setBusy(false);
    }
  };

  const verify = async (e: React.FormEvent) => {
    e.preventDefault();
    clear();
    setBusy(true);
    try {
      await verifyOtp(phone, code, name || undefined);
      navigate('/', { replace: true });
    } catch (err) {
      show(err);
    } finally {
      setBusy(false);
    }
  };

  if (phase === 'phone') {
    return (
      <Box component="form" onSubmit={sendOtp} sx={{ display: 'grid', gap: 2 }}>
        {error && <Alert severity="error">{error}</Alert>}
        <TextField
          label={S.auth.phone}
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="01XXXXXXXXX"
          autoFocus
          fullWidth
        />
        <Button type="submit" variant="contained" size="large" disabled={busy}>
          {busy ? S.auth.loggingIn : S.auth.sendOtp}
        </Button>
      </Box>
    );
  }

  return (
    <Box component="form" onSubmit={verify} sx={{ display: 'grid', gap: 2 }}>
      <Alert severity="success">
        {S.auth.otpSent}
        {devCode && ` (dev: ${devCode})`}
      </Alert>
      {error && <Alert severity="error">{error}</Alert>}
      <TextField
        label={S.auth.otp}
        value={code}
        onChange={(e) => setCode(e.target.value)}
        autoFocus
        fullWidth
      />
      <TextField
        label={S.auth.nameOptional}
        value={name}
        onChange={(e) => setName(e.target.value)}
        fullWidth
      />
      <Button type="submit" variant="contained" size="large" disabled={busy}>
        {busy ? S.auth.loggingIn : S.auth.verify}
      </Button>
      <Button variant="text" onClick={() => setPhase('phone')} disabled={busy}>
        {S.auth.resend}
      </Button>
    </Box>
  );
}

import { useState } from 'react';
import { Alert, Box, Button, Paper, TextField, Typography } from '@mui/material';
import { bnStrings as S } from '../i18n';
import { api, ApiError } from '../api/client';

// Password change, reached from the পাসওয়ার্ড পরিবর্তন item in the top-right account menu.
// Kept off the profile page so a routine name or avatar edit never sits next to the credential
// form, and so the menu item has a page of its own to land on.
export default function ChangePassword() {
  const [current, setCurrent] = useState('');
  const [pw, setPw] = useState('');
  const [pwConfirm, setPwConfirm] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      await api('/profile/password', {
        method: 'PUT',
        body: { current_password: current, password: pw, password_confirmation: pwConfirm },
      });
      setCurrent('');
      setPw('');
      setPwConfirm('');
      setMsg(S.profile.passwordChanged);
    } catch (e) {
      setMsg(null);
      if (e instanceof ApiError) setErr(Object.values(e.errors ?? {})[0]?.[0] ?? e.message);
      else setErr(S.auth.genericError);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Box sx={{ maxWidth: 560, mx: 'auto', display: 'grid', gap: 3 }}>
      <Typography sx={{ fontSize: 22, fontWeight: 800 }}>{S.profile.changePassword}</Typography>

      {msg && <Alert severity="success">{msg}</Alert>}
      {err && <Alert severity="error">{err}</Alert>}

      <Paper component="form" onSubmit={save} elevation={0} sx={{ p: 3, borderRadius: '16px', display: 'grid', gap: 2 }}>
        <TextField
          label={S.profile.currentPassword}
          type="password"
          autoComplete="current-password"
          value={current}
          onChange={(e) => setCurrent(e.target.value)}
          required
          fullWidth
        />
        <TextField
          label={S.profile.newPassword}
          type="password"
          autoComplete="new-password"
          value={pw}
          onChange={(e) => setPw(e.target.value)}
          required
          fullWidth
        />
        <TextField
          label={S.profile.confirmPassword}
          type="password"
          autoComplete="new-password"
          value={pwConfirm}
          onChange={(e) => setPwConfirm(e.target.value)}
          required
          fullWidth
        />
        <Box>
          <Button type="submit" variant="contained" disabled={busy}>
            {S.profile.save}
          </Button>
        </Box>
      </Paper>
    </Box>
  );
}

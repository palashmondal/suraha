import { useRef, useState } from 'react';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Divider,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { bnStrings as S } from '../i18n';
import { useAuth, type AuthUser } from '../auth/AuthContext';
import { api, ApiError } from '../api/client';

export default function Profile() {
  const { user, setUser, refresh } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const [name, setName] = useState(user?.name ?? '');
  const [nameEn, setNameEn] = useState(user?.name_en ?? '');
  const [designation, setDesignation] = useState(user?.designation ?? '');
  const [email, setEmail] = useState(user?.email ?? '');

  const [current, setCurrent] = useState('');
  const [pw, setPw] = useState('');
  const [pwConfirm, setPwConfirm] = useState('');

  if (!user) return null;

  const flash = (m: string) => {
    setMsg(m);
    setErr(null);
  };
  const fail = (e: unknown) => {
    setMsg(null);
    if (e instanceof ApiError) {
      setErr(Object.values(e.errors ?? {})[0]?.[0] ?? e.message);
    } else setErr(S.auth.genericError);
  };

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api<{ data: AuthUser }>('/profile', {
        method: 'PUT',
        body: { name, name_en: nameEn, designation, email: email || null },
      });
      setUser(res.data);
      flash(S.profile.saved);
    } catch (e) {
      fail(e);
    }
  };

  const savePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api('/profile/password', {
        method: 'PUT',
        body: { current_password: current, password: pw, password_confirmation: pwConfirm },
      });
      setCurrent('');
      setPw('');
      setPwConfirm('');
      flash(S.profile.saved);
    } catch (e) {
      fail(e);
    }
  };

  const uploadAvatar = async (file: File) => {
    try {
      const fd = new FormData();
      fd.append('avatar', file);
      await api('/profile/avatar', { method: 'POST', body: fd });
      await refresh();
      flash(S.profile.saved);
    } catch (e) {
      fail(e);
    }
  };

  return (
    <Box sx={{ maxWidth: 720, mx: 'auto', display: 'grid', gap: 3 }}>
      <Typography sx={{ fontSize: 22, fontWeight: 800 }}>{S.profile.title}</Typography>

      {msg && <Alert severity="success">{msg}</Alert>}
      {err && <Alert severity="error">{err}</Alert>}

      <Paper elevation={0} sx={{ p: 3, borderRadius: '16px' }}>
        <Stack direction="row" spacing={2} alignItems="center">
          <Avatar src={user.avatar_url ?? undefined} sx={{ width: 72, height: 72 }} />
          <Box sx={{ flex: 1 }}>
            <Typography sx={{ fontWeight: 700, fontSize: 18 }}>{user.name}</Typography>
            <Typography sx={{ color: 'text.secondary' }}>{user.role_label_bn}</Typography>
            {user.upazila && (
              <Typography sx={{ color: 'text.secondary', fontSize: 13 }}>
                {user.upazila.name_bn}
              </Typography>
            )}
          </Box>
          <Button variant="outlined" onClick={() => fileRef.current?.click()}>
            {S.profile.uploadAvatar}
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => e.target.files?.[0] && uploadAvatar(e.target.files[0])}
          />
        </Stack>
      </Paper>

      <Paper component="form" onSubmit={saveProfile} elevation={0} sx={{ p: 3, borderRadius: '16px', display: 'grid', gap: 2 }}>
        <TextField label={S.profile.fullName} value={name} onChange={(e) => setName(e.target.value)} fullWidth />
        <TextField label={S.profile.nameEn} value={nameEn} onChange={(e) => setNameEn(e.target.value)} fullWidth />
        <TextField label={S.profile.designationField} value={designation} onChange={(e) => setDesignation(e.target.value)} fullWidth />
        <TextField label={S.profile.email} type="email" value={email} onChange={(e) => setEmail(e.target.value)} fullWidth />
        <Box><Button type="submit" variant="contained">{S.profile.save}</Button></Box>
      </Paper>

      <Paper component="form" onSubmit={savePassword} elevation={0} sx={{ p: 3, borderRadius: '16px', display: 'grid', gap: 2 }}>
        <Typography sx={{ fontWeight: 700 }}>{S.profile.changePassword}</Typography>
        <Divider />
        <TextField label={S.profile.currentPassword} type="password" value={current} onChange={(e) => setCurrent(e.target.value)} fullWidth />
        <TextField label={S.profile.newPassword} type="password" value={pw} onChange={(e) => setPw(e.target.value)} fullWidth />
        <TextField label={S.profile.confirmPassword} type="password" value={pwConfirm} onChange={(e) => setPwConfirm(e.target.value)} fullWidth />
        <Box><Button type="submit" variant="contained">{S.profile.save}</Button></Box>
      </Paper>
    </Box>
  );
}

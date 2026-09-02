import { useState } from 'react';
import { Alert, Box, Button, Link, MenuItem, TextField } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import AuthCard from './AuthCard';
import { bnStrings as S } from '../../i18n';
import { useAuth, HAS_BACKEND } from '../../auth/AuthContext';
import { ROLE_LABEL, OFFICER_ROLES, homePathFor, type Role } from '../../auth/roles';

// Officer credential login (SURAHA_BUILD_PROMPT §1.1(3)). When no backend is configured, a demo-role
// picker lets reviewers enter any officer role; it disappears once VITE_API_URL is set.
export default function OfficerLogin() {
  const { officerLogin, loading } = useAuth();
  const nav = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [demoRole, setDemoRole] = useState<Role>('uno');
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      const user = await officerLogin(username, password, demoRole);
      nav(homePathFor(user.role), { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'লগইন ব্যর্থ হয়েছে');
    }
  };

  return (
    <AuthCard
      title={S.auth.officerTitle}
      subtitle={S.auth.officerSubtitle}
      footer={
        <Link component="button" underline="hover" onClick={() => nav('/citizen/login')}>
          {S.auth.citizenSwitch}
        </Link>
      }
    >
      <Box component="form" onSubmit={onSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {error ? <Alert severity="error">{error}</Alert> : null}
        <TextField
          label={S.auth.username}
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
          fullWidth
          autoFocus
        />
        <TextField
          label={S.auth.password}
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          fullWidth
        />
        {!HAS_BACKEND ? (
          <>
            <TextField
              select
              label={S.auth.demoRole}
              value={demoRole}
              onChange={(e) => setDemoRole(e.target.value as Role)}
              fullWidth
            >
              {OFFICER_ROLES.map((r) => (
                <MenuItem key={r} value={r}>
                  {ROLE_LABEL[r]}
                </MenuItem>
              ))}
            </TextField>
            <Alert severity="info" sx={{ fontSize: 13 }}>
              {S.auth.demoHint}
            </Alert>
          </>
        ) : null}
        <Button type="submit" variant="contained" size="large" disabled={loading}>
          {S.auth.login}
        </Button>
      </Box>
    </AuthCard>
  );
}

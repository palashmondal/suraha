import { useState } from 'react';
import { Alert, Box, Button, Collapse, Tab, Tabs, TextField, Typography } from '@mui/material';
import { ThemeProvider, alpha, useTheme } from '@mui/material/styles';
import BadgeOutlined from '@mui/icons-material/BadgeOutlined';
import PersonOutline from '@mui/icons-material/PersonOutline';
import { buildTheme } from '../theme/theme';
import { useNavigate } from 'react-router-dom';
import { bnStrings as S } from '../i18n';
import { useAuth } from '../auth/AuthContext';
import { ApiError } from '../api/client';
import { useHostContext } from '../tenant/host';

// The login card always runs dark on a light page, regardless of the saved
// colour-mode preference — that applies once the user is inside the app.
const cardTheme = buildTheme('dark');

export default function Login() {
  return (
    <ThemeProvider theme={cardTheme}>
      <LoginScreen />
    </ThemeProvider>
  );
}

function LoginScreen() {
  const host = useHostContext();
  const [tab, setTab] = useState(0);

  // Login is gated by host type (mirrors the API):
  //  - central host (suraha.net) → SEAL admin only: no citizen tab, single admin form.
  //  - district host → that district's DC only: officer form, no citizen tab.
  //  - upazila host → officer + citizen tabs (upazila officers / citizen OTP).
  const isCentral = host?.kind === 'central' || host?.kind === 'district';
  const subtitle =
    host?.kind === 'district'
      ? S.auth.districtLoginSuffix
      : host?.kind === 'central'
        ? S.auth.adminLoginTitle
        : S.auth.loginTitle;
  // brand reads "সুরাহা — <upazila/district>" on a tenant host, plain সুরাহা on the central one
  const brand = host?.name_bn ? `${S.appName} — ${host.name_bn}` : S.appName;

  const theme = useTheme();

  return (
    <Box
      sx={{
        height: '100vh',
        overflowY: 'auto',
        scrollbarGutter: 'stable',
        display: 'grid',
        placeItems: 'center',
        p: { xs: 2, md: 5 },
        position: 'relative',
        overflow: 'hidden',
        bgcolor: '#F8F7FD',
      }}
    >
      {/* faint oversized echo of the illustration behind the card */}
      <Box
        aria-hidden
        component="img"
        src="/login-illustration.svg"
        sx={{
          position: 'absolute',
          inset: 0,
          width: '130%',
          left: '-15%',
          m: 'auto',
          opacity: 0.12,
          filter: 'blur(1px)',
          pointerEvents: 'none',
        }}
      />

      <Box
        sx={{
          position: 'relative',
          width: '100%',
          maxWidth: 1060,
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
          borderRadius: 3,
          overflow: 'hidden',
          // between the app's dark surface (#211F26) and the M3 surface-container-high
          bgcolor: '#3A3449',
          boxShadow: '0 28px 70px rgba(29, 27, 32, 0.28)',
        }}
      >
        {/* Form side */}
        <Box
          sx={{
            px: { xs: 3, sm: 6 },
            py: { xs: 5, md: 7 },
            display: 'flex',
            flexDirection: 'column',
            // top-anchored: the citizen form is shorter than the officer one, and centring
            // would shift the logo/headline on every tab switch
            justifyContent: 'flex-start',
            // one place for the field/button rhythm shared by both forms below
            // These fields are heavily rounded, so text sitting at MUI's default 14px ran into
            // the curve. Label, value and the notch all shift right by the same amount so they
            // stay in line with each other.
            '& .MuiOutlinedInput-root': {
              borderRadius: 2.5,
              bgcolor: 'rgba(255,255,255,0.06)',
              color: '#FFFFFF',
              '& fieldset': { borderColor: 'rgba(255,255,255,0.35)', paddingLeft: '16px' },
              '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.6)' },
            },
            '& .MuiOutlinedInput-input': { paddingLeft: '22px' },
            '& .MuiInputLabel-root': {
              color: 'rgba(255,255,255,0.75)',
              transform: 'translate(22px, 16px) scale(1)',
              '&.MuiInputLabel-shrink': { transform: 'translate(22px, -6px) scale(0.75)' },
            },
            '& .MuiInputLabel-root.Mui-focused': { color: '#FFFFFF' },
            '& form .MuiButton-root': { py: 1.25, fontSize: 16 },
          }}
        >
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 1.75,
              mb: { xs: 4, md: 6 },
            }}
          >
            <Box component="img" src="/logo.png" alt="" sx={{ width: 64, height: 64 }} />
            <Typography
              sx={{ fontSize: { xs: 28, md: 34 }, fontWeight: 800, color: '#FFFFFF' }}
            >
              {brand}
            </Typography>
          </Box>

          <Typography
            component="h1"
            sx={{
              fontSize: { xs: 24, md: 28 },
              fontWeight: 800,
              lineHeight: 1.35,
              mb: 1.25,
              textAlign: 'center',
              color: '#FFFFFF',
            }}
          >
            {S.auth.headline}
          </Typography>
          <Typography sx={{ color: 'rgba(255,255,255,0.78)', textAlign: 'center', mb: 4 }}>
            {subtitle}
          </Typography>

          {isCentral ? (
            <OfficerForm />
          ) : (
            <>
              <Tabs
                value={tab}
                onChange={(_, v) => setTab(v)}
                variant="fullWidth"
                sx={{
                  mb: 3,
                  minHeight: 56,
                  bgcolor: alpha(theme.palette.primary.main, 0.22),
                  border: `1px solid ${alpha(theme.palette.primary.main, 0.45)}`,
                  borderRadius: 999,
                  p: 0.75,
                  '& .MuiTabs-indicator': { display: 'none' },
                  '& .MuiTab-root': {
                    minHeight: 46,
                    borderRadius: 999,
                    fontSize: 16,
                    fontWeight: 700,
                    color: 'rgba(255,255,255,0.78)',
                    gap: 0.75,
                    zIndex: 1,
                    transition: 'background-color .2s, color .2s',
                  },
                  '& .Mui-selected': {
                    bgcolor: 'primary.main',
                    color: '#FFFFFF !important',
                    boxShadow: `0 4px 14px ${alpha(theme.palette.primary.main, 0.55)}`,
                  },
                }}
              >
                <Tab icon={<BadgeOutlined fontSize="small" />} iconPosition="start" label={S.auth.officerTab} />
                <Tab icon={<PersonOutline fontSize="small" />} iconPosition="start" label={S.auth.citizenTab} />
              </Tabs>
              <Collapse in={tab === 0} unmountOnExit>
                <OfficerForm />
              </Collapse>
              <Collapse in={tab === 1} unmountOnExit>
                <CitizenForm />
              </Collapse>
            </>
          )}

          <Typography sx={{ mt: 4, fontSize: 13, color: 'rgba(255,255,255,0.65)', textAlign: 'center' }}>
            {S.auth.welcomeBack}
          </Typography>
        </Box>

        {/* Illustration side — decorative, hidden on small screens */}
        <Box
          aria-hidden
          sx={{
            display: { xs: 'none', md: 'flex' },
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            px: 5,
            py: 7,
            bgcolor: '#F3F1FB',
          }}
        >
          <Box
            component="img"
            src="/login-illustration.svg"
            alt=""
            sx={{ width: '100%', maxWidth: 360, mb: 4 }}
          />
          <Typography
            sx={{ fontSize: 15, fontWeight: 600, color: '#49454F', textAlign: 'center' }}
          >
            {S.auth.illustrationCaption}
          </Typography>
          <Typography
            sx={{
              mt: 1.5,
              fontSize: 19,
              fontWeight: 700,
              lineHeight: 1.45,
              letterSpacing: 0.2,
              color: 'primary.main',
              textAlign: 'center',
            }}
          >
            {S.auth.illustrationTagline}
          </Typography>
        </Box>
      </Box>
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
      await verifyOtp(phone, code);
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
      <Button type="submit" variant="contained" size="large" disabled={busy}>
        {busy ? S.auth.loggingIn : S.auth.verify}
      </Button>
      <Button variant="text" onClick={() => setPhase('phone')} disabled={busy}>
        {S.auth.resend}
      </Button>
    </Box>
  );
}

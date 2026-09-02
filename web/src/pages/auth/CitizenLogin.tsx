import { useState } from 'react';
import { Alert, Box, Button, Link, TextField, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import AuthCard from './AuthCard';
import { bnStrings as S } from '../../i18n';
import { useAuth } from '../../auth/AuthContext';
import { homePathFor } from '../../auth/roles';
import { bn } from '../../utils/bnNum';

// Citizen mobile + OTP login (SURAHA_BUILD_PROMPT §1.1(3)). Two steps: enter mobile → enter the code.
export default function CitizenLogin() {
  const { requestOtp, verifyOtp, loading } = useAuth();
  const nav = useNavigate();
  const [step, setStep] = useState<'mobile' | 'otp'>('mobile');
  const [mobile, setMobile] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);

  const onSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!/^01\d{9}$/.test(mobile)) {
      setError('সঠিক ১১-সংখ্যার মোবাইল নম্বর দিন');
      return;
    }
    try {
      await requestOtp(mobile);
      setStep('otp');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'কোড পাঠানো যায়নি');
    }
  };

  const onVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      const user = await verifyOtp(mobile, code);
      nav(homePathFor(user.role), { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : S.auth.invalidOtp);
    }
  };

  return (
    <AuthCard
      title={S.auth.citizenTitle}
      subtitle={step === 'mobile' ? S.auth.citizenSubtitle : S.auth.otpSent}
      footer={
        <Link component="button" underline="hover" onClick={() => nav('/login')}>
          {S.auth.officerSwitch}
        </Link>
      }
    >
      {step === 'mobile' ? (
        <Box component="form" onSubmit={onSendOtp} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {error ? <Alert severity="error">{error}</Alert> : null}
          <TextField
            label={S.auth.mobile}
            value={mobile}
            onChange={(e) => setMobile(e.target.value.replace(/\D/g, '').slice(0, 11))}
            placeholder="01XXXXXXXXX"
            inputMode="numeric"
            required
            fullWidth
            autoFocus
          />
          <Button type="submit" variant="contained" size="large" disabled={loading}>
            {S.auth.sendOtp}
          </Button>
        </Box>
      ) : (
        <Box component="form" onSubmit={onVerify} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {error ? <Alert severity="error">{error}</Alert> : null}
          <Typography sx={{ fontSize: 14, color: 'text.secondary' }}>
            {bn(mobile)}
          </Typography>
          <TextField
            label={S.auth.otp}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            inputMode="numeric"
            required
            fullWidth
            autoFocus
          />
          <Button type="submit" variant="contained" size="large" disabled={loading}>
            {S.auth.verify}
          </Button>
          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Link component="button" type="button" underline="hover" onClick={() => setStep('mobile')}>
              {S.auth.changeMobile}
            </Link>
            <Link component="button" type="button" underline="hover" onClick={() => requestOtp(mobile)}>
              {S.auth.resendOtp}
            </Link>
          </Box>
        </Box>
      )}
    </AuthCard>
  );
}

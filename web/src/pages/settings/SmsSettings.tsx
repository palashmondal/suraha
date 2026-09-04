import { useEffect, useState } from 'react';
import {
  Alert, Box, Button, Chip, Link, Paper, Stack, Table, TableBody, TableCell, TableHead, TableRow,
  TextField, Typography,
} from '@mui/material';
import OpenInNewRoundedIcon from '@mui/icons-material/OpenInNewRounded';
import SmsOutlinedIcon from '@mui/icons-material/SmsOutlined';
import SendRoundedIcon from '@mui/icons-material/SendRounded';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { bnStrings as S } from '../../i18n';
import { bn, bnDate } from '../../utils/bnNum';
import PageHeader from '../../components/PageHeader';
import SectionTitle from '../../components/SectionTitle';
import StatTile from '../../components/StatTile';
import LoadingState from '../../components/LoadingState';
import ChartCard from '../../components/charts/ChartCard';
import { chartColors } from '../../components/charts/palette';
import { ApiError } from '../../api/client';
import { useAuth } from '../../auth/AuthContext';
import { getSmsSettings, saveSmsSettings, sendTestSms, type SmsSettings as Settings, type SmsTestResult } from '../../api/smsSettings';
import { useTheme } from '@mui/material/styles';

// SMS সেটিংস (§10): what is left on the provider account, what Suraha has spent it on, and the
// credential itself. One account serves every upazila, so a UNO reads this page and only SEAL
// may replace the key — the API enforces the same split.
export default function SmsSettings() {
  const { user } = useAuth();
  const theme = useTheme();
  const colors = chartColors(theme);
  const canEdit = user?.role === 'seal_admin';

  const [s, setS] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [apiKey, setApiKey] = useState('');
  const [senderId, setSenderId] = useState('');
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [testPhone, setTestPhone] = useState('');
  const [testing, setTesting] = useState(false);
  const [test, setTest] = useState<SmsTestResult | null>(null);
  const [testText, setTestText] = useState('');

  const load = () => {
    setLoading(true);
    getSmsSettings()
      .then((r) => { setS(r); setSenderId(r.sender_id ?? ''); setTestText(r.default_test_message); })
      .catch(() => setS(null))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const save = async () => {
    setBusy(true);
    setErr(null);
    try {
      const r = await saveSmsSettings({
        // An empty box means "leave the key alone", not "clear it".
        api_key: apiKey.trim() || undefined,
        sender_id: senderId.trim(),
      });
      setS(r);
      setApiKey('');
      setFlash(S.sms.saved);
    } catch (e) {
      setErr(e instanceof ApiError ? (Object.values(e.errors ?? {})[0]?.[0] ?? e.message) : S.auth.genericError);
    } finally {
      setBusy(false);
    }
  };

  const runTest = async () => {
    setTesting(true);
    setTest(null);
    setErr(null);
    try {
      const r = await sendTestSms(testPhone.trim(), testText.trim() || undefined);
      setTest(r);
      setS(r.settings); // balance and usage have both moved
    } catch (e) {
      setErr(e instanceof ApiError ? (Object.values(e.errors ?? {})[0]?.[0] ?? e.message) : S.auth.genericError);
    } finally {
      setTesting(false);
    }
  };

  if (loading) return <LoadingState />;
  if (!s) return <Alert severity="error">{S.common.loadError}</Alert>;

  const low = s.balance !== null && s.balance.balance < 50;

  return (
    <Box>
      <PageHeader title={S.sms.title} />

      {flash && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setFlash(null)}>{flash}</Alert>}

      {/* Account: balance first, because it is the one number that stops the service working. */}
      <Paper elevation={0} sx={{ borderRadius: '16px', p: 2.5, mb: 2 }}>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5 }}>
          <SmsOutlinedIcon fontSize="small" sx={{ color: 'primary.main' }} />
          <SectionTitle>{S.sms.account}</SectionTitle>
          <Box sx={{ flex: 1 }} />
          <Chip
            size="small"
            label={s.gateway === 'alpha' ? S.sms.live : S.sms.logOnly}
            color={s.gateway === 'alpha' ? 'success' : 'default'}
            variant="outlined"
          />
        </Stack>

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
          <StatTile
            label={S.sms.balance}
            value={s.balance ? `৳${bn(s.balance.balance.toFixed(2))}` : '—'}
          />
          <StatTile label={S.sms.validity} value={s.balance?.validity ? bnDate(s.balance.validity) : '—'} />
          <StatTile label={S.sms.sentTotal} value={bn(s.usage.sent)} unit={S.common.count} />
          <StatTile label={S.sms.failedTotal} value={bn(s.usage.failed)} unit={S.common.count} />
        </Stack>

        {s.balance === null && (
          <Alert severity="warning" sx={{ mt: 2 }}>{S.sms.balanceUnavailable}</Alert>
        )}
        {low && <Alert severity="warning" sx={{ mt: 2 }}>{S.sms.lowBalance}</Alert>}

        <Stack direction="row" spacing={1} sx={{ mt: 2, flexWrap: 'wrap', gap: 1 }}>
          <Button size="small" variant="outlined" endIcon={<OpenInNewRoundedIcon />} href={s.provider.recharge_url} target="_blank" rel="noopener">
            {S.sms.recharge}
          </Button>
          <Button size="small" endIcon={<OpenInNewRoundedIcon />} href={s.provider.panel_url} target="_blank" rel="noopener">
            {s.provider.name} {S.sms.panel}
          </Button>
        </Stack>
      </Paper>

      {/* Usage — parts, not messages: Bangla is Unicode, so a long message bills more than once. */}
      <ChartCard title={S.sms.usageTitle(bn(s.usage.days))} height={280}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={s.usage.series} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} vertical={false} />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 11, fill: theme.palette.text.secondary }}
              tickFormatter={(d: string) => bn(d.slice(8, 10))}
              interval={2}
            />
            <YAxis tick={{ fontSize: 11, fill: theme.palette.text.secondary }} allowDecimals={false} />
            <Tooltip
              labelFormatter={(d) => bnDate(String(d))}
              formatter={(v, n) => [bn(Number(v)), String(n)]}
              contentStyle={{ background: theme.palette.background.paper, border: `1px solid ${theme.palette.divider}`, borderRadius: 12 }}
            />
            <Bar dataKey="sent" name={S.sms.sentTotal} stackId="a" fill={colors.series.appointment} radius={[0, 0, 0, 0]} />
            <Bar dataKey="failed" name={S.sms.failedTotal} stackId="a" fill={theme.palette.error.main} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* One provider account serves every subdomain, so the bill can only be attributed here. */}
      <Paper elevation={0} sx={{ borderRadius: '16px', p: 2.5, mt: 2 }}>
        <SectionTitle>{S.sms.byUpazila}</SectionTitle>
        <Table size="small" sx={{ mt: 1 }}>
          <TableHead>
            <TableRow>
              <TableCell>{S.sms.upazila}</TableCell>
              <TableCell>{S.sms.subdomain}</TableCell>
              <TableCell align="right">{S.sms.messages}</TableCell>
              <TableCell align="right">{S.sms.parts}</TableCell>
              <TableCell align="right">{S.sms.failedTotal}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {s.usage.by_tenant.map((t) => (
              <TableRow key={t.tenant_id ?? 'central'}>
                <TableCell sx={{ fontWeight: 600 }}>{t.name}</TableCell>
                <TableCell sx={{ fontFamily: 'monospace', fontSize: 12.5, direction: 'ltr', color: 'text.secondary' }}>
                  {t.subdomain}
                </TableCell>
                <TableCell align="right">{bn(t.total)}</TableCell>
                <TableCell align="right">{bn(t.parts)}</TableCell>
                <TableCell align="right" sx={{ color: t.failed ? 'error.main' : 'text.secondary' }}>
                  {bn(t.failed)}
                </TableCell>
              </TableRow>
            ))}
            {s.usage.by_tenant.length === 0 && (
              <TableRow><TableCell colSpan={5} sx={{ color: 'text.secondary' }}>{S.sms.noUsage}</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </Paper>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2, mt: 2 }}>
        <Paper elevation={0} sx={{ borderRadius: '16px', p: 2.5 }}>
          <SectionTitle>{S.sms.byPurpose}</SectionTitle>
          <Table size="small" sx={{ mt: 1 }}>
            <TableHead>
              <TableRow>
                <TableCell>{S.sms.purpose}</TableCell>
                <TableCell align="right">{S.sms.messages}</TableCell>
                <TableCell align="right">{S.sms.parts}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {s.usage.by_purpose.map((p) => (
                <TableRow key={p.purpose}>
                  <TableCell>{p.label}</TableCell>
                  <TableCell align="right">{bn(p.total)}</TableCell>
                  <TableCell align="right">{bn(p.parts)}</TableCell>
                </TableRow>
              ))}
              {s.usage.by_purpose.length === 0 && (
                <TableRow><TableCell colSpan={3} sx={{ color: 'text.secondary' }}>{S.sms.noUsage}</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </Paper>

        <Paper elevation={0} sx={{ borderRadius: '16px', p: 2.5 }}>
          <SectionTitle>{S.sms.recentFailures}</SectionTitle>
          <Stack spacing={1} sx={{ mt: 1 }}>
            {s.usage.recent_failures.map((f, i) => (
              <Box key={i}>
                <Typography sx={{ fontSize: 13.5, fontWeight: 600 }}>{bn(f.phone)}</Typography>
                <Typography sx={{ fontSize: 12.5, color: 'error.main' }}>{f.error}</Typography>
                {f.at && <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>{bnDate(f.at)}</Typography>}
              </Box>
            ))}
            {s.usage.recent_failures.length === 0 && (
              <Typography sx={{ fontSize: 13.5, color: 'text.secondary' }}>{S.sms.noFailures}</Typography>
            )}
          </Stack>
        </Paper>
      </Box>

      {/* Credential and its verification, side by side: pasting a key and proving it works
          are one task. */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2, mt: 2, alignItems: 'start' }}>
        {/* The credential. Only SEAL may replace it — one account serves every upazila. */}
        <Paper elevation={0} sx={{ borderRadius: '16px', p: 2.5 }}>
          <SectionTitle>{S.sms.credential}</SectionTitle>
          <Typography sx={{ fontSize: 13, color: 'text.secondary', mt: 0.5, mb: 2 }}>
            {S.sms.credentialHelp}{' '}
            <Link href={s.provider.url} target="_blank" rel="noopener">{s.provider.name}</Link>
          </Typography>

          {err && <Alert severity="error" sx={{ mb: 2 }}>{err}</Alert>}

          <Stack spacing={2}>
            <TextField
              label={S.sms.apiKey}
              size="small"
              fullWidth
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              disabled={!canEdit}
              placeholder={s.api_key_masked ?? S.sms.apiKeyNotSet}
              helperText={S.sms.apiKeyHelp}
            />
            <TextField
              label={S.sms.senderId}
              size="small"
              fullWidth
              value={senderId}
              onChange={(e) => setSenderId(e.target.value)}
              disabled={!canEdit}
              helperText={S.sms.senderIdHelp}
            />
            {canEdit ? (
              <Box>
                <Button variant="contained" disabled={busy} onClick={() => void save()}>{S.common.save}</Button>
              </Box>
            ) : (
              <Alert severity="info">{S.sms.sealOnly}</Alert>
            )}
          </Stack>
        </Paper>
        {/* A real send is the only way to know the key works and how the sender actually reads on a
            handset — masking is approved provider-side, so it cannot be verified from here. */}
        {canEdit && (
          <Paper elevation={0} sx={{ borderRadius: '16px', p: 2.5 }}>
            <SectionTitle>{S.sms.testTitle}</SectionTitle>
            <Typography sx={{ fontSize: 13, color: 'text.secondary', mt: 0.5, mb: 2 }}>
              {S.sms.testHelp}
            </Typography>

            <TextField
              label={S.sms.testPhone}
              size="small"
              fullWidth
              value={testPhone}
              onChange={(e) => setTestPhone(e.target.value)}
              placeholder="01XXXXXXXXX"
              slotProps={{ htmlInput: { inputMode: 'numeric' } }}
            />

            <TextField
              label={S.sms.testMessage}
              size="small"
              fullWidth
              multiline
              minRows={3}
              value={testText}
              onChange={(e) => setTestText(e.target.value)}
              sx={{ mt: 2 }}
              // Bangla is Unicode, so a part is 70 characters — the cost of the send, stated
              // before it is made rather than discovered on the bill.
              helperText={S.sms.testParts(bn(testText.length), bn(Math.max(1, Math.ceil(testText.length / 70))))}
            />

            <Button
              variant="contained"
              startIcon={<SendRoundedIcon />}
              disabled={testing || !/^01\d{9}$/.test(testPhone.trim())}
              onClick={() => void runTest()}
              sx={{ mt: 2 }}
            >
              {S.sms.testSend}
            </Button>

            {test && (
              <Alert severity={test.sent ? 'success' : 'error'} sx={{ mt: 2 }}>
                {test.sent ? S.sms.testSent : `${S.sms.testFailed} ${test.error ?? ''}`}
                {/* The provider's own wording is terse; say what to do about it. */}
                {!test.sent && /sender/i.test(test.error ?? '') && (
                  <Typography sx={{ fontSize: 13, mt: 0.5 }}>{S.sms.senderIdRejected}</Typography>
                )}
                {test.sent && (
                  <Typography sx={{ fontSize: 13, mt: 0.5 }}>
                    {test.sender_id ? S.sms.testMasked(test.sender_id) : S.sms.testUnmasked}
                  </Typography>
                )}
              </Alert>
            )}
          </Paper>
        )}
      </Box>
    </Box>
  );
}

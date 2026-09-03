import { Box, Button, Container, IconButton, Stack, Typography, useTheme } from '@mui/material';
import LightModeRoundedIcon from '@mui/icons-material/LightModeRounded';
import DarkModeRoundedIcon from '@mui/icons-material/DarkModeRounded';
import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { bnStrings as S } from '../../i18n';
import { useColorMode } from '../../theme/ColorModeContext';
import { useAuth } from '../../auth/AuthContext';
import { bn } from '../../utils/bnNum';
import OfflineBanner from '../../components/OfflineBanner';
import type { InfoItem } from '../../api/content';

// Public-site chrome (§7): a top menu with the wordmark + nav + theme toggle + auth actions, and
// a footer (optionally listing the important phone numbers from General Info). Wraps the landing,
// track, and citizen pages.
export default function PublicLayout({ children, phones = [] }: { children: ReactNode; phones?: InfoItem[] }) {
  const theme = useTheme();
  const navigate = useNavigate();
  const { mode, toggle } = useColorMode();
  const { user, logout } = useAuth();
  const isCitizen = user?.role === 'citizen';

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', bgcolor: 'background.default' }}>
      {/* Top menu */}
      <Box sx={{ borderBottom: `1px solid ${theme.palette.divider}`, bgcolor: 'background.paper' }}>
        <Container maxWidth="lg" sx={{ height: 68, display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box onClick={() => navigate('/')} sx={{ display: 'flex', alignItems: 'center', gap: 1, cursor: 'pointer' }}>
            <Box component="img" src="/logo.png" alt={S.appName} sx={{ width: 38, height: 38 }} />
            <Typography sx={{ fontSize: 22, fontWeight: 800 }}>{S.appName}</Typography>
          </Box>
          <Box sx={{ flex: 1 }} />
          <Stack direction="row" spacing={1} alignItems="center" sx={{ display: { xs: 'none', sm: 'flex' } }}>
            <Button color="inherit" onClick={() => navigate('/track')}>{S.public.navTrack}</Button>
          </Stack>
          <IconButton onClick={toggle}>
            {mode === 'light' ? <DarkModeRoundedIcon /> : <LightModeRoundedIcon />}
          </IconButton>
          {isCitizen ? (
            <>
              <Button variant="outlined" onClick={() => navigate('/my-submissions')}>{S.public.mySubmissions}</Button>
              <Button color="inherit" onClick={async () => { await logout(); navigate('/'); }}>{S.profile.logout}</Button>
            </>
          ) : (
            <Button variant="contained" onClick={() => navigate('/login')}>{S.public.navLogin}</Button>
          )}
        </Container>
      </Box>

      <OfflineBanner />

      <Box sx={{ flex: 1 }}>{children}</Box>

      {/* Footer */}
      <Box sx={{ bgcolor: theme.suraha.module.pregnancy, color: '#fff', mt: 6 }}>
        <Container maxWidth="lg" sx={{ py: 4, display: 'grid', gridTemplateColumns: { xs: '1fr', sm: phones.length ? '1.4fr 1fr' : '1fr' }, gap: 3 }}>
          <Box>
            <Typography sx={{ fontWeight: 700, fontSize: 18 }}>{S.appName}</Typography>
            <Typography sx={{ opacity: 0.85, fontSize: 14, maxWidth: 560, mt: 0.5 }}>{S.public.footerAbout}</Typography>
            <Typography sx={{ opacity: 0.7, fontSize: 13, mt: 2 }}>{S.public.footerRights}</Typography>
          </Box>
          {phones.length > 0 && (
            <Box>
              <Typography sx={{ fontWeight: 700, mb: 1 }}>{S.public.footerPhones}</Typography>
              {phones.map((p) => (
                <Typography key={p.id} sx={{ opacity: 0.9, fontSize: 14 }}>
                  {p.title}: {bn(p.value)}
                </Typography>
              ))}
            </Box>
          )}
        </Container>
      </Box>
    </Box>
  );
}

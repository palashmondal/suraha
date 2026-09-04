import { Box, Button, Container, IconButton, Stack, Typography, useTheme } from '@mui/material';
import LightModeRoundedIcon from '@mui/icons-material/LightModeRounded';
import DarkModeRoundedIcon from '@mui/icons-material/DarkModeRounded';
import MenuRoundedIcon from '@mui/icons-material/MenuRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import { useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { bnStrings as S } from '../../i18n';
import { useColorMode } from '../../theme/ColorModeContext';
import { useAuth } from '../../auth/AuthContext';
import OfflineBanner from '../../components/OfflineBanner';
import PhoneLink from '../../components/PhoneLink';
import type { InfoItem } from '../../api/content';

/** An in-page anchor (`#services`) or a router path (`/track`) — the header renders both. */
export type NavLink = { label: string; to: string };

/**
 * What the header shows on a page that declares no nav of its own — the inner citizen pages.
 * Routes only: a landing page's anchors do not exist here, and following one would scroll
 * nowhere. Without this the header on /track was just a logo, which read as a different site.
 */
const INNER_NAV: NavLink[] = [
  { label: S.public.navHome, to: '/' },
  { label: S.public.navTrack, to: '/track' },
];

/**
 * Public-site chrome (§7), shared by the product landing, the upazila landing and every citizen
 * page. The header is sticky with a translucent backdrop so long forms keep the login button in
 * reach; `links` differ per site, which is the only thing the two landings change here.
 */
export default function PublicLayout({
  children,
  phones = [],
  links,
  footerNote,
}: {
  children: ReactNode;
  phones?: InfoItem[];
  links?: NavLink[];
  footerNote?: string;
}) {
  const theme = useTheme();
  const navigate = useNavigate();
  const { mode, toggle } = useColorMode();
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const isCitizen = user?.role === 'citizen';
  const nav = links ?? INNER_NAV;

  // An anchor scrolls within the page it is already on; anything else is a route.
  const go = (to: string) => {
    setMenuOpen(false);
    if (! to.startsWith('#')) {
      navigate(to);

      return;
    }
    document.querySelector(to)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const authActions = isCitizen ? (
    <>
      <Button variant="outlined" onClick={() => go('/my-submissions')}>{S.public.mySubmissions}</Button>
      <Button color="inherit" onClick={async () => { await logout(); navigate('/'); }}>{S.profile.logout}</Button>
    </>
  ) : user ? (
    <Button variant="contained" onClick={() => go('/app')}>{S.nav.dashboard}</Button>
  ) : (
    <Button variant="contained" onClick={() => go('/login')}>{S.public.navLogin}</Button>
  );

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', bgcolor: 'background.default' }}>
      <Box
        component="header"
        sx={{
          position: 'sticky',
          top: 0,
          zIndex: theme.zIndex.appBar,
          borderBottom: `1px solid ${theme.palette.divider}`,
          // Translucent rather than solid so content scrolling under it still reads as one page.
          bgcolor: mode === 'light' ? 'rgba(255,255,255,0.86)' : 'rgba(28,26,33,0.86)',
          backdropFilter: 'blur(12px)',
        }}
      >
        <Container maxWidth="lg" sx={{ minHeight: 72, display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box
            onClick={() => go('/')}
            sx={{ display: 'flex', alignItems: 'center', gap: 1.25, cursor: 'pointer', flexShrink: 0 }}
          >
            <Box component="img" src="/logo.png" alt={S.appName} sx={{ width: 40, height: 40 }} />
            <Typography sx={{ fontSize: 23, fontWeight: 800, letterSpacing: '-0.01em' }}>{S.appName}</Typography>
          </Box>

          <Stack
            direction="row"
            spacing={0.5}
            sx={{ flex: 1, ml: 2, display: { xs: 'none', md: 'flex' } }}
          >
            {nav.map((l) => (
              <Button
                key={l.to}
                color="inherit"
                onClick={() => go(l.to)}
                sx={{ fontSize: 15, fontWeight: 500, color: 'text.secondary', '&:hover': { color: 'text.primary' } }}
              >
                {l.label}
              </Button>
            ))}
          </Stack>
          <Box sx={{ flex: { xs: 1, md: 0 } }} />

          <IconButton onClick={toggle} aria-label={mode === 'light' ? 'ডার্ক মোড' : 'লাইট মোড'}>
            {mode === 'light' ? <DarkModeRoundedIcon /> : <LightModeRoundedIcon />}
          </IconButton>

          <Stack direction="row" spacing={1} sx={{ display: { xs: 'none', sm: 'flex' } }}>
            {authActions}
          </Stack>

          {nav.length > 0 && (
            <IconButton
              onClick={() => setMenuOpen((o) => ! o)}
              aria-label={S.nav.expand}
              sx={{ display: { xs: 'inline-flex', md: 'none' } }}
            >
              {menuOpen ? <CloseRoundedIcon /> : <MenuRoundedIcon />}
            </IconButton>
          )}
        </Container>

        {/* Mobile menu: the same links stacked, plus the auth actions that the bar drops at xs. */}
        {menuOpen && (
          <Box sx={{ display: { xs: 'block', md: 'none' }, borderTop: `1px solid ${theme.palette.divider}` }}>
            <Container maxWidth="lg" sx={{ py: 2, display: 'grid', gap: 0.5 }}>
              {nav.map((l) => (
                <Button key={l.to} color="inherit" onClick={() => go(l.to)} sx={{ justifyContent: 'flex-start' }}>
                  {l.label}
                </Button>
              ))}
              <Stack direction="row" spacing={1} sx={{ mt: 1, display: { sm: 'none' } }}>{authActions}</Stack>
            </Container>
          </Box>
        )}
      </Box>

      <OfflineBanner />

      <Box component="main" sx={{ flex: 1 }}>{children}</Box>

      <Box component="footer" sx={{ bgcolor: '#1D1B20', color: '#fff', mt: 8 }}>
        <Container
          maxWidth="lg"
          sx={{
            py: { xs: 5, md: 7 },
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1.6fr 1fr 1fr' },
            gap: { xs: 4, md: 5 },
          }}
        >
          <Box>
            <Stack direction="row" spacing={1.25} alignItems="center">
              <Box component="img" src="/logo.png" alt="" sx={{ width: 38, height: 38 }} />
              <Typography sx={{ fontWeight: 800, fontSize: 21 }}>{S.appName}</Typography>
            </Stack>
            <Typography sx={{ opacity: 0.72, fontSize: 14.5, maxWidth: 420, mt: 1.5, lineHeight: 1.75 }}>
              {footerNote ?? S.public.footerAbout}
            </Typography>
            <Typography sx={{ opacity: 0.5, fontSize: 13, mt: 3 }}>{S.public.footerRights}</Typography>
          </Box>

          {nav.length > 0 && (
            <Box>
              <Typography sx={{ fontWeight: 700, fontSize: 15, mb: 1.5 }}>{S.public.footerQuickLinks}</Typography>
              <Stack spacing={1}>
                {nav.map((l) => (
                  <Typography
                    key={l.to}
                    onClick={() => go(l.to)}
                    sx={{ opacity: 0.72, fontSize: 14.5, cursor: 'pointer', '&:hover': { opacity: 1 } }}
                  >
                    {l.label}
                  </Typography>
                ))}
              </Stack>
            </Box>
          )}

          {phones.length > 0 && (
            <Box>
              <Typography sx={{ fontWeight: 700, fontSize: 15, mb: 1.5 }}>{S.public.footerPhones}</Typography>
              <Stack spacing={1}>
                {phones.map((p) => (
                  <Typography key={p.id} sx={{ opacity: 0.72, fontSize: 14.5 }}>
                    {p.title}: <PhoneLink phone={p.value} />
                  </Typography>
                ))}
              </Stack>
            </Box>
          )}
        </Container>
      </Box>
    </Box>
  );
}

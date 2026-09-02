import {
  AppBar,
  Avatar,
  Badge,
  Box,
  BottomNavigation,
  BottomNavigationAction,
  IconButton,
  Toolbar,
  Typography,
  useTheme,
} from '@mui/material';
import HomeRoundedIcon from '@mui/icons-material/HomeRounded';
import AssignmentTurnedInRoundedIcon from '@mui/icons-material/AssignmentTurnedInRounded';
import CampaignRoundedIcon from '@mui/icons-material/CampaignRounded';
import PersonRoundedIcon from '@mui/icons-material/PersonRounded';
import NotificationsNoneRoundedIcon from '@mui/icons-material/NotificationsNoneRounded';
import LightModeRoundedIcon from '@mui/icons-material/LightModeRounded';
import DarkModeRoundedIcon from '@mui/icons-material/DarkModeRounded';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { bnStrings as S } from '../../i18n';
import { useColorMode } from '../../theme/ColorModeContext';
import OfflineBanner from '../../components/OfflineBanner';
import { sampleNotices } from '../../data/citizen';

// Mobile-first citizen shell (SURAHA_BUILD_PROMPT §1.1(2)): top app bar + bottom navigation, content
// constrained to a phone-width column so it also reads well on desktop. The four tabs mirror the
// citizen area: home, my applications (track), notices (UNO updates), profile.
const TABS = [
  { to: '/citizen', label: S.citizen.home, icon: <HomeRoundedIcon /> },
  { to: '/citizen/applications', label: S.citizen.myApplications, icon: <AssignmentTurnedInRoundedIcon /> },
  { to: '/citizen/notices', label: S.citizen.notices, icon: <CampaignRoundedIcon /> },
  { to: '/citizen/profile', label: S.citizen.profile, icon: <PersonRoundedIcon /> },
];

export default function CitizenLayout() {
  const theme = useTheme();
  const { mode, toggle } = useColorMode();
  const nav = useNavigate();
  const loc = useLocation();
  const unreadNotices = sampleNotices.filter((n) => n.unread).length;

  // Active tab = the longest matching path (so /citizen/applications/CMP-1 keeps that tab lit).
  const active =
    [...TABS]
      .map((t) => t.to)
      .filter((to) => (to === '/citizen' ? loc.pathname === '/citizen' : loc.pathname.startsWith(to)))
      .sort((a, b) => b.length - a.length)[0] ?? '/citizen';

  return (
    <Box sx={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', bgcolor: 'background.default' }}>
      <AppBar position="sticky" elevation={0} color="default" sx={{ bgcolor: 'background.default' }}>
        <Toolbar sx={{ gap: 1 }}>
          <Box component="img" src="/logo.png" alt={S.appName} sx={{ width: 32, height: 32 }} />
          <Typography sx={{ fontSize: 22, fontWeight: 700, flex: 1 }}>{S.appName}</Typography>
          <IconButton onClick={toggle} size="small">
            {mode === 'light' ? <DarkModeRoundedIcon /> : <LightModeRoundedIcon />}
          </IconButton>
          <IconButton onClick={() => nav('/citizen/notices')} size="small">
            <Badge badgeContent={unreadNotices} color="error">
              <NotificationsNoneRoundedIcon />
            </Badge>
          </IconButton>
          <IconButton onClick={() => nav('/citizen/profile')} size="small">
            <Avatar sx={{ width: 30, height: 30, bgcolor: theme.palette.primary.main, fontSize: 15 }}>
              না
            </Avatar>
          </IconButton>
        </Toolbar>
        <OfflineBanner />
      </AppBar>

      {/* Content column — phone-width, centered on larger screens, padded above the bottom nav */}
      <Box sx={{ flex: 1, width: '100%', maxWidth: 640, mx: 'auto', px: 2, pt: 2, pb: 12 }}>
        <Outlet />
      </Box>

      <BottomNavigation
        value={active}
        onChange={(_, v) => nav(v)}
        showLabels
        sx={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          maxWidth: 640,
          mx: 'auto',
          borderTop: `1px solid ${theme.palette.divider}`,
          bgcolor: 'background.paper',
          height: 68,
        }}
      >
        {TABS.map((t) => (
          <BottomNavigationAction key={t.to} label={t.label} value={t.to} icon={t.icon} />
        ))}
      </BottomNavigation>
    </Box>
  );
}

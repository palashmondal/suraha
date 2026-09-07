import {
  Avatar,
  Badge,
  Box,
  Divider,
  IconButton,
  ListItemIcon,
  Menu,
  MenuItem,
  Tooltip,
  Typography,
} from '@mui/material';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { appPath } from '../appPath';
import KeyboardArrowDownRoundedIcon from '@mui/icons-material/KeyboardArrowDownRounded';
import NotificationsNoneRoundedIcon from '@mui/icons-material/NotificationsNoneRounded';
import LightModeRoundedIcon from '@mui/icons-material/LightModeRounded';
import DarkModeRoundedIcon from '@mui/icons-material/DarkModeRounded';
import HelpOutlineRoundedIcon from '@mui/icons-material/HelpOutlineRounded';
import PersonOutlineRoundedIcon from '@mui/icons-material/PersonOutlineRounded';
import LockResetRoundedIcon from '@mui/icons-material/LockResetRounded';
import LogoutRoundedIcon from '@mui/icons-material/LogoutRounded';
import { bnStrings as S } from '../i18n';
import { useColorMode } from '../theme/ColorModeContext';
import { startTour } from '../tour/tour';
import NotificationMenu from '../components/NotificationMenu';
import UnifiedSearch from '../components/UnifiedSearch';
import UpazilaSwitcher from './UpazilaSwitcher';
import { SIDEBAR_WIDTH } from './Sidebar';

/** Width of the search pill; half of it is the offset that puts it on the window's centre. */
const SEARCH_W = 480;
const BAR_PX = 24; // the bar's own horizontal padding (px: 3)
import { getNotifications, markAllNotificationsRead, markNotificationRead, type AppNotification } from '../api/notifications';
import { useAuth } from '../auth/AuthContext';
import { useSelectedTenant } from '../tenant/SelectedTenantContext';

export default function TopBar() {
  const navigate = useNavigate();
  const { mode, toggle } = useColorMode();
  const { user, logout } = useAuth();
  const { selectedUpazilaId } = useSelectedTenant();

  // The same box for everyone who has a list to search; the API scopes results to what the
  // role may open, so an FWA never sees a complaint they cannot read. SEAL searches on "সকল
  // উপজেলা" too — there the endpoint spans every upazila it oversees.
  const canSearch = user ? ['uno', 'fwa', 'up_sochib', 'seal_admin'].includes(user.role) : false;

  const [profileAnchor, setProfileAnchor] = useState<null | HTMLElement>(null);
  const [notifAnchor, setNotifAnchor] = useState<null | HTMLElement>(null);
  const [notifs, setNotifs] = useState<AppNotification[]>([]);
  const [unread, setUnread] = useState(0);

  const loadNotifs = () =>
    getNotifications()
      .then((r) => { setNotifs(r.notifications); setUnread(r.unread_count); })
      .catch(() => { setNotifs([]); setUnread(0); });

  useEffect(() => {
    loadNotifs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedUpazilaId]);

  // Opening a notification takes you to the record it is about. Marking it read is fire-and-
  // forget: the navigation should not wait on it, and a failure there is not worth blocking on.
  const openNotification = (n: AppNotification) => {
    setNotifAnchor(null);

    if (n.unread) {
      markNotificationRead(n.id).then(loadNotifs).catch(() => {});
    }

    if (n.link) navigate(appPath(n.link));
  };

  const doLogout = async () => {
    setProfileAnchor(null);
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <Box
      sx={{
        height: 72,
        px: 3,
        // Three columns, not a flex row: flex-grow shares out the FREE space, so a heavy right
        // side (the profile block) would still drag the middle off centre.
        display: 'grid',
        // The left column is sized so the middle lands on the WINDOW's centre line, not the
        // bar's — the bar starts after the sidebar, so centring inside it looks shifted right.
        // All of it is CSS, so it re-centres on resize and on folding the sidebar with no JS.
        gridTemplateColumns: `max(0px, calc(50vw - var(--sidebar-w, ${SIDEBAR_WIDTH}px) - ${BAR_PX + SEARCH_W / 2}px)) auto minmax(0, 1fr)`,
        alignItems: 'center',
        gap: 2,
        bgcolor: 'background.default',
      }}
    >
      {/* Left: the upazila switcher for the cross-tenant roles — nothing for everyone else,
          in which case the empty column is the counterweight that centres the middle. */}
      <Box sx={{ minWidth: 0, display: 'flex', alignItems: 'center' }}>
        <UpazilaSwitcher />
      </Box>

      {/* Middle: the search box, for the roles that have a list to search. */}
      <Box sx={{ minWidth: 0, display: 'flex', justifyContent: 'center' }}>
      {canSearch && <Box data-tour="search" sx={{ minWidth: 0, width: SEARCH_W, maxWidth: '100%' }}><UnifiedSearch /></Box>}
      </Box>

      {/* Right column: the controls, pushed to the far edge. */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 2, whiteSpace: 'nowrap' }}>
      {/* Replay the guided intro (§ tour) — the first-run tour points here as its last step. */}
      <Tooltip title={S.tour.start}>
        <IconButton data-tour="help" aria-label={S.tour.start} onClick={() => startTour()}>
          <HelpOutlineRoundedIcon />
        </IconButton>
      </Tooltip>

      {/* Theme toggle */}
      <Tooltip title={mode === 'light' ? 'ডার্ক মোড' : 'লাইট মোড'}>
        <IconButton onClick={toggle}>
          {mode === 'light' ? <DarkModeRoundedIcon /> : <LightModeRoundedIcon />}
        </IconButton>
      </Tooltip>

      {/* Notification bell (in-app notifications, §9) */}
      <IconButton data-tour="notifications" onClick={(e) => { setNotifAnchor(e.currentTarget); loadNotifs(); }}>
        <Badge badgeContent={unread} color="error" overlap="circular">
          <NotificationsNoneRoundedIcon />
        </Badge>
      </IconButton>
      <NotificationMenu
        anchorEl={notifAnchor}
        onClose={() => setNotifAnchor(null)}
        notifications={notifs}
        unreadCount={unread}
        onMarkAll={async () => { await markAllNotificationsRead(); loadNotifs(); }}
        onViewAll={() => { setNotifAnchor(null); navigate('/app/notifications'); }}
        onOpen={openNotification}
      />

      {/* Profile: name (bigger) + designation on the left, picture rightmost; opens menu */}
      <Box
        data-tour="profile"
        onClick={(e) => setProfileAnchor(e.currentTarget)}
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1.25,
          pl: 1.25,
          pr: 0.75,
          py: 0.5,
          ml: 0.5,
          cursor: 'pointer',
          borderRadius: 999,
          transition: 'background-color 120ms ease',
          '&:hover': { bgcolor: 'action.hover' },
          '&:hover .profile-name': { color: 'primary.main' },
          '&:hover .profile-caret': { color: 'primary.main', transform: 'translateY(1px)' },
          '&:hover .MuiAvatar-root': {
            boxShadow: (t) => `0 0 0 2px ${t.palette.primary.main}`,
          },
        }}
      >
        <Box
          sx={{
            display: { xs: 'none', sm: 'block' },
            textAlign: 'right',
            lineHeight: 1.25,
            flexShrink: 0, // the name gets the room it needs; it never wraps or gets clipped
          }}
        >
          <Typography
            className="profile-name"
            sx={{ fontSize: 16.5, fontWeight: 700, transition: 'color 120ms ease' }}
          >
            {user?.name ?? S.profile.name}
          </Typography>
          <Typography sx={{ fontSize: 12.5, color: 'text.secondary' }}>
            {user?.designation ?? user?.role_label_bn ?? S.profile.designation}
          </Typography>
        </Box>
        <Avatar
          src={user?.avatar_url ?? '/profile.jpg'}
          alt={user?.name ?? S.profile.name}
          sx={{
            width: 42,
            height: 42,
            bgcolor: 'transparent',
            transition: 'box-shadow 120ms ease',
            '& img': { objectFit: 'cover' },
          }}
        />
        <KeyboardArrowDownRoundedIcon
          className="profile-caret"
          sx={{ color: 'text.secondary', fontSize: 20, transition: 'color 120ms ease, transform 120ms ease' }}
        />
      </Box>
      <Menu
        anchorEl={profileAnchor}
        open={Boolean(profileAnchor)}
        onClose={() => setProfileAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{ paper: { sx: { minWidth: 210, borderRadius: '12px', mt: 1 } } }}
      >
        <MenuItem
          onClick={() => {
            setProfileAnchor(null);
            navigate('/app/profile');
          }}
        >
          <ListItemIcon>
            <PersonOutlineRoundedIcon fontSize="small" />
          </ListItemIcon>
          {S.profile.view}
        </MenuItem>
        <MenuItem
          onClick={() => {
            setProfileAnchor(null);
            navigate('/app/change-password');
          }}
        >
          <ListItemIcon>
            <LockResetRoundedIcon fontSize="small" />
          </ListItemIcon>
          {S.profile.changePassword}
        </MenuItem>
        <Divider />
        <MenuItem onClick={doLogout} sx={{ color: 'error.main' }}>
          <ListItemIcon>
            <LogoutRoundedIcon fontSize="small" sx={{ color: 'error.main' }} />
          </ListItemIcon>
          {S.profile.logout}
        </MenuItem>
      </Menu>
      </Box>
    </Box>
  );
}

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
  useTheme,
} from '@mui/material';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import KeyboardArrowDownRoundedIcon from '@mui/icons-material/KeyboardArrowDownRounded';
import NotificationsNoneRoundedIcon from '@mui/icons-material/NotificationsNoneRounded';
import LightModeRoundedIcon from '@mui/icons-material/LightModeRounded';
import DarkModeRoundedIcon from '@mui/icons-material/DarkModeRounded';
import LocationOnOutlinedIcon from '@mui/icons-material/LocationOnOutlined';
import PersonOutlineRoundedIcon from '@mui/icons-material/PersonOutlineRounded';
import LockResetRoundedIcon from '@mui/icons-material/LockResetRounded';
import LogoutRoundedIcon from '@mui/icons-material/LogoutRounded';
import { bnStrings as S } from '../i18n';
import { useColorMode } from '../theme/ColorModeContext';
import NotificationMenu from '../components/NotificationMenu';
import { getNotifications, markAllNotificationsRead, type AppNotification } from '../api/notifications';
import { useAuth } from '../auth/AuthContext';
import { useSelectedTenant } from '../tenant/SelectedTenantContext';
import { api } from '../api/client';

interface SwitchableUpazila {
  id: string;
  name_bn: string;
  district: string | null;
}

export default function TopBar() {
  const theme = useTheme();
  const navigate = useNavigate();
  const { mode, toggle } = useColorMode();
  const { user, logout } = useAuth();
  const { selectedUpazilaId, setSelectedUpazila } = useSelectedTenant();

  // The switcher only makes sense on the admin/console host, where a cross-tenant user (SEAL =
  // global, DC = district) has no fixed tenant. On a upazila subdomain (e.g. golachipa.lvh.me)
  // the tenant is pinned by the URL, so NO ONE sees the switcher — not even SEAL/DC.
  const firstLabel = window.location.hostname.split('.')[0];
  const isConsoleHost =
    firstLabel === 'admin' ||
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1';
  const canSwitch = user ? user.scope !== 'tenant' && isConsoleHost : false;

  // Upazila switcher — real list from the registry (SEAL: all, DC: own district, §4).
  const [upazilas, setUpazilas] = useState<SwitchableUpazila[]>([]);
  const [current, setCurrent] = useState<string>(
    user?.upazila ? `${user.upazila.name_bn} উপজেলা` : S.appName,
  );
  const [anchor, setAnchor] = useState<null | HTMLElement>(null);
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

  const label = (u: SwitchableUpazila) => `${u.name_bn} উপজেলা${u.district ? `, ${u.district}` : ''}`;

  useEffect(() => {
    if (!canSwitch) return;
    api<{ upazilas: SwitchableUpazila[] }>('/registry/switchable-upazilas')
      .then((r) => {
        setUpazilas(r.upazilas);
        // Restore the label for a previously-selected upazila (persisted across refresh).
        const sel = r.upazilas.find((u) => u.id === selectedUpazilaId);
        if (sel) setCurrent(label(sel));
      })
      .catch(() => setUpazilas([]));
  }, [canSwitch, selectedUpazilaId]);

  const chooseUpazila = (u: SwitchableUpazila) => {
    setSelectedUpazila(u.id); // updates X-Upazila header + bumps version → consumers refetch
    setCurrent(label(u));
    setAnchor(null);
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
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        bgcolor: 'background.default',
      }}
    >
      {/* Upazila switcher — cross-tenant roles only (SEAL/DC) */}
      {canSwitch && (
        <>
          <Box
            onClick={(e) => setAnchor(e.currentTarget)}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              px: 2,
              py: 1.1,
              minWidth: 300,
              borderRadius: 999,
              cursor: 'pointer',
              bgcolor: theme.suraha.switcher,
            }}
          >
            <LocationOnOutlinedIcon sx={{ fontSize: 20, color: 'text.secondary' }} />
            <Typography sx={{ flex: 1, fontSize: 15, fontWeight: 500 }}>{current}</Typography>
            <KeyboardArrowDownRoundedIcon sx={{ color: 'text.secondary' }} />
          </Box>
          <Menu anchorEl={anchor} open={Boolean(anchor)} onClose={() => setAnchor(null)}>
            {upazilas.length === 0 && <MenuItem disabled>{S.common.noData}</MenuItem>}
            {upazilas.map((u) => (
              <MenuItem
                key={u.id}
                selected={label(u) === current}
                onClick={() => chooseUpazila(u)}
              >
                {label(u)}
              </MenuItem>
            ))}
          </Menu>
        </>
      )}

      <Box sx={{ flex: 1 }} />

      {/* Theme toggle */}
      <Tooltip title={mode === 'light' ? 'ডার্ক মোড' : 'লাইট মোড'}>
        <IconButton onClick={toggle}>
          {mode === 'light' ? <DarkModeRoundedIcon /> : <LightModeRoundedIcon />}
        </IconButton>
      </Tooltip>

      {/* Notification bell (in-app notifications, §9) */}
      <IconButton onClick={(e) => { setNotifAnchor(e.currentTarget); loadNotifs(); }}>
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
        onViewAll={() => { setNotifAnchor(null); navigate('/notifications'); }}
      />

      {/* Profile: name (bigger) + designation on the left, picture rightmost; opens menu */}
      <Box
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
        <Box sx={{ display: { xs: 'none', sm: 'block' }, textAlign: 'right', lineHeight: 1.25 }}>
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
          src={user?.avatar_url ?? '/bd_logo_bn.png'}
          alt={user?.name ?? S.profile.name}
          sx={{
            width: 42,
            height: 42,
            bgcolor: 'transparent',
            transition: 'box-shadow 120ms ease',
            '& img': { objectFit: 'contain' },
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
            navigate('/profile');
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
            navigate('/profile');
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
  );
}

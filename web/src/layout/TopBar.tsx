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
import HelpOutlineRoundedIcon from '@mui/icons-material/HelpOutlineRounded';
import LocationOnOutlinedIcon from '@mui/icons-material/LocationOnOutlined';
import PersonOutlineRoundedIcon from '@mui/icons-material/PersonOutlineRounded';
import LockResetRoundedIcon from '@mui/icons-material/LockResetRounded';
import LogoutRoundedIcon from '@mui/icons-material/LogoutRounded';
import { bnStrings as S } from '../i18n';
import { useColorMode } from '../theme/ColorModeContext';
import { startTour } from '../tour/tour';
import NotificationMenu from '../components/NotificationMenu';
import UnifiedSearch from '../components/UnifiedSearch';
import { getNotifications, markAllNotificationsRead, markNotificationRead, type AppNotification } from '../api/notifications';
import { useAuth } from '../auth/AuthContext';
import { useSelectedTenant } from '../tenant/SelectedTenantContext';
import { useHostContext } from '../tenant/host';
import { api } from '../api/client';
import type { SwitchableUpazila } from '../api/registry';

export default function TopBar() {
  const theme = useTheme();
  const navigate = useNavigate();
  const { mode, toggle } = useColorMode();
  const { user, logout } = useAuth();
  const { selectedUpazilaId, selectedUpazilaLabel, setSelectedUpazila } = useSelectedTenant();
  const host = useHostContext();

  // The switcher makes sense wherever a cross-tenant user has no fixed tenant: SEAL on the
  // central host, the DC on its district host. Both pick an upazila via the X-Upazila header.
  // On a upazila subdomain the tenant is pinned by the URL, so NO ONE sees the switcher.
  // The same box for everyone who has a list to search; the API scopes results to what the
  // role may open, so an FWA never sees a complaint they cannot read.
  const canSearch = user ? ['uno', 'fwa', 'up_sochib'].includes(user.role) : false;
  const isAggregateHost = host?.kind === 'central' || host?.kind === 'district';
  const canSwitch = user ? user.scope !== 'tenant' && isAggregateHost : false;

  // Upazila switcher — real list from the registry (SEAL: all, DC: own district, §4).
  // Cross-tenant roles default to the aggregate view ("সকল উপজেলা") until they pick one upazila.
  // The displayed label comes from the persisted selection so it survives per-navigation remounts
  // (no flash back to "সকল উপজেলা").
  const current = selectedUpazilaLabel ?? S.common.allUpazilas;
  const [upazilas, setUpazilas] = useState<SwitchableUpazila[]>([]);
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
      .then((r) => setUpazilas(r.upazilas))
      .catch(() => setUpazilas([]));
  }, [canSwitch]);

  const chooseUpazila = (u: SwitchableUpazila) => {
    // Persist id (X-Upazila) + label so both data scope and the switcher label survive navigation.
    setSelectedUpazila(u.id, label(u));
    setAnchor(null);
  };

  const chooseAll = () => {
    setSelectedUpazila(null); // clears X-Upazila → API returns the cross-tenant aggregate
    setAnchor(null);
  };

  // Opening a notification takes you to the record it is about. Marking it read is fire-and-
  // forget: the navigation should not wait on it, and a failure there is not worth blocking on.
  const openNotification = (n: AppNotification) => {
    setNotifAnchor(null);

    if (n.unread) {
      markNotificationRead(n.id).then(loadNotifs).catch(() => {});
    }

    if (n.link) navigate(n.link);
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
        // side (the profile block) still drags the middle left of centre. Two minmax(0,1fr)
        // columns are equal by construction, which puts the middle column on the true centre
        // whatever sits beside it.
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 560px) minmax(0, 1fr)',
        alignItems: 'center',
        gap: 2,
        bgcolor: 'background.default',
      }}
    >
      {/* Left column, deliberately empty — it is the counterweight that centres the middle. */}
      <Box />

      {/* Middle: the UNO's search, or the upazila switcher for the roles that have one. */}
      <Box sx={{ minWidth: 0, display: 'flex', justifyContent: 'center' }}>
      {canSearch && <Box data-tour="search" sx={{ minWidth: 0, flex: 1 }}><UnifiedSearch /></Box>}

      {canSwitch && (
        <>
          <Box
            data-tour="search"
            onClick={(e) => setAnchor(e.currentTarget)}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              px: 2,
              py: 1.1,
              minWidth: 420,
              borderRadius: 999,
              cursor: 'pointer',
              bgcolor: theme.suraha.switcher,
            }}
          >
            <LocationOnOutlinedIcon sx={{ fontSize: 20, color: 'text.secondary' }} />
            <Typography sx={{ flex: 1, fontSize: 15, fontWeight: 500 }}>{current}</Typography>
            <KeyboardArrowDownRoundedIcon sx={{ color: 'text.secondary' }} />
          </Box>
          <Menu
            anchorEl={anchor}
            open={Boolean(anchor)}
            onClose={() => setAnchor(null)}
            slotProps={{ paper: { sx: { minWidth: 420, borderRadius: '12px', mt: 1 } } }}
          >
            <MenuItem selected={!selectedUpazilaId} onClick={chooseAll}>
              {S.common.allUpazilas}
            </MenuItem>
            {upazilas.map((u) => (
              <MenuItem
                key={u.id}
                selected={u.id === selectedUpazilaId}
                onClick={() => chooseUpazila(u)}
              >
                {label(u)}
              </MenuItem>
            ))}
          </Menu>
        </>
      )}

      </Box>

      {/* Right column: the controls, pushed to the far edge. */}
      <Box sx={{ minWidth: 0, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 2 }}>
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
        onViewAll={() => { setNotifAnchor(null); navigate('/notifications'); }}
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
            navigate('/change-password');
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

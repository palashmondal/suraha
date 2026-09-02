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
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import MenuRoundedIcon from '@mui/icons-material/MenuRounded';
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
import { useAuth } from '../auth/AuthContext';
import NotificationMenu from '../components/NotificationMenu';
import { unreadCount } from '../data/notifications';

// Sample upazilas for the switcher (real list comes from the shared registry, §4).
const upazilas = ['গলাচিপা উপজেলা, বরিশাল', 'দুমুরিয়া উপজেলা, খুলনা', 'মিরপুর উপজেলা, কুষ্টিয়া'];

export default function TopBar({ onMenuClick }: { onMenuClick?: () => void } = {}) {
  const theme = useTheme();
  const nav = useNavigate();
  const { mode, toggle } = useColorMode();
  const { user, logout } = useAuth();
  const [current, setCurrent] = useState(user?.upazila ?? upazilas[0]);
  const [anchor, setAnchor] = useState<null | HTMLElement>(null);
  const [profileAnchor, setProfileAnchor] = useState<null | HTMLElement>(null);
  const [notifAnchor, setNotifAnchor] = useState<null | HTMLElement>(null);

  const onLogout = () => {
    setProfileAnchor(null);
    logout();
    nav('/login', { replace: true });
  };

  return (
    <Box
      sx={{
        height: 72,
        px: { xs: 1.5, md: 3 },
        display: 'flex',
        alignItems: 'center',
        gap: { xs: 1, md: 2 },
        bgcolor: 'background.default',
      }}
    >
      {onMenuClick ? (
        <IconButton onClick={onMenuClick} edge="start" aria-label="menu">
          <MenuRoundedIcon />
        </IconButton>
      ) : null}

      {/* Upazila switcher */}
      <Box
        onClick={(e) => setAnchor(e.currentTarget)}
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          px: 2,
          py: 1.1,
          minWidth: { xs: 0, sm: 300 },
          maxWidth: { xs: 220, sm: 'none' },
          borderRadius: 999,
          cursor: 'pointer',
          bgcolor: theme.suraha.switcher,
        }}
      >
        <LocationOnOutlinedIcon sx={{ fontSize: 20, color: 'text.secondary', flexShrink: 0 }} />
        <Typography noWrap sx={{ flex: 1, fontSize: 15, fontWeight: 500 }}>{current}</Typography>
        <KeyboardArrowDownRoundedIcon sx={{ color: 'text.secondary', flexShrink: 0 }} />
      </Box>
      <Menu anchorEl={anchor} open={Boolean(anchor)} onClose={() => setAnchor(null)}>
        {upazilas.map((u) => (
          <MenuItem
            key={u}
            selected={u === current}
            onClick={() => {
              setCurrent(u);
              setAnchor(null);
            }}
          >
            {u}
          </MenuItem>
        ))}
      </Menu>

      <Box sx={{ flex: 1 }} />

      {/* Theme toggle */}
      <Tooltip title={mode === 'light' ? 'ডার্ক মোড' : 'লাইট মোড'}>
        <IconButton onClick={toggle}>
          {mode === 'light' ? <DarkModeRoundedIcon /> : <LightModeRoundedIcon />}
        </IconButton>
      </Tooltip>

      {/* Notification bell (in-app notifications, §9) */}
      <IconButton onClick={(e) => setNotifAnchor(e.currentTarget)}>
        <Badge badgeContent={unreadCount} color="error" overlap="circular">
          <NotificationsNoneRoundedIcon />
        </Badge>
      </IconButton>
      <NotificationMenu anchorEl={notifAnchor} onClose={() => setNotifAnchor(null)} />

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
            {user?.designation ?? S.profile.designation}
          </Typography>
        </Box>
        <Avatar
          src="/bd_logo_bn.png"
          alt={S.profile.name}
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
        <MenuItem onClick={() => setProfileAnchor(null)}>
          <ListItemIcon>
            <PersonOutlineRoundedIcon fontSize="small" />
          </ListItemIcon>
          {S.profile.view}
        </MenuItem>
        <MenuItem onClick={() => setProfileAnchor(null)}>
          <ListItemIcon>
            <LockResetRoundedIcon fontSize="small" />
          </ListItemIcon>
          {S.profile.changePassword}
        </MenuItem>
        <Divider />
        <MenuItem onClick={onLogout} sx={{ color: 'error.main' }}>
          <ListItemIcon>
            <LogoutRoundedIcon fontSize="small" sx={{ color: 'error.main' }} />
          </ListItemIcon>
          {S.profile.logout}
        </MenuItem>
      </Menu>
    </Box>
  );
}

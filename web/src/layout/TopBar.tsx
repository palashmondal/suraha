import {
  Avatar,
  Badge,
  Box,
  IconButton,
  Menu,
  MenuItem,
  Tooltip,
  Typography,
  useTheme,
} from '@mui/material';
import { useState } from 'react';
import KeyboardArrowDownRoundedIcon from '@mui/icons-material/KeyboardArrowDownRounded';
import NotificationsNoneRoundedIcon from '@mui/icons-material/NotificationsNoneRounded';
import LightModeRoundedIcon from '@mui/icons-material/LightModeRounded';
import DarkModeRoundedIcon from '@mui/icons-material/DarkModeRounded';
import LocationOnOutlinedIcon from '@mui/icons-material/LocationOnOutlined';
import { bnStrings as S } from '../i18n';
import { useColorMode } from '../theme/ColorModeContext';

// Sample upazilas for the switcher (real list comes from the shared registry, §4).
const upazilas = ['গলাচিপা উপজেলা, বরিশাল', 'দুমুরিয়া উপজেলা, খুলনা', 'মিরপুর উপজেলা, কুষ্টিয়া'];

export default function TopBar() {
  const theme = useTheme();
  const { mode, toggle } = useColorMode();
  const [current, setCurrent] = useState(upazilas[0]);
  const [anchor, setAnchor] = useState<null | HTMLElement>(null);

  return (
    <Box
      sx={{
        height: 72,
        px: 3,
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        borderBottom: '1px solid',
        borderColor: 'divider',
        bgcolor: 'background.paper',
      }}
    >
      {/* Upazila switcher */}
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
          border: '1px solid',
          borderColor: 'divider',
          bgcolor: theme.palette.mode === 'light' ? '#F4F1FA' : 'rgba(255,255,255,0.04)',
        }}
      >
        <LocationOnOutlinedIcon sx={{ fontSize: 20, color: 'text.secondary' }} />
        <Typography sx={{ flex: 1, fontSize: 15, fontWeight: 500 }}>{current}</Typography>
        <KeyboardArrowDownRoundedIcon sx={{ color: 'text.secondary' }} />
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
      <IconButton>
        <Badge color="error" variant="dot" overlap="circular">
          <NotificationsNoneRoundedIcon />
        </Badge>
      </IconButton>

      {/* Profile: avatar + name + role */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, pl: 1 }}>
        <Avatar sx={{ width: 38, height: 38, bgcolor: 'primary.main', fontSize: 15 }}>মু</Avatar>
        <Box sx={{ display: { xs: 'none', sm: 'block' }, lineHeight: 1.2 }}>
          <Typography sx={{ fontSize: 14.5, fontWeight: 600 }}>মুহাম্মাদুল্লাহ</Typography>
          <Typography sx={{ fontSize: 12.5, color: 'text.secondary' }}>
            {S.common.role.admin}
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}

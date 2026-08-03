import { Avatar, Box, Button, Divider, Menu, Typography, useTheme } from '@mui/material';
import type { Theme } from '@mui/material/styles';
import PregnantWomanRoundedIcon from '@mui/icons-material/PregnantWomanRounded';
import ChildFriendlyRoundedIcon from '@mui/icons-material/ChildFriendlyRounded';
import CampaignRoundedIcon from '@mui/icons-material/CampaignRounded';
import EventAvailableRoundedIcon from '@mui/icons-material/EventAvailableRounded';
import type { ReactNode } from 'react';
import { bnStrings as S } from '../i18n';
import { bn } from '../utils/bnNum';
import { notifications, unreadCount, type NotifModule } from '../data/notifications';

// Per-module icon + accent color for the leading avatar, consistent with the dashboard
// module accents and status-pill palette.
function moduleStyle(theme: Theme, m: NotifModule): { color: string; icon: ReactNode } {
  const map: Record<NotifModule, { color: string; icon: ReactNode }> = {
    pregnancy: { color: theme.palette.primary.main, icon: <PregnantWomanRoundedIcon fontSize="small" /> },
    birth: { color: theme.suraha.module.birth, icon: <ChildFriendlyRoundedIcon fontSize="small" /> },
    complaint: { color: theme.suraha.countBadge, icon: <CampaignRoundedIcon fontSize="small" /> },
    appointment: { color: theme.suraha.status.info.fg, icon: <EventAvailableRoundedIcon fontSize="small" /> },
  };
  return map[m];
}

export default function NotificationMenu({
  anchorEl,
  onClose,
}: {
  anchorEl: HTMLElement | null;
  onClose: () => void;
}) {
  const theme = useTheme();

  return (
    <Menu
      anchorEl={anchorEl}
      open={Boolean(anchorEl)}
      onClose={onClose}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      slotProps={{
        paper: { sx: { width: 380, maxWidth: '92vw', borderRadius: '12px', mt: 1, overflow: 'hidden' } },
        list: { sx: { p: 0 } },
      }}
    >
      {/* Header */}
      <Box sx={{ px: 2, py: 1.75, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography sx={{ fontSize: 17, fontWeight: 700 }}>{S.notifications.title}</Typography>
          {unreadCount > 0 ? (
            <Box
              component="span"
              sx={{
                bgcolor: theme.suraha.countBadge,
                color: '#fff',
                fontSize: 12,
                fontWeight: 600,
                px: 0.9,
                py: 0.4,
                borderRadius: 999,
              }}
            >
              {bn(unreadCount)} {S.notifications.unreadSuffix}
            </Box>
          ) : null}
        </Box>
        <Button size="small" sx={{ minWidth: 0, px: 1, fontSize: 12.5 }}>
          {S.notifications.markAll}
        </Button>
      </Box>
      <Divider />

      {/* List */}
      <Box sx={{ maxHeight: 420, overflowY: 'auto' }}>
        {notifications.map((n, i) => {
          const { color, icon } = moduleStyle(theme, n.module);
          return (
            <Box key={n.id}>
              <Box
                onClick={onClose}
                sx={{
                  px: 2,
                  py: 1.5,
                  display: 'flex',
                  gap: 1.5,
                  alignItems: 'flex-start',
                  cursor: 'pointer',
                  bgcolor: n.unread
                    ? theme.palette.mode === 'light'
                      ? 'rgba(103,80,164,0.05)'
                      : 'rgba(232,222,248,0.06)'
                    : 'transparent',
                  '&:hover': { bgcolor: 'action.hover' },
                }}
              >
                <Avatar
                  sx={{ width: 38, height: 38, bgcolor: `${color}1F`, color, flexShrink: 0 }}
                >
                  {icon}
                </Avatar>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography sx={{ fontSize: 14.5, fontWeight: 600, lineHeight: 1.35 }}>
                    {n.title}
                  </Typography>
                  <Typography sx={{ fontSize: 13, color: 'text.secondary', mt: 0.25 }}>
                    {n.detail}
                  </Typography>
                  <Typography sx={{ fontSize: 12, color: 'text.secondary', mt: 0.5 }}>
                    {n.time}
                  </Typography>
                </Box>
                {n.unread ? (
                  <Box
                    sx={{ width: 9, height: 9, borderRadius: '50%', bgcolor: 'primary.main', mt: 0.75, flexShrink: 0 }}
                  />
                ) : null}
              </Box>
              {i < notifications.length - 1 ? <Divider /> : null}
            </Box>
          );
        })}
      </Box>

      {/* Footer */}
      <Divider />
      <Box sx={{ p: 1 }}>
        <Button fullWidth onClick={onClose} sx={{ borderRadius: '8px', fontSize: 13.5 }}>
          {S.notifications.viewAll}
        </Button>
      </Box>
    </Menu>
  );
}

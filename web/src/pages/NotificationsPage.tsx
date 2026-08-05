import { useEffect, useState } from 'react';
import { Avatar, Box, Button, Chip, Paper, Typography, useTheme } from '@mui/material';
import CheckRoundedIcon from '@mui/icons-material/CheckRounded';
import { bnStrings as S } from '../i18n';
import { bn } from '../utils/bnNum';
import { formatDateTime } from '../utils/timeAgo';
import { moduleStyle } from '../components/notificationStyle';
import EmptyState from '../components/EmptyState';
import LoadingState from '../components/LoadingState';
import PaginationBar from '../components/PaginationBar';
import { usePagination } from '../components/usePagination';
import { useSelectedTenant } from '../tenant/SelectedTenantContext';
import {
  getAllNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type AppNotification,
} from '../api/notifications';

export default function NotificationsPage() {
  const theme = useTheme();
  const { version } = useSelectedTenant();
  const [items, setItems] = useState<AppNotification[] | null>(null);
  const [unread, setUnread] = useState(0);

  const load = () =>
    getAllNotifications()
      .then((r) => { setItems(r.notifications); setUnread(r.unread_count); })
      .catch(() => { setItems([]); setUnread(0); });

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [version]);

  const markOne = async (id: number) => {
    await markNotificationRead(id);
    setItems((cur) => cur?.map((n) => (n.id === id ? { ...n, unread: false } : n)) ?? cur);
    setUnread((u) => Math.max(0, u - 1));
  };

  const markAll = async () => {
    await markAllNotificationsRead();
    setItems((cur) => cur?.map((n) => ({ ...n, unread: false })) ?? cur);
    setUnread(0);
  };

  const { pageRows, page, setPage, pageSize, setPageSize, pageCount } = usePagination(items ?? []);

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3, flexWrap: 'wrap' }}>
        <Typography variant="h5">{S.notifications.pageTitle}</Typography>
        {unread > 0 && (
          <Chip label={`${bn(unread)} ${S.notifications.unreadSuffix}`} color="error" size="small" />
        )}
        <Box sx={{ flex: 1 }} />
        <Button variant="outlined" size="small" onClick={markAll} disabled={unread === 0} sx={{ borderRadius: '8px' }}>
          {S.notifications.markAll}
        </Button>
      </Box>

      {items === null ? (
        <Paper elevation={0} sx={{ borderRadius: '16px' }}><LoadingState /></Paper>
      ) : items.length === 0 ? (
        <Paper elevation={0} sx={{ borderRadius: '16px' }}><EmptyState title={S.notifications.empty} /></Paper>
      ) : (
        <Paper elevation={0} sx={{ borderRadius: '16px', overflow: 'hidden', border: (t) => `1px solid ${t.palette.divider}` }}>
          {pageRows.map((n, i) => {
            const { color, icon } = moduleStyle(theme, n.module);
            const dt = formatDateTime(n.created_at);
            return (
              <Box
                key={n.id}
                sx={{
                  px: { xs: 2, md: 2.5 },
                  py: 2,
                  display: 'flex',
                  gap: 1.75,
                  alignItems: 'flex-start',
                  borderBottom: i < pageRows.length - 1 ? '1px solid' : 'none',
                  borderColor: 'divider',
                  bgcolor: n.unread
                    ? theme.palette.mode === 'light' ? 'rgba(103,80,164,0.05)' : 'rgba(232,222,248,0.06)'
                    : 'transparent',
                }}
              >
                <Avatar sx={{ width: 42, height: 42, bgcolor: `${color}1F`, color, flexShrink: 0 }}>{icon}</Avatar>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography sx={{ fontSize: 15, fontWeight: 600 }}>{n.title}</Typography>
                    {n.unread && <Box sx={{ width: 9, height: 9, borderRadius: '50%', bgcolor: 'primary.main', flexShrink: 0 }} />}
                  </Box>
                  {n.detail && (
                    <Typography sx={{ fontSize: 13.5, color: 'text.secondary', mt: 0.5 }}>{n.detail}</Typography>
                  )}
                  <Typography sx={{ fontSize: 12.5, color: 'text.secondary', mt: 0.75 }}>
                    {dt.date} · {dt.time}
                  </Typography>
                </Box>
                <Box sx={{ flexShrink: 0 }}>
                  {n.unread ? (
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={<CheckRoundedIcon />}
                      onClick={() => markOne(n.id)}
                      sx={{ borderRadius: '8px', whiteSpace: 'nowrap' }}
                    >
                      {S.notifications.markRead}
                    </Button>
                  ) : (
                    <Typography sx={{ fontSize: 12.5, color: 'text.disabled' }}>{S.notifications.readState}</Typography>
                  )}
                </Box>
              </Box>
            );
          })}
          <PaginationBar page={page} pageCount={pageCount} pageSize={pageSize} onPage={setPage} onPageSize={setPageSize} />
        </Paper>
      )}
    </Box>
  );
}

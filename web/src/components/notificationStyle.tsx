import type { Theme } from '@mui/material/styles';
import type { ReactNode } from 'react';
import PregnantWomanRoundedIcon from '@mui/icons-material/PregnantWomanRounded';
import ChildFriendlyRoundedIcon from '@mui/icons-material/ChildFriendlyRounded';
import CampaignRoundedIcon from '@mui/icons-material/CampaignRounded';
import EventAvailableRoundedIcon from '@mui/icons-material/EventAvailableRounded';
import VolunteerActivismRoundedIcon from '@mui/icons-material/VolunteerActivismRounded';
import ForumRoundedIcon from '@mui/icons-material/ForumRounded';
import NotificationsNoneRoundedIcon from '@mui/icons-material/NotificationsNoneRounded';
import type { AppNotification } from '../api/notifications';

type NotifModule = AppNotification['module'];

// Per-module icon + accent color for a notification's leading avatar, consistent with the
// dashboard module accents and status-pill palette. Shared by the bell menu and the full page.
/**
 * Falls back to a neutral bell for a module this build does not know about. A notification type
 * added on the server must never be able to blank the page: the previous lookup returned
 * undefined for an unknown module, and destructuring that threw during render.
 */
export function moduleStyle(theme: Theme, m: NotifModule): { color: string; icon: ReactNode } {
  const map: Partial<Record<NotifModule, { color: string; icon: ReactNode }>> = {
    pregnancy: { color: theme.palette.primary.main, icon: <PregnantWomanRoundedIcon fontSize="small" /> },
    birth: { color: theme.suraha.module.birth, icon: <ChildFriendlyRoundedIcon fontSize="small" /> },
    complaint: { color: theme.suraha.countBadge, icon: <CampaignRoundedIcon fontSize="small" /> },
    appointment: { color: theme.suraha.status.info.fg, icon: <EventAvailableRoundedIcon fontSize="small" /> },
    assistance: { color: theme.suraha.module.officer, icon: <VolunteerActivismRoundedIcon fontSize="small" /> },
    suggestion: { color: theme.suraha.module.birthAlt, icon: <ForumRoundedIcon fontSize="small" /> },
  };

  return map[m] ?? {
    color: theme.palette.text.secondary,
    icon: <NotificationsNoneRoundedIcon fontSize="small" />,
  };
}

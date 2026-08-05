import type { Theme } from '@mui/material/styles';
import type { ReactNode } from 'react';
import PregnantWomanRoundedIcon from '@mui/icons-material/PregnantWomanRounded';
import ChildFriendlyRoundedIcon from '@mui/icons-material/ChildFriendlyRounded';
import CampaignRoundedIcon from '@mui/icons-material/CampaignRounded';
import EventAvailableRoundedIcon from '@mui/icons-material/EventAvailableRounded';
import type { AppNotification } from '../api/notifications';

type NotifModule = AppNotification['module'];

// Per-module icon + accent color for a notification's leading avatar, consistent with the
// dashboard module accents and status-pill palette. Shared by the bell menu and the full page.
export function moduleStyle(theme: Theme, m: NotifModule): { color: string; icon: ReactNode } {
  const map: Record<NotifModule, { color: string; icon: ReactNode }> = {
    pregnancy: { color: theme.palette.primary.main, icon: <PregnantWomanRoundedIcon fontSize="small" /> },
    birth: { color: theme.suraha.module.birth, icon: <ChildFriendlyRoundedIcon fontSize="small" /> },
    complaint: { color: theme.suraha.countBadge, icon: <CampaignRoundedIcon fontSize="small" /> },
    appointment: { color: theme.suraha.status.info.fg, icon: <EventAvailableRoundedIcon fontSize="small" /> },
  };
  return map[m];
}

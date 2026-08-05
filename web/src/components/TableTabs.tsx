import { Box, Typography, useTheme } from '@mui/material';
import { bn } from '../utils/bnNum';
import type { StatusTone } from './StatusPill';

export interface TableTab {
  key: string;
  label: string;
  total?: number; // kept for API compatibility; no longer rendered inline
  newCount?: number; // shown as a small circular count badge next to the label
  newTone?: StatusTone; // badge colour (default danger/red)
}

// Tab bar above a list table. Each tab is a Bangla label with an optional circular count badge;
// the active tab gets bold text and a purple underline (see প্রসূতি তালিকা design reference).
export default function TableTabs({
  tabs,
  active,
  onChange,
}: {
  tabs: TableTab[];
  active: string;
  onChange: (key: string) => void;
}) {
  const theme = useTheme();

  return (
    <Box
      sx={{
        display: 'flex',
        gap: 3,
        borderBottom: `1px solid ${theme.palette.divider}`,
        overflowX: 'auto',
      }}
    >
      {tabs.map((t) => {
        const isActive = t.key === active;
        const badge = t.newTone ? theme.suraha.status[t.newTone] : theme.suraha.status.danger;
        return (
          <Box
            key={t.key}
            onClick={() => onChange(t.key)}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              px: 1,
              py: 1.5,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              borderBottom: isActive
                ? `2px solid ${theme.palette.primary.main}`
                : '2px solid transparent',
              mb: '-1px',
            }}
          >
            <Typography
              sx={{
                fontSize: 15,
                fontWeight: isActive ? 700 : 600,
                color: isActive ? 'primary.main' : 'text.secondary',
              }}
            >
              {t.label}
            </Typography>
            {t.newCount ? (
              <Box
                component="span"
                sx={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minWidth: 20,
                  height: 20,
                  px: 0.5,
                  borderRadius: 999,
                  fontSize: 11.5,
                  fontWeight: 700,
                  bgcolor: badge.bg,
                  color: badge.fg,
                }}
              >
                {bn(t.newCount)}
              </Box>
            ) : null}
          </Box>
        );
      })}
    </Box>
  );
}

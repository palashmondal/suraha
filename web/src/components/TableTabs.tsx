import { Box, Typography, useTheme } from '@mui/material';
import StarRoundedIcon from '@mui/icons-material/StarRounded';
import { bnStrings as S } from '../i18n';
import { bn } from '../utils/bnNum';
import type { StatusTone } from './StatusPill';

export interface TableTab {
  key: string;
  label: string;
  total?: number; // shown as "মোট N"
  newCount?: number; // shown as an "N new" badge
  newTone?: StatusTone; // badge colour (default pending/amber)
}

// Tab bar above a list table (concept_ui/Frame 1171277087.png & 1321316786.png): each tab has a
// leading icon, a Bangla label, a "মোট N" count, and an optional "N new" pill. The active tab
// gets a soft lavender top and a purple bottom border.
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
        gap: 1,
        borderBottom: `1px solid ${theme.palette.divider}`,
        overflowX: 'auto',
      }}
    >
      {tabs.map((t) => {
        const isActive = t.key === active;
        const badge = t.newTone ? theme.suraha.status[t.newTone] : theme.suraha.status.pending;
        return (
          <Box
            key={t.key}
            onClick={() => onChange(t.key)}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              px: 2.5,
              py: 1.5,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              borderTopLeftRadius: 12,
              borderTopRightRadius: 12,
              borderBottom: isActive
                ? `2px solid ${theme.palette.primary.main}`
                : '2px solid transparent',
              bgcolor: isActive ? theme.suraha.activePillBg : 'transparent',
              '&:hover': { bgcolor: isActive ? theme.suraha.activePillBg : theme.palette.action.hover },
            }}
          >
            <StarRoundedIcon
              sx={{ fontSize: 20, color: isActive ? 'primary.main' : 'text.secondary' }}
            />
            <Box>
              <Typography
                sx={{ fontSize: 14.5, fontWeight: isActive ? 700 : 600, lineHeight: 1.2 }}
              >
                {t.label}
              </Typography>
              {t.total !== undefined && (
                <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>
                  {S.common.total} {bn(t.total)}
                </Typography>
              )}
            </Box>
            {t.newCount ? (
              <Box
                component="span"
                sx={{
                  ml: 0.5,
                  px: 1,
                  py: 0.25,
                  borderRadius: 999,
                  fontSize: 11.5,
                  fontWeight: 700,
                  bgcolor: badge.bg,
                  color: badge.fg,
                }}
              >
                {bn(t.newCount)} {S.common.newSuffix}
              </Box>
            ) : null}
          </Box>
        );
      })}
    </Box>
  );
}

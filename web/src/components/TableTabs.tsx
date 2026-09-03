import { Box, Typography, useTheme } from '@mui/material';
import { bn } from '../utils/bnNum';
import type { StatusTone } from './StatusPill';

export interface TableTab {
  key: string;
  label: string;
  /** How many records the tab holds — what the badge shows. */
  total?: number;
  /** Badge colour (default danger/red). */
  tone?: StatusTone;
}

// Tab bar above a list table: a Bangla label with a circular count of what the tab holds, the
// active one bold and underlined (প্রসূতি তালিকা design reference).
//
// The badge used to show records added in the last seven days, which read as the tab's own count
// and was wrong by that much — ডেলিভারি হয়েছে said ১ beside nineteen delivered mothers. Every
// other list passed only a total and so showed no badge at all.
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
        // The tab row scrolls sideways on a narrow screen, never up and down: `overflow-x: auto`
        // alone computes overflow-y to `auto` as well, so a sub-pixel height difference was enough
        // to grow a vertical scrollbar beside the tabs.
        overflowX: 'auto',
        overflowY: 'hidden',
        // Keeps its full height inside a page that is a flex column, rather than being squeezed.
        flexShrink: 0,
        // The sideways scroll works by drag/wheel; the bar itself is noise on a one-line strip.
        scrollbarWidth: 'none',
        '&::-webkit-scrollbar': { display: 'none' },
      }}
    >
      {tabs.map((t) => {
        const isActive = t.key === active;
        const badge = t.tone ? theme.suraha.status[t.tone] : theme.suraha.status.danger;
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
            {t.total !== undefined ? (
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
                {bn(t.total)}
              </Box>
            ) : null}
          </Box>
        );
      })}
    </Box>
  );
}

import { Box, useTheme } from '@mui/material';

export type StatusTone = 'pending' | 'success' | 'danger' | 'info';

// Semantic status pill reused across every module (SURAHA_BUILD_PROMPT §6).
export default function StatusPill({ label, tone }: { label: string; tone: StatusTone }) {
  const theme = useTheme();
  const c = theme.suraha.status[tone];
  return (
    <Box
      component="span"
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        px: 1.25,
        py: 0.375,
        borderRadius: 999,
        fontSize: 12.5,
        fontWeight: 600,
        lineHeight: 1.6,
        whiteSpace: 'nowrap',
        bgcolor: c.bg,
        color: c.fg,
      }}
    >
      {label}
    </Box>
  );
}

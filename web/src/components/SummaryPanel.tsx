import { Box, Typography } from '@mui/material';
import type { ReactNode } from 'react';

// Sticky right-hand panel on detail views (concept_ui/Frame 1171277088.png): the subject's name,
// a few summary lines, then module content (a status control, a timeline, action buttons). Sticks
// to the top as the left column scrolls.
export default function SummaryPanel({
  title,
  lines,
  children,
}: {
  title: string;
  lines?: { label: string; value: ReactNode }[];
  children?: ReactNode;
}) {
  return (
    <Box
      sx={{
        position: 'sticky',
        top: 16,
        alignSelf: 'start',
        bgcolor: 'background.paper',
        border: (t) => `1px solid ${t.palette.divider}`,
        borderRadius: '16px',
        p: 2.5,
        display: 'grid',
        gap: 2,
      }}
    >
      <Box>
        <Typography sx={{ fontSize: 18, fontWeight: 700 }}>{title}</Typography>
        {lines?.map((l) => (
          <Box key={l.label} sx={{ display: 'flex', gap: 0.5, mt: 0.5 }}>
            <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>{l.label}:</Typography>
            <Typography sx={{ fontSize: 13 }}>{l.value}</Typography>
          </Box>
        ))}
      </Box>
      {children}
    </Box>
  );
}

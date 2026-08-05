import { Box, Typography } from '@mui/material';
import type { ReactNode } from 'react';

// White rounded field card used by the add/edit forms and card-style detail views
// (concept_ui/Frame 1171277053.png, Frame 1171277088.png): a bold Bangla label above its input
// or value. `action` renders a trailing control on the label row (e.g. "ট্র্যাক করুন").
export default function FieldCard({
  label,
  action,
  children,
}: {
  label: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <Box
      sx={{
        bgcolor: 'background.paper',
        border: (t) => `1px solid ${t.palette.divider}`,
        borderRadius: '14px',
        px: 2.5,
        py: 2,
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
        <Typography sx={{ flex: 1, fontSize: 14, fontWeight: 600 }}>{label}</Typography>
        {action}
      </Box>
      {children}
    </Box>
  );
}

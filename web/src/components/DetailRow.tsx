import { Box, Divider, Typography } from '@mui/material';
import type { ReactNode } from 'react';

// A label-over-value row for the dense read-only detail list (concept_ui/Frame 1171277070.png):
// a secondary Bangla label, the value below, and a thin divider. `action` renders a trailing
// control on the label row (e.g. the ট্র্যাক করুন link on a location field).
export default function DetailRow({
  label,
  value,
  action,
  divider = true,
}: {
  label: string;
  value: ReactNode;
  action?: ReactNode;
  divider?: boolean;
}) {
  return (
    <>
      <Box sx={{ py: 1.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Typography sx={{ flex: 1, fontSize: 13.5, color: 'text.secondary' }}>{label}</Typography>
          {action}
        </Box>
        <Typography sx={{ fontSize: 15, mt: 0.25 }}>{value ?? '—'}</Typography>
      </Box>
      {divider && <Divider />}
    </>
  );
}

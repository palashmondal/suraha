import { Box, Paper, Typography, type SxProps, type Theme } from '@mui/material';
import type { ReactNode } from 'react';

// White rounded card with a title row + optional action button (the list cards on the
// dashboard: সাক্ষাৎকার / অভিযোগ / স্লাইডার ইমেজ).
export default function SectionCard({
  title,
  action,
  children,
  sx,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
  sx?: SxProps<Theme>;
}) {
  return (
    <Paper
      elevation={0}
      sx={{
        borderRadius: '12px',
        border: '1px solid',
        borderColor: 'divider',
        p: 2.5,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        ...sx,
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          mb: 2,
        }}
      >
        <Typography variant="h6" sx={{ fontSize: 18 }}>
          {title}
        </Typography>
        {action}
      </Box>
      {children}
    </Paper>
  );
}

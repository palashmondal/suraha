import { Box, Paper, Typography, useTheme, type SxProps, type Theme } from '@mui/material';
import type { ReactNode } from 'react';
import { bn } from '../utils/bnNum';

// White rounded card with a title row + optional count badge + action button (the list
// cards on the dashboard: সাক্ষাৎকার / অভিযোগ / স্লাইডার ইমেজ).
export default function SectionCard({
  title,
  count,
  action,
  children,
  sx,
}: {
  title: string;
  count?: number;
  action?: ReactNode;
  children: ReactNode;
  sx?: SxProps<Theme>;
}) {
  const theme = useTheme();
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
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="h6" sx={{ fontSize: 18 }}>
            {title}
          </Typography>
          {count != null ? (
            <Box
              component="span"
              sx={{
                bgcolor: theme.suraha.countBadge,
                color: '#fff',
                fontSize: 12,
                fontWeight: 600,
                lineHeight: 1,
                px: 0.9,
                py: 0.5,
                borderRadius: 999,
              }}
            >
              {bn(count)}
            </Box>
          ) : null}
        </Box>
        {action}
      </Box>
      {children}
    </Paper>
  );
}

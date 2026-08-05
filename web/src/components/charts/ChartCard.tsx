import { Box, Paper, Typography } from '@mui/material';
import type { ReactNode } from 'react';

// Rounded card wrapper for a chart: a title over a fixed-height responsive plot area.
export default function ChartCard({ title, height = 280, children }: { title: string; height?: number; children: ReactNode }) {
  return (
    <Paper elevation={0} sx={{ p: 2.5, borderRadius: '16px', border: (t) => `1px solid ${t.palette.divider}` }}>
      <Typography sx={{ fontSize: 16, fontWeight: 700, mb: 1.5 }}>{title}</Typography>
      <Box sx={{ height }}>{children}</Box>
    </Paper>
  );
}

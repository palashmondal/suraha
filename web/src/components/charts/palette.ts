import type { Theme } from '@mui/material';

// Chart colour system, derived so charts read as one set and stay legible in light + dark.
export function chartColors(theme: Theme) {
  return {
    series: {
      pregnancy: '#6750A4', // violet (primary)
      birth: '#12B76A', // green
      complaint: '#F79009', // amber
      appointment: '#2E90FA', // blue
    },
    // Vibrant status tones (donuts, funnel) — brighter than the pill tokens for chart fills.
    tone: {
      pending: '#F79009',
      success: '#12B76A',
      danger: '#F04438',
      info: '#6750A4',
    } as Record<string, string>,
    categorical: ['#6750A4', '#12B76A', '#F79009', '#2E90FA', '#EE46BC', '#F04438'],
    grid: theme.palette.divider,
    axis: theme.palette.text.secondary,
    tooltipBg: theme.palette.background.paper,
  };
}

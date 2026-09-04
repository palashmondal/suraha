import { Box, Container, Typography, useTheme } from '@mui/material';
import type { ReactNode } from 'react';

/**
 * The banner every inner citizen page opens with, so /track, the filing forms and
 * "আমার আবেদনসমূহ" share the landing pages' visual language instead of starting cold on a bare
 * heading. Same violet wash as the landing hero, one step shorter.
 */
export default function PageHero({
  title,
  subtitle,
  icon,
}: {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
}) {
  const theme = useTheme();
  const violet = theme.palette.primary.main;

  return (
    <Box
      sx={{
        borderBottom: `1px solid ${theme.palette.divider}`,
        background: `linear-gradient(180deg, ${theme.palette.mode === 'light' ? '#F6F2FF' : '#241F31'} 0%, ${theme.palette.background.default} 100%)`,
      }}
    >
      <Container maxWidth="lg" sx={{ py: { xs: 4, md: 6 }, textAlign: 'center' }}>
        {icon && (
          <Box
            sx={{
              width: 58,
              height: 58,
              borderRadius: '16px',
              display: 'grid',
              placeItems: 'center',
              mx: 'auto',
              mb: 2,
              bgcolor: 'rgba(103,80,164,0.12)',
              color: violet,
              '& svg': { fontSize: 30 },
            }}
          >
            {icon}
          </Box>
        )}
        <Typography sx={{ fontSize: { xs: 26, md: 34 }, fontWeight: 800, lineHeight: 1.3 }}>{title}</Typography>
        {subtitle && (
          <Typography sx={{ fontSize: 16, color: 'text.secondary', mt: 1.5, maxWidth: 560, mx: 'auto', lineHeight: 1.8 }}>
            {subtitle}
          </Typography>
        )}
      </Container>
    </Box>
  );
}

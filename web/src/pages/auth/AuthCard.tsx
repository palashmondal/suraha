import { Box, Paper, Typography } from '@mui/material';
import type { ReactNode } from 'react';
import { bnStrings as S } from '../../i18n';

// Shared centered auth shell for both officer and citizen login, on the lavender canvas so it reads
// as part of the same PWA in both themes.
export default function AuthCard({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <Box
      sx={{
        minHeight: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'background.default',
        p: 2,
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, mb: 3 }}>
        <Box component="img" src="/logo.png" alt={S.appName} sx={{ width: 44, height: 44 }} />
        <Typography sx={{ fontSize: 30, fontWeight: 700 }}>{S.appName}</Typography>
      </Box>
      <Paper
        elevation={0}
        sx={{
          width: '100%',
          maxWidth: 400,
          p: { xs: 3, sm: 4 },
          borderRadius: 4,
          border: (t) => `1px solid ${t.palette.divider}`,
        }}
      >
        <Typography variant="h6" sx={{ mb: 0.5 }}>
          {title}
        </Typography>
        <Typography sx={{ color: 'text.secondary', fontSize: 14, mb: 3 }}>{subtitle}</Typography>
        {children}
      </Paper>
      {footer ? <Box sx={{ mt: 2.5 }}>{footer}</Box> : null}
    </Box>
  );
}

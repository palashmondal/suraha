import { Box, CircularProgress, Typography } from '@mui/material';
import { bnStrings as S } from '../i18n';

// Centered loading state shown while a list/section is fetching, so pages don't flash the
// empty state ("কোনো তথ্য নাই") before data arrives.
export default function LoadingState({ label = S.common.loading }: { label?: string }) {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        py: 8,
        px: 2,
        color: 'text.secondary',
      }}
    >
      <CircularProgress size={40} sx={{ mb: 2 }} />
      <Typography sx={{ fontSize: 16, fontWeight: 600 }}>{label}</Typography>
    </Box>
  );
}

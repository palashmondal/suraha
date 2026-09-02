import { Box, Typography } from '@mui/material';
import InboxRoundedIcon from '@mui/icons-material/InboxRounded';
import type { ReactNode } from 'react';
import { bnStrings as S } from '../i18n';

// Reused empty state (SURAHA_BUILD_PROMPT §6). Defaults to the Bangla "no data" copy.
export default function EmptyState({
  message = S.common.noData,
  help,
  icon,
}: {
  message?: string;
  help?: string;
  icon?: ReactNode;
}) {
  return (
    <Box
      sx={{
        py: 6,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 1,
        color: 'text.secondary',
        textAlign: 'center',
      }}
    >
      {icon ?? <InboxRoundedIcon sx={{ fontSize: 44, opacity: 0.5 }} />}
      <Typography sx={{ fontSize: 15, fontWeight: 600 }}>{message}</Typography>
      {help ? <Typography sx={{ fontSize: 13 }}>{help}</Typography> : null}
    </Box>
  );
}

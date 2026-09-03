import { Box, Typography } from '@mui/material';
import InboxRoundedIcon from '@mui/icons-material/InboxRounded';
import { bnStrings as S } from '../i18n';

// Centered empty state (SURAHA_BUILD_PROMPT §6): inbox icon + "কোনো তথ্য নাই" + helper line.
// See concept_ui/Frame 1321316786.png.
export default function EmptyState({
  title = S.common.noData,
  helper = S.common.noDataHelp,
  icon,
}: {
  title?: string;
  helper?: string;
  icon?: React.ReactNode;
}) {
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
        color: 'text.primary',
      }}
    >
      <Box sx={{ color: 'text.primary', mb: 1.5, '& svg': { fontSize: 56 } }}>
        {icon ?? <InboxRoundedIcon />}
      </Box>
      <Typography sx={{ fontSize: 20, fontWeight: 700 }}>{title}</Typography>
      <Typography sx={{ fontSize: 14, color: 'text.secondary', mt: 0.5 }}>{helper}</Typography>
    </Box>
  );
}

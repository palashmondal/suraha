import { Box, Paper, Typography } from '@mui/material';
import ConstructionRoundedIcon from '@mui/icons-material/ConstructionRounded';
import { bnStrings as S } from '../i18n';

// Placeholder for a module that is planned but not built. It exists so the sidebar entry leads
// somewhere honest instead of a blank screen or a dead link.
export default function ComingSoon({ title }: { title: string }) {
  return (
    <Box sx={{ display: 'grid', gap: 3 }}>
      <Typography sx={{ fontSize: 22, fontWeight: 800 }}>{title}</Typography>

      <Paper
        elevation={0}
        sx={{ p: 6, borderRadius: '16px', display: 'grid', justifyItems: 'center', gap: 1.5 }}
      >
        <ConstructionRoundedIcon sx={{ fontSize: 48, color: 'text.disabled' }} />
        <Typography sx={{ fontWeight: 700 }}>{S.common.comingSoonTitle}</Typography>
        <Typography sx={{ color: 'text.secondary', textAlign: 'center', maxWidth: 420 }}>
          {S.common.comingSoonBody}
        </Typography>
      </Paper>
    </Box>
  );
}

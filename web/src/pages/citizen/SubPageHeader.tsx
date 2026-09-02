import { Box, IconButton, Typography } from '@mui/material';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import { useNavigate } from 'react-router-dom';

// Sub-page header with a back affordance. Bangla reads left-to-right here (the UI is LTR per the
// manifest), but the "back" arrow points the way a Bangla reader expects to return — forward-arrow
// glyph flipped visually is avoided; we use a forward arrow to mean "back to previous" consistently.
export default function SubPageHeader({ title, fallback = -1 as const }: { title: string; fallback?: string | -1 }) {
  const nav = useNavigate();
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
      <IconButton edge="start" onClick={() => (fallback === -1 ? nav(-1) : nav(fallback))} aria-label="back">
        <ArrowForwardRoundedIcon />
      </IconButton>
      <Typography variant="h6">{title}</Typography>
    </Box>
  );
}

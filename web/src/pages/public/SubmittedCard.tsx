import { Alert, Box, Button, Paper, Typography } from '@mui/material';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import { useNavigate } from 'react-router-dom';
import { bnStrings as S } from '../../i18n';

// Confirmation shown after a citizen files a complaint/appointment: the tracking token to save.
export default function SubmittedCard({ token }: { token: string }) {
  const navigate = useNavigate();
  return (
    <Paper elevation={0} sx={{ p: 4, borderRadius: '18px', border: (t) => `1px solid ${t.palette.divider}`, textAlign: 'center' }}>
      <CheckCircleRoundedIcon color="success" sx={{ fontSize: 56, mb: 1 }} />
      <Typography sx={{ fontSize: 22, fontWeight: 800 }}>{S.public.submittedTitle}</Typography>
      <Alert severity="info" sx={{ mt: 2, textAlign: 'left' }}>{S.public.submittedHelp}</Alert>
      <Box sx={{ my: 3 }}>
        <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>{S.public.trackToken}</Typography>
        <Typography sx={{ fontSize: 26, fontWeight: 800, fontFamily: 'monospace', letterSpacing: 1, color: 'primary.main' }}>
          {token}
        </Typography>
      </Box>
      <Button variant="contained" size="large" onClick={() => navigate('/track')}>{S.public.goTrack}</Button>
    </Paper>
  );
}

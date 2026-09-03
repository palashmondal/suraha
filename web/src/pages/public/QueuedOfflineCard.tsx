import { Alert, Box, Button, Paper, Typography } from '@mui/material';
import CloudDoneRoundedIcon from '@mui/icons-material/CloudDoneRounded';
import { useNavigate } from 'react-router-dom';

// Shown when a public submission is stored in the offline outbox instead of reaching the server
// (SURAHA_BUILD_PROMPT §1.1(2)). It will background-sync when connectivity returns; the tracking
// token is issued by the server at that point, so none is shown yet.
export default function QueuedOfflineCard() {
  const navigate = useNavigate();
  return (
    <Paper
      elevation={0}
      sx={{ p: 4, borderRadius: '18px', border: (t) => `1px solid ${t.palette.divider}`, textAlign: 'center' }}
    >
      <CloudDoneRoundedIcon color="warning" sx={{ fontSize: 56, mb: 1 }} />
      <Typography sx={{ fontSize: 22, fontWeight: 800 }}>আবেদন সংরক্ষিত হয়েছে</Typography>
      <Alert severity="warning" sx={{ mt: 2, textAlign: 'left' }}>
        এই মুহূর্তে ইন্টারনেট সংযোগ নেই। আপনার আবেদনটি এই ডিভাইসে নিরাপদে সংরক্ষিত হয়েছে এবং সংযোগ ফিরলে
        স্বয়ংক্রিয়ভাবে পাঠানো হবে। পাঠানো সম্পন্ন হলে ট্র্যাকিং নম্বর পাওয়া যাবে।
      </Alert>
      <Box sx={{ mt: 3 }}>
        <Button variant="contained" size="large" onClick={() => navigate('/')}>
          হোমে ফিরুন
        </Button>
      </Box>
    </Paper>
  );
}

import { Box, Button, Collapse, LinearProgress, Typography } from '@mui/material';
import CloudOffRoundedIcon from '@mui/icons-material/CloudOffRounded';
import SyncRoundedIcon from '@mui/icons-material/SyncRounded';
import ErrorOutlineRoundedIcon from '@mui/icons-material/ErrorOutlineRounded';
import { useSync } from '../offline/SyncProvider';
import { bn } from '../utils/bnNum';

// Thin status strip: offline warning, an "N pending sync" bar while queued submissions wait in the
// outbox, or a "N failed — retry" bar for items the server rejected (SURAHA_BUILD_PROMPT §1.1(2)).
// Hidden when online with an empty queue. Copy is inline Bangla so the layer stays self-contained.
export default function OfflineBanner() {
  const { online, pendingCount, failedCount, syncing, retryFailed } = useSync();
  const show = !online || pendingCount > 0 || failedCount > 0;

  // Failed items take priority in the strip so the retry affordance is reachable.
  if (online && failedCount > 0 && pendingCount === 0) {
    return (
      <Box
        sx={{
          px: 2,
          py: 0.75,
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          fontSize: 13,
          color: '#fff',
          bgcolor: 'error.main',
        }}
      >
        <ErrorOutlineRoundedIcon sx={{ fontSize: 18 }} />
        <Typography sx={{ fontSize: 13, flex: 1 }}>{`${bn(failedCount)}টি আবেদন পাঠানো যায়নি`}</Typography>
        <Button size="small" variant="outlined" color="inherit" onClick={() => void retryFailed()} disabled={syncing}>
          আবার চেষ্টা করুন
        </Button>
      </Box>
    );
  }

  return (
    <Collapse in={show}>
      <Box
        sx={{
          px: 2,
          py: 0.75,
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          fontSize: 13,
          color: '#fff',
          bgcolor: !online ? 'warning.main' : 'info.main',
        }}
      >
        {!online ? (
          <>
            <CloudOffRoundedIcon sx={{ fontSize: 18 }} />
            <Typography sx={{ fontSize: 13 }}>
              ইন্টারনেট সংযোগ নেই — আপনার তথ্য সংরক্ষিত হচ্ছে, সংযোগ ফিরলে পাঠানো হবে
            </Typography>
          </>
        ) : (
          <>
            <SyncRoundedIcon
              sx={{
                fontSize: 18,
                animation: syncing ? 'suraha-spin 1s linear infinite' : 'none',
                '@keyframes suraha-spin': { to: { transform: 'rotate(360deg)' } },
              }}
            />
            <Typography sx={{ fontSize: 13 }}>
              {syncing ? 'সিঙ্ক হচ্ছে…' : `${bn(pendingCount)}টি আবেদন পাঠানো বাকি`}
            </Typography>
          </>
        )}
      </Box>
      {syncing ? <LinearProgress /> : null}
    </Collapse>
  );
}

import { Box, Collapse, LinearProgress, Typography } from '@mui/material';
import CloudOffRoundedIcon from '@mui/icons-material/CloudOffRounded';
import SyncRoundedIcon from '@mui/icons-material/SyncRounded';
import { bnStrings as S } from '../i18n';
import { useSync } from '../offline/SyncProvider';
import { bn } from '../utils/bnNum';

// Thin status strip shown across the app: offline warning, or a "N pending sync" bar while items wait
// in the outbox (SURAHA_BUILD_PROMPT §1.1(2)). Hidden entirely when online with an empty queue.
export default function OfflineBanner() {
  const { online, pendingCount, syncing } = useSync();
  const show = !online || pendingCount > 0;

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
          color: !online ? 'warning.contrastText' : 'info.contrastText',
          bgcolor: !online ? 'warning.main' : 'info.main',
        }}
      >
        {!online ? (
          <>
            <CloudOffRoundedIcon sx={{ fontSize: 18 }} />
            <Typography sx={{ fontSize: 13 }}>{S.offline.banner}</Typography>
          </>
        ) : (
          <>
            <SyncRoundedIcon sx={{ fontSize: 18, animation: syncing ? 'spin 1s linear infinite' : 'none', '@keyframes spin': { to: { transform: 'rotate(360deg)' } } }} />
            <Typography sx={{ fontSize: 13 }}>
              {syncing ? S.offline.syncing : `${bn(pendingCount)}${S.offline.pendingOne}`}
            </Typography>
          </>
        )}
      </Box>
      {syncing ? <LinearProgress /> : null}
    </Collapse>
  );
}

import { useState } from 'react';
import { IconButton, Paper, Tooltip, Typography } from '@mui/material';
import ContentCopyRoundedIcon from '@mui/icons-material/ContentCopyRounded';
import CheckRoundedIcon from '@mui/icons-material/CheckRounded';
import type { SxProps, Theme } from '@mui/material';
import { bnStrings as S } from '../i18n';

// The tracking token, top of the right column on every case detail page — it is what the citizen
// quotes on the phone, so an officer needs it in the same place every time. Nothing to show
// without a token (an officer-filed record before tokens existed).
export default function TrackingCard({ token, sx }: { token?: string | null; sx?: SxProps<Theme> }) {
  const [copied, setCopied] = useState(false);

  if (!token) return null;

  const copy = () => {
    void navigator.clipboard.writeText(token);
    setCopied(true);
  };

  return (
    <Paper
      elevation={0}
      sx={{
        // Explicit border + surface: in dark mode `background.paper` matches the page, so
        // without the outline the pill reads as bare floating text.
        border: (t) => `1px solid ${t.palette.divider}`,
        bgcolor: 'background.paper',
        borderRadius: '999px',
        px: 3,
        py: 1.5,
        textAlign: 'center',
        position: 'relative',
        // The copy button stays out of the way until the card is pointed at; focus-within keeps
        // it reachable by keyboard, where there is no hover.
        '&:hover .copy-token, &:focus-within .copy-token': { opacity: 1 },
        ...sx,
      }}
      onMouseLeave={() => setCopied(false)}
    >
      <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>{S.common.trackingNo}</Typography>
      <Typography sx={{ fontSize: 17, fontWeight: 700, letterSpacing: 0.5, mt: 0.25 }}>{token}</Typography>
      <Tooltip title={copied ? S.common.gcalCopied : S.common.copyToken}>
        <IconButton
          className="copy-token"
          size="small"
          aria-label={S.common.copyToken}
          onClick={copy}
          sx={{
            position: 'absolute',
            right: 10,
            top: '50%',
            transform: 'translateY(-50%)',
            opacity: 0,
            transition: 'opacity 120ms ease',
            '&:focus-visible': { opacity: 1 },
          }}
        >
          {copied ? <CheckRoundedIcon sx={{ fontSize: 17 }} /> : <ContentCopyRoundedIcon sx={{ fontSize: 17 }} />}
        </IconButton>
      </Tooltip>
    </Paper>
  );
}

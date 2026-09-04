import { useState } from 'react';
import { Button, Paper, Stack, TextField, Typography } from '@mui/material';
import ContentCopyRoundedIcon from '@mui/icons-material/ContentCopyRounded';
import { bnStrings as S } from '../i18n';

// The subscribe-from-Google-Calendar box shared by the সাক্ষাৎকার সূচি and the অভিযোগ শুনানি
// ক্যালেন্ডার. Both feeds are read-only and one-way; the URL itself is the credential, which is
// why it is copied rather than linked.
export default function CalendarFeedBox({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);

  if (!url) return null;

  return (
    <Paper elevation={0} sx={{ p: 2, mb: 2, borderRadius: '14px', border: (t) => `1px solid ${t.palette.divider}` }}>
      <Typography sx={{ fontWeight: 800, mb: 0.5 }}>{S.common.gcalTitle}</Typography>
      <Typography sx={{ fontSize: 13, color: 'text.secondary', mb: 1.5 }}>{S.common.gcalHint}</Typography>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
        <TextField value={url} size="small" fullWidth slotProps={{ htmlInput: { readOnly: true } }} />
        <Button
          variant="outlined"
          startIcon={<ContentCopyRoundedIcon />}
          onClick={() => {
            void navigator.clipboard.writeText(url);
            setCopied(true);
          }}
          sx={{ flexShrink: 0 }}
        >
          {copied ? S.common.gcalCopied : S.common.gcalCopy}
        </Button>
      </Stack>
    </Paper>
  );
}

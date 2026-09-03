import { useEffect, useState } from 'react';
import { Box, Button, IconButton, Paper, Typography } from '@mui/material';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import InstallMobileRoundedIcon from '@mui/icons-material/InstallMobileRounded';

// Add-to-home-screen prompt (SURAHA_BUILD_PROMPT §1.1(2) — installable PWA). Captures the browser's
// beforeinstallprompt event and offers a Bangla install card; a dismissal is remembered so it does not
// nag. Copy is inline Bangla to keep the component self-contained.
type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

const DISMISS_KEY = 'suraha_install_dismissed';

export default function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault();
      let dismissed = false;
      try {
        dismissed = localStorage.getItem(DISMISS_KEY) === '1';
      } catch {
        /* storage may be unavailable */
      }
      if (!dismissed) {
        setDeferred(e as BeforeInstallPromptEvent);
        setVisible(true);
      }
    };
    window.addEventListener('beforeinstallprompt', onPrompt);
    return () => window.removeEventListener('beforeinstallprompt', onPrompt);
  }, []);

  const dismiss = () => {
    setVisible(false);
    try {
      localStorage.setItem(DISMISS_KEY, '1');
    } catch {
      /* ignore */
    }
  };

  const install = async () => {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice;
    setDeferred(null);
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <Paper
      elevation={8}
      sx={{
        position: 'fixed',
        left: 16,
        right: 16,
        bottom: 16,
        zIndex: (t) => t.zIndex.snackbar,
        maxWidth: 420,
        mx: 'auto',
        p: 2,
        borderRadius: 3,
        display: 'flex',
        alignItems: 'center',
        gap: 1.5,
      }}
    >
      <InstallMobileRoundedIcon color="primary" />
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography sx={{ fontWeight: 700, fontSize: 15 }}>অ্যাপটি ইনস্টল করুন</Typography>
        <Typography sx={{ fontSize: 12.5, color: 'text.secondary' }}>
          হোম স্ক্রিনে যুক্ত করে দ্রুত ও অফলাইনে ব্যবহার করুন
        </Typography>
      </Box>
      <Button variant="contained" size="small" onClick={install}>
        ইনস্টল
      </Button>
      <IconButton size="small" onClick={dismiss} aria-label="বন্ধ করুন">
        <CloseRoundedIcon fontSize="small" />
      </IconButton>
    </Paper>
  );
}

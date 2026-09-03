import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  IconButton,
  Typography,
} from '@mui/material';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import type { ReactNode } from 'react';
import { bnStrings as S } from '../i18n';

// MD3 basic dialog (concept_ui/Basic dialog.png): title with a close X, body content, and a
// footer with an outlined cancel + a filled primary submit. `onSubmit` wraps the body in a form
// so Enter submits; omit it for an informational dialog.
export default function AppDialog({
  open,
  title,
  onClose,
  onSubmit,
  submitLabel = S.common.submit,
  cancelLabel = S.common.cancel,
  submitting = false,
  submitColor = 'primary',
  maxWidth = 'sm',
  children,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  onSubmit?: (e: React.FormEvent) => void;
  submitLabel?: string;
  cancelLabel?: string;
  submitting?: boolean;
  submitColor?: 'primary' | 'error';
  maxWidth?: 'xs' | 'sm' | 'md';
  children: ReactNode;
}) {
  const body = (
    <>
      <DialogContent sx={{ display: 'grid', gap: 2, pt: 1 }}>{children}</DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5, pt: 0 }}>
        <Button variant="outlined" onClick={onClose} disabled={submitting} sx={{ px: 2.5 }}>
          {cancelLabel}
        </Button>
        {onSubmit && (
          <Button type="submit" variant="contained" color={submitColor} disabled={submitting} sx={{ px: 2.5 }}>
            {submitLabel}
          </Button>
        )}
      </DialogActions>
    </>
  );

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth={maxWidth}
      slotProps={{ paper: { sx: { borderRadius: '20px', p: 0.5 } } }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', px: 3, pt: 2.5 }}>
        <Typography sx={{ flex: 1, fontSize: 19, fontWeight: 700 }}>{title}</Typography>
        <IconButton onClick={onClose} size="small">
          <CloseRoundedIcon />
        </IconButton>
      </Box>
      {onSubmit ? (
        <Box component="form" onSubmit={onSubmit}>
          {body}
        </Box>
      ) : (
        body
      )}
    </Dialog>
  );
}

import { Typography } from '@mui/material';
import AppDialog from './AppDialog';

// Small confirmation dialog built on AppDialog — e.g. destructive actions (নাকচ / মুছে ফেলুন).
export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel,
  onConfirm,
  onClose,
  destructive = false,
  busy = false,
}: {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  onConfirm: () => void;
  onClose: () => void;
  destructive?: boolean;
  busy?: boolean;
}) {
  return (
    <AppDialog
      open={open}
      title={title}
      onClose={onClose}
      onSubmit={(e) => {
        e.preventDefault();
        onConfirm();
      }}
      submitLabel={confirmLabel}
      submitColor={destructive ? 'error' : 'primary'}
      submitting={busy}
      maxWidth="xs"
    >
      <Typography sx={{ color: 'text.secondary' }}>{message}</Typography>
    </AppDialog>
  );
}

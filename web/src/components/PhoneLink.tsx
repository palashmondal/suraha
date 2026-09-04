import { Link } from '@mui/material';
import { bn } from '../utils/bnNum';

/**
 * A phone number as something you can actually ring: shown in Bangla digits, dialled in ASCII —
 * `tel:` needs the real digits, and on a phone (this is a PWA officers use in the field) tapping
 * it opens the dialer. Falls back to a dash when there is no number.
 */
export default function PhoneLink({ phone, color = 'inherit' }: { phone?: string | null; color?: string }) {
  if (!phone) return <>—</>;

  return (
    <Link
      href={`tel:${phone.replace(/[^\d+]/g, '')}`}
      underline="hover"
      color={color}
      sx={{ whiteSpace: 'nowrap' }}
      onClick={(e) => e.stopPropagation()} // rows are clickable; ringing must not also open one
    >
      {bn(phone)}
    </Link>
  );
}

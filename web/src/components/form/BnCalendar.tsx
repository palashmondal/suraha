import { useEffect, useState } from 'react';
import { Box, IconButton, Popover, Typography } from '@mui/material';
import ChevronLeftRoundedIcon from '@mui/icons-material/ChevronLeftRounded';
import ChevronRightRoundedIcon from '@mui/icons-material/ChevronRightRounded';
import { bn } from '../../utils/bnNum';

// A month-grid date picker in the app's own idiom: Bangla month names, Bengali digits, Sunday
// first. The browser's native calendar renders "Sep 2026" and Latin digits with no way to change
// it, which reads as a foreign control dropped into a Bangla form — and @mui/x-date-pickers would
// mean two more dependencies plus locale wiring to end up here anyway.

const MONTHS = [
  'জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন',
  'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর',
];
const WEEKDAYS = ['র', 'সো', 'ম', 'বু', 'বৃ', 'শু', 'শ'];

/** Local-time ISO — toISOString() would shift the day backwards for Asia/Dhaka. */
function iso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function BnCalendar({
  anchorEl, value, onPick, onClose,
}: {
  anchorEl: HTMLElement | null;
  /** Selected date as YYYY-MM-DD, or '' when nothing is chosen yet. */
  value: string;
  onPick: (isoDate: string) => void;
  onClose: () => void;
}) {
  const today = new Date();
  const selected = /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T00:00:00`) : null;

  // The month on screen. Reopening on a chosen date lands on that month, not on today.
  const [view, setView] = useState(() => selected ?? today);
  useEffect(() => {
    if (anchorEl) setView(selected ?? new Date());
    // Only when the popover opens — following `value` would fight the arrows.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anchorEl]);

  const year = view.getFullYear();
  const month = view.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const leading = new Date(year, month, 1).getDay(); // 0 = Sunday

  const cellSx = {
    width: 36,
    height: 36,
    display: 'grid',
    placeItems: 'center',
    borderRadius: '50%',
    fontSize: 14,
    cursor: 'pointer',
    userSelect: 'none' as const,
    '&:hover': { bgcolor: 'action.hover' },
  };

  return (
    <Popover
      open={!!anchorEl}
      anchorEl={anchorEl}
      onClose={onClose}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      slotProps={{ paper: { sx: { mt: 1, borderRadius: '16px', p: 1.5 } } }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1 }}>
        <IconButton size="small" aria-label="পূর্ববর্তী মাস" onClick={() => setView(new Date(year, month - 1, 1))}>
          <ChevronLeftRoundedIcon />
        </IconButton>
        <Typography sx={{ flex: 1, textAlign: 'center', fontWeight: 700 }}>
          {MONTHS[month]} {bn(year)}
        </Typography>
        <IconButton size="small" aria-label="পরবর্তী মাস" onClick={() => setView(new Date(year, month + 1, 1))}>
          <ChevronRightRoundedIcon />
        </IconButton>
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 36px)', gap: 0.25 }}>
        {WEEKDAYS.map((w, i) => (
          <Box key={i} sx={{ ...cellSx, cursor: 'default', color: 'text.secondary', fontSize: 12, fontWeight: 600, '&:hover': {} }}>
            {w}
          </Box>
        ))}

        {Array.from({ length: leading }, (_, i) => <Box key={`pad-${i}`} />)}

        {Array.from({ length: daysInMonth }, (_, i) => {
          const day = i + 1;
          const date = new Date(year, month, day);
          const isSelected = !!selected && iso(selected) === iso(date);
          const isToday = iso(today) === iso(date);

          return (
            <Box
              key={day}
              role="button"
              onClick={() => { onPick(iso(date)); onClose(); }}
              sx={{
                ...cellSx,
                fontWeight: isSelected || isToday ? 700 : 500,
                color: isSelected ? 'primary.contrastText' : isToday ? 'primary.main' : 'text.primary',
                bgcolor: isSelected ? 'primary.main' : 'transparent',
                border: isToday && !isSelected ? '1px solid' : '1px solid transparent',
                borderColor: isToday && !isSelected ? 'primary.main' : 'transparent',
                '&:hover': { bgcolor: isSelected ? 'primary.main' : 'action.hover' },
              }}
            >
              {bn(day)}
            </Box>
          );
        })}
      </Box>

      <Box
        role="button"
        onClick={() => { onPick(iso(today)); onClose(); }}
        sx={{ mt: 1, textAlign: 'center', py: 0.75, borderRadius: '10px', cursor: 'pointer', fontSize: 13.5, fontWeight: 600, color: 'primary.main', '&:hover': { bgcolor: 'action.hover' } }}
      >
        আজ
      </Box>
    </Popover>
  );
}

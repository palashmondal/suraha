import { useEffect, useState } from 'react';
import {
  FormControlLabel,
  MenuItem,
  Radio,
  RadioGroup,
  TextField,
} from '@mui/material';
import FieldCard from './FieldCard';

// A standard (underline) MD3 text input rendered inside a FieldCard. `multiline` gives the
// large description boxes seen on the complaint/appointment forms.
export function FormField({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
  multiline = false,
  rows = 4,
  action,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  multiline?: boolean;
  rows?: number;
  action?: React.ReactNode;
}) {
  return (
    <FieldCard label={label} action={action}>
      <TextField
        variant="standard"
        fullWidth
        hiddenLabel
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        multiline={multiline}
        minRows={multiline ? rows : undefined}
        InputProps={{ disableUnderline: false }}
      />
    </FieldCard>
  );
}

export interface Option {
  value: string;
  label: string;
}

// Dropdown (concept_ui shows a chevron select, e.g. রক্তের গ্রুপ / ওয়ার্ড নং).
export function SelectField({
  label,
  value,
  onChange,
  options,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: Option[];
  placeholder?: string;
}) {
  return (
    <FieldCard label={label}>
      <TextField
        select
        variant="standard"
        fullWidth
        hiddenLabel
        value={value}
        onChange={(e) => onChange(e.target.value)}
        SelectProps={{ displayEmpty: true }}
      >
        {placeholder && (
          <MenuItem value="" disabled>
            {placeholder}
          </MenuItem>
        )}
        {options.map((o) => (
          <MenuItem key={o.value} value={o.value}>
            {o.label}
          </MenuItem>
        ))}
      </TextField>
    </FieldCard>
  );
}

// Native date (mm/dd/yyyy + calendar) and time (12:00 + clock) inputs — matches the mockups
// without pulling in a picker dependency.
/**
 * A date typed as দিন/মাস/বছর, stored as ISO.
 *
 * <input type="date"> renders in the browser's locale, so on an en-US machine 3 September shows
 * as 09/03/2026 — which a Bangladeshi officer reads as 9 March. The order has to be ours, and
 * the native control gives no way to set it, so this is a plain text field with a mask. The value
 * in and out is still YYYY-MM-DD, so callers and the API are unchanged.
 */
export function DateField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const [text, setText] = useState(() => isoToDmy(value));

  // Follow the value when it is set from outside (loading a record into an edit form).
  useEffect(() => {
    setText((cur) => (dmyToIso(cur) === value ? cur : isoToDmy(value)));
  }, [value]);

  const handle = (raw: string) => {
    // Digits only, sliced into dd/mm/yyyy as they are typed; backspacing over a slash works
    // because the slashes are re-derived rather than stored.
    const digits = raw.replace(/\D/g, '').slice(0, 8);
    const parts = [digits.slice(0, 2), digits.slice(2, 4), digits.slice(4, 8)].filter(Boolean);
    const masked = parts.join('/');

    setText(masked);
    onChange(dmyToIso(masked));
  };

  return (
    <FieldCard label={label}>
      <TextField
        variant="standard"
        fullWidth
        hiddenLabel
        placeholder="দিন/মাস/বছর"
        value={text}
        onChange={(e) => handle(e.target.value)}
        inputProps={{ inputMode: 'numeric' }}
      />
    </FieldCard>
  );
}

function isoToDmy(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso ?? '');

  return m ? `${m[3]}/${m[2]}/${m[1]}` : '';
}

/** Returns '' until the date is complete and real — so a half-typed date never reaches the API. */
function dmyToIso(dmy: string): string {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(dmy);

  if (!m) return '';

  const [, dd, mm, yyyy] = m;
  const date = new Date(Number(yyyy), Number(mm) - 1, Number(dd));

  // Rejects 31/02: the Date constructor rolls over, so the parts must survive the round trip.
  const real = date.getFullYear() === Number(yyyy)
    && date.getMonth() === Number(mm) - 1
    && date.getDate() === Number(dd);

  return real ? `${yyyy}-${mm}-${dd}` : '';
}

export function TimeField(props: { label: string; value: string; onChange: (v: string) => void }) {
  return <NativeField {...props} type="time" />;
}

function NativeField({
  label,
  value,
  onChange,
  type,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type: 'date' | 'time';
}) {
  return (
    <FieldCard label={label}>
      <TextField
        variant="standard"
        fullWidth
        hiddenLabel
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        InputLabelProps={{ shrink: true }}
      />
    </FieldCard>
  );
}

// Radio group (e.g. sex ছেলে/মেয়ে, yes/no health questions).
export function RadioGroupField({
  label,
  value,
  onChange,
  options,
  row = true,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: Option[];
  row?: boolean;
}) {
  return (
    <FieldCard label={label}>
      <RadioGroup row={row} value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((o) => (
          <FormControlLabel key={o.value} value={o.value} control={<Radio />} label={o.label} />
        ))}
      </RadioGroup>
    </FieldCard>
  );
}

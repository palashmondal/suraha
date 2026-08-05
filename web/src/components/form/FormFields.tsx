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
export function DateField(props: { label: string; value: string; onChange: (v: string) => void }) {
  return <NativeField {...props} type="date" />;
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

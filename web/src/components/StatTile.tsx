import { Box, Typography } from '@mui/material';

// Label above a large value + unit (e.g. "মোট স্বাস্থ্যকর্মী — ৭ জন").
export default function StatTile({
  label,
  value,
  unit,
  onDark,
}: {
  label: string;
  value: string;
  unit?: string;
  onDark?: boolean;
}) {
  return (
    <Box
      sx={{
        flex: 1,
        minWidth: 0,
        p: 1.75,
        borderRadius: '8px',
        bgcolor: onDark ? 'rgba(255,255,255,0.10)' : 'background.paper',
        border: '1px solid',
        borderColor: onDark ? 'rgba(255,255,255,0.16)' : 'divider',
      }}
    >
      <Typography
        sx={{
          fontSize: 13,
          mb: 0.75,
          color: onDark ? 'rgba(255,255,255,0.82)' : 'text.secondary',
        }}
      >
        {label}
      </Typography>
      <Typography sx={{ fontSize: 20, fontWeight: 700, color: onDark ? '#fff' : 'text.primary' }}>
        {value}
        {unit ? <Box component="span" sx={{ fontSize: 15, fontWeight: 600, ml: 0.5 }}>{unit}</Box> : null}
      </Typography>
    </Box>
  );
}

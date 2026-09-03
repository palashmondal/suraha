import { Box, Typography } from '@mui/material';

// Section heading with the soft lavender highlight band seen behind detail-view section
// titles (concept_ui/Frame 1171277070.png): সাধারণ তথ্য, ঠিকানা ও যোগাযোগ, …
export default function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <Box
      sx={{
        display: 'inline-block',
        px: 1,
        py: 0.25,
        borderRadius: 1,
        bgcolor: (t) => t.suraha.activePillBg,
      }}
    >
      <Typography sx={{ fontSize: 19, fontWeight: 700 }}>{children}</Typography>
    </Box>
  );
}

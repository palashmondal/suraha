import { Box, Typography, useTheme } from '@mui/material';

export interface Step {
  key: string;
  label: string;
}

// Right-rail vertical stepper for multi-step forms (concept_ui/Frame 1171277053.png): a filled
// purple node with an inner dot for the current step, hollow nodes for the rest, joined by a
// vertical line. Completed steps (before `activeIndex`) also read as filled.
export default function VerticalStepper({
  steps,
  activeIndex,
}: {
  steps: Step[];
  activeIndex: number;
}) {
  const theme = useTheme();
  const primary = theme.palette.primary.main;

  return (
    <Box
      sx={{
        bgcolor: 'background.paper',
        border: `1px solid ${theme.palette.divider}`,
        borderRadius: '16px',
        p: 3,
      }}
    >
      {steps.map((s, i) => {
        const done = i < activeIndex;
        const active = i === activeIndex;
        const filled = done || active;
        const isLast = i === steps.length - 1;
        return (
          <Box key={s.key} sx={{ display: 'flex', gap: 1.5 }}>
            {/* node + connector */}
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <Box
                sx={{
                  width: 20,
                  height: 20,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: `2px solid ${filled ? primary : theme.palette.divider}`,
                  bgcolor: filled ? primary : 'transparent',
                }}
              >
                {active && <Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: '#fff' }} />}
              </Box>
              {!isLast && (
                <Box
                  sx={{
                    width: 2,
                    flex: 1,
                    minHeight: 32,
                    my: 0.25,
                    bgcolor: done ? primary : theme.palette.divider,
                  }}
                />
              )}
            </Box>
            {/* label */}
            <Typography
              sx={{
                pt: '0px',
                pb: isLast ? 0 : 3,
                fontSize: 15,
                fontWeight: active ? 700 : 500,
                color: filled ? 'text.primary' : 'text.secondary',
              }}
            >
              {s.label}
            </Typography>
          </Box>
        );
      })}
    </Box>
  );
}

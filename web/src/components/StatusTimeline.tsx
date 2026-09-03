import { Box, Typography, useTheme } from '@mui/material';

export interface TimelineNode {
  key: string;
  label: string;
  timestamp?: string; // shown under the label once the stage is reached
  done: boolean;
}

// Vertical status timeline (concept_ui/Frame 1171277088.png / 1321316786.png): the complaint
// lifecycle অভিযোগ দাখিল → শিডিউল যুক্ত → তদন্তকারী যুক্ত → নিষ্পত্তি, with filled nodes +
// timestamps for reached stages and hollow nodes for pending ones.
export default function StatusTimeline({ nodes }: { nodes: TimelineNode[] }) {
  const theme = useTheme();
  const primary = theme.palette.primary.main;

  return (
    <Box>
      {nodes.map((n, i) => {
        const isLast = i === nodes.length - 1;
        return (
          <Box key={n.key} sx={{ display: 'flex', gap: 1.5 }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <Box
                sx={{
                  width: 18,
                  height: 18,
                  borderRadius: '50%',
                  border: `2px solid ${n.done ? primary : theme.palette.divider}`,
                  bgcolor: n.done ? primary : 'transparent',
                }}
              />
              {!isLast && (
                <Box
                  sx={{
                    width: 2,
                    flex: 1,
                    minHeight: 30,
                    my: 0.25,
                    bgcolor: n.done ? primary : theme.palette.divider,
                  }}
                />
              )}
            </Box>
            <Box sx={{ pb: isLast ? 0 : 2.5 }}>
              <Typography
                sx={{ fontSize: 14.5, fontWeight: n.done ? 600 : 500, color: n.done ? 'text.primary' : 'text.secondary' }}
              >
                {n.label}
              </Typography>
              {n.timestamp && (
                <Typography sx={{ fontSize: 12.5, color: 'text.secondary' }}>{n.timestamp}</Typography>
              )}
            </Box>
          </Box>
        );
      })}
    </Box>
  );
}

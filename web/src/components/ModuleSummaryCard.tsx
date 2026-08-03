import { Box, Button, Paper, Typography } from '@mui/material';
import StatTile from './StatTile';

export type Tile = { label: string; value: string; unit?: string; full?: boolean };

// Dashboard module summary card: a solid accent header band over a soft-tinted body of
// stat tiles (concept_ui/Frame 1171277045.png). `full` tiles take a whole row.
export default function ModuleSummaryCard({
  title,
  accent,
  actionLabel,
  tiles,
}: {
  title: string;
  accent: string;
  actionLabel: string;
  tiles: Tile[];
}) {
  return (
    <Paper
      elevation={0}
      sx={{
        borderRadius: '12px',
        overflow: 'hidden',
        border: '1px solid',
        borderColor: 'divider',
        height: '100%',
      }}
    >
      <Box
        sx={{
          bgcolor: accent,
          color: '#fff',
          px: 2.5,
          py: 1.75,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Typography sx={{ fontSize: 18, fontWeight: 700 }}>{title}</Typography>
        <Button
          size="small"
          variant="outlined"
          sx={{
            color: '#fff',
            borderColor: 'rgba(255,255,255,0.6)',
            px: 2,
            '&:hover': { borderColor: '#fff', bgcolor: 'rgba(255,255,255,0.12)' },
          }}
        >
          {actionLabel}
        </Button>
      </Box>

      <Box
        sx={{
          p: 2,
          display: 'flex',
          flexWrap: 'wrap',
          gap: 1.5,
          bgcolor: (t) => t.suraha.cardBody,
        }}
      >
        {tiles.map((tile) => (
          <Box
            key={tile.label}
            sx={{ flex: tile.full ? '1 1 100%' : '1 1 calc(50% - 6px)', display: 'flex', minWidth: 0 }}
          >
            <StatTile label={tile.label} value={tile.value} unit={tile.unit} />
          </Box>
        ))}
      </Box>
    </Paper>
  );
}

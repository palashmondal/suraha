import { Box, useTheme } from '@mui/material';
import { PolarAngleAxis, RadialBar, RadialBarChart, ResponsiveContainer } from 'recharts';
import { bn } from '../../utils/bnNum';
import { chartColors } from './palette';

// A row of radial "gauge" dials for the performance rates (delivery / resolution / approval).
export default function RateGauges({ rates }: { rates: { name: string; value: number }[] }) {
  const theme = useTheme();
  const c = chartColors(theme);
  const colors = [c.series.pregnancy, c.series.complaint, c.series.appointment];

  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: `repeat(${rates.length}, 1fr)`, height: '100%' }}>
      {rates.map((r, i) => (
        <Box key={r.name} sx={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <Box sx={{ flex: 1, width: '100%', position: 'relative' }}>
            <ResponsiveContainer width="100%" height="100%">
              <RadialBarChart innerRadius="68%" outerRadius="100%" data={[{ value: r.value, fill: colors[i % colors.length] }]} startAngle={90} endAngle={-270}>
                <PolarAngleAxis type="number" domain={[0, 100]} tick={false} axisLine={false} />
                <RadialBar background={{ fill: theme.palette.action.hover }} dataKey="value" cornerRadius={10} />
              </RadialBarChart>
            </ResponsiveContainer>
            <Box sx={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center' }}>
              <Box sx={{ fontSize: 22, fontWeight: 800 }}>{bn(r.value)}%</Box>
            </Box>
          </Box>
          <Box sx={{ fontSize: 13, color: 'text.secondary', pb: 0.5 }}>{r.name}</Box>
        </Box>
      ))}
    </Box>
  );
}

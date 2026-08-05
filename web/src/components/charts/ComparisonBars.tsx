import { useTheme } from '@mui/material';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { bn } from '../../utils/bnNum';
import { chartColors } from './palette';

export interface BarSeries { key: string; label: string; color: string }

// Grouped bar chart. `horizontal` (layout=vertical) is used for union comparison; the default
// vertical bars are used for upazila comparison.
export default function ComparisonBars<T extends { name: string }>({
  data, series, horizontal = false,
}: {
  data: T[];
  series: BarSeries[];
  horizontal?: boolean;
}) {
  const theme = useTheme();
  const c = chartColors(theme);

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} layout={horizontal ? 'vertical' : 'horizontal'} margin={{ top: 8, right: 8, left: horizontal ? 8 : -18, bottom: 0 }} barCategoryGap={horizontal ? '24%' : '18%'}>
        <CartesianGrid strokeDasharray="3 3" stroke={c.grid} horizontal={!horizontal} vertical={horizontal} />
        {horizontal ? (
          <>
            <XAxis type="number" tick={{ fill: c.axis, fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={(v) => bn(v)} allowDecimals={false} />
            <YAxis type="category" dataKey="name" width={90} tick={{ fill: c.axis, fontSize: 12 }} axisLine={false} tickLine={false} />
          </>
        ) : (
          <>
            <XAxis dataKey="name" tick={{ fill: c.axis, fontSize: 12 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: c.axis, fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={(v) => bn(v)} allowDecimals={false} />
          </>
        )}
        <Tooltip
          contentStyle={{ background: c.tooltipBg, border: `1px solid ${c.grid}`, borderRadius: 12, fontSize: 13 }}
          formatter={(v, n) => [bn(Number(v)), String(n)]}
          cursor={{ fill: theme.palette.action.hover }}
        />
        <Legend wrapperStyle={{ fontSize: 13 }} />
        {series.map((s) => (
          <Bar key={s.key} dataKey={s.key} name={s.label} fill={s.color} radius={horizontal ? [0, 6, 6, 0] : [6, 6, 0, 0]} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}

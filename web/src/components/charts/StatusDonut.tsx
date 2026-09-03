import { useTheme } from '@mui/material';
import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { bn } from '../../utils/bnNum';
import { chartColors } from './palette';
import type { StatusSlice } from '../../api/reports';

// Donut of a module's status split. Slices coloured by their semantic tone.
export default function StatusDonut({ data }: { data: StatusSlice[] }) {
  const theme = useTheme();
  const c = chartColors(theme);
  const total = data.reduce((s, d) => s + d.value, 0);

  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="name" innerRadius="55%" outerRadius="85%" paddingAngle={2} stroke="none">
          {data.map((d, i) => (
            <Cell key={i} fill={c.tone[d.tone] ?? c.categorical[i % c.categorical.length]} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{ background: c.tooltipBg, border: `1px solid ${c.grid}`, borderRadius: 12, fontSize: 13 }}
          formatter={(v, n) => {
            const val = Number(v);
            return [`${bn(val)} (${total ? Math.round((val / total) * 100) : 0}%)`, String(n)];
          }}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
      </PieChart>
    </ResponsiveContainer>
  );
}

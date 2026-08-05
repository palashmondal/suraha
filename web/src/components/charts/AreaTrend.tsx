import { useTheme } from '@mui/material';
import { Area, AreaChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { bn } from '../../utils/bnNum';
import { chartColors } from './palette';
import type { TrendPoint } from '../../api/reports';

const SERIES: { key: keyof TrendPoint; label: string; color: (c: ReturnType<typeof chartColors>) => string }[] = [
  { key: 'pregnancies', label: 'প্রসূতি', color: (c) => c.series.pregnancy },
  { key: 'births', label: 'জন্ম সনদ', color: (c) => c.series.birth },
  { key: 'complaints', label: 'অভিযোগ', color: (c) => c.series.complaint },
  { key: 'appointments', label: 'সাক্ষাৎকার', color: (c) => c.series.appointment },
];

// Monthly activity trend across the four modules (area, multi-series).
export default function AreaTrend({ data }: { data: TrendPoint[] }) {
  const theme = useTheme();
  const c = chartColors(theme);

  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
        <defs>
          {SERIES.map((s) => (
            <linearGradient key={s.key} id={`g-${s.key}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={s.color(c)} stopOpacity={0.35} />
              <stop offset="95%" stopColor={s.color(c)} stopOpacity={0.02} />
            </linearGradient>
          ))}
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke={c.grid} vertical={false} />
        <XAxis dataKey="month" tick={{ fill: c.axis, fontSize: 12 }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fill: c.axis, fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={(v) => bn(v)} allowDecimals={false} />
        <Tooltip
          contentStyle={{ background: c.tooltipBg, border: `1px solid ${c.grid}`, borderRadius: 12, fontSize: 13 }}
          formatter={(v, n) => [bn(Number(v)), String(n)]}
        />
        <Legend wrapperStyle={{ fontSize: 13 }} />
        {SERIES.map((s) => (
          <Area key={s.key} type="monotone" dataKey={s.key} name={s.label} stroke={s.color(c)} fill={`url(#g-${s.key})`} strokeWidth={2} />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  );
}

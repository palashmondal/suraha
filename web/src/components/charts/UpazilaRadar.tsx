import { useTheme } from '@mui/material';
import { Legend, PolarAngleAxis, PolarGrid, Radar, RadarChart, ResponsiveContainer, Tooltip } from 'recharts';
import { bn } from '../../utils/bnNum';
import { chartColors } from './palette';
import type { UpazilaRow } from '../../api/reports';

const METRICS: { key: keyof UpazilaRow; label: string }[] = [
  { key: 'pregnancies', label: 'প্রসূতি' },
  { key: 'deliveries', label: 'ডেলিভারি' },
  { key: 'births', label: 'জন্ম সনদ' },
  { key: 'complaints_resolved', label: 'নিষ্পত্তি' },
  { key: 'appointments_approved', label: 'অনুমোদিত' },
];

// Multi-dimensional comparison of upazilas across the key metrics (one radar polygon per upazila).
export default function UpazilaRadar({ rows }: { rows: UpazilaRow[] }) {
  const theme = useTheme();
  const c = chartColors(theme);

  // Pivot rows → [{ metric, <upazila>: value, … }] so each upazila is a series.
  const data = METRICS.map((m) => {
    const point: Record<string, number | string> = { metric: m.label };
    rows.forEach((r) => { point[r.name] = r[m.key] as number; });
    return point;
  });

  return (
    <ResponsiveContainer width="100%" height="100%">
      <RadarChart data={data} outerRadius="72%">
        <PolarGrid stroke={c.grid} />
        <PolarAngleAxis dataKey="metric" tick={{ fill: c.axis, fontSize: 12 }} />
        {rows.map((r, i) => (
          <Radar key={r.name} name={r.name} dataKey={r.name} stroke={c.categorical[i % c.categorical.length]} fill={c.categorical[i % c.categorical.length]} fillOpacity={0.25} />
        ))}
        <Legend wrapperStyle={{ fontSize: 13 }} />
        <Tooltip contentStyle={{ background: c.tooltipBg, border: `1px solid ${c.grid}`, borderRadius: 12, fontSize: 13 }} formatter={(v, n) => [bn(Number(v)), String(n)]} />
      </RadarChart>
    </ResponsiveContainer>
  );
}

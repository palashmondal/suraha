import { useTheme } from '@mui/material';
import { Funnel, FunnelChart, LabelList, ResponsiveContainer, Tooltip, Cell } from 'recharts';
import { bn } from '../../utils/bnNum';
import { chartColors } from './palette';
import type { FunnelStage } from '../../api/reports';

// Complaint lifecycle funnel — how many complaints reach each stage.
export default function ComplaintFunnel({ data }: { data: FunnelStage[] }) {
  const theme = useTheme();
  const c = chartColors(theme);
  const shades = ['#F79009', '#DC6803', '#2E90FA', '#12B76A'];

  return (
    <ResponsiveContainer width="100%" height="100%">
      <FunnelChart>
        <Tooltip
          contentStyle={{ background: c.tooltipBg, border: `1px solid ${c.grid}`, borderRadius: 12, fontSize: 13 }}
          formatter={(v) => bn(Number(v))}
        />
        <Funnel dataKey="count" data={data} isAnimationActive nameKey="stage">
          {data.map((_, i) => (
            <Cell key={i} fill={shades[i % shades.length]} />
          ))}
          <LabelList position="right" dataKey="stage" stroke="none" fill={c.axis} fontSize={13} />
          <LabelList position="inside" dataKey="count" stroke="none" fill="#fff" fontSize={14} formatter={(v) => bn(Number(v))} />
        </Funnel>
      </FunnelChart>
    </ResponsiveContainer>
  );
}

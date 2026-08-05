import { useEffect, useMemo, useState } from 'react';
import { Box, Button, Chip, MenuItem, Paper, Snackbar, TextField, Typography, useTheme } from '@mui/material';
import PictureAsPdfRoundedIcon from '@mui/icons-material/PictureAsPdfRounded';
import GridOnRoundedIcon from '@mui/icons-material/GridOnRounded';
import { bnStrings as S } from '../../i18n';
import { bn } from '../../utils/bnNum';
import StatTile from '../../components/StatTile';
import ChartCard from '../../components/charts/ChartCard';
import AreaTrend from '../../components/charts/AreaTrend';
import StatusDonut from '../../components/charts/StatusDonut';
import RateGauges from '../../components/charts/RateGauges';
import ComplaintFunnel from '../../components/charts/ComplaintFunnel';
import ComparisonBars from '../../components/charts/ComparisonBars';
import UpazilaRadar from '../../components/charts/UpazilaRadar';
import { chartColors } from '../../components/charts/palette';
import { getReport, type ReportBundle } from '../../api/reports';
import { api } from '../../api/client';
import { useSelectedTenant } from '../../tenant/SelectedTenantContext';

export default function Reports() {
  const theme = useTheme();
  const c = chartColors(theme);
  const { version } = useSelectedTenant();
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [unionId, setUnionId] = useState('');
  const [unions, setUnions] = useState<{ id: number; name_bn: string }[]>([]);
  const [r, setR] = useState<ReportBundle | null>(null);
  const [toast, setToast] = useState(false);

  useEffect(() => {
    api<{ unions: { id: number; name_bn: string }[] }>('/registry/unions').then((x) => setUnions(x.unions)).catch(() => setUnions([]));
  }, [version]);

  useEffect(() => {
    getReport({ from: from || undefined, to: to || undefined, union_id: unionId || undefined })
      .then(setR)
      .catch(() => setR(null));
  }, [from, to, unionId, version]);

  const kpiTiles = useMemo(() => r ? [
    { label: S.reports.kPregnancies, value: bn(r.kpis.pregnancies_total), unit: S.common.person },
    { label: S.reports.kDeliveryRate, value: `${bn(r.kpis.delivery_rate)}%` },
    { label: S.reports.kBirths, value: bn(r.kpis.births_issued), unit: S.common.count },
    { label: S.reports.kResolutionRate, value: `${bn(r.kpis.resolution_rate)}%` },
    { label: S.reports.kAvgResolution, value: bn(r.kpis.avg_resolution_days), unit: S.reports.days },
    { label: S.reports.kApprovalRate, value: `${bn(r.kpis.approval_rate)}%` },
  ] : [], [r]);

  if (!r) return null;
  const isAggregate = r.scope.level !== 'tenant';

  return (
    <Box sx={{ display: 'grid', gap: 2.5 }}>
      {/* Header + filters + export stubs */}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1.5 }}>
        <Typography variant="h5" sx={{ mr: 1 }}>{S.reports.title}</Typography>
        {isAggregate && <Chip size="small" color="primary" variant="outlined" label={`${r.scope.label} (${bn(r.scope.upazila_count)}${S.dashboard.upazilaCount})`} />}
        <Box sx={{ flex: 1 }} />
        <Button variant="outlined" startIcon={<PictureAsPdfRoundedIcon />} onClick={() => setToast(true)}>{S.reports.exportPdf}</Button>
        <Button variant="outlined" startIcon={<GridOnRoundedIcon />} onClick={() => setToast(true)}>{S.reports.exportExcel}</Button>
      </Box>

      <Paper elevation={0} sx={{ p: 2, borderRadius: '14px', border: `1px solid ${theme.palette.divider}`, display: 'flex', flexWrap: 'wrap', gap: 1.5 }}>
        <TextField type="date" label={S.reports.from} size="small" InputLabelProps={{ shrink: true }} value={from} onChange={(e) => setFrom(e.target.value)} />
        <TextField type="date" label={S.reports.to} size="small" InputLabelProps={{ shrink: true }} value={to} onChange={(e) => setTo(e.target.value)} />
        {!isAggregate && (
          <TextField select label={S.reports.union} size="small" sx={{ minWidth: 180 }} value={unionId} onChange={(e) => setUnionId(e.target.value)}>
            <MenuItem value="">{S.reports.allUnions}</MenuItem>
            {unions.map((u) => <MenuItem key={u.id} value={String(u.id)}>{u.name_bn}</MenuItem>)}
          </TextField>
        )}
      </Paper>

      {/* KPI tiles */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', sm: 'repeat(3,1fr)', md: 'repeat(6,1fr)' }, gap: 1.5 }}>
        {kpiTiles.map((t) => <StatTile key={t.label} label={t.label} value={t.value} unit={t.unit} />)}
      </Box>

      {/* Trend + rates */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '2fr 1fr' }, gap: 2.5 }}>
        <ChartCard title={S.reports.trendTitle}><AreaTrend data={r.trends} /></ChartCard>
        <ChartCard title={S.reports.ratesTitle}><RateGauges rates={r.rates} /></ChartCard>
      </Box>

      {/* Status donuts */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4,1fr)' }, gap: 2.5 }}>
        <ChartCard title={S.reports.stPregnancy} height={220}><StatusDonut data={r.status.pregnancy} /></ChartCard>
        <ChartCard title={S.reports.stBirth} height={220}><StatusDonut data={r.status.birth} /></ChartCard>
        <ChartCard title={S.reports.stComplaint} height={220}><StatusDonut data={r.status.complaint} /></ChartCard>
        <ChartCard title={S.reports.stAppointment} height={220}><StatusDonut data={r.status.appointment} /></ChartCard>
      </Box>

      {/* Funnel + comparison */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2.5 }}>
        <ChartCard title={S.reports.funnelTitle}><ComplaintFunnel data={r.funnel} /></ChartCard>
        {!isAggregate && r.by_union && (
          <ChartCard title={S.reports.unionTitle}>
            <ComparisonBars horizontal data={r.by_union} series={[
              { key: 'pregnancies', label: 'প্রসূতি', color: c.series.pregnancy },
              { key: 'complaints', label: 'অভিযোগ', color: c.series.complaint },
              { key: 'appointments', label: 'সাক্ষাৎকার', color: c.series.appointment },
            ]} />
          </ChartCard>
        )}
        {isAggregate && r.by_upazila && (
          <ChartCard title={S.reports.upazilaRadarTitle}><UpazilaRadar rows={r.by_upazila} /></ChartCard>
        )}
      </Box>

      {isAggregate && r.by_upazila && (
        <ChartCard title={S.reports.upazilaBarsTitle} height={320}>
          <ComparisonBars data={r.by_upazila} series={[
            { key: 'pregnancies', label: 'প্রসূতি', color: c.series.pregnancy },
            { key: 'births', label: 'জন্ম সনদ', color: c.series.birth },
            { key: 'complaints_resolved', label: 'নিষ্পত্তি', color: c.series.complaint },
            { key: 'appointments_approved', label: 'অনুমোদিত', color: c.series.appointment },
          ]} />
        </ChartCard>
      )}

      <Snackbar open={toast} autoHideDuration={2500} onClose={() => setToast(false)} message={S.reports.comingSoon} />
    </Box>
  );
}

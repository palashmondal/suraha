import { useEffect, useState } from 'react';
import { Box, Button } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { bnStrings as S } from '../../i18n';
import { bn, bnDate } from '../../utils/bnNum';
import PageHeader from '../../components/PageHeader';
import TableTabs, { type TableTab } from '../../components/TableTabs';
import DataTable, { type Column } from '../../components/DataTable';
import StatusPill from '../../components/StatusPill';
import { listPregnancies, type Pregnancy, type TabCount } from '../../api/pregnancy';
import { useSelectedTenant } from '../../tenant/SelectedTenantContext';
import { useAuth } from '../../auth/AuthContext';

const TAB_LABEL: Record<string, string> = {
  all: S.pregnancy.tabAll,
  not_delivered: S.pregnancy.tabNotDelivered,
  delivered: S.pregnancy.tabDelivered,
};
const TAB_TONE: Record<string, 'pending' | 'success' | 'info' | 'danger'> = {
  all: 'info',
  not_delivered: 'danger',
  delivered: 'success',
};

export default function PregnancyList() {
  const navigate = useNavigate();
  const { user } = useAuth();
  // Only the FWA (and SEAL) may enter a mother — same set the API's write routes allow.
  const canAdd = user?.role === 'fwa' || user?.role === 'seal_admin';
  const { version } = useSelectedTenant(); // refetch when the upazila is switched
  const [status, setStatus] = useState('all');
  const [q, setQ] = useState('');
  const [rows, setRows] = useState<Pregnancy[]>([]);
  const [tabs, setTabs] = useState<TabCount[]>([]);
  const [loading, setLoading] = useState(true);

  // Searching hits the server, because the page holds one page of rows and the register is
  // larger than that — filtering what is already loaded would search a slice and call it the
  // answer. Debounced so a typed word is one request, not one per keystroke, and the response is
  // dropped if a newer one has been sent since.
  useEffect(() => {
    let current = true;
    const t = setTimeout(() => {
      setLoading(true);
      listPregnancies({ status, q: q.trim() || undefined })
        .then((r) => {
          if (!current) return;
          setRows(r.data);
          setTabs(r.tabs);
        })
        .catch(() => {
          if (!current) return;
          setRows([]);
          setTabs([]);
        })
        .finally(() => current && setLoading(false));
    }, q ? 250 : 0);

    return () => {
      current = false;
      clearTimeout(t);
    };
  }, [status, version, q]);

  const tableTabs: TableTab[] = tabs.map((t) => ({
    key: t.key,
    label: TAB_LABEL[t.key] ?? t.key,
    total: t.total,
    tone: TAB_TONE[t.key],
  }));

  // Column order is the register's own: who she is, where she is (district → ward, each its own
  // column so the table can be read down a single administrative level), how to reach her, and
  // where the delivery stands.
  const columns: Column<Pregnancy>[] = [
    { key: 'mother_name_bn', header: S.pregnancy.colName, render: (r) => <span style={{ fontWeight: 600 }}>{r.mother_name_bn}</span> },
    { key: 'husband_name', header: S.pregnancy.colHusband, render: (r) => r.husband_name ?? '—' },
    { key: 'district', header: S.pregnancy.colDistrict, render: (r) => r.district ?? '—' },
    { key: 'upazila', header: S.pregnancy.colUpazila, render: (r) => r.upazila ?? '—' },
    { key: 'union', header: S.pregnancy.colUnion, render: (r) => r.union ?? '—' },
    { key: 'ward_no', header: S.pregnancy.colWard, render: (r) => (r.ward_no ? bn(r.ward_no) : '—') },
    { key: 'mobile', header: S.pregnancy.colMobile, render: (r) => r.mobile ?? '—' },
    {
      key: 'status',
      header: S.pregnancy.colStatus,
      render: (r) => <StatusPill label={r.delivery_status_label} tone={r.delivery_status_tone} />,
    },
    {
      key: 'expected',
      header: S.pregnancy.colExpected,
      render: (r) => (r.expected_delivery_date ? bnDate(r.expected_delivery_date) : '—'),
    },
    {
      key: 'risk',
      header: S.pregnancy.colRisk,
      render: (r) =>
        r.vulnerability.score == null ? (
          <StatusPill label={S.pregnancy.riskIncomplete} tone="info" />
        ) : (
          <StatusPill
            label={`${bn(r.vulnerability.score)}% · ${r.vulnerability.label_bn}`}
            tone={r.vulnerability.band === 'high' ? 'danger' : r.vulnerability.band === 'moderate' ? 'pending' : 'success'}
          />
        ),
    },
    {
      key: 'details',
      header: S.common.details,
      align: 'right',
      render: (r) => (
        <Button size="small" onClick={(e: React.MouseEvent) => { e.stopPropagation(); navigate(`/pregnancy/${r.id}`); }}>
          {S.common.details}
        </Button>
      ),
    },
  ];

  return (
    <Box sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
      <PageHeader
        title={S.pregnancy.listTitle}
        search={{ value: q, onChange: setQ, placeholder: S.pregnancy.searchPlaceholder }}
        onPrimary={canAdd ? () => navigate('/pregnancy/new') : undefined}
      />
      <Box sx={{ mb: 2 }}>
        <TableTabs tabs={tableTabs} active={status} onChange={setStatus} />
      </Box>
      <DataTable
        columns={columns}
        rows={rows}
        loading={loading}
        onRowClick={(r) => navigate(`/pregnancy/${r.id}`)}
      />
    </Box>
  );
}

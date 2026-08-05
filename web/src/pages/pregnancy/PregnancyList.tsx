import { useEffect, useState } from 'react';
import { Box } from '@mui/material';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import { useNavigate } from 'react-router-dom';
import { bnStrings as S } from '../../i18n';
import { bn } from '../../utils/bnNum';
import PageHeader from '../../components/PageHeader';
import TableTabs, { type TableTab } from '../../components/TableTabs';
import DataTable, { type Column } from '../../components/DataTable';
import StatusPill from '../../components/StatusPill';
import { listPregnancies, type Pregnancy, type TabCount } from '../../api/pregnancy';
import { useSelectedTenant } from '../../tenant/SelectedTenantContext';

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
  const { version } = useSelectedTenant(); // refetch when the upazila is switched
  const [status, setStatus] = useState('all');
  const [rows, setRows] = useState<Pregnancy[]>([]);
  const [tabs, setTabs] = useState<TabCount[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    listPregnancies({ status })
      .then((r) => {
        setRows(r.data);
        setTabs(r.tabs);
      })
      .catch(() => {
        setRows([]);
        setTabs([]);
      })
      .finally(() => setLoading(false));
  }, [status, version]);

  const tableTabs: TableTab[] = tabs.map((t) => ({
    key: t.key,
    label: TAB_LABEL[t.key] ?? t.key,
    total: t.total,
    newCount: t.new || undefined,
    newTone: TAB_TONE[t.key],
  }));

  const columns: Column<Pregnancy>[] = [
    { key: 'mother_name_bn', header: S.pregnancy.colName, render: (r) => <span style={{ fontWeight: 600 }}>{r.mother_name_bn}</span> },
    { key: 'husband_name', header: S.pregnancy.colHusband, render: (r) => r.husband_name ?? '—' },
    { key: 'ward_no', header: S.pregnancy.colWard, render: (r) => (r.ward_no ? bn(r.ward_no) : '—') },
    { key: 'union', header: S.pregnancy.colUnion, render: (r) => r.union ?? '—' },
    { key: 'mobile', header: S.pregnancy.colMobile, render: (r) => r.mobile ?? '—' },
    {
      key: 'status',
      header: S.pregnancy.colStatus,
      render: (r) => <StatusPill label={r.delivery_status_label} tone={r.delivery_status_tone} />,
    },
    {
      key: 'expected',
      header: S.pregnancy.colExpected,
      render: (r) => (r.expected_delivery_date ? bn(r.expected_delivery_date) : '—'),
    },
  ];

  return (
    <Box>
      <PageHeader
        title={S.pregnancy.listTitle}
        onSearch={() => {}}
        onFilter={() => {}}
        onPrimary={() => navigate('/pregnancy/new')}
      />
      <Box sx={{ mb: 2 }}>
        <TableTabs tabs={tableTabs} active={status} onChange={setStatus} />
      </Box>
      <DataTable
        columns={columns}
        rows={rows}
        loading={loading}
        onRowClick={(r) => navigate(`/pregnancy/${r.id}`)}
        rowActions={(r) => [
          {
            key: 'view',
            label: S.common.details,
            icon: <VisibilityOutlinedIcon fontSize="small" />,
            onClick: () => navigate(`/pregnancy/${r.id}`),
          },
        ]}
      />
    </Box>
  );
}

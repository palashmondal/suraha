import { useEffect, useState } from 'react';
import { Box } from '@mui/material';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import { useNavigate } from 'react-router-dom';
import { bnStrings as S } from '../../i18n';
import { bn, bnDate } from '../../utils/bnNum';
import PageHeader from '../../components/PageHeader';
import TableTabs, { type TableTab } from '../../components/TableTabs';
import DataTable, { type Column } from '../../components/DataTable';
import StatusPill from '../../components/StatusPill';
import { listComplaints, type Complaint, type ComplaintTab } from '../../api/complaint';
import { useSelectedTenant } from '../../tenant/SelectedTenantContext';

const TAB_LABEL: Record<string, string> = {
  all: S.complaint.tabAll,
  pending: S.complaint.tabPending,
  assigned: S.complaint.tabAssigned,
  completed: S.complaint.tabCompleted,
  rejected: S.complaint.tabRejected,
};
const TAB_TONE: Record<string, 'pending' | 'success' | 'info' | 'danger'> = {
  all: 'info',
  pending: 'pending',
  assigned: 'info',
  completed: 'success',
  rejected: 'danger',
};

export default function ComplaintList() {
  const navigate = useNavigate();
  const { version } = useSelectedTenant();
  const [status, setStatus] = useState('all');
  const [q, setQ] = useState('');
  const [rows, setRows] = useState<Complaint[]>([]);
  const [tabs, setTabs] = useState<ComplaintTab[]>([]);
  const [loading, setLoading] = useState(true);

  // Server-side, like the মাতৃ and সাক্ষাৎকার lists: the page holds one page of rows, so filtering
  // what is already loaded would search a slice and call it the answer. Debounced, and a stale
  // response is dropped if a newer request has gone out since.
  useEffect(() => {
    let current = true;
    const t = setTimeout(() => {
      setLoading(true);
      listComplaints({ status, q: q.trim() || undefined })
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

  const columns: Column<Complaint>[] = [
    { key: 'title', header: S.complaint.colTitle, render: (r) => <span style={{ fontWeight: 600 }}>{r.title}</span> },
    { key: 'complaint_date', header: S.complaint.colDate, render: (r) => (r.complaint_date ? bnDate(r.complaint_date) : '—') },
    { key: 'complaint_time', header: S.complaint.colTime, render: (r) => (r.complaint_time ? bn(r.complaint_time) : '—') },
    { key: 'complainant_name', header: S.complaint.colComplainant },
    // The map link lives on the detail page; a তালিকা row is for scanning, not for opening maps.
    { key: 'place', header: S.complaint.colPlace, render: (r) => r.address ?? '—' },
    { key: 'status', header: S.complaint.colStatus, render: (r) => <StatusPill label={r.status_label} tone={r.status_tone} /> },
    { key: 'officer', header: S.complaint.colOfficer, render: (r) => r.investigating_officer ?? '—' },
  ];

  return (
    <Box sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
      <PageHeader
        title={S.complaint.listTitle}
        search={{ value: q, onChange: setQ, placeholder: S.complaint.searchPlaceholder }}
      />
      <Box sx={{ mb: 2 }}>
        <TableTabs tabs={tableTabs} active={status} onChange={setStatus} />
      </Box>
      <DataTable
        columns={columns}
        rows={rows}
        loading={loading}
        onRowClick={(r) => navigate(`/complaint/${r.id}`)}
        rowActions={(r) => [
          { key: 'view', label: S.common.details, icon: <VisibilityOutlinedIcon fontSize="small" />, onClick: () => navigate(`/complaint/${r.id}`) },
        ]}
      />
    </Box>
  );
}

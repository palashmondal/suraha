import { useEffect, useState } from 'react';
import { Box, Link } from '@mui/material';
import PlaceOutlinedIcon from '@mui/icons-material/PlaceOutlined';
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

const mapLink = (c: Complaint) =>
  c.latitude ? `https://www.openstreetmap.org/?mlat=${c.latitude}&mlon=${c.longitude}#map=16/${c.latitude}/${c.longitude}` : null;

export default function ComplaintList() {
  const navigate = useNavigate();
  const { version } = useSelectedTenant();
  const [status, setStatus] = useState('all');
  const [rows, setRows] = useState<Complaint[]>([]);
  const [tabs, setTabs] = useState<ComplaintTab[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    listComplaints({ status })
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
    newTone: TAB_TONE[t.key],
  }));

  const columns: Column<Complaint>[] = [
    { key: 'title', header: S.complaint.colTitle, render: (r) => <span style={{ fontWeight: 600 }}>{r.title}</span> },
    { key: 'complaint_date', header: S.complaint.colDate, render: (r) => (r.complaint_date ? bnDate(r.complaint_date) : '—') },
    { key: 'complaint_time', header: S.complaint.colTime, render: (r) => (r.complaint_time ? bn(r.complaint_time) : '—') },
    { key: 'complainant_name', header: S.complaint.colComplainant },
    {
      key: 'place',
      header: S.complaint.colPlace,
      render: (r) => (
        <Box>
          <Box sx={{ fontSize: 13 }}>{r.address ?? '—'}</Box>
          {mapLink(r) && (
            <Link href={mapLink(r)!} target="_blank" rel="noopener" onClick={(e) => e.stopPropagation()} sx={{ fontSize: 12.5, display: 'inline-flex', alignItems: 'center', gap: 0.25 }}>
              <PlaceOutlinedIcon sx={{ fontSize: 15 }} /> {S.common.track}
            </Link>
          )}
        </Box>
      ),
    },
    { key: 'status', header: S.complaint.colStatus, render: (r) => <StatusPill label={r.status_label} tone={r.status_tone} /> },
    { key: 'officer', header: S.complaint.colOfficer, render: (r) => r.investigating_officer ?? '—' },
  ];

  return (
    <Box>
      <PageHeader title={S.complaint.listTitle} onSearch={() => {}} onFilter={() => {}} />
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

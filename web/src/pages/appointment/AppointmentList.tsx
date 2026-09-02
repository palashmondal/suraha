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
import { listAppointments, type Appointment, type AppointmentTab } from '../../api/appointment';
import { useSelectedTenant } from '../../tenant/SelectedTenantContext';

const TAB_LABEL: Record<string, string> = {
  all: S.appointment.tabAll,
  pending: S.appointment.tabPending,
  approved: S.appointment.tabApproved,
  rejected: S.appointment.tabRejected,
};
const TAB_TONE: Record<string, 'pending' | 'success' | 'danger' | 'info'> = {
  all: 'info',
  pending: 'pending',
  approved: 'success',
  rejected: 'danger',
};

export default function AppointmentList() {
  const navigate = useNavigate();
  const { version } = useSelectedTenant();
  const [status, setStatus] = useState('all');
  const [rows, setRows] = useState<Appointment[]>([]);
  const [tabs, setTabs] = useState<AppointmentTab[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    listAppointments({ status })
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

  const columns: Column<Appointment>[] = [
    { key: 'appointment_date', header: S.appointment.colDate, render: (r) => (r.appointment_date ? bnDate(r.appointment_date) : '—') },
    { key: 'appointment_time', header: S.appointment.colTime, render: (r) => (r.appointment_time ? bn(r.appointment_time) : '—') },
    { key: 'purpose', header: S.appointment.colPurpose, render: (r) => <span style={{ fontWeight: 600 }}>{r.purpose}</span> },
    { key: 'description', header: S.appointment.colDesc, render: (r) => r.description ?? '—' },
    { key: 'status', header: S.appointment.colStatus, render: (r) => <StatusPill label={r.status_label} tone={r.status_tone} /> },
  ];

  return (
    <Box>
      <PageHeader title={S.appointment.listTitle} onSearch={() => {}} onFilter={() => {}} />
      <Box sx={{ mb: 2 }}>
        <TableTabs tabs={tableTabs} active={status} onChange={setStatus} />
      </Box>
      <DataTable
        columns={columns}
        rows={rows}
        loading={loading}
        onRowClick={(r) => navigate(`/appointment/${r.id}`)}
        rowActions={(r) => [
          { key: 'view', label: S.common.details, icon: <VisibilityOutlinedIcon fontSize="small" />, onClick: () => navigate(`/appointment/${r.id}`) },
        ]}
      />
    </Box>
  );
}

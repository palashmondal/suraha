import { useEffect, useState } from 'react';
import { Box } from '@mui/material';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import { useNavigate } from 'react-router-dom';
import { bnStrings as S } from '../../i18n';
import { bnDate, bnTime } from '../../utils/bnNum';
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
  const [q, setQ] = useState('');
  const [rows, setRows] = useState<Appointment[]>([]);
  const [tabs, setTabs] = useState<AppointmentTab[]>([]);
  const [loading, setLoading] = useState(true);

  // Server-side like the মাতৃ তালিকা: the page holds one page of rows, so filtering what is
  // already loaded would search a slice and call it the answer. Debounced, and a stale response
  // is dropped if a newer request has gone out since.
  useEffect(() => {
    let current = true;
    const t = setTimeout(() => {
      setLoading(true);
      listAppointments({ status, q: q.trim() || undefined })
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

  const columns: Column<Appointment>[] = [
    { key: 'created_at', header: S.appointment.colAppliedDate, render: (r) => (r.created_at ? bnDate(r.created_at) : '—') },
    { key: 'purpose', header: S.appointment.colPurpose, render: (r) => <span style={{ fontWeight: 600 }}>{r.purpose}</span> },
    {
      key: 'description',
      header: S.appointment.colDesc,
      // A বিবরণ runs to a paragraph; one clipped line keeps every row the same height, with the
      // whole text on hover and on the detail page. The px cap is needed because ellipsis does
      // not resolve a percentage width inside an auto-layout table.
      render: (r) => (
        <Box
          title={r.description ?? undefined}
          sx={{ maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
        >
          {r.description ?? '—'}
        </Box>
      ),
    },
    { key: 'appointment_date', header: S.appointment.proposedDate, render: (r) => (r.appointment_date ? bnDate(r.appointment_date) : '—') },
    { key: 'appointment_time', header: S.appointment.proposedTime, render: (r) => bnTime(r.appointment_time) || '—' },
    { key: 'status', header: S.appointment.colStatus, render: (r) => <StatusPill label={r.status_label} tone={r.status_tone} /> },
  ];

  return (
    <Box sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
      <PageHeader
        title={S.appointment.listTitle}
        search={{ value: q, onChange: setQ, placeholder: S.appointment.searchPlaceholder }}
      />
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

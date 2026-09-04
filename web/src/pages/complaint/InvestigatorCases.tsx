import { useEffect, useState } from 'react';
import { Avatar, Box, Chip, IconButton, Link, Paper, Stack, Typography } from '@mui/material';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import LocalPhoneOutlinedIcon from '@mui/icons-material/LocalPhoneOutlined';
import MailOutlineRoundedIcon from '@mui/icons-material/MailOutlineRounded';
import GavelRoundedIcon from '@mui/icons-material/GavelRounded';
import { useNavigate, useParams } from 'react-router-dom';
import { bnStrings as S } from '../../i18n';
import { bnDate } from '../../utils/bnNum';
import StatusPill from '../../components/StatusPill';
import TableTabs, { type TableTab } from '../../components/TableTabs';
import DataTable, { type Column } from '../../components/DataTable';
import PhoneLink from '../../components/PhoneLink';
import { useSelectedTenant } from '../../tenant/SelectedTenantContext';
import { useAuth } from '../../auth/AuthContext';
import type { Officer } from '../../api/officers';
import { listInvestigatingOfficers } from '../../api/investigators';
import { listComplaints, type Complaint, type ComplaintTab } from '../../api/complaint';


// One investigating officer's desk: who they are, what their caseload looks like, and every
// অভিযোগ assigned to them. Reached by clicking a row on the তদন্ত কর্মকর্তা তালিকা.
export default function InvestigatorCases() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { version } = useSelectedTenant();

  // No :id means an investigating officer looking at their own desk — the same page the UNO
  // sees for them, reached from the nav rather than from the roster.
  const isSelf = !id;
  const officerId = id ? Number(id) : (user?.id ?? 0);

  const [officer, setOfficer] = useState<Officer | null>(null);
  const [status, setStatus] = useState('all');
  const [rows, setRows] = useState<Complaint[]>([]);
  const [tabs, setTabs] = useState<ComplaintTab[]>([]);
  const [page, setPage] = useState(1);
  const [pageCount, setPageCount] = useState(1);
  const [loading, setLoading] = useState(true);

  // 77 cases arrive 15 at a time; switching tab starts over at the first page.
  useEffect(() => { setPage(1); }, [status, officerId, version]);

  // On your own desk the details come from the session — the roster endpoint is UNO/SEAL only,
  // so an investigating officer cannot read it. Otherwise the officer is picked out of the list
  // the তালিকা already serves, rather than adding a show endpoint for one record.
  useEffect(() => {
    if (isSelf) {
      setOfficer(user ? ({ ...user, is_active: true } as unknown as Officer) : null);

      return;
    }

    listInvestigatingOfficers()
      .then((r) => setOfficer(r.data.find((o) => o.id === officerId) ?? null))
      .catch(() => setOfficer(null));
  }, [isSelf, user, officerId, version]);

  useEffect(() => {
    setLoading(true);
    listComplaints({ status, officer: officerId, page })
      .then((r) => { setRows(r.data); setTabs(r.tabs); setPageCount(r.meta.last_page); })
      .catch(() => { setRows([]); setTabs([]); })
      .finally(() => setLoading(false));
  }, [status, officerId, version, page]);

  const total = (key: string) => tabs.find((t) => t.key === key)?.total ?? 0;
  // An officer's desk splits in two, not five: work still on it, and work finished. Both রকমের
  // assigned rows — hearing set or not — are still under investigation.
  const inProgress = total('assigned') + total('hearing_scheduled');

  const tableTabs: TableTab[] = [
    { key: 'all', label: S.complaint.tabAll, total: total('all'), tone: 'info' },
    { key: 'in_progress', label: S.investigators.tabInProgress, total: inProgress, tone: 'pending' },
    { key: 'completed', label: S.investigators.tabDone, total: total('completed'), tone: 'success' },
  ];

  const columns: Column<Complaint>[] = [
    { key: 'complaint_date', header: S.complaint.colDate, render: (r) => (r.complaint_date ? bnDate(r.complaint_date) : '—') },
    { key: 'title', header: S.complaint.colTitle, render: (r) => <span style={{ fontWeight: 600 }}>{r.title}</span> },
    { key: 'complainant_name', header: S.complaint.colComplainant },
    { key: 'union', header: S.complaint.colUnion, render: (r) => r.union ?? '—' },
    // The tabs already say where the case stands, so the last column carries the date that
    // actually needs watching on an officer's desk.
    { key: 'due_date', header: S.investigators.colDueDate, render: (r) => (r.due_date ? bnDate(r.due_date) : '—') },
    {
      key: 'status',
      header: S.complaint.colStatus,
      // On an officer's desk the question is only whether the report is in, so the pill says that
      // rather than repeating the register's lifecycle wording. Anything not assigned or
      // completed is not their work, and keeps its own label.
      render: (r) => {
        if (r.status === 'assigned') return <StatusPill label={S.investigators.reportPending} tone="pending" />;
        if (r.status === 'completed') return <StatusPill label={S.investigators.reportGiven} tone="success" />;

        return <StatusPill label={r.status_label} tone={r.status_tone} />;
      },
    },
    {
      key: 'details',
      header: '',
      align: 'right',
      render: (r) => (
        <Link
          component="button"
          type="button"
          underline="hover"
          onClick={(e) => { e.stopPropagation(); navigate(`/app/complaint/${r.id}`); }}
          sx={{ fontSize: 13.5, fontWeight: 600 }}
        >
          {S.common.details}
        </Link>
      ),
    },
  ];

  const initial = officer?.name?.trim().charAt(0) ?? '';

  return (
    <Box sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
      {/* Identity card: who this desk belongs to and how to reach them. */}
      <Paper elevation={0} sx={{ borderRadius: '16px', p: 2.5, mb: 2 }}>
        <Stack direction="row" spacing={2} alignItems="center">
          {/* Back to the roster only when you came from it. */}
          {!isSelf && (
            <IconButton onClick={() => navigate('/app/investigators')} aria-label={S.investigators.title}>
              <ArrowBackRoundedIcon />
            </IconButton>
          )}

          <Avatar sx={{ width: 56, height: 56, bgcolor: 'primary.main', fontSize: 24, fontWeight: 700 }}>
            {initial}
          </Avatar>

          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
              <Typography sx={{ fontSize: 21, fontWeight: 800 }}>{officer?.name ?? '—'}</Typography>
              {officer && (
                <StatusPill
                  label={officer.is_active ? S.investigators.active : S.investigators.inactive}
                  tone={officer.is_active ? 'success' : 'pending'}
                />
              )}
            </Stack>
            <Typography sx={{ color: 'text.secondary' }}>{officer?.designation ?? '—'}</Typography>

            <Stack direction="row" spacing={1} sx={{ mt: 1, flexWrap: 'wrap', gap: 1 }}>
              {officer?.phone && (
                <Chip size="small" variant="outlined" icon={<LocalPhoneOutlinedIcon />} label={<PhoneLink phone={officer.phone} />} />
              )}
              {officer?.email && (
                <Chip size="small" variant="outlined" icon={<MailOutlineRoundedIcon />} label={officer.email} sx={{ direction: 'ltr' }} />
              )}
            </Stack>
          </Box>
        </Stack>

      </Paper>

      <Box sx={{ mb: 2 }}>
        <TableTabs tabs={tableTabs} active={status} onChange={setStatus} />
      </Box>

      <DataTable
        columns={columns}
        rows={rows}
        loading={loading}
        emptyTitle={S.investigators.emptyTitle}
        emptyHelper={S.investigators.emptyHelper}
        emptyIcon={<GavelRoundedIcon />}
        pagination={{ page, pageCount, onPage: setPage }}
        onRowClick={(r) => navigate(`/app/complaint/${r.id}`)}
      />
    </Box>
  );
}

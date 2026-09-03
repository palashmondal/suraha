import { useEffect, useState } from 'react';
import { Box, Chip, MenuItem, TextField } from '@mui/material';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import { useNavigate } from 'react-router-dom';
import { bnStrings as S } from '../../i18n';
import { bnDate } from '../../utils/bnNum';
import PageHeader from '../../components/PageHeader';
import TableTabs, { type TableTab } from '../../components/TableTabs';
import DataTable, { type Column } from '../../components/DataTable';
import StatusPill from '../../components/StatusPill';
import { listSuggestions, type Suggestion } from '../../api/suggestion';
import type { Kind, Tab } from '../../api/assistance';
import { useSelectedTenant } from '../../tenant/SelectedTenantContext';

const TAB_LABEL: Record<string, string> = {
  all: S.suggestion.tabAll,
  pending: S.suggestion.tabPending,
  accepted: S.suggestion.tabAccepted,
  rejected: S.suggestion.tabRejected,
};
const TAB_TONE: Record<string, 'pending' | 'success' | 'info' | 'danger'> = {
  all: 'info',
  pending: 'pending',
  accepted: 'success',
  rejected: 'danger',
};

export default function SuggestionList() {
  const navigate = useNavigate();
  const { version } = useSelectedTenant();
  const [status, setStatus] = useState('all');
  const [kind, setKind] = useState('');
  const [rows, setRows] = useState<Suggestion[]>([]);
  const [tabs, setTabs] = useState<Tab[]>([]);
  const [kinds, setKinds] = useState<Kind[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    listSuggestions({ status, kind: kind || undefined })
      .then((r) => { setRows(r.data); setTabs(r.tabs); setKinds(r.kinds); })
      .catch(() => { setRows([]); setTabs([]); })
      .finally(() => setLoading(false));
  }, [status, kind, version]);

  const columns: Column<Suggestion>[] = [
    { key: 'title', header: S.suggestion.colTitle, render: (r) => <span style={{ fontWeight: 600 }}>{r.title}</span> },
    {
      key: 'applicant_name',
      header: S.suggestion.colApplicant,
      // The API sends no name for a confidential suggestion, so the list says so plainly rather
      // than showing a blank cell.
      render: (r) => (r.is_confidential
        ? <Chip size="small" variant="outlined" icon={<LockOutlinedIcon sx={{ fontSize: 15 }} />} label={S.suggestion.confidential} />
        : (r.applicant_name ?? '—')),
    },
    { key: 'kind_label', header: S.suggestion.colKind },
    { key: 'created_at', header: S.suggestion.colDate, render: (r) => (r.created_at ? bnDate(r.created_at) : '—') },
    { key: 'status', header: S.suggestion.colStatus, render: (r) => <StatusPill label={r.status_label} tone={r.status_tone} /> },
  ];

  return (
    <Box sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
      <PageHeader title={S.suggestion.listTitle} />

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap', mb: 2 }}>
        <TableTabs tabs={tabs.map((t): TableTab => ({ key: t.key, label: TAB_LABEL[t.key] ?? t.key, total: t.total, tone: TAB_TONE[t.key] }))} active={status} onChange={setStatus} />
        <Box sx={{ flex: 1 }} />
        <TextField select size="small" label={S.suggestion.colKind} value={kind} onChange={(e) => setKind(e.target.value)} sx={{ minWidth: 190 }}>
          <MenuItem value="">{S.suggestion.allKinds}</MenuItem>
          {kinds.map((k) => <MenuItem key={k.value} value={k.value}>{k.label}</MenuItem>)}
        </TextField>
      </Box>

      <DataTable
        columns={columns}
        rows={rows}
        loading={loading}
        onRowClick={(r) => navigate(`/advice/${r.id}`)}
        rowActions={(r) => [
          { key: 'view', label: S.common.details, icon: <VisibilityOutlinedIcon fontSize="small" />, onClick: () => navigate(`/advice/${r.id}`) },
        ]}
      />
    </Box>
  );
}

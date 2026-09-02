import { useEffect, useState } from 'react';
import {
  Alert, Box, Paper, Switch, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
} from '@mui/material';
import { bnStrings as S } from '../../i18n';
import PageHeader from '../../components/PageHeader';
import StatusPill from '../../components/StatusPill';
import EmptyState from '../../components/EmptyState';
import LoadingState from '../../components/LoadingState';
import PaginationBar from '../../components/PaginationBar';
import { usePagination } from '../../components/usePagination';
import { useSelectedTenant } from '../../tenant/SelectedTenantContext';
import type { Officer } from '../../api/officers';
import { listInvestigatingOfficers, setInvestigatorActive } from '../../api/investigators';

export default function InvestigatingOfficers() {
  const { selectedUpazilaId } = useSelectedTenant();
  const [rows, setRows] = useState<Officer[]>([]);
  const [loading, setLoading] = useState(true);
  const [flash, setFlash] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    return listInvestigatingOfficers()
      .then((r) => setRows(r.data))
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedUpazilaId]);

  const { pageRows, page, setPage, pageCount } = usePagination(rows);

  const toggle = async (o: Officer) => {
    try {
      await setInvestigatorActive(o.id, !o.is_active);
      load();
    } catch {
      /* ignore */
    }
  };

  return (
    <Box>
      {/* No add action: an investigating officer is just a user of this upazila, created on the
          সকল ব্যবহারকারী page like every other account. This page assigns and lists them. */}
      <PageHeader title={S.investigators.title} />
      {flash && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setFlash(null)}>{flash}</Alert>}

      <TableContainer component={Paper} elevation={0} sx={{ borderRadius: '16px' }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>{S.investigators.colName}</TableCell>
              <TableCell>{S.investigators.colDesignation}</TableCell>
              <TableCell>{S.investigators.colMobile}</TableCell>
              <TableCell>{S.investigators.colEmail}</TableCell>
              <TableCell>{S.investigators.colStatus}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {pageRows.map((o) => (
              <TableRow key={o.id}>
                <TableCell sx={{ fontWeight: 600 }}>{o.name}</TableCell>
                <TableCell>{o.designation ?? '—'}</TableCell>
                <TableCell sx={{ fontFamily: 'monospace', fontSize: 13, direction: 'ltr' }}>{o.phone ?? '—'}</TableCell>
                <TableCell sx={{ direction: 'ltr' }}>{o.email ?? '—'}</TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <StatusPill
                      label={o.is_active ? S.investigators.active : S.investigators.inactive}
                      tone={o.is_active ? 'success' : 'pending'}
                    />
                    <Switch size="small" checked={o.is_active} onChange={() => toggle(o)} />
                  </Box>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {loading && rows.length === 0 && <LoadingState />}
        {!loading && rows.length === 0 && <EmptyState />}
        {rows.length > 0 && (
          <PaginationBar page={page} pageCount={pageCount} onPage={setPage} />
        )}
      </TableContainer>


    </Box>
  );
}

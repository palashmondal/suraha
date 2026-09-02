import { useEffect, useState } from 'react';
import {
  Alert, Box, Switch, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper,
} from '@mui/material';
import { bnStrings as S } from '../../i18n';
import { bn } from '../../utils/bnNum';
import PageHeader from '../../components/PageHeader';
import StatusPill from '../../components/StatusPill';
import EmptyState from '../../components/EmptyState';
import LoadingState from '../../components/LoadingState';
import PaginationBar from '../../components/PaginationBar';
import { usePagination } from '../../components/usePagination';
import { useAuth } from '../../auth/AuthContext';
import { useSelectedTenant } from '../../tenant/SelectedTenantContext';
import {
  listOfficers, getAssignableRoles, setOfficerActive,
  type Officer, type AssignableRole,
} from '../../api/officers';
import CreateOfficerDialog from './CreateOfficerDialog';

// Only tenant-scoped staff are provisioned here; DC/SEAL are provisioned via instance setup.
const TENANT_ROLES = ['fwa', 'up_sochib', 'uno', 'investigating_officer'];

export default function OfficerList() {
  const { user } = useAuth();
  const { selectedUpazilaId } = useSelectedTenant();
  const isSeal = user?.role === 'seal_admin';

  const [rows, setRows] = useState<Officer[]>([]);
  const [roles, setRoles] = useState<AssignableRole[]>([]);
  const [open, setOpen] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    return listOfficers().then((r) => setRows(r.data)).catch(() => setRows([])).finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    getAssignableRoles()
      .then((r) => setRoles(r.roles.filter((x) => TENANT_ROLES.includes(x.value))))
      .catch(() => setRoles([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedUpazilaId]);

  const { pageRows, page, setPage, pageCount } = usePagination(rows);

  const toggle = async (o: Officer) => {
    try {
      await setOfficerActive(o.id, !o.is_active);
      load();
    } catch {
      /* ignore */
    }
  };

  return (
    <Box>
      <PageHeader title={S.officers.title} primaryLabel={S.officers.addNew} onPrimary={() => setOpen(true)} />
      {flash && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setFlash(null)}>{flash}</Alert>}

      <TableContainer component={Paper} elevation={0} sx={{ borderRadius: '16px' }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>{S.officers.colName}</TableCell>
              <TableCell>{S.officers.colUsername}</TableCell>
              <TableCell>{S.officers.colRole}</TableCell>
              <TableCell>{S.officers.colDesignation}</TableCell>
              {isSeal && <TableCell>{S.officers.colUpazila}</TableCell>}
              <TableCell>{S.officers.colWard}</TableCell>
              <TableCell>{S.officers.colStatus}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {pageRows.map((o) => (
              <TableRow key={o.id}>
                <TableCell sx={{ fontWeight: 600 }}>{o.name}</TableCell>
                <TableCell sx={{ fontFamily: 'monospace', fontSize: 13 }}>{o.username ?? '—'}</TableCell>
                <TableCell>{o.role_label_bn}</TableCell>
                <TableCell>{o.designation ?? '—'}</TableCell>
                {isSeal && <TableCell>{o.upazila?.name_bn ?? '—'}</TableCell>}
                <TableCell>{o.ward_no ? bn(o.ward_no) : '—'}</TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <StatusPill
                      label={o.is_active ? S.officers.active : S.officers.inactive}
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

      <CreateOfficerDialog
        open={open}
        roles={roles}
        needsTenant={isSeal}
        selectedUpazilaId={selectedUpazilaId}
        onClose={() => setOpen(false)}
        onCreated={() => {
          setOpen(false);
          setFlash(S.officers.created);
          load();
        }}
      />
    </Box>
  );
}

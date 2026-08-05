import { useEffect, useState } from 'react';
import {
  Alert, Box, Switch, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper,
} from '@mui/material';
import { bnStrings as S } from '../../i18n';
import { bn } from '../../utils/bnNum';
import PageHeader from '../../components/PageHeader';
import StatusPill from '../../components/StatusPill';
import AppDialog from '../../components/AppDialog';
import { FormField, SelectField, type Option } from '../../components/form/FormFields';
import EmptyState from '../../components/EmptyState';
import LoadingState from '../../components/LoadingState';
import PaginationBar from '../../components/PaginationBar';
import { usePagination } from '../../components/usePagination';
import { api, ApiError } from '../../api/client';
import { useAuth } from '../../auth/AuthContext';
import { useSelectedTenant } from '../../tenant/SelectedTenantContext';
import {
  listOfficers, getAssignableRoles, createOfficer, setOfficerActive,
  type Officer, type AssignableRole,
} from '../../api/officers';

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

  const { pageRows, page, setPage, pageSize, setPageSize, pageCount } = usePagination(rows);

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
          <PaginationBar page={page} pageCount={pageCount} pageSize={pageSize} onPage={setPage} onPageSize={setPageSize} />
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

function CreateOfficerDialog({
  open, roles, needsTenant, selectedUpazilaId, onClose, onCreated,
}: {
  open: boolean;
  roles: AssignableRole[];
  needsTenant: boolean;
  selectedUpazilaId: string | null;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [f, setF] = useState<Record<string, string>>({});
  const [unions, setUnions] = useState<Option[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const set = (k: string) => (v: string) => setF((s) => ({ ...s, [k]: v }));

  useEffect(() => {
    if (!open) return;
    setF({});
    setErr(null);
    api<{ unions: { id: number; name_bn: string }[] }>('/registry/unions')
      .then((r) => setUnions(r.unions.map((u) => ({ value: String(u.id), label: u.name_bn }))))
      .catch(() => setUnions([]));
  }, [open]);

  const missingTenant = needsTenant && !selectedUpazilaId;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      await createOfficer({
        name: f.name,
        username: f.username,
        password: f.password,
        role: f.role,
        designation: f.designation || undefined,
        ward_no: f.ward_no ? Number(f.ward_no) : undefined,
        union_id: f.union_id ? Number(f.union_id) : undefined,
        // UNO's tenant is forced server-side; SEAL provisions into the selected upazila.
        ...(needsTenant && selectedUpazilaId ? { tenant_id: selectedUpazilaId } : {}),
      });
      onCreated();
    } catch (e) {
      setErr(e instanceof ApiError ? (Object.values(e.errors ?? {})[0]?.[0] ?? e.message) : S.auth.genericError);
    } finally {
      setBusy(false);
    }
  };

  return (
    <AppDialog open={open} title={S.officers.createTitle} onClose={onClose} onSubmit={submit} submitLabel={S.officers.create} submitting={busy || missingTenant}>
      {missingTenant && <Alert severity="warning">{S.officers.noTenant}</Alert>}
      {err && <Alert severity="error">{err}</Alert>}
      <FormField label={S.officers.fName} value={f.name ?? ''} onChange={set('name')} />
      <FormField label={S.officers.fUsername} value={f.username ?? ''} onChange={set('username')} />
      <FormField label={S.officers.fPassword} value={f.password ?? ''} onChange={set('password')} type="password" />
      <SelectField label={S.officers.fRole} value={f.role ?? ''} onChange={set('role')} options={roles.map((r) => ({ value: r.value, label: r.label }))} placeholder="নির্বাচন করুন" />
      <FormField label={S.officers.fDesignation} value={f.designation ?? ''} onChange={set('designation')} />
      <SelectField label={S.officers.fUnion} value={f.union_id ?? ''} onChange={set('union_id')} options={unions} placeholder="নির্বাচন করুন" />
      <FormField label={S.officers.fWard} value={f.ward_no ?? ''} onChange={set('ward_no')} type="number" />
    </AppDialog>
  );
}

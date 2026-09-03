import { useEffect, useState } from 'react';
import {
  Alert, Box, MenuItem, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  TextField, Typography,
} from '@mui/material';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import { bnStrings as S } from '../../i18n';
import { api } from '../../api/client';
import { listUsers, type DirectoryUser } from '../../api/users';
import StatusPill from '../../components/StatusPill';
import PaginationBar from '../../components/PaginationBar';
import { usePagination } from '../../components/usePagination';
import { useSelectedTenant } from '../../tenant/SelectedTenantContext';
import { useAuth } from '../../auth/AuthContext';
import PageHeader from '../../components/PageHeader';
import CreateOfficerDialog from '../officers/CreateOfficerDialog';
import EditOfficerDialog from '../officers/EditOfficerDialog';
import { bn } from '../../utils/bnNum';

// Everyone attached to this upazila — officers, citizens, and the DC of its district. Read-only:
// provisioning lives on the কর্মকর্তা তালিকা page, which is why there is no add button here.
//
// Filtering is server-side: the citizen rows grow without bound as the public files complaints
// and books appointments, so narrowing in the browser would mean fetching them all first.
export default function UserList() {
  const { selectedUpazilaId } = useSelectedTenant();
  const { user } = useAuth();
  const isSeal = user?.role === 'seal_admin';
  const [open, setOpen] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [editing, setEditing] = useState<DirectoryUser | null>(null);
  const [rows, setRows] = useState<DirectoryUser[]>([]);
  const [roles, setRoles] = useState<{ value: string; label: string }[]>([]);
  const [role, setRole] = useState('');
  const [term, setTerm] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api<{ roles: { value: string; label: string }[] }>('/officer-roles')
      .then((r) => setRoles(r.roles))
      .catch(() => setRoles([]));
  }, []);

  useEffect(() => {
    setLoading(true);
    // Debounced so typing in the search box does not fire a request per keystroke.
    const t = setTimeout(() => {
      listUsers({ role: role || undefined, q: term.trim() || undefined })
        .then((r) => setRows(r.data))
        .catch(() => setRows([]))
        .finally(() => setLoading(false));
    }, 250);

    return () => clearTimeout(t);
  }, [role, term, selectedUpazilaId, reloadKey]);

  const { pageRows, page, setPage, pageCount } = usePagination(rows);

  return (
    <Box sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Box>
        <PageHeader title={S.users.title} primaryLabel={S.users.addNew} onPrimary={() => setOpen(true)} />
        <Typography sx={{ color: 'text.secondary' }}>{S.users.subtitle}</Typography>
      </Box>

      {flash && <Alert severity="success" onClose={() => setFlash(null)}>{flash}</Alert>}

      <Paper elevation={0} sx={{ p: 2, borderRadius: '16px', display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        <TextField
          select
          size="small"
          label={S.users.filterRole}
          value={role}
          onChange={(e) => setRole(e.target.value)}
          sx={{ minWidth: 200 }}
        >
          <MenuItem value="">{S.users.allRoles}</MenuItem>
          {roles.map((r) => (
            <MenuItem key={r.value} value={r.value}>{r.label}</MenuItem>
          ))}
          <MenuItem value="citizen">{S.users.citizen}</MenuItem>
        </TextField>
        <TextField
          size="small"
          label={S.users.filterSearch}
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          sx={{ flex: 1, minWidth: 220 }}
          InputProps={{ startAdornment: <SearchRoundedIcon sx={{ mr: 1, color: 'text.secondary' }} /> }}
        />
        <Typography sx={{ alignSelf: 'center', color: 'text.secondary', fontSize: 14 }}>
          {S.users.count(bn(rows.length))}
        </Typography>
      </Paper>

      <TableContainer component={Paper} elevation={0} sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', borderRadius: '16px' }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>{S.users.colName}</TableCell>
              {isSeal && <TableCell>{S.users.colUpazila}</TableCell>}
              <TableCell>{S.users.colRole}</TableCell>
              <TableCell>{S.users.colLogin}</TableCell>
              <TableCell>{S.users.colStatus}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {pageRows.map((u) => (
              // Citizens have no account to manage here — they sign in with a mobile OTP.
              <TableRow
                key={u.id}
                hover
                sx={{ cursor: u.role === 'citizen' ? 'default' : 'pointer' }}
                onClick={() => u.role !== 'citizen' && setEditing(u)}
              >
                <TableCell sx={{ fontWeight: 600 }}>{u.name}</TableCell>
                {isSeal && <TableCell>{u.upazila?.name_bn ?? '—'}</TableCell>}
                <TableCell>{u.role_label_bn}</TableCell>
                <TableCell sx={{ direction: 'ltr', fontFamily: 'monospace', fontSize: 13 }}>
                  {u.username ?? u.phone ?? '—'}
                </TableCell>
                <TableCell>
                  <StatusPill
                    label={u.is_active ? S.users.active : S.users.inactive}
                    tone={u.is_active ? 'success' : 'pending'}
                  />
                </TableCell>
              </TableRow>
            ))}
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={isSeal ? 5 : 4} align="center" sx={{ color: 'text.secondary', py: 4 }}>
                  {loading ? S.common.loading : S.common.noData}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        <PaginationBar page={page} pageCount={pageCount} onPage={setPage} />
      </TableContainer>

      <EditOfficerDialog
        officer={editing}
        onClose={() => setEditing(null)}
        onSaved={() => {
          setEditing(null);
          setFlash(S.officers.saved);
          setReloadKey((k) => k + 1);
        }}
      />

      <CreateOfficerDialog
        open={open}
        roles={roles}
        needsTenant={isSeal}
        selectedUpazilaId={selectedUpazilaId}
        onClose={() => setOpen(false)}
        onCreated={() => {
          setOpen(false);
          setFlash(S.users.created);
          setReloadKey((k) => k + 1);
        }}
      />
    </Box>
  );
}

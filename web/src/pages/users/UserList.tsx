import { useEffect, useState } from 'react';
import {
  Box, MenuItem, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
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
import { bn } from '../../utils/bnNum';

// Everyone attached to this upazila — officers, citizens, and the DC of its district. Read-only:
// provisioning lives on the কর্মকর্তা তালিকা page, which is why there is no add button here.
//
// Filtering is server-side: the citizen rows grow without bound as the public files complaints
// and books appointments, so narrowing in the browser would mean fetching them all first.
export default function UserList() {
  const { selectedUpazilaId } = useSelectedTenant();
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
  }, [role, term, selectedUpazilaId]);

  const { pageRows, page, setPage, pageCount } = usePagination(rows);

  return (
    <Box sx={{ display: 'grid', gap: 3 }}>
      <Box>
        <Typography sx={{ fontSize: 22, fontWeight: 800 }}>{S.users.title}</Typography>
        <Typography sx={{ color: 'text.secondary' }}>{S.users.subtitle}</Typography>
      </Box>

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

      <TableContainer component={Paper} elevation={0} sx={{ borderRadius: '16px' }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>{S.users.colName}</TableCell>
              <TableCell>{S.users.colRole}</TableCell>
              <TableCell>{S.users.colDesignation}</TableCell>
              <TableCell>{S.users.colLogin}</TableCell>
              <TableCell>{S.users.colStatus}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {pageRows.map((u) => (
              <TableRow key={u.id} hover>
                <TableCell sx={{ fontWeight: 600 }}>{u.name}</TableCell>
                <TableCell>{u.role_label_bn}</TableCell>
                <TableCell>{u.designation ?? '—'}</TableCell>
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
                <TableCell colSpan={5} align="center" sx={{ color: 'text.secondary', py: 4 }}>
                  {loading ? S.common.loading : S.common.noData}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        <PaginationBar page={page} pageCount={pageCount} onPage={setPage} />
      </TableContainer>
    </Box>
  );
}

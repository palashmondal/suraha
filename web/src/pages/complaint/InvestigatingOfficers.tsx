import { useEffect, useState } from 'react';
import {
  Alert, Box, Button, Paper, Switch, Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow,
} from '@mui/material';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import { useNavigate } from 'react-router-dom';
import { bnStrings as S } from '../../i18n';
import PageHeader from '../../components/PageHeader';
import StatusPill from '../../components/StatusPill';
import EmptyState from '../../components/EmptyState';
import LoadingState from '../../components/LoadingState';
import PaginationBar from '../../components/PaginationBar';
import { usePagination } from '../../components/usePagination';
import PhoneLink from '../../components/PhoneLink';
import { useSelectedTenant } from '../../tenant/SelectedTenantContext';
import type { Officer } from '../../api/officers';
import { listInvestigatingOfficers, setInvestigatorActive } from '../../api/investigators';
import EditOfficerDialog from '../officers/EditOfficerDialog';
import CreateOfficerDialog from '../officers/CreateOfficerDialog';
import { api } from '../../api/client';
import type { AssignableRole } from '../../api/officers';
import { useAuth } from '../../auth/AuthContext';

export default function InvestigatingOfficers() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isSeal = user?.role === 'seal_admin';
  const { selectedUpazilaId } = useSelectedTenant();
  const [rows, setRows] = useState<Officer[]>([]);
  const [loading, setLoading] = useState(true);
  const [flash, setFlash] = useState<string | null>(null);
  const [editing, setEditing] = useState<Officer | null>(null);
  const [adding, setAdding] = useState(false);
  const [roles, setRoles] = useState<AssignableRole[]>([]);

  useEffect(() => {
    api<{ roles: AssignableRole[] }>('/officer-roles')
      .then((r) => setRoles(r.roles))
      .catch(() => setRoles([]));
  }, []);

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
    <Box sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
      {/* Adds through the same form the সকল ব্যবহারকারী page uses — with the role fixed to
          তদন্ত কর্মকর্তা, so an account cannot be created into the wrong roster from here. */}
      <PageHeader title={S.investigators.title} primaryLabel={S.investigators.addNew} onPrimary={() => setAdding(true)} />
      {flash && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setFlash(null)}>{flash}</Alert>}

      <TableContainer component={Paper} elevation={0} sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', borderRadius: '16px' }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>{S.investigators.colName}</TableCell>
              <TableCell>{S.investigators.colDesignation}</TableCell>
              <TableCell>{S.investigators.colMobile}</TableCell>
              <TableCell>{S.investigators.colEmail}</TableCell>
              <TableCell>{S.investigators.colStatus}</TableCell>
              <TableCell align="right" />
            </TableRow>
          </TableHead>
          <TableBody>
            {pageRows.map((o) => (
              <TableRow
                key={o.id}
                hover
                onClick={() => navigate(`/investigators/${o.id}`)}
                sx={{ cursor: 'pointer' }}
              >
                <TableCell sx={{ fontWeight: 600 }}>{o.name}</TableCell>
                <TableCell>{o.designation ?? '—'}</TableCell>
                <TableCell sx={{ fontSize: 13, direction: 'ltr' }}><PhoneLink phone={o.phone} /></TableCell>
                <TableCell sx={{ direction: 'ltr' }}>{o.email ?? '—'}</TableCell>
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <StatusPill
                      label={o.is_active ? S.investigators.active : S.investigators.inactive}
                      tone={o.is_active ? 'success' : 'pending'}
                    />
                    <Switch size="small" checked={o.is_active} onChange={() => toggle(o)} />
                  </Box>
                </TableCell>
                <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                  <Button size="small" startIcon={<EditOutlinedIcon />} onClick={() => setEditing(o)}>
                    {S.investigators.editShort}
                  </Button>
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

      {/* The same form the সকল ব্যবহারকারী page uses — an investigating officer is just a user of
          this upazila, so there is no second edit form to keep in step. */}
      <CreateOfficerDialog
        open={adding}
        roles={roles}
        needsTenant={isSeal}
        selectedUpazilaId={selectedUpazilaId}
        lockedRole="investigating_officer"
        title={S.investigators.createTitle}
        onClose={() => setAdding(false)}
        onCreated={() => {
          setAdding(false);
          setFlash(S.investigators.created);
          void load();
        }}
      />

      <EditOfficerDialog
        officer={editing}
        onClose={() => setEditing(null)}
        onSaved={() => {
          setEditing(null);
          setFlash(S.investigators.saved);
          void load();
        }}
      />
    </Box>
  );
}

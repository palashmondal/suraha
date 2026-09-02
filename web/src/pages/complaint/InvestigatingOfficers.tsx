import { useEffect, useState } from 'react';
import {
  Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Paper, Stack, Switch,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography,
} from '@mui/material';
import { bnStrings as S } from '../../i18n';
import PageHeader from '../../components/PageHeader';
import StatusPill from '../../components/StatusPill';
import AppDialog from '../../components/AppDialog';
import { FormField } from '../../components/form/FormFields';
import EmptyState from '../../components/EmptyState';
import LoadingState from '../../components/LoadingState';
import PaginationBar from '../../components/PaginationBar';
import { usePagination } from '../../components/usePagination';
import { ApiError } from '../../api/client';
import { useAuth } from '../../auth/AuthContext';
import { useSelectedTenant } from '../../tenant/SelectedTenantContext';
import type { Officer } from '../../api/officers';
import {
  listInvestigatingOfficers, createInvestigatingOfficer, setInvestigatorActive,
  type NewInvestigatorCreds,
} from '../../api/investigators';

export default function InvestigatingOfficers() {
  const { user } = useAuth();
  const { selectedUpazilaId } = useSelectedTenant();
  // SEAL works across upazilas, so it needs one selected (X-Upazila) to add/list; a UNO's upazila
  // is pinned by its subdomain.
  const needsTenant = user?.role === 'seal_admin';

  const [rows, setRows] = useState<Officer[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);
  const [creds, setCreds] = useState<NewInvestigatorCreds | null>(null);

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
      <PageHeader title={S.investigators.title} primaryLabel={S.investigators.addNew} onPrimary={() => setOpen(true)} />
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

      <AddInvestigatorDialog
        open={open}
        needsTenant={needsTenant}
        hasTenant={!needsTenant || !!selectedUpazilaId}
        onClose={() => setOpen(false)}
        onCreated={(c) => {
          setOpen(false);
          setFlash(S.investigators.created);
          setCreds(c);
          load();
        }}
      />

      <Dialog open={!!creds} onClose={() => setCreds(null)}>
        <DialogTitle>{S.investigators.credsTitle}</DialogTitle>
        <DialogContent>
          <Typography sx={{ color: 'text.secondary', mb: 2, fontSize: 14 }}>{S.investigators.credsHelp}</Typography>
          <Stack spacing={1.5}>
            <CredRow label={S.investigators.credUsername} value={creds?.username ?? ''} />
            <CredRow label={S.investigators.credPassword} value={creds?.temp_password ?? ''} />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button variant="contained" onClick={() => setCreds(null)}>{S.investigators.credDone}</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

function CredRow({ label, value }: { label: string; value: string }) {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 3, bgcolor: 'action.hover', px: 2, py: 1, borderRadius: '10px' }}>
      <Typography sx={{ color: 'text.secondary' }}>{label}</Typography>
      <Typography sx={{ fontFamily: 'monospace', fontWeight: 700, direction: 'ltr' }}>{value}</Typography>
    </Box>
  );
}

function AddInvestigatorDialog({
  open, needsTenant, hasTenant, onClose, onCreated,
}: {
  open: boolean;
  needsTenant: boolean;
  hasTenant: boolean;
  onClose: () => void;
  onCreated: (creds: NewInvestigatorCreds) => void;
}) {
  const [f, setF] = useState<Record<string, string>>({});
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const set = (k: string) => (v: string) => setF((s) => ({ ...s, [k]: v }));

  useEffect(() => {
    if (open) { setF({}); setErr(null); }
  }, [open]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      const r = await createInvestigatingOfficer({
        name: f.name,
        designation: f.designation || undefined,
        email: f.email || undefined,
        phone: f.phone,
      });
      onCreated(r.credentials);
    } catch (e) {
      setErr(e instanceof ApiError ? (Object.values(e.errors ?? {})[0]?.[0] ?? e.message) : S.auth.genericError);
    } finally {
      setBusy(false);
    }
  };

  const blocked = needsTenant && !hasTenant;

  return (
    <AppDialog
      open={open}
      title={S.investigators.createTitle}
      onClose={onClose}
      onSubmit={submit}
      submitLabel={S.investigators.create}
      submitting={busy || blocked}
    >
      {blocked && <Alert severity="warning">{S.investigators.noTenant}</Alert>}
      {err && <Alert severity="error">{err}</Alert>}
      <FormField label={S.investigators.fName} value={f.name ?? ''} onChange={set('name')} />
      <FormField label={S.investigators.fDesignation} value={f.designation ?? ''} onChange={set('designation')} />
      <FormField label={S.investigators.fEmail} value={f.email ?? ''} onChange={set('email')} type="email" />
      <FormField label={S.investigators.fMobile} value={f.phone ?? ''} onChange={set('phone')} placeholder="01XXXXXXXXX" />
    </AppDialog>
  );
}

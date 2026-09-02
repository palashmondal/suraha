import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import { useNavigate } from 'react-router-dom';
import { bnStrings as S } from '../../i18n';
import { api, ApiError } from '../../api/client';
import StatusPill from '../../components/StatusPill';
import PaginationBar from '../../components/PaginationBar';
import { usePagination } from '../../components/usePagination';

interface UpazilaRow {
  id: string;
  name: string;
  name_bn: string;
  is_active: boolean;
  district?: { id: number; name: string; name_bn: string; slug: string | null; division?: Division | null };
  domain: string;
  created_at: string | null;
}

interface District {
  id: number;
  name: string;
  name_bn: string;
  division_id: number | null;
}

interface HostRow {
  key: string;
  kind: 'dc' | 'uno';
  id?: string;
  name_bn: string;
  district_bn: string;
  division_bn: string;
  domain: string;
  is_active: boolean;
}

interface Division {
  id: number;
  name: string;
  name_bn: string;
}

export default function Instances() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<UpazilaRow[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);
  const [divisions, setDivisions] = useState<Division[]>([]);
  const [open, setOpen] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);
  const [credentials, setCredentials] = useState<Credential[] | null>(null);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    api<{ data: UpazilaRow[] }>('/upazilas')
      .then((r) => setRows(r.data))
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    api<{ districts: District[] }>('/registry/districts')
      .then((r) => setDistricts(r.districts))
      .catch(() => setDistricts([]));
    api<{ divisions: Division[] }>('/registry/divisions')
      .then((r) => setDivisions(r.divisions))
      .catch(() => setDivisions([]));
  }, []);

  const onCreated = (creds: Credential[]) => {
    setOpen(false);
    setFlash(S.instances.created);
    setCredentials(creds.length ? creds : null);
    load();
  };

  // The roster lists every Suraha host, not just upazilas: each district that has at least one
  // upazila also has a DC dashboard on its own subdomain. That host is not provisioned separately
  // — it exists as soon as the district has an instance, and later upazilas just add to it.
  const hostRows: HostRow[] = (() => {
    const base = rows[0]?.domain.split('.').slice(1).join('.') ?? '';
    const districts = new Map<number, HostRow>();

    for (const u of rows) {
      const d = u.district;
      if (!d?.slug || districts.has(d.id)) continue;
      districts.set(d.id, {
        key: `dc-${d.slug}`,
        kind: 'dc',
        name_bn: '—',
        district_bn: d.name_bn,
        division_bn: d.division?.name_bn ?? '—',
        domain: `${d.slug}.${base}`,
        is_active: true,
      });
    }

    const upazilas: HostRow[] = rows.map((u) => ({
      key: u.id,
      kind: 'uno',
      id: u.id,
      name_bn: u.name_bn,
      district_bn: u.district?.name_bn ?? '—',
      division_bn: u.district?.division?.name_bn ?? '—',
      domain: u.domain,
      is_active: u.is_active,
    }));

    return [...districts.values(), ...upazilas].sort(
      (a, b) => a.district_bn.localeCompare(b.district_bn, 'bn') || a.kind.localeCompare(b.kind),
    );
  })();

  const { pageRows, page, setPage, pageCount } = usePagination(hostRows);

  return (
    <Box sx={{ display: 'grid', gap: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <Box sx={{ flex: 1 }}>
          <Typography sx={{ fontSize: 22, fontWeight: 800 }}>{S.instances.title}</Typography>
          <Typography sx={{ color: 'text.secondary' }}>{S.instances.subtitle}</Typography>
        </Box>
        <Button variant="contained" startIcon={<AddRoundedIcon />} onClick={() => setOpen(true)}>
          {S.instances.addNew}
        </Button>
      </Box>

      {flash && <Alert severity="success" onClose={() => setFlash(null)}>{flash}</Alert>}

      <TableContainer component={Paper} elevation={0} sx={{ borderRadius: '16px' }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>{S.instances.colKind}</TableCell>
              <TableCell>{S.instances.colUpazila}</TableCell>
              <TableCell>{S.instances.colDistrict}</TableCell>
              <TableCell>{S.instances.colDivision}</TableCell>
              <TableCell>{S.instances.colSubdomain}</TableCell>
              <TableCell>{S.instances.colStatus}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {pageRows.map((r) => (
              <TableRow
                key={r.key}
                hover
                sx={{ cursor: r.kind === 'uno' ? 'pointer' : 'default' }}
                onClick={() => r.kind === 'uno' && navigate(`/instances/${r.id}`)}
              >
                <TableCell>
                  <StatusPill
                    label={r.kind === 'dc' ? S.instances.kindDc : S.instances.kindUno}
                    tone={r.kind === 'dc' ? 'info' : 'pending'}
                  />
                </TableCell>
                <TableCell sx={{ fontWeight: 600 }}>{r.name_bn}</TableCell>
                <TableCell>{r.district_bn}</TableCell>
                <TableCell>{r.division_bn}</TableCell>
                <TableCell sx={{ direction: 'ltr', fontFamily: 'monospace', fontSize: 13 }}>
                  {r.domain}
                </TableCell>
                <TableCell>
                  <StatusPill
                    label={r.is_active ? S.instances.active : S.instances.inactive}
                    tone={r.is_active ? 'success' : 'pending'}
                  />
                </TableCell>
              </TableRow>
            ))}
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ color: 'text.secondary', py: 4 }}>
                  {loading ? S.common.loading : S.common.noData}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        {rows.length > 0 && (
          <PaginationBar page={page} pageCount={pageCount} onPage={setPage} />
        )}
      </TableContainer>

      <CreateInstanceDialog
        open={open}
        districts={districts}
        divisions={divisions}
        onClose={() => setOpen(false)}
        onCreated={onCreated}
      />

      <Dialog open={Boolean(credentials)} onClose={() => setCredentials(null)} fullWidth maxWidth="sm">
        <DialogTitle>{S.instances.credsTitle}</DialogTitle>
        <DialogContent sx={{ display: 'grid', gap: 2 }}>
          <Alert severity="warning">{S.instances.credsHelp}</Alert>
          {credentials?.map((c) => (
            <Paper key={c.username} variant="outlined" sx={{ p: 2, borderRadius: '12px', display: 'grid', gap: 0.5 }}>
              <Typography sx={{ fontWeight: 700 }}>{c.role_label}</Typography>
              <Typography sx={{ fontSize: 14 }}>
                {S.instances.credUsername}: <b style={{ fontFamily: 'monospace' }}>{c.username}</b>
              </Typography>
              <Typography sx={{ fontSize: 14 }}>
                {S.instances.credPassword}: <b style={{ fontFamily: 'monospace' }}>{c.temp_password}</b>
              </Typography>
            </Paper>
          ))}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button variant="contained" onClick={() => setCredentials(null)}>{S.instances.credDone}</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

interface Credential {
  username: string;
  role: string;
  role_label: string;
  temp_password: string;
}

interface UpazilaOption {
  id: number;
  name: string;
  name_bn: string;
  slug: string;
  taken: boolean;
}

// Location is picked, never typed: বিভাগ → জেলা → উপজেলা, each step filtering the next. The
// subdomain is not an input at all — every upazila carries its own slug in the catalogue, unique
// nationwide (nine upazila names recur across districts, so those are qualified with the
// district). Upazilas already provisioned are shown disabled rather than failing on submit.
function CreateInstanceDialog({
  open,
  districts,
  divisions,
  onClose,
  onCreated,
}: {
  open: boolean;
  districts: District[];
  divisions: Division[];
  onClose: () => void;
  onCreated: (creds: Credential[]) => void;
}) {
  const [divisionId, setDivisionId] = useState('');
  const [districtId, setDistrictId] = useState('');
  const [upazilas, setUpazilas] = useState<UpazilaOption[]>([]);
  const [upazilaId, setUpazilaId] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!districtId) {
      setUpazilas([]);
      return;
    }
    api<{ upazilas: UpazilaOption[] }>(`/registry/upazila-options?district_id=${districtId}`)
      .then((r) => setUpazilas(r.upazilas))
      .catch(() => setUpazilas([]));
  }, [districtId]);

  const chosen = upazilas.find((u) => String(u.id) === upazilaId);
  // The instance console only runs on the central host, so its own host IS the base domain.
  const domain = chosen ? `${chosen.slug}.${window.location.host}` : '';

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chosen) return;
    setErr(null);
    setBusy(true);
    try {
      const res = await api<{ credentials: Credential[] }>('/upazilas', {
        method: 'POST',
        body: {
          slug: chosen.slug,
          name: chosen.name,
          name_bn: chosen.name_bn,
          district_id: Number(districtId),
        },
      });
      onCreated(res.credentials ?? []);
    } catch (e) {
      if (e instanceof ApiError) setErr(Object.values(e.errors ?? {})[0]?.[0] ?? e.message);
      else setErr(S.auth.genericError);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{S.instances.createTitle}</DialogTitle>
      <Box component="form" onSubmit={submit}>
        <DialogContent sx={{ display: 'grid', gap: 2 }}>
          {err && <Alert severity="error">{err}</Alert>}

          <TextField
            select
            label={S.instances.division}
            value={divisionId}
            onChange={(e) => {
              setDivisionId(e.target.value);
              setDistrictId('');
              setUpazilaId('');
            }}
            required
            fullWidth
          >
            {divisions.map((v) => (
              <MenuItem key={v.id} value={String(v.id)}>{v.name_bn}</MenuItem>
            ))}
          </TextField>

          <TextField
            select
            label={S.instances.district}
            value={districtId}
            onChange={(e) => {
              setDistrictId(e.target.value);
              setUpazilaId('');
            }}
            required
            fullWidth
            disabled={!divisionId}
            helperText={divisionId ? undefined : S.instances.divisionFirst}
          >
            {districts
              .filter((d) => String(d.division_id) === divisionId)
              .map((d) => (
                <MenuItem key={d.id} value={String(d.id)}>{d.name_bn}</MenuItem>
              ))}
          </TextField>

          <TextField
            select
            label={S.instances.upazila}
            value={upazilaId}
            onChange={(e) => setUpazilaId(e.target.value)}
            required
            fullWidth
            disabled={!districtId}
            helperText={districtId ? undefined : S.instances.districtFirst}
          >
            {upazilas.map((u) => (
              <MenuItem key={u.id} value={String(u.id)} disabled={u.taken}>
                {u.name_bn}
                {u.taken ? ` — ${S.instances.alreadyTaken}` : ''}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            label={S.instances.subdomainAuto}
            value={domain}
            InputProps={{ readOnly: true, sx: { fontFamily: 'monospace', direction: 'ltr' } }}
            fullWidth
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={onClose} disabled={busy}>{S.instances.cancel}</Button>
          <Button type="submit" variant="contained" disabled={busy || !chosen}>
            {S.instances.create}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}

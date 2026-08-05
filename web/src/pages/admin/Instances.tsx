import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  MenuItem,
  Paper,
  Switch,
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
import { bn } from '../../utils/bnNum';
import { api, ApiError } from '../../api/client';
import StatusPill from '../../components/StatusPill';
import PaginationBar from '../../components/PaginationBar';
import { usePagination } from '../../components/usePagination';

interface UpazilaRow {
  id: string;
  name: string;
  name_bn: string;
  is_active: boolean;
  district?: { id: number; name: string; name_bn: string };
  unions_count?: number;
  domain: string;
  created_at: string | null;
}

interface District {
  id: number;
  name: string;
  name_bn: string;
}

export default function Instances() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<UpazilaRow[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);
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
  }, []);

  const onCreated = (creds: Credential[]) => {
    setOpen(false);
    setFlash(S.instances.created);
    setCredentials(creds.length ? creds : null);
    load();
  };

  const { pageRows, page, setPage, pageSize, setPageSize, pageCount } = usePagination(rows);

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
              <TableCell>{S.instances.colUpazila}</TableCell>
              <TableCell>{S.instances.colDistrict}</TableCell>
              <TableCell>{S.instances.colSubdomain}</TableCell>
              <TableCell align="center">{S.instances.colUnions}</TableCell>
              <TableCell>{S.instances.colStatus}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {pageRows.map((u) => (
              <TableRow
                key={u.id}
                hover
                sx={{ cursor: 'pointer' }}
                onClick={() => navigate(`/instances/${u.id}`)}
              >
                <TableCell sx={{ fontWeight: 600 }}>{u.name_bn}</TableCell>
                <TableCell>{u.district?.name_bn ?? '—'}</TableCell>
                <TableCell sx={{ direction: 'ltr', fontFamily: 'monospace', fontSize: 13 }}>
                  {u.domain}
                </TableCell>
                <TableCell align="center">{bn(u.unions_count ?? 0)}</TableCell>
                <TableCell>
                  <StatusPill
                    label={u.is_active ? S.instances.active : S.instances.inactive}
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
        {rows.length > 0 && (
          <PaginationBar page={page} pageCount={pageCount} pageSize={pageSize} onPage={setPage} onPageSize={setPageSize} />
        )}
      </TableContainer>

      <CreateInstanceDialog
        open={open}
        districts={districts}
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

function CreateInstanceDialog({
  open,
  districts,
  onClose,
  onCreated,
}: {
  open: boolean;
  districts: District[];
  onClose: () => void;
  onCreated: (creds: Credential[]) => void;
}) {
  const [slug, setSlug] = useState('');
  const [nameBn, setNameBn] = useState('');
  const [name, setName] = useState('');
  const [districtId, setDistrictId] = useState<string>('');
  const [newDistrict, setNewDistrict] = useState(false);
  const [districtBn, setDistrictBn] = useState('');
  const [districtEn, setDistrictEn] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      const res = await api<{ credentials: Credential[] }>('/upazilas', {
        method: 'POST',
        body: {
          slug,
          name,
          name_bn: nameBn,
          ...(newDistrict
            ? { district_name: districtEn, district_name_bn: districtBn }
            : { district_id: Number(districtId) }),
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
            label={S.instances.slug}
            value={slug}
            onChange={(e) => setSlug(e.target.value.toLowerCase())}
            placeholder="golachipa"
            required
            fullWidth
          />
          <TextField label={S.instances.nameBn} value={nameBn} onChange={(e) => setNameBn(e.target.value)} required fullWidth />
          <TextField label={S.instances.nameEn} value={name} onChange={(e) => setName(e.target.value)} required fullWidth />

          <FormControlLabel
            control={<Switch checked={newDistrict} onChange={(e) => setNewDistrict(e.target.checked)} />}
            label={S.instances.newDistrict}
          />

          {newDistrict ? (
            <>
              <TextField label={S.instances.districtBn} value={districtBn} onChange={(e) => setDistrictBn(e.target.value)} required fullWidth />
              <TextField label={S.instances.districtEn} value={districtEn} onChange={(e) => setDistrictEn(e.target.value)} required fullWidth />
            </>
          ) : (
            <TextField
              select
              label={S.instances.district}
              value={districtId}
              onChange={(e) => setDistrictId(e.target.value)}
              required
              fullWidth
            >
              {districts.map((d) => (
                <MenuItem key={d.id} value={String(d.id)}>
                  {d.name_bn}
                </MenuItem>
              ))}
            </TextField>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={onClose} disabled={busy}>{S.instances.cancel}</Button>
          <Button type="submit" variant="contained" disabled={busy}>{S.instances.create}</Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}

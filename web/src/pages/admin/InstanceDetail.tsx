import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Divider,
  FormControlLabel,
  MenuItem,
  Paper,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import { useNavigate, useParams } from 'react-router-dom';
import { bnStrings as S } from '../../i18n';
import { api, ApiError } from '../../api/client';

interface UpazilaDetail {
  id: string;
  name: string;
  name_bn: string;
  is_active: boolean;
  district?: { id: number; name_bn: string; division?: DivisionOption | null };
  domain: string;
}

interface DistrictOption {
  id: number;
  name: string;
  name_bn: string;
  division_id: number | null;
}

interface DivisionOption {
  id: number;
  name: string;
  name_bn: string;
}

// Instance edit page: rename the upazila (Bangla/English), move it to another of the 64 districts,
// toggle active status, or delete the instance (and all its data). The subdomain is derived from
// the tenant's immutable slug ({slug}.{base domain}) and so is shown read-only — renaming it would
// change the instance's identity and break every existing link and bookmark.
//
// Location follows the বিভাগ → জেলা hierarchy: division filters the district list, and only the
// district is persisted (the division is implied by it).
export default function InstanceDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [nameBn, setNameBn] = useState('');
  const [nameEn, setNameEn] = useState('');
  const [districtId, setDistrictId] = useState<number | ''>('');
  const [divisionId, setDivisionId] = useState<number | ''>('');
  const [isActive, setIsActive] = useState(true);
  const [domain, setDomain] = useState('');

  const [districts, setDistricts] = useState<DistrictOption[]>([]);
  const [divisions, setDivisions] = useState<DivisionOption[]>([]);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const fail = (e: unknown) => {
    setMsg(null);
    if (e instanceof ApiError) setErr(Object.values(e.errors ?? {})[0]?.[0] ?? e.message);
    else setErr(S.auth.genericError);
  };

  useEffect(() => {
    api<{ districts: DistrictOption[] }>('/registry/districts')
      .then((r) => setDistricts(r.districts))
      .catch(() => setDistricts([]));
    api<{ divisions: DivisionOption[] }>('/registry/divisions')
      .then((r) => setDivisions(r.divisions))
      .catch(() => setDivisions([]));
  }, []);

  useEffect(() => {
    if (!id) return;
    api<{ data: UpazilaDetail }>(`/upazilas/${id}`)
      .then((r) => {
        const u = r.data;
        setNameBn(u.name_bn);
        setNameEn(u.name);
        setDistrictId(u.district?.id ?? '');
        setDivisionId(u.district?.division?.id ?? '');
        setIsActive(u.is_active);
        setDomain(u.domain);
      })
      .catch(fail);
  }, [id]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      await api(`/upazilas/${id}`, {
        method: 'PUT',
        body: { name: nameEn, name_bn: nameBn, district_id: districtId, is_active: isActive },
      });
      setMsg(S.instances.saved);
    } catch (e) {
      fail(e);
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    setBusy(true);
    setErr(null);
    try {
      await api(`/upazilas/${id}`, { method: 'DELETE' });
      navigate('/instances', { replace: true });
    } catch (e) {
      setConfirmOpen(false);
      fail(e);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Box sx={{ maxWidth: 720, mx: 'auto', display: 'grid', gap: 3 }}>
      <Button
        startIcon={<ArrowBackRoundedIcon />}
        onClick={() => navigate('/instances')}
        sx={{ justifySelf: 'start' }}
      >
        {S.instances.back}
      </Button>

      <Typography sx={{ fontSize: 22, fontWeight: 800 }}>
        {S.instances.editTitle} — {nameBn || id}
      </Typography>

      {msg && <Alert severity="success">{msg}</Alert>}
      {err && <Alert severity="error">{err}</Alert>}

      <Paper component="form" onSubmit={save} elevation={0} sx={{ p: 3, borderRadius: '16px', display: 'grid', gap: 2.5 }}>
        <TextField
          label={S.instances.subdomainReadonly}
          value={domain}
          InputProps={{ readOnly: true, sx: { fontFamily: 'monospace', direction: 'ltr' } }}
          fullWidth
        />
        <TextField label={S.instances.nameBn} value={nameBn} onChange={(e) => setNameBn(e.target.value)} fullWidth />
        <TextField label={S.instances.nameEn} value={nameEn} onChange={(e) => setNameEn(e.target.value)} fullWidth />
        <TextField
          select
          label={S.instances.division}
          value={divisionId}
          onChange={(e) => {
            setDivisionId(Number(e.target.value));
            setDistrictId('');
          }}
          fullWidth
        >
          {divisions.map((v) => (
            <MenuItem key={v.id} value={v.id}>
              {v.name_bn}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          select
          label={S.instances.district}
          value={districtId}
          onChange={(e) => setDistrictId(Number(e.target.value))}
          fullWidth
          disabled={divisionId === ''}
          helperText={divisionId === '' ? S.instances.divisionFirst : undefined}
        >
          {districts
            .filter((d) => d.division_id === divisionId)
            .map((d) => (
              <MenuItem key={d.id} value={d.id}>
                {d.name_bn}
              </MenuItem>
            ))}
        </TextField>
        <FormControlLabel
          control={<Switch checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />}
          label={S.instances.activeLabel}
        />
        <Box>
          <Button type="submit" variant="contained" disabled={busy}>
            {S.instances.save}
          </Button>
        </Box>
      </Paper>

      <Paper elevation={0} sx={{ p: 3, borderRadius: '16px', border: (t) => `1px solid ${t.palette.error.light}` }}>
        <Typography sx={{ fontWeight: 700, color: 'error.main' }}>{S.instances.deleteBtn}</Typography>
        <Divider sx={{ my: 1.5 }} />
        <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={2}>
          <Typography sx={{ color: 'text.secondary', fontSize: 14 }}>
            {S.instances.deleteConfirmBody}
          </Typography>
          <Button
            variant="outlined"
            color="error"
            startIcon={<DeleteOutlineRoundedIcon />}
            onClick={() => setConfirmOpen(true)}
            disabled={busy}
            sx={{ flexShrink: 0 }}
          >
            {S.instances.deleteBtn}
          </Button>
        </Stack>
      </Paper>

      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)}>
        <DialogTitle>{S.instances.deleteConfirmTitle}</DialogTitle>
        <DialogContent>
          <DialogContentText>{S.instances.deleteConfirmBody}</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmOpen(false)} disabled={busy}>
            {S.instances.cancel}
          </Button>
          <Button onClick={remove} color="error" variant="contained" disabled={busy}>
            {S.instances.deleteConfirm}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

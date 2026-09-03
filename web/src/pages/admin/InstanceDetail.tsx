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
  district?: { id: number; name_bn: string; division?: { id: number; name_bn: string } | null };
  domain: string;
}

// Instance page. Everything that identifies the instance — বিভাগ, জেলা, উপজেলা and the subdomain
// derived from it — is fixed at creation and shown read-only: it comes from the national
// catalogue and says which real upazila this instance IS. Editing it would silently repoint a
// live subdomain at a different place, so correcting a mistake means deleting and recreating.
//
// That leaves two actions: toggle the instance active, or delete it and all its data.
export default function InstanceDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [instance, setInstance] = useState<UpazilaDetail | null>(null);
  const [isActive, setIsActive] = useState(true);
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
    if (!id) return;
    api<{ data: UpazilaDetail }>(`/upazilas/${id}`)
      .then((r) => {
        setInstance(r.data);
        setIsActive(r.data.is_active);
      })
      .catch(fail);
  }, [id]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      await api(`/upazilas/${id}`, { method: 'PUT', body: { is_active: isActive } });
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

  const readOnly = { readOnly: true } as const;

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
        {S.instances.editTitle} — {instance?.name_bn || id}
      </Typography>

      {msg && <Alert severity="success">{msg}</Alert>}
      {err && <Alert severity="error">{err}</Alert>}

      <Paper component="form" onSubmit={save} elevation={0} sx={{ p: 3, borderRadius: '16px', display: 'grid', gap: 2.5 }}>
        <TextField
          label={S.instances.division}
          value={instance?.district?.division?.name_bn ?? ''}
          InputProps={readOnly}
          fullWidth
        />
        <TextField
          label={S.instances.district}
          value={instance?.district?.name_bn ?? ''}
          InputProps={readOnly}
          fullWidth
        />
        <TextField
          label={S.instances.upazila}
          value={instance?.name_bn ?? ''}
          InputProps={readOnly}
          fullWidth
        />
        <TextField
          label={S.instances.subdomainReadonly}
          value={instance?.domain ?? ''}
          InputProps={{ ...readOnly, sx: { fontFamily: 'monospace', direction: 'ltr' } }}
          fullWidth
        />
        <FormControlLabel
          control={<Switch checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />}
          label={S.instances.activeLabel}
        />
        <Box>
          <Button type="submit" variant="contained" disabled={busy || !instance}>
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
          <Alert severity="warning" sx={{ mb: 2 }}>
            {instance?.domain}
          </Alert>
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

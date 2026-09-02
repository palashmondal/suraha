import { useState } from 'react';
import { Alert, Box, Button, Chip, Stack, TextField } from '@mui/material';
import MyLocationRoundedIcon from '@mui/icons-material/MyLocationRounded';
import AttachFileRoundedIcon from '@mui/icons-material/AttachFileRounded';
import { useNavigate } from 'react-router-dom';
import SubPageHeader from './SubPageHeader';
import { bnStrings as S } from '../../i18n';
import { useAuth } from '../../auth/AuthContext';
import { useSync } from '../../offline/SyncProvider';

// Citizen files a complaint (SURAHA_BUILD_PROMPT §8.4): identity + live location + address + attachment
// + description. Submit-or-queue: on a live connection it POSTs; offline it is stored and background-
// synced. Filing requires a citizen account (§1.1(6)) — enforced by the route guard.
export default function FileComplaint() {
  const nav = useNavigate();
  const { user } = useAuth();
  const { submit } = useSync();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [union, setUnion] = useState('');
  const [ward, setWard] = useState('');
  const [address, setAddress] = useState('');
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<'submitted' | 'queued' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const captureLocation = () => {
    if (!('geolocation' in navigator)) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => setError('অবস্থান পাওয়া যায়নি'),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await submit({
        kind: 'complaint.create',
        endpoint: '/complaints',
        method: 'POST',
        label: title,
        payload: {
          title,
          description,
          union,
          ward,
          address,
          location: coords,
          attachment_name: fileName,
          citizen_mobile: user?.mobile,
        },
      });
      setResult(res.queued ? 'queued' : 'submitted');
      setTimeout(() => nav('/citizen/applications', { replace: true }), 1400);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'জমা দেওয়া যায়নি');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Box>
      <SubPageHeader title={S.citizen.fileComplaint} />
      {result ? (
        <Alert severity={result === 'queued' ? 'warning' : 'success'}>
          {result === 'queued' ? S.citizen.queued : S.citizen.submitted}
        </Alert>
      ) : (
        <Box component="form" onSubmit={onSubmit}>
          <Stack spacing={2}>
            {error ? <Alert severity="error">{error}</Alert> : null}
            <TextField label={S.citizen.subject} value={title} onChange={(e) => setTitle(e.target.value)} required fullWidth />
            <TextField label={S.citizen.description} value={description} onChange={(e) => setDescription(e.target.value)} required fullWidth multiline minRows={3} />
            <TextField label={S.citizen.union} value={union} onChange={(e) => setUnion(e.target.value)} required fullWidth />
            <TextField label={S.citizen.ward} value={ward} onChange={(e) => setWard(e.target.value)} fullWidth />
            <TextField label={S.citizen.address} value={address} onChange={(e) => setAddress(e.target.value)} fullWidth multiline minRows={2} />

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
              <Button variant="outlined" startIcon={<MyLocationRoundedIcon />} onClick={captureLocation}>
                {S.citizen.useLocation}
              </Button>
              {coords ? <Chip color="success" label={S.citizen.locationCaptured} /> : null}
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
              <Button component="label" variant="outlined" startIcon={<AttachFileRoundedIcon />}>
                {S.citizen.attachment}
                <input hidden type="file" accept="image/*,application/pdf" onChange={(e) => setFileName(e.target.files?.[0]?.name ?? null)} />
              </Button>
              {fileName ? <Chip label={fileName} onDelete={() => setFileName(null)} /> : null}
            </Box>

            <Button type="submit" variant="contained" size="large" disabled={busy}>
              {S.citizen.submit}
            </Button>
          </Stack>
        </Box>
      )}
    </Box>
  );
}

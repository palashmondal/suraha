import { useEffect, useState } from 'react';
import { Box, Button, IconButton, Paper, Stack, Typography } from '@mui/material';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import PhoneRoundedIcon from '@mui/icons-material/PhoneRounded';
import { bnStrings as S } from '../../i18n';
import { bn } from '../../utils/bnNum';
import SectionTitle from '../../components/SectionTitle';
import AppDialog from '../../components/AppDialog';
import { FormField } from '../../components/form/FormFields';
import { useSelectedTenant } from '../../tenant/SelectedTenantContext';
import { listGeneralInfo, createInfo, deleteInfo, type InfoItem } from '../../api/content';

export default function GeneralInfoManage() {
  const { version } = useSelectedTenant();
  const [phones, setPhones] = useState<InfoItem[]>([]);
  const [about, setAbout] = useState<InfoItem[]>([]);
  const [dialog, setDialog] = useState<null | 'phone' | 'about'>(null);

  const load = () => listGeneralInfo().then((r) => { setPhones(r.phones); setAbout(r.about); }).catch(() => { setPhones([]); setAbout([]); });
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [version]);

  const remove = async (id: number) => { await deleteInfo(id); load(); };

  return (
    <Box sx={{ display: 'grid', gap: 4, maxWidth: 760 }}>
      <Typography sx={{ fontSize: 22, fontWeight: 800 }}>{S.generalInfo.title}</Typography>

      {/* Phones */}
      <Box>
        <Stack direction="row" alignItems="center" sx={{ mb: 1.5 }}>
          <SectionTitle>{S.generalInfo.phones}</SectionTitle>
          <Box sx={{ flex: 1 }} />
          <Button size="small" startIcon={<AddRoundedIcon />} onClick={() => setDialog('phone')}>{S.generalInfo.addPhone}</Button>
        </Stack>
        <Paper elevation={0} sx={{ borderRadius: '14px', border: (t) => `1px solid ${t.palette.divider}` }}>
          {phones.length === 0 && <Typography sx={{ p: 2, color: 'text.secondary' }}>{S.generalInfo.empty}</Typography>}
          {phones.map((p, i) => (
            <Stack key={p.id} direction="row" alignItems="center" spacing={1.5} sx={{ px: 2, py: 1.5, borderTop: i ? (t) => `1px solid ${t.palette.divider}` : 'none' }}>
              <PhoneRoundedIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
              <Typography sx={{ flex: 1 }}>{p.title}</Typography>
              <Typography sx={{ fontFamily: 'monospace' }}>{bn(p.value)}</Typography>
              <IconButton size="small" color="error" onClick={() => remove(p.id)}><DeleteOutlineRoundedIcon fontSize="small" /></IconButton>
            </Stack>
          ))}
        </Paper>
      </Box>

      {/* About */}
      <Box>
        <Stack direction="row" alignItems="center" sx={{ mb: 1.5 }}>
          <SectionTitle>{S.generalInfo.about}</SectionTitle>
          <Box sx={{ flex: 1 }} />
          <Button size="small" startIcon={<AddRoundedIcon />} onClick={() => setDialog('about')}>{S.generalInfo.addAbout}</Button>
        </Stack>
        <Stack spacing={1.5}>
          {about.length === 0 && <Typography sx={{ color: 'text.secondary' }}>{S.generalInfo.empty}</Typography>}
          {about.map((a) => (
            <Paper key={a.id} elevation={0} sx={{ p: 2, borderRadius: '14px', border: (t) => `1px solid ${t.palette.divider}` }}>
              <Stack direction="row" alignItems="center">
                <Typography sx={{ flex: 1, fontWeight: 700 }}>{a.title}</Typography>
                <IconButton size="small" color="error" onClick={() => remove(a.id)}><DeleteOutlineRoundedIcon fontSize="small" /></IconButton>
              </Stack>
              <Typography sx={{ color: 'text.secondary', mt: 0.5, whiteSpace: 'pre-wrap' }}>{a.value}</Typography>
            </Paper>
          ))}
        </Stack>
      </Box>

      <AddInfoDialog which={dialog} onClose={() => setDialog(null)} onDone={() => { setDialog(null); load(); }} />
    </Box>
  );
}

function AddInfoDialog({ which, onClose, onDone }: { which: null | 'phone' | 'about'; onClose: () => void; onDone: () => void }) {
  const [title, setTitle] = useState('');
  const [value, setValue] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => { setTitle(''); setValue(''); }, [which]);
  if (!which) return null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await createInfo({ type: which, title, value });
      onDone();
    } finally {
      setBusy(false);
    }
  };

  return (
    <AppDialog open title={which === 'phone' ? S.generalInfo.addPhone : S.generalInfo.addAbout} onClose={onClose} onSubmit={submit} submitLabel={S.generalInfo.save} submitting={busy} maxWidth="xs">
      <FormField label={S.generalInfo.fLabel} value={title} onChange={setTitle} />
      <FormField
        label={which === 'phone' ? S.generalInfo.fNumber : S.generalInfo.fBody}
        value={value}
        onChange={setValue}
        multiline={which === 'about'}
        placeholder={which === 'phone' ? '01XXXXXXXXX' : ''}
      />
    </AppDialog>
  );
}

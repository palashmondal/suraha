import { useEffect, useRef, useState } from 'react';
import { Box, IconButton, Paper, Stack, Switch, Typography } from '@mui/material';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import { bnStrings as S } from '../../i18n';
import { bn } from '../../utils/bnNum';
import PageHeader from '../../components/PageHeader';
import StatusPill from '../../components/StatusPill';
import EmptyState from '../../components/EmptyState';
import AppDialog from '../../components/AppDialog';
import ConfirmDialog from '../../components/ConfirmDialog';
import { FormField } from '../../components/form/FormFields';
import FileDropzone from '../../components/form/FileDropzone';
import { useSelectedTenant } from '../../tenant/SelectedTenantContext';
import { listSliders, createSlider, toggleSlider, deleteSlider, type Slider } from '../../api/content';

export default function SliderManage() {
  const { version } = useSelectedTenant();
  const [rows, setRows] = useState<Slider[]>([]);
  const [open, setOpen] = useState(false);
  const [del, setDel] = useState<Slider | null>(null);

  const load = () => listSliders().then((r) => setRows(r.sliders)).catch(() => setRows([]));
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [version]);

  return (
    <Box>
      <PageHeader title={S.sliders.title} primaryLabel={S.sliders.addNew} onPrimary={() => setOpen(true)} />

      {rows.length === 0 ? (
        <Paper elevation={0} sx={{ borderRadius: '16px' }}><EmptyState /></Paper>
      ) : (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: 'repeat(3,1fr)' }, gap: 2.5 }}>
          {rows.map((s) => (
            <Paper key={s.id} elevation={0} sx={{ borderRadius: '16px', overflow: 'hidden', border: (t) => `1px solid ${t.palette.divider}` }}>
              <Box sx={{ height: 150, bgcolor: 'action.hover', backgroundImage: s.image_url ? `url(${s.image_url})` : undefined, backgroundSize: 'cover', backgroundPosition: 'center' }} />
              <Box sx={{ p: 2 }}>
                <Stack direction="row" alignItems="center" spacing={1}>
                  <Typography sx={{ flex: 1, fontWeight: 600 }} noWrap>{s.title}</Typography>
                  <IconButton size="small" color="error" onClick={() => setDel(s)}><DeleteOutlineRoundedIcon fontSize="small" /></IconButton>
                </Stack>
                <Typography sx={{ fontSize: 12.5, color: 'text.secondary' }}>{s.slide_date ? bn(s.slide_date) : ''}</Typography>
                <Stack direction="row" alignItems="center" spacing={1} sx={{ mt: 1 }}>
                  <StatusPill label={s.is_active ? S.sliders.running : S.sliders.stopped} tone={s.is_active ? 'success' : 'pending'} />
                  <Switch size="small" checked={s.is_active} onChange={async () => { await toggleSlider(s.id, !s.is_active); load(); }} />
                </Stack>
              </Box>
            </Paper>
          ))}
        </Box>
      )}

      <CreateSliderDialog open={open} onClose={() => setOpen(false)} onCreated={() => { setOpen(false); load(); }} />
      <ConfirmDialog
        open={Boolean(del)}
        title={S.sliders.title}
        message={S.sliders.deleteConfirm}
        confirmLabel={S.generalInfo.del}
        destructive
        onClose={() => setDel(null)}
        onConfirm={async () => { if (del) await deleteSlider(del.id); setDel(null); load(); }}
      />
    </Box>
  );
}

function CreateSliderDialog({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: () => void }) {
  const [title, setTitle] = useState('');
  const [link, setLink] = useState('');
  const fileRef = useRef<File | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (open) { setTitle(''); setLink(''); fileRef.current = null; } }, [open]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append('title', title);
      if (link) fd.append('link', link);
      if (fileRef.current) fd.append('image', fileRef.current);
      await createSlider(fd);
      onCreated();
    } finally {
      setBusy(false);
    }
  };

  return (
    <AppDialog open={open} title={S.sliders.createTitle} onClose={onClose} onSubmit={submit} submitLabel={S.sliders.save} submitting={busy}>
      <FileDropzone onFile={(f) => { fileRef.current = f; }} accept="image/*" />
      <FormField label={S.sliders.fTitle} value={title} onChange={setTitle} />
      <FormField label={S.sliders.fLink} value={link} onChange={setLink} placeholder="https://…" />
    </AppDialog>
  );
}

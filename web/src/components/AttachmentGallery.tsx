import { useCallback, useEffect, useState } from 'react';
import { Box, Button, Dialog, DialogContent, DialogTitle, IconButton, Stack, Typography } from '@mui/material';
import PictureAsPdfRoundedIcon from '@mui/icons-material/PictureAsPdfRounded';
import DownloadRoundedIcon from '@mui/icons-material/DownloadRounded';
import OpenInNewRoundedIcon from '@mui/icons-material/OpenInNewRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import ChevronLeftRoundedIcon from '@mui/icons-material/ChevronLeftRounded';
import ChevronRightRoundedIcon from '@mui/icons-material/ChevronRightRounded';
import { bnStrings as S } from '../i18n';
import { bn } from '../utils/bnNum';
import type { Attachment } from '../api/attachments';

/**
 * The files on a submission: photos as a thumbnail grid, PDFs as named rows. Opening one shows it
 * in the page — a PDF in an iframe, a photo full-size with arrows through the other photos, so an
 * officer can look through what was filed without leaving the case.
 */
export default function AttachmentGallery({ attachments, dense = false }: {
  attachments: Attachment[];
  dense?: boolean; // inside a timeline step, where the thumbnails sit in a tight row
}) {
  const images = attachments.filter((a) => a.kind === 'image');
  const pdfs = attachments.filter((a) => a.kind === 'pdf');
  // Index into `attachments` — one viewer for both kinds keeps the arrows working across a
  // mixed set the way a phone gallery does.
  const [openAt, setOpenAt] = useState<number | null>(null);
  const current = openAt === null ? null : attachments[openAt];

  const step = useCallback((by: number) => {
    setOpenAt((at) => (at === null ? at : (at + by + attachments.length) % attachments.length));
  }, [attachments.length]);

  // Arrow keys are how anyone looks through photos; MUI's Dialog already handles Escape.
  useEffect(() => {
    if (openAt === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') step(-1);
      if (e.key === 'ArrowRight') step(1);
    };
    window.addEventListener('keydown', onKey);

    return () => window.removeEventListener('keydown', onKey);
  }, [openAt, step]);

  if (attachments.length === 0) return null;

  const thumb = dense ? 72 : 104;

  return (
    <Box>
      {images.length > 0 && (
        <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 1 }}>
          {images.map((a) => (
            <Box
              key={a.url}
              component="img"
              src={a.url}
              alt={a.original_name ?? ''}
              loading="lazy"
              onClick={() => setOpenAt(attachments.indexOf(a))}
              sx={{
                width: thumb,
                height: thumb,
                objectFit: 'cover',
                borderRadius: '12px',
                cursor: 'pointer',
                border: (t) => `1px solid ${t.palette.divider}`,
                transition: 'transform 120ms ease',
                '&:hover': { transform: 'scale(1.03)' },
              }}
            />
          ))}
        </Stack>
      )}

      {pdfs.length > 0 && (
        <Stack sx={{ gap: 1, mt: images.length ? 1.5 : 0 }}>
          {pdfs.map((a) => (
            <Stack
              key={a.url}
              direction="row"
              spacing={1}
              alignItems="center"
              onClick={() => setOpenAt(attachments.indexOf(a))}
              sx={{
                px: 1.5,
                py: 1,
                borderRadius: '12px',
                cursor: 'pointer',
                border: (t) => `1px solid ${t.palette.divider}`,
                '&:hover': { borderColor: 'primary.main' },
              }}
            >
              <PictureAsPdfRoundedIcon color="error" fontSize="small" />
              <Typography sx={{ fontSize: 14, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {a.original_name || S.attachments.pdf}
              </Typography>
            </Stack>
          ))}
        </Stack>
      )}

      <Dialog open={openAt !== null} onClose={() => setOpenAt(null)} maxWidth="lg" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, pr: 1 }}>
          {current?.kind === 'pdf' && <PictureAsPdfRoundedIcon color="error" />}
          <Box sx={{ flex: 1, minWidth: 0, fontSize: 17, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {current?.original_name || S.attachments.title}
          </Box>
          {attachments.length > 1 && (
            <Typography sx={{ fontSize: 13, color: 'text.secondary', whiteSpace: 'nowrap' }}>
              {bn((openAt ?? 0) + 1)} / {bn(attachments.length)}
            </Typography>
          )}
          {/* /storage is proxied to Laravel in dev and served by Caddy in production, so the file
              is same-origin and `download` keeps the citizen's original filename. */}
          <Button size="small" startIcon={<DownloadRoundedIcon />} component="a" href={current?.url} download={current?.original_name ?? ''}>
            {S.common.download}
          </Button>
          <IconButton
            aria-label={S.attachments.openInNewTab}
            title={S.attachments.openInNewTab}
            onClick={() => current && window.open(current.url, '_blank', 'noopener')}
          >
            <OpenInNewRoundedIcon />
          </IconButton>
          <IconButton aria-label={S.common.cancel} onClick={() => setOpenAt(null)}>
            <CloseRoundedIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent
          dividers
          sx={{
            p: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            // A PDF needs a viewport to scroll inside; a photo sizes itself, so the dialog is as
            // tall as the picture instead of framing it in letterboxing.
            height: current?.kind === 'pdf' ? '80vh' : undefined,
            bgcolor: 'background.default',
          }}
        >
          {current?.kind === 'pdf' ? (
            <Box component="iframe" src={current.url} title={current.original_name ?? S.attachments.pdf} sx={{ width: '100%', height: '100%', border: 0 }} />
          ) : (
            current && (
              <Box
                component="img"
                src={current.url}
                alt={current.original_name ?? ''}
                sx={{ width: '100%', maxHeight: '80vh', objectFit: 'contain', display: 'block' }}
              />
            )
          )}

          {attachments.length > 1 && (
            <>
              <NavButton side="left" label={S.attachments.prev} onClick={() => step(-1)}><ChevronLeftRoundedIcon /></NavButton>
              <NavButton side="right" label={S.attachments.next} onClick={() => step(1)}><ChevronRightRoundedIcon /></NavButton>
            </>
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
}

function NavButton({ side, label, onClick, children }: {
  side: 'left' | 'right';
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <IconButton
      aria-label={label}
      title={label}
      onClick={onClick}
      sx={{
        position: 'absolute',
        [side]: 12,
        top: '50%',
        transform: 'translateY(-50%)',
        bgcolor: 'background.paper',
        border: (t) => `1px solid ${t.palette.divider}`,
        '&:hover': { bgcolor: 'background.paper' },
      }}
    >
      {children}
    </IconButton>
  );
}

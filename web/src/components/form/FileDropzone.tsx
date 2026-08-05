import { useRef, useState } from 'react';
import { Box, Typography } from '@mui/material';
import FileUploadOutlinedIcon from '@mui/icons-material/FileUploadOutlined';
import { bnStrings as S } from '../../i18n';

// Dashed file/PDF upload zone (concept_ui/Basic dialog.png): centered upload icon, "Browse",
// and a max-size helper. Reports the picked File to the parent.
export default function FileDropzone({
  onFile,
  accept = 'image/*,application/pdf',
  helper = S.common.maxFile,
}: {
  onFile: (file: File) => void;
  accept?: string;
  helper?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  const pick = (file?: File | null) => {
    if (!file) return;
    setFileName(file.name);
    onFile(file);
  };

  return (
    <Box
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        pick(e.dataTransfer.files?.[0]);
      }}
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 0.5,
        py: 3,
        px: 2,
        cursor: 'pointer',
        borderRadius: '14px',
        border: (t) => `1.5px dashed ${t.palette.primary.main}`,
        color: 'primary.main',
        bgcolor: (t) => (t.palette.mode === 'light' ? 'rgba(103,80,164,0.03)' : 'transparent'),
      }}
    >
      <FileUploadOutlinedIcon />
      <Typography sx={{ fontWeight: 700 }}>{fileName ?? S.common.browse}</Typography>
      <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>{helper}</Typography>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        hidden
        onChange={(e) => pick(e.target.files?.[0])}
      />
    </Box>
  );
}

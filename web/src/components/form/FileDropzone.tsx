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
  multiple = false,
  label,
}: {
  onFile: (file: File) => void;
  accept?: string;
  helper?: string;
  multiple?: boolean;  // picks several at once; onFile fires per file and the parent collects them
  label?: string;      // overrides the picked-file name, e.g. when the parent lists the files
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  const pick = (files?: FileList | null) => {
    const picked = Array.from(files ?? []);
    if (picked.length === 0) return;
    setFileName(picked.length > 1 ? `${picked.length}` : picked[0].name);
    picked.forEach(onFile);
  };

  return (
    <Box
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        pick(e.dataTransfer.files);
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
      <Typography sx={{ fontWeight: 700 }}>{label ?? fileName ?? S.common.browse}</Typography>
      <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>{helper}</Typography>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        hidden
        onChange={(e) => pick(e.target.files)}
      />
    </Box>
  );
}

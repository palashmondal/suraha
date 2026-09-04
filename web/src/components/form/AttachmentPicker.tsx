import { Box, Chip, Stack, Typography } from '@mui/material';
import PictureAsPdfRoundedIcon from '@mui/icons-material/PictureAsPdfRounded';
import ImageOutlinedIcon from '@mui/icons-material/ImageOutlined';
import { bnStrings as S } from '../../i18n';
import FileDropzone from './FileDropzone';

/**
 * The citizen's সংযুক্তি on a public submission form — photos of what happened, a doctor's
 * paper, a receipt. Files are held here and uploaded once the record itself exists.
 */
export default function AttachmentPicker({ files, onChange }: {
  files: File[];
  onChange: (files: File[]) => void;
}) {
  return (
    <Box>
      <Typography sx={{ fontSize: 13.5, color: 'text.secondary', mb: 0.75 }}>{S.attachments.add}</Typography>
      <FileDropzone
        multiple
        accept="image/jpeg,image/png,image/webp,application/pdf"
        helper={S.attachments.addHint}
        label={S.common.browse}
        // The server caps it at ten; stopping here keeps the citizen from picking a batch that
        // would be rejected wholesale after the upload.
        onFile={(f) => onChange([...files, f].slice(0, 10))}
      />
      {files.length > 0 && (
        <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 1, mt: 1.5 }}>
          {files.map((f, i) => (
            <Chip
              key={`${f.name}-${i}`}
              icon={f.type === 'application/pdf' ? <PictureAsPdfRoundedIcon /> : <ImageOutlinedIcon />}
              label={f.name}
              onDelete={() => onChange(files.filter((_, at) => at !== i))}
              variant="outlined"
            />
          ))}
        </Stack>
      )}
    </Box>
  );
}

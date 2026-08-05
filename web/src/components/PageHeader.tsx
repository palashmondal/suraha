import { Box, Button, IconButton, Tooltip, Typography } from '@mui/material';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import TuneRoundedIcon from '@mui/icons-material/TuneRounded';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import { bnStrings as S } from '../i18n';

// List/page header (concept_ui/Frame 1171277087.png): bold Bangla title on the left; on the
// right optional search + filter icon buttons and a primary "+ নতুন যুক্ত করুন" action.
export default function PageHeader({
  title,
  onSearch,
  onFilter,
  primaryLabel,
  onPrimary,
}: {
  title: string;
  onSearch?: () => void;
  onFilter?: () => void;
  primaryLabel?: string;
  onPrimary?: () => void;
}) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
      <Typography sx={{ flex: 1, fontSize: 24, fontWeight: 800 }}>{title}</Typography>

      {onSearch && (
        <Tooltip title={S.common.search}>
          <IconButton onClick={onSearch}>
            <SearchRoundedIcon />
          </IconButton>
        </Tooltip>
      )}
      {onFilter && (
        <Tooltip title={S.common.filter}>
          <IconButton onClick={onFilter}>
            <TuneRoundedIcon />
          </IconButton>
        </Tooltip>
      )}
      {onPrimary && (
        <Button variant="contained" startIcon={<AddRoundedIcon />} onClick={onPrimary} sx={{ px: 2.5, py: 1.1 }}>
          {primaryLabel ?? S.common.addNew}
        </Button>
      )}
    </Box>
  );
}

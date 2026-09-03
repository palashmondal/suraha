import { useEffect, useRef, useState } from 'react';
import { Box, Button, Collapse, IconButton, InputAdornment, TextField, Tooltip, Typography } from '@mui/material';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import TuneRoundedIcon from '@mui/icons-material/TuneRounded';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import { bnStrings as S } from '../i18n';

// List/page header (concept_ui/Frame 1171277087.png): bold Bangla title on the left; on the
// right optional search + filter icon buttons and a primary "+ নতুন যুক্ত করুন" action.
//
// `search` turns the icon into a real control: clicking it slides a field out of the icon, which
// filters as you type and collapses again when cleared and closed. Pages that pass the older
// `onSearch` callback keep a plain button.
export default function PageHeader({
  title,
  onSearch,
  search,
  onFilter,
  primaryLabel,
  onPrimary,
}: {
  title: string;
  onSearch?: () => void;
  search?: { value: string; onChange: (v: string) => void; placeholder?: string };
  onFilter?: () => void;
  primaryLabel?: string;
  onPrimary?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus the field once it has actually expanded, so the caret does not land mid-animation.
  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  const close = () => {
    search?.onChange('');
    setOpen(false);
  };

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
      <Typography sx={{ flex: 1, fontSize: 24, fontWeight: 800 }}>{title}</Typography>

      {search && (
        <>
          <Collapse in={open} orientation="horizontal" timeout={180}>
            <TextField
              inputRef={inputRef}
              size="small"
              value={search.value}
              onChange={(e) => search.onChange(e.target.value)}
              // Escape is the way out of a search box; clearing on the way keeps the list honest.
              onKeyDown={(e) => e.key === 'Escape' && close()}
              placeholder={search.placeholder ?? S.common.search}
              sx={{ width: { xs: 190, sm: 280 } }}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchRoundedIcon fontSize="small" color="disabled" />
                    </InputAdornment>
                  ),
                },
              }}
            />
          </Collapse>
          <Tooltip title={open ? S.common.cancel : S.common.search}>
            <IconButton onClick={() => (open ? close() : setOpen(true))} aria-label={S.common.search}>
              {open ? <CloseRoundedIcon /> : <SearchRoundedIcon />}
            </IconButton>
          </Tooltip>
        </>
      )}

      {!search && onSearch && (
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

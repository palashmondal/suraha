import { useEffect, useMemo, useState } from 'react';
import {
  Autocomplete, Box, CircularProgress, InputAdornment, TextField, Typography,
} from '@mui/material';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import { useNavigate } from 'react-router-dom';
import { appPath } from '../appPath';
import { bnStrings as S } from '../i18n';
import { bn, bnDate } from '../utils/bnNum';
import { searchAll, type SearchHit } from '../api/search';

/**
 * One box over every module of the upazila — mothers, birth registrations, complaints, assistance
 * applications, suggestions and staff — matched on names, mobile numbers, NIDs, designations and
 * the detail text itself. The API ranks by how many fields matched, so the closest record leads.
 *
 * Typing is debounced: a request per keystroke would put a dozen queries behind a phone number.
 */
export default function UnifiedSearch() {
  const navigate = useNavigate();
  const [term, setTerm] = useState('');
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const q = term.trim();

    if (q.length < 2) {
      setHits([]);
      return;
    }

    setLoading(true);
    const t = setTimeout(() => {
      searchAll(q)
        .then((r) => setHits(r.results))
        .catch(() => setHits([]))
        .finally(() => setLoading(false));
    }, 250);

    return () => clearTimeout(t);
  }, [term]);

  // Autocomplete would otherwise filter the server's ranking again on its own rules.
  const options = useMemo(() => hits, [hits]);

  return (
    <Autocomplete
      freeSolo
      fullWidth
      options={options}
      filterOptions={(o) => o}
      loading={loading}
      inputValue={term}
      onInputChange={(_, v) => setTerm(v)}
      getOptionLabel={() => term}
      noOptionsText={term.trim().length < 2 ? S.search.hint : S.search.empty}
      onChange={(_, value) => {
        if (value && typeof value !== 'string') {
          navigate(appPath(value.link));
          setTerm('');
        }
      }}
      sx={{ maxWidth: 520 }}
      slotProps={{
        paper: {
          elevation: 6,
          sx: {
            mt: 0.75,
            borderRadius: '16px',
            border: '1px solid',
            borderColor: 'divider',
            overflow: 'hidden', // so the rounded corners clip the first and last rows
          },
        },
        listbox: {
          sx: {
            p: 0,
            maxHeight: 440,
            // The list is obviously scrollable from the rows themselves; a bar on top of them
            // only crowds a 520px box.
            scrollbarWidth: 'none',
            '&::-webkit-scrollbar': { display: 'none' },
            // Row styling lives here, not on the option itself: a descendant rule outranks the
            // option's own sx, so one place decides how every row looks.
            '& .MuiAutocomplete-option': {
              px: 2,
              py: 1.25,
              borderBottom: '1px solid',
              borderColor: 'divider',
              '&:last-of-type': { borderBottom: 'none' },
              '&:nth-of-type(even)': { bgcolor: 'action.hover' },
              '&.Mui-focused, &[aria-selected="true"]': { bgcolor: 'action.selected' },
            },
          },
        },
      }}
      renderOption={(props, o) => {
        const { key, ...rest } = props as React.HTMLAttributes<HTMLLIElement> & { key: string };

        return (
          <Box component="li" key={key} {...rest} sx={{ display: 'flex !important', alignItems: 'center', gap: 1.5 }}>
            <Box sx={{ flex: 1, minWidth: 0 }}>
            {/* Which module the hit came from is context, so it is tinted and small; the record
                itself is what you are looking for, so it carries the weight. */}
            <Typography component="div" sx={{ fontSize: 14, lineHeight: 1.5 }} noWrap>
              {/* The বিসর্গ has to sit in the SAME text node as the letter it follows — split
                  across two spans (or two JSX children) the font has no base to attach it to and
                  draws the dotted-circle placeholder instead. */}
              <Box component="span" sx={{ color: 'primary.main', fontWeight: 600 }}>
                {o.name ? `${o.label}ঃ` : o.label}
              </Box>
              {o.name ? <Box component="span" sx={{ fontWeight: 600 }}>{` ${o.name}`}</Box> : null}
              {o.mobile ? (
                <Box component="span" sx={{ color: 'text.secondary' }}>
                  {' · '}{bn(o.mobile)}
                </Box>
              ) : null}
            </Typography>
            {o.snippet && (
              <Typography sx={{ fontSize: 12.5, color: 'text.secondary', mt: 0.25 }} noWrap>
                {o.snippet}
              </Typography>
            )}
            </Box>
            {o.date && (
              <Typography sx={{ flexShrink: 0, fontSize: 12, color: 'text.secondary' }}>
                {bnDate(o.date)}
              </Typography>
            )}
          </Box>
        );
      }}
      renderInput={(params) => (
        <TextField
          {...params}
          size="small"
          placeholder={S.search.placeholder}
          slotProps={{
            input: {
              ...params.InputProps,
              startAdornment: (
                <InputAdornment position="start">
                  <SearchRoundedIcon sx={{ fontSize: 20, color: 'text.secondary' }} />
                </InputAdornment>
              ),
              endAdornment: (
                <>
                  {loading ? <CircularProgress size={16} /> : null}
                  {params.InputProps.endAdornment}
                </>
              ),
              // An outlined pill on the bar itself, not a filled field: the top bar already
              // sits on a tinted surface, so a second fill only muddies it.
              sx: {
                borderRadius: 999,
                minHeight: 44,
                px: 1,
                bgcolor: 'transparent',
                '& .MuiOutlinedInput-notchedOutline': { borderColor: 'divider' },
                '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'text.secondary' },
                '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                  borderWidth: 1.5,
                  borderColor: 'primary.main',
                },
              },
            },
          }}
        />
      )}
    />
  );
}

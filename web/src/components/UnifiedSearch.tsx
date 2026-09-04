import { useEffect, useMemo, useState } from 'react';
import {
  Autocomplete, Box, CircularProgress, InputAdornment, TextField, Typography, useTheme,
} from '@mui/material';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import { useNavigate } from 'react-router-dom';
import { appPath } from '../appPath';
import { bnStrings as S } from '../i18n';
import { bn } from '../utils/bnNum';
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
  const theme = useTheme();
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
      slotProps={{ paper: { sx: { borderRadius: '12px', mt: 0.5 } } }}
      renderOption={(props, o) => {
        const { key, ...rest } = props as React.HTMLAttributes<HTMLLIElement> & { key: string };

        return (
          <Box component="li" key={key} {...rest} sx={{ display: 'block !important', py: 1.1 }}>
            <Typography sx={{ fontSize: 14, fontWeight: 600, lineHeight: 1.4 }}>
              {o.label}ঃ {o.name ?? '—'}
              {o.mobile ? `, ${S.search.mobile}ঃ ${bn(o.mobile)}` : ''}
            </Typography>
            {o.snippet && (
              <Typography sx={{ fontSize: 12.5, color: 'text.secondary', mt: 0.25 }} noWrap>
                {o.snippet}
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
              sx: { borderRadius: 999, bgcolor: theme.suraha.switcher },
            },
          }}
        />
      )}
    />
  );
}

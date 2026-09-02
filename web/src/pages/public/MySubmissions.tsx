import { useEffect, useState } from 'react';
import { Box, Container, Paper, Stack, Typography } from '@mui/material';
import { bnStrings as S } from '../../i18n';
import { bnDate } from '../../utils/bnNum';
import PublicLayout from './PublicLayout';
import StatusPill from '../../components/StatusPill';
import EmptyState from '../../components/EmptyState';
import LoadingState from '../../components/LoadingState';
import PaginationBar from '../../components/PaginationBar';
import { usePagination } from '../../components/usePagination';
import { getMySubmissions, type MySubmission } from '../../api/track';

export default function MySubmissions() {
  const [items, setItems] = useState<MySubmission[] | null>(null);

  useEffect(() => {
    getMySubmissions().then((r) => setItems(r.submissions)).catch(() => setItems([]));
  }, []);

  const { pageRows, page, setPage, pageCount } = usePagination(items ?? []);

  return (
    <PublicLayout>
      <Container maxWidth="md" sx={{ py: { xs: 4, md: 6 } }}>
        <Typography sx={{ fontSize: 26, fontWeight: 800, mb: 3 }}>{S.public.mySubmissions}</Typography>
        {items === null && (
          <Paper elevation={0} sx={{ borderRadius: '16px' }}><LoadingState /></Paper>
        )}
        {items && items.length === 0 && (
          <Paper elevation={0} sx={{ borderRadius: '16px' }}><EmptyState /></Paper>
        )}
        <Stack spacing={1.5}>
          {pageRows.map((s) => (
            <Paper key={s.token} elevation={0} sx={{ p: 2.5, borderRadius: '14px', border: (t) => `1px solid ${t.palette.divider}` }}>
              <Stack direction="row" alignItems="center" spacing={1}>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography sx={{ fontSize: 12.5, color: 'text.secondary' }}>{s.type_label}{s.date ? ` · ${bnDate(s.date)}` : ''}</Typography>
                  <Typography sx={{ fontWeight: 600 }} noWrap>{s.title}</Typography>
                  <Typography sx={{ fontSize: 13, fontFamily: 'monospace', color: 'primary.main' }}>{s.token}</Typography>
                </Box>
                <StatusPill label={s.status_label} tone={s.status_tone} />
              </Stack>
            </Paper>
          ))}
        </Stack>
        {items && items.length > 0 && (
          <Box sx={{ mt: 2, border: (t) => `1px solid ${t.palette.divider}`, borderRadius: '12px' }}>
            <PaginationBar page={page} pageCount={pageCount} onPage={setPage} />
          </Box>
        )}
      </Container>
    </PublicLayout>
  );
}

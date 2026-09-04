import { useEffect, useState } from 'react';
import { Box, Chip, Container, Paper, Stack, Typography } from '@mui/material';
import CloudQueueRoundedIcon from '@mui/icons-material/CloudQueueRounded';
import { bnStrings as S } from '../../i18n';
import { bnDate } from '../../utils/bnNum';
import PublicLayout from './PublicLayout';
import PageHero from './PageHero';
import FolderSharedRoundedIcon from '@mui/icons-material/FolderSharedRounded';
import StatusPill from '../../components/StatusPill';
import EmptyState from '../../components/EmptyState';
import LoadingState from '../../components/LoadingState';
import PaginationBar from '../../components/PaginationBar';
import { usePagination } from '../../components/usePagination';
import { getMySubmissions, type MySubmission } from '../../api/track';
import { useSync } from '../../offline/SyncProvider';

// Bangla label per queued submission kind, so an offline entry reads meaningfully before it syncs.
const KIND_LABEL: Record<string, string> = {
  'complaint.create': 'অভিযোগ',
  'appointment.create': 'সাক্ষাৎকার',
  'assistance.create': 'মানবিক সহায়তা',
  'suggestion.create': 'নাগরিক পরামর্শ',
};

export default function MySubmissions() {
  const [items, setItems] = useState<MySubmission[] | null>(null);
  const { pending } = useSync();

  useEffect(() => {
    getMySubmissions().then((r) => setItems(r.submissions)).catch(() => setItems([]));
  }, []);

  const { pageRows, page, setPage, pageCount } = usePagination(items ?? []);

  // Submissions still waiting in the offline outbox — shown first so a citizen sees an entry made
  // offline is safe and will sync (SURAHA_BUILD_PROMPT §1.1(2)).
  const queued = pending.filter((p) => p.kind in KIND_LABEL);

  return (
    <PublicLayout>
      <PageHero title={S.public.mySubmissions} icon={<FolderSharedRoundedIcon />} />
      <Container maxWidth="md" sx={{ py: { xs: 4, md: 6 } }}>
        {items === null && (
          <Paper elevation={0} sx={{ borderRadius: '16px' }}><LoadingState /></Paper>
        )}
        {items && items.length === 0 && queued.length === 0 && (
          <Paper elevation={0} sx={{ borderRadius: '16px' }}><EmptyState /></Paper>
        )}
        <Stack spacing={1.5}>
          {queued.map((q) => (
            <Paper
              key={q.id}
              elevation={0}
              sx={{ p: 2.5, borderRadius: '14px', border: (t) => `1px dashed ${t.palette.divider}` }}
            >
              <Stack direction="row" alignItems="center" spacing={1}>
                <CloudQueueRoundedIcon sx={{ color: 'text.secondary' }} />
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography sx={{ fontSize: 12.5, color: 'text.secondary' }}>{KIND_LABEL[q.kind]}</Typography>
                  <Typography sx={{ fontWeight: 600 }} noWrap>{q.label || KIND_LABEL[q.kind]}</Typography>
                </Box>
                <Chip
                  size="small"
                  color={q.status === 'failed' ? 'error' : 'warning'}
                  label={q.status === 'failed' ? 'পাঠানো যায়নি' : 'সিঙ্ক অপেক্ষমাণ'}
                />
              </Stack>
            </Paper>
          ))}
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

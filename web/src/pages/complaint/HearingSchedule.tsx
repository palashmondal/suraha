import { useEffect, useState } from 'react';
import { Box, Chip, Paper, Stack, Typography } from '@mui/material';
import EventRoundedIcon from '@mui/icons-material/EventRounded';
import { useNavigate } from 'react-router-dom';
import { bnStrings as S } from '../../i18n';
import { bn, bnDate } from '../../utils/bnNum';
import PageHeader from '../../components/PageHeader';
import EmptyState from '../../components/EmptyState';
import LoadingState from '../../components/LoadingState';
import { useSelectedTenant } from '../../tenant/SelectedTenantContext';
import { listHearings, type Hearing } from '../../api/complaint';

// The UNO's hearing schedule (§8.4) — upcoming complaint hearings grouped by date. Each row links
// to the complaint so the UNO can write the order after the hearing.
export default function HearingSchedule() {
  const navigate = useNavigate();
  const { selectedUpazilaId } = useSelectedTenant();
  const [rows, setRows] = useState<Hearing[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    listHearings()
      .then((r) => setRows(r.hearings))
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, [selectedUpazilaId]);

  // Group by hearing date (already sorted by the API).
  const groups = rows.reduce<Record<string, Hearing[]>>((acc, h) => {
    const key = h.hearing_date ?? '—';
    (acc[key] ??= []).push(h);
    return acc;
  }, {});

  return (
    <Box>
      <PageHeader title={S.complaint.hearingScheduleTitle} />

      {loading && <LoadingState />}
      {!loading && rows.length === 0 && <EmptyState title={S.complaint.hearingScheduleEmpty} />}

      <Stack spacing={2.5} sx={{ mt: 1 }}>
        {Object.entries(groups).map(([date, items]) => (
          <Box key={date}>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
              <EventRoundedIcon sx={{ color: 'primary.main' }} />
              <Typography sx={{ fontWeight: 800 }}>{bnDate(date)}</Typography>
              <Chip size="small" label={`${bn(items.length)} ${S.complaint.hearingOn}`} />
            </Stack>
            <Stack spacing={1}>
              {items.map((h) => (
                <Paper
                  key={h.id}
                  elevation={0}
                  onClick={() => navigate(`/complaint/${h.id}`)}
                  sx={{ p: 2, borderRadius: '14px', cursor: 'pointer', border: (t) => `1px solid ${t.palette.divider}`, '&:hover': { borderColor: 'primary.main' } }}
                >
                  <Typography sx={{ fontWeight: 700 }}>{h.title}</Typography>
                  <Typography sx={{ fontSize: 13.5, color: 'text.secondary' }}>{h.complainant_name}</Typography>
                </Paper>
              ))}
            </Stack>
          </Box>
        ))}
      </Stack>
    </Box>
  );
}

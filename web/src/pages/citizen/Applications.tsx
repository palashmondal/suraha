import { Box, Card, CardActionArea, Chip, Typography, useTheme } from '@mui/material';
import ChevronLeftRoundedIcon from '@mui/icons-material/ChevronLeftRounded';
import CloudQueueRoundedIcon from '@mui/icons-material/CloudQueueRounded';
import { useNavigate } from 'react-router-dom';
import { bnStrings as S } from '../../i18n';
import StatusPill from '../../components/StatusPill';
import EmptyState from '../../components/EmptyState';
import { useSync } from '../../offline/SyncProvider';
import { sampleApplications } from '../../data/citizen';

// "My applications" — the citizen's own complaints + appointments with status, plus any submission
// still waiting in the offline outbox shown at the top as "sending" (SURAHA_BUILD_PROMPT §7, §1.1(2)).
export default function Applications() {
  const theme = useTheme();
  const nav = useNavigate();
  const { pending } = useSync();

  const outboxApps = pending
    .filter((p) => p.kind === 'complaint.create' || p.kind === 'appointment.create')
    .map((p) => ({
      id: p.id,
      kind: p.kind === 'complaint.create' ? 'complaint' : 'appointment',
      title: p.label || (p.kind === 'complaint.create' ? S.citizen.complaint : S.citizen.appointment),
      failed: p.status === 'failed',
    }));

  const hasAny = outboxApps.length > 0 || sampleApplications.length > 0;

  return (
    <Box>
      <Typography variant="h6" sx={{ mb: 2 }}>
        {S.citizen.trackTitle}
      </Typography>

      {!hasAny ? (
        <EmptyState message={S.citizen.emptyApplications} />
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {outboxApps.map((a) => (
            <Card key={a.id} elevation={0} sx={{ border: `1px dashed ${theme.palette.divider}`, borderRadius: 3 }}>
              <Box sx={{ p: 1.75, display: 'flex', alignItems: 'center', gap: 1 }}>
                <CloudQueueRoundedIcon sx={{ color: 'text.secondary' }} />
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>
                    {a.kind === 'complaint' ? S.citizen.complaint : S.citizen.appointment}
                  </Typography>
                  <Typography noWrap sx={{ fontWeight: 600, fontSize: 14.5 }}>{a.title}</Typography>
                </Box>
                <Chip size="small" color={a.failed ? 'error' : 'warning'} label={a.failed ? S.offline.failed : S.offline.pendingSync} />
              </Box>
            </Card>
          ))}

          {sampleApplications.map((a) => (
            <Card key={a.id} elevation={0} sx={{ border: `1px solid ${theme.palette.divider}`, borderRadius: 3 }}>
              <CardActionArea onClick={() => nav(`/citizen/applications/${a.id}`)} sx={{ p: 1.75, display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>
                    {a.kind === 'complaint' ? S.citizen.complaint : S.citizen.appointment} · {a.id}
                  </Typography>
                  <Typography noWrap sx={{ fontWeight: 600, fontSize: 14.5 }}>{a.title}</Typography>
                  <Typography sx={{ fontSize: 12, color: 'text.secondary', mt: 0.25 }}>
                    {S.citizen.filedOn}: {a.filedOn}
                  </Typography>
                </Box>
                <StatusPill label={a.status.label} tone={a.status.tone} />
                <ChevronLeftRoundedIcon sx={{ color: 'text.secondary' }} />
              </CardActionArea>
            </Card>
          ))}
        </Box>
      )}
    </Box>
  );
}

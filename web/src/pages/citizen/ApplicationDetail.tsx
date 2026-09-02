import { Box, Card, Typography, useTheme } from '@mui/material';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import RadioButtonUncheckedRoundedIcon from '@mui/icons-material/RadioButtonUncheckedRounded';
import { useParams } from 'react-router-dom';
import SubPageHeader from './SubPageHeader';
import { bnStrings as S } from '../../i18n';
import StatusPill from '../../components/StatusPill';
import EmptyState from '../../components/EmptyState';
import { sampleApplications } from '../../data/citizen';

// Citizen tracks one application end-to-end as a vertical timeline with timestamps
// (SURAHA_BUILD_PROMPT §7.2, §8.4).
export default function ApplicationDetail() {
  const theme = useTheme();
  const { id } = useParams();
  const app = sampleApplications.find((a) => a.id === id);

  if (!app) {
    return (
      <Box>
        <SubPageHeader title={S.citizen.trackTitle} fallback="/citizen/applications" />
        <EmptyState message={S.common.noData} />
      </Box>
    );
  }

  return (
    <Box>
      <SubPageHeader title={app.kind === 'complaint' ? S.citizen.complaint : S.citizen.appointment} fallback="/citizen/applications" />

      <Card elevation={0} sx={{ p: 2, mb: 2, border: `1px solid ${theme.palette.divider}`, borderRadius: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 1 }}>
          <Box>
            <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>{app.id}</Typography>
            <Typography sx={{ fontWeight: 700, fontSize: 16 }}>{app.title}</Typography>
            <Typography sx={{ fontSize: 12.5, color: 'text.secondary', mt: 0.5 }}>
              {S.citizen.filedOn}: {app.filedOn}
            </Typography>
          </Box>
          <StatusPill label={app.status.label} tone={app.status.tone} />
        </Box>
      </Card>

      {/* Vertical status timeline */}
      <Box sx={{ pl: 1 }}>
        {app.timeline.map((ev, i) => {
          const last = i === app.timeline.length - 1;
          return (
            <Box key={i} sx={{ display: 'flex', gap: 1.5 }}>
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                {ev.done ? (
                  <CheckCircleRoundedIcon sx={{ color: theme.suraha.status.success.fg, fontSize: 22 }} />
                ) : (
                  <RadioButtonUncheckedRoundedIcon sx={{ color: 'text.disabled', fontSize: 22 }} />
                )}
                {!last ? (
                  <Box sx={{ width: 2, flex: 1, minHeight: 28, my: 0.25, bgcolor: ev.done ? theme.suraha.status.success.fg : theme.palette.divider }} />
                ) : null}
              </Box>
              <Box sx={{ pb: last ? 0 : 2 }}>
                <Typography sx={{ fontWeight: ev.done ? 600 : 500, color: ev.done ? 'text.primary' : 'text.secondary', fontSize: 14.5 }}>
                  {ev.label}
                </Typography>
                {ev.at ? <Typography sx={{ fontSize: 12.5, color: 'text.secondary' }}>{ev.at}</Typography> : null}
              </Box>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}

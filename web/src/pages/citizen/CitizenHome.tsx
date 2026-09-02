import { Box, Card, CardActionArea, Chip, Typography, useTheme } from '@mui/material';
import ReportProblemRoundedIcon from '@mui/icons-material/ReportProblemRounded';
import EventAvailableRoundedIcon from '@mui/icons-material/EventAvailableRounded';
import TrackChangesRoundedIcon from '@mui/icons-material/TrackChanges';
import CampaignRoundedIcon from '@mui/icons-material/CampaignRounded';
import ChevronLeftRoundedIcon from '@mui/icons-material/ChevronLeftRounded';
import { useNavigate } from 'react-router-dom';
import { bnStrings as S } from '../../i18n';
import { useAuth } from '../../auth/AuthContext';
import StatusPill from '../../components/StatusPill';
import { sampleApplications } from '../../data/citizen';

// Citizen landing inside the app: greeting, primary service actions, and a peek at recent applications.
export default function CitizenHome() {
  const theme = useTheme();
  const nav = useNavigate();
  const { user } = useAuth();

  const services = [
    { title: S.citizen.fileComplaint, desc: S.citizen.fileComplaintDesc, icon: <ReportProblemRoundedIcon />, to: '/citizen/complaint/new', color: theme.suraha.module.birthAlt },
    { title: S.citizen.bookAppointment, desc: S.citizen.bookAppointmentDesc, icon: <EventAvailableRoundedIcon />, to: '/citizen/appointment/new', color: theme.suraha.module.officer },
    { title: S.citizen.trackTitle, desc: S.citizen.trackDesc, icon: <TrackChangesRoundedIcon />, to: '/citizen/applications', color: theme.suraha.module.birth },
    { title: S.citizen.noticesTitle, desc: S.citizen.noticesDesc, icon: <CampaignRoundedIcon />, to: '/citizen/notices', color: theme.suraha.module.pregnancy },
  ];

  const recent = sampleApplications.slice(0, 2);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
      <Box>
        <Typography sx={{ color: 'text.secondary', fontSize: 14 }}>{S.citizen.greeting},</Typography>
        <Typography variant="h6">{user?.name}</Typography>
        {user?.upazila ? <Chip size="small" label={user.upazila} sx={{ mt: 0.5 }} /> : null}
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
        {services.map((s) => (
          <Card key={s.to} elevation={0} sx={{ border: `1px solid ${theme.palette.divider}`, borderRadius: 3 }}>
            <CardActionArea onClick={() => nav(s.to)} sx={{ p: 2, height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 1 }}>
              <Box sx={{ width: 44, height: 44, borderRadius: 2, display: 'grid', placeItems: 'center', color: '#fff', bgcolor: s.color }}>
                {s.icon}
              </Box>
              <Typography sx={{ fontWeight: 600, fontSize: 15 }}>{s.title}</Typography>
              <Typography sx={{ color: 'text.secondary', fontSize: 12.5, lineHeight: 1.4 }}>{s.desc}</Typography>
            </CardActionArea>
          </Card>
        ))}
      </Box>

      <Box>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
          <Typography variant="subtitle1">{S.citizen.recentApplications}</Typography>
          <Typography onClick={() => nav('/citizen/applications')} sx={{ fontSize: 13, color: 'primary.main', cursor: 'pointer' }}>
            {S.citizen.viewAll}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {recent.map((a) => (
            <Card key={a.id} elevation={0} sx={{ border: `1px solid ${theme.palette.divider}`, borderRadius: 3 }}>
              <CardActionArea onClick={() => nav(`/citizen/applications/${a.id}`)} sx={{ p: 1.75, display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>
                    {a.kind === 'complaint' ? S.citizen.complaint : S.citizen.appointment} · {a.id}
                  </Typography>
                  <Typography noWrap sx={{ fontWeight: 600, fontSize: 14.5 }}>{a.title}</Typography>
                </Box>
                <StatusPill label={a.status.label} tone={a.status.tone} />
                <ChevronLeftRoundedIcon sx={{ color: 'text.secondary' }} />
              </CardActionArea>
            </Card>
          ))}
        </Box>
      </Box>
    </Box>
  );
}

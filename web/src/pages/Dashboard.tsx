import { Box, Button, Divider, Typography } from '@mui/material';
import MoreVertRoundedIcon from '@mui/icons-material/MoreVertRounded';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import { useTheme } from '@mui/material/styles';
import ModuleSummaryCard from '../components/ModuleSummaryCard';
import SectionCard from '../components/SectionCard';
import StatusPill from '../components/StatusPill';
import { bnStrings as S } from '../i18n';
import { bn } from '../utils/bnNum';
import { appointments, complaints, slides, heroSlide, type ListEntry } from '../data/sample';

// One row of a dashboard list card: title + who on the left, short date + kebab on the
// right (concept_ui/Dashboard.png — no status pills on the dashboard rows).
function ListRow({ entry, last }: { entry: ListEntry; last: boolean }) {
  return (
    <Box
      sx={{
        py: 1.5,
        display: 'flex',
        alignItems: 'flex-start',
        gap: 1.5,
        borderBottom: last ? 'none' : '1px solid',
        borderColor: 'divider',
      }}
    >
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography sx={{ fontSize: 15, fontWeight: 600 }}>{entry.title}</Typography>
        <Typography sx={{ fontSize: 13.5, color: 'text.secondary', mt: 0.5 }}>{entry.who}</Typography>
      </Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexShrink: 0, pt: 0.25 }}>
        <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>{entry.date}</Typography>
        <MoreVertRoundedIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
      </Box>
    </Box>
  );
}

export default function Dashboard() {
  const theme = useTheme();
  const outlinedAction = (label: string) => (
    <Button
      size="small"
      variant="outlined"
      color="inherit"
      sx={{ borderRadius: '8px', borderColor: 'divider', color: 'text.secondary', px: 2 }}
    >
      {label}
    </Button>
  );

  return (
    <Box>
      <Typography variant="h5" sx={{ mb: 3 }}>
        {S.dashboard.title}
      </Typography>

      {/* Row 1 — module summary cards */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: 'repeat(3, minmax(0, 1fr))' },
          gap: 2.5,
          mb: 2.5,
        }}
      >
        <ModuleSummaryCard
          title={S.dashboard.officer.title}
          accent={theme.suraha.module.officer}
          actionLabel={S.common.details}
          tiles={[
            { label: S.dashboard.officer.totalHealthWorker, value: bn(7), unit: S.common.person },
            { label: S.dashboard.officer.totalFpWorker, value: bn(1), unit: S.common.count },
            { label: S.dashboard.officer.totalSochib, value: bn(11), unit: S.common.person, full: true },
          ]}
        />
        <ModuleSummaryCard
          title={S.dashboard.pregnancy.title}
          accent={theme.suraha.module.pregnancy}
          actionLabel={S.common.details}
          tiles={[
            { label: S.dashboard.pregnancy.todayNew, value: bn(1), unit: S.common.person, full: true },
            { label: S.dashboard.pregnancy.total, value: bn(10), unit: S.common.person },
            { label: S.dashboard.pregnancy.totalDelivery, value: bn(11), unit: S.common.person },
          ]}
        />
        <ModuleSummaryCard
          title={S.dashboard.birth.title}
          accent={theme.suraha.module.birth}
          actionLabel={S.common.details}
          tiles={[
            { label: S.dashboard.birth.todayNew, value: bn(7), unit: S.common.person, full: true },
            { label: S.dashboard.birth.total, value: bn(1), unit: S.common.count },
            { label: S.dashboard.birth.pendingEntry, value: bn(11), unit: S.common.person },
          ]}
        />
      </Box>

      {/* Row 2 — list cards */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: 'repeat(3, minmax(0, 1fr))' },
          gap: 2.5,
        }}
      >
        <SectionCard title={S.dashboard.appointment.title} count={10} action={outlinedAction(S.common.all)}>
          {appointments.map((e, i) => (
            <ListRow key={`${e.title}-${i}`} entry={e} last={i === appointments.length - 1} />
          ))}
        </SectionCard>

        <SectionCard title={S.dashboard.complaint.title} count={10} action={outlinedAction(S.common.all)}>
          {complaints.map((e, i) => (
            <ListRow key={`${e.title}-${i}`} entry={e} last={i === complaints.length - 1} />
          ))}
        </SectionCard>

        <SectionCard
          title={S.dashboard.slider.title}
          action={
            <Button size="small" variant="contained" startIcon={<AddRoundedIcon />} sx={{ px: 2 }}>
              {S.common.addNew}
            </Button>
          }
        >
          <Box
            component="img"
            src={heroSlide.image}
            alt={heroSlide.title}
            sx={{ width: '100%', borderRadius: '10px', mb: 2, display: 'block' }}
          />
          {slides.map((s, i) => (
            <Box key={`${s.title}-${i}`}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 1 }}>
                <Box
                  component="img"
                  src={s.thumb}
                  alt=""
                  sx={{ width: 46, height: 46, borderRadius: '8px', objectFit: 'cover', flexShrink: 0 }}
                />
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography sx={{ fontSize: 14, fontWeight: 600 }} noWrap>
                    {s.title}
                  </Typography>
                  <Typography sx={{ fontSize: 13, color: 'primary.main', fontWeight: 600 }}>
                    {S.common.goTo}
                  </Typography>
                </Box>
                <StatusPill
                  label={s.running ? S.status.running : S.status.stopped}
                  tone={s.running ? 'success' : 'pending'}
                />
                <MoreVertRoundedIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
              </Box>
              {i < slides.length - 1 ? <Divider /> : null}
            </Box>
          ))}
        </SectionCard>
      </Box>
    </Box>
  );
}

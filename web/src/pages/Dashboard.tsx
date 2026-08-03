import { Box, Button, Divider, Typography } from '@mui/material';
import MoreVertRoundedIcon from '@mui/icons-material/MoreVertRounded';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import { useTheme } from '@mui/material/styles';
import ModuleSummaryCard from '../components/ModuleSummaryCard';
import SectionCard from '../components/SectionCard';
import StatusPill from '../components/StatusPill';
import { bnStrings as S } from '../i18n';
import { bn } from '../utils/bnNum';
import { appointments, complaints, slides, type ListEntry } from '../data/sample';

function ListRow({ entry, last }: { entry: ListEntry; last: boolean }) {
  return (
    <Box sx={{ py: 1.5, borderBottom: last ? 'none' : '1px solid', borderColor: 'divider' }}>
      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 1 }}>
        <Typography sx={{ fontSize: 15, fontWeight: 600 }}>{entry.title}</Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexShrink: 0 }}>
          <StatusPill label={entry.status.label} tone={entry.status.tone} />
          <MoreVertRoundedIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
        </Box>
      </Box>
      <Typography sx={{ fontSize: 13.5, color: 'text.secondary', mt: 0.5 }}>{entry.who}</Typography>
      {entry.liveLocation ? (
        <Typography sx={{ fontSize: 13, color: 'primary.main', mt: 0.25, fontWeight: 600 }}>
          {S.common.liveLocation}
        </Typography>
      ) : null}
      <Typography sx={{ fontSize: 13, color: 'text.secondary', mt: 0.5 }}>{entry.date}</Typography>
    </Box>
  );
}

export default function Dashboard() {
  const theme = useTheme();
  const outlinedAction = (label: string) => (
    <Button size="small" variant="outlined" color="inherit" sx={{ borderColor: 'divider', color: 'text.secondary', px: 2 }}>
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
          gridTemplateColumns: { xs: '1fr', md: '1fr 1fr 1fr' },
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
            { label: S.dashboard.pregnancy.totalDelivery, value: bn(15), unit: S.common.person },
          ]}
        />
        <ModuleSummaryCard
          title={S.dashboard.birth.title}
          accent={theme.suraha.module.birth}
          actionLabel={S.common.details}
          tiles={[
            { label: S.dashboard.birth.todayNew, value: bn(1), unit: S.common.count, full: true },
            { label: S.dashboard.birth.total, value: bn(15), unit: S.common.count },
            { label: S.dashboard.birth.pendingEntry, value: bn(10), unit: S.common.count },
          ]}
        />
      </Box>

      {/* Row 2 — list cards */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: '1fr 1fr 1fr' },
          gap: 2.5,
        }}
      >
        <SectionCard title={S.dashboard.appointment.title} action={outlinedAction(S.common.all)}>
          <Typography sx={{ fontSize: 13.5, color: 'text.secondary' }}>
            {S.dashboard.appointment.requests}
          </Typography>
          <Typography sx={{ fontSize: 22, fontWeight: 700, mb: 1 }}>
            {bn(2)} {S.common.count}
          </Typography>
          {appointments.map((e, i) => (
            <ListRow key={e.title} entry={e} last={i === appointments.length - 1} />
          ))}
        </SectionCard>

        <SectionCard title={S.dashboard.complaint.title} action={outlinedAction(S.common.all)}>
          <Typography sx={{ fontSize: 13.5, color: 'text.secondary' }}>
            {S.dashboard.complaint.requests}
          </Typography>
          <Typography sx={{ fontSize: 22, fontWeight: 700, mb: 1 }}>
            {bn(2)} {S.common.count}
          </Typography>
          {complaints.map((e, i) => (
            <ListRow key={e.title} entry={e} last={i === complaints.length - 1} />
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
            sx={{
              borderRadius: 2,
              overflow: 'hidden',
              mb: 2,
              aspectRatio: '16 / 7',
              background: 'linear-gradient(135deg, #7C4DFF 0%, #B388FF 100%)',
              display: 'flex',
              alignItems: 'flex-end',
              p: 1.5,
            }}
          >
            <Typography sx={{ color: '#fff', fontWeight: 700, fontSize: 15 }}>
              ১২ অক্টোবর থেকে দেশব্যাপী টাইফয়েড টিকাদান ক্যাম্প…
            </Typography>
          </Box>
          {slides.map((s, i) => (
            <Box key={s.title}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 1 }}>
                <Box sx={{ width: 46, height: 46, borderRadius: 1.5, bgcolor: 'action.hover', flexShrink: 0 }} />
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
              </Box>
              {i < slides.length - 1 ? <Divider /> : null}
            </Box>
          ))}
        </SectionCard>
      </Box>
    </Box>
  );
}

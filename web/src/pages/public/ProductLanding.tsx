import { Box, Button, Chip, Container, Paper, Stack, Typography, useTheme } from '@mui/material';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import LanguageRoundedIcon from '@mui/icons-material/LanguageRounded';
import ShieldOutlinedIcon from '@mui/icons-material/ShieldOutlined';
import ChildFriendlyRoundedIcon from '@mui/icons-material/ChildFriendlyRounded';
import TranslateRoundedIcon from '@mui/icons-material/TranslateRounded';
import CloudOffRoundedIcon from '@mui/icons-material/CloudOffRounded';
import InsertChartOutlinedRoundedIcon from '@mui/icons-material/InsertChartOutlinedRounded';
import PregnantWomanRoundedIcon from '@mui/icons-material/PregnantWomanRounded';
import GavelRoundedIcon from '@mui/icons-material/GavelRounded';
import EventAvailableRoundedIcon from '@mui/icons-material/EventAvailableRounded';
import VolunteerActivismOutlinedIcon from '@mui/icons-material/VolunteerActivismOutlined';
import FormatQuoteRoundedIcon from '@mui/icons-material/FormatQuoteRounded';
import { useNavigate } from 'react-router-dom';
import { bnStrings as S } from '../../i18n';
import { bn } from '../../utils/bnNum';
import PublicLayout, { type NavLink } from './PublicLayout';

const NAV: NavLink[] = [
  { label: S.site.navFeatures, to: '#features' },
  { label: S.site.navModules, to: '#modules' },
  { label: S.site.navHow, to: '#how' },
  { label: S.site.navImpact, to: '#impact' },
];

const FEATURES = [
  { icon: <LanguageRoundedIcon />, t: S.site.f1T, d: S.site.f1D },
  { icon: <ShieldOutlinedIcon />, t: S.site.f2T, d: S.site.f2D },
  { icon: <ChildFriendlyRoundedIcon />, t: S.site.f3T, d: S.site.f3D },
  { icon: <TranslateRoundedIcon />, t: S.site.f4T, d: S.site.f4D },
  { icon: <CloudOffRoundedIcon />, t: S.site.f5T, d: S.site.f5D },
  { icon: <InsertChartOutlinedRoundedIcon />, t: S.site.f6T, d: S.site.f6D },
];

const MODULES = [
  { icon: <PregnantWomanRoundedIcon />, t: S.site.mPregnancyT, d: S.site.mPregnancyD },
  { icon: <ChildFriendlyRoundedIcon />, t: S.site.mBirthT, d: S.site.mBirthD },
  { icon: <GavelRoundedIcon />, t: S.site.mComplaintT, d: S.site.mComplaintD },
  { icon: <EventAvailableRoundedIcon />, t: S.site.mAppointmentT, d: S.site.mAppointmentD },
  { icon: <VolunteerActivismOutlinedIcon />, t: S.site.mAssistanceT, d: S.site.mAssistanceD },
  { icon: <InsertChartOutlinedRoundedIcon />, t: S.site.mReportT, d: S.site.mReportD },
];

const STEPS = [
  { t: S.site.how1T, d: S.site.how1D },
  { t: S.site.how2T, d: S.site.how2D },
  { t: S.site.how3T, d: S.site.how3D },
];

/** Section heading + optional lead line, centred — the rhythm every band below shares. */
function SectionHead({ title, subtitle, id }: { title: string; subtitle?: string; id?: string }) {
  return (
    <Box id={id} sx={{ textAlign: 'center', maxWidth: 660, mx: 'auto', mb: { xs: 4, md: 6 }, scrollMarginTop: 96 }}>
      <Typography sx={{ fontSize: { xs: 26, md: 36 }, fontWeight: 800, lineHeight: 1.3 }}>{title}</Typography>
      {subtitle && (
        <Typography sx={{ fontSize: 16.5, color: 'text.secondary', mt: 1.5, lineHeight: 1.8 }}>{subtitle}</Typography>
      )}
    </Box>
  );
}

/**
 * suraha.net — the product's own landing page, aimed at the administrations that might adopt
 * Suraha rather than at citizens (they land on an upazila subdomain, see UpazilaLanding).
 * The screenshots in the showcase band are the real officer dashboards from `concept_ui/`.
 */
export default function ProductLanding() {
  const theme = useTheme();
  const navigate = useNavigate();
  const violet = theme.palette.primary.main;

  const shot = {
    width: '100%',
    display: 'block',
    borderRadius: '14px',
    border: `1px solid ${theme.palette.divider}`,
    boxShadow: '0 24px 60px rgba(29,27,32,0.18)',
  } as const;

  return (
    <PublicLayout links={NAV} footerNote={S.site.footerTagline}>
      {/* ---- Hero ------------------------------------------------------ */}
      <Box
        sx={{
          position: 'relative',
          overflow: 'hidden',
          // Soft violet wash behind the hero, fading into the page — the theme's own accent
          // rather than a new brand colour.
          background: `linear-gradient(180deg, ${theme.palette.mode === 'light' ? '#F6F2FF' : '#241F31'} 0%, ${theme.palette.background.default} 100%)`,
        }}
      >
        <Container maxWidth="lg" sx={{ pt: { xs: 6, md: 10 }, pb: { xs: 6, md: 9 }, textAlign: 'center' }}>
          <Chip
            label={S.site.heroEyebrow}
            sx={{ bgcolor: 'rgba(103,80,164,0.12)', color: violet, fontWeight: 700, fontSize: 13.5, mb: 3 }}
          />
          <Typography
            sx={{
              fontSize: { xs: 32, sm: 44, md: 56 },
              fontWeight: 800,
              lineHeight: 1.22,
              letterSpacing: '-0.02em',
              maxWidth: 900,
              mx: 'auto',
            }}
          >
            {S.site.heroTitle}
          </Typography>
          <Typography
            sx={{ fontSize: { xs: 16, md: 18 }, color: 'text.secondary', mt: 3, maxWidth: 720, mx: 'auto', lineHeight: 1.85 }}
          >
            {S.site.heroSubtitle}
          </Typography>

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mt: 4, justifyContent: 'center' }}>
            <Button
              variant="contained"
              size="large"
              endIcon={<ArrowForwardRoundedIcon />}
              onClick={() => document.querySelector('#showcase')?.scrollIntoView({ behavior: 'smooth' })}
              sx={{ px: 4, py: 1.4, fontSize: 16.5 }}
            >
              {S.site.heroPrimary}
            </Button>
            <Button variant="outlined" size="large" onClick={() => navigate('/login')} sx={{ px: 4, py: 1.4, fontSize: 16.5 }}>
              {S.site.heroSecondary}
            </Button>
          </Stack>
          <Typography sx={{ fontSize: 14, color: 'text.secondary', mt: 2.5, direction: 'ltr' }}>
            {S.site.heroCaption}
          </Typography>

          {/* The dashboard itself is the hero image — it is what an administration is buying. */}
          <Box sx={{ mt: { xs: 5, md: 7 }, maxWidth: 1000, mx: 'auto' }}>
            <Box component="img" src="/showcase/dashboard.png" alt={S.site.showcaseTitle} sx={shot} />
          </Box>
        </Container>
      </Box>

      {/* ---- Why Suraha ------------------------------------------------ */}
      <Container maxWidth="lg" sx={{ py: { xs: 7, md: 11 } }}>
        <SectionHead id="features" title={S.site.featuresTitle} subtitle={S.site.featuresSubtitle} />
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: 'repeat(3, 1fr)' }, gap: 3 }}>
          {FEATURES.map((f) => (
            <Paper
              key={f.t}
              elevation={0}
              sx={{
                p: 3.5,
                borderRadius: '18px',
                border: `1px solid ${theme.palette.divider}`,
                height: '100%',
                transition: 'transform 160ms ease, box-shadow 160ms ease',
                '&:hover': { transform: 'translateY(-4px)', boxShadow: '0 18px 40px rgba(29,27,32,0.10)' },
              }}
            >
              <Box
                sx={{
                  width: 52,
                  height: 52,
                  borderRadius: '14px',
                  display: 'grid',
                  placeItems: 'center',
                  bgcolor: 'rgba(103,80,164,0.10)',
                  color: violet,
                  mb: 2,
                  '& svg': { fontSize: 27 },
                }}
              >
                {f.icon}
              </Box>
              <Typography sx={{ fontSize: 19, fontWeight: 700 }}>{f.t}</Typography>
              <Typography sx={{ fontSize: 15, color: 'text.secondary', mt: 1, lineHeight: 1.8 }}>{f.d}</Typography>
            </Paper>
          ))}
        </Box>
      </Container>

      {/* ---- Dashboard showcase ---------------------------------------- */}
      <Box sx={{ bgcolor: 'background.paper', borderTop: `1px solid ${theme.palette.divider}`, borderBottom: `1px solid ${theme.palette.divider}` }}>
        <Container maxWidth="lg" sx={{ py: { xs: 7, md: 11 } }}>
          <SectionHead id="showcase" title={S.site.showcaseTitle} subtitle={S.site.showcaseSubtitle} />

          <Stack spacing={{ xs: 6, md: 9 }}>
            {/* Alternating text/screenshot rows — the second reverses on desktop. */}
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '0.85fr 1.15fr' }, gap: { xs: 3, md: 6 }, alignItems: 'center' }}>
              <Box>
                <Typography sx={{ fontSize: { xs: 22, md: 27 }, fontWeight: 800, lineHeight: 1.35 }}>{S.site.showcase1T}</Typography>
                <Typography sx={{ fontSize: 16, color: 'text.secondary', mt: 2, lineHeight: 1.85 }}>{S.site.showcase1D}</Typography>
              </Box>
              <Box component="img" src="/showcase/dashboard.png" alt={S.site.showcase1T} sx={shot} />
            </Box>

            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1.15fr 0.85fr' }, gap: { xs: 3, md: 6 }, alignItems: 'center' }}>
              <Box
                component="img"
                src="/showcase/dashboard-modules.png"
                alt={S.site.showcase2T}
                sx={{ ...shot, order: { xs: 2, md: 1 } }}
              />
              <Box sx={{ order: { xs: 1, md: 2 } }}>
                <Typography sx={{ fontSize: { xs: 22, md: 27 }, fontWeight: 800, lineHeight: 1.35 }}>{S.site.showcase2T}</Typography>
                <Typography sx={{ fontSize: 16, color: 'text.secondary', mt: 2, lineHeight: 1.85 }}>{S.site.showcase2D}</Typography>
              </Box>
            </Box>
          </Stack>
        </Container>
      </Box>

      {/* ---- Modules ---------------------------------------------------- */}
      <Container maxWidth="lg" sx={{ py: { xs: 7, md: 11 } }}>
        <SectionHead id="modules" title={S.site.modulesTitle} subtitle={S.site.modulesSubtitle} />
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: 'repeat(3, 1fr)' }, gap: 2.5 }}>
          {MODULES.map((m) => (
            <Stack
              key={m.t}
              direction="row"
              spacing={2}
              sx={{ p: 3, borderRadius: '16px', bgcolor: 'background.paper', border: `1px solid ${theme.palette.divider}` }}
            >
              <Box sx={{ color: violet, mt: 0.25, '& svg': { fontSize: 26 } }}>{m.icon}</Box>
              <Box>
                <Typography sx={{ fontSize: 17.5, fontWeight: 700 }}>{m.t}</Typography>
                <Typography sx={{ fontSize: 14.5, color: 'text.secondary', mt: 0.75, lineHeight: 1.75 }}>{m.d}</Typography>
              </Box>
            </Stack>
          ))}
        </Box>
      </Container>

      {/* ---- How it starts ---------------------------------------------- */}
      <Box sx={{ bgcolor: 'background.paper', borderTop: `1px solid ${theme.palette.divider}` }}>
        <Container maxWidth="lg" sx={{ py: { xs: 7, md: 11 } }}>
          <SectionHead id="how" title={S.site.howTitle} />
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: 4 }}>
            {STEPS.map((s, i) => (
              <Box key={s.t}>
                <Box
                  sx={{
                    width: 46,
                    height: 46,
                    borderRadius: '50%',
                    display: 'grid',
                    placeItems: 'center',
                    bgcolor: violet,
                    color: '#fff',
                    fontSize: 20,
                    fontWeight: 800,
                    mb: 2,
                  }}
                >
                  {bn(i + 1)}
                </Box>
                <Typography sx={{ fontSize: 19, fontWeight: 700 }}>{s.t}</Typography>
                <Typography sx={{ fontSize: 15, color: 'text.secondary', mt: 1, lineHeight: 1.8 }}>{s.d}</Typography>
              </Box>
            ))}
          </Box>
        </Container>
      </Box>

      {/* ---- Testimonials, deliberately unfilled ------------------------ */}
      <Container maxWidth="lg" sx={{ py: { xs: 7, md: 11 } }}>
        <SectionHead id="impact" title={S.site.impactTitle} subtitle={S.site.impactSubtitle} />

        {/* No invented quotes: real ones replace these once SEAL supplies them, and until then
            the band says so on the page itself rather than looking like social proof. */}
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: 3 }}>
          {[0, 1, 2].map((i) => (
            <Paper
              key={i}
              elevation={0}
              sx={{
                p: 3.5,
                borderRadius: '18px',
                border: `1px dashed ${theme.palette.divider}`,
                bgcolor: 'transparent',
              }}
            >
              <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                <FormatQuoteRoundedIcon sx={{ color: 'text.disabled', fontSize: 34 }} />
                <Chip label={S.site.placeholderBadge} size="small" sx={{ fontSize: 11.5, fontWeight: 700 }} />
              </Stack>
              <Typography sx={{ fontSize: 16, color: 'text.disabled', mt: 1.5, lineHeight: 1.85 }}>
                {S.site.placeholderQuote}
              </Typography>
              <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mt: 3 }}>
                <Box sx={{ width: 42, height: 42, borderRadius: '50%', bgcolor: 'action.hover' }} />
                <Box>
                  <Typography sx={{ fontSize: 15, fontWeight: 700, color: 'text.disabled' }}>{S.site.placeholderName}</Typography>
                  <Typography sx={{ fontSize: 13, color: 'text.disabled' }}>{S.site.placeholderRole}</Typography>
                </Box>
              </Stack>
            </Paper>
          ))}
        </Box>
        <Typography sx={{ fontSize: 13.5, color: 'text.secondary', textAlign: 'center', mt: 3 }}>
          {S.site.placeholderNote}
        </Typography>
      </Container>

      {/* ---- Closing CTA ------------------------------------------------ */}
      <Container maxWidth="lg" sx={{ pb: { xs: 7, md: 11 } }}>
        <Paper
          elevation={0}
          id="contact"
          sx={{
            borderRadius: '28px',
            px: { xs: 4, md: 8 },
            py: { xs: 6, md: 8 },
            textAlign: 'center',
            color: '#fff',
            scrollMarginTop: 96,
            background: `linear-gradient(135deg, ${violet} 0%, #4F378B 100%)`,
          }}
        >
          <Typography sx={{ fontSize: { xs: 25, md: 34 }, fontWeight: 800, lineHeight: 1.35 }}>{S.site.ctaTitle}</Typography>
          <Typography sx={{ fontSize: 16.5, opacity: 0.9, mt: 2, maxWidth: 620, mx: 'auto', lineHeight: 1.85 }}>
            {S.site.ctaBody}
          </Typography>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mt: 4, justifyContent: 'center' }}>
            <Button
              size="large"
              href="mailto:info@sealfoundation.org"
              sx={{ px: 4, py: 1.4, fontSize: 16.5, bgcolor: '#fff', color: violet, '&:hover': { bgcolor: '#F2ECFF' } }}
            >
              {S.site.ctaBtn}
            </Button>
            <Button
              size="large"
              onClick={() => navigate('/login')}
              sx={{ px: 4, py: 1.4, fontSize: 16.5, color: '#fff', border: '1px solid rgba(255,255,255,0.6)' }}
            >
              {S.site.ctaLogin}
            </Button>
          </Stack>
        </Paper>
      </Container>
    </PublicLayout>
  );
}

import {
  Accordion, AccordionDetails, AccordionSummary, Box, Button, Chip, Container, Paper, Stack, Typography, useTheme,
} from '@mui/material';
import ExpandMoreRoundedIcon from '@mui/icons-material/ExpandMoreRounded';
import GavelRoundedIcon from '@mui/icons-material/GavelRounded';
import EventAvailableRoundedIcon from '@mui/icons-material/EventAvailableRounded';
import VolunteerActivismOutlinedIcon from '@mui/icons-material/VolunteerActivismOutlined';
import ForumOutlinedIcon from '@mui/icons-material/ForumOutlined';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import LocalPhoneOutlinedIcon from '@mui/icons-material/LocalPhoneOutlined';
import ReceiptLongRoundedIcon from '@mui/icons-material/ReceiptLongRounded';
import { useEffect, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { bnStrings as S } from '../../i18n';
import { bn } from '../../utils/bnNum';
import PublicLayout, { type NavLink } from './PublicLayout';
import SliderCarousel from '../../components/SliderCarousel';
import PhoneLink from '../../components/PhoneLink';
import { getPublicSliders, getPublicGeneralInfo, type Slider, type InfoItem } from '../../api/content';
import { useHostContext } from '../../tenant/host';
import { useAuth } from '../../auth/AuthContext';

const NAV: NavLink[] = [
  { label: S.public.navServices, to: '#services' },
  { label: S.public.navHow, to: '#how' },
  { label: S.public.navTrack, to: '/track' },
  { label: S.public.navFaq, to: '#faq' },
];

type Service = { icon: ReactNode; t: string; d: string; to: string; cta: string };

const SERVICES: Service[] = [
  { icon: <GavelRoundedIcon />, t: S.public.sComplaintT, d: S.public.sComplaintD, to: '/file-complaint', cta: S.public.ctaComplaint },
  { icon: <EventAvailableRoundedIcon />, t: S.public.sAppointmentT, d: S.public.sAppointmentD, to: '/book-appointment', cta: S.public.ctaAppointment },
  { icon: <VolunteerActivismOutlinedIcon />, t: S.public.sAssistanceT, d: S.public.sAssistanceD, to: '/apply-assistance', cta: S.public.ctaAssistance },
  { icon: <ForumOutlinedIcon />, t: S.public.sSuggestionT, d: S.public.sSuggestionD, to: '/submit-suggestion', cta: S.public.ctaSuggestion },
];

const STEPS = [
  { t: S.public.how1T, d: S.public.how1D },
  { t: S.public.how2T, d: S.public.how2D },
  { t: S.public.how3T, d: S.public.how3D },
];

const FAQS = [
  { q: S.public.faq1Q, a: S.public.faq1A },
  { q: S.public.faq2Q, a: S.public.faq2A },
  { q: S.public.faq3Q, a: S.public.faq3A },
];

function SectionHead({ title, subtitle, id }: { title: string; subtitle?: string; id?: string }) {
  return (
    <Box id={id} sx={{ textAlign: 'center', maxWidth: 640, mx: 'auto', mb: { xs: 4, md: 6 }, scrollMarginTop: 96 }}>
      <Typography sx={{ fontSize: { xs: 25, md: 34 }, fontWeight: 800, lineHeight: 1.3 }}>{title}</Typography>
      {subtitle && (
        <Typography sx={{ fontSize: 16, color: 'text.secondary', mt: 1.5, lineHeight: 1.8 }}>{subtitle}</Typography>
      )}
    </Box>
  );
}

/**
 * {upazila}.suraha.net — the citizen-facing site for ONE upazila: what can be applied for, how the
 * process works, the awareness slider and emergency numbers the office publishes, and the entry
 * points to filing and tracking. The product's own pitch lives on suraha.net (ProductLanding).
 */
export default function UpazilaLanding() {
  const theme = useTheme();
  const navigate = useNavigate();
  const host = useHostContext();
  const { user } = useAuth();
  const violet = theme.palette.primary.main;
  const isCitizen = user?.role === 'citizen';

  const [slides, setSlides] = useState<Slider[]>([]);
  const [phones, setPhones] = useState<InfoItem[]>([]);
  const [about, setAbout] = useState<InfoItem[]>([]);

  useEffect(() => {
    getPublicSliders().then((r) => setSlides(r.sliders)).catch(() => setSlides([]));
    getPublicGeneralInfo().then((r) => { setPhones(r.phones); setAbout(r.about); }).catch(() => {});
  }, []);

  const upazilaName = host?.name_bn ? `${host.name_bn} উপজেলা` : S.appName;

  return (
    <PublicLayout links={NAV} phones={phones}>
      {/* ---- Hero ------------------------------------------------------ */}
      <Box
        sx={{
          background: `linear-gradient(180deg, ${theme.palette.mode === 'light' ? '#F6F2FF' : '#241F31'} 0%, ${theme.palette.background.default} 100%)`,
        }}
      >
        <Container maxWidth="lg" sx={{ pt: { xs: 6, md: 9 }, pb: { xs: 5, md: 8 } }}>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1.05fr 0.95fr' }, gap: { xs: 4, md: 6 }, alignItems: 'center' }}>
            <Box>
              <Chip
                label={S.public.heroEyebrow}
                sx={{ bgcolor: 'rgba(103,80,164,0.12)', color: violet, fontWeight: 700, fontSize: 13.5, mb: 2.5 }}
              />
              <Typography sx={{ fontSize: { xs: 30, sm: 38, md: 46 }, fontWeight: 800, lineHeight: 1.25, letterSpacing: '-0.02em' }}>
                {upazilaName}
              </Typography>
              <Typography sx={{ fontSize: { xs: 17, md: 20 }, fontWeight: 600, color: violet, mt: 1 }}>
                {S.public.heroTitle}
              </Typography>
              <Typography sx={{ fontSize: 16.5, color: 'text.secondary', mt: 2.5, maxWidth: 540, lineHeight: 1.85 }}>
                {S.public.heroSubtitle}
              </Typography>

              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mt: 3.5 }}>
                <Button
                  variant="contained"
                  size="large"
                  endIcon={<ArrowForwardRoundedIcon />}
                  onClick={() => document.querySelector('#services')?.scrollIntoView({ behavior: 'smooth' })}
                  sx={{ px: 3.5, py: 1.35, fontSize: 16 }}
                >
                  {S.public.navServices}
                </Button>
                <Button
                  variant="outlined"
                  size="large"
                  startIcon={<ReceiptLongRoundedIcon />}
                  onClick={() => navigate('/track')}
                  sx={{ px: 3.5, py: 1.35, fontSize: 16 }}
                >
                  {S.public.ctaTrack}
                </Button>
              </Stack>
              <Typography sx={{ fontSize: 14, color: 'text.secondary', mt: 2 }}>{S.public.heroNote}</Typography>
            </Box>

            {/* The office's own awareness slider is the hero image where one exists — it is the
                most current thing on the page, and it is why the slider module exists. */}
            <Box>
              {slides.length > 0 ? (
                <Box sx={{ borderRadius: '20px', overflow: 'hidden', boxShadow: '0 24px 60px rgba(29,27,32,0.18)' }}>
                  <SliderCarousel slides={slides} height={320} />
                </Box>
              ) : (
                <Box component="img" src="/login-illustration.svg" alt="" sx={{ width: '100%', maxWidth: 420, mx: 'auto', display: 'block' }} />
              )}
            </Box>
          </Box>
        </Container>
      </Box>

      {/* ---- Services --------------------------------------------------- */}
      <Container maxWidth="lg" sx={{ py: { xs: 7, md: 10 } }}>
        <SectionHead id="services" title={S.public.servicesTitle} subtitle={S.public.servicesSubtitle} />

        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 3 }}>
          {SERVICES.map((s) => (
            <Paper
              key={s.to}
              elevation={0}
              sx={{
                p: 3.5,
                borderRadius: '18px',
                border: `1px solid ${theme.palette.divider}`,
                display: 'flex',
                flexDirection: 'column',
                transition: 'transform 160ms ease, box-shadow 160ms ease',
                '&:hover': { transform: 'translateY(-4px)', boxShadow: '0 18px 40px rgba(29,27,32,0.10)' },
              }}
            >
              <Box
                sx={{
                  width: 52, height: 52, borderRadius: '14px', display: 'grid', placeItems: 'center',
                  bgcolor: 'rgba(103,80,164,0.10)', color: violet, mb: 2, '& svg': { fontSize: 27 },
                }}
              >
                {s.icon}
              </Box>
              <Typography sx={{ fontSize: 20, fontWeight: 700 }}>{s.t}</Typography>
              <Typography sx={{ fontSize: 15, color: 'text.secondary', mt: 1, lineHeight: 1.8, flex: 1 }}>{s.d}</Typography>
              <Button
                endIcon={<ArrowForwardRoundedIcon />}
                onClick={() => navigate(s.to)}
                sx={{ alignSelf: 'flex-start', mt: 2, fontWeight: 700 }}
              >
                {s.cta}
              </Button>
            </Paper>
          ))}
        </Box>
      </Container>

      {/* ---- How it works ----------------------------------------------- */}
      <Box sx={{ bgcolor: 'background.paper', borderTop: `1px solid ${theme.palette.divider}`, borderBottom: `1px solid ${theme.palette.divider}` }}>
        <Container maxWidth="lg" sx={{ py: { xs: 7, md: 10 } }}>
          <SectionHead id="how" title={S.public.howTitle} subtitle={S.public.howSubtitle} />
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: 4 }}>
            {STEPS.map((s, i) => (
              <Box key={s.t}>
                <Box
                  sx={{
                    width: 46, height: 46, borderRadius: '50%', display: 'grid', placeItems: 'center',
                    bgcolor: violet, color: '#fff', fontSize: 20, fontWeight: 800, mb: 2,
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

      {/* ---- About the upazila + emergency numbers ---------------------- */}
      {(about.length > 0 || phones.length > 0) && (
        <Container maxWidth="lg" sx={{ py: { xs: 7, md: 10 } }}>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: about.length && phones.length ? '1.3fr 1fr' : '1fr' }, gap: 4 }}>
            {about.length > 0 && (
              <Box>
                <Typography sx={{ fontSize: { xs: 22, md: 27 }, fontWeight: 800, mb: 2 }}>{S.public.upazilaAboutTitle}</Typography>
                <Stack spacing={2}>
                  {about.map((a) => (
                    <Paper key={a.id} elevation={0} sx={{ p: 3, borderRadius: '16px', border: `1px solid ${theme.palette.divider}` }}>
                      <Typography sx={{ fontSize: 17, fontWeight: 700 }}>{a.title}</Typography>
                      <Typography sx={{ fontSize: 15, color: 'text.secondary', mt: 0.75, lineHeight: 1.85, whiteSpace: 'pre-line' }}>
                        {a.value}
                      </Typography>
                    </Paper>
                  ))}
                </Stack>
              </Box>
            )}

            {phones.length > 0 && (
              <Box>
                <Typography sx={{ fontSize: { xs: 22, md: 27 }, fontWeight: 800, mb: 2 }}>{S.public.emergencyTitle}</Typography>
                <Paper elevation={0} sx={{ borderRadius: '16px', border: `1px solid ${theme.palette.divider}`, overflow: 'hidden' }}>
                  {phones.map((p, i) => (
                    <Stack
                      key={p.id}
                      direction="row"
                      spacing={1.5}
                      alignItems="center"
                      sx={{ px: 3, py: 2, borderTop: i === 0 ? 'none' : `1px solid ${theme.palette.divider}` }}
                    >
                      <LocalPhoneOutlinedIcon sx={{ color: violet, fontSize: 21 }} />
                      <Typography sx={{ flex: 1, fontSize: 15.5, fontWeight: 600 }}>{p.title}</Typography>
                      <PhoneLink phone={p.value} />
                    </Stack>
                  ))}
                </Paper>
              </Box>
            )}
          </Box>
        </Container>
      )}

      {/* ---- FAQ -------------------------------------------------------- */}
      <Container maxWidth="md" sx={{ py: { xs: 7, md: 10 } }}>
        <SectionHead id="faq" title={S.public.faqTitle} />
        <Stack spacing={1.5}>
          {FAQS.map((f) => (
            <Accordion
              key={f.q}
              disableGutters
              elevation={0}
              sx={{
                borderRadius: '14px !important',
                border: `1px solid ${theme.palette.divider}`,
                '&::before': { display: 'none' },
              }}
            >
              <AccordionSummary expandIcon={<ExpandMoreRoundedIcon />} sx={{ px: 3, py: 1 }}>
                <Typography sx={{ fontSize: 16.5, fontWeight: 700 }}>{f.q}</Typography>
              </AccordionSummary>
              <AccordionDetails sx={{ px: 3, pb: 3, pt: 0 }}>
                <Typography sx={{ fontSize: 15, color: 'text.secondary', lineHeight: 1.85 }}>{f.a}</Typography>
              </AccordionDetails>
            </Accordion>
          ))}
        </Stack>
      </Container>

      {/* ---- Closing CTA ------------------------------------------------ */}
      <Container maxWidth="lg" sx={{ pb: { xs: 7, md: 10 } }}>
        <Paper
          elevation={0}
          sx={{
            borderRadius: '28px',
            px: { xs: 4, md: 8 },
            py: { xs: 5, md: 7 },
            textAlign: 'center',
            color: '#fff',
            background: `linear-gradient(135deg, ${violet} 0%, #4F378B 100%)`,
          }}
        >
          <Typography sx={{ fontSize: { xs: 24, md: 32 }, fontWeight: 800, lineHeight: 1.35 }}>{S.public.ctaBandTitle}</Typography>
          <Typography sx={{ fontSize: 16.5, opacity: 0.9, mt: 1.5, maxWidth: 560, mx: 'auto', lineHeight: 1.85 }}>
            {S.public.ctaBandBody}
          </Typography>
          <Button
            size="large"
            onClick={() => navigate(isCitizen ? '/my-submissions' : '/login')}
            sx={{ mt: 3.5, px: 4, py: 1.4, fontSize: 16.5, bgcolor: '#fff', color: violet, '&:hover': { bgcolor: '#F2ECFF' } }}
          >
            {isCitizen ? S.public.mySubmissions : S.public.navLogin}
          </Button>
        </Paper>
      </Container>
    </PublicLayout>
  );
}

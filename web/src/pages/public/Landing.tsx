import {
  Accordion, AccordionDetails, AccordionSummary, Box, Button, Container, Paper, Stack, Typography, useTheme,
} from '@mui/material';
import ExpandMoreRoundedIcon from '@mui/icons-material/ExpandMoreRounded';
import PregnantWomanRoundedIcon from '@mui/icons-material/PregnantWomanRounded';
import ChildFriendlyRoundedIcon from '@mui/icons-material/ChildFriendlyRounded';
import EventAvailableRoundedIcon from '@mui/icons-material/EventAvailableRounded';
import GavelRoundedIcon from '@mui/icons-material/GavelRounded';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { bnStrings as S } from '../../i18n';
import PublicLayout from './PublicLayout';
import SliderCarousel from '../../components/SliderCarousel';
import { getPublicSliders, getPublicGeneralInfo, type Slider, type InfoItem } from '../../api/content';

// Simple self-contained hero illustration (inline SVG — no external assets), themed to violet.
function HeroArt() {
  return (
    <Box component="svg" viewBox="0 0 400 300" sx={{ width: '100%', maxWidth: 420 }} aria-hidden>
      <circle cx="200" cy="150" r="130" fill="#EADDFF" opacity="0.6" />
      <rect x="120" y="120" width="70" height="110" rx="8" fill="#6750A4" />
      <rect x="200" y="90" width="70" height="140" rx="8" fill="#4F378B" />
      <rect x="134" y="135" width="18" height="18" rx="3" fill="#fff" opacity="0.85" />
      <rect x="158" y="135" width="18" height="18" rx="3" fill="#fff" opacity="0.85" />
      <rect x="134" y="165" width="18" height="18" rx="3" fill="#fff" opacity="0.85" />
      <rect x="214" y="110" width="18" height="18" rx="3" fill="#fff" opacity="0.85" />
      <rect x="238" y="110" width="18" height="18" rx="3" fill="#fff" opacity="0.85" />
      <rect x="214" y="140" width="18" height="18" rx="3" fill="#fff" opacity="0.85" />
      <circle cx="235" cy="205" r="14" fill="#B3261E" />
      <path d="M228 205l5 5 9-10" stroke="#fff" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </Box>
  );
}

const FEATURES = [
  { icon: <PregnantWomanRoundedIcon />, t: S.public.fPregnancyT, d: S.public.fPregnancyD },
  { icon: <ChildFriendlyRoundedIcon />, t: S.public.fBirthT, d: S.public.fBirthD },
  { icon: <EventAvailableRoundedIcon />, t: S.public.fAppointmentT, d: S.public.fAppointmentD },
  { icon: <GavelRoundedIcon />, t: S.public.fComplaintT, d: S.public.fComplaintD },
];

const FAQS = [
  { q: S.public.faq1Q, a: S.public.faq1A },
  { q: S.public.faq2Q, a: S.public.faq2A },
  { q: S.public.faq3Q, a: S.public.faq3A },
];

export default function Landing() {
  const theme = useTheme();
  const navigate = useNavigate();
  const [slides, setSlides] = useState<Slider[]>([]);
  const [phones, setPhones] = useState<InfoItem[]>([]);
  const [about, setAbout] = useState<InfoItem[]>([]);

  useEffect(() => {
    getPublicSliders().then((r) => setSlides(r.sliders)).catch(() => setSlides([]));
    getPublicGeneralInfo().then((r) => { setPhones(r.phones); setAbout(r.about); }).catch(() => {});
  }, []);

  return (
    <PublicLayout phones={phones}>
      {/* Hero */}
      <Container maxWidth="lg" sx={{ py: { xs: 5, md: 8 } }}>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1.1fr 0.9fr' }, gap: 4, alignItems: 'center' }}>
          <Box>
            <Typography sx={{ fontSize: { xs: 30, md: 42 }, fontWeight: 800, lineHeight: 1.2 }}>
              {S.public.heroTitle}
            </Typography>
            <Typography sx={{ fontSize: 17, color: 'text.secondary', mt: 2, maxWidth: 520 }}>
              {S.public.heroSubtitle}
            </Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mt: 3 }}>
              <Button variant="contained" size="large" onClick={() => navigate('/file-complaint')}>{S.public.ctaComplaint}</Button>
              <Button variant="outlined" size="large" onClick={() => navigate('/book-appointment')}>{S.public.ctaAppointment}</Button>
              <Button size="large" endIcon={<ArrowForwardRoundedIcon />} onClick={() => navigate('/track')}>{S.public.ctaTrack}</Button>
            </Stack>
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'center' }}>
            {slides.length > 0 ? <Box sx={{ width: '100%' }}><SliderCarousel slides={slides} /></Box> : <HeroArt />}
          </Box>
        </Box>
      </Container>

      {/* Features */}
      <Box sx={{ bgcolor: 'background.paper', py: { xs: 5, md: 7 } }}>
        <Container maxWidth="lg">
          <Typography sx={{ fontSize: 26, fontWeight: 800, textAlign: 'center', mb: 4 }}>{S.public.featuresTitle}</Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: 'repeat(4,1fr)' }, gap: 2.5 }}>
            {FEATURES.map((f) => (
              <Paper key={f.t} elevation={0} sx={{ p: 3, borderRadius: '16px', border: `1px solid ${theme.palette.divider}`, textAlign: 'center' }}>
                <Box sx={{ width: 56, height: 56, borderRadius: '14px', bgcolor: theme.palette.primary.main, color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', mb: 1.5, '& svg': { fontSize: 30 } }}>
                  {f.icon}
                </Box>
                <Typography sx={{ fontWeight: 700, fontSize: 17 }}>{f.t}</Typography>
                <Typography sx={{ fontSize: 14, color: 'text.secondary', mt: 0.5 }}>{f.d}</Typography>
              </Paper>
            ))}
          </Box>
        </Container>
      </Box>

      {/* FAQ */}
      <Container maxWidth="md" sx={{ py: { xs: 5, md: 7 } }}>
        <Typography sx={{ fontSize: 26, fontWeight: 800, textAlign: 'center', mb: 3 }}>{S.public.faqTitle}</Typography>
        {FAQS.map((f) => (
          <Accordion key={f.q} elevation={0} disableGutters sx={{ border: `1px solid ${theme.palette.divider}`, borderRadius: '12px !important', mb: 1.5, '&:before': { display: 'none' } }}>
            <AccordionSummary expandIcon={<ExpandMoreRoundedIcon />}>
              <Typography sx={{ fontWeight: 600 }}>{f.q}</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Typography sx={{ color: 'text.secondary' }}>{f.a}</Typography>
            </AccordionDetails>
          </Accordion>
        ))}
      </Container>

      {/* About the upazila (General Info) */}
      {about.length > 0 && (
        <Box sx={{ bgcolor: 'background.paper', py: { xs: 5, md: 7 } }}>
          <Container maxWidth="md">
            {about.map((a) => (
              <Box key={a.id} sx={{ mb: 3 }}>
                <Typography sx={{ fontSize: 22, fontWeight: 800, mb: 1 }}>{a.title}</Typography>
                <Typography sx={{ color: 'text.secondary', whiteSpace: 'pre-wrap' }}>{a.value}</Typography>
              </Box>
            ))}
          </Container>
        </Box>
      )}
    </PublicLayout>
  );
}

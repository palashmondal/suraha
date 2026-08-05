import { useEffect, useState } from 'react';
import { Box, Link, Typography } from '@mui/material';
import type { Slider } from '../api/content';

// Auto-rotating public-awareness carousel (§8.5), used on the landing page + dashboard.
export default function SliderCarousel({ slides, height = 260 }: { slides: Slider[]; height?: number }) {
  const [i, setI] = useState(0);

  useEffect(() => {
    if (slides.length < 2) return;
    const t = setInterval(() => setI((x) => (x + 1) % slides.length), 4500);
    return () => clearInterval(t);
  }, [slides.length]);

  if (slides.length === 0) return null;
  const s = slides[Math.min(i, slides.length - 1)];

  return (
    <Box sx={{ position: 'relative', borderRadius: '16px', overflow: 'hidden', height }}>
      <Box
        sx={{
          height: '100%',
          bgcolor: 'action.hover',
          backgroundImage: s.image_url ? `url(${s.image_url})` : undefined,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          transition: 'background-image 400ms ease',
        }}
      />
      <Box sx={{ position: 'absolute', left: 0, right: 0, bottom: 0, p: 2, background: 'linear-gradient(transparent, rgba(0,0,0,0.65))' }}>
        <Typography sx={{ color: '#fff', fontWeight: 700, fontSize: 18 }}>{s.title}</Typography>
        {s.link && (
          <Link href={s.link} target="_blank" rel="noopener" sx={{ color: '#EADDFF', fontSize: 13.5 }}>
            বিস্তারিত →
          </Link>
        )}
      </Box>
      {slides.length > 1 && (
        <Box sx={{ position: 'absolute', top: 12, right: 12, display: 'flex', gap: 0.75 }}>
          {slides.map((_, idx) => (
            <Box key={idx} onClick={() => setI(idx)} sx={{ width: 8, height: 8, borderRadius: '50%', cursor: 'pointer', bgcolor: idx === i ? '#fff' : 'rgba(255,255,255,0.5)' }} />
          ))}
        </Box>
      )}
    </Box>
  );
}

import { useEffect, useState } from 'react';
import { Box, Link } from '@mui/material';
import type { Slider } from '../api/content';

// Auto-rotating public-awareness carousel (§8.5), used on the landing page + dashboard.
// The posters are 1200×500 and carry their own title text, so we show the WHOLE image
// (aspect-ratio box + `contain`) rather than cropping it with a fixed height + `cover`.
const ASPECT = 1200 / 500;

export default function SliderCarousel({ slides }: { slides: Slider[]; height?: number }) {
  const [i, setI] = useState(0);

  useEffect(() => {
    if (slides.length < 2) return;
    const t = setInterval(() => setI((x) => (x + 1) % slides.length), 4500);
    return () => clearInterval(t);
  }, [slides.length]);

  if (slides.length === 0) return null;
  const s = slides[Math.min(i, slides.length - 1)];

  return (
    <Box sx={{ position: 'relative', borderRadius: '16px', overflow: 'hidden', width: '100%', aspectRatio: `${ASPECT}`, bgcolor: 'action.hover' }}>
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          backgroundImage: s.image_url ? `url(${s.image_url})` : undefined,
          backgroundSize: 'contain',
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'center',
          transition: 'background-image 400ms ease',
        }}
      />
      {s.link && (
        <Link
          href={s.link}
          target="_blank"
          rel="noopener"
          sx={{
            position: 'absolute',
            left: 12,
            bottom: 12,
            px: 1.25,
            py: 0.5,
            borderRadius: '8px',
            bgcolor: 'rgba(0,0,0,0.45)',
            color: '#fff',
            fontSize: 13,
            fontWeight: 600,
            textDecoration: 'none',
            '&:hover': { bgcolor: 'rgba(0,0,0,0.65)' },
          }}
        >
          বিস্তারিত →
        </Link>
      )}
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

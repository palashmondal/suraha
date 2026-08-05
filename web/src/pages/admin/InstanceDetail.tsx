import { useEffect, useState } from 'react';
import { Box, Button, Paper, Stack, Typography } from '@mui/material';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import { useNavigate, useParams } from 'react-router-dom';
import { bnStrings as S } from '../../i18n';
import { api } from '../../api/client';

interface UpazilaDetail {
  id: string;
  name: string;
  name_bn: string;
  is_active: boolean;
  district?: { name_bn: string };
  unions_count?: number;
  domain: string;
}

// Stub detail page — full instance details (officers, stats, config) arrive later.
export default function InstanceDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [u, setU] = useState<UpazilaDetail | null>(null);

  useEffect(() => {
    if (!id) return;
    api<{ data: UpazilaDetail }>(`/upazilas/${id}`)
      .then((r) => setU(r.data))
      .catch(() => setU(null));
  }, [id]);

  return (
    <Box sx={{ maxWidth: 720, mx: 'auto', display: 'grid', gap: 3 }}>
      <Button
        startIcon={<ArrowBackRoundedIcon />}
        onClick={() => navigate('/instances')}
        sx={{ justifySelf: 'start' }}
      >
        {S.instances.back}
      </Button>

      <Paper elevation={0} sx={{ p: 3, borderRadius: '16px' }}>
        <Typography sx={{ fontSize: 22, fontWeight: 800 }}>{u?.name_bn ?? id}</Typography>
        <Stack spacing={0.5} sx={{ mt: 1, color: 'text.secondary' }}>
          {u?.district && <Typography>{u.district.name_bn}</Typography>}
          <Typography sx={{ direction: 'ltr', fontFamily: 'monospace', fontSize: 13 }}>
            {u?.domain}
          </Typography>
        </Stack>
        <Typography sx={{ mt: 3, color: 'text.secondary' }}>
          {S.instances.detailsComingSoon}
        </Typography>
      </Paper>
    </Box>
  );
}

import { useState } from 'react';
import { Badge, Box, Card, CardActionArea, Collapse, Typography, useTheme } from '@mui/material';
import CampaignRoundedIcon from '@mui/icons-material/CampaignRounded';
import ExpandMoreRoundedIcon from '@mui/icons-material/ExpandMoreRounded';
import { bnStrings as S } from '../../i18n';
import EmptyState from '../../components/EmptyState';
import { sampleNotices } from '../../data/citizen';

// UNO notices / updates shared with citizens (SURAHA_BUILD_PROMPT §8.8) — the broadcast stream, read
// in-app (and optionally mirrored via Web Push). Tap a notice to expand its full body.
export default function Notices() {
  const theme = useTheme();
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <Box>
      <Typography variant="h6" sx={{ mb: 2 }}>
        {S.citizen.noticesTitle}
      </Typography>

      {sampleNotices.length === 0 ? (
        <EmptyState message={S.citizen.emptyNotices} icon={<CampaignRoundedIcon sx={{ fontSize: 44, opacity: 0.5 }} />} />
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {sampleNotices.map((n) => {
            const open = openId === n.id;
            return (
              <Card key={n.id} elevation={0} sx={{ border: `1px solid ${theme.palette.divider}`, borderRadius: 3 }}>
                <CardActionArea onClick={() => setOpenId(open ? null : n.id)} sx={{ p: 1.75 }}>
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                    <Badge color="error" variant="dot" invisible={!n.unread} sx={{ mt: 0.5 }}>
                      <CampaignRoundedIcon sx={{ color: theme.suraha.module.officer }} />
                    </Badge>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography sx={{ fontWeight: 600, fontSize: 15, lineHeight: 1.4 }}>{n.title}</Typography>
                      <Typography sx={{ fontSize: 12, color: 'text.secondary', mt: 0.25 }}>{n.publishedOn}</Typography>
                    </Box>
                    <ExpandMoreRoundedIcon sx={{ color: 'text.secondary', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 150ms' }} />
                  </Box>
                  <Collapse in={open}>
                    <Typography sx={{ fontSize: 14, color: 'text.secondary', mt: 1.25, lineHeight: 1.7 }}>{n.body}</Typography>
                  </Collapse>
                </CardActionArea>
              </Card>
            );
          })}
        </Box>
      )}
    </Box>
  );
}

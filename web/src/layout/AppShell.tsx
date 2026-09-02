import { Box, Drawer, useMediaQuery, useTheme } from '@mui/material';
import { useState, type ReactNode } from 'react';
import Sidebar, { SIDEBAR_WIDTH } from './Sidebar';
import TopBar from './TopBar';
import OfflineBanner from '../components/OfflineBanner';

// App shell (concept_ui/Dashboard.png): lavender sidebar + top bar, with the main content in a white
// panel whose top-left corner is rounded. Responsive (SURAHA_BUILD_PROMPT §1.1(2)): on mobile the
// sidebar collapses into a temporary drawer opened from a hamburger in the top bar.
export default function AppShell({ children }: { children: ReactNode }) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <Box sx={{ display: 'flex', height: '100dvh', overflow: 'hidden', bgcolor: 'background.default' }}>
      {isMobile ? (
        <Drawer
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
          ModalProps={{ keepMounted: true }}
          sx={{ '& .MuiDrawer-paper': { width: SIDEBAR_WIDTH, border: 'none' } }}
        >
          <Sidebar onNavigate={() => setMobileOpen(false)} />
        </Drawer>
      ) : (
        <Sidebar />
      )}

      <Box sx={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        <TopBar onMenuClick={isMobile ? () => setMobileOpen(true) : undefined} />
        <OfflineBanner />
        <Box
          sx={{
            flex: 1,
            minHeight: 0,
            bgcolor: 'background.paper',
            borderTopLeftRadius: { xs: 0, md: '28px' },
            overflowY: 'auto',
            p: { xs: 2, md: 3.5 },
          }}
        >
          {children}
        </Box>
      </Box>
    </Box>
  );
}

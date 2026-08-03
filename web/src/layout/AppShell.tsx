import { Box } from '@mui/material';
import type { ReactNode } from 'react';
import Sidebar from './Sidebar';
import TopBar from './TopBar';

// App shell (concept_ui/Dashboard.png): lavender sidebar + top bar, with the main content
// in a white panel whose top-left corner is rounded where it meets the top bar/sidebar.
export default function AppShell({ children }: { children: ReactNode }) {
  return (
    <Box sx={{ display: 'flex', height: '100vh', overflow: 'hidden', bgcolor: 'background.default' }}>
      <Sidebar />
      <Box sx={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        <TopBar />
        <Box
          sx={{
            flex: 1,
            minHeight: 0,
            bgcolor: 'background.paper',
            borderTopLeftRadius: '28px',
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

import { Box } from '@mui/material';
import type { ReactNode } from 'react';
import Sidebar from './Sidebar';
import TopBar from './TopBar';

// App shell = fixed sidebar + top bar + scrolling content area (concept_ui/Dashboard.png).
export default function AppShell({ children }: { children: ReactNode }) {
  return (
    <Box sx={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <Sidebar />
      <Box sx={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        <TopBar />
        <Box sx={{ flex: 1, overflowY: 'auto', p: { xs: 2, md: 3.5 } }}>{children}</Box>
      </Box>
    </Box>
  );
}

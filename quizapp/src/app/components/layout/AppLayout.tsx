import { useState } from 'react';
import { Outlet } from 'react-router';
import { Box, useMediaQuery, useTheme } from '@mui/material';
import { Navbar } from './Navbar';
import { LeftSidebar } from './LeftSidebar';
import { RightSidebar } from './RightSidebar';
import { MobileBottomNav } from './MobileBottomNav';

const SIDEBAR_WIDTH = 10;

export function AppLayout() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
      <Navbar onMenuToggle={() => setMobileOpen(!mobileOpen)} />

      {/* Left Sidebar */}
      {isMobile ? (
        <LeftSidebar open={mobileOpen} onClose={() => setMobileOpen(false)} variant="temporary" />
      ) : (
        <LeftSidebar open variant="permanent" onClose={() => {}} />
      )}

      {/* Main content area */}
      <Box
        component="main"
        sx={{
          flex: 1,
          pt: '64px',
          pb: { xs: '64px', md: 0 },
          ml: { md: `${SIDEBAR_WIDTH}px` },
          minWidth: 0,
        }}
      >
        <Box
          sx={{
            maxWidth: 1200,
            mx: 'auto',
            px: { xs: 1.5, sm: 2, md: 3 },
            py: 3,
            display: 'flex',
            gap: 3,
          }}
        >
          {/* Center content */}
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Outlet />
          </Box>

          {/* Right sidebar */}
          <RightSidebar />
        </Box>
      </Box>

      {/* Mobile bottom nav */}
      <MobileBottomNav />
    </Box>
  );
}

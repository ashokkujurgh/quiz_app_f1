import { useState } from 'react';
import { Outlet } from 'react-router';
import { Box } from '@mui/material';
import { Navbar } from './Navbar';

export function NavOnlyLayout() {
  const [, setMobileOpen] = useState(false);
  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <Navbar onMenuToggle={() => setMobileOpen((v) => !v)} />
      <Box sx={{ pt: '64px' }}>
        <Outlet />
      </Box>
    </Box>
  );
}

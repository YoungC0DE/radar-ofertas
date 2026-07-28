import { useState } from 'react';
import { Outlet } from 'react-router-dom';

import { Container } from '../ui/Layout.js';
import { MobileNav, Navbar } from './Navbar.js';
import { Sidebar } from './Sidebar.js';

export function AppShell() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-bg-primary">
      <Sidebar />
      <MobileNav open={mobileNavOpen} onClose={() => setMobileNavOpen(false)} />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <Navbar onMenuClick={() => setMobileNavOpen(true)} />
        <main className="min-h-0 flex-1 overflow-y-auto scrollbar-thin">
          <Container>
            <Outlet />
          </Container>
        </main>
      </div>
    </div>
  );
}

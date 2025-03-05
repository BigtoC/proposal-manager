import { createRootRoute, Outlet } from '@tanstack/react-router';

import { Navbar } from '@/components/Navbar.tsx';

const RootLayout = () => {
  return (
    <>
      <Navbar />
      <Outlet />
    </>
  );
};

export const Route = createRootRoute({
  component: RootLayout,
});

import { createLazyFileRoute } from '@tanstack/react-router';

import { Main } from '@/components/Main.tsx';

export const Route = createLazyFileRoute('/proposal-manager/love/💖')({
  component: RouteComponent,
});

function RouteComponent() {
  return <Main />;
}

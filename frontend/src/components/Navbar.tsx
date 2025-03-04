import { useMantra } from '@mantrachain/connect';

import { AppIcon } from './AppIcon';
import { ConnectWalletButton } from './ConnectWalletButton';

export const Navbar = () => {
  const { address } = useMantra();

  return (
    <header className="sticky top-0 z-50 w-full bg-background bg-zinc-950 border-b border-zinc-800">
      <nav className="flex flex-row h-14 items-center justify-between px-4">
        <AppIcon />
        {address && <ConnectWalletButton />}
      </nav>
    </header>
  );
};

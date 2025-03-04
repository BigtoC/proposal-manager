import { useMantra } from '@mantrachain/connect';
import { LogOut } from 'lucide-react';

import { shortenAddress } from '@/utils/shortenAddress';

import { Button } from './ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';

const ConnectedDropdownMenu = () => {
  const { disconnect, address } = useMantra();

  if (!address) {
    throw new Error('Address not exist');
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button>{shortenAddress(address)}</Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="mr-4">
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={disconnect}>
          <LogOut />
          <span>Disconnect</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export const ConnectWalletButton = () => {
  const { connect, address } = useMantra();

  if (!address) {
    return <Button onClick={connect}>Connect Wallet</Button>;
  }

  return <ConnectedDropdownMenu />;
};

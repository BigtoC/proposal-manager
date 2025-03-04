import { MantraProvider } from '@mantrachain/connect';
import {
  MutationCache,
  QueryClient,
  QueryClientProvider,
} from '@tanstack/react-query';
import { useMemo } from 'react';

import { Toaster } from '@/shadcn/components/ui/toaster';
import { useToast } from '@/shadcn/hooks/use-toast';

import { Main } from './components/Main';
import { Navbar } from './components/Navbar';
import { getAppConfig } from './utils/getAppConfig';

const WALLET_CONNECT_OPTIONS = {
  signClient: {
    projectId: '2f58e50536162ca50b538d33bff80203',
    relayUrl: 'wss://relay.walletconnect.org',
    metadata: {
      name: 'Proposal Manager',
      description: 'Proposal Manager',
      url: 'https://mantra.zone/',
      icons: [
        'https://raw.githubusercontent.com/cosmology-tech/cosmos-kit/main/packages/docs/public/favicon-96x96.png',
      ],
    },
  },
};

function App() {
  const { toast } = useToast();

  const queryClient = useMemo(() => {
    return new QueryClient({
      mutationCache: new MutationCache({
        onError: (error) => {
          toast({
            variant: 'destructive',
            title: error.name,
            description: error.message,
          });
        },
      }),
    });
  }, [toast]);

  return (
    <>
      <QueryClientProvider client={queryClient}>
        <MantraProvider
          chainName={
            getAppConfig().isMainnet ? 'mantrachain' : 'mantrachaintestnet2'
          }
          walletConnectOptions={WALLET_CONNECT_OPTIONS}
        >
          <Navbar />
          <Main />
        </MantraProvider>
      </QueryClientProvider>
      <Toaster />
    </>
  );
}

export default App;

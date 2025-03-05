import { useCosmWasmClients, useMantra } from '@mantrachain/connect';
import { useQuery } from '@tanstack/react-query';

import { ProposalManagerQueryClient } from '@/__generated__/ProposalManager.client';
import { isLoveApp } from '@/lib/utils.ts';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/shadcn/components/ui/tabs';
import { getAppConfig } from '@/utils/getAppConfig';

import { ConnectWalletButton } from './ConnectWalletButton';
import { CreateProposalCard } from './CreateProposalCard';
import { ManageProposal } from './ManageProposal';
import { ProposalManagerStatus } from './ProposalManagerStatus';
import { RespondProposal } from './RespondProposal';

const Connected = () => {
  const { proposalContractAddress } = getAppConfig();
  const { cosmWasmClient } = useCosmWasmClients();

  const { data: proposalManagerStatus, refetch } = useQuery({
    queryKey: [
      'proposalManagerStatus',
      cosmWasmClient,
      proposalContractAddress,
    ],
    queryFn: async () => {
      if (!cosmWasmClient) {
        throw 'CosmWasmClient not found';
      }
      const client = new ProposalManagerQueryClient(
        cosmWasmClient,
        proposalContractAddress,
      );
      return client.status();
    },
  });

  return (
    <>
      {proposalManagerStatus && (
        <ProposalManagerStatus proposalManagerStatus={proposalManagerStatus} />
      )}
      <Tabs
        defaultValue="createProposal"
        className="flex flex-col gap-2 items-stretch w-[900px]"
      >
        <TabsList>
          <TabsTrigger className="flex-1 text-xs py-2" value="createProposal">
            Create Proposal
          </TabsTrigger>
          <TabsTrigger className="flex-1 text-xs py-2" value="manageProposal">
            Manage Proposal
          </TabsTrigger>
          <TabsTrigger className="flex-1 text-xs py-2" value="respondProposal">
            Respond Received Proposal
          </TabsTrigger>
        </TabsList>
        <TabsContent className="min-h-[450px]" value="createProposal">
          <CreateProposalCard onSuccess={refetch} />
        </TabsContent>
        <TabsContent className="min-h-[450px]" value="manageProposal">
          <ManageProposal onSuccess={refetch} />
        </TabsContent>
        <TabsContent className="min-h-[450px]" value="respondProposal">
          <RespondProposal onSuccess={refetch} />
        </TabsContent>
      </Tabs>
    </>
  );
};

export const Main = () => {
  const { address } = useMantra();

  return (
    <div className="container">
      <h1 className="text-4xl font-semibold text-center mt-10">
        {isLoveApp() ? 'Love on the Chain ❤️' : 'Make a deal on chain'}
      </h1>
      <p className="text-sm text-center mt-3">
        {isLoveApp() ? 'Express your love' : 'Manage your proposals'} on Mantra
        Chain!{' '}
        <span className="text-pink-400">Create or respond to proposals</span>{' '}
        with a gift of tokens.
      </p>

      <div className="flex flex-col items-center mt-10 gap-10">
        {!address && <ConnectWalletButton />}
        {address && <Connected />}
      </div>
    </div>
  );
};

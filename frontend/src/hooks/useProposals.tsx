import { useCosmWasmClients } from '@mantrachain/connect';
import { useQuery } from '@tanstack/react-query';

import { ProposalManagerQueryClient } from '@/__generated__/ProposalManager.client';
import { ProposalBy } from '@/__generated__/ProposalManager.types';
import { getAppConfig } from '@/utils/getAppConfig';

export const useProposals = (filterBy: ProposalBy) => {
  const { proposalContractAddress } = getAppConfig();
  const { cosmWasmClient } = useCosmWasmClients();

  return useQuery({
    queryKey: ['proposals', cosmWasmClient, filterBy],
    queryFn: async () => {
      if (!cosmWasmClient) {
        throw 'CosmWasmClient not found';
      }
      const client = new ProposalManagerQueryClient(
        cosmWasmClient,
        proposalContractAddress,
      );
      return client.proposals({
        filterBy,
        sort: 'descending',
      });
    },
    enabled: !!cosmWasmClient,
  });
};

import {
  useCosmWasmClients,
  useMantra,
  useWalletClient,
} from '@mantrachain/connect';
import { useMutation } from '@tanstack/react-query';

import { ProposalManagerMsgComposer } from '@/__generated__/ProposalManager.message-composer';
import { Coin } from '@/__generated__/ProposalManager.types';
import { useToast } from '@/shadcn/hooks/use-toast';
import { getAppConfig } from '@/utils/getAppConfig';

import { useCalculateGasFee } from './useCalculateGasFee';

const mergeFunds = (proposalFee: Coin, gifts: Coin[]): Coin[] => {
  const existingGift = gifts.find((g) => g.denom === proposalFee.denom);
  const result = existingGift
    ? gifts.map((g) =>
        g.denom === proposalFee.denom
          ? {
              ...g,
              amount: (
                BigInt(g.amount) + BigInt(proposalFee.amount)
              ).toString(),
            }
          : g,
      )
    : [proposalFee].concat(gifts);

  return result.sort((a, b) => a.denom.localeCompare(b.denom));
};

export const useCreateProposalMutation = ({
  onSuccess,
}: {
  onSuccess?: () => void;
}) => {
  const { toast } = useToast();
  const { proposalContractAddress, omDenom } = getAppConfig();
  const { address: walletAddress } = useMantra();
  const { signingCosmWasmClient } = useCosmWasmClients();
  const { client: walletClient } = useWalletClient();
  const { calculateGasFee } = useCalculateGasFee();

  return useMutation({
    mutationFn: async ({
      gift,
      receiver,
      speech,
      title,
      proposalFeeAmount,
    }: {
      gift: Coin[];
      receiver: string;
      speech?: string;
      title?: string;
      proposalFeeAmount: string;
    }) => {
      if (!walletAddress) {
        throw new Error('walletAddress not found');
      }
      if (!walletClient || !walletClient.suggestToken) {
        throw new Error('walletClient not found');
      }
      if (!signingCosmWasmClient) {
        throw new Error('signingCosmWasmClient not found');
      }

      const funds = mergeFunds(
        { denom: omDenom, amount: proposalFeeAmount },
        gift,
      );

      const proposalCreationMessage = new ProposalManagerMsgComposer(
        walletAddress,
        proposalContractAddress,
      ).createProposal({ gift, receiver, speech, title }, funds);

      const messages = [proposalCreationMessage];

      const fee = await calculateGasFee(messages);

      const result = await signingCosmWasmClient.signAndBroadcast(
        walletAddress,
        messages,
        fee,
        '',
      );

      return result;
    },
    onSuccess: (data) => {
      onSuccess?.();
      toast({
        duration: 10000,
        variant: 'success',
        title: 'Create proposal successful',
        description: (
          <a
            href={`https://www.mintscan.io/${getAppConfig().isMainnet ? 'mantra' : 'mantra-testnet'}/tx/${data.transactionHash}`}
            target="_blank"
            className="underline"
          >
            View transaction
          </a>
        ),
      });
      return data;
    },
    onError: (error) => {
      console.error('Mutation failed', error);
    },
  });
};

/* eslint-disable prettier/prettier */
import {
  useCosmWasmClients,
  useMantra,
} from '@mantrachain/connect';
import { useMutation } from '@tanstack/react-query';

import { ProposalManagerMsgComposer } from '@/__generated__/ProposalManager.message-composer';
import { useToast } from '@/shadcn/hooks/use-toast';
import { getAppConfig } from '@/utils/getAppConfig';

import { useCalculateGasFee } from './useCalculateGasFee';

export const useCancelProposalMutation = ({
  onSuccess,
  onError,
}: {
  onSuccess?: () => void;
  onError?: () => void;
}) => {
  const { toast } = useToast();
  const { proposalContractAddress } = getAppConfig();
  const { address: walletAddress } = useMantra();
  const { signingCosmWasmClient } = useCosmWasmClients();
  const { calculateGasFee } = useCalculateGasFee();

  return useMutation({
    mutationFn: async ({ id }: { id: number }) => {
      if (!walletAddress) {
        throw new Error('walletAddress not found');
      }
      if (!signingCosmWasmClient) {
        throw new Error('signingCosmWasmClient not found');
      }

      const message = new ProposalManagerMsgComposer(
        walletAddress,
        proposalContractAddress,
      ).cancelProposal({ id });

      const fee = await calculateGasFee([message]);

      return signingCosmWasmClient.signAndBroadcast(
        walletAddress,
        [message],
        fee,
        '',
      );
    },
    onSuccess: (data) => {
      onSuccess?.();
      toast({
        duration: 10000,
        variant: 'success',
        title: 'Proposal cancelled successfully',
        description: (
          <a
            href={`https://www.mintscan.io/${
              getAppConfig().isMainnet ? 'mantra' : 'mantra-testnet'
            }/tx/${data.transactionHash}`}
            target="_blank"
            className="underline"
          >
            View transaction
          </a>
        ),
      });
    },
    onError: () => {
      onError?.();
    }
  });
};

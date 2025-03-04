import { useCosmWasmClients, useMantra } from '@mantrachain/connect';
import { useMutation } from '@tanstack/react-query';

import { ProposalManagerMsgComposer } from '@/__generated__/ProposalManager.message-composer';
import { useToast } from '@/shadcn/hooks/use-toast';
import { getAppConfig } from '@/utils/getAppConfig';

import { useCalculateGasFee } from './useCalculateGasFee';

type Props = {
  action: 'yes' | 'no';
  onSuccess?: () => void;
  onError?: () => void;
};

export const useRespondProposalMutation = ({
  action,
  onSuccess,
  onError,
}: Props) => {
  const { toast } = useToast();
  const { proposalContractAddress } = getAppConfig();
  const { address: walletAddress } = useMantra();
  const { signingCosmWasmClient } = useCosmWasmClients();
  const { calculateGasFee } = useCalculateGasFee();

  return useMutation({
    mutationFn: async ({ id, reply }: { id: number; reply?: string }) => {
      if (!walletAddress) {
        throw new Error('walletAddress not found');
      }
      if (!signingCosmWasmClient) {
        throw new Error('signingCosmWasmClient not found');
      }

      const msgComposer = new ProposalManagerMsgComposer(
        walletAddress,
        proposalContractAddress,
      );

      const message =
        action === 'yes'
          ? msgComposer.yes({ id, reply })
          : msgComposer.no({ id, reply });

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
        title: `Proposal ${action === 'yes' ? 'accepted' : 'rejected'} successfully`,
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
    },
  });
};

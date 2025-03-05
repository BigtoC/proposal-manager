import { useCosmWasmClients } from '@mantrachain/connect';
import { useQuery } from '@tanstack/react-query';
import BigNumber from 'bignumber.js';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { useMemo, useState } from 'react';

import { ProposalManagerQueryClient } from '@/__generated__/ProposalManager.client';
import { Coin } from '@/__generated__/ProposalManager.types';
import { useAllNativeTokenBalances } from '@/hooks/useAllNativeTokenBalances';
import { useCreateProposalMutation } from '@/hooks/useCreateProposalMutation';
import { isLoveApp } from '@/lib/utils.ts';
import { Button } from '@/shadcn/components/ui/button';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/shadcn/components/ui/card';
import { Input } from '@/shadcn/components/ui/input';
import { Label } from '@/shadcn/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shadcn/components/ui/select';
import { formatTokenBalance } from '@/utils/formatTokenBalance';
import { getAppConfig } from '@/utils/getAppConfig';

dayjs.extend(utc);

type Balance = {
  base: string;
  amount: string;
  humanAmount: string;
  exponent: number;
  denom: string;
};

type SingleProps = {
  denom: string;
  setDenom: (denom: string) => void;
  amount: string;
  setAmount: (amount: string, balance?: Balance) => void;
  balances: Balance[];
};

const Single: React.FC<SingleProps> = ({
  denom,
  setDenom,
  amount,
  setAmount,
  balances,
}) => {
  const balance = balances.find((balance) => balance.denom === denom);

  return (
    <div className="flex flex-row gap-2">
      <Select value={denom} onValueChange={setDenom}>
        <SelectTrigger className="w-[150px] text-left">
          <SelectValue>{denom}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          {balances.map((balance) => (
            <SelectItem key={balance.denom} value={balance.denom}>
              {balance.denom}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Input
        placeholder={`${balance?.humanAmount} (Available)`}
        value={amount}
        onChange={(e) => setAmount(e.target.value, balance)}
      />
    </div>
  );
};

type Gift = {
  base?: string;
  amount: string;
  denom?: string;
  humanAmount: string;
};

const convertGiftsToCoin = (gifts: Gift[]): Coin[] => {
  const validGifts = gifts.filter(
    (gift) => gift.amount && gift.base && gift.amount !== '0',
  );
  return validGifts.map((gift) => ({
    amount: gift.amount,
    denom: gift.base!,
  }));
};

interface Props {
  onSuccess?: () => void;
}

export const CreateProposalCard: React.FC<Props> = ({ onSuccess }) => {
  const { proposalContractAddress } = getAppConfig();
  const { cosmWasmClient } = useCosmWasmClients();
  const [receiver, setReceiver] = useState('');
  const [title, setTitle] = useState('');
  const [speech, setSpeech] = useState('');
  const { mutate, isPending } = useCreateProposalMutation({
    onSuccess: () => {
      onSuccess?.();
    },
  });
  const { data: allBalances } = useAllNativeTokenBalances();
  const [gifts, setGifts] = useState<Gift[]>([
    {
      denom: allBalances?.[0]?.denom,
      amount: '',
      base: allBalances?.[0]?.base,
      humanAmount: '',
    },
  ]);

  const setAmount =
    (index: number) => (humanAmount: string, balance?: Balance) => {
      // Only allow digits and one decimal point
      if (!/^\d*\.?\d*$/.test(humanAmount)) return;

      // Verify that amount is not greater than balance
      if (balance && humanAmount) {
        const inputAmount = new BigNumber(humanAmount);
        const availableAmount = new BigNumber(balance.humanAmount);
        if (inputAmount.isGreaterThan(availableAmount)) return;
      }

      const newGifts = [...gifts];
      newGifts[index].humanAmount = humanAmount;
      newGifts[index].base = balance?.base;
      newGifts[index].amount = new BigNumber(humanAmount)
        .multipliedBy(BigNumber(10).pow(balance?.exponent || 6))
        .toString();
      setGifts(newGifts);
    };

  const setDenom = (index: number) => (denom: string) => {
    const newGifts = [...gifts];
    newGifts[index].denom = denom;
    setGifts(newGifts);
  };

  const addGift = () => {
    setGifts([
      ...gifts,
      {
        denom: allBalances?.[0]?.denom,
        amount: '',
        base: allBalances?.[0]?.base,
        humanAmount: '',
      },
    ]);
  };

  const removeGift = (index: number) => {
    const newGifts = gifts.filter((_, idx) => idx !== index);
    setGifts(newGifts);
  };

  const { data: successfulProposalFee } = useQuery({
    queryKey: ['successfulProposalFee', cosmWasmClient],
    queryFn: async () => {
      if (!cosmWasmClient) {
        throw 'CosmWasmClient not found';
      }
      const client = new ProposalManagerQueryClient(
        cosmWasmClient,
        proposalContractAddress,
      );
      return (await client.config()).successful_proposal_fee;
    },
    enabled: !!cosmWasmClient,
  });

  const formattedFee = useMemo(() => {
    if (!successfulProposalFee) {
      return null;
    }
    return formatTokenBalance(successfulProposalFee.amount);
  }, [successfulProposalFee]);

  return (
    <Card className="w-[900px]">
      <CardHeader>
        <CardTitle>Create Proposal</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col items-stretch gap-4">
        <div className="flex flex-col w-full gap-2">
          <Label htmlFor="receiver">Receiver (required)</Label>
          <Input
            className="font-mono"
            type="string"
            id="receiver"
            placeholder="mantra1..."
            value={receiver}
            onChange={(e) => setReceiver(e.target.value)}
            required
          />
        </div>
        <div className="flex flex-col w-full gap-2">
          <Label htmlFor="title">Title (optional)</Label>
          <Input
            className="font-mono"
            type="string"
            id="title"
            placeholder={isLoveApp() ? 'Marry me' : "Let's collaborate!"}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>
        <div className="flex flex-col w-full gap-2">
          <Label htmlFor="title">Speech (optional)</Label>
          <Input
            className="font-mono"
            type="string"
            id="speech"
            placeholder={isLoveApp() ? 'I love you' : 'Deal! Delay no more!'}
            value={speech}
            onChange={(e) => setSpeech(e.target.value)}
          />
        </div>
        <div className="flex flex-col w-full gap-2">
          <div className="text-sm">Gift (optional)</div>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              {gifts.map((gift, index) => (
                <div key={index} className="flex flex-row gap-2">
                  <Single
                    denom={gift.denom ?? ''}
                    amount={gift.humanAmount}
                    setAmount={setAmount(index)}
                    setDenom={setDenom(index)}
                    balances={allBalances ?? []}
                  />
                  {gifts.length > 0 && (
                    <Button
                      variant="destructive"
                      onClick={() => removeGift(index)}
                    >
                      Delete
                    </Button>
                  )}
                </div>
              ))}
            </div>
            <Button onClick={addGift}>Add More Gift</Button>
          </div>
        </div>
        <div className="flex flex-col w-full gap-2">
          <div className="text-sm">Required Fee</div>
          <div className="text-xl font-semibold font-mono text-blue-400">
            {formattedFee ? `${formattedFee} OM` : '-'}
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex justify-center">
        <Button
          disabled={!receiver || receiver.trim() === ''}
          loading={isPending}
          onClick={() => {
            if (!receiver || receiver.trim() === '') {
              throw new Error('Receiver is required');
            }
            mutate({
              gift: convertGiftsToCoin(gifts),
              receiver: receiver.trim(),
              speech: speech.trim() || undefined,
              title: title.trim() || undefined,
              proposalFeeAmount: successfulProposalFee?.amount ?? '',
            });
          }}
        >
          Create
        </Button>
      </CardFooter>
    </Card>
  );
};

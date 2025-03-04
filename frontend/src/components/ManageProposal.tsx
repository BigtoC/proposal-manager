import { useMantra } from '@mantrachain/connect';
import { useState } from 'react';

import { convertLongToShortCoin } from '@/hooks/useAllNativeTokenBalances';
import { Button } from '@/shadcn/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/shadcn/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shadcn/components/ui/table';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/shadcn/components/ui/tooltip';

import { useCancelProposalMutation } from '../hooks/useCancelProposalMutation';
import { useProposals } from '../hooks/useProposals';
import { CopyableAddress } from './CopyableAddress';

interface Props {
  onSuccess?: () => void;
}

const TruncatedText: React.FC<{ text: string; num?: number }> = ({
  text,
  num,
}) => {
  if (text.length <= (num || 20)) return <span>{text}</span>;
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger className="max-w-[120px] truncate">
          {text}
        </TooltipTrigger>
        <TooltipContent>
          <p className="max-w-[300px] whitespace-pre-wrap">{text}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

const ResponseCell: React.FC<{
  reply?: string | null;
  repliedAt?: number | null;
}> = ({ reply, repliedAt }) => {
  if (!reply) return <>-</>;

  return (
    <div className="flex flex-col gap-1">
      <TruncatedText text={reply} />
      <div className="text-xs text-muted-foreground">@{repliedAt ?? '-'}</div>
    </div>
  );
};

export const ManageProposal: React.FC<Props> = ({ onSuccess }) => {
  const { address } = useMantra();
  const { data: proposalsData, refetch } = useProposals({
    proposer: address || '',
  });
  const [cancellingIds, setCancellingIds] = useState<Set<number>>(new Set());
  const { mutate: cancelProposal } = useCancelProposalMutation({
    onSuccess: () => {
      refetch();
      setCancellingIds(new Set());
      onSuccess?.();
    },
    onError: () => {
      setCancellingIds(new Set());
    },
  });

  const handleCancel = (id: number) => {
    setCancellingIds((prev) => new Set([...prev, id]));
    cancelProposal({ id });
  };

  if (!address) return null;

  return (
    <Card className="w-[900px]">
      <CardHeader>
        <CardTitle>Manage Your Proposals</CardTitle>
        <CardDescription>View and manage your proposals</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[60px]">ID</TableHead>
              <TableHead className="w-[100px]">Title</TableHead>
              <TableHead className="w-[140px]">Receiver</TableHead>
              <TableHead className="w-[140px]">Gift</TableHead>
              <TableHead className="w-[120px]">Speech</TableHead>
              <TableHead className="w-[80px]">Status</TableHead>
              <TableHead className="w-[260px]">Action/ View Reply</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {proposalsData?.proposals.map((proposal) => (
              <TableRow key={proposal.id}>
                <TableCell>{proposal.id}</TableCell>
                <TableCell>
                  {proposal.title ? (
                    <TruncatedText text={proposal.title} num={10} />
                  ) : (
                    '-'
                  )}
                </TableCell>
                <TableCell>
                  <CopyableAddress address={proposal.receiver} />
                </TableCell>
                <TableCell>
                  {proposal.gift.map(convertLongToShortCoin).map((g) => (
                    <div key={g.denom}>
                      {g.amount} {g.denom}
                    </div>
                  ))}
                </TableCell>
                <TableCell>
                  {proposal.speech ? (
                    <TruncatedText text={proposal.speech} />
                  ) : (
                    '-'
                  )}
                </TableCell>
                <TableCell>{proposal.status}</TableCell>
                <TableCell>
                  {(proposal.status === 'pending' && (
                    <Button
                      variant="destructive"
                      loading={cancellingIds.has(proposal.id)}
                      onClick={() => handleCancel(proposal.id)}
                    >
                      Cancel
                    </Button>
                  )) || (
                    <ResponseCell
                      reply={proposal.reply}
                      repliedAt={proposal.replied_at}
                    />
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

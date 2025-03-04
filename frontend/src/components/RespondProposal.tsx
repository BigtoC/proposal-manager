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
import { Input } from '@/shadcn/components/ui/input';
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

import { useProposals } from '../hooks/useProposals';
import { useRespondProposalMutation } from '../hooks/useRespondProposalMutation';
import { CopyableAddress } from './CopyableAddress';
import { Fireworks } from './Fireworks';

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

export const RespondProposal: React.FC<Props> = ({ onSuccess }) => {
  const { address } = useMantra();
  const { data: proposalsData, refetch } = useProposals({
    receiver: address || '',
  });
  const [replyText, setReplyText] = useState<{ [key: number]: string }>({});
  const [respondingState, setRespondingState] = useState<{
    id: number | null;
    action: 'yes' | 'no' | null;
  }>({ id: null, action: null });
  const [showFireworks, setShowFireworks] = useState(false);

  const clearLoadingState = () => {
    setRespondingState({ id: null, action: null });
  };

  const { mutate: respondYes } = useRespondProposalMutation({
    action: 'yes',
    onSuccess: () => {
      setShowFireworks(true);
      setTimeout(() => {
        refetch();
        clearLoadingState();
        onSuccess?.();
      }, 1000);
    },
    onError: clearLoadingState,
  });

  const { mutate: respondNo } = useRespondProposalMutation({
    action: 'no',
    onSuccess: () => {
      refetch();
      clearLoadingState();
      onSuccess?.();
    },
    onError: clearLoadingState,
  });

  const handleRespond = (id: number, action: 'yes' | 'no') => {
    setRespondingState({ id, action });
    const mutate = action === 'yes' ? respondYes : respondNo;
    mutate({
      id,
      reply: replyText[id],
    });
  };

  if (!address) return null;

  return (
    <>
      <Fireworks
        fire={showFireworks}
        onComplete={() => setShowFireworks(false)}
      />
      <Card className="w-[900px]">
        <CardHeader>
          <CardTitle>Respond to Proposals</CardTitle>
          <CardDescription>View and respond to proposals</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[60px]">ID</TableHead>
                <TableHead className="w-[100px]">Title</TableHead>
                <TableHead className="w-[140px]">From</TableHead>
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
                    <CopyableAddress address={proposal.proposer} />
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
                      <div className="flex flex-col gap-2">
                        <Input
                          placeholder="Reply message (optional)"
                          value={replyText[proposal.id] || ''}
                          onChange={(e) =>
                            setReplyText((prev) => ({
                              ...prev,
                              [proposal.id]: e.target.value,
                            }))
                          }
                        />
                        <div className="flex gap-2">
                          <Button
                            variant="default"
                            loading={
                              respondingState.id === proposal.id &&
                              respondingState.action === 'yes'
                            }
                            onClick={() => handleRespond(proposal.id, 'yes')}
                          >
                            Say Yes
                          </Button>
                          <Button
                            variant="destructive"
                            loading={
                              respondingState.id === proposal.id &&
                              respondingState.action === 'no'
                            }
                            onClick={() => handleRespond(proposal.id, 'no')}
                          >
                            Reject
                          </Button>
                        </div>
                      </div>
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
    </>
  );
};

import { Status } from '@/__generated__/ProposalManager.types';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/shadcn/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableRow,
} from '@/shadcn/components/ui/table';

type StatusRowProps = {
  left: React.ReactNode;
  right: React.ReactNode;
};

const StatusRow: React.FC<StatusRowProps> = ({ left, right }) => {
  return (
    <TableRow className="border-none">
      <TableCell className="font-bold">{left}</TableCell>
      <TableCell className="text-right font-mono">{right}</TableCell>
    </TableRow>
  );
};

type Props = {
  proposalManagerStatus: Status;
};

export const ProposalManagerStatus: React.FC<Props> = ({
  proposalManagerStatus,
}) => {
  const totalProposals = proposalManagerStatus.total_proposals;
  const totalProposalsCancelled =
    proposalManagerStatus.total_proposals_cancelled;
  const totalProposalsNo = proposalManagerStatus.total_proposals_no;
  const totalProposalsYes = proposalManagerStatus.total_proposals_yes;
  const totalProposalsPending = proposalManagerStatus.total_proposals_pending;

  return (
    <Card className="w-[900px]">
      <CardHeader>
        <CardTitle>Proposal Manager Status</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableBody>
            <StatusRow left={'Total Proposals'} right={totalProposals} />
            <StatusRow
              left={'Total Proposals Cancelled'}
              right={totalProposalsCancelled}
            />
            <StatusRow left={'Total Proposals No'} right={totalProposalsNo} />
            <StatusRow left={'Total Proposals Yes'} right={totalProposalsYes} />
            <StatusRow
              left={'Total Proposals Pending'}
              right={totalProposalsPending}
            />
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/shadcn/components/ui/tooltip';
import { useToast } from '@/shadcn/hooks/use-toast';
import { shortenAddress } from '@/utils/shortenAddress';

interface Props {
  address: string;
}

export const CopyableAddress: React.FC<Props> = ({ address }) => {
  const { toast } = useToast();

  const handleClick = () => {
    navigator.clipboard.writeText(address);
    toast({
      description: 'Address copied to clipboard',
    });
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger className="cursor-copy font-mono" onClick={handleClick}>
          {shortenAddress(address)}
        </TooltipTrigger>
        <TooltipContent>
          <p>{address}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

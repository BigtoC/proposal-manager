import { HandHeart } from 'lucide-react';

import { useLoveApp } from '@/context/LoveAppContext.tsx';

export const AppIcon = () => {
  const { isLoveApp, setIsLoveApp } = useLoveApp();

  return (
    <div className="flex flex-row items-center gap-2">
      <button
        className="flex flex-row items-center gap-2"
        onClick={() => setIsLoveApp(!isLoveApp)}
      >
        <HandHeart />
      </button>
      <div className="font-semibold">
        {isLoveApp ? 'Love Manager 💖' : 'Proposal Manager'}
      </div>
    </div>
  );
};

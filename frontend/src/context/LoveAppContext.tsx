import { createContext, useContext, useState, ReactNode } from 'react';

interface LoveAppContextType {
  isLoveApp: boolean;
  setIsLoveApp: (isLoveApp: boolean) => void;
}

const LoveAppContext = createContext<LoveAppContextType | undefined>(undefined);

export const LoveAppProvider = ({ children }: { children: ReactNode }) => {
  const [isLoveApp, setIsLoveApp] = useState(false);

  return (
    <LoveAppContext.Provider value={{ isLoveApp, setIsLoveApp }}>
      {children}
    </LoveAppContext.Provider>
  );
};

export const useLoveApp = () => {
  const context = useContext(LoveAppContext);
  if (!context) {
    throw new Error('useLoveApp must be used within a LoveAppProvider');
  }
  return context;
};

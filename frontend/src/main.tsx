// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import '@interchain-ui/react/styles';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

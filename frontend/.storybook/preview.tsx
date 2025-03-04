import { MantraProvider } from '@mantrachain/connect';
import type { Preview } from '@storybook/react';
import React from 'react';
import { useEffect } from 'react';

import '../src/index.css';

const WALLET_CONNECT_OPTIONS = {
  signClient: {
    projectId: '2f58e50536162ca50b538d33bff80203',
    relayUrl: 'wss://relay.walletconnect.org',
    metadata: {
      name: 'Proposal Manager',
      description: 'Proposal Manager for managing and tracking proposals',
      url: 'https://mantra.zone/',
      icons: [
        'https://raw.githubusercontent.com/cosmology-tech/cosmos-kit/main/packages/docs/public/favicon-96x96.png',
      ],
    },
  },
};

const decorators = [
  (Story) => {
    // default to dark mode
    useEffect(() => {
      if (localStorage.getItem('chakra-ui-color-mode') === null) {
        localStorage.setItem('chakra-ui-color-mode', 'dark');
      }
    }, []);
    return (
      <MantraProvider
        chainName="mantrachaintestnet2"
        walletConnectOptions={WALLET_CONNECT_OPTIONS}
      >
        <Story />
      </MantraProvider>
    );
  },
];

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
  },
  decorators,
};

export default preview;

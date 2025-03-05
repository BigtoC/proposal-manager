import react from '@vitejs/plugin-react-swc';
import path from 'path';
import { defineConfig } from 'vite';
import { nodePolyfills } from 'vite-plugin-node-polyfills';

// https://vitejs.dev/config/
export default defineConfig({
  base: '/proposal-manager/',
  plugins: [react(), nodePolyfills()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  define: {
    'process.env.VITE_NETWORK': JSON.stringify(process.env.VITE_NETWORK),
    'process.env.VITE_PROPOSAL_MANAGER_ADDRESS': JSON.stringify(
      process.env.VITE_PROPOSAL_MANAGER_ADDRESS,
    ),
  },
});

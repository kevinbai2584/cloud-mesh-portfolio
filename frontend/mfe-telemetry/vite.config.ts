import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
// @ts-ignore
import federationImport from '@originjs/vite-plugin-federation';

const federation = federationImport as unknown as (options: any) => any;

export default defineConfig({
  plugins: [
    react(),
    federation({
      name: 'mfe_telemetry',
      filename: 'remoteEntry.js',
      exposes: {
        './TelemetryDashboard': './src/components/TelemetryDashboard.tsx',
      },
      shared: ['react', 'react-dom'],
    }),
  ],
  server: {
    port: 5002,
    cors: true,
  },
  preview: {
    port: 5002,
    cors: true,
    headers: {
      'Access-Control-Allow-Origin': '*',
    },
  },
  build: {
    target: 'esnext',
    minify: false,
    cssCodeSplit: false,
  },
});
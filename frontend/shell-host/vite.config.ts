import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
// @ts-ignore
import federationImport from '@originjs/vite-plugin-federation';

const federation = federationImport as unknown as (options: any) => any;

export default defineConfig({
  plugins: [
    react(),
    federation({
      name: 'shell_host',
      remotes: {
        mfe_profile: 'http://localhost:5001/assets/remoteEntry.js',
        mfe_telemetry: 'http://localhost:5002/assets/remoteEntry.js',
        mfe_agent: 'http://localhost:5003/assets/remoteEntry.js',
      },
      shared: ['react', 'react-dom'],
    }),
  ],
  server: {
    port: 5000,
    cors: true,
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
      '/actuator': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
  build: {
    target: 'esnext',
  },
});
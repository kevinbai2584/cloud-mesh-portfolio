import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import federationImport from '@originjs/vite-plugin-federation';

const federation = federationImport as unknown as (options: any) => any;

export default defineConfig({
  plugins: [
    react(),
    federation({
      name: 'mfe_profile',
      filename: 'remoteEntry.js',
      exposes: {
        './ProjectList': './src/components/ProjectList.tsx',
      },
      shared: ['react', 'react-dom'],
    }),
  ],
  server: {
    port: 5001,
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
  preview: {
    port: 5001,
    cors: true,
  },
  build: {
    modulePreload: false,
    target: 'esnext',
    minify: false,
    cssCodeSplit: false,
  },
});
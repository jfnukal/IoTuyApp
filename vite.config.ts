import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Všechny požadavky na /api přesměrujeme na svatky.adresa.info
      '/api': {
        target: 'https://svatky.adresa.info',
        changeOrigin: true, // Nutné pro virtuální hosting serverů
        rewrite: (path) => path.replace(/^\/api/, ''), // Odstraníme /api z cesty
      },
    },
  },
});
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  
  // 🆕 Bundle size reporting
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Oddělíme velké knihovny do samostatných souborů
          'firebase': ['firebase/app', 'firebase/auth', 'firebase/firestore', 'firebase/messaging'],
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
        },
      },
    },
    // Zobrazí velikost souborů při buildu
    reportCompressedSize: true,
    chunkSizeWarningLimit: 500, // Varování při chunk > 500KB
  },
  
  // Přidáno pro správné fungování cest jako '@/components/...'
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  
  // Ponecháno vaše původní nastavení pro proxy
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


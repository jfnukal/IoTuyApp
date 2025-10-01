import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  
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


// import { defineConfig } from 'vite';
// import react from '@vitejs/plugin-react';
// import path from 'path';

// // https://vitejs.dev/config/
// export default defineConfig({
//   plugins: [react()],
  
//   // Přidáno pro správné fungování cest jako '@/components/...'
//   resolve: {
//     alias: {
//       '@': path.resolve(__dirname, './src'),
//     },
//   },
  
//   server: {
//     proxy: {
//       // Všechny požadavky na /api přesměrujeme na svatky.adresa.info
//       '/api': {
//         target: 'https://svatky.adresa.info',
//         changeOrigin: true,
//         rewrite: (path) => path.replace(/^\/api/, ''),
//       },
//       // Proxy pro Bakaláři API
//       '/bakalari': {
//         target: 'https://zszator.bakalari.cz',
//         changeOrigin: true,
//         rewrite: (path) => path.replace(/^\/bakalari/, ''),
//         secure: false,
//       },
//     },
//   },
// });
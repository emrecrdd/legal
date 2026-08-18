import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],

  build: {
    sourcemap: false,

    rollupOptions: {
      output: {
        manualChunks: {
          react: [
            'react',
            'react-dom',
            'react-router-dom',
          ],

          query: [
            '@tanstack/react-query',
          ],

          date: [
            'dayjs',
            'date-fns',
          ],

          icons: [
            'lucide-react',
          ],
        },
      },
    },
  },
}); 
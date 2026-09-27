import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // All /api/* calls are forwarded to the Express backend.
      // This eliminates CORS in development entirely.
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
    },
    // Windows file-watcher polling fix — prevents missed hot-reloads
    watch: {
      usePolling: true,
    },
  },
});

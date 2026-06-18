import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Builds into ../public so the existing Node server serves the result unchanged.
// In dev, proxy API calls to the Node backend on :3000.
export default defineConfig({
  plugins: [react()],
  build: { outDir: '../public', emptyOutDir: true },
  server: { proxy: { '/api': 'http://localhost:3000' } },
});

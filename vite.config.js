import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// GitHub Pages serves this repository under /Remove-bg/; local development stays at /.
const base = process.env.GITHUB_ACTIONS === 'true' ? '/Remove-bg/' : '/';

export default defineConfig({
  base,
  plugins: [react()],
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 1400,
  },
  optimizeDeps: {
    include: ['@imgly/background-removal'],
  },
});

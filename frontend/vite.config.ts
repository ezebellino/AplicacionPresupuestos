import { realpathSync } from 'node:fs';
import { resolve } from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      input: resolve(realpathSync(process.cwd()), 'index.html'),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
  },
});

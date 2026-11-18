import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// Strona na GitHub Pages: https://franuch557.github.io/janas/matura/
// Lokalnie (npm run dev) adres bazowy to /.
export default defineConfig(({ command }) => ({
  plugins: [react()],
  base: command === 'build' ? '/janas/matura/' : '/',
  build: {
    outDir: '../matura',
    emptyOutDir: true,
  },
  test: {
    include: ['tests/**/*.test.ts'],
  },
}));

import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// Tryby budowania:
// - npm run build: strona na GitHub Pages (https://franuch557.github.io/janas/matura/)
// - npm run build:jeden-plik: jeden samodzielny plik HTML (skrypty, style i fonty w środku)
export default defineConfig(({ command, mode }) => {
  const single = mode === 'jeden-plik';
  return {
    plugins: [react()],
    base: single ? './' : command === 'build' ? '/janas/matura/' : '/',
    build: single
      ? {
          outDir: 'dist-jeden-plik',
          emptyOutDir: true,
          assetsInlineLimit: 100_000_000,
          cssCodeSplit: false,
          rollupOptions: { output: { inlineDynamicImports: true } },
        }
      : { outDir: '../matura', emptyOutDir: true },
    test: { include: ['tests/**/*.test.ts'] },
  };
});

import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// Tryby budowania:
// - npm run build: strona na GitHub Pages (https://franuch557.github.io/janas/matura/)
// - npm run build:jeden-plik: jeden samodzielny plik HTML (skrypty, style i fonty w środku)
export default defineConfig(({ command, mode }) => {
  const single = mode === 'jeden-plik';
  // w pliku jednoplikowym (prywatny artefakt) obrazy zadań z cke-obrazy/ są wbudowane
  const embedded = fileURLToPath(new URL('./src/data/obrazy.generated.ts', import.meta.url));
  const empty = fileURLToPath(new URL('./src/data/obrazy-puste.ts', import.meta.url));
  const obrazy = single && existsSync(embedded) ? embedded : empty;
  return {
    plugins: [react()],
    resolve: { alias: { '@obrazy': obrazy } },
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

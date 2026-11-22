import { defineConfig, type Plugin } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { existsSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// Lista pakietów obrazów (public/cke/*.json) wbudowana w aplikację, żeby przy
// starcie nie sprawdzać każdego arkusza osobnym żądaniem.
function ckeManifest(): Plugin {
  const id = 'virtual:cke-manifest';
  const dir = fileURLToPath(new URL('./public/cke/', import.meta.url));
  return {
    name: 'cke-manifest',
    resolveId: (s) => (s === id ? `\0${id}` : null),
    load(s) {
      if (s !== `\0${id}`) return null;
      if (!existsSync(dir)) return 'export default null;';
      const ids = readdirSync(dir).filter((f) => f.endsWith('.json')).map((f) => f.slice(0, -5)).sort();
      return `export default ${JSON.stringify(ids.length ? ids : null)};`;
    },
  };
}

// Tryby budowania:
// - npm run build: strona na GitHub Pages (https://franuch557.github.io/janas/matura/)
// - npm run build:pages: osobne repo GitHub Pages z obrazami CKE (https://franuch557.github.io/matura-2027/),
//   wynik w dist-pages/matura-2027/ (wypychany przez tools/pages-publish.mjs)
// - npm run build:jeden-plik: jeden plik HTML dla artefaktu claude.ai (skrypt, style,
//   font i dane w środku); obrazy zadań i nagrania są w cke/ obok strony.
export default defineConfig(({ command, mode }) => {
  const single = mode === 'jeden-plik';
  const pages = mode === 'pages';
  return {
    plugins: [react(), ckeManifest()],
    // artefakt: bez Supabase i silnika modelu (dane w capability `db`, ocena przez Claude'a)
    resolve: single
      ? {
          alias: {
            '@supabase/supabase-js': fileURLToPath(new URL('./src/stubs/supabase-js.ts', import.meta.url)),
            '@huggingface/transformers': fileURLToPath(new URL('./src/stubs/transformers.ts', import.meta.url)),
          },
        }
      : undefined,
    // zbudowane strony (dist-*) mają setki MB obrazów: serwer deweloperski ich nie przegląda
    optimizeDeps: { entries: ['index.html'] },
    server: { watch: { ignored: ['**/dist-pages/**', '**/dist-jeden-plik/**', '**/cke-obrazy/**', '**/cke-pdf/**'] } },
    base: single ? './' : pages ? '/matura-2027/' : command === 'build' ? '/janas/matura/' : '/',
    build: single
      ? {
          outDir: 'dist-jeden-plik',
          emptyOutDir: true,
          assetsInlineLimit: 100_000_000,
          cssCodeSplit: false,
          copyPublicDir: false,
          rollupOptions: { output: { inlineDynamicImports: true } },
        }
      : pages
        ? { outDir: 'dist-pages/matura-2027', emptyOutDir: true }
        : { outDir: '../matura', emptyOutDir: true },
    test: { include: ['tests/**/*.test.ts'] },
  };
});

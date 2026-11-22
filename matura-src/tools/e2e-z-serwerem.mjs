// Uruchamia testy e2e z serwerem Vite w tym samym procesie i zamyka go po testach
// (sam `npm run e2e` zostawia serwer otwarty w procesie pierwszego pliku testów).
import { createServer } from 'vite';
import { spawn } from 'node:child_process';
import { readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const server = await createServer({ root, logLevel: 'error', server: { port: 5191, strictPort: true } });
await server.listen();
const files = process.argv.slice(2);
const child = spawn(process.execPath, ['--test', '--test-concurrency=1', '--test-timeout=600000', ...(files.length ? files : readdirSync(new URL('../tests-e2e/', import.meta.url)).filter((f) => f.endsWith('.e2e.mjs')).sort().map((f) => `tests-e2e/${f}`))], { cwd: root, stdio: 'inherit', env: process.env });
child.on('exit', async (code) => {
  await server.close();
  process.exit(code ?? 1);
});

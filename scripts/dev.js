import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const root = fileURLToPath(new URL('../', import.meta.url));
const children = [
  spawn(process.execPath, ['--watch', 'server/server.js'], { cwd: root, stdio: 'inherit' }),
  spawn(process.execPath, [join(dirname(require.resolve('vite/package.json')), 'bin/vite.js'), '--host', '127.0.0.1'], { cwd: join(root, 'client'), stdio: 'inherit' }),
];
let stopping = false;
function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  children.forEach((child) => child.kill('SIGTERM'));
  process.exitCode = code;
}
children.forEach((child) => {
  child.on('exit', (code) => stop(code || 0));
  child.on('error', (error) => { console.error(error.message); stop(1); });
});
process.on('SIGINT', () => stop());
process.on('SIGTERM', () => stop());

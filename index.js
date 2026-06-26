import fs from 'fs';
import path from 'path';
import { getFolderOfBranch } from './helpers.js';
const dirname = import.meta.dirname;
const tempDir = path.join(dirname, 'temp');

async function start() {
  cleanup();
  let ok = await getFolderOfBranch(tempDir, 'Oslo-Nye-Fagskole', 'react-rapide', 'app');
  ok && await import('./temp/react-rapide-app/index.js');
}

function cleanup() {
  fs.rmSync(tempDir, { recursive: true, force: true });
  fs.mkdirSync(tempDir);
  fs.writeFileSync(path.join(tempDir, '_is_temp.txt'),
    'This is a temp dir neeeded by the app.', 'utf-8');
}

process.on('exit', cleanup);

start();
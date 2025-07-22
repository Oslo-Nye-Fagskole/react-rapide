import fs from 'fs';
import path from 'path';
import Server from './classes/Server.js';

const templateDbPath = path.join(import.meta.dirname, 'databases', 'template.sqlite3');
const liveDbPath = path.join(import.meta.dirname, 'databases', 'live.sqlite3');
fs.existsSync(liveDbPath) || fs.copyFileSync(templateDbPath, liveDbPath);

if (process.argv[2] === 'standalone') {
  new Server();
}

export default function startBackend(app) {
  new Server(app);
}
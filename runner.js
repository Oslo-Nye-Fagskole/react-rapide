import url from 'url';
import fs from 'fs';
import path from 'path';
import { isFreePort } from 'find-free-ports';
import express from 'express';
import {
  createServer as createViteServer,
  version as viteVersion
} from 'vite';
import c from 'chalk';
let currentServer;
let baseDir;
let oldBackendTemp;

createServer();

export async function createServer(type = 'dev') {
  try {
    const startTime = Date.now();
    baseDir = import.meta.dirname.split('node_modules')[0];

    // Find free ports
    // (one for the server and one for
    //  Vite HMR - hot module reload - using web socket)
    let port = type === 'dev' ? 5173 : 4173;
    while (!await isFreePort(port)) { port++; }
    let hmrPort = 27018;
    while (!await isFreePort(hmrPort)) { hmrPort++; }

    // Create the express server
    const app = express();
    currentServer = app;

    // middleware if no other middleware
    app.use(function always(req, res, next) {
      if (req.url === '/rapideSaysQuitNow') { process.exit(); }
      if (app.router.stack.length < 2) {
        if (req.url.includes('@') || req.url.includes('.')) {
          res.set('Content-Type', 'application/javascript');
          res.send('setTimeout(()=>location.reload(),500)');
        }
        else {
          res.send(/*html*/`<!DOCTYPE html>
          <html><body>
            <script>
              setTimeout(()=>location.reload(),500)
            </script>
          </body></html>
        `);
        }
      }
      else { next(); }
    });

    // check for middleware/server in local folder - add if it exists
    await addBackend(app);

    // Create the vite dev server
    if (type === 'dev') {
      const viteDevServer = await createViteServer({
        server: { middlewareMode: true, hmr: { port: hmrPort } },
        host: '0.0.0.0',
        appType: 'spa',
        hmr: { port }
      });

      addBasicMiddleware(app);

      // Add the vite dev server as middleware
      app.use(viteDevServer.middlewares);
    }

    // Create the preview server
    if (type === 'preview') {
      let pathToDist = path.join(baseDir, 'dist');
      if (!fs.existsSync(pathToDist)) {
        process.stdout.write('\x1Bc'); // clear console
        console.log('');
        console.log(c.bold('No dist folder found.'));
        console.log('  ' + c.green('➜ ') + 'Create it by running ' + c.green('npm run build') + '!');
        console.log('');
        process.exit();
      }
      addBasicMiddleware(app);
      app.use(express.static(pathToDist));
      app.use((_req, res, _next) => {
        // answer with index page on all non-existant routes (SPA behavior)
        res.sendFile(path.join(pathToDist, 'index.html'));
      });
    }

    // Start up the server
    app.listen(port, () => {
      process.stdout.write('\x1Bc'); // clear console
      let timeTaken = Date.now() - startTime;
      type === 'dev' && console.log(
        c.green(c.bold('  VITE ') + 'v' + viteVersion)
        + c.gray('  ready in ') + c.white(c.bold(timeTaken) + ' ms') + '\n'
      );
      console.log(c.green('  ➜ ') + c.white(c.bold('Local:  '))
        + c.cyan('http://localhost:' + port + '/'));
      console.log(c.green('  ➜ ') + c.white(c.bold('Extra:  '))
        + c.cyan('React Rapide installed') + '\n');
    });
  } catch (e) { console.log(e); }
}

// add backend
async function addBackend(app) {
  // using the express stack directly to remove old middleware from the previous backend!
  let backendFolder = path.join(baseDir, 'backend');

  if (oldBackendTemp && fs.existsSync(oldBackendTemp)) {
    fs.rmSync(oldBackendTemp, { recursive: true, force: true });
  }

  // set a global variable used by the backend
  // might not be necessary anymore since this was when we copied the backend code
  // but kept for legacy reasons -  since used by the backend!
  if (fs.existsSync(backendFolder)) {
    globalThis.orgBackendFolder = backendFolder;
  }

  const pathToBackend = path.join(backendFolder, 'index.js');
  const backendToImport = url.pathToFileURL(pathToBackend);
  let backendDefaultFunc;

  // add the backend (that in turn will add middleware and routes)
  if (fs.existsSync(pathToBackend)) {
    backendDefaultFunc = (await import(backendToImport)).default;
    typeof backendDefaultFunc === 'function' && backendDefaultFunc(app);
  }
}

// Some basic middleware for both the  dev and preview server
// note - the routes me not work if we have a real backend added
// (since it might catch all api-routes and have its own cactch alL)
// so mostly here for examples with no real backend
function addBasicMiddleware(app) {
  app.use(function basicMiddleware(req, res, next) {
    if (req.url.startsWith('/api/')) {
      if (req.url === '/api/react-rapide') {
        res.json({ reactRapideRunningTheServer: true });
      }
      else if (req.url === '/api/react-rapide-kill-server') {
        process.exit();
      }
      else if (req.url === '/api/react-rapide-reload-stack') {
        res.json({ status: 'Reloading backend...' });
        addBackend(currentServer);
      }
      else {
        res.status(404);
        res.json({ error: 'Not found...' });
      }
    }
    else { next(); }
  });
};
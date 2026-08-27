// react-rapide, ironboy 2025, app
import fs from 'fs';
import path from 'path';
import c from 'chalk';
import url from 'url';
import prompts from 'prompts';
import { execSync } from 'child_process';
import { getBranches, getReadMeOfBranch, getFolderOfBranch } from './helpers.js';
import { teacherLogin, teacherLogout, decryptToken } from './auth.js';
import autoGenerateRoutes from './auto-generate-routes.js';
import createServer from './server.js';

const log = (...x) => console.log(...x);
const dirname = import.meta.dirname;
const tempDir = path.join(dirname, '..');
const rapideBaseDir = path.join(dirname, '..', '..');
const teacherTokenFile = path.join(rapideBaseDir, '.teacher-token');
const undoFolder = path.join(rapideBaseDir, 'undoFiles');
const arg = process.argv.slice(2)[0] || 'helpFast';
let commandBranches = await getBranches('Oslo-Nye-Fagskole', 'react-rapide', (x) => x.startsWith('command-'));

let teacherToken;
if (fs.existsSync(teacherTokenFile)) {
  const token = decryptToken(fs.readFileSync(teacherTokenFile, 'utf-8'));
  teacherToken = token;
  let add = await getBranches('ironboy', 'react-rapide-teacher', (x) => x.startsWith('command-'), token);
  add = add.map(x => x.replace(/(command-\d*-)/g, '$1teacher-'));
  commandBranches = [...commandBranches, ...add];
}

const commands = commandBranches.map(x => x.split('command-')[1].split(/\d{1,}-/)[1]).filter(x => x);
const defaultPostDo = {
  patchPackages: 'auto',
  replace: {
    files: [['index.html'], ['vitest.config.ts']],
    folders: [['public'], ['src'], ['sass'], ['backend']]
  },
  message: 'All done!'
};

await runCommand(arg).catch(_e => { });
log('');

async function helpFast() {
  ;
  let commandsList = [
    'help',
    // 'undo', - turn off for now (not working with backend folder)
    'auto-routes',
    ...commands
  ];
  let descriptions = [
    'Show help about the code examples',
    'Build the src/routes.ts file (for use with decentralized routing)',
    'The initial source code after installing Vite (a counter)',
    'A very basic "Hello World" example (almost no source code)'
  ];
  let firstStateChange = true;
  let result = await prompts({
    type: 'select',
    name: 'value',
    hint: ' ',
    message: c.bold(c.green('REACT-RAPIDE ')
      + '\n  Scaffolding & Learning by Examples for Vite+React+TS'),
    choices: commandsList.map(x => ({
      name: x, value: x, description: descriptions.shift() || 'Install example'
    })),
    onState: () => { firstStateChange && clearConsole(); firstStateChange = false; },
    initial: 0
  });
  clearConsole();
  let { value } = result || {};
  value && runCommand(value);
}

async function help() {
  log('');
  log(c.bold('Run any command by choosing it after typing ' + c.blue('npm run rr')));
  log(c.bold('or by typing ' + c.blue('npm run rr') + c.green(' command')));
  log('');
  log(c.blue(c.bold(('Available commands explained:'))));
  let disp = [...commands];
  log('');
  log(c.bold(c.green('help')));
  log('Displays info about other commands.');
  log('');
  log(c.bold(c.green('undo')));
  log('Resets files, folders and installed npm modules to their state before the changes made by the latests react-rapide command.');
  log('');
  log(c.bold(c.green('auto-routes')));
  log('Auto-generates a routes.ts file, if your project is setup according to the example found in router-decentralized.');
  for (let branch of commandBranches) {
    let name = disp.shift();
    if (!name) { continue; }
    log('');
    log(c.bold(c.green(name)));
    log(await getReadMeOfBranch('Oslo-Nye-Fagskole', 'react-rapide', branch, teacherToken));
  }
  log('');
}

async function autoRoutes() {
  let baseDir = dirname.slice(0, dirname.lastIndexOf('node_modules'));
  while (baseDir.endsWith('/') || baseDir.endsWith('\\')) { baseDir = baseDir.slice(0, -1); }
  let srcDir = path.join(baseDir, 'src');
  log('');
  try {
    autoGenerateRoutes(srcDir);
    log(c.bold(c.green('routes.ts created!')));
  }
  catch (_e) { log(c.bold(c.red('Something went wrong!'))); }
  log('');
}

async function runCommand(command) {
  clearConsole();
  let mainRapide = fs.readFileSync(path.join(dirname, './main-rapide.tsx'), 'utf-8');
  mainRapide = mainRapide.replaceAll('[[command]]', command);
  command !== 'helpFast' && log(c.green(c.bold(('REACT RAPIDE: ' + command))));
  if (command === 'teacher-login') { await teacherLogin(); return; }
  if (command === 'teacher-logout') { await teacherLogout(); return; }
  if (command === 'helpFast') { helpFast(); return; }
  if (command === 'help') { await help(); return; }
  if (command === 'undo') { undo(); return; }
  if (command === 'auto-routes') { autoRoutes(); return; }
  let index = commands.indexOf(command);
  if (index < 0) {
    if (command === 'dev') { createServer('dev'); return; }
    if (command === 'preview') { createServer('preview'); return; }
    log(c.red(c.bold('No such command: ' + command)));
    return;
  }
  let branch = commandBranches[index];
  await getFolderOfBranch(tempDir, 'Oslo-Nye-Fagskole', 'react-rapide', branch, teacherToken);
  let baseDir = dirname.slice(0, dirname.lastIndexOf('node_modules'));
  while (baseDir.endsWith('/') || baseDir.endsWith('\\')) { baseDir = baseDir.slice(0, -1); }
  let remoteBaseDir = path.join(tempDir, 'react-rapide-' + branch);
  if (remoteBaseDir.includes('teacher-')) {
    remoteBaseDir = path.join(tempDir, 'react-rapide-teacher-' + branch.replace(/teacher-/, ''));
  }
  let func = (await import(url.pathToFileURL(path.join(remoteBaseDir, 'z-rapide.js')))).default;
  let result = func() || {};
  let postDo = { ...defaultPostDo, ...result };
  fs.existsSync(undoFolder) && fs.rmSync(undoFolder, { recursive: true, force: true });
  fs.mkdirSync(undoFolder);
  if (postDo.patchPackages) {
    let result = patchPackage(baseDir, remoteBaseDir, postDo.patchPackages);
    if (result) {
      fs.writeFileSync(path.join(undoFolder, 'package.json'), result.originalPackageContent, 'utf-8');
    }
  }

  // In order to don't crash the vite dev server:
  // If the src folder is part of postDo - give it an empty src/main.tsx initially
  // Wait a while to make the vite dev server understand this
  // then at the end after all other copying copy the real src/main.tsx
  // (when all other files are in place)
  let mainContent, oldMainContent;
  if (((postDo.replace || {}).folders || []).find(x => x.length === 1 && x[0] === 'src')) {
    oldMainContent = !fs.existsSync(path.join(baseDir, 'src', 'main.tsx')) ? '' : fs.readFileSync(path.join(baseDir, 'src', 'main.tsx'), 'utf-8');
    mainContent = fs.readFileSync(path.join(remoteBaseDir, 'src', 'main.tsx'), 'utf-8');
    fs.writeFileSync(path.join(remoteBaseDir, 'src', 'main.tsx'), mainRapide, 'utf-8');
    fs.writeFileSync(path.join(baseDir, 'src', 'main.tsx'), mainRapide, 'utf-8');
    await sleep(2000);
    // if now window is open in a browser call the same endpoint as
    // mainRapide would have done...
    for (let port = 5173; port <= 5193; port++) {
      fetch(`http://localhost:${port}/rapideSaysQuitNow`).catch(_e => { });
    }
    await sleep(1000);
  }

  for (let folder of ((postDo.replace || {}).folders || [])) {
    replaceFolder(baseDir, remoteBaseDir, ...folder);
  }
  for (let file of ((postDo.replace || {}).files || [])) {
    replaceFile(baseDir, remoteBaseDir, ...file);
  }

  // Now write the real main (see above)
  if (mainContent) {
    fs.writeFileSync(path.join(baseDir, 'src', 'main.tsx'), mainContent, 'utf-8');
    //fs.writeFileSync(path.join(undoFolder, 'src', 'mainREAL.tsx'), oldMainContent, 'utf-8');
  }

  log(c.green(c.bold(postDo.message)));
  log('');

  // Make sure we ignore the live db in git
  let ignoreDb = `# Ignore the database being run
# since SQLite might change it during runtime
# + sessions will be stored in it in some examples
# if the live.db is missing the backend will create it
# from template.db
backend/databases/live.sqlite3`;
  let gitIgnore = path.join(baseDir, '.gitignore');
  let gitIgnoreContents = fs.readFileSync(gitIgnore, 'utf-8');
  if (!gitIgnoreContents.includes(ignoreDb)) {
    gitIgnoreContents = ignoreDb + '\n\n' + gitIgnoreContents;
    fs.writeFileSync(gitIgnore, gitIgnoreContents, 'utf-8');
  }

  // Make nodemon restart the dev server
  let rrFolder = import.meta.dirname;
  rrFolder = rrFolder.slice(0, rrFolder.lastIndexOf('temp'));
  let serverPath = path.join(rrFolder, 'server', 'server2.js');
  if (fs.existsSync(serverPath)) {
    let sContent = fs.readFileSync(serverPath, 'utf-8');
    fs.writeFileSync(serverPath, sContent, 'utf-8');
  }

  // Because of problems seen in Windows with the Vite server caching public
  // (in some strange way - new images doesn't show etc...)
  // let us force a server restart by "touching" vite.config (rewrite it)
  // let content = fs.readFileSync(path.join(baseDir, 'vite.config.ts'), 'utf-8');
  // fs.writeFileSync(path.join(baseDir, 'vite.config.ts'), content, 'utf-8');

  // explicitely exit
  process.exit();

};

function replaceFolder(target, org, ...folderName) {
  const undo = org === undoFolder;
  let file = folderName[folderName.length - 1] === true;
  file && folderName.pop();
  target = path.join(target, ...folderName);
  let undoFolderTarget = path.join(undoFolder, ...folderName);
  org = path.join(org, ...folderName);
  if (
    folderName[0] === 'backend' && folderName.length === 1 &&
    !fs.existsSync(org) && fs.existsSync(target)
  ) {
    // remove backend folder if not needed
    fs.rmSync(target, { recursive: true, force: true });
  }
  if (
    folderName[0] === 'sass' && folderName.length === 1 &&
    !fs.existsSync(org) && fs.existsSync(target)
  ) {
    // remove sass folder if not needed
    fs.rmSync(target, { recursive: true, force: true });
  }
  if (!fs.existsSync(org)) { return; }
  !undo && fs.existsSync(target) && fs.cpSync(target, undoFolderTarget, file ? {} : { recursive: true });
  fs.existsSync(target) && fs.rmSync(target, file ? {} : { recursive: true, force: true });
  fs.cpSync(org, target, file ? {} : { recursive: true });
  !undo && !file && log(c.bold('Replacing the ' + c.blue(folderName[folderName.length - 1]) + '-folder'));
  !undo && file && log(c.bold('Replacing the file ' + c.blue(folderName[folderName.length - 1])));
}

function replaceFile(...args) {
  return replaceFolder(...args, true);
}

function patchPackage(target, org, patch) {
  let pTarget = path.join(target, 'package.json');
  let pOrg = path.join(org, 'package.json');
  if (!fs.existsSync(pTarget) || !fs.existsSync(pOrg)) { return; }
  let originalPackageContent = fs.readFileSync(pTarget, 'utf-8');
  let pTargetJson = JSON.parse(originalPackageContent);
  let pOrgJson = JSON.parse(fs.readFileSync(pOrg, 'utf-8'));
  if (patch === 'auto') {
    patch = {};
    for (let type of ['dependencies', 'devDependencies']) {
      patch[type] = {};
      let td = pTargetJson[type] = pTargetJson[type] || {};
      let od = pOrgJson[type] = pOrgJson[type] || {};
      for (let key in od) {

        // Do not add find-free-ports (it is part of react-rapide already)
        if (key.includes('find-free-ports')) { continue; }

        if (!td[key]) {
          // non-existant
          patch[type][key] = od[key];
        }
        else if (compareVersion(td[key], od[key])) {
          // older in target
          patch[type][key] = od[key];
        }
      }
    }
  }
  let anythingChanged = false;
  for (let type of ['dependencies', 'devDependencies']) {
    pTargetJson[type] = pTargetJson[type] || {};
    let toAdd = patch[type];
    for (let key in toAdd) {
      anythingChanged = true;
      pTargetJson[type][key] = toAdd[key];
      let mess = c.bold('npm install ');
      mess += c.bold(c.blue(key + '@' + toAdd[key]));
      mess += type === 'dependencies' ? '' : c.bold(' --save-dev');
      log(mess);
    }
    pTargetJson[type] = { ...pTargetJson[type], ...patch[type] };
  }

  // Add test scripts if missing an there is a vite.config.ts file
  let scripts = pTargetJson.scripts;
  if (path.join(org, 'vitest.config.js')) {

    if (!scripts.test) {
      Object.assign(scripts, {
        "test": "vitest",
        "test:ui": "vitest --ui",
        "test:run": "vitest run"
      });
      anythingChanged = true;
    }

    // Modify tsconfig.app.json
    const conf = path.join(target, 'tsconfig.app.json');
    if (fs.existsSync(conf)) {
      let content = fs.readFileSync(conf, 'utf-8');
      content = addTestingToTsConfig(content);
      fs.writeFileSync(conf, content, 'utf-8');
    }
  }

  if (!anythingChanged) { return false; }
  fs.writeFileSync(pTarget, JSON.stringify(pTargetJson, null, '  '), 'utf-8');
  execSync('cd "' + target + '" && npm install && npm audit fix');
  return { patched: true, originalPackageContent };
}

function compareVersion(targetV, orgV) {
  // ~ update to newer patch versions
  // ^ update to newer minor versions
  // but for now ignore this and just make newer!
  // return false if no update needed (target version same or newer)
  // otherwise return true (update needed)
  targetV = targetV.split('.').map(x => +x.replace(/\D/g, ''));
  orgV = orgV.split('.').map(x => +x.replace(/\D/g, ''));
  if (orgV[0] > targetV[0]) { return true; }
  if (orgV[1] > targetV[1]) { return true; }
  if (orgV[2] > targetV[2]) { return true; }
  return false;
}

function undo() {
  let baseDir = dirname.slice(0, dirname.lastIndexOf('node_modules'));
  if (!fs.existsSync(undoFolder)) {
    log(c.red(c.bold('Nothing to undo...')));
    return;
  }
  let toRestore = fs.readdirSync(undoFolder).map(x => ({
    name: x,
    path: path.join(undoFolder, x),
    isDir: fs.statSync(path.join(undoFolder, x)).isDirectory()
  }));
  for (let { name } of toRestore.filter(x => x.isDir)) {
    replaceFolder(baseDir, undoFolder, name.replace(baseDir, ''));
    log(c.bold('Restoring the ' + c.blue(name) + '-folder'));
  }
  for (let { name } of toRestore.filter(x => !x.isDir)) {
    replaceFile(baseDir, undoFolder, name.replace(baseDir, ''));
    log(c.bold('Restoring the file ' + c.blue(name)));
  }
  if (toRestore.find(x => x.name === 'package.json')) {
    let packageLockPath = path.join(baseDir, 'package.lock.json');
    let nodModulesPath = path.join(baseDir, 'node_modules');
    fs.existsSync(packageLockPath) && fs.rmSync(packageLockPath);
    fs.existsSync(nodModulesPath) && fs.rmSync(packageLockPath, { recursive: true, force: true });
    execSync('cd "' + baseDir + '" && npm install');
    log(c.bold('Sync of npm modules to match restored package.json'));
  }
  fs.rmSync(undoFolder, { recursive: true, force: true });
  // restore real main
  let pathToRealMain = path.join(baseDir, 'src', 'mainREAL.tsx');
  let pathToMain = path.join(baseDir, 'src', 'main.tsx');
  if (fs.existsSync(pathToRealMain)) {
    fs.existsSync(pathToMain) && fs.rmSync(pathToMain);
    fs.renameSync(pathToRealMain, pathToMain);
  }
}

function sleep(ms) {
  return new Promise(res => setTimeout(res, ms));
}

function clearConsole() {
  process.stdout.write('\x1Bc');
}


function addTestingToTsConfig(tsconfigContent) {
  const cleanContent = tsconfigContent.replace(/\/\*[\s\S]*?\*\//g, '');
  const config = JSON.parse(cleanContent);

  if (!config.compilerOptions) { config.compilerOptions = {}; }
  if (!config.compilerOptions.types) { config.compilerOptions.types = []; }

  ["vitest/globals", "@testing-library/jest-dom"].forEach(type => {
    if (!config.compilerOptions.types.includes(type)) {
      config.compilerOptions.types.push(type);
    }
  });

  if (!config.include) { config.include = []; }

  ["src/**/*.test.tsx", "src/test/**/*"].forEach(pattern => {
    if (!config.include.includes(pattern)) {
      config.include.push(pattern);
    }
  });

  return JSON.stringify(config, null, 2);
}

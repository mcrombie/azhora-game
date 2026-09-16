const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const candidates = [path.join(root, 'node_modules/electron/dist/electron.exe'), path.resolve(root, '../world-builder/map/node_modules/electron/dist/electron.exe')];
const electron = candidates.find(p => fs.existsSync(p));
if (!electron) { console.error('Install the game runtime first: npm install'); process.exit(1); }
const env = { ...process.env }; delete env.ELECTRON_RUN_AS_NODE;
const smoke = process.argv.includes('--smoke-test');
const isolated = smoke || process.argv.includes('--window-test');
const profileRoot = path.join(root, 'tests', '.electron-profiles');
let testProfile;
if (isolated) {
  fs.mkdirSync(profileRoot, { recursive: true });
  testProfile = fs.mkdtempSync(path.join(profileRoot, 'run-'));
  env.AZHORA_TEST_PROFILE = testProfile;
} else delete env.AZHORA_TEST_PROFILE;
function cleanTestProfile() {
  if (!testProfile) return;
  const resolved = path.resolve(testProfile);
  // Delete only this launch's newly created directory, inside the test workspace.
  if (!resolved.startsWith(path.resolve(profileRoot) + path.sep) || !path.basename(resolved).startsWith('run-')) return;
  try { fs.rmSync(resolved, { recursive: true, force: true, maxRetries: 8, retryDelay: 80 }); }
  catch { console.warn('The temporary test profile is still in use:', resolved); }
}
// The console wrapper may be hidden, but the GUI process must receive normal
// startup visibility. Hiding Electron suppresses its first native game window.
const child = spawn(electron, [root, ...process.argv.slice(2)], { cwd: root, env, windowsHide: smoke, stdio: 'inherit' });
child.on('error', error => { cleanTestProfile();console.error(error.message); process.exit(1); });
child.on('exit', code => { cleanTestProfile();process.exit(code ?? 1); });

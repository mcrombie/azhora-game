/**
 * **The game as a static site.**
 *
 * Azhora is already a web page: `main.cjs` serves the folder over http on a loopback port and
 * Electron just loads it, which is why every stack trace in a smoke reads `http://127.0.0.1:.../
 * src/main.js`. Nothing in `src/` imports a node builtin, `three` arrives through the import map
 * in index.html, and the one Electron-only thing - the save bridge in preload.cjs - is already
 * written with a fallback: `window.azhoraRoadStorage || localStorage` (src/main.js).
 *
 * So there is no build, only a copy: this puts the four things a browser needs into `public/`
 * and leaves the desktop app, the tests, the scripts and the docs out of it.
 *
 *   node scripts/build-web.mjs            → public/
 *   node scripts/build-web.mjs --out dist → somewhere else
 */
import { cp, mkdir, rm, readdir, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.dirname(fileURLToPath(new URL('../package.json', import.meta.url)));
const outArg = process.argv.indexOf('--out');
const out = path.resolve(root, outArg > 0 ? process.argv[outArg + 1] : 'public');

/** What a browser asks for, and nothing else. */
const PUBLISHED = ['index.html', 'src', 'vendor', 'assets'];
/** Test files live beside the code they test; they are not part of the game. */
const skip = entry => entry.endsWith('.test.js');

const bytes = async dir => {
  let total = 0;
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    total += entry.isDirectory() ? await bytes(full) : (await stat(full)).size;
  }
  return total;
};

await rm(out, { recursive: true, force: true });
await mkdir(out, { recursive: true });
for (const name of PUBLISHED) {
  await cp(path.join(root, name), path.join(out, name), { recursive: true, filter: source => !skip(source) });
}
console.log(`${path.relative(root, out)}/ — ${(await bytes(out) / 1e6).toFixed(1)} MB, ${PUBLISHED.join(', ')}`);

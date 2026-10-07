/**
 * Publish the shared main menu and explicit legacy/prototype entry pages as a static site.
 * The exploration renderer uses its desktop save bridge or per-mode localStorage keys.
 * Only public game files are copied; hosts, saves, tests, docs and private references stay out.
 * Run `npm run build:web` for public/, or pass --out with a dedicated project directory.
 */
import { cp, mkdir, rm, readdir, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.dirname(fileURLToPath(new URL('../package.json', import.meta.url)));
const outArg = process.argv.indexOf('--out');
const out = path.resolve(root, outArg > 0 ? process.argv[outArg + 1] : 'public');

// Never allow a build output to overwrite the project or its private reference.
const relativeOut = path.relative(root, out);
if (!relativeOut || relativeOut.startsWith('..') || path.isAbsolute(relativeOut)
    || relativeOut.split(/[\\/]/).some(part => part.toLowerCase() === 'reference-private')
    || ['src','assets','vendor','scripts','tests'].includes(relativeOut.toLowerCase())) {
  throw new Error('Choose a dedicated build output directory inside the project.');
}

/** What a browser asks for, and nothing else. */
const PUBLISHED = ['index.html', 'exploration.html', 'adventure.html', 'lizeem.html', 'src', 'vendor', 'assets'];
/** Test files live beside the code they test; they are not part of the game. */
const skip = entry => entry.endsWith('.test.js') || entry.split(/[\\/]/).some(part => part.toLowerCase() === 'reference-private');

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

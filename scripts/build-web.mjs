/**
 * Publish the shared main menu and explicit legacy/prototype entry pages as a static site.
 * The exploration renderer uses its desktop save bridge or per-mode localStorage keys.
 * Only public game files are copied; hosts, saves, tests, docs and private references stay out.
 * Run `npm run build:web` for public/, or pass --out with a dedicated project directory.
 */
import { cp, mkdir, rm, readdir, stat, readFile, writeFile } from 'node:fs/promises';
import {createHash} from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import publicFiles from './public-files.cjs';
import {ensureLookoutLandscape} from './build-lookout.mjs';

const root = path.dirname(fileURLToPath(new URL('../package.json', import.meta.url)));
const outArg = process.argv.indexOf('--out');
const out = path.resolve(root, outArg > 0 ? process.argv[outArg + 1] : 'public');

// Never allow a build output to overwrite the project or its private reference.
const relativeOut = path.relative(root, out);
if (!relativeOut || relativeOut.startsWith('..') || path.isAbsolute(relativeOut)
    || relativeOut.split(/[\\/]/).some(part => part.toLowerCase() === 'reference-private')
    || ['src','assets','vendor','scripts','tests','.git','.agents','.codex','docs','node_modules'].includes(relativeOut.split(/[\\/]/)[0].toLowerCase())) {
  throw new Error('Choose a dedicated build output directory inside the project.');
}

/** What a browser asks for, and nothing else. */
const {PUBLISHED,skip} = publicFiles;
/** Test files live beside the code they test; they are not part of the game. */

const bytes = async dir => {
  let total = 0;
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    total += entry.isDirectory() ? await bytes(full) : (await stat(full)).size;
  }
  return total;
};

await ensureLookoutLandscape();
await rm(out, { recursive: true, force: true });
await mkdir(out, { recursive: true });
for (const name of PUBLISHED) {
  await cp(path.join(root, name), path.join(out, name), { recursive: true, filter: source => !skip(source) });
}
// Identify the actual artifact independently of Git or a manual hosting deploy.
// Hash only the allowlisted output, never the worktree or confidential references.
const files=[];
async function fingerprint(dir){
  for(const entry of (await readdir(dir,{withFileTypes:true})).sort((a,b)=>a.name<b.name?-1:a.name>b.name?1:0)){
    const file=path.join(dir,entry.name);
    if(entry.isDirectory())await fingerprint(file);
    else files.push([path.relative(out,file).replaceAll('\\','/'),createHash('sha256').update(await readFile(file)).digest('hex')]);
  }
}
await fingerprint(out);
await writeFile(path.join(out,'build-info.json'),JSON.stringify({
  format:1,builtAt:new Date().toISOString(),
  artifactSha256:createHash('sha256').update(JSON.stringify(files)).digest('hex'),
  fileCount:files.length,launcher:'public',
},null,2)+'\n');
console.log(`${path.relative(root, out)}/ — ${(await bytes(out) / 1e6).toFixed(1)} MB, ${PUBLISHED.join(', ')}`);

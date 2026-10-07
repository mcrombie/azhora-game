import { readFile, writeFile, mkdir, rename } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import { createSettlementWorld, DAY_SECONDS, validateSettlementSnapshot } from '../src/settlements/engine.js';
import { PILOT_SITES, canonFor, CANON_VERSION, LORE_REVISION } from '../src/settlements/canon.js';
import { createMemoryArchive, flushChronicles } from '../src/settlements/archive.js';
import { validatePack } from '../src/settlements/editions.js';

export async function generatePack({ region = 'Feradom', seed = 980, days = 30, sites = PILOT_SITES.map(s => s.id), worldId } = {}) {
  canonFor(region);
  if (!Number.isSafeInteger(days) || days < 0 || days > 3650) throw new Error('Choose 0–3650 history days.');
  if (!sites.length || new Set(sites).size !== sites.length) throw new Error('Choose distinct community sites.');
  worldId ??= `author-${seed}-${days}-${createHash('sha256').update(JSON.stringify([CANON_VERSION, region, sites])).digest('hex').slice(0, 12)}`;
  const selected = sites.map(id => { const s = PILOT_SITES.find(p => p.id === id); if (!s) throw new Error(`Unknown site: ${id}`); return s; });
  const engine = createSettlementWorld({ seed, worldId, sites: selected, startTime: -days * DAY_SECONDS }), archive = createMemoryArchive();
  await flushChronicles(engine, archive);
  while (engine.time < 0) { engine.advanceTo(0); await flushChronicles(engine, archive); }
  const entries = await Promise.all((await archive.list(worldId)).map(r => archive.get(r.id)));
  const pack = { version: 1, canon: CANON_VERSION, sourceRevision: LORE_REVISION, region, seed, days, snapshot: engine.snapshot(), entries };
  if (!validateSettlementSnapshot(pack.snapshot)) throw new Error('Generated pack did not validate.');
  return pack;
}
export async function writePack(pack, destination) {
  await mkdir(destination, { recursive: true });
  const checkpoint = path.join(destination, 'settlement-pack.json');
  await writeFile(checkpoint + '.tmp', JSON.stringify(pack, null, 2));
  await rename(checkpoint + '.tmp', checkpoint);
  const css = await readFile(new URL('../src/settlements/book.css', import.meta.url), 'utf8');
  const source = (await readFile(new URL('../src/settlements/book.js', import.meta.url), 'utf8')).replace('export function createChronicleBook', 'function createChronicleBook');
  const json = JSON.stringify(pack).replaceAll('<', '\\u003c');
  const html = `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Feradom · Settlement authoring preview</title><style>body{margin:0;background:#291f19;color:#ead5aa;font-family:Georgia}#reopen{margin:3rem;padding:1rem} ${css}</style><button id="reopen">Open the Feradom Annals</button><main id="book"></main><script type="module">${source}\nconst pack=${json};const archive={list:async(w,s)=>pack.entries.filter(r=>r.entry.settlementId===s).map(r=>({id:r.id,day:r.entry.day,kind:r.entry.kind})),get:async id=>pack.entries.find(r=>r.id===id)};const book=createChronicleBook({root:document.getElementById('book'),communities:()=>pack.snapshot.settlements,worldId:()=>pack.snapshot.worldId,archive,authoring:true});document.getElementById('reopen').onclick=()=>book.open();book.open();</script></html>`;
  await writeFile(path.join(destination, 'preview.html'), html);
}
async function main() {
  const args = process.argv.slice(2), value = (key, fallback) => { const i = args.indexOf(key); return i < 0 ? fallback : args[i + 1]; };
  const days = Number(value('--days', '30')), seed = Number(value('--seed', '980')), region = value('--region', 'Feradom');
  const sites = value('--sites', PILOT_SITES.map(s => s.id).join(',')).split(',');
  canonFor(region);
  if (!Number.isSafeInteger(days) || days < 0 || days > 3650 || !Number.isSafeInteger(seed) || seed < 0 || seed > 4294967295 || sites.some(id => !PILOT_SITES.some(s => s.id === id))) throw new Error('Invalid authoring options.');
  const count = sites.length * (days + 1);
  console.log(JSON.stringify({ region, seed, days, pages: count, modelCalls: count * 2, planningReservationUSD: +(count * .08).toFixed(2), monthlyModelBudgetUSD: 25, note: 'The $0.08/page reservation is a conservative configuration, not a current price quote. No paid requests occur in authoring unless --generate is supplied.' }));
  if (args.includes('--dry-run')) return;
  const out = path.resolve(value('--out', 'tests/artifacts/settlements'));
  const pack = args.includes('--resume') ? JSON.parse(await readFile(path.join(out, 'settlement-pack.json'), 'utf8'))
    : await generatePack({ region, seed, days, sites, worldId: value('--world', undefined) });
  if (!validatePack(pack)) throw new Error('The settlement pack is invalid; preserve it for inspection before resuming.');
  await writePack(pack, out);
  if (args.includes('--generate')) {
    const endpoint = process.env.AZHORA_CHRONICLES_URL, token = process.env.AZHORA_CHRONICLES_TOKEN;
    if (!/^https:\/\//.test(endpoint ?? '') || !token) throw new Error('Set AZHORA_CHRONICLES_URL and a collaborator access token before paid generation.');
    // Stay below the service's two HTTP requests/second, including large authoring packs.
    let nextRequest = 0;
    const pressFetch = async (url, options) => {
      await new Promise(resolve => setTimeout(resolve, Math.max(0, nextRequest - Date.now())));
      nextRequest = Date.now() + 650;
      return fetch(url, options);
    };
    for (const row of pack.entries) {
      const response = await pressFetch(endpoint.replace(/\/$/, '') + '/v1/chronicles', { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` }, body: JSON.stringify({ entry: row.entry, shareWithCollaborators: true }), signal: AbortSignal.timeout(20000) });
      if (!response.ok) throw new Error(`Generation admission failed (${response.status}); rerun with the same world ID to resume safely.`);
      row.generation = await response.json();
      await writePack(pack, out);
    }
    // Resume only persisted job IDs. Unknown billing outcomes are never submitted as a new invocation.
    const deadline = Date.now() + Number(value('--wait-minutes', '20')) * 60000;
    while (Date.now() < deadline && pack.entries.some(r => ['queued', 'working'].includes(r.generation.status))) {
      await new Promise(resolve => setTimeout(resolve, 5000));
      for (const row of pack.entries.filter(r => ['queued', 'working'].includes(r.generation.status))) {
        const response = await pressFetch(endpoint.replace(/\/$/, '') + '/v1/chronicles/' + row.generation.jobId, {headers:{authorization:`Bearer ${token}`},signal:AbortSignal.timeout(20000)});
        if (!response.ok) throw new Error(`Press polling failed (${response.status}); use --resume --generate.`);
        row.generation = await response.json();
      }
      await writePack(pack, out);
      console.log(JSON.stringify({ready:pack.entries.filter(r=>r.generation.status==='ready').length,total:pack.entries.length}));
    }
  }
  await writePack(pack, out); console.log(`Wrote ${pack.entries.length} preserved accounts and preview to ${out}`);
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) main().catch(e => { console.error(e.message); process.exitCode = 1; });

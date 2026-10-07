import { createSettlementWorld, validateSettlementSnapshot } from './engine.js';
import { createChronicleArchive, flushChronicles } from './archive.js';
import { createGenerationClient } from './generation-client.js';
import { createChronicleBook } from './book.js';
import { createSettlementScenery, surveySettlements } from './world.js';
import { forkEdition, inheritedArchive, importPack } from './editions.js';
import { createPressAuth, createPressDialog } from './auth.js';
import { chartKnowsPoint } from '../map-fog.js';
import { PILOT_SITES } from './canon.js';

export function createSettlementHost({ scene, world, player, inventory, getTime, getMode, setMode, chart, openDialogue, closeDialogue, onSave, onTrack, onTour, notify = () => {} }) {
  const flag = new URLSearchParams(location.search).get('settlements') === '1';
  let enabled = flag, engine, scenery, surveying, cached = [], working = null, errorShown = false, frameClock = 0, generation, restoring = Promise.resolve(), press, recovering = false;
  const archive = createChronicleArchive(), id = () => crypto.randomUUID();
  const link = document.createElement('link'); link.rel = 'stylesheet'; link.href = new URL('./book.css', import.meta.url).href; document.head.append(link);
  const launch = document.createElement('button'); launch.className = 'settlement-launch'; launch.textContent = '❦  Settlement chronicles'; launch.type = 'button'; document.body.append(launch);
  const prompt = document.createElement('div'); prompt.className = 'settlement-prompt'; document.body.append(prompt);
  const point = siteId => scenery?.sites.find(s => s.id === siteId);
  const known = s => { const p = point(s.id); return p && chartKnowsPoint(chart().cells, p.x, p.z); };
  const history = inheritedArchive(archive, () => engine?.snapshot());
  const book = createChronicleBook({ root: document.body, communities: () => cached, worldId: () => engine?.worldId, archive: history, canView: known, refreshPage: id => generation?.refresh(id),
    onClose: () => { if (getMode() === 'settlement-book') setMode('playing'); }, onTrack: siteId => { onTrack(siteId); } });
  function openBook(siteId) { if (!enabled || !['playing', 'dialogue'].includes(getMode())) return; closeDialogue(); setMode('settlement-book'); book.open(siteId); }
  launch.onclick = () => openBook();
  function refresh() { cached = engine?.view() ?? []; }
  function reset(time = getTime()) {
    if (!enabled) return; engine = createSettlementWorld({ worldId: id(), startTime: time }); refresh(); errorShown = false;
  }
  function restore(saved, time = getTime()) {
    if (saved === undefined) { reset(time); return true; }
    if (!validateSettlementSnapshot(saved, { allowMissing: false })) return false;
    enabled = true; engine = createSettlementWorld({ saved }); refresh();
    const current = engine;
    recovering = true;
    restoring = archive.list(current.worldId).then(rows => {
      if (current !== engine || !rows.some(r => r.kind === 'daily' && r.day >= saved.day)) return;
      engine = createSettlementWorld({ saved: forkEdition(saved, id()) }); refresh(); onSave();
    }).catch(e => { errorShown = true; notify(e.message, 'CHRONICLE ARCHIVE'); }).finally(() => { recovering = false; });
    return true;
  }
  function fileAndGenerate() {
    if (!engine) return Promise.resolve();
    return working ??= performFiling().finally(() => { working = null; });
  }
  async function performFiling() {
    await restoring; const current = engine;
    try {
      const count = await flushChronicles(current, archive);
      if (current === engine && count) onSave();
      if (current === engine) {
        let changed = false;
        for (const edition of [current.worldId, ...(current.snapshot().parents ?? []).map(p => p.worldId)]) changed = await generation?.pump(edition) || changed;
        if (changed && book.isOpen) await book.refresh();
      }
    } catch (e) { if (!errorShown) { notify(`Chronicle records remain in the save: ${e.message}`, 'CHRONICLE ARCHIVE'); errorShown = true; } }
  }
  async function ensureScenery() {
    if (scenery || world.loading && !world.loading.isReady(21)) return;
    if (surveying) return surveying;
    surveying = surveySettlements(world).then(sites => { scenery = createSettlementScenery({ scene, world, sites }); })
      .catch(e => { if (!errorShown) notify(e.message, 'SETTLEMENT SURVEY'); errorShown = true; });
    return surveying;
  }
  function converse(npc) {
    const s = cached.find(s => s.residents.some(r => r.id === npc.id)); if (!s || recovering) return false;
    const r = s.residents.find(r => r.id === npc.id);
    const choices = [];
    for (const origin of cached) for (const req of origin.requests) {
      const ours = origin.id === s.id && req.residentId === npc.id;
      const delivery = req.type === 'message' && req.status === 'carried' && req.destination === s.id;
      if ((!ours && !delivery) || req.status === 'complete' || req.type === 'message' && req.status === 'carried' && !delivery) continue;
      const action = req.type === 'message' && req.status === 'open' ? 'accept' : 'complete';
      const label = req.type === 'message' ? action === 'accept' ? `Carry a message to ${cached.find(x => x.id === req.destination)?.name}` : 'Deliver the household message' : req.type === 'repair' ? `Supply ${req.quantity} oak planks for repairs` : `Give ${req.quantity} barley to the stores`;
      choices.push({ id: req.id, label: `${label}${action === 'complete' ? ` (${Math.min(req.reward, origin.stocks['copper-piece'])} copper)` : ''}`, action: () => {
        const result = engine.applyAction({ settlementId: origin.id, requestId: req.id, contactId: npc.id, action }, inventory);
        if (!result.ok) notify(result.reason, 'THE COMMON TALLY'); else { inventory.refresh(); refresh(); onSave(); }
        converse(npc);
      } });
    }
    choices.push({ id: 'settlement-chronicle', label: 'Read the community chronicle', action: () => openBook(s.id) }, { id: 'settlement-leave', label: 'Until we meet again.', action: closeDialogue });
    const line = r.trustPlayer ? 'We remember what you brought. Your help has a place in our tally.' : `I am ${r.name}, ${r.occupation}. I try to ${r.motive}.`;
    openDialogue(npc, [line, `We keep ${s.stocks.barley + s.stocks['cooked-fish']} portions in the common stores. ${s.customs.length ? s.customs.map(c => c.rule).join(' ') : 'Our households keep Feradom’s old ways, and answer to the local council.'}`], null, 'Back to the road', { choices, noWayfinding: true });
    return true;
  }
  async function tour(siteId) {
    enabled = true; if (!engine) reset();
    if (world.loading) await world.loading.ensureRegion(21);
    await ensureScenery(); const p = point(siteId); if (!p) return;
    onTour({ x: p.x, z: p.z + 4 });
  }
  const tourPanel = document.createElement('fieldset'); tourPanel.className = 'settlement-tour';
  const legend = document.createElement('legend'); legend.textContent = 'Living settlements · Feradom pilot'; tourPanel.append(legend);
  for (const site of PILOT_SITES) { const b = document.createElement('button'); b.type = 'button'; b.textContent = `Visit ${site.name}`; b.onclick = () => { void tour(site.id).catch(e => notify(e.message, 'SETTLEMENT TOUR')); }; tourPanel.append(b); }
  const pressButton = document.createElement('button'); pressButton.type = 'button'; pressButton.textContent = 'Collaborators’ press'; pressButton.onclick = () => press?.open(); tourPanel.append(pressButton);
  const importLabel = document.createElement('label'); importLabel.textContent = 'Load a settlement pack (starts its history at the current game date): ';
  const file = document.createElement('input'); file.type = 'file'; file.accept = '.json,application/json'; importLabel.append(file); tourPanel.append(importLabel);
  file.onchange = async () => {
    try {
      if (!file.files?.[0] || file.files[0].size > 64 * 1024 * 1024) throw new Error('Choose a settlement pack under 64 MiB.');
      const pack = JSON.parse(await file.files[0].text());
      // The authored pack ends at the opening of Azhora's calendar. Catch up using game time only.
      const saved = await importPack(pack, archive, id()); enabled = true; engine = createSettlementWorld({ saved }); refresh(); onSave();
      notify('The settlement pack is loaded. Its communities will catch up to your game date.', 'THE FERADOM ANNALS');
    } catch (e) { notify(e.message, 'SETTLEMENT PACK'); } finally { file.value = ''; }
  };
  const testing = document.getElementById('testing'); if (testing) (testing.querySelector('.panel') ?? testing).append(tourPanel);
  reset();
  fetch('./assets/settlement-service.json').then(r => r.ok ? r.json() : null).then(config => {
    const auth = config?.clientId ? createPressAuth({ config }) : null;
    press = createPressDialog({ config, auth });
    if (config?.apiUrl && auth) generation = createGenerationClient({ archive, baseUrl: config.apiUrl, getToken: () => auth.token() });
  }).catch(() => { press = createPressDialog({ config: null }); });
  return { restore, reset, book, tour, converse, archive: history,
    async flush() { await fileAndGenerate(); if (engine?.entries().length) await fileAndGenerate(); },
    ready: () => restoring, get enabled() { return enabled; },
    snapshot: () => enabled ? engine?.snapshot() : undefined,
    frame(time, interactive) {
      launch.hidden = !enabled || !['playing', 'dialogue'].includes(getMode()); prompt.textContent = '';
      if (!enabled || !engine || recovering) return;
      if (++frameClock % 60 === 1) {
        const result = engine.advanceTo(time); if (result.advanced) { refresh(); onSave(); }
        ensureScenery(); void fileAndGenerate();
      }
      scenery?.update(cached, player.group.position, time);
      const npc = interactive && scenery?.nearby(player.group.position); if (npc) prompt.textContent = `F · Speak with ${npc.name}, ${npc.role}`;
    },
    interact() { const npc = scenery?.nearby(player.group.position); return npc ? converse(npc) : false; },
    knownLocations() { return cached.filter(known).map(s => ({ ...point(s.id), description: s.description })); },
    status() { return { enabled, worldId: engine?.worldId, communities: cached, sites: scenery?.sites ?? [], archiveError: errorShown, pending: engine?.entries().length ?? 0 }; },
  };
}

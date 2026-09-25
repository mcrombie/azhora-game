import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { CAT, createCatQuest } from '../src/cat-quest.js';
import { createCrime, LAW } from '../src/crime.js';
import { createCrimeHost } from '../src/crime-host.js';

// Exercise the actual checkpoint boundary. The cleaned-corpse path deliberately
// emits no death event, so model-only quest tests cannot catch this regression.
const main = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
const load = main.slice(main.indexOf('function continueRoad('));
const start = load.indexOf('catQuest.restore(saved.cat');
const end = load.indexOf('refreshQuest();', start);
assert.ok(start >= 0 && end > start, 'the cat/law checkpoint boundary exists');
const restore = new Function('saved', 'catQuest', 'createCatQuest', 'crime', 'CAT', 'vastos', 'drent', 'corpseHost', 'cagneyQuest', 'cagneyHost',
  load.slice(start, end));

function fixture(stage, { downed = false, cleaned = true, alive = false } = {}) {
  const quest = createCatQuest();quest.ask();quest.accept();
  if (stage !== 'looking') quest.found();
  if (['home', 'paid', 'taught'].includes(stage)) quest.home();
  if (stage === 'paid') quest.take('purse');
  if (stage === 'taught') quest.take('lesson');
  // This reproduces a legacy checkpoint: the crime system knew the cat had
  // died, but the quest was never notified, and its optional cat field is absent.
  const cat = quest.snapshot(), law = createCrime();
  if (!alive) law.hit({ id: CAT.id, maxHp: 25, damage: 50, recoverable: downed,
    position: { ...CAT.at }, unlawful: false });
  if (cleaned && !alive) law.tick(LAW.cleanupSeconds + 1);
  const saved = { cat, crime: law.snapshot() }, events = [];
  const world = { heightAt: () => 1, waterAt: () => 0, colliders: [],
    bounds: { minX: -200, maxX: 200, minZ: -200, maxZ: 200 }, npcPositions: { [CAT.id]: { ...CAT.at } } };
  const npc = { id: CAT.id, cat: true, actor: { group: { position: { ...CAT.at, y: 1 }, visible: true } } };
  const crime = createCrimeHost({ world, npcById: new Map([[CAT.id, npc]]), inventory: {},
    combat: { state: { phase: 'peaceful', enemies: [], allies: [] } }, position: () => ({ x: 0, z: 0 }),
    onDeath: event => { events.push(event); if (event.permanent) quest.died(); } });
  const ignored = { restore() {} };
  const reload = () => restore(saved, quest, createCatQuest, crime, CAT, ignored, ignored, ignored, ignored, ignored);
  return { quest, crime, events, reload };
}

test('restoring a cleaned dead Mop ends legacy unfinished rescue quests without a new death event', () => {
  for (const stage of ['looking', 'following', 'home']) {
    const f = fixture(stage);f.reload();
    assert.equal(f.crime.health(CAT.id).status, 'dead');
    assert.equal(f.crime.health(CAT.id).cleaned, true);
    assert.equal(f.events.length, 0, 'cleanup suppresses duplicate corpse/death events');
    assert.equal(f.quest.state.stage, 'lost', stage);
    assert.equal(f.quest.take('lesson'), null);
    f.reload();assert.equal(f.quest.state.stage, 'lost', 'the old checkpoint remains safe on repeated loads');
  }
});

test('restoring a later Mop death does not revoke an already earned reward', () => {
  for (const stage of ['paid', 'taught']) {
    const f = fixture(stage);f.reload();
    assert.equal(f.quest.state.stage, stage);
    assert.equal(f.quest.state.over, true);
    assert.equal(f.quest.take('purse'), null, 'the purse cannot be paid again');
    if (stage === 'paid') assert.equal(f.quest.take('lesson')?.stage, 'taught', 'the earned later lesson is preserved');
    else assert.equal(f.quest.take('lesson'), null, 'the taught lesson cannot be earned twice');
  }
});

test('restoring a merely downed Mop keeps the rescue available through recovery', () => {
  const f = fixture('following', { downed: true });f.reload();
  assert.equal(f.crime.health(CAT.id).status, 'downed');
  assert.equal(f.quest.state.stage, 'following');
  f.crime.frame(LAW.recoverySeconds - LAW.cleanupSeconds, { playing: true });
  assert.equal(f.crime.health(CAT.id).status, 'alive');
  assert.equal(f.quest.state.stage, 'following');
  assert.equal(f.quest.home(), true);
});

test('restoring an ordinary living legacy Mop leaves quest progress intact', () => {
  const f = fixture('following', { alive: true });f.reload();
  assert.equal(f.crime.health(CAT.id).status, 'alive');
  assert.equal(f.quest.state.stage, 'following');
  assert.equal(f.quest.state.cat, undefined, 'older saves need no companion snapshot');
});

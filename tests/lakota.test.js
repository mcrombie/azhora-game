import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';
import { sourceModule } from './module-loader.js';
import { canStand } from '../src/game-state.js';
import { createSkills } from '../src/skills.js';
import { RENA } from '../src/rena.js';
import { RENA_FINDS, RENA_FIND_IDS, RENA_NEEDED, createArchaeology, validateArchaeologySnapshot } from '../src/archaeology.js';
import { WINES, WINE_IDS, createWine, validateWineSnapshot, vintnerConversation } from '../src/wine.js';
import { WINERY, WINERY_LAYOUT, WINERY_STANDS, VINTNER } from '../src/winery.js';
import { BIRD_WATCHER, LAKOTA_TOPICS, LAKOTA_ARCHAEOLOGY_PITCH, LAKOTA_WINE_PITCH, birdWatcherConversation } from '../src/birding.js';
import { SOLIS, SOLIS_ROAD } from '../src/region-world.js';

test('Tidehaven’s birder is Lakota now, with the dinosaurs, the chocolate, the machines and his doubts about the world', () => {
  assert.equal(BIRD_WATCHER.name, 'Lakota');
  const topics = Object.fromEntries(LAKOTA_TOPICS.map(topic => [topic.id, topic.lines.join(' ')]));
  assert.match(topics.dinosaurs, /[Dd]inosaurs/); assert.match(topics.dinosaurs, /birds are what is left of them/);
  assert.match(topics.chocolate, /[Cc]hocolate/);
  assert.match(topics.machines, /artificial intelligences/);
  assert.match(topics.game, /steered/);
  assert.match(LAKOTA_ARCHAEOLOGY_PITCH.join(' '), /Rena/);
  const wine = LAKOTA_WINE_PITCH.join(' ');
  assert.match(wine, /Paradise Springs/); assert.match(wine, /north-east of West Suval/); assert.match(wine, /war/);
});

test('once he has taught birding he offers archaeology and wine, and never lets the birds out of the conversation', () => {
  let opened = null;
  const context = extra => ({ birding: { met: true, hasSeen: () => false, feeder: 'hung' }, openDialogue: (npc, lines, event, action, options) => { opened = { lines, options }; },
    closeDialogue() {}, act() {}, ...extra });
  const archaeology = createArchaeology(), wine = createWine();
  birdWatcherConversation({ id: BIRD_WATCHER.id }, context({ archaeology, wine }));
  const ids = opened.options.choices.map(choice => choice.id);
  for (const id of ['learn-archaeology', 'learn-wine', 'lakota-mind', 'ask-hawk', 'birding-hints']) assert.ok(ids.includes(id), `${id} is offered`);
  opened.options.choices.find(choice => choice.id === 'lakota-mind').action();
  assert.deepEqual(opened.options.choices.map(choice => choice.id), [...LAKOTA_TOPICS.map(topic => `topic-${topic.id}`), 'topics-done']);
  // Taught, the offers go; with five finds written up, reporting is offered instead.
  archaeology.meet(); wine.learn({ recommend: true });
  for (const id of RENA_FIND_IDS.slice(0, RENA_NEEDED)) archaeology.find(id);
  birdWatcherConversation({ id: BIRD_WATCHER.id }, context({ archaeology, wine }));
  const after = opened.options.choices.map(choice => choice.id);
  assert.ok(after.includes('report-rena') && !after.includes('learn-archaeology') && !after.includes('learn-wine'));
});

test('archaeology: Lakota sends you to Rena, you write up five of his pegged places without taking anything, and report back', () => {
  const skills = createSkills(), archaeology = createArchaeology({ skills });
  assert.equal(archaeology.find('coin').ok, false, 'not before he has taught you');
  archaeology.meet();
  assert.equal(archaeology.quest, 'rena');
  assert.match(archaeology.task().detail, /ruins of Rena/);
  assert.equal(archaeology.report().ok, false, 'not with nothing written up');
  let last;
  for (const id of RENA_FIND_IDS.slice(0, RENA_NEEDED)) last = archaeology.find(id);
  assert.equal(last.ready, true);
  assert.equal(archaeology.task().stage, 'report');
  assert.equal(archaeology.find('coin').xp, 0, 'a find is worth something once');
  const report = archaeology.report();
  assert.ok(report.ok && report.xp > 0);
  assert.equal(archaeology.quest, 'reported');
  assert.equal(archaeology.task(), null);
  assert.ok(skills.level('archaeology') >= 3);
  const saved = archaeology.snapshot(), again = createArchaeology();
  assert.equal(validateArchaeologySnapshot(saved), true);
  assert.equal(again.restore(saved), true);
  assert.equal(again.foundCount(), RENA_NEEDED);
  assert.equal(validateArchaeologySnapshot({ ...saved, met: false }), false, 'no errand without the lesson');
  assert.equal(validateArchaeologySnapshot({ ...saved, found: { gold: 1 } }), false);
  assert.ok(RENA_FINDS.track.kind === 'fossil' && /three toes/.test(RENA_FINDS.track.note), 'paleontology is part of it');
});

test('wine: learned from Lakota with a warning, then Paradise Springs to visit and seven wines to taste', () => {
  const skills = createSkills(), wine = createWine({ skills });
  assert.equal(wine.taste('norton').ok, false, 'drinking is not tasting');
  wine.learn({ recommend: true });
  assert.equal(wine.quest, 'recommended');
  assert.match(wine.task().detail, /war/);
  const visit = wine.visit();
  assert.ok(visit.first && visit.xp > 0);
  assert.equal(wine.task(), null);
  for (const id of WINE_IDS) assert.ok(wine.taste(id).first);
  assert.equal(wine.taste('norton').xp, 0);
  assert.equal(wine.tastedCount(), 7);
  assert.ok(['viognier', 'petit-manseng', 'cabernet-franc', 'petit-verdot', 'norton'].every(id => WINES[id]), 'the country’s own wines');
  assert.equal(validateWineSnapshot(wine.snapshot()), true);
  assert.equal(validateWineSnapshot({ ...wine.snapshot(), tasted: { claret: 1 } }), false);
  // Found without Lakota, Livia can teach it herself.
  let opened = null, acted = [];
  const fresh = createWine();
  vintnerConversation({ id: VINTNER.id }, { wine: fresh, openDialogue: (npc, lines, e, a, options) => { opened = { lines, options }; }, closeDialogue() {}, act: action => acted.push(action) });
  assert.deepEqual(acted, ['visit-winery']);
  assert.ok(opened.options.choices.some(choice => choice.id === 'learn-wine-here'));
  assert.match(opened.lines.join(' '), /Paradise Springs/);
});

test('Paradise Springs stands in the north-east of West Suval, open ground and people where they should be, a lane to the Solis road', async () => {
  const { createWorld } = await sourceModule('../src/world.js');
  const world = createWorld(new THREE.Scene());
  const centre = WINERY.centre;
  assert.equal(world.regionAt(centre.x, centre.z)?.name, 'West Suval');
  assert.ok(centre.x > SOLIS.centre.x + 40 && centre.z < SOLIS.centre.z - 200, 'north and east of Solis');
  for (const [id, stand] of Object.entries(WINERY_STANDS)) assert.ok(canStand(stand.x, stand.z, world, .3), `${id} stands on open ground`);
  for (const row of WINERY_LAYOUT.rows) for (const b of [row.from, row.to]) {
    const x = centre.x + row.a, z = centre.z + b;
    assert.equal(world.regionAt(x, z)?.name, 'West Suval', `the vines at ${x},${z} are in West Suval`);
  }
  for (const kind of ['winery-cabin', 'winery-hall', 'winery-spring']) assert.ok(world.colliders.some(c => c.kind === kind), `${kind} is solid`);
  assert.ok(!world.colliders.some(c => c.kind === 'region-tree' && Math.hypot(c.x - centre.x, c.z - centre.z) < WINERY.radius - 2), 'no wild tree in the middle of the winery');
  const end = WINERY_LAYOUT.lane.at(-1);
  assert.ok(Math.min(...SOLIS_ROAD.map(p => Math.hypot(p.x - end.x, p.z - end.z))) < 25, 'the lane reaches the Solis road');
  assert.ok(world.roadSigns.some(sign => sign.label === WINERY.name), 'the name board stands at the lane’s end');
  // Rena's pegged places are at the ruins, on ground a person can stand beside.
  for (const id of RENA_FIND_IDS) {
    const find = RENA_FINDS[id];
    assert.ok(Math.hypot(find.x - RENA.centre.x, find.z - RENA.centre.z) < RENA.radius, `${id} is at Rena`);
    let reachable = false;
    for (let a = 0; a < 12 && !reachable; a++) reachable = canStand(find.x + Math.cos(a * .52) * 1.6, find.z + Math.sin(a * .52) * 1.6, world, .34);
    assert.ok(reachable, `${id} can be walked up to`);
  }
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { sourceModule } from './module-loader.js';
import { createInventoryState } from '../src/gameplay/inventory/inventory.js';
import { createSkills } from '../src/gameplay/skills/skills.js';
import { createCooking } from '../src/gameplay/skills/crafting/cooking.js';
import { createCampcraft } from '../src/gameplay/skills/crafting/campcraft.js';
import { createCartography } from '../src/ui/map/cartography.js';
import { createSwimming } from '../src/gameplay/movement/swimming.js';
import { createFishing } from '../src/gameplay/skills/fishing/fishing-skill.js';
import { PENINSULA_TEACHERS, PENINSULA_TUTORIAL_ANCHORS as A } from '../src/content/chapters/prologue/peninsula-tutorial.js';
const THREE = await sourceModule('../vendor/three.module.js');
const { createPeninsulaTutorialHost } = await sourceModule('../src/content/chapters/prologue/peninsula-tutorial-host.js');

function fixture({ observeEvent } = {}) {
  const scene = new THREE.Group(), player = { group: new THREE.Group() };
  player.group.position.set(A.arrival.x, 1, A.arrival.z);
  const inventory = Object.assign(createInventoryState(), { refresh() {} }), skills = createSkills();
  const cooking = createCooking({ skills, canUseFire: () => false }), fishing = createFishing({ skills });
  const cartography = createCartography({ skills }), swimming = createSwimming({ skills });
  const campcraft = createCampcraft({ inventory, canLightFire: () => false, canCook: () => false });
  const npcById = new Map([...Object.keys(PENINSULA_TEACHERS), 'merc-gotwood', 'post-landing'].map((id, i) => [id,
    { id, name: id === 'willowmere-barrett' ? 'Barrett' : id, hidden: true,
      actor: { group: new THREE.Group(), setFishing(value) { this.fishing = value; } } }]));
  let gateOpen = true, dialogue = null;
  const world = { npcPositions: Object.fromEntries([...npcById.keys()].map((id, i) => [id, { x: -100 - i * 3, z: 0 }])),
    heightAt: () => 1, training: { x: 0, z: 0 }, reindexColliders() {},
    peninsulaTutorial: { gate: { setOpen(value) { gateOpen = value; } }, fishingSpot: { id: 'peninsula-cove' } } };
  const events = [], state = { mode: 'playing', playSeconds: 0, chrisId: 'merc-gotwood', inWater: false, grounded: true, flight: false, hits: 0, dodges: 0, running: false };
  const host = createPeninsulaTutorialHost({ scene, world, player, npcById, inventory, skills, cooking, campcraft, cartography, swimming, fishing,
    combat: { state: { player: { guarding: false } } },
    openDialogue: (npc, lines, unused, action, options) => { dialogue = { npc, lines, ...options }; },
    closeDialogue: () => { dialogue = null; }, toast() {}, read: () => state, onEvent: event => { events.push(event); observeEvent?.(event); },
  });
  return { host, inventory, skills, cooking, campcraft, world, player, npcById, events, state,
    get dialogue() { return dialogue; }, get gateOpen() { return gateOpen; } };
}
function preCooking(model) {
  model.introduce('inventory'); model.noteInventoryInspected();
  model.introduce('walking'); model.practice('walking', 'walk', 4); model.practice('walking', 'arrive');
  model.introduce('running'); model.practice('running', 'run', 6); model.practice('running', 'recover', 2);
  model.introduce('combat'); model.practice('combat', 'strike', 2); model.practice('combat', 'guard', 1.5); model.practice('combat', 'dodge');
  model.introduce('cartography'); model.practice('cartography', 'open-map');
  model.introduce('swimming'); model.practice('swimming', 'swim', 4); model.practice('swimming', 'buoy'); model.practice('swimming', 'exit');
  model.introduce('fishing'); model.noteCatch({ ok: true });
}
test('The actual host opens ordinary lesson dialogue and grants each item once without requiring Fire Making', () => {
  const f = fixture(); f.host.choose('tutorial'); assert.equal(f.gateOpen, false);
  assert.equal(typeof f.host.objective, 'function'); assert.equal(f.host.objective().title, "Jojo's sandwich");
  assert.equal(f.host.conversation(f.npcById.get('harbormaster')), true);
  f.dialogue.choices.find(c => c.id === 'peninsula-inventory').action(); f.dialogue.onComplete();
  assert.equal(f.inventory.count('jojo-sandwich'), 1);
  preCooking(f.host.model); f.host.model.introduce('cooking');
  assert.equal(f.skills.taught('cooking'), true); assert.equal(f.skills.taught('fire-making'), false);
  f.inventory.add('raw-fish', 1); f.player.group.position.set(A.cookfire.x, 1, A.cookfire.z + 2);
  assert.equal(f.host.interact(), true); f.dialogue.choices.find(c => c.id === 'cook-fish').action();
  assert.equal(f.host.view().lessons.cooking.practiced, true);
  assert.equal(f.inventory.count('raw-fish'), 0); assert.equal(f.inventory.count('cooked-fish'), 1);
  assert.equal(f.skills.taught('fire-making'), false); assert.equal(f.host.view().canGraduate, true);
});
test('Tutorial stations keep living teachers visible and legacy restoration restores their original state', () => {
  const f = fixture(), before = { ...f.world.npcPositions.harbormaster }; f.host.choose('tutorial');
  assert.equal(f.npcById.get('harbormaster').hidden, false);
  assert.equal(f.npcById.get('willowmere-barrett').name, 'Bear');
  assert.equal(f.host.restore(undefined), true);
  assert.deepEqual(f.world.npcPositions.harbormaster, before); assert.equal(f.gateOpen, true);
  assert.equal(f.npcById.get('harbormaster').hidden, true);
  assert.equal(f.npcById.get('willowmere-barrett').name, 'Barrett');
});
test('Restoring a staged escape resumes its encounter and manual recovery clears it without replaying grants', () => {
  const f = fixture(); f.host.choose('tutorial'); f.host.model.introduce('inventory');
  f.host.model.boundary(A.swimTurn, { x: 90, z: 10 }, { swimming: true });
  const saved = f.host.snapshot(); f.host.restore(saved);
  assert.equal(f.events.at(-1).type, 'tutorial-boundary-encounter'); assert.equal(f.events.at(-1).resumed, true);
  f.host.recover(); assert.equal(f.host.view().boundary.encounter, null);
  assert.equal(f.inventory.count('jojo-sandwich'), 1); assert.equal(f.host.active, true);
});
test('Skipping with the real host provides chart, movement, swimming, rod and food but does not enlist', () => {
  const f = fixture(); f.host.choose('skip');
  for (const id of ['walking', 'running', 'swimming', 'cartography', 'fishing', 'cooking']) assert.equal(f.skills.taught(id), true, id);
  for (const id of ['jojo-sandwich', 'cooked-fish', 'fishing-rod', 'tutorial-letter']) assert.equal(f.inventory.count(id), 1, id);
  assert.equal(f.inventory.count('raw-fish'), 0); assert.equal(f.inventory.count('harbor-letter'), 0);
  assert.equal(f.host.enlisted, false); assert.equal(f.gateOpen, true); assert.equal(f.host.objective().title, 'Report to Tidewater Haven');
  const ottar=f.npcById.get('post-landing');ottar.actor.group.position.set(-14,1,44);
  assert.equal(f.host.objective().at,ottar.actor.group.position,'The quest follows Ottar during the harbor alarm');
});


test('Skip records exactly the first cooked meal and its normal experience, including repeat attempts and restore', () => {
  const f = fixture(); f.host.choose('skip');
  assert.equal(f.cooking.snapshot().made['cooked-fish'], 1);
  assert.equal(f.skills.snapshot().skills.cooking.xp, 10);
  const saved = f.host.snapshot(); f.host.choose('skip'); f.host.restore(saved);
  assert.equal(f.cooking.snapshot().made['cooked-fish'], 1);
  assert.equal(f.skills.snapshot().skills.cooking.xp, 10);
  assert.equal(f.inventory.count('cooked-fish'), 1);
});

test('Completed tutorial releases teachers for field lessons and return journeys, then restores their station', () => {
  const f = fixture(); f.host.choose('skip'); const glun = f.npcById.get('instructor');
  glun.woodLessonActive = true; glun.actor.group.position.set(20, 1, 20); f.world.npcPositions.instructor = { x: 25, z: 25 };
  f.host.sync(); assert.equal(glun.residentMotion, undefined); assert.equal(glun.tutorialStation, undefined);
  assert.equal(glun.actor.group.position.x, 20); assert.deepEqual(f.world.npcPositions.instructor, { x: 25, z: 25 });
  glun.woodLessonActive = false; f.state.teacherAwayIds = ['instructor']; f.host.sync();
  assert.equal(glun.actor.group.position.x, 20, 'the field lesson return route keeps ownership');
  f.state.teacherAwayIds = []; f.host.sync(); assert.equal(glun.actor.group.position.x, A.glun.x);
  assert.equal(glun.tutorialStation, true);
});


test('Synchronous skip grant listeners can render every intermediate objective', () => {
  let host; const objectives = [];
  const f = fixture({ observeEvent: () => { objectives.push(host.objective()); } }); host = f.host;
  assert.doesNotThrow(() => host.choose('skip'));
  assert.ok(objectives.length > 8); assert.ok(objectives.every(objective => objective && typeof objective.title === 'string'));
  assert.equal(objectives.at(-1).title, 'Report to Tidewater Haven');
});

test('The lesson objective follows the remaining practice action and survives Continue', () => {
  const f=fixture(); f.host.choose('tutorial'); const m=f.host.model;
  m.introduce('inventory'); assert.match(f.host.objective().detail,/Press I/); m.noteInventoryInspected();
  m.introduce('walking'); m.practice('walking','walk',2);
  assert.match(f.host.objective().detail,/2\/4 seconds/);
  m.practice('walking','walk',2); m.practice('walking','arrive'); m.introduce('running');
  assert.match(f.host.objective().detail,/Shift or Tab/); m.practice('running','run',6);
  assert.match(f.host.objective().detail,/Release Shift or Tab/); m.practice('running','recover',2);
  m.introduce('combat'); assert.match(f.host.objective().detail,/left mouse or R/);
  m.practice('combat','strike',2); assert.match(f.host.objective().detail,/hold V/);
  m.practice('combat','guard',1.5); assert.match(f.host.objective().detail,/press C/);
  const save=f.host.snapshot(); assert.ok(f.host.restore(save)); assert.match(f.host.objective().detail,/press C/);
  m.practice('combat','dodge'); assert.equal(f.host.objective().title,"Bear's chart");
});

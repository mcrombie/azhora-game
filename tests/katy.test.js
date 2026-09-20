import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';
import { sourceModule } from './module-loader.js';
import { canStand } from '../src/game-state.js';
import { KATY, KATY_STAND, KATY_SKETCH, KATY_WAITING, BATMAN_TOLD, createKaty, katyConversation, validateKatySnapshot } from '../src/katy.js';
import { WINERY, WINERY_LAYOUT, WINERY_STANDS } from '../src/winery.js';
import { INVENTORY_ITEMS, createInventoryState } from '../src/inventory.js';

const { createCharacter } = await sourceModule('../src/characters.js');

/** A dialogue box that records what was said and lets a test pick a reply. */
function talkTo(katy, inventory, visits = 0) {
  const screens = [];
  const ui = {
    openDialogue: (npc, lines, event, action, options = {}) => screens.push({ lines, action, ...options }),
    closeDialogue: () => {},
    act: id => { if (id === 'accept-batman') katy.accept(inventory); },
  };
  katyConversation({ id: KATY.id }, { katy, ...ui, visits });
  const pick = id => screens.at(-1).choices.find(choice => choice.id === id).action();
  const finish = () => screens.at(-1).onComplete?.();
  return { screens, pick, finish };
}

test('Katy watches the birds, asks after Batman, and gives the traveler her drawing when they say they will look', () => {
  const katy = createKaty(), inventory = createInventoryState();
  const first = talkTo(katy, inventory);
  assert.match(first.screens[0].lines[0], /kingfisher/, 'she is watching a bird when you find her');
  assert.match(first.screens[0].lines.at(-1), /Have you seen Batman\?/);
  assert.equal(katy.stage, 'met');
  first.pick('who-is-batman');
  const told = first.screens.at(-1).lines.join(' ');
  // A beast, not a man in a costume: fur, a bat's head, ears, and wings that are his arms.
  assert.match(told, /A beast/);
  assert.match(told, /[Ff]urred/);
  assert.match(told, /the arms are the wings/);
  assert.match(told, /not a monster/);
  assert.match(told, /the ones who hurt people/);
  first.pick('accept-batman');
  first.finish();
  assert.equal(katy.stage, 'looking');
  assert.equal(inventory.count(KATY_SKETCH), 1, 'the traveler carries her drawing');
  assert.equal(katy.accept(inventory), false, 'and only one');
  // While the traveler looks, she has something new each time they come back.
  const heard = [0, 1, 2, 3].map(visits => talkTo(katy, inventory, visits).screens[0].lines[0]);
  assert.deepEqual(heard, [...KATY_WAITING]);
});

test('turned down, she asks again the next time', () => {
  const katy = createKaty();
  talkTo(katy, createInventoryState());
  const again = talkTo(katy, createInventoryState());
  assert.match(again.screens[0].lines[0], /Have you thought about it/);
  assert.ok(again.screens[0].choices.some(choice => choice.id === 'accept-batman'));
});

test('her drawing is a quest item, and the search is saved', () => {
  const sketch = INVENTORY_ITEMS[KATY_SKETCH];
  assert.equal(sketch.type, 'Quest item');
  assert.match(sketch.brief, /HE IS NOT A MONSTER/);
  const katy = createKaty();
  katy.meet(); katy.accept(createInventoryState());
  const restored = createKaty();
  assert.equal(restored.restore(katy.snapshot()), true);
  assert.equal(restored.stage, 'looking');
  for (const bad of [null, [], { version: 2, stage: 'looking' }, { version: 1, stage: 'found' }]) assert.equal(validateKatySnapshot(bad), false);
  assert.equal(validateKatySnapshot(undefined), true, 'a save from before Katy is fine');
  // The road checkpoint keeps it: tests/road-checkpoint.test.js.
});

test('Katy has straight blonde hair, a bat-winged cape, a bat on a cord and a spyglass at her eye', () => {
  const actor = createCharacter({ role: KATY.modelRole, tunic: KATY.color, skin: KATY.skin });
  for (const name of ['Katy’s long straight hair', 'Katy’s bat-winged cape', 'Katy’s bat pendant', 'Katy’s spyglass']) assert.ok(actor.group.getObjectByName(name), `she has ${name}`);
  // The spyglass rides on her head, so it is at her eye whichever way she turns it.
  assert.equal(actor.group.getObjectByName('Katy’s spyglass').parent.name, 'Head');
  // Blonde: somewhere on her head is a pale gold (the batched hair is vertex-coloured).
  const head = actor.group.getObjectByName('Head'), gold = new THREE.Color(0xead38e);
  let blonde = false;
  head.traverse(object => {
    const colours = object.isMesh ? object.geometry.attributes.color : null;
    if (colours) for (let i = 0; i < colours.count && !blonde; i++) blonde = Math.abs(colours.getX(i) - gold.r) < .03 && Math.abs(colours.getY(i) - gold.g) < .03 && Math.abs(colours.getZ(i) - gold.b) < .03;
    else if (object.isMesh && object.material.color?.getHex() === 0xead38e) blonde = true;
  });
  assert.ok(blonde, 'her hair is blonde');
  for (let t = 0; t < 3; t += 1 / 30) actor.animate(t, 0, true, {});
});

test('Katy stands at the winery by the spring pool, looking out over it, with room around her', async () => {
  const { createWorld } = await sourceModule('../src/world.js');
  const world = createWorld(new THREE.Scene());
  assert.ok(canStand(KATY_STAND.x, KATY_STAND.z, world, .45), 'she has footing');
  assert.equal(world.regionAt(KATY_STAND.x, KATY_STAND.z)?.name, 'West Suval');
  assert.ok(Math.hypot(KATY_STAND.x - WINERY.centre.x, KATY_STAND.z - WINERY.centre.z) < WINERY.radius, 'at Vaervelm Caelazh');
  for (const stand of Object.values(WINERY_STANDS)) assert.ok(Math.hypot(stand.x - KATY_STAND.x, stand.z - KATY_STAND.z) > 4, 'clear of Livia and Nico');
  const pool = WINERY_LAYOUT.spring.pool, toPool = Math.atan2(pool.x - KATY_STAND.x, pool.z - KATY_STAND.z);
  assert.ok(Math.abs(Math.atan2(Math.sin(toPool - KATY_STAND.yaw), Math.cos(toPool - KATY_STAND.yaw))) < Math.PI / 4, 'she faces the pool');
  assert.equal(world.npcPositions[KATY.id], undefined, 'the host, not the world, puts her there');
  assert.ok(BATMAN_TOLD.length >= 3);
});

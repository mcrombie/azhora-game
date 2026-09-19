import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';
import { sourceModule } from './module-loader.js';
import { canStand } from '../src/game-state.js';
import { TROY, TROY_STAND, HONEYCOMB, COMB_PRICE, TROY_LINES, createBeekeeper, troyConversation, validateBeekeeperSnapshot } from '../src/beekeeper.js';
import { INVENTORY_ITEMS, createInventoryState } from '../src/inventory.js';

const { createCharacter } = await sourceModule('../src/characters.js');

/** A dialogue box that records what he says and lets a test pick a reply. */
function talkTo(troy, { coppers = 0, visits = 0, onComb = () => {} } = {}) {
  const screens = [];
  troyConversation({ id: TROY.id }, {
    troy, coppers, visits,
    openDialogue: (npc, lines, event, action, options = {}) => screens.push({ lines, ...options }),
    closeDialogue: () => {},
    act: id => { if (id === 'take-honeycomb') onComb(); },
  });
  return { screens, pick: id => screens.at(-1).choices.find(choice => choice.id === id)?.action(),
    has: id => screens.at(-1).choices.some(choice => choice.id === id) };
}

test('Troy greets whoever comes up the path and gives the first comb away', () => {
  const troy = createBeekeeper(), inventory = createInventoryState();
  const first = talkTo(troy, { onComb: () => troy.takeComb({ give: () => inventory.add(HONEYCOMB, 1) }) });
  assert.match(first.screens[0].lines[0], /Somebody on the path/);
  assert.match(first.screens[0].lines.join(' '), /Troy/);
  assert.equal(troy.met, true);
  assert.equal(troy.price(), 0, 'the first is a gift');
  assert.equal(first.screens[0].choices[0].label, 'Take the comb');
  first.pick('take-honeycomb');
  assert.equal(inventory.count(HONEYCOMB), 1);
  assert.equal(troy.combs, 1);
  assert.equal(troy.price(), COMB_PRICE, 'after that he asks for the next skep');
});

test('after the gift a comb costs coppers, and he does not offer one the traveler cannot pay for', () => {
  const troy = createBeekeeper(), inventory = createInventoryState();
  troy.meet(); troy.takeComb({ give: () => inventory.add(HONEYCOMB, 1) });
  const flush = talkTo(troy, { coppers: 9 });
  assert.match(flush.screens[0].lines[0], /A comb is 2 copper/);
  assert.equal(flush.has('take-honeycomb'), true);
  const broke = talkTo(troy, { coppers: 1 });
  assert.match(broke.screens[0].lines[0], /you are short/);
  assert.equal(broke.has('take-honeycomb'), false, 'nothing to click that would fail');
  assert.equal(broke.has('ask-bees'), true, 'he will still talk about the bees');
  // The purse is only spent when a comb is actually handed over.
  let spent = 0;
  const refused = troy.takeComb({ purse: n => { spent += n; return true; }, give: () => false });
  assert.equal(refused.ok, false); assert.equal(refused.refund, COMB_PRICE); assert.equal(spent, COMB_PRICE);
  assert.equal(troy.combs, 1, 'and no comb was counted');
  const poor = troy.takeComb({ purse: () => false });
  assert.equal(poor.ok, false); assert.match(poor.reason, /2 copper/);
});

test('he has something new to say about the bees each time, and the satchel knows honeycomb', () => {
  const troy = createBeekeeper();
  troy.meet();
  const heard = TROY_LINES.map((_, visits) => { const talk = talkTo(troy, { visits }); talk.pick('ask-bees'); return talk.screens.at(-1).lines[0]; });
  assert.deepEqual(heard, [...TROY_LINES]);
  assert.equal(INVENTORY_ITEMS[HONEYCOMB].type, 'Food');
});

test('the combs he has cut are saved, and nonsense is refused', () => {
  const troy = createBeekeeper();
  troy.meet(); troy.takeComb(); troy.takeComb({ purse: () => true });
  const restored = createBeekeeper();
  assert.equal(restored.restore(troy.snapshot()), true);
  assert.equal(restored.combs, 2); assert.equal(restored.met, true);
  for (const bad of [null, [], { version: 2, met: true, combs: 0 }, { version: 1, met: 'yes', combs: 0 }, { version: 1, met: true, combs: -1 }])
    assert.equal(validateBeekeeperSnapshot(bad), false);
  assert.equal(validateBeekeeperSnapshot(undefined), true, 'a save from before Troy is fine');
});

test('Troy is a curly red-haired, red-bearded man in a bee hat with a smoker in his hand', () => {
  const actor = createCharacter({ role: TROY.modelRole, tunic: TROY.color, skin: TROY.skin });
  for (const name of ['Troy’s bee hat', 'Troy’s bee smoker']) assert.ok(actor.group.getObjectByName(name), `he has ${name}`);
  const head = actor.group.getObjectByName('Head'), ginger = new THREE.Color(0xb4441c);
  let red = 0;
  head.traverse(object => {
    const colours = object.isMesh ? object.geometry.attributes.color : null;
    if (!colours) return;
    for (let i = 0; i < colours.count; i++)
      if (Math.abs(colours.getX(i) - ginger.r) < .03 && Math.abs(colours.getY(i) - ginger.g) < .03 && Math.abs(colours.getZ(i) - ginger.b) < .03) red++;
  });
  assert.ok(red > 0, 'his hair and beard are red');
  for (let t = 0; t < 3; t += 1 / 30) actor.animate(t, 0, true, {});
});

test('Troy stands at the Bee Fold, clear of the skeps and on his own ground', async () => {
  const { createWorld } = await sourceModule('../src/world.js');
  const world = createWorld(new THREE.Scene());
  assert.ok(canStand(TROY_STAND.x, TROY_STAND.z, world, .45), 'he has footing');
  assert.equal(world.regionAt(TROY_STAND.x, TROY_STAND.z)?.name, 'Drent');
  const fold = world.forestPlaces.find(place => place.id === 'bee-fold');
  assert.ok(fold, 'the Bee Fold is a place on the chart');
  const gap = Math.hypot(TROY_STAND.x - fold.x, TROY_STAND.z - fold.z);
  assert.ok(gap > 1.5 && gap < 6, `he stands at the fold, not in it (${gap.toFixed(1)} m)`);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';
import { sourceModule } from './module-loader.js';
import { canStand } from '../src/game-state.js';
import { SOLIS } from '../src/region-world.js';
import { SOLIS_BUILDINGS, SOLIS_ENCLOSURES } from '../src/west-suval.js';
import { ATTIC_WINES, ATTIC_WINE_IDS, ATTIC_BOTTLES } from '../src/attic-wines.js';
import { WINE_ATTIC, ATTIC_STANDS, ATTIC_FOOT, ATTIC_HEAD, JUAN, MIRITH, MIRITH_LIFE, MIRITH_SCARY, JUAN_WELCOME, atticOffers,
  createWineAttic, juanConversation, mirithConversation, validateWineAtticSnapshot } from '../src/wine-attic.js';
import { WINE_IDS, createWine, validateWineSnapshot } from '../src/wine.js';
import { createSkills } from '../src/skills.js';
import { INVENTORY_ITEMS, ICON_KINDS } from '../src/inventory.js';
import { FOODS } from '../src/consumables.js';

const { createWorld } = await sourceModule('../src/world.js');
const { SIGN_LABELS } = await sourceModule('../src/signs.js');
const world = createWorld(new THREE.Scene());
const P = (a, b) => ({ x: SOLIS.centre.x + a, z: SOLIS.centre.z + b });
const talker = () => {
  const log = { opened: null, acted: [] };
  return { log, context: { openDialogue: (npc, lines, event, close, options) => { log.opened = { lines, options }; }, closeDialogue() {}, act: action => log.acted.push(action) } };
};
const ids = log => log.opened.options.choices.map(choice => choice.id);

test('Tharganhom is the Wine Attic in the Suval tongue, on the main street of Solis', () => {
  assert.equal(WINE_ATTIC.name, 'Tharganhom');
  assert.equal(WINE_ATTIC.meaning, 'The Wine Attic');
  assert.match(WINE_ATTIC.gloss, /thar.*gan.*hom/);
  assert.ok(SOLIS_BUILDINGS.some(entry => entry.kind === 'wine-attic' && entry.name === 'Tharganhom'));
  assert.ok(SOLIS_ENCLOSURES.some(enclosure => enclosure.id === 'tharganhom'), 'the autopilot knows the way in is the stair');
  assert.ok(SIGN_LABELS.includes('Tharganhom'));
  assert.equal(world.regionAt(ATTIC_FOOT.x, ATTIC_FOOT.z)?.name, 'West Suval');
});

test('the shelves hold nothing from West Suval: eight wines from the peninsula, Amod, Ascarth, West Pyros and Bouén', () => {
  assert.equal(ATTIC_WINE_IDS.length, 8);
  for (const id of ATTIC_WINE_IDS) {
    const wine = ATTIC_WINES[id];
    assert.doesNotMatch(wine.from, /West Suval|Solis|Vaervelm/, `${wine.name} comes from outside West Suval`);
    assert.ok(!WINE_IDS.includes(id), `${id} is not one of Livia’s`);
    assert.ok(wine.note && wine.pitch && wine.price > 0 && wine.xp > 0);
    const item = INVENTORY_ITEMS[wine.item];
    assert.equal(item.type, 'Food'); assert.equal(item.useVerb, 'Drink');
    assert.equal(FOODS[wine.item].healing, wine.healing);
    assert.ok(ICON_KINDS.includes(item.icon));
    assert.equal(ATTIC_BOTTLES[wine.item], id);
  }
  const places = ATTIC_WINE_IDS.map(id => ATTIC_WINES[id].from).join(' ');
  for (const place of ['Enebreum', 'Imlamdris', 'Amod', 'Ascarth', 'West Pyros', 'Bouén']) assert.match(places, new RegExp(place));
});

test('up the stair from the street to the attic floor, and nobody through the walls', () => {
  const { stair: S, lift } = WINE_ATTIC, mid = (S.b0 + S.b1) / 2;
  const floor = world.heightAt(ATTIC_HEAD.x, ATTIC_HEAD.z), street = world.heightAt(ATTIC_FOOT.x, ATTIC_FOOT.z);
  assert.ok(Math.abs(floor - street - lift) < .4, `the attic is a storey up (${(floor - street).toFixed(2)} m)`);
  let last = -Infinity;
  for (let a = S.a0 - 1; a <= WINE_ATTIC.a0 + 2; a += .25) {
    const p = P(a, mid), y = world.heightAt(p.x, p.z);
    assert.ok(y >= last - .01, `the stair never drops (${a.toFixed(2)})`);
    assert.ok(canStand(p.x, p.z, world, .3), `the way up is open at a = ${a.toFixed(2)}`);
    last = y;
  }
  // From the stair head across the floor to both of them.
  for (const [id, stand] of Object.entries(ATTIC_STANDS)) {
    assert.ok(canStand(stand.x, stand.z, world, .3), `${id} has room`);
    assert.ok(Math.abs(world.heightAt(stand.x, stand.z) - floor) < .01, `${id} stands on the attic floor`);
    for (let t = 0; t <= 1; t += .05) {
      const x = ATTIC_HEAD.x + (stand.x - ATTIC_HEAD.x) * t, z = ATTIC_HEAD.z + (stand.z - ATTIC_HEAD.z) * t;
      assert.ok(canStand(x, z, world, .3), `the floor is clear from the stair head to ${id}`);
    }
  }
  // The ground floor is walled, and the stair can only be climbed from its foot.
  for (const [a, b] of [[WINE_ATTIC.a0 + .05, -15.5], [WINE_ATTIC.a1 - .1, -17], [12, WINE_ATTIC.b0 + .1], [12, WINE_ATTIC.b1 - .1], [5, S.b1 + .08], [5, S.b0 - .08]]) {
    const p = P(a, b);
    assert.equal(canStand(p.x, p.z, world, .3), false, `a wall or rail at ${a}, ${b}`);
  }
  for (const kind of ['wine-attic', 'wine-attic-shelf', 'wine-attic-counter', 'wine-attic-barrel']) assert.ok(world.colliders.some(c => c.kind === kind), `${kind} is solid`);
});

test('Juan welcomes you, teaches tasting if you need it, pours eight wines and sells every bottle', () => {
  const skills = createSkills(), wine = createWine({ skills }), attic = createWineAttic();
  const { log, context } = talker();
  juanConversation({ id: JUAN.id }, { ...context, attic, wine, purse: 10, items: INVENTORY_ITEMS });
  assert.deepEqual(log.acted, ['attic-welcome']);
  assert.deepEqual(log.opened.lines, [...JUAN_WELCOME]);
  assert.match(JUAN_WELCOME.join(' '), /nothing on these shelves is from West Suval/);
  assert.ok(ids(log).includes('attic-learn-wine') && !ids(log).includes('attic-tasting'), 'a lesson first, if you have none');
  attic.welcome(); wine.learn();
  juanConversation({ id: JUAN.id }, { ...context, attic, wine, purse: 10, items: INVENTORY_ITEMS });
  assert.ok(ids(log).includes('attic-tasting'));
  log.opened.options.choices.find(choice => choice.id === 'attic-tasting').action();
  assert.deepEqual(ids(log).filter(id => id.startsWith('attic-taste-')), ATTIC_WINE_IDS.map(id => `attic-taste-${id}`));
  // The shop: ten copper buys the cheaper bottles, not the Dulannol.
  const offers = atticOffers({ purse: 10, items: INVENTORY_ITEMS });
  assert.equal(offers.length, 8);
  assert.equal(offers.find(offer => offer.id === 'dulannol').enabled, false);
  assert.equal(offers.find(offer => offer.id === 'ostel-white').enabled, true);
  assert.match(offers[0].label, /Bottle of Enbraleth · 12 copper/);
  // Tasting at the attic teaches the Wine skill, and the notes are saved.
  const first = wine.taste('enbraleth');
  assert.ok(first.ok && first.first && first.xp === ATTIC_WINES.enbraleth.xp);
  assert.equal(wine.view().total, WINE_IDS.length + ATTIC_WINE_IDS.length);
  assert.equal(validateWineSnapshot(wine.snapshot()), true);
  assert.equal(validateWineSnapshot({ ...wine.snapshot(), tasted: { 'wine-enbraleth': 1 } }), false);
});

test('Mirith says almost nothing, until you ask what she is reading', () => {
  const attic = createWineAttic();
  const { log, context } = talker();
  const talk = () => mirithConversation({ id: MIRITH.id }, { ...context, attic, wine: null });
  talk();
  assert.ok(log.opened.lines.join(' ').length < 40, 'quiet');
  assert.ok(!ids(log).includes('mirith-life') && !ids(log).includes('mirith-scary'), 'no stories yet');
  assert.equal(attic.hear('scary', 'cooper').ok, false);
  log.opened.options.choices.find(choice => choice.id === 'mirith-reading').action();
  assert.match(log.opened.lines.join(' '), /Stories/);
  log.opened.options.choices.find(choice => choice.id === 'mirith-hear-one').action();
  assert.ok(log.acted.includes('mirith-warm'));
  attic.warmUp();
  talk();
  assert.ok(ids(log).includes('mirith-life') && ids(log).includes('mirith-scary'));
  log.opened.options.choices.find(choice => choice.id === 'mirith-scary').action();
  assert.deepEqual(ids(log).filter(id => id.startsWith('mirith-scary-') && id !== 'mirith-scary-done'), MIRITH_SCARY.map(entry => `mirith-scary-${entry.id}`));
  assert.equal(MIRITH_LIFE.length, 4); assert.equal(MIRITH_SCARY.length, 4);
  for (const entry of [...MIRITH_LIFE, ...MIRITH_SCARY]) assert.ok(entry.lines.length >= 3, `${entry.id} is a story, not a line`);
  const heard = attic.hear('scary', 'cooper');
  assert.ok(heard.ok && heard.first);
  assert.equal(attic.hear('scary', 'cooper').first, false);
  attic.hear('life', 'fog');
  const saved = attic.snapshot(), again = createWineAttic();
  assert.equal(validateWineAtticSnapshot(saved), true);
  assert.equal(again.restore(saved), true);
  assert.ok(again.warm && again.heard('scary', 'cooper') && again.heard('life', 'fog'));
  assert.equal(validateWineAtticSnapshot({ ...saved, warm: false }), false, 'no stories heard from a Mirith who never talked');
  assert.equal(validateWineAtticSnapshot({ ...saved, scary: ['ghost'] }), false);
});

test('Juan is enormous and Mirith is small, and neither wears a hat', async () => {
  const { createCharacter } = await sourceModule('../src/characters.js');
  const height = actor => new THREE.Box3().setFromObject(actor.group).getSize(new THREE.Vector3()).y;
  const juan = createCharacter({ role: 'wine-seller', tunic: JUAN.color, skin: JUAN.skin }), mirith = createCharacter({ role: 'wine-clerk', tunic: MIRITH.color, skin: MIRITH.skin });
  const ordinary = createCharacter({ role: 'commons-miller' });
  assert.ok(height(juan) > height(ordinary) * 1.08, 'Juan towers');
  assert.ok(height(mirith) < height(ordinary) * .97, 'Mirith is small');
  assert.ok(mirith.group.getObjectByName('Mirith’s book'), 'and she has her book');
});

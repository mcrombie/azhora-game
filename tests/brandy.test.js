import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';
import { sourceModule } from './module-loader.js';
import { canStand } from '../src/game-state.js';
import { INVENTORY_ITEMS, ICON_KINDS } from '../src/inventory.js';
import { BRANDY, BRANDY_YARD, BRANDY_STAND, BRANDY_SIGN, RIBBON_ITEM, YARD_LAYOUT, yardPoint, yardColliders,
  createBrandy, brandyConversation, validateBrandySnapshot } from '../src/brandy.js';

const { createWorld } = await sourceModule('../src/world.js');
const { SIGN_LABELS } = await sourceModule('../src/signs.js');
const world = createWorld(new THREE.Scene());
const talker = () => {
  const log = { opened: null, acted: [] };
  return { log, context: { openDialogue: (npc, lines, event, close, options) => { log.opened = { lines, options }; }, closeDialogue() {}, act: action => log.acted.push(action) } };
};
const ids = log => (log.opened.options?.choices ?? []).map(c => c.id);

test('Brandy’s dye yard is in Tidehaven, on open ground, clear of everyone and of Saltwind Lookout', () => {
  assert.equal(world.regionAt(BRANDY_YARD.x, BRANDY_YARD.z)?.name, 'Drent');
  assert.ok(canStand(BRANDY_STAND.x, BRANDY_STAND.z, world, .3), 'she has room to stand');
  for (const [id, home] of Object.entries(world.npcPositions)) if (id !== BRANDY.id) assert.ok(Math.hypot(home.x - BRANDY_YARD.x, home.z - BRANDY_YARD.z) > 9, `clear of ${id}`);
  for (const site of Object.values(world.storySites ?? {})) if (Number.isFinite(site?.x)) assert.ok(Math.hypot(site.x - BRANDY_YARD.x, site.z - BRANDY_YARD.z) > 9, `clear of ${site.name ?? site.id}`);
  // Up from the lane to her, between the vats and the lines.
  const lane = yardPoint(.4, 6);
  for (let t = 0; t <= 1; t += .05) assert.ok(canStand(lane.x + (BRANDY_STAND.x - lane.x) * t, lane.z + (BRANDY_STAND.z - lane.z) * t, world, .3), 'the way in is open');
  for (const kind of ['brandy-vat', 'brandy-post', 'brandy-bench']) assert.ok(world.colliders.some(c => c.kind === kind), `${kind} is solid`);
  assert.equal(yardColliders().length, YARD_LAYOUT.vats.length + 4 + YARD_LAYOUT.boards.length * 2 + 2);
  assert.ok(world.roadSigns.some(sign => sign.label === BRANDY_SIGN) && SIGN_LABELS.includes(BRANDY_SIGN), 'her sign stands at the lane');
});

test('in her own words: Eeyore, charismatic, and the brightest colours in Drent; the ribbon, once', () => {
  const brandy = createBrandy(), { log, context } = talker();
  const talk = () => brandyConversation({ id: BRANDY.id }, { ...context, brandy, random: () => .1 });
  talk();
  assert.deepEqual(log.acted, ['brandy-meet']);
  assert.match(log.opened.lines.join(' '), /You’ll probably leave. But it’s nice/);
  for (const id of ['brandy-how', 'brandy-colours', 'brandy-boards', 'brandy-loved', 'brandy-looks', 'brandy-ribbon']) assert.ok(ids(log).includes(id), id);
  log.opened.options.choices.find(c => c.id === 'brandy-boards').action();
  assert.match(log.opened.lines.join(' '), /leopard, but rainbow/); assert.match(log.opened.lines.join(' '), /dolphin, pink, jumping a rainbow/);
  brandy.meet(); assert.ok(brandy.giveRibbon().ok); assert.equal(brandy.giveRibbon().ok, false, 'once');
  talk();
  assert.ok(!ids(log).includes('brandy-ribbon'));
  assert.equal(INVENTORY_ITEMS[RIBBON_ITEM].type, 'Quest item'); assert.ok(ICON_KINDS.includes(INVENTORY_ITEMS[RIBBON_ITEM].icon));
  const saved = brandy.snapshot(), again = createBrandy();
  assert.equal(validateBrandySnapshot(saved), true);
  assert.ok(again.restore(saved) && again.ribbon);
  assert.equal(validateBrandySnapshot({ version: 1, met: false, ribbon: true, visits: 0 }), false, 'no ribbon from a stranger');
});

test('she looks like herself: an ordinary figure in rainbow and leopard, no hat', async () => {
  const { createCharacter } = await sourceModule('../src/characters.js');
  const size = actor => new THREE.Box3().setFromObject(actor.group).getSize(new THREE.Vector3());
  const brandy = createCharacter({ role: BRANDY.modelRole, tunic: BRANDY.color, skin: BRANDY.skin }), lysa = createCharacter({ role: 'acorn-cook' });
  assert.ok(Math.abs(size(brandy).y - size(lysa).y) < .25, 'ordinary height');
  let colours = new Set();
  brandy.group.traverse(o => { if (o.isMesh && o.geometry.attributes.color) for (let i = 0; i < o.geometry.attributes.color.count; i += 7) colours.add(o.geometry.attributes.color.getX(i).toFixed(2) + o.geometry.attributes.color.getY(i).toFixed(2) + o.geometry.attributes.color.getZ(i).toFixed(2)); });
  assert.ok(colours.size > 20, 'a great many colours');
});

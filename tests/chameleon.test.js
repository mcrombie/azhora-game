import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import * as THREE from '../vendor/three.module.js';
import { sourceModule } from './module-loader.js';
import { canStand } from '../src/game-state.js';
import { regions, regionAt, isOpenCountry, MAIN_ROAD, SUVAL_ROAD, SOLIS_ROAD } from '../src/region-world.js';
import { ATTIC_BOTTLES } from '../src/attic-wines.js';
import {
  ED, CHAMELEON_SPOTS, CHAMELEON_SPOT_IDS, CHAMELEON_GIFTS, carryingForEd, chameleonSpotAt,
  createChameleon, chameleonConversation, validateChameleonSnapshot,
} from '../src/chameleon.js';

const source = name => readFileSync(fileURLToPath(new URL(`../src/${name}`, import.meta.url)), 'utf8');
const talker = () => {
  const log = { opened: null, acted: [] };
  return { log, context: { openDialogue: (npc, lines, event, close, options) => { log.opened = { lines, options }; }, closeDialogue() {}, act: action => log.acted.push(action) } };
};
const ids = log => (log.opened.options?.choices ?? []).map(choice => choice.id);

let world = null;
const built = async () => (world ??= (async () => {
  const { createWorld } = await sourceModule('../src/world.js');
  return createWorld(new THREE.Scene());
})());

const inPolygon = (points, x, z) => {
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const a = points[i], b = points[j];
    if ((a.z > z) !== (b.z > z) && x < (b.x - a.x) * (z - a.z) / (b.z - a.z) + a.x) inside = !inside;
  }
  return inside;
};

test('every one of his spots is somewhere a chameleon can be: dry ground, off the road, in its own country', async () => {
  const w = await built();
  assert.equal(CHAMELEON_SPOTS.length, 16, 'one per region, and two in open country');
  assert.equal(new Set(CHAMELEON_SPOT_IDS).size, CHAMELEON_SPOTS.length, 'no two spots share an id');
  const roads = [...(w.paths ?? []), MAIN_ROAD, SUVAL_ROAD, SOLIS_ROAD].filter(Boolean);
  const onLand = (x, z) => (w.mapLands ?? []).some(land => inPolygon(land.points ?? [], x, z));
  const inWater = (x, z) => !onLand(x, z) && (w.mapWaters ?? []).some(water => water.kind === 'circle'
    ? Math.hypot(x - water.x, z - water.z) < water.radius : inPolygon(water.points ?? [], x, z));
  for (const spot of CHAMELEON_SPOTS) {
    assert.ok(canStand(spot.x, spot.z, w, .34), `${spot.id} is ground that will hold him`);
    assert.ok(!inWater(spot.x, spot.z), `${spot.id} is not in the water`);
    const here = regionAt(spot.x, spot.z);
    const label = isOpenCountry(here) ? 'Open country' : here?.name;
    assert.equal(label, spot.region, `${spot.id} says it is in ${spot.region} and is in ${label}`);
    let nearest = Infinity;
    for (const path of roads) for (const point of path) nearest = Math.min(nearest, Math.hypot(point.x - spot.x, point.z - spot.z));
    assert.ok(nearest > 20, `${spot.id} is ${nearest.toFixed(0)} m off the road, which is on it`);
    assert.ok(spot.name && spot.note.length > 40, `${spot.id} has somewhere to be and something to be doing`);
  }
  // Every built region has one, and open country has two.
  for (const region of regions) assert.ok(CHAMELEON_SPOTS.some(spot => spot.region === region.name), `nowhere in ${region.name}`);
  assert.equal(CHAMELEON_SPOTS.filter(spot => spot.region === 'Open country').length, 2,
    'a creature that belongs nowhere in particular turns up where the atlas gives out');
});

test('his day is drawn once from the seed: the same walk every time, a different one next game', () => {
  const walk = (seed, steps = 10) => Array.from({ length: steps }, (_, i) => chameleonSpotAt(seed, i).id);
  assert.deepEqual(walk(7), walk(7), 'the same seed is the same evening');
  assert.notDeepEqual(walk(7), walk(8), 'and the next game is a different one');
  for (const seed of [0, 1, 7, 42, 1e6]) {
    const path = walk(seed, 40);
    for (let i = 1; i < path.length; i++) assert.notEqual(path[i], path[i - 1], `seed ${seed} sends him where he already is`);
  }
  // A plain multiply used to leave neighbouring seeds starting in the same place; this one does not.
  const firsts = new Set();
  for (let seed = 0; seed < 300; seed++) firsts.add(chameleonSpotAt(seed, 0).id);
  assert.equal(firsts.size, CHAMELEON_SPOTS.length, `only ${firsts.size} of the spots are ever a first spot`);
  // A seed nobody set still puts him somewhere.
  for (const bad of [undefined, NaN, null]) assert.ok(CHAMELEON_SPOT_IDS.includes(chameleonSpotAt(bad, 3).id), String(bad));
});

test('he goes when his time is up, and when anybody empty-handed walks into his reach', () => {
  const heard = [], ed = createChameleon({ seed: 3, onEvent: event => heard.push(event) });
  const at = () => ed.spot;
  const near = (gap, carrying = false) => ({ x: at().x + gap, z: at().z, carrying });
  assert.deepEqual(ed.update(1, near(ED.spook + 5)), [], 'a traveler across the field is nothing to him');
  const gone = ed.update(1, near(ED.spook - 1));
  assert.equal(gone.length, 1);
  assert.equal(gone[0].reason, 'approached');
  assert.equal(heard.at(-1).type, 'poof');
  assert.notEqual(gone[0].from.id, gone[0].to.id);
  // A bottle in your hand and he stays exactly where he is, however close you get.
  const before = at().id;
  assert.deepEqual(ed.update(1, near(0.5, true)), [], 'he does not run from somebody bearing wine');
  assert.equal(at().id, before);
  // His time runs out even with nobody there.
  assert.deepEqual(ed.update(ED.stay + 1, null).map(event => event.reason), ['wandered']);
  // But not while somebody is standing in front of him holding something out.
  const held = createChameleon({ seed: 4 });
  assert.deepEqual(held.update(ED.stay + 1, { x: held.spot.x, z: held.spot.z, carrying: true }), []);
  // A frame with no length turns nothing.
  assert.deepEqual(ed.update(0, near(0)), []);
  assert.deepEqual(ed.update(NaN, near(0)), []);
  // And nobody has ever caught him.
  const grabbed = ed.grab();
  assert.equal(grabbed.reason, 'grabbed');
  assert.notEqual(grabbed.from.id, grabbed.to.id);
});

test('what buys a conversation: wine, and a short list of other things worth having', () => {
  const ed = createChameleon({ seed: 1 });
  for (const bottle of Object.keys(ATTIC_BOTTLES)) assert.ok(CHAMELEON_GIFTS.includes(bottle), `${bottle} is worth having`);
  const bag = new Set(['forest-stick']);
  assert.deepEqual(carryingForEd({ has: id => bag.has(id) }), [], 'a stick is not a gift');
  bag.add('honeycomb');
  assert.deepEqual(carryingForEd({ has: id => bag.has(id) }), ['honeycomb']);
  assert.deepEqual(carryingForEd(null), []);
  assert.equal(ed.give('forest-stick').ok, false);
  const given = ed.give('honeycomb');
  assert.deepEqual([given.ok, given.first, given.gifts, given.wine], [true, true, 1, false]);
  assert.equal(ed.give(Object.keys(ATTIC_BOTTLES)[0]).wine, true, 'a bottle is a bottle');
  assert.equal(ed.gifts, 2);
});

test('he is asked about the other one, and says so', () => {
  const ed = createChameleon({ seed: 5 }), { log, context } = talker();
  const bag = new Set();
  const talk = () => chameleonConversation({ id: ED.id }, { ...context, chameleon: ed, inventory: { has: id => bag.has(id) } });
  assert.equal(chameleonConversation({ id: 'somebody-else' }, { ...context, chameleon: ed }), false);
  talk();
  assert.deepEqual(log.acted, ['ed-chameleon-meet'], 'meeting him is met once');
  assert.match(log.opened.lines.join(' '), /Not that one/);
  const first = ids(log);
  assert.ok(first.includes('ed-chameleon-who') && first.includes('ed-chameleon-grab') && !first.includes('ed-chameleon-give'));
  log.opened.options.choices.find(choice => choice.id === 'ed-chameleon-who').action();
  const answer = log.opened.lines.join(' ');
  assert.match(answer, /Puck/, 'he names the goblin');
  assert.match(answer, /not related/);
  assert.match(answer, /purple smoke/, 'and they have met, once, badly');
  // Carrying something opens the one choice that keeps him there.
  ed.meet();
  bag.add('honeycomb');
  talk();
  assert.ok(ids(log).includes('ed-chameleon-give'));
  log.opened.options.choices.find(choice => choice.id === 'ed-chameleon-give').action();
  assert.ok(ids(log).includes('ed-chameleon-give-honeycomb'));
});

test('where he is survives the road, and nonsense is refused', () => {
  const ed = createChameleon({ seed: 11 });
  ed.update(ED.stay + 1, null); ed.meet(); ed.give('honeycomb');
  const saved = ed.snapshot();
  assert.equal(validateChameleonSnapshot(saved), true);
  assert.equal(validateChameleonSnapshot(undefined), true, 'older saves have never met him');
  assert.equal(validateChameleonSnapshot(undefined, { allowMissing: false }), false);
  const copy = createChameleon();
  assert.equal(copy.restore(saved), true);
  assert.deepEqual([copy.seed, copy.step, copy.met, copy.gifts, copy.spot.id], [11, ed.step, true, 1, ed.spot.id]);
  assert.deepEqual(copy.snapshot(), saved);
  for (const bad of [null, [], { ...saved, version: 2 }, { ...saved, spot: 'the moon' }, { ...saved, seed: 'seven' },
    { ...saved, step: -1 }, { ...saved, clock: -1 }, { ...saved, met: 'yes' }, { ...saved, gifts: 1.5 }])
    assert.equal(validateChameleonSnapshot(bad), false, JSON.stringify(bad));
  const refused = createChameleon({ seed: 2 });
  refused.meet();
  assert.equal(refused.restore({ ...saved, spot: 'the moon' }), false);
  assert.equal(refused.met, false, 'a refused restore leaves him a stranger again');
});

test('the split: Puck keeps Solis and Ed keeps the body, and the game knows which is which', () => {
  const main = source('main.js'), goblin = source('wine-goblin.js'), chameleon = source('chameleon.js');
  // The chameleon's model is Ed's, and Puck is built from the game's own goblin.
  assert.match(main, /createPuckView\(scene,/, 'Puck is a goblin');
  assert.match(source('wine-goblin-view.js'), /createGoblin\(\{ wine: true \}\)/);
  assert.match(source('characters.js'), /export function createGoblin\(\{ variant = 0, wine = false \} = \{\}\)/);
  assert.match(main, /createEdView\(scene,/, 'and Ed keeps the chameleon');
  // Both turn back after a conversation instead of keeping the traveler's bearing (src/bodies.js).
  assert.match(main, /lendFacing\(\{facing:puckFacing,lent:puckLent/, 'Puck turns back');
  assert.match(main, /lendFacing\(\{facing:edFacing,lent:edLent/, 'and so does Ed');
  assert.doesNotMatch(main, /edView\.group\.rotation\.y=Math\.atan2\(pp\.x/, 'the old facing that never came back is gone');
  // A road saved before the split still loads: its `ed` key was always Puck's half of him.
  assert.match(main, /puck\.restore\(saved\.puck\?\?saved\.ed\?\?createPuck\(\)\.snapshot\(\)\)/);
  assert.match(source('road-checkpoint.js'), /validatePuckSnapshot\(data\.puck \?\? data\.ed\)/);
  assert.match(main, /puck:puck\.snapshot\(\),chameleon:chameleon\.snapshot\(\)/, 'and both are saved from now on');
  // Nothing of Solis followed Ed, and nothing of the chameleon stayed with Puck.
  // The header says what went where; nothing below it is Solis's. He has no quest, no secretary,
  // no cask and no city to hold together.
  const body = chameleon.slice(chameleon.indexOf('export const CHAMELEON_VERSION'));
  assert.doesNotMatch(body, /Prime Minister|Tancredi|SEA_WALL|SECRETARY|KEEP_REWARD|SOBER/, 'Solis is not Ed’s any more');
  // The only chameleon left in Puck's file is the header saying where the other half of him went.
  const puckBody = goblin.slice(goblin.indexOf('export const PUCK'));
  assert.doesNotMatch(puckBody, /chameleon/i, 'and Puck is a goblin throughout');
  assert.match(goblin, /Cup-Bearer to the Goblin/);
  // The hook the user asked for, and no scene: they have met, once, and that is all anybody says.
  assert.match(chameleon, /We have met\. Once\./);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { sourceModule } from './module-loader.js';
import {
  createDividing, validateDividing, talethDividingChoices, countryRestored, DIVIDING_ID, DIVIDING_COUNTRIES, DIVIDING_STAGES, DIVIDING_TITLE,
  DIVIDING_XP, DIVIDING_RECIPES, DIVIDING_FOODS, DIVIDING_ITEMS, DIVIDING_PLACES, FORK_STEW, FORK_STEW_HEALING, FORK_STEW_RECIPES,
  DIVIDING_CHARGE, DIVIDING_WAITING, DIVIDING_POURING, DIVIDING_SESHAT, DIVIDING_NEPRI, DIVIDING_FEAST, DIVIDING_AFTER,
} from '../src/content/quests/lizeem-farmlands/dividing.js';
import { createLizeemFarmlands, validateLizeemFarmlands, LIZEEM_FARMLANDS, NORTH_BEDS } from '../src/content/quests/lizeem-farmlands/lizeem-farmlands.js';
import { TALETH, TALETH_DIVIDING, TALETH_LATER, TALETH_AFTER_DIVIDING, talethConversation } from '../src/content/quests/lizeem-farmlands/taleth.js';
import { MINORA_START } from '../src/app/startup/minora-opening.js';
import { MENORA, MENORA_BUILDINGS, inMenora, menoraGround, menoraRiverClearance } from '../src/content/regions/minora-frontier/menora-city.js';
import { RECIPES } from '../src/gameplay/skills/crafting/cooking.js';
import { INVENTORY_ITEMS, ICON_KINDS } from '../src/gameplay/inventory/inventory.js';
import { FOODS } from '../src/gameplay/inventory/consumables.js';

/**
 * The Dividing (src/content/quests/lizeem-farmlands/dividing.js; Build 5 of the Farmlands of the Lizeem, 6 October 2026): ready only when the four
 * countries are restored, the feast held once, fork stew that heals 60, and its save nested in the hub's.
 */
const [B1, B2, B3] = NORTH_BEDS;
const rye = (grade = 'plain') => ({ crop: 'bridge-rye', item: 'bridge-rye', quantity: 2, grade });
const beans = () => ({ crop: 'field-beans', item: 'field-beans', quantity: 2, grade: 'plain' });

/** An arc as a country's module makes it, held at a stage the test sets. */
function fakeArc(stage = 'arrive') {
  let state = { stage };
  return { stage: () => state.stage, set: next => { state.stage = next; }, trackableView: () => null, markerIds: () => [], journal: () => [],
    snapshot: () => ({ ...state }), restore(data) { state = data === undefined ? { stage } : { ...data }; return true; },
    validate: data => data === undefined || typeof data?.stage === 'string' };
}
/** The hub with Caricas walked to its end the way a player would, and the other three countries' arcs registered. */
function river({ caricas = true, others = 'done', accept = true } = {}) {
  const gains = [];
  const skills = { known: () => true, learn: () => ({ ok: true }), gain: (id, n) => { gains.push([id, n]); return { ok: true, levelled: false }; } };
  const hub = createLizeemFarmlands({ skills, magic: { learn: id => ({ ok: true, id }) }, farming: { onHarvest: () => () => {} } });
  if (accept) { hub.offer(); hub.accept(); }
  if (accept && caricas) {
    hub.lease(); hub.harvest(B1, rye()); hub.harvest(B2, rye()); hub.harvest(B3, beans()); hub.harvest(B1, beans());
    hub.harvest(B3, rye('good')); hub.settleClaim('hand'); hub.harvest(B2, rye('fine')); hub.sealTart(); hub.deliver({ grade: 'fine' });
  }
  const arcs = Object.fromEntries(['nethereum', 'nesdor', 'ovesos'].map(id => [id, fakeArc(others)]));
  for (const [id, arc] of Object.entries(arcs)) hub.registerArc(id, arc);
  return { hub, arcs, skills, gains };
}
/** A satchel, a kitchen and a dialogue box that record what they are asked for. */
function table({ stew = 0, kitchen = true } = {}) {
  const owned = new Map(stew ? [[FORK_STEW, stew]] : []);
  const inventory = { count: id => owned.get(id) ?? 0, add: (id, n = 1) => { owned.set(id, (owned.get(id) ?? 0) + n); return true; },
    remove: (id, n = 1) => { const had = owned.get(id) ?? 0; if (had < n) return false; owned.set(id, had - n); return true; } };
  const known = new Set();
  const cooking = { knows: id => known.has(id), learn: id => (kitchen ? (known.add(id), { ok: true }) : { ok: false, reason: 'Learn Fire Making from Lee Anne first.' }) };
  const shown = [], toasts = [], calls = [];
  const context = { openDialogue: (npc, lines, event, action, options = {}) => shown.push({ npc, lines, action, options }), closeDialogue: () => calls.push('close'),
    notify: (text, title) => toasts.push([title, text]), onChange: () => calls.push('save'), onComplete: () => calls.push('back') };
  const last = () => shown.at(-1);
  return { inventory, cooking, known, owned, shown, toasts, calls, context, last };
}

test('the Dividing is ready only under Taleth’s charge with all four countries restored, and is the hub’s fifth arc', () => {
  const t = table();
  const cases = [
    [river({ accept: false, caricas: false }), false, 'no charge'],
    [river({ caricas: false }), false, 'Caricas not restored'],
    [river({ others: 'carry' }), false, 'three countries still walking'],
  ];
  for (const [{ hub }, ready, label] of cases) {
    const dividing = createDividing({ farmlands: hub, inventory: t.inventory, cooking: t.cooking });
    assert.equal(dividing.ready(), ready, label);
    assert.equal(dividing.trackableView(), null, `${label}: no card`);
    assert.deepEqual(dividing.markerIds(), []);
    assert.deepEqual(talethDividingChoices(TALETH, { dividing, ...t.context }), [], `${label}: Taleth’s topic stays locked`);
    assert.equal(dividing.propsVisible(), false);
  }
  // One country short is still short, whichever it is.
  const { hub, arcs } = river();
  const dividing = createDividing({ farmlands: hub, inventory: t.inventory, cooking: t.cooking });
  for (const id of ['nethereum', 'nesdor', 'ovesos']) { arcs[id].set('carry'); assert.equal(dividing.ready(), false, `${id} not restored`); arcs[id].set('done'); }
  assert.equal(dividing.ready(), true);
  assert.deepEqual(dividing.restored(), [...DIVIDING_COUNTRIES]);
  assert.equal(countryRestored(hub, 'caricas'), true);
  assert.equal(countryRestored({ arc: () => { throw new Error('broken arc'); } }, 'ovesos'), false, 'an arc that cannot say is not restored');
  // Registered with the hub, it shows its own card and marks Taleth while it waits.
  assert.equal(hub.registerArc(DIVIDING_ID, dividing), true);
  const card = hub.trackableViews().find(view => view.id === `${LIZEEM_FARMLANDS.id}-${DIVIDING_ID}`);
  assert.ok(card, 'the hub carries its card');
  assert.equal(card.title, 'The Farmlands of the Lizeem: the Dividing');
  assert.deepEqual(card.destinationIds, [TALETH.id]);
  assert.ok(hub.markerIds().includes(TALETH.id));
  assert.equal(dividing.propsVisible(), true, 'the trestle and the bowls are out from the day the river is whole');
});

test('Taleth tells it once and teaches fork stew both ways; served, the stew holds the Dividing once, and the journal names the walker', () => {
  const { hub, gains } = river(), t = table();
  const skills = { known: () => true, gain: (id, n) => { gains.push([id, n]); return { ok: true, levelled: false }; } };
  const events = [];
  const dividing = createDividing({ farmlands: hub, inventory: t.inventory, cooking: t.cooking, skills, onEvent: event => events.push(event) });
  hub.registerArc(DIVIDING_ID, dividing);
  const choose = () => talethDividingChoices(TALETH, { dividing, ...t.context });
  // First asked: he tells what it wants and teaches the stew.
  let [topic] = choose();
  assert.deepEqual([topic.id, topic.label], [TALETH_DIVIDING.id, 'The Dividing']);
  topic.action();
  assert.equal(dividing.stage(), 'told');
  assert.deepEqual(t.last().lines, [...DIVIDING_CHARGE]);
  assert.deepEqual([...t.known].sort(), [...FORK_STEW_RECIPES].sort(), 'both stews are known');
  assert.equal(t.toasts.at(-1)[0], 'TALETH TAUGHT YOU A RECIPE');
  assert.deepEqual(t.calls, ['save']);
  t.last().options.onComplete();
  assert.equal(t.calls.at(-1), 'back', 'back to his topics');
  // Asked again with no stew: he waits.
  [topic] = choose();
  topic.action();
  assert.deepEqual(t.last().lines, [...DIVIDING_WAITING]);
  assert.equal(dividing.stage(), 'told');
  // With the stew in the satchel: the feast.
  t.owned.set(FORK_STEW, 1);
  [topic] = choose();
  assert.equal(topic.label, 'Serve the fork stew and hold the Dividing');
  const seshat = { id: 'lizeem-seshat', name: 'Seshat' }, nepri = { id: 'lizeem-nepri', name: 'Nepri' };
  const before = t.shown.length;
  talethDividingChoices(TALETH, { dividing, ...t.context, speaker: id => ({ 'lizeem-seshat': seshat, 'lizeem-nepri': nepri })[id] })[0].action();
  assert.equal(dividing.stage(), 'done');
  assert.equal(t.inventory.count(FORK_STEW), 0, 'the stew is served');
  assert.deepEqual(gains.filter(([id]) => id === 'farming').map(([, n]) => n).slice(-1), [DIVIDING_XP]);
  assert.deepEqual(events.map(event => event.type), ['dividing-told', 'dividing-held']);
  // The scene plays in four voices: Taleth pours, Seshat and Nepri speak, Taleth serves and closes.
  const voices = () => t.shown.slice(before).map(entry => [entry.npc.id, entry.lines]);
  assert.deepEqual(voices(), [[TALETH.id, [...DIVIDING_POURING]]]);
  t.last().options.onComplete(); t.last().options.onComplete(); t.last().options.onComplete();
  assert.deepEqual(voices(), [[TALETH.id, [...DIVIDING_POURING]], [seshat.id, [DIVIDING_SESHAT]], [nepri.id, [DIVIDING_NEPRI]], [TALETH.id, [...DIVIDING_FEAST]]]);
  t.last().options.onComplete();
  assert.equal(t.calls.at(-1), 'back');
  assert.equal(t.toasts.at(-1)[0], 'THE DIVIDING');
  // The journal, through the hub.
  const entry = hub.journal().find(item => item.id === `${LIZEEM_FARMLANDS.id}-${DIVIDING_ID}`);
  assert.ok(entry, 'the hub writes it');
  assert.deepEqual([entry.title, entry.status, entry.type], [DIVIDING_TITLE, 'complete', 'skill']);
  assert.ok(entry.rewards.includes(DIVIDING_TITLE));
  assert.equal(hub.trackableViews().some(view => view.id === `${LIZEEM_FARMLANDS.id}-${DIVIDING_ID}`), false, 'its card leaves the tracker');
  assert.equal(hub.markerIds().includes(TALETH.id), false);
  // Once only.
  t.owned.set(FORK_STEW, 1);
  assert.equal(dividing.hold().ok, false);
  assert.equal(t.inventory.count(FORK_STEW), 1, 'a second stew is not taken');
  const [after] = choose();
  assert.deepEqual([after.id, after.label], [TALETH_DIVIDING.id, 'About the Dividing']);
  after.action();
  assert.deepEqual(t.last().lines, [...DIVIDING_AFTER]);
});

test('in Taleth’s own topics: locked until ready, open when ready, and the later charges come after it once held', () => {
  const { hub, arcs } = river({ others: 'carry' }), t = table({ stew: 1 });
  const dividing = createDividing({ farmlands: hub, inventory: t.inventory, cooking: t.cooking });
  const hubContext = () => ({ ...t.context, farmlands: hub, magic: { known: () => true, learn: () => ({ ok: true }) }, playerId: 'rollo', dividing,
    extraChoices: (who, back) => talethDividingChoices(who, { dividing, ...t.context, onComplete: back }) });
  const topics = () => { talethConversation(TALETH, hubContext()); return t.last().options.choices; };
  let dividingChoice = topics().find(choice => choice.id === TALETH_DIVIDING.id);
  assert.deepEqual([dividingChoice.disabled, dividingChoice.reason], [true, TALETH_DIVIDING.reason], 'locked while a country is still walking');
  for (const id of ['nethereum', 'nesdor', 'ovesos']) arcs[id].set('done');
  dividingChoice = topics().find(choice => choice.id === TALETH_DIVIDING.id);
  assert.equal(dividingChoice.disabled, undefined, 'open');
  assert.equal(topics().filter(choice => choice.id === TALETH_DIVIDING.id).length, 1);
  dividingChoice.action(); // told
  topics().find(choice => choice.id === TALETH_DIVIDING.id).action(); // the feast, the stew already in hand
  assert.equal(dividing.held(), true);
  const later = topics().filter(choice => TALETH_LATER.some(entry => entry.id === choice.id));
  assert.deepEqual(later.map(choice => [choice.disabled, choice.reason]), TALETH_LATER.map(() => [true, TALETH_AFTER_DIVIDING]));
  assert.equal(TALETH_AFTER_DIVIDING, 'After the Dividing: not yet written.');
  // Without the people to speak, Seshat and Nepri are told in Taleth's box.
  const solo = river(), s = table({ stew: 1 });
  const lone = createDividing({ farmlands: solo.hub, inventory: s.inventory, cooking: s.cooking });
  lone.tell();
  talethDividingChoices(TALETH, { dividing: lone, ...s.context })[0].action();
  assert.equal(s.shown.length, 1, 'one box, Taleth’s, the whole scene in it');
  assert.equal(s.shown[0].npc.id, TALETH.id);
  assert.ok(s.shown[0].lines.some(line => line.startsWith('Seshat') && line.includes(DIVIDING_SESHAT)));
  assert.ok(s.shown[0].lines.some(line => line.startsWith('Nepri') && line.includes(DIVIDING_NEPRI)));
  assert.deepEqual(s.shown[0].lines.slice(-DIVIDING_FEAST.length), [...DIVIDING_FEAST]);
  s.last().options.onComplete();
  assert.equal(s.calls.at(-1), 'back');
});

test('a kitchen that cannot take the stew hears it and keeps nothing, and the Dividing waits for a stew', () => {
  const { hub } = river(), t = table({ kitchen: false });
  const dividing = createDividing({ farmlands: hub, inventory: t.inventory, cooking: t.cooking });
  talethDividingChoices(TALETH, { dividing, ...t.context })[0].action();
  assert.equal(dividing.stage(), 'told', 'he has told it');
  assert.equal(t.known.size, 0);
  assert.deepEqual(t.toasts.at(-1), ['TALETH TRIED TO TEACH YOU A RECIPE', 'Learn Fire Making from Lee Anne first.']);
  assert.deepEqual(dividing.hold(), { ok: false, reason: 'You have no fork stew to serve.' });
  assert.equal(dividing.held(), false);
});

test('the four countries are named as the bowls are filled, the river agreed to be divided, and nobody exclaims', () => {
  const pouring = DIVIDING_POURING.join(' ');
  let at = -1;
  for (const name of ['Caricas', 'Nethereum', 'Nesdor', 'Ovesos']) { const next = pouring.indexOf(name, at + 1); assert.ok(next > at, `${name} in order`); at = next; }
  assert.match(pouring, /did not submit to Minora\. It agreed to be divided/);
  assert.match(DIVIDING_FEAST.join(' '), /Walker of the Measure/);
  assert.match(DIVIDING_FEAST.at(-1), /not written it yet/, 'and the later charges are not yet written');
  for (const line of [...DIVIDING_CHARGE, ...DIVIDING_WAITING, ...DIVIDING_POURING, DIVIDING_SESHAT, DIVIDING_NEPRI, ...DIVIDING_FEAST, ...DIVIDING_AFTER])
    assert.ok(!line.includes('!'), line);
});

test('fork stew is two recipes and one stew, from both banks, and heals 60', () => {
  assert.deepEqual([...FORK_STEW_RECIPES], ['fork-stew', 'fork-stew-oveth']);
  assert.deepEqual({ ...DIVIDING_RECIPES['fork-stew'].needs }, { 'bridge-rye': 1, 'flood-oats': 1, floodwheat: 1, 'weir-fish': 1 });
  assert.deepEqual({ ...DIVIDING_RECIPES['fork-stew-oveth'].needs }, { 'bridge-rye': 1, 'flood-oats': 1, 'hard-wheat': 1, 'weir-fish': 1 });
  const shape = Object.keys(RECIPES['bean-pottage']).filter(key => !['fine'].includes(key)).sort();
  for (const id of FORK_STEW_RECIPES) {
    const entry = DIVIDING_RECIPES[id];
    assert.equal(entry.id, id); assert.equal(entry.makes, FORK_STEW);
    assert.deepEqual(Object.keys(entry).sort(), shape, `${id} is in the kitchen’s shape`);
    assert.ok(Object.isFrozen(entry) && Object.isFrozen(entry.needs));
    assert.ok(!Object.hasOwn(RECIPES, id) || RECIPES[id] === entry, `${id} is nobody else’s recipe`);
  }
  assert.equal(FORK_STEW_HEALING, 60);
  assert.equal(DIVIDING_FOODS[FORK_STEW].healing, 60);
  assert.match(DIVIDING_FOODS[FORK_STEW].missing, /^You have no .+\. .+\.$/);
  const item = DIVIDING_ITEMS[FORK_STEW];
  assert.deepEqual([item.type, item.stackable], ['Food', true]);
  assert.ok(ICON_KINDS.includes(item.icon));
  assert.match(item.brief, /Restores up to 60 health/); assert.match(item.description, /Restores up to 60 health/);
  assert.ok(!Object.hasOwn(INVENTORY_ITEMS, FORK_STEW) || INVENTORY_ITEMS[FORK_STEW] === item, 'the satchel has no other fork stew');
  // The larder lists it as this module gives it, or not yet: never at another healing.
  assert.ok(!Object.hasOwn(FOODS, FORK_STEW) || FOODS[FORK_STEW].healing === FORK_STEW_HEALING);
});

test('its save is its own, nested in the hub’s, and validated both ways', () => {
  assert.deepEqual([...DIVIDING_STAGES], ['waiting', 'told', 'done']);
  for (const good of [undefined, { version: 1, stage: 'waiting' }, { version: 1, stage: 'told' }, { version: 1, stage: 'done' }]) assert.equal(validateDividing(good), true);
  for (const bad of [null, [], 'done', { version: 2, stage: 'done' }, { version: 1, stage: 'feasting' }, { version: 1 }, { version: 1, stage: 'done', held: true }])
    assert.equal(validateDividing(bad), false, JSON.stringify(bad));
  const { hub } = river(), t = table({ stew: 1 });
  const dividing = createDividing({ farmlands: hub, inventory: t.inventory, cooking: t.cooking });
  hub.registerArc(DIVIDING_ID, dividing);
  dividing.tell(); dividing.hold();
  const saved = hub.snapshot();
  assert.deepEqual(saved.arcs.dividing, { version: 1, stage: 'done' });
  assert.equal(validateLizeemFarmlands(saved), true);
  assert.equal(validateLizeemFarmlands({ ...saved, arcs: { ...saved.arcs, dividing: { version: 1, stage: 'feasting' } } }), false, 'the hub asks the Dividing');
  // Restored into a fresh game: held, and the props stay out.
  const again = river(), next = createDividing({ farmlands: again.hub });
  again.hub.registerArc(DIVIDING_ID, next);
  assert.equal(again.hub.restore(JSON.parse(JSON.stringify(saved))), true);
  assert.equal(next.held(), true);
  assert.equal(next.propsVisible(), true);
  assert.equal(next.restore({ version: 1, stage: 'nope' }), false);
  assert.equal(next.held(), true, 'a bad save changes nothing');
  assert.equal(next.restore(undefined), true);
  assert.equal(next.stage(), 'waiting');
});

test('the trestle and bowls stand on the forecourt clear of the start, Taleth and the way between them, and show and hide with their collider', async () => {
  const { trestle, bowls, guests } = DIVIDING_PLACES;
  const tower = MENORA_BUILDINGS.find(b => b.id === 'menora-sorcerers-guild');
  const foot = p => Math.hypot(Math.max(0, Math.abs(p.x - trestle.x) - trestle.width / 2), Math.max(0, Math.abs(p.z - trestle.z) - trestle.depth / 2));
  assert.ok(Math.abs(trestle.x - (-2414)) < 12.5 - trestle.width / 2 && Math.abs(trestle.z - 60) < 6.5 - trestle.depth / 2, 'on the forecourt');
  assert.ok(trestle.z - trestle.depth / 2 > tower.z + tower.depth / 2 + 1, 'a metre off the tower');
  assert.ok(foot(MINORA_START) > 4 && foot(TALETH) > 4, `clear of the start (${foot(MINORA_START).toFixed(1)} m) and Taleth (${foot(TALETH).toFixed(1)} m)`);
  for (let k = 0; k <= 20; k++) { const p = { x: MINORA_START.x + (TALETH.x - MINORA_START.x) * k / 20, z: MINORA_START.z + (TALETH.z - MINORA_START.z) * k / 20 }; assert.ok(foot(p) > 3, 'off the way to Taleth'); }
  assert.ok(inMenora(trestle.x, trestle.z) && menoraRiverClearance(trestle.x, trestle.z) > 4);
  assert.equal(bowls.length, 4);
  for (const bowl of bowls) assert.ok(Math.abs(bowl.x - trestle.x) < trestle.width / 2 - .1 && Math.abs(bowl.z - trestle.z) < trestle.depth / 2, `${bowl.id} is on the trestle`);
  for (const guest of Object.values(guests)) { assert.ok(foot(guest) > .6 && guest.z > tower.z + tower.depth / 2 + 1 && inMenora(guest.x, guest.z)); }
  // Nothing the city builds is where the trestle stands.
  const THREE = await sourceModule('../vendor/three.module.js');
  const { createMenoraScenery } = await sourceModule('../src/content/regions/minora-frontier/menora-scenery.js');
  const city = [];
  createMenoraScenery({ parent: new THREE.Group(), colliders: city, heightAt: (x, z) => menoraGround(x, z, MENORA.elevation) });
  const hits = city.filter(c => c.minY <= 23 && c.maxY >= 21.3 && (c.r !== undefined ? foot(c) < c.r + .5 : Math.abs(c.x - trestle.x) < c.hx + trestle.width / 2 + .5 && Math.abs(c.z - trestle.z) < c.hz + trestle.depth / 2 + .5));
  assert.deepEqual(hits.map(c => c.id ?? c.kind), []);
  // The props: hidden and out of the collider list until shown.
  const { createDividingScenery } = await sourceModule('../src/content/quests/lizeem-farmlands/dividing-scenery.js');
  const colliders = [], reindexed = [];
  const props = createDividingScenery({ parent: new THREE.Group(), heightAt: () => MENORA.elevation, colliders, reindex: () => reindexed.push(1) });
  assert.equal(props.root.visible, false); assert.equal(props.visible(), false); assert.equal(colliders.length, 0);
  assert.equal(props.metrics.batches, 1); assert.equal(props.metrics.bowls, 4); assert.ok(props.metrics.vertices < 4000, `${props.metrics.vertices} vertices`);
  props.show();
  assert.equal(props.root.visible, true); assert.deepEqual(colliders, [props.collider]); assert.equal(reindexed.length, 1);
  props.show();
  assert.equal(colliders.length, 1, 'shown twice is shown once'); assert.equal(reindexed.length, 1);
  props.hide();
  assert.equal(props.root.visible, false); assert.equal(colliders.length, 0); assert.equal(reindexed.length, 2);
  assert.equal(props.set(true), true);
  assert.ok(props.collider.maxY > MENORA.elevation + trestle.height);
});

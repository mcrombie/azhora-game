import test from 'node:test';
import assert from 'node:assert/strict';
import { CROPS, createFarming, farmRow, farmsteadRows, validateFarmingSnapshot } from '../src/farming.js';
import { NESDOR_FARM_ROWS, NESDOR_HAZEL_TREE_IDS, nesdorStrip } from '../src/nesdor-farm.js';
import { BOLVERK_SECONDS, FLOODWHEAT, LONG_STRIP_LOCKED, MATCH_MARGIN, NESDOR_FOODS, NESDOR_ITEMS, NESDOR_RECIPES, REAP_SECONDS_PER_BED,
  alongStrip, bedOpen, createReaping, describeNesdorBed, lockLong, longUnlocked, nesdorFit, registerNesdorFarming, stripEndNear, unlockLong } from '../src/flats-ground.js';
import { ICON_KINDS, INVENTORY_ITEMS } from '../src/inventory.js';
import { FOODS } from '../src/consumables.js';
import { RECIPES } from '../src/cooking.js';
import { SKILLS, createSkills } from '../src/skills.js';

/**
 * Right crop, right ground (docs/lizeem-farmlands-design.md 5.3; the user's design of 5 October 2026, built
 * 6 October 2026): the Nesdor strips' fit by ground and crop, the wet-strip trap, Idunn's coppice, the long
 * strip Baugi lends, a strip reaped in one act, and Bolverk's match. The farms here use the real Ninehands
 * beds. Until the long-strip test opens it, the long strip is left out of the farm (`{ long: false }`).
 */
const BENCH = nesdorStrip('nesdor-bench'), WET = nesdorStrip('nesdor-wet'), RISE = nesdorStrip('nesdor-rise'), LONG = nesdorStrip('nesdor-long');

/** A satchel that holds anything. */
function satchel(start = {}) {
  const owned = new Map(Object.entries(start));
  return { count: id => owned.get(id) ?? 0, items: () => [...owned.keys()].filter(id => owned.get(id) > 0),
    add: (id, n = 1) => { owned.set(id, (owned.get(id) ?? 0) + n); return true; },
    remove: (id, n = 1) => { if ((owned.get(id) ?? 0) < n) return false; owned.set(id, owned.get(id) - n); return true; } };
}
function farm({ level = 1, start = {}, long = false } = {}) {
  const skills = createSkills(), inventory = satchel(start), events = [];
  if (level > 1) { const saved = skills.snapshot(); saved.skills.farming = { xp: SKILLS.farming.thresholds[level - 1] }; skills.restore(saved); }
  const farming = createFarming({ skills, inventory, onEvent: event => events.push(event) });
  const registered = registerNesdorFarming(farming, { long });
  return { skills, inventory, events, farming, registered };
}
const SEED = { 'floodwheat-seed': 12, 'bridge-rye-seed': 12, 'barley-seed': 12, 'carrot-seed': 4 };

test('Nesdor joins the farm with its fit, floodwheat, the coppice and the nine Ninehands beds, and registering again changes nothing', () => {
  const { farming, registered } = farm();
  assert.equal(registered.ok, true, JSON.stringify(registered.refused));
  assert.deepEqual(farming.countries(), ['caricas', 'nesdor']);
  assert.deepEqual(farmsteadRows('ninehands').map(row => row.id), [...WET.beds, ...BENCH.beds, ...RISE.beds]);
  for (const id of [...WET.beds, ...BENCH.beds, ...RISE.beds]) assert.equal(farmRow(id).country, 'nesdor', id);
  assert.deepEqual([farmRow('nesdor-wet-2').ground, farmRow('nesdor-bench-2').ground, farmRow('nesdor-rise-2').ground], ['wet', 'bench', 'rise']);
  assert.equal(CROPS.floodwheat.level, 8); assert.equal(CROPS.floodwheat.seconds, 360); assert.equal(CROPS.floodwheat.xp, 60);
  assert.equal(CROPS.floodwheat.yield, 2); assert.equal(CROPS.floodwheat.region, 'nesdor'); assert.equal(CROPS.floodwheat.fine, 'floodwheat-fine');
  assert.deepEqual(farming.registerCrops([FLOODWHEAT]), { ok: true, added: [], refused: [] });
  const again = registerNesdorFarming(farming, { long: false });
  assert.deepEqual([again.ok, again.crops, again.rows, again.trees], [true, [], [], []], 'the same registration twice is a no-op');
  assert.equal(farming.sow('commons-row-1', 'floodwheat', 0).ok, false, 'floodwheat grows only on the Nesdor farms');
});

test('the fit is the ground’s: floodwheat the bench, rye the rise, barley either, and nothing the wet', () => {
  assert.deepEqual(['wet', 'bench', 'rise'].map(ground => nesdorFit('floodwheat', ground)), [0, 2, 1]);
  assert.deepEqual(['wet', 'bench', 'rise'].map(ground => nesdorFit('bridge-rye', ground)), [0, 1, 2]);
  assert.deepEqual(['wet', 'bench', 'rise'].map(ground => nesdorFit('barley', ground)), [0, 1, 1]);
  assert.deepEqual(['wet', 'bench', 'rise'].map(ground => nesdorFit('carrot', ground)), [0, 0, 0], 'a crop that is not the Flats’ own is helped by none of it');
  // On the real beds, judged by the farm at sowing.
  const { farming } = farm({ level: 8, start: SEED });
  const fits = {};
  for (const [strip, n] of [[WET, 0], [BENCH, 1], [RISE, 2]]) {
    fits[strip.ground] = ['floodwheat', 'bridge-rye', 'barley'].map((cropId, index) => {
      const result = farming.sow(strip.beds[index], cropId, n);
      assert.equal(result.ok, true, `${cropId} on ${strip.beds[index]}: ${result.reason}`);
      return result.fit;
    });
  }
  assert.deepEqual(fits, { wet: [0, 0, 0], bench: [2, 1, 1], rise: [1, 2, 1] });
  assert.equal(farming.rowState('nesdor-bench-1', 10).fit, 2, 'the planting keeps the fit it was sown with');
});

test('the wet-strip trap: floodwheat on the wettest strip because of its name never comes up Fine, and on the bench it does', () => {
  const { farming, inventory } = farm({ level: 8, start: SEED });
  assert.equal(farming.sow('nesdor-wet-1', 'floodwheat', 0).fit, 0);
  assert.equal(farming.sow('nesdor-bench-1', 'floodwheat', 0).fit, 2);
  for (const id of ['nesdor-wet-1', 'nesdor-bench-1']) assert.equal(farming.water(id, 10).ok, true);
  const wet = farming.harvest('nesdor-wet-1', 400), bench = farming.harvest('nesdor-bench-1', 400);
  assert.deepEqual([wet.grade, wet.produce, wet.count], ['good', 'floodwheat', 3], 'watered and in practised hands, still only Good');
  assert.deepEqual([bench.grade, bench.produce, bench.count], ['fine', 'floodwheat-fine', 3]);
  assert.deepEqual([inventory.count('floodwheat'), inventory.count('floodwheat-fine'), inventory.count('floodwheat-seed')], [3, 3, 12]);
  // Sound the Soil says so before anything is sown.
  const reading = farming.describeBed('nesdor-wet-2', 0);
  assert.match(reading.text, /Nothing sown here thrives/);
  assert.match(reading.text, /Floodwheat least of all/);
  assert.deepEqual(reading.likes, [], 'nothing does well on the wet');
  assert.match(farming.describeBed('nesdor-bench-2', 0).text, /^A drained bench: wet feet in memory, not in fact\./);
  // The staff reads what the strips are dressed with and what Baugi reads off them (settled at integration, 6 October 2026).
  assert.match(reading.text, /rushes grow between the beds, and the dock is red at the stem/);
  assert.match(farming.describeBed('nesdor-bench-2', 0).text, /silt crust is cracking, and the dock grows broad and green/);
  assert.match(farming.describeBed('nesdor-rise-2', 0).text, /among stones, and the dock small and yellowing/);
  assert.deepEqual(farming.describeBed('nesdor-bench-2', 0).likes, ['floodwheat']);
  assert.deepEqual(farming.describeBed('nesdor-rise-2', 0).likes, ['bridge-rye']);
  farming.sow('nesdor-wet-3', 'floodwheat', 500);
  assert.match(farming.describeBed('nesdor-wet-3', 501).text, /Floodwheat is in it now, and the wet has it/);
  assert.match(describeNesdorBed({ ground: 'rise', stage: 'sown', crop: 'barley', cropName: 'Barley', fit: 1 }), /Barley is in it now: it will stand, but not as it would on its own ground\.$/);
});

test('Idunn’s coppice bears hazelnuts at Farming 12, and each stool bears again ten minutes after it is picked', () => {
  const young = farm({ level: 11 });
  assert.equal(young.farming.treeState(NESDOR_HAZEL_TREE_IDS[0], 0).stage, 'fruiting');
  const refused = young.farming.pick(NESDOR_HAZEL_TREE_IDS[0], 0);
  assert.deepEqual([refused.ok, refused.reason], [false, 'This tree wants farming level 12.']);
  const { farming, inventory } = farm({ level: 12 });
  assert.equal(NESDOR_HAZEL_TREE_IDS.length, 6);
  const picked = farming.pick('nesdor-hazel-3', 100);
  assert.deepEqual([picked.ok, picked.item, picked.quantity], [true, 'hazelnuts', 1]);
  assert.equal(inventory.count('hazelnuts'), 1);
  assert.equal(farming.treeState('nesdor-hazel-3', 100).country, 'nesdor');
  assert.match(farming.pick('nesdor-hazel-3', 699).reason, /bear again in about 1 seconds/);
  assert.equal(farming.treeState('nesdor-hazel-3', 699).stage, 'picked');
  assert.equal(farming.treeState('nesdor-hazel-3', 700).stage, 'fruiting', 'six hundred seconds later');
  assert.equal(farming.pick('nesdor-hazel-3', 700).ok, true);
  assert.equal(farming.treeState('nesdor-hazel-4', 100).stage, 'fruiting', 'each stool on its own clock');
  assert.equal(picked.grade, 'plain');
  // Graded by the picker's hand (settled at integration, 6 October 2026): Fine at 16, Prize at 20, as the fine kind.
  for (const [level, grade, item] of [[15, 'plain', 'hazelnuts'], [16, 'fine', 'hazelnuts-fine'], [20, 'prize', 'hazelnuts-fine']]) {
    const hand = farm({ level }), got = hand.farming.pick('nesdor-hazel-1', 0);
    assert.deepEqual([got.ok, got.grade, got.item, hand.inventory.count(item)], [true, grade, item, 1], `Farming ${level}`);
    assert.deepEqual(hand.events.filter(event => event.type === 'tree-picked').map(event => [event.grade, event.item, event.country]), [[grade, item, 'nesdor']]);
  }
});

test('a strip is reaped in one act, its three beds together, two seconds a bed held to the end', () => {
  const { farming, inventory, events } = farm({ level: 8, start: SEED });
  const reaping = createReaping({ farming, onEvent: event => events.push(event) });
  assert.deepEqual([reaping.timeFor('nesdor-bench'), reaping.timeFor('nesdor-long'), reaping.timeFor('nowhere')], [6, 12, null]);
  assert.equal(REAP_SECONDS_PER_BED, 2);
  assert.equal(reaping.begin('nesdor-bench', 0).reason, 'Nothing on the bench strip is ripe yet.');
  for (const id of BENCH.beds) assert.equal(farming.sow(id, 'floodwheat', 0).ok, true);
  assert.equal(reaping.begin('nesdor-bench', 100).ok, false, 'floodwheat wants its six minutes');
  assert.deepEqual(reaping.begin('nesdor-bench', 400), { ok: true, strip: 'nesdor-bench', name: 'the bench strip', seconds: 6 });
  assert.equal(reaping.begin('nesdor-rise', 400).reason, 'You are reaping already.');
  assert.deepEqual(reaping.progress(403), { strip: 'nesdor-bench', elapsed: 3, seconds: 6, fraction: .5, beds: 1, done: false });
  assert.deepEqual(reaping.pose(403), { strip: 'nesdor-bench', progress: .5 });
  const early = reaping.finish(403);
  assert.deepEqual([early.ok, early.reason], [false, 'Keep going: 3 more seconds to the end of the strip.']);
  assert.ok(BENCH.beds.every(id => farming.rowState(id, 403).stage === 'ripe'), 'nothing comes in before the end of the walk');
  assert.equal(reaping.progress(406).done, true);
  const done = reaping.finish(406);
  assert.equal(done.ok, true, done.reason);
  assert.deepEqual([done.count, done.reaped, done.seconds], [3, [...BENCH.beds], 6]);
  assert.ok(BENCH.beds.every(id => farming.rowState(id, 406).stage === 'bare'), 'all three beds in one act');
  assert.deepEqual([inventory.count('floodwheat'), inventory.count('floodwheat-fine')], [6, 0], 'unwatered on the bench at level 8: Good, the ordinary kind');
  assert.equal(reaping.progress(407), null);
  assert.deepEqual(events.filter(event => event.type === 'strip-reaped').map(event => [event.strip, event.count, event.seconds]), [['nesdor-bench', 3, 6]]);
  assert.equal(events.filter(event => event.type === 'row-reaped').length, 3, 'the farm hears each bed');
  // A reap cancelled halfway leaves the crop standing.
  for (const id of RISE.beds) farming.sow(id, 'bridge-rye', 410);
  assert.equal(reaping.begin('nesdor-rise', 700).ok, true);
  assert.equal(reaping.cancel(), true);
  assert.equal(reaping.cancel(), false);
  assert.equal(reaping.finish(710).reason, 'You are not reaping.');
  assert.ok(RISE.beds.every(id => farming.rowState(id, 710).stage === 'ripe'));
  // A host that needs no walk reaps the strip outright, credited with the strip's time.
  const outright = reaping.reapStrip('nesdor-rise', 720);
  assert.deepEqual([outright.ok, outright.count, outright.seconds], [true, 3, 6]);
  assert.equal(inventory.count('bridge-rye'), 6);
});

test('the reaper walks the strip: its end posts are where a reap begins, and leaving the strip is leaving the reap', () => {
  const { farming } = farm();
  const reaping = createReaping({ farming });
  const atStart = stripEndNear({ x: BENCH.start.x + .5, z: BENCH.z });
  assert.deepEqual([atStart.id, atStart.end, atStart.open], ['nesdor-bench', 'start', true]);
  assert.equal(stripEndNear({ x: RISE.end.x - 1, z: RISE.z }).end, 'end');
  assert.equal(stripEndNear({ x: BENCH.x, z: BENCH.z - 14 }), null, 'between the strips, at no end post');
  assert.equal(alongStrip('nesdor-bench', { x: BENCH.x, z: BENCH.z + 1 }), true);
  assert.equal(alongStrip('nesdor-bench', { x: BENCH.x, z: BENCH.z + 6 }), false);
  assert.equal(alongStrip('nesdor-bench', { x: BENCH.end.x + 4, z: BENCH.z }), false);
  assert.equal(reaping.along({ x: BENCH.x, z: BENCH.z }), false, 'not reaping, so not along anything');
});

test('the reaping match is won only by a reap no slower than Bolverk’s five seconds: the walk always loses', () => {
  // Settled at integration (6 October 2026): five seconds and no margin, so a three-bed walk (six seconds) loses and
  // the Work of Nine, which takes no time at all, wins.
  assert.deepEqual([BOLVERK_SECONDS, MATCH_MARGIN], [5, 0]);
  const { farming } = farm({ level: 8, start: SEED });
  const clock = { now: 0 }, reaping = createReaping({ farming, clock: () => clock.now });
  assert.equal(reaping.match({ against: BOLVERK_SECONDS }), false, 'no reap, no match');
  const reapIn = (strip, crop, start, took) => {
    for (const id of strip.beds) farming.sow(id, crop, start - 400);
    clock.now = start; assert.equal(reaping.begin(strip.id).ok, true);
    clock.now = start + took; const result = reaping.finish();
    assert.equal(result.ok, true, result.reason);
    return result;
  };
  assert.equal(reapIn(BENCH, 'floodwheat', 1000, 6).seconds, 6);
  assert.equal(reaping.match(), false, 'six seconds against his five: the walk loses');
  assert.equal(reaping.match({ against: 7 }), true, 'six seconds against a slower man');
  assert.equal(reaping.match({ against: 0, margin: 5 }), false, 'six is more than five behind nothing');
  assert.equal(reaping.reapStrip(RISE.id, 1001, { seconds: 0 }).ok, false, 'nothing ripe on the rise yet');
  for (const id of WET.beds) farming.sow(id, 'barley', 600);
  assert.equal(reaping.reapStrip(WET.id, 1001, { seconds: 0 }).seconds, 0, 'a strip reaped in no time, as the Work of Nine reaps');
  assert.equal(reaping.match(), true, 'no time at all beats five seconds');
  // The time is from the first stroke to the last: a reaper who dawdles at the end of the strip loses.
  assert.equal(reapIn(RISE, 'bridge-rye', 2000, 12.5).seconds, 12.5);
  assert.equal(reaping.match({ against: 7, margin: 5 }), false, 'five and a half behind');
  assert.equal(reapIn(BENCH, 'barley', 3000, 12).seconds, 12);
  assert.equal(reaping.match({ against: 7, margin: 5 }), true, 'exactly within a margin given still wins');
  assert.deepEqual(reaping.lastReap(), { strip: 'nesdor-bench', seconds: 12, count: 3, at: 3012 });
});

test('the long strip stays shut until Baugi lends it at Farming 24, and is then worked like the others', () => {
  lockLong();
  const { farming } = farm({ level: 24, start: SEED });
  assert.equal(farmRow('nesdor-long-1'), null, 'left out of the farm until it is opened');
  assert.equal(validateFarmingSnapshot({ version: 2, met: false, reaped: 0, trees: {}, beds: {}, rows: { 'nesdor-long-1': { crop: 'barley', sownAt: 0 } } }), false);
  const reaping = createReaping({ farming });
  assert.equal(reaping.begin('nesdor-long', 0).reason, LONG_STRIP_LOCKED);
  assert.equal(stripEndNear(LONG.start), null, 'no end post to reap from');
  const young = unlockLong({ level: 23 });
  assert.deepEqual([young.ok, young.reason, longUnlocked(), farmRow('nesdor-long-1')], [false, LONG_STRIP_LOCKED, false, null]);
  const lent = unlockLong({ level: 24 });
  assert.deepEqual([lent.ok, lent.first, lent.added], [true, true, LONG.beds.slice()]);
  assert.equal(longUnlocked(), true);
  assert.deepEqual(farmsteadRows('ninehands-long').map(row => [row.id, row.country, row.ground]), LONG.beds.map(id => [id, 'nesdor', 'bench']));
  assert.equal(bedOpen('nesdor-long-6'), true);
  assert.equal(unlockLong().first, false, 'lending it twice is the same loan');
  // Worked like the others: six beds of floodwheat, reaped in twelve seconds.
  for (const id of LONG.beds) assert.equal(farming.sow(id, 'floodwheat', 0).fit, 2, 'the long strip is bench ground');
  assert.equal(reaping.begin('nesdor-long', 400).seconds, 12);
  const done = reaping.finish(412);
  assert.deepEqual([done.ok, done.count, done.seconds], [true, 6, 12]);
  assert.equal(reaping.match(), false, 'twelve against his five');
  // A save that has worked it validates now; shutting it again (a new game) keeps the beds but refuses them.
  assert.equal(validateFarmingSnapshot(farming.snapshot()), true);
  assert.equal(lockLong(), true);
  assert.deepEqual([bedOpen('nesdor-long-1'), bedOpen('nesdor-bench-1'), bedOpen('nowhere')], [false, true, false]);
  for (const id of LONG.beds) farming.sow(id, 'barley', 500);
  assert.equal(reaping.begin('nesdor-long', 800).reason, LONG_STRIP_LOCKED);
  assert.equal(reaping.reapStrip('nesdor-long', 800).ok, false);
  assert.equal(stripEndNear(LONG.end).open, false, 'the post is there; the strip is not his');
  // Registered by default with the rest, shut, so the farm view draws it and old saves always load.
  const fresh = farm({ long: true });
  assert.deepEqual([fresh.registered.ok, fresh.registered.rows], [true, []], 'already registered');
  assert.equal(NESDOR_FARM_ROWS.filter(row => farmRow(row.id)).length, 15);
  unlockLong();
});

test('the Nesdor goods are whole: new satchel, larder and kitchen entries that heal what they say and cook from things a traveller can hold', () => {
  for (const [id, entry] of Object.entries(NESDOR_ITEMS)) {
    assert.equal(INVENTORY_ITEMS[id], entry, `${id} is spread into the satchel as it is, and replaces nothing`);
    assert.ok(ICON_KINDS.includes(entry.icon), `${id} icon ${entry.icon}`);
    assert.ok(entry.stackable && entry.brief && entry.description && Object.isFrozen(entry), id);
  }
  for (const id of [FLOODWHEAT.item, `${FLOODWHEAT.item}-fine`, FLOODWHEAT.seed, 'hazelnuts-fine', 'ale', 'hides']) assert.ok(NESDOR_ITEMS[id], id);
  assert.equal(INVENTORY_ITEMS.hazelnuts.type, 'Food', 'the coppice gives the satchel’s own hazelnuts');
  const foods = Object.keys(NESDOR_ITEMS).filter(id => NESDOR_ITEMS[id].type === 'Food');
  assert.deepEqual(foods.sort(), Object.keys(NESDOR_FOODS).sort(), 'every Nesdor food is a satchel food, and every satchel food heals');
  assert.deepEqual(Object.fromEntries(Object.entries(NESDOR_FOODS).map(([id, entry]) => [id, entry.healing])),
    { 'white-bread': 35, 'white-bread-fine': 45, 'nut-cake': 50, 'nut-cake-fine': 50, ale: 15 });
  for (const [id, { healing, missing }] of Object.entries(NESDOR_FOODS)) {
    assert.equal(FOODS[id], NESDOR_FOODS[id], `${id} is spread into the larder as it is, and replaces nothing`);
    assert.ok(Number.isInteger(healing) && healing >= 10 && healing <= 50, id);
    assert.match(missing, /^You have no .+\. .+\.$/, id);
    assert.ok(Object.isFrozen(NESDOR_FOODS[id]), id);
    const says = new RegExp(`Restores up to ${healing} health`);
    assert.match(NESDOR_ITEMS[id].brief, says, id); assert.match(NESDOR_ITEMS[id].description, says, id);
    assert.ok(NESDOR_ITEMS[id].eatName, id);
  }
  assert.deepEqual(Object.keys(NESDOR_RECIPES), ['white-bread', 'white-bread-fine', 'nut-cake', 'nut-cake-fine']);
  assert.deepEqual({ ...NESDOR_RECIPES['white-bread'].needs }, { floodwheat: 2 });
  assert.deepEqual({ ...NESDOR_RECIPES['nut-cake'].needs }, { hazelnuts: 2, floodwheat: 1, honeycomb: 1 });
  for (const [id, entry] of Object.entries(NESDOR_RECIPES)) {
    assert.equal(RECIPES[id], entry, `${id} is spread into the kitchen as it is, and replaces nothing`);
    assert.equal(entry.id, id);
    assert.ok(Object.isFrozen(entry) && Object.isFrozen(entry.needs), id);
    assert.equal(NESDOR_ITEMS[entry.makes]?.type, 'Food', `${id} makes a food`);
    assert.match(entry.note, new RegExp(`Restores up to ${NESDOR_FOODS[entry.makes].healing} health`), id);
    for (const need of Object.keys(entry.needs)) assert.ok(NESDOR_ITEMS[need] || INVENTORY_ITEMS[need], `${id} wants ${need}, which is not a thing`);
    if (entry.fine) assert.equal(NESDOR_RECIPES[entry.fine].fineOf, id);
  }
});

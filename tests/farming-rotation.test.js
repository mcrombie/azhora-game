import test from 'node:test';
import assert from 'node:assert/strict';
import { CROPS, CROP_IDS, FARM_ROWS, FINE_ITEMS, GRADE_XP, HEART_DEFAULT, REST_SECONDS, WATERING_XP, createFarming, fitFor, foxRegards, gradeFor,
  gradePoints, growsOn, heartAfter, rotates, validateFarmingSnapshot } from '../src/farming.js';
import { CARICAS_FARMSTEADS, CARICAS_FARM_ROWS, REGIONAL_FARM_ROWS } from '../src/regional-farmland.js';
import { SKILLS, createSkills } from '../src/skills.js';
import { INVENTORY_ITEMS, createInventoryState } from '../src/inventory.js';
import { FOODS } from '../src/consumables.js';
import { farmRowConversation } from '../src/farming-conversation.js';
import { sourceModule } from './module-loader.js';

/**
 * Build 1 of the Farmlands of the Lizeem (docs/lizeem-farmlands-design.md §4, §5.1, §7.3):
 * rotation on the Caricas beds, the grade of every harvest, the fine kind of each crop, shares
 * taken at harvest, and the two farm helpers the field sorcery reads.
 */
const NORTH = CARICAS_FARMSTEADS.find(farm => farm.id === 'caricas-north-fields');
const BED = NORTH.rows[0].id, COMMONS = FARM_ROWS[0].id;
const fixture = ({ level = 1, clock } = {}) => {
  const skills = createSkills(), inventory = createInventoryState(), events = [];
  if (level > 1) { const saved = skills.snapshot(); saved.skills.farming = { xp: SKILLS.farming.thresholds[level - 1] }; skills.restore(saved); }
  const farming = createFarming({ skills, inventory, clock, onEvent: event => events.push(event) });
  for (const id of CROP_IDS) inventory.add(CROPS[id].seed, 20);
  return { skills, inventory, events, farming };
};
/** The first whole second at or after `from` when the fox is (or is not) watching this bed. */
const when = (id, from, watched = false) => { let at = Math.ceil(from); while (foxRegards(id, at) !== watched) at++; return at; };
/** Sow, optionally water, and reap one crop; returns the harvest and the moment it was reaped. */
function grow(farming, id, cropId, from, { water = true } = {}) {
  const at = when(id, from);
  assert.equal(farming.sow(id, cropId, at).ok, true, `${cropId} sown in ${id}`);
  if (water) assert.equal(farming.water(id, at).ok, true);
  const ripe = at + CROPS[cropId].seconds;
  return { harvest: farming.harvest(id, ripe), at: ripe };
}

test('the Caricas crops are sown only on the five Caricas farmsteads, and the seed benches there hand out their seed', () => {
  assert.deepEqual(['bridge-rye', 'field-beans', 'soft-fruit'].map(id => [CROPS[id].level, CROPS[id].heart, CROPS[id].seconds, CROPS[id].xp, CROPS[id].yield, CROPS[id].region]),
    [[1, 'lean', 240, 30, 2, 'caricas'], [1, 'any', 150, 26, 2, 'caricas'], [3, 'rich', 300, 40, 2, 'caricas']]);
  assert.equal(CROPS['field-beans'].restores, true, 'beans put heart back');
  assert.deepEqual(['barley', 'soft-fruit', 'carrot', 'beet', 'sunflower', 'drent-leaf'].map(id => CROPS[id].heart), ['rich', 'rich', 'any', 'any', 'any', 'any']);
  for (const id of ['sunflower', 'carrot', 'beet', 'barley', 'drent-leaf']) assert.equal(CROPS[id].region, undefined, `${id} still grows everywhere`);
  assert.equal(CARICAS_FARM_ROWS.length, 17, 'five farmsteads, seventeen beds');
  assert.ok(CARICAS_FARM_ROWS.every(row => rotates(row.id) && growsOn('bridge-rye', row.id)));
  assert.ok([COMMONS, ...REGIONAL_FARM_ROWS.filter(row => row.region !== 'Caricas').map(row => row.id)].every(id => !rotates(id) && !growsOn('bridge-rye', id)));
  const { farming, inventory } = fixture();
  assert.deepEqual(farming.sowable(COMMONS).map(kind => kind.id), ['sunflower', 'carrot', 'barley'], 'the commons is as it was');
  assert.deepEqual(farming.sowable(BED).map(kind => kind.id), ['sunflower', 'carrot', 'barley', 'bridge-rye', 'field-beans'], 'the canes wait for level 3');
  const refused = farming.sow(COMMONS, 'bridge-rye', 0);
  assert.equal(refused.ok, false); assert.match(refused.reason, /only on the Caricas farms/);
  // Stanley's bin never hands out Carican seed; a Caricas bench does, at the level it opens.
  const bare = createFarming({ skills: createSkills(), inventory: createInventoryState() });
  const fresh = () => bare.stockSeeds().added.map(entry => entry.id);
  assert.ok(!fresh().includes('bridge-rye-seed'));
  const bench = bare.stockSeeds(BED).added.map(entry => entry.id);
  assert.ok(bench.includes('bridge-rye-seed') && bench.includes('field-beans-seed') && !bench.includes('soft-fruit-seed'), bench.join(', '));
  assert.ok(inventory.count('bridge-rye-seed') > 0);
  // The field panel offers what the ground grows.
  let shown;
  const context = { farming, inventory, playSeconds: 0, openDialogue: (npc, lines, event, label, options) => { shown = { lines, ...options }; }, closeDialogue() {} };
  farmRowConversation(BED, context);
  assert.ok(shown.choices.some(choice => choice.id === 'farm-sow-bridge-rye' && !choice.disabled));
  assert.match(shown.lines[0], /same crop twice running comes up plain/);
  farmRowConversation(COMMONS, context);
  assert.ok(!shown.choices.some(choice => choice.id === 'farm-sow-bridge-rye'), 'no rye on the commons');
});

test('every crop has a fine kind in the satchel, the same sort of thing as the plain, and the eaten ones heal more', () => {
  assert.equal(FINE_ITEMS.length, CROP_IDS.length);
  for (const id of CROP_IDS) {
    const { item, fine, seed } = CROPS[id];
    for (const thing of [item, fine, seed]) assert.ok(INVENTORY_ITEMS[thing], `${thing} is a thing you can carry`);
    assert.equal(fine, `${item}-fine`);
    assert.match(INVENTORY_ITEMS[fine].name, /^Fine /);
    assert.equal(INVENTORY_ITEMS[fine].type, INVENTORY_ITEMS[item].type, `${fine} is the same sort of thing as ${item}`);
    assert.equal(Object.hasOwn(FOODS, fine), Object.hasOwn(FOODS, item), `${fine} is eaten exactly when ${item} is`);
    if (FOODS[item]) assert.ok(FOODS[fine].healing > FOODS[item].healing, `${fine} heals more`);
  }
  assert.equal(INVENTORY_ITEMS['bridge-rye-fine'].name, 'Fine bridge rye');
  assert.equal(FOODS['soft-fruit'].healing, 15, 'soft fruit heals 15');
  for (const id of ['bridge-rye', 'field-beans']) assert.equal(FOODS[id], undefined, `${id} is not eaten raw`);
});

test('a bed remembers its heart and last crop: grain and fruit draw it down, beans put it back, and a day of rest restores one', () => {
  const { farming } = fixture({ level: 3 });
  assert.deepEqual([farming.rowState(BED, 0).heart, farming.rowState(BED, 0).last], [HEART_DEFAULT, null]);
  let at = grow(farming, BED, 'field-beans', 0).at;
  assert.deepEqual([farming.rowState(BED, at).heart, farming.rowState(BED, at).last], [3, 'field-beans']);
  at = grow(farming, BED, 'barley', at).at;
  assert.equal(farming.rowState(BED, at).heart, 2, 'grain draws a step');
  at = grow(farming, BED, 'bridge-rye', at).at;
  assert.equal(farming.rowState(BED, at).heart, 1);
  at = grow(farming, BED, 'carrot', at).at;
  assert.deepEqual([farming.rowState(BED, at).heart, farming.rowState(BED, at).last], [1, 'carrot'], 'a root neither draws nor rests it');
  assert.deepEqual([heartAfter('soft-fruit', 0), heartAfter('field-beans', 3), heartAfter('bridge-rye', 2)], [0, 3, 1], 'heart stays between 0 and 3');
  // Left bare for a game day (24 minutes of play), the bed gains one; twice, two; never past 3.
  assert.equal(REST_SECONDS, 24 * 60);
  assert.equal(farming.rowState(BED, at + REST_SECONDS - 1).heart, 1);
  assert.equal(farming.rowState(BED, at + REST_SECONDS).heart, 2);
  assert.equal(farming.rowState(BED, at + 5 * REST_SECONDS).heart, 3);
  // The rest is banked when the bed is sown, and a growing bed rests no more.
  const sownAt = when(BED, at + REST_SECONDS);
  farming.sow(BED, 'carrot', sownAt);
  assert.equal(farming.rowState(BED, sownAt + 60).heart, 2);
  assert.equal(farming.harvest(BED, sownAt + 3 * REST_SECONDS).heart, 2);
  // The commons remembers too, though it does not farm by rotation.
  at = grow(farming, COMMONS, 'barley', 0).at;
  assert.deepEqual([farming.rowState(COMMONS, at).heart, farming.rowState(COMMONS, at).last], [1, 'barley']);
});

test('sowing reads the ground against what the crop likes: rye on lean ground is fit 2, on rich 0, and the same crop twice is 0', () => {
  assert.deepEqual([0, 1, 2, 3].map(heart => fitFor('bridge-rye', heart)), [1, 2, 2, 0], 'rye lodges on rich ground');
  assert.deepEqual([0, 1, 2, 3].map(heart => fitFor('soft-fruit', heart)), [0, 0, 1, 2]);
  assert.deepEqual([0, 1, 2, 3].map(heart => fitFor('barley', heart)), [0, 0, 1, 2]);
  assert.deepEqual([0, 1, 2, 3].map(heart => fitFor('field-beans', heart)), [0, 0, 0, 1], 'a crop that does not mind is helped only by rich ground');
  assert.equal(fitFor('bridge-rye', 1, 'bridge-rye'), 0, 'rye after rye');
  assert.equal(fitFor('soft-fruit', 3, 'soft-fruit'), 0);
  assert.equal(fitFor('bridge-rye', 1, 'barley'), 2);
  assert.equal(fitFor('barley', 3, null, false), 0, 'off the Caricas beds the fit does not count');
  const { farming } = fixture({ level: 3 });
  const at = grow(farming, BED, 'field-beans', 0).at;
  assert.equal(farming.sow(BED, 'soft-fruit', when(BED, at)).fit, 2, 'canes on the bean ground');
  // The commons keeps today's rules: watered barley at level 1 is Plain and pays its plain experience.
  const plain = grow(farming, COMMONS, 'barley', 0).harvest;
  assert.deepEqual([plain.grade, plain.item, plain.xp], ['plain', 'barley', CROPS.barley.xp]);
});

test('grades come from points, and Fine and Prize harvests come in as the fine kind for more experience', () => {
  assert.deepEqual([0, 1, 2, 3, 4, 5, 6].map(points => gradeFor(points, 20)), ['plain', 'plain', 'good', 'good', 'fine', 'prize', 'prize']);
  assert.equal(gradeFor(5, 19), 'fine', 'Prize wants a farmer of level 20');
  assert.equal(gradePoints({ fit: 2, watered: true, level: 20, regarded: true }), 6);
  assert.equal(gradePoints({ fit: 1, level: 5 }), 2);
  assert.deepEqual(GRADE_XP, { plain: 1, good: 1.25, fine: 1.5, prize: 2 });
  // Level 1: rye on a fresh Caricas bed, watered, is Good: the plain sheaf, a quarter more experience.
  const one = fixture();
  const good = grow(one.farming, BED, 'bridge-rye', 0).harvest;
  assert.deepEqual([good.grade, good.produce, good.count, good.xp], ['good', 'bridge-rye', 3, Math.round(30 * 1.25)]);
  assert.equal(one.inventory.count('bridge-rye'), 3);
  // Rye after rye comes up Plain, watered or not.
  assert.equal(grow(one.farming, BED, 'bridge-rye', 1000, { water: false }).harvest.grade, 'plain');
  // Level 5: canes on bean ground, watered, are Fine: the fine kind, half again the experience.
  const five = fixture({ level: 5 });
  const beans = grow(five.farming, BED, 'field-beans', 0);
  const fine = grow(five.farming, BED, 'soft-fruit', beans.at).harvest;
  assert.deepEqual([fine.grade, fine.produce, fine.count, fine.xp], ['fine', 'soft-fruit-fine', 3, 60]);
  assert.deepEqual([five.inventory.count('soft-fruit-fine'), five.inventory.count('soft-fruit')], [3, 0]);
  const event = five.events.findLast(entry => entry.type === 'row-reaped');
  assert.deepEqual([event.grade, event.item, event.quantity], ['fine', 'soft-fruit-fine', 3], 'the toast names what was got');
  // Level 20 and the fox's regard on top: Prize, still the fine kind, twice the experience.
  const twenty = fixture({ level: 20 });
  const rested = grow(twenty.farming, BED, 'field-beans', 0).at;
  twenty.farming.sow(BED, 'barley', when(BED, rested)); twenty.farming.water(BED, rested + 1); twenty.farming.markRegarded(BED);
  const prize = twenty.farming.harvest(BED, rested + 1000);
  assert.deepEqual([prize.grade, prize.produce, prize.xp], ['prize', 'barley-fine', CROPS.barley.xp * 2]);
  // The ripe bed says what it will come up as, and what it will pay.
  twenty.farming.sow(COMMONS, 'carrot', 0); twenty.farming.water(COMMONS, 0);
  assert.deepEqual([twenty.farming.rowState(COMMONS, 100).grade, twenty.farming.rowState(COMMONS, 100).xp], ['good', Math.round(22 * 1.25)],
    'off the Caricas beds water and level make Good at most: Fine wants the country’s own way, or the fox');
});

test('the user’s rotation of 5 October 2026 comes up Fine round after round: beans, a day’s rest, fruit or barley, then rye', () => {
  const { farming } = fixture({ level: 5 });
  let at = 0;
  const grades = [];
  for (let round = 0; round < 3; round++) {
    at = grow(farming, BED, 'field-beans', at).at + REST_SECONDS;
    const fruit = grow(farming, BED, round === 1 ? 'barley' : 'soft-fruit', at); at = fruit.at;
    const rye = grow(farming, BED, 'bridge-rye', at); at = rye.at;
    grades.push(fruit.harvest.grade, rye.harvest.grade);
  }
  assert.deepEqual(grades, ['fine', 'fine', 'fine', 'fine', 'fine', 'fine']);
  assert.equal(farming.rowState(BED, at).heart, 1, 'and from the second round on, the ground ends each round where it began it');
});

test('one Caricas sowing in six is watched by the fox, the same way every time, and markRegarded lifts a planting a point', () => {
  const watched = Array.from({ length: 600 }, (_, at) => foxRegards(BED, at)).filter(Boolean).length;
  assert.ok(watched > 60 && watched < 140, `${watched} of 600`);
  assert.equal(foxRegards(BED, 77.9), foxRegards(BED, 77), 'the whole second of play is what counts');
  const { farming, events } = fixture();
  const seen = when(BED, 0, true);
  assert.equal(farming.sow(BED, 'carrot', seen).regarded, true);
  assert.equal(farming.rowState(BED, seen).regarded, true);
  const other = NORTH.rows[1].id;
  assert.equal(farming.sow(other, 'carrot', when(other, 0)).regarded, false);
  // The commons is never watched: there is no fox on the Avrel.
  const commonsSeen = when(COMMONS, 0, true);
  assert.equal(farming.sow(COMMONS, 'carrot', commonsSeen).regarded, false);
  // The quest's own mark: one point, once.
  assert.equal(farming.markRegarded(NORTH.rows[2].id).ok, false, 'nothing growing to watch');
  const before = farming.rowState(other, 1000);
  assert.deepEqual(farming.markRegarded(other), { ok: true, row: other, crop: 'carrot', first: true });
  assert.equal(farming.markRegarded(other).first, false);
  assert.equal(events.filter(event => event.type === 'row-regarded').length, 1);
  assert.equal(gradePoints({ fit: farming.rowState(other, 1000).fit, level: 1, regarded: true }), gradePoints({ fit: before.fit, level: 1 }) + 1);
  assert.equal(farming.harvest(other, 1000).regarded, true);
});

test('shares are taken at harvest before the rest reaches the satchel, and their notes come back to be shown', () => {
  const { farming, inventory, events } = fixture();
  const calls = [];
  // The farmlands quest registers the holder's quarter; this one takes a third to be seen.
  const stop = farming.onHarvest((bed, harvest) => {
    calls.push([bed, { ...harvest }]);
    const taken = Math.floor(harvest.count / 3);
    return { taken, note: `The holder’s share: ${taken}. Yours: ${harvest.count - taken}.` };
  });
  farming.onHarvest(() => ({ taken: 99, note: 'The garrison takes what is left.' }));
  farming.onHarvest(() => { throw new Error('a broken handler takes nothing'); });
  const at = when(BED, 0);
  farming.sow(BED, 'bridge-rye', at); farming.water(BED, at);
  const result = farming.harvest(BED, at + 240);
  assert.deepEqual(calls, [[BED, { crop: 'bridge-rye', produce: 'bridge-rye', count: 3, grade: 'good', grown: 3 }]]);
  assert.deepEqual([result.grown, result.taken, result.count, result.quantity], [3, 3, 0, 0], 'a share never takes more than there is');
  assert.deepEqual(result.notes, ['The holder’s share: 1. Yours: 2.', 'The garrison takes what is left.']);
  assert.equal(inventory.count('bridge-rye'), 0);
  assert.equal(events.findLast(event => event.type === 'row-reaped').notes.length, 2);
  assert.ok(result.xp > 0, 'the work still teaches');
  // Handlers come off again, and the field panel shows what was shared.
  farming.onHarvest(() => null);
  const keep = createFarming({ skills: createSkills(), inventory });
  const off = keep.onHarvest((bed, harvest) => ({ taken: 1, note: `${harvest.grown} bridge rye, ${harvest.grade === 'good' ? 'Good' : harvest.grade}. The holder’s share: 1. Yours: 2.` }));
  const sown = when(BED, 0);
  keep.sow(BED, 'bridge-rye', sown); keep.water(BED, sown);
  let shown = null;
  const context = { farming: keep, inventory, playSeconds: sown + 240, openDialogue: (npc, lines, event, label, options) => { shown = options; }, closeDialogue() {},
    notify: (text, kicker) => { shown = { text, kicker }; } };
  farmRowConversation(BED, context);
  shown.choices.find(choice => choice.id === 'farm-harvest').action();
  assert.deepEqual(shown, { text: '3 bridge rye, Good. The holder’s share: 1. Yours: 2.', kicker: 'FARMING' });
  assert.equal(inventory.count('bridge-rye'), 2);
  assert.equal(off(), true);
  keep.sow(BED, 'bridge-rye', sown + 300);
  assert.deepEqual(keep.harvest(BED, sown + 600).notes, []);
  assert.equal(stop(), true);
});

test('describeBed reads the heart, the last crop, what would do best next, and the farmer’s test', () => {
  const { farming } = fixture({ level: 3 });
  const fresh = farming.describeBed(BED, 0);
  assert.deepEqual([fresh.heart, fresh.last, fresh.likes, fresh.readiness], [2, null, ['bridge-rye'], 'ready']);
  assert.match(fresh.text, /in fair heart.*bridge rye would do best in it now.*rolls into a cord and breaks/);
  for (const reading of [fresh]) assert.match(reading.text, /^[^.]+\.$/, 'one sentence');
  let at = when(BED, 0);
  farming.sow(BED, 'field-beans', at);
  const dry = farming.describeBed(BED, at);
  assert.deepEqual([dry.readiness, dry.likes], ['passed', ['barley', 'soft-fruit']], 'after the beans the ground will be rich');
  assert.match(dry.text, /in field beans now.*after this crop.*crumbles, the moment has passed, so give it water/);
  farming.water(BED, at);
  assert.match(farming.describeBed(BED, at).text, /smears.*too wet/);
  assert.equal(farming.describeBed(BED, at).readiness, 'wet');
  assert.match(farming.describeBed(BED, at + 200).text, /take the crop in/);
  farming.harvest(BED, at + 200);
  const rich = farming.describeBed(BED, at + 200);
  assert.deepEqual([rich.heart, rich.last, rich.likes, rich.readiness], [3, 'field-beans', ['barley', 'soft-fruit'], 'ready']);
  assert.match(rich.text, /rested and rich, last in field beans/);
  // Spent ground after rye wants beans or a rest, and says so.
  at = grow(farming, BED, 'bridge-rye', grow(farming, BED, 'soft-fruit', grow(farming, BED, 'barley', at + 200).at).at).at;
  const spent = farming.describeBed(BED, at);
  assert.deepEqual([spent.heart, spent.last, spent.likes], [0, 'bridge-rye', []]);
  assert.match(spent.text, /spent, last in bridge rye; it wants beans or a day’s rest/);
  // The commons does not farm by rotation, and the reading says that too.
  assert.match(farming.describeBed(COMMONS, 0).text, /makes no odds/);
  assert.deepEqual(farming.describeBed(COMMONS, 0).likes, []);
  assert.equal(farming.describeBed('nowhere', 0), null);
  // With a clock, a working need not carry the time about.
  const clocked = fixture({ clock: () => at }).farming;
  assert.equal(clocked.describeBed(BED).readiness, 'ready');
});

test('waterAllWithin waters every sown, unwatered bed in reach, and nothing else', () => {
  const { farming, skills, events } = fixture();
  const [a, b, c] = NORTH.rows.map(row => row.id), far = CARICAS_FARMSTEADS.find(farm => farm.id === 'caricas-upper-fields').rows[0].id;
  for (const id of [a, b, c, far]) farming.sow(id, 'carrot', 0);
  farming.water(a, 0);
  const xp = skills.xp('farming');
  const result = farming.waterAllWithin({ x: NORTH.x, z: NORTH.z }, 40, 10);
  assert.deepEqual(result, { ok: true, watered: [b, c], count: 2, xp: 2 * WATERING_XP });
  assert.equal(skills.xp('farming'), xp + 2 * WATERING_XP);
  assert.equal(farming.rowState(far, 10).watered, false, 'beyond reach');
  assert.equal(events.filter(event => event.type === 'row-watered').length, 3, 'each bed is watered as if by hand');
  const again = farming.waterAllWithin({ x: NORTH.x, z: NORTH.z }, 40, 10);
  assert.deepEqual([again.ok, again.count], [false, 0]); assert.match(again.reason, /No growing bed/);
  // A ripe bed is not watered, and nonsense waters nothing.
  assert.equal(farming.waterAllWithin(farming.rowState(far, 0), 1, 500).ok, false, 'ripe already');
  for (const bad of [[null, 40], [{ x: NORTH.x, z: NORTH.z }, -1], [{ x: 'here', z: 0 }, 40]]) assert.equal(farming.waterAllWithin(...bad, 10).ok, false);
});

test('version 2 saves carry the heart, the last crop, the rest and the regard, and version 1 saves load with every bed at heart 2', () => {
  const { farming } = fixture({ level: 3 });
  const reaped = grow(farming, BED, 'field-beans', 0).at;
  const other = NORTH.rows[1].id, seen = when(other, 0, true);
  farming.sow(other, 'barley', seen);
  const saved = farming.snapshot();
  assert.equal(saved.version, 2);
  assert.deepEqual(saved.beds[BED], { heart: 3, last: 'field-beans', since: reaped });
  assert.equal(saved.rows[other].regarded, true);
  assert.equal(validateFarmingSnapshot(saved, { playSeconds: reaped }), true);
  assert.equal(validateFarmingSnapshot(saved, { playSeconds: reaped - 1 }), false, 'rested since a moment not yet played');
  const back = createFarming({ skills: createSkills() });
  assert.equal(back.restore(saved), true);
  assert.deepEqual(back.snapshot(), saved);
  assert.equal(back.rowState(BED, reaped + REST_SECONDS).heart, 3);
  assert.equal(back.rowState(other, seen).regarded, true);
  const bad = beds => validateFarmingSnapshot({ ...saved, beds: { ...saved.beds, ...beds } });
  assert.equal(bad({ [BED]: { heart: 4, last: null } }), false);
  assert.equal(bad({ [BED]: { heart: 1.5, last: null } }), false);
  assert.equal(bad({ [BED]: { heart: 1, last: 'turnips' } }), false);
  assert.equal(bad({ [other]: { heart: 1, last: null, since: 0 } }), false, 'a bed cannot rest and grow at once');
  assert.equal(bad({ nowhere: { heart: 1, last: null } }), false);
  assert.equal(bad({ [BED]: { heart: 1, last: null } }), true);
  assert.equal(validateFarmingSnapshot({ ...saved, beds: undefined }), false, 'version 2 always says what the beds remember');
  assert.equal(validateFarmingSnapshot({ ...saved, rows: { [other]: { crop: 'barley', sownAt: 0, regarded: 'yes' } } }), false);
  // Version 1: no beds, every bed at heart 2, and the farm writes version 2 from then on.
  const legacy = { version: 1, met: true, reaped: 4, trees: {}, rows: { [BED]: { crop: 'carrot', sownAt: 10, watered: true }, [COMMONS]: { crop: 'barley', sownAt: 0 } } };
  assert.equal(validateFarmingSnapshot(legacy), true);
  const old = createFarming({ skills: createSkills() });
  assert.equal(old.restore(legacy), true);
  assert.deepEqual([old.rowState(BED, 10).heart, old.rowState(BED, 10).last, old.rowState(BED, 10).regarded], [2, null, false]);
  assert.deepEqual(old.snapshot(), { ...legacy, version: 2, beds: {} });
  assert.equal(old.restore({ ...legacy, rows: { [BED]: { crop: 'carrot', sownAt: 10, regarded: true } } }), true);
  assert.equal(old.rowState(BED, 10).regarded, false, 'a version-1 save never carried the regard');
});

test('the beds draw the Caricas crops, and rye on rich ground lies over as it ripens', async () => {
  const THREE = await import('../vendor/three.module.js');
  const { createFarmingView } = await sourceModule('../src/farming-view.js');
  const { farming } = fixture({ level: 3 }), scene = new THREE.Scene();
  const view = createFarmingView({ scene, world: { heightAt: () => 20 }, farming });
  const [beans, canes, rye] = NORTH.rows.map(row => row.id);
  const rested = grow(farming, rye, 'field-beans', 0).at;
  for (const [id, cropId] of [[beans, 'field-beans'], [canes, 'soft-fruit'], [rye, 'bridge-rye']]) farming.sow(id, cropId, when(id, rested));
  view.update(rested + 400, NORTH);
  const bed = id => view.group.children.find(group => group.name === NORTH.rows.find(row => row.id === id).name);
  const stalk = id => { const matrix = new THREE.Matrix4(), turn = new THREE.Quaternion(); bed(id).children.find(mesh => /crop stalks/.test(mesh.name)).getMatrixAt(0, matrix);
    matrix.decompose(new THREE.Vector3(), turn, new THREE.Vector3()); return turn; };
  for (const id of [beans, canes, rye]) assert.ok(bed(id).children.some(mesh => mesh.isInstancedMesh && mesh.visible), `${id} shows its crop`);
  assert.equal(farming.rowState(rye, rested + 400).heart, 3);
  assert.ok(Math.abs(stalk(rye).x) > .3, 'the rye on bean ground has lodged');
  assert.ok(Math.abs(stalk(canes).x) < 1e-9, 'canes stand up');
  view.dispose();
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { ALL_FARM_ROWS, ALL_FARM_ROW_IDS, CROPS, CROP_IDS, FARM_ROWS, ORCHARD_TREES, createFarming, cropRegions, farmRow, farmRowsNear, farmsteadRows,
  growsOn, registerCrops, registerRows, registerTrees, validateFarmingSnapshot } from '../src/farming.js';
import { CARICAS_FARMSTEADS, REGIONAL_FARM_ROWS } from '../src/regional-farmland.js';
import { SUNFLOWER_ROWS } from '../src/ari-garden.js';
import { SKILLS, createSkills } from '../src/skills.js';

/**
 * The groundwork for Builds 2 to 5 of the Farmlands of the Lizeem (the user, 6 October 2026: "keep
 * building everything"): a country brings its own beds, crops and bearing trees at start-up, and its
 * own way of farming decides the fit of a crop on its beds. Caricas, whose rotation is built in, is
 * the first country registered. The beds here stand far from every real bed, on a made-up farmstead.
 */
const PLACE = { x: 6100, z: 6100 };
const STRIP = ['wet', 'bench', 'rise'].map((ground, index) => ({ id: `groundwork-${ground}-1`, country: 'nesdor', farmstead: 'groundwork-farm', ground,
  x: PLACE.x + index * 4, z: PLACE.z }));
registerRows(STRIP);
const NORTH = CARICAS_FARMSTEADS.find(farm => farm.id === 'caricas-north-fields');

/** A satchel that holds anything, so a country's crops need no satchel entries here. */
function satchel(start = {}) {
  const owned = new Map(Object.entries(start));
  return { count: id => owned.get(id) ?? 0, items: () => [...owned.keys()].filter(id => owned.get(id) > 0),
    add: (id, n = 1) => { owned.set(id, (owned.get(id) ?? 0) + n); return true; },
    remove: (id, n = 1) => { if ((owned.get(id) ?? 0) < n) return false; owned.set(id, owned.get(id) - n); return true; } };
}
function farm({ level = 1, start = {} } = {}) {
  const skills = createSkills(), inventory = satchel(start), events = [];
  if (level > 1) { const saved = skills.snapshot(); saved.skills.farming = { xp: SKILLS.farming.thresholds[level - 1] }; skills.restore(saved); }
  return { skills, inventory, events, farming: createFarming({ skills, inventory, onEvent: event => events.push(event) }) };
}
/** Right crop, right ground, as the Nesdor strips will have it: nothing thrives on the wet, rye wants the rise. */
const nesdorFit = (bedId, cropId, bed) => (bed.ground === 'wet' ? 0 : cropId === 'barley' ? 1 : cropId === 'bridge-rye' ? (bed.ground === 'rise' ? 2 : 1) : 0);

test('every bed carries its country and its farmstead, and Caricas is the first country registered', () => {
  assert.ok(ALL_FARM_ROWS.every(row => Object.hasOwn(row, 'country') && typeof row.farmstead === 'string' && row.farmstead), 'country and farmstead on every bed');
  assert.deepEqual([farmRow(FARM_ROWS[0].id).country, farmRow(FARM_ROWS[0].id).farmstead], [null, 'avrel-commons']);
  assert.equal(farmRow(SUNFLOWER_ROWS[0].id).farmstead, 'ari-garden');
  assert.ok(NORTH.rows.every(row => farmRow(row.id).country === 'caricas' && farmRow(row.id).farmstead === NORTH.id));
  assert.equal(farmRow(REGIONAL_FARM_ROWS.find(row => row.region === 'Feradom').id).country, 'feradom');
  assert.equal(farmRow(NORTH.rows[0].id).region, 'Caricas', 'what the rows already said is kept');
  const { farming } = farm();
  assert.deepEqual(farming.countries(), ['caricas']);
  for (const name of ['registerRows', 'registerCrops', 'registerTrees', 'farmRowsNear', 'farmsteadRows', 'ripen', 'harvestAll', 'sowAll'])
    assert.equal(typeof farming[name], 'function', `the farm offers ${name}`);
});

test('a country registers its beds at start-up, and a save may name a bed only once it is registered', () => {
  const LATE = [{ id: 'groundwork-late-1', country: 'Nethereum', farmstead: 'groundwork-meadow', x: PLACE.x, z: PLACE.z + 60 }];
  const save = { version: 2, met: false, reaped: 0, trees: {}, beds: {}, rows: { [LATE[0].id]: { crop: 'barley', sownAt: 0 } } };
  assert.equal(validateFarmingSnapshot(save), false, 'an unknown bed');
  const before = ALL_FARM_ROWS.length;
  assert.deepEqual(registerRows(LATE), { ok: true, added: [LATE[0].id], refused: [] });
  assert.equal(ALL_FARM_ROWS.length, before + 1);
  assert.ok(ALL_FARM_ROW_IDS.includes(LATE[0].id));
  assert.deepEqual([farmRow(LATE[0].id).country, farmRow(LATE[0].id).name], ['nethereum', 'Nethereum bed'], 'the country in lower case, and a plain name');
  assert.equal(farmRow(STRIP[1].id).ground, 'bench', 'a bed keeps what the country said of it');
  assert.deepEqual(registerRows(LATE), { ok: true, added: [], refused: [] }, 'the same bed twice is a no-op');
  const clash = registerRows([{ ...LATE[0], x: 0 }]);
  assert.equal(clash.ok, false); assert.match(clash.refused[0].reason, /already/);
  assert.equal(registerRows([{ id: 'groundwork-nowhere', farmstead: 'groundwork-farm', x: 1, z: 1 }]).ok, false, 'a bed needs a country');
  assert.equal(registerRows([{ id: 'groundwork-adrift', country: 'nesdor', farmstead: 'groundwork-farm', x: 'here', z: 1 }]).ok, false, 'and a place');
  assert.equal(validateFarmingSnapshot(save), true);
  const { farming } = farm();
  assert.equal(farming.restore(save), true);
  assert.equal(farming.rowState(LATE[0].id, 0).stage, 'sown');
});

test('a country decides the fit of a crop on its beds, judged at sowing and kept with the planting', () => {
  const { farming } = farm({ level: 5, start: { 'barley-seed': 5, 'bridge-rye-seed': 5 } });
  assert.equal(farming.registerCountry('nesdor', { fit: nesdorFit }), true);
  assert.equal(farming.registerCountry('nowhere', {}), false, 'a country without a fit is not one');
  assert.deepEqual(farming.countries(), ['caricas', 'nesdor']);
  const rise = farming.sow(STRIP[2].id, 'bridge-rye', 0);
  assert.deepEqual([rise.ok, rise.fit, rise.regarded], [true, 2, false], 'rye on the rise, and no fox on the Flats');
  assert.equal(farming.sow(STRIP[0].id, 'barley', 0).fit, 0, 'nothing sown on the wet strip thrives');
  farming.water(STRIP[2].id, 0);
  // The country's ground changes after the sowing; the planting keeps the fit it was sown with.
  farming.registerCountry('nesdor', { fit: () => 0 });
  assert.equal(farming.rowState(STRIP[2].id, 10).fit, 2);
  const reaped = farming.harvest(STRIP[2].id, 240);
  assert.deepEqual([reaped.grade, reaped.produce], ['fine', 'bridge-rye-fine'], 'right ground, watered, at level 5');
  const saved = farming.snapshot();
  assert.equal(saved.rows[STRIP[0].id].fit, 0);
  const back = farm().farming;
  assert.equal(back.restore(saved), true);
  assert.deepEqual(back.snapshot(), saved);
  assert.equal(back.rowState(STRIP[0].id, 10).fit, 0, 'the kept fit, with no rules registered');
  assert.equal(validateFarmingSnapshot({ ...saved, rows: { [STRIP[0].id]: { crop: 'barley', sownAt: 0, fit: 3 } } }), false);
  assert.equal(validateFarmingSnapshot({ ...saved, rows: { [STRIP[0].id]: { crop: 'barley', sownAt: 0, fit: 1.5 } } }), false);
  // Caricas's plantings keep their fit too, and the rotation reads as it always has.
  const caricas = farm({ start: { 'bridge-rye-seed': 1 } }).farming, bed = NORTH.rows[0].id;
  let at = 0;
  while (caricas.sow(bed, 'bridge-rye', at).ok !== true) at++;
  assert.equal(caricas.snapshot().rows[bed].fit, 2, 'rye on fresh Caricas ground');
});

test('the country hears each sowing and harvest on its beds, takes its share first, and says what Sound the Soil reads there', () => {
  const { farming } = farm({ start: { 'barley-seed': 3 } });
  const heard = [];
  farming.registerCountry('nesdor', { fit: nesdorFit, onPlant: (bed, crop) => heard.push(['plant', bed, crop]),
    onHarvest: (bed, result) => { heard.push(['harvest', bed, result.grown]); return { taken: 1, note: 'The foragers take one.' }; },
    describe: bedId => `The ${farmRow(bedId).ground} strip.` });
  const off = farming.onHarvest(() => ({ taken: 1, note: 'Another share.' }));
  farming.sow(STRIP[1].id, 'barley', 0);
  const result = farming.harvest(STRIP[1].id, 240);
  assert.deepEqual(heard, [['plant', STRIP[1].id, 'barley'], ['harvest', STRIP[1].id, 2]]);
  assert.deepEqual([result.notes, result.count], [['The foragers take one.', 'Another share.'], 0], 'the country first, then the share-takers');
  off();
  const reading = farming.describeBed(STRIP[2].id, 300);
  assert.deepEqual([reading.text, reading.likes], ['The rise strip.', ['bridge-rye']], 'its own words, and what its fit likes best');
  farming.registerCountry('nesdor', { fit: nesdorFit });
  assert.match(farming.describeBed(STRIP[2].id, 300).text, /bridge rye would do best in it now/);
  assert.match(farming.describeBed(STRIP[0].id, 300).text, /nothing sown here would do well in it now/);
  assert.match(farm().farming.describeBed(STRIP[2].id, 300).text, /makes no odds/, 'with no rules, the ground has no opinion');
});

test('a crop may belong to several countries, and a country may add its own, sown or grown by the ground itself', () => {
  assert.deepEqual(cropRegions('bridge-rye'), ['caricas', 'nesdor']);
  assert.equal(cropRegions('carrot'), null);
  assert.ok(growsOn('bridge-rye', STRIP[2].id) && growsOn('bridge-rye', NORTH.rows[0].id) && !growsOn('field-beans', STRIP[2].id));
  const added = registerCrops([
    { id: 'groundwork-wheat', name: 'Groundwork wheat', seconds: 360, xp: 60, level: 8, item: 'groundwork-wheat', yield: 2, seed: 'groundwork-wheat-seed', region: 'Nesdor' },
    { id: 'groundwork-hay', name: 'Groundwork hay', seconds: 180, xp: 20, level: 5, item: 'groundwork-hay', yield: 3, sown: false, region: ['nesdor'] },
  ]);
  assert.deepEqual(added, { ok: true, added: ['groundwork-wheat', 'groundwork-hay'], refused: [] });
  assert.deepEqual([CROPS['groundwork-wheat'].fine, CROPS['groundwork-wheat'].region], ['groundwork-wheat-fine', 'nesdor']);
  assert.ok(CROP_IDS.includes('groundwork-hay'));
  assert.equal(registerCrops([{ id: 'carrot', name: 'Not carrots', seconds: 1, xp: 1, level: 1, item: 'turnip', yield: 1, seed: 'turnip-seed' }]).ok, false, 'an id already taken');
  assert.equal(registerCrops([{ id: 'groundwork-bad', name: 'Nothing much' }]).ok, false, 'a crop needs its numbers');
  const { farming, inventory } = farm({ level: 8, start: { 'groundwork-wheat-seed': 1 } });
  assert.ok(farming.sowable(STRIP[1].id).some(kind => kind.id === 'groundwork-wheat'));
  assert.ok(!farming.sowable(STRIP[1].id).some(kind => kind.id === 'groundwork-hay'), 'the hay is never offered for seed');
  assert.match(farming.sow(NORTH.rows[0].id, 'groundwork-wheat', 0).reason, /only on the Nesdor farms/);
  assert.match(farming.sow(STRIP[0].id, 'groundwork-hay', 0).reason, /not sown/);
  assert.equal(farming.sow(STRIP[0].id, 'groundwork-hay', 0, { free: true }).ok, true, 'the ground grows it when the country says so');
  assert.equal(farming.sow(STRIP[1].id, 'groundwork-wheat', 0).ok, true);
  assert.equal(inventory.count('groundwork-wheat-seed'), 0);
  const bench = farm({ level: 8 }).farming.stockSeeds(STRIP[2].id).added.map(entry => entry.id);
  assert.ok(bench.includes('groundwork-wheat-seed') && bench.includes('bridge-rye-seed') && !bench.includes('field-beans-seed'), bench.join(', '));
  assert.ok(!bench.some(id => id.startsWith('groundwork-hay')), 'and the bench has no seed for what is never sown');
});

test('ripen makes a growing bed ripe at once, and the save remembers it', () => {
  const { farming, events } = farm({ start: { 'carrot-seed': 2 } });
  const bed = STRIP[1].id;
  assert.equal(farming.ripen(bed, 0).ok, false, 'nothing growing');
  farming.sow(bed, 'carrot', 0);
  const result = farming.ripen(bed, 10);
  assert.deepEqual([result.ok, result.crop], [true, 'carrot']);
  assert.deepEqual([farming.rowState(bed, 10).stage, farming.rowState(bed, 10).left, farming.rowState(bed, 10).progress], ['ripe', 0, 1]);
  assert.equal(farming.ripen(bed, 10).ok, false, 'ripe already');
  assert.ok(events.some(event => event.type === 'row-ripened' && event.row === bed));
  const saved = farming.snapshot();
  assert.equal(saved.rows[bed].ripened, true);
  assert.equal(validateFarmingSnapshot(saved, { playSeconds: 10 }), true);
  const back = farm().farming;
  assert.equal(back.restore(saved), true);
  assert.equal(back.rowState(bed, 10).stage, 'ripe');
  assert.equal(back.harvest(bed, 10).ok, true);
  assert.equal(validateFarmingSnapshot({ ...saved, rows: { [bed]: { crop: 'carrot', sownAt: 0, ripened: 'yes' } } }), false);
});

test('the beds near a point come nearest first, and a farmstead is sown or reaped in one act', () => {
  const near = farmRowsNear({ x: PLACE.x + 8, z: PLACE.z }, 5);
  assert.deepEqual(near.map(row => row.id), [STRIP[2].id, STRIP[1].id]);
  assert.equal(near[0].distance, 0);
  assert.deepEqual(farmRowsNear(null, 5), []); assert.deepEqual(farmRowsNear(PLACE, -1), []);
  assert.deepEqual(farmsteadRows('groundwork-farm').map(row => row.id), STRIP.map(row => row.id));
  assert.deepEqual(farmsteadRows(NORTH.id).map(row => row.id), NORTH.rows.map(row => row.id));
  const { farming, events, skills } = farm({ start: { 'carrot-seed': 5 } });
  const ids = STRIP.map(row => row.id);
  const sown = farming.sowAll(ids, 'carrot', 0, { working: 'work-of-nine' });
  assert.deepEqual([sown.ok, sown.count], [true, 3]);
  assert.ok(events.filter(event => event.type === 'row-sown').every(event => event.working === 'work-of-nine'), 'the host can show one notice');
  assert.equal(farming.sowAll(ids, 'carrot', 0).ok, false, 'nothing bare now');
  const reaped = farming.harvestAll(ids, 100, { working: 'work-of-nine' });
  assert.deepEqual([reaped.reaped, reaped.xp], [ids, 3 * CROPS.carrot.xp]);
  assert.equal(farming.harvestAll(ids, 100).ok, false, 'nothing ripe now');
  // A hired hand's harvest is the farmer's crop and nobody's experience.
  farming.sow(STRIP[0].id, 'carrot', 100);
  const before = skills.xp('farming');
  const hand = farming.harvest(STRIP[0].id, 200, { hand: 'messor' });
  assert.deepEqual([hand.ok, hand.xp, hand.hand], [true, 0, 'messor']);
  assert.equal(skills.xp('farming'), before);
  assert.equal(events.at(-1).hand, 'messor');
});

test('a country’s bearing trees give their own produce, at their own level, and bear again on their own time', () => {
  const HAZEL = { id: 'groundwork-hazel-1', name: 'A hazel at the valley head', x: PLACE.x, z: PLACE.z + 20, item: 'hazelnuts', xp: 18, regrow: 600, level: 12, country: 'Nesdor' };
  assert.deepEqual(registerTrees([HAZEL]).added, [HAZEL.id]);
  assert.equal(ORCHARD_TREES.at(-1).country, 'nesdor');
  assert.deepEqual([ORCHARD_TREES[0].item, ORCHARD_TREES[0].regrow], ['avrel-apple', 600], 'the apples are as they were');
  assert.match(farm().farming.pick(HAZEL.id, 0).reason, /level 12/);
  const { farming, inventory } = farm({ level: 12 });
  const picked = farming.pick(HAZEL.id, 0);
  assert.deepEqual([picked.ok, picked.item, picked.xp], [true, 'hazelnuts', 18]);
  assert.equal(inventory.count('hazelnuts'), 1);
  assert.equal(farming.treeState(HAZEL.id, 599).stage, 'picked');
  assert.equal(farming.treeState(HAZEL.id, 600).stage, 'fruiting');
  const saved = farming.snapshot();
  assert.equal(saved.trees[HAZEL.id], 0);
  assert.equal(validateFarmingSnapshot(saved), true);
  assert.equal(registerTrees([{ id: 'groundwork-tree-bad', x: 0, z: 0 }]).ok, false, 'a tree needs its produce and its time');
});

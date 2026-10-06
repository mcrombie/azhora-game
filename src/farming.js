/**
 * The optional Avrel commons garden: seed, tend, harvest and cook.
 * Growth reads active play seconds, so leaving the clearing keeps crops growing while menus,
 * pause and a closed game do not. Four established row IDs and version-1 saves stay compatible.
 * Stanley supplies seed; Enna keeps her independent mill errand. Pure model, no DOM or Three.
 *
 * Build 1 of the Farmlands of the Lizeem (docs/lizeem-farmlands-design.md §4, §5.1, §7.3) adds
 * what every bed remembers (its heart and its last crop), the grade of every harvest, the fine
 * kind of each produce, the Caricas crops, and shares taken at harvest.
 *
 * The groundwork for Builds 2 to 5 (the user, 6 October 2026: "keep building everything") lets a
 * country bring its own beds, crops and bearing trees at start-up (`registerRows`, `registerCrops`,
 * `registerTrees`) and its own way of farming to the farm (`farming.registerCountry`): the country
 * decides the fit of a crop on its beds, and Caricas, whose rotation is built in, is the first
 * country registered. `ripen` is the working Quicken's, `farmRowsNear` and `farmsteadRows` the
 * Work of Nine's, and `harvestAll` / `sowAll` work several beds in one act.
 */
import { APPLEGARTH_WORKS } from './rena.js';
import { REGIONAL_FARM_ROWS } from './regional-farmland.js';
import { SUNFLOWER_ROWS } from './ari-garden.js';

const freeze = Object.freeze;

/**
 * Version 2 (6 October 2026) adds `beds`, what each bed remembers, and the fox's regard on a
 * planting. A version-1 save still loads: every bed in it starts at heart 2 with nothing
 * remembered, which is what a bed that has never been worked is.
 */
export const FARMING_VERSION = 2;
export const FARMING_VERSIONS = freeze([1, 2]);
export const FARMING_SKILL = 'farming';
export const FARMER = freeze({ id: 'avrel-farmer', name: 'Stanley', role: 'Farmer of the Avrel clearing',
  modelRole: 'avrel-farmer', color: 0x6c7654, skin: 0xc7a477, x: -422, z: 58.5, yaw: -0.6,
  look: freeze({ hair: 0x191915, hairStyle: 'short', beard: false, eyes: 0x3b2e20 }) });
export const FARM_FIRE = freeze({ id: 'commons-fire', x: -421, z: 53, fireX: -419.5, fireZ: 53 });
export const SEED_PACKET_SIZE = 4;
export const WATERING_XP = 4;
export const WATERED_GROWTH = 0.75;

/** Every produce has a fine kind, kept in the satchel as its own stack (design §4.4). */
export const fineItem = item => `${item}-fine`;
const cropRow = (id, entry) => freeze({ id, ...entry, fine: fineItem(entry.item) });

/**
 * What a row can be sown with. `seconds` is play-seconds from sowing to ripe, and the two
 * numbers are the design's: four minutes for barley, eight for the leaf (docs/drent-long-road.md
 * §5). `xp` is what reaping one row pays. `kind` says what the crop takes from the ground and
 * `heart` what ground it likes (lean, rich or any); `restores` puts heart back. A crop with a
 * `region` is sown only on that country's beds: the Caricas three, on its five farmsteads.
 */
export const CROPS = {
  sunflower: cropRow('sunflower', { name: 'Sunflowers', seconds: 120, xp: 26, level: 1, item: 'sunflower', yield: 2, seed: 'sunflower-seed', kind: 'flower', heart: 'any',
    note: 'Golden flowers on tall green stems. Ari teaches this crop in Applegarth. Water once for a fuller harvest in ninety seconds of active play.' }),
  carrot: cropRow('carrot', { name: 'Carrots', seconds: 90, xp: 22, level: 1, item: 'carrot', yield: 2, seed: 'carrot-seed', kind: 'root', heart: 'any',
    note: 'A quick first crop. Eat a carrot for 15 health, or simmer one with barley for a much heartier meal.' }),
  beet: cropRow('beet', { name: 'Beets', seconds: 150, xp: 32, level: 2, item: 'beet', yield: 2, seed: 'beet-seed', kind: 'root', heart: 'any',
    note: 'Broad red-veined leaves and sweet roots. Eat one for 20 health, or roast it for 35.' }),
  barley: cropRow('barley', { name: 'Barley', seconds: 240, xp: 24, level: 1, item: 'barley', yield: 2, seed: 'barley-seed', kind: 'grain', heart: 'rich',
    note: 'Four minutes of play from the drill to the sickle. The commons grows it for the mill, and the mill is the reason the commons exists.' }),
  'drent-leaf': cropRow('drent-leaf', { name: 'Drent leaf', seconds: 480, xp: 45, level: 5, item: 'pipe-weed', yield: 1, seed: 'drent-leaf-seed', kind: 'leaf', heart: 'any',
    note: 'Twice as long and worth it. Half the good ground in Drent is under tobacco, and this is a row of it (src/pipeweed.js).' }),
  // The Caricas three (design §5.1), 6 October 2026. Rye and beans need no level; the canes want 3.
  // Bridge rye also takes the dry rises of the Nesdor Flats (the contract for Builds 2 and 3, 6 October 2026).
  'bridge-rye': cropRow('bridge-rye', { name: 'Bridge rye', seconds: 240, xp: 30, level: 1, item: 'bridge-rye', yield: 2, seed: 'bridge-rye-seed', kind: 'grain', heart: 'lean', region: freeze(['caricas', 'nesdor']),
    note: 'The Minoran bridge rye, the grain of practical people. It does best on lean ground and falls over on rich, so sow it where grain or fruit has been.' }),
  'field-beans': cropRow('field-beans', { name: 'Field beans', seconds: 150, xp: 26, level: 1, item: 'field-beans', yield: 2, seed: 'field-beans-seed', kind: 'pulse', heart: 'any', restores: true,
    region: 'caricas', note: 'Broad beans that put heart back into the ground they grow in. A Carican sows them after grain, and what follows them does better for it.' }),
  // Canes, not seed: the satchel still gets a cutting back at harvest, for simplicity.
  'soft-fruit': cropRow('soft-fruit', { name: 'Soft fruit', seconds: 300, xp: 40, level: 3, item: 'soft-fruit', yield: 2, seed: 'soft-fruit-seed', kind: 'fruit', heart: 'rich', region: 'caricas',
    note: 'Raspberry and currant canes for the terraces. They want rich, rested ground: sow them after beans, never after themselves.' }),
};
/** Live lists: a country's crops join them at start-up (`registerCrops`, below). */
export const CROP_IDS = Object.keys(CROPS);
export const crop = id => (typeof id === 'string' && Object.hasOwn(CROPS, id) ? CROPS[id] : null);
/** Every fine produce item, for the satchel, the larder and whoever buys it. */
export const FINE_ITEMS = CROP_IDS.map(id => CROPS[id].fine);
/** The countries a crop is sown in, lower case, or null for a crop that grows anywhere. */
export const cropRegions = cropId => { const kind = crop(cropId); return kind?.region ? [].concat(kind.region) : null; };
const titleCase = word => `${word[0].toUpperCase()}${word.slice(1)}`;

/**
 * A country's crops, added at start-up (6 October 2026). Each is `{ id, name, seconds, xp, level,
 * item, yield, seed, kind, heart?, region?, restores?, sown?, note? }`; `region` is a country or a
 * list of them, and a crop with `sown: false` is never offered for seed: the country grows it
 * (meadow hay after a draw-off) through `sow(..., { free: true })`. The same crop registered twice
 * is a no-op; a different crop under an id already taken is refused. Items, fine items and seed
 * must be registered with the satchel separately (src/inventory.js).
 */
export function registerCrops(list) {
  const added = [], refused = [];
  for (const spec of [].concat(list ?? [])) {
    const id = spec?.id;
    const whole = typeof id === 'string' && id && typeof spec.name === 'string' && typeof spec.item === 'string'
      && [spec.seconds, spec.xp, spec.level, spec.yield].every(n => Number.isFinite(n) && n >= 0) && spec.seconds > 0
      && (spec.sown === false || typeof spec.seed === 'string');
    if (!whole) { refused.push({ id: id ?? null, reason: 'A crop needs an id, a name, an item, seed, seconds, experience, a level and a yield.' }); continue; }
    const region = spec.region == null ? undefined : [].concat(spec.region).map(name => String(name).toLowerCase());
    const row = freeze({ kind: 'grain', heart: 'any', note: '', ...spec, id,
      region: region ? (region.length === 1 ? region[0] : freeze(region)) : undefined, fine: fineItem(spec.item) });
    if (Object.hasOwn(CROPS, id)) {
      if (JSON.stringify(CROPS[id]) === JSON.stringify(row)) continue;
      refused.push({ id, reason: 'Another crop already has that id.' }); continue;
    }
    CROPS[id] = row; CROP_IDS.push(id); FINE_ITEMS.push(row.fine); added.push(id);
  }
  return { ok: refused.length === 0, added, refused };
}

/**
 * The rows, at the Mill Commons in the Avrel clearing, in world metres. Positions only: they are
 * the commons' own worked ground, laid out along the field edge east of where Enna stands, and
 * the first cut draws nothing new on them beyond a sown look and a ripe one.
 */
const row = (id, name, x, z) => freeze({ id, name, x, z, country: null, farmstead: 'avrel-commons' });
export const FARM_ROWS = freeze([
  row('commons-row-1', 'The first commons row', -424.6, 62.4),
  row('commons-row-2', 'The second commons row', -428.2, 65.8),
  row('commons-row-3', 'The third commons row', -431.8, 69.2),
  row('commons-row-4', 'The far commons row', -435.4, 72.6),
]);
export const FARM_ROW_IDS = freeze(FARM_ROWS.map(entry => entry.id));

const regionKey = value => typeof value === 'string' && value ? value.toLowerCase() : null;
/**
 * Every bed carries its `country` (lower case, or null for the commons and Ari's garden) and its
 * `farmstead`, the farm it belongs to: the Work of Nine works one farmstead at a time.
 */
const bedRow = (entry, farmstead = null) => freeze({ ...entry, country: regionKey(entry.country ?? entry.region),
  farmstead: entry.farmstead ?? entry.farmId ?? farmstead });
/** Live lists: a country's beds join them at start-up (`registerRows`, below). */
export const ALL_FARM_ROWS = [...FARM_ROWS.map(entry => bedRow(entry)), ...SUNFLOWER_ROWS.map(entry => bedRow(entry, 'ari-garden')),
  ...REGIONAL_FARM_ROWS.map(entry => bedRow(entry))];
export const ALL_FARM_ROW_IDS = ALL_FARM_ROWS.map(entry => entry.id);
const rowIndex = new Map(ALL_FARM_ROWS.map(entry => [entry.id, entry]));
export const farmRow = id => rowIndex.get(id) ?? null;

/**
 * A country's beds, added at start-up, before the farm is drawn (src/farming-view.js builds its
 * beds when it is made) and before the first save is read: `{ id, country, farmstead, x, z, yaw?,
 * ground?, name? }`. Bed ids are permanent once shipped, as every save id is. The same bed
 * registered twice is a no-op; another bed under a taken id is refused.
 */
export function registerRows(rows) {
  const added = [], refused = [];
  for (const spec of [].concat(rows ?? [])) {
    const id = spec?.id;
    if (typeof id !== 'string' || !id || !regionKey(spec.country) || typeof spec.farmstead !== 'string' || !spec.farmstead
      || ![spec.x, spec.z].every(Number.isFinite)) { refused.push({ id: id ?? null, reason: 'A bed needs an id, a country, a farmstead and a place.' }); continue; }
    const entry = bedRow({ name: `${titleCase(regionKey(spec.country))} bed`, ...spec });
    if (rowIndex.has(id)) {
      if (JSON.stringify(rowIndex.get(id)) === JSON.stringify(entry)) continue;
      refused.push({ id, reason: 'Another bed already has that id.' }); continue;
    }
    ALL_FARM_ROWS.push(entry); ALL_FARM_ROW_IDS.push(id); rowIndex.set(id, entry); added.push(id);
  }
  return { ok: refused.length === 0, added, refused };
}

/** Every bed within `radius` metres of a point, nearest first, each with its `distance`. */
export function farmRowsNear(point, radius) {
  const x = Number(point?.x), z = Number(point?.z), reach = Number(radius);
  if (!Number.isFinite(x) || !Number.isFinite(z) || !(reach >= 0)) return [];
  return ALL_FARM_ROWS.map(entry => ({ ...entry, distance: Math.hypot(entry.x - x, entry.z - z) }))
    .filter(entry => entry.distance <= reach).sort((a, b) => a.distance - b.distance);
}
/** The beds of one farmstead, in the order they were laid out. */
export const farmsteadRows = farmstead => (typeof farmstead === 'string' && farmstead ? ALL_FARM_ROWS.filter(entry => entry.farmstead === farmstead) : []);

/** Whether a crop belongs on a bed: a country's own crop only on that country's beds. */
const belongsOn = (cropId, rowId) => {
  const regions = cropRegions(cropId), bed = farmRow(rowId);
  return !!crop(cropId) && !!bed && (!regions || regions.includes(bed.country));
};
/** Whether a crop may be sown on a bed: it belongs there, and it is sown at all (not the meadow's own hay). */
export const growsOn = (cropId, rowId) => belongsOn(cropId, rowId) && crop(cropId).sown !== false;

/**
 * Rotation, the Caricas way of farming (design §4.3, §5.1). Every bed remembers its heart, from
 * 0 (spent) to 3 (rested and rich), and the crop it last bore. Harvesting grain or fruit draws a
 * step of heart, harvesting beans puts one back, and a bed left bare for a game day (24 minutes
 * of play) gains one. Sowing reads the ground against what the crop likes and sets its fit:
 * rye on lean ground is 2 and on rich ground 0, fruit and barley the other way about, and a crop
 * that does not mind is helped only by rich ground. The same crop twice running is 0.
 *
 * The user's rule of 5 October 2026: beans, then fruit or barley, then rye, then beans again is
 * the rotation that comes up Fine. Fair ground (heart 2) is lean enough for rye so that the rye
 * after the fruit is Fine too, and with a day's rest after the beans the round holds its heart.
 *
 * Every bed remembers, but the fit counts only where rotation is the country's own way: the
 * Caricas beds. The commons and the Feradom and Ambron fields keep the grades of watering and
 * level alone (design §4.4: the grade comes from how well the country's own job was done).
 */
export const HEART_DEFAULT = 2;
export const HEART_MAX = 3;
export const REST_SECONDS = 24 * 60;
export const ROTATION_REGIONS = freeze(['caricas']);
export const HEART_WORDS = freeze(['spent', 'lean', 'in fair heart', 'rested and rich']);
const FIT = freeze({ lean: freeze([1, 2, 2, 0]), rich: freeze([0, 0, 1, 2]), any: freeze([0, 0, 0, 1]) });
const DRAWS = freeze(['grain', 'fruit']);
export const rotates = rowId => ROTATION_REGIONS.includes(farmRow(rowId)?.country);
const clampHeart = value => Math.max(0, Math.min(HEART_MAX, value));
/** A fit is 0, 1 or 2, whatever a country's own rule answered. */
const clampFit = value => Math.max(0, Math.min(2, Math.round(Number(value) || 0)));
export function fitFor(cropId, heart = HEART_DEFAULT, last = null, rotation = true) {
  const kind = CROPS[cropId];
  if (!kind || !rotation || last === kind.id) return 0;
  return (FIT[kind.heart] ?? FIT.any)[clampHeart(Math.round(heart))];
}
/** What harvesting a crop does to the ground it grew in. */
export const heartAfter = (cropId, heart) => clampHeart(heart + (CROPS[cropId]?.restores ? 1 : DRAWS.includes(CROPS[cropId]?.kind) ? -1 : 0));

/**
 * The grade of a harvest (design §4.4), from points: the fit (0 to 2), watering (1), Farming
 * level 5 or more (1), level 20 or more (1), and the fox's regard (1). Plain below 2, Good at
 * 2 or 3, Fine at 4, Prize at 5 or more for a farmer of level 20. Fine and Prize harvests come
 * in as the fine kind of the produce, and every grade above Plain pays more experience.
 */
export const GRADES = freeze(['plain', 'good', 'fine', 'prize']);
export const GRADE_NAMES = freeze({ plain: 'Plain', good: 'Good', fine: 'Fine', prize: 'Prize' });
export const GRADE_XP = freeze({ plain: 1, good: 1.25, fine: 1.5, prize: 2 });
export const gradePoints = ({ fit = 0, watered = false, level = 1, regarded = false } = {}) =>
  fit + (watered ? 1 : 0) + (level >= 5 ? 1 : 0) + (level >= 20 ? 1 : 0) + (regarded ? 1 : 0);
export const gradeFor = (points, level = 1) => points >= 5 && level >= 20 ? 'prize' : points >= 4 ? 'fine' : points >= 2 ? 'good' : 'plain';
export const isFineGrade = grade => grade === 'fine' || grade === 'prize';
/**
 * A picking from a kept tree that has a fine kind (`fine`, Idunn's hazels) is graded by the farmer's hand
 * alone, since nothing is sown or watered: Fine at Farming 16 and Prize at 20, coming in as the fine kind, and
 * Plain below (settled at integration, 6 October 2026, so the Measure's hazelnut line can be filled). A tree
 * with no fine kind, an Applegarth apple, is always Plain.
 */
export const PICK_FINE_LEVEL = 16;
export const PICK_PRIZE_LEVEL = 20;
export const pickGrade = (tree, level = 1) => (typeof tree?.fine !== 'string' ? 'plain' : level >= PICK_PRIZE_LEVEL ? 'prize' : level >= PICK_FINE_LEVEL ? 'fine' : 'plain');
/** The most one handler may add to a harvest (`onHarvest`, `added`). */
const MOST_ADDED = 99;

/**
 * The fox's regard (design §5.1, the Caricans' vel-caric-oss). The farmlands quest marks a planting
 * with `markRegarded`; besides that, one Caricas sowing in six is watched from the bank. The roll
 * is seeded from the bed and the whole second of play it was sown in, so it is the same every
 * time the same thing is done, and tests can name a sowing that is regarded and one that is not.
 */
export const REGARD_ODDS = 6;
export function foxRegards(rowId, playSeconds) {
  let hash = 0x811c9dc5;
  for (const char of `${rowId}@${Math.floor(Math.max(0, Number(playSeconds) || 0))}`) hash = Math.imul(hash ^ char.charCodeAt(0), 0x01000193) >>> 0;
  return hash % REGARD_ODDS === 0;
}

/** What one apple off a kept tree is worth, and how long the tree takes to bear again. */
export const ORCHARD_ITEM = 'avrel-apple';
export const ORCHARD_XP = 12;
export const ORCHARD_REGROW = 600;
/**
 * Applegarth's orchard: twenty-eight trees in rows south of the old road, kept rather than gone
 * wild, which is the whole difference between Applegarth and Rena. Their places are the village's
 * own (`APPLEGARTH_WORKS.orchard`), so the trees move only if the village does.
 */
export const ORCHARD_TREES = APPLEGARTH_WORKS.orchard.map((point, index) =>
  freeze({ id: `applegarth-tree-${index + 1}`, name: 'An Avrel apple tree', x: point.x, z: point.z,
    item: ORCHARD_ITEM, xp: ORCHARD_XP, regrow: ORCHARD_REGROW, level: 1, country: null }));
export const ORCHARD_TREE_IDS = ORCHARD_TREES.map(tree => tree.id);
const treeIndex = new Map(ORCHARD_TREES.map(tree => [tree.id, tree]));

/**
 * A country's bearing trees and coppice, added at start-up as the beds are (6 October 2026): `{ id,
 * name, x, z, item, xp, regrow, level?, country? }`. The Nesdor hazels are picked for hazelnuts and
 * bear again ten minutes later, as the Applegarth apples do. Same rules as `registerRows`.
 */
export function registerTrees(trees) {
  const added = [], refused = [];
  for (const spec of [].concat(trees ?? [])) {
    const id = spec?.id;
    if (typeof id !== 'string' || !id || typeof spec.item !== 'string' || ![spec.x, spec.z, spec.xp, spec.regrow].every(Number.isFinite)
      || spec.regrow <= 0) { refused.push({ id: id ?? null, reason: 'A tree needs an id, a place, a produce, experience and a time to bear again.' }); continue; }
    const tree = freeze({ name: 'A kept tree', level: 1, ...spec, country: regionKey(spec.country) });
    if (treeIndex.has(id)) {
      if (JSON.stringify(treeIndex.get(id)) === JSON.stringify(tree)) continue;
      refused.push({ id, reason: 'Another tree already has that id.' }); continue;
    }
    ORCHARD_TREES.push(tree); ORCHARD_TREE_IDS.push(id); treeIndex.set(id, tree); added.push(id);
  }
  return { ok: refused.length === 0, added, refused };
}

const isPlainObject = value => !!value && typeof value === 'object' && !Array.isArray(value);
const seconds = value => Number.isFinite(value) && value >= 0 && value <= 1e8;
const round = value => Math.round(value * 100) / 100;

/**
 * A save that says otherwise is not one the farm wrote. Every time in it is a moment of play
 * that has already happened: a row sown in the future would be a row that never ripens, and a
 * tree picked in the future would be one that never bears again. Version 1 is read as it always
 * was; version 2 adds the regard on a row and `beds`, where a bed resting since a harvest cannot
 * also be sown.
 */
export function validateFarmingSnapshot(data, { allowMissing = true, playSeconds = Infinity } = {}) {
  if (data === undefined) return allowMissing;
  if (!isPlainObject(data) || !FARMING_VERSIONS.includes(data.version)) return false;
  if (typeof data.met !== 'boolean' || !isPlainObject(data.rows) || !isPlainObject(data.trees)) return false;
  if (!Number.isInteger(data.reaped) || data.reaped < 0 || data.reaped > 1e7) return false;
  const current = data.version === FARMING_VERSION;
  const rows = Object.entries(data.rows);
  if (rows.length > ALL_FARM_ROWS.length) return false;
  if (!rows.every(([id, sown]) => ALL_FARM_ROW_IDS.includes(id) && isPlainObject(sown)
    && Object.hasOwn(CROPS, sown.crop) && seconds(sown.sownAt) && sown.sownAt <= playSeconds
    && (sown.watered === undefined || typeof sown.watered === 'boolean')
    && (!current || sown.regarded === undefined || typeof sown.regarded === 'boolean')
    // The fit a country judged at sowing, and a bed Quickened ripe (6 October 2026).
    && (!current || sown.fit === undefined || [0, 1, 2].includes(sown.fit))
    && (!current || sown.ripened === undefined || sown.ripened === true))) return false;
  if (current) {
    if (!isPlainObject(data.beds)) return false;
    const beds = Object.entries(data.beds);
    if (beds.length > ALL_FARM_ROWS.length) return false;
    if (!beds.every(([id, bed]) => ALL_FARM_ROW_IDS.includes(id) && isPlainObject(bed)
      && Number.isInteger(bed.heart) && bed.heart >= 0 && bed.heart <= HEART_MAX
      && (bed.last === null || Object.hasOwn(CROPS, bed.last))
      && (bed.since === undefined || (seconds(bed.since) && bed.since <= playSeconds && !Object.hasOwn(data.rows, id))))) return false;
  }
  const trees = Object.entries(data.trees);
  if (trees.length > ORCHARD_TREES.length) return false;
  return trees.every(([id, pickedAt]) => ORCHARD_TREE_IDS.includes(id) && seconds(pickedAt) && pickedAt <= playSeconds);
}

/**
 * `clock`, if given, answers for any call made without a moment of play, so a working (the
 * sorcery of design §3) can ask about a bed without carrying the clock about with it.
 */
export function createFarming({ skills = null, inventory = null, onEvent = () => {}, clock = null } = {}) {
  const state = { met: false, rows: new Map(), beds: new Map(), trees: new Map(), reaped: 0 };
  const shares = new Set();
  const countries = new Map();

  /**
   * A country's way of farming (6 October 2026): `fit(bedId, cropId, bed)` answers 0, 1 or 2 for a
   * crop on one of its beds, where `bed` is the bed as it stands (`country`, `farmstead`, `ground`,
   * `heart`, `last`, `playSeconds`); `describe(bedId, bed)` answers the line Sound the Soil reads
   * there; `onPlant(bedId, cropId)` hears each sowing, and `onHarvest(bedId, result)` each harvest on
   * its beds, before any share-taker, and may itself return `{ taken, note }`. The fit is judged at
   * sowing and kept with the planting, so what the country does to the ground afterwards does not
   * change a crop already in it. A country registered again replaces its old rules. A country that
   * registers with `judge: 'harvest'` (the Ovesos canal, Build 4, 6 October 2026) is asked afresh each
   * time the planting is read instead, because the water it is given after sowing is what decides it.
   */
  function registerCountry(country, { fit, describe = null, onPlant = null, onHarvest = null, judge = 'sowing' } = {}) {
    const key = regionKey(country);
    if (!key || typeof fit !== 'function') return false;
    countries.set(key, freeze({ fit, describe: typeof describe === 'function' ? describe : null,
      onPlant: typeof onPlant === 'function' ? onPlant : null, onHarvest: typeof onHarvest === 'function' ? onHarvest : null, atHarvest: judge === 'harvest' }));
    return true;
  }
  // Caricas farms by rotation, and is the first country registered: its fit is the built-in one.
  registerCountry('caricas', { fit: (bedId, cropId, bed) => fitFor(cropId, bed.heart, bed.last, true) });
  const countryOf = id => countries.get(farmRow(id)?.country) ?? null;
  /** The fit of a crop on a bed as its country judges it; a bed whose country has no rules is 0. */
  function fitOf(id, cropId, bed, at) {
    const rules = countryOf(id);
    if (!rules) return 0;
    try { return clampFit(rules.fit(id, cropId, freeze({ ...farmRow(id), heart: bed.heart, last: bed.last, since: bed.since ?? null, playSeconds: at }))); }
    catch { return 0; }
  }

  const now = playSeconds => Math.max(0, Number(playSeconds === undefined && typeof clock === 'function' ? clock() : playSeconds) || 0);
  const pay = amount => {
    if (!(amount > 0)) return null;
    if (!skills?.known?.(FARMING_SKILL) && skills?.learn?.(FARMING_SKILL)?.ok !== true) return null;
    return skills?.gain?.(FARMING_SKILL, amount) ?? null;
  };

  /** Stanley's introduction supplies seed; practical farming is also possible before meeting him. */
  function learn() {
    if (state.met) return { ok: true, first: false };
    state.met = true;
    skills?.learn?.(FARMING_SKILL);
    stockSeeds();
    onEvent({ type: 'farming-learned' });
    return { ok: true, first: true };
  }

  const level = () => skills?.level?.(FARMING_SKILL) ?? 1;

  /**
   * The commons supplies seed for practice; topping up never duplicates a full packet. Given a
   * bed (or a country's name), the bench there also hands out that country's own seed, so the
   * seed benches on the Caricas farms keep rye, beans and canes as they keep carrots.
   */
  function stockSeeds(where = null) {
    const bed = farmRow(where), region = bed ? bed.country : regionKey(where);
    const added = [];
    for (const kind of Object.values(CROPS)) {
      const regions = cropRegions(kind.id);
      if (kind.sown === false || level() < kind.level || (regions && !regions.includes(region))) continue;
      const quantity = Math.max(0, SEED_PACKET_SIZE - (inventory?.count?.(kind.seed) ?? 0));
      if (quantity && inventory?.add?.(kind.seed, quantity)) added.push({ id: kind.seed, quantity });
    }
    onEvent({ type: 'farm-seeds', added });
    return { ok: true, added };
  }

  /** What a bed remembers. A bare bed's heart counts the whole game days it has rested. */
  const memory = id => state.beds.get(id) ?? { heart: HEART_DEFAULT, last: null, since: null };
  const rested = (bed, at) => bed.since === null ? bed.heart : clampHeart(bed.heart + Math.floor(Math.max(0, at - bed.since) / REST_SECONDS));
  const remember = (id, bed) => {
    if (bed.heart === HEART_DEFAULT && bed.last === null && bed.since === null) state.beds.delete(id);
    else state.beds.set(id, bed);
  };

  /** Where a row stands at a moment of play: bare, sown and growing, or ripe. */
  function rowState(id, playSeconds) {
    const here = farmRow(id);
    if (!here) return null;
    const at = now(playSeconds), bed = memory(id), sown = state.rows.get(id);
    if (!sown) return { ...here, stage: 'bare', crop: null, sownAt: null, ripeAt: null, left: 0, progress: 0, watered: false, heart: rested(bed, at), last: bed.last };
    const kind = CROPS[sown.crop], duration = kind.seconds * (sown.watered ? WATERED_GROWTH : 1);
    // A bed Quickened (src/magic.js) is ripe from that moment, whatever its clock says.
    const ripeAt = sown.ripened ? Math.min(at, sown.sownAt + duration) : sown.sownAt + duration, left = sown.ripened ? 0 : Math.max(0, ripeAt - at);
    const fit = sown.fit ?? fitOf(id, kind.id, bed, sown.sownAt), regarded = !!sown.regarded;
    const grade = gradeFor(gradePoints({ fit, watered: !!sown.watered, level: level(), regarded }), level());
    return { ...here, stage: left > 0 ? 'sown' : 'ripe', crop: kind.id, cropName: kind.name, sownAt: sown.sownAt, ripeAt, left,
      progress: sown.ripened ? 1 : Math.max(0, Math.min(1, (at - sown.sownAt) / duration)), watered: !!sown.watered, ...(sown.ripened ? { ripened: true } : {}),
      quantity: kind.yield + (sown.watered ? 1 : 0), heart: bed.heart, last: bed.last, fit, regarded, grade, xp: Math.round(kind.xp * GRADE_XP[grade]) };
  }

  /** What a row may be sown with now: the crops the level opens and the ground grows, and nothing on a row in use. */
  function sowable(id) {
    if (state.rows.has(id) || !farmRow(id)) return [];
    return CROP_IDS.filter(cropId => level() >= CROPS[cropId].level && growsOn(cropId, id))
      .map(cropId => ({ ...CROPS[cropId], seeds: inventory?.count?.(CROPS[cropId].seed) ?? 0 }));
  }

  /**
   * `free` is a country growing something itself (meadow hay after a draw-off): no seed is taken and
   * a crop that is never sown may go in. `working` names a field working (the Work of Nine) that did
   * the sowing, so the host can show one notice for the lot.
   */
  function sow(id, cropId, playSeconds, { free = false, working = null } = {}) {
    // The user's ruling of 21 September 2026: no introduction is needed to do a thing. The
    // teacher is still worth meeting; he is no longer the door.
    if (!farmRow(id)) return { ok: false, reason: 'There is no such row.' };
    if (state.rows.has(id)) return { ok: false, reason: 'Something is already in that row.' };
    const kind = crop(cropId);
    if (!kind) return { ok: false, reason: 'There is no such seed.' };
    if (!belongsOn(kind.id, id)) return { ok: false, reason: `${kind.name} grow${kind.name.endsWith('s') ? '' : 's'} only on the ${cropRegions(kind.id).map(titleCase).join(' or ')} farms.` };
    if (!free && kind.sown === false) return { ok: false, reason: `${kind.name} is not sown. The ground grows it when it is ready.` };
    if (!free && level() < kind.level) return { ok: false, reason: `${kind.name} wants farming level ${kind.level}.` };
    if (!free && inventory?.remove && !inventory.remove(kind.seed, 1)) return { ok: false, reason: `You need ${kind.name.toLowerCase()} seed. Take a seed packet from the shared bin beside the beds.` };
    const at = now(playSeconds), bed = memory(id), rotation = rotates(id);
    // The rest a bare bed has had is banked when it is sown; growing, it rests no more.
    const heart = rested(bed, at);
    remember(id, { heart, last: bed.last, since: null });
    const regarded = rotation && foxRegards(id, at);
    // The country judges the fit now, and the planting keeps it (6 October 2026).
    const judged = !!countryOf(id) && !countryOf(id).atHarvest, fit = fitOf(id, kind.id, { heart, last: bed.last, since: null }, at);
    state.rows.set(id, { crop: kind.id, sownAt: at, ...(regarded ? { regarded: true } : {}), ...(judged ? { fit } : {}) });
    try { countryOf(id)?.onPlant?.(id, kind.id); } catch { /* a country's listener never stops the sowing */ }
    onEvent({ type: 'row-sown', row: id, crop: kind.id, ripeAt: at + kind.seconds, fit, regarded, ...(working ? { working } : {}) });
    return { ok: true, row: id, crop: kind.id, ripeAt: at + kind.seconds, seconds: kind.seconds, fit, regarded };
  }

  /** Sow every bare bed of `ids` that will take the crop, while the seed lasts (the Work of Nine). */
  function sowAll(ids, cropId, playSeconds, options = {}) {
    const sown = [], refused = [];
    for (const id of [].concat(ids ?? [])) {
      if (rowState(id, playSeconds)?.stage !== 'bare') continue;
      const result = sow(id, cropId, playSeconds, options);
      if (result.ok) sown.push(id); else refused.push({ id, reason: result.reason });
    }
    return { ok: sown.length > 0, sown, count: sown.length, refused,
      ...(sown.length ? {} : { reason: refused[0]?.reason ?? 'No bare bed there wants that seed.' }) };
  }

  /** The working Quicken (design §3): a growing bed is ripe at once. Once a game day is the working's rule, not the farm's. */
  function ripen(id, playSeconds) {
    const here = rowState(id, playSeconds);
    if (!here) return { ok: false, reason: 'There is no such row.' };
    if (here.stage === 'bare') return { ok: false, reason: 'Nothing is growing there to ripen.' };
    if (here.stage === 'ripe') return { ok: false, reason: 'That bed is ripe already. Take the crop in.' };
    state.rows.get(id).ripened = true;
    onEvent({ type: 'row-ripened', row: id, crop: here.crop });
    return { ok: true, row: id, crop: here.crop, cropName: here.cropName };
  }

  /** One useful tending action per planting, with the commons watering can kept at each row. */
  function water(id, playSeconds) {
    const here = rowState(id, playSeconds);
    if (!here || here.stage !== 'sown') return { ok: false, reason: 'Water a planted row while it is growing.' };
    if (here.watered) return { ok: false, reason: 'This row has enough water. It needs time now.' };
    state.rows.get(id).watered = true;
    const gained = pay(WATERING_XP);
    const after = rowState(id, playSeconds);
    onEvent({ type: 'row-watered', row: id, crop: here.crop, xp: WATERING_XP, left: after.left,
      level: gained?.level ?? level(), levelled: !!gained?.levelled });
    return { ok: true, xp: WATERING_XP, left: after.left, quantity: after.quantity };
  }

  /**
   * Every sown, unwatered bed within `radius` metres of a point, watered at once (the working
   * Call the Dew, design §3). Each bed pays its watering experience as if done by hand.
   */
  function waterAllWithin(point, radius, playSeconds) {
    const x = Number(point?.x), z = Number(point?.z), reach = Number(radius);
    const watered = [];
    let xp = 0;
    if ([x, z, reach].every(Number.isFinite) && reach >= 0) for (const bed of ALL_FARM_ROWS) {
      if (Math.hypot(bed.x - x, bed.z - z) > reach || rowState(bed.id, playSeconds).stage !== 'sown') continue;
      const result = water(bed.id, playSeconds);
      if (result.ok) { watered.push(bed.id); xp += result.xp; }
    }
    return watered.length ? { ok: true, watered, count: watered.length, xp }
      : { ok: false, watered, count: 0, xp: 0, reason: 'No growing bed within reach wants water.' };
  }

  /**
   * A share taken at harvest (design §7.3). `handler(bedId, result)` is called with the harvest
   * as it stands, `{ crop, produce, count, grade, grown }`, where `count` is what is left after
   * any handler before it; it may return `{ taken, note }`, and that many units are withheld
   * before the rest reaches the satchel, or `{ added }` (6 October 2026, Airmid's harvest basket),
   * and that many more of the produce reach it. Returns a function that removes the handler.
   */
  function onHarvest(handler) {
    if (typeof handler !== 'function') return () => false;
    shares.add(handler);
    return () => shares.delete(handler);
  }

  /** The farmlands quest marks the planting the fox watched (design §5.1): one grade better. */
  function markRegarded(id) {
    const sown = state.rows.get(id);
    if (!farmRow(id)) return { ok: false, reason: 'There is no such row.' };
    if (!sown) return { ok: false, reason: 'Nothing is growing there for the fox to watch.' };
    const first = !sown.regarded;
    sown.regarded = true;
    if (first) onEvent({ type: 'row-regarded', row: id, crop: sown.crop });
    return { ok: true, row: id, crop: sown.crop, first };
  }

  /**
   * Reaping. It pays the experience and the crop, and the row goes back to bare — so the same
   * row may be sown again, which is what a working skill is. A row that is not ripe is not
   * reaped: waiting is the lesson. The harvest comes in at its grade, Fine and Prize as the fine
   * kind; shares are withheld before the rest is granted, and the bed remembers what it bore.
   */
  /**
   * `hand` names a hired hand who did the reaping (Messor on the North Farm): the crop is still
   * Rollo's, but the experience is not, since he did not do the work. `working` names the field
   * working that did it (the Work of Nine): the experience is his, and the host shows one notice.
   */
  function harvest(id, playSeconds, { hand = null, working = null } = {}) {
    const here = rowState(id, playSeconds);
    // The user's ruling of 21 September 2026: no introduction is needed to do a thing. The
    // teacher is still worth meeting; he is no longer the door.
    if (!here) return { ok: false, reason: 'There is no such row.' };
    if (here.stage === 'bare') return { ok: false, reason: 'There is nothing in that row.' };
    if (here.stage === 'sown') return { ok: false, reason: `Not for another ${Math.ceil(here.left)} seconds. It grows whether you are watching it or not.` };
    const kind = CROPS[here.crop], grade = here.grade, produce = isFineGrade(grade) ? kind.fine : kind.item, grown = here.quantity;
    if (inventory?.add && !inventory.add(produce, grown)) return { ok: false, reason: 'There is no room for the harvest in your satchel. The crop is still in the row.' };
    let count = grown, taken = 0, added = 0;
    const notes = [];
    // The country's own hook first (6 October 2026), then the share-takers, in the order they came.
    const own = countryOf(id)?.onHarvest;
    for (const handler of [...(own ? [own] : []), ...shares]) {
      let share = null;
      try { share = handler(id, freeze({ crop: kind.id, produce, count, grade, grown })); } catch { share = null; }
      const withheld = Math.max(0, Math.min(count, Math.floor(Number(share?.taken) || 0)));
      count -= withheld; taken += withheld;
      // A handler may add to the harvest (Airmid's basket): the satchel takes the more, or nothing is added.
      const more = Math.max(0, Math.min(MOST_ADDED, Math.floor(Number(share?.added) || 0)));
      if (more && (!inventory?.add || inventory.add(produce, more))) { count += more; added += more; }
      if (typeof share?.note === 'string' && share.note) notes.push(share.note);
    }
    if (taken && inventory?.remove) inventory.remove(produce, taken);
    // A crop the ground grows by itself (meadow hay) gives no seed back.
    if (inventory?.add && kind.seed) inventory.add(kind.seed, 1);
    const heart = heartAfter(kind.id, here.heart);
    remember(id, { heart, last: kind.id, since: now(playSeconds) });
    state.rows.delete(id);
    state.reaped++;
    const xp = hand ? 0 : here.xp, gained = pay(xp);
    const result = { row: id, crop: kind.id, produce, count, grade, grown, taken, added, notes, item: produce, quantity: count, seed: kind.seed, xp,
      regarded: here.regarded, heart, levelled: !!gained?.levelled, level: gained?.level ?? level(), ...(hand ? { hand } : {}), ...(working ? { working } : {}) };
    onEvent({ type: 'row-reaped', ...result });
    return { ok: true, ...result };
  }

  /**
   * Every ripe bed of `ids` reaped in one act (the Work of Nine; Nesdor's strips are reaped three
   * beds at a time). Beds not ripe are passed over; a bed the satchel cannot take stays in the ground.
   */
  function harvestAll(ids, playSeconds, options = {}) {
    const results = [], refused = [];
    for (const id of [].concat(ids ?? [])) {
      if (rowState(id, playSeconds)?.stage !== 'ripe') continue;
      const result = harvest(id, playSeconds, options);
      if (result.ok) results.push(result); else refused.push({ id, reason: result.reason });
    }
    return { ok: results.length > 0, results, reaped: results.map(result => result.row), count: results.length,
      xp: results.reduce((sum, result) => sum + result.xp, 0), refused,
      ...(results.length ? {} : { reason: refused[0]?.reason ?? 'Nothing there is ripe.' }) };
  }

  /**
   * A bed read through the staff (the working Sound the Soil, design §3): its heart, its last
   * crop, the crops that would do best in it next, and the farmer's test from the lore — soil
   * that rolls into a cord and breaks is ready, soil that smears is too wet, soil that crumbles
   * has missed its moment. For a sown bed, `likes` answers for the sowing after this crop.
   */
  function describeBed(id, playSeconds) {
    const here = rowState(id, playSeconds);
    if (!here) return null;
    const rotation = rotates(id), rules = countryOf(id), heart = here.stage === 'bare' ? here.heart : heartAfter(here.crop, here.heart);
    const last = here.stage === 'bare' ? here.last : here.crop, at = now(playSeconds);
    // What would do best next is the country's own judgement (6 October 2026); Caricas's is the rotation.
    const fits = CROP_IDS.filter(cropId => growsOn(cropId, id)).map(cropId => [cropId, rules ? fitOf(id, cropId, { heart, last }, at) : 0]);
    const best = Math.max(0, ...fits.map(([, fit]) => fit));
    const likes = best ? fits.filter(([, fit]) => fit === best).map(([cropId]) => cropId) : [];
    const readiness = here.stage === 'bare' ? 'ready' : here.stage === 'sown' && here.watered ? 'wet' : 'passed';
    const names = likes.map(cropId => CROPS[cropId].name.toLowerCase());
    const named = names.length > 1 ? `${names.slice(0, -1).join(', ')} or ${names.at(-1)}` : names[0];
    const ground = `The ground here is ${HEART_WORDS[here.heart]}${here.stage !== 'bare' ? `, in ${CROPS[here.crop].name.toLowerCase()} now`
      : here.last ? `, last in ${CROPS[here.last].name.toLowerCase()}` : ''}`;
    const wants = !rules ? 'what it grew before makes no odds to what it grows next'
      : likes.length ? `${named} would do best in it ${here.stage === 'bare' ? 'now' : 'after this crop'}`
      : rotation ? 'it wants beans or a day’s rest before it carries anything well' : 'nothing sown here would do well in it now';
    const test = readiness === 'ready' ? 'a pinch rolls into a cord and breaks when you bend it, so it is ready for seed'
      : readiness === 'wet' ? 'a pinch smears between your fingers, too wet to work, so leave it to grow'
      : here.stage === 'ripe' ? 'a pinch crumbles, the moment has passed, so take the crop in'
      : 'a pinch crumbles, the moment has passed, so give it water';
    let own = null;
    try { own = rules?.describe?.(id, freeze({ ...farmRow(id), ...here, playSeconds: at })) ?? null; } catch { own = null; }
    const text = typeof own === 'string' && own.trim() ? own.trim() : typeof own?.text === 'string' && own.text.trim() ? own.text.trim() : `${ground}; ${wants}; ${test}.`;
    return { heart: here.heart, last: here.last, likes, readiness, text };
  }

  /** A kept tree at a moment of play: in fruit, or bearing again in so many seconds. */
  function treeState(id, playSeconds) {
    const tree = treeIndex.get(id);
    if (!tree) return null;
    const picked = state.trees.get(id);
    const left = picked === undefined ? 0 : Math.max(0, picked + tree.regrow - now(playSeconds));
    return { ...tree, stage: left > 0 ? 'picked' : 'fruiting', pickedAt: picked ?? null, left };
  }

  /** Picking is farming with no sowing: somebody else kept the tree and you take what it has. */
  function pick(id, playSeconds) {
    const tree = treeState(id, playSeconds);
    // The user's ruling of 21 September 2026: no introduction is needed to do a thing. The
    // teacher is still worth meeting; he is no longer the door.
    if (!tree) return { ok: false, reason: 'There is no such tree.' };
    if (tree.stage === 'picked') return { ok: false, reason: `This one is picked out. It will bear again in about ${Math.ceil(tree.left)} seconds.` };
    if (level() < tree.level) return { ok: false, reason: `This tree wants farming level ${tree.level}.` };
    // Graded by the picker's hand (`pickGrade`, 6 October 2026): Fine and Prize come in as the tree's fine kind.
    const grade = pickGrade(tree, level()), item = isFineGrade(grade) ? tree.fine : tree.item, xp = Math.round(tree.xp * GRADE_XP[grade]);
    if (inventory?.add && !inventory.add(item, 1)) return { ok: false, reason: `There is no room for ${tree.item === ORCHARD_ITEM ? 'the apple' : 'it'} in your satchel. It is still on the tree.` };
    state.trees.set(id, now(playSeconds));
    const gained = pay(xp);
    onEvent({ type: 'tree-picked', tree: id, item, grade, xp, country: tree.country ?? null, level: gained?.level ?? level(), levelled: !!gained?.levelled });
    return { ok: true, tree: id, item, grade, quantity: 1, xp, levelled: !!gained?.levelled, level: gained?.level ?? level() };
  }

  /** The whole farm at a moment of play, for the journal and for whoever draws the rows. */
  function view(playSeconds) {
    const rows = ALL_FARM_ROW_IDS.map(id => rowState(id, playSeconds));
    const trees = ORCHARD_TREE_IDS.map(id => treeState(id, playSeconds));
    return { met: state.met, level: level(), reaped: state.reaped, rows, trees,
      sown: rows.filter(entry => entry.stage === 'sown').length,
      ripe: rows.filter(entry => entry.stage === 'ripe').length,
      fruiting: trees.filter(entry => entry.stage === 'fruiting').length, crops: CROP_IDS.map(id => ({ ...CROPS[id] })) };
  }

  /** What the traveler would write in his own notes: the one skill with a clock of its own. */
  function task(playSeconds) {
    if (!state.met) return { title: 'The commons garden', detail: 'Stanley teaches Farming beside the four rows at the Avrel clearing. He shares seeds and recipes. The garden is optional; you can plant before taking his lesson.' };
    const here = view(playSeconds);
    if (here.ripe) return { title: `${here.ripe} row${here.ripe === 1 ? '' : 's'} ripe`, detail: 'Return to your planted beds to harvest. Each row can be replanted immediately.' };
    if (here.sown) {
      const soonest = Math.ceil(Math.min(...here.rows.filter(entry => entry.stage === 'sown').map(entry => entry.left)));
      return { title: 'Sown and growing', detail: `About ${soonest} seconds on the soonest row. It grows whether you are watching it or not; go and do something else.` };
    }
    return { title: 'Ready to plant', detail: 'Choose sunflowers, carrots or barley; beets unlock at level 2 and Drent leaf at level 5. Water a growing row once for an earlier, larger harvest. Shared bins beside the beds supply replacement seeds.' };
  }

  function snapshot() {
    return { version: FARMING_VERSION, met: state.met, reaped: state.reaped,
      rows: Object.fromEntries([...state.rows].map(([id, sown]) => [id, { crop: sown.crop, sownAt: round(sown.sownAt), ...(sown.watered ? { watered: true } : {}), ...(sown.regarded ? { regarded: true } : {}),
        ...(sown.fit === undefined ? {} : { fit: sown.fit }), ...(sown.ripened ? { ripened: true } : {}) }])),
      beds: Object.fromEntries([...state.beds].map(([id, bed]) => [id, { heart: bed.heart, last: bed.last, ...(bed.since === null ? {} : { since: round(bed.since) }) }])),
      trees: Object.fromEntries([...state.trees].map(([id, at]) => [id, round(at)])) };
  }

  /** Version 1 has no `beds`: every bed in it comes back at heart 2, remembering nothing. */
  function restore(data) {
    state.met = false; state.rows.clear(); state.beds.clear(); state.trees.clear(); state.reaped = 0;
    if (!validateFarmingSnapshot(data, { allowMissing: false })) return false;
    state.met = data.met; state.reaped = data.reaped;
    const current = data.version === FARMING_VERSION;
    for (const [id, sown] of Object.entries(data.rows)) state.rows.set(id, { crop: sown.crop, sownAt: sown.sownAt, ...(sown.watered ? { watered: true } : {}), ...(sown.regarded === true && current ? { regarded: true } : {}),
      ...(current && sown.fit !== undefined ? { fit: sown.fit } : {}), ...(current && sown.ripened === true ? { ripened: true } : {}) });
    if (data.version === FARMING_VERSION) for (const [id, bed] of Object.entries(data.beds)) remember(id, { heart: bed.heart, last: bed.last, since: bed.since ?? null });
    for (const [id, at] of Object.entries(data.trees)) state.trees.set(id, at);
    return true;
  }

  return { learn, sow, sowAll, water, waterAllWithin, stockSeeds, harvest, reap: harvest, harvestAll, ripen, onHarvest, markRegarded, describeBed, pick, sowable, view, task, rowState, treeState, snapshot, restore,
    // The groundwork for Builds 2 to 5 (6 October 2026). The registries are the module's; the farm passes them through.
    registerCountry, registerRows, registerCrops, registerTrees, farmRowsNear, farmsteadRows, countries: () => [...countries.keys()],
    get met() { return state.met; }, get reaped() { return state.reaped; } };
}

/** Stanley's first lesson. Tools at the shared beds are not inventory prerequisites. */
export const FARMING_LESSON = freeze([
  'Choose a bare bed and press F. Carrots are a quick first crop, barley is useful for supper, and better practice opens beets at level 2 and Drent leaf at level 5. I share the seed packets; each harvest saves another packet for the next sowing.',
  'Water the growing bed once with our shared can. It earns a little Farming experience, grows a quarter faster and gives one extra crop. Then go and do something else. The plants grow while you are somewhere else, but wait when you pause or close the game.',
  'Return when the crop is ready and press F to harvest. Every harvest earns Farming experience, and that bed can go straight back in. Eat a carrot or beet from your satchel with I, or ask me about Cooking and turn the harvest into a proper meal at the fire beside us.',
]);

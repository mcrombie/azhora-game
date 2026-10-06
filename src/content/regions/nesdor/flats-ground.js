/**
 * **Right crop, right ground**: the Nesdor way of farming for the Farmlands of the Lizeem
 * (docs/lizeem-farmlands-design.md 5.3 and 7; the user's design of 5 October 2026, built 6 October 2026).
 *
 * The strips of the Flats lie at different heights above the braided water (src/content/regions/nesdor/nesdor-farm.js lays them
 * out). The wet strip is still wet, and nothing sown there thrives; the bench just above it flooded in
 * spring and has drained, and that is floodwheat's ground ("it likes wet feet in memory, not in fact");
 * rye takes the dry rise, where it prefers a little hardship; barley does in the middle. The right crop
 * on the right strip can come up Fine and the wrong one cannot, and the beginner's mistake, floodwheat on
 * the wet strip because of its name, is the first thing Baugi warns against.
 *
 * Here: the country's fit and its Sound the Soil reading (`registerNesdorFarming`), floodwheat, Idunn's
 * hazel coppice, the long strip that Baugi lends at Farming 24 (`unlockLong`), the reaping of a whole
 * strip in one act and Bolverk's match (`createReaping`), and the goods, dishes and recipes that the
 * satchel, the larder and the kitchen take in (`NESDOR_ITEMS`, `NESDOR_FOODS`, `NESDOR_RECIPES`).
 *
 * Imports only the farm and the Nesdor coordinates, never the satchel, the kitchen or the larder, so
 * src/gameplay/inventory/inventory.js, src/gameplay/skills/crafting/cooking.js and src/gameplay/inventory/consumables.js can each spread a list from here. Pure: no DOM, no Three.
 */
import { farmRow, registerRows } from '../../../gameplay/skills/farming/farming.js';
import { NESDOR_BED, NESDOR_COUNTRY, NESDOR_FARM_ROWS, NESDOR_HAZEL_TREES, NESDOR_STRIPS, nesdorStrip } from './nesdor-farm.js';

const freeze = Object.freeze;
const titleCase = text => `${text[0].toUpperCase()}${text.slice(1)}`;

// ---------------------------------------------------------------------------
// The ground
// ---------------------------------------------------------------------------
/**
 * The three heights of the Flats, as Sound the Soil reads them and as Baugi reads them by the dock
 * leaves (design 6.5: "reads the ground by the colour of the dock leaves").
 */
export const NESDOR_GROUNDS = freeze({
  wet: freeze({ id: 'wet', name: 'wet strip', crop: null,
    // The readings say what src/content/regions/nesdor/nesdor-farm-scenery.js dresses each strip with, and what Baugi reads off it
    // (src/content/quests/lizeem-farmlands/lizeem-nesdor-people.js STRIP_LESSON): rushes and red-stemmed dock on the wet, broad green dock on the
    // cracking silt of the bench, yellowing dock among stones on the rise (settled at integration, 6 October 2026).
    reading: 'A wet strip by the braid: water stands in every footprint, rushes grow between the beds, and the dock is red at the stem.',
    best: 'Nothing sown here thrives. Floodwheat least of all, whatever its name says: it wants wet feet in memory, not in fact.' }),
  bench: freeze({ id: 'bench', name: 'drained bench', crop: 'floodwheat',
    reading: 'A drained bench: wet feet in memory, not in fact. The spring flood lay on it and has gone, the silt crust is cracking, and the dock grows broad and green.',
    best: 'This is floodwheat’s ground; if the field flatters rye, plant wheat. Barley would do here.' }),
  rise: freeze({ id: 'rise', name: 'dry rise', crop: 'bridge-rye',
    reading: 'A dry rise the water never reaches: thin, hard ground among stones, and the dock small and yellowing.',
    best: 'This is rye’s ground, and rye likes a little hardship. Barley would do here; floodwheat would stand thin.' }),
});
export const NESDOR_GROUND_IDS = freeze(Object.keys(NESDOR_GROUNDS));

/**
 * The fit of a crop on each height (the contract for Builds 2 and 3): floodwheat wants the bench, rye
 * the rise, barley the middle (bench or rise give 1). Anything on the wet is 0, and a crop that is not
 * the Flats' own (carrots, beets) is 0 everywhere: it comes up as it would on the commons.
 */
export const NESDOR_FIT = freeze({
  floodwheat: freeze({ wet: 0, bench: 2, rise: 1 }),
  'bridge-rye': freeze({ wet: 0, bench: 1, rise: 2 }),
  barley: freeze({ wet: 0, bench: 1, rise: 1 }),
});
export const nesdorFit = (cropId, ground) => (ground === 'wet' ? 0 : NESDOR_FIT[cropId]?.[ground] ?? 0);

const CROP_NAMES = freeze({ floodwheat: 'Floodwheat', 'bridge-rye': 'Bridge rye', barley: 'Barley' });
/**
 * What Sound the Soil reads on a Nesdor bed (`farming.describeBed`): the ground, what suits it, and,
 * for a sown bed, whether what is in it is the right crop. `bed` is the bed as the farm sees it.
 */
export function describeNesdorBed(bed) {
  const ground = NESDOR_GROUNDS[bed?.ground];
  if (!ground) return 'Flats ground, neither wet nor dry enough to say what it wants.';
  const lines = [ground.reading, ground.best];
  if (bed.stage && bed.stage !== 'bare' && bed.crop) {
    const name = bed.cropName ?? CROP_NAMES[bed.crop] ?? titleCase(bed.crop), fit = Number.isInteger(bed.fit) ? bed.fit : nesdorFit(bed.crop, bed.ground);
    lines.push(fit === 2 ? `${name} is in it now, on the right ground.`
      : fit === 1 ? `${name} is in it now: it will stand, but not as it would on its own ground.`
      : bed.ground === 'wet' ? `${name} is in it now, and the wet has it: it will come up thin.`
      : `${name} is in it now, and this is no ground for it.`);
  }
  return lines.join(' ');
}

// ---------------------------------------------------------------------------
// Floodwheat and the hazel
// ---------------------------------------------------------------------------
/**
 * Floodwheat (the contract: level 8, six minutes, 60 experience, two a bed). The lore's tax grain.
 * Its look, for src/gameplay/skills/farming/farming-view.js: bronze bearded heads, the awns long and dark, standing a little
 * taller than barley and ripening from blue-green through gold to bronze.
 */
export const FLOODWHEAT = freeze({ id: 'floodwheat', name: 'Floodwheat', seconds: 360, xp: 60, level: 8, item: 'floodwheat', yield: 2,
  seed: 'floodwheat-seed', kind: 'grain', heart: 'any', region: NESDOR_COUNTRY,
  note: 'The bearded wheat of the Nesdor Flats, and the river’s tax grain. It wants a drained bench, wet feet in memory, not in fact: on the wet strip nothing thrives, and on the dry rise it stands thin.' });

/** Idunn's six stools: hazelnuts at Farming 12, bearing again ten minutes after they are picked. */
export const HAZEL_REGROW = 600;
export const HAZEL_LEVEL = 12;
// `fine`: the coppice is graded by the picker's hand (src/gameplay/skills/farming/farming.js `pickGrade`: Fine at Farming 16, Prize at 20;
// settled at integration, 6 October 2026), so the Measure's hazelnut line and the fine nut cake can be reached.
export const NESDOR_HAZELS = freeze(NESDOR_HAZEL_TREES.map(tree => freeze({ ...tree, item: 'hazelnuts', fine: 'hazelnuts-fine', regrow: HAZEL_REGROW, level: HAZEL_LEVEL })));

// ---------------------------------------------------------------------------
// The strips, and the long strip Baugi lends
// ---------------------------------------------------------------------------
export const LONG_STRIP = 'nesdor-long';
export const LONG_STRIP_LEVEL = 24;
export const LONG_STRIP_LOCKED = 'Baugi’s long strip. He lends it to a farmer who has finished his work at Ninehands and reached Farming 24.';
const LONG_ROWS = freeze(NESDOR_FARM_ROWS.filter(row => row.strip === LONG_STRIP));
const LONG_IDS = new Set(LONG_ROWS.map(row => row.id));
const NINEHANDS_ROWS = freeze(NESDOR_FARM_ROWS.filter(row => !LONG_IDS.has(row.id)));

/**
 * The farm has no lock of its own, so the long strip's is kept here (6 October 2026). Its six beds are
 * registered at start-up with the rest, so a save that has worked them always validates and the farm
 * view draws them, and they stay shut until `unlockLong`. `bedOpen` is what the host asks before it
 * offers a long bed to sow or reap. Registering without them (`{ long: false }`) leaves them out of the
 * farm altogether, and `unlockLong` adds them when it opens the strip.
 */
let longOpen = false;
export const longUnlocked = () => longOpen;
export const bedOpen = bedId => !!farmRow(bedId) && (!LONG_IDS.has(bedId) || longOpen);
const stripOpen = strip => !!strip && strip.beds.every(id => farmRow(id)) && (strip.id !== LONG_STRIP || longOpen);
/** Opens the long strip (the Nesdor arc's reward). Given a level, it refuses a farmer below Farming 24. */
export function unlockLong({ level } = {}) {
  if (Number.isFinite(level) && level < LONG_STRIP_LEVEL) return { ok: false, reason: LONG_STRIP_LOCKED };
  const added = registerRows(LONG_ROWS).added, first = !longOpen;
  longOpen = true;
  return { ok: true, first, rows: LONG_ROWS.map(row => row.id), added };
}
/** Shuts it again: a new game, or a save in which Baugi has not lent it. The beds stay registered. */
export function lockLong() { const was = longOpen; longOpen = false; return was; }

/**
 * Nesdor's way of farming, its crop, its coppice and its beds, at start-up: after the farm is made,
 * before src/gameplay/skills/farming/farming-view.js draws the beds and before any save is read. Safe to call again.
 */
export function registerNesdorFarming(farming, { long = true } = {}) {
  const country = farming.registerCountry(NESDOR_COUNTRY, {
    fit: (bedId, cropId, bed) => nesdorFit(cropId, bed?.ground),
    describe: (bedId, bed) => describeNesdorBed(bed),
  });
  const crops = farming.registerCrops([FLOODWHEAT]), trees = farming.registerTrees(NESDOR_HAZELS);
  const rows = farming.registerRows(long ? NESDOR_FARM_ROWS : NINEHANDS_ROWS);
  const refused = [...crops.refused, ...trees.refused, ...rows.refused];
  return { ok: country && refused.length === 0, country: NESDOR_COUNTRY, crops: crops.added, trees: trees.added, rows: rows.added, refused };
}

/** The strip whose end post is nearest a point, within `reach` metres: `{ id, name, end, distance, open }`, or null. */
export function stripEndNear(point, reach = 3) {
  const x = Number(point?.x), z = Number(point?.z);
  if (!Number.isFinite(x) || !Number.isFinite(z)) return null;
  let best = null;
  for (const strip of NESDOR_STRIPS) {
    if (!strip.beds.every(id => farmRow(id))) continue;
    for (const end of ['start', 'end']) {
      const distance = Math.hypot(strip[end].x - x, strip[end].z - z);
      if (distance <= reach && (!best || distance < best.distance)) best = { id: strip.id, name: strip.name, end, distance, open: stripOpen(strip) };
    }
  }
  return best;
}
/** Whether a point is on a strip, within `slack` metres of its beds: a reaper who leaves it stops reaping. */
export function alongStrip(stripId, point, slack = 2.5) {
  const strip = nesdorStrip(stripId), x = Number(point?.x), z = Number(point?.z);
  return !!strip && x >= strip.start.x - slack && x <= strip.end.x + slack && Math.abs(z - strip.z) <= NESDOR_BED.across / 2 + slack;
}

// ---------------------------------------------------------------------------
// Reaping, and Bolverk's match
// ---------------------------------------------------------------------------
/** A strip is reaped in one act, two seconds a bed (the contract); Bolverk reaps one in five. */
export const REAP_SECONDS_PER_BED = 2;
/**
 * The match (settled at integration, 6 October 2026): Bolverk takes five seconds over a strip, and it is won
 * only by a reap that takes no longer, with no margin. A walk takes six (three beds, two seconds each), so the
 * walk always loses, as Bolverk says it will; *the Work of Nine*, which takes no time at all, wins it.
 */
export const BOLVERK_SECONDS = 5;
export const MATCH_MARGIN = 0;
const round = value => Math.round(value * 100) / 100;

/**
 * The reaping walk (design 5.3, step 3): Rollo takes the scythe down a whole strip, and its ripe beds
 * come in together through `farming.harvestAll`. As a hold action it is `begin(stripId)`, then
 * `progress(now)` each frame until it is `done`, then `finish()`; `cancel()` stops it and leaves the
 * crop standing. Time is play time from `clock` (or the `t` given), so a menu or a pause holds it, and
 * the time Rollo is credited with is from `begin` to `finish`. Nothing here is saved: a reap half done
 * when the game is saved is not one, as a half-finished study at Sylvia's easel is not.
 */
export function createReaping({ farming, clock = null, onEvent = () => {} } = {}) {
  let active = null, last = null;
  const now = t => Math.max(0, Number(t === undefined && typeof clock === 'function' ? clock() : t) || 0);
  const timeFor = stripId => { const strip = nesdorStrip(stripId); return strip ? strip.beds.length * REAP_SECONDS_PER_BED : null; };
  const ripeIn = (strip, at) => strip.beds.filter(id => farming.rowState(id, at)?.stage === 'ripe');

  /** Why a strip cannot be reaped now, or null. */
  function refusal(strip, at) {
    if (!strip) return 'There is no such strip.';
    if (!stripOpen(strip)) return strip.id === LONG_STRIP ? LONG_STRIP_LOCKED : 'That strip is not part of the farm.';
    return ripeIn(strip, at).length ? null : `Nothing on ${strip.name} is ripe yet.`;
  }

  /** The whole strip in one act: the act of `finish`, or a host's that needs no walk. `seconds` is the time it took. */
  function reapStrip(stripId, t, { seconds } = {}) {
    const strip = nesdorStrip(stripId), at = now(t), reason = refusal(strip, at);
    if (reason) return { ok: false, strip: stripId ?? null, reason };
    const taken = round(Number.isFinite(seconds) && seconds >= 0 ? seconds : timeFor(strip.id));
    const harvest = farming.harvestAll(strip.beds, at);
    if (!harvest.ok) return { ok: false, strip: strip.id, reason: harvest.reason };
    last = { strip: strip.id, seconds: taken, count: harvest.count, at };
    const result = { ok: true, strip: strip.id, name: strip.name, seconds: taken, count: harvest.count, reaped: harvest.reaped, results: harvest.results, xp: harvest.xp, refused: harvest.refused };
    onEvent({ type: 'strip-reaped', strip: strip.id, seconds: taken, count: harvest.count, reaped: harvest.reaped, xp: harvest.xp });
    return result;
  }

  function begin(stripId, t) {
    if (active) return { ok: false, reason: 'You are reaping already.' };
    const strip = nesdorStrip(stripId), at = now(t), reason = refusal(strip, at);
    if (reason) return { ok: false, strip: stripId ?? null, reason };
    active = { strip: strip.id, startedAt: at, seconds: timeFor(strip.id) };
    onEvent({ type: 'reap-started', strip: strip.id, seconds: active.seconds });
    return { ok: true, strip: strip.id, name: strip.name, seconds: active.seconds };
  }

  /** How far down the strip the scythe is: `{ strip, elapsed, seconds, fraction, beds, done }`, or null when not reaping. */
  function progress(t) {
    if (!active) return null;
    const elapsed = Math.max(0, now(t) - active.startedAt), fraction = Math.min(1, elapsed / active.seconds);
    return { strip: active.strip, elapsed: round(elapsed), seconds: active.seconds, fraction,
      beds: Math.min(nesdorStrip(active.strip).beds.length, Math.floor(elapsed / REAP_SECONDS_PER_BED)), done: fraction >= 1 };
  }

  /** The end of the walk: the strip comes in, if the scythe has been all the way down it. */
  function finish(t) {
    const here = progress(t);
    if (!here) return { ok: false, reason: 'You are not reaping.' };
    if (!here.done) return { ok: false, reason: `Keep going: ${Math.ceil(here.seconds - here.elapsed)} more seconds to the end of the strip.`, progress: here };
    active = null;
    const result = reapStrip(here.strip, t, { seconds: here.elapsed });
    if (!result.ok) onEvent({ type: 'reap-cancelled', strip: here.strip, reason: result.reason });
    return result;
  }

  function cancel(reason = 'interrupted') {
    if (!active) return false;
    const strip = active.strip;
    active = null;
    onEvent({ type: 'reap-cancelled', strip, reason });
    return true;
  }

  /** Whether Rollo's last reap came within `margin` seconds of Bolverk's time (or `against`); by default, no slower than he is. */
  function match({ against = BOLVERK_SECONDS, margin = MATCH_MARGIN } = {}) {
    return !!last && Number.isFinite(against) && last.seconds <= against + margin;
  }

  return { reapStrip, begin, progress, finish, cancel, timeFor, match,
    /** The reap under way, as Sylvia's easel shows a study: `{ strip, progress }`, or null. */
    pose: t => { const here = progress(t); return here ? { strip: here.strip, progress: here.fraction } : null; },
    /** Whether the reaper is still on the strip he is reaping. */
    along: (point, slack) => !!active && alongStrip(active.strip, point, slack),
    lastReap: () => (last ? { ...last } : null) };
}

// ---------------------------------------------------------------------------
// The goods: satchel entries, foods and recipes
// ---------------------------------------------------------------------------
/**
 * The satchel's entries for Nesdor (spread into `INVENTORY_ITEMS`, src/gameplay/inventory/inventory.js). `hazelnuts` and
 * `honeycomb` are not here: both are already satchel foods (the Drent forage at 15 and the bee-fold's
 * comb), and the coppice and Beyla give the same items. Fine hazelnuts are kept for the Measure and
 * the fine cake, not eaten on the road, so they are a harvest rather than a food.
 */
const item = entry => freeze(entry);
export const NESDOR_ITEMS = freeze({
  floodwheat: item({ name: 'Floodwheat', type: 'Material', icon: 'grain', stackable: true,
    brief: 'A sheaf of bearded floodwheat off the Nesdor benches. Bread, not a meal as it stands.',
    description: 'The wheat of the Flats, bronze in the ear with long dark beards, and the grain the river’s courts once took as tax. Two sheaves make a white loaf, and one goes into a nut cake.' }),
  'floodwheat-fine': item({ name: 'Fine floodwheat', type: 'Material', icon: 'grain', stackable: true,
    brief: 'Floodwheat from a drained bench, heavy in the ear. Cooks into the fine kind of a dish.',
    description: 'A Fine harvest of floodwheat, sown on the bench where the flood has been and gone. This is what the Measure of the River asks of Nesdor.' }),
  'floodwheat-seed': item({ name: 'Floodwheat seed', type: 'Material', icon: 'seeds', stackable: true,
    brief: 'One packet sows one bed of floodwheat. Nesdor farms only, from Farming level 8.',
    description: 'From the seed bench at Ninehands. Floodwheat ripens after six minutes of active play and does best on a drained bench; on the wet strip nothing thrives, and on the dry rise it stands thin. Every harvest returns a packet.' }),
  'hazelnuts-fine': item({ name: 'Fine hazelnuts', type: 'Harvest', icon: 'nut', stackable: true,
    brief: 'Full, sound nuts off Idunn’s coppice, kept back for the measurer and the cake.',
    description: 'The best of a hazel picking: every shell full and none of them wormed. Too good to eat by the handful on the road; they go to the Measure, or two of them into a fine nut cake.' }),
  'white-bread': item({ name: 'White bread', type: 'Food', icon: 'loaf', stackable: true, eatName: 'slice of white bread',
    brief: 'A white loaf of Nesdor floodwheat. Restores up to 35 health.',
    description: 'Restores up to 35 health. Two sheaves of floodwheat ground fine and baked at a lit fire into the white bread the inns of the Way sell to travellers who can pay for it. Aegir buys it for the Counted Water.' }),
  'white-bread-fine': item({ name: 'Fine white bread', type: 'Food', icon: 'loaf', stackable: true, eatName: 'slice of fine white bread',
    brief: 'The white loaf, baked from Fine floodwheat. Restores up to 45 health.',
    description: 'Restores up to 45 health. The same loaf from Fine floodwheat: a crust that crackles as it cools and a crumb as close as cloth.' }),
  'nut-cake': item({ name: 'Nut cake', type: 'Food', icon: 'cake', stackable: true, eatName: 'slice of nut cake',
    brief: 'Hazelnuts, floodwheat and honey baked dense and sweet. Restores up to 50 health.',
    description: 'Restores up to 50 health. Two handfuls of hazelnuts, a sheaf of floodwheat and a comb of honey, baked at a lit fire into a heavy cake that keeps a week on the road. Idunn bakes it at the valley head.' }),
  'nut-cake-fine': item({ name: 'Fine nut cake', type: 'Food', icon: 'cake', stackable: true, eatName: 'slice of fine nut cake',
    brief: 'The nut cake from Fine nuts and Fine floodwheat. Restores up to 50 health.',
    description: 'Restores up to 50 health. A nut cake from Fine hazelnuts and Fine floodwheat, the kind a measurer seals and the temple kitchen pays most for.' }),
  ale: item({ name: 'Ale', type: 'Food', icon: 'mug', stackable: true, eatName: 'mug of ale', useVerb: 'Drink',
    brief: 'Aegir’s ale from the Counted Water. Restores up to 15 health.',
    description: 'Restores up to 15 health. Brewed at the Counted Water from Byggvir’s malt and the valley’s barley. The best drink on the river, says its brewer, and on the Nesdor Way nobody argues with him.' }),
  hides: item({ name: 'Cattle hides', type: 'Material', icon: 'slab', stackable: true,
    brief: 'A salted hide off one of the hardy Flats cattle.',
    description: 'A cattle hide from Egil’s herd, salted and folded hair-side in. It is a material, not food: a tanner or a saddler will want it.' }),
});
export const NESDOR_ITEM_IDS = freeze(Object.keys(NESDOR_ITEMS));

/** The larder's entries (spread into `FOODS`, src/gameplay/inventory/consumables.js): every Nesdor food above, with where it comes from. */
const food = (healing, missing) => freeze({ healing, missing });
export const NESDOR_FOODS = freeze({
  'white-bread': food(35, 'You have no white bread. Bake two floodwheat at a lit fire, once someone on the Flats has shown you how.'),
  'white-bread-fine': food(45, 'You have no fine white bread. Bake it from two Fine floodwheat.'),
  'nut-cake': food(50, 'You have no nut cake. Bake two hazelnuts, a floodwheat and a honeycomb at a lit fire, once Idunn has shown you how.'),
  // 50, not 60: tests/foods.test.js holds every food at 50 or less.
  'nut-cake-fine': food(50, 'You have no fine nut cake. Bake it from two Fine hazelnuts, a Fine floodwheat and a honeycomb.'),
  ale: food(15, 'You have no ale. Aegir pours it at the Counted Water, where the Nesdor Way meets the army’s line.'),
});

/**
 * The kitchen's entries (spread into `RECIPES`, src/gameplay/skills/crafting/cooking.js), in its shape: each dish has a fine form,
 * cooked from the fine kind of each crop in it and known as soon as the plain dish is. The honeycomb is
 * the beekeepers' own, Beyla's or Troy's, and has no fine kind.
 */
const recipe = (id, entry) => freeze({ id, ...entry, needs: freeze(entry.needs) });
export const NESDOR_RECIPES = freeze({
  'white-bread': recipe('white-bread', { name: 'White bread', xp: 30, needs: { floodwheat: 2 }, makes: 'white-bread', fine: 'white-bread-fine',
    note: 'Two sheaves of floodwheat, ground fine and baked at a lit fire into a white loaf. Restores up to 35 health.' }),
  'white-bread-fine': recipe('white-bread-fine', { name: 'Fine white bread', xp: 40, needs: { 'floodwheat-fine': 2 }, makes: 'white-bread-fine', fineOf: 'white-bread',
    note: 'The white loaf from two Fine floodwheat. Restores up to 45 health.' }),
  'nut-cake': recipe('nut-cake', { name: 'Nut cake', xp: 45, needs: { hazelnuts: 2, floodwheat: 1, honeycomb: 1 }, makes: 'nut-cake', fine: 'nut-cake-fine',
    note: 'Two handfuls of hazelnuts, a sheaf of floodwheat and a comb of honey, baked dense at a lit fire. Restores up to 50 health.' }),
  'nut-cake-fine': recipe('nut-cake-fine', { name: 'Fine nut cake', xp: 55, needs: { 'hazelnuts-fine': 2, 'floodwheat-fine': 1, honeycomb: 1 }, makes: 'nut-cake-fine', fineOf: 'nut-cake',
    note: 'The nut cake from two Fine hazelnuts, a Fine floodwheat and a comb of honey. Restores up to 50 health.' }),
});
export const NESDOR_RECIPE_IDS = freeze(Object.keys(NESDOR_RECIPES));

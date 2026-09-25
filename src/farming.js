/**
 * The optional Avrel commons garden: seed, tend, harvest and cook.
 * Growth reads active play seconds, so leaving the clearing keeps crops growing while menus,
 * pause and a closed game do not. Four established row IDs and version-1 saves stay compatible.
 * Stanley supplies seed; Enna keeps her independent mill errand. Pure model, no DOM or Three.
 */
import { APPLEGARTH_WORKS } from './rena.js';

const freeze = Object.freeze;

export const FARMING_VERSION = 1;
export const FARMING_SKILL = 'farming';
export const FARMER = freeze({ id: 'avrel-farmer', name: 'Stanley', role: 'Farmer of the Avrel clearing',
  modelRole: 'avrel-farmer', color: 0x6c7654, skin: 0xc7a477, x: -422, z: 58.5, yaw: -0.6,
  look: freeze({ hair: 0x191915, hairStyle: 'short', beard: false, eyes: 0x3b2e20 }) });
export const FARM_FIRE = freeze({ id: 'commons-fire', x: -421, z: 53, fireX: -419.5, fireZ: 53 });
export const SEED_PACKET_SIZE = 4;
export const WATERING_XP = 4;
export const WATERED_GROWTH = 0.75;

/**
 * What a row can be sown with. `seconds` is play-seconds from sowing to ripe, and the two
 * numbers are the design's: four minutes for barley, eight for the leaf (docs/drent-long-road.md
 * §5). `xp` is what reaping one row pays.
 */
export const CROPS = freeze({
  carrot: freeze({ id: 'carrot', name: 'Carrots', seconds: 90, xp: 22, level: 1, item: 'carrot', yield: 2, seed: 'carrot-seed',
    note: 'A quick first crop. Eat a carrot for 15 health, or simmer one with barley for a much heartier meal.' }),
  beet: freeze({ id: 'beet', name: 'Beets', seconds: 150, xp: 32, level: 2, item: 'beet', yield: 2, seed: 'beet-seed',
    note: 'Broad red-veined leaves and sweet roots. Eat one for 20 health, or roast it for 35.' }),
  barley: freeze({ id: 'barley', name: 'Barley', seconds: 240, xp: 24, level: 1, item: 'barley', yield: 2, seed: 'barley-seed',
    note: 'Four minutes of play from the drill to the sickle. The commons grows it for the mill, and the mill is the reason the commons exists.' }),
  'drent-leaf': freeze({ id: 'drent-leaf', name: 'Drent leaf', seconds: 480, xp: 45, level: 5, item: 'pipe-weed', yield: 1, seed: 'drent-leaf-seed',
    note: 'Twice as long and worth it. Half the good ground in Drent is under tobacco, and this is a row of it (src/pipeweed.js).' }),
});
export const CROP_IDS = freeze(Object.keys(CROPS));
export const crop = id => CROPS[id] ?? null;

/**
 * The rows, at the Mill Commons in the Avrel clearing, in world metres. Positions only: they are
 * the commons' own worked ground, laid out along the field edge east of where Enna stands, and
 * the first cut draws nothing new on them beyond a sown look and a ripe one.
 */
const row = (id, name, x, z) => freeze({ id, name, x, z });
export const FARM_ROWS = freeze([
  row('commons-row-1', 'The first commons row', -424.6, 62.4),
  row('commons-row-2', 'The second commons row', -428.2, 65.8),
  row('commons-row-3', 'The third commons row', -431.8, 69.2),
  row('commons-row-4', 'The far commons row', -435.4, 72.6),
]);
export const FARM_ROW_IDS = freeze(FARM_ROWS.map(entry => entry.id));
export const farmRow = id => FARM_ROWS.find(entry => entry.id === id) ?? null;

/** What one apple off a kept tree is worth, and how long the tree takes to bear again. */
export const ORCHARD_ITEM = 'avrel-apple';
export const ORCHARD_XP = 12;
export const ORCHARD_REGROW = 600;
/**
 * Applegarth's orchard: twenty-eight trees in rows south of the old road, kept rather than gone
 * wild, which is the whole difference between Applegarth and Rena. Their places are the village's
 * own (`APPLEGARTH_WORKS.orchard`), so the trees move only if the village does.
 */
export const ORCHARD_TREES = freeze(APPLEGARTH_WORKS.orchard.map((point, index) =>
  freeze({ id: `applegarth-tree-${index + 1}`, name: 'An Avrel apple tree', x: point.x, z: point.z })));
export const ORCHARD_TREE_IDS = freeze(ORCHARD_TREES.map(tree => tree.id));

const isPlainObject = value => !!value && typeof value === 'object' && !Array.isArray(value);
const seconds = value => Number.isFinite(value) && value >= 0 && value <= 1e8;

/**
 * A save that says otherwise is not one the farm wrote. Every time in it is a moment of play
 * that has already happened: a row sown in the future would be a row that never ripens, and a
 * tree picked in the future would be one that never bears again.
 */
export function validateFarmingSnapshot(data, { allowMissing = true, playSeconds = Infinity } = {}) {
  if (data === undefined) return allowMissing;
  if (!isPlainObject(data) || data.version !== FARMING_VERSION) return false;
  if (typeof data.met !== 'boolean' || !isPlainObject(data.rows) || !isPlainObject(data.trees)) return false;
  if (!Number.isInteger(data.reaped) || data.reaped < 0 || data.reaped > 1e7) return false;
  const rows = Object.entries(data.rows);
  if (rows.length > FARM_ROWS.length) return false;
  if (!rows.every(([id, sown]) => FARM_ROW_IDS.includes(id) && isPlainObject(sown)
    && Object.hasOwn(CROPS, sown.crop) && seconds(sown.sownAt) && sown.sownAt <= playSeconds
    && (sown.watered === undefined || typeof sown.watered === 'boolean'))) return false;
  const trees = Object.entries(data.trees);
  if (trees.length > ORCHARD_TREES.length) return false;
  return trees.every(([id, pickedAt]) => ORCHARD_TREE_IDS.includes(id) && seconds(pickedAt) && pickedAt <= playSeconds);
}

export function createFarming({ skills = null, inventory = null, onEvent = () => {} } = {}) {
  const state = { met: false, rows: new Map(), trees: new Map(), reaped: 0 };

  const now = playSeconds => Math.max(0, Number(playSeconds) || 0);
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

  /** The commons supplies seed for practice; topping up never duplicates a full packet. */
  function stockSeeds() {
    const added = [];
    for (const kind of Object.values(CROPS)) {
      if (level() < kind.level) continue;
      const quantity = Math.max(0, SEED_PACKET_SIZE - (inventory?.count?.(kind.seed) ?? 0));
      if (quantity && inventory?.add?.(kind.seed, quantity)) added.push({ id: kind.seed, quantity });
    }
    onEvent({ type: 'farm-seeds', added });
    return { ok: true, added };
  }

  /** Where a row stands at a moment of play: bare, sown and growing, or ripe. */
  function rowState(id, playSeconds) {
    const here = farmRow(id);
    if (!here) return null;
    const sown = state.rows.get(id);
    if (!sown) return { ...here, stage: 'bare', crop: null, sownAt: null, ripeAt: null, left: 0, progress: 0, watered: false };
    const kind = CROPS[sown.crop], duration = kind.seconds * (sown.watered ? WATERED_GROWTH : 1);
    const ripeAt = sown.sownAt + duration, left = Math.max(0, ripeAt - now(playSeconds));
    return { ...here, stage: left > 0 ? 'sown' : 'ripe', crop: kind.id, cropName: kind.name, sownAt: sown.sownAt, ripeAt, left,
      progress: Math.max(0, Math.min(1, (now(playSeconds) - sown.sownAt) / duration)), watered: !!sown.watered,
      quantity: kind.yield + (sown.watered ? 1 : 0) };
  }

  /** What a row may be sown with now: the crops the level opens, and nothing on a row in use. */
  function sowable(id) {
    if (state.rows.has(id) || !farmRow(id)) return [];
    return CROP_IDS.filter(cropId => level() >= CROPS[cropId].level)
      .map(cropId => ({ ...CROPS[cropId], seeds: inventory?.count?.(CROPS[cropId].seed) ?? 0 }));
  }

  function sow(id, cropId, playSeconds) {
    // The user's ruling of 21 September 2026: no introduction is needed to do a thing. The
    // teacher is still worth meeting; he is no longer the door.
    if (!farmRow(id)) return { ok: false, reason: 'There is no such row.' };
    if (state.rows.has(id)) return { ok: false, reason: 'Something is already in that row.' };
    const kind = CROPS[cropId];
    if (!kind) return { ok: false, reason: 'There is no such seed.' };
    if (level() < kind.level) return { ok: false, reason: `${kind.name} wants farming level ${kind.level}.` };
    if (inventory?.remove && !inventory.remove(kind.seed, 1)) return { ok: false, reason: `You need ${kind.name.toLowerCase()} seed. Stanley shares seed packets beside the commons rows.` };
    const at = now(playSeconds);
    state.rows.set(id, { crop: kind.id, sownAt: at });
    onEvent({ type: 'row-sown', row: id, crop: kind.id, ripeAt: at + kind.seconds });
    return { ok: true, row: id, crop: kind.id, ripeAt: at + kind.seconds, seconds: kind.seconds };
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
   * Reaping. It pays the experience and the crop, and the row goes back to bare — so the same
   * row may be sown again, which is what a working skill is. A row that is not ripe is not
   * reaped: waiting is the lesson.
   */
  function reap(id, playSeconds) {
    const here = rowState(id, playSeconds);
    // The user's ruling of 21 September 2026: no introduction is needed to do a thing. The
    // teacher is still worth meeting; he is no longer the door.
    if (!here) return { ok: false, reason: 'There is no such row.' };
    if (here.stage === 'bare') return { ok: false, reason: 'There is nothing in that row.' };
    if (here.stage === 'sown') return { ok: false, reason: `Not for another ${Math.ceil(here.left)} seconds. It grows whether you are watching it or not.` };
    const kind = CROPS[here.crop];
    const quantity = kind.yield + (here.watered ? 1 : 0);
    if (inventory?.add && !inventory.add(kind.item, quantity)) return { ok: false, reason: 'There is no room for the harvest in your satchel. The crop is still in the row.' };
    if (inventory?.add) inventory.add(kind.seed, 1);
    state.rows.delete(id);
    state.reaped++;
    const gained = pay(kind.xp);
    onEvent({ type: 'row-reaped', row: id, crop: kind.id, item: kind.item, quantity, seed: kind.seed, xp: kind.xp, level: gained?.level ?? level(), levelled: !!gained?.levelled });
    return { ok: true, row: id, crop: kind.id, item: kind.item, quantity, seed: kind.seed, xp: kind.xp, levelled: !!gained?.levelled, level: gained?.level ?? level() };
  }

  /** A kept tree at a moment of play: in fruit, or bearing again in so many seconds. */
  function treeState(id, playSeconds) {
    const tree = ORCHARD_TREES.find(entry => entry.id === id);
    if (!tree) return null;
    const picked = state.trees.get(id);
    const left = picked === undefined ? 0 : Math.max(0, picked + ORCHARD_REGROW - now(playSeconds));
    return { ...tree, stage: left > 0 ? 'picked' : 'fruiting', pickedAt: picked ?? null, left };
  }

  /** Picking is farming with no sowing: somebody else kept the tree and you take what it has. */
  function pick(id, playSeconds) {
    const tree = treeState(id, playSeconds);
    // The user's ruling of 21 September 2026: no introduction is needed to do a thing. The
    // teacher is still worth meeting; he is no longer the door.
    if (!tree) return { ok: false, reason: 'There is no such tree.' };
    if (tree.stage === 'picked') return { ok: false, reason: `This one is picked out. It will bear again in about ${Math.ceil(tree.left)} seconds.` };
    if (inventory?.add && !inventory.add(ORCHARD_ITEM, 1)) return { ok: false, reason: 'There is no room for the apple in your satchel. It is still on the tree.' };
    state.trees.set(id, now(playSeconds));
    const gained = pay(ORCHARD_XP);
    onEvent({ type: 'tree-picked', tree: id, item: ORCHARD_ITEM, xp: ORCHARD_XP, level: gained?.level ?? level(), levelled: !!gained?.levelled });
    return { ok: true, tree: id, item: ORCHARD_ITEM, quantity: 1, xp: ORCHARD_XP, levelled: !!gained?.levelled, level: gained?.level ?? level() };
  }

  /** The whole farm at a moment of play, for the journal and for whoever draws the rows. */
  function view(playSeconds) {
    const rows = FARM_ROW_IDS.map(id => rowState(id, playSeconds));
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
    if (here.ripe) return { title: `${here.ripe} row${here.ripe === 1 ? '' : 's'} ripe`, detail: 'Take it off at the commons. The row is bare again afterwards and can go straight back in.' };
    if (here.sown) {
      const soonest = Math.ceil(Math.min(...here.rows.filter(entry => entry.stage === 'sown').map(entry => entry.left)));
      return { title: 'Sown and growing', detail: `About ${soonest} seconds on the soonest row. It grows whether you are watching it or not; go and do something else.` };
    }
    return { title: 'Four bare rows', detail: 'Choose carrots or barley; beets unlock at level 2 and Drent leaf at level 5. Water a growing row once for an earlier, larger harvest. Stanley shares replacement seeds.' };
  }

  function snapshot() {
    return { version: FARMING_VERSION, met: state.met, reaped: state.reaped,
      rows: Object.fromEntries([...state.rows].map(([id, sown]) => [id, { crop: sown.crop, sownAt: Math.round(sown.sownAt * 100) / 100, ...(sown.watered ? { watered: true } : {}) }])),
      trees: Object.fromEntries([...state.trees].map(([id, at]) => [id, Math.round(at * 100) / 100])) };
  }

  function restore(data) {
    state.met = false; state.rows.clear(); state.trees.clear(); state.reaped = 0;
    if (!validateFarmingSnapshot(data, { allowMissing: false })) return false;
    state.met = data.met; state.reaped = data.reaped;
    for (const [id, sown] of Object.entries(data.rows)) state.rows.set(id, { crop: sown.crop, sownAt: sown.sownAt, ...(sown.watered ? { watered: true } : {}) });
    for (const [id, at] of Object.entries(data.trees)) state.trees.set(id, at);
    return true;
  }

  return { learn, sow, water, stockSeeds, reap, pick, sowable, view, task, rowState, treeState, snapshot, restore,
    get met() { return state.met; }, get reaped() { return state.reaped; } };
}

/** Stanley's first lesson. Tools at the shared beds are not inventory prerequisites. */
export const FARMING_LESSON = freeze([
  'Choose a bare bed and press F. Carrots are a quick first crop, barley is useful for supper, and better practice opens beets at level 2 and Drent leaf at level 5. I share the seed packets; each harvest saves another packet for the next sowing.',
  'Water the growing bed once with our shared can. It earns a little Farming experience, grows a quarter faster and gives one extra crop. Then go and do something else. The plants grow while you are somewhere else, but wait when you pause or close the game.',
  'Return when the crop is ready and press F to harvest. Every harvest earns Farming experience, and that bed can go straight back in. Eat a carrot or beet from your satchel with I, or ask me about Cooking and turn the harvest into a proper meal at the fire beside us.',
]);

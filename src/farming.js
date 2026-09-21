/**
 * Farming, the fourteenth skill, and the only one that grows while you are somewhere else.
 *
 * Sow, wait, reap. A row is sown at a moment of play and is ripe a fixed number of play-seconds
 * later — barley in four minutes, Drent leaf in eight — so the first thing it teaches is the
 * thing the whole long road is about: Drent goes on without you, exactly as the company does
 * (`src/mercenaries.js`). Walk to Rena and back and the barley is in.
 *
 * Enna keeps the common mill at the Avrel clearing and already stands between the crop rows and
 * the millstones, so she teaches it. Applegarth's orchard is farming with no sowing: the trees
 * are kept, they are picked rather than planted, and they bear again ten minutes later.
 *
 * It is a working skill, done RuneScape's way like woodcutting: every reaping is experience, and
 * the level climbs the same 99 table as everything else. Nothing here is a gate — a bare row is
 * a bare row, and the road does not wait on it. Pure: no DOM, no three.
 */
import { APPLEGARTH_WORKS } from './rena.js';

const freeze = Object.freeze;

export const FARMING_VERSION = 1;
export const FARMING_SKILL = 'farming';

/**
 * What a row can be sown with. `seconds` is play-seconds from sowing to ripe, and the two
 * numbers are the design's: four minutes for barley, eight for the leaf (docs/drent-long-road.md
 * §5). `xp` is what reaping one row pays.
 */
export const CROPS = freeze({
  barley: freeze({ id: 'barley', name: 'Barley', seconds: 240, xp: 24, level: 1, item: 'barley', yield: 2,
    note: 'Four minutes of play from the drill to the sickle. The commons grows it for the mill, and the mill is the reason the commons exists.' }),
  'drent-leaf': freeze({ id: 'drent-leaf', name: 'Drent leaf', seconds: 480, xp: 45, level: 5, item: 'pipe-weed', yield: 1,
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
    && Object.hasOwn(CROPS, sown.crop) && seconds(sown.sownAt) && sown.sownAt <= playSeconds)) return false;
  const trees = Object.entries(data.trees);
  if (trees.length > ORCHARD_TREES.length) return false;
  return trees.every(([id, pickedAt]) => ORCHARD_TREE_IDS.includes(id) && seconds(pickedAt) && pickedAt <= playSeconds);
}

export function createFarming({ skills = null, inventory = null, onEvent = () => {} } = {}) {
  const state = { met: false, rows: new Map(), trees: new Map(), reaped: 0 };

  const now = playSeconds => Math.max(0, Number(playSeconds) || 0);
  const pay = amount => {
    if (!state.met || !(amount > 0)) return null;
    if (!skills?.known?.(FARMING_SKILL) && skills?.learn?.(FARMING_SKILL)?.ok !== true) return null;
    return skills?.gain?.(FARMING_SKILL, amount) ?? null;
  };

  /** Enna's lesson. Learned once, and the whole skill is shut until it is. */
  function learn() {
    if (state.met) return { ok: true, first: false };
    state.met = true;
    skills?.learn?.(FARMING_SKILL);
    onEvent({ type: 'farming-learned' });
    return { ok: true, first: true };
  }

  const level = () => skills?.level?.(FARMING_SKILL) ?? 1;

  /** Where a row stands at a moment of play: bare, sown and growing, or ripe. */
  function rowState(id, playSeconds) {
    const here = farmRow(id);
    if (!here) return null;
    const sown = state.rows.get(id);
    if (!sown) return { ...here, stage: 'bare', crop: null, sownAt: null, ripeAt: null, left: 0 };
    const kind = CROPS[sown.crop], ripeAt = sown.sownAt + kind.seconds, left = Math.max(0, ripeAt - now(playSeconds));
    return { ...here, stage: left > 0 ? 'sown' : 'ripe', crop: kind.id, cropName: kind.name, sownAt: sown.sownAt, ripeAt, left };
  }

  /** What a row may be sown with now: the crops the level opens, and nothing on a row in use. */
  function sowable(id) {
    if (!state.met || state.rows.has(id) || !farmRow(id)) return [];
    return CROP_IDS.filter(cropId => level() >= CROPS[cropId].level).map(cropId => ({ ...CROPS[cropId] }));
  }

  function sow(id, cropId, playSeconds) {
    if (!state.met) return { ok: false, reason: 'Nobody has shown you how a row is put in.' };
    if (!farmRow(id)) return { ok: false, reason: 'There is no such row.' };
    if (state.rows.has(id)) return { ok: false, reason: 'Something is already in that row.' };
    const kind = CROPS[cropId];
    if (!kind) return { ok: false, reason: 'There is no such seed.' };
    if (level() < kind.level) return { ok: false, reason: `${kind.name} wants farming level ${kind.level}.` };
    const at = now(playSeconds);
    state.rows.set(id, { crop: kind.id, sownAt: at });
    onEvent({ type: 'row-sown', row: id, crop: kind.id, ripeAt: at + kind.seconds });
    return { ok: true, row: id, crop: kind.id, ripeAt: at + kind.seconds, seconds: kind.seconds };
  }

  /**
   * Reaping. It pays the experience and the crop, and the row goes back to bare — so the same
   * row may be sown again, which is what a working skill is. A row that is not ripe is not
   * reaped: waiting is the lesson.
   */
  function reap(id, playSeconds) {
    const here = rowState(id, playSeconds);
    if (!state.met) return { ok: false, reason: 'Nobody has shown you how a row is taken off.' };
    if (!here) return { ok: false, reason: 'There is no such row.' };
    if (here.stage === 'bare') return { ok: false, reason: 'There is nothing in that row.' };
    if (here.stage === 'sown') return { ok: false, reason: `Not for another ${Math.ceil(here.left)} seconds. It grows whether you are watching it or not.` };
    const kind = CROPS[here.crop];
    state.rows.delete(id);
    state.reaped++;
    if (inventory?.add) inventory.add(kind.item, kind.yield);
    const gained = pay(kind.xp);
    onEvent({ type: 'row-reaped', row: id, crop: kind.id, item: kind.item, quantity: kind.yield, xp: kind.xp, level: gained?.level ?? level(), levelled: !!gained?.levelled });
    return { ok: true, row: id, crop: kind.id, item: kind.item, quantity: kind.yield, xp: kind.xp, levelled: !!gained?.levelled, level: gained?.level ?? level() };
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
    if (!state.met) return { ok: false, reason: 'You could take an apple. Somebody should show you what an orchard is first.' };
    if (!tree) return { ok: false, reason: 'There is no such tree.' };
    if (tree.stage === 'picked') return { ok: false, reason: `This one is picked out. It will bear again in about ${Math.ceil(tree.left)} seconds.` };
    state.trees.set(id, now(playSeconds));
    if (inventory?.add) inventory.add(ORCHARD_ITEM, 1);
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
    if (!state.met) return { title: 'Not yet a farmer', detail: 'Enna keeps the common mill at the Avrel clearing, and stands between the crop rows and the millstones. She will show you how a row goes in.' };
    const here = view(playSeconds);
    if (here.ripe) return { title: `${here.ripe} row${here.ripe === 1 ? '' : 's'} ripe`, detail: 'Take it off at the commons. The row is bare again afterwards and can go straight back in.' };
    if (here.sown) {
      const soonest = Math.ceil(Math.min(...here.rows.filter(entry => entry.stage === 'sown').map(entry => entry.left)));
      return { title: 'Sown and growing', detail: `About ${soonest} seconds on the soonest row. It grows whether you are watching it or not; go and do something else.` };
    }
    return { title: 'Four bare rows', detail: 'Barley is four minutes and Drent leaf is eight. Applegarth keeps its orchard, and a kept tree is picked rather than sown.' };
  }

  function snapshot() {
    return { version: FARMING_VERSION, met: state.met, reaped: state.reaped,
      rows: Object.fromEntries([...state.rows].map(([id, sown]) => [id, { crop: sown.crop, sownAt: Math.round(sown.sownAt * 100) / 100 }])),
      trees: Object.fromEntries([...state.trees].map(([id, at]) => [id, Math.round(at * 100) / 100])) };
  }

  function restore(data) {
    state.met = false; state.rows.clear(); state.trees.clear(); state.reaped = 0;
    if (!validateFarmingSnapshot(data, { allowMissing: false })) return false;
    state.met = data.met; state.reaped = data.reaped;
    for (const [id, sown] of Object.entries(data.rows)) state.rows.set(id, { crop: sown.crop, sownAt: sown.sownAt });
    for (const [id, at] of Object.entries(data.trees)) state.trees.set(id, at);
    return true;
  }

  return { learn, sow, reap, pick, sowable, view, task, rowState, treeState, snapshot, restore,
    get met() { return state.met; }, get reaped() { return state.reaped; } };
}

/** Enna's lesson, in her own words. The host runs `learn` when the traveler takes it. */
export const FARMING_LESSON = freeze([
  'You have been staring at those rows for a while. They are not complicated, which is the good news and also the whole of it.',
  'Drill, cover, leave it. Barley is up in four minutes of anybody’s day and the leaf takes twice that. You do not stand over it. That is the part people find hard — the row does its work while you are somewhere else entirely, and it does not care where.',
  'Come back with a sickle in your hand and a row you put in yourself, and I will show you the rest of it. And if you are going west, Applegarth keeps its orchard. Kept trees are picked, not sown, and they bear again in about ten minutes.',
]);

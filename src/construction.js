/**
 * Construction, the RuneScape way: logs are sawn into planks, planks and a
 * hammer and saw make things, every plank used is experience, and every thing
 * has the level it wants from you. The second of the working skills (see
 * src/skills.js), taught by Bowden Koop, who built his own keep: "every king
 * needs a castle".
 *
 * Three things to build. Birdhouses, at the workbench in the Koopwood, to hang
 * on the posts in the Greenway: a bird moves in after a while, and emptying
 * the house is Birding experience, the way RuneScape's birdhouse runs are. The
 * traveler's own house, on the plot beside the Koopwood that Bowden gives
 * away, stage by stage from footings to a walnut table, with a bed in it to
 * rest in. And planks for anybody who wants them: Bowden saws logs at his pit
 * for a copper or two.
 *
 * Pure: no DOM, no three. The house and the posts are drawn by
 * src/homestead-world.js; the workbench and the saw pit by src/woodlot-world.js.
 */
import { lotPoint, WOODLOT_LAYOUT } from './woodcutting.js';

const freeze = Object.freeze;
export const CONSTRUCTION_SKILL = 'construction';
export const CONSTRUCTION_VERSION = 1;
export const TOOLS = freeze(['hammer', 'saw']);

/** The planks, what they are sawn from, Bowden's fee a plank, and the experience a plank is worth when it is built into something. */
const plank = (id, name, log, fee, xp) => freeze({ id, name, log, fee, xp });
export const PLANKS = freeze({
  'pine-plank': plank('pine-plank', 'Pine plank', 'pine-logs', 1, 29),
  'oak-plank': plank('oak-plank', 'Oak plank', 'oak-logs', 2, 60),
  'walnut-plank': plank('walnut-plank', 'Walnut plank', 'walnut-logs', 5, 140),
});
export const PLANK_IDS = freeze(Object.keys(PLANKS));
const xpOf = planks => Object.entries(planks).reduce((sum, [id, n]) => sum + PLANKS[id].xp * n, 0);
const build = (id, name, level, planks, extra = {}) => freeze({ id, name, level, planks: freeze(planks), xp: xpOf(planks), ...extra });

/** The workbench in the Koopwood: what it makes. */
export const WORKBENCH = freeze([
  build('birdhouse', 'Birdhouse', 1, { 'pine-plank': 1 }, { makes: 'birdhouse' }),
  build('oak-birdhouse', 'Oak birdhouse', 15, { 'oak-plank': 1 }, { makes: 'oak-birdhouse' }),
]);
/** The traveler's house, in the order it goes up. The bed is for resting in. */
export const HOUSE_STAGES = freeze([
  build('footings', 'Footings and a floor', 1, { 'pine-plank': 4 }),
  build('frame', 'The frame', 4, { 'pine-plank': 6 }),
  build('walls', 'Walls', 8, { 'pine-plank': 8 }),
  build('roof', 'The roof', 12, { 'pine-plank': 6 }),
  build('door', 'A door and windows', 15, { 'oak-plank': 3 }),
  build('bed', 'A bed', 20, { 'oak-plank': 3 }),
  build('hearth', 'A hearth and a chimney', 25, { 'oak-plank': 2, 'pine-plank': 4 }),
  build('chest', 'A chest', 30, { 'oak-plank': 4 }),
  build('table', 'A walnut table', 45, { 'walnut-plank': 4 }),
]);
export const HOUSE_STAGE_IDS = freeze(HOUSE_STAGES.map(s => s.id));

// ---------------------------------------------------------------------------
// Where
// ---------------------------------------------------------------------------
/** The plot: level ground just west of the Koopwood, found by tests/find-construction-sites.mjs. +z faces the road; the door is on that side. */
export const HOUSE_PLOT = freeze({ id: 'house-plot', name: 'Your plot', x: -61.6, z: -25.9, yaw: 0, w: 7, d: 5.5, porch: 1.4 });
export function plotPoint(lx, lz) {
  const { x, z, yaw } = HOUSE_PLOT, c = Math.cos(yaw), s = Math.sin(yaw);
  return { x: x + lx * c + lz * s, z: z - lx * s + lz * c };
}
/** Where the traveler stands to build: in front of the porch steps, where the door will be. */
export const PLOT_STAND = freeze({ ...plotPoint(0, HOUSE_PLOT.d / 2 + HOUSE_PLOT.porch + 1.3), reach: 2.6 });
/** The workbench and the saw pit, in the Koopwood's frame. */
export const WORKBENCH_SPOT = freeze({ ...lotPoint(WOODLOT_LAYOUT.workbench.lx, WOODLOT_LAYOUT.workbench.lz), reach: 2.2 });
export const SAWPIT_SPOT = freeze({ ...lotPoint(WOODLOT_LAYOUT.sawpit.lx, WOODLOT_LAYOUT.sawpit.lz) });
/** The birdhouse posts in the Greenway, well apart, a little off the paths (tests/find-construction-sites.mjs). */
const post = (id, name, x, z) => freeze({ id, name, x, z, reach: 2.2 });
export const BIRDHOUSE_POSTS = freeze([
  post('post-greenway', 'the post by the Greenway', -80, 10),
  post('post-oldfield', 'the post at the old field edge', -84, -16),
  post('post-holly', 'the post under the hollies', -100, 26),
  post('post-dogwood', 'the post among the dogwoods', -96, 52),
]);
export const BIRDHOUSE_POST_IDS = freeze(BIRDHOUSE_POSTS.map(p => p.id));
/** Seconds of play before a bird moves in; the birds that nest in boxes in Drent; what emptying one is worth in Birding. */
export const BIRDHOUSE_WAIT = 300;
export const BOX_BIRDS = freeze(['a pair of Carolina wrens', 'a tufted titmouse', 'two Carolina chickadees', 'a pair of eastern bluebirds', 'a house wren', 'a white-breasted nuthatch']);
export const BIRDHOUSE_KINDS = freeze({ birdhouse: freeze({ birding: 30 }), 'oak-birdhouse': freeze({ birding: 70 }) });

/** The house's collider once it has footings: one box over the floor and the porch in front of it. */
export function houseColliders(stages) {
  if (stages < 1) return [];
  const { w, d, porch } = HOUSE_PLOT, c = plotPoint(0, porch / 2);
  return [{ x: c.x, z: c.z, hx: w / 2 + .15, hz: (d + porch) / 2 + .15, kind: 'traveler-house' }];
}

// ---------------------------------------------------------------------------
// Building
// ---------------------------------------------------------------------------
export function validateConstructionSnapshot(data, { allowMissing = true } = {}) {
  if (data === undefined) return allowMissing;
  if (!data || typeof data !== 'object' || Array.isArray(data) || data.version !== CONSTRUCTION_VERSION) return false;
  if (typeof data.plot !== 'boolean' || !Number.isInteger(data.stages) || data.stages < 0 || data.stages > HOUSE_STAGES.length) return false;
  if (!data.posts || typeof data.posts !== 'object' || Array.isArray(data.posts)) return false;
  for (const [id, entry] of Object.entries(data.posts)) {
    if (!BIRDHOUSE_POST_IDS.includes(id) || !entry || !Object.hasOwn(BIRDHOUSE_KINDS, entry.kind) || !Number.isFinite(entry.clock) || entry.clock < 0) return false;
  }
  if (!Number.isInteger(data.emptied) || data.emptied < 0 || data.emptied > 1e7) return false;
  return data.plot || data.stages === 0;
}

/**
 * `skills` is the traveler's skills. Every `need` below reads the satchel with
 * `count(item)`; the host takes and gives the things themselves.
 */
export function createConstruction({ skills, random = Math.random } = {}) {
  const state = { plot: false, stages: 0, posts: new Map(), emptied: 0 };
  const level = () => skills?.level?.(CONSTRUCTION_SKILL) ?? 0;
  const known = () => !!skills?.known?.(CONSTRUCTION_SKILL);

  /** Whether `thing` (a workbench recipe or a house stage) can be built now, and why not. */
  function can(thing, count = () => 0) {
    if (!known()) return { ok: false, reason: 'You would need to know how. Bowden Koop builds; ask him.' };
    if (TOOLS.some(t => count(t) < 1)) return { ok: false, reason: 'You need a hammer and a saw.' };
    if (level() < thing.level) return { ok: false, reason: `You need a Construction level of ${thing.level} to build that.` };
    const short = Object.entries(thing.planks).filter(([id, n]) => count(id) < n);
    if (short.length) return { ok: false, reason: `You need ${Object.entries(thing.planks).map(([id, n]) => `${n} ${PLANKS[id].name.toLowerCase()}${n > 1 ? 's' : ''}`).join(' and ')}.` };
    return { ok: true, reason: '' };
  }
  /** Build at the workbench. Returns the item made and the skill's report; the host takes the planks. */
  function make(recipeId, count) {
    const recipe = WORKBENCH.find(r => r.id === recipeId);
    if (!recipe) return { ok: false, reason: 'There is no such thing to make.' };
    const check = can(recipe, count); if (!check.ok) return check;
    const gained = skills.gain(CONSTRUCTION_SKILL, recipe.xp);
    return { ok: true, recipe, item: recipe.makes, planks: recipe.planks, xp: recipe.xp, level: gained.level, levelled: gained.levelled };
  }
  /** The house's next stage, if any. */
  const nextStage = () => HOUSE_STAGES[state.stages] ?? null;
  function claimPlot() { const first = !state.plot; state.plot = true; return { first }; }
  /** Put up the next stage of the house. */
  function buildStage(count) {
    const stage = nextStage();
    if (!state.plot) return { ok: false, reason: 'This is Bowden’s plot to give. Ask him about it.' };
    if (!stage) return { ok: false, reason: 'Your house is finished.' };
    const check = can(stage, count); if (!check.ok) return check;
    state.stages++;
    const gained = skills.gain(CONSTRUCTION_SKILL, stage.xp);
    return { ok: true, stage, planks: stage.planks, xp: stage.xp, stages: state.stages, level: gained.level, levelled: gained.levelled };
  }
  const built = id => HOUSE_STAGE_IDS.indexOf(id) < state.stages && HOUSE_STAGE_IDS.includes(id);

  /** Hang a birdhouse (`kind` is the item) on a post. */
  function hang(postId, kind) {
    if (!BIRDHOUSE_POST_IDS.includes(postId)) return { ok: false, reason: 'There is no post there.' };
    if (!Object.hasOwn(BIRDHOUSE_KINDS, kind)) return { ok: false, reason: 'That is not a birdhouse.' };
    if (state.posts.has(postId)) return { ok: false, reason: 'There is a birdhouse on this post already.' };
    state.posts.set(postId, { kind, clock: 0 }); return { ok: true };
  }
  /** The state of a post: empty, waiting (with seconds left), or occupied. */
  function post(postId) {
    const entry = state.posts.get(postId);
    if (!entry) return { phase: 'empty' };
    return entry.clock >= BIRDHOUSE_WAIT ? { phase: 'occupied', kind: entry.kind } : { phase: 'waiting', kind: entry.kind, left: BIRDHOUSE_WAIT - entry.clock };
  }
  /** Empty an occupied birdhouse: it comes down, and the birding experience is `birding` if birding is known. */
  function empty(postId) {
    const now = post(postId);
    if (now.phase !== 'occupied') return { ok: false, reason: now.phase === 'waiting' ? 'Nobody has moved in yet. Give it a while.' : 'There is no birdhouse on this post.' };
    state.posts.delete(postId); state.emptied++;
    const bird = BOX_BIRDS[Math.floor(random() * BOX_BIRDS.length)], xp = BIRDHOUSE_KINDS[now.kind].birding;
    const gained = skills?.known?.('birding') ? skills.gain('birding', xp) : null;
    return { ok: true, bird, kind: now.kind, xp: gained ? xp : 0, level: gained?.level, levelled: gained?.levelled ?? false };
  }
  /** Time passes: birds move in. Returns the posts that have just been taken. */
  function update(dt) {
    const taken = [];
    for (const [id, entry] of state.posts) { const was = entry.clock >= BIRDHOUSE_WAIT; entry.clock += Math.max(0, dt || 0); if (!was && entry.clock >= BIRDHOUSE_WAIT) taken.push(id); }
    return taken;
  }
  function snapshot() {
    return { version: CONSTRUCTION_VERSION, plot: state.plot, stages: state.stages, emptied: state.emptied,
      posts: Object.fromEntries([...state.posts].map(([id, e]) => [id, { kind: e.kind, clock: Math.round(e.clock * 10) / 10 }])) };
  }
  function restore(data) {
    Object.assign(state, { plot: false, stages: 0, emptied: 0 }); state.posts.clear();
    if (!validateConstructionSnapshot(data, { allowMissing: false })) return false;
    Object.assign(state, { plot: data.plot, stages: data.stages, emptied: data.emptied });
    for (const [id, e] of Object.entries(data.posts)) state.posts.set(id, { kind: e.kind, clock: e.clock });
    return true;
  }
  return { can, make, claimPlot, buildStage, nextStage, built, hang, post, empty, update, snapshot, restore, level, known,
    get plot() { return state.plot; }, get stages() { return state.stages; }, get emptied() { return state.emptied; } };
}

/** What sawing the logs in the satchel into planks costs: `count(item)`. */
export function sawOffer(count) {
  const lots = PLANK_IDS.map(id => ({ plank: id, log: PLANKS[id].log, count: count(PLANKS[id].log), fee: PLANKS[id].fee })).filter(lot => lot.count > 0);
  return { lots, planks: lots.reduce((sum, lot) => sum + lot.count, 0), fee: lots.reduce((sum, lot) => sum + lot.count * lot.fee, 0) };
}

// ---------------------------------------------------------------------------
// What Bowden says of building
// ---------------------------------------------------------------------------
export const BUILD_LINES = freeze({
  teach: [
    '“Build? You?” He looks at his keep, and then at you, and then at his keep. “Every king needs a castle. Even a worm needs a roof.”',
    'He hands you a hammer and a saw. “The hammer is for nails and for thumbs. The saw is for planks. Bring me logs and a copper or two, and I will saw them for you in the pit; I will not have a worm near my pit saw.”',
    '“A birdhouse first: one pine plank, at my workbench there. Hang it on one of the posts in the Greenway and come back when somebody has moved in. Then a house. There is a plot beside my wood that nobody wants. It is yours. The deed is free. The King is generous, and he wants a neighbour to shout at.”',
    '“Every plank you build with makes you better at building. Pine, oak, walnut: the better the wood, the more you learn. Footings first, then a frame, then walls. Do not put the roof on first. Somebody always tries.”',
  ],
  saw: (planks, fee) => [`He heaves your logs onto the pit, and he and the saw argue about each one for a while. ${planks} plank${planks > 1 ? 's' : ''}. “${fee} copper. Mind the splinters. Mind them more than I do.”`],
});

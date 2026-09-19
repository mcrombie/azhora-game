/**
 * Woodcutting, done the RuneScape way, in Drent's own trees: every tree has
 * the level it wants from you (pine at 1, oak at 15, willow at 30, red maple at
 * 45, black walnut at 60), every axe has the level it wants to be swung at,
 * and you swing until the tree gives you a log. A pine gives one and falls; the
 * old trees give several. Stumps grow back. The logs sell to the man who
 * taught you, for his kiln, or light a fire at any fire ring, one log for two
 * sticks.
 *
 * The man who teaches it is Bowden Koop, who calls himself the King of the
 * Koopwood: a woodlot and a charcoal kiln on the edge of the wood north-west
 * of Tidehaven. He is as near to a certain spiky, fire-breathing king of
 * turtles as a man in Drent can be: huge, loud, hair like a bonfire, a great
 * green spiked log-basket on his back, a keep of logs with battlements, a fire
 * under the ground that never goes out, a boy called Junior, a princess who
 * bakes cakes and says no, and a grudge against a little man in a red cap
 * who jumps on things.
 *
 * Pure: no DOM, no three. The lot is built in src/woodlot-world.js and the man
 * in src/woodcutter-model.js.
 */
const freeze = Object.freeze;

export const WOODCUTTING_SKILL = 'woodcutting';
export const WOODCUTTING_VERSION = 1;
/** Seconds between swings, and how near the trunk the traveler must stand. */
export const SWING = 1.3, CHOP_REACH = 2.7;

/**
 * The trees. `chance` is a swing's chance of a log at exactly the tree's level
 * with a bronze hatchet; every level above it adds a little, and a better axe
 * multiplies it. `logs` is how many it gives before it falls, `regrow` the
 * seconds its stump takes to come back, `price` what Bowden pays a log.
 * Experience is RuneScape's, rounded to whole points.
 */
const kind = (id, name, short, level, xp, chance, logs, regrow, price, trunk) => freeze({ id, name, short, level, xp, log: `${id}-logs`, chance, logs: freeze(logs), regrow, price, trunk });
export const TREE_KINDS = freeze({
  pine: kind('pine', 'Loblolly pine', 'pine', 1, 25, .52, [1, 1], 25, 1, .32),
  oak: kind('oak', 'White oak', 'oak', 15, 38, .34, [2, 4], 40, 2, .45),
  willow: kind('willow', 'Black willow', 'willow', 30, 68, .28, [3, 6], 55, 3, .4),
  maple: kind('maple', 'Red maple', 'maple', 45, 100, .2, [3, 6], 75, 5, .34),
  walnut: kind('walnut', 'Black walnut', 'walnut', 60, 175, .14, [4, 8], 150, 9, .42),
});
export const TREE_KIND_IDS = freeze(Object.keys(TREE_KINDS));
export const LOG_ITEMS = freeze(TREE_KIND_IDS.map(id => TREE_KINDS[id].log));

/** The axes, worst to best. The best one the traveler carries and has the level for is the one swung. */
export const AXES = freeze([
  freeze({ id: 'bronze-axe', name: 'Bronze hatchet', level: 1, power: 1, price: 0 }),
  freeze({ id: 'iron-axe', name: 'Iron axe', level: 1, power: 1.15, price: 12 }),
  freeze({ id: 'steel-axe', name: 'Steel axe', level: 6, power: 1.3, price: 35 }),
  freeze({ id: 'kings-axe', name: 'The King’s axe', level: 30, power: 1.6, price: null }),
]);
export const AXE_IDS = freeze(AXES.map(axe => axe.id));
export const KINGS_AXE_LEVEL = 30;

/** A swing's chance of a log. */
export function chopChance(kindId, level, axeId) {
  const k = TREE_KINDS[kindId], axe = AXES.find(a => a.id === axeId);
  if (!k || !axe || level < k.level || level < axe.level) return 0;
  return Math.min(.95, Math.max(.08, Math.min(.9, k.chance + (level - k.level) * .012)) * axe.power);
}
/** The best axe in the satchel that the traveler can swing at `level`, or null. */
export function bestAxe(level, has) {
  for (let i = AXES.length - 1; i >= 0; i--) if (has(AXES[i].id) && level >= AXES[i].level) return AXES[i];
  return null;
}

// ---------------------------------------------------------------------------
// The Koopwood
// ---------------------------------------------------------------------------
/** The lot's frame: a clearing on the edge of the wood north-west of the village, found by tests/find-woodlot.mjs. +z faces the road. */
export const KOOPWOOD = freeze({ id: 'koopwood', name: 'The Koopwood', x: -32.3, z: -14.4, yaw: 0, halfW: 15, halfD: 11 });
export function lotPoint(lx, lz) {
  const { x, z, yaw } = KOOPWOOD, c = Math.cos(yaw), s = Math.sin(yaw);
  return { x: x + lx * c + lz * s, z: z - lx * s + lz * c };
}
/** Whether a world point is inside the lot, with `margin` metres more all round. */
export function inKoopwood(x, z, margin = 0) {
  const { yaw } = KOOPWOOD, dx = x - KOOPWOOD.x, dz = z - KOOPWOOD.z, c = Math.cos(yaw), s = Math.sin(yaw);
  const lx = dx * c - dz * s, lz = dx * s + dz * c;
  return Math.abs(lx) <= KOOPWOOD.halfW + margin && Math.abs(lz) <= KOOPWOOD.halfD + margin;
}
const tree = (kindId, n, lx, lz) => freeze({ id: `koopwood-${kindId}-${n}`, kind: kindId, lx, lz, ...lotPoint(lx, lz) });
/** The trees Bowden lets you cut: pines at the front, oaks behind them, willows by the spring, two maples, and his old walnut. */
export const WOODLOT_TREES = freeze([
  tree('pine', 1, 4.5, 5.5), tree('pine', 2, 8.5, 7), tree('pine', 3, 12.5, 5), tree('pine', 4, 6.5, 1.8), tree('pine', 5, 10.5, 1.5), tree('pine', 6, 13.5, -1.8),
  tree('oak', 1, 5.5, -3), tree('oak', 2, 10, -5.5), tree('oak', 3, 13.5, -8.5), tree('oak', 4, 6.5, -8.8),
  tree('willow', 1, -13, 7.5), tree('willow', 2, -13.2, 1.5),
  tree('maple', 1, -6, 0), tree('maple', 2, -1, -3.5),
  tree('walnut', 1, 1.8, -8.5),
]);
export const WOODLOT_TREE_IDS = freeze(WOODLOT_TREES.map(t => t.id));
/** Everything else in the lot, in its frame. */
export const WOODLOT_LAYOUT = freeze({
  keep: freeze({ lx: -10, lz: -7, w: 7, d: 5, h: 3.2 }),
  kiln: freeze({ lx: -3.2, lz: -8.8, r: 2.1 }),
  block: freeze({ lx: -3.6, lz: 7.4 }),
  logpile: freeze({ lx: -7.2, lz: 7.8, len: 2.6 }),
  spring: freeze({ lx: -9.8, lz: 4.4, r: 1.6 }),
  sign: freeze({ lx: 1, lz: 10.2 }),
  // Construction (src/construction.js): the workbench by the willows, and the saw pit by the log pile.
  workbench: freeze({ lx: -10.4, lz: 9.8, w: 1.7, d: .75 }),
  sawpit: freeze({ lx: -6.4, lz: 10.1, len: 2.2 }),
});
export const WOODLOT_SIGN = 'The Koopwood';
export const BOWDEN_STAND = freeze({ ...lotPoint(-1.5, 6.6), yaw: KOOPWOOD.yaw });

/** The lot's colliders, in world terms: trunks (a stump is as solid as a tree), the keep, the kiln, the block, the log pile, the spring. */
export function woodlotColliders() {
  const out = WOODLOT_TREES.map(t => ({ x: t.x, z: t.z, r: TREE_KINDS[t.kind].trunk + .1, kind: 'woodlot-tree', id: t.id }));
  const L = WOODLOT_LAYOUT, keep = lotPoint(L.keep.lx, L.keep.lz);
  out.push({ x: keep.x, z: keep.z, hx: L.keep.w / 2, hz: L.keep.d / 2, kind: 'woodlot-keep' });
  out.push({ ...lotPoint(L.kiln.lx, L.kiln.lz), r: L.kiln.r, kind: 'charcoal-kiln' });
  out.push({ ...lotPoint(L.block.lx, L.block.lz), r: .42, kind: 'chopping-block' });
  for (const t of [-.4, 0, .4]) out.push({ ...lotPoint(L.logpile.lx + t * L.logpile.len, L.logpile.lz), r: .5, kind: 'log-pile' });
  out.push({ ...lotPoint(L.spring.lx, L.spring.lz), r: L.spring.r, kind: 'woodlot-spring' });
  { const b = lotPoint(L.workbench.lx, L.workbench.lz); out.push({ x: b.x, z: b.z, hx: L.workbench.w / 2, hz: L.workbench.d / 2, kind: 'workbench' }); }
  out.push({ ...lotPoint(L.sawpit.lx, L.sawpit.lz), r: .75, kind: 'saw-pit' });
  return out;
}

// ---------------------------------------------------------------------------
// Cutting
// ---------------------------------------------------------------------------
export function validateWoodcuttingSnapshot(data, { allowMissing = true } = {}) {
  if (data === undefined) return allowMissing;
  if (!data || typeof data !== 'object' || Array.isArray(data) || data.version !== WOODCUTTING_VERSION) return false;
  if (typeof data.met !== 'boolean' || typeof data.kingsAxe !== 'boolean') return false;
  for (const key of ['visits', 'logs', 'sold']) if (!Number.isInteger(data[key]) || data[key] < 0 || data[key] > 1e7) return false;
  return data.met || (!data.kingsAxe && data.visits === 0 && data.sold === 0);
}

/**
 * `skills` is the traveler's skills (src/skills.js). `has(item)` says what the
 * satchel holds. Swings are rolled with `random`.
 */
export function createWoodcutting({ skills, random = Math.random } = {}) {
  const state = { met: false, visits: 0, kingsAxe: false, logs: 0, sold: 0 };
  const trees = new Map(WOODLOT_TREES.map(t => [t.id, { logsLeft: 0, stump: 0 }]));
  const stock = t => { const [lo, hi] = TREE_KINDS[t.kind].logs; return lo + Math.floor(random() * (hi - lo + 1)); };
  for (const t of WOODLOT_TREES) trees.get(t.id).logsLeft = stock(t);
  const byId = new Map(WOODLOT_TREES.map(t => [t.id, t]));
  const level = () => skills?.level?.(WOODCUTTING_SKILL) ?? 0;

  /** Whether the traveler can cut tree `id` now, and with what; `reason` in RuneScape's words when not. */
  function canChop(id, has = () => false) {
    const t = byId.get(id);
    if (!t) return { ok: false, reason: 'There is no tree there.' };
    const k = TREE_KINDS[t.kind];
    if (trees.get(id).stump > 0) return { ok: false, reason: `Only a stump. The ${k.short} will grow back.`, tree: t, kind: k };
    if (!skills?.known?.(WOODCUTTING_SKILL)) return { ok: false, reason: 'You swing, and not much happens. Somebody ought to show you how: Bowden Koop, at the woodlot on the edge of the wood.', tree: t, kind: k };
    const lv = level();
    if (lv < k.level) return { ok: false, reason: `You need a Woodcutting level of ${k.level} to chop down this ${k.short}.`, tree: t, kind: k };
    const axe = bestAxe(lv, has);
    if (!axe) return { ok: false, reason: AXES.some(a => has(a.id)) ? 'You do not have an axe which you have the Woodcutting level to use.' : 'You need an axe to chop down this tree.', tree: t, kind: k };
    return { ok: true, reason: '', tree: t, kind: k, axe, chance: chopChance(t.kind, lv, axe.id) };
  }
  /**
   * One swing at tree `id`. Returns what came of it: `log` (the item) and the
   * skill's report when a log comes away, and `felled` when that was the last.
   */
  function swing(id, has = () => false) {
    const can = canChop(id, has);
    if (!can.ok) return { ...can, log: null };
    if (random() >= can.chance) return { ok: true, tree: can.tree, kind: can.kind, axe: can.axe, log: null };
    const entry = trees.get(id), k = can.kind;
    entry.logsLeft--; state.logs++;
    const gained = skills.gain(WOODCUTTING_SKILL, k.xp);
    const felled = entry.logsLeft <= 0;
    if (felled) { entry.stump = k.regrow; entry.logsLeft = 0; }
    return { ok: true, tree: can.tree, kind: k, axe: can.axe, log: k.log, xp: k.xp, felled, level: gained.level, levelled: gained.levelled };
  }
  /** Time passes: stumps grow back. Returns the trees that stood up again. */
  function update(dt) {
    const grown = [];
    for (const [id, entry] of trees) if (entry.stump > 0) {
      entry.stump = Math.max(0, entry.stump - Math.max(0, dt || 0));
      if (entry.stump === 0) { entry.logsLeft = stock(byId.get(id)); grown.push(id); }
    }
    return grown;
  }
  const standing = id => trees.get(id)?.stump === 0;
  function meet() { const first = !state.met; state.met = true; return { first }; }
  function visit() { if (state.met) state.visits++; }
  /** His old axe, once, when the traveler reaches the level for it. */
  function giveKingsAxe() { if (state.kingsAxe || level() < KINGS_AXE_LEVEL) return { ok: false }; state.kingsAxe = true; return { ok: true }; }
  /** What Bowden pays for the logs in the satchel: `count(item)`. */
  function offer(count) {
    const lots = LOG_ITEMS.map((item, i) => ({ item, count: count(item), price: TREE_KINDS[TREE_KIND_IDS[i]].price })).filter(lot => lot.count > 0);
    return { lots, total: lots.reduce((sum, lot) => sum + lot.count * lot.price, 0), logs: lots.reduce((sum, lot) => sum + lot.count, 0) };
  }
  function sold(logs) { state.sold += Math.max(0, Math.floor(logs)); }
  function snapshot() { return { version: WOODCUTTING_VERSION, met: state.met, visits: state.visits, kingsAxe: state.kingsAxe, logs: state.logs, sold: state.sold }; }
  function restore(data) {
    Object.assign(state, { met: false, visits: 0, kingsAxe: false, logs: 0, sold: 0 });
    if (!validateWoodcuttingSnapshot(data, { allowMissing: false })) return false;
    Object.assign(state, { met: data.met, visits: data.visits, kingsAxe: data.kingsAxe, logs: data.logs, sold: data.sold });
    return true;
  }
  return { canChop, swing, update, standing, meet, visit, giveKingsAxe, offer, sold, snapshot, restore, level,
    get met() { return state.met; }, get visits() { return state.visits; }, get kingsAxe() { return state.kingsAxe; }, get logs() { return state.logs; } };
}

// ---------------------------------------------------------------------------
// Bowden Koop
// ---------------------------------------------------------------------------
export const BOWDEN = freeze({ id: 'woodcutter-bowden', name: 'Bowden Koop', role: 'King of the Koopwood: woodcutter and charcoal-burner', color: 0xd8a13a, skin: 0xd49a72 });
const LAUGH = 'BWAH HA HA!';
const FIRST = freeze([
  'A huge man with hair like a bonfire and a great green spiked basket on his back brings his axe down on a log, and the log gives up in two pieces.',
  `“${LAUGH} Another worm wanders into the Koopwood!”`,
  '“Bowden Koop. King of this wood, lord of that kiln, master of every tree between here and the Greenway. You may bow. Nobody does. I have stopped asking.”',
]);
const AGAIN = freeze([
  `“${LAUGH} Back for more, worm? The trees missed you. I didn’t.”`,
  '“You again! Good. The kiln is hungry, the trees are tall, and Junior has painted my axe handle pink again.”',
  '“Worm! Show me a swing. No. Terrible. Again. Better. Still terrible.”',
  `“The King of the Koopwood receives you!” He does not get up. “${LAUGH}”`,
]);
const TEACH = freeze([
  `“Teach YOU? ${LAUGH}” He looks at you for a long moment, and stops laughing. “…Fine. Everybody starts a worm.”`,
  'He pulls a small bronze hatchet out of the chopping block and slaps it into your hand. “Bronze. It is terrible. So are you. You will be terrible together, then less terrible, and that is woodcutting.”',
  '“Every tree has a level. Pine, any worm can cut. Oak wants fifteen. Willow, thirty. Red maple, forty-five. My walnut, sixty. Try an oak at level three and it will laugh at you, and so will I.”',
  '“Stand at a trunk and press F. Swing until it gives you a log. A pine gives one and falls; the old trees give you a few. Stumps grow back. Everything grows back, except my patience.”',
  '“The logs are yours. Burn one at a fire ring instead of two sticks, or bring them to me: the kiln eats them, and the King pays. Badly. But he pays.”',
]);
const TALK = freeze({
  king: [
    '“Why King? Because I said so, loudly, for twenty years. It works on everything except trees and princesses.”',
    '“There is a princess in Tidehaven. Lysa. She bakes cakes. Every spring I send her a whole oak for her oven, tied with a ribbon, and every spring she sends back a cake and a note that says no.”',
    '“Best cakes in Drent. I keep the notes. I have eleven. The King of the Koopwood does not give up. The King of the Koopwood just, sometimes, has cake instead.”',
  ],
  kiln: [
    '“My kiln. A stack of wood under a coat of turf, lit, and left to cook for ten days until it’s charcoal. The smiths up the road pay for it, and the fire under it has not gone out in nine years.”',
    '“A king needs a keep, so I built one, out of logs, with battlements. A king needs a moat of fire, so I have one, underground. Every king has a castle. Mine smokes.”',
    'He takes a deep breath over the kiln’s vent and blows. A little tongue of flame rolls out across the turf. “Pepper oil, worm. Nobody else in Drent can do that.”',
  ],
  rival: [
    '“A little man in a red cap. Moustache. Jumps on everything. He jumped on my stumps. He jumped on my kiln. He jumped on me. Twice.”',
    '“His brother is taller and greener and screams a lot. If you see either of them, worm, you tell them the King of the Koopwood is WAITING.”',
    '“Junior says I should let it go. Junior is eight. Junior paints moustaches on everything I own. Junior is on their side.”',
  ],
});
const LEAVE = '“Go on, worm. The trees won’t fall down by themselves. Well. They do. But not usefully.”';

/**
 * Bowden in his lot. `wood` is the woodcutting module, `skills` the
 * traveler's skills, `purse` the copper carried, `count(item)` and `has(item)`
 * read the satchel. `builder`, when given, is what he says and does about
 * Construction (src/construction.js): { known, saw: { planks, fee }, teach }.
 * `act` runs 'bowden-meet', 'bowden-teach', 'bowden-buy-<axe>', 'bowden-sell',
 * 'bowden-kings-axe', 'bowden-build' and 'bowden-saw'.
 */
export function bowdenConversation(npc, context) {
  const { wood, skills, purse = 0, count = () => 0, has = () => false, builder = null, openDialogue, closeDialogue, act } = context;
  if (npc.id !== BOWDEN.id) return false;
  const again = () => bowdenConversation(npc, { ...context, back: true });
  const talk = lines => openDialogue(npc, [...lines], null, 'Back to Bowden', { onComplete: again });
  const first = !wood.met;
  if (first) act('bowden-meet');
  const learned = skills.known(WOODCUTTING_SKILL), lv = skills.level(WOODCUTTING_SKILL);
  const master = lv >= 99;
  const opening = first ? [...FIRST] : context.back ? [master ? '“Anything else, Master Woodcutter?”' : '“Well, worm? Out with it.”'] : master ? [`“The Master of the Koopwood! ${LAUGH} I bow. Nobody sees. Good.”`] : [AGAIN[wood.visits % AGAIN.length]];
  const offer = wood.offer(count);
  const axes = AXES.filter(axe => axe.price !== null && axe.price > 0);
  openDialogue(npc, opening, null, 'Back to the road', { choices: [
    ...(learned ? [] : [{ id: 'bowden-teach', label: 'Teach me to cut wood.', action: () => { act('bowden-teach'); openDialogue(npc, [...TEACH], null, 'Back to Bowden', { onComplete: again }); } }]),
    ...(learned && lv >= KINGS_AXE_LEVEL && !wood.kingsAxe ? [{ id: 'bowden-kings-axe', label: `I’m a woodcutter of level ${lv} now, Bowden.`, action: () => { closeDialogue(); act('bowden-kings-axe'); } }] : []),
    ...(learned ? [{ id: 'bowden-axes', label: 'What axes have you got?', action: () => openDialogue(npc, [
      '“Axes! A worm with a better axe is still a worm, but a faster one.” He waves at a rack by the keep.',
    ], null, 'Back to Bowden', { choices: [
      ...axes.map(axe => {
        const owned = has(axe.id), short = lv < axe.level, poor = purse < axe.price;
        return { id: `bowden-buy-${axe.id}`, label: `${axe.name} · ${axe.price} copper${axe.level > 1 ? ` · Woodcutting ${axe.level}` : ''}`, disabled: owned || short || poor,
          reason: owned ? 'You already carry one.' : short ? `You need a Woodcutting level of ${axe.level} to use a ${axe.name.toLowerCase()}.` : poor ? `That is ${axe.price} copper, and you have ${purse}.` : '',
          action: () => { closeDialogue(); act(`bowden-buy-${axe.id}`); } };
      }),
      { id: 'bowden-axes-none', label: 'Just looking.', action: again },
    ] }) }] : []),
    ...(builder && !builder.known ? [{ id: 'bowden-build', label: 'Could you teach me to build?', action: () => { act('bowden-build'); openDialogue(npc, [...builder.teach], null, 'Back to Bowden', { onComplete: again }); } }] : []),
    ...(builder?.known && builder.saw.planks ? [{ id: 'bowden-saw', label: `Saw my logs into planks. (${builder.saw.planks} for ${builder.saw.fee} copper)`, disabled: purse < builder.saw.fee,
      reason: purse < builder.saw.fee ? `That is ${builder.saw.fee} copper, and you have ${purse}.` : '', action: () => { closeDialogue(); act('bowden-saw'); } }] : []),
    ...(offer.logs ? [{ id: 'bowden-sell', label: `I’ve brought logs for the kiln. (${offer.logs} for ${offer.total} copper)`, action: () => { closeDialogue(); act('bowden-sell'); } }] : []),
    { id: 'bowden-king', label: 'Why do they call you King?', action: () => talk(TALK.king) },
    { id: 'bowden-kiln', label: 'What’s that smoking mound?', action: () => talk(TALK.kiln) },
    { id: 'bowden-rival', label: 'Anyone you don’t get on with?', action: () => talk(TALK.rival) },
    { id: 'leave-bowden', label: 'Long live the King.', action: () => openDialogue(npc, [LEAVE], null, 'Back to the road') },
  ] });
  return true;
}
/** What he says, handing things over. */
export const bowdenLines = freeze({
  sell: (logs, copper) => [`He tips the logs onto the kiln stack and counts ${copper} copper into your hand, very slowly, as if each one hurt. “${logs} logs. The kiln thanks you. The King tolerates you.”`],
  axe: axe => [`He takes it down off the rack, spits on the blade, polishes it on his sleeve and hands you the ${axe.name.toLowerCase()}. “Swing it like you mean it, worm.”`],
  kingsAxe: [
    `“Level ${KINGS_AXE_LEVEL}? ${LAUGH} Liar. Show me.” You show him. He is quiet for a moment.`,
    'He goes into the keep and comes back with an axe wrapped in a green cloth: a long black haft and a broad head with a line of little spikes along the back, polished like a mirror.',
    '“My father’s. The King’s axe. It has cut every walnut in this lot twice. You are still a worm. But you are my worm now. Take it.”',
  ],
});

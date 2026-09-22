/**
 * Archaeology, taught by Lakota, the hired sword who watches birds and digs as
 * well: old towns and older bones. His first errand is the ruins of Rena at
 * the heart of Drent, burned eighty years ago and never rebuilt (src/rena.js).
 * He has pegged the places worth looking at; the traveler reads each one and
 * writes it up. Nothing is carried off: a thing out of its place is a thing with
 * its story cut away, and Lakota will not have it.
 *
 * Paleontology is part of it. The hall's threshold slab came from the hard
 * country inland, and something walked across it on three toes long before
 * anybody quarried it.
 * Pure: no DOM, no three.
 */
import { RENA, RENA_RUINS, renaPoint, OLD_ROAD_YAW } from './rena.js';

export const ARCHAEOLOGY_VERSION = 1;
export const ARCHAEOLOGY_SKILL = 'archaeology';
/** How many of Rena's finds Lakota wants written up before you come back to him. */
export const RENA_NEEDED = 5;
export const RENA_REPORT_XP = 40;

const entryOf = (id, entry) => Object.freeze({ id, ...entry });
const at = point => Object.freeze({ x: point.x, z: point.z });
const plot = id => RENA_RUINS.plots.find(entry => entry.id === id);
/** The hall's doorway, where src/rena-works.js leaves the gap in its street wall: the threshold. */
const hallDoor = (() => {
  const h = RENA_RUINS.hall, yaw = OLD_ROAD_YAW + Math.PI / 2 + (h.b > 0 ? Math.PI : 0), c = Math.cos(yaw), s = Math.sin(yaw);
  const u = h.width * .12, v = -h.depth / 2;
  return { x: h.x + u * c + v * s, z: h.z - u * s + v * c };
})();

/** What lies at Rena, each where its story put it. `kind` is 'artifact' or 'fossil'. */
export const RENA_FINDS = Object.freeze({
  arrowheads: entryOf('arrowheads', {
    name: 'Iron arrowheads', xp: 15, kind: 'artifact', site: 'gate', ...at(renaPoint(-33, -2.2)),
    note: 'Four of them in the turf by the fallen gate post, rusted to the shape of a thumb, all pointing the same way: into the town.',
    lore: 'The attack came up the old road from the east and through this gate. Whoever shot these was standing where Tidehaven is now.',
  }),
  lintel: entryOf('lintel', {
    name: 'The burnt lintel', xp: 15, kind: 'artifact', site: 'gate', ...at(RENA_RUINS.gate.lintel),
    note: 'The gate’s lintel stone, lying in the grass. The underside has gone pink and cracked, the way sandstone goes in a great fire.',
    lore: 'Stone reddens at a heat a house fire reaches. The whole gate burned, with the timber over it, before the lintel came down.',
  }),
  coin: entryOf('coin', {
    name: 'A coin of Rena', xp: 20, kind: 'artifact', site: 'market', ...at(renaPoint(-6.6, -4.6)),
    note: 'A worn bronze coin in the roots by the market cross, stamped with a tree on one side and three letters on the other that nobody alive can read.',
    lore: 'Rena struck its own money. That means a mint, a treasury, and somebody who thought the town would outlast him.',
  }),
  whorl: entryOf('whorl', {
    name: 'A spindle whorl', xp: 15, kind: 'artifact', site: 'house', ...at(renaPoint(plot('plot-5').a + 1.5, plot('plot-5').b - 1.2)),
    note: 'A fired clay disc the size of a large coin with a hole through the middle, in the ash of a house floor.',
    lore: 'The weight on a spindle, to keep it turning. Somebody sat here spinning wool the evening before, and did not come back for it.',
  }),
  comb: entryOf('comb', {
    name: 'A bone comb', xp: 15, kind: 'artifact', site: 'house', ...at(renaPoint(plot('plot-8').a - 1.8, plot('plot-8').b + 1.4)),
    note: 'Half of a double-sided comb cut from a flat bone, the fine teeth on one side and the coarse on the other, riveted with bronze.',
    lore: 'The fine side is for nits. Every household had one, and every household lost one down the gap by the hearth.',
  }),
  sherds: entryOf('sherds', {
    name: 'Hearth sherds', xp: 15, kind: 'artifact', site: 'hall', ...at(renaPoint(RENA_RUINS.hall.a + 1.2, RENA_RUINS.hall.b - 2.4)),
    note: 'Broken pottery round the hall’s hearth: plain brown kitchen ware, and a few pieces of a fine green-glazed jug that did not come from anywhere in Drent.',
    lore: 'The brown was made here. The green came by ship. Rena was rich enough to eat off its neighbours’ pots.',
  }),
  track: entryOf('track', {
    name: 'A three-toed track', xp: 30, kind: 'fossil', site: 'hall', ...at(hallDoor),
    note: 'In the hall’s threshold slab, a print as long as your hand: three toes, each ending in a point, pressed into what was once mud.',
    lore: 'The slab is red shale from the hard country inland. Whatever made this walked on two legs across a lake shore before there was a Drent, or a sea where the sea is. The builders laid it face up at the door. They must have wondered too.',
  }),
});
export const RENA_FIND_IDS = Object.freeze(Object.keys(RENA_FINDS));

export const ARCHAEOLOGY_LESSON = Object.freeze([
  'Look before you touch. Where a thing lies tells you more than the thing: under which floor, beside what, pointing which way.',
  'I have pegged the places at Rena worth your time. Stand at a peg and press F to look properly. Write it down. Leave it where it is.',
  'A thing taken out of the ground is a thing with its story cut off. We are not treasure hunters. We are the last people who will ever see it where it fell.',
]);

export function validateArchaeologySnapshot(data, { allowMissing = true } = {}) {
  if (data === undefined) return allowMissing;
  if (!data || typeof data !== 'object' || Array.isArray(data) || data.version !== ARCHAEOLOGY_VERSION) return false;
  if (typeof data.met !== 'boolean' || !['none', 'rena', 'reported'].includes(data.quest)) return false;
  if (!data.met && data.quest !== 'none') return false;
  if (!data.found || typeof data.found !== 'object' || Array.isArray(data.found)) return false;
  return Object.entries(data.found).every(([id, count]) => Object.hasOwn(RENA_FINDS, id) && Number.isInteger(count) && count >= 1 && count <= 1e6);
}

export function createArchaeology({ skills, onEvent = () => {} } = {}) {
  const state = { met: false, quest: 'none', found: {} };
  const foundCount = () => Object.keys(state.found).length;

  /** Lakota teaches it, and sends the traveler to Rena. */
  function meet() {
    const first = !state.met;
    state.met = true;
    if (state.quest === 'none') state.quest = 'rena';
    const learned = skills?.learn?.(ARCHAEOLOGY_SKILL) ?? { ok: false };
    if (first) onEvent({ type: 'archaeology-learned' });
    // `first` last: this is the teacher's own first time, not the skill's (src/skills.js).
    return { ok: true, ...learned, first };
  }

  /** A pegged place read properly and written up. Nothing is taken. */
  function find(id) {
    if (!state.met) return { ok: false, reason: 'Somebody has pegged this spot and tied a ribbon to the peg. Lakota, the man on the road with the hawk, digs as well as he watches.' };
    const entry = RENA_FINDS[id];
    if (!entry) return { ok: false, reason: 'There is nothing here to read.' };
    const first = !state.found[id];
    state.found[id] = (state.found[id] ?? 0) + 1;
    const gained = first ? skills?.gain?.(ARCHAEOLOGY_SKILL, entry.xp) ?? { ok: false } : null;
    onEvent({ type: 'find-recorded', id, first });
    return { ok: true, first, entry, count: state.found[id], xp: first ? entry.xp : 0,
      level: skills?.level?.(ARCHAEOLOGY_SKILL) ?? 1, levelled: !!gained?.levelled, ready: state.quest === 'rena' && foundCount() >= RENA_NEEDED };
  }

  /** Bring the notes from Rena back to Lakota. */
  function report() {
    if (state.quest !== 'rena') return { ok: false, reason: state.quest === 'reported' ? 'He has your notes on Rena already.' : 'He has not sent you anywhere yet.' };
    if (foundCount() < RENA_NEEDED) return { ok: false, reason: `${foundCount()} of the ${RENA_NEEDED} he asked for. Rena has more.` };
    state.quest = 'reported';
    const gained = skills?.gain?.(ARCHAEOLOGY_SKILL, RENA_REPORT_XP) ?? { ok: false };
    onEvent({ type: 'rena-reported' });
    return { ok: true, xp: RENA_REPORT_XP, levelled: !!gained?.levelled, level: skills?.level?.(ARCHAEOLOGY_SKILL) ?? 1 };
  }

  /** The errand, for the journal: where it stands. */
  function task() {
    if (state.quest === 'rena') {
      return foundCount() >= RENA_NEEDED
        ? { title: 'The ruins of Rena', stage: 'report', target: 'bird-watcher', detail: `${foundCount()} finds written up. Take your notes back to Lakota, wherever the road has got him to.` }
        : { title: 'The ruins of Rena', stage: 'dig', target: RENA.id, detail: `Read the places Lakota has pegged at the ruins of Rena, in the forest at Drent’s heart: ${foundCount()} of ${RENA_NEEDED}.` };
    }
    return null;
  }

  function view() {
    return { met: state.met, quest: state.quest, foundCount: foundCount(), total: RENA_FIND_IDS.length, task: task(),
      entries: RENA_FIND_IDS.map(id => ({ id, found: !!state.found[id], kind: RENA_FINDS[id].kind,
        name: state.found[id] ? RENA_FINDS[id].name : 'A pegged place at Rena',
        detail: state.found[id] ? RENA_FINDS[id].note : state.met ? `At the ${RENA_FINDS[id].site} of the old town.` : 'Lakota, the man on the road with the hawk, digs as well.' })) };
  }

  function snapshot() { return { version: ARCHAEOLOGY_VERSION, met: state.met, quest: state.quest, found: { ...state.found } }; }
  function restore(data) {
    state.met = false; state.quest = 'none'; state.found = {};
    if (!validateArchaeologySnapshot(data, { allowMissing: false })) return false;
    state.met = data.met; state.quest = data.quest; state.found = { ...data.found };
    return true;
  }

  return { meet, find, report, task, view, snapshot, restore, foundCount,
    get met() { return state.met; }, get quest() { return state.quest; }, hasFound: id => !!state.found[id] };
}

/**
 * The long road through Drent: the optional walk that takes the whole of the company's day.
 *
 * At the fork — the letter read, the satchel shut, Chris saying his piece at the Greenway
 * Watch — the traveler may go straight up the road to the muster and be the first of the eleven
 * in, or walk Drent with Chris and be the last. Walking it is eighty-seven minutes, because that
 * is how long the tenth mercenary takes to reach the Moros (`src/mercenaries.js`, pinned by
 * `tests/long-road-clock.test.js`), and the Marshal does not march until the eleventh reports.
 *
 * This module is the frame and never the lessons. Every teacher, errand and reward on the road
 * is somebody else's module and stays exactly where it is: what is here is which stops make up
 * the walk, which leg each belongs to, which one wears the open gold next, and the three things
 * the walk itself remembers. So **a stop is done when the world says it is done** — the skill is
 * learned, the acorns are in, the parcels are delivered, the ground is on the chart — derived the
 * way `src/story-chapters.js` derives its chapters, from views this module only ever reads.
 *
 * Three things have no view of their own and so are saved here: whether the fork has been put to
 * the traveler, whether the players' play at Fernway has been watched, and how many of Chris's
 * five Ambroni drills have been given. A fourth is the release of Chris himself — the pair of
 * numbers that puts him back on the company's clock (`docs/drent-long-road.md` §3) — and a fifth
 * is where the traveler was standing when each mercenary went past, which the muster asks for.
 *
 * The long road never advances or blocks the main journey. It adds; it replaces nothing.
 * Pure: no DOM, no three.
 */
import { subregion } from './map-fog.js';
import { mercenaryById } from './mercenaries.js';

const freeze = Object.freeze;

export const LONG_ROAD_VERSION = 1;
/** One drill closes each leg but the harbour's. */
export const DRILL_COUNT = 5;
/** What one drill is worth in Ambroni, through `linguist.study` (docs/drent-long-road.md §6). */
export const DRILL_EXPOSURE = 35;
export const DRILL_LANGUAGE = 'ambroni';
/** A mercenary is noticed inside the traveler's own named ground, or this near wherever they are. */
export const NOTICE_RANGE = 40;
/** The tongue turns readable here, which is what the East Rena Stone is for (src/languages.js). */
const SIGN_READING = 50;
/** What Mara's countersigned village chart is worth: one block of cartography, once. */
export const CORNERS_XP = 60;

/**
 * Mara's second cartography lesson: the three corners of Tidehaven.
 *
 * The first was the rough chart she hands over on the pier, which is somebody else's drawing.
 * This is the traveler's own: walk to the three corners of the village and the ground between
 * them draws itself, and she countersigns what comes back.
 *
 * The three are named here because the chart cannot name them. The pier is a landmark, but the
 * Weatherhead and the Koopwood are neither landmarks nor named grounds — they are a headland and
 * a woodlot, and the chart knows them only as ground walked. So "walked" is the fog's own
 * answer, `knowsPoint`, at each of the three: the hex under it has been stood on.
 */
export const VILLAGE_CORNERS = freeze([
  freeze({ id: 'pier', name: 'The head of the pier', x: 0, z: 25, hint: 'Where she is standing, and where you came ashore.' }),
  freeze({ id: 'weatherhead', name: 'The Weatherhead', x: 2, z: 102, hint: 'The low head south of the landing, where Cabe Tolliver sits and calls the weather.' }),
  freeze({ id: 'koopwood', name: 'The Koopwood', x: -32.3, z: -14.4, hint: 'Bowden Koop’s woodlot, north-west of the village, on the edge of the wood.' }),
]);
export const CORNER_STAGES = freeze(['unasked', 'asked', 'signed']);
/** Which of the three corners the chart has the ground of. `mapFog.knowsPoint` is the fog's own answer. */
export function cornersWalked(state) {
  const fog = state?.mapFog;
  const knows = typeof fog?.knowsPoint === 'function' ? (x, z) => !!fog.knowsPoint(x, z) : () => false;
  return VILLAGE_CORNERS.map(corner => ({ ...corner, walked: knows(corner.x, corner.z) }));
}

/**
 * The five legs and the harbour they start from. Each of the five holds one of the clock's
 * landings, which is why there are five and not four or six: a boat comes in at 6, 18, 33, 48
 * and 63 minutes, and a leg is the walking between two bells.
 */
export const LONG_ROAD_LEGS = freeze([
  freeze({ leg: 0, title: 'The harbour', note: 'Both roads begin here: Mara, the practice post, the raid, and the letter read.' }),
  freeze({ leg: 1, title: 'Tidehaven, which you ran through', note: 'The village you came ashore in, at walking pace: a bird, a kitchen, and your own chart.' }),
  freeze({ leg: 2, title: 'The near wood', note: 'Willowmere and the Koopwood: a rod, a fire, and the first skill you grind.' }),
  freeze({ leg: 3, title: 'Fernway', note: 'Where the woodland paths meet: the damp ground behind the Rest, and players camped on the verge.' }),
  freeze({ leg: 4, title: 'The Avrel clearing', note: 'The army’s post, the ruins north of it, and the mill commons.' }),
  freeze({ leg: 5, title: 'The Caloss road', note: 'The hedge, the stream and the bridge, where the country opens toward Luscia.' }),
]);

/**
 * `point` is where the stop is, in world metres, and it is here for one reason: the muster asks
 * each of the ten where you were when he walked past you, and the answer is the stop you were
 * nearest. `tests/drent-spacing.test.js` holds these against the stands the world actually uses.
 *
 * `reads` names the view a stop is judged by, so the table can be read as a list of promises
 * about what this module depends on: skills, acornQuest, journey, mapFog, linguist, or its own.
 */
const stop = ({ id, leg, kind, npc = null, place = null, skill = null, system = null, subregion: ground = null, point, reads, done, title, detail }) =>
  freeze({ id, leg, kind, npc, place, skill, system, subregion: ground, point: freeze({ ...point }), reads, done, title, detail });

/** Whether a skill has been learned, from `createSkills().known`, a list of ids, or a plain map. */
const learned = (state, id) => {
  const skills = state?.skills;
  if (!skills || !id) return false;
  if (typeof skills.known === 'function') return !!skills.known(id);
  if (Array.isArray(skills)) return skills.includes(id);
  return !!skills[id];
};
/** Whether a named ground is on the traveler's chart, from `createMapFog()`, its view, or a list. */
const charted = (state, id) => {
  const fog = state?.mapFog;
  if (!fog || !id) return false;
  const found = Array.isArray(fog) ? fog : typeof fog.found === 'function' ? fog.found() : fog.found;
  return Array.isArray(found) && found.some(entry => (entry?.id ?? entry) === id);
};
/** What the traveler has of a tongue, from `createLinguist().level` or a plain map of numbers. */
const tongue = (state, id) => {
  const linguist = state?.linguist;
  if (!linguist) return 0;
  return Number(typeof linguist.level === 'function' ? linguist.level(id) : linguist[id]) || 0;
};
const acornsDone = state => (typeof state?.acornQuest === 'string' ? state.acornQuest : state?.acornQuest?.status) === 'complete';

/**
 * Every stop on the long road, in the order the open gold offers them.
 *
 * The spine is the curriculum and the branches are what is on the way. A branch is here only
 * when the long road can honestly see whether it has been taken; the rest of Drent's optional
 * life — Wendel's coin, Toft's errand, the Bee Fold, the ferry, the Sultana, the Quiet Bank —
 * wears its own leaf or scroll and is none of this module's business.
 */
export const LONG_ROAD_STOPS = freeze([
  // Leg 0 — the harbour. Both roads walk it, and it ends at the fork.
  stop({ id: 'pier-chart', leg: 0, kind: 'spine', npc: 'harbormaster', skill: 'cartography', subregion: 'eastreena', point: { x: 0, z: 25 },
    reads: 'skills', done: state => learned(state, 'cartography'),
    title: 'Mara at the head of the pier', detail: 'The letter, and the rough chart the village keeps. Being given directions is the first cartography there is.' }),
  stop({ id: 'the-fork', leg: 0, kind: 'spine', place: 'The Greenway Watch', system: 'the-letter', subregion: 'the-greenway', point: { x: -85, z: 29 },
    reads: 'longRoad', done: (state, own) => !!own.told,
    title: 'The letter read, at the Watch', detail: 'Nine of the eleven are still at sea and the Marshal will not march short. Go up the road now, or learn the country you are about to fight for.' }),

  // Leg 1 — Tidehaven at walking pace. Two knowing skills where the village is.
  stop({ id: 'bird-garden', leg: 1, kind: 'spine', npc: 'garden-keeper', skill: 'birding', subregion: 'eastreena', point: { x: -24.4, z: 4.4 },
    reads: 'skills', done: state => learned(state, 'birding'),
    title: 'Perrin at the bird garden', detail: 'The feeder, the pointer, and the first garden bird you look at properly. Thirty metres from the pier you ran past.' }),
  stop({ id: 'lysa-acorns', leg: 1, kind: 'spine', npc: 'acorn-cook', skill: 'cooking', subregion: 'eastreena', point: { x: -10.9, z: 34.6 },
    // Rule 1 of the eleven: a lesson is shortened, never skipped. Somebody who already cooks
    // does not need the first-find step, so the errand is a swap rather than a lesson and the
    // stop counts either way (docs/drent-long-road.md §10). Every other stop here derives from
    // the skill already, so this is the only one the rule has to be written into.
    reads: 'acornQuest', done: state => acornsDone(state) || learned(state, 'cooking'),
    title: 'Lysa’s acorns', detail: 'Five acorns off the Greenway floor, and the tinderbox she gives for them, which is every fire you light after this.' }),
  stop({ id: 'village-corners', leg: 1, kind: 'spine', npc: 'harbormaster', skill: 'cartography', subregion: 'eastreena', point: { x: 0, z: 25 },
    reads: 'longRoad', done: (state, own) => own.corners === 'signed',
    title: 'Mara again: the three corners', detail: 'The pier, the Weatherhead and the Koopwood, walked and drawn on your own chart instead of hers, and countersigned when you bring it back.' }),

  // Leg 2 — the near wood. One you do, one you make, one you grind.
  stop({ id: 'bran-rod', leg: 2, kind: 'spine', npc: 'pond-fisher', skill: 'fishing', subregion: 'willowmere', point: { x: -102, z: 8.6 },
    reads: 'skills', done: state => learned(state, 'fishing'),
    title: 'Bran at Willowmere', detail: 'A rod, a float, and one fish out of the pond. Willowmere is the water you can stand up in; the Caloss is the water you cannot.' }),
  stop({ id: 'willowmere-fire', leg: 2, kind: 'spine', place: 'The Willowmere firepit', skill: 'cooking', subregion: 'willowmere', point: { x: -92, z: 11.2 },
    reads: 'skills', done: state => learned(state, 'cooking'),
    title: 'The catch, on the stone firepit', detail: 'Lysa’s tinderbox, a fire of your own, and the fish you just landed cooked on it.' }),
  stop({ id: 'bowden-axe', leg: 2, kind: 'spine', npc: 'woodcutter-bowden', skill: 'woodcutting', subregion: 'eastreena', point: { x: -33.8, z: -7.8 },
    reads: 'skills', done: state => learned(state, 'woodcutting'),
    title: 'Bowden in the Koopwood', detail: 'Logs until level two, which is where the ninety-nine table stops being a number and becomes a thing you can feel.' }),
  stop({ id: 'house-plot', leg: 2, kind: 'branch', npc: 'woodcutter-bowden', skill: 'construction', subregion: 'eastreena', point: { x: -33.8, z: -7.8 },
    reads: 'skills', done: state => learned(state, 'construction'),
    title: 'The plot beside the Koopwood', detail: 'Nobody builds a house in a tutorial. He shows you the ground anyway, and it is still yours in a hundred hours.' }),

  // Leg 3 — Fernway, and the first language lesson that is not a lesson.
  stop({ id: 'odger-fernway', leg: 3, kind: 'spine', npc: 'mycologist', skill: 'mycology', subregion: 'fernway', point: { x: -128.4, z: 39.6 },
    reads: 'skills', done: state => learned(state, 'mycology'),
    title: 'Odger Pell at Fernway Rest', detail: 'A rack where the paths meet, and Fern Hollow behind it: the dampest old wood in Drent, and the only place a mushroom wants to be.' }),
  stop({ id: 'fernway-play', leg: 3, kind: 'spine', place: 'The players’ camp on the verge', system: 'drentish', subregion: 'fernway', point: { x: -110.6, z: 29.3 },
    reads: 'longRoad', done: (state, own) => !!own.played,
    title: 'A play, in Drentish', detail: 'Talaelos improvise something short on the verge. Many mouths at once, none of them explaining, and Chris murmuring under it.' }),
  stop({ id: 'east-rena-stone', leg: 3, kind: 'branch', place: 'The East Rena Stone', system: 'drentish', subregion: 'fernway', point: { x: -128, z: 34 },
    reads: 'linguist', done: state => tongue(state, 'drentish') >= SIGN_READING,
    title: 'The East Rena Stone', detail: 'The first writing in Drent you can read, ten seconds up the road from the bench, at about the minute the tongue crosses fifty.' }),
  stop({ id: 'scouts-camp', leg: 3, kind: 'branch', place: 'The Bramble Scout Camp', system: 'the-tessen', subregion: 'bramble-woods', point: { x: 55, z: -190 },
    reads: 'mapFog', done: state => charted(state, 'bramble-woods'),
    title: 'Over the Tessen', detail: 'The one brush with danger on the long road, and it is optional. Chris waits at the road post talking Ambroni with Drevan’s garrison.' }),

  // Leg 4 — the Avrel clearing: the register, the ruins, and a skill that runs on the clock.
  stop({ id: 'corvan-register', leg: 4, kind: 'spine', npc: 'meadow-courier', system: 'the-register', subregion: 'avrel', point: { x: -415.4, z: 17.8 },
    reads: 'journey', done: state => !!state?.journey?.courierComplete,
    title: 'Corvan at the army’s post', detail: 'The letter copied into the field register, the names already signed read back to you, and the parcels that are the same errand on either road.' }),
  stop({ id: 'rena-dig', leg: 4, kind: 'spine', place: 'The ruins of Rena', skill: 'archaeology', subregion: 'rena', point: { x: -395, z: -70 },
    reads: 'skills', done: state => learned(state, 'archaeology'),
    title: 'The ruins of Rena', detail: 'A hundred and ten metres north of the road, and the principal town of Drent until they pulled it down. One peg lifted.' }),
  stop({ id: 'enna-rows', leg: 4, kind: 'spine', npc: 'commons-miller', skill: 'farming', subregion: 'avrel', point: { x: -418.4, z: 59.8 },
    reads: 'skills', done: state => learned(state, 'farming'),
    title: 'Enna at the Mill Commons', detail: 'A row sown, and reaped on the way back from Rena. The one skill that grows while you are somewhere else, which is what the company is doing too.' }),
  stop({ id: 'applegarth', leg: 4, kind: 'branch', place: 'Applegarth', system: 'the-letter', subregion: 'applegarth', point: { x: -568, z: -32 },
    reads: 'mapFog', done: state => charted(state, 'applegarth'),
    title: 'Applegarth, and Hesta Ardry', detail: 'The orchard village at the west end of the old Rena road, and Lorn’s letter for his sister.' }),

  // Leg 5 — the Caloss road. The hedge, the stone, and a tongue nobody here can teach you.
  stop({ id: 'nell-hedge', leg: 5, kind: 'spine', npc: 'botanist', skill: 'botany', subregion: 'avrel', point: { x: -482.4, z: 38.3 },
    reads: 'skills', done: state => learned(state, 'botany'),
    title: 'Nell Harrow at the Sunken Lane', detail: 'Two hedge banks eighty years unlaid, where the old drove crosses the road. The best botany in Drent, and hazel and bramble in the satchel.' }),
  // The Toll House stream lies in no named ground at all: it is 113 m from the Avrel clearing's
  // centre and 84 m from the Caloss Bank's, outside the reach of both. So Silas is the one stop
  // the chart cannot name, and the only way he is noticed going past is the forty metres.
  stop({ id: 'silas-stream', leg: 5, kind: 'spine', npc: 'geologist', skill: 'geology', subregion: null, point: { x: -513.43, z: 94.15 },
    reads: 'skills', done: state => learned(state, 'geology'),
    title: 'Silas Garrow at the Toll House stream', detail: 'A cart of marl on the road side of the house, and a stream cut that is a geologist’s section. Ironstone out of a furrow.' }),
  stop({ id: 'hollis-bridge', leg: 5, kind: 'spine', npc: 'crossing-keeper', system: 'the-bridge', subregion: 'caloss-crossing', point: { x: -628.1, z: 156.2 },
    reads: 'journey', done: state => !!state?.journey?.bridgeComplete,
    title: 'Hollis, and the bridge', detail: 'He speaks Luscian Mittoli, which is none of Chris’s three. The aside under the line is empty for the first time, and Chris says so, and then goes on ahead.' }),
]);

export const LONG_ROAD_STOP_IDS = freeze(LONG_ROAD_STOPS.map(row => row.id));
const STOP_BY_ID = new Map(LONG_ROAD_STOPS.map(row => [row.id, row]));
export const longRoadStop = id => STOP_BY_ID.get(id) ?? null;
/** The spine, in the order the open gold offers it. */
export const LONG_ROAD_SPINE = freeze(LONG_ROAD_STOPS.filter(row => row.kind === 'spine'));

const isPlainObject = value => !!value && typeof value === 'object' && !Array.isArray(value);
/**
 * What `seenAt` holds when the traveler was not at a stop: the named ground he was on, marked
 * so it cannot be mistaken for a stop id. A man who saw him between stops says the road.
 */
export const GROUND_PREFIX = 'ground:';
export const isGround = where => typeof where === 'string' && where.startsWith(GROUND_PREFIX) && !!subregion(where.slice(GROUND_PREFIX.length));
export const groundOfSighting = where => isGround(where) ? subregion(where.slice(GROUND_PREFIX.length)) : null;

/**
 * A save that says otherwise is not one the long road wrote. Five drills is all there are; the
 * grounds it remembers are the company's and the stops are its own; and a released Chris has
 * both a second and a distance or he is not released at all, because the pair is what puts him
 * back on the clock and one of them alone would start him from nowhere.
 */
export function validateLongRoadSnapshot(data, { allowMissing = true } = {}) {
  if (data === undefined) return allowMissing;
  if (!isPlainObject(data) || data.version !== LONG_ROAD_VERSION) return false;
  if (!Number.isInteger(data.revision) || data.revision < 0 || data.revision > 1e7) return false;
  if (typeof data.told !== 'boolean' || typeof data.played !== 'boolean') return false;
  if (!Number.isInteger(data.drills) || data.drills < 0 || data.drills > DRILL_COUNT) return false;
  // A save from before Mara had a second errand simply has not been asked.
  if (data.corners !== undefined && !CORNER_STAGES.includes(data.corners)) return false;
  if (!isPlainObject(data.seenAt)) return false;
  const seen = Object.entries(data.seenAt);
  if (seen.length > 16) return false;
  if (!seen.every(([id, where]) => !!mercenaryById(id) && (where === null || STOP_BY_ID.has(where) || isGround(where)))) return false;
  if (data.chris === null || data.chris === undefined) return true;
  if (!isPlainObject(data.chris)) return false;
  return Number.isFinite(data.chris.releasedAt) && data.chris.releasedAt >= 0
    && Number.isFinite(data.chris.releasedDistance) && data.chris.releasedDistance >= 0;
}

export function createLongRoad({ onEvent = () => {} } = {}) {
  const state = { revision: 0, told: false, played: false, drills: 0, corners: 'unasked', seenAt: new Map(), chris: null };

  const changed = () => { state.revision++; };

  /**
   * Whether the companion is walking with the traveler right now. A release says he is not, and
   * so does saying nothing: a caller who does not tell this module who is beside the traveler
   * gets "nobody", because the failure that matters is a drill given to a man on his own.
   */
  const companionWith = world => {
    if (state.chris) return false;
    const companion = world?.companion;
    if (typeof companion === 'boolean') return companion;
    if (!isPlainObject(companion)) return false;
    return companion.with !== false && companion.phase !== 'mustered';
  };

  const doneAt = (row, world) => !!row.done(world, state);

  /**
   * The stop the traveler is nearest, **within the same forty metres a man needs to notice him**.
   * Ties go to the later leg, which is how far you had got.
   *
   * Without that reach a sighting anywhere on the road took the nearest stop however far off it
   * was, so Jerry five metres away on open ground recorded Fernway Rest a hundred and twenty
   * metres behind him, and told the whole camp the traveler had been at the bench holding a
   * mushroom up to the light. He was not. A man says what he saw or he says the road.
   */
  function nearestStop(point) {
    if (!Number.isFinite(point?.x) || !Number.isFinite(point?.z)) return null;
    let best = null, bestGap = Infinity;
    for (const row of LONG_ROAD_SPINE) {
      const gap = Math.hypot(row.point.x - point.x, row.point.z - point.z);
      if (gap < bestGap - 1e-9 || (Math.abs(gap - bestGap) <= 1e-9 && best && row.leg > best.leg)) { best = row; bestGap = gap; }
    }
    return best && bestGap <= NOTICE_RANGE ? best.id : null;
  }

  /**
   * Where the long road stands, given what every other module says. Nothing here is remembered:
   * the walk is re-derived every time it is asked for, so a skill learned on the short road or a
   * ground charted years later closes its stop without anybody telling this module about it.
   */
  /** Mara's errand: which stage it is at, which corners the chart has, and whether she may sign. */
  function corners(world = {}) {
    const walked = cornersWalked(world), left = walked.filter(corner => !corner.walked).length;
    return { stage: state.corners, corners: walked, walked: walked.length - left, of: walked.length,
      asked: state.corners !== 'unasked', signed: state.corners === 'signed',
      canSign: state.corners === 'asked' && left === 0, xp: CORNERS_XP };
  }

  function view(world = {}) {
    const rows = LONG_ROAD_STOPS.map(row => ({ ...row, done: doneAt(row, world) }));
    const byId = new Map(rows.map(row => [row.id, row]));
    const legs = LONG_ROAD_LEGS.map(leg => {
      const stops = rows.filter(row => row.leg === leg.leg);
      const spine = stops.filter(row => row.kind === 'spine');
      return { ...leg, stops, spine, done: spine.every(row => row.done), of: spine.length, closed: spine.filter(row => row.done).length };
    });
    const next = rows.find(row => row.kind === 'spine' && !row.done) ?? null;
    const spine = rows.filter(row => row.kind === 'spine');
    const walking = companionWith(world);
    // A drill closes a leg: the next one to give is `drills + 1`, and it is on offer when that
    // leg's spine is done and whoever interprets for you is still beside you. Never forced.
    const index = state.drills + 1;
    const leg = legs[index] ?? null;
    const drill = state.drills < DRILL_COUNT && leg && leg.done && walking
      ? { index, leg: leg.leg, title: leg.title, language: DRILL_LANGUAGE, exposure: DRILL_EXPOSURE } : null;
    return {
      next, legs, stops: rows, stop: id => byId.get(id) ?? null,
      told: state.told, played: state.played, drills: state.drills, drill, corners: corners(world),
      companionWith: walking, released: state.chris ? { ...state.chris } : null,
      seenAt: Object.fromEntries(state.seenAt),
      spine: { done: spine.filter(row => row.done).length, of: spine.length },
      finished: spine.every(row => row.done) && state.drills >= DRILL_COUNT,
    };
  }

  /**
   * The five things the long road does rather than watches. Each is once, and each refuses
   * rather than pretends: a drill without a companion is not a drill, and a man released twice
   * would be walking from two places at the same moment.
   */
  function act(id, context = {}) {
    if (id === 'told') {
      if (state.told) return { ok: false, reason: 'The fork has already been put to you.' };
      state.told = true; changed();
      onEvent({ type: 'long-road-told' });
      return { ok: true };
    }
    if (id === 'played') {
      if (state.played) return { ok: false, reason: 'You have seen it.' };
      state.played = true; changed();
      onEvent({ type: 'long-road-played' });
      return { ok: true };
    }
    if (id === 'corners-ask') {
      if (state.corners !== 'unasked') return { ok: false, reason: 'She has already asked you.' };
      state.corners = 'asked'; changed();
      onEvent({ type: 'long-road-corners-asked' });
      return { ok: true, corners: VILLAGE_CORNERS.map(corner => ({ ...corner })) };
    }
    if (id === 'corners-sign') {
      const offer = corners(context);
      if (state.corners === 'signed') return { ok: false, reason: 'She has signed it once, and once is what it is worth.' };
      if (!offer.canSign) return { ok: false, reason: offer.asked ? 'There is ground between those three you have not stood on yet.' : 'She has not asked you to.' };
      state.corners = 'signed'; changed();
      onEvent({ type: 'long-road-corners-signed', xp: CORNERS_XP });
      return { ok: true, xp: CORNERS_XP };
    }
    if (id === 'drill') {
      const offer = view(context).drill;
      if (!offer) return { ok: false, reason: state.drills >= DRILL_COUNT ? 'He has taught you all of it he has.' : 'Not here, and not without him.' };
      state.drills++; changed();
      onEvent({ type: 'long-road-drill', index: offer.index, language: offer.language, exposure: offer.exposure });
      return { ok: true, ...offer };
    }
    if (id === 'release') {
      const at = Number(context.at), distance = Number(context.distance);
      if (state.chris) return { ok: false, reason: 'He has already gone on.' };
      if (!(Number.isFinite(at) && at >= 0 && Number.isFinite(distance) && distance >= 0)) return { ok: false, reason: 'A man goes back on the clock from a moment and a place, or not at all.' };
      state.chris = { releasedAt: at, releasedDistance: distance }; changed();
      onEvent({ type: 'long-road-released', releasedAt: at, releasedDistance: distance });
      return { ok: true, ...state.chris };
    }
    if (id === 'recall') {
      if (!state.chris) return { ok: false, reason: 'He is already with you.' };
      state.chris = null; changed();
      onEvent({ type: 'long-road-recalled' });
      return { ok: true };
    }
    return { ok: false, reason: 'The long road does not do that.' };
  }

  /**
   * The mercenaries newly noticed this frame. A man is noticed when he is on his feet on the
   * road — walking or stopped, never still coming ashore — and either shares the traveler's own
   * named ground or comes within forty metres wherever they both are. Each of them is noticed
   * once in a game, and what is kept is the stop the traveler was nearest at the time, because
   * that is the line he has for you at the muster.
   *
   * `subregionOf(point)` is the host's: the named ground a point stands in, or null.
   */
  function notice(placements = [], travelerPoint = null, subregionOf = () => null) {
    if (!Array.isArray(placements) || !Number.isFinite(travelerPoint?.x) || !Number.isFinite(travelerPoint?.z)) return [];
    const groundOf = point => { const found = subregionOf(point); return (found?.id ?? found) || null; };
    const here = groundOf(travelerPoint), at = nearestStop(travelerPoint), fresh = [];
    // What a man who sees the traveler now can honestly say: the stop, if he was at one, and
    // otherwise the ground they were both standing on (`ground:`, a named area of the chart).
    const where = at ?? (here ? `${GROUND_PREFIX}${here}` : null);
    // A man walking beside the traveler is not a man going past him. Every companion, however
    // many the company lends you, is in the phase `with-traveler` and never `walking` or
    // `stopped` (src/mercenaries.js), so the filter below already refuses them; this says so.
    for (const placement of placements) {
      if (!placement || state.seenAt.has(placement.id) || !mercenaryById(placement.id)) continue;
      if (placement.phase !== 'walking' && placement.phase !== 'stopped') continue;
      if (!Number.isFinite(placement.x) || !Number.isFinite(placement.z)) continue;
      const gap = Math.hypot(placement.x - travelerPoint.x, placement.z - travelerPoint.z);
      const shared = !!here && groundOf(placement) === here;
      if (!shared && gap > NOTICE_RANGE) continue;
      state.seenAt.set(placement.id, where);
      const seen = { id: placement.id, name: placement.name ?? mercenaryById(placement.id).name, stopId: where, phase: placement.phase, shared, metres: gap };
      fresh.push(seen);
      onEvent({ type: 'mercenary-noticed', ...seen });
    }
    if (fresh.length) changed();
    return fresh;
  }

  function snapshot() {
    return { version: LONG_ROAD_VERSION, revision: state.revision, told: state.told, played: state.played,
      drills: state.drills, corners: state.corners, seenAt: Object.fromEntries(state.seenAt), chris: state.chris ? { ...state.chris } : null };
  }

  function restore(data) {
    state.revision = 0; state.told = false; state.played = false; state.drills = 0; state.corners = 'unasked'; state.seenAt.clear(); state.chris = null;
    if (!validateLongRoadSnapshot(data, { allowMissing: false })) return false;
    state.revision = data.revision; state.told = data.told; state.played = data.played; state.drills = data.drills;
    state.corners = data.corners ?? 'unasked';
    for (const [id, stopId] of Object.entries(data.seenAt)) state.seenAt.set(id, stopId);
    if (data.chris) state.chris = { releasedAt: data.chris.releasedAt, releasedDistance: data.chris.releasedDistance };
    return true;
  }

  return {
    view, act, notice, corners, snapshot, restore, nearestStop,
    get revision() { return state.revision; },
    get told() { return state.told; },
    get drills() { return state.drills; },
    /** Where the traveler was when this man went by, for the line he has at the muster. */
    seenAt: id => state.seenAt.get(id) ?? null,
    /** The pair of numbers that puts Chris back on the company's clock, or null while he is with you. */
    get released() { return state.chris ? { ...state.chris } : null; },
  };
}

/**
 * How the companion is placed, and how fast he moves to stay there.
 *
 * `shoulder` and `side` put him two and a half metres behind the traveler's left shoulder, which
 * is inside the twelve the interpreter's aside needs and outside the reach of every site prompt.
 *
 * `setDown` is for a wall, a river, a ferry or a horse: forty metres apart means something is
 * between you, and he is simply put back beside you. It was never meant for running. His top
 * pace used to be 6.4 m/s against a traveler's 7.2, so the gap opened at 0.8 m/s and reached the
 * forty in about fifty seconds of unbroken running - three times over on the length of Drent's
 * road - and what the player saw was Chris popping to their shoulder over and over.
 */
export const COMPANION_REACH = freeze({ shoulder: 2.5, side: -.9, stride: 4, walk: 4.2, setDown: 40 });
/** The traveler's own run, from the host's movement (src/main.js). */
export const TRAVELER_RUN = 7.2;
/**
 * What he does with his legs, given how far he is off that spot. Inside a stride he walks; past
 * it he runs, and he runs **faster than the traveler runs**, because a man who exactly matches
 * your speed never closes the gap that opened while you were both getting up to it. The further
 * behind he is the harder he comes, up to a limit, so he catches up and then settles.
 */
export function companionPace(gap, travelerRun = TRAVELER_RUN) {
  const off = Number(gap) || 0;
  if (!(off > COMPANION_REACH.stride)) return COMPANION_REACH.walk;
  return travelerRun + Math.min(2.4, .6 + (off - COMPANION_REACH.stride) * .3);
}

/**
 * The fork, in the companion's own words, at the moment the satchel shuts.
 *
 * It is not a menu and it asks for no answer: you choose by walking. He speaks in your own
 * tongue because he is the one man on this coast who can (`INTERPRETER`, src/languages.js), and
 * he is a slot rather than a name — Chris Gotwood for ten of the eleven, Cromb when you are
 * Chris — so the name is handed in.
 */
export const forkLines = (name = 'Chris Gotwood') => freeze([
  `Before you set off. There are eleven of us on this contract and nine are still at sea — one swam ashore behind us this morning and the last pair are a boat and an hour away yet. Venmor is paying for eleven and he will not march short.`,
  `So there is no hurry, and I mean that as a fact and not as comfort. Go straight up the road and you are first into an empty camp, or you walk Drent with me and learn the country you have been hired to fight over. The tongue first: you cannot hear what is being said to you and that will get somebody killed.`,
  `Either way I am walking with you. — ${name}`,
]);
/** The same thing in one breath, for the notice at the corner of the screen. */
export const forkNotice = () =>
  'Eleven of us on this contract, and nine still at sea. Venmor will not march short, so the road west will keep. Go straight up it and be first into an empty camp, or walk Drent with me and learn the country first. Either way I am with you.';

/** Every named ground of Drent the long road walks through, for Mara's countersign. */
export const DRENT_GROUNDS = freeze(['eastreena', 'the-greenway', 'willowmere', 'fernway', 'caloss-gate', 'avrel', 'rena', 'applegarth', 'caloss-bank']);
/** Whether the chart holds all nine of them. */
export const drentCharted = state => DRENT_GROUNDS.every(id => charted(state, id));
/** The named ground a stop stands in, for the journal and the trail map. */
export const stopGround = id => subregion(longRoadStop(id)?.subregion ?? '') ?? null;

/* ------------------------------------------------------------------ *
 * The five landings, and the five drills
 * ------------------------------------------------------------------ */

/**
 * A boat comes in at 6, 18, 33, 48 and 63 minutes, and each one closes a leg.
 *
 * Two of the five cannot be seen from where the player is meant to be standing — the fourth is
 * about twelve pixels tall from Fernway and the fifth is 430 m away from Rena, past the draw
 * range — and the harbour bell is silent until somebody has turned the sound on. So a landing is
 * *announced*: a caption in the traveler's own notes, and a line from whoever is walking with
 * him. Sight and the bell are a bonus (docs/drent-long-road-probe.md, the amendments).
 */
const landing = (key, at, title, caption, said) => freeze({ key, at, title, caption, said });
export const LANDINGS = freeze([
  landing('word', 360, 'A BELL OFF THE STILLS', 'The harbour bell, once. Something came ashore that was not a boat.',
    'That is the bell. No boat in the roads, so somebody has swum it — which narrows it to one man, and he will tell you about it for an hour.'),
  landing('riders', 1080, 'THREE BELLS', 'Three at once, and an argument coming up the village street.',
    'Three bells, three of ours. They came overland and they have been arguing since the crossing; you will hear them before you see them.'),
  landing('lakota', 1980, 'A BELL OFF THE STILLS', 'One more off the Stills. Six still to come.',
    'One more in. That is over half of us on this coast now, and the Marshal is still waiting on the eleventh, who is you.'),
  landing('eliana', 2880, 'A BELL OFF THE STILLS', 'Another one landed, and the light is going a little.',
    'Another. She came on her own, by the sound of it — and she will have walked past you before you notice her.'),
  landing('princes', 3780, 'TWO BELLS · THE LAST BOAT', 'Two bells, and no more boats are due. Everybody who is coming is ashore.',
    'Two bells, and that is the last boat. Everyone on the contract is in this country now except the man at the far end of it, and the Marshal is holding the whole thing for you.'),
]);
export const LANDING_KEYS = freeze(LANDINGS.map(entry => entry.key));

/**
 * The landing the clock owes an announcement for, in `wordToastAt`'s own shape
 * (src/word-arrival.js): the latest one the clock has passed that has not been said. `said` is
 * the last key announced, which the host re-derives from `playSeconds` on a load — so reloading
 * past a landing rings nothing and says nothing, because it already happened.
 */
export function landingAt(playSeconds, said = null) {
  const at = Number.isFinite(playSeconds) ? playSeconds : 0;
  const from = said ? LANDING_KEYS.indexOf(said) + 1 : 0;
  let owed = null;
  for (let i = Math.max(0, from); i < LANDINGS.length; i++) if (at >= LANDINGS[i].at) owed = LANDINGS[i];
  return owed ?? null;
}

/**
 * Chris's five Ambroni drills: one to close each leg, thirty-five exposure each, given through
 * his own conversation and never forced. A drill is a minute — six lines of the army's speech
 * with what each one means — and there is no quiz at the end of it, because the player never
 * has to learn a word (docs/languages.md).
 *
 * The lines are written in English and *spoken* in Ambroni, through the same renderer every
 * other line in the game goes through, so the tongue is the game's own and not something
 * invented here. What the drill adds is the gloss underneath.
 *
 * When the traveler is Chris the same six lines run with the speakers swapped: the companion
 * asks and the traveler gives the drill. It pays the same, because giving a lesson in a tongue
 * is how anybody keeps one.
 */
const drill = (index, title, opening, lines, closing) => freeze({ index, leg: index, title, opening, lines: freeze(lines), closing });
export const DRILLS = freeze([
  drill(1, 'The words that get you through a gate',
    'Sit down a minute. You have had a morning of people you cannot follow, and the army is worse, because the army says the same eight things at you and expects an answer.',
    ['Halt. Name and contract.', 'Hired sword, off the Tidehaven boats.', 'Pass.', 'Wait here.', 'Who sent you?', 'Go on through.'],
    'That is a gate. Say the second one and look bored, and you will never have trouble at one again.'),
  drill(2, 'The words for a road',
    'The army writes its roads down and then shouts them at people. These are the shouts.',
    ['The road west.', 'Two miles, then the bridge.', 'The crossing is open.', 'The crossing is shut.', 'Stay on the road.', 'There is fighting ahead.'],
    'That last one you want to hear early rather than late, so learn it first and the others after.'),
  drill(3, 'The words for a camp',
    'A camp is a village that hates you. Everything in it is a rule, and they are all said the same way.',
    ['Report to the tent with the standard.', 'Draw rations here.', 'Do not go past the ditch.', 'Water is that way.', 'The Marshal is not seeing anybody.', 'Stand down.'],
    'Stand down is the one that matters. Everything else is somebody telling you where the food is.'),
  drill(4, 'Your own name, in their mouths',
    'Corvan has your name in his register in Ambroni, so you may as well be able to read it. Come and stand at the desk.',
    ['I am the sworn sword of the contract.', 'Eleven were hired.', 'My name is written here.', 'I report to the Marshal on the Moros.', 'I carry no orders.', 'I am not late.'],
    'Say the last one in the camp and somebody will laugh, which is worth more than the correct answer.'),
  drill(5, 'The words for a fight',
    'One more, and it is the short one, because in the middle of it nobody has time for grammar.',
    ['Hold the line.', 'Forward.', 'Fall back.', 'On my left.', 'Down.', 'It is done.'],
    'Six words. If you only ever keep one, keep Down, and keep it where you can reach it.'),
]);
export const drillFor = index => DRILLS.find(entry => entry.index === index) ?? null;

/**
 * One drill, ready to show: the six lines as the army says them, each with what it means.
 *
 * `render` is the host's — `linguist.render`, or the pure `renderLine` — and is asked for the
 * whole line in Ambroni whatever the traveler has of it, because a drill is a lesson and not an
 * overheard sentence. `asChris` swaps the mouths: the traveler gives it, and it pays the same.
 */
export function drillScene(index, { render = line => line, name = 'Chris Gotwood', asChris = false } = {}) {
  const entry = drillFor(index);
  if (!entry) return null;
  const lines = entry.lines.map(line => ({ said: render(line), means: line }));
  const opening = asChris
    ? `${name} sits down beside you. “Go on, then. You have the Ambroni and I have a war to walk into. Teach me the words that get a man through a gate.”`
    : entry.opening;
  const closing = asChris
    ? `${name} says it all back to you, badly, and then says it again less badly. That is how it is done.`
    : entry.closing;
  return { index: entry.index, leg: entry.leg, title: entry.title, opening, lines, closing,
    study: freeze({ language: DRILL_LANGUAGE, exposure: DRILL_EXPOSURE }) };
}

/* ------------------------------------------------------------------ *
 * The eleven: rules, not rewrites
 * ------------------------------------------------------------------ */

/**
 * Whether the traveler already has the skill a stop teaches.
 *
 * Any of the eleven may be the player, and each of them lands with a different table: Lakota
 * arrives a birder, Chris arrives with Ambroni. A lesson is then **shortened, never skipped**.
 * The teacher takes one recognising branch — "you have done this before" — the first-find step
 * is waived, the stop counts, and the talk still pays its Drentish, because listening to a
 * Drent man name Drent birds is Drentish either way (docs/drent-long-road.md §10).
 */
export const knowsAlready = (skills, skillId) => learned({ skills }, skillId);

/**
 * What a spine teacher says to somebody who already does this. One line each, and every one of
 * them says the same two things underneath: I can see you know, and there is still something
 * here you have not seen — because a fen man at forty has still never seen a Drent bird, and
 * finds are finds.
 */
export const RECOGNISED = freeze({
  'pier-chart': 'You have kept a chart before. Then you know what mine is worth and what it is not. Take it anyway; the coast on it is right.',
  'village-corners': 'You have surveyed. Good — then walk my three corners and hand me back something I can countersign without reading it twice.',
  'bird-garden': 'Oh, you look. I can tell from where you are standing. Here — Drent’s list, and you may tick it: you have never seen these ones, whatever you have seen.',
  'lysa-acorns': 'You have cooked over a fire that was not in a kitchen. Then this is a swap and not a lesson: five acorns, and a tinderbox you will be glad of.',
  'bran-rod': 'You have held a rod. Fine. This water is not your water, and what comes out of it will surprise you at least once.',
  'willowmere-fire': 'You have laid a fire before, so lay this one and I will say nothing. The fish is the same fish everywhere; the wood is not.',
  'bowden-axe': 'YOU HAVE SWUNG ONE! Good! Then swing it at MY trees and we will find out what you actually know. BWAH HA HA!',
  'odger-fernway': 'You know a stump from a root. Then I will not insult you. Fern Hollow is behind the Rest and there are two things in it that will kill you; come and let me point at them.',
  'rena-dig': 'Somebody has taught you to leave it where it lies. Then the pegs are yours and I will only stand here and look pleased.',
  'enna-rows': 'You have put a row in. Then you will know why I am standing here doing nothing: it is four minutes and it does not care whether I watch.',
  'nell-hedge': 'You name things. I can hear it. So name these — eighty years unlaid, and half of it is not in anybody’s book.',
  'silas-stream': 'You pick stones up. There are men who walk this coast their whole lives and never once bend over. Come and look at this section.',
  'hollis-bridge': 'You have mended a bridge, have you. Then take the cord and I will hold the plank, and we will both pretend that is the usual way round.',
});
/** The one recognising line a stop has for somebody who already knows its skill, or null. */
export const recognisedAt = id => RECOGNISED[id] ?? null;

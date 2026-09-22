/**
 * Four kinds of mark over a head, so a player can tell at a glance what a
 * conversation is for before walking all the way to it:
 *
 *   main   the road the game is about - the letter, the officer at the post, the
 *          chapters and the destinations a chapter names. Gold, a cut stone, biggest.
 *   plot   a story of its own, with its own state and its own ending. Pale silver,
 *          a rolled sheet. The user has reserved silver for these and asked that none
 *          be built out yet (22 September 2026), so nothing wears it today.
 *   deed   a one-off that changes the world and does not move the plot: the bridge
 *          over the Caloss, which spares the next traveler the river. Copper, a ring.
 *   skill  somebody who will teach you something, or an errand that pays a skill -
 *          the rod, the acorns, the feeder, the pegs at Rena. Leaf green, a leaf.
 *
 * Each is a different silhouette as well as a different colour, because colour
 * on its own is not a signal everybody receives. Pure: src/characters.js builds
 * the meshes from this table and src/main.js reads `markerFor` once a frame.
 *
 * **What may be worn at all is the slate's business, not this file's**
 * (src/quest-slate.js): today that is gold and copper, and nothing else.
 */
import { QUEST_DONE } from './game-state.js';
import { questLive, BRIDGE_QUEST } from './quest-slate.js';

export const MARKER_KINDS = Object.freeze(['main', 'plot', 'deed', 'skill']);
/**
 * One variant, and not a fourth kind: the arc's own gold, **open** — the ring with the cut
 * stone taken out of it. Solid gold is the muster road. Open gold is the next thing Drent
 * will teach you on the way there (`src/long-road.js`, docs/drent-long-road.md §2). Following
 * one never closes the other, so a teacher keeps their green leaf and the open gold rides over
 * whichever of them is next.
 *
 * It is a grade rather than a kind: the table above stays three, `MARKER_STYLE` stays three,
 * and `markerFor` answers `{ kind: 'main', open: true }`.
 */
export const MARKER_OPEN = 'main-open';

const style = (kind, shape, scale, colour, emissive, ring, ringEmissive, what) =>
  Object.freeze({ kind, shape, scale, colour, emissive, ring, ringEmissive, what });

export const MARKER_STYLE = Object.freeze({
  main: style('main', 'diamond', 1, 0xf3c46a, 0xc17f24, 0xffeac1, 0xe5be70,
    'The road the game is about: the next thing that moves the story on.'),
  plot: style('plot', 'scroll', .88, 0xe7e3d1, 0x8e97a4, 0xf6f3e6, 0xa9b0ba,
    'A story of its own, with its own beginning and its own end.'),
  deed: style('deed', 'ring', .84, 0xc87a3c, 0x8a4a18, 0xe6a163, 0xa65e22,
    'A small good deed: it changes the world and does not move the plot.'),
  skill: style('skill', 'leaf', .82, 0x9ed079, 0x46813a, 0xd6ecb8, 0x6aa456,
    'Somebody who will teach you something, or an errand that pays a skill.'),
});

// Open gold ranks under the solid stone and over a story of its own: the road the game is
// about first, then the road Drent would rather you took, then everything else.
const RANK = Object.freeze({ main: 5, [MARKER_OPEN]: 4, plot: 3, deed: 2, skill: 1 });

/** Of the grades somebody qualifies for, the one they wear: main, then open, plot, deed, skill. */
export function strongestMarker(kinds) {
  let best = null;
  for (const kind of kinds ?? []) if (RANK[kind] && (!best || RANK[kind] > RANK[best])) best = kind;
  return best;
}

/** A mark as the host uses it: which gold, and whether it is the open ring. */
const mark = grade => grade ? Object.freeze({ kind: grade === MARKER_OPEN ? 'main' : grade, open: grade === MARKER_OPEN }) : null;
/** One word for a mark, so a mesh built for it can be cached and only rebuilt when it changes. */
export const markerGrade = marker => !marker ? null : marker.open ? MARKER_OPEN : marker.kind;
/** The look a mark wears. The open variant is the arc's own colours and shape; only the stone is missing. */
export const markerStyle = marker => marker ? MARKER_STYLE[marker.kind] ?? MARKER_STYLE.main : null;

/** The people who can carry a mark at all, by the name the host knows them under. */
export const MARKER_ROLES = Object.freeze(['harbourmaster', 'instructor', 'crossingKeeper', 'doomsayer', 'acornCook', 'pondFisher', 'forestStory', 'gardenKeeper', 'birdWatcher', 'vintner']);

const holds = (list, value) => !!list && (list instanceof Set ? list.has(value) : list.includes(value));

/**
 * Which gold `id` wears, given what the game currently knows. The host builds
 * `view` once a frame and every rule below is a plain read of it, so the rules
 * can be checked without a world to run them in.
 *
 * Answers `{ kind, open }` or null, never a bare word: a mark is which gold and whether it is
 * the open one, and the two are decided together.
 *
 * `view`: { questStage, busy, heardDoom, ids: {…MARKER_ROLES}, arcDestinations,
 * chapterDestinations, longWay, acornQuestOpen, feederWantsCook, hasRod, birdingLearned,
 * archaeologyReport, forestOpen, wineRecommended }.
 */
/**
 * **Nothing but the arc while the first shore is being walked** (the user, 22 September 2026,
 * looking at a screenshot of the landing with half a dozen marks over the rooftops).
 *
 * Every teacher and every story in Drent used to light up from `questStage >= 1`, which is the
 * moment the traveler steps off the boat: the garden keeper, the pond fisher, the acorn cook,
 * the doomsayer and the forest all wore gold over the same village at once, before the player
 * had been told what any of it was. The tutorial ends at the Caloss Gate (`TUTORIAL_DONE`),
 * Drent opens, and that is when the country's own offers are worth pointing at. Until then
 * there is one mark on the screen and it is the road the game is about.
 *
 * The arc itself is untouched: the harbourmaster, the waykeeper and the chapters' destinations
 * wear their gold whenever they hold it.
 */
export const TUTORIAL_DONE = QUEST_DONE;

export function markerFor(id, view = {}) {
  // `live` is the slate, injectable so the rules below can be read and tested whole while most
  // of what they describe is switched off (src/quest-slate.js, and `live` in src/journey.js).
  const ids = view.ids ?? {}, busy = !!view.busy, stage = view.questStage ?? 0, kinds = [];
  const live = view.live ?? questLive;
  const ashore = stage >= TUTORIAL_DONE;
  // The arc. The harbourmaster holds it until the letter is in the satchel, and Officer Glun
  // from then until the chart is handed over, which is the whole of subquests one and two.
  if (id === ids.harbourmaster && stage < 2) kinds.push('main');
  if (id === ids.instructor && stage === 2) kinds.push('main');
  if (holds(view.arcDestinations, id)) kinds.push('main');
  if (holds(view.chapterDestinations, id) && !busy) kinds.push('main');
  // **The one thing on the slate that is not the arc**: Hollis, while his bridge is unmended.
  // It is copper wherever the traveler is in the story, because it is nobody's step and waits
  // on nothing (`bridgeStage`, src/journey.js; src/quest-slate.js).
  if (id === BRIDGE_QUEST.giver && live('bridge') && !busy && ['offered', 'accepted', 'repaired'].includes(view.bridge)) kinds.push('deed');
  // And nothing else until the tutorial is behind the traveler.
  if (!ashore) return mark(strongestMarker(kinds));
  // Nor while the slate is trimmed, which is the gold and the copper above and nothing else.
  if (!live('teachers')) return mark(strongestMarker(kinds));
  // The long road's next stop, which is gold because it is main quest too, and open because it
  // is the road you may take rather than the one you must.
  if (holds(view.longWay, id) && !busy) kinds.push(MARKER_OPEN);
  // Stories of their own.
  if (id === ids.doomsayer && !view.heardDoom) kinds.push('plot');
  if (id === ids.forestStory && !busy && view.forestOpen) kinds.push('plot');
  // Teachers, and the errands that pay a skill.
  if (id === ids.acornCook && !busy && (view.acornQuestOpen || view.feederWantsCook)) kinds.push('skill');
  if (id === ids.pondFisher && !view.hasRod) kinds.push('skill');
  // Perrin's garden is where birding is taught, so his mark is up until somebody has taught it.
  if (id === ids.gardenKeeper && !busy && !view.birdingLearned) kinds.push('skill');
  // Lakota's is up when he has notes to take back, which only happens once you know him.
  if (id === ids.birdWatcher && !busy && view.archaeologyReport) kinds.push('skill');
  if (id === ids.vintner && view.wineRecommended && !busy) kinds.push('skill');
  return mark(strongestMarker(kinds));
}

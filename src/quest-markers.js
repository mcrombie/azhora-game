/**
 * Quests share a filled diamond and lower ring. Skill teachers use an open book.
 * Colour tells
 * the category: gold for the main road, silver for an independent story,
 * copper for a good deed, and green for a lesson. The live quest slate still
 * controls which offers appear; this table only controls their appearance.
 */
import { QUEST_DONE } from './game-state.js';
import { questLive, BRIDGE_QUEST } from './quest-slate.js';

export const MARKER_KINDS = Object.freeze(['main', 'plot', 'deed', 'skill']);
/** The optional long-road grade remains distinct for priority and saves, but
 * wears the same filled gold symbol as the main road. */
export const MARKER_OPEN = 'main-open';

const style = (kind, shape, scale, colour, emissive, ring, ringEmissive, what) =>
  Object.freeze({ kind, shape, scale, colour, emissive, ring, ringEmissive, what });

export const MARKER_STYLE = Object.freeze({
  main: style('main', 'diamond', 1, 0xf3c46a, 0xc17f24, 0xffeac1, 0xe5be70,
    'The road the game is about: the next thing that moves the story on.'),
  plot: style('plot', 'diamond', 1, 0xe7e3d1, 0x8e97a4, 0xf6f3e6, 0xa9b0ba,
    'A story of its own, with its own beginning and its own end.'),
  deed: style('deed', 'diamond', 1, 0xc87a3c, 0x8a4a18, 0xe6a163, 0xa65e22,
    'A small good deed: it changes the world and does not move the plot.'),
  skill: style('skill', 'book', 1, 0x9ed079, 0x46813a, 0xd6ecb8, 0x6aa456,
    'Somebody who will teach you something, or an errand that pays a skill.'),
});

// The optional road ranks under the main road and over a story of its own: the road the game is
// about first, then the road Drent would rather you took, then everything else.
const RANK = Object.freeze({ main: 5, [MARKER_OPEN]: 4, plot: 3, deed: 2, skill: 1 });

/** Of the grades somebody qualifies for, the one they wear: main, then open, plot, deed, skill. */
export function strongestMarker(kinds) {
  let best = null;
  for (const kind of kinds ?? []) if (RANK[kind] && (!best || RANK[kind] > RANK[best])) best = kind;
  return best;
}

/** A mark as the host uses it: which category, and whether it belongs to the optional road. */
const mark = grade => grade ? Object.freeze({ kind: grade === MARKER_OPEN ? 'main' : grade, open: grade === MARKER_OPEN }) : null;
/** One word for a mark, so a mesh built for it can be cached and only rebuilt when it changes. */
export const markerGrade = marker => !marker ? null : marker.open ? MARKER_OPEN : marker.kind;
/** The look a mark wears. The optional-road variant uses the same filled gold symbol. */
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
 * had been told what any of it was. The tutorial ends where Tidehaven's wood does (`TUTORIAL_DONE`),
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
  // Chip's copper good deed, while his bridge is unmended.
  // It is copper wherever the traveler is in the story, because it is nobody's step and waits
  // on nothing (`bridgeStage`, src/journey.js; src/quest-slate.js).
  if (id === BRIDGE_QUEST.giver && live('bridge') && !busy && ['offered', 'accepted', 'repaired'].includes(view.bridge)) kinds.push('deed');
  // And nothing else until the tutorial is behind the traveler.
  if (!ashore && stage < 2) return mark(strongestMarker(kinds));
  // A first lesson is a live opportunity even when optional quest chains are parked.
  if (!busy && holds(view.skillTeachers, id)) kinds.push('skill');
  if (live('civil-war-drent') && !busy && holds(view.drentDestinations, id)) kinds.push('plot');
  // A regional silver story may live while the older teachers remain off the slate.
  if (live('civil-war-vastos') && !busy && holds(view.silverDestinations, id)) kinds.push('plot');
  // Sela's already-live good deed is offered at the field; merely hearing her
  // does not accept it. Once helping, the workers hold its markers.
  if (!busy && ((id === 'lauvel-seeker' && ['unknown','hailed','asked','found','told'].includes(view.burying))
    || (view.burying === 'helping' && holds(view.buryingDestinations, id)))) kinds.push('deed');
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
  // Jean's garden is where birding is taught, so his mark is up until somebody has taught it.
  if (id === ids.gardenKeeper && !busy && !view.birdingLearned) kinds.push('skill');
  // Lakota's is up when he has notes to take back, which only happens once you know him.
  if (id === ids.birdWatcher && !busy && view.archaeologyReport) kinds.push('skill');
  if (id === ids.vintner && view.wineRecommended && !busy) kinds.push('skill');
  return mark(strongestMarker(kinds));
}

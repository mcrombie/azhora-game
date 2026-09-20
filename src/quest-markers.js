/**
 * Three kinds of gold over a head, so a player can tell at a glance what a
 * conversation is for before walking all the way to it:
 *
 *   main   the road the game is about - the letter, the quartermaster, the
 *          chapters and the destinations a chapter names. Gold, a cut stone, biggest.
 *   plot   a story of its own, with its own state and its own ending - the
 *          forest, the hideout, the doomsayer's cape. Pale silver, a rolled sheet.
 *   skill  somebody who will teach you something, or an errand that pays a skill -
 *          the rod, the acorns, the feeder, the pegs at Rena. Leaf green, a leaf.
 *
 * Each is a different silhouette as well as a different colour, because colour
 * on its own is not a signal everybody receives. Pure: src/characters.js builds
 * the meshes from this table and src/main.js reads `markerFor` once a frame.
 */
export const MARKER_KINDS = Object.freeze(['main', 'plot', 'skill']);

const style = (kind, shape, scale, colour, emissive, ring, ringEmissive, what) =>
  Object.freeze({ kind, shape, scale, colour, emissive, ring, ringEmissive, what });

export const MARKER_STYLE = Object.freeze({
  main: style('main', 'diamond', 1, 0xf3c46a, 0xc17f24, 0xffeac1, 0xe5be70,
    'The road the game is about: the next thing that moves the story on.'),
  plot: style('plot', 'scroll', .88, 0xe7e3d1, 0x8e97a4, 0xf6f3e6, 0xa9b0ba,
    'A story of its own, with its own beginning and its own end.'),
  skill: style('skill', 'leaf', .82, 0x9ed079, 0x46813a, 0xd6ecb8, 0x6aa456,
    'Somebody who will teach you something, or an errand that pays a skill.'),
});

const RANK = Object.freeze({ main: 3, plot: 2, skill: 1 });

/** Of the kinds somebody qualifies for, the one they wear: main beats plot beats skill. */
export function strongestMarker(kinds) {
  let best = null;
  for (const kind of kinds ?? []) if (RANK[kind] && (!best || RANK[kind] > RANK[best])) best = kind;
  return best;
}

/** The people who can carry a mark at all, by the name the host knows them under. */
export const MARKER_ROLES = Object.freeze(['harbourmaster', 'warden', 'doomsayer', 'acornCook', 'pondFisher', 'forestStory', 'birdWatcher', 'vintner']);

const holds = (list, value) => !!list && (list instanceof Set ? list.has(value) : list.includes(value));

/**
 * Which gold `id` wears, given what the game currently knows. The host builds
 * `view` once a frame and every rule below is a plain read of it, so the rules
 * can be checked without a world to run them in.
 *
 * `view`: { questStage, busy, heardDoom, ids: {…MARKER_ROLES}, arcDestinations,
 * chapterDestinations, acornQuestOpen, feederWantsCook, hasRod, birdingLearned,
 * archaeologyReport, forestOpen, wineRecommended }.
 */
export function markerFor(id, view = {}) {
  const ids = view.ids ?? {}, busy = !!view.busy, stage = view.questStage ?? 0, kinds = [];
  // The arc. The harbourmaster holds it until the letter is in the satchel.
  if (id === ids.harbourmaster && stage < 2) kinds.push('main');
  if (id === ids.warden && stage === 5) kinds.push('main');
  if (holds(view.arcDestinations, id)) kinds.push('main');
  if (holds(view.chapterDestinations, id) && !busy) kinds.push('main');
  // Stories of their own.
  if (id === ids.doomsayer && !view.heardDoom) kinds.push('plot');
  if (id === ids.forestStory && stage >= 1 && !busy && view.forestOpen) kinds.push('plot');
  // Teachers, and the errands that pay a skill.
  if (id === ids.acornCook && !busy && ((stage >= 1 && view.acornQuestOpen) || view.feederWantsCook)) kinds.push('skill');
  if (id === ids.pondFisher && !view.hasRod) kinds.push('skill');
  if (id === ids.birdWatcher && stage >= 1 && !busy && (!view.birdingLearned || view.archaeologyReport)) kinds.push('skill');
  if (id === ids.vintner && view.wineRecommended && !busy) kinds.push('skill');
  return strongestMarker(kinds);
}

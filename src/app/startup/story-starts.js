/**
 * Somewhere to begin besides the beginning. The main quest is built in order, so
 * the newest stretch of it is always the least played: this table says where that
 * stretch starts, what the traveler must already have done to stand there, and
 * what they carry when they do. The opening screen offers the newest one.
 *
 * Keep this honest as the arc grows: when a later chapter is built, add it here
 * and move `newest` on to it. Pure: no DOM, no three.
 */
export const STORY_START_VERSION = 1;

const start = entry => Object.freeze({ horse: true, purse: 40, ...entry });

export const STORY_STARTS = Object.freeze([
  start({
    id: 'solis-parley',
    title: 'The parley at Solis',
    kicker: 'THE NEWEST CHAPTER · WEST SUVAL',
    blurb: 'Carry the Marshal’s terms through the Gate of Sun Horses, hear what the Republic offers a sellsword, choose your side, and march to the battle on the border.',
    // The road out of Drent, Luscia and the muster on the Moros are behind the traveler.
    completed: Object.freeze(['drent-road', 'luscia-aftermath', 'moros-camp']),
    chapter: 'suval-envoy',
    beside: 'post-camp-legate',
    newest: true,
  }),
]);

/**
 * Open ground beside `stand` to begin on: the command tent, like most places
 * worth standing next to, is solid, so the ring around it is searched outward
 * until `standable(x, z)` agrees, with the horse given room of its own.
 */
export function startingSpot(stand, standable, { reaches = [2.6, 3.4, 4.5, 6, 8.5] } = {}) {
  if (!stand || typeof standable !== 'function') return null;
  for (const reach of reaches) for (let step = 0; step < 12; step++) {
    const angle = step * Math.PI / 6;
    const x = stand.x + Math.sin(angle) * reach, z = stand.z + Math.cos(angle) * reach;
    if (standable(x, z)) return { x, z, reach };
  }
  return null;
}

export const newestStart = () => STORY_STARTS.find(entry => entry.newest) ?? null;
export const storyStart = id => STORY_STARTS.find(entry => entry.id === id) ?? null;

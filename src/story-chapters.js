/**
 * The main quest as the player reads it: numbered chapters with a goal apiece.
 *
 * The campaign (`src/campaign.js`) tracks the war; these are the chapters of the
 * traveler's own story, and each one closes on a plain moment the player will
 * remember — reporting for duty, carrying the rolls back, riding out to the
 * muster. A chapter is done when its `done(state)` says so, and the state is the
 * same views the journal already has. Pure: no DOM, no three.
 */
export const STORY_CHAPTER_VERSION = 1;

/**
 * Where each side stands when the fighting is done: the army keeps the outpost
 * at the centre of the Moros, the Republic keeps Solis.
 */
export const SIDE_SEATS = Object.freeze({
  empire: Object.freeze({ id: 'outpost', name: 'the army\u2019s outpost on the Moros', x: -980.7, z: 598.8, reach: 110 }),
  coalition: Object.freeze({ id: 'solis', name: 'Solis', x: -520, z: 950, reach: 140 }),
});
/**
 * But the day after the border battle each side takes the other's place: the
 * Empire storms Solis (`solis-sweep`), the Republic the outpost (`moros-outpost`).
 * Once that is done, the place taken is that side's ground, and the chapter
 * closes there, where the traveler already stands, not back at the old seat.
 */
export const CONQUESTS = Object.freeze({
  empire: Object.freeze({ variant: 'solis-sweep', seat: Object.freeze({ ...SIDE_SEATS.coalition, taken: true }) }),
  coalition: Object.freeze({ variant: 'moros-outpost', seat: Object.freeze({ ...SIDE_SEATS.empire, name: 'the outpost on the Moros', taken: true }) }),
});
/** A side's ground: its own seat, or the place it took once `conquest` (a finished aftermath variant) says it took it. */
export const sideSeat = (side, conquest = null) => (conquest && CONQUESTS[side]?.variant === conquest ? CONQUESTS[side].seat : SIDE_SEATS[side]) ?? null;
/** Whether a point stands on that side's own ground. */
export const atSideSeat = (side, point, conquest = null) => {
  const seat = sideSeat(side, conquest);
  return !!seat && !!point && Math.hypot(point.x - seat.x, point.z - seat.z) <= seat.reach;
};

const chapter = entry => Object.freeze({ ...entry, steps: Object.freeze(entry.steps) });

export const STORY_CHAPTERS = Object.freeze([
  chapter({
    number: 1, id: 'road-to-luscia', title: 'The Road to Luscia', region: 'Drent',
    goal: 'Report for duty. The Empire is gathering its hired swords at Lumber Town, across the Caloss in Luscia; get there and find the clerk who keeps the muster.',
    steps: [
      'Come ashore at Tidehaven and clear the Greenway of raiders',
      'Carry the letter of introduction to the army’s post in the Avrel clearing',
      'Make the road sound as far as the Caloss crossing',
      'Cross the river into Luscia and find Lumber Town',
      'Report to Iven at the relay post on the town square',
    ],
    done: state => !!state.luscia?.briefed,
  }),
  chapter({
    // Everything the traveler does once they have reported: the errand that shows them
    // what the war is, the muster, the parley that asks them to choose, and the battle.
    number: 2, id: 'joining-the-war', title: 'Joining the War', region: null,
    // It ends where the side you chose keeps its own ground: the army's outpost on
    // the Moros, or the walls of Solis.
    goal: state => `You have reported for duty. Take the army’s work, ride to the muster on the Moros, carry the Marshal’s terms to the Coalition at Solis, choose the side you will fight for, and see the battle through${
      state.side === 'coalition' ? ' — until you stand in the army’s outpost on the Moros, taken for the Republic.'
      : state.side === 'empire' ? ' — until you stand inside Solis, taken for the Empire.'
      : '. Whichever side you take, it ends in the place your side takes: Solis for the Empire, the army’s outpost on the Moros for the Republic.'}`,
    steps: [
      'Find the lost courier at the field at the Lauvel',
      'Carry the muster rolls back to Iven and draw the army’s horse',
      'Report to Marshal Venmor at the outpost on the Moros',
      'Carry the terms into Solis and hear the Republic’s offer',
      'Choose your side, march to the border, and fight the battle',
      'The morning after: rally, clear the ground, and take your pay',
      'Stand in the place you took: your side\u2019s ground now',
    ],
    done: state => !!state.aftermath?.complete && !!state.home,
  }),
  chapter({
    // Which war you joined decides where you go: the Empire's one city that holds a
    // chokepoint, or a republic that keeps no capital at all and meets where it meets.
    number: 3, id: 'the-side-you-chose', region: null,
    title: state => state.side === 'coalition' ? 'The Republic of Izol' : 'The Kingdom of Ambron',
    goal: state => state.side === 'coalition'
      ? 'Take your pay the day after the battle, then sail east to Izolveth in West Izol, the port that shelters the Coalition’s army. The Republic keeps no capital: its business is done at a council, and the council wants to see the sellsword who fought at the border.'
      : 'Take your pay the day after the battle, then ride north-west across the Moros into Elagos, to Ambron on the Lake Ela narrows: the walled city whose tolls are the Empire, where the Lord Marshal decides what you are used for next.',
    steps: [
      'Leave your side’s ground with its orders in your hand',
      'Cross to the seat of the power you fight for',
      'Ambron on the Lake Ela narrows, or the council at Izolveth in West Izol',
    ],
    // The ground beyond the day after is not built yet, so this chapter stays open.
    done: () => false,
  }),
]);

export const chapterCount = STORY_CHAPTERS.length;
export const storyChapter = id => STORY_CHAPTERS.find(entry => entry.id === id) ?? null;

/**
 * Where the traveler stands in the story: every chapter before the first
 * unfinished one is done, and that unfinished one is the chapter they are on.
 */
export function chapterProgress(state = {}) {
  const done = [];
  for (const entry of STORY_CHAPTERS) {
    if (!entry.done(state)) {
      return {
        current: entry, done, complete: false, number: entry.number, of: chapterCount,
        list: STORY_CHAPTERS.map(item => ({ ...item, state: done.includes(item) ? 'done' : item === entry ? 'current' : 'later' })),
      };
    }
    done.push(entry);
  }
  const last = STORY_CHAPTERS.at(-1);
  return { current: null, done, complete: true, number: chapterCount, of: chapterCount,
    list: STORY_CHAPTERS.map(item => ({ ...item, state: item === last ? 'done' : 'done' })) };
}

/** A chapter's title and goal may depend on the side the traveler took. */
export const chapterTitle = (entry, state = {}) => typeof entry?.title === 'function' ? entry.title(state) : entry?.title ?? '';
export const chapterGoal = (entry, state = {}) => typeof entry?.goal === 'function' ? entry.goal(state) : entry?.goal ?? '';

/** "Chapter 1 · The Road to Luscia", for the heading over the quest. */
export const chapterLabel = (entry, state = {}) => entry ? `Chapter ${entry.number} · ${chapterTitle(entry, state)}` : 'The war moves on';

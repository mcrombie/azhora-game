/**
 * The main quest as the player reads it: numbered chapters with a goal apiece.
 *
 * The campaign (`src/campaign.js`) tracks the war; these are the chapters of the
 * traveler's own story, and each one closes on a plain moment the player will
 * remember — reporting for duty, carrying the rolls back, riding out to the
 * muster. A chapter is done when its `done(state)` says so, and the state is the
 * same views the journal already has. Pure: no DOM, no three.
 */
import { LONG_ROAD_LEGS } from './long-road.js';
import { questLive } from './quest-slate.js';

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

const chapter = entry => Object.freeze({ ...entry, steps: Object.freeze(entry.steps),
  longWay: entry.longWay ? Object.freeze({ ...entry.longWay, legs: Object.freeze(entry.longWay.legs) }) : null });

/**
 * The second block on Chapter 1's page: the road the chapter does not require. It is a field
 * and not steps, because the chapter is finished by reporting for duty and by nothing else —
 * `done` never reads this, and walking the whole of Drent does not close a step of the five
 * above it, nor does skipping it leave one open (docs/drent-long-road.md §2).
 */
const LONG_WAY = Object.freeze({
  title: 'The long way round',
  detail: 'The company is eleven and the Marshal marches when the eleventh has reported, so the road west will keep. Walk Drent instead and it will teach you the country you are about to fight over: a chart and a bird first, then a rod, a fire, an axe, a hedge and a stone. Chris walks it with you.',
  legs: LONG_ROAD_LEGS.map(leg => `${leg.title} — ${leg.note}`),
});

export const STORY_CHAPTERS = Object.freeze([
  chapter({
    number: 1, id: 'road-to-luscia', title: 'The Road to Luscia', region: 'Drent',
    goal: 'Report for duty. The Empire is gathering its hired swords at Nothom, across the Caloss in Luscia; get there and find the clerk who keeps the muster.',
    // **Three subquests and nothing else** (the user, 22 September 2026). The five steps this
    // replaced were the goblins in the Greenway, the report to Corvan, the supply parcels, the
    // Caloss crossing and Iven; the middle three are off the slate (src/quest-slate.js) and the
    // bridge among them is a side quest now. The steps here are `questSteps` under another name,
    // which is the point: the journal and the card say the same three things.
    steps: [
      'Report to Harbourmaster Jojo at the head of the pier',
      'Train with Officer Glun at the straw post: sword, shield and feet',
      'Report to Iven at the army’s relay post in Nothom, over the Caloss in Luscia',
    ],
    longWay: questLive('teachers') ? LONG_WAY : null,
    // Reporting to Iven is `deliver-report`, and `refreshQuest` opens the Luscia
    // chapter in the same beat, so `luscia.started` *is* the report. `briefed` is
    // one step further on — accepting the errand out to the Lauvel — and reading
    // the chapter off that left the journal saying Chapter 1 to a traveler who had
    // already done every line of it.
    done: state => !!state.luscia?.started,
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

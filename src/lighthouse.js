/**
 * The Suval Light, and Addison, who keeps it.
 *
 * Where the Solis road runs south past the turning for the winery, the downs run out and
 * stop: twelve metres of grass over the water, the ground falling away south and south-west
 * into the open sea, and on the last of it stands a stone tower: a round, tapering thing built out of the same
 * grey rock it stands on, a keeper's cottage against its foot, a walled yard to take
 * the wind off the door, an oil store, and a fog bell on a frame that can be heard in
 * the village when the weather is wrong.
 *
 * Addison keeps it. She was fourteen years at sea and does not make anything of that,
 * and she came ashore for a reason she will give you three different versions of. She
 * is dirty blonde, wind-dried, ink on both forearms from four ports, and she keeps the
 * light the way somebody keeps a watch: by the glass, every night, whatever the weather
 * is doing and whatever she thinks of it. She talks like a sailor, which is to say in
 * short sentences about weather, gear and other people's seamanship, and she will tell
 * you the truth about the sea without ever once making it sound romantic.
 *
 * She will take anybody who asks up the stair to the gallery, because a light is a
 * public thing and because she likes the look on people's faces. From up there the
 * whole coast is under you, which is worth something on a chart.
 *
 * Pure: no DOM, no three. The tower is src/lighthouse-world.js.
 */
import { ADDISON_AFTER, HEIST_ENDINGS, HEIST_ENDING_IDS } from './rival-light.js';

const freeze = Object.freeze;

/**
 * The head: twelve metres of grass over the water on the West Suval coast, where the Solis
 * road runs south past the turning for Vaervelm Caelazh. The winery lane's western end is a
 * hundred and eighty strides north of it, so anybody going up to Livia's passes the light.
 * The ground falls away south and south-west off the tower into open water; the road side is
 * the landward side, which is why the yard opens north and the bell hangs over the drop.
 */
export const LIGHT_HEAD = freeze({ x: -630, z: 894, bare: 15 });
const head = LIGHT_HEAD;
const at = (dx, dz) => freeze({ x: head.x + dx, z: head.z + dz });

export const SUVAL_LIGHT = freeze({
  id: 'suval-light', name: 'The Suval Light', region: 'West Suval',
  head: freeze({ ...head }),
  /** The tower: round, tapering, a corbelled gallery and a glazed lantern over it. */
  tower: freeze({ ...at(0, 0), base: 3.1, top: 2.3, height: 11.4, gallery: 1.1, lantern: 2.6 }),
  /** The keeper's cottage, low and long, its back to the weather. */
  cottage: freeze({ ...at(-5.6, -3.4), width: 8.2, depth: 5.4, eaves: 2.5, ridge: 4.1, yaw: 0.18 }),
  /** The yard wall: a horseshoe of drystone open to the landward side, to take the wind off the door. */
  yard: freeze({ ...at(-2.4, -1.8), radius: 8.6, height: 1.35, openFrom: 2.55, openTo: 3.95 }),
  /** The oil store, dug into the bank so a spark in the yard cannot reach it. */
  store: freeze({ ...at(-8.8, 1.6), width: 3.4, depth: 2.8, height: 2.1 }),
  /** The fog bell, on a frame at the seaward edge, on a rope she can reach from the door. */
  bell: freeze({ ...at(3.4, 3.6), height: 2.6 }),
  /** The flagstaff, for the signals the village can read from the beach. */
  staff: freeze({ ...at(-1.2, 4.4), height: 6.2 }),
  /** Where the track comes onto the head off the Solis road, from the north. */
  gate: freeze({ ...at(-9.5, -6.2) }),
});
export const lightPoint = at;
/**
 * Inside the yard, between the cottage and the gap in the wall, facing the lane: she hears
 * anybody coming up onto the head a long time before they arrive and is looking at them by
 * the time they do. Clear of the tower, the cottage and the wall, all of which are solid.
 */
export const ADDISON_STAND = freeze({ ...at(-2.0, -6.4), yaw: -1.54 });

// Never the traveler's own model: dirty blonde, slightly wavy, to the shoulder and tied back off
// her face; a knitted jersey, oilskin trousers, sea boots, a knife on a lanyard, ink on both arms.
export const ADDISON = freeze({
  id: 'light-keeper', name: 'Addison', role: 'Keeper of the Suval Light',
  modelRole: 'light-keeper', color: 0x3f5a6b, skin: 0xd9ae83,
});

export const LIGHT_VERSION = 1;

export function validateLightSnapshot(data, { allowMissing = true } = {}) {
  if (data === undefined) return allowMissing;
  if (!data || typeof data !== 'object' || Array.isArray(data) || data.version !== LIGHT_VERSION) return false;
  return typeof data.met === 'boolean' && typeof data.climbed === 'boolean';
}

export function createLightKeeper({ onEvent = () => {} } = {}) {
  const state = { met: false, climbed: false };
  function meet() { const first = !state.met; state.met = true; return { first }; }
  /**
   * Up the stair to the gallery. `chart` is the traveler's map fog: from eight metres of
   * headland and eleven of tower you can see most of this coast, and seeing it is charting it.
   */
  function climb(chart = null) {
    const first = !state.climbed;
    state.climbed = true;
    const seen = [];
    for (const point of SIGHTLINES) {
      const result = chart?.reveal?.(point.x, point.z);
      if (result?.subregions?.length) seen.push(...result.subregions);
    }
    onEvent({ type: 'gallery-climbed', first });
    return { ok: true, first, charted: seen };
  }
  const snapshot = () => ({ version: LIGHT_VERSION, met: state.met, climbed: state.climbed });
  function restore(data) {
    state.met = false; state.climbed = false;
    if (!validateLightSnapshot(data, { allowMissing: false })) return false;
    state.met = data.met; state.climbed = data.climbed;
    return true;
  }
  return { meet, climb, snapshot, restore,
    get met() { return state.met; }, get climbed() { return state.climbed; } };
}

/** What is under you from the gallery: the coast either side, and the water off it. */
export const SIGHTLINES = freeze([
  at(0, 0), at(0, -34), at(0, 34), at(-40, 0), at(40, 0),
  at(30, -30), at(30, 30), at(-30, -30), at(-30, 30), at(62, 6), at(-62, 6),
]);

/** How the light is kept. It is a job, and she describes it as one. */
export const LIGHT_WORK = freeze([
  'Lit at sunset, out at sunrise, every night, and that is the whole of the contract. Miss one and a man who has been steering on you for nine hours has nothing to steer on.',
  'Eleven wicks in a ring, and a silvered dish behind them the size of a cartwheel. The dish is the light, not the flame — the flame is a candle with ideas. Polish the dish badly and you have built an expensive chimney.',
  'Trim every wick before dark and once in the middle watch, or they carbon up and smoke the glass, and then I am out on that gallery at three in the morning washing glass in the wind, which I have done, and which was my own fault.',
  'Eighty gallons of oil a winter, up that stair in nine-gallon cans, and I count the stair on the way up and never on the way down. Two hundred and six.',
  'And the bell for fog. Six pulls, wait, six pulls. Anybody who has been out in it will tell you a bell you cannot see through is worth more than a light you cannot see.',
]);

/** The wreck book: every ship lost off this head since the light was built, and before it. */
export const WRECK_BOOK = freeze([
  'The Marrow Girl, out of Cobble, twenty-two years back, before there was a light here at all. Came in at night in weather, put her bows into the ledge off the point, and went down in the length of time it takes to tell it. Eleven aboard, two ashore. That is the wreck the light is built out of: the village paid for the tower the next spring, and they did it by subscription, and there is a list of the names in the cottage.',
  'The Anseline, a coaster, nine years back. Lost her rudder in a northeaster and came down the coast sideways in the dark with every man aboard screaming and nothing anybody could do about it. She struck the sand instead of the ledge and every one of them walked ashore wet. That is luck, and it is the only thing in this book that is.',
  'A Suvali trader, no name any of us ever got, six winters back. Came in flying nothing and answering nothing and went past in the dark under full sail, close enough that I heard the rigging, and was never heard of after. I have thought about that one more than the rest of them together.',
  'And a fishing boat out of this village, four years ago, in clear weather, because a man went forward without holding on. No ledge, no rock, no fog. The sea does not need a reason and mostly does not have one.',
]);

/** Reading the weather, which she does without noticing she is doing it. */
export const WEATHER_LORE = freeze([
  'Sky is making up in the southwest and the swell came round an hour before the wind did, which it always does. It will be dirty by dark and it will blow through tomorrow and be gone.',
  'Glass has been falling since noon, slow. Slow falling, long blow. If it drops away quick you get something hard and short and then a clear sky by morning, and that is the one that kills people, because it looks like nothing while it is coming.',
  'Gulls sitting on the water in the middle of the day means it is too rough out there for them to work, and if it is too rough for a gull you have no business asking a boat.',
  'And when the sea goes oily and the air goes warm and you can hear the village from here — that. Get in. I mean it. That is the fog that comes in over you at walking pace and closes like a hand.',
]);

/** Fourteen years at sea, and three different reasons for coming ashore. */
export const HER_OWN = freeze([
  'Fourteen years. Started at twelve on a coaster out of this bay doing what a twelve-year-old does, which is everything anybody else does not want to. Finished as mate of a salt trader, which sounds better than it was.',
  'The ink is ports. That one is Izolveth, that one is Cobble, that is the one they do in Elagos with the needle bound to a stick, and that one is a mistake with a woman’s name on it and we are not discussing it.',
  'Why I came ashore: the money is better. That is what I tell the village. The other thing I tell people is that I got tired, which is also true. And the real one is that I was mate on a night we came in on a coast with no light on it and I have been standing on the other end of that ever since.',
  'Do I miss it? Every day about four in the afternoon, and never once at three in the morning.',
]);

/** What she sees from up there. Sailors see a great deal and make very little of it. */
export const FROM_THE_GALLERY = freeze([
  'Right. Mind the stair, it turns tight and the sixth one is worn hollow. Two hundred and six.',
  'There. The whole bay under you, the village and its pier away east, the beach, the Tessen coming down out of the wood, and off the point the ledge — that dark under the water that does not move when the rest of it does. That is what the light is for.',
  'South is open water all the way to Suval if you are a gull. On a clear evening you can see the smoke over Cobble, and once a year, when the air does something particular, the Suval hills come up out of the sea like a held breath and sit there for an hour and go again.',
  'And everything on the water from here is somebody’s whole day. That boat is Merrow’s and he is out too far. That one is the ferry. The white one with the bow like a shovel is the salt ship, and if you know John, he owes this light eleven bottles and a hat.',
]);

/** If the traveler is on the blue trade's trail, she has seen things over the water and made nothing of them. */
export const SEEN_FROM_THE_LIGHT = freeze([
  'Something flies over this water at night. Big. Comes off the land about an hour after I light up, goes out over the ledge, works the water like a tern does — down, up, down — and goes home before it is light with its belly full of fish.',
  'I have watched it through the glass for a year and a half. It is not a bird. I know every bird on this coast and none of them have hands.',
  'No, I have not told anybody, and I would rather you did not either. It has never come near the tower and it has never bothered a boat. A thing that hunts fish and minds its own business has more right to this coast than most of what comes up that lane.',
  'If you know what it is: do not bring it here to be looked at. And if it is ever in trouble, it is welcome on this rock. You can tell it that from me.',
]);

/**
 * Addison's conversation. `act('climb-light')` takes the traveler up in the host, which is
 * where the chart gets widened; the `sister-*` and `glass-*` acts run the business with the
 * Elod Light (src/rival-light.js). `visits` rotates the weather, because it changes.
 */
export function addisonConversation(npc, context) {
  const { light, openDialogue, closeDialogue, act, hunt = null, visits = 0 } = context;
  if (npc?.id !== ADDISON.id) return false;
  const again = () => addisonConversation(npc, { ...context, visits: visits + 1 });
  const tell = (lines, back = 'Back to the yard') => openDialogue(npc, [...lines], null, back, { onComplete: again });
  const leave = { id: 'leave-addison', label: 'I will let you get on.', action: closeDialogue };
  // Her sister, the other light, and what she wants done about it (src/rival-light.js).
  const heist = context.heist ?? null;
  const sister = heist ? {
    unknown: { id: 'light-sister', label: 'Is there another light on this coast?', act: 'sister-tell' },
    told: { id: 'light-sister-ask', label: 'What do you want done about her?', act: 'sister-ask' },
    asked: { id: 'light-sail', label: 'Take me across tonight.', act: 'sister-sail' },
    home: { id: 'light-decide', label: 'What happens to the glass?', act: null },
  }[heist.stage] ?? null : null;
  const choices = [
    ...(sister && sister.act ? [{ id: sister.id, label: sister.label,
      action: () => { closeDialogue(); act(sister.act); } }] : []),
    ...(sister && !sister.act ? [{ id: sister.id, label: sister.label,
      action: () => openDialogue(npc, [...ADDISON_AFTER], null, 'Decide', { choices: [
        ...HEIST_ENDING_IDS.map(id => ({ id: `glass-${id}`, label: HEIST_ENDINGS[id].name,
          action: () => { closeDialogue(); act(`glass-${id}`); } })),
        { id: 'glass-wait', label: 'Not yet.', action: closeDialogue },
      ] }) }] : []),
    { id: 'light-climb', label: light.climbed ? 'Can I go up again?' : 'Can I see the light?',
      action: () => { closeDialogue(); act('climb-light'); } },
    { id: 'light-work', label: 'What does keeping it actually take?', action: () => tell(LIGHT_WORK) },
    { id: 'light-wrecks', label: 'Has anything been lost out there?', action: () => tell(WRECK_BOOK) },
    { id: 'light-weather', label: 'What is the weather going to do?', action: () => tell([WEATHER_LORE[visits % WEATHER_LORE.length]]) },
    { id: 'light-her', label: 'Were you at sea?', action: () => tell(HER_OWN) },
    // She has been watching him hunt over the water for a year and a half and told nobody.
    ...(hunt && hunt.stage !== 'unknown' ? [{ id: 'light-seen', label: 'Have you seen anything strange over the water?',
      action: () => tell(SEEN_FROM_THE_LIGHT) }] : []),
    leave,
  ];

  if (!light.met) {
    light.meet();
    openDialogue(npc, [
      'She has a coil of line over one shoulder and does not put it down.',
      '"You came all the way out here, so you are either lost or you are the sort that walks to the end of things. Either way: Addison. I keep this light."',
      '"Gate is never shut and the yard is never quiet. Do not go in the oil store with anything burning and do not touch the bell unless there is fog, because if that bell goes the whole village comes up that lane at a run and they are already annoyed with me about the last time."',
    ], null, 'Back to the yard', { choices });
    return true;
  }
  openDialogue(npc, [light.climbed
    ? '"Back up the hill. There is tea in the cottage and it is terrible."'
    : '"You again. Wind has gone round a point since you were last here, in case you were wondering, which you were not."'],
  null, 'Back to the yard', { choices });
  return true;
}

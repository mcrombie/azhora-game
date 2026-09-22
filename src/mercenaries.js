/**
 * The mercenary company: eleven hired swords, the traveler among them, called from abroad
 * by the Ambroni Empire and mustering at the army's camp on the Moros Plain.
 *
 * They do not come in a line. Chris Gotwood steps off the same boat as the traveler and
 * carries the letter that starts the whole thing. Ed the Word swims ashore out of a pirate
 * ship that never docks. Jerry, Kristen and Ciaran ride in together and argue about whether
 * to stay together. Lakota comes alone, then Eliana alone after him, then Matt and Al the Tun
 * together at the end of it. And somewhere in that sequence — anywhere from half a minute
 * before the traveler lands to half a minute after the last of them — Mus beaches a small
 * boat on a shingle strand round the headland, and walks to the muster through the woods
 * because he does not care for roads.
 *
 * Everything but Mus's arrival is a pure function of play time, so nothing but the clock and
 * one seed needs saving. They walk the same road as the traveler and pause where the traveler
 * had business, so a brisk traveler stays first and a slow one is overtaken.
 */
import { WILD, MUS_ROUTE, wildJourney } from './wild-route.js';

export const MERCENARY_COMPANY_SIZE = 11;

/**
 * When each group comes ashore, in seconds of play after the traveler lands. Three of the six
 * are groups: people who travelled together and arrive still talking to each other.
 */
export const ARRIVALS = Object.freeze({ gotwood: 0, word: 360, riders: 1080, lakota: 1980, eliana: 2880, princes: 3780 });

/**
 * Mus lands on his own beach at a time nobody can predict, drawn once per game and kept in
 * the save. The range runs from a half-minute head start on the traveler to a half-minute
 * after the last pair, and every moment in it is equally likely.
 */
export const MUS_ARRIVAL = Object.freeze({ from: -30, to: ARRIVALS.princes + 30 });
export const drawMusArrival = seed => {
  // A mixing hash, not the sine trick and not a plain step: sin(0) is zero, which would land
  // him at the first moment of the range whenever a game began without a seed, and one
  // multiply leaves consecutive seeds an hour apart landing him within seconds of each other.
  // This one avalanches, so seeds 1 and 2 are as unrelated as any other pair.
  // The offset matters: zero survives every step of the mix unchanged, and a game begun
  // without a seed is exactly the case that must not be predictable.
  let h = ((Number.isFinite(seed) ? Math.trunc(seed) : 0) + 0x9e3779b9) | 0;
  h ^= h >>> 16; h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13; h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return MUS_ARRIVAL.from + ((h >>> 0) / 4294967296) * (MUS_ARRIVAL.to - MUS_ARRIVAL.from);
};

const merc = (id, name, origin, arrival, departs, pace, look, lines, extra = {}) =>
  Object.freeze({ id: `merc-${id}`, name, origin, arrival, departs, pace, route: 'road', group: null,
    look: Object.freeze(look), lines: Object.freeze(lines), ...extra, ...MERCENARY_STYLES[id] });

/** Each man fights his own way; his weapon is modelled, and he will explain it. `trades` says whether he swaps his weapon for the traveler's sword. */
export const MERCENARY_STYLES = Object.freeze({
  cromb: Object.freeze({ weapon: 'sword', style: 'One sword, and nothing else', trades: true, styleLines: Object.freeze(['One sword. I keep an edge on it and I keep it out of bone where I can. A man who tells you there is more to it than that is selling you something.', 'Swing all the way through or do not swing. Half a cut is how you get a whole one back.']), tradeLine: 'Your weapon for my sword. I will hold anything with a handle, and I will hand it back the moment it disappoints me.' }),
  gotwood: Object.freeze({ weapon: 'sword', style: 'The sword, same as yours', trades: true, styleLines: Object.freeze(['We carry the same blade, so I can actually be useful to you here. Three cuts in a row, each heavier than the last, and the third lands hardest. Keep something back for a step aside when the amber shows.', 'Mend it before the edge goes rather than after. I know that sounds obvious. I have watched four men die of not doing it.']), tradeLine: 'A trade? If it is not another sword like mine, I will try it. Yours for mine, and no hard feelings either way.' }),
  word: Object.freeze({ weapon: 'dagger', style: 'The dagger, and whatever else is to hand', trades: true, styleLines: Object.freeze(['A dagger! Everyone is very disappointed when they see it. Then I am inside the swing where their long beautiful weapon does nothing at all, and we have a completely different conversation.', 'The trick is never to be where the fight is. People think that is cowardice. People are usually dead.']), tradeLine: 'Your sword for my dagger? You are getting the worse end of that and I am delighted. Yes. Absolutely yes. Before you think about it.' }),
  jerry: Object.freeze({ weapon: 'bow', style: 'The bow', trades: false, styleLines: Object.freeze(['I put an arrow in it at thirty paces and then I do not have to think about it any more. That is the entire appeal.', 'In woodland I am a man holding a stick. Do not let anyone tell you an archer is worth anything in a wood.']), tradeLine: 'Trade the bow for a sword. So that I can be close to the fighting. No.' }),
  christin: Object.freeze({ weapon: 'sword-shield', style: 'Sword and shield', trades: true, styleLines: Object.freeze(['I take the first blow on the boards and answer over the rim. It is slower than what you do and much harder to kill, and it means I can stand in front of somebody who needs it.', 'Against a shield, feint high and cut low. I am telling you how to beat me because you are more use to me knowing it.']), tradeLine: 'I would try another edge, if it is not a sword like mine. Swap, and mind the rim, it catches.' }),
  ciaran: Object.freeze({ weapon: 'spear', style: 'The spear', trades: false, styleLines: Object.freeze(['Two paces of ash between me and the thing trying to kill me. Thrust, recover, thrust. I have never once wanted to be nearer.', 'If a spearman gets his point on you, go left or right. Never back. Back is exactly where he is sending you.']), tradeLine: 'The spear stays. It is the only reason any of this has worked so far.' }),
  lakota: Object.freeze({ weapon: 'staff', style: 'The quarterstaff', trades: false, styleLines: Object.freeze(['A staff. Go on, laugh, everyone does. It has two ends, it strikes twice as often as your sword, and no watchman has ever once asked me to leave it at a gate.', 'It will not cut, so I go for hands and knees. A man who cannot hold his weapon has lost, and he gets to walk home about it.']), tradeLine: 'My staff? No. It is the only thing I own that has never let me down, and I include people in that.' }),
  eliana: Object.freeze({ weapon: 'greatsword', style: 'The greatsword', trades: true, styleLines: Object.freeze(['Two hands, one edge, and everything within a cart\u2019s width of me. It is slow to start and it cannot be stopped once it is going, which is a thing to know about it and also about me.', 'Get inside the arc or stay well outside it. The middle is where people die and they always choose the middle.']), tradeLine: 'The great blade for your little one? My back has wanted this conversation for a month. Swap.' }),
  matt: Object.freeze({ weapon: 'pike', style: 'The long spear', trades: false, styleLines: Object.freeze(['The phalanx is four hundred years old and has never once been improved upon. Nothing reaches me before I reach it. In a doorway I am furniture, but we are not going to fight in a doorway.', 'If you ever face a wall of these, go round it. The front of it is a hedge of points and the men behind are not tired yet.']), tradeLine: 'Trade a pike for a sword? Then who holds the line, and with what? No. Thank you, but no.' }),
  altun: Object.freeze({ weapon: 'mace', style: 'The mace, when it comes to that', trades: true, styleLines: Object.freeze(['The mace is for when the other thing has not worked. It does not cut, it breaks, and there is no second blow in me, so I would rather it never came to the mace at all.', 'When a man winds up with one of these, do not block it. Be elsewhere. It comes down slower than a sword and it does not stop.']), tradeLine: 'My mace for your sword? I miss having an edge. I miss a great many things. Yes, swap.' }),
  mus: Object.freeze({ weapon: 'spears', style: 'Two spears, one of them thrown', trades: false, styleLines: Object.freeze(['A medium one for standing and a short one that leaves my hand. The first thing most people learn about a fight with me is that there is a spear in their leg.', 'Count a man\u2019s spears before you close. He will not come near you until the short one has gone.']), tradeLine: 'I need both. You would not know what to do with either, and I mean that kindly.' }),
});
/**
 * Arrival and departure are seconds of play after the traveler's landing; pace is metres per
 * second on the road. `group` names the people somebody arrived with and is the reason they
 * are still arguing when you reach them; `route` is how they get to the muster.
 */
export const MERCENARY_ROSTER = Object.freeze([
  merc('gotwood', 'Chris Gotwood', 'Feradom', ARRIVALS.gotwood, 420, 1.28,
    { tunic: 0x6b6f5a, hair: 0xd8c893, skin: 0xe2bd93, build: 'ordinary', headgear: 'bare', hairStyle: 'fine', facialHair: 'full', garment: 'jerkin', marks: ['spectacles'] },
    ['Chris Gotwood. Same boat, same coin, and I have the letter they gave us both \u2014 you take it, you are the one they wrote it about. The army\u2019s post is up the road in the Avrel clearing.',
      'I will give the village a look and come after you. No sense the two of us crowding one quartermaster.'],
    { group: null, carriesLetter: true }),
  // He stands on that strand for twenty-five minutes before the road gets him, because he has
  // just swum sixty-eight metres of open water and because he is Ed (src/word-arrival.js).
  merc('word', 'Ed the Word', 'no port he will name', ARRIVALS.word, 1500, 1.34,
    { tunic: 0x7a5a4a, hair: 0xc9a84e, skin: 0xe2bd93, build: 'rangy', headgear: 'bandana', hairStyle: 'braid', facialHair: 'clean', garment: 'sash', marks: ['earring'] },
    ['Ed. Ed the Word. You saw the ship, everyone saw the ship, and the ship has gone, which I think we can all agree is the happiest possible outcome for the ship.',
      'I came ashore under my own power because I felt like it. A man wants a swim. A man wants an adventure. A man is absolutely not here for any other reason.'],
    { route: 'shore', swims: true,
      says: { walking: 'Walking! To a war! Voluntarily! Do you know, I have done stranger things this month.',
        stopped: 'No no, you go on. I am having a look at something and it is absolutely not worth explaining.',
        mustered: 'And here we all are, counted and written down in a book. I have spent a great deal of my life avoiding books.' } }),
  merc('jerry', 'Jerry', 'the Izoli ports', ARRIVALS.riders, 90, 1.3,
    { tunic: 0x4a5560, hair: 0x1f1a16, skin: 0xd7ad7e, build: 'slight', headgear: 'bare', hairStyle: 'curls', facialHair: 'clean', garment: 'archer', marks: ['spectacles'] },
    ['Jerry. I came up with those two and I have heard every thought either of them has had since the crossing.',
      'Eleven of us for one border. Either it is a small border or somebody has done the arithmetic and not told us. I know which I would bet on.'],
    { group: 'riders' }),
  // Her id stays `christin` and `merc-christin`. The name on screen is Kristen; the id is a
  // save field and a key in MERCENARY_STYLES, and renaming it would strand every save that
  // holds a weapon traded with her (the `eastreena` precedent).
  merc('christin', 'Kristen', 'the Selemi coast', ARRIVALS.riders, 90, 1.26,
    { tunic: 0x6d7f6a, hair: 0x1f1a16, skin: 0x9d7350, build: 'broad', headgear: 'bare', hairStyle: 'ponytail', facialHair: 'clean', garment: 'gambeson', marks: [] },
    ['Kristen! You are the one who landed first, then. Good \u2014 you know the road and we do not, so that is settled, we go together.',
      'Jerry will tell you we should split up. Jerry tells everybody that. Jerry has never once been right about it.'],
    { group: 'riders' }),
  merc('ciaran', 'Ciar\u00e1n', 'Feradom', ARRIVALS.riders, 90, 1.32,
    { tunic: 0x5a6b7c, hair: 0x16120f, skin: 0x6b4a33, build: 'square', headgear: 'bare', hairStyle: 'cropped', facialHair: 'clean', garment: 'scarf', marks: ['spectacles'] },
    ['Ciar\u00e1n. The accent is on the second half, and no, I do not mind, everybody does it.',
      'I will go with whoever is going. Together is warmer and alone is quicker, and I have not yet met the argument that settles it.'],
    { group: 'riders' }),
  merc('lakota', 'Lakota', 'the Marosh fens', ARRIVALS.lakota, 60, 1.24,
    { tunic: 0xe4d8bd, hair: 0x4a3524, skin: 0xd7ad7e, build: 'wiry', headgear: 'soft-cap', hairStyle: 'lank', facialHair: 'stubble', garment: 'bedroll', marks: [] },
    ['Lakota. Yes, I am late. There was a bird on the mast for two days and I was not going to be the man who did not look at it.',
      'I am told there is a muster and a plain and a war. All of that is still going to be there. Have you ever actually looked at a hawk?'],
    // He is drawn as himself rather than in the company's kit, so the red-tail has a glove to sit on (src/birding.js).
    { teaches: true, modelRole: 'bird-watcher' }),
  merc('eliana', 'Eliana', 'the Pyrosi hills', ARRIVALS.eliana, 75, 1.36,
    { tunic: 0x5c4a5e, hair: 0x14110f, skin: 0xd7ad7e, build: 'tall-lean', headgear: 'bare', hairStyle: 'long-loose', facialHair: 'clean', garment: 'sleeveless', marks: ['spectacles'] },
    ['Eliana. I came on my own and I would have come sooner, but the boat I wanted was not the boat that was leaving.',
      'You have walked some of this already, I can tell. Tell me what is on the road and I will tell you whether I believe you.']),
  merc('matt', 'Matt, Prince of Zorkys', 'Zorkys', ARRIVALS.princes, 120, 1.22,
    { tunic: 0x7a3b3b, hair: 0x6b4b2b, skin: 0xe2bd93, build: 'heavy', headgear: 'bare', hairStyle: 'curls', facialHair: 'clean', garment: 'single-pauldron', marks: ['spectacles'] },
    ['Matt. Of Zorkys, and yes, prince, and no, it does not mean what you are imagining \u2014 it means a hall, a valley, and four hundred people who expect me back.',
      'I came because the histories are full of men who were sent and rather thin on men who went. Al and I have argued about that the whole crossing and he is still wrong.'],
    { group: 'princes' }),
  merc('altun', 'Al the Tun', 'the southern islands', ARRIVALS.princes, 120, 1.2,
    { tunic: 0x3f4a5c, hair: 0x16130f, skin: 0xe8c8a0, build: 'short-stocky', headgear: 'bare', hairStyle: 'lank', facialHair: 'clean', garment: 'robe', marks: [] },
    ['Al the Tun. I travelled with him and I have not agreed with him once, which he mistakes for losing.',
      'You are looking at the robe. Everyone looks at the robe. I will tell you what it is for when there is a reason to, and not before.'],
    { group: 'princes' }),
  merc('mus', 'Mus', 'nowhere he has said', 0, 45, 1.42,
    { tunic: 0x4a453c, hair: 0x16120f, skin: 0x8f6a4a, build: 'raw-boned', headgear: 'hood', hairStyle: 'cropped', facialHair: 'trimmed', garment: 'short-cloak', marks: [] },
    ['Mus.',
      'I do not use the road. It goes where everybody knows it goes. I will see you at the plain.'],
    { route: 'wild', drawn: true,
      says: { walking: 'Road today. It is quicker with company.', stopped: 'Go on.', mustered: 'I have been here a while.' },
      // What he says when you come on him in the country, which is the only place you can. His
      // `walking` line above is now said by nobody: a wild man's whole route is `walking`, and
      // that line is about a road he has just told you he does not use.
      saysWild: { first: 'You left the road. Most people never do.',
        after: 'I will be at the muster. Do not wait for me there, and do not look for me here.' } }),
]);

/**
 * Cromb the Barbarian: the man the game has always put you inside, named and written down at last
 * so that he can stand on the road as one of the ten when you choose to be somebody else. He is
 * deliberately not in MERCENARY_ROSTER — the world only ever places the ten you did not choose,
 * and `companyFor` in src/player-characters.js is what puts him into the slot you vacated. His
 * colours are the traveler's own, so a game played as Cromb looks exactly as it always has.
 * He is a blank slate on purpose (docs/design-answers.md): no written past, because the
 * player's choices are his character. The lines below are the little he will say of himself.
 */
export const CROMB = merc('cromb', 'Cromb the Barbarian', 'the cold country north of the Lotharn', 0, 420, 1.3,
  { tunic: 0x806042, hair: 0x806044, skin: 0xd7ad7e, build: 'broad', headgear: 'bare', hairStyle: 'lank', facialHair: 'stubble', garment: 'short-cloak', marks: [] },
  ['Cromb. From the cold country north of the Lotharn, where they pay a man in salt and there is never enough of it. I came for the coin and I brought a sword, and that is the whole of what I brought.',
    'I have no letters, no trade and no opinion about this war. Point me at the border. I will be standing on it before most of them have finished arguing about it.']);

/** Everyone who came ashore with somebody else, and is still talking to them about it. */
export const MERCENARY_GROUPS = Object.freeze({
  riders: Object.freeze(['merc-jerry', 'merc-christin', 'merc-ciaran']),
  princes: Object.freeze(['merc-matt', 'merc-altun']),
});
/**
 * Any of the eleven by id. Ten of them are the roster; the eleventh is Cromb, who stands on
 * the road whenever he is not the one being played (see `companyFor`). Everything that asks
 * a hired sword what he carries or what he would say has to be able to ask him.
 */
/** What Cromb's id was for one morning, before the b. Saves written then still name him. */
export const CROMB_OLD_ID = 'merc-crom';
export const mercenaryById = id => ((id === CROMB.id || id === CROMB_OLD_ID) ? CROMB : MERCENARY_ROSTER.find(entry => entry.id === id));
const distance = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);

/** Cumulative lengths along a polyline road. */
export function roadLengths(road) {
  const lengths = [0];
  for (let i = 1; i < road.length; i++) lengths.push(lengths[i - 1] + distance(road[i - 1], road[i]));
  return lengths;
}

/** The road distance of the point of the polyline nearest to `point`. */
export function distanceAlongRoad(road, point, lengths = roadLengths(road)) {
  let best = 0, bestGap = Infinity;
  for (let i = 1; i < road.length; i++) {
    const a = road[i - 1], b = road[i], dx = b.x - a.x, dz = b.z - a.z, length = Math.hypot(dx, dz);
    if (!length) continue;
    const t = Math.max(0, Math.min(1, ((point.x - a.x) * dx + (point.z - a.z) * dz) / (length * length)));
    const gap = Math.hypot(point.x - (a.x + dx * t), point.z - (a.z + dz * t));
    if (gap < bestGap) { bestGap = gap; best = lengths[i - 1] + length * t; }
  }
  return best;
}

/** The point and forward direction at a road distance. */
export function pointAlongRoad(road, distanceOnRoad, lengths = roadLengths(road)) {
  const total = lengths[lengths.length - 1];
  const d = Math.max(0, Math.min(total, distanceOnRoad));
  for (let i = 1; i < road.length; i++) {
    if (d > lengths[i] && i < road.length - 1) continue;
    const a = road[i - 1], b = road[i], length = lengths[i] - lengths[i - 1] || 1;
    const t = Math.max(0, Math.min(1, (d - lengths[i - 1]) / length));
    const dx = (b.x - a.x) / length, dz = (b.z - a.z) / length;
    return { x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t, dx, dz, yaw: Math.atan2(dx, dz) };
  }
  const last = road[road.length - 1], prev = road[road.length - 2] ?? last;
  return { x: last.x, z: last.z, dx: 0, dz: 1, yaw: Math.atan2(last.x - prev.x, last.z - prev.z) };
}

/**
 * Where a mercenary stands at a moment of play: not yet arrived, waiting at the
 * landing, walking the road, stopped where the traveler had business, or mustered.
 *
 * `startDistance` on the mercenary is how far along the road he begins, and it is zero for
 * everybody who walks up from the landing. It is not zero for one man: the companion, released
 * back onto the clock from wherever he was standing when he left the traveler. Every stop behind
 * him is one he has already made, so he does not walk back to Corvan's desk to make it again.
 */
export function mercenaryProgress(mercenary, playSeconds, stops, musterDistance) {
  let remaining = playSeconds - mercenary.arrival;
  if (!(remaining >= 0)) return { phase: 'coming', distance: 0, stopId: null };
  remaining -= mercenary.departs;
  if (remaining < 0) return { phase: 'landing', distance: 0, stopId: null };
  let at = Math.max(0, Math.min(musterDistance, Number(mercenary.startDistance) || 0));
  for (const stop of [...stops].sort((a, b) => a.distance - b.distance)) {
    if (stop.distance >= musterDistance) break;
    if (stop.distance < at) continue;
    const travel = Math.max(0, stop.distance - at) / mercenary.pace;
    if (remaining < travel) return { phase: 'walking', distance: at + remaining * mercenary.pace, stopId: null };
    remaining -= travel; at = stop.distance;
    if (remaining < stop.dwell) return { phase: 'stopped', distance: at, stopId: stop.id };
    remaining -= stop.dwell;
  }
  const travel = Math.max(0, musterDistance - at) / mercenary.pace;
  if (remaining < travel) return { phase: 'walking', distance: at + remaining * mercenary.pace, stopId: null };
  return { phase: 'mustered', distance: musterDistance, stopId: null };
}

/**
 * How the men who have landed wait. They used to stand in a ring around the landing itself, at
 * 2.2 + index * 0.3 metres - and the landing is a pier three metres wide. Nothing wider than
 * 1.7 m fits on it, so five of the ten stood on the harbour floor, five and a half metres under
 * the water, for as long as ninety seconds at a time (docs/known-issues.md).
 *
 * So they queue instead, down the way they are about to go: the line from the landing to the
 * road's own first point, which at Tidehaven runs straight down the deck. They alternate half a
 * metre either side of that line so the traveler can walk up through them rather than round.
 *
 * The numbers were measured against the built pier, not chosen: of the shapes that put all
 * eleven on standable ground, this is the one that leaves the most room around the tightest man
 * in it - 0.8 m of clear ring, where three of them pass a bollard. `tests/mercenaries.test.js`
 * re-measures it, so if the deck's furniture moves the test says so rather than the men wading.
 */
export const LANDING_QUEUE = Object.freeze({ lead: 2.4, spacing: 1.9, offset: .45 });

/**
 * @param road the main road polyline (world.paths[0])
 * @param stops [{ id, point, dwell }] places where each mercenary pauses to do the traveler's business
 * @param muster the army camp's rendezvous point
 * @param landing where the boats put people ashore
 * @param shore where a man whose `route` is 'shore' comes out of the water instead
 * @param standable `(x, z) => boolean` from the host, so a stopped man's place can be moved off
 *   a hedge. A walking man's home moves every frame and he is past an obstacle in a second; a
 *   stopped man holds his for 60, 90 or 120 seconds, and if he cannot reach it he spends the
 *   whole dwell walking on the spot against it. Without this the formation is unchanged.
 * @param wild true to give a man whose `route` is 'wild' his own line across country
 * @param companions everyone walking with the traveler, while they are not on the clock. Each is
 *   `{ id, with: true }`, which puts that man at the traveler's shoulder and off the road
 *   altogether, or `{ id, releasedAt, releasedDistance }`, which puts him back on it from that
 *   second and that place. The user's ruling: **as many as will come** - the traveler may reach
 *   the muster with most of the company behind him, and the scarcity is that each says yes only
 *   for his own reason at his own moment (docs/companions.md).
 * @param companion the same thing for one man, which is what the long road wrote and what its
 *   tests use. It is a list of one, and the two may not both be given.
 *
 *   **Undefined or empty is today's clock, exactly** — a save written before any of this
 *   existed restores as undefined, and not a man of the company moves by a metre under it.
 * @param dead the ids of the men who are not coming (`createFallen()`, src/bystanders.js). Told
 *   the same way it is told who walks with you, and for the same reason: a companion's death is
 *   permanent, and the clock has no other way to learn of it. **A dead man has no placement at
 *   all** — he is not on the road, not in the queue at the landing, not at the muster and never
 *   ahead of the traveler. Struck off the walking list he would otherwise go straight back onto
 *   the road schedule and muster on it, and `summary().mustered` would count him among the living
 *   in the camp (docs/known-issues.md). Undefined or empty is today's clock to the digit.
 */
export function createMercenaryCompany({ road, stops = [], muster, landing, shore = null, wild = true, standable = null, seed = 0, roster = MERCENARY_ROSTER, companion = undefined, companions = undefined, dead = undefined } = {}) {
  if (!Array.isArray(road) || road.length < 2) throw new TypeError('The mercenaries need the main road.');
  // One man or many, it is one list. `companion` is the long road's own spelling of a list of
  // one and still works exactly as it did.
  const asked = (companions ?? (companion === undefined ? [] : [companion])).filter(entry => entry?.id);
  // Who is not coming. Nothing below asks whether the set is empty except `placements`, which
  // hands back the untouched array when it is, so a game in which nobody has died is the clock
  // it always was.
  const gone = new Set((Array.isArray(dead) ? dead : []).filter(id => typeof id === 'string' && id));
  const walkingWith = new Set(asked.filter(entry => entry.with === true).map(entry => entry.id));
  const released = new Map(asked.filter(entry => entry.with !== true).map(entry => [entry.id, entry]));
  // Released, a man is the same pure function of the clock as everybody else: he lands at the
  // moment he was let go, has no hour to spend at a landing he left long ago, and starts from the
  // road distance he was standing at. Release and take-back are per person.
  if (released.size) roster = roster.map(entry => (released.has(entry.id)
    ? Object.freeze({ ...entry, arrival: Math.max(0, Number(released.get(entry.id).releasedAt) || 0), departs: 0,
      startDistance: Math.max(0, Number(released.get(entry.id).releasedDistance) || 0) })
    : entry));
  // Mus is the only one whose hour is not written down. It is drawn once from the seed the
  // game was started with and kept in the save, so he lands at the same moment on every
  // reload of that game and a different one in the next.
  roster = roster.map(entry => entry.drawn ? Object.freeze({ ...entry, arrival: drawMusArrival(seed) }) : entry);
  const lengths = roadLengths(road);
  const musterDistance = muster ? distanceAlongRoad(road, muster, lengths) : lengths[lengths.length - 1];
  const roadStops = stops.map(stop => ({ id: stop.id, dwell: stop.dwell, distance: distanceAlongRoad(road, stop.point, lengths) }));
  // Mus's own line (src/wild-route.js), measured off the main road and ending at the muster.
  // `mercenaryProgress` is untouched by any of this: it is already written in distance along
  // *a* path, so giving him a different path and a slower pace is the whole of the feature.
  const wildRoute = wild ? wildJourney(muster ?? road[road.length - 1]) : null;
  const wildLengths = wildRoute ? roadLengths(wildRoute.path) : null;
  const wildDistance = wildLengths ? wildLengths[wildLengths.length - 1] : 0;
  // Who is actually in the queue, and in what order. A man the sea put down on his own strand
  // and a man who beaches round the headland are not in it, and the queue closes up behind them
  // rather than leaving their places empty on the boards.
  const seats = new Map();
  {
    let seat = 0;
    for (const entry of roster) {
      if ((entry.route === 'shore' && shore) || (entry.route === 'wild' && wild)) continue;
      seats.set(entry.id, seat++);
    }
  }
  const start = landing ?? road[0];
  const lateral = index => (index % 2 ? -1 : 1) * (1.4 + Math.floor(index / 2) * .8);
  // The queue runs from the landing toward the road's first point, and the men face that way,
  // because it is the way they are going. `p` is the perpendicular they step off it on.
  const queue = (() => {
    // Toward the road's first point. A landing that *is* the road's first point - which is how
    // the opening sequence's own short road is written - has no direction of its own, so the
    // road's first leg stands in for it: either way they queue along the way they are going.
    const head = road[0];
    let dx = head.x - start.x, dz = head.z - start.z;
    if (Math.hypot(dx, dz) < 1e-6) { dx = road[1].x - head.x; dz = road[1].z - head.z; }
    const span = Math.hypot(dx, dz);
    if (!(span > 1e-6)) return { ux: 0, uz: 1, px: 1, pz: 0, yaw: 0 };
    const ux = dx / span, uz = dz / span;
    return { ux, uz, px: -uz, pz: ux, yaw: Math.atan2(ux, uz) };
  })();

  /**
   * How far a stopped man may be moved to find ground, and in what order the ground is looked
   * for. The order is fixed so the formation is the same on every run and in every save: out in
   * half-metre rings, sixteen bearings to a ring, the first that holds him.
   */
  const NUDGE = Object.freeze({ step: .5, rings: 12, bearings: 16 });
  const stoodAt = new Map();
  if (standable) {
    for (const stop of roadStops) {
      const point = pointAlongRoad(road, stop.distance, lengths);
      for (let index = 0; index < roster.length; index++) {
        const off = lateral(index) * 2.2;
        const home = { x: point.x + point.dz * off, z: point.z - point.dx * off };
        if (standable(home.x, home.z)) continue;
        let found = null;
        for (let ring = 1; ring <= NUDGE.rings && !found; ring++) {
          for (let turn = 0; turn < NUDGE.bearings; turn++) {
            const angle = turn / NUDGE.bearings * Math.PI * 2, reach = ring * NUDGE.step;
            const spot = { x: home.x + Math.sin(angle) * reach, z: home.z + Math.cos(angle) * reach };
            if (standable(spot.x, spot.z)) { found = spot; break; }
          }
        }
        // Nothing within six metres: leave him where the formation put him rather than invent a
        // place. `tests/nobody-sealed-in.test.js` counts any of these and fails on the first.
        if (found) stoodAt.set(`${stop.id}:${index}`, Object.freeze(found));
      }
    }
  }

  function placements(playSeconds) {
    const all = roster.map((mercenary, index) => {
      // A man who is not coming is nowhere. His place in the roster still counts, so nobody
      // else's formation moves when he falls: the list is thinned, never renumbered.
      if (gone.has(mercenary.id)) return null;
      // The companion is off the clock and off the road: he is wherever the traveler is, so he
      // has no road distance and no position of his own here. The host puts him at the shoulder
      // and writes the real x and z back onto this placement, which is what the interpreter's
      // twelve metres are measured from (`interpreterNearby`, src/linguist.js).
      if (walkingWith.has(mercenary.id))
        return { id: mercenary.id, name: mercenary.name, phase: 'with-traveler', distance: 0, stopId: null, x: null, z: null, yaw: 0, walking: false };
      // A wild man walks his own line, at the pace rough country allows, and passes none of the
      // road's stops, because he is never on the road to pass them.
      const wilding = !!wildRoute && mercenary.route === 'wild';
      const progress = wilding
        ? mercenaryProgress({ ...mercenary, pace: WILD.pace }, playSeconds, [], wildDistance)
        : mercenaryProgress(mercenary, playSeconds, roadStops, musterDistance);
      const side = lateral(index);
      if (progress.phase === 'coming' || progress.phase === 'landing') {
        // A man the sea put down waits where the sea put him: `route: 'shore'` is Ed the Word,
        // who comes out of the water onto his own strand (src/word-arrival.js) rather than
        // standing about among people who came off boats.
        if (mercenary.route === 'shore' && shore)
          return { id: mercenary.id, name: mercenary.name, ...progress, x: shore.x, z: shore.z, yaw: queue.yaw, walking: false };
        // And a wild man waits on his own strand, round the headland, where nobody is watching.
        if (wilding) {
          const beach = wildRoute.path[0], next = wildRoute.path[1];
          return { id: mercenary.id, name: mercenary.name, ...progress, x: beach.x, z: beach.z,
            yaw: Math.atan2(next.x - beach.x, next.z - beach.z), walking: false };
        }
        // Everybody else came off a boat and queues down the pier (LANDING_QUEUE).
        const seat = seats.get(mercenary.id) ?? index;
        const along = LANDING_QUEUE.lead + seat * LANDING_QUEUE.spacing, off = LANDING_QUEUE.offset * ((seat + 1) % 2 ? 1 : -1);
        return { id: mercenary.id, name: mercenary.name, ...progress,
          x: start.x + queue.ux * along + queue.px * off, z: start.z + queue.uz * along + queue.pz * off,
          yaw: queue.yaw, walking: false };
      }
      // Walking, stopped or mustered: the same arithmetic, along whichever line is his. A wild
      // man never reports `stopped`, because he was handed no stops.
      if (wilding && progress.phase !== 'mustered') {
        const spot = pointAlongRoad(wildRoute.path, progress.distance, wildLengths);
        return { id: mercenary.id, name: mercenary.name, ...progress, x: spot.x, z: spot.z, yaw: spot.yaw, walking: true };
      }
      // At the muster he is one of the company like anybody else, so he takes his place in the
      // same formation - measured along the road, because his own distance is along his own line.
      const point = pointAlongRoad(road, wilding ? musterDistance : progress.distance, lengths);
      const off = progress.phase === 'stopped' ? side * 2.2 : progress.phase === 'mustered' ? 0 : side;
      let x = point.x + point.dz * off, z = point.z - point.dx * off;
      // A stopped man whose place was a hedge was moved to the nearest ground when the formation
      // was laid. Everything else is where it always was.
      if (progress.phase === 'stopped') {
        const moved = stoodAt.get(`${progress.stopId}:${index}`);
        if (moved) { x = moved.x; z = moved.z; }
      }
      if (progress.phase === 'mustered') { x = point.x + point.dz * lateral(index) * 1.6 - point.dx * (4 + Math.floor(index / 2) * 2.2); z = point.z - point.dx * lateral(index) * 1.6 - point.dz * (4 + Math.floor(index / 2) * 2.2); }
      return { id: mercenary.id, name: mercenary.name, ...progress, x, z, yaw: progress.phase === 'walking' ? point.yaw : point.yaw + (progress.phase === 'stopped' ? Math.PI / 2 * Math.sign(side) : Math.PI), walking: progress.phase === 'walking' };
    });
    // Nobody dead: the array the map made, untouched, which is the clock this module has always
    // kept. One man dead: the same array with his hole closed and nothing else moved.
    return gone.size ? all.filter(Boolean) : all;
  }

  function summary(playSeconds) {
    // A man walking beside you is counted under his own key and is ashore like anybody else, so
    // `arrived` is still how many of the company are in this country - and the dead are in none
    // of these counts, because they have no placement to be counted under.
    const counts = { coming: 0, landing: 0, walking: 0, stopped: 0, mustered: 0, 'with-traveler': 0 };
    for (const placement of placements(playSeconds)) counts[placement.phase]++;
    const living = roster.length - gone.size;
    return { ...counts, arrived: living - counts.coming, dead: gone.size, total: roster.length + 1, musterDistance, roadLength: lengths[lengths.length - 1] };
  }

  /**
   * The traveler's own standing in the company by road distance: 1 means first to the muster.
   * The companion is at your shoulder, so he is behind you by definition — he arrives a step
   * after you do, and never ahead of you.
   */
  function travelerRank(playSeconds, travelerDistance) {
    // Two of them cannot be ranked by a distance along the road. The companion is at your
    // shoulder, so he is behind you by definition; and a wild man's distance is along a
    // different and longer line, so he counts as ahead when he is at the muster and not before.
    return 1 + placements(playSeconds).filter(p => p.phase !== 'with-traveler'
      && (p.phase === 'mustered'
        || (!(wildRoute && mercenaryById(p.id)?.route === 'wild') && p.distance > travelerDistance))).length;
  }

  return { placements, summary, travelerRank, musterDistance, roadLength: lengths[lengths.length - 1],
    // The long road asks for one and gets the first, which is the man at the traveler's shoulder;
    // `companionIds` is everybody, in roster order, for a host that draws a file.
    // A dead man does not walk with you either, whatever list he is still named on: the file is
    // what the host draws and what the horses are hung off, so it answers for itself.
    companionId: walkingWith.size ? (roster.find(entry => walkingWith.has(entry.id) && !gone.has(entry.id))?.id ?? null) : null,
    companionIds: roster.filter(entry => walkingWith.has(entry.id) && !gone.has(entry.id)).map(entry => entry.id),
    stops: roadStops.map(stop => ({ ...stop })) };
}

/** The quest stage the letter of introduction is in your satchel at (src/game-state.js). */
export const LETTER_STAGE = 2;
/** The modes that are ordinary play: the traveler is in the world and the road is running. */
export const ESCORT_MODES = Object.freeze(['playing', 'dialogue', 'inventory', 'journal', 'pause']);

/**
 * **Whether the man who landed with you walks with you at all.** False at the user's request
 * of 21 September 2026, while the main quest is built out along its least path of resistance.
 */
export const LANDING_ESCORT = false;

/**
 * Whether the man off your boat is still walking you up the pier.
 *
 * Derived every frame and never remembered. A state that does not satisfy this is not
 * escorting however it was arrived at — a checkpoint restored past the letter, a quest stage
 * set straight to 10 by the testing tools or the road smoke, a story start in another chapter,
 * a review view. None of those replay the moment the letter was taken, so anything that waited
 * to be told would keep him at the traveler's shoulder for the rest of the game, stealing every
 * site prompt on the road by standing inside its three-metre reach.
 *
 * The sign-off line is fired once on the transition; the escort itself never depends on it.
 *
 * Every default here is the safe answer. A caller who does not say where the traveler is gets
 * "not escorting", because the failure that matters is a man left walking at your shoulder for
 * the rest of the game, not a man who has to be asked for properly.
 */
export function mateIsEscorting({ mate = null, questStage = null, mode = null, arriving = false } = {}) {
  // **Switched off** (the user, 21 September 2026: Chris Gotwood should not follow you right off
  // the boat). He came up the pier at the traveler's shoulder and walked with him until Jojo
  // handed over the letter. He still lands, still stands at the landing, and still joins the
  // company on the road; he simply does not walk the first minutes with you. One word back.
  if (!LANDING_ESCORT) return false;
  if (!mate || arriving) return false;
  return Number.isFinite(Number(questStage)) && Number(questStage) < LETTER_STAGE && ESCORT_MODES.includes(mode);
}

/**
 * How the harbourmaster describes the man who came up the pier with you. He is a slot and not
 * a name — Chris Gotwood for ten of the eleven, Cromb when you are Chris — so she must never
 * be made to send Chris to go and talk to Gotwood. She has met these two and has a word for
 * each of them; anybody who ends up in the slot later gets the plain one.
 */
const LANDING_MATE_NOTE = Object.freeze({
  'merc-gotwood': 'plain cloth and pleased with himself',
  'merc-cromb': 'plain cloth and not much to say for himself',
});
export function landingMateNote(mate) {
  if (!mate?.name) return 'plain cloth and a sword, and he came off your boat';
  return `${LANDING_MATE_NOTE[mate.id] ?? 'plain cloth and a sword'}, ${mate.name}`;
}

/**
 * Where the man who came off your boat walks while he is walking you up the pier: at your
 * shoulder, a little behind, on whichever side there is ground for him. Tidehaven's pier is
 * three metres wide, so the offsets start tight and fall in directly behind; a caller that
 * finds none of them standable leaves him where he was rather than put him in the water.
 *
 * `lateral` is to the traveler's right and `back` is behind him, in metres.
 */
export const ESCORT_OFFSETS = Object.freeze([
  Object.freeze({ lateral: .95, back: 1.25 }), Object.freeze({ lateral: -.95, back: 1.25 }),
  Object.freeze({ lateral: .65, back: 1.75 }), Object.freeze({ lateral: -.65, back: 1.75 }),
  Object.freeze({ lateral: 0, back: 1.6 }), Object.freeze({ lateral: 0, back: 1.05 }),
  // The last resort is the traveler's own feet, which are standable by definition because he is
  // standing on them. On a pier corner where nothing else is ground, a man briefly inside you is
  // a worse picture than a man beside you and a much better one than a man in the water; the
  // npc body separation in src/bodies.js pushes him clear on the next frame.
  Object.freeze({ lateral: 0, back: 0 }),
]);

/**
 * The first of ESCORT_OFFSETS that `standable(x, z)` accepts, in world metres, for a traveler
 * at `at` facing `at.yaw` — forward is (sin, cos), the way every actor's rotation.y reads.
 * Null when there is nowhere for him, which the caller must treat as "do not move him".
 *
 * Pure, so the pier can be proved walkable from every spot the traveler can stand on it
 * without starting a renderer.
 */
export function escortSpotFor(at, standable = () => true, place = 0) {
  if (!at || !Number.isFinite(at.x) || !Number.isFinite(at.z)) return null;
  const yaw = Number.isFinite(at.yaw) ? at.yaw : 0, sin = Math.sin(yaw), cos = Math.cos(yaw);
  // `place` is which man of the file is asking. Without it every man who falls back here is
  // handed the same answer, because the list is fixed and the first standable offset wins - two
  // of ten measured onto one stone in Lumber Town square. Starting each man that far down the
  // list gives the fallback the shape the file already has.
  const start = Math.max(0, Math.floor(Number(place) || 0)) % ESCORT_OFFSETS.length;
  for (let step = 0; step < ESCORT_OFFSETS.length; step++) {
    const { lateral, back } = ESCORT_OFFSETS[(start + step) % ESCORT_OFFSETS.length];
    const x = at.x - sin * back + cos * lateral, z = at.z - cos * back - sin * lateral;
    if (standable(x, z)) return { x, z };
  }
  return null;
}

/** The inventory weapon a held kit corresponds to; bows, spears and staves are not held weapons. */
export const KIT_WEAPON_ITEM = Object.freeze({ sword: 'simple-sword', 'sword-shield': 'simple-sword', mace: 'iron-mace', dagger: 'long-dagger', axe: 'bearded-axe', greatsword: 'greatsword',
  // The four who will not trade still carry something real, so that what lies where they fell is
  // a weapon and not a blank. Before this, Ciaran, Matt, Mus and Lakota left nothing behind.
  spear: 'ash-spear', spears: 'ash-spear', pike: 'war-pike', staff: 'quarterstaff' });

/**
 * Whether a mercenary swaps the weapon in his hand for the traveler's, and what he says.
 * Nobody trades for a stick, and nobody trades like for like.
 */
export function tradeOffer(id, heldWeaponId, travelerWeaponId) {
  const mercenary = mercenaryById(id);
  if (!mercenary) return { accepts: false, line: '' };
  if (!mercenary.trades || !heldWeaponId) return { accepts: false, line: mercenary.tradeLine };
  if (!Object.values(KIT_WEAPON_ITEM).includes(travelerWeaponId)) return { accepts: false, line: 'A stick? I am a mercenary, not a shepherd. Come back with iron.' };
  if (heldWeaponId === travelerWeaponId) return { accepts: false, line: 'Same as mine. There is no trade in that.' };
  return { accepts: true, line: mercenary.tradeLine };
}

/** How a mercenary fights, in his own words; also a guide to facing that weapon. */
export function mercenaryStyleLines(id) {
  const mercenary = mercenaryById(id);
  return mercenary ? [...mercenary.styleLines] : [];
}

/** The weapon a mercenary carries and whether he would swap it for the traveler's sword. */
export function mercenaryWeapon(id) {
  const mercenary = mercenaryById(id);
  return mercenary ? { weapon: mercenary.weapon, style: mercenary.style, trades: mercenary.trades, tradeLine: mercenary.tradeLine } : null;
}

/** What a mercenary says when spoken to on the road, given where he is. */
export function mercenaryLines(id, placement, { met = false } = {}) {
  const mercenary = mercenaryById(id);
  if (!mercenary) return [];
  // Most of them say the ordinary thing for where they are. Two of them would never say it:
  // a man who talks the way Ed talks does not tell you there is no time to stand about, and
  // Mus does not use four sentences where none will do.
  // A man who is not on the road does not talk about the road. Mus's line passes 2 m from the
  // Well at Rena and 5 m from the Ruins, where people stand about, and for 1,700 m he answered
  // "Road today. It is quicker with company." - four words after telling you he does not use it.
  const wildShared = { first: 'You are a long way off the road.', after: 'I will see you at the muster.' };
  const shared = { mustered: 'We made it, then. The camp counts heads at dusk; make sure yours is one of them.',
    stopped: 'Same errand as you, I expect. Go on ahead; I will catch you up.',
    walking: 'No time to stand about. The camp on the Moros Plain, that is the word. Walk with me or after me.',
    'with-traveler': 'Right behind you. Take your time — the Marshal is waiting on the eleventh of us and that is you, so nothing starts without you.' };
  const phase = placement?.phase;
  // Walking his own line across country is a different thing from walking the road, and is
  // answered differently. `met` is the host's: a man like Mus says the longer thing once.
  if (mercenary.route === 'wild' && phase === 'walking') {
    const wild = mercenary.saysWild ?? wildShared;
    return met ? [wild.after] : [wild.first, wild.after];
  }
  const status = phase && (mercenary.says?.[phase] ?? shared[phase]) || mercenary.lines[1];
  return [mercenary.lines[0], status];
}

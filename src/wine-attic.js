/**
 * Tharganhom, the Wine Attic of Solis: a wine shop up an outside stair, in the
 * attic of an old house on the main street of the upper town. Drawn from the
 * Wine Attic in Clifton, Virginia (a second-floor shop on Main Street, wines
 * hand-picked from around the corner and around the world, tastings at the
 * counter). The name is coastal Mittoli: *thar*, wine (from Thareth, the god
 * whose tears made the first vine), *gan*, a high place, *hom*, a dwelling:
 * the wine's high room.
 *
 * Juan keeps it: enormous, loud, beloved, a cooper's son from Sorveth who worked
 * the Iberos wine boats for twelve years and sells nothing from West Suval.
 * Mirith works the floor: small, red-haired, quiet, from Bouén, with the best
 * palate in Solis. Ask her what she is reading and she will talk.
 *
 * The attic floor is a deck, like a quay: `atticDeckHeight` lifts anybody on
 * the stair or the floor, and the walls around its edge are the colliders
 * (colliders are flat, so the same wall keeps the street out of the ground
 * floor and the attic's people off the edge). Pure: no DOM, no three.
 */
import { SOLIS, solisPoint } from './region-world.js';
import { ATTIC_WINES, ATTIC_WINE_IDS } from './attic-wines.js';

const freeze = Object.freeze;
const P = solisPoint;

export const WINE_ATTIC = freeze({
  id: 'tharganhom', name: 'Tharganhom', meaning: 'The Wine Attic',
  gloss: 'thar, wine, for Thareth; gan, a high place; hom, a dwelling: the wine’s high room',
  // In the Solis frame: `a` metres east and `b` metres south of the market cross. The main street runs at a = 0.
  a0: 7.5, a1: 16.5, b0: -20.5, b1: -13.5,
  /** The ground floor's height: the attic floor is this far above the foot of the stair. */
  lift: 2.7,
  wall: .3,
  /** The stair climbs east from beside the main street to the open gable, clear of the market square's corner. */
  stair: freeze({ a0: 3.6, a1: 7.5, b0: -19.4, b1: -17.4 }),
  /** Under the roof slopes and along the back wall: shelves of bottles. */
  shelf: .6,
  /** The tasting counter and two barrel tables. */
  counter: freeze({ a0: 11, a1: 14.2, b0: -15.3, b1: -14.7 }),
  barrels: freeze([freeze({ a: 9, b: -14.9 }), freeze({ a: 14.8, b: -16.6 })]),
});
const A = WINE_ATTIC, S = A.stair;
const stairMid = (S.b0 + S.b1) / 2;
export const atticPoint = (a, b) => P(a, b);

/** Where Juan and Mirith stand, on the attic floor. Juan faces the stair head to greet whoever comes up it. */
export const ATTIC_STANDS = freeze({
  'attic-juan': freeze({ ...P(9.7, -16.9), yaw: -Math.PI / 2 - .35 }),
  'attic-mirith': freeze({ ...P(14.5, -18.9), yaw: -2.3 }),
});
/** The stair's foot on the street and its head in the attic, for anyone who needs the way up. */
export const ATTIC_FOOT = freeze(P(S.a0 - .4, stairMid));
export const ATTIC_HEAD = freeze(P(A.a0 + .7, stairMid));

let frameCache = null;
function frame(ground) {
  if (frameCache?.ground !== ground) {
    const foot = P(S.a0, stairMid), base = ground(foot.x, foot.z);
    frameCache = { ground, base, floor: base + A.lift };
  }
  return frameCache;
}
/**
 * The walking height on the stair and the attic floor, or null elsewhere.
 * `ground` is the world's own ground height. The attic floor is level; the
 * stair rises evenly from the street to the floor.
 */
export function atticDeckHeight(x, z, ground) {
  const a = x - SOLIS.centre.x, b = z - SOLIS.centre.z;
  if (a < S.a0 || a > A.a1 || b < A.b0 || b > A.b1) return null;
  if (a >= A.a0) return Math.max(frame(ground).floor, ground(x, z));
  if (b < S.b0 || b > S.b1) return null;
  const f = frame(ground), t = (a - S.a0) / (A.a0 - S.a0);
  return Math.max(ground(x, z), f.base + t * A.lift);
}
/** The attic floor's height, for the scenery. */
export const atticFloor = ground => frame(ground).floor;

const box = (a0, a1, b0, b1, kind = 'wine-attic') => {
  const p = P((a0 + a1) / 2, (b0 + b1) / 2);
  return freeze({ x: p.x, z: p.z, hx: (a1 - a0) / 2, hz: (b1 - b0) / 2, kind });
};
/**
 * The walls round the edge, the rails up the stair and the furniture. The
 * open gable's rail leaves a gap at the stair head; the stair's rails leave
 * only its foot open to the street.
 */
export function atticColliders() {
  const w = A.wall, rail = .16, shelf = A.shelf;
  return [
    box(A.a0, A.a1, A.b0, A.b0 + w), box(A.a0, A.a1, A.b1 - w, A.b1), box(A.a1 - w, A.a1, A.b0, A.b1),
    box(A.a0, A.a0 + rail, A.b0, S.b0), box(A.a0, A.a0 + rail, S.b1, A.b1),
    box(S.a0, A.a0, S.b0 - rail, S.b0), box(S.a0, A.a0, S.b1, S.b1 + rail),
    // The shelves: along the back wall, and low under each slope of the roof.
    box(A.a1 - w - shelf, A.a1 - w, A.b0 + w, A.b1 - w, 'wine-attic-shelf'),
    box(A.a0 + 1.4, A.a1 - w - shelf, A.b0 + w, A.b0 + w + shelf, 'wine-attic-shelf'),
    box(A.a0 + 1.4, A.a1 - w - shelf, A.b1 - w - shelf, A.b1 - w, 'wine-attic-shelf'),
    box(A.counter.a0, A.counter.a1, A.counter.b0, A.counter.b1, 'wine-attic-counter'),
    ...A.barrels.map(({ a, b }) => freeze({ ...P(a, b), r: .38, kind: 'wine-attic-barrel' })),
  ];
}

/** For the autopilot: the attic is reached only up its stair. */
export const ATTIC_ENCLOSURE = freeze({
  id: 'tharganhom', name: A.name,
  contains: (x, z) => {
    const a = x - SOLIS.centre.x, b = z - SOLIS.centre.z;
    return a > A.a0 && a < A.a1 && b > A.b0 && b < A.b1;
  },
  gates: freeze([freeze({ id: 'stair', outer: P(S.a0 - 2.5, stairMid), inner: P(A.a0 + 1.4, stairMid) })]),
});

// ---------------------------------------------------------------------------
// The people
// ---------------------------------------------------------------------------
export const JUAN = freeze({ id: 'attic-juan', name: 'Juan', role: 'Keeper of Tharganhom, the Wine Attic', modelRole: 'wine-seller', color: 0x3b4450, skin: 0xbf8a5e });
export const MIRITH = freeze({ id: 'attic-mirith', name: 'Mirith', role: 'At Tharganhom', modelRole: 'wine-clerk', color: 0x3f5a47, skin: 0xf0d2bc });
export const ATTIC_PEOPLE = freeze([JUAN, MIRITH]);

export const JUAN_WELCOME = freeze([
  'Hey! Hey hey hey. Come up, come up, mind the top step, it is a liar. Welcome to Tharganhom. The Wine Attic, in your tongue. Top of the house, top of the town, top of the — okay, it is an attic. But what an attic.',
  'I am Juan. This is my place. That is Mirith in the corner. She knows more about wine than I do. Do not tell her I said that. She already knows.',
  'Now look. Rule of the house: nothing on these shelves is from West Suval. Nothing. You want Suval wine, you walk out that gate, you throw a rock, you hit a vineyard. Up here? Up here we travel. Enebreum, the lake country, Ascarth, Amod, all the way up to Bouén. So. Where do you want to go?',
]);
const JUAN_AGAIN = freeze([
  'There they are! My favourite person who came up those stairs today. Do not tell the other ones.',
  'Look who it is. Sit, sit. Mirith, look who it is. ... She is thrilled. That is her thrilled face.',
  'Okay, okay. You are back. That means one of two things: you liked something, or you did not and you want to fight about it. Either way, I am pouring.',
  'Oye! Just in time. I opened something I should not have opened, and it is a crime to drink it alone.',
]);
export const JUAN_LESSON = freeze([
  'No, no, no. Stop. You are drinking it like it owes you money. Give me that. Okay. Here is how it goes.',
  'Hold it up to the window. Look at it. The colour tells you the grape, the age, whether it slept in a barrel. You look at a person before you talk to them, right? Same thing.',
  'Now swirl it, stick your whole nose in there, do not be shy, nobody up here is shy. Most of what you taste, you are smelling. Then a little sip, move it around, let it tell you if it is sharp, if it grabs your gums, if it hangs around after. Now you tasted it. Before, you drank it. Big difference. Huge.',
]);
const JUAN_TOPICS = freeze({
  rule: [
    'Okay, so, people ask me that. Here is the thing. Here is the thing. Livia Seravo out at Vaervelm Caelazh? Best Norton on the island. I would marry that Norton. But I sell hers, then the guy down the hill wants me to sell his, and the guy next to him —',
    'Suddenly I am in a valley feud. I am not in a valley feud. Up here is nobody’s vineyard. The Legion comes in, the Coalition comes in, they sit at the same barrel. You know why that works? Because it is not their wine they are fighting about.',
  ],
  war: [
    'Business? Business is weird, my friend. Tuesday the Coalition, Wednesday the Legion, Thursday the Coalition again and they want to know what the Legion drank. I tell them. It is wine. It is not a secret.',
    'A war is bad for everything except two things: wine, and people who talk. And look at me. I am doing great. I feel terrible about it. Pour you one?',
  ],
  juan: [
    'Me? Oh, you do not want — okay, you asked. My father was a cooper in Sorveth. Barrels. I grew up inside barrels. I am this size because one day he could not fit me in one any more and he just had to let me keep going.',
    'I worked the wine boats up and down the Iberos for twelve years. Every port, every cellar, every guy with a cousin with a vineyard. I have tasted, conservatively, everything.',
    'Then I came home, and the only room in Solis I could afford was an attic. Nobody wants to carry cases up a staircase. You know who carries cases up a staircase? This guy. Look at me. I was built for it.',
  ],
  mirith: [
    'Mirith? Mirith has the best palate in Solis, and she says maybe four words a day. Three of them are about wine. The fourth one is usually “no”, and she is usually right.',
    'You want to get her talking, do not ask her about wine. Ask her what she is reading. Then get comfortable. Then maybe do not walk home alone, you know what I mean? The stories she has. Madre mía.',
  ],
  shelf: [
    'That? No. That is not for sale. That is a valley wine from the Lotharn. They do not sell it, they do not trade it, it does not even taste the same outside the valley. A man gave it to me in a pass for carrying his mother down the mountain.',
    'I am not opening it. It is not a bottle, it is a promise. Do not ask me again. ... Okay, you can ask me again. But I am not opening it.',
  ],
});

/** Juan's offers: every bottle on the shelves, with what the buyer can afford. */
export function atticOffers({ purse, items = {} }) {
  return ATTIC_WINE_IDS.map(id => {
    const wine = ATTIC_WINES[id], short = purse < wine.price;
    return { id, item: wine.item, name: wine.name, price: wine.price, enabled: !short,
      reason: short ? `That is ${wine.price} copper, and you have ${purse}.` : '', label: `${items[wine.item]?.name ?? wine.name} · ${wine.price} copper` };
  });
}

const JUAN_BACK = freeze(['So! What else?', 'Okay. What else, what else.', 'Where were we? Right. Wine.']);

/** Juan's tasting menu: every wine on the shelves, tasted at the counter. */
export function juanTasting(npc, context, line = 'Okay! Okay. What are we doing? Red, white, something that will ruin dessert for you forever?') {
  const { wine, openDialogue, closeDialogue, act } = context;
  openDialogue(npc, [line], null, 'Back to Juan', { choices: [
    ...ATTIC_WINE_IDS.map(id => ({ id: `attic-taste-${id}`, label: `The ${ATTIC_WINES[id].name}, from ${ATTIC_WINES[id].from}${wine.hasTasted(id) ? ' (again)' : ''}.`, action: () => { closeDialogue(); act(`attic-taste-${id}`); } })),
    { id: 'attic-tasting-done', label: 'That is enough for now.', action: () => juanConversation(npc, { ...context, back: true }) },
  ] });
}
/** Juan's shelves, priced. `purse` is the copper carried now. */
export function juanShop(npc, context, line = null) {
  const { purse = 0, items = {}, openDialogue, closeDialogue, act } = context;
  const offers = atticOffers({ purse, items });
  openDialogue(npc, [line ?? `Everything you see. You carry ${purse} copper. For you? Same price as everybody, but I will say it nicer.`], null, 'Back to Juan', { choices: [
    ...offers.map(offer => ({ id: `attic-buy-${offer.id}`, label: offer.label, enabled: offer.enabled, reason: offer.reason, action: () => { closeDialogue(); act(`attic-buy-${offer.id}`); } })),
    { id: 'attic-shop-done', label: 'Just looking.', action: () => juanConversation(npc, { ...context, back: true }) },
  ] });
}

/**
 * Juan at the stair head. `act` runs in the host: 'attic-welcome' (the first
 * visit), 'attic-learn-wine', 'attic-taste-<id>' and 'attic-buy-<id>'.
 * `wine` is the Wine skill (src/wine.js); `purse` the copper carried; `back`
 * is set when the conversation comes back round from one of its topics.
 */
export function juanConversation(npc, context) {
  const { attic, wine, back = false, openDialogue, closeDialogue, act } = context;
  if (npc.id !== JUAN.id) return false;
  const again = () => juanConversation(npc, { ...context, back: true });
  const first = !attic.met;
  if (first) act('attic-welcome');
  const opening = first ? [...JUAN_WELCOME] : back ? [JUAN_BACK[attic.visits % JUAN_BACK.length]] : [JUAN_AGAIN[attic.visits % JUAN_AGAIN.length]];
  const talk = (lines, label = 'Back to Juan') => openDialogue(npc, [...lines], null, label, { onComplete: again });
  const choices = [
    ...(wine.met ? [{ id: 'attic-tasting', label: 'Pour me a taste.', action: () => juanTasting(npc, context) }]
      : [{ id: 'attic-learn-wine', label: 'I do not really know how to taste wine.', action: () => { closeDialogue(); act('attic-learn-wine'); } }]),
    { id: 'attic-shop', label: 'What are you selling?', action: () => juanShop(npc, context) },
    { id: 'attic-rule', label: 'Why nothing from West Suval?', action: () => talk(JUAN_TOPICS.rule) },
    { id: 'attic-war', label: 'How is business, with the war?', action: () => talk(JUAN_TOPICS.war) },
    { id: 'attic-juan', label: 'Tell me about yourself.', action: () => talk(JUAN_TOPICS.juan) },
    { id: 'attic-about-mirith', label: 'What about Mirith?', action: () => talk(JUAN_TOPICS.mirith) },
    { id: 'attic-shelf', label: 'What is the dusty bottle on the top shelf?', action: () => talk(JUAN_TOPICS.shelf) },
    { id: 'leave-juan', label: 'Thanks, Juan.', action: closeDialogue },
  ];
  openDialogue(npc, opening, null, 'Back down the stair', { choices });
  return true;
}

// ---------------------------------------------------------------------------
// Mirith's stories
// ---------------------------------------------------------------------------
const story = (id, title, lines) => freeze({ id, title, lines: freeze(lines) });
export const MIRITH_LIFE = freeze([
  story('fog', 'Where are you from?', [
    'Bouén. Right at the top of the world, where the Deep River current comes down cold and the fog sits on the vines from spring to harvest.',
    'You pick by feel up there. You cannot see the end of your own row. My grandmother could tell a ripe bunch by the smell of the fog around it. I thought she was lying until I could do it too.',
    'People here think the north is grey. It is not. It is every colour, only quieter. Like me, Juan says. He means it nicely. I think.',
  ]),
  story('becalmed', 'How did you come south?', [
    'On a cask ship, when I was seventeen. Eleven days out of Bouén the wind stopped. Just stopped. Flat sea all round, for nine days.',
    'The water went bad on the sixth. The crew started on the cargo on the seventh. Forty casks, from every port on the coast, and by the time the wind came back I had tasted every one and written them all down.',
    'The captain found the notebook and tried to hire me. I got off at Solis instead, and walked up the first staircase that smelled of a cellar.',
  ]),
  story('four-words', 'How did you meet Juan?', [
    'I came up here to sell a cask of fog white. Juan talked for an hour. About the cask, the weather, a horse he used to have, a woman in Enebreum, the horse again.',
    'I said four words. “It is not corked.” He had been about to pour it away. He tasted it again, went quiet for the first time I have ever seen, and asked me if I wanted a job.',
    'He tells people I said nothing at all. It was four words. I counted.',
  ]),
  story('lighthouse', 'What did you do before this?', [
    'Kept a light, one winter. The keeper at the Point broke his leg on his own stair, and there was nobody else who would do it for what he paid.',
    'Every four hours, up two hundred and eleven steps, trim the wick, clean the glass, down again. Four months. I read every book on the island twice.',
    'You learn what quiet is up there. Not no sound, the wind never stops. Just nobody waiting for you to answer it. I think that is why I like the attic. It is a lighthouse that sells wine.',
  ]),
]);
export const MIRITH_SCARY = freeze([
  story('extra-picker', 'The extra picker', [
    'At harvest in Bouén you pick in the fog, and at night the foreman counts the pickers in off the slope. Every name, out loud. The rule is older than the vineyard.',
    'The year I was nine, he counted forty-one. There were forty of us. He counted again: forty-one. Nobody would say which of us was the extra, and nobody could see well enough to tell.',
    'In the morning there were forty baskets on the rack, and one more. Full. Every bunch cut clean. Black grapes. We only grow white.',
    'My grandmother tipped that basket into the sea and did not speak for the rest of the day. Nobody asked her why. Nobody wanted her to answer.',
  ]),
  story('wagon', 'The wagon in the pass', [
    'There are passes in the Lotharn they call contested wine routes. Carry the wrong valley’s wine through one and the valley will have opinions. That is the funny version.',
    'The other version: a drover took a wagon of wine from over the ridge through one of those passes in the snow. The valley found the wagon the next morning, in the middle of the road.',
    'The horses calm. The harness fine. Every cask tapped, and the taps still dripping. No drover. Snow all round, and footprints only coming in.',
    'They say a valley wine keeps its character because the valley keeps it. They never say what the valley is.',
  ]),
  story('cooper', 'The cooper upstairs', [
    'Before Juan, this attic was a cooper’s. He slept up here among his staves. The landlord says he left owing rent. The landlord says it very quickly.',
    'Some nights after close, when I am doing the count, I hear a cask rolling across this floor. Slow. Heavy. Full. From that wall to this one.',
    'Everything up here stands on the floor. There is nowhere for anything to roll from. And there is no floor above us. We are the top.',
    'Juan leaves a cup of wine on the east beam every night. He says it is for luck. Every morning it is empty, and he fills it again, and neither of us talks about it.',
  ]),
  story('bell', 'The bell under the sea wall', [
    'You have seen the patch on the sea face of the wall. That is where the old kingdom’s harbour tower went into the water, with its bell still in it.',
    'The porters on the quay say you can hear it before a storm. Not ringing; they are very particular about that. Struck. One knock at a time, like somebody under the water asking to be let in.',
    'I did not believe them. Then last winter, the night before the big blow, I was on the quay late. Three knocks, out past the patch.',
    'And then one knock back, right under the planks at my feet.',
  ]),
]);
const MIRITH_QUIET = freeze(['Hi.', 'Mm.', 'Juan is the one who talks.', 'Hello.']);
const MIRITH_WARM = freeze([
  'Oh. You again. Good.',
  'Sit. The crate is fine. It is the Bouéni; it will not mind.',
  'I kept my place for you. In the book, I mean.',
]);

/**
 * Mirith, in her corner with a book. Quiet until you ask what she is reading;
 * after that she talks to you, and her life and her stories are there to ask
 * for. `act` runs 'mirith-warm' and 'mirith-life-<id>' / 'mirith-scary-<id>'
 * in the host, which marks them heard and shows the lines.
 */
export function mirithConversation(npc, context) {
  const { attic, wine = null, back = false, openDialogue, closeDialogue, act } = context;
  if (npc.id !== MIRITH.id) return false;
  const again = () => mirithConversation(npc, { ...context, back: true });
  if (!attic.warm) {
    const quiet = [back ? '...' : MIRITH_QUIET[attic.quietTalks % MIRITH_QUIET.length]];
    if (!back) act('mirith-quiet');
    openDialogue(npc, quiet, null, 'Leave her to it', { choices: [
      { id: 'mirith-reading', label: 'What are you reading?', action: () => openDialogue(npc, [
        'She looks up, surprised to be asked. “Stories. Old ones, from the passes and the north.”',
        '“The kind you tell with the lamp turned down.”',
      ], null, 'Leave her to it', { choices: [
        { id: 'mirith-hear-one', label: 'I would like to hear one.', action: () => { closeDialogue(); act('mirith-warm'); } },
        { id: 'mirith-not-now', label: 'Some other time.', action: closeDialogue },
      ] }) },
      { id: 'mirith-where', label: 'Where are you from?', action: () => openDialogue(npc, ['North.'], null, 'Leave her to it', { onComplete: again }) },
      { id: 'mirith-juan', label: 'Is Juan always like this?', action: () => openDialogue(npc, ['Yes.', 'A very small smile, gone as soon as it came.'], null, 'Leave her to it', { onComplete: again }) },
      { id: 'leave-mirith', label: 'I will let you read.', action: closeDialogue },
    ] });
    return true;
  }
  const untasted = wine?.met ? ATTIC_WINE_IDS.find(id => !wine.hasTasted(id)) : null;
  const pick = (list, kind) => list.map(entry => ({ id: `mirith-${kind}-${entry.id}`, label: `${entry.title}${attic.heard(kind, entry.id) ? ' (again)' : ''}`,
    action: () => { closeDialogue(); act(`mirith-${kind}-${entry.id}`); } }));
  openDialogue(npc, [back ? 'Mm?' : MIRITH_WARM[attic.visits % MIRITH_WARM.length]], null, 'Back down the stair', { choices: [
    { id: 'mirith-life', label: 'Tell me about yourself.', action: () => openDialogue(npc, ['What do you want to know?'], null, 'Back to Mirith', { choices: [...pick(MIRITH_LIFE, 'life'), { id: 'mirith-life-done', label: 'Another time.', action: again }] }) },
    { id: 'mirith-scary', label: 'Tell me something frightening.', action: () => openDialogue(npc, ['She closes the book on her finger, and turns the lamp down a little.'], null, 'Back to Mirith', { choices: [...pick(MIRITH_SCARY, 'scary'), { id: 'mirith-scary-done', label: 'Maybe not tonight.', action: again }] }) },
    { id: 'mirith-recommend', label: 'What should I drink?', action: () => openDialogue(npc, untasted
      ? [`The ${ATTIC_WINES[untasted].name}. You have not had it yet.`, 'Ask Juan. Let him do the speech. He likes the speech.']
      : ['The fog white. Always the fog white.', 'Unless it is raining. Then the Enbraleth.'], null, 'Back to Mirith', { onComplete: again }) },
    { id: 'leave-mirith-warm', label: 'Goodnight, Mirith.', action: closeDialogue },
  ] });
  return true;
}
export const mirithStory = (kind, id) => (kind === 'life' ? MIRITH_LIFE : kind === 'scary' ? MIRITH_SCARY : []).find(entry => entry.id === id) ?? null;

// ---------------------------------------------------------------------------
// What the attic remembers of the traveler
// ---------------------------------------------------------------------------
export const WINE_ATTIC_VERSION = 1;
const LIFE_IDS = MIRITH_LIFE.map(entry => entry.id), SCARY_IDS = MIRITH_SCARY.map(entry => entry.id);

export function validateWineAtticSnapshot(data, { allowMissing = true } = {}) {
  if (data === undefined) return allowMissing;
  if (!data || typeof data !== 'object' || Array.isArray(data) || data.version !== WINE_ATTIC_VERSION) return false;
  if (typeof data.met !== 'boolean' || typeof data.warm !== 'boolean') return false;
  if (!Number.isInteger(data.visits) || data.visits < 0 || data.visits > 1e6) return false;
  const list = (value, allowed) => Array.isArray(value) && value.every(id => allowed.includes(id)) && new Set(value).size === value.length;
  if (!list(data.life, LIFE_IDS) || !list(data.scary, SCARY_IDS)) return false;
  if (!data.warm && (data.life.length || data.scary.length)) return false;
  return true;
}

export function createWineAttic() {
  const state = { met: false, warm: false, visits: 0, quietTalks: 0, life: new Set(), scary: new Set() };
  /** Juan's welcome, the first time up the stair. */
  function welcome() { const first = !state.met; state.met = true; return { ok: true, first }; }
  function visit() { state.visits++; }
  function quiet() { state.quietTalks++; }
  /** Asked what she is reading, and wanting to hear one: she talks from now on. */
  function warmUp() { const first = !state.warm; state.warm = true; return { ok: true, first }; }
  function hear(kind, id) {
    const entry = mirithStory(kind, id);
    if (!entry || !state.warm) return { ok: false };
    const set = kind === 'life' ? state.life : state.scary, first = !set.has(id);
    set.add(id);
    return { ok: true, first, entry, all: state.life.size === LIFE_IDS.length && state.scary.size === SCARY_IDS.length };
  }
  function snapshot() { return { version: WINE_ATTIC_VERSION, met: state.met, warm: state.warm, visits: state.visits, life: [...state.life], scary: [...state.scary] }; }
  function restore(data) {
    state.met = false; state.warm = false; state.visits = 0; state.quietTalks = 0; state.life = new Set(); state.scary = new Set();
    if (!validateWineAtticSnapshot(data, { allowMissing: false })) return false;
    state.met = data.met; state.warm = data.warm; state.visits = data.visits; state.life = new Set(data.life); state.scary = new Set(data.scary);
    return true;
  }
  return { welcome, visit, quiet, warmUp, hear, snapshot, restore,
    get met() { return state.met; }, get warm() { return state.warm; }, get visits() { return state.visits; }, get quietTalks() { return state.quietTalks; },
    heard: (kind, id) => (kind === 'life' ? state.life : state.scary).has(id) };
}

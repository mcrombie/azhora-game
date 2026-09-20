/**
 * Brandy Frank, Tidehaven's dyer, in her own words: "charismatic, and yet the
 * way I normally am, which is a little bit like Eeyore"; ordinary looking and
 * somehow not; "and Lisa Frank". She makes colours nothing in Drent has any
 * business being (hot pink, electric blue, a green that hums), paints the
 * animals the way they ought to be, and is mildly sorry about all of it.
 * Everybody in the village loves her. She assumes they are lost.
 *
 * Her dye yard is on the lane up to Saltwind Lookout, on the north side of the
 * village: vats, two drying lines of impossible cloth, a bench, painted boards
 * and her sign. She gives the traveler, once, a ribbon dyed in every colour she
 * has. Pure: no DOM, no three; the yard is built in src/brandy-yard.js.
 */
const freeze = Object.freeze;

export const BRANDY = freeze({ id: 'brandy-frank', name: 'Brandy Frank', role: 'Dyer of impossible colours', modelRole: 'rainbow-dyer', color: 0x1ec8d8, skin: 0xe0b394 });
export const RIBBON_ITEM = 'rainbow-ribbon';
export const BRANDY_SIGN = 'Brandy Frank, Dyer';
/** The yard's frame: level open ground on the north side of the village, found by tests/find-brandy-yard.mjs; +z faces the lane. */
export const BRANDY_YARD = freeze({ x: -14, z: 76.8, yaw: .785 });
export function yardPoint(lx, lz) {
  const { x, z, yaw } = BRANDY_YARD, c = Math.cos(yaw), s = Math.sin(yaw);
  return { x: x + lx * c + lz * s, z: z - lx * s + lz * c };
}
export const BRANDY_STAND = freeze({ ...yardPoint(.4, 2.0), yaw: BRANDY_YARD.yaw });

/** A board on two posts, `posts` metres either side of its middle; a house-shaped board stands on closer ones. */
const board = (id, lx, lz, turn, shape = 'board') => freeze({ id, lx, lz, turn, shape, posts: shape === 'house' ? .5 : .62 });
/** Everything in the yard, in its frame. */
export const YARD_LAYOUT = freeze({
  vats: freeze([[-3.2, .3, 0xff3fa4], [-2.1, .3, 0x2f7dff], [-1.0, .3, 0x9be22d]].map(([lx, lz, dye]) => freeze({ lx, lz, dye, r: .45 }))),
  lines: freeze([
    freeze({ from: [.8, -1.0], to: [4.0, -1.0], cloths: freeze([0xff3fa4, 0xff8c1a, 0xffe135, 0x7ed321, 0x1ec8d8, 0x8e44ec]) }),
    freeze({ from: [.8, -2.4], to: [4.0, -2.4], cloths: freeze(['leopard', 0x2f7dff, 'leopard', 0xffe135, 'leopard']) }),
  ]),
  // The painted boards (src/brandy-boards.js): animals round the yard, and the house-shaped ones along the lane, facing it.
  boards: freeze([
    board('leopard', -3.2, -3.2, 0), board('bear', -1.4, -3.2, 0), board('dolphin', 4.6, .8, -1.1),
    board('unicorn', -4.3, -1.4, 1.25), board('kittens', -4.3, 1.5, 1.25), board('panda', 4.7, -1.5, -1.25),
    board('cottage', -3.4, 3.5, 0, 'house'), board('bakery', -1.8, 3.9, 0, 'house'), board('birdhouse', 3.9, 2.4, -.45, 'house'),
  ]),
  bench: freeze({ lx: -2.2, lz: -1.7, w: 1.6, d: .7 }),
  sign: freeze({ lx: 2.6, lz: 3.8 }),
});
/** The yard's colliders, in world terms: vats, the posts of the lines and boards, the bench. The sign brings its own. */
export function yardColliders() {
  const out = [];
  for (const v of YARD_LAYOUT.vats) out.push({ ...yardPoint(v.lx, v.lz), r: v.r + .05, kind: 'brandy-vat' });
  for (const line of YARD_LAYOUT.lines) for (const [lx, lz] of [line.from, line.to]) out.push({ ...yardPoint(lx, lz), r: .14, kind: 'brandy-post' });
  for (const b of YARD_LAYOUT.boards) for (const side of [-1, 1]) {
    const lx = b.lx + Math.cos(b.turn) * side * b.posts, lz = b.lz - Math.sin(b.turn) * side * b.posts;
    out.push({ ...yardPoint(lx, lz), r: .14, kind: 'brandy-post' });
  }
  const bench = YARD_LAYOUT.bench;
  for (const side of [-1, 1]) out.push({ ...yardPoint(bench.lx + side * bench.w / 4, bench.lz), r: bench.d / 2 + .05, kind: 'brandy-bench' });
  return out;
}

/** What Brandy says about him, which is the only subject she is not mildly sorry about. */
export const BRANDY_ON_BOSCO = freeze([
  'Bosco. He came out of a dye pan behind the bakery about so big, and he has been here since, and he is the only thing in this yard that came out right, and I did not make him.',
  'I know. I know. He is not supposed to be that shape. He gets one meal and whatever he steals, and he steals professionally, and the village is in on it — every door up that lane has something for him. I have given up.',
  'He does the gate. Carts, gulls, the wind. He has never lost, because nothing that comes up that lane has ever wanted the yard, but try telling him that.',
  'And yes, he is that colour. He sleeps against whichever vat is warm and it takes a month to come off him. Somebody asked me last spring what breed goes green. I said it is a rare one.',
]);

// ---------------------------------------------------------------------------
// What she says
// ---------------------------------------------------------------------------
const FIRST = freeze([
  'She looks up from a vat of something so pink it seems to hum.',
  'Oh. A visitor. That’s nice. You’ll probably leave. But it’s nice.',
  'Brandy Frank. I dye things. Cloth, mostly. My hands, usually. Once a goat, but the goat asked.',
  'People say my colours are the brightest in Drent. I suppose somebody has to be. It might as well be the one who feels the worst about it.',
]);
const AGAIN = freeze([
  'Oh. You came back. People do that. I never know why.',
  'Hello. I was just having a small sad. It’s passing. Most of them do.',
  'You look well. That’s nice. One of us should.',
  'Oh, it’s you. Good. I’d have been disappointed if it was somebody else, and I’m disappointed enough already.',
]);
const HOW = freeze([
  ['Oh, you know. Mostly fine. A bit grey around the edges.', 'Which is funny, because I’m the only thing in Drent that isn’t.'],
  ['The sun came out this morning. I’m sure it will stop.'],
  ['Better, now somebody asked. Not a lot better. But the kind that counts.'],
  ['I dreamt I was a rainbow and nobody looked up. Then I woke up and it was Tuesday. So, about the same.'],
]);
const TALK = freeze({
  colours: [
    'Bramble berries for the purples. Marn’s ferns for a green nobody else can get. Mushrooms for the oranges, lichen for yellow, and the blues come off the boats from somewhere hot.',
    'The pink I can’t explain. I just have a bad afternoon, and there it is in the vat, glowing at me.',
  ],
  boards: [
    'The animals, the way they ought to be. A leopard, but rainbow. A dolphin, pink, jumping a rainbow, because why wouldn’t it. A little bear in a heart, with a star on its nose.',
    'A unicorn, because Drent hasn’t got one and somebody should. Two kittens in a teacup. A panda with a lollipop, which is a bear as well, technically, so I’m allowed.',
    'And the houses, the way they ought to be. Tidehaven, pink, with a rainbow for a roof. Lysa’s bakery, if it were made of cake, which she says would be unhygienic. A birdhouse for a bird that deserves one. I cut those boards like houses so the pictures would feel at home.',
    'Nobody’s ever seen any of them. I have. On the bad days, mostly. The bad days have the best animals.',
  ],
  loved: [
    'Do they? They keep coming by. I assumed they were lost.',
    'Tobin brings me fish. Lysa brings me cakes. Eren brings me his undershirts and asks for them in “something cheerful, under the armour, where nobody will know”. I know. I’m not cheerful. I’m just very good at it.',
  ],
  looks: [
    'What does a dyer look like? Stained, I suppose. Look at my fingers.',
    'People tell me I’m ordinary looking. Other people tell me other things. I don’t really listen to either. It’s all just weather.',
  ],
});
const RIBBON = freeze([
  'She fishes in her apron and comes out with a ribbon dyed in every colour she has, one after another, the way nothing in nature would dare.',
  'Here. It won’t fix anything. But it’s very bright, and some days that’s nearly the same thing.',
]);

/** `state` is her module; `act` runs 'brandy-meet' and 'brandy-ribbon' in the host. */
export function brandyConversation(npc, context) {
  const { brandy, random = Math.random, openDialogue, closeDialogue, act } = context;
  if (npc.id !== BRANDY.id) return false;
  const again = () => brandyConversation(npc, { ...context, back: true });
  const talk = lines => openDialogue(npc, [...lines], null, 'Back to Brandy', { onComplete: again });
  const first = !brandy.met;
  if (first) act('brandy-meet');
  const opening = first ? [...FIRST] : context.back ? ['Anything else? No rush. Nothing here is going anywhere. Least of all me.'] : [AGAIN[brandy.visits % AGAIN.length]];
  openDialogue(npc, opening, null, 'Back to the lane', { choices: [
    { id: 'brandy-how', label: 'How are you, Brandy?', action: () => talk(HOW[Math.floor(random() * HOW.length)]) },
    { id: 'brandy-colours', label: 'Where do the colours come from?', action: () => talk(TALK.colours) },
    // The one subject she is not mildly sorry about (src/bosco.js).
    { id: 'brandy-bosco', label: 'Whose dog is this?', action: () => talk(BRANDY_ON_BOSCO) },
    { id: 'brandy-boards', label: 'What are those paintings?', action: () => talk(TALK.boards) },
    { id: 'brandy-loved', label: 'Everybody in the village seems to love you.', action: () => talk(TALK.loved) },
    { id: 'brandy-looks', label: 'You don’t look much like a dyer.', action: () => talk(TALK.looks) },
    ...(brandy.ribbon ? [] : [{ id: 'brandy-ribbon', label: 'Could you dye something for me?', action: () => { closeDialogue(); act('brandy-ribbon'); } }]),
    { id: 'leave-brandy', label: 'Take care, Brandy.', action: closeDialogue },
  ] });
  return true;
}
export const brandyRibbonLines = () => [...RIBBON];

// ---------------------------------------------------------------------------
// What she remembers
// ---------------------------------------------------------------------------
export function validateBrandySnapshot(data, { allowMissing = true } = {}) {
  if (data === undefined) return allowMissing;
  if (!data || typeof data !== 'object' || Array.isArray(data) || data.version !== 1) return false;
  if (typeof data.met !== 'boolean' || typeof data.ribbon !== 'boolean' || !Number.isInteger(data.visits) || data.visits < 0 || data.visits > 1e6) return false;
  return data.met || (!data.ribbon && data.visits === 0);
}
export function createBrandy() {
  const state = { met: false, ribbon: false, visits: 0 };
  return {
    meet() { const first = !state.met; state.met = true; return { first }; },
    visit() { if (state.met) state.visits++; },
    giveRibbon() { if (state.ribbon || !state.met) return { ok: false }; state.ribbon = true; return { ok: true }; },
    snapshot: () => ({ version: 1, ...state }),
    restore(data) { Object.assign(state, { met: false, ribbon: false, visits: 0 }); if (!validateBrandySnapshot(data, { allowMissing: false })) return false; Object.assign(state, { met: data.met, ribbon: data.ribbon, visits: data.visits }); return true; },
    get met() { return state.met; }, get ribbon() { return state.ribbon; }, get visits() { return state.visits; },
  };
}

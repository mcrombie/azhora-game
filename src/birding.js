/**
 * Birding, the first of the traveler's skills. Ansel, Tidehaven's bird-watcher,
 * teaches it; every kind of bird the traveler observes for the first time is
 * worth experience. Drent has five to start with: four about the village, and the
 * hummingbird, which comes only to the sugar-water feeder Ansel lends, Lysa fills
 * and the traveler hangs in his garden. Pure: no DOM, no three. The birds
 * themselves are drawn and moved by `src/drent-birds.js`.
 */
export const BIRDING_VERSION = 1;
export const BIRDING_SKILL = 'birding';
export const BIRDING_KEY = 'KeyB';
export const SKILLS_KEY = 'KeyK';

export const BIRD_WATCHER = Object.freeze({ id: 'bird-watcher', name: 'Ansel', role: 'Bird-watcher', modelRole: 'bird-watcher', color: 0x5d6a47 });

export const FEEDER_ITEM = 'hummingbird-feeder';
export const FILLED_FEEDER_ITEM = 'sugar-water-feeder';
export const FEEDER_STAGES = Object.freeze(['none', 'lent', 'filled', 'hung']);

const species = (id, entry) => Object.freeze({ id, ...entry });
export const BIRD_SPECIES = Object.freeze({
  cardinal: species('cardinal', {
    name: 'Cardinal', xp: 15, spook: 6.5,
    note: 'Red all over, with a pointed crest and a black mask around a thick orange bill. The hen is buff-brown with red in her crest, wings and tail. A pair keeps to the hedges and fences and is rarely far apart.',
    hint: 'A flash of red along the fences and the garden on the western side of the village.',
    lore: 'The red one is the cock. The brown one with red in her wings is his hen, and she sings as well as he does, which nobody believes until they hear her.',
  }),
  wren: species('wren', {
    name: 'Wren', xp: 20, spook: 5,
    note: 'Small and round, rusty brown above and warm buff below, with a long white stripe over the eye and a tail cocked straight up. A song far too loud for the size of it.',
    hint: 'Something small and very loud on the barrels behind the cottages east of the square.',
    lore: 'The wren sings as if it owns the village. It owns the barrels, at least. It will nest in a hat if you leave one on a peg.',
  }),
  titmouse: species('titmouse', {
    name: 'Titmouse', xp: 15, spook: 5.5,
    note: 'Soft grey above and pale below, with peach along the flanks, a pointed grey crest, a black spot above a stubby bill, and big dark eyes.',
    hint: 'A grey bird with a crest, calling where the village meets the woods along the eastern fence.',
    lore: 'Titmice call the same two notes over and over, and they are the first to scold an owl. Where you find one, you usually find a few.',
  }),
  crow: species('crow', {
    name: 'Crow', xp: 10, spook: 10,
    note: 'Black from bill to feet, big, with a heavy bill. Crows walk rather than hop, work a field together and keep one of their number looking up.',
    hint: 'Black birds walking the field behind the western cottages.',
    lore: 'Crows know faces. Be civil to them. Tobin shouted at one once, and they still follow him down to the boats.',
  }),
  hummingbird: species('hummingbird', {
    name: 'Hummingbird', xp: 30, spook: 3,
    note: 'Hardly longer than a thumb: a green back, a pale belly and a bill like a needle. The cock has a throat that flashes ruby when the light catches it. It hovers at a flower as if hung on a thread.',
    hint: 'Ansel says they come only to flowers and to sugar water.',
    lore: 'They come a long way to get here and they will fight anything for a feeder, even each other. Mostly each other.',
  }),
});

/** The birds of Drent in the order the journal lists them. */
export const DRENT_BIRDS = Object.freeze(['cardinal', 'wren', 'titmouse', 'crow', 'hummingbird']);
const WILD = DRENT_BIRDS.filter(id => id !== 'hummingbird');

/** How far off a bird can be observed; practice lets the traveler see well from farther away. */
export const observeRange = level => Math.min(30, 18 + 2 * Math.max(0, (Number(level) || 1) - 1));

export const BIRDING_LESSON = Object.freeze([
  'Find a bird, then stop before it minds you. Every kind has its own distance: a crow will not let you near, and a hummingbird hardly cares.',
  'When you have it in view and it is sitting still, press B and look at it properly: the shape, the bill, what it is doing. The first time you really see a kind of bird, you do not forget it.',
  'Four to start with, all close by: the cardinals along the western fences, the wren on the barrels behind the cottages east of the square, titmice on the eastern fence where the woods begin, and the crows in the field behind the western cottages. Your journal keeps your birds. K opens it.',
]);

export function validateBirdingSnapshot(data, { allowMissing = true } = {}) {
  if (data === undefined) return allowMissing;
  if (!data || typeof data !== 'object' || Array.isArray(data) || data.version !== BIRDING_VERSION) return false;
  if (typeof data.met !== 'boolean' || !FEEDER_STAGES.includes(data.feeder)) return false;
  if (!data.seen || typeof data.seen !== 'object' || Array.isArray(data.seen)) return false;
  return Object.entries(data.seen).every(([id, count]) => Object.hasOwn(BIRD_SPECIES, id) && Number.isInteger(count) && count >= 1 && count <= 1e6);
}

export function createBirding({ skills, onEvent = () => {} } = {}) {
  const state = { met: false, seen: {}, feeder: 'none' };

  function meet() {
    const first = !state.met;
    state.met = true;
    const learned = skills?.learn?.(BIRDING_SKILL) ?? { ok: false };
    if (first) onEvent({ type: 'birding-learned' });
    return { ok: true, first, ...learned };
  }

  /** The traveler has looked properly at a bird of kind `id`. */
  function observe(id) {
    if (!state.met) return { ok: false, reason: 'You do not yet know what to look for. Ansel in Tidehaven does.' };
    const bird = BIRD_SPECIES[id];
    if (!bird) return { ok: false, reason: 'That is not a bird anyone here can name.' };
    const first = !state.seen[id];
    state.seen[id] = (state.seen[id] ?? 0) + 1;
    const gained = first ? skills?.gain?.(BIRDING_SKILL, bird.xp) ?? { ok: false } : null;
    const level = skills?.level?.(BIRDING_SKILL) ?? 1;
    onEvent({ type: 'bird-observed', id, first });
    return { ok: true, first, species: bird, count: state.seen[id], xp: first ? bird.xp : 0, level, levelled: !!gained?.levelled };
  }

  function lendFeeder(inventory) {
    if (!state.met) return { ok: false, reason: 'Ansel has not met you yet.' };
    if (state.feeder !== 'none') return { ok: false, reason: 'Ansel has already lent you his feeder.' };
    if (!inventory?.add?.(FEEDER_ITEM, 1)) return { ok: false, reason: 'There is no room in your satchel for the feeder.' };
    state.feeder = 'lent';
    return { ok: true, reason: '' };
  }

  /** Lysa fills the feeder with sugar water. Atomic: the empty one is only taken if the full one fits. */
  function fillFeeder(inventory) {
    if (state.feeder !== 'lent' || !inventory?.has?.(FEEDER_ITEM)) return { ok: false, reason: 'You have no empty feeder to fill.' };
    if (!inventory.remove(FEEDER_ITEM, 1)) return { ok: false, reason: 'You have no empty feeder to fill.' };
    if (!inventory.add(FILLED_FEEDER_ITEM, 1)) { inventory.add(FEEDER_ITEM, 1); return { ok: false, reason: 'There is no room in your satchel.' }; }
    state.feeder = 'filled';
    return { ok: true, reason: '' };
  }

  function hangFeeder(inventory) {
    if (state.feeder !== 'filled' || !inventory?.has?.(FILLED_FEEDER_ITEM)) return { ok: false, reason: 'You need the feeder filled with sugar water first. Lysa keeps the sugar.' };
    if (!inventory.remove(FILLED_FEEDER_ITEM, 1)) return { ok: false, reason: 'You need the filled feeder.' };
    state.feeder = 'hung';
    return { ok: true, reason: '' };
  }

  const seenCount = () => Object.keys(state.seen).length;

  /** The feeder errand while it is under way: what the side-quest banner says, and where it points. */
  function task() {
    if (!state.met || state.feeder === 'none' || state.seen.hummingbird) return null;
    const title = 'Ansel’s hummingbirds';
    if (state.feeder === 'lent') return { title, stage: 'lent', target: 'acorn-cook', detail: 'Take Ansel’s feeder to Lysa at her kitchen. She keeps the sugar.' };
    if (state.feeder === 'filled') return { title, stage: 'filled', target: 'feeder-hook', detail: 'Hang the filled feeder on the hook by the red flowers in Ansel’s garden.' };
    return { title, stage: 'hung', target: 'feeder-hook', detail: 'Stand back from the feeder and wait. Press B when the hummingbird is hovering.' };
  }

  function view() {
    return {
      met: state.met, feeder: state.feeder, seenCount: seenCount(), total: DRENT_BIRDS.length,
      entries: DRENT_BIRDS.map(id => ({ id, seen: !!state.seen[id], count: state.seen[id] ?? 0, name: state.seen[id] ? BIRD_SPECIES[id].name : 'An unknown bird',
        detail: state.seen[id] ? BIRD_SPECIES[id].note : state.met ? BIRD_SPECIES[id].hint : 'Ansel, by the garden on the eastern side of Tidehaven, knows what lives here.' })),
      task: task(),
    };
  }

  function snapshot() { return { version: BIRDING_VERSION, met: state.met, seen: { ...state.seen }, feeder: state.feeder }; }

  function restore(data) {
    state.met = false; state.seen = {}; state.feeder = 'none';
    if (!validateBirdingSnapshot(data, { allowMissing: false })) return false;
    state.met = data.met; state.seen = { ...data.seen }; state.feeder = data.feeder;
    return true;
  }

  return {
    meet, observe, lendFeeder, fillFeeder, hangFeeder, task, view, snapshot, restore,
    get met() { return state.met; }, get feeder() { return state.feeder; }, get seen() { return { ...state.seen }; },
    hasSeen: id => !!state.seen[id], seenCount,
  };
}

/** Ansel's conversation. `act` runs 'learn-birding' and 'take-feeder' in the host. */
export function birdWatcherConversation(npc, context) {
  const { birding, openDialogue, closeDialogue, act } = context;
  if (npc.id !== BIRD_WATCHER.id) return false;
  const again = () => birdWatcherConversation(npc, context);
  const leave = { id: 'leave-bird-watcher', label: birding.met ? 'Good watching.' : 'Another time.', action: closeDialogue };
  if (!birding.met) {
    openDialogue(npc, [
      'Slowly. Slowly. There, you have not flushed it. That was the wren on the barrels behind you, and now it is looking at you instead of singing.',
      'Ansel. I watch birds. The village thinks that means I stand about. It means I stand about with my eyes open.',
      'You have the look of someone who walks a long way. You will pass more birds in a month than most people here see in their lives. Would you like to know how to see them?',
    ], null, 'Back to the road', { choices: [
      { id: 'learn-birding', label: 'Show me.', action: () => { closeDialogue(); act('learn-birding'); } },
      leave,
    ] });
    return true;
  }
  const wildSeen = WILD.filter(id => birding.hasSeen(id)).length, hummingbird = birding.hasSeen('hummingbird');
  const line = hummingbird ? 'You saw the hummingbird. Did the throat catch the light? Then it was a cock. I have been watching that one all summer.'
    : birding.feeder === 'hung' ? 'The feeder is out. Stand back from it, keep still, and watch for something like a big bee that stops in the air.'
    : birding.feeder === 'filled' ? 'Lysa filled it? Good. Hang it on the hook by the red flowers, then step back and give them room.'
    : birding.feeder === 'lent' ? 'Lysa has the sugar. Four parts water to one of sugar, boiled and cooled. Not honey. Honey spoils in the sun and sickens them.'
    : wildSeen === WILD.length ? 'All four about the village already. You have better eyes than half the people who live here.'
    : wildSeen ? `${wildSeen} of the four about the village so far. Keep your distance and keep looking.`
    : 'Found anything yet? Stop before they mind you, and press B when one is sitting still.';
  const seen = DRENT_BIRDS.filter(id => birding.hasSeen(id));
  const choices = [
    { id: 'birding-hints', label: 'What should I look for?', action: () => {
      const unseen = DRENT_BIRDS.filter(id => !birding.hasSeen(id) && (id !== 'hummingbird' || birding.feeder === 'none'));
      openDialogue(npc, unseen.length ? unseen.map(id => BIRD_SPECIES[id].hint) : ['You have every bird that comes to Tidehaven. Drent has more than these five, and the rest of the world has a great many more. Tell me what you find.'],
        null, 'Back to our conversation', { onComplete: again });
    } },
    ...(seen.length ? [{ id: 'birding-lore', label: 'Tell me about the birds I have seen.', action: () => openDialogue(npc, seen.map(id => BIRD_SPECIES[id].lore), null, 'Back to our conversation', { onComplete: again }) }] : []),
    ...(birding.feeder === 'none' ? [{ id: 'ask-hummingbirds', label: 'Is there anything harder to see?', action: () => openDialogue(npc, [
      'Hummingbirds. Green, smaller than your thumb, and they do not come to seed like the others. Flowers, and sugar water.',
      'I have an old feeder, a glass bottle with a red cap. Take it to Lysa; she keeps sugar for her cakes. Four parts water to one of sugar, boiled and cooled. Not honey. Honey spoils in the sun and sickens them.',
      'Then hang it on the hook by the red flowers in my garden and wait. They are bold little things, but not that bold.',
    ], null, 'Back to our conversation', { choices: [
      { id: 'take-feeder', label: 'I will take the feeder to Lysa.', action: () => { closeDialogue(); act('take-feeder'); } },
      { id: 'decline-feeder', label: 'Maybe later.', action: again },
    ] }) }] : []),
    { id: 'birding-lesson', label: 'Tell me again how it is done.', action: () => openDialogue(npc, [...BIRDING_LESSON], null, 'Back to our conversation', { onComplete: again }) },
    leave,
  ];
  openDialogue(npc, [line], null, 'Back to the road', { choices });
  return true;
}

/** Lysa's part in the errand: a choice to add to her conversation while the traveler carries the empty feeder. */
export function lysaFeederChoice(npc, { birding, inventory, openDialogue, act, back }) {
  if (birding.feeder !== 'lent' || !inventory?.has?.(FEEDER_ITEM)) return null;
  return { id: 'fill-feeder', label: 'Ansel says you keep sugar. Could you fill his feeder?', action: () => {
    const result = act('fill-feeder');
    openDialogue(npc, result?.ok ? [
      'Ansel’s old bottle! He has asked me twice this summer and forgotten it both times.',
      'Four of water to one of sugar, boiled and cooled. He will have told you that, and he will have told you not honey. There. Carry it upright, or the wasps will follow you all the way back to him.',
    ] : [result?.reason || 'Not just now.'], null, 'Back to our conversation', { onComplete: back });
  } };
}

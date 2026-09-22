/**
 * Mycology, the traveler's third skill. Odger Pell keeps a drying rack at Fernway Rest,
 * where the woodland paths meet, and will teach anyone who stops: what grows on a stump and
 * what grows from a root, which of them is supper and which of them will kill you by Thursday.
 *
 * He used to stand a few steps outside Tidehaven, which put seven of Drent's teachers within a
 * hundred metres of the pier. Mushrooms want old damp wood, and Fern Hollow behind the Rest is
 * the dampest ground in Drent's forest; a rack is a rack, and he put his where the paths cross
 * because that is where people with baskets pass (docs/drent-long-road.md §4).
 *
 * The mushrooms are the mushrooms of the country the game is drawn from — the
 * oak-hickory woods, floodplains and old pastures between two great rivers — with
 * plain names, as the birds and the fish have: a chanterelle, a morel, a puffball.
 * Two of them are worth knowing for the wrong reason: the jack-o'-lantern that
 * grows where a chanterelle should, and the white amanita that has no antidote.
 * Pure: no DOM, no three.
 */
export const MYCOLOGY_VERSION = 1;
export const MYCOLOGY_SKILL = 'mycology';
export const MUSHROOM_ITEM = 'mushrooms';

export const MYCOLOGIST = Object.freeze({
  id: 'mycologist', name: 'Odger Pell', role: 'Mushroom man of Fernway Rest',
  modelRole: 'forest-woodcutter', color: 0x7a6a45,
});

/**
 * His stand, on the bench side of Fernway Rest rather than beside the cairn.
 *
 * The cairn is 4.3 m from the centre of the pileated woodpecker's home ground (`BIRD_HABITATS`,
 * src/drent-birds.js), and a stand takes a bird's perches away; it is also 2.8 m from the road's
 * centreline, inside the 4.6 m the company walks in. This spot is 7.4 m from the cairn, 5.5 m
 * from the road and 2.3 m clear of the bird, and was measured against the built ground rather
 * than chosen (docs/drent-long-road-probe.md §1). He faces the cairn and the road behind it.
 */
export const MYCOLOGIST_STAND = Object.freeze({ x: -128.4, z: 39.6, yaw: 3.07 });

const kind = (id, entry) => Object.freeze({ id, ...entry });

/** `habitat` is where it grows, which is where the woods put it. */
export const MUSHROOM_SPECIES = Object.freeze({
  puffball: kind('puffball', {
    name: 'Puffball', xp: 10, edible: true, habitat: 'grass',
    note: 'A white ball in the grass, firm as a loaf and white all through when you cut it. Older ones go to brown smoke at a kick.',
    lore: 'Cut every one open before it goes in the pan. White all through and it is supper; anything else and it is not.',
  }),
  'turkey-tail': kind('turkey-tail', {
    name: 'Turkey tail', xp: 10, edible: false, habitat: 'log',
    note: 'Thin banded brackets in rosettes on fallen wood, ringed brown and grey and green like a fanned tail.',
    lore: 'Too tough to eat and worth picking anyway. Pell boils it for a tea he swears by and nobody else drinks.',
  }),
  oyster: kind('oyster', {
    name: 'Oyster mushroom', xp: 15, edible: true, habitat: 'log',
    note: 'Pale shelves stepped up a dead trunk, gills running down a stubby off-centre stem.',
    lore: 'They come on dead hardwood in any month that is not baking. The trick is finding the tree before somebody else does.',
  }),
  'jack-o-lantern': kind('jack-o-lantern', {
    name: 'Jack-o’-lantern', xp: 15, edible: false, warning: true, habitat: 'stump',
    note: 'Orange the whole way through, growing in a crowded clump from wood, with true crowded gills — not the blunt folds of a chanterelle.',
    lore: 'This is the one that puts people to bed for two days. It grows on wood in a bunch; a chanterelle grows from the ground alone. Learn that and you will not be sorry.',
  }),
  chanterelle: kind('chanterelle', {
    name: 'Chanterelle', xp: 20, edible: true, habitat: 'oak',
    note: 'Egg-yellow, growing singly from the soil under oaks, with blunt folds running down the stem and a smell like apricots.',
    lore: 'From the ground, never from wood. Folds, not gills. Smell it: apricots. Three tests and you will never eat the wrong one.',
  }),
  'chicken-of-the-woods': kind('chicken-of-the-woods', {
    name: 'Chicken of the woods', xp: 20, edible: true, habitat: 'stump',
    note: 'Overlapping orange shelves with sulphur-yellow edges, soft as a cushion when young and wooden by the week after.',
    lore: 'Take the young edges and leave the rest. Off an oak it is good; off some other trees it disagrees with people.',
  }),
  'hen-of-the-woods': kind('hen-of-the-woods', {
    name: 'Hen of the woods', xp: 25, edible: true, habitat: 'oak',
    note: 'A grey-brown clump of ruffled tongues at the foot of an old oak, big as a hen sitting, and back in the same place every autumn.',
    lore: 'Mark the tree. She comes back to the same root every year and tells nobody but you.',
  }),
  'lions-mane': kind('lions-mane', {
    name: 'Lion’s mane', xp: 25, edible: true, habitat: 'log',
    note: 'A white cascade of soft spines hanging out of a wound in a standing hardwood, like something the tree is growing a beard for.',
    lore: 'Cooked slowly it goes like crab meat. Nothing else in the wood looks remotely like it, which is a mercy.',
  }),
  morel: kind('morel', {
    name: 'Morel', xp: 30, edible: true, habitat: 'floodplain',
    note: 'A honeycombed cap, pitted and ridged, hollow the whole way down when you halve it, standing in leaf litter under old poplars in spring.',
    lore: 'Hollow the whole way down, cap joined to the stem. If it is cottony inside, it is not a morel and you are not eating it.',
  }),
  'black-trumpet': kind('black-trumpet', {
    name: 'Black trumpet', xp: 30, edible: true, habitat: 'mossy',
    note: 'Little grey-black horns in the moss on a shaded slope, so nearly invisible that finding one means kneeling and finding forty.',
    lore: 'You do not see them, you see the hole where the leaf litter is not. Then you see nothing else all afternoon.',
  }),
  'destroying-angel': kind('destroying-angel', {
    name: 'Destroying angel', xp: 25, edible: false, warning: true, habitat: 'oak',
    note: 'Wholly white — cap, gills and stem — with a skirt on the stem and a cup at the base where it came out of the ground.',
    lore: 'There is no cure and it waits a day before it starts. Skirt, cup, white gills. Look, and put your hands in your pockets.',
  }),
});

export const MUSHROOM_IDS = Object.freeze(Object.keys(MUSHROOM_SPECIES));
export const mushroom = id => MUSHROOM_SPECIES[id] ?? null;
export const EDIBLE_IDS = Object.freeze(MUSHROOM_IDS.filter(id => MUSHROOM_SPECIES[id].edible));

export const MYCOLOGY_LESSON = Object.freeze([
  'Three questions, always, and in this order. What is it growing out of — wood or ground? What is under the cap — gills, folds, spines, pores? And what does it smell of, if you have the nerve to put your nose in it?',
  'Answer those and most of this wood is supper. Miss them and the wood answers back. The orange bunch on a stump is not a chanterelle, whatever it looks like from standing height, and anything wholly white with a skirt and a cup you leave exactly where it is.',
  'Go and look. Press F where you find one and I will have taught you enough to know it again. What is good goes in your satchel; what is not goes in your head.',
]);

export function validateMycologySnapshot(data, { allowMissing = true } = {}) {
  if (data === undefined) return allowMissing;
  if (!data || typeof data !== 'object' || Array.isArray(data) || data.version !== MYCOLOGY_VERSION) return false;
  if (typeof data.met !== 'boolean' || !data.found || typeof data.found !== 'object' || Array.isArray(data.found)) return false;
  return Object.entries(data.found).every(([id, count]) => Object.hasOwn(MUSHROOM_SPECIES, id) && Number.isInteger(count) && count >= 1 && count <= 1e6);
}

export function createMycology({ skills, onEvent = () => {} } = {}) {
  const state = { met: false, found: {} };

  function meet() {
    const first = !state.met;
    state.met = true;
    const learned = skills?.learn?.(MYCOLOGY_SKILL) ?? { ok: false };
    if (first) onEvent({ type: 'mycology-learned' });
    // `first` last: this is the teacher's own first time, not the skill's (src/skills.js).
    return { ok: true, ...learned, first };
  }

  /**
   * The traveler has found one and looked at it properly. Edible kinds go into
   * the satchel; the other two are noted and left standing.
   */
  function find(id, inventory = null) {
    // The user's ruling of 21 September 2026: no introduction is needed to do a thing. The
    // teacher is still worth meeting; he is no longer the door.
    const species = MUSHROOM_SPECIES[id];
    if (!species) return { ok: false, reason: 'That is not a mushroom anyone here can name.' };
    const first = !state.found[id];
    state.found[id] = (state.found[id] ?? 0) + 1;
    const gained = first ? skills?.gain?.(MYCOLOGY_SKILL, species.xp) ?? { ok: false } : null;
    const taken = species.edible ? !!inventory?.add?.(MUSHROOM_ITEM, 1) : false;
    onEvent({ type: 'mushroom-found', id, first, taken });
    return { ok: true, first, species, taken, count: state.found[id], xp: first ? species.xp : 0,
      level: skills?.level?.(MYCOLOGY_SKILL) ?? 1, levelled: !!gained?.levelled };
  }

  const foundCount = () => Object.keys(state.found).length;

  function view() {
    return {
      met: state.met, foundCount: foundCount(), total: MUSHROOM_IDS.length,
      entries: MUSHROOM_IDS.map(id => ({ id, found: !!state.found[id], count: state.found[id] ?? 0,
        edible: MUSHROOM_SPECIES[id].edible, warning: !!MUSHROOM_SPECIES[id].warning,
        name: state.found[id] ? MUSHROOM_SPECIES[id].name : 'A mushroom you have not named',
        detail: state.found[id] ? MUSHROOM_SPECIES[id].note
          : state.met ? `Grows on ${MUSHROOM_SPECIES[id].habitat === 'grass' ? 'open grass' : MUSHROOM_SPECIES[id].habitat === 'oak' ? 'the ground under oaks' : MUSHROOM_SPECIES[id].habitat}.`
          : 'Odger Pell keeps a drying rack at Fernway Rest, where the woodland paths meet.' })),
    };
  }

  function snapshot() { return { version: MYCOLOGY_VERSION, met: state.met, found: { ...state.found } }; }

  function restore(data) {
    state.met = false; state.found = {};
    if (!validateMycologySnapshot(data, { allowMissing: false })) return false;
    state.met = data.met; state.found = { ...data.found };
    return true;
  }

  return { meet, find, view, snapshot, restore, foundCount,
    get met() { return state.met; }, get found() { return { ...state.found }; },
    hasFound: id => !!state.found[id] };
}

/** Odger Pell's conversation. `act` runs 'learn-mycology' in the host. */
export function mycologistConversation(npc, context) {
  const { mycology, openDialogue, closeDialogue, act } = context;
  if (npc.id !== MYCOLOGIST.id) return false;
  const again = () => mycologistConversation(npc, context);
  const leave = { id: 'leave-mycologist', label: mycology.met ? 'Good hunting.' : 'Another time.', action: closeDialogue };
  if (!mycology.met) {
    openDialogue(npc, [
      'Ha! Mind your boot — no, too late, and it was a good one too. Never mind, there are forty more where that came from and they are all under your feet.',
      'Odger Pell. I dry mushrooms, I sell mushrooms, and I have eaten every mushroom in this wood that can be eaten, which is how I know which ones cannot.',
      'You are going a long way on those legs and you will be hungry on most of it. Shall I teach you what is worth kneeling down for?',
    ], null, 'Back to the road', { choices: [
      { id: 'learn-mycology', label: 'Teach me.', action: () => { closeDialogue(); act('learn-mycology'); } },
      leave,
    ] });
    return true;
  }
  const found = MUSHROOM_IDS.filter(id => mycology.hasFound(id));
  const view = mycology.view();
  const line = view.foundCount === view.total
    ? 'Every one of them. You have knelt in more mud than most people my age, and I am the judge of that.'
    : view.foundCount ? `${view.foundCount} of them named and in your head. The wood keeps the rest where it always does.`
    : 'Nothing yet? Look at what a thing is growing out of before you look at the thing. Wood or ground. It is always wood or ground.';
  const choices = [
    { id: 'mycology-hints', label: 'What should I be looking for?', action: () => {
      const missing = MUSHROOM_IDS.filter(id => !mycology.hasFound(id));
      openDialogue(npc, missing.length ? missing.slice(0, 4).map(id => `${MUSHROOM_SPECIES[id].name}: ${MUSHROOM_SPECIES[id].lore}`)
        : ['You have the lot. Go and find me something new in a country I have never walked, and come back and tell me about it.'],
        null, 'Back to our conversation', { onComplete: again });
    } },
    ...(found.length ? [{ id: 'mycology-lore', label: 'Tell me about what I have found.', action: () => openDialogue(npc,
      found.map(id => `${MUSHROOM_SPECIES[id].name}: ${MUSHROOM_SPECIES[id].lore}`), null, 'Back to our conversation', { onComplete: again }) }] : []),
    { id: 'mycology-danger', label: 'Which ones will kill me?', action: () => openDialogue(npc, [
      'Two you need, and one of them will only ruin a week. The orange bunch on a stump, growing in a crowd out of wood: that is the jack-o’-lantern, and it is not a chanterelle whatever your hunger says.',
      'The other is white. Wholly white, cap and gills and stem, with a skirt hung on the stem and a cup at the foot where it came out of the ground. There is nothing to be done for anyone who eats it, and it waits a day before it tells them.',
    ], null, 'Back to our conversation', { onComplete: again }) },
    { id: 'mycology-lesson', label: 'Tell me again how it is done.', action: () => openDialogue(npc, [...MYCOLOGY_LESSON], null, 'Back to our conversation', { onComplete: again }) },
    leave,
  ];
  openDialogue(npc, [line], null, 'Back to the road', { choices });
  return true;
}

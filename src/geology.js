/**
 * Geology, the traveler's fifth skill. Silas Garrow digs marl out of the bank under the
 * Weatherhead and carts it up the road to the Avrel fields, which pay him by the load; he has
 * picked up every stone on this coast at least once, and he will teach anyone who stops how to
 * read one. He is found at the stream below the Toll House now, with the cart beside him. The
 * old pit is still his, and still where he sends you for the coastal stones.
 *
 * The stones are the stones of the country the game is drawn from: a tidewater
 * plain of sand, clay and shell laid down by old seas, cut by rivers that fall
 * off harder rock at a line of rapids further inland. Drent is the plain — the
 * shell beds, the fossil scallops and sharks' teeth that weather out of them,
 * the ironstone and the greensand, the white quartz cobbles the rivers carried
 * down. The Caloss crossing is where the hard country begins: granite in the
 * riverbed. Plain names, as the birds and the plants have.
 * Pure: no DOM, no three.
 */
export const GEOLOGY_VERSION = 1;
export const GEOLOGY_SKILL = 'geology';
export const SPECIMEN_ITEM = 'stone-specimens';

export const GEOLOGIST = Object.freeze({
  id: 'geologist', name: 'Silas Garrow', role: 'Marl-digger, at the Toll House stream',
  modelRole: 'bridge-keeper', color: 0x6a5d4c, skin: 0xcaa07a,
});

/**
 * Where he stands: the Toll House on the Caloss road, whose stream cut is a geologist's section
 * and whose furrows behind it hold the ironstone and the clay.
 *
 * He used to stand at the foot of the bank below the Weatherhead, a hundred metres from the
 * pier, which is where geology's first lesson was and where five other teachers were. The move
 * is the one thing in the long road that bends written lore, and the user ruled on it: the man
 * moves, the marl pit stays (docs/drent-long-road.md, the answers of 2026-09-20). Cabe Tolliver
 * keeps the Weatherhead and his pipe, and Silas sends you back down there for the shore stones.
 *
 * Not at the house's own centre, which is where the design put him: the toll house is a stone
 * box with walls, and a man there has no five clear metres to be talked to in. He stands at the
 * crossing stones instead, a metre off the stream, eight metres out from the house on the road
 * side, with the cart between him and anybody coming up from Tidehaven. Measured against the
 * built ground: 13 m off the road, inside the house's kept-clear disc, clear of the kingfisher.
 */
export const GEOLOGIST_STAND = Object.freeze({ x: -513.43, z: 94.15, yaw: -2.642 });

const kind = (id, entry) => Object.freeze({ id, ...entry });

/**
 * `setting` is where it is found. `keep` says whether it is worth a place in the
 * satchel as a specimen; the rest are looked at and left where they lie.
 */
export const ROCK_SPECIES = Object.freeze({
  quartz: kind('quartz', {
    name: 'Quartz cobble', xp: 10, setting: 'creek', keep: true,
    note: 'A white, glassy, rounded stone in the creek bed, heavier than it looks and too hard to scratch with a knife.',
    lore: 'Everything soft on its way down to the sea wore away and this did not. Every white stone in a Drent stream came a hundred miles to be there.',
  }),
  clay: kind('clay', {
    name: 'Brick clay', xp: 10, setting: 'field', keep: false,
    note: 'Red and grey clay in the cut of a field ditch, slick when wet and cracked into plates when dry.',
    lore: 'Every chimney in Tidehaven was a field once. Knead it, fire it hot, and it rings when you tap it.',
  }),
  ironstone: kind('ironstone', {
    name: 'Ironstone', xp: 15, setting: 'field', keep: true,
    note: 'Rusty brown lumps and crusts in the plough soil, heavy for their size, sometimes hollow and rattling when shaken.',
    lore: 'Bog iron. The old smelters dug it out of the wet ground and got nails out of it. Shake a hollow one: the rattle is clay that dried inside.',
  }),
  greensand: kind('greensand', {
    name: 'Greensand', xp: 15, setting: 'bank', keep: false,
    note: 'Dark green-black sand in a river bank, soft enough to crumble in the fingers, full of tiny green grains.',
    lore: 'The farmers spread it on worn-out tobacco ground to bring it back. It does, slowly. Half the old fields in Drent have been fed with this bank.',
  }),
  marl: kind('marl', {
    name: 'Shell marl', xp: 15, setting: 'bank', keep: false,
    note: 'A pale bed in the bank packed with broken shells, crumbly, and fizzing if you drip vinegar on it.',
    lore: 'The sea was here, and left everything it had eaten. I dig it for the fields and sell what I find in it to anyone who will stand still long enough.',
  }),
  scallop: kind('scallop', {
    name: 'Fossil scallop', xp: 25, setting: 'bank', keep: true,
    note: 'A great ribbed scallop shell the size of a spread hand, turned to stone and weathered out of the shell bed whole.',
    lore: 'Older than any story. People carry one home as a lucky piece and I do not argue with them, because it has clearly been lucky for something.',
  }),
  'shark-tooth': kind('shark-tooth', {
    name: 'Shark’s tooth', xp: 25, setting: 'shore', keep: true,
    note: 'A black, glossy, three-sided tooth in the shingle at the foot of the bank, serrated along both edges.',
    lore: 'They wash out of the cliffs after every storm. Some are the length of your finger. The ones the length of your hand came off something you would not have wanted to meet in the water.',
  }),
  'petrified-wood': kind('petrified-wood', {
    name: 'Petrified wood', xp: 20, setting: 'creek', keep: true,
    note: 'A grey-brown stone with the grain and the rings of wood in it, split along the grain like a log, and ringing like stone.',
    lore: 'A tree that lay in the wet so long it forgot to be a tree. Hold it up to the light and count the years it did not know it was counting.',
  }),
  sandstone: kind('sandstone', {
    name: 'Riverbank sandstone', xp: 20, setting: 'ruin', keep: false,
    note: 'A soft, buff, even-grained stone that cuts clean with a saw and hardens in the air, in dressed blocks and in the ledges of a creek.',
    lore: 'Rena was built of it. So were half the fine houses of the old congress, and a great many other things that were cut down afterwards. It carves like cheese and lasts like a grudge.',
  }),
  granite: kind('granite', {
    name: 'Granite', xp: 25, setting: 'fall-line', keep: true,
    note: 'Grey speckled stone in the riverbed at the crossing — clear quartz, pale feldspar and black mica — rounded where the water runs over it.',
    lore: 'Where the rivers fall off the hard country into the soft, the granite comes up through the bed. That is why the Caloss is crossed where it is: the rock holds a bridge.',
  }),
  'arrowhead': kind('arrowhead', {
    name: 'Worked point', xp: 30, setting: 'field', keep: true, rare: true,
    note: 'A small leaf of grey-blue stone, flaked along both edges to a point, lying in the furrow after rain.',
    lore: 'Somebody made this, a very long time before anybody here. Put it in your pocket and think about that for a while. I always do.',
  }),
});

export const ROCK_IDS = Object.freeze(Object.keys(ROCK_SPECIES));
export const rock = id => ROCK_SPECIES[id] ?? null;
export const ROCK_SETTINGS = Object.freeze(['creek', 'field', 'bank', 'shore', 'ruin', 'fall-line']);

export const GEOLOGY_LESSON = Object.freeze([
  'Pick it up. Turn it over. Weigh it in your hand, because heavy for its size is the first thing a stone will tell you. Then scratch it — with a knife, with a nail, with another stone — and see who wins.',
  'Then ask where it is lying. This whole coast is the floor of a sea that went away: sand, clay and shell, and the bones of what lived in it. Anything hard you find here was carried down by a river from somewhere hard, and that is worth wondering about.',
  'Go and look. Press F where a stone catches your eye and I will have taught you enough to know it again. The good ones go in your satchel. The rest are too big, or too common, or too much a part of somewhere to take away.',
]);

export function validateGeologySnapshot(data, { allowMissing = true } = {}) {
  if (data === undefined) return allowMissing;
  if (!data || typeof data !== 'object' || Array.isArray(data) || data.version !== GEOLOGY_VERSION) return false;
  if (typeof data.met !== 'boolean' || !data.found || typeof data.found !== 'object' || Array.isArray(data.found)) return false;
  return Object.entries(data.found).every(([id, count]) => Object.hasOwn(ROCK_SPECIES, id) && Number.isInteger(count) && count >= 1 && count <= 1e6);
}

export function createGeology({ skills, onEvent = () => {} } = {}) {
  const state = { met: false, found: {} };

  function meet() {
    const first = !state.met;
    state.met = true;
    const learned = skills?.learn?.(GEOLOGY_SKILL) ?? { ok: false };
    if (first) onEvent({ type: 'geology-learned' });
    // `first` last: this is the teacher's own first time, not the skill's (src/skills.js).
    return { ok: true, ...learned, first };
  }

  /** A stone looked at properly. Good specimens go in the satchel; the rest stay where they lie. */
  function find(id, inventory = null) {
    // The user's ruling of 21 September 2026: no introduction is needed to do a thing. The
    // teacher is still worth meeting; he is no longer the door.
    const species = ROCK_SPECIES[id];
    if (!species) return { ok: false, reason: 'That is not a stone anyone here can name.' };
    const first = !state.found[id];
    state.found[id] = (state.found[id] ?? 0) + 1;
    const gained = first ? skills?.gain?.(GEOLOGY_SKILL, species.xp) ?? { ok: false } : null;
    const taken = species.keep ? !!inventory?.add?.(SPECIMEN_ITEM, 1) : false;
    onEvent({ type: 'rock-found', id, first, taken });
    return { ok: true, first, species, taken, count: state.found[id], xp: first ? species.xp : 0,
      level: skills?.level?.(GEOLOGY_SKILL) ?? 1, levelled: !!gained?.levelled };
  }

  const foundCount = () => Object.keys(state.found).length;
  const SETTING_WORDS = { creek: 'creek beds', field: 'ploughed fields and ditches', bank: 'river banks where the beds show',
    shore: 'the shingle under the bank', ruin: 'old dressed stone', 'fall-line': 'the riverbed at the Caloss crossing' };

  function view() {
    return {
      met: state.met, foundCount: foundCount(), total: ROCK_IDS.length,
      entries: ROCK_IDS.map(id => ({ id, found: !!state.found[id], count: state.found[id] ?? 0, keep: ROCK_SPECIES[id].keep,
        name: state.found[id] ? ROCK_SPECIES[id].name : 'A stone you have not named',
        detail: state.found[id] ? ROCK_SPECIES[id].note
          : state.met ? `Found in ${SETTING_WORDS[ROCK_SPECIES[id].setting]}.`
          : 'Mark teaches Geology by the village fire in Tidehaven. Silas Garrow also teaches at the Toll House stream on the Caloss road.' })),
    };
  }

  function snapshot() { return { version: GEOLOGY_VERSION, met: state.met, found: { ...state.found } }; }
  function restore(data) {
    state.met = false; state.found = {};
    if (!validateGeologySnapshot(data, { allowMissing: false })) return false;
    state.met = data.met; state.found = { ...data.found };
    return true;
  }

  return { meet, find, view, snapshot, restore, foundCount,
    get met() { return state.met; }, get found() { return { ...state.found }; },
    hasFound: id => !!state.found[id] };
}

/** Silas Garrow's conversation. `act` runs 'learn-geology' in the host. */
export function geologistConversation(npc, context) {
  const { geology, openDialogue, closeDialogue, act } = context;
  if (npc.id !== GEOLOGIST.id) return false;
  const again = () => geologistConversation(npc, context);
  const leave = { id: 'leave-geologist', label: geology.met ? 'I will keep looking down.' : 'Another time.', action: closeDialogue };
  if (!geology.met) {
    openDialogue(npc, [
      'Stand there a moment — no, there, off the bed. You are on a sea that dried up before anybody had a name for anything.',
      'Silas Garrow. I dig marl out of a bank down on the coast, under the Weatherhead, and I cart it up here because the Avrel families pay me by the load. While I dig I find things, and I have been finding things for fifty years and I am not bored yet.',
      'You look like somebody who kicks stones along the road. Shall I teach you to pick them up instead?',
    ], null, 'Back to the shore', { choices: [
      { id: 'learn-geology', label: 'Teach me.', action: () => { closeDialogue(); act('learn-geology'); } },
      leave,
    ] });
    return true;
  }
  const found = ROCK_IDS.filter(id => geology.hasFound(id));
  const view = geology.view();
  const line = view.foundCount === view.total
    ? 'The lot of them, and a worked point besides. There are men who have walked this coast their whole lives and never found one of those. Sit down, you have earned it.'
    : view.foundCount ? `${view.foundCount} of them named. The rest are lying where they always were, waiting for somebody to bend over.`
    : 'Nothing yet? Look down. The whole country is lying there under your boots, telling you what it used to be.';
  const choices = [
    { id: 'geology-hints', label: 'Where should I be looking?', action: () => {
      const missing = ROCK_IDS.filter(id => !geology.hasFound(id));
      openDialogue(npc, missing.length ? missing.slice(0, 4).map(id => `${ROCK_SPECIES[id].name}: ${ROCK_SPECIES[id].lore}`)
        : ['There is nothing on this coast I can show you now. Go inland, where the ground is hard and old, and bring me back something I have never seen.'],
        null, 'Back to our conversation', { onComplete: again });
    } },
    ...(found.length ? [{ id: 'geology-lore', label: 'Tell me about what I have found.', action: () => openDialogue(npc,
      found.map(id => `${ROCK_SPECIES[id].name}: ${ROCK_SPECIES[id].lore}`), null, 'Back to our conversation', { onComplete: again }) }] : []),
    { id: 'geology-country', label: 'What is this country made of?', action: () => openDialogue(npc, [
      'Soft things, mostly. Sand and clay and shell, laid down in a sea that came and went more times than anybody can count, one bed over the other like the pages of a book somebody left out in the rain.',
      'Go far enough west and the rivers come down off something harder in a run of rapids — the Caloss does it at the crossing, which is why the bridge is there. Past that line the country is granite and old rock folded like cloth. Everything hard you find on this side was carried down from there.',
    ], null, 'Back to our conversation', { onComplete: again }) },
    { id: 'geology-lesson', label: 'Tell me again how it is done.', action: () => openDialogue(npc, [...GEOLOGY_LESSON], null, 'Back to our conversation', { onComplete: again }) },
    leave,
  ];
  openDialogue(npc, [line], null, 'Back to the shore', { choices });
  return true;
}

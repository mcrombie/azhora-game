/**
 * Fishing, the traveler's second skill. The rod, the float and the bite are
 * campcraft's (`src/campcraft.js`); this is what comes up on the line, and what
 * the traveler learns from it. Every kind of fish caught for the first time is
 * worth experience, as every kind of bird seen for the first time is.
 *
 * The fish are the fish of the country the game is drawn from: the tidal rivers,
 * ponds and piedmont creeks between two great rivers. Plain names, as with the
 * birds — a bass, a catfish, a shad — and each water holds what it would hold:
 * sunfish and bass in a farm pond, catfish and shad in a big river, trout only
 * in cold water. Pure: no DOM, no three.
 */
export const FISHING_VERSION = 1;
export const FISHING_SKILL = 'fishing';

const fish = (id, entry) => Object.freeze({ id, ...entry });

/**
 * `waters` are the kinds of water a fish is found in, with the chance it takes
 * the hook there. Rarer fish are worth more and come up less often.
 */
export const FISH_SPECIES = Object.freeze({
  sunfish: fish('sunfish', {
    name: 'Sunfish', xp: 10, waters: { pond: 34, river: 14, 'cold-river': 10 },
    note: 'A hand-sized fish the colour of a bruised sunset, all belly and fins. The first fish anyone catches and the last one they boast about.',
    lore: 'Children catch them with a bent pin. There is no water in Drent without them.',
  }),
  bass: fish('bass', {
    name: 'Bass', xp: 15, waters: { pond: 26, river: 18, 'cold-river': 12 },
    note: 'Dark green over pale green, a mouth like a bucket, and a habit of going straight for the weeds the moment it feels the hook.',
    lore: 'They lie under the lily pads waiting for something stupid to swim past. A frog will do. So will a young duck.',
  }),
  perch: fish('perch', {
    name: 'Perch', xp: 15, waters: { river: 20, pond: 10, 'cold-river': 16 },
    note: 'Barred flanks and a spiny back, taken in numbers when they are taken at all: where there is one there are forty.',
    lore: 'They run in schools and they run to the same places every year. Ask anyone who fishes the crossing.',
  }),
  crappie: fish('crappie', {
    name: 'Crappie', xp: 15, waters: { pond: 16, river: 8 },
    note: 'A flat, speckled, papery-mouthed fish that hangs about sunken branches in shoals.',
    lore: 'Hook it too hard and the hook tears straight out. Fish for them gently or not at all.',
  }),
  pickerel: fish('pickerel', {
    name: 'Pickerel', xp: 20, waters: { pond: 10, river: 8 },
    note: 'A long green pike of a fish, chain-marked down its side, and teeth the whole way along a jaw that means it.',
    lore: 'It takes the fish you have already hooked, and then it takes your finger if you are careless getting the hook back.',
  }),
  catfish: fish('catfish', {
    name: 'Catfish', xp: 20, waters: { river: 20, pond: 6, 'cold-river': 8 },
    note: 'Whiskered, slab-sided and heavier than it looks, dragged up off the bottom in the slow water below a bend.',
    lore: 'The big ones live where the river is deepest and have done since before anybody here was born. Mind the spines.',
  }),
  eel: fish('eel', {
    name: 'Eel', xp: 20, waters: { river: 12, 'cold-river': 10, pond: 4 },
    note: 'A yard of muscle that knots itself round the line, the rod and your wrist, and is better eaten than described.',
    lore: 'They go down to the sea to breed and nobody has ever found where. Smoked, they are worth more than the fish that swim politely.',
  }),
  shad: fish('shad', {
    name: 'Shad', xp: 25, waters: { river: 12, 'cold-river': 8 },
    note: 'Silver, deep-bodied and full of bones, running up from the sea in spring in numbers that used to feed a whole valley.',
    lore: 'The run is an event, not a day’s fishing. When the shad come up, the villages come down to the water.',
  }),
  rockfish: fish('rockfish', {
    name: 'Rockfish', xp: 30, waters: { river: 6, 'cold-river': 4 },
    note: 'Striped along the flank, deep-shouldered, and strong enough that the rod does the arguing for a while.',
    lore: 'It comes up out of the tide in spring. Take a big one and you eat for three days, if the army does not hear about it.',
  }),
  trout: fish('trout', {
    name: 'Trout', xp: 30, waters: { 'cold-river': 32 },
    note: 'Speckled, quick, and only ever in cold clean water — the kind that runs off high ground and never warms.',
    lore: 'You will not find one south of the Tessen. Cold water and gravel, or nothing.',
  }),
});

export const FISH_IDS = Object.freeze(Object.keys(FISH_SPECIES));

/** The kind of water each fishing spot is, which decides what lives in it. */
export const SPOT_WATERS = Object.freeze({
  willowmere: 'pond',
  'avrel-pool': 'pond',
  'avrel-pool': 'pond',
  reedwater: 'river',
  'tessen-bank': 'cold-river',
});
export const waterOf = spotId => SPOT_WATERS[spotId] ?? 'river';

/** Everything that swims in a kind of water, with its weight, heaviest chance first. */
export function fishOf(water) {
  return FISH_IDS.map(id => ({ id, weight: FISH_SPECIES[id].waters[water] ?? 0 }))
    .filter(entry => entry.weight > 0)
    .sort((a, b) => b.weight - a.weight || a.id.localeCompare(b.id));
}

/** Which fish took the hook, for a roll in [0, 1). Deterministic: the host supplies the roll. */
export function fishFor(water, roll = Math.random()) {
  const pool = fishOf(water);
  if (!pool.length) return null;
  const total = pool.reduce((sum, entry) => sum + entry.weight, 0);
  let cut = Math.max(0, Math.min(.999999, roll)) * total;
  for (const entry of pool) { cut -= entry.weight; if (cut < 0) return FISH_SPECIES[entry.id]; }
  return FISH_SPECIES[pool[0].id];
}

export function validateFishingSnapshot(data, { allowMissing = true } = {}) {
  if (data === undefined) return allowMissing;
  if (!data || typeof data !== 'object' || Array.isArray(data) || data.version !== FISHING_VERSION) return false;
  if (typeof data.taught !== 'boolean' || !data.caught || typeof data.caught !== 'object' || Array.isArray(data.caught)) return false;
  return Object.entries(data.caught).every(([id, count]) => Object.hasOwn(FISH_SPECIES, id) && Number.isInteger(count) && count >= 1 && count <= 1e6);
}

export function createFishing({ skills, onEvent = () => {} } = {}) {
  const state = { taught: false, caught: {} };

  /** Teachers share the same introduction; a later outing preserves prior catches. */
  function learn() {
    const first = !state.taught;
    state.taught = true;
    const learned = skills?.learn?.(FISHING_SKILL) ?? { ok: false };
    if (first) onEvent({ type: 'fishing-learned' });
    // `first` last: this is the teacher's own first time, not the skill's (src/skills.js).
    return { ok: true, ...learned, first };
  }

  /** A fish on the line at `spotId`. Returns what it was and what it taught. */
  function land(spotId, roll = Math.random()) {
    const species = fishFor(waterOf(spotId), roll);
    if (!species) return { ok: false, reason: 'Nothing lives in that water.' };
    if (!state.taught) learn();
    const first = !state.caught[species.id];
    state.caught[species.id] = (state.caught[species.id] ?? 0) + 1;
    const gained = first ? skills?.gain?.(FISHING_SKILL, species.xp) ?? { ok: false } : null;
    onEvent({ type: 'fish-landed', id: species.id, first });
    return { ok: true, first, species, count: state.caught[species.id], xp: first ? species.xp : 0,
      level: skills?.level?.(FISHING_SKILL) ?? 1, levelled: !!gained?.levelled };
  }

  const caughtCount = () => Object.keys(state.caught).length;

  function view() {
    return {
      taught: state.taught, caughtCount: caughtCount(), total: FISH_IDS.length,
      entries: FISH_IDS.map(id => ({ id, caught: !!state.caught[id], count: state.caught[id] ?? 0,
        name: state.caught[id] ? FISH_SPECIES[id].name : 'A fish you have not landed',
        detail: state.caught[id] ? FISH_SPECIES[id].note
          : state.taught ? `Found in ${Object.keys(FISH_SPECIES[id].waters).map(water => water.replace('-', ' ')).join(', ')} water.`
          : 'Ask Glun, Mark or Jean for a Willowmere outing, Stanley for a farm-pond lesson, or Bran or Chip for a rod.' })),
    };
  }

  function snapshot() { return { version: FISHING_VERSION, taught: state.taught, caught: { ...state.caught } }; }

  function restore(data) {
    state.taught = false; state.caught = {};
    if (!validateFishingSnapshot(data, { allowMissing: false })) return false;
    state.taught = data.taught; state.caught = { ...data.caught };
    return true;
  }

  return { learn, land, view, snapshot, restore, caughtCount,
    get taught() { return state.taught; }, get caught() { return { ...state.caught }; },
    hasCaught: id => !!state.caught[id] };
}

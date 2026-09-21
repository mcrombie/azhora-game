/**
 * Birding, the first of the traveler's skills. Every kind of bird observed for the
 * first time is worth experience.
 *
 * Two people, where there used to be one. **Perrin** keeps the bird garden on the
 * eastern side of Tidehaven and is there from the first minute: he teaches the
 * skill, he knows the birds that actually come to his garden (GARDEN_BIRDS), and
 * the hummingbird feeder is his - lent to the traveler, filled by Lysa, hung on
 * the hook by the red flowers. He is not a birder the way Lakota is a birder. He
 * is a man with a garden that birds come to, which he considers a different and
 * more sensible thing to be.
 *
 * **Lakota** was both and is now the seventh hired sword to come up the road
 * (src/mercenaries.js), so he is not in the village at all until he walks into
 * it. What he keeps is everything that was ever his: the red-tail on his glove,
 * the list of a hundred and six, what is on his mind, and the two other skills he
 * can start you on. None of it is offered up front. It is further down his
 * conversation and you reach it by knowing him (src/lakota.js).
 *
 * Pure: no DOM, no three. The birds themselves are drawn and moved by
 * `src/drent-birds.js`.
 */
export const BIRDING_VERSION = 1;
export const BIRDING_SKILL = 'birding';
export const BIRDING_KEY = 'KeyB';
export const SKILLS_KEY = 'KeyK';

// Drawn from Michael's sketch: cream collared shirt, spiky hair, and a red-tailed hawk on his
// glove (src/lakota-hawk.js). His id is his place in the company now, so that everything already
// written against BIRD_WATCHER.id follows him onto the road without being rewritten.
export const BIRD_WATCHER = Object.freeze({ id: 'merc-lakota', name: 'Lakota', role: 'Birder', modelRole: 'bird-watcher', color: 0xe4d8bd });

/**
 * Perrin, who keeps the bird garden. Soil on his knees, a hat that has been rained on, and a
 * bench he built for himself that the birds have taken over.
 */
export const GARDEN_KEEPER = Object.freeze({ id: 'garden-keeper', name: 'Perrin', role: 'Keeper of the bird garden', modelRole: 'garden-keeper', color: 0x7d8a63 });

export const FEEDER_ITEM = 'hummingbird-feeder';
export const FILLED_FEEDER_ITEM = 'sugar-water-feeder';
export const FEEDER_STAGES = Object.freeze(['none', 'lent', 'filled', 'hung']);

const species = (id, entry) => Object.freeze({ id, ...entry });
export const BIRD_SPECIES = Object.freeze({
  cardinal: species('cardinal', {
    name: 'Cardinal', xp: 15, spook: 6.5, group: 'village',
    note: 'Red all over, with a pointed crest and a black mask around a thick orange bill. The hen is buff-brown with red in her crest, wings and tail. A pair keeps to the hedges and fences and is rarely far apart.',
    hint: 'A flash of red along the fences and the garden on the western side of the village.',
    lore: 'The red one is the cock. The brown one with red in her wings is his hen, and she sings as well as he does, which nobody believes until they hear her.',
  }),
  wren: species('wren', {
    name: 'Wren', xp: 20, spook: 5, group: 'village',
    note: 'Small and round, rusty brown above and warm buff below, with a long white stripe over the eye and a tail cocked straight up. A song far too loud for the size of it.',
    hint: 'Something small and very loud on the barrels behind the cottages east of the square.',
    lore: 'The wren sings as if it owns the village. It owns the barrels, at least. It will nest in a hat if you leave one on a peg.',
  }),
  titmouse: species('titmouse', {
    name: 'Titmouse', xp: 15, spook: 5.5, group: 'village',
    note: 'Soft grey above and pale below, with peach along the flanks, a pointed grey crest, a black spot above a stubby bill, and big dark eyes.',
    hint: 'A grey bird with a crest, calling where the village meets the woods along the eastern fence.',
    lore: 'Titmice call the same two notes over and over, and they are the first to scold an owl. Where you find one, you usually find a few.',
  }),
  crow: species('crow', {
    name: 'Crow', xp: 10, spook: 10, group: 'field',
    note: 'Black from bill to feet, big, with a heavy bill. Crows walk rather than hop, work a field together and keep one of their number looking up.',
    hint: 'Black birds walking the field behind the western cottages.',
    lore: 'Crows know faces. Be civil to them. Tobin shouted at one once, and they still follow him down to the boats.',
  }),
  hummingbird: species('hummingbird', {
    name: 'Hummingbird', xp: 30, spook: 3, group: 'garden',
    note: 'Hardly longer than a thumb: a green back, a pale belly and a bill like a needle. The cock has a throat that flashes ruby when the light catches it. It hovers at a flower as if hung on a thread.',
    hint: 'Perrin says they come only to flowers and to sugar water.',
    lore: 'They come a long way to get here and they will fight anything for a feeder, even each other. Mostly each other.',
  }),
  robin: species('robin', {
    name: 'Robin', xp: 12, spook: 7, group: 'village',
    note: 'Grey-brown above and brick-orange from throat to belly, with a white ring round the eye and a bright yellow bill. It runs three steps on the grass, stops dead, and puts its head to one side.',
    hint: 'On the open grass of the green, running and stopping and running again.',
    lore: 'That head-tilt is not listening. It is looking: one eye down at the turf for the worm it already knows is there.',
  }),
  chickadee: species('chickadee', {
    name: 'Chickadee', xp: 15, spook: 4, group: 'village',
    note: 'Tiny, with a black cap pulled down over white cheeks, a black bib, grey wings and buff flanks. It never sits still for longer than it takes to look at it.',
    hint: 'The smallest thing in the hedge by the garden, and the boldest.',
    lore: 'They will come nearer than any other bird here. Stand still with your hand out and one of them will do the arithmetic and decide you are furniture.',
  }),
  mockingbird: species('mockingbird', {
    name: 'Mockingbird', xp: 20, spook: 6, group: 'village',
    note: 'Plain grey above, pale below, long-tailed and long-legged, with white flashes that open in the wing when it flies. It sings other birds\u2019 songs one after another, three times each.',
    hint: 'Singing from the top of a post by the square, and not singing anything of its own.',
    lore: 'Count the repeats. Three of a wren, three of a cardinal, three of a cart axle it heard on Tuesday. They sing half the night in spring and nobody thanks them for it.',
  }),
  'mourning-dove': species('mourning-dove', {
    name: 'Mourning dove', xp: 12, spook: 8, group: 'village',
    note: 'Soft fawn, small-headed, with a long pointed tail and black spots on the wing. Its wings whistle when it goes up, which is the only loud thing about it.',
    hint: 'On the cottage roofs and the track, walking with its head going.',
    lore: 'That mournful hooing gets mistaken for an owl every year by somebody. The whistle is the wings, not the bird.',
  }),
  'blue-jay': species('blue-jay', {
    name: 'Blue jay', xp: 15, spook: 8, group: 'village',
    note: 'Blue above and pale below, with a crest, a black necklace across the throat, and white bars and spots in the blue of the wing and tail. Loud, and aware of being loud.',
    hint: 'Blue and shouting where the village gives way to the wood.',
    lore: 'They imitate a hawk to clear a feeder, then eat at it alone. They also bury acorns by the hundred and forget enough of them to plant a wood.',
  }),
  goldfinch: species('goldfinch', {
    name: 'Goldfinch', xp: 20, spook: 6, group: 'field',
    note: 'The cock is hot yellow with a black cap and black wings barred white; the hen is a dull olive. They fly in deep bounds and call on every rise of it.',
    hint: 'Yellow birds working the thistles at the edge of the western field.',
    lore: 'They nest later than anything else here because they wait for thistledown to line it with. Patience, or fussiness, depending who you ask.',
  }),
  catbird: species('catbird', {
    name: 'Catbird', xp: 20, spook: 5, group: 'village',
    note: 'Slate grey all over with a neat black cap and, when it turns, a patch of rust under the tail. Heard far more often than seen.',
    hint: 'Something mewing like a cat from inside the thicket behind the cottages.',
    lore: 'It is a bird. It is always a bird. Every year somebody goes looking for a kitten in that bramble and comes back thoughtful.',
  }),
  'downy-woodpecker': species('downy-woodpecker', {
    name: 'Downy woodpecker', xp: 20, spook: 5, group: 'wood',
    note: 'Small, chequered black and white, with a short stubby bill and a white stripe down the back. The cock has a red patch on the back of his head; the hen has none.',
    hint: 'Working the smaller branches in the Greenway wood, tapping as it goes.',
    lore: 'The little one with the short bill is the downy. There is a bigger one with a longer bill that looks the same and is not, and people argue about it in this village more than you would think.',
  }),
  'red-bellied-woodpecker': species('red-bellied-woodpecker', {
    name: 'Red-bellied woodpecker', xp: 20, spook: 6, group: 'wood',
    note: 'A ladder of black and white bars across the back, pale below, with a red cap that runs down the back of the neck. Climbs in jerks and calls a rolling churr.',
    hint: 'Barred black and white on the big trunks of the Greenway, with red on its head.',
    lore: 'The red belly it is named for is a faint wash you will see about twice in your life. Whoever named it was holding a dead one.',
  }),
  'pileated-woodpecker': species('pileated-woodpecker', {
    name: 'Pileated woodpecker', xp: 30, spook: 9, group: 'wood',
    note: 'As big as a crow, black with white stripes up the neck and a flaming red crest. It chops long rectangular holes in dead wood and you can hear the blows from a field away.',
    hint: 'Deep in the Greenway, where something is hitting a dead tree like a man with an axe.',
    lore: 'Find a hole the shape of a brick and you have found where one has been. They take carpenter ants out of standing timber and leave the tree the better for it.',
  }),
  nuthatch: species('nuthatch', {
    name: 'Nuthatch', xp: 20, spook: 4, group: 'wood',
    note: 'Blue-grey above, white below, with a black cap and a long straight bill, going down the trunk head first as if that were the obvious way to do it.',
    hint: 'On the trunks in the Greenway, upside down.',
    lore: 'Going down head first it sees what the birds going up have missed. The whole trade is in the direction.',
  }),
  'wood-thrush': species('wood-thrush', {
    name: 'Wood thrush', xp: 25, spook: 7, group: 'wood',
    note: 'Warm rusty head and back, white below with heavy round black spots. Quiet on the leaf litter, and then not quiet at all.',
    hint: 'On the floor of the Greenway wood, turning leaves over.',
    lore: 'It sings two notes at once \u2014 it has the throat for it \u2014 and there is no better sound in this country at dusk. Lakota has been known to stop work for it.',
  }),
  'barred-owl': species('barred-owl', {
    name: 'Barred owl', xp: 35, spook: 12, group: 'wood',
    note: 'Big, round-headed and earless, streaked brown and cream, with black eyes rather than yellow ones. It sits against a trunk in daylight and is usually found by the noise the little birds make about it.',
    hint: 'The titmice and the jays are mobbing something in the Greenway, and it is not you.',
    lore: 'Who cooks for you. Who cooks for you all. Say it aloud in the wood at dusk and you may get an answer, which people find less charming than they expect.',
  }),
  bluebird: species('bluebird', {
    name: 'Bluebird', xp: 20, spook: 7, group: 'field',
    note: 'Deep blue above, rust across the throat and breast, white under the tail. It sits on a fence, drops straight into the grass, and goes back up with something.',
    hint: 'On the field fences out past the Caloss gate, facing the grass.',
    lore: 'They want short grass and a hole to nest in, and they have less of both every year. Put up a box with the right sized hole and you will have them for life.',
  }),
  'red-winged-blackbird': species('red-winged-blackbird', {
    name: 'Red-winged blackbird', xp: 15, spook: 6, group: 'water',
    note: 'The cock is black with a scarlet shoulder edged yellow, which he opens like a flag when he sings; the hen is brown and streaked and looks like another bird entirely.',
    hint: 'Shouting from the reeds at Willowmere, on the top of a cattail.',
    lore: 'He has a marsh three yards wide and he will fight a heron over it. The brown one on the nest is the reason.',
  }),
  heron: species('heron', {
    name: 'Heron', xp: 25, spook: 14, group: 'water',
    note: 'Tall as a child, blue-grey, with a dagger of a bill and a black plume behind the eye. It stands in the shallows without moving, and in flight it folds its neck back and trails its legs.',
    hint: 'Standing in the shallow end of Willowmere, not moving at all.',
    lore: 'Everything about it is waiting. When it finally goes, it is so fast that people who watched the whole thing still miss it.',
  }),
  kingfisher: species('kingfisher', {
    name: 'Kingfisher', xp: 25, spook: 11, group: 'water',
    note: 'Big-headed and short-tailed, blue-grey above and white below, with a ragged crest and a heavy black bill. It rattles as it goes along the water, hovers, and drops.',
    hint: 'A rattle going down the river at the Caloss bank, faster than you can turn round.',
    lore: 'It hangs over the water, folds, and goes in like a thrown knife. The hen is the brighter of the two, which is the wrong way round for most birds here.',
  }),
  mallard: species('mallard', {
    name: 'Mallard', xp: 12, spook: 8, group: 'water',
    note: 'The drake has a bottle-green head, a white ring, a chestnut breast and a curl of black at the tail; the duck is streaked brown with a blue patch in the wing. Both tip up to feed and neither is embarrassed about it.',
    hint: 'On Willowmere, tipped up with their tails in the air.',
    lore: 'Feed them bread and you will do them no good at all. Feed them nothing and they will still be there tomorrow.',
  }),
  gull: species('gull', {
    name: 'Gull', xp: 12, spook: 7, group: 'water',
    note: 'Grey wings, white body, a dark hood in summer and a smudge behind the eye out of it, with red at the bill and a laughing call that gives it its name.',
    hint: 'On the landing, waiting for the boats like everybody else.',
    lore: 'They follow the boats in and they know the sound of a gutting knife from the other end of the village. Nothing here is wasted, which is mostly their doing.',
  }),
  'turkey-vulture': species('turkey-vulture', {
    name: 'Turkey vulture', xp: 15, spook: 14, group: 'field',
    note: 'Black-brown and huge, with a small bare red head, wings held up in a shallow V and silver-lined underneath, and a way of rocking on the air without ever flapping. On the ground it stands with its wings spread out to dry.',
    hint: 'Standing in the Avrel fields with its wings open, out past the farmsteads.',
    lore: 'It finds its work by smell, which almost no bird can do. Ugly at ten paces and the best flier in this country at a hundred.',
  }),
});

/**
 * The birds of Drent in the order the journal lists them: the four anybody starts
 * on, then the rest of this country's common birds, then the hummingbird,
 * which has to be earned.
 */
export const DRENT_BIRDS = Object.freeze(Object.keys(BIRD_SPECIES));
/** Where each kind is looked for, which is how the journal groups them. */
export const BIRD_GROUPS = Object.freeze(['village', 'wood', 'field', 'water', 'garden']);
/**
 * The birds that actually come to Perrin's garden, measured against BIRD_HABITATS in
 * src/drent-birds.js: the chickadees on the fence beyond it and the catbird in its brambles
 * overlap the garden itself, and the wren on the barrels behind is 0.9 m off it. Nothing else in
 * the village comes within fourteen metres. The hummingbird is the fourth and comes only to the
 * feeder, which is why it is counted apart.
 */
export const GARDEN_BIRDS = Object.freeze(['chickadee', 'catbird', 'wren']);

/** How far off a bird can be observed; practice lets the traveler see well from farther away. */
export const observeRange = level => Math.min(30, 18 + 2 * Math.max(0, (Number(level) || 1) - 1));

export const BIRDING_LESSON = Object.freeze([
  'Find a bird, then stop before it minds you. Every kind has its own distance: a crow will not let you near, and a hummingbird hardly cares.',
  'When you have it in view and it is sitting still, press B and look at it properly: the shape, the bill, what it is doing. The first time you really see a kind of bird, you do not forget it.',
  'Start in this garden, because they are used to me here: chickadees on the fence, the catbird in the brambles, and the wren on the barrels behind. Past that the village has its own — cardinals on the western fences, titmice where the woods begin, crows in the field. Your journal keeps your birds. K opens it.',
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
    if (!state.met) return { ok: false, reason: 'You do not yet know what to look for. Perrin, at the garden on the east side of Tidehaven, does.' };
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
    if (!state.met) return { ok: false, reason: 'Perrin has not met you yet.' };
    if (state.feeder !== 'none') return { ok: false, reason: 'Perrin has already lent you his feeder.' };
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
    const title = 'Perrin’s hummingbirds';
    if (state.feeder === 'lent') return { title, stage: 'lent', target: 'acorn-cook', detail: 'Take Perrin’s feeder to Lysa at her kitchen. She keeps the sugar.' };
    if (state.feeder === 'filled') return { title, stage: 'filled', target: 'feeder-hook', detail: 'Hang the filled feeder on the hook by the red flowers in Perrin’s garden.' };
    return { title, stage: 'hung', target: 'feeder-hook', detail: 'Stand back from the feeder and wait. Press B when the hummingbird is hovering.' };
  }

  function view() {
    return {
      met: state.met, feeder: state.feeder, seenCount: seenCount(), total: DRENT_BIRDS.length,
      entries: DRENT_BIRDS.map(id => ({ id, seen: !!state.seen[id], count: state.seen[id] ?? 0, name: state.seen[id] ? BIRD_SPECIES[id].name : 'An unknown bird',
        detail: state.seen[id] ? BIRD_SPECIES[id].note : state.met ? BIRD_SPECIES[id].hint : 'Perrin, at the garden on the eastern side of Tidehaven, knows what lives here.' })),
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

/** What Lakota says of his red-tailed hawk (she flies in src/hawk-flight.js). */
export const RED_TAIL_LINES = Object.freeze([
  'A red-tailed hawk. You know her by the tail: brick red on top, once they are past their first year. Before that it is brown and barred like everything else in the wood.',
  'That scream you hear in every story with a hawk or an eagle in it? That is a red-tail. The eagles get the credit for it.',
  'I did not train her to hunt for me. She hunts for herself, off the fence posts along the road: voles, mice, the odd snake. She comes back to the glove because it is warm and I keep the crows off her.',
  'When the sun has warmed the green she goes up and circles. She is not showing off. She is riding the warm air up so she does not have to flap. Watch her for a while; you will learn more about the wind than any sailor can tell you.',
]);

/**
 * Lakota's other enthusiasms. Birds first, always; but also the great old lizards
 * the birds came from, wine, digging, chocolate, the thinking machines he is sure
 * are coming, and a growing suspicion about the nature of the world itself.
 */
export const LAKOTA_TOPICS = Object.freeze([
  Object.freeze({ id: 'dinosaurs', label: 'The great old lizards?', lines: Object.freeze([
    'Dinosaurs. I call them that; nobody else calls them anything, because nobody else has noticed them. Terrible lizards, bigger than a house, and gone before there was a sea where the sea is.',
    'Look at a heron’s foot. Three toes forward, scales up the shin, a claw on each. Now look at the track in the threshold slab at Rena. The birds are what is left of them. I would stake my list on it.',
    'There is a jaw on Livia’s mantel at Vaervelm Caelazh that I dug out of the bottom of her vineyard. She thinks it is a cow. It is not a cow.',
  ]) }),
  Object.freeze({ id: 'digging', label: 'What is the best thing you ever dug up?', lines: Object.freeze([
    'A jaw, at the bottom of Livia’s vineyard, as long as my arm and full of teeth like steak knives. I carried it up the hill in my shirt and she made me wash it before it came in the cabin.',
    'Second best: a whistle made from a swan’s wing bone, at the edge of an old camp by the Caloss. I blew it. It still worked. I am not sure it should have.',
  ]) }),
  Object.freeze({ id: 'wine', label: 'Which wine is best?', lines: Object.freeze([
    'Norton. Everybody pretends to prefer the Viognier because it is pretty. Norton is the vine that was here first, growing wild up the trees before anybody planted a row, and it tastes like it: dark, wild, a little rude.',
    'Livia will pour you the Viognier first. Let her. Then ask for the Norton, and watch her decide whether she likes you.',
  ]) }),
  Object.freeze({ id: 'chocolate', label: 'What is that in your coat pocket?', lines: Object.freeze([
    'Chocolate. The southern ships bring it in cakes as bitter as bark. Grate it into hot milk with a pinch of chilli and a spoon of honey and you will understand why their kings drank it before battles.',
    'I keep a cake of it in my coat for owl nights. An owl will make you wait till the small hours, and chocolate is the only thing that makes waiting feel like a choice.',
  ]) }),
  Object.freeze({ id: 'machines', label: 'Do you believe in thinking machines?', lines: Object.freeze([
    'Have you noticed that everybody in Tidehaven has exactly three things to say, and says them the same way every time? Somebody wrote them.',
    'I think there are minds that are not people: made, not born, built out of rules and a great deal of reading, doing half the talking in this village. I call them artificial intelligences, because I like to be precise about what frightens me.',
    'Eren laughs at me. But Eren tells every single person who comes up the Greenway to “watch the windup, dodge to the side”, in exactly those words. Every one.',
  ]) }),
  Object.freeze({ id: 'game', label: 'You seem distracted.', lines: Object.freeze([
    'Some days I think the world is only put there as you walk into it. The road ahead is not quite finished until somebody looks at it, and the far hills are painted on.',
    'Birds never land on the roofs. Not once. I have watched for years. A real world would have a pigeon on every ridge.',
    'And when I dream, I dream of somebody at a desk in a lit room, pressing keys, watching me. When you move, do you ever feel your legs are being … steered?',
    'Never mind. Look, a wren.',
  ]) }),
]);

/** Archaeology and wine, as Lakota teaches them. */
export const LAKOTA_ARCHAEOLOGY_PITCH = Object.freeze([
  'I dig. Old towns and older bones, whatever the ground is keeping. A birder is only somebody who looks properly; a digger is somebody who looks properly at what has stopped moving.',
  'The ruins of Rena, in the forest at the heart of Drent. The town was burned eighty years ago and nobody has ever sat down and read it. I have pegged the places worth your time.',
  'Go and read five of them for me, write them up, and bring me your notes. Do not take anything. A thing out of the ground is a thing with its story cut off.',
]);
export const LAKOTA_WINE_PITCH = Object.freeze([
  'Wine. Before I came here I worked a cellar at Vaervelm Caelazh, in the north-east of West Suval. Paradise Springs, in plain words: the good green place, where the water endures. A log cabin that was the first house on the land, a great hall, a spring that has never once failed, eight grapes on the slope, and the best Norton on this coast.',
  'Tasting is only looking properly again, with your nose and your mouth. Look at the colour. Swirl it. Smell it like you mean it. Then a small mouthful, held. There, you know how.',
  'Go and see Livia Seravo there. Take the lane east off the Solis road past the Suval Downs. And be careful: there is a war on around Solis, the army and the Coalition both, and neither side much minds whose field it is fought in. Keep your head down and your purse closed.',
]);

/**
 * Perrin at the garden: the skill, the birds that come to him, and the feeder. Everything here is
 * available from the first minute of the game, which is the whole point of him.
 */
export function gardenKeeperConversation(npc, context) {
  const { birding, openDialogue, closeDialogue, act } = context;
  if (npc.id !== GARDEN_KEEPER.id) return false;
  const again = () => gardenKeeperConversation(npc, context);
  const leave = { id: 'leave-garden-keeper', label: birding.met ? 'Good watching.' : 'Another time.', action: closeDialogue };
  if (!birding.met) {
    openDialogue(npc, [
      'Mind the step. And mind that hedge — no, too late. That was a wren. It was there the whole time you were walking up and it is not there now, and that is the entire lesson, really.',
      'Perrin. This is my garden. I did not plant it for the birds, I planted it for me, and then the birds turned up and made it theirs, and now I mostly work round them.',
      'Three kinds come to this garden and a fourth if you are cleverer than I am. You look like somebody about to walk a very long way. You will go past more birds in a month than I will see all year, and it seems a waste for you not to know what you are looking at.',
      'It is not difficult. It is mostly standing still, which people find harder than they expect.',
    ], null, 'Back to the road', { choices: [
      { id: 'learn-birding', label: 'Show me.', action: () => { closeDialogue(); act('learn-birding'); } },
      leave,
    ] });
    return true;
  }
  const gardenSeen = GARDEN_BIRDS.filter(id => birding.hasSeen(id)).length, hummingbird = birding.hasSeen('hummingbird');
  const line = hummingbird ? 'You got the hummingbird. I have had that feeder out three summers and I have seen it twice, so do not expect me to be gracious about it.'
    : birding.feeder === 'hung' ? 'Feeder is up. Now go and stand well back from it and be boring for a while. Watch for something like a large bee that stops dead in the air.'
    : birding.feeder === 'filled' ? 'Lysa filled it, then. Hang it on the hook by the red flowers and step away — properly away, not two paces away looking hopeful.'
    : birding.feeder === 'lent' ? 'Lysa has the sugar. Four of water to one of sugar, boiled and cooled, and not honey. Honey goes over in the sun and it makes them ill.'
    : gardenSeen === GARDEN_BIRDS.length ? 'All three of the garden ones. That is better than most people who have lived here their whole lives, including me for the first nine years.'
    : gardenSeen ? `${gardenSeen} of the three that come to this garden. Keep your distance and keep looking.`
    : 'Anything yet? Stop before they mind you, and press B while one is sitting still.';
  const seen = GARDEN_BIRDS.concat('hummingbird').filter(id => birding.hasSeen(id));
  openDialogue(npc, [line], null, 'Back to the road', { choices: [
    { id: 'birding-hints', label: 'What should I look for?', action: () => {
      const unseen = DRENT_BIRDS.filter(id => !birding.hasSeen(id) && (id !== 'hummingbird' || birding.feeder === 'none'));
      openDialogue(npc, unseen.length ? unseen.slice(0, 6).map(id => BIRD_SPECIES[id].hint)
        : ['You have everything that comes to Tidehaven. Drent has a good deal more than these, and I am told the world has more than Drent. I would not know. I have a garden.'],
        null, 'Back to our conversation', { onComplete: again });
    } },
    ...(seen.length ? [{ id: 'birding-lore', label: 'Tell me about the birds in your garden.', action: () => openDialogue(npc, seen.map(id => BIRD_SPECIES[id].lore), null, 'Back to our conversation', { onComplete: again }) }] : []),
    ...(birding.feeder === 'none' ? [{ id: 'ask-hummingbirds', label: 'Is there anything harder to see?', action: () => openDialogue(npc, [
      'Hummingbirds. Green, smaller than your thumb, and they will not touch seed like a sensible bird. Flowers, and sugar water.',
      'I have an old feeder somewhere — glass bottle, red cap. Take it to Lysa; she keeps sugar for her cakes. Four parts water to one of sugar, boiled and cooled. Not honey. Honey spoils in the sun and sickens them.',
      'Then hang it on the hook by the red flowers and wait. They are bold little things, but they are not that bold.',
    ], null, 'Back to our conversation', { choices: [
      { id: 'take-feeder', label: 'I will take the feeder to Lysa.', action: () => { closeDialogue(); act('take-feeder'); } },
      { id: 'decline-feeder', label: 'Maybe later.', action: again },
    ] }) }] : []),
    { id: 'birding-lesson', label: 'Tell me again how it is done.', action: () => openDialogue(npc, [...BIRDING_LESSON], null, 'Back to our conversation', { onComplete: again }) },
    leave,
  ] });
  return true;
}

/**
 * Lakota on the road. He introduces himself as what the contract says he is, and is plainly not
 * that, and the traveler has to say so before anything of his opens up. `lakota` is
 * src/lakota.js; `mercenaryChoices` are the style and trade lines every hired sword carries,
 * handed in by the host so this module does not have to know about weapons.
 */
export function birdWatcherConversation(npc, context) {
  const { birding, lakota = null, openDialogue, closeDialogue, act,
    archaeology = null, wine = null, cooking = null, mercenaryChoices = [] } = context;
  if (npc.id !== BIRD_WATCHER.id) return false;
  const again = () => birdWatcherConversation(npc, context);
  const known = !lakota || lakota.met;
  const leave = { id: 'leave-bird-watcher', label: known ? 'Good watching.' : 'Another time.', action: closeDialogue };
  if (!known) {
    // A hired sword on a road with everybody else, who says so, and is obviously nothing of the kind.
    openDialogue(npc, [
      'Wait. Wait. Do not move your left foot. … Right, it has gone. That was a redstart and you very nearly stood in its breakfast.',
      'Lakota. I am on the same contract you are, before you ask, and yes, I am aware I do not look like it. The Empire is paying eleven of us to walk to a plain. I intend to walk there slowly.',
      'The one on the glove is a red-tail. She came to me as a fledgling with a broken wing and when it mended she declined to leave. We have an arrangement.',
    ], null, 'Back to the road', { choices: [
      { id: 'lakota-know', label: 'You are not really a mercenary, are you?', action: () => { closeDialogue(); act('know-lakota'); } },
      ...mercenaryChoices,
      leave,
    ] });
    return true;
  }
  const seen = DRENT_BIRDS.filter(id => birding.hasSeen(id));
  const line = seen.length >= 12 ? `${seen.length} kinds. You have been looking properly, which is more than I can say for anybody else on this road.`
    : seen.length ? `${seen.length} so far. Keep at it. The list is the point; the birds do not care either way.`
    : birding.met ? 'Perrin taught you, then. Good man. He will tell you he is not a birder, and he is the best pair of eyes in that village.'
    : 'You have not learned to look yet. Perrin keeps the garden on the east side of Tidehaven, and he will show you in ten minutes.';
  const choices = [
    ...(seen.length ? [{ id: 'birding-lore', label: 'Tell me about the birds I have seen.', action: () => openDialogue(npc, seen.map(id => BIRD_SPECIES[id].lore), null, 'Back to our conversation', { onComplete: again }) }] : []),
    { id: 'ask-hawk', label: 'About the hawk on your glove.', action: () => openDialogue(npc, [...RED_TAIL_LINES], null, 'Back to our conversation', { onComplete: again }) },
    ...(archaeology && archaeology.task()?.stage === 'report' ? [{ id: 'report-rena', label: 'I have my notes from Rena.', action: () => { closeDialogue(); act('report-rena'); } }] : []),
    ...(archaeology && !archaeology.met ? [{ id: 'learn-archaeology', label: 'You said you dig, too?', action: () => openDialogue(npc, [...LAKOTA_ARCHAEOLOGY_PITCH], null, 'Back to our conversation', { choices: [
      { id: 'accept-rena', label: 'Teach me. I will go to Rena.', action: () => { closeDialogue(); act('learn-archaeology'); } },
      { id: 'decline-rena', label: 'Another time.', action: again },
    ] }) }] : []),
    ...(wine && !wine.met ? [{ id: 'learn-wine', label: 'Tell me about wine.', action: () => openDialogue(npc, [...LAKOTA_WINE_PITCH], null, 'Back to our conversation', { choices: [
      { id: 'accept-wine', label: 'I will look for Vaervelm Caelazh.', action: () => { closeDialogue(); act('learn-wine'); } },
      { id: 'decline-wine', label: 'Maybe after the war.', action: again },
    ] }) }] : []),
    ...(cooking ? [{ id: 'feeling-bad', label: 'Honestly, Lakota? It has been a bad day.', action: () => { closeDialogue(); act('hot-chocolate'); } }] : []),
    ...(cooking && cooking.cups > 0 && !cooking.knows('hot-chocolate') ? [{ id: 'ask-recipe', label: 'How do you make that hot chocolate?', action: () => { closeDialogue(); act('learn-hot-chocolate'); } }] : []),
    { id: 'lakota-mind', label: 'What else is on your mind?', action: () => {
      const topics = () => openDialogue(npc, ['Birds, mostly. But since you ask.'], null, 'Back to our conversation', { choices: [
        ...LAKOTA_TOPICS.map(topic => ({ id: `topic-${topic.id}`, label: topic.label, action: () => openDialogue(npc, [...topic.lines], null, 'Back', { onComplete: topics }) })),
        { id: 'topics-done', label: 'Back to birds.', action: again },
      ] });
      topics();
    } },
    { id: 'birding-lesson', label: 'How is it done, properly?', action: () => openDialogue(npc, [...BIRDING_LESSON], null, 'Back to our conversation', { onComplete: again }) },
    // He is a hired sword as well as everything else, and answers for his staff like the rest of them.
    ...mercenaryChoices,
    leave,
  ];
  openDialogue(npc, [line], null, 'Back to the road', { choices });
  return true;
}

/** Lysa's part in the errand: a choice to add to her conversation while the traveler carries the empty feeder. */
export function lysaFeederChoice(npc, { birding, inventory, openDialogue, act, back }) {
  if (birding.feeder !== 'lent' || !inventory?.has?.(FEEDER_ITEM)) return null;
  return { id: 'fill-feeder', label: 'Perrin says you keep sugar. Could you fill his feeder?', action: () => {
    const result = act('fill-feeder');
    openDialogue(npc, result?.ok ? [
      'Perrin’s old bottle! He has asked me twice this summer and forgotten it both times.',
      'Four of water to one of sugar, boiled and cooled. He will have told you that, and he will have told you not honey. There. Carry it upright, or the wasps will follow you all the way back to him.',
    ] : [result?.reason || 'Not just now.'], null, 'Back to our conversation', { onComplete: back });
  } };
}

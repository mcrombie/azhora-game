/**
 * Botany, the catch-all skill for everything that grows, as mycology is the
 * catch-all for mushrooms. Nell Harrow keeps a drying shed on the outskirts of Tidehaven and will
 * teach anyone who stops what grows in Drent and what it is for: what staunches
 * a cut, what settles a fever, what is supper after three waters and poison
 * before them.
 *
 * The plants are the plants of the country the game is drawn from — the tidal
 * rivers, oak woods, old fields and roadside verges between two great rivers —
 * with plain names, as the birds, the fish and the mushrooms have. Three of them
 * carry the region's whole history in a leaf: the tuckahoe the river people dug
 * out of tidal mud, the tobacco the fields were turned over to, and the jimson
 * weed that grew up out of a garrison's ditch and sent the garrison mad.
 * Pure: no DOM, no three.
 */
export const BOTANY_VERSION = 1;
export const BOTANY_SKILL = 'botany';
export const HERB_ITEM = 'herbs';
export const TUCKAHOE_ITEM = 'tuckahoe';
export const LEAF_ITEM = 'pipe-weed';
export const JIMSON_ITEM = 'jimson-pods';

export const BOTANIST = Object.freeze({
  id: 'botanist', name: 'Nell Harrow', role: 'Botanist of the Tidehaven outskirts',
  modelRole: 'shelter-keeper', color: 0x746354,
});

/** Her drying shed on the western outskirts, in world metres, facing the village. */
export const BOTANIST_STAND = Object.freeze({ x: -40, z: 44, yaw: Math.PI * .78 });

const kind = (id, entry) => Object.freeze({ id, item: HERB_ITEM, ...entry });

/**
 * `habitat` is where it grows, which is where Drent puts it. `use` is what Nell
 * files it under, and is what the skill sheet groups by.
 */
export const PLANT_SPECIES = Object.freeze({
  yarrow: kind('yarrow', {
    name: 'Yarrow', xp: 10, habitat: 'verge', use: 'wound',
    note: 'Flat white plates of tiny flowers on a stiff stem, over leaves so finely cut they look like green feathers.',
    lore: 'Crush the leaf into a cut and hold it. It is the first thing I reach for and the last thing I run out of.',
  }),
  plantain: kind('plantain', {
    name: 'Plantain', xp: 10, habitat: 'verge', use: 'wound',
    note: 'A flat rosette of ribbed oval leaves in the trodden middle of the path, with a rat-tail spike standing out of it.',
    lore: 'Chew a leaf and put it on a sting or a blister. It grows where boots go, which is thoughtful of it.',
  }),
  jewelweed: kind('jewelweed', {
    name: 'Jewelweed', xp: 15, habitat: 'damp', use: 'remedy',
    note: 'Translucent juicy stems in wet shade, hung with orange spurred flowers like little horns, and seed pods that fly apart at a touch.',
    lore: 'Split the stem and rub the juice on a nettle rash or the itching ivy. It grows beside both of them, which I take as an instruction.',
  }),
  mullein: kind('mullein', {
    name: 'Mullein', xp: 15, habitat: 'clearing', use: 'remedy',
    note: 'A grey felted rosette in its first year and a tall yellow candle of a spike in its second, standing above everything in the old field.',
    lore: 'Dry the leaves and smoke them for a tight chest, or steep them for a cough. The leaf is soft enough for other uses and every traveler works that out alone.',
  }),
  boneset: kind('boneset', {
    name: 'Boneset', xp: 15, habitat: 'damp', use: 'remedy',
    note: 'Paired leaves joined around the stem so the stem appears to run straight through one long leaf, under a haze of dull white flower.',
    lore: 'For a fever that comes back every other day. It tastes so foul that people get well early to avoid a second cup.',
  }),
  sassafras: kind('sassafras', {
    name: 'Sassafras', xp: 20, habitat: 'wood', use: 'food',
    note: 'A young tree carrying three shapes of leaf at once — plain, a mitten, and a mitten with two thumbs — and a root that smells sweet the moment it is cut.',
    lore: 'Dig a finger of root, scrub it, boil it. That smell is worth more abroad than anything else in this wood, which is why there is a ship in the harbour.',
  }),
  spicebush: kind('spicebush', {
    name: 'Spicebush', xp: 15, habitat: 'wood', use: 'food',
    note: 'An open shrub in the damp wood that flowers yellow before its leaves come, with red berries in autumn and a twig that smells of allspice when snapped.',
    lore: 'Snap a twig before you trust your eyes. Berries dried and ground go in anything; the twigs make a tea for a cold morning.',
  }),
  sumac: kind('sumac', {
    name: 'Sumac', xp: 15, habitat: 'clearing', use: 'food',
    note: 'A crooked shrub with velvet-furred antler branches and a tight red cone of fruit standing up at the end of each.',
    lore: 'Red cones standing up: soak them for a sour drink. There is a cousin with loose white berries hanging down, and that one will blister you for a month.',
  }),
  elder: kind('elder', {
    name: 'Elder', xp: 20, habitat: 'verge', use: 'food',
    note: 'Hollow-stemmed and sprawling at the field edge, carrying cream plates of flower in summer and heavy black clusters in autumn.',
    lore: 'Flowers for a fever, berries cooked for anything else. Never raw, never the stems, and never the red-berried sort.',
  }),
  'witch-hazel': kind('witch-hazel', {
    name: 'Witch hazel', xp: 20, habitat: 'wood', use: 'remedy',
    note: 'A wood-edge shrub that flowers in yellow ragged threads in late autumn, when there is nothing else in the wood flowering at all.',
    lore: 'Boil the bark and twigs down for bruises, chafing and a face that has been out in the wind. Flowering in the cold is its whole character.',
  }),
  'wild-ginger': kind('wild-ginger', {
    name: 'Wild ginger', xp: 20, habitat: 'damp', use: 'food',
    note: 'Paired heart-shaped leaves close to the ground in rich shade, hiding a dark red flower at the soil where only crawling things will find it.',
    lore: 'The root is not the ginger of the ships but it will flavour a pot. Lift the leaves and look underneath; the flower hides from you deliberately.',
  }),
  maypop: kind('maypop', {
    name: 'Maypop', xp: 25, habitat: 'clearing', use: 'remedy',
    note: 'A vine over the old fence with a flower too elaborate for this country — a fringed purple crown on a white plate — and a green egg of a fruit.',
    lore: 'A cup of the leaf before bed for a mind that will not sit down. The fruit pops underfoot, which is the whole of its name.',
  }),
  bloodroot: kind('bloodroot', {
    name: 'Bloodroot', xp: 25, habitat: 'wood', use: 'warning', warning: true,
    note: 'One white flower on a bare stalk in early spring, wrapped in a single scalloped leaf, over a root that bleeds orange-red where it breaks.',
    lore: 'Dye, and in the smallest doses a medicine. In any dose a fool would use it takes the flesh off. Learn it so you can leave it alone.',
  }),
  mayapple: kind('mayapple', {
    name: 'Mayapple', xp: 20, habitat: 'wood', use: 'warning', warning: true,
    note: 'Colonies of green umbrellas a foot off the floor, with a single nodding flower hidden under the ones that carry two leaves.',
    lore: 'The fruit is supper when it has gone yellow and fallen. The leaf, root and green fruit are a purge that has killed people in a hurry.',
  }),
  pokeweed: kind('pokeweed', {
    name: 'Pokeweed', xp: 20, habitat: 'verge', use: 'warning', warning: true,
    note: 'A great crimson-stemmed thing head-high by autumn, hung with drooping racks of ink-black berries that stain everything they touch.',
    lore: 'The first spring shoots, boiled through three waters, are a dish people would fight for. Everything else on the plant is poison, and the berries most of all.',
  }),
  ginseng: kind('ginseng', {
    name: 'Ginseng', xp: 30, habitat: 'wood', use: 'trade',
    note: 'Three prongs of five leaves apiece on a quiet stem in deep shade, with a tight cluster of red berries at the fork.',
    lore: 'Count the prongs and leave anything under three. Dried, it is worth its weight to the ships, and half the wood has been dug out already by people who did not count.',
  }),
  tuckahoe: kind('tuckahoe', {
    name: 'Tuckahoe', xp: 25, habitat: 'river', use: 'food', item: TUCKAHOE_ITEM, warning: true,
    note: 'Great arrowhead leaves standing out of tidal mud in the river shallows, with a green sheath of a flower and a root buried deep in the ooze.',
    lore: 'Raw it is a mouthful of glass and you will not forget it. Roasted a whole day in a covered pit it is bread, and it does not care whether the harvest failed.',
  }),
  tobacco: kind('tobacco', {
    name: 'Tobacco', xp: 20, habitat: 'field', use: 'craft', item: LEAF_ITEM,
    note: 'Broad pale sticky leaves on a man-high stalk, standing in rows in the field, with a head of dusty pink trumpets topped off by the grower.',
    lore: 'Cut, hung in the barn and cured brown, then rubbed for the pipe. Half the good ground in Drent is under it, and half the arguments in Drent are about that.',
  }),
  // The trees. A tree is named, not taken: `use: 'tree'` keeps it out of the
  // satchel, and `where` says which part of Drent it stands in.
  'white-oak': kind('white-oak', {
    name: 'White oak', xp: 15, habitat: 'tree', use: 'tree', where: 'the Greenway wood',
    note: 'Pale grey scaly bark, low heavy limbs thrown out sideways, and leaves with deep rounded lobes and no points on them at all.',
    lore: 'Rounded lobes, white oak; pointed lobes, red. The white oak\u2019s acorns are the sweet ones, which is why Lysa sends children to this tree and not the other.',
  }),
  'red-oak': kind('red-oak', {
    name: 'Red oak', xp: 15, habitat: 'tree', use: 'tree', where: 'the Greenway wood',
    note: 'Dark bark in long shiny stripes, like ski tracks running up the trunk, and leaves with pointed lobes each ending in a bristle.',
    lore: 'Bitter acorns that keep two years on the tree before they drop. The squirrels bury them because they cannot eat them yet, and forget half, and that is how you get a wood.',
  }),
  'tulip-poplar': kind('tulip-poplar', {
    name: 'Tulip poplar', xp: 20, habitat: 'tree', use: 'tree', where: 'the Greenway wood',
    note: 'The tallest thing in the wood, a dead straight grey column with no branch for thirty feet, and leaves cut square across the top like a tulip\u2019s outline.',
    lore: 'Its flowers are orange-and-green cups too high up to see, except when the wind brings one down. The canoes on this coast were dug out of these, when there were canoes.',
  }),
  hickory: kind('hickory', {
    name: 'Shagbark hickory', xp: 20, habitat: 'tree', use: 'tree', where: 'the Greenway wood',
    note: 'Bark coming away from the trunk in long curling plates, as though the tree were shedding, and leaves in fives.',
    lore: 'The hardest, springiest wood in the country: axe handles and wagon spokes. The nuts are worth the fight you will have with the husk.',
  }),
  beech: kind('beech', {
    name: 'Beech', xp: 15, habitat: 'tree', use: 'tree', where: 'the Greenway wood',
    note: 'Bark as smooth and grey as an elephant\u2019s skin, and pale dry leaves that stay hanging on the lower branches all winter.',
    lore: 'Every pair of lovers in Tidehaven has cut their names into a beech, and the beech has kept every one of them, spread wider every year. It does not forget. That is the trouble with it.',
  }),
  'red-maple': kind('red-maple', {
    name: 'Red maple', xp: 15, habitat: 'tree', use: 'tree', where: 'the damp ground by Willowmere',
    note: 'Red twigs, red buds, red flowers before any leaf in spring and red leaves again in autumn, on a slim grey trunk in the wet.',
    lore: 'The first colour in the wood every year and the last. Something red is happening on it in every season but high summer.',
  }),
  sweetgum: kind('sweetgum', {
    name: 'Sweetgum', xp: 15, habitat: 'tree', use: 'tree', where: 'the Greenway wood',
    note: 'Leaves shaped like five-pointed stars, and hard spiked seed balls littering the ground beneath it like caltrops.',
    lore: 'Walk under one barefoot once and you will know it the rest of your life. Crush a leaf: it smells of resin, and the resin is the sweet gum.',
  }),
  sycamore: kind('sycamore', {
    name: 'Sycamore', xp: 15, habitat: 'tree', use: 'tree', where: 'the water, at Willowmere and the Caloss',
    note: 'Bark flaking off in patches to leave the upper limbs bone-white, shining at the water\u2019s edge, with big pale leaves like a hand spread wide.',
    lore: 'Look for the white limbs and you have found the river. It will not grow anywhere its roots cannot reach water.',
  }),
  'bald-cypress': kind('bald-cypress', {
    name: 'Bald cypress', xp: 25, habitat: 'tree', use: 'tree', where: 'the Caloss, in the water itself',
    note: 'A conifer standing in the river on a fluted, flared foot, ringed by knobbly knees poking up out of the water, with feathery needles that turn rust and fall.',
    lore: 'A tree that drops its needles like a broadleaf, hence bald. Nobody has settled what the knees are for. I think it simply likes company.',
  }),
  'loblolly-pine': kind('loblolly-pine', {
    name: 'Loblolly pine', xp: 15, habitat: 'tree', use: 'tree', where: 'the old fields at Avrel',
    note: 'A long bare trunk with plated red-brown bark and a flat tuft of long needles, in threes, held high at the top.',
    lore: 'The first tree back into a worn-out field. Every stand of these you see was somebody\u2019s tobacco once.',
  }),
  'red-cedar': kind('red-cedar', {
    name: 'Red cedar', xp: 15, habitat: 'tree', use: 'tree', where: 'fence lines and old fields',
    note: 'A dark narrow spire of scaly foliage along a fence line, with stringy red bark and dusty blue berries.',
    lore: 'The birds plant it: every fence post in Drent has a cedar under it where something sat and left the seed. The wood keeps moths out of a chest.',
  }),
  holly: kind('holly', {
    name: 'Holly', xp: 15, habitat: 'tree', use: 'tree', where: 'under the big trees in the Greenway',
    note: 'A dark glossy evergreen cone in the shade of the big trees, its leaves edged with spines, red berries on the female trees only.',
    lore: 'Green all winter when nothing else is. The berries are for birds, not for you, and the birds will tell you so.',
  }),
  dogwood: kind('dogwood', {
    name: 'Dogwood', xp: 20, habitat: 'tree', use: 'tree', where: 'the wood\u2019s edge',
    note: 'A small spreading tree at the edge of the wood, its branches held in flat layers, covered in spring with four-petalled white flowers.',
    lore: 'Those are not petals, strictly, but try telling anyone that in April. The hardest wood in the country for its size; they made shuttles for looms of it.',
  }),
  persimmon: kind('persimmon', {
    name: 'Persimmon', xp: 20, habitat: 'tree', use: 'tree', where: 'the field edges at Avrel',
    note: 'A tree with bark broken into small dark blocks like an alligator\u2019s back, hung in autumn with orange fruit the size of a plum.',
    lore: 'Wait for the frost. Before it, one bite will turn your mouth inside out; after it, the fruit is honey. Children learn this exactly once.',
  }),
  'black-walnut': kind('black-walnut', {
    name: 'Black walnut', xp: 20, habitat: 'tree', use: 'tree', where: 'the edge of Tidehaven',
    note: 'A dark ridged trunk and an open crown of long feathery leaves, dropping green husked nuts that stain the hands brown for a week.',
    lore: 'Nothing much grows under it; it poisons the ground for its rivals. Worth a great deal as timber and more as a place to sit in the shade and not be bothered.',
  }),
  'jimson-weed': kind('jimson-weed', {
    name: 'Jimson weed', xp: 25, habitat: 'waste', use: 'warning', warning: true, item: JIMSON_ITEM, yield: 3,
    note: 'A rank weed of trodden waste ground with jagged leaves, white trumpets that open at dusk and smell wrong, and hard green pods covered in spikes.',
    lore: 'Soldiers boiled it for greens once and spent eleven days chasing things nobody else could see. It does not kill everyone. Do not be interested in it.',
  }),
});

export const PLANT_IDS = Object.freeze(Object.keys(PLANT_SPECIES));
export const plant = id => PLANT_SPECIES[id] ?? null;
export const WILD_PLANT_IDS = Object.freeze(PLANT_IDS.filter(id => PLANT_SPECIES[id].habitat !== 'field'));
export const PLANT_USES = Object.freeze(['wound', 'remedy', 'food', 'craft', 'trade', 'warning', 'tree']);
/** The trees, which are named and not taken. */
export const TREE_IDS = Object.freeze(PLANT_IDS.filter(id => PLANT_SPECIES[id].use === 'tree'));

export const BOTANY_LESSON = Object.freeze([
  'Right. Every plant in this country is doing one of four things for you: stopping blood, bringing a fever down, filling a belly, or waiting for you to be careless. Most of them will do the fourth one if you get the first three wrong.',
  'Look at the leaf, look at where it stands, and look at what it is next to. The ivy that itches keeps company with the weed that cures it. The sumac you can drink holds its fruit up red; the one that blisters hangs it down white. Nothing here is hiding from you. It simply will not repeat itself.',
  'Go and look. Press F where you find one and I will have taught you enough to know it again — and if a thing is worth carrying, carry it. What is not goes in your head, where it weighs nothing.',
]);

export function validateBotanySnapshot(data, { allowMissing = true } = {}) {
  if (data === undefined) return allowMissing;
  if (!data || typeof data !== 'object' || Array.isArray(data) || data.version !== BOTANY_VERSION) return false;
  if (typeof data.met !== 'boolean' || !data.found || typeof data.found !== 'object' || Array.isArray(data.found)) return false;
  if (data.askedAboutJimson !== undefined && typeof data.askedAboutJimson !== 'boolean') return false;
  return Object.entries(data.found).every(([id, count]) => Object.hasOwn(PLANT_SPECIES, id) && Number.isInteger(count) && count >= 1 && count <= 1e6);
}

export function createBotany({ skills, onEvent = () => {} } = {}) {
  const state = { met: false, found: {}, askedAboutJimson: false };

  function meet() {
    const first = !state.met;
    state.met = true;
    const learned = skills?.learn?.(BOTANY_SKILL) ?? { ok: false };
    if (first) onEvent({ type: 'botany-learned' });
    return { ok: true, first, ...learned };
  }

  /**
   * The traveler has found one and looked at it properly. What is worth carrying
   * goes into the satchel under its own item; the rest is named and left growing.
   */
  function find(id, inventory = null) {
    if (!state.met) return { ok: false, reason: 'A plant, and no name for it. Nell Harrow, on the edge of the village, has a name for everything here.' };
    const species = PLANT_SPECIES[id];
    if (!species) return { ok: false, reason: 'That is not a plant anyone here can name.' };
    const first = !state.found[id];
    state.found[id] = (state.found[id] ?? 0) + 1;
    const gained = first ? skills?.gain?.(BOTANY_SKILL, species.xp) ?? { ok: false } : null;
    // Bloodroot, mayapple and pokeweed are named and left standing; everything
    // else is worth a place in the satchel, each under its own item.
    const carries = species.use !== 'tree' && (species.use !== 'warning' || species.item !== HERB_ITEM);
    const amount = species.yield ?? 1;
    const taken = carries ? !!inventory?.add?.(species.item, amount) : false;
    onEvent({ type: 'plant-found', id, first, taken });
    return { ok: true, first, species, taken, amount: taken ? amount : 0, count: state.found[id], xp: first ? species.xp : 0,
      level: skills?.level?.(BOTANY_SKILL) ?? 1, levelled: !!gained?.levelled };
  }

  const foundCount = () => Object.keys(state.found).length;

  function view() {
    return {
      met: state.met, foundCount: foundCount(), total: PLANT_IDS.length,
      entries: PLANT_IDS.map(id => ({ id, found: !!state.found[id], count: state.found[id] ?? 0,
        use: PLANT_SPECIES[id].use, warning: !!PLANT_SPECIES[id].warning,
        name: state.found[id] ? PLANT_SPECIES[id].name : 'A plant you have not named',
        detail: state.found[id] ? PLANT_SPECIES[id].note
          : state.met ? (PLANT_SPECIES[id].where ? `Stands in ${PLANT_SPECIES[id].where}.` : `Grows on ${HABITAT_WORDS[PLANT_SPECIES[id].habitat] ?? PLANT_SPECIES[id].habitat}.`)
          : 'Nell Harrow keeps a drying shed on the outskirts of Tidehaven.' })),
    };
  }

  function snapshot() { return { version: BOTANY_VERSION, met: state.met, found: { ...state.found }, askedAboutJimson: state.askedAboutJimson }; }

  function restore(data) {
    state.met = false; state.found = {}; state.askedAboutJimson = false;
    if (!validateBotanySnapshot(data, { allowMissing: false })) return false;
    state.met = data.met; state.found = { ...data.found }; state.askedAboutJimson = !!data.askedAboutJimson;
    return true;
  }

  return { meet, find, view, snapshot, restore, foundCount,
    get met() { return state.met; }, get found() { return { ...state.found }; },
    get askedAboutJimson() { return state.askedAboutJimson; },
    askAboutJimson() { state.askedAboutJimson = true; },
    hasFound: id => !!state.found[id] };
}

const HABITAT_WORDS = Object.freeze({
  verge: 'the roadside and the field edge', wood: 'the oak wood', damp: 'wet shade by water',
  clearing: 'old fields and clearings', river: 'tidal mud at the river', field: 'the tobacco ground',
  waste: 'trodden waste ground nobody keeps',
});

/** Nell Harrow's conversation. `act` runs 'learn-botany' in the host. */
export function botanistConversation(npc, context) {
  const { botany, jimson = null, openDialogue, closeDialogue, act } = context;
  if (npc.id !== BOTANIST.id) return false;
  const again = () => botanistConversation(npc, context);
  const leave = { id: 'leave-botanist', label: botany.met ? 'I will keep my eyes open.' : 'Another time.', action: closeDialogue };
  if (!botany.met) {
    openDialogue(npc, [
      'Mind the trays — no, behind you. That is a season of yarrow you nearly put your heel through.',
      'Nell Harrow. I dry what this country grows and I sell it to people who are too busy being ill to go and pick it themselves.',
      'You have the look of somebody about to walk a long way with nothing in their bag. Shall I teach you what is growing on either side of that road?',
    ], null, 'Back to the road', { choices: [
      { id: 'learn-botany', label: 'Teach me.', action: () => { closeDialogue(); act('learn-botany'); } },
      leave,
    ] });
    return true;
  }
  const found = PLANT_IDS.filter(id => botany.hasFound(id));
  const view = botany.view();
  const line = view.foundCount === view.total
    ? 'Every last one, including the two I hoped you would have the sense to walk past. Well. You walked past them and came back knowing what they were, which is the whole of it.'
    : view.foundCount ? `${view.foundCount} of them named. The rest are standing exactly where they have always stood, waiting for you to look down.`
    : 'Nothing yet? Look at the ground you are standing on rather than the view. This country keeps its best things at ankle height.';
  const choices = [
    { id: 'botany-hints', label: 'What should I be looking for?', action: () => {
      const missing = PLANT_IDS.filter(id => !botany.hasFound(id));
      openDialogue(npc, missing.length ? missing.slice(0, 4).map(id => `${PLANT_SPECIES[id].name}: ${PLANT_SPECIES[id].lore}`)
        : ['You have the lot of them. Bring me something from a country I have not walked and I will tell you what I think it is, and be wrong, and enjoy myself.'],
        null, 'Back to our conversation', { onComplete: again });
    } },
    ...(found.length ? [{ id: 'botany-lore', label: 'Tell me about what I have found.', action: () => openDialogue(npc,
      found.map(id => `${PLANT_SPECIES[id].name}: ${PLANT_SPECIES[id].lore}`), null, 'Back to our conversation', { onComplete: again }) }] : []),
    { id: 'botany-danger', label: 'Which ones will hurt me?', action: () => openDialogue(npc, [
      'Bloodroot bleeds orange when you break it and takes the flesh off anything it sits on long enough. Mayapple is an umbrella an inch off the floor: the fallen yellow fruit is supper and every other part of it is a purge that has killed people in a hurry.',
      'Pokeweed is the crimson stem with the black berries, head-high by autumn — three waters and the spring shoots are a dish, and the berries are poison however you cook them. And the sumac you can drink holds its red cones up. The one that hangs white berries down will blister you for a month.',
    ], null, 'Back to our conversation', { onComplete: again }) },
    // The plant behind her shed: the easy way into the jimson errand, for anyone
    // who notices it early. Asking is what unlocks picking it.
    ...(jimson?.canAsk ? [{ id: 'botany-jimson', label: 'What is that rank thing behind your shed?', action: () => {
      botany.askAboutJimson(); jimson.askedNell?.();
      openDialogue(npc, [
        'That. That is jimson weed, and before you ask: no, I did not plant it, and no, I will not pull it up.',
        'I keep it where I can see it. Every few years somebody boils it for greens the way a garrison did up the river once, and spends eleven days talking to people who are not in the room. If it is going to grow in this village it can grow where I am standing over it.',
        'The pods are the spiked ones. If you are fetching them for Toft — and you are, he has asked everybody — take them off my plant rather than go crawling round the waste ground for a wild one. And tell him from me that I know exactly what he is like.',
      ], null, 'Back to our conversation', { onComplete: again });
    } }] : []),
    { id: 'botany-lesson', label: 'Tell me again how it is done.', action: () => openDialogue(npc, [...BOTANY_LESSON], null, 'Back to our conversation', { onComplete: again }) },
    leave,
  ];
  openDialogue(npc, [line], null, 'Back to the road', { choices });
  return true;
}

/**
 * The animals of Ovesos and the Oves Desert, as ranges for the western wildlife rigs
 * (`src/west-regions-life.js` draws them, instanced and distance-culled, and they are ambient:
 * nobody can attack, catch or speak to them).
 *
 * **One green ribbon and two empty countries.** Both regions read `BSh` on every hex the atlas gives
 * them, so there is no climate here to sort animals by; what sorts them is water, and there is
 * almost none. The Oveth on the Ovesos|Oves Desert border is the only permanent water in either
 * country, and seven of the ten ranges below are on it or within sight of it — the otters and the
 * ducks in it, the herons at its edge, the *vel-caric* in the one strip of gallery wood in the
 * region. Out on the steppe there are hares, a harrier over the upland grass and a vulture over the
 * dry plain. In the desert there are hares on the scrub, the dry-plateau hawk over the rim hills, and
 * a vulture, and nothing else at all — **which is the honest reading of a drought-cycle range**, and
 * the lore's own: "in the dry years … the Oves becomes largely unusable for grazing."
 *
 * What the lore actually names here, and where each range comes from:
 *  - the *vel-caric*, "a small, semi-aquatic carnivore … of a creature that lives in river margins",
 *    documented on the Carica two countries north and at home on any inner-branch river;
 *  - the **dry-plateau hawk**, which "hunts the upland grasslands" of the eastern rain-shadow
 *    country — and with the Oves Desert `BSh` behind a rain-shadow ridge, this is that country;
 *  - the Lizeem system's wading birds, "the richest avian assemblage documented on the continent",
 *    of which the Oveth is a branch;
 *  - everything else is an extension and says so in its own note. Neither lore file catalogues its
 *    fauna: `ovesos.md` names only livestock, and `oves_desert.md` names no animal at all.
 *
 * **Nothing domestic, and that is most of what the lore gives.** "Livestock on the upland ridges —
 * cattle and short-legged sheep adapted to rolling terrain — is the economy", and every one of those
 * animals belongs to an upland herding community, who are people; a flock with nobody near it is
 * still somebody's flock. No sheep, no cattle, and no Sorten grazing of any kind
 * (docs/oves-brief.md: "Domestic stock is somebody's: none").
 *
 * The two authored vulture ranges now use the existing bone-bird rig. Their
 * original turkey-vulture stand-in predated that rig; IDs, sites and populations
 * are unchanged. Road foxes and spine lizards have rigs too, but no new population
 * is inferred here from that availability. The nocturnal sand-cat remains deferred.
 *
 * Every home site below was measured on the built world, not guessed, and `tests/oves-world.test.js`
 * holds each one to its ground.
 */
const freeze = Object.freeze;
const zone = (id, species, region, radius, box, sites, note, traits = {}) => freeze({
  id, species, region, radius, scale: 1, keepRegion: true,
  minX: box[0], maxX: box[1], minZ: box[2], maxZ: box[3],
  sites: freeze(sites.map(site => freeze(site))), note, ...traits,
});

export const OVES_WILDLIFE_ZONES = freeze([
  // ---------------------------------------------------------------------
  // The Oveth: the only wet place in either country
  // ---------------------------------------------------------------------
  zone('oveth-otters', 'otter', 'Ovesos', .35, [-2000, -1905, 825, 865], [[-1982, 842], [-1925, 844]],
    'The Carica’s otter two countries north, on the next inner branch down. The Sorten’s reach is the only deep water in either country — "navigable for light boats", the lore says of it — so this is the one place in a hundred square miles an otter could live, and the deep water it dives into when it is walked at is that reach and nothing else. Extension: neither lore file catalogues its fauna.',
    { scale: 1.2 }),
  zone('oveth-ducks', 'duck', 'Ovesos', .3, [-2010, -1990, 785, 838],
    [[-2000, 793], [-2000, 802], [-2000, 811], [-2000, 820], [-1999, 829]],
    'Duck on the Oveth’s slow reach through the Sorten, floating. On a steppe with one river the whole of the country’s waterfowl is on a few hundred paces of it, which is why they are a raft and not a scatter.',
    { float: true }),
  zone('oveth-herons', 'wading-bird', 'Ovesos', .4, [-1930, -1848, 818, 868], [[-1915, 833], [-1895, 831], [-1861, 853]],
    'The fauna overview calls the Lizeem system’s wading birds "the richest avian assemblage documented on the continent" and names herons first in it; the Oveth is one of the five branches that feed it. Standing a pace off the water at the Sorten’s lower end, clear of the deep-water reach.'),
  zone('oveth-foxes', 'river-fox', 'Ovesos', .32, [-2085, -1940, 765, 872], [[-1958, 848], [-1993, 800]],
    'The *vel-caric*: "a small, semi-aquatic carnivore with a distinctive dark-tipped tail and the narrow, mobile face of a creature that lives in river margins", documented on the Carica two countries north. The gallery of poplar, willow and tamarisk along the Oveth is the only cover in Ovesos and this is the only river margin. A fox that never flees is also the one animal in either country that will look at a traveler instead of leaving: it drifts back as fast as anybody comes on and keeps an arm’s length, which is why its range is the widest of the four on the river.'),
  // ---------------------------------------------------------------------
  // The steppe
  // ---------------------------------------------------------------------
  zone('oves-upland-hares', 'upland-hare', 'Ovesos', .3, [-2115, -1985, 545, 660], [[-2060, 585], [-2030, 605], [-2075, 622], [-2040, 570]],
    'Extension: the Ganoss upland hare, the hare the west already has, on the northern grassland rows — bunch grass in tussocks with bare earth between them, which is the same short-grazed open ground it keeps on the Vastos plain and in Gala’s dry north across the river.'),
  zone('oves-harrier', 'harrier', 'Ovesos', .3, [-2060, -1845, 550, 655], [[-1950, 600]],
    'Extension: neither lore file names a raptor. A steppe of bunch grass is a harrier’s whole living, as Nethereum’s wet meadow is, and a harrier quarters low over it rather than soaring — nine metres up, following the ground as it rises and falls under the beat.',
    { air: 9, circle: 34, period: 19, quarter: 70, bob: 1.6, follow: true }),
  zone('oves-plain-vulture', 'bone-bird', 'Ovesos', .3, [-1890, -1700, 700, 850], [[-1790, 772]],
    'The overview\'s large scavenger of the desert margins over the dry southern plain. This authored range originally used a turkey-vulture while the bone-bird rig was unavailable; the existing bone-bird now fills that same range, with its original ID and site preserved.',
    { air: 38 }),
  // ---------------------------------------------------------------------
  // The desert, where there is very little
  // ---------------------------------------------------------------------
  zone('oves-desert-hares', 'upland-hare', 'Oves Desert', .3, [-2320, -2180, 850, 950], [[-2270, 890], [-2240, 915], [-2214, 896]],
    'Extension, at the animal’s dry limit: hares on the perennial scrub of the wedge, in the low-gradient pockets where the thin soil has gathered and there is something to sit under. The lore has the Ovesos pastoral communities bringing animals here in wet years and not in dry ones; in a dry year the hares are what is left.'),
  zone('oves-rim-hawk', 'plateau-hawk', 'Oves Desert', .3, [-2530, -2375, 730, 890], [[-2452, 806]],
    'The fauna overview’s dry-plateau hawk, which "hunts the upland grasslands" of the eastern rain-shadow country and reaches its densest concentrations on the rocky east-facing slopes of East Pyros — which is the far side of this ridge. It is not an extension here: this is the bird’s own country, riding the air over the rim hills.',
    { air: 34 }),
  zone('oves-wedge-vulture', 'bone-bird', 'Oves Desert', .3, [-2320, -2130, 812, 958], [[-2222, 884]],
    'Extension: one vulture over the dry wedge, on the damp reach, because the overview says of the Moroshé’s bone-birds that "they are often the first indicator of water" and the damp reach is the nearest thing to water the Oves has. It is also the only large animal a traveler crossing the desert will see, which is the truthful population of a range that is unusable several years in every decade.',
    { air: 36 }),
]);

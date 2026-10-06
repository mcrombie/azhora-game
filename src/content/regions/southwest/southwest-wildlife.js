/**
 * The animals of Navarth, West Pyros, the Ganesh Desert and the Ganesh Plain, as ranges for the
 * western wildlife rigs (`src/content/regions/western-regions/west-regions-life.js` draws them, instanced and distance-culled, and
 * they are ambient: nobody can attack, catch or speak to them).
 *
 * **Two jobs, two hundred and two hexes, twenty-five ranges, and five sixths of them in one eighth
 * of the ground.** Job 1's seventeen are below - with the **ghubr** added to them on 2026-10-01, which
 * is the eighteenth - and job 2's seven are at the end of the list, and the arithmetic between them is
 * the whole argument of both: seven of job 1's are on the Vaellir or its green mouth, and the four
 * Meroshe deserts - ninety-five hexes, `BWh` on every one, no permanent water and no green corner
 * anywhere - carry **seven**, five of them birds in the air.
 *
 * **One river, one wood, eight hollows, and a great deal of nothing.** Eighty-one of this block's
 * hundred and seven hexes read `BWh` - hot desert - on the World Builder map, which is a full
 * climate step drier than the Oves Desert's `BSh`, and the Oves's own report already argued that
 * emptiness is the honest reading of a dry country rather than a failure to fill it. So the
 * eighteen ranges below are not spread evenly: **seven of them are on the Vaellir or its green
 * mouth**, because the great river is the only permanent water in the southwest and everything that
 * needs water is on it; three are on Navarth's plateau and at the one hex of wood at its tip; four
 * are in the Ganesh Plain's depressions, which is where the grass goes in a drought phase; and
 * **the Ganesh Desert, which is the largest of the four countries at thirty-one hexes, has four**,
 * two of them birds in the air. That is the truthful population of a country whose own lore says
 * "the Ganesh in a severe dry year presents a surface that appears essentially lifeless."
 *
 * What the lore actually names here, and where each range comes from:
 *  - the **bone-bird**, "the large scavenger of the desert margins... a heavy, bald-headed vulture
 *    relative with a wingspan approaching two and a half meters", which the overview says is "the
 *    most visible large animal of the Moreshe from caravan routes" and is "often the first indicator
 *    of water, since both potential death and potential life concentrate around it". This is its own
 *    ground - the Ganesh is the northern margin of the Moreshe desert system - and it is the one new
 *    rig this job spent (`src/content/regions/western-regions/west-regions-life.js`);
 *  - the **dry-plateau hawk**, which "hunts the upland grasslands" of the eastern rain-shadow
 *    country, over Navarth's rim, which is exactly that;
 *  - everything else is an extension and says so in its own note.
 *
 * **What is deliberately absent, and why.** The overview's other animals for this quarter cannot be
 * built honestly:
 *  - the **terrace leopard** of West Pyros is a predator of terraced slopes, and the atlas gives
 *    West Pyros no hills at all and nobody to build the terraces;
 *  - the **road fox** is "associated with caravan routes and settlement edges", which are people;
 *  - the **spine lizard** wants a gait the game has not got (bask long, then dart) and the
 *    **sand-cat** cannot be built at all until there is a night for it to be nocturnal in;
 *  - the **river fox** - the *vel-caric* - is not here either, and that is a measurement rather than
 *    a judgement. It is an animal of the Lizeem's inner branches, the Vaellir is not in that system,
 *    and the one river margin in Navarth is the Alezhor Water, which runs **on the border** with
 *    unbuilt country: measured, the widest clear run behind any point of its own bank is twelve
 *    metres, and a fox that never flees needs a hundred. There is nowhere in this block to put one.
 *  - the **Ganesh dustback** was left out on purpose by three jobs running, in each of their open
 *    questions: the lore describes its behaviour and never its body, and the only dustback the rest of
 *    the lore describes is a domestic bovid, which is somebody's. **It is built now** - the user's
 *    answer on 2026-10-01 was that the behaviour is the description - and it is the **ghubr**, below.
 *    The Moroshé bovid is still somebody's and is still not built.
 *
 * **Nothing domestic.** Navarth's whole export is the grey sheep, the Ganesh Plain's whole economy
 * is the pastoral herds that move by the drought cycle, and the caravan crossing runs on pack
 * animals. Every one of those belongs to people; a flock with nobody near it is still somebody's
 * flock. There is none.
 *
 * Every home site below was measured on the built world, not guessed, and
 * `tests/southwest-world.test.js` holds each one to its ground.
 */
const freeze = Object.freeze;
const zone = (id, species, region, radius, box, sites, note, traits = {}) => freeze({
  id, species, region, radius, scale: 1, keepRegion: true,
  minX: box[0], maxX: box[1], minZ: box[2], maxZ: box[3],
  sites: freeze(sites.map(site => freeze(site))), note, ...traits,
});

export const SOUTHWEST_WILDLIFE_ZONES = freeze([
  // ---------------------------------------------------------------------
  // Navarth: the plateau, and the one hex of wood at the top of it
  // ---------------------------------------------------------------------
  zone('navarth-hares', 'upland-hare', 'Navarth', .3, [-3410, -3281, 1069, 1257], [[-3321, 1217], [-3370, 1209], [-3370, 1109]],
    'Extension: the west’s upland hare on the sweeps between the plateau’s swells, which is the one ground in the southwest that is both open and has something growing on it every year. It is the same short bare scrub the animal already keeps on the Vastos plain, in Gala’s dry north and in the Oves, taken one climate step drier - and this is as dry as it goes. There are none in the Ganesh below the rim.'),
  zone('navarth-wood-deer', 'red-deer', 'Navarth', .3, [-3345, -3184, 853, 970], [[-3224, 923], [-3305, 930], [-3303, 893]],
    'Extension: deer on the open ground at the edge of the north wood, the block’s one `forest` hex, where the air turns `Csb` and the South and East Ibenwood begin over the border. A deer is seen where a wood has open ground beside it, and this is the only wood in a hundred and seven hexes with anything at all beside it. Two hundred paces south of here the ground is hot desert and there is nothing for a deer to eat.'),
  zone('navarth-rim-hawk', 'plateau-hawk', 'Navarth', .3, [-3560, -3400, 1120, 1280], [[-3480, 1200]],
    'The fauna overview’s dry-plateau hawk, which "hunts the upland grasslands" of the eastern rain-shadow country. **Not an extension**: this is an upland grassland in rain-shadow country, and from the western rim the bird has thirty metres of fall and the whole Ganesh under it. The Oves’s rim hawk is the same argument one country east.',
    { air: 33 }),
  // ---------------------------------------------------------------------
  // West Pyros: the Vaellir, which is where nearly everything alive in the southwest is
  // ---------------------------------------------------------------------
  zone('vaellir-otters', 'otter', 'West Pyros', .35, [-2901, -2817, 1188, 1299], [[-2861, 1228], [-2857, 1259]],
    'Extension by one river system: the Carica’s otter, on the one piece of deep permanent water in the southwest. The Vaellir below its ford is slow, deep and walled, which is what an otter wants and what it has to be able to go into when it is walked at - and there is nothing else within forty miles that it could.',
    { scale: 1.2 }),
  zone('vaellir-herons', 'wading-bird', 'West Pyros', .4, [-2955, -2853, 1090, 1234], [[-2915, 1130], [-2908, 1162], [-2893, 1194]],
    'Extension: the overview’s wading assemblage is catalogued on the Lizeem system and the Vaellir is a different river reaching a different sea, so these are the same birds on the nearest equivalent water rather than the documented population. A large slow river with a gallery on it is a heron’s living wherever it runs.'),
  zone('vaellir-ducks', 'duck', 'West Pyros', .3, [-3078, -2933, 889, 1066], [[-3040, 931], [-3011, 947], [-3002, 975], [-2974, 1028], [-2951, 1047]],
    'Duck on the Vaellir’s ford reach, floating: the upper quarter where the atlas draws the river `small` and it runs shin-deep and quick over gravel. Below the ford it is a wall of deep water and no duck sits on it. They are a raft rather than a scatter because in this whole quarter of the continent there is one place for waterfowl to be.',
    { float: true }),
  zone('vaellir-mouth-stilts', 'stilt', 'West Pyros', .35, [-2666, -2559, 1468, 1600], [[-2626, 1508], [-2617, 1538], [-2599, 1560]],
    'Extension: stilts on the last silt before the river reaches the sea, where the banks flatten out and the water goes wide and shallow over its own bars. It is the same ground the Mithala’s river-mouth stilts stand on at the other end of the continent, and for the same reason: fresh water meeting salt puts more in the mud than either does alone.'),
  zone('green-tip-gulls', 'gull', 'West Pyros', .3, [-2619, -2486, 1641, 1746], [[-2579, 1706], [-2548, 1681], [-2526, 1706]],
    'Gulls over the green tip, which is the block’s one hex of `Csa` Mediterranean grass and the only piece of sea coast in the southwest a traveler can stand on and find anything growing. They are here because the sea is: this is the mouth of the largest river in the quarter and the gulls work it the way they work every mouth on the Iberos.'),
  zone('pyros-hares', 'upland-hare', 'West Pyros', .3, [-3049, -2871, 1194, 1326], [[-2911, 1286], [-3009, 1277], [-2963, 1283], [-2997, 1234]],
    'Extension: hares on the open plain’s bunch grass, a few hundred metres back from the river where the tussocks stand furthest apart. The `BSh` columns are the only proper steppe in the southwest and this is the animal that lives on steppe everywhere else in the game.'),
  zone('pyros-harrier', 'harrier', 'West Pyros', .3, [-2992, -2832, 1149, 1309], [[-2912, 1229]],
    'Extension: no lore file for this quarter names a raptor over open ground. Eight hundred metres of bunch grass with one line of trees down the side of it is a harrier’s whole living, and a harrier quarters low over it rather than soaring - nine metres up, following the ground as it rises and falls under the beat.',
    { air: 9, circle: 34, period: 19, quarter: 70, bob: 1.6, follow: true }),
  // ---------------------------------------------------------------------
  // The Ganesh Desert: three ranges over thirty-one hexes, and that is the honest reading
  // ---------------------------------------------------------------------
  zone('ganesh-bone-birds', 'bone-bird', 'Ganesh Desert', .3, [-3640, -3440, 1370, 1530], [[-3515, 1449], [-3590, 1480]],
    'The fauna overview’s own animal on its own ground: "the large scavenger of the desert margins... the most visible large animals of the Moreshe from caravan routes". The Ganesh is the northern margin of that desert system and this is the country the bird is named for. Two of them, a long way up and a long way apart, over ground with nothing else moving on it - which is what a traveler crossing this desert actually sees.',
    { air: 44 }),
  zone('damp-reach-bone-bird', 'bone-bird', 'Ganesh Desert', .3, [-3591, -3431, 1487, 1647], [[-3511, 1567]],
    'A third bone-bird, and it is over the damp reach, because the overview says of them that "they are often the first indicator of water, since both potential death and potential life concentrate around it" - and the damp reach is the nearest thing to water in the Ganesh. A traveler who sees this bird from a mile off and walks to it finds green scrub in a dry bed and nothing to drink.',
    { air: 38 }),
  /**
   * **The ghubr, the Ganesh dustback, and it is the one animal this country's own lore names that the
   * block had left unbuilt.** Three jobs held it out because they went looking for a body and the lore
   * gives a behaviour; the user's answer (2026-10-01) was that the behaviour is the description. Every
   * line of it is in `ganesh_desert.md` and in two language files, and the rig argues it at length
   * (`src/content/regions/western-regions/west-regions-life.js`): small, dry, insectivorous, of the **northern desert margin**, with the
   * **pale powdery ridge along the spine and shoulders** that is what the name means, moving at the
   * surface and resting in shade. **That it is a bird rather than a small mammal is the builder's choice
   * and is labelled as the builder's**, argued at the rig from the wind, the daylight and the lore's own
   * insistence that this is not the bovid.
   *
   * **It is not domestic stock**, and the block's standing rule is untouched: the Moroshé dustback - the
   * oasis houses' bovid, the thing their standing is counted in - is somebody's and stays unbuilt.
   */
  zone('ganesh-ghubr', 'ghubr', 'Ganesh Desert', .3, [-3569, -3448, 1258, 1409], [[-3507, 1338], [-3468, 1389], [-3549, 1278]],
    '**The ghubr**, the Ganesh dustback, in the northern desert margin the lore puts it in - these three spots are on the Ganesh’s two northernmost rows of hexes. Each one is in a **sediment pocket**: `ganeshLie` reads .004, .014 and .018 where the country’s own average is about a half, which is the deepest-gathered fine sediment in the northern Ganesh and therefore where the perennial scrub stands, and the scrub is the only shade in a hundred and seven hexes. So its own rule has somewhere to be true: `shade` is how far that patch’s shadow reaches, and beyond it this bird never stands still - "the dustback does not stand still in conditions where the surface air is actively dangerous", and the game’s Ganesh is always that month. What a caravan guide sees is three birds working the open floor between the bushes, and one of them standing in one.',
    { shade: 5 }),
  zone('damp-reach-hares', 'upland-hare', 'Ganesh Desert', .3, [-3575, -3417, 1521, 1603], [[-3535, 1561], [-3457, 1563]],
    '**The only animal on the ground in the whole Ganesh Desert**, and it is on the one green thing in it. The lore is explicit about the rest: "in a severe dry year, there is nothing to eat in the Ganesh and the pastoral communities do not attempt it", and "the perennial scrub retreats toward the water-concentration points". So the scrub is at the damp reach and so is this. Extension, at the animal’s absolute dry limit - one climate step past the Oves Desert, which is where the west’s hare was already said to be at its limit.'),
  // ---------------------------------------------------------------------
  // The Ganesh Plain: everything alive is in a depression
  // ---------------------------------------------------------------------
  zone('middle-pan-hares', 'upland-hare', 'Ganesh Plain', .3, [-2915, -2762, 1626, 1788], [[-2862, 1674], [-2802, 1666], [-2875, 1748]],
    'Extension: hares in the middle depressions, which in a drought phase is the only place on this plain with grass in it - "the perennial grasses contract to the water-concentration points, the annuals disappear". The routes across the plain go from one hollow to the next for the same reason the hares are in them.'),
  zone('long-pan-hares', 'upland-hare', 'Ganesh Plain', .3, [-3108, -2958, 1627, 1754], [[-2998, 1714], [-3019, 1685], [-3068, 1667]],
    'Extension: the same animal in the western depressions, a few hundred metres nearer the desert. Two bands rather than one wide one because on this plain the hollows are the country and the open clay between them is not: a band spread across both would be walking over ground that has nothing on it.'),
  zone('ganesh-plain-harrier', 'harrier', 'Ganesh Plain', .3, [-3045, -2885, 1638, 1798], [[-2965, 1718]],
    'Extension: a harrier quartering the depression corridors, which is where everything small on this plain is. It follows the line of the hollows rather than the compass, which is also what every route across this plain does.',
    { air: 9, circle: 30, period: 18, quarter: 64, bob: 1.5, follow: true }),
  zone('ganesh-plain-bone-bird', 'bone-bird', 'Ganesh Plain', .3, [-2958, -2798, 1727, 1887], [[-2878, 1807]],
    'One bone-bird over the southern plain, which is the northern edge of its range: the overview puts the bird on the desert margins and this plain is the margin’s margin - "the Ganesh Plain lies on the northern side of the Ganesh Desert’s diffuse boundary". The pastoral communities that use this ground in the good years read the bird the way the caravan guides do.',
    { air: 40 }),
  // ---------------------------------------------------------------------
  // The four Meroshe deserts: seven ranges over ninety-five hexes
  // ---------------------------------------------------------------------
  /**
   * **Seven, and five of them are birds in the air.** Job 1's finding governs and this is it applied:
   * the Ganesh Desert carries three ranges over thirty-one hexes, which is 0.097 a hex, and this half
   * of the block carries seven over ninety-five, which is **0.074 a hex** - a quarter sparser again,
   * on ground that is `BWh` on every one of its hexes with no green corner anywhere in it and no
   * permanent water at all. **Only three of the seven stand on the ground**, and thirty-one of the
   * ninety-five hexes - the sand sea, which is the largest of the four countries - carry **one range,
   * fifty-two metres up.**
   *
   * The bone-bird is in all four quarters and nothing else is in more than one, which is the honest
   * reading of the one direct statement the lore makes about animals here: the bone-birds "are the
   * most visible large animals of the Moroshé from caravan routes". They are what you see. There is
   * nothing else to see.
   *
   * **No new rig was spent, and that is a finding rather than a saving.** Job 1 left one of its two
   * unspent and every animal the lore names for this desert is still unbuildable for the reason it was:
   * the **sand-cat** is "almost entirely nocturnal" and there is no night; the **spine lizard** wants a
   * bask-then-dart gait the game has not got, and the lore puts its largest forms in canyon country the
   * atlas does not draw on these hexes; the **canyon tortoise** is named *and* described - "a large,
   * slow-moving grazer of desert seeps and seasonal wash vegetation" - and is the closest call in the
   * job, but it fails the west's own first law rather than the lore: nothing in the west can be walked
   * down, and a tortoise is an animal whose whole character is that it can be. **(Answered 2026-10-01:
   * the law assumed every animal flees. The tortoise is built, in the Dinelv Highlands' basins, and it
   * shuts instead of running.)** The desert vipers are "known by description" and by no more than that.
   * And the **Moroshé dustback** is held out exactly where job 1 held it: the lore names it and never
   * describes its body, the only dustback the lore does describe is a domestic bovid, and inventing a
   * shape for somebody's stock is not a builder's decision. It is still not built; the *Ganesh* dustback,
   * which is a different animal and nobody's, is.
   *
   * **Nothing domestic.** The dustback herds are what an oasis house's standing is measured in and the
   * caravans run on pack animals; every one of those belongs to somebody, and a herd with nobody near
   * it is still somebody's herd.
   */
  zone('hamada-bone-birds', 'bone-bird', 'North Meroshe Desert', .3, [-3060, -2880, 1980, 2140], [[-3020, 2020], [-2920, 2100]],
    'Two bone-birds over the hamada, which is the northern margin of the Moreshe desert system and therefore the bird’s own ground twice over: "the large scavenger of the desert margins... the most visible large animals of the Moroshé from caravan routes". They are a long way up and a long way apart over a floor of bare rock with nothing else moving on it, and from the ground they are the only thing in the sky.',
    { air: 42 }),
  zone('thorn-ground-hares', 'upland-hare', 'North Meroshe Desert', .3, [-3010, -2860, 1990, 2140], [[-2930, 2060], [-2930, 2090], [-2940, 2030]],
    'Extension, and the case for it is the thorn: "flat gravel plains and exposed bedrock where scrubby thorn trees still manage to exist". The joints along the bench risers are where the last rain goes and stays, so the thorn is there and so is the one thing in the Meroshe that will eat it. It is the only woody cover in ninety-five hexes and the only shade; two hundred paces off the risers there is nothing on the rock at all.'),
  zone('fan-skirt-bone-bird', 'bone-bird', 'West Meroshe Desert', .3, [-3700, -3540, 2300, 2460], [[-3620, 2380]],
    'One bone-bird over the fan skirt, working the ground between the Dinelv escarpment and the sea. The overview says of them that "they are often the first indicator of water, since both potential death and potential life concentrate around it", and the joke of this country is that the water this one circles over is the Malhat, which is salt: a traveler who walks to the bird finds a white floor and nothing to drink.',
    { air: 40 }),
  zone('dry-shore-gulls', 'gull', 'West Meroshe Desert', .3, [-3790, -3660, 2400, 2520], [[-3740, 2430], [-3730, 2470], [-3710, 2490]],
    '**The richest life in ninety-five hexes of desert, and it comes out of the sea rather than off the land.** The atlas gives this country ten hex edges of open western ocean, and a cold-current coast against a desert is the most productive water there is - which is why an Atacama has a shore full of birds and an interior with nothing in it. So there are gulls on the last thirty metres of gravel before the surf, and forty paces inland of them the ground is as arid as it is twenty miles in. Extension: the overview catalogues the Iberos colonies on the far side of the continent and says nothing about this coast.'),
  zone('sand-sea-bone-bird', 'bone-bird', 'Central Meroshe Desert', .3, [-3120, -2960, 2340, 2500], [[-3040, 2420]],
    '**One range in thirty-one hexes, and it is fifty-two metres up.** The sand sea is the largest of these four countries and the emptiest country in Azhora: nothing lives on an active dune, the corridors between them are swept gravel with no water under them anywhere, and the lore’s verdict on the place is that crossing it without local knowledge is "one of the more reliable methods of dying on Azhora". So there is one bird, higher than any other bone-bird in the game, and under it nothing whatever.',
    { air: 52 }),
  zone('reg-bone-bird', 'bone-bird', 'South Meroshe Desert', .3, [-2920, -2760, 2680, 2840], [[-2840, 2760]],
    'One bone-bird over the stone floor, on the bare north-western side of it rather than in the fog belt, because a soaring bird wants the thermals off dark varnished pavement in clear air and gets neither under cloud. It is the fourth quarter of the Meroshe and the fourth bone-bird: one in each, which is what the overview means by calling them the most visible large animal of the whole desert.',
    { air: 38 }),
  zone('fog-margin-hares', 'upland-hare', 'South Meroshe Desert', .3, [-2720, -2600, 2700, 2840], [[-2640, 2760], [-2650, 2790], [-2680, 2780]],
    'Extension, and the strongest case for one anywhere in the Meroshe: the fog belt is the only ground in ninety-five hexes that is reliably damp. "Where desert air meets ocean-loaded humidity along the southeastern ridge, fog forms and stays, sometimes for days", and what it leaves is lichen in the lee of every pebble and thorn standing close enough together to make a traveler walk round it - cover and something green, on a hex the atlas still calls hot desert. Trogo’s rainforest is half a mile east of here and none of its animals are built.'),
  // ---------------------------------------------------------------------
  // Cape Heth, the Dinelv Highlands and Hama: fourteen ranges over seventy-three hexes
  // ---------------------------------------------------------------------
  /**
   * **Two jobs made this block emptier and this one stops it, and the arithmetic is the argument.**
   * Job 1 put seventeen ranges on a hundred and seven hexes (0.159 a hex), job 2 put seven on
   * ninety-five (**0.074**, a quarter sparser than the Ganesh, which was already the sparsest country in
   * the game), and this job puts **thirteen on seventy-three (0.178)** - the densest of the three. That
   * is not a change of standard, it is the same standard applied to different ground. (**The canyon
   * tortoise was added to the plateau on 2026-10-01**, which makes it fourteen on seventy-three, 0.192.)
   *
   *  - **Cape Heth: four ranges over nineteen hexes (0.211), and three of the four are sea birds.** The
   *    land is `BWh` on eighteen of nineteen hexes and carries one range, in the drainage hollows, which
   *    is the only ground on the cape with soil in it. Everything else here came out of the water, and
   *    a cold-current coast against a desert is the most productive water there is - which is job 2's
   *    own argument for its dry-shore gulls, and this cape has twenty-one hex edges of it against the
   *    West Meroshe's ten.
   *  - **Dinelv Highlands: four ranges over thirty-five hexes (0.114), and five after the tortoise.** A
   *    desert plateau with no permanent water, so two of them are birds in the air over the escarpment and
   *    the tables, and the ones on the ground are all in basins, because the basins are the only ground on
   *    this plateau with close cover or grass. Thirty-one of the thirty-five hexes carry nothing at all.
   *  - **Hama: five ranges over nineteen hexes (0.263), the densest country in nine.** Nine of its hexes
   *    are `Csb` Mediterranean grassland with ocean on two sides, and that is genuinely richer country
   *    than anything in the block except the Vaellir - whose own West Pyros carries 0.259 a hex. The
   *    fifth range is the one that is *not* in the grass: a bone-bird over the dry half, and the point of
   *    it is where it stops.
   *
   * **No new rig, and the block has now built nine countries on job 1's one.** Every species here is
   * already in `src/content/regions/western-regions/west-regions-life.js`. Two calls were close:
   *
   *  - **the Ganesh dustback stays out, exactly where jobs 1 and 2 left it.** The lore names it and never
   *    describes its body, the only dustback the lore *does* describe is a domestic bovid, and inventing
   *    a body for a named animal is the user's decision and not a builder's. **(Answered 2026-10-01: it
   *    is the ghubr, in job 1's Ganesh Desert above.)**
   *  - **the canyon tortoise got closer and still fails.** `dinelv_highlands.md` puts the highland
   *    communities' own trade with "the canyon peoples further interior", and the overview's tortoise is
   *    "a large, slow-moving grazer of desert seeps and seasonal wash vegetation" - which is precisely
   *    what `DINELV_BASINS` are, so this plateau is the best home the game has ever had for it. It still
   *    fails `tests/west-life.test.js`'s first law, that nothing in the west can be walked down, and an
   *    animal whose whole character is that it can be needs either a burrow to go into or an exemption in
   *    the law. Both are design decisions. **(Answered 2026-10-01: neither. The law asked a question that
   *    assumed flight; it now asks the right one, and the tortoise is in this plateau's north gap basin
   *    above, which is exactly the home job 3 found for it.)**
   *
   * **Nothing domestic.** The plateau's pastoral communities move their herds between the water points
   * by season, the highland breeds' fibre is what the court cannot tax, and Hama's food comes in by sea;
   * every animal in any of that belongs to somebody, and a herd with nobody near it is still somebody's.
   */
  zone('heth-point-plungers', 'sea-plunger', 'Cape Heth', .3, [-4299, -4192, 1808, 1894], [[-4232, 1848], [-4259, 1854]],
    'The Great White Sea-plunger, which the overview puts on "the exposed Legemum headlands" and whose "vertical dives from height into the Iberos shoals" it calls one of the more visible demonstrations of the sea’s productivity. Extension, and the best-argued one in the block: Legemum is a quarter of the continent east, and **this is the other exposed headland on the atlas** - the westernmost land in Azhora, four hundred metres further out than anything else, with the cold current the lore builds this whole cape on running past the end of it. Circling off the point and folding into the water in turn.',
    { air: 22, circle: 26, period: 17, bob: 1.4, plunge: freeze({ every: 9, fall: 1.1, under: 1.8, climb: 3.2 }) }),
  zone('heth-point-gulls', 'gull', 'Cape Heth', .3, [-4270, -4164, 1820, 1926], [[-4204, 1868], [-4223, 1886], [-4230, 1860]],
    'Gulls on the point’s bare rock, and they are here for the same reason the cape matters to anybody: a low promontory reaching into a cold current is where the sea concentrates. Extension - the overview catalogues the Iberos colonies on the far side of the continent and says nothing about this coast. Forty paces inland of them the ground is hot desert and has nothing on it, which is the same joke job 2 found on the fan skirt’s shore and this cape tells three times over, once on each side.'),
  zone('heth-bight-waders', 'wading-bird', 'Cape Heth', .4, [-4068, -3925, 1674, 1803], [[-3985, 1739], [-3965, 1714], [-4028, 1763]],
    'Waders on the sheltered northern shore, in the angle the lore calls the Heth Bight: "too shallow for deep-draft vessels but provides additional shelter for the small-boat traffic... and it is the productive zone for the shallow-water fishing that the cape communities use to supplement the offshore catch". Shallow water over sand with a flat calm on it is a wading bird’s living anywhere, and this is the only sheltered water on four hundred metres of coast. Extension: the overview’s wading assemblage is catalogued on the Lizeem.'),
  zone('heth-hollow-hares', 'upland-hare', 'Cape Heth', .3, [-4110, -4004, 1860, 1966], [[-4044, 1908], [-4063, 1926], [-4070, 1900]],
    '**The only animal on the ground in the whole of Cape Heth**, and it is in the drainage hollows, because they hold every scrap of soil the cape has - "gardens on the soil that has accumulated in the drainage hollows". Extension, at the same dry limit the Ganesh’s damp reach put the west’s hare at, with salt instead of drought doing the work: eighty paces up the ridge from here the spray gets over the top in a winter storm and nothing grows at all.'),
  zone('dinelv-rim-hawk', 'plateau-hawk', 'Dinelv Highlands', .3, [-3826, -3746, 2033, 2113], [[-3786, 2073]],
    'The fauna overview’s dry-plateau hawk, which "hunts the upland grasslands" of the rain-shadow country. **Not an extension**: this is an arid upland in rain-shadow country and it is the largest one on the atlas. From the rim here the bird has ninety metres of fall under it and the whole fan skirt, the salt pan and the western ocean beyond that - more air below a raptor than anywhere else in the southwest. Job 1 put the same bird on Navarth’s western rim, which is this argument at half the height.',
    { air: 33 }),
  zone('dinelv-table-bone-bird', 'bone-bird', 'Dinelv Highlands', .3, [-3495, -3415, 1974, 2054], [[-3455, 2014]],
    'One bone-bird over the tables, and it is here for the cliffs rather than for the carrion: the three mesas are the only vertical rock in a hundred and seventy hexes of desert, and a bird with two and a half metres of wing over hot ground beside a cliff has lift for nothing. The overview calls them "the most visible large animals of the Moroshé from caravan routes", and the caravan route that matters to this country climbs past here to the Meroshe crossing. It is the ninth of the block’s bone-birds and the highest ground any of them works.',
    { air: 40 }),
  zone('dinelv-basin-hares', 'upland-hare', 'Dinelv Highlands', .3, [-3473, -3374, 1914, 2038], [[-3414, 1980], [-3433, 1998], [-3417, 1954]],
    'Extension: hares in the eastern basins, which are the plateau’s water points and the only ground on it that is not bare between the plants - "the deeper-rooted plants occupying the water-concentration points that only become visible in wet years when they green faster than the surrounding ground". The scrub in a basin stands close enough to hide in and the plateau outside one does not, so the animals are in the basins for the same reason the routes and the herds are.'),
  /**
   * **The canyon tortoise, in the third of the plateau's four basins, and the law was changed rather
   * than the animal.** Job 2 raised it, job 3 found its home and job 4 held it out for the same reason
   * all three did: the west's first law is that nothing in it can be walked down, and a tortoise plainly
   * can be. The user's answer (2026-10-01): **the law assumed every animal flees, and a tortoise does
   * not - it stops and shuts.** So that is built as its actual behaviour (`SHUT` in
   * `src/content/regions/western-regions/west-regions-life.js`), the law in `tests/west-life.test.js` now asks of an animal that shuts
   * whether walking it down *got anybody anything*, and nothing is exempted: it is the one animal in the
   * game that can be reached, and reaching it achieves nothing.
   */
  zone('dinelv-basin-tortoises', 'canyon-tortoise', 'Dinelv Highlands', .4, [-3486, -3414, 1814, 1880], [[-3450, 1847], [-3466, 1834], [-3434, 1860]],
    'The fauna overview’s own animal in the lore’s own habitat: "the **canyon tortoise**, a large, slow-moving grazer of desert seeps and seasonal wash vegetation, may live as long as two centuries". The north gap basin is a desert seep in `dinelv_highlands.md`’s own words - "the water-concentration points that only become visible in wet years when they green faster than the surrounding ground" - and it is the third of the plateau’s four, the two hare bands having the other two and the rim gap having nothing. Three animals in seventy metres of basin floor, which is a tortoise’s whole world: the range is the smallest in the block because this animal does not go anywhere. Walked up to, it shuts, and that is the one thing in the west a traveler can reach.'),
  zone('dinelv-saddle-hares', 'upland-hare', 'Dinelv Highlands', .3, [-3700, -3594, 1914, 2020], [[-3634, 1980], [-3637, 1954], [-3660, 1977]],
    'Extension: the same animal in the wide western basin under the Middle Saddle, two hundred and twenty metres from the eastern ones with a ridge crest between. Two bands rather than one for the reason job 1 gave on the Ganesh Plain’s depressions: on this plateau the basins are the country and the ridges between them have nothing on them, so a band spread over both would be walking over bare rock for half its range.'),
  zone('hama-sward-hares', 'upland-hare', 'Hama', .3, [-3291, -3171, 2860, 2963], [[-3224, 2900], [-3251, 2906], [-3211, 2923]],
    'Hares in the seaward sward, and after two hundred hexes of desert this is the first range in the block since the Vaellir’s own plain that is on grass because of the weather rather than because of a hollow. Extension: the west’s hare on `Csb` Mediterranean grassland, which is the ground it keeps on the Ascarth peninsula and in Gala’s green south. Two hundred paces north-east of here the grass gives out and there are none.'),
  zone('hama-bed-hares', 'upland-hare', 'Hama', .3, [-3470, -3362, 2708, 2814], [[-3405, 2774], [-3402, 2748], [-3430, 2765]],
    'Extension: a second band in the north winter bed, where the greenest grass in the southwest stands in a dry channel floor. `Csb` means the rain comes in winter and the summer is not wet, so in the face the world can show these beds are dry and the grass in them is what the last of the water left - which is the damp reach’s argument in the Ganesh, on a country wet enough that it is grass and not scrub.'),
  zone('hama-harrier', 'harrier', 'Hama', .3, [-3184, -3104, 2920, 3000], [[-3144, 2960]],
    'Extension: a harrier quartering the seaward grass. No lore file for this corner names a raptor, and two hexes of thick Mediterranean sward between a stony rise and an ocean is a harrier’s whole living - it beats low and follows the ground rather than soaring, the way the one on West Pyros’s plain and the one over the Ganesh Plain’s hollows do. It turns back at the line: there is nothing for it to hunt on the gravel.',
    { air: 9, circle: 32, period: 18, quarter: 66, bob: 1.5, follow: true }),
  zone('hama-corner-gulls', 'gull', 'Hama', .3, [-3420, -3314, 2857, 2963], [[-3354, 2905], [-3373, 2923], [-3380, 2897]],
    'Gulls at the corner where the western ocean and the southern ocean meet - "the southwestern tip of the Dinova Peninsula... where the peninsula’s two coasts converge and the open-ocean approaches narrow toward the cape". **This is the only shore in the southwest where the grass comes down to within thirty paces of the water**: the Ganesh’s gulf, the fan skirt’s dry shore and the Meroshe’s southern beach are all desert to the surf, and the gulls on those are the only living thing for a mile. These ones have a green country behind them.'),
  zone('hama-line-bone-bird', 'bone-bird', 'Hama', .3, [-3054, -2974, 2860, 2940], [[-3014, 2900]],
    '**The last bone-bird, and the point of it is where it stops.** Job 2 put one in each of the four Meroshe quarters and called them what the lore calls them, "the most visible large animals of the Moroshé"; this one works Hama’s stony inland half, which is hot desert like all of it, and does not cross the line. Two hundred paces south-west of the end of its range the ground is Mediterranean grass with a harrier over it. The bird is the desert’s and the desert ends here.',
    { air: 38 }),
  // ---------------------------------------------------------------------
  // Marosh and Trogo: seventeen ranges over forty-seven hexes, and the densest country in the game
  // ---------------------------------------------------------------------
  /**
   * **The block stops being a desert and the arithmetic says so.** Job 1 put seventeen ranges on a
   * hundred and seven hexes (0.159 a hex), job 2 seven on ninety-five (**0.074**, the emptiest country
   * in Azhora), job 3 thirteen on seventy-three (0.178), and job 4 puts **seventeen on forty-seven
   * (0.362)** - twice job 3's and nearly five times job 2's:
   *
   *  - **Trogo: eleven ranges over twenty-nine hexes (0.379), the densest country in the game.** That is
   *    what `Af` means. Twenty-two hexes of closed tropical canopy with rain in every month of the year,
   *    a permanent river through them, an estuary at the mouth of it and thirty hex edges of productive
   *    warm ocean is the richest ground the atlas draws anywhere, and drawing it as sparse as the Meroshe
   *    would be the same lie in the opposite direction. The comparison worth making is the one across
   *    thirteen hex edges: **the South Meroshe carries two ranges over twenty-one hexes and Trogo eleven
   *    over twenty-nine**, and a traveler can walk from one to the other in four hundred paces.
   *  - **Marosh: six ranges over eighteen hexes (0.333), the second densest.** An oak ridge over a
   *    Mediterranean terrace with twenty hex edges of sheltered sea, which is better country than Hama's
   *    0.263 by exactly the amount that a wood is better than a sward.
   *
   * **Two new rigs, which is the most any job in this block has spent**, and the brief allowed them for a
   * reason worth repeating: a rainforest with none of its own animals in it is a worse lie than an empty
   * desert. They are the **forest edge-cat** and the **Iberos albatross**, both named and both described
   * in `fauna/azhoran_fauna_overview.md`, and both argued at their rigs in `src/content/regions/western-regions/west-regions-life.js`.
   *
   * **What the lore does not give, and it is the finding of the job's wildlife:** `trogo.md` spends a
   * paragraph on this country's fauna and **names not one animal**. "The transition zone supports animals
   * from both the desert and the forest at its edges. Meroshe species that follow the canyon rivers down
   * encounter the forest edge and some go no further; some have adapted to the wet over generations and
   * are now found in both zones... Tropical species from the forest proper come to the desert edge for
   * specific resources... The carnivores that hunt both zones are the most studied by the communities
   * here." Every one of those sentences is a placement rule and none of them is a species. So there is no
   * monkey, no hornbill, no tapir and no tree-frog here: the two rigs are the two the overview names for
   * a forest margin and for the ocean south of the map, and everything else is an extension of an animal
   * the game already has, argued one range at a time.
   *
   * **Three refusals held for the fourth time, and two of them were overturned the next day.** The
   * **Ganesh dustback** is named, given an economy and a social meaning, and never given a body; the only
   * dustback the lore describes is a domestic bovid. The **canyon tortoise** is named *and* described and
   * **this was the last country that could want it** - job 3 said so - and it still fails
   * `tests/west-life.test.js`'s first law, that nothing in the west can be walked down. Solving that
   * honestly means an exemption list or a burrow, and both are the user's decisions rather than a
   * builder's. **(Both answered 2026-10-01: the dustback is the ghubr in the Ganesh Desert, the tortoise
   * is in the Dinelv Highlands' north gap basin, and the law was changed to ask the right question rather
   * than given an exemption.)** And **nothing domestic**: the caravan animals that cross Marosh's
   * water gap, the plots on its terrace, the estuary communities' boats and every beast in any of it
   * belongs to somebody.
   */
  zone('marosh-ridge-deer', 'red-deer', 'Marosh', .55, [-2724, -2578, 2296, 2444], [[-2660, 2352], [-2638, 2392], [-2682, 2330]],
    'Extension: red deer on the oak ridge, which is **the first real wood in the southwest outside the Vaellir\u2019s gallery and Navarth\u2019s one forest hex**. The atlas gives Marosh eight `hills` hexes and `Csb` on every one of them - the cooler-summer Mediterranean form - and what a cooler summer buys on this coast is holm oak and maquis instead of grass. A deer is seen where a wood has open ground beside it, and here the open ground is the whole terrace below. It is the same animal Navarth keeps at its one wood and Isareos on its grass hills, on much better ground than either.',
    { hornless: false }),
  zone('marosh-maquis-boar', 'boar', 'Marosh', .7, [-2680, -2552, 2394, 2522], [[-2602, 2452], [-2616, 2469], [-2625, 2447]],
    'Extension, and the same argument Eer\u2019s boar got: "this is the ordinary pig of a Mediterranean farmland, and it is here because the scrub is". The maquis on this ridge is the densest scrub in thirteen countries - evergreen, waist high, standing close enough to root under - with acorns under the oak above it. The lore\u2019s "river boar" is a semi-aquatic animal of the Mittoli wetlands and a different beast.'),
  zone('marosh-terrace-hares', 'upland-hare', 'Marosh', .3, [-2652, -2532, 2236, 2352], [[-2592, 2292]],
    'Extension: the west\u2019s hare on the `Csa` terrace, which is hot-summer Mediterranean grass with bare earth between the tufts by the end of a dry summer - the same ground it keeps in Gala\u2019s green south and on the Ascarth peninsula. It is the wettest ground the animal holds anywhere in this block and it is two hundred paces from the driest.'),
  zone('marosh-harrier', 'harrier', 'Marosh', .3, [-2646, -2546, 2066, 2166], [[-2596, 2116]],
    'Extension: a harrier quartering the terrace. No lore file for this coast names a raptor, and three hundred metres of grass between an oak ridge and an ocean is a harrier\u2019s whole living - it beats low and follows the ground rather than soaring, the way the ones on West Pyros\u2019s plain, over the Ganesh Plain\u2019s hollows and on Hama\u2019s sward do.',
    { air: 9, circle: 32, period: 18, quarter: 66, bob: 1.5, follow: true }),
  zone('marosh-shore-gulls', 'gull', 'Marosh', .3, [-2536, -2410, 1958, 2074], [[-2461, 2020], [-2484, 2025], [-2475, 2003]],
    'Gulls on the Iberos shore, and this is **the one shore in the whole block that is not exposed to an open ocean**: Hama takes the western weather, Cape Heth takes it on three sides and the fan skirt\u2019s dry shore takes it straight off the western sea, and this coast faces a warm sheltered water with a continental shelf under it. The overview calls the Iberos "one of the most biologically productive bodies of water bordering the known world" and catalogues its colonies on the far side of the continent; this is the near side. Extension.'),
  zone('marosh-rim-hawk', 'plateau-hawk', 'Marosh', .3, [-2792, -2692, 2144, 2244], [[-2742, 2194]],
    'The overview\u2019s dry-plateau hawk, which "hunts the upland grasslands" of rain-shadow country - and **this ridge is the wall that makes the rain shadow**, which is the strongest case for the bird anywhere on the atlas. From the western crest here it has thirty metres of fall under it and then the Central Meroshe\u2019s sand sea to the horizon. Job 1 put the same bird on Navarth\u2019s western rim and job 3 on the Dinelv escarpment; this is the third rim and the only one with a wood behind it.',
    { air: 33 }),
  zone('trogo-crest-bone-bird', 'bone-bird', 'Trogo', .3, [-2458, -2378, 2622, 2702], [[-2418, 2662]],
    '**The desert\u2019s own bird at the edge of a rainforest, and the point of it is that it stops.** The lore\u2019s rule for this margin is "Meroshe species that follow the canyon rivers down encounter the forest edge and some go no further", and the bone-bird is the one the overview calls "the most visible large animals of the Moroshe from caravan routes". It works the dry corridors on the crest - the gaps where the desert\u2019s air pushes over the top and the canopy does not close - and it does not go south-east of them, because a bird with two and a half metres of wing has nowhere to put them over a closed canopy. It is the tenth and last bone-bird in the block.',
    { air: 40 }),
  zone('trogo-edge-cats', 'forest-cat', 'Trogo', .42, [-2492, -2360, 2768, 2900], [[-2424, 2840], [-2442, 2802], [-2408, 2872]],
    '**The forest edge-cat, and Trogo\u2019s own lore asks for it in so many words**: "The carnivores that hunt both zones are the most studied by the communities here, because they present the most immediate practical interest." The overview\u2019s only forest-margin predator is this one - "smaller than its highland relative, more arboreal, and has been observed hunting birds at the canopy level of the forest edge trees as readily as small mammals on the ground" - and the atlas draws the sharpest forest margin anywhere on it right here, thirteen hex edges of `Af` against `BWh`. On the crest it has the desert\u2019s animals on one side of it and the canopy\u2019s on the other, which is exactly the two zones the sentence is about. **Its own home on the Ibenale and Alezhor margin is not built**, and whoever builds it inherits this rig.'),
  zone('trogo-gap-cats', 'forest-cat', 'Trogo', .42, [-2344, -2236, 2758, 2866], [[-2288, 2812], [-2302, 2788], [-2272, 2834]],
    'A second band at the canopy fall, which is a treefall gap on one of the animal paths - and it is the other half of the same sentence: an arboreal cat hunts "birds at the canopy level of the forest edge trees", and a light gap in a closed forest is where the canopy has an edge in the middle of itself. Two bands rather than one wide one for the reason job 1 gave on the Ganesh Plain\u2019s depressions and job 3 on the Dinelv basins: between the crest and this gap there is a hundred and forty metres of thicket with nothing in it that a cat can move through at speed.'),
  zone('trogo-floor-boar', 'boar', 'Trogo', .7, [-2344, -2214, 2842, 2942], [[-2274, 2888], [-2300, 2900], [-2252, 2900]],
    'Extension, and the one large animal on the ground of a rainforest that this bestiary can honestly supply: a pig roots, and the floor of a closed canopy is leaf litter over a metre of root mat with fallen fruit in it. It is the same rig Eer keeps in its cushion scrub, in the country where a pig does best of anywhere on the atlas. The lore names no tropical mammal at all for Trogo - it names placement rules and no species - so this is argued from the ground rather than from a sentence.'),
  zone('trogo-gully-boar', 'boar', 'Trogo', .7, [-2566, -2430, 2960, 3092], [[-2486, 3030], [-2509, 3035], [-2500, 3013]],
    'A second band in the south gully, two hundred and forty metres from the first with a ridge of thicket between them. Two bands rather than one for the same reason the cats get two: a gully floor is scoured stone with fallen fruit washed into it and the canopy above it is open, and the thicket between the two is ground a heavy animal crosses slowly. The gully is also one of the ways through, so this is the one range in Trogo a traveler can walk straight to.'),
  zone('trogoreth-otters', 'otter', 'Trogo', .35, [-2300, -2130, 2940, 3060], [[-2270, 2961], [-2173, 3025], [-2142, 3027]],
    '**The great river otter, and the overview names both the animal and the habitat**: "River otters and their larger relatives occupy the rivers from the Oremindi meltwater sources through the forest-margin watercourses of Alezhor. The largest form, the **great river otter**, is substantially more capable of taking fish than its smaller cousins." A forest-margin watercourse is exactly what the Trogoreth is, and it is the only permanent water in the rainforest. Built as the west\u2019s otter at a third again the size, which is the difference the overview draws, the way Isareos\u2019s are drawn larger than the Carica\u2019s.',
    { scale: 1.32 }),
  zone('trogo-estuary-waders', 'wading-bird', 'Trogo', .4, [-2212, -2090, 2952, 3072], [[-2140, 3001], [-2140, 3025], [-2161, 3017]],
    'Waders on the Trogoreth\u2019s delta, which the lore builds a human economy on: "a wide delta mouth that has silted into a shallow estuary system. Fishing communities live on the estuary... the mangrove and estuary ecology takes over - brackish-adapted vegetation, root systems that make the river mouths look solid but are not, and the bird and fish populations that the estuary communities depend on." The birds are named as a population there and this is them. Extension: the overview\u2019s wading assemblage is catalogued on the Lizeem.'),
  zone('trogo-estuary-egrets', 'egret', 'Trogo', .4, [-2196, -2070, 2700, 2830], [[-2126, 2771], [-2141, 2753], [-2120, 2793]],
    'Egrets on the sheltered north-eastern shore, where the atlas takes `deep_forest` right down to the waterline across ten hex edges and the lore\u2019s mangrove ecology takes over. It is the only sheltered water Trogo has - "the coast is not extensively sheltered - no deep natural harbors on the scale of Hama" - and standing water under a canopy edge is an egret\u2019s whole living. Extension: the game\u2019s egret is Eer\u2019s, on the Lizeem\u2019s last channels.',
    { scale: .86 }),
  zone('trogo-shore-gulls', 'gull', 'Trogo', .3, [-2470, -2336, 3096, 3186], [[-2396, 3152], [-2419, 3147], [-2376, 3138]],
    'Gulls on the exposed southern shore, which is the bottom of the continent: the atlas puts every one of Trogo\u2019s seven `grassland` hexes on this side and takes the canopy to the water on the other, which is what an open southern ocean does to a tropical coast. Salt-pruned tussock, shingle and surf, with nearly forty metres of canopy standing behind it. Extension, as every gull in this block is.'),
  zone('trogo-southern-albatross', 'albatross', 'Trogo', .3, [-2446, -2346, 3102, 3202], [[-2396, 3152]],
    '**The Iberos albatross, and this is the one place in Azhora it can be put.** The overview: "a large, slow-breeding oceanic species, appears over the coast in winter and is understood by Azhoran sailors to spend its summers somewhere beyond the horizon south of Azhora - beyond what Azhoran geography extends to. Where it breeds is not established from an Azhoran perspective." Trogo\u2019s row 142 is the southernmost ground in the game - it is what `WORLD_BOUNDS.maxZ` is made of - and off this shore are the Azhor Stones and then nothing the atlas draws. So the bird that goes south of the map is over the only coast that looks at where it goes. Two metres of wing held flatter and stiller than anything else in this sky.',
    { air: 44, circle: 58, period: 26 }),
  zone('trogo-delta-dolphins', 'dolphin', 'Trogo', 0, [-2108, -2018, 3040, 3132], [[-2062, 3086], [-2042, 3110]],
    'Grey dolphins off the delta mouth, and the overview puts them in precisely this situation on the other side of the continent: "documented in the Lizeem estuary at Nylon during upriver fish migrations; the Nylon fishing community considers them neither good nor bad omen but monitors their behaviour as an indicator of shoal location". Trogo has an estuary, a year-round river carrying substantial volume, and fishing communities on the mouth of it. Out past the surf, seen from the shore and not reachable from it.',
    { sea: true }),
]);

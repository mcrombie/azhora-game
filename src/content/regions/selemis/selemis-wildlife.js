/**
 * The animals of Selemis, as ranges for the western wildlife rigs (`src/content/regions/western-regions/west-regions-life.js` draws
 * them, instanced and distance-culled, and they are ambient: nobody can attack, catch or speak to
 * them).
 *
 * **Seabirds and dolphins, and nothing on four legs - and that is a measurement and a reading both.**
 *
 * The reading first. The lore catalogues no fauna for the island at all: what it has of Selemis is the
 * city. What it does have is the sea the island stands in, and the fauna overview's section on the
 * Iberos coast names three things in so many words that an island at "the southern mouth of the
 * Iberos Sea" is exactly the ground for:
 *  - the **seabird colonies** of the Iberos coast, "among the most extensive on the continent", on
 *    "certain rocky headlands and offshore islands" - and this is an offshore island with two rocky
 *    headlands on it, so the gulls on both heads and on the ocean cliffs are the one population here
 *    that is the lore's own sentence and not an extension of it;
 *  - the **Great White Sea-plunger**, the gannet-relative those colonies are of, whose "vertical dives
 *    from height into the Iberos shoals" are "one of the more visible demonstrations of the sea's
 *    productivity". The peninsula has it off its tip, on the Iberos side; the island has it off its
 *    back, on the ocean side, which is the other door of the same sea;
 *  - **grey dolphins**, "a consistent presence in Iberos coastal waters", in the lane past the
 *    island's eastern end - the water every ship between the Iberos and the open southern ocean goes
 *    through, by the island's own lore.
 *
 * The **Iberos albatross** is the overview's too, and it comes up this sea in winter from "somewhere
 * beyond the horizon south of Azhora", which would bring it past this island. It is not here: the
 * southwest's last job put the game's one albatross over Trogo's southern shore and argued that it is
 * the one place it can be put, and a second one is the user's to decide. It is in the report.
 *
 * Then the measurement. The west's laws are that nothing on the ground can be walked down, and a band
 * that flees needs ground behind it to flee into. The island is four hundred metres by two hundred
 * and ninety with a hill on every part of it that is not a shore, and the animal the peninsula keeps
 * on this same grass - the hare, there as an extension - has no sentence of lore anywhere on this
 * island to stand on. So nothing was promised a range to fill the space: `docs/selemis-report.md`
 * gives the numbers a hare's range would have had.
 *
 * Domestic stock is somebody's, so there is none; and nothing here is a harbour animal - no cat on a
 * quay, no dog, no gull on a roof - because there is no harbour built for it to belong to.
 *
 * Every home site below was measured on the built ground - standable, on the island's own hexes,
 * clear of every trunk and stone - and `tests/selemis-world.test.js` holds each one to it. **The gulls
 * stand a dozen metres back from the cliff edge and not five**, and that is a measurement: the terrain
 * out here is drawn from vertices 7.1 m apart, so the drawn cliff top begins up to ten metres behind
 * the walkable one, and a bird put six metres from the edge stands on ground a traveler can walk on
 * and floats a metre and a half over the ground the renderer draws. The first picture had one.
 */
const freeze = Object.freeze;
const zone = (id, species, radius, box, sites, note, traits = {}) => freeze({
  id, species, region: 'Selemi', radius, scale: 1, keepRegion: true,
  minX: box[0], maxX: box[1], minZ: box[2], maxZ: box[3],
  sites: freeze(sites.map(site => freeze(site))), note, ...traits,
});

export const SELEMIS_WILDLIFE_ZONES = freeze([
  // The two heads.
  zone('selemis-west-head-gulls', 'gull', .3, [-885, -805, 2308, 2372], [[-881, 2338], [-869, 2332], [-858, 2325]],
    'The overview: the seabird colonies of the Iberos coast are "among the most extensive on the continent", on "certain rocky headlands and offshore islands". This is both at once - a rocky headland on an offshore island - so these are the lore’s own birds on the lore’s own ground: gulls, the seabird the game draws, on the west head’s cliff top a dozen metres back from the edge, over the channel.'),
  zone('selemis-east-head-gulls', 'gull', .3, [-705, -640, 2405, 2480], [[-660, 2435], [-660, 2447], [-660, 2459]],
    'The same colony’s kind on the east head, on the cliff top that faces the open Iberos: the other of the two headlands the strand runs between, and the one a ship coming down the sea raises first.'),
  // The ocean face.
  zone('selemis-south-cliff-gulls', 'gull', .3, [-900, -790, 2540, 2598], [[-859, 2583], [-848, 2585], [-835, 2579]],
    'And on the south cliffs, which is the ground the overview’s sentence fits best of the three: the island’s highest shore, thirteen metres of stone facing the open sea with nothing behind the birds but grass. A dozen metres back from the edge at the island’s southern point, with the sea-plungers working the water off the same cliff.'),
  // The sea.
  zone('selemis-ocean-plungers', 'sea-plunger', .3, [-985, -900, 2535, 2620], [[-942, 2578], [-942, 2578], [-942, 2578]],
    'The Great White Sea-plunger, whose breeding colonies the overview puts on "certain rocky headlands and offshore islands" and whose "vertical dives from height into the Iberos shoals" it calls one of the more visible demonstrations of the sea’s productivity. Circling off the island’s south-western cliffs and folding into the water in turn: the peninsula’s birds work the Iberos side of the tip, and these the ocean side of the island, where the sea the island guards the mouth of begins.',
    { air: 22, circle: 26, period: 17, bob: 1.4, plunge: freeze({ every: 9, fall: 1.1, under: 1.8, climb: 3.2 }) }),
  zone('selemis-dolphins', 'dolphin', 0, [-575, -525, 2400, 2570], [[-552, 2440], [-545, 2530]],
    'The overview: "Grey dolphins are a consistent presence in Iberos coastal waters." In the lane past the island’s eastern end, which by the island’s own lore every ship moving between the Iberos Sea and the open southern ocean goes through: out past the foot of the cliffs, seen from the east head and not reachable from it.',
    { sea: true }),
]);

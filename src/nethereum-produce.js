/**
 * The goods of Nethereum (docs/lizeem-farmlands-design.md §5.2, §7.5 and §7.6, the design of 5 October
 * 2026; built 6 October 2026 under the contract for Builds 2 and 3): the two crops of the flood meadow,
 * the weir's fish, the two dishes, and what Haethom's people sell besides.
 *
 * Data only, and it imports nothing, so src/inventory.js, src/cooking.js and src/consumables.js can each
 * spread a list in without a cycle. The way of farming is src/meadow-water.js, which registers the crops
 * with the farm and keeps the weir.
 */
const freeze = Object.freeze;

/**
 * Flood oats are sown on fresh silt; meadow hay is never sown: the meadow grows it after a draw-off, and
 * cutting it is the harvest. Three minutes of play for the grass to come up through the silt.
 */
export const NETHEREUM_CROPS = freeze([
  freeze({ id: 'flood-oats', name: 'Flood oats', seconds: 240, xp: 30, level: 1, item: 'flood-oats', yield: 2, seed: 'flood-oats-seed', kind: 'grain', heart: 'any', region: 'nethereum',
    note: 'Oats sown on fresh flood silt, as Nethereum has always sown them. Drown the meadow, draw the water off when the silt shines, and sow: fine silt gives Fine oats, thin silt poor ones, and sour ground nothing worth the name.' }),
  freeze({ id: 'meadow-hay', name: 'Meadow hay', seconds: 180, xp: 35, level: 5, item: 'meadow-hay', yield: 2, sown: false, kind: 'fodder', heart: 'any', region: 'nethereum',
    note: 'Not sown. The meadow grows it through the silt after every draw-off, and cutting it is the harvest. A farmer of level 10 has a second cut off the same bed five minutes after the first, if it is left bare.' }),
]);

/** Satchel entries; src/inventory.js spreads them in. Foods carry their healing in brief and description (tests/foods.test.js). */
export const NETHEREUM_ITEMS = freeze({
  'flood-oats-seed': freeze({ name: 'Flood oat seed', type: 'Material', icon: 'seeds', stackable: true,
    brief: 'One packet sows one bed of flood oats. It grows only on the Nethereum beds.',
    description: 'From the seed bench at the head of the Haethom meadow. Flood oats ripen after four minutes of active play and want fresh silt: drown the meadow, draw the water off when the silt shines, and sow. Every harvest returns a packet.' }),
  'flood-oats': freeze({ name: 'Flood oats', type: 'Material', icon: 'grain', stackable: true,
    brief: 'A sheaf of oats off the Haethom meadow. Oatcakes, not a meal as it stands.',
    description: 'Oats sown in the silt the water lays down, which is how the wet hollow between the Isa and the Neth has always grown them. Two bake into Nethrani oatcakes, and Gwyddno at the weir buys them for his household.' }),
  'flood-oats-fine': freeze({ name: 'Fine flood oats', type: 'Material', icon: 'grain', stackable: true,
    brief: 'Oats off silt drawn at the shine. Cooks into the fine kind of a dish.',
    description: 'A Fine harvest of flood oats: sown on fine silt, the water drawn off at exactly the right time, and the farmer knew it. This is what the Measure of the River asks of Nethereum.' }),
  'meadow-hay': freeze({ name: 'Meadow hay', type: 'Material', icon: 'leaf', stackable: true,
    brief: 'A truss of sweet hay off the drowned meadow. Boann buys it for her cattle.',
    description: 'Grass that came up through the silt after the water was drawn off, cut and tied in a truss. Nethereum cuts its meadows twice where the neighbours cut once, and the short-legged Nethrani cattle eat the difference.' }),
  'meadow-hay-fine': freeze({ name: 'Fine meadow hay', type: 'Material', icon: 'leaf', stackable: true,
    brief: 'Hay off fine silt, green and sweet-smelling. A cattle-woman pays more for it.',
    description: 'A Fine cut of meadow hay, leafy and full of flower, from a meadow drawn off at the shine. A measurer can tell it by the smell before he has untied the truss.' }),
  'weir-fish': freeze({ name: 'Weir fish', type: 'Food', icon: 'raw-fish', stackable: true, eatName: 'weir fish',
    brief: 'A fish out of Gwyddno’s trap on the Neth. Restores up to 10 health.',
    description: 'Restores up to 10 health, eaten as it comes, which is not how anybody in Nethereum eats it. Smoke it at the smoke-house above the weir for a far better meal.' }),
  'weir-fish-fine': freeze({ name: 'Fine weir fish', type: 'Food', icon: 'raw-fish', stackable: true, eatName: 'fine weir fish',
    brief: 'A fish taken from the trap the morning it swam in. Restores up to 15 health.',
    description: 'Restores up to 15 health. The weir’s catch taken before noon, still bright from the water. Smoked, it makes the fine kind of smoked fish.' }),
  oatcakes: freeze({ name: 'Nethrani oatcakes', type: 'Food', icon: 'flatbread', stackable: true, eatName: 'Nethrani oatcake',
    brief: 'Flood oats baked flat on a hot stone. Restores up to 25 health.',
    description: 'Restores up to 25 health. Two sheaves of flood oats, ground coarse, worked with water and a little salt and baked on a stone at a lit fire. Haethom eats them with smoked fish and butter.' }),
  'oatcakes-fine': freeze({ name: 'Fine Nethrani oatcakes', type: 'Food', icon: 'flatbread', stackable: true, eatName: 'fine Nethrani oatcake',
    brief: 'Oatcakes from Fine flood oats. Restores up to 35 health.',
    description: 'Restores up to 35 health. The same cakes from Fine oats: they snap clean and taste of the meadow. Half of the dish the Flood Council would put before Taleth.' }),
  'smoked-fish': freeze({ name: 'Smoked fish', type: 'Food', icon: 'dried-fish', stackable: true, eatName: 'smoked fish',
    brief: 'A weir fish smoked over alder. Restores up to 40 health.',
    description: 'Restores up to 40 health. A weir fish split, salted and hung in the smoke above a low alder fire until it is gold right through. Gwyddno’s family has smoked the Neth’s fish this way for forty generations.' }),
  'smoked-fish-fine': freeze({ name: 'Fine smoked fish', type: 'Food', icon: 'dried-fish', stackable: true, eatName: 'fine smoked fish',
    brief: 'Smoked from a fish taken fresh from the trap. Restores up to 50 health.',
    description: 'Restores up to 50 health. Smoked from a fine weir fish, the morning’s catch, and the difference is in every flake. With fine oatcakes, it is the dish of Nethereum.' }),
  salt: freeze({ name: 'Salt', type: 'Material', icon: 'jug', stackable: true,
    brief: 'A crock of coarse salt from the weir-master’s store.',
    description: 'Salt for the smoke-house and the kitchen, sold by Gwyddno at the weir. Nethereum buys it downriver and uses a great deal of it.' }),
  butter: freeze({ name: 'Butter', type: 'Food', icon: 'cheese', stackable: true, eatName: 'pat of butter',
    brief: 'A pat of yellow butter from the Nethrani cattle. Restores up to 10 health.',
    description: 'Restores up to 10 health. Churned at Boann’s byre from the milk of the short-legged Nethrani cattle on the post-flood pasture. Better on an oatcake than on its own.' }),
  manure: freeze({ name: 'Manure', type: 'Material', icon: 'bundle', stackable: true,
    brief: 'A sack of well-rotted manure from Boann’s byre.',
    description: 'What a byre makes when it is not making butter. Boann sells it by the sack, and she is not sentimental about it.' }),
  'harvest-basket': freeze({ name: 'Harvest basket', type: 'Tool', icon: 'bundle',
    brief: 'A deep rush basket of Airmid’s weaving. Carried, it adds one to every harvest.',
    description: 'Woven by Airmid from the rush and sedge of the wet threads, deep enough that nothing falls out of the top. Carry it while you harvest and every bed gives one more than it would have.' }),
});

const food = (healing, missing) => freeze({ healing, missing });
/** The foods among them, in src/consumables.js's shape. */
export const NETHEREUM_FOODS = freeze({
  'weir-fish': food(10, 'You have no weir fish. Gwyddno’s weir on the Neth, below the ford, gives a catch once a day.'),
  'weir-fish-fine': food(15, 'You have no fine weir fish. Take the weir’s catch before noon, while it is fresh from the trap.'),
  oatcakes: food(25, 'You have no Nethrani oatcakes. Bake two flood oats at a lit fire, once Haethom has shown you how.'),
  'oatcakes-fine': food(35, 'You have no fine Nethrani oatcakes. Bake them from two Fine flood oats.'),
  'smoked-fish': food(40, 'You have no smoked fish. Smoke a weir fish over a low fire, once Gwyddno has shown you how, or buy one from him.'),
  'smoked-fish-fine': food(50, 'You have no fine smoked fish. Smoke it from a fine weir fish, taken from the trap before noon.'),
  butter: food(10, 'You have no butter. Boann sells it at her byre above the Haethom meadow.'),
});

/**
 * The two dishes and their fine forms, in src/cooking.js's shape. Every known recipe is made at any lit
 * fire (the host's fire menu offers them all), so smoked fish is a fire recipe; `at` names the smoke-house
 * where Gwyddno teaches it, for a host that wants to offer it only there.
 */
const recipe = (id, entry) => freeze({ id, ...entry, needs: freeze(entry.needs) });
export const NETHEREUM_RECIPES = freeze({
  oatcakes: recipe('oatcakes', { name: 'Nethrani oatcakes', xp: 20, needs: { 'flood-oats': 2 }, makes: 'oatcakes', fine: 'oatcakes-fine',
    note: 'Two sheaves of flood oats ground coarse, worked with water and a pinch of salt, and baked flat on a stone at a lit fire. Restores up to 25 health.' }),
  'oatcakes-fine': recipe('oatcakes-fine', { name: 'Fine Nethrani oatcakes', xp: 30, needs: { 'flood-oats-fine': 2 }, makes: 'oatcakes-fine', fineOf: 'oatcakes',
    note: 'The oatcakes from two Fine flood oats. Restores up to 35 health.' }),
  'smoked-fish': recipe('smoked-fish', { name: 'Smoked fish', xp: 30, needs: { 'weir-fish': 1 }, makes: 'smoked-fish', fine: 'smoked-fish-fine', at: 'gwyddno-smokehouse',
    note: 'One weir fish split, salted and hung in the smoke of a low fire banked with green alder until it is gold right through. Gwyddno does it in the smoke-house above the weir. Restores up to 40 health.' }),
  'smoked-fish-fine': recipe('smoked-fish-fine', { name: 'Fine smoked fish', xp: 40, needs: { 'weir-fish-fine': 1 }, makes: 'smoked-fish-fine', fineOf: 'smoked-fish', at: 'gwyddno-smokehouse',
    note: 'Smoked fish from a fine weir fish, the morning’s catch. Restores up to 50 health.' }),
});

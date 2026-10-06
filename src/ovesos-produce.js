/**
 * The goods of Ovesos (docs/lizeem-farmlands-design.md §5.4, §7.5 and §7.6, the design of 5 October 2026; built
 * 6 October 2026 under the contract for Builds 4 and 5): the three crops of the canal at Velsorten, the flour off
 * Ezina's mill, the two dishes, and what the Sorten's people sell besides, the fulled cloth and the herders' mutton.
 *
 * Data only, and it imports nothing, so src/inventory.js, src/cooking.js and src/consumables.js can each spread a
 * list in without a cycle. The way of farming is src/canal-turns.js, which registers the crops with the farm and
 * keeps the mill. Barley stays the commons' own crop (src/farming.js) and is watered on the canal like these.
 */
const freeze = Object.freeze;

/**
 * Hard wheat is the thirsty grain and the Measure's; silver millet is the lore's quick, pale "honest grain", sown late
 * and in small rounds; madder is the dyer's root, grown for Uttu's fulling mill and sold to nobody else. How much
 * canal water each wants a planting is the canal's (`OVESOS_THIRST`, src/canal-turns.js).
 */
export const OVESOS_CROPS = freeze([
  freeze({ id: 'hard-wheat', name: 'Hard wheat', seconds: 360, xp: 60, level: 10, item: 'hard-wheat', yield: 2, seed: 'hard-wheat-seed', kind: 'grain', heart: 'any', region: 'ovesos',
    note: 'The short, stiff wheat of the canal country, close and golden in the ear. It is the thirsty one: three units of the canal’s water a planting, no fewer and no more, and too much leaves salt in the bed.' }),
  freeze({ id: 'silver-millet', name: 'Silver millet', seconds: 150, xp: 24, level: 1, item: 'silver-millet', yield: 3, seed: 'silver-millet-seed', kind: 'grain', heart: 'any', region: 'ovesos',
    note: 'The quick pale millet of Ovesos, sown late and in small rounds. Landlords call it poor grain and mothers call it honest. One unit of water a planting is all it wants, and the Water Council takes no dues on it.' }),
  freeze({ id: 'madder', name: 'Madder', seconds: 480, xp: 70, level: 18, item: 'madder', yield: 2, seed: 'madder-seed', kind: 'dye', heart: 'any', region: 'ovesos',
    note: 'A sprawling plant with whorled leaves, grown for its red roots. Two units of water a planting. Uttu buys the roots for the fulling mill, and nobody else in Ovesos will.' }),
]);

/** Satchel entries; src/inventory.js spreads them in. Foods carry their healing in brief and description (tests/foods.test.js). */
export const OVESOS_ITEMS = freeze({
  'hard-wheat-seed': freeze({ name: 'Hard wheat seed', type: 'Material', icon: 'seeds', stackable: true,
    brief: 'One packet sows one bed of hard wheat. Ovesos farms only, from Farming level 10.',
    description: 'From the seed bench at Velsorten. Hard wheat ripens after six minutes of active play and wants exactly three units of the canal’s water: one short and it comes up thin, any more and the bed salts. Every harvest returns a packet.' }),
  'silver-millet-seed': freeze({ name: 'Silver millet seed', type: 'Material', icon: 'seeds', stackable: true,
    brief: 'One packet sows one bed of silver millet. It grows only on the Ovesos farms.',
    description: 'From the seed bench at Velsorten. Silver millet ripens after two and a half minutes of active play and wants one unit of water, or none at a pinch. Every harvest returns a packet.' }),
  'madder-seed': freeze({ name: 'Madder seed', type: 'Material', icon: 'seeds', stackable: true,
    brief: 'One packet sows one bed of madder. Ovesos farms only, from Farming level 18.',
    description: 'From the seed bench at Velsorten. Madder takes eight minutes of active play to make its roots and wants two units of the canal’s water. Every harvest returns a packet.' }),
  'hard-wheat': freeze({ name: 'Hard wheat', type: 'Material', icon: 'grain', stackable: true,
    brief: 'A sheaf of hard wheat off the Velsorten canal. Flour, not a meal as it stands.',
    description: 'The wheat of the canal country, short in the straw and dense in the ear, watered by channel as the Sorten has always watered it. Ezina grinds two sheaves into a measure of flour at the mill on the canal, and keeps one in sixteen.' }),
  'hard-wheat-fine': freeze({ name: 'Fine hard wheat', type: 'Material', icon: 'grain', stackable: true,
    brief: 'Hard wheat given exactly its water. Grinds into fine flour.',
    description: 'A Fine harvest of hard wheat: three units of water from the divider, no more and no less, on ground with no salt in it. This is what the Measure of the River asks of Ovesos.' }),
  'silver-millet': freeze({ name: 'Silver millet', type: 'Material', icon: 'grain', stackable: true,
    brief: 'A small round of pale millet, the honest grain. Two make a porridge.',
    description: 'Landlords call it poor grain and mothers call it honest. A household’s millet patch cannot be seized for debt, so it is what a tenant’s children eat when the landlord has taken everything else, and the Water Council draws no dues on the water it drinks.' }),
  'silver-millet-fine': freeze({ name: 'Fine silver millet', type: 'Material', icon: 'grain', stackable: true,
    brief: 'Millet off a bed given its one unit of water. Cooks into the fine kind of a dish.',
    description: 'A Fine harvest of silver millet, the seed pale as a fish’s belly and every head full. Ashnan says you can hear the difference when it is poured.' }),
  madder: freeze({ name: 'Madder roots', type: 'Material', icon: 'beet', stackable: true,
    brief: 'Red roots of the dyer’s madder. Uttu buys them for the fulling mill.',
    description: 'Dug from a sprawling, whorl-leaved plant and dried, then ground: madder dyes the Sorten’s wool the red a Galan buyer looks for. Uttu at the fulling mill buys it, and nobody else in Ovesos has any use for it.' }),
  'madder-fine': freeze({ name: 'Fine madder roots', type: 'Material', icon: 'beet', stackable: true,
    brief: 'Thick, deep-red madder roots. Uttu pays more for them.',
    description: 'A Fine harvest of madder, the roots as thick as a finger and red right through when they are broken. They give the deep colour, not the pink one.' }),
  'hard-wheat-flour': freeze({ name: 'Hard-wheat flour', type: 'Material', icon: 'bundle', stackable: true,
    brief: 'A measure of flour off Ezina’s mill. Two bake a flatbread.',
    description: 'Two sheaves of hard wheat ground on the canal at Velsorten, less the miller’s sixteenth. Ezina sells it too, and Adapa carries it to Minora.' }),
  // Not in the contract's list, which names flour once: the mill grinds Fine hard wheat into this, so the fine
  // flatbread can be baked and the Measure's flatbread line reached (6 October 2026).
  'hard-wheat-flour-fine': freeze({ name: 'Fine hard-wheat flour', type: 'Material', icon: 'bundle', stackable: true,
    brief: 'Flour ground from Fine hard wheat. Bakes the fine kind of flatbread.',
    description: 'Two sheaves of Fine hard wheat through Ezina’s stones: a pale, strong flour that takes water and holds it. Bake it into the flatbread Ovesos would put before Taleth.' }),
  flatbread: freeze({ name: 'Flatbread', type: 'Food', icon: 'flatbread', stackable: true, eatName: 'flatbread',
    brief: 'Hard-wheat flatbread off a hot stone. Restores up to 30 health.',
    description: 'Restores up to 30 health. Two measures of hard-wheat flour worked with water and a pinch of salt and baked flat on a stone at a lit fire: the bread of the canal country, torn and eaten with everything.' }),
  'flatbread-fine': freeze({ name: 'Fine flatbread', type: 'Food', icon: 'flatbread', stackable: true, eatName: 'fine flatbread',
    brief: 'Flatbread from Fine hard-wheat flour. Restores up to 40 health.',
    description: 'Restores up to 40 health. The same bread from fine flour: it blisters on the stone and tears clean. The dish of Ovesos for the Measure of the River.' }),
  'millet-porridge': freeze({ name: 'Millet porridge', type: 'Food', icon: 'bowl', stackable: true, eatName: 'bowl of millet porridge',
    brief: 'Silver millet simmered soft. Restores up to 30 health.',
    description: 'Restores up to 30 health. Two rounds of silver millet simmered at a lit fire until they give, as Ashnan cooks it for her children at the tail of the canal. Plain, filling and nobody’s to take.' }),
  'millet-porridge-fine': freeze({ name: 'Fine millet porridge', type: 'Food', icon: 'bowl', stackable: true, eatName: 'bowl of fine millet porridge',
    brief: 'Porridge from Fine silver millet. Restores up to 40 health.',
    description: 'Restores up to 40 health. Millet porridge from two Fine rounds of silver millet, smooth and sweet-smelling. Ashnan would serve it to a guest.' }),
  cloth: freeze({ name: 'Fulled cloth', type: 'Material', icon: 'bundle', stackable: true,
    brief: 'A length of Sorten wool, fulled at Uttu’s mill.',
    description: 'Woollen cloth from the upland flocks, beaten and shrunk under the hammers of the fulling mill on the canal until it turns the rain. A Galan buyer can tell a Sorten fleece by touch, Uttu says, and pays for it.' }),
  mutton: freeze({ name: 'Roast mutton', type: 'Food', icon: 'drumstick', stackable: true, eatName: 'piece of roast mutton',
    brief: 'Mutton off the upland flocks, roasted at the herders’ fire. Restores up to 25 health.',
    description: 'Restores up to 25 health. A joint of the herders’ mutton, roasted over a dung fire on the upland grass and sold by Lahar to anyone who has eaten his roasted barley first.' }),
});

const food = (healing, missing) => freeze({ healing, missing });
/** The foods among them, in src/consumables.js's shape. */
export const OVESOS_FOODS = freeze({
  flatbread: food(30, 'You have no flatbread. Bake two measures of hard-wheat flour at a lit fire, once somebody in Velsorten has shown you how.'),
  'flatbread-fine': food(40, 'You have no fine flatbread. Bake it from two measures of fine hard-wheat flour, ground from Fine hard wheat.'),
  'millet-porridge': food(30, 'You have no millet porridge. Simmer two silver millet at a lit fire, once Ashnan has shown you how.'),
  'millet-porridge-fine': food(40, 'You have no fine millet porridge. Simmer it from two Fine silver millet.'),
  mutton: food(25, 'You have no roast mutton. Lahar’s herders sell it at their camp on the upland grass above Velsorten.'),
});

/** The two dishes and their fine forms, in src/cooking.js's shape: a fine form is known as soon as its plain dish is. */
const recipe = (id, entry) => freeze({ id, ...entry, needs: freeze(entry.needs) });
export const OVESOS_RECIPES = freeze({
  flatbread: recipe('flatbread', { name: 'Flatbread', xp: 25, needs: { 'hard-wheat-flour': 2 }, makes: 'flatbread', fine: 'flatbread-fine',
    note: 'Two measures of hard-wheat flour worked with water and a pinch of salt and baked flat on a hot stone at a lit fire. Restores up to 30 health.' }),
  'flatbread-fine': recipe('flatbread-fine', { name: 'Fine flatbread', xp: 35, needs: { 'hard-wheat-flour-fine': 2 }, makes: 'flatbread-fine', fineOf: 'flatbread',
    note: 'The flatbread from two measures of fine hard-wheat flour. Restores up to 40 health.' }),
  'millet-porridge': recipe('millet-porridge', { name: 'Millet porridge', xp: 20, needs: { 'silver-millet': 2 }, makes: 'millet-porridge', fine: 'millet-porridge-fine',
    note: 'Two rounds of silver millet simmered in water at a lit fire until they give. Restores up to 30 health.' }),
  'millet-porridge-fine': recipe('millet-porridge-fine', { name: 'Fine millet porridge', xp: 30, needs: { 'silver-millet-fine': 2 }, makes: 'millet-porridge-fine', fineOf: 'millet-porridge',
    note: 'Millet porridge from two Fine silver millet. Restores up to 40 health.' }),
});

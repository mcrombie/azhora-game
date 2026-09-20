/** The small, physical things carried through the first journey out of Drent. */
import { ATTIC_WINES, ATTIC_WINE_IDS } from './attic-wines.js';

export const INVENTORY_ITEMS = Object.freeze({
  'harbor-letter': Object.freeze({
    name: "Lakota’s message", type: 'Quest item', icon: 'letter',
    brief: 'A report and letter of introduction to the Ambroni army post on the Avrel clearing.',
    description: 'The seal is already broken so you can read your errand. Keep the message with you for the road ahead.',
  }),
  'simple-sword': Object.freeze({
    name: 'Simple sword', type: 'Weapon', icon: 'sword',
    brief: 'Your plain iron sword. Reliable work for a mercenary, provided you care for the edge.',
    description: 'An unadorned iron blade with a cloth-wrapped grip. Attack with left-click or R. Each landed strike wears it by 1 condition; missed swings cost none. Inspect and equip weapons here with I. At 0 condition the sword cannot attack, but you keep it and can repair it.',
  }),
  'forest-stick': Object.freeze({
    name: 'Forest sticks', type: 'Weapon', icon: 'stick', stackable: true,
    brief: 'Fallen branches make short-lived weapons. Weaker and shorter than your sword.',
    description: 'Press F near a fallen stick to gather it. Each stick lasts 6 landed strikes and deals less damage with less reach than your sword. Misses cause no wear. A broken stick is used up; if you carry another, it becomes ready automatically. Switching weapons preserves a partly used stick.',
  }),
  'iron-mace': Object.freeze({
    name: 'Iron mace', type: 'Weapon', icon: 'sword',
    brief: 'A flanged iron head on a short ash haft. Slow to raise; it breaks what it lands on.',
    description: 'Traded from a hired sword. The same three-swing rhythm as a sword with more weight behind each blow and the same reach. Each landed strike wears it by 1 condition; the village workbench mends it.',
  }),
  'long-dagger': Object.freeze({
    name: 'Long dagger', type: 'Weapon', icon: 'sword',
    brief: 'A hand-and-a-half of iron. Quick, close, and light in the swing.',
    description: 'Traded from a hired sword. Short reach and lighter blows, so you fight inside an enemy’s swing. Each landed strike wears it by 1 condition; the village workbench mends it.',
  }),
  'bearded-axe': Object.freeze({
    name: 'Bearded axe', type: 'Weapon', icon: 'sword',
    brief: 'A hooked axe head on a long haft. Heavy, and it bites deep on the second swing.',
    description: 'Traded from a hired sword. Heavier blows than a sword with a little more reach, at the cost of wear. Each landed strike wears it by 1 condition; the village workbench mends it.',
  }),
  greatsword: Object.freeze({
    name: 'Greatsword', type: 'Weapon', icon: 'sword',
    brief: 'A two-handed blade as long as a man is tall. Reach and weight, slow to stop.',
    description: 'Traded from a hired sword. The longest reach of any blade and the heaviest blows. Each landed strike wears it by 1 condition; the village workbench mends it.',
  }),
  'copper-piece': Object.freeze({
    name: 'Copper pieces', type: 'Money', icon: 'token', stackable: true,
    brief: 'Ambroni copper. Ten make a silver piece, a hundred a gold.',
    description: 'The Empire’s small coin, good in any market that answers to Ambron. Traders and beggars take it; the army pays in it.',
  }),
  'katy-batman-sketch': Object.freeze({
    name: 'Katy’s drawing of Batman', type: 'Quest item', icon: 'letter',
    brief: 'Charcoal on the back of a wine label: a bat’s head and a bat’s wings on a man’s body. Underneath, underlined twice: HE IS NOT A MONSTER.',
    description: 'Katy drew him from what the people who have seen him told her, so that you would know him when you see him, and not run. She wants to hear the moment you do.',
  }),
  'elodi-lens': Object.freeze({
    name: 'The stepped lens', type: 'Quest item', icon: 'token',
    brief: 'Rings of Elagosi glass ground one inside the next like a beehive, in a brass cradle, chest high and a third of a ton. You are carrying it with both arms and no dignity.',
    description: 'The only one on this sea. A flame the size of a fist goes in the middle of it and comes out twenty miles long, which is what makes a light powerful — not the fire, the glass. It was in the lantern of the Elod Light, which is kept by Addison’s twin sister, who has spent eleven years showing it from the wrong place twice a year and taking what washes up.',
  }),
  'salt-beef': Object.freeze({
    name: 'Salt beef', type: 'Food', icon: 'strips', stackable: true, eatName: 'piece of salt beef',
    brief: 'A hard red-brown piece out of the brine barrel, cut across the grain, salty in the way the sea is salty. Restores up to 35 health.',
    description: 'What a ship eats when it is a long way from anywhere: beef packed down in salt in a barrel, which keeps for a year and tastes of exactly one thing. John carries it because his crew has to eat, and sells a piece to anybody who asks, mostly to see what they want it for. Restores up to 35 health.',
  }),
  'velaeth-vial': Object.freeze({
    name: 'A flat bottle of Velaeth', type: 'Quest item', icon: 'bottle',
    brief: 'Thumb-sized, flat, sealed with wax. The stuff in it is blue with purple coming up underneath, and moves like oil.',
    description: 'Out of the false head of a barrel that went to the Coalition “for the troops” and came back heavier than it left. Sold in shops as Suval Evening, a perfume; it is made from a sea snail off the Empire’s own dye beds, thousands of them to the bottle. A drop behind the ear and the evening goes well. A season of it and the colour is in the whites of your eyes.',
  }),
  'rask-chit': Object.freeze({
    name: 'Rask’s requisition', type: 'Quest item', icon: 'letter',
    brief: 'Army paper, used to pack a wine crate. A requisition for dye stock, in a beautiful clerk’s hand, for a quantity that would dye Ambron twice.',
    description: 'Signed by Quartermaster Edmund Rask of Solis, who has never in his life been near the goods and whose hand is on every paper that moves them. He writes numbers like this because it does not occur to him that anybody outside the army will ever read one.',
  }),
  'trelith-pass': Object.freeze({
    name: 'Trelith’s night pass', type: 'Quest item', icon: 'letter',
    brief: 'A Coalition pass through the lines after dark, for one cart and one driver. On the back, in a large confident hand: a refusal, signed John.',
    description: 'Left with the salt trader by a polite young man with clean boots who never came back for it. Captain Nessa Trelith signs every pass that crosses the lines at night, which is what makes her worth a partner on the other side of the war.',
  }),
  'cartel-ledger': Object.freeze({
    name: 'The cart’s tally book', type: 'Quest item', icon: 'letter',
    brief: 'Off the seat of a cart at the breach in Solis’s east wall. Bottles out, silver back, and two names in the same clerk’s hand.',
    description: 'Rask on one side of the page and Trelith on the other, month after month, while their armies killed each other over the city the cart drives through. Neither of them can explain the other’s name being in their book. That is the whole of the case.',
  }),
  'dragon-scale': Object.freeze({
    name: 'A dragon’s scale', type: 'Quest item', icon: 'token',
    brief: 'The size of a thumbnail, slate grey and wet-looking. One side is warm. The same side, always.',
    description: 'Shed in the spring by the thing in the box slung under Petunia, and handed over by Imani at Vaervelm Caelazh after eleven years of telling nobody. The warm side is the side pointing at the rest of it. She does not know what that is for either.',
  }),
  'road-token': Object.freeze({
    name: 'Eren’s travel token', type: 'Quest item', icon: 'token',
    brief: 'A wooden token bearing the mark of the Greenway Watch.',
    description: 'Eren has vouched for your passage through the northern forest. Carry this token and Lakota’s message to the forest’s edge. The road continues across the Avrel clearing, across the Caloss, and on into Luscia.',
  }),
  'horse-token': Object.freeze({
    name: 'Army horse token', type: 'Quest item', icon: 'token',
    brief: 'Iven’s mark on a strip of army leather: one horse, owed by the army.',
    description: 'The relay clerk in Lumber Town pays in what the army owes him. Bede Harrow, the ostler at the stable yard on the edge of Lumber Town, keeps the army’s remounts; hand him this token and he will give you a horse and show you how to ride it.',
  }),
  herbs: Object.freeze({
    name: 'Gathered herbs', type: 'Food', icon: 'leaf', stackable: true, eatName: 'herbs',
    brief: 'Yarrow, plantain, elder, whatever the verge gave up. Restores up to 12 health.',
    description: 'Restores up to 12 health. A handful of what grows on either side of the road, named and picked the way Nell Harrow teaches: leaves for a wound, flowers for a fever, a root or two worth boiling. It is not a meal. It is what keeps a walk from turning into an illness.',
  }),
  tuckahoe: Object.freeze({
    name: 'Tuckahoe root', type: 'Food', icon: 'leaf', stackable: true, eatName: 'tuckahoe',
    brief: 'Heavy roots out of the river mud. Roasted a day, they are bread. Restores up to 30 health.',
    description: 'Restores up to 30 health. Dug from the tidal shallows where the arrowhead leaves stand, then roasted a whole day in a covered pit until the burn is out of it. The river people of this coast ate it in the years the harvest failed, and it does not care whether the harvest failed.',
  }),
  'pipe-weed': Object.freeze({
    name: 'Pipe weed', type: 'Gathered material', icon: 'leaf', stackable: true, eatName: 'a bowl', useVerb: 'Smoke',
    brief: 'Drent leaf, cured brown in the barn and rubbed for the bowl.',
    description: 'Cut in the late summer, hung until it smells like a church, rubbed out fine. Half the good ground in Drent is under it. You need a pipe, and Cabe Tolliver on the Weatherhead will show you what to do with one.',
  }),
  pipe: Object.freeze({
    name: 'Clay pipe', type: 'Tool', icon: 'token',
    brief: 'Cabe’s spare: a white clay bowl on a long stem, burnt dark at the rim.',
    description: 'Fill it with pipe weed and sit still for ten minutes. It will not fix your leg and it will not make you clever; it makes ten minutes into something, which on a road like this one is not nothing.',
  }),
  'jimson-pods': Object.freeze({
    name: 'Jimson pods', type: 'Gathered material', icon: 'acorn', stackable: true,
    brief: 'Hard green eggs stuck all over with spikes. Toft Ellery wants three. For his knee.',
    description: 'The seed pods of the jimson weed, which grows on trodden waste ground nobody keeps. A garrison up the river boiled the leaves for greens once and spent eleven days chasing people who were not there. Nell Harrow will tell you to leave them alone, and Nell Harrow is right.',
  }),
  'stone-specimens': Object.freeze({
    name: 'Stone specimens', type: 'Gathered material', icon: 'acorn', stackable: true,
    brief: 'The finds worth carrying: a shark\u2019s tooth, a fossil scallop, a cobble of white quartz.',
    description: 'What Silas Garrow taught you to pick up rather than kick along the road. Each one came from somewhere, and most of them from a long way off, a long time ago.',
  }),
  mushrooms: Object.freeze({
    name: 'Gathered mushrooms', type: 'Food', icon: 'leaf', stackable: true, eatName: 'mushrooms',
    brief: 'What Odger Pell would approve of: named, edible, and picked clean. Restores up to 18 health.',
    description: 'Restores up to 18 health. Chanterelles, oysters, a hen off an oak root — whatever the wood gave up that was worth carrying. Odger Pell taught you which those are; the two that are not stay where they stand.',
  }),
  'ardry-letter': Object.freeze({
    name: 'A letter for the other Ardry', type: 'Quest item', icon: 'letter',
    brief: 'A folded sheet, carried between Lorn Ardry on the Tidehaven shingle and his sister Hesta at Applegarth.',
    description: 'One of the letters the Ardrys are writing to each other after eleven years. They are not sealed, and both of them have said you may read them: open your journal with J to do it. Deliver it to the one it is addressed to.',
  }),
  'hummingbird-feeder': Object.freeze({
    name: 'Lakota’s hummingbird feeder', type: 'Quest item', icon: 'feeder',
    brief: 'A pale glass bottle over a red dish with little yellow flowers for ports. Empty.',
    description: 'Lakota’s old feeder, lent so that you can see a hummingbird. It wants sugar water: four parts water to one of sugar, boiled and cooled, never honey. Lysa keeps sugar in her kitchen.',
  }),
  'sugar-water-feeder': Object.freeze({
    name: 'Filled hummingbird feeder', type: 'Quest item', icon: 'feeder',
    brief: 'Lakota’s feeder, full of Lysa’s sugar water. Carry it upright.',
    description: 'Hang it on the hook among the red flowers in Lakota’s garden, on the eastern side of Tidehaven, then step back and wait for a hummingbird.',
  }),
  acorn: Object.freeze({
    name: 'Acorns', type: 'Gathered material', icon: 'acorn', stackable: true,
    brief: 'Little oak nuts gathered from the forest floor. Lysa collects them for her kitchen.',
    description: 'Freshly gathered acorns, still in their shells. These are raw ingredients, not ready-to-eat food: Lysa patiently prepares them and removes their bitter tannins before cooking. Her kitchen turns them into cakes, flatbread, and porridge.',
  }),
  pawpaw: Object.freeze({
    name: 'Ripe pawpaws', type: 'Food', icon: 'pawpaw', stackable: true, eatName: 'pawpaw',
    brief: 'Soft, sweet forest fruit with a banana-custard flavor. Restores up to 25 health.',
    description: 'Restores up to 25 health. Gather ripe fallen fruit beneath broad-leaved pawpaw saplings in the forest. The soft, sweet flesh has a banana-custard flavor. Open your satchel with I, select a pawpaw, then choose Eat. At full health, no fruit is consumed.',
  }),
  tinderbox: Object.freeze({
    name: 'Tinderbox', type: 'Tool', icon: 'tinderbox',
    brief: 'Lysa\'s gift: a small box of flint, steel, and dry tinder for the road.',
    description: 'A reusable flint and steel in a worn little tin. Bring it and two forest sticks to a firepit to light a cooking fire. Lighting the fire uses the sticks; you keep the tinderbox. Lysa gave it to you in thanks for five acorns.',
  }),
  'bronze-axe': Object.freeze({
    name: 'Bronze hatchet', type: 'Tool', icon: 'axe',
    brief: 'Bowden Koop’s starting hatchet. Terrible, he says. Woodcutting level 1.',
    description: 'A small bronze hatchet pulled out of Bowden Koop’s chopping block. Stand at a tree in the Koopwood and press F to chop. The best axe you carry and have the level for is always the one you swing.',
  }),
  'iron-axe': Object.freeze({
    name: 'Iron axe', type: 'Tool', icon: 'axe',
    brief: 'A plain iron axe from Bowden’s rack. Cuts faster than bronze. Woodcutting level 1.',
    description: 'An iron axe, a little faster through the wood than the bronze hatchet. Any woodcutter can swing it.',
  }),
  'steel-axe': Object.freeze({
    name: 'Steel axe', type: 'Tool', icon: 'axe',
    brief: 'A good steel axe from Bowden’s rack. Woodcutting level 6.',
    description: 'A steel axe with a keen edge: noticeably faster through any tree. You need a Woodcutting level of 6 to use it.',
  }),
  'kings-axe': Object.freeze({
    name: 'The King’s axe', type: 'Tool', icon: 'axe',
    brief: 'Bowden Koop’s father’s axe, with a row of little spikes along the back. Woodcutting level 30.',
    description: 'A long black haft and a broad, mirror-bright head with a line of little spikes along its back: the King of the Koopwood’s own axe, given to you when you reached Woodcutting level 30. The fastest axe in Drent.',
  }),
  'pine-logs': Object.freeze({
    name: 'Pine logs', type: 'Gathered material', icon: 'logs', stackable: true,
    brief: 'Loblolly pine from the Koopwood. Light, resinous, quick to burn.',
    description: 'Logs of loblolly pine. One lights a fire at any fire ring, in place of two sticks, and Bowden Koop pays a copper apiece for them at his kiln.',
  }),
  'oak-logs': Object.freeze({
    name: 'Oak logs', type: 'Gathered material', icon: 'logs', stackable: true,
    brief: 'White oak: heavy, close-grained, slow to burn.',
    description: 'Logs of white oak, cut at Woodcutting level 15. One lights a fire at any fire ring; Bowden pays two copper apiece.',
  }),
  'willow-logs': Object.freeze({
    name: 'Willow logs', type: 'Gathered material', icon: 'logs', stackable: true,
    brief: 'Black willow from beside the spring in the Koopwood.',
    description: 'Logs of black willow, cut at Woodcutting level 30. One lights a fire at any fire ring; Bowden pays three copper apiece.',
  }),
  'maple-logs': Object.freeze({
    name: 'Maple logs', type: 'Gathered material', icon: 'logs', stackable: true,
    brief: 'Red maple, pale and hard.',
    description: 'Logs of red maple, cut at Woodcutting level 45. One lights a fire at any fire ring; Bowden pays five copper apiece.',
  }),
  'walnut-logs': Object.freeze({
    name: 'Walnut logs', type: 'Gathered material', icon: 'logs', stackable: true,
    brief: 'Black walnut, dark and precious: the best wood in Drent.',
    description: 'Logs of black walnut from Bowden’s old tree, cut at Woodcutting level 60. The best timber in Drent; Bowden pays nine copper apiece and pretends it hurts.',
  }),
  'hammer': Object.freeze({
    name: 'Hammer', type: 'Tool', icon: 'hammer',
    brief: 'Bowden Koop’s spare hammer. For nails, and for thumbs.',
    description: 'A claw hammer from Bowden Koop. With the saw, it is what Construction needs: at his workbench in the Koopwood, and on your plot beside it.',
  }),
  'saw': Object.freeze({
    name: 'Saw', type: 'Tool', icon: 'saw',
    brief: 'A carpenter’s saw from Bowden Koop.',
    description: 'A hand saw from Bowden Koop, for cutting planks to size. With the hammer, it is what Construction needs.',
  }),
  'pine-plank': Object.freeze({
    name: 'Pine planks', type: 'Gathered material', icon: 'plank', stackable: true,
    brief: 'Planks sawn from pine logs in Bowden’s pit. 29 Construction experience each, built.',
    description: 'Pine planks, sawn from your own logs at Bowden Koop’s saw pit for a copper apiece. Build with them at his workbench or on your plot: each is worth 29 Construction experience.',
  }),
  'oak-plank': Object.freeze({
    name: 'Oak planks', type: 'Gathered material', icon: 'plank', stackable: true,
    brief: 'Planks sawn from oak logs. 60 Construction experience each, built.',
    description: 'Oak planks, sawn from oak logs at Bowden Koop’s saw pit for two copper apiece. Each is worth 60 Construction experience, built into something.',
  }),
  'walnut-plank': Object.freeze({
    name: 'Walnut planks', type: 'Gathered material', icon: 'plank', stackable: true,
    brief: 'Planks of black walnut, dark and fine. 140 Construction experience each, built.',
    description: 'Walnut planks, sawn from black walnut at Bowden Koop’s saw pit for five copper apiece. The finest wood in Drent: each is worth 140 Construction experience, built.',
  }),
  'birdhouse': Object.freeze({
    name: 'Birdhouse', type: 'Tool', icon: 'birdhouse', stackable: true,
    brief: 'A pine birdhouse. Hang it on a post in the Greenway and let somebody move in.',
    description: 'A small pine birdhouse, made at Bowden’s workbench. Hang it on one of the birdhouse posts in the Greenway, west of Tidehaven. After a while a bird moves in; empty it for Birding experience.',
  }),
  'oak-birdhouse': Object.freeze({
    name: 'Oak birdhouse', type: 'Tool', icon: 'birdhouse', stackable: true,
    brief: 'An oak birdhouse: sturdier, and birds like it better.',
    description: 'An oak birdhouse, made at Bowden’s workbench at Construction level 15. Hang it on a birdhouse post in the Greenway; emptying it once a bird has moved in is worth more Birding experience than pine.',
  }),
  'fishing-rod': Object.freeze({
    name: 'Fishing rod', type: 'Tool', icon: 'fishing-rod',
    brief: 'A simple wooden rod with a line and hook, given to you by the fishing teacher.',
    description: 'An inexpensive but serviceable rod. Take it to a marked fishing spot and follow the fishing prompts to catch a fish. The rod is reusable; caught fish go into your satchel as ingredients for a fire-cooked meal.',
  }),
  'raw-fish': Object.freeze({
    name: 'Raw fish', type: 'Ingredient', icon: 'raw-fish', stackable: true,
    brief: 'A fresh catch. Cook it at a lit firepit before eating.',
    description: 'Fresh fish caught with your rod. This is a cooking ingredient and cannot be eaten from the satchel. Use a lit firepit to turn one raw fish into one cooked fish. Bring your tinderbox and two forest sticks if the firepit needs lighting.',
  }),
  'cooked-fish': Object.freeze({
    name: 'Cooked fish', type: 'Food', icon: 'cooked-fish', stackable: true, eatName: 'cooked fish',
    brief: 'A simple meal cooked over a fire. Restores up to 40 health.',
    description: 'Restores up to 40 health. A fish cooked over the campfire, ready for the road. Open your satchel with I, select it, and choose Eat. Each meal uses one cooked fish. At full health, no food is consumed.',
  }),
  'rainbow-ribbon': Object.freeze({
    name: 'Rainbow ribbon', type: 'Quest item', icon: 'ribbon',
    brief: 'Dyed by Brandy Frank in every colour she has. It won’t fix anything.',
    description: 'A long ribbon from Brandy Frank’s dye yard in Tidehaven, dyed in every colour she makes, one after another: hot pink, orange, yellow, a green that hums, a blue off the southern boats, and violet. “It won’t fix anything,” she said. “But it’s very bright, and some days that’s nearly the same thing.”',
  }),
  'talaelos-playbill': Object.freeze({
    name: 'Talaelos playbill', type: 'Quest item', icon: 'letter',
    brief: 'The players of Nylon’s playbill, signed by the whole company, and the dog.',
    description: 'A folded playbill for Talaelos, the players of Nylon: “Every night a new play! No two alike! No script! Yes, and.” Signed by Galeon Trell, Isaura Thale, Pim Belloss, Old Nilor and Zaela Caeren, with a muddy paw print for Understudy. If anyone asks, you are with Talaelos.',
  }),
  'hot-chocolate': Object.freeze({
    name: 'Hot chocolate', type: 'Food', icon: 'mug', stackable: true, eatName: 'hot chocolate', useVerb: 'Drink',
    brief: 'Lakota’s recipe, made at a fire: chocolate, milk, chilli and honey. Restores up to 45 health.',
    description: 'Restores up to 45 health. A cake of chocolate grated into warm milk and stirred till it coats the spoon, with a pinch of chilli. Lakota says to drink it somewhere you can see the sky.',
  }),
  chocolate: Object.freeze({
    name: 'Chocolate', type: 'Ingredient', icon: 'chocolate', stackable: true,
    brief: 'A dark cake of chocolate from the southern ships. Grate it into warm milk at a fire.',
    description: 'A cake of pressed chocolate, bitter and dark, brought north by the southern traders. Once Lakota has taught you his recipe, one cake and one jug of milk at a lit fire make a cup of hot chocolate.',
  }),
  milk: Object.freeze({
    name: 'Jug of milk', type: 'Ingredient', icon: 'jug', stackable: true,
    brief: 'Fresh milk from the Avrel farms. Warm it at a fire; never let it boil.',
    description: 'A stoppered clay jug of cow’s milk from the farms of the Avrel clearing. With a cake of chocolate and Lakota’s recipe, it makes hot chocolate at a lit fire.',
  }),
  // Juan’s bottles from Tharganhom, the Wine Attic in Solis (src/attic-wines.js).
  ...Object.fromEntries(ATTIC_WINE_IDS.map(id => {
    const wine = ATTIC_WINES[id];
    return [wine.item, Object.freeze({ name: `Bottle of ${wine.name}`, type: 'Food', icon: 'bottle', stackable: true, eatName: `a glass of ${wine.name}`, useVerb: 'Drink',
      brief: `A ${wine.colour === 'sweet' ? 'sweet wine' : `${wine.colour} wine`} from ${wine.from}. Restores up to ${wine.healing} health.`,
      description: `Restores up to ${wine.healing} health. ${wine.note} Bought from Juan at Tharganhom, the Wine Attic in Solis.` })];
  })),
  // The wider larder: foods of Drent and its trade. Healing values live in src/consumables.js.
  // Foraged in Drent’s broadleaf forest and along its hedges.
  'wood-sorrel': Object.freeze({
    name: 'Wood sorrel', type: 'Food', icon: 'leaf', stackable: true, eatName: 'handful of wood sorrel',
    brief: 'Tart, clover-shaped leaves from the forest floor. Restores up to 10 health.',
    description: 'Restores up to 10 health. Sharp, lemony leaves that grow in the shade under Drent’s oaks and beeches. Travelers chew them for the taste and the small lift they give; nobody pretends they are a meal.',
  }),
  hazelnuts: Object.freeze({
    name: 'Hazelnuts', type: 'Food', icon: 'nut', stackable: true, eatName: 'handful of hazelnuts',
    brief: 'Sweet nuts from the hazel thickets at the forest edge. Restores up to 15 health.',
    description: 'Restores up to 15 health. Shelled hazelnuts, gathered in autumn where the woods thin toward the Avrel fields. They keep for months in a dry pouch, which is why every Drent traveler carries some.',
  }),
  'bramble-berries': Object.freeze({
    name: 'Bramble berries', type: 'Food', icon: 'berries', stackable: true, eatName: 'handful of bramble berries',
    brief: 'Dark, sweet berries from the thorn tangles. Restores up to 15 health.',
    description: 'Restores up to 15 health. Picked from the same brambles that give the bramble goblins their name. They stain the fingers and bruise within a day, so eat them soon.',
  }),
  honeycomb: Object.freeze({
    name: 'Honeycomb', type: 'Food', icon: 'honeycomb', stackable: true, eatName: 'piece of honeycomb',
    brief: 'A dripping piece of comb from the bee-fold hives. Restores up to 30 health.',
    description: 'Restores up to 30 health. Wax comb heavy with dark forest honey, wrapped in a leaf. Bees are livestock in Azhoran law and hive rights are leased like fields, so a piece of comb is a real gift.',
  }),
  'dried-venison': Object.freeze({
    name: 'Dried venison', type: 'Food', icon: 'strips', stackable: true, eatName: 'strip of dried venison',
    brief: 'Lean deer meat dried over a smoky fire. Restores up to 35 health.',
    description: 'Restores up to 35 health. Thin strips of deer meat, salted and dried in chimney smoke until they bend without breaking. Drent’s hunters make it for the winter road; it is chewy, salty, and nearly indestructible.',
  }),
  // Tidehaven kitchens and the farms of the Avrel clearing.
  'boiled-egg': Object.freeze({
    name: 'Boiled eggs', type: 'Food', icon: 'egg', stackable: true, eatName: 'boiled egg',
    brief: 'A hen’s egg boiled hard for the road. Restores up to 15 health.',
    description: 'Restores up to 15 health. Hard-boiled and still in the shell, from the hens that scratch behind every Tidehaven cottage. Plain food that survives a day in a satchel.',
  }),
  oatcake: Object.freeze({
    name: 'Oatcakes', type: 'Food', icon: 'flatbread', stackable: true, eatName: 'oatcake',
    brief: 'Thin, dry oat rounds baked on a griddle stone. Restores up to 20 health.',
    description: 'Restores up to 20 health. Rough oat rounds from the farm kitchens around the Avrel clearing, baked hard so they keep. Better with cheese or honey, but fine on their own.',
  }),
  'avrel-apple': Object.freeze({
    name: 'Avrel apples', type: 'Food', icon: 'apple', stackable: true, eatName: 'apple',
    brief: 'A crisp orchard apple from the Avrel valley. Restores up to 20 health.',
    description: 'Restores up to 20 health. The Avrel valley has the best orchard land in Drent, and its apples go out by barge through the Stills every autumn. Crisp, sharp and juicy.',
  }),
  'acorn-flatbread': Object.freeze({
    name: 'Acorn flatbread', type: 'Food', icon: 'flatbread', stackable: true, eatName: 'acorn flatbread',
    brief: 'Lysa’s nutty flatbread, baked from leached acorn meal. Restores up to 30 health.',
    description: 'Restores up to 30 health. A dense round from Lysa’s outdoor kitchen. She soaks and rinses the acorns until the bitterness is gone before grinding them; the bread tastes faintly of hazelnut and smoke.',
  }),
  'rye-loaf': Object.freeze({
    name: 'Rye loaf', type: 'Food', icon: 'loaf', stackable: true, eatName: 'heel of rye bread',
    brief: 'Dark, dense bread from the Clearing Mill’s flour. Restores up to 30 health.',
    description: 'Restores up to 30 health. A heel of dark rye, sour and close-grained, baked by the miller’s household from the Avrel harvest. It keeps for a week and stands up to a long road.',
  }),
  'ewe-cheese': Object.freeze({
    name: 'Ewe’s cheese', type: 'Food', icon: 'cheese', stackable: true, eatName: 'wedge of ewe’s cheese',
    brief: 'A firm, salty cheese from the clearing’s flock. Restores up to 30 health.',
    description: 'Restores up to 30 health. Pressed from the milk of the sheep grazing the Avrel clearing, rubbed with salt and aged in a cool shed. Crumbly, sharp, and good with oatcakes.',
  }),
  'honey-cake': Object.freeze({
    name: 'Honey cakes', type: 'Food', icon: 'cake', stackable: true, eatName: 'honey cake',
    brief: 'Lysa’s little acorn cakes, sweet with bee-fold honey. Restores up to 35 health.',
    description: 'Restores up to 35 health. Small, sticky cakes of acorn meal and honey, the reward at the end of Lysa’s long afternoon of acorn work. They smell wonderfully nutty and vanish quickly.',
  }),
  'smoked-sausage': Object.freeze({
    name: 'Smoked sausage', type: 'Food', icon: 'sausage', stackable: true, eatName: 'length of smoked sausage',
    brief: 'Forest-hog sausage hung in chimney smoke. Restores up to 40 health.',
    description: 'Restores up to 40 health. Coarse forest-hog sausage, smoked hard in a Drent chimney over the winter. The hogs fatten on acorns and beech mast in the woods, and the sausage tastes of it.',
  }),
  'roast-duck': Object.freeze({
    name: 'Roast duck', type: 'Food', icon: 'drumstick', stackable: true, eatName: 'roast duck leg',
    brief: 'A duck leg roasted crisp, from the Willowmere reeds. Restores up to 45 health.',
    description: 'Restores up to 45 health. A wild duck taken in the reeds at Willowmere Pond and roasted over an open fire. Rich, dark meat with crackling skin. Cold, it is still better than most hot dinners.',
  }),
  'mutton-pie': Object.freeze({
    name: 'Mutton pie', type: 'Food', icon: 'pie', stackable: true, eatName: 'mutton pie',
    brief: 'A hand-sized pie of mutton and onion in thick crust. Restores up to 50 health.',
    description: 'Restores up to 50 health. Slow-cooked mutton and onion baked in a sturdy crust made to be carried. A farm kitchen with a sheep to spare makes them for shepherds and travelers alike.',
  }),
  // The Tidehaven landing, the Stills and the Pebbles.
  'marsh-samphire': Object.freeze({
    name: 'Marsh samphire', type: 'Food', icon: 'leaf', stackable: true, eatName: 'handful of samphire',
    brief: 'Crisp, salty green shoots from the flats along the Stills. Restores up to 10 health.',
    description: 'Restores up to 10 health. Jointed green shoots picked at low water on the salt flats behind the Pebbles. Crunchy and briny raw, better blanched. The reedcutters gather it by the basket and think little of it.',
  }),
  'stills-oysters': Object.freeze({
    name: 'Stills oysters', type: 'Food', icon: 'oyster', stackable: true, eatName: 'half-dozen oysters',
    brief: 'Fresh oysters from the calm water behind the Pebbles. Restores up to 20 health.',
    description: 'Restores up to 20 health. Drent oysters are known by name in the markets of Solis and Enebreum. Pebble pilots carry them as a sideline, and Tidehaven eats them straight from the shell.',
  }),
  'salt-shoal-fish': Object.freeze({
    name: 'Salt shoal-fish', type: 'Food', icon: 'dried-fish', stackable: true, eatName: 'salt shoal-fish',
    brief: 'Migratory fish salted and dried on the Pebbles. Restores up to 30 health.',
    description: 'Restores up to 30 health. When the shoals run through the Pebble channels, the islanders salt and dry the catch by the barrel. Stiff, salty and long-keeping, it feeds the whole coast through the winter.',
  }),
  'dressed-crab': Object.freeze({
    name: 'Dressed crab', type: 'Food', icon: 'crab', stackable: true, eatName: 'dressed crab',
    brief: 'Flat-water crab from the Stills, picked and packed in its shell. Restores up to 35 health.',
    description: 'Restores up to 35 health. The flat-water crab of the Stills’ southern reaches, boiled and picked, with the meat packed back into the cleaned shell. Sweet and rich, and worth a good price in Solis.',
  }),
  'smoked-eel': Object.freeze({
    name: 'Smoked eel', type: 'Food', icon: 'eel', stackable: true, eatName: 'piece of smoked eel',
    brief: 'Oily river eel smoked golden. Restores up to 40 health.',
    description: 'Restores up to 40 health. Eels trapped in the slow reaches of the Caloss and the Avrel, smoked over oak until the flesh is golden and firm. Rich, filling, and easy to carry wrapped in a cloth.',
  }),
  'fish-stew': Object.freeze({
    name: 'Fish stew', type: 'Food', icon: 'bowl', stackable: true, eatName: 'bowl of fish stew',
    brief: 'A thick stew of the day’s catch, carried in a lidded crock. Restores up to 50 health.',
    description: 'Restores up to 50 health. Fish, onion and barley simmered in one pot and ladled out at the Tidehaven landing whenever the boats come in. In a lidded crock it stays warm for a while and good for longer.',
  }),
  // army rations and traders’ goods from farther off.
  hardtack: Object.freeze({
    name: 'Army hardtack', type: 'Food', icon: 'biscuit', stackable: true, eatName: 'hardtack biscuit',
    brief: 'The Ambroni army’s square, rock-hard ration biscuit. Restores up to 15 health.',
    description: 'Restores up to 15 health. Flour, water and salt baked twice until it could stop an arrow. Quartermaster Corvan issues it by the sack. Soak it in something before biting, or lose a tooth to the Empire.',
  }),
  'brined-olives': Object.freeze({
    name: 'Brined olives', type: 'Food', icon: 'olives', stackable: true, eatName: 'handful of olives',
    brief: 'Salty green olives from the Galan coast. Restores up to 15 health.',
    description: 'Restores up to 15 health. Olives from the dry-farmed groves of the Pyrosi coast, brought up the Iberos Sea in brine jars by Galan traders. A taste of warmer country a long way from Drent.',
  }),
  'dried-figs': Object.freeze({
    name: 'Dried figs', type: 'Food', icon: 'fig', stackable: true, eatName: 'dried fig',
    brief: 'Sweet, chewy figs from the southern desert road. Restores up to 25 health.',
    description: 'Restores up to 25 health. Figs dried in the southern sun and packed tight for the caravan road out of Marosh. By the time they reach Drent they have crossed most of Azhora, and cost accordingly.',
  }),
  'dried-pears': Object.freeze({
    name: 'Dried pears', type: 'Food', icon: 'pear', stackable: true, eatName: 'handful of dried pears',
    brief: 'Sliced pears dried sweet and leathery. Restores up to 25 health.',
    description: 'Restores up to 25 health. Pears from the orchard slopes of the Sorten in Ovesos, sliced and dried for traders’ packs. Sweet, leathery, and a favorite of children along the road.',
  }),
  'roasted-chestnuts': Object.freeze({
    name: 'Roasted chestnuts', type: 'Food', icon: 'nut', stackable: true, eatName: 'portion of roasted chestnuts',
    brief: 'Sweet chestnuts roasted until they split. Restores up to 30 health.',
    description: 'Restores up to 30 health. Chestnuts from the Amod foothills, roasted over coals until the shells split and the insides go soft and sweet. Autumn in Amod smells of chestnut smoke; a twist of them keeps the memory.',
  }),
  'salt-pork': Object.freeze({
    name: 'Salt pork', type: 'Food', icon: 'slab', stackable: true, eatName: 'slice of salt pork',
    brief: 'Fat pork packed in salt, the army’s marching meat. Restores up to 35 health.',
    description: 'Restores up to 35 health. Barrelled pork from the Elagosi lake country, salted hard for the army’s supply trains. Sliced and fried it is good; cold from the barrel it is still food.',
  }),
  'smoked-whitefish': Object.freeze({
    name: 'Smoked whitefish', type: 'Food', icon: 'cooked-fish', stackable: true, eatName: 'smoked whitefish',
    brief: 'Lake fish from Elagos, smoked for the supply trains. Restores up to 45 health.',
    description: 'Restores up to 45 health. Whitefish from Lake Ela, split and smoked by Ambron’s lake fleet. Elagosi dried fish reaches markets across Azhora, and the army marches on it.',
  }),
  'narcoshi-cheese': Object.freeze({
    name: 'Narcoshi cheese', type: 'Food', icon: 'cheese', stackable: true, eatName: 'wedge of Narcoshi cheese',
    brief: 'A dense mountain goat cheese with a flavor no one can copy. Restores up to 45 health.',
    description: 'Restores up to 45 health. Made from the milk of the Narcoshi goats of the eastern valleys and aged in cold mountain cellars. Its flavor cannot be reproduced anywhere else, and Iberos coast merchants pay accordingly. A rare thing to find in Drent.',
  }),
});

/** No DOM dependency: ownership and selection can be checked independently. */
export function createInventoryState() {
  const owned = new Map();
  let selected = null;
  const validQuantity = quantity => Number.isSafeInteger(quantity) && quantity > 0;
  function add(id, quantity = 1) {
    if (!Object.hasOwn(INVENTORY_ITEMS, id) || !validQuantity(quantity)) return false;
    const previous = owned.get(id) ?? 0;
    if (!INVENTORY_ITEMS[id].stackable && (previous > 0 || quantity !== 1)) return false;
    const next = previous + quantity;
    if (!Number.isSafeInteger(next)) return false;
    owned.set(id, next);
    return true;
  }
  return {
    grant(id) {
      if (!Object.hasOwn(INVENTORY_ITEMS, id) || owned.has(id)) return false;
      return add(id);
    },
    add,
    count: id => owned.get(id) ?? 0,
    remove(id, quantity = 1) {
      if (!validQuantity(quantity) || !owned.has(id)) return false;
      const remaining = owned.get(id) - quantity;
      if (remaining < 0) return false;
      if (remaining === 0) {
        owned.delete(id);
        if (selected === id) selected = null;
      } else {
        owned.set(id, remaining);
      }
      return true;
    },
    has: id => owned.has(id),
    items: () => [...owned.keys()],
    selectedId: () => selected,
    select(id) {
      if (!owned.has(id)) return false;
      selected = id;
      return true;
    },
  };
}

const iconPaths = {
  letter: '<rect x="4" y="7" width="28" height="22" rx="2"/><path d="m5 9 13 10L31 9M5 27l9-9m17 9-9-9"/><circle cx="18" cy="19" r="3" fill="currentColor" stroke="none"/>',
  sword: '<path d="m13 23 14-19 5-1-1 6-16 16M15 21 28 7M9 20l9 8M12 25l-6 7-3-3 6-7M4 28l4 4"/>',
  stick: '<path d="m10 32 5-14 8-14 4 1-8 15-5 13ZM18 15l-6-5-2 2 6 7M21 12l8-3 1 2-10 5M12 28l3 1M15 21l3 1"/>',
  token: '<circle cx="18" cy="19" r="12"/><circle cx="18" cy="19" r="8.5"/><path d="m18 10-5 9h3v6h4v-6h3ZM14 7l-2-5m10 5 2-5"/>',
  feeder: '<path d="M16 3h4M18 3v4M14 7h8v5l2 3v6H12v-6l2-3Z"/><path d="M6 24c0-2 5-3 12-3s12 1 12 3-5 4-12 4-12-2-12-4ZM9 27c1 3 4 5 9 5s8-2 9-5"/><circle cx="10" cy="24" r="1.4"/><circle cx="26" cy="24" r="1.4"/><circle cx="18" cy="26" r="1.4"/>',
  acorn: '<path d="M8 17c0 10 6 15 10 16 4-1 10-6 10-16M7 16c0-6 5-10 11-10s11 4 11 10Z M18 6c-1-3 0-4 3-5M11 11l4 4m1-7 6 7m1-6 4 4M11 22c1 3 2 5 4 6"/>',
  pawpaw: '<path d="M14 12C8 11 3 20 5 27c2 8 9 9 14 3 4-5 5-12 1-15-2-2-4-1-6-3ZM10 18c-3 4-3 9 0 12M17 13l2-7M18 9C22 3 28 2 33 3c-2 7-7 12-15 10M20 11l10-6"/>',
  tinderbox: '<rect x="5" y="20" width="26" height="12" rx="2"/><path d="m5 20 4-5h7m8 0h4l3 5M6 24h24M16 24v3h4v-3M18 18c-6-3-1-6-1-10 3 2 1 4 4 4 1-3 1-5-1-8 7 5 7 12 1 14"/>',
  'fishing-rod': '<path d="m5 32 9-14C20 9 24 5 30 3M4 29l4 3M7 25l4 3M30 3v23c0 6-7 6-7 1v-3l2 2M17 16l2 2M23 9l2 2"/><circle cx="12" cy="24" r="3"/>',
  'raw-fish': '<path d="M9 18C16 7 26 9 32 18c-6 9-16 11-23 0ZM9 18 3 11v14ZM22 12c-3 3-3 9 0 12M14 12l3-6 5 5M14 24l3 6 5-5"/><circle cx="27" cy="17" r="1"/>',
  'cooked-fish': '<path d="M9 23c7-9 17-8 23 0-6 8-16 9-23 0ZM9 23l-6-6v12ZM24 18c-3 3-3 7 0 10M13 20l3 6m3-8 3 8M12 13c-4-4 4-5 0-9m8 9c-4-4 4-5 0-9m8 9c-4-4 4-5 0-9"/><circle cx="28" cy="22" r="1"/>',
  leaf: '<path d="M7 30C8 17 17 8 31 6c-1 14-9 23-22 24Z"/><path d="m7 30 19-19M13 22c3 1 6 1 9-1M11 26c3 1 6 1 8-1M17 17c2 1 5 1 7-1"/>',
  nut: '<path d="M12 16c-2 6 1 12 6 14 5-2 8-8 6-14Z"/><path d="M10 16c2-7 5-9 8-9s6 2 8 9c-5-2-11-2-16 0Z"/><path d="M14 18c1 4 2 7 4 10"/>',
  berries: '<circle cx="13" cy="22" r="4.5"/><circle cx="22" cy="25" r="4.5"/><circle cx="20" cy="15" r="4.5"/><circle cx="28" cy="18" r="3.5"/><path d="M20 10V4M20 6c-4-3-8-2-10 1 4 2 7 1 10-1"/>',
  honeycomb: '<path d="M22.5 18l-2.25 3.9h-4.5l-2.25-3.9 2.25-3.9h4.5ZM29.25 14.1l-2.25 3.9h-4.5l-2.25-3.9 2.25-3.9h4.5ZM29.25 21.9l-2.25 3.9h-4.5l-2.25-3.9 2.25-3.9h4.5ZM15.75 14.1l-2.25 3.9h-4.5L6.75 14.1 9 10.2h4.5ZM15.75 21.9l-2.25 3.9h-4.5L6.75 21.9 9 18h4.5ZM22.5 10.2l-2.25 3.9h-4.5l-2.25-3.9 2.25-3.9h4.5ZM22.5 25.8l-2.25 3.9h-4.5l-2.25-3.9 2.25-3.9h4.5Z"/>',
  strips: '<path d="M5 26c5-7 12-11 20-13l7-1-4 5c-6 4-13 8-21 10Z"/><path d="M10 22c2 1 3 2 4 4M16 18c2 1 3 2 4 4M22 15c2 1 3 2 4 4"/>',
  egg: '<path d="M18 5c-6 0-11 9-11 17a11 9 0 0 0 22 0C29 14 24 5 18 5Z"/><path d="M12 22c0 3 2 5 5 5"/>',
  flatbread: '<ellipse cx="18" cy="20" rx="13" ry="8"/><path d="M11 18h.01M16 17h.01M22 18h.01M14 22h.01M20 23h.01M25 21h.01"/>',
  apple: '<path d="M18 12c-3-3-8-3-11 1-4 5-2 14 3 17 3 2 5 0 8 0s5 2 8 0c5-3 7-12 3-17-3-4-8-4-11-1Z"/><path d="M18 12V6M18 8c2-4 6-4 9-3-1 3-5 5-9 3"/>',
  loaf: '<path d="M5 24c0-7 6-11 13-11s13 4 13 11c0 3-2 5-5 5H10c-3 0-5-2-5-5Z"/><path d="M12 15c2 3 2 6 0 9M18 13c2 3 2 7 0 10M24 15c2 3 2 6 0 9"/>',
  cheese: '<path d="M4 18 30 10l-2 12ZM28 22v8L4 26v-8"/><circle cx="12" cy="25" r="1.6"/><circle cx="20" cy="26" r="1.2"/><circle cx="17" cy="16" r="1.2"/>',
  cake: '<path d="M8 21c0-6 5-10 10-10s10 4 10 10v8H8Z"/><path d="M8 21c2 2 4-1 6 1s4-1 6 1 4-1 6 1 3 0 4-1M12 15c2 1 4 1 6 0s4-1 6 0"/>',
  sausage: '<path d="M8 27c-4-4-3-13 3-17s15-4 19 1c3 4 1 11-5 15s-13 5-17 1Z"/><path d="m8 27-3 3M30 11l3-3M13 21c3-3 7-5 12-6"/>',
  drumstick: '<path d="M23 7c5 0 8 3 8 8 0 4-3 7-7 8l-3 1-8 8c-2 2-5 2-6 0s-1-4 1-6l8-8 1-3c1-4 2-8 6-8Z"/><path d="m7 32-2-2M10 29l-2-2M16 22c2-1 5-1 7 1"/>',
  pie: '<path d="M4 20h28c0 6-6 11-14 11S4 26 4 20Z"/><path d="M4 20c2-3 5-3 7 0s5 3 7 0 5-3 7 0 5 3 7 0M14 15c-2-2 1-4 0-7m8 7c-2-2 1-4 0-7"/>',
  oyster: '<path d="M5 15c4-8 22-8 26 0 1 8-5 15-13 15S4 23 5 15Z"/><path d="M5 15h26M18 15v15M11 16l2 13M25 16l-2 13M9 15l3-6m12 6 3-6"/>',
  'dried-fish': '<path d="M6 12c8-4 16-4 24 0v12c-8 4-16 4-24 0Z"/><path d="m6 12-3 6 3 6M30 12l3 6-3 6M12 13v10m6-11v12m6-11v10"/>',
  crab: '<ellipse cx="18" cy="22" rx="9" ry="6"/><path d="M9 21c-4 0-6-1-7-4m7 8c-3 2-6 1-7-2M27 21c4 0 6-1 7-4m-7 8c3 2 6 1 7-2M12 17c-3-3-6-4-8-2 0-3 4-5 7-3M24 17c3-3 6-4 8-2 0-3-4-5-7-3M15 17l1-4m4 4 1-4"/><circle cx="15.5" cy="12" r="1"/><circle cx="20.5" cy="12" r="1"/>',
  eel: '<path d="M3 24c4-8 8-8 12-2s8 6 12-2c2-4 3-8 3-11"/><path d="M30 9c1-2 3-3 5-2-1 2-3 3-5 3M5 22l-2 4 3 2"/>',
  bowl: '<path d="M4 18h28c0 8-6 13-14 13S4 26 4 18Z"/><path d="M9 31h18M13 13c-2-3 1-4 0-7m6 7c-2-3 1-4 0-7m6 7c-2-3 1-4 0-7"/>',
  biscuit: '<rect x="6" y="8" width="24" height="20" rx="3"/><path d="M12 14h.01M18 14h.01M24 14h.01M12 20h.01M18 20h.01M24 20h.01M15 17h.01M21 17h.01M15 23h.01M21 23h.01"/>',
  olives: '<path d="M4 29C10 21 19 13 32 6"/><ellipse cx="13" cy="19" rx="3" ry="4.2" transform="rotate(-35 13 19)"/><ellipse cx="22" cy="13" rx="3" ry="4.2" transform="rotate(-35 22 13)"/><path d="M18 21c3 0 6 2 7 5M9 14c3-1 6 0 8 2M25 9c3-1 6 0 8 2"/>',
  fig: '<path d="M18 7c-1 5-8 7-8 15 0 5 4 9 8 9s8-4 8-9c0-8-7-10-8-15Z"/><path d="M18 7c0-2 1-3 2-5M12 16l6 5 6-5M14 25c1 2 2 3 4 4"/>',
  pear: '<path d="M18 8c-2 4-8 7-9 14-1 6 3 10 9 10s10-4 9-10c-1-7-7-10-9-14Z"/><path d="M18 8c0-2 1-4 3-5M12 22c0 4 2 7 5 8"/>',
  slab: '<path d="M6 13c6-2 18-2 24 0v13c-6 2-18 2-24 0Z"/><path d="M6 19c6-2 18-2 24 0M12 14v11m12-11v11"/>',
  mug: '<path d="M7 13h18v12c0 4-3 6-6 6h-6c-3 0-6-2-6-6Z"/><path d="M25 16h3c3 0 4 2 4 4s-1 4-4 4h-3M7 17h18M12 10c-2-2 1-3 0-6m6 6c-2-2 1-3 0-6"/>',
  chocolate: '<rect x="6" y="9" width="24" height="19" rx="2"/><path d="M6 15.3h24M6 21.6h24M14 9v19M22 9v19M26 9l4 4"/>',
  axe: '<path d="M11 33 24 9M21 6c4-1 9 1 10 5l-6 4c-1-3-3-4-6-4Z"/><path d="m19 11 5 3"/>',
  logs: '<ellipse cx="9" cy="24" rx="4" ry="5"/><ellipse cx="9" cy="24" rx="1.5" ry="2"/><path d="M9 19h19c2 0 4 2 4 5s-2 5-4 5H9"/><ellipse cx="17" cy="12" rx="4" ry="5"/><ellipse cx="17" cy="12" rx="1.5" ry="2"/><path d="M17 7h11c2 0 3 2 3 5s-1 5-3 5h-6"/>',
  hammer: '<path d="M16 14 29 31M10 5l12 9-4 5L6 9Z"/><path d="M6 9 3 13"/>',
  saw: '<path d="M5 28 26 7l5 5-21 21ZM26 7l3-3 3 3-3 3"/><path d="m10 28 2-2m2 0 2-2m2 0 2-2m2 0 2-2"/>',
  plank: '<path d="M4 20 26 8l6 4-22 12Z"/><path d="M4 20v4l6 4v-4M32 12v4L10 28"/><path d="m12 16 4 3m4-5 4 3"/>',
  birdhouse: '<path d="M18 4 6 14h24Z"/><path d="M9 14v14h18V14"/><circle cx="18" cy="19" r="3"/><path d="M18 25v3M14 28v4h8v-4"/>',
  ribbon: '<path d="M18 16c-4-6-12-8-12-2s8 6 12 2Zm0 0c4-6 12-8 12-2s-8 6-12 2Z"/><path d="M16 17l-5 13 4-2 2 4 1-15M20 17l5 13-4-2-2 4-1-15"/>',
  bottle: '<path d="M15 3h6v7c0 2 4 3 4 8v13c0 1-1 2-2 2H13c-1 0-2-1-2-2V18c0-5 4-6 4-8Z"/><path d="M14 6h8M11 21h14v7H11"/>',
  jug: '<path d="M13 5h8M14 5v4c-5 3-7 8-7 13 0 6 4 9 10 9s10-3 10-9c0-5-2-10-7-13V5"/><path d="M27 15c4 0 5 3 5 5s-2 5-5 5M9 19h18"/>',
};

/** Every icon the satchel can draw; item definitions are checked against it in tests. */
export const ICON_KINDS = Object.freeze(Object.keys(iconPaths));

function icon(kind) {
  const wrapper = document.createElement('span');
  wrapper.className = 'inventory-item-icon';
  wrapper.setAttribute('aria-hidden', 'true');
  wrapper.innerHTML = `<svg viewBox="0 0 36 36" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round">${iconPaths[kind]}</svg>`;
  return wrapper;
}

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

export function createInventory({
  onInspect = () => {}, onClose = () => {},
  getWeaponStatus = () => null, onEquip = () => false,
  getConsumableStatus = () => null, onConsume = () => ({ok: false}),
} = {}) {
  const state = createInventoryState();
  let opened = false;
  let returnFocus = null;
  let hoveredItem = null;
  const itemButtons = new Map();

  const backdrop = element('div', 'inventory-overlay');
  backdrop.id = 'inventory-backdrop';
  backdrop.hidden = true;
  const panel = element('section', 'inventory-drawer');
  panel.id = 'inventory-panel';
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-modal', 'true');
  panel.setAttribute('aria-labelledby', 'inventory-title');
  panel.setAttribute('aria-describedby', 'inventory-hint');
  panel.tabIndex = -1;
  backdrop.append(panel);

  const header = element('header', 'inventory-header');
  header.append(element('p', 'inventory-eyebrow', 'What you carry'));
  const title = element('h2', '', 'Satchel');
  title.id = 'inventory-title';
  header.append(title);
  const subtitle = element('p', 'inventory-subtitle', 'I opens and closes your satchel.');
  header.append(subtitle);
  const closeButton = element('button', 'inventory-close', '×');
  closeButton.type = 'button';
  closeButton.id = 'inventory-close';
  closeButton.setAttribute('aria-label', 'Close satchel');
  closeButton.title = 'Close satchel · I or Esc';
  header.append(closeButton);
  panel.append(header);

  const scroller = element('div', 'inventory-scroll');
  const hint = element('p', 'inventory-hint');
  hint.id = 'inventory-hint';
  const list = element('div', 'inventory-items');
  list.id = 'inventory-items';
  list.setAttribute('role', 'group');
  list.setAttribute('aria-label', 'Carried items');
  const detail = element('section', 'inventory-detail');
  detail.id = 'inventory-detail';
  detail.setAttribute('aria-label', 'Selected item');
  detail.setAttribute('aria-live', 'polite');
  scroller.append(hint, list, detail);
  panel.append(scroller);

  const footer = element('footer', 'inventory-footer');
  const closeFooter = element('button', 'inventory-dismiss', 'Close satchel · I / Esc');
  closeFooter.type = 'button';
  footer.append(closeFooter, element('p', '', 'The world waits while you look.'));
  panel.append(footer);

  const tooltip = element('div', 'inventory-tooltip');
  tooltip.id = 'inventory-tooltip';
  tooltip.setAttribute('role', 'tooltip');
  tooltip.hidden = true;
  backdrop.append(tooltip);
  document.body.append(backdrop);

  function hideTooltip() {
    tooltip.hidden = true;
    for (const button of itemButtons.values()) button.removeAttribute('aria-describedby');
  }

  function showTooltip(id, button) {
    if (!opened) return;
    const item = INVENTORY_ITEMS[id];
    tooltip.replaceChildren(
      element('strong', '', item.name),
      element('span', 'inventory-tooltip-type', item.type),
      element('p', '', item.brief),
      element('span', 'inventory-tooltip-action', 'Click or Enter to select'),
    );
    const weapon = getWeaponStatus(id);
    if (weapon) {
      const condition = `${weapon.durability} of ${weapon.maxDurability} condition`;
      tooltip.querySelector('.inventory-tooltip-type').textContent = `${item.type} \u00b7 ${condition}${weapon.equipped ? ' \u00b7 Equipped' : ''}${!weapon.usable ? ' \u00b7 Broken' : ''}`;
    }
    for (const other of itemButtons.values()) other.removeAttribute('aria-describedby');
    button.setAttribute('aria-describedby', tooltip.id);
    tooltip.hidden = false;
    const bounds = button.getBoundingClientRect();
    const width = Math.min(258, window.innerWidth - 24);
    tooltip.style.width = `${width}px`;
    const left = bounds.left - width - 14;
    tooltip.style.left = `${Math.max(12, left >= 12 ? left : Math.min(bounds.left, window.innerWidth - width - 12))}px`;
    const preferredTop = left >= 12 ? bounds.top : bounds.bottom + 8;
    tooltip.style.top = `${Math.max(12, Math.min(preferredTop, window.innerHeight - tooltip.offsetHeight - 12))}px`;
  }

  function renderDetail() {
    const id = state.selectedId();
    for (const [itemId, button] of itemButtons) {
      button.classList.toggle('selected', itemId === id);
      button.setAttribute('aria-pressed', String(itemId === id));
    }
    detail.replaceChildren();
    if (!id) {
      detail.append(
        element('p', 'inventory-detail-kicker', 'Take a closer look'),
        element('h3', '', state.items().length ? 'Select an item above' : 'Room for a journey'),
        element('p', '', state.items().length
          ? 'Hover over an item for a quick description. Click it, or use Tab then Enter, to see what you are carrying.'
          : 'Items given to you on the road will appear here. Speak with Lakota at the head of the pier to receive your first errand.'),
      );
      return;
    }
    const item = INVENTORY_ITEMS[id];
    detail.append(element('p', 'inventory-detail-kicker', item.type), element('h3', '', item.name));
    if (item.stackable) detail.append(element('p', 'inventory-detail-count', `${state.count(id)} carried`));
    if (id === 'harbor-letter') {
      detail.append(element('p', 'inventory-description', item.description));
      const letter = element('article', 'inventory-letter');
      letter.id = 'inventory-letter-body';
      letter.setAttribute('aria-label', 'Lakota’s message to Quartermaster Corvan');
      letter.tabIndex = 0;
      letter.append(
        element('p', 'inventory-letter-address', 'To Quartermaster Corvan, Ambroni army, The Avrel Clearing'),
        element('p', '', 'Bramble goblin raiders have cut the road out of Tidehaven. Our watch is holding the northern path, but the village needs help keeping travelers safe.'),
        element('p', '', 'The bearer has answered the Ambroni Empire’s call for mercenaries. Receive them at your field post, record their service, and give them their first orders. They arrive with a plain sword and no armor.'),
        element('p', '', 'The army promises protection from the goblin raids spilling out of Pueth and says it needs hands against the rebels in the south. First report at the Avrel clearing, just beyond Tidehaven’s forest. Keep this letter as your introduction and proof of service; Corvan will arrange the copies needed farther up the road.'),
        element('p', 'inventory-letter-signature', 'Lakota\nof Tidehaven, by the bird garden'),
      );
      detail.append(letter);
    } else {
      detail.append(element('p', 'inventory-description', item.description));
    }
    const weapon = getWeaponStatus(id);
    if (item.type === 'Weapon' && weapon) {
      const condition = element('meter', 'inventory-condition');
      condition.min = 0;
      condition.max = weapon.maxDurability;
      condition.value = weapon.durability;
      condition.low = weapon.maxDurability === 6 ? 2 : weapon.maxDurability / 4;
      condition.high = weapon.maxDurability;
      condition.optimum = weapon.maxDurability;
      condition.setAttribute('aria-label', `${item.name} condition`);
      condition.setAttribute('aria-valuetext', `${weapon.durability} of ${weapon.maxDurability}${weapon.usable ? '' : ', broken'}`);
      const conditionText = element('p', 'inventory-condition-text', `${weapon.durability} of ${weapon.maxDurability} condition${weapon.usable ? '' : ' \u00b7 Broken'}`);
      detail.append(conditionText, condition);
      if (!weapon.usable) detail.append(element('p', 'inventory-equipment-note', id !== 'forest-stick'
        ? `Broken: your ${item.name.toLowerCase()} cannot attack. Keep it and repair it for free at the village workbench beside the straw practice post. Press F at the bench.`
        : 'This stick is spent. Gather another in the forest with F, or equip another weapon.'));
      else detail.append(element('p', 'inventory-equipment-note', id !== 'forest-stick'
        ? 'Repair before it breaks: press F at the free village workbench beside the straw practice post.'
        : `${state.count(id)} carried, including the stick in use. The village workbench can mend a partly worn stick; a broken one is consumed.`));
      const equipButton = element('button', 'inventory-dismiss inventory-equip', weapon.equipped ? 'Equipped' : `Equip ${id === 'forest-stick' ? 'stick' : id === 'simple-sword' ? 'sword' : item.name.toLowerCase()}`);
      equipButton.type = 'button';
      equipButton.dataset.equip = id;
      equipButton.disabled = weapon.equipped || !weapon.usable || weapon.equipBlocked;
      equipButton.setAttribute('aria-label', weapon.equipped ? `${item.name} is equipped` : `Equip ${item.name}`);
      equipButton.addEventListener('click', () => {
        const current = getWeaponStatus(id);
        if (!current?.usable || current.equipped || current.equipBlocked) return;
        onEquip(id);
        hideTooltip();
        renderItems();
        detail.tabIndex = -1;
        detail.focus({preventScroll: true});
      });
      detail.append(equipButton);
      if (weapon.equipBlocked) detail.append(element('p', 'inventory-equipment-note', 'Close the satchel and finish your current swing or dodge before switching weapons.'));
    }
    const consumable = getConsumableStatus(id);
    if (consumable) {
      const healthText = element('p', 'inventory-condition-text', `${consumable.health} of ${consumable.maxHealth} health`);
      const health = element('meter', 'inventory-condition inventory-health');
      health.min = 0;
      health.max = consumable.maxHealth;
      health.value = consumable.health;
      health.low = consumable.maxHealth / 4;
      health.high = consumable.maxHealth;
      health.optimum = consumable.maxHealth;
      health.setAttribute('aria-label', 'Your health');
      health.setAttribute('aria-valuetext', `${consumable.health} of ${consumable.maxHealth} health`);
      const foodName = item.eatName || item.name.toLowerCase();
      // Most of the satchel is eaten. A pipe is not, so an item may name its own verb.
      const verb = item.useVerb || 'Eat';
      const consumeButton = element('button', 'inventory-dismiss inventory-consume', `${verb} ${foodName} \u00b7 +${consumable.healing} health`);
      consumeButton.type = 'button';
      consumeButton.dataset.consume = id;
      consumeButton.disabled = !consumable.canUse;
      consumeButton.setAttribute('aria-label', `${verb} one ${foodName} to restore up to ${consumable.healing} health`);
      const note = element('p', 'inventory-consumable-note', consumable.canUse
        ? `${verb} one ${foodName}. Any remaining stays in your satchel.`
        : consumable.reason);
      note.id = 'inventory-consumable-note';
      consumeButton.setAttribute('aria-describedby', note.id);
      consumeButton.addEventListener('click', () => {
        const current = getConsumableStatus(id);
        // Recheck after the click: health or action state may have changed since rendering.
        const result = current?.canUse ? onConsume(id) : {ok: false, reason: current?.reason};
        hideTooltip();
        renderItems();
        if (result?.ok) {
          const feedback = element('p', 'inventory-consumable-note', `Restored ${result.healed} health.`);
          feedback.setAttribute('role', 'status');
          detail.append(feedback);
        } else if (result?.reason && !state.has(id)) {
          detail.append(element('p', 'inventory-consumable-note', result.reason));
        }
        if (opened) {
          // Removing the last serving also removes the button. Keep keyboard focus
          // inside the drawer, without silently selecting an unrelated item.
          const nextButton = detail.querySelector('[data-consume]');
          if (nextButton && !nextButton.disabled) nextButton.focus({preventScroll: true});
          else { detail.tabIndex = -1; detail.focus({preventScroll: true}); }
        }
      });
      detail.append(healthText, health, consumeButton, note);
    }
  }

  function select(id) {
    if (!state.select(id)) return false;
    hideTooltip();
    renderDetail();
    // Selecting a message should reveal its contents even in a short window;
    // the drawer header and dismiss control remain fixed while this area scrolls.
    if(opened)detail.scrollIntoView({block:'start',behavior:'smooth'});
    onInspect(id);
    return true;
  }

  function renderItems() {
    const focusedId = document.activeElement?.dataset?.itemId;
    const focusedConsumable = document.activeElement?.dataset?.consume;
    list.replaceChildren();
    itemButtons.clear();
    for (const id of state.items()) {
      const item = INVENTORY_ITEMS[id];
      const weapon = getWeaponStatus(id);
      const button = element('button', 'inventory-item');
      button.type = 'button';
      button.dataset.itemId = id;
      button.setAttribute('aria-label', `${item.name}${item.stackable ? `, ${state.count(id)} carried` : ''}, ${item.type}${weapon ? `, ${weapon.durability} of ${weapon.maxDurability} condition${weapon.equipped ? ', equipped' : ''}${!weapon.usable ? ', broken' : ''}` : ''}. Select to inspect.`);
      button.setAttribute('aria-pressed', String(id === state.selectedId()));
      const label = element('span', 'inventory-item-label');
      label.append(element('strong', '', item.name), element('small', '', weapon
        ? `${item.type} \u00b7 ${weapon.durability}/${weapon.maxDurability}${weapon.usable ? '' : ' \u00b7 Broken'}`
        : item.type));
      button.append(icon(item.icon), label);
      if (item.stackable) button.append(element('span', 'inventory-stack-count', `\u00d7${state.count(id)}`));
      button.append(element('span', 'inventory-select-label', weapon?.equipped ? 'Equipped' : 'Select'));
      button.addEventListener('click', () => select(id));
      button.addEventListener('pointerenter', () => { hoveredItem = id; showTooltip(id, button); });
      button.addEventListener('pointerleave', () => {
        hoveredItem = null;
        if (document.activeElement !== button) hideTooltip();
      });
      button.addEventListener('focus', () => showTooltip(id, button));
      button.addEventListener('blur', () => { if (hoveredItem !== id) hideTooltip(); });
      itemButtons.set(id, button);
      list.append(button);
    }
    if (!state.items().length) list.append(element('p', 'inventory-empty', 'Your satchel is empty for now.'));
    renderDetail();
    if (focusedId && opened) itemButtons.get(focusedId)?.focus({preventScroll: true});
    if (focusedConsumable && opened) {
      const nextButton = detail.querySelector('[data-consume]');
      if (nextButton?.dataset.consume === focusedConsumable && !nextButton.disabled) nextButton.focus({preventScroll: true});
      else { detail.tabIndex = -1; detail.focus({preventScroll: true}); }
    }
  }

  function close() {
    if (!opened) return false;
    opened = false;
    hoveredItem = null;
    hideTooltip();
    backdrop.hidden = true;
    if (returnFocus?.isConnected) returnFocus.focus({preventScroll: true});
    returnFocus = null;
    onClose();
    return true;
  }

  closeButton.addEventListener('click', close);
  closeFooter.addEventListener('click', close);
  backdrop.addEventListener('click', event => { if (event.target === backdrop) close(); });
  scroller.addEventListener('scroll', hideTooltip, {passive: true});
  window.addEventListener('resize', hideTooltip);
  panel.addEventListener('keydown', event => {
    if (!opened || event.code !== 'Tab') return;
    const focusable = [...panel.querySelectorAll('button:not(:disabled), [tabindex="0"]')];
    const first = focusable[0], last = focusable.at(-1);
    if (event.shiftKey && (document.activeElement === first || document.activeElement === panel)) {
      event.preventDefault(); last?.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault(); first?.focus();
    }
    event.stopPropagation();
  });

  renderItems();
  return {
    grant(id) {
      const added = state.grant(id);
      if (added) { hideTooltip(); renderItems(); }
      return added;
    },
    add(id, quantity = 1) {
      const added = state.add(id, quantity);
      if (added) { hideTooltip(); renderItems(); }
      return added;
    },
    count: state.count,
    remove(id, quantity = 1) {
      const removed = state.remove(id, quantity);
      if (removed) { hideTooltip(); renderItems(); }
      return removed;
    },
    has: state.has,
    items: state.items,
    selectedId: state.selectedId,
    select,
    refresh() { hideTooltip(); renderItems(); },
    isOpen: () => opened,
    open({lesson = false} = {}) {
      hint.textContent = lesson
        ? 'Your next lesson: select Lakota’s message and read your errand. Then close the satchel with I, Esc, or ×.'
        : 'Hover for a tooltip. Click an item, or use Tab then Enter, to inspect it.';
      if (opened) return;
      opened = true;
      returnFocus = document.activeElement;
      backdrop.hidden = false;
      panel.classList.toggle('inventory-lesson', lesson);
      renderItems();
      closeButton.focus({preventScroll: true});
    },
    close,
  };
}

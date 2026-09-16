/**
 * The campaign atlas: what each authored Azhora region means for play.
 *
 * Pure data and pure functions. Region ids are the exact authored names from
 * World Builder (assets/azhora-dev-regions.json). Everything here describes
 * design intent for the civil-war campaign; it does not change the source map.
 *
 * Difficulty levels
 *   0  Tutorial   nothing attacks outside quests (Drent, Elagos, West Izol)
 *   1  Outskirts  a single kind of danger that can kill the careless
 *   2  Unsettled  bandits, wolf packs, hill goblins; instability from the war
 *   3  Hard       mountains, deserts, strong goblins; not a starter region
 *   4  Perilous   orc-allied goblin bases, wild trolls and giants
 *   5  Deadly     the heart of the Thalmagar arc
 */
export const CAMPAIGN_WORLD_VERSION = 1;

export const LEVELS = Object.freeze([
  Object.freeze({ level: 0, name: 'Tutorial', tint: '#8fd39a', note: 'Nothing attacks you outside a quest.' }),
  Object.freeze({ level: 1, name: 'Outskirts', tint: '#c9d66f', note: 'One kind of danger, deadly only if you are careless.' }),
  Object.freeze({ level: 2, name: 'Unsettled', tint: '#e8c25a', note: 'Bandits, wolf packs and hill goblins feed on the war.' }),
  Object.freeze({ level: 3, name: 'Hard', tint: '#e58f4a', note: 'Mountains, deserts and stronger goblins. Not a starter region.' }),
  Object.freeze({ level: 4, name: 'Perilous', tint: '#d4553f', note: 'Orc-allied goblin bases; trolls and giants roam.' }),
  Object.freeze({ level: 5, name: 'Deadly', tint: '#8c2f5a', note: 'The heart of the Thalmagar arc.' }),
]);

export const FACTIONS = Object.freeze({
  empire: Object.freeze({ id: 'empire', name: 'Ambroni Empire', short: 'Empire', seat: 'Ambron', army: 'the Ambroni Legion', tint: '#c9a24a',
    note: 'The lake-country monarchy that has ruled most of eastern Azhora for generations and is now losing its grip on every frontier.' }),
  coalition: Object.freeze({ id: 'coalition', name: 'Republican Coalition', short: 'Coalition', seat: 'Izolveth', army: 'the Coalition army', tint: '#5f8fd6',
    note: 'Ambroni heartland rebels, the Izoli Republic, the Suvals, a small Pyrosi contingent, Selemis, Marosh, a few city-states of the southern tropical islands, and a renounced Ambroni prince, united to replace the monarchy with a republic.' }),
  contested: Object.freeze({ id: 'contested', name: 'Contested', short: 'Contested', tint: '#b0a48f',
    note: 'Empire and Coalition both hold ground here. A regional arc for either side settles it.' }),
  izoli: Object.freeze({ id: 'izoli', name: 'Izoli Republic', short: 'Izoli', seat: 'Izolveth', tint: '#4f7fbf',
    note: 'The southern republic that raised the Coalition and shelters its army.' }),
  elodi: Object.freeze({ id: 'elodi', name: 'Elod', short: 'Elodi', seat: 'Elod', tint: '#9b8fb8',
    note: 'A neutral city-state guarding its borders against every side of the war.' }),
  feradom: Object.freeze({ id: 'feradom', name: 'Duchy of Feradom', short: 'Feradom', seat: 'the pass castles', tint: '#a37c5c',
    note: 'Officially loyal to the Empire; its people would rather crown their duke than join a republic.' }),
  pyrosi: Object.freeze({ id: 'pyrosi', name: 'Pyros', short: 'Pyrosi', seat: 'Gala', tint: '#c97b6a',
    note: 'One empire ruling East and West Pyros. Overrun by goblins and its own rebellion, it sends only a small contingent to the Coalition; there is no South Pyros.' }),
  mithalan: Object.freeze({ id: 'mithalan', name: 'Mithalan Empire', short: 'Mithalan', seat: 'the river-city of Mithala', tint: '#7fa7a0',
    note: 'A river empire with a rebellion of its own, north of the Lotharn.' }),
  thalmagar: Object.freeze({ id: 'thalmagar', name: 'Thalmagar', short: 'Thalmagar', seat: 'Cape Thalmagar', tint: '#4a2c4f',
    note: 'The dark lord of the far northwest, whose orcs and goblin allies press south.' }),
  wild: Object.freeze({ id: 'wild', name: 'No ruler', short: 'Wild', tint: '#6f7d6a', note: 'No faction holds this land.' }),
});

export const THREATS = Object.freeze({
  'bramble-goblin': Object.freeze({ name: 'Bramble goblins', tier: 1, note: 'The weakest goblins, local to the wooded east. Not part of Thalmagar’s forces.' }),
  'hill-goblin': Object.freeze({ name: 'Hill goblins', tier: 2, note: 'Tougher than bramble goblins; found where woodland turns to hills.' }),
  'sand-goblin': Object.freeze({ name: 'Sand goblins', tier: 2, note: 'Desert goblins of the west, the counterpart of the hill goblins.' }),
  'mountain-goblin': Object.freeze({ name: 'Mountain goblins', tier: 3, note: 'Stronger still, and lately allied with orcs.' }),
  orc: Object.freeze({ name: 'Orcs', tier: 4, note: 'The warrior kin of goblins, larger and armored. Thalmagar’s soldiers. Normally found only in the far north.' }),
  wolf: Object.freeze({ name: 'Wolves', tier: 1, note: 'One wolf is manageable. A pack at night, off the roads, can kill you.' }),
  'wolf-pack': Object.freeze({ name: 'Wolf packs', tier: 2, note: 'Packs hunt the lonely traveler in the wild.' }),
  bandit: Object.freeze({ name: 'Bandits', tier: 2, note: 'Crime feeds on high taxes and a distracted army.' }),
  'hill-bandit': Object.freeze({ name: 'Hill bandits', tier: 3, note: 'Organized bands preying on all three Suvals from the uplands.' }),
  pirate: Object.freeze({ name: 'Pirates', tier: 2, note: 'They want a toll, not your life. Refuse and they fight.' }),
  troll: Object.freeze({ name: 'Wild trolls', tier: 4, note: 'Rare and very dangerous.' }),
  giant: Object.freeze({ name: 'Giants', tier: 5, note: 'Rare and very dangerous.' }),
});

/** Named places that the campaign refers to. Lore names are cited where they exist. */
export const SETTLEMENTS = Object.freeze({
  tidehaven: Object.freeze({ id: 'tidehaven', name: 'Tidehaven', region: 'Drent', note: 'The sheltered landing on the Stills where the mercenary steps ashore.' }),
  ambron: Object.freeze({ id: 'ambron', name: 'Ambron', region: 'Elagos', note: 'The imperial capital on the Lake Ela narrows: walled, causewayed, the empire’s economic heart (lore: elagos.md).' }),
  solis: Object.freeze({ id: 'solis', name: 'Solis', region: 'West Suval', note: 'The market city of the southwest, first held by the Coalition landing.' }),
  elod: Object.freeze({ id: 'elod', name: 'Elod', region: 'East Suval', note: 'A small neutral city-state in the northeast of East Suval (lore: suval.md, the Elodi).' }),
  lamdris: Object.freeze({ id: 'lamdris', name: 'Lamdris', region: 'South Suval', note: 'A lake city in the lowlands, garrisoned; the uplands above it belong to the hill bandits.' }),
  mavren: Object.freeze({ id: 'mavren', name: 'Mavren', region: 'Amod', note: 'Terraced town at the meeting of three valleys; the Empire’s outpost fortress (lore: amod.md).' }),
  gala: Object.freeze({ id: 'gala', name: 'Gala', region: 'West Pyros', note: 'The walled Pyrosi capital above a river confluence (lore: pyros.md).' }),
  mithalaCity: Object.freeze({ id: 'mithala-city', name: 'The Mithalan river-city', region: 'South Mithala', note: 'Where the rivers of West, East and South Mithala meet. Name pending.' }),
  izolveth: Object.freeze({ id: 'izolveth', name: 'Izolveth', region: 'West Izol', note: 'The Izoli port that shelters the Coalition army.' }),
  tornMouth: Object.freeze({ id: 'torn-mouth', name: 'The Torn mouth', region: 'Drent', note: 'Seat of the Ambroni Lord Protector of Drent (lore: drent.md).' }),
});

const region = (id, level, control, climate, threats, role, extra = {}) =>
  Object.freeze({ id, level, control, climate, threats: Object.freeze([...threats]), role, provisional: false, ...extra });

/**
 * Authored campaign design per region. `control` is the state at the start of
 * the game. `provisional` marks levels inferred from terrain rather than stated.
 */
export const REGION_DESIGN = Object.freeze([
  // Ambroni heartland
  region('Drent', 0, 'empire', 'Wet, wooded coastal slope; river valleys under forested upland; the Stills and the Pebbles offshore.', ['bramble-goblin'],
    'Starting region. The most stable province outside Elagos. One scripted bramble-goblin raid; nothing else attacks.', { story: 'prologue', settlements: ['tidehaven', 'torn-mouth'] }),
  region('Elagos', 0, 'empire', 'Cold, clear lake country; lake-effect snow; forests of dense-grained timber.', [],
    'The imperial core. Heavily militarized, densely settled, no threats. Ambron sits on the Lake Ela narrows.', { story: 'empire-capital', settlements: ['ambron'] }),
  region('Luscia', 1, 'contested', 'Rolling steppe-grassland thinning from Drent’s woods toward the Moros; scattered woodland on the Luscian Hills; the Lauvel valley.', ['wolf-pack'],
    'Second main-quest region: the aftermath of the battle the rebels lost. Wolves are the danger off the roads at night. Rebel rangers hide along the East Suval border.', { story: 'main-2', arcs: ['empire', 'coalition'] }),
  region('Peblos', 1, 'contested', 'Low barrier islands and shifting sands; fishing villages; rocks and channels only the pilots can read.', ['pirate'],
    'Reached by ferry, boat or a dangerous swim. An Ambroni naval station; a hidden rebel ship in a sea cave; pirates who tax rather than kill.', { arcs: ['empire', 'coalition'] }),
  region('Pueth', 1, 'contested', 'Cool, peripheral grassland rising into barrier hills toward Feradom; wooded in the south.', ['bramble-goblin', 'hill-goblin'],
    'Divided: Empire guard posts on the western road, rebels in the east, goblins on every edge. The raid on Drent spilled out of here.', { arcs: ['empire', 'coalition'] }),
  region('Vastos', 1, 'contested', 'Flat, frost-heaved upland pasture; roads that fail in wet years.', ['bramble-goblin', 'hill-goblin'],
    'Many bramble goblins, hill goblins toward the Lotharn. An Empire-versus-Coalition arc.', { arcs: ['empire', 'coalition'] }),
  region('Meneth', 1, 'contested', 'Route-junction valleys between the Lotharn and the lake country; rye and barley in the south.', ['bramble-goblin', 'hill-goblin'],
    'Many bramble goblins, hill goblins in the north. An Empire-versus-Coalition arc.', { arcs: ['empire', 'coalition'] }),
  region('Moros Plain', 2, 'empire', 'Absolutely flat continental grassland; enormous sky; armies visible for days.', ['bandit', 'wolf'],
    'Third main-quest region: the Legion’s camp, and the border battle. Horses matter here.', { story: 'main-3', arcs: ['empire', 'coalition'] }),
  region('West Suval', 2, 'coalition', 'Grassland and low hills toward the coast; Solis on the southwest.', ['bandit', 'wolf'],
    'Fourth main-quest region: the Coalition army at Solis and the first fork in the story.', { story: 'main-4', arcs: ['empire', 'coalition'], settlements: ['solis'] }),
  region('East Suval', 2, 'elodi', 'Lowland plain in the north, hills in the south.', ['hill-bandit', 'wolf-pack'],
    'Elod keeps its borders locked and stays out of the war. The lowlands are safe; the southern hills belong to bandits.', { settlements: ['elod'] }),
  region('South Suval', 3, 'contested', 'Uplands falling to a lake; the garrison in the lowlands.', ['hill-bandit', 'wolf-pack'],
    'Lamdris by the lake is held; the far north is the hill bandits’ stronghold, preying on all three Suvals.', { settlements: ['lamdris'] }),
  region('Amod', 2, 'contested', 'Lotharn foothills: terraces, orchards, chestnut and oak, pass roads.', ['bramble-goblin', 'hill-goblin', 'wolf'],
    'Empire fortress at Mavren; rebels in the northwest; both fight goblins more than each other. Second battle sequence: the hill goblin chief.', { story: 'empire-5', arcs: ['empire', 'coalition', 'truce'], settlements: ['mavren'] }),
  region('Feradom', 2, 'feradom', 'Forested barrier hills with a half-dozen guarded passes; northern harbors.', ['hill-goblin'],
    'A near-independent duchy, loyal on paper. A weak Coalition arc; whispers of an independent crown.', { arcs: ['empire', 'coalition'] }),
  region('Nesdor', 2, 'contested', 'Plains giving way to the western deserts.', ['bramble-goblin', 'sand-goblin'],
    'Coalition counterpart of Amod: rebels and people alike fight sand goblins. Second battle for the Coalition arc: the sand goblin chief.', { story: 'coalition-5', arcs: ['empire', 'coalition', 'truce'] }),
  region('Caricas', 2, 'contested', 'Open grassland southwest of Meneth.', ['bramble-goblin', 'wolf'], 'Bramble goblins and wolves; a quieter contested province.', { arcs: ['empire', 'coalition'] }),
  region('Eer', 2, 'contested', 'Chalk hills and plains toward the coast.', ['bandit', 'wolf'], 'Unrest on the road south from the Moros.', { arcs: ['empire', 'coalition'] }),
  // The Izoli south
  region('West Izol', 0, 'izoli', 'Grassland, hills and headlands on the southern coast.', [],
    'The Izoli Republic’s stable heart. Temporarily houses most of the Coalition army preparing to move on the Moros.', { story: 'coalition-capital', settlements: ['izolveth'] }),
  region('East Izol', 1, 'izoli', 'Grass, hills and forest along the coast.', ['wolf'], 'Fully Izoli. Only wolves.', {}),
  // Between the heartland and the western empires
  region('East Lotharn Mountains', 3, 'wild', 'Old mineral mountains: iron seams, coal, forested ridges.', ['hill-goblin', 'mountain-goblin', 'wolf-pack', 'troll', 'giant', 'orc'],
    'First level-3 region of the Empire arc. Scouting finds orcs. Three survey points: rebels, goblins, orcs.', { story: 'empire-6', arcs: ['empire', 'coalition', 'truce'] }),
  region('West Lotharn Mountains', 4, 'wild', 'Higher, harder mountains west of the Lotharn interior.', ['mountain-goblin', 'wolf-pack', 'bandit', 'orc'],
    'The main mountain-goblin base, with orcs stationed inside it. Infiltrate and kill the orc chief, then flee.', { story: 'empire-7' }),
  region('Ovesos', 3, 'wild', 'Dry grassland at the edge of the Oves Desert.', ['sand-goblin', 'wolf-pack', 'orc'],
    'Coalition counterpart of East Lotharn: scouting finds orcs.', { story: 'coalition-6' }),
  region('Oves Desert', 4, 'wild', 'Open desert with low hills.', ['sand-goblin', 'bandit', 'orc'],
    'The sand goblin base, with orcs stationed inside it. Join rangers to assassinate the orc chief.', { story: 'coalition-7' }),
  region('South Mithala', 3, 'mithalan', 'River plains with hills toward the Lotharn.', ['hill-goblin', 'wolf-pack'],
    'Scout northwest for the Empire arc; the river-city where the three Mithalas meet.', { story: 'empire-8', settlements: ['mithala-city'] }),
  region('West Mithala', 3, 'mithalan', 'Grassland along the western river.', ['hill-goblin', 'wolf-pack'], 'Mithalan Empire; its own rebellion.', {}),
  region('North Mithala', 4, 'mithalan', 'Plains toward the Acor Wetlands.', ['hill-goblin', 'wolf-pack', 'troll'], 'Mithalan Empire; its own rebellion.', {}),
  region('East Mithala', 4, 'mithalan', 'Plains and grassland below the Acorwood.', ['hill-goblin', 'wolf-pack', 'troll'], 'Mithalan Empire; its own rebellion.', {}),
  region('East Pyros', 3, 'pyrosi', 'Plains of the empire of Pyros.', ['sand-goblin', 'bandit'], 'Scout west for the Coalition arc; Pyros is overrun by goblins and its own rebellion, which is why so few Pyrosi march with the Coalition.', { story: 'coalition-8' }),
  region('West Pyros', 3, 'pyrosi', 'Plains around the Pyrosi capital.', ['sand-goblin', 'bandit'], 'Gala, the walled capital of Pyros above the river confluence. East and West Pyros are one empire.', { settlements: ['gala'] }),
  region('South Oremindi Mountains', 5, 'wild', 'High cold mountains with lakes; the Verath practice of the Sevronese.', ['mountain-goblin', 'orc', 'troll', 'giant'],
    'Where the Empire and Coalition arcs converge: the orcs are investigated and a sage is met. The Thalmagar arc proper begins.', { story: 'convergence' }),
  // Level 3
  region('Isareos', 3, 'wild', 'Grassland west of the Lotharn.', ['bramble-goblin', 'wolf-pack', 'bandit'], 'Level 3 by design.', {}),
  region('Nethereum', 3, 'wild', 'Grassland toward the Nether Desert.', ['sand-goblin', 'wolf-pack'], 'Level 3 by design.', {}),
  region('Nether Desert', 3, 'wild', 'Open desert.', ['sand-goblin', 'bandit'], 'Level 3 by design.', {}),
  region('Yunethre', 3, 'wild', 'Plains below the South Oremindi.', ['mountain-goblin', 'wolf-pack'], 'Level 3 by design.', {}),
  region('South Ibenal', 3, 'wild', 'Plains west of the Ibenwood.', ['wolf-pack', 'bandit'], 'Level 3 by design.', {}),
  region('Alezhor', 3, 'wild', 'Plains and grassland south of the Ibenwood.', ['wolf-pack', 'bandit'], 'Level 3 by design.', {}),
  region('South Celder', 3, 'wild', 'Plains between the Lotharn and the Oremindi.', ['mountain-goblin', 'wolf-pack'], 'Level 3 by design.', {}),
  region('Gala', 3, 'pyrosi', 'Plains south of Nesdor.', ['sand-goblin', 'bandit'], 'Level 3 by design.', {}),
  region('Telemonia', 3, 'wild', 'Hills and plains toward the Oves Desert.', ['sand-goblin', 'hill-bandit'], 'Level 3 by design.', {}),
  region('Legemum', 3, 'wild', 'Grassland, hills and plains south of the Ascarth.', ['wolf-pack', 'bandit'], 'Level 3 by design.', {}),
  region('Ganesh Plain', 3, 'wild', 'Plains south of West Pyros.', ['sand-goblin', 'bandit'], 'Level 3 by design.', {}),
  region('Trogo', 3, 'wild', 'Deep forest and grassland in the far south.', ['wolf-pack', 'troll'], 'Level 3 by design.', {}),
  region('North Meroshe Desert', 3, 'wild', 'Northern desert plains.', ['sand-goblin', 'bandit'], 'Level 3 by design (the transcript also gave 4; 3 kept as the first statement).', {}),
  // Level 4
  region('North Ibenwood', 4, 'wild', 'Forest and deep forest under the South Oremindi.', ['mountain-goblin', 'wolf-pack', 'troll'], 'Level 4 by design.', {}),
  region('East Ibenwood', 4, 'wild', 'Deep forest toward the Nether Desert.', ['wolf-pack', 'troll'], 'Level 4 by design.', {}),
  region('South Ibenwood', 4, 'wild', 'Deep forest south of the Ibenwood heart.', ['wolf-pack', 'troll'], 'Level 4 by design.', {}),
  region('West Ibenwood', 4, 'wild', 'Forest and deep forest toward Ibenal.', ['wolf-pack', 'troll'], 'Level 4 by design.', {}),
  region('North Ibenal', 4, 'wild', 'Plains under the South Oremindi.', ['mountain-goblin', 'wolf-pack', 'giant'], 'Level 4 by design.', {}),
  region('Navarth', 4, 'wild', 'Hills, plains and forest between the Ibenwood and Pyros.', ['sand-goblin', 'hill-bandit', 'troll'], 'Level 4 by design.', {}),
  region('North Celder', 4, 'wild', 'Plains and grassland below the East Oremindi.', ['mountain-goblin', 'orc', 'wolf-pack'], 'Level 4 by design.', {}),
  region('Northern Ascarth', 4, 'wild', 'Grassland and hills.', ['bandit', 'wolf-pack', 'troll'], 'Level 4 by design.', {}),
  region('Ganesh Desert', 4, 'wild', 'Desert plains.', ['sand-goblin', 'bandit', 'giant'], 'Level 4 by design.', {}),
  region('Babon', 4, 'wild', 'Grassland and deep forest on the southern coast.', ['wolf-pack', 'troll'], 'Level 4 by design.', {}),
  region('West Meroshe Desert', 4, 'wild', 'Desert plains.', ['sand-goblin', 'bandit'], 'Level 4 by design.', {}),
  region('South Meroshe Desert', 4, 'wild', 'Desert plains.', ['sand-goblin', 'bandit'], 'Level 4 by design.', {}),
  region('Central Meroshe Desert', 4, 'wild', 'The desert heart.', ['sand-goblin', 'bandit', 'giant'], 'Level 4 by design.', {}),
  // Level 5
  region('Central Ibenwood', 5, 'wild', 'The deep heart of the Ibenwood.', ['troll', 'giant', 'orc'], 'Level 5 by design.', {}),
  region('Dinelv Highlands', 5, 'wild', 'Hills and mountains above Cape Heth.', ['mountain-goblin', 'orc', 'giant'], 'Level 5 by design.', {}),
  region('Cape Heth', 5, 'wild', 'A plains cape beside the Dinelv Highlands.', ['orc', 'giant'], 'Level 5 by design.', {}),
  region('Henborth', 5, 'thalmagar', 'Plains between the Oremindi and the Thalmagar approach.', ['orc', 'mountain-goblin', 'troll'], 'Level 5 (heard as “Bothis”; best match, confirm).', { provisional: true }),
  // Level 2 remainder
  region('Southern Ascarth', 2, 'wild', 'Grassland toward the southern coast.', ['bandit', 'wolf'], 'Level 2 by design.', {}),
  region('Hama', 2, 'wild', 'Grassland and plains in the far southwest.', ['bandit', 'wolf'], 'Level 2 by design.', {}),
  region('Marosh', 2, 'coalition', 'Grassland and hills between the deserts.', ['bandit', 'wolf'], 'Level 2 by design. The Maroshi kingdom sends companies to the Coalition.', {}),
  // The Thalmagar approach (not stated in the brief; inferred from the arc)
  region('Cape Thalmagar', 5, 'thalmagar', 'Plains under the dark lord’s fortress.', ['orc', 'troll', 'giant'], 'The dark lord’s seat. Fortress prototype exists in ghost view.', { provisional: true }),
  region('Cudon', 5, 'thalmagar', 'Plains, hills and mountains below the cape.', ['orc', 'mountain-goblin'], 'The cape’s southern approach.', { provisional: true }),
  region('Narcosh', 5, 'thalmagar', 'Highland, lakes and mountains east of the cape.', ['orc', 'mountain-goblin', 'troll'], 'The cape’s eastern approach.', { provisional: true }),
  region('Lesser Oremindi Mountains', 5, 'wild', 'Mountains north of the Oremindi.', ['orc', 'mountain-goblin', 'giant'], 'The northern Oremindi barrier.', { provisional: true }),
  region('North Oreminidi Mountains', 5, 'wild', 'High mountains.', ['orc', 'mountain-goblin', 'giant'], 'The northern Oremindi barrier.', { provisional: true }),
  region('East Oremindi Mountains', 4, 'wild', 'High mountains and hills.', ['mountain-goblin', 'orc', 'giant'], 'Oremindi range.', { provisional: true }),
  region('West Oremindi Mountains', 4, 'wild', 'High mountains.', ['mountain-goblin', 'orc', 'giant'], 'Oremindi range.', { provisional: true }),
]);

/** Spellings heard through voice-to-text, mapped to authored region ids. */
export const NAME_ALIASES = Object.freeze({
  'poeth': 'Pueth', 'pweith': 'Pueth', 'puith': 'Pueth', 'plymouth': 'Pueth', 'pueth': 'Pueth',
  'lucia': 'Luscia', 'lycia': 'Luscia', 'luskya': 'Luscia', 'lizeem': 'Luscia', 'luscia': 'Luscia',
  'elagos': 'Elagos', 'ellagos': 'Elagos', 'eligos': 'Elagos', 'elgos': 'Elagos', 'allego': 'Elagos', 'analogos': 'Elagos', 'algos': 'Elagos',
  'pedlos': 'Peblos', 'peblos': 'Peblos', 'pelos': 'Peblos', 'pebbles': 'Peblos',
  'moros plain': 'Moros Plain', 'moros': 'Moros Plain', 'pyros plain': 'Moros Plain', 'morrows plain': 'Moros Plain', 'morris plain': 'Moros Plain',
  'drent': 'Drent', 'drenn': 'Drent', 'drench': 'Drent', 'drenor': 'Drent',
  'vastus': 'Vastos', 'vastos': 'Vastos', 'bastos': 'Vastos', 'meneth': 'Meneth', 'menef': 'Meneth', 'math': 'Meneth',
  'nestor': 'Nesdor', 'nesdor': 'Nesdor', 'amad': 'Amod', 'ammad': 'Amod', 'amud': 'Amod', 'amald': 'Amod', 'emod': 'Amod', 'a mod': 'Amod', 'ahmad': 'Amod', 'amod': 'Amod',
  'ferodon': 'Feradom', 'feredom': 'Feradom', 'feradom': 'Feradom',
  'west suval': 'West Suval', 'east suval': 'East Suval', 'south suval': 'South Suval', 'west souval': 'West Suval', 'east suwall': 'East Suval', 'eastuval': 'East Suval',
  'catarcaz': 'Caricas', 'caricas': 'Caricas', 'sarious': 'Isareos', 'casarios': 'Isareos', 'isareos': 'Isareos', 'una 3': 'Yunethre', 'yunethre': 'Yunethre',
  'netherium': 'Nethereum', 'nethereum': 'Nethereum', 'nether desert': 'Nether Desert', 'vesos': 'Ovesos', 'ovesos': 'Ovesos',
  'ves desert': 'Oves Desert', 'ovest desert': 'Oves Desert', 'oves desert': 'Oves Desert', 'west desert': 'Oves Desert',
  'alidor': 'Alezhor', 'alezhor': 'Alezhor', 'lvarth': 'Navarth', 'navarth': 'Navarth',
  'north ibbenwood': 'North Ibenwood', 'north hivenwood': 'North Ibenwood', 'east hivenwood': 'East Ibenwood', 'south hivenwood': 'South Ibenwood', 'west hivenwood': 'West Ibenwood', 'central ebonywood': 'Central Ibenwood',
  'north evanal': 'North Ibenal', 'south evanal': 'South Ibenal',
  'south orimindi mountains': 'South Oremindi Mountains', 'south oremindi mountains': 'South Oremindi Mountains', 'azhora oremindi mountains': 'South Oremindi Mountains',
  'east lotharn mountains': 'East Lotharn Mountains', 'west lotharn mountains': 'West Lotharn Mountains', 'eastern lotharn mountains': 'East Lotharn Mountains', 'western lotharn mountains': 'West Lotharn Mountains',
  'east lothian': 'East Lotharn Mountains', 'west lothian': 'West Lotharn Mountains', 'west lotharingen': 'West Lotharn Mountains', 'thunder mountains': 'East Lotharn Mountains', 'istothar mountains': 'East Lotharn Mountains',
  'south methala': 'South Mithala', 'west methala': 'West Mithala', 'north methala': 'North Mithala', 'east methala': 'East Mithala', 'south mithala': 'South Mithala',
  'west pyros': 'West Pyros', 'east pyros': 'East Pyros', 'west pirates': 'West Pyros', 'east pirates': 'East Pyros',
  'north kelder': 'North Celder', 'south kelder': 'South Celder', 'chlamydia': 'Telemonia', 'telemonia': 'Telemonia', 'gala': 'Gala', 'ear': 'Eer', 'eer': 'Eer',
  'northern ascarth': 'Northern Ascarth', 'southern ascarth': 'Southern Ascarth', 'legamom': 'Legemum', 'legemum': 'Legemum',
  'ganesh plain': 'Ganesh Plain', 'ganesh desert': 'Ganesh Desert', 'ganal highlands': 'Dinelv Highlands', 'dinelv highlands': 'Dinelv Highlands', 'kf': 'Cape Heth', 'cape heth': 'Cape Heth',
  'north meridian desert': 'North Meroshe Desert', 'north meridian double': 'North Meroshe Desert', 'west meridian double': 'West Meroshe Desert', 'south meridian double': 'South Meroshe Desert', 'central meridian desert': 'Central Meroshe Desert',
  'hanma': 'Hama', 'hama': 'Hama', 'trogo': 'Trogo', 'babon': 'Babon', 'marosh': 'Marosh', 'bothis': 'Henborth', 'henborth': 'Henborth',
  'west izol': 'West Izol', 'east izol': 'East Izol', 'west azol': 'West Izol', 'east azol': 'East Izol', 'west zol': 'West Izol', 'east zole': 'East Izol', 'east zol': 'East Izol',
  'cape of thamalgar': 'Cape Thalmagar', 'cape thalmagar': 'Cape Thalmagar', 'thalmagar': 'Cape Thalmagar', 'dalmogar': 'Cape Thalmagar', 'damagar': 'Cape Thalmagar', 'thalmargar': 'Cape Thalmagar', 'amogar': 'Cape Thalmagar',
});

/** Transcript names that could not be matched with confidence. */
export const UNRESOLVED_ALIASES = Object.freeze([
  Object.freeze({ heard: 'Westnias', level: 3, note: 'Spoken between South Celder and Telemonia. No authored region sounds close.' }),
  Object.freeze({ heard: 'Gallan', level: 4, note: 'Spoken after Gala. Possibly a second reading of Gala or an unmapped name.' }),
  Object.freeze({ heard: 'Spirochosis', level: 3, note: '“As I said” suggests a repeat of an earlier level-3 region (Ovesos or Isareos).' }),
  Object.freeze({ heard: 'Bothis', level: 5, note: 'Mapped to Henborth provisionally.' }),
  Object.freeze({ heard: 'West/East Pirates (level 2)', level: 2, note: 'Immediately followed by West/East Pyros at level 3; the later statement is kept.' }),
]);

const designById = new Map(REGION_DESIGN.map(entry => [entry.id, entry]));
const normalize = value => String(value ?? '').trim().toLowerCase().replace(/[’'.,]/g, '').replace(/\s+/g, ' ');

/** Resolve an authored id, a case-insensitive name, or a transcript alias. */
export function canonicalRegionName(input, atlasRegions = null) {
  if (typeof input !== 'string') return null;
  const key = normalize(input);
  if (!key) return null;
  const known = atlasRegions ? atlasRegions.map(entry => entry.name ?? entry.id) : [...designById.keys()];
  const exact = known.find(name => normalize(name) === key);
  if (exact) return exact;
  if (Object.hasOwn(NAME_ALIASES, key)) return NAME_ALIASES[key];
  const stripped = key.replace(/^the /, '');
  return Object.hasOwn(NAME_ALIASES, stripped) ? NAME_ALIASES[stripped] : null;
}

export function levelInfo(level) {
  return LEVELS.find(entry => entry.level === level) ?? null;
}

/** Terrain-based fallback for regions the brief did not assign. Always provisional. */
export function provisionalLevel(terrainCounts = {}) {
  const total = Object.values(terrainCounts).reduce((sum, count) => sum + count, 0) || 1;
  const share = keys => keys.reduce((sum, key) => sum + (terrainCounts[key] ?? 0), 0) / total;
  if (share(['high_mountain', 'mountain']) >= .5) return 4;
  if (share(['deep_jungle']) >= .5) return 4;
  if (share(['deep_forest', 'highland', 'wetland']) >= .5) return 3;
  return 3;
}

export function climateSummary(terrainCounts = {}) {
  const total = Object.values(terrainCounts).reduce((sum, count) => sum + count, 0);
  if (!total) return 'Unsurveyed.';
  const labels = { grassland: 'grassland', plains: 'open plains', forest: 'forest', deep_forest: 'deep forest', hills: 'hills',
    mountain: 'mountains', high_mountain: 'high peaks', wetland: 'wetland', lake: 'lakes', deep_jungle: 'jungle', highland: 'highland', coast: 'coast', ocean: 'open water' };
  return Object.entries(terrainCounts).sort((a, b) => b[1] - a[1]).slice(0, 3)
    .map(([terrain, count]) => `${labels[terrain] ?? terrain} ${Math.round(100 * count / total)}%`).join(', ');
}

const AXIAL_NEIGHBORS = Object.freeze([[1, 0], [-1, 0], [0, 1], [0, -1], [1, -1], [-1, 1]]);

/** Land neighbors from the authored hex survey, most shared border first. Pure. */
export function computeAdjacency(atlasRegions) {
  const owner = new Map();
  for (const entry of atlasRegions) for (const cell of entry.cells ?? []) owner.set(`${cell.q},${cell.r}`, entry.name ?? entry.id);
  const adjacency = new Map();
  for (const entry of atlasRegions) {
    const name = entry.name ?? entry.id, shared = new Map();
    for (const cell of entry.cells ?? []) for (const [dq, dr] of AXIAL_NEIGHBORS) {
      const other = owner.get(`${cell.q + dq},${cell.r + dr}`);
      if (other && other !== name) shared.set(other, (shared.get(other) ?? 0) + 1);
    }
    adjacency.set(name, [...shared.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([id, border]) => ({ id, border })));
  }
  return adjacency;
}

export function terrainCounts(entry) {
  const counts = {};
  for (const cell of entry?.cells ?? []) counts[cell.terrain] = (counts[cell.terrain] ?? 0) + 1;
  return counts;
}

/** A complete campaign description for one region, merging design with the authored survey. */
export function describeRegion(id, atlasRegions = null, adjacency = null) {
  const design = designById.get(id) ?? null;
  const survey = atlasRegions?.find(entry => (entry.name ?? entry.id) === id) ?? null;
  if (!design && !survey) return null;
  const terrain = terrainCounts(survey);
  const level = design?.level ?? provisionalLevel(terrain);
  const neighbors = adjacency?.get(id) ?? (survey && atlasRegions ? computeAdjacency(atlasRegions).get(id) ?? [] : []);
  return {
    id, level, levelName: levelInfo(level)?.name ?? 'Unrated', provisional: design ? design.provisional : true,
    control: design?.control ?? 'wild', faction: FACTIONS[design?.control ?? 'wild'],
    climate: design?.climate ?? climateSummary(terrain), terrain: climateSummary(terrain),
    threats: (design?.threats ?? []).map(key => ({ id: key, ...THREATS[key] })),
    role: design?.role ?? 'Not yet written. Lore in world-builder/azhora_lore applies by default.',
    story: design?.story ?? null, arcs: [...(design?.arcs ?? [])],
    settlements: (design?.settlements ?? []).map(key => Object.values(SETTLEMENTS).find(place => place.id === key)).filter(Boolean),
    hexes: survey?.cells?.length ?? 0, neighbors, center: survey ? { x: survey.centerX, y: survey.centerY } : null,
  };
}

export function regionsByLevel(level) {
  return REGION_DESIGN.filter(entry => entry.level === level).map(entry => entry.id);
}

export function regionDesign(id) {
  return designById.get(id) ?? null;
}

const HEARTLAND_PROVINCES = Object.freeze(['Luscia', 'Peblos', 'Pueth', 'Vastos', 'Meneth']);

/** Who marches under the Coalition banner. Regions name where each member comes from; the island city-states are unmapped. */
export const COALITION_MEMBERS = Object.freeze([
  Object.freeze({ id: 'izoli', name: 'Izoli Republic', regions: ['West Izol', 'East Izol'], note: 'The republic that raised the war and shelters its army.' }),
  Object.freeze({ id: 'suval', name: 'Suval', regions: ['West Suval', 'South Suval'], note: 'Suvali companies; Elod in East Suval stays neutral.' }),
  Object.freeze({ id: 'ambroni-rebels', name: 'Ambroni rebels', regions: HEARTLAND_PROVINCES, note: 'Heartland households who wanted a republic, and the prince who renounced his family.' }),
  Object.freeze({ id: 'pyros', name: 'Pyros', regions: ['East Pyros', 'West Pyros'], note: 'A very small contingent; the Pyrosi army is busy with goblins and a rebellion at home.' }),
  Object.freeze({ id: 'selemis', name: 'Selemis', regions: ['Selemi'], note: 'The island of Selemi.' }),
  Object.freeze({ id: 'marosh', name: 'Marosh', regions: ['Marosh'], note: 'The desert-road kingdom of the south.' }),
  Object.freeze({ id: 'island-cities', name: 'Southern island city-states', regions: [], note: 'A few city-states of the southern tropical islands, not yet named on the atlas.' }),
]);

/** The five level-1 provinces whose Empire-or-Coalition arcs the capital assigns. */
export const LEVEL_ONE_PROVINCES = Object.freeze(['Luscia', 'Peblos', 'Pueth', 'Vastos', 'Meneth']);

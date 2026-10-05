/**
 * Region layout: how the authored atlas becomes playable ground.
 *
 * Pure geometry, no render or DOM dependencies. The atlas (assets/azhora-dev-regions.json)
 * is a pointy-top hex survey in pixels; the game world is metres with -Z as
 * "up" on the minimap. A transform ties the two together:
 *
 *  - LEGACY_ROAD_TRANSFORM describes today's hand-built road. Its -Z axis runs
 *    south-west across the atlas, from Tidehaven on Drent's coast toward Luscia,
 *    so the compass and the traveler's marker on the chart tell the truth even
 *    though the terrain was laid out along a straight line.
 *  - HEX_WORLD_TRANSFORM is the target for the rebuilt regions: north up, one
 *    authored hex is METRES_PER_HEX metres wide, and each playable region's
 *    outline is the outline of its authored hexes.
 *
 * Everything the rebuild needs to place ground, trees, roads and borders comes
 * from these functions, so a region can be regenerated from the atlas rather
 * than drawn by hand.
 */
import { OUTER_PROFILES, OUTER_NAMES } from './outer-regions-data.js';
import { METRES_PER_HEX, WORLD_SCALE } from './world-scale.js';

export const ATLAS_HEX_SIZE = 16;                       // circumradius in atlas pixels
export const ATLAS_HEX_WIDTH = ATLAS_HEX_SIZE * Math.sqrt(3);
// Flat-to-flat width of one authored hex in the rebuilt world; world-scale.js owns it.
export { METRES_PER_HEX };
// Eer is last on purpose, and every country added after it goes on the end too. The biome
// scatter in `world-regions.js` walks this list with one seeded stream, so a name inserted
// anywhere but the end re-rolls every region after it and moves scatter that is already built.
export const PLAYABLE_REGIONS = Object.freeze(['Drent', 'Luscia', 'Moros Plain', 'East Suval', 'West Suval', 'Pueth', 'Peblos', 'West Izol', 'Elagos', 'Amod', 'Vastos', 'Meneth', 'Caricas', 'Nesdor', 'Eer', 'Isareos', 'Nethereum', 'South Suval', 'Iscare Archipeligo', 'East Lotharn Mountains', 'Feradom', 'Gala', 'Northern Ascarth', 'Southern Ascarth', 'Ovesos', 'Oves Desert', 'West Lotharn Mountains', 'South Mithala', 'West Mithala', 'East Mithala', 'North Mithala', 'East Ibenwood', 'North Ibenwood', 'South Ibenwood', 'West Ibenwood', 'Central Ibenwood', 'South Oremindi Mountains', 'Yunethre', 'Navarth', 'West Pyros', 'Ganesh Desert', 'Ganesh Plain', 'North Meroshe Desert', 'West Meroshe Desert', 'Central Meroshe Desert', 'South Meroshe Desert', 'Cape Heth', 'Dinelv Highlands', 'Hama', 'Marosh', 'Trogo', 'West Baldro Mountains', 'East Baldro Mountains', 'Selemi', 'Telemonia', 'West Oremindi Mountains', 'East Pyros', 'Nether Desert', 'Legemum', 'Babon', 'South Celder', 'North Celder', 'East Izol', 'Alezhor', 'East Oremindi Mountains', 'North Oreminidi Mountains', 'Lesser Oremindi Mountains', 'Cudon', 'Narcosh', "Cape Thalmagar", "Acor Wetlands", "West Acorwood", "South Acordwood", "North Acorwood", "East Acordwood", "South Endevor", "West Endevor", "North Endevor", "East Endevor", ...OUTER_NAMES, 'South Ibenal', 'North Ibenal', 'Henborth', 'Urubond']);
/** Scatter is per hex, so a hex worth k times more ground carries k² times as much of it. */
const perHex = count => Math.round(count * WORLD_SCALE * WORLD_SCALE);

/** What each rebuilt region should feel like, whatever the survey's raw terrain says. */
export const REGION_BIOMES = Object.freeze({
  Urubond:Object.freeze({id:'urubond',name:'Urubond',ground:'#393a40',canopy:null,treesPerHex:0,rocksPerHex:0,ownScatter:true,undergrowth:'none',relief:{amplitude:3,wavelength:130},clearings:[],note:'A legendary, lifeless volcanic island.'}),
  ...Object.fromEntries(OUTER_PROFILES.map(p=>[p.name,Object.freeze({id:'outer-'+p.id,name:p.name,ground:p.ground,canopy:p.ground,treesPerHex:0,rocksPerHex:0,ownScatter:true,relief:{amplitude:6,wavelength:150},clearings:[],note:p.features.join(', ')+'. Terrain and wildlife preview.'})])),
  "Cape Thalmagar": Object.freeze({id:'acor-country-0',name:"Cape Thalmagar",ground:'#929c79',canopy:'#466442',treesPerHex:0,rocksPerHex:0,ownScatter:true,relief:{amplitude:6,wavelength:150},clearings:[],note:'Maritime lowlands, ancient woodland and permanent wetland habitats.'}),
  "Acor Wetlands": Object.freeze({id:'acor-country-1',name:"Acor Wetlands",ground:'#718559',canopy:'#466442',treesPerHex:0,rocksPerHex:0,ownScatter:true,relief:{amplitude:6,wavelength:150},clearings:[],note:'Maritime lowlands, ancient woodland and permanent wetland habitats.'}),
  "West Acorwood": Object.freeze({id:'acor-country-2',name:"West Acorwood",ground:'#667e52',canopy:'#466442',treesPerHex:0,rocksPerHex:0,ownScatter:true,relief:{amplitude:6,wavelength:150},clearings:[],note:'Maritime lowlands, ancient woodland and permanent wetland habitats.'}),
  "South Acordwood": Object.freeze({id:'acor-country-3',name:"South Acordwood",ground:'#77864c',canopy:'#466442',treesPerHex:0,rocksPerHex:0,ownScatter:true,relief:{amplitude:6,wavelength:150},clearings:[],note:'Maritime lowlands, ancient woodland and permanent wetland habitats.'}),
  "North Acorwood": Object.freeze({id:'acor-country-4',name:"North Acorwood",ground:'#5d7650',canopy:'#466442',treesPerHex:0,rocksPerHex:0,ownScatter:true,relief:{amplitude:6,wavelength:150},clearings:[],note:'Maritime lowlands, ancient woodland and permanent wetland habitats.'}),
  "East Acordwood": Object.freeze({id:'acor-country-5',name:"East Acordwood",ground:'#789461',canopy:'#466442',treesPerHex:0,rocksPerHex:0,ownScatter:true,relief:{amplitude:6,wavelength:150},clearings:[],note:'Maritime lowlands, ancient woodland and permanent wetland habitats.'}),
  "South Endevor": Object.freeze({id:'acor-country-6',name:"South Endevor",ground:'#8e9c66',canopy:'#466442',treesPerHex:0,rocksPerHex:0,ownScatter:true,relief:{amplitude:6,wavelength:150},clearings:[],note:'Maritime lowlands, ancient woodland and permanent wetland habitats.'}),
  "West Endevor": Object.freeze({id:'acor-country-7',name:"West Endevor",ground:'#929275',canopy:'#466442',treesPerHex:0,rocksPerHex:0,ownScatter:true,relief:{amplitude:6,wavelength:150},clearings:[],note:'Maritime lowlands, ancient woodland and permanent wetland habitats.'}),
  "North Endevor": Object.freeze({id:'acor-country-8',name:"North Endevor",ground:'#8e9d70',canopy:'#466442',treesPerHex:0,rocksPerHex:0,ownScatter:true,relief:{amplitude:6,wavelength:150},clearings:[],note:'Maritime lowlands, ancient woodland and permanent wetland habitats.'}),
  "East Endevor": Object.freeze({id:'acor-country-9',name:"East Endevor",ground:'#829460',canopy:'#466442',treesPerHex:0,rocksPerHex:0,ownScatter:true,relief:{amplitude:6,wavelength:150},clearings:[],note:'Maritime lowlands, ancient woodland and permanent wetland habitats.'}),
  'East Oremindi Mountains': Object.freeze({id:'northern-alpine-0',name:'East Oremindi Mountains',ground:'#899582',canopy:'#445b51',treesPerHex:0,rocksPerHex:0,ownScatter:true,relief:{amplitude:6,wavelength:150},clearings:[],note:'Joined alpine ridges, sheltered woodland and cold upland water.'}),
  'North Oreminidi Mountains': Object.freeze({id:'northern-alpine-1',name:'North Oreminidi Mountains',ground:'#899582',canopy:'#445b51',treesPerHex:0,rocksPerHex:0,ownScatter:true,relief:{amplitude:6,wavelength:150},clearings:[],note:'Joined alpine ridges, sheltered woodland and cold upland water.'}),
  'Lesser Oremindi Mountains': Object.freeze({id:'northern-alpine-2',name:'Lesser Oremindi Mountains',ground:'#899582',canopy:'#445b51',treesPerHex:0,rocksPerHex:0,ownScatter:true,relief:{amplitude:6,wavelength:150},clearings:[],note:'Joined alpine ridges, sheltered woodland and cold upland water.'}),
  'Cudon': Object.freeze({id:'northern-alpine-3',name:'Cudon',ground:'#899582',canopy:'#445b51',treesPerHex:0,rocksPerHex:0,ownScatter:true,relief:{amplitude:6,wavelength:150},clearings:[],note:'Joined alpine ridges, sheltered woodland and cold upland water.'}),
  'Narcosh': Object.freeze({id:'northern-alpine-4',name:'Narcosh',ground:'#899582',canopy:'#445b51',treesPerHex:0,rocksPerHex:0,ownScatter:true,relief:{amplitude:6,wavelength:150},clearings:[],note:'Joined alpine ridges, sheltered woodland and cold upland water.'}),

  Babon: Object.freeze({id:'babon-jungle',name:'Babon',ground:'#637653',canopy:'#315c46',treesPerHex:0,rocksPerHex:0,ownScatter:true,relief:{amplitude:6,wavelength:150},clearings:[],note:'Ancient tropical canopy over steep connected jungle ridges, ferned ravines, quiet coastal flats and reef-fringed headlands.'}),
  // The two Celders (registered 2026-10-03; their builders replace these first entries with their own).
  'South Celder': Object.freeze({ id: 'celder-south', name: 'South Celder', ground: '#8e9a57', canopy: '#5a7040', treesPerHex: 0, rocksPerHex: 0, ownScatter: true, undergrowth: 'tall-grass', relief: { amplitude: 3, wavelength: 220 }, clearings: [], note: 'The horse country under the Oremindi: open grass plain with low swells, falling east from the mountain foot.' }),
  'North Celder': Object.freeze({ id: 'celder-north', name: 'North Celder', ground: '#86955a', canopy: '#566d3f', treesPerHex: 0, rocksPerHex: 0, ownScatter: true, undergrowth: 'tall-grass', relief: { amplitude: 3, wavelength: 220 }, clearings: [], note: 'The northern horse plain: grassland and plain falling east from the East Oremindi to the Mithala margin and its streams.' }),
  // East Izol (registered and built 2026-10-04). Its ground and colour are its own (src/east-izol-world.js) and its scatter too;
  // the swatch is the one it was registered with, which West Izol's colour along the line is blended with.
  'East Izol': Object.freeze({ id: 'izol-east', name: 'East Izol', ground: '#8f9471', canopy: '#4f6a45', treesPerHex: 0, rocksPerHex: 0, ownScatter: true, undergrowth: 'short-turf', relief: { amplitude: 4, wavelength: 140 }, clearings: [], note: 'The eastern half of the island of Izol: old hard rock, dark grey and iron-brown low and slate-grey high, short pasture and maquis on the softer slopes, woods in the folds of the eastern fall, a cliffed headland coast with coves and two bays, and the Three Presences.' }),
  // Alezhor (registered and built 2026-10-04). Its ground and colour are its own (src/alezhor-world.js) and its scatter too;
  // the swatch is the plain's own grass, which the neighbours' colour along the lines is blended with.
  'Alezhor': Object.freeze({ id: 'alezhor', name: 'Alezhor', ground: '#8d9c64', canopy: '#4f6b40', treesPerHex: 0, rocksPerHex: 0, ownScatter: true, undergrowth: 'tall-grass', relief: { amplitude: 4, wavelength: 140 }, clearings: [], note: 'The gold coast below the Ibenwood: cool Mediterranean grassland and plain between the open ocean and the tree line, a bay with dunes and strands, the gold river coming down in falls to its estuary, and the narrow cliffed south.' }),
  // South Ibenal (registered and built 2026-10-04). Its ground and colour are its own (src/south-ibenal-world.js) and its scatter
  // too; the swatch is the plain's own grass, which the neighbours' colour along the lines is blended with.
  'South Ibenal': Object.freeze({ id: 'south-ibenal', name: 'South Ibenal', ground: '#8f9c63', canopy: '#4f6b40', treesPerHex: 0, rocksPerHex: 0, ownScatter: true, undergrowth: 'tall-grass', relief: { amplitude: 4, wavelength: 140 }, clearings: [], note: 'The corridor’s southern half: summer-dry grass between the open ocean and West Ibenwood, rising to the tree line and crossed by small streams out of the forest, with dunes in the warm south-west.' }),
  // North Ibenal (registered and built 2026-10-04): the same plain as South Ibenal's (src/south-ibenal-world.js), cooler in colour.
  'North Ibenal': Object.freeze({ id: 'north-ibenal', name: 'North Ibenal', ground: '#879a63', canopy: '#4a6640', treesPerHex: 0, rocksPerHex: 0, ownScatter: true, undergrowth: 'tall-grass', relief: { amplitude: 4, wavelength: 140 }, clearings: [], note: 'The corridor’s colder northern half: grass under North Ibenwood, a rockier coast, the Oremindi’s foot, a foothill and the Narrows.' }),
  // Henborth (registered and built 2026-10-04): the continental plain between Celder, the Mithala and the northern ranges (src/henborth-world.js).
  'Henborth': Object.freeze({ id: 'henborth', name: 'Henborth', ground: '#8d9a5c', canopy: '#55703f', treesPerHex: 0, rocksPerHex: 0, ownScatter: true, undergrowth: 'tall-grass', relief: { amplitude: 4, wavelength: 140 }, clearings: [], note: 'Continental plains rising gently from the Mithala\'s level toward the Oremindi and Narcosh: long low swells, three firm ways up to the mountain foot, damp hollows between them and dry stony knolls.' }),
  'East Pyros': Object.freeze({id:'pyrosi-uplands',name:'East Pyros',ground:'#9e9c61',canopy:'#566345',treesPerHex:0,rocksPerHex:0,ownScatter:true,relief:{amplitude:.9,wavelength:320},clearings:[],note:'Volcanic grass swells, dark rocky shoulders, dry washes and sheltered woodland.'}),
  'Nether Desert': Object.freeze({id:'nether-drylands',name:'Nether Desert',ground:'#9b9075',canopy:'#6e7450',treesPerHex:0,rocksPerHex:0,ownScatter:true,relief:{amplitude:1.2,wavelength:320},clearings:[],note:'Rain-shadow stony plateau, gravel exposures, seasonal pans and sparse resilient life.'}),
  Legemum: Object.freeze({id:'legemi-headlands',name:'Legemum',ground:'#82966b',canopy:'#45634d',treesPerHex:0,rocksPerHex:0,ownScatter:true,relief:{amplitude:1.3,wavelength:320},clearings:[],note:'Green coastal hills, rocky tin country, wooded hollows and exposed seabird headlands.'}),
  'West Oremindi Mountains': Object.freeze({ id: 'west-oremindi', name: 'West Oremindi Mountains', ground: '#818b83', canopy: '#385449', treesPerHex: 0, rocksPerHex: 0, ownScatter: true, relief: { amplitude: 6, wavelength: 150 }, clearings: [], note: 'Seaward cliffs, wooded hollows, high passes and concealed ancient galleries under joined alpine ridges.' }),
  'West Baldro Mountains': Object.freeze({ id: 'baldro-exposed', name: 'West Baldro Mountains', ground: '#818575', canopy: '#455645', treesPerHex: 0, rocksPerHex: 0, ownScatter: true, undergrowth: 'cold-heath', relief: { amplitude: 6, wavelength: 150 }, clearings: [], note: 'Exposed joined ridges, cold heath and sheltered rock basins above the independent West Hold of Dwarfland.' }),
  'East Baldro Mountains': Object.freeze({ id: 'baldro-sheltered', name: 'East Baldro Mountains', ground: '#718065', canopy: '#3e5846', treesPerHex: 0, rocksPerHex: 0, ownScatter: true, undergrowth: 'cold-woodland', relief: { amplitude: 6, wavelength: 150 }, clearings: [], note: 'Unequal mountain shoulders, sheltered fir woods and winding cold valleys above the independent East Hold of Dwarfland.' }),
  Yunethre: Object.freeze({ id: 'yunethre-steppe', name: 'The Yunethre grass passage', ground: '#a4a363', canopy: '#687744', treesPerHex: 0, rocksPerHex: 0, ownScatter: true, undergrowth: 'steppe', relief: { amplitude: 6, wavelength: 150 }, clearings: [], note: 'Open centaur grasslands between the mountain ranges, a neutral lakeside town and a movable centaur camp.' }),
  'South Oremindi Mountains': Object.freeze({ id: 'oremindi-alpine', name: 'South Oremindi Mountains', ground: '#89908f', canopy: '#455a48', treesPerHex: 0, rocksPerHex: 0, undergrowth: 'alpine', ownScatter: true,
    relief: { amplitude: 6, wavelength: 150 }, clearings: [],
    note: 'Authored high mountains, hill approaches and two lake basins; subalpine vegetation, tundra and permanent ice follow the per-hex climates. Terrain and wildlife only; the sage and settlements remain unbuilt.' }),
  'East Ibenwood': Object.freeze({ id: 'east-ibenwood-forest', name: 'East Ibenwood', ground: '#617548', canopy: '#345536', treesPerHex: 0, rocksPerHex: 0, undergrowth: 'forest-floor', ownScatter: true, relief: { amplitude: 3.2, wavelength: 155 }, clearings: [], note: 'Ibenwood environment preview: dense forest, separated groves and a defended inner belt; permission quests, withdrawal and civilian life remain unfinished.' }),
  'North Ibenwood': Object.freeze({ id: 'north-ibenwood-forest', name: 'North Ibenwood', ground: '#627951', canopy: '#345536', treesPerHex: 0, rocksPerHex: 0, undergrowth: 'forest-floor', ownScatter: true, relief: { amplitude: 3.2, wavelength: 155 }, clearings: [], note: 'Ibenwood environment preview: dense forest, separated groves and a defended inner belt; permission quests, withdrawal and civilian life remain unfinished.' }),
  'South Ibenwood': Object.freeze({ id: 'south-ibenwood-forest', name: 'South Ibenwood', ground: '#536e48', canopy: '#345536', treesPerHex: 0, rocksPerHex: 0, undergrowth: 'forest-floor', ownScatter: true, relief: { amplitude: 3.2, wavelength: 155 }, clearings: [], note: 'Ibenwood environment preview: dense forest, separated groves and a defended inner belt; permission quests, withdrawal and civilian life remain unfinished.' }),
  'West Ibenwood': Object.freeze({ id: 'west-ibenwood-forest', name: 'West Ibenwood', ground: '#526747', canopy: '#345536', treesPerHex: 0, rocksPerHex: 0, undergrowth: 'forest-floor', ownScatter: true, relief: { amplitude: 3.2, wavelength: 155 }, clearings: [], note: 'Ibenwood environment preview: dense forest, separated groves and a defended inner belt; permission quests, withdrawal and civilian life remain unfinished.' }),
  'Central Ibenwood': Object.freeze({ id: 'central-ibenwood-forest', name: 'Central Ibenwood', ground: '#4b6344', canopy: '#345536', treesPerHex: 0, rocksPerHex: 0, undergrowth: 'forest-floor', ownScatter: true, relief: { amplitude: 3.2, wavelength: 155 }, clearings: [], note: 'Ibenwood environment preview: dense forest, separated groves and a defended inner belt; permission quests, withdrawal and civilian life remain unfinished.' }),
  'Iscare Archipeligo': Object.freeze({ id: 'iscare-islands', name: 'The burned Iscare islands', ground: '#909477', canopy: '#5d704b', treesPerHex: 0, rocksPerHex: 0, undergrowth: 'salt-scrub', ownScatter: true,
    relief: { amplitude: 2.5, wavelength: 80 }, clearings: ['zecron-ruins', 'burned-hamlets'],
    note: 'Low fault-block islands and shoals, pale shore rock, sheltered coves, wind-bent scrub and the burned port of Zecron. Abandoned settlement shells tell of the Blood Prince.' }),
  Drent: Object.freeze({ id: 'dense-forest', name: 'Drent forest', ground: '#4d7a3e', canopy: '#2f5a2c', treesPerHex: perHex(42), rocksPerHex: perHex(1), undergrowth: 'dense',
    relief: { amplitude: 2.6, wavelength: 90 }, clearings: ['village', 'farm'],
    note: 'All of Drent is green forest: broadleaf canopy, ferns and sorrel, the village and one farm clearing cut out of it.' }),
  Luscia: Object.freeze({ id: 'sparse-woodland', name: 'Luscian woods and meadows', ground: '#8fa35a', canopy: '#5f8a48', treesPerHex: perHex(9), rocksPerHex: perHex(1), undergrowth: 'light',
    relief: { amplitude: 4.5, wavelength: 140 }, clearings: ['battlefield', 'hamlet'],
    note: 'Rolling grass with copses of trees that thin toward the Moros; the Lauvel battlefield and a burned hamlet.' }),
  'Moros Plain': Object.freeze({ id: 'open-plain', name: 'Moros Plain', ground: '#b9b36c', canopy: null, treesPerHex: 0, rocksPerHex: 0, undergrowth: 'none',
    relief: { amplitude: .9, wavelength: 260 }, clearings: ['legion-camp'],
    note: 'Absolutely flat grassland, an enormous sky, and the army camp visible from a long way off. Horse country.' }),
  // East Suval scatters its own country (src/east-suval-world.js): what grows on
  // this blade of limestone depends on how far the ground is from the sea and how
  // high it stands, which a single count per hex cannot say.
  'East Suval': Object.freeze({ id: 'stone-hills', name: 'East Suval hills', ground: '#9b9d85', canopy: '#6c7f5a', treesPerHex: perHex(3), rocksPerHex: perHex(26), undergrowth: 'aromatic-scrub',
    relief: { amplitude: 11, wavelength: 120 }, clearings: ['border-post', 'elod'], ownScatter: true,
    note: 'The stone blade of the peninsula: pale limestone ridges, thin soil, aromatic cushion scrub, dry terraces and field walls, Elod on its shelf above an exposed eastern sea, and the shut frontier in the north.' }),
  'West Suval': Object.freeze({ id: 'coastal-downs', name: 'West Suval downs', ground: '#a9a95c', canopy: '#76834f', treesPerHex: perHex(4), rocksPerHex: perHex(2), undergrowth: 'long-grass',
    relief: { amplitude: 3.6, wavelength: 210 }, clearings: ['solis', 'coalition-camp', 'shepherds-fold', 'watchtower', 'wayside-well'],
    note: 'Rolling coastal grassland: long tawny grass, scattered thorn and olive trees, low field walls of pale stone, and downs that rise toward the white cliffs above Solis. Not the Moros’s flat treeless sky, not East Suval’s grey rock.' }),
  // Pueth builds its own scatter (src/pueth-scenery.js): its woods thin from the Tessen northward, which a per-hex count cannot say.
  Pueth: Object.freeze({ id: 'cold-woodland', name: 'Pueth birch woods and bare hills', ground: '#7f9175', canopy: '#44604c', treesPerHex: perHex(20), rocksPerHex: perHex(3), undergrowth: 'light',
    relief: { amplitude: 4, wavelength: 130 }, clearings: ['road-post', 'town'], ownScatter: true,
    note: 'Cold timber country north of Drent: birch and fir among the last broadleaf by the Tessen, open valley grass in the middle, bare-shouldered hills toward Feradom.' }),
  // Peblos scatters its own islands (src/peblos-scenery.js): everything there is measured from the waterline, which a per-hex count cannot say.
  Peblos: Object.freeze({ id: 'salt-islands', name: 'The Peblos islands', ground: '#76855f', canopy: '#4d6a4f', treesPerHex: perHex(2), rocksPerHex: perHex(9), undergrowth: 'salt-grass',
    relief: { amplitude: 3.4, wavelength: 95 }, clearings: ['harbour', 'headland'], ownScatter: true,
    note: 'Low barrier islands south-east of Drent: salt grass, thrift and gorse, grey rock at the waterline, pale sand in the coves, and a few wind-bent pines on the higher ground. No forest anywhere.' }),
  // West Izol scatters its own ground (src/izol-scenery.js): the rock gathers on the headlands and the turf in the hollows, which a per-hex count cannot say.
  'West Izol': Object.freeze({ id: 'izoli-rock', name: 'The West Izol headlands', ground: '#7e8b62', canopy: '#4c6647', treesPerHex: perHex(2), rocksPerHex: perHex(9), undergrowth: 'sea-turf',
    relief: { amplitude: 5.2, wavelength: 115 }, clearings: ['izolveth', 'harbour', 'fishing-village', 'boatyard'], ownScatter: true,
    note: 'The western half of the island of Izol: old hard rock, iron-brown at the water and slate-grey at height, cropped sea turf and gorse on the softer slopes, thorn and wind-bent pine in the hollows, and one alluvial flat at the river mouth where Izolveth stands.' }),
  // Elagos is the lake country: its water is authored in src/elagos-world.js, and the scatter keeps out of it through ELAGOS_CLEARINGS.
  Elagos: Object.freeze({ id: 'lake-shelf', name: 'The Lake Lands', ground: '#7d9560', canopy: '#3f6446', treesPerHex: perHex(7), rocksPerHex: perHex(2), undergrowth: 'light',
    relief: { amplitude: 2.6, wavelength: 165 }, clearings: ['ambron', 'nemmel', 'ice-road', 'lake-shrine'], blockHexes: 6,
    note: 'The northern shelf: cold clear lakes in a rolling green country, dense-grained lake timber in stands rather than forest, hay meadow and barley on the lake margins, and Ambron on the narrows. High ground: everything drops from here to the Moros.' }),
  // Amod scatters its own slopes (src/amod-scenery.js): what grows there is set by height above the valley floor
  // and by which side of a terrace wall the ground is on, neither of which a per-hex count can say.
  Amod: Object.freeze({ id: 'terrace-foothills', name: 'The Amod terraces', ground: '#9aa169', canopy: '#5d7540', treesPerHex: perHex(7), rocksPerHex: perHex(6), undergrowth: 'pale-grass',
    relief: { amplitude: 9, wavelength: 150 }, clearings: ['ostel', 'spring-village', 'pass-stones'], ownScatter: true,
    note: 'Foothill country south of the Lotharn: descending ridges, each throwing a valley southward, every slope ribbed with dry-stone terraces. Chestnut, oak and walnut above; orchards, vines and goats below. The east end is drier, stonier and more open, with pale grass between the walls.' }),
  // Vastos carries no tree at all. The lore is flat about it: "there is no significant
  // sheltering terrain: the sky is large, the wind is consistent, and the grass, which is
  // Vastos's primary resource, grows in the dense cold-adapted varieties that upland grazing
  // requires". So: no canopy, half as much grass again as anywhere else, and a few erratics.
  Vastos: Object.freeze({ id: 'cold-tableland', name: 'The Vastos plain', ground: '#8f9d6c', canopy: null, treesPerHex: 0, rocksPerHex: perHex(2), undergrowth: 'tussock', tuftsPerHex: 54,
    relief: { amplitude: 1, wavelength: 300 }, clearings: ['vastos-water', 'sulfur-ground'], blockHexes: 4,
    note: 'A cold upland tableland above both its approaches: dense tussock grass, an enormous sky, no shelter of any kind, one shallow braided river across the south, watering pans on the open range, sulfur ground on the western fall and two small lake basins on the eastern one.' }),
  // Meneth scatters its own slopes (src/west-regions-scenery.js): what grows there is set by
  // height above the valley floor — meadow on the floor, nut groves on the lower face, close-grown
  // hardwood above — and a per-hex count cannot say which of those a point is on.
  Meneth: Object.freeze({ id: 'ridge-upland', name: 'The Meneth ridges', ground: '#7d8f63', canopy: '#4a6a43', treesPerHex: 0, rocksPerHex: 0, undergrowth: 'meadow', ownScatter: true,
    relief: { amplitude: 1.8, wavelength: 140 }, clearings: ['valley-becks'],
    note: 'Ridge-and-valley upland on a mountain margin: parallel ridges running east and west, a beck on every valley floor, hay meadow between the ridges, wild chestnut and walnut on the lower faces and close-grown hardwood above. The ridges give out southward and the country opens toward the lake shelf.' }),
  // Caricas scatters its own ground (src/west-regions-scenery.js): what grows in the Carica
  // corridor is set by how near the water it is, not by which hex it is in. "The corridor's
  // distinctive feature is its woodland: old-growth mixed forest along the immediate
  // riverbanks... This is the fox's habitat. The Caricas have not cleared it."
  Caricas: Object.freeze({ id: 'river-corridor', name: 'The Carica corridor', ground: '#7e8f5b', canopy: '#3d5b34', treesPerHex: 0, rocksPerHex: 0, undergrowth: 'riverine', ownScatter: true,
    relief: { amplitude: 3.2, wavelength: 130 }, clearings: ['fox-corridor'],
    note: 'A river corridor on the fall from an upland shelf: the Lizeem deep along the west, the Carica quick and rocky off the shelf in the north-east and slow and wooded below it, uncleared old-growth forest tight to the corridor banks, managed woodland above that, and thin stony ground on the shelf itself.' }),
  // Nesdor scatters its own ground (src/west-regions-scenery.js): its atlas terrain divides
  // the region into a wooded valley head and the Flats, and what grows on one does not grow
  // on the other. "The horizon opens here in a way it does not in the valley-organized
  // branch country."
  Nesdor: Object.freeze({ id: 'braided-flats', name: 'The Nesdor Flats', ground: '#a3a86a', canopy: '#4f6b3e', treesPerHex: 0, rocksPerHex: 0, undergrowth: 'open-grass', ownScatter: true, blockHexes: 4,
    relief: { amplitude: 1.6, wavelength: 200 }, clearings: ['nesdor-braids'],
    note: 'The transition out of the branch country into the Moros approach: shallow broad valleys with hazel and oak on their slopes in the north-west, and east and south of them the Flats — dark alluvial ground, relief measured in feet, braided shallow water crossing it, and an open horizon all the way to the plain.' }),
  // Eer scatters its own ground (src/west-regions-scenery.js). The atlas divides the country
  // once, diagonally, and the division is terrain and climate at the same line: `plains` and
  // `Cfa` over the northern and north-western hexes, `grassland` and `Csa` over the southern
  // and south-eastern ones. What grows on one half does not grow on the other, and a single
  // count per hex cannot say which half a point is on or how far it stands from the sea.
  Eer: Object.freeze({ id: 'coastal-loam', name: 'The Eer farmland', ground: '#6d8748', canopy: '#54703c', treesPerHex: 0, rocksPerHex: 0, undergrowth: 'rank-grass', ownScatter: true, blockHexes: 4,
    relief: { amplitude: .8, wavelength: 300 }, clearings: ['eer-braids'],
    note: 'The Lizeem’s last farmland, and the first country in the game that stops being green: rank damp grass on deep alluvial loam in the humid north-west, dry tawny grass and aromatic cushion scrub on the Mediterranean coast, alder and willow along the inland channels and tamarisk and oleander along the seaward ones, wild olive and holm oak standing singly on the open grass, and a low soft shore of small bays. The great river is the western wall and cannot be crossed anywhere.' }),
  // Isareos scatters its own hills (src/west-regions-scenery.js): what grows here is decided
  // by how high a point stands above the floor of its own valley — thorn in the hollows and
  // on the lee of the shoulders, nothing on the tops — and by how near the water it is, and
  // a per-hex count can say neither.
  Isareos: Object.freeze({ id: 'grass-hills', name: 'The Isareos hills', ground: '#6f9150', canopy: '#4c6f3e', treesPerHex: 0, rocksPerHex: 0, undergrowth: 'humid-grass', ownScatter: true, blockHexes: 4,
    relief: { amplitude: 4.5, wavelength: 120 }, clearings: ['isareos-gallery'],
    note: 'The most ordinary rolling country in the west, and deliberately so: low grass hills with a valley between every pair, deep humid grass to the top of every shoulder, hawthorn and blackthorn in the hollows and nowhere else, and a gallery of alder, willow and hazel two trees deep on the water. No forest hex anywhere, and no coast: the atlas makes this country landlocked and the lore’s inlets are gone with it. The western rim against the Ibenwood is thinner, shorter and greyer.' }),
  // Nethereum scatters its own meadow (src/west-regions-scenery.js): what grows here is decided
  // by how deep in the hollow a point stands — rank wet meadow on the floor, ordinary humid grass
  // up the sides and over the rim, rush and sedge in the low threads — and by how near the water
  // it is, and a per-hex count can say neither. The atlas is unanimous about the hex itself:
  // twenty-six `grassland` and one `plains`, in a map that has `lake` and `wetland` and puts
  // neither here.
  Nethereum: Object.freeze({ id: 'flood-meadow', name: 'The Nethereum meadow', ground: '#5f8c46', canopy: '#44663a', treesPerHex: 0, rocksPerHex: 0, undergrowth: 'wet-meadow', ownScatter: true, blockHexes: 4,
    relief: { amplitude: 1.1, wavelength: 210 }, clearings: ['nethereum-hollow'],
    note: 'The wet grass country: a broad shallow hollow six hundred metres across with the richest pasture in the inner branch country on its floor, ordinary humid grass up the sides and over the rim, rush and sedge in the low threads where the hill-streams run out, and willow and alder on the water and nowhere else. There is no Nethermere: the flood is a spring sheet over meadow that the game, having no seasons, never shows. Cattle loose on all of it.' }),
  // South Suval scatters its own country (src/south-suval-scenery.js): what grows here depends on
  // which of three climates a hex is in and how near it stands to the Stillwater, and one count per
  // hex cannot say that. The atlas gives it ten hexes of Csa, three of Csc on the ridge and two of
  // Cfb - the northern hills and the lake itself - and the lore's lake country is the Cfb one.
  'South Suval': Object.freeze({ id: 'lake-hills', name: 'The South Suval hills', ground: '#a2a070', canopy: '#6b7a4c', treesPerHex: 0, rocksPerHex: 0, undergrowth: 'aromatic-scrub', ownScatter: true,
    relief: { amplitude: 7, wavelength: 125 }, clearings: ['imlamdris'],
    note: 'The peninsula’s southern hills, and the only lake on it. Pale limestone and thin soil on the ridge and the hills, aromatic scrub, olive and fig where the south-facing ground is warm; greener grass, reed and mist round the Stillwater, which is spring-fed and does not run dry; and Imlamdris on its north-east shore, facing the water and turning its back on the road.' }),
  // The East Lotharn scatters its own forest (src/east-lotharn-scenery.js): old deciduous
  // woodland from the valley floors nearly to the summits, broken by the valleys' fields, the
  // grazed balds on the ridge tops and the sheep grass of the high valleys, and one count per hex
  // cannot say where those are.
  'East Lotharn Mountains': Object.freeze({ id: 'old-forested-mountains', name: 'The East Lotharn', ground: '#5d7044', canopy: '#3e5c32', treesPerHex: 0, rocksPerHex: 0, undergrowth: 'forest-floor', ownScatter: true,
    relief: { amplitude: 10, wavelength: 230 }, clearings: ['kemrath', 'pass-inn', 'iron-workings'],
    note: 'Old mountains: rounded summits, broad-backed ridges and long forested slopes a traveller can climb, oak, chestnut, maple, beech and tulip poplar from the valley floors nearly to the tops, and the valleys between them, each with its own water. Stone in every cut shows the layers of seas older than the range; iron and coal are in it, and have been worked for as long as there have been valley people.' }),
  // Feradom (src/feradom-world.js): "the barrier hills - a forested ridge system running along the
  // country's inland edge, not dramatic in height but dense in tree cover and limited in crossing
  // points", a castle or a tower on every pass, and behind them the plains and the cold coast. It
  // scatters its own forest: the hills are thick oak and fir and the plains are fields and pasture.
  Feradom: Object.freeze({ id: 'barrier-hills', name: 'Feradom', ground: '#5c7248', canopy: '#2e4c33', treesPerHex: 0, rocksPerHex: 0, undergrowth: 'forest-floor', ownScatter: true,
    relief: { amplitude: 2.4, wavelength: 160 }, clearings: ['pass-forts'],
    note: 'The barrier hills: a band of forested ridges along the country’s inland edge, not high but steep-sided and thick with oak and fir, crossed in six places, each held by a fortress of the Duchy. North of them, fields and pasture in the river valleys and the cold northern coast.' }),
  // Gala scatters its own country (src/gala-scenery.js). The atlas's terrain field says `plains`
  // for nineteen of its twenty-one hexes and so cannot say what grows where; its climate field
  // can, and draws three bands straight across the country - `BSh` steppe over the northern three
  // rows, `Csb` over the next two, `Csa` on the two hexes at the sea - and one count per hex
  // cannot say which band a point is in or how near it stands to the water.
  Gala: Object.freeze({ id: 'steppe-to-coast', name: 'The Galan plain', ground: '#b2a874', canopy: '#6e7a4c', treesPerHex: 0, rocksPerHex: 0, undergrowth: 'bunch-grass', ownScatter: true,
    relief: { amplitude: .6, wavelength: 320 }, clearings: ['gala-wash', 'gala-delta'],
    note: 'The western bank of the Lizeem near its mouth, and one country with three climates laid across it: hot steppe in the north - bunch grass in tussocks, grey wormwood and saltbush, a dry wash of gravel that runs only in the rains; tawny Mediterranean grass in the middle with low maquis on the rises and wild olive and fig standing singly; and on the short coast the braided mouths of the plain’s water through reed and tamarisk. The Oveth on the northern border, the Lizeem on the eastern, and nothing built by anybody.' }),
  // The two Ascarths scatter their own country (src/ascarth-scenery.js): what grows there is decided
  // by whether a point is on one of the three hills the atlas draws in the north - wooded, evergreen
  // oak on the flanks and pine on the tops - or out on the open grass, and by how near the sea and
  // which coast, and a count per hex can say none of that. The same grass colour on both, so the
  // border between them is not drawn on the ground: they are one peninsula with two names on it.
  'Northern Ascarth': Object.freeze({ id: 'peninsula-hills', name: 'The Ascarth hills', ground: '#aba66b', canopy: '#4f5f3a', treesPerHex: 0, rocksPerHex: 0, undergrowth: 'aromatic-scrub', ownScatter: true,
    relief: { amplitude: 2.2, wavelength: 150 }, clearings: [],
    note: 'The neck of the Ascarth Peninsula and its highland interior: low grass where it joins the mainland, then a plateau of tawny Mediterranean grass and aromatic scrub rising to three rounded rocky hills, wooded in evergreen oak with pine on the tops and green copper stain in the stone, and falling to the sea on both sides - in cliffs on the west, and to sheltered bays between low headlands on the east.' }),
  'Southern Ascarth': Object.freeze({ id: 'peninsula-tip', name: 'The Ascarth tip', ground: '#aba66b', canopy: '#4f5f3a', treesPerHex: 0, rocksPerHex: 0, undergrowth: 'aromatic-scrub', ownScatter: true,
    relief: { amplitude: 2.2, wavelength: 150 }, clearings: [],
    note: 'The finger of the peninsula to its tip: open Mediterranean grass and scrub rolling to the sea, thin and stony, a wild olive here and there and nothing taller, cliffs along the whole west and round the tip, two sheltered bays on the east, and Selemi across the channel to the south.' }),
  // Ovesos and the Oves Desert (src/oves-world.js, src/oves-scenery.js) scatter their own country.
  // **Both read `BSh` on every hex of both** — hot semi-arid steppe, nineteen hexes and twenty-three,
  // and the atlas draws no climatic line between them at all. So there is no gradient here of the kind
  // Gala has: what separates the two countries is **terrain and water**. Ovesos has the Oveth on its
  // south-western border and the grassland rows above it; the desert has the rim hills, the dry
  // channels and no permanent water in it anywhere. Every count-per-hex the generic scatter could use
  // would say the same thing on both sides of that border, which is why neither uses it.
  Ovesos: Object.freeze({ id: 'oveth-valley', name: 'The Oveth valley', ground: '#a8a06a', canopy: '#61784a', treesPerHex: 0, rocksPerHex: 0, undergrowth: 'bunch-grass', ownScatter: true,
    relief: { amplitude: .7, wavelength: 320 }, clearings: ['the-sorten', 'oveth-gully'],
    note: 'Hot steppe falling south-east to one river: bunch grass in tussocks on the northern rises with the bare ground showing between them, thinner open plain below, grey wormwood and saltbush where the grass gives out, and along the Oveth on the south-western border — and only there — a narrow dark gallery of poplar, willow and tamarisk. The Sorten is the wide bench of bottomland the river lies in. The Neth runs the northern border and the Lizeem the eastern, both of them somebody else’s bank.' }),
  'Oves Desert': Object.freeze({ id: 'oves-rain-shadow', name: 'The Oves', ground: '#ab9f7c', canopy: '#6b7052', treesPerHex: 0, rocksPerHex: 0, undergrowth: 'desert-scrub', ownScatter: true,
    relief: { amplitude: .8, wavelength: 320 }, clearings: ['rim-hills', 'dry-channels'],
    note: 'The far tail of the Pyros rain shadow, and rocky rather than sandy: worn stone through a thin poor soil, gravel pavement on the ridge exposures, perennial scrub spaced wide enough to walk between and a stubble of dead annual seed-heads in the low ground where the wet-year grasses would be. Three low rounded hills on the north-western rim intercept what moisture the westerlies carry, and the dry channels run from their feet east-south-east to the Oveth with no water in any of them.' }),
  // The West Lotharn (src/west-lotharn-world.js, src/west-lotharn-scenery.js) is the same range as
  // the East and the taller half of it: twenty-five mountain hexes to the East's fifteen, so this is
  // the spine and the East reads as its eastern foothills. It scatters its own forest for the same
  // reason the East does - deciduous woodland on the ledges to a tree line, bare stone above it and
  // grass on the balds, and one count per hex cannot say which of those a point is on. The relief
  // numbers are the East's exactly, because the two halves are one massif and the seam between them
  // must have nothing to hide; the whole difference is the landform laid on top.
  'West Lotharn Mountains': Object.freeze({ id: 'high-lotharn', name: 'The West Lotharn', ground: '#5b6e44', canopy: '#3c5932', treesPerHex: 0, rocksPerHex: 0, undergrowth: 'forest-floor', ownScatter: true,
    relief: { amplitude: 10, wavelength: 230 }, clearings: ['the-crest', 'long-valley'],
    note: 'The spine of the Lotharn, and its taller half: one great massif of five hundred and fifty metres with three lesser masses round it, uneven shoulders and buttresses laid in courses of cliff, with wooded shelves between them and grassy crowns above the tree line. The long valley runs the whole way through the range from the Vastos margin to the western hills, flat-floored and grown over, with a divide a fifth of the way along it and a beck leaving each end; the north valley drains the massif to the Mithala plain. Oak, chestnut, maple, beech, hickory, walnut and tulip poplar on the ledges to about three hundred and forty metres, then stone.' }),
  // The four quarters of the Mithala plain (src/mithala-world.js, src/mithala-scenery.js). They are
  // one landform with four names, they share forty-nine hex edges and one climate code, and their
  // four biomes differ only in what the ground is doing where they stand - which is why every relief
  // wavelength below is the same 320 and every amplitude within a quarter of a metre of its
  // neighbour's. The first properly continental country in the game: `Dfa` on all 116 hexes, hot wet
  // summers and hard winters, and the plants are the ones that answer for a winter the world cannot
  // yet draw - tall prairie grass and forbs on the open ground, willow, poplar and alder on the
  // water, and nothing evergreen anywhere.
  'South Mithala': Object.freeze({ id: 'flood-plain', name: 'The southern Mithala', ground: '#6f8043', canopy: '#526f3c', treesPerHex: 0, rocksPerHex: 0, undergrowth: 'tall-grass', ownScatter: true,
    relief: { amplitude: .5, wavelength: 320 }, clearings: ['mithala-meeting', 'south-mithala-apron'],
    note: 'The plain’s southern march: flat grain country running up to the Lotharn, with the two ranges standing over it along the whole southern border and four low swells of the foothills’ last apron inside it. The main channel runs east along the northern border to the sea and the two arms of the river meet at its north-west corner; the border water runs east under the mountains.' }),
  'West Mithala': Object.freeze({ id: 'upper-plain', name: 'The upper Mithala', ground: '#788a49', canopy: '#576f3f', treesPerHex: 0, rocksPerHex: 0, undergrowth: 'tall-grass', ownScatter: true,
    relief: { amplitude: .75, wavelength: 320 }, clearings: ['west-mithala-grass'],
    note: 'The western entrance, and the highest and grassiest quarter: twenty-four grassland hexes of tall prairie on deep dark river soil, the plain before the braiding begins in earnest, with the arm from the hill country coming in along the Celder margin and a fan of small channels off it.' }),
  'East Mithala': Object.freeze({ id: 'lower-plain', name: 'The lower Mithala', ground: '#63783e', canopy: '#4d6b3b', treesPerHex: 0, rocksPerHex: 0, undergrowth: 'rank-grass', ownScatter: true,
    relief: { amplitude: .5, wavelength: 320 }, clearings: ['east-mithala-mouth'],
    note: 'The lowest and flattest quarter, where the channels gather again and the river goes to the sea: green rank grass on the wettest ground on the plain, a gallery of willow and poplar two trees deep on the main channel, and the first dark line of the Acorwood on the north-eastern horizon.' }),
  'North Mithala': Object.freeze({ id: 'fen-margin', name: 'The northern Mithala', ground: '#6b8045', canopy: '#4a6640', treesPerHex: 0, rocksPerHex: 0, undergrowth: 'sedge-grass', ownScatter: true,
    relief: { amplitude: .55, wavelength: 320 }, clearings: ['north-mithala-fen'],
    note: 'The plain going north until it stops being plain: tall grass on the dry shelf in the south, sedge and rush on the damp fall toward the Acor Wetlands, the north braid coming down out of that ground on two heads, and the Acorwood thickening along the northern horizon without a wall or a cliff to announce it.' }),
  // The southwestern block (src/southwest-world.js, src/southwest-scenery.js): four countries in the
  // driest quarter of the continent, and the first `BWh` - true hot desert - ground in Azhora.
  // Eighty-one of their hundred and seven hexes read `BWh` on the World Builder map, against
  // `BSh` eighteen times in West Pyros's eastern columns and `Csa`/`Csb` on the seven green hexes at
  // the block's two wet corners. All four scatter their own country, because on this ground what
  // grows is decided by how far a point is from water and how much fine sediment the wind has left
  // it, and a single count per hex cannot say either.
  Navarth: Object.freeze({ id: 'navarth-plateau', name: 'The Navarth plateau', ground: '#6f6449', canopy: '#576046', treesPerHex: 0, rocksPerHex: 0, undergrowth: 'desert-scrub', ownScatter: true,
    relief: { amplitude: 1.1, wavelength: 320 }, clearings: ['navarth-crests'],
    note: 'The block’s high ground: a worn tableland of pale stone and thin soil at forty-odd metres with ten hexes of rounded hills on it, the highest along the western rim above the Ganesh. Hot desert over twenty of its twenty-two hexes, with a bare scrub of wormwood and thorn spaced wide; the north-eastern tip is the exception, two `Csb` hexes where the Ibenwood’s southern edge reaches in and the one forest hex the atlas gives this quarter stands.' }),
  'West Pyros': Object.freeze({ id: 'pyros-steppe', name: 'The West Pyros plain', ground: '#6c6944', canopy: '#546241', treesPerHex: 0, rocksPerHex: 0, undergrowth: 'bunch-grass', ownScatter: true,
    relief: { amplitude: .9, wavelength: 320 }, clearings: ['vaellir-gallery'],
    note: 'An open plain falling south along the great river that is its whole eastern border: semi-arid bunch grass with bare earth between the tussocks over most of it, desert scrub on the western columns against Navarth, and a green southern tip where the river reaches the sea and the country turns Mediterranean for the last hex and a half. The gallery on the water is the only wood in the block outside Navarth’s one forest hex.' }),
  'Ganesh Desert': Object.freeze({ id: 'ganesh-desert', name: 'The Ganesh', ground: '#776d54', canopy: null, treesPerHex: 0, rocksPerHex: 0, undergrowth: 'desert-scrub', ownScatter: true,
    relief: { amplitude: .9, wavelength: 320 }, clearings: ['ganesh-washes'],
    note: 'Thirty-one hexes of true hot desert, every one of them `BWh`, falling north-west to a gulf shore it is arid right up to. Flat to gently rolling, the relief made by old alluvium and not by uplift; wind is the defining force, and what it leaves is a thin sheet of fine pale sediment over stone, swept bare on the rises and gathered in the pockets. Sparse deep-rooted perennial scrub, a stubble of dead annual seed-heads where a wet year’s flush would be, and two dry washes with nothing in them but one damp reach.' }),
  'Ganesh Plain': Object.freeze({ id: 'ganesh-plain', name: 'The Ganesh Plain', ground: '#70684c', canopy: '#586341', treesPerHex: 0, rocksPerHex: 0, undergrowth: 'desert-scrub', ownScatter: true,
    relief: { amplitude: .85, wavelength: 320 }, clearings: ['ganesh-depressions'],
    note: 'The transition ground between the desert and the green south-east, and it cannot decide which it is: level clay-floored country crossed by shallow drainage channels too diffuse to be rivers, with closed depressions strung along them where water concentrates and the grass lasts longest. Dry-year face, so the perennial bunch grass has contracted to the depressions and the open ground between them is scrub and bare clay; the south-eastern corner, one `Csa` hex and three `Csb`, is where Marosh’s country begins and is green.' }),
  // The four Meroshe deserts (src/southwest-world.js, src/southwest-scenery.js): the atlas gives all
  // ninety-five hexes the same terrain word (`plains`) and the same climate code (`BWh`) - the
  // largest single-character expanse in the game by a wide margin, and the whole problem of the job.
  //
  // **So they are told apart by what the ground is made of, which is the one thing the atlas's one
  // word conceals.** Erg, reg and hamada are the real and distinct surfaces of a hot desert and the
  // game had drawn none of them; the lore's own account of the Moroshe is exactly that division -
  // "the rocky hammada of the northern transition zone... through the great sand seas of the central
  // interior, to the canyon country of the south". North is the hamada, Central the erg, South the
  // reg under the fog off the ocean, and West the fan skirt below the Dinelv escarpment with a salt
  // pan at its foot. Every one scatters its own country, because on a surface this uniform what
  // grows is decided by grain size and by fog and by nothing a per-hex count can say.
  'North Meroshe Desert': Object.freeze({ id: 'meroshe-hamada', name: 'The Meroshe hamada', ground: '#67634e', canopy: '#4e5440', treesPerHex: 0, rocksPerHex: 0, undergrowth: 'desert-scrub', ownScatter: true,
    relief: { amplitude: 1.15, wavelength: 320 }, clearings: ['meroshe-benches'],
    note: 'Bare rock, and the only country in the desert with trees standing on it. The lore’s northern transition zone: "flat gravel plains and exposed bedrock where scrubby thorn trees still manage to exist", with the hard beds standing out of the floor in low steps a metre or two high that run on one bearing for hundreds of paces and then give out. Twenty-three hexes of `BWh`, the highest of the four, coming off the Ganesh Plain over ten hex edges with nothing to mark the change but the stone coming up through the dust.' }),
  'West Meroshe Desert': Object.freeze({ id: 'meroshe-fans', name: 'The Meroshe fan skirt', ground: '#655d48', canopy: null, treesPerHex: 0, rocksPerHex: 0, undergrowth: 'desert-scrub', ownScatter: true,
    relief: { amplitude: .85, wavelength: 320 }, clearings: ['meroshe-salt-pan'],
    note: 'The desert between a highland and an ocean. Three broad alluvial fans spread west off the Dinelv escarpment - coarse gravel at their heads, sorting finer the further out they go, because that is what a fan does with the water that comes down it twice in a decade - and where the last of them dies there is a salt pan, dead flat and crusted white and the one place in ninety-five hexes where water can be seen and not drunk. Ten of its hex edges are the open western ocean, and it is as dry a hundred paces inland of the surf as it is twenty miles in.' }),
  'Central Meroshe Desert': Object.freeze({ id: 'meroshe-erg', name: 'The Meroshe sand sea', ground: '#736a4e', canopy: null, treesPerHex: 0, rocksPerHex: 0, undergrowth: 'none', ownScatter: true,
    relief: { amplitude: .55, wavelength: 320 }, clearings: ['meroshe-sand-sea'],
    note: 'The erg, and the first sand sea in the game: thirty-one hexes of linear dunes running north-west to south-east on the summer wind’s own bearing, six to eight metres crest to floor, with dead-flat gravel corridors between them that are the only way through. "The central sand seas are genuinely extreme... Navigating the sand seas without local knowledge is considered one of the more reliable methods of dying on Azhora." It is the one country in Azhora that has no horizon: whichever way a traveler looks, the next ridge is two hundred paces away.' }),
  'South Meroshe Desert': Object.freeze({ id: 'meroshe-reg', name: 'The Meroshe stone floor', ground: '#3d3427', canopy: '#464a30', treesPerHex: 0, rocksPerHex: 0, undergrowth: 'desert-scrub', ownScatter: true,
    relief: { amplitude: .6, wavelength: 320 }, clearings: ['meroshe-fog-margin'],
    note: 'The reg: a floor of close-packed pebbles varnished almost black, flat enough to see twenty miles over and swept so clean that a footprint shows. Thirteen of its hex edges are Trogo’s tropical rainforest, four are the southern ocean, and what crosses the line between them is the fog - "where desert air meets ocean-loaded humidity along the southeastern ridge, fog forms and stays, sometimes for days" - so the southern third of this country is desert that gets wet without ever being rained on, and carries a crust and a thorn scrub that the rest of the Meroshe cannot.' }),
  // The three countries of the block's western edge (src/southwest-world.js, src/southwest-scenery.js),
  // and each of them is a first. **Cape Heth is the only country on the atlas that holds a `coast`
  // hex** - 1,332 of them ring the continent and exactly one falls inside somebody's outline, at the
  // point of this cape. **The Dinelv Highlands are the only desert highland**: `BWh` on all
  // thirty-five hexes with twenty-six `hills`, three `mountain` and six `plains`, and those three are
  // the only hot-desert `mountain` hexes on the whole map. **Hama is the wet edge of the desert**, nine
  // `Csb` hexes against ten `BWh` with the terrain word and the climate code drawing the same line on
  // all nineteen. All three scatter their own country, because what grows on each is decided by
  // distance from the surf, by height on an escarpment, or by which side of one line a point stands.
  'Cape Heth': Object.freeze({ id: 'heth-cape', name: 'Cape Heth', ground: '#514e40', canopy: null, treesPerHex: 0, rocksPerHex: 0, undergrowth: 'salt-scrub', ownScatter: true,
    relief: { amplitude: .8, wavelength: 320 }, clearings: ['heth-point'],
    note: 'A low desert promontory with the sea on three sides of it: "not a dramatic geographical feature in the mode of high cliff headlands... a low, extended point of land that juts far enough west to matter as a navigational landmark". Grey-brown marine sandstone soft enough to work with hand tools, one long low ridge down the spine with a spray-swept western face and a sheltered eastern one, drainage hollows on the lee side where what soil there is has gathered, and at the tip the only `coast` hex the atlas gives any country. Twenty-one of its hex edges are open water and eighteen of its nineteen hexes are hot desert.' }),
  'Dinelv Highlands': Object.freeze({ id: 'dinelv-plateau', name: 'The Dinelv plateau', ground: '#4d4839', canopy: null, treesPerHex: 0, rocksPerHex: 0, undergrowth: 'desert-scrub', ownScatter: true,
    relief: { amplitude: 3.2, wavelength: 320 }, clearings: ['dinelv-north-pass'],
    note: 'The first desert highland in the game, and the high ground of the whole southwest: an arid plateau standing eighty metres over the cape on one side and the sand deserts on the other, reached by stepped escarpments whose cliff faces show the rock in horizontal bands - warm-toned stone low down, harder dark stone above. On top, a rolling upland of thin soil and spaced scrub with ridge systems crossing it north to south, three passes through them, six closed basins where the runoff dies, and three residual massifs standing over the lot. Hot desert on every one of its thirty-five hexes, tops included.' }),
  Hama: Object.freeze({ id: 'hama-corner', name: 'The Hama corner', ground: '#475433', canopy: '#3c5030', treesPerHex: 0, rocksPerHex: 0, undergrowth: 'rank-grass', ownScatter: true,
    relief: { amplitude: 1.1, wavelength: 320 }, clearings: ['hama-green-line'],
    note: 'Where the desert stops. Hama holds the corner of the continent - ocean on the west and ocean on the south - and the atlas splits it in half twice over: nine `grassland` hexes that are all `Csb` on the seaward side, ten `plains` hexes that are all `BWh` inland, and no hex where the two fields disagree. So the green is real winter-rain Mediterranean grass two hexes deep along the surf, the dry half is a stony broken rise between it and the Meroshe - "rough without being impassable" - and the line between them is the only place in the southwest where the aridity gradient reaches a green country from the dry side.' }),
  // ---------------------------------------------------------------------------
  // Marosh and Trogo (src/southwest-world.js): the block's eastern edge, and the last two countries
  // of the southwest quarter. **Neither has a single `BWh` hex**, which nothing else in thirteen
  // countries can say, and between them they hold fifty hex edges of open ocean on the Iberos side
  // of the peninsula - the side the whole Meroshe is in the lee of.
  Marosh: Object.freeze({ id: 'marosh-ridge', name: 'The Marosh ridge', ground: '#4d5c33', canopy: '#3a4f2c', treesPerHex: 0, rocksPerHex: 0, undergrowth: 'aromatic-scrub', ownScatter: true,
    relief: { amplitude: 2.6, wavelength: 320 }, clearings: ['marosh-water-gap'],
    note: 'The wall the Meroshe is behind. Eighteen hexes in a strip two wide down the peninsula\u2019s Iberos face, and the atlas draws the same line twice over: eight `hills` hexes that are every one of them `Csb` on the inland side, ten `grassland` hexes that are every one of them `Csa` on the seaward side, and no hex where the two fields disagree. So the inland half is a single oak-and-maquis ridge at seventy-four metres, catching the sea air and wringing it out, and the seaward half is a hot-summer Mediterranean terrace of grass and aromatic scrub falling to twenty hex edges of open water. One gap through the ridge, where the atlas draws the only river it gives this coast.' }),
  Trogo: Object.freeze({ id: 'trogo-rainforest', name: 'The Trogo rainforest', ground: '#2c3a24', canopy: '#24361f', treesPerHex: 0, rocksPerHex: 0, undergrowth: 'dense', ownScatter: true,
    relief: { amplitude: 2.4, wavelength: 320 }, clearings: ['trogo-fog-ridge'],
    note: 'The first rainforest in the game: twenty-two `deep_forest` hexes that are every one of them `Af` - tropical, with no dry season, the wettest code the atlas paints anywhere - with seven `Csa` `grassland` hexes along the southern shore where the forest stops, and no hex where the two fields disagree. A slope forest on the ridge that makes it: the ridge catches the southern ocean\u2019s moisture, drops a fog wall on its windward face and leaves the Meroshe in its lee, which is why there is a desert one hex west of a rainforest. **Two rules of its own**: a haze so thick that a traveler is half hidden at fifty-eight paces, and an undergrowth that can be walked along the watercourses, the animal paths and the clearings and not through the thicket between them.' }),
  // Selemi (src/selemis-world.js, src/selemis-scenery.js): the island one row of water south of the
  // Ascarth tip, and the atlas's own spelling for it - the place is Selemis and its people the Selemi.
  // Eight `grassland` hexes that are every one of them `Csa`, the same hot-summer Mediterranean code as
  // the eighteen of Southern Ascarth a hundred and seventy metres away, so it scatters its own country
  // for the reason the peninsula does: what grows here is decided by whether a point is on the sheltered
  // side of the hills or the open one, on a headland, on the strand or in a winter bed, and a count per
  // hex can say none of that. **Kin to the peninsula's grass and not the same swatch**: the Iberos coast's
  // own lore has the land drying and "the hills become pale" going south, and this is the southernmost
  // ground on that coast, so the grass is a shade paler and more straw than the tip's.
  Selemi: Object.freeze({ id: 'harbour-island', name: 'The island of Selemis', ground: '#b1a971', canopy: '#55653c', treesPerHex: 0, rocksPerHex: 0, undergrowth: 'aromatic-scrub', ownScatter: true,
    relief: { amplitude: 1.3, wavelength: 110 }, clearings: [],
    note: 'An island of eight hexes across a channel one hex wide from the tip of the Ascarth Peninsula: a crescent with its hollow side turned to the peninsula, one sheltered bay in the hollow with a strand of sand round it, a rocky headland at either end of the strand, three low grass hills along its back, and cliffs on every shore that is not the bay. Pale straw grass and aromatic scrub over pale stone, a few wind-leaned pines in the lee of the hills, two dry winter beds coming down to the strand, and seabirds on the heads. The city, its harbour works and everybody in it are somebody\u2019s and none of it is built.' }),
  // Telemonia (src/telemonia-world.js, src/telemonia-scenery.js): the Telemon highland, stage 1 - the
  // country and not its people (docs/telemonia-stage1-brief.md). Seventeen `hills` hexes on every edge
  // and eight `plains` in the middle, `BSh` on twenty-three and `Csb` on the two in the south-east
  // corner: a bowl of dry rock round one enclosed plain, the Galmeth, with Kethorn's crag in the middle
  // of it. It scatters its own country because what grows on it is decided by what the ground is - bare
  // rock and cliff on the rim, terraces on its inner faces, open plain, washes, and one wood in one
  // corner - and a count per hex can say none of that.
  Telemonia: Object.freeze({ id: 'telemon-highland', name: 'The Telemon highland', ground: '#a59c7a', canopy: '#4f5a3a', treesPerHex: 0, rocksPerHex: 0, undergrowth: 'bunch-grass', ownScatter: true,
    relief: { amplitude: .8, wavelength: 320 }, clearings: [],
    note: 'A bowl with a thick rim. Ridge behind ridge of dry rock running north-east to south-west round one enclosed plain, bare on the crests and broken by cliff bands, with narrow valleys between them and three passes through - north to the Oves, east to Gala and south toward Legemum - and none on the East Pyros side. Inside, the Galmeth: a raised, level plain with dry washes across it and the crag of Kethorn in the middle, cliff on three sides and a wall across the fourth. Terraces step the rim\u2019s inner faces down to the plain. Bunch grass, wormwood and thorn on the slopes, grey scrub oak and juniper in the folds, bare stone above, and in the south-east corner the only wood, the Belketh. Stage 1: no building, no field and nobody - the town, the farms and the people are stage 2.' }),
});

const AXIAL_NEIGHBORS = Object.freeze([[1, 0], [1, -1], [0, -1], [-1, 0], [-1, 1], [0, 1]]);
const NEIGHBOR_TO_EDGE = Object.freeze([0, 5, 4, 3, 2, 1]);

/** A world <-> atlas mapping. `forwardAtlas` is the atlas direction of world -Z. */
export function createAtlasTransform({ anchorAtlas, anchorWorld, forwardAtlas = { x: 0, y: -1 }, pixelsPerMetre }) {
  const length = Math.hypot(forwardAtlas.x, forwardAtlas.y) || 1;
  const forward = { x: forwardAtlas.x / length, y: forwardAtlas.y / length };
  const right = { x: -forward.y, y: forward.x };                 // world +X on the atlas
  const northOffset = Math.atan2(forward.x, -forward.y);          // compass bearing of world -Z, clockwise from north
  const k = pixelsPerMetre;
  return Object.freeze({
    pixelsPerMetre: k, metresPerHex: ATLAS_HEX_WIDTH / k, northOffset, forward, right,
    anchorAtlas: { ...anchorAtlas }, anchorWorld: { ...anchorWorld },
    worldToAtlas(x, z) {
      const dx = x - anchorWorld.x, dz = z - anchorWorld.z;
      return { x: anchorAtlas.x + (dx * right.x - dz * forward.x) * k, y: anchorAtlas.y + (dx * right.y - dz * forward.y) * k };
    },
    /**
     * Which way a world heading points on the chart, in radians clockwise from the top of the
     * image. The atlas is not north-up in world terms (see `northOffset`), so the traveler's
     * facing has to go through the same rotation its position does: a heading of world -Z comes
     * back as `northOffset`, by definition.
     */
    worldHeadingToAtlas(yaw) {
      if (!Number.isFinite(yaw)) return null;
      const dx = Math.sin(yaw), dz = Math.cos(yaw);
      const ax = dx * right.x - dz * forward.x, ay = dx * right.y - dz * forward.y;
      return Math.atan2(ax, -ay);
    },
    atlasToWorld(x, y) {
      const ax = x - anchorAtlas.x, ay = y - anchorAtlas.y;
      return { x: anchorWorld.x + (ax * right.x + ay * right.y) / k, z: anchorWorld.z - (ax * forward.x + ay * forward.y) / k };
    },
  });
}

/** The east-facing Drent coast hex where Tidehaven's landing is provisionally anchored. */
export const TIDEHAVEN_ATLAS = Object.freeze({ x: 1870.615, y: 2560 });
const LUSCIA_CENTER_ATLAS = Object.freeze({ x: 1680, y: 2636 });

/** Today's straight road: -Z points from the Drent coast toward the heart of Luscia. */
export const LEGACY_ROAD_TRANSFORM = createAtlasTransform({
  anchorAtlas: TIDEHAVEN_ATLAS, anchorWorld: { x: 0, z: 29 },
  forwardAtlas: { x: LUSCIA_CENTER_ATLAS.x - TIDEHAVEN_ATLAS.x, y: LUSCIA_CENTER_ATLAS.y - TIDEHAVEN_ATLAS.y },
  pixelsPerMetre: .24,
});

/** The rebuilt world: north up, hexes at METRES_PER_HEX, Tidehaven still near the origin. */
export const HEX_WORLD_TRANSFORM = createAtlasTransform({
  anchorAtlas: TIDEHAVEN_ATLAS, anchorWorld: { x: 0, z: 29 },
  forwardAtlas: { x: 0, y: -1 }, pixelsPerMetre: ATLAS_HEX_WIDTH / METRES_PER_HEX,
});

export function findRegion(survey, regionId) {
  return survey?.regions?.find(region => (region.name ?? region.id) === regionId) ?? null;
}

/** Hex cells of a region in world metres, each carrying its authored terrain and the region's biome. */
export function regionCells(survey, regionId, transform = HEX_WORLD_TRANSFORM) {
  const region = findRegion(survey, regionId);
  if (!region) return [];
  const biome = REGION_BIOMES[regionId] ?? null;
  return region.cells.map(cell => {
    const center = cellCenter(survey, cell), world = transform.atlasToWorld(center.x, center.y);
    return { q: cell.q, r: cell.r, x: world.x, z: world.z, terrain: cell.terrain, region: regionId, biome: biome?.id ?? cell.terrain };
  });
}

/**
 * Exact hex centre from axial coordinates. The survey's x/y are rounded to a
 * thousandth, which is enough to break corner matching between neighbours.
 */
function cellCenter(survey, cell) {
  const origin = survey?.origin ?? { x: 0, y: 0 };
  return { x: ATLAS_HEX_WIDTH * (cell.q + cell.r / 2) - origin.x, y: ATLAS_HEX_SIZE * 1.5 * cell.r - origin.y };
}
function atlasCorners(center) {
  return Array.from({ length: 6 }, (_, i) => {
    const angle = Math.PI / 180 * (60 * i - 30);
    return { x: center.x + ATLAS_HEX_SIZE * Math.cos(angle), y: center.y + ATLAS_HEX_SIZE * Math.sin(angle) };
  });
}
// Distinct corners are at least a hex side apart, so a tenth of a pixel is a safe key.
const cornerKey = point => `${point.x.toFixed(1)},${point.y.toFixed(1)}`;

/** Closed outline loops of a region's hexes (largest first), in world metres. */
export function regionOutline(survey, regionId, transform = HEX_WORLD_TRANSFORM, { soften = 0 } = {}) {
  const region = findRegion(survey, regionId);
  if (!region) return [];
  const members = new Set(region.cells.map(cell => `${cell.q},${cell.r}`));
  const edges = [];
  for (const cell of region.cells) {
    const corners = atlasCorners(cellCenter(survey, cell));
    AXIAL_NEIGHBORS.forEach(([dq, dr], direction) => {
      if (members.has(`${cell.q + dq},${cell.r + dr}`)) return;
      const slot = NEIGHBOR_TO_EDGE[direction];
      edges.push([corners[slot], corners[(slot + 1) % 6]]);
    });
  }
  const byStart = new Map();
  for (const edge of edges) { const key = cornerKey(edge[0]); if (!byStart.has(key)) byStart.set(key, []); byStart.get(key).push(edge); }
  const used = new Set(), loops = [];
  for (const edge of edges) {
    if (used.has(edge)) continue;
    const loop = [edge[0]]; let current = edge;
    while (current && !used.has(current)) {
      used.add(current); loop.push(current[1]);
      current = (byStart.get(cornerKey(current[1])) ?? []).find(next => !used.has(next));
    }
    if (loop.length > 3) { loop.pop(); loops.push(loop); }
  }
  loops.sort((a, b) => b.length - a.length);
  return loops.map(loop => {
    let points = loop;
    for (let pass = 0; pass < soften; pass++) {
      const next = [];
      for (let i = 0; i < points.length; i++) {
        const a = points[i], b = points[(i + 1) % points.length];
        next.push({ x: a.x * .75 + b.x * .25, y: a.y * .75 + b.y * .25 }, { x: a.x * .25 + b.x * .75, y: a.y * .25 + b.y * .75 });
      }
      points = next;
    }
    return points.map(point => transform.atlasToWorld(point.x, point.y));
  });
}

export function pointInPolygon(polygon, x, z) {
  let inside = false;
  for (let i = 0, previous = polygon.length - 1; i < polygon.length; previous = i++) {
    const a = polygon[previous], b = polygon[i];
    if ((a.z > z) !== (b.z > z) && x < (b.x - a.x) * (z - a.z) / (b.z - a.z) + a.x) inside = !inside;
  }
  return inside;
}

/** Which playable region (if any) contains a world point, by hex outline. */
export function regionAtWorld(survey, x, z, transform = HEX_WORLD_TRANSFORM, regions = PLAYABLE_REGIONS) {
  for (const id of regions) for (const loop of regionOutline(survey, id, transform)) if (pointInPolygon(loop, x, z)) return id;
  return null;
}

/** The nearest hex cell to a world point, with its terrain and biome. */
export function cellAtWorld(survey, x, z, transform = HEX_WORLD_TRANSFORM, regions = PLAYABLE_REGIONS) {
  let best = null, bestDistance = Infinity;
  for (const id of regions) for (const cell of regionCells(survey, id, transform)) {
    const distance = Math.hypot(cell.x - x, cell.z - z);
    if (distance < bestDistance) { bestDistance = distance; best = cell; }
  }
  return best && bestDistance <= transform.metresPerHex ? best : null;
}

/** World bounds enclosing the playable regions, with a margin for the horizon. */
export function worldBoundsFor(survey, transform = HEX_WORLD_TRANSFORM, regions = PLAYABLE_REGIONS, margin = 60) {
  const points = regions.flatMap(id => regionOutline(survey, id, transform)).flat();
  if (!points.length) return null;
  return { minX: Math.min(...points.map(p => p.x)) - margin, maxX: Math.max(...points.map(p => p.x)) + margin,
    minZ: Math.min(...points.map(p => p.z)) - margin, maxZ: Math.max(...points.map(p => p.z)) + margin };
}

function centroid(cells) {
  return { x: cells.reduce((sum, cell) => sum + cell.x, 0) / cells.length, z: cells.reduce((sum, cell) => sum + cell.z, 0) / cells.length };
}

/** The middle of the shared border between two regions, in world metres. */
export function borderMidpoint(survey, a, b, transform = HEX_WORLD_TRANSFORM) {
  const first = regionCells(survey, a, transform), second = regionCells(survey, b, transform);
  const index = new Map(second.map(cell => [`${cell.q},${cell.r}`, cell]));
  const pairs = [];
  for (const cell of first) for (const [dq, dr] of AXIAL_NEIGHBORS) {
    const other = index.get(`${cell.q + dq},${cell.r + dr}`);
    if (other) pairs.push({ x: (cell.x + other.x) / 2, z: (cell.z + other.z) / 2 });
  }
  return pairs.length ? centroid(pairs) : null;
}

/**
 * Story anchors for the rebuild: where the road goes and what it connects.
 * Names match docs/region-rebuild.md. All in world metres.
 */
export function routeAnchors(survey, transform = HEX_WORLD_TRANSFORM) {
  const drent = regionCells(survey, 'Drent', transform), luscia = regionCells(survey, 'Luscia', transform);
  const moros = regionCells(survey, 'Moros Plain', transform), suval = regionCells(survey, 'East Suval', transform);
  if (!drent.length || !luscia.length || !moros.length || !suval.length) return null;
  const tidehaven = transform.atlasToWorld(TIDEHAVEN_ATLAS.x, TIDEHAVEN_ATLAS.y);
  const eastMost = cells => cells.reduce((best, cell) => cell.x > best.x ? cell : best, cells[0]);
  const northMost = cells => cells.reduce((best, cell) => cell.z < best.z ? cell : best, cells[0]);
  return {
    tidehaven, drentHeart: centroid(drent),
    calossCrossing: borderMidpoint(survey, 'Drent', 'Luscia', transform),
    lauvelField: centroid(luscia),
    morosGate: borderMidpoint(survey, 'Luscia', 'Moros Plain', transform),
    legionCamp: centroid(moros),
    suvalBorder: borderMidpoint(survey, 'Luscia', 'East Suval', transform),
    elod: (() => { const cell = northMost(suval.filter(cell => cell.x >= eastMost(suval).x - transform.metresPerHex * 2)); return { x: cell.x, z: cell.z }; })(),
    suvalHills: centroid(suval),
  };
}

/**
 * The atlas's river edges as watercourses in world metres. Edges that share a
 * hex corner join into one open polyline, breaking where three meet, and each
 * polyline is softened by Chaikin corner cutting, as the journal chart draws
 * them (scripts/export-world-map.mjs). `edges` are `{ a: [q, r], b: [q, r], size }`.
 */
export function riverCourses(survey, edges, transform = HEX_WORLD_TRANSFORM, { soften = 2 } = {}) {
  const pieces = edges.map(edge => {
    const direction = AXIAL_NEIGHBORS.findIndex(([dq, dr]) => dq === edge.b[0] - edge.a[0] && dr === edge.b[1] - edge.a[1]);
    if (direction < 0) throw new Error(`River edge ${edge.a}|${edge.b} does not join two neighbouring hexes.`);
    const corners = atlasCorners(cellCenter(survey, { q: edge.a[0], r: edge.a[1] })), slot = NEIGHBOR_TO_EDGE[direction];
    return { edge, ends: [corners[slot], corners[(slot + 1) % 6]] };
  });
  const byCorner = new Map();
  for (const piece of pieces) for (const end of piece.ends) {
    const key = cornerKey(end);
    if (!byCorner.has(key)) byCorner.set(key, []);
    byCorner.get(key).push(piece);
  }
  const used = new Set(), courses = [];
  const extend = (line, members) => {
    for (;;) {
      const at = byCorner.get(cornerKey(line.at(-1))) ?? [];
      const next = at.filter(piece => !used.has(piece));
      if (at.length > 2 || next.length !== 1) return;
      used.add(next[0]); members.push(next[0].edge);
      line.push(cornerKey(next[0].ends[0]) === cornerKey(line.at(-1)) ? next[0].ends[1] : next[0].ends[0]);
    }
  };
  for (const piece of pieces) {
    if (used.has(piece)) continue;
    used.add(piece);
    const line = [piece.ends[0], piece.ends[1]], members = [piece.edge];
    extend(line, members); line.reverse(); extend(line, members);
    let points = line;
    for (let pass = 0; pass < soften; pass++) {
      const next = [points[0]];
      for (let i = 0; i < points.length - 1; i++) {
        const a = points[i], b = points[i + 1];
        next.push({ x: a.x * .75 + b.x * .25, y: a.y * .75 + b.y * .25 }, { x: a.x * .25 + b.x * .75, y: a.y * .25 + b.y * .75 });
      }
      next.push(points.at(-1));
      points = next;
    }
    const sizes = [...new Set(members.map(edge => edge.size))];
    courses.push({ size: sizes.length === 1 ? sizes[0] : sizes, edges: members,
      points: points.map(point => { const world = transform.atlasToWorld(point.x, point.y); return { x: world.x, z: world.z }; }) });
  }
  return courses;
}

/** Compass label for a camera yaw, honouring the transform's true north. */
export function compassHeading(yaw, transform = LEGACY_ROAD_TRANSFORM) {
  const labels = ['N', 'NW', 'W', 'SW', 'S', 'SE', 'E', 'NE'];
  const degrees = (((yaw - transform.northOffset) * 180 / Math.PI) % 360 + 360) % 360;
  const index = Math.round(degrees / 45) % 8;
  return { index, label: labels[index], labels, degrees };
}

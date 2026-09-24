/**
 * How far each region of Azhora has actually been built, for the developer's
 * chart. The playable regions differ a great deal: Drent is finished ground,
 * Luscia and the Moros carry their chapters but little else, West Suval and
 * Pueth are new, East Suval is a shut border and nothing behind it. Everything
 * else on the atlas is unbuilt. Keep this honest; it is the map of the work
 * left to do. Pure: no DOM, no three.
 */
import { PLAYABLE_REGIONS } from './region-layout.js';
import { REGION_DESIGN } from './campaign-world.js';

/** The states a region can be in, worst first, each with the colour the developer chart tints it. */
export const BUILD_STATES = Object.freeze({
  unbuilt: Object.freeze({ id: 'unbuilt', label: 'Not built', order: 0, colour: '#6d6f68', note: 'Charted only. There is no ground to walk.' }),
  edge: Object.freeze({ id: 'edge', label: 'Edge only', order: 1, colour: '#b4703a', note: 'You can reach its border and no further.' }),
  early: Object.freeze({ id: 'early', label: 'Playable · early', order: 2, colour: '#c8a53f', note: 'Walkable, with its main places built and a good deal still missing.' }),
  playable: Object.freeze({ id: 'playable', label: 'Playable', order: 3, colour: '#8fae4f', note: 'Walkable, with its chapter, its people and its places.' }),
  built: Object.freeze({ id: 'built', label: 'Built out', order: 4, colour: '#5f9e63', note: 'Finished ground: places, people, work, wildlife and detail throughout.' }),
});

const status = (state, detail, work) => Object.freeze({ state, detail, work });

/** Region by region. `detail` is what exists; `work` is what it still wants. */
export const BUILD_STATUS = Object.freeze({
  Drent: status('built', 'Tidehaven and its landing, the Greenway woods and their small places, Willowmere, the Avrel clearings, the road to the Caloss, the road north to the Tessen, the old Rena road with the ruins of Rena and Applegarth on it, deer, birds, insects and forage, the birding skill and Perrin’s bird garden.',
    'Nothing urgent. The southern farms and the coast north of the pier are still empty, and the old road gives out west of Applegarth.'),
  Luscia: status('playable', 'The Caloss crossing, the reedcutters, the rise, the field at the Lauvel and its chapter, Nothom with the smiths, the relay clerk and the stable yard.',
    'The town is thin: few interiors, no market, no work to do. The valleys east and west are scatter and landmarks only.'),
  'Moros Plain': status('playable', 'The army camp at the plain’s centre with its gate, tents and horse lines, the open road from Nothom, the border stockade and the battle ground.',
    'Open plain between them. No settlements, no work, nothing off the road.'),
  'West Suval': status('early', 'Solis: walls, gates, the Court of Oaths, the quay and the Coalition’s camp, with the parley, the march and the day after the battle. The road from the border, the fold, the watchtower and the well.',
    'The downs are scatter. The city has no interiors and no trade; the coast south of the quay is unbuilt.'),
  Pueth: status('early', 'The Tessen crossing with its bridge and army road post, the bramble woods and the goblin camp, Rimeholt on the Feradom road, and the two rivers the atlas authored.',
    'Rimeholt is a first version. The hills, the east and the coast are terrain and landmarks only; no quests of its own.'),
  Peblos: status('early', 'The boat from Tidehaven’s pier and back for three copper, Cobble on the main island with its quay, its ten roofs, its seven islanders and the Empire’s four men, the headland light, the seal cove and the drowned field.',
    'The five outer islands are terrain, scatter and one landmark each, with no way to reach them. No quest, no naval station, no sea cave, no pirates, and nothing to buy or sell on the quay.'),
  'West Izol': status('early', 'Izolveth on its cut terrace: the Long Quay, two moles and a boom, five ships, the warehouses and the ropewalk, the meeting house and the Stone of Izol, twenty-five people, the Coalition’s camp and drill ground above the town, Ardveth, the boatyard at Kelvath Cove, the Sea Gate and the Sightstone.',
    'No chapter: the Republic branch of Chapter 3 is where the choice among the three generals belongs, and none of it is wired. No voyage in or out, no interiors, no trade, no quest, and the interior south and east of the Long Pasture is terrain, scatter and one landmark.'),
  Elagos: status('early', 'Ambron on the Lake Ela narrows: four ages of wall on one closed circuit, the causeway over the water, the chain in the south water gate, the quays and the toll house, the Lord Marshal’s Seat, and thirty-two people in the city and the lake country, five of them the city’s specialists in the skills Drent teaches, one of whom sends the traveler after the last talking tree. The lakes themselves, the Ela-south, the Stair, Nemmel, the ice-road stone, the lake shrine and the drowned causeway.',
    'Chapter 3 is not built: nobody here moves a quest and the city cannot be arrived at except by the haul road. No interiors, no market to trade in, no lake fleet, and Brul, Ossen and the Thelas chain are water and landmarks only.'),
  Amod: status('early', 'The east end only: the road in from western Pueth, the pass stones and the ogre who takes a toll on them, terraces cut into the ground itself from the Tarvel up to the chestnut line, Ostel on its shoulder with its water court, press, cellars, stonecutters’ yard and seventeen people, the burial terrace above it, Vessen, and the Tarvel with its bridge, its head and the Dromel gate.',
    'Everything west of the Ostel bridge: Kelmod, Sareth-am-Vel, Tir Amel and Mavren are names on signs. No chapter of its own, no trade, no interiors, and the water court hears no case the traveler can take part in.'),
  // The western terrain remains early. Vastos now has one local silver quest;
  // the other three regions still await their communities and travel routes.
  Vastos: status('early', 'The cold tableland itself: flat upland grass above both its approaches, the Vastos River braiding across the south, the snowmelt beck off the Amod margin, five watering pans on the open range, sulfur ground with three vents on the western fall, two small lake basins on the eastern one, and longhorn cattle, hares and a hawk over the grass. The Common Water is one small herders’ camp with three people and the first Ambroni Civil War silver quest: return the strays, reopen the water and settle a local Republican, Monarchist or negotiated claim.',
    'The rest of its communities and travel network. No winter quarters, no river crossings, no vel-vastos routes, and no way in from Elagos or Amod but open country. The camp settles one watering route, not the province or the war.'),
  Meneth: status('early', 'The ridge country itself: parallel ridges running east and west with an open valley between each pair, a beck on every valley floor draining east to the Vastos River, hay meadow on the floors, wild chestnut and walnut on the lower faces, close-grown hardwood above, and sheep and hares on the commons.',
    'Everybody, and the routes they live off: the Southern Lotharn Road, the junction communities on it, the elder assemblies, and every crossing of every ridge. The ridges themselves give out southward into the lake country with nothing built on that ground.'),
  Caricas: status('early', 'The Carica corridor and the two rivers that make it: the Lizeem deep and unfordable along the western edge, the Carica quick and rocky off the eastern shelf and slow and wooded below it, uncleared old-growth forest tight to the corridor banks, worked woodland above that, stony ground on the shelf, and the vel-caric — the river fox, which watches you instead of running — with the otters that share its water.',
    'Everybody. No fox keeper families, no Water Council, no valley farms or terraced slopes, no iron workings on the eastern edge, and no way over either river: nobody here has built a bridge and neither is wadeable below the Carica’s head.'),
  Nesdor: status('early', 'The transition out of the branch country: shallow broad valleys with hazel and oak on their slopes in the north-west, and east and south of them the Flats — dark alluvial ground with almost no relief on it, two shallow watercourses braiding across it into the Lizeem (one of them the Ela-south, which the atlas hands into this region and which nobody’s lore mentions), the great river along the southern edge, and cattle, sheep and waders on all of it.',
    'Everybody, and the trade that is the whole point of the place: the Nesdor Way, the route-communities on it, the inns and warehouses and stables, and the legal practitioners who sell the difference between Branch Compact law and open country. The army’s rope line out of the Moros still stands across the Flats: an Ambroni line inside a country the Empire does not hold.'),
  // The first of the six south-western countries, and terrain and wildlife only like the four
  // before it. It is the only one of the six a traveler can walk to: the Lizeem is a wall and
  // Eer is the one country on this side of it.
  Eer: status('early', 'The plain between the great river and the sea, and the place the green country ends: black alluvial loam and rank damp grass in the humid north-west, dry tawny grass, cushion scrub and standing wild olives on the Mediterranean coast, the change happening in the middle of the country rather than at a border. The Lizeem’s last reach along the western edge, unfordable like every metre of it above; two channels braiding across the plain to a low shore of small bays; alder and willow on their upper halves and tamarisk and oleander on their lower; herons, egrets, stilts and duck on the water, boar in the scrub, gulls on the shore and grey dolphins out past the surf. The first country in the game with a sky of its own.',
    'Everybody, and everything they have built: the villages, the canal systems and the drainage the lore is really about, the north road out of Nylon and the customs every occupier in eleven occupations has taxed on it. Nylon itself is off the atlas. No quest, no chapter, no way over the Lizeem to Gala, and the five countries on the far bank of it are not built.'),
  // The second of the six, and the first on the far side of the Lizeem: the only way to it
  // on foot is round the head of the great river, at the north-west corner of Caricas.
  Isareos: status('early', 'The grass hills west of the Lizeem’s head, and the last familiar country: a valley between every pair of low shoulders, deep humid grass to the top of all of them, hawthorn and blackthorn in the hollows and on the lee sides, a gallery of alder, willow and hazel two trees deep on the water and nowhere else, three becks off the hill ground, and the medium border river the atlas draws along the whole Nethereum side — waded at its head and deep below. Red deer on the open grass, hares on the shoulders, otters on the river and a turkey vulture circling.',
    'Everybody, and the trade the whole lore file is organised round: the drove road, the valley grazing communities and their herds, the crossings the drovers know by name and the herder’s chart of them. The coast is gone rather than unbuilt — the atlas gives Isareos no unclaimed edge, so Isamouth, the inlets and the inshore fishery went with the lore adjustment. No chapter, no quest, and Yunethre and the Ibenwood on two sides of it are not built.'),
  // The third of the six, and the one the atlas took a whole country away from: it has no
  // `lake` hex and no `wetland` hex, so there is no Nethermere and no marsh round it. What is
  // built is the shape the lore's mechanism describes and the pasture the flood leaves.
  Nethereum: status('early', 'The wet grass country between the Isa and the Neth: a broad shallow hollow six hundred metres across and eight deep, with the fall spread over two hundred paces so that nothing about it is a bank. Rank wet meadow on its floor — the greenest ground in the game — ordinary humid grass up the sides and over the rim, wet threads of rush and sedge where three hill-streams give their channels up on the floor, and a gallery of willow and alder on the water and nowhere else. The Neth along the southern border, waded in its upper third and deep below it, which is the only dry way between this country and Ovesos; the Isa along the northern one; the Lizeem deep along the east; the atlas’s own small outlet carrying the basin south-east to the Neth’s head. Nethrani cattle loose on the floor, hares on the dry rim, otters on the deep Neth, three herons on the threads and a harrier quartering the meadow. The second country in the game with a sky of its own, and it asks for the opposite of Eer’s.',
    'Everybody, and everything the flood organises: the ridge and hummock communities, the Flood Council, the Flood Recall, the fish weirs, the levees, and the oats and hay off the flood meadow, which are crops and are somebody’s. The flood itself is not built either — the game has no seasons to bring it, so what is shown is the dry state all year. No chapter, no quest; the Nether Desert on the west and Ovesos across the ford are not built.'),
  // Still 'edge' on purpose: the country behind the gate is built, but the gate
  // is shut for Chapters 1-2 and the only ways in are the developer tools.
  'East Suval': status('edge', 'Elod’s border post on the stone road: a ditch, a shut gate and its guard in light black armour. Behind it the country is now built — the city of Elod with its Sea-Road Gate, the walled precinct and the Threshold, the ordinary city, the harbour quarter and its quay, twenty-one Elodi and foreigners with something to say, the North Light, Sorrow Beach, Sevenwalls and the dry hills.',
    'A way in. The border stays closed for the main quest, so nothing behind it can be reached except by the F8 tools: the sea passage into the harbour quarter is stubbed (src/east-suval.js, ELOD_SEA_ROUTE) and the Threshold’s admission terms lead nowhere. No quest, no trade, no interiors.'),
});

const known = new Set(Object.keys(BUILD_STATUS));

/** Every region the atlas knows, with how far it is built. Playable regions first, then the rest. */
export function buildStatusList() {
  const rest = REGION_DESIGN.map(entry => entry.id).filter(id => !known.has(id)).sort();
  return [...PLAYABLE_REGIONS.filter(id => known.has(id)), ...[...known].filter(id => !PLAYABLE_REGIONS.includes(id)), ...rest]
    .map(id => regionBuildStatus(id));
}

export function regionBuildStatus(id) {
  const entry = BUILD_STATUS[id] ?? status('unbuilt', '', 'The whole region.');
  const state = BUILD_STATES[entry.state] ?? BUILD_STATES.unbuilt;
  return Object.freeze({ id, state: state.id, label: state.label, colour: state.colour, order: state.order,
    playable: state.order >= 2, detail: entry.detail || state.note, work: entry.work });
}

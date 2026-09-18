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
  Drent: status('built', 'Tidehaven and its landing, the Greenway woods and their small places, Willowmere, the Avrel clearings, the road to the Caloss, the road north to the Tessen, the old Rena road with the ruins of Rena and Applegarth on it, deer, birds, insects and forage, the birding skill and Ansel’s garden.',
    'Nothing urgent. The southern farms and the coast north of the pier are still empty, and the old road gives out west of Applegarth.'),
  Luscia: status('playable', 'The Caloss crossing, the reedcutters, the rise, the field at the Lauvel and its chapter, Lumber Town with the smiths, the relay clerk and the stable yard.',
    'The town is thin: few interiors, no market, no work to do. The valleys east and west are scatter and landmarks only.'),
  'Moros Plain': status('playable', 'The Legion camp at the plain’s centre with its gate, tents and horse lines, the Moros gate, the border stockade and the battle ground.',
    'Open plain between them. No settlements, no work, nothing off the road.'),
  'West Suval': status('early', 'Solis: walls, gates, the Court of Oaths, the quay and the Coalition’s camp, with the parley, the march and the day after the battle. The road from the border, the fold, the watchtower and the well.',
    'The downs are scatter. The city has no interiors and no trade; the coast south of the quay is unbuilt.'),
  Pueth: status('early', 'The Tessen crossing with its bridge and Legion road post, the bramble woods and the goblin camp, Rimeholt on the Feradom road, and the two rivers the atlas authored.',
    'Rimeholt is a first version. The hills, the east and the coast are terrain and landmarks only; no quests of its own.'),
  Peblos: status('early', 'The boat from Tidehaven’s pier and back for three copper, Cobble on the main island with its quay, its ten roofs, its seven islanders and the Empire’s four men, the headland light, the seal cove and the drowned field.',
    'The five outer islands are terrain, scatter and one landmark each, with no way to reach them. No quest, no naval station, no sea cave, no pirates, and nothing to buy or sell on the quay.'),
  'West Izol': status('early', 'Izolveth on its cut terrace: the Long Quay, two moles and a boom, five ships, the warehouses and the ropewalk, the meeting house and the Stone of Izol, twenty-five people, the Coalition’s camp and drill ground above the town, Ardveth, the boatyard at Kelvath Cove, the Sea Gate and the Sightstone.',
    'No chapter: the Republic branch of Chapter 3 is where the choice among the three generals belongs, and none of it is wired. No voyage in or out, no interiors, no trade, no quest, and the interior south and east of the Long Pasture is terrain, scatter and one landmark.'),
  Elagos: status('early', 'Ambron on the Lake Ela narrows: four ages of wall on one closed circuit, the causeway over the water, the chain in the south water gate, the quays and the toll house, the Legate-General’s Seat, and thirty-two people in the city and the lake country, five of them the city’s specialists in the skills Drent teaches, one of whom sends the traveler after the last talking tree. The lakes themselves, the Ela-south, the Stair, Nemmel, the ice-road stone, the lake shrine and the drowned causeway.',
    'Chapter 3 is not built: nobody here moves a quest and the city cannot be arrived at except by the haul road. No interiors, no market to trade in, no lake fleet, and Brul, Ossen and the Thelas chain are water and landmarks only.'),
  Amod: status('early', 'The east end only: the road in from western Pueth, the pass stones and the ogre who takes a toll on them, terraces cut into the ground itself from the Tarvel up to the chestnut line, Ostel on its shoulder with its water court, press, cellars, stonecutters’ yard and seventeen people, the burial terrace above it, Vessen, and the Tarvel with its bridge, its head and the Dromel gate.',
    'Everything west of the Ostel bridge: Kelmod, Sareth-am-Vel, Tir Amel and Mavren are names on signs. No chapter of its own, no trade, no interiors, and the water court hears no case the traveler can take part in.'),
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

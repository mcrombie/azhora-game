/**
 * Peblos: the islands south-east of Drent, as islands, places and stands.
 *
 * Pure: no three, no DOM. `src/peblos-scenery.js` renders what is described
 * here; `src/peblos-people.js` speaks for it, `src/ferry.js` carries the
 * traveler to it, and the charts and the tests read the same numbers.
 *
 * What comes from the atlas: everything about the islands themselves. The nine
 * authored hexes of Peblos fall into six separate groups with no hex touching
 * another group's, and each group is one island. Their number, their sizes and
 * their spread are the map's, not this file's: `PEBLOS_ISLANDS` is derived from
 * the survey every time the module loads, and `ISLAND_NAMES` only hangs a name
 * and a landmark on the island whose anchor hex it recognises.
 *
 * Like Pueth, Peblos is authored **directly in world metres** (100 m per hex),
 * not in the old 56 m frame: it never existed at 56 m, and its ground is
 * measured from the waterline, which no cluster of `world-scale.js` describes.
 * If the world scale changes again, Peblos's places need clusters of their own.
 */
import { REGION_CELLS, COBBLE_TERRACE, landDistance } from './region-world.js';

const point = (x, z) => Object.freeze({ x, z });
const AXIAL_NEIGHBORS = Object.freeze([[1, 0], [1, -1], [0, -1], [-1, 0], [-1, 1], [0, 1]]);

// ---------------------------------------------------------------------------
// The islands, from the atlas
// ---------------------------------------------------------------------------
/**
 * A name, a landmark and a note for each island, keyed by its anchor hex: the
 * northernmost of its cells, and the westernmost of those. An island the atlas
 * grows that is not named here still exists, with terrain and scatter; it is
 * simply unnamed, and `tests/peblos-world.test.js` says so.
 */
const ISLAND_NAMES = Object.freeze({
  '16,110': Object.freeze({ id: 'cobble-island', name: 'Cobble Island', main: true,
    note: 'The one island with people on it: a rock spine, a west-facing bay, the village of Cobble on its terrace, and the headland light above.' }),
  '17,107': Object.freeze({ id: 'longstone', name: 'Longstone', landmark: 'longstone-beacon',
    note: 'The long bare whaleback north of Cobble. The Empire built a beacon on its ridge and stopped paying anyone to light it.' }),
  '15,109': Object.freeze({ id: 'gull-scarp', name: 'Gull Scarp', landmark: 'gull-scarp',
    note: 'A white-streaked rock between Cobble and the Drent shore, loud with gulls and worth nothing to anybody but them.' }),
  '13,109': Object.freeze({ id: 'pilots-stone', name: 'The Pilot’s Stone', landmark: 'pilots-stone',
    note: 'The nearest of the Pebbles to Drent, and the mark the pilots steer by out of Tidehaven.' }),
  '13,111': Object.freeze({ id: 'wrack-island', name: 'Wrack Island', landmark: 'wreck-of-the-sea-mare',
    note: 'Shingle, thrift, and the ribs of a grain ship that came ashore in the dark.' }),
  '11,110': Object.freeze({ id: 'saltings', name: 'The Saltings', landmark: 'saltings',
    note: 'The westernmost Pebble: salt pans scratched into the turf, and one standing stone older than the salt.' }),
});

/** The region's hexes grouped into islands: cells that touch are one island. */
function findIslands(cells) {
  const index = new Map(cells.map(cell => [`${cell.q},${cell.r}`, cell]));
  const seen = new Set(), islands = [];
  for (const cell of cells) {
    const start = `${cell.q},${cell.r}`;
    if (seen.has(start)) continue;
    const members = [], queue = [start];
    seen.add(start);
    while (queue.length) {
      const key = queue.pop(), here = index.get(key);
      members.push(here);
      for (const [dq, dr] of AXIAL_NEIGHBORS) {
        const next = `${here.q + dq},${here.r + dr}`;
        if (index.has(next) && !seen.has(next)) { seen.add(next); queue.push(next); }
      }
    }
    members.sort((a, b) => a.r - b.r || a.q - b.q);
    const anchor = members[0], key = `${anchor.q},${anchor.r}`;
    const named = ISLAND_NAMES[key] ?? { id: `island-${key.replace(',', '-')}`, name: 'An unnamed Pebble', note: '' };
    const terrain = {};
    for (const member of members) terrain[member.terrain] = (terrain[member.terrain] ?? 0) + 1;
    islands.push(Object.freeze({
      ...named, anchor: key, hexes: members.length, terrain: Object.freeze(terrain),
      cells: Object.freeze(members.map(member => Object.freeze({ q: member.q, r: member.r, terrain: member.terrain, x: member.x, z: member.z }))),
      centre: point(members.reduce((sum, m) => sum + m.x, 0) / members.length, members.reduce((sum, m) => sum + m.z, 0) / members.length),
    }));
  }
  return islands.sort((a, b) => b.hexes - a.hexes || a.centre.z - b.centre.z);
}

export const PEBLOS_ISLANDS = Object.freeze(findIslands(REGION_CELLS.Peblos));
export const MAIN_ISLAND = PEBLOS_ISLANDS.find(island => island.main) ?? PEBLOS_ISLANDS[0];
export const OUTER_ISLANDS = Object.freeze(PEBLOS_ISLANDS.filter(island => island !== MAIN_ISLAND));
/** Which island a world point belongs to, by nearest hex centre within one hex. */
export function islandAt(x, z) {
  let best = null, bestDistance = Infinity;
  for (const island of PEBLOS_ISLANDS) for (const cell of island.cells) {
    const distance = Math.hypot(cell.x - x, cell.z - z);
    if (distance < bestDistance) { bestDistance = distance; best = island; }
  }
  return bestDistance <= 100 ? best : null;
}

// ---------------------------------------------------------------------------
// Cobble: the harbour village on the main island's west bay
// ---------------------------------------------------------------------------
/**
 * The village stands on a shelf above the bay (`COBBLE_TERRACE`, the terrain pad
 * in region-world.js), with the quay running out west into the sheltered water
 * and the rock rising behind it. Everything is in world metres, square to the
 * world: +x is inland, -x is the bay, -z is toward the headland.
 */
export const COBBLE = Object.freeze({
  id: 'cobble', name: 'Cobble', centre: point(COBBLE_TERRACE.x, COBBLE_TERRACE.z), radius: 30,
  terrace: COBBLE_TERRACE,
});

/**
 * The quay: a stone jetty out of the terrace's west edge into the bay, and the
 * slip beside it where the boats are drawn up. Its deck is flat ground
 * (`quayHeight`), like Tidehaven's pier, so a traveler walks out over the water.
 */
export const COBBLE_QUAY = Object.freeze({
  id: 'cobble-quay', name: 'The Cobble Quay',
  root: point(323.5, 428), head: point(299, 428), halfWidth: 3, deckY: 2.1,
  minX: 298, maxX: 324, minZ: 425, maxZ: 431,
  bollards: Object.freeze([point(302, 425.4), point(310, 425.4), point(318, 425.4),
    point(302, 430.6), point(310, 430.6), point(318, 430.6)]),
  capstan: point(303.5, 425.9),                            // hard against the north kerb, so the deck walks clear
  slip: point(322, 437),                                   // where the boats are hauled out, south of the quay
  // The bay is deep on the quay's north face and shoals away to the beach on its
  // south: the ferryman lies alongside the head, on the north.
  mooring: point(300.5, 422.5),
});

/**
 * Where the ferryman's boat lies when it is not crossing. Tidehaven's is on the
 * pier's north side, clear of the boat that brought the traveler ashore in the
 * opening; Cobble's is alongside the quay head. `src/peblos-scenery.js` moors
 * the boat here when the world is built, so it is never seen anywhere else.
 */
export const FERRY_MOORINGS = Object.freeze({
  drent: Object.freeze({ ...point(25, 24.8), yaw: Math.PI / 2 }),
  peblos: Object.freeze({ ...COBBLE_QUAY.mooring, yaw: Math.PI / 2 }),
});

/** The quay deck's height at a point, or null where there is no deck. */
export function quayHeight(x, z) {
  const q = COBBLE_QUAY;
  return x >= q.minX && x <= q.maxX && z >= q.minZ && z <= q.maxZ ? q.deckY : null;
}

/** Ten buildings: the working sheds along the quay, the Legion's tally house, and the houses up the slope. */
export const COBBLE_BUILDINGS = Object.freeze([
  ['net-loft', 330.5, 420.5, 7.2, 4.4, 4.3, '#6b6a5c', '#c3b696', -Math.PI / 2, 'The net loft, its upper floor open to the wind, the year’s nets hanging in it.'],
  ['fish-cellar', 341, 417, 5.4, 4.2, 2.4, '#5d6157', '#b3ab90', -Math.PI / 2 + .25, 'The fish cellar, dug back into the rock and cold all summer.'],
  ['salt-house', 341.5, 430, 5.8, 4.4, 3.0, '#67645a', '#bcb295', -Math.PI / 2, 'The salt house. Salt comes out from Tidehaven by the barrel and leaves again inside the fish.'],
  ['tally-house', 327, 434.5, 5.0, 4.2, 2.7, '#7a4a42', '#b8ae94', -Math.PI / 2, 'The tally house: a shed, a table, a ledger, and the Empire’s mark burned into every fifth barrel.'],
  ['boat-shed', 330, 440, 7.4, 5.0, 3.6, '#5f6459', '#bdb094', -Math.PI / 2 + .3, 'The boat shed, and the smell of pitch that never leaves it.'],
  ['house-1', 345, 423, 5.6, 4.6, 3.0, '#6c6558', '#c0b394', -Math.PI / 2, ''],
  ['house-2', 346, 435, 5.4, 4.4, 2.9, '#5f6357', '#b6ab8f', -Math.PI / 2 - .2, ''],
  ['house-3', 343, 411, 5.6, 4.6, 3.1, '#6a5f53', '#c2b598', -Math.PI / 2 + .35, ''],
  ['house-4', 348.5, 417, 5.4, 4.4, 3.0, '#646054', '#bab095', -Math.PI / 2 + .15, ''],
  ['house-5', 342.5, 441.5, 5.8, 4.6, 3.0, '#6e6557', '#c1b596', -1.85, ''],
].map(([id, x, z, width, depth, height, roof, wall, yaw, note]) =>
  Object.freeze({ id, x, z, width, depth, height, roof, wall, yaw, note })));

/** The sea shrine on the rock above the quay: a stone niche, a whale rib, and whatever the sea gave back. */
export const SEA_SHRINE = Object.freeze({ id: 'sea-shrine', name: 'The Sea Shrine', ...point(324, 445), yaw: -Math.PI / 2 + .4 });

/** Where each of Cobble's people stands, and the way each one faces. */
export const COBBLE_STANDS = Object.freeze({
  'cobble-netmistress': Object.freeze({ ...point(330, 426), yaw: -Math.PI / 2 }),       // outside the net loft, facing the quay
  'cobble-boatwright': Object.freeze({ ...point(324.5, 438.5), yaw: -2.2 }),            // at the slip, over an upturned boat
  'cobble-lobsterman': Object.freeze({ ...point(321.5, 432), yaw: -Math.PI / 2 }),      // at the quay root, by his pots
  'cobble-salter': Object.freeze({ ...point(337.5, 433.2), yaw: -Math.PI / 2 }),        // by the drying racks at the salt house
  'cobble-oldhand': Object.freeze({ ...point(332, 415), yaw: -1.1 }),                   // on the turf above the bay, watching the water
  'cobble-keeper': Object.freeze({ ...point(326.5, 446.5), yaw: -Math.PI / 2 }),        // at the shrine
  'cobble-runner': Object.freeze({ ...point(335, 423.5), yaw: 2.6 }),                   // on the village ground, between the two
  'peblos-decurion': Object.freeze({ ...point(330.5, 434.5), yaw: -Math.PI / 2 }),      // at the tally table outside his shed
  'peblos-legionary-1': Object.freeze({ ...point(321, 426.5), yaw: -Math.PI / 2 }),     // on the quay, where the barrels come ashore
  'peblos-legionary-2': Object.freeze({ ...point(339, 438), yaw: 1.4 }),                // by the barrels at the racks, counting
  'peblos-legionary-3': Object.freeze({ ...point(337, 444), yaw: -Math.PI / 2 }),       // sat on the rock above the village with nothing to do
});

/** The drying racks, pot heaps, upturned boats and barrels that say what Cobble does before anyone speaks. */
export const COBBLE_WORKING = Object.freeze({
  racks: Object.freeze([point(335.5, 431), point(335.5, 434.5), point(336, 438)]),
  // The pots and the hulls keep to the top of the beach: the way from the quay
  // down to the slip has to stay open, and a heap of pots will close it.
  pots: Object.freeze([point(318.5, 432.5), point(317.5, 435.5), point(317, 430.5)]),
  hulls: Object.freeze([point(322.5, 440.5), point(325.5, 442.5), point(317.5, 439.5)]),
  barrels: Object.freeze([point(328.5, 431.5), point(330, 430), point(333.5, 429.5), point(332, 437), point(334.5, 439)]),
  gutting: point(326.5, 429),
});

/**
 * The gull rocks off the quay's north side: three stones that break the surface,
 * white-streaked, and never quiet. Every fishing village has a set of them and
 * an opinion about them.
 */
export const COBBLE_GULL_ROCKS = Object.freeze([point(313, 418), point(316.5, 414.5), point(309.5, 413)]);

// ---------------------------------------------------------------------------
// Places
// ---------------------------------------------------------------------------
/** The headland light on the crown of the main island's northern lobe, and the places round the coast. */
export const HEADLAND_LIGHT = Object.freeze({ id: 'headland-light', name: 'The Headland Light', ...point(402, 371) });
export const SEAL_COVE = Object.freeze({ id: 'seal-cove', name: 'The Seal Cove', ...point(402, 488) });
export const DROWNED_FIELD = Object.freeze({ id: 'drowned-field', name: 'The Drowned Field', ...point(357, 402) });

const outerLandmark = (id, fallback) => OUTER_ISLANDS.find(island => island.landmark === id) ?? fallback;

export const PEBLOS_LANDMARKS = Object.freeze([
  Object.freeze({ id: COBBLE.id, name: COBBLE.name, ...COBBLE.centre, radius: 24,
    description: 'The only village in the Pebbles: a quay, a net loft, drying racks and ten roofs on a shelf of rock above a west-facing bay. Everyone here fishes, and the Empire counts the barrels.' }),
  Object.freeze({ id: COBBLE_QUAY.id, name: COBBLE_QUAY.name, ...point(314, 428), radius: 10,
    description: 'Dressed stone laid out into the bay, with a capstan at the head and the boats hauled up on the slip beside it. Every barrel that leaves Peblos leaves from here.' }),
  Object.freeze({ id: SEA_SHRINE.id, name: SEA_SHRINE.name, ...point(SEA_SHRINE.x, SEA_SHRINE.z),
    description: 'A niche cut in the rock above the quay, a whale’s rib set over it, and inside it whatever the sea has given back this year. Nobody here names a god; they only say the sea is owed.' }),
  Object.freeze({ id: HEADLAND_LIGHT.id, name: HEADLAND_LIGHT.name, ...point(HEADLAND_LIGHT.x, HEADLAND_LIGHT.z),
    description: 'An iron basket on a stump of dry-stone tower, on the highest rock of the island. Cobble lights it when a boat is still out, and the Empire has never paid for the wood.' }),
  Object.freeze({ id: SEAL_COVE.id, name: SEAL_COVE.name, ...point(SEAL_COVE.x, SEAL_COVE.z),
    description: 'A shingle cove on the island’s southern neck where the seals haul out. They watch a traveler come down the shingle and do not trouble to move.' }),
  Object.freeze({ id: DROWNED_FIELD.id, name: DROWNED_FIELD.name, ...point(DROWNED_FIELD.x, DROWNED_FIELD.z),
    description: 'Field walls of dry stone run down the slope and on under the water, straight as they were laid. Somebody ploughed here when the sea stood lower, and nobody in Cobble remembers who.' }),
  Object.freeze({ id: 'longstone-beacon', name: 'The Longstone Beacon', ...point(outerLandmark('longstone-beacon').centre.x, outerLandmark('longstone-beacon').centre.z - 18),
    description: 'A stone beacon on the ridge of Longstone, across the water north of Cobble. The Empire built it, the Empire stopped paying the man who lit it, and the gulls have it now.' }),
  Object.freeze({ id: 'gull-scarp', name: 'Gull Scarp', ...point(outerLandmark('gull-scarp').centre.x, outerLandmark('gull-scarp').centre.z),
    description: 'A white-streaked rock of an island between Cobble and the Drent shore. The noise of it carries a mile downwind.' }),
  Object.freeze({ id: 'pilots-stone', name: 'The Pilot’s Stone', ...point(outerLandmark('pilots-stone').centre.x, outerLandmark('pilots-stone').centre.z),
    description: 'The nearest Pebble to Drent, with a mark cut on its seaward end. Keep it on your left hand out of Tidehaven and the channel is clear; keep it on your right and it is not.' }),
  Object.freeze({ id: 'wreck-of-the-sea-mare', name: 'The Wreck of the Sea-Mare', ...point(outerLandmark('wreck-of-the-sea-mare').centre.x, outerLandmark('wreck-of-the-sea-mare').centre.z),
    description: 'Half a hull’s ribs standing out of the shingle of Wrack Island. She was carrying Ambroni grain, and Cobble has been careful ever since about what it says it found.' }),
  Object.freeze({ id: 'saltings', name: 'The Saltings', ...point(outerLandmark('saltings').centre.x, outerLandmark('saltings').centre.z),
    description: 'The westernmost Pebble: shallow salt pans scratched in the turf, worked in summer by whoever rows out, and one standing stone that was here first.' }),
]);

/** Ground the island scatter keeps clear: the village, the quay and every landmark. */
export const PEBLOS_CLEARINGS = Object.freeze([
  Object.freeze({ ...COBBLE.centre, r: COBBLE.radius }),
  Object.freeze({ x: 314, z: 428, r: 12 }),
  ...PEBLOS_LANDMARKS.filter(place => ![COBBLE.id, COBBLE_QUAY.id].includes(place.id))
    .map(place => Object.freeze({ x: place.x, z: place.z, r: 9 })),
]);

/** One board at the quay head, in the road signs' style. */
export const PEBLOS_SIGNS = Object.freeze([
  Object.freeze({ ...point(322, 423.5), label: 'Cobble', returnLabel: 'Tidehaven', yaw: -Math.PI / 2 }),
]);

export const PEBLOS_NPC_POSITIONS = Object.freeze(
  Object.fromEntries(Object.entries(COBBLE_STANDS).map(([id, stand]) => [id, point(stand.x, stand.z)])));

/** True inside the village's own ground, where the island scatter must not grow. */
export const inCobble = (x, z, margin = 0) => Math.hypot(x - COBBLE.centre.x, z - COBBLE.centre.z) < COBBLE.radius + margin;

export { landDistance };

/**
 * What the traveler has charted. The world chart starts blank: a hex of the
 * authored atlas is uncovered only when the traveler has walked into it, and the country between them is named by subregions — small
 * authored areas (a point and a reach, usually a hex or three) that are recorded
 * in the journal the first time the traveler reaches one. Eastreena, the port
 * village the game opens in, is the first. Pure: no DOM, no three.
 */
import { hexAt } from './region-world.js';

export const MAP_FOG_VERSION = 1;
/** The chart records ground the traveler has actually stood on: one authored hex at a time. */
export const CHART_GRAIN = 'hex';

const area = (id, name, region, x, z, radius, note) => Object.freeze({ id, name, region, x, z, radius, note });

/** The named ground of Azhora, as the traveler's own chart records it. */
export const SUBREGIONS = Object.freeze([
  // Drent
  area('eastreena', 'Eastreena', 'Drent', -6, 29, 55, 'Tidehaven and its landing: the port village on Drent’s east coast, where the road begins.'),
  area('the-greenway', 'The Greenway', 'Drent', -70, 29, 45, 'The old footpath inland under the broadleaf canopy, the waykeeper’s watch and the charcoal burners’ ground.'),
  area('willowmere', 'Willowmere', 'Drent', -97, 9, 30, 'A quiet forest pool east of the road, with a fishing ledge and a stone firepit.'),
  area('fernway', 'Fernway Rest', 'Drent', -128, 34, 45, 'A shaded bench and an old cairn where the woodland paths meet.'),
  area('caloss-gate', 'The Caloss Gate', 'Drent', -176, 29, 50, 'The field gate where Tidehaven’s wood gives way to the open road west.'),
  area('avrel', 'The Avrel Clearing', 'Drent', -421, 40, 75, 'Farm clearings in Drent’s forested upland: the mill commons, the Legion’s post and the road on to the Caloss.'),
  area('caloss-bank', 'The Caloss Bank', 'Drent', -546, 177, 70, 'Drent’s side of the river: reed beds, a quiet fishing bank and the road down to the bridge.'),
  // Luscia
  area('caloss-crossing', 'The Caloss Crossing', 'Luscia', -610, 139, 55, 'The bridge over the Caloss and the crossing keeper’s hut. Luscia begins on the far bank.'),
  area('reedcutters', 'The Reedcutters’ Camp', 'Luscia', -675, 190, 50, 'Cut reed stacked to dry, a landing workshop, and the people who work the river’s edge.'),
  area('the-rise', 'The Rise', 'Luscia', -675, 230, 50, 'Sava’s shrine and the three waymarkers on the height above the river road.'),
  area('lauvel', 'The Field at the Lauvel', 'Luscia', -700, 315, 70, 'Where the Legion broke a rebel army: burial mounds, the relay, and the people who buried the losers.'),
  area('lumber-town', 'Lumber Town', 'Luscia', -729, 384, 55, 'Luscia’s timber town: the square, the smiths, the relay clerk and the stable yard on its edge.'),
  area('burned-hamlet', 'The Burned Hamlet', 'Luscia', -621, 356, 55, 'Roof beams standing in the grass, and a well somebody still keeps clean.'),
  // The Moros Plain
  area('moros-gate', 'The Moros Gate', 'Moros Plain', -763, 440, 45, 'Where the road leaves Luscia for open plain, under the Legion’s eyes.'),
  area('border-stockade', 'The Border Stockade', 'Moros Plain', -667, 527, 70, 'The Legion’s ditch and stakes on the border, and the ground the battle is fought over.'),
  area('legion-camp', 'The Legion Camp', 'Moros Plain', -981, 599, 95, 'The Ambroni outpost at the centre of the plain: gate, tents, horse lines and the Legate’s command.'),
  // West Suval
  area('west-suval-border', 'Into West Suval', 'West Suval', -636, 685, 60, 'The stockade road crosses into West Suval, and the downs open out toward the sea.'),
  area('suval-downs', 'The Suval Downs', 'West Suval', -600, 745, 70, 'Tawny grass, dry-stone walls, olives and thorn, a broken watchtower and a wayside well.'),
  area('shepherds-fold', 'The Shepherds’ Fold', 'West Suval', -700, 750, 55, 'A dry-stone ring and a turf-roofed hut where the flocks are brought in.'),
  area('solis', 'Solis', 'West Suval', -520, 950, 115, 'The walled city on its promontory: the Gate of Sun Horses, the Court of Oaths, the quay, and the Coalition’s camp outside the walls.'),
  // East Suval
  area('suval-border-post', 'Elod’s Border Post', 'East Suval', -400, 499, 60, 'East Suval’s frontier: a shut stone gate, a ditch, and soldiers in light black armour.'),
  area('waystation', 'The Roofless Waystation', 'East Suval', -274, 560, 55, 'A shelter without a roof on the stone road, kept by whoever passes.'),
  area('elod', 'Elod', 'East Suval', -50, 635, 70, 'The stone town beyond the border. East Suval is closed: nobody passes the gate.'),
  // Pueth
  area('tessen-crossing', 'The Tessen Crossing', 'Pueth', -105, -217, 60, 'The timber bridge over the Tessen and the Legion’s road post on the Pueth bank.'),
  area('bramble-woods', 'The Bramble Woods', 'Pueth', 55, -190, 60, 'Birch and thorn off the road north, and the goblin camp that has been crossing the river into Drent.'),
  area('birch-landing', 'Birch Landing', 'Pueth', 76, -246, 55, 'Cold-birch logs stacked by the water, waiting for the shipwrights’ barges.'),
  area('ordel-mouth', 'The Ordel Mouth', 'Pueth', 84, -349, 55, 'Where the Ordel runs out to the northern sea over grey shingle.'),
  area('rimeholt', 'Rimeholt', 'Pueth', -335, -362, 80, 'The palisaded timber town on the Feradom road: a garrison house, a timber yard and a cold welcome.'),
  area('cold-hearth', 'The Cold Hearth', 'Pueth', -40, -418, 55, 'A ring of stones in the open valley, black with old fires.'),
  area('grey-shoulder', 'The Grey Shoulder', 'Pueth', -268, -500, 65, 'Bare hills above the valley, where the birch gives out and the wind does not.'),
  area('feradom-road', 'The Feradom Road', 'Pueth', -424, -522, 60, 'The barrier at the edge of Pueth. Feradom lies beyond it, and the road is shut.'),
  // Amod: the east end of the terrace country, charted from the road in and the shoulder above it.
  area('amod-pass-stones', 'The Amod Pass Stones', 'Amod', -668, -464, 36, 'Four standing stones on the border, an ogre who takes a toll off the road, and the first terrace wall beyond them.'),
  area('ostel', 'Ostel', 'Amod', -750, -506, 52, 'The eastern dry-slope town on its shoulder: stonecutters, hard white wine, a water court and the road house that keeps the toll book.'),
  area('tir-ostel', 'Tir Ostel', 'Amod', -766, -546, 30, 'Ostel’s burial terrace above the town, where the dead lie facing down the watercourse.'),
  area('tarvel-valley', 'The Tarvel Valley', 'Amod', -820, -560, 44, 'The stream Ostel’s water court keeps, its bridge, the head where the high channel is taken off, and the gate two households argue about.'),
  area('vessen', 'Vessen', 'Amod', -856, -590, 32, 'Three roofs and a springhouse on the western flank, sharing one water court with the hamlets above.'),
  // Peblos: the islands, which are charted from the water as much as from the land.
  area('cobble', 'Cobble', 'Peblos', 336, 432, 45, 'The one village in the Pebbles: a stone quay, drying racks, ten roofs on a shelf of rock, and the Empire’s tally shed.'),
  area('peblos-headland', 'The Cobble Headland', 'Peblos', 402, 366, 42, 'The northern cape of the main island, with the unlit headland light on its crown.'),
  area('peblos-south-shore', 'The Southern Shore', 'Peblos', 410, 490, 45, 'The low neck of the main island: shingle, a cove the seals have, and the sea on both sides of you.'),
  area('longstone', 'Longstone', 'Peblos', 375, 159, 70, 'The long bare island north of Cobble, with the Empire’s abandoned beacon on its ridge.'),
  area('gull-scarp', 'Gull Scarp', 'Peblos', 250, 289, 55, 'A white-streaked rock between Cobble and the Drent shore, and every gull in the Stills.'),
  area('pilots-stone', 'The Pilot’s Stone', 'Peblos', 50, 289, 55, 'The nearest Pebble to Drent, and the mark the pilots steer by out of Tidehaven.'),
  area('wrack-island', 'Wrack Island', 'Peblos', 150, 462, 55, 'Shingle, thrift, and the ribs of the Sea-Mare standing out of it.'),
  area('saltings', 'The Saltings', 'Peblos', -100, 375, 55, 'The westernmost Pebble: salt pans in the turf and one standing stone.'),
]);

export const SUBREGION_IDS = Object.freeze(SUBREGIONS.map(item => item.id));
const byId = new Map(SUBREGIONS.map(item => [item.id, item]));
export const subregion = id => byId.get(id) ?? null;

/** The named areas a point stands in, nearest first. */
export function subregionsAt(x, z) {
  if (!Number.isFinite(x) || !Number.isFinite(z)) return [];
  return SUBREGIONS.filter(item => Math.hypot(item.x - x, item.z - z) <= item.radius)
    .sort((a, b) => Math.hypot(a.x - x, a.z - z) - Math.hypot(b.x - x, b.z - z));
}

export function validateMapFogSnapshot(data, { allowMissing = true } = {}) {
  if (data === undefined) return allowMissing;
  if (!data || typeof data !== 'object' || Array.isArray(data) || data.version !== MAP_FOG_VERSION) return false;
  if (!Array.isArray(data.cells) || data.cells.length > 20000 || !Array.isArray(data.subregions)) return false;
  if (!data.cells.every(key => typeof key === 'string' && /^-?\d{1,4},-?\d{1,4}$/.test(key))) return false;
  return data.subregions.every(id => byId.has(id));
}

export function createMapFog({ onEvent = () => {} } = {}) {
  const cells = new Set(), found = [];

  /** Chart the ground about a point. Returns what was new. */
  function reveal(x, z) {
    if (!Number.isFinite(x) || !Number.isFinite(z)) return { cells: [], subregions: [] };
    const home = hexAt(x, z), key = `${home.q},${home.r}`, newCells = [];
    if (!cells.has(key)) { cells.add(key); newCells.push(key); }
    const newAreas = [];
    for (const item of subregionsAt(x, z)) {
      if (found.includes(item.id)) continue;
      found.push(item.id); newAreas.push(item.id);
      onEvent({ type: 'subregion-found', id: item.id, name: item.name, region: item.region, note: item.note });
    }
    if (newCells.length) onEvent({ type: 'chart-widened', cells: newCells.length });
    return { cells: newCells, subregions: newAreas };
  }

  const knows = (q, r) => cells.has(`${q},${r}`);
  const knowsPoint = (x, z) => { const home = hexAt(x, z); return knows(home.q, home.r); };

  /** The chart for the journal: every named area, and whether it has been found. */
  function view() {
    return {
      cells: [...cells], cellCount: cells.size,
      subregions: SUBREGIONS.map(item => ({ ...item, known: found.includes(item.id) })),
      found: found.map(id => byId.get(id)), foundCount: found.length, total: SUBREGIONS.length,
    };
  }

  function snapshot() { return { version: MAP_FOG_VERSION, cells: [...cells], subregions: [...found] }; }

  function restore(data) {
    cells.clear(); found.length = 0;
    if (!validateMapFogSnapshot(data, { allowMissing: false })) return false;
    for (const key of data.cells) cells.add(key);
    for (const id of data.subregions) found.push(id);
    return true;
  }

  return { reveal, knows, knowsPoint, view, snapshot, restore,
    get cells() { return [...cells]; }, get found() { return [...found]; } };
}

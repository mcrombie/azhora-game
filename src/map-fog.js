/**
 * What the traveler has charted. The world chart starts blank: a hex of the
 * authored atlas is uncovered only when the traveler has walked into it, and the country between them is named by subregions — small
 * authored areas (a point and a reach, usually a hex or three) that are recorded
 * in the journal the first time the traveler reaches one. Tidehaven, the port
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
  // The id stays `eastreena` so older charts keep loading; the name on the chart is the one the village uses now.
  area('eastreena', 'Tidehaven', 'Drent', -6, 29, 55, 'The port village on Drent’s east coast, where the road begins. It was East Rena once — Eastreena — when there was a Rena to be east of, and the old people still call it that.'),
  area('the-greenway', 'The Greenway', 'Drent', -70, 29, 45, 'The old footpath inland under the broadleaf canopy, the waykeeper’s watch and the charcoal burners’ ground.'),
  area('willowmere', 'Willowmere', 'Drent', -97, 9, 30, 'A quiet forest pool east of the road, with a fishing ledge and a stone firepit.'),
  area('fernway', 'Fernway Rest', 'Drent', -128, 34, 45, 'A shaded bench and an old cairn where the woodland paths meet, with Odger Pell’s drying rack on the bench side and Fern Hollow damp behind it.'),
  area('caloss-gate', 'The Caloss Gate', 'Drent', -176, 29, 50, 'The field gate where Tidehaven’s wood gives way to the open road west.'),
  area('avrel', 'The Avrel Clearing', 'Drent', -421, 40, 75, 'Farm clearings in Drent’s forested upland: the mill commons, the army’s post, the sunken drove lane where Nell Harrow works her hedge banks, and the road on to the Caloss.'),
  area('rena', 'The Ruins of Rena', 'Drent', -395, -70, 55, 'Rena was the principal town of Drent until it was pulled down after a battle eighty years ago: street lines under the grass, a burnt gate, the stump of the hall, and a well that still holds water.'),
  area('applegarth', 'Applegarth', 'Drent', -568, -32, 45, 'The orchard village at the west end of the old Rena road. It was West Rena, then Westerina, and its bound stone has never been recut.'),
  area('caloss-bank', 'The Caloss Bank', 'Drent', -546, 177, 70, 'Drent’s side of the river: reed beds, a quiet fishing bank and the road down to the bridge.'),
  // Luscia
  area('caloss-crossing', 'The Caloss Crossing', 'Luscia', -610, 139, 55, 'The bridge over the Caloss and the crossing keeper’s hut. Luscia begins on the far bank.'),
  area('reedcutters', 'The Reedcutters’ Camp', 'Luscia', -675, 190, 50, 'Cut reed stacked to dry, a landing workshop, and the people who work the river’s edge.'),
  area('the-rise', 'The Rise', 'Luscia', -675, 230, 50, 'Sava’s shrine and the three waymarkers on the height above the river road.'),
  area('lauvel', 'The Field at the Lauvel', 'Luscia', -700, 315, 70, 'Where the army broke a rebel army: burial mounds, the relay, and the people who buried the losers.'),
  area('lumber-town', 'Lumber Town', 'Luscia', -729, 384, 55, 'Luscia’s timber town: the square, the smiths, the relay clerk and the stable yard on its edge.'),
  area('burned-hamlet', 'The Burned Hamlet', 'Luscia', -621, 356, 55, 'Roof beams standing in the grass, and a well somebody still keeps clean.'),
  // The Moros Plain
  area('moros-gate', 'The Moros Gate', 'Moros Plain', -763, 440, 45, 'Where the road leaves Luscia for open plain, under the army’s eyes.'),
  area('border-stockade', 'The Border Stockade', 'Moros Plain', -667, 527, 70, 'The army’s ditch and stakes on the border, and the ground the battle is fought over.'),
  area('legion-camp', 'The Army Camp', 'Moros Plain', -981, 599, 95, 'The Ambroni outpost at the centre of the plain: gate, tents, horse lines and the Marshal’s command.'),
  // West Suval
  area('west-suval-border', 'Into West Suval', 'West Suval', -636, 685, 60, 'The stockade road crosses into West Suval, and the downs open out toward the sea.'),
  area('suval-downs', 'The Suval Downs', 'West Suval', -600, 745, 70, 'Tawny grass, dry-stone walls, olives and thorn, a broken watchtower and a wayside well.'),
  area('shepherds-fold', 'The Shepherds’ Fold', 'West Suval', -700, 750, 55, 'A dry-stone ring and a turf-roofed hut where the flocks are brought in.'),
  area('paradise-springs', 'Vaervelm Caelazh', 'West Suval', -455, 700, 60, 'Paradise Springs, in plain words: Lakota’s old winery in the north-east. A log cabin where the wine is poured, a great hall where it is made, a spring welling out of the limestone, and eight grapes in blocks down the slope.'),
  area('solis', 'Solis', 'West Suval', -520, 950, 115, 'The walled city on its promontory: the Gate of Sun Horses, the Court of Oaths, the quay, and the Coalition’s camp outside the walls.'),
  // East Suval
  area('suval-border-post', 'Elod’s Border Post', 'East Suval', -400, 499, 60, 'East Suval’s frontier: a shut stone gate, a ditch, and soldiers in light black armour.'),
  area('waystation', 'The Roofless Waystation', 'East Suval', -274, 560, 55, 'A shelter without a roof on the stone road, kept by whoever passes.'),
  area('elod', 'Elod', 'East Suval', -50, 635, 52, 'The Elodi city on its shelf of pale rock: the Sea-Road Gate, the walled precinct of the Threshold, and the ordinary city stepping down toward the water.'),
  area('elod-harbour', 'The Harbour Quarter', 'East Suval', -8, 631, 32, 'Elod’s quay, its breakwater and the strangers’ hostel: the only ground in the city a foreigner is free on, because trade requires it.'),
  area('north-light', 'The North Light', 'East Suval', -68, 538, 44, 'The stone light on the northern point, whitewashed to the sill. The Confederation allots the coast; Elod keeps this stretch of it lit and argues about none of the rest.'),
  area('sorrow-beach', 'Sorrow Beach', 'East Suval', 82, 800, 48, 'Seven roofs on the exposed east coast, boats dragged up the shingle, and a standing stone with names cut on it in three hands.'),
  area('sevenwalls', 'Sevenwalls', 'East Suval', -205, 690, 55, 'A dry valley inland: four terraces with no stream between them, a covered cistern and an olive press older than the houses.'),
  area('suval-dry-hills', 'The Dry Hills', 'East Suval', -146, 858, 62, 'The bare southern ridges above Elod: limestone bones, a shepherds’ cistern and a fold, and an old ring of ridge stones that watches the road.'),
  // Pueth
  area('tessen-crossing', 'The Tessen Crossing', 'Pueth', -105, -217, 60, 'The timber bridge over the Tessen and the army’s road post on the Pueth bank.'),
  area('bramble-woods', 'The Bramble Woods', 'Pueth', 55, -190, 60, 'Birch and thorn off the road north, and the goblin camp that has been crossing the river into Drent.'),
  area('birch-landing', 'Birch Landing', 'Pueth', 76, -246, 55, 'Cold-birch logs stacked by the water, waiting for the shipwrights’ barges.'),
  area('ordel-mouth', 'The Ordel Mouth', 'Pueth', 84, -349, 55, 'Where the Ordel runs out to the northern sea over grey shingle.'),
  area('rimeholt', 'Rimeholt', 'Pueth', -335, -362, 80, 'The palisaded timber town on the Feradom road: a garrison house, a timber yard and a cold welcome.'),
  area('cold-hearth', 'The Cold Hearth', 'Pueth', -40, -418, 55, 'A ring of stones in the open valley, black with old fires.'),
  area('grey-shoulder', 'The Grey Shoulder', 'Pueth', -268, -500, 65, 'Bare hills above the valley, where the birch gives out and the wind does not.'),
  area('feradom-road', 'The Feradom Road', 'Pueth', -424, -522, 60, 'The barrier at the edge of Pueth. Feradom lies beyond it, and the road is shut.'),
  // Elagos
  area('the-stair', 'The Stair', 'Elagos', -1256, 400, 52, 'Where the lake water falls to the Moros in four steps of shelved rock, and the ox capstan that hauls a laden barge back up it.'),
  area('ambron', 'Ambron', 'Elagos', -1274, 300, 130, 'The city on the narrows: four ages of wall on one line, the causeway over the water, the quays on both banks, and the chain every barge in the Lake Lands waits for.'),
  area('the-narrows', 'The Narrows', 'Elagos', -1274, 176, 60, 'Where Lake Ela pinches to forty-six metres before it goes south. Everything the Lake Lands sells passes this gap.'),
  area('lake-ela', 'Lake Ela', 'Elagos', -1345, 100, 110, 'Cold, clear and old, running north-west out of sight, with one outlet at its south-eastern tip.'),
  area('nemmel', 'Nemmel', 'Elagos', -1258, 126, 42, 'A fishing hamlet on Ela’s eastern shore: six roofs, drying frames, and a smoke shed that works all year.'),
  area('the-link', 'The Link', 'Elagos', -1272, 15, 56, 'The Thelas chain’s drain into Ela, crossed on three slabs of lake-stone, with the portage path beside it.'),
  // Amod: the east end of the terrace country, charted from the road in and the shoulder above it.
  area('amod-pass-stones', 'The Amod Pass Stones', 'Amod', -676, -470, 40, 'Four standing stones on the border, an ogre who takes a toll off the road, and the first terrace wall beyond them.'),
  area('ostel-bridge', 'The Ostel Bridge', 'Amod', -772, -488, 34, 'One stone arch over the Tarvel, with an offering shelf on the upstream parapet and the town’s shoulder rising beyond it.'),
  area('ostel', 'Ostel', 'Amod', -814, -504, 44, 'The eastern dry-slope town on its shoulder: stonecutters, hard white wine, a water court and the road house that keeps the toll book.'),
  area('tir-ostel', 'Tir Ostel', 'Amod', -844, -560, 30, 'Ostel’s burial terrace above the town, where the dead lie facing down the watercourse.'),
  area('vessen', 'Vessen', 'Amod', -874, -594, 34, 'Three roofs and a springhouse on the western flank, the high channel above them, and the gate two households argue about.'),
  // Vastos: a plain with nothing built on it charts by its water and its one outcrop of strange rock.
  area('vastos-range', 'The Open Range', 'Vastos', -1560, -400, 120, 'Cold tussock from one horizon to the other, with watering pans strung across it and longhorn cattle standing in them. Nothing here breaks the wind and nothing here casts a shadow.'),
  area('vastos-sulfur', 'The Sulfur Ground', 'Vastos', -1700, -430, 46, 'A crust of pale sinter on the plain’s western fall, a warm pool at its middle, and three vents that have not stopped breathing. The grass stops in a line where the crust starts.'),
  area('vastos-braids', 'The Braided Reach', 'Vastos', -1539, -106, 70, 'Where the ground goes flat the river stops choosing: three shallow channels round bars of grey gravel, and none of them is the river.'),
  area('vastos-basins', 'The Eastern Basins', 'Vastos', -1330, -300, 100, 'Two small cold lakes on the fall toward the lake country, sedge to the waterline. Everything about them is a rehearsal for Elagos except the size.'),
  // Meneth: a country you chart by which ridge you are on and which valley you are in.
  area('meneth-ridges', 'The Meneth Ridges', 'Meneth', -1870, -240, 100, 'Rounded ridge after rounded ridge, all of them running east and west, with an open valley between each pair. Every one is a climb and none of them needs route-finding, which between the mountains and the lake country is the whole point.'),
  area('meneth-nut-slopes', 'The Nut Slopes', 'Meneth', -1905, -150, 60, 'Wild chestnut and walnut standing well apart on the lower ridge faces, hay meadow below them and close-grown hardwood above. The spacing gives it away: nothing in a wood grows that far from its neighbour by accident.'),
  area('meneth-becks', 'The Valley Becks', 'Meneth', -1790, -74, 90, 'Cold shallow water on every valley floor, running east off the ridges toward the one river that takes them. You step over any of them without thinking, which is why none has ever been bridged.'),
  area('meneth-open-end', 'The Open End', 'Meneth', -1620, 90, 80, 'Where the ridges lower and widen and the valley floors run together. There is no line here at which the upland stops and the lake country starts, and nobody who lives on either side has ever felt the want of one.'),
  // Caricas: a country that charts as one corridor, one shelf and one great river.
  area('carica-corridor', 'The Carica Corridor', 'Caricas', -1740, 430, 110, 'Six miles of riverbank nobody has ever cleared: old-growth forest standing to the water on both sides, and somewhere in it the vel-caric, which does not run when you come and does not look away.'),
  area('carica-upper', 'The Upper Carica', 'Caricas', -1660, 300, 62, 'Where the river comes off the eastern shelf: quick, cold, and running over rock and gravel in a cut too steep to stand beside. A summer storm on the plateau reaches here two days later.'),
  area('caricas-shelf', 'The Eastern Shelf', 'Caricas', -1780, 210, 90, 'The rough, dry upland the Carica comes off, fifteen metres above the corridor: stone at the surface, thin soil, and no water on it anywhere.'),
  area('lizeem-bank', 'The Lizeem Bank', 'Caricas', -2170, 200, 110, 'The great river along the western edge of the country: deep, slow, wide enough for light boats, and not crossable by anybody on foot for the whole of its length here.'),
  // Nesdor: a country with almost nothing in it to chart, which is the point of it.
  area('nesdor-head', 'The Valley Head', 'Nesdor', -1570, 380, 76, 'The last of the branch country: a shallow broad valley with hazel and oak on its slopes and a beck on its floor. South and east of here there are no more valleys, and nobody has ever drawn a line where that starts.'),
  area('nesdor-braids', 'The Braided Water', 'Nesdor', -1660, 660, 96, 'Where the gradient dies the water stops keeping to one channel: three shallow threads side by side round low bars of sand, a different shape after every flood season and never deep enough to matter.'),
  area('nesdor-flats', 'The Nesdor Flats', 'Nesdor', -1420, 730, 120, 'Dark alluvial ground with the relief measured in feet, cattle standing about on it, and an open horizon that goes on being open until it is the Moros. Nothing here breaks the sky.'),
  area('lizeem-bend', 'The Lizeem Bend', 'Nesdor', -1630, 740, 90, 'Where the great river turns south-east along the foot of the Flats and takes everything off them with it. A hundred paces of deep water; the far bank is another country and there is no way to it here.'),
  // Eer: a country with one line drawn across it, and the chart records which side of it you are on.
  area('eer-loam', 'The Black Loam', 'Eer', -1250, 1000, 110, 'The heavy inland half: alluvium the great river has been laying down since before anybody counted, black to the depth of a spade, holding water the whole year and carrying grass to the knee. Everybody who has ever wanted this country has wanted this.'),
  area('eer-channels', 'The Two Channels', 'Eer', -1120, 1100, 95, 'Shallow water leaving the loam and going south-east to the sea, widening and slowing until it stops keeping to one bed. Herons stand in all three threads of it and do not move when you do.'),
  area('eer-scrub', 'The Dry Half', 'Eer', -1070, 1180, 100, 'Where the rain stops coming in summer: tawny grass, grey cushion scrub that smells of itself when you walk through it, and wild olives standing singly with nothing near them. Nobody drew a line here; the weather changed under you a hundred paces back.'),
  area('eer-bays', 'The Low Bays', 'Eer', -930, 1250, 95, 'The Iberos coast of Eer: low headlands and small sheltered bays, none of them big enough to be a harbour. No cliff, no proper beach — the grass thins, gives out, and the water is there. Gulls on all of it, and something with a fin out past the surf.'),
  area('lizeem-reach', 'The Lower Lizeem', 'Eer', -1420, 1080, 110, 'The last reach of the great river, going grey with what it is carrying. Gala is on the far bank and there is no way to it: not here, and not anywhere along this side.'),
  // Peblos: the islands, which are charted from the water as much as from the land.
  area('cobble', 'Cobble', 'Peblos', 336, 432, 45, 'The one village in the Pebbles: a stone quay, drying racks, ten roofs on a shelf of rock, and the Empire’s tally shed.'),
  area('peblos-headland', 'The Cobble Headland', 'Peblos', 402, 366, 42, 'The northern cape of the main island, with the unlit headland light on its crown.'),
  area('peblos-south-shore', 'The Southern Shore', 'Peblos', 410, 490, 45, 'The low neck of the main island: shingle, a cove the seals have, and the sea on both sides of you.'),
  area('longstone', 'Longstone', 'Peblos', 375, 159, 70, 'The long bare island north of Cobble, with the Empire’s abandoned beacon on its ridge.'),
  area('gull-scarp', 'Gull Scarp', 'Peblos', 250, 289, 55, 'A white-streaked rock between Cobble and the Drent shore, and every gull in the Stills.'),
  area('pilots-stone', 'The Pilot’s Stone', 'Peblos', 50, 289, 55, 'The nearest Pebble to Drent, and the mark the pilots steer by out of Tidehaven.'),
  area('wrack-island', 'Wrack Island', 'Peblos', 150, 462, 55, 'Shingle, thrift, and the ribs of the Sea-Mare standing out of it.'),
  area('saltings', 'The Saltings', 'Peblos', -100, 375, 55, 'The westernmost Pebble: salt pans in the turf and one standing stone.'),
  // West Izol: the western half of the island of Izol, across the Izoli Channel.
  area('izolveth', 'Izolveth', 'West Izol', 58, 1776, 62, 'The largest town on the island and not its capital: a quay, two moles, a ropewalk, and a meeting house at the top of the cut that is plainly not a palace.'),
  area('izol-headland', 'The Harbour Headland', 'West Izol', 150, 1668, 46, 'The rock that shelters Izolveth\u2019s harbour, with the Sea Gate in the cleft at its head and the channel on three sides.'),
  area('izolveth-camp', 'The Camp Above Izolveth', 'West Izol', 180, 1886, 56, 'Tent lines and a drill ground on the pasture above the town, under seven banners and three generals.'),
  area('ardveth', 'Ardveth', 'West Izol', -90, 1818, 58, 'Six roofs and a shingle beach in the next cove but one, facing the open channel.'),
  area('kelvath', 'Kelvath Cove', 'West Izol', 252, 1750, 50, 'A slip, a saw pit and a hull on the stocks with no planking on her, in a cove easier to reach by sea than by land.'),
  area('sightstone', 'The Sightstone', 'West Izol', 382, 1806, 60, 'The shoulder of the Hearth Road where all three Presences stand up at once. The Hearthstone itself is further in.'),
  area('long-pasture', 'The Long Pasture', 'West Izol', 272, 1956, 62, 'The low inland grass where the highland flocks come down, with a dry-stone fold and a cairn.'),
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

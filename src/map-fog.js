import {URUBOND_LANDMARKS} from './urubond-world.js';
import { OUTER_LANDMARKS } from './outer-regions-world.js';
import { ACOR_LANDMARKS } from './acor-world.js';
/**
 * What the traveler has charted. The world chart starts blank: a hex of the
 * authored atlas is uncovered only when the traveler has walked into it, and the country between them is named by subregions — small
 * authored areas (a point and a reach, usually a hex or three) that are recorded
 * in the journal the first time the traveler reaches one. Tidehaven, the port
 * village the game opens in, is the first. Pure: no DOM, no three.
 */
import { hexAt, regionAt } from './region-world.js';
import { BALDRO_KINGDOMS, BALDRO_PATHS, baldroRegionAt } from './baldro-world.js';
import { FARMSTEADS } from './regional-farmland.js';
import { WINERY } from './winery.js';
import { CARICAS_TOWN } from './caricas-settlement.js';
import { NYLON } from './nylon-city.js';
import { AEVIS } from './aevis-city.js';
import { MITHALA_CITY } from './mithala-city.js';
import { EAST_PYROS_LANDMARKS } from './east-pyros-world.js';
import { NETHER_DESERT_LANDMARKS } from './nether-desert-world.js';
import { LEGEMUM_LANDMARKS } from './legemum-world.js';
import { BABON_LANDMARKS } from './babon-world.js';
import { NORTHERN_LANDMARKS } from './northern-oremindi-world.js';
import { SOUTH_CELDER_LANDMARKS } from './south-celder-world.js';
import { NORTH_CELDER_LANDMARKS } from './north-celder-world.js';
import { CANERD_LANDMARKS } from './canerd-world.js';
import { PYRA_LANDMARKS } from './pyra-world.js';
import { SELAMUS_LANDMARKS } from './selamus-city.js';
import { EAST_IZOL_LANDMARKS } from './east-izol-world.js';
import { ALEZHOR_LANDMARKS } from './alezhor-world.js';
import { SOUTH_IBENAL_LANDMARKS } from './south-ibenal-world.js';
import { NORTH_IBENAL_LANDMARKS } from './north-ibenal-world.js';
import { HENBORTH_LANDMARKS } from './henborth-world.js';
import { ISCARE_RUIN_SITES, ISCARE_REGION } from './iscare-world.js';
import { IBENWOOD_GROVES, IBENWOOD_ARRIVALS, IBENWOOD_PILOT } from './ibenwood-environment.js';

export const MAP_FOG_VERSION = 1;
/** The chart records ground the traveler has actually stood on: one authored hex at a time. */
export const CHART_GRAIN = 'hex';
const HEX_NEIGHBOURS = Object.freeze([[1, 0], [1, -1], [0, -1], [-1, 0], [-1, 1], [0, 1]]);

/** Detail belongs to entered hexes. The world map also uses this for individual local marks. */
export function chartKnowsPoint(cells, x, z) {
  if (!Number.isFinite(x) || !Number.isFinite(z)) return false;
  const at = hexAt(x, z), key = `${at.q},${at.r}`;
  return cells instanceof Set ? cells.has(key) : Array.isArray(cells) && cells.includes(key);
}

const area = (id, name, region, x, z, radius, note) => Object.freeze({ id, name, region, x, z, radius, note });

/** The named ground of Azhora, as the traveler's own chart records it. */
export const SUBREGIONS = Object.freeze([
  ...NORTHERN_LANDMARKS.map(l=>area(l.id,l.name,l.region,l.x,l.z,35,l.description)),
  ...[...ACOR_LANDMARKS,...URUBOND_LANDMARKS].map(l=>area(l.id,l.name,l.region,l.x,l.z,30,l.description)),
  ...OUTER_LANDMARKS.map(l=>area(l.id,l.name,l.region,l.x,l.z,30,l.description)),
  ...BALDRO_KINGDOMS.flatMap(k => {
    const side = k.id === 'west-baldro' ? 'Western' : 'Eastern';
    const points = BALDRO_PATHS.find(p => p.id === 'baldro-saddle-traverse').points.filter(p => baldroRegionAt(p.x, p.z) === k.region);
    const pass = points[Math.floor(points.length / 2)];
    return [area(`${k.id}-gate`, `${k.name} Gate`, k.regionName, k.gate.x, k.gate.z, 44,
      'The mountain gate of one of the two surviving independent dwarf city kingdoms. Dwarfland joins the two in confederation, but permission to enter is earned here separately.'),
      area(`${k.id}-pass`, `${side} Baldro saddle`, k.regionName, pass.x, pass.z, 42,
        'A winding natural traverse through unequal ridges and sheltered rock basins. The path joins the approaches to the two independent dwarf holds.')];
  }),
  ...FARMSTEADS.map(farm => area(farm.id, farm.name, farm.region, farm.x, farm.z, 28, 'Worked fields, an open tool shelter and shared garden beds. Take seeds, sow, water, and return for the harvest.')),
  ...[
    ['East Pyros', EAST_PYROS_LANDMARKS, 'Volcanic grassland, mineral springs and weathered outcrops in the open eastern Pyrosi country.'],
    ['Nether Desert', NETHER_DESERT_LANDMARKS, 'Exposed stony plateau, dry rain pans and shallow scrub-lined washes above the upper Neth.'],
    ['Babon', BABON_LANDMARKS, 'Ancient tropical canopy, fern-filled ravines, steep jungle ridges and sheltered coves on the great island.'],
    ['Legemum', LEGEMUM_LANDMARKS, 'Tin-bearing hills, slate headlands and sheltered woodland around the damp heath and peat hollows.'],
    ['South Celder', SOUTH_CELDER_LANDMARKS, 'Open grass plain falling east from the Oremindi in low swells, its water gathered on the eastern margin.'],
    ['North Celder', NORTH_CELDER_LANDMARKS, 'Grassland and plain between the East Oremindi and the streams of the Mithala margin.'],
    ['East Izol', EAST_IZOL_LANDMARKS, 'Rock and pasture rising from a headland coast to the Three Presences.'],
    ['Alezhor', ALEZHOR_LANDMARKS, 'A cool coastal strip between the open ocean and the Ibenwood\'s tree line, cut by the gold rivers.'],
    ['South Ibenal', SOUTH_IBENAL_LANDMARKS, 'A coastal plain between the open ocean and the Ibenwood, crossed at intervals by small rivers out of the forest.'],
    ['North Ibenal', NORTH_IBENAL_LANDMARKS, 'A cold, narrowing coastal plain between the open ocean and the Ibenwood, ending at the Narrows below the Oremindi.'],
    ['Henborth', HENBORTH_LANDMARKS, 'Open continental plains between the Celder and Mithala country and the northern mountain approaches.'],
  ].flatMap(([region, landmarks, note]) => landmarks.map(p => area(p.id, p.name, region, p.x, p.z, Math.max(28, p.radius ?? 40), p.description ?? note))),
  ...PYRA_LANDMARKS.map(p=>area(p.id,p.name,regionAt(p.x,p.z).name,p.x,p.z,Math.max(18,Math.min(32,p.radius)),p.description)),
  ...SELAMUS_LANDMARKS.map(p=>area(p.id,p.name,'Selemi',p.x,p.z,p.radius,p.description)),
  ...CANERD_LANDMARKS.filter(p=>p.id!=='canerd-court').map(p=>area(p.id,p.name,regionAt(p.x,p.z).name,p.x,p.z,p.radius,p.description)),
  ...ISCARE_RUIN_SITES.map(site => area(site.id, site.name, ISCARE_REGION, site.x, site.z, 45, 'Burned, roofless stone and charred beams remain from the Blood Prince\'s passage. The islands have wildlife, but these settlements are abandoned.')),
  area('imlamdris-rebuilding', 'Imlamdris rebuilding', 'South Suval', -126, 1154, 40, 'Four small timber homes and a new building frame stand beside the razed city.'),
  // Drent
  // The id stays `eastreena` so older charts keep loading; the name on the chart is the one the village uses now.
  area('eastreena', 'Tidehaven', 'Drent', -6, 29, 55, 'The port village on Drent’s east coast, where the road begins. It was East Rena once — Eastreena — when there was a Rena to be east of, and the old people still call it that.'),
  area('the-greenway', 'The Greenway', 'Drent', -70, 29, 45, 'The old footpath inland under the broadleaf canopy, the waykeeper’s watch and the charcoal burners’ ground.'),
  area('willowmere', 'Willowmere', 'Drent', -97, 9, 30, 'A quiet forest pool east of the road, with a fishing ledge and a stone firepit.'),
  area('fernway', 'Fernway Rest', 'Drent', -128, 34, 45, 'A shaded bench and an old cairn where the woodland paths meet, with Odger Pell’s drying rack on the bench side and Fern Hollow damp behind it.'),
  area('avrel', 'The Avrel Clearing', 'Drent', -421, 40, 75, 'Farm clearings in Drent’s forested upland: the mill commons, the army’s post, the sunken drove lane where Nell Harrow works her hedge banks, and the road on to the Caloss.'),
  area('rena', 'The Ruins of Rena', 'Drent', -395, -70, 55, 'Rena was the principal town of Drent until it was pulled down after a battle eighty years ago: street lines under the grass, a burnt gate, the stump of the hall, and a well that still holds water.'),
  area('applegarth', 'Applegarth', 'Drent', -568, -32, 45, 'The orchard village at the west end of the old Rena road. It was West Rena, then Westerina, and its bound stone has never been recut.'),
  // Drent's tenth (the user, 2026-09-21). Small on purpose: the Caloss Bank's reach comes within
  // twenty metres of it, so the ground is sized to what is actually here - the roofless house,
  // the stream crossing below it, Silas Garrow's cart, and the road they all stand off.
  area('the-toll-house', 'The Toll House', 'Drent', -515, 92, 18, 'A roofless toll house at the head of a stream crossing on the Caloss road, where the lord of Rena took a toll on everything going down to the river. Silas Garrow keeps his marl cart on the road side of it, and the stream cut below is a section a man can read.'),
  area('caloss-bank', 'The Caloss Bank', 'Drent', -546, 177, 70, 'Drent’s side of the river: reed beds, a quiet fishing bank and the road down to the bridge.'),
  // Luscia
  area('caloss-crossing', 'The Caloss Crossing', 'Luscia', -610, 139, 55, 'The bridge over the Caloss and the crossing keeper’s hut. Luscia begins on the far bank.'),
  area('reedcutters', 'The Reedcutters’ Camp', 'Luscia', -675, 190, 50, 'Cut reed stacked to dry, a landing workshop, and the people who work the river’s edge.'),
  area('the-rise', 'The Rise', 'Luscia', -675, 230, 50, 'Sava’s shrine and the three waymarkers on the height above the river road.'),
  area('lauvel', 'The Field at the Lauvel', 'Luscia', -700, 315, 70, 'Where the army broke a rebel army: burial mounds, the relay, and the people who buried the losers.'),
  // **Nothom**, which is Luscian Mittoli for what the Empire's clerks used to call Lumber Town:
  // `noth`, forest or timber, on `hom`, a settlement (azhoran_language_profiles.py, the Mittoli
  // root list; the user, 22 September 2026). The id is the old one and stays the old one - it is
  // in saves, in the road smoke and in a dozen modules, and nobody reads an id.
  area('lumber-town', 'Nothom', 'Luscia', -729, 384, 55, 'Luscia’s timber town: the square, the smiths, the relay clerk and the stable yard on its edge.'),
  area('burned-hamlet', 'The Burned Hamlet', 'Luscia', -621, 356, 55, 'Roof beams standing in the grass, and a well somebody still keeps clean.'),
  area('paradise-springs', WINERY.name, WINERY.region, WINERY.centre.x, WINERY.centre.z, WINERY.radius, 'Paradise Springs, in plain words: Lakota’s old winery southeast of Port Calos. A log cabin where the wine is poured, a great hall where it is made, a spring welling out of limestone, and eight grapes in blocks down the slope.'),
  // The Moros Plain
  area('moros-gate', 'The Moros Road', 'Moros Plain', -763, 440, 45, 'The open road from Nothom onto the Moros Plain. The town’s guards keep watch back at its walls.'),
  area('border-stockade', 'The Border Stockade', 'Moros Plain', -667, 527, 70, 'The army’s ditch and stakes on the border, and the ground the battle is fought over.'),
  area('legion-camp', 'The Army Camp', 'Moros Plain', -981, 599, 95, 'The Ambroni outpost at the centre of the plain: gate, tents, horse lines and the Marshal’s command.'),
  // West Suval
  area('west-suval-border', 'Into West Suval', 'West Suval', -636, 685, 60, 'The stockade road crosses into West Suval, and the downs open out toward the sea.'),
  area('suval-downs', 'The Suval Downs', 'West Suval', -600, 745, 70, 'Tawny grass, dry-stone walls, olives and thorn, a broken watchtower and a wayside well.'),
  area('shepherds-fold', 'The Shepherds’ Fold', 'West Suval', -700, 750, 55, 'A dry-stone ring and a turf-roofed hut where the flocks are brought in.'),
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
  area('ambron', 'Ambron', 'Elagos', -1130, 10, 155, 'The imperial capital fills dry ground between four lakes: high civic roofs in the north, an interlake market, and guild courts and homes along the southern avenues.'),
  area('the-narrows', 'The Narrows', 'Elagos', -1274, 176, 60, 'Where Lake Ela pinches to forty-six metres before it goes south. Everything the Lake Lands sells passes this gap.'),
  area('lake-ela', 'Lake Ela', 'Elagos', -1345, 100, 110, 'Cold, clear and old, running north-west out of sight, with one outlet at its south-eastern tip.'),
  area('nemmel', 'Nemmel', 'Elagos', -1258, 126, 42, 'A fishing hamlet on Ela’s eastern shore: six roofs, drying frames, and a smoke shed that works all year.'),
  area('the-link', 'The Link', 'Elagos', -1272, 15, 56, 'The Thelas chain’s drain into Ela, crossed on three slabs of lake-stone, with the portage path beside it.'),
  // Amod: the east end of the terrace country, charted from the road in and the shoulder above it.
  area('amod-pass-stones', 'The Amod Pass Stones', 'Amod', -676, -470, 40, 'Four standing stones on the border, an ogre who takes a toll off the road, and the first terrace wall beyond them.'),
  area('ostel-bridge', 'The Ostel Bridge', 'Amod', -772, -488, 34, 'One stone arch over the Tarvel, with an offering shelf on the upstream parapet and the town’s shoulder rising beyond it.'),
  area('ostel', 'Ostel', 'Amod', -814, -504, 44, 'The eastern dry-slope town on its shoulder: stonecutters, hard white wine, a water court and the road house that keeps the toll book.'),
  area('tir-ostel', 'Tir Ostel', 'Amod', -844, -560, 30, 'Ostel’s burial terrace above the town, where the dead lie facing down the watercourse.'),
  area('varn', 'Varn', 'Amod', -1150, -746, 52, 'The Empire’s fortress-city in the notch at Amod’s northern tip: six walls built into two shoulders of rock, a keep over the Pass Gate, and a town on the one street, which is the pass road out of the East Lotharn. Both gates are kept shut and the walls are manned; the only way past over the mountain is the climbers’ two slabs on the east jamb.'),
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
  area('aevis', 'Aevis', 'Southern Ascarth', AEVIS.x, AEVIS.z, 74, 'The bronze city of the Avites: massive landward gates, verdigris roofs, a martial palace court and a working harbor open to the sea. Bronze-armored soldiers guard its streets.'),
  area('nylon', 'Nylon', 'Eer', NYLON.x, NYLON.z, 82, 'The independent city at the Lizeem estuary: immensely high walls surround tall scholarly houses, an immaculate Great Library and the tower palace. Its protected harbour keeps the city supplied when its hinterland is lost.'),
  area('eer-loam', 'The Black Loam', 'Eer', -1250, 1000, 110, 'The heavy inland half: alluvium the great river has been laying down since before anybody counted, black to the depth of a spade, holding water the whole year and carrying grass to the knee. Everybody who has ever wanted this country has wanted this.'),
  area('eer-channels', 'The Two Channels', 'Eer', -1120, 1100, 95, 'Shallow water leaving the loam and going south-east to the sea, widening and slowing until it stops keeping to one bed. Herons stand in all three threads of it and do not move when you do.'),
  area('eer-scrub', 'The Dry Half', 'Eer', -1070, 1180, 100, 'Where the rain stops coming in summer: tawny grass, grey cushion scrub that smells of itself when you walk through it, and wild olives standing singly with nothing near them. Nobody drew a line here; the weather changed under you a hundred paces back.'),
  area('eer-bays', 'The Low Bays', 'Eer', -930, 1250, 95, 'The Iberos coast of Eer: low headlands and small sheltered bays, none of them big enough to be a harbour. No cliff, no proper beach — the grass thins, gives out, and the water is there. Gulls on all of it, and something with a fin out past the surf.'),
  area(CARICAS_TOWN.id, CARICAS_TOWN.name, 'Caricas', CARICAS_TOWN.x, CARICAS_TOWN.z, CARICAS_TOWN.radius, 'An Imperial garrison holds the town, with worked farms on the dry shelf and the old wooded river corridor nearby.'),
  area('caricas-farms', 'The Caricas Fields', 'Caricas', -2000, 240, 65, 'Cultivated fields outside the occupied town; the civil war has not ended simply because the army holds its roads.'),
  area('menora', 'Minora', 'Isareos', -2345, 120, 112, 'The fortified holy city at the Isa-Lizeem fork. Tall white walls enclose a great temple, the Sorcerers’ Guild tower, gardens and stone streets.'),
  area('menora-army-muster', 'The Blood Prince’s Army', 'Isareos', -2474, 83, 48, 'Prince Wilhelm and his army camp outside Minora’s western gate. Their role in the later main story is still to unfold.'),
  area('yunethre-free-town', 'Lakeside Free Town', 'Yunethre', -3000.0019279391277, -317.41016151377545, 50, 'Independent neutral ground beside the lake below South Oremindi. Humans, elves and centaurs share this town, respected by the neighboring powers.'),
  area('yunethre-centaur-camp', 'Bane’s Camp', 'Yunethre', -2700.0019279391277, -317.41016151377545, 62, 'A nomadic centaur camp in the mountain pass. The clans defend their dwindling plains against encroachment from the north and south, with trade and support from Elfland.'),
  // Isareos: the fortified holy city and the exposed grass-hill frontier.
  area('isareos-shoulders', 'The Isareos Shoulders', 'Isareos', -2520, -60, 110, 'The high ground between the valley heads: the same modest hundred-foot rise over and over, grass to the top of every one and no tree on any. Every one is a climb and none of them needs route-finding, which is the whole use of this country to everybody who crosses it.'),
  area('isareos-hollows', 'The Thorn Hollows', 'Isareos', -2610, 20, 95, 'Hawthorn and blackthorn down in the folds and on the lee of every shoulder, in threes and fours and nothing tall enough to stand under. On open hill country the wind decides where a woody thing may live, and it has decided here.'),
  area('isareos-gallery', 'The Isa Gallery', 'Isareos', -2620, 116, 100, 'Alder, willow and hazel two trees deep along the Isa and not one pace further. There is no forest hex anywhere in this country: this ribbon is the whole of the wood in it, and the valley communities cut it and let it grow again.'),
  area('isareos-west-rim', 'The Western Rim', 'Isareos', -2800, 30, 100, 'Where the hills give out against the Ibenwood: the grass goes thin, short and grey, the shoulders flatten, and the wind comes off the forest with nothing at all to break it.'),
  // Nethereum: a country charted by how deep in the dish you are standing.
  area('nethereum-hollow', 'The Hollow', 'Nethereum', -2600, 300, 105, 'The northern shoulder of the basin, where the ground stops being ordinary and starts going down. Six hundred metres across and eight deep, with the fall spread over two hundred paces: there is no bank anywhere and no moment at which you have arrived.'),
  area('nethereum-basin', 'The Deep Basin', 'Nethereum', -2545, 372, 110, 'The bottom of it, which the Nethrani call the nethoss and use for any situation that cannot get worse. The richest pasture in the inner branch country, knee-deep and soft and standing in its own damp — and under water again every spring, which is why nobody is on it but the cattle.'),
  area('nethereum-threads', 'The Wet Threads', 'Nethereum', -2620, 370, 90, 'Where the hill-streams stop being streams: the channel spreads, the water goes into the ground, and what runs on across the meadow is a line of rush and sedge a few paces wide. Not a marsh — a wet line in a field, of the kind that tells a walker where to put his feet.'),
  // Pulled back onto the country's own ground rather than sat on the crossing itself: the
  // ford is on the southern corner of Nethereum and a disc centred on it was 42% Ovesos.
  area('neth-ford', 'The Neth Ford', 'Nethereum', -2320, 545, 50, 'Gravel, shin-deep, below where the river comes off the desert edge. The only dry-shod way south out of this country, and the only place on the Neth that is one: everything below it runs deep to the Lizeem and nobody has bridged any of it.'),
  area('nethereum-dry-corner', 'The Dry Corner', 'Nethereum', -2880, 206, 95, 'The one corner the basin does not drain, against the Nether Desert. Two metres lower than the rim and outside the catchment altogether: the grass goes short, thin and grey, and the wind off the desert margin has nothing to break it.'),
  // South Suval: the lake country and its hills (src/south-suval-world.js).
  area('imlamdris', 'Imlamdris', 'South Suval', -52, 1158, 62, 'The oldest city on the peninsula, on terraces climbing from the Stillwater to the Star Terrace, facing the water and turning its back on the road.'),
  area('the-stillwater', 'The Stillwater', 'South Suval', -100, 1241, 58, 'Spring-fed and never dry: the only lake on the peninsula, misted in the mornings, with reed round its open shore.'),
  area('south-suval-ridge', 'The Ridge', 'South Suval', -150, 1075, 95, 'Pale limestone across the north of the country, cold-summer ground where little grows but cushion scrub and stone.'),
  area('imlamdris-pass', 'The Hill Pass', 'South Suval', -40, 1050, 75, 'The saddle east of the ridge and the road over it, then west under the ridge to the barred southern hill gate in the East Suval frontier.'),
  area('eastern-slopes', 'The Eastern Slopes', 'South Suval', 0, 1241, 55, 'Vines in rows on the hill across the water from the city, facing the morning sun.'),
  area('southern-cliffs', 'The Southern Cliffs', 'South Suval', -150, 1335, 100, 'The ridge country’s drop to the sea: high ground to the edge, then rock and swell. A cove where the grass comes down, and seabirds on the tops.'),
  // Feradom: the barrier hills along its inland edge, and the six passes through them (src/feradom-world.js).
  area('feradom-barrier-hills', 'The Barrier Hills', 'Feradom', -307, -629, 125, 'Steep forested hills along the duchy’s inland edge, faced with a band of bare rock toward the border, with beacons on the summits between the passes.'),
  area('feradom-ordel-gap', 'The Ordel Gap', 'Feradom', -148, -587, 60, 'The easternmost pass: a gorge above the Ordel, a tower on its rim, and a castle across the basin behind.'),
  area('feradom-road-pass', 'The Road Pass', 'Feradom', -421, -610, 70, 'The Feradom road’s pass: a gorge, a tower above the narrows, and the great castle of the passes, its gate toward Pueth shut.'),
  area('feradom-birch-pass', 'The Birch Pass', 'Feradom', -586, -705, 60, 'A narrow gorge on the Amod border, west of the corner where Pueth’s border turns, and a small castle behind it.'),
  area('feradom-amod-pass', 'The Amod Pass', 'Feradom', -728, -850, 60, 'The pass over against Amod: a gorge, its tower, and a castle filling the basin.'),
  area('feradom-stone-pass', 'The Stone Pass', 'Feradom', -830, -908, 60, 'A castle in a basin cut from the East Lotharn’s foothills, the range’s grey slopes above it.'),
  area('feradom-fir-pass', 'The Fir Pass', 'Feradom', -896, -1022, 60, 'The westernmost pass, deep in the firs between the East Lotharn and the sea.'),
  // The East Lotharn: the old range's valleys and tops (src/east-lotharn-world.js).
  area('kemrath', 'Kemrath', 'East Lotharn Mountains', -1330, -835, 125, 'A broad high valley with a flat floor of deep soil, fields in strips down both sides of its water and vines on its north wall.'),
  area('the-col', 'The Col', 'East Lotharn Mountains', -1080, -895, 60, 'The saddle at Kemrath’s head between the two massifs, the divide and the pass’s highest section. The pass inn stands on it.'),
  area('stonegate', 'Stonegate', 'East Lotharn Mountains', -1080, -1080, 110, 'The gorge the pass goes down to the Mithala plain: white water between walls of layered stone.'),
  area('upper-olveth', 'Upper Olveth', 'East Lotharn Mountains', -1330, -1060, 110, 'An open high valley of the north face, sheep grass at its head and its beck running down to the border water.'),
  area('central-massif', 'The Central Massif', 'East Lotharn Mountains', -1300, -955, 110, 'Old forest to a grazed top, and the iron and coal of the central range in its south face.'),
  area('eastern-massif', 'The Eastern Massif', 'East Lotharn Mountains', -930, -830, 110, 'The highest ground in the range, forested to a rounded open summit.'),
  area('border-water', 'The Border Water', 'East Lotharn Mountains', -1250, -1165, 90, 'The range’s northern foot, where the forest gives out above a mountain river and the Mithala plain begins.'),
  // The Ascarth Peninsula, on the far bank of the Lizeem's mouth (src/ascarth-world.js).
  area('ascarth-neck', 'The Neck', 'Northern Ascarth', -1455, 1335, 55, 'Where the peninsula leaves the mainland: low grass at Gala’s own level between the western sea and the bay under the Lizeem’s mouth, before the ground begins to rise.'),
  area('interior-hills', 'The Interior Hills', 'Northern Ascarth', -1365, 1580, 105, 'Two rounded rocky hills and a saddle between them, wooded in evergreen oak with pine on the tops, and green stain on the stone of the southern one where the copper is.'),
  area('ascarth-west-cliffs', 'The West Cliffs', 'Northern Ascarth', -1530, 1535, 55, 'Grass to the edge and then a fall to rock and swell: the peninsula’s western shore, with gulls on the tops.'),
  area('ascarth-east-bays', 'The East Bays', 'Southern Ascarth', -1010, 1840, 70, 'Sheltered bays between low headlands on the finger’s eastern shore, each with its beach: the only good anchorage the peninsula has.'),
  area('ascarth-finger', 'The Finger', 'Southern Ascarth', -870, 2060, 90, 'Thin grass and stone rolling between two seas, a wild olive here and there and nothing taller, cliffs on the west.'),
  area('ascarth-tip', 'The Tip', 'Southern Ascarth', -720, 2255, 55, 'The end of the peninsula: cliffs round three sides, sea-plungers diving off it, and Selemi across the channel to the south.'),
  area('lizeem-reach', 'The Lower Lizeem', 'Eer', -1420, 1080, 110, 'The last reach of the great river, going grey with what it is carrying. Gala is on the far bank and there is no way to it: not here, and not anywhere along this side.'),
  // Gala: one plain charted by which of its three climates you are in (src/gala-world.js).
  area('gala-dry-north', 'The Dry North', 'Gala', -1690, 1040, 105, 'The interior weather and no shelter from it: bunch grass in tussocks with bare ground between them, grey wormwood and saltbush, and a hot wind off the Oves Desert. Grazed rather than farmed, the lore says, and nobody grazing it.'),
  area('gala-wash', 'The Dry Wash', 'Gala', -1722, 1122, 55, 'A bed of grey gravel between low cut banks, running south-east off the steppe shoulder. Water in it for a few days after the winter rains and none the rest of the year.'),
  area('oveth-ford', 'The Oveth Ford', 'Gala', -1772, 978, 40, 'Where the Oveth narrows over rock below the corner of three countries: shin-deep and quick, and the only place on this reach it is crossed. Below it the river deepens toward the Lizeem.'),
  area('gala-maquis', 'The Maquis', 'Gala', -1680, 1262, 90, 'Tawny grass and low aromatic scrub on every rise, never closed, and wild olive and fig standing singly a long way apart. The rain comes off the sea here and not off the desert.'),
  area('gala-mouths', 'The Braided Mouths', 'Gala', -1772, 1372, 58, 'The plain’s water coming down to the Iberos Sea in three threads round bars of sand, reed and tamarisk thick along all of them, and black geese on the widest of the water.'),
  // Ovesos and the Oves Desert: one climate over both of them, so the chart names them by what the
  // ground is made of and where the water is (src/oves-world.js).
  area('oves-upland-grass', 'The Upland Grass', 'Ovesos', -2050, 592, 110, 'The northern rows, six metres above the river: bunch grass in tussocks with bare earth showing between them, buff eleven months of the year. The lore\u2019s herders move flocks across this ground between the summer plateau and the winter valley edge, and none of them is here.'),
  area('oves-sorten', 'The Sorten', 'Ovesos', -1956, 800, 62, 'The wide seat: a bench of bottomland a metre below the plain where the Oveth slows and spreads, with poplar, willow and tamarisk along the water in a dark line two trees deep. The only green ground in the country.'),
  area('oves-open-plain', 'The Open Plain', 'Ovesos', -1790, 782, 92, 'The southern rows, thinner and flatter than the grass above them: short bunch grass going to bare ground, grey wormwood and blue-grey saltbush where the soil gives out, stones on the rises, and a vulture over it.'),
  area('oves-rim-hills', 'The Rim Hills', 'Oves Desert', -2438, 812, 92, 'Three low rounded hills stepping south-west down the desert\u2019s north-western rim, broad-backed and worn, with bare stone through the thin soil on their tops. They are the whole reason the country behind them is a desert.'),
  area('oves-dry-channels', 'The Dry Channels', 'Oves Desert', -2250, 878, 86, 'Cut beds of coarse gravel and boulders running east-south-east off the hills\u2019 feet, deep enough to stand in and dry in every one of them, with one reach of one of them holding water below the gravel and a hundred paces of green in it.'),
  area('oves-wedge', 'The Dry Wedge', 'Oves Desert', -2170, 986, 96, 'The floor of the Oves: worn rock through a poor thin soil, gravel pavement wherever the rock is up, perennial scrub spaced wide enough to walk between, and a stubble of dead seed-heads in the pockets where a wet year\u2019s grasses would be.'),
  area('oves-apex', 'The Wedge\u2019s Point', 'Oves Desert', -1878, 968, 44, 'The eastern point of the desert, where the Oveth comes down off the Ovesian border and the Caelin comes in to meet it. The lowest ground in the Oves and the only water anywhere near it.'),
  // The West Lotharn (src/west-lotharn-world.js): the spine of the range, its two valleys, the col
  // the two halves join at, and the two lesser masses that are not summits so much as fronts.
  area('west-lotharn-crest', 'The Crest', 'West Lotharn Mountains', -1842, -792, 95, 'The highest crest of the Lotharn: pale grass above worn shoulders and courses of cliff, with the long valley far below. Slanting ramps and narrow shelves wind up through the rock.'),
  area('west-lotharn-long-valley', 'The Long Valley', 'West Lotharn Mountains', -1800, -668, 110, 'A flat floor of deep soil fifty paces across with old wood climbing away from it on both sides, and a divide in it where its two becks part — one east to the Vastos margin, one west the whole length of the range.'),
  area('west-lotharn-west-reach', 'The Western Reach', 'West Lotharn Mountains', -2150, -500, 110, 'The long fall of the valley floor from the divide to the hills above Yunethre, with the cold head standing over it on one side and the south rampart on the other.'),
  area('west-lotharn-north-valley', 'The North Valley', 'West Lotharn Mountains', -1876, -890, 70, 'The range’s drainage to the Mithala plain, down the notch in the massif between the crest’s north shoulder and the north summit: steeper than the long valley, open all the way, and the one break in the forested wall the plain sees.'),
  area('west-lotharn-col', 'The Col', 'West Lotharn Mountains', -1618, -848, 45, 'Where the two halves of the Lotharn join: the gap at forty-three metres that the East Lotharn’s Kemrath runs out through, with the West’s east arm on one side and the East’s south-west peak on the other. The water turns north down the notch from here.'),
  area('west-lotharn-cold-head', 'The Cold Head', 'West Lotharn Mountains', -2380, -470, 95, 'The mountains at the western tip of the range, furthest from the plain and first to meet the westerly weather. Colder winds scour the exposed crown above the sheltered wood.'),
  area('west-lotharn-rampart', 'The South Rampart', 'West Lotharn Mountains', -2250, -340, 70, 'The range’s southern wall, one hex deep above Isareos: cliffs in courses standing over ordinary country, with the lake country’s low hills beginning immediately below them.'),
  // The Mithala plain (src/mithala-world.js): four countries, one landform, and a chart with almost
  // nothing on it - which is honest, because the country's own answer to "where are we" is which
  // channel you are on. Every area here is either a piece of the river's own work or a horizon, but
  // one: the city at the meeting (src/mithala-city.js), charted from the Ford, the quarter the south
  // road comes in by, where its badge stands and the testing panel puts a traveler down.
  area('mithala', 'Mithala', 'South Mithala', MITHALA_CITY.arrival.x, MITHALA_CITY.arrival.z, 68, 'The river-city at the meeting of the arms and the royal seat of the Mithala: four quarters on made ground with the water between them. The Fork, the old seat, behind the only stone wall on the plain, with the king’s hall and the sky tower; the Braid Bank and its cattle market; the Quays and the grain barges; and the Ford, where the south road comes in to the plain’s only crossing. Three bridges join the Fork to the other quarters, and the ford is waded.'),
  area('mithala-meeting', 'The Meeting of the Arms', 'South Mithala', -1672, -1388, 55, 'Where the west arm and the north braid come together and go on east as one channel. Every drop of water on the plain passes this spot, and Mithala is built round it: the old seat on the high dry ground inside the fork, with the sky tower over the point and the flood gauge at the water’s edge, and the Quays and the Ford across the water from it.'),
  area('south-mithala-plain', 'The Flood Plain', 'South Mithala', -1400, -1290, 110, 'The country between the mountains’ water and the main channel: dark river soil under tall grass, levees a pace and a half high along every channel and backswamps between them that stand under water for weeks of a spring the world cannot yet show.'),
  area('south-mithala-apron', 'The Apron', 'South Mithala', -1500, -1270, 85, 'The Lotharn’s last rise, come out into the plain as two long low swells of older ground. Twelve metres is the whole of it, and on this ground twelve metres is a view in every direction.'),
  area('mountain-march', 'The Mountain March', 'South Mithala', -1750, -1060, 90, 'The plain’s one hard edge, where the flat simply stops and the Lotharn stands up out of it. The farmers’ phrase for the range is "the places where the land went wrong", which is precision and not hostility.'),
  area('south-mithala-east', 'The Lower March', 'South Mithala', -1120, -1320, 80, 'The south-eastern corner, between the main channel and the mountains’ border water, with the sea a few hundred paces further east and the ground down to five metres. The last of the plain before the coast country.'),
  area('round-horizon', 'The Round Horizon', 'West Mithala', -2100, -1490, 120, 'The middle of the upper grass, and the emptiest place in Azhora: the horizon is a line circling the full compass, unbroken except by weather. People who live here read the western horizon for the next three days and have words for it that Standard Mittoli has not needed.'),
  area('west-mithala-arm', 'The West Arm', 'West Mithala', -2050, -1300, 70, 'The longer of the two arms, coming onto the plain along the Celder margin. Small enough to wade at any point, and the reason the west of the plain is grass rather than braid: it has not yet had room to split.'),
  area('west-mithala-fan', 'The Fan', 'West Mithala', -2230, -1300, 55, 'Two short channels leaving the arm on its northern side and giving out on the grass within a few hundred paces. Each is a cut of dark silt with willow along it, running until the ground stops falling and then stopping.'),
  area('west-mithala-north', 'The Upper Grass', 'West Mithala', -2080, -1590, 90, 'Warm-season prairie standing to the waist by midsummer on two metres of black river soil, dead and buff from the first frost to the thaw. Not a tree anywhere out of sight of water.'),
  area('east-mithala-gather', 'Where the Channels Gather', 'East Mithala', -1300, -1490, 90, 'The lowest and wettest ground in the Mithala, where the threads of the main channel come back together for the run to the sea. Rank grass to the knee on silt that is still soft in August.'),
  area('east-mithala-gallery', 'The Gallery', 'East Mithala', -1500, -1500, 70, 'The only wood on the plain: willow, black poplar and alder two and three trees deep along the channel banks, roots in water that freezes every winter and floods every spring. From out on the grass it is a dark line, and it is how you find the river.'),
  area('the-river-mouth', 'The River Mouth', 'East Mithala', -1060, -1480, 55, 'Where the plain ends and the water goes: the channel widens, the levees flatten, the grass turns to sand within forty paces and the sea is there with nothing to announce it.'),
  area('acorwood-horizon', 'The Acorwood Horizon', 'East Mithala', -1150, -1650, 80, 'The north-eastern skyline, where the treeline thickens along the top of the plain until it is a forest. No wall, no cliff and no line: the Acorwood closes off the north of the continent by getting gradually nearer.'),
  area('north-mithala-shelf', 'The Shelf', 'North Mithala', -1700, -1830, 110, 'The last dry ground going north: tall grass on a very slight rise, with the plain falling away south to the braid and north into sedge. Two metres higher than the fen, and it is the difference between grass and rush.'),
  area('the-north-braid', 'The North Braid', 'North Mithala', -1900, -1720, 70, 'The plain’s northern arm, and one of the two channels the lore names: a village here says it is on the North Braid the way anywhere else says which valley it is in, because the channel is the flood timing and the flood timing is everything.'),
  area('north-mithala-fen', 'The Fen Margin', 'North Mithala', -1750, -1960, 100, 'Where the plain stops being plain, over about a hundred and fifty paces and without anything to mark it: the grass shortens, sedge and rush come up through it, the ground softens, and then you are in the Acor Wetlands.'),
  area('acorwood-approach', 'The Approach to the Acorwood', 'North Mithala', -1430, -1870, 70, 'The north-eastern corner, where the wetland margin and the forest margin meet and the plain is squeezed between them. The last hundred paces of grass have young trees standing in them.'),
  // The southwestern block (src/southwest-world.js): four countries in the driest quarter of the
  // continent, where the chart has very little to name because there is very little on the ground.
  // Every area is one landform, one margin or one dry bed, and nothing in any of them is anybody's.
  area('navarth-plateau', 'The Navarth Plateau', 'Navarth', -3330, 1150, 120, 'The high ground of the whole southwest: a worn tableland of pale stone and thin soil, open in every direction, with rounded swells of bare rock standing over sweeps of scrub between them. The lore calls this cold plateau country; the map calls it hot desert at altitude, and what the height buys is a night you can feel and a wind that never stops.'),
  area('navarth-west-rim', 'The Western Rim', 'Navarth', -3480, 1200, 90, 'Where the plateau ends. Four swells in a line along the western edge, and from the top of any of them the ground goes down thirty metres and does not come up again: the Ganesh runs from the foot of this rim to a horizon with nothing on it.'),
  area('navarth-wood', 'The North Wood', 'Navarth', -3300, 910, 62, 'The block’ one hex of forest, at Navarth’ north-eastern tip, where the air turns Mediterranean and the Ibenwood’ southern edge begins. Oak and pine standing well apart on a shoulder falling north-east; two hundred paces south of the last tree it has not rained properly in years.'),
  area('alezhor-water', 'The Alezhor Water', 'Navarth', -3465, 1030, 70, 'A small river running west along the top of Navarth and down the Ganesh’ north-eastern edge to the sea. It rises in the green country over the northern border and gains nothing at all on the way through.'),
  area('pyros-open-plain', 'The Open Plain', 'West Pyros', -2960, 1280, 115, 'The body of West Pyros: semi-arid bunch grass in tussocks with bare pale earth between them, falling south for eight hundred metres with nothing on it but the line of trees along the river to the east.'),
  area('the-vaellir', 'The Vaellir', 'West Pyros', -2880, 1400, 78, 'The great river of the southwest and the second the atlas draws large, after the Lizeem. It grows from a gravel head a traveler wades to a hundred paces of slow green water nobody crosses, and the far bank is East Pyros with no way to it anywhere below the ford.'),
  area('vaellir-ford', 'The Vaellir Ford', 'West Pyros', -3040, 1010, 48, 'The head of the river, shin-deep and quick over gravel: the only place in a day’ walk that either bank can be reached from the other, and there is nothing built at it.'),
  area('pyros-green-tip', 'The Green Tip', 'West Pyros', -2570, 1655, 52, 'One hex of Mediterranean grass at the river’ mouth, where the sea and Marosh’ country begin together, and the only place in the southwest where anything is green because of the weather rather than because of a hollow in the ground.'),
  area('ganesh-floor', 'The Ganesh', 'Ganesh Desert', -3560, 1520, 125, 'The driest country in Azhora: hot desert, flat to gently rolling, with no canyon, no escarpment and nothing at all between a traveler and the horizon. A thin skin of pale sediment over stone, swept to grit on every rise and gathered a hand deep in every pocket, with knee-high scrub spaced wide enough to walk between.'),
  area('ganesh-washes', 'The Washes', 'Ganesh Desert', -3510, 1400, 88, 'Two cut beds crossing the desert east to west with nothing in either of them, floored with coarse gravel, deep enough to stand in out of the wind and walked down the middle as a road. Neither reaches the shore: a bed that runs once in five years does not keep a mouth open.'),
  area('ganesh-damp-reach', 'The Damp Reach', 'Ganesh Desert', -3500, 1594, 46, 'A hundred and twenty metres of the south wash where the water below the gravel comes near enough the surface to keep something alive: grey-green scrub in a dry bed, twice the size of anything within a mile, and nothing at all to drink.'),
  area('ganesh-shore', 'The Gulf Shore', 'Ganesh Desert', -3740, 1250, 66, 'A desert that runs out at the sea. The scrub thins, the sediment turns to sand within forty paces and the water is there, and the ground a hundred paces inland is as dry as the ground twenty miles in.'),
  area('ganesh-plain-channels', 'The Drainage Channels', 'Ganesh Plain', -3010, 1660, 96, 'Shallow cuts crossing the plain, a metre deep and nine across, too diffuse to be called rivers by anybody who has seen one. Two carry water west into the Ganesh in the wet years and one runs the other way to the sea; all of them lie dry in the drought years, which is most of them.'),
  area('ganesh-depressions', 'The Depressions', 'Ganesh Plain', -2890, 1720, 90, 'Shallow closed hollows strung along the channels, a metre below the plain and a hundred and fifty paces across, and every one greener than the ground round it. In a dry year they are the only green there is, and every route across this plain goes from one to the next.'),
  area('ganesh-plain-divide', 'The Divide', 'Ganesh Plain', -2720, 1800, 62, 'The low rise along the eastern side, and a divide a traveler walks over without noticing: west of it every drop goes to the Ganesh and is gone, east of it the ground falls a few hundred paces to the sea. Two metres of rise decide it.'),
  // The four Meroshe deserts: ninety-five hexes of one terrain word and one climate code, charted by
  // what the ground is made of, because that is the only thing that changes across them.
  area('meroshe-hamada', 'The Hamada', 'North Meroshe Desert', -2950, 2110, 112, 'Bare bedrock under a skin of gravel, swept clean and ringing under a boot: the rocky northern transition of the great desert, where the plain’s clay runs out and the stone begins. Flat gravel plains and exposed rock, and the only trees in ninety-five hexes.'),
  area('meroshe-benches', 'The Stone Steps', 'North Meroshe Desert', -3110, 2100, 74, 'Nine low escarpments crossing the hamada north and south, each a metre or two of riser and then a long back slope to the next. They are harder beds outcropping on a dip that runs east off the Dinelv highland, and they are the only direction this country gives.'),
  area('meroshe-thorn', 'The Thorn Ground', 'North Meroshe Desert', -2860, 2020, 62, 'Thorn growing out of the joints in the bedrock, waist-high to head-high, a dozen paces apart where the cracks are close and half a mile apart where they are not. The only thing in the Meroshe tall enough to stand in the shade of.'),
  area('meroshe-dust-line', 'The Dust Line', 'North Meroshe Desert', -2900, 1940, 46, 'Where the Ganesh Plain stops. The pale clay thins over two hundred paces, the grass tufts give out one by one, and then there is stone underfoot and nothing standing anywhere. No ridge, no river, no line on any map.'),
  area('meroshe-green-shoulder', 'The Green Shoulder', 'North Meroshe Desert', -2740, 1945, 40, 'The north-eastern corner, and the one place in the Meroshe a traveler can see green: Marosh’s Mediterranean hills a mile east across the shimmer on the atlas, grass and olive and winter rain, with hot desert underfoot all the way to them. Job 2 wrote that as a promise about unbuilt country and job 4 built it: the ridge stands a hundred and thirty metres east of here now, and the ground underfoot has gone from flat 1.000 dry to 0.922.'),
  area('meroshe-fan-skirt', 'The Fan Skirt', 'West Meroshe Desert', -3590, 2420, 100, 'The apron below the Dinelv escarpment: three cones of gravel spread south-west out of the highland and grown together into one skirt falling to the sea. Cobbles at the heads, pebbles four hundred paces out, dust at the toe, and that sorting is all the water has left behind.'),
  area('meroshe-salt-pan', 'The Malhat', 'West Meroshe Desert', -3500, 2560, 58, 'Three hundred paces of floor so flat it has no features at all, crusted white with salt, ringing under a boot in the dry months and rotten under it in the others. The one place in ninety-five hexes where water can be seen and not drunk.'),
  area('meroshe-dry-shore', 'The Dry Shore', 'West Meroshe Desert', -3700, 2440, 52, 'A desert running out at the open western ocean, with the weather of half a world arriving on it and not a drop of it falling here. Gravel, then sand for forty paces, then surf; a hundred paces inland it is as arid as it is twenty miles in.'),
  area('meroshe-escarpment-foot', 'The Escarpment Foot', 'West Meroshe Desert', -3620, 2350, 46, 'The northern edge of the fan skirt, where the Dinelv plateau stands up out of the desert in stepped bands of rock with its seasonal channels cut down the face as dark lines. The plateau road is somewhere along this foot and is not built.'),
  area('meroshe-sand-sea', 'The Sand Sea', 'Central Meroshe Desert', -3140, 2580, 78, 'The erg, and the only one in Azhora: parallel ridges of clean sand running north-west to south-east on the summer wind’s bearing, seven metres from floor to crest and two hundred and thirty paces apart. From the crest of one the next is the horizon.'),
  area('meroshe-corridors', 'The Corridors', 'Central Meroshe Desert', -2960, 2460, 58, 'The swept gravel floors between the dunes, and the only fast ground in the sand sea. A traveler can walk one at speed for half a mile, north-west or south-east and no other way, because that is the way the ridges go.'),
  area('meroshe-sink', 'The Sink', 'Central Meroshe Desert', -2920, 2520, 60, 'The reason the sand is here: a shallow closed basin three and a half metres below its own rim, with no river edge anywhere on it and no outlet in any direction. Sand that gets into the Meroshe gets into this and does not leave.'),
  area('meroshe-sand-edge', 'The Sand Edge', 'Central Meroshe Desert', -2780, 2610, 46, 'Where the sand sea gives out: the ridges get lower over three hundred paces, then broken, then they are streaks of sand lying on a gravel floor, and the horizon comes back. The only place the erg can be seen as a thing rather than walked in.'),
  area('meroshe-stone-floor', 'The Stone Floor', 'South Meroshe Desert', -2790, 2830, 110, 'The reg: pebbles packed edge to edge over a whole country, flat enough to see twenty miles across and varnished so dark by iron and manganese that it looks wet from a distance. A footprint on it will still be there next year.'),
  area('meroshe-fog-margin', 'The Fog Margin', 'South Meroshe Desert', -2650, 2720, 62, 'Desert that gets wet without being rained on. The fog off the southern ocean and off Trogo’s ridge comes in warm and thick and stands for days, and what it leaves is a crust on the stone, lichen in the lee of every pebble, and the only thorn in the Meroshe standing close enough together to walk round.'),
  area('meroshe-forest-wall', 'The Forest Wall', 'South Meroshe Desert', -2560, 2645, 44, 'The sharpest boundary the atlas draws anywhere: thirteen hex edges of hot desert against tropical rainforest, with Trogo beginning at the next hex east. The canopy is on that horizon now - job 4 built Trogo - and the fog had crossed the line before the forest did.'),
  area('meroshe-south-shore', 'The Southern Shore', 'South Meroshe Desert', -2850, 3020, 48, 'The bottom of the desert and of the continent’s southwest: the stone floor runs south until the pebbles turn to shingle and then to the southern ocean, with the whole Meroshe behind it. The fog comes ashore here first.'),
  // Cape Heth, the Dinelv Highlands and Hama: the block's western edge. The cape is charted by which
  // side of its own ridge a point is on, the plateau by its ridges, gaps, basins and tables, and Hama
  // by one line - the only boundary in the block the atlas draws twice, once in terrain and once in
  // climate, and the only place in the southwest where a traveler can watch a desert end.
  area('heth-point', 'The Point', 'Cape Heth', -4240, 1850, 48, 'The westernmost ground in Azhora and the only `coast` hex the atlas puts inside any country: bare wave-cut sandstone three metres over the water with sea on four of its six sides. The lore says this point is the whole reason the cape matters, and there is nothing whatever on it.'),
  area('heth-spine', 'The Spine', 'Cape Heth', -3955, 1880, 84, 'The cape’s one landform, and the lore calls it exactly that - "the cape’s slight ridge". Six metres at its highest, running the length of the promontory, and it decides everything: the ocean on one hand at a hundred and fifty paces, and the only soil the cape has in the lee on the other.'),
  area('heth-weather-face', 'The Weather Face', 'Cape Heth', -4150, 1892, 66, 'The seaward side, which the lore measures storms by: "the ocean-facing slope is low enough that spray overtops it in the largest winter storms". Bare sandstone with the bedding showing, gravel, salt crust in the hollows of the rock, and lichen in the lee of stones. Hot desert, soaked in sea water twice a decade.'),
  area('heth-hollows', 'The Drainage Hollows', 'Cape Heth', -4040, 1910, 62, 'Five shallow closed hollows on the landward flank, a metre and a half deep, and every scrap of soil on the cape is in one of them. "Gardens on the soil that has accumulated in the drainage hollows" - the hollows are here and the gardens are the cape communities’ and are not built.'),
  area('heth-bight', 'The Heth Bight', 'Cape Heth', -3975, 1722, 58, 'The shallow water in the angle between the cape running west and the mainland shore running away north-east: too shallow for deep-draft vessels, sheltered, and the productive zone for the shallow-water fishing. Flat calm here where the weather face a hundred and fifty paces south has surf on it.'),
  area('dinelv-plateau', 'The Dinelv Plateau', 'Dinelv Highlands', -3420, 1900, 104, 'The first desert highland in the game and the high ground of the whole southwest: a rolling arid upland at a hundred metres and more, hot desert on every one of its thirty-five hexes, thin soil over bedded rock and scrub spaced so wide that the ground between it is what a traveler remembers.'),
  area('dinelv-escarpment', 'The Escarpment', 'Dinelv Highlands', -3800, 2080, 86, 'Eighty metres of exposed sedimentary rock in stepped bands - warm-toned stone low on the face and a harder darker stone above it - cut by seasonal channels that stand as dark lines down it. On the south-western corner there is no face and no coastal strip at all: the plateau stands straight over the open ocean.'),
  area('dinelv-ridges', 'The Ridge Systems', 'Dinelv Highlands', -3340, 2020, 80, 'Six ridge systems crossing the plateau from roughly north to south, aligned with the peninsula’s long axis, ten to fifteen metres of crest with a broad swale between each pair. Crossing along the grain is four hundred paces of open swale; crossing against it is every rib in turn.'),
  area('dinelv-north-pass', 'The North Pass', 'Dinelv Highlands', -3300, 1844, 52, 'The one place a loaded animal can be walked onto this plateau: a graded ramp up the northern face at a walking grade the whole way, four hundred paces long, with the bedding still showing in the rock on both sides. No road surface, no cutting, no cistern and no garrison.'),
  area('dinelv-middle-saddle', 'The Middle Saddle', 'Dinelv Highlands', -3640, 1975, 62, 'A gap through one ridge, and the lore’s own second crossing: "used by lighter traffic: express riders, small trading parties, and the livestock movements that the highland pastoral communities manage seasonally". The crest stands ten metres over it on either hand.'),
  area('dinelv-massifs', 'The Tables', 'Dinelv Highlands', -3500, 1975, 96, 'Three flat-topped blocks standing sixty and seventy metres over the plateau with sides too steep to walk, and the only three hot-desert `mountain` hexes on the whole atlas. Not peaks: what is left of a higher and older plateau surface, with the same courses in their flanks as the escarpment face.'),
  area('dinelv-basins', 'The Water Points', 'Dinelv Highlands', -3410, 1985, 78, 'Four closed hollows in the plateau, six or seven metres below the ridges round them, with no outlet from any of them - and on an arid upland a hollow with no outlet is the only place water goes. "The deeper-rooted plants occupying the water-concentration points." The scrub in these is twice the size of the scrub outside them.'),
  area('hama-green-line', 'The Line', 'Hama', -3240, 2900, 86, 'Where the desert stops. Over about two hundred paces the sward breaks into tussocks, the tussocks stand further apart, the soil thins to grit, and then there is gravel underfoot and the Meroshe beyond. The atlas draws this line twice - nine `Csb` grassland hexes against ten `BWh` plains ones, with no hex where the two fields disagree.'),
  area('hama-grass', 'The Seaward Grass', 'Hama', -3170, 2960, 76, 'Two hexes of real Mediterranean country at the bottom corner of the continent: winter-rain grass thick enough to walk through, low evergreen scrub in the hollows, a few trees leaning inland off the sea wind. The first ground in this block since the Vaellir’s mouth that is green because of the weather.'),
  area('hama-broken-ground', 'The Broken Ground', 'Hama', -3010, 2890, 84, 'The inland half: stony ribs a pace or two high on two crossing grains with coarse gravel between them, over ten hexes of hot desert. "Rough without being impassable - enough friction to make overland access from the desert difficult for large-scale military movement." It is why Marosh has never garrisoned Hama.'),
  area('hama-corner', 'The Corner', 'Hama', -3365, 2900, 58, 'The bottom-left corner of the continent, where the western ocean and the southern ocean meet and the water runs away north on one hand and east on the other. The grass comes down to within thirty paces of the water, which no other shore in the southwest does. Hama Harbour is somewhere here and is not built.'),
  area('hama-winter-beds', 'The Winter Beds', 'Hama', -3420, 2770, 60, 'Three shallow beds running off the stony rise, across the grass and into the two seas, and all three are dry: the rain here comes in winter and the atlas draws no river edge on any of Hama’s nineteen hexes. A metre and a half of soft-banked cut with the greenest grass in the southwest in the floor of it, and nothing to drink.'),
  // Marosh and Trogo: the block's eastern edge. Marosh is charted by which side of its one ridge a
  // point is on, and Trogo by which of the three kinds of way through it is nearest - because in a
  // country a traveler cannot see across, the chart is the only thing that says what is over there.
  area('marosh-ridge', 'The Marosh Ridge', 'Marosh', -2650, 2367, 90, 'The wall the Meroshe stands behind: eight `hills` hexes one hex wide, every one `Csb` where the rest of the country is `Csa`, every one touching the desert and none of them touching the sea. Seventy-four metres of base with fifteen of crest on it, holm oak and maquis over grey limestone, and the sand sea begins on the far side of it.'),
  area('marosh-water-gap', 'The Water Gap', 'Marosh', -2716, 2152, 66, 'The one break in the ridge, and the atlas found it: the only three river edges the map draws on this coast meet at the corner beside the crest\u2019s own elbow. Eleven metres of notch in fifteen of crest, with the Nahr in the bottom of it. The caravan road crosses here and none of it is built.'),
  area('marosh-water', 'The Nahr', 'Marosh', -2650, 2205, 54, 'The only river the atlas draws on the eastern face of the peninsula, and the first water it draws inside a southwestern country rather than along its border. Three `small` edges out of the water gap to the Iberos in a hundred and seventy metres, waded anywhere. `nahr` is the Maroshi for river.'),
  area('marosh-terrace', 'The Seaward Terrace', 'Marosh', -2550, 2367, 72, 'The seaward half: ten `grassland` hexes that are all `Csa`, the hot-summer form. Winter-rain grass with bare earth between the tufts by the end of a dry summer, aromatic scrub in the low places, and twenty hex edges of open water below it. This is what the Meroshe would be without the ridge.'),
  area('marosh-shore', 'The Iberos Shore', 'Marosh', -2465, 2020, 60, 'The sheltered side of the peninsula, and the only shore in the block not exposed to an open ocean. The grass comes within forty paces of the water with turf and shingle for the last of it. Dinelv the capital is somewhere on this coast and is not built.'),
  area('marosh-dry-side', 'The Dry Side', 'Marosh', -2742, 2194, 56, 'The western foot of the ridge, where the oak stops. Seventeen of Marosh\u2019s eighteen desert edges are on these eight hexes, and the aridity field crosses almost its whole range over them: `Csb` on this side of the crest and `BWh` one hex over.'),
  area('trogo-forest', 'The Trogo Forest', 'Trogo', -2300, 2900, 110, 'The first rainforest in the game: twenty-two `deep_forest` hexes, `Af` on every one, and hot desert one hex west. Emergents over a closed canopy over tree-fern and palm over leaf litter, buttress roots a metre high, and a haze that hides a traveler at a hundred and twenty paces. Nothing can be seen far in it and nothing walked straight through it.'),
  area('trogo-fog-ridge', 'The Fog Ridge', 'Trogo', -2424, 2840, 88, 'The crest, laid along the seven hexes the atlas puts against the South Meroshe, and the reason the country exists: "a ridgeline that catches the southern moisture and drops a fog wall on its windward face while the leeward side stays desert". On top of it the lore\u2019s cloud forest - mosses and cloud-dependent plants, standing in fog that does not lift.'),
  area('trogoreth', 'The Trogoreth', 'Trogo', -2170, 2990, 66, 'The only permanent water in the rainforest, and the lore\u2019s own name for it. Four `small` atlas edges out of the canopy and across the coastal grass into the southern ocean, waded anywhere on purpose: this country already has one movement rule and a walled river would be a second barrier crossing the first. The first of the three ways through.'),
  area('trogo-animal-paths', 'The Animal Paths', 'Trogo', -2290, 2778, 62, 'Five worn lines through a country with no roads: one along the crest, two rungs across the middle, one inside the north-eastern shore and one along the southern forest edge. Four and a half metres of trodden ground with a wall of fern down both sides. What they do is join the gullies and the river to each other.'),
  area('trogo-clearings', 'The Dry Corridors', 'Trogo', -2418, 2662, 62, '"Gaps in the ridge where the desert air pushes through in the dry months, creating corridors of sparse growth cutting into the forest." Three of the five are exactly that, on the crest where the Meroshe\u2019s air comes over and the canopy does not close; the other two are treefall gaps. Light, grass and a sky, in a country with none of those anywhere else.'),
  area('trogo-thicket', 'The Thicket', 'Trogo', -2250, 2830, 58, 'The four fifths of the canopy a traveler cannot go into: understory to the chest, rattan, tree-fern, buttress and litter, a metre of visibility and no line of sight to steer by. It is not a wall and there is nothing solid in it - the thicket carries no collider at all - it is ground that will not be pushed into, and anybody already in it can always walk out.'),
  area('trogo-forest-edge', 'The Forest Edge', 'Trogo', -2320, 3105, 76, 'Where the forest stops. Seven `grassland` hexes that are all `Csa` against twenty-two `deep_forest` hexes that are all `Af`, and the atlas puts every one of the seven on the exposed southern shore while taking the canopy to the water on the sheltered north-eastern one. Salt-pruned tussock and low scrub, with a wall of canopy thirty metres high behind it.'),
  area('trogo-estuary', 'The Estuary', 'Trogo', -2130, 3010, 58, 'The Trogoreth\u2019s mouth, and the one place in the southwest where a forest reaches the sea: "root systems that make the river mouths look solid but are not". Prop-rooted trees down to the tideline with the water between them, and the same again on the sheltered north-eastern shore. The fishing communities and the small anchorages are theirs and are not built.'),
  // Selemis: the island across the channel from the Ascarth tip (src/selemis-world.js). Charted by
  // which part of the crescent a point is on - the bay and the hollow behind it, either head, or the
  // hills along its back. Two of the names are the Selemi tongue's own words, a harbour and a crossing.
  // They stand here, after Trogo's and before Peblos's, and not at the end of the list: the list ends
  // with West Izol's and the Ibenwood's, and tests/ibenwood-metadata.test.js holds that nothing but
  // the Ibenwood follows `long-pasture`.
  area('selemis-seloca', 'The Seloca', 'Selemi', -791, 2438, 50, 'The bay in the hollow of the crescent and the ground behind it: a strand of sand round three sides of sheltered water, tamarisk along the back of it, and a hollow of greener ground climbing away to the hills. Across the water stand the cliffs of the Ascarth tip. Seloca is the Selemi word for a harbour.'),
  area('selemis-west-head', 'The West Head', 'Selemi', -850, 2362, 45, 'The western end of the strand: a stony crown with gulls on it and cliffs on every side but the bay’s. Under its northern face runs the Nocveth - the Selemi word for a crossing - sixty metres of deep water with the peninsula’s cliffs on the far side.'),
  area('selemis-east-head', 'The East Head', 'Selemi', -690, 2470, 55, 'The eastern end of the strand and the island’s tail beyond it: a lower stony crown over the bay’s eastern gate, cliffs facing the open Iberos, and dolphins in the lane off the shore.'),
  area('selemis-interior-hills', 'The Interior Hills', 'Selemi', -832, 2504, 70, 'Three grass hills along the island’s back, the middle one the highest ground on it. Pale stone through thin soil on their tops, pines leaning in their lee, and behind them the south cliffs: thirteen metres of pale stone down to the open sea, with sea-plungers working the water off it.'),
  // Telemonia, stage 1 (src/telemonia-world.js): charted by what the ground is - the plain, the rock in
  // its middle, the western rim with the Rothkar on it, the pass the bands' road goes by, and the one wood.
  // After Selemis's and before Peblos's, for the reason Selemis's are: tests/ibenwood-metadata.test.js
  // holds that nothing but the Ibenwood follows `long-pasture` at the end of this list.
  area('telemonia-galmeth', 'The Galmeth', 'Telemonia', -2030, 1290, 95, 'The plain: one enclosed, raised and level plain inside the rim, thirty metres up, with three dry washes across it that come together at the head of the east pass and leave by it. The translators give the word simply as "the plain". Farmed to its edges in barley and pulses by the field people, whose huts stand in rows at the terraces’ foot; the kingdom’s cattle and horses graze its margins by the passes.'),
  area('telemonia-kethorn', 'Kethorn', 'Telemonia', -2100, 1241, 55, 'A rock in the middle of the Galmeth with cliff on three sides and a wall closing the fourth: the spur that comes down off its south-western end, with one gate in the wall across its head. The only walled place in the country, and its one town: the halls of the bands, the granaries and the cisterns, and at the far end of the one street the hall of the king. No outsider has been inside it.'),
  area('telemonia-west-rim', 'The Rothkar', 'Telemonia', -2290, 1300, 80, 'The western rim, two hexes thick on the East Pyros side: ridge behind ridge running north-east to south-west, cliff bands, narrow valleys that end against the next ridge, and the Rothkar - the highest rock of the rim, where Tormon is said to sit. No pass crosses it.'),
  area('telemonia-tarnel', 'The Tarnel', 'Telemonia', -2160, 1070, 55, 'The pass north through the rim where it is thinnest, from the Galmeth up to a col and down to the Oves Desert’s southern route, which the bands keep in every season. The Caelin rises at its foot.'),
  area('telemonia-belketh', 'The Belketh', 'Telemonia', -1875, 1371, 60, '"The wooded edge": evergreen oak with pine on its ledges, the only wood in Telemonia, in the south-eastern corner where the hills catch the sea’s weather.'),
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
  // Append new chart areas: existing discovery ids and ordering belong to saved charts.
  ...IBENWOOD_GROVES.map(grove => area(grove.id, grove.name, grove.region, grove.x, grove.z, grove.radius,
    grove.kind === 'royal' ? 'The reserved royal clearing in the heart of Elfland, surrounded by substantial ancient forest.'
      : 'An elven grove among ancient living trees, with dwellings among roots, branches and old stone. Living trees are protected.')),
  area('ibenwood-pilot-grove', 'East Ibenwood Grove', 'East Ibenwood', IBENWOOD_PILOT.x, IBENWOOD_PILOT.z, IBENWOOD_PILOT.radius,
    'The established elven grove in East Ibenwood, with root dwellings and inhabited boughs. Living trees are protected; fallen wood may be gathered.'),
  // Central arrival is already inside High Bough Grove: give that ground one name.
  ...Object.entries(IBENWOOD_ARRIVALS).filter(([region, point]) => !IBENWOOD_GROVES.some(grove => grove.region === region
    && Math.hypot(grove.x - point.x, grove.z - point.z) <= grove.radius)).map(([region, point]) =>
    area(`ibenwood-${region.split(' ')[0].toLowerCase()}-arrival`, `${region} Woodland`, region, point.x, point.z, 38,
      'A woodland approach among old trees and forest paths. The outer forest leads toward the ancient inner belt of Elfland.')),
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
  const cells = new Set(), glimpsed = new Set(), found = [];

  function glimpseAround(q, r) {
    glimpsed.delete(`${q},${r}`);
    const fresh = [];
    for (const [dq, dr] of HEX_NEIGHBOURS) {
      const key = `${q + dq},${r + dr}`;
      if (!cells.has(key) && !glimpsed.has(key)) { glimpsed.add(key); fresh.push(key); }
    }
    return fresh;
  }

  /** Chart the ground about a point. Returns what was new. */
  function reveal(x, z) {
    if (!Number.isFinite(x) || !Number.isFinite(z)) return { cells: [], glimpsed: [], subregions: [] };
    const home = hexAt(x, z), key = `${home.q},${home.r}`, newCells = [];
    if (!cells.has(key)) { cells.add(key); newCells.push(key); }
    const newGlimpses = newCells.length ? glimpseAround(home.q, home.r) : [];
    const newAreas = [];
    for (const item of subregionsAt(x, z)) {
      if (found.includes(item.id) || !chartKnowsPoint(cells, item.x, item.z)) continue;
      found.push(item.id); newAreas.push(item.id);
      onEvent({ type: 'subregion-found', id: item.id, name: item.name, region: item.region, note: item.note });
    }
    if (newCells.length) onEvent({ type: 'chart-widened', cells: newCells.length });
    return { cells: newCells, glimpsed: newGlimpses, subregions: newAreas };
  }

  const knows = (q, r) => cells.has(`${q},${r}`);
  const knowsPoint = (x, z) => chartKnowsPoint(cells, x, z);

  /** The chart for the journal: every named area, and whether it has been found. */
  function view() {
    // A legacy named area can straddle the edge of a visited hex. Keep its saved discovery,
    // but do not print its detailed location until the hex containing it has been entered.
    const detailed = found.map(id => byId.get(id)).filter(item => knowsPoint(item.x, item.z));
    return {
      cells: [...cells], glimpsed: [...glimpsed], cellCount: cells.size,
      subregions: SUBREGIONS.map(item => ({ ...item, known: found.includes(item.id) && knowsPoint(item.x, item.z) })),
      found: detailed, foundCount: detailed.length, total: SUBREGIONS.length,
    };
  }

  function snapshot() { return { version: MAP_FOG_VERSION, cells: [...cells], subregions: [...found] }; }

  function restore(data) {
    cells.clear(); glimpsed.clear(); found.length = 0;
    if (!validateMapFogSnapshot(data, { allowMissing: false })) return false;
    for (const key of data.cells) cells.add(key);
    // Glimpses are derived, never saved or counted as walking. Every old saved cell remains
    // confirmed, including a deliberate developer reveal; nothing migrates into extra visits.
    for (const key of cells) glimpseAround(...key.split(',').map(Number));
    for (const id of data.subregions) found.push(id);
    return true;
  }

  return { reveal, knows, knowsPoint, view, snapshot, restore,
    get cells() { return [...cells]; }, get glimpsed() { return [...glimpsed]; }, get found() { return [...found]; } };
}

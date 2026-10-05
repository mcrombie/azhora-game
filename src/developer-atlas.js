/** Developer destinations on the authored atlas. Normal journal mapping stays read-only. */
import { regionDesign, levelInfo, provisionalLevel, terrainCounts } from './campaign-world.js';
import { OUTER_PROFILES } from './outer-regions-data.js';
import { outerProfile } from './outer-regions-world.js';
import { REGION_IDS, TRANSFORM } from './region-world.js';

export const DEV_ATLAS_SIZE = Object.freeze({ width: 3062.266, height: 4088 });
export const DEV_ATLAS_PROVENANCE = Object.freeze({
  source: '../../world-builder/map/resources/examples/azhora.wwmap',
  sha256: 'b36c32babaf85213a93459c87eeabe79455268db714681f88444831a221588df',
  localityNote: 'The four playable regions are the authored Drent, Luscia, Moros Plain and East Suval hexes at 56 m per hex. Tidehaven\u2019s exact place on the Drent coast is still provisional; the local route diagram is not to world-map scale.',
  capeNote: 'Cape Thalmagar is an authored region northwest of the Oremindi. The fortress and surrounding dark wasteland are a new gameplay prototype within that region.',
  surveyNote: 'Terrain survey · gameplay not built. Terrain categories and region outlines come from World Builder; elevation and scenery are illustrative.',
});

const point = (x, y, q, r) => Object.freeze({ x, y, u: x / DEV_ATLAS_SIZE.width, v: y / DEV_ATLAS_SIZE.height, q, r });
// This authored Drent land hex faces the sea to its east. It is a provisional
// locality anchor, NOT a surveyed location for Tidehaven or a claim that a
// 700 m path crosses the whole of Drent.
const drentAnchor = point(1870.615, 2560, 14, 106);
const lusciaAnchor = point(1679.6, 2636.2, 7, 109);
const morosAnchor = point(1598.8, 2717.9, 1, 112);
const suvalAnchor = point(1825.4, 2748.9, 11, 113);
const westSuvalAnchor = point(1732.05, 2800, 4, 116);
const puethAnchor = point(1773.62, 2440, 13, 101);
const peblosAnchor = point(1981.47, 2656, 16, 110);
const westIzolAnchor = point(1929.999, 3072, 5, 127);
const elagosAnchor = point(1510.348, 2608, 0, 108);
// An Amod hill hex in the middle of the terrace country, west of the Pueth border.
const amodAnchor = point(1607.342, 2392, 8, 99);
// The middle of the Vastos tableland, west of the lake country.
const vastosAnchor = point(1468.778, 2488, 1, 103);
// A Meneth hex in the middle of the ridge country, west of the Vastos plain.
const menethAnchor = point(1385.64, 2536, -3, 105);
// A Caricas hex on the corridor's western side, below the eastern shelf.
const caricasAnchor = point(1330.222, 2632, -7, 109);
// A Nesdor plains hex out on the Flats, west of the Moros Plain.
const nesdorAnchor = point(1441.066, 2728, -5, 113);
// An Eer plains hex on the humid inland half, south of the Moros and east of the Lizeem.
const eerAnchor = point(1524.198, 2824, -4, 117);
// An Isareos grassland hex in the middle of the hill country, west of the Lizeem's head.
const isareosAnchor = point(1150.081, 2560, -12, 106);
// A Nethereum grassland hex on the floor of the hollow, south-west of the Lizeem's head.
// x = 27.7128 * (q + r/2) + 13.856 and y = 24 * r + 16, which for (-14, 110) is this hex
// and no other: a test asserts the anchor stands on the country's own authored ground.
const nethereumAnchor = point(1150.081, 2656, -14, 110);
// The Imlamdris hex on the Stillwater's north-east shore: grassland, and the city's own ground.
// For (7, 119) the atlas's formula gives this point and no other.
const southSuvalAnchor = point(1856.757, 2872, 7, 119);
// Kemrath's hex in the East Lotharn: hills, the valley floor the pass comes up onto. For (7, 96)
// the atlas's formula gives this point and no other.
const iscareAnchor = point(1690.482,2872,1,119);
const eastLotharnAnchor = point(1538.060, 2320, 7, 96);
// The barrier-hill hex the Feradom road comes through from Pueth, the road pass's.
const feradomAnchor = point(1745.907, 2392, 13, 99);
// A Gala plains hex on the steppe rows, where the travel button puts the traveler: for (-9, 118)
// the atlas's formula gives this point and no other.
const galaAnchor = point(1399.496, 2848, -9, 118);
// The north hill's hex in Northern Ascarth, hills, the highland interior. For (-9, 123) the atlas's
// formula gives this point and no other.
const northernAscarthAnchor = point(1468.778, 2968, -9, 123);
// A grassland hex in the middle of Southern Ascarth's finger, (-6, 129).
const southernAscarthAnchor = point(1635.055, 3112, -6, 129);
// An Ovesos plains hex in the middle of the country, on the southern rows above the Sorten: for
// (-9, 114) the atlas's formula gives this point and no other.
const ovesosAnchor = point(1344.070, 2752, -9, 114);
// An Oves Desert plains hex in the middle of the wedge, clear of the rim and of the Oveth: (-13, 116).
const ovesDesertAnchor = point(1260.932, 2800, -13, 116);
// A West Lotharn hills hex on the long valley's floor, in the middle of the country and clear of
// every border: (0, 98). For it the atlas's formula gives this point and no other.
const westLotharnAnchor = point(1371.783, 2368, 0, 98);
// The four Mithala countries, one middle hex each, clear of every border and of every channel.
// For each pair the atlas's formula (x = 27.7128 * (q + r/2) + 13.856, y = 24r + 16) gives this
// point and no other: South Mithala's plains (8, 91) on the flood plain between the apron and the
// main channel, West Mithala's grassland (2, 89) in the middle of the upper grass, East Mithala's
// grassland (9, 88) on the gather, and North Mithala's plains (8, 85) on the dry shelf.
const southMithalaAnchor = point(1496.491, 2200, 8, 91);
const westMithalaAnchor = point(1302.501, 2152, 2, 89);
const eastMithalaAnchor = point(1482.634, 2128, 9, 88);
const northMithalaAnchor = point(1413.352, 2056, 8, 85);
// The four southwestern countries, one middle hex each, clear of every border, every rim and every
// dry bed. For each pair the atlas's formula (x = 27.7128 * (q + r/2) + 13.856, y = 24r + 16) gives
// this point and no other: Navarth's plains (-26, 119) on the open sweep between the western rim and
// the eastern swells, West Pyros's plains (-22, 120) on the open plain a hundred metres off the
// Vaellir, the Ganesh Desert's plains (-30, 123) in the middle of the floor between the two washes,
// and the Ganesh Plain's plains (-25, 125) between the upper and middle channels.
const navarthAnchor = point(942.235, 2872, -26, 119);
const westPyrosAnchor = point(1066.942, 2896, -22, 120);
const ganeshDesertAnchor = point(886.809, 2968, -30, 123);
const ganeshPlainAnchor = point(1053.086, 3016, -25, 125);
// The four Meroshe deserts, one middle hex each, clear of every border, every bench riser, every
// dune crest and the salt pan. Same formula: the North Meroshe's plains (-27, 130) on the open rock
// floor between two benches, the West Meroshe's plains (-35, 134) on the middle of the fan skirt and
// well clear of the Malhat, the Central Meroshe's plains (-30, 134) on an interdune corridor in the
// sand sea, and the South Meroshe's plains (-29, 138) in the middle of the stone floor.
const northMerosheAnchor = point(1066.942, 3136, -27, 130);
const westMerosheAnchor = point(900.666, 3232, -35, 134);
const centralMerosheAnchor = point(1039.230, 3232, -30, 134);
const southMerosheAnchor = point(1122.368, 3328, -29, 138);
// Cape Heth, the Dinelv Highlands and Hama, one middle hex each. Same formula, and each one had to
// dodge something new: Cape Heth's plains (-36, 127) on the middle of the cape, clear of the point,
// the weather face and every drainage hollow; the Dinelv Highlands' hills (-31, 129) on the inner
// ridge's crest, clear of all three mesas, all four basins and the escarpment on every side; and
// Hama's grassland (-35, 139) in the middle of the seaward sward, clear of the winter beds and of the
// line itself, because an anchor that landed on the line would be a point about which nothing is true.
const capeHethAnchor = point(775.959, 3064, -36, 127);
const dinelvAnchor = point(942.236, 3112, -31, 129);
const hamaAnchor = point(969.948, 3352, -35, 139);
// Marosh and Trogo, one middle hex each. Marosh's anchor is deliberately a `hills` hex - (-26, 133),
// the middle of the crest, clear of the water gap and of all four combes - because the ridge is what
// this country is and a point on the terrace would say nothing about it. Trogo's is (-26, 140), a
// `deep_forest` hex in the middle of the canopy, thirty-four metres clear of the nearest gully and
// two hundred from the crest: **it is the one anchor in the game that stands in ground a traveler
// cannot walk to**, which is the point of the country.
const maroshAnchor = point(1136.225, 3208, -26, 133);
const trogoAnchor = point(1233.220, 3376, -26, 140);
// Selemis's middle hex, (-8, 134): `grassland` like the other seven, and the one the hollow behind the
// harbour and the high hill share. For (-8, 134) the atlas's formula gives this point and no other.
const selemisAnchor = point(1648.912, 3232, -8, 134);
// A Galmeth plains hex, (-13, 120), where the travel button puts the traveler: on the plain north-east of
// Kethorn's rock. For (-13, 120) the atlas's formula gives this point and no other.
const telemoniaAnchor = point(1316.358, 2896, -13, 120);
const capeAnchor = point(1025.374, 1864, -2, 77);
// The four playable regions sit on their own authored hexes now: Drent's coast,
// Luscia across the Caloss, the Moros Plain west of it and East Suval to the south.
const local = (region, name, travelTarget, insetY, regionId, atlas) => Object.freeze({
  id: `region-${region}`, name, region, regionId, scene: 'playable-world',
  travelTarget, atlas, placement: 'authored-region',
  inset: Object.freeze({ x: 50, y: insetY }), status: 'Playable local region',
});
// The schematic spaces however many playable regions there are evenly down its line.
const LOCALS = [
  [1, 'Drent', 'drent', 'Drent', drentAnchor],
  [2, 'Luscia', 'luscia', 'Luscia', lusciaAnchor],
  [3, 'Moros Plain', 'moros', 'Moros Plain', morosAnchor],
  [4, 'East Suval', 'suval', 'East Suval', suvalAnchor],
  [5, 'West Suval', 'west-suval', 'West Suval', westSuvalAnchor],
  [6, 'Pueth', 'pueth', 'Pueth', puethAnchor],
  [7, 'Peblos', 'peblos', 'Peblos', peblosAnchor],
  [8, 'West Izol', 'west-izol', 'West Izol', westIzolAnchor],
  [9, 'Elagos', 'elagos', 'Elagos', elagosAnchor],
  [10, 'Amod', 'amod', 'Amod', amodAnchor],
  [11, 'Vastos', 'vastos', 'Vastos', vastosAnchor],
  [12, 'Meneth', 'meneth', 'Meneth', menethAnchor],
  [13, 'Caricas', 'caricas', 'Caricas', caricasAnchor],
  [14, 'Nesdor', 'nesdor', 'Nesdor', nesdorAnchor],
  [15, 'Eer', 'eer', 'Eer', eerAnchor],
  [16, 'Isareos', 'isareos', 'Isareos', isareosAnchor],
  [17, 'Nethereum', 'nethereum', 'Nethereum', nethereumAnchor],
  [18, 'South Suval', 'south-suval', 'South Suval', southSuvalAnchor],
  [19, 'Iscare', 'iscare', 'Iscare Archipeligo', iscareAnchor],
  [20, 'East Lotharn', 'east-lotharn', 'East Lotharn Mountains', eastLotharnAnchor],
  [21, 'Feradom', 'feradom', 'Feradom', feradomAnchor],
  [22, 'Gala', 'gala', 'Gala', galaAnchor],
  [23, 'Northern Ascarth', 'northern-ascarth', 'Northern Ascarth', northernAscarthAnchor],
  [24, 'Southern Ascarth', 'southern-ascarth', 'Southern Ascarth', southernAscarthAnchor],
  [25, 'Ovesos', 'ovesos', 'Ovesos', ovesosAnchor],
  [26, 'Oves Desert', 'oves-desert', 'Oves Desert', ovesDesertAnchor],
  [27, 'West Lotharn', 'west-lotharn', 'West Lotharn Mountains', westLotharnAnchor],
  [28, 'South Mithala', 'south-mithala', 'South Mithala', southMithalaAnchor],
  [29, 'West Mithala', 'west-mithala', 'West Mithala', westMithalaAnchor],
  [30, 'East Mithala', 'east-mithala', 'East Mithala', eastMithalaAnchor],
  [31, 'North Mithala', 'north-mithala', 'North Mithala', northMithalaAnchor],
  [32, 'East Ibenwood', 'east-ibenwood', 'East Ibenwood', point(1011.516265, 2656, -19, 110)],
  [33, 'North Ibenwood', 'north-ibenwood', 'North Ibenwood', point(886.808607, 2536, -21, 105)],
  [34, 'South Ibenwood', 'south-ibenwood', 'South Ibenwood', point(886.808607, 2728, -25, 113)],
  [35, 'West Ibenwood', 'west-ibenwood', 'West Ibenwood', point(748.244542, 2680, -29, 111)],
  [36, 'Central Ibenwood', 'central-ibenwood', 'Central Ibenwood', point(900.665013, 2656, -23, 110)],
  [37, 'South Oremindi', 'south-oremindi', 'South Oremindi Mountains', point(900.666, 2464, -19, 102)],
  [38, 'Yunethre', 'yunethre', 'Yunethre', point(1039.23, 2464, -14, 102)],
  [39, 'Navarth', 'navarth', 'Navarth', navarthAnchor],
  [40, 'West Pyros', 'west-pyros', 'West Pyros', westPyrosAnchor],
  [41, 'Ganesh Desert', 'ganesh-desert', 'Ganesh Desert', ganeshDesertAnchor],
  [42, 'Ganesh Plain', 'ganesh-plain', 'Ganesh Plain', ganeshPlainAnchor],
  [43, 'North Meroshe', 'north-meroshe', 'North Meroshe Desert', northMerosheAnchor],
  [44, 'West Meroshe', 'west-meroshe', 'West Meroshe Desert', westMerosheAnchor],
  [45, 'Central Meroshe', 'central-meroshe', 'Central Meroshe Desert', centralMerosheAnchor],
  [46, 'South Meroshe', 'south-meroshe', 'South Meroshe Desert', southMerosheAnchor],
  [47, 'Cape Heth', 'cape-heth', 'Cape Heth', capeHethAnchor],
  [48, 'Dinelv Highlands', 'dinelv', 'Dinelv Highlands', dinelvAnchor],
  [49, 'Hama', 'hama', 'Hama', hamaAnchor],
  [50, 'Marosh', 'marosh', 'Marosh', maroshAnchor],
  [51, 'Trogo', 'trogo', 'Trogo', trogoAnchor],
  // The two mountain gates share the same arrival hexes as the playable regions.
  [52, 'West Baldro', 'west-baldro', 'West Baldro Mountains', point(2230.881, 1648, 46, 68)],
  [53, 'East Baldro', 'east-baldro', 'East Baldro Mountains', point(2397.158, 1696, 51, 70)],
  // Its number is read, not written: another branch has taken the next ids on main, so this island's
  // will change the day it lands, and the one place that says what it is is `REGION_IDS`.
  [REGION_IDS.Selemi, 'Selemis', 'selemis', 'Selemi', selemisAnchor],
  // Telemonia's number is read, not written, for the same reason: it is renumbered the day it lands.
  [REGION_IDS.Telemonia, 'Telemonia', 'telemonia', 'Telemonia', telemoniaAnchor],
  [56, 'West Oremindi', 'west-oremindi', 'West Oremindi Mountains', point(831.384,2320,-18,96)],
  [57, 'East Pyros', 'east-pyros', 'East Pyros', point(1090.499,2860.961,-20,118)],
  [58, 'Nether Desert', 'nether-desert', 'Nether Desert', point(1082.463,2744.290,-18,114)],
  [59, 'Legemum', 'legemum', 'Legemum', point(1324.673,2977.355,-14,123)],
  [60, 'Babon', 'babon', 'Babon', point(1504.806,3327.368,-15,138)],
  [61, 'South Celder', 'south-celder', 'South Celder', point(1191.651,2344.000,-6,97)],
  [62, 'North Celder', 'north-celder', 'North Celder', point(1177.795,2224.000,-4,92)],
  [63, 'East Izol', 'east-izol', 'East Izol', point(2050.748,3016.000,11,125)],
  [64, 'Alezhor', 'alezhor', 'Alezhor', point(734.390,2800.000,-32,116)],
  [65, 'East Oremindi Mountains', 'east-oremindi', 'East Oremindi Mountains', point(1066.943,2320,-10,96)],
  [66, 'North Oreminidi Mountains', 'north-oremindi', 'North Oreminidi Mountains', point(1108.513,2104,-4,87)],
  [67, 'Lesser Oremindi Mountains', 'lesser-oremindi', 'Lesser Oremindi Mountains', point(1177.795,2032,0,84)],
  [68, 'Cudon', 'cudon', 'Cudon', point(1011.518,1936,-4,80)],
  [69, 'Narcosh', 'narcosh', 'Narcosh', point(1233.22,1984,3,82)],
  [70, "Cape Thalmagar", 'thalmagar-coast', "Cape Thalmagar", point(1011.518,1888,-3,78)],
  [71, "Acor Wetlands", 'acor-wetlands', "Acor Wetlands", point(1316.359,1936,7,80)],
  [72, "West Acorwood", 'west-acorwood', "West Acorwood", point(1482.635,1936,13,80)],
  [73, "South Acordwood", 'south-acordwood', "South Acordwood", point(1648.912,2032,17,84)],
  [74, "North Acorwood", 'north-acorwood', "North Acorwood", point(1635.056,1864,20,77)],
  [75, "East Acordwood", 'east-acordwood', "East Acordwood", point(1773.62,1912,24,79)],
  [76, "South Endevor", 'south-endevor', "South Endevor", point(1399.497,1792,13,74)],
  [77, "West Endevor", 'west-endevor', "West Endevor", point(1260.933,1744,9,72)],
  [78, "North Endevor", 'north-endevor', "North Endevor", point(1385.641,1672,15,69)],
  [79, "East Endevor", 'east-endevor', "East Endevor", point(1551.918,1720,20,71)],
  ...OUTER_PROFILES.map(p=>{const c=outerProfile(p.name).anchor,a=TRANSFORM.worldToAtlas(c.x,c.z);return [p.id,p.name,'outer-'+p.id,p.name,point(a.x,a.y,c.q,c.r)];}),
  [114, 'South Ibenal', 'south-ibenal', 'South Ibenal', point(623.538,2656.000,-33,110)],
  [115, 'North Ibenal', 'north-ibenal', 'North Ibenal', point(748.246,2488.000,-25,103)],
  [116, 'Henborth', 'henborth', 'Henborth', point(1205.507,2080.000,0,86)],
  [117, 'Urubond', 'urubond', 'Urubond', (()=>{const p=TRANSFORM.worldToAtlas(-3500,-3160);return point(p.x,p.y,-2,69);})()],
];
export const DEV_WORLD_DESTINATIONS = Object.freeze([
  ...LOCALS.map(([region, name, target, regionId, atlas], index) => local(region, name, target, 88 - index * 72 / Math.max(1, LOCALS.length - 1), regionId, atlas)),
  Object.freeze({ id: 'cape-thalmagar', name: 'Cape Thalmagar', regionId: 'Cape Thalmagar',
    scene: 'cape-thalmagar', travelTarget: 'cape-thalmagar', atlas: capeAnchor,
    placement: 'provisional-fortress-within-authored-region', status: 'Fortress prototype' }),
]);

const escape = value => String(value).replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
const unescape = value => String(value).replace(/&(amp|lt|gt|quot|apos|#39);/g, (_, entity) => ({ amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", '#39': "'" })[entity]);
const attribute = (attributes, name) => unescape(attributes.match(new RegExp(`(?:^|\\s)${name}="([^"]*)"`))?.[1] ?? '');

function parsePolygons(path) {
  // The exporter writes only absolute M/L/Z hexagons. Reject unexpected path
  // commands instead of silently inventing a shape or treating a bbox as land.
  if (!path || /[^MLZ\d.,+\-\s]/.test(path)) throw new Error('Unsupported authored atlas polygon.');
  const matches = [...path.matchAll(/M([^Z]+)Z/g)];
  if (!matches.length || matches.map(match => match[0]).join('') !== path.replace(/\s/g, '')) throw new Error('Malformed authored atlas polygon.');
  return matches.map(match => {
    const polygon = match[1].split('L').map(pair => pair.split(',').map(Number));
    if (polygon.length !== 6 || polygon.some(pair => pair.length !== 2 || pair.some(value => !Number.isFinite(value))))
      throw new Error('Invalid authored atlas hexagon.');
    return polygon;
  });
}

/** The existing SVG contains exact polygon paths for every painted region. */
export function createDeveloperAtlasData(metadata, svgText, surveyData = null) {
  if (!metadata || !Number.isFinite(metadata.width) || metadata.width <= 0
    || !Number.isFinite(metadata.height) || metadata.height <= 0 || !Array.isArray(metadata.regions))
    throw new Error('Developer atlas metadata is missing.');
  if (surveyData && (surveyData.version !== 1 || surveyData.sha256 !== metadata.sha256
    || JSON.stringify(surveyData.gameAdjustments ?? []) !== JSON.stringify(metadata.gameAdjustments ?? [])
    || surveyData.width !== metadata.width || surveyData.height !== metadata.height || !Array.isArray(surveyData.regions)))
    throw new Error('Developer survey data does not match the authored atlas. Refresh both map exports.');
  const regionGroup = String(svgText).match(/<g\b[^>]*\bid="region-tints"[^>]*>([\s\S]*?)<\/g>/)?.[1];
  if (!regionGroup) throw new Error('Authored region polygons were not found.');
  const paths = new Map();
  for (const match of regionGroup.matchAll(/<path\b([^>]*?)\/?\s*>/g)) {
    const id = attribute(match[1], 'data-region'), d = attribute(match[1], 'd');
    if (!id || paths.has(id)) throw new Error('Duplicate or unnamed atlas region.');
    paths.set(id, { d, polygons: parsePolygons(d) });
  }
  const surveys = new Map((surveyData?.regions ?? []).map(region => [region.id, region]));
  const regions = metadata.regions.map(region => {
    const shape = paths.get(region.id);
    if (!shape || !region.name || ['x', 'y', 'width', 'height', 'centerX', 'centerY'].some(key => !Number.isFinite(region[key])))
      throw new Error(`Missing authored polygon or bounds for ${region.id}.`);
    const survey = surveys.get(region.id);
    if (surveyData && (!survey || !Array.isArray(survey.cells) || !survey.cells.length
      || survey.cells.some(cell => !Number.isFinite(cell.x) || !Number.isFinite(cell.y) || !surveyData.palette?.[cell.terrain])))
      throw new Error(`Missing or invalid survey terrain for ${region.id}.`);
    return { ...region, ...shape, bounds: { x: region.x, y: region.y, width: region.width, height: region.height },
      cells: survey?.cells.map(cell => ({ ...cell })) ?? [],
      destinationIds: DEV_WORLD_DESTINATIONS.filter(destination => destination.regionId === region.id).map(destination => destination.id) };
  });
  if (paths.size !== regions.length) throw new Error('Atlas region metadata and shapes disagree.');
  return { width: metadata.width, height: metadata.height, source: metadata.source, sha256: metadata.sha256,
    hexSize: surveyData?.hexSize ?? metadata.grid?.hexSize ?? 16,
    palette: { ...(surveyData?.palette ?? {}) }, regions };
}

function contains(polygon, x, y) {
  let inside = false;
  for (let i = 0, previous = polygon.length - 1; i < polygon.length; previous = i++) {
    const [ax, ay] = polygon[previous], [bx, by] = polygon[i];
    const cross = (x - ax) * (by - ay) - (y - ay) * (bx - ax);
    if (Math.abs(cross) < 1e-7 && x >= Math.min(ax, bx) - 1e-7 && x <= Math.max(ax, bx) + 1e-7
      && y >= Math.min(ay, by) - 1e-7 && y <= Math.max(ay, by) + 1e-7) return true;
    if ((ay > y) !== (by > y) && x < (bx - ax) * (y - ay) / (by - ay) + ax) inside = !inside;
  }
  return inside;
}

/** Exact land hits avoid neighboring regions with overlapping bounding boxes. */
export function hitAtlasRegion(atlas, x, y) {
  if (!atlas || !Number.isFinite(x) || !Number.isFinite(y)) return null;
  return atlas.regions.find(region => x >= region.x && x <= region.x + region.width
    && y >= region.y && y <= region.y + region.height
    && region.polygons.some(polygon => contains(polygon, x, y))) ?? null;
}

export function developerRegionSelection(atlas, regionId) {
  const region = atlas?.regions.find(candidate => candidate.id === regionId);
  if (!region) return null;
  const destinations = DEV_WORLD_DESTINATIONS.filter(destination => destination.regionId === regionId);
  const survey = { id: `survey:${region.id}`, name: region.name, scene: 'terrain-survey', travelTarget: region.id,
    regionId: region.id, status: 'Terrain survey · gameplay not built', placement: 'authored-region',
    atlas: { x: region.centerX, y: region.centerY, u: region.centerX / atlas.width, v: region.centerY / atlas.height } };
  return { region, name: region.name, destinations: destinations.length ? destinations : [survey],
    survey, canSurvey: region.cells.length > 0,
    note: regionId === 'Drent' ? DEV_ATLAS_PROVENANCE.localityNote
      : regionId === 'Cape Thalmagar' ? DEV_ATLAS_PROVENANCE.capeNote : DEV_ATLAS_PROVENANCE.surveyNote };
}

/** Host delegates click/Enter on [data-dev-region]. No teleport happens here. */
export function developerAtlasMarkup(atlas, { selectedRegionId = '' } = {}) {
  if (!atlas?.regions?.length) return '';
  const paths = atlas.regions.map(region => {
    const selected = region.id === selectedRegionId, authored = region.destinationIds.length > 0;
    // Campaign difficulty tints every region; a provisional level is one the
    // brief never stated and terrain alone suggested.
    const design = regionDesign(region.id);
    const level = design?.level ?? provisionalLevel(terrainCounts(region)), tier = levelInfo(level);
    const label = `${region.name} · ${authored ? 'open playable destinations' : 'open terrain survey; gameplay not built'} · level ${level} ${tier.name}${design && !design.provisional ? '' : ' (provisional)'}`;
    return `<path class="dev-atlas-region${selected ? ' selected' : ''}${authored ? ' built' : ''}" data-dev-region="${escape(region.id)}" data-level="${level}" d="${escape(region.d)}" tabindex="0" role="button" aria-label="${escape(label)}" aria-pressed="${selected}" fill="${selected ? '#f5d389' : tier.tint}" fill-opacity="${selected ? '.28' : '.16'}" stroke="${selected ? '#ffe4a2' : '#ffe4a2'}" stroke-opacity="${selected ? '.9' : '0'}" stroke-width="2" vector-effect="non-scaling-stroke"><title>${escape(label)}</title></path>`;
  }).join('');
  // Shared marker for the local districts; separate pins would imply map-scale
  // positions that World Builder does not contain. The host can show the inset.
  const pins = [DEV_WORLD_DESTINATIONS[0], DEV_WORLD_DESTINATIONS.find(destination => destination.id === 'cape-thalmagar')].map(destination =>
    `<g class="dev-atlas-pin" pointer-events="none" transform="translate(${destination.atlas.x} ${destination.atlas.y})"><circle r="12" fill="#ffe4a2" stroke="#1d3430" stroke-width="3"/><circle r="4" fill="#1d3430"/></g>`).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${atlas.width} ${atlas.height}" class="dev-atlas-svg" role="group" aria-label="Developer atlas: select an authored Azhora region"><image href="./assets/azhora-world-map.svg" width="${atlas.width}" height="${atlas.height}" pointer-events="none"/>${paths}${pins}</svg>`;
}

/** A schematic local route, intentionally separate from the continental atlas. */
export function developerLocalRouteMarkup({ selectedId = '' } = {}) {
  const stops = DEV_WORLD_DESTINATIONS.filter(destination => destination.region);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 300" class="dev-local-route" role="group" aria-label="Drent local route; schematic, not to world-map scale"><path d="M45 264L45 48" fill="none" stroke="#acbca1" stroke-width="3"/>${stops.map(destination => `<g data-dev-destination="${destination.id}" role="button" tabindex="0" aria-label="Visit region ${destination.region}: ${escape(destination.name)}" aria-pressed="${selectedId === destination.id}" transform="translate(45 ${destination.inset.y * 3})"><circle r="13" fill="${selectedId === destination.id ? '#ffe4a2' : '#263d35'}" stroke="#d8ca93" stroke-width="2"/><text x="0" y="5" text-anchor="middle" fill="${selectedId === destination.id ? '#263d35' : '#ffe4a2'}" font-size="13">${destination.region}</text><text x="25" y="5" fill="#f6ecd1" font-size="14">${escape(destination.name)}</text></g>`).join('')}</svg>`;
}

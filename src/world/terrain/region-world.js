/**
 * The playable world, derived from the atlas.
 *
 * `region-layout.js` is pure geometry over the survey; this module turns that
 * geometry into the actual places the game needs: where each region is, where
 * the land ends, where the roads run, and where every person, site and landmark
 * stands. No THREE, no DOM: `world.js` renders what is described here, and the
 * charts, the checkpoint rules and the smokes read the same numbers.
 *
 * North is -Z, east is +X, one authored hex is METRES_PER_HEX metres
 * (HEX_WORLD_TRANSFORM). Every hand-placed literal below is still written in the
 * authored 56 m frame the content was designed in and converted here, at the
 * boundary, by `at()` for a place and `road()` for a road vertex.
 * Ids: 1 Drent, 2 Luscia, 3 Moros Plain, 4 East Suval, 5 West Suval, 6 Pueth, 7 Peblos, 8 Elagos.
 */
import { PLAYABLE_SURVEY, LAND_HEXES, SURVEY_ORIGIN } from '../../dev/tools/region-survey.js';
import { OUTER_PROFILES } from '../../content/regions/outer-regions/outer-regions-data.js';
import { PORT_CALOS_REGION_IDS } from '../../content/regions/port-calos/port-calos-roster.js';
import { ambronTerraceWeight, ambronGroundLevel } from '../../content/regions/ambron/ambron-city-layout.js';
import {
  HEX_WORLD_TRANSFORM, REGION_BIOMES, PLAYABLE_REGIONS, METRES_PER_HEX, ATLAS_HEX_SIZE, ATLAS_HEX_WIDTH,
  regionCells, regionOutline, worldBoundsFor, routeAnchors, borderMidpoint, pointInPolygon,
} from './region-layout.js';
import { toWorld, toWorldRoad, toWorldIn, AUTHORED_METRES_PER_HEX, WORLD_SCALE } from './world-scale.js';

export const SURVEY = PLAYABLE_SURVEY;
export const TRANSFORM = HEX_WORLD_TRANSFORM;
export const REGION_ORDER = PLAYABLE_REGIONS;
export const REGION_IDS = Object.freeze({ Drent: 1, Luscia: 2, 'Moros Plain': 3, 'East Suval': 4, 'West Suval': 5, Pueth: 6, Peblos: 7, 'West Izol': 8, Elagos: 9, Amod: 10, Vastos: 11, Meneth: 12, Caricas: 13, Nesdor: 14, Eer: 15, Isareos: 16, Nethereum: 17, 'South Suval': 18, 'Iscare Archipeligo': 19, 'East Lotharn Mountains': 20, Feradom: 21, Gala: 22, 'Northern Ascarth': 23, 'Southern Ascarth': 24, Ovesos: 25, 'Oves Desert': 26, 'West Lotharn Mountains': 27, 'South Mithala': 28, 'West Mithala': 29, 'East Mithala': 30, 'North Mithala': 31, 'East Ibenwood': 32, 'North Ibenwood': 33, 'South Ibenwood': 34, 'West Ibenwood': 35, 'Central Ibenwood': 36, 'South Oremindi Mountains': 37, Yunethre: 38, Navarth: 39, 'West Pyros': 40, 'Ganesh Desert': 41, 'Ganesh Plain': 42, 'North Meroshe Desert': 43, 'West Meroshe Desert': 44, 'Central Meroshe Desert': 45, 'South Meroshe Desert': 46, 'Cape Heth': 47, 'Dinelv Highlands': 48, Hama: 49, Marosh: 50, Trogo: 51, 'West Baldro Mountains': 52, 'East Baldro Mountains': 53, Selemi: 54, Telemonia: 55, 'West Oremindi Mountains': 56, 'East Pyros': 57, 'Nether Desert': 58, Legemum: 59, Babon: 60, 'South Celder': 61, 'North Celder': 62, 'East Izol': 63, 'Alezhor': 64, 'East Oremindi Mountains': 65, 'North Oreminidi Mountains': 66, 'Lesser Oremindi Mountains': 67, 'Cudon': 68, 'Narcosh': 69, "Cape Thalmagar":70, "Acor Wetlands":71, "West Acorwood":72, "South Acordwood":73, "North Acorwood":74, "East Acordwood":75, "South Endevor":76, "West Endevor":77, "North Endevor":78, "East Endevor":79, 'South Ibenal':114, 'North Ibenal':115, 'Henborth':116, Urubond:117, ...Object.fromEntries(OUTER_PROFILES.map(p=>[p.name,p.id])) });
export const REGION_NAME_BY_ID = Object.freeze(Object.fromEntries(Object.entries(REGION_IDS).map(([name, id]) => [id, name])));

export const ANCHORS = Object.freeze(routeAnchors(SURVEY));
export const WORLD_BOUNDS = Object.freeze(worldBoundsFor(SURVEY));
export const REGION_CELLS = Object.freeze(Object.fromEntries(REGION_ORDER.map(id => [id, regionCells(SURVEY, id)])));
export const REGION_OUTLINES = Object.freeze(Object.fromEntries(REGION_ORDER.map(id => [id, regionOutline(SURVEY, id)])));
/** Softened outlines for charts: the same border, without hexagonal corners. */
export const REGION_BORDERS = Object.freeze(Object.fromEntries(
  REGION_ORDER.map(id => [id, regionOutline(SURVEY, id, TRANSFORM, { soften: 2 })])));

const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
const smooth = (a, b, x) => { const v = clamp((x - a) / (b - a), 0, 1); return v * v * (3 - 2 * v); };
const lerp = (a, b, t) => a + (b - a) * t;
const point = (x, z) => Object.freeze({ x, z });
/** An authored point (56 m per hex), in world metres: rigid inside its cluster. */
const at = (x, z) => { const p = toWorld(x, z); return point(p.x, p.z); };
/** An authored road vertex. Only Tidehaven's own trail is rigid; see world-scale.js. */
const road = (x, z) => { const p = toWorldRoad(x, z); return point(p.x, p.z); };
/** An authored point carried by a named cluster, wherever it lies. */
const inCluster = (id, x, z) => { const p = toWorldIn(id, x, z); return point(p.x, p.z); };
export { AUTHORED_METRES_PER_HEX, WORLD_SCALE };

// ---------------------------------------------------------------------------
// Hexes, land and coast
// ---------------------------------------------------------------------------
const AXIAL_NEIGHBORS = Object.freeze([[1, 0], [1, -1], [0, -1], [-1, 0], [-1, 1], [0, 1]]);
const key = (q, r) => `${q},${r}`;
const landHexes = new Set(LAND_HEXES.map(([q, r]) => key(q, r)));
const cellRegion = new Map(), cellTerrain = new Map();
// The world centre of every owned hex, once, so the shore fringe in `regionAt` costs six map
// lookups and no arithmetic beyond a hypot.
const cellCentre = new Map();
for (const id of REGION_ORDER) for (const cell of SURVEY.regions.find(r => r.name === id).cells) { cellRegion.set(key(cell.q, cell.r), id); cellTerrain.set(key(cell.q, cell.r), cell.terrain); cellCentre.set(key(cell.q, cell.r), hexCentre(cell.q, cell.r)); }

/** Axial hex containing a world point. */
export function hexAt(x, z) {
  const atlas = TRANSFORM.worldToAtlas(x, z);
  const px = atlas.x + SURVEY_ORIGIN.x, py = atlas.y + SURVEY_ORIGIN.y;
  return axialRound((Math.sqrt(3) / 3 * px - py / 3) / ATLAS_HEX_SIZE, py * 2 / 3 / ATLAS_HEX_SIZE);
}
function axialRound(q, r) {
  const y = -q - r;
  let rq = Math.round(q), rr = Math.round(r), ry = Math.round(y);
  const dq = Math.abs(rq - q), dr = Math.abs(rr - r), dy = Math.abs(ry - y);
  if (dq > dr && dq > dy) rq = -rr - ry; else if (dr > dy) rr = -rq - ry;
  return { q: rq, r: rr };
}
export function hexCentre(q, r) {
  return TRANSFORM.atlasToWorld(ATLAS_HEX_WIDTH * (q + r / 2) - SURVEY_ORIGIN.x, ATLAS_HEX_SIZE * 1.5 * r - SURVEY_ORIGIN.y);
}
/** The six corners of a hex in atlas pixels, for drawing the chart's own grid over it. */
export function hexAtlasCorners(q, r) {
  const cx = ATLAS_HEX_WIDTH * (q + r / 2) - SURVEY_ORIGIN.x, cy = ATLAS_HEX_SIZE * 1.5 * r - SURVEY_ORIGIN.y;
  return Array.from({ length: 6 }, (_, i) => {
    const angle = Math.PI / 180 * (60 * i - 30);
    return { x: cx + ATLAS_HEX_SIZE * Math.cos(angle), y: cy + ATLAS_HEX_SIZE * Math.sin(angle) };
  });
}

/** True where the authored atlas claims land; everything else inside the world is the Stills. */
export function isLandHex(x, z) { const h = hexAt(x, z); return landHexes.has(key(h.q, h.r)); }

// ---------------------------------------------------------------------------
// Tidehaven's placement: the original village keeps its own local coordinates
// ---------------------------------------------------------------------------
/**
 * Tidehaven, the Greenway and the woodland places were authored with the sea to
 * the south. Drent's coast faces east, so the whole settlement is carried over
 * as one piece, turned a quarter turn: local -Z (inland) becomes world -X.
 */
export const VILLAGE = Object.freeze({ ...at(-20, 29), yaw: Math.PI / 2 });
export const villageToWorld = (lx, lz) => ({ x: lz + VILLAGE.x, z: VILLAGE.z - lx });

/**
 * The smithy on Tidehaven's south street (docs/combat-brief.md, phase 3). The approved brief puts
 * a smith in Drent, and Drent is level 0, so what he sells is what you landed with - bog iron is
 * a country up (`smithStock`, src/gameplay/inventory/gear.js).
 *
 * **The plot was chosen by measurement, not by eye.** Every standable half-metre of the village
 * was swept and scored on five things: a clear yard, off the middle of the street, off every
 * footpath the village draws, off the opening raid ground, and clear of the queue that comes down
 * the pier. The village is tight - no plot anywhere in it holds a full cottage-sized yard AND
 * keeps off the street, which is why this is an open-sided lean-to and not another cottage.
 *
 * **The footpaths were the correction.** The first sweep measured `world.paths[0]` and stopped:
 * the village draws forty-four paths, and the side lanes between the cottages are all of them
 * but the first. The plot it chose put a corner post 0.14 m from a lane - a shelter post
 * standing in the middle of somebody's footpath. Nothing within twenty metres of that plot
 * passes once the lanes are counted, so this is a move and not a nudge. Of the 23 plots that do
 * pass, this one has the most room and sits in the cottages' own band off the street:
 *
 *   5.8 m of clear ground to the nearest collider - 14.8 m off the road's centreline
 *   6.5 m from the nearest post to the nearest footpath (a lane is 2.6 m wide)
 *   15.2 m from the nearest thing that must stay clear (the raid ground, the pier queue, a door)
 */
const SMITHY_AT = villageToWorld(16.5, -35), SMITHY_FACE = villageToWorld(0, 0);
// Facing in toward the village, so the side people come from is the side he is looking at.
const SMITHY_YAW = Math.atan2(SMITHY_FACE.x - SMITHY_AT.x, SMITHY_FACE.z - SMITHY_AT.z);
export const TIDEHAVEN_SMITHY = Object.freeze({
  id: 'tidehaven-smithy', a: 16.5, b: -35, ...SMITHY_AT, yaw: SMITHY_YAW,
  // Where the smith stands: just outside the shelter's posts on the village side, looking at the
  // street, so he is between the traveler and his own forge rather than behind it (src/content/quests/roadside/smith.js).
  // He looks at the street, not at his own coals: whoever comes up from the village arrives in
  // front of him. Facing him inward put his back to every traveler who walked up.
  stand: Object.freeze({ x: SMITHY_AT.x + Math.sin(SMITHY_YAW) * 2.9, z: SMITHY_AT.z + Math.cos(SMITHY_YAW) * 2.9, yaw: SMITHY_YAW }),
  clear: 5.8, offRoad: 14.8, offPath: 6.5, offKept: 15.2,
});
export const worldToVillage = (x, z) => ({ x: VILLAGE.z - z, z: x - VILLAGE.x });

// The goblin camp (HIDEOUT_SITE, hideoutToWorld) stands in southern Pueth now: see src/pueth-world.js.
/** The local box Tidehaven's original terrain and woodland scatter occupy. */
export const VILLAGE_LOCAL_BOX = Object.freeze({ minX: -112, maxX: 112, minZ: -168, maxZ: 60 });

// ---------------------------------------------------------------------------
// Terrain: a base level and relief per biome, blended between neighbouring hexes
// ---------------------------------------------------------------------------
export const REGION_TERRAIN = Object.freeze({
  Urubond:Object.freeze({base:11.5,amp:3,wave:130,ground:'#393a40'}),
  ...Object.fromEntries(OUTER_PROFILES.map(p=>[p.name,Object.freeze({base:11.5,amp:6,wave:150,ground:p.ground})])),
  Babon: Object.freeze({base:11.5,amp:6,wave:150,ground:REGION_BIOMES.Babon.ground}),
  // The two Celders keep `outland`'s own profile, as Yunethre and the Oremindi did: their ground is one plain laid by
  // `celderLand` (src/content/regions/south-celder/south-celder-world.js), so the blend round them is what it was and the Mithala's border water
  // did not move. (The West Lotharn's `westLotharnShare` counts them as the outland they were, so its ground did not move either.)
  'South Celder': Object.freeze({base:11.5,amp:6,wave:150,ground:REGION_BIOMES['South Celder'].ground}),
  'North Celder': Object.freeze({base:11.5,amp:6,wave:150,ground:REGION_BIOMES['North Celder'].ground}),
  // East Izol keeps `outland`'s profile, so West Izol's ground along their line did not move when it was registered or
  // built: its own ground is laid by `eastIzolGround` (src/content/regions/east-izol/east-izol-world.js), on its own land only, met to West Izol at the line.
  'East Izol': Object.freeze({base:11.5,amp:6,wave:150,ground:REGION_BIOMES['East Izol'].ground}),
  // Alezhor keeps `outland`'s profile, so no neighbour's ground moved when it was registered or built: its own ground is
  // laid by `alezhorGround` (src/content/regions/alezhor/alezhor-world.js), on its own land only, met to every neighbour at the line.
  'Alezhor': Object.freeze({base:11.5,amp:6,wave:150,ground:REGION_BIOMES['Alezhor'].ground}),
  // South Ibenal and North Ibenal keep `outland`'s profile, so no neighbour's ground moved when they were registered or
  // built: their one plain is laid by `ibenalLand` (src/content/regions/south-ibenal/south-ibenal-world.js), on their own land only, met to the forest
  // and the Oremindi at the line, and met by Alezhor at its own.
  'South Ibenal': Object.freeze({base:11.5,amp:6,wave:150,ground:REGION_BIOMES['South Ibenal'].ground}),
  'North Ibenal': Object.freeze({base:11.5,amp:6,wave:150,ground:REGION_BIOMES['North Ibenal'].ground}),
  // Henborth keeps `outland`'s profile, so no neighbour's blend moved: it lays its plain as its own outermost layer
  // (src/content/regions/henborth/henborth-world.js), meets the Mithala and the unbuilt ranges at their lines and holds North Celder's as handed.
  'Henborth': Object.freeze({base:11.5,amp:6,wave:150,ground:REGION_BIOMES['Henborth'].ground}),
  'East Pyros': Object.freeze({base:11.5,amp:6,wave:150,ground:REGION_BIOMES['East Pyros'].ground}),
  'Nether Desert': Object.freeze({base:11.5,amp:6,wave:150,ground:REGION_BIOMES['Nether Desert'].ground}),
  Legemum: Object.freeze({base:11.5,amp:6,wave:150,ground:REGION_BIOMES.Legemum.ground}),
  'West Oremindi Mountains': Object.freeze({base:11.5,amp:6,wave:150,ground:'#818b83'}),
  "Cape Thalmagar": Object.freeze({base:11.5,amp:6,wave:150,ground:'#8d9a6d'}),
  "Acor Wetlands": Object.freeze({base:11.5,amp:6,wave:150,ground:'#8d9a6d'}),
  "West Acorwood": Object.freeze({base:11.5,amp:6,wave:150,ground:'#8d9a6d'}),
  "South Acordwood": Object.freeze({base:11.5,amp:6,wave:150,ground:'#8d9a6d'}),
  "North Acorwood": Object.freeze({base:11.5,amp:6,wave:150,ground:'#8d9a6d'}),
  "East Acordwood": Object.freeze({base:11.5,amp:6,wave:150,ground:'#8d9a6d'}),
  "South Endevor": Object.freeze({base:11.5,amp:6,wave:150,ground:'#8d9a6d'}),
  "West Endevor": Object.freeze({base:11.5,amp:6,wave:150,ground:'#8d9a6d'}),
  "North Endevor": Object.freeze({base:11.5,amp:6,wave:150,ground:'#8d9a6d'}),
  "East Endevor": Object.freeze({base:11.5,amp:6,wave:150,ground:'#8d9a6d'}),
  'East Oremindi Mountains': Object.freeze({base:11.5,amp:6,wave:150,ground:'#8d9a6d'}),
  'North Oreminidi Mountains': Object.freeze({base:11.5,amp:6,wave:150,ground:'#8d9a6d'}),
  'Lesser Oremindi Mountains': Object.freeze({base:11.5,amp:6,wave:150,ground:'#8d9a6d'}),
  'Cudon': Object.freeze({base:11.5,amp:6,wave:150,ground:'#8d9a6d'}),
  'Narcosh': Object.freeze({base:11.5,amp:6,wave:150,ground:'#8d9a6d'}),

  // Keep the former outland profile at the boundary. The Baldro heightfield
  // builds connected mountain ground only inside the two authored footprints.
  'West Baldro Mountains': Object.freeze({ base: 11.5, amp: 6, wave: 150, ground: '#8d9a6d' }),
  'East Baldro Mountains': Object.freeze({ base: 11.5, amp: 6, wave: 150, ground: '#8d9a6d' }),
  // Keep the former outland contribution: authored plains relief only changes owned ground.
  Yunethre: Object.freeze({ base: 11.5, amp: 6, wave: 150, ground: '#a4a363' }),
  // Registration keeps the exact former outland contribution to Ibenwood's blended ground.
  // South Oremindi's own landform module raises hills and peaks only inside its atlas footprint.
  'South Oremindi Mountains': Object.freeze({ base: 11.5, amp: 6, wave: 150, ground: '#8d9a6d' }),
  'East Ibenwood': Object.freeze({ base: 22, amp: 3.2, wave: 155, ground: REGION_BIOMES['East Ibenwood'].ground }),
  'North Ibenwood': Object.freeze({ base: 27, amp: 3.2, wave: 155, ground: REGION_BIOMES['North Ibenwood'].ground }),
  'South Ibenwood': Object.freeze({ base: 18, amp: 3.2, wave: 155, ground: REGION_BIOMES['South Ibenwood'].ground }),
  'West Ibenwood': Object.freeze({ base: 24, amp: 3.2, wave: 155, ground: REGION_BIOMES['West Ibenwood'].ground }),
  'Central Ibenwood': Object.freeze({ base: 25, amp: 3.2, wave: 155, ground: REGION_BIOMES['Central Ibenwood'].ground }),
  'Iscare Archipeligo': Object.freeze({base:8, amp:2.5, wave:80, ground:'#909477', byTerrain:Object.freeze({hills:Object.freeze({base:20,amp:6,wave:90,ground:'#969382'})})}),
  Drent: Object.freeze({ base: 4.6, amp: 2.6, wave: 90, ground: REGION_BIOMES.Drent.ground }),
  Luscia: Object.freeze({ base: 8.6, amp: 4.5, wave: 140, ground: REGION_BIOMES.Luscia.ground }),
  'Moros Plain': Object.freeze({ base: 6.4, amp: .9, wave: 260, ground: REGION_BIOMES['Moros Plain'].ground }),
  // The blade of the peninsula: pale limestone, thin soil. Its authored hills are
  // the southern ridges, which stand higher and barer than the coastal ground.
  'East Suval': Object.freeze({ base: 17, amp: 11, wave: 120, ground: REGION_BIOMES['East Suval'].ground, byTerrain: Object.freeze({
    hills: Object.freeze({ base: 25, amp: 13, wave: 110, ground: '#8f9182' }),
  }) }),
  'West Suval': Object.freeze({ base: 9.5, amp: REGION_BIOMES['West Suval'].relief.amplitude, wave: REGION_BIOMES['West Suval'].relief.wavelength, ground: REGION_BIOMES['West Suval'].ground }),
  // A cell's atlas terrain may refine its region's ground: Pueth's hills stand high and bare, its coastal plains low.
  Pueth: Object.freeze({ base: 7.2, amp: 3.2, wave: 130, ground: REGION_BIOMES.Pueth.ground, byTerrain: Object.freeze({
    hills: Object.freeze({ base: 19, amp: 9, wave: 115, ground: '#8f9585' }),
    plains: Object.freeze({ base: 5.6, amp: 1.8, wave: 170, ground: '#8c9a78' }),
  }) }),
  // Peblos is islands: its hills are the rock spines that hold each one above the Stills, its plains the low sand and turf between.
  Peblos: Object.freeze({ base: 6.4, amp: 2.6, wave: 95, ground: REGION_BIOMES.Peblos.ground, byTerrain: Object.freeze({
    hills: Object.freeze({ base: 10.5, amp: 4.6, wave: 85, ground: '#6f7c63' }),
    plains: Object.freeze({ base: 3.4, amp: 1.2, wave: 120, ground: '#7c8862' }),
  }) }),
  // West Izol is rock: dark and iron-brown at the water, slate-grey at height, with good pasture on the softer
  // slopes and one river flat where the town stands. The atlas's own terrain says which is which.
  'West Izol': Object.freeze({ base: 12.5, amp: 4.4, wave: 115, ground: REGION_BIOMES['West Izol'].ground, byTerrain: Object.freeze({
    hills: Object.freeze({ base: 21, amp: 7.5, wave: 130, ground: '#8a8b84' }),
    plains: Object.freeze({ base: 8, amp: 1.6, wave: 150, ground: '#94a06e' }),
  }) }),
  // Elagos is the northern shelf: it stands high above everything round it, and the ground falls to the Moros at its southern border.
  // Its lakes are cut back out of this ground by src/world/terrain/world-terrain.js from the water in src/elagos-world.js.
  Elagos: Object.freeze({ base: 19.8, amp: 2.6, wave: 165, ground: REGION_BIOMES.Elagos.ground, byTerrain: Object.freeze({
    forest: Object.freeze({ base: 20.6, amp: 3.0, wave: 150, ground: '#6d8a58' }),
    lake: Object.freeze({ base: 18.6, amp: 1.4, wave: 200, ground: '#84986a' }),
  }) }),
  // Amod is the slope itself. The atlas puts hills and one mountain along its northern rows and grassland along
  // its southern ones, so the plain hex blend already tips the whole country southward, out of the Lotharn and
  // down toward Elagos: a traveler walking west out of Pueth climbs, and every valley drains past them.
  // The relief here is deliberately quiet: Amod's shape is the hex tilt, the stream valleys and the
  // terraces themselves (src/content/regions/amod/amod-terraces.js), not noise. A loud sine field puts one-in-three pitches
  // under a road that an Amodian would never have laid, and no channel could hold grade across it.
  Amod: Object.freeze({ base: 24, amp: 2.4, wave: 190, ground: REGION_BIOMES.Amod.ground, byTerrain: Object.freeze({
    hills: Object.freeze({ base: 44, amp: 6.5, wave: 160, ground: '#94986c' }),
    mountain: Object.freeze({ base: 78, amp: 14, wave: 130, ground: '#8a8c80' }),
  }) }),
  // Vastos is the flattest high ground in the world and the highest ordinary ground in it:
  // "a broad elevated tableland that sits above the surrounding terrain on both its eastern
  // and western approaches, reached by gradual climbs". Thirty metres puts it ten above the
  // Elagos shelf, so the hex blend alone makes the climb from the lake country a rise of ten
  // metres over two hundred, which is what a gradual climb is. The amplitude is a tenth of
  // Amod's over a wavelength twice as long: on this plain the eye should find nothing to
  // rest on but the river, the pans and the weather.
  Vastos: Object.freeze({ base: 30.5, amp: 1, wave: 300, ground: REGION_BIOMES.Vastos.ground }),
  // Meneth is cold upland on a mountain margin, lower than the tableland beside it and much
  // higher than the branch country below it. Its base is quiet on purpose: the region's shape
  // is the ridge field in src/content/regions/western-regions/west-ground.js, and noise on top of a ridge is just noise.
  Meneth: Object.freeze({ base: 26, amp: 1.8, wave: 140, ground: REGION_BIOMES.Meneth.ground }),
  // Caricas is the fall from an upland shelf to the Lizeem. Its base is the corridor's own
  // level, low enough that the big river has somewhere to be; the shelf that stands above it
  // is added by src/content/regions/western-regions/west-ground.js, because it is a ramp across the region and not a level.
  // The relief is louder than the uplands': "rougher and less well-watered", says the lore.
  Caricas: Object.freeze({ base: 17, amp: 3.2, wave: 130, ground: REGION_BIOMES.Caricas.ground }),
  // Nesdor is two countries and the atlas already divides them: grassland and one forest hex at
  // the north-western head, plains everywhere south and east of it. The head keeps the branch
  // country's shallow broad valleys; the Flats are the Moros approach, where "the terrain relief
  // is measured in feet rather than hundreds of feet" — half the amplitude of the Moros itself,
  // over a wavelength half again as long, so the horizon opens and stays open.
  Nesdor: Object.freeze({ base: 9.5, amp: 1.6, wave: 200, ground: REGION_BIOMES.Nesdor.ground, byTerrain: Object.freeze({
    plains: Object.freeze({ base: 7.2, amp: .45, wave: 340, ground: '#aeb075' }),
    forest: Object.freeze({ base: 10.2, amp: 2, wave: 170, ground: '#8d9c63' }),
  }) }),
  // Eer is one plain with one line drawn across it, and the atlas draws the line: twelve
  // `plains` hexes over the north and north-west, thirteen `grassland` hexes over the south
  // and south-east, and the Köppen field agreeing with the terrain field hex for hex but one
  // (`Cfa` x 11 against `Csa` x 14; the odd one is the north-east corner on the sea, which is
  // plains ground under a Mediterranean sky). So the default profile is the humid inland half
  // and `byTerrain.grassland` is the coastal half, and the ordinary hex blend spreads the fall
  // between them over a hundred metres without anybody drawing a contour.
  //
  // The relief is the quietest in the world after the Moros: this is flatter than Nesdor's
  // Flats and wetter, and the lore says the ground "rises very gently inland to the north-west
  // and then simply stops being farmed". 7.4 m on the shoulder is within a metre of both the
  // countries it runs off — Nesdor's plains at 7.2 and the Moros at 6.4 — so a traveler walking
  // south off either crosses no step at all.
  Eer: Object.freeze({ base: 7.4, amp: .8, wave: 300, ground: REGION_BIOMES.Eer.ground, byTerrain: Object.freeze({
    grassland: Object.freeze({ base: 2.9, amp: .5, wave: 360, ground: '#b2a865' }),
  }) }),
  // Isareos is the one country in the west that is neither flat nor a ridge field: "low hills,
  // not quite highlands... rising gradually from the valley floors to the upland margins where
  // the territory blurs into the southern edges of the lake country". So it is plain relief and
  // nothing else — no hand-built landform in `west-ground.js` at all — at four and a half
  // metres over a hundred and twenty, which is a shoulder every two minutes' walk and a climb
  // every time. Twenty-two metres puts it between the two countries it blurs into, Caricas's
  // corridor at 17 and the Meneth ridges at 26, so neither border is a step.
  //
  // The atlas's six `plains` hexes are a single column down the western rim against the
  // Ibenwood, and they are the country giving out: four metres lower, half the relief over
  // twice the wavelength, and a greyer ground under a wind with nothing to break it.
  Isareos: Object.freeze({ base: 22, amp: 4.5, wave: 120, ground: REGION_BIOMES.Isareos.ground, byTerrain: Object.freeze({
    plains: Object.freeze({ base: 18, amp: 2.2, wave: 210, ground: '#8a9470' }),
  }) }),
  // Nethereum is the rim of its own basin, and the basin itself is a landform
  // (`nethereumHollow`, src/content/regions/western-regions/west-ground.js) rather than a level: twenty-one metres is what
  // the country stands at where the ground is not falling into the middle of it, and the
  // hollow takes eight metres out of that over a fall two hundred metres wide.
  //
  // Twenty-one sits between the two built countries it hands itself to — Isareos's hills at
  // 22 on the north side of the Isa and Caricas's corridor at 17 on the far side of the
  // Lizeem — so neither border is a step. It is also the first time the ground south of the
  // Isa has been anything but `outland`, and the Isa rises with it; the amount is measured in
  // `tests/nethereum-world.test.js`.
  //
  // The relief is deliberately quiet, as Meneth's and Caricas's are: the shape of this country
  // is the dish in it, and noise on top of a dish is just noise. Under two metres over a
  // hundred and ninety is enough to keep the floor from reading as a table and no more.
  //
  // The atlas's one `plains` hex is the north-western corner against the Nether Desert and the
  // Ibenwood, outside the hollow's catchment: two metres lower, flatter still, and a paler and
  // drier ground, which is the same thing Isareos's western rim does for the same reason.
  Nethereum: Object.freeze({ base: 21, amp: 1.1, wave: 210, ground: REGION_BIOMES.Nethereum.ground, byTerrain: Object.freeze({
    plains: Object.freeze({ base: 19, amp: .9, wave: 260, ground: '#7f9459' }),
  }) }),
  // South Suval is the peninsula's southern hills: "hillier than the western section - the ridge
  // system drops more steeply to the southern coast" (suval.md). The atlas puts the ridge through
  // the north of it - three mountain hexes of cold-summer Mediterranean in a row, a fourth in the
  // west - and the lake country below them: grassland round the Stillwater, hills beyond. So the
  // mountains stand well above East Suval's hills, the hills stand with East Suval's, and the
  // grass round the lake is the low ground of the region. The lake hex is cut back out of this to
  // the Stillwater's own level by src/south-suval-world.js.
  'South Suval': Object.freeze({ base: 19, amp: REGION_BIOMES['South Suval'].relief.amplitude, wave: REGION_BIOMES['South Suval'].relief.wavelength,
    ground: REGION_BIOMES['South Suval'].ground, byTerrain: Object.freeze({
      // Csc on the atlas: cold-summer Mediterranean, the climate of altitude. The hex blend pulls a
      // mountain hex toward the low grass round the lake, so the profile stands high enough that
      // the ridge still reads as one from the water.
      mountain: Object.freeze({ base: 64, amp: 12, wave: 118, ground: '#9d9b88' }),
      hills: Object.freeze({ base: 26, amp: 7.5, wave: 112, ground: '#a3a07a' }),
      grassland: Object.freeze({ base: 16.5, amp: 2.2, wave: 150, ground: '#8f9e66' }),
      lake: Object.freeze({ base: 15.5, amp: .8, wave: 200, ground: '#86996a' }),
    }) }),
  // The East Lotharn: old mountains, "the peaks are rounded, the ridgelines are broad-backed rather
  // than knife-edged, the faces... long, forested slopes inclined at angles that feet can manage".
  // So high and long rather than high and sharp: the waves here are the longest in the world, and
  // the mountain hexes stand above Amod's (78) because Amod is the Lotharn's foothills.
  'East Lotharn Mountains': Object.freeze({ base: 70, amp: REGION_BIOMES['East Lotharn Mountains'].relief.amplitude, wave: REGION_BIOMES['East Lotharn Mountains'].relief.wavelength,
    ground: REGION_BIOMES['East Lotharn Mountains'].ground, byTerrain: Object.freeze({
      hills: Object.freeze({ base: 58, amp: 8, wave: 215, ground: '#5f7445' }),
      mountain: Object.freeze({ base: 96, amp: 13, wave: 250, ground: '#5a6a46' }),
    }) }),
  // Feradom: low behind its hills. The barrier ridges, their scarps and their passes are
  // src/content/regions/feradom/feradom-world.js's, laid on this; the hex blend only sets the country's floor, the hills a
  // little above the plains and the two mountain hexes at its north-west corner against the Lotharn.
  Feradom: Object.freeze({ base: 11, amp: REGION_BIOMES.Feradom.relief.amplitude, wave: REGION_BIOMES.Feradom.relief.wavelength, ground: REGION_BIOMES.Feradom.ground, byTerrain: Object.freeze({
    hills: Object.freeze({ base: 20, amp: 3, wave: 140, ground: '#566b44' }),
    plains: Object.freeze({ base: 9.5, amp: 1.8, wave: 170, ground: '#6d8250' }),
    mountain: Object.freeze({ base: 58, amp: 9, wave: 190, ground: '#5d6a4c' }),
  }) }),
  // The Ascarth Peninsula (src/content/regions/ascarth/ascarth-world.js), a finger of land on the far bank of the Lizeem's
  // mouth. **Base 4.0, amplitude .6, wavelength 320 on the grassland** is the seam contract with Gala,
  // which uses the same on its side of their eight shared edges (docs/ascarth-brief.md): the neck
  // lies at Gala's own level and the hex blend between them is quiet. Everything the peninsula is
  // beyond that - the plateau rising out of the neck, the two hills, the cliffs and the bays - is laid
  // by `ascarthGround`, which leaves the hundred metres next to the border to this blend.
  //
  // The hill profile is low on purpose. One of the three hill hexes, (-9,122), touches Gala on its
  // north-west edge, and a hill profile at the height the hills actually stand would lift Gala's side
  // of that edge by metres; at seven it lifts it by a metre at the most, measured
  // (`tests/ascarth-world.test.js`), and the hills themselves are the hand-built landform. Its
  // wavelength is the grass's, 320, because the blend's relief is a sine of the blended wavelength:
  // a hex on another wave shifts the phase of every sine within reach of it, and where the blend's
  // set of hexes changes at a corner the ground steps by a third of a metre. On one wave it does not.
  'Northern Ascarth': Object.freeze({ base: 4, amp: .6, wave: 320, ground: REGION_BIOMES['Northern Ascarth'].ground, byTerrain: Object.freeze({
    hills: Object.freeze({ base: 7, amp: 1, wave: 320, ground: '#858b5d' }),
  }) }),
  // Southern Ascarth touches nobody but its twin and the sea, so its profile is read by nothing that
  // shapes the ground - the whole country is `ascarthGround`'s - and it says what that ground is: the
  // plateau's mean height, measured over the country's own hexes, and its roll.
  'Southern Ascarth': Object.freeze({ base: 12, amp: 2.1, wave: 150, ground: REGION_BIOMES['Southern Ascarth'].ground }),
  outland: Object.freeze({ base: 11.5, amp: 6, wave: 150, ground: '#8d9a6d' }),
  // Gala is a plain, "flat, fertile, drained by a network of small rivers", and the atlas says so
  // nineteen times out of twenty-one: `plains`, with the two coastal hexes `grassland`. What it
  // says in its climate field is the country's whole shape — `BSh` steppe over the northern three
  // rows, `Csb` over the next two, `Csa` on the sea — and that gradient is a landform on top of
  // this profile (`galaRise`, src/content/regions/gala/gala-world.js), not a second profile, for one reason:
  //
  // **the seam with Northern Ascarth.** Eight hex edges on Gala's south-east side are shared with
  // a country being built in another branch at the same time, and the two builders hold the same
  // contract (docs/gala-brief.md): both use base 4.0 m, amplitude .6 and wavelength 320 for the
  // grassland and plains of the hexes on that border, so the ordinary hex blend has nothing to
  // hide, and neither writes ground outside its own hexes. Four of those hexes are `plains` and
  // one is `grassland`, and a profile belongs to a terrain and not to a hex, so both of Gala's
  // profiles are the seam's numbers. The north stands higher because the rise says so, and the
  // rise is nothing at all within a hundred metres of that border.
  //
  // 4.0 m is also within a metre or so of everything it meets across the Lizeem: Eer's coast is 2.9
  // and its inland shoulder 7.4, and the rise lifts Gala's north-east to within a metre of the latter.
  // The relief is Eer's own quiet: under a metre over three hundred and twenty.
  Gala: Object.freeze({ base: 4.0, amp: .6, wave: 320, ground: REGION_BIOMES.Gala.ground, byTerrain: Object.freeze({
    // The two hexes on the sea: the same numbers, a greener ground. `Csa`, and the grass holds.
    grassland: Object.freeze({ base: 4.0, amp: .6, wave: 320, ground: '#979b62' }),
  }) }),
  // Ovesos (src/content/regions/oves/oves-world.js): the middle Oveth, and a tilt. The atlas gives it eight `grassland`
  // hexes — exactly its northern two rows — and eleven `plains` over the southern three, with the
  // Oveth running the whole south-western border, so the country falls from the upland grass to the
  // river's own bottomland and the two profiles are that fall: **16 m on the grass, 10 m on the
  // plain**, the numbers docs/six-regions-brief.md worked out from the lore's "the terrain simply
  // rises" and the Sorten's twelve miles of valley floor.
  //
  // Both numbers are chosen against what they meet, which in this country is four built neighbours
  // and three of them across water:
  //  - Nethereum's 21 across the Neth, on the north-west (5 edges, every one of them the river);
  //  - Caricas's 17 and Nesdor's plains at 7.2 across the Lizeem, on the north-east and east
  //    (7 edges each, again every one the river, and the Lizeem is a wall);
  //  - **Gala's 4.0 plus its 4.2 m steppe rise ≈ 8.2, across the Oveth on the south-east (3 edges)**,
  //    which the plains' 10 meets within two metres. That matters more than the others: the Oveth
  //    hands its water to Gala's reach at the corner where the three countries meet, and a river
  //    cannot step down three metres in the middle of itself.
  // 10 is also within a metre and a half of the `outland` 11.5 that stood here before, so registering
  // this country moves Gala's own ground, the Lizeem's level and the Neth's by centimetres and not
  // by metres (measured in tests/oves-world.test.js).
  //
  // **The wavelength is Gala's 320 on both profiles, and that is the fix for the ribs.** Gala
  // reported short steep "ribs" along x ≈ -1900 where its 320 m relief blended into outland's 150:
  // `relief()` takes its phase from x/wave, the blend mixes the wavelengths, and a margin where the
  // wavelength changes chirps. Northern Ascarth met the same thing at a hill hex and put its hills on
  // the grass's wave for the same reason. Every profile in these two countries is on 320, so the
  // Ovesos|Gala, Ovesos|Oves Desert and Oves Desert|Gala margins have nothing to hide — and what
  // makes the desert's ground broken instead of sinusoidal is a landform (`ovesStone`), not a wave.
  Ovesos: Object.freeze({ base: 10, amp: .7, wave: 320, ground: REGION_BIOMES.Ovesos.ground, byTerrain: Object.freeze({
    // The northern two rows: the upland grass, six metres up and rolling twice as loudly, because
    // "livestock on the upland ridges" is the lore's own word for what this ground is.
    grassland: Object.freeze({ base: 16, amp: 1.6, wave: 320, ground: '#9ba566' }),
  }) }),
  // The Oves Desert (src/content/regions/oves/oves-world.js): twenty `plains` hexes and three `hills`, and the hills are
  // exactly the north-western rim the lore builds the whole rain shadow on. The country is a wedge of
  // the Oveth basin whose apex is its eastern tip, where the Oveth and the Caelin come
  // together, so its floor falls the length of it from the rim to that corner; the fall is a landform
  // (`ovesBasin`) and not a level, the way Caricas's shelf is, because a base can only say one number.
  //
  // 12 on the plains is the country's mean and is chosen against two things: it is half a metre
  // above the `outland` 11.5 it replaces, so registering the desert moves Gala's own hexes, the
  // Lizeem's level and the Caelin's Gala reach by centimetres; and it stands two metres above Ovesos's
  // plain across the Oveth, which is what the side of a basin does over the river's bottomland. The
  // hills' 22 is the rim's shoulder, not the rim: the three summits are `ovesRim`, laid on top of
  // this, the way Ascarth's two hills are laid on top of its 7.
  'Oves Desert': Object.freeze({ base: 12, amp: .8, wave: 320, ground: REGION_BIOMES['Oves Desert'].ground, byTerrain: Object.freeze({
    hills: Object.freeze({ base: 22, amp: 1.6, wave: 320, ground: '#a39b7e' }),
  }) }),
  // The West Lotharn (src/content/regions/west-lotharn/west-lotharn-world.js): the same range as the East and the taller half of
  // it. **Every number here is the East Lotharn's, to the digit, and that is the point**: the two
  // halves share seven hex edges, three of which are hills against hills, and a base or a wavelength
  // that differed across that border would put a step or a chirp in the middle of one massif. The
  // whole difference between the two is the landform laid on top - the East's highest is 420 m and
  // this one's crest is 550 - and a landform is nothing at all at the border it fades to.
  //
  // The skirts have much further to fall than the East's do: this country's southern hexes meet
  // Meneth at 26, Vastos at 30.5 and Isareos at 22, where the East had Amod's foothills. That fall
  // belongs to the hex blend and is measured in tests/west-lotharn-world.test.js rather than being
  // hidden by a lower base, because a mountain front is what the atlas draws here.
  'West Lotharn Mountains': Object.freeze({ base: 70, amp: REGION_BIOMES['West Lotharn Mountains'].relief.amplitude, wave: REGION_BIOMES['West Lotharn Mountains'].relief.wavelength,
    ground: REGION_BIOMES['West Lotharn Mountains'].ground, byTerrain: Object.freeze({
      hills: Object.freeze({ base: 58, amp: 8, wave: 215, ground: '#5d7246' }),
      mountain: Object.freeze({ base: 96, amp: 13, wave: 250, ground: '#586848' }),
    }) }),
  // ---------------------------------------------------------------------------------------------
  // The Mithala plain: four countries, one profile, and the flattest large country in the game
  // ---------------------------------------------------------------------------------------------
  // **The four are quarters of one landform, so they share one set of numbers to the digit.** They
  // have forty-nine hex edges among them; a base or a wavelength that differed across any of those
  // would put a step or a chirp in the middle of one plain, which is the lesson Gala and the
  // Ascarths wrote down for their eight shared edges and the two Lotharns for their seven. Every
  // difference of level between the four quarters is therefore a **landform** and not a profile:
  // `mithalaTilt` (src/content/regions/mithala/mithala-world.js) carries the whole fall of the plain, west to east and north
  // to south, continuously across all four names, and the hex blend has nothing at all to carry.
  //
  // **One wavelength, 320**, for the same reason the Ascarth hills are on the grassland's: the
  // blend's relief is a sine of the blended wavelength, so a hex on another wave shifts the phase of
  // every sine within reach of it, and the ground steps where the blend's set of hexes changes. The
  // four `hills` hexes in South Mithala are on 320 as well, and their roughness is amplitude alone.
  //
  // **The amplitudes are the lowest in the game after the Moros.** The lore is flat about it: "a
  // plain that has no interest in rising. The horizon here is real. You can see it: a line,
  // uninterrupted except by weather, circling the full compass." Half a metre over three hundred and
  // twenty is a swell a traveler feels in the knees and never sees, and it is on purpose: everything
  // a Mithala traveler can pick out - a levee, a backswamp, a bar, a dry summer channel - is a metre
  // or two of the river's own work, and relief that competed with it would bury the lot.
  //
  // The grassland is a little rougher and a little higher than the plains because that is what the
  // atlas means by the two words here: `grassland` over the western and northern hexes, which stand
  // back from the braids on older ground, and `plains` over the channel country, which is what the
  // flood has levelled. The `hills` are the Lotharn's last apron and are twelve metres over the
  // grass, which is a swell you can see across and nothing at all beside a range of five hundred.
  'South Mithala': Object.freeze({ base: 10.5, amp: .5, wave: 320, ground: REGION_BIOMES['South Mithala'].ground, byTerrain: Object.freeze({
    grassland: Object.freeze({ base: 12, amp: .75, wave: 320, ground: '#758748' }),
    hills: Object.freeze({ base: 24, amp: 2.6, wave: 320, ground: '#6b7c43' }),
  }) }),
  'West Mithala': Object.freeze({ base: 12, amp: .75, wave: 320, ground: REGION_BIOMES['West Mithala'].ground, byTerrain: Object.freeze({
    plains: Object.freeze({ base: 10.5, amp: .5, wave: 320, ground: '#738545' }),
  }) }),
  'East Mithala': Object.freeze({ base: 10.5, amp: .5, wave: 320, ground: REGION_BIOMES['East Mithala'].ground, byTerrain: Object.freeze({
    grassland: Object.freeze({ base: 12, amp: .75, wave: 320, ground: '#6a8043' }),
  }) }),
  'North Mithala': Object.freeze({ base: 10.5, amp: .5, wave: 320, ground: REGION_BIOMES['North Mithala'].ground, byTerrain: Object.freeze({
    grassland: Object.freeze({ base: 12, amp: .75, wave: 320, ground: '#718647' }),
  }) }),
  // ---------------------------------------------------------------------------
  // The southwestern block (src/content/regions/southwest/southwest-world.js): Navarth, West Pyros, the Ganesh Desert and
  // the Ganesh Plain - the driest quarter of the continent and the first true desert in the game.
  // ---------------------------------------------------------------------------
  // **Every profile here is on wavelength 320**, which is Gala's, the Oves's, the Mithala's and
  // the Ascarths' for the same reason: `relief()` takes its phase from x / wave, the hex blend
  // mixes the wavelengths, and a country on another wave shifts the phase of every sine within
  // reach of its border. These four share forty-six internal hex edges, so one wave across all
  // of them is what makes those edges invisible.
  //
  // The bases carry the block's shape, and a base blends linearly across a hex boundary and is
  // therefore already smooth - it is the sine that chirps. Navarth is the high ground at 40 with
  // its hills at 58 (the crests on top of them are `navarthCrests`); West Pyros falls south to the
  // Vaellir's mouth from 26; the Ganesh Desert is the lowest at 20 and falls north-west to a gulf
  // shore; the Ganesh Plain at 22 sits on the divide between the two drainages. The `grassland`
  // hex in West Pyros and the one in the Ganesh Plain are the block's two wettest hexes - both
  // `Csa`, both a hex from the southern sea - and both are lower, greener and a little rougher
  // than the plains behind them, which is what the atlas means by the change of word.
  Navarth: Object.freeze({ base: 40, amp: 1.1, wave: 320, ground: REGION_BIOMES.Navarth.ground, byTerrain: Object.freeze({
    hills: Object.freeze({ base: 58, amp: 2.8, wave: 320, ground: '#675e44' }),
    // The one forest hex in the block, (-24,116), `Csb`, at Navarth's north-eastern tip against the
    // South and East Ibenwood. It is the plateau's wooded shoulder falling into the forest belt, so
    // it stands well below the tableland rather than on it: the Ibenwood is low wet ground and this
    // is the last hex of Navarth before it.
    forest: Object.freeze({ base: 34, amp: 1.3, wave: 320, ground: '#5d6840' }),
  }) }),
  'West Pyros': Object.freeze({ base: 26, amp: .9, wave: 320, ground: REGION_BIOMES['West Pyros'].ground, byTerrain: Object.freeze({
    grassland: Object.freeze({ base: 12, amp: .8, wave: 320, ground: '#6b7542' }),
  }) }),
  'Ganesh Desert': Object.freeze({ base: 20, amp: .9, wave: 320, ground: REGION_BIOMES['Ganesh Desert'].ground }),
  'Ganesh Plain': Object.freeze({ base: 22, amp: .85, wave: 320, ground: REGION_BIOMES['Ganesh Plain'].ground, byTerrain: Object.freeze({
    grassland: Object.freeze({ base: 14, amp: .8, wave: 320, ground: '#737a4d' }),
  }) }),
  // ---------------------------------------------------------------------------
  // The four Meroshe deserts (src/content/regions/southwest/southwest-world.js): ninety-five hexes, one terrain word and one
  // climate code, and therefore the one job in this project where the profile table cannot say
  // anything about the difference between four countries. The atlas writes `plains` and `BWh`
  // ninety-five times over. **What tells them apart is the surface** - erg, reg, hamada, salt pan -
  // and a surface is a landform and a scatter, not a base and an amplitude.
  //
  // So the bases only carry the block's fall and the amplitudes only say how rough the floor is
  // between the landforms, which is the reverse of Navarth's `hills` and every mountain country
  // before it. **Every one is on wavelength 320**, job 1's, for job 1's reason: `relief()` takes its
  // phase from x / wave, and these four share fifty-seven internal hex edges with each other and ten
  // more with the Ganesh Plain.
  //
  // North is the hamada and the highest floor of the four at 21, joining the Ganesh Plain's 22 over
  // ten hex edges with a metre between them; it is the roughest (1.15), because bare bedrock with
  // hard beds standing out of it is the one desert surface that is not a sheet. Central is the sand
  // sea at 16 in its own shallow closed sink and is the *smoothest* thing in the game away from its
  // dunes (0.55), because an interdune corridor is a gravel floor swept flat by the same wind that
  // piled the ridge beside it. South is the reg at 14, flatter still than the Ganesh (0.6) because a
  // stone pavement is what a desert looks like when everything loose has already gone. West is the
  // fan skirt at 14, falling west to the ocean on `merosheFans`, a little rougher than the reg (0.85)
  // because a bajada is a dozen overlapping cones of gravel and not a plane.
  'North Meroshe Desert': Object.freeze({ base: 21, amp: 1.15, wave: 320, ground: REGION_BIOMES['North Meroshe Desert'].ground }),
  'West Meroshe Desert': Object.freeze({ base: 14, amp: .85, wave: 320, ground: REGION_BIOMES['West Meroshe Desert'].ground }),
  'Central Meroshe Desert': Object.freeze({ base: 16, amp: .55, wave: 320, ground: REGION_BIOMES['Central Meroshe Desert'].ground }),
  'South Meroshe Desert': Object.freeze({ base: 14, amp: .6, wave: 320, ground: REGION_BIOMES['South Meroshe Desert'].ground }),
  // ---------------------------------------------------------------------------
  // Cape Heth, the Dinelv Highlands and Hama (src/content/regions/southwest/southwest-world.js): the block's western edge, and
  // the one place in it where the profile table has real work to do again. Job 2's four countries
  // could not be told apart by a base or an amplitude at all; these three differ by eighty-five
  // metres of base between them, which is more than any three neighbours in the game outside the two
  // Lotharns.
  //
  // **Every one is on wavelength 320**, which is now nine countries of this block and eleven on the
  // wave: `relief()` takes its phase from x / wave, the hex blend mixes the wavelengths, and these
  // three share fifty-two hex edges with the block's other eight. The `mountain` profile is on 320
  // too, where both Lotharns put their mountain hexes on a wave of their own - because a Lotharn
  // mountain hex sits inside a range of mountain hexes and these three sit one hex from `hills` on
  // every side of them.
  //
  // **Cape Heth is low and nearly flat**, base 13 against the Ganesh Desert's 20, because the lore is
  // emphatic that this cape is "not a dramatic geographical feature... a low, extended point of land",
  // and because twenty-one of its hex edges are open water: a cape that stood high would be a cliff
  // headland, which is the thing the lore says it is not. `byTerrain.coast` at 5 is the point of the
  // cape itself - the only `coast` hex any country on the atlas holds - and it is the lowest authored
  // base in the game, three metres above the tideline, because the lore measures this cape's storms
  // by how far up it the salt water got.
  //
  // **The Dinelv Highlands are the high ground of the whole southwest**, and the first desert
  // highland in the game: `hills` at 96 is thirty-eight metres over Navarth's 58 and the highest
  // non-Lotharn base there is. The `plains` hexes at 82 are *not* low plains - they are the six
  // closed basins inside the plateau, fourteen metres under the rolling upland round them, which is
  // what `plains` means when it is ringed by `hills`. And `mountain` at 138 is deliberately low for
  // the word: the atlas paints these three hexes `BWh`, and a summit high enough to be a mountain in
  // the Lotharn sense could not read as hot desert at its top. They are the only three hot-desert
  // `mountain` hexes on the map and they are residual massifs, not peaks.
  //
  // **Hama is a coastal ramp**, and its two halves are the country's whole subject: `plains` at 28 is
  // the stony broken rise on the inland side - "rough without being impassable", the highest and
  // roughest of the block's `plains` after the hamada - and `grassland` at 15 is the green strip along
  // the surf. Thirteen metres of fall over three hundred, and the atlas draws the climate line in the
  // same place it draws the terrain line. Both are two metres higher than first authored, because job
  // 1's tilt plane now runs over Hama too and takes seven metres off this corner on its own.
  'Cape Heth': Object.freeze({ base: 13, amp: .8, wave: 320, ground: REGION_BIOMES['Cape Heth'].ground, byTerrain: Object.freeze({
    coast: Object.freeze({ base: 5, amp: .5, wave: 320, ground: '#4c4b41' }),
  }) }),
  // The default here is the `hills` of the rolling upland, which is twenty-six of the thirty-five.
  'Dinelv Highlands': Object.freeze({ base: 96, amp: 3.2, wave: 320, ground: REGION_BIOMES['Dinelv Highlands'].ground, byTerrain: Object.freeze({
    plains: Object.freeze({ base: 82, amp: 1.4, wave: 320, ground: '#514c3a' }),
    mountain: Object.freeze({ base: 138, amp: 5, wave: 320, ground: '#454234' }),
  }) }),
  Hama: Object.freeze({ base: 28, amp: 1.6, wave: 320, ground: REGION_BIOMES.Hama.ground, byTerrain: Object.freeze({
    grassland: Object.freeze({ base: 15, amp: .9, wave: 320, ground: '#44532f' }),
  }) }),
  // ---------------------------------------------------------------------------
  // Marosh and Trogo (src/content/regions/southwest/southwest-world.js): the block's eastern edge, and the two countries whose
  // bases say why the Meroshe is a desert. Both are on wavelength 320, which is now the whole block
  // and thirteen countries; between them they share seven hex edges with the four Meroshe quarters
  // and one with each other, and a country on another wave would shift the phase of every sine
  // within reach of those borders.
  //
  // **Marosh is a ridge and a terrace, and the ridge is the wall.** `hills` at 74 is the second
  // highest base in the game outside the two Lotharns, behind the Dinelv plateau's 96 and thirty-six
  // metres over Navarth's 58 - and it is a *coastal* ridge, one hex wide, standing between twenty hex
  // edges of open Iberos water on the east and the Central Meroshe's sand at 16 on the west. That is
  // the whole reason there is a desert behind it: the sea air comes in off the Iberos, the ridge
  // wrings it out, and what gets over the top is dry. The atlas says so twice - `hills` reads `Csb`,
  // the cooler-summer Mediterranean form that on a strip two hexes wide can only be altitude, and
  // `grassland` reads `Csa`, the hot-summer one. `grassland` at 17 is the seaward terrace, two metres
  // over Hama's sward because it has a ridge behind it rather than an ocean on two sides.
  //
  // **Trogo is the ridge that makes the rainforest.** `deep_forest` at 52 - **the first use of that
  // terrain word anywhere in the game's world** - against the South Meroshe's 14 across thirteen hex
  // edges, which is the "wall of dark canopy" job 2's own landmark promised and the reason the atlas's
  // own developer heights put `deep_forest` at 18 where `plains` is 6. The lore's sentence is the
  // design: "a ridgeline that catches the southern moisture and drops a fog wall on its windward face
  // while the leeward side stays desert." The ridge is these twenty-two hexes; the leeward side is job
  // 2's fog belt and then its stone floor. `grassland` at 13 is the coastal flat where the forest
  // stops - "the coastal strip, where the rivers slow and the land flattens near the southern sea, is
  // the most hospitable section" - so the fall from canopy to shore grass is thirty-nine metres over a
  // hex, which is what the lore means by "rivers run fast, elevation changes quickly".
  Marosh: Object.freeze({ base: 17, amp: .9, wave: 320, ground: REGION_BIOMES.Marosh.ground, byTerrain: Object.freeze({
    hills: Object.freeze({ base: 74, amp: 2.6, wave: 320, ground: '#3c4a2a' }),
  }) }),
  Trogo: Object.freeze({ base: 52, amp: 2.4, wave: 320, ground: REGION_BIOMES.Trogo.ground, byTerrain: Object.freeze({
    grassland: Object.freeze({ base: 13, amp: .8, wave: 320, ground: '#57642f' }),
  }) }),
  // Selemi (src/content/regions/selemis/selemis-world.js), the island one row of water south of the Ascarth tip. **It touches
  // nobody**: all fourteen hexes round it are unclaimed sea, so this profile is read by nothing that
  // shapes any ground - the whole island is `selemisGround`'s, as the tip of the peninsula is
  // `ascarthGround`'s - and it says what that ground is: 11.3 m is the island's mean height, measured
  // over every square metre of it that stands above the waterline, and the roll is its bench's own.
  // What the row does do is colour: the hex blend still weighs this swatch against the `outland` green
  // of the sea hexes in reach, and `selemisTint` takes both shares on the island's own ground.
  Selemi: Object.freeze({ base: 11.3, amp: 1.3, wave: 110, ground: REGION_BIOMES.Selemi.ground }),
  // Telemonia (src/content/regions/telemonia/telemonia-world.js), the Telemon highland. **This profile shapes almost nothing of
  // Telemonia itself**: the rim, the passes, the Galmeth and Kethorn's crag are all `telemoniaGround`'s,
  // which takes over a few metres inside the border and writes nowhere else. What the profile does
  // shape is the ground on both sides of the border within the blend's reach - the Oves Desert's and
  // Gala's last eighty metres, and the two border streams worked out from them - so it is set for them
  // and not for the highland, on Gala's and the Oves's wavelength, 320. That wavelength is the cure the
  // Oves report asked for: the ribs it measured along every built border with unbuilt ground came from
  // 150 m relief blending into 320, and they are gone on the twenty-one hex edges this country shares
  // with the two of them. The level is measured, not chosen: `outland`'s own 11.5 m, which the streams
  // were built against, with its six metres of roll taken away raises the Caelin's last reach more than
  // Gala's first and leaves a 0.55 m fall where the two hand over (the Oves's own test allows 0.6);
  // 10 m leaves 0.44, and every other number the two neighbours hold (docs/telemonia-stage1-report.md).
  Telemonia: Object.freeze({ base: 10, amp: .8, wave: 320, ground: REGION_BIOMES.Telemonia.ground }),
  outland:Object.freeze({ base: 11.5, amp: 6, wave: 150, ground: '#8d9a6d' }),
});
/** The terrain a hex cell stands on: its region's profile, refined by the cell's atlas terrain where the region says so. */
const cellProfile = (name, terrain) => REGION_TERRAIN[name].byTerrain?.[terrain] ?? REGION_TERRAIN[name];
// Keep the public weights object complete, including zeroes, without allocating
// a name/pair array for every profile at every terrain vertex.
const EMPTY_TERRAIN_WEIGHTS = Object.freeze(Object.fromEntries(Object.keys(REGION_TERRAIN).map(name => [name, 0])));

/** Suval's hills use every hex in the blend's reach. The old seven-cell stencil changes
 * abruptly when the containing hex changes, leaving artificial steps across mountain faces.
 * Feather this correction through the border neighborhood; older ground elsewhere keeps its
 * original height and scenery placement. The full correction includes all three Suvals.
 */
const SUVAL_BLEND_NAMES = Object.freeze(['West Suval', 'South Suval', 'East Suval']);
const SUVAL_BLEND_BOUNDS = (() => {
  const cells = SUVAL_BLEND_NAMES.flatMap(name => REGION_CELLS[name]);
  const margin = METRES_PER_HEX * 1.28;
  return Object.freeze({ minX: Math.min(...cells.map(c => c.x)) - margin,
    maxX: Math.max(...cells.map(c => c.x)) + margin,
    minZ: Math.min(...cells.map(c => c.z)) - margin,
    maxZ: Math.max(...cells.map(c => c.z)) + margin });
})();
export function terrainMix(x, z) {
  const b = SUVAL_BLEND_BOUNDS;
  if (x <= b.minX || x >= b.maxX || z <= b.minZ || z >= b.maxZ) return blendHexes(x, z, HOME_AND_NEIGHBORS);
  const complete = seamlessTerrainMix(x, z);
  const share = SUVAL_BLEND_NAMES.reduce((sum, name) => sum + (complete.weights[name] ?? 0), 0);
  const amount = smooth(0, .3, share);
  if (amount >= 1) return complete;
  const original = blendHexes(x, z, HOME_AND_NEIGHBORS);
  if (amount <= 0) return original;
  const blendValues = (a, c) => Object.fromEntries([...new Set([...Object.keys(a), ...Object.keys(c)])]
    .map(key => [key, lerp(a[key] ?? 0, c[key] ?? 0, amount)]));
  return { base: lerp(original.base, complete.base, amount), amp: lerp(original.amp, complete.amp, amount),
    wave: lerp(original.wave, complete.wave, amount), weights: blendValues(original.weights, complete.weights),
    grounds: blendValues(original.grounds, complete.grounds) };
}
const HOME_AND_NEIGHBORS = Object.freeze([[0, 0], ...AXIAL_NEIGHBORS]);
/** Every hex within two steps: all of them that the blend's reach can ever touch from a point of the home hex. */
const WITHIN_TWO = Object.freeze([[0, 0], ...AXIAL_NEIGHBORS,
  ...[[2, 0], [2, -1], [2, -2], [1, -2], [0, -2], [-1, -1], [-2, 0], [-2, 1], [-2, 2], [-1, 2], [0, 2], [1, 1]]]);
/**
 * `terrainMix` over every hex its reach touches. The reach is 1.28 hexes, which from a point near
 * its hex's corner takes in a few hexes two steps away; `terrainMix` leaves those out until the
 * point crosses into a neighbour of theirs and then counts them all at once, so the ground has a
 * seam along the hex edge - a few metres high where one of them is a ridge. This blend has none.
 * The Suval countries use it in their base terrain; other region modules can opt in locally.
 * Ground beyond those authored corrections keeps the blend it was placed on.
 */
export function seamlessTerrainMix(x, z) {
  return blendHexes(x, z, WITHIN_TWO);
}
function blendHexes(x, z, offsets) {
  const home = hexAt(x, z);
  let total = 0, base = 0, amp = 0, wave = 0;
  const weights = { ...EMPTY_TERRAIN_WEIGHTS }, touched = [];
  const grounds = {};
  for (const [dq, dr] of offsets) {
    const q = home.q + dq, r = home.r + dr, centre = hexCentre(q, r);
    const weight = Math.max(0, 1 - Math.hypot(x - centre.x, z - centre.z) / (METRES_PER_HEX * 1.28));
    if (!weight) continue;
    const name = cellRegion.get(key(q, r)) ?? 'outland';
    const terrain = cellProfile(name, cellTerrain.get(key(q, r)));
    total += weight; base += terrain.base * weight; amp += terrain.amp * weight; wave += terrain.wave * weight;
    if (!weights[name]) touched.push(name);
    weights[name] += weight;
    grounds[terrain.ground] = (grounds[terrain.ground] ?? 0) + weight;
  }
  if (!total) return { base: REGION_TERRAIN.outland.base, amp: REGION_TERRAIN.outland.amp, wave: REGION_TERRAIN.outland.wave, weights, grounds };
  for (const name of touched) weights[name] /= total;
  for (const ground of Object.keys(grounds)) grounds[ground] /= total;
  return { base: base / total, amp: amp / total, wave: wave / total, weights, grounds };
}

export function relief(x, z, amp, wave) {
  const k = 6.2831853 / Math.max(20, wave);
  return amp * (Math.sin(x * k + z * k * .55) * .5 + Math.sin(x * k * .62 - z * k * 1.1) * .3 + Math.sin(x * k * 2.1 + z * k * 1.7) * .2);
}

// ---------------------------------------------------------------------------
// Signed distance to the coast, from the authored land hexes
// ---------------------------------------------------------------------------
const COAST_CELL = 4, COAST_MARGIN = 96;
/**
 * The lattice the coast is sampled on keeps one fixed phase — the one the seven
 * regions before Amod gave it. Growing the world at an edge then adds cells there
 * and moves no existing coastline by a fraction of a cell. Without this, adding a
 * region anywhere shifted every shore by a few centimetres, which was enough to
 * flip a seeded "is this stone above the tideline" test on the Solis downs and
 * reshuffle every field wall and olive tree after it.
 */
const COAST_PHASE = Object.freeze({ x: -1556.0019279391274, z: -704.3502691896258 });
const snapToCoast = (value, phase) => phase + Math.floor((value - phase) / COAST_CELL + 1e-9) * COAST_CELL;
const coast = (() => {
  const minX = snapToCoast(WORLD_BOUNDS.minX - COAST_MARGIN, COAST_PHASE.x), minZ = snapToCoast(WORLD_BOUNDS.minZ - COAST_MARGIN, COAST_PHASE.z);
  const columns = Math.ceil((WORLD_BOUNDS.maxX + COAST_MARGIN - minX) / COAST_CELL) + 1;
  const rows = Math.ceil((WORLD_BOUNDS.maxZ + COAST_MARGIN - minZ) / COAST_CELL) + 1;
  const land = new Uint8Array(columns * rows);
  for (let j = 0; j < rows; j++) for (let i = 0; i < columns; i++)
    land[j * columns + i] = isLandHex(minX + i * COAST_CELL, minZ + j * COAST_CELL) ? 1 : 0;
  const transform = seeds => {
    const distance = new Float32Array(columns * rows).fill(1e9);
    for (let i = 0; i < distance.length; i++) if (seeds[i]) distance[i] = 0;
    const straight = COAST_CELL, diagonal = COAST_CELL * Math.SQRT2;
    for (let j = 0; j < rows; j++) for (let i = 0; i < columns; i++) {
      const at = j * columns + i; let best = distance[at];
      if (i > 0) best = Math.min(best, distance[at - 1] + straight);
      if (j > 0) best = Math.min(best, distance[at - columns] + straight);
      if (i > 0 && j > 0) best = Math.min(best, distance[at - columns - 1] + diagonal);
      if (i < columns - 1 && j > 0) best = Math.min(best, distance[at - columns + 1] + diagonal);
      distance[at] = best;
    }
    for (let j = rows - 1; j >= 0; j--) for (let i = columns - 1; i >= 0; i--) {
      const at = j * columns + i; let best = distance[at];
      if (i < columns - 1) best = Math.min(best, distance[at + 1] + straight);
      if (j < rows - 1) best = Math.min(best, distance[at + columns] + straight);
      if (i < columns - 1 && j < rows - 1) best = Math.min(best, distance[at + columns + 1] + diagonal);
      if (i > 0 && j < rows - 1) best = Math.min(best, distance[at + columns - 1] + diagonal);
      distance[at] = best;
    }
    return distance;
  };
  const sea = new Uint8Array(land.length);
  for (let i = 0; i < land.length; i++) sea[i] = land[i] ? 0 : 1;
  const toSea = transform(sea), toLand = transform(land);
  let field = new Float32Array(land.length);
  for (let i = 0; i < land.length; i++) field[i] = land[i] ? toSea[i] : -toLand[i];
  // Two light smoothing passes turn the hexagonal edge into an ordinary coast.
  for (let pass = 0; pass < 2; pass++) {
    const next = new Float32Array(field.length);
    for (let j = 0; j < rows; j++) for (let i = 0; i < columns; i++) {
      let sum = 0, count = 0;
      for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
        const nj = j + dj, ni = i + di;
        if (nj < 0 || nj >= rows || ni < 0 || ni >= columns) continue;
        sum += field[nj * columns + ni]; count++;
      }
      next[j * columns + i] = sum / count;
    }
    field = next;
  }
  return { minX, minZ, columns, rows, field };
})();

function sampleCoast(x, z) {
  const fx = clamp((x - coast.minX) / COAST_CELL, 0, coast.columns - 1.0001);
  const fz = clamp((z - coast.minZ) / COAST_CELL, 0, coast.rows - 1.0001);
  const i = Math.floor(fx), j = Math.floor(fz), tx = fx - i, tz = fz - j;
  const at = (a, b) => coast.field[b * coast.columns + a];
  return lerp(lerp(at(i, j), at(i + 1, j), tx), lerp(at(i, j + 1), at(i + 1, j + 1), tx), tz);
}

/** Tidehaven's own beach, in the village's local frame: the old shoreline curve. */
export function villageShoreLocalZ(lx) {
  return 27.5 + Math.sin(lx * .055) * 2.8 + Math.cos(lx * .15) * .65;
}

/**
 * Metres inland from the coast; negative at sea. The Stills reach a little
 * inside Drent's easternmost hex so Tidehaven keeps its original bay and pier.
 */
export function landDistance(x, z) {
  const atlas = sampleCoast(x, z);
  // Keep the original village inlet local. Its old eastward-infinite carve
  // would drown the Drent peninsula beyond the harbor channel.
  const bay = smooth(-70, -26, z) * (1 - smooth(88, 132, z)) * (1 - smooth(50, 130, x));
  if (bay <= 0) return atlas;
  const local = worldToVillage(x, z);
  return lerp(atlas, Math.min(atlas, villageShoreLocalZ(local.x) - local.z), bay);
}

export const SEA_LEVEL = 0.06;

// ---------------------------------------------------------------------------
// The Caloss: the Drent–Luscia border river
// ---------------------------------------------------------------------------
export const CALOSS = Object.freeze({
  crossing: point(ANCHORS.calossCrossing.x, ANCHORS.calossCrossing.z),
  halfWidth: 7.4,
  points: Object.freeze([at(-556, -2), at(-482, 36), at(-424, 52), at(-386, 70),
    at(-345, 92.9), at(-306, 122), at(-266, 142), at(-222, 163), at(-182, 188)]),
});

/** Distance to the Caloss centre line, and the fraction of the way along it. */
export function calossDistance(x, z) {
  let best = Infinity;
  const points = CALOSS.points;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1], b = points[i], dx = b.x - a.x, dz = b.z - a.z;
    const t = clamp(((x - a.x) * dx + (z - a.z) * dz) / (dx * dx + dz * dz), 0, 1);
    best = Math.min(best, Math.hypot(x - a.x - dx * t, z - a.z - dz * t));
  }
  return best;
}

// ---------------------------------------------------------------------------
// Roads
// ---------------------------------------------------------------------------
// Keep both outpost gate approaches straight through their causeways. Sparse
// Catmull-Rom controls otherwise bow the road into the gate towers, especially
// where the road turns west across the parade ground.
const outpostRoadCentre = road(-549.2, 348.1);
const outpostRoadApproach = (toward, metres) => {
  const dx = toward.x - outpostRoadCentre.x, dz = toward.z - outpostRoadCentre.z;
  const length = Math.hypot(dx, dz);
  return point(outpostRoadCentre.x + dx / length * metres, outpostRoadCentre.z + dz / length * metres);
};
/** From Tidehaven's landing, through the forest, across the Caloss and west to the Moros. */
export const MAIN_ROAD = Object.freeze([
  // Tidehaven's own trail, point for point, turned onto Drent's coast.
  road(5, 29), road(-11, 29), road(-25, 29), road(-40, 30.6), road(-54, 27.3),
  road(-67, 29), road(-80, 30.5), road(-92, 29), road(-106, 40), road(-128, 34), road(-148, 21), road(-163, 26),
  road(-176, 29), road(-196, 25), road(-214, 30), road(-236, 30), road(-258, 39),
  road(-278, 52), road(-300, 64), road(-322, 78), road(-345, 92.9), road(-362, 107),
  road(-374, 124), road(-382, 142), road(-390, 162), road(-386, 182.9), road(-396, 202),
  road(-404, 222), road(-408, 228), road(-414, 242), road(-427, 259.4), road(-446, 276), road(-468, 292),
  road(-492, 308), road(-518, 326),
  ...[45, 31, 21, 11].map(metres => outpostRoadApproach(road(-518, 326), metres)),
  outpostRoadCentre,
  ...[11, 35, 50, 60, 70].map(metres => outpostRoadApproach(road(-596, 352), metres)),
  road(-596, 352), road(-648, 348),
  road(-700, 352), road(-752, 348), road(-772, 350),
]);

/** The first dry junction beyond the Caloss bridge, before the road turns south to Nothom. */
export const CALOSS_ROAD_FORK = MAIN_ROAD.find(p => p.x === road(-362, 107).x && p.z === road(-362, 107).z);

/** The branch that leaves the Lauvel for Elod's border post and the town beyond. */
export const SUVAL_ROAD = Object.freeze([
  road(-390, 162), road(-360, 178), road(-330, 196), road(-300, 216), road(-272, 240),
  road(-250, 262), road(-231, 283.6), road(-204, 298), road(-176, 308), road(-150, 318),
  road(-118, 332), road(-86, 346), road(-56, 358), road(-28, 368.5),
]);

/**
 * Solis, the walled city on West Suval's south-west coast. Its whole layout is
 * in its own frame, square to the world: `solisPoint(a, b)` is `a` metres east
 * and `b` metres south of the market cross, with the Gate of Sun Horses at
 * (0, -42) on the road from the border and the quay gate at (-50, -8) on the sea.
 * The centre is an authored point (the `solis` cluster); the rest is metres.
 */
export const SOLIS = Object.freeze({ name: 'Solis', centre: at(-297, 551), halfX: 50, halfZ: 42 });
export const solisPoint = (a, b) => point(SOLIS.centre.x + a, SOLIS.centre.z + b);

/** From the border stockade on the Moros, south-east over the downs to the Gate of Sun Horses. */
export const SOLIS_ROAD = Object.freeze([
  at(-368, 308), road(-370, 339), road(-363, 374), road(-353, 407.5), road(-339, 441), road(-324, 472), road(-308, 495.5),
  solisPoint(-2, -78), solisPoint(0, -56), solisPoint(0, -42), solisPoint(0, -34),
]);

/**
 * Built ground: a plane that overrides the natural relief inside its half
 * extents and fades back to it across `feather` metres. Solis stands on one,
 * rising gently from the quay to the Court of Oaths, so its walls keep one
 * height and its square is level enough to fight across.
 */
/**
 * Cobble's harbour terrace on Peblos: the shelf of made ground the village and
 * its quay stand on, between the beach of its bay and the rock behind. Low, so
 * the quay is two metres above the water and not a cliff over it.
 */
export const COBBLE_TERRACE = Object.freeze({ id: 'cobble', x: 334, z: 428, halfX: 11, halfZ: 13, feather: 24, level: 3, slopeX: .1, slopeZ: .03, shore: true });

/**
 * Elod's inner precinct stands on a levelled shelf of the rock above its
 * harbour: the natural ground there runs from twelve to nineteen metres and the
 * platform takes it to fifteen, which is a cut face on the landward side and a
 * revetment above the harbour. The feather is short on purpose — that revetment
 * is meant to read as built, not as a hillside (see src/content/regions/east-suval/east-suval.js).
 */
export const ELOD_TERRACE = Object.freeze({ id: 'elod-precinct', x: -37, z: 632, halfX: 10, halfZ: 20, feather: 9, level: 15, slopeX: 0, slopeZ: 0 });

/**
 * West Izol's made ground. Izol is rock: the coast is a run of hex-pointed
 * headlands with a small cove between each pair, and none of those coves has a
 * platform behind it. Every settled place on the island therefore stands on
 * ground somebody cut, which is why the Izoli have protocols for quarrying.
 * Izolveth's own terrace climbs from the quay at the water to the meeting house
 * at the back of the town; the other three are shelves the size of what stands
 * on them.
 */
export const IZOLVETH_TERRACE = Object.freeze({ id: 'izolveth', x: 58, z: 1782, halfX: 32, halfZ: 44, feather: 17, level: 7.6, slopeX: 0, slopeZ: .108, shore: true });
export const IZOL_CAMP_GROUND = Object.freeze({ id: 'izol-camp', x: 176, z: 1886, halfX: 42, halfZ: 28, feather: 22, level: 8.4, slopeX: 0, slopeZ: 0 });
export const ARDVETH_SHELF = Object.freeze({ id: 'ardveth', x: -88, z: 1818, halfX: 16, halfZ: 14, feather: 16, level: 3.8, slopeX: .06, slopeZ: 0, shore: true });
export const KELVATH_SHELF = Object.freeze({ id: 'kelvath', x: 250, z: 1748, halfX: 18, halfZ: 13, feather: 14, level: 3.4, slopeX: 0, slopeZ: .05, shore: true });

/** Ambron occupies dry interlake ground. The detailed outline follows the
 * lakes; these rectangular extents are only a broad-phase bound. */
export const AMBRON = Object.freeze({ name: 'Ambron', centre: point(-1130, 10), halfA: 220, halfB: 240, channelHalf: 0, hasChannel: false });
export const ambronPoint = (a, b) => point(AMBRON.centre.x + a, AMBRON.centre.z + b);
/** Made ground rises through the city districts to the northern royal precinct. */
export const AMBRON_TERRACE = Object.freeze({ id: 'ambron', x: AMBRON.centre.x, z: AMBRON.centre.z,
  halfX: AMBRON.halfA + 12, halfZ: AMBRON.halfB + 12, feather: 30, weightAt: ambronTerraceWeight, heightAt: ambronGroundLevel, level: 20, slopeX: .008, slopeZ: 0 });

export const TERRAIN_PADS = Object.freeze([
  Object.freeze({ id: 'solis', x: SOLIS.centre.x, z: SOLIS.centre.z, halfX: SOLIS.halfX + 13, halfZ: SOLIS.halfZ + 13, feather: 28, level: 6.5, slopeX: .05, slopeZ: 0 }),
  COBBLE_TERRACE, IZOLVETH_TERRACE, IZOL_CAMP_GROUND, ARDVETH_SHELF, KELVATH_SHELF,
  ELOD_TERRACE,
  AMBRON_TERRACE,
]);

/**
 * Where Tidehaven's wood gives out and the open road west begins. There was an army gate here
 * with a gatehouse, a guard hut and two footmen on it; the user took the whole place out on
 * 22 September 2026 - "it doesn't seem to fit there anymore" - and what is left is the vertex
 * itself, which the road, the journey and two other modules all measure from.
 */
const WOOD_EDGE_VERTEX = road(-176, 29);
export const ONWARD_ROAD = Object.freeze(MAIN_ROAD.slice(MAIN_ROAD.findIndex(p => p.x === WOOD_EDGE_VERTEX.x && p.z === WOOD_EDGE_VERTEX.z)));
/** The whole walkable road network, for the traversal smoke and the charts. */
export const ROAD_JUNCTION = road(-390, 162);

// ---------------------------------------------------------------------------
// Places along the road
// ---------------------------------------------------------------------------
/**
 * The edge of Tidehaven's wood, where the trees give out and the road runs on west into the
 * Avrel country. No gate, no gatehouse and nobody standing on it: a painted stone names the
 * ground on either side of it and that is the whole of the place now.
 *
 * `westX` is where the wood actually ends, six metres on - the line the old barrier stood on,
 * and still the line the walk out of Tidehaven is measured against.
 */
export const WOOD_EDGE = Object.freeze({ ...at(-176, 29), name: 'The Avrel road', westX: at(-182, 29).x,
  regionName: 'The Avrel clearing', open: true });
export const FERNWAY_REST = Object.freeze({ ...at(-128, 34), name: 'Fernway Rest' });
/** Drent's one farm clearing, cut out of the forest where the Avrel families work. */
export const AVREL_CLEARING = Object.freeze({ ...at(-236, 30), radius: 38 });

/**
 * Nothom, the market town at the centre of Luscia, between the field at
 * the Lauvel and the Moros Plain. The main road runs through its square, and
 * everything in the town is placed in the square's own frame: `a` metres along
 * the road toward the Moros, `b` metres across it to the east.
 */
export const LUMBER_TOWN = Object.freeze({
  name: 'Nothom', square: at(-408, 228), radius: 30,
  along: point(-0.4472, 0.8944), across: point(0.8944, 0.4472),
});
/** A point in Nothom's frame. */
export const townPoint = (a, b) => point(
  LUMBER_TOWN.square.x + LUMBER_TOWN.along.x * a + LUMBER_TOWN.across.x * b,
  LUMBER_TOWN.square.z + LUMBER_TOWN.along.z * a + LUMBER_TOWN.across.z * b);
/**
 * The stable yard at the town's south-west end, beside the road to the Moros: where the ostler stands and where the
 * traveler's horse is hitched when it is handed over (src/content/quests/roadside/ostler.js, src/gameplay/movement/riding.js). Keep 6 m round each clear.
 */
export const LUMBER_TOWN_STABLE = Object.freeze({
  stand: Object.freeze({ ...townPoint(23, 8), yaw: Math.atan2(-LUMBER_TOWN.across.x, -LUMBER_TOWN.across.z) }),   // facing the road
  hitch: Object.freeze({ ...townPoint(26.5, 10.5), yaw: Math.atan2(LUMBER_TOWN.along.x, LUMBER_TOWN.along.z) }),  // head toward the Moros
});

export const regionNpcPositions = Object.freeze({
  'meadow-courier': at(-230, 17),         // Corvan, army quartermaster, at the farm clearing
  // **Chip works from the Drent bank**, which is the bank a traveler arrives on. He used to stand
  // on the Luscia side, and when six paces of the span went into the river (src/world/terrain/world-regions.js)
  // that put the man who mends the bridge on the far side of his own break, reachable only by
  // swimming past him. A carpenter stages his timber where he can carry it from.
  // Level ground, measured: he stood three metres up the bridge abutment at at(-334, 88), and
  // talk range is a 3-D distance - a traveler a step away from him was 3.47 m off and could
  // not speak to him at all. Here the ground around him does not move by a centimetre.
  // Back from the bank as well as level. At at(-341, 90) he was close enough to the channel
  // that the company's stopped formation put a man in the Caloss - which is water now, and
  // was not when the stop was placed (tests/nobody-sealed-in.test.js).
  'crossing-keeper': at(-343, 72),        // Chip, on the flat short of the Caloss bridge
  'ridge-keeper': at(-372, 131),          // Sava, at her shrine on the Luscia side
  'relay-clerk': townPoint(5, -6),        // Iven, at the army relay post on Nothom's square
  // Nothom's people, around the square and the timber yard.
  'town-innkeeper': townPoint(-8, 4),
  'town-carter': townPoint(-2, 9),
  'town-elder': townPoint(-16, 2),
  'timber-stall': townPoint(8, 7),
  'town-sawyer': townPoint(4, 13),
  'town-yardhand': townPoint(0, 14),
  'town-beggar': townPoint(0, -4),        // Smiths, who wanders the square
  // Ben of the sorcerer's guild, on the square by the inn, asking anybody who looks capable
  // whether they have ever killed a spider (src/content/quests/spider/spider-quest.js). Measured: level ground,
  // six metres clear of the innkeeper, which is near enough to have taken a room and far
  // enough that the two prompts never argue.
  'ben-sorcerer': townPoint(-10, -2),
  // Captain Drevan's garrison keeps the Tessen road post in Pueth now (src/content/regions/pueth/pueth-world.js).
  // The field at the Lauvel and the burned hamlet, north-east of the town.
  'lauvel-picket': at(-392, 186),         // Talven, on the picket line
  'burial-searcher': at(-387, 198),       // Ilva, at the burial line
  'hamlet-drover': at(-344, 208),         // Garran, at the burned hamlet
});

export const journeySites = Object.freeze({
  'cart-parcel-1': Object.freeze({ id: 'cart-parcel-1', ...at(-252, 8), name: 'Cloth parcel', type: 'parcel', region: 2 }),
  'cart-parcel-2': Object.freeze({ id: 'cart-parcel-2', ...at(-259, 20), name: 'Provision parcel', type: 'parcel', region: 2 }),
  'cart-parcel-3': Object.freeze({ id: 'cart-parcel-3', ...at(-246, 2), name: 'Wax-sealed parcel', type: 'parcel', region: 2 }),
  'bridge-repair': Object.freeze({ id: 'bridge-repair', ...at(-345, 92.9), name: 'The Caloss bridge', type: 'bridge', region: 3 }),
  'beacon-west': Object.freeze({ id: 'beacon-west', ...at(-392, 132), name: 'First waymarker', type: 'beacon', region: 4 }),
  'beacon-east': Object.freeze({ id: 'beacon-east', ...at(-364, 150), name: 'Second waymarker', type: 'beacon', region: 4 }),
  'beacon-north': Object.freeze({ id: 'beacon-north', ...at(-404, 172), name: 'Third waymarker', type: 'beacon', region: 4 }),
  'bridge-debris-1': Object.freeze({ id: 'bridge-debris-1', ...at(-330, 76), name: 'Dry driftwood', type: 'sticks', quantity: 2, region: 3 }),
  // On the Drent bank with the other pile, and for the same reason as Chip: everything the
  // repair needs is on the side the repair is reached from.
  'bridge-debris-2': Object.freeze({ id: 'bridge-debris-2', ...at(-322, 70), name: 'Fallen branches', type: 'sticks', quantity: 2, region: 3 }),
  'meadow-fruit': Object.freeze({ id: 'meadow-fruit', ...at(-258, 46), name: 'Pawpaw windfalls', type: 'fruit', quantity: 2, region: 2 }),
  'river-fruit': Object.freeze({ id: 'river-fruit', ...at(-330, 130), name: 'Riverside pawpaws', type: 'fruit', quantity: 2, region: 3 }),
  'ridge-fruit': Object.freeze({ id: 'ridge-fruit', ...at(-412, 152), name: 'Sheltered pawpaws', type: 'fruit', quantity: 2, region: 4 }),
  'meadow-sticks': Object.freeze({ id: 'meadow-sticks', ...at(-216, 12), name: 'Dry branches', type: 'sticks', quantity: 2, region: 2 }),
  'ridge-sticks': Object.freeze({ id: 'ridge-sticks', ...at(-356, 128), name: 'Wind-fallen branches', type: 'sticks', quantity: 2, region: 4 }),
});

export const regionRepairBenches = Object.freeze([
  Object.freeze({ id: 'meadow-repair', ...at(-220, 40), name: 'Avrel clearing repair bench' }),
  Object.freeze({ id: 'crossing-repair', ...at(-368, 96), name: 'Caloss crossing repair bench' }),
  Object.freeze({ id: 'ridge-repair', ...at(-384, 138), name: 'Sava’s shrine repair bench' }),
]);

const fire = (x, z) => { const p = toWorld(x, z); return { fireX: p.x, fireZ: p.z }; };
export const regionFirePits = Object.freeze([
  Object.freeze({ id: 'meadow-fire', ...at(-212, 40), ...fire(-212, 41.5) }),
  Object.freeze({ id: 'crossing-fire', ...at(-370, 118), ...fire(-371.4, 118.6) }),
  Object.freeze({ id: 'ridge-fire', ...at(-398, 146), ...fire(-399.4, 146.6) }),
]);

/** The marked fishing bank on the Caloss, upstream of the bridge. */
export const CALOSS_BANK = Object.freeze({ spot: at(-306, 104), cast: at(-300, 114) });

export const regionLandmarks = Object.freeze([
  Object.freeze({ id: 'sunmeadow', name: 'The Avrel Clearing', ...at(-236, 30), description: 'The one farm clearing cut out of Drent’s forest: a cottage, a mill, a barn and byre, and five fields of wheat on the rim of it.' }),
  Object.freeze({ id: 'old-mill', name: 'The Clearing Mill', ...at(-227, 57), description: 'Slow canvas sails turn above the Avrel grain rows and a stone-lined well.' }),
  Object.freeze({ id: 'reedwater', name: 'Caloss Crossing', ...at(-334, 84), description: 'The road drops to the Caloss. Drent ends on this bank; Luscia begins on the far one.' }),
  Object.freeze({ id: 'reed-bridge', name: 'The Caloss Bridge', ...at(-345, 92.9), description: 'An old timber bridge crosses the border river. Its sound eastern walkway remains passable.' }),
  Object.freeze({ id: 'reedwater-bank', name: 'The Quiet Bank', ...at(-306, 104), description: 'A rod rest and a low stool mark a sheltered place to fish the slow water.' }),
  Object.freeze({ id: 'river-camp', name: 'The Reedcutters’ Camp', ...at(-372, 116), description: 'Drying reeds, tied boats, and a small raised shelter stand above the Luscian bank.' }),
  Object.freeze({ id: 'threefold', name: 'Sava’s Shrine', ...at(-377, 138), description: 'A swept step, clean water and straight road stones on the first open ground of Luscia.' }),
  Object.freeze({ id: 'beacon-ridge', name: 'The Three Waymarkers', ...at(-386, 152), description: 'Three reflective road stones once guided every traveler between the Caloss and the Lauvel.' }),
  Object.freeze({ id: 'north-relay', name: 'The Lauvel Relay', ...at(-401, 196), description: 'The army’s old relay hut, empty since the clerk moved his desk down to Nothom’s square.' }),
  Object.freeze({ id: 'lumber-town', name: 'Nothom', ...at(-408, 228), radius: 26, description: 'Luscia’s market town between its two palisade gates: a square of stalls and a well, an inn, a smithy and a hall, the timber yard above the sawpits, the stable yard, and the army’s relay post on the corner.' }),
  // Story hooks placed as scenery for the chapter that follows.
  Object.freeze({ id: 'lauvel-field', name: 'The Field at the Lauvel', ...at(-386, 182.9), description: 'Broken carts, a fallen banner and a burial line: ten days ago the army met a rebel army here.' }),
  Object.freeze({ id: 'burned-hamlet', name: 'The Burned Hamlet', ...at(-348, 212), description: 'Four roofless walls and a standing chimney. Nobody has come back to clear the ash.' }),
  Object.freeze({ id: 'moros-gate', name: 'The Moros Road', ...at(-427, 259.4), description: 'An open road beyond the southwest gate of Nothom, where the last copse gives way to the plain. West of here the grass runs to the horizon.' }),
  Object.freeze({ id: 'legion-camp', name: 'The Army Camp', ...at(-549.2, 348.1), description: 'The Ambroni outpost at the heart of the Moros: a ditch, a timber palisade on its rampart, towers, ordered tent lines and the Marshal’s standard.' }),
  Object.freeze({ id: 'moros-stockade', name: 'The Border Stockade', ...at(-368, 308), description: 'The small timber work the army and the republic both want: a ditch, a rampart with a fighting platform, corner towers and a truce flag.' }),
  Object.freeze({ id: 'suval-border-post', name: 'Elod’s Border Post', ...at(-224, 292), description: 'Elod’s old barrier across the road, behind the stone frontier that now shuts East Suval.' }),
  Object.freeze({ id: 'old-waystation', name: 'The Roofless Waystation', ...at(-154, 328), description: 'A leaning stone arch and a few paving slabs outlast a forgotten roadside shelter.' }),
  Object.freeze({ id: 'elod-gate', name: 'The Sea-Road Gate of Elod', ...at(-28, 368.5), radius: 12,
    description: 'Where the stone road ends: two piers of grey ashlar, a lintel with three lines of Koleth cut across it, and a gate that has been shut for three years. The cutting says what the road is for and not one word about who may use it. Beyond it the city steps down its rock to the water.' }),
  Object.freeze({ id: 'bandit-lookout', name: 'The Hill Lookout', ...at(-74, 498), description: 'A ring of ridge stones above the southern hills. Somebody watches the road from here, but not today.' }),
]);

/** Scenery-and-stand hooks the next chapter will use. Positions only. */
export const STORY_SITES = Object.freeze({
  lauvelField: at(-386, 182.9), burnedHamlet: at(-348, 212), morosGate: at(-427, 259.4),
  legionCamp: at(-549.2, 348.1), morosStockade: at(-368, 308), horseHitch: at(-566, 320),
  suvalBorderPost: at(-224, 292), waystation: at(-154, 328), elodGate: at(-28, 368.5),
  banditLookout: at(-74, 498),
});

/**
 * The army’s rope line west of the camp. It was the end of the built world until Nesdor was
 * built beyond it; it stays where it is, as an Ambroni line inside a country the Empire does
 * not hold (docs/design-answers.md). Nothing about it moves: only what it is called.
 */
export const FRONTIER = Object.freeze({ ...at(-776, 350), barrierX: at(-782, 350).x, name: 'The Army’s Line',
  regionName: 'An Ambroni line across the Nesdor Flats, in a country the Empire does not hold' });

// ---------------------------------------------------------------------------
// Regions
// ---------------------------------------------------------------------------
function outlineBounds(loops) {
  const points = loops.flat();
  return { minX: Math.min(...points.map(p => p.x)), maxX: Math.max(...points.map(p => p.x)),
    minZ: Math.min(...points.map(p => p.z)), maxZ: Math.max(...points.map(p => p.z)) };
}

const REGION_TEXT = {
  Urubond:{subtitle:'The island beyond the charts',spawn:point(-3500,-3160),description:'Black volcanic cliffs and empty ash valleys surround a towering, broken caldera. Nothing stirs on the shore.',palette:{ground:'#393a40',accent:'#b77559',fog:'#6d6774',sky:0x777481,haze:0x6d6574,hazeDensity:.0018},npcIds:[],landmarks:['urubond-shore']},
  ...Object.fromEntries(OUTER_PROFILES.map(p=>{const cells=REGION_CELLS[p.name].filter(c=>!['ocean','lake'].includes(c.terrain)),bounds=outlineBounds(REGION_OUTLINES[p.name]),cx=(bounds.minX+bounds.maxX)/2,cz=(bounds.minZ+bounds.maxZ)/2,sorted=[...cells].sort((a,b)=>Math.hypot(a.x-cx,a.z-cz)-Math.hypot(b.x-cx,b.z-cz)),c=sorted.find(c=>!['mountain','ice'].includes(c.terrain))??sorted[0];return [p.name,{subtitle:p.features[0],description:p.features.join(', ')+'. A wild landscape of '+p.kind.replace('-',' ')+' country.',spawn:point(c.x,c.z),palette:{ground:p.ground,accent:p.stone,fog:p.kind==='dark'?'#3e4e48':'#a5b7b3',sky:p.kind==='dark'?0x738880:0xaec8ce,haze:p.kind==='dark'?0x42554b:0xb6c6c3,hazeDensity:p.kind==='dark'?.013:.0035},npcIds:[],landmarks:p.features.map((_,i)=>'outer-'+p.id+'-'+i)}];})),
  Babon: {subtitle:'The ancient jungle island',spawn:point(-1320,2798),description:'A sheltered northeastern coastal plain gives way to steep jungle ridges, ancient buttressed trees and secluded rocky shores. Great island reptiles patrol the deeper forest.',palette:{ground:'#637653',accent:'#d2d9a3',fog:'#a6bca8',sky:0xb5d2cb,haze:0xa6bca8,hazeDensity:.0037},npcIds:[],landmarks:[]},
  "Cape Thalmagar": {subtitle:"The Windward Heath",spawn:hexCentre(-3,78),description:'The Windward Heath: open nature, layered vegetation and persistent wild animals.',palette:{ground:'#929c79',accent:'#d8d1ab',fog:'#bdcbb9',sky:0xb5cdd0,haze:0xbdcbb9,hazeDensity:.0016},npcIds:[],landmarks:[]},
  "Acor Wetlands": {subtitle:"The Clay Hummocks",spawn:hexCentre(7,80),description:'The Clay Hummocks: open nature, layered vegetation and persistent wild animals.',palette:{ground:'#718559',accent:'#d8d1ab',fog:'#bdcbb9',sky:0xb5cdd0,haze:0xbdcbb9,hazeDensity:.0016},npcIds:[],landmarks:[]},
  "West Acorwood": {subtitle:"The Alder Fringe",spawn:hexCentre(13,80),description:'The Alder Fringe: open nature, layered vegetation and persistent wild animals.',palette:{ground:'#667e52',accent:'#d8d1ab',fog:'#bdcbb9',sky:0xb5cdd0,haze:0xbdcbb9,hazeDensity:.0016},npcIds:[],landmarks:[]},
  "South Acordwood": {subtitle:"The Mast Hollows",spawn:hexCentre(17,84),description:'The Mast Hollows: open nature, layered vegetation and persistent wild animals.',palette:{ground:'#77864c',accent:'#d8d1ab',fog:'#bdcbb9',sky:0xb5cdd0,haze:0xbdcbb9,hazeDensity:.0016},npcIds:[],landmarks:[]},
  "North Acorwood": {subtitle:"The Old Acor Vault",spawn:hexCentre(20,77),description:'The Old Acor Vault: open nature, layered vegetation and persistent wild animals.',palette:{ground:'#5d7650',accent:'#d8d1ab',fog:'#bdcbb9',sky:0xb5cdd0,haze:0xbdcbb9,hazeDensity:.0016},npcIds:[],landmarks:[]},
  "East Acordwood": {subtitle:"The Fern Valleys",spawn:hexCentre(24,79),description:'The Fern Valleys: open nature, layered vegetation and persistent wild animals.',palette:{ground:'#789461',accent:'#d8d1ab',fog:'#bdcbb9',sky:0xb5cdd0,haze:0xbdcbb9,hazeDensity:.0016},npcIds:[],landmarks:[]},
  "South Endevor": {subtitle:"The Sedge Swales",spawn:hexCentre(13,74),description:'The Sedge Swales: open nature, layered vegetation and persistent wild animals.',palette:{ground:'#8e9c66',accent:'#d8d1ab',fog:'#bdcbb9',sky:0xb5cdd0,haze:0xbdcbb9,hazeDensity:.0016},npcIds:[],landmarks:[]},
  "West Endevor": {subtitle:"The Shale Heath",spawn:hexCentre(9,72),description:'The Shale Heath: open nature, layered vegetation and persistent wild animals.',palette:{ground:'#929275',accent:'#d8d1ab',fog:'#bdcbb9',sky:0xb5cdd0,haze:0xbdcbb9,hazeDensity:.0016},npcIds:[],landmarks:[]},
  "North Endevor": {subtitle:"The Birch Horizon",spawn:hexCentre(15,69),description:'The Birch Horizon: open nature, layered vegetation and persistent wild animals.',palette:{ground:'#8e9d70',accent:'#d8d1ab',fog:'#bdcbb9',sky:0xb5cdd0,haze:0xbdcbb9,hazeDensity:.0016},npcIds:[],landmarks:[]},
  "East Endevor": {subtitle:"The Eastern Grass Folds",spawn:hexCentre(20,71),description:'The Eastern Grass Folds: open nature, layered vegetation and persistent wild animals.',palette:{ground:'#829460',accent:'#d8d1ab',fog:'#bdcbb9',sky:0xb5cdd0,haze:0xbdcbb9,hazeDensity:.0016},npcIds:[],landmarks:[]},
  'East Oremindi Mountains': {subtitle:'The Eastern Cirques',spawn:hexCentre(-10,96),description:'Cold upland wilderness with distinct ridges, natural traverses and persistent wildlife. Settlements and quests remain for later.',palette:{ground:'#899582',accent:'#d8ded0',fog:'#c3d0d1',sky:0xb2c9d7,haze:0xc3d0d1,hazeDensity:.0014},npcIds:[],landmarks:[]},
  'North Oreminidi Mountains': {subtitle:'The Northern Ice Saddle',spawn:hexCentre(-4,87),description:'Cold upland wilderness with distinct ridges, natural traverses and persistent wildlife. Settlements and quests remain for later.',palette:{ground:'#899582',accent:'#d8ded0',fog:'#c3d0d1',sky:0xb2c9d7,haze:0xc3d0d1,hazeDensity:.0014},npcIds:[],landmarks:[]},
  'Lesser Oremindi Mountains': {subtitle:'The Folded Crags',spawn:hexCentre(0,84),description:'Cold upland wilderness with distinct ridges, natural traverses and persistent wildlife. Settlements and quests remain for later.',palette:{ground:'#899582',accent:'#d8ded0',fog:'#c3d0d1',sky:0xb2c9d7,haze:0xc3d0d1,hazeDensity:.0014},npcIds:[],landmarks:[]},
  'Cudon': {subtitle:'The Cold Pass Approach',spawn:hexCentre(-4,80),description:'Cold upland wilderness with distinct ridges, natural traverses and persistent wildlife. Settlements and quests remain for later.',palette:{ground:'#899582',accent:'#d8ded0',fog:'#c3d0d1',sky:0xb2c9d7,haze:0xc3d0d1,hazeDensity:.0014},npcIds:[],landmarks:[]},
  'Narcosh': {subtitle:'The Lake Ledges',spawn:hexCentre(3,82),description:'Cold upland wilderness with distinct ridges, natural traverses and persistent wildlife. Settlements and quests remain for later.',palette:{ground:'#899582',accent:'#d8ded0',fog:'#c3d0d1',sky:0xb2c9d7,haze:0xc3d0d1,hazeDensity:.0014},npcIds:[],landmarks:[]},
  'South Celder': {subtitle:'The horse plain under the mountains',spawn:point(-2450,-750.5),description:'Open grass plain on the western margin of the Mittoli country, falling gently from the foothills under the Oremindi in low swells, with silt fans at the foot of the hills and the West Lotharn along its eastern side. Its water leaves by one dry gravel head at the corner with North Celder, where the Celder water rises.',palette:{ground:'#8e9a57',accent:'#d6cd96',fog:'#b9c4a6'},npcIds:[],landmarks:["south-celder-head","south-celder-foothills","south-celder-silt-fan","south-celder-lotharn-foot"]},
  'North Celder': {subtitle:'The northern horse plain',spawn:point(-2500,-1183.5),description:'Grass plain and grassland falling east from the foothills under the East Oremindi to the Mithala border water: the West Arm along its north-eastern edge and the Celder water along its south-eastern one, both fast, cold and wadeable over gravel.',palette:{ground:'#86955a',accent:'#d6cd96',fog:'#b9c4a6'},npcIds:[],landmarks:["north-celder-west-arm-bank","north-celder-celder-water-bank","north-celder-silt-fans","north-celder-foothills","north-celder-open-plain","canerd"]},
  'East Izol': {subtitle:'The eastern half of the island of Izol',spawn:point(500,1934),description:'Rock and pasture rising from a cliffed headland coast to the Three Presences: a dome on the island\'s one mountain, a horn and a tilted block, each with a level summit and one shoulder a walker can climb. A central plain where the Hearth Road ends, wooded folds on the eastern fall with dry gullies in them, pocket coves, and two bays with a flat behind each, the east one facing the open sea.',palette:{ground:'#8f9471',accent:'#d8cfa4',fog:'#b8c2b6'},npcIds:[],landmarks:["east-izol-central-plain","east-izol-northern-presence","east-izol-eastern-presence","east-izol-southern-presence","east-izol-east-bay","east-izol-folds","east-izol-north-arm","east-izol-east-head","east-izol-south-head"]},
  'Alezhor': {subtitle:'The gold coast below the Ibenwood',spawn:point(-4100,870),description:'A cool Mediterranean coastal strip between the open ocean and the Ibenwood: a plain of grass over the head of a bay, rising to the tree line, where the gold river comes out of the forest hills in three falls to a gravel ford and a short estuary; a west lobe of strand and dunes where the west stream comes down to the sea; and the narrow south, tilted down from the Alezhor Water to its cliffs and coves.',palette:{ground:'#8d9c64',accent:'#d9cf9c',fog:'#b6c4b0'},npcIds:[],landmarks:["alezhor-gold-falls","alezhor-gold-estuary","alezhor-gold-flat","alezhor-bay-head","alezhor-tree-line","alezhor-west-mouth","alezhor-dunes","alezhor-southern-cliffs","alezhor-water-bank","alezhor-gulf-head"]},
  'South Ibenal': {subtitle:'The southern corridor between the sea and the forest',spawn:point(-4530,425),description:'A summer-dry coastal plain between the open western ocean and West Ibenwood: grass rising from a low terrace behind the shore to the forest’s own level at the tree line, crossed at angles by small streams out of the forest in shallow vales to little bays, with dunes in the warm south-west and low rocks at the points.',palette:{ground:'#8f9c63',accent:'#d8cf9c',fog:'#b7c5b2'},npcIds:[],landmarks:["south-ibenal-alezhor-bank","south-ibenal-dunes","south-ibenal-forest-stream","south-ibenal-narrow-south","south-ibenal-south-mouth","south-ibenal-tree-line","south-ibenal-middle-mouth","south-ibenal-rocky-point","south-ibenal-north-meadow","south-ibenal-open-plain","south-ibenal-border-ford"]},
  'North Ibenal': {subtitle:'The corridor’s cold end, to the Narrows',spawn:point(-4150,-140),description:'The colder northern end of the corridor: the plain at its widest under North Ibenwood, the last stream in a deeper vale, a rockier and more exposed coast, and the Narrows, where the plain pinches between the sea and the Oremindi to a flat way ending under a rounded foothill.',palette:{ground:'#879a63',accent:'#d4cfa2',fog:'#b3c2b4'},npcIds:[],landmarks:["north-ibenal-border-mouth","north-ibenal-open-plain","north-ibenal-tree-line","north-ibenal-last-vale","north-ibenal-rocky-shore","north-ibenal-last-mouth","north-ibenal-mountain-foot","north-ibenal-narrows","north-ibenal-narrows-end","north-ibenal-foothill"]},
  'Henborth': {subtitle:'The high plain under the northern passes',spawn:point(-2400,-1700),description:'Open continental grass north of Celder and the Mithala, standing a little above the Mithala and rising gently toward the Oremindi and Narcosh in long low swells: three firmer, slightly raised ways run up to the mountain foot where the passes leave the plain, the drainage between them is poor and the snowmelt stands in shallow damp hollows into the summer, and dry knolls of thin, stony soil stand out of the pasture.',palette:{ground:'#8d9a5c',accent:'#d4cd98',fog:'#b8c3a8'},npcIds:[],landmarks:["henborth-open-plain","henborth-celder-margin","henborth-main-approach","henborth-eastern-approach","henborth-western-spur","henborth-cranberry-bog","henborth-sedge-hollow","henborth-middle-hollow","henborth-wet-corner","henborth-dry-knoll","henborth-lichen-knoll","henborth-oremindi-foot"]},
  'East Pyros': {subtitle:'The volcanic uplands',spawn:point(-2815,1115),description:'Low volcanic ridges, dry eastern grasslands and sheltered woods above the Vaellir.',palette:{ground:'#9e9c61',accent:'#d8cc9e',fog:'#c6c8b7',sky:0xb9d0d3,haze:0xc6c8b7,hazeDensity:.0022},npcIds:[],landmarks:["pyra","east-pyra","pyra-golden-bridge","pyra-palace","east-pyros-talermolis","east-pyros-warm-spring","east-pyros-green-spring","east-pyros-ash-columns","east-pyros-red-stone","east-pyros-pumice","east-pyros-southern-grass"]},
  'Nether Desert': {subtitle:'The rain-shadow country',spawn:point(-2844,694),description:'Fractured stone, gravel exposures and dry washes between Ibenwood and the inner river country.',palette:{ground:'#9b9075',accent:'#e5d2a0',fog:'#d7caae',sky:0xc3d3d8,haze:0xd7caae,hazeDensity:.002},npcIds:[],landmarks:["nether-split-back","nether-rain-pan","nether-scrub-wash","nether-nethward"]},
  Legemum: {subtitle:'The green headlands',spawn:point(-1970,1535),description:'Rolling green hills, wooded folds, mineral-bearing stone and weathered coastal headlands.',palette:{ground:'#82966b',accent:'#d5d4ac',fog:'#c5d2ce',sky:0xb3d6e0,haze:0xc5d2ce,hazeDensity:.0035},npcIds:[],landmarks:["legemum-tin-saddle","legemum-west-headland","legemum-haur","legemum-peat-hollow","legemum-alder-fold","legemum-south-tor"]},
  Yunethre: { subtitle: 'The grass passage between the mountains', spawn: hexCentre(-14, 102), description: 'Independent centaur plains between the Lotharn and Oremindi, a lakeside free town and the nomadic camp. The neutral town welcomes humans, elves and centaurs.', palette: { ground: '#a4a363', accent: '#e4d8ae', fog: '#cbd1ad', sky: 0xb3cbd3, haze: 0xcbd1ad, hazeDensity: .0017 }, npcIds: [], landmarks: [] },
  'West Oremindi Mountains': { subtitle: 'The hidden ways of the western mountains', spawn: hexCentre(-18,96), description: 'Dangerous sea cliffs, sheltered woodland and high alpine passes. Ancient broken masonry disappears beneath the mountain; its surviving stories are uncertain.', palette: {ground:'#818b83',accent:'#c5cdc6',fog:'#bcc9ca',sky:0xaec2ca,haze:0xbcc9ca,hazeDensity:.0016},npcIds:[],landmarks:[] },
  'West Baldro Mountains': { subtitle: 'The exposed ridges above the West Hold', spawn: hexCentre(46, 68), description: 'Cold ridges and rock basins above one of the two surviving independent dwarf city kingdoms. The West Hold belongs to the confederation of Dwarfland, with working halls beside closed and abandoned districts. Its gate opens to travelers who have earned the kingdom\'s trust.', palette: { ground: '#818575', accent: '#b4b5a4', fog: '#bdc8c8', sky: 0xa9bdcb, haze: 0xbdc8c8, hazeDensity: .0021 }, npcIds: [], landmarks: [] },
  'East Baldro Mountains': { subtitle: 'The wooded valleys above the East Hold', spawn: hexCentre(51, 70), description: 'Sheltered cold woods rise into joined mountain shoulders above the other surviving independent dwarf city kingdom. The East Hold belongs to Dwarfland while keeping its own sovereignty, with busy workshops and silent old quarters beneath the range. Entry must be earned here separately.', palette: { ground: '#718065', accent: '#adb497', fog: '#b8c8c0', sky: 0xafc5ce, haze: 0xb8c8c0, hazeDensity: .0025 }, npcIds: [], landmarks: [] },
  'South Oremindi Mountains': { subtitle: 'The high range above Ibenwood', spawn: hexCentre(-19, 102), description: 'High mountains and cold hill approaches above Ibenwood, with alpine lake basins, tundra and permanent ice. This environment builds the terrain and wildlife; Inquest Clearlistern has a secluded cottage, while the campaign chapter remains unfinished. Sevron is hidden in the western range.', palette: { ground: '#89908f', accent: '#e2e7df', fog: '#c7d4d8', sky: 0xb2c9d7, haze: 0xc7d4d8, hazeDensity: .0018 }, npcIds: [], landmarks: [] },
  'East Ibenwood': { subtitle: 'The eastern woodland margin', spawn: hexCentre(-19, 110), description: 'Dense ancient forest and separated elven groves. Persistent rangers defend the marked inner belt; exceptional stealth can bypass them. Permission quests, dimensional withdrawal and civilian life remain unfinished.', palette: { ground: '#617548', accent: '#d8d4ae', fog: '#a1b59b', sky: 0xabc6bb, haze: 0xa1b59b, hazeDensity: .0036 }, npcIds: [], landmarks: [] },
  'North Ibenwood': { subtitle: 'The cold northern boughs', spawn: hexCentre(-21, 105), description: 'Dense ancient forest and separated elven groves. Persistent rangers defend the marked inner belt; exceptional stealth can bypass them. Permission quests, dimensional withdrawal and civilian life remain unfinished.', palette: { ground: '#627951', accent: '#d8d4ae', fog: '#a1b59b', sky: 0xabc6bb, haze: 0xa1b59b, hazeDensity: .0036 }, npcIds: [], landmarks: [] },
  'South Ibenwood': { subtitle: 'The southern river woods', spawn: hexCentre(-25, 113), description: 'Dense ancient forest and separated elven groves. Persistent rangers defend the marked inner belt; exceptional stealth can bypass them. Permission quests, dimensional withdrawal and civilian life remain unfinished.', palette: { ground: '#536e48', accent: '#d8d4ae', fog: '#a1b59b', sky: 0xabc6bb, haze: 0xa1b59b, hazeDensity: .0036 }, npcIds: [], landmarks: [] },
  'West Ibenwood': { subtitle: 'Moss and old stone', spawn: hexCentre(-29, 111), description: 'Dense ancient forest and separated elven groves. Persistent rangers defend the marked inner belt; exceptional stealth can bypass them. Permission quests, dimensional withdrawal and civilian life remain unfinished.', palette: { ground: '#526747', accent: '#d8d4ae', fog: '#a1b59b', sky: 0xabc6bb, haze: 0xa1b59b, hazeDensity: .0036 }, npcIds: [], landmarks: [] },
  'Central Ibenwood': { subtitle: 'The forest heart', spawn: hexCentre(-23, 110), description: 'Dense ancient forest and separated elven groves. Persistent rangers defend the marked inner belt; exceptional stealth can bypass them. Permission quests, dimensional withdrawal and civilian life remain unfinished.', palette: { ground: '#4b6344', accent: '#d8d4ae', fog: '#a1b59b', sky: 0xabc6bb, haze: 0xa1b59b, hazeDensity: .0036 }, npcIds: [], landmarks: [] },
  'Iscare Archipeligo': {subtitle:'The burned island passages', spawn:point(-650,1155), description:'Low islands, shoals and narrow sea channels. Zecron and the small settlements were burned by the Blood Prince; only ruins and returning wildlife remain.', palette:{ground:'#909477',accent:'#d9caaa',fog:'#b8c4b9',sky:0xadc9d1,haze:0xb8c4b9,hazeDensity:.005}, npcIds:[],landmarks:['zecron-ruins','iscare-hamlets']},
  Drent: { subtitle: 'The forest coast and Tidehaven', spawn: at(-15, 29),
    description: 'All of Drent is broadleaf forest: ferns, sorrel and deer, with Tidehaven on the eastern shore, one farm clearing inland, and the ruins of Rena at its centre, where the region’s principal town stood until eighty years ago.',
    palette: { ground: '#4d7a3e', accent: '#c9d3a0', fog: '#b6c6ad' },
    npcIds: ['meadow-courier', 'commons-miller', 'rena-lorn', 'rena-hesta', 'apple-reeve', 'cobble-ari'],
    landmarks: ['sunmeadow', 'old-mill', 'mill-commons', 'rena-ruins', 'applegarth', 'east-rena-stone'] },
  Luscia: { subtitle: 'Across the Caloss', spawn: at(-362, 110),
    description: 'Rolling grass and thinning copses beyond the border river: the shrines of the valley, Nothom on the road, and the field at the Lauvel.',
    palette: { ground: '#8fa35a', accent: '#dfc77d', fog: '#bdc9b5' },
    npcIds: ['crossing-keeper', 'ridge-keeper', 'relay-clerk', 'reed-worker', 'town-innkeeper', 'timber-stall', 'town-sawyer', ...PORT_CALOS_REGION_IDS],
    landmarks: ['reedwater', 'reed-bridge', 'reedwater-bank', 'river-camp', 'landing-workshop', 'threefold', 'beacon-ridge', 'north-relay', 'lauvel-field', 'lumber-town', 'burned-hamlet'] },
  'Moros Plain': { subtitle: 'The army’s open country', spawn: at(-452, 278),
    description: 'Flat treeless grassland under an enormous sky. The army camp is visible from a long way off, and horses graze the line.',
    palette: { ground: '#b9b36c', accent: '#e4d59a', fog: '#cfd3b4' },
    npcIds: [], landmarks: ['moros-gate', 'legion-camp', 'moros-stockade'] },
  // East Suval is closed (src/world/travel/closed-border.js): its spawn is the city, which is
  // where the developer tools and the testing panel set a tester down.
  'East Suval': { subtitle: 'Stone hills and Elod', spawn: point(-56, 636),
    description: 'Pale limestone and thin soil, aromatic scrub, dry terraces and field walls, and an eastern coast with harder weather than the west. Elod stands on its shelf above the water and has closed its country to stay out of the war; its black-clad pickets turn back anyone who tries to cross.',
    palette: { ground: '#9b9d85', accent: '#e1d1a7', fog: '#bbc6bf' },
    npcIds: ['shelter-keeper', 'elod-harbourmaster', 'elod-warden', 'elod-theologian', 'elod-priest', 'elod-factor', 'elod-scribe-master', 'suval-lightkeeper'],
    landmarks: ['suval-border-post', 'old-waystation', 'waystation-shelter', 'elod-gate', 'bandit-lookout',
      'the-threshold', 'elod-inner-gate', 'elod-sea-gate', 'elod-quay', 'elod-harbour-quarter',
      'frontier-guard-house', 'north-light', 'sorrow-beach', 'sevenwalls', 'shepherds-cistern'] },
  'West Suval': { subtitle: 'The coast downs and Solis', spawn: road(-353, 407.5),
    description: 'Rolling coastal grass, thorn and olive, field walls of pale stone, and Solis on its terraces above the sea: once a kingdom’s capital, then the Empire’s, and for a few days now the Coalition’s.',
    palette: { ground: '#a9a95c', accent: '#e8cf8e', fog: '#c9d0bd' },
    npcIds: ['solis-gate-captain', 'solis-merchant'], landmarks: ['west-suval-border', 'shepherds-fold', 'old-watchtower', 'wayside-well', 'coalition-camp', 'solis'] },
  // Pueth is authored in world metres (src/content/regions/pueth/pueth-world.js); its spawn is the Tessen road post.
  Pueth: { subtitle: 'Across the Tessen', spawn: point(-137, -214),
    description: 'Cold timber country north of Drent: birch and fir by the Tessen, open valley grass, bare hills toward Feradom, and Rimeholt on the road north.',
    palette: { ground: '#7f9175', accent: '#d9dccb', fog: '#b9c4c4' },
    npcIds: ['garrison-captain', 'garrison-casso', 'garrison-brill', 'rimeholt-reeve', 'rimeholt-innkeeper', 'rimeholt-foreman', 'rimeholt-carter', 'rimeholt-trapper', 'rimeholt-sentry'],
    landmarks: ['tessen-bridge', 'tessen-post', 'tessen-shallows', 'bramble-scout-camp', 'birch-landing', 'rimeholt', 'grey-shoulder', 'cold-hearth', 'ordel-mouth', 'feradom-road'] },
  // Amod is authored in world metres (src/content/regions/amod/amod-world.js); its spawn is the pass stones on the road in from Pueth.
  Amod: { subtitle: 'The terrace country', spawn: point(-676, -474),
    description: 'Foothills south of the Lotharn, ribbed from the stream beds to the chestnut woods with dry-stone terraces that the same families have rebuilt for eight hundred years. Water is the law here and the water courts keep it; there is no crown, only the Terrace Compact. Ostel is the first town on the road in, dry-slope stone and hard white wine.',
    palette: { ground: '#9aa169', accent: '#e0cf9a', fog: '#c6c7ac' },
    npcIds: ['ostel-measure-keeper', 'ostel-stonecutter', 'ostel-roadhouse', 'ostel-accountant', 'ostel-clerk', 'ostel-vintner'],
    landmarks: ['amod-pass-stones', 'amod-toll-stone', 'amod-first-terrace', 'amod-pueth-view', 'amod-culvert', 'tarvel-bridge', 'ostel', 'ostel-spring', 'tir-ostel', 'vessen', 'dromel-gate', 'tarvel-head', 'kelmod-road',
      'varn', 'varn-pass-gate', 'varn-citadel', 'varn-market', 'varn-amod-gate'] },
  // Peblos is authored in world metres too (src/content/regions/peblos/peblos-world.js); its spawn is the quay the boatman lands at.
  Peblos: { subtitle: 'The islands off the Drent coast', spawn: point(316, 428),
    description: 'Low barrier islands south-east of Drent, an hour under oars from Tidehaven: salt grass and thrift, grey rock at the waterline, gulls, and one fishing village on the quay at Cobble.',
    palette: { ground: '#76855f', accent: '#e7e0c0', fog: '#bdcdc9' },
    npcIds: ['cobble-boatwright', 'cobble-ledgerkeeper', 'cobble-kelp-trader', 'cobble-weighmaster', 'bee-keeper',
      'peblos-decurion', 'peblos-legionary-1', 'peblos-legionary-2', 'peblos-legionary-3', 'cobble-harbourmaster'],
    landmarks: ['cobble', 'cobble-quay', 'sea-shrine', 'headland-light', 'seal-cove', 'drowned-field', 'longstone-beacon', 'gull-scarp', 'pilots-stone', 'wreck-of-the-sea-mare', 'saltings'] },
  // West Izol is authored in world metres too (src/content/regions/izol/izol-world.js); its spawn is the quay a ship puts the traveler ashore on.
  // The spawn is the quay a ship lands on (IZOL_QUAY.landing). It used to be five metres further
  // out, on a hex West Izol does not own, and only read as West Izol because regionAt snapped
  // unowned ground to its nearest neighbour.
  'West Izol': { subtitle: 'The western half of the island of Izol', spawn: point(56, 1730),
    description: 'Rock, sea turf and headlands across the Izoli Channel: Izolveth on its river flat with the Coalition\u2019s army camped above it, the fishing cove at Ardveth, and the road inland toward the Three Presences. The confederation has no capital, and says so.',
    palette: { ground: '#7e8b62', accent: '#d8d0ae', fog: '#b4c3c0' },
    npcIds: [], landmarks: [] },
  // Elagos is authored in world metres too (src/content/regions/ambron/elagos-world.js); its spawn is the haul road below Ambron's Plain Gate.
  Elagos: { subtitle: 'The Lake Lands and Ambron', spawn: point(-1184, 268),
    description: 'The northern shelf, and the lakes that made an empire: Ela running north out of sight, Brul and Ossen and the Thelas chain beyond it, and Ambron filling the dry interlake ground. Its high courts, crowded market and working southern quarters gather the trade of the four lakes.',
    palette: { ground: '#7d9560', accent: '#cfe0e4', fog: '#b4c6c4' },
    npcIds: ['ambron-toll-clerk', 'ambron-legate', 'ambron-committee', 'ambron-gate-optio'],
    landmarks: ['ambron', 'ambron-chain', 'ambron-causeway', 'ambron-plain-gate', 'physic-garden', 'lake-ela', 'nemmel', 'ice-road-stone', 'drowned-causeway', 'lake-shrine', 'the-stair', 'thelas-link', 'lake-brul', 'lake-ossen'] },
  // Vastos is terrain and wildlife only (src/content/regions/western-regions/west-regions.js, src/content/regions/western-regions/west-ground.js). Nobody
  // lives here yet: the winter quarters, the river crossings and the vel-vastos routes the
  // lore describes are all somebody's, and somebody is not built.
  Vastos: { subtitle: 'The cold tableland', spawn: point(-1520, -330),
    description: 'A high, flat, treeless upland west of the lake country: cold-adapted tussock from one horizon to the other, a shallow river braiding across the south, watering pans on the open range, and longhorn cattle grazing loose on all of it. Sulfur ground breathes on the western fall; two small cold lakes on the eastern one prefigure Elagos.',
    palette: { ground: '#8f9d6c', accent: '#d9d3a4', fog: '#c2c8bc' },
    npcIds: [], landmarks: ['vastos-river', 'vastos-braids', 'vastos-sinter', 'vastos-pans', 'vastos-basins', 'vastos-beck'] },
  // Meneth is terrain and wildlife only too. The routes the lore is built round — the Southern
  // Lotharn Road and the junction communities that live off it — are somebody's, and are not built.
  Meneth: { subtitle: 'The ridge country', spawn: point(-1850, -206),
    description: 'Cold ridge-and-valley upland between the mountains and the lake country: parallel ridges running east and west, a beck on every valley floor, hay meadow between them, wild chestnut and walnut on the lower faces and close-grown hardwood above. Southward the ridges lower and the country opens, and there is no line at which Meneth stops.',
    palette: { ground: '#7d8f63', accent: '#cfd4a6', fog: '#bac6bb' },
    npcIds: [], landmarks: ['meneth-ridges', 'meneth-becks', 'meneth-nut-slopes'] },
  // Imperial occupation adds a town and worked fields while the river-fox corridor stays wooded.
  Caricas: { subtitle: 'The occupied river country', spawn: point(-2092, 231),
    description: 'Imperial soldiers hold the river town and its patchwork of farms. The Carica drops from the upland shelf into a wooded corridor, where old riverbank forest and the vel-caric river fox survive beside the worked country. Occupation has settled who commands the road, not the civil war.',
    palette: { ground: '#7e8f5b', accent: '#c7cf9a', fog: '#b0bfae', sky: 0xaacfd3, haze: 0xb3d3d0, hazeDensity: .0028 },
    npcIds: [], landmarks: ['caricas-garrison-town', 'caricas-farms', 'carica-corridor', 'carica-upper', 'lizeem-channel', 'caricas-shelf'] },
  // **Ninehands** (the Farmlands of the Lizeem, Build 3: the user's design of 5 October 2026, built 6 October 2026): Baugi's
  // farm and its strips on the western Flats, Idunn's hazel wood at the valley head, the Counted Water and Forseti's house
  // where the Way meets the army's line, and the Carica ford marked (src/content/regions/nesdor/nesdor-farm.js). The eight people of the farmlands
  // are stood up by the game after the cast is trimmed (src/content/quests/lizeem-farmlands/lizeem-nesdor-people.js) and are not listed here, as Caricas's
  // are not: tests/eer-world.test.js holds Nesdor and Caricas to placing nobody themselves. What follows was written before:
  // Nesdor was terrain and wildlife only. The Nesdor Way, the route-communities that live off
  // it, the inns and warehouses and the legal practitioners who sell the difference between
  // two jurisdictions are the whole of what the lore is about, and none of it was built.
  Nesdor: { subtitle: 'The Flats', spawn: point(-1550, 462),
    description: 'Where the counted rivers of the branch country give out and the open country begins: shallow broad valleys with hazel and oak on their slopes in the north-west, and east and south of them the Flats — dark alluvial ground, relief measured in feet, shallow water braiding across it toward the Lizeem, cattle on the grass and an open horizon all the way to the Moros.',
    palette: { ground: '#a3a86a', accent: '#ded9a4', fog: '#cbd0b6' },
    npcIds: [], landmarks: ['nesdor-flats', 'nesdor-braids', 'nesdor-head', 'lizeem-bend', 'ninehands', 'nesdor-hazel-wood', 'counted-water', 'carica-ford'] },
  // Nylon now guards the east bank of the Lizeem mouth. The wider Eer plain
  // retains its existing water, climate and wildlife; villages and regional quests remain future work.
  //
  // **Eer is the first country in the game with a sky of its own** (src/world/environment/region-sky.js). It is
  // the only place a traveler can walk from `Cfa` into `Csa` without crossing a border, and
  // the horizon is where that is visible: drier air, a paler and bluer background, a warm
  // haze off the dry coast instead of the lake country's soft green-grey, and a lower density,
  // because the one thing everybody says about a Mediterranean coast is that you can see a
  // long way. Three new fields and nothing else: `palette.fog` is the chart legend's colour
  // and is left exactly as every other region has it.
  Eer: { subtitle: 'Nylon and the Lizeem estuary', spawn: point(-1050, 982),
    description: 'The plain between the great river and the sea, and the place the green country ends: deep black loam and rank damp grass in the north-west, dry tawny grass and aromatic scrub on the Mediterranean coast, and the change happening under your feet in the middle of the country rather than at either border. Two shallow channels braid across it to a low shore of small bays. Wild olives stand singly on the open grass. The Lizeem is the western boundary, guarded at its mouth by Nylon: enormous walls shelter a vertical city of arcades, scholarly courts, an ornate Great Library and a tower palace above its protected harbour. The river remains unfordable.',
    palette: { ground: '#6d8748', accent: '#ded0a0', fog: '#c4cdb2', sky: 0xbdd8dc, haze: 0xd2d4c2, hazeDensity: .0049 },
    npcIds: [], landmarks: ['nylon', 'nylon-library', 'nylon-palace', 'eer-loam', 'eer-braids', 'eer-bays', 'eer-olives', 'lizeem-reach'] },
  // Minora guards the real Isa-Lizeem fork; its holy city is stable while the outer frontier is raided.
  Isareos: { subtitle: 'Minora and the Imperial frontier', spawn: point(-2308, -7),
    description: 'Minora rises over the Isa-Lizeem fork: great white walls, an immense Sorcerers’ Guild tower and a sacred Imperial temple. Cedric keeps his claim to the crown here; Wilhelm and his army camp outside. Beyond the protected city, northern and western hills are exposed to centaur raids from Yunethre.',
    palette: { ground: '#6f9150', accent: '#d3dca6', fog: '#b7c8ac', sky: 0xaacfd3, haze: 0xb3d3d0, hazeDensity: .0020 },
    npcIds: ['prince-cedric', 'prince-wilhelm'], landmarks: ['menora', 'menora-grand-temple', 'menora-sorcerers-guild', 'menora-army-muster', 'isareos-shoulders', 'isareos-hollows', 'isareos-gallery', 'isareos-becks', 'isareos-west-rim', 'isareos-hamlet'/* Amalthea's, 6 October 2026 */] },
  // **Haethom** (the Farmlands of the Lizeem, Build 2: the design of 5 October 2026, built 6 October 2026): the ridge hamlet
  // on the north-east rim, the levee and its hatch, the flood meadow, Liban's house below the line, and Gwyddno's weir and
  // smoke-house on the Neth (src/content/regions/nethereum/nethereum-farm.js), with Haethom's seven people (src/content/quests/lizeem-farmlands/lizeem-nethereum-people.js), stood
  // up by the game after the cast is trimmed. The flood is a sheet the meadow hatch lets out over the meadow and draws
  // off again, not a lake. What follows was written before them:
  // Nethereum was terrain and wildlife only, like the six before it. The ridge communities, the
  // Flood Council, the Flood Recall, the weirs and the oats and hay on the flood meadow are all
  // somebody's, and somebody is not built — and two of them are impossible besides, because
  // **there is no Nethermere**. The atlas gives this country twenty-six `grassland` hexes and one
  // `plains`, in a map that has both a `lake` terrain and a `wetland` terrain and spends them
  // freely elsewhere, and it puts neither here. The user's ruling of 2026-09-21 settled it: the flood is a shallow
  // spring sheet over the basin's grass, gone by midsummer, and the game has no seasons to bring
  // it. So what is built is the dry state — a hollow, and the pasture the water leaves.
  //
  // **The second country in the game with a sky of its own** (src/world/environment/region-sky.js), and it asks for
  // the opposite of Eer's: the lore's one observation that survives the loss of the lake is that
  // "the sky over Nethereum is often overcast. The light has a quality that travelers describe as
  // muffled." So a flat grey-green horizon instead of the lake country's soft blue, and a density
  // a shade above the default, which is what a damp basin under cloud actually looks like. Not so
  // much above it that the hollow disappears: at .0071 the far side of the dish is still ground
  // and not fog. `palette.fog` is the chart legend's colour and is left as every region has it.
  Nethereum: { subtitle: 'The wet grass country', spawn: point(-2650, 289),
    description: 'A broad shallow dish of grass between the Isa and the Neth, and the greenest ground in the west. Water gathers in the middle of it every spring and leaves slowly, and what it leaves is the richest pasture in the inner branch country: rank wet meadow on the floor, ordinary humid grass up the sides and over the rim, and wet threads of rush and sedge in the low ground where the hill-streams run out and stop. Willow and alder on the water and nowhere else. There is no lake here and there never was one on this map — only the hollow, the cattle loose on it, and an overcast that makes the light feel like something held.',
    palette: { ground: '#5f8c46', accent: '#cfdaa2', fog: '#b0c3ac', sky: 0xa7b3ad, haze: 0xb4bcb1, hazeDensity: .0071 },
    npcIds: ['mererid', 'seithenyn', 'gwyddno', 'boann', 'fintan', 'airmid', 'liban'],
    landmarks: ['nethereum-hollow', 'nethereum-basin', 'nethereum-threads', 'neth-ford', 'neth-lower', 'nethereum-dry-corner', 'haethom', 'haethom-levee', 'gwyddno-weir', 'liban-hummock'] },
  // South Suval retains its lake and old terraces, but Wilhelm razed Imlamdris.
  // Its ruins and broken temple stand beside a small timber rebuilding quarter.
  // The highlands shelter the vigilante; civilian town characters remain unassigned.
  //
  // **A sky of its own.** Ten of its fifteen land hexes are Csa and the air over them is dry and
  // clear, as Eer's is; but the lake country is Cfb and "its own microclimate - cooler, with
  // morning mist off the water that the rest of the peninsula does not experience" (svaleen.md).
  // The haze is Eer's clearness with the mist's grey-green in it, a little denser than Eer and a
  // little clearer than the default; the mist itself lies on the water (src/content/regions/south-suval/south-suval-scenery.js).
  'South Suval': { subtitle: 'The lake country of the peninsula', spawn: point(-50, 1155),
    description: 'The southern hills of the peninsula, and the only lake on it. Tall limestone ridges, narrow passes and twisting tracks shelter the Stillwater below. Olive and fig survive on the warm slopes; charred groves and abandoned offering stones mark the devastation of the Blood Prince. Beside the lake stand the roofless stone ruins of Imlamdris and its broken temple. A smaller timber town is beginning again beside them, while morning mist gathers over the water.',
    palette: { ground: '#a2a070', accent: '#dcd6b4', fog: '#c2ccc4', sky: 0xb6d4dc, haze: 0xc9d0c4, hazeDensity: .0056 },
    npcIds: [], landmarks: ['imlamdris', 'stillwater', 'stillwater-temple', 'star-terrace', 'landward-gate', 'imlamdris-pass', 'eastern-slopes', 'south-cove', 'east-landing', 'southern-cliffs'] },
  'East Lotharn Mountains': { subtitle: 'The old mountains', spawn: point(-1087, -887),
    description: 'Old mountains, rounded and forested from the valley floors to within a few hundred metres of the summits: oak, chestnut, maple, beech and tulip poplar, managed for centuries and never cleared. Broad-backed ridges and long slopes a traveller can climb, and between them the valleys, each with its own water and, the lore says, its own people. The stone in every cut is a record of seas older than the range, and the iron and coal in it have been worked for as long as there have been valley communities.',
    palette: { ground: '#5d7044', accent: '#d8c79a', fog: '#b9c6bb', sky: 0xa8c4d2, haze: 0xbac8be, hazeDensity: .0036 },
    npcIds: [], landmarks: ['kemrath', 'pass-inn', 'stonegate', 'upper-olveth', 'iron-workings', 'central-bald', 'eastern-bald', 'olveth-passage', 'border-water', 'varn-slabs'] },
  // The barrier hills and their passes, and the Duchy's garrison in them (src/content/regions/feradom/feradom-world.js,
  // src/content/regions/feradom/feradom-forts.js, src/content/regions/feradom/feradom-people.js). The coast behind them is not built yet.
  Feradom: { subtitle: 'Behind the barrier hills', spawn: point(-421.129, -608.917),
    description: 'The domain country: lords in their valleys, harbours in the coves of a cold coast, and along its inland edge the barrier hills, a band of steep forested ridges that are not high but are hard to cross, with a fortress of the Duchy on every pass. Oak and fir on the hills, the best ship timber in the north-east; fields and pasture behind them.',
    palette: { ground: '#5c7248', accent: '#c9b58a', fog: '#b6c1c0', sky: 0xa3bdca, haze: 0xb5c2c4, hazeDensity: .0042 },
    npcIds: ['feradom-road-captain', 'feradom-road-gate-a', 'feradom-road-gate-b', 'feradom-ordel-gap-gate', 'feradom-birch-pass-gate', 'feradom-amod-pass-gate', 'feradom-stone-pass-gate', 'feradom-fir-pass-gate'],
    landmarks: ['barrier-hills', 'ordel-gap', 'road-pass', 'birch-pass', 'amod-pass', 'stone-pass', 'fir-pass'] },
  // **Gala is terrain, climate, water and wildlife, and nothing that belongs to anybody**
  // (docs/gala-brief.md): the city of Gala, its harbour, its market, the Guild of Assessors and
  // the council hall with its Avite bronze are all somebody's, and none of them is built; nor are
  // the irrigation channels the lore puts in the dry north, because a channel somebody dug is a
  // work. Nylon now guards the estuary on the Eer bank across the river.
  //
  // **A sky of its own**, and the brightest in the west: the country is three climates laid across
  // it, and the traveler who reaches it comes off the steppe - `BSh` over the northern three rows,
  // the same hot semi-arid air as the Oves Desert beyond the Oveth. So Eer's clear coastal sky
  // with the dust of the dry country in its haze: a paler, warmer horizon and a density a little
  // below Eer's, because the one thing a dry country is is a long way to see.
  Gala: { subtitle: 'The steppe and the river mouths', spawn: point(-1680, 1080),
    description: 'The western bank of the Lizeem near its mouth, and one country with three climates laid across it from north to south. The north is the interior weather: hot steppe, bunch grass in tussocks with bare ground between, grey wormwood and saltbush, and a dry wash of gravel that runs only in the rains. The middle is Mediterranean, tawny grass with low aromatic maquis on the rises and wild olive and fig standing singly. The south is a short coast where the plain’s water comes down to the Iberos Sea in braided channels through reed and tamarisk. The Oveth is the northern border and the Lizeem the eastern, and nothing on either bank is built by anybody.',
    palette: { ground: '#b2a874', accent: '#e4d8aa', fog: '#cfcbb2', sky: 0xc3d9dc, haze: 0xdad5bf, hazeDensity: .0046 },
    npcIds: [], landmarks: ['gala-steppe', 'gala-wash', 'oveth-ford', 'lower-oveth', 'gala-maquis', 'gala-reed-bank', 'gala-mouths', 'gala-shore'] },
  // **The Ascarth Peninsula is terrain, climate, water and wildlife only** (the user, 28 September
  // 2026: "start building the wildlife and terrain of Galan, North Ascarth, and South Ascarth"). Aevis
  // and the peninsula's other cities, their harbours, the bronze and the gates, the bull-headed figures,
  // the burial mounds and the copper workings are all somebody's, and nothing here belongs to anybody.
  //
  // **It is on the far bank.** Its one edge with Eer is the Lizeem's last, going into the sea, and its
  // only dry border is Gala's: a traveler reaches it through Gala or not at all.
  //
  // **A sky of its own**, one for both, since they are one peninsula: Csa on every grass hex and Csb
  // on the three hills, the sea on both sides of all of it. Eer's clear Mediterranean air with the sea
  // in it - bluer than Eer's, a haze off the water rather than off a dry plain, and the clearest of the
  // four southern skies, because the one thing a finger of rock in the sea has is distance to look at.
  'Northern Ascarth': { subtitle: 'The neck of the peninsula and its hills', spawn: point(-1345, 1480),
    description: 'The peninsula where it leaves the mainland: low grass at the neck between the Lizeem’s mouth and the western sea, and then the ground rising to a plateau of tawny grass and aromatic scrub, rugged and stony, and to the interior hills - two rounded rocky hills and the shoulder of a third, wooded in evergreen oak with pine on the tops, and green stain on the stone where the copper is. Cliffs along the western shore with seabirds on them; on the east the ground falls to sheltered bays between low headlands.',
    palette: { ground: '#aba66b', accent: '#e0d6a8', fog: '#c4cfc4', sky: 0xb3d6e0, haze: 0xcdd6d0, hazeDensity: .0045 },
    npcIds: [], landmarks: ['ascarth-neck', 'interior-hills', 'green-stone', 'ascarth-west-cliffs', 'ascarth-north-bay'] },
  // **Velsorten** (the Farmlands of the Lizeem, Build 4: the design of 5 October 2026, built 6 October 2026, after the user's
  // ruling of 5 October that Ovesos is a river kingdom, fertile along the water and drying toward the desert): a green belt
  // along the Lizeem (src/content/regions/oves/oves-world.js `ovesosBelt`), the Water Council's village on the terrace, its canal from the divider
  // to a dry tail with twelve plots on it, Ezina's and Uttu's mills and Lahar's camp (src/content/regions/oves/ovesos-farm.js), with Velsorten's
  // eight people (src/content/quests/lizeem-farmlands/lizeem-ovesos-people.js), stood up by the game after the cast is trimmed. The desert is still nobody's.
  // What follows was written before them:
  // **Ovesos and the Oves Desert are terrain, climate, water, scenery and wildlife, and nothing that
  // belongs to anybody** (docs/oves-brief.md). The Water Council and every water right it allocates,
  // the five branch countries and the Branch Court between them, King Melos and the house Oveth-Hold,
  // the Middle Reach dispute, the market towns, the mills on the upper river, the irrigated bottomland
  // grain, the Sorten's grazing rights, the Telemon bands' desert routes and the wells and watering
  // points along them: every one of those is somebody's and none of them is built.
  //
  // **One climate over both of them.** `BSh` on all forty-two hexes, read per hex off the World
  // Builder map, so neither country has a gradient to draw and the whole difference between them is
  // terrain and water (src/content/regions/oves/oves-world.js). Ovesos gets a sky that is Gala's own steppe air, because
  // Gala's northern rows are this same country with another name on them; the desert's is the clearest
  // in the game, because the one thing a rain shadow has is distance to look at.
  Ovesos: { subtitle: 'The Sorten, the canal and the upland grass', spawn: point(-1905, 706),
    description: 'The middle Oveth, a river country on the edge of the steppe: green only where the water reaches it. Along the Lizeem a belt of greener grass runs under poplar, willow and tamarisk on the bank, and dries away from the river into buff upland bunch grass, and in the south and west into thin grass with grey wormwood and blue-grey saltbush where it gives out. Velsorten, the Water Council’s village, stands on the terrace above the Sorten round a square: the register house, a brewhouse and two mills. Its canal leaves the Lizeem at the divider and runs south over the plain to a dry tail, the oldest rights by the river and the newest at the end, and the herders keep their camp on the upland grass above its head. Along the south-western border runs the Oveth — waded over gravel at its head, deep through the Sorten, the wide seat of bottomland a metre below the plain — with a narrow dark gallery of trees of its own.',
    palette: { ground: '#a8a06a', accent: '#e2d6a6', fog: '#cdc9ae', sky: 0xc6dad8, haze: 0xdad5bc, hazeDensity: .0044 },
    npcIds: ['enbilulu', 'nisaba', 'ziusudra', 'ashnan', 'lahar', 'ezina', 'ninkasi', 'uttu'],
    landmarks: ['the-sorten', 'upper-oveth', 'oves-upland-grass', 'oveth-gully', 'oves-open-plain', 'oves-lizeem-bank', 'velsorten', 'velsorten-canal', 'the-divider', 'lahar-camp'] },
  'Oves Desert': { subtitle: 'The rain shadow and its dry channels', spawn: point(-2205, 902),
    description: 'The far tail of the Pyros rain shadow: a wedge of the Oveth basin falling from the rim hills in the north-west to the point in the east where the Oveth and the Caelin come together. Rocky rather than sandy \u2014 worn stone through a thin poor soil, gravel pavement wherever the rock is up, perennial scrub spaced wide enough to walk between, and a stubble of dead seed-heads in the pockets where a wet year\u2019s grasses would be. Three low rounded hills on the rim intercept what moisture the westerlies carry, and the cut channels run east-south-east off their feet with no water in any of them. There is no permanent water in the country at all: one reach of one channel holds it below the gravel, and that is the only green in the Oves.',
    palette: { ground: '#ab9f7c', accent: '#e6dcb4', fog: '#d4cdb4', sky: 0xcedcd2, haze: 0xe3dabd, hazeDensity: .0034 },
    npcIds: [], landmarks: ['rim-hills', 'dry-channels', 'oves-damp-reach', 'oves-dry-wedge', 'oves-apex'] },
  'Southern Ascarth': { subtitle: 'The tip of the finger', spawn: point(-850, 2021),
    description: 'Aevis, a bronze city with great landward gates, a martial palace, armored garrison and a harbor open to the sea, occupies the northern eastern shore. Beyond its walls, the finger of the peninsula runs to its end: open Mediterranean grass and scrub, thin and stony, rolling on a low plateau between two seas, with a wild olive standing alone here and there and nothing taller. Cliffs along the whole of the west and round the tip, two sheltered bays on the east with a beach in each, dolphins off the shore, sea-plungers folding into the shoals off the tip, and Selemi across a narrow channel to the south.',
    palette: { ground: '#aba66b', accent: '#e0d6a8', fog: '#c4cfc4', sky: 0xb3d6e0, haze: 0xcdd6d0, hazeDensity: .0045 },
    npcIds: [], landmarks: ['aevis', 'aevis-citadel', 'aevis-harbor', 'ascarth-east-bays', 'ascarth-tip', 'selemi-channel'] },
  // The West Lotharn (src/content/regions/west-lotharn/west-lotharn-world.js). Its own sky, and a colder, thinner one than the
  // East's: the East Lotharn's horizon is a wooded range seen through the Cfa haze it stands in, and
  // this one is five hundred and fifty metres of it. Clearer air (.0027 against the East's .0036),
  // a bluer sky and a paler haze, which is what distance and altitude do to both.
  'West Lotharn Mountains': { subtitle: 'The spine of the range', spawn: point(-1817, -651),
    description: 'The main range, and the highest ground in Azhora: one great massif standing five hundred and fifty metres over its own valleys, with the north summit, the western shoulder, the eastern summit and three lesser masses round it. Old stone worn into uneven courses, with wooded shelves, broken buttresses and grassy crowns; slanting ramps, ledge paths and limestone chimneys offer ways through the cliffs. The long valley runs the whole way through the range, flat-floored and grown over, with a divide a fifth of the way along it and a beck leaving each end; the north valley drains the massif to the Mithala plain, and the col at the eastern end is the saddle the East Lotharn begins from.',
    palette: { ground: '#5b6e44', accent: '#cfd0c4', fog: '#bcc8bd', sky: 0x9fc2d6, haze: 0xc3cec6, hazeDensity: .0027 },
    npcIds: [], landmarks: ['the-crest', 'north-summit', 'west-shoulder', 'east-summit', 'long-valley', 'long-valley-divide', 'north-valley', 'lotharn-col', 'south-rampart', 'the-cold-head'] },
  // ---------------------------------------------------------------------------------------------
  // The Mithala plain (src/content/regions/mithala/mithala-world.js). Four countries, terrain and wildlife only.
  // ---------------------------------------------------------------------------------------------
  // Everything the Mithala lore is really about belongs to somebody and none of it is built:
  // Minora and every channel-confluence market below it, the villages on their levees with their
  // raised granaries, the flood calendar and the water courts, the floodwheat and the barley and
  // the rye, the river-horn herds that pull the harrows, the barges and the docks, the sky-reading
  // and the astronomy that came out of it, Mithalenna's cult, the Temple of the Seven Bowls and the
  // Bowl-Keepers, the Cref oath and the warlords who broke it. What is built is the plain, and the city
  // at the meeting of the arms (src/content/regions/mithala/mithala-city.js, 4 October 2026): the old seat, the quay and its
  // barges, the granaries and the markets, the sky tower and the flood gauge, with nobody in them yet.
  //
  // **One sky over all four, and it is the one thing the lore insists on.** "The Mithala is known
  // for its sky... the sky is large here because there is nothing to interrupt it, and a sky that is
  // large behaves differently from a sky in hilly or forested country: weather comes from further
  // away, the approach of storm is visible long in advance." The case for one sky rather than four
  // is the same as the case for one terrain profile: this is one plain with four names on it, the
  // four share forty-nine hex edges, and a horizon that changed at an internal border would be a lie
  // about a country whose whole point is that the horizon does not change. The case for four would
  // have been the climate, and the climate is `Dfa` on all 116 hexes - there is nothing to draw with.
  //
  // So: `hazeDensity` **.0038**, the clearest air of any green country in the game and second only
  // to the Oves Desert's .0034 and the West Lotharn's .0027, both of which have a reason of their
  // own (no water, and half a kilometre of altitude). Here the reason is that there is nothing in
  // the way. A **bluer** background than anything else at this height - a continental summer dome
  // rather than the lake country's soft green-grey - and a haze that is warm rather than cool,
  // because what hangs in the air over this plain in July is the dust of grain land and not sea mist.
  'South Mithala': { subtitle: 'The plain under the mountains', spawn: point(-1490, -1285),
    description: 'The plain’s southern march, with both halves of the Lotharn standing along the whole of its southern border and nothing else standing anywhere on the plain but the city at the meeting. Flat dark grain country between two waters — the main channel running east along the northern border to the sea, the mountains’ border water running east under the forest — with four low swells of the foothills’ last apron inside it, the highest ground on the plain and still a swell you can walk over without noticing you have. At its north-western corner the two arms of the river come together and go on east as one, and Mithala’s Ford quarter stands on this side of them, at the plain’s only crossing of the main channel.',
    palette: { ground: '#6f8043', accent: '#cfc78e', fog: '#b3bfa0', sky: 0xa6cde4, haze: 0xccd2ba, hazeDensity: .0038 },
    npcIds: [], landmarks: ['mithala-meeting', 'mithala-paved-ford', 'mithala-mountain-market', 'the-main-channel', 'south-mithala-apron', 'south-mithala-levees', 'mountain-march'] },
  'West Mithala': { subtitle: 'The upper grass', spawn: point(-2065, -1355),
    description: 'The western entrance to the plain, and the quarter with the least water in it: twenty-four hexes of tall prairie grass standing to the waist on deep dark river soil, with the arm out of the hill country coming in along the Celder margin and a fan of small channels off it. This is the ground the lore means by saying the character changes before the land does — the country to the west is hills and this is not, and nothing anywhere announces the difference. It is also where the horizon closes into a full circle, and standing in the middle of it is the reason people who live here talk about the sky. In its eastern corner, inside the fork of the arms, Mithala’s old seat stands behind the only stone wall on the plain, with the sky tower over the meeting.',
    palette: { ground: '#788a49', accent: '#d4ca94', fog: '#b7c2a3', sky: 0xa6cde4, haze: 0xccd2ba, hazeDensity: .0038 },
    npcIds: [], landmarks: ['mithala', 'mithala-kings-hall', 'mithala-sky-tower', 'mithala-flood-gauge', 'round-horizon', 'the-west-arm', 'west-mithala-fan', 'west-mithala-grass'] },
  'East Mithala': { subtitle: 'Where the channels gather', spawn: point(-1330, -1545),
    description: 'The lowest and flattest quarter, and the one the water leaves by: the channels gather again here and the main one goes out to the sea across the eastern border, in a gallery of willow and poplar two trees deep that is the only wood on the plain. Rank green grass on the wettest ground in the Mithala, backswamps between the channels that stand under water for weeks in a spring the game cannot yet show, and on the north-eastern horizon the first dark line of the Acorwood. At its south-western corner Mithala’s Quays face the main channel, with grain barges at the quay.',
    palette: { ground: '#63783e', accent: '#cac291', fog: '#adbb9f', sky: 0xa6cde4, haze: 0xccd2ba, hazeDensity: .0038 },
    npcIds: [], landmarks: ['mithala-quay', 'east-mithala-gather', 'the-river-mouth', 'east-mithala-gallery', 'acorwood-horizon'] },
  'North Mithala': { subtitle: 'The plain going north', spawn: point(-1790, -1815),
    description: 'The plain going north until it stops being plain. Tall grass on a dry shelf in the south, and then a long imperceptible fall northward into sedge and rush and standing water as the Acor Wetlands begin, with no line anywhere to say where one becomes the other. The north braid comes down out of that ground on two heads and runs south to the meeting. Along the northern and north-eastern horizon the treeline thickens: the Acorwood, which closes off the north of the continent, approached across open country without a wall or a cliff to announce it. At its southern corner, over the braid from the old seat, stands Mithala’s Braid Bank and its cattle market.',
    palette: { ground: '#6b8045', accent: '#ccc491', fog: '#b0bca3', sky: 0xa6cde4, haze: 0xccd2ba, hazeDensity: .0038 },
    npcIds: [], landmarks: ['mithala-cattle-market', 'the-north-braid', 'north-braid-heads', 'north-mithala-shelf', 'north-mithala-fen', 'acorwood-approach'] },
  // The southwestern block (src/content/regions/southwest/southwest-world.js). **Two skies over four countries**, and the
  // first of them is the first true-desert sky in the game. Navarth, the Ganesh Desert and the
  // Ganesh Plain read `BWh` over seventy-four of their eighty hexes between them, and what a hot
  // desert does to the air is take the water out of it: the clearest air in Azhora at .0030,
  // against the Oves Desert's .0034, with a pale bleached-blue sky and a haze that is dust rather
  // than moisture. West Pyros is the one steppe country of the four - `BSh` over eighteen of its
  // twenty-seven hexes, with a river down the whole of its eastern side - so it gets the steppe
  // sky Gala and Ovesos share, a shade greener and a shade closer.
  Navarth: { subtitle: 'The plateau above the desert', spawn: point(-3350, 1155),
    description: 'The high ground of the southwest and the last of the Pyrosi country going north: a worn tableland of pale stone and thin soil standing forty metres over the plain, with ten broad rounded swells on it and open sweeps of bare scrub between them. Hot desert over all of it but the north-eastern tip, where two hexes of Mediterranean air carry the one piece of forest the atlas gives this quarter and the Ibenwood’s southern edge begins. The country’s only water runs along its northern border, out of the green country beyond it and away west to the sea; from the western swells the ground falls away into the Ganesh and there is nothing at all between here and the horizon.',
    palette: { ground: '#6f6449', accent: '#b3a884', fog: '#a19b84', sky: 0xc3d4cc, haze: 0xc6b996, hazeDensity: .0024 },
    npcIds: [], landmarks: ['navarth-plateau', 'navarth-swells', 'navarth-west-rim', 'navarth-wood', 'alezhor-water'] },
  'West Pyros': { subtitle: 'The plain and the great river', spawn: point(-3000, 1241),
    description: 'An open semi-arid plain falling south from the Navarth rim to the sea, with the Vaellir - the largest river in this quarter of the continent - running the whole length of its eastern border and growing from a wadeable head to a deep river crossed at Pyra by the golden bridge. Bunch grass in tussocks with bare earth between them over most of it, thinning west into desert scrub against Navarth; a ribbon of poplar and tamarisk along the river and no other wood anywhere; and at the southern tip, where the river reaches the sea, one hex and a half of genuinely green Mediterranean country. Pyra, the golden imperial capital, straddles the Vaellir: East and West Pyra share one administration beneath the suspended palace of their centuries-old emperor.',
    palette: { ground: '#6c6944', accent: '#aea580', fog: '#9a9a83', sky: 0xbdd2ce, haze: 0xc3bb9c, hazeDensity: .0036 },
    npcIds: [], landmarks: ['pyra', 'west-pyra', 'pyra-quays', 'the-vaellir', 'vaellir-ford', 'vaellir-mouth', 'pyros-open-plain', 'pyros-green-tip'] },
  'Ganesh Desert': { subtitle: 'The dry crossing', spawn: point(-3550, 1501),
    description: 'Thirty-one hexes of true hot desert, the first in Azhora and the largest single country in the southwest: flat to gently rolling ground made by old alluvium rather than uplift, with no canyon, no escarpment and nothing dramatic in it anywhere. Wind is the whole of what shapes it - a thin sheet of fine pale sediment over stone, swept down to gravel on the rises and gathered a hand deep in the pockets, with the grain of it running with the summer wind out of the north-west. Sparse deep-rooted scrub spaced wide enough to walk between and a stubble of bleached seed-heads where a wet year’s flush would be. Two washes cross it with nothing in either, one reach of one of them holding water below the gravel; and on the north-west it runs out at a gulf it is arid right up to, which is the strangest thing about it.',
    palette: { ground: '#776d54', accent: '#b7ae8c', fog: '#a8a288', sky: 0xc3d4cc, haze: 0xc6b996, hazeDensity: .0024 },
    npcIds: [], landmarks: ['ganesh-floor', 'ganesh-washes', 'ganesh-damp-reach', 'ganesh-shore', 'ganesh-wind-grain'] },
  'Ganesh Plain': { subtitle: 'The ground that cannot decide', spawn: point(-2930, 1620),
    description: 'The transition between the desert and the green country to the south-east, and the lore says it behaves from decade to decade as though it cannot decide which it belongs to. Level clay-floored ground crossed by three shallow drainage channels too diffuse to be rivers, with closed depressions strung along them where the water gathers and the grass lasts longest - and in a dry year, which is the face the world can show, those depressions are the only green on it and everything between them is scrub and bare pale clay. A low divide runs down the eastern side, and the channels show it: two of them leave it westward for the Ganesh and the third runs east-south-east to the sea four hundred metres away. The south-eastern corner is the exception - one hex of Mediterranean grass where Marosh’s country begins.',
    palette: { ground: '#70684c', accent: '#b3a988', fog: '#a59e86', sky: 0xc3d4cc, haze: 0xc6b996, hazeDensity: .0024 },
    npcIds: [], landmarks: ['ganesh-plain-channels', 'ganesh-depressions', 'ganesh-plain-divide', 'ganesh-plain-green-corner'] },
  // The four Meroshe deserts (src/content/regions/southwest/southwest-world.js). **Ninety-five hexes, one terrain word, one
  // climate code** - and therefore the one place in this project where the atlas cannot tell four
  // countries apart and the build has to. What tells them apart is the surface underfoot and the one
  // thing on each one's horizon, and **the sky is part of that**, because the air over a desert is
  // not the same air everywhere in it.
  //
  // North and Central take job 1's desert sky unchanged - .0024, the clearest air in Azhora, a
  // bleached sky and a haze that is warm dust rather than water - because they are the interior and
  // that is what the interior of a hot desert looks like. The other two are argued from the atlas:
  //
  //  - **West Meroshe has ten hex edges of open western ocean**, and hama.md says what arrives on it:
  //    "the western face is open-ocean coast, exposed to the weather patterns that originate in the
  //    far west and arrive at the peninsula having crossed considerable water". Sea air over a desert
  //    carries salt and a marine layer, so .0032 and a little bluer: still the second-clearest air in
  //    the game, and not the interior's.
  //  - **South Meroshe is under fog**, which is the whole of what makes it different from the rest of
  //    the Meroshe. trogo.md: "where desert air meets ocean-loaded humidity along the southeastern
  //    ridge, fog forms and stays, sometimes for days... warm and thick and close". So this is the one
  //    `BWh` country in Azhora whose air is *thicker* than the average rather than thinner - .0046,
  //    against the Oves steppe's .0034 - and the only desert in the game a traveler cannot see across.
  'North Meroshe Desert': { subtitle: 'The rock at the desert’s head', spawn: point(-2950, 2021),
    description: 'The northern transition of the Meroshe, the largest desert on the continent, and the first thing to know about it is that it is not sand. It is rock: bare bedrock under a skin of gravel, swept clean and ringing underfoot, with the harder beds standing out of the floor in low steps a metre or two high that run north and south for three hundred paces at a time and are the only direction this country offers. The lore calls it "the rocky hammada of the northern transition zone — flat gravel plains and exposed bedrock where scrubby thorn trees still manage to exist", and the thorn is here, rooted in the joints of the stone, the only tree standing anywhere in ninety-five hexes of desert. Two things are on its horizon on the atlas: the Ganesh Plain’s pale clay running out northward with no line to mark where, which is built, and Marosh’s green Mediterranean hills a mile east across the shimmer, which is not — so that side of it is open country for now. The oasis houses, the caravan routes and the dustback herds the lore hangs on this country all belong to somebody and none of them is here.',
    palette: { ground: '#67634e', accent: '#a9a184', fog: '#9b957e', sky: 0xc3d4cc, haze: 0xc6b996, hazeDensity: .0024 },
    npcIds: [], landmarks: ['meroshe-hamada', 'meroshe-benches', 'meroshe-thorn', 'meroshe-dust-line', 'meroshe-green-shoulder'] },
  'West Meroshe Desert': { subtitle: 'The skirt, the salt and the sea', spawn: point(-3550, 2367),
    description: 'A desert between a highland and an ocean, and it is made of what the highland sends down and what the ocean does not send up. Three broad cones of gravel spread south-west out of the Dinelv escarpment — which is on the atlas and not yet built, so the plateau above them is open country — and have grown together into one skirt falling to the water: cobbles a hand across at the heads where the walking is bad, pebbles four hundred paces out, dust deep enough to print at the toe, which is the whole story of water that comes down twice in a decade. Where the last of that drainage stops there is the Malhat — three hundred paces of salt floor, flat to the centimetre, white and hard and the one place in this desert where water can be seen and not drunk. Ten of this country’s hex edges are the open western sea, and a hundred paces inland of the surf the ground is as arid as it is twenty miles in. The plateau road above it, its cisterns and its garrison are the Route Registry’s and are not built.',
    palette: { ground: '#655d48', accent: '#a79e84', fog: '#97937f', sky: 0xbfd0cf, haze: 0xc4bda6, hazeDensity: .0032 },
    npcIds: [], landmarks: ['meroshe-fan-skirt', 'meroshe-salt-pan', 'meroshe-dry-shore', 'meroshe-escarpment-foot'] },
  'Central Meroshe Desert': { subtitle: 'The sand sea', spawn: point(-2880, 2420),
    description: 'The erg, and the only one in Azhora: thirty-one hexes of clean sand piled into parallel ridges that run north-west to south-east on the summer wind’s own bearing, seven metres from floor to crest and two hundred and thirty paces apart, with a flat swept gravel corridor between every pair. It is the one country in the game that has no horizon — from the crest of a ridge the next ridge is the skyline, and from the corridor between them there is nothing to see in any direction but two walls of sand. A traveler can walk a corridor fast, north-west or south-east and no other way; crossing the grain means climbing a dozen ridges in turn. The sand is here because there is nowhere else for it to go: the whole country lies in a shallow closed sink with no river edge anywhere on it and no outlet in any direction. The lore is plain about what this ground is — "navigating the sand seas without local knowledge is considered one of the more reliable methods of dying on Azhora" — and the local knowledge belongs to people who are not built.',
    palette: { ground: '#736a4e', accent: '#b0a684', fog: '#a09980', sky: 0xc3d4cc, haze: 0xc6b996, hazeDensity: .0024 },
    npcIds: [], landmarks: ['meroshe-sand-sea', 'meroshe-corridors', 'meroshe-sink', 'meroshe-sand-edge'] },
  'South Meroshe Desert': { subtitle: 'The stone floor under the fog', spawn: point(-2800, 2800),
    description: 'The bottom of the desert, and the one part of it that gets wet. The ground is reg — a pavement of pebbles packed edge to edge over the whole country, flat enough to see twenty miles over and varnished so dark by iron and manganese that it looks wet from a distance and holds a footprint for a year. Thirteen of its hex edges are Trogo’s tropical rainforest and four are the southern ocean, and what crosses the line between the two is fog: warm, thick, close, standing for days at a time, watering a surface the atlas still calls hot desert. So the southern third of this country carries a crust, lichen in the lee of every pebble, and thorn scrub standing close enough together to walk round — none of which the rest of the Meroshe can manage — and the north-western third, against the sand sea, is as bare as anything in Azhora. A rainforest stands half a mile off the eastern edge with cloud sitting in it, and since job 4 it is built: twenty-two hexes of `Af`, standing fifty metres over this floor, and the twenty hexes of the Meroshe whose aridity is no longer a flat 1.000 are almost all of them looking at it or at Marosh. The canyon communities the lore puts south of here, and everything they own, are not built.',
    palette: { ground: '#3d3427', accent: '#847a64', fog: '#7c735e', sky: 0xbec9c3, haze: 0xc0bcab, hazeDensity: .0046 },
    npcIds: [], landmarks: ['meroshe-stone-floor', 'meroshe-fog-margin', 'meroshe-forest-wall', 'meroshe-south-shore'] },
  // Cape Heth, the Dinelv Highlands and Hama (src/content/regions/southwest/southwest-world.js): the block's western edge, and
  // **three skies, every one of them argued from the atlas rather than from the climate code.**
  //
  //  - **Cape Heth** is a desert with the sea on three sides of it and twenty-one hex edges of open
  //    water, which is more maritime than anything in the block: sea air over a hot desert, so .0034,
  //    a little bluer and a little closer than the interior's .0024. It is the West Meroshe's argument
  //    (.0032, ten ocean edges) taken twice as far, and the number is that country's plus a shade.
  //  - **The Dinelv Highlands** get the *clearest* air in Azhora, .0021, and the reason is altitude and
  //    not dryness: the plateau stands eighty metres over everything round it, the lore says "rainfall
  //    at the plateau elevation is somewhat higher than on the coast directly below, but not
  //    substantially", and what a hot-desert upland has less of than a hot-desert floor is dust. This
  //    is the West Lotharn's argument (.0027 at five hundred metres) run in a desert.
  //  - **Hama** is the one country in the whole block whose air is properly wet, and it earns it twice:
  //    nine of its nineteen hexes read `Csb` and nineteen of its hex edges are ocean. .0052 - thicker
  //    than the South Meroshe's fog belt, which is the block's previous record - with a sky that is
  //    blue rather than bleached and a haze of sea moisture rather than dust. Standing on the line
  //    between its halves a traveler can see the difference in the air as well as in the ground.
  'Cape Heth': { subtitle: 'The desert that runs out at the sea on three sides', spawn: point(-4000, 1848),
    description: 'A low desert promontory reaching four hundred metres further west than any other ground in Azhora, with open water on the north, the west and the south of it. The lore is careful to say what it is not: "not a dramatic geographical feature in the mode of high cliff headlands or bold rocky outcrops; it is a low, extended point of land that juts far enough west to matter as a navigational landmark" - and the atlas agrees, giving it `plains` on eighteen hexes and hot desert on all eighteen. The rock is grey-brown marine sandstone soft enough to cut with hand tools; one long low ridge runs down the spine, and it decides everything - the western face takes the weather and the salt and carries nothing but lichen and gravel, the eastern side is in its lee and holds what soil the cape has in a string of shallow drainage hollows. At the point is the only `coast` hex the atlas puts inside any country on the map: bare wave-cut rock three metres above the water with sea on four of its six sides. The cape communities, their harbour on the south-eastern face, their cisterns, their salvage and the whole navigation trade the lore builds on this headland belong to somebody and none of it is built.',
    palette: { ground: '#514e40', accent: '#9b9880', fog: '#8e8c78', sky: 0xbdcfd0, haze: 0xc2bda9, hazeDensity: .0034 },
    npcIds: [], landmarks: ['heth-point', 'heth-spine', 'heth-weather-face', 'heth-hollows', 'heth-bight'] },
  'Dinelv Highlands': { subtitle: 'The desert plateau', spawn: point(-3400, 1989),
    description: 'The first desert highland in the game and the high ground of the whole southwest: thirty-five hexes of hot desert standing eighty metres over the cape on one side and the sand deserts on the other, with `hills` on twenty-six of them, `BWh` on every single one, and no green hex anywhere. The way up is the escarpment, which the lore calls "the most dramatic terrain on the eastern peninsula" - exposed sedimentary rock in horizontal bands, warm-toned stone low down and a harder darker stone above it, cut by seasonal channels that run twice a decade and stand as dark lines down the face the rest of the time. On top it is not flat: ridge systems cross it north to south "aligned with the peninsula’s long axis", four gaps get a traveler through them, four closed basins hold what water the plateau gets and are the only ground on it where anything roots deep, and three massifs stand over the whole plateau - the only three hot-desert `mountain` hexes on the atlas, and residual blocks rather than peaks, because a summit high enough to be a mountain could not read as hot desert at its top. The city of Dinelv below, the plateau road, the garrisons at the passes, their cisterns, the quarries and the pastoral communities who have been up here longer than any of it are all somebody’s and none of them is built.',
    palette: { ground: '#4d4839', accent: '#9a937a', fog: '#8d8873', sky: 0xc6d6cd, haze: 0xc8bc9a, hazeDensity: .0021 },
    npcIds: [], landmarks: ['dinelv-plateau', 'dinelv-escarpment', 'dinelv-ridges', 'dinelv-north-pass', 'dinelv-middle-saddle', 'dinelv-massifs', 'dinelv-basins'] },
  Hama: { subtitle: 'Where the desert stops', spawn: point(-3250, 2887),
    description: 'The corner of the continent, with ocean on the west and ocean on the south, and the only place in the southwest where the desert ends in something green instead of in water or in more desert. The atlas draws the line twice and in the same place: nine `grassland` hexes that are every one of them `Csb`, and ten `plains` hexes that are every one of them `BWh`, with no hex where the two fields disagree. So the seaward two hexes are real Mediterranean country - winter-rain grass thick enough to walk through, low evergreen scrub in the hollows, a few wind-shaped trees leaning inland - and the inland half is a stony broken rise between that and the Meroshe, which the lore calls "rough without being impassable: enough friction to make overland access from the desert difficult". Between them, over about two hundred paces, the grass thins to tussocks and then to nothing and the ground turns to gravel, and that two hundred paces is the country. The winter watercourses that carry the rain down to the sea are dry, as they are in the dry years the lore says Hama cannot rely on. Hama Harbour, the Council of Merchant Houses, the seven families and every plot on the coastal margin are somebody’s and none of them is built.',
    palette: { ground: '#475433', accent: '#8b9a6c', fog: '#828e72', sky: 0xb4c8d2, haze: 0xb9bdb0, hazeDensity: .0052 },
    npcIds: [], landmarks: ['hama-green-line', 'hama-grass', 'hama-broken-ground', 'hama-corner', 'hama-winter-beds'] },
  // Marosh and Trogo (src/content/regions/southwest/southwest-world.js): the block's eastern edge, and **two skies, one of which
  // is the whole point of the job.**
  //
  //  - **Marosh** has not one `BWh` hex - the first country in thirteen that can say so - and twenty
  //    hex edges of open Iberos water, one more than Hama. So .0055, a shade thicker than Hama's .0052,
  //    which was the block's record: eight `Csb` hexes on a ridge that is wringing the sea out, over a
  //    terrace that is `Csa`, under an easterly sky that is properly blue rather than bleached. It is
  //    the sheltered coast of the peninsula where Hama is the exposed one, and a sheltered warm sea
  //    puts more water in the air than an open cold one does.
  //  - **Trogo is `.0144`, which is nearly two and a third times the game's own default and nearly
  //    seven times the clearest air in it.** It is the first half of the user's decision of 30
  //    September 2026 about what a deep forest is: *a country you cannot see far in and cannot go
  //    straight through*. `FogExp2` hides a fraction `1 - exp(-(density x depth)^2)` of a surface, so
  //    at .0144 a traveler is **half hidden at 58 metres, nine tenths gone at 105 and invisible at
  //    120** - where the game's default .0062 takes 279 metres to do the same and job 2's erg, the
  //    shortest sight line in the game until now, blocks the view at 140 with a six-metre dune. This
  //    blocks it at 120 with cloud, and there are trees in the way as well. The colour is the second
  //    half of the argument and was the harder half: job 1 found that a near-white haze is over half of
  //    every pixel past a hundred and fifty metres, so a haze this thick has to be **dark**, and what
  //    it actually is here is the lore's own fog - "not the cold sea-fog of Bouen's coast. It is warm
  //    and thick and close" - cloud sitting inside a canopy, which is grey-green and not white.
  Marosh: { subtitle: 'The ridge the desert is behind', spawn: point(-2520, 2367),
    description: 'Eighteen hexes in a strip two wide down the Iberos face of the peninsula, and the only country in the southwest with no hot desert on it at all. The atlas draws its line twice over and in the same place: eight `hills` hexes that are every one of them `Csb`, the cooler-summer Mediterranean form, and ten `grassland` hexes that are every one of them `Csa`, the hot-summer one, with no hex where the two fields disagree. On a coastal strip two hexes wide the only thing that makes a summer cooler is height, so the line is drawn by the ridge - and the ridge is why everything west of here is a desert. Sea air comes in off the Iberos, seventy-four metres of oak and maquis wrings it out, and what crosses the crest has the rain already taken out of it: the Central Meroshe\u2019s sand sea begins on the far side of this one hill. East of the crest the ground falls three hundred metres to twenty hex edges of open water through grass, aromatic scrub and the low olive-grey of a hot-summer terrace. One gap breaks the ridge, and the atlas puts the only river it draws on this whole coast in the bottom of it. Dinelv the capital, the Route Registry, the Tariff Table, the caravan road that crosses the gap and every plot on the terrace are the Maroshi court\u2019s and none of them is built.',
    palette: { ground: '#4d5c33', accent: '#9aa872', fog: '#8a9670', sky: 0xa8c6d4, haze: 0xb7c3b4, hazeDensity: .0055 },
    npcIds: [], landmarks: ['marosh-ridge', 'marosh-water-gap', 'marosh-water', 'marosh-terrace', 'marosh-shore', 'marosh-dry-side'] },
  Trogo: { subtitle: 'The first rainforest', spawn: point(-2300, 2887),
    description: 'Twenty-two hexes of `deep_forest`, every one of them `Af` - tropical rainforest with no dry season, the wettest code the atlas paints anywhere on the map - with seven `Csa` `grassland` hexes along the southern shore where the forest stops, and no hex where the two fields disagree. One hex west is the South Meroshe, which is hot desert on all twenty-one of its own, and the thirteen hex edges between them are the sharpest boundary the atlas draws anywhere. The lore explains both in one sentence: "a ridgeline that catches the southern moisture and drops a fog wall on its windward face while the leeward side stays desert." This is the ridgeline. It stands fifty metres over the desert behind it, takes the whole southern ocean on its face, and the fog job 2 built into the Meroshe\u2019s stone floor comes off this crest. **Two rules belong to this country and to nowhere else yet.** The air is so thick that a traveler is half hidden at fifty-eight paces and gone at a hundred and twenty - the shortest sight line in the game by a factor of two. And the ground can be walked along the watercourses, the animal paths and the clearings, and not through the thicket between them: a country you cannot see far in and cannot go straight through. The three peoples of the ecotone, their fog-conditional verb aspect, the estuary fishing villages, the timber Hama has been quietly buying for a century and the resin the Maroshi court taxes without understanding are all somebody\u2019s, and none of them is built.',
    palette: { ground: '#2c3a24', accent: '#5d7350', fog: '#4e6247', sky: 0x8e9d92, haze: 0x6d7d6b, hazeDensity: .0144 },
    npcIds: [], landmarks: ['trogo-forest', 'trogo-fog-ridge', 'trogoreth', 'trogo-animal-paths', 'trogo-clearings', 'trogo-thicket', 'trogo-forest-edge', 'trogo-estuary'] },
  // Selemis occupies the atlas island Selemi; the regional key remains stable.
  // Its open harbor shares Ascarth's air. The sea fleet replaces city walls.
  Selemi: { subtitle: 'Selemis, city of the tides', spawn: point(-835, 2473.0525588832575),
    description: 'Selemis fills most of the crescent island south-west of Southern Ascarth. Colorful merchant palazzi line tidal canals and stone bridges; the Palace of the Tides combines ancient sea-god colonnades with arcaded galleries and green copper domes. The open Seloca harbor holds ocean-going carracks, oared galleys and small canal boats. The fleet protects this great trading city, which has no defensive walls. Sea cliffs, gulls and dolphins remain around its outer shore.',
    palette: { ground: '#b1a971', accent: '#e3d9ac', fog: '#c4cfc4', sky: 0xb3d6e0, haze: 0xcdd6d0, hazeDensity: .0045 },
    npcIds: [], landmarks: ['selamus', 'selamus-temple', 'selamus-exchange', 'selamus-archive', 'selamus-arsenal', 'selemis-harbour', 'selemis-west-head', 'selemis-east-head', 'selemis-south-cliffs', 'selemis-channel'] },
  // **Telemonia, stages 1 and 2** (docs/telemonia-stage1-brief.md, docs/telemonia-stage2-brief.md). The rim,
  // the passes, the Galmeth, Kethorn's crag and the wall across its one open side, the terraces, the
  // Belketh and the wildlife (stage 1); the town on the rock, the farms, the herds, the Telemon and the
  // field people, and how a traveler is met (stage 2, src/content/regions/telemonia/telemonia-town.js, src/content/regions/telemonia/telemonia-people.js).
  //
  // **The Oves Desert's own sky, to the digit.** The lore puts the highland "in the same belt as the Oves
  // Desert to its north and the Galan steppe to its east, and for most of the year it looks like them",
  // and the bands' road north is the desert's southern route: one dry air over both. The Oves builder
  // gave the desert the clearest air in the game because the one thing a rain shadow has is distance,
  // and a bowl of bare rock a few tens of metres higher has as much of it.
  Telemonia: { subtitle: 'The highland of the Telemon', spawn: point(-2016, 1196),
    description: 'A bowl with a thick rim. Between the Oves Desert, the Galan lowland, the hills at the foot of Legemum and East Pyros the ground rises into a knot of dry rock: ridge behind ridge running north-east to south-west, bare on the crests and broken by bands of cliff, with narrow valleys between them that end against the next ridge. Three passes go through - north to the Oves, east to Gala and south toward Legemum - and none on the East Pyros side, where the rim is widest and the Rothkar, its highest rock, stands over everything. Inside the rim lies the Galmeth, one raised and level plain with dry washes across it, and in the middle of the plain the crag that carries Kethorn: cliff on three sides and a wall across the fourth, with one gate. Terraces step the rim’s inner faces down from the cliff foot to the plain, dry-stone walls holding steps of bare earth, and one way climbs them and the cliff above to the foot of the Rothkar. Bunch grass, wormwood and thorn on the slopes, grey scrub oak and juniper in the folds, bare stone above; only the south-eastern corner holds a wood, the Belketh. Hot and dry, with no river inside: the only running water is on the borders, the Caelin along the northern foot and the Treloss down the eastern side. On the rock the town, of its own stone: the halls of the bands, the granaries and the cisterns, and at the end of its one street the hall of the king. The plain is farmed to its edges and the vine is on every terrace, worked by the field people, who carry no weapons; every Telemon man carries a long spear, a shield and a knife, and every woman a knife. There is no gate at the border: whoever sees an outsider walks him back to it.',
    palette: { ground: '#a59c7a', accent: '#e2d6b0', fog: '#d0c8b0', sky: 0xcedcd2, haze: 0xe3dabd, hazeDensity: .0034 },
    npcIds: [], landmarks: ['telemonia-galmeth', 'telemonia-kethorn', 'telemonia-kethorn-gate', 'telemonia-rothkar', 'telemonia-tarnel', 'telemonia-east-pass', 'telemonia-south-pass', 'telemonia-terraces', 'telemonia-rothkar-way', 'telemonia-belketh', 'telemonia-west-rim', 'telemonia-band-halls', 'telemonia-king-hall', 'telemonia-field-huts'] },
};

export const regions = Object.freeze(REGION_ORDER.map(name => {
  const text = REGION_TEXT[name], loops = REGION_OUTLINES[name];
  const bounds = outlineBounds(loops);
  return Object.freeze({
    id: REGION_IDS[name], name, subtitle: text.subtitle, description: text.description,
    palette: Object.freeze({ ...text.palette }), spawn: text.spawn,
    biome: REGION_BIOMES[name].id, minZ: bounds.minZ, maxZ: bounds.maxZ, minX: bounds.minX, maxX: bounds.maxX,
    bounds: Object.freeze(bounds), outline: Object.freeze(loops.map(loop => Object.freeze(loop.map(p => point(p.x, p.z))))),
    border: Object.freeze(REGION_BORDERS[name].map(loop => Object.freeze(loop.map(p => point(p.x, p.z))))),
    npcIds: Object.freeze([...text.npcIds]), landmarks: Object.freeze([...text.landmarks]),
  });
}));
const regionById = new Map(regions.map(region => [region.id, region]));
const regionByName = new Map(regions.map(region => [region.name, region]));

/**
 * Ground the atlas does not own. The height field, the scatter and WORLD_BOUNDS run past the
 * outlines the World Builder drew, and in the west that is the majority of what a traveler can
 * walk to: 89,584 of 169,541 sampled cells, about 143 hectares, up to a kilometre beyond the
 * nearest outline (docs/known-issues.md, "Half of the walkable west..."). It used to be given
 * the nearest region's name, so the card said Nesdor a kilometre south of Nesdor. It is open
 * country now, and everything that names where you are says that instead of borrowing a name.
 *
 * It keeps a region's shape so that every reader of `regionAt` goes on working, and its id is 0,
 * which no province has.
 */
export const OPEN_COUNTRY = Object.freeze({
  id: 0, name: 'Open country', subtitle: 'Ground no country on the atlas claims',
  description: 'Country outside every border the atlas draws. Nobody rules it, nobody patrols it, and nothing on your chart is going to tell you where you are.',
  open: true, biome: null, spawn: null,
});
/** True for the sentinel above, and for nothing else. */
export const isOpenCountry = region => !!region && region.id === 0 && region.open === true;

/**
 * How far past the atlas's own hexes a point may lie and still belong to the country beside it,
 * measured from the centre of that hex. A hex is METRES_PER_HEX (100 m) flat to flat, so it
 * already reaches 50 m to its edges and 57.7 m to its corners: 76 m is 26 m of fringe beyond a
 * flat edge, about a quarter of a hex, and less than that past a corner.
 *
 * Why there is a fringe at all. The atlas is drawn in 100 m hexes and the world is built in
 * metres, so a country's built shore does not stop where its hexes do. South of Tidehaven the
 * atlas ends Drent at about x = 0 for every z from 74 to 140, while the beach the traveler
 * walks runs on east of that: 1,055 standable cells of Drent's own coast sit on hexes Drent
 * does not own, including 1,282 of the Weatherhead's disc, where Cabe sits and smokes. Since
 * open country landed, all of that read "Open country" - a traveler on Tidehaven's own strand,
 * in sight of the pier, told he was in no country at all.
 *
 * 76 m is the measurement, not a guess: it is the smallest whole metre that takes in every
 * standable cell of Drent's built coast, the worst of which is the south-east strand at
 * (25, 127), 75.86 m from the nearest Drent hex centre. The Weatherhead's standable disc needs
 * 66.61 m, its stand 55.23 m.
 *
 * What it must not do is give the west its names back, and it does not: the unowned west is
 * hundreds of metres past the outlines, not tens. Every point the builder pinned - a kilometre
 * south of Nesdor, 606 m west of Caricas, the west edge past Meneth, West Izol's name on the
 * mainland - is still open country. Over the western box the builder sampled, the share of
 * standable ground outside every outline goes from 53.1% to 50.4% (docs/known-issues.md).
 *
 * This is the coordinator's reading of the user's ruling, which was about the unowned west and
 * not about a sliver of a country's own shore (docs/design-answers.md, 2026-09-21).
 */
export const SHORE_FRINGE = 76;

/**
 * **What country is the traveler standing in?** That is this function's question, and the
 * answer is what he is told: the region card, the kicker, the minimap, the trails sheet and the
 * ambient sound all read it. Its companion `hexOwnerAt` answers a different question and gives
 * a different answer, and the two must not be swapped for each other.
 *
 * By authored hex. A point whose hex no region owns is open country - the sea, and the unowned
 * ground past the outlines - unless it lies within SHORE_FRINGE of an owned hex beside it,
 * which is a country's own shore running past the atlas's grid rather than ground nobody
 * claims.
 *
 * Only the six neighbours are looked at, and that is provably enough: a point is never more
 * than one circumradius (57.7 m) from its own hex's centre, and a ring-two centre is at least
 * 173.2 m from that, so nothing two rings out can ever be within 115.5 m, let alone 76.
 */
export function regionAt(x, z) {
  if (!Number.isFinite(x) || !Number.isFinite(z)) return null;
  const home = hexAt(x, z), owner = cellRegion.get(key(home.q, home.r));
  if (owner) return regionByName.get(owner);
  let near = null, nearest = SHORE_FRINGE;
  for (const [dq, dr] of AXIAL_NEIGHBORS) {
    const side = key(home.q + dq, home.r + dr), name = cellRegion.get(side);
    if (!name) continue;
    const centre = cellCentre.get(side), distance = Math.hypot(centre.x - x, centre.z - z);
    if (distance < nearest) { nearest = distance; near = name; }
  }
  return near ? regionByName.get(near) : OPEN_COUNTRY;
}
/**
 * **`regionAt` as it answered before some regions were registered.** A reviewed country's scatter was
 * approved with `regionAt` deciding where it may plant, and `regionAt` lends a built country's name across
 * the shore fringe to unclaimed ground beside it. When a neighbour is later registered on that ground the
 * loan ends, the scatter loop rejects different candidates and the whole seeded stream moves - every batch
 * of the reviewed country changes, not just the border. A country whose approved composition must survive
 * its neighbours' registration (Alezhor beside the Ibenals, North Celder beside Henborth) asks this instead,
 * naming the neighbours it was approved without: their hexes count as unclaimed, and the fringe reads them
 * as the reviewed country did. Nothing else changes; the neighbours' own scatter still uses `regionAt`.
 */
export function regionAtWithout(x, z, later) {
  if (!Number.isFinite(x) || !Number.isFinite(z)) return null;
  const skip = name => later.includes(name);
  const home = hexAt(x, z), owner = cellRegion.get(key(home.q, home.r));
  if (owner && !skip(owner)) return regionByName.get(owner);
  let near = null, nearest = SHORE_FRINGE;
  for (const [dq, dr] of AXIAL_NEIGHBORS) {
    const side = key(home.q + dq, home.r + dr), name = cellRegion.get(side);
    if (!name || skip(name)) continue;
    const centre = cellCentre.get(side), distance = Math.hypot(centre.x - x, centre.z - z);
    if (distance < nearest) { nearest = distance; near = name; }
  }
  return near ? regionByName.get(near) : OPEN_COUNTRY;
}
/**
 * **Which region's hex is this point on?** A different question from `regionAt`'s, which is why
 * it has a different name. It was called `regionNameAt` until the shore fringe landed, and that
 * name then said it was `regionAt(x, z).name` with the object unwrapped. It is not: it carries
 * **no shore fringe**, so along any built coast the two disagree, and 1,055 cells of Drent's
 * own strand are a country to `regionAt` and nobody's hex to this.
 *
 * This is the builder's question, not the traveler's: every caller of it in src/ is a scatter
 * filter deciding where a region's trees, rocks and props may be put down
 * (src/content/regions/western-regions/west-regions-scenery.js, src/content/regions/amod/amod-scenery.js, src/content/regions/pueth/pueth-scenery.js,
 * src/content/regions/east-suval/east-suval-world.js, src/world/terrain/world-regions.js, src/content/regions/solis/west-suval.js, src/content/regions/western-regions/west-regions.js,
 * src/content/quests/rena/rena.js). Those want the atlas's own grid and nothing else: Caricas's forest belongs on
 * Caricas's hexes. Handing them the fringe instead re-seeds every one of those loops - it was
 * measured at about 4,700 colliders moved across the west, because a rejected candidate still
 * advances the seeded stream - and the west's animals were retuned against the scatter as it
 * is (`tests/west-life.test.js`: nothing in the west can be walked down).
 *
 * So: scatter by this, and tell the traveler by `regionAt`. `tests/open-country.test.js` holds
 * both halves, including that no scatter module may quietly move to the other one.
 */
export const hexOwnerAt = (x, z) => {
  if (!Number.isFinite(x) || !Number.isFinite(z)) return null;
  const home = hexAt(x, z);
  return cellRegion.get(key(home.q, home.r)) ?? OPEN_COUNTRY.name;
};
export const regionInfo = id => regionById.get(id) ?? null;
/** Strictly inside an authored outline, with no nearest-region fallback. */
export function insideRegion(name, x, z) {
  return (REGION_OUTLINES[name] ?? []).some(loop => pointInPolygon(loop, x, z));
}

export { REGION_BIOMES, METRES_PER_HEX, borderMidpoint, pointInPolygon };

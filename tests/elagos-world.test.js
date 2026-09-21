import test from 'node:test';
import assert from 'node:assert/strict';
import { sourceModule } from './module-loader.js';
import * as THREE from '../vendor/three.module.js';
import { canStand } from '../src/game-state.js';
import { PLAYABLE_REGIONS, REGION_BIOMES } from '../src/region-layout.js';
import { PLAYABLE_SURVEY } from '../src/region-survey.js';
import {
  REGION_IDS, REGION_TERRAIN, REGION_OUTLINES, WORLD_BOUNDS, AMBRON, ambronPoint, hexCentre,
  hexOwnerAt, insideRegion, MAIN_ROAD,
} from '../src/region-world.js';
import { groundWithRiver, regionBase } from '../src/world-terrain.js';
import {
  ELAGOS_BASINS, ELAGOS_REACHES, LAKE_ELA, LAKE_BRUL, LAKE_OSSEN, THELAS_BASINS, ELA_SOUTH, THELAS_LINK,
  AMBRON_ROAD, LAKE_ROAD, ELAGOS_ROADS, AMBRON_JUNCTION, LINK_BRIDGE, ELAGOS_LANDMARKS, ELAGOS_PLACES,
  ELAGOS_CHART_WATERS, ELAGOS_CLEARINGS, NEMMEL, elagosWater, elagosWaterDistance, WATER_FLOOR, WATER_FIELD_BOUNDS,
} from '../src/elagos-world.js';
import { SUBREGIONS } from '../src/map-fog.js';
import { BUILD_STATUS, regionBuildStatus } from '../src/build-status.js';
import { RIDE } from '../src/riding.js';

const { createWorld } = await sourceModule('../src/world.js');
const world = createWorld(new THREE.Scene());
const WALKER = .45;

test('Elagos is the ninth playable region, true to the atlas', () => {
  assert.ok(PLAYABLE_REGIONS.includes('Elagos'));
  assert.equal(REGION_IDS.Elagos, 9, 'West Izol took 8 first');
  const survey = PLAYABLE_SURVEY.regions.find(region => region.name === 'Elagos');
  assert.ok(survey, 'the baked survey carries Elagos');
  const count = terrain => survey.cells.filter(cell => cell.terrain === terrain).length;
  assert.deepEqual({ hexes: survey.cells.length, grassland: count('grassland'), lake: count('lake'), forest: count('forest') },
    { hexes: 43, grassland: 32, lake: 5, forest: 6 }, 'forty-three hexes, five of them water');
  // A biome of its own, and the highest ground in the playable world: everything falls away from the shelf.
  assert.equal(new Set(PLAYABLE_REGIONS.map(name => REGION_BIOMES[name].id)).size, PLAYABLE_REGIONS.length, 'every region has its own biome');
  const shelf = REGION_TERRAIN.Elagos;
  // Everything falls away from the shelf except the three uplands the lore puts
  // above it: Amod, whose terraces descend into the lake country; Vastos, the
  // tableland that "sits above the surrounding terrain on both its eastern and
  // western approaches", one of which is this one; and Meneth's ridge country on
  // the mountain margin, which the lake country is reached by coming down from.
  const uplands = ['Elagos', 'Amod', 'Vastos', 'Meneth'];
  for (const name of PLAYABLE_REGIONS) if (!uplands.includes(name)) assert.ok(shelf.base > REGION_TERRAIN[name].base, `the shelf stands above ${name}`);
  for (const name of ['Amod', 'Vastos', 'Meneth']) assert.ok(REGION_TERRAIN[name].base > shelf.base, `${name} stands above the shelf`);
  assert.ok(REGION_TERRAIN.Amod.base > shelf.base, 'Amod stands above the shelf and drains into it');
  // Where it lies: north-west of Luscia, west of Drent, north of the Moros.
  const centre = loops => { const points = loops.flat(); return { x: points.reduce((s, p) => s + p.x, 0) / points.length, z: points.reduce((s, p) => s + p.z, 0) / points.length }; };
  const here = centre(REGION_OUTLINES.Elagos), moros = centre(REGION_OUTLINES['Moros Plain']), drent = centre(REGION_OUTLINES.Drent);
  assert.ok(here.z < moros.z, 'north of the Moros Plain');
  assert.ok(here.x < drent.x, 'west of Drent');
  // The Lake Lands grew the world west, and every region built west of them since
  // has grown it further west and nowhere else: the other three edges have not moved.
  assert.ok(WORLD_BOUNDS.minX <= -1600, `world minX ${WORLD_BOUNDS.minX.toFixed(1)}`);
  assert.ok(REGION_OUTLINES.Elagos.flat().every(p => p.x > WORLD_BOUNDS.minX), 'the shelf is no longer the western edge itself');
  assert.ok(WORLD_BOUNDS.maxX > 559 && WORLD_BOUNDS.maxZ > 1272 && WORLD_BOUNDS.minZ < -608, 'the other three edges are where they were');
});

test('every lake the atlas painted is under water, and no basin wanders off its own hexes', () => {
  const claimed = PLAYABLE_SURVEY.regions.find(region => region.name === 'Elagos').cells.filter(cell => cell.terrain === 'lake');
  assert.equal(claimed.length, 5);
  for (const cell of claimed) {
    const centre = hexCentre(cell.q, cell.r);
    assert.ok(elagosWaterDistance(centre.x, centre.z) < 0, `the atlas's lake hex ${cell.q},${cell.r} is water on the ground`);
  }
  // Each basin answers for the authored hexes it names, and stays within a hex of them.
  for (const water of ELAGOS_BASINS) {
    for (const [q, r] of water.hexes) {
      const centre = hexCentre(q, r);
      assert.ok(Math.hypot(centre.x - water.centre.x, centre.z - water.centre.z) < 140, `${water.id} is built round hex ${q},${r}`);
    }
    const reach = Math.max(...water.shore.map(p => Math.hypot(p.x - water.centre.x, p.z - water.centre.z)));
    assert.ok(reach < 130, `${water.id} is a lake and not a sea (${reach.toFixed(0)} m)`);
    for (const p of water.shore) assert.ok(insideRegion('Elagos', p.x, p.z) || water === LAKE_ELA, `${water.id}'s shore stays in Elagos`);
  }
  // The lore's own arrangement: Brul to the north-east, the Thelas chain west, Ossen east, Ela the great one.
  assert.ok(LAKE_BRUL.centre.z < LAKE_ELA.centre.z && LAKE_BRUL.centre.x > LAKE_ELA.centre.x, 'Brul is north-east of Ela');
  assert.ok(LAKE_OSSEN.centre.x > LAKE_ELA.centre.x, 'Ossen is east');
  assert.equal(THELAS_BASINS.length, 3, 'the Thelas chain is three basins');
  for (let i = 1; i < THELAS_BASINS.length; i++) {
    const a = THELAS_BASINS[i - 1].centre, b = THELAS_BASINS[i].centre;
    assert.ok(Math.hypot(a.x - b.x, a.z - b.z) < 60, 'and they are connected');
  }
  const elaArea = LAKE_ELA.along * LAKE_ELA.across;
  for (const water of ELAGOS_BASINS) if (water !== LAKE_ELA) assert.ok(water.along * water.across < elaArea * .6, `Ela is larger than ${water.id}`);
});

test('the ground is cut to the water: a lake is water at its shore, a bed nobody can stand on, and dry land outside it', () => {
  let shoreSamples = 0;
  for (const water of ELAGOS_BASINS) for (const p of water.shore) {
    const dx = p.x - water.centre.x, dz = p.z - water.centre.z, length = Math.hypot(dx, dz) || 1;
    const out = { x: p.x + dx / length * 12, z: p.z + dz / length * 12 };
    const reading = elagosWater(out.x, out.z);
    if (!reading || reading.d < 1) continue;                 // another body overlaps here; the shore is not this one's
    shoreSamples++;
    assert.ok(groundWithRiver(out.x, out.z) >= reading.surface - 1e-6,
      `${water.id} floods its own bank at ${out.x.toFixed(0)}, ${out.z.toFixed(0)}`);
  }
  assert.ok(shoreSamples > 150, `${shoreSamples} shore samples`);
  // Nowhere in the field does dry land stand above water that is drawn over it.
  for (let x = WATER_FIELD_BOUNDS.minX; x <= WATER_FIELD_BOUNDS.maxX; x += 5)
    for (let z = WATER_FIELD_BOUNDS.minZ; z <= WATER_FIELD_BOUNDS.maxZ; z += 5) {
      const reading = elagosWater(x, z);
      if (!reading || reading.d > -2) continue;
      assert.ok(groundWithRiver(x, z) <= reading.surface, `land stands out of the water at ${x.toFixed(0)}, ${z.toFixed(0)}`);
    }
  // And a lake is deep: nobody wades more than a few metres from the shore.
  const middle = { x: LAKE_ELA.centre.x, z: LAKE_ELA.centre.z };
  assert.ok(Math.abs(groundWithRiver(middle.x, middle.z) - WATER_FLOOR) < 1e-6, 'the bed of Ela is below footing');
  assert.equal(canStand(middle.x, middle.z, world, WALKER), false, 'nobody stands in the middle of Lake Ela');
  for (const water of ELAGOS_BASINS) {
    const p = water.shore[7], dx = water.centre.x - p.x, dz = water.centre.z - p.z, length = Math.hypot(dx, dz);
    assert.equal(canStand(p.x + dx / length * 14, p.z + dz / length * 14, world, WALKER), false, `${water.id} cannot be waded`);
  }
});

test('the Ela-south leaves Lake Ela, runs through Ambron and only ever falls', () => {
  const points = ELA_SOUTH.points;
  assert.ok(elagosWaterDistance(points[0].x, points[0].z) < 0, 'it starts in the lake');
  for (let i = 1; i < points.length; i++) assert.ok(points[i].surface <= points[i - 1].surface + 1e-9, 'water never runs uphill');
  assert.ok(points[0].surface === LAKE_ELA.surface, 'the narrows is the lake, pinched');
  assert.ok(points.at(-1).surface < LAKE_ELA.surface - 9, 'and it has dropped to the plain by the time it leaves');
  // Every vertex stands below its own banks.
  for (const p of points) {
    const banks = [regionBase(p.x - p.half - 16, p.z), regionBase(p.x + p.half + 16, p.z)];
    assert.ok(Math.max(...banks) > p.surface + .8, `the Ela-south at z=${p.z} has a bank`);
  }
  // It goes through the city, not round it: the channel crosses both wall lines.
  const north = points.find(p => Math.abs(p.z - (AMBRON.centre.z - AMBRON.halfB)) < 1);
  const south = points.find(p => Math.abs(p.z - (AMBRON.centre.z + AMBRON.halfB)) < 1);
  assert.ok(north && south, 'the channel meets both water gates');
  assert.ok(Math.abs(north.half * 2 - 46) < 1 && Math.abs(south.half * 2 - 46) < 1, 'the narrows is forty-six metres through the walls');
  // The Link brings the Thelas chain down into Ela.
  assert.ok(THELAS_LINK.points[0].surface > THELAS_LINK.points.at(-1).surface, 'the Link falls');
  assert.ok(elagosWaterDistance(THELAS_LINK.points.at(-1).x, THELAS_LINK.points.at(-1).z) < 0, 'and reaches Lake Ela');
  assert.ok(THELAS_LINK.points.every(p => p.half < 12), 'too small to load');
  // The reach leaves the country it belongs to rather than stopping in the middle of it.
  // Measured against Elagos's own western edge, not the world's: the world's edge is only 15 m
  // west of this endpoint and moves whenever a region is added out there, which would fail this
  // for a reason that has nothing to do with the river. Elagos's edge is 75 m away and is the
  // thing the sentence is actually about.
  const elagosWest = Math.min(...REGION_OUTLINES.Elagos.flat().map(corner => corner.x));
  assert.ok(points.at(-1).x < elagosWest,
    `the Ela-south ends at ${points.at(-1).x.toFixed(1)}, which is not west of Elagos's edge at ${elagosWest.toFixed(1)}`);
  assert.ok(!insideRegion('Elagos', points.at(-1).x, points.at(-1).z), 'the Ela-south leaves the Lake Lands');
  // This used to be put as "runs off the west edge of the world", which was true while Elagos
  // was the westernmost built region. Vastos, Meneth, Caricas and Nesdor now lie west of it,
  // Nesdor's drainage takes this water on, and the reach has to stay inside the world it crosses.
  assert.ok(points.at(-1).x > WORLD_BOUNDS.minX, 'and stays inside the world it now has to cross');
  // And it never crosses the Moros road.
  for (let i = 1; i < points.length; i++) for (let t = 0; t <= 1; t += .05) {
    const x = points[i - 1].x + (points[i].x - points[i - 1].x) * t, z = points[i - 1].z + (points[i].z - points[i - 1].z) * t;
    for (let k = 1; k < MAIN_ROAD.length; k++) {
      const a = MAIN_ROAD[k - 1], b = MAIN_ROAD[k], dx = b.x - a.x, dz = b.z - a.z;
      const u = Math.max(0, Math.min(1, ((x - a.x) * dx + (z - a.z) * dz) / (dx * dx + dz * dz)));
      assert.ok(Math.hypot(x - a.x - dx * u, z - a.z - dz * u) > 40, 'the Ela-south keeps clear of the Moros road');
    }
  }
});

test('the haul road comes up from the Moros to Ambron’s Plain Gate, and a rider can take it', () => {
  assert.ok(Math.hypot(AMBRON_ROAD[0].x - AMBRON_JUNCTION.x, AMBRON_ROAD[0].z - AMBRON_JUNCTION.z) < 1e-9, 'it leaves the main road');
  // The junction is on the main road itself.
  let best = Infinity;
  for (let i = 1; i < MAIN_ROAD.length; i++) {
    const a = MAIN_ROAD[i - 1], b = MAIN_ROAD[i], dx = b.x - a.x, dz = b.z - a.z;
    const t = Math.max(0, Math.min(1, ((AMBRON_JUNCTION.x - a.x) * dx + (AMBRON_JUNCTION.z - a.z) * dz) / (dx * dx + dz * dz)));
    best = Math.min(best, Math.hypot(AMBRON_JUNCTION.x - a.x - dx * t, AMBRON_JUNCTION.z - a.z - dz * t));
  }
  assert.ok(best < .01, 'the junction stands on the road');
  assert.equal(hexOwnerAt(AMBRON_JUNCTION.x, AMBRON_JUNCTION.z), 'Moros Plain');
  const gate = ambronPoint(56, AMBRON.halfB);
  assert.ok(AMBRON_ROAD.some(p => Math.hypot(p.x - gate.x, p.z - gate.z) < 1e-6), 'and passes through the Plain Gate');
  assert.ok(AMBRON_ROAD.at(-1).z < gate.z, 'ending inside the walls');
  const length = AMBRON_ROAD.reduce((sum, p, i) => i ? sum + Math.hypot(p.x - AMBRON_ROAD[i - 1].x, p.z - AMBRON_ROAD[i - 1].z) : 0, 0);
  assert.ok(length > 180 && length < 400, `the haul road is ${length.toFixed(0)} m`);
  assert.deepEqual(world.elagosRoute, AMBRON_ROAD.map(p => ({ x: p.x, z: p.z })));
  for (const road of ELAGOS_ROADS)
    assert.ok(world.paths.some(path => path.length === road.length && path.every((p, i) => p.x === road[i].x && p.z === road[i].z)), 'drawn as a world path');
  // A rider can take the haul road and the lake road end to end.
  for (const road of [AMBRON_ROAD, LAKE_ROAD]) for (let i = 1; i < road.length; i++) {
    const a = road[i - 1], b = road[i], steps = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.z - a.z)));
    for (let step = 0; step <= steps; step++) {
      const x = a.x + (b.x - a.x) * step / steps, z = a.z + (b.z - a.z) * step / steps;
      assert.ok(canStand(x, z, world, RIDE.radius), `a rider is stopped at ${x.toFixed(1)}, ${z.toFixed(1)}`);
    }
  }
});

test('the lake road keeps its feet dry, and the Link is crossed on its own slabs', () => {
  const onBridge = (x, z) => {
    const dx = x - LINK_BRIDGE.crossing.x, dz = z - LINK_BRIDGE.crossing.z;
    return Math.abs(dx * LINK_BRIDGE.axis.x + dz * LINK_BRIDGE.axis.z) <= LINK_BRIDGE.halfSpan + 1.5;
  };
  for (let i = 1; i < LAKE_ROAD.length; i++) {
    const a = LAKE_ROAD[i - 1], b = LAKE_ROAD[i], steps = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.z - a.z) / 2));
    for (let step = 0; step <= steps; step++) {
      const x = a.x + (b.x - a.x) * step / steps, z = a.z + (b.z - a.z) * step / steps;
      if (onBridge(x, z) || Math.abs(x - AMBRON.centre.x) < AMBRON.halfA) continue;
      assert.ok(elagosWaterDistance(x, z) > 3, `the lake road paddles at ${x.toFixed(0)}, ${z.toFixed(0)}`);
    }
  }
  // The crossing itself: standable over water that is not.
  assert.ok(canStand(LINK_BRIDGE.crossing.x, LINK_BRIDGE.crossing.z, world, WALKER), 'the slabs carry a traveler');
  assert.ok(Math.abs(world.heightAt(LINK_BRIDGE.crossing.x, LINK_BRIDGE.crossing.z) - LINK_BRIDGE.deckY) < .2, 'at the deck’s height');
  const off = { x: LINK_BRIDGE.crossing.x + LINK_BRIDGE.side.x * 6, z: LINK_BRIDGE.crossing.z + LINK_BRIDGE.side.z * 6 };
  assert.equal(canStand(off.x, off.z, world, WALKER), false, 'and the water either side of it does not');
  // Both ends sit close to the ground they meet.
  for (const end of [LINK_BRIDGE.south, LINK_BRIDGE.north])
    assert.ok(Math.abs(groundWithRiver(end.x, end.z) - LINK_BRIDGE.deckY) < 1, 'the slabs meet the bank');
});

test('the lake country has its places, and every one of them stands where its description says', () => {
  const ids = ELAGOS_LANDMARKS.map(place => place.id);
  assert.equal(new Set(ids).size, ids.length, 'no landmark is named twice');
  assert.ok(ELAGOS_LANDMARKS.length >= 12, `${ELAGOS_LANDMARKS.length} landmarks`);
  for (const place of ELAGOS_LANDMARKS) {
    assert.ok(place.description.length > 80, `${place.id} has something to find`);
    assert.ok(Number.isFinite(place.x) && Number.isFinite(place.z));
    assert.ok(world.landmarks.some(entry => entry.id === place.id), `${place.id} is in the world's landmarks`);
  }
  // Nemmel is a hamlet on Ela's shore; the ice-road stone and the shrine stand at the water.
  assert.ok(elagosWaterDistance(NEMMEL.x, NEMMEL.z) < 20 && elagosWaterDistance(NEMMEL.x, NEMMEL.z) > 0, 'Nemmel stands on the beach');
  for (const place of Object.values(ELAGOS_PLACES)) {
    // The stone, the shrine and the capstan are solid: a traveler stands beside them.
    const beside = [[2.5, 0], [-2.5, 0], [0, 2.5], [0, -2.5], [4, 0], [-4, 0]];
    assert.ok(beside.some(([dx, dz]) => canStand(place.x + dx, place.z + dz, world, WALKER)), `${place.id} can be walked up to`);
    assert.equal(world.regionAt(place.x, place.z)?.name, 'Elagos', `${place.id} is in Elagos`);
  }
  for (const id of ['ice-road-stone', 'lake-shrine']) {
    const place = Object.values(ELAGOS_PLACES).find(entry => entry.id === id);
    assert.ok(elagosWaterDistance(place.x, place.z) < 12, `${id} stands at the water`);
  }
  // The winters are on the ground: the ice-road stone, and a warden who reads it.
  const ice = ELAGOS_LANDMARKS.find(place => place.id === 'ice-road-stone');
  assert.match(ice.description, /ice/i);
});

test('the charts, the journal and the developer’s build map all know about Elagos', () => {
  for (const water of ELAGOS_CHART_WATERS) {
    assert.ok(world.mapWaters.some(entry => entry.id === water.id), `${water.id} is charted`);
    assert.ok(water.points.length >= 8);
  }
  const areas = SUBREGIONS.filter(area => area.region === 'Elagos');
  assert.ok(areas.length >= 4, `${areas.length} named areas in Elagos`);
  for (const area of areas) {
    assert.ok(area.note.length > 30, `${area.id} has a journal note`);
    assert.equal(world.regionAt(area.x, area.z)?.name, 'Elagos', `${area.id} is in Elagos`);
  }
  // Areas keep their distance, by the whole chart's own rule (tests/map-fog.test.js).
  for (let i = 0; i < areas.length; i++) for (let j = i + 1; j < areas.length; j++)
    assert.ok(Math.hypot(areas[i].x - areas[j].x, areas[i].z - areas[j].z) > Math.max(areas[i].radius, areas[j].radius) * .6,
      `${areas[i].id} and ${areas[j].id} crowd each other`);
  assert.ok(BUILD_STATUS.Elagos, 'the build map has an honest entry');
  const status = regionBuildStatus('Elagos');
  assert.equal(status.state, 'early');
  assert.ok(status.work.length > 40, 'and says what is still missing');
});

test('the scatter of the Lake Lands keeps out of the water and off the made ground', () => {
  assert.ok(ELAGOS_CLEARINGS.length > 100, 'the water is covered by clearings');
  // No tree, rock or tuft of the regional scatter stands in an Elagosi lake.
  const inside = world.colliders.filter(collider => collider.kind === 'region-tree' || collider.kind === 'ridge-rock')
    .filter(collider => elagosWaterDistance(collider.x, collider.z) < 0);
  assert.deepEqual(inside, [], 'nothing grows in the lakes');
  assert.ok(world.elagosMetrics.waterMeshes >= 4 && world.elagosMetrics.waterMeshes <= ELAGOS_BASINS.length + ELAGOS_REACHES.length,
    'every body of water is drawn, the Thelas chain as one');
  assert.ok(world.elagosMetrics.colliders > 400, 'and every one of them is blocked');
});

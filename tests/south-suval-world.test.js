import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { sourceModule } from './module-loader.js';
import * as THREE from '../vendor/three.module.js';
import { canStand, canSwim, waterAt } from '../src/gameplay/movement/game-state.js';
import { BODY } from '../src/gameplay/combat/bodies.js';
import { PLAYABLE_REGIONS, REGION_BIOMES } from '../src/world/terrain/region-layout.js';
import { RIVER_EDGES } from '../src/world/terrain/region-rivers.js';
import { REGION_CELLS, hexAt, hexCentre, hexOwnerAt, regionAt, regions, landDistance } from '../src/world/terrain/region-world.js';
import { DEFAULT_SKY, regionSky } from '../src/world/environment/region-sky.js';
import { regionLevel } from '../src/world/terrain/region-levels.js';
import { regionBuildStatus } from '../src/dev/tools/build-status.js';
import { SUBREGIONS } from '../src/ui/map/map-fog.js';
import { ENCLOSED_HEXES } from '../scripts/build-region-survey.mjs';
import {
  STILLWATER, STILLWATER_HEX, IMLAMDRIS_HEX, STILLWATER_SURFACE, STILLWATER_SHORE, SOUTH_SUVAL_CLIMATE,
  stillwaterDistance, TERRACES, STAIRS, cityPoint, cityLocal, cityLevel, hexInset, FACING_LAKE, CITY_FEATHER,
  IMLAMDRIS_HOUSES, STILLWATER_TEMPLE, STAR_TERRACE, LANDWARD_GATE, PASS_ROAD_LINE, passRoadAt,
  COVES, SOUTH_SUVAL_LANDMARKS, SOUTH_SUVAL_CHART_WATERS, southSuvalClear, IMLAMDRIS_PATCH, ELOD_SOUTH_GATE,
} from '../src/content/regions/south-suval/south-suval-world.js';
import { hillPassPoint } from '../src/content/regions/minora-frontier/frontier-ridges.js';
import { SOUTH_SUVAL_WILDLIFE_ZONES } from '../src/content/regions/south-suval/south-suval-wildlife.js';
import { BAT_CAVE, BAT_LANDING, SUVAL_HIGHLAND_TRAILS, IMLAMDRIS_REBUILD } from '../src/content/regions/suval-highlands/suval-highlands.js';
import { ISCARE_ISLANDS, ISCARE_WILDLIFE_ZONES } from '../src/content/regions/iscare/iscare-world.js';

/**
 * South Suval: the peninsula's southern hills, the Stillwater, and Imlamdris on its shore - built
 * on the user's word of 25 September 2026 as terrain, climate, wildlife and one city's stones,
 * with no characters.
 *
 * The standing rule is the atlas wins over the lore, and here they agree, so most of what is
 * asserted below is the atlas's own arithmetic - fifteen land hexes, seven of hills, four of
 * mountain and four of grassland; ten of Csa, three of Csc and two of Cfb; one lake hex, enclosed;
 * no river - and the rest is the lore's own sentences, held to the ground.
 */
const { createWorld } = await sourceModule('../src/world.js');
const scene = new THREE.Scene();
const world = createWorld(scene);
const B = BODY.person;
const region = regions.find(entry => entry.name === 'South Suval');
const WWMAP = new URL('../../world-builder/map/resources/examples/azhora.wwmap', import.meta.url);

test('the completed world leaves the cave approach, flight apron, landing and winding highland paths unobstructed', () => {
  for (const p of [BAT_CAVE.entrance, BAT_CAVE.perch, BAT_CAVE.apron, BAT_CAVE.approach, BAT_LANDING]) {
    assert.ok(canStand(p.x, p.z, world, B), `blocked quest point ${p.x},${p.z}`);
  }
  for (const trail of SUVAL_HIGHLAND_TRAILS) for (let i = 1; i < trail.points.length; i++) {
    const a = trail.points[i - 1], b = trail.points[i], length = Math.hypot(b.x - a.x, b.z - a.z), n = Math.ceil(length);
    for (let k = 0; k <= n; k++) {
      const x = a.x + (b.x - a.x) * k / n, z = a.z + (b.z - a.z) * k / n;
      assert.ok(canStand(x, z, world, B), `${trail.id} is blocked by world scenery at ${x.toFixed(2)},${z.toFixed(2)}: ${JSON.stringify(world.nearColliders(x,z,1).filter(c=>Math.hypot(c.x-x,c.z-z)<(c.r??1)+1).map(c=>c.kind))}`);
    }
  }
  assert.equal(world.suvalHighlandMetrics.woodenHomes, 4);
  assert.equal(world.suvalHighlandMetrics.buildingFrames, 1);
  assert.equal(world.iscareMetrics.islands, 10);
  assert.equal(world.iscareMetrics.ruinedBuildings, 27);
  assert.equal(world.paths[0].kind, 'road', 'the new footpaths never replace the main road');
});

test('Iscare wildlife anchor points stand on actual island footing clear of every ruin and prop', () => {
  for (const zone of ISCARE_WILDLIFE_ZONES) for (const [x,z] of zone.sites) assert.ok(canStand(x,z,world,zone.radius), `${zone.id} starts in scenery ${x},${z}`);
});

test('the atlas: fifteen hexes of hill, ridge and grass round one lake, and three climates', () => {
  assert.ok(PLAYABLE_REGIONS.includes('South Suval'));
  const cells = REGION_CELLS['South Suval'], tally = {};
  for (const cell of cells) tally[cell.terrain] = (tally[cell.terrain] ?? 0) + 1;
  assert.deepEqual(tally, { hills: 7, mountain: 4, grassland: 4, lake: 1 });
  assert.deepEqual([...ENCLOSED_HEXES['South Suval'][0]], [...STILLWATER_HEX, 'lake'], 'the Stillwater is the region’s own lake cell');
  // The atlas's own climates, and they are the lore's story: dry Mediterranean hills, a cold-summer
  // ridge, and a cooler lake country.
  const climates = {};
  for (const code of Object.values(SOUTH_SUVAL_CLIMATE)) climates[code] = (climates[code] ?? 0) + 1;
  assert.deepEqual(climates, { Csa: 10, Csc: 3, Cfb: 3 });
  assert.equal(SOUTH_SUVAL_CLIMATE['6,120'], 'Cfb', 'the lake itself is the cool, misty hex');
  // The World Builder map is the authority, when it is on this machine to ask.
  if (existsSync(WWMAP)) {
    const map = JSON.parse(readFileSync(WWMAP, 'utf8'));
    for (const [key, code] of Object.entries(SOUTH_SUVAL_CLIMATE)) assert.equal(map.hexes[key]?.climate, code, `${key} is ${map.hexes[key]?.climate} on the map`);
    assert.equal(map.hexes['6,120'].terrain, 'lake');
    assert.equal(map.hexes['6,120'].region, undefined, 'the map leaves the lake unclaimed; the game gives it to the region that rings it');
  }
  // "Fed by aquifer springs rather than seasonal rainfall": no river touches this country.
  const own = new Set(cells.map(cell => `${cell.q},${cell.r}`));
  assert.equal(RIVER_EDGES.filter(edge => own.has(edge.a.join(',')) || own.has(edge.b.join(','))).length, 0);
  assert.equal(regionLevel('South Suval'), 3);
});

test('the Stillwater is water at its own level: swum, never waded, and a dry shore all round', () => {
  const centre = hexCentre(...STILLWATER_HEX);
  assert.ok(stillwaterDistance(centre.x, centre.z) < -40, 'the lake hex centre is well under water');
  assert.equal(waterAt(centre.x, centre.z, world), STILLWATER_SURFACE, 'the world knows the lake’s level, not the sea’s');
  assert.equal(canStand(centre.x, centre.z, world, B), false, 'nobody stands in the Stillwater');
  assert.equal(canSwim(centre.x, centre.z, world, B), true, 'and anybody can swim in it');
  assert.ok(world.heightAt(centre.x, centre.z) < STILLWATER_SURFACE - 6, 'a spring-fed lake that does not run dry is deep');
  // Its shore: every point of it is water a pace in and ground at or above the water a pace out.
  for (const p of STILLWATER_SHORE) {
    assert.ok(world.heightAt(p.x, p.z) < STILLWATER_SURFACE + 1.4, 'the shore comes down to the water');
    const dx = p.x - STILLWATER.centre.x, dz = p.z - STILLWATER.centre.z, n = Math.hypot(dx, dz);
    assert.ok(world.heightAt(p.x - dx / n * 1.5, p.z - dz / n * 1.5) < STILLWATER_SURFACE, 'wet a pace in');
    assert.ok(world.heightAt(p.x + dx / n * 2, p.z + dz / n * 2) >= STILLWATER_SURFACE, 'dry a pace out: it never spills');
    // Its own hex, and the city's, and no other.
    const hex = hexAt(p.x, p.z), key = `${hex.q},${hex.r}`;
    assert.ok(key === STILLWATER_HEX.join(',') || key === IMLAMDRIS_HEX.join(','), `the shore wanders into ${key}`);
  }
  // Charted, and swimmable in practice: the swimmer floats on whatever water he is in.
  assert.ok(SOUTH_SUVAL_CHART_WATERS.some(water => water.id === 'stillwater-water'));
  const main = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
  assert.match(main, /const surface=waterAt\(player\.group\.position\.x,player\.group\.position\.z,world\)/,
    'a swimmer in the Stillwater is held at its surface, not walked along its bed');
  assert.ok(world.southSuvalMetrics.waterColliders > 200);
});

test('Imlamdris stands in the north-east hex, on the water, in terraces that face the lake', () => {
  const city = hexCentre(...IMLAMDRIS_HEX), lake = hexCentre(...STILLWATER_HEX);
  const bearing = (Math.atan2(city.x - lake.x, -(city.z - lake.z)) * 180 / Math.PI + 360) % 360;
  assert.ok(Math.abs(bearing - 30) < 1, `the city's hex is at bearing ${bearing.toFixed(0)} from the lake: north-east`);
  assert.equal(REGION_CELLS['South Suval'].find(cell => cell.q === IMLAMDRIS_HEX[0] && cell.r === IMLAMDRIS_HEX[1]).terrain, 'grassland');
  // Every building of it is inside its hex, and every one faces the water.
  for (const house of [...IMLAMDRIS_HOUSES, STILLWATER_TEMPLE]) {
    const hex = hexAt(house.x, house.z);
    assert.deepEqual([hex.q, hex.r], [...IMLAMDRIS_HEX], `${house.id} is outside the city's hex`);
    assert.ok(hexInset(house.a, house.b) > Math.max(house.width, house.depth) / 2, `${house.id} crosses the hex's edge`);
  }
  const front = { x: Math.sin(FACING_LAKE), z: Math.cos(FACING_LAKE) }, toLake = { x: lake.x - city.x, z: lake.z - city.z };
  assert.ok((front.x * toLake.x + front.z * toLake.z) / Math.hypot(toLake.x, toLake.z) > .99, 'every front faces the lake');
  // The terraces step up the slope; each is level and walkable, and a stair climbs all of them.
  for (let i = 1; i < TERRACES.length; i++) assert.ok(TERRACES[i].level > TERRACES[i - 1].level + 2);
  // A point of each terrace clear of its buildings, its stairs and the gnomon: the walk in front of
  // the temple, the terrace beside it, the two streets, and the open side of the Star Terrace.
  const open = { 'lake-walk': [-10, 3], 'temple-terrace': [-13.5, 16], 'wide-street': [-6, 38], 'upper-city': [-6, 57], 'star-terrace': [10, 82] };
  for (const terrace of TERRACES) {
    const p = cityPoint(...open[terrace.id]);
    assert.ok(Math.abs(world.heightAt(p.x, p.z) - terrace.level) < .05, `${terrace.name} is not level`);
    assert.ok(canStand(p.x, p.z, world, B), `${terrace.name} cannot be stood on`);
  }
  for (const stair of STAIRS) for (let b = 3; b <= stair.walls.at(-1) + stair.run; b += .5) {
    const p = cityPoint(stair.a, b);
    assert.ok(canStand(p.x, p.z, world, B), `${stair.id} is blocked ${b} m up the city`);
    const q = cityPoint(stair.a, b + .5);
    assert.ok(Math.abs(world.heightAt(q.x, q.z) - world.heightAt(p.x, p.z)) < .4, `${stair.id} has a step of a metre or more`);
  }
  // Off the stairs a retaining wall is a wall: five metres of it, and nobody walks up it.
  for (const wall of [32, 52, 74]) {
    const p = cityPoint(-6, wall);
    assert.equal(canStand(p.x, p.z, world, B), false, `the wall at ${wall} can be walked through`);
    assert.ok(cityLevel(-6, wall + .5) - cityLevel(-6, wall - .5) > 4.5);
  }
  // "Its streets are wider than Solis's": the Wide Street is nine metres from the wall to the houses.
  const street = TERRACES.find(terrace => terrace.id === 'wide-street');
  const rowFront = Math.min(...IMLAMDRIS_HOUSES.filter(house => house.terrace === 'wide-street').map(house => house.b - house.depth / 2));
  assert.ok(rowFront - street.from >= 9, `the Wide Street is ${(rowFront - street.from).toFixed(1)} m wide`);
});

test('the city is drawn on ground of its own, and the world’s coarse ground never shows through it', () => {
  // The world's grid is seven metres apart; a triangle of it across a five-metre terrace wall came
  // up through the temple's floor. The city's own lattice puts every step in the ground inside a
  // wall, so what is drawn is what is walked on, and the coarse grid is sunk below it.
  const patch = scene.getObjectByName('Imlamdris made ground'), coarse = scene.getObjectByName('The ground of the four regions');
  assert.ok(patch && coarse, 'the city draws its own ground');
  const ray = new THREE.Raycaster(), down = new THREE.Vector3(0, -1, 0);
  const drawn = (object, p) => { ray.set(new THREE.Vector3(p.x, 200, p.z), down); return ray.intersectObject(object, true)[0]?.point.y; };
  const walls = TERRACES.slice(1).map(terrace => terrace.from);
  let checked = 0;
  for (let a = -48; a <= 48; a += 2.3) for (let b = -7; b <= 87; b += 2.1) {
    const p = cityPoint(a, b);
    // A whole lattice cell on the made ground, and a cell's width (2.8 m) back from the water, where
    // the bank drops under the Lake Walk's own stone face.
    if (hexInset(a, b) < CITY_FEATHER.full + 3 || stillwaterDistance(p.x, p.z) < 3) continue;
    if (walls.some(wall => Math.abs(b - wall) < .5) || STAIRS.some(stair => Math.abs(Math.abs(a - stair.a) - stair.half - .15) < .45)) continue;
    const ground = world.heightAt(p.x, p.z), top = drawn(patch, p), under = drawn(coarse, p);
    assert.ok(Math.abs(top - ground) < .06, `the city's ground is drawn ${(top - ground).toFixed(2)} m off the ground walked on at ${a}, ${b}`);
    assert.ok(under < top - 1, `the coarse ground comes up to ${(under - top).toFixed(2)} m of the city's at ${a}, ${b}`);
    checked++;
  }
  assert.ok(checked > 800, `${checked} points of the city checked`);
  // The road's bed too, from the gate to the border, which the patch reaches with room to spare.
  for (const p of PASS_ROAD_LINE.filter((_, i) => i % 3 === 0)) {
    const top = drawn(patch, p);
    assert.ok(Math.abs(top - p.grade) < .1, `the road is drawn ${(top - p.grade).toFixed(2)} m off its bed`);
    assert.ok(drawn(coarse, p) < top - 1, 'and the coarse ground stays under it');
    const { a, b } = cityLocal(p.x, p.z);
    assert.ok(a > IMLAMDRIS_PATCH.minA + 20 && a < IMLAMDRIS_PATCH.maxA - 20 && b < IMLAMDRIS_PATCH.maxB - 20);
  }
});

test('no harbour: the city comes down to the water in stone, and nothing is moored at it', () => {
  // "Imlamdris is not a maritime city. It has no harbor."
  const kinds = new Set(world.colliders.filter(c => southSuvalClear(c.x, c.z)).map(c => c.kind));
  for (const kind of ['quay', 'mooring', 'boat', 'jetty', 'pier', 'bollard']) assert.ok(![...kinds].some(k => k.includes(kind)), `there is a ${kind} at Imlamdris`);
  // The Lake Walk comes down to the water's edge, a metre above it.
  const walk = TERRACES[0];
  assert.ok(walk.level > STILLWATER_SURFACE + .8 && walk.level < STILLWATER_SURFACE + 1.5);
  const edge = cityPoint(0, 0);
  assert.ok(Math.abs(stillwaterDistance(edge.x, edge.z)) < 1.2, 'the city’s front is the lake’s shore');
});

test('the razed Stillwater Temple has real breaches and keeps its lake-facing foundation', () => {
  const T = STILLWATER_TEMPLE, front = T.b - T.depth / 2 + .6;
  // Between the colonnade's middle columns, and in the hall, a traveler walks in off the steps.
  assert.ok(canStand(cityPoint(0, front).x, cityPoint(0, front).z, world, B), 'the colonnade is shut');
  assert.ok(canStand(T.x, T.z, world, B), 'the hall cannot be stood in');
  // Surviving back-wall stubs remain solid; the old doorway and the blast breach are open.
  const back = T.b + T.depth / 2 - .45;
  for (const a of [-8, 4, 8]) assert.equal(canStand(cityPoint(a, back).x, cityPoint(a, back).z, world, B), false, `the surviving back wall is open at ${a}`);
  assert.ok(canStand(cityPoint(-4, back).x, cityPoint(-4, back).z, world, B), 'the ruined wall has a usable breach');
  assert.equal(world.southSuvalMetrics.ruinedHomes, 16);
  assert.equal(world.southSuvalMetrics.ruinedTemple, true);
  for (const side of [-1, 1]) assert.equal(canStand(cityPoint(side * (T.width / 2 - .45), T.b).x, cityPoint(side * (T.width / 2 - .45), T.b).z, world, B), false);
  assert.ok(canStand(cityPoint(0, back + .6).x, cityPoint(0, back + .6).z, world, B), '"visitors arriving overland enter from the back": the door is shut');
  // The temple's broad steps come up from the Lake Walk to its colonnade.
  const steps = STAIRS.find(stair => stair.id === 'temple-steps');
  assert.equal(steps.a, T.a);
  assert.ok(steps.half * 2 > 12, 'broad steps, not a door stair');
});

test('the road leaves by the Landward Gate at the back and goes over the hill pass to the gate in the frontier', () => {
  const first = PASS_ROAD_LINE[0], last = PASS_ROAD_LINE.at(-1);
  assert.ok(Math.hypot(first.x - LANDWARD_GATE.x, first.z - LANDWARD_GATE.z) < 3, 'the road starts at the gate');
  assert.equal(LANDWARD_GATE.b, TERRACES.at(-1).to, 'and the gate is at the back of the highest terrace');
  assert.equal(regionAt(last.x, last.z).name, 'South Suval');
  // East Suval's land border is a ridge of rock with two barred gates in it (src/content/regions/minora-frontier/frontier-ridges.js);
  // the city's road is the road to the southern one, and ends on this side of it.
  assert.ok(ELOD_SOUTH_GATE.locked, 'the southern hill gate is barred');
  assert.ok(Math.hypot(last.x - ELOD_SOUTH_GATE.x, last.z - ELOD_SOUTH_GATE.z) < 9, 'and the road ends at it');
  const beyond = hillPassPoint(ELOD_SOUTH_GATE, 0, 6);
  assert.equal(regionAt(beyond.x, beyond.z).name, 'East Suval', 'with East Suval on the far side');
  let steepest = 0;
  for (let i = 0; i < PASS_ROAD_LINE.length; i++) {
    const p = PASS_ROAD_LINE[i];
    assert.ok(canStand(p.x, p.z, world, B), `the road is blocked at ${p.x.toFixed(0)}, ${p.z.toFixed(0)}`);
    assert.ok(Math.abs(world.heightAt(p.x, p.z) - p.grade) < .05, 'the road is cut and built to its own grade');
    if (i) { const q = PASS_ROAD_LINE[i - 1]; steepest = Math.max(steepest, Math.abs(p.grade - q.grade) / Math.hypot(p.x - q.x, p.z - q.z)); }
  }
  assert.ok(steepest < 1 / 6, `the pass is 1 in ${(1 / steepest).toFixed(1)} at its steepest`);
  // It crosses the saddle and goes round the ridge, not over it: the crest stands well above the
  // highest the road climbs, which is where it runs under the ridge's north flank.
  const highest = Math.max(...PASS_ROAD_LINE.map(p => p.grade)), ridge = hexCentre(7, 118);
  let crest = -Infinity;
  for (let x = ridge.x - 50; x <= ridge.x + 50; x += 2) for (let z = ridge.z - 50; z <= ridge.z + 50; z += 2)
    if (hexOwnerAt(x, z) === 'South Suval') crest = Math.max(crest, world.heightAt(x, z));
  assert.ok(crest > highest + 6, `the road goes round the ridge: its crest is ${(crest - highest).toFixed(1)} m above the road`);
});

test('the southern coast is cliffs, with two places a boat could land', () => {
  // "The ridge system drops more steeply to the southern coast, creating a more dramatic coastline
  // with fewer accessible beaches and more cliff faces."
  let cliffs = 0, beaches = 0;
  for (let x = -300; x <= 180; x += 3) for (let z = 920; z <= 1420; z += 3) {
    const d = landDistance(x, z);
    if (d < 3.4 || d > 4.2 || hexOwnerAt(x, z) !== 'South Suval') continue;
    if (COVES.some(cove => Math.hypot(cove.x - x, cove.z - z) < cove.r)) continue;
    if (world.heightAt(x, z) > 8) cliffs++; else beaches++;
  }
  assert.ok(cliffs > beaches * 4, `four metres from the water the coast is ${cliffs} cliff and ${beaches} beach`);
  for (const cove of COVES) {
    let near = null; for (let r = 0; r < cove.r && !near; r += 1) for (let t = 0; t < 24 && !near; t++) {
      const x = cove.x + Math.cos(t / 24 * Math.PI * 2) * r, z = cove.z + Math.sin(t / 24 * Math.PI * 2) * r, d = landDistance(x, z);
      if (d > 3.4 && d < 4.2) near = { x, z };
    }
    assert.ok(near, `${cove.id} has no shore`);
    assert.ok(world.heightAt(near.x, near.z) < 5, `${cove.id} is not a beach`);
  }
});

test('three climates on the ground: stone on the ridge, olive and fig on the warm ground, green by the lake', () => {
  const sky = regionSky(region);
  assert.notDeepEqual({ ...sky }, { ...DEFAULT_SKY }, 'a sky of its own');
  assert.ok(sky.density < DEFAULT_SKY.density, 'clearer than the default: this is dry country');
  assert.equal(REGION_BIOMES['South Suval'].ownScatter, true);
  const m = world.southSuvalMetrics;
  for (const key of ['rocks', 'scrub', 'tufts', 'trees', 'reeds', 'vines']) assert.ok(m[key] > 20, `no ${key}`);
  // Trees are olive and fig in the warm low ground: none on the ridge, none in the city, the lake or the road.
  const trees = world.colliders.filter(c => c.kind === 'region-tree' && hexOwnerAt(c.x, c.z) === 'South Suval');
  assert.ok(trees.length > 50);
  for (const tree of trees) {
    assert.ok(world.heightAt(tree.x, tree.z) < 30.5, 'a tree on the ridge');
    assert.equal(southSuvalClear(tree.x, tree.z), false, 'a tree in the city, the lake or the road');
    const hex = hexAt(tree.x, tree.z);
    assert.notEqual(SOUTH_SUVAL_CLIMATE[`${hex.q},${hex.r}`], 'Csc', 'a tree on the cold-summer ridge');
  }
});

test('the wildlife stands where its kind would: waders on the shore, duck on the water, dolphins at sea', () => {
  const species = new Set(SOUTH_SUVAL_WILDLIFE_ZONES.map(zone => zone.species));
  for (const kind of ['wading-bird', 'duck', 'gull', 'dolphin', 'plateau-hawk']) assert.ok(species.has(kind), `no ${kind}`);
  for (const zone of SOUTH_SUVAL_WILDLIFE_ZONES) {
    assert.equal(zone.region, 'South Suval');
    assert.ok(zone.note.length > 60, `${zone.id} does not say why it is here`);
    for (const [x, z] of zone.sites) {
      assert.ok(x >= zone.minX && x <= zone.maxX && z >= zone.minZ && z <= zone.maxZ, `${zone.id}'s home is outside its range`);
      if (zone.sea) { assert.ok(landDistance(x, z) < -20, `${zone.id} is not at sea`); continue; }
      if (zone.air) continue;
      if (zone.float) { assert.ok(stillwaterDistance(x, z) < -6, `${zone.id} is not out on the water`); continue; }
      assert.ok(canStand(x, z, world, .4), `${zone.id} stands on nothing at ${x}, ${z}`);
      assert.equal(hexOwnerAt(x, z), 'South Suval');
      // A wader belongs at the water's edge, which the scatter keeps clear; nothing belongs in the city or on the road.
      const { a, b } = cityLocal(x, z);
      assert.ok(!(b > TERRACES[0].from && b < TERRACES.at(-1).to && hexInset(a, b) > CITY_FEATHER.none), `${zone.id} is in Imlamdris`);
      assert.ok(passRoadAt(x, z).distance > 4, `${zone.id} is on the road`);
      if (zone.species !== 'wading-bird') assert.equal(southSuvalClear(x, z), false, `${zone.id} is in the city, the lake or the road`);
    }
  }
  for (const [x, z] of SOUTH_SUVAL_WILDLIFE_ZONES.find(zone => zone.id === 'stillwater-herons').sites)
    assert.ok(stillwaterDistance(x, z) < 4, 'a heron well away from the water');
});

test('nobody lives here yet: no people, and the chart says what is built', () => {
  // The user, 25 September 2026: "Don't add any characters yet."
  assert.deepEqual(region.npcIds, []);
  for (const [id, stand] of Object.entries(world.npcPositions))
    assert.notEqual(hexOwnerAt(stand.x, stand.z), 'South Suval', `${id} stands in South Suval`);
  // Its places are on the chart, in its own country.
  for (const id of region.landmarks) {
    const place = SOUTH_SUVAL_LANDMARKS.find(entry => entry.id === id);
    assert.ok(place, `${id} is not a place`);
    assert.equal(regionAt(place.x, place.z).name, 'South Suval', `${id} is not in South Suval`);
    assert.ok(place.description.length > 60);
  }
  for (const area of SUBREGIONS.filter(entry => entry.region === 'South Suval')) assert.equal(regionAt(area.x, area.z).name, 'South Suval', area.id);
  const status = regionBuildStatus('South Suval');
  assert.equal(status.playable, true);
  assert.match(status.detail, /Imlamdris/); assert.match(status.detail, /Stillwater/);
  assert.match(status.work, /Everybody/);
});

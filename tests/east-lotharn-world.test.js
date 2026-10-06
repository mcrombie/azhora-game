import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { sourceModule } from './module-loader.js';
import * as THREE from '../vendor/three.module.js';
import { canStand } from '../src/gameplay/movement/game-state.js';
import { BODY } from '../src/gameplay/combat/bodies.js';
import { PLAYABLE_REGIONS, REGION_BIOMES } from '../src/world/terrain/region-layout.js';
import { RIVER_EDGES } from '../src/world/terrain/region-rivers.js';
import { REGION_CELLS, hexOwnerAt, regionAt, regions, landDistance } from '../src/world/terrain/region-world.js';
import { DEFAULT_SKY, regionSky } from '../src/world/environment/region-sky.js';
import { regionBuildStatus } from '../src/dev/tools/build-status.js';
import { SUBREGIONS } from '../src/ui/map/map-fog.js';
import { REGION_LANGUAGE } from '../src/gameplay/skills/languages.js';
import {
  LOTHARN, KEMRATH, COL, STONEGATE, PASS_ROAD_LINE, PASS_INN, IRON_WORKINGS, BALDS, OLVETH_PASTURE,
  EAST_LOTHARN_LANDMARKS, lotharnGround, lotharnOpen, kemrathFloorAt, nearestOn, pointOn, colLevel, peakLiftAt,
} from '../src/content/regions/east-lotharn/east-lotharn-world.js';
import { LOTHARN_WATERS, LOTHARN_BORDER_WATER, KEMRATH_WATER, STONEGATE_WATER, OLVETH_BECK, courseDistance } from '../src/content/regions/western-regions/west-regions.js';
import { WEST_PROFILES, westWaterSurface } from '../src/content/regions/western-regions/west-ground.js';
import { EAST_LOTHARN_WILDLIFE_ZONES } from '../src/content/regions/east-lotharn/east-lotharn-wildlife.js';
import { varnJambRise, VARN_LANDMARKS } from '../src/content/regions/varn/varn-world.js';

/**
 * The East Lotharn: the old range north of Amod, built on the user's word of 26 September 2026 -
 * "start building the East Lotharn Mountains based on the lore" - as ground, water, forest,
 * wildlife and three made places, with nobody in them.
 *
 * The atlas's arithmetic first, because it wins: thirty-eight hexes, twenty-three of hills and
 * fifteen of mountain, every one Cfa, and one small river along the South Mithala border to the
 * sea. Then the lore's sentences, held to the ground: rounded, forested, crossed by passes with
 * inns at their highest sections, and valleys, "some wide and agricultural, some narrow gorges
 * through which rivers run white, some broad and flat-bottomed".
 */
const scene = new THREE.Scene();
const { createWorld } = await sourceModule('../src/world.js');
const world = createWorld(scene);
const B = BODY.person;
const region = regions.find(entry => entry.name === LOTHARN);
const WWMAP = new URL('../../world-builder/map/resources/examples/azhora.wwmap', import.meta.url);
const own = (x, z) => hexOwnerAt(x, z) === LOTHARN;

test('the atlas: thirty-eight hexes of hill and mountain, all of them Cfa, and one river along the northern border', () => {
  assert.ok(PLAYABLE_REGIONS.includes(LOTHARN));
  const cells = REGION_CELLS[LOTHARN];
  assert.equal(cells.length, 38);
  const terrain = cells.reduce((count, cell) => ({ ...count, [cell.terrain]: (count[cell.terrain] ?? 0) + 1 }), {});
  assert.deepEqual(terrain, { hills: 23, mountain: 15 });
  const map = JSON.parse(readFileSync(WWMAP, 'utf8'));
  for (const cell of cells) assert.equal(map.hexes[`${cell.q},${cell.r}`].climate, 'Cfa', `${cell.q},${cell.r} is not Cfa`);
  // Its only water on the atlas is the small river on the South Mithala border, and every edge of it is baked.
  const edges = RIVER_EDGES.filter(edge => edge.regions.includes(LOTHARN));
  assert.equal(edges.length, 14);
  assert.ok(edges.every(edge => edge.size === 'small' && edge.regions.includes('South Mithala')));
  assert.equal(REGION_BIOMES[LOTHARN].ownScatter, true);
});

test('the peaks stand far over everything else, and the valleys and hills between them have no step in them', () => {
  // On the user's word of 27 September 2026 the massifs were raised to about four hundred metres
  // with cliffs (tests/east-lotharn-peaks.test.js); the valleys, the hills between them and the
  // foothills are the ground they were, and nowhere off the peaks does the height jump between two
  // points a quarter-metre apart (the seams of the world's hex blend are taken out of this country).
  let highest = -Infinity, steps = 0;
  for (const cell of REGION_CELLS[LOTHARN]) for (let dx = -40; dx <= 40; dx += 8) for (let dz = -40; dz <= 40; dz += 8) {
    const x = cell.x + dx, z = cell.z + dz;
    if (!own(x, z) || westWaterSurface(x, z) !== null) continue;
    const h = world.heightAt(x, z);
    highest = Math.max(highest, h);
    if (peakLiftAt(x, z) > 0 || peakLiftAt(x + .25, z) > 0 || peakLiftAt(x, z + .25) > 0) continue;
    // The two jambs Varn is built between (src/content/regions/varn/varn-world.js) are cliffs on purpose, stood on this country's edge
    // on 2 October 2026: their faces are not the hex blend's seams, which is what this law is about.
    if (varnJambRise(x, z) > 0) continue;
    if (Math.abs(world.heightAt(x + .25, z) - h) > .6 || Math.abs(world.heightAt(x, z + .25) - h) > .6) steps++;
  }
  assert.ok(highest > 400 && highest < 440, `the range tops out at ${highest.toFixed(0)} m`);
  assert.ok(steps < 4, `${steps} steps in the ground off the peaks`);
});

test('Kemrath is broad and flat-floored, and its water runs west out of the range', () => {
  // Flat across: the floor at one station is level to a few centimetres over twenty metres either side.
  for (const along of [80, 200, 320]) {
    const p = pointOn(KEMRATH.line, along), levels = [];
    for (let off = -16; off <= 16; off += 4) {
      const x = p.x + p.nx * off, z = p.z + p.nz * off;
      if (westWaterSurface(x, z) === null && courseDistance(KEMRATH_WATER, x, z) > 6) levels.push(world.heightAt(x, z));
    }
    assert.ok(Math.max(...levels) - Math.min(...levels) < .5, `Kemrath is not flat across at ${along} m`);
  }
  // Falling west, and its water with it, out past the region's own edge.
  const profile = WEST_PROFILES.get(KEMRATH_WATER.id);
  assert.ok(profile[0].x > profile.at(-1).x + 400, 'the Kemrath water runs west');
  assert.ok(profile[0].surface > profile.at(-1).surface + 10);
  assert.ok(!own(profile.at(-1).x, profile.at(-1).z), 'and leaves the range');
  // Fields down both sides of the water, and the forest stands back from them.
  const floor = kemrathFloorAt(pointOn(KEMRATH.line, 250).x, pointOn(KEMRATH.line, 250).z);
  assert.ok(floor && lotharnOpen(pointOn(KEMRATH.line, 250).x, pointOn(KEMRATH.line, 250).z));
});

test('the col is the divide and the pass road\'s highest section, and the pass inn stands on it', () => {
  const top = Math.max(...PASS_ROAD_LINE.map(p => p.grade));
  const colTop = Math.max(...COL.levels);
  assert.ok(Math.abs(top - colTop - .12) < .2, `the road tops out at ${top.toFixed(1)}, the col at ${colTop.toFixed(1)}`);
  // Water falls away from it both ways: Kemrath's west, Stonegate's north.
  assert.ok(WEST_PROFILES.get(KEMRATH_WATER.id)[0].surface < colTop);
  assert.ok(WEST_PROFILES.get(STONEGATE_WATER.id)[0].surface < colTop);
  // The inn is on the col, beside the road, on its own level yard.
  assert.ok(nearestOn(COL.line, PASS_INN.x, PASS_INN.z).distance < 16);
  const road = Math.min(...PASS_ROAD_LINE.map(p => Math.hypot(p.x - PASS_INN.x, p.z - PASS_INN.z)));
  assert.ok(road > 8 && road < 20, `the inn is ${road.toFixed(0)} m from the road`);
  assert.ok(Math.abs(world.heightAt(PASS_INN.x, PASS_INN.z) - PASS_INN.level) < .05, 'the inn stands on its yard');
  // Walls are walls, and the yard is walkable.
  const c = Math.cos(PASS_INN.facing), s = Math.sin(PASS_INN.facing);
  const at = (lx, lz) => ({ x: PASS_INN.x + lx * c + lz * s, z: PASS_INN.z - lx * s + lz * c });
  assert.equal(canStand(PASS_INN.x, PASS_INN.z, world, B), false, 'nobody stands inside the inn');
  const yard = at(0, PASS_INN.depth / 2 + 4);
  assert.ok(canStand(yard.x, yard.z, world, B), 'the yard in front of the door');
});

test('Stonegate: white water down a gorge, the road beside it, stone in its walls', () => {
  const profile = WEST_PROFILES.get(STONEGATE_WATER.id);
  const fall = profile[0].surface - profile.at(-1).surface, length = profile.length * 5;
  assert.ok(fall > 30, `the Stonegate water falls ${fall.toFixed(0)} m`);
  assert.ok(profile[0].z > profile.at(-1).z + 200, 'north, down the north face');
  // Walls: at mid-gorge the ground thirty metres off the line stands well above the floor.
  const mid = pointOn(STONEGATE.line, STONEGATE.line.length * .45);
  const wall = Math.max(...[-1, 1].map(side => world.heightAt(mid.x + mid.nx * 34 * side, mid.z + mid.nz * 34 * side)));
  assert.ok(wall - world.heightAt(mid.x, mid.z) > 6, 'a gorge has walls');
  assert.ok(world.colliders.filter(c => c.kind === 'lotharn-outcrop').length >= 5, 'and stone shows in them');
  void length;
});

test('the pass road: from Amod\'s notch over the col and down Stonegate to the border water, walkable and graded', () => {
  const first = PASS_ROAD_LINE[0], last = PASS_ROAD_LINE.at(-1);
  assert.equal(regionAt(first.x, first.z).name, 'Amod', 'it comes up out of Amod');
  assert.ok(courseDistance(LOTHARN_BORDER_WATER, last.x, last.z) < 8, 'and ends on the border water\'s bank');
  let steepest = 0;
  for (let i = 0; i < PASS_ROAD_LINE.length; i++) {
    const p = PASS_ROAD_LINE[i];
    assert.ok(canStand(p.x, p.z, world, B), `the road is blocked at ${p.x.toFixed(0)}, ${p.z.toFixed(0)}`);
    assert.ok(Math.abs(world.heightAt(p.x, p.z) - p.grade) < .08, `the road is off its bed at ${p.x.toFixed(0)}, ${p.z.toFixed(0)}`);
    assert.ok(courseDistance(STONEGATE_WATER, p.x, p.z) > 8, 'and never in the white water');
    if (i) { const q = PASS_ROAD_LINE[i - 1]; steepest = Math.max(steepest, Math.abs(p.grade - q.grade) / Math.hypot(p.x - q.x, p.z - q.z)); }
  }
  assert.ok(steepest < 1 / 6.5, `the pass is 1 in ${(1 / steepest).toFixed(1)} at its steepest`);
});

test('the water: four courses, every one falling, the border water to the sea', () => {
  for (const course of LOTHARN_WATERS) {
    const profile = WEST_PROFILES.get(course.id);
    for (let i = 1; i < profile.length; i++) assert.ok(profile[i].surface <= profile[i - 1].surface + 1e-9, `${course.id} climbs`);
  }
  const mouth = WEST_PROFILES.get(LOTHARN_BORDER_WATER.id).at(-1);
  assert.ok(landDistance(mouth.x, mouth.z) < 8 && mouth.surface < 3, 'the border water reaches the sea');
  for (const beck of [STONEGATE_WATER, OLVETH_BECK]) {
    const end = WEST_PROFILES.get(beck.id).at(-1);
    assert.ok(courseDistance(LOTHARN_BORDER_WATER, end.x, end.z) < 30, `${beck.id} reaches the border water`);
  }
});

test('the forest: old broadleaf from the floors nearly to the tops, and none on the ground kept open', () => {
  const trees = world.colliders.filter(c => c.kind === 'lotharn-tree');
  assert.ok(trees.length > 4000, `${trees.length} trees`);
  for (const tree of trees) {
    assert.ok(!lotharnOpen(tree.x, tree.z), `a tree stands on open ground at ${tree.x.toFixed(0)}, ${tree.z.toFixed(0)}`);
    assert.ok(westWaterSurface(tree.x, tree.z) === null, 'a tree stands in the water');
  }
  for (const bald of BALDS) assert.ok(world.heightAt(bald.x, bald.z) > 70, `${bald.id} is a top`);
  assert.ok(!trees.some(tree => Math.hypot(tree.x - OLVETH_PASTURE.x, tree.z - OLVETH_PASTURE.z) < OLVETH_PASTURE.radius));
});

test('the iron workings: a portal in the hill, a bench before it, and the offering at the entrance', () => {
  assert.ok(Math.abs(world.heightAt(IRON_WORKINGS.x, IRON_WORKINGS.z) - IRON_WORKINGS.level) < .05, 'the bench is level');
  assert.ok(canStand(IRON_WORKINGS.x, IRON_WORKINGS.z + 3, world, B), 'and walkable');
  // The hill rises behind the portal: the adit goes into the massif, not out of the valley.
  assert.ok(world.heightAt(IRON_WORKINGS.x, IRON_WORKINGS.z - 20) > IRON_WORKINGS.level + 4);
  assert.ok(world.colliders.some(c => c.kind === 'iron-workings'));
});

test('the wildlife stands where its kind would, and none of it is a fight', () => {
  const species = new Set(EAST_LOTHARN_WILDLIFE_ZONES.map(zone => zone.species));
  for (const kind of ['hill-sheep', 'red-deer', 'upland-hare', 'wading-bird', 'boar', 'plateau-hawk']) assert.ok(species.has(kind), kind);
  for (const zone of EAST_LOTHARN_WILDLIFE_ZONES) {
    assert.equal(zone.region, LOTHARN);
    assert.ok(zone.note.length > 60);
    if (zone.air) continue;
    for (const [x, z] of zone.sites) {
      assert.ok(own(x, z), `${zone.id} site out of the range`);
      assert.ok(westWaterSurface(x, z) === null, `${zone.id} site in the water`);
      assert.ok(canStand(x, z, world, zone.radius), `${zone.id} site cannot be stood on`);
    }
  }
  for (const zone of EAST_LOTHARN_WILDLIFE_ZONES.filter(zone => zone.species === 'wading-bird')) {
    assert.ok(zone.sites.every(([x, z]) => courseDistance(KEMRATH_WATER, x, z) < 6), 'herons by the water');
  }
});

test('its neighbours\' own ground does not move', () => {
  // The range shapes its own ground only: at Amod's and Vastos's places the shaping is nothing.
  const places = [[-814, -504], [-849, -610], [-872, -592], [-676, -468], [-1460, -627], [-1300, -548]];
  for (const [x, z] of places) assert.ok(Math.abs(lotharnGround(x, z, 50) - 50) < .02, `the range reaches ${x}, ${z}`);
});

test('nobody lives here yet: no people, and the chart says what is built', () => {
  assert.deepEqual(region.npcIds, []);
  for (const [id, stand] of Object.entries(world.npcPositions)) assert.ok(!own(stand.x, stand.z), `${id} stands in the East Lotharn`);
  for (const id of region.landmarks) {
    // The range's own places, and the one of Varn's that stands on the range's ground: the Slabs, the climbers' way past
    // the city (src/content/regions/varn/varn-world.js), which the chart lists for the country they are in.
    const place = EAST_LOTHARN_LANDMARKS.find(entry => entry.id === id) ?? VARN_LANDMARKS.find(entry => entry.id === id);
    assert.ok(place, `${id} is not a place`);
    assert.ok(own(place.x, place.z) || id === 'border-water', `${id} is not in the East Lotharn`);
    assert.ok(place.description.length > 60);
  }
  for (const area of SUBREGIONS.filter(entry => entry.region === LOTHARN)) assert.ok(own(area.x, area.z) || area.id === 'border-water', area.id);
  const sky = regionSky(region);
  assert.notEqual(sky.density, DEFAULT_SKY.density, 'a sky of its own');
  assert.equal(REGION_LANGUAGE[LOTHARN].dialect, 'lotharn');
  const status = regionBuildStatus(LOTHARN);
  assert.equal(status.playable, true);
  assert.match(status.detail, /Kemrath/); assert.match(status.detail, /Stonegate/);
  assert.match(status.work, /Everybody/);
  assert.ok(colLevel(0) > 0);
});

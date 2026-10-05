import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';
import { CANERD, CANERD_PATHS, CANERD_BUILDINGS, CANERD_WALLS, CANERD_LANDMARKS,
  canerdGround, canerdClear, canerdTint, canerdTerrainSink } from '../src/canerd-world.js';
import { refineCanerdGround } from '../src/canerd-ground.js';
import { CELDER_MOUND_SITE } from '../src/south-celder-world.js';

const incoming = 19.5;
const ground = (x, z) => canerdGround(x, z, incoming);
const route = CANERD_PATHS[0];

test('Canerd occupies the reserved plain and leaves distant handed terrain exactly intact', () => {
  assert.equal(CANERD.x, CELDER_MOUND_SITE.x); assert.equal(CANERD.z, CELDER_MOUND_SITE.z);
  assert.equal(CANERD.radius, CELDER_MOUND_SITE.radius);
  assert.equal(CANERD.region, 62); assert.equal(CANERD.rise, 0);
  for (const [dx, dz] of [[-111, 0], [0, -111], [0, 111], [180, 0], [500, 500], [-500, -500]]) {
    const x = CANERD.x + dx, z = CANERD.z + dz;
    assert.equal(canerdGround(x, z, 31.234), 31.234, `Unchanged ground at ${dx},${dz}`);
    assert.equal(canerdTint(x, z), null);
  }
  for(let x=-100;x<=100;x+=5)for(let z=-100;z<=100;z+=5)
    assert.ok(Math.abs(ground(CANERD.x+x,CANERD.z+z)-incoming)<3, 'No raised hill remains anywhere on the site');
  assert.ok(CANERD_LANDMARKS.some(p => p.id === 'canerd'));
});

test('Canerd has a level court that supports all castle foundations directly on the plain', () => {
  for (let r = 0; r <= 42; r += 3) for (let a = 0; a < Math.PI * 2; a += .13)
    assert.ok(Math.abs(ground(CANERD.x + Math.cos(a) * r, CANERD.z + Math.sin(a) * r) - CANERD.summitHeight) < 1e-7);
  for (const wall of CANERD_WALLS) for (const p of [wall.a, wall.b]) assert.equal(ground(p.x, p.z), CANERD.summitHeight);
  const tower = CANERD_BUILDINGS.find(p => p.id === 'canerd-high-tower');
  assert.ok(tower.height >= 80);
  assert.ok(ground(tower.x, tower.z) + tower.height - CANERD.baseHeight === 84);
});

function ascentMeasure(heightAt) {
  let length = 0, steepest = 0, greatestError = 0, drop = 0;
  for (let i = 1; i < route.points.length; i++) {
    const a = route.points[i - 1], b = route.points[i], distance = Math.hypot(b.x - a.x, b.z - a.z);
    assert.ok(distance <= 2.01, `Route spacing ${distance}`);
    length += distance;
    for (const across of [-3, 0, 3]) {
      const nx = -(b.z - a.z) / distance, nz = (b.x - a.x) / distance;
      let previous = heightAt(a.x + nx * across, a.z + nz * across);
      for (let j = 1; j <= 8; j++) {
        const t = j / 8, x = a.x + (b.x - a.x) * t + nx * across, z = a.z + (b.z - a.z) * t + nz * across;
        const y = heightAt(x, z), grade = (y - previous) / (distance / 8);
        assert.ok(Number.isFinite(y));
        steepest = Math.max(steepest, Math.abs(grade));
        if (!across) {
          greatestError = Math.max(greatestError, Math.abs(y - (a.y + (b.y - a.y) * t)));
          drop = Math.max(drop, -grade);
        }
        previous = y;
      }
    }
  }
  return { length, steepest, greatestError, drop };
}

test('The direct approach crosses the plain through the gate without steep walking steps', () => {
  const measured = ascentMeasure(ground);
  assert.ok(measured.length > 100 && measured.length < 220, `Walked length ${measured.length}`);
  assert.ok(measured.steepest < .35, `Maximum grade across six metres of usable road ${measured.steepest}`);
  assert.ok(measured.greatestError < .015, `Centreline error ${measured.greatestError}`);
  assert.ok(measured.drop < .002, `Unexpected downhill grade ${measured.drop}`);
  assert.deepEqual(route.points[0], CANERD.arrival);
  assert.deepEqual(route.points.at(-1), CANERD.courtyard);
  for (const p of route.points) assert.ok(canerdClear(p.x, p.z, 1));
});

// A seven-metre coarse grid deliberately has the same problem as the world's
// tiles: its chords cut across the approach and courtyard edges. Refinement must
// fix the visible surface, not just report the authored analytic centreline.
const cache = new Map(), coarseStep = 7;
function coarseHeight(x, z) {
  const gx = (x - CANERD.x) / coarseStep, gz = (z - CANERD.z) / coarseStep, i = Math.floor(gx), j = Math.floor(gz);
  const at = (a, b) => {
    const key = `${a},${b}`;
    if (!cache.has(key)) { const px = CANERD.x + a * coarseStep, pz = CANERD.z + b * coarseStep; cache.set(key, ground(px, pz) - canerdTerrainSink(px, pz)); }
    return cache.get(key);
  };
  const u = gx - i, v = gz - j, a = at(i, j), b = at(i + 1, j), c = at(i, j + 1), d = at(i + 1, j + 1);
  return u + v <= 1 ? a + (b - a) * u + (c - a) * v : d + (c - d) * (1 - u) + (b - d) * (1 - v);
}

test('The fine court triangles agree with collision heights and retain a walkable approach over the coarse tiles', () => {
  const terrainRoot = new THREE.Group();
  const refined = refineCanerdGround({ THREE, terrainRoot, heightAt: ground, coarseHeightAt: coarseHeight });
  assert.equal(refined.metrics.spacing, 1); assert.ok(refined.metrics.vertices < 85000);
  assert.equal(refined.patches.length, 1); assert.equal(terrainRoot.children.length, 1);
  const measured = ascentMeasure(refined.heightAt);
  assert.ok(measured.steepest < .4, `Rendered maximum grade ${measured.steepest}`);
  assert.ok(measured.greatestError < .12, `Rendered route height error ${measured.greatestError}`);
  const ray = new THREE.Raycaster(); terrainRoot.updateMatrixWorld(true);
  for (let i = 0; i < route.points.length; i += 17) {
    const p = route.points[i], x = p.x + .13, z = p.z + .17;
    ray.set(new THREE.Vector3(x, 300, z), new THREE.Vector3(0, -1, 0));
    const hit = ray.intersectObject(refined.patches[0])[0];
    assert.ok(hit, `A visible triangle under path point ${i}`);
    assert.ok(Math.abs(hit.point.y - refined.fineGroundHeight(x, z)) < 1e-5, `Displayed triangle agrees at ${i}`);
    assert.ok(refined.heightAt(x, z) > coarseHeight(x, z) + 1, `The old tile is below the road at ${i}`);
  }
  assert.equal(refined.fineGroundHeight(CANERD.x + 500, CANERD.z), null);
  assert.equal(refined.heightAt(CANERD.x + 500, CANERD.z), coarseHeight(CANERD.x + 500, CANERD.z));
  refined.patches[0].geometry.dispose(); refined.patches[0].material.dispose();
});

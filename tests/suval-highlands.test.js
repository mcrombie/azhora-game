import test from 'node:test';
import assert from 'node:assert/strict';
import { sourceModule } from './module-loader.js';
import * as THREE from '../vendor/three.module.js';
import { hexOwnerAt, REGION_CELLS } from '../src/world/terrain/region-world.js';
import { groundWithRiver } from '../src/world/terrain/world-terrain.js';
import { canStand, moveCharacter } from '../src/gameplay/movement/game-state.js';
import { BAT_CAVE, BAT_LANDING, SUVAL_PEAKS, SUVAL_HIGHLAND_TRAILS, SUVAL_PEAK_CRAGS, IMLAMDRIS_REBUILD, nearestHighlandTrail, suvalHighlandGround } from '../src/content/regions/suval-highlands/suval-highlands.js';

import { buildSuvalFlightRoute, SUVAL_FLIGHT_REGIONS } from '../src/content/quests/batman/batman-flight.js';

const { createSuvalHighlandScenery } = await sourceModule('../src/content/regions/suval-highlands/suval-highlands-scenery.js');
const root = new THREE.Group(), colliders = [];
const material = (color, options = {}) => new THREE.MeshStandardMaterial({ color, ...options });
const mesh = (geometry, mat, x, y, z, sx = 1, sy = 1, sz = 1, parent = root) => { const m = new THREE.Mesh(geometry, mat); m.position.set(x, y, z); m.scale.set(sx, sy, sz); parent.add(m); return m; };
const box = (mat, x, y, z, w, h, d, parent) => mesh(new THREE.BoxGeometry(1, 1, 1), mat, x, y, z, w, h, d, parent);
const post = (mat, x, y, z, r, h, parent) => mesh(new THREE.CylinderGeometry(1, 1, 1, 7), mat, x, y, z, r, h, r, parent);
const kit = { root, material, mesh, box, post, round: new THREE.IcosahedronGeometry(1, 0), groundHeight: groundWithRiver, colliders,
  roofGeometry: (w, d, h) => new THREE.BoxGeometry(w, h, d), wornPatch: () => {} };
const scene = createSuvalHighlandScenery(kit);
const world = { bounds: { minX: -4000, maxX: 4000, minZ: -4000, maxZ: 4000 }, colliders, heightAt: groundWithRiver };

test('the refuge and northern landing are on their intended sides of the closed East Suval frontier', () => {
  assert.equal(hexOwnerAt(BAT_CAVE.entrance.x, BAT_CAVE.entrance.z), 'South Suval');
  assert.equal(hexOwnerAt(BAT_LANDING.x, BAT_LANDING.z), 'West Suval');
  assert.equal(groundWithRiver(BAT_CAVE.perch.x, BAT_CAVE.perch.z), BAT_CAVE.floor);
  assert.equal(groundWithRiver(BAT_LANDING.x, BAT_LANDING.z), 9);
  for (const p of [BAT_CAVE.approach, BAT_CAVE.entrance, BAT_CAVE.perch, BAT_LANDING]) assert.ok(canStand(p.x, p.z, world), `safe footing ${p.x},${p.z}`);
});

test('Suval has real tall peaks with visible solid cliff bands rather than cosmetic mountain props', () => {
  assert.ok(SUVAL_PEAKS.filter(p => groundWithRiver(p.x, p.z) > 110).length >= 4);
  assert.ok(Math.max(...SUVAL_PEAKS.map(p => groundWithRiver(p.x, p.z))) > 160);
  assert.ok(SUVAL_PEAK_CRAGS.length > 120);
  for (const rock of SUVAL_PEAK_CRAGS) assert.equal(canStand(rock.x, rock.z, world), false);
});

test('every authored switchback is walkable with bounded grades and reaches its actual destination', () => {
  for (const trail of SUVAL_HIGHLAND_TRAILS) {
    const walker = { ...trail.points[0] };
    for (let i = 1; i < trail.points.length; i++) {
      const a = trail.points[i - 1], b = trail.points[i], length = Math.hypot(b.x - a.x, b.z - a.z), n = Math.ceil(length / .25);
      let last = groundWithRiver(a.x, a.z);
      for (let k = 1; k <= n; k++) {
        const t = k / n, x = a.x + (b.x - a.x) * t, z = a.z + (b.z - a.z) * t, y = groundWithRiver(x, z);
        assert.ok(canStand(x, z, world), `${trail.id} blocked at ${x},${z}`);
        assert.ok(Math.abs(y - last) < .2, `${trail.id} has a ground step at ${x},${z}: ${last} -> ${y}`);
        moveCharacter(walker, x - walker.x, z - walker.z, world, .34);
        assert.ok(Math.hypot(walker.x - x, walker.z - z) < .02, `${trail.id} cannot traverse ${x},${z}`);
        last = y;
      }
    }
    const end = trail.points.at(-1); assert.ok(Math.hypot(walker.x - end.x, walker.z - end.z) < .02);
  }
});

test('the cave is an enclosed usable chamber and Imlamdris rebuilds in only four wooden homes', () => {
  assert.ok(colliders.filter(c => c.kind === 'bat-cave-wall').length >= 12);
  assert.ok(canStand(-182, 1078, world));
  assert.equal(scene.metrics.woodenHomes, 4); assert.equal(scene.metrics.buildingFrames, 1);
  assert.equal(IMLAMDRIS_REBUILD.huts.length, 5);
  for (const h of IMLAMDRIS_REBUILD.huts) assert.equal(hexOwnerAt(h.x, h.z), 'South Suval');
});

test('the drawn highland ground does not bury the narrow switchback walking surface', () => {
  root.updateMatrixWorld(true);
  const ground = []; root.traverse(m => { if (m.name === 'Suval switchback ground') ground.push(m); });
  const ray = new THREE.Raycaster(), down = new THREE.Vector3(0, -1, 0);
  for (const trail of SUVAL_HIGHLAND_TRAILS) for (let i = 1; i < trail.points.length; i++) {
    const a = trail.points[i - 1], b = trail.points[i], n = Math.ceil(Math.hypot(b.x-a.x,b.z-a.z)/3);
    for (let k=0;k<=n;k++) {
      const x=a.x+(b.x-a.x)*k/n,z=a.z+(b.z-a.z)*k/n,y=groundWithRiver(x,z);
      ray.set(new THREE.Vector3(x,300,z),down);
      const hit=ray.intersectObjects(ground,false)[0];
      if(hit) assert.ok(hit.point.y-y<.25, `${trail.id} buried ${hit.point.y-y}m at ${x},${z}`);
    }
  }
});


test('the mountain shoulders blend across region boundaries and the Stillwater shore without terrain seams', () => {
  // These used to cut abruptly at atlas ownership or the lake-protection radius: a single
  // tenth-metre step could change the highland contribution by 10 to 77 metres.
  const seams = [
    { x: -184.6, z: 1019.4, name: 'South and East Suval' },
    { x: -238.6, z: 930.4, name: 'West and East Suval' },
    { x: -473.8, z: 591.2, name: 'West Suval and Luscia' },
    { x: -50.6, z: 1089.4, name: 'Stillwater shoulder' },
  ];
  for (const seam of seams) for (let i = -12; i <= 12; i++) for (let j = -12; j <= 12; j++) {
    const x = seam.x + i * .1, z = seam.z + j * .1;
    for (const [dx, dz] of [[.1, 0], [0, .1]]) {
      const contributionStep = Math.abs(suvalHighlandGround(x, z, 20) - suvalHighlandGround(x + dx, z + dz, 20));
      const groundStep = Math.abs(groundWithRiver(x, z) - groundWithRiver(x + dx, z + dz));
      assert.ok(contributionStep < 1, `${seam.name} adds a ${contributionStep.toFixed(2)}m seam at ${x},${z}`);
      assert.ok(groundStep < 1, `${seam.name} has a ${groundStep.toFixed(2)}m ground step at ${x},${z}`);
    }
  }
});

test('the short carried tour and its return remain safely above the actual Suval ridges', () => {
  const cells = SUVAL_FLIGHT_REGIONS.flatMap(region => REGION_CELLS[region]);
  const flight = buildSuvalFlightRoute({ cells, cave: BAT_CAVE.perch, apron: BAT_CAVE.apron,
    landing: BAT_LANDING, heightAt: groundWithRiver });
  for (const [name, route, phase] of [['tour', flight.route, 'survey'], ['return', flight.returnRoute, 'home']]) {
    for (let i = 1; i < route.length; i++) {
      const a = route[i - 1], b = route[i];
      if (a.phase !== phase || b.phase !== phase) continue;
      const steps = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.z - a.z)));
      for (let j = 0; j <= steps; j++) {
        const t = j / steps, x = a.x + (b.x - a.x) * t, z = a.z + (b.z - a.z) * t;
        const y = a.y + (b.y - a.y) * t;
        assert.ok(y - groundWithRiver(x, z) >= 30,
          `${name} passes too close to changed terrain at ${x.toFixed(2)},${z.toFixed(2)}`);
      }
    }
  }
});

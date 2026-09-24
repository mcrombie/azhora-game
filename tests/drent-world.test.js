import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';
import { sourceModule } from './module-loader.js';
import { canStand } from '../src/game-state.js';
import { DRENT_SITES, DRENT_LOCAL_PATHS, DRENT_NPCS, DRENT_GUARD_PATROLS, DRENT_SNEAK_ROUTE } from '../src/drent-sites.js';
import { AMBUSH } from '../src/road-ambush.js';
import { villageToWorld } from '../src/region-world.js';
import { buildLocalMapModel } from '../src/local-map-data.js';
import { atlasLocalDetail } from '../src/world-map-detail.js';

const { createWorld } = await sourceModule('../src/world.js');
const scene = new THREE.Scene(), world = createWorld(scene);
const separation = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);

function clearRoute(points) {
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1], b = points[i], steps = Math.ceil(separation(a, b) / .3);
    for (let j = 0; j <= steps; j++) {
      const p = { x: a.x + (b.x - a.x) * j / steps, z: a.z + (b.z - a.z) * j / steps };
      assert.ok(canStand(p.x, p.z, world, .38), `blocked at ${p.x.toFixed(2)}, ${p.z.toFixed(2)}`);
    }
  }
}

test('the Greenway junction and its woodland branches no longer advertise their destinations', () => {
  assert.equal(world.roadSigns.filter(sign => separation(sign, DRENT_SITES.junction) < 31).length, 0);
  assert.equal(world.paths[0].kind, 'road');
  assert.equal(world.paths[0].width, 4.2);
});

test('the former Avrel boundary is wooded and unsigned, with a clear road through it', () => {
  assert.equal(world.border.notice, false);
  assert.ok(!world.roadSigns.some(sign => sign.label === 'Tidehaven' && sign.returnLabel === 'Avrel'));
  const oldStone = villageToWorld(-5.2,-155);
  assert.ok(canStand(oldStone.x,oldStone.z,world,.38), 'the removed stone leaves no invisible collider');
  const stand = world.broadleafTrees.filter(tree => tree.id.startsWith('avrel-edge-'));
  assert.equal(stand.length,8);
  for (const tree of stand) {
    assert.ok(separation(tree,world.border)<19, 'new trees fill this clearing');
    assert.ok(world.colliders.some(c => c.kind==='avrel-edge-tree' && separation(c,tree)<.01));
  }
  clearRoute([{x:-163,z:26},world.border,{x:-196,z:25}]);
});

test('an actual footpath bypasses the rebels without entering their trigger', () => {
  const start = villageToWorld(DRENT_LOCAL_PATHS[0][0].x, DRENT_LOCAL_PATHS[0][0].z);
  const path = world.paths.find(path => path.kind === 'trail' && separation(path[0], start) < .01);
  assert.ok(path && path.width < 1.5);
  assert.ok(path.every(p => separation(p, AMBUSH.point) > AMBUSH.reach + 2));
  clearRoute(path);
});

test('camp, Killian, armory and both guard patrols have real walkable interaction points', () => {
  for (const [id, p] of Object.entries(DRENT_SITES)) assert.ok(canStand(p.x, p.z, world, .38), `${id} is obstructed`);
  for (const route of Object.values(DRENT_GUARD_PATROLS)) clearRoute([...route, route[0]]);
  clearRoute([DRENT_SITES.entrance, { x: -28, z: 68 }, DRENT_SITES.sneakEntrance, DRENT_SITES.supplies]);
  clearRoute(DRENT_SNEAK_ROUTE);
  assert.equal(DRENT_NPCS.find(npc => npc.id === 'killian').look.hairStyle, 'cropped');
  assert.ok(world.colliders.some(c => c.site === 'drent-civil-war' && c.kind === 'house'), 'a real barracks building');
  assert.ok(world.colliders.some(c => c.site === 'drent-civil-war' && c.kind === 'drent-supply-crate' && c.height > 1.2), 'solid cover along the supply approach');
});

test('lesser dirt trails retain their hierarchy through the map model and atlas projection', () => {
  const model = buildLocalMapModel({ world, position: DRENT_SITES.junction, globalDetail: true });
  const detail = atlasLocalDetail(model);
  assert.ok(model.paths.some(path => path.kind === 'trail' && path.width <= 1.25));
  assert.ok(detail.paths.some(path => path.kind === 'trail'));
  assert.ok(detail.paths.some(path => path.kind === 'road'));
});

test('the visible shrine branch is a 1.15 metre brown dirt ribbon rather than a pale road', () => {
  const target = villageToWorld(-20, -83.5), widths = [], colors = new Set();
  scene.updateMatrixWorld(true);
  scene.traverse(object => {
    if (!object.isMesh || object.isInstancedMesh) return;
    const color = object.material.color?.getHexString();
    if (!['a2916c', 'c6b384'].includes(color)) return;
    const vertices = object.geometry.attributes.position;
    for (let i = 0; i + 1 < vertices.count; i += 2) {
      const a = new THREE.Vector3().fromBufferAttribute(vertices, i).applyMatrix4(object.matrixWorld);
      const b = new THREE.Vector3().fromBufferAttribute(vertices, i + 1).applyMatrix4(object.matrixWorld);
      if (Math.hypot((a.x + b.x) / 2 - target.x, (a.z + b.z) / 2 - target.z) >= 1) continue;
      colors.add(color); widths.push(Math.hypot(a.x - b.x, a.z - b.z));
    }
  });
  assert.deepEqual([...colors], ['a2916c'], 'only the brown trail material reaches the branch');
  assert.ok(widths.length > 0, 'measured the actual rendered mesh, including static batching');
  assert.ok(widths.every(width => Math.abs(width - 1.15) < .03), `rendered branch widths: ${widths.join(', ')}`);
});

test('rendered dirt faces never stripe across the pale road at the Greenway junction', () => {
  const roads = [], trails = [], point = new THREE.Vector3();
  scene.updateMatrixWorld(true);
  scene.traverse(object => {
    if (!object.isMesh || object.isInstancedMesh) return;
    const color = object.material.color?.getHexString();
    if (!['a2916c', 'c6b384'].includes(color)) return;
    const vertices = object.geometry.attributes.position, indices = object.geometry.index;
    for (let i = 0; i < indices.count; i += 3) {
      const triangle = [0, 1, 2].map(offset => {
        point.fromBufferAttribute(vertices, indices.getX(i + offset)).applyMatrix4(object.matrixWorld);
        return { x: point.x, z: point.z };
      });
      const x = triangle.reduce((sum, p) => sum + p.x, 0) / 3, z = triangle.reduce((sum, p) => sum + p.z, 0) / 3;
      if (Math.hypot(x - DRENT_SITES.junction.x, z - DRENT_SITES.junction.z) < 35) (color === 'a2916c' ? trails : roads).push(triangle);
    }
  });
  assert.ok(trails.length > 30 && roads.length > 30, 'both road and woodland connections remain drawn');
  // Independent separating-axis check: touching shared verge edges are allowed, positive-area
  // intersection is not. This reads only indexed faces which the renderer actually draws.
  const overlaps = (a, b) => [...a, ...b].every((p, i, points) => {
    const base = i < 3 ? 0 : 3, q = points[base + (i - base + 1) % 3], dx = q.x - p.x, dz = q.z - p.z, length = Math.hypot(dx, dz);
    if (length < 1e-6) return true;
    const project = shape => shape.map(v => (v.x * -dz + v.z * dx) / length), x = project(a), y = project(b);
    return Math.min(Math.max(...x), Math.max(...y)) - Math.max(Math.min(...x), Math.min(...y)) > .0003;
  });
  for (const trail of trails) for (const road of roads) assert.equal(overlaps(trail, road), false, `overlapping rendered faces near ${JSON.stringify(trail[0])}`);
  assert.ok(world.paths.some(path => path.kind === 'trail' && separation(path[0], DRENT_SITES.junction) < .01), 'the shrine navigation centerline still reaches the main road');
});

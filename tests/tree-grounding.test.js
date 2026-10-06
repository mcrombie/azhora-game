import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';
import { sourceModule } from './module-loader.js';
import { treeGroundingOffset } from '../src/world/scenery/tree-grounding.js';
import { terrainRoadHeight } from '../src/world/terrain/terrain-road.js';
import { brandyHomeClear } from '../src/content/quests/brandy/brandy-home-world.js';

test('leaning tree roots meet a hillside at their actual footprint instead of at the crown centre', () => {
  const tree = new THREE.Object3D();
  tree.position.set(3, 15, -8); tree.rotation.set(.025, 1.2, -.02); tree.scale.set(1.2, 9, 1.2); tree.updateMatrix();
  const toWorld = (x, z) => ({ x: z - 20, z: 29 - x });
  const groundAt = (x, z) => 8 + .6 * x + .25 * z;
  tree.position.y += treeGroundingOffset(tree.matrix, groundAt, { toWorld }); tree.updateMatrix();
  const gaps = [];
  for (let i = 0; i < 7; i++) {
    const angle = i * Math.PI * 2 / 7;
    const p = new THREE.Vector3(Math.sin(angle) * .38, -.5, Math.cos(angle) * .38).applyMatrix4(tree.matrix);
    const w = toWorld(p.x, p.z); gaps.push(p.y - groundAt(w.x, w.z));
  }
  assert.ok(Math.abs(Math.max(...gaps) + .03) < 1e-9);
  assert.ok(gaps.every(gap => gap < 0), 'no downhill edge hangs above the ground');
});

test('flat ground keeps the whole trunk intact with only a small root embed', () => {
  const tree = new THREE.Object3D(); tree.position.set(2, 8, 4); tree.scale.set(1, 8, 1); tree.updateMatrix();
  assert.ok(Math.abs(treeGroundingOffset(tree.matrix, () => 4) + .03) < 1e-9);
});

test('the rendered Saltwind and Tidehaven tree roots contact the displayed hillside and wildlife trunk records agree', async () => {
  const { createWorld } = await sourceModule('../src/world.js');
  const scene = new THREE.Scene(), world = createWorld(scene); scene.updateMatrixWorld(true);
  const ground = scene.getObjectByName('The ground of the four regions').children[0].geometry.attributes.position.array;
  const xs = [], zs = [];
  for (let i = 0; ground[i + 2] === ground[2]; i += 3) xs.push(ground[i]);
  for (let i = 0; i < ground.length; i += xs.length * 3) zs.push(ground[i + 2]);
  const height = (x, z) => terrainRoadHeight(x, z, xs, zs, ground, 0);
  const village = scene.getObjectByName('Tidehaven and the Greenway');
  const trunks = village.children.find(o => o.isInstancedMesh && o.geometry.parameters?.radiusTop === .21 && o.geometry.parameters?.height === 1);
  assert.ok(trunks, 'inspect the actual instanced trunk mesh');
  const vertices = trunks.geometry.attributes.position, foot = [], matrix = new THREE.Matrix4();
  for (let v = 0; v < vertices.count; v++) if (Math.abs(vertices.getY(v) + .5) < 1e-6) foot.push(new THREE.Vector3().fromBufferAttribute(vertices, v));
  const centres = []; let count = 0, saltwind = 0;
  for (let i = 0; i < trunks.count; i++) {
    trunks.getMatrixAt(i, matrix); matrix.premultiply(trunks.matrixWorld);
    if (Math.abs(matrix.determinant()) < .00001) continue;
    const centre = new THREE.Vector3(0, -.5, 0).applyMatrix4(matrix); centres.push(centre);
    assert.equal(brandyHomeClear(centre.x, centre.z, .5), false, `tree ${i} leaves Brandy's cottage and approach clear`);
    const gaps = foot.map(vertex => {
      const p = vertex.clone().applyMatrix4(matrix); return p.y - height(p.x, p.z);
    });
    const nearest = Math.max(...gaps);
    assert.ok(nearest <= -.029 && nearest >= -.031, `tree ${i} at ${centre.x},${centre.z} root/ground gap ${nearest}`);
    count++;
    if (centre.x > -80 && centre.x < 40 && centre.z > 60 && centre.z < 145) saltwind++;
  }
  assert.ok(count > 200 && saltwind > 35, `checked ${count} trees including ${saltwind} around Saltwind`);
  for (const tree of world.broadleafTrees.filter(tree => tree.id.startsWith('oak-'))) {
    assert.ok(centres.some(p => p.distanceTo(new THREE.Vector3(tree.base.x, tree.base.y, tree.base.z)) < .0001), `${tree.id} wildlife base follows its grounded visible trunk`);
  }
});

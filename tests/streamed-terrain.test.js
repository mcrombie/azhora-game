import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';
import { createStreamedTerrain } from '../src/world/loading/streamed-terrain.js';
import { finishBuild } from '../src/world/loading/build-steps.js';
import { drapeRoadOnTerrain, terrainRoadHeight } from '../src/world/terrain/terrain-road.js';

function fixture({ cached = false, xs = Array.from({ length: 65 }, (_, i) => i * 10), zs = Array.from({ length: 41 }, (_, i) => i * 10) } = {}) {
  const positions = new Float32Array(xs.length * zs.length * 3), colors = new Float32Array(positions.length);
  const sampled = new Uint8Array(xs.length * zs.length), calls = new Uint16Array(sampled.length), root = new THREE.Group();
  const sample = (i, j) => {
    const k = j * xs.length + i; calls[k]++;
    positions.set([xs[i], 18 + Math.sin(xs[i] * .06) * 3 + Math.cos(zs[j] * .035) * 5, zs[j]], k * 3);
    colors.set([.25 + (k % 13) * .01, .4 + (k % 19) * .01, .2], k * 3);
  };
  if (cached) {
    for (let j = 0; j < zs.length; j++) for (let i = 0; i < xs.length; i++) sample(i, j);
    sampled.fill(1); calls.fill(0);
  }
  const stream = createStreamedTerrain({ THREE, xs, zs, positions, colors, sample, sampled, root,
    material: new THREE.MeshStandardMaterial({ flatShading: true }), tileSize: 4,
    cells: { First: [{ x: 200, z: 180 }], Second: [{ x: 380, z: 180 }] }, ids: { First: 1, Second: 2 } });
  return { stream, root, xs, zs, positions, colors, sampled, calls, sample };
}

test('preempted region builds share unfinished terrain tiles and publish each mesh once', () => {
  const f=fixture(), a=f.stream.buildRegion(1), b=f.stream.buildRegion(1);
  a.next(); a.next(); b.next();
  finishBuild(b); finishBuild(a);
  assert.equal(f.root.children.length,f.stream.tileCount());
  assert.equal(new Set(f.root.children.map(mesh=>mesh.name)).size,f.root.children.length);
  assert.ok(f.calls.every(count=>count<=1));
});

test('regions sample only their tiles and reuse identical shared edge vertices when built later', () => {
  const f = fixture(), steps = f.stream.buildRegion(1);
  assert.equal(f.root.children.length, 0);
  const first = steps.next(); assert.equal(first.done, false); assert.equal(f.root.children.length, 0, 'a tile is attached only when complete');
  finishBuild(steps);
  const initialTiles = f.stream.tileCount();
  assert.ok(initialTiles > 0); assert.ok(f.sampled.some(value => value === 0), 'distant terrain remains unbuilt');
  finishBuild(f.stream.buildRegion(2));
  assert.ok(f.stream.tileCount() > initialTiles);
  const count = f.stream.tileCount(); finishBuild(f.stream.buildRegion(1));
  assert.equal(f.stream.tileCount(), count); assert.ok(f.calls.every(value => value <= 1));
  const edges = new Map(); let shared = 0;
  for (const mesh of f.root.children) {
    const p = mesh.geometry.attributes.position, c = mesh.geometry.attributes.color;
    for (let i = 0; i < p.count; i++) {
      const key = `${p.getX(i)}:${p.getZ(i)}`, value = [p.getY(i), c.getX(i), c.getY(i), c.getZ(i)];
      if (edges.has(key)) { assert.deepEqual(value, edges.get(key)); shared++; } else edges.set(key, value);
    }
  }
  assert.ok(shared > 100, 'check genuine common tile borders');
});

test('reversing background region order produces the same geometry, colours and winding', () => {
  const a = fixture(), b = fixture();
  for (const id of [1, 2]) finishBuild(a.stream.buildRegion(id));
  for (const id of [2, 1]) finishBuild(b.stream.buildRegion(id));
  const sorted = root => [...root.children].sort((x, y) => x.name.localeCompare(y.name));
  const first = sorted(a.root), second = sorted(b.root);
  assert.equal(first.length, second.length);
  for (let i = 0; i < first.length; i++) {
    assert.equal(first[i].name, second[i].name);
    for (const key of ['position', 'color', 'normal']) assert.deepEqual(first[i].geometry.attributes[key].array, second[i].geometry.attributes[key].array);
    assert.deepEqual(first[i].geometry.index.array, second[i].geometry.index.array);
    const p = first[i].geometry.attributes.position, indices = first[i].geometry.index.array;
    for (let j = 0; j < indices.length; j += 3) {
      const [ia, ib, ic] = indices.slice(j, j + 3);
      const x = (p.getX(ia) + p.getX(ib) + p.getX(ic)) / 3, z = (p.getZ(ia) + p.getZ(ib) + p.getZ(ic)) / 3;
      const expected = (p.getY(ia) + p.getY(ib) + p.getY(ic)) / 3;
      assert.ok(Math.abs(terrainRoadHeight(x, z, a.xs, a.zs, a.positions, 0) - expected) < 1e-10, 'tile triangles agree with global foot/road sampling');
      assert.ok((p.getX(ib) - p.getX(ia)) * (p.getZ(ic) - p.getZ(ia)) - (p.getZ(ib) - p.getZ(ia)) * (p.getX(ic) - p.getX(ia)) < 0);
    }
  }
});

test('a bending ribbon samples both next-row corners and every crossed terrain cell before draping', () => {
  const axes = Array.from({ length: 21 }, (_, i) => i), partial = fixture({ xs: axes, zs: axes }), full = fixture({ cached: true, xs: axes, zs: axes });
  const vertices = new Float32Array([1, 20, 1, 2, 20, 1, 15, 20, 15, 2, 20, 15]), indices = [0, 2, 1, 1, 2, 3];
  partial.stream.ensureRibbon(vertices);
  assert.equal(partial.sampled[10 * axes.length + 10], 1, 'the diagonal interior must be sampled, not only endpoint rows');
  assert.deepEqual(drapeRoadOnTerrain(vertices, indices, axes, axes, partial.positions), drapeRoadOnTerrain(vertices, indices, axes, axes, full.positions));
  partial.stream.ensureRibbon(vertices);
  assert.ok(partial.calls.every(value => value <= 1));
});

test('cached terrain remains unchanged and edge queries safely sample the final grid cell', () => {
  const f = fixture({ cached: true }), original = f.positions.slice();
  finishBuild(f.stream.buildRegion(1)); f.stream.ensureAt(1e6, 1e6);
  assert.ok(f.calls.every(value => value === 0)); assert.deepEqual(f.positions, original);
  const live = fixture(); live.stream.ensureAt(1e6, 1e6);
  const cols = live.xs.length, rows = live.zs.length;
  for (const j of [rows - 2, rows - 1]) for (const i of [cols - 2, cols - 1]) assert.equal(live.sampled[j * cols + i], 1);
  assert.equal(live.sampled.reduce((a, b) => a + b, 0), 4);
});


test('horizon tiles cover unbuilt country cheaply without marking it ready, then yield to exact terrain', () => {
  const f=fixture(),bounds={minX:0,maxX:640,minZ:0,maxZ:400};
  finishBuild(f.stream.buildBackdrop(bounds));
  const backdrops=f.stream.backdropCount();
  assert.ok(backdrops>0);assert.equal(f.stream.tileCount(),0);
  assert.ok(f.sampled.some(value=>value===0),'the horizon does not sample all detailed terrain');
  let disposed=0;for(const mesh of f.root.children)mesh.geometry.addEventListener('dispose',()=>disposed++);
  finishBuild(f.stream.buildRegion(1));
  assert.ok(f.stream.tileCount()>0);assert.ok(f.stream.backdropCount()<backdrops);
  assert.equal(disposed,backdrops-f.stream.backdropCount(),'replaced geometry is released');
  const names=f.root.children.map(mesh=>mesh.name.replace('Terrain backdrop ','').replace('Terrain ',''));
  assert.equal(new Set(names).size,names.length,'no overlapping full and backdrop tiles');
  const count=f.root.children.length;finishBuild(f.stream.buildBackdrop(bounds));
  assert.equal(f.root.children.length,count,'drawing the horizon again does not overwrite detailed country');
  assert.ok(f.calls.every(count=>count<=1));
  const exact=fixture();finishBuild(exact.stream.buildRegion(1));
  for(const mesh of exact.root.children){const actual=f.root.getObjectByName(mesh.name);assert.ok(actual);
    for(const key of ['position','color','normal'])assert.deepEqual(actual.geometry.attributes[key].array,mesh.geometry.attributes[key].array);
  }
});


test('distant horizon skirts stay outside the surface root consumed by river refiners', () => {
  const root=new THREE.Group(),horizon=new THREE.Group(),axis=[0,10,20,30,40,50,60,70,80];
  const positions=new Float32Array(axis.length**2*3),colors=new Float32Array(positions.length),sampled=new Uint8Array(axis.length**2);
  const sample=(i,j)=>{const k=(j*axis.length+i)*3;positions.set([axis[i],15,axis[j]],k);colors.set([.4,.5,.2],k);};
  const stream=createStreamedTerrain({THREE,xs:axis,zs:axis,positions,colors,sampled,sample,root,backdropRoot:horizon,
    material:new THREE.MeshStandardMaterial(),cells:{First:[{x:40,z:40}]},ids:{First:1},tileSize:4});
  finishBuild(stream.buildBackdrop({minX:0,maxX:80,minZ:0,maxZ:80}));
  assert.ok(horizon.children.length>0);assert.equal(root.children.length,0);
  finishBuild(stream.buildRegion(1));assert.equal(horizon.children.length,0);
  for(const mesh of root.children){const p=mesh.geometry.attributes.position,indices=mesh.geometry.index.array;
    for(let i=0;i<indices.length;i+=3){const [a,b,c]=indices.slice(i,i+3);
      const area=(p.getX(b)-p.getX(a))*(p.getZ(c)-p.getZ(a))-(p.getZ(b)-p.getZ(a))*(p.getX(c)-p.getX(a));
      assert.ok(Number.isFinite(area)&&Math.abs(area)>0,'river-plane interpolation never receives a vertical skirt');
    }
  }
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { drawMinimap, miniMapProjection } from '../src/minimap.js';
import { regions, regionAt } from '../src/regions.js';
import { sourceModule } from './module-loader.js';
import * as THREE from '../vendor/three.module.js';

function context() {
  const calls = [], ctx = { calls };
  for (const method of ['clearRect', 'save', 'restore', 'beginPath', 'closePath', 'arc', 'clip', 'fillRect', 'strokeRect',
    'moveTo', 'lineTo', 'fill', 'stroke', 'translate', 'rotate', 'setLineDash']) {
    ctx[method] = (...args) => {
      for (const argument of args.flat()) assert.ok(typeof argument !== 'number' || Number.isFinite(argument), `${method} received ${argument}`);
      calls.push({ method, args, fill: ctx.fillStyle, stroke: ctx.strokeStyle, width: ctx.lineWidth });
    };
  }
  return ctx;
}
function fixture() {
  return {
    regions, regionAt, bounds: { minX: -94, maxX: 94, minZ: -680, maxZ: 48 },
    paths: [[{ x: 0, z: 25 }, { x: -1, z: -70 }, { x: 2, z: -162 }, { x: 0, z: -673 }], [{ x: -1, z: -70 }, { x: 24, z: -77 }]],
    heightAt(x, z) { return z > 31 + Math.sin(x / 8) * 3 ? -.5 : 3; },
    pond: { x: 27, z: -77, radius: 5.4 }, border: { barrierZ: -162 },
    colliders: [
      { x: 12, z: 4, kind: 'house', width: 6, depth: 8, angle: .2 },
      { x: -12, z: -190, kind: 'house', hx: 3.5, hz: 4 },
      { x: -11, z: -412, kind: 'river-water', hx: 7, hz: 6.7 },
      { x: 11, z: -408, kind: 'river-water', hx: 7, hz: 6.7 },
      { x: -2.8, z: -412, kind: 'bridge-rail', hx: .11, hz: 12.1 },
    ],
    landmarks: [{ id: 'village', x: 0, z: 4 }, { id: 'pond', x: 24, z: -77 }, { id: 'secret', x: 30, z: -55 }],
  };
}

test('local projection stays centered, metrically proportional, and north-up across all districts', () => {
  for (const position of [{ x: 0, z: 43 }, { x: -31, z: -240 }, { x: 15, z: -413 }, { x: 8, z: -600 }]) {
    const p = miniMapProjection({ position });
    assert.deepEqual(p.project(position), { x: 150, y: 150, distance: 0, bearing: 0, inside: true, clamped: false });
    assert.equal(p.project({ x: position.x + 31, z: position.z }).x, 220);
    assert.equal(p.project({ x: position.x, z: position.z - 31 }).y, 80);
    assert.equal(p.bounds.maxZ - p.bounds.minZ, 124);
    assert.equal(p.project({ x: position.x + 62, z: position.z }).inside, true);
    assert.equal(p.project({ x: position.x + 63, z: position.z }).inside, false);
  }
});

test('independent bearings retain both targets even on opposite map edges', () => {
  const ctx = context(), world = fixture(), position = { x: 0, z: -60 };
  const view = drawMinimap(ctx, { world, position, goal: { x: 0, z: -650 }, tracked: { id: 'village', x: 180, z: 80 } });
  assert.ok(view.goal.clamped && view.optional.clamped);
  assert.equal(view.goal.x, 150); assert.equal(view.goal.y, 17);
  assert.ok(view.optional.x > 150 && view.optional.y > 150);
  for (const marker of [view.goal, view.optional]) assert.ok(Math.abs(Math.hypot(marker.x - 150, marker.y - 150) - 133) < .00001);
  assert.equal(view.optional.id, 'village');
  const nearby = drawMinimap(context(), { world, position, goal: { x: 5, z: -60 }, tracked: { x: 0, z: -61 } });
  assert.ok(!nearby.goal.clamped && !nearby.optional.clamped);
});

test('player arrow follows the actual character yaw at each cardinal heading', () => {
  for (const [angle, tip] of [[0, [150, 158]], [Math.PI / 2, [158, 150]], [Math.PI, [150, 142]], [-Math.PI / 2, [142, 150]]]) {
    const state = drawMinimap(context(), { position: { x: 50, z: -222 }, angle });
    assert.ok(Math.abs(state.player.tip.x - tip[0]) < 1e-9);
    assert.ok(Math.abs(state.player.tip.y - tip[1]) < 1e-9);
  }
});

test('actual coast, pond, bent river and adjacent districts share the same local scale', () => {
  const world = fixture();
  const coast = drawMinimap(context(), { world, position: { x: 0, z: 25 } });
  const pond = drawMinimap(context(), { world, position: { x: 18, z: -77 } });
  const river = drawMinimap(context(), { world, position: { x: 0, z: -412 } });
  const ridge = drawMinimap(context(), { world, position: { x: 0, z: -580 } });
  assert.equal(coast.counts.waterShapes, 1); assert.equal(pond.counts.waterShapes, 1);
  assert.equal(river.counts.waterShapes, 2); assert.equal(ridge.counts.waterShapes, 0);
  assert.equal(river.regionId, 3); assert.equal(ridge.regionId, 4);
  assert.equal(coast.scale, ridge.scale);
  assert.ok(coast.counts.heightSamples <= 1100); assert.equal(ridge.counts.heightSamples, 122);
  const borderContext = context();
  drawMinimap(borderContext, { world, position: { x: 0, z: -160 } });
  const strips = borderContext.calls.filter(call => call.method === 'fillRect');
  assert.ok(strips.some(call => call.fill === '#e6d8ad'));
  assert.ok(strips.some(call => call.fill === '#d9caa0'));
});

test('new-region house half-extents render finite footprints; invalid data cannot reach canvas', () => {
  const world = fixture();
  world.colliders.push({ kind: 'house', x: 3, z: -195, width: NaN, depth: Infinity, angle: NaN });
  world.colliders.push({ kind: 'house', x: NaN, z: -195 });
  world.paths.push([{ x: NaN, z: 2 }, { x: 0, z: -190 }, { x: 1, z: -200 }]);
  const ctx = context();
  const state = drawMinimap(ctx, { world, position: { x: 0, z: -190 }, angle: Infinity, time: NaN,
    goal: { x: Infinity, z: 0 }, tracked: { x: NaN, z: 0 } });
  assert.equal(state.counts.buildings, 2); assert.equal(state.goal, null); assert.equal(state.optional, null);
  assert.ok(ctx.calls.some(call => call.method === 'fillRect' && Math.abs(call.args[2] - 7 * state.scale) < 1e-9
    && Math.abs(call.args[3] - 8 * state.scale) < 1e-9));
  assert.equal(drawMinimap(context(), { world, position: { x: NaN, z: Infinity }, radius: NaN, size: Infinity }).player.x, 150);
});

test('discovery rendering and combat are read-only and cannot expose distant live enemies', () => {
  const world = fixture(), discoveries = new Set(['pond']);
  const combat = { phase: 'active', enemies: [{ x: 12, z: -70, hp: 2 }, { x: 0, z: -600, hp: 3 }, { x: 5, z: -75, hp: 0 }] };
  const before = JSON.stringify({ world, combat, discoveries: [...discoveries] });
  const state = drawMinimap(context(), { world, position: { x: 16, z: -65 }, discoveries, combat });
  assert.equal(state.counts.landmarks, 2); assert.equal(state.counts.discovered, 1); assert.equal(state.counts.enemies, 1);
  assert.equal(JSON.stringify({ world, combat, discoveries: [...discoveries] }), before);
  assert.equal(drawMinimap(context(), { world, position: { x: 16, z: -65 }, combat: { ...combat, phase: 'won' } }).counts.enemies, 0);
});

test('the built world uses rendered water outlines and bridge rails without terrain resampling', async () => {
  const { createWorld } = await sourceModule('../src/world.js');
  const scene = new THREE.Scene(), world = createWorld(scene);
  const geometryCount = new Set(), materialCount = new Set();
  scene.traverse(object => {
    if (object.geometry) geometryCount.add(object.geometry);
    if (object.material) for (const material of Array.isArray(object.material) ? object.material : [object.material]) materialCount.add(material);
  });
  try {
    for (const [position, regionId, waterShapes] of [[{ x: 0, z: 25 }, 1, 1], [{ x: 15, z: -77 }, 1, 1],
      [{ x: 0, z: -240 }, 2, 0], [{ x: 0, z: -412 }, 3, 1], [{ x: 0, z: -600 }, 4, 0]]) {
      const ctx = context(), state = drawMinimap(ctx, { world, position });
      assert.equal(state.regionId, regionId); assert.equal(state.counts.waterShapes, waterShapes);
      assert.equal(state.counts.heightSamples, 0, 'the live world supplies exact rendered water instead of CPU height sampling');
      assert.equal(ctx.calls.filter(c => c.method === 'save').length, ctx.calls.filter(c => c.method === 'restore').length);
      if (regionId === 3) {
        assert.ok(ctx.calls.some(c => c.method === 'fillRect' && c.fill === '#8b7355'
          && Math.abs(c.args[2] - 5.6 * state.scale) < .00001), 'the actual bridge spans its full rail-to-rail width above river water');
      }
    }
  } finally {
    for (const geometry of geometryCount) geometry.dispose();
    for (const material of materialCount) material.dispose();
    scene.clear();
  }
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { drawMinimap, miniMapProjection, MINIMAP_PALETTE } from '../src/minimap.js';
import { regions, regionAt, WORLD_BOUNDS } from '../src/regions.js';
import { toWorld } from '../src/world-scale.js';

/** The fixture speaks authored metres, like the world it stands in for. */
const at = (x, z) => toWorld(x, z);
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
    regions, regionAt, bounds: { ...WORLD_BOUNDS },
    paths: [[at(5, 29), at(-176, 29), at(-345, 93), at(-549, 348)],
      [at(-97, 2), at(-80, 6)]],
    heightAt() { return 3; },
    pond: { ...at(-97, 2), radius: 5.4 }, border: { barrierX: at(-182, 29).x },
    colliders: [
      { ...at(-8, 34), kind: 'house', width: 6, depth: 8, angle: .2 },
      { ...at(-235, 55), kind: 'house', hx: 3.5, hz: 4 },
      { ...at(-350, 100), kind: 'river-water', hx: 7, hz: 6.7 },
      { ...at(-338, 86), kind: 'river-water', hx: 7, hz: 6.7 },
      { ...at(-344, 95), kind: 'bridge-rail', hx: .11, hz: 12.1 },
    ],
    landmarks: [{ id: 'village', ...at(-15, 29) }, { id: 'pond', ...at(-102, 8) }, { id: 'secret', ...at(-60, 10) }],
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
  const ctx = context(), world = fixture(), position = { x: -80, z: 29 };
  const view = drawMinimap(ctx, { world, position, goal: { x: -80, z: -560 }, tracked: { id: 'village', x: 100, z: 160 } });
  assert.ok(view.goal.clamped && view.optional.clamped);
  assert.equal(view.goal.x, 150); assert.equal(view.goal.y, 17);
  assert.ok(view.optional.x > 150 && view.optional.y > 150);
  for (const marker of [view.goal, view.optional]) assert.ok(Math.abs(Math.hypot(marker.x - 150, marker.y - 150) - 133) < .00001);
  assert.equal(view.optional.id, 'village');
  const nearby = drawMinimap(context(), { world, position, goal: { x: -75, z: 29 }, tracked: { x: -80, z: 28 } });
  assert.ok(!nearby.goal.clamped && !nearby.optional.clamped);
});

test('the long road’s next stop is a second, ringed target beside the arc’s own', () => {
  // Two golds: the muster road's filled diamond and the long road's open one, both drawn, so
  // following one never hides the other (src/quest-markers.js, docs/drent-long-road.md §2).
  const world = fixture(), position = { x: -80, z: 29 };
  const view = drawMinimap(context(), { world, position, goal: { x: -75, z: 29 }, openGoal: { id: 'long-road-bird-garden', x: -30, z: 20 } });
  assert.ok(view.goal, 'the arc is still drawn');
  assert.ok(view.openGoal, 'and so is the long road');
  assert.equal(view.openGoal.id, 'long-road-bird-garden');
  assert.notDeepEqual([view.goal.x, view.goal.y], [view.openGoal.x, view.openGoal.y], 'two targets, two places');
  assert.equal(drawMinimap(context(), { world, position, goal: { x: -75, z: 29 } }).openGoal, null, 'and nothing when there is nothing to take');
});

test('player arrow follows the actual character yaw at each cardinal heading', () => {
  for (const [angle, tip] of [[0, [150, 158]], [Math.PI / 2, [158, 150]], [Math.PI, [150, 142]], [-Math.PI / 2, [142, 150]]]) {
    const state = drawMinimap(context(), { position: { x: 50, z: -222 }, angle });
    assert.ok(Math.abs(state.player.tip.x - tip[0]) < 1e-9);
    assert.ok(Math.abs(state.player.tip.y - tip[1]) < 1e-9);
  }
});

test('a world without rendered water still traces its own coast and pond', () => {
  const small = { bounds: { minX: -100, maxX: 100, minZ: -100, maxZ: 100 },
    heightAt(x, z) { return z > 31 + Math.sin(x / 8) * 3 ? -.5 : 3; },
    pond: { x: -40, z: -60, radius: 5.4 } };
  const coast = drawMinimap(context(), { world: small, position: { x: 0, z: 25 } });
  assert.equal(coast.counts.waterShapes, 1);
  assert.ok(coast.counts.heightSamples <= 1100);
  const inland = drawMinimap(context(), { world: small, position: { x: -40, z: -60 } });
  assert.equal(inland.counts.waterShapes, 1, 'only the pond, drawn from its own radius');
  assert.equal(inland.counts.heightSamples, 122);
});

test('the rebuilt districts, the Caloss and their borders share the same local scale', () => {
  const world = fixture();
  const river = drawMinimap(context(), { world, position: at(-345, 93) });
  const ridge = drawMinimap(context(), { world, position: at(-91, 411) });
  const camp = drawMinimap(context(), { world, position: at(-549, 348) });
  assert.equal(river.counts.waterShapes, 2); assert.equal(ridge.counts.waterShapes, 0);
  assert.equal(river.regionId, 2); assert.equal(ridge.regionId, 4); assert.equal(camp.regionId, 3);
  assert.equal(river.scale, ridge.scale);
  // District ground is filled from the authored hex outlines, so a view near a
  // border shows the real shape of both sides.
  const borderContext = context();
  drawMinimap(borderContext, { world, position: at(-330, 90) });
  const fills = borderContext.calls.filter(call => call.method === 'fill');
  assert.ok(fills.some(call => call.fill === '#d9caa0'), 'Drent is filled by outline');
  assert.ok(fills.some(call => call.fill === '#e6d8ad'), 'Luscia is filled by outline');
});

test('new-region house half-extents render finite footprints; invalid data cannot reach canvas', () => {
  const world = fixture();
  world.colliders.push({ kind: 'house', ...at(-232, 50), width: NaN, depth: Infinity, angle: NaN });
  world.colliders.push({ kind: 'house', x: NaN, z: 50 });
  world.paths.push([{ x: NaN, z: 2 }, at(-235, 55), at(-236, 60)]);
  const ctx = context();
  const state = drawMinimap(ctx, { world, position: at(-235, 55), angle: Infinity, time: NaN,
    goal: { x: Infinity, z: 0 }, tracked: { x: NaN, z: 0 } });
  assert.equal(state.counts.buildings, 2); assert.equal(state.goal, null); assert.equal(state.optional, null);
  assert.ok(ctx.calls.some(call => call.method === 'fillRect' && Math.abs(call.args[2] - 7 * state.scale) < 1e-9
    && Math.abs(call.args[3] - 8 * state.scale) < 1e-9));
  assert.equal(drawMinimap(context(), { world, position: { x: NaN, z: Infinity }, radius: NaN, size: Infinity }).player.x, 150);
});

test('discovery rendering and combat are read-only and cannot expose distant live enemies', () => {
  const world = fixture(), discoveries = new Set(['pond']);
  const combat = { phase: 'active', enemies: [{ ...at(-100, 14), hp: 2 }, { ...at(-500, 300), hp: 3 }, { ...at(-98, 2), hp: 0 }] };
  const before = JSON.stringify({ world, combat, discoveries: [...discoveries] });
  const state = drawMinimap(context(), { world, position: at(-104, 6), discoveries, combat });
  assert.equal(state.counts.landmarks, 2); assert.equal(state.counts.discovered, 1); assert.equal(state.counts.enemies, 1);
  assert.equal(JSON.stringify({ world, combat, discoveries: [...discoveries] }), before);
  assert.equal(drawMinimap(context(), { world, position: at(-104, 6), combat: { ...combat, phase: 'won' } }).counts.enemies, 0);
});

test('the watched bird is marked on the chart, and carried to the ring when it is off it', () => {
  const world = fixture(), position = { x: -80, z: 29 };
  assert.equal(drawMinimap(context(), { world, position }).bird, null, 'no bird handed in, nothing drawn');
  // Where it is: a small pair of wings, inside the ring, in birding's own colour.
  const near = { id: 'wren-0', x: -70, z: 39 };
  const ctx = context(), view = drawMinimap(ctx, { world, position, bird: near });
  assert.ok(view.bird.inside && !view.bird.clamped);
  assert.equal(view.bird.id, 'wren-0');
  assert.ok(Math.hypot(view.bird.x - 150, view.bird.y - 150) > 1, 'the bird is not drawn on top of the traveler');
  const wings = ctx.calls.filter(call => call.stroke === MINIMAP_PALETTE.bird);
  assert.ok(wings.length >= 5, `the wings are stroked in the birding colour (${wings.length} calls)`);
  assert.notEqual(MINIMAP_PALETTE.bird, '#ffe0a0'); assert.notEqual(MINIMAP_PALETTE.bird, '#8acfc2');
  // Beyond the chart's 62 m: held at the ring with an arrow pointing on past it.
  const far = drawMinimap(context(), { world, position, bird: { id: 'gull-2', x: -80, z: 200 } });
  assert.ok(far.bird.clamped);
  assert.ok(Math.abs(Math.hypot(far.bird.x - 150, far.bird.y - 150) - 134) < .00001, 'held just inside the rim');
  assert.ok(far.bird.y > 150, 'a bird to the south is marked to the south');
  // It never displaces what was already on the chart.
  const both = drawMinimap(context(), { world, position, goal: { x: -80, z: -560 }, tracked: { id: 'village', x: 100, z: 160 }, bird: near });
  assert.ok(both.goal && both.optional && both.bird);
  assert.notEqual(both.bird.x, both.goal.x);
  for (const bird of [{ x: NaN, z: 3 }, { x: 4 }, null, 'a wren'])
    assert.equal(drawMinimap(context(), { world, position, bird }).bird, null, JSON.stringify(bird));
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
    for (const [position, regionId] of [[at(5, 29), 1], [at(-102, 6), 1],
      [at(-236, 30), 1], [at(-345, 93), 2], [at(-549, 348), 3], [at(-91, 411), 4]]) {
      const ctx = context(), state = drawMinimap(ctx, { world, position });
      assert.equal(state.regionId, regionId, `${position.x}, ${position.z}`);
      assert.equal(state.counts.heightSamples, 0, 'the live world supplies exact rendered water instead of CPU height sampling');
      assert.equal(ctx.calls.filter(c => c.method === 'save').length, ctx.calls.filter(c => c.method === 'restore').length);
    }
    const bridge = drawMinimap(context(), { world, position: at(-345, 93) });
    assert.ok(bridge.counts.waterShapes >= 1, 'the Caloss is drawn from its rendered banks');
    const village = drawMinimap(context(), { world, position: at(5, 29) });
    assert.ok(village.counts.waterShapes >= 1, 'the coast is drawn from its rendered shoreline');
    const hills = drawMinimap(context(), { world, position: at(-91, 411) });
    assert.equal(hills.counts.waterShapes, 0, 'the inland hills have no water to draw');
  } finally {
    for (const geometry of geometryCount) geometry.dispose();
    for (const material of materialCount) material.dispose();
    scene.clear();
  }
});

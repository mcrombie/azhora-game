import test from 'node:test';
import assert from 'node:assert/strict';
import './module-loader.js';
import { groundWithRiver, groundBeforeVarn } from '../src/world/terrain/world-terrain.js';
import { regionAt, WORLD_BOUNDS, hexOwnerAt } from '../src/world/terrain/region-world.js';
import { moveCharacter } from '../src/gameplay/movement/game-state.js';
import { canWalkSlope, sampleClimbSurface } from '../src/gameplay/movement/climbing.js';
import { CAVE_BENCHES, CAVE_RAILS, varnUnclimbable } from '../src/content/regions/varn/varn-world.js';
import { createCaves } from '../src/content/regions/east-lotharn/east-lotharn-caves.js';
import { createLotharnCaveWalk } from '../src/content/regions/east-lotharn/east-lotharn-cave-walk.js';
import { travel } from './lattice-flood.js';

// Fast terrain/controller coverage. The existing Varn suite additionally uses the constructed
// scenery, gates and colliders, floods the whole reach, and spends real wind on both Slabs.
const world = { heightAt: groundWithRiver, regionAt, bounds: WORLD_BOUNDS, waterAt: () => .45,
  colliders: [], unclimbableAt: varnUnclimbable };

test('the restored chamber and low chimney shelves can be walked out and back without a fall', () => {
  for (const bench of CAVE_BENCHES) for (const reverse of [false, true]) {
    const points = reverse ? [...bench.line].reverse() : bench.line;
    const p = { ...points[0], y: world.heightAt(points[0].x, points[0].z) };
    for (const goal of points.slice(1)) {
      let steps = 0;
      while (Math.hypot(goal.x - p.x, goal.z - p.z) > .05 && steps++ < 1000) {
        const dx = goal.x - p.x, dz = goal.z - p.z, distance = Math.hypot(dx, dz), run = Math.min(.12, distance);
        const before = { ...p };
        moveCharacter(p, dx / distance * run, dz / distance * run, world, .34,
          { canTraverse: (x, z, nx, nz) => canWalkSlope(x, z, nx, nz, world) });
        p.y = world.heightAt(p.x, p.z);
        assert.ok(Math.hypot(p.x - before.x, p.z - before.z) > .001,
          `${bench.id} ${reverse ? 'return' : 'out'} stuck at ${JSON.stringify(p)} toward ${JSON.stringify(goal)}`);
        assert.ok(before.y - p.y < .3 && sampleClimbSurface(world, p.x, p.z).slope < 1,
          `${bench.id} has an unsupported step at ${JSON.stringify(p)}`);
      }
      assert.ok(steps < 1000);
    }
  }
});

test('every eastern cave retains its original openings and explicit saves restore on the passage floor', () => {
  const caves = createCaves(groundWithRiver), before = createCaves(groundBeforeVarn);
  for (const cave of caves.filter(c => c.id.startsWith('eastern-'))) {
    const original = before.find(c => c.id === cave.id);
    assert.deepEqual(cave.openings, original.openings, `${cave.id} changed opening coordinates`);
    for (const end of cave.kind === 'chamber' ? [0] : [0, 1]) {
      const s = cave.openings[end] - (end ? .15 : 0), sign = end ? -1 : 1, start = cave.at(s), inside = cave.at(s + sign * .2);
      const p = { ...start, y: world.heightAt(start.x, start.z) }, walk = createLotharnCaveWalk({ caves, ground: groundWithRiver });
      assert.ok(walk.entering(p, inside.x - p.x, inside.z - p.z), `${cave.id} mouth ${end} cannot be entered`);
      for (let along = s + sign * .2; Math.abs(along - s) < 8; along += sign * .2) {
        const target = cave.at(along);
        walk.move(p, target.x - p.x, target.z - p.z); p.y = walk.floorAt(p.x, p.z);
      }
      assert.ok(walk.active);
      const saved = walk.snapshot(), restored = createLotharnCaveWalk({ caves, ground: groundWithRiver });
      assert.ok(restored.restore(saved, p));
      assert.ok(Math.abs(restored.floorAt(p.x, p.z) - p.y) < .001);
      const exit = restored.savedExit(saved);
      assert.ok(exit && Math.abs(exit.y - world.heightAt(exit.x, exit.z)) < .001);
      assert.equal(hexOwnerAt(exit.x, exit.z), 'East Lotharn Mountains');
      // Walk back to the same mouth and through it, retaining support until outside.
      for (let along = restored.along; sign * (along - (s - sign * .6)) >= 0 && restored.active; along -= sign * .1) {
        const target = cave.at(along);
        // A line ending at its upper opening needs a small step past its end to leave ownership.
        if (end && along > cave.length) { const q = cave.at(cave.length - .5); target.x += (target.x - q.x) * 2; target.z += (target.z - q.z) * 2; }
        restored.move(p, target.x - p.x, target.z - p.z);
      }
      assert.equal(restored.active, false, `${cave.id} mouth ${end} did not release floor ownership on return`);
    }
  }
});

test('each eastern doorway acquires cave floor from the outside mouth using the production movement order', () => {
  const caves = createCaves(groundWithRiver);
  for (const cave of caves.filter(c => c.id.startsWith('eastern-'))) for (const end of cave.kind === 'chamber' ? [0] : [0, 1]) {
    const mouth = end ? cave.points.at(-1) : cave.points[0], target = cave.at(cave.openings[end] + (end ? -2 : 2));
    const p = { ...mouth, y: world.heightAt(mouth.x, mouth.z) }, walk = createLotharnCaveWalk({ caves, ground: groundWithRiver });
    for (let i = 0; i < 100 && !walk.active; i++) {
      const distance = Math.hypot(target.x - p.x, target.z - p.z), dx = (target.x - p.x) / distance * .22, dz = (target.z - p.z) / distance * .22;
      // main.js checks entry before applying the outside walking guard.
      if (walk.entering(p, dx, dz)) break;
      const before = { ...p };
      moveCharacter(p, dx, dz, world, .34, { canTraverse: (x, z, nx, nz) => canWalkSlope(x, z, nx, nz, world) });
      p.y = world.heightAt(p.x, p.z);
      assert.ok(Math.hypot(p.x - before.x, p.z - before.z) > .001,
        `${cave.id} mouth ${end} cannot approach its opening from outside: ${JSON.stringify(p)}`);
    }
    assert.ok(walk.active, `${cave.id} mouth ${end} never acquired its floor`);
    for (let i = 0; i < 80 && Math.hypot(target.x - p.x, target.z - p.z) > .05; i++) {
      const distance = Math.hypot(target.x - p.x, target.z - p.z), run = Math.min(.12, distance);
      walk.move(p, (target.x - p.x) / distance * run, (target.z - p.z) / distance * run);
      assert.ok(walk.active, `${cave.id} mouth ${end} prematurely released an incoming traveler`);
      p.y = walk.floorAt(p.x, p.z);
    }
    assert.ok(Math.hypot(target.x - p.x, target.z - p.z) < .06);
    assert.ok(walk.validate(p), `${cave.id} mouth ${end} lost its floor after actual entry`);
  }
});

test('running out of the five eastern cave mouths cannot drop a traveler into Amod', () => {
  for (const rail of CAVE_RAILS) for (let a = 0; a < 360; a += 15) {
    const went = travel(world, { ...rail.mouth, heading: a * Math.PI / 180, speed: 10.5, seconds: 4, dt: 1 / 30 });
    assert.ok(went.damage === 0 && went.worst < 3.5 && went.at.y > world.heightAt(rail.mouth.x, rail.mouth.z) - 6 && hexOwnerAt(went.at.x, went.at.z) === 'East Lotharn Mountains',
      `${rail.id} heading ${a}: ${JSON.stringify(went)}`);
  }
});

test('the shelf rim closes its sharp eastern turn instead of leaving a gap between straight segments', () => {
  const corner = CAVE_BENCHES[1].line.find(p => p.x === -847.460 && p.z === -753.330);
  assert.ok(corner);
  for (const from of [corner, { x: -846, z: -754 }]) for (let a = 0; a < 360; a += 15) {
    const went = travel(world, { ...from, heading: a * Math.PI / 180, speed: 10.5, seconds: 4, dt: 1 / 30 });
    assert.ok(went.damage === 0 && went.worst < 3.5 && went.at.y > world.heightAt(corner.x, corner.z) - 3.5,
      `out of shelf corner on ${a}: ${JSON.stringify(went)}`);
  }
});

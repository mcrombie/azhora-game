import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';
import { sourceModule } from './module-loader.js';
import { canStand, moveCharacter } from '../src/game-state.js';
import { CLOSED_REGIONS, CLOSED_BORDER_LINES, CLOSED_BORDER_COOLDOWN, closedRegionEntered, createBorderWatch } from '../src/closed-border.js';
import { REGION_OUTLINES, SUVAL_ROAD, insideRegion, isLandHex } from '../src/region-world.js';
import { FRONTIER_ROUTE, FRONTIER_GATE, BORDER_CROSSING } from '../src/frontier.js';

const flat = (inside) => (name, x) => name === 'Closed' && inside(x);

test('a move from outside a closed region to inside it is refused; moves within, out of and around it are not', () => {
  assert.deepEqual(CLOSED_REGIONS, ['East Suval']);
  const inside = flat(x => x > 0), closed = ['Closed'];
  assert.equal(closedRegionEntered({ x: -1, z: 0 }, { x: 1, z: 0 }, closed, inside), 'Closed');
  assert.equal(closedRegionEntered({ x: 1, z: 0 }, { x: 2, z: 0 }, closed, inside), null, 'a tester already inside moves about freely');
  assert.equal(closedRegionEntered({ x: 1, z: 0 }, { x: -1, z: 0 }, closed, inside), null, 'leaving is allowed');
  assert.equal(closedRegionEntered({ x: -2, z: 0 }, { x: -1, z: 0 }, closed, inside), null);
  for (const bad of [null, { x: Number.NaN, z: 0 }, { x: 0 }]) assert.equal(closedRegionEntered(bad, { x: 1, z: 0 }, closed, inside), null);
});

test('the traveler is told why, at most once a cooldown, while every refused step is still refused', () => {
  const watch = createBorderWatch({ closed: ['Closed'], inside: flat(x => x > 0) });
  const first = watch.step({ x: -1, z: 0 }, { x: 1, z: 0 }, 10);
  assert.equal(first.refused, true); assert.equal(first.toast, CLOSED_BORDER_LINES[0]); assert.match(first.toast, /Elodi|Elod/);
  const again = watch.step({ x: -1, z: 0 }, { x: 1, z: 0 }, 10.5);
  assert.equal(again.refused, true); assert.equal(again.toast, null, 'no second toast within the cooldown');
  const later = watch.step({ x: -1, z: 0 }, { x: 1, z: 0 }, 10 + CLOSED_BORDER_COOLDOWN);
  assert.equal(later.toast, CLOSED_BORDER_LINES[1], 'the lines vary');
  assert.equal(watch.step({ x: 1, z: 0 }, { x: 2, z: 0 }, 99).refused, false);
  assert.equal(watch.turnedBack, 3);
  for (const line of CLOSED_BORDER_LINES) assert.doesNotMatch(line, /goblin|South Pyros/i);
});

test('entry to East Suval is refused along its whole land border, not only at the road', () => {
  const loop = REGION_OUTLINES['East Suval'][0];
  let checked = 0;
  for (let i = 0; i < loop.length; i++) {
    const a = loop[i], b = loop[(i + 1) % loop.length], length = Math.hypot(b.x - a.x, b.z - a.z);
    const nx = -(b.z - a.z) / length, nz = (b.x - a.x) / length;
    for (let s = 4; s < length - 4; s += 8) {
      const px = a.x + (b.x - a.x) * s / length, pz = a.z + (b.z - a.z) * s / length;
      const sign = insideRegion('East Suval', px + nx * 3, pz + nz * 3) ? -1 : 1;
      const outside = { x: px + nx * sign * 2, z: pz + nz * sign * 2 }, inside = { x: px - nx * sign * 2, z: pz - nz * sign * 2 };
      if (!isLandHex(outside.x, outside.z)) continue;   // the sea needs no rule
      assert.equal(closedRegionEntered(outside, inside), 'East Suval', `entry allowed at ${px.toFixed(0)}, ${pz.toFixed(0)}`);
      assert.equal(closedRegionEntered(inside, outside), null);
      checked++;
    }
  }
  assert.ok(checked > 60, `the whole land border is checked (${checked} crossings)`);
});

test('the branch road now ends before Elod’s shut gate, and walking on into East Suval gets nowhere', async () => {
  const { createWorld } = await sourceModule('../src/world.js');
  const world = createWorld(new THREE.Scene());
  assert.deepEqual(world.suvalRoute, FRONTIER_ROUTE.map(p => ({ x: p.x, z: p.z })));
  for (const point of world.suvalRoute) assert.equal(insideRegion('East Suval', point.x, point.z), false, 'the walkable branch stays in Luscia');
  assert.ok(insideRegion('East Suval', BORDER_CROSSING.x, BORDER_CROSSING.z) && SUVAL_ROAD.some(p => insideRegion('East Suval', p.x, p.z)), 'the road itself still runs on');
  // Holding forward from the approach into the gate: the shut gate stops the traveler on the Luscian side.
  const end = world.suvalRoute.at(-1), walker = { ...end };
  assert.ok(canStand(end.x, end.z, world));
  for (let step = 0; step < 60; step++) moveCharacter(walker, FRONTIER_GATE.u.x * .5, FRONTIER_GATE.u.z * .5, world);
  assert.equal(insideRegion('East Suval', walker.x, walker.z), false);
  assert.ok((walker.x - FRONTIER_GATE.x) * FRONTIER_GATE.u.x + (walker.z - FRONTIER_GATE.z) * FRONTIER_GATE.u.z < 0, 'stopped in front of the gate');
});

test('a traveler set down inside East Suval can walk out of it again, and no picket stops them', async () => {
  const { createWorld } = await sourceModule('../src/world.js');
  const world = createWorld(new THREE.Scene());
  const RADIUS = .45;
  // The module promises it: "Somebody already inside (a tester sent there by the F8 tools, an
  // old save) moves about freely and may leave." The rule allows it; this checks the ground does,
  // because a wall or a ditch that closed the region for real would trap whoever F8 put there.
  const open = point => canStand(point.x, point.z, world, RADIUS) && insideRegion('East Suval', point.x, point.z)
    && [[1, 0], [-1, 0], [0, 1], [0, -1]].every(([dx, dz]) => canStand(point.x + dx, point.z + dz, world, RADIUS));
  const openGroundNear = start => {
    if (open(start)) return start;
    for (let reach = 1; reach <= 40; reach += .5) for (let turn = 0; turn < 48; turn++) {
      const angle = turn / 48 * Math.PI * 2, point = { x: start.x + Math.cos(angle) * reach, z: start.z + Math.sin(angle) * reach };
      if (open(point)) return point;
    }
    return null;
  };
  /** Breadth-first, a metre a step, obeying the ground and the picket, until the outline is behind us. */
  const walkOut = start => {
    const watch = createBorderWatch();
    const seen = new Set(['0,0']);
    let queue = [{ i: 0, j: 0 }], visited = 0;
    const at = (i, j) => ({ x: start.x + i, z: start.z + j });
    while (queue.length && visited < 120000) {
      const next = [];
      for (const node of queue) {
        visited++;
        const here = at(node.i, node.j);
        if (!insideRegion('East Suval', here.x, here.z)) return { out: here, refused: watch.turnedBack, visited };
        const groundHere = world.heightAt(here.x, here.z);
        for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const i = node.i + di, j = node.j + dj, id = `${i},${j}`;
          if (seen.has(id)) continue;
          seen.add(id);
          const point = at(i, j);
          if (Math.abs(i) > 700 || Math.abs(j) > 700) continue;
          if (!canStand(point.x, point.z, world, RADIUS)) continue;
          if (Math.abs(world.heightAt(point.x, point.z) - groundHere) > 1.4) continue;
          if (watch.step(here, point).refused) continue;
          next.push({ i, j });
        }
      }
      queue = next;
    }
    return null;
  };
  for (const [where, spot] of [['the roofless waystation', { x: -273, z: 557 }], ['Elod, inside its walls', { x: -50, z: 641 }],
    ['Sevenwalls', { x: -205, z: 690 }], ['the dry hills', { x: -146, z: 858 }], ['Sorrow Beach', { x: 82, z: 800 }]]) {
    const start = openGroundNear(spot);
    assert.ok(start, `${where}: no open ground inside East Suval to start from`);
    const escape = walkOut(start);
    assert.ok(escape, `${where}: a traveler at ${start.x.toFixed(0)}, ${start.z.toFixed(0)} cannot walk out of East Suval`);
    assert.equal(escape.refused, 0, `${where}: the picket turned back ${escape.refused} steps of somebody who was only leaving`);
    assert.equal(insideRegion('East Suval', escape.out.x, escape.out.z), false);
  }
});

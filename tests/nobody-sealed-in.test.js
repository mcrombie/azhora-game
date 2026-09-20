import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';
import { sourceModule } from './module-loader.js';
import { canStand } from '../src/game-state.js';
import { BODY } from '../src/bodies.js';

/**
 * Every other check on the people of this world is local: the ground under them holds a body, and
 * there is standable ground in a ring around them. A person sealed inside a small pocket passes
 * both — their ring is in the pocket with them — and still cannot be reached from anywhere.
 *
 * So this asks the other question. From where each person stands, flood the standable ground
 * outward and see whether it ever gets twenty-five metres away. Open country escapes in a few
 * hundred cells; a sealed pocket closes.
 */
const { createWorld } = await sourceModule('../src/world.js');
const world = createWorld(new THREE.Scene());
const RADIUS = BODY.traveler;

/** Does the standable ground around `point` reach `escape` metres away? */
function opensOut(point, { step = .5, escape = 25, budget = 12000 } = {}) {
  const span = escape + 2, columns = Math.ceil(span * 2 / step) + 1;
  const originX = point.x - span, originZ = point.z - span;
  const at = index => ({ x: originX + (index % columns) * step, z: originZ + Math.floor(index / columns) * step });
  const seen = new Uint8Array(columns * columns);
  let first = -1;
  for (let reach = 0; reach <= 3 && first < 0; reach += step) for (let turn = 0; turn < 32; turn++) {
    const angle = turn / 32 * Math.PI * 2, spot = { x: point.x + Math.cos(angle) * reach, z: point.z + Math.sin(angle) * reach };
    if (canStand(spot.x, spot.z, world, RADIUS)) { first = Math.round((spot.z - originZ) / step) * columns + Math.round((spot.x - originX) / step); break; }
  }
  if (first < 0) return { open: false, cells: 0, why: 'there is no standable ground within three metres of them' };
  const queue = [first]; seen[first] = 1;
  let cells = 0;
  while (queue.length) {
    if (++cells > budget) return { open: true, cells };
    const index = queue.pop(), spot = at(index);
    if (Math.hypot(spot.x - point.x, spot.z - point.z) >= escape) return { open: true, cells };
    const column = index % columns;
    for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nextColumn = column + dc, next = index + dc + dr * columns;
      if (nextColumn < 0 || nextColumn >= columns || next < 0 || next >= seen.length || seen[next]) continue;
      seen[next] = 1;
      const neighbour = at(next);
      if (canStand(neighbour.x, neighbour.z, world, RADIUS)) queue.push(next);
    }
  }
  return { open: false, cells, why: `the ground closes around them after ${cells} cells` };
}

// Ammi Tal stands in a ten-square-metre pocket at Sevenwalls, walled by scattered props, three
// huts, a cistern and a terrace. Measured and written up in docs/known-issues.md; where she
// should stand instead is a staging choice, so it is not guessed at here.
const SEALED_IN = new Set(['suval-terrace-farmer']);

test('nobody the world places is sealed into a pocket they cannot be reached in', () => {
  const people = Object.entries(world.npcPositions);
  assert.ok(people.length > 140, `only ${people.length} people placed`);
  const stuck = [];
  for (const [id, place] of people) {
    const ground = opensOut(place);
    if (SEALED_IN.has(id)) {
      // Still wrong, and named rather than guessed at. When somebody moves her this fails, which
      // is the reminder to take her out of SEALED_IN and out of docs/known-issues.md.
      assert.equal(ground.open, false, `${id} can be reached now; drop them from SEALED_IN and from docs/known-issues.md`);
      continue;
    }
    if (!ground.open) stuck.push(`${id} at ${place.x.toFixed(0)}, ${place.z.toFixed(0)} in ${world.regionAt(place.x, place.z)?.name}: ${ground.why}`);
  }
  assert.deepEqual(stuck, []);
});

test('the rule that keeps props off a stand does not pretend to keep the way out clear', () => {
  // keepPropsClear removes a prop whose centre is within its own radius plus eight tenths of a
  // metre of somewhere somebody stands. That is the spot, not the path. Around Ammi there are
  // scattered props inside nine metres and it reaches none of them; the nearest it cannot reach
  // is under a metre away. Widening it is not the repair: the densest stands in the game carry
  // several hundred props inside nine metres and open out perfectly well, so a bigger clearance
  // would strip scenery everywhere to mend one place.
  const her = world.npcPositions['suval-terrace-farmer'];
  assert.ok(her, 'Ammi Tal is still placed at Sevenwalls');
  const props = world.colliders.filter(collider => collider.kind === 'prop' && Math.hypot(collider.x - her.x, collider.z - her.z) < 9);
  assert.ok(props.length > 50, `only ${props.length} props near her; the ground there has changed`);
  const reached = props.filter(collider => Math.hypot(collider.x - her.x, collider.z - her.z) < (collider.r ?? 0) + .8);
  assert.deepEqual(reached, [], 'keepPropsClear now reaches some of them, so the measurement in docs/known-issues.md is stale');
  // And the densest stands are not the sealed ones, which is the point.
  const densest = Object.entries(world.npcPositions).map(([id, place]) => ({ id,
    props: world.colliders.filter(c => c.kind === 'prop' && Math.hypot(c.x - place.x, c.z - place.z) < 9).length, place }))
    .sort((a, b) => b.props - a.props)[0];
  assert.ok(densest.props > props.length, `the densest stand has ${densest.props} props, no more than Ammi's ${props.length}`);
  assert.equal(opensOut(densest.place).open, true, `${densest.id} is the densest stand in the game and is sealed as well`);
});

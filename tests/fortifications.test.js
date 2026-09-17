import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';
import { sourceModule } from './module-loader.js';
import { canStand, moveCharacter } from '../src/game-state.js';
import { FORT_STANDARD, fortCircuit, longestTowerGap } from '../src/fortification.js';
import { OUTPOST_CIRCUIT, STOCKADE_CIRCUIT, MAIN_GATE_ALONG, OUTPOST_ROAD, OUTPOST_CENTRE, campPoint } from '../src/outpost.js';
import { FRONTIER_CIRCUIT, LUSCIA_BORDER } from '../src/frontier.js';
import { LEGION_POSTS } from '../src/legion-posts.js';
import { MOROS_GATE_ID, MOROS_LEGATE_ID } from '../src/moros-chapter.js';

const { createWorld } = await sourceModule('../src/world.js');
const world = createWorld(new THREE.Scene());

/** Nobody stands on a circuit's wall line except in its gates, and each gate can be walked from beyond the ditch to inside. */
function assertClosed(circuit, { gatesOpen = true } = {}) {
  const samples = circuit.wallLine(2);
  assert.ok(samples.length > 10, `${circuit.id} has a wall line`);
  for (const sample of samples) {
    if (sample.gate && gatesOpen) continue;
    assert.equal(canStand(sample.x, sample.z, world), false, `${circuit.id}: the wall can be stood on at ${sample.x.toFixed(1)}, ${sample.z.toFixed(1)} (edge ${sample.edge}, ${sample.at.toFixed(1)} m)`);
  }
  // Between samples too: a traveler pressing along the wall line's outside cannot slip through anywhere but a gate.
  for (const gate of circuit.gates) {
    const { from, to } = circuit.passage(gate.id), walker = { ...from };
    assert.ok(canStand(from.x, from.z, world), `${gate.id}: the causeway beyond the ditch has footing`);
    moveCharacter(walker, to.x - walker.x, to.z - walker.z, world);
    if (gatesOpen) assert.ok(Math.hypot(walker.x - to.x, walker.z - to.z) < .05, `${gate.id} can be walked end to end`);
    else assert.ok(Math.hypot(walker.x - to.x, walker.z - to.z) > 3, `${gate.id} is shut`);
  }
}

test('both sides build to one standard: a 4.5 to 5 m wall with a wall walk, towers a storey above it, 4 to 5 m gates and a 3 to 4 m ditch', () => {
  assert.ok(FORT_STANDARD.wallHeight >= 4.5 && FORT_STANDARD.wallHeight <= 5);
  assert.ok(FORT_STANDARD.walkHeight > 2.5 && FORT_STANDARD.walkHeight < FORT_STANDARD.wallHeight - 1.2, 'the parapet stands above the wall walk');
  assert.ok(FORT_STANDARD.towerPlatform >= FORT_STANDARD.walkHeight + 2.5, 'towers are a storey above the wall walk');
  assert.ok(FORT_STANDARD.towerProjection > 0, 'towers project to cover the wall face');
  assert.ok(FORT_STANDARD.gateWidth >= 4 && FORT_STANDARD.gateWidth <= 5);
  assert.ok(FORT_STANDARD.ditchWidth >= 3 && FORT_STANDARD.ditchWidth <= 4);
  assert.ok(FORT_STANDARD.towerSpacing.max <= 45);
  // A square circuit laid out by the standard puts a tower at each corner and a pair at its gate.
  const square = fortCircuit({ id: 'square', corners: [{ x: 0, z: 0 }, { x: 40, z: 0 }, { x: 40, z: 40 }, { x: 0, z: 40 }], gates: [{ id: 'g', edge: 0, at: 20 }] });
  assert.equal(square.towers.length, 6);
  assert.equal(square.gates[0].halfWidth * 2, FORT_STANDARD.gateWidth);
  assert.ok(square.inside(20, 20) && !square.inside(60, 20));
});

test('the Ambroni outpost is a real fort: two gates, towers at every corner and each gate, no stretch of wall over 45 m', () => {
  assert.equal(OUTPOST_CIRCUIT.gates.length, 2, 'two gates, no more');
  assert.deepEqual(OUTPOST_CIRCUIT.gates.map(gate => gate.kind).sort(), ['main', 'rear']);
  const corners = OUTPOST_CIRCUIT.towers.filter(tower => tower.kind === 'corner'), gateTowers = OUTPOST_CIRCUIT.towers.filter(tower => tower.kind === 'gate');
  assert.equal(corners.length, OUTPOST_CIRCUIT.corners.length);
  assert.equal(gateTowers.length, 4);
  assert.ok(longestTowerGap(OUTPOST_CIRCUIT) <= FORT_STANDARD.towerSpacing.max, `the longest stretch between towers is ${longestTowerGap(OUTPOST_CIRCUIT).toFixed(1)} m`);
  assert.ok(OUTPOST_CIRCUIT.perimeter > 250, `a fort for a legion's outpost, not a pen: ${OUTPOST_CIRCUIT.perimeter.toFixed(0)} m of wall`);
  // The main road runs through both gates.
  for (const gate of OUTPOST_CIRCUIT.gates) {
    const road = world.paths[0];
    let nearest = Infinity;
    for (let i = 1; i < road.length; i++) {
      const a = road[i - 1], b = road[i], dx = b.x - a.x, dz = b.z - a.z, t = Math.max(0, Math.min(1, ((gate.centre.x - a.x) * dx + (gate.centre.z - a.z) * dz) / (dx * dx + dz * dz)));
      nearest = Math.min(nearest, Math.hypot(gate.centre.x - a.x - dx * t, gate.centre.z - a.z - dz * t));
    }
    assert.ok(nearest < .5, `${gate.id} stands on the road`);
  }
});

test('the outpost circuit is closed: its wall line cannot be stood on except in the gate passages, which can be walked end to end', () => {
  assertClosed(OUTPOST_CIRCUIT);
  // The ditch runs outside the whole wall but for the causeways.
  const S = OUTPOST_CIRCUIT.standard, middle = S.wallThickness / 2 + S.berm + S.ditchWidth / 2;
  for (const edge of OUTPOST_CIRCUIT.edges) for (let at = 3; at < edge.length - 3; at += 2) {
    const gate = OUTPOST_CIRCUIT.gates.find(g => g.edge === edge.index && Math.abs(at - g.at) < S.causewayHalf + S.ditchWidth);
    if (gate) continue;
    const spot = OUTPOST_CIRCUIT.pointOn(edge, at, middle);
    assert.equal(canStand(spot.x, spot.z, world), false, `the ditch is open at edge ${edge.index}, ${at} m`);
  }
});

test('the ground north round to east of the main gate is clear of new colliders for 70 m beyond the gate’s own ditch', () => {
  const gate = OUTPOST_CIRCUIT.gates.find(g => g.kind === 'main'), S = OUTPOST_CIRCUIT.standard;
  const ditchEdge = MAIN_GATE_ALONG + S.wallThickness / 2 + S.berm + S.ditchWidth;
  const scatter = new Set(['region-tree', 'ridge-rock']);
  for (const c of world.colliders) {
    if (scatter.has(c.kind)) continue;
    const dx = c.x - gate.centre.x, dz = c.z - gate.centre.z, distance = Math.hypot(dx, dz);
    if (distance > 70) continue;
    const bearing = Math.atan2(dx, -dz);   // 0 north, +pi/2 east
    if (bearing < -.01 || bearing > Math.PI / 2 + .01) continue;
    const along = (c.x - OUTPOST_CENTRE.x) * OUTPOST_ROAD.east.x + (c.z - OUTPOST_CENTRE.z) * OUTPOST_ROAD.east.z;
    assert.ok(along - (c.r ?? Math.hypot(c.hx, c.hz)) <= ditchEdge + .01, `${c.kind} stands in the fight ground north-east of the gate at ${c.x.toFixed(1)}, ${c.z.toFixed(1)}`);
  }
  // The gate's guards, the Legate and the quartermaster keep their places, on open ground.
  for (const id of [MOROS_GATE_ID, 'post-camp-gate-south', MOROS_LEGATE_ID, 'post-camp-stores']) {
    const post = LEGION_POSTS.find(entry => entry.id === id);
    assert.ok(canStand(post.x, post.z, world, .45), `${id} has footing`);
  }
  // The guards stand just beyond the ditch in front of the gate.
  const guard = LEGION_POSTS.find(entry => entry.id === MOROS_GATE_ID);
  const guardAlong = (guard.x - OUTPOST_CENTRE.x) * OUTPOST_ROAD.east.x + (guard.z - OUTPOST_CENTRE.z) * OUTPOST_ROAD.east.z;
  assert.ok(guardAlong > ditchEdge, 'the gate guards stand beyond the ditch');
  assert.ok(Math.hypot(campPoint(0, 0).x - OUTPOST_CENTRE.x, campPoint(0, 0).z - OUTPOST_CENTRE.z) < 1e-9);
});

test('the forward stockade is a smaller work to the same pattern: one gate, corner towers, a ditch and a wall walk', () => {
  assert.equal(STOCKADE_CIRCUIT.gates.length, 1);
  assert.equal(STOCKADE_CIRCUIT.towers.filter(tower => tower.kind === 'corner').length, 4);
  assert.ok(STOCKADE_CIRCUIT.standard.walkHeight === FORT_STANDARD.walkHeight && STOCKADE_CIRCUIT.standard.wallHeight === FORT_STANDARD.wallHeight, 'the same heights');
  assert.equal(STOCKADE_CIRCUIT.standard.ditchWidth, FORT_STANDARD.ditchWidth, 'the same ditch');
  assertClosed(STOCKADE_CIRCUIT);
  assert.ok(world.colliders.some(c => c.kind === 'truce-pole'), 'the truce-flag pole stands inside');
});

test('Elod’s frontier runs in stone from the southern hills to the sea, closing on the border at both ends, its gate shut', () => {
  assert.equal(FRONTIER_CIRCUIT.open, true);
  assert.deepEqual(FRONTIER_CIRCUIT.corners[0], LUSCIA_BORDER[0], 'it starts on the border in the hills');
  assert.deepEqual(FRONTIER_CIRCUIT.corners.at(-1), LUSCIA_BORDER.at(-1), 'it ends on the border by the sea');
  assert.equal(FRONTIER_CIRCUIT.gates.length, 1);
  assert.ok(FRONTIER_CIRCUIT.towers.filter(tower => tower.kind === 'gate').length === 2, 'two towers flank the gate');
  assertClosed(FRONTIER_CIRCUIT, { gatesOpen: false });
});

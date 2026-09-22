import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';
import { sourceModule } from './module-loader.js';
import { canStand } from '../src/game-state.js';
import { BODY } from '../src/bodies.js';
import { MERCENARY_ROSTER, createMercenaryCompany } from '../src/mercenaries.js';
import { ANCHORS } from '../src/regions.js';
import { WORD_BEACH, WORD_ASHORE } from '../src/word-arrival.js';
import { TIDEHAVEN_SMITHY } from '../src/region-world.js';
import { OUTPOST_LAYOUT } from '../src/outpost.js';
import { AMBRON_FORGE } from '../src/ambron.js';

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
  // The three smiths are placed by the host rather than by the world, so they are not in
  // `world.npcPositions` at build time and this would never have looked at any of them.
  const people = [...Object.entries(world.npcPositions),
    ['tidehaven-smith', TIDEHAVEN_SMITHY.stand], ['moros-armourer', OUTPOST_LAYOUT.armourer],
    ['ambron-armourer', AMBRON_FORGE.stand]];
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

/**
 * The company is the one set of people the world does not place. Ten hired swords walk the main
 * road on their own clock, and src/main.js moves each man's home every frame; the steering loop
 * then walks him to it. A home in the sea is a man who never arrives at it.
 */
const company = createMercenaryCompany({
  road: world.paths[0],
  stops: [{ id: 'induction', point: world.npcPositions['meadow-courier'], dwell: 90 },
    { id: 'crossing', point: world.npcPositions['crossing-keeper'], dwell: 60 },
    { id: 'relay', point: world.npcPositions['relay-clerk'], dwell: 120 }].filter(stop => stop.point),
  muster: ANCHORS.legionCamp, landing: world.spawn, shore: WORD_BEACH, seed: 0,
  standable: (x, z) => canStand(x, z, world, BODY.person),
});

/** The height canStand wants under a body, from src/game-state.js. Below it is water. */
const WALKABLE = .45;

/**
 * They used to wait in a ring around the traveler's own spawn, at 2.2 + index * 0.3 metres, and
 * that spawn is on a pier three metres wide: nothing wider than 1.7 m fits on it, so five of the
 * ten stood on the harbour floor five and a half metres under the water, for as long as ninety
 * seconds at a time. (`hidden` is set only for the `coming` phase, so a man in `landing` is
 * drawn and steered.) They queue down the pier now - LANDING_QUEUE in src/mercenaries.js.
 *
 * This was the tripwire that asserted somebody was *still* wet. It is turned over: the ring
 * still does not fit, and there is no longer anybody standing in it.
 */
test('the hired swords wait on the boards, and the ring that would not fit is gone', () => {
  let widest = 0;
  for (let radius = 0; radius <= 12; radius += .1) {
    let whole = true;
    for (let turn = 0; turn < 64 && whole; turn++) {
      const angle = turn / 64 * Math.PI * 2;
      whole = canStand(world.spawn.x + Math.sin(angle) * radius, world.spawn.z + Math.cos(angle) * radius, world, BODY.person);
    }
    if (!whole) break;
    widest = radius;
  }
  // The pier has not changed. What changed is that nobody is put in a ring on it.
  assert.ok(widest < 2.2, `a ${widest.toFixed(1)}m ring fits around the landing now, which it never did before`);

  const wet = new Map(), landed = new Set(), seen = new Set();
  for (let t = 0; t <= 25000; t += 5) for (const placement of company.placements(t)) {
    // Nobody is drawn or steered before they arrive, so where they would have stood is nothing.
    if (placement.phase === 'coming') continue;
    seen.add(placement.phase);
    if (placement.phase === 'landing') landed.add(placement.id);
    const height = world.heightAt(placement.x, placement.z);
    if (height >= WALKABLE || wet.has(placement.id)) continue;
    wet.set(placement.id, `${placement.id} ${placement.phase} at ${placement.x.toFixed(1)}, ${placement.z.toFixed(1)} on ground ${height.toFixed(2)} high`);
  }
  assert.deepEqual([...landed].sort(), MERCENARY_ROSTER.map(m => m.id).sort(), 'the sweep never saw somebody land');
  assert.deepEqual([...seen].sort(), ['landing', 'mustered', 'stopped', 'walking'], 'the sweep saw every phase a man is drawn in');
  assert.deepEqual([...wet.values()], [], 'nobody the company places stands in water, in any phase');
});

/**
 * The other half of the same question, and the one the old test could not ask while five of them
 * were in the sea: is the ground under a man ground a body can actually stand on? Height alone
 * would let him stand inside a bollard. This walks the whole clock and asks `canStand` of every
 * placement in every phase he is drawn in.
 */
test('every man the company places is on ground a body can stand on', () => {
  // Counted by phase, because the phases are not alike. A walking man's home moves every frame
  // and he is past an obstacle in a second; a waiting, stopped or mustered man holds his place
  // for a minute or more, is drawn and steered the whole time, and if he cannot reach it he
  // spends the dwell walking on the spot against a hedge.
  const seen = {}, blocked = {}, examples = {};
  let checked = 0;
  for (let t = 0; t <= 25000; t += 5) for (const placement of company.placements(t)) {
    if (placement.phase === 'coming') continue;
    checked++;
    seen[placement.phase] = (seen[placement.phase] ?? 0) + 1;
    if (canStand(placement.x, placement.z, world, BODY.person)) continue;
    blocked[placement.phase] = (blocked[placement.phase] ?? 0) + 1;
    (examples[placement.phase] ??= []).push(`${placement.id} at ${placement.x.toFixed(1)}, ${placement.z.toFixed(1)} ` +
      `(ground ${world.heightAt(placement.x, placement.z).toFixed(2)}) at ${t}s`);
  }
  assert.ok(checked > 40000, `only ${checked} placements checked`);
  assert.ok(seen.landing > 400 && seen.stopped > 400 && seen.walking > 1000 && seen.mustered > 1000,
    `the sweep saw ${JSON.stringify(seen)}`);
  // The three that are held for a long time must be zero, and the message names the phase.
  for (const phase of ['landing', 'stopped', 'mustered'])
    assert.deepEqual(examples[phase]?.slice(0, 4) ?? [], [],
      `${blocked[phase]} of ${seen[phase]} ${phase} placements are inside scenery`);
  // Walking is a different matter, and worth saying plainly rather than asserting away: the home
  // moves along the road every frame with a lateral offset of up to 4.6 m, and now and then that
  // lands in a hedge for a moment. He never stands in it - src/main.js steers him with
  // `stepAround`, which goes through `moveCharacter` and stops him beside the thing. A ceiling,
  // then, not a zero: if it climbs, the scatter has moved into the road and somebody should look.
  const share = (blocked.walking ?? 0) / seen.walking;
  assert.ok(share < .05, `${blocked.walking} of ${seen.walking} walking placements (${(share * 100).toFixed(1)}%) are inside scenery`);
});

test('a stopped man is moved to ground he can reach, and nobody else moves at all', () => {
  // He holds his place for 60, 90 or 120 seconds. One in six of them used to be a hedge, and of
  // those, twelve were close enough that the host never stopped steering him: `pace` stayed above
  // the tenth of a metre that ends the walk, so he marched on the spot against it for the whole
  // dwell, in Nothom square and at the crossing. The company moves such a place once, when
  // the formation is laid, to the nearest ground in half-metre rings - deterministic, so it is
  // the same in every save.
  const plain = createMercenaryCompany({
    road: world.paths[0],
    stops: [{ id: 'induction', point: world.npcPositions['meadow-courier'], dwell: 90 },
      { id: 'crossing', point: world.npcPositions['crossing-keeper'], dwell: 60 },
      { id: 'relay', point: world.npcPositions['relay-clerk'], dwell: 120 }].filter(stop => stop.point),
    muster: ANCHORS.legionCamp, landing: world.spawn, shore: WORD_BEACH, seed: 0,
  });
  let moved = 0, others = 0, furthest = 0;
  for (let t = 0; t <= 25000; t += 5) {
    const was = plain.placements(t), is = company.placements(t);
    for (let i = 0; i < was.length; i++) {
      const shift = Math.hypot(was[i].x - is[i].x, was[i].z - is[i].z);
      if (shift < 1e-9) continue;
      if (was[i].phase === 'stopped') { moved++; furthest = Math.max(furthest, shift); } else others++;
    }
  }
  assert.ok(moved > 0, 'some stopped man was standing in something');
  assert.equal(others, 0, 'and nothing but a stopped place was touched');
  assert.ok(furthest <= 6.01, `the furthest anybody was moved is ${furthest.toFixed(2)} m`);
  // Deterministic: the same company, built twice, lays the same formation.
  const again = createMercenaryCompany({
    road: world.paths[0],
    stops: [{ id: 'induction', point: world.npcPositions['meadow-courier'], dwell: 90 },
      { id: 'crossing', point: world.npcPositions['crossing-keeper'], dwell: 60 },
      { id: 'relay', point: world.npcPositions['relay-clerk'], dwell: 120 }].filter(stop => stop.point),
    muster: ANCHORS.legionCamp, landing: world.spawn, shore: WORD_BEACH, seed: 0,
    standable: (x, z) => canStand(x, z, world, BODY.person),
  });
  for (const t of [1500, 1900, 4000]) assert.deepEqual(again.placements(t), company.placements(t), `at ${t}s`);
  // And without the predicate the formation is exactly what it always was: the sweep above
  // compared every placement of both, and only stopped ones differed.
});

/** And Ed the Word, whom the sea put down, waits on his own strand rather than on the boards. */
test('the man the sea landed waits where the sea landed him', () => {
  const waiting = company.placements(WORD_ASHORE + 60).find(p => p.id === 'merc-word');
  assert.equal(waiting.phase, 'landing');
  assert.deepEqual([waiting.x, waiting.z], [WORD_BEACH.x, WORD_BEACH.z]);
  assert.ok(canStand(waiting.x, waiting.z, world, BODY.person), 'and it is ground he can stand on');
  assert.ok(Math.hypot(waiting.x - world.spawn.x, waiting.z - world.spawn.z) > 8, 'nowhere near the boats');
});

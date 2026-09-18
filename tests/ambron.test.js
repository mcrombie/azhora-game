import test from 'node:test';
import assert from 'node:assert/strict';
import { sourceModule } from './module-loader.js';
import * as THREE from '../vendor/three.module.js';
import { canStand, moveCharacter } from '../src/game-state.js';
import { AMBRON, ambronPoint, WORLD_BOUNDS, SOLIS } from '../src/region-world.js';
import { SOLIS_CIRCUIT } from '../src/west-suval.js';
import { FORT_STANDARD, longestTowerGap } from '../src/fortification.js';
import {
  AMBRON_STANDARD, AMBRON_CIRCUIT, AMBRON_GATES, AMBRON_LAND_GATES, AMBRON_WATER_GATES, AMBRON_BUILDINGS,
  ambronLocal,
  AMBRON_OUTSIDE, AMBRON_STREETS, AMBRON_QUAYS, AMBRON_STANDS, AMBRON_ENCLOSURE, AMBRON_CHAIN, AMBRON_MARKET,
  CAUSEWAY, CHANNEL, ambronDeckHeight, cityGround,
} from '../src/ambron.js';
import {
  AMBRON_NPCS, ELAGOS_NPCS, ELAGOS_AMBIENT, ELAGOS_NPC_POSITIONS, elagosConversation, isElagosNpc,
  AMBRON_SPECIALISTS, SPECIALIST_IDS, TALKING_TREE_QUEST, TALKING_TREE_LINES,
} from '../src/ambron-people.js';
import { elagosWaterDistance, AMBRON_ROAD } from '../src/elagos-world.js';
import { RIDE } from '../src/riding.js';

const { createWorld } = await sourceModule('../src/world.js');
const world = createWorld(new THREE.Scene());
const P = ambronPoint;
const WALKER = .45;

/** The world with only the colliders near Ambron: a fine grid over the city stays quick. */
const nearAmbron = (() => {
  const reach = 220;
  const colliders = world.colliders.filter(c => Math.abs(c.x - AMBRON.centre.x) < reach && Math.abs(c.z - AMBRON.centre.z) < reach);
  return { bounds: world.bounds, heightAt: world.heightAt, colliders };
})();

test('Ambron is built to the shared fortification standard, at the measures of a capital', () => {
  assert.ok(AMBRON_STANDARD.wallHeight > FORT_STANDARD.wallHeight, 'a higher wall than an outpost');
  assert.ok(AMBRON_STANDARD.wallThickness >= FORT_STANDARD.wallThickness, 'and a thicker one');
  assert.ok(AMBRON_STANDARD.towerPlatform - AMBRON_STANDARD.wallHeight >= 2.5, 'towers stand a storey above the wall');
  assert.ok(AMBRON_STANDARD.gateWidth >= 4 && AMBRON_STANDARD.gateWidth <= 6, 'gates wide enough for a cart');
  assert.ok(AMBRON_STANDARD.ditchWidth >= 4, 'a ditch outside');
  // Bigger and older than Solis: longer circuit, more ground, more towers, more buildings.
  const solisPerimeter = 4 * (SOLIS_CIRCUIT.halfA + SOLIS_CIRCUIT.halfB);
  assert.ok(AMBRON_CIRCUIT.perimeter > solisPerimeter * 1.6, `${AMBRON_CIRCUIT.perimeter.toFixed(0)} m of circuit against Solis's ${solisPerimeter.toFixed(0)}`);
  assert.ok(AMBRON.halfA * AMBRON.halfB > SOLIS.halfX * SOLIS.halfZ * 2.5, 'and three times the ground');
  assert.ok(AMBRON_CIRCUIT.towers.length >= 20, `${AMBRON_CIRCUIT.towers.length} towers`);
  assert.equal(AMBRON_CIRCUIT.towers.filter(tower => tower.kind === 'corner').length, 4, 'a tower at every corner');
  for (const gate of AMBRON_GATES) assert.equal(AMBRON_CIRCUIT.towers.filter(tower => tower.id.startsWith(`${gate.id}-tower`)).length, 2, `${gate.name} has two flanking towers`);
  // No curtain run goes far uncovered, once the two water gates (which are water, not wall) are set aside.
  const along = tower => { let before = 0; for (let i = 0; i < tower.edge; i++) before += AMBRON_CIRCUIT.edges[i].length; return before + tower.at; };
  const positions = AMBRON_CIRCUIT.towers.map(along).sort((a, b) => a - b);
  const gaps = positions.map((p, i) => (i + 1 < positions.length ? positions[i + 1] : positions[0] + AMBRON_CIRCUIT.perimeter) - p);
  const water = gaps.filter(gap => gap > 46);
  assert.equal(water.length, AMBRON_WATER_GATES.length, 'the only long gaps are the two water gates');
  assert.ok(Math.max(...gaps.filter(gap => gap <= 46)) <= AMBRON_STANDARD.towerSpacing.max, 'and every run of wall is covered');
  assert.ok(longestTowerGap(AMBRON_CIRCUIT) === Math.max(...gaps));
  const counts = AMBRON_BUILDINGS.length + AMBRON_OUTSIDE.length;
  assert.ok(counts >= 26, `${counts} buildings inside the walls and out`);
  assert.ok(world.elagosMetrics.buildings >= 26, 'and the scenery built them');
});

test('the walls of Ambron are a closed circuit: the four land gates are the only way in, and each can be walked', () => {
  const passages = AMBRON_LAND_GATES.map(gate => AMBRON_CIRCUIT.gates.find(entry => entry.id === gate.id));
  let samples = 0, blocked = 0;
  for (const edge of AMBRON_CIRCUIT.edges) {
    for (let at = 1; at < edge.length; at += 2) {
      const gate = AMBRON_CIRCUIT.gates.find(g => g.edge === edge.index && Math.abs(at - g.at) <= g.halfWidth + .6);
      for (const depth of [-AMBRON_STANDARD.wallThickness / 2 + .2, 0, AMBRON_STANDARD.wallThickness / 2 - .2]) {
        const spot = AMBRON_CIRCUIT.pointOn(edge, at, depth);
        samples++;
        if (gate) continue;
        if (canStand(spot.x, spot.z, world, WALKER)) blocked++;
      }
    }
  }
  assert.ok(samples > 500, `${samples} samples of the wall line`);
  assert.equal(blocked, 0, 'nobody stands on the wall line except in a gate');
  // The two water gates are water: nobody walks through them either.
  for (const gate of AMBRON_WATER_GATES) {
    const entry = AMBRON_CIRCUIT.gates.find(g => g.id === gate.id);
    for (const across of [-16, -8, 0, 8, 16]) {
      const spot = { x: entry.centre.x + entry.along.x * across, z: entry.centre.z + entry.along.z * across };
      assert.equal(canStand(spot.x, spot.z, world, WALKER), false, `${gate.name} is water, not a way in`);
    }
  }
  // Each land gate can be walked end to end with the real movement rule.
  for (const gate of passages) {
    const passage = AMBRON_CIRCUIT.passage(gate.id), walker = { ...passage.from };
    for (let frame = 0; frame < 900 && Math.hypot(walker.x - passage.to.x, walker.z - passage.to.z) > .4; frame++) {
      const dx = passage.to.x - walker.x, dz = passage.to.z - walker.z, d = Math.hypot(dx, dz), step = Math.min(d, .15);
      moveCharacter(walker, dx / d * step, dz / d * step, nearAmbron, WALKER);
    }
    assert.ok(Math.hypot(walker.x - passage.to.x, walker.z - passage.to.z) <= .4,
      `${gate.id} can be walked end to end; stopped at ${walker.x.toFixed(1)}, ${walker.z.toFixed(1)}`);
    // And a rider can take the gate the road comes to.
    if (gate.id === 'plain-gate') assert.ok(canStand(gate.centre.x, gate.centre.z, world, RIDE.radius), 'a rider passes the Plain Gate');
  }
});

test('the narrows runs through the city, and the causeway is the only way over it', () => {
  // The channel is water inside the walls, from wall to wall.
  for (let b = -AMBRON.halfB + 2; b <= AMBRON.halfB - 2; b += 4) {
    const spot = P(0, b);
    if (Math.abs(b - CAUSEWAY.b) <= CAUSEWAY.halfWidth) continue;
    assert.ok(elagosWaterDistance(spot.x, spot.z) < 0, `the narrows is water at b=${b}`);
    assert.equal(canStand(spot.x, spot.z, world, WALKER), false, `and nobody walks it at b=${b}`);
  }
  // The causeway carries the main street across, at one level between its piers.
  for (let a = -CAUSEWAY.level; a <= CAUSEWAY.level; a += 5) {
    const spot = P(a, CAUSEWAY.b);
    assert.equal(world.heightAt(spot.x, spot.z), CAUSEWAY.deckY, `the deck is level at a=${a}`);
    assert.ok(canStand(spot.x, spot.z, world, WALKER), `the deck carries a traveler at a=${a}`);
  }
  assert.ok(CAUSEWAY.deckY - CHANNEL.surface >= 2.8, 'with headroom for a barge under it');
  // The deck ramps to the made ground of each bank rather than stepping off it.
  for (const side of [-1, 1]) {
    const foot = P(side * CAUSEWAY.foot, CAUSEWAY.b);
    assert.ok(Math.abs(ambronDeckHeight(foot.x, foot.z) - cityGround(side * CAUSEWAY.foot)) < .01, 'the ramp meets the bank');
  }
  assert.equal(ambronDeckHeight(P(0, 12).x, P(0, 12).z), null, 'and the deck is only as wide as the street');
  // Walk it: east bank to west bank, the whole way.
  const walker = { ...P(36, CAUSEWAY.b) }, target = P(-36, CAUSEWAY.b);
  for (let frame = 0; frame < 1400 && Math.hypot(walker.x - target.x, walker.z - target.z) > .5; frame++) {
    const dx = target.x - walker.x, dz = target.z - walker.z, d = Math.hypot(dx, dz), step = Math.min(d, .15);
    moveCharacter(walker, dx / d * step, dz / d * step, nearAmbron, WALKER);
  }
  assert.ok(Math.hypot(walker.x - target.x, walker.z - target.z) <= .5, `the causeway is crossed; stopped at ${walker.x.toFixed(1)}, ${walker.z.toFixed(1)}`);
});

test('the chain hangs in the south water gate, over the water and under nothing', () => {
  const gate = AMBRON_CIRCUIT.gates.find(entry => entry.id === 'south-water-gate');
  assert.ok(gate, 'the chain has a gate to hang in');
  assert.ok(Math.abs(AMBRON_CHAIN.b - AMBRON.halfB) < 1e-9, 'it lies on the south wall line');
  assert.ok(AMBRON_CHAIN.sagY > CHANNEL.surface && AMBRON_CHAIN.sagY < CHANNEL.surface + 2, 'it sags just clear of the water');
  assert.ok(AMBRON_CHAIN.halfSpan * 2 >= 46, 'and spans the whole channel');
  // Its capstan stands on the east quay, where a clerk can watch both the chain and the toll house.
  const capstan = P(AMBRON_CHAIN.capstan.a, AMBRON_CHAIN.capstan.b);
  assert.ok(elagosWaterDistance(capstan.x, capstan.z) > 0, 'the capstan is on the quay, not in the water');
  assert.ok(world.colliders.some(c => c.kind === 'ambron-capstan'), 'and it is solid');
  const toll = AMBRON_BUILDINGS.find(entry => entry.id === 'toll-house');
  assert.ok(Math.hypot(toll.a - AMBRON_CHAIN.capstan.a, toll.b - AMBRON_CHAIN.capstan.b) < 40, 'the toll house overlooks the chain');
});

test('the quays line both banks, and the traveler can walk the waterfront without getting wet', () => {
  assert.equal(AMBRON_QUAYS.length, 2, 'a quay on each bank');
  for (const quay of AMBRON_QUAYS) {
    const edge = quay.side > 0 ? quay.from : quay.to;
    for (let b = quay.minB + 4; b <= quay.maxB - 4; b += 6) {
      const a = edge + quay.side * 6;
      // The capstan house stands on the quay at the chain: the walk ends there, by design.
      if (AMBRON_BUILDINGS.some(entry => Math.abs(entry.a - a) < entry.w / 2 + 1 && Math.abs(entry.b - b) < entry.d / 2 + 1)) continue;
      const inner = P(a, b);
      assert.ok(canStand(inner.x, inner.z, world, WALKER), `${quay.id} is walkable at b=${b}`);
      if (Math.abs(b - CAUSEWAY.b) <= CAUSEWAY.halfWidth + 1) continue;      // the causeway crosses here
      const over = P(edge - quay.side * 6, b);
      assert.equal(canStand(over.x, over.z, world, WALKER), false, `${quay.id} does not walk out over the water at b=${b}`);
    }
  }
  // The east bank stands higher than the west: the old city above the timber strand.
  assert.ok(cityGround(60) > cityGround(-60) + 1, 'the east bank is the high one');
  assert.ok(cityGround(60) > CHANNEL.surface + 2.5, 'and its quay is well above the water');
});

test('everyone in Ambron and the lake country has footing, and every stand in the city is reachable from the Plain Gate', () => {
  for (const [id, at] of Object.entries(ELAGOS_NPC_POSITIONS)) {
    assert.ok(canStand(at.x, at.z, world, WALKER), `${id} has footing`);
    assert.equal(world.regionAt(at.x, at.z)?.name, 'Elagos', `${id} is in Elagos`);
    assert.ok(elagosWaterDistance(at.x, at.z) > 0, `${id} is not standing in a lake`);
  }
  for (const [id, stand] of Object.entries(AMBRON_STANDS)) assert.ok(Number.isFinite(stand.yaw), `${id} faces somewhere`);
  // Flood the ground from the haul road outside the Plain Gate, on a half-metre grid.
  const minA = -110, maxA = 110, minB = -90, maxB = 100, cell = .5;
  const columns = Math.round((maxA - minA) / cell) + 1;
  const seen = new Uint8Array(columns * (Math.round((maxB - minB) / cell) + 1)), queue = [];
  const index = (a, b) => Math.round((b - minB) / cell) * columns + Math.round((a - minA) / cell);
  const open = (a, b) => { const p = P(a, b); return canStand(p.x, p.z, nearAmbron, WALKER); };
  const start = [56, 84];
  assert.ok(open(...start), 'the haul road outside the Plain Gate is open');
  seen[index(...start)] = 1; queue.push(start);
  while (queue.length) {
    const [a, b] = queue.pop();
    for (const [da, db] of [[cell, 0], [-cell, 0], [0, cell], [0, -cell]]) {
      const na = a + da, nb = b + db;
      if (na < minA || na > maxA || nb < minB || nb > maxB) continue;
      const k = index(na, nb);
      if (seen[k]) continue;
      seen[k] = open(na, nb) ? 1 : 2;
      if (seen[k] === 1) queue.push([na, nb]);
    }
  }
  const reached = (x, z) => {
    const a = Math.round((x - AMBRON.centre.x) / cell) * cell, b = Math.round((z - AMBRON.centre.z) / cell) * cell;
    return [[0, 0], [cell, 0], [-cell, 0], [0, cell], [0, -cell]].some(([da, db]) => seen[index(a + da, b + db)] === 1);
  };
  for (const [id, stand] of Object.entries(AMBRON_STANDS)) assert.ok(reached(stand.x, stand.z), `${id} can be walked to from the haul road`);
  // And the places that matter: the market, the Seat's plaza, both quays and the far bank.
  for (const [a, b, what] of [[47, -10, 'the market'], [58, 18, 'the Seat'], [28, 40, 'the east quay'],
    [-28, 10, 'the timber strand'], [-58, -40, 'the west bank'], [92 - 8, -6, 'the Ossen Gate']])
    assert.ok(reached(P(a, b).x, P(a, b).z), `${what} can be reached`);
});

test('Ambron is a walled place the autopilot enters by its gates', () => {
  assert.ok(world.enclosures.some(entry => entry.id === 'ambron'), 'the world lists it');
  assert.equal(AMBRON_ENCLOSURE.gates.length, AMBRON_LAND_GATES.length, 'one waypoint pair per land gate');
  assert.ok(AMBRON_ENCLOSURE.contains(AMBRON.centre.x + 40, AMBRON.centre.z), 'inside is inside');
  assert.equal(AMBRON_ENCLOSURE.contains(AMBRON.centre.x, AMBRON.centre.z - AMBRON.halfB - 20), false, 'and outside is outside');
  for (const gate of AMBRON_ENCLOSURE.gates) {
    assert.equal(AMBRON_ENCLOSURE.contains(gate.outer.x, gate.outer.z), false, `${gate.id}'s outer waypoint is outside the walls`);
    assert.ok(AMBRON_ENCLOSURE.contains(gate.inner.x, gate.inner.z), `${gate.id}'s inner waypoint is inside them`);
    assert.ok(canStand(gate.outer.x, gate.outer.z, world, WALKER) && canStand(gate.inner.x, gate.inner.z, world, WALKER), `${gate.id}'s waypoints have footing`);
  }
});

test('Ambron’s streets and buildings are laid out on the ground, not through each other', () => {
  for (let i = 0; i < AMBRON_BUILDINGS.length; i++) for (let j = i + 1; j < AMBRON_BUILDINGS.length; j++) {
    const p = AMBRON_BUILDINGS[i], q = AMBRON_BUILDINGS[j];
    assert.ok(Math.abs(p.a - q.a) >= (p.w + q.w) / 2 || Math.abs(p.b - q.b) >= (p.d + q.d) / 2, `${p.id} and ${q.id} overlap`);
  }
  const inset = AMBRON.halfA - AMBRON_STANDARD.wallThickness / 2, insetB = AMBRON.halfB - AMBRON_STANDARD.wallThickness / 2;
  for (const entry of AMBRON_BUILDINGS) {
    assert.ok(Math.abs(entry.a) + entry.w / 2 <= inset + .01, `${entry.id} stands clear of the east and west walls`);
    assert.ok(Math.abs(entry.b) + entry.d / 2 <= insetB + .01, `${entry.id} stands clear of the north and south walls`);
    assert.ok(entry.a - entry.w / 2 >= CHANNEL.half || entry.a + entry.w / 2 <= -CHANNEL.half, `${entry.id} is not built in the channel`);
  }
  for (const street of AMBRON_STREETS) for (let i = 1; i < street.points.length; i++) {
    const a = street.points[i - 1], b = street.points[i];
    for (let t = 0; t <= 1; t += .02) {
      const pa = a.a + (b.a - a.a) * t, pb = a.b + (b.b - a.b) * t;
      for (const entry of AMBRON_BUILDINGS)
        assert.ok(Math.abs(entry.a - pa) >= entry.w / 2 || Math.abs(entry.b - pb) >= entry.d / 2, `${street.id} runs through ${entry.id}`);
    }
  }
  // The four ages are all on the ground: the streets name which Ambron laid them.
  assert.equal(new Set(AMBRON_STREETS.map(street => street.layer)).size, 4, 'four periods of paving');
  assert.equal(new Set(AMBRON_BUILDINGS.map(entry => entry.layer)).size >= 3, true, 'and at least three of building');
  // The market is a widening of the main street, not a separate square behind it.
  const main = AMBRON_STREETS.find(street => street.id === 'causeway-street');
  assert.ok(main.points.some(p => p.a > AMBRON_MARKET.minA && p.a < AMBRON_MARKET.maxA + 40 && p.b > AMBRON_MARKET.minB && p.b < AMBRON_MARKET.maxB),
    'the main street runs through the market');
  // The road from the Moros arrives at the Plain Gate and the spawn stands on it.
  const spawn = world.regions.find(region => region.name === 'Elagos').spawn;
  assert.ok(canStand(spawn.x, spawn.z, world, WALKER), 'the region spawns somewhere standable');
  assert.ok(Math.min(...AMBRON_ROAD.map(p => Math.hypot(p.x - spawn.x, p.z - spawn.z))) < 30, 'on the haul road below the gate');
  assert.ok(spawn.z > AMBRON.centre.z + AMBRON.halfB, 'outside the walls, looking at the city');
  assert.ok(spawn.x > WORLD_BOUNDS.minX && spawn.x < WORLD_BOUNDS.maxX);
});


test('Ambron keeps a specialist for every skill the country teaches, and one of them sends the traveler after the talking tree', () => {
  // The user's rule: a skill belongs to whoever practises it, and the big city has
  // one of everybody. Every skill Drent teaches has a counterpart here.
  assert.deepEqual([...new Set(SPECIALIST_IDS.map(id => AMBRON_SPECIALISTS[id].skill))].sort(),
    ['birding', 'botany', 'fishing', 'geology', 'mycology'], 'one specialist per skill');
  for (const id of SPECIALIST_IDS) {
    const entry = AMBRON_SPECIALISTS[id];
    assert.ok(ELAGOS_NPCS.some(npc => npc.id === id), `${id} is a person in the city`);
    assert.ok(AMBRON_STANDS[id], `${id} stands somewhere in Ambron`);
    assert.ok(canStand(AMBRON_STANDS[id].x, AMBRON_STANDS[id].z, world, WALKER), `${id} has footing`);
    assert.ok(entry.lesson.length >= 3 && entry.known.length >= 2, `${id} teaches, and has something else for somebody who knows`);
    assert.ok(entry.offer.length > 8);
    // A city specialist is not the village one under another name.
    assert.notEqual(entry.lesson.join(' '), ELAGOS_AMBIENT[id].join(' '));
  }
  // Teaching: a traveler who does not know the skill is offered it, and the host is
  // asked to teach it. Birding goes through its own module's first meeting.
  const opened = [], taught = [], acted = [];
  const host = knows => ({
    openDialogue: (npc, lines, _, back, extra) => opened.push({ id: npc.id, lines, back, choices: (extra?.choices ?? []).map(choice => choice) }),
    closeDialogue: () => {}, skills: { known: id => knows.includes(id), learn: id => { taught.push(id); return { ok: true }; } },
    teachSkill: id => { taught.push(id); return { ok: true }; },
    birding: { met: knows.includes('birding'), meet: () => { taught.push('birding'); return { ok: true }; } },
    act: id => { acted.push(id); return { ok: true, repeat: acted.filter(entry => entry === id).length > 1 }; },
  });
  for (const id of SPECIALIST_IDS) {
    opened.length = 0; taught.length = 0;
    const context = host([]);
    assert.equal(elagosConversation({ id, modelRole: 'rise-custodian' }, context), true);
    const offer = opened[0].choices.find(choice => choice.id === `learn-${AMBRON_SPECIALISTS[id].skill}`);
    assert.ok(offer, `${id} offers to teach`);
    offer.action();
    assert.deepEqual(taught, [AMBRON_SPECIALISTS[id].skill], `${id} teaches its own skill and nothing else`);
    assert.deepEqual(opened.at(-1).lines, [...AMBRON_SPECIALISTS[id].lesson]);
  }
  // And somebody who already knows it is told something else, and not offered it again.
  for (const id of SPECIALIST_IDS) {
    opened.length = 0;
    elagosConversation({ id }, host([AMBRON_SPECIALISTS[id].skill]));
    assert.deepEqual(opened[0].lines, [...AMBRON_SPECIALISTS[id].known], `${id} says something else to somebody who knows`);
    assert.equal(opened[0].choices.some(choice => choice.id.startsWith('learn-')), false, `${id} does not teach it twice`);
  }
  // The talking tree: the botanist's own branch, and the flag the host remembers it by.
  assert.equal(TALKING_TREE_QUEST, 'talking-tree-told');
  opened.length = 0; acted.length = 0;
  const context = host([]);
  elagosConversation({ id: 'ambron-botanist' }, context);
  const errand = opened[0].choices.find(choice => choice.id === TALKING_TREE_QUEST);
  assert.ok(errand, 'the botanist can be asked about it');
  errand.action();
  assert.deepEqual(acted, [TALKING_TREE_QUEST], 'and the host is told');
  const told = opened.at(-1).lines.join(' ');
  assert.match(told, /Drent/, 'the tree is in Drent');
  assert.match(told, /last|one/i, 'and it is the last of them');
  assert.match(told, /looks at you/i, 'it looks at the traveler');
  assert.ok(!/press|button|key/i.test(told), 'how the talking works is left to whoever builds it');
  // Asked twice, she does not repeat herself.
  elagosConversation({ id: 'ambron-botanist' }, context);
  opened.at(-1).choices.find(choice => choice.id === TALKING_TREE_QUEST).action();
  assert.notDeepEqual(opened.at(-1).lines, [...TALKING_TREE_LINES.told]);
});

test('the people of Ambron speak as the day and the place require', () => {
  assert.ok(ELAGOS_NPCS.length >= 15 && ELAGOS_NPCS.length <= 34, `${ELAGOS_NPCS.length} people`);
  assert.equal(new Set(ELAGOS_NPCS.map(npc => npc.id)).size, ELAGOS_NPCS.length, 'nobody is registered twice');
  for (const npc of ELAGOS_NPCS) {
    assert.ok(isElagosNpc(npc.id));
    assert.ok(ELAGOS_AMBIENT[npc.id]?.length >= 2, `${npc.id} has something to say`);
    assert.ok(npc.name && npc.role, `${npc.id} is somebody`);
    assert.ok(ELAGOS_NPC_POSITIONS[npc.id], `${npc.id} stands somewhere`);
  }
  // Only Legion people wear Legion armour.
  const armoured = ELAGOS_NPCS.filter(npc => npc.modelRole === 'legion-soldier' || npc.modelRole === 'legion-officer');
  assert.ok(armoured.length >= 4 && armoured.length <= 8, 'the Empire keeps a garrison and not an army in the streets');
  for (const npc of armoured) assert.match(`${npc.name} ${npc.role}`, /Legion|Optio|Legate/i, `${npc.name} is Legion`);
  // King or emperor is a declaration, never an accident: the council says king with a point.
  const council = ELAGOS_AMBIENT['ambron-committee'].join(' ');
  assert.match(council, /Not emperor\. King\./);
  // The toll is the seam, and it is spoken from both ends of it.
  const clerk = ELAGOS_AMBIENT['ambron-toll-clerk'].join(' ');
  assert.match(clerk, /toll|tenth|twentieth/i);
  assert.match(ELAGOS_AMBIENT['ambron-bargemaster'].join(' '), /paid|toll|line/i);
  assert.match(ELAGOS_AMBIENT['ambron-beggar'].join(' '), /toll/i);
  // The day is one day old, and the news out of the east is in the Legate's mouth.
  assert.match(ELAGOS_AMBIENT['ambron-legate'].join(' '), /Valroy/);
  assert.match(ELAGOS_AMBIENT['ambron-printer'].join(' '), /proclamation/i);
  // The winters are somebody's job.
  assert.match(ELAGOS_AMBIENT['ambron-ice-warden'].join(' '), /ice-road|ice/i);
  // A conversation opens and closes without a host that knows anything about Elagos.
  let opened = null;
  const closed = () => { opened = { ...opened, closed: true }; };
  const ok = elagosConversation(AMBRON_NPCS[0], { openDialogue: (npc, lines, _, back, extra) => { opened = { npc, lines, back, extra }; }, closeDialogue: closed });
  assert.equal(ok, true);
  assert.ok(opened.lines.length >= 2 && opened.back && opened.extra.choices.length === 1);
  assert.equal(elagosConversation({ id: 'harbormaster' }, { openDialogue: () => {}, closeDialogue: () => {} }), false, 'and it answers for nobody else');
});

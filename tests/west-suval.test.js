import test from 'node:test';
import assert from 'node:assert/strict';
import { sourceModule } from './module-loader.js';
import * as THREE from '../vendor/three.module.js';
import { canStand, moveCharacter } from '../src/game-state.js';
import { PLAYABLE_REGIONS, REGION_BIOMES } from '../src/region-layout.js';
import { PLAYABLE_SURVEY } from '../src/region-survey.js';
import { REGION_IDS, REGION_OUTLINES, WORLD_BOUNDS, SOLIS, SOLIS_ROAD, solisPoint, regionNameAt, insideRegion, STORY_SITES, landDistance } from '../src/region-world.js';
import {
  FORT, SOLIS_CIRCUIT, SOLIS_GATES, SOLIS_FACES, SOLIS_TOWERS, SOLIS_STAIRS, SOLIS_BUILDINGS, SOLIS_STANDS, SOLIS_SQUARE, SOLIS_APPROACH,
  COALITION_CAMP, WEST_SUVAL_BORDER, WEST_SUVAL_PLACES, WEST_SUVAL_LANDMARKS, facePoint, wallRuns, gatePassage, solisHolder,
} from '../src/west-suval.js';
import { RIDE } from '../src/riding.js';

const { createWorld } = await sourceModule('../src/world.js');
const world = createWorld(new THREE.Scene());
const P = solisPoint;
const WALKER = .45;

/** The world, but with only the colliders near Solis: a fine grid over the city stays quick. */
const nearSolis = (() => {
  const reach = 190, colliders = world.colliders.filter(c => Math.abs(c.x - SOLIS.centre.x) < reach && Math.abs(c.z - SOLIS.centre.z) < reach);
  return { bounds: world.bounds, heightAt: world.heightAt, colliders };
})();

test('West Suval is the fifth playable region, true to the atlas', () => {
  assert.ok(PLAYABLE_REGIONS.includes('West Suval'));
  assert.equal(REGION_IDS['West Suval'], 5);
  const survey = PLAYABLE_SURVEY.regions.find(region => region.name === 'West Suval');
  assert.ok(survey, 'the baked survey carries West Suval');
  const count = terrain => survey.cells.filter(cell => cell.terrain === terrain).length;
  assert.deepEqual({ hexes: survey.cells.length, grassland: count('grassland'), plains: count('plains'), hills: count('hills') },
    { hexes: 24, grassland: 11, plains: 8, hills: 5 });
  // A biome of its own: rolling coastal downs, not the treeless Moros or East Suval's grey stone.
  const downs = REGION_BIOMES['West Suval'];
  assert.equal(new Set(PLAYABLE_REGIONS.map(name => REGION_BIOMES[name].id)).size, PLAYABLE_REGIONS.length, 'every region has its own biome');
  assert.ok(downs.treesPerHex > REGION_BIOMES['Moros Plain'].treesPerHex && downs.relief.amplitude > REGION_BIOMES['Moros Plain'].relief.amplitude * 2);
  assert.ok(downs.relief.amplitude < REGION_BIOMES['East Suval'].relief.amplitude / 2 && downs.rocksPerHex < REGION_BIOMES['East Suval'].rocksPerHex);
  // Where it lies: east-south-east of the Moros, west of East Suval, south of Luscia, the sea to its south-west.
  const centre = loop => loop.reduce((sum, p) => ({ x: sum.x + p.x / loop.length, z: sum.z + p.z / loop.length }), { x: 0, z: 0 });
  const west = centre(REGION_OUTLINES['West Suval'][0]), moros = centre(REGION_OUTLINES['Moros Plain'][0]),
    east = centre(REGION_OUTLINES['East Suval'][0]), luscia = centre(REGION_OUTLINES.Luscia[0]);
  assert.ok(west.x > moros.x && west.z > moros.z, 'east-south-east of the Moros Plain');
  assert.ok(west.x < east.x, 'west of East Suval');
  assert.ok(west.z > luscia.z, 'south of Luscia');
  assert.ok(landDistance(SOLIS.centre.x - 80, SOLIS.centre.z) < 0 && landDistance(SOLIS.centre.x, SOLIS.centre.z + 90) < 0, 'the sea lies beyond Solis to the west and south');
  // The world grew to hold it.
  for (const p of REGION_OUTLINES['West Suval'].flat()) assert.ok(p.x > WORLD_BOUNDS.minX && p.x < WORLD_BOUNDS.maxX && p.z > WORLD_BOUNDS.minZ && p.z < WORLD_BOUNDS.maxZ);
  const card = world.regions.find(region => region.name === 'West Suval');
  assert.equal(world.regionAt(card.spawn.x, card.spawn.z).name, 'West Suval', 'the region card spawns inside it');
  assert.ok(canStand(card.spawn.x, card.spawn.z, world, WALKER));
});

test('the road runs from the border stockade over the border to the Gate of Sun Horses, with a signpost where it crosses', () => {
  const start = SOLIS_ROAD[0], end = SOLIS_ROAD.at(-1);
  assert.ok(Math.hypot(start.x - STORY_SITES.morosStockade.x, start.z - STORY_SITES.morosStockade.z) < 1e-6, 'the road leaves from the stockade');
  assert.equal(regionNameAt(start.x, start.z), 'Moros Plain');
  assert.ok(insideRegion('West Suval', end.x, end.z));
  const gate = P(0, -SOLIS_CIRCUIT.halfB);
  assert.ok(SOLIS_ROAD.some(p => Math.hypot(p.x - gate.x, p.z - gate.z) < 1e-6), 'the road passes through the gate');
  assert.ok(end.z > gate.z, 'and ends inside the walls');
  assert.deepEqual(world.solisRoute, SOLIS_ROAD.map(p => ({ x: p.x, z: p.z })));
  assert.ok(world.paths.some(path => path.length === SOLIS_ROAD.length && path.every((p, i) => p.x === SOLIS_ROAD[i].x && p.z === SOLIS_ROAD[i].z)), 'drawn as a world path');
  assert.ok(WEST_SUVAL_BORDER, 'the road crosses into West Suval');
  assert.equal(regionNameAt(WEST_SUVAL_BORDER.crossing.x, WEST_SUVAL_BORDER.crossing.z), 'West Suval');
  const post = world.roadSigns.find(sign => sign.label === 'Solis');
  assert.ok(post && Math.hypot(post.x - WEST_SUVAL_BORDER.crossing.x, post.z - WEST_SUVAL_BORDER.crossing.z) < 8, 'a signpost stands at the crossing');
  const length = SOLIS_ROAD.reduce((sum, p, i) => i ? sum + Math.hypot(p.x - SOLIS_ROAD[i - 1].x, p.z - SOLIS_ROAD[i - 1].z) : 0, 0);
  assert.ok(length > 350 && length < 700, `the road is ${length.toFixed(0)} m`);
});

test('a rider can take the road to Solis end to end, through the Gate of Sun Horses, and there is room to hitch outside it', () => {
  for (let i = 1; i < SOLIS_ROAD.length; i++) {
    const a = SOLIS_ROAD[i - 1], b = SOLIS_ROAD[i], steps = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.z - a.z)));
    for (let step = 0; step <= steps; step++) {
      const x = a.x + (b.x - a.x) * step / steps, z = a.z + (b.z - a.z) * step / steps;
      assert.ok(canStand(x, z, world, RIDE.radius), `a rider is stopped on the Solis road at ${x.toFixed(1)}, ${z.toFixed(1)}`);
    }
  }
  // Walk a horse's footprint through the gate with the real movement rule.
  const rider = { ...P(0, -70) }, inside = P(0, -30);
  for (let frame = 0; frame < 400 && Math.hypot(rider.x - inside.x, rider.z - inside.z) > .5; frame++) {
    const dx = inside.x - rider.x, dz = inside.z - rider.z, d = Math.hypot(dx, dz), step = Math.min(d, .2);
    moveCharacter(rider, dx / d * step, dz / d * step, nearSolis, RIDE.radius);
  }
  assert.ok(Math.hypot(rider.x - inside.x, rider.z - inside.z) <= .5, `the rider stopped at ${rider.x.toFixed(1)}, ${rider.z.toFixed(1)}`);
  // Hitching room outside the gate: a clear yard beside the rail.
  const rail = world.colliders.find(c => c.kind === 'hitching-rail');
  assert.ok(rail);
  for (let a = -2.5; a <= 2.5; a += 1) assert.ok(canStand(rail.x + a, rail.z + 2.2, world, RIDE.radius), 'a horse can stand at the rail');
});

test('the walls of Solis are a closed circuit: nobody stands on the wall line except in the two gate passages, and each passage can be walked', () => {
  const inPassage = (faceId, along) => SOLIS_GATES.some(gate => gate.face === faceId && Math.abs(along - gate.along) < FORT.gateWidth / 2 - WALKER - .1);
  let samples = 0;
  for (const faceId of Object.keys(SOLIS_FACES)) {
    const face = SOLIS_FACES[faceId];
    for (let along = -face.span; along <= face.span + 1e-9; along += 2) {
      for (const depth of [-FORT.thickness / 2 + .1, 0, FORT.thickness / 2 - .1]) {
        const spot = facePoint(faceId, along, depth), p = P(spot.a, spot.b);
        samples++;
        if (inPassage(faceId, along)) continue;
        assert.equal(canStand(p.x, p.z, world, WALKER), false, `someone can stand on the ${faceId} wall at ${along.toFixed(1)} m`);
      }
    }
  }
  assert.ok(samples > 500);
  for (const gate of SOLIS_GATES) {
    // Only the passage is open: step across the wall line either side of it and it is shut.
    for (const side of [-1, 1]) {
      const spot = facePoint(gate.face, gate.along + side * (FORT.gateWidth / 2 + .6)), p = P(spot.a, spot.b);
      assert.equal(canStand(p.x, p.z, world, WALKER), false, `${gate.name} is only as wide as its passage`);
    }
    const passage = gatePassage(gate.id), walker = { ...passage.outer };
    for (let frame = 0; frame < 600 && Math.hypot(walker.x - passage.inner.x, walker.z - passage.inner.z) > .4; frame++) {
      const dx = passage.inner.x - walker.x, dz = passage.inner.z - walker.z, d = Math.hypot(dx, dz), step = Math.min(d, .15);
      moveCharacter(walker, dx / d * step, dz / d * step, nearSolis, WALKER);
    }
    assert.ok(Math.hypot(walker.x - passage.inner.x, walker.z - passage.inner.z) <= .4, `${gate.name} can be walked end to end; stopped at ${walker.x.toFixed(1)}, ${walker.z.toFixed(1)}`);
  }
});

test('Solis is built to the shared fortification standard: height, wall walk, towers, two gates, a ditch', () => {
  assert.ok(FORT.parapetTop >= 4.5 && FORT.parapetTop <= 5, 'the wall stands 4.5 to 5 m above the ground outside');
  assert.ok(FORT.thickness >= 2.2, 'thick enough to carry a wall walk');
  assert.ok(FORT.towerTop - FORT.parapetTop >= 2.5, 'towers stand a storey above the wall');
  assert.ok(FORT.gateWidth >= 4 && FORT.gateWidth <= 5, 'gates 4 to 5 m wide');
  assert.ok(FORT.ditchWidth >= 3 && FORT.ditchWidth <= 4, 'a ditch 3 to 4 m wide');
  assert.equal(SOLIS_GATES.length, 2, 'two gates, no more');
  assert.ok(SOLIS_STAIRS.length >= 2, 'the wall walk is reached at two or more points');
  for (const gate of SOLIS_GATES) assert.equal(SOLIS_TOWERS.filter(tower => tower.gate === gate.id).length, 2, `${gate.name} has two flanking towers`);
  assert.equal(SOLIS_TOWERS.filter(tower => tower.kind === 'corner').length, 4, 'a tower at every corner');
  // Towers project beyond the wall's face so they cover it.
  for (const tower of SOLIS_TOWERS) {
    const outside = Math.max(Math.abs(tower.a) - SOLIS_CIRCUIT.halfA, Math.abs(tower.b) - SOLIS_CIRCUIT.halfB);
    assert.ok(outside > 0 && outside + FORT.towerSize / 2 > FORT.thickness / 2, `${tower.id} projects`);
  }
  // Roughly one tower per 35 to 45 m of wall: no run of curtain wall is longer than that.
  for (const faceId of Object.keys(SOLIS_FACES)) for (const [from, to] of wallRuns(faceId)) assert.ok(to - from <= 45, `a ${(to - from).toFixed(1)} m run of wall on the ${faceId} face`);
  const perimeter = 4 * (SOLIS_CIRCUIT.halfA + SOLIS_CIRCUIT.halfB);
  assert.ok(perimeter / SOLIS_TOWERS.length >= 28 && perimeter / SOLIS_TOWERS.length <= 45);
  // The ditch rings the circuit, broken only by the causeway before each gate.
  for (const faceId of Object.keys(SOLIS_FACES)) {
    const face = SOLIS_FACES[faceId], gate = SOLIS_GATES.find(g => g.face === faceId);
    for (let along = -face.span; along <= face.span; along += 2) {
      const spot = facePoint(faceId, along, FORT.ditchOffset), p = P(spot.a, spot.b), causeway = gate && Math.abs(along - gate.along) < FORT.causeway / 2 - WALKER - .1;
      assert.equal(canStand(p.x, p.z, world, WALKER), !!causeway, `the ${faceId} ditch at ${along} m ${causeway ? 'has its causeway' : 'is open'}`);
    }
  }
  const counts = SOLIS_BUILDINGS.length + 2;   // with the Court of Oaths and the net loft on the quay
  assert.ok(counts >= 18 && counts <= 25, `${counts} buildings`);
  assert.ok(world.westSuvalMetrics.buildings >= 18, 'and the scenery built them');
});

test('everyone in Solis and its camp stands on walkable ground in West Suval, and every stand inside the walls is reachable from the gate', () => {
  for (const [id, stand] of Object.entries(SOLIS_STANDS)) {
    assert.ok(canStand(stand.x, stand.z, world, WALKER), `${id} has footing`);
    assert.equal(world.regionAt(stand.x, stand.z)?.name, 'West Suval', `${id} is in West Suval`);
    assert.ok(Number.isFinite(stand.yaw));
  }
  // Flood the ground from outside the Gate of Sun Horses on a half-metre grid.
  const minA = -100, maxA = 140, minB = -110, maxB = 80, cell = .5;
  const columns = Math.round((maxA - minA) / cell) + 1, rows = Math.round((maxB - minB) / cell) + 1;
  const seen = new Uint8Array(columns * rows), queue = [];
  const index = (a, b) => Math.round((b - minB) / cell) * columns + Math.round((a - minA) / cell);
  const open = (a, b) => { const p = P(a, b); return canStand(p.x, p.z, nearSolis, WALKER); };
  const start = [0, -80]; seen[index(...start)] = 1; queue.push(start);
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
    const a = Math.round((x - SOLIS.centre.x) / cell) * cell, b = Math.round((z - SOLIS.centre.z) / cell) * cell;
    return [[0, 0], [cell, 0], [-cell, 0], [0, cell], [0, -cell]].some(([da, db]) => seen[index(a + da, b + db)] === 1);
  };
  for (const [id, stand] of Object.entries(SOLIS_STANDS)) assert.ok(reached(stand.x, stand.z), `${id} can be walked to from the road`);
  // And the quay: out through the city and the quay gate.
  assert.ok(reached(P(-64, -8).x, P(-64, -8).z), 'the quay can be reached through the quay gate');
  assert.ok(reached(P(-20, -8).x, P(-20, -8).z) && reached(P(24, 2).x, P(24, 2).z), 'the square and the Court of Oaths can be reached');
});

test('the square and the road outside the gate are clear, level fighting ground with the way out toward the gate', () => {
  for (const arena of [SOLIS_SQUARE, SOLIS_APPROACH]) {
    const heights = [];
    for (let along = -arena.halfAlong; along <= arena.halfAlong; along += 1) for (let across = -arena.halfAcross; across <= arena.halfAcross; across += 1) {
      const a = arena.a + (arena.axis === 'x' ? along : across), b = arena.b + (arena.axis === 'x' ? across : along), p = P(a, b);
      assert.ok(canStand(p.x, p.z, world, WALKER), `the ${arena.axis === 'x' ? 'square' : 'approach'} is blocked at ${a}, ${b}`);
      heights.push(world.heightAt(p.x, p.z));
    }
    assert.ok(Math.max(...heights) - Math.min(...heights) < 3, `level enough: ${(Math.max(...heights) - Math.min(...heights)).toFixed(2)} m of rise`);
  }
  // The + end of each points to where the traveler comes from: the gate for the square, the city for the approach.
  const gate = P(0, -SOLIS_CIRCUIT.halfB), square = P(SOLIS_SQUARE.a, SOLIS_SQUARE.b), approach = P(SOLIS_APPROACH.a, SOLIS_APPROACH.b);
  assert.ok(Math.hypot(gate.x - (square.x + 20), gate.z - square.z) < Math.hypot(gate.x - (square.x - 20), gate.z - square.z));
  assert.ok(SOLIS.centre.z > approach.z && SOLIS_APPROACH.axis === 'z');
});

test('the camp outside the walls has every contingent under its own banner, and is struck when Solis changes hands', () => {
  assert.deepEqual(COALITION_CAMP.contingents.map(group => group.id), ['izoli', 'suval', 'ambroni-rebels', 'selemis', 'marosh', 'island-cities', 'pyros']);
  assert.ok(COALITION_CAMP.contingents.find(group => group.id === 'pyros').tents.length < COALITION_CAMP.contingents.find(group => group.id === 'izoli').tents.length / 4, 'a very small Pyrosi group');
  assert.ok(!JSON.stringify(COALITION_CAMP).includes('South Pyros'));
  const camp = P((COALITION_CAMP.minA + COALITION_CAMP.maxA) / 2, 0);
  assert.ok(Math.abs(camp.x - SOLIS.centre.x) > SOLIS_CIRCUIT.halfA + FORT.ditchOffset + 5, 'outside the walls');
  const tents = () => world.colliders.filter(c => c.kind === 'camp-tent').length;
  assert.ok(tents() >= 20);
  const tent = COALITION_CAMP.contingents[0].tents[0], spot = P(tent.a, tent.b);
  assert.equal(canStand(spot.x, spot.z, world, WALKER), false);
  assert.equal(world.setSolisHolder('empire'), true);
  assert.equal(tents(), 0, 'struck to bare tent rings');
  assert.equal(canStand(spot.x, spot.z, world, WALKER), true);
  world.setSolisHolder('routed'); assert.equal(tents(), 0);
  world.setSolisHolder('coalition'); assert.ok(tents() >= 20);
  // Who holds the ground: the campaign's map, except while the army is still clearing the square.
  assert.equal(solisHolder({ 'West Suval': 'coalition' }), 'coalition');
  assert.equal(solisHolder({ 'West Suval': 'empire' }), 'empire');
  assert.equal(solisHolder({ 'West Suval': 'coalition' }, { variant: 'solis-sweep', cleared: false }), 'routed');
  assert.equal(solisHolder({ 'West Suval': 'empire' }, { variant: 'solis-sweep', cleared: true }), 'empire');
  assert.equal(solisHolder({ 'West Suval': 'coalition' }, { variant: 'solis-fallback', cleared: false }), 'coalition');
});

test('the country between the border and Solis has places to find, and they stand in West Suval', () => {
  for (const place of Object.values(WEST_SUVAL_PLACES)) {
    assert.equal(regionNameAt(place.x, place.z), 'West Suval', `${place.name} is in West Suval`);
    assert.ok(place.description.length > 60);
    assert.ok(world.landmarks.some(landmark => landmark.id === place.id), `${place.name} can be discovered`);
    const toRoad = Math.min(...SOLIS_ROAD.slice(1).map((b, i) => { const a = SOLIS_ROAD[i], dx = b.x - a.x, dz = b.z - a.z, t = Math.max(0, Math.min(1, ((place.x - a.x) * dx + (place.z - a.z) * dz) / (dx * dx + dz * dz))); return Math.hypot(place.x - a.x - dx * t, place.z - a.z - dz * t); }));
    assert.ok(toRoad > 6 && toRoad < 120, `${place.name} is ${toRoad.toFixed(0)} m from the road`);
  }
  for (const landmark of WEST_SUVAL_LANDMARKS) assert.ok(world.landmarks.some(entry => entry.id === landmark.id && entry.x === landmark.x), `${landmark.id} is a world landmark`);
  const text = WEST_SUVAL_LANDMARKS.map(landmark => landmark.description).join(' ');
  for (const word of ['Gate of Sun Horses', 'Court of Oaths', 'bronze horses', 'white cliffs', 'terraces']) assert.match(text, new RegExp(word));
  assert.doesNotMatch(text, /Maro|Arelle|Solan|Maera|wedding|siege/, 'nothing of the novella’s people or plot');
});

test('the autopilot finds its way into Solis by the Gate of Sun Horses, to the envoy and back out again', async () => {
  const { nextWaypoint, freeDirection } = await import('../src/autopilot.js');
  const { SOLIS_ENCLOSURE, SOLIS_ENCLOSURES } = await import('../src/west-suval.js');
  const ground = { ...nearSolis, paths: world.paths, enclosures: SOLIS_ENCLOSURES };
  const walk = (from, to) => {
    const position = { ...from };
    for (let frame = 0; frame < 9000; frame++) {
      if (Math.hypot(position.x - to.x, position.z - to.z) < 1.5) return { arrived: true, position };
      const waypoint = nextWaypoint(position, to, ground);
      const direction = freeDirection(position, waypoint.point, ground);
      moveCharacter(position, direction.x * .12, direction.z * .12, ground);
    }
    return { arrived: false, position };
  };
  const outside = P(-40, -110), envoy = SOLIS_STANDS['coalition-envoy'], quay = SOLIS_STANDS['solis-porter'];
  assert.equal(SOLIS_ENCLOSURE.contains(outside.x, outside.z), false);
  assert.equal(SOLIS_ENCLOSURE.contains(envoy.x, envoy.z), true);
  for (const [from, to, label] of [[outside, envoy, 'in to the envoy'], [envoy, outside, 'back out to the road'], [envoy, quay, 'out by the quay gate']]) {
    const result = walk(from, to);
    assert.ok(result.arrived, `the autopilot could not walk ${label}; it stopped at ${result.position.x.toFixed(1)}, ${result.position.z.toFixed(1)}`);
  }
});

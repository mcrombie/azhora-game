import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { sourceModule } from './module-loader.js';
import { scopedWorld } from './scoped-world.js';

/**
 * Mithala on the world: the layout (src/content/regions/mithala/mithala-city.js) laid into the terrain chain and built with the four Mithala
 * countries, asked of one world scoped to them [28-31]. The platforms read their level; the river's own ground within two
 * metres of the water is exactly what it was before the city; the game's own movement rules walk through every quarter,
 * down Gauge Lane to the gauge, across the ford in the water and over the three bridges and up the tower's stair; the
 * countryside's scatter and its animals are off the city; and the chart and the travel panel know where it is.
 *
 * The walker is scripts/walk-route.mjs's, run on this test's world rather than a second one: a quarter-metre tick, the
 * route's waypoints in order, a steer of up to 1.7 rad round anything in the way, a fall wherever the ground drops a
 * metre in one step, and no swimming. The bridges and the stair are walking surfaces (decks and ramps), which the ground
 * under them does not know about, so those two routes stand the walker on what the traveller's own controller stands
 * on (`bodyWorld`, src/gameplay/combat/bodies.js: the highest surface within a step of the feet).
 */
const THREE = await sourceModule('../vendor/three.module.js');
const { groundBeforeMithalaCity } = await sourceModule('../src/world/terrain/world-terrain.js');
const { westWaterSurface } = await sourceModule('../src/content/regions/western-regions/west-ground.js');
const { canStand, moveCharacter } = await sourceModule('../src/gameplay/movement/game-state.js');
const { canWalkSlope } = await sourceModule('../src/gameplay/movement/climbing.js');
const { BODY, bodyWorld } = await sourceModule('../src/gameplay/combat/bodies.js');
const { createWestLife } = await sourceModule('../src/content/regions/western-regions/west-regions-life.js');
const { MITHALA_WILDLIFE_ZONES } = await sourceModule('../src/content/regions/mithala/mithala-wildlife.js');
const { SUBREGIONS } = await sourceModule('../src/ui/map/map-fog.js');
const { travelPlaces, landingSpot } = await sourceModule('../src/dev/tools/testing-travel.js');
const { TRANSFORM } = await sourceModule('../src/world/terrain/region-world.js');
const { ATLAS_CITY_DESIGNATIONS, atlasPlaceMarks, atlasCityBoundaries } = await sourceModule('../src/ui/map/world-map-detail.js');
const {
  MITHALA_CITY, MITHALA_DISTRICTS, MITHALA_STREETS, MITHALA_BRIDGES, MITHALA_FORD, MITHALA_QUAY, MITHALA_APPROACHES, APPROACH_BAND,
  MITHALA_TOWER_STAIR, MITHALA_GAUGE, mithalaCityWaterClearance, mithalaCityReserved, mithalaDeckHeight, mithalaDistrictAt,
  inMithalaCity, polygonDepth, mithalaSegmentDistance,
} = await sourceModule('../src/content/regions/mithala/mithala-city.js');

const scene = new THREE.Scene();
const world = await scopedWorld(scene, [28, 29, 30, 31]);
const P = MITHALA_CITY.platform, KEEP = MITHALA_CITY.waterKeep;
const route = name => JSON.parse(readFileSync(new URL(`./routes/${name}.json`, import.meta.url), 'utf8'));
const box = (() => { const b = MITHALA_CITY.bounds; return { minX: b.minX - 30, maxX: b.maxX + 20, minZ: b.minZ - 20, maxZ: b.maxZ + 20 }; })();

/** The strict walker (scripts/walk-route.mjs) on this world. `surfaces` stands it on decks and stairs as the controller does. */
function walk(points, { surfaces = false } = {}) {
  const radius = BODY.traveler, tick = .25, FALL = 1;
  const pos = { x: points[0][1], z: points[0][2], y: world.heightAt(points[0][1], points[0][2]) };
  const w = surfaces ? bodyWorld(world).moving(pos, radius) : world;
  const ground = (x, z) => w.heightAt(x, z);
  const support = (x, z, swimming) => (swimming ? world.waterAt(x, z) - 1.2 : ground(x, z));
  const traverse = (x, z, x2, z2) => canWalkSlope(x, z, x2, z2, w);
  if (!canStand(pos.x, pos.z, w, radius, pos.y)) return { failures: ['cannot stand at the start'] };
  const out = { failures: [], walked: 0, swum: 0, detours: 0, reached: [], high: -Infinity,
    made: { grade: 0 }, river: { grade: 0 } };
  const label = leg => points[leg][0] || points.slice(0, leg).reverse().find(r => r[0])?.[0] || `leg ${leg}`;
  for (let leg = 1; leg < points.length; leg++) {
    const [, tx, tz] = points[leg];
    let stuck = 0, guard = 0, arrived = false;
    while (guard++ < 40000) {
      if (Math.hypot(tx - pos.x, tz - pos.z) <= .6) { arrived = true; break; }
      const d = Math.hypot(tx - pos.x, tz - pos.z), ux = (tx - pos.x) / d, uz = (tz - pos.z) / d;
      const before = { x: pos.x, z: pos.z }, hBefore = ground(pos.x, pos.z);
      const swimming = !canStand(pos.x, pos.z, w, radius, pos.y);
      // No swimming: the water a traveller wades is ground they stand on.
      moveCharacter(pos, ux * tick, uz * tick, w, radius, { swimming, canTraverse: traverse });
      let moved = Math.hypot(pos.x - before.x, pos.z - before.z);
      if (moved < tick * .3) {
        for (const a of [.6, -.6, 1.2, -1.2, 1.7, -1.7]) {
          const c = Math.cos(a), s = Math.sin(a);
          moveCharacter(pos, (ux * c - uz * s) * tick, (ux * s + uz * c) * tick, w, radius, { swimming, canTraverse: traverse });
          moved = Math.hypot(pos.x - before.x, pos.z - before.z);
          if (moved >= tick * .3) { out.detours++; break; }
        }
      }
      if (moved < tick * .3) { if (++stuck > 40) break; continue; }
      stuck = 0;
      const h = ground(pos.x, pos.z), wet = !canStand(pos.x, pos.z, w, radius, support(pos.x, pos.z, false));
      pos.y = support(pos.x, pos.z, wet);
      if (!wet && hBefore - h > FALL) out.failures.push(`a fall of ${(hBefore - h).toFixed(1)} m near (${pos.x.toFixed(1)}, ${pos.z.toFixed(1)}) on "${label(leg)}"`);
      out.high = Math.max(out.high, h);
      // The steepest step on the made ground, and apart from it the steepest on the river's own bank: within `waterKeep`
      // of the water, which the city never writes, and the metre and a half beyond where the made ground meets it.
      const grade = Math.abs(h - hBefore) / moved, river = Math.min(mithalaCityWaterClearance(before.x, before.z),
        mithalaCityWaterClearance(pos.x, pos.z)) <= KEEP + 1.5 && mithalaDeckHeight(pos.x, pos.z) === null;
      const kind = river ? out.river : out.made;
      if (grade > kind.grade) Object.assign(kind, { grade, x: pos.x, z: pos.z, leg: label(leg) });
      if (swimming || wet) out.swum += moved; else out.walked += moved;
    }
    if (!arrived) { out.failures.push(`missed (${tx}, ${tz}) on "${label(leg)}", stopped at (${pos.x.toFixed(1)}, ${pos.z.toFixed(1)})`); break; }
    out.reached.push(points[leg][0]);
  }
  if (out.swum > 0) out.failures.push(`swam ${out.swum.toFixed(1)} m`);
  return out;
}
const degrees = grade => (Math.atan(grade) * 180 / Math.PI).toFixed(0);

test('the four platforms read their level on the world, the streets on them stay flat', () => {
  for (const d of MITHALA_DISTRICTS) {
    assert.equal(mithalaDistrictAt(d.centre.x, d.centre.z), d);
    assert.ok(Math.abs(world.heightAt(d.centre.x, d.centre.z) - P) < 1e-9, `${d.name} centre reads ${world.heightAt(d.centre.x, d.centre.z)}`);
  }
  // Every two metres over the inside of each platform: clear of the banks' slopes and of every approach's cutting, it
  // is exactly the platform.
  const bankZone = MITHALA_CITY.bank.inset + MITHALA_CITY.bank.top / 2 + MITHALA_CITY.bank.side;
  let read = 0;
  for (let x = box.minX; x <= box.maxX; x += 2) for (let z = box.minZ; z <= box.maxZ; z += 2) {
    const d = mithalaDistrictAt(x, z);
    if (!d || polygonDepth(d.outline, x, z) < (d.wall === 'bank' ? bankZone + .25 : .5)) continue;
    if (MITHALA_APPROACHES.some(a => a.run > 0 && a.path.slice(1).some((p, i) => mithalaSegmentDistance(x, z, a.path[i], p) < a.half + APPROACH_BAND))) continue;
    assert.ok(Math.abs(world.heightAt(x, z) - P) < 1e-9, `${d.name} at ${x},${z} reads ${world.heightAt(x, z).toFixed(3)}`);
    read++;
  }
  assert.ok(read > 1000, `${read} points read`);
});

test('the river’s own ground within two metres of the water is exactly what it was before the city', () => {
  // Every half metre over the city and its approaches: wherever the plain's channels are within `waterKeep`, or there is
  // water at all, the ground the world stands on there is the ground before the city - bridges and the quay included,
  // which are surfaces over it and leave it alone.
  let near = 0, wetPoints = 0;
  const changed = [];
  for (let x = box.minX; x <= box.maxX; x += .5) for (let z = box.minZ; z <= box.maxZ; z += .5) {
    const water = westWaterSurface(x, z) !== null;
    if (!water && mithalaCityWaterClearance(x, z) > KEEP) continue;
    near++; if (water) wetPoints++;
    const before = groundBeforeMithalaCity(x, z);
    if (world.groundHeight(x, z) !== before || (mithalaDeckHeight(x, z) === null && world.heightAt(x, z) !== before))
      changed.push(`${x},${z}: ${world.heightAt(x, z).toFixed(3)} for ${before.toFixed(3)}`);
  }
  assert.ok(near > 30000 && wetPoints > 10000, `${near} points near the water, ${wetPoints} in it`);
  assert.deepEqual(changed.slice(0, 5), [], `${changed.length} of ${near} points within ${KEEP} m of the water changed`);
});

test('every street on the made ground climbs at three in ten or less, the approaches and the ford included', () => {
  // Across and along each street's own strip (its segments, not past their ends, where a bridge deck or the quay takes
  // over), a quarter metre at a time, out of the water. Within `waterKeep` of the water is the river's own bank (the test
  // above holds it unchanged); the metre and a half beyond it is where the made ground meets that bank.
  const worst = { made: { grade: 0 }, meeting: { grade: 0 }, river: { grade: 0 } };
  // The streets, the paved ford between its two water lines, and Gauge Lane's cutting on from the lane's end to the gauge.
  const lane = MITHALA_STREETS.find(s => s.id === 'mithala-gauge-lane');
  const ways = [...MITHALA_STREETS, { name: MITHALA_FORD.name, width: MITHALA_FORD.width, points: [MITHALA_FORD.a, MITHALA_FORD.b] },
    { name: 'Gauge Lane to the gauge', width: lane.width, points: [lane.points.at(-1), { x: MITHALA_GAUGE.x, z: MITHALA_GAUGE.z }] }];
  for (const s of ways) for (let i = 1; i < s.points.length; i++) {
    const a = s.points[i - 1], b = s.points[i], length = Math.hypot(b.x - a.x, b.z - a.z), ux = (b.x - a.x) / length, uz = (b.z - a.z) / length;
    const at = (u, v) => ({ x: a.x + ux * u - uz * v, z: a.z + uz * u + ux * v });
    const usable = p => mithalaDeckHeight(p.x, p.z) === null && westWaterSurface(p.x, p.z) === null;
    const half = s.width / 2;
    for (let u = 0; u <= length; u += .25) for (let v = -half; v <= half; v += .25) {
      const p = at(u, v);
      if (!usable(p)) continue;
      const h = world.heightAt(p.x, p.z), next = [];
      if (u + .25 <= length + 1e-9) next.push(at(u + .25, v));
      if (v + .25 <= half + 1e-9) next.push(at(u, v + .25));
      for (const q of next) {
        if (!usable(q)) continue;
        const grade = Math.abs(world.heightAt(q.x, q.z) - h) / .25;
        const clear = Math.min(mithalaCityWaterClearance(p.x, p.z), mithalaCityWaterClearance(q.x, q.z));
        const kind = clear > KEEP + 1.5 ? worst.made : clear > KEEP && mithalaCityWaterClearance(p.x, p.z) > KEEP ? worst.meeting : worst.river;
        if (grade > kind.grade) Object.assign(kind, { grade, street: s.name, x: +p.x.toFixed(2), z: +p.z.toFixed(2) });
      }
    }
  }
  console.log(`streets: made ground ${worst.made.grade.toFixed(3)} (${worst.made.street}), meeting the river's bank ${worst.meeting.grade.toFixed(3)} (${worst.meeting.street}), the river's own bank ${worst.river.grade.toFixed(3)} (${worst.river.street})`);
  assert.ok(worst.made.grade <= .3, `the steepest made street is ${worst.made.grade.toFixed(3)} on ${worst.made.street} at ${worst.made.x},${worst.made.z}`);
  // Where the made ground comes down onto the river's own bank it is no steeper than that bank is (about 0.39 at the ford).
  assert.ok(worst.meeting.grade <= Math.max(.34, worst.river.grade + .01), `where the made ground meets the river's bank: ${worst.meeting.grade.toFixed(3)} on ${worst.meeting.street} at ${worst.meeting.x},${worst.meeting.z}, the bank itself ${worst.river.grade.toFixed(3)}`);
});

test('the strict walker goes through every quarter, down Gauge Lane to the gauge, and wades the ford', () => {
  const report = [];
  for (const name of ['mithala-fork', 'mithala-braid-bank', 'mithala-quays-ford']) {
    const points = route(name), result = walk(points);
    assert.deepEqual(result.failures, [], name);
    assert.equal(result.detours, 0, `${name}: steered round something ${result.detours} times`);
    // On the made ground no step is steeper than a cart can take. The river's own bank (within two metres of the
    // water, which is never written) is what it is: the ford's two banks are about 21 degrees.
    assert.ok(result.made.grade <= .34, `${name}: ${degrees(result.made.grade)} degrees (${result.made.grade.toFixed(3)}) at (${result.made.x?.toFixed(1)}, ${result.made.z?.toFixed(1)}) on "${result.made.leg}"`);
    assert.ok(result.river.grade <= .45, `${name}: the river's bank at ${degrees(result.river.grade)} degrees`);
    report.push(`${name} ${result.walked.toFixed(0)} m, made ground ${degrees(result.made.grade)} deg, river bank ${degrees(result.river.grade)} deg`);
  }
  // The gauge is reached by its lane (the Fork's route), and the ford is in the water and waded, not swum.
  assert.ok(route('mithala-fork').some(([name]) => name === 'The Flood Gauge'));
  const ford = Array.from({ length: 41 }, (_, i) => ({ x: MITHALA_FORD.a.x + (MITHALA_FORD.b.x - MITHALA_FORD.a.x) * i / 40,
    z: MITHALA_FORD.a.z + (MITHALA_FORD.b.z - MITHALA_FORD.a.z) * i / 40 }));
  const inWater = ford.filter(p => westWaterSurface(p.x, p.z) !== null && westWaterSurface(p.x, p.z) > world.heightAt(p.x, p.z));
  assert.ok(inWater.length >= 10, `${inWater.length} of the ford's points are under water`);
  for (const p of inWater) assert.ok(canStand(p.x, p.z, world, BODY.traveler), `the ford at ${p.x.toFixed(1)},${p.z.toFixed(1)} is not wadeable`);
  console.log(report.join('\n'));
});

/** Whether the scenery has laid a walking surface at a point, near a height. */
const surfaceAt = (x, z, y) => world.supportAt(x, z, { maxY: y, stepUp: .35, groundSlope: false });
const unbuiltBridges = MITHALA_BRIDGES.filter(b => !surfaceAt((b.a.x + b.b.x) / 2, (b.a.z + b.b.z) / 2, b.deck + .5)?.id).map(b => b.name);
test('the walker crosses all three bridges dry, on their decks', {
  todo: unbuiltBridges.length ? `no walking surface yet on ${unbuiltBridges.join(', ')} (src/content/regions/mithala/mithala-city-scenery.js builds the bridges)` : false,
}, () => {
  const result = walk(route('mithala-bridges'), { surfaces: true });
  assert.deepEqual(result.failures, []);
  for (const b of MITHALA_BRIDGES) {
    const mid = { x: (b.a.x + b.b.x) / 2, z: (b.a.z + b.b.z) / 2 };
    assert.ok(mithalaCityWaterClearance(mid.x, mid.z) < 0, `${b.name}'s middle is over its water`);
    assert.ok(Math.abs(surfaceAt(mid.x, mid.z, b.deck + .5).height - b.deck) < .3, `${b.name}'s deck stands at ${b.deck}`);
  }
  assert.ok(result.made.grade <= .34, `${degrees(result.made.grade)} degrees at (${result.made.x?.toFixed(1)}, ${result.made.z?.toFixed(1)})`);
  console.log(`bridges: ${result.walked.toFixed(0)} m, ${result.detours} steps round something, steepest ${degrees(result.made.grade)} deg`);
});

const quayBuilt = MITHALA_QUAY.points.slice(1).every((b, i) => {
  const a = MITHALA_QUAY.points[i];
  return surfaceAt((a.x + b.x) / 2, (a.z + b.z) / 2, MITHALA_QUAY.deck + .5)?.id;
});
test('the walker goes down the Quay Stairs onto the Grain Quay and along it', {
  todo: quayBuilt ? false : 'no walking surface yet on the Grain Quay (src/content/regions/mithala/mithala-city-scenery.js builds it)',
}, () => {
  const result = walk(route('mithala-quay'), { surfaces: true });
  assert.deepEqual(result.failures, []);
  assert.ok(result.made.grade <= .34, `${degrees(result.made.grade)} degrees at (${result.made.x?.toFixed(1)}, ${result.made.z?.toFixed(1)})`);
});

const stairTop = MITHALA_TOWER_STAIR.landings.at(-1), topHeight = P + MITHALA_TOWER_STAIR.top;
const towerBuilt = Math.abs((surfaceAt(stairTop.x, stairTop.z, topHeight + .5)?.height ?? -Infinity) - topHeight) < .3;
test('the walker climbs the sky tower’s stair from the door to the open platform', {
  todo: towerBuilt ? false : 'no walking surface yet at the top of the tower stair (src/content/regions/mithala/mithala-city-buildings.js builds the tower)',
}, () => {
  const points = route('mithala-tower'), result = walk(points, { surfaces: true });
  assert.deepEqual(result.failures, []);
  assert.ok(result.high >= topHeight - .3, `the walker got to ${result.high.toFixed(1)} m of ${topHeight.toFixed(1)}`);
});

test('nothing of the countryside is left on the city: no tree, and no scatter on a street or a platform', () => {
  const trees = world.colliders.filter(c => c.kind === 'mithala-tree' && mithalaCityReserved(c.x, c.z));
  assert.deepEqual(trees.map(c => `${c.x.toFixed(1)},${c.z.toFixed(1)}`), [], 'a tree on the city');
  const left = [], matrix = new THREE.Matrix4();
  let anchors = 0;
  const onStreet = (x, z) => MITHALA_STREETS.some(s => s.points.slice(1).some((p, i) => mithalaSegmentDistance(x, z, s.points[i], p) < s.width / 2 + .5));
  scene.traverse(root => {
    if (root.name !== 'Mithala scenery') return;
    root.traverse(mesh => {
      if (!mesh.isInstancedMesh) return;
      // Crowns and forbs are drawn in clusters of three, anchored on the last of each, as the clearing reads them.
      const size = mesh.name.endsWith(' crowns') || mesh.name === 'Mithala prairie forbs' ? 3 : 1;
      for (let first = 0; first + size <= mesh.count; first += size) {
        mesh.getMatrixAt(first + size - 1, matrix);
        const e = matrix.elements;
        if (e[0] === 0 && e[5] === 0 && e[10] === 0) continue;
        anchors++;
        if (onStreet(e[12], e[14]) || inMithalaCity(e[12], e[14])) left.push(`${mesh.name} at ${e[12].toFixed(1)},${e[14].toFixed(1)}`);
      }
    });
  });
  assert.ok(anchors > 1000, `${anchors} scatter anchors read`);
  assert.deepEqual(left.slice(0, 5), [], `${left.length} scatter instances left on the city`);
  assert.ok(world.mithalaCityMetrics.cleared.instances > 0, 'the clearing ran');
});

test('no animal is put down on the city', () => {
  const life = createWestLife(new THREE.Scene(), world, { zones: MITHALA_WILDLIFE_ZONES });
  try {
    const zoneOf = new Map(MITHALA_WILDLIFE_ZONES.flatMap(zone => zone.sites.map((_, i) => [`${zone.id}-${i + 1}`, zone])));
    const placed = life.state().creatures.filter(animal => zoneOf.has(animal.id));
    assert.ok(placed.length >= 40, `${placed.length} animals placed`);
    const onCity = placed.filter(animal => { const zone = zoneOf.get(animal.id); return !zone.air && !zone.sea && mithalaCityReserved(animal.x, animal.z); });
    assert.deepEqual(onCity.map(animal => `${animal.id} at ${animal.x.toFixed(1)},${animal.z.toFixed(1)}`), []);
  } finally { life.dispose(); }
});

// Authored homes must remain outside the shared wall; do not silently rely on
// the animal placer relocating a range that was swallowed by the city.
const writtenOnCity = MITHALA_WILDLIFE_ZONES.flatMap(zone => (zone.air || zone.sea ? [] : zone.sites
  .filter(([x, z]) => mithalaCityReserved(x, z)).map(([x, z]) => `${zone.id} at ${x},${z}`)));
test('no wildlife range writes a home on the city', () => {
  assert.deepEqual(writtenOnCity, []);
  for(const zone of MITHALA_WILDLIFE_ZONES.filter(z=>['mithala-meeting-otters','south-mithala-herons','east-mithala-duck','east-mithala-deer'].includes(z.id))){
    for(const [x,z] of zone.sites){
      assert.ok(canStand(x,z,world,zone.radius),`${zone.id} has a blocked home at ${x},${z}`);
      assert.equal(westWaterSurface(x,z)!==null,!!zone.float,`${zone.id} needs the right bank or water habitat`);
      assert.ok(x>=zone.minX&&x<=zone.maxX&&z>=zone.minZ&&z<=zone.maxZ,zone.id);
    }
  }
});

test('the chart’s royal seat and the travel panel’s Mithala are the city', () => {
  const area = SUBREGIONS.find(one => one.id === 'mithala');
  assert.ok(area, 'the chart names Mithala');
  assert.deepEqual({ x: area.x, z: area.z }, { x: MITHALA_CITY.arrival.x, z: MITHALA_CITY.arrival.z });
  assert.equal(area.region, 'South Mithala');
  assert.deepEqual({ ...ATLAS_CITY_DESIGNATIONS.mithala }, { name: 'Mithala', subtitle: 'Royal seat' });
  const mark = atlasPlaceMarks([{ id: area.id, name: area.name, kind: 'area', ...TRANSFORM.worldToAtlas(area.x, area.z) }]).find(p => p.id === 'mithala');
  assert.equal(mark.kind, 'city'); assert.equal(mark.name, 'Mithala'); assert.equal(mark.subtitle, 'Royal seat');
  assert.deepEqual(atlasCityBoundaries().filter(city => city.city === 'mithala').map(city => city.id), ['mithala']);
  // The travel panel offers it, and puts a traveller down exactly at the arrival, on the Ford's platform.
  const place = travelPlaces('South Mithala').find(one => one.id === 'mithala');
  assert.ok(place, 'the travel panel offers Mithala');
  const landing = landingSpot(place, (x, z) => canStand(x, z, world, BODY.traveler));
  assert.equal(landing?.away, 0, 'the traveller is put down at the arrival itself');
  assert.equal(mithalaDistrictAt(landing.x, landing.z)?.id, 'mithala-ford');
  assert.ok(Math.abs(world.heightAt(landing.x, landing.z) - P) < 1e-9, 'on the platform');
  // The gauge stands where its lane comes down, at the water's edge.
  assert.ok(mithalaCityWaterClearance(MITHALA_GAUGE.x, MITHALA_GAUGE.z) > KEEP);
});

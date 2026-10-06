import test from 'node:test';
import assert from 'node:assert/strict';
import { MITHALA_CITY, MITHALA_DISTRICTS, MITHALA_CURTAIN, MITHALA_FLOOD_BANKS, MITHALA_BRIDGES, MITHALA_FORD,
  MITHALA_QUAY, MITHALA_BARGES, MITHALA_STREETS, MITHALA_GATES, MITHALA_BUILDINGS, MITHALA_TOWER_STAIR, MITHALA_GAUGE,
  MITHALA_CITY_LANDMARKS, MITHALA_APPROACHES, mithalaCityWaterClearance, mithalaDistrictAt, mithalaDeckHeight, mithalaCityGround,
  mithalaCityReserved, inMithalaCity, polygonDepth, mithalaSegmentDistance } from '../src/content/regions/mithala/mithala-city.js';
import { hexAt, hexOwnerAt } from '../src/world/terrain/region-world.js';

const ring = poly => poly.map((a, i) => [a, poly[(i + 1) % poly.length]]);
const along = (a, b, n) => Array.from({ length: n + 1 }, (_, i) => ({ x: a.x + (b.x - a.x) * i / n, z: a.z + (b.z - a.z) * i / n }));
const corners = b => [-1, 0, 1].flatMap(i => [-1, 0, 1].map(k => ({ x: b.x + i * b.width / 2, z: b.z + k * b.depth / 2 })));
const district = id => MITHALA_DISTRICTS.find(d => d.id === id);

test('each district stands on its own hex, in its own Mithala country', () => {
  for (const d of MITHALA_DISTRICTS) {
    for (const p of d.outline) {
      assert.deepEqual(hexAt(p.x, p.z), d.hex, `${d.name} corner ${p.x},${p.z} leaves its hex`);
      assert.equal(hexOwnerAt(p.x, p.z), d.region, `${d.name} corner ${p.x},${p.z}`);
    }
  }
});

test('the platforms stand above the flood line and back from all three channels', () => {
  assert.ok(MITHALA_CITY.platform > MITHALA_CITY.floodLine + .5);
  for (const d of MITHALA_DISTRICTS) for (const [a, b] of ring(d.outline)) for (const p of along(a, b, 12))
    assert.ok(mithalaCityWaterClearance(p.x, p.z) >= MITHALA_CITY.platformClearance,
      `${d.name} edge at ${p.x.toFixed(1)},${p.z.toFixed(1)}: ${mithalaCityWaterClearance(p.x, p.z).toFixed(2)} m from water`);
});

test('the made ground: platform level inside, the river left alone, banks up and cut at the gates', () => {
  for (const d of MITHALA_DISTRICTS) {
    const h = mithalaCityGround(d.centre.x, d.centre.z, 12);
    assert.ok(Math.abs(h - MITHALA_CITY.platform) < 1e-6, `${d.name} centre ${h}`);
  }
  for (const course of [[-1700, -1440], [-1725, -1400], [-1675, -1400]]) assert.equal(mithalaCityGround(course[0], course[1], 10), 10);
  const bank = MITHALA_FLOOD_BANKS[0].line;
  const mid = { x: (bank[0].x + bank[1].x) / 2, z: (bank[0].z + bank[1].z) / 2 };
  assert.ok(mithalaCityGround(mid.x, mid.z, 12) > MITHALA_CITY.platform + 1.2, 'the bank crest stands up');
  for (const g of MITHALA_GATES.filter(g => g.kind === 'earth'))
    assert.ok(mithalaCityGround(g.x, g.z, 12) < MITHALA_CITY.platform + .05, `${g.name} is open`);
  assert.ok(inMithalaCity(-1750, -1443.2) && !inMithalaCity(-1700, -1440));
  assert.ok(mithalaCityReserved(-1700, -1440), 'the bridge is reserved');
});

test('the curtain closes the Fork except at its five gates; every bank has gates', () => {
  const fork = MITHALA_GATES.filter(g => g.district === 'mithala-fork');
  assert.equal(fork.length, 5);
  assert.deepEqual(fork.map(g => g.name).sort(), ['The Arm Bridge Gate', 'The Braid Bridge Gate', 'The Horizon Gate', 'The Quays Bridge Gate', 'The Water Gate']);
  const west = fork.find(g => g.name === 'The Horizon Gate');
  assert.ok(west.x < -1780, 'the land gate faces west');
  // No street crosses the curtain except through a gate.
  for (const [a, b] of ring(MITHALA_CURTAIN)) for (const p of along(a, b, 40)) {
    const gate = fork.some(g => Math.hypot(p.x - g.x, p.z - g.z) <= g.width / 2);
    if (gate) continue;
    for (const s of MITHALA_STREETS) for (let i = 1; i < s.points.length; i++)
      assert.ok(mithalaSegmentDistance(p.x, p.z, s.points[i - 1], s.points[i]) > s.width / 2 - .01, `${s.name} meets the curtain off a gate`);
  }
  for (const bank of MITHALA_FLOOD_BANKS) assert.ok(MITHALA_GATES.filter(g => g.district === bank.district).length >= 2, bank.district);
});

test('the bridges land on platform ground at both ends and stand clear of the water', () => {
  for (const b of MITHALA_BRIDGES) {
    assert.ok(polygonDepth(district(b.from).outline, b.a.x, b.a.z) > .5, `${b.name} Fork end`);
    assert.ok(polygonDepth(district(b.to).outline, b.b.x, b.b.z) > .5, `${b.name} far end`);
    let wet = 0;
    for (const p of along(b.a, b.b, 40)) {
      assert.equal(mithalaDeckHeight(p.x, p.z), b.deck);
      if (mithalaCityWaterClearance(p.x, p.z) < 0) wet++;
    }
    assert.ok(wet > 0, `${b.name} crosses its water`);
    assert.ok(b.deck > MITHALA_CITY.floodLine + .5, `${b.name} deck stands over the flood`);
  }
  // The ford: both ends on platforms, and it crosses the main channel where it is wadeable.
  assert.ok(polygonDepth(district('mithala-quays').outline, MITHALA_FORD.a.x, MITHALA_FORD.a.z) > .2);
  assert.ok(polygonDepth(district('mithala-ford').outline, MITHALA_FORD.b.x, MITHALA_FORD.b.z) > .2);
  assert.ok(along(MITHALA_FORD.a, MITHALA_FORD.b, 30).some(p => mithalaCityWaterClearance(p.x, p.z) < 0));
  for (const p of MITHALA_QUAY.points) assert.ok(mithalaCityWaterClearance(p.x, p.z) > MITHALA_QUAY.width / 2 - .01, 'the quay stands on the bank');
});

test('the grain quay’s face stands at the water’s edge, and the barges lie alongside it', () => {
  const half = MITHALA_QUAY.width / 2, runs = MITHALA_QUAY.points.slice(1).map((b, i) => {
    const a = MITHALA_QUAY.points[i], l = Math.hypot(b.x - a.x, b.z - a.z);
    return { a, b, l, ux: (b.x - a.x) / l, uz: (b.z - a.z) / l, yaw: Math.atan2(b.z - a.z, b.x - a.x) };
  });
  // The face is never in the water and never much more than a metre short of it, all along every run.
  for (const r of runs) for (const p of along(r.a, r.b, 40)) {
    const face = mithalaCityWaterClearance(p.x, p.z) - half;
    assert.ok(face >= 0 && face <= 1.1, `the quay's face at ${p.x.toFixed(1)},${p.z.toFixed(1)} stands ${face.toFixed(2)} m from the water`);
  }
  for (const barge of MITHALA_BARGES) {
    // Square to the run it lies against, afloat over its whole hull, and a metre or so off the face.
    const run = runs.reduce((best, r) => mithalaSegmentDistance(barge.x, barge.z, r.a, r.b) < mithalaSegmentDistance(barge.x, barge.z, best.a, best.b) ? r : best);
    assert.ok(Math.abs(barge.yaw - run.yaw) < .02, `${barge.id} lies at ${barge.yaw} against a run at ${run.yaw.toFixed(3)}`);
    const ux = Math.cos(barge.yaw), uz = Math.sin(barge.yaw), hull = [];
    for (const lx of [-.5, -.25, 0, .25, .5]) for (const lz of [-.5, 0, .5])
      hull.push({ x: barge.x + ux * lx * barge.length - uz * lz * barge.width, z: barge.z + uz * lx * barge.length + ux * lz * barge.width });
    for (const p of hull) assert.ok(mithalaCityWaterClearance(p.x, p.z) < 0, `${barge.id} is aground at ${p.x.toFixed(1)},${p.z.toFixed(1)}`);
    const gap = mithalaSegmentDistance(barge.x, barge.z, run.a, run.b) - half - barge.width / 2;
    // The mooring posts stand in the water between the face and the hull, so a barge lies against its posts, a
    // little under a metre and a half off the stone; nearer than that the hull's rubbing strake meets a post.
    assert.ok(gap > 0 && gap <= 1.45, `${barge.id} lies ${gap.toFixed(2)} m off the quay's face`);
  }
  // The Quay Stairs come out onto the deck, and their made ground stops a metre short of its inner edge.
  const stairs = MITHALA_STREETS.find(s => s.id === 'mithala-quay-stairs').points.at(-1);
  assert.equal(mithalaDeckHeight(stairs.x, stairs.z), MITHALA_QUAY.deck);
  const causeway = MITHALA_APPROACHES.find(a => a.id === 'mithala-quay-stairs-causeway').path.at(-1);
  const toDeck = Math.min(...runs.map(r => mithalaSegmentDistance(causeway.x, causeway.z, r.a, r.b))) - half;
  assert.ok(toDeck > .9 && toDeck < 1.1, `the causeway stops ${toDeck.toFixed(2)} m short of the quay`);
});

test('the streets join every gate, bridge and the ford into one network', () => {
  const nodes = [...MITHALA_STREETS.map(s => ({ id: s.id, segs: s.points.slice(1).map((b, i) => [s.points[i], b]) })),
    ...[...MITHALA_BRIDGES, MITHALA_FORD].map(b => ({ id: b.id, segs: [[b.a, b.b]] }))];
  const touches = (n, m) => n.segs.some(([a, b]) => m.segs.some(([c, d]) =>
    [a, b].some(p => mithalaSegmentDistance(p.x, p.z, c, d) < .05) || [c, d].some(p => mithalaSegmentDistance(p.x, p.z, a, b) < .05)));
  const seen = new Set([nodes[0].id]), queue = [nodes[0]];
  while (queue.length) { const n = queue.shift(); for (const m of nodes) if (!seen.has(m.id) && touches(n, m)) { seen.add(m.id); queue.push(m); } }
  assert.deepEqual(nodes.map(n => n.id).filter(id => !seen.has(id)), []);
  assert.ok(MITHALA_STREETS.some(s => s.id === 'mithala-dry-street'));
  for (const g of MITHALA_GATES) assert.ok(MITHALA_STREETS.some(s => s.id === g.street));
});

test('buildings stand on platform ground, inside the walls and clear of streets and water', () => {
  for (const b of MITHALA_BUILDINGS) {
    const d = district(b.district);
    for (const p of corners(b)) {
      if (b.onQuay) { assert.equal(mithalaDeckHeight(p.x, p.z), MITHALA_QUAY.deck, b.id); continue; }
      const inset = d.wall === 'curtain' ? MITHALA_CITY.curtain.inset + MITHALA_CITY.curtain.thickness / 2 + .5
        : MITHALA_CITY.bank.inset + MITHALA_CITY.bank.top / 2 + MITHALA_CITY.bank.side;
      assert.ok(polygonDepth(d.outline, p.x, p.z) >= inset, `${b.id} corner ${p.x},${p.z} is ${polygonDepth(d.outline, p.x, p.z).toFixed(2)} m in`);
      assert.equal(mithalaDistrictAt(p.x, p.z), d);
    }
    for (const s of MITHALA_STREETS) for (let i = 1; i < s.points.length; i++) for (const p of along(s.points[i - 1], s.points[i], 30))
      assert.ok(Math.abs(p.x - b.x) > b.width / 2 + s.width / 2 - .01 || Math.abs(p.z - b.z) > b.depth / 2 + s.width / 2 - .01, `${b.id} stands in ${s.name}`);
  }
  const tower = MITHALA_BUILDINGS.find(b => b.kind === 'tower');
  assert.ok(tower.height >= 38 && tower.height <= 42 && tower.district === 'mithala-fork');
  assert.ok(Math.hypot(tower.x - MITHALA_GAUGE.x, tower.z - MITHALA_GAUGE.z) < 25, 'the tower stands over the meeting');
  const gauge = mithalaCityWaterClearance(MITHALA_GAUGE.x, MITHALA_GAUGE.z);
  assert.ok(gauge > MITHALA_GAUGE.width / 2 && gauge < 6, `the gauge stands at the water's edge (${gauge.toFixed(2)})`);
  assert.ok(MITHALA_CITY_LANDMARKS.every(l => Number.isFinite(l.x) && Number.isFinite(l.z)));
});

test('no two buildings share ground, and none stands on a street, a bridge, the ford or the quay', () => {
  // A metre's gap at least between any two footprints (all are squared to the axes), measured along whichever axis
  // separates them.
  for (const [i, a] of MITHALA_BUILDINGS.entries()) for (const b of MITHALA_BUILDINGS.slice(i + 1)) {
    const gap = Math.max(Math.abs(a.x - b.x) - (a.width + b.width) / 2, Math.abs(a.z - b.z) - (a.depth + b.depth) / 2);
    assert.ok(gap >= 1, `${a.id} and ${b.id} are ${gap.toFixed(2)} m apart`);
  }
  // Every way, as a centre line and a half-width: no footprint reaches into one (touching its edge is allowed: the sky
  // tower's north face stands on the King's Way's south edge).
  const ways = [...MITHALA_STREETS.flatMap(s => s.points.slice(1).map((p, i) => ({ name: s.name, a: s.points[i], b: p, half: s.width / 2 }))),
    ...[...MITHALA_BRIDGES, MITHALA_FORD].map(b => ({ name: b.name, a: b.a, b: b.b, half: b.width / 2 })),
    ...MITHALA_QUAY.points.slice(1).map((p, i) => ({ name: MITHALA_QUAY.name, a: MITHALA_QUAY.points[i], b: p, half: MITHALA_QUAY.width / 2, quay: true }))];
  const footprintGap = (b, x, z) => Math.hypot(Math.max(0, Math.abs(x - b.x) - b.width / 2), Math.max(0, Math.abs(z - b.z) - b.depth / 2));
  for (const b of MITHALA_BUILDINGS) for (const w of ways) {
    if (w.quay && b.onQuay) continue;
    const n = Math.ceil(Math.hypot(w.b.x - w.a.x, w.b.z - w.a.z) / .1);
    let least = Infinity;
    for (let k = 0; k <= n; k++) least = Math.min(least, footprintGap(b, w.a.x + (w.b.x - w.a.x) * k / n, w.a.z + (w.b.z - w.a.z) * k / n) - w.half);
    assert.ok(least >= -.01, `${b.id} stands ${(-least).toFixed(2)} m into ${w.name}`);
  }
});

test('every ramp runs straight from its foot to its top, on its own street', () => {
  // A ramp that bends on its slope leaves a step on the inside of the bend (the ground there is read off the nearer of two
  // legs at different heights); the walker measured 21 degrees at Gauge Lane's. So each embankment and cutting is one leg,
  // as long as its run, and its street (or, at the ford, the ford's paving) runs along it.
  for (const a of MITHALA_APPROACHES.filter(a => a.run > 0)) {
    assert.equal(a.path.length, 2, `${a.id} bends`);
    const [foot, top] = a.path, length = Math.hypot(top.x - foot.x, top.z - foot.z);
    assert.ok(length >= a.run - .01, `${a.id} tops out ${(a.run - length).toFixed(2)} m past its end`);
    const street = MITHALA_STREETS.find(s => s.id === a.street);
    for (const p of along(foot, top, 20).filter(p => mithalaCityWaterClearance(p.x, p.z) > MITHALA_CITY.waterKeep + 3)) {
      // The ford's cuttings come up off the ford's own paving and go on up their streets.
      const off = Math.min(mithalaSegmentDistance(p.x, p.z, MITHALA_FORD.a, MITHALA_FORD.b) + (/ford-(quays|south)/.test(a.id) ? 0 : Infinity),
        ...street.points.slice(1).map((q, i) => mithalaSegmentDistance(p.x, p.z, street.points[i], q)));
      // Gauge Lane stops short of the gauge post; its cutting goes on to the gauge's foot.
      const atGauge = Math.hypot(p.x - MITHALA_GAUGE.x, p.z - MITHALA_GAUGE.z) < 3;
      assert.ok(off < 1 || atGauge, `${a.id} leaves ${street.name} by ${off.toFixed(2)} m at ${p.x.toFixed(1)},${p.z.toFixed(1)}`);
    }
  }
});

test('the sky tower stair climbs at a walkable grade from the door to the platform', () => {
  const { flights, landings, tower, top } = MITHALA_TOWER_STAIR;
  assert.equal(landings[0].y, 0);
  assert.ok(Math.abs(landings.at(-1).y - top) < 1e-6 && top > tower.height - 2.5);
  flights.forEach((f, i) => {
    assert.equal(f.from, landings[i]); assert.equal(f.to, landings[i + 1]);
    assert.ok(f.riser <= .2 && f.tread >= .27 && f.riser / f.tread <= .75, `flight ${i}: ${f.riser} on ${f.tread}`);
    const half = tower.size / 2 - tower.wall;
    for (const p of [f.from, f.to]) assert.ok(Math.abs(p.x - tower.x) <= half && Math.abs(p.z - tower.z) <= half);
  });
  // Headroom: the flight over any flight is a full turn (four flights) higher.
  assert.ok(flights[0].to.y * 4 >= 2.1 * 4 / 4 + 2.1);
});

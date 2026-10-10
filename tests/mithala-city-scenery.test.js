import test from 'node:test';
import assert from 'node:assert/strict';
import { sourceModule } from './module-loader.js';
import { MITHALA_CITY, MITHALA_CURTAIN, MITHALA_GATES, MITHALA_DISTRICTS, MITHALA_BRIDGES, MITHALA_STREETS, MITHALA_BANK_PASSAGES, MITHALA_BARGES, MITHALA_QUAY,
  MITHALA_GAUGE, polygonDepth, mithalaCityGround, mithalaSegmentDistance, mithalaCityWaterClearance } from '../src/content/regions/mithala/mithala-city.js';
import { createWalkSurfaces, colliderOverlapsHeight, WALK_STEP } from '../src/world/collision/walk-surfaces.js';
import { westWaterSurface, westGroundAt } from '../src/content/regions/western-regions/west-ground.js';

/**
 * Mithala's scenery (src/content/regions/mithala/mithala-city-scenery.js) built on its own, without the world: the made ground laid over a flat
 * plain twelve metres up, so the platforms, banks, skirts and cuttings are all there and nothing else is. The barges are
 * held to the real water of the plain's channels and the real bed under it, which is what they are built on.
 */
const THREE = await sourceModule('../vendor/three.module.js');
const { createMithalaCityScenery } = await sourceModule('../src/content/regions/mithala/mithala-city-scenery.js');
const ground = (x, z) => mithalaCityGround(x, z, 12);
const colliders = [];
const city = createMithalaCityScenery({ parent: new THREE.Group(), heightAt: ground, groundHeight: ground, colliders });
const walk = createWalkSurfaces(city.walkSurfaces, ground);
const BODY = .34;

/** The colliders a walker of radius `BODY` standing with its feet at `feet` would touch at (x, z). */
const blockers = (x, z, feet) => colliders.filter(c => colliderOverlapsHeight(c, feet)
  && (c.r !== undefined ? Math.hypot(x - c.x, z - c.z) < c.r + BODY : Math.abs(x - c.x) < c.hx + BODY && Math.abs(z - c.z) < c.hz + BODY));
/** Where a walker stands at (x, z) coming along the ground: the ground, or a step or ramp within a stride of it. */
const feetAt = (x, z) => walk.supportAt(x, z, { maxY: ground(x, z), stepUp: WALK_STEP }).height;
const along = (a, b, step, visit) => {
  const length = Math.hypot(b.x - a.x, b.z - a.z), n = Math.max(1, Math.ceil(length / step));
  for (let i = 0; i <= n; i++) visit(a.x + (b.x - a.x) * i / n, a.z + (b.z - a.z) * i / n, length * i / n, length);
};
const ids = list => list.map(c => c.id).join(', ');

test('Mithala\'s scenery stays inside its budget, in few merged batches', () => {
  const m = city.metrics;
  assert.ok(m.sceneryVertices > 0 && m.sceneryVertices < 270000, `${m.sceneryVertices} vertices in the streets, one outer wall circuit, bridges, gates, ford, gauge and quay`);
  assert.ok(m.vertices < 460000, `${m.vertices} vertices in the whole city`);
  assert.ok(city.root.children.length < 60, `${city.root.children.length} meshes`);
  for (const mesh of city.root.children) {
    assert.ok(mesh.isMesh, mesh.name);
    assert.ok(Number.isFinite(mesh.geometry.boundingSphere.radius) && mesh.geometry.boundingSphere.radius > 0, mesh.name);
  }
  assert.equal(m.bridges, MITHALA_BRIDGES.length);
  assert.equal(m.barges, MITHALA_BARGES.length);
  assert.equal(m.earthGates, MITHALA_BANK_PASSAGES.filter(g => g.kind === 'earth').length);
  assert.equal(m.gates, MITHALA_GATES.length);
  assert.equal(m.thresholds,0,'Internal gate thresholds have been removed');
  assert.equal(m.quays, 1);
  assert.ok(m.piers >= MITHALA_BRIDGES.length, `${m.piers} piers`);
  assert.ok(m.floodMarks >= 2 * m.piers, `${m.floodMarks} flood marks`);
  assert.ok(m.walkSurfaces === city.walkSurfaces.length || m.walkSurfaces <= city.walkSurfaces.length);
});

test('one outer perimeter encloses the quarters with open internal bridgeheads and river arches', () => {
  assert.equal(city.metrics.defenseCircuits,1);
  assert.equal(city.metrics.gates,3);
  assert.ok(city.metrics.riverArches>=3);
  const streets=MITHALA_STREETS.flatMap(s=>s.points.slice(1).map((b,i)=>({a:s.points[i],b,half:s.width/2})));
  let checked=0,wet=0;
  for(let i=0;i<MITHALA_CURTAIN.length;i++)along(MITHALA_CURTAIN[i],MITHALA_CURTAIN[(i+1)%MITHALA_CURTAIN.length],.35,(x,z)=>{
    if(streets.some(s=>mithalaSegmentDistance(x,z,s.a,s.b)<s.half+4))return;
    const clearance=mithalaCityWaterClearance(x,z);
    if(clearance<5.8){
      if(clearance<0){
        const water=westWaterSurface(x,z)??12;
        assert.equal(blockers(x,z,water+.3).filter(c=>['mithala-curtain','city-tower','river-arch'].includes(c.kind)).length,0,'The river remains open');wet++;
      }
      return;
    }
    if(clearance<7)return; // Dry abutment margins beside the arch openings.
    assert.ok(blockers(x,z,ground(x,z)).some(c=>c.kind==='mithala-curtain'||c.kind==='city-tower'),`Outer wall gap at ${x.toFixed(2)},${z.toFixed(2)}`);checked++;
  });
  assert.ok(checked>900);assert.ok(wet>30);
  for(const c of colliders.filter(c=>c.kind==='mithala-curtain'||c.kind==='city-tower')){
    assert.ok(Math.abs(polygonDepth(MITHALA_CURTAIN,c.x,c.z))<3,`${c.id} creates an internal fortification`);
  }
  for(const bridge of MITHALA_BRIDGES)for(const p of [bridge.a,bridge.b]){
    assert.ok(polygonDepth(MITHALA_CURTAIN,p.x,p.z)>8,'Bridgehead is inside the shared city wall');
    assert.equal(colliders.filter(c=>(c.kind==='mithala-curtain'||c.kind==='city-tower')&&Math.hypot(c.x-p.x,c.z-p.z)<8).length,0,'No gate towers divide the quarters');
  }
});

test('Every walking surface is valid, and the city\'s own stand on or above their ground', () => {
  assert.doesNotThrow(() => createWalkSurfaces(city.walkSurfaces, ground).supportAt(0, 0));
  assert.equal(new Set(city.walkSurfaces.map(s => s.id)).size, city.walkSurfaces.length);
  const own = city.walkSurfaces.filter(s => /^(mithala-.*-bridge-deck|mithala-quay-deck-|mithala-gauge-steps-)/.test(s.id));
  assert.equal(own.length, MITHALA_BRIDGES.length + MITHALA_QUAY.points.length - 1 + own.filter(s => s.id.startsWith('mithala-gauge-steps-')).length);
  for (const s of own) along(s.a, s.b, .5, (x, z, d, length) => {
    const y = s.a.y + (s.b.y - s.a.y) * d / length;
    assert.ok(y >= ground(x, z) - .02, `${s.id} at ${x.toFixed(1)},${z.toFixed(1)} is ${(ground(x, z) - y).toFixed(2)} m under its ground`);
  });
  // The quay's deck is at the layout's height all along its line, and its stair from the Quays comes out onto it.
  const q = MITHALA_QUAY.points;
  for (let i = 1; i < q.length; i++) along(q[i - 1], q[i], .5, (x, z) => {
    const support = walk.supportAt(x, z, { maxY: MITHALA_QUAY.deck, stepUp: WALK_STEP });
    assert.equal(support.height, MITHALA_QUAY.deck, `quay at ${x.toFixed(1)},${z.toFixed(1)}`);
  });
  const stairs = MITHALA_STREETS.find(s => s.id === 'mithala-quay-stairs').points.at(-1);
  assert.match(walk.supportAt(stairs.x, stairs.z, { maxY: MITHALA_QUAY.deck, stepUp: WALK_STEP }).id ?? '', /^mithala-quay-deck-/);
});

test('The steps down Gauge Lane go down from the Water Gate to the gauge without a break', () => {
  const steps = city.walkSurfaces.filter(s => s.id.startsWith('mithala-gauge-steps-'));
  assert.ok(steps.length >= 2 && city.metrics.gaugeSteps >= 8, `${steps.length} ramps, ${city.metrics.gaugeSteps} treads`);
  for (let i = 0; i < steps.length; i++) {
    const s = steps[i], length = Math.hypot(s.b.x - s.a.x, s.b.z - s.a.z);
    assert.equal(s.kind, 'ramp');
    assert.ok(s.b.y < s.a.y && (s.a.y - s.b.y) / length < .5, `${s.id} falls ${(s.a.y - s.b.y).toFixed(2)} in ${length.toFixed(2)}`);
    if (i) for (const k of ['x', 'y', 'z']) assert.ok(Math.abs(steps[i - 1].b[k] - s.a[k]) < 1e-9, `${steps[i - 1].id} meets ${s.id}`);
  }
  // They begin on the Water Gate's threshold, where the cutting has already taken the lane below the platform.
  const head = steps[0].a, gate = MITHALA_BANK_PASSAGES.find(g => g.name === 'The Water Gate');
  assert.ok(head.y - ground(head.x, head.z) >= 0 && head.y - ground(head.x, head.z) < .2, `the top step is ${(head.y - ground(head.x, head.z)).toFixed(2)} m over the threshold`);
  assert.ok(head.y < MITHALA_CITY.platform && Math.hypot(head.x - gate.x, head.z - gate.z) < 3, 'and at the gate');
  const foot = steps.at(-1).b, gauge = colliders.find(c => c.kind === 'mithala-gauge');
  assert.ok(Math.hypot(foot.x - MITHALA_GAUGE.x, foot.z - MITHALA_GAUGE.z) > gauge.r + BODY, 'the steps end clear of the gauge');
  assert.ok(Math.abs(foot.y - ground(foot.x, foot.z)) < .35, 'and a stride from the landing');
  assert.ok(gauge.minY < ground(MITHALA_GAUGE.x, MITHALA_GAUGE.z) - .3 && gauge.maxY > ground(MITHALA_GAUGE.x, MITHALA_GAUGE.z) + MITHALA_GAUGE.height - .1);
});

test('Each bridge deck is walkable from end to end, its whole width clear between the rails', () => {
  for (const bridge of MITHALA_BRIDGES) {
    const deck = city.walkSurfaces.find(s => s.id === `${bridge.id}-deck`);
    assert.ok(deck, bridge.id);
    assert.deepEqual([deck.kind, deck.a.x, deck.a.z, deck.b.x, deck.b.z, deck.a.y, deck.b.y, deck.width],
      ['deck', bridge.a.x, bridge.a.z, bridge.b.x, bridge.b.z, bridge.deck, bridge.deck, bridge.width]);
    const length = Math.hypot(bridge.b.x - bridge.a.x, bridge.b.z - bridge.a.z), ux = (bridge.b.x - bridge.a.x) / length, uz = (bridge.b.z - bridge.a.z) / length;
    along(bridge.a, bridge.b, .25, (x, z, s) => {
      const support = walk.supportAt(x, z, { maxY: bridge.deck, stepUp: WALK_STEP });
      assert.equal(support.height, bridge.deck, `${bridge.id} at ${s.toFixed(2)} m`);
      assert.equal(blockers(x, z, bridge.deck).length, 0, `${bridge.id} centre line at ${s.toFixed(2)} m: ${ids(blockers(x, z, bridge.deck))}`);
      // Out of the gates' passages, the deck is clear to its edges.
      if (MITHALA_BANK_PASSAGES.some(g => Math.hypot(x - g.x, z - g.z) < g.width / 2 + 2.5)) return;
      for (const side of [-1, 1]) {
        const o = side * (bridge.width / 2 - BODY - .02), px = x - uz * o, pz = z + ux * o;
        assert.equal(blockers(px, pz, bridge.deck).length, 0, `${bridge.id} edge at ${s.toFixed(2)} m: ${ids(blockers(px, pz, bridge.deck))}`);
      }
    });
    const rails = colliders.filter(c => c.kind === 'mithala-rail' && c.id.startsWith(bridge.id));
    assert.ok(rails.length > 10, `${bridge.id} has its rails`);
    for (const c of rails) {
      const across = Math.abs(-(c.x - bridge.a.x) * uz + (c.z - bridge.a.z) * ux);
      assert.ok(across - c.r >= bridge.width / 2 - 1e-6, `${c.id} stands outside the deck`);
      assert.ok(c.minY >= bridge.deck - .6, `${c.id} is above the water`);
    }
  }
});

test('The bridges stand on the bed, and the water passes under every span', () => {
  for (const bridge of MITHALA_BRIDGES) {
    const info = city.bridges.find(b => b.id === bridge.id), s = info.supports;
    const length = Math.hypot(bridge.b.x - bridge.a.x, bridge.b.z - bridge.a.z), ux = (bridge.b.x - bridge.a.x) / length, uz = (bridge.b.z - bridge.a.z) / length;
    assert.ok(s.length >= 2 && s[0] > 0 && s.at(-1) < length, `${bridge.id} supports ${s.map(v => v.toFixed(1))}`);
    for (const c of colliders.filter(c => (c.kind === 'mithala-pier' || c.kind === 'mithala-abutment') && c.id.startsWith(bridge.id)))
      assert.ok(c.minY < ground(c.x, c.z) - .3, `${c.id} is founded below its ground`);
    for (let k = 1; k < s.length; k++) {
      assert.ok(s[k] - s[k - 1] - 1.8 > 3, `${bridge.id} span ${k} is open for ${(s[k] - s[k - 1] - 1.8).toFixed(1)} m`);
      const mid = (s[k - 1] + s[k]) / 2;
      for (const o of [-bridge.width / 4, 0, bridge.width / 4]) {
        const x = bridge.a.x + ux * mid - uz * o, z = bridge.a.z + uz * mid + ux * o, feet = ground(x, z);
        assert.equal(blockers(x, z, feet).length, 0, `${bridge.id} under span ${k}: ${ids(blockers(x, z, feet))}`);
      }
    }
  }
});

test('No collider stands on a street\'s centre line or in a gate\'s passage', () => {
  // Walked from one end to the other, so a walker who comes along a causeway onto the quay is on its deck.
  for (const street of MITHALA_STREETS) {
    let feet = ground(street.points[0].x, street.points[0].z);
    for (let i = 1; i < street.points.length; i++) along(street.points[i - 1], street.points[i], .5, (x, z) => {
      feet = walk.supportAt(x, z, { maxY: feet, stepUp: WALK_STEP }).height;
      const hit = blockers(x, z, feet);
      assert.equal(hit.length, 0, `${street.id} at ${x.toFixed(1)},${z.toFixed(1)}: ${ids(hit)}`);
    });
  }
  for (const gate of [...MITHALA_BANK_PASSAGES,...MITHALA_GATES]) {
    const street = MITHALA_STREETS.find(s => s.id === gate.street);
    let best = null;
    for (let i = 1; i < street.points.length; i++) {
      const d = mithalaSegmentDistance(gate.x, gate.z, street.points[i - 1], street.points[i]);
      if (!best || d < best.d) best = { d, a: street.points[i - 1], b: street.points[i] };
    }
    const l = Math.hypot(best.b.x - best.a.x, best.b.z - best.a.z), sx = (best.b.x - best.a.x) / l, sz = (best.b.z - best.a.z) / l;
    const reach = street.width / 2 - BODY;
    for (let t = -1.6; t <= 1.6 + 1e-9; t += .4) for (const o of [-reach, 0, reach]) {
      const x = gate.x + sx * t - sz * o, z = gate.z + sz * t + sx * o, feet = feetAt(x, z), hit = blockers(x, z, feet);
      assert.equal(hit.length, 0, `${gate.name} at ${t.toFixed(1)}, ${o.toFixed(1)}: ${ids(hit)}`);
    }
  }
});

test('Gates stand on the made ground: jambs and gateposts are founded below it and the lintels clear it', () => {

  for (const gate of MITHALA_GATES) {

    const parts = colliders.filter(c => c.id.startsWith(`${gate.id}-`));
    assert.ok(parts.length >= 2, `${gate.name} has its jambs or posts`);
    for (const c of parts) {
      if(c.kind==='gate-arch'){
        assert.ok(c.minY > ground(gate.x,gate.z)+4, `${c.id} has pedestrian headroom`);
        continue;
      }
      assert.ok(c.minY < ground(c.x, c.z) - .5, `${c.id} is founded below its ground`);
      if (gate.kind === 'earth') assert.ok(c.maxY > ground(gate.x, gate.z) + 4.5, `${c.id} carries its lintel over the passage`);
    }
  }
});

test('The barges float on the channel\'s water, clear of its bed', () => {
  for (const barge of MITHALA_BARGES) {
    const hull = colliders.filter(c => c.kind === 'mithala-barge' && c.id.startsWith(`${barge.id}-`));
    assert.ok(hull.length >= 2, `${barge.id} has a hull`);
    const water = westWaterSurface(barge.x, barge.z);
    assert.notEqual(water, null, `${barge.id} is on the water`);
    for (const c of hull) {
      const here = westWaterSurface(c.x, c.z);
      assert.notEqual(here, null, `${c.id} is on the water`);
      assert.ok(c.minY < here - .2 && c.maxY > here + .5, `${c.id} sits in the water, from ${c.minY.toFixed(2)} to ${c.maxY.toFixed(2)} at ${here.toFixed(2)}`);
      assert.ok(c.minY > westGroundAt(c.x, c.z) + .1, `${c.id} clears the bed by ${(c.minY - westGroundAt(c.x, c.z)).toFixed(2)} m`);
    }
    // Every corner of the hull is over water too, so no end of it lies on a bank.
    const ux = Math.cos(barge.yaw), uz = Math.sin(barge.yaw);
    for (const [l, w] of [[-.5, -.5], [-.5, .5], [.5, -.5], [.5, .5]]) {
      const x = barge.x + ux * l * barge.length - uz * w * barge.width, z = barge.z + uz * l * barge.length + ux * w * barge.width;
      assert.notEqual(westWaterSurface(x, z), null, `${barge.id} corner ${l},${w} is over water`);
    }
  }
});

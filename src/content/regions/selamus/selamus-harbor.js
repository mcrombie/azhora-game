import * as THREE from 'three';
import { finishBuild } from '../../../world/loading/build-steps.js';
import { createSceneryBuilder } from '../../../world/scenery/scenery-builder.js';
import { createSelamusShip } from './selamus-ships.js';
import { SELAMUS_CANALS } from './selamus-city.js';
import { SEA_LEVEL } from '../../../world/terrain/region-world.js';

const freeze = Object.freeze;
const WOOD = '#795a3c', PALE = '#ac895c', DARK = '#49382c', ROPE = '#877252', BRONZE = '#ba9450', STONE = '#c2b79c', TEAL = '#286d72';
const point = (x, z) => freeze({ x, z });
// Sea berths and their shore attachments are surveyed against the authored
// Selemi/Southern Ascarth coasts. This is an open harbor, without moles or booms.
export const SELAMUS_PIERS = freeze([
  freeze({ id: 'selamus-west-pier', name: 'West Merchant Landing', a: point(-810, 2378), b: point(-789, 2378), width: 5, rampLength: 8, elevation: 3.2, kind: 'merchant' }),
  freeze({ id: 'selamus-south-pier', name: 'Exchange Freight Landing', a: point(-736, 2438), b: point(-736, 2398), width: 5, rampLength: 12, elevation: 3.2, kind: 'merchant' }),
  freeze({ id: 'selamus-east-pier', name: 'Fleet Provision Landing', a: point(-716, 2419), b: point(-712, 2383), width: 6, rampLength: 10, elevation: 3.2, kind: 'naval' }),
]);
const seaBerths = [
  { id: 'selamus-merchant-west-bay', name: 'Selemis western carrack', kind: 'merchant', x: -776, z: 2360, yaw: Math.PI, length: 36, accent: 0x286d72, pier: 'selamus-west-pier', mooringSide: 1 },
  { id: 'selamus-merchant-south-bay', name: 'Selemis exchange carrack', kind: 'merchant', x: -744, z: 2376, yaw: -2 * Math.PI / 3, length: 34, accent: 0x914238, pier: 'selamus-south-pier', mooringSide: 1 },
  { id: 'selamus-merchant-east-bay', name: 'Selemis eastern carrack', kind: 'merchant', x: -698, z: 2368, yaw: -Math.PI / 2, length: 38, accent: 0x35617b, pier: 'selamus-east-pier', mooringSide: 1 },
  { id: 'selamus-merchant-roadstead', name: 'Selemis ocean trader', kind: 'merchant', x: -905, z: 2280, yaw: -Math.PI / 2, length: 38, accent: 0x6d6841, mooring: 'anchor-buoy' },
  { id: 'selamus-galley-west', name: 'Selemis western guard galley', kind: 'galley', x: -847, z: 2278, yaw: -Math.PI / 2, length: 44, accent: 0x245c66, mooring: 'anchor-buoy' },
  { id: 'selamus-galley-northwest', name: 'Selemis sea-god ceremonial galley', kind: 'galley', x: -782, z: 2300, yaw: -5 * Math.PI / 6, length: 44, accent: 0x834137, mooring: 'anchor-buoy' },
  { id: 'selamus-galley-east', name: 'Selemis eastern guard galley', kind: 'galley', x: -636, z: 2358, yaw: -2 * Math.PI / 3, length: 44, accent: 0x236975, mooring: 'anchor-buoy' },
];

function canalBerth(id, canalId, segment, t, accent) {
  const canal = SELAMUS_CANALS.find(c => c.id === canalId), a = canal.points[segment], b = canal.points[segment + 1];
  const x = a.x + (b.x - a.x) * t, z = a.z + (b.z - a.z) * t;
  return freeze({ id, name: 'Selemis canal gondola', kind: 'gondola', x, z, yaw: Math.atan2(a.x - b.x, a.z - b.z), length: 8.5, accent, canal: canalId, canalWidth: canal.width, mooring: 'canal-poles' });
}
export const SELAMUS_BERTHS = freeze([
  ...seaBerths.map(freeze),
  canalBerth('selamus-gondola-west', 'selamus-grand-canal', 1, .7, 0x275e64),
  canalBerth('selamus-gondola-exchange', 'selamus-grand-canal', 3, .25, 0x943f39),
  canalBerth('selamus-gondola-tides', 'selamus-harbor-canal', 0, .5, 0x294e69),
  canalBerth('selamus-gondola-chandlers', 'selamus-west-canal', 0, .5, 0x716743),
  canalBerth('selamus-gondola-silk', 'selamus-east-canal', 2, .4, 0x934d58),
]);

/** Local ship coordinates to world coordinates; every vessel's bow is -Z. */
export function selamusBerthPoint(berth, x, z) {
  const c = Math.cos(berth.yaw), s = Math.sin(berth.yaw);
  return { x: berth.x + x * c + z * s, z: berth.z - x * s + z * c };
}

/** Conservative hull footprint for terrain audits, excluding sails and oars. */
export function selamusHullSamples(berth, spacing = 2) {
  if (!Number.isFinite(spacing) || spacing <= 0) throw new RangeError('Hull sampling spacing must be positive');
  const beam = berth.length * ({ merchant: 7 / 24, galley: 5.4 / 32, gondola: 1.85 / 10 })[berth.kind] * 1.04;
  const across = Math.max(2, Math.ceil(beam / spacing)), along = Math.max(2, Math.ceil(berth.length / spacing)), samples = [];
  for (let i = 0; i <= across; i++) for (let j = 0; j <= along; j++) samples.push(selamusBerthPoint(berth, beam * (i / across - .5), berth.length * (j / along - .5)));
  return samples;
}

function deckGeometry(b, deck) {
  const dx = deck.b.x - deck.a.x, dz = deck.b.z - deck.a.z, len = Math.hypot(dx, dz), nx = -dz / len, nz = dx / len;
  const at = (end, side) => [end.x + nx * side * deck.width / 2, end.y, end.z + nz * side * deck.width / 2];
  const corners = [at(deck.a, -1), at(deck.a, 1), at(deck.b, 1), at(deck.b, -1)], bottom = corners.map(p => [p[0], p[1] - .35, p[2]]);
  b.quad(PALE, ...corners);
  for (let i = 0; i < 4; i++) b.quad(DARK, corners[(i + 1) % 4], corners[i], bottom[i], bottom[(i + 1) % 4]);
  b.quad(DARK, bottom[3], bottom[2], bottom[1], bottom[0]);
  for (let distance = .45; distance < len; distance += 1.05) {
    const t = distance / len, x = deck.a.x + dx * t, z = deck.a.z + dz * t, y = deck.a.y + (deck.b.y - deck.a.y) * t + .009;
    b.beam(DARK, [x - nx * deck.width / 2, y, z - nz * deck.width / 2], [x + nx * deck.width / 2, y, z + nz * deck.width / 2], .022, .018);
  }
}

function rope(b, a, c, sag = .6, width = .045) {
  let previous = a;
  for (let i = 1; i <= 8; i++) {
    const t = i / 8, next = [a[0] + (c[0] - a[0]) * t, a[1] + (c[1] - a[1]) * t - sag * Math.sin(Math.PI * t), a[2] + (c[2] - a[2]) * t];
    b.beam(ROPE, previous, next, width); previous = next;
  }
}

function pedestal(b, x, y, z) {
  b.block(STONE, x, y, z, 1.65, 1.55, 1.65); b.box(BRONZE, x, y + 1.59, z, 1.9, .16, 1.9);
  b.cylinder(BRONZE, x, y + 1.66, z, .09, 3.1);
  b.beam(BRONZE, [x - .72, y + 3.8, z], [x + .72, y + 3.8, z], .14);
  for (const dx of [-.72, .72]) b.beam(BRONZE, [x + dx, y + 3.8, z], [x + dx, y + 4.55, z], .12);
}

export function createSelamusHarbor(...args) { return finishBuild(createSelamusHarborSteps(...args)); }

export function* createSelamusHarborSteps({ parent, heightAt, colliders }) {
  const root = new THREE.Group(); root.name = 'Selemis open trading harbor and naval fleet'; parent.add(root);
  const metrics = { ships: 0, merchants: 0, galleys: 0, gondolas: 0, piers: 0, bollards: 0, cranes: 0, moorings: 0, batches: 0, vertices: 0, colliders: 0 };
  const walkSurfaces = [], pierDecks = new Map();
  const push = collider => { colliders.push(collider); metrics.colliders++; };
  function* finish(b) { metrics.vertices += b.vertexCount; const mesh = yield* b.finishSteps(root); if (mesh) metrics.batches++; }
  for (const pier of SELAMUS_PIERS) {
    yield;
    const b = createSceneryBuilder(`Selemis ${pier.name}`), dx = pier.b.x - pier.a.x, dz = pier.b.z - pier.a.z, len = Math.hypot(dx, dz), ux = dx / len, uz = dz / len, nx = -uz, nz = ux;
    const landY = heightAt(pier.a.x, pier.a.z) + .045, y = pier.elevation;
    const joint = { x: pier.a.x + ux * pier.rampLength, y, z: pier.a.z + uz * pier.rampLength };
    const ramp = { id: `${pier.id}-ramp`, kind: 'ramp', a: { ...pier.a, y: landY }, b: joint, width: pier.width };
    const deck = { id: `${pier.id}-deck`, kind: 'deck', a: joint, b: { ...pier.b, y }, width: pier.width };
    walkSurfaces.push(ramp, deck); pierDecks.set(pier.id, deck);
    deckGeometry(b, ramp); deckGeometry(b, deck);
    // Piles and edge bollards leave the entire central walking lane clear.
    for (let d = pier.rampLength; d <= len + .01; d += 5) {
      const x = pier.a.x + ux * d, z = pier.a.z + uz * d;
      for (const side of [-1, 1]) {
        const px = x + nx * side * (pier.width / 2 - .38), pz = z + nz * side * (pier.width / 2 - .38), bed = Math.min(heightAt(px, pz), y - 1) - .65;
        b.cylinder(DARK, px, bed, pz, .22, y - bed + .62);
        b.cylinder(BRONZE, px, y + .5, pz, .3, .16);
        push({ id: `${pier.id}-bollard-${d}-${side}`, kind: 'bollard', x: px, z: pz, r: .3, minY: bed, maxY: y + .66 }); metrics.bollards++;
      }
    }
    // Rails flank only the access ramp, with neither a gate nor a cross-harbor wall.
    for (const side of [-1, 1]) {
      const a = [ramp.a.x + nx * side * (pier.width / 2 - .1), ramp.a.y + .88, ramp.a.z + nz * side * (pier.width / 2 - .1)];
      const c = [joint.x + nx * side * (pier.width / 2 - .1), y + .88, joint.z + nz * side * (pier.width / 2 - .1)];
      b.beam(WOOD, a, c, .075);
      for (let k = 0; k <= 3; k++) {
        const t = k / 3, at = [a[0] + (c[0] - a[0]) * t, a[1] + (c[1] - a[1]) * t, a[2] + (c[2] - a[2]) * t];
        b.beam(WOOD, [at[0], at[1] - .88, at[2]], at, .065);
      }
    }
    if (pier.kind === 'naval') {
      for (const side of [-1, 1]) {
        const x = pier.a.x + nx * side * (pier.width / 2 + 1.7), z = pier.a.z + nz * side * (pier.width / 2 + 1.7), floor = heightAt(x, z);
        pedestal(b, x, floor, z); push({ id: `${pier.id}-sea-god-${side}`, kind: 'naval-pedestal', x, z, r: 1.05, minY: floor, maxY: floor + 4.8 });
      }
    } else {
      const x = pier.b.x - ux * 4 + nx * (pier.width / 2 - .9), z = pier.b.z - uz * 4 + nz * (pier.width / 2 - .9);
      b.box(DARK, x, y + .25, z, 1.2, .5, 1.2);
      b.cylinder(WOOD, x, y + .5, z, .21, 5.5);
      b.beam(WOOD, [x, y + 5.7, z], [x + nx * 4, y + 6.1, z + nz * 4], .29);
      b.beam(BRONZE, [x, y + 2.2, z], [x + nx * 3.7, y + 6, z + nz * 3.7], .09);
      b.beam(ROPE, [x + nx * 3.8, y + 6, z + nz * 3.8], [x + nx * 3.8, y + 1.7, z + nz * 3.8], .045);
      b.rock(BRONZE, x + nx * 3.8, y + 1.5, z + nz * 3.8, .19, .24, .19);
      push({ id: `${pier.id}-crane`, kind: 'harbor-crane', x, z, r: .65, minY: y, maxY: y + 6.2 }); metrics.cranes++;
      for (let k = 0; k < 3; k++) {
        const cx = pier.a.x + ux * (pier.rampLength + 3 + k * 2.3) - nx * (pier.width / 2 - .75), cz = pier.a.z + uz * (pier.rampLength + 3 + k * 2.3) - nz * (pier.width / 2 - .75);
        b.box(k % 2 ? TEAL : WOOD, cx, y + .56, cz, 1.1, 1.12, 1.2);
        b.box(PALE, cx, y + 1.12, cz, 1.17, .08, 1.27);
        push({ id: `${pier.id}-cargo-${k}`, kind: 'harbor-cargo', x: cx, z: cz, r: .77, minY: y, maxY: y + 1.2 });
      }
    }
    metrics.piers++; yield* finish(b);
  }
  for (const berth of SELAMUS_BERTHS) {
    yield;
    const ship = createSelamusShip(berth); ship.name = berth.name; ship.position.set(berth.x, SEA_LEVEL, berth.z); ship.rotation.y = berth.yaw; ship.userData.berthId = berth.id; root.add(ship);
    metrics.ships++; metrics[berth.kind === 'merchant' ? 'merchants' : berth.kind === 'galley' ? 'galleys' : 'gondolas']++;
    metrics.batches += ship.userData.metrics.meshes; metrics.vertices += ship.userData.metrics.triangles * 3;
    const b = createSceneryBuilder(`Selemis ${berth.id} moorings`), freeboard = berth.kind === 'merchant' ? berth.length * .1 : berth.kind === 'galley' ? berth.length * .054 : .46;
    if (berth.mooring === 'canal-poles') {
      for (const end of [-1, 1]) {
        const at = selamusBerthPoint(berth, -berth.canalWidth / 2 + .65, berth.length * .37 * end), cleat = selamusBerthPoint(berth, -berth.length * .075, berth.length * .31 * end), bed = heightAt(at.x, at.z) - .3;
        b.cylinder(WOOD, at.x, bed, at.z, .13, SEA_LEVEL + 1.25 - bed);
        for (let k = 0; k < 3; k++) b.cylinder(k % 2 ? STONE : TEAL, at.x, SEA_LEVEL + .2 + k * .3, at.z, .135, .2);
        b.cone(BRONZE, at.x, SEA_LEVEL + 1.25, at.z, .17, .3);
        rope(b, [cleat.x, SEA_LEVEL + freeboard, cleat.z], [at.x, SEA_LEVEL + .94, at.z], .17, .025); metrics.moorings++;
      }
    } else if (berth.pier) {
      const pier = SELAMUS_PIERS.find(p => p.id === berth.pier), deck = pierDecks.get(berth.pier), dx = deck.b.x - deck.a.x, dz = deck.b.z - deck.a.z, len = Math.hypot(dx, dz);
      for (const end of [-1, 1]) {
        const cleat = selamusBerthPoint(berth, berth.mooringSide * ship.userData.metrics.hullBeam * .41, berth.length * .31 * end);
        const t = Math.max(.06, Math.min(.94, ((cleat.x - deck.a.x) * dx + (cleat.z - deck.a.z) * dz) / (len * len)));
        const center = { x: deck.a.x + dx * t, z: deck.a.z + dz * t }, side = Math.sign((cleat.x - center.x) * -dz + (cleat.z - center.z) * dx);
        const at = { x: center.x - dz / len * side * (pier.width / 2 - .38), z: center.z + dx / len * side * (pier.width / 2 - .38) };
        b.cylinder(BRONZE, at.x, deck.a.y, at.z, .2, .5);
        rope(b, [cleat.x, SEA_LEVEL + freeboard, cleat.z], [at.x, deck.a.y + .42, at.z], .35); metrics.moorings++;
      }
    } else {
      const buoy = selamusBerthPoint(berth, berth.length * .12, -berth.length * .73), cleat = selamusBerthPoint(berth, 0, -berth.length * .47);
      b.rock(TEAL, buoy.x, SEA_LEVEL + .25, buoy.z, 1.05, .62, 1.05);
      b.cylinder(BRONZE, buoy.x, SEA_LEVEL + .7, buoy.z, .09, .72);
      b.rock(BRONZE, buoy.x, SEA_LEVEL + 1.52, buoy.z, .16, .18, .16);
      rope(b, [cleat.x, SEA_LEVEL + freeboard, cleat.z], [buoy.x, SEA_LEVEL + .92, buoy.z], .6, .065); metrics.moorings++;
    }
    // The collision chain follows the real narrow hull, never the wide oars.
    for (const fraction of [-.29, 0, .29]) {
      const at = selamusBerthPoint(berth, 0, berth.length * fraction);
      push({ id: `${berth.id}-hull-${fraction}`, kind: 'ship', x: at.x, z: at.z, r: ship.userData.metrics.hullBeam * .46, minY: SEA_LEVEL - ship.userData.metrics.hullDraft, maxY: SEA_LEVEL + freeboard });
    }
    yield* finish(b);
  }
  return { root, metrics, walkSurfaces };
}

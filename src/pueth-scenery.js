import * as THREE from 'three';
import { REGION_CELLS, regionNameAt, landDistance, hexAt } from './region-world.js';
import { WORLD_SCALE } from './world-scale.js';
import {
  PUETH_RIVERS, TESSEN, TESSEN_BRIDGE, TESSEN_POST, RIMEHOLT, RIMEHOLT_BUILDINGS, RIMEHOLT_YARD, rimeholtPoint,
  PUETH_NPC_POSITIONS, PUETH_SIGNS, HIDEOUT_TRAIL_PENNANTS, FERADOM_BARRIER, PUETH_LANDMARKS, puethRiverDistance,
} from './pueth-world.js';
import { PUETH_RIVER_PROFILES, puethRiverSample, puethRiverHalfWidth, TESSEN_DECK_Y } from './world-terrain.js';
import { SURVEY } from './region-world.js';

/**
 * Pueth's scenery, in world metres: its two rivers, the Tessen bridge, the
 * army's road post, Rimeholt, the landmarks of the hills, the east and the
 * coast, and the region's own scatter of birch, fir and bare stone.
 *
 * `world.js` hands over the same toolkit `world-regions.js` receives. Every
 * batch of scatter is per block of two hexes, like the other regions', and the
 * static props are merged by `world.js`'s per-district batching.
 */
export function createPuethScenery(kit) {
  const { root, material, mesh, box, post, pebble, rope, cottage, fence, barrel, crate, wornPatch, trailSign,
    groundHeight, colliders, dummy, color, wood, woodLight, darkWood, cream, rockMat, roofGeometry, cylinder, round,
    roadDistance, riverMaterial, insideVillage, regionClear } = kit;
  let seed = 510331;
  const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  const range = (a, b) => a + random() * (b - a);
  const smooth = (a, b, x) => { const v = Math.max(0, Math.min(1, (x - a) / (b - a))); return v * v * (3 - 2 * v); };
  const group = new THREE.Group(); group.name = 'Pueth scenery'; root.add(group);
  const metrics = { trees: 0, birches: 0, firs: 0, rocks: 0, grass: 0, batches: 0, waterColliders: 0, railColliders: 0 };

  // -------------------------------------------------------------------------
  // Rivers: a ribbon of water, and blockers everywhere but the bridge lane
  // -------------------------------------------------------------------------
  const b = TESSEN_BRIDGE;
  const laneOffset = (x, z) => {
    const dx = x - b.crossing.x, dz = z - b.crossing.z;
    if (Math.abs(dx * b.axis.x + dz * b.axis.z) > b.halfSpan + 3) return Infinity;
    return dx * b.side.x + dz * b.side.z;
  };
  const riverSamples = {};
  for (const river of PUETH_RIVERS) {
    const profile = PUETH_RIVER_PROFILES.get(river.id), vertices = [], indices = [], outline = [];
    river.samples.forEach((sample, index) => {
      const half = puethRiverHalfWidth(river, profile[index]), y = profile[index].surface;
      vertices.push(sample.x - sample.nx * half, y, sample.z - sample.nz * half, sample.x + sample.nx * half, y, sample.z + sample.nz * half);
      if (index) { const v = index * 2; indices.push(v - 2, v, v - 1, v - 1, v, v + 1); }
      outline.push({ x: sample.x, z: sample.z, nx: sample.nx, nz: sample.nz, half });
    });
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.setIndex(indices); geometry.computeVertexNormals(); geometry.computeBoundingSphere();
    const water = new THREE.Mesh(geometry, riverMaterial); water.name = river.name; group.add(water);
    riverSamples[river.id] = outline;
    for (let i = 1; i < river.samples.length; i++) {
      const a = river.samples[i - 1], c = river.samples[i], half = outline[i].half;
      if (landDistance(c.x, c.z) < -3) continue;
      const close = river === TESSEN && Math.hypot(c.x - b.crossing.x, c.z - b.crossing.z) < 20;
      const offsets = close ? [-4.5, -3, -1.5, 0, 1.5, 3, 4.5] : [-half * .62, 0, half * .62];
      const radius = close ? 1.1 : Math.max(1.5, half * .62);
      const count = close ? 3 : 1;
      // The last piece also blocks its far end, so the river's mouth is water to the shore.
      for (let k = 0; k < count + (i === river.samples.length - 1 ? 1 : 0); k++) {
        const t = k / count, x = a.x + (c.x - a.x) * t, z = a.z + (c.z - a.z) * t;
        for (const offset of offsets) {
          if (Math.abs(offset) > half + .6) continue;
          let px = x + a.nx * offset, pz = z + a.nz * offset;
          const lane = river === TESSEN ? laneOffset(px, pz) : Infinity;
          if (Number.isFinite(lane) && Math.abs(lane) < radius + b.laneHalf) {
            if (Math.abs(lane) + radius <= b.laneHalf) continue;
            const push = radius + b.laneHalf - Math.abs(lane), away = Math.sign(lane) || 1;
            px += b.side.x * away * push; pz += b.side.z * away * push;
          }
          colliders.push({ x: px, z: pz, r: radius, kind: 'river-water', river: river.id });
          metrics.waterColliders++;
        }
      }
    }
    // Reeds and bank stones, sparing the crossing.
    const reed = material('#6f7d5b'), bankStone = material('#848a80');
    for (let i = 0; i < Math.round(river.samples.length * .9); i++) {
      const index = Math.floor(random() * river.samples.length), sample = river.samples[index], side = random() < .5 ? -1 : 1;
      const offset = outline[index].half + range(.5, 3.2), x = sample.x + sample.nx * offset * side, z = sample.z + sample.nz * offset * side;
      if (Math.hypot(x - b.crossing.x, z - b.crossing.z) < 14 || roadDistance(x, z) < 3 || landDistance(x, z) < 2 || insideVillage(x, z)) continue;
      const y = groundHeight(x, z), height = range(.6, 1.3);
      post(reed, x, y + height / 2, z, .024, height, group);
      if (i % 3 === 0) pebble(bankStone, x + .35, groundHeight(x + .35, z) + .1, z, .38, .2, .3, group);
    }
  }

  // -------------------------------------------------------------------------
  // The Tessen bridge: a timber trestle, one lane, rails over the water
  // -------------------------------------------------------------------------
  const deckY = TESSEN_DECK_Y, surface = puethRiverSample(TESSEN, b.crossing.x, b.crossing.z).surface;
  const bridge = new THREE.Group(); bridge.name = 'The Tessen bridge';
  bridge.position.set(b.crossing.x, 0, b.crossing.z); bridge.rotation.y = b.heading; group.add(bridge);
  const plank = material('#9d7b58'), beam = material('#5d4832');
  for (let along = -b.halfSpan; along <= b.halfSpan; along += .62) box(along % 2 < .62 ? woodLight : plank, 0, deckY, along, 4.8, .16, .56, bridge);
  for (const side of [-1, 1]) {
    box(beam, side * 1.9, deckY - .32, 0, .26, .46, b.halfSpan * 2 + .4, bridge);           // stringers
    for (let along = -b.halfSpan; along <= b.halfSpan + .01; along += 4.25) post(wood, side * 2.55, deckY + .55, along, .1, 1.3, bridge);
    box(woodLight, side * 2.55, deckY + 1.12, 0, .1, .12, b.halfSpan * 2, bridge);             // handrail
    box(wood, side * 2.55, deckY + .62, 0, .07, .08, b.halfSpan * 2, bridge);                  // mid rail
    // Piles down to the river bed, braced across.
    for (const along of [-4.2, 0, 4.2]) {
      const bottom = surface - 1.2, height = deckY - .4 - bottom;
      post(darkWood, side * 1.9, bottom + height / 2, along, .17, height, bridge);
    }
  }
  for (const along of [-4.2, 0, 4.2]) {
    box(beam, 0, deckY - .62, along, 4.2, .22, .26, bridge);
    const brace = box(darkWood, 0, (deckY - .6 + surface) / 2, along, .12, Math.hypot(3.8, deckY - surface) * .9, .12, bridge);
    brace.rotation.z = Math.atan2(3.8, deckY - surface);
  }
  // Rails as a line of small colliders over the water only; over the banks the deck is ordinary road.
  const bridgePoint = (along, across) => ({ x: b.crossing.x + b.axis.x * along + b.side.x * across, z: b.crossing.z + b.axis.z * along + b.side.z * across });
  for (const side of [-1, 1]) for (let along = -b.halfSpan; along <= b.halfSpan; along += .6) {
    const spot = bridgePoint(along, side * 2.8);
    if (puethRiverDistance(spot.x, spot.z) > TESSEN.halfWidth + .3) continue;
    colliders.push({ x: spot.x, z: spot.z, r: .35, kind: 'bridge-rail', bridge: b.id });
    metrics.railColliders++;
  }
  // Abutments of stacked logs where the deck meets each bank.
  for (const end of [-1, 1]) for (const side of [-1, 1]) {
    const spot = bridgePoint(end * (b.halfSpan - .4), side * 2.7);
    post(darkWood, spot.x, deckY - .3, spot.z, .22, 1.9, group);
  }

  // -------------------------------------------------------------------------
  // The army's road post at the Pueth end of the bridge
  // -------------------------------------------------------------------------
  const P = TESSEN_POST, yardY = groundHeight(P.yard.x, P.yard.z);
  wornPatch(P.yard.x, P.yard.z, 8.5, '#a39a78', 1.1);
  const stake = material('#6a5540'), stakeTip = new THREE.ConeGeometry(.16, .42, 5);
  const palisade = (x, z) => {
    const y = groundHeight(x, z), h = 2.6 + ((x * 7.1 + z * 3.3) % 1 + 1) % 1 * .45;
    post(stake, x, y + h / 2, z, .16, h, group);
    mesh(stakeTip, stake, x, y + h + .2, z, 1, 1, 1, group);
  };
  for (let t = -1; t <= 1.0001; t += .1) {
    for (const [x, z] of [[P.yard.x - P.halfX, P.yard.z + t * P.halfZ], [P.yard.x + t * P.halfX, P.yard.z - P.halfZ], [P.yard.x + t * P.halfX, P.yard.z + P.halfZ]]) palisade(x, z);
    const z = P.yard.z + t * P.halfZ;
    if (Math.abs(z - P.gate.z) > P.gateHalf) palisade(P.yard.x + P.halfX, z);
  }
  // Wall colliders, leaving the gate open.
  colliders.push({ x: P.yard.x - P.halfX, z: P.yard.z, hx: .25, hz: P.halfZ, kind: 'palisade' });
  colliders.push({ x: P.yard.x, z: P.yard.z - P.halfZ, hx: P.halfX, hz: .25, kind: 'palisade' });
  colliders.push({ x: P.yard.x, z: P.yard.z + P.halfZ, hx: P.halfX, hz: .25, kind: 'palisade' });
  const eastNorth = (P.gate.z - P.gateHalf + P.yard.z - P.halfZ) / 2, eastSouth = (P.gate.z + P.gateHalf + P.yard.z + P.halfZ) / 2;
  colliders.push({ x: P.yard.x + P.halfX, z: eastNorth, hx: .25, hz: (P.gate.z - P.gateHalf - (P.yard.z - P.halfZ)) / 2, kind: 'palisade' });
  colliders.push({ x: P.yard.x + P.halfX, z: eastSouth, hx: .25, hz: (P.yard.z + P.halfZ - (P.gate.z + P.gateHalf)) / 2, kind: 'palisade' });
  // The gate: two tall posts, a lintel and the army's standard.
  const legionRed = material('#8c3f38');
  for (const side of [-1, 1]) post(wood, P.gate.x, groundHeight(P.gate.x, P.gate.z + side * (P.gateHalf + .2)) + 1.8, P.gate.z + side * (P.gateHalf + .2), .19, 3.6, group);
  box(woodLight, P.gate.x, yardY + 3.5, P.gate.z, .3, .28, P.gateHalf * 2 + 1.2, group);
  const standard = box(legionRed, P.gate.x + .2, yardY + 2.65, P.gate.z + .9, .05, 1.0, .7, group); standard.name = 'Tessen post standard';
  // The watch hut: plank walls, a turf-dark roof, a door onto the yard.
  const hut = new THREE.Group(); hut.name = 'Tessen post watch hut';
  hut.position.set(P.hut.x, groundHeight(P.hut.x, P.hut.z), P.hut.z); hut.rotation.y = Math.PI / 2; group.add(hut);
  box(material('#7a6a55'), 0, 1.25, 0, 4.2, 2.5, 3.4, hut);
  mesh(roofGeometry(5.0, 4.2, 1.3), material('#4f4a40'), 0, 2.5, 0, 1, 1, 1, hut);
  box(darkWood, 0, .95, 1.72, .95, 1.9, .08, hut);
  for (const x of [-2.12, 2.12]) box(darkWood, x, 1.25, 0, .16, 2.6, 3.5, hut);
  colliders.push({ x: P.hut.x, z: P.hut.z, hx: 1.85, hz: 2.2, kind: 'watch-hut' });
  // The beacon over the bridge: a tall tripod and an iron basket of split birch, ready to light.
  const beaconY = groundHeight(P.beacon.x, P.beacon.z);
  for (let i = 0; i < 3; i++) {
    const angle = i * Math.PI * 2 / 3, leg = post(wood, P.beacon.x + Math.sin(angle) * .7, beaconY + 2.4, P.beacon.z + Math.cos(angle) * .7, .1, 4.9, group);
    leg.rotation.set(Math.cos(angle) * -.15, 0, Math.sin(angle) * .15);
  }
  post(material('#3f3d3a'), P.beacon.x, beaconY + 4.85, P.beacon.z, .62, .5, group);
  for (let i = 0; i < 5; i++) { const log = post(material('#d8d3c4'), P.beacon.x, beaconY + 5.15 + i * .06, P.beacon.z, .07, 1.0, group); log.rotation.set(Math.PI / 2, i * .63, 0); }
  colliders.push({ x: P.beacon.x, z: P.beacon.z, r: .9, kind: 'beacon' });
  // A spear rack, a shield and a bench inside the yard.
  const rackX = P.yard.x - 3.5, rackZ = P.yard.z + 5.5, rackY = groundHeight(rackX, rackZ);
  box(wood, rackX, rackY + .9, rackZ, 2.2, .1, .12, group);
  for (let i = 0; i < 4; i++) { const spear = post(material('#8b7a60'), rackX - .8 + i * .52, rackY + 1.1, rackZ + .05, .03, 2.2, group); spear.rotation.z = .08; }
  post(legionRed, rackX + 1.6, rackY + .55, rackZ + .3, .42, .08, group).rotation.x = Math.PI / 2;
  colliders.push({ x: rackX, z: rackZ, hx: 1.2, hz: .3, kind: 'spear-rack' });
  barrel(P.yard.x + 3.5, P.yard.z - 5.8, .85, group); crate(P.yard.x + 2.2, P.yard.z - 6.2, .75, null, group);
  colliders.push({ x: P.yard.x + 2.9, z: P.yard.z - 6, r: .9, kind: 'stores' });

  // Cloth scraps on the camp's side trail, the same blue as the camp's own.
  const cloth = material('#548ca2', { side: THREE.DoubleSide }), patch = material('#d5c18b', { side: THREE.DoubleSide });
  for (const spot of HIDEOUT_TRAIL_PENNANTS) {
    const y = groundHeight(spot.x, spot.z);
    post(material('#735a3d'), spot.x, y + 1.2, spot.z, .06, 2.4, group);
    const rag = box(cloth, spot.x + .45, y + 2.0, spot.z, .9, .55, .03, group); rag.rotation.z = -.12;
    box(patch, spot.x + .32, y + 2.02, spot.z + .03, .26, .22, .02, group);
    colliders.push({ x: spot.x, z: spot.z, r: .12, kind: 'trail-pennant' });
  }

  // -------------------------------------------------------------------------
  // Rimeholt: a palisaded timber town on the Feradom road
  // -------------------------------------------------------------------------
  const T = RIMEHOLT, alongAngle = Math.atan2(T.along.x, T.along.z);
  const faceRoad = side => Math.atan2(-Math.sign(side) * T.across.x, -Math.sign(side) * T.across.z);
  wornPatch(T.square.x, T.square.z, 16, '#a09a80', .9);
  for (let i = 0; i < 132; i++) {
    const angle = i / 132 * Math.PI * 2, x = T.square.x + Math.sin(angle) * T.palisadeRadius, z = T.square.z + Math.cos(angle) * T.palisadeRadius;
    if (roadDistance(x, z) < 3.4) continue;                              // the two gates, where the road passes
    palisade(x, z);
    colliders.push({ x, z, r: .75, kind: 'palisade' });
  }
  for (const end of [-1, 1]) {
    const gate = rimeholtPoint(end * T.palisadeRadius, 0);
    for (const side of [-1, 1]) {
      const x = gate.x + T.across.x * side * 3.4, z = gate.z + T.across.z * side * 3.4, y = groundHeight(x, z);
      post(wood, x, y + 2.3, z, .26, 4.6, group);
      colliders.push({ x, z, r: .45, kind: 'town-gate' });
    }
    const lintel = box(woodLight, gate.x, groundHeight(gate.x, gate.z) + 4.4, gate.z, 7.6, .34, .34, group);
    lintel.rotation.y = Math.atan2(T.across.x, T.across.z) - Math.PI / 2;
  }
  for (const building of RIMEHOLT_BUILDINGS) {
    cottage(building.x, building.z, building.width, building.depth, building.height, building.roof, building.wall, faceRoad(building.b), group);
  }
  const garrison = RIMEHOLT_BUILDINGS.find(building => building.id === 'garrison-house');
  const flagPole = rimeholtPoint(garrison.a + 5.6, garrison.b + 3.2), flagY = groundHeight(flagPole.x, flagPole.z);
  post(wood, flagPole.x, flagY + 2.6, flagPole.z, .1, 5.2, group);
  box(legionRed, flagPole.x + .35, flagY + 4.5, flagPole.z, .7, 1.0, .05, group).name = 'Rimeholt garrison standard';
  colliders.push({ x: flagPole.x, z: flagPole.z, r: .3, kind: 'legion-standard' });
  // The well on the square.
  const well = RIMEHOLT_YARD.well, wellY = groundHeight(well.x, well.z);
  for (let i = 0; i < 8; i++) { const angle = i / 8 * Math.PI * 2; box(rockMat, well.x + Math.sin(angle) * .95, wellY + .45, well.z + Math.cos(angle) * .95, .5, .9, .5, group); }
  for (const side of [-1, 1]) post(wood, well.x + T.along.x * side * 1.1, wellY + 1.5, well.z + T.along.z * side * 1.1, .1, 2.2, group);
  box(woodLight, well.x, wellY + 2.6, well.z, .5, .16, 2.6, group).rotation.y = alongAngle;
  colliders.push({ x: well.x, z: well.z, r: 1.4, kind: 'town-well' });
  // The timber yard: an open shed and stacks of cold-birch, pale bark and dark scars.
  const shed = RIMEHOLT_YARD.shed, shedY = groundHeight(shed.x, shed.z);
  const shedGroup = new THREE.Group(); shedGroup.position.set(shed.x, shedY, shed.z); shedGroup.rotation.y = alongAngle; group.add(shedGroup);
  for (const sx of [-1, 0, 1]) for (const sz of [-1, 1]) post(wood, sx * 4.2, 1.7, sz * 3.2, .16, 3.4, shedGroup);
  mesh(roofGeometry(10.4, 8.0, 2.0), material('#4d4a42'), 0, 3.4, 0, 1, 1, 1, shedGroup);
  box(woodLight, 0, .95, -2.6, 8.6, .2, 1.1, shedGroup);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const lx = sx * 4.2, lz = sz * 3.2, c = Math.cos(alongAngle), s = Math.sin(alongAngle);
    colliders.push({ x: shed.x + lx * c + lz * s, z: shed.z - lx * s + lz * c, r: .5, kind: 'sawmill-post' });
  }
  const birchBark = material('#d9d5c8'), birchEnd = material('#c9b48c');
  for (const stack of RIMEHOLT_YARD.stacks) {
    const stackY = groundHeight(stack.x, stack.z);
    for (let i = 0; i < stack.count; i++) {
      const row = i < 3 ? 0 : i < 5 ? 1 : 2, slot = i < 3 ? i : i < 5 ? i - 3 : 0;
      const offset = (slot - (row === 0 ? 1 : row === 1 ? .5 : 0)) * .78;
      const lx = T.along.x * offset, lz = T.along.z * offset;
      const log = mesh(cylinder, i % 2 ? birchBark : material('#cfcabb'), stack.x + lx, stackY + .4 + row * .68, stack.z + lz, .38, 5.2, .38, group);
      log.rotation.set(0, alongAngle, Math.PI / 2);
      if (i % 2 === 0) pebble(darkWood, stack.x + lx + T.across.x * .2, stackY + .55 + row * .68, stack.z + lz + T.across.z * .2, .12, .05, .2, group);
    }
    pebble(birchEnd, stack.x + T.across.x * 2.6, stackY + .4, stack.z + T.across.z * 2.6, .36, .36, .08, group);
    colliders.push({ x: stack.x, z: stack.z, r: 2.6, kind: 'log-stack' });
  }
  for (const [a, b2] of [[30, 6], [-30, -5]]) { const spot = rimeholtPoint(a, b2); barrel(spot.x, spot.z, .9, group); colliders.push({ x: spot.x, z: spot.z, r: .5, kind: 'barrel' }); }
  // Dagny's timber cart by the north gate.
  const cartSpot = rimeholtPoint(29, 9.5), cartY = groundHeight(cartSpot.x, cartSpot.z);
  const cart = new THREE.Group(); cart.position.set(cartSpot.x, cartY + .7, cartSpot.z); cart.rotation.y = alongAngle; group.add(cart);
  box(woodLight, 0, 0, 0, 2.0, .18, 4.2, cart);
  for (const side of [-1, 1]) {
    const wheel = mesh(new THREE.TorusGeometry(.66, .1, 5, 12), darkWood, side * 1.1, -.05, -.9, 1, 1, 1, cart); wheel.rotation.y = Math.PI / 2;
    const wheel2 = mesh(new THREE.TorusGeometry(.66, .1, 5, 12), darkWood, side * 1.1, -.05, .9, 1, 1, 1, cart); wheel2.rotation.y = Math.PI / 2;
  }
  for (let i = 0; i < 3; i++) { const log = mesh(cylinder, birchBark, -.55 + i * .55, .4, 0, .26, 4.0, .26, cart); log.rotation.x = Math.PI / 2; }
  colliders.push({ x: cartSpot.x, z: cartSpot.z, r: 2.1, kind: 'cart' });
  for (const [a, b2, length, turn] of [[-20, 20, 9, 0], [20, -21, 8, 0], [-33, 3, 6, Math.PI / 2]]) {
    const spot = rimeholtPoint(a, b2); fence(spot.x, spot.z, length, alongAngle + Math.PI / 2 + turn, group);
  }

  // -------------------------------------------------------------------------
  // Landmarks of the coast, the hills, the east and the Feradom road
  // -------------------------------------------------------------------------
  const landmark = id => PUETH_LANDMARKS.find(place => place.id === id);
  {
    const spot = landmark('birch-landing'), y = groundHeight(spot.x, spot.z);
    wornPatch(spot.x, spot.z, 5.5, '#aaa487');
    for (let i = 0; i < 7; i++) {
      const row = i < 4 ? 0 : i < 6 ? 1 : 2, offset = (i < 4 ? i - 1.5 : i < 6 ? i - 4.5 : 0) * .8;
      const log = mesh(cylinder, i % 3 ? birchBark : material('#c8c3b3'), spot.x + offset, y + .42 + row * .7, spot.z, .4, 6.0, .4, group);
      log.rotation.set(Math.PI / 2, 0, 0);
    }
    colliders.push({ x: spot.x, z: spot.z, hx: 1.9, hz: 3.1, kind: 'log-stack' });
    post(wood, spot.x + 3.2, y + 1.1, spot.z - 2.6, .1, 2.2, group);
  }
  {
    const spot = landmark('grey-shoulder'), y = groundHeight(spot.x, spot.z), stone = material('#9a9d93');
    for (let i = 0; i < 9; i++) {
      const tier = i < 5 ? 0 : i < 8 ? 1 : 2, angle = i * 1.26, r = [1.1, .6, 0][tier];
      pebble(stone, spot.x + Math.sin(angle) * r, y + .35 + tier * .62, spot.z + Math.cos(angle) * r, .62 - tier * .12, .4, .55 - tier * .1, group);
    }
    colliders.push({ x: spot.x, z: spot.z, r: 1.6, kind: 'cairn' });
  }
  {
    const spot = landmark('cold-hearth'), y = groundHeight(spot.x, spot.z);
    const shelter = new THREE.Group(); shelter.position.set(spot.x - 3, y, spot.z); shelter.rotation.y = -.4; group.add(shelter);
    mesh(roofGeometry(3.6, 3.2, 1.6), material('#5e6448'), 0, 0, 0, 1, 1, 1, shelter);
    box(material('#5a5a44'), 0, .5, -1.5, 3.4, 1.0, .5, shelter);
    colliders.push({ x: spot.x - 3, z: spot.z, r: 1.9, kind: 'turf-shelter' });
    for (let i = 0; i < 8; i++) { const angle = i / 8 * Math.PI * 2; pebble(rockMat, spot.x + 1.8 + Math.sin(angle) * .7, y + .12, spot.z + Math.cos(angle) * .7, .22, .16, .2, group); }
  }
  {
    const spot = landmark('ordel-mouth'), y = groundHeight(spot.x, spot.z);
    post(material('#6d6a5f'), spot.x, y + .9, spot.z, .16, 1.8, group);
    pebble(material('#8f9187'), spot.x + .6, y + .2, spot.z + .4, .6, .35, .5, group);
    colliders.push({ x: spot.x, z: spot.z, r: .5, kind: 'marker-stone' });
  }
  {
    // The army's barrier across the Feradom road: a closed bar between two posts, and a rope line east and west.
    const F = FERADOM_BARRIER, y = groundHeight(F.x, F.z);
    for (const side of [-1, 1]) { post(wood, F.x + side * 3, groundHeight(F.x + side * 3, F.z) + 1.3, F.z, .18, 2.6, group); }
    box(material('#c4ad76'), F.x, y + 1.15, F.z, 6.6, .2, .2, group).name = 'Feradom road barrier';
    box(legionRed, F.x, y + 1.6, F.z + .12, 1.2, .5, .04, group);
    for (let x = F.x - F.halfWidth; x <= F.x + F.halfWidth; x += 8) {
      if (Math.abs(x - F.x) < 5) continue;
      const py = groundHeight(x, F.z);
      post(wood, x, py + .64, F.z, .085, 1.28, group);
      if (x + 8 <= F.x + F.halfWidth && Math.abs(x + 8 - F.x) >= 5) rope([
        new THREE.Vector3(x, py + 1.0, F.z), new THREE.Vector3(x + 4, groundHeight(x + 4, F.z) + .8, F.z), new THREE.Vector3(x + 8, groundHeight(x + 8, F.z) + 1.0, F.z),
      ], .03, cream, group);
    }
    colliders.push({ x: F.x, z: F.z, hx: F.halfWidth, hz: .1, kind: 'frontier' });
  }
  for (const sign of PUETH_SIGNS) trailSign(sign.x, sign.z, 1, sign.label, sign.yaw, sign.returnLabel, root);

  // -------------------------------------------------------------------------
  // Scatter: birch and fir thick by the Tessen, open grass in the valley, bare hills north
  // -------------------------------------------------------------------------
  const trunkGeometry = new THREE.CylinderGeometry(.16, .3, 1, 6);
  const crownGeometry = new THREE.IcosahedronGeometry(1, 0), coneGeometry = new THREE.ConeGeometry(1, 1, 6);
  const grassGeometry = (() => {
    const positions = [], normals = [];
    for (let blade = 0; blade < 4; blade++) {
      const a = blade * 1.9, bx = Math.cos(a) * .15, bz = Math.sin(a) * .15, w = .05, h = .22 + (blade % 3) * .08;
      const cx = Math.cos(a + Math.PI / 2) * w, cz = Math.sin(a + Math.PI / 2) * w;
      positions.push(bx - cx, 0, bz - cz, bx + cx, 0, bz + cz, bx + Math.cos(a) * .08, h, bz + Math.sin(a) * .08);
      for (let j = 0; j < 3; j++) normals.push(0, 1, 0);
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    return geometry;
  })();
  const barkMaterial = material('#ffffff'), leafMaterial = material('#ffffff', { flatShading: true });
  const grassMaterial = material('#ffffff', { side: THREE.DoubleSide }), stoneMaterial = material('#8b9187');
  const people = Object.values(PUETH_NPC_POSITIONS);
  const inTown = (x, z, margin) => Math.hypot(x - T.square.x, z - T.square.z) < T.palisadeRadius + margin;
  const cellTerrain = new Map(SURVEY.regions.find(region => region.name === 'Pueth').cells.map(cell => [`${cell.q},${cell.r}`, cell.terrain]));
  const terrainAt = (x, z) => { const h = hexAt(x, z); return cellTerrain.get(`${h.q},${h.r}`); };
  /** Trees per hex, thick in the south by the Tessen and thinning north; hills bare, the coast thin. */
  const woodland = (x, z) => {
    const south = smooth(-470, -210, z), kind = terrainAt(x, z);
    const base = 8 + 112 * south;
    return base * (kind === 'hills' ? .16 : kind === 'plains' ? .7 : 1) * (.45 + .55 * smooth(10, 70, landDistance(x, z)));
  };
  const cells = [...REGION_CELLS.Pueth].sort((a, c) => a.z - c.z || a.x - c.x);
  const BLOCK = Math.max(1, Math.round(6 / (WORLD_SCALE * WORLD_SCALE)));
  const tuftsPerHex = Math.round(22 * WORLD_SCALE * WORLD_SCALE);
  for (let start = 0; start < cells.length; start += BLOCK) {
    const block = cells.slice(start, start + BLOCK), trees = [], rocks = [], tufts = [];
    for (const cell of block) {
      const density = woodland(cell.x, cell.z), attempts = Math.round(density * 1.5);
      const hills = terrainAt(cell.x, cell.z) === 'hills';
      for (let i = 0; i < attempts; i++) {
        const x = cell.x + range(-52, 52), z = cell.z + range(-58, 58);
        if (random() * 1.5 > woodland(x, z) / Math.max(1, density)) continue;
        if (regionNameAt(x, z) !== 'Pueth' || insideVillage(x, z) || regionClear(x, z, 2.5) || inTown(x, z, 4)) continue;
        if (roadDistance(x, z) < 4.5 || puethRiverDistance(x, z, 14) < 10 || landDistance(x, z) < 6 || groundHeight(x, z) < 1.4) continue;
        if (people.some(p => Math.hypot(p.x - x, p.z - z) < 5)) continue;
        if (trees.some(tree => Math.hypot(tree.x - x, tree.z - z) < 3.4)) continue;
        const south = smooth(-470, -210, z), roll = random();
        // Drent's broadleaf reaches over the Tessen; birch takes the open ground and fir the colder slopes.
        const kind = roll < .22 * smooth(-300, -190, z) ? 'broad' : roll < .6 - (hills ? .25 : 0) + (1 - south) * .1 ? 'birch' : 'fir';
        trees.push({ x, z, kind, s: range(.78, 1.25), h: kind === 'fir' ? range(8, 13) : kind === 'birch' ? range(7.5, 11) : range(7, 10.5), rot: range(0, 6.28) });
      }
      const rockCount = Math.round((hills ? 70 : 12) * (terrainAt(cell.x, cell.z) === 'plains' ? .5 : 1));
      for (let i = 0; i < rockCount; i++) {
        const x = cell.x + range(-50, 50), z = cell.z + range(-55, 55);
        if (regionNameAt(x, z) !== 'Pueth' || insideVillage(x, z) || regionClear(x, z, 2) || inTown(x, z, 2) || roadDistance(x, z) < 3.4 || landDistance(x, z) < 2) continue;
        if (people.some(p => Math.hypot(p.x - x, p.z - z) < 4)) continue;
        rocks.push({ x, z, s: range(.5, hills ? 2.8 : 1.3), rot: range(0, 6.28) });
      }
      for (let i = 0; i < tuftsPerHex; i++) {
        const x = cell.x + range(-50, 50), z = cell.z + range(-55, 55);
        if (regionNameAt(x, z) !== 'Pueth' || insideVillage(x, z) || roadDistance(x, z) < 2.1 || groundHeight(x, z) < 1.2) continue;
        tufts.push({ x, z, s: range(.7, 1.6), rot: range(0, 6.28), hills: terrainAt(x, z) === 'hills' });
      }
    }
    if (trees.length) {
      const trunks = new THREE.InstancedMesh(trunkGeometry, barkMaterial, trees.length);
      const crowns = new THREE.InstancedMesh(crownGeometry, leafMaterial, Math.max(1, trees.length * 3));
      const cones = new THREE.InstancedMesh(coneGeometry, leafMaterial, Math.max(1, trees.length * 3));
      let crownIndex = 0, coneIndex = 0;
      trees.forEach((tree, index) => {
        const y = groundHeight(tree.x, tree.z), height = tree.h * tree.s;
        const slender = tree.kind === 'birch' ? .62 : tree.kind === 'fir' ? .9 : 1.15;
        dummy.position.set(tree.x, y + height * .41, tree.z); dummy.rotation.set(0, tree.rot, 0);
        dummy.scale.set(tree.s * slender, height * .82, tree.s * slender); dummy.updateMatrix();
        trunks.setMatrixAt(index, dummy.matrix);
        trunks.setColorAt(index, tree.kind === 'birch' ? color.setHSL(.12, range(.05, .1), range(.78, .86)) : color.setHSL(.08, .22, range(.3, .38)));
        colliders.push({ x: tree.x, z: tree.z, r: .45 * tree.s * slender, kind: 'region-tree' });
        if (tree.kind === 'fir') for (let c = 0; c < 3; c++) {
          dummy.position.set(tree.x, y + height * (.42 + c * .2), tree.z); dummy.rotation.set(0, tree.rot + c * .4, 0);
          dummy.scale.set(height * (.25 - c * .06), height * .46, height * (.25 - c * .06)); dummy.updateMatrix();
          cones.setMatrixAt(coneIndex, dummy.matrix);
          cones.setColorAt(coneIndex++, color.setHSL(range(.36, .42), range(.18, .28), range(.2, .28)));
        } else for (let c = 0; c < 3; c++) {
          const birch = tree.kind === 'birch', a = tree.rot + c * 2.1, spread = c === 2 ? 0 : height * (birch ? .08 : .14);
          dummy.position.set(tree.x + Math.sin(a) * spread, y + height * (c === 2 ? .93 : .74), tree.z + Math.cos(a) * spread);
          dummy.rotation.set(range(-.2, .2), a, range(-.18, .18));
          const wide = birch ? .2 : .31;
          dummy.scale.set(height * wide, height * (birch ? .3 : .27), height * wide); dummy.updateMatrix();
          crowns.setMatrixAt(crownIndex, dummy.matrix);
          crowns.setColorAt(crownIndex++, birch ? color.setHSL(range(.18, .23), range(.3, .42), range(.4, .5)) : color.set('#3f5e3b').offsetHSL(range(-.02, .02), range(-.04, .04), range(-.05, .05)));
        }
        metrics[tree.kind === 'birch' ? 'birches' : tree.kind === 'fir' ? 'firs' : 'trees'] += tree.kind === 'broad' ? 0 : 1;
      });
      crowns.count = crownIndex; cones.count = coneIndex;
      for (const batch of [trunks, crowns, cones]) {
        if (!batch.count) continue;
        batch.castShadow = true; batch.receiveShadow = true; batch.computeBoundingSphere(); group.add(batch); metrics.batches++;
      }
      metrics.trees += trees.length;
    }
    if (rocks.length) {
      const batch = new THREE.InstancedMesh(round, stoneMaterial, rocks.length);
      rocks.forEach((rock, index) => {
        dummy.position.set(rock.x, groundHeight(rock.x, rock.z) + rock.s * .26, rock.z);
        dummy.rotation.set(range(-.16, .16), rock.rot, range(-.16, .16));
        dummy.scale.set(rock.s, rock.s * range(.4, .75), rock.s * range(.75, 1.25)); dummy.updateMatrix();
        batch.setMatrixAt(index, dummy.matrix);
        batch.setColorAt(index, color.setHSL(.15, .06, range(.45, .62)));
        if (rock.s > 1.35) colliders.push({ x: rock.x, z: rock.z, r: rock.s * .66, kind: 'ridge-rock' });
      });
      batch.castShadow = true; batch.receiveShadow = true; batch.computeBoundingSphere(); group.add(batch);
      metrics.rocks += rocks.length; metrics.batches++;
    }
    if (tufts.length) {
      const batch = new THREE.InstancedMesh(grassGeometry, grassMaterial, tufts.length);
      tufts.forEach((tuft, index) => {
        dummy.position.set(tuft.x, groundHeight(tuft.x, tuft.z) + .02, tuft.z);
        dummy.rotation.set(0, tuft.rot, 0); dummy.scale.setScalar(tuft.s); dummy.updateMatrix();
        batch.setMatrixAt(index, dummy.matrix);
        batch.setColorAt(index, tuft.hills ? color.setHSL(range(.13, .18), range(.12, .22), range(.45, .58)) : color.setHSL(range(.17, .24), range(.2, .34), range(.38, .52)));
      });
      batch.receiveShadow = true; batch.computeBoundingSphere(); group.add(batch);
      metrics.grass += tufts.length; metrics.batches++;
    }
  }

  return {
    group, metrics, riverSamples,
    bridge: Object.freeze({ id: b.id, deckY, heading: b.heading, halfSpan: b.halfSpan, axis: b.axis, side: b.side, crossing: b.crossing }),
  };
}

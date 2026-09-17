import * as THREE from 'three';
import { landDistance, regionNameAt } from './region-world.js';
import { WORLD_SCALE } from './world-scale.js';
import {
  PEBLOS_ISLANDS, MAIN_ISLAND, COBBLE, COBBLE_QUAY, COBBLE_BUILDINGS, COBBLE_STANDS, COBBLE_WORKING, COBBLE_GULL_ROCKS,
  SEA_SHRINE, HEADLAND_LIGHT, SEAL_COVE, DROWNED_FIELD, PEBLOS_LANDMARKS, PEBLOS_SIGNS, FERRY_MOORINGS,
  islandAt, inCobble, quayHeight,
} from './peblos-world.js';

/**
 * Peblos's scenery, in world metres: the quay and village of Cobble, the
 * Empire's tally shed, the headland light, the seal cove and the drowned field,
 * a landmark on each of the five outer islands, the ferryman's boat, and the
 * islands' own scatter of salt grass, thrift, gorse, shore rock and a handful of
 * wind-bent pines.
 *
 * `world.js` hands over the same toolkit the other regions' scenery receives.
 * Scatter is batched per island, which is one to three hexes, so each batch's
 * bounding sphere is one island and a camera at Cobble submits nothing of the
 * Saltings. No forest anywhere: nothing here grows above a man but the pines on
 * the high rock, and there are eleven of them.
 */
export function createPeblosScenery(kit) {
  const { root, material, mesh, box, post, pebble, rope, cottage, barrel, crate, wornPatch, trailSign,
    groundHeight, colliders, dummy, color, wood, woodLight, darkWood, cream, rockMat, roofGeometry, cylinder, round,
    movingGroups } = kit;
  let seed = 771109;
  const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  const range = (a, b) => a + random() * (b - a);
  const group = new THREE.Group(); group.name = 'Peblos scenery'; root.add(group);
  const metrics = { buildings: 0, pines: 0, gorse: 0, rocks: 0, grass: 0, thrift: 0, batches: 0, landmarks: 0 };

  const stone = material('#8d9188'), stone2 = material('#8a8f85'), paleStone = material('#9a9c90'), darkStone = material('#6f7570');
  const shingle = material('#b4ab92'), iron = material('#494b47'), legionRed = material('#8c3f38');
  const canvasMat = material('#cbbd96'), netMat = material('#6f7a5f'), pitch = material('#413a33');

  // -------------------------------------------------------------------------
  // The quay: dressed stone out into the bay, with its deck as standable ground
  // -------------------------------------------------------------------------
  const Q = COBBLE_QUAY;
  const quayLength = Q.maxX - Q.minX, quayWidth = Q.maxZ - Q.minZ;
  const quayMid = { x: (Q.minX + Q.maxX) / 2, z: (Q.minZ + Q.maxZ) / 2 };
  box(stone, quayMid.x, Q.deckY - 2.35, quayMid.z, quayLength, 4.7, quayWidth, group);
  // Courses in the face, so the mass reads as laid stone and not as one block.
  for (const height of [.55, 1.15, 1.75]) box(darkStone, quayMid.x, height, quayMid.z, quayLength - .3, .12, quayWidth + .12, group);
  box(paleStone, quayMid.x, Q.deckY - .11, quayMid.z, quayLength, .22, quayWidth, group);
  // A kerb of set stones down both sides, low enough to step over and high enough to read as an edge.
  for (const side of [-1, 1]) for (let x = Q.minX + .6; x <= Q.maxX - .6; x += 1.3)
    box(paleStone, x, Q.deckY + .09, quayMid.z + side * (quayWidth / 2 - .3), 1.1, .18, .5, group);
  for (const bollard of Q.bollards) {
    post(darkStone, bollard.x, Q.deckY + .3, bollard.z, .22, .6, group);
    pebble(darkStone, bollard.x, Q.deckY + .62, bollard.z, .27, .16, .27, group);
    colliders.push({ x: bollard.x, z: bollard.z, r: .3, kind: 'bollard' });
  }
  // The capstan at the head, and a ladder down the seaward face.
  const cap = Q.capstan;
  post(wood, cap.x, Q.deckY + .42, cap.z, .42, .84, group);
  post(darkWood, cap.x, Q.deckY + .9, cap.z, .5, .14, group);
  for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2; const bar = box(woodLight, cap.x + Math.sin(a) * .6, Q.deckY + .74, cap.z + Math.cos(a) * .6, .1, .1, 1.3, group); bar.rotation.y = a; }
  colliders.push({ x: cap.x, z: cap.z, r: .7, kind: 'capstan' });
  for (let i = 0; i < 5; i++) box(wood, Q.minX + .1, Q.deckY - .35 - i * .42, quayMid.z + 1.2, .12, .09, .6, group);
  // Mooring lines from two bollards down to the water.
  for (const bollard of [Q.bollards[1], Q.bollards[4]]) rope([
    new THREE.Vector3(bollard.x, Q.deckY + .5, bollard.z),
    new THREE.Vector3(bollard.x - 1.1, Q.deckY - .6, bollard.z + Math.sign(bollard.z - quayMid.z) * 1.2),
    new THREE.Vector3(bollard.x - 2.0, .3, bollard.z + Math.sign(bollard.z - quayMid.z) * 1.9),
  ], .035, material('#bda87f'), group);

  // -------------------------------------------------------------------------
  // Cobble: ten roofs on the terrace above the bay
  // -------------------------------------------------------------------------
  wornPatch(COBBLE.centre.x - 2, COBBLE.centre.z, 17, '#a99f81', 1.1);
  wornPatch(Q.root.x - 2, Q.root.z, 6, '#a8a189', 1);
  for (const building of COBBLE_BUILDINGS) {
    // Plain: no window flower boxes. Salt spray takes anything that tries.
    cottage(building.x, building.z, building.width, building.depth, building.height, building.roof, building.wall, building.yaw, group, { plain: true });
    metrics.buildings++;
  }
  // The net loft's upper opening, with the year's nets hanging out of it.
  {
    const loft = COBBLE_BUILDINGS.find(b => b.id === 'net-loft'), y = groundHeight(loft.x, loft.z);
    for (let i = 0; i < 4; i++) {
      const net = box(netMat, loft.x - loft.depth / 2 - .12, y + 2.5 - i * .1, loft.z - 2.4 + i * 1.5, .08, 2.2, 1.1, group);
      net.rotation.z = .04 * (i % 2 ? 1 : -1);
    }
  }
  // Drying racks: two uprights, three rails, and split fish over them.
  const fishMat = material('#c7bfa4');
  for (const rack of COBBLE_WORKING.racks) {
    const y = groundHeight(rack.x, rack.z);
    for (const side of [-1, 1]) post(wood, rack.x + side * 1.9, y + .95, rack.z, .09, 1.9, group);
    for (let i = 0; i < 3; i++) box(wood, rack.x, y + 1.05 + i * .35, rack.z, 4.0, .07, .07, group);
    for (let i = 0; i < 9; i++) {
      const fish = box(fishMat, rack.x - 1.6 + (i % 5) * .8, y + 1.0 + Math.floor(i / 5) * .35, rack.z + .04, .17, .46, .05, group);
      fish.rotation.z = range(-.05, .05);
    }
    colliders.push({ x: rack.x, z: rack.z, hx: 2.1, hz: .3, kind: 'drying-rack' });
  }
  // Lobster pots: wicker domes in heaps.
  const wicker = material('#9c7a4c');
  for (const heap of COBBLE_WORKING.pots) {
    const deck = quayHeight(heap.x, heap.z), y = deck ?? groundHeight(heap.x, heap.z);
    for (let i = 0; i < 5; i++) {
      const row = i < 3 ? 0 : 1, slot = i < 3 ? i - 1 : i - 3.5;
      const px = heap.x + slot * .72, pz = heap.z + (row ? .5 : 0);
      const pot = mesh(round, wicker, px, y + .3 + row * .55, pz, .42, .3, .42, group);
      pot.rotation.set(range(-.1, .1), range(0, 6.28), range(-.1, .1));
      post(darkWood, px, y + .58 + row * .55, pz, .1, .06, group);
    }
    colliders.push({ x: heap.x, z: heap.z, r: 1.2, kind: 'lobster-pots' });
  }
  // Upturned hulls on the shingle, and the slip they are hauled up.
  for (const hull of COBBLE_WORKING.hulls) {
    const y = groundHeight(hull.x, hull.z), yaw = range(0, 3.14);
    const boat = new THREE.Group(); boat.position.set(hull.x, y + .38, hull.z); boat.rotation.set(Math.PI, yaw, .06); group.add(boat);
    const outline = [[0, -2.6], [.9, -1.7], [1.05, .7], [.66, 2.05], [0, 2.5], [-.66, 2.05], [-1.05, .7], [-.9, -1.7]];
    const bp = [], bi = [];
    for (const [bx, bz] of outline) bp.push(bx, .55, bz, bx * .55, -.3, bz * .8);
    for (let i = 0; i < outline.length; i++) { const a = i * 2, b = ((i + 1) % outline.length) * 2; bi.push(a, b, a + 1, b, b + 1, a + 1); }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(bp, 3)); geometry.setIndex(bi); geometry.computeVertexNormals();
    mesh(geometry, material('#5d7a6d', { side: THREE.DoubleSide }), 0, 0, 0, 1, 1, 1, boat);
    colliders.push({ x: hull.x, z: hull.z, r: 1.5, kind: 'upturned-boat' });
  }
  {
    const slip = COBBLE_QUAY.slip, y = groundHeight(slip.x, slip.z);
    wornPatch(slip.x, slip.z, 4.5, '#b0a68c');
    for (let i = 0; i < 7; i++) box(darkWood, slip.x - 4 + i * 1.4, y - .04 + i * .06, slip.z, .35, .16, 4.2, group);
    // Pitch pot and caulking bench at the boat shed's open front.
    post(iron, slip.x + 4.4, y + .3, slip.z - 2.2, .34, .6, group);
    box(woodLight, slip.x + 5.2, y + .72, slip.z - 3.2, 1.9, .14, .7, group);
    colliders.push({ x: slip.x + 5.2, z: slip.z - 3.2, hx: 1.0, hz: .4, kind: 'caulking-bench' });
  }
  // Barrels, some of them marked with the Empire's fifth, and the gutting table.
  for (const [index, spot] of COBBLE_WORKING.barrels.entries()) {
    barrel(spot.x, spot.z, .95, group);
    if (index % 5 === 4 || index === 1) {
      const y = groundHeight(spot.x, spot.z);
      const markGeo = new THREE.CircleGeometry(.14, 8);
      const mark = mesh(markGeo, legionRed, spot.x - .38, y + .55, spot.z, 1, 1, 1, group);
      mark.rotation.y = -Math.PI / 2;
    }
    colliders.push({ x: spot.x, z: spot.z, r: .45, kind: 'barrel' });
  }
  {
    const table = COBBLE_WORKING.gutting, y = groundHeight(table.x, table.z);
    box(woodLight, table.x, y + .84, table.z, 1.1, .12, 2.4, group);
    for (const dx of [-.42, .42]) for (const dz of [-1.0, 1.0]) box(wood, table.x + dx, y + .42, table.z + dz, .1, .84, .1, group);
    pebble(material('#9aa08f'), table.x, y + .93, table.z + .5, .2, .06, .3, group);
    crate(table.x - 1.3, table.z + 1.1, .7, null, group);
    colliders.push({ x: table.x, z: table.z, hx: .65, hz: 1.3, kind: 'gutting-table' });
  }

  // Gull rocks off the quay's north side: white-streaked stone, and the gulls on it.
  const gullWing = new THREE.BufferGeometry();
  gullWing.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, .5, .05, .1, .17, 0, -.1], 3));
  gullWing.computeVertexNormals();
  const gullMaterial = material('#f2eddb', { side: THREE.DoubleSide }), guanoMaterial = material('#d9d5c1');
  for (const [index, rock] of COBBLE_GULL_ROCKS.entries()) {
    const y = groundHeight(rock.x, rock.z), height = range(1.3, 2.2);
    const stone = pebble(index % 2 ? stone2 : guanoMaterial, rock.x, y + height * .45, rock.z, range(1.1, 1.9), height, range(1.0, 1.7), group);
    stone.rotation.set(range(-.12, .12), range(0, 6.28), range(-.12, .12));
    colliders.push({ x: rock.x, z: rock.z, r: 1.1, kind: 'gull-rock' });
    for (let i = 0; i < 3; i++) {
      const gull = mesh(gullWing, gullMaterial, rock.x + range(-.9, .9), y + height * .9 + range(0, .25), rock.z + range(-.9, .9), 1, 1, 1, group);
      gull.rotation.set(0, range(0, 6.28), 0); gull.castShadow = false;
    }
  }

  // -------------------------------------------------------------------------
  // The Empire's tally: a table under an awning outside the shed, and a standard
  // -------------------------------------------------------------------------
  {
    const shed = COBBLE_BUILDINGS.find(b => b.id === 'tally-house');
    const tx = shed.x - 3.4, tz = shed.z, y = groundHeight(tx, tz);
    for (const dz of [-1.6, 1.6]) post(wood, tx - 1.5, y + 1.2, tz + dz, .09, 2.4, group);
    const awning = box(canvasMat, tx - .6, y + 2.42, tz, 3.0, .08, 3.6, group); awning.rotation.z = .12;
    box(woodLight, tx, y + .86, tz, 1.0, .12, 2.2, group);
    for (const dx of [-.38, .38]) for (const dz of [-.9, .9]) box(wood, tx + dx, y + .43, tz + dz, .1, .86, .1, group);
    box(cream, tx, y + .94, tz - .4, .5, .03, .7, group);                     // the ledger, open
    colliders.push({ x: tx, z: tz, hx: .6, hz: 1.2, kind: 'tally-table' });
    const poleX = shed.x + 1.2, poleZ = shed.z - 3.6, poleY = groundHeight(poleX, poleZ);
    post(wood, poleX, poleY + 2.2, poleZ, .09, 4.4, group);
    box(legionRed, poleX, poleY + 3.8, poleZ - .35, .05, .9, .7, group).name = 'Cobble tally standard';
    colliders.push({ x: poleX, z: poleZ, r: .28, kind: 'legion-standard' });
    const rackX = shed.x + 1.0, rackZ = shed.z + 2.8, rackY = groundHeight(rackX, rackZ);
    box(wood, rackX, rackY + .9, rackZ, .12, .1, 1.8, group);
    for (let i = 0; i < 3; i++) { const spear = post(material('#8b7a60'), rackX + .05, rackY + 1.1, rackZ - .6 + i * .6, .03, 2.2, group); spear.rotation.x = .07; }
    colliders.push({ x: rackX, z: rackZ, hx: .3, hz: 1.0, kind: 'spear-rack' });
  }

  // -------------------------------------------------------------------------
  // The sea shrine on the rock above the quay
  // -------------------------------------------------------------------------
  {
    const s = SEA_SHRINE, y = groundHeight(s.x, s.z);
    const shrine = new THREE.Group(); shrine.position.set(s.x, y, s.z); shrine.rotation.y = s.yaw; group.add(shrine);
    box(stone, 0, .9, 0, 1.0, 1.8, 2.2, shrine);
    box(darkStone, 0, 1.85, 0, 1.3, .18, 2.6, shrine);
    box(material('#2f3733'), .42, 1.05, 0, .2, 1.0, 1.2, shrine);             // the niche's shadow
    for (let i = 0; i < 5; i++) pebble(material(i % 2 ? '#dcd2b4' : '#c2b9a6'), .5, .72 + (i % 3) * .3, -.5 + i * .25, .09, .07, .12, shrine);
    // A whale's rib set over the niche.
    const rib = mesh(cylinder, material('#d8d2bd'), .55, 2.2, 0, .1, 2.4, .1, shrine);
    rib.rotation.set(Math.PI / 2, 0, .35);
    const rib2 = mesh(cylinder, material('#d8d2bd'), .55, 2.2, .0, .1, 2.4, .1, shrine);
    rib2.rotation.set(Math.PI / 2, 0, -.35);
    colliders.push({ x: s.x, z: s.z, r: 1.4, kind: 'sea-shrine' });
    for (let i = 0; i < 6; i++) {
      const a = i * 1.05, px = s.x + Math.sin(a) * 2.6, pz = s.z + Math.cos(a) * 2.6;
      pebble(material('#9a9c90'), px, groundHeight(px, pz) + .12, pz, .32, .2, .28, group);
    }
  }

  // -------------------------------------------------------------------------
  // The headland light, the seal cove, the drowned field
  // -------------------------------------------------------------------------
  {
    const L = HEADLAND_LIGHT, y = groundHeight(L.x, L.z);
    for (let course = 0; course < 7; course++) {
      const r = 1.9 - course * .09, count = 10;
      for (let i = 0; i < count; i++) {
        const a = i / count * Math.PI * 2 + course * .3;
        box(course % 2 ? stone : paleStone, L.x + Math.sin(a) * r, y + .3 + course * .55, L.z + Math.cos(a) * r, .8, .55, .55, group)
          .rotation.y = a;
      }
    }
    post(iron, L.x, y + 4.3, L.z, .8, .5, group);
    for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; post(iron, L.x + Math.sin(a) * .78, y + 4.75, L.z + Math.cos(a) * .78, .05, .8, group); }
    for (let i = 0; i < 4; i++) pebble(material('#7d6a4e'), L.x + range(-.35, .35), y + 4.7, L.z + range(-.35, .35), .22, .16, .3, group);
    colliders.push({ x: L.x, z: L.z, r: 2.1, kind: 'headland-light' });
    metrics.landmarks++;
    // The path of trodden turf the village has worn up to it.
    wornPatch(L.x, L.z + 3.2, 3.4, '#a59c7e');
  }
  {
    const C = SEAL_COVE;
    wornPatch(C.x, C.z, 11, '#bdb49a', 1.2);
    // Seals, not more rock: smooth wet hide rather than the scenery's faceted
    // stone, a head up and watching, and all of them hauled out on the tideline.
    const sealBody = new THREE.SphereGeometry(1, 10, 7);
    const sealMat = material('#38352f', { roughness: .42 }), pupMat = material('#6d6357', { roughness: .5 });
    for (let i = 0; i < 9; i++) {
      const pup = i % 4 === 3;
      let px = 0, pz = 0, found = false;
      for (let tries = 0; tries < 40 && !found; tries++) {
        const a = range(0, 6.283), r = range(3, 14);
        px = C.x + Math.sin(a) * r; pz = C.z + Math.cos(a) * r;
        const shore = landDistance(px, pz);
        found = shore > 1 && shore < 7;
      }
      if (!found) continue;
      const y = groundHeight(px, pz), yaw = range(0, 6.283), scale = pup ? .6 : 1;
      const hide = pup ? pupMat : sealMat;
      const seal = new THREE.Group(); seal.position.set(px, y, pz); seal.rotation.y = yaw; group.add(seal);
      mesh(sealBody, hide, 0, .32 * scale, 0, .46 * scale, .32 * scale, 1.15 * scale, seal);
      const neck = mesh(sealBody, hide, 0, .52 * scale, .95 * scale, .27 * scale, .33 * scale, .38 * scale, seal);
      neck.rotation.x = -.25;
      mesh(sealBody, hide, 0, .62 * scale, 1.24 * scale, .2 * scale, .2 * scale, .3 * scale, seal);   // the head, up and watching
      for (const side of [-1, 1]) {
        const flipper = mesh(sealBody, hide, side * .42 * scale, .16 * scale, .25 * scale, .3 * scale, .07 * scale, .2 * scale, seal);
        flipper.rotation.y = side * .5;
      }
      const tail = mesh(sealBody, hide, 0, .2 * scale, -1.24 * scale, .34 * scale, .08 * scale, .38 * scale, seal);
      tail.rotation.x = -.3;
      colliders.push({ x: px, z: pz, r: .8, kind: 'seal' });
    }
    for (let i = 0; i < 22; i++) {
      const px = C.x + range(-12, 12), pz = C.z + range(-9, 9);
      if (landDistance(px, pz) < .2) continue;
      pebble(shingle, px, groundHeight(px, pz) + .07, pz, range(.2, .5), .14, range(.2, .45), group);
    }
    metrics.landmarks++;
  }
  {
    const F = DROWNED_FIELD;
    // Three dry-stone walls running down the slope and on under the water.
    for (let wall = 0; wall < 3; wall++) {
      const startZ = F.z - 12 + wall * 13;
      for (let step = 0; step < 22; step++) {
        const px = F.x + 9 - step * 1.15, pz = startZ + Math.sin(step * .3 + wall) * .7;
        const y = groundHeight(px, pz);
        if (y < -1.6) break;
        for (let course = 0; course < (y > .8 ? 3 : 2); course++)
          box(course % 2 ? stone : paleStone, px, y + .18 + course * .3, pz, 1.0, .3, .55, group);
        if (y > .6 && step % 4 === 0) colliders.push({ x: px, z: pz, hx: .5, hz: .35, kind: 'field-wall' });
      }
    }
    metrics.landmarks++;
  }

  // -------------------------------------------------------------------------
  // One landmark on each of the outer islands
  // -------------------------------------------------------------------------
  const landmark = id => PEBLOS_LANDMARKS.find(place => place.id === id);
  {
    const B = landmark('longstone-beacon'), y = groundHeight(B.x, B.z);
    for (let course = 0; course < 9; course++) {
      const r = 1.6 - course * .14;
      for (let i = 0; i < 8; i++) {
        const a = i / 8 * Math.PI * 2 + course * .4;
        box(course % 2 ? stone : darkStone, B.x + Math.sin(a) * r, y + .25 + course * .48, B.z + Math.cos(a) * r, .7, .48, .5, group).rotation.y = a;
      }
    }
    pebble(iron, B.x, y + 4.7, B.z, .55, .35, .55, group);
    colliders.push({ x: B.x, z: B.z, r: 1.8, kind: 'beacon' });
    metrics.landmarks++;
  }
  {
    const G = landmark('gull-scarp'), y = groundHeight(G.x, G.z);
    const guano = material('#dedac6');
    for (let i = 0; i < 6; i++) {
      const a = i * 1.1, r = i ? range(2.5, 7) : 0;
      const px = G.x + Math.sin(a) * r, pz = G.z + Math.cos(a) * r, py = groundHeight(px, pz);
      const stack = pebble(i % 2 ? stone : guano, px, py + range(1.4, 3.2) / 2, pz, range(1.4, 2.8), range(1.4, 3.2), range(1.2, 2.4), group);
      stack.rotation.set(range(-.1, .1), range(0, 6.28), range(-.1, .1));
      colliders.push({ x: px, z: pz, r: 1.5, kind: 'gull-rock' });
    }
    // The gulls themselves: white wedges on the rock and a few in the air above it.
    const wing = new THREE.BufferGeometry();
    wing.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, .5, .05, .1, .17, 0, -.1], 3)); wing.computeVertexNormals();
    const gullMat = material('#f2eddb', { side: THREE.DoubleSide });
    for (let i = 0; i < 16; i++) {
      const px = G.x + range(-9, 9), pz = G.z + range(-9, 9), high = i % 4 === 0;
      const py = groundHeight(px, pz) + (high ? range(5, 11) : .25);
      const gull = mesh(wing, gullMat, px, py, pz, 1, 1, 1, group);
      gull.rotation.set(0, range(0, 6.28), high ? range(-.2, .2) : 0); gull.castShadow = false;
    }
    metrics.landmarks++;
  }
  {
    const S = landmark('pilots-stone'), y = groundHeight(S.x, S.z);
    const shaft = box(paleStone, S.x, y + 1.9, S.z, 1.0, 3.8, .8, group); shaft.rotation.y = .3; shaft.rotation.z = .05;
    box(darkStone, S.x + .52, y + 2.4, S.z + .12, .06, .9, .45, group);       // the cut mark on its seaward face
    for (let i = 0; i < 5; i++) { const a = i * 1.25; pebble(stone, S.x + Math.sin(a) * 1.7, groundHeight(S.x + Math.sin(a) * 1.7, S.z + Math.cos(a) * 1.7) + .18, S.z + Math.cos(a) * 1.7, .5, .3, .45, group); }
    colliders.push({ x: S.x, z: S.z, r: .9, kind: 'marker-stone' });
    metrics.landmarks++;
  }
  {
    const W = landmark('wreck-of-the-sea-mare');
    wornPatch(W.x, W.z, 7, '#b3aa90');
    const keelYaw = .7, keelCos = Math.cos(keelYaw), keelSin = Math.sin(keelYaw);
    for (let i = 0; i < 9; i++) {
      const along = (i - 4) * 1.7, px = W.x + keelSin * along, pz = W.z + keelCos * along;
      const y = groundHeight(px, pz), lean = (1 - Math.abs(i - 4) / 5);
      for (const side of [-1, 1]) {
        const rib = box(darkWood, px + keelCos * side * .5, y + lean * 1.0, pz - keelSin * side * .5, .18, lean * 2.2 + .4, .2, group);
        rib.rotation.set(0, keelYaw, side * (.35 + lean * .25));
      }
    }
    const keel = box(darkWood, W.x, groundHeight(W.x, W.z) + .22, W.z, .4, .4, 15, group); keel.rotation.y = keelYaw;
    colliders.push({ x: W.x, z: W.z, r: 2.4, kind: 'wreck' });
    metrics.landmarks++;
  }
  {
    const S = landmark('saltings'), y = groundHeight(S.x, S.z);
    const menhir = box(stone, S.x, y + 1.5, S.z, .9, 3.0, .7, group); menhir.rotation.set(.05, .8, .06);
    colliders.push({ x: S.x, z: S.z, r: .8, kind: 'standing-stone' });
    // Shallow pans scratched in the turf, each a pale square with a low bank.
    const brine = material('#c9c5ad');
    for (let i = 0; i < 6; i++) {
      const px = S.x + range(-16, 16), pz = S.z + range(-14, 14);
      if (landDistance(px, pz) < 6) continue;
      const py = groundHeight(px, pz);
      box(brine, px, py + .04, pz, 4.2, .08, 3.4, group).rotation.y = range(-.3, .3);
      for (const side of [-1, 1]) box(shingle, px + side * 2.2, py + .12, pz, .35, .24, 3.6, group);
    }
    metrics.landmarks++;
  }
  for (const sign of PEBLOS_SIGNS) trailSign(sign.x, sign.z, 1, sign.label, sign.yaw, sign.returnLabel, root);

  // -------------------------------------------------------------------------
  // The ferryman's boat: a world-space prop the crossing moves (src/ferry.js)
  // -------------------------------------------------------------------------
  const ferryBoat = (() => {
    const boat = new THREE.Group(); boat.name = 'Corran Sell’s boat'; root.add(boat);
    movingGroups?.add(boat);
    const outline = [[0, -3.2], [1.1, -2.1], [1.3, .9], [.82, 2.55], [0, 3.1], [-.82, 2.55], [-1.3, .9], [-1.1, -2.1]];
    const bp = [], bi = [];
    for (const [bx, bz] of outline) bp.push(bx, .67, bz, bx * .53, -.35, bz * .78);
    for (let i = 0; i < outline.length; i++) { const a = i * 2, b = ((i + 1) % outline.length) * 2; bi.push(a, b, a + 1, b, b + 1, a + 1); }
    const hull = new THREE.BufferGeometry();
    hull.setAttribute('position', new THREE.Float32BufferAttribute(bp, 3)); hull.setIndex(bi); hull.computeVertexNormals();
    mesh(hull, material('#4a6f76', { side: THREE.DoubleSide }), 0, 0, 0, 1, 1, 1, boat);
    box(woodLight, 0, -.08, 0, 1.5, .16, 4.4, boat);
    for (const bz of [-1.6, -.1, 1.45]) box(woodLight, 0, .53, bz, 2.07, .16, .32, boat);
    post(wood, 0, 2.7, -.45, .085, 5.8, boat);
    const sail = new THREE.BufferGeometry();
    sail.setAttribute('position', new THREE.Float32BufferAttribute([.1, 5.5, -.45, .1, 1.3, -.45, 2.8, 1.55, -.3], 3)); sail.computeVertexNormals();
    mesh(sail, material('#efe2b7', { side: THREE.DoubleSide }), 0, 0, 0, 1, 1, 1, boat);
    const oar = box(woodLight, .65, .85, .4, .09, .09, 4.3, boat); oar.rotation.y = .45;
    const blade = box(woodLight, 1.51, .85, 2.17, .33, .08, .65, boat); blade.rotation.y = .45;
    const rail = outline.map(([bx, bz]) => new THREE.Vector3(bx, .72, bz)); rail.push(rail[0]);
    rope(rail, .09, woodLight, boat);
    // Moored at Tidehaven from the first frame: the world is never built with a boat at its origin.
    boat.position.set(FERRY_MOORINGS.drent.x, .38, FERRY_MOORINGS.drent.z);
    boat.rotation.y = FERRY_MOORINGS.drent.yaw;
    return boat;
  })();

  // -------------------------------------------------------------------------
  // The islands' own scatter, batched island by island
  // -------------------------------------------------------------------------
  const grassGeometry = (() => {
    const positions = [], normals = [];
    for (let blade = 0; blade < 4; blade++) {
      const a = blade * 1.9, bx = Math.cos(a) * .15, bz = Math.sin(a) * .15, w = .05, h = .18 + (blade % 3) * .07;
      const cx = Math.cos(a + Math.PI / 2) * w, cz = Math.sin(a + Math.PI / 2) * w;
      positions.push(bx - cx, 0, bz - cz, bx + cx, 0, bz + cz, bx + Math.cos(a) * .07, h, bz + Math.sin(a) * .07);
      for (let j = 0; j < 3; j++) normals.push(0, 1, 0);
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    return geometry;
  })();
  const trunkGeometry = new THREE.CylinderGeometry(.14, .26, 1, 6);
  const grassMaterial = material('#ffffff', { side: THREE.DoubleSide });
  const cushionMaterial = material('#ffffff', { flatShading: true });
  const gorseMaterial = material('#ffffff', { flatShading: true });
  const stoneMaterial = material('#8d9288');
  const barkMaterial = material('#6b5a42');
  const pineMaterial = material('#43604b', { flatShading: true });
  const stands = Object.values(COBBLE_STANDS);
  const clear = (x, z, margin) => inCobble(x, z, margin)
    || quayHeight(x, z) !== null
    || Math.hypot(x - Q.head.x, z - Q.head.z) < 12 + margin
    || PEBLOS_LANDMARKS.some(place => Math.hypot(place.x - x, place.z - z) < (place.radius ?? 10) + margin)
    || stands.some(stand => Math.hypot(stand.x - x, stand.z - z) < 4 + margin);

  const per = count => Math.round(count * WORLD_SCALE * WORLD_SCALE);
  const PINES = per(1), GORSE = per(6), THRIFT = per(16), ROCKS = per(26), TUFTS = per(52);

  for (const island of PEBLOS_ISLANDS) {
    const pines = [], gorse = [], thrift = [], rocks = [], tufts = [];
    const high = island === MAIN_ISLAND;
    for (const cell of island.cells) {
      const hills = cell.terrain === 'hills';
      const sample = () => ({ x: cell.x + range(-52, 52), z: cell.z + range(-58, 58) });
      for (let i = 0; i < (hills ? PINES * 3 : 0); i++) {
        const { x, z } = sample();
        if (islandAt(x, z) !== island || landDistance(x, z) < 34 || groundHeight(x, z) < 8) continue;
        if (clear(x, z, 3) || pines.some(p => Math.hypot(p.x - x, p.z - z) < 9)) continue;
        pines.push({ x, z, s: range(.8, 1.15), h: range(5.5, 8), rot: range(0, 6.28), lean: range(.12, .26) });
      }
      for (let i = 0; i < GORSE; i++) {
        const { x, z } = sample();
        if (islandAt(x, z) !== island || landDistance(x, z) < 5 || clear(x, z, 2)) continue;
        if (gorse.some(g => Math.hypot(g.x - x, g.z - z) < 3.4)) continue;
        gorse.push({ x, z, s: range(.7, 1.5), rot: range(0, 6.28) });
      }
      for (let i = 0; i < THRIFT; i++) {
        const { x, z } = sample();
        if (islandAt(x, z) !== island || landDistance(x, z) < 1.5 || clear(x, z, 1)) continue;
        thrift.push({ x, z, s: range(.5, 1.1) });
      }
      for (let i = 0; i < ROCKS; i++) {
        const { x, z } = sample();
        if (islandAt(x, z) !== island || landDistance(x, z) < .5 || clear(x, z, 1.5)) continue;
        // Grey rock gathers at the waterline and thins inland; the hills keep their own bones.
        const shore = landDistance(x, z);
        if (random() > (shore < 14 ? 1 : hills ? .55 : .3)) continue;
        rocks.push({ x, z, s: range(.4, shore < 12 ? 2.2 : hills ? 2.6 : 1.2), rot: range(0, 6.28) });
      }
      for (let i = 0; i < TUFTS; i++) {
        const { x, z } = sample();
        if (islandAt(x, z) !== island || landDistance(x, z) < 2 || groundHeight(x, z) < .7) continue;
        if (quayHeight(x, z) !== null || inCobble(x, z, -6)) continue;
        tufts.push({ x, z, s: range(.7, 1.7), rot: range(0, 6.28), high: groundHeight(x, z) > 8 });
      }
    }
    if (pines.length) {
      // Wind-bent: every pine on these islands leans the same way, away from the open water.
      const trunks = new THREE.InstancedMesh(trunkGeometry, barkMaterial, pines.length);
      const crowns = new THREE.InstancedMesh(round, pineMaterial, pines.length * 2);
      let crownIndex = 0;
      pines.forEach((pine, index) => {
        const y = groundHeight(pine.x, pine.z), height = pine.h * pine.s;
        dummy.position.set(pine.x, y + height * .42, pine.z);
        dummy.rotation.set(pine.lean * .7, pine.rot, pine.lean);
        dummy.scale.set(pine.s, height * .86, pine.s); dummy.updateMatrix();
        trunks.setMatrixAt(index, dummy.matrix);
        for (let c = 0; c < 2; c++) {
          dummy.position.set(pine.x + Math.sin(pine.rot) * height * (.1 + pine.lean), y + height * (.74 + c * .16), pine.z + Math.cos(pine.rot) * height * (.1 + pine.lean) * .4);
          dummy.rotation.set(.1, pine.rot + c, pine.lean * 1.4);
          dummy.scale.set(height * (.34 - c * .1), height * .17, height * (.26 - c * .08)); dummy.updateMatrix();
          crowns.setMatrixAt(crownIndex, dummy.matrix);
          crowns.setColorAt(crownIndex++, color.setHSL(range(.32, .38), range(.16, .26), range(.19, .27)));
        }
        colliders.push({ x: pine.x, z: pine.z, r: .4 * pine.s, kind: 'region-tree' });
      });
      crowns.count = crownIndex;
      for (const batch of [trunks, crowns]) { batch.castShadow = true; batch.receiveShadow = true; batch.computeBoundingSphere(); group.add(batch); metrics.batches++; }
      metrics.pines += pines.length;
    }
    if (gorse.length) {
      const batch = new THREE.InstancedMesh(round, gorseMaterial, gorse.length * 2);
      let index = 0;
      for (const bush of gorse) {
        const y = groundHeight(bush.x, bush.z);
        for (let part = 0; part < 2; part++) {
          dummy.position.set(bush.x + (part ? .3 * bush.s : 0), y + bush.s * (part ? .42 : .3), bush.z + (part ? -.25 * bush.s : 0));
          dummy.rotation.set(range(-.2, .2), bush.rot + part, range(-.2, .2));
          dummy.scale.set(bush.s * (part ? .5 : .82), bush.s * (part ? .34 : .5), bush.s * (part ? .46 : .78)); dummy.updateMatrix();
          batch.setMatrixAt(index, dummy.matrix);
          // Gorse in flower: dark green cushions with yellow in them.
          batch.setColorAt(index++, part && random() < .55 ? color.setHSL(.14, .62, range(.45, .56)) : color.setHSL(range(.24, .3), range(.22, .34), range(.2, .3)));
        }
        if (bush.s > 1.15) colliders.push({ x: bush.x, z: bush.z, r: bush.s * .55, kind: 'gorse' });
      }
      batch.count = index; batch.castShadow = true; batch.receiveShadow = true; batch.computeBoundingSphere(); group.add(batch);
      metrics.gorse += gorse.length; metrics.batches++;
    }
    if (thrift.length) {
      const batch = new THREE.InstancedMesh(round, cushionMaterial, thrift.length);
      thrift.forEach((cushion, index) => {
        dummy.position.set(cushion.x, groundHeight(cushion.x, cushion.z) + cushion.s * .07, cushion.z);
        dummy.rotation.set(0, index * .7, 0);
        dummy.scale.set(cushion.s * .42, cushion.s * .16, cushion.s * .42); dummy.updateMatrix();
        batch.setMatrixAt(index, dummy.matrix);
        batch.setColorAt(index, random() < .45 ? color.setHSL(.94, range(.3, .46), range(.6, .72)) : color.setHSL(range(.22, .28), range(.16, .3), range(.3, .4)));
      });
      batch.receiveShadow = true; batch.computeBoundingSphere(); group.add(batch);
      metrics.thrift += thrift.length; metrics.batches++;
    }
    if (rocks.length) {
      const batch = new THREE.InstancedMesh(round, stoneMaterial, rocks.length);
      rocks.forEach((rock, index) => {
        dummy.position.set(rock.x, groundHeight(rock.x, rock.z) + rock.s * .24, rock.z);
        dummy.rotation.set(range(-.2, .2), rock.rot, range(-.2, .2));
        dummy.scale.set(rock.s, rock.s * range(.35, .7), rock.s * range(.7, 1.3)); dummy.updateMatrix();
        batch.setMatrixAt(index, dummy.matrix);
        batch.setColorAt(index, color.setHSL(range(.1, .16), range(.03, .08), range(.42, .6)));
        if (rock.s > 1.5) colliders.push({ x: rock.x, z: rock.z, r: rock.s * .6, kind: 'shore-rock' });
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
        // Salt grass: paler and greyer on the high rock, greener in the hollows.
        batch.setColorAt(index, tuft.high ? color.setHSL(range(.14, .2), range(.1, .2), range(.44, .56))
          : color.setHSL(range(.18, .26), range(.18, .32), range(.36, .5)));
      });
      batch.receiveShadow = true; batch.computeBoundingSphere(); group.add(batch);
      metrics.grass += tufts.length; metrics.batches++;
    }
    if (high) metrics.mainIslandScatter = pines.length + gorse.length + rocks.length + tufts.length;
  }

  return {
    group, metrics, ferryBoat,
    placeFerryBoat(x, z, yaw) { ferryBoat.position.set(x, .38, z); ferryBoat.rotation.y = yaw; },
    islandOutlines: PEBLOS_ISLANDS.map(island => island.id),
  };
}

export { regionNameAt };

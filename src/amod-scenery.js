import * as THREE from 'three';
import { REGION_CELLS, regionNameAt, hexAt, SURVEY } from './region-world.js';
import { WORLD_SCALE } from './world-scale.js';
import {
  OSTEL, ostelPoint, OSTEL_BUILDINGS, OSTEL_SPRING, OSTEL_STONE_YARD, OSTEL_TOLL_TABLE, OSTEL_STANDS,
  TARVEL, TARVEL_BRIDGE, DROMEL_CHANNEL, DROMEL_GATE, TARVEL_HEAD, VESSEN, TIR_OSTEL,
  TOLL_STONE, OGRE_STAND, AMOD_LANDMARKS, AMOD_SIGNS, KELMOD_ROAD_END, tarvelDistance,
} from './amod-world.js';
import { AMOD_TERRACE_GROUND, TARVEL_PROFILE, TARVEL_DECK_Y, DROMEL_PROFILE, TERRACE_RISE, terraceLevel, amodShaping } from './amod-terraces.js';

/**
 * Amod's scenery, in world metres.
 *
 * The one thing that has to be right is the terraces, and most of them are not
 * here: `src/amod-terraces.js` puts the stair into the ground itself. What this
 * module does is walk that ground, find every riser, and stand a dry-stone rib on
 * it — so the walls are *on* the contours because the contours are where the
 * ground already steps, not because a wall was drawn along a guessed line.
 *
 * Then the water that the terraces exist for (the Tarvel, the Dromel, the town
 * spring, the gates and the culvert), Ostel on its shoulder, the burial terrace
 * above it, Vessen on the far flank, the pass stones on the border, and the
 * region's own scatter: chestnut and walnut on the high ground, orchard and vine
 * on the treads below, pale grass and loose stone between the walls.
 *
 * `world.js` hands over the same toolkit `world-regions.js` and `pueth-scenery.js`
 * receive. Everything static shares a small palette so `world.js`'s per-district
 * batching can merge Ostel into a handful of draw calls; everything repeated is
 * instanced.
 */
export function createAmodScenery(kit) {
  const { root, material, mesh, box, post, pebble, rope, fence, barrel, crate, wornPatch, trailSign,
    groundHeight, colliders, dummy, color, wood, woodLight, darkWood, cream, rockMat, roofGeometry, cylinder, round,
    roadDistance, riverMaterial, regionClear } = kit;
  let seed = 812207;
  const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  const range = (a, b) => a + random() * (b - a);
  const smooth = (a, b, x) => { const v = Math.max(0, Math.min(1, (x - a) / (b - a))); return v * v * (3 - 2 * v); };
  const group = new THREE.Group(); group.name = 'Amod scenery'; root.add(group);
  const metrics = { ribs: 0, ribMetres: 0, trees: 0, orchard: 0, vines: 0, rocks: 0, grass: 0, batches: 0, waterColliders: 0, buildings: 0 };

  // The whole region works in one small palette of local stone, so the static
  // batcher can merge a town of thirty buildings into a handful of draws.
  const dryStone = material('#a9a289'), paleStone = material('#bcb59c'), darkStone = material('#8e8874');
  const dressedStone = material('#c6bda2'), slate = material('#6f6f68'), mortar = material('#9d9682');
  const terracotta = material('#8a5f43'), plaster = material('#c3b795'), shutter = material('#6a6b52');

  // -------------------------------------------------------------------------
  // The Tarvel: water in a cut bed, and blockers everywhere but the arch
  // -------------------------------------------------------------------------
  const b = TARVEL_BRIDGE;
  const riverSamples = {};
  {
    const vertices = [], indices = [], outline = [];
    TARVEL_PROFILE.forEach((sample, index) => {
      const next = TARVEL_PROFILE[Math.min(index + 1, TARVEL_PROFILE.length - 1)];
      const previous = TARVEL_PROFILE[Math.max(index - 1, 0)];
      const dx = next.x - previous.x, dz = next.z - previous.z, length = Math.hypot(dx, dz) || 1;
      const nx = -dz / length, nz = dx / length;
      // A stream gathers as it goes: narrow at the head, its full width by the town.
      const half = TARVEL.halfWidth * (.5 + .5 * smooth(0, 26, index));
      vertices.push(sample.x - nx * half, sample.surface, sample.z - nz * half, sample.x + nx * half, sample.surface, sample.z + nz * half);
      if (index) { const v = index * 2; indices.push(v - 2, v, v - 1, v - 1, v, v + 1); }
      outline.push({ x: sample.x, z: sample.z, nx, nz, half });
    });
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.setIndex(indices); geometry.computeVertexNormals(); geometry.computeBoundingSphere();
    const water = new THREE.Mesh(geometry, riverMaterial); water.name = TARVEL.name; group.add(water);
    riverSamples[TARVEL.id] = outline;
    // The stream is not forded: blockers along it, with the road's lane left open.
    for (const sample of outline) {
      const acrossBridge = Math.abs((sample.x - b.crossing.x) * b.axis.x + (sample.z - b.crossing.z) * b.axis.z);
      if (acrossBridge < b.halfSpan + 1.6) continue;
      colliders.push({ x: sample.x, z: sample.z, r: Math.max(1.2, sample.half * .8), kind: 'river-water', river: TARVEL.id });
      metrics.waterColliders++;
    }
    // Bank stones and a few rushes where the water is slow.
    for (let i = 4; i < outline.length; i += 3) {
      const sample = outline[i], side = random() < .5 ? -1 : 1, offset = sample.half + range(.4, 1.8);
      const x = sample.x + sample.nx * offset * side, z = sample.z + sample.nz * offset * side;
      if (roadDistance(x, z) < 3) continue;
      pebble(darkStone, x, groundHeight(x, z) + .12, z, range(.3, .6), .22, range(.3, .5), group);
      if (i % 6 === 0) post(material('#6d7a55'), x + .5, groundHeight(x + .5, z) + .45, z, .02, .9, group);
    }
  }

  // -------------------------------------------------------------------------
  // The Ostel bridge: one stone arch, a parapet, and a shelf for offerings
  // -------------------------------------------------------------------------
  const bridge = new THREE.Group(); bridge.name = 'The Ostel bridge';
  bridge.position.set(b.crossing.x, 0, b.crossing.z);
  bridge.rotation.y = Math.atan2(b.axis.x, b.axis.z); group.add(bridge);
  const deckY = TARVEL_DECK_Y, water = TARVEL_PROFILE[0] && (() => {
    let best = TARVEL_PROFILE[0], bestDistance = Infinity;
    for (const sample of TARVEL_PROFILE) { const d = Math.hypot(sample.x - b.crossing.x, sample.z - b.crossing.z); if (d < bestDistance) { bestDistance = d; best = sample; } }
    return best.surface;
  })();
  // The deck, laid along the road: `axis` is the road, so the span runs along local Z here.
  box(paleStone, 0, deckY - .22, 0, 5.6, .44, b.halfSpan * 2 + 1.2, bridge);
  for (const side of [-1, 1]) {
    box(dryStone, side * 2.55, deckY + .42, 0, .5, .84, b.halfSpan * 2 + 1.2, bridge);          // parapets
    box(dressedStone, side * 2.55, deckY + .88, 0, .62, .14, b.halfSpan * 2 + 1.2, bridge);     // coping
  }
  // The arch: voussoirs turned about the span, springing from both banks.
  const springY = water + .2, riseY = deckY - .55, radius = Math.max(1.2, (riseY - springY));
  for (let i = 0; i <= 9; i++) {
    const angle = Math.PI * (i / 9), az = Math.cos(angle) * (b.halfSpan - .6), ay = Math.sin(angle) * radius;
    const stone = box(dressedStone, 0, springY + ay, az, 4.6, .5, .82, bridge);
    stone.rotation.x = -angle + Math.PI / 2;
  }
  for (const end of [-1, 1]) box(dryStone, 0, springY - .8, end * (b.halfSpan + .2), 5.0, 2.4, 1.6, bridge);
  // The offering shelf on the upstream parapet: a cup of wine and a sprig of herb.
  box(dressedStone, -2.55, deckY + 1.0, 0, .9, .1, .9, bridge);
  post(material('#7d4a3c'), -2.55, deckY + 1.12, 0, .09, .16, bridge);
  post(material('#5f7a48'), -2.4, deckY + 1.15, .25, .015, .22, bridge);
  for (const side of [-1, 1]) for (let along = -b.halfSpan; along <= b.halfSpan + .01; along += 1.4) {
    colliders.push({ x: b.crossing.x + b.axis.x * along + b.side.x * side * 2.6, z: b.crossing.z + b.axis.z * along + b.side.z * side * 2.6, r: .4, kind: 'bridge-rail', bridge: b.id });
  }

  // -------------------------------------------------------------------------
  // The terrace ribs: a wall on every riser the ground already has
  // -------------------------------------------------------------------------
  /**
   * Walk the shaped ground on a two-metre lattice and compare the terrace each
   * sample stands on with its neighbour's. Where they differ the ground is a
   * riser, and a riser is a wall: a rib goes in across the change, so the ribs
   * come out following the contours because the contours are where the ground
   * steps. The segments overlap a little, which is what makes them read as one
   * long wall rather than a row of stones.
   */
  {
    const STEP = 2.1, RIB = 2.9;
    const g = AMOD_TERRACE_GROUND;
    const columns = Math.ceil((g.maxX - g.minX) / STEP) + 1, rows = Math.ceil((g.maxZ - g.minZ) / STEP) + 1;
    const heights = new Float32Array(columns * rows);
    for (let j = 0; j < rows; j++) for (let i = 0; i < columns; i++)
      heights[j * columns + i] = groundHeight(g.minX + i * STEP, g.minZ + j * STEP);
    const ribs = [];
    // Ostel stands on the terraces, so its own clearing must not erase them; what a
    // rib may not stand in is a building, a yard, a stand, the road or the water.
    const keepOut = [
      ...OSTEL_BUILDINGS.map(building => ({ x: building.x, z: building.z, r: Math.max(building.width, building.depth) * .75 })),
      ...Object.values(OSTEL_STANDS).map(stand => ({ x: stand.x, z: stand.z, r: 3.4 })),
      { x: OSTEL_STONE_YARD.x, z: OSTEL_STONE_YARD.z, r: OSTEL_STONE_YARD.radius + 2 },
      { x: OSTEL_SPRING.x, z: OSTEL_SPRING.z, r: 6 }, { x: TIR_OSTEL.x, z: TIR_OSTEL.z, r: TIR_OSTEL.radius },
      { x: VESSEN.x, z: VESSEN.z, r: VESSEN.radius }, { x: TARVEL_HEAD.x, z: TARVEL_HEAD.z, r: 8 },
      { x: DROMEL_GATE.x, z: DROMEL_GATE.z, r: 7 }, { x: TOLL_STONE.x, z: TOLL_STONE.z, r: 9 },
      { x: OGRE_STAND.x, z: OGRE_STAND.z, r: 13 },
      ...AMOD_LANDMARKS.filter(place => ['amod-pass-stones', 'amod-first-terrace', 'amod-culvert', 'kelmod-road'].includes(place.id))
        .map(place => ({ x: place.x, z: place.z, r: 9 })),
    ];
    const ribbable = (x, z) => amodShaping(x, z) > .6 && regionNameAt(x, z) === 'Amod'
      && roadDistance(x, z) > 3.6 && tarvelDistance(x, z) > 4.5
      && !keepOut.some(spot => Math.hypot(spot.x - x, spot.z - z) < spot.r);
    for (let j = 0; j < rows; j++) for (let i = 0; i < columns; i++) {
      const here = heights[j * columns + i], level = terraceLevel(here);
      for (const [di, dj] of [[1, 0], [0, 1]]) {
        const ni = i + di, nj = j + dj;
        if (ni >= columns || nj >= rows) continue;
        const there = heights[nj * columns + ni];
        if (terraceLevel(there) === level) continue;
        const x = g.minX + (i + di / 2) * STEP, z = g.minZ + (j + dj / 2) * STEP;
        if (!ribbable(x, z)) continue;
        // The wall stands across the change, so it lies along the contour.
        const down = there < here ? [di, dj] : [-di, -dj];
        ribs.push({ x, z, top: Math.max(here, there), bottom: Math.min(here, there), yaw: Math.atan2(down[0], down[1]) });
      }
    }
    if (ribs.length) {
      const geometry = new THREE.BoxGeometry(1, 1, 1);
      const batch = new THREE.InstancedMesh(geometry, material('#ffffff'), ribs.length);
      ribs.forEach((rib, index) => {
        const height = Math.max(.7, rib.top - rib.bottom + .55);
        dummy.position.set(rib.x, rib.top + .2 - height / 2, rib.z);
        dummy.rotation.set(0, rib.yaw, 0);
        dummy.scale.set(RIB, height, .62);
        dummy.updateMatrix();
        batch.setMatrixAt(index, dummy.matrix);
        // Courses laid by different hands in different centuries never match.
        batch.setColorAt(index, color.setHSL(range(.09, .13), range(.05, .11), range(.55, .70)));
        metrics.ribMetres += RIB;
      });
      batch.castShadow = true; batch.receiveShadow = true; batch.computeBoundingSphere();
      batch.name = 'Amod terrace ribs'; group.add(batch);
      metrics.ribs = ribs.length; metrics.batches++;
    }
  }

  // -------------------------------------------------------------------------
  // The Dromel: a stone-lined channel that holds grade, and the gate on it
  // -------------------------------------------------------------------------
  {
    const kerb = [];
    DROMEL_PROFILE.forEach((sample, index) => {
      const next = DROMEL_PROFILE[Math.min(index + 1, DROMEL_PROFILE.length - 1)];
      const previous = DROMEL_PROFILE[Math.max(index - 1, 0)];
      const dx = next.x - previous.x, dz = next.z - previous.z, length = Math.hypot(dx, dz) || 1;
      kerb.push({ x: sample.x, z: sample.z, nx: -dz / length, nz: dx / length, level: sample.level, yaw: Math.atan2(dx, dz) });
    });
    const water = new THREE.BufferGeometry(), vertices = [], indices = [];
    kerb.forEach((sample, index) => {
      vertices.push(sample.x - sample.nx * .6, sample.level - .18, sample.z - sample.nz * .6,
        sample.x + sample.nx * .6, sample.level - .18, sample.z + sample.nz * .6);
      if (index) { const v = index * 2; indices.push(v - 2, v, v - 1, v - 1, v, v + 1); }
    });
    water.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    water.setIndex(indices); water.computeVertexNormals(); water.computeBoundingSphere();
    const channel = new THREE.Mesh(water, riverMaterial); channel.name = 'The Dromel'; group.add(channel);
    for (let i = 0; i < kerb.length; i += 2) {
      const sample = kerb[i];
      for (const side of [-1, 1]) {
        const slab = box(dryStone, sample.x + sample.nx * side * .82, sample.level + .02, sample.z + sample.nz * side * .82, .46, .5, 2.2, group);
        slab.rotation.y = sample.yaw;
      }
    }
    // The gate itself: two jambs, a slot, a board half-raised, and the tally cut in the stone.
    const gateY = groundHeight(DROMEL_GATE.x, DROMEL_GATE.z);
    const gate = new THREE.Group(); gate.position.set(DROMEL_GATE.x, gateY, DROMEL_GATE.z);
    gate.rotation.y = Math.atan2(DROMEL_CHANNEL[5].x - DROMEL_CHANNEL[3].x, DROMEL_CHANNEL[5].z - DROMEL_CHANNEL[3].z); group.add(gate);
    for (const side of [-1, 1]) box(dressedStone, side * .95, .62, 0, .5, 1.5, .7, gate);
    box(darkWood, 0, .38, 0, 1.5, .6, .1, gate);                                   // the board, half in its slot
    box(dressedStone, 0, 1.32, 0, 2.4, .22, .8, gate);                             // the lintel the tally is cut in
    for (let i = 0; i < 5; i++) box(darkStone, -.7 + i * .35, 1.32, .42, .05, .12, .04, gate);
    colliders.push({ x: DROMEL_GATE.x, z: DROMEL_GATE.z, r: 1.3, kind: 'water-gate' });
    // The springhouse at the Tarvel head, where the Dromel is taken off.
    const headY = groundHeight(TARVEL_HEAD.x, TARVEL_HEAD.z);
    const house = new THREE.Group(); house.position.set(TARVEL_HEAD.x, headY, TARVEL_HEAD.z); house.rotation.y = .7; group.add(house);
    box(dressedStone, 0, .95, 0, 3.2, 1.9, 2.8, house);
    mesh(roofGeometry(3.8, 3.4, .9), slate, 0, 1.9, 0, 1, 1, 1, house);
    box(darkStone, 0, .62, 1.42, 1.0, 1.2, .12, house);
    box(dressedStone, 0, .18, 2.1, 2.2, .36, 1.4, house);                          // the worn sill
    colliders.push({ x: TARVEL_HEAD.x, z: TARVEL_HEAD.z, r: 2.0, kind: 'springhouse' });
    // A cup of wine on the mended end of the wall beside it.
    post(material('#7d4a3c'), TARVEL_HEAD.x + 2.6, headY + 1.1, TARVEL_HEAD.z + 1.4, .09, .16, group);
  }

  // -------------------------------------------------------------------------
  // Ostel: stone, stacked up the shoulder
  // -------------------------------------------------------------------------
  const faceRoad = building => Math.atan2(OSTEL.across.x, OSTEL.across.z) + (building.b < 4 ? Math.PI : 0);
  /**
   * An Amodian house: a stone undercroft for animals and store, a household above
   * it, and a drying loft under a steep roof, with the shutters that go with a
   * country where the afternoon wind falls off the mountains after sunset.
   */
  function terraceHouse(building) {
    const corners = [[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([sx, sz]) => groundHeight(
      building.x + sx * building.width * .38 + sz * building.depth * .2,
      building.z + sz * building.depth * .38 + sx * building.width * .2));
    const base = Math.min(...corners), fall = Math.max(0, Math.max(...corners) - base);
    const yard = new THREE.Group(); yard.position.set(building.x, base - fall - .4, building.z);
    yard.rotation.y = faceRoad(building); group.add(yard);
    const wallMat = material(building.wall), roofMat = material(building.roof);
    const storeyHeight = 2.5, height = building.storeys * storeyHeight;
    box(dryStone, 0, .55 + fall * .5, 0, building.width + .4, 1.1 + fall, building.depth + .4, yard);   // the undercroft, dug in
    box(wallMat, 0, fall + 1.1 + height / 2, 0, building.width, height, building.depth, yard);
    // Floor bands, so the storeys read from below and the building looks its height.
    for (let storey = 1; storey < building.storeys; storey++)
      box(mortar, 0, fall + 1.1 + storey * storeyHeight, 0, building.width + .16, .14, building.depth + .16, yard);
    const roofBase = fall + 1.1 + height;
    mesh(roofGeometry(building.width + .8, building.depth + .9, 2.3), roofMat, 0, roofBase, 0, 1, 1, 1, yard);
    box(terracotta, 0, roofBase + 2.3, 0, .2, .16, building.depth + .95, yard);
    // The undercroft's cart door, and the stair up the outside to the household.
    box(darkWood, 0, fall * .5 + .75, building.depth / 2 + .22, 1.7, 1.5, .14, yard);
    for (let stair = 0; stair < 5; stair++)
      box(dryStone, building.width / 2 + .45, fall + .28 + stair * .28, building.depth * .2 - stair * .5, 1.0, .3, .5, yard);
    // Small windows, high up where the heat is, and shutters on all of them.
    for (let storey = 1; storey <= building.storeys; storey++) for (const side of [-1, 1]) {
      if (storey === 1 && side < 0) continue;
      const y = fall + 1.1 + storey * storeyHeight - 1.1;
      box(darkStone, side * building.width * .26, y, building.depth / 2 + .08, .72, .86, .12, yard);
      box(material('#3d3b34'), side * building.width * .26, y, building.depth / 2 + .15, .56, .7, .05, yard);
      if (storey < building.storeys) for (const leaf of [-1, 1])
        box(shutter, side * building.width * .26 + leaf * .5, y, building.depth / 2 + .13, .38, .84, .06, yard);
    }
    // The drying loft: an open slatted gable under the ridge, which is where the
    // chestnuts and the herbs go and what makes an Amodian roof so steep.
    if (building.storeys >= 3) for (let slat = 0; slat < 4; slat++)
      box(woodLight, 0, roofBase + .45 + slat * .4, building.depth / 2 + .48 - slat * .18, building.width * .5, .1, .12, yard);
    colliders.push({ x: building.x, z: building.z, hx: building.width * .55, hz: building.depth * .55, kind: 'house' });
    metrics.buildings++;
    return yard;
  }
  for (const building of OSTEL_BUILDINGS) terraceHouse(building);
  wornPatch(OSTEL.centre.x, OSTEL.centre.z, 26, '#b2aa8d', 1.05);

  // The town spring: a basin under a low stone roof, and the first channel off it.
  {
    const s = OSTEL_SPRING, y = groundHeight(s.x, s.z);
    const springHouse = new THREE.Group(); springHouse.position.set(s.x, y, s.z);
    springHouse.rotation.y = Math.atan2(OSTEL.across.x, OSTEL.across.z); group.add(springHouse);
    for (const side of [-1, 1]) box(dressedStone, side * 1.3, .9, 0, .45, 1.8, 1.9, springHouse);
    box(dressedStone, 0, 1.9, 0, 3.2, .3, 2.2, springHouse);
    box(paleStone, 0, .32, .55, 2.2, .64, .9, springHouse);                       // the basin
    box(riverMaterial, 0, .6, .55, 1.9, .05, .66, springHouse);                   // and the water standing in it
    box(dressedStone, 0, .12, 1.5, 1.0, .24, 1.0, springHouse);                   // the overflow sill
    colliders.push({ x: s.x, z: s.z, r: 2.0, kind: 'spring' });
    // The channel away from the overflow, downhill toward the first terraces.
    for (let i = 0; i < 9; i++) {
      const p = ostelPoint(9 - i * 1.6, -12 + i * 2.2), py = groundHeight(p.x, p.z);
      for (const side of [-1, 1]) box(dryStone, p.x + OSTEL.along.x * side * .5, py + .1, p.z + OSTEL.along.z * side * .5, .35, .34, 1.9, group);
    }
  }

  // The stonecutters' yard: half-worked blocks, a saw pit, and the dust of them.
  {
    const yard = OSTEL_STONE_YARD;
    wornPatch(yard.x, yard.z, yard.radius, '#c9c3ab', 1);
    for (let i = 0; i < 11; i++) {
      const angle = i * 2.399, r = range(1.5, yard.radius - 1.5);
      const x = yard.x + Math.sin(angle) * r, z = yard.z + Math.cos(angle) * r, y = groundHeight(x, z);
      const w = range(.7, 1.5), h = range(.4, .9), d = range(.5, 1.2);
      const block = box(i % 3 ? dressedStone : dryStone, x, y + h / 2, z, w, h, d, group);
      block.rotation.y = range(0, 6.28);
      if (i % 4 === 0) colliders.push({ x, z, r: Math.max(w, d) * .6, kind: 'stone-block' });
    }
    // The saw pit, with its frame over it.
    const pit = ostelPoint(21, 20), pitY = groundHeight(pit.x, pit.z);
    for (const side of [-1, 1]) post(wood, pit.x + OSTEL.along.x * side * 1.5, pitY + 1.1, pit.z + OSTEL.along.z * side * 1.5, .1, 2.2, group);
    box(woodLight, pit.x, pitY + 2.1, pit.z, .12, .12, 3.4, group).rotation.y = Math.atan2(OSTEL.along.x, OSTEL.along.z);
    colliders.push({ x: pit.x, z: pit.z, r: 1.4, kind: 'saw-pit' });
  }

  // The road house's yard: the toll table, a bench, barrels, and a cart nobody has unloaded.
  {
    const t = OSTEL_TOLL_TABLE, y = groundHeight(t.x, t.z);
    box(woodLight, t.x, y + .78, t.z, 1.9, .12, .95, group);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) post(wood, t.x + sx * .8, y + .38, t.z + sz * .38, .07, .78, group);
    colliders.push({ x: t.x, z: t.z, hx: 1.1, hz: .7, kind: 'toll-table' });
    for (const [a, bb] of [[-16, 24], [-21, 23], [-12, 22]]) { const p = ostelPoint(a, bb); barrel(p.x, p.z, .95, group); colliders.push({ x: p.x, z: p.z, r: .5, kind: 'barrel' }); }
    const cart = ostelPoint(-26, 24), cartY = groundHeight(cart.x, cart.z);
    const wagon = new THREE.Group(); wagon.position.set(cart.x, cartY + .72, cart.z);
    wagon.rotation.y = Math.atan2(OSTEL.along.x, OSTEL.along.z); group.add(wagon);
    box(woodLight, 0, 0, 0, 1.9, .18, 3.6, wagon);
    for (const side of [-1, 1]) for (const along of [-1, 1]) {
      const wheel = mesh(new THREE.TorusGeometry(.6, .09, 5, 12), darkWood, side * 1.05, -.08, along * .95, 1, 1, 1, wagon);
      wheel.rotation.y = Math.PI / 2;
    }
    for (let i = 0; i < 4; i++) crate(cart.x, cart.z, .62, cartY + .92 + (i % 2) * .64, group);
    colliders.push({ x: cart.x, z: cart.z, r: 1.9, kind: 'cart' });
  }

  // -------------------------------------------------------------------------
  // Tir Ostel, the burial terrace above the town
  // -------------------------------------------------------------------------
  {
    const t = TIR_OSTEL;
    // The best-kept wall in the valley, along the downhill edge, and the dead behind it looking down the water.
    const facing = Math.atan2(OSTEL.along.x, OSTEL.along.z);
    for (let i = -5; i <= 5; i++) {
      const x = t.x + OSTEL.along.x * i * 2.2, z = t.z + OSTEL.along.z * i * 2.2, y = groundHeight(x, z);
      const stone = box(dressedStone, x + OSTEL.across.x * 5, y + .65, z + OSTEL.across.z * 5, 2.3, 1.3, .72, group);
      stone.rotation.y = facing;
    }
    for (let i = 0; i < 14; i++) {
      const a = (i % 7 - 3) * 2.4, across = -2 + Math.floor(i / 7) * 3.2;
      const x = t.x + OSTEL.along.x * a + OSTEL.across.x * across, z = t.z + OSTEL.along.z * a + OSTEL.across.z * across;
      const y = groundHeight(x, z), h = range(.5, .95);
      const marker = box(i % 3 ? paleStone : dryStone, x, y + h / 2, z, .34, h, .18, group);
      marker.rotation.y = facing + range(-.09, .09);
    }
    colliders.push({ x: t.x, z: t.z, r: 3.2, kind: 'burial-terrace' });
  }

  // -------------------------------------------------------------------------
  // Vessen, three roofs and a springhouse on the western flank
  // -------------------------------------------------------------------------
  for (const [dx, dz, width, storeys] of [[0, 0, 6.0, 2], [8, 5, 5.4, 2], [-6, 7, 5.6, 3]]) {
    terraceHouse({ id: `vessen-${dx}`, x: VESSEN.x + dx, z: VESSEN.z + dz, b: 8,
      width, depth: width * .88, storeys, roof: '#6f5741', wall: '#b6ab8f' });
  }
  {
    const x = VESSEN.x - 9, z = VESSEN.z - 6, y = groundHeight(x, z);
    box(dressedStone, x, y + .8, z, 2.4, 1.6, 2.2, group);
    mesh(roofGeometry(3.0, 2.8, .8), slate, x, y + 1.6, z, 1, 1, 1, group);
    colliders.push({ x, z, r: 1.6, kind: 'springhouse' });
    // The first chestnuts of the year, left at the spring.
    for (let i = 0; i < 6; i++) pebble(material('#6d4b32'), x + range(-.7, .7), y + .1, z + 1.5 + range(-.4, .4), .09, .07, .09, group);
  }

  // -------------------------------------------------------------------------
  // The border: pass stones, the toll stone, the first terrace and the culvert
  // -------------------------------------------------------------------------
  const landmark = id => AMOD_LANDMARKS.find(place => place.id === id);
  {
    const spot = landmark('amod-pass-stones');
    for (let i = 0; i < 4; i++) {
      const x = spot.x + Math.sin(i * 1.7) * 3.4, z = spot.z + Math.cos(i * 1.7) * 3.0, y = groundHeight(x, z);
      const h = range(1.7, 2.4);
      const stone = box(i % 2 ? dryStone : darkStone, x, y + h / 2 - .2, z, .72, h, .5, group);
      stone.rotation.set(range(-.05, .05), range(0, 3.14), range(-.06, .06));
      colliders.push({ x, z, r: .55, kind: 'pass-stone' });
      // The offerings: a sprig of herb in a cleft, chestnuts at the foot.
      if (i === 0) post(material('#5f7a48'), x, y + h - .1, z + .2, .018, .3, group);
      if (i === 2) for (let k = 0; k < 5; k++) pebble(material('#6d4b32'), x + range(-.4, .4), y + .08, z + range(.2, .7), .08, .06, .08, group);
    }
  }
  {
    // The toll stone: worn smooth on top from being sat on, with the bowl beside it.
    const spot = TOLL_STONE, y = groundHeight(spot.x, spot.z);
    const stone = box(darkStone, spot.x, y + .85, spot.z, 2.6, 1.7, 1.9, group);
    stone.rotation.y = .3;
    pebble(dressedStone, spot.x, y + 1.72, spot.z, 1.35, .14, .98, group);
    const bowl = mesh(cylinder, woodLight, spot.x + 2.1, y + .18, spot.z + .7, .42, .36, .42, group);
    bowl.rotation.set(0, .4, 0);
    colliders.push({ x: spot.x, z: spot.z, r: 1.6, kind: 'toll-stone' });
    wornPatch(spot.x, spot.z, 7, '#a89f84', 1);
  }
  {
    // The first terrace, with its western end open and half rebuilt.
    const spot = landmark('amod-first-terrace');
    for (let i = -6; i <= 6; i++) {
      const x = spot.x + i * 2.4, z = spot.z + i * .5, y = groundHeight(x, z);
      const built = i > 1;
      const h = built ? range(.5, .8) : 1.3;
      const wall = box(built ? dryStone : paleStone, x, y + h / 2, z, 2.6, h, .66, group);
      wall.rotation.y = .2;
    }
    // The stones the wall-wright has sorted out and not yet put back.
    for (let i = 0; i < 9; i++) {
      const x = spot.x + range(-9, -3), z = spot.z + range(-4, 2);
      pebble(dryStone, x, groundHeight(x, z) + .16, z, range(.25, .45), range(.15, .3), range(.2, .4), group);
    }
  }
  {
    // The culvert: a stone mouth under the road, and the hook leaning on it.
    const spot = landmark('amod-culvert'), y = groundHeight(spot.x, spot.z);
    for (const side of [-1, 1]) box(dressedStone, spot.x + side * .9, y + .35, spot.z, .45, .9, 2.4, group);
    box(dressedStone, spot.x, y + .82, spot.z, 2.3, .26, 2.4, group);
    for (let i = 0; i < 7; i++) pebble(darkStone, spot.x + range(-1.6, 1.6), y + .06, spot.z + range(1.2, 3.2), range(.18, .38), .14, range(.18, .35), group);
    const hook = post(wood, spot.x + 1.6, y + 1.0, spot.z + .6, .045, 2.6, group);
    hook.rotation.set(.35, .4, .2);
    colliders.push({ x: spot.x, z: spot.z, r: 1.2, kind: 'culvert' });
  }
  {
    // The Kelmod road: a fingerpost and the wall where the built world stops.
    const k = KELMOD_ROAD_END, y = groundHeight(k.x, k.z);
    for (let i = -6; i <= 6; i++) {
      const x = k.x + i * 2.4, z = k.z + i * .3;
      if (roadDistance(x, z) < 4) continue;
      box(dryStone, x, groundHeight(x, z) + .5, z, 2.5, 1.0, .6, group);
    }
    post(wood, k.x + 4, y + 1.3, k.z + 3, .1, 2.6, group);
    colliders.push({ x: k.x, z: k.z, hx: k.halfWidth, hz: .2, kind: 'frontier' });
  }
  for (const sign of AMOD_SIGNS) trailSign(sign.x, sign.z, 1, sign.label, sign.yaw, sign.returnLabel, root);

  // -------------------------------------------------------------------------
  // Scatter: chestnut and walnut above, orchard and vine on the treads below
  // -------------------------------------------------------------------------
  const trunkGeometry = new THREE.CylinderGeometry(.2, .34, 1, 6);
  const crownGeometry = new THREE.IcosahedronGeometry(1, 0);
  const vineGeometry = new THREE.BoxGeometry(1, 1, 1);
  const grassGeometry = (() => {
    const positions = [], normals = [];
    for (let blade = 0; blade < 4; blade++) {
      const a = blade * 1.9, bx = Math.cos(a) * .15, bz = Math.sin(a) * .15, w = .05, h = .2 + (blade % 3) * .07;
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
  const grassMaterial = material('#ffffff', { side: THREE.DoubleSide }), stoneMaterial = material('#9a9a86');
  const people = Object.values(OSTEL_STANDS);
  const cellTerrain = new Map(SURVEY.regions.find(region => region.name === 'Amod').cells.map(cell => [`${cell.q},${cell.r}`, cell.terrain]));
  const terrainAt = (x, z) => { const h = hexAt(x, z); return cellTerrain.get(`${h.q},${h.r}`) ?? 'grassland'; };
  /**
   * What grows where. The lore is plain about it: chestnut, oak, beech and walnut
   * above; orchards, vines, pulses and goats below; and the east end drier,
   * stonier and more open than anything further west.
   */
  const woodland = (x, z) => {
    const kind = terrainAt(x, z), high = smooth(-470, -600, z);
    const dry = 1 - smooth(-900, -700, x) * .45;                // the east end is the open end
    return (kind === 'mountain' ? 26 : kind === 'hills' ? 20 : 7) * (.35 + .65 * high) * dry;
  };
  const clearOf = (x, z, margin) => regionClear(x, z, margin) || roadDistance(x, z) < 4
    || tarvelDistance(x, z) < 6 || people.some(p => Math.hypot(p.x - x, p.z - z) < 5);
  const cells = [...REGION_CELLS.Amod].sort((a, c) => a.z - c.z || a.x - c.x);
  const BLOCK = Math.max(1, Math.round(6 / (WORLD_SCALE * WORLD_SCALE)));
  const tuftsPerHex = Math.round(26 * WORLD_SCALE * WORLD_SCALE);
  for (let start = 0; start < cells.length; start += BLOCK) {
    const block = cells.slice(start, start + BLOCK), trees = [], orchard = [], vines = [], rocks = [], tufts = [];
    for (const cell of block) {
      const density = woodland(cell.x, cell.z), attempts = Math.round(density * 1.6);
      for (let i = 0; i < attempts; i++) {
        const x = cell.x + range(-52, 52), z = cell.z + range(-58, 58);
        if (random() * 1.5 > woodland(x, z) / Math.max(1, density)) continue;
        if (regionNameAt(x, z) !== 'Amod' || clearOf(x, z, 2.5)) continue;
        if (trees.some(tree => Math.hypot(tree.x - x, tree.z - z) < 4.6)) continue;
        // Chestnut and oak hold the high ground; walnut is planted, and stands lower and alone.
        const walnut = amodShaping(x, z) > .4 && random() < .3;
        trees.push({ x, z, walnut, s: range(.8, 1.3), h: walnut ? range(8, 11) : range(10, 15), rot: range(0, 6.28) });
      }
      // Orchard and vine only on the terraces, which is the only ground worth the work.
      for (let i = 0; i < 90; i++) {
        const x = cell.x + range(-50, 50), z = cell.z + range(-55, 55);
        if (amodShaping(x, z) < .5 || regionNameAt(x, z) !== 'Amod' || clearOf(x, z, 2)) continue;
        if (trees.some(tree => Math.hypot(tree.x - x, tree.z - z) < 4)) continue;
        const vine = random() < .55;
        const list = vine ? vines : orchard;
        if (list.some(item => Math.hypot(item.x - x, item.z - z) < (vine ? 1.5 : 5))) continue;
        list.push({ x, z, s: range(.8, 1.2), rot: range(0, 6.28) });
      }
      const stony = terrainAt(cell.x, cell.z) === 'grassland' ? 26 : 58;
      for (let i = 0; i < stony; i++) {
        const x = cell.x + range(-50, 50), z = cell.z + range(-55, 55);
        if (regionNameAt(x, z) !== 'Amod' || clearOf(x, z, 1.5)) continue;
        rocks.push({ x, z, s: range(.4, terrainAt(x, z) === 'grassland' ? 1.1 : 2.4), rot: range(0, 6.28) });
      }
      for (let i = 0; i < tuftsPerHex; i++) {
        const x = cell.x + range(-50, 50), z = cell.z + range(-55, 55);
        if (regionNameAt(x, z) !== 'Amod' || roadDistance(x, z) < 2.2) continue;
        tufts.push({ x, z, s: range(.7, 1.5), rot: range(0, 6.28) });
      }
    }
    if (trees.length) {
      const trunks = new THREE.InstancedMesh(trunkGeometry, barkMaterial, trees.length);
      const crowns = new THREE.InstancedMesh(crownGeometry, leafMaterial, Math.max(1, trees.length * 3));
      let crownIndex = 0;
      trees.forEach((tree, index) => {
        const y = groundHeight(tree.x, tree.z), height = tree.h * tree.s;
        dummy.position.set(tree.x, y + height * .34, tree.z); dummy.rotation.set(0, tree.rot, 0);
        dummy.scale.set(tree.s, height * .68, tree.s); dummy.updateMatrix();
        trunks.setMatrixAt(index, dummy.matrix);
        trunks.setColorAt(index, color.setHSL(.09, range(.1, .18), range(.24, .33)));
        colliders.push({ x: tree.x, z: tree.z, r: .5 * tree.s, kind: 'region-tree' });
        for (let c = 0; c < 3; c++) {
          const a = tree.rot + c * 2.1, spread = c === 2 ? 0 : height * .16;
          dummy.position.set(tree.x + Math.sin(a) * spread, y + height * (c === 2 ? .88 : .68), tree.z + Math.cos(a) * spread);
          dummy.rotation.set(range(-.2, .2), a, range(-.18, .18));
          const wide = tree.walnut ? .3 : .36;
          dummy.scale.set(height * wide, height * .3, height * wide); dummy.updateMatrix();
          crowns.setMatrixAt(crownIndex, dummy.matrix);
          crowns.setColorAt(crownIndex++, tree.walnut
            ? color.setHSL(range(.24, .28), range(.2, .3), range(.26, .34))
            : color.setHSL(range(.17, .23), range(.24, .36), range(.3, .4)));
        }
      });
      crowns.count = crownIndex;
      for (const batch of [trunks, crowns]) { batch.castShadow = true; batch.receiveShadow = true; batch.computeBoundingSphere(); group.add(batch); metrics.batches++; }
      metrics.trees += trees.length;
    }
    if (orchard.length) {
      const trunks = new THREE.InstancedMesh(trunkGeometry, barkMaterial, orchard.length);
      const crowns = new THREE.InstancedMesh(crownGeometry, leafMaterial, orchard.length);
      orchard.forEach((tree, index) => {
        const y = groundHeight(tree.x, tree.z), height = 3.4 * tree.s;
        dummy.position.set(tree.x, y + height * .3, tree.z); dummy.rotation.set(0, tree.rot, 0);
        dummy.scale.set(tree.s * .7, height * .6, tree.s * .7); dummy.updateMatrix();
        trunks.setMatrixAt(index, dummy.matrix);
        trunks.setColorAt(index, color.setHSL(.08, .14, range(.3, .38)));
        dummy.position.set(tree.x, y + height * .82, tree.z); dummy.rotation.set(range(-.2, .2), tree.rot, range(-.2, .2));
        dummy.scale.set(height * .44, height * .34, height * .44); dummy.updateMatrix();
        crowns.setMatrixAt(index, dummy.matrix);
        crowns.setColorAt(index, color.setHSL(range(.19, .25), range(.24, .34), range(.34, .44)));
      });
      for (const batch of [trunks, crowns]) { batch.castShadow = true; batch.receiveShadow = true; batch.computeBoundingSphere(); group.add(batch); metrics.batches++; }
      metrics.orchard += orchard.length;
    }
    if (vines.length) {
      const batch = new THREE.InstancedMesh(vineGeometry, leafMaterial, vines.length);
      vines.forEach((vine, index) => {
        dummy.position.set(vine.x, groundHeight(vine.x, vine.z) + .5 * vine.s, vine.z);
        dummy.rotation.set(0, vine.rot, 0); dummy.scale.set(.5 * vine.s, 1.0 * vine.s, .42 * vine.s); dummy.updateMatrix();
        batch.setMatrixAt(index, dummy.matrix);
        batch.setColorAt(index, color.setHSL(range(.21, .27), range(.2, .3), range(.25, .34)));
      });
      batch.castShadow = true; batch.receiveShadow = true; batch.computeBoundingSphere(); group.add(batch);
      metrics.vines += vines.length; metrics.batches++;
    }
    if (rocks.length) {
      const batch = new THREE.InstancedMesh(round, stoneMaterial, rocks.length);
      rocks.forEach((rock, index) => {
        dummy.position.set(rock.x, groundHeight(rock.x, rock.z) + rock.s * .24, rock.z);
        dummy.rotation.set(range(-.16, .16), rock.rot, range(-.16, .16));
        dummy.scale.set(rock.s, rock.s * range(.4, .7), rock.s * range(.75, 1.2)); dummy.updateMatrix();
        batch.setMatrixAt(index, dummy.matrix);
        batch.setColorAt(index, color.setHSL(.13, .06, range(.5, .68)));
        if (rock.s > 1.4) colliders.push({ x: rock.x, z: rock.z, r: rock.s * .6, kind: 'ridge-rock' });
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
        // Pale grass between the walls: this is the dry end of the country.
        batch.setColorAt(index, color.setHSL(range(.12, .17), range(.14, .26), range(.46, .6)));
      });
      batch.receiveShadow = true; batch.computeBoundingSphere(); group.add(batch);
      metrics.grass += tufts.length; metrics.batches++;
    }
  }

  return {
    group, metrics, riverSamples,
    bridge: Object.freeze({ id: b.id, deckY, heading: Math.atan2(b.axis.x, b.axis.z), halfSpan: b.halfSpan, axis: b.axis, side: b.side, crossing: b.crossing }),
  };
}

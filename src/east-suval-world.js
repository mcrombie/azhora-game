import * as THREE from 'three';
import { landDistance, hexOwnerAt, insideRegion } from './region-world.js';
import { WORLD_SCALE } from './world-scale.js';
import {
  PRECINCT, SEA_ROAD_GATE, INNER_GATE, THRESHOLD, SEA_GATE, ELOD_QUAY, BREAKWATER,
  ELOD_BUILDINGS, ELOD_STANDS, ELOD_CISTERNS, ELOD_STREETS, EAST_SUVAL_STANDS,
  NORTH_LIGHT, SORROW_BEACH, SEVENWALLS, SHEPHERDS_CISTERN, EAST_SUVAL_CELLS, EAST_SUVAL_SCATTER,
  eastSuvalClear, quayHeight,
} from './east-suval.js';

/**
 * The scenery of East Suval: the Elodi city of Elod, the places along its coast
 * and its dry valleys, and the region's own scatter.
 *
 * `world.js` hands over the same toolkit the other regions' scenery receives,
 * and everything static goes into the world's batching pass, so the city's
 * eighteen buildings, its walls, its quay and the Threshold cost about as many
 * draw calls as there are materials. Scatter is instanced and batched two hexes
 * at a time, so a camera on the quay submits nothing of the southern hills.
 *
 * The look, from `../world-builder/azhora_lore/geography/regions/svaleen.md`:
 * pale limestone, thin soil, scrub and aromatic plants, cultivated terraces
 * where the slope and the water permit, and an east coast with harder weather
 * than the west. Nothing here is forest; the tallest thing in the region is the
 * Threshold's east wall, and it is meant to be.
 */
export function createEastSuvalScenery(kit) {
  const { root, material, mesh, box, post, pebble, rope, barrel, crate, wornPatch, sign,
    groundHeight, colliders, dummy, color, wood, woodLight, darkWood, cream, roofGeometry, cylinder, round } = kit;
  const group = new THREE.Group(); group.name = 'East Suval scenery'; root.add(group);
  let seed = 6350917;
  const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  const range = (a, b) => a + random() * (b - a);
  const metrics = { buildings: 0, walls: 0, batches: 0, rocks: 0, scrub: 0, tufts: 0, trees: 0, fieldWalls: 0, places: 0 };
  const push = collider => { colliders.push(collider); return collider; };

  // Elodi stone: four quarry greys and a bleached lime wash, one slate for the
  // roofs, and nothing painted anywhere in the city.
  const ashlar = material('#cfc8b2'), ashlarWarm = material('#c6bda4'), ashlarPale = material('#ded7c1');
  const rubble = material('#b3ab94'), stone = material('#9fa093'), stoneDark = material('#7d8179'), shadow = material('#3a3d3b');
  const slateDark = material('#555d5e'), lime = material('#e5e0cd');
  const seaStone = material('#8d9188'), shingle = material('#b6ad94'), iron = material('#494b47');
  const dye = material('#5b3f63');

  const gy = (x, z) => groundHeight(x, z);

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------
  /** A run of wall between two points, in chunks that step with the ground. */
  function wallRun(a, b, height, thickness, mat = ashlar, cap = stoneDark) {
    const length = Math.hypot(b.x - a.x, b.z - a.z), chunks = Math.max(1, Math.round(length / 4));
    const yaw = Math.atan2(b.x - a.x, b.z - a.z);
    for (let c = 0; c < chunks; c++) {
      const t = (c + .5) / chunks, x = a.x + (b.x - a.x) * t, z = a.z + (b.z - a.z) * t;
      const span = length / chunks + .06, base = gy(x, z) - .4;
      const body = box(c % 3 === 1 ? ashlarWarm : mat, x, base + (height + .4) / 2, z, thickness, height + .4, span, group);
      body.rotation.y = yaw;
      const coping = box(cap, x, base + height + .45, z, thickness + .18, .18, span, group);
      coping.rotation.y = yaw;
      metrics.walls++;
    }
    // A collider every metre and a half: closer together than a walker is wide,
    // so nobody slips between two of them and through the wall.
    for (let s = 0; s <= length; s += 1.5) {
      const t = s / length;
      push({ x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t, r: thickness * .62, kind: 'elod-wall' });
    }
  }

  /**
   * An Elodi house: pale rubble walls, a low slate pitch, a blank face to the
   * street with one door and one high window, and a court behind. No flower
   * boxes, no shutters painted, nothing that would survive the salt.
   */
  function elodiHouse(entry) {
    const y = gy(entry.x, entry.z);
    const house = new THREE.Group(); house.position.set(entry.x, y, entry.z); house.rotation.y = entry.yaw; group.add(house);
    const w = entry.width, d = entry.depth, h = entry.height;
    box(stone, 0, .22, 0, w + .4, .74, d + .36, house);                       // the footing course
    box(material(entry.wall), 0, h / 2 + .4, 0, w, h, d, house);
    box(lime, 0, h * .78 + .4, d / 2 + .02, w - .3, h * .38, .06, house);      // the limewashed upper band
    // A low hipped slate roof with a heavy eaves course: rain here is a year's water.
    mesh(roofGeometry(w + .7, d + .7, Math.max(.7, h * .24)), material(entry.roof), 0, h + .42, 0, 1, 1, 1, house);
    box(slateDark, 0, h + .46, 0, w + .78, .12, d + .78, house);
    // The door, and a single high window: Elodi houses look inward.
    box(shadow, 0, 1.1, d / 2 + .05, 1.0, 2.0, .1, house);
    box(darkWood, 0, 1.1, d / 2 + .11, .9, 1.9, .06, house);
    box(shadow, w * .3, h * .72 + .4, d / 2 + .05, .55, .6, .1, house);
    // The court wall behind, and the water channel off the eaves into it.
    box(rubble, 0, .95, -d / 2 - 2.6, w - .6, 1.9, .3, house);
    box(stoneDark, w / 2 - .3, h * .5, d / 2 + .16, .16, h, .16, house);
    push({ x: entry.x, z: entry.z, r: Math.max(w, d) * .58, kind: 'house', width: w, depth: d, angle: entry.yaw });
    metrics.buildings++;
    return house;
  }

  /** A cistern: a stone kerb, a lid, and a bronze rim worn bright. */
  function cistern(spot) {
    const y = gy(spot.x, spot.z);
    for (let i = 0; i < 10; i++) {
      const a = i / 10 * Math.PI * 2;
      box(ashlarWarm, spot.x + Math.sin(a) * spot.radius, y + .28, spot.z + Math.cos(a) * spot.radius, .8, .56, .5, group).rotation.y = a;
    }
    mesh(round, stone, spot.x, y + .58, spot.z, spot.radius * .92, .2, spot.radius * .92, group);
    mesh(cylinder, material('#8f7a46', { metalness: .5, roughness: .45 }), spot.x, y + .7, spot.z, .34, .1, .34, group);
    push({ x: spot.x, z: spot.z, r: spot.radius + .3, kind: 'cistern' });
    return y;
  }

  /** A paved ribbon along a street line, a few centimetres proud of the ground. */
  function paveLine(points, width, mat) {
    const samples = [];
    for (let i = 1; i < points.length; i++) {
      const a = points[i - 1], b = points[i], length = Math.hypot(b.x - a.x, b.z - a.z), steps = Math.max(1, Math.ceil(length / 2));
      for (let s = i === 1 ? 0 : 1; s <= steps; s++)
        samples.push({ x: a.x + (b.x - a.x) * s / steps, z: a.z + (b.z - a.z) * s / steps, dx: (b.x - a.x) / length, dz: (b.z - a.z) / length });
    }
    const positions = [], indices = [];
    samples.forEach((s, index) => {
      for (const side of [-1, 1]) {
        const x = s.x - s.dz * width / 2 * side, z = s.z + s.dx * width / 2 * side;
        positions.push(x, gy(x, z) + .05, z);
      }
      if (index) { const k = index * 2; indices.push(k - 2, k, k - 1, k - 1, k, k + 1); }
    });
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setIndex(indices); geometry.computeVertexNormals();
    const strip = new THREE.Mesh(geometry, mat); strip.receiveShadow = true; group.add(strip);
  }

  /** A flight of steps between two heights, along a line. */
  function stair(from, to, width, mat = ashlarWarm) {
    const dx = to.x - from.x, dz = to.z - from.z, length = Math.hypot(dx, dz);
    const yaw = Math.atan2(dx, dz), steps = Math.max(2, Math.round(length / .9));
    const top = gy(from.x, from.z), bottom = gy(to.x, to.z);
    for (let s = 0; s < steps; s++) {
      const t = (s + .5) / steps, x = from.x + dx * t, z = from.z + dz * t;
      const y = top + (bottom - top) * t;
      box(s % 2 ? mat : ashlar, x, y + .09, z, width, .34, length / steps + .04, group).rotation.y = yaw;
    }
  }

  // ---------------------------------------------------------------------------
  // The Sea-Road Gate: where the stone road ends
  // ---------------------------------------------------------------------------
  {
    const G = SEA_ROAD_GATE, y = gy(G.x, G.z);
    wornPatch(G.x - 6, G.z, 13, '#b6b094', .95);
    for (const side of [-1, 1]) {
      const z = G.z + side * (G.halfWidth + 1.1);
      box(ashlar, G.x, y + 3.1, z, 3.0, 6.2, 2.2, group);
      box(stoneDark, G.x, y + .4, z, 3.5, .8, 2.7, group);
      box(ashlarPale, G.x, y + 6.35, z, 3.4, .35, 2.6, group);
      push({ x: G.x, z, r: 1.5, kind: 'elod-gate' });
    }
    const lintel = box(ashlarWarm, G.x, y + 6.9, G.z, 3.0, 1.1, G.halfWidth * 2 + 4.4, group);
    lintel.name = 'The Sea-Road Gate lintel';
    // Three lines of cut Koleth across the lintel's outer face: what the road is
    // for, and not one word about who may use it.
    for (let line = 0; line < 3; line++)
      box(shadow, G.x - 1.52, y + 7.22 - line * .3, G.z, .04, .12, G.halfWidth * 2 + 2.6, group);
    // The gate itself: shut, and a collider across the opening.
    for (const leaf of [-1, 1]) {
      const door = box(darkWood, G.x, y + 2.2, G.z + leaf * G.halfWidth / 2, .3, 4.4, G.halfWidth, group);
      door.name = `Elod gate leaf ${leaf > 0 ? 'south' : 'north'}`;
      for (let bar = 0; bar < 3; bar++) box(iron, G.x - .18, y + 1.0 + bar * 1.5, G.z + leaf * G.halfWidth / 2, .08, .2, G.halfWidth - .2, group);
    }
    push({ x: G.x, z: G.z, hx: .5, hz: G.halfWidth, kind: 'elod-gate-shut' });
    // Wing walls north and south along the crest, the city's landward face.
    wallRun({ x: G.x - .6, z: G.z - G.halfWidth - 2.2 }, { x: G.x - 2.4, z: G.z - G.wing - 4 }, 4.2, 1.2);
    wallRun({ x: G.x - .6, z: G.z + G.halfWidth + 2.2 }, { x: G.x - 2.4, z: G.z + G.wing + 4 }, 4.2, 1.2);
    sign(G.x - 9, G.z + 5.5, 'Elod', Math.PI / 2 + .4, 'East Suval');
  }

  // ---------------------------------------------------------------------------
  // The precinct: the levelled shelf, its revetment, its wall and its shut gate
  // ---------------------------------------------------------------------------
  {
    const P = PRECINCT, level = P.level;
    // The revetment: the built face that holds the platform up over the harbour.
    for (let z = P.minZ; z <= P.maxZ; z += 2.4) {
      const foot = gy(P.maxX + 7, z), drop = Math.max(0, level - foot);
      for (let course = 0; course < Math.ceil(drop / 1.1); course++) {
        const y = level - .55 - course * 1.1, inset = course * .22;
        box(course % 2 ? rubble : ashlarWarm, P.maxX + 1.1 + inset, y, z, 2.2 + inset * .6, 1.1, 2.5, group);
      }
    }
    for (let z = P.minZ; z <= P.maxZ; z += 3) push({ x: P.maxX + 1.4, z, r: 1.6, kind: 'elod-revetment' });
    // The wall: high on three sides, a parapet on the seaward one.
    const corner = (x, z) => ({ x, z });
    wallRun(corner(P.minX, P.minZ), corner(INNER_GATE.x - INNER_GATE.halfWidth - .8, P.minZ), P.wallHeight, P.thickness);
    wallRun(corner(INNER_GATE.x + INNER_GATE.halfWidth + .8, P.minZ), corner(P.maxX, P.minZ), P.wallHeight, P.thickness);
    wallRun(corner(P.maxX, P.minZ), corner(P.maxX, P.maxZ), P.eastWallHeight, P.thickness, ashlarPale);
    wallRun(corner(P.maxX, P.maxZ), corner(P.minX, P.maxZ), P.wallHeight, P.thickness);
    wallRun(corner(P.minX, P.minZ), corner(P.minX, P.maxZ), P.wallHeight, P.thickness);
    // The Inner Gate: two jambs, a lintel, one shut leaf, and a warden's step.
    {
      const g = INNER_GATE, y = level;
      for (const side of [-1, 1]) {
        box(ashlar, g.x + side * (g.halfWidth + .7), y + 2.6, g.z, 1.4, 5.2, 1.8, group);
        push({ x: g.x + side * (g.halfWidth + .7), z: g.z, r: .9, kind: 'elod-inner-gate' });
      }
      box(ashlarWarm, g.x, y + 5.45, g.z, g.halfWidth * 2 + 2.8, .7, 1.8, group).name = 'The Inner Gate lintel';
      const leaf = box(darkWood, g.x, y + g.height / 2, g.z, g.halfWidth * 2, g.height, .22, group);
      leaf.name = 'The Inner Gate';
      box(iron, g.x, y + 1.9, g.z - .14, g.halfWidth * 2 - .3, .16, .07, group);
      push({ x: g.x, z: g.z, hx: g.halfWidth, hz: .4, kind: 'elod-inner-gate-shut' });
      // The list of who has been vouched for, nailed to the frame.
      box(cream, g.x + g.halfWidth + .1, y + 1.6, g.z - .95, .34, .5, .03, group);
      stair({ x: g.x, z: g.z - 1.2 }, { x: g.x, z: g.z - 4.6 }, 4.2);
    }
    wornPatch(INNER_GATE.x, P.minZ - 4.5, 8, '#bab48f', 1);
  }

  // ---------------------------------------------------------------------------
  // The Threshold: the strongest piece of stone in the region, facing east
  // ---------------------------------------------------------------------------
  {
    const T = THRESHOLD, base = PRECINCT.level;
    const platformTop = base + T.platform;
    // A stepped platform of great blocks.
    for (let course = 0; course < 3; course++) {
      const grow = (2 - course) * .55;
      box(course % 2 ? ashlarPale : ashlar, T.x, base + T.platform * (course + .5) / 3, T.z,
        (T.halfX + grow) * 2, T.platform / 3 + .02, (T.halfZ + grow) * 2, group);
    }
    push({ x: T.x, z: T.z, hx: T.halfX + 1.2, hz: T.halfZ + 1.2, kind: 'threshold-platform' });
    // The court: high blank walls north, south and west; the great wall east.
    const courtTop = platformTop + T.courtWall;
    for (const side of [-1, 1])
      box(ashlar, T.x, platformTop + T.courtWall / 2, T.z + side * (T.halfZ - .55), T.halfX * 2, T.courtWall, 1.1, group);
    // The west wall, with the one doorway the court is entered by, under the porch.
    for (const side of [-1, 1]) {
      const span = (T.halfZ * 2 - 1.1 - 2.6) / 2;
      box(ashlar, T.x - T.halfX + .55, platformTop + T.courtWall / 2, T.z + side * (1.3 + span / 2), 1.1, T.courtWall, span, group);
    }
    box(ashlar, T.x - T.halfX + .55, platformTop + T.courtWall - .8, T.z, 1.1, 1.6, 2.6, group);
    for (const side of [-1, 1])
      box(ashlarPale, T.x, courtTop + .16, T.z + side * (T.halfZ - .55), T.halfX * 2 + .3, .32, 1.4, group);
    // The east wall: ten metres of ashlar with one opening, and nothing in it.
    {
      const x = T.x + T.halfX - .7, top = platformTop + T.eastWall, o = T.opening;
      const sill = platformTop + .9;
      for (const side of [-1, 1])
        box(ashlar, x, platformTop + T.eastWall / 2, T.z + side * (o.width / 2 + (T.halfZ - o.width / 2) / 2),
          1.4, T.eastWall, T.halfZ - o.width / 2, group);
      box(ashlar, x, sill + o.height + (top - sill - o.height) / 2, T.z, 1.4, top - sill - o.height, o.width, group);
      box(ashlarWarm, x, sill - .45, T.z, 1.6, .9, o.width + 1.2, group);              // the sill
      box(shadow, x + .1, sill + o.height / 2, T.z, 1.2, o.height, o.width, group);     // the opening, unfilled
      box(ashlarPale, x, top + .3, T.z, 1.9, .6, T.halfZ * 2, group);                   // the crowning course
      // A band of cut lettering across the face, below the opening. No image, of
      // Balog or of anything that lives: the Elodi make none inside these walls.
      for (let line = 0; line < 2; line++)
        box(shadow, x + .72, sill - 1.5 - line * .42, T.z, .05, .16, T.halfZ * 2 - 2.4, group);
      metrics.places++;
    }
    // The porch on the west: four square piers and a flat lintel, and the basin.
    for (let i = 0; i < 4; i++) {
      const z = T.z - 4.5 + i * 3;
      box(ashlarWarm, T.porch.x + 1.4, base + 2.3, z, 1.0, 4.6, 1.0, group);
      push({ x: T.porch.x + 1.4, z, r: .6, kind: 'threshold-pier' });
    }
    box(ashlar, T.porch.x + 1.4, base + 4.9, T.z, 1.3, .6, 11.4, group);
    {
      const b = T.basin, y = gy(b.x, b.z);
      mesh(cylinder, ashlarPale, b.x, y + .45, b.z, 1.1, .9, 1.1, group);
      mesh(cylinder, material('#7f8f8c'), b.x, y + .88, b.z, .92, .08, .92, group);
      push({ x: b.x, z: b.z, r: 1.2, kind: 'threshold-basin' });
    }
  }

  // ---------------------------------------------------------------------------
  // The Sea Gate and the stepped street down to the water
  // ---------------------------------------------------------------------------
  {
    const S = SEA_GATE, y = gy(S.x, S.z);
    for (const side of [-1, 1]) {
      const z = S.z + side * (S.halfWidth + .8);
      box(ashlar, S.x, y + 2.4, z, 1.6, 4.8, 1.6, group);
      push({ x: S.x, z, r: .9, kind: 'sea-gate-pier' });
    }
    box(ashlarWarm, S.x, y + 5.1, S.z, 1.6, .8, S.halfWidth * 2 + 3.2, group);
    box(cream, S.x - .85, y + 1.7, S.z + S.halfWidth + .2, .04, .7, .5, group);   // the rule, in three languages
    for (const run of S.runs) wallRun(run[0], run[1], 2.9, .9, rubble);
    // The steps: the street between the gate and the quay drops eight metres.
    stair({ x: -19, z: 612.5 }, { x: -15, z: 616 }, 3.6);
    sign(S.x + 2.6, S.z + 5.2, 'The Quay', -Math.PI / 2 + .3, 'Elod');
  }

  // ---------------------------------------------------------------------------
  // The quay, the landing stage and the breakwater
  // ---------------------------------------------------------------------------
  {
    const Q = ELOD_QUAY;
    const width = Q.maxX - Q.minX, length = Q.maxZ - Q.minZ;
    const mid = { x: (Q.minX + Q.maxX) / 2, z: (Q.minZ + Q.maxZ) / 2 };
    box(seaStone, mid.x, Q.deckY - 2.7, mid.z, width, 5.4, length, group);
    for (const height of [1.1, 2.1, 3.1]) box(stoneDark, mid.x, height, mid.z, width - .3, .13, length + .1, group);
    box(ashlarPale, mid.x, Q.deckY - .12, mid.z, width, .24, length, group);
    // A kerb of set stones along the seaward edge, and a collider behind every
    // one of them. Past the quay's face the foreshore lies a few metres outside
    // East Suval's outline, and `closed-border.js` refuses a step back in from
    // there, so nobody may walk down off the deck except where there are steps.
    for (let z = Q.minZ + .7; z <= Q.maxZ - .7; z += 1.3)
      box(ashlarPale, Q.maxX - .3, Q.deckY + .1, z, .5, .2, 1.1, group);
    for (let z = Q.minZ - 1; z <= Q.maxZ + 1; z += 1.1) push({ x: Q.maxX + .55, z, r: .62, kind: 'quay-kerb' });
    for (const ring of Q.rings) {
      post(stoneDark, ring.x, Q.deckY + .22, ring.z, .2, .44, group);
      mesh(cylinder, iron, ring.x, Q.deckY + .5, ring.z, .22, .06, .22, group).rotation.x = Math.PI / 2;
      push({ x: ring.x, z: ring.z, r: .3, kind: 'mooring-ring' });
    }
    // The derrick: a stone post, a timber jib and a rope fall.
    {
      const c = Q.crane;
      box(ashlar, c.x, Q.deckY + 1.5, c.z, 1.0, 3.0, 1.0, group);
      const jib = box(wood, c.x + 1.6, Q.deckY + 3.5, c.z, 4.6, .24, .24, group); jib.rotation.z = .16;
      rope([new THREE.Vector3(c.x + 3.7, Q.deckY + 3.8, c.z), new THREE.Vector3(c.x + 3.8, Q.deckY + 1.6, c.z), new THREE.Vector3(c.x + 3.8, Q.deckY + .6, c.z)], .04, material('#bda87f'), group);
      push({ x: c.x, z: c.z, r: .8, kind: 'quay-derrick' });
    }
    // The steps down the face, the foreshore, and the timber landing stage.
    {
      const s = Q.steps, foot = { x: Q.maxX + 3.4, z: s.z };
      for (let i = 0; i < 6; i++)
        box(i % 2 ? ashlar : ashlarWarm, Q.maxX + .5 + i * .55, Q.deckY - .45 - i * .55, s.z, .6, .5, 2.6, group);
      wornPatch(foot.x, foot.z, 4.5, '#b1a88f');
      const stage = ELOD_QUAY.stage, y = gy(stage.x, stage.z);
      for (const dz of [-1.8, 1.8]) for (const dx of [-1.6, 1.6]) post(darkWood, stage.x + dx, y + .5, stage.z + dz, .13, 1.6, group);
      box(woodLight, stage.x, y + 1.3, stage.z, 4.0, .16, 4.4, group);
      push({ x: stage.x, z: stage.z, hx: 2.0, hz: 2.2, kind: 'landing-stage' });
    }
    // Barrels, crates and the salt-fish racks on the quay's southern end.
    for (const [bx, bz] of [[-10.5, 640], [-9.2, 641.4], [-10.8, 643.5], [-7.5, 632], [-8.8, 630.5]]) barrel(bx, bz, .95, group);
    for (const [cx, cz] of [[-11.5, 636], [-7.2, 622.5]]) crate(cx, cz, .8, null, group);
    const fishMat = material('#c7bfa4');
    for (const rz of [650, 653, 656]) {
      const rx = -9, y = gy(rx, rz);
      for (const side of [-1, 1]) post(wood, rx + side * 1.9, y + .95, rz, .09, 1.9, group);
      for (let i = 0; i < 3; i++) box(wood, rx, y + 1.05 + i * .35, rz, 4.0, .07, .07, group);
      for (let i = 0; i < 8; i++) box(fishMat, rx - 1.5 + (i % 4) * .9, y + 1.05 + Math.floor(i / 4) * .35, rz + .04, .17, .46, .05, group);
      push({ x: rx, z: rz, hx: 2.1, hz: .3, kind: 'drying-rack' });
    }
    // The breakwater: tumbled rock out of the water, with no deck on it at all.
    const S = BREAKWATER.spine;
    for (let i = 1; i < S.length; i++) {
      const a = S[i - 1], b = S[i], length = Math.hypot(b.x - a.x, b.z - a.z), steps = Math.ceil(length / 2.2);
      for (let s = 0; s < steps; s++) {
        const t = (s + .5) / steps, x = a.x + (b.x - a.x) * t, z = a.z + (b.z - a.z) * t;
        const floor = gy(x, z), top = BREAKWATER.crest;
        const blocks = Math.max(2, Math.ceil((top - floor) / 1.3));
        for (let k = 0; k < blocks; k++) {
          const spread = BREAKWATER.halfWidth * (1 - k / blocks) + .6;
          const block = pebble(k % 2 ? seaStone : stone, x + range(-.5, .5), floor + (top - floor) * (k + .5) / blocks,
            z + range(-.5, .5), spread, 1.5, spread * .9, group);
          block.rotation.set(range(-.2, .2), range(0, 6.28), range(-.2, .2));
        }
        push({ x, z, r: BREAKWATER.halfWidth * .8, kind: 'breakwater' });
      }
    }
    metrics.places++;
  }

  /**
   * The city's sea wall.
   *
   * On this coast the authored land ends where the hex ends, and the smoothing
   * that turns a hexagonal edge into an ordinary coastline leaves one to three
   * metres of standable beach *outside* East Suval's outline. East Suval is a
   * closed region, and `closed-border.js` refuses a step from outside it to
   * inside it — so a traveler who walked down to the water there would be stuck
   * on the beach. Elod's waterfront is therefore walled, which is what a city on
   * a hard coast does anyway: a low parapet of rubble along the top of the
   * foreshore, with the quay's own kerb continuing it.
   */
  {
    let built = 0, previous = null;
    const stud = (x, z) => {
      const y = gy(x, z);
      if (quayHeight(x, z) !== null) return;
      push({ x, z, r: .75, kind: 'elod-sea-wall' });
      if (y < .5 || built++ % 3) return;
      box(built % 2 ? rubble : stone, x, y + .45, z, .9, .9, 2.4, group);
      box(stoneDark, x, y + .95, z, 1.05, .14, 2.4, group);
    };
    for (let z = 556; z <= 712; z += 1.1) {
      let edge = null;
      for (let x = 62; x >= -70; x -= .5) if (insideRegion('East Suval', x, z)) { edge = x; break; }
      if (edge === null) { previous = null; continue; }
      const here = { x: edge - 1.2, z };
      // The outline runs diagonally where the coast turns, so the studs follow
      // the line between one sample and the next rather than jumping across it.
      if (previous) {
        const steps = Math.ceil(Math.hypot(here.x - previous.x, here.z - previous.z) / .8);
        for (let k = 1; k <= steps; k++)
          stud(previous.x + (here.x - previous.x) * k / steps, previous.z + (here.z - previous.z) * k / steps);
      } else stud(here.x, here.z);
      previous = here;
    }
  }

  // ---------------------------------------------------------------------------
  // The city: streets, houses, cisterns, the grain store's feet, the dye yard
  // ---------------------------------------------------------------------------
  for (const street of ELOD_STREETS) paveLine(street, 3.4, material('#c1b89c'));
  wornPatch(-34, 664, 16, '#b8b195', 1);
  wornPatch(-17, 630, 13, '#b4ac90', 1.1);
  for (const entry of ELOD_BUILDINGS) elodiHouse(entry);
  for (const spot of ELOD_CISTERNS) cistern(spot);
  {
    // The grain store stands on stone feet, off the ground and out of the damp.
    const store = ELOD_BUILDINGS.find(b => b.id === 'grain-store'), y = gy(store.x, store.z);
    for (const dx of [-3, 0, 3]) for (const dz of [-2.4, 2.4])
      mesh(cylinder, stone, store.x + dx, y + .3, store.z + dz, .5, .6, .5, group);
    box(iron, store.x, y + 2.2, store.z + store.depth / 2 + .14, .5, .5, .06, group);   // the city's seal on the door
  }
  {
    // The dye yard: sunken vats, a rack of drying cloth, and the whelk heap.
    const yard = ELOD_BUILDINGS.find(b => b.id === 'dyers-house');
    for (let i = 0; i < 5; i++) {
      const x = yard.x + 4 + (i % 3) * 2.3, z = yard.z + 4.2 + Math.floor(i / 3) * 2.4, y = gy(x, z);
      mesh(cylinder, stone, x, y + .35, z, 1.0, .7, 1.0, group);
      mesh(cylinder, dye, x, y + .68, z, .86, .06, .86, group);
      push({ x, z, r: 1.1, kind: 'dye-vat' });
    }
    const hx = yard.x + 9, hz = yard.z + 1.5, hy = gy(hx, hz);
    for (let i = 0; i < 9; i++) pebble(shingle, hx + range(-1.6, 1.6), hy + .1 + random() * .2, hz + range(-1.6, 1.6), .3, .18, .28, group);
    for (const side of [-1, 1]) post(wood, yard.x + 6.4, gy(yard.x + 6.4, yard.z - 3 + side * 2.5) + 1.1, yard.z - 3 + side * 2.5, .09, 2.2, group);
    const cloth = box(material('#6a4a72'), yard.x + 6.4, gy(yard.x + 6.4, yard.z - 3) + 1.5, yard.z - 3, .06, 1.4, 4.4, group);
    cloth.rotation.x = .04;
  }
  {
    // The writing school's court: benches under an awning, where the copying is done.
    const school = ELOD_BUILDINGS.find(b => b.id === 'scribe-school');
    const cx = school.x, cz = school.z - 6.6, y = gy(cx, cz);
    for (const dz of [-1.4, 1.4]) for (const dx of [-3.6, 3.6]) post(wood, cx + dx, y + 1.2, cz + dz, .09, 2.4, group);
    box(material('#cbbd96'), cx, y + 2.45, cz, 8.4, .08, 3.4, group).rotation.z = .04;
    for (const dx of [-2.4, 0, 2.4]) {
      box(woodLight, cx + dx, y + .5, cz, 1.6, .14, 1.0, group);
      push({ x: cx + dx, z: cz, hx: .8, hz: .5, kind: 'school-bench' });
    }
  }

  // ---------------------------------------------------------------------------
  // The North Light
  // ---------------------------------------------------------------------------
  {
    const L = NORTH_LIGHT, y = gy(L.x, L.z);
    const courses = Math.round(L.towerHeight / .85);
    for (let course = 0; course < courses; course++) {
      const r = 2.5 - course * .06, count = 11;
      for (let i = 0; i < count; i++) {
        const a = i / count * Math.PI * 2 + course * .28;
        box(course < courses * .5 ? lime : (course % 2 ? ashlar : ashlarPale),
          L.x + Math.sin(a) * r, y + .4 + course * .85, L.z + Math.cos(a) * r, 1.1, .85, .8, group).rotation.y = a;
      }
    }
    const top = y + .4 + courses * .85;
    mesh(cylinder, stoneDark, L.x, top + .2, L.z, 2.8, .4, 2.8, group);
    for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; post(iron, L.x + Math.sin(a) * 1.1, top + 1.0, L.z + Math.cos(a) * 1.1, .06, 1.2, group); }
    mesh(round, iron, L.x, top + 1.5, L.z, .85, .55, .85, group);
    for (let i = 0; i < 5; i++) pebble(material('#7d6a4e'), L.x + range(-.4, .4), top + 1.5, L.z + range(-.4, .4), .24, .18, .3, group);
    push({ x: L.x, z: L.z, r: 2.7, kind: 'north-light' });
    // The keeper's hut, his oil jars, and the path he has worn between the two.
    const hut = { id: 'light-hut', x: NORTH_LIGHT.keeperHut.x, z: NORTH_LIGHT.keeperHut.z, width: 6.0, depth: 4.8, height: 3.0, yaw: -Math.PI / 2, roof: '#646c6c', wall: '#cec6ae' };
    elodiHouse(hut);
    for (const [ox, oz] of [[-67, 544], [-66.4, 545.6]]) barrel(ox, oz, .85, group);
    wornPatch((L.x + hut.x) / 2, (L.z + hut.z) / 2, 5.5, '#b3ab8e');
    metrics.places++;
  }

  // ---------------------------------------------------------------------------
  // Sorrow Beach: seven roofs, no quay, and the stone with the names on it
  // ---------------------------------------------------------------------------
  {
    const S = SORROW_BEACH;
    wornPatch(S.x + 5, S.z, 15, '#b8af95', 1.2);
    for (const hut of S.huts) elodiHouse({ ...hut, roof: '#5c6566', wall: '#c2bba3' });
    // Boats hauled bodily up the shingle, keel up.
    for (const spot of S.boats) {
      const y = gy(spot.x, spot.z), yaw = range(1.2, 1.9);
      const boat = new THREE.Group(); boat.position.set(spot.x, y + .36, spot.z); boat.rotation.set(Math.PI, yaw, .05); group.add(boat);
      const outline = [[0, -2.4], [.82, -1.6], [.95, .65], [.6, 1.9], [0, 2.3], [-.6, 1.9], [-.95, .65], [-.82, -1.6]];
      const bp = [], bi = [];
      for (const [bx, bz] of outline) bp.push(bx, .5, bz, bx * .55, -.28, bz * .8);
      for (let i = 0; i < outline.length; i++) { const a = i * 2, b = ((i + 1) % outline.length) * 2; bi.push(a, b, a + 1, b, b + 1, a + 1); }
      const hull = new THREE.BufferGeometry();
      hull.setAttribute('position', new THREE.Float32BufferAttribute(bp, 3)); hull.setIndex(bi); hull.computeVertexNormals();
      mesh(hull, material('#5f6d63', { side: THREE.DoubleSide }), 0, 0, 0, 1, 1, 1, boat);
      push({ x: spot.x, z: spot.z, r: 1.4, kind: 'beached-boat' });
    }
    // The name stone. Three hands, which means three generations of it.
    {
      const n = S.namestone, y = gy(n.x, n.z);
      const menhir = box(ashlarWarm, n.x, y + 1.35, n.z, .9, 2.7, .7, group);
      menhir.rotation.set(.04, .7, .05);
      for (let i = 0; i < 7; i++) box(shadow, n.x + .43, y + .6 + i * .28, n.z, .04, .1, .44, group);
      push({ x: n.x, z: n.z, r: .8, kind: 'name-stone' });
      for (let i = 0; i < 6; i++) { const a = i * 1.05; pebble(shingle, n.x + Math.sin(a) * 2.2, gy(n.x + Math.sin(a) * 2.2, n.z + Math.cos(a) * 2.2) + .1, n.z + Math.cos(a) * 2.2, .34, .2, .3, group); }
    }
    for (let i = 0; i < 4; i++) {
      const rx = S.x + 3 + (i % 2) * 3, rz = S.z - 6 + Math.floor(i / 2) * 12, y = gy(rx, rz);
      for (const side of [-1, 1]) post(wood, rx + side * 1.6, y + .9, rz, .08, 1.8, group);
      for (let k = 0; k < 2; k++) box(wood, rx, y + 1.0 + k * .4, rz, 3.4, .06, .06, group);
    }
    metrics.places++;
  }

  // ---------------------------------------------------------------------------
  // Sevenwalls: four terraces, a covered cistern and an olive press
  // ---------------------------------------------------------------------------
  {
    const V = SEVENWALLS;
    for (const terrace of V.terraces) {
      const cos = Math.cos(terrace.yaw), sin = Math.sin(terrace.yaw);
      for (let s = -terrace.length / 2; s <= terrace.length / 2; s += 1.6) {
        const x = terrace.x + sin * s, z = terrace.z + cos * s, y = gy(x, z);
        for (let course = 0; course < 3; course++)
          box(course % 2 ? rubble : stone, x, y + .2 + course * .38, z, 1.7, .38, .75, group).rotation.y = terrace.yaw;
        if (Math.round(s) % 6 === 0) push({ x, z, hx: .85, hz: .42, kind: 'field-wall' });
      }
      metrics.fieldWalls++;
    }
    for (const hut of V.huts) elodiHouse({ ...hut, roof: '#6b6f68', wall: '#c6bea6' });
    cistern({ ...V.cistern, radius: 2.7 });
    {
      // The press: a stone bed, a great beam and the weight stone on its end.
      const p = V.press, y = gy(p.x, p.z);
      mesh(cylinder, ashlarPale, p.x, y + .35, p.z, 1.7, .7, 1.7, group);
      const beam = box(darkWood, p.x + 2.6, y + 1.9, p.z, 6.4, .42, .42, group); beam.rotation.z = -.1;
      post(wood, p.x, y + 1.3, p.z + 1.4, .16, 2.6, group);
      pebble(stone, p.x + 5.4, y + .7, p.z, .9, 1.1, .9, group);
      push({ x: p.x, z: p.z, r: 1.8, kind: 'olive-press' });
      for (const [jx, jz] of [[-207, 686], [-208.4, 684.6]]) barrel(jx, jz, .8, group);
    }
    wornPatch(V.x, V.z, 12, '#b7ae90', 1);
    metrics.places++;
  }

  // ---------------------------------------------------------------------------
  // The shepherds' cistern in the dry hills
  // ---------------------------------------------------------------------------
  {
    const C = SHEPHERDS_CISTERN;
    cistern({ ...C, radius: 2.1 });
    const ty = gy(C.x + 3.2, C.z + .6);
    box(stone, C.x + 3.2, ty + .3, C.z + .6, 1.0, .6, 3.4, group);
    mesh(cylinder, material('#7f8f8c'), C.x + 3.2, ty + .58, C.z + .6, .42, .06, .42, group).rotation.x = Math.PI / 2;
    push({ x: C.x + 3.2, z: C.z + .6, hx: .6, hz: 1.8, kind: 'trough' });
    // The fold: a ring of piled rock with a gap in it.
    for (let i = 0; i < 20; i++) {
      const a = i / 20 * Math.PI * 2;
      if (a > 2.5 && a < 3.1) continue;
      const x = C.fold.x + Math.sin(a) * 7, z = C.fold.z + Math.cos(a) * 7, y = gy(x, z);
      for (let course = 0; course < 2; course++) box(course % 2 ? stone : rubble, x, y + .22 + course * .4, z, 1.5, .4, .7, group).rotation.y = a;
      push({ x, z, r: .7, kind: 'fold-wall' });
    }
    wornPatch(C.fold.x, C.fold.z, 7, '#b0a88c');
    metrics.places++;
  }

  // ---------------------------------------------------------------------------
  // The region's own scatter, batched two hexes at a time
  // ---------------------------------------------------------------------------
  const per = count => Math.round(count * WORLD_SCALE * WORLD_SCALE);
  const ROCKS = per(EAST_SUVAL_SCATTER.rocksPerHex), SCRUB = per(EAST_SUVAL_SCATTER.scrubPerHex);
  const TUFTS = per(EAST_SUVAL_SCATTER.tuftsPerHex), TREES = per(EAST_SUVAL_SCATTER.treesPerHex);
  const grassGeometry = (() => {
    const positions = [], normals = [];
    for (let blade = 0; blade < 4; blade++) {
      const a = blade * 1.9, bx = Math.cos(a) * .14, bz = Math.sin(a) * .14, w = .05, h = .15 + (blade % 3) * .06;
      const cx = Math.cos(a + Math.PI / 2) * w, cz = Math.sin(a + Math.PI / 2) * w;
      positions.push(bx - cx, 0, bz - cz, bx + cx, 0, bz + cz, bx + Math.cos(a) * .06, h, bz + Math.sin(a) * .06);
      for (let j = 0; j < 3; j++) normals.push(0, 1, 0);
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    return geometry;
  })();
  const trunkGeometry = new THREE.CylinderGeometry(.16, .3, 1, 6);
  const grassMaterial = material('#ffffff', { side: THREE.DoubleSide });
  const cushionMaterial = material('#ffffff', { flatShading: true });
  const rockMaterial = material('#a3a496');
  const barkMaterial = material('#6d6350');
  const crownMaterial = material('#ffffff', { flatShading: true });
  const stands = [...Object.values(ELOD_STANDS), ...Object.values(EAST_SUVAL_STANDS)];
  const clear = (x, z, margin) => eastSuvalClear(x, z, margin)
    || stands.some(stand => Math.hypot(stand.x - x, stand.z - z) < 4 + margin)
    || (kit.roadDistance ? kit.roadDistance(x, z) < 1.6 + margin : false);

  // Two hexes to a block, so a batch's bounding sphere is about two hundred
  // metres across and a camera on the quay submits none of the southern hills.
  const cells = [...EAST_SUVAL_CELLS].sort((a, b) => a.r - b.r || a.q - b.q);
  for (let index = 0; index < cells.length; index += 2) {
    const block = cells.slice(index, index + 2);
    const rocks = [], scrub = [], tufts = [], trees = [];
    for (const cell of block) {
      const hills = cell.terrain === 'hills';
      const sample = () => ({ x: cell.x + range(-52, 52), z: cell.z + range(-58, 58) });
      for (let i = 0; i < ROCKS; i++) {
        const { x, z } = sample();
        if (hexOwnerAt(x, z) !== 'East Suval' || landDistance(x, z) < .5 || clear(x, z, 1.5)) continue;
        // Limestone comes through thickest on the high ground and at the waterline.
        const shore = landDistance(x, z), high = groundHeight(x, z) > 20;
        if (random() > (shore < 16 ? .85 : hills || high ? .6 : .3)) continue;
        rocks.push({ x, z, s: range(.4, hills || high ? 2.6 : 1.5), rot: range(0, 6.28) });
      }
      for (let i = 0; i < SCRUB; i++) {
        const { x, z } = sample();
        if (hexOwnerAt(x, z) !== 'East Suval' || landDistance(x, z) < 1 || clear(x, z, 1.2)) continue;
        scrub.push({ x, z, s: range(.5, 1.5), rot: range(0, 6.28), flower: random() < .38 });
      }
      for (let i = 0; i < TUFTS; i++) {
        const { x, z } = sample();
        if (hexOwnerAt(x, z) !== 'East Suval' || landDistance(x, z) < 1 || clear(x, z, .8)) continue;
        tufts.push({ x, z, s: range(.6, 1.6), rot: range(0, 6.28), dry: groundHeight(x, z) > 18 });
      }
      for (let i = 0; i < TREES * 5; i++) {
        const { x, z } = sample();
        if (hexOwnerAt(x, z) !== 'East Suval' || landDistance(x, z) < 26 || clear(x, z, 4)) continue;
        // Olives and juniper live in the hollows, out of the wind, and nowhere else.
        if (groundHeight(x, z) > 18 || trees.some(t => Math.hypot(t.x - x, t.z - z) < 11)) continue;
        trees.push({ x, z, s: range(.85, 1.25), h: range(3.6, 5.4), rot: range(0, 6.28) });
        if (trees.length >= TREES) break;
      }
    }
    if (rocks.length) {
      const batch = new THREE.InstancedMesh(round, rockMaterial, rocks.length);
      rocks.forEach((rock, i) => {
        dummy.position.set(rock.x, groundHeight(rock.x, rock.z) + rock.s * .22, rock.z);
        dummy.rotation.set(range(-.22, .22), rock.rot, range(-.22, .22));
        dummy.scale.set(rock.s, rock.s * range(.4, .8), rock.s * range(.7, 1.4)); dummy.updateMatrix();
        batch.setMatrixAt(i, dummy.matrix);
        batch.setColorAt(i, color.setHSL(range(.11, .17), range(.04, .1), range(.52, .72)));
        if (rock.s > 1.6) push({ x: rock.x, z: rock.z, r: rock.s * .6, kind: 'ridge-rock' });
      });
      batch.castShadow = true; batch.receiveShadow = true; batch.computeBoundingSphere(); group.add(batch);
      metrics.rocks += rocks.length; metrics.batches++;
    }
    if (scrub.length) {
      const batch = new THREE.InstancedMesh(round, cushionMaterial, scrub.length);
      scrub.forEach((bush, i) => {
        dummy.position.set(bush.x, groundHeight(bush.x, bush.z) + bush.s * .13, bush.z);
        dummy.rotation.set(range(-.15, .15), bush.rot, range(-.15, .15));
        dummy.scale.set(bush.s * .62, bush.s * .3, bush.s * .58); dummy.updateMatrix();
        batch.setMatrixAt(i, dummy.matrix);
        // Thyme, lavender and spurge: grey-green cushions, some of them in flower.
        batch.setColorAt(i, bush.flower ? color.setHSL(range(.72, .78), range(.14, .26), range(.44, .56))
          : color.setHSL(range(.17, .24), range(.1, .2), range(.36, .5)));
      });
      batch.castShadow = true; batch.receiveShadow = true; batch.computeBoundingSphere(); group.add(batch);
      metrics.scrub += scrub.length; metrics.batches++;
    }
    if (tufts.length) {
      const batch = new THREE.InstancedMesh(grassGeometry, grassMaterial, tufts.length);
      tufts.forEach((tuft, i) => {
        dummy.position.set(tuft.x, groundHeight(tuft.x, tuft.z) + .02, tuft.z);
        dummy.rotation.set(0, tuft.rot, 0); dummy.scale.setScalar(tuft.s); dummy.updateMatrix();
        batch.setMatrixAt(i, dummy.matrix);
        batch.setColorAt(i, tuft.dry ? color.setHSL(range(.12, .17), range(.12, .22), range(.48, .6))
          : color.setHSL(range(.15, .22), range(.16, .28), range(.4, .52)));
      });
      batch.receiveShadow = true; batch.computeBoundingSphere(); group.add(batch);
      metrics.tufts += tufts.length; metrics.batches++;
    }
    if (trees.length) {
      const trunks = new THREE.InstancedMesh(trunkGeometry, barkMaterial, trees.length);
      const crowns = new THREE.InstancedMesh(round, crownMaterial, trees.length * 2);
      let crown = 0;
      trees.forEach((tree, i) => {
        const y = groundHeight(tree.x, tree.z), height = tree.h * tree.s;
        dummy.position.set(tree.x, y + height * .35, tree.z);
        dummy.rotation.set(.06, tree.rot, .05);
        dummy.scale.set(tree.s, height * .7, tree.s); dummy.updateMatrix();
        trunks.setMatrixAt(i, dummy.matrix);
        for (let c = 0; c < 2; c++) {
          dummy.position.set(tree.x + (c ? .7 : -.5) * tree.s, y + height * (.78 + c * .1), tree.z + (c ? -.4 : .5) * tree.s);
          dummy.rotation.set(.1, tree.rot + c, .08);
          dummy.scale.set(height * (.4 - c * .09), height * .24, height * (.36 - c * .08)); dummy.updateMatrix();
          crowns.setMatrixAt(crown, dummy.matrix);
          crowns.setColorAt(crown++, color.setHSL(range(.18, .24), range(.12, .2), range(.34, .44)));
        }
        push({ x: tree.x, z: tree.z, r: .45 * tree.s, kind: 'region-tree' });
      });
      crowns.count = crown;
      for (const batch of [trunks, crowns]) { batch.castShadow = true; batch.receiveShadow = true; batch.computeBoundingSphere(); group.add(batch); metrics.batches++; }
      metrics.trees += trees.length;
    }
  }

  // Runs of dry-stone field wall on the terraced ground either side of the city.
  for (let run = 0; run < EAST_SUVAL_SCATTER.wallRuns; run++) {
    const centre = run < 5
      ? { x: -120 - run * 34, z: 640 + run * 26 }
      : { x: -40 + (run - 5) * 26, z: 720 + (run - 5) * 34 };
    const yaw = range(-.5, .5), cos = Math.cos(yaw), sin = Math.sin(yaw), length = range(26, 46);
    for (let s = -length / 2; s <= length / 2; s += 1.7) {
      const x = centre.x + sin * s, z = centre.z + cos * s;
      if (hexOwnerAt(x, z) !== 'East Suval' || landDistance(x, z) < 8 || eastSuvalClear(x, z, 6)) continue;
      const y = groundHeight(x, z);
      for (let course = 0; course < 2; course++)
        box(course % 2 ? rubble : stone, x, y + .2 + course * .36, z, 1.8, .36, .7, group).rotation.y = yaw;
      if (Math.round(s) % 8 === 0) push({ x, z, hx: .9, hz: .4, kind: 'field-wall' });
    }
    metrics.fieldWalls++;
  }

  return { group, metrics };
}

export { hexOwnerAt };

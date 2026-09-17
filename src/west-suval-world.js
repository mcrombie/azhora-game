import * as THREE from 'three';
import { SOLIS, solisPoint, SOLIS_ROAD } from './region-world.js';
import {
  FORT, SOLIS_CIRCUIT, SOLIS_GATES, SOLIS_FACES, SOLIS_TOWERS, SOLIS_STAIRS, SOLIS_BUILDINGS, COURT_OF_OATHS, ORANGE_COURT,
  SOLIS_STALLS, SOLIS_FOUNTAIN, SOLIS_CART, SOLIS_STATUES, PAYMASTER_TABLE, SOLIS_HITCH, SOLIS_MILESTONE, SOLIS_STREETS, SOLIS_SQUARE,
  COALITION_CAMP, WEST_SUVAL_BORDER, WEST_SUVAL_PLACES, WEST_SUVAL_CLEARINGS,
  facePoint, wallRuns, ditchRuns, fortColliders, stairColliders, campPicketColliders, campTentColliders,
} from './west-suval.js';

/**
 * The scenery of West Suval: Solis and its walls, the Coalition's camp, and the
 * country along the road from the border. One call from `world.js`; everything
 * is placed from `src/west-suval.js`. Static meshes are merged by the world's
 * batching pass; what changes hands (the camp, the banners, the standards) is
 * kept in moving groups so `setHolder` can show and hide it.
 */
export function createWestSuvalScenery(kit) {
  const { root, material, mesh, box, post, pebble, rope, groundHeight, colliders, wornPatch, roofGeometry, cylinder, round,
    wood, woodLight, darkWood, cream, movingGroups, sign, roadDistance } = kit;
  const district = new THREE.Group(); district.name = 'West Suval scenery'; root.add(district);
  const metrics = { buildings: 0, towers: SOLIS_TOWERS.length, tents: 0, colliders: 0, props: 0 };
  let seed = 5150917;
  const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  const range = (a, b) => a + random() * (b - a);
  const P = solisPoint;
  const push = (...items) => { for (const item of items) colliders.push(item); metrics.colliders += items.length; return items; };
  const coneGeometry = new THREE.ConeGeometry(1, 1, 4, 1);
  const cone6 = new THREE.ConeGeometry(1, 1, 7);
  const discGeometry = new THREE.CylinderGeometry(1, 1, 1, 14);

  // Materials: the kingdom's sun-washed stone and red tile, the Empire's grey, the Coalition's colours.
  const stone = material('#d9cdb1'), stoneWarm = material('#cfc0a0'), stoneDark = material('#b6a785'), stonePatch = material('#c2b59a');
  const stoneWhite = material('#ebe5d4'), mortarLine = material('#a89a7c');
  const tile = material('#b0553b'), tileDark = material('#94472f'), tileRidge = material('#c8704f');
  const bronze = material('#8f6a35', { metalness: .55, roughness: .42 }), bronzeGreen = material('#6f8a70', { metalness: .35, roughness: .5 });
  const walls = ['#ece0c4', '#e6d3ad', '#dfc9a2', '#efe6d2'].map(tint => material(tint));
  const shutters = ['#4f7a8a', '#5c7f55', '#7c5a3e'].map(tint => material(tint));
  const shadow = material('#3f352b'), earth = material('#6d5a40'), earthDark = material('#4b3d2c');
  const leaf = material('#5c7a3e'), leafDark = material('#46613a'), olive = material('#8a9a6c'), orange = material('#e08a2e');
  const legion = material('#8c3f38'), legionGold = material('#c9a24a'), republic = material('#5f8fd6'), canvas = material('#d9ceb0');
  const grassWorn = material('#b3a77a'), paving = material('#cbbd9c'), pavingLight = material('#d8ccb0');

  // -------------------------------------------------------------------------
  // Ground helpers
  // -------------------------------------------------------------------------
  const gy = (x, z) => groundHeight(x, z);
  const yAt = (a, b) => { const p = P(a, b); return gy(p.x, p.z); };
  /** A box in the city frame with its base on the ground (or at `base`). */
  const block = (mat, a, b, w, h, d, parent = district, base = null, lift = 0) => {
    const p = P(a, b), y = (base ?? gy(p.x, p.z)) + lift;
    return box(mat, p.x, y + h / 2, p.z, w, h, d, parent);
  };
  /** A flat paved quad draped over the ground on a grid, a few centimetres up. */
  function pave(a0, a1, b0, b1, mat, lift = .035, cell = 3, parent = district) {
    const nx = Math.max(1, Math.ceil((a1 - a0) / cell)), nz = Math.max(1, Math.ceil((b1 - b0) / cell));
    const positions = [], indices = [];
    for (let j = 0; j <= nz; j++) for (let i = 0; i <= nx; i++) {
      const p = P(a0 + (a1 - a0) * i / nx, b0 + (b1 - b0) * j / nz);
      positions.push(p.x, gy(p.x, p.z) + lift, p.z);
    }
    for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
      const k = j * (nx + 1) + i;
      indices.push(k, k + nx + 1, k + 1, k + 1, k + nx + 1, k + nx + 2);
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setIndex(indices); geometry.computeVertexNormals();
    const surface = new THREE.Mesh(geometry, mat); surface.receiveShadow = true; parent.add(surface);
    return surface;
  }
  /** A ribbon of paving along a world polyline. */
  function paveLine(points, width, mat, lift = .05) {
    const positions = [], indices = [];
    const samples = [];
    for (let i = 1; i < points.length; i++) {
      const a = points[i - 1], b = points[i], length = Math.hypot(b.x - a.x, b.z - a.z), steps = Math.max(1, Math.ceil(length / 2));
      for (let s = i === 1 ? 0 : 1; s <= steps; s++) samples.push({ x: a.x + (b.x - a.x) * s / steps, z: a.z + (b.z - a.z) * s / steps, dx: (b.x - a.x) / length, dz: (b.z - a.z) / length });
    }
    samples.forEach((s, index) => {
      for (const side of [-1, 1]) { const x = s.x - s.dz * width / 2 * side, z = s.z + s.dx * width / 2 * side; positions.push(x, gy(x, z) + lift, z); }
      if (index) { const k = index * 2; indices.push(k - 2, k, k - 1, k - 1, k, k + 1); }
    });
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setIndex(indices); geometry.computeVertexNormals();
    const strip = new THREE.Mesh(geometry, mat); strip.receiveShadow = true; district.add(strip);
  }
  /** A group that changes hands: shown by `setHolder` when `shows(holder)` is true, with its colliders. */
  const holdings = [];
  function holding(name, shows, colliderList = []) {
    const group = new THREE.Group(); group.name = name; district.add(group); movingGroups.add(group);
    holdings.push({ group, shows, colliders: colliderList });
    return group;
  }
  const coalitionHolds = holder => holder === 'coalition', empireHolds = holder => holder === 'empire', struck = holder => holder !== 'coalition';

  // -------------------------------------------------------------------------
  // Solis: the walls
  // -------------------------------------------------------------------------
  const t = FORT.thickness / 2, half = FORT.towerSize / 2;
  const coalitionBanners = holding('Solis: the contingents’ banners', coalitionHolds);
  const legionStandards = holding('Solis: the Legate’s standards', empireHolds);
  /** A run of curtain wall in chunks that step with the ground, with a crenellated outer parapet and a low inner one. */
  function wallRun(faceId, from, to) {
    const face = SOLIS_FACES[faceId], length = to - from, chunks = Math.max(1, Math.round(length / 6)), sea = faceId === 'west';
    for (let c = 0; c < chunks; c++) {
      const a0 = from + length * c / chunks, a1 = from + length * (c + 1) / chunks, mid = (a0 + a1) / 2, span = a1 - a0 + .02;
      const centre = facePoint(faceId, mid), outer = facePoint(faceId, mid, t - .25), inner = facePoint(faceId, mid, -t + .15);
      const base = yAt(centre.a, centre.b) - .35;
      const along = face.axis === 'a';
      // The old sea wall has been patched so often that its courses no longer match.
      const body = sea && c % 3 === 1 ? stonePatch : c % 4 === 2 ? stoneWarm : stone;
      const [w, d] = along ? [span, FORT.thickness] : [FORT.thickness, span];
      block(body, centre.a, centre.b, w, FORT.wallTop + .35, d, district, base);
      // A battered plinth of big old blocks, the kingdom's first course.
      const plinth = facePoint(faceId, mid, t - .1);
      block(stoneDark, plinth.a, plinth.b, along ? span : .9, 1.25, along ? .9 : span, district, base);
      block(mortarLine, plinth.a, plinth.b, along ? span : .95, .08, along ? .95 : span, district, base, 2.6);
      // The outer parapet and its merlons.
      block(stone, outer.a, outer.b, along ? span : .5, .8, along ? .5 : span, district, base + FORT.wallTop + .35);
      for (let m = a0 + 1; m < a1 - .4; m += 2.1) {
        const merlon = facePoint(faceId, m, t - .25);
        block(stone, merlon.a, merlon.b, along ? 1.05 : .5, .7, along ? .5 : 1.05, district, base + FORT.parapetTop + .35);
      }
      // A low parapet on the town side, so the walk reads as a platform from the street.
      block(stoneWarm, inner.a, inner.b, along ? span : .3, .55, along ? .3 : span, district, base + FORT.wallTop + .35);
      // Arrow slits on the field face.
      if (c % 2 === 0) { const slit = facePoint(faceId, mid, t + .01); block(shadow, slit.a, slit.b, along ? .16 : .05, .9, along ? .05 : .16, district, base + 2.6); }
    }
  }
  for (const faceId of Object.keys(SOLIS_FACES)) for (const [from, to] of wallRuns(faceId)) wallRun(faceId, from, to);

  function tower(entry, index) {
    const base = yAt(entry.a, entry.b) - .45, top = base + FORT.towerTop + .45;
    block(index % 3 === 1 ? stoneWarm : stone, entry.a, entry.b, FORT.towerSize, FORT.towerTop + .45, FORT.towerSize, district, base);
    block(stoneDark, entry.a, entry.b, FORT.towerSize + .5, 1.4, FORT.towerSize + .5, district, base);
    block(mortarLine, entry.a, entry.b, FORT.towerSize + .06, .1, FORT.towerSize + .06, district, base + FORT.wallTop + .5);
    // Corbelled crown, merlons, then four piers carrying a tiled cap: Solis's towers are roofed.
    block(stone, entry.a, entry.b, FORT.towerSize + .5, .45, FORT.towerSize + .5, district, top - .1);
    for (const sa of [-1, 1]) for (const sb of [-1, 1]) block(stone, entry.a + sa * (half - .15), entry.b + sb * (half - .15), .8, 1.7, .8, district, top + .3);
    for (const [da, db, wa, wb] of [[0, -half, 1.4, .5], [0, half, 1.4, .5], [-half, 0, .5, 1.4], [half, 0, .5, 1.4]]) block(stone, entry.a + da, entry.b + db, wa, .75, wb, district, top + .3);
    const p = P(entry.a, entry.b);
    const cap = mesh(coneGeometry, index % 2 ? tile : tileDark, p.x, top + 2 + FORT.capRise / 2, p.z, (half + .75) * Math.SQRT2, FORT.capRise, (half + .75) * Math.SQRT2, district);
    cap.rotation.y = Math.PI / 4;
    block(tileRidge, entry.a, entry.b, .9, .4, .9, district, top + 2 + FORT.capRise - .1);
    for (const [sa, sb] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) block(shadow, entry.a + sa * (half + .01), entry.b + sb * (half + .01), sb ? .18 : .05, 1.1, sa ? .18 : .05, district, base + 5.4);
    return top;
  }
  const towerTops = new Map(SOLIS_TOWERS.map((entry, index) => [entry.id, tower(entry, index)]));

  // Wall-walk stairs against the inner face.
  for (const { face: faceId, from, to } of SOLIS_STAIRS) {
    const face = SOLIS_FACES[faceId], steps = 9;
    for (let s = 0; s < steps; s++) {
      const along = from + (to - from) * (s + .5) / steps, spot = facePoint(faceId, along, -t - .8), h = (s + 1) * (FORT.wallTop / steps);
      block(stoneWarm, spot.a, spot.b, face.axis === 'a' ? (to - from) / steps + .02 : 1.6, h, face.axis === 'a' ? 1.6 : (to - from) / steps + .02, district, yAt(spot.a, spot.b) - .2);
    }
  }
  push(...fortColliders(), ...stairColliders());

  // The ditch: a dark trench between a spoil bank under the wall and a low lip outside, stakes in its floor.
  // The ground cannot be cut, so the trench is drawn: a dark floor, the banks either side of it, and the stakes.
  for (const run of ditchRuns()) {
    const face = SOLIS_FACES[run.face], along = face.axis === 'a', length = run.to - run.from;
    const pieces = Math.max(1, Math.round(length / 6));
    for (let k = 0; k < pieces; k++) {
      const m = run.from + length * (k + .5) / pieces, span = length / pieces + .05;
      const at = off => (along ? { a: m, b: run.line + Math.sign(run.line) * off } : { a: run.line + Math.sign(run.line) * off, b: m });
      const strip = (off, width, height, mat, sink) => {
        const c = at(off); block(mat, c.a, c.b, along ? span : width, height, along ? width : span, district, yAt(c.a, c.b) - sink);
      };
      strip(0, FORT.ditchWidth, .08, earthDark, .03);                                 // the floor
      strip(-FORT.ditchWidth / 2 + .3, .6, .16, earth, .05);                           // its two banks' feet
      strip(FORT.ditchWidth / 2 - .3, .6, .16, earth, .05);
      strip(-FORT.ditchWidth / 2 - 1.5, 2.4, .5, earth, .12);                          // the spoil bank under the wall
      strip(FORT.ditchWidth / 2 + .5, 1.0, .32, earth, .1);                            // the lip outside
      for (let s2 = 0; s2 < 2; s2++) {
        const stake = at(range(-.9, .9)), shift = (s2 - .5) * span * .5, sp = P(stake.a + (along ? shift : 0), stake.b + (along ? 0 : shift));
        const spike = post(darkWood, sp.x, gy(sp.x, sp.z) + .45, sp.z, .07, 1.1, district); spike.rotation[along ? 'x' : 'z'] = (along ? -1 : 1) * Math.sign(run.line) * .45;
      }
    }
  }
  // Causeway slabs before each gate.
  for (const gate of SOLIS_GATES) {
    const face = SOLIS_FACES[gate.face], along = face.axis === 'a', c = facePoint(gate.face, gate.along, FORT.ditchOffset);
    block(stoneDark, c.a, c.b, along ? FORT.causeway : FORT.ditchWidth + 2.4, .22, along ? FORT.ditchWidth + 2.4 : FORT.causeway, district, yAt(c.a, c.b) - .12);
  }

  // -------------------------------------------------------------------------
  // The gates: the Gate of Sun Horses and the quay gate
  // -------------------------------------------------------------------------
  /** A rearing horse of bronze, its mane hammered into rays. `facing` is its world yaw. */
  function bronzeHorse(x, y, z, facing, mirror = 1) {
    const horse = new THREE.Group(); horse.position.set(x, y, z); horse.rotation.y = facing; district.add(horse);
    const part = (geometry, px, py, pz, sx, sy, sz, rx = 0, rz = 0) => { const m = mesh(geometry, bronze, px, py, pz, sx, sy, sz, horse); m.rotation.set(rx, 0, rz); return m; };
    part(round, 0, 1.55, 0, .52, .55, 1.05, -.75);               // the barrel, reared up
    part(round, 0, .95, -.55, .5, .52, .58, -.4);                 // haunches
    for (const side of [-1, 1]) {
      part(cylinder, side * .26, .45, -.62, .12, .95, .12, .12);    // hind legs, planted
      part(cylinder, side * .24, 2.05, .78, .09, .72, .09, 1.2 + side * .15 * mirror);   // forelegs, striking
      part(cylinder, side * .24, 1.74, 1.08, .08, .5, .08, -.3);
    }
    part(cylinder, 0, 2.45, .55, .22, 1.0, .26, .55);             // neck
    part(round, 0, 2.95, .88, .19, .22, .42, .9);                 // head
    part(cylinder, 0, 1.15, -1.1, .07, .9, .07, -.9);             // tail
    // The mane: a fan of rays.
    for (let r = 0; r < 7; r++) {
      const ray = mesh(cone6, bronze, 0, 2.7 - r * .12, .36 - r * .1, .05, .9 + (r % 2) * .35, .05, horse);
      ray.rotation.set(-.6 - r * .28, 0, 0);
      ray.position.y += .15; ray.position.z -= .1;
    }
    return horse;
  }
  for (const gate of SOLIS_GATES) {
    const face = SOLIS_FACES[gate.face], along = face.axis === 'a', main = gate.id === 'sun-horses';
    const centre = facePoint(gate.face, gate.along, FORT.towerOut), base = yAt(centre.a, centre.b) - .3;
    const outward = Math.atan2(gate.out.a, gate.out.b);
    // The arch and the gatehouse chamber over the passage.
    const [w, d] = along ? [FORT.gateWidth + .1, FORT.towerSize] : [FORT.towerSize, FORT.gateWidth + .1];
    block(stone, centre.a, centre.b, w, 2.2, d, district, base + 5.2);
    block(stone, centre.a, centre.b, along ? FORT.gateWidth + .1 : .5, .9, along ? .5 : FORT.gateWidth + .1, district, base + 7.4);
    const arch = facePoint(gate.face, gate.along, FORT.towerOut + half + .02);
    block(stoneDark, arch.a, arch.b, along ? FORT.gateWidth + .6 : .12, .5, along ? .12 : FORT.gateWidth + .6, district, base + 4.9);
    // Open leaves along the passage sides, studded with bronze.
    for (const side of [-1, 1]) {
      const leafSpot = facePoint(gate.face, gate.along + side * (FORT.gateWidth / 2 - .12), -.2);
      block(darkWood, leafSpot.a, leafSpot.b, along ? .2 : 2.3, 4.4, along ? 2.3 : .2, district, base + .3);
      for (let s = 0; s < 3; s++) {
        const stud = facePoint(gate.face, gate.along + side * (FORT.gateWidth / 2 - .25), -.2 - .8 + s * .8);
        block(bronze, stud.a, stud.b, .12, .12, .12, district, base + 1.4 + s * 1.1);
      }
    }
    // The sun-horse disc over the keystone.
    const disc = P(arch.a + gate.out.a * .1, arch.b + gate.out.b * .1);
    const sun = mesh(discGeometry, bronze, disc.x, base + 6.3, disc.z, .72, .1, .72, district);
    sun.rotation.set(Math.PI / 2, 0, 0); sun.rotation.y = 0; sun.rotateOnWorldAxis(new THREE.Vector3(0, 1, 0), outward);
    if (main) {
      // Two rearing bronze horses over the Gate of Sun Horses, and last summer's flowers at their feet.
      const horseBase = base + 8.3;
      for (const side of [-1, 1]) {
        const spot = facePoint(gate.face, gate.along + side * 1.2, FORT.towerOut + 1.2), p = P(spot.a, spot.b);
        block(stoneDark, spot.a, spot.b, 1.5, .5, 2.2, district, horseBase - .5);
        bronzeHorse(p.x, horseBase, p.z, outward + side * .22, side).scale.setScalar(1.35);
      }
      for (let f = 0; f < 26; f++) {
        const side = f % 2 ? 1 : -1, spot = facePoint(gate.face, gate.along + side * range(2.6, 8), range(4.3, 5.6)), p = P(spot.a, spot.b);
        pebble(material(['#c9483a', '#e0b13a', '#e7dcc0', '#b86a8a'][f % 4]), p.x, gy(p.x, p.z) + .06, p.z, .12, .06, .12, district);
      }
      // The Coalition's flag of the Republic over the gate, or the Legate's standard once the Legion holds it.
      const pole = P(centre.a, centre.b - 1.5);
      post(wood, pole.x, base + 9.9, pole.z, .08, 3.4, district);
      box(republic, pole.x + .75, base + 11, pole.z, 1.4, .9, .05, coalitionBanners);
      box(legionGold, pole.x + .75, base + 11.25, pole.z, .9, .12, .06, coalitionBanners);
      box(legion, pole.x + .6, base + 10.9, pole.z, 1.0, 1.35, .06, legionStandards);
      box(legionGold, pole.x + .6, base + 11.7, pole.z, .7, .2, .08, legionStandards);
    }
  }
  // Contingent banners hung from the field faces of the towers.
  const banners = COALITION_CAMP.contingents;
  SOLIS_TOWERS.forEach((entry, index) => {
    const out = Math.abs(entry.b) > SOLIS_CIRCUIT.halfB ? { a: 0, b: Math.sign(entry.b) } : { a: Math.sign(entry.a), b: 0 };
    const spot = P(entry.a + out.a * (half + .08), entry.b + out.b * (half + .08)), top = towerTops.get(entry.id);
    const group = banners[index % banners.length];
    const cloth = box(material(group.banner), spot.x, top - 2.2, spot.z, out.a ? .05 : 1.3, 2.6, out.a ? 1.3 : .05, coalitionBanners);
    cloth.name = `${group.name} banner`;
    box(material(group.emblem), spot.x + out.a * .03, top - 1.9, spot.z + out.b * .03, out.a ? .05 : .5, .5, out.a ? .5 : .05, coalitionBanners);
  });

  // -------------------------------------------------------------------------
  // Solis: inside the walls
  // -------------------------------------------------------------------------
  pave(-44.5, 4.5, -21, 5, paving, .04, 4);                                  // the market square
  pave(4, 21, -9, 13, pavingLight, .045, 4);                                  // the plaza before the Court of Oaths
  // Ribbons are wound like the world's roads, so they are drawn from both sides.
  const ribbon = tint => material(tint, { side: THREE.DoubleSide });
  for (const street of SOLIS_STREETS) if (street.id !== 'camp-spur') paveLine(street.points, street.width, ribbon(street.id === 'main-street' ? '#d8ccb0' : '#cbbd9c'));
  paveLine(SOLIS_STREETS.find(street => street.id === 'camp-spur').points, 2.6, ribbon('#b3a77a'), .03);

  const doorSide = { north: [0, -1], south: [0, 1], east: [1, 0], west: [-1, 0] };
  /** A house of Solis: whitewashed stone, a low red-tiled roof, shutters, and sometimes a roof garden. */
  function townHouse(entry, index) {
    const { a, b, w, d, h } = entry, base = Math.min(yAt(a - w / 2, b), yAt(a + w / 2, b)) - .3;
    const wallMat = entry.kind === 'warehouse' ? stoneWarm : walls[index % walls.length];
    block(stoneDark, a, b, w + .3, .75, d + .3, district, base);
    block(wallMat, a, b, w, h + .3, d, district, base);
    const roofTop = base + h + .3;
    if (entry.garden) {
      // A flat roof terrace with its parapet and greenery hanging over the street: the hanging gardens.
      block(stoneWarm, a, b, w + .2, .5, d + .2, district, roofTop);
      for (let g = 0; g < Math.round((w + d) * .9); g++) {
        const edge = g % 4, u = random() - .5, ga = edge < 2 ? a + u * w : a + (edge === 2 ? -1 : 1) * w / 2, gb = edge < 2 ? b + (edge === 0 ? -1 : 1) * d / 2 : b + u * d;
        const p = P(ga, gb);
        pebble(g % 3 ? leaf : leafDark, p.x, roofTop + .45 - range(0, 1.6), p.z, range(.35, .6), range(.5, 1.3), range(.35, .6), district);
      }
      const pergola = P(a, b);
      for (const sa of [-1, 1]) post(wood, pergola.x + sa * w * .3, roofTop + 1.3, pergola.z, .07, 2, district);
      box(woodLight, pergola.x, roofTop + 2.3, pergola.z, w * .7, .1, 1.6, district);
    } else {
      // roofGeometry's ridge runs along its depth (world z); a turn puts it along a.
      const ridgeAlongA = w >= d, p = P(a, b);
      const roof = mesh(roofGeometry((ridgeAlongA ? d : w) + .9, (ridgeAlongA ? w : d) + .9, Math.min(2.2, Math.min(w, d) * .28)), index % 2 ? tile : tileDark, p.x, roofTop, p.z, 1, 1, 1, district);
      if (ridgeAlongA) roof.rotation.y = Math.PI / 2;
    }
    // A door on the street side and windows with painted shutters.
    const [da, db] = doorSide[entry.door ?? (b < 0 ? 'south' : 'north')];
    const doorAt = { a: a + da * (w / 2 + .03), b: b + db * (d / 2 + .03) };
    block(darkWood, doorAt.a, doorAt.b, da ? .1 : 1.3, entry.kind === 'warehouse' ? 3.2 : 2.3, da ? 1.3 : .1, district, base + .4);
    const shutter = shutters[index % shutters.length];
    for (const [sa, sb] of [[0, -1], [0, 1], [-1, 0], [1, 0]]) {
      const count = sb ? Math.max(1, Math.floor(w / 3.4)) : Math.max(1, Math.floor(d / 3.4));
      for (let k = 0; k < count; k++) {
        const u = (k + .5) / count - .5;
        const wa = sb ? a + u * w : a + sa * (w / 2 + .03), wb = sb ? b + sb * (d / 2 + .03) : b + u * d;
        if (Math.hypot(wa - doorAt.a, wb - doorAt.b) < 1.2) continue;
        block(shadow, wa, wb, sb ? .8 : .06, 1.0, sb ? .06 : .8, district, base + h * .55);
        block(shutter, wa + (sb ? .6 : 0), wb + (sb ? 0 : .6), sb ? .35 : .08, 1.05, sb ? .08 : .35, district, base + h * .55 - .02);
      }
    }
    metrics.buildings++;
    push({ ...P(a, b), hx: w / 2 + .15, hz: d / 2 + .15, kind: 'solis-building', id: entry.id });
  }
  SOLIS_BUILDINGS.filter(entry => entry.kind !== 'temple').forEach(townHouse);

  // The Empire's layer by the gate: the tax house's boarded plaque, the barracks' defaced eagle, notices in three hands.
  {
    const tax = SOLIS_BUILDINGS.find(entry => entry.id === 'tax-house'), barracks = SOLIS_BUILDINGS.find(entry => entry.id === 'legion-barracks');
    const plaqueA = tax.a + tax.w / 2 + .06, plaqueY = yAt(tax.a, tax.b) + 3.4;
    block(material('#9b9a92'), plaqueA, tax.b - 2.2, .08, 1.0, 1.6, district, plaqueY - .5);
    for (let k = 0; k < 3; k++) block(woodLight, plaqueA + .06, tax.b - 2.2, .06, .22, 1.9, district, plaqueY - .45 + k * .33).rotation.x = (k - 1) * .06;
    const eagle = { a: barracks.a, b: barracks.b + barracks.d / 2 + .06 };
    block(material('#8f8e86'), eagle.a, eagle.b, 2.2, 1.2, .08, district, yAt(eagle.a, eagle.b) + 3.0);
    for (let k = 0; k < 5; k++) block(shadow, eagle.a - .8 + k * .4, eagle.b + .02, .06, range(.4, .9), .06, district, yAt(eagle.a, eagle.b) + 3.2).rotation.z = range(-.5, .5);
    for (let k = 0; k < 4; k++) { const wa = barracks.a - 6 + k * 4; block(woodLight, wa, eagle.b + .02, 1.0, .18, .06, district, yAt(wa, eagle.b) + 2.2).rotation.z = range(-.25, .25); }
    // The paymaster's table and strongbox, and the notice board beside the door.
    const table = P(PAYMASTER_TABLE.a, PAYMASTER_TABLE.b), tableY = gy(table.x, table.z);
    box(woodLight, table.x, tableY + .8, table.z, .9, .12, 2.2, district);
    for (const sb of [-1, 1]) post(wood, table.x, tableY + .4, table.z + sb * .9, .06, .8, district);
    box(material('#5d4a33'), table.x, tableY + 1.05, table.z - .5, .45, .38, .6, coalitionBanners);
    for (let k = 0; k < 4; k++) pebble(material('#b57a45'), table.x + range(-.2, .2), tableY + .9, table.z + .3 + range(-.3, .3), .07, .025, .07, coalitionBanners);
    push({ x: table.x, z: table.z, hx: PAYMASTER_TABLE.halfA, hz: PAYMASTER_TABLE.halfB, kind: 'paymaster-table' });
    const board = P(tax.a + tax.w / 2 + .1, tax.b + 2.3), boardY = gy(board.x, board.z);
    box(darkWood, board.x, boardY + 1.8, board.z, .1, 1.3, 1.9, district);
    ['#efe7cf', '#e2d6a8', '#d6dde2'].forEach((tint, k) => box(material(tint), board.x + .07, boardY + 1.95 - (k % 2) * .35, board.z - .55 + k * .55, .03, .55, .42, coalitionBanners));
    box(material('#e9dfc2'), board.x + .07, boardY + 1.8, board.z, .03, .9, 1.4, legionStandards);
  }

  // The market square: stalls, the fountain, a cart, all at its edges.
  SOLIS_STALLS.forEach((stall, index) => {
    const p = P(stall.a, stall.b), y = gy(p.x, p.z), north = stall.b < SOLIS_SQUARE.b;
    for (const sa of [-1, 1]) for (const sb of [-1, 1]) post(wood, p.x + sa * 1.45, y + 1.15, p.z + sb * 1.0, .07, 2.3, district);
    const awning = mesh(roofGeometry(2.5, 3.4, .55), material(['#b8543e', '#d9c28a', '#5f7f9a', '#c77a3a', '#7d8f5a', '#a8563f'][index % 6]), p.x, y + 2.3, p.z, 1, 1, 1, district);
    awning.rotation.y = Math.PI / 2;
    box(woodLight, p.x, y + .85, p.z + (north ? .75 : -.75), 3.0, .12, .7, district);
    for (let k = 0; k < 4; k++) pebble(material(['#e08a2e', '#8a9a3c', '#c9483a', '#e0c070'][(k + index) % 4]), p.x - 1.1 + k * .72, y + 1.0, p.z + (north ? .75 : -.75), .2, .14, .2, district);
    push({ x: p.x, z: p.z, hx: 1.55, hz: 1.1, kind: 'market-stall' });
  });
  {
    const f = P(SOLIS_FOUNTAIN.a, SOLIS_FOUNTAIN.b), y = gy(f.x, f.z);
    for (let k = 0; k < 8; k++) {
      const angle = k / 8 * Math.PI * 2, seg = box(stoneWhite, f.x + Math.sin(angle) * SOLIS_FOUNTAIN.r, y + .35, f.z + Math.cos(angle) * SOLIS_FOUNTAIN.r, 1.35, .7, .35, district);
      seg.rotation.y = angle;
    }
    mesh(discGeometry, material('#5e8f96', { roughness: .25 }), f.x, y + .5, f.z, SOLIS_FOUNTAIN.r - .1, .08, SOLIS_FOUNTAIN.r - .1, district);
    post(stone, f.x, y + 1.1, f.z, .28, 1.6, district);
    bronzeHorse(f.x, y + 1.85, f.z, Math.PI * .75).scale.setScalar(.38);
    push({ x: f.x, z: f.z, r: SOLIS_FOUNTAIN.r + .2, kind: 'solis-fountain' });
  }
  {
    const c = P(SOLIS_CART.a, SOLIS_CART.b), y = gy(c.x, c.z), cart = new THREE.Group();
    cart.position.set(c.x, y + .55, c.z); cart.rotation.y = SOLIS_CART.yaw; district.add(cart);
    box(woodLight, 0, 0, 0, 2.8, .18, 1.6, cart);
    for (const side of [-1, 1]) { box(wood, 0, .35, side * .78, 2.8, .55, .1, cart); const wheel = mesh(new THREE.TorusGeometry(.55, .09, 5, 12), darkWood, .4, -.05, side * .95, 1, 1, 1, cart); wheel.rotation.y = 0; }
    box(wood, 2.1, -.1, 0, 1.6, .1, .12, cart);
    for (let k = 0; k < 3; k++) pebble(material('#c9b27a'), -.8 + k * .8, .35, 0, .45, .35, .4, cart);
    push({ x: c.x, z: c.z, r: 1.7, kind: 'cart' });
  }

  // The plaza of the old kings: bronze statues before the Court of Oaths.
  for (const statue of SOLIS_STATUES) {
    const p = P(statue.a, statue.b), y = gy(p.x, p.z);
    box(stoneWhite, p.x, y + .7, p.z, 1.6, 1.4, 1.6, district);
    box(stoneDark, p.x, y + .1, p.z, 2.0, .2, 2.0, district);
    const figure = new THREE.Group(); figure.position.set(p.x, y + 1.4, p.z); figure.rotation.y = -Math.PI / 2; district.add(figure);
    mesh(cylinder, bronze, 0, .95, 0, .32, 1.9, .28, figure);
    mesh(round, bronze, 0, 2.1, 0, .2, .24, .2, figure);
    const arm = mesh(cylinder, bronze, .32, 1.7, .2, .07, .9, .07, figure); arm.rotation.set(-1.1, 0, -.3);
    mesh(discGeometry, bronze, .45, 2.1, .6, .22, .04, .22, figure).rotation.x = Math.PI / 2;
    push({ x: p.x, z: p.z, hx: .85, hz: .85, kind: 'solis-statue' });
  }

  // The Court of Oaths: an open colonnade, a hall behind it, the council table inside.
  {
    const court = COURT_OF_OATHS, base = yAt(court.front, (court.north + court.south) / 2) - .2, midB = (court.north + court.south) / 2;
    const depthA = court.back - court.front, spanB = court.south - court.north;
    pave(court.front - .5, court.back, court.north, court.south, stoneWhite, .07, 4);
    for (let s = 0; s < 3; s++) block(stoneWhite, court.front - 1 - s * .8, midB, .8, .35 - s * .11, spanB + 1, district, base);
    block(stone, court.back, midB, .8, court.h, spanB, district, base + .3);
    for (const side of [court.north, court.south]) block(stone, (court.front + court.back) / 2, side, depthA, court.h, .8, district, base + .3);
    for (const pier of [court.north, court.south]) block(stoneWarm, court.front, pier, 1.2, court.h, 1.2, district, base + .3);
    for (const cb of [...court.columns, ...court.door]) {
      if (court.door.includes(cb)) continue;
      const p = P(court.front, cb);
      post(stoneWhite, p.x, base + .3 + court.h / 2, p.z, .5, court.h, district);
      push({ x: p.x, z: p.z, r: .5, kind: 'court-column' });
    }
    // Door posts either side of the wide middle bay.
    for (const cb of court.door) { const p = P(court.front, cb); post(stoneWhite, p.x, base + .3 + court.h / 2, p.z, .42, court.h, district); push({ x: p.x, z: p.z, r: .42, kind: 'court-column' }); }
    block(stone, court.front, midB, 1.4, 1.0, spanB + 1.4, district, base + .3 + court.h);
    const roof = P((court.front + court.back) / 2, midB);
    mesh(roofGeometry(spanB + 2, depthA + 2.4, 2.6), tile, roof.x, base + 1.3 + court.h, roof.z, 1, 1, 1, district).rotation.y = Math.PI / 2;
    // The pediment's sun-horse, and the council's table and benches.
    const pediment = P(court.front - .75, midB);
    const relief = mesh(discGeometry, bronze, pediment.x, base + court.h + 2.1, pediment.z, .9, .12, .9, district); relief.rotation.z = Math.PI / 2;
    const table = P(court.table.a, court.table.b), ty = gy(table.x, table.z);
    box(darkWood, table.x, ty + .82, table.z, court.table.halfA * 2, .14, court.table.halfB * 2, district);
    for (const sa of [-1, 1]) for (const sb of [-1, 1]) post(darkWood, table.x + sa * (court.table.halfA - .3), ty + .4, table.z + sb * (court.table.halfB - .25), .07, .8, district);
    for (const sb of [-1, 1]) box(wood, table.x, ty + .45, table.z + sb * (court.table.halfB + .7), court.table.halfA * 1.8, .1, .45, district);
    for (let k = 0; k < 6; k++) box(material('#efe7cf'), table.x - 3 + k * 1.2, ty + .9, table.z + range(-.5, .5), .4, .01, .5, district);
    push({ x: table.x, z: table.z, hx: court.table.halfA, hz: court.table.halfB + .9, kind: 'council-table' });
    push({ ...P(court.back, midB), hx: .4, hz: spanB / 2, kind: 'court-wall' });
    for (const side of [court.north, court.south]) push({ ...P((court.front + court.back) / 2, side), hx: depthA / 2, hz: .4, kind: 'court-wall' });
    for (const pier of [court.north, court.south]) push({ ...P(court.front, pier), hx: .6, hz: .6, kind: 'court-pier' });
    // The Republic's banner behind the council, or the Legate's standard where it flew.
    const hang = P(court.back - .45, midB);
    box(republic, hang.x, base + 4.4, hang.z, .06, 3.4, 2.2, coalitionBanners);
    box(legionGold, hang.x - .02, base + 5.3, hang.z, .06, .5, 1.3, coalitionBanners);
    box(legion, hang.x, base + 4.4, hang.z, .06, 3.4, 1.8, legionStandards);
    box(legionGold, hang.x - .02, base + 5.6, hang.z, .06, .4, 1.1, legionStandards);
    metrics.buildings++;
  }

  // The temple of sea and sun, and its guest house (built above with the houses).
  {
    const temple = SOLIS_BUILDINGS.find(entry => entry.id === 'temple'), base = Math.min(yAt(temple.a - temple.w / 2, temple.b), yAt(temple.a + temple.w / 2, temple.b)) - .2;
    block(stoneWhite, temple.a, temple.b, temple.w + .6, 1.1, temple.d + .6, district, base);
    for (let s = 0; s < 3; s++) block(stoneWhite, temple.a, temple.b - temple.d / 2 - .45 - s * .5, temple.w - 2, 1.0 - s * .33, .5, district, base);
    block(stoneWhite, temple.a, temple.b + 1.8, temple.w - 3, temple.h, temple.d - 4, district, base + 1.1);
    for (let k = 0; k < 6; k++) { const p = P(temple.a - temple.w / 2 + 1.5 + k * (temple.w - 3) / 5, temple.b - temple.d / 2 + 1); post(stoneWhite, p.x, base + 1.1 + temple.h / 2, p.z, .42, temple.h, district); }
    const roof = P(temple.a, temple.b);
    mesh(roofGeometry(temple.w + .8, temple.d + .8, 2.4), bronzeGreen, roof.x, base + 1.1 + temple.h, roof.z, 1, 1, 1, district);
    const sunDisc = P(temple.a, temple.b - temple.d / 2 - .45);
    mesh(discGeometry, bronze, sunDisc.x, base + temple.h + 2.2, sunDisc.z, .8, .1, .8, district).rotation.x = Math.PI / 2;
    push({ ...P(temple.a, temple.b), hx: temple.w / 2 + .3, hz: temple.d / 2 + .3, kind: 'solis-temple' });
    metrics.buildings++;
  }

  // A walled court of orange trees in the upper town.
  {
    const court = ORANGE_COURT, base = yAt(court.a, court.b);
    for (const [da, db, wa, wb] of [[0, -court.halfB, court.halfA * 2, .45], [-court.halfA, 0, .45, court.halfB * 2], [court.halfA, 0, .45, court.halfB * 2]]) {
      block(stoneWarm, court.a + da, court.b + db, wa, 1.5, wb, district, base - .1);
      push({ ...P(court.a + da, court.b + db), hx: wa / 2, hz: wb / 2, kind: 'orange-court-wall' });
    }
    for (const side of [-1, 1]) {
      const w = court.halfA - (side < 0 ? -court.gap[0] : court.gap[1]), ca = court.a + side * (court.halfA - w / 2);
      block(stoneWarm, ca, court.b + court.halfB, w, 1.5, .45, district, base - .1);
      push({ ...P(ca, court.b + court.halfB), hx: w / 2, hz: .23, kind: 'orange-court-wall' });
    }
    for (const [da, db] of court.trees) {
      const p = P(court.a + da, court.b + db), y = gy(p.x, p.z);
      post(wood, p.x, y + .8, p.z, .12, 1.6, district);
      pebble(leafDark, p.x, y + 2.2, p.z, 1.15, 1.0, 1.15, district);
      for (let k = 0; k < 7; k++) pebble(orange, p.x + range(-.9, .9), y + range(1.6, 2.8), p.z + range(-.9, .9), .12, .12, .12, district);
      push({ x: p.x, z: p.z, r: .35, kind: 'orange-tree' });
    }
  }

  // -------------------------------------------------------------------------
  // Outside the walls: the hitch, the milestone, the quay and the cliffs
  // -------------------------------------------------------------------------
  {
    const hitch = P(SOLIS_HITCH.a, SOLIS_HITCH.b), y = gy(hitch.x, hitch.z);
    for (let k = -1; k <= 1; k++) post(wood, hitch.x + k * 2.8, y + .55, hitch.z, .09, 1.1, district);
    box(woodLight, hitch.x, y + 1.05, hitch.z, SOLIS_HITCH.halfA * 2, .1, .1, district);
    wornPatch(hitch.x, hitch.z + 1.4, 4, '#b0a276', .5, district);
    push({ x: hitch.x, z: hitch.z, hx: SOLIS_HITCH.halfA, hz: SOLIS_HITCH.halfB, kind: 'hitching-rail' });
    const stoneSpot = P(SOLIS_MILESTONE.a, SOLIS_MILESTONE.b), sy = gy(stoneSpot.x, stoneSpot.z);
    post(material('#bdb6a2'), stoneSpot.x, sy + .8, stoneSpot.z, .32, 1.6, district);
    box(shadow, stoneSpot.x + .3, sy + 1.2, stoneSpot.z, .04, .5, .4, district);
    box(material('#f2eee2'), stoneSpot.x + .31, sy + .7, stoneSpot.z, .02, .25, .45, district);
    push({ x: stoneSpot.x, z: stoneSpot.z, r: .4, kind: 'milestone' });
  }
  // The quay below the sea wall: a stone apron, two harbour towers and the boom between them.
  const quay = { a0: -76, a1: -60, b0: -30, b1: 12 };
  {
    const waterline = a => { const p = P(a, -8); return gy(p.x, p.z); };
    let edge = quay.a0;
    for (let a = -58; a > -100; a -= .5) if (waterline(a) < .7) { edge = a + 1.5; break; }
    quay.a0 = Math.max(-90, edge);
    pave(quay.a0, -56.5, -20, 4, stoneDark, .06, 2);
    for (const tb of [-24, 8]) {
      const p = P(quay.a0 + 2.5, tb), y = Math.max(.2, gy(p.x, p.z));
      mesh(cylinder, stone, p.x, y + 3.2, p.z, 2.6, 7.4, 2.6, district);
      mesh(cylinder, stoneDark, p.x, y + .4, p.z, 3.0, 1.6, 3.0, district);
      for (let m = 0; m < 8; m++) { const angle = m / 8 * Math.PI * 2; box(stone, p.x + Math.sin(angle) * 2.3, y + 7.3, p.z + Math.cos(angle) * 2.3, .8, .8, .5, district).rotation.y = angle; }
      push({ x: p.x, z: p.z, r: 2.7, kind: 'harbour-tower' });
    }
    const north = P(quay.a0 + 2.5, -24), south = P(quay.a0 + 2.5, 8);
    const chain = [];
    for (let k = 0; k <= 10; k++) { const u = k / 10; chain.push(new THREE.Vector3(north.x - 6 * Math.sin(u * Math.PI), .12 + (1 - Math.sin(u * Math.PI)) * 1.6, north.z + (south.z - north.z) * u)); }
    rope(chain, .09, material('#3b3a36', { metalness: .5 }), district);
    for (let k = 1; k < 10; k += 2) { const c = chain[k]; const log = mesh(cylinder, darkWood, c.x, .15, c.z, .28, 1.8, .28, district); log.rotation.x = Math.PI / 2; }
    // Two boats at the quay steps.
    for (const [tb, yaw] of [[-12, .1], [-3, -.08]]) {
      const p = P(quay.a0 - 3.2, tb), hull = new THREE.Group(); hull.position.set(p.x, .22, p.z); hull.rotation.y = yaw; district.add(hull); movingGroups.add(hull);
      box(woodLight, 0, 0, 0, 1.6, .5, 5.2, hull); box(darkWood, 0, .28, 0, 1.7, .1, 5.3, hull); post(wood, 0, 1.9, .4, .06, 3.6, hull);
    }
    // The net loft on the quay.
    const loft = P(-68, -24), ly = gy(loft.x, loft.z);
    if (ly > 1) {
      box(stoneWarm, loft.x, ly + 1.8, loft.z, 5, 3.6, 7, district);
      mesh(roofGeometry(5.8, 7.8, 1.4), tileDark, loft.x, ly + 3.6, loft.z, 1, 1, 1, district);
      for (let k = 0; k < 3; k++) rope([new THREE.Vector3(loft.x + 2.6, ly + 2.8 - k * .5, loft.z - 3), new THREE.Vector3(loft.x + 2.9, ly + 1.8 - k * .5, loft.z), new THREE.Vector3(loft.x + 2.6, ly + 2.8 - k * .5, loft.z + 3)], .03, material('#a59a78'), district);
      push({ x: loft.x, z: loft.z, hx: 2.6, hz: 3.6, kind: 'net-loft' });
      metrics.buildings++;
    }
  }
  // White cliffs above the harbour, where the city's ground drops to the sea south and west of the walls.
  for (let a = -96; a <= 70; a += 3.2) for (let b = -40; b <= 96; b += 3.2) {
    const inside = Math.abs(a) < SOLIS_CIRCUIT.halfA + 16 && Math.abs(b) < SOLIS_CIRCUIT.halfB + 16;
    if (inside || (b < 20 && a > -60) || (a > quay.a0 - 6 && b > quay.b0 - 8 && b < quay.b1 + 6)) continue;
    const p = P(a, b), h = gy(p.x, p.z);
    if (h < .8 || h > 5.5) continue;
    const seaward = [[-4, 0], [0, 4], [-3, 3]].some(([da, db]) => { const q = P(a + da, b + db); return gy(q.x, q.z) < .2; });
    if (!seaward || random() < .25) continue;
    const size = range(1.6, 2.8);
    const rock = pebble(stoneWhite, p.x + range(-.8, .8), h * .45, p.z + range(-.8, .8), size, h * .75 + range(.8, 2.2), size * range(.8, 1.2), district);
    rock.rotation.set(range(-.1, .1), range(0, 6.28), range(-.1, .1));
    metrics.props++;
  }

  // -------------------------------------------------------------------------
  // The Coalition's camp
  // -------------------------------------------------------------------------
  const picket = campPicketColliders(), tents = campTentColliders();
  const camp = holding('The Coalition camp', coalitionHolds, [...picket, ...tents]);
  const rings = holding('The struck camp: tent rings', struck);
  push(...picket, ...tents);
  {
    const { minA, maxA, minB, maxB, gate } = COALITION_CAMP;
    const line = [];
    for (let a = minA; a <= maxA; a += 5) line.push([a, minB], [a, maxB]);
    for (let b = minB + 5; b < maxB; b += 5) line.push([minA, b], [maxA, b]);
    for (const [a, b] of line) {
      if (b === minB && a > gate[0] && a < gate[1]) continue;
      const p = P(a, b), y = gy(p.x, p.z);
      post(woodLight, p.x, y + .6, p.z, .06, 1.2, camp);
      const stub = P(a, b); post(darkWood, stub.x, y + .12, stub.z, .09, .24, rings);
    }
    const corners = [[minA, minB, gate[0], minB], [gate[1], minB, maxA, minB], [maxA, minB, maxA, maxB], [maxA, maxB, minA, maxB], [minA, maxB, minA, minB]];
    for (const [a0, b0, a1, b1] of corners) {
      const from = P(a0, b0), to = P(a1, b1), mid = P((a0 + a1) / 2, (b0 + b1) / 2);
      rope([new THREE.Vector3(from.x, gy(from.x, from.z) + 1.0, from.z), new THREE.Vector3(mid.x, gy(mid.x, mid.z) + .85, mid.z), new THREE.Vector3(to.x, gy(to.x, to.z) + 1.0, to.z)], .025, cream, camp);
    }
    for (const side of [-1, 1]) {
      const p = P(side < 0 ? gate[0] : gate[1], minB), y = gy(p.x, p.z);
      post(wood, p.x, y + 1.6, p.z, .12, 3.2, camp);
    }
    wornPatch(P(100, -28).x, P(100, -28).z, 6, '#b3a77a', 1.4, district);
    pave(96, 104, -30, 28, grassWorn, .03, 4);
    for (const group of COALITION_CAMP.contingents) {
      const cloth = material(group.id === 'izoli' ? '#d9d2bc' : group.id === 'marosh' ? '#c9b48c' : group.id === 'pyros' ? '#b8a07c' : '#d4c9a8');
      for (const spot of group.tents) {
        const p = P(spot.a, spot.b), y = gy(p.x, p.z);
        mesh(roofGeometry(COALITION_CAMP.tent.w, COALITION_CAMP.tent.d, 2.3), cloth, p.x, y + .15, p.z, 1, 1, 1, camp);
        box(material(group.banner), p.x, y + 2.46, p.z, .3, .08, COALITION_CAMP.tent.d * .5, camp);
        box(shadow, p.x, y + .7, p.z - COALITION_CAMP.tent.d / 2 + .05, .8, 1.1, .05, camp);
        wornPatch(p.x, p.z, 2.4, '#a79c72', 1.15, rings);
        for (const [sa, sb] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) pebble(stoneDark, p.x + sa * 1.9, gy(p.x + sa * 1.9, p.z + sb * 2.2) + .08, p.z + sb * 2.2, .16, .12, .16, rings);
        metrics.tents++;
      }
      // The contingent's banner on its pole in the camp lane.
      const f = P(group.flag.a, group.flag.b), fy = gy(f.x, f.z);
      post(wood, f.x, fy + 2.6, f.z, .07, 5.2, camp);
      box(material(group.banner), f.x, fy + 4.4, f.z + .75, .05, 1.2, 1.4, camp);
      box(material(group.emblem), f.x + .03, fy + 4.4, f.z + .75, .05, .45, .45, camp);
      push({ x: f.x, z: f.z, r: .18, kind: 'camp-banner' });
      post(darkWood, f.x, fy + .15, f.z, .1, .3, rings);
    }
    // A cook fire and a weapon rack; the ashes stay when the camp is struck.
    const fire = P(COALITION_CAMP.fire.a, COALITION_CAMP.fire.b), fy = gy(fire.x, fire.z);
    for (let k = 0; k < 7; k++) { const angle = k / 7 * Math.PI * 2; pebble(stoneDark, fire.x + Math.sin(angle) * 1.1, fy + .12, fire.z + Math.cos(angle) * 1.1, .28, .2, .25, district); }
    pebble(material('#3a3430'), fire.x, fy + .05, fire.z, .8, .06, .8, district);
    for (let k = 0; k < 3; k++) { const log = mesh(cylinder, darkWood, fire.x, fy + .2, fire.z, .1, 1.3, .1, camp); log.rotation.set(Math.PI / 2, k * 1.05, 0); }
    const rack = P(120, 23);
    box(wood, rack.x, gy(rack.x, rack.z) + 1.0, rack.z, .12, .12, 3, camp);
    for (let k = 0; k < 6; k++) { const spear = post(woodLight, rack.x + .2, gy(rack.x, rack.z) + 1.3, rack.z - 1.2 + k * .48, .03, 2.6, camp); spear.rotation.x = .12; }
    push({ x: fire.x, z: fire.z, r: 1.4, kind: 'camp-fire' });
  }

  // -------------------------------------------------------------------------
  // The country along the road: the border, field walls, olives and thorn, three places
  // -------------------------------------------------------------------------
  if (WEST_SUVAL_BORDER) sign(WEST_SUVAL_BORDER.sign.x, WEST_SUVAL_BORDER.sign.z, 'Solis', WEST_SUVAL_BORDER.yaw, 'The border stockade');
  const signpost = P(-10, -70);
  sign(signpost.x - 4, signpost.z, 'The Gate of Sun Horses', 0, 'The border stockade');
  const campSign = P(34, -71); sign(campSign.x, campSign.z, 'The Coalition camp', 0, 'Solis');

  function oliveTree(x, z, parent = district) {
    const y = gy(x, z), lean = range(-.35, .35);
    const trunk = post(material('#6f6456'), x, y + .9, z, .22, 1.9, parent); trunk.rotation.set(lean, 0, range(-.3, .3));
    for (let k = 0; k < 3; k++) pebble(olive, x + range(-1.1, 1.1), y + range(2.1, 2.8), z + range(-1.1, 1.1), range(1.1, 1.6), range(.6, .9), range(1.1, 1.6), parent);
    push({ x, z, r: .4, kind: 'olive-tree' });
  }
  function thornTree(x, z, parent = district) {
    const y = gy(x, z);
    const trunk = post(material('#5e5143'), x, y + 1.4, z, .13, 2.8, parent); trunk.rotation.z = range(-.2, .2);
    const crown = pebble(leafDark, x, y + 3.0, z, range(2.0, 2.8), .45, range(1.8, 2.5), parent); crown.rotation.y = range(0, 6);
    push({ x, z, r: .3, kind: 'thorn-tree' });
  }
  /** A dry-stone field wall along a world line, broken where the road passes. */
  function fieldWall(x0, z0, x1, z1) {
    const length = Math.hypot(x1 - x0, z1 - z0), yaw = Math.atan2(x1 - x0, z1 - z0);
    for (let s = 0; s < length; s += 1.4) {
      const x = x0 + (x1 - x0) * s / length, z = z0 + (z1 - z0) * s / length;
      if (roadDistance(x, z) < 4 || gy(x, z) < 1.2) continue;
      const stoneBlock = box(s % 4.2 < 1.4 ? stonePatch : stone, x, gy(x, z) + .38, z, .75, .76 + range(-.12, .12), 1.5, district);
      stoneBlock.rotation.y = yaw + range(-.06, .06);
      push({ x, z, r: .55, kind: 'field-wall' });
    }
  }
  // Field walls and trees either side of the road, where the downs are farmed.
  const road = SOLIS_ROAD;
  const reserved = (x, z, margin) => WEST_SUVAL_CLEARINGS.some(spot => Math.hypot(x - spot.x, z - spot.z) < spot.r + margin);
  for (let i = 1; i < road.length - 4; i++) {
    const a = road[i - 1], b = road[i], length = Math.hypot(b.x - a.x, b.z - a.z), ux = (b.x - a.x) / length, uz = (b.z - a.z) / length;
    for (let s = 12; s < length - 12; s += 26) {
      const cx = a.x + ux * s, cz = a.z + uz * s;
      const side = (i + Math.round(s)) % 2 ? 1 : -1, off = range(9, 22), wallLength = range(14, 30);
      const ox = cx - uz * off * side, oz = cz + ux * off * side;
      if (random() < .7 && !reserved(ox, oz, wallLength / 2 + 2)) fieldWall(ox - ux * wallLength / 2, oz - uz * wallLength / 2, ox + ux * wallLength / 2, oz + uz * wallLength / 2);
      const tx = cx - uz * (off + range(5, 12)) * side, tz = cz + ux * (off + range(5, 12)) * side;
      if (roadDistance(tx, tz) > 5 && gy(tx, tz) > 1.4 && !reserved(tx, tz, 2)) (random() < .6 ? oliveTree : thornTree)(tx, tz);
    }
  }
  // An olive grove on the slope below the camp, outside its picket.
  for (let k = 0; k < 14; k++) {
    const p = P(range(70, 132), range(40, 72));
    if (gy(p.x, p.z) > 1.4) oliveTree(p.x, p.z);
  }

  // The shepherds' fold: a ring of dry stone with a gap, a turf-roofed hut, a thorn tree.
  {
    const fold = WEST_SUVAL_PLACES.fold;
    wornPatch(fold.x, fold.z, 9, '#a8a070', 1, district);
    for (let k = 0; k < 26; k++) {
      const angle = k / 26 * Math.PI * 2;
      if (angle > .3 && angle < .8) continue;                       // the gate, toward the road
      const x = fold.x + Math.sin(angle) * 7, z = fold.z + Math.cos(angle) * 7;
      box(k % 3 ? stone : stonePatch, x, gy(x, z) + .45, z, .9, .9 + range(-.15, .1), 1.8, district).rotation.y = angle + Math.PI / 2;
      push({ x, z, r: .75, kind: 'fold-wall' });
    }
    const hut = { x: fold.x - 3.2, z: fold.z - 2.2 }, hy = gy(hut.x, hut.z);
    box(stoneWarm, hut.x, hy + .9, hut.z, 3.2, 1.8, 2.6, district);
    mesh(roofGeometry(3.8, 3.2, .9), material('#6f7f45'), hut.x, hy + 1.8, hut.z, 1, 1, 1, district);
    box(shadow, hut.x + 1.62, hy + .7, hut.z, .05, 1.2, .8, district);
    push({ x: hut.x, z: hut.z, hx: 1.6, hz: 1.3, kind: 'fold-hut' });
    thornTree(fold.x + 11, fold.z - 6);
    for (let k = 0; k < 5; k++) pebble(material('#e7e1cf'), fold.x + range(-4, 4), gy(fold.x, fold.z) + .1, fold.z + range(-4, 4), .2, .06, .14, district);
  }
  // The broken watchtower of the old kingdom.
  {
    const tower = WEST_SUVAL_PLACES.watchtower, ty = gy(tower.x, tower.z);
    for (let k = 0; k < 12; k++) {
      const angle = k / 12 * Math.PI * 2, x = tower.x + Math.sin(angle) * 3.2, z = tower.z + Math.cos(angle) * 3.2;
      if (k === 3) continue;                                          // the doorway
      const height = 2.5 + ((k * 7) % 5) * .9;
      box(k % 2 ? stone : stoneWarm, x, ty + height / 2 - .2, z, 1.75, height, 1.1, district).rotation.y = angle;
      push({ x, z, r: .9, kind: 'watchtower' });
    }
    const door = { x: tower.x + Math.sin(3 / 12 * Math.PI * 2) * 3.3, z: tower.z + Math.cos(3 / 12 * Math.PI * 2) * 3.3 };
    const relief = mesh(discGeometry, stoneWhite, door.x, ty + 2.7, door.z, .45, .08, .45, district); relief.rotation.set(0, 0, Math.PI / 2);
    for (let k = 0; k < 16; k++) {
      const angle = range(0, 6.28), d = range(4, 8), x = tower.x + Math.sin(angle) * d, z = tower.z + Math.cos(angle) * d;
      pebble(k % 2 ? stone : stoneDark, x, gy(x, z) + .2, z, range(.4, .8), range(.25, .5), range(.4, .8), district);
    }
  }
  // The wayside well, its trough and olives, and the defaced imperial milestone.
  {
    const well = WEST_SUVAL_PLACES.well, wy = gy(well.x, well.z);
    for (let k = 0; k < 8; k++) { const angle = k / 8 * Math.PI * 2; box(stone, well.x + Math.sin(angle) * .95, wy + .45, well.z + Math.cos(angle) * .95, .55, .9, .5, district).rotation.y = angle; }
    for (const side of [-1, 1]) post(wood, well.x + side * 1.1, wy + 1.3, well.z, .08, 2.2, district);
    box(woodLight, well.x, wy + 2.4, well.z, 2.6, .14, .3, district);
    push({ x: well.x, z: well.z, r: 1.35, kind: 'wayside-well' });
    const trough = { x: well.x - 2.6, z: well.z + 1.4 };
    box(stoneDark, trough.x, gy(trough.x, trough.z) + .35, trough.z, 2.4, .7, .9, district);
    push({ x: trough.x, z: trough.z, hx: 1.2, hz: .45, kind: 'trough' });
    oliveTree(well.x - 5.5, well.z - 3.5); oliveTree(well.x + 4.2, well.z + 4.8);
    const mile = { x: well.x + 2.4, z: well.z - 2.2 }, my = gy(mile.x, mile.z);
    post(material('#bdb6a2'), mile.x, my + .8, mile.z, .3, 1.6, district);
    box(shadow, mile.x + .28, my + 1.2, mile.z, .04, .45, .36, district);
    box(material('#f2eee2'), mile.x + .3, my + .75, mile.z, .02, .22, .42, district);
    push({ x: mile.x, z: mile.z, r: .38, kind: 'milestone' });
  }

  // Solis uses many small tints. Rather than leave the world's batching one draw per tint, merge
  // everything here into vertex-coloured meshes: the city and camp, the country along the road,
  // and each group that changes hands. A struck camp is one draw call, not a hundred.
  const moving = new Set([...holdings.map(entry => entry.group)]);
  district.traverse(object => { if (object !== district && movingGroups.has(object)) moving.add(object); });
  const city = new THREE.Group(), country = new THREE.Group();
  city.name = 'Solis, merged'; country.name = 'West Suval country, merged';
  mergeByColour(district, moving, city, country, mesh => {
    const centre = mesh.geometry.boundingSphere.center.clone().applyMatrix4(mesh.matrixWorld);
    return Math.hypot(centre.x - SOLIS.centre.x, centre.z - SOLIS.centre.z) < 220;
  });
  for (const group of [city, country]) { district.add(group); movingGroups.add(group); }
  for (const entry of holdings) mergeByColour(entry.group, new Set(), entry.group, entry.group, () => true);

  let holder = null;
  /** Show whoever holds Solis: 'coalition', 'empire' or 'routed' (the Coalition broke and the Legion is not in yet). */
  function setHolder(next) {
    if (next === holder) return false;
    holder = next;
    for (const entry of holdings) {
      const out = entry.shows(holder);
      entry.group.visible = out;
      for (const collider of entry.colliders) {
        const index = colliders.indexOf(collider);
        if (out && index === -1) colliders.push(collider);
        if (!out && index !== -1) colliders.splice(index, 1);
      }
    }
    return true;
  }
  setHolder('coalition');
  return { metrics, setHolder, holder: () => holder, district };
}

/**
 * Merge every mesh under `source` (skipping `skip` subtrees) into vertex-coloured
 * meshes, one per kind of surface (metal, roughness, sidedness), added to
 * `near` or `far` as `isNear(mesh)` says. Positions are in `source`'s frame,
 * which in the world is the world's own.
 */
const colourMaterials = new Map();
function mergeByColour(source, skip, near, far, isNear) {
  source.updateMatrixWorld(true);
  const inverse = source.matrixWorld.clone().invert(), buckets = new Map(), meshes = [];
  const visit = object => {
    if (object !== source && skip.has(object)) return;
    if (object.isMesh && !object.isInstancedMesh && object.material && !Array.isArray(object.material)) meshes.push(object);
    for (const child of [...object.children]) visit(child);
  };
  visit(source);
  for (const object of meshes) {
    if (!object.geometry.boundingSphere) object.geometry.computeBoundingSphere();
    const mat = object.material, target = isNear(object) ? near : far;
    const key = `${target.uuid}|${mat.metalness ?? 0}|${mat.roughness ?? 1}|${mat.side}|${mat.transparent}`;
    if (!buckets.has(key)) buckets.set(key, { target, mat, objects: [] });
    buckets.get(key).objects.push(object);
  }
  const matrix = new THREE.Matrix4(), normalMatrix = new THREE.Matrix3(), position = new THREE.Vector3(), normal = new THREE.Vector3(), colour = new THREE.Color();
  for (const { target, mat, objects } of buckets.values()) {
    let vertices = 0, indexCount = 0;
    for (const object of objects) { vertices += object.geometry.attributes.position.count; indexCount += object.geometry.index?.count ?? object.geometry.attributes.position.count; }
    const positions = new Float32Array(vertices * 3), normals = new Float32Array(vertices * 3), colours = new Float32Array(vertices * 3), indices = new Uint32Array(indexCount);
    let vertexOffset = 0, indexOffset = 0;
    for (const object of objects) {
      const geometry = object.geometry, p = geometry.attributes.position, n = geometry.attributes.normal;
      object.updateMatrixWorld(true);
      matrix.multiplyMatrices(inverse, object.matrixWorld); normalMatrix.getNormalMatrix(matrix);
      colour.copy(object.material.color ?? colour.setRGB(1, 1, 1));
      for (let i = 0; i < p.count; i++) {
        position.fromBufferAttribute(p, i).applyMatrix4(matrix).toArray(positions, (vertexOffset + i) * 3);
        if (n) normal.fromBufferAttribute(n, i).applyMatrix3(normalMatrix).normalize().toArray(normals, (vertexOffset + i) * 3);
        colours[(vertexOffset + i) * 3] = colour.r; colours[(vertexOffset + i) * 3 + 1] = colour.g; colours[(vertexOffset + i) * 3 + 2] = colour.b;
      }
      if (geometry.index) for (let i = 0; i < geometry.index.count; i++) indices[indexOffset++] = vertexOffset + geometry.index.getX(i);
      else for (let i = 0; i < p.count; i++) indices[indexOffset++] = vertexOffset + i;
      vertexOffset += p.count;
      object.removeFromParent();
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colours, 3));
    geometry.setIndex(new THREE.BufferAttribute(indices, 1)); geometry.computeBoundingSphere();
    const materialKey = `${mat.metalness ?? 0}|${mat.roughness ?? 1}|${mat.side}`;
    if (!colourMaterials.has(materialKey)) colourMaterials.set(materialKey, new THREE.MeshStandardMaterial({ vertexColors: true, metalness: mat.metalness ?? 0, roughness: mat.roughness ?? 1, side: mat.side }));
    const merged = new THREE.Mesh(geometry, colourMaterials.get(materialKey)); merged.castShadow = true; merged.receiveShadow = true;
    merged.name = 'West Suval merged scenery';
    target.add(merged);
  }
}

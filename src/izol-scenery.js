import * as THREE from 'three';
import { landDistance, isLandHex, REGION_CELLS } from './region-world.js';
import { WORLD_SCALE } from './world-scale.js';
import { mergeByColour } from './west-suval-world.js';
import {
  IZOLVETH, P, IZOL_QUAY, IZOL_MOLES, IZOL_BOOM, IZOL_SHIPS, IZOL_SLIP, IZOLVETH_BUILDINGS, MEETING_HOUSE,
  IZOL_STONE, OATH_GROUND, IZOL_ROPEWALK, IZOLVETH_STREETS, IZOLVETH_WORKING, RECRUITING_STANDS,
  IZOL_CAMP, C, campPicketColliders, campTentColliders, ARDVETH, KELVATH, SEA_GATE, SIGHTSTONE, IZOL_PATHS,
  THREE_PRESENCES, LONG_PASTURE, IZOL_SIGNS, IZOL_CLEARINGS, IZOL_LANDMARKS, IZOL_STANDS,
  izolDeckHeight, generalById, IZOL_GENERALS, inIzolveth,
} from './izol-world.js';

/**
 * West Izol's scenery: Izolveth and its harbour, the Coalition's camp on the
 * pasture above it, Ardveth down the coast, the boatyard at Kelvath Cove, the
 * Sea Gate on the headland, the Sightstone on the road inland, the Three
 * Presences on the skyline, and the island's own scatter of sea turf, gorse,
 * thorn, rock and wind-bent pine.
 *
 * `world.js` hands over the same toolkit the other regions' scenery receives.
 * Izolveth is built of many small tints, so — exactly as Solis is — everything
 * static is merged into vertex-coloured meshes at the end, one per surface kind,
 * split into a near group (the town and its harbour) and a far one (the country).
 * That is what keeps the town inside the draw-call budget: the whole of Izolveth
 * is two or three calls, not two hundred.
 */
export function createIzolScenery(kit) {
  const { root, material, mesh, box, post, pebble, rope, cottage, barrel, crate, wornPatch, sign,
    groundHeight, colliders, dummy, color, wood, woodLight, darkWood, cream, roofGeometry, cylinder, round,
    movingGroups } = kit;
  const district = new THREE.Group(); district.name = 'West Izol scenery'; root.add(district);
  let seed = 1780521;
  const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  const range = (a, b) => a + random() * (b - a);
  const metrics = { buildings: 0, tents: 0, ships: 0, props: 0, colliders: 0, batches: 0,
    turf: 0, gorse: 0, thorn: 0, rock: 0, pines: 0, landmarks: 0 };
  const push = (...items) => { for (const item of items) colliders.push(item); metrics.colliders += items.length; return items; };
  const gy = (x, z) => groundHeight(x, z);

  // Izol builds out of Izol: dark granite below, lime-washed rubble above, slate
  // weighted with stones on top. Nothing here is marble.
  const granite = material('#6b6e69'), graniteDark = material('#565a57'), graniteWarm = material('#767870'), graniteWet = material('#4c514f');
  const limeWash = ['#dcd7c2', '#d3cfb9', '#cac7b2', '#e2ddc9'].map(tint => material(tint));
  const slate = material('#565c60'), slateDark = material('#474d51'), slateRidge = material('#6b7174');
  const iron = material('#43464a');
  const canvasMat = material('#cfc6a6'), sailMat = material('#e6dcbd'), netMat = material('#7a7f62');
  const pitch = material('#3b3631'), shadow = material('#32363a');
  const paving = material('#8d8d84'), pavingPale = material('#9c9c91');
  const cordage = material('#b6a67c'), fishMat = material('#c3bba2'), redCloth = material('#9c4038');

  // -------------------------------------------------------------------------
  // Ground helpers
  // -------------------------------------------------------------------------
  /** A box whose base sits on the ground (or on `base`). */
  const onGround = (mat, x, z, w, h, d, parent = district, base = null, yaw = 0) => {
    const item = box(mat, x, (base ?? gy(x, z)) + h / 2, z, w, h, d, parent);
    if (yaw) item.rotation.y = yaw;
    return item;
  };
  /** A ribbon of paving draped along a world polyline. */
  function paveLine(points, width, mat, lift = .14, parent = district) {
    const samples = [];
    for (let i = 1; i < points.length; i++) {
      const a = points[i - 1], b = points[i], length = Math.hypot(b.x - a.x, b.z - a.z), steps = Math.max(1, Math.ceil(length / 2.5));
      for (let s = i === 1 ? 0 : 1; s <= steps; s++)
        samples.push({ x: a.x + (b.x - a.x) * s / steps, z: a.z + (b.z - a.z) * s / steps, dx: (b.x - a.x) / length, dz: (b.z - a.z) / length });
    }
    const positions = [], indices = [];
    samples.forEach((s, index) => {
      for (const side of [-1, 1]) { const x = s.x - s.dz * width / 2 * side, z = s.z + s.dx * width / 2 * side; positions.push(x, gy(x, z) + lift, z); }
      if (index) { const k = index * 2; indices.push(k - 2, k, k - 1, k - 1, k, k + 1); }
    });
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setIndex(indices); geometry.computeVertexNormals();
    const strip = new THREE.Mesh(geometry, mat); strip.receiveShadow = true; parent.add(strip);
    return strip;
  }
  /** A paved rectangle in the town's frame, draped on the ground. */
  function pave(a0, a1, b0, b1, mat, lift = .14, cell = 3.5) {
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
    const surface = new THREE.Mesh(geometry, mat); surface.receiveShadow = true; district.add(surface);
    return surface;
  }

  /** A run of dry-stone wall between two world points: the island's one universal building technique. */
  function dryStone(from, to, height = 1.0, thickness = .62, mat = granite, collide = true, level = null) {
    const length = Math.hypot(to.x - from.x, to.z - from.z), steps = Math.max(1, Math.round(length / 1.1));
    const yaw = Math.atan2(to.x - from.x, to.z - from.z);
    for (let i = 0; i < steps; i++) {
      const t = (i + .5) / steps, x = from.x + (to.x - from.x) * t, z = from.z + (to.z - from.z) * t;
      // A wall on made ground is level with it; a wall on the open hill steps with the hill.
      const base = (level ?? gy(x, z)) - .12, courses = Math.max(2, Math.round(height / .3));
      for (let c = 0; c < courses; c++)
        onGround(c % 2 ? graniteDark : granite, x, z, length / steps + .1, height / courses, thickness + (c ? 0 : .12),
          district, base + c * (height / courses), yaw + range(-.02, .02));
      if (collide && i % 2 === 0) push({ x, z, r: thickness * .8, kind: 'izol-wall' });
    }
  }

  /**
   * A house of Izolveth: a granite plinth, a lime-washed body, a slate roof with
   * stones on it against the channel wind, and small deep windows. `kind` picks
   * the variations: warehouses have cart doors and no windows, the Svaleen houses
   * are tall and gabled, open sheds are a roof on posts, the loft has a hoist.
   */
  function izolBuilding(entry) {
    const p = P(entry.a, entry.b), base = gy(p.x, p.z), wall = limeWash[Math.floor(random() * limeWash.length)];
    const { w, d, h, kind } = entry;
    metrics.buildings++;
    if (kind === 'open-shed') {
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
        const px = p.x + sx * (w / 2 - .3), pz = p.z + sz * (d / 2 - .3);
        post(wood, px, base + h / 2, pz, .14, h, district);
        push({ x: px, z: pz, r: .22, kind: 'shed-post' });
      }
      mesh(roofGeometry(w + 1.1, d + 1.1, 1.3), slate, p.x, base + h, p.z, 1, 1, 1, district);
      box(slateRidge, p.x, base + h + 1.3, p.z, .2, .16, d + 1.2, district);
      return p;
    }
    if (kind === 'compound') {
      // The Selemi outpost: one small building inside its own wall, gate to the west.
      const half = 4.8;
      for (const [from, to] of [[[-half, -half], [half, -half]], [[half, -half], [half, half]], [[-half, half], [half, half]],
        [[-half, -half], [-half, -2]], [[-half, 2], [-half, half]]])
        dryStone({ x: p.x + from[0], z: p.z + from[1] }, { x: p.x + to[0], z: p.z + to[1] }, 2.1, .5, graniteDark, true, base);
      onGround(limeWash[1], p.x + 1.4, p.z, w, h, d, district, base);
      mesh(roofGeometry(w + .8, d + .8, 1.2), slateDark, p.x + 1.4, base + h, p.z, 1, 1, 1, district);
      box(material('#2f6f6b'), p.x + 1.4 - w / 2 - .06, base + h * .55, p.z, .06, 1.2, .9, district);   // the Selemi mark on the door
      push({ x: p.x + 1.4, z: p.z, hx: w / 2, hz: d / 2, kind: 'izol-building' });
      return p;
    }
    // Plinth, body, roof.
    onGround(graniteDark, p.x, p.z, w + .5, 1.25, d + .5, district, base - .18);
    onGround(wall, p.x, p.z, w, h, d, district, base + 1.05);
    const roofBase = base + 1.05 + h;
    const steep = kind === 'tall' ? 2.6 : kind === 'warehouse' ? 1.5 : 1.9;
    mesh(roofGeometry(w + .9, d + .95, steep), random() < .4 ? slateDark : slate, p.x, roofBase, p.z, 1, 1, 1, district);
    box(slateRidge, p.x, roofBase + steep, p.z, .22, .16, d + 1, district);
    // Stones on the roof. Every roof on this coast has them.
    for (let i = 0; i < 4; i++) {
      const sx = range(-w / 2, w / 2), sz = (i % 2 ? 1 : -1) * range(d * .18, d * .42);
      pebble(graniteWarm, p.x + sx, roofBase + steep * (1 - Math.abs(sz) / (d / 2 + .5)) - .05, p.z + sz, .22, .13, .2, district);
    }
    if (kind === 'warehouse') {
      box(darkWood, p.x, base + 2.6, p.z - d / 2 - .07, w * .5, 3.1, .16, district);
      for (const side of [-1, 1]) box(wood, p.x + side * w * .12, base + 2.6, p.z - d / 2 - .15, .1, 3.0, .07, district);
      box(darkWood, p.x, base + 1.05 + h + .2, p.z - d / 2 - .8, .22, .22, 1.8, district);           // the hoist beam
    } else if (kind === 'loft') {
      box(darkWood, p.x, base + 1.4, p.z - d / 2 - .07, 1.2, 2.1, .14, district);
      box(darkWood, p.x, base + 1.05 + h + .1, p.z - d / 2 - 1.1, .2, .2, 2.4, district);
      for (const side of [-1, 1]) for (let i = 0; i < 3; i++)
        box(shadow, p.x + side * (w * .18 + i * .9), base + 4.4, p.z - d / 2 - .04, .7, 1.1, .06, district);
      box(redCloth, p.x + 1.1, base + 2.3, p.z - d / 2 - .12, .5, 1.5, .05, district);               // the hospital's cloth at the door
    } else {
      box(darkWood, p.x, base + 1.95, p.z - d / 2 - .07, .95, 1.9, .14, district);
      for (const side of [-1, 1]) {
        box(shadow, p.x + side * w * .27, base + 2.9, p.z - d / 2 - .04, .55, .75, .06, district);
        box(graniteWarm, p.x + side * w * .27, base + 2.48, p.z - d / 2 - .06, .72, .12, .1, district);
        // Small deep windows on the gable walls: this coast does not glaze anything it does not have to.
        for (const along of [-d * .22, d * .22]) {
          box(shadow, p.x + side * (w / 2 + .04), base + 2.9, p.z + along, .06, .7, .5, district);
          box(graniteWarm, p.x + side * (w / 2 + .06), base + 2.52, p.z + along, .1, .12, .66, district);
        }
      }
    }
    push({ x: p.x, z: p.z, hx: w / 2 + .2, hz: d / 2 + .2, kind: 'izol-building' });
    return p;
  }

  // -------------------------------------------------------------------------
  // The harbour: the quay, the moles, the boom and the ships
  // -------------------------------------------------------------------------
  const Q = IZOL_QUAY;
  {
    const midX = (Q.minX + Q.maxX) / 2, midZ = (Q.minZ + Q.maxZ) / 2, w = Q.maxX - Q.minX, d = Q.maxZ - Q.minZ;
    box(granite, midX, Q.deckY - 3.6, midZ, w, 7.2, d, district);
    for (const height of [-1.0, -.1, .8, 1.7]) box(graniteWet, midX, height, midZ, w - .25, .14, d + .14, district);
    box(pavingPale, midX, Q.deckY - .11, midZ, w, .22, d, district);
    // A kerb of set stones along the seaward face, low enough to step over.
    for (let x = Q.minX + .7; x <= Q.maxX - .7; x += 1.4) box(granite, x, Q.deckY + .1, Q.minZ + .35, 1.2, .2, .55, district);
    for (const bollard of Q.bollards) {
      post(graniteDark, bollard.x, Q.deckY + .32, bollard.z, .24, .64, district);
      pebble(graniteDark, bollard.x, Q.deckY + .66, bollard.z, .3, .17, .3, district);
      push({ x: bollard.x, z: bollard.z, r: .32, kind: 'bollard' });
    }
    // The capstan.
    post(wood, Q.capstan.x, Q.deckY + .44, Q.capstan.z, .44, .88, district);
    post(darkWood, Q.capstan.x, Q.deckY + .94, Q.capstan.z, .52, .14, district);
    for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2; const bar = box(woodLight, Q.capstan.x + Math.sin(a) * .62, Q.deckY + .78, Q.capstan.z + Math.cos(a) * .62, .1, .1, 1.35, district); bar.rotation.y = a; }
    push({ x: Q.capstan.x, z: Q.capstan.z, r: .72, kind: 'capstan' });
    // The gallows crane: two legs, a head beam, a sheave and a sling of casks under it.
    const cr = Q.crane;
    for (const side of [-1, 1]) { const leg = post(darkWood, cr.x + side * 1.6, Q.deckY + 2.6, cr.z, .17, 5.2, district); leg.rotation.z = -side * .06; }
    box(darkWood, cr.x, Q.deckY + 5.2, cr.z, 4.2, .3, .34, district);
    box(darkWood, cr.x + 1.5, Q.deckY + 4.4, cr.z, .28, 1.9, .28, district).rotation.z = .7;
    post(iron, cr.x - 1.4, Q.deckY + 5.05, cr.z, .26, .16, district).rotation.x = Math.PI / 2;
    rope([new THREE.Vector3(cr.x - 1.4, Q.deckY + 5.0, cr.z), new THREE.Vector3(cr.x - 1.4, Q.deckY + 1.5, cr.z)], .04, cordage, district);
    barrel(cr.x - 1.4, cr.z, 1, district, Q.deckY + .5);
    barrel(cr.x - 2.2, cr.z + .6, 1, district, Q.deckY);
    push({ x: cr.x, z: cr.z, hx: 2.1, hz: .5, kind: 'crane' });
    // Steps down the quay's west face to the water.
    for (let i = 0; i < 6; i++) box(granite, Q.steps.x, Q.deckY - .28 - i * .45, Q.steps.z + i * .32, 1.5, .2, .55, district);
  }

  /** A mole: battered granite from the sea floor to its deck, a parapet seaward, a light at the head. */
  function buildMole(entry, outward) {
    const points = entry.points;
    for (let i = 1; i < points.length; i++) {
      const a = points[i - 1], b = points[i], length = Math.hypot(b.x - a.x, b.z - a.z);
      const steps = Math.max(1, Math.round(length / 3.2)), yaw = Math.atan2(b.x - a.x, b.z - a.z);
      for (let s = 0; s < steps; s++) {
        const t = (s + .5) / steps, x = a.x + (b.x - a.x) * t, z = a.z + (b.z - a.z) * t;
        const floor = Math.min(gy(x, z), entry.deckY - 1.6);
        const body = box(s % 3 === 1 ? graniteWarm : granite, x, (floor + entry.deckY) / 2, z, length / steps + .5, entry.deckY - floor, entry.half * 2 + .7, district);
        body.rotation.y = yaw;
        const deck = box(pavingPale, x, entry.deckY - .1, z, length / steps + .5, .22, entry.half * 2, district);
        deck.rotation.y = yaw;
        // The parapet stands on the seaward side only: the harbour face is where the boats lie.
        const nx = Math.cos(yaw) * outward, nz = -Math.sin(yaw) * outward;
        const parapet = box(graniteDark, x + nx * (entry.half - .2), entry.deckY + .55, z + nz * (entry.half - .2), length / steps + .5, 1.1, .55, district);
        parapet.rotation.y = yaw;
        push({ x: x + nx * (entry.half + .1), z: z + nz * (entry.half + .1), r: .7, kind: 'mole-parapet' });
        if (s % 3 === 0) {
          const bollardX = x - nx * (entry.half - .6), bollardZ = z - nz * (entry.half - .6);
          post(graniteDark, bollardX, entry.deckY + .3, bollardZ, .22, .6, district);
        }
      }
    }
    // A light on a stone stump at the head, and the boom's windlass beside it.
    const head = points.at(-1);
    for (let course = 0; course < 9; course++)
      for (let i = 0; i < 9; i++) {
        const a = i / 9 * Math.PI * 2 + course * .3, r = 1.7 - course * .07;
        box(course % 2 ? granite : graniteWarm, head.x + Math.sin(a) * r, entry.deckY + .35 + course * .55, head.z + Math.cos(a) * r, .78, .55, .52, district).rotation.y = a;
      }
    // The basket: a ring of iron bars on a stem, and last night's wood still in it.
    post(iron, head.x, entry.deckY + 5.6, head.z, .2, .9, district);
    post(iron, head.x, entry.deckY + 6.15, head.z, .78, .12, district);
    for (let i = 0; i < 9; i++) {
      const a = i / 9 * Math.PI * 2;
      const bar = post(iron, head.x + Math.sin(a) * .74, entry.deckY + 6.5, head.z + Math.cos(a) * .74, .05, .8, district);
      bar.rotation.set(Math.cos(a) * .12, 0, -Math.sin(a) * .12);
    }
    for (let i = 0; i < 4; i++) pebble(material('#6f6048'), head.x + range(-.35, .35), entry.deckY + 6.35, head.z + range(-.35, .35), .22, .16, .28, district);
    push({ x: head.x, z: head.z, r: 1.9, kind: 'mole-light' });
    post(wood, head.x - 2.4, entry.deckY + .5, head.z, .38, 1.0, district);
    metrics.landmarks++;
  }
  buildMole(IZOL_MOLES[0], -1);
  buildMole(IZOL_MOLES[1], 1);

  // The boom: a chain across the mouth, slung between the two heads and floated on casks.
  {
    const a = IZOL_BOOM.a, b = IZOL_BOOM.b, span = Math.hypot(b.x - a.x, b.z - a.z);
    const curve = [];
    for (let i = 0; i <= 8; i++) {
      const t = i / 8, dip = Math.sin(t * Math.PI) * 1.1;
      curve.push(new THREE.Vector3(a.x + (b.x - a.x) * t, 2.6 - dip, a.z + (b.z - a.z) * t));
    }
    rope(curve, .12, iron, district);
    for (let i = 1; i < 6; i++) {
      const t = i / 6, x = a.x + (b.x - a.x) * t, z = a.z + (b.z - a.z) * t;
      barrel(x, z, 1.3, district, .1);
    }
    metrics.props++;
    metrics.boomSpan = span;
  }

  /** One ship: a hull of two rings, a deck, a mast with a furled yard, and a banner at the head. */
  function buildShip(entry) {
    const group = new THREE.Group();
    group.position.set(entry.x, .18, entry.z); group.rotation.y = entry.yaw; district.add(group);
    const L = entry.length / 2, B = entry.beam / 2;
    const outline = [[0, -L], [B * .85, -L * .68], [B, 0], [B * .72, L * .62], [0, L * .95],
      [-B * .72, L * .62], [-B, 0], [-B * .85, -L * .68]];
    // Three rings: the sheer well above the water, the turn of the bilge at it, and the garboard below.
    const positions = [], indices = [];
    for (const [bx, bz] of outline) positions.push(bx, 1.75, bz, bx * .96, .1, bz * .99, bx * .42, -1.5, bz * .86);
    for (let i = 0; i < outline.length; i++) {
      const p = i * 3, q = ((i + 1) % outline.length) * 3;
      indices.push(p, q, p + 1, q, q + 1, p + 1, p + 1, q + 1, p + 2, q + 1, q + 2, p + 2);
    }
    const hull = new THREE.BufferGeometry();
    hull.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3)); hull.setIndex(indices); hull.computeVertexNormals();
    mesh(hull, material('#4a5750', { side: THREE.DoubleSide }), 0, 0, 0, 1, 1, 1, group);
    // A wale along the sheer, the deck inside the bulwarks, and a raised stern.
    for (let i = 0; i < outline.length; i++) {
      const [ax, az] = outline[i], [bx2, bz2] = outline[(i + 1) % outline.length];
      const mx = (ax + bx2) / 2, mz = (az + bz2) / 2, len = Math.hypot(bx2 - ax, bz2 - az);
      const wale = box(darkWood, mx, 1.45, mz, .18, .34, len + .1, group);
      wale.rotation.y = Math.atan2(bx2 - ax, bz2 - az);
    }
    box(woodLight, 0, 1.12, 0, B * 1.55, .18, L * 1.55, group);
    box(darkWood, 0, 1.55, L * .58, B * 1.35, .7, L * .34, group);
    for (const bz of [-L * .5, 0, L * .45]) box(woodLight, 0, 1.5, bz, B * 1.75, .15, .28, group);
    post(wood, 0, 5.6, -L * .12, .17, 9.2, group);
    const yard = box(wood, 0, 7.9, -L * .12, 7.4, .17, .17, group); yard.rotation.z = .03;
    mesh(cylinder, sailMat, 0, 7.62, -L * .12, .3, 7, .3, group).rotation.z = Math.PI / 2;
    const banner = generalById(entry.banner) ?? IZOL_CAMP.contingents.find(g => g.id === entry.banner);
    box(material(banner?.banner ?? '#8b8f86'), .06, 9.4, -L * .12, .05, 1.2, .85, group);
    for (const side of [-1, 1]) rope([new THREE.Vector3(side * .1, 10.1, -L * .12),
      new THREE.Vector3(side * B * .9, 2.1, L * (side > 0 ? .5 : -.5))], .035, cordage, group);
    // Warps to the quay: only the hulls lying alongside get them.
    if (entry.z > 1700 && entry.z < 1712) {
      for (const along of [-L * .6, L * .6]) rope([
        new THREE.Vector3(entry.x + along, 1.1, entry.z), new THREE.Vector3(entry.x + along * .8, 1.9, entry.z + 2.6),
        new THREE.Vector3(entry.x + along * .7, Q.deckY + .5, Q.minZ + .4)], .05, cordage, district);
    }
    // A hull alongside the quay is a box; one lying at anchor across the basin is a circle,
    // because a box would be square to the world and the hull is not.
    push(entry.yaw ? { x: entry.x, z: entry.z, r: L, kind: 'ship' }
      : { x: entry.x, z: entry.z, hx: L, hz: entry.beam / 2, kind: 'ship' });
    metrics.ships++;
  }
  for (const entry of IZOL_SHIPS) buildShip(entry);

  // The slip on the west horn, and the boats drawn out on it.
  {
    const s = IZOL_SLIP, base = gy(s.x, s.z);
    wornPatch(s.x, s.z, 5.5, '#9b9585', 1, district);
    for (let i = 0; i < 8; i++) box(darkWood, s.x - 3.5 + i * 1.1, base - .05 + i * .05, s.z, .34, .16, 4.4, district);
    for (const [hx, hz] of [[-4.5, 3.2], [-1.5, 4.4], [2.2, 3.6]]) {
      const px = s.x + hx, pz = s.z + hz, y = gy(px, pz), yaw = range(0, 3.14);
      const boat = new THREE.Group(); boat.position.set(px, y + .42, pz); boat.rotation.set(Math.PI, yaw, .05); district.add(boat);
      const shape = [[0, -2.7], [.95, -1.8], [1.1, .7], [.7, 2.1], [0, 2.6], [-.7, 2.1], [-1.1, .7], [-.95, -1.8]];
      const bp = [], bi = [];
      for (const [bx, bz] of shape) bp.push(bx, .6, bz, bx * .55, -.32, bz * .8);
      for (let i = 0; i < shape.length; i++) { const p = i * 2, q = ((i + 1) % shape.length) * 2; bi.push(p, q, p + 1, q, q + 1, p + 1); }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(bp, 3)); g.setIndex(bi); g.computeVertexNormals();
      mesh(g, material('#55655d', { side: THREE.DoubleSide }), 0, 0, 0, 1, 1, 1, boat);
      push({ x: px, z: pz, r: 1.5, kind: 'upturned-boat' });
    }
  }

  // -------------------------------------------------------------------------
  // The town
  // -------------------------------------------------------------------------
  pave(-33, 33, -51, -36, paving);
  pave(-33, 33, -36, -29.5, pavingPale, .13, 4);
  for (const street of IZOLVETH_STREETS) paveLine(street.points.map(([a, b]) => P(a, b)), street.width, street.id === 'stair-street' ? pavingPale : paving);
  // The stair street is a stair: the town climbs ten metres from the quay to the hall.
  for (let b = -36; b < 40; b += 3.4) {
    const p = P(1 + (b + 39) * .09, b);
    box(pavingPale, p.x, gy(p.x, p.z) + .12, p.z, 5, .24, 1.1, district);
  }
  wornPatch(P(OATH_GROUND.a, OATH_GROUND.b).x, P(OATH_GROUND.a, OATH_GROUND.b).z, 15, '#8f8b76', 1.05, district);
  for (const entry of IZOLVETH_BUILDINGS) izolBuilding(entry);

  /**
   * The revetment round the terrace: its top is the town's own ground and it falls
   * to whatever the island left outside. Izolveth stands in a cutting, and the
   * Izoli dress the face they cut, because quarrying here is a thing you answer for.
   */
  function revetment(from, to, outX, outZ) {
    const length = Math.hypot(to.x - from.x, to.z - from.z), steps = Math.max(1, Math.round(length / 2.4));
    const yaw = Math.atan2(to.x - from.x, to.z - from.z);
    for (let i = 0; i < steps; i++) {
      const t = (i + .5) / steps, x = from.x + (to.x - from.x) * t, z = from.z + (to.z - from.z) * t;
      const inside = gy(x - outX * 2.5, z - outZ * 2.5), outside = gy(x + outX * 5, z + outZ * 5);
      // A revetment holds made ground up. Where the island stands higher than the town,
      // the cut face is the wall and nothing is built: that is what a quarried terrace looks like.
      if (inside - outside < .7) continue;
      const top = inside + .45, low = outside - .7;
      const height = Math.min(9.5, top - low), courses = Math.max(2, Math.round(height / .5));
      for (let c = 0; c < courses; c++)
        box(c % 2 ? graniteDark : granite, x, low + height * (c + .5) / courses, z,
          length / steps + .25, height / courses, 1.1 + (c === 0 ? .35 : 0), district).rotation.y = yaw;
      if (i % 2 === 0) push({ x, z, r: .8, kind: 'izol-revetment' });
    }
  }
  {
    const A = IZOLVETH.halfA, B = IZOLVETH.halfB;
    for (const side of [-1, 1]) for (let b = -28; b < B - 1; b += 8)
      revetment(P(side * (A + 1.4), b), P(side * (A + 1.4), Math.min(b + 8, B - 1)), side, 0);
    for (let a = -A + 1; a < A - 1; a += 8) revetment(P(a, B + 1.4), P(Math.min(a + 8, A - 1), B + 1.4), 0, 1);
  }

  // The meeting house: a long low hall, a porch of undressed posts, and a notice board.
  {
    const M = MEETING_HOUSE, p = P(M.a, M.b), base = gy(p.x, p.z);
    onGround(graniteDark, p.x, p.z, M.w + .6, 1.0, M.d + .6, district, base - .16);
    onGround(limeWash[3], p.x, p.z, M.w, M.h, M.d, district, base + .84);
    const roofBase = base + .84 + M.h;
    mesh(roofGeometry(M.w + 1.4, M.d + 1.6, 1.7), slate, p.x, roofBase, p.z, 1, 1, 1, district);
    box(slateRidge, p.x, roofBase + 1.7, p.z, .24, .18, M.d + 1.6, district);
    for (let i = 0; i < 8; i++) pebble(graniteWarm, p.x + range(-M.w / 2, M.w / 2), roofBase + range(.3, 1.2), p.z + (i % 2 ? 1 : -1) * range(1.4, 3.6), .24, .14, .22, district);
    // The porch: five undressed posts and a low lintel, facing the harbour.
    for (const a of M.posts) {
      const q = P(a, M.b - M.d / 2 - 1.9);
      post(wood, q.x, gy(q.x, q.z) + 1.6, q.z, .19, 3.2, district);
      push({ x: q.x, z: q.z, r: .26, kind: 'porch-post' });
    }
    const lintel = P((M.posts[0] + M.posts.at(-1)) / 2, M.b - M.d / 2 - 1.9);
    box(darkWood, lintel.x, gy(lintel.x, lintel.z) + 3.25, lintel.z, M.posts.at(-1) - M.posts[0] + 1.4, .3, .32, district);
    const door = P(M.door.a, M.door.b);
    box(darkWood, door.x, gy(door.x, door.z) + 1.25, door.z, 1.6, 2.5, .16, district);
    // The notice board by the door, in three hands.
    const boardAt = P(M.door.a + 4.4, M.door.b + .2);
    for (const side of [-1, 1]) post(wood, boardAt.x + side * .9, gy(boardAt.x, boardAt.z) + .95, boardAt.z, .08, 1.9, district);
    box(woodLight, boardAt.x, gy(boardAt.x, boardAt.z) + 1.55, boardAt.z, 2.1, 1.1, .1, district);
    for (let i = 0; i < 4; i++) box(cream, boardAt.x - .7 + (i % 2) * 1.0, gy(boardAt.x, boardAt.z) + 1.75 - Math.floor(i / 2) * .5, boardAt.z - .06, .55, .38, .02, district);
    push({ x: p.x, z: p.z, hx: M.w / 2 + .3, hz: M.d / 2 + .3, kind: 'meeting-house' });
    for (const [a, b] of M.benches) { const q = P(a, b); onGround(woodLight, q.x, q.z, 2.6, .42, .5, district); push({ x: q.x, z: q.z, hx: 1.3, hz: .3, kind: 'bench' }); }
    metrics.landmarks++;
  }

  // The Stone of Izol: a ring of dry stone with one gap, and the island's own rock inside it.
  {
    const S = IZOL_STONE, c = P(S.a, S.b);
    const gapFrom = -S.gap / 2, gapTo = S.gap / 2;
    for (let i = 0; i < 26; i++) {
      const a0 = i / 26 * Math.PI * 2 - Math.PI, a1 = (i + 1) / 26 * Math.PI * 2 - Math.PI;
      if (a0 > gapFrom - .2 && a1 < gapTo + .2) continue;
      dryStone({ x: c.x + Math.sin(a0) * S.ringRadius, z: c.z + Math.cos(a0) * S.ringRadius },
        { x: c.x + Math.sin(a1) * S.ringRadius, z: c.z + Math.cos(a1) * S.ringRadius }, .85, .5, granite, i % 3 === 0, gy(c.x, c.z));
    }
    const base = gy(c.x, c.z);
    const rock = box(graniteWet, c.x, base + S.height / 2, c.z, S.width, S.height, S.depth, district);
    rock.rotation.set(.04, .6, .05);
    pebble(graniteWet, c.x + .3, base + S.height * .82, c.z - .2, .7, .5, .55, district);
    push({ x: c.x, z: c.z, r: 1.1, kind: 'izol-stone' });
    // Nothing is offered here but things left. A few of them, on the ground, no altar.
    for (let i = 0; i < 7; i++) {
      const a = i * .9, r = range(1.6, 2.6), px = c.x + Math.sin(a) * r, pz = c.z + Math.cos(a) * r;
      pebble(material(i % 3 ? '#cfc7ae' : '#93a08b'), px, gy(px, pz) + .08, pz, .16, .1, .13, district);
    }
    wornPatch(c.x, c.z, 7.5, '#8d8a77', 1, district);
    metrics.landmarks++;
  }

  // The ropewalk: the longest roof on the island, open on both sides.
  {
    const R = IZOL_ROPEWALK;
    for (let a = R.fromA; a <= R.toA + .01; a += R.postStep) for (const side of [-1, 1]) {
      const p = P(a, R.b + side * R.halfWidth);
      post(wood, p.x, gy(p.x, p.z) + R.h / 2, p.z, .13, R.h, district);
      push({ x: p.x, z: p.z, r: .2, kind: 'ropewalk-post' });
    }
    const mid = P((R.fromA + R.toA) / 2, R.b), length = R.toA - R.fromA + 1.4;
    box(darkWood, mid.x, gy(mid.x, mid.z) + R.h + .12, mid.z, length, .2, R.halfWidth * 2 + 1, district);
    mesh(roofGeometry(length, R.halfWidth * 2 + 1.4, .7), slateDark, mid.x, gy(mid.x, mid.z) + R.h + .2, mid.z, 1, 1, 1, district);
    wornPatch(mid.x, mid.z, 26, '#8b8672', .2, district);
    // Cable on the walk, and coils at its ends.
    for (let a = R.fromA + 2; a < R.toA - 1; a += 5) {
      const p = P(a, R.b);
      rope([new THREE.Vector3(p.x - 2.4, gy(p.x, p.z) + .85, p.z), new THREE.Vector3(p.x + 2.4, gy(p.x, p.z) + .85, p.z)], .06, cordage, district);
    }
    for (const a of [R.fromA - 1, R.toA + 1]) for (let i = 0; i < 3; i++) {
      const p = P(a, R.b + (i - 1) * 1.4);
      mesh(cylinder, cordage, p.x, gy(p.x, p.z) + .2, p.z, .55, .4, .55, district);
    }
    metrics.props += 3;
  }

  // The working ground of the strand.
  {
    const W = IZOLVETH_WORKING;
    for (const frame of W.netFrames) {
      const base = gy(frame.x, frame.z);
      for (const side of [-1, 1]) post(wood, frame.x + side * 2.2, base + 1.1, frame.z, .1, 2.2, district);
      box(wood, frame.x, base + 2.15, frame.z, 4.6, .09, .09, district);
      for (let i = 0; i < 5; i++) box(netMat, frame.x - 1.7 + i * .85, base + 1.35, frame.z + .05, .6, 1.5, .06, district);
      push({ x: frame.x, z: frame.z, hx: 2.4, hz: .3, kind: 'net-frame' });
    }
    for (const t of W.trestles) {
      const base = gy(t.x, t.z);
      box(woodLight, t.x, base + .84, t.z, 1.2, .12, 2.6, district);
      for (const dx of [-.45, .45]) for (const dz of [-1.1, 1.1]) box(wood, t.x + dx, base + .42, t.z + dz, .1, .84, .1, district);
      for (let i = 0; i < 6; i++) box(fishMat, t.x - .35 + (i % 2) * .7, base + .93, t.z - 1 + Math.floor(i / 2) * .9, .2, .07, .5, district);
      push({ x: t.x, z: t.z, hx: .7, hz: 1.4, kind: 'fish-trestle' });
    }
    for (const c of W.casks) { barrel(c.x, c.z, 1, district); push({ x: c.x, z: c.z, r: .45, kind: 'cask' }); }
    for (const c of W.crates) { crate(c.x, c.z, .85, null, district); push({ x: c.x, z: c.z, r: .55, kind: 'crate' }); }
    const tp = W.tarPot, tb = gy(tp.x, tp.z);
    mesh(cylinder, iron, tp.x, tb + .34, tp.z, .42, .68, .42, district);
    box(pitch, tp.x, tb + .66, tp.z, .68, .06, .68, district);
    // The cistern: the town's water, with a granite kerb and a bucket.
    const ci = W.cistern, cb = gy(ci.x, ci.z);
    for (let i = 0; i < 12; i++) {
      const a = i / 12 * Math.PI * 2;
      box(granite, ci.x + Math.sin(a) * 1.5, cb + .35, ci.z + Math.cos(a) * 1.5, .9, .7, .5, district).rotation.y = a;
    }
    box(material('#3d4a4c'), ci.x, cb + .45, ci.z, 2.3, .05, 2.3, district);
    push({ x: ci.x, z: ci.z, r: 1.8, kind: 'cistern' });
    // The army's tally table outside the commissary.
    const ta = W.tally, tby = gy(ta.x, ta.z);
    box(woodLight, ta.x, tby + .86, ta.z, 2.2, .12, 1.0, district);
    for (const dx of [-.9, .9]) for (const dz of [-.4, .4]) box(wood, ta.x + dx, tby + .43, ta.z + dz, .1, .86, .1, district);
    box(cream, ta.x - .4, tby + .94, ta.z, .6, .03, .45, district);
    push({ x: ta.x, z: ta.z, hx: 1.2, hz: .6, kind: 'tally-table' });
    metrics.props += 8;
  }

  // The three generals' recruiting boards, thirty paces apart on the same strand.
  for (const entry of RECRUITING_STANDS) {
    const g = generalById(entry.general), base = gy(entry.x, entry.z);
    for (const side of [-1, 1]) post(wood, entry.x + side * .95, base + 1.0, entry.z, .09, 2.0, district);
    box(woodLight, entry.x, base + 1.7, entry.z, 2.2, .95, .1, district);
    box(cream, entry.x, base + 1.7, entry.z - .06, 1.7, .6, .02, district);
    post(wood, entry.x + 1.4, base + 1.9, entry.z, .07, 3.8, district);
    box(material(g.banner), entry.x + 1.4, base + 3.4, entry.z - .5, .05, .8, 1.0, district).name = `${g.name} pennon`;
    push({ x: entry.x, z: entry.z, hx: 1.1, hz: .3, kind: 'recruiting-board' });
    metrics.props++;
  }

  // -------------------------------------------------------------------------
  // The Coalition's camp, on the pasture above the town
  // -------------------------------------------------------------------------
  {
    const camp = IZOL_CAMP;
    wornPatch(C(camp.drill.a, camp.drill.b).x, C(camp.drill.a, camp.drill.b).z, 20, '#8f8a72', .95, district);
    // The picket line: a low rail on stakes, open at the west gate.
    const railRuns = [
      [[camp.minA, camp.minB], [camp.maxA, camp.minB]], [[camp.minA, camp.maxB], [camp.maxA, camp.maxB]],
      [[camp.maxA, camp.minB], [camp.maxA, camp.maxB]],
      [[camp.minA, camp.minB], [camp.minA, camp.gate[0]]], [[camp.minA, camp.gate[1]], [camp.minA, camp.maxB]],
    ];
    for (const [from, to] of railRuns) {
      const a = C(from[0], from[1]), b = C(to[0], to[1]);
      const length = Math.hypot(b.x - a.x, b.z - a.z), steps = Math.max(1, Math.round(length / 3));
      for (let i = 0; i <= steps; i++) {
        const t = i / steps, x = a.x + (b.x - a.x) * t, z = a.z + (b.z - a.z) * t;
        post(wood, x, gy(x, z) + .6, z, .08, 1.2, district);
      }
      const mid = { x: (a.x + b.x) / 2, z: (a.z + b.z) / 2 };
      box(woodLight, mid.x, gy(mid.x, mid.z) + 1.0, mid.z, Math.abs(b.x - a.x) + .2, .08, Math.abs(b.z - a.z) + .2, district);
    }
    push(...campPicketColliders(), ...campTentColliders());
    // Tent lines by contingent, each under its own flag.
    for (const group of camp.contingents) {
      for (const spot of group.tents) {
        const p = C(spot.a, spot.b), base = gy(p.x, p.z);
        box(canvasMat, p.x, base + .3, p.z, camp.tent.w, .6, camp.tent.d, district);
        mesh(roofGeometry(camp.tent.w + .5, camp.tent.d + .5, 1.7), canvasMat, p.x, base + .6, p.z, 1, 1, 1, district);
        box(darkWood, p.x, base + 1.15, p.z, .09, 2.3, .09, district);
        box(shadow, p.x, base + .75, p.z - camp.tent.d / 2 - .2, .8, 1.4, .06, district);
        for (const side of [-1, 1]) {
          const guy = box(cordage, p.x + side * (camp.tent.w / 2 + .7), base + .5, p.z, .05, 1.0, .05, district);
          guy.rotation.z = side * .55;
        }
        metrics.tents++;
      }
      const f = C(group.flag.a, group.flag.b), fy = gy(f.x, f.z);
      post(wood, f.x, fy + 2.3, f.z, .09, 4.6, district);
      box(material(group.banner), f.x, fy + 3.9, f.z - .45, .05, 1.0, .9, district).name = `${group.name} banner`;
      box(material(group.emblem), f.x, fy + 3.9, f.z - .48, .04, .3, .3, district);
      push({ x: f.x, z: f.z, r: .3, kind: 'camp-banner' });
    }
    // The drill ground: a row of practice stakes and a rack of spears.
    for (let i = 0; i < 7; i++) {
      const p = C(camp.drill.a - 12 + i * 4, camp.drill.b - 12);
      post(darkWood, p.x, gy(p.x, p.z) + .9, p.z, .17, 1.8, district);
      push({ x: p.x, z: p.z, r: .25, kind: 'practice-stake' });
    }
    const rack = C(camp.drill.a + 14, camp.drill.b + 10), ry = gy(rack.x, rack.z);
    box(wood, rack.x, ry + .95, rack.z, .14, .12, 2.4, district);
    for (let i = 0; i < 5; i++) { const s = post(material('#8b7a60'), rack.x + .06, ry + 1.2, rack.z - .9 + i * .45, .035, 2.3, district); s.rotation.x = .08; }
    push({ x: rack.x, z: rack.z, hx: .35, hz: 1.3, kind: 'spear-rack' });
    // A cook fire and the horse line.
    const fire = C(camp.fire.a, camp.fire.b), fby = gy(fire.x, fire.z);
    for (let i = 0; i < 9; i++) { const a = i / 9 * Math.PI * 2; pebble(graniteDark, fire.x + Math.sin(a) * 1.1, fby + .1, fire.z + Math.cos(a) * 1.1, .28, .2, .26, district); }
    for (let i = 0; i < 4; i++) { const log = box(darkWood, fire.x + range(-.4, .4), fby + .18, fire.z + range(-.4, .4), .2, .2, 1.3, district); log.rotation.y = range(0, 3.14); }
    mesh(cylinder, iron, fire.x, fby + .7, fire.z, .38, .5, .38, district);
    push({ x: fire.x, z: fire.z, r: 1.3, kind: 'cook-fire' });
    const line = C(camp.horseLine.a, camp.horseLine.b);
    for (let i = 0; i <= 5; i++) { const p = C(camp.horseLine.a - 7 + i * 2.8, camp.horseLine.b); post(wood, p.x, gy(p.x, p.z) + .7, p.z, .1, 1.4, district); }
    box(woodLight, line.x, gy(line.x, line.z) + 1.3, line.z, 14.4, .11, .11, district);
    push({ x: line.x, z: line.z, hx: 7.2, hz: .2, kind: 'horse-line' });
    // Stores at the gate: what an army eats, stacked where the carts leave it.
    for (const [a, b] of [[-46, -18], [-43, -15], [-40, -18], [-46, 16], [-43, 19], [-40, 16]]) {
      const p = C(a, b); barrel(p.x, p.z, 1, district); push({ x: p.x, z: p.z, r: .45, kind: 'cask' });
    }
    for (const [a, b] of [[-49, -9], [-46, -6], [-49, 8], [-46, 11]]) {
      const p = C(a, b); crate(p.x, p.z, .9, null, district); push({ x: p.x, z: p.z, r: .6, kind: 'crate' });
    }
    const trough = C(camp.horseLine.a + 9, camp.horseLine.b);
    box(darkWood, trough.x, gy(trough.x, trough.z) + .3, trough.z, 1.0, .6, 3.0, district);
    push({ x: trough.x, z: trough.z, hx: .6, hz: 1.6, kind: 'trough' });
    metrics.landmarks++;
  }

  // -------------------------------------------------------------------------
  // Ardveth, Kelvath Cove, the Sea Gate, the Sightstone and the Long Pasture
  // -------------------------------------------------------------------------
  {
    const A = ARDVETH;
    wornPatch(A.centre.x, A.centre.z, 15, '#9c9682', 1.1, district);
    for (const [index, spot] of A.cottages.entries())
      cottage(spot.x, spot.z, 6.4, 5.4, 3.1, index % 2 ? '#565c60' : '#4b5155', index % 3 ? '#d6d1bc' : '#cac6b0', -Math.PI / 2 + range(-.25, .25), district, { plain: true });
    for (const hull of A.hulls) {
      const y = gy(hull.x, hull.z);
      const boat = new THREE.Group(); boat.position.set(hull.x, y + .4, hull.z); boat.rotation.set(Math.PI, range(0, 3.14), .05); district.add(boat);
      const shape = [[0, -2.5], [.9, -1.6], [1.0, .7], [.65, 2.0], [0, 2.4], [-.65, 2.0], [-1.0, .7], [-.9, -1.6]];
      const bp = [], bi = [];
      for (const [bx, bz] of shape) bp.push(bx, .55, bz, bx * .55, -.3, bz * .8);
      for (let i = 0; i < shape.length; i++) { const p = i * 2, q = ((i + 1) % shape.length) * 2; bi.push(p, q, p + 1, q, q + 1, p + 1); }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(bp, 3)); g.setIndex(bi); g.computeVertexNormals();
      mesh(g, material('#556058', { side: THREE.DoubleSide }), 0, 0, 0, 1, 1, 1, boat);
      push({ x: hull.x, z: hull.z, r: 1.4, kind: 'upturned-boat' });
    }
    for (const rack of A.racks) {
      const base = gy(rack.x, rack.z);
      for (const side of [-1, 1]) post(wood, rack.x, base + .9, rack.z + side * 1.8, .09, 1.8, district);
      box(wood, rack.x, base + 1.8, rack.z, .08, .08, 3.8, district);
      for (let i = 0; i < 6; i++) box(fishMat, rack.x + .04, base + 1.45, rack.z - 1.4 + i * .55, .05, .42, .16, district);
      push({ x: rack.x, z: rack.z, hx: .3, hz: 2.0, kind: 'drying-rack' });
    }
    // Ardveth's own niche: the same theology, one twentieth the size.
    const s = A.shrine, sy = gy(s.x, s.z);
    box(granite, s.x, sy + .8, s.z, 1.0, 1.6, 1.6, district);
    box(graniteDark, s.x, sy + 1.68, s.z, 1.3, .16, 1.9, district);
    box(shadow, s.x + .4, sy + .95, s.z, .2, .9, 1.0, district);
    push({ x: s.x, z: s.z, r: 1.1, kind: 'ardveth-shrine' });
    metrics.landmarks++;
  }
  {
    const K = KELVATH;
    wornPatch(K.centre.x, K.centre.z, 12, '#9b9583', 1, district);
    for (let i = 0; i < 8; i++) box(darkWood, K.slip.x - 3.6 + i * 1.05, gy(K.slip.x, K.slip.z) - .05 + i * .06, K.slip.z, .32, .16, 4.2, district);
    // The hull on the stocks: a keel, frames up, no planking.
    const st = K.stocks, sy = gy(st.x, st.z);
    for (const side of [-1, 1]) for (let i = 0; i < 4; i++) box(darkWood, st.x - 4 + i * 2.6, sy + .5, st.z + side * 1.5, .22, 1.0, .22, district);
    box(darkWood, st.x, sy + 1.05, st.z, 12, .35, .4, district);
    for (let i = 0; i < 9; i++) {
      const along = (i - 4) * 1.35, lean = 1 - Math.abs(i - 4) / 6;
      for (const side of [-1, 1]) {
        const rib = box(woodLight, st.x + along, sy + 1.2 + lean * 1.0, st.z + side * .55, .16, lean * 2.3 + .5, .18, district);
        rib.rotation.z = side * (.3 + lean * .3);
      }
    }
    push({ x: st.x, z: st.z, hx: 6, hz: 1.6, kind: 'hull-on-stocks' });
    // The shed, the saw pit and the tar pot.
    const sh = K.shed, shy = gy(sh.x, sh.z);
    onGround(graniteDark, sh.x, sh.z, 8.4, .9, 6.4, district, shy - .15);
    onGround(limeWash[2], sh.x, sh.z, 7.8, 3.4, 5.8, district, shy + .75);
    mesh(roofGeometry(8.8, 6.8, 1.5), slate, sh.x, shy + .75 + 3.4, sh.z, 1, 1, 1, district);
    push({ x: sh.x, z: sh.z, hx: 4.1, hz: 3.1, kind: 'izol-building' });
    const sp = K.sawPit, spy = gy(sp.x, sp.z);
    box(shadow, sp.x, spy + .02, sp.z, 2.0, .04, 5.0, district);
    for (const side of [-1, 1]) box(woodLight, sp.x + side * 1.2, spy + .3, sp.z, .5, .6, 5.2, district);
    box(darkWood, sp.x, spy + .8, sp.z + .6, .5, .4, 4.2, district);
    push({ x: sp.x, z: sp.z, hx: 1.5, hz: 2.6, kind: 'saw-pit' });
    const tp = K.tarPot, tpy = gy(tp.x, tp.z);
    mesh(cylinder, iron, tp.x, tpy + .34, tp.z, .42, .68, .42, district);
    box(pitch, tp.x, tpy + .66, tp.z, .68, .06, .68, district);
    metrics.landmarks++;
  }
  {
    // The Sea Gate: a cleft in the rock, ringed with stones, the channel on three sides.
    const S = SEA_GATE, base = gy(S.x, S.z);
    for (let i = 0; i < 16; i++) {
      const a = i / 16 * Math.PI * 2, r = S.ringRadius * (1 + Math.sin(i * 1.7) * .08);
      const px = S.x + Math.sin(a) * r, pz = S.z + Math.cos(a) * r;
      const stone = pebble(i % 2 ? granite : graniteDark, px, gy(px, pz) + range(.25, .5), pz, range(.4, .7), range(.5, .95), range(.4, .65), district);
      stone.rotation.set(range(-.15, .15), range(0, 6.28), range(-.15, .15));
      if (i % 4 === 0) push({ x: px, z: pz, r: .5, kind: 'sea-gate-stone' });
    }
    // The gate itself: two uprights and a lintel, set so the mouth of the harbour
    // shows through them from the crown of the headland.
    for (const side of [-1, 1]) {
      const slab = box(graniteWet, S.x + side * 2.1, base + 2.2, S.z, 1.2, 4.4, 1.5, district);
      slab.rotation.set(0, .16 * side, side * .05);
      push({ x: S.x + side * 2.1, z: S.z, r: 1.0, kind: 'sea-gate' });
    }
    box(graniteDark, S.x, base + 4.7, S.z, 6.2, .7, 1.7, district);
    box(graniteWarm, S.x, base + 5.2, S.z, 5.0, .35, 1.3, district);
    wornPatch(S.x, S.z + 3, 6, '#918c78', 1, district);
    metrics.landmarks++;
  }
  {
    const S = SIGHTSTONE, base = gy(S.x, S.z);
    const slab = box(graniteWarm, S.x, base + .28, S.z, 4.6, .56, 3.4, district);
    slab.rotation.set(.02, .5, .03);
    for (let i = 0; i < 6; i++) {
      const a = i * 1.05, px = S.x + Math.sin(a) * 3.6, pz = S.z + Math.cos(a) * 3.6;
      pebble(granite, px, gy(px, pz) + .2, pz, .45, .3, .4, district);
    }
    // The cairn beside it, added to by everyone who stops.
    for (let i = 0; i < 14; i++) {
      const t = i / 14;
      pebble(i % 2 ? granite : graniteDark, S.x + 5 + range(-.5, .5) * (1 - t), base + .2 + i * .16, S.z + 1 + range(-.5, .5) * (1 - t),
        .5 * (1 - t * .7), .18, .45 * (1 - t * .7), district);
    }
    push({ x: S.x, z: S.z, hx: 2.4, hz: 1.8, kind: 'sightstone' }, { x: S.x + 5, z: S.z + 1, r: .7, kind: 'cairn' });
    wornPatch(S.x, S.z, 8, '#8f8b76', 1, district);
    metrics.landmarks++;
  }
  {
    // The Long Pasture: a dry-stone fold and a cairn on the only level grass here.
    const L = LONG_PASTURE;
    const ring = 11;
    for (let i = 0; i < 18; i++) {
      const a0 = i / 18 * Math.PI * 2, a1 = (i + 1) / 18 * Math.PI * 2;
      if (i === 4) continue;
      dryStone({ x: L.fold.x + Math.sin(a0) * ring, z: L.fold.z + Math.cos(a0) * ring },
        { x: L.fold.x + Math.sin(a1) * ring, z: L.fold.z + Math.cos(a1) * ring }, 1.1, .55, granite, i % 2 === 0);
    }
    for (let i = 0; i < 10; i++) {
      const t = i / 10;
      pebble(i % 2 ? granite : graniteDark, L.cairn.x + range(-.4, .4) * (1 - t), gy(L.cairn.x, L.cairn.z) + .2 + i * .19, L.cairn.z + range(-.4, .4) * (1 - t),
        .55 * (1 - t * .7), .2, .5 * (1 - t * .7), district);
    }
    push({ x: L.cairn.x, z: L.cairn.z, r: .7, kind: 'cairn' });
    metrics.landmarks++;
  }

  // -------------------------------------------------------------------------
  // The Three Presences, on the skyline inland
  // -------------------------------------------------------------------------
  // Kept out of the merge and out of the shadow pass: they are a skyline, not scenery.
  const presences = new THREE.Group(); presences.name = 'The Three Presences'; root.add(presences); movingGroups?.add(presences);
  const summitMaterial = material('#7b8079', { flatShading: true });
  for (const [index, peak] of THREE_PRESENCES.entries()) {
    const baseY = gy(peak.x, peak.z) - 4, height = peak.topY - baseY, positions = [], indices = [];
    for (let ring = 0; ring < 3; ring++) for (let i = 0; i < 7; i++) {
      const angle = i * Math.PI * 2 / 7 + peak.phase, radius = [1, .68, .27][ring] * (1 + Math.sin(i * 1.83 + peak.phase) * .14);
      const localY = height * [0, .45, .79][ring] + (ring ? Math.sin(i * 2.2 + peak.phase) * height * .04 : 0);
      positions.push(Math.cos(angle) * peak.width * radius + peak.lean * ring * .3, localY, Math.sin(angle) * peak.depth * radius);
    }
    positions.push(peak.lean, height, -1.5);
    for (let ring = 0; ring < 2; ring++) for (let i = 0; i < 7; i++) {
      const a = ring * 7 + i, b = ring * 7 + (i + 1) % 7;
      indices.push(a, a + 7, b, b, a + 7, b + 7);
    }
    for (let i = 0; i < 7; i++) indices.push(14 + i, 21, 14 + (i + 1) % 7);
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3)); geometry.setIndex(indices); geometry.computeVertexNormals();
    const peakMesh = mesh(geometry, summitMaterial, peak.x, baseY, peak.z, 1, 1, 1, presences);
    peakMesh.name = `Presence ${index + 1}`; peakMesh.castShadow = false;
  }

  // -------------------------------------------------------------------------
  // The island's own scatter: sea turf, gorse, thorn, rock, wind-bent pine
  // -------------------------------------------------------------------------
  const turfGeometry = (() => {
    const positions = [], normals = [];
    for (let blade = 0; blade < 4; blade++) {
      const a = blade * 1.9, bx = Math.cos(a) * .14, bz = Math.sin(a) * .14, w = .05, h = .16 + (blade % 3) * .06;
      const cx = Math.cos(a + Math.PI / 2) * w, cz = Math.sin(a + Math.PI / 2) * w;
      positions.push(bx - cx, 0, bz - cz, bx + cx, 0, bz + cz, bx + Math.cos(a) * .06, h, bz + Math.sin(a) * .06);
      for (let j = 0; j < 3; j++) normals.push(0, 1, 0);
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    return geometry;
  })();
  const trunkGeometry = new THREE.CylinderGeometry(.13, .25, 1, 6);
  const turfMaterial = material('#ffffff', { side: THREE.DoubleSide });
  const gorseMaterial = material('#ffffff', { flatShading: true });
  const rockMaterial = material('#767a73');
  const barkMaterial = material('#5f5240');
  const pineMaterial = material('#3f5748', { flatShading: true });
  const stands = Object.values(IZOL_STANDS);
  const clear = (x, z, margin) => izolDeckHeight(x, z) !== null
    || inIzolveth(x, z, margin)
    || IZOL_CLEARINGS.some(spot => Math.hypot(spot.x - x, spot.z - z) < spot.r + margin)
    || stands.some(spot => Math.hypot(spot.x - x, spot.z - z) < 4 + margin);
  /** True on or beside any of West Izol's own roads and paths: nothing grows across them. */
  const onPath = (x, z) => {
    for (const path of IZOL_PATHS) for (let i = 1; i < path.points.length; i++) {
      const a = path.points[i - 1], b = path.points[i], dx = b.x - a.x, dz = b.z - a.z;
      const t = Math.max(0, Math.min(1, ((x - a.x) * dx + (z - a.z) * dz) / (dx * dx + dz * dz)));
      if (Math.hypot(x - a.x - dx * t, z - a.z - dz * t) < path.width / 2 + 1.6) return true;
    }
    return false;
  };

  const per = count => Math.round(count * WORLD_SCALE * WORLD_SCALE);
  const PINES = per(2), GORSE = per(14), THORN = per(4), ROCKS = per(30), TUFTS = per(64);
  const cells = [...REGION_CELLS['West Izol']].sort((a, b) => a.z - b.z || a.x - b.x);
  // Three hexes to a block: a batch per kind per block, and the town sees a handful of them.
  const blocks = [];
  for (let i = 0; i < cells.length; i += 3) blocks.push(cells.slice(i, i + 3));

  for (const block of blocks) {
    const pines = [], gorse = [], thorn = [], rocks = [], tufts = [];
    for (const cell of block) {
      const hills = cell.terrain === 'hills', plains = cell.terrain === 'plains';
      const sample = () => ({ x: cell.x + range(-52, 52), z: cell.z + range(-58, 58) });
      const usable = (x, z, margin) => isLandHex(x, z) && landDistance(x, z) > 1.5 && !clear(x, z, margin) && !onPath(x, z);
      for (let i = 0; i < (plains ? 0 : PINES * 5); i++) {
        const { x, z } = sample();
        if (!usable(x, z, 4) || landDistance(x, z) < 26 || gy(x, z) < 11) continue;
        if (pines.some(p => Math.hypot(p.x - x, p.z - z) < 9)) continue;
        pines.push({ x, z, s: range(.8, 1.15), h: range(5.5, 8.5), rot: range(0, 6.28), lean: range(.1, .24) });
      }
      for (let i = 0; i < GORSE; i++) {
        const { x, z } = sample();
        if (!usable(x, z, 2.5) || landDistance(x, z) < 4) continue;
        if (gorse.some(g => Math.hypot(g.x - x, g.z - z) < 3.2)) continue;
        gorse.push({ x, z, s: range(.7, 1.5), rot: range(0, 6.28) });
      }
      for (let i = 0; i < (plains ? THORN * 2 : THORN); i++) {
        const { x, z } = sample();
        if (!usable(x, z, 4) || landDistance(x, z) < 18) continue;
        if (thorn.some(t => Math.hypot(t.x - x, t.z - z) < 7)) continue;
        thorn.push({ x, z, s: range(.8, 1.4), rot: range(0, 6.28), lean: range(.12, .3) });
      }
      for (let i = 0; i < ROCKS; i++) {
        const { x, z } = sample();
        if (!usable(x, z, 1.5) || landDistance(x, z) < .5) continue;
        const shore = landDistance(x, z), high = gy(x, z) > 17;
        if (random() > (shore < 16 ? 1 : hills || high ? .7 : .34)) continue;
        rocks.push({ x, z, s: range(.4, shore < 14 ? 2.4 : hills ? 2.8 : 1.3), rot: range(0, 6.28), high });
      }
      for (let i = 0; i < TUFTS; i++) {
        const { x, z } = sample();
        if (!usable(x, z, .5) || landDistance(x, z) < 1.5) continue;
        tufts.push({ x, z, s: range(.7, 1.7), rot: range(0, 6.28), high: gy(x, z) > 17 });
      }
    }
    if (pines.length) {
      const trunks = new THREE.InstancedMesh(trunkGeometry, barkMaterial, pines.length);
      const crowns = new THREE.InstancedMesh(round, pineMaterial, pines.length * 2);
      let crownIndex = 0;
      pines.forEach((pine, index) => {
        const y = gy(pine.x, pine.z), height = pine.h * pine.s;
        dummy.position.set(pine.x, y + height * .42, pine.z);
        dummy.rotation.set(pine.lean * .6, pine.rot, pine.lean);
        dummy.scale.set(pine.s, height * .86, pine.s); dummy.updateMatrix();
        trunks.setMatrixAt(index, dummy.matrix);
        for (let c = 0; c < 2; c++) {
          dummy.position.set(pine.x + Math.sin(pine.rot) * height * (.1 + pine.lean), y + height * (.74 + c * .16), pine.z + Math.cos(pine.rot) * height * (.1 + pine.lean) * .4);
          dummy.rotation.set(.1, pine.rot + c, pine.lean * 1.3);
          dummy.scale.set(height * (.33 - c * .1), height * .17, height * (.26 - c * .08)); dummy.updateMatrix();
          crowns.setMatrixAt(crownIndex, dummy.matrix);
          crowns.setColorAt(crownIndex++, color.setHSL(range(.3, .37), range(.14, .24), range(.17, .25)));
        }
        push({ x: pine.x, z: pine.z, r: .4 * pine.s, kind: 'region-tree' });
      });
      crowns.count = crownIndex;
      for (const batch of [trunks, crowns]) { batch.castShadow = true; batch.receiveShadow = true; batch.computeBoundingSphere(); district.add(batch); metrics.batches++; }
      movingGroups?.add(trunks); movingGroups?.add(crowns);
      metrics.pines += pines.length;
    }
    // Gorse and thorn share one batch: the same geometry, the same material, different colour and shape.
    if (gorse.length || thorn.length) {
      const batch = new THREE.InstancedMesh(round, gorseMaterial, gorse.length * 2 + thorn.length * 3);
      let index = 0;
      for (const bush of gorse) {
        const y = gy(bush.x, bush.z);
        for (let part = 0; part < 2; part++) {
          dummy.position.set(bush.x + (part ? .3 * bush.s : 0), y + bush.s * (part ? .42 : .3), bush.z + (part ? -.25 * bush.s : 0));
          dummy.rotation.set(range(-.2, .2), bush.rot + part, range(-.2, .2));
          dummy.scale.set(bush.s * (part ? .5 : .82), bush.s * (part ? .34 : .5), bush.s * (part ? .46 : .78)); dummy.updateMatrix();
          batch.setMatrixAt(index, dummy.matrix);
          batch.setColorAt(index++, part && random() < .5 ? color.setHSL(.14, .6, range(.44, .55)) : color.setHSL(range(.23, .3), range(.2, .32), range(.19, .28)));
        }
        if (bush.s > 1.2) push({ x: bush.x, z: bush.z, r: bush.s * .5, kind: 'gorse' });
      }
      for (const bush of thorn) {
        const y = gy(bush.x, bush.z);
        for (let part = 0; part < 3; part++) {
          dummy.position.set(bush.x + Math.sin(bush.rot + part) * bush.s * .5, y + bush.s * (1.0 + part * .35), bush.z + Math.cos(bush.rot + part) * bush.s * .3);
          dummy.rotation.set(bush.lean, bush.rot + part, bush.lean * 1.4);
          dummy.scale.set(bush.s * (1.1 - part * .2), bush.s * .5, bush.s * (.9 - part * .18)); dummy.updateMatrix();
          batch.setMatrixAt(index, dummy.matrix);
          batch.setColorAt(index++, color.setHSL(range(.2, .27), range(.13, .22), range(.22, .32)));
        }
        post(darkWood, bush.x, y + bush.s * .55, bush.z, .1 * bush.s, bush.s * 1.1, district);
        push({ x: bush.x, z: bush.z, r: .35 * bush.s, kind: 'thorn' });
      }
      batch.count = index; batch.castShadow = false; batch.receiveShadow = true; batch.computeBoundingSphere(); district.add(batch);
      movingGroups?.add(batch);
      metrics.gorse += gorse.length; metrics.thorn += thorn.length; metrics.batches++;
    }
    if (rocks.length) {
      const batch = new THREE.InstancedMesh(round, rockMaterial, rocks.length);
      rocks.forEach((rock, index) => {
        dummy.position.set(rock.x, gy(rock.x, rock.z) + rock.s * .24, rock.z);
        dummy.rotation.set(range(-.2, .2), rock.rot, range(-.2, .2));
        dummy.scale.set(rock.s, rock.s * range(.35, .75), rock.s * range(.7, 1.3)); dummy.updateMatrix();
        batch.setMatrixAt(index, dummy.matrix);
        // Iron-brown at the water, slate-grey at height: the lore's own description of Izoli rock.
        batch.setColorAt(index, rock.high ? color.setHSL(range(.55, .62), range(.02, .05), range(.42, .55))
          : color.setHSL(range(.07, .11), range(.08, .16), range(.28, .42)));
        if (rock.s > 1.6) push({ x: rock.x, z: rock.z, r: rock.s * .6, kind: 'shore-rock' });
      });
      batch.castShadow = true; batch.receiveShadow = true; batch.computeBoundingSphere(); district.add(batch);
      movingGroups?.add(batch);
      metrics.rock += rocks.length; metrics.batches++;
    }
    if (tufts.length) {
      const batch = new THREE.InstancedMesh(turfGeometry, turfMaterial, tufts.length);
      tufts.forEach((tuft, index) => {
        dummy.position.set(tuft.x, gy(tuft.x, tuft.z) + .02, tuft.z);
        dummy.rotation.set(0, tuft.rot, 0); dummy.scale.setScalar(tuft.s); dummy.updateMatrix();
        batch.setMatrixAt(index, dummy.matrix);
        batch.setColorAt(index, tuft.high ? color.setHSL(range(.15, .21), range(.09, .18), range(.4, .52))
          : color.setHSL(range(.19, .27), range(.18, .32), range(.32, .46)));
      });
      batch.receiveShadow = true; batch.computeBoundingSphere(); district.add(batch);
      movingGroups?.add(batch);
      metrics.turf += tufts.length; metrics.batches++;
    }
  }

  // Fingerposts, in the island's plain style: one board, no flourish.
  for (const entry of IZOL_SIGNS) sign?.(entry.x, entry.z, entry.label, entry.yaw, entry.returnLabel);

  // -------------------------------------------------------------------------
  // Merge: the whole town in a handful of draw calls
  // -------------------------------------------------------------------------
  const skip = new Set();
  district.traverse(object => { if (object !== district && movingGroups?.has(object)) skip.add(object); });
  const town = new THREE.Group(), country = new THREE.Group();
  town.name = 'Izolveth, merged'; country.name = 'West Izol country, merged';
  mergeByColour(district, skip, town, country, object => {
    const centre = object.geometry.boundingSphere.center.clone().applyMatrix4(object.matrixWorld);
    return Math.hypot(centre.x - IZOLVETH.centre.x, centre.z - IZOLVETH.centre.z) < 190;
  });
  for (const group of [town, country]) { district.add(group); movingGroups?.add(group); }
  for (const child of town.children) child.name = 'Izolveth merged scenery';
  for (const child of country.children) child.name = 'West Izol country merged';
  metrics.mergedGroups = town.children.length + country.children.length;

  return { group: district, metrics, landmarks: IZOL_LANDMARKS, generals: IZOL_GENERALS };
}

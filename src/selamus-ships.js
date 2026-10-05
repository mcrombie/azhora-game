import * as THREE from 'three';

// Harbour scenery, with its waterline at local y=0 and its bow at local -Z.
// The three hulls use different proportions; length scales the entire model.
const PROFILES = {
  merchant: { length: 24, beam: 7, deck: 2.25, draft: 1.85, sheer: .85, stern: .55 },
  galley: { length: 32, beam: 5.4, deck: 1.4, draft: 1.05, sheer: .7, stern: .08 },
  gondola: { length: 10, beam: 1.85, deck: .39, draft: .38, sheer: .76, stern: .015 },
};
const COLORS = { wood: 0x765039, pale: 0xad8050, dark: 0x352a25, black: 0x232e31, gold: 0xd6ac55, linen: 0xe8ddbc, rope: 0x66583f, glass: 0x183f49, red: 0x913e37 };
const BOX = new THREE.BoxGeometry(1, 1, 1);
const SHAFT = new THREE.CylinderGeometry(1, 1, 1, 6);
const BARREL = new THREE.CylinderGeometry(.8, .8, 1, 10, 1);
const BALL = new THREE.IcosahedronGeometry(1, 1);
const MATERIALS = new Map(), GEOMETRIES = new Map();
const UP = new THREE.Vector3(0, 1, 0);
function material(color, cloth = false) {
  const key = `${color}:${cloth}`;
  if (!MATERIALS.has(key)) MATERIALS.set(key, new THREE.MeshStandardMaterial({ color, roughness: cloth ? .95 : .77, metalness: color === COLORS.gold ? .38 : 0, side: cloth ? THREE.DoubleSide : THREE.FrontSide }));
  return MATERIALS.get(key);
}
const HULL_MATERIAL = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .85 });

function cached(key, build) {
  if (!GEOMETRIES.has(key)) {
    const geometry = build(); geometry.computeBoundingBox(); geometry.computeBoundingSphere(); GEOMETRIES.set(key, geometry);
  }
  return GEOMETRIES.get(key);
}

function widthAt(p, t) {
  // The merchant has a broad transom; the galley and gondola draw to both ends.
  const stations = [[0, .008], [.06, .23], [.16, .57], [.3, .87], [.47, 1], [.65, .98], [.81, .85], [.93, .59], [1, p.stern]];
  for (let i = 1; i < stations.length; i++) if (t <= stations[i][0]) {
    const [a, wa] = stations[i - 1], [b, wb] = stations[i];
    return (wa + (wb - wa) * (t - a) / (b - a)) * p.beam / 2;
  }
  return p.stern * p.beam / 2;
}
function sheerAt(p, t) { return p.sheer * (Math.pow(Math.abs(t * 2 - 1), 3) + .14 * t); }
function rimAt(p, t, side = 1, lift = 0) { return [side * widthAt(p, t), p.deck + sheerAt(p, t) + lift, (t - .5) * p.length]; }

function hullGeometry(kind, accent) {
  return cached(`hull:${kind}:${accent}`, () => {
    const p = PROFILES[kind], positions = [], colors = [], tint = new THREE.Color();
    const profile = [[1, 1], [1.04, .8], [1.015, .57], [.92, .34], [.7, .12], [.23, 0], [0, -.03], [-.23, 0], [-.7, .12], [-.92, .34], [-1.015, .57], [-1.04, .8], [-1, 1]];
    const rings = [];
    for (let i = 0; i <= 24; i++) {
      const t = i / 24, sheer = sheerAt(p, t), w = widthAt(p, t);
      rings.push(profile.map(([x, y]) => [x * w, -p.draft + y * (p.deck + p.draft) + sheer, (t - .5) * p.length]));
    }
    function tri(a, b, c, color) {
      tint.set(color); positions.push(...a, ...b, ...c);
      for (let i = 0; i < 3; i++) colors.push(tint.r, tint.g, tint.b);
    }
    for (let i = 0; i < 24; i++) {
      for (let j = 0; j < profile.length - 1; j++) {
        const course = Math.min(j, profile.length - 2 - j);
        const color = kind === 'gondola' ? (course % 2 ? 0x222827 : COLORS.black) : course === 0 ? accent : [COLORS.wood, 0x65422e, 0x885e3a, 0x65422e, COLORS.dark, 0x493b2f][course];
        const a = rings[i][j], b = rings[i + 1][j], c = rings[i + 1][j + 1], d = rings[i][j + 1];
        tri(a, b, d, color); tri(b, c, d, color);
      }
      // A full, pointed deck closes the top of the hull.
      const a = rings[i][0], b = rings[i + 1][0], c = rings[i + 1].at(-1), d = rings[i].at(-1);
      tri(a, d, b, COLORS.pale); tri(b, d, c, COLORS.pale);
    }
    for (const end of [0, 24]) {
      const ring = rings[end], center = [0, (p.deck - p.draft) / 2 + sheerAt(p, end / 24), (end / 24 - .5) * p.length];
      for (let j = 0; j < ring.length; j++) {
        const a = ring[j], b = ring[(j + 1) % ring.length];
        if (end === 0) tri(center, a, b, COLORS.dark); else tri(center, b, a, COLORS.wood);
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    g.computeVertexNormals(); return g;
  });
}

/** Batch repeated deck fittings, spars, rail posts and ropes by geometry/material. */
function fittings(root) {
  const batches = new Map(), position = new THREE.Vector3(), scale = new THREE.Vector3(), rotation = new THREE.Quaternion(), matrix = new THREE.Matrix4();
  const metrics = { instances: 0, rigging: 0 };
  function put(geometry, color, xyz, size, quaternion, feature = 'fittings') {
    const key = `${geometry.id}:${color}`;
    if (!batches.has(key)) batches.set(key, { geometry, color, matrices: [], features: new Set() });
    position.fromArray(xyz); scale.fromArray(size); rotation.copy(quaternion ?? new THREE.Quaternion());
    matrix.compose(position, rotation, scale);
    const batch = batches.get(key); batch.matrices.push(matrix.clone()); batch.features.add(feature); metrics.instances++;
  }
  function box(color, xyz, size, feature, yaw = 0) { put(BOX, color, xyz, size, new THREE.Quaternion().setFromAxisAngle(UP, yaw), feature); }
  function beam(color, a, b, radius = .06, feature = 'timbers') {
    const start = new THREE.Vector3().fromArray(a), end = new THREE.Vector3().fromArray(b), dir = end.clone().sub(start), length = dir.length();
    if (length < 1e-5) return;
    put(SHAFT, color, start.add(end).multiplyScalar(.5).toArray(), [radius, length, radius], new THREE.Quaternion().setFromUnitVectors(UP, dir.divideScalar(length)), feature);
    if (feature === 'rigging') metrics.rigging++;
  }
  function ball(color, xyz, size, feature) { put(BALL, color, xyz, size, undefined, feature); }
  function barrel(x, y, z) {
    put(BARREL, COLORS.wood, [x, y, z], [.58, 1.08, .58], undefined, 'cargo');
    for (const dy of [-.38, .38]) put(BARREL, COLORS.dark, [x, y + dy, z], [.6, .08, .6], undefined, 'cargo');
  }
  function finish() {
    for (const { geometry, color, matrices, features } of batches.values()) {
      const mesh = new THREE.InstancedMesh(geometry, material(color), matrices.length);
      matrices.forEach((m, i) => mesh.setMatrixAt(i, m)); mesh.instanceMatrix.needsUpdate = true;
      mesh.name = `Selemis ${[...features].join(', ')}`; mesh.userData.features = [...features];
      mesh.castShadow = true; mesh.receiveShadow = true; mesh.computeBoundingSphere(); root.add(mesh);
    }
    return metrics;
  }
  return { box, beam, ball, barrel, finish };
}

function addMesh(root, geometry, mat, name, feature) {
  const mesh = new THREE.Mesh(geometry, mat); mesh.name = name; mesh.userData.feature = feature;
  mesh.castShadow = true; mesh.receiveShadow = true; root.add(mesh); return mesh;
}
function pennant(root, x, y, z, color, size = 1) {
  const geometry = cached('forked-pennant', () => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, 2.4, -.16, .28, 1.7, -.43, .24, 0, 0, 0, 1.7, -.43, .24, 0, -.85, 0, 0, -.85, 0, 1.7, -.43, .24, 2.4, -.84, .28], 3));
    g.computeVertexNormals(); return g;
  });
  const mesh = addMesh(root, geometry, material(color, true), 'Selemis forked trading pennant', 'pennant');
  mesh.position.set(x, y, z); mesh.scale.setScalar(size);
}
function squareSail(root, b, { z, top, width, height, accent }) {
  const geometry = cached(`square:${width}:${height}`, () => {
    const g = new THREE.PlaneGeometry(width, height, 12, 10), pos = g.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const u = pos.getX(i) / width + .5, v = .5 - pos.getY(i) / height;
      pos.setXYZ(i, (u - .5) * width * (1 - .17 * v), -v * height, -.12 - Math.sin(Math.PI * u) * Math.sin(Math.PI * v) * width * .15);
    }
    g.computeVertexNormals(); return g;
  });
  const sail = addMesh(root, geometry, material(COLORS.linen, true), 'Selemis tensioned square sail', 'sail'); sail.position.set(0, top, z);
  const point = (u, v) => [(u - .5) * width * (1 - .17 * v), top - v * height, z - .16 - Math.sin(Math.PI * u) * Math.sin(Math.PI * v) * width * .15];
  b.beam(COLORS.wood, [-width * .55, top + .08, z], [width * .55, top + .08, z], .11, 'yards');
  // Roped hems and taut sheets make the billow read as a rigged cloth surface.
  for (const u of [0, 1]) for (let j = 0; j < 6; j++) b.beam(COLORS.rope, point(u, j / 6), point(u, (j + 1) / 6), .022, 'rigging');
  for (const side of [-1, 1]) b.beam(COLORS.rope, point(side < 0 ? 0 : 1, 1), [side * width * .33, 2.5, z + 1.5], .032, 'rigging');
  // Selemis's forked tide insignia follows the curved canvas rather than floating.
  function stroke(u1, v1, u2, v2) {
    for (let i = 0; i < 5; i++) b.beam(accent, point(u1 + (u2 - u1) * i / 5, v1 + (v2 - v1) * i / 5), point(u1 + (u2 - u1) * (i + 1) / 5, v1 + (v2 - v1) * (i + 1) / 5), .075, 'sail insignia');
  }
  stroke(.5, .25, .5, .77); stroke(.34, .28, .36, .49); stroke(.66, .28, .64, .49);
  stroke(.36, .49, .64, .49);
}

function lateenSail(root, b, { z, top, span, height, accent }) {
  // A long sloping yard and a low aft clew give the galley its Mediterranean silhouette.
  const a = [0, top, z - span * .58], c = [0, top - height, z + span * .37], d = [0, top - height * .28, z + span * .5];
  const geometry = cached(`lateen:${span}:${height}`, () => {
    const vertices = [], segments = 12;
    const at = (u, v) => {
      const w = 1 - u - v;
      return [Math.sin(Math.PI * u) * Math.sin(Math.PI * v) * Math.sin(Math.PI * w) * 1.6, -height * u - height * .28 * v, -span * .58 * w + span * .37 * u + span * .5 * v];
    };
    for (let i = 0; i < segments; i++) for (let j = 0; j < segments - i; j++) {
      vertices.push(...at(i / segments, j / segments), ...at((i + 1) / segments, j / segments), ...at(i / segments, (j + 1) / segments));
      if (i + j < segments - 1) vertices.push(...at((i + 1) / segments, j / segments), ...at((i + 1) / segments, (j + 1) / segments), ...at(i / segments, (j + 1) / segments));
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3)); g.computeVertexNormals(); return g;
  });
  const sail = addMesh(root, geometry, material(accent, true), 'Selemis lateen sail', 'sail'); sail.position.set(0, top, z);
  b.beam(COLORS.wood, [0, a[1] + .15, a[2] - .4], [0, d[1] + .15, d[2] + .4], .11, 'yards');
  b.beam(COLORS.rope, a, c, .026, 'rigging'); b.beam(COLORS.rope, c, d, .026, 'rigging');
  b.beam(COLORS.rope, c, [1.8, 1.9, z + span * .45], .03, 'rigging');
}

function rail(b, p, color, height = .76) {
  for (const side of [-1, 1]) for (let i = 1; i < 23; i++) {
    const a = rimAt(p, i / 24, side), c = rimAt(p, (i + 1) / 24, side);
    b.beam(color, a, c, .075, 'gunwales');
    b.beam(color, [a[0], a[1] + height, a[2]], [c[0], c[1] + height, c[2]], .058, 'rails');
    if (i % 2 === 1) b.beam(COLORS.wood, a, [a[0], a[1] + height, a[2]], .045, 'rail posts');
  }
  // Narrow dark seams track the hull curvature, giving the broad sides visible courses.
  for (const side of [-1, 1]) for (let row = 0; row < 3; row++) for (let i = 1; i < 24; i++) {
    const t = i / 24, t2 = (i + 1) / 24, fraction = .78 - row * .2, x = row === 2 ? .95 : 1.04;
    b.beam(COLORS.dark, [side * widthAt(p, t) * x, -p.draft + fraction * (p.deck + p.draft) + sheerAt(p, t), (t - .5) * p.length], [side * widthAt(p, t2) * x, -p.draft + fraction * (p.deck + p.draft) + sheerAt(p, t2), (t2 - .5) * p.length], .023, 'planking seams');
  }
}
function mast(b, p, z, height, width = .16) {
  b.beam(COLORS.wood, [0, p.deck, z], [0, height, z], width, 'masts');
  b.beam(COLORS.gold, [0, height, z], [0, height + .8, z], .055, 'mast finials');
  for (const side of [-1, 1]) for (const dz of [-1.5, 1.5]) {
    const x = side * p.beam * .43;
    b.beam(COLORS.rope, [x, p.deck + .5, z + dz], [0, height * .89, z], .024, 'rigging');
  }
  b.beam(COLORS.rope, [0, height * .94, z], [0, p.deck + .6, -p.length * .44], .03, 'rigging');
}

function sternGallery(b, { width, y, z, depth, accent, levels = 2 }) {
  b.box(accent, [0, y + levels * .65, z], [width, levels * 1.3, depth], 'sterncastle');
  for (let level = 0; level < levels; level++) {
    const yy = y + level * 1.3;
    b.box(COLORS.gold, [0, yy + 1.24, z], [width + .25, .14, depth + .25], 'stern gallery');
    for (const side of [-1, 1]) for (let i = 0; i < 4; i++) {
      const zz = z - depth / 2 + .45 + i * (depth - .9) / 3;
      b.box(COLORS.glass, [side * (width / 2 + .025), yy + .67, zz], [.045, .69, .49], 'stern windows');
      b.beam(COLORS.gold, [side * (width / 2 + .06), yy + .24, zz - .3], [side * (width / 2 + .06), yy + 1.02, zz - .3], .055, 'stern columns');
    }
    for (let i = -2; i <= 2; i++) {
      b.box(COLORS.glass, [i * width * .17, yy + .67, z + depth / 2 + .025], [width * .12, .72, .05], 'stern windows');
      b.box(COLORS.gold, [i * width * .17, yy + 1.06, z + depth / 2 + .08], [width * .14, .1, .09], 'stern windows');
    }
  }
  const roof = y + levels * 1.3 + .11;
  b.box(COLORS.wood, [0, roof, z], [width + .45, .16, depth + .4], 'sterncastle');
  for (const side of [-1, 1]) {
    b.beam(COLORS.gold, [side * (width / 2 + .1), roof + .7, z - depth / 2], [side * (width / 2 + .1), roof + .7, z + depth / 2], .06, 'stern gallery');
    for (let i = 0; i < 5; i++) b.beam(COLORS.gold, [side * (width / 2 + .1), roof, z - depth / 2 + depth * i / 4], [side * (width / 2 + .1), roof + .7, z - depth / 2 + depth * i / 4], .04, 'stern gallery');
  }
}
function seaGodProw(b, y, z, size = 1) {
  b.ball(COLORS.gold, [0, y + .4 * size, z], [.24 * size, .58 * size, .27 * size], 'sea god figurehead');
  b.ball(COLORS.gold, [0, y + 1.13 * size, z - .06], [.22 * size, .26 * size, .23 * size], 'sea god figurehead');
  b.beam(COLORS.gold, [0, y + .63 * size, z], [.58 * size, y + 1.05 * size, z - .1], .09 * size, 'sea god figurehead');
  b.beam(COLORS.gold, [.58 * size, y + .25 * size, z - .1], [.58 * size, y + 2.2 * size, z - .1], .05 * size, 'trident');
  b.beam(COLORS.gold, [.3 * size, y + 1.87 * size, z - .1], [.86 * size, y + 1.87 * size, z - .1], .05 * size, 'trident');
  for (const x of [.3, .86]) b.beam(COLORS.gold, [x * size, y + 1.87 * size, z - .1], [x * size, y + 2.16 * size, z - .1], .048 * size, 'trident');
}

function merchant(root, b, p, accent) {
  rail(b, p, COLORS.gold);
  sternGallery(b, { width: 4.7, y: 2.65, z: 8.35, depth: 4.5, accent });
  b.box(accent, [0, 2.9, -7.4], [3.4, .8, 3.15], 'forecastle');
  b.box(COLORS.pale, [0, 3.34, -7.4], [3.7, .12, 3.5], 'forecastle');
  b.beam(COLORS.wood, [0, 2.8, -9.7], [0, 5, -16.2], .13, 'bowsprit');
  b.beam(COLORS.rope, [0, 5, -16.2], [0, .3, -11.2], .04, 'rigging');
  seaGodProw(b, 3.1, -11.6, .72);
  for (const [z, height] of [[-5.2, 15.8], [1.1, 18.1], [7.4, 13.7]]) mast(b, p, z, height);
  pennant(root, 0, 18.8, 1.1, accent); pennant(root, 0, 16.5, -5.2, COLORS.red, .72);
  squareSail(root, b, { z: -5.2, top: 14.5, width: 8.8, height: 7.5, accent });
  squareSail(root, b, { z: 1.1, top: 16.7, width: 6.5, height: 4.5, accent });
  squareSail(root, b, { z: 1.1, top: 11.4, width: 10.1, height: 6.8, accent });
  lateenSail(root, b, { z: 7.2, top: 13.9, span: 6.5, height: 6, accent: COLORS.linen });
  b.beam(COLORS.rope, [0, 15.5, -5.2], [0, 4.9, -16.2], .03, 'rigging');
  b.beam(COLORS.rope, [0, 18, 1.1], [0, 15.7, -5.2], .035, 'rigging');
  // Visible sacks, hogsheads and bound crates on the waist of the trading ship.
  for (const side of [-1, 1]) for (let i = 0; i < 4; i++) {
    const x = side * 2.15, z = -2.8 + i * 1.8;
    if (i < 2) b.barrel(x, 2.92, z);
    else {
      b.box(COLORS.pale, [x, 2.92, z], [1.03, 1.1, 1.2], 'cargo');
      for (const dx of [-.32, .32]) b.box(COLORS.dark, [x + dx, 2.94, z], [.08, 1.14, 1.25], 'cargo straps');
      b.ball(COLORS.linen, [x, 3.66, z], [.5, .28, .48], 'cargo');
    }
  }
  b.box(COLORS.dark, [0, 2.46, 3.1], [2.2, .28, 2.45], 'cargo hatch');
  for (let i = -3; i <= 3; i++) b.box(COLORS.wood, [i * .27, 2.63, 3.1], [.12, .08, 2.4], 'hatch grating');
  b.box(COLORS.dark, [0, -.2, 12.1], [.19, 2.7, 1.2], 'rudder');
  return { masts: 3, sails: 4, oars: 0, cargo: 12, sterncastle: true };
}

function galley(root, b, p, accent) {
  rail(b, p, COLORS.gold, .61);
  sternGallery(b, { width: 3.4, y: 1.9, z: 10.6, depth: 4, accent, levels: 1 });
  // Raised ceremonial baldachin, gilded columns and a curved awning.
  for (const side of [-1, 1]) for (const z of [9, 12.2]) b.beam(COLORS.gold, [side * 1.45, 3.4, z], [side * 1.45, 5.8, z], .075, 'ceremonial canopy');
  const canopy = cached('galley-canopy', () => {
    const g = new THREE.CylinderGeometry(1, 1, 1, 12, 1, true, 0, Math.PI);
    g.rotateZ(Math.PI / 2); g.rotateY(Math.PI / 2); return g;
  });
  const roof = addMesh(root, canopy, material(accent, true), 'Selemis ceremonial canopy', 'canopy'); roof.position.set(0, 5.75, 10.6); roof.scale.set(1.85, 1.15, 4.35);
  for (const z of [-5.8, 4.3]) mast(b, p, z, z < 0 ? 18.4 : 15.8, .14);
  pennant(root, 0, 19.05, -5.8, accent, 1.1);
  lateenSail(root, b, { z: -5.8, top: 18.7, span: 14.6, height: 12.4, accent: COLORS.linen });
  lateenSail(root, b, { z: 4.3, top: 16.2, span: 11.8, height: 8.8, accent });
  b.beam(COLORS.wood, [0, 1.6, -13.7], [0, 2.55, -20.1], .22, 'galley beak');
  b.beam(COLORS.gold, [0, 2.05, -15.6], [0, 3.05, -19.4], .12, 'galley beak');
  seaGodProw(b, 2.25, -15.7, 1.08);
  for (const side of [-1, 1]) {
    b.beam(accent, [side * 3.05, 1.65, -10], [side * 3.05, 1.65, 8], .17, 'outriggers');
    for (let i = 0; i < 15; i++) {
      const z = -9.6 + i * 1.22;
      b.beam(COLORS.wood, [side * 1.7, 1.65, z], [side * 3.15, 1.65, z], .065, 'outriggers');
      b.beam(COLORS.pale, [side * 2.2, 1.62, z], [side * 6.6, .14, z + 1.45], .052, 'oars');
      b.box(COLORS.pale, [side * 6.48, .18, z + 1.4], [.92, .085, .3], 'oar blades', -side * .33);
      b.box(COLORS.wood, [side * 1.32, 1.71, z], [1.3, .15, .3], 'rowing benches');
      if (i % 2 === 0) b.ball(COLORS.gold, [side * 2.77, 1.88, z], [.09, .3, .31], 'gilt shields');
    }
  }
  b.box(COLORS.pale, [0, 1.62, -.1], [.95, .2, 20], 'raised center gangway');
  for (const side of [-1, 1]) b.beam(COLORS.wood, [side * 1.1, 2.9, 13.6], [side * 3, -.55, 17], .1, 'steering sweeps');
  return { masts: 2, sails: 2, oars: 30, cargo: 0, sterncastle: true };
}

function gondola(root, b, p, accent) {
  rail(b, p, COLORS.gold, .15);
  // Black lacquer, raised ends and the comb-like metal ferro of a canal boat.
  b.beam(COLORS.black, [0, .85, -4.65], [0, 1.65, -5.12], .095, 'raised prow');
  b.beam(COLORS.gold, [0, 1.1, -5.05], [0, 2.03, -5.22], .07, 'ferro');
  for (let i = 0; i < 5; i++) b.beam(COLORS.gold, [0, 1.26 + i * .14, -5.08 - i * .026], [0, 1.26 + i * .14, -5.45 - i * .015], .041, 'ferro teeth');
  b.beam(COLORS.black, [0, .85, 4.75], [0, 1.38, 5.03], .075, 'raised stern');
  b.box(COLORS.black, [0, .49, .2], [1.32, .15, 4.1], 'passenger well');
  for (const z of [-.85, 1.2]) {
    b.box(accent, [0, .79, z], [1.37, .21, .51], 'cushions');
    b.box(accent, [0, 1.01, z + .24], [1.37, .42, .13], 'seat backs');
  }
  for (const side of [-1, 1]) for (const z of [-1.6, 1.6]) b.beam(COLORS.gold, [side * .7, .57, z], [side * .7, 2.05, z], .035, 'canopy posts');
  const canopy = cached('gondola-canopy', () => {
    const g = new THREE.PlaneGeometry(1.75, 3.65, 8, 1); g.rotateX(-Math.PI / 2);
    const pos = g.attributes.position;
    for (let i = 0; i < pos.count; i++) pos.setY(i, .32 * Math.cos(pos.getX(i) / 1.75 * Math.PI));
    g.computeVertexNormals(); return g;
  });
  const roof = addMesh(root, canopy, material(accent, true), 'Selemis gondola canopy', 'canopy'); roof.position.y = 2.04;
  b.beam(COLORS.wood, [.76, 1.16, 2.6], [2.9, .03, 4.7], .045, 'oars');
  b.box(COLORS.pale, [2.78, .09, 4.57], [.18, .09, .83], 'oar blades', .75);
  b.beam(COLORS.gold, [.72, .62, 2.6], [.78, 1.31, 2.6], .055, 'rowlock');
  return { masts: 0, sails: 0, oars: 1, cargo: 0, sterncastle: false };
}

/** Static, crewless Selemis ships. The declared length is the hull length;
 * bowsprits, sweeps and the gondola's ferro extend beyond it. Hull and sail
 * geometries and materials are shared: do not dispose one ship in isolation. */
export function createSelamusShip({ kind = 'merchant', length = 24, accent = 0x256b72, name } = {}) {
  if (!Object.hasOwn(PROFILES, kind)) throw new RangeError(`Unknown Selemis ship kind: ${kind}`);
  if (!Number.isFinite(length) || length <= 0) throw new RangeError('Selemis ship length must be positive and finite');
  const p = PROFILES[kind], root = new THREE.Group(), b = fittings(root);
  root.name = name ?? `Selemis ${kind === 'merchant' ? 'great merchant carrack' : kind === 'galley' ? 'sea-god ceremonial galley' : 'canal gondola'}`;
  const color = new THREE.Color(accent).getHex();
  const hull = addMesh(root, hullGeometry(kind, color), HULL_MATERIAL, `Selemis ${kind} pointed planked hull`, 'hull');
  const features = ({ merchant, galley, gondola })[kind](root, b, p, color), details = b.finish();
  root.scale.setScalar(length / p.length);
  const metrics = { ...features, ...details, meshes: root.children.length, triangles: 0, plankingBands: 6, hullBeam: p.beam * root.scale.x, hullDraft: -hull.geometry.boundingBox.min.y * root.scale.x };
  for (const child of root.children) metrics.triangles += (child.geometry.index ? child.geometry.index.count : child.geometry.attributes.position.count) / 3 * (child.isInstancedMesh ? child.count : 1);
  root.userData = { kind, length, waterline: 0, bow: [0, 0, -1], metrics };
  return root;
}

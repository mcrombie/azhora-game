import * as THREE from 'three';

const point = (x, z) => Object.freeze({ x, z });
// Three working places along the rebuilt road: the Avrel clearing mill in
// Drent, the reedcutters' landing on the Luscia bank of the Caloss, and the
// roofless waystation in East Suval.
export const REGIONAL_NPC_POSITIONS = Object.freeze({
  'commons-miller': point(-236, 62), 'reed-worker': point(-380, 120), 'shelter-keeper': point(-152, 322),
});
export const REGIONAL_ACTIVITY_SITES = Object.freeze({
  'mill-hoist': Object.freeze({ id: 'mill-hoist', name: 'The grain hoist', x: -243, z: 67, region: 2 }),
  'net-float-west': Object.freeze({ id: 'net-float-west', name: 'First float line', x: -389, z: 126, region: 3 }),
  'net-float-east': Object.freeze({ id: 'net-float-east', name: 'Second float line', x: -392, z: 128, region: 3 }),
  'shelter-ledger': Object.freeze({ id: 'shelter-ledger', name: 'The shelter ledger', x: -158, z: 326, region: 4 }),
});
export const REGIONAL_PLACES = Object.freeze([
  Object.freeze({ id: 'mill-commons', name: 'The Mill Commons', x: -236, z: 62, radius: 10, region: 2,
    center: point(-240, 65), description: 'Grain sacks, a worn tally board, and a flour-dusted bench gather beneath the turning mill sails.' }),
  Object.freeze({ id: 'landing-workshop', name: 'The Landing Workshop', x: -380, z: 120, radius: 11, region: 3,
    center: point(-385, 124), description: 'A little boat rests on wooden stocks. Cork floats and drying nets hang above baskets of cut reeds.' }),
  Object.freeze({ id: 'waystation-shelter', name: 'The Waystation Shelter', x: -152, z: 322, radius: 10, region: 4,
    center: point(-156, 324), description: 'Patched canvas gives the roofless stones a purpose again: dry bedrolls, drinking water, and a book of travelers’ accounts.' }),
]);
export const REGIONAL_PATHS = Object.freeze([
  Object.freeze([point(-230, 50), point(-233, 57), point(-236, 62), point(-240, 65), point(-243, 67)]),
  Object.freeze([point(-374, 124), point(-379, 121), point(-380, 120), point(-385, 124), point(-389, 126), point(-392, 128)]),
  Object.freeze([point(-150, 318), point(-152, 322), point(-156, 324), point(-158, 326)]),
]);
const clearancePaths = [...REGIONAL_PATHS];
function segmentDistance(x, z, a, b) {
  const dx = b.x - a.x, dz = b.z - a.z;
  const t = Math.max(0, Math.min(1, ((x - a.x) * dx + (z - a.z) * dz) / (dx * dx + dz * dz || 1)));
  return Math.hypot(x - a.x - dx * t, z - a.z - dz * t);
}
/** Reserve only these workyards and their short approach paths. */
export function regionalFeatureClear(x, z, margin = 0) {
  if (!Number.isFinite(x) || !Number.isFinite(z)) return false;
  const extra = Number.isFinite(margin) ? Math.max(0, margin) : 0;
  // Broad phase: the three workyards all lie inside this band of the road.
  if (x > -140 + extra || x < -400 - extra || z < 45 - extra || z > 340 + extra) return false;
  if (REGIONAL_PLACES.some(site => Math.hypot(x - site.center.x, z - site.center.z) < site.radius + extra)) return true;
  if (Object.values(REGIONAL_NPC_POSITIONS).some(p => Math.hypot(x - p.x, z - p.z) < 2.3 + extra)) return true;
  return clearancePaths.some(path => path.some((b, i) => i && segmentDistance(x, z, path[i - 1], b) < 1.8 + extra));
}

/** Authored scenery; the regional story controller owns all activity decisions. */
export function createRegionalPlaces(scene, world) {
  const root = new THREE.Group(); root.name = 'Drent working places'; scene.add(root);
  const material = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .94, flatShading: true, side: THREE.DoubleSide });
  material.shadowSide = THREE.BackSide;
  const shapes = { box: new THREE.BoxGeometry(1, 1, 1), pole: new THREE.CylinderGeometry(.83, 1, 1, 7),
    cylinder: new THREE.CylinderGeometry(1, 1, 1, 10), sack: new THREE.IcosahedronGeometry(1, 1), stone: new THREE.IcosahedronGeometry(1, 0),
    rim: new THREE.TorusGeometry(1, .085, 4, 12) };
  const geometries = new Set(), ownedColliders = new Set(), meshes = [], transform = new THREE.Object3D();
  const p = new THREE.Vector3(), n = new THREE.Vector3(), normalMatrix = new THREE.Matrix3(), color = new THREE.Color();
  const direction = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0), h = (x, z) => world.heightAt(x, z);
  let disposed = false, elapsed = 0;
  const palette = { wood: '#806349', cut: '#b29b6c', dark: '#544f3e', rope: '#b5aa81', flour: '#e0d5b0', blue: '#648b89', slate: '#777f70', canvas: '#b7a987' };
  function collider(site, x, z, radius) {
    const c = { x, z, r: radius, kind: `regional-${site}` }; world.colliders.push(c); ownedColliders.add(c);
  }
  function builder(name) {
    const positions = [], normals = [], colors = [];
    function append(geometry, tint) {
      const pos = geometry.attributes.position, norm = geometry.attributes.normal, count = geometry.index?.count || pos.count;
      normalMatrix.getNormalMatrix(transform.matrix); color.set(tint);
      for (let i = 0; i < count; i++) {
        const index = geometry.index ? geometry.index.getX(i) : i;
        p.fromBufferAttribute(pos, index).applyMatrix4(transform.matrix); n.fromBufferAttribute(norm, index).applyMatrix3(normalMatrix).normalize();
        positions.push(p.x, p.y, p.z); normals.push(n.x, n.y, n.z); colors.push(color.r, color.g, color.b);
      }
    }
    function shape(kind, tint, x, y, z, sx, sy, sz, rotation = [0, 0, 0]) {
      transform.position.set(x, y, z); transform.rotation.set(...rotation); transform.scale.set(sx, sy, sz); transform.updateMatrix(); append(shapes[kind], tint);
    }
    function branch(a, b, radius = .065, tint = palette.wood) {
      direction.set(b[0] - a[0], b[1] - a[1], b[2] - a[2]); const length = direction.length();
      if (length < .0001) return;
      transform.position.set((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2);
      transform.quaternion.setFromUnitVectors(up, direction.normalize()); transform.scale.set(radius, length, radius); transform.updateMatrix(); append(shapes.pole, tint);
    }
    function triangle(a, b, c, tint) {
      n.crossVectors(new THREE.Vector3(...b).sub(new THREE.Vector3(...a)), new THREE.Vector3(...c).sub(new THREE.Vector3(...a))).normalize(); color.set(tint);
      for (const v of [a, b, c]) { positions.push(...v); normals.push(n.x, n.y, n.z); colors.push(color.r, color.g, color.b); }
    }
    function quad(a, b, c, d, tint) { triangle(a, b, c, tint); triangle(a, c, d, tint); }
    function cloth(points, tint, thickness = .045) {
      const center = points.reduce((sum, v) => sum.map((a, i) => a + v[i] / points.length), [0, 0, 0]);
      const below = v => [v[0], v[1] - thickness, v[2]];
      for (let i = 0; i < points.length; i++) {
        const a = points[i], b = points[(i + 1) % points.length];
        triangle(center, b, a, tint); triangle(below(center), below(a), below(b), tint);
        quad(a, b, below(b), below(a), tint);
      }
    }
    function rope(points, radius = .024, tint = palette.rope) { for (let i = 1; i < points.length; i++) branch(points[i - 1], points[i], radius, tint); }
    function finish(addMesh = true) {
      const geometry = new THREE.BufferGeometry(); geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3)); geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
      geometry.computeBoundingBox(); geometry.computeBoundingSphere(); geometries.add(geometry);
      if (!addMesh) return geometry;
      const mesh = new THREE.Mesh(geometry, material); mesh.name = name; mesh.castShadow = true; mesh.receiveShadow = true; root.add(mesh); meshes.push(mesh); return mesh;
    }
    return { shape, branch, triangle, quad, cloth, rope, finish };
  }
  function sack(b, x, z, size = .62, tint = '#b9ab82', mark = false) {
    const y = h(x, z); b.shape('sack', tint, x, y + size * .61, z, size * .61, size * .79, size * .49, [.02, x, .08]);
    b.shape('pole', palette.rope, x, y + size * 1.33, z, size * .18, size * .22, size * .18);
    if (mark) b.shape('box', '#7c7e60', x, y + size * .66, z + size * .46, size * .33, size * .29, .03);
  }
  function bench(b, x, z, width, depth, height, tint = palette.cut) {
    const y = h(x, z); b.shape('box', tint, x, y + height, z, width, .13, depth);
    for (const dx of [-1, 1]) for (const dz of [-1, 1]) b.branch([x + dx * width * .39, y, z + dz * depth * .34], [x + dx * width * .35, y + height, z + dz * depth * .3], .075);
    return y + height + .08;
  }
  function awning(b, site, x, z, width, depth, tint, windbreak = false) {
    const base = h(x, z), roof = (dx, dz) => base + 2.85 + dz * .16 + Math.sin(dx * 1.5) * .055;
    for (const dx of [-width / 2, width / 2]) for (const dz of [-depth / 2, depth / 2]) {
      const px = x + dx, pz = z + dz;
      b.branch([px, h(px, pz), pz], [px + dx * .025, roof(dx, dz) + .08, pz], .09); collider(site, px, pz, .13);
    }
    for (const dz of [-depth / 2, depth / 2]) b.branch([x - width / 2, roof(-width / 2, dz) - .07, z + dz], [x + width / 2, roof(width / 2, dz) - .07, z + dz], .08);
    const corners = [[-width / 2 - .22, -depth / 2 - .12], [width / 2 + .25, -depth / 2 - .1], [width / 2 + .2, depth / 2 + .22], [width * .2, depth / 2 + .14], [0, depth / 2 + .3], [-width / 2 - .19, depth / 2 + .12]];
    b.cloth(corners.map(([dx, dz]) => [x + dx, roof(dx, dz), z + dz]), tint);
    b.cloth([[-.75, -.9], [.3, -.85], [.38, .14], [-.78, .05]].map(([dx, dz]) => [x + dx, roof(dx, dz) + .085, z + dz]), windbreak ? '#8d8775' : '#c9b98e', .028);
    if (windbreak) {
      const wx = x - width / 2 + .04;
      b.quad([wx, base + .3, z - depth / 2], [wx, base + .3, z + depth / 2], [wx, roof(-width / 2, depth / 2) - .1, z + depth / 2], [wx, roof(-width / 2, -depth / 2) - .1, z - depth / 2], '#8c8d7a');
      // A short windbreak stays at the outer edge, not across a walking route.
      collider(site, wx, z, .75);
    }
  }

  // SUNMEADOW: warm canvas, shared grain, and a working timber hoist. Nothing
  // crosses the older wheat field's fence at Z=-283.5 or the mill's front door.
  const mill = builder('Mill Commons workyard');
  awning(mill, 'mill', -38, -273.3, 5.7, 4.2, '#c6ad76');
  const flourY = bench(mill, -38.6, -272.3, 3.0, .82, .87);
  for (let i = 0; i < 12; i++) mill.shape('stone', palette.flour, -39.75 + i * .20, flourY + .017, -272.3 + Math.sin(i * 2) * .22, .12, .018, .075);
  mill.shape('cylinder', '#998971', -37.65, flourY + .1, -272.3, .27, .16, .27);
  mill.shape('rim', '#c8b790', -37.65, flourY + .2, -272.3, .27, .27, .27, [Math.PI / 2, 0, 0]);
  mill.branch([-39.3, flourY + .10, -272.4], [-38.4, flourY + .10, -272.15], .065, '#aa8054'); collider('mill', -38.6, -272.3, 1.15);
  for (let i = 0; i < 7; i++) sack(mill, -39.5 + i % 3 * .76, -278.8 + Math.floor(i / 3) * .65, .76, i % 2 ? '#b9a781' : '#cab990', i % 2 === 0);
  collider('mill', -38.7, -278.2, 1.25);
  const tallyY = h(-33, -275.7);
  for (const dx of [-.55, .55]) mill.branch([-33 + dx, tallyY, -275.7], [-33 + dx, tallyY + 1.9, -275.7], .07);
  mill.shape('box', '#74644b', -33, tallyY + 1.55, -275.7, 1.65, .85, .14);
  for (let row = 0; row < 3; row++) for (let tick = 0; tick < 5; tick++) mill.shape('box', '#dbcda4', -33.6 + tick * .18, tallyY + 1.8 - row * .24, -275.605, .025, .15, .025, [0, 0, .13]);
  mill.shape('box', '#9b7e55', -32.50, tallyY + 1.58, -275.60, .35, .44, .027); collider('mill', -33, -275.7, .7);
  const craneY = h(-33, -281.0), craneTop = craneY + 4.45;
  for (const x of [-35.6, -29.5]) {
    mill.branch([x, h(x, -281.35), -281.35], [x + .05, craneTop, -281.35], .16);
    mill.branch([x, craneTop - 1.1, -281.35], [x + (x < -33 ? 1.0 : -1.0), craneTop, -281.35], .10); collider('mill', x, -281.35, .2);
  }
  mill.branch([-35.95, craneTop, -281.35], [-29.10, craneTop + .045, -281.35], .18, palette.cut);
  mill.shape('cylinder', '#69614c', -31.0, craneTop - .09, -281.34, .28, .14, .28, [Math.PI / 2, 0, 0]);
  mill.branch([-35.6, craneY + 1.1, -281.35], [-35.6, craneY + 1.1, -280.55], .12, palette.dark);
  mill.shape('rim', palette.cut, -35.6, craneY + 1.1, -280.50, .37, .37, .37);
  mill.rope([[-31, craneTop - .05, -281.35], [-35.4, craneTop - .18, -281.35], [-35.6, craneY + 1.1, -281.32]], .04);
  mill.finish();
  function cradleGeometry(lowered) {
    const b = builder('Grain cradle'), x = -31, z = -282.0, floor = h(x, z) + (lowered ? .25 : 2.0);
    for (let i = 0; i < 5; i++) b.shape('box', i % 2 ? palette.cut : '#9c8057', x - .65 + i * .325, floor, z, .29, .13, 1.25);
    for (const dx of [-.62, .62]) {
      b.branch([x + dx, floor, z - .52], [x + dx, floor + .53, z - .52], .055);
      b.branch([x + dx, floor, z + .52], [x + dx, floor + .53, z + .52], .055);
      b.branch([x + dx, floor + .53, z - .52], [x + dx, floor + .53, z + .52], .052);
      b.rope([[x + dx, floor + .12, z - .47], [x, floor + 1.22, z], [x + dx, floor + .12, z + .47]], .032);
    }
    b.branch([x, floor + 1.22, z], [x, craneTop - .05, -281.35], .037, palette.rope);
    for (const dx of [-.35, .35]) b.shape('sack', '#c1ad7f', x + dx, floor + .43, z, .33, .48, .41);
    return b.finish(false);
  }
  const cradle = millStateMesh('Mill grain cradle', cradleGeometry(false), cradleGeometry(true));
  collider('mill', -31, -282, .83);

  // REEDWATER: the boat is deliberately on trestles, well above the ground;
  // these are dry repair yards behind the old reedcutters' shelter.
  const workshop = builder('Landing Workshop boatyard and net frames');
  for (const [x, z] of [[-30, -451.4], [-35, -451.4]]) {
    const y = h(x, z);
    for (const dx of [-1.75, 1.75]) { workshop.branch([x + dx, h(x + dx, z), z], [x + dx, y + 2.6, z], .09); collider('net-frame', x + dx, z, .13); }
    workshop.branch([x - 1.92, y + 2.48, z], [x + 1.92, y + 2.48, z], .09, palette.cut);
  }
  const bx = -35.1, bz = -456.3, by = h(bx, bz), hull = [];
  for (let i = 0; i < 9; i++) { const t = i / 8, x = bx - 3.6 + t * 7.2, width = Math.sin(t * Math.PI) * 1.12 + .055; hull.push({ x, width, rise: Math.pow(Math.abs(t - .5) * 2, 2) * .38 }); }
  for (let i = 1; i < hull.length; i++) {
    const a = hull[i - 1], b = hull[i];
    for (const side of [-1, 1]) {
      workshop.quad([a.x, by + .66 + a.rise, bz], [b.x, by + .66 + b.rise, bz], [b.x, by + 1.42 + b.rise, bz + b.width * side], [a.x, by + 1.42 + a.rise, bz + a.width * side], i % 3 ? '#688782' : '#9a9275');
      workshop.quad([a.x, by + .77 + a.rise, bz], [b.x, by + .77 + b.rise, bz], [b.x, by + 1.38 + b.rise, bz + (b.width - .075) * side], [a.x, by + 1.38 + a.rise, bz + (a.width - .075) * side], '#9c8d68');
      workshop.branch([a.x, by + 1.45 + a.rise, bz + a.width * side], [b.x, by + 1.45 + b.rise, bz + b.width * side], .055, palette.cut);
    }
  }
  for (let i = 2; i < hull.length - 2; i++) {
    const rib = hull[i]; workshop.rope([[rib.x, by + 1.40 + rib.rise, bz - rib.width + .08], [rib.x, by + .81 + rib.rise, bz], [rib.x, by + 1.40 + rib.rise, bz + rib.width - .08]], .043, palette.dark);
    if (i % 2 === 0) workshop.shape('box', palette.cut, rib.x, by + 1.28, bz, .35, .09, rib.width * 1.65);
  }
  for (const x of [bx - 2, bx + 2]) {
    workshop.branch([x, by + .54, bz - 1.35], [x, by + .54, bz + 1.35], .11);
    for (const side of [-1, 1]) workshop.branch([x - .24, h(x, bz + side), bz + side * 1.23], [x, by + .7, bz + side * .9], .09);
  }
  collider('boat-stock', bx, bz, 2.05);
  const patchY = bench(workshop, -26.3, -455.3, 2.45, .85, .92);
  workshop.cloth([[-27.2, patchY + .015, -455.68], [-25.5, patchY + .035, -455.59], [-25.65, patchY + .02, -454.96], [-26.95, patchY + .035, -454.94]], '#b1b79d', .022);
  workshop.branch([-26.0, patchY + .11, -455.3], [-25.6, patchY + .11, -455.2], .035, '#555f54'); collider('reed-bench', -26.3, -455.3, .95);
  for (let bundle = 0; bundle < 3; bundle++) for (let reed = 0; reed < 6; reed++) {
    const x = -39.8 + bundle * .4 + Math.sin(reed) * .08, z = -451.8 + Math.cos(reed) * .11, y = h(x, z);
    workshop.branch([x, y + .06, z], [x + .30, y + 1.7 + reed % 2 * .21, z + .13], .035, '#aaa078');
  }
  collider('reed-bundles', -39.4, -451.8, .62);
  for (const [x, z, scale] of [[-38.4, -453.8, .7], [-27.0, -452.8, .56]]) {
    const y = h(x, z); workshop.shape('cylinder', '#7c7355', x, y + scale * .55, z, scale * .56, scale, scale * .56);
    workshop.shape('rim', '#baa880', x, y + scale * 1.08, z, scale * .59, scale * .59, scale * .59, [Math.PI / 2, 0, 0]);
    for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4; workshop.branch([x + Math.sin(a) * scale * .56, y + .1, z + Math.cos(a) * scale * .56], [x + Math.sin(a) * scale * .56, y + scale, z + Math.cos(a) * scale * .56], .023, '#b09b70'); }
  }
  workshop.finish();
  function netGeometry(x, freed) {
    const b = builder('Hanging float line'), z = -451.33, y = h(x, z);
    for (let row = 0; row < 5; row++) {
      const points = [];
      for (let column = 0; column < 9; column++) { const dx = -1.55 + column * .3875; points.push([x + dx, y + 2.30 - row * .31 - Math.sin(column / 8 * Math.PI) * .13, z + (row % 2) * .045]); }
      b.rope(points, .011, '#8d9475');
    }
    for (let column = 0; column < 9; column++) b.branch([x - 1.55 + column * .3875, y + 2.30, z], [x - 1.55 + column * .3875, y + 1.0, z], .011, '#8d9475');
    const line = [];
    for (let i = 0; i <= 24; i++) {
      const t = i / 24;
      line.push(freed ? [x - 1.55 + t * 3.10, y + 1.04 - Math.sin(t * Math.PI) * .10, z + .08]
        : [x - 1.55 + t * 3.1 + Math.sin(t * Math.PI * 6) * .22, y + 1.12 - Math.sin(t * Math.PI) * .56 + Math.sin(t * Math.PI * 8) * .22, z + .13 + Math.sin(t * Math.PI * 6) * .16]);
    }
    b.rope(line, .027, '#c3b78c');
    for (let i = 2; i <= 22; i += 4) { const v = line[i]; b.shape('sack', i % 8 === 2 ? '#c5b58b' : '#8b9e8b', v[0], v[1], v[2], .115, .135, .095); }
    return b.finish(false);
  }
  const netWest = millStateMesh('First net float line', netGeometry(-30, false), netGeometry(-30, true));
  const netEast = millStateMesh('Second net float line', netGeometry(-35, false), netGeometry(-35, true));

  // THREEFOLD: a small canvas refuge nests beside, rather than inside, the
  // old arch. Its ledger faces the open approach; beds sit at the sheltered rear.
  const shelter = builder('Waystation canvas shelter');
  awning(shelter, 'shelter', -34.0, -580.8, 6.1, 7.3, '#b2a58c', true);
  for (const [x, z, yaw, tint] of [[-36.0, -580.0, .14, '#827f68'], [-34.7, -581.1, -.11, '#a38e78'], [-32.8, -582.0, .16, '#84918b']]) {
    const y = h(x, z) + .15, c = Math.cos(yaw), s = Math.sin(yaw), v = (dx, dz) => [x + dx * c + dz * s, y, z + dz * c - dx * s];
    shelter.cloth([v(-.55, -1.0), v(.55, -.98), v(.58, 1.02), v(.15, .98), v(-.16, 1.06), v(-.55, 1)], tint, .1);
    shelter.branch([x - .4, y + .16, z - .68], [x + .4, y + .16, z - .68], .16, tint);
  }
  const ledgerY = bench(shelter, -32, -578, 1.65, .9, 1.0);
  collider('ledger-table', -32, -578, .67);
  for (const x of [-37.5, -31.5]) { const y = h(x, -584.65); shelter.branch([x, y, -584.65], [x, y + 2.65, -584.65], .073); collider('clothesline', x, -584.65, .12); }
  const lineY = h(-34.5, -584.65) + 2.6;
  shelter.rope([[-37.5, lineY, -584.65], [-34.5, lineY - .27, -584.65], [-31.5, lineY, -584.65]], .023);
  for (const [x, tint, length] of [[-36.3, '#c1b79a', 1.05], [-34.8, '#8b9d93', .9], [-33.1, '#b5a59a', 1.22]]) {
    const top = lineY - .2;
    shelter.quad([x - .44, top, -584.63], [x + .44, top, -584.63], [x + .49, top - length, -584.56], [x - .39, top - length + .06, -584.58], tint);
    for (const dx of [-.34, .34]) shelter.shape('box', palette.cut, x + dx, top + .02, -584.61, .04, .14, .05);
  }
  const waterX = -25.5, waterZ = -571.5, waterY = h(waterX, waterZ);
  shelter.shape('sack', '#9b8064', waterX, waterY + .6, waterZ, .48, .65, .45);
  shelter.shape('cylinder', '#645e49', waterX, waterY + 1.1, waterZ, .20, .07, .20);
  shelter.shape('rim', '#b29670', waterX, waterY + 1.14, waterZ, .25, .25, .25, [Math.PI / 2, 0, 0]);
  shelter.branch([waterX + .4, waterY + .85, waterZ], [waterX + .67, waterY + .85, waterZ + .1], .065, palette.cut); collider('water-crock', waterX, waterZ, .48);
  shelter.finish();
  function ledgerGeometry(recorded) {
    const b = builder('Shelter travelers ledger'), x = -32, z = -578, y = ledgerY;
    b.shape('box', '#75664f', x, y + .07, z, recorded ? .62 : 1.15, .12, .64);
    if (recorded) {
      b.shape('box', '#a39778', x, y + .145, z, .52, .035, .59);
      b.shape('box', '#cbc19e', x + .56, y + .06, z + .01, .38, .07, .47, [0, -.13, 0]);
      b.shape('box', '#807b64', x + .56, y + .105, z + .01, .04, .035, .49, [0, -.13, 0]);
    } else {
      for (const side of [-1, 1]) {
        b.shape('box', '#dbcfaa', x + side * .29, y + .15, z, .53, .04, .60, [0, 0, side * .10]);
        for (let row = 0; row < 5; row++) b.shape('box', '#8e9075', x + side * .29, y + .176, z - .2 + row * .09, .36 - row % 2 * .08, .009, .012, [0, 0, side * .10]);
      }
    }
    b.shape('cylinder', '#616551', x - .66, y + .08, z - .12, .08, .15, .08);
    b.branch([x - .64, y + .13, z - .05], [x - .35, y + .25, z + .28], .014, '#bfa779');
    return b.finish(false);
  }
  const ledger = millStateMesh('Shelter ledger and tied account', ledgerGeometry(false), ledgerGeometry(true));
  function millStateMesh(name, before, after) {
    const mesh = new THREE.Mesh(before, material); mesh.name = name; mesh.castShadow = true; mesh.receiveShadow = true;
    root.add(mesh); meshes.push(mesh); return { mesh, before, after };
  }
  let state = { millLowered: false, netWestFreed: false, netEastFreed: false, testimonyRecorded: false };
  function setState(next = {}) {
    if (disposed) return { ...state };
    for (const key of Object.keys(state)) if (typeof next[key] === 'boolean') state[key] = next[key];
    for (const [key, visual] of [['millLowered', cradle], ['netWestFreed', netWest], ['netEastFreed', netEast], ['testimonyRecorded', ledger]]) visual.mesh.geometry = state[key] ? visual.after : visual.before;
    return { ...state };
  }
  function update(dt, observer, playing = true) {
    if (disposed || !playing || !Number.isFinite(dt) || dt <= 0) return;
    elapsed += Math.min(dt, .1);
    const position = observer?.position || observer;
    if (position && Number.isFinite(position.x) && Number.isFinite(position.z) && Math.hypot(position.x + 32, position.z + 450) > 80) return;
    // Millimetres of net movement suggest air without adding render batches.
    netWest.mesh.position.z = Math.sin(elapsed * 1.1) * .018;
    netEast.mesh.position.z = Math.sin(elapsed * .9 + .7) * .015;
  }
  function metrics() { return { meshes: meshes.length, staticMeshes: 3, triangles: meshes.reduce((sum, mesh) => sum + mesh.geometry.attributes.position.count / 3, 0), colliders: ownedColliders.size, geometries: geometries.size }; }
  function dispose() {
    if (disposed) return; disposed = true;
    for (let i = world.colliders.length - 1; i >= 0; i--) if (ownedColliders.has(world.colliders[i])) world.colliders.splice(i, 1);
    for (const geometry of geometries) geometry.dispose(); material.dispose(); root.removeFromParent();
  }
  for (const shape of Object.values(shapes)) shape.dispose();
  return { root, metrics, setState, state: () => ({ ...state }), update, dispose,
    visuals: { cradle: cradle.mesh, netWest: netWest.mesh, netEast: netEast.mesh, ledger: ledger.mesh } };
}

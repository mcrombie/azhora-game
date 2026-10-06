import * as THREE from 'three';

// Authored local places, not additional countries on the World Builder atlas.
// x/z are inspection positions. Props sit to the sides, leaving those positions
// and the little connecting trails wide enough to visit without jumping.
const place = (id, name, x, z, description, trail) => Object.freeze({
  id, name, x, z, radius: 5.4, description,
  trail: Object.freeze(trail.map(([px, pz]) => Object.freeze({ x: px, z: pz }))),
});
export const forestPlaceDefinitions = Object.freeze([
  place('charcoal-hearth', 'Old Charcoal Hearth', -28, -48,
    'A cold charcoal mound, a stack of cut timber, and the tools of somebody who meant to return.',
    [[-1, -46], [-11, -45], [-20, -47], [-28, -48]]),
  place('bee-fold', 'The Bee Fold', 42, -35,
    'Woven skeps stand in a sunny fold of the trees. Flowers grow thick beyond the low fence.',
    [[15, -45.4], [25, -44], [33, -39], [37, -33], [42, -35]]),
  place('fallen-oak', 'Stormfall Oak', 43, -97,
    'An enormous fallen oak is becoming another small woodland: moss, roots, and shelter for little lives.',
    [[17, -79], [17, -86], [26, -93], [36, -96], [43, -97]]),
  place('moss-shrine', 'Mosskeeper\u2019s Shrine', -37, -87,
    'Old stone shelters a plain wooden wayboard. Generations of travelers have kept this small place standing.',
    [[-11, -86], [-20, -83.5], [-29, -85], [-37, -87]]),
  place('fern-hollow', 'Fern Hollow', -29, -127,
    'Tall ferns cup a sheltered hollow around a hollow log. Here the forest feels close and quiet.',
    [[-5, -108], [-14, -115], [-22, -121], [-29, -127]]),
  place('coast-lookout', 'Saltwind Lookout', -49, 18,
    'A weathered bench and old net frame overlook the sheltered bay through a break in the trees.',
    [[-21, 13], [-29, 10], [-38, 11], [-44, 15], [-49, 18]]),
]);

export const forestWoodcutter = Object.freeze({ x: -13, z: -37 });
export const forestWoodcutterTrail = Object.freeze([
  Object.freeze({ x: 0, z: -40 }), Object.freeze({ x: -6, z: -40 }), forestWoodcutter,
]);
export const forestPlacePaths = Object.freeze([
  ...forestPlaceDefinitions.map(site => site.trail), forestWoodcutterTrail,
]);

function segmentDistance(x, z, a, b) {
  const dx = b.x - a.x, dz = b.z - a.z, length = dx * dx + dz * dz;
  const t = length ? Math.max(0, Math.min(1, ((x - a.x) * dx + (z - a.z) * dz) / length)) : 0;
  return Math.hypot(x - a.x - dx * t, z - a.z - dz * t);
}

/** Reserve first, then hide intersecting original scatter without rerolling it. */
export function forestFeatureClear(x, z, tree = false, canopyRadius = 0) {
  if (z < -145 || z > 33 || x < -64 || x > 59) return false;
  // Nearby low foliage can otherwise cover a shoulder camera even though its
  // trunk stands outside the clearing. Actual tree height supplies this margin;
  // rocks and low cover continue to use the small, walkable clearing footprint.
  if (forestPlaceDefinitions.some(site => Math.hypot(x - site.x, z - site.z) < (tree ? site.radius + 1.7 + canopyRadius : site.radius - 1.25))) return true;
  if (Math.hypot(x - forestWoodcutter.x, z - forestWoodcutter.z) < (tree ? 3.0 : 1.8)) return true;
  return forestPlacePaths.some(path => path.some((b, i) => i && segmentDistance(x, z, path[i - 1], b) < (tree ? 3.0 : 1.25)));
}

const groundTints = forestPlaceDefinitions.map(site => ({ ...site,
  color: new THREE.Color(({ 'charcoal-hearth': '#969366', 'bee-fold': '#a7a770', 'fallen-oak': '#7e8d56',
    'moss-shrine': '#8b956e', 'fern-hollow': '#6e8958', 'coast-lookout': '#b1b47f' })[site.id]), strength: site.id === 'fern-hollow' ? .64 : .48,
}));
const charcoalTint = new THREE.Color('#626a46');
/** Paint the existing terrain; no coplanar ground decals or circular carpets. */
export function tintForestGround(color, x, z) {
  if (z < -140 || z > 27 || x < -60 || x > 54) return;
  for (const site of groundTints) {
    const dx = x - site.x, dz = z - site.z, angle = Math.atan2(dz, dx);
    const radius = 5.2 + Math.sin(angle * 3 + site.x) * .72 + Math.cos(angle * 5 + site.z) * .38;
    const edge = Math.max(0, 1 - Math.hypot(dx, dz * 1.12) / radius);
    if (edge > 0) color.lerp(site.color, Math.min(1, edge * 1.8) * site.strength);
  }
  const ash = Math.max(0, 1 - Math.hypot(x + 29.9, z + 50.5) / 2.5);
  if (ash > 0) color.lerp(charcoalTint, ash * .88);
}

// One vertex-colored static mesh per place gives each clearing its own culling
// bounds while sharing one material. There is no runtime scenery animation.
export function createForestPlaces(scene, world) {
  const root = new THREE.Group(); root.name = 'Tidehaven woods places'; scene.add(root);
  const material = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .98, flatShading: true, side: THREE.DoubleSide });
  const shapes = {
    box: new THREE.BoxGeometry(1, 1, 1),
    log: new THREE.CylinderGeometry(1, 1, 1, 9),
    taper: new THREE.CylinderGeometry(.72, 1, 1, 9),
    rock: new THREE.IcosahedronGeometry(1, 0),
    dome: new THREE.SphereGeometry(1, 10, 5, 0, Math.PI * 2, 0, Math.PI / 2),
    cone: new THREE.ConeGeometry(1, 1, 9),
  };
  const transform = new THREE.Object3D(), point = new THREE.Vector3(), normal = new THREE.Vector3(), normalMatrix = new THREE.Matrix3();
  const up = new THREE.Vector3(0, 1, 0), axis = new THREE.Vector3(), tint = new THREE.Color();
  const metrics = { sites: 6, meshes: 0, triangles: 0, colliders: 0, paths: forestPlacePaths.length };
  const y = (x, z) => world.heightAt(x, z);
  const palette = { bark: '#65513b', cut: '#b49a6b', wood: '#8d714e', charcoal: '#383f37', stone: '#809083',
    lightStone: '#a1aa90', moss: '#708653', fern: '#728f53', straw: '#bba166', rope: '#c1af80', cream: '#d8c998' };
  function builder(name) {
    const positions = [], normals = [], colors = [];
    const append = (geometry, color) => {
      const p = geometry.attributes.position, n = geometry.attributes.normal;
      const count = geometry.index?.count || p.count;
      normalMatrix.getNormalMatrix(transform.matrix); tint.set(color);
      for (let i = 0; i < count; i++) {
        const index = geometry.index ? geometry.index.getX(i) : i;
        point.fromBufferAttribute(p, index).applyMatrix4(transform.matrix);
        normal.fromBufferAttribute(n, index).applyMatrix3(normalMatrix).normalize();
        positions.push(point.x, point.y, point.z); normals.push(normal.x, normal.y, normal.z); colors.push(tint.r, tint.g, tint.b);
      }
    };
    function shape(kind, color, x, h, z, sx, sy, sz, rotation = [0, 0, 0]) {
      transform.position.set(x, h, z); transform.rotation.set(...rotation); transform.scale.set(sx, sy, sz); transform.updateMatrix();
      append(shapes[kind], color);
    }
    function beam(color, a, b, radius, endRadius = radius) {
      transform.position.set((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2);
      axis.set(b[0] - a[0], b[1] - a[1], b[2] - a[2]); const length = axis.length();
      transform.quaternion.setFromUnitVectors(up, axis.normalize()); transform.scale.set(radius, length, endRadius); transform.updateMatrix();
      append(shapes.log, color);
    }
    function triangle(a, b, c, color) {
      const ab = new THREE.Vector3().subVectors(new THREE.Vector3(...b), new THREE.Vector3(...a));
      const ac = new THREE.Vector3().subVectors(new THREE.Vector3(...c), new THREE.Vector3(...a));
      normal.crossVectors(ab, ac).normalize(); tint.set(color);
      for (const p of [a, b, c]) { positions.push(...p); normals.push(normal.x, normal.y, normal.z); colors.push(tint.r, tint.g, tint.b); }
    }
    function fern(x, z, scale = 1, rotation = 0) {
      const floor = y(x, z) + .03;
      for (let f = 0; f < 8; f++) {
        const angle = rotation + f * 2.399, dx = Math.sin(angle), dz = Math.cos(angle), sideX = Math.cos(angle), sideZ = -Math.sin(angle);
        const reach = scale * (.65 + f % 3 * .16), height = scale * (.52 + f % 2 * .26);
        let previous = [x, floor, z];
        for (let j = 1; j <= 5; j++) {
          const t = j / 5, along = reach * t, h = floor + Math.sin(t * Math.PI * .78) * height;
          const center = [x + dx * along, h, z + dz * along];
          beam('#83915d', previous, center, .012 * scale);
          for (const side of [-1, 1]) {
            const span = Math.sin(t * Math.PI) * .23 * scale + .02;
            const tip = [center[0] + sideX * span * side + dx * scale * .09, h + scale * .04, center[2] + sideZ * span * side + dz * scale * .09];
            triangle([center[0] - dx * .09 * scale, h - .035 * scale, center[2] - dz * .09 * scale], tip,
              [center[0] + dx * .07 * scale, h + .015 * scale, center[2] + dz * .07 * scale], f % 2 ? '#718d50' : '#839959');
          }
          previous = center;
        }
      }
    }
    function finish(parent = root) {
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
      geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
      geometry.computeBoundingSphere(); geometry.computeBoundingBox();
      const mesh = new THREE.Mesh(geometry, material); mesh.name = name; mesh.castShadow = true; mesh.receiveShadow = true; parent.add(mesh);
      metrics.meshes++; metrics.triangles += positions.length / 9;
      return mesh;
    }
    return { shape, beam, triangle, fern, finish };
  }
  function block(x, z, radius, site) {
    world.colliders.push({ x, z, r: radius, kind: 'forest-place', site }); metrics.colliders++;
  }
  function log(b, a, c, radius, cut = true) {
    b.beam(palette.bark, a, c, radius);
    if (cut) {
      const direction = new THREE.Vector3(c[0] - a[0], c[1] - a[1], c[2] - a[2]).normalize();
      for (const end of [a, c]) b.beam(palette.cut,
        [end[0] - direction.x * .018, end[1] - direction.y * .018, end[2] - direction.z * .018],
        [end[0] + direction.x * .018, end[1] + direction.y * .018, end[2] + direction.z * .018], radius * .83);
    }
  }

  for (const site of forestPlaceDefinitions) {
    const b = builder(site.name), { x, z } = site;
    if (site.id === 'charcoal-hearth') {
      const cx = x - 1.9, cz = z - 2.5, floor = y(cx, cz);
      b.shape('dome', '#555c42', cx, floor + .04, cz, 1.7, .9, 1.65);
      for (let i = 0; i < 13; i++) {
        const angle = i * Math.PI * 2 / 13, px = cx + Math.sin(angle) * 1.68, pz = cz + Math.cos(angle) * 1.65;
        b.shape('rock', i % 3 ? palette.charcoal : palette.stone, px, y(px, pz) + .18, pz, .36, .23, .25, [0, angle, 0]);
      }
      for (let i = 0; i < 6; i++) b.shape('rock', palette.charcoal, cx + Math.sin(i * 2.4) * .7, floor + .78, cz + Math.cos(i * 2.4) * .6, .16, .11, .25);
      block(cx, cz, 1.72, site.id);
      for (let row = 0; row < 2; row++) for (let i = 0; i < 3 - row; i++) {
        const px = x + 2.1 + i * .42 + row * .2, pz = z - 2.65, h = y(px, pz) + .21 + row * .36;
        log(b, [px, h, pz - 1.2], [px, h, pz + 1.2], .215);
      }
      block(x + 2.55, z - 2.65, .9, site.id);
      // A modest lean-to keeps the billets dry; its front is open to the path.
      const roofLeft = x + 1.0, roofRight = x + 4.1, roofBack = z - 4.3, roofFront = z - 1.5;
      const roofY = y(x + 2.55, z - 2.65) + 2.05;
      for (const px of [roofLeft, roofRight]) for (const pz of [roofBack, roofFront]) {
        const top = roofY + (pz === roofBack ? .38 : 0), base = y(px, pz);
        b.beam(palette.bark, [px, base, pz], [px, top, pz], .085);
        block(px, pz, .12, site.id);
      }
      b.triangle([roofLeft - .14, roofY, roofFront + .18], [roofRight + .14, roofY, roofFront + .18], [roofLeft - .14, roofY + .4, roofBack - .12], '#897953');
      b.triangle([roofRight + .14, roofY, roofFront + .18], [roofRight + .14, roofY + .4, roofBack - .12], [roofLeft - .14, roofY + .4, roofBack - .12], '#96835c');
      for (let i = 0; i < 6; i++) b.beam(palette.wood,
        [roofLeft + i * .62, roofY + .015, roofFront + .18], [roofLeft + i * .62, roofY + .415, roofBack - .12], .03);
      // A rake leans against the stack, with a recognisable comb of teeth.
      b.beam(palette.wood, [x + 1.2, y(x + 1.2, z - 1.7), z - 1.7], [x + 1.7, y(x + 1.2, z - 1.7) + 1.9, z - 2.6], .05);
      b.shape('box', palette.bark, x + 1.2, y(x + 1.2, z - 1.7) + .1, z - 1.7, .7, .1, .14);
      for (let i = 0; i < 5; i++) b.shape('box', palette.bark, x + .92 + i * .14, y(x + 1.2, z - 1.7) + .08, z - 1.58, .05, .13, .27);
    } else if (site.id === 'bee-fold') {
      for (let i = 0; i < 3; i++) {
        const hx = x - 2.1 + i * 2.05, hz = z - 2.7 + (i % 2) * .28, floor = y(hx, hz);
        for (const side of [-1, 1]) b.shape('box', palette.wood, hx + side * .39, floor + .31, hz, .13, .62, .7);
        b.shape('box', palette.bark, hx, floor + .59, hz, 1.12, .12, .95);
        b.shape('dome', palette.straw, hx, floor + .63, hz, .48, .75, .48);
        for (let band = 0; band < 6; band++) {
          const level = band * .105, radius = .48 * Math.sqrt(1 - (level / .75) ** 2);
          b.shape('log', band % 2 ? '#a48b56' : '#c0a771', hx, floor + .655 + level, hz, radius, .046, radius);
        }
        b.shape('box', '#493f2c', hx, floor + .68, hz + .474, .17, .115, .025);
        block(hx, hz, .65, site.id);
      }
      for (let i = 0; i < 7; i++) {
        const px = x - 3.4 + i * 1.12, pz = z - 4.15, floor = y(px, pz);
        b.shape('log', palette.wood, px, floor + .61, pz, .065, 1.22, .065, [0, 0, Math.sin(i) * .08]);
        if (i) for (let row = 0; row < 3; row++) b.beam(row % 2 ? palette.bark : palette.wood,
          [px - 1.12, y(px - 1.12, pz) + .25 + row * .27, pz], [px, floor + .25 + row * .27, pz], .04);
      }
      b.shape('taper', palette.straw, x + 2.8, y(x + 2.8, z + .4) + .24, z + .4, .36, .48, .36);
      b.shape('box', palette.cream, x + 2.8, y(x + 2.8, z + .4) + .49, z + .4, .56, .035, .52, [0, .3, .08]);
      const stoolX = x + 2.6, stoolZ = z + 2.0, stoolY = y(stoolX, stoolZ);
      b.shape('log', palette.wood, stoolX, stoolY + .54, stoolZ, .38, .12, .38);
      for (let i = 0; i < 3; i++) {
        const angle = i * Math.PI * 2 / 3;
        b.beam(palette.bark, [stoolX + Math.sin(angle) * .29, stoolY, stoolZ + Math.cos(angle) * .29],
          [stoolX + Math.sin(angle) * .20, stoolY + .5, stoolZ + Math.cos(angle) * .20], .055);
      }
      block(stoolX, stoolZ, .39, site.id);
    } else if (site.id === 'fallen-oak') {
      const ax = x - 5, az = z - 4, bx = x + 4.0, bz = z - 3.4;
      const ah = y(ax, az) + .85, bh = y(bx, bz) + .8;
      log(b, [ax, ah, az], [bx, bh, bz], .88);
      for (let i = 0; i < 8; i++) {
        const t = i / 7, px = ax + (bx - ax) * t, pz = az + (bz - az) * t;
        block(px, pz, .88, site.id);
        if (i % 2 === 0) b.shape('rock', palette.moss, px, ah + (bh - ah) * t + .64, pz - .08, .8, .25, .59, [0, t, 0]);
      }
      b.shape('rock', '#675c42', ax - .25, ah + .68, az, .45, 1.8, 1.65, [.1, -.1, -.12]);
      for (let i = 0; i < 10; i++) {
        const angle = i * Math.PI * 2 / 10, start = [ax - .38, ah + .6, az];
        const end = [ax - .7 - i % 3 * .22, ah + .6 + Math.sin(angle) * (1.4 + i % 2 * .4), az + Math.cos(angle) * 1.7];
        b.beam(palette.bark, start, end, .10 + (i % 3) * .035);
      }
      log(b, [x + 2.0, y(x + 2, z - 4) + 1.03, z - 4], [x + 3.5, y(x + 3.5, z - 6) + .27, z - 6], .19, false);
      for (let i = 0; i < 5; i++) {
        const px = x + 1 + i * .24, pz = z - 2.78, floor = y(px, pz) + .24;
        b.shape('log', '#c7bba1', px, floor + .14, pz, .035, .28, .035);
        b.shape('dome', '#a68d67', px, floor + .27, pz, .16, .095, .13);
      }
      b.fern(x - 3, z + 2.2, .95, .7); b.fern(x + 3.4, z + 1.5, 1.1, -.3);
    } else if (site.id === 'moss-shrine') {
      const sx = x - .7, sz = z - 3, floor = y(sx, sz);
      b.shape('box', palette.stone, sx, floor + .18, sz, 2.7, .36, 1.65);
      for (const side of [-1, 1]) for (let row = 0; row < 3; row++)
        b.shape('box', row === 2 ? palette.lightStone : palette.stone, sx + side * .87, floor + .59 + row * .58, sz, .49, .55, .65, [0, side * .02, side * .016]);
      b.shape('box', palette.lightStone, sx, floor + 2.22, sz, 2.33, .43, .9, [0, 0, -.025]);
      b.shape('rock', palette.moss, sx - .6, floor + 2.49, sz, .97, .15, .52);
      // A simple leaf cut in stone; no invented heraldry or named deity.
      b.shape('rock', '#bec6a6', sx, floor + 1.23, sz + .02, .38, .58, .17);
      b.beam('#758966', [sx - .15, floor + .95, sz + .19], [sx + .13, floor + 1.53, sz + .19], .023);
      b.shape('dome', '#ad9776', sx + .58, floor + .4, sz + .44, .24, .1, .24);
      b.shape('rock', '#d3b779', sx + .58, floor + .49, sz + .43, .07, .055, .07);
      block(sx, sz, 1.36, site.id);
      b.fern(x - 3.1, z - 1.2, 1.2, .4);
      for (let i = 0; i < 4; i++) b.shape('rock', palette.moss, x - 2 + i * .57, y(x - 2 + i * .57, z + 2.4) + .15, z + 2.4, .34, .19, .26);
    } else if (site.id === 'fern-hollow') {
      for (const [dx, dz, scale] of [[-3.2, -.8, 1.75], [-2.3, -3, 1.55], [2.9, -2.1, 1.8], [3.1, 1.4, 1.45], [-2.2, 2.5, 1.3]]) b.fern(x + dx, z + dz, scale, dx);
      const lx = x + .3, lz = z - 3, h = y(lx, lz) + .55;
      log(b, [lx - 1.5, h, lz], [lx + 1.6, h + .1, lz + .2], .56, false);
      // Dark end inset makes this a hollow shelter instead of another cut log.
      b.beam('#363f2b', [lx - 1.535, h, lz], [lx - 1.55, h, lz], .41);
      for (let i = 0; i < 3; i++) block(lx - 1 + i, lz + .1, .58, site.id);
      for (let i = 0; i < 5; i++) b.shape('rock', i % 2 ? palette.stone : palette.moss, x - 3.8 + i * 1.7, y(x - 3.8 + i * 1.7, z - 4.1) + .24, z - 4.1, .68, .35, .5);
      b.shape('rock', palette.lightStone, x + .25, y(x + .25, z + 2.65) + .28, z + 2.65, 1.12, .36, .69, [0, -.18, 0]);
      block(x + .25, z + 2.65, .75, site.id);
    } else {
      const bx = x, bz = z - 2.8, floor = y(bx, bz);
      for (const side of [-1, 1]) {
        b.shape('box', palette.bark, bx + side * 1.1, floor + .42, bz, .16, .84, .6);
        b.shape('box', palette.wood, bx + side * 1.1, floor + .93, bz - .31, .13, 1.64, .13, [-.06, 0, 0]);
      }
      for (let i = 0; i < 3; i++) b.shape('box', palette.wood, bx, floor + .84, bz - .23 + i * .2, 2.85, .12, .18);
      for (let i = 0; i < 2; i++) b.shape('box', palette.bark, bx, floor + 1.17 + i * .22, bz - .37, 2.9, .16, .11);
      block(bx, bz, 1.18, site.id);
      // The frame is off to the side, leaving a completely open view of the bay.
      const fx = x - 3.2, fz = z + .6, fh = y(fx, fz);
      for (const side of [-1, 1]) b.shape('log', palette.wood, fx + side * .95, fh + 1.07, fz, .07, 2.14, .07, [0, 0, side * .035]);
      b.beam(palette.bark, [fx - 1.05, fh + 2, fz], [fx + 1.05, fh + 2, fz], .055);
      for (let i = 0; i < 8; i++) {
        const offset = -.86 + i * .245;
        b.beam('#9d9c79', [fx + offset, fh + .7, fz], [fx + offset, fh + 1.96, fz], .011);
        b.beam('#9d9c79', [fx - .89, fh + .72 + i * .17, fz], [fx + .89, fh + .72 + i * .17, fz], .011);
      }
      block(fx - .95, fz, .12, site.id); block(fx + .95, fz, .12, site.id);
      for (let i = 0; i < 4; i++) b.shape('rock', palette.lightStone, x + 3.8, y(x + 3.8, z + .4) + .18 + i * .29, z + .4, .53 - i * .085, .19, .4 - i * .055);
    }
    b.finish();
  }

  const bundleBuilder = builder('Lost woodland work bundle'), bundleX = -25.7, bundleZ = -48.3, bundleY = y(bundleX, bundleZ);
  bundleBuilder.shape('box', '#967747', bundleX, bundleY + .22, bundleZ, .72, .41, .5, [0, -.22, .05]);
  bundleBuilder.shape('box', '#a15f49', bundleX, bundleY + .445, bundleZ, .075, .035, .56, [0, -.22, 0]);
  bundleBuilder.shape('box', '#a15f49', bundleX, bundleY + .449, bundleZ, .8, .038, .06, [0, -.22, 0]);
  bundleBuilder.shape('box', palette.cream, bundleX - .17, bundleY + .29, bundleZ + .26, .17, .025, .025);
  bundleBuilder.shape('box', palette.cream, bundleX - .17, bundleY + .235, bundleZ + .26, .025, .135, .025);
  const bundle = bundleBuilder.finish();
  const peg = new THREE.Group(); peg.name = 'Mosskeeper repaired wayboard';
  const pegX = -34.65, pegZ = -88.05; peg.position.set(pegX, y(pegX, pegZ), pegZ); root.add(peg);
  const pegBuilder = builder('Mosskeeper wooden wayboard');
  pegBuilder.shape('log', palette.wood, 0, .7, 0, .072, 1.4, .072);
  pegBuilder.shape('box', palette.bark, 0, 1.18, 0, 1.3, .34, .12, [0, 0, -.03]);
  pegBuilder.beam(palette.cream, [-.37, 1.17, .072], [.37, 1.17, .072], .022);
  pegBuilder.beam(palette.cream, [.22, 1.3, .072], [.39, 1.17, .072], .022);
  pegBuilder.beam(palette.cream, [.22, 1.04, .072], [.39, 1.17, .072], .022);
  pegBuilder.finish(peg);
  block(pegX, pegZ, .26, 'moss-shrine');
  let state = { bundleTaken: false, memorialRepaired: false };
  function setState(next = {}) {
    if ('bundleTaken' in next && typeof next.bundleTaken === 'boolean') state.bundleTaken = next.bundleTaken;
    if ('memorialRepaired' in next && typeof next.memorialRepaired === 'boolean') state.memorialRepaired = next.memorialRepaired;
    bundle.visible = !state.bundleTaken;
    peg.rotation.z = state.memorialRepaired ? 0 : .92;
    return { ...state };
  }
  setState();
  // All source primitives have now been copied into the eight final meshes.
  for (const geometry of Object.values(shapes)) geometry.dispose();
  return { sites: forestPlaceDefinitions, metrics: () => ({ ...metrics }), setState, state: () => ({ ...state }) };
}

import * as THREE from 'three';

const TAU = Math.PI * 2;
const clamp = (v, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, v));
const smooth = (a, b, value) => { const t = clamp((value - a) / (b - a)); return t * t * (3 - 2 * t); };

/** An isolated art study for developer flight; this does not unlock the cape. */
export function createThalmagarWorld(scene) {
  const root = new THREE.Group(); root.name = 'Cape Thalmagar — developer art study'; scene.add(root);
  let disposed = false, seed = 0x4c1739aa;
  const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  const range = (a, b) => a + random() * (b - a);
  const bounds = Object.freeze({ minX: -240, maxX: 240, minZ: -365, maxZ: 155, minY: 2, maxY: 270 });
  const fortress = { x: 0, z: -174, floor: 65 };
  const spawn = Object.freeze({ x: 18, y: 54, z: 125 });
  const lookAt = Object.freeze({ x: 0, y: 91, z: -158 });
  const palette = Object.freeze({ background: '#393d43', fog: '#4c4948', fogNear: 105, fogFar: 800,
    ambient: '#99a4af', keyLight: '#dcc7ac', keyIntensity: 2.2, ambientIntensity: .9, water: '#232e33' });
  const landmarks = Object.freeze([
    Object.freeze({ id: 'cape-ash-shore', name: 'The Ash Shore', x: 0, y: 12, z: 84, description: 'Black sand and salt-stunted trees at the foot of the wasted cape.' }),
    Object.freeze({ id: 'cape-broken-causeway', name: 'Broken Causeway', x: 0, y: 28, z: -17, description: 'An abandoned ceremonial road rises toward the fortress through fallen arches.' }),
    Object.freeze({ id: 'cape-dead-wood', name: 'The Cinder Woods', x: -94, y: 20, z: -28, description: 'Twisted trunks, grey ash, and the last red seams of a scorched forest.' }),
    Object.freeze({ id: 'cape-fortress-gate', name: 'The Black Gatehouse', x: 0, y: 83, z: -109, description: 'A giant gatehouse stands above the last span of the ruined road.' }),
    Object.freeze({ id: 'cape-high-fortress', name: 'The Black Fortress', x: 0, y: 165, z: -174, description: 'Layered walls and needle towers crown the cliff. The cape remains a distant, undeveloped destination.' }),
  ]);

  function heightAt(x, z) {
    if (!Number.isFinite(x) || !Number.isFinite(z)) return 0;
    const sway = Math.sin(z * .012) * 11;
    const width = 96 + smooth(90, -200, z) * 98 + Math.sin(z * .022) * 15;
    const shore = smooth(0, 25, width - Math.abs(x - sway)) * (1 - smooth(110, 155, z));
    const ridges = 6 + Math.sin(x * .038 + z * .017) * 3.2 + Math.sin(z * .044) * Math.cos(x * .027) * 3.5;
    const uplift = smooth(70, -180, z) * 15;
    const cragDistance = Math.hypot(x / 1.04, z - fortress.z);
    const crag = 1 - smooth(57, 109, cragDistance);
    const ground = THREE.MathUtils.lerp(ridges + uplift, fortress.floor, crag);
    const northRidge = smooth(-267, -352, z) * (18 + Math.sin(x * .035 + z * .01) * 15);
    return THREE.MathUtils.lerp(-6, ground + northRidge, shore);
  }

  const solidMaterial = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .96, flatShading: true,
    emissive: '#283739', emissiveIntensity: .19 });
  const glowMaterial = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .76,
    emissive: '#bc512b', emissiveIntensity: 1.3, side: THREE.DoubleSide });
  const waterMaterial = new THREE.MeshStandardMaterial({ color: palette.water, roughness: .78, metalness: .17 });
  const shapes = { box: new THREE.BoxGeometry(1, 1, 1), stone: new THREE.IcosahedronGeometry(1, 0),
    column: new THREE.CylinderGeometry(1, 1, 1, 8), taper: new THREE.CylinderGeometry(.72, 1, 1, 8),
    spike: new THREE.ConeGeometry(1, 1, 8), branch: new THREE.CylinderGeometry(.65, 1, 1, 5) };
  const transform = new THREE.Object3D(), p = new THREE.Vector3(), n = new THREE.Vector3(), normalMatrix = new THREE.Matrix3(), color = new THREE.Color();
  const up = new THREE.Vector3(0, 1, 0), axis = new THREE.Vector3();
  const statistics = { meshes: 0, triangles: 0, trees: 0, towers: 0, embers: 36 };
  function builder(name, material = solidMaterial) {
    const positions = [], normals = [], colors = [];
    const architecture = name === 'Outer fortress walls and battlements' || name === 'The high keep and needle crown';
    const weatheredStone = new THREE.Color('#7b8b87');
    function append(geometry, tint) {
      const position = geometry.attributes.position, normal = geometry.attributes.normal, count = geometry.index?.count || position.count;
      normalMatrix.getNormalMatrix(transform.matrix); color.set(tint);
      if (architecture) color.lerp(weatheredStone, .20);
      for (let i = 0; i < count; i++) {
        const index = geometry.index ? geometry.index.getX(i) : i;
        p.fromBufferAttribute(position, index).applyMatrix4(transform.matrix); n.fromBufferAttribute(normal, index).applyMatrix3(normalMatrix).normalize();
        positions.push(p.x, p.y, p.z); normals.push(n.x, n.y, n.z); colors.push(color.r, color.g, color.b);
      }
    }
    function shape(kind, tint, x, y, z, sx, sy, sz, rotation = [0, 0, 0]) {
      transform.position.set(x, y, z); transform.rotation.set(...rotation); transform.scale.set(sx, sy, sz); transform.updateMatrix(); append(shapes[kind], tint);
    }
    function beam(tint, a, b, radius, kind = 'branch') {
      transform.position.set((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2);
      axis.set(b[0] - a[0], b[1] - a[1], b[2] - a[2]); const length = axis.length();
      transform.quaternion.setFromUnitVectors(up, axis.normalize()); transform.scale.set(radius, length, radius); transform.updateMatrix(); append(shapes[kind], tint);
    }
    function triangle(a, b, c, tint) {
      const sideA = new THREE.Vector3(b[0] - a[0], b[1] - a[1], b[2] - a[2]), sideB = new THREE.Vector3(c[0] - a[0], c[1] - a[1], c[2] - a[2]);
      n.crossVectors(sideA, sideB).normalize();
      for (const [index, point] of [a, b, c].entries()) {
        color.set(Array.isArray(tint) ? tint[index] : tint);
        positions.push(...point); normals.push(n.x, n.y, n.z); colors.push(color.r, color.g, color.b);
      }
    }
    function finish({ castShadow = true } = {}) {
      if (!positions.length) return null;
      const geometry = new THREE.BufferGeometry(); geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3)); geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
      geometry.computeBoundingSphere(); geometry.computeBoundingBox();
      const mesh = new THREE.Mesh(geometry, material); mesh.name = name; mesh.castShadow = castShadow; mesh.receiveShadow = material !== glowMaterial; root.add(mesh);
      statistics.meshes++; statistics.triangles += positions.length / 9; return mesh;
    }
    return { shape, beam, triangle, finish };
  }

  // The terrain is split into six useful culling blocks. It stays one surface:
  // shared sample coordinates put identical heights on every tile boundary.
  const ashBase = new THREE.Color('#55594f'), ashDark = new THREE.Color('#484e48'), ashPale = new THREE.Color('#666658'), ashRust = new THREE.Color('#675944');
  function terrainTint(x, z) {
    const broad = (Math.sin(x * .023 + z * .017) * Math.cos(z * .026 - x * .011) + 1) * .5;
    const vein = (Math.sin(x * .048 + Math.sin(z * .016) * 2.4) + 1) * .5;
    return ashBase.clone().lerp(ashDark, broad * .46).lerp(ashPale, (1 - broad) * .30)
      .lerp(ashRust, vein * .13).multiplyScalar(1 + Math.sin(x * .19 + z * .13) * .018);
  }
  for (let tileZ = 0; tileZ < 3; tileZ++) for (let tileX = 0; tileX < 2; tileX++) {
    const terrain = builder(`Cape terrain ${tileX}:${tileZ}`), left = -240 + tileX * 240, top = -365 + tileZ * (520 / 3);
    const stepsX = 60, stepsZ = 44, dx = 240 / stepsX, dz = 520 / 3 / stepsZ;
    function vertex(x, z) { return [x, heightAt(x, z), z]; }
    for (let iz = 0; iz < stepsZ; iz++) for (let ix = 0; ix < stepsX; ix++) {
      const x = left + ix * dx, z = top + iz * dz, a = vertex(x, z), b = vertex(x + dx, z), c = vertex(x, z + dz), d = vertex(x + dx, z + dz);
      // Colors vary continuously across tile boundaries; random face colors
      // turn a large, slowly sloping landscape into an obvious checkerboard.
      random(); // Preserve the independent scenery placement sequence.
      const ca = terrainTint(a[0], a[2]), cb = terrainTint(b[0], b[2]), cc = terrainTint(c[0], c[2]), cd = terrainTint(d[0], d[2]);
      terrain.triangle(a, c, b, [ca, cc, cb]); terrain.triangle(b, c, d, [cb, cc, cd]);
    }
    terrain.finish({ castShadow: false });
  }
  const ocean = new THREE.Mesh(new THREE.PlaneGeometry(1500, 1500, 1, 1), waterMaterial);
  ocean.name = 'Blackwater sea'; ocean.rotation.x = -Math.PI / 2; ocean.position.set(0, -1.7, -100); ocean.receiveShadow = true; root.add(ocean);
  statistics.meshes++; statistics.triangles += 2;

  const crag = builder('Basalt cliff foundations');
  for (let i = 0; i < 23; i++) {
    const angle = i / 23 * TAU, radius = 70 + Math.sin(i * 2.1) * 5, x = Math.sin(angle) * radius, z = fortress.z + Math.cos(angle) * radius * .86;
    const base = heightAt(x, z), top = 66 + Math.sin(i * 1.6) * 5;
    crag.shape('taper', i % 3 === 0 ? '#424941' : '#343d38', x, (base + top) / 2 - 5, z, 13 + i % 3 * 3, Math.max(18, top - base + 13), 11 + i % 2 * 5, [0, angle, .04 * Math.sin(i)]);
    crag.shape('spike', '#485047', x * 1.1, base + 7, fortress.z + (z - fortress.z) * 1.12, 6, 19 + i % 4 * 3, 8, [.10 * Math.sin(i), angle, .10]);
  }
  crag.finish();

  const fort = builder('Outer fortress walls and battlements'), windows = builder('Dull furnace light in fortress slits', glowMaterial);
  const masonry = ['#353e3b', '#3d4743', '#46504b', '#303b38'];
  function wall(b, a, c, base, height, thickness, tint = '#3d4640') {
    const dx = c[0] - a[0], dz = c[1] - a[1], length = Math.hypot(dx, dz), angle = Math.atan2(dx, dz);
    b.shape('box', tint, (a[0] + c[0]) / 2, base + height / 2, (a[1] + c[1]) / 2, thickness, height, length, [0, angle, 0]);
    for (const course of [.27, .75]) b.shape('box', '#5e6a61', (a[0] + c[0]) / 2, base + height * course, (a[1] + c[1]) / 2,
      thickness + .55, .8, length, [0, angle, 0]);
    const merlons = Math.max(2, Math.floor(length / 4.3));
    for (let i = 0; i <= merlons; i++) {
      const t = i / merlons, x = a[0] + dx * t, z = a[1] + dz * t;
      b.shape('box', '#526056', x, base + height + 1.45, z, thickness + .45, 2.9, 2.0, [0, angle, 0]);
    }
  }
  const corners = Array.from({ length: 10 }, (_, i) => {
    const angle = (i + .5) / 10 * TAU; return [Math.sin(angle) * 67, fortress.z + Math.cos(angle) * 58];
  });
  for (let i = 0; i < corners.length; i++) {
    const a = corners[i], c = corners[(i + 1) % corners.length];
    if (i === 9) {
      // The front span contains the giant open gate, rather than a wall that
      // merely has a bright rectangle painted onto it.
      wall(fort, a, [-12, -118.84], 64, 24, 4); wall(fort, [12, -118.84], c, 64, 24, 4);
    } else wall(fort, a, c, 64, 22 + i % 2 * 3, 4);
  }
  function tower(b, x, z, base, radius, height, needle = 14, tint = '#39433f') {
    b.shape('taper', tint, x, base + height / 2, z, radius, height, radius);
    b.shape('column', '#515b52', x, base + height - 1.5, z, radius * .85, 3, radius * .85);
    b.shape('spike', '#242f2e', x, base + height + needle / 2, z, radius * .95, needle, radius * .95);
    for (let side = 0; side < 4; side++) {
      const a = side / 4 * TAU, wx = x + Math.sin(a) * radius * .81, wz = z + Math.cos(a) * radius * .81;
      windows.shape('box', '#a67142', wx, base + height * .72, wz, .42, 3.3, .18, [0, a, 0]);
    }
    statistics.towers++;
  }
  corners.forEach(([x, z], i) => tower(fort, x, z, 64, i === 0 || i === 9 ? 6.7 : 5.4, i === 0 || i === 9 ? 39 : 27 + i % 3 * 5, 12 + i % 3 * 2));
  // The gatehouse has deep side supports and a pointed arch assembled from
  // individual voussoirs. A person-sized figure could fit its opening many times.
  for (const side of [-1, 1]) {
    fort.shape('box', '#2d3835', side * 13, 81, -113, 8, 34, 13);
    fort.shape('box', '#515b4c', side * 8.9, 79, -105.5, 1.2, 29, 1.8);
    for (let i = 0; i < 5; i++) {
      const t = (i + .5) / 5, x = side * (9 * (1 - t)), h = 95 + t * 13;
      fort.shape('box', '#566054', x, h, -109, 4, 5, 12, [0, 0, side * .56]);
    }
  }
  fort.shape('box', '#414b42', 0, 112.5, -113, 23, 5, 13);
  for (let i = 0; i < 5; i++) fort.shape('spike', '#25322f', -9 + i * 4.5, 119 + i % 2 * 2, -113, 1.4, 11 + i % 2 * 4, 1.4);
  // Light comes from small braziers and narrow interior seams. The portal
  // itself remains a deep, iron-bound recess rather than a luminous panel.
  fort.shape('box', '#202c2c', 0, 77, -126, 15, 23, .4);
  for (const side of [-1, 1]) {
    for (let row = 0; row < 4; row++) fort.shape('box', '#687064', side * 3.7, 69 + row * 5, -125.7, 7.1, .52, .22);
    fort.shape('box', '#535e57', side * .27, 77, -125.7, .24, 23, .25);
    fort.shape('column', '#566156', side * 9.3, 68.5, -105.3, .8, 6, .8);
    fort.shape('taper', '#333e35', side * 9.3, 71.4, -105.3, 1.65, 1.2, 1.65);
    for (let flame = 0; flame < 3; flame++) windows.shape('spike', flame % 2 ? '#b58749' : '#a95f2e',
      side * 9.3 + (flame - 1) * .42, 72.8 + flame % 2 * .36, -105.3, .46, 2.5 + flame % 2 * .8, .55, [0, flame, (flame - 1) * .12]);
    windows.shape('box', '#996033', side * 5.4, 78, -125.43, .28, 3.3, .06);
  }
  fort.finish();

  const keep = builder('The high keep and needle crown');
  keep.shape('column', '#313c37', 0, 72, fortress.z, 42, 16, 36);
  keep.shape('taper', '#394541', 0, 110, fortress.z, 24, 86, 24);
  for (const level of [82, 105, 127]) {
    const radius = 24 * (1 - .28 * ((level - 67) / 86)) + .24;
    keep.shape('column', '#6c7970', 0, level, fortress.z, radius, .88, radius);
  }
  keep.shape('column', '#4e5b51', 0, 143, fortress.z, 18.8, 5, 18.8);
  keep.shape('taper', '#293631', 0, 158, fortress.z, 14.7, 31, 14.7);
  keep.shape('column', '#536054', 0, 171.5, fortress.z, 10.8, 2, 10.8);
  keep.shape('spike', '#1f2d29', 0, 195, fortress.z, 12.2, 49, 12.2);
  for (let i = 0; i < 8; i++) {
    const angle = i / 8 * TAU, dx = Math.sin(angle), dz = Math.cos(angle);
    keep.shape('box', '#4b594e', dx * 22, 107, fortress.z + dz * 22, 3.5, 79, 6, [0, angle, 0]);
    keep.shape('spike', '#2b3832', dx * 18.5, 153 + i % 2 * 4, fortress.z + dz * 18.5, 3.9, 29 + i % 2 * 8, 3.9);
    for (let row = 0; row < 3; row++) {
      const radius = 22 - row * 1.2;
      windows.shape('box', '#9b663a', dx * radius, 92 + row * 18, fortress.z + dz * radius, .62, 6.8, .2, [0, angle, 0]);
    }
    const outerX = dx * 39, outerZ = fortress.z + dz * 37;
    tower(keep, outerX, outerZ, 65, 6.3, 45 + i % 3 * 9, 20 + i % 2 * 10, '#38453e');
    // Heavy diagonal buttresses bind the subsidiary towers to the central mass.
    keep.beam('#3f4d42', [outerX, 76, outerZ], [dx * 19, 115, fortress.z + dz * 19], 2.5, 'column');
  }
  // Two long halls break the perfect symmetry and create courtyards between
  // the enclosing wall and the vertically crowded keep.
  for (const side of [-1, 1]) {
    keep.shape('box', side < 0 ? '#455148' : '#344239', side * 31, 79.5, -157 + side * 9, 15, 29, 36);
    keep.shape('spike', '#26332d', side * 31, 99.5, -157 + side * 9, 12, 15, 26, [0, Math.PI / 4, 0]);
  }
  keep.finish(); windows.finish({ castShadow: false });

  const road = builder('Ruined ceremonial causeway');
  for (let i = 0; i < 32; i++) {
    const z = 102 - i * 6.7, floor = heightAt(0, z), rise = 2.4 + smooth(45, -95, z) * 3.3;
    if (i === 18 || i === 22) continue;
    road.shape('box', i % 3 ? '#757366' : '#64695d', Math.sin(i * .5) * .25, floor + rise, z, 13.5, 1.2, 6.4,
      i === 17 || i === 23 ? [.085 * (i === 17 ? 1 : -1), .045, .05] : [0, 0, 0]);
    for (const side of [-1, 1]) {
      road.shape('box', '#444e45', side * 6.6, floor + rise - 1.4, z, 1.3, 4, 6.8);
      if (i % 2 === 0 && i !== 16) road.shape('box', '#5a6659', side * 6.2, floor + rise + 1.3, z, .9, 1.9, 3.9);
    }
    if (i > 16 && i % 3 === 0) for (const side of [-1, 1])
      road.shape('taper', '#434e46', side * 5, floor + rise / 2 - 1, z, 1.6, rise + 1, 2.8);
  }
  for (const [z, height, broken] of [[44, 18, false], [-5, 25, true], [-63, 28, false]]) {
    const floor = heightAt(0, z) + 2;
    for (const side of [-1, 1]) {
      road.shape('box', '#515d51', side * 11, floor + height / 2, z, 3.5, height, 4.5);
      road.shape('box', '#6d7463', side * 11, floor + 1, z, 5, 2, 6);
      road.shape('spike', '#465343', side * 11, floor + height + 4, z, 2.3, 9, 2.3);
      for (let i = 0; i < 5; i++) {
        if (broken && ((side < 0 && i > 2) || (side > 0 && i > 3))) continue;
        const t = (i + .5) / 5;
        road.shape('box', '#6a7361', side * 9 * (1 - t), floor + height - 1 + t * 9, z, 4.5, 3.2, 4.2, [0, 0, side * .61]);
      }
    }
    if (broken) for (let i = 0; i < 5; i++) {
      const x = (i - 2) * 3.7, rz = z + 5 + i % 2 * 4;
      road.shape('stone', '#727465', x, heightAt(x, rz) + .9, rz, 2.8, 1.6, 1.9, [0, i, -.2]);
    }
  }
  road.finish();

  const fissures = builder('Sparse embers in cracked earth', glowMaterial), emberOrigins = [];
  for (let i = 0; i < 9; i++) {
    let x = (i % 2 ? -1 : 1) * range(31, 105), z = range(-96, 58);
    for (let n = 0; n < 5; n++) {
      const nextX = x + range(-5, 5), nextZ = z - range(3, 9), width = range(.13, .38);
      const a = [x - width, heightAt(x - width, z) + .25, z], b = [x + width, heightAt(x + width, z) + .25, z];
      const c = [nextX - width, heightAt(nextX - width, nextZ) + .25, nextZ], d = [nextX + width, heightAt(nextX + width, nextZ) + .25, nextZ];
      fissures.triangle(a, c, b, '#874826'); fissures.triangle(b, c, d, '#a36b35');
      if (n < 4) emberOrigins.push({ x, z, y: heightAt(x, z) + .6, phase: random() });
      x = nextX; z = nextZ;
    }
  }
  fissures.finish({ castShadow: false });

  const forestTiles = [builder('Western ash forest'), builder('Eastern ash forest'), builder('Northern deadwood'), builder('Southern deadwood')];
  for (let i = 0; i < 148; i++) {
    const z = range(-270, 93), x = (random() < .5 ? -1 : 1) * range(24, 167), floor = heightAt(x, z);
    if (floor < 2 || Math.hypot(x, z - fortress.z) < 105 || Math.abs(x) < 20) continue;
    const b = forestTiles[z < -200 ? 2 : z > 35 ? 3 : x < 0 ? 0 : 1], height = range(4.5, 11), lean = range(-1.6, 1.6), yaw = range(0, TAU);
    const joint = [x + lean * .45, floor + height * .52, z + Math.cos(yaw) * .45], tip = [x + lean, floor + height, z + Math.cos(yaw) * 1.7];
    b.beam('#45493b', [x, floor, z], joint, .40); b.beam('#4e5140', joint, tip, .23);
    for (let branch = 0; branch < 3; branch++) {
      const angle = yaw + branch * 2.1, length = height * range(.22, .42);
      const end = [joint[0] + Math.sin(angle) * length, joint[1] + height * .16, joint[2] + Math.cos(angle) * length];
      b.beam('#535444', joint, end, .15); b.beam('#535444', end, [end[0] + Math.sin(angle + .4) * .8, end[1] + height * .18, end[2] + Math.cos(angle + .4) * .8], .065);
    }
    if (i % 5 === 0) b.shape('stone', '#626152', x + 1, floor + .32, z - .7, 1.2, .48, .9, [0, yaw, 0]);
    statistics.trees++;
  }
  forestTiles.forEach(tile => tile.finish());

  const mountains = builder('The torn black headlands');
  for (let i = 0; i < 29; i++) {
    const side = i % 2 ? -1 : 1, x = side * range(175, 274), z = range(-435, -105), h = range(48, 146);
    mountains.shape('spike', i % 3 === 0 ? '#4b5348' : '#353f3b', x, h / 2 + 8, z, range(23, 47), h, range(22, 43), [.06, range(0, TAU), side * .09]);
  }
  for (let i = 0; i < 37; i++) {
    const x = range(-203, 210), z = range(60, 149), floor = heightAt(x, z);
    if (Math.abs(x) < 19 || floor < -3.5) continue;
    mountains.shape('stone', '#4c544a', x, floor + range(.6, 3.3), z, range(2, 5), range(2, 6), range(2, 5), [0, range(0, TAU), .2]);
  }
  mountains.finish();

  // A distant sky, rather than local opaque fog, carries the ruined cape's
  // atmosphere. The silhouette stays legible against rust at the horizon.
  const skyGeometry = new THREE.SphereGeometry(1600, 32, 14), skyPositions = skyGeometry.attributes.position;
  const skyColors = new Float32Array(skyPositions.count * 3), horizonColor = new THREE.Color('#655249'), upperSky = new THREE.Color('#26333c'), lowerSky = new THREE.Color('#454648');
  for (let i = 0; i < skyPositions.count; i++) {
    const altitude = skyPositions.getY(i) / 1600;
    color.copy(horizonColor).lerp(altitude >= 0 ? upperSky : lowerSky, smooth(0, altitude >= 0 ? .42 : .26, Math.abs(altitude)));
    skyColors.set([color.r, color.g, color.b], i * 3);
  }
  skyGeometry.setAttribute('color', new THREE.BufferAttribute(skyColors, 3));
  const skyMaterial = new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, depthWrite: false, fog: false });
  const sky = new THREE.Mesh(skyGeometry, skyMaterial); sky.name = 'Thalmagar rust horizon'; sky.position.z = -100; sky.renderOrder = -1000; root.add(sky);
  statistics.meshes++; statistics.triangles += skyGeometry.index.count / 3;
  const sunGeometry = new THREE.CircleGeometry(34, 32), sunMaterial = new THREE.MeshBasicMaterial({ color: '#b6a080', transparent: true, opacity: .60, depthWrite: false, fog: false, side: THREE.DoubleSide });
  const veiledSun = new THREE.Mesh(sunGeometry, sunMaterial); veiledSun.name = 'Veiled sun beyond the headlands'; veiledSun.position.set(-365, 153, -840); veiledSun.renderOrder = -900; root.add(veiledSun);
  statistics.meshes++; statistics.triangles += 32;
  const cloudMaterial = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: .73, depthWrite: false, fog: false });
  const cloud = builder('Distant storm shelves', cloudMaterial);
  for (let i = 0; i < 14; i++) {
    const x = -690 + i * 100, y = 163 + Math.sin(i * .74) * 29 + i % 3 * 15, z = -815 - i % 3 * 100;
    cloud.shape('stone', i % 2 ? '#343e43' : '#42464a', x, y, z, 111 + i % 3 * 21, 12 + i % 4 * 4, 23 + i % 3 * 9, [.01, -.12, Math.sin(i) * .03]);
  }
  const cloudMesh = cloud.finish({ castShadow: false }); cloudMesh.renderOrder = -800;

  // Slow ash motes stay local to the fissures. One shared instance buffer is
  // the only moving scenery; the vast fortress performs no per-frame work.
  const emberGeometry = new THREE.OctahedronGeometry(1, 0), emberMaterial = new THREE.MeshBasicMaterial({ color: '#c69451' });
  const embers = new THREE.InstancedMesh(emberGeometry, emberMaterial, emberOrigins.length);
  embers.name = 'Drifting cinders'; root.add(embers); statistics.meshes++; statistics.triangles += emberOrigins.length * 8;
  const dummy = new THREE.Object3D();
  function update(time = 0, dt = 0) {
    if (disposed || !Number.isFinite(time) || !Number.isFinite(dt) || time < 0 || dt < 0) return;
    emberOrigins.forEach((origin, i) => {
      const age = (origin.phase + time * .037) % 1, size = Math.sin(age * Math.PI) * .095 + .012;
      dummy.position.set(origin.x + Math.sin(time * .23 + i) * .7 + age * 2.5, origin.y + age * 9.5, origin.z + Math.cos(i + time * .17) * .45);
      dummy.rotation.set(time * .25, i + time * .4, 0); dummy.scale.setScalar(size); dummy.updateMatrix(); embers.setMatrixAt(i, dummy.matrix);
    });
    embers.instanceMatrix.needsUpdate = true;
  }
  embers.frustumCulled = false; update(0, 0);
  for (const geometry of Object.values(shapes)) geometry.dispose();
  const metadata = Object.freeze({ developerOnly: true, playable: false, palette,
    title: 'Cape Thalmagar', subtitle: 'A distant shadow — developer art study',
    fortressHeight: 219.5, terrainSize: [480, 520], statistics: Object.freeze({ ...statistics }),
    description: 'A separate scale and atmosphere study. No route, quests, allegiance choice, or endgame encounter is implemented here.' });
  function dispose() {
    if (disposed) return; disposed = true;
    const geometries = new Set(), materials = new Set();
    root.traverse(object => { if (!object.isMesh) return; if (object.isInstancedMesh) object.dispose(); geometries.add(object.geometry); for (const mat of Array.isArray(object.material) ? object.material : [object.material]) materials.add(mat); });
    for (const geometry of geometries) geometry.dispose(); for (const material of materials) material.dispose(); root.removeFromParent();
  }
  return { root, bounds, heightAt, landmarks, spawn, lookAt, update, dispose, metadata };
}

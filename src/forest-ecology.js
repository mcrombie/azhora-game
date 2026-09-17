import * as THREE from 'three';
import { canStand } from './game-state.js';

const TAU = Math.PI * 2;
const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
const angleDelta = (a, b) => Math.atan2(Math.sin(a - b), Math.cos(a - b));
const distance = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);

function segmentDistance(p, a, b) {
  const dx = b.x - a.x, dz = b.z - a.z;
  const t = clamp(((p.x - a.x) * dx + (p.z - a.z) * dz) / (dx * dx + dz * dz || 1), 0, 1);
  return Math.hypot(p.x - a.x - dx * t, p.z - a.z - dz * t);
}

// Botanical silhouettes are drawn once, then instanced in small, cullable tiles.
function botanicalGeometry(kind) {
  const vertices = [], colors = [];
  function triangle(a, b, c, color) {
    vertices.push(...a, ...b, ...c); const tint = new THREE.Color(color);
    for (let i = 0; i < 3; i++) colors.push(tint.r, tint.g, tint.b);
  }
  function leaf(x, y, z, angle, length, width, lift, color) {
    const dx = Math.sin(angle), dz = Math.cos(angle), sx = Math.cos(angle) * width, sz = -Math.sin(angle) * width;
    const tip = [x + dx * length, y + lift, z + dz * length];
    const mid = [x + dx * length * .45, y + lift * .76 + .017, z + dz * length * .45];
    const left = [mid[0] + sx, mid[1] - .025, mid[2] + sz], right = [mid[0] - sx, mid[1] - .025, mid[2] - sz];
    triangle([x, y, z], left, mid, color); triangle(left, tip, mid, color);
    triangle(tip, right, mid, color); triangle(right, [x, y, z], mid, color);
  }
  if (kind === 'fern') {
    for (let frond = 0; frond < 5; frond++) {
      const a = frond * TAU / 5, len = .60 + frond % 2 * .12;
      const dx = Math.sin(a), dz = Math.cos(a);
      for (let n = 0; n < 4; n++) {
        const t = .13 + n * .20, y = Math.sin(t * Math.PI * .82) * .49;
        for (const side of [-1, 1]) leaf(dx * len * t, y, dz * len * t, a + side * 1.03,
          .18 * (1 - t * .55), .038 * (1 - t * .30), .047, (n + frond) % 2 ? 0x53784a : 0x77975a);
      }
      leaf(dx * len * .74, .46, dz * len * .74, a, .22, .054, -.09, 0x87a165);
    }
  } else if (kind === 'wood-sorrel') {
    for (let stem = 0; stem < 3; stem++) {
      const x = Math.sin(stem * 2.4) * .15, z = Math.cos(stem * 2.4) * .15;
      for (let l = 0; l < 3; l++) leaf(x, .06 + stem * .017, z, l * TAU / 3 + stem, .19, .078, .024,
        l % 2 ? 0x6e8855 : 0x839d61);
    }
  } else {
    for (let stem = 0; stem < 3; stem++) {
      const x = (stem - 1) * .10, z = Math.sin(stem * 2.4) * .10, y = .33 + stem * .045;
      triangle([x - .007, 0, z], [x + .007, 0, z], [x + .007, y, z], 0x69844b);
      triangle([x - .007, 0, z], [x + .007, y, z], [x - .007, y, z], 0x69844b);
      leaf(x, .13, z, stem * 2.8, .18, .047, .065, 0x708a51);
      for (let petal = 0; petal < 5; petal++) leaf(x, y, z, petal * TAU / 5, .10, .036, .025,
        kind === 'wood-anemone' ? (petal % 2 ? 0xeee2b8 : 0xdcd4b6) : (petal % 2 ? 0xb59cba : 0xc2adbd));
      triangle([x - .028, y + .024, z - .020], [x + .028, y + .024, z - .020], [x, y + .040, z + .030], 0xcdb263);
    }
  }
  const result = new THREE.BufferGeometry();
  result.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  result.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  result.computeVertexNormals(); result.computeBoundingSphere(); return result;
}

function mergedGeometry(pieces) {
  const vertices = [], normals = [], colors = [], m = new THREE.Matrix4(), nm = new THREE.Matrix3();
  const p = new THREE.Vector3(), n = new THREE.Vector3(), q = new THREE.Quaternion();
  for (const [source, color, position, scale, rotation = [0, 0, 0]] of pieces) {
    q.setFromEuler(new THREE.Euler(...rotation)); m.compose(new THREE.Vector3(...position), q, new THREE.Vector3(...scale));
    nm.getNormalMatrix(m); const tint = new THREE.Color(color), flat = source.index ? source.toNonIndexed() : source;
    for (let i = 0; i < flat.attributes.position.count; i++) {
      p.fromBufferAttribute(flat.attributes.position, i).applyMatrix4(m); vertices.push(p.x, p.y, p.z);
      n.fromBufferAttribute(flat.attributes.normal, i).applyMatrix3(nm).normalize(); normals.push(n.x, n.y, n.z);
      colors.push(tint.r, tint.g, tint.b);
    }
    if (flat !== source) flat.dispose();
  }
  const result = new THREE.BufferGeometry();
  result.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  result.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  result.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3)); result.computeBoundingSphere(); return result;
}

function animalAndWoodShapes() {
  const ico = new THREE.IcosahedronGeometry(1, 0), round = new THREE.IcosahedronGeometry(1, 1);
  const cylinder = new THREE.CylinderGeometry(1, 1, 1, 6), box = new THREE.BoxGeometry(1, 1, 1);
  const brown = 0x91704c, light = 0xbd9769, pale = 0xd8c9a2, dark = 0x362e24;
  const shapes = {
    'moss-log': mergedGeometry([
      [cylinder, 0x65503b, [0, .22, 0], [.22, 2.05, .22], [0, 0, Math.PI / 2]],
      [cylinder, 0xb39971, [1.032, .22, 0], [.16, .012, .16], [0, 0, Math.PI / 2]],
      [ico, 0x64744a, [-.50, .395, -.015], [.52, .10, .17]], [ico, 0x78915b, [.34, .405, -.01], [.38, .085, .16]],
      [cylinder, 0x817054, [-.42, .23, .20], [.04, .17, .04]], [ico, 0xd1b381, [-.42, .32, .20], [.15, .035, .12]],
      [cylinder, 0x817054, [-.17, .14, .21], [.035, .15, .035]], [ico, 0xbba079, [-.17, .23, .21], [.12, .031, .10]],
      [ico, 0xc3ab88, [.11, .22, .17], [.10, .028, .12]],
    ]),
    'deer-body': mergedGeometry([
      [round, brown, [0, 1.05, -.02], [.32, .38, .68]], [ico, light, [0, 1.00, .40], [.29, .38, .29]],
      [ico, pale, [0, .87, .06], [.25, .20, .53]], [ico, brown, [0, 1.20, -.66], [.115, .11, .22], [-.6, 0, 0]],
      [ico, pale, [0, 1.235, -.70], [.085, .055, .17], [-.6, 0, 0]],
      [ico, brown, [-.20, 1.01, -.43], [.14, .22, .22]], [ico, brown, [.20, 1.01, -.43], [.14, .22, .22]],
    ]),
    'deer-head': mergedGeometry([
      [round, light, [0, .21, .10], [.17, .42, .19], [-.35, 0, 0]],
      [round, brown, [0, .56, .22], [.18, .20, .24]], [ico, light, [0, .47, .44], [.105, .10, .22]],
      [ico, dark, [0, .46, .62], [.063, .055, .055]],
      [ico, brown, [-.18, .75, .12], [.12, .235, .053], [0, 0, .58]],
      [ico, brown, [.18, .75, .12], [.12, .235, .053], [0, 0, -.58]],
      [ico, pale, [-.185, .75, .15], [.064, .165, .016], [0, 0, .58]],
      [ico, pale, [.185, .75, .15], [.064, .165, .016], [0, 0, -.58]],
      [ico, dark, [-.146, .59, .34], [.032, .037, .026]], [ico, dark, [.146, .59, .34], [.032, .037, .026]],
    ]),
    'deer-leg': mergedGeometry([
      [ico, brown, [0, -.035, 0], [.091, .125, .10]],
      [cylinder, brown, [0, -.22, 0], [.070, .46, .074]],
      [ico, light, [0, -.435, .010], [.064, .065, .060]],
      [cylinder, light, [0, -.64, .028], [.041, .43, .044], [-.10, 0, 0]],
      [ico, brown, [0, -.856, .05], [.047, .064, .046]],
      [box, dark, [0, -.910, .077], [.095, .09, .145]],
    ]),
    'butterfly-body': mergedGeometry([[ico, 0x5b4b32, [0, 0, 0], [.018, .022, .11]]]),
    'butterfly-wing': mergedGeometry([
      [ico, 0xc69c50, [.125, 0, .026], [.145, .012, .12]], [ico, 0xe1be73, [.070, 0, -.095], [.085, .011, .095]],
      [ico, 0x6d5534, [.21, .004, .040], [.044, .008, .032]],
    ]),
    'dragonfly-body': mergedGeometry([[ico, 0x397c77, [0, 0, -.11], [.028, .027, .26]], [ico, 0x94b6a5, [0, 0, .12], [.053, .038, .04]]]),
    'dragonfly-wing': mergedGeometry([
      [ico, 0xb1cac0, [.17, 0, .035], [.22, .006, .042], [0, -.2, 0]],
      [ico, 0x90afa5, [.17, 0, -.065], [.21, .006, .035], [0, .23, 0]],
    ]),
    'thrush-body': mergedGeometry([
      [round, 0x816546, [0, .23, -.01], [.125, .15, .22]],
      [ico, 0xd0bc8e, [0, .215, .12], [.103, .12, .11]],
      [ico, 0x68513b, [0, .25, -.245], [.061, .032, .17], [-.10, 0, 0]],
      [cylinder, 0x8b734e, [-.043, .081, .022], [.011, .13, .012]],
      [cylinder, 0x8b734e, [.043, .081, .022], [.011, .13, .012]],
      [box, 0x67543b, [-.043, .017, .053], [.027, .019, .078]],
      [box, 0x67543b, [.043, .017, .053], [.027, .019, .078]],
      ...[-1, 0, 1].flatMap(side => [
        [ico, 0x6e5239, [side * .044, .225, .217 - Math.abs(side) * .008], [.013, .018, .007]],
        [ico, 0x72593f, [side * .035, .170, .204 - Math.abs(side) * .009], [.012, .016, .007]],
      ]),
    ]),
    'thrush-head': mergedGeometry([
      [round, 0x91704c, [0, 0, 0], [.088, .090, .098]],
      [ico, 0xc2a778, [0, -.035, .060], [.061, .046, .063]],
      [ico, 0x4b3b2b, [0, -.012, .145], [.024, .020, .075]],
      [ico, 0x232821, [-.078, .018, .045], [.010, .015, .011]],
      [ico, 0x232821, [.078, .018, .045], [.010, .015, .011]],
    ]),
    'thrush-wing': mergedGeometry([
      [ico, 0x796044, [.135, 0, 0], [.17, .017, .16]],
      [ico, 0x584b37, [.33, -.004, 0], [.17, .011, .102]],
    ]),
  };
  ico.dispose(); round.dispose(); cylinder.dispose(); box.dispose(); return shapes;
}

/** Quiet ecology for the woods about Tidehaven only. Animals are scenery and never block movement. */
export function createForestEcology(scene, world, { exclusionSites = [] } = {}) {
  let seed = 0x46f03a19, updates = 0, disposed = false;
  const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  const root = new THREE.Group(); root.name = 'Tidehaven woods ecology'; scene.add(root);
  const material = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .96, flatShading: true, side: THREE.DoubleSide });
  const shapes = animalAndWoodShapes();
  for (const kind of ['fern', 'wood-sorrel', 'wood-anemone', 'wood-violet']) shapes[kind] = botanicalGeometry(kind);
  const segments = (world.paths || []).flatMap(path => path.slice(1).map((b, i) => [path[i], b]));
  const explicit = [...(Array.isArray(world.forestPlaces) ? world.forestPlaces : Object.values(world.forestPlaces || {})), ...exclusionSites];
  const sites = [...Object.values(world.npcPositions || {}), ...(world.firePits || []), ...(world.repairBenches || []),
    ...(world.fishingSpots || []).map(s => s.fishingSpot), world.training, world.northTrail, world.border,
    ...(world.landmarks || []).filter(s => s.z > -162), ...explicit].filter(p => p && Number.isFinite(p.x) && Number.isFinite(p.z))
    .map(p => ({ x: p.x, z: p.z, radius: Math.max(3.2, Number(p.radius ?? p.r) || 0) }));
  if (world.encounter) sites.push({ ...world.encounter, radius: world.encounter.radius + 1.5 });
  // The village woodland in world metres: Tidehaven's old local box (x within 72, z -154..-23)
  // turned the same quarter turn as the village, so the Greenway now runs along z = 29.
  const isForest = (x, z) => x >= -174 && x <= -43 && z >= -43 && z <= 101;
  function clear(x, z, radius = .55, avoidPath = true) {
    const point = { x, z }, y = world.heightAt(x, z);
    return isForest(x, z) && Number.isFinite(y) && canStand(x, z, world, radius)
      && sites.every(site => distance(point, site) >= site.radius + radius)
      && (!avoidPath || segments.every(([a, b]) => segmentDistance(point, a, b) >= 2.5 + radius));
  }
  function nearClear(x, z, radius = .6, avoidPath = false) {
    for (let ring = 0; ring <= 12; ring += 1) for (let n = 0; n < (ring ? 24 : 1); n++) {
      const angle = n * TAU / 24 + ring * .14, px = x + Math.sin(angle) * ring, pz = z + Math.cos(angle) * ring;
      if (clear(px, pz, radius, avoidPath)) return { x: px, y: world.heightAt(px, pz), z: pz };
    }
    return null;
  }
  const dummy = new THREE.Object3D(), rootMatrix = new THREE.Matrix4(), placedMatrix = new THREE.Matrix4();
  const quaternion = new THREE.Quaternion(), position = new THREE.Vector3(), unit = new THREE.Vector3(1, 1, 1);
  function instanced(group, kind, count, moving = false) {
    const mesh = new THREE.InstancedMesh(shapes[kind], material, count); mesh.name = `Forest ${kind}`;
    mesh.receiveShadow = true; mesh.castShadow = kind.startsWith('deer');
    if (moving) { mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage); mesh.frustumCulled = false; }
    group.add(mesh); return mesh;
  }
  const tiles = [
    { id: 'west-greenway', x: -75, z: 65 }, { id: 'east-greenway', x: -75, z: -7 },
    { id: 'west-fernway', x: -143, z: 65 }, { id: 'east-fernway', x: -143, z: -7 },
  ].map(t => { const group = new THREE.Group(); group.name = t.id; root.add(group); return { ...t, group, plants: [], meshes: [], ticks: 0 }; });
  const nearestTile = point => tiles.reduce((best, tile) => distance(point, tile) < distance(point, best) ? tile : best, tiles[0]);
  const samples = [];
  const trees = (world.broadleafTrees || []).filter(t => isForest(t.x, t.z));
  for (const config of [
    { kind: 'fern', count: 164, radius: .80 }, { kind: 'wood-sorrel', count: 124, radius: .36 },
    { kind: 'wood-anemone', count: 62, radius: .38 }, { kind: 'wood-violet', count: 48, radius: .38 },
    { kind: 'moss-log', count: 12, radius: 1.4 },
  ]) {
    let count = 0;
    for (let patch = 0; patch < 1200 && count < config.count; patch++) {
      const anchor = trees.length && random() < .76 ? trees[Math.floor(random() * trees.length)]
        : { x: -168 + random() * 119, z: -36 + random() * 130 };
      const angle = random() * TAU, radius = 1.5 + random() * 4.8;
      const center = { x: anchor.x + Math.sin(angle) * radius, z: anchor.z + Math.cos(angle) * radius };
      for (let n = 0; n < (config.kind === 'moss-log' ? 1 : 6) && count < config.count; n++) {
        const a = random() * TAU, r = random() * 1.8, x = center.x + Math.sin(a) * r, z = center.z + Math.cos(a) * r;
        if (!clear(x, z, config.radius) || samples.some(p => Math.hypot(p.x - x, p.z - z) < Math.max(.37, p.radius + config.radius - .45))) continue;
        const item = { id: `${config.kind}-${++count}`, kind: config.kind, x, y: world.heightAt(x, z) + .014, z,
          yaw: random() * TAU, scale: .82 + random() * .32, radius: config.radius };
        samples.push(item); nearestTile(item).plants.push(item);
      }
    }
  }
  for (const tile of tiles) for (const kind of ['fern', 'wood-sorrel', 'wood-anemone', 'wood-violet', 'moss-log']) {
    const plants = tile.plants.filter(p => p.kind === kind); if (!plants.length) continue;
    const mesh = instanced(tile.group, kind, plants.length);
    plants.forEach((p, i) => { dummy.position.set(p.x, p.y, p.z); dummy.rotation.set(0, p.yaw, 0); dummy.scale.setScalar(p.scale);
      dummy.updateMatrix(); mesh.setMatrixAt(i, dummy.matrix); });
    mesh.computeBoundingSphere(); tile.meshes.push(mesh);
  }
  const deerGroups = [], deer = [];
  for (const [i, home] of [{ x: -80, z: 50 }, { x: -132, z: -15 }, { x: -153, z: 70 }].entries()) {
    const group = new THREE.Group(); group.name = `Tidehaven woods deer ${i + 1}`; root.add(group);
    const animals = [];
    for (let n = 0; n < (i === 2 ? 2 : 1); n++) {
      const p = nearClear(home.x + n * 2.4, home.z + n * 1.8); if (!p) continue;
      const a = { id: `deer-${deer.length + 1}`, species: n ? 'fawn' : 'roe-deer', ...p, home: { ...p }, yaw: i * 1.7,
        scale: n ? .64 : .96 + i * .035, action: 'browse', timer: 2 + i * .7, clock: i * .43, speed: 0, alert: 0, lift: 0 };
      animals.push(a); deer.push(a);
    }
    const meshes = { body: instanced(group, 'deer-body', animals.length, true), head: instanced(group, 'deer-head', animals.length, true),
      legs: instanced(group, 'deer-leg', animals.length * 4, true) };
    deerGroups.push({ id: group.name, group, home, animals, meshes, ticks: 0 });
  }
  // Fixed bird anchors have their own life cycle and consume none of the
  // existing scatter RNG, so adding birds cannot move plants or collectibles.
  const birdGroup = new THREE.Group(); birdGroup.name = 'Tidehaven woods thrushes'; root.add(birdGroup);
  const birds = [];
  for (const [index, home] of [{ x: -73, z: 51 }, { x: -76, z: 4 }, { x: -108, z: -1 },
    { x: -132, z: 53 }, { x: -161, z: 69 }].entries()) {
    const point = nearClear(home.x, home.z, .28, true); if (!point) continue;
    birds.push({ id: `woodland-thrush-${index + 1}`, species: 'woodland-thrush', ...point, home: { ...point },
      index, yaw: index * 1.61 + .2, clock: index * .73, timer: .8 + index * .31, cooldown: 0,
      action: 'peck', lift: 0, speed: 0, visible: true, motion: null });
  }
  const birdFlock = { group: birdGroup, birds, ticks: 0, meshes: {
    body: instanced(birdGroup, 'thrush-body', birds.length, true),
    head: instanced(birdGroup, 'thrush-head', birds.length, true),
    wings: instanced(birdGroup, 'thrush-wing', birds.length * 2, true),
  } };
  const insects = [], insectGroups = [];
  const flowerSites = samples.filter(p => p.kind === 'wood-anemone' || p.kind === 'wood-violet');
  for (const species of ['butterfly', 'dragonfly']) {
    const group = new THREE.Group(); group.name = `Tidehaven woods ${species} glades`; root.add(group); const animals = [];
    const count = species === 'butterfly' ? 14 : world.pond ? 4 : 0;
    for (let i = 0; i < count; i++) {
      const bee = species === 'butterfly' && i >= 8;
      const flower = flowerSites[Math.floor(i * flowerSites.length / 8)];
      if (species === 'butterfly' && !bee && !flower) continue;
      // Bees share the butterfly's two instanced batches. Their smaller scale,
      // quick level flight, and hive-bound routes distinguish them without draws.
      const hiveX = -56.9 + (i % 2) * .3, hiveZ = [-10.9, -12.95, -15][(i - 8) % 3];
      const pond = world.pond, home = bee ? { x: hiveX, y: world.heightAt(hiveX, hiveZ) + 1.10, z: hiveZ }
        : species === 'butterfly' ? { x: flower.x, y: flower.y + .60, z: flower.z }
        : { x: pond.x + Math.sin(i * 1.7) * pond.radius * .54, y: pond.surfaceY + .75, z: pond.z + Math.cos(i * 1.7) * pond.radius * .54 };
      const a = { id: bee ? `bee-${i - 7}` : `${species}-${i + 1}`, species: bee ? 'bee' : species, ...home, home,
        clock: i * 1.31, yaw: i * 2.1, action: bee ? 'forage' : 'flutter', visible: true };
      animals.push(a); insects.push(a);
    }
    insectGroups.push({ group, animals, meshes: { body: instanced(group, `${species}-body`, animals.length, true),
      wings: instanced(group, `${species}-wing`, animals.length * 2, true) } });
  }
  function place(mesh, index, x, y, z, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) {
    dummy.position.set(x, y, z); dummy.rotation.set(rx, ry, rz); dummy.scale.set(sx, sy, sz); dummy.updateMatrix();
    placedMatrix.multiplyMatrices(rootMatrix, dummy.matrix); mesh.setMatrixAt(index, placedMatrix);
  }
  function deerPose(flock) {
    flock.animals.forEach((a, i) => {
      quaternion.setFromEuler(new THREE.Euler(0, a.yaw, 0)); position.set(a.x, a.y + a.lift, a.z); unit.setScalar(a.scale);
      rootMatrix.compose(position, quaternion, unit); place(flock.meshes.body, i, 0, Math.sin(a.clock * 2) * .014, 0);
      const browsing = a.action === 'browse', phase = a.clock * (a.action === 'flee' ? 12 : 5.5);
      place(flock.meshes.head, i, 0, 1.12, .43, browsing ? 1.72 + Math.sin(a.clock * 1.3) * .06 : -.08 + Math.sin(a.clock * .7) * .05,
        a.action === 'alert' ? Math.sin(a.clock * 1.7) * .32 : Math.sin(a.clock * .6) * .08);
      for (let leg = 0; leg < 4; leg++) place(flock.meshes.legs, i * 4 + leg, leg % 2 ? .20 : -.20, .96, leg < 2 ? .38 : -.43,
        a.speed > .1 ? Math.sin(phase + (leg === 0 || leg === 3 ? 0 : Math.PI)) * (a.action === 'flee' ? .64 : .23) : 0);
    });
    for (const mesh of Object.values(flock.meshes)) mesh.instanceMatrix.needsUpdate = true;
  }
  function moveDeer(a, step) {
    for (const offset of [0, .50, -.50, 1.0, -1.0, 1.7, -1.7]) {
      const yaw = a.yaw + offset, dx = Math.sin(yaw) * step, dz = Math.cos(yaw) * step;
      const slices = Math.max(1, Math.ceil(step / .12)); let valid = true;
      for (let n = 1; n <= slices; n++) {
        const x = a.x + dx * n / slices, z = a.z + dz * n / slices;
        if (!clear(x, z, .57 * a.scale, false) || Math.abs(world.heightAt(x, z) - a.y) > .48) { valid = false; break; }
      }
      if (valid) { a.x += dx; a.z += dz; a.yaw = yaw; return step; }
    }
    a.yaw += 1.1; return 0;
  }
  function tickDeer(a, dt, player) {
    a.clock += dt; a.timer -= dt; a.speed = 0; a.lift = 0;
    const nearby = distance(a, player);
    if (nearby < 8) { a.action = 'flee'; a.timer = 2.4; a.alert = 3;
      a.yaw += angleDelta(Math.atan2(a.x - player.x, a.z - player.z), a.yaw) * Math.min(1, dt * 6); }
    else if (nearby < 14 && a.action !== 'flee') { a.action = 'alert'; a.timer = 1.7; a.alert = 1; }
    if (a.timer <= 0) {
      if (a.action === 'flee') { a.action = 'alert'; a.timer = 2.3; }
      else if (a.action === 'walk' || a.action === 'alert') { a.action = 'browse'; a.timer = 4.5; a.alert = 0; }
      else { a.action = 'walk'; a.timer = 2.7;
        a.yaw = distance(a, a.home) > 9 ? Math.atan2(a.home.x - a.x, a.home.z - a.z) : a.yaw + Math.sin(a.clock * .63) * 1.8; }
    }
    if (a.action === 'walk' || a.action === 'flee') {
      a.speed = moveDeer(a, (a.action === 'flee' ? 7.4 : .66) * dt) / dt;
      if (a.action === 'flee' && a.speed > .5) a.lift = Math.max(0, Math.sin(a.clock * 12)) * .18;
    }
    a.y = world.heightAt(a.x, a.z);
  }
  function insectPose(flock) {
    flock.animals.forEach((a, i) => {
      quaternion.setFromEuler(new THREE.Euler(0, a.yaw, 0)); position.set(a.x, a.y, a.z); unit.setScalar(a.visible ? (a.species === 'bee' ? .42 : 1) : .0001);
      rootMatrix.compose(position, quaternion, unit); place(flock.meshes.body, i, 0, 0, 0);
      const flap = a.species === 'butterfly' ? .35 + Math.sin(a.clock * 19) * .80 : Math.sin(a.clock * (a.species === 'bee' ? 47 : 38)) * .20;
      for (let side = 0; side < 2; side++) place(flock.meshes.wings, i * 2 + side, 0, 0, 0, 0, side ? Math.PI : 0, side ? -flap : flap);
    });
    for (const mesh of Object.values(flock.meshes)) mesh.instanceMatrix.needsUpdate = true;
  }
  function clearBirdRoute(from, to) {
    const steps = Math.max(2, Math.ceil(distance(from, to) / .24));
    for (let n = 1; n <= steps; n++) {
      const x = from.x + (to.x - from.x) * n / steps, z = from.z + (to.z - from.z) * n / steps;
      if (!clear(x, z, .22, false)) return false;
    }
    return true;
  }
  function startBirdFlight(bird, player) {
    const away = Math.atan2(bird.x - player.x, bird.z - player.z);
    for (const radius of [8.5, 6, 11]) for (const turn of [0, .45, -.45, .9, -.9, 1.3, -1.3]) {
      const yaw = away + turn, target = { x: bird.x + Math.sin(yaw) * radius, z: bird.z + Math.cos(yaw) * radius };
      if (!clear(target.x, target.z, .28, false) || distance(target, player) < distance(bird, player) + 3
        || !clearBirdRoute(bird, target)) continue;
      bird.motion = { from: { x: bird.x, y: bird.y, z: bird.z }, to: { ...target, y: world.heightAt(target.x, target.z) },
        time: 0, duration: 1.18 + radius * .065, height: 1.85 + radius * .045 };
      bird.yaw = yaw; bird.action = 'flight'; return true;
    }
    bird.cooldown = .45; bird.action = 'look'; bird.timer = .45; return false;
  }
  function startBirdHop(bird) {
    const homeAngle = Math.atan2(bird.home.x - bird.x, bird.home.z - bird.z);
    const forward = distance(bird, bird.home) > 3 ? homeAngle : bird.yaw + Math.sin(bird.clock * .8 + bird.index) * 1.45;
    for (const turn of [0, .7, -.7, 1.4, -1.4]) {
      const yaw = forward + turn, radius = .48 + (bird.index % 3) * .12;
      const target = { x: bird.x + Math.sin(yaw) * radius, z: bird.z + Math.cos(yaw) * radius };
      if (!clear(target.x, target.z, .28, false) || !clearBirdRoute(bird, target)) continue;
      bird.motion = { from: { x: bird.x, y: bird.y, z: bird.z }, to: { ...target, y: world.heightAt(target.x, target.z) },
        time: 0, duration: .34, height: .14 };
      bird.yaw = yaw; bird.action = 'hop'; return true;
    }
    bird.action = 'peck'; bird.timer = 1.2; return false;
  }
  function tickBird(bird, dt, player) {
    bird.clock += dt; bird.timer -= dt; bird.cooldown = Math.max(0, bird.cooldown - dt); bird.speed = 0;
    if (!bird.motion && distance(bird, player) < 5.6 && bird.cooldown === 0) startBirdFlight(bird, player);
    if (bird.motion) {
      const motion = bird.motion, before = { x: bird.x, z: bird.z }; motion.time += dt;
      const t = clamp(motion.time / motion.duration, 0, 1), eased = t * t * (3 - 2 * t);
      bird.x = motion.from.x + (motion.to.x - motion.from.x) * eased;
      bird.z = motion.from.z + (motion.to.z - motion.from.z) * eased;
      bird.y = world.heightAt(bird.x, bird.z); bird.lift = Math.sin(t * Math.PI) * motion.height;
      bird.speed = distance(bird, before) / dt;
      if (t === 1) {
        const flew = bird.action === 'flight'; bird.motion = null; bird.lift = 0;
        bird.action = flew ? 'look' : 'peck'; bird.timer = flew ? .8 : 1.3 + bird.index * .15;
        if (flew) { bird.home = { x: bird.x, y: bird.y, z: bird.z }; bird.cooldown = 1.2; }
      }
      return;
    }
    bird.lift = 0;
    if (bird.timer <= 0) {
      if (bird.action === 'peck') { bird.action = 'look'; bird.timer = .50 + bird.index * .04; }
      else startBirdHop(bird);
    }
  }
  function birdPose() {
    birds.forEach((bird, i) => {
      quaternion.setFromEuler(new THREE.Euler(0, bird.yaw, 0)); position.set(bird.x, bird.y + bird.lift, bird.z);
      unit.setScalar(bird.visible ? .84 : .0001); rootMatrix.compose(position, quaternion, unit);
      const flying = bird.action === 'flight', peck = bird.action === 'peck' ? Math.max(0, Math.sin(bird.clock * 5.5)) : 0;
      place(birdFlock.meshes.body, i, 0, 0, 0, flying ? .13 : 0);
      place(birdFlock.meshes.head, i, 0, .35 - peck * .11, .15, peck * .87 + (flying ? .10 : 0),
        bird.action === 'look' ? Math.sin(bird.clock * 2.5) * .32 : 0);
      // The symmetric wing shape rotates around Y to form the other side.
      // Both Z angles match so both wings rise and fall together.
      const flap = flying ? .20 + Math.sin(bird.clock * 22) * .92 : -1.18;
      for (let side = 0; side < 2; side++) place(birdFlock.meshes.wings, i * 2 + side,
        side ? -.085 : .085, .265, -.015, 0, side ? Math.PI : 0, flap, flying ? 1 : .45, 1, flying ? 1 : .75);
    });
    for (const mesh of Object.values(birdFlock.meshes)) mesh.instanceMatrix.needsUpdate = true;
  }
  deerGroups.forEach(deerPose); insectGroups.forEach(insectPose); birdPose();
  // Developer flight observes the same paused world from another location.
  // Refresh only culling and instance visibility; never tick an animal or move
  // the simulation clock while the real traveler is paused elsewhere.
  function setObserver(observer) {
    if (disposed || !Number.isFinite(observer?.x) || !Number.isFinite(observer?.z)) return false;
    for (const tile of tiles) tile.group.visible = distance(observer, tile) < 96;
    for (const flock of deerGroups) flock.group.visible = flock.animals.some(animal => distance(animal, observer) < 86);
    for (const bird of birds) bird.visible = distance(bird, observer) < 68;
    birdGroup.visible = birds.some(bird => bird.visible); birdPose();
    for (const flock of insectGroups) {
      for (const insect of flock.animals) insect.visible = distance(insect.home, observer) < 52;
      flock.group.visible = flock.animals.some(insect => insect.visible); insectPose(flock);
    }
    return true;
  }
  function update(dt, _worldTime, player, active = true) {
    if (disposed || !active || !Number.isFinite(dt) || dt <= 0 || !Number.isFinite(player?.x) || !Number.isFinite(player?.z)) return;
    const step = Math.min(dt, .15); updates++;
    for (const tile of tiles) tile.group.visible = distance(player, tile) < 96;
    for (const flock of deerGroups) {
      flock.group.visible = flock.animals.some(a => distance(a, player) < 86);
      if (!flock.group.visible) continue; flock.ticks++;
      for (const a of flock.animals) tickDeer(a, step, player); deerPose(flock);
    }
    birdGroup.visible = birds.some(bird => distance(bird, player) < 68);
    if (birdGroup.visible) {
      birdFlock.ticks++;
      for (const bird of birds) { bird.visible = distance(bird, player) < 68; if (bird.visible) tickBird(bird, step, player); }
      birdPose();
    }
    for (const flock of insectGroups) {
      flock.group.visible = flock.animals.some(a => distance(a.home, player) < 52); if (!flock.group.visible) continue;
      for (const a of flock.animals) {
        a.visible = distance(a.home, player) < 52; if (!a.visible) continue;
        a.clock += step; const c = a.clock, butterfly = a.species === 'butterfly', bee = a.species === 'bee';
        const oldX = a.x, oldZ = a.z;
        a.x = a.home.x + Math.sin(c * (bee ? 2.1 : butterfly ? .91 : 1.35)) * (bee ? .68 : butterfly ? .85 : 1.9);
        a.z = a.home.z + Math.sin(c * (bee ? 1.4 : butterfly ? 1.37 : .77)) * (bee ? .55 : butterfly ? .65 : 1.2);
        a.y = a.home.y + Math.sin(c * (butterfly ? 3.2 : 2.4)) * (bee ? .13 : butterfly ? .15 : .06);
        a.yaw = Math.atan2(a.x - oldX, a.z - oldZ);
      }
      insectPose(flock);
    }
  }
  function state() {
    let draws = 0, triangles = 0;
    root.traverse(object => { if (object.isInstancedMesh) { draws++; triangles += object.count * object.geometry.attributes.position.count / 3; } });
    return { updates, disposed, plants: samples.map(p => ({ ...p })),
      animals: deer.map(a => ({ id: a.id, species: a.species, x: a.x, y: a.y + a.lift, groundY: a.y, z: a.z, yaw: a.yaw,
        action: a.action, speed: a.speed, clock: a.clock, scale: a.scale })),
      insects: insects.map(a => ({ id: a.id, species: a.species, x: a.x, y: a.y, z: a.z, clock: a.clock, visible: a.visible })),
      birds: birds.map(bird => ({ id: bird.id, species: bird.species, x: bird.x, y: bird.y + bird.lift, groundY: bird.y, z: bird.z,
        yaw: bird.yaw, clock: bird.clock, action: bird.action, speed: bird.speed, visible: bird.visible })),
      groups: [...tiles.map(t => ({ id: t.id, visible: t.group.visible, count: t.plants.length })),
        ...deerGroups.map(f => ({ id: f.id, visible: f.group.visible, count: f.animals.length, ticks: f.ticks })),
        { id: 'woodland-thrushes', visible: birdGroup.visible, count: birds.length, ticks: birdFlock.ticks }],
      budget: { draws, triangles, plants: samples.length, deer: deer.length, insects: insects.length, birds: birds.length } };
  }
  function dispose() {
    if (disposed) return; disposed = true; root.removeFromParent();
    root.traverse(object => { if (object.isInstancedMesh) object.dispose(); });
    for (const shape of Object.values(shapes)) shape.dispose(); material.dispose();
  }
  return { update, setObserver, state, dispose };
}

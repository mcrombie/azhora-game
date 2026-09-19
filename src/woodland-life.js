import * as THREE from 'three';
import { canStand } from './game-state.js';

// Small wildlife is scenery with a memory of its own tree, never a combat target.
// Acorns are separate, individually owned pickup sites; a squirrel cannot consume
// one that the player needs for the village errand. Fallen branches have their
// own pickup sites, so taking a stick never removes an acorn or a squirrel prop.
export function createWoodlandLife(scene, world) {
  const root = new THREE.Group(); root.name = 'Tidehaven woods life'; scene.add(root);
  const sphere = new THREE.IcosahedronGeometry(1, 1);
  const lowSphere = new THREE.IcosahedronGeometry(1, 0);
  const cone = new THREE.ConeGeometry(1, 1, 5);
  const dummy = new THREE.Object3D(), matrix = new THREE.Matrix4(), normalMatrix = new THREE.Matrix3();
  const point = new THREE.Vector3(), normal = new THREE.Vector3(), tint = new THREE.Color();
  const fur = '#8e5636', furLight = '#b77745', belly = '#c5a078', dark = '#32281f';
  const coloredMaterial = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .96 });

  // Merge colored detail into one draw per moving part instead of a draw for
  // each eye, ear, toe, and patch of fur.
  function geometry(parts) {
    const positions = [], normals = [], colors = [];
    for (const [source, color, x, y, z, sx, sy, sz, rx = 0, ry = 0, rz = 0] of parts) {
      dummy.position.set(x, y, z); dummy.scale.set(sx, sy, sz); dummy.rotation.set(rx, ry, rz, 'YXZ'); dummy.updateMatrix();
      matrix.copy(dummy.matrix); normalMatrix.getNormalMatrix(matrix); tint.set(color);
      const flat = source.index ? source.toNonIndexed() : source;
      const p = flat.attributes.position, n = flat.attributes.normal;
      for (let i = 0; i < p.count; i++) {
        point.fromBufferAttribute(p, i).applyMatrix4(matrix); positions.push(point.x, point.y, point.z);
        normal.fromBufferAttribute(n, i).applyMatrix3(normalMatrix).normalize(); normals.push(normal.x, normal.y, normal.z);
        colors.push(tint.r, tint.g, tint.b);
      }
      if (flat !== source) flat.dispose();
    }
    const result = new THREE.BufferGeometry();
    result.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    result.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    result.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    result.computeBoundingSphere(); dummy.rotation.order = 'XYZ'; return result;
  }
  const bodyGeometry = geometry([
    [sphere, fur, 0, .24, -.035, .145, .165, .25],
    [sphere, belly, 0, .21, .16, .104, .12, .16],
    [sphere, furLight, 0, .35, .25, .13, .125, .15],
    [lowSphere, furLight, 0, .32, .38, .081, .065, .12],
    [lowSphere, dark, 0, .334, .48, .035, .028, .028],
    [cone, fur, -.073, .478, .233, .046, .12, .038, -.17],
    [cone, fur, .073, .478, .233, .046, .12, .038, -.17],
    [lowSphere, dark, -.097, .387, .325, .024, .026, .023],
    [lowSphere, dark, .097, .387, .325, .024, .026, .023],
  ]);
  const tailGeometry = geometry([
    [sphere, fur, 0, .20, -.32, .095, .10, .19, -.5],
    [sphere, furLight, 0, .38, -.48, .17, .245, .18, -.25],
    [sphere, furLight, 0, .62, -.405, .14, .16, .17, .63],
    [sphere, '#c79662', 0, .664, -.29, .092, .095, .11, .63],
  ]);
  const legGeometry = geometry([
    [sphere, fur, 0, -.065, 0, .05, .09, .052],
    [lowSphere, dark, 0, -.125, .035, .044, .026, .077],
  ]);
  const acornGeometry = geometry([
    [sphere, '#a96835', 0, .108, 0, .092, .115, .085],
    [sphere, '#735036', 0, .197, 0, .112, .052, .102],
    [cone, '#735036', 0, .251, 0, .025, .06, .023, -.22],
  ]);
  const usedTrees = new Set();
  const treeAnchors = [[-25, 17], [-11, -30], [10, -36], [10, -54], [-10, -84], [10, -123]];
  const pockets = treeAnchors.map(([x, z]) => {
    const tree = world.broadleafTrees.filter(t => !usedTrees.has(t.id) && t.z > -51 && t.z < 109 && t.x > -164)
      .sort((a, b) => Math.hypot(a.x - x, a.z - z) - Math.hypot(b.x - x, b.z - z))[0];
    if (tree) usedTrees.add(tree.id);
    return tree;
  }).filter(Boolean);
  const acorns = [];
  for (const [pocketIndex, tree] of pockets.entries()) {
    let count = 0;
    for (let attempt = 0; attempt < 100 && count < 4; attempt++) {
      const angle = attempt * 2.39996 + pocketIndex * .77;
      const radius = 2.1 + (attempt % 5) * .44;
      const x = tree.x + Math.sin(angle) * radius, z = tree.z + Math.cos(angle) * radius;
      if (!canStand(x, z, world, .6) || Math.hypot(x - world.encounter.x, z - world.encounter.z) < world.encounter.radius + 1
        || acorns.some(a => Math.hypot(x - a.x, z - a.z) < 1.1)) continue;
      acorns.push({ id: `acorn-${pocketIndex + 1}-${++count}`, x, z, name: 'Acorn', collected: false, tree: tree.id });
    }
  }
  const nutMeshes = new THREE.InstancedMesh(acornGeometry, coloredMaterial, acorns.length);
  nutMeshes.name = 'Collectible woodland acorns'; nutMeshes.castShadow = true; nutMeshes.receiveShadow = true; root.add(nutMeshes);
  const glints = new THREE.InstancedMesh(new THREE.OctahedronGeometry(1, 0),
    new THREE.MeshBasicMaterial({ color: '#ffecb0', transparent: true, opacity: .68, depthWrite: false }), acorns.length);
  glints.name = 'Small acorn glints'; glints.frustumCulled = false; root.add(glints);
  function placeAcorn(acorn, index) {
    dummy.position.set(acorn.x, world.heightAt(acorn.x, acorn.z) + .025, acorn.z);
    dummy.rotation.set(.12, index * 2.4, -.10); dummy.scale.setScalar(acorn.collected ? 0 : 1); dummy.updateMatrix();
    nutMeshes.setMatrixAt(index, dummy.matrix);
    if (acorn.collected) glints.setMatrixAt(index, dummy.matrix);
  }
  acorns.forEach(placeAcorn); nutMeshes.instanceMatrix.needsUpdate = true;
  nutMeshes.computeBoundingSphere();

  // Short rough branches lie across the leaf litter. A pale broken end and a
  // small fork keep their silhouettes distinct from the round acorn pickups.
  const branchShaft = new THREE.CylinderGeometry(.72, 1, 1, 5);
  branchShaft.rotateZ(Math.PI / 2);
  const branchFork = branchShaft.clone(); branchFork.rotateY(-.7);
  const stickGeometry = geometry([
    [branchShaft, '#725039', 0, .067, 0, .61, .047, .048],
    [branchShaft, '#a37c52', .297, .067, 0, .009, .036, .036],
    [branchFork, '#73583d', .13, .073, .058, .22, .025, .17],
    [lowSphere, '#604834', -.10, .071, .013, .053, .046, .05],
  ]);
  branchShaft.dispose(); branchFork.dispose();
  const sticks = [];
  // Two early pockets can be visited before the northern ambush, with further
  // fallen wood distributed along the rest of the first region's forest road.
  const stickAnchors = [[-3, 51], [-2, 9], [-44, 38], [-67, 14], [-92, 36], [-114, 44], [-146, 16]];
  for (const [pocketIndex, [anchorX, anchorZ]] of stickAnchors.entries()) {
    let count = 0;
    for (let attempt = 0; attempt < 120 && count < 2; attempt++) {
      const angle = attempt * 2.39996 + pocketIndex * .81;
      const radius = .55 + (attempt % 12) * .38;
      const x = anchorX + Math.sin(angle) * radius, z = anchorZ + Math.cos(angle) * radius;
      if (!canStand(x, z, world, .65)
        || Math.hypot(x - world.encounter.x, z - world.encounter.z) < world.encounter.radius + 1
        || acorns.some(a => Math.hypot(x - a.x, z - a.z) < 1.6)
        || sticks.some(s => Math.hypot(x - s.x, z - s.z) < 2.5)) continue;
      sticks.push({ id: `stick-${pocketIndex + 1}-${++count}`, x, z, name: 'Fallen stick', collected: false });
    }
  }
  const stickMeshes = new THREE.InstancedMesh(stickGeometry, coloredMaterial, sticks.length);
  stickMeshes.name = 'Collectible fallen sticks'; stickMeshes.castShadow = true; stickMeshes.receiveShadow = true; root.add(stickMeshes);
  const stickGlints = new THREE.InstancedMesh(new THREE.OctahedronGeometry(1, 0),
    new THREE.MeshBasicMaterial({ color: '#e8ddbe', transparent: true, opacity: .55, depthWrite: false }), sticks.length);
  stickGlints.name = 'Small fallen-stick glints'; stickGlints.frustumCulled = false; root.add(stickGlints);
  function placeStick(stick, index) {
    dummy.position.set(stick.x, world.heightAt(stick.x, stick.z) + .03, stick.z);
    dummy.rotation.set(0, index * 1.87 + .42, 0); dummy.scale.setScalar(stick.collected ? 0 : 1); dummy.updateMatrix();
    stickMeshes.setMatrixAt(index, dummy.matrix);
    if (stick.collected) stickGlints.setMatrixAt(index, dummy.matrix);
  }
  sticks.forEach(placeStick); stickMeshes.instanceMatrix.needsUpdate = true; stickMeshes.computeBoundingSphere();

  function closestRoad(tree) {
    let result = { x: 0, z: tree.z }, distance = Infinity;
    for (const path of world.paths) for (let i = 1; i < path.length; i++) {
      const a = path[i - 1], b = path[i], dx = b.x - a.x, dz = b.z - a.z;
      const t = THREE.MathUtils.clamp(((tree.x - a.x) * dx + (tree.z - a.z) * dz) / (dx * dx + dz * dz), 0, 1);
      const p = { x: a.x + dx * t, z: a.z + dz * t }, d = Math.hypot(tree.x - p.x, tree.z - p.z);
      if (d < distance) { distance = d; result = p; }
    }
    return result;
  }
  const nearby = [];
  function clearGround(x, z, ownTree) {
    // A squirrel is smaller than the player's collider, and reaches the bark of
    // its own tree. Other trunks, buildings and the boundary still block it.
    // Only the colliders filed near it are asked, not the whole world's.
    if (world.heightAt(x, z) < .6 || x < world.bounds.minX + 1 || x > world.bounds.maxX - 1 || z < world.bounds.minZ + 1) return false;
    const near = world.nearColliders ? world.nearColliders(x, z, .2, nearby) : world.colliders;
    return !near.some(c => {
      if (Math.hypot(c.x - ownTree.x, c.z - ownTree.z) < .01) return false;
      return c.r !== undefined ? Math.hypot(x - c.x, z - c.z) < c.r + .13
        : Math.abs(x - c.x) < c.hx + .13 && Math.abs(z - c.z) < c.hz + .13;
    });
  }
  function clearSegment(a, b, tree) {
    const steps = Math.ceil(Math.hypot(a.x - b.x, a.z - b.z) / .15);
    for (let i = 0; i <= steps; i++) {
      const t = i / Math.max(1, steps);
      if (!clearGround(THREE.MathUtils.lerp(a.x, b.x, t), THREE.MathUtils.lerp(a.z, b.z, t), tree)) return false;
    }
    return true;
  }
  const squirrels = [];
  const branchGeo = new THREE.CylinderGeometry(.065, .14, 1, 6);
  for (const [index, tree] of [pockets[0], pockets[1], pockets[3], pockets[4]].filter(Boolean).entries()) {
    const road = closestRoad(tree), initialAngle = Math.atan2(road.x - tree.x, road.z - tree.z);
    let home, radial;
    for (let i = 0; i < 24; i++) {
      const angle = initialAngle + (i % 2 ? 1 : -1) * Math.ceil(i / 2) * .22;
      const candidate = { x: tree.x + Math.sin(angle) * 3.2, z: tree.z + Math.cos(angle) * 3.2 };
      if (clearSegment(candidate, tree, tree) && canStand(candidate.x, candidate.z, world)) {
        home = candidate; radial = new THREE.Vector3(Math.sin(angle), 0, Math.cos(angle)); break;
      }
    }
    if (!home) continue;
    const group = new THREE.Group(); group.name = `Red squirrel ${index + 1}`; root.add(group);
    const body = new THREE.Mesh(bodyGeometry, coloredMaterial); group.add(body);
    const tail = new THREE.Mesh(tailGeometry, coloredMaterial); group.add(tail);
    const legs = [];
    for (const side of [-1, 1]) for (const front of [false, true]) {
      const leg = new THREE.Mesh(legGeometry, coloredMaterial); leg.position.set(side * .11, .17, front ? .16 : -.18);
      group.add(leg); legs.push({ mesh: leg, front, side });
    }
    group.traverse(object => { if (object.isMesh) object.castShadow = true; });
    // Keep the entire animal (including its raised tail) below the lowest leaf
    // lobes, which begin around 46% of the tree's height. A low branch makes
    // the climb and the squirrel's watchful perch readable from the trail.
    const branchHeight = Math.min(tree.trunkHeight - .5, tree.height * .30);
    const axis = new THREE.Vector3(...tree.axis);
    const branchStart = new THREE.Vector3(tree.base.x, tree.base.y, tree.base.z).addScaledVector(axis, branchHeight);
    const branchEnd = branchStart.clone().addScaledVector(radial, 1.15); branchEnd.y += .15;
    // A real branch attached to this exact trunk gives the climbing animal a
    // visible destination just under the canopy.
    const branch = new THREE.Mesh(branchGeo, new THREE.MeshStandardMaterial({ color: '#795e41', roughness: 1 }));
    branch.position.copy(branchStart).lerp(branchEnd, .5);
    const branchDirection = branchEnd.clone().sub(branchStart);
    branch.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), branchDirection.clone().normalize());
    branch.scale.y = branchDirection.length(); branch.castShadow = true; root.add(branch);
    squirrels.push({ group, body, tail, legs, tree, home, radial, axis, branchHeight, branchStart,
      x: home.x, z: home.z, mode: 'idle', clock: index * 1.7, timer: 3 + index, target: home,
      elevation: 0, flees: 0, climbs: 0, branchStep: 0 });
  }

  // Pawpaws form low, broad-leaved understory patches. Folded leaf surfaces and
  // drooping tips distinguish these saplings from the tall round oak canopies.
  // All ripe fruit is on the ground and collectible; the branches carry leaves.
  const leafFront = new THREE.BufferGeometry();
  leafFront.setAttribute('position', new THREE.Float32BufferAttribute([
    0, 0, 0, -.12, .012, .18, -.17, -.008, .34, -.11, -.09, .53,
    0, -.22, .71, .11, -.09, .53, .17, -.008, .34, .12, .012, .18,
    0, .04, .20, 0, .015, .39, 0, -.10, .57,
  ], 3));
  leafFront.setIndex([0, 1, 8, 0, 8, 7, 1, 2, 8, 2, 9, 8, 2, 3, 9, 3, 10, 9,
    3, 4, 10, 4, 5, 10, 5, 9, 10, 5, 6, 9, 6, 8, 9, 6, 7, 8]);
  const flatLeaf = leafFront.toNonIndexed(), leafPositions = [...flatLeaf.attributes.position.array];
  // Separate reverse-facing vertices provide proper undersides without changing
  // the shared critter material or cancelling the surface normals.
  const frontLength = leafPositions.length;
  for (let i = 0; i < frontLength; i += 9)
    leafPositions.push(...leafPositions.slice(i + 6, i + 9), ...leafPositions.slice(i + 3, i + 6), ...leafPositions.slice(i, i + 3));
  const leaf = new THREE.BufferGeometry();
  leaf.setAttribute('position', new THREE.Float32BufferAttribute(leafPositions, 3)); leaf.computeVertexNormals();
  leafFront.dispose(); flatLeaf.dispose();
  const slimWood = new THREE.CylinderGeometry(.7, 1, 1, 6);
  const saplingParts = [[slimWood, '#796a42', 0, 1.15, 0, .088, 2.3, .082]];
  for (let b = 0; b < 8; b++) {
    const angle = b * 2.39996, h = .94 + b * .16;
    saplingParts.push([slimWood, '#796a42', Math.sin(angle) * .26, h + .12, Math.cos(angle) * .26,
      .026, .60, .026, 1.17, angle]);
    for (let l = 0; l < 3; l++) {
      const direction = angle + (l - 1) * .64;
      saplingParts.push([leaf, ['#587239', '#6c843f', '#7d9149'][(b + l) % 3],
        Math.sin(angle) * (.29 + l * .08), h + .20 + l * .035, Math.cos(angle) * (.29 + l * .08),
        .79, .86, .79, -.12 + l * .06, direction]);
    }
  }
  for (let i = 0; i < 3; i++) saplingParts.push([leaf, '#82974e', 0, 2.33, 0, .72, .8, .8, -.2, i * 2.1]);
  const saplingGeometry = geometry(saplingParts); slimWood.dispose(); leaf.dispose();
  const pawpawBody = sphere.clone(), bodyPoints = pawpawBody.attributes.position;
  for (let i = 0; i < bodyPoints.count; i++) {
    const x = bodyPoints.getX(i), y = bodyPoints.getY(i), z = bodyPoints.getZ(i);
    bodyPoints.setXYZ(i, x * .105 * (1 + z * .18) + z * z * .045, y * .115 + .125, z * .23);
  }
  pawpawBody.computeVertexNormals();
  const fruitGeometry = geometry([
    [pawpawBody, '#a8ad50', 0, 0, 0, 1, 1, 1],
    [cone, '#725f35', .037, .125, -.246, .021, .075, .019, Math.PI / 2],
    [lowSphere, '#ccbb66', .016, .218, .065, .064, .020, .10],
    [lowSphere, '#807644', .087, .181, -.035, .009, .012, .014],
    [lowSphere, '#847647', .058, .227, .025, .010, .007, .012],
  ]);
  pawpawBody.dispose();
  const fruits = [], fruitPatches = [];
  const fruitAnchors = [[-3, 49], [-6, 9], [-73, 20], [-99, 34], [-121, 20], [-153, 33]];
  const pickupSites = [...acorns, ...sticks];
  const occupiedPlaces = [...Object.values(world.npcPositions), world.training, world.repairBench];
  for (const [patchIndex, [anchorX, anchorZ]] of fruitAnchors.entries()) {
    for (let attempt = 0; attempt < 150; attempt++) {
      const angle = attempt * 2.39996, radius = attempt ? .6 + (attempt % 14) * .38 : 0;
      const x = anchorX + Math.sin(angle) * radius, z = anchorZ + Math.cos(angle) * radius;
      const road = closestRoad({ x, z });
      if (!canStand(x, z, world, 1.15) || Math.hypot(x - road.x, z - road.z) < 3.65
        || Math.hypot(x - world.encounter.x, z - world.encounter.z) < world.encounter.radius + 4
        || occupiedPlaces.some(place => Math.hypot(x - place.x, z - place.z) < 3.7)
        || squirrels.some(s => Math.hypot(x - s.tree.x, z - s.tree.z) < 5.1)
        || pickupSites.some(site => Math.hypot(x - site.x, z - site.z) < 1.9)) continue;
      const patchFruit = [];
      for (let f = 0; f < 56 && patchFruit.length < 2; f++) {
        const a = f * 2.39996 + patchIndex, r = 1.07 + (f % 4) * .16;
        const fx = x + Math.sin(a) * r, fz = z + Math.cos(a) * r;
        if (!canStand(fx, fz, world, .65)
          || [...pickupSites, ...fruits].some(site => Math.hypot(fx - site.x, fz - site.z) < 2.35)
          || patchFruit.some(site => Math.hypot(fx - site.x, fz - site.z) < 2.15)
          || occupiedPlaces.some(place => Math.hypot(fx - place.x, fz - place.z) < 2.8)) continue;
        patchFruit.push({ id: `pawpaw-${patchIndex + 1}-${patchFruit.length + 1}`, x: fx, z: fz,
          name: 'Ripe pawpaw', collected: false, patch: `pawpaw-patch-${patchIndex + 1}` });
      }
      if (patchFruit.length !== 2) continue;
      fruitPatches.push({ id: `pawpaw-patch-${patchIndex + 1}`, x, z, name: 'Pawpaw patch' });
      fruits.push(...patchFruit);
      world.colliders.push({ x, z, r: .12, kind: 'pawpaw-sapling' });
      break;
    }
  }
  const saplings = new THREE.InstancedMesh(saplingGeometry, coloredMaterial, fruitPatches.length);
  saplings.name = 'Pawpaw saplings'; saplings.castShadow = true; saplings.receiveShadow = true; root.add(saplings);
  for (const [i, patch] of fruitPatches.entries()) {
    dummy.position.set(patch.x, world.heightAt(patch.x, patch.z), patch.z);
    dummy.rotation.set(0, i * 1.63, 0); dummy.scale.setScalar(.97 + (i % 3) * .07); dummy.updateMatrix();
    saplings.setMatrixAt(i, dummy.matrix);
  }
  saplings.instanceMatrix.needsUpdate = true; saplings.computeBoundingSphere();
  const fruitMeshes = new THREE.InstancedMesh(fruitGeometry, coloredMaterial, fruits.length);
  fruitMeshes.name = 'Collectible ripe pawpaws'; fruitMeshes.castShadow = true; fruitMeshes.receiveShadow = true; root.add(fruitMeshes);
  const fruitGlints = new THREE.InstancedMesh(new THREE.OctahedronGeometry(1, 0),
    new THREE.MeshBasicMaterial({ color: '#f5d378', transparent: true, opacity: .60, depthWrite: false }), fruits.length);
  fruitGlints.name = 'Small ripe-pawpaw glints'; fruitGlints.frustumCulled = false; root.add(fruitGlints);
  function placeFruit(fruit, index) {
    dummy.position.set(fruit.x, world.heightAt(fruit.x, fruit.z) + .025, fruit.z);
    dummy.rotation.set(.03, index * 1.91, -.08); dummy.scale.setScalar(fruit.collected ? 0 : 1); dummy.updateMatrix();
    fruitMeshes.setMatrixAt(index, dummy.matrix);
    if (fruit.collected) fruitGlints.setMatrixAt(index, dummy.matrix);
  }
  fruits.forEach(placeFruit); fruitMeshes.instanceMatrix.needsUpdate = true; fruitMeshes.computeBoundingSphere();

  function beginClimb(squirrel) {
    squirrel.mode = 'climb'; squirrel.elevation = .25; squirrel.climbs++;
  }
  function startFlee(squirrel) {
    squirrel.mode = 'flee'; squirrel.flees++;
    squirrel.target = { x: squirrel.tree.x + squirrel.radial.x * (squirrel.tree.radius + .12),
      z: squirrel.tree.z + squirrel.radial.z * (squirrel.tree.radius + .12) };
  }
  const basis = new THREE.Matrix4(), climbX = new THREE.Vector3(), climbY = new THREE.Vector3(), climbZ = new THREE.Vector3();
  function attachToTrunk(squirrel, descending = false) {
    const { tree, elevation, radial, axis } = squirrel;
    const radius = THREE.MathUtils.lerp(tree.radius, tree.trunkTopRadius, elevation / tree.trunkHeight);
    squirrel.group.position.set(tree.base.x, tree.base.y, tree.base.z).addScaledVector(axis, elevation).addScaledVector(radial, radius + .065);
    // Local nose (+Z) follows the trunk; belly (-Y) rests against its bark.
    climbZ.copy(axis).multiplyScalar(descending ? -1 : 1);
    climbY.copy(radial).addScaledVector(climbZ, -radial.dot(climbZ)).normalize();
    climbX.crossVectors(climbY, climbZ).normalize();
    basis.makeBasis(climbX, climbY, climbZ); squirrel.group.quaternion.setFromRotationMatrix(basis);
    squirrel.x = squirrel.group.position.x; squirrel.z = squirrel.group.position.z;
  }
  let time = 0;
  /** Where all of this is: far beyond it, the woodland needs no frame's work, and its glints are already hidden. */
  let extent = null;
  function woodlandExtent() {
    const points = [...acorns, ...sticks, ...fruits, ...squirrels.map(squirrel => squirrel.home)];
    const x = points.reduce((sum, p) => sum + p.x, 0) / points.length, z = points.reduce((sum, p) => sum + p.z, 0) / points.length;
    return { x, z, radius: Math.max(...points.map(p => Math.hypot(p.x - x, p.z - z))) };
  }
  function update(dt, playerPosition, active = true) {
    if (!active) return;
    extent ??= woodlandExtent();
    if (Math.hypot(playerPosition.x - extent.x, playerPosition.z - extent.z) > extent.radius + 120) return;
    dt = Math.min(Math.max(dt, 0), .05); time += dt;
    for (let i = 0; i < acorns.length; i++) {
      const acorn = acorns[i], distance = Math.hypot(acorn.x - playerPosition.x, acorn.z - playerPosition.z);
      const pulse = .68 + Math.max(0, Math.sin(time * 2.3 + i * 1.8)) * .55;
      const visible = !acorn.collected && distance < 18;
      dummy.position.set(acorn.x, world.heightAt(acorn.x, acorn.z) + .43, acorn.z);
      dummy.rotation.set(0, time * .7 + i, .2); dummy.scale.set(.034 * pulse, .13 * pulse, .034 * pulse);
      if (!visible) dummy.scale.setScalar(0);
      dummy.updateMatrix(); glints.setMatrixAt(i, dummy.matrix);
    }
    glints.instanceMatrix.needsUpdate = true;
    for (const [i, stick] of sticks.entries()) {
      const distance = Math.hypot(stick.x - playerPosition.x, stick.z - playerPosition.z);
      const pulse = .75 + Math.max(0, Math.sin(time * 1.8 + i * 2.1)) * .38;
      dummy.position.set(stick.x, world.heightAt(stick.x, stick.z) + .36, stick.z);
      dummy.rotation.set(0, time * .5 + i, .25); dummy.scale.set(.029 * pulse, .095 * pulse, .029 * pulse);
      if (stick.collected || distance >= 18) dummy.scale.setScalar(0);
      dummy.updateMatrix(); stickGlints.setMatrixAt(i, dummy.matrix);
    }
    stickGlints.instanceMatrix.needsUpdate = true;
    for (const [i, fruit] of fruits.entries()) {
      const distance = Math.hypot(fruit.x - playerPosition.x, fruit.z - playerPosition.z);
      const pulse = .75 + Math.max(0, Math.sin(time * 2 + i * 1.7)) * .35;
      dummy.position.set(fruit.x, world.heightAt(fruit.x, fruit.z) + .44, fruit.z);
      dummy.rotation.set(0, time * .55 + i, .20); dummy.scale.set(.035 * pulse, .115 * pulse, .035 * pulse);
      if (fruit.collected || distance >= 18) dummy.scale.setScalar(0);
      dummy.updateMatrix(); fruitGlints.setMatrixAt(i, dummy.matrix);
    }
    fruitGlints.instanceMatrix.needsUpdate = true;
    for (const squirrel of squirrels) {
      squirrel.clock += dt;
      const distance = Math.hypot(squirrel.x - playerPosition.x, squirrel.z - playerPosition.z);
      const homeDistance = Math.hypot(squirrel.home.x - playerPosition.x, squirrel.home.z - playerPosition.z);
      if ((squirrel.mode === 'idle' || squirrel.mode === 'forage') && distance < 6.3) startFlee(squirrel);
      if (squirrel.mode === 'idle') {
        squirrel.timer -= dt;
        if (squirrel.timer <= 0) {
          const angle = squirrel.clock * .53;
          const target = { x: squirrel.home.x + Math.sin(angle) * .85, z: squirrel.home.z + Math.cos(angle) * .85 };
          if (clearSegment(squirrel, target, squirrel.tree) && clearSegment(target, squirrel.tree, squirrel.tree)) {
            squirrel.target = target; squirrel.mode = 'forage';
          } else squirrel.timer = 2;
        }
      }
      if (squirrel.mode === 'flee' || squirrel.mode === 'forage') {
        const dx = squirrel.target.x - squirrel.x, dz = squirrel.target.z - squirrel.z, length = Math.hypot(dx, dz);
        const speed = squirrel.mode === 'flee' ? 10.2 : 1.7, step = Math.min(length, dt * speed);
        if (length > .001) {
          const x = squirrel.x + dx / length * step, z = squirrel.z + dz / length * step;
          if (clearGround(x, z, squirrel.tree)) { squirrel.x = x; squirrel.z = z; }
          else { squirrel.mode = 'idle'; squirrel.timer = .2; }
          squirrel.group.rotation.set(0, Math.atan2(dx, dz), 0);
        }
        if (length <= step + .015) {
          if (squirrel.mode === 'flee') beginClimb(squirrel);
          else { squirrel.mode = 'idle'; squirrel.timer = 3.5 + Math.sin(squirrel.clock) * 1.5; }
        }
      }
      if (squirrel.mode === 'climb') {
        squirrel.elevation = Math.min(squirrel.branchHeight, squirrel.elevation + dt * 4.8);
        attachToTrunk(squirrel);
        if (squirrel.elevation >= squirrel.branchHeight) { squirrel.mode = 'perch'; squirrel.timer = 8; squirrel.branchStep = 0; }
      } else if (squirrel.mode === 'perch') {
        squirrel.branchStep = Math.min(1, squirrel.branchStep + dt * 2.7);
        squirrel.group.rotation.set(0, Math.atan2(squirrel.radial.x, squirrel.radial.z), 0);
        squirrel.group.position.copy(squirrel.branchStart).addScaledVector(squirrel.radial, .35 + squirrel.branchStep * .45);
        squirrel.group.position.y += .12;
        squirrel.x = squirrel.group.position.x; squirrel.z = squirrel.group.position.z;
        squirrel.timer -= dt;
        if (squirrel.timer <= 0 && homeDistance > 11) squirrel.mode = 'descend';
      } else if (squirrel.mode === 'descend') {
        squirrel.elevation = Math.max(.28, squirrel.elevation - dt * 2.7); attachToTrunk(squirrel, true);
        if (homeDistance < 8) squirrel.mode = 'climb';
        else if (squirrel.elevation <= .28) { squirrel.mode = 'forage'; squirrel.target = squirrel.home; }
      }
      const moving = ['forage', 'flee', 'climb', 'descend'].includes(squirrel.mode);
      const stride = squirrel.clock * (squirrel.mode === 'flee' ? 26 : squirrel.mode === 'forage' ? 13 : 21);
      if (!['climb', 'perch', 'descend'].includes(squirrel.mode)) {
        squirrel.group.position.set(squirrel.x, world.heightAt(squirrel.x, squirrel.z) + (moving ? Math.abs(Math.sin(stride)) * .085 : 0), squirrel.z);
        squirrel.group.rotation.x = moving ? Math.sin(stride) * .11 : 0;
      }
      const nibble = !moving ? Math.sin(squirrel.clock * 9) * .022 : 0;
      squirrel.body.position.y = nibble;
      squirrel.body.rotation.x = !moving ? -.13 + Math.sin(squirrel.clock * 1.8) * .035 : Math.sin(stride) * .045;
      squirrel.tail.rotation.z = Math.sin(squirrel.clock * 3.7) * (moving ? .09 : .19);
      squirrel.tail.rotation.x = moving ? Math.sin(stride - .8) * .19 : Math.sin(squirrel.clock * 2.1) * .075;
      for (const leg of squirrel.legs) {
        leg.mesh.rotation.x = moving ? Math.sin(stride + (leg.front ? Math.PI : 0) + leg.side * .20) * .83
          : leg.front ? -.7 + nibble * 5 : .08;
      }
      squirrel.group.visible = distance < 75;
    }
  }
  // Initialize poses and glints before the first animation tick.
  update(0, { x: 0, z: 43 });
  return {
    update,
    setObserver(position) {
      if (!Number.isFinite(position?.x) || !Number.isFinite(position?.z)) return;
      for (const squirrel of squirrels) squirrel.group.visible = Math.hypot(squirrel.x-position.x,squirrel.z-position.z)<75;
    },
    nearestAcorn(position, maxDistance = 2) {
      let nearest = null, distance = maxDistance;
      for (const acorn of acorns) {
        if (acorn.collected) continue;
        const d = Math.hypot(acorn.x - position.x, acorn.z - position.z);
        if (d <= distance) { distance = d; nearest = acorn; }
      }
      return nearest ? { id: nearest.id, x: nearest.x, z: nearest.z, name: nearest.name } : null;
    },
    collect(id) {
      const index = acorns.findIndex(acorn => acorn.id === id);
      if (index < 0 || acorns[index].collected) return false;
      acorns[index].collected = true; placeAcorn(acorns[index], index);
      nutMeshes.instanceMatrix.needsUpdate = true; glints.instanceMatrix.needsUpdate = true; return true;
    },
    restoreCollected(ids) {
      const collected = new Set(ids);
      acorns.forEach((acorn, i) => { acorn.collected = collected.has(acorn.id); placeAcorn(acorn, i); });
      nutMeshes.instanceMatrix.needsUpdate = true; glints.instanceMatrix.needsUpdate = true;
    },
    nearestStick(position, maxDistance = 2) {
      let nearest = null, distance = maxDistance;
      for (const stick of sticks) {
        if (stick.collected) continue;
        const d = Math.hypot(stick.x - position.x, stick.z - position.z);
        if (d <= distance) { distance = d; nearest = stick; }
      }
      return nearest ? { id: nearest.id, x: nearest.x, z: nearest.z, name: nearest.name } : null;
    },
    collectStick(id) {
      const index = sticks.findIndex(stick => stick.id === id);
      if (index < 0 || sticks[index].collected) return false;
      sticks[index].collected = true; placeStick(sticks[index], index);
      stickMeshes.instanceMatrix.needsUpdate = true; stickGlints.instanceMatrix.needsUpdate = true; return true;
    },
    restoreCollectedSticks(ids) {
      const collected = new Set(ids);
      sticks.forEach((stick, i) => { stick.collected = collected.has(stick.id); placeStick(stick, i); });
      stickMeshes.instanceMatrix.needsUpdate = true; stickGlints.instanceMatrix.needsUpdate = true;
    },
    nearestFruit(position, maxDistance = 2) {
      let nearest = null, distance = maxDistance;
      for (const fruit of fruits) {
        if (fruit.collected) continue;
        const d = Math.hypot(fruit.x - position.x, fruit.z - position.z);
        if (d <= distance) { distance = d; nearest = fruit; }
      }
      return nearest ? { id: nearest.id, x: nearest.x, z: nearest.z, name: nearest.name } : null;
    },
    collectFruit(id) {
      const index = fruits.findIndex(fruit => fruit.id === id);
      if (index < 0 || fruits[index].collected) return false;
      fruits[index].collected = true; placeFruit(fruits[index], index);
      fruitMeshes.instanceMatrix.needsUpdate = true; fruitGlints.instanceMatrix.needsUpdate = true; return true;
    },
    restoreCollectedFruit(ids) {
      const collected = new Set(ids);
      fruits.forEach((fruit, i) => { fruit.collected = collected.has(fruit.id); placeFruit(fruit, i); });
      fruitMeshes.instanceMatrix.needsUpdate = true; fruitGlints.instanceMatrix.needsUpdate = true;
    },
    state() {
      return { acorns: acorns.map(({ id, x, z, collected, tree }) => ({ id, x, z, collected, tree })),
        sticks: sticks.map(({ id, x, z, collected, name }) => ({ id, x, z, collected, name })),
        fruits: fruits.map(({ id, x, z, collected, name, patch }) => ({ id, x, z, collected, name, patch })),
        fruitPatches: fruitPatches.map(patch => ({ ...patch })),
        squirrels: squirrels.map(s => ({ x: s.x, y: s.group.position.y, z: s.z, mode: s.mode,
          tree: { id: s.tree.id, x: s.tree.x, z: s.tree.z, height: s.tree.height }, flees: s.flees, climbs: s.climbs })) };
    },
  };
}

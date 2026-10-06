import * as THREE from 'three';
import { IVY_PATCHES } from './ivy-sites.js';

/** Ground-hugging, lobed ivy, with individual woody runners and short trailing
 * vines. No bush spheres or collision volumes: the harmless first lesson is
 * readable as something to pull by hand, and its walking stands stay open. */
export function createIvyView({ scene, world, ivy }) {
  const group = new THREE.Group(); group.name = "Sylvia's invasive Drent ivy"; scene.add(group);
  const materials = [0x345336, 0x52663c, 0x70814a, 0x68533c, 0x8a7b60].map(color =>
    new THREE.MeshStandardMaterial({ color, roughness: 1, flatShading: true }));
  for (const mat of materials.slice(0, 3)) { mat.side = THREE.DoubleSide; mat.vertexColors = true; }
  const leafGeometry = ivyLeafGeometry(), runnerGeometry = new THREE.CylinderGeometry(1, 1, 1, 5);
  const stakeGeometry = new THREE.BoxGeometry(1, 1, 1), geometries = [leafGeometry, runnerGeometry, stakeGeometry];
  const dummy = new THREE.Object3D(), up = new THREE.Vector3(0, 1, 0), a = new THREE.Vector3(), b = new THREE.Vector3();
  const parts = IVY_PATCHES.map((patch, patchIndex) => {
    const base = world.heightAt(patch.x, patch.z);
    const patchGroup = new THREE.Group(); patchGroup.name = patch.name; patchGroup.userData.ivyId = patch.id;
    patchGroup.position.set(patch.x, base, patch.z); group.add(patchGroup);
    const growth = new THREE.Group(); growth.name = `${patch.name} living runners`; patchGroup.add(growth);
    const leafLists = [[], [], []], runners = [];
    const noise = n => { const s = Math.sin(n * 127.1 + patchIndex * 311.7 + 47.3) * 43758.5453; return s - Math.floor(s); };
    const ground = (x, z) => world.heightAt(patch.x + x, patch.z + z) - base;
    const leaf = (x, y, z, size, angle, tilt, seed) => leafLists[Math.floor(noise(seed) * 3)].push({ x, y, z, size, angle, tilt });
    // A loose fan of winding runners has gaps and visible woody connections,
    // avoiding the silhouette of a round shrub or a uniform rectangular bed.
    for (let trail = 0; trail < 9; trail++) {
      const angle = trail * Math.PI * 2 / 9 + patch.yaw, length = .67 + noise(trail + 2) * .33;
      let previous = { x: -.12 + noise(trail + 3) * .24, z: -.12 + noise(trail + 4) * .24 };
      previous.y = ground(previous.x, previous.z) + .055;
      for (let step = 1; step <= 7; step++) {
        const t = step / 7, bend = Math.sin(t * 5 + trail) * .13 * t;
        const x = Math.cos(angle + bend) * patch.spreadX * length * t;
        const z = Math.sin(angle + bend) * patch.spreadZ * length * t;
        const y = ground(x, z) + .05 + Math.sin(t * Math.PI) * .04;
        runners.push({ a: previous, b: { x, y, z }, radius: .017 + (1 - t) * .012 });
        for (const side of [-1, 1]) {
          const seed = trail * 31 + step * 3 + side, spread = .10 + noise(seed + 8) * .095;
          const lx = x + Math.cos(angle + side * Math.PI / 2) * spread;
          const lz = z + Math.sin(angle + side * Math.PI / 2) * spread;
          leaf(lx, ground(lx, lz) + .075 + noise(seed + 10) * .045, lz,
            .29 + noise(seed + 1) * .20, -angle + side * .8, -.07 + noise(seed + 5) * .14, seed);
        }
        previous = { x, y, z };
      }
    }
    // Slim remnants of an old garden support show how ivy climbs and trails.
    // They remain after clearing, so the cleaned location has a lasting trace.
    for (let n = 0; n < 2; n++) {
      const sx = (n ? .32 : -.3) * patch.spreadX, sz = (n ? -.12 : .1) * patch.spreadZ;
      const sy = ground(sx, sz), height = patch.stakeHeight * (n ? .83 : 1);
      const stake = new THREE.Mesh(stakeGeometry, materials[4]); stake.name = 'Weathered ivy support';
      stake.position.set(sx, sy + height / 2, sz); stake.scale.set(.055, height, .06); stake.rotation.z = n ? -.035 : .035;
      stake.castShadow = true; stake.receiveShadow = true; patchGroup.add(stake);
      let previous = { x: sx, y: sy + .055, z: sz };
      for (let step = 1; step <= 8; step++) {
        const t = step / 8, angle = t * Math.PI * 3 + n;
        const x = sx + Math.sin(angle) * .06, z = sz + Math.cos(angle) * .06, y = sy + height * t;
        runners.push({ a: previous, b: { x, y, z }, radius: .014 });
        const side = step % 2 ? 1 : -1, seed = 700 + n * 21 + step;
        leaf(x + side * .11, y, z + .025, .28 + noise(seed) * .12, side * .45, 1.18, seed);
        previous = { x, y, z };
      }
      // A bowed shoot extends away from the support instead of forming a cone.
      for (let step = 1; step <= 5; step++) {
        const t = step / 5, side = n ? 1 : -1;
        const x = sx + side * t * .48, z = sz + t * .15, y = sy + height - t * t * height * .68;
        runners.push({ a: previous, b: { x, y, z }, radius: .012 });
        leaf(x, y + .015, z + .06, .27 + t * .04, side * .8, .55, 820 + n * 20 + step);
        previous = { x, y, z };
      }
    }
    const leaves = leafLists.map((list, index) => {
      const mesh = new THREE.InstancedMesh(leafGeometry, materials[index], list.length);
      mesh.name = `${patch.name} lobed leaves ${index + 1}`;
      list.forEach((leaf, i) => {
        dummy.position.set(leaf.x, leaf.y, leaf.z); dummy.scale.setScalar(leaf.size);
        dummy.rotation.set(-Math.PI / 2 + leaf.tilt, 0, leaf.angle); dummy.updateMatrix(); mesh.setMatrixAt(i, dummy.matrix);
      });
      mesh.instanceMatrix.needsUpdate = true; mesh.castShadow = true; mesh.receiveShadow = true;
      mesh.userData.fullCount = list.length; growth.add(mesh); return mesh;
    });
    const woody = new THREE.InstancedMesh(runnerGeometry, materials[3], runners.length); woody.name = `${patch.name} woody stems`;
    runners.forEach((runner, i) => {
      a.set(runner.a.x, runner.a.y, runner.a.z); b.set(runner.b.x, runner.b.y, runner.b.z);
      dummy.position.copy(a).add(b).multiplyScalar(.5);
      dummy.quaternion.setFromUnitVectors(up, b.clone().sub(a).normalize());
      dummy.scale.set(runner.radius, a.distanceTo(b), runner.radius); dummy.updateMatrix(); woody.setMatrixAt(i, dummy.matrix);
    });
    woody.instanceMatrix.needsUpdate = true; woody.castShadow = true; woody.receiveShadow = true; growth.add(woody);
    return { patch, growth, leaves, woody };
  });
  function update() {
    const pose = ivy.pose();
    for (const part of parts) {
      part.growth.visible = !ivy.isCleared(part.patch.id);
      const progress = pose?.id === part.patch.id ? Math.max(0, Math.min(1, pose.progress || 0)) : 0;
      part.growth.position.x = progress ? Math.sin(progress * Math.PI * 14) * .015 : 0;
      for (const leaf of part.leaves) leaf.count = Math.ceil(leaf.userData.fullCount * (1 - progress * .32));
    }
  }
  function dispose() {
    group.removeFromParent();
    for (const part of parts) for (const mesh of [...part.leaves, part.woody]) mesh.dispose();
    for (const geometry of geometries) geometry.dispose();
    for (const material of materials) material.dispose();
  }
  update();
  return { group, update, dispose };
}

function ivyLeafGeometry() {
  // Five pointed lobes and a raised centre vein produce a readable ivy leaf
  // even with the world's deliberately small, faceted meshes.
  const edge = [[0, -.5], [-.26, -.30], [-.55, .08], [-.30, .12], [-.42, .48], [-.12, .28],
    [0, .72], [.12, .28], [.42, .48], [.30, .12], [.55, .08], [.26, -.30]];
  const positions = [], colors = [];
  for (let i = 0; i < edge.length; i++) {
    const [x1, y1] = edge[i], [x2, y2] = edge[(i + 1) % edge.length], tint = i % 3 ? 1 : .82;
    positions.push(0, .03, .065, x1, y1, 0, x2, y2, 0);
    for (let n = 0; n < 3; n++) colors.push(tint, tint, tint);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.computeVertexNormals();
  return geometry;
}

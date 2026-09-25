import * as THREE from 'three';
import { FARMER, FARM_ROWS } from './farming.js';

/** Four small, walkable beds. Crop geometry is instanced; a stage change never rebuilds meshes. */
export function createFarmingView({ scene, world, farming }) {
  const group = new THREE.Group(); group.name = 'Stanley commons garden'; scene.add(group);
  const material = color => new THREE.MeshStandardMaterial({ color, roughness: 1, flatShading: true });
  const soil = material(0x6d4c31), wetSoil = material(0x493a27), timber = material(0x79603c);
  const leaf = material(0x4e7332), stem = material(0x7f9150), produce = material(0xe39336);
  const unit = new THREE.BoxGeometry(1, 1, 1), round = new THREE.IcosahedronGeometry(1, 0);
  const leaves = new THREE.SphereGeometry(1, 5, 3), materials = [soil, wetSoil, timber, leaf, stem, produce];
  const geometries = [unit, round, leaves], pose = new THREE.Object3D();
  const height = (x, z) => world.heightAt(x, z);
  const box = (name, x, y, z, sx, sy, sz, mat = timber) => {
    const mesh = new THREE.Mesh(unit, mat); mesh.name = name;
    mesh.position.set(x, y, z); mesh.scale.set(sx, sy, sz); mesh.castShadow = true; mesh.receiveShadow = true; group.add(mesh); return mesh;
  };
  const beds = FARM_ROWS.map((row, index) => {
    const ground = new THREE.PlaneGeometry(2.8, 3.1, 2, 2); ground.rotateX(-Math.PI / 2);
    const vertex = ground.attributes.position;
    for (let i = 0; i < vertex.count; i++) vertex.setY(i, height(row.x + vertex.getX(i), row.z + vertex.getZ(i)) + .035);
    ground.computeVertexNormals(); geometries.push(ground);
    const bed = new THREE.Mesh(ground, soil); bed.name = `Commons row ${index + 1} soil`;
    bed.position.set(row.x, 0, row.z); bed.receiveShadow = true; group.add(bed);
    for (const dx of [-1.5, 1.5]) for (const dz of [-1.65, 1.65])
      box('Low garden stake', row.x + dx, height(row.x + dx, row.z + dz) + .14, row.z + dz, .07, .28, .07);
    const foliage = new THREE.InstancedMesh(leaves, leaf, 24), roots = new THREE.InstancedMesh(round, produce.clone(), 8);
    const stalks = new THREE.InstancedMesh(unit, stem.clone(), 8);
    materials.push(roots.material, stalks.material);
    foliage.name = `Row ${index + 1} crop leaves`; roots.name = `Row ${index + 1} crop produce`; stalks.name = `Row ${index + 1} crop stalks`;
    for (const mesh of [foliage, roots, stalks]) { mesh.castShadow = true; mesh.receiveShadow = true; mesh.frustumCulled = false; group.add(mesh); }
    return { row, bed, foliage, roots, stalks, key: null };
  });
  // A shared seed crate and watering can sit on the edge; neither blocks feet or row access.
  const supply = { x: FARMER.x + .2, z: FARMER.z - 1.9 }, y = height(supply.x, supply.z);
  box('Shared seed crate', supply.x, y + .35, supply.z, 1.15, .5, .68);
  for (let i = 0; i < 3; i++) box('Paper seed packet', supply.x - .36 + i * .36, y + .68, supply.z, .22, .2, .4, soil);
  const can = new THREE.Mesh(round, material(0x778980)); materials.push(can.material);
  can.name = 'Shared watering can'; can.position.set(supply.x + 1, y + .26, supply.z); can.scale.set(.27, .29, .23); group.add(can);
  box('Watering can spout', supply.x + 1.32, y + .37, supply.z, .35, .07, .07, can.material).rotation.z = .4;

  const instance = (mesh, index, x, y, z, sx, sy, sz, rotation = 0) => {
    pose.position.set(x, y, z); pose.scale.set(sx, sy, sz); pose.rotation.set(0, rotation, 0); pose.updateMatrix(); mesh.setMatrixAt(index, pose.matrix);
  };
  function update(playSeconds) {
    for (const part of beds) {
      const row = farming.rowState(part.row.id, playSeconds), growth = Math.floor(row.progress * 12) / 12;
      const key = `${row.crop}:${row.stage}:${growth}:${row.watered}`;
      if (part.key === key) continue; part.key = key;
      part.bed.material = row.watered ? wetSoil : soil;
      for (const mesh of [part.foliage, part.roots, part.stalks]) mesh.visible = row.stage !== 'bare';
      if (row.stage === 'bare') continue;
      const cereal = row.crop === 'barley', tobacco = row.crop === 'drent-leaf', beet = row.crop === 'beet';
      const size = .22 + .78 * growth, ripe = row.stage === 'ripe';
      part.roots.material.color.setHex(cereal ? 0xd5b15c : tobacco ? 0x74934c : beet ? 0x913c54 : 0xe58b30);
      part.stalks.material.color.setHex(cereal && ripe ? 0xc7aa65 : 0x6d8b42);
      for (let n = 0; n < 8; n++) {
        const x = row.x + (n % 2 ? .57 : -.57), z = row.z + (Math.floor(n / 2) - 1.5) * .64, ground = height(x, z) + .07;
        const tall = cereal ? 1.05 * size : tobacco ? .85 * size : .33 * size;
        instance(part.stalks, n, x, ground + tall / 2, z, .025, tall, .025);
        instance(part.roots, n, x, ground + (cereal ? tall : tobacco ? tall * .6 : .065), z,
          cereal ? .085 * size : tobacco ? .08 * size : .12 * size,
          cereal ? .22 * size : tobacco ? .12 * size : beet ? .1 * size : .075 * size,
          cereal ? .085 * size : tobacco ? .08 * size : .12 * size);
        for (let side = 0; side < 3; side++) {
          const angle = side * Math.PI * 2 / 3 + n * .55, spread = tobacco ? .18 : .105;
          instance(part.foliage, n * 3 + side, x + Math.cos(angle) * spread * size, ground + tall * (.42 + side * .15),
            z + Math.sin(angle) * spread * size, (cereal ? .025 : tobacco ? .12 : beet ? .09 : .04) * size,
            (cereal ? .20 : tobacco ? .19 : .18) * size, (cereal ? .16 : tobacco ? .31 : .19) * size, angle);
        }
      }
      for (const mesh of [part.foliage, part.roots, part.stalks]) mesh.instanceMatrix.needsUpdate = true;
    }
  }
  function dispose() { group.removeFromParent(); for (const mesh of beds.flatMap(b => [b.foliage, b.roots, b.stalks])) mesh.dispose(); for (const geometry of geometries) geometry.dispose(); for (const mat of materials) mat.dispose(); }
  update(0);
  return { group, update, dispose };
}

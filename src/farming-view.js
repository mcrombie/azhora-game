import * as THREE from 'three';
import { FARMER, ALL_FARM_ROWS as FARM_ROWS } from './farming.js';
import { ARI_GARDEN_SUPPLIES } from './ari-garden.js';

/** Small, walkable garden beds at the commons and regional farms. Crop geometry is instanced; a stage change never rebuilds meshes. */
export function createFarmingView({ scene, world, farming }) {
  const group = new THREE.Group(); group.name = 'Player garden beds'; scene.add(group);
  const material = color => new THREE.MeshStandardMaterial({ color, roughness: 1, flatShading: true });
  const soil = material(0x6d4c31), wetSoil = material(0x493a27), timber = material(0x79603c);
  const leaf = material(0x4e7332), stem = material(0x7f9150), produce = material(0xe39336);
  const unit = new THREE.BoxGeometry(1, 1, 1), round = new THREE.IcosahedronGeometry(1, 0);
  const leaves = new THREE.SphereGeometry(1, 5, 3), materials = [soil, wetSoil, timber, leaf, stem, produce];
  const flowerFace = new THREE.CircleGeometry(1, 12), petal = new THREE.SphereGeometry(1, 5, 3);
  const geometries = [unit, round, leaves, flowerFace, petal], pose = new THREE.Object3D();
  const height = (x, z) => world.heightAt(x, z);
  const box = (name, x, y, z, sx, sy, sz, mat = timber) => {
    const mesh = new THREE.Mesh(unit, mat); mesh.name = name;
    mesh.position.set(x, y, z); mesh.scale.set(sx, sy, sz); mesh.castShadow = true; mesh.receiveShadow = true; group.add(mesh); return mesh;
  };
  const beds = FARM_ROWS.map((row, index) => {
    const rowGroup = new THREE.Group(); rowGroup.name = row.name; group.add(rowGroup);
    // A bed turned by its `yaw` (6 October 2026: the Nesdor strips lie their beds end to end, long side down the
    // strip): a point in the bed's own frame, to the world. Unturned beds come out exactly where they always did.
    const yaw = Number.isFinite(row.yaw) ? row.yaw : 0, cos = Math.cos(yaw), sin = Math.sin(yaw);
    const at = (dx, dz) => [row.x + dx * cos + dz * sin, row.z - dx * sin + dz * cos];
    const ground = new THREE.PlaneGeometry(2.8, 3.1, 2, 2); ground.rotateX(-Math.PI / 2);
    const vertex = ground.attributes.position;
    for (let i = 0; i < vertex.count; i++) { const [x, z] = at(vertex.getX(i), vertex.getZ(i)); vertex.setY(i, height(x, z) + .035); }
    ground.computeVertexNormals(); geometries.push(ground);
    const bed = new THREE.Mesh(ground, soil); bed.name = `${row.name} soil`;
    bed.position.set(row.x, 0, row.z); bed.rotation.y = yaw; bed.receiveShadow = true; rowGroup.add(bed);
    for (const dx of [-1.5, 1.5]) for (const dz of [-1.65, 1.65]) {
      const [x, z] = at(dx, dz);
      rowGroup.add(box('Low garden stake', x, height(x, z) + .14, z, .07, .28, .07));
    }
    const foliage = new THREE.InstancedMesh(leaves, leaf, 24), roots = new THREE.InstancedMesh(round, produce.clone(), 8);
    const stalks = new THREE.InstancedMesh(unit, stem.clone(), 8);
    const petals = new THREE.InstancedMesh(petal, material(0xf1c735), 80);
    const seedheads = new THREE.InstancedMesh(flowerFace, material(0x4a3323), 8);
    seedheads.material.side = THREE.DoubleSide;
    petals.name = `${row.name} golden sunflower petals`; seedheads.name = `${row.name} dark sunflower seedheads`;
    materials.push(petals.material, seedheads.material);
    materials.push(roots.material, stalks.material);
    foliage.name = `Row ${index + 1} crop leaves`; roots.name = `Row ${index + 1} crop produce`; stalks.name = `Row ${index + 1} crop stalks`;
    for (const mesh of [foliage, roots, stalks, petals, seedheads]) { mesh.castShadow = true; mesh.receiveShadow = true; mesh.frustumCulled = false; rowGroup.add(mesh); }
    return { row, at, rowGroup, bed, foliage, roots, stalks, petals, seedheads, key: null };
  });
  // A shared seed crate and watering can sit on the edge; neither blocks feet or row access.
  for (const supply of [{ x: FARMER.x + .2, z: FARMER.z - 1.9 }, ARI_GARDEN_SUPPLIES]) {
  const y = height(supply.x, supply.z);
  box('Shared seed crate', supply.x, y + .35, supply.z, 1.15, .5, .68);
  for (let i = 0; i < 3; i++) box('Paper seed packet', supply.x - .36 + i * .36, y + .68, supply.z, .22, .2, .4, soil);
  const can = new THREE.Mesh(round, material(0x778980)); materials.push(can.material);
  can.name = 'Shared watering can'; can.position.set(supply.x + 1, y + .26, supply.z); can.scale.set(.27, .29, .23); group.add(can);
  box('Watering can spout', supply.x + 1.32, y + .37, supply.z, .35, .07, .07, can.material).rotation.z = .4;
  }

  const instance = (mesh, index, x, y, z, sx, sy, sz, rotation = 0, tilt = 0) => {
    pose.position.set(x, y, z); pose.scale.set(sx, sy, sz); pose.rotation.set(tilt, rotation, 0); pose.updateMatrix(); mesh.setMatrixAt(index, pose.matrix);
  };
  function update(playSeconds, observer = null) {
    for (const part of beds) {
      part.rowGroup.visible = !observer || Math.hypot(part.row.x - observer.x, part.row.z - observer.z) < 110;
      if (!part.rowGroup.visible) continue;
      const row = farming.rowState(part.row.id, playSeconds), growth = Math.floor(row.progress * 12) / 12;
      // Bridge rye lodges on rich ground (src/farming.js): a heart-3 bed lays its ripening rye over.
      const lodged = row.crop === 'bridge-rye' && row.heart >= 3 && growth >= .6;
      const key = `${row.crop}:${row.stage}:${growth}:${row.watered}:${lodged}`;
      if (part.key === key) continue; part.key = key;
      part.bed.material = row.watered ? wetSoil : soil;
      for (const mesh of [part.foliage, part.roots, part.stalks]) mesh.visible = row.stage !== 'bare';
      const sunflower = row.crop === 'sunflower', flowering = sunflower && growth >= .58;
      part.petals.visible = flowering; part.seedheads.visible = flowering;
      if (row.stage === 'bare') continue;
      part.roots.visible = !sunflower;
      const barley = row.crop === 'barley', rye = row.crop === 'bridge-rye', cereal = barley || rye, tobacco = row.crop === 'drent-leaf', beet = row.crop === 'beet';
      // The Caricas three (6 October 2026): tall grey-eared rye, bushy beans in pod, and red-fruited canes.
      const beans = row.crop === 'field-beans', canes = row.crop === 'soft-fruit';
      // Nethereum and Nesdor (6 October 2026): flood oats in loose nodding panicles, short meadow grass in seed, and floodwheat's
      // bronze bearded heads on medium straw. All three carry their heads on top of the stalk, as barley and rye do.
      const oats = row.crop === 'flood-oats', hay = row.crop === 'meadow-hay', wheat = row.crop === 'floodwheat', headed = cereal || oats || hay || wheat;
      const size = .22 + .78 * growth, ripe = row.stage === 'ripe';
      part.roots.material.color.setHex(barley ? 0xd5b15c : rye ? (ripe ? 0xb7a678 : 0x93a06a) : oats ? (ripe ? 0xdccb8f : 0xa4b66f) : hay ? (ripe ? 0xb0a35f : 0x8aa34f)
        : wheat ? (ripe ? 0xa8692f : 0x9fae62) : tobacco ? 0x74934c : beet ? 0x913c54
        : beans ? (ripe ? 0x3d3326 : 0x6e8f3c) : canes ? (growth >= .7 ? 0xb3283c : 0x9cb04e) : 0xe58b30);
      part.stalks.material.color.setHex(cereal && ripe ? (rye ? 0xb9a77a : 0xc7aa65) : oats && ripe ? 0xcdb985 : wheat && ripe ? 0xc8a764 : hay ? (ripe ? 0x9a9a55 : 0x6f9142)
        : canes ? 0x7a4b3a : beans && ripe ? 0x5b5a33 : 0x6d8b42);
      for (let n = 0; n < 8; n++) {
        const [x, z] = part.at(n % 2 ? .57 : -.57, (Math.floor(n / 2) - 1.5) * .64), ground = height(x, z) + .07;
        const tall = sunflower ? (1.5 + n % 3 * .12) * size : rye ? 1.35 * size : oats ? 1.2 * size : wheat ? 1.15 * size : hay ? (.55 + n % 3 * .08) * size
          : cereal ? 1.05 * size : tobacco ? .85 * size : beans ? .62 * size : canes ? (.82 + n % 3 * .08) * size : .33 * size;
        const tilt = lodged ? .95 + n % 3 * .12 : 0, upright = Math.cos(tilt), over = Math.sin(tilt);
        const thin = sunflower ? .045 : canes ? .032 : hay ? .018 : .025;
        instance(part.stalks, n, x, ground + tall / 2 * upright, z + tall / 2 * over, thin, tall, thin, 0, tilt);
        // An oat panicle hangs its head; the others hold theirs up.
        const head = oats ? .12 : hay ? .035 : wheat ? .09 : cereal ? .085 : tobacco ? .08 : beans ? .045 : canes ? .07 : .12;
        instance(part.roots, n, x, ground + (headed ? tall * upright : tobacco ? tall * .6 : beans ? tall * .55 : canes ? tall * .62 : .065), z + (headed ? tall * over : 0),
          head * size, (oats ? .2 : hay ? .11 : wheat ? .29 : rye ? .26 : cereal ? .22 : tobacco ? .12 : beet ? .1 : beans ? .13 : canes ? .07 : .075) * size,
          head * size, 0, oats ? tilt + .5 : tilt);
        for (let side = 0; side < 3; side++) {
          const angle = side * Math.PI * 2 / 3 + n * .55, spread = sunflower ? .17 : tobacco ? .18 : beans ? .14 : canes ? .16 : hay ? .15 : .105;
          const rise = tall * (hay ? .2 + side * .12 : .42 + side * .15);
          instance(part.foliage, n * 3 + side, x + Math.cos(angle) * spread * size, ground + rise * upright,
            z + Math.sin(angle) * spread * size + rise * over, (sunflower ? .14 : hay ? .022 : headed ? .025 : tobacco ? .12 : beet ? .09 : beans ? .1 : canes ? .12 : .04) * size,
            (hay ? .3 : headed ? .20 : tobacco ? .19 : beans ? .14 : canes ? .1 : .18) * size, (sunflower ? .32 : hay ? .1 : headed ? .16 : tobacco ? .31 : beans ? .2 : canes ? .22 : .19) * size, angle);
        }
      }
      for (let n = 0; n < 8; n++) {
        const [x, z] = part.at(n % 2 ? .57 : -.57, (Math.floor(n / 2) - 1.5) * .64);
        const y = height(x, z) + .07 + (1.5 + n % 3 * .12) * size;
        instance(part.seedheads, n, x, y, z + .045, .15 * size, .15 * size, 1);
        for (let p = 0; p < 10; p++) {
          const angle = p * Math.PI / 5;
          pose.position.set(x + Math.sin(angle) * .205 * size, y + Math.cos(angle) * .205 * size, z);
          pose.scale.set(.082 * size, .175 * size, .035 * size); pose.rotation.set(0, 0, -angle); pose.updateMatrix();
          part.petals.setMatrixAt(n * 10 + p, pose.matrix);
        }
      }
      for (const mesh of [part.foliage, part.roots, part.stalks, part.petals, part.seedheads]) mesh.instanceMatrix.needsUpdate = true;
    }
  }
  function dispose() { group.removeFromParent(); for (const mesh of beds.flatMap(b => [b.foliage, b.roots, b.stalks, b.petals, b.seedheads])) mesh.dispose(); for (const geometry of geometries) geometry.dispose(); for (const mat of materials) mat.dispose(); }
  update(0);
  return { group, update, dispose };
}

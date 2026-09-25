import * as THREE from 'three';
import { createCharacter } from './characters.js';

/** Layered foliage conceals the uniform while leaving a face and boots to notice. */
function camouflage(actor, index) {
  const body = actor.group.getObjectByName('Weight and hips') ?? actor.group;
  const chest = actor.group.getObjectByName('Chest') ?? body;
  const head = actor.group.getObjectByName('Head') ?? body;
  const cloak = new THREE.Group(), hood = new THREE.Group();
  cloak.name = 'Rebel ragged woodland cover'; hood.name = 'Rebel leaf hood';
  // Shoulder foliage follows the leaning chest, not the hips left behind by a crouch.
  chest.add(cloak); cloak.position.y = chest === body ? 0 : -chest.position.y; head.add(hood);
  const cloth = new THREE.MeshStandardMaterial({ color: [0x55563a, 0x48523a, 0x5b5138][index % 3], roughness: 1, flatShading: true, side: THREE.DoubleSide });
  const leaf = new THREE.MeshStandardMaterial({ color: [0x697744, 0x647344, 0x747249][index % 3], roughness: 1, flatShading: true, side: THREE.DoubleSide });
  const darkLeaf = new THREE.MeshStandardMaterial({ color: 0x475838, roughness: 1, flatShading: true, side: THREE.DoubleSide });
  const bark = new THREE.MeshStandardMaterial({ color: 0x554830, roughness: 1, flatShading: true });
  const geometries = [], vertices = [];
  for (let i = 0; i < 10; i++) {
    const angle = i * Math.PI / 5, next = angle + Math.PI * .25;
    const top = 1.35 - (i % 2) * .045, bottom = .48 + ((i + index) % 3) * .105;
    const a = [Math.sin(angle) * .43, top, Math.cos(angle) * .30];
    const b = [Math.sin(next) * .43, top, Math.cos(next) * .30];
    const c = [Math.sin(angle + .11) * .40, bottom, Math.cos(angle + .11) * .31];
    const d = [Math.sin(next - .08) * .42, bottom + .10, Math.cos(next - .08) * .32];
    vertices.push(...a, ...b, ...c, ...b, ...d, ...c);
  }
  const panels = new THREE.BufferGeometry();
  panels.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3)); panels.computeVertexNormals(); geometries.push(panels);
  const garment = new THREE.Mesh(panels, cloth); garment.name = 'Uneven brown cloth panels'; cloak.add(garment);
  // An actual closed crown masks the bright kerchief; the front opening leaves
  // eyes/nose visible below its brow. Sparse leaves alone did not hide the cap.
  const hoodShape = new THREE.CylinderGeometry(.285, .29, .40, 9, 1, true, .58, Math.PI * 2 - 1.16);
  const capShape = new THREE.SphereGeometry(1, 9, 4, 0, Math.PI * 2, 0, Math.PI / 2);
  geometries.push(hoodShape, capShape);
  const hoodCloth = new THREE.Mesh(hoodShape, cloth); hoodCloth.position.set(0, .255, -.035); hoodCloth.scale.z = .93; hoodCloth.name = 'Open face woodland hood'; hood.add(hoodCloth);
  const cap = new THREE.Mesh(capShape, cloth); cap.position.set(0, .37, -.035); cap.scale.set(.31, .21, .275); cap.name = 'Opaque woodland hood crown'; hood.add(cap);
  const leafShape = new THREE.Shape();
  leafShape.moveTo(0, -.16); leafShape.lineTo(-.045, -.065); leafShape.lineTo(-.08, -.045); leafShape.lineTo(-.048, .035);
  leafShape.lineTo(-.06, .065); leafShape.lineTo(0, .18); leafShape.lineTo(.06, .065); leafShape.lineTo(.048, .035);
  leafShape.lineTo(.08, -.045); leafShape.lineTo(.045, -.065); leafShape.closePath();
  const leafGeometry = new THREE.ShapeGeometry(leafShape), clusterGeometry = new THREE.IcosahedronGeometry(1, 0);
  const twigGeometry = new THREE.CylinderGeometry(.008, .015, 1, 4);
  geometries.push(leafGeometry, clusterGeometry, twigGeometry);
  const transform = new THREE.Object3D();
  const instance = (mesh, i, at, scale, rotation) => {
    transform.position.set(...at); transform.scale.set(...scale); transform.rotation.set(...rotation); transform.updateMatrix(); mesh.setMatrixAt(i, transform.matrix);
  };
  for (const [material, offset] of [[leaf, 0], [darkLeaf, .8]]) {
    const leaves = new THREE.InstancedMesh(leafGeometry, material, 24); leaves.name = 'Leaves tied into the cloth'; leaves.frustumCulled = false;
    const mass = new THREE.InstancedMesh(clusterGeometry, material, 13); mass.name = 'Layered shoulder and cloak foliage'; mass.frustumCulled = false;
    for (let i = 0; i < 24; i++) {
      const angle = i * 2.4 + index * .7 + offset, y = .59 + (i % 6) * .15;
      const size = .85 + (i % 3) * .14;
      instance(leaves, i, [Math.sin(angle) * .44, y, Math.cos(angle) * .34], [size, size, size], [.20 + (i % 3) * .25, angle, (i % 2 ? 1 : -1) * .6]);
    }
    // Irregular flattened clumps interrupt both shoulder lines and the tunic.
    // They are separated tufts, not a single round shrub hiding the whole person.
    for (let i = 0; i < 13; i++) {
      const angle = i * 2.4 + index * .7 + offset, shoulder = i < 7;
      instance(mass, i, [Math.sin(angle) * (shoulder ? .38 : .34), shoulder ? 1.25 + (i % 3) * .045 : .69 + (i % 3) * .13, Math.cos(angle) * .27],
        [shoulder ? .24 : .17, .105 + (i % 2) * .025, .18], [.1, angle, (i % 2 ? 1 : -1) * .22]);
    }
    leaves.instanceMatrix.needsUpdate = mass.instanceMatrix.needsUpdate = true; cloak.add(leaves, mass);
  }
  const crown = new THREE.InstancedMesh(leafGeometry, leaf, 11); crown.name = 'Loose leaves above the hood'; crown.frustumCulled = false;
  const hoodMass = new THREE.InstancedMesh(clusterGeometry, darkLeaf, 9); hoodMass.name = 'Leafy hood and neck cover'; hoodMass.frustumCulled = false;
  for (let i = 0; i < 11; i++) {
    const angle = i * 2.4 + index;
    instance(crown, i, [Math.sin(angle) * .27, .38 + (i % 3) * .08, -.03 + Math.cos(angle) * .21], [.8, .86, .8], [-.45, angle, (i % 2 ? 1 : -1) * .7]);
  }
  for (let i = 0; i < 9; i++) {
    const angle = .70 + i / 8 * (Math.PI * 2 - 1.4);
    instance(hoodMass, i, [Math.sin(angle) * .255, .37 + (i % 3) * .055, -.035 + Math.cos(angle) * .22], [.15, .115, .13], [.15, angle, i * .13]);
  }
  crown.instanceMatrix.needsUpdate = hoodMass.instanceMatrix.needsUpdate = true; hood.add(crown, hoodMass);
  const twigs = new THREE.InstancedMesh(twigGeometry, bark, 9); twigs.name = 'Twigs woven through the woodland cover'; twigs.frustumCulled = false;
  for (let i = 0; i < 9; i++) {
    const side = i % 2 ? 1 : -1;
    instance(twigs, i, [side * (.26 + (i % 3) * .06), 1.19 + (i % 3) * .09, -.25 + (i % 2) * .14], [1, .30 + (i % 3) * .07, 1], [.23, i * .9, side * -.40]);
  }
  twigs.instanceMatrix.needsUpdate = true; cloak.add(twigs);
  for (const group of [cloak, hood]) group.traverse(object => { if (object.isMesh) { object.castShadow = false; object.receiveShadow = true; } });
  return {
    set visible(value) { cloak.visible = hood.visible = !!value; },
    get visible() { return cloak.visible && hood.visible; },
    dispose() {
      cloak.removeFromParent(); hood.removeFromParent();
      for (const group of [cloak, hood]) group.traverse(object => { if (object.isInstancedMesh) object.dispose(); });
      for (const geometry of geometries) geometry.dispose();
      cloth.dispose(); leaf.dispose(); darkLeaf.dispose(); bark.dispose();
    },
  };
}

/**
 * The watcher and combat renderer borrow the same actor. This view only owns
 * watching/returning poses; simulation supplies every position and health value.
 * Call release(id) after a corpse host accepts an actor so its body remains theirs.
 */
export function createRoadAmbushWatch({ scene, world, definitions = [] }) {
  const entries = new Map(), specs = new Map(definitions.map((entry, index) => [entry.id, { ...entry, index }]));
  let disposed = false;
  function create(id, record = null) {
    const definition = specs.get(id); if (!definition || disposed) return null;
    const actor = createCharacter({ ...(record?.model ?? definition.model), armed: true });
    actor.group.name = `Roadside ambusher: ${id}`; actor.group.userData.roadAmbushId = id;
    actor.group.visible = false; scene.add(actor.group);
    const item = { actor, cover: camouflage(actor, definition.index), mode: 'watching', released: false, prior: null };
    entries.set(id, item); return item;
  }
  for (const id of specs.keys()) create(id);
  function actor(id) {
    const item = entries.get(id); if (!item || item.released || disposed) return null;
    item.cover.visible = false; item.actor.setArmed(true); return item.actor;
  }
  function update(time, records = [], { combat = null } = {}) {
    if (disposed) return;
    const combatIds = new Set((combat?.enemies ?? []).filter(enemy => enemy.active !== false).map(enemy => enemy.id));
    const seen = new Set();
    for (const record of records) {
      if (!specs.has(record?.id)) continue;
      seen.add(record.id); let item = entries.get(record.id);
      const dead = record.mode === 'dead' || !(record.hp > 0);
      if (!item || (item.released && !dead)) item = create(record.id, record);
      if (!item) continue;
      item.mode = record.mode;
      if (item.released) continue;
      if (record.mode === 'active') {
        item.cover.visible = false;
        continue; // The battle owns visibility, position, facing and animation.
      }
      if (dead) {
        // Combat may still be delivering the last pose to the corpse host.
        if (!combatIds.has(record.id)) item.actor.group.visible = false;
        continue;
      }
      if (!Number.isFinite(record.x) || !Number.isFinite(record.z)) { item.actor.group.visible = false; continue; }
      const dt = item.prior && time > item.prior.time ? time - item.prior.time : 0;
      const inferredSpeed = dt > 0 ? Math.hypot(record.x - item.prior.x, record.z - item.prior.z) / dt : 0;
      const moving = record.mode === 'returning', pace = moving ? Math.max(0, Math.min(4, record.speed ?? inferredSpeed)) : 0;
      item.actor.group.position.set(record.x, world.heightAt(record.x, record.z), record.z);
      item.actor.group.rotation.y = Number.isFinite(record.yaw) ? record.yaw : 0;
      item.actor.group.visible = true; item.cover.visible = true; item.actor.setArmed(false);
      item.actor.animate(time + specs.get(record.id).index * 1.7, pace, true, { action: 'idle', armed: false, sneaking: !moving });
      item.prior = { x: record.x, z: record.z, time };
    }
    for (const [id, item] of entries) if (!seen.has(id) && !item.released && !combatIds.has(id)) item.actor.group.visible = false;
  }
  function release(id) {
    const item = entries.get(id); if (!item || item.released) return false;
    item.released = true; item.cover.visible = false; return true;
  }
  function snapshot() {
    return [...entries].map(([id, item]) => ({ id, mode: item.mode, released: item.released,
      visible: item.actor.group.visible, cover: item.cover.visible,
      x: item.actor.group.position.x, y: item.actor.group.position.y, z: item.actor.group.position.z, yaw: item.actor.group.rotation.y }));
  }
  function dispose() {
    if (disposed) return; disposed = true;
    for (const item of entries.values()) {
      if (item.released) continue; // A transferred corpse has a separate lifetime.
      item.actor.group.removeFromParent(); item.cover.dispose();
    }
    entries.clear();
  }
  return { actor, update, release, snapshot, dispose };
}

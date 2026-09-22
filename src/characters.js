import * as THREE from 'three';
import { MARKER_STYLE } from './quest-markers.js';

// Deliberately built from small, flat-shaded meshes: every villager is local,
// inexpensive to draw, and readable even at the distance of the follow camera.
const UNIT_BOX = new THREE.BoxGeometry(1, 1, 1);
const UNIT_SPHERE = new THREE.SphereGeometry(1, 8, 6);
const UNIT_CYLINDER = new THREE.CylinderGeometry(1, 1, 1, 8);
const UNIT_HAIR_LOCK = new THREE.IcosahedronGeometry(1, 0);
const UP = new THREE.Vector3(0, 1, 0);
const BATCH_MATERIALS = new Map();
const ROAD_CLOTH = Object.freeze({
  'field-courier': 0x777957,
  'bridge-keeper': 0x9a7150,
  'rise-custodian': 0x60677c,
  'relay-clerk': 0x756b58,
  'forest-woodcutter': 0x927052,
  'commons-miller': 0xa18452,
  'reed-worker': 0x5f8078,
  'shelter-keeper': 0x827b6d,
});
// The Empire's men-at-arms wear the red of Ambron: the tabard over their mail, and the tunic under it;
// Suval's border guards wear slate wool and studded leather instead.
const SOLDIER_CLOTH = Object.freeze({
  'legion-soldier': 0x8f3b30,
  'legion-officer': 0x832d2b,
  'suvali-guard': 0x55636f,
  // Elod's frontier guards: black lamellar over charcoal wool, nothing red and nothing slate.
  'elodi-guard': 0x2b2b2f,
});

/**
 * What somebody's coat and skin are when nothing names them. These were the defaults of
 * `createCharacter`'s own parameters and still are; they are a name of their own because the
 * stand-in for a figure too far off to see (src/figure-lod.js) has to arrive at the same colour
 * the figure was built in, and the only honest way is to ask the same question. Reading it back
 * off the built rig does not work: the parts are batched per pivot, and the commonest colour on
 * the chest is the skin of the arms it carries.
 */
export const tunicForRole = role => ROAD_CLOTH[role] ?? SOLDIER_CLOTH[role]
  ?? (role === 'traveler' ? 0x806042 : role === 'doomsayer' ? 0x494d43 : role === 'pond-fisher' ? 0x7e7454 : 0x537a44);
export const skinForRole = role => (role === 'shelter-keeper' ? 0xc8a78a : 0xd7ad7e);
// Builds for the hired company. Height and girth scale the whole standing body,
// and `shoulders` moves the arm joints in or out, so two men of the same cloth
// still read apart at thumbnail size. Every value stays inside 0.9 to 1.12 so
// the rig, the colliders and the follow camera keep fitting the men who use them.
export const MERCENARY_BUILDS = Object.freeze({
  ordinary: Object.freeze({ height: 1, girth: 1, shoulders: 0 }),
  broad: Object.freeze({ height: 1.0, girth: 1.08, shoulders: 0.05 }),
  rangy: Object.freeze({ height: 1.06, girth: 0.93, shoulders: 0 }),
  bull: Object.freeze({ height: 0.96, girth: 1.12, shoulders: 0.055 }),
  wiry: Object.freeze({ height: 0.97, girth: 0.92, shoulders: -0.02 }),
  square: Object.freeze({ height: 0.99, girth: 1.05, shoulders: 0.035 }),
  'tall-lean': Object.freeze({ height: 1.08, girth: 0.94, shoulders: -0.01 }),
  'short-stocky': Object.freeze({ height: 0.92, girth: 1.07, shoulders: 0.02 }),
  towering: Object.freeze({ height: 1.12, girth: 1.0, shoulders: 0.012 }),
  heavy: Object.freeze({ height: 1.02, girth: 1.1, shoulders: 0.045 }),
  'raw-boned': Object.freeze({ height: 1.05, girth: 1.06, shoulders: 0.04 }),
  slight: Object.freeze({ height: 0.94, girth: 0.9, shoulders: -0.03 }),
});

function material(color, extra = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.91, flatShading: true, ...extra });
}

function part(parent, geometry, mat, position, scale = [1, 1, 1]) {
  const mesh = new THREE.Mesh(geometry, mat);
  mesh.position.set(...position);
  mesh.scale.set(...scale);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function box(parent, mat, position, scale) {
  return part(parent, UNIT_BOX, mat, position, scale);
}

function round(parent, mat, position, scale) {
  return part(parent, UNIT_SPHERE, mat, position, scale);
}

/**
 * Round wire spectacles: a rim over each eye, a bridge between them, and arms back to the
 * ears. Troy wears a brass pair (src/beekeeper.js) and Imani a steel one (src/vineyard.js);
 * nobody else in Azhora has thought of them yet.
 */
function spectacles(head, name, wire, glass, { radius = 0.055, y = 0.226, z = 0.2, spread = 0.07 } = {}) {
  const specs = new THREE.Group();
  specs.name = name;
  head.add(specs);
  for (const side of [-1, 1]) {
    part(specs, new THREE.TorusGeometry(radius, 0.008, 4, 12), wire, [side * spread, y, z]);
    part(specs, new THREE.CylinderGeometry(radius * 0.95, radius * 0.95, 0.004, 10), glass, [side * spread, y, z - 0.002]).rotation.x = Math.PI / 2;
    const arm = part(specs, UNIT_CYLINDER, wire, [side * (spread + 0.055), y + 0.006, z - 0.085], [0.006, 0.17, 0.006]);
    arm.rotation.set(Math.PI / 2, 0, side * 0.12);
  }
  part(specs, UNIT_CYLINDER, wire, [0, y, z], [0.018, 0.006, 0.006]).rotation.z = Math.PI / 2;
  return specs;
}

function ribbon(parent, mat, from, to, width = 0.052, depth = 0.022) {
  const start = new THREE.Vector3(...from);
  const end = new THREE.Vector3(...to);
  const direction = end.clone().sub(start);
  const mesh = box(parent, mat, start.clone().add(end).multiplyScalar(0.5).toArray(), [width, direction.length(), depth]);
  mesh.quaternion.setFromUnitVectors(UP, direction.normalize());
  return mesh;
}

// One named, empty-after-batching marker per piece of a hired sword's look.
// Meshes inside it are folded into the joint's batch; the name survives, so a
// test (and a reader) can ask which headgear, hair, beard or garment a man wears.
function lookGroup(parent, kind, value) {
  const group = new THREE.Group();
  group.name = `mercenary-${kind}-${value}`;
  parent.add(group);
  return group;
}

// Keep every animated joint, but bake its cloth/skin/wood colors into vertices.
// The added articulation then costs one ordinary draw per joint rather than a
// draw for every cuff, toe and lock of hair. Metallic badges stay separate.
function batchRigidParts(root, pivots) {
  root.updateMatrixWorld(true);
  const animatedPivots = new Set(pivots);
  const position = new THREE.Vector3();
  const normal = new THREE.Vector3();
  const relativeMatrix = new THREE.Matrix4();
  const normalMatrix = new THREE.Matrix3();

  for (const pivot of pivots) {
    const batches = new Map();
    function collect(parent) {
      for (const child of parent.children) {
        if (animatedPivots.has(child)) continue;
        if (child.isMesh) {
          const mat = child.material;
          const key = [mat.roughness, mat.metalness, mat.side, mat.emissive.getHexString(), mat.emissiveIntensity, mat.transparent, mat.opacity].join('/');
          if (!batches.has(key)) batches.set(key, []);
          batches.get(key).push(child);
        }
        collect(child);
      }
    }
    collect(pivot);
    const inversePivot = pivot.matrixWorld.clone().invert();

    for (const [key, meshes] of batches) {
      if (meshes.length < 2) continue;
      let vertexCount = 0;
      let indexCount = 0;
      for (const mesh of meshes) {
        vertexCount += mesh.geometry.attributes.position.count;
        indexCount += mesh.geometry.index?.count ?? mesh.geometry.attributes.position.count;
      }
      const positions = new Float32Array(vertexCount * 3);
      const normals = new Float32Array(vertexCount * 3);
      const colors = new Float32Array(vertexCount * 3);
      const indices = vertexCount > 65535 ? new Uint32Array(indexCount) : new Uint16Array(indexCount);
      let vertexOffset = 0;
      let indexOffset = 0;
      for (const mesh of meshes) {
        const geometry = mesh.geometry;
        const sourcePositions = geometry.attributes.position;
        const sourceNormals = geometry.attributes.normal;
        relativeMatrix.multiplyMatrices(inversePivot, mesh.matrixWorld);
        normalMatrix.getNormalMatrix(relativeMatrix);
        for (let i = 0; i < sourcePositions.count; i++) {
          position.fromBufferAttribute(sourcePositions, i).applyMatrix4(relativeMatrix);
          position.toArray(positions, (vertexOffset + i) * 3);
          normal.fromBufferAttribute(sourceNormals, i).applyMatrix3(normalMatrix).normalize();
          normal.toArray(normals, (vertexOffset + i) * 3);
          mesh.material.color.toArray(colors, (vertexOffset + i) * 3);
        }
        const count = geometry.index?.count ?? sourcePositions.count;
        for (let i = 0; i < count; i++) {
          indices[indexOffset++] = vertexOffset + (geometry.index ? geometry.index.getX(i) : i);
        }
        vertexOffset += sourcePositions.count;
        mesh.removeFromParent();
      }
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      geometry.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
      geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
      geometry.setIndex(new THREE.BufferAttribute(indices, 1));
      geometry.computeBoundingSphere();
      if (!BATCH_MATERIALS.has(key)) {
        const mat = meshes[0].material.clone();
        mat.color.set(0xffffff);
        mat.vertexColors = true;
        BATCH_MATERIALS.set(key, mat);
      }
      const batch = new THREE.Mesh(geometry, BATCH_MATERIALS.get(key));
      batch.name = 'Rigid character batch';
      batch.castShadow = meshes.some(mesh => mesh.castShadow);
      batch.receiveShadow = meshes.some(mesh => mesh.receiveShadow);
      pivot.add(batch);
    }
  }
}

function makeWeaponMount(hand, name) {
  const mount = new THREE.Group();
  mount.name = name;
  mount.position.set(0, -0.006, 0.035);
  mount.rotation.x = Math.PI / 2;
  hand.add(mount);
  return mount;
}

function makeStick(parent, goblin = false) {
  const stick = new THREE.Group();
  stick.name = goblin ? 'Raider broken forest stick' : 'Picked forest stick';
  parent.add(stick);
  const bark = material(goblin ? 0x514432 : 0x6c5036);
  const paleWood = material(goblin ? 0x9b865e : 0xad9165);
  // A narrow, crooked fallen branch, without a mace head or bindings.
  const shaft = part(stick, new THREE.CylinderGeometry(0.032, 0.038, 0.49, 6), bark, [0.006, 0.172, 0]);
  shaft.rotation.z = -0.07;
  const crookedEnd = part(stick, new THREE.CylinderGeometry(0.021, 0.032, 0.24, 5), bark, [0.043, 0.492, 0.004]);
  crookedEnd.rotation.z = -0.2;
  const snap = part(stick, UNIT_CYLINDER, paleWood, [0.066, 0.609, 0.004], [0.021, 0.013, 0.022]);
  snap.rotation.z = -0.2;
  const twig = part(stick, new THREE.CylinderGeometry(0.01, 0.021, 0.124, 5), bark, [-0.036, 0.311, 0.009]);
  twig.rotation.z = 0.83;
  part(stick, UNIT_HAIR_LOCK, paleWood, [-0.08, 0.355, 0.009], [0.012, 0.025, 0.012]);
  ribbon(stick, paleWood, [0.027, 0.168, 0.025], [0.04, 0.275, 0.025], 0.008, 0.004);
  return stick;
}

function makeSword(parent) {
  const sword = new THREE.Group();
  sword.name = 'Plain iron mercenary sword';
  parent.add(sword);
  const iron = material(0x92958c, { metalness: 0.48, roughness: 0.67 });
  const wornIron = material(0x62675f, { metalness: 0.48, roughness: 0.67 });
  const grip = material(0x493a2c);
  // A faceted, double-edged straight blade with a short pointed tip. There is
  // no decorative metalwork: just iron, a plain crossbar, and a leather grip.
  const vertices = [];
  const rings = [
    [[-0.047, 0.105, 0], [0, 0.105, 0.012], [0.047, 0.105, 0], [0, 0.105, -0.012]],
    [[-0.038, 0.77, 0], [0, 0.77, 0.009], [0.038, 0.77, 0], [0, 0.77, -0.009]],
  ];
  for (let side = 0; side < 4; side++) {
    const next = (side + 1) % 4;
    vertices.push(...rings[0][side], ...rings[0][next], ...rings[1][side]);
    vertices.push(...rings[0][next], ...rings[1][next], ...rings[1][side]);
    vertices.push(...rings[1][side], ...rings[1][next], 0, 0.9, 0);
  }
  const blade = new THREE.BufferGeometry();
  blade.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  blade.computeVertexNormals();
  part(sword, blade, iron, [0, 0, 0]);
  box(sword, wornIron, [0, 0.086, 0], [0.23, 0.028, 0.04]);
  part(sword, UNIT_CYLINDER, grip, [0, -0.007, 0], [0.026, 0.15, 0.026]);
  for (const y of [-0.054, -0.016, 0.022]) {
    part(sword, UNIT_CYLINDER, grip, [0, y, 0], [0.028, 0.009, 0.028]);
  }
  box(sword, wornIron, [0, -0.094, 0], [0.059, 0.038, 0.044]);
  return sword;
}


// Weapons the hired swords carry. Each is a small group of flat-shaded parts, hung from
// the right-hand grip, planted like a staff, or slung on the back.
function makeMace(parent) {
  const mace = new THREE.Group(); mace.name = 'Iron mace'; parent.add(mace);
  const iron = material(0x7d7f78, { metalness: 0.45, roughness: 0.6 }), wood = material(0x5a4634);
  part(mace, new THREE.CylinderGeometry(0.02, 0.026, 0.62, 6), wood, [0, 0.22, 0]);
  round(mace, iron, [0, 0.6, 0], [0.075, 0.09, 0.075]);
  for (let i = 0; i < 6; i++) { const flange = box(mace, iron, [Math.sin(i / 6 * Math.PI * 2) * 0.075, 0.6, Math.cos(i / 6 * Math.PI * 2) * 0.075], [0.028, 0.13, 0.02]); flange.rotation.y = i / 6 * Math.PI * 2; }
  box(mace, iron, [0, -0.09, 0], [0.05, 0.03, 0.05]);
  return mace;
}
function makeDagger(parent) {
  const dagger = new THREE.Group(); dagger.name = 'Long dagger'; parent.add(dagger);
  const iron = material(0x9a9c95, { metalness: 0.5, roughness: 0.55 }), grip = material(0x3d2f24);
  const blade = part(dagger, new THREE.ConeGeometry(0.028, 0.34, 4), iron, [0, 0.27, 0]); blade.scale.z = 0.35;
  box(dagger, iron, [0, 0.09, 0], [0.11, 0.018, 0.03]);
  part(dagger, UNIT_CYLINDER, grip, [0, 0.01, 0], [0.02, 0.13, 0.02]);
  return dagger;
}
function makeAxe(parent) {
  const axe = new THREE.Group(); axe.name = 'Bearded axe'; parent.add(axe);
  const iron = material(0x8a8c85, { metalness: 0.45, roughness: 0.6 }), wood = material(0x6a5238);
  part(axe, new THREE.CylinderGeometry(0.02, 0.026, 0.72, 6), wood, [0, 0.26, 0]);
  const head = box(axe, iron, [-0.075, 0.55, 0], [0.19, 0.16, 0.025]); head.rotation.z = -0.15;
  box(axe, iron, [-0.13, 0.46, 0], [0.09, 0.1, 0.02]);
  return axe;
}
function makeGreatsword(parent) {
  const sword = new THREE.Group(); sword.name = 'Greatsword'; parent.add(sword);
  const iron = material(0x92958c, { metalness: 0.48, roughness: 0.67 }), grip = material(0x493a2c), dark = material(0x62675f, { metalness: 0.48, roughness: 0.67 });
  const blade = part(sword, new THREE.ConeGeometry(0.05, 1.05, 4), iron, [0, 0.66, 0]); blade.scale.z = 0.22;
  box(sword, dark, [0, 0.12, 0], [0.3, 0.03, 0.045]);
  part(sword, UNIT_CYLINDER, grip, [0, -0.04, 0], [0.028, 0.28, 0.028]);
  round(sword, dark, [0, -0.2, 0], [0.04, 0.04, 0.04]);
  return sword;
}
function makeSpearProp(parent, name, length, tipLength = 0.22) {
  // Planted like a staff: the group hangs from the right wrist and the animator keeps it upright.
  const spear = new THREE.Group(); spear.name = name; parent.add(spear);
  const shaft = material(0x6d5439), iron = material(0x9a9d96, { metalness: 0.46, roughness: 0.6 }), dark = material(0x62655f, { metalness: 0.46, roughness: 0.6 });
  ribbon(spear, shaft, [0, -0.82, 0], [0, length - 0.82, 0], 0.034, 0.034);
  ribbon(spear, dark, [0, length - 0.82, 0], [0, length - 0.76, 0], 0.028, 0.028);
  part(spear, new THREE.ConeGeometry(0.028, tipLength, 4), iron, [0, length - 0.76 + tipLength / 2, 0]);
  round(spear, dark, [0, -0.83, 0], [0.024, 0.03, 0.024]);
  return spear;
}
function makeStaffProp(parent) {
  const staff = new THREE.Group(); staff.name = 'Quarterstaff'; parent.add(staff);
  const wood = material(0x7a6040), band = material(0x4d3a2a);
  ribbon(staff, wood, [0, -0.82, 0], [0, 1.0, 0], 0.036, 0.036);
  for (const y of [-0.7, 0.9]) part(staff, UNIT_CYLINDER, band, [0, y, 0], [0.024, 0.04, 0.024]);
  return staff;
}
function makeBow(body) {
  // Slung across the back with a quiver; the hands stay free.
  const bow = new THREE.Group(); bow.name = 'Hunting bow'; bow.position.set(0.06, 1.05, -0.2); bow.rotation.set(0.1, 0, -0.55); body.add(bow);
  const wood = material(0x6f5236), string = material(0xd8cfb4), leather = material(0x5b4130);
  const limb = new THREE.CylinderGeometry(0.014, 0.02, 0.62, 6);
  const upper = part(bow, limb, wood, [0.07, 0.32, 0]); upper.rotation.z = -0.28;
  const lower = part(bow, limb, wood, [0.07, -0.32, 0]); lower.rotation.z = 0.28;
  part(bow, UNIT_CYLINDER, leather, [0, 0, 0], [0.022, 0.12, 0.022]);
  ribbon(bow, string, [0.16, 0.6, 0], [0.16, -0.6, 0], 0.008, 0.006);
  const quiver = new THREE.Group(); quiver.name = 'Quiver'; quiver.position.set(-0.2, 0.95, -0.17); quiver.rotation.z = 0.35; body.add(quiver);
  part(quiver, new THREE.CylinderGeometry(0.05, 0.04, 0.42, 7), leather, [0, 0, 0]);
  for (const [x, z] of [[-0.02, 0.01], [0.02, -0.015], [0, 0.02]]) ribbon(quiver, wood, [x, 0.15, z], [x, 0.36, z], 0.008, 0.008);
  return bow;
}
/**
 * **A bow in the hand, rather than on the back.** `makeBow` slings one across the shoulders with
 * the hands free, which is right for a man walking a road and useless for a man shooting. This is
 * the other one: the grip sits in the mount, the limbs stand up and down from it, and the string
 * runs between them where the drawing hand will be.
 *
 * It is the one weapon held in the **off** hand — every other thing the traveler carries hangs
 * off the right wrist, because every other thing is swung. The right hand is for the string.
 *
 * The nocked arrow is a child of the bow and is shown only while he is actually drawing, so a man
 * standing about with a bow is not standing about with an arrow on it (`pose.draw`).
 */
export const NOCKED_ARROW = 'Nocked arrow';
function makeHeldBow(mount) {
  const bow = new THREE.Group(); bow.name = 'Hunting bow (held)'; mount.add(bow);
  /**
   * **Turned so that it stands up in the pose it is used in.** The mount is a quarter over
   * (`makeWeaponMount`) and the bow then follows the forearm, so an orientation that stands
   * nicely with the arm hanging lies flat the moment the arm comes up to shoot. Measured, not
   * guessed: at `-PI/2` the limbs spanned 1.14 m at rest and 0.08 m at full draw — a bow held
   * like a tray. This stands it in the drawn pose, which is the only one that has to read.
   */
  bow.rotation.set(0, 0, 0);
  const wood = material(0x6f5236), string = material(0xd8cfb4), leather = material(0x5b4130), head = material(0x9a9d96, { metalness: .5, roughness: .55 });
  const limb = new THREE.CylinderGeometry(0.013, 0.019, 0.58, 6);
  const upper = part(bow, limb, wood, [0, 0.3, 0]); upper.rotation.z = -0.24;
  const lower = part(bow, limb, wood, [0, -0.3, 0]); lower.rotation.z = 0.24;
  part(bow, UNIT_CYLINDER, leather, [0, 0, 0], [0.021, 0.14, 0.021]);
  ribbon(bow, string, [0.07, 0.56, 0], [0.07, -0.56, 0], 0.007, 0.006);
  /**
   * The shaft lies across the grip with its nock back at the string hand and its head out past
   * the bow. Measured rather than guessed: the first draft had it the other way round, with the
   * head 0.77 m *behind* him and the flights pointing at the target.
   */
  const arrow = new THREE.Group(); arrow.name = NOCKED_ARROW; arrow.visible = false; bow.add(arrow);
  ribbon(arrow, wood, [0.04, 0, -0.30], [0.04, 0, 0.46], 0.009, 0.009);
  part(arrow, new THREE.ConeGeometry(0.018, 0.07, 5), head, [0.04, 0, 0.5]).rotation.x = Math.PI / 2;
  return bow;
}
/** How the traveler's own buckler sits: out to the side at rest, turned forward on guard. */
const GUARD_SHIELD = Object.freeze({ x: -0.5, z: 1.57, turn: -1.35 });
/** The one name the host looks the buckler up by, so the two cannot drift apart. */
export const BUCKLER_NAME = 'The traveler\u2019s buckler';

function makeShield(parent, { face = 0x35507a, rim = 0xcbb98e, round: isRound = false, width = 0.43, height = 0.62 } = {}) {
  const shield = new THREE.Group(); shield.name = isRound ? 'Round shield' : 'Army shield';
  shield.position.set(0.13, -0.16, 0); shield.rotation.x = -0.6; parent.add(shield);
  const shieldMat = material(face), rimMat = material(rim), iron = material(0x9a9d96, { metalness: 0.46, roughness: 0.6 });
  if (isRound) {
    part(shield, new THREE.CylinderGeometry(width, width, 0.028, 12), shieldMat, [0, 0, 0]);
    part(shield, new THREE.TorusGeometry(width, 0.018, 4, 14), rimMat, [0, 0.012, 0]).rotation.x = Math.PI / 2;
  } else {
    for (const side of [-1, 1]) { const half = box(shield, shieldMat, [side * width / 4, 0.012, 0], [width / 2, 0.028, height]); half.rotation.z = side * 0.24; }
    for (const z of [-height / 2, height / 2]) box(shield, rimMat, [0, 0.02, z], [width, 0.034, 0.024]);
  }
  round(shield, iron, [0, -0.03, 0], [0.065, 0.022, 0.065]);
  return shield;
}
/**
 * The device of Ambron: a gold tower standing over the water of the narrows. `lay` puts one piece on a surface:
 * `lay(mat, [across, up], [wide, tall], turn)` in the surface's own frame, the host deciding what "up" is.
 */
function ambronDevice(lay, gold, dark, size = 1) {
  const k = size;
  lay(gold, [0, .02 * k], [.1 * k, .115 * k]);                                                   // the tower
  for (const x of [-.036, 0, .036]) lay(gold, [x * k, .09 * k], [.024 * k, .03 * k]);          // its battlements
  lay(dark, [0, -.012 * k], [.03 * k, .05 * k]);                                                 // its gate
  for (const [x, turn] of [[-.05, .45], [-.017, -.45], [.017, .45], [.05, -.45]]) lay(gold, [x * k, -.062 * k], [.04 * k, .014 * k], turn);   // the water
}

/** Ambron's heater shield: flat along the top, curving to a point, red with the gold tower of the narrows and an iron rim. */
function makeHeaterShield(parent, { face = 0x8f3b30, width = 0.44, height = 0.58 } = {}) {
  const shield = new THREE.Group(); shield.name = 'Ambroni heater shield';
  shield.position.set(0.13, -0.16, 0); shield.rotation.x = -0.6; parent.add(shield);
  const w = width / 2, h = height / 2, outline = new THREE.Shape();
  outline.moveTo(-w, h); outline.lineTo(w, h); outline.lineTo(w, h * .2);
  outline.quadraticCurveTo(w * .92, -h * .62, 0, -h); outline.quadraticCurveTo(-w * .92, -h * .62, -w, h * .2); outline.lineTo(-w, h);
  const iron = material(0x8e918c, { metalness: 0.46, roughness: 0.55 }), gold = material(0xc8a250, { metalness: 0.28, roughness: 0.52 }), dark = material(0x3a2a22);
  // The board, its outer face towards -y like the old shield's boss, and the rim a little larger behind it.
  const board = part(shield, new THREE.ExtrudeGeometry(outline, { depth: 0.026, bevelEnabled: false }), material(face), [0, 0.004, 0]);
  board.rotation.x = Math.PI / 2;
  const rim = part(shield, new THREE.ExtrudeGeometry(outline, { depth: 0.022, bevelEnabled: false }), iron, [0, 0.012, 0], [1.08, 1.06, 1]);
  rim.rotation.x = Math.PI / 2;
  ambronDevice((mat, [x, z], [sx, sz], turn = 0) => { const piece = box(shield, mat, [x, -0.026, z + 0.02], [sx, 0.008, sz]); piece.rotation.y = turn; }, gold, dark, 1.3);
  return shield;
}
/** The held weapon a mercenary draws, by the roster's weapon word; spears, staves and bows are not held. */
const KIT_HELD = Object.freeze({ mace: 'iron-mace', dagger: 'long-dagger', axe: 'bearded-axe', greatsword: 'greatsword', sword: 'simple-sword', 'sword-shield': 'simple-sword' });
function mercenaryHeldWeapons(mount, weapon, trades = false) {
  const held = KIT_HELD[weapon];
  if (!held) return {};
  // A man who trades may end up holding any of the swapped weapons; build them all, show one.
  const builders = { 'simple-sword': makeSword, 'iron-mace': makeMace, 'long-dagger': makeDagger, 'bearded-axe': makeAxe, greatsword: makeGreatsword };
  if (!trades) return { [held]: builders[held](mount) };
  return Object.fromEntries(Object.entries(builders).map(([id, build]) => [id, build(mount)]));
}

function makeFishingRod(parent) {
  const rod = new THREE.Group(); rod.name = 'Simple hazel fishing rod'; parent.add(rod);
  const wood = material(0x86653e), tipWood = material(0xaa8756), cord = material(0xccc3a0);
  part(rod, new THREE.CylinderGeometry(.021, .031, .77, 6), wood, [0, .30, 0]);
  const middle = part(rod, new THREE.CylinderGeometry(.012, .021, .59, 6), wood, [.012, .97, 0]); middle.rotation.z = -.04;
  const tip = part(rod, new THREE.CylinderGeometry(.005, .012, .37, 5), tipWood, [.04, 1.44, 0]); tip.rotation.z = -.085;
  for (const y of [-.048, -.009, .031, .67]) part(rod, UNIT_CYLINDER, cord, [0, y, 0], [.032, .015, .032]);
  const lineSpool = part(rod, UNIT_CYLINDER, wood, [.05, -.035, .012], [.025, .067, .025]); lineSpool.rotation.z = Math.PI / 2;
  return rod;
}

// Rotating the chest about the belt (instead of the feet) gives the shoulders
// and hips independent weight, and keeps idle gestures out of the gait.
function addChestPivot(body, legs, height) {
  const chest = new THREE.Group();
  chest.name = 'Chest';
  chest.position.y = height;
  body.add(chest);
  body.updateMatrixWorld(true);
  for (const child of [...body.children]) {
    if (child !== chest && !legs.includes(child)) chest.attach(child);
  }
  return chest;
}

function samplePose(progress, keys) {
  for (let i = 1; i < keys.length; i++) {
    if (progress <= keys[i][0]) {
      const t = THREE.MathUtils.smoothstep(progress, keys[i - 1][0], keys[i][0]);
      return THREE.MathUtils.lerp(keys[i - 1][1], keys[i][1], t);
    }
  }
  return keys[keys.length - 1][1];
}

function makeAnimator({ body, chest, head, arms, elbows, wrists, legs, knees, ankles, weapon, clothPivot = null, goblin = false, offset = 0, role = '' }) {
  let stridePhase = offset;
  let lastTime;
  let movementBlend = 0;
  let armed = goblin;
  if (weapon) weapon.visible = armed;
  const setArmed = value => { armed = Boolean(value); if (weapon) weapon.visible = armed; };
  /**
   * The buckler on his left arm, for the shield hand (`hand`, src/gear.js). It is built once and
   * shown or hidden, because what he is wearing changes at a smith's and not every frame, and a
   * shield made and thrown away on a toggle would be a new group every time he bought one.
   */
  let buckler = null;
  const setShield = value => {
    const on = Boolean(value);
    if (on && !buckler && elbows[0]) {
      // Sized and hung like the legionaries' own (`makeHeaterShield`, which rides the off
      // forearm device-outward): 0.45 m across, pale hide on an iron rim. The first draft was
      // wider than a soldier's shield and still invisible, because size was never the problem -
      // it sat at 0.18 m off the centreline, which is inside the traveler's coat.
      buckler = makeShield(elbows[0], { face: 0xb59366, rim: 0x74787a, round: true, width: 0.225 });
      // Out on the forearm and clear of the coat, rather than tucked against the ribs, with the
      // face turned out to his shield side. Measured, not guessed: at rest the face points
      // (-1.00, .10, .00) - straight out from the body - where the first draft had it lying
      // nearly flat and reading as a thin ellipse from every angle.
      buckler.position.set(-0.05, -0.20, 0.06);
      buckler.rotation.set(GUARD_SHIELD.x, 0, GUARD_SHIELD.z);
      buckler.name = BUCKLER_NAME;
    }
    if (buckler) buckler.visible = on;
  };
  const upperLength = goblin ? 0.215 : 0.325;
  const lowerLength = goblin ? 0.18 : 0.29;
  const fallenBounds = new THREE.Box3();
  const actorOrigin = new THREE.Vector3();

  function animate(time, speed = 0, grounded = true, pose = {}) {
    const seconds = Number.isFinite(time) ? time : 0;
    const dt = lastTime === undefined ? 1 / 60 : THREE.MathUtils.clamp(seconds - lastTime, 0, 0.1);
    lastTime = seconds;
    if (typeof pose.armed === 'boolean') setArmed(pose.armed);
    const pace = Math.max(0, Number.isFinite(speed) ? speed : 0);
    const run = THREE.MathUtils.clamp((pace - 3.5) / 3.7, 0, 1);
    const action = pose.action || 'idle';
    const progress = THREE.MathUtils.clamp(Number.isFinite(pose.progress) ? pose.progress : 0, 0, 1);
    const actionRate = action === 'attack' || action === 'hurt' ? 26 : 15;
    const damping = 1 - Math.exp(-actionRate * dt);
    const targetMovement = grounded && action !== 'dead' ? THREE.MathUtils.clamp(pace / 1.7, 0, 1) : 0;
    movementBlend = THREE.MathUtils.lerp(movementBlend, targetMovement, 1 - Math.exp(-10 * dt));
    stridePhase += dt * (goblin ? 4.6 + Math.min(pace, 7) * 1.65 : 3.7 + Math.min(pace, 8) * 1.6);
    const breath = Math.sin(seconds * (goblin ? 2.9 : 2.05) + offset);
    const step = Math.sin(stridePhase);
    const idle = 1 - movementBlend;
    const alert = pose.alert ? 1 : 0;
    const hip = [], knee = [], ankle = [], arm = [], elbow = [], armOut = [];
    for (let i = 0; i < 2; i++) {
      const side = i === 0 ? -1 : 1;
      const phase = stridePhase + i * Math.PI + (goblin && i === 1 ? 0.16 : 0);
      const swing = Math.sin(phase);
      hip[i] = swing * (goblin ? 0.77 : 0.58 + run * 0.16) * movementBlend - (goblin ? 0.13 : 0.025) * idle;
      knee[i] = (goblin ? 0.26 : 0.075) * idle + (0.06 + Math.max(0, Math.sin(phase + 0.35)) * (goblin ? 1.13 : 0.89 + run * 0.23)) * movementBlend;
      ankle[i] = -hip[i] * 0.52 - knee[i] * 0.67;
      arm[i] = -swing * (0.42 + run * 0.26) * movementBlend + (goblin ? 0.14 : 0.025) * idle;
      elbow[i] = -(goblin ? 0.35 : 0.17) - run * 0.36 - (0.08 + run * 0.12) * Math.sin(phase + 0.5) * movementBlend;
      armOut[i] = side * ((goblin ? 0.2 : 0.08) + breath * 0.012 + movementBlend * 0.025);
    }
    let chestX = (goblin ? 0.2 : 0) + run * 0.13 + alert * 0.035;
    let chestY = -step * 0.09 * movementBlend + Math.sin(seconds * 0.55 + offset) * 0.035 * idle;
    let chestZ = -step * 0.035 * movementBlend;
    let bodyX = 0;
    let bodyZ = step * (goblin ? 0.047 : 0.027) * movementBlend + Math.sin(seconds * 0.78 + offset) * 0.012 * idle;
    let headX = (goblin ? -0.16 : 0) - chestX * 0.3 + breath * 0.008;
    let headY = Math.sin(seconds * 0.63 + offset) * (goblin ? 0.14 : 0.1) * idle * (1 - alert * 0.65);
    let stance = goblin ? 0.035 : 0;
    let bounce = breath * 0.004 * idle;

    if (armed) {
      arm[1] = THREE.MathUtils.lerp(arm[1], -0.22 - alert * 0.16, 0.66);
      elbow[1] = -0.35 - alert * 0.12;
      armOut[1] += 0.07;
    }
    if (!grounded && action !== 'dodge') {
      hip[0] = -0.55; hip[1] = 0.28;
      knee[0] = 0.75; knee[1] = 1.08;
      ankle[0] = -0.2; ankle[1] = -0.5;
      arm[0] = -0.8; arm[1] = armed ? -0.95 : -0.5;
      elbow[0] = -0.45; elbow[1] = -0.65;
      chestX += 0.1;
    }

    if (action === 'windup') {
      const pull = THREE.MathUtils.smoothstep(progress, 0, 0.85);
      arm[1] = THREE.MathUtils.lerp(-0.6, -2.15, pull);
      elbow[1] = -0.65;
      armOut[1] = 0.35;
      arm[0] = -0.7;
      elbow[0] = -0.7;
      chestY = -0.46 * pull;
      chestX -= 0.12 * pull;
      hip[0] = -0.28; hip[1] = 0.11;
      knee[0] = 0.48; knee[1] = 0.35;
      headY = 0.18 * pull;
      stance = 0.08;
    } else if (action === 'attack') {
      const combo = ((pose.combo || 0) % 3 + 3) % 3;
      const reverse = combo === 1 ? -1 : 1;
      const drive = samplePose(progress, [[0, 0], [0.19, 0], [0.46, 1], [0.7, 0.7], [1, 0]]);
      arm[1] = samplePose(progress, [[0, combo === 2 ? -2.5 : -1.95], [0.17, -2.15], [0.46, 0.4], [0.68, 0.48], [1, -0.22]]);
      elbow[1] = samplePose(progress, [[0, -0.74], [0.23, -0.9], [0.43, -0.1], [0.72, -0.22], [1, -0.35]]);
      armOut[1] = combo === 2 ? 0.15 : 0.2 + reverse * samplePose(progress, [[0, 0.38], [0.23, 0.45], [0.53, -0.42], [1, 0]]);
      arm[0] = -0.7 + drive * 0.28;
      elbow[0] = -0.88;
      chestY = reverse * samplePose(progress, [[0, -0.48], [0.23, -0.55], [0.5, 0.58], [0.78, 0.3], [1, 0]]);
      chestX += combo === 2 ? -0.12 + drive * 0.44 : drive * 0.15;
      chestZ = reverse * drive * -0.06;
      headY = -chestY * 0.55;
      hip[0] = -0.28; hip[1] = 0.28 - drive * 0.15;
      knee[0] = 0.37; knee[1] = 0.34 + drive * 0.17;
      stance = 0.07;
    } else if (action === 'dodge') {
      const tuck = Math.sin(progress * Math.PI);
      chestX = 0.28 + tuck * 0.55;
      chestZ = -0.2 * tuck;
      headX = -chestX * 0.55;
      arm[0] = -0.7; arm[1] = -0.9;
      elbow[0] = -1.2; elbow[1] = -1.05;
      hip[0] = -0.72; hip[1] = -0.24;
      knee[0] = 1.25 + tuck * 0.25; knee[1] = 1.0 + tuck * 0.4;
      stance = 0.08;
      bounce = 0.018 * tuck;
    } else if (action === 'hurt') {
      const recoil = Math.sin(Math.min(progress * 1.55, 1) * Math.PI);
      chestX -= recoil * 0.36;
      chestZ = recoil * 0.17;
      headX -= recoil * 0.22;
      arm[0] = -0.55; arm[1] = -0.75;
      elbow[0] = -0.5; elbow[1] = -0.4;
      hip[0] = -0.23; hip[1] = 0.16;
      knee[0] = 0.36; knee[1] = 0.25;
      stance = 0.05;
    } else if (action === 'dead') {
      const fall = THREE.MathUtils.smoothstep(progress, 0, 0.8);
      bodyZ = (goblin && offset > 1 ? -1 : 1) * fall * 1.49;
      bodyX = fall * 0.12;
      chestX = 0.2;
      chestY = 0;
      headX = 0.2;
      headY = 0.15;
      hip[0] = -0.24; hip[1] = 0.18;
      knee[0] = 0.6; knee[1] = 0.3;
      arm[0] = -0.25; arm[1] = 0.28;
      elbow[0] = -0.5; elbow[1] = -0.7;
      armOut[0] = -0.3; armOut[1] = 0.25;
    }
    /**
     * **Drawing a bow** (docs/combat-brief.md, phase 6). It comes after the action blocks and
     * after `armed`, because both of those are written for a man swinging something and a man at
     * full draw is doing the opposite: the bow arm goes out straight and stays there, and the
     * string hand comes back past the ear as the draw fills.
     *
     * `pose.draw` is 0 to 1 and is the real draw, not the key - `combat.draw` answers whether the
     * bow is actually drawing, which needs an arrow, the wind and an idle body.
     */
    const pull = THREE.MathUtils.clamp(Number(pose.draw) || 0, 0, 1);
    if (pull > 0) {
      // **A positive `arm` is forward**, which is the thing the first draft had backwards: it
      // put both hands level and a little behind him, 0.70 m apart across the body and 0.01 m
      // apart in depth — a man holding a washing line. A draw is the two hands far apart in
      // *depth*: the bow arm out at the target and the string hand back beside the jaw.
      arm[0] = 1.54; elbow[0] = -0.04; armOut[0] = -0.06;
      // The string hand starts at the grip and travels back as the draw fills.
      arm[1] = THREE.MathUtils.lerp(1.30, 0.34, pull);
      elbow[1] = THREE.MathUtils.lerp(-0.42, -2.34, pull);
      armOut[1] = 0.16 + pull * 0.46;
      // He turns his shoulder into it a little - and only a little. The arms hang off the chest,
      // so every degree the chest turns is a degree the arrow *looks* as though it will go and
      // will not: the arrow flies along the body's own facing. A quarter of a radian of stance
      // was enough to make a man at full draw look as if he were aiming at something else.
      chestY = -0.07 - pull * 0.03;
      chestX = 0.02;
      chestZ = 0;
      headY = -0.05 - pull * 0.02;
      headX = -0.02;
      hip[0] = -0.16; hip[1] = 0.12;
      knee[0] = 0.24; knee[1] = 0.2;
      stance = 0.07;
      bounce = 0;
    }
    if (action === 'idle' && movementBlend < .25 && pull === 0) {
      if (role === 'doomsayer') {
        // Orris leans on his staff, then insists on a point with his free hand.
        const insist = Math.pow(Math.max(0, Math.sin(seconds * .92 + offset)), 3);
        arm[0] = -.30 - insist * .77; elbow[0] = -.62 - insist * .43; armOut[0] = -.19 - insist * .19;
        arm[1] = -.10; elbow[1] = -.16; armOut[1] = .12;
        chestX = .065 + Math.sin(seconds * 1.2) * .025;
        chestY += Math.sin(seconds * .62) * .08;
        headX = -.04 + Math.sin(seconds * 2.0) * .043; headY += Math.sin(seconds * .8) * .16;
      }
      if (role === 'field-courier') {
        // A hand at the satchel and a glance along the road: always between jobs.
        const glance = Math.sin(seconds * .43 + offset);
        arm[1] = -.12; elbow[1] = -.65; armOut[1] = .20;
        arm[0] = -.10 + breath * .05; elbow[0] = -.25;
        chestZ += Math.sin(seconds * .65 + offset) * .015;
        headY = glance * .24; headX = -.015;
      } else if (role === 'forest-woodcutter') {
        // A tired shoulder roll and a hand resting near the work apron. The
        // motion stays small enough that she remains an attentive neighbor.
        const stretch = Math.pow(Math.max(0, Math.sin(seconds * .43 + offset)), 5);
        arm[0] = -.10 - stretch * .19; elbow[0] = -.28 - stretch * .22;
        armOut[0] = -.09 - stretch * .055;
        arm[1] = -.22; elbow[1] = -.86 + breath * .025; armOut[1] = .035;
        chestX = .042 - stretch * .07;
        chestZ = -.018 + stretch * .052;
        headX = -.012 + stretch * .045;
        headY = Math.sin(seconds * .36 + offset) * .16;
        hip[0] -= .025; knee[1] += .045;
      } else if (role === 'bridge-keeper') {
        // The worker checks the bridge with one thumb hooked over the toolbelt.
        arm[0] = -.12; elbow[0] = -.71; armOut[0] = -.17;
        arm[1] = -.05 + Math.sin(seconds * .9 + offset) * .055;
        elbow[1] = -.20; headY = Math.sin(seconds * .48 + offset) * .18;
        chestX = .025 + breath * .013;
      } else if (role === 'rise-custodian') {
        // Keep the short walking staff planted while the other hand holds a book.
        arm[1] = -.06; elbow[1] = -.11; armOut[1] = .12;
        arm[0] = -.33; elbow[0] = -1.01; armOut[0] = -.17;
        headX = .045 + Math.sin(seconds * .5 + offset) * .065;
        headY = Math.sin(seconds * .41 + offset) * .12;
        chestX = .035;
      } else if (role === 'relay-clerk') {
        // Papers move with the forearm; the free hand makes small counting marks.
        const note = Math.max(0, Math.sin(seconds * .72 + offset));
        arm[0] = -.27; elbow[0] = -1.10; armOut[0] = -.12;
        arm[1] = -.40 - note * .11; elbow[1] = -.93 - note * .18;
        armOut[1] = -.02; headX = .08 + note * .075;
        headY = -.10 + Math.sin(seconds * .37 + offset) * .07;
        chestX = .055;
      } else if (role === 'wine-seller') {
        // Juan never stops talking: both hands out, a big open shrug, a lean in to make the point.
        const riff = Math.sin(seconds * 1.1 + offset), point = Math.pow(Math.max(0, Math.sin(seconds * .7 + offset)), 3);
        arm[0] = -.3 - point * .35 + riff * .08; elbow[0] = -.9 - point * .3; armOut[0] = -.2 - Math.max(0, riff) * .18;
        arm[1] = -.26 + riff * .1; elbow[1] = -.85 + Math.max(0, -riff) * .25; armOut[1] = .2 + Math.max(0, -riff) * .15;
        chestX = .05 + point * .06; chestZ = riff * .03;
        headX = -.03 + point * .05; headY = Math.sin(seconds * .45 + offset) * .18;
        hip[0] = -.03; hip[1] = -.02; knee[0] = .07; knee[1] = .06;
      } else if (role === 'rainbow-dyer') {
        // Brandy: shoulders down, head low and to one side, and every so often a long, slow sigh. Somehow it works on her.
        const sigh = Math.pow(Math.max(0, Math.sin(seconds * .28 + offset)), 6);
        arm[0] = -.05 + sigh * .06; elbow[0] = -.22; armOut[0] = -.03;
        arm[1] = -.07 + sigh * .06; elbow[1] = -.3; armOut[1] = .03;
        chestX = .1 - sigh * .1 + breath * .006; chestZ = .03;
        headX = .17 - sigh * .15; headY = -.12 + Math.sin(seconds * .15 + offset) * .05;
        hip[0] = -.045; hip[1] = .02; knee[0] = .15; knee[1] = .02;
      } else if (role === 'bee-keeper') {
        // Troy stands easy with the smoker down at his side, rocks on his heels, and looks up at
        // whoever is coming long before they are near enough to speak.
        const rock = Math.sin(seconds * .33 + offset), greet = Math.pow(Math.max(0, Math.sin(seconds * .19 + offset)), 6);
        arm[1] = -.12 + greet * .35; elbow[1] = -.32 - greet * .5; armOut[1] = .06;
        arm[0] = -.06 - greet * .12; elbow[0] = -.28; armOut[0] = -.09 + greet * .06;
        chestX = .02 + breath * .01; chestZ = rock * .02;
        headX = -.04 - greet * .05; headY = Math.sin(seconds * .26 + offset) * .16;
        hip[0] = -.03 + rock * .015; hip[1] = -.03 - rock * .015; knee[0] = .08; knee[1] = .08;
      } else if (role === 'bat-seeker') {
        // Katy watches the birds through her spyglass: the right hand at the eyepiece, the left under the
        // tube to steady it, the head tipped up to the trees and following something slowly across them.
        const follow = Math.sin(seconds * .17 + offset);
        arm[1] = -1.7; elbow[1] = -1.95; armOut[1] = -.5;
        arm[0] = -1.5; elbow[0] = -1.75; armOut[0] = .55;
        chestX = -.06 + breath * .006; headX = -.2 + Math.sin(seconds * .11 + offset) * .03; headY = follow * .1;
        hip[0] = -.03; hip[1] = -.02; knee[0] = .07; knee[1] = .1;
      } else if (role === 'rival-keeper') {
        // She stands entirely still, which is the first thing anybody notices about her: the lamp
        // down at the end of her left arm where it lights the ground and not her face, the right
        // hand loose, and a head that turns to you and then does not move again.
        const breathe = Math.sin(seconds * .19 + offset);
        arm[0] = .06; elbow[0] = -.12; armOut[0] = .26;
        arm[1] = -.05; elbow[1] = -.14; armOut[1] = -.06;
        chestX = .01 + breath * .006; chestZ = 0;
        headX = -.02; headY = Math.pow(Math.max(0, Math.sin(seconds * .07 + offset)), 10) * .5 - .04;
        hip[0] = -.015 + breathe * .004; hip[1] = -.015 - breathe * .004; knee[0] = .03; knee[1] = .03;
      } else if (role === 'light-keeper') {
        // Addison stands like somebody who spent fourteen years standing on something that moved:
        // feet apart, weight going slowly from one to the other, one hand up on the coil of line
        // at her shoulder, and every so often a long look out at the water and back.
        const deck = Math.sin(seconds * .27 + offset), out = Math.pow(Math.max(0, Math.sin(seconds * .1 + offset)), 6);
        arm[0] = -.52 - out * .1; elbow[0] = -1.42; armOut[0] = .2;
        arm[1] = -.1 + deck * .03; elbow[1] = -.3; armOut[1] = -.12;
        chestX = -.02 + breath * .008; chestZ = deck * .025;
        headX = -.03 - out * .05; headY = out * .55 + deck * .06;
        hip[0] = -.02 + deck * .02; hip[1] = -.02 - deck * .02; knee[0] = .06; knee[1] = .06;
      } else if (role === 'wine-maker') {
        // Kat punches the cap down into a fermenter: both arms in to the elbow, a slow push from
        // the shoulders, and between pushes she straightens up and listens to it working.
        const push = Math.pow(Math.max(0, Math.sin(seconds * .62 + offset)), 3), listen = Math.pow(Math.max(0, Math.sin(seconds * .12 + offset)), 12);
        for (const side of [0, 1]) {
          arm[side] = -.62 - push * .34 + listen * .5;
          elbow[side] = -.75 + push * .3 + listen * .45;
          armOut[side] = (side ? -1 : 1) * (.14 - push * .05);
        }
        chestX = .22 - listen * .26 + push * .1 + breath * .008;
        headX = .3 - listen * .42; headY = Math.sin(seconds * .17 + offset) * .08;
        hip[0] = -.04; hip[1] = -.03; knee[0] = .12 + push * .05; knee[1] = .1;
      } else if (role === 'vine-keeper') {
        // Imani works the canopy in front of her: the left hand up in the wire turning a leaf over
        // to see the underside of it, the right hand down by the apron, and the head tipped to
        // whatever her fingers have found. Every so often she lets it go and looks along the row.
        const fingers = Math.sin(seconds * .53 + offset), along = Math.pow(Math.max(0, Math.sin(seconds * .11 + offset)), 14);
        arm[0] = -1.24 + along * .5; elbow[0] = -1.05 + along * .3; armOut[0] = .34 - along * .12;
        arm[1] = -.14; elbow[1] = -.52; armOut[1] = -.07;
        chestX = .05 + breath * .008; chestZ = -.03 + along * .05;
        headX = -.04 - along * .06 + fingers * .015; headY = -.22 + along * .42;
        hip[0] = -.03; hip[1] = -.02; knee[0] = .09; knee[1] = .06;
      } else if (role === 'wine-clerk') {
        // Nika reads: the book held low in both hands, head bent to it, a page turned now and then.
        const page = Math.pow(Math.max(0, Math.sin(seconds * .31 + offset)), 12);
        arm[0] = -.36; elbow[0] = -1.2; armOut[0] = .14;
        arm[1] = -.36 - page * .1; elbow[1] = -1.2 + page * .25; armOut[1] = -.14 - page * .06;
        chestX = .06 + breath * .008; headX = .3 - page * .08; headY = Math.sin(seconds * .12 + offset) * .04;
        hip[0] = -.02; hip[1] = -.03; knee[0] = .08; knee[1] = .1;
      } else if (role === 'commons-miller') {
        // One hand rests by the flour apron; an occasional short brush and a
        // slow change of weight suggest a worker taking a welcome break.
        const brush = Math.pow(Math.max(0, Math.sin(seconds * .46 + offset)), 6);
        const settle = Math.sin(seconds * .29 + offset);
        arm[0] = -.08 + breath * .022; elbow[0] = -.27;
        arm[1] = -.12 - brush * .17; elbow[1] = -.61 - brush * .25;
        armOut[0] = -.11; armOut[1] = -.055 + brush * .065;
        chestX = .028; chestZ = settle * .021;
        headX = -.014 + brush * .035; headY = Math.sin(seconds * .34 + offset) * .15;
        hip[0] = -.034 - settle * .018; hip[1] = -.016 + settle * .018;
        knee[0] = .084 + Math.max(0, settle) * .035; knee[1] = .084 + Math.max(0, -settle) * .035;
      } else if (role === 'reed-worker') {
        // A loose hand at the spool, a patient glance along the bank. The
        // shoulders counter the hips instead of swaying as one stiff block.
        const settle = Math.sin(seconds * .33 + offset);
        arm[0] = -.07; elbow[0] = -.58 + breath * .04; armOut[0] = .015;
        arm[1] = -.035 + Math.sin(seconds * .68 + offset) * .04; elbow[1] = -.22; armOut[1] = .10;
        chestX = .036 + breath * .01; chestZ = -.022 * settle;
        headX = .015; headY = Math.sin(seconds * .38 + offset) * .20;
        hip[0] = -.02 + settle * .019; hip[1] = -.028 - settle * .019;
        knee[0] = .085 + Math.max(0, -settle) * .03; knee[1] = .085 + Math.max(0, settle) * .03;
      } else if (role === 'shelter-keeper') {
        // Oda lightly gathers her shawl with one hand. A listening nod and
        // small, unhurried breath keep age from reading as a frozen hunch.
        const nod = Math.pow(Math.max(0, Math.sin(seconds * .39 + offset)), 5);
        arm[0] = -.16; elbow[0] = -.86 + breath * .028; armOut[0] = .025;
        arm[1] = -.055 + breath * .025; elbow[1] = -.26; armOut[1] = .105;
        chestX = .07 + breath * .012; chestZ = Math.sin(seconds * .25 + offset) * .016;
        headX = -.042 + nod * .083; headY = Math.sin(seconds * .31 + offset) * .12;
        knee[0] = .10; knee[1] = .12; hip[0] = -.033; hip[1] = -.025;
      } else if (role === 'legion-soldier') {
        // At attention: the spear planted by the right foot, the shield hung
        // from the left forearm, a slow shift of weight and a look down the road.
        const shift = Math.sin(seconds * .27 + offset);
        arm[1] = -.09 + breath * .012; elbow[1] = -.12; armOut[1] = .09;
        arm[0] = -.14; elbow[0] = -.98; armOut[0] = -.14;
        chestX = -.01 + breath * .008; chestZ = shift * .012;
        headX = -.02; headY = Math.sin(seconds * .31 + offset) * .22;
        hip[0] = -.02 + shift * .014; hip[1] = -.02 - shift * .014;
        knee[0] = .06 + Math.max(0, shift) * .03; knee[1] = .06 + Math.max(0, -shift) * .03;
      } else if (role === 'legion-officer') {
        // One hand rests on the sword hilt; the other makes the occasional
        // short point of a man used to being obeyed.
        const point = Math.pow(Math.max(0, Math.sin(seconds * .5 + offset)), 4);
        arm[0] = .16; elbow[0] = -.58; armOut[0] = -.3;
        arm[1] = -.34 - point * .55; elbow[1] = -.92 - point * .2; armOut[1] = .16 + point * .08;
        chestX = -.035 + breath * .008; chestY += Math.sin(seconds * .44 + offset) * .05;
        headX = -.035 + point * .03; headY = Math.sin(seconds * .36 + offset) * .14;
        hip[0] = -.028; hip[1] = -.018; knee[0] = .07; knee[1] = .05;
      } else if (role === 'suvali-guard') {
        // Bored on the border: leaning a little on the spear, weight on one leg.
        const settle = Math.sin(seconds * .24 + offset);
        arm[1] = -.22 + breath * .01; elbow[1] = -.5; armOut[1] = .2;
        arm[0] = -.06; elbow[0] = -.3; armOut[0] = -.06;
        chestX = .05; chestZ = -.06 + settle * .015;
        headX = .03; headY = Math.sin(seconds * .29 + offset) * .28;
        hip[0] = -.03 + settle * .01; hip[1] = -.05; knee[0] = .17; knee[1] = .05;
      } else if (role === 'elodi-guard') {
        // Upright and light on the feet: the spear held close, the weight forward, a slow sweep of the eyes along the wall.
        const sweep = Math.sin(seconds * .21 + offset), ready = Math.sin(seconds * .37 + offset);
        arm[1] = -.16 + breath * .01; elbow[1] = -.34; armOut[1] = .12;
        arm[0] = -.3; elbow[0] = -1.05; armOut[0] = -.2;
        chestX = .04 + breath * .006; chestZ = ready * .01;
        headX = -.01; headY = sweep * .42;
        hip[0] = -.05 + ready * .012; hip[1] = .03 - ready * .012; knee[0] = .12; knee[1] = .09;
      }
      if (['commons-miller', 'reed-worker', 'shelter-keeper', 'legion-soldier', 'legion-officer', 'suvali-guard', 'elodi-guard'].includes(role))
        for (let i = 0; i < 2; i++) ankle[i] = -hip[i] * .52 - knee[i] * .67;
      if (pose.fishing) {
        const patience = Math.sin(seconds * 1.8 + offset) * .023;
        arm[1] = -.11 + patience; elbow[1] = -.40; armOut[1] = .04;
        arm[0] = -.39 + patience; elbow[0] = -.72; armOut[0] = -.08;
        chestX = .045; chestY = -.025; headX = .09 + patience; headY = .045;
      }
    }
    if (pose.riding) {
      // Astride: thighs forward and apart, shins hanging, hands low on the reins. The seat follows the horse's stride,
      // and the rider leans into a canter. The host passes the horse's pace; the rider's own speed is zero.
      const gait = THREE.MathUtils.clamp((Number(pose.riding.pace) || 0) / 12, 0, 1), beat = Math.sin(seconds * (5.5 + gait * 8) + offset);
      for (let i = 0; i < 2; i++) {
        hip[i] = -1.08 + beat * .035 * gait; knee[i] = 1.22; ankle[i] = -.12;
        arm[i] = -.52 + beat * .05 * gait; elbow[i] = -.78; armOut[i] = (i ? 1 : -1) * .1;
      }
      stance = .8; chestX = .05 + gait * .2 + beat * .025 * gait; chestY = 0; chestZ = 0; bodyX = 0; bodyZ = 0;
      headX = -.03 - gait * .13; headY *= .5; bounce = beat * .018 * gait;
    }
    if (pose.swimming) {
      // In the water: head up, chest back a little, the arms pulling alternately and the legs
      // kicking small and quick. The host sinks the whole figure to the chest (src/main.js), so
      // what shows above the surface is a head, two shoulders and the arms coming over.
      const pull = stridePhase * .62, kick = Math.sin(stridePhase * 1.9 + offset);
      for (let i = 0; i < 2; i++) {
        const reach = Math.sin(pull + i * Math.PI), over = Math.max(0, reach);
        arm[i] = -.58 + reach * .92;
        elbow[i] = -.46 - over * .62;
        armOut[i] = (i ? 1 : -1) * (.46 + over * .22);
        const beat = i ? kick : -kick;
        hip[i] = -.22 + beat * .24;
        knee[i] = .3 + Math.max(0, beat) * .46;
        ankle[i] = -.18;
      }
      stance = .1; chestX = -.14; chestY = 0; chestZ = 0; bodyX = 0; bodyZ = 0;
      headX = -.24; headY *= .3; bounce = Math.sin(seconds * 1.7 + offset) * .028;
    }
    // Down on the ground, standing still: on both knees (`posture: 'kneel'`), or sat with the knees drawn up
    // (`posture: 'sit-ground'`); the head bowed and the hands in the lap or round the knees. The seat, not the soles, takes the weight.
    let seatY = null;
    const lowPosture = !goblin && movementBlend < .2 && action === 'idle' && (pose.posture === 'kneel' || pose.posture === 'sit-ground') ? pose.posture : null;
    if (lowPosture) {
      const sway = Math.sin(seconds * .6 + offset) * .025, kneel = lowPosture === 'kneel';
      for (let i = 0; i < 2; i++) {
        if (kneel) { hip[i] = -.35; knee[i] = Math.PI / 2 + .35; ankle[i] = -.25; arm[i] = -.28; elbow[i] = -.95; }
        else { hip[i] = -1.9; knee[i] = 1.4; ankle[i] = .35; arm[i] = -.95; elbow[i] = -.55; }
        armOut[i] = (i ? 1 : -1) * (kneel ? .04 : .16);
      }
      stance = kneel ? .1 : .22; chestX = (kneel ? .2 : .32) + sway; chestY = 0; chestZ = 0; bodyX = 0; bodyZ = 0;
      headX = .38 + sway; headY *= .25; bounce = 0;
      seatY = kneel ? upperLength * Math.cos(hip[0]) - legs[0].position.y + .05 : .13 - legs[0].position.y;
    }
    const rotate = (object, x, y, z) => {
      object.rotation.x = THREE.MathUtils.lerp(object.rotation.x, x, damping);
      object.rotation.y = THREE.MathUtils.lerp(object.rotation.y, y, damping);
      object.rotation.z = THREE.MathUtils.lerp(object.rotation.z, z, damping);
    };
    rotate(chest, chestX, chestY, chestZ);
    rotate(body, bodyX, step * 0.026 * movementBlend, bodyZ);
    rotate(head, headX, headY, -chestZ * 0.6 - bodyZ * (action === 'dead' ? 0 : 0.4));
    if (clothPivot) {
      // The curved cloak hangs from its own soft joint. Its slower response
      // lets the hem trail a turn or lift with a run without a cloth solver.
      const settle = 1 - Math.exp(-5.5 * dt);
      // In the saddle the hem lies back over the horse's croup instead of hanging through it.
      const lift = 0.025 + run * 0.2 + (grounded ? 0 : 0.12) + (action === 'dodge' ? 0.26 : 0) + (pose.riding ? 0.55 : 0);
      clothPivot.rotation.x = THREE.MathUtils.lerp(clothPivot.rotation.x, lift + Math.cos(stridePhase * 2) * movementBlend * 0.025, settle);
      clothPivot.rotation.y = THREE.MathUtils.lerp(clothPivot.rotation.y, -chestY * 0.15, settle);
      clothPivot.rotation.z = THREE.MathUtils.lerp(clothPivot.rotation.z, Math.sin(seconds * 1.35 + offset) * 0.018 + step * movementBlend * 0.035, settle);
    }
    // A falconer carries the bird on the left fist: upper arm in at the side, forearm level and forward.
    if (pose.falconer) { arm[0] = -0.28; elbow[0] = -1.35; armOut[0] = -0.1; }
    // The face turns to meet what is in front of him. The arm alone brings the shield up but
    // leaves it edge-on to the blow, so the buckler is twisted on the forearm as it rises: on
    // guard its face points (-.62, -.30, .72) - forward and a little outward, which is how a
    // shield is actually carried across the body - and flat out to the side again when it drops.
    if (buckler) buckler.rotation.y = pose.guarding ? GUARD_SHIELD.turn : 0;
    // **On guard.** The off arm brings the shield up across the front of the body, the weapon
    // hand drops back out of the way, and he turns a little shield-side-on. This is the picture
    // of `combat.guard` being true and nothing else: when the shield is not up - no wind, mid
    // swing, rocked - the host passes false and the arm hangs, so the player is never told he is
    // covered when he is not. Pose only: no timing, no tell, no window.
    if (pose.guarding) {
      // Measured, not guessed: this puts the buckler at (-.16, 1.31, .36) with its face pointing
      // .81 forward - across the centreline, at chin height, in front of him. The first draft
      // raised it but left it out at his side, where it read as a man holding a plate.
      arm[0] = -1.1; elbow[0] = -1.0; armOut[0] = .55;
      arm[1] = -.22; elbow[1] = -.55; armOut[1] = .06;
      chestY = .16; chestX = .05; headY = -.06;
    }
    for (let i = 0; i < 2; i++) {
      const side = i ? 1 : -1;
      rotate(legs[i], hip[i], 0, side * stance);
      rotate(knees[i], knee[i], 0, 0);
      // At rest the heel is down; during push-off the sole rolls over its toe.
      const footPitch = action === 'idle' ? ankle[i] : -hip[i] * 0.55 - knee[i] * 0.72;
      rotate(ankles[i], footPitch, side * 0.04, 0);
      rotate(arms[i], arm[i], side * breath * 0.015 * idle, armOut[i]);
      rotate(elbows[i], elbow[i], 0, side * 0.015);
      rotate(wrists[i], 0, Math.sin(seconds * 1.1 + i + offset) * 0.025 * idle, side * 0.045);
    }
    // Analytic sole height keeps one foot in contact with the ground, while
    // the knee bends and the other foot clears it. This also grounds dodges.
    let soleHeight = Infinity;
    for (let i = 0; i < 2; i++) {
      const thigh = legs[i].rotation.x;
      const shin = thigh + knees[i].rotation.x;
      const foot = shin + ankles[i].rotation.x;
      const soleY = goblin ? -0.077 : -0.105;
      const heelToe = goblin ? 0.121 : 0.1335;
      const soleZ = goblin ? 0.065 : 0.049;
      const y = legs[i].position.y - upperLength * Math.cos(thigh) - lowerLength * Math.cos(shin)
        + soleY * Math.cos(foot) - soleZ * Math.sin(foot) - 0.0175 * Math.abs(Math.cos(foot)) - heelToe * Math.abs(Math.sin(foot));
      soleHeight = Math.min(soleHeight, y);
    }
    const y = seatY ?? (action === 'dead' ? THREE.MathUtils.smoothstep(progress, 0, 0.8) * 0.14 : grounded ? -soleHeight + bounce : 0);
    body.position.y = THREE.MathUtils.lerp(body.position.y, y, 1 - Math.exp(-22 * dt));
    body.position.x = Math.sin(seconds * 0.78 + offset) * 0.008 * idle;
    if (action === 'dead') {
      // A falling body lands on its arm/side, rather than clipping through the
      // path. Ordinary walking uses the much cheaper analytic foot solver.
      body.updateWorldMatrix(true, true);
      fallenBounds.setFromObject(body);
      body.parent.getWorldPosition(actorOrigin);
      body.position.y += actorOrigin.y - fallenBounds.min.y;
    }
  }
  return { animate, setArmed, setShield };
}

/** An ordinary hired traveler in cloth. Feet rest at y=0, forward is +Z. */
/** What a villager's model can take up in a fight (`createCharacter({ wields })`). */
const VILLAGER_WEAPONS = Object.freeze({ 'bearded-axe': makeAxe, 'simple-sword': makeSword, 'iron-mace': makeMace, 'long-dagger': makeDagger });

/**
 * **Nobody wears a hat unless somebody asked for one** (the user, 22 September 2026: "so many
 * characters have hats when I never said anything about wanting them to have hats").
 *
 * `hat` used to default to true for every role that was not on a list of twenty-one exceptions,
 * so a soft country cap went on six villagers - the harbourmaster among them - that nobody had
 * ever asked to be wearing one. It defaults to false now and is opt-in three ways: a caller that
 * passes `hat: true`, a look that says `hat: true`, and the hired company, whose eleven headgears
 * are part of eleven authored designs (`look.headgear`, tests/mercenary-characters.test.js).
 *
 * `HATTED` is the short list of people whose hat *is* the design - the badge on the waykeeper's
 * cap, the brim and ribbon on the pond fisher's - and it is a list rather than a default, so
 * adding to it is a decision somebody makes on purpose.
 *
 * A soldier's helmet is not a hat and is not affected: it is the Ambroni build (`isSoldier`).
 */
// 'mercenary' is here because the hired company's eleven headgears are authored looks, and the
// soft cap is the one they hang on; the traveler built from a roster look is role 'traveler'
// and keeps his own bare head, exactly as before.
const HATTED = Object.freeze(['warden', 'pond-fisher', 'mercenary', 'sorcerer']);

export function createCharacter({ role = 'traveler', tunic = tunicForRole(role), skin = skinForRole(role), hat = HATTED.includes(role), armed = false, look = null, wields = null } = {}) {
  // Any of the eleven mercenaries can be the player (src/player-characters.js). Given a roster
  // look, the traveler is built as that hired sword — build, hair, garment, marks, weapon —
  // and keeps only what is his alone: the satchel, the full weapon swap and the fishing grip.
  // Cromb, who is the traveler and has no look, is built exactly as he always was.
  const isPlayer = role === 'traveler';
  const isTraveler = isPlayer && !look;
  const isCook = role === 'acorn-cook';
  const isDoomsayer = role === 'doomsayer', isPondFisher = role === 'pond-fisher';
  const isRoadWorker = Object.hasOwn(ROAD_CLOTH, role);
  const isCourier = role === 'field-courier', isBridgeKeeper = role === 'bridge-keeper';
  const isCustodian = role === 'rise-custodian', isClerk = role === 'relay-clerk';
  const isWoodcutter = role === 'forest-woodcutter';
  const isBirdWatcher = role === 'bird-watcher';
  // Perrin, who keeps the bird garden in Tidehaven. Not a birder: a man with a garden that birds
  // come to, which he considers a different and more sensible thing to be (src/birding.js).
  const isGardenKeeper = role === 'garden-keeper';
  // Tharganhom, the Wine Attic in Solis: Juan, who keeps it, and Nika, who works the floor.
  const isWineSeller = role === 'wine-seller', isWineClerk = role === 'wine-clerk';
  // Katy, at Vaervelm Caelazh: watching the birds, and looking for Batman (src/katy.js). Nika's slight build.
  // The slighter build - shorter, narrower through the shoulders, a lighter jaw. It was Nika's
  // and Katy's; `look.slight` opens it to anybody, which is how Jojo the harbourmaster and Jess
  // of the Stills read as the women they are (the user, 22 September 2026).
  const isKaty = role === 'bat-seeker', slight = isWineClerk || isKaty || look?.slight === true;
  // Troy, who keeps the bees at the Bee Fold (src/beekeeper.js): curly red hair, a red beard and a grin.
  const isKeeper = role === 'bee-keeper';
  // Imani, who keeps the vines at Vaervelm Caelazh (src/vineyard.js): a blunt black bob, steel
  // spectacles for close work, and a stained canvas apron with the shears standing out of it.
  const isVineKeeper = role === 'vine-keeper';
  // Kat, who makes the wine (src/winery.js): brown hair to the shoulders, a leather apron over
  // rolled sleeves, and purple to the elbow from the cap she has just put down.
  const isWinemaker = role === 'wine-maker';
  // Addison, who keeps the Suval Light (src/lighthouse.js): fourteen years at sea, dirty
  // blonde and wind-dried, in a jersey and oilskins with a knife on a lanyard.
  const isLightKeeper = role === 'light-keeper';
  // Subtractidaughter, who keeps the Elod Light across the water (src/rival-light.js): the same
  // face and the same build, cut square at the jaw and dressed in black.
  const isRivalKeeper = role === 'rival-keeper';
  const isKeeperKin = isLightKeeper || isRivalKeeper;
  // Brandy Frank, Tidehaven's dyer: impossible colours, and an Eeyore sort of day, every day.
  const isDyer = role === 'rainbow-dyer';
  const isMiller = role === 'commons-miller', isReedWorker = role === 'reed-worker', isShelterKeeper = role === 'shelter-keeper';
  const isLocalWorker = isMiller || isReedWorker || isShelterKeeper;
  const isLegionary = role === 'legion-soldier', isOfficer = role === 'legion-officer', isSuvaliGuard = role === 'suvali-guard';
  // Elod's guards: light, black and quick. `look.kit` is 'spear' (the default) or 'bow'.
  const isElodiGuard = role === 'elodi-guard';
  const isSoldier = isLegionary || isOfficer || isSuvaliGuard || isElodiGuard;
  // Ambron's own: a man-at-arms of the Empire in mail and plate under the red tabard, and his officers.
  const isAmbroni = isLegionary || isOfficer;
  // A hired sword from abroad: the traveler's kind of cloth and sword, a leather jerkin,
  // and a look (hair, beard, cap) chosen by the roster rather than the role.
  const isMercenary = role === 'mercenary' || (isPlayer && !!look);
  // The whole of a hired sword's appearance is roster data: build, headgear,
  // hair, facial hair, garment and small marks. Nothing here is keyed on his id.
  const mercBuild = isMercenary ? MERCENARY_BUILDS[look?.build] ?? MERCENARY_BUILDS.ordinary : null;
  const headgear = isMercenary ? look?.headgear ?? (look?.cap ? 'soft-cap' : 'bare') : '';
  // The thirteen heads of hair were built for the hired company, and anybody else got the
  // village crop. A villager who asks for one of them by name now gets it: Jojo the harbourmaster
  // wears her hair long (`look.hairStyle`), and the colour is hers too (`look.hair`).
  const hairStyle = look?.hairStyle ?? (isMercenary ? 'cropped' : '');
  const facialHair = isMercenary ? look?.facialHair ?? (look?.beard ? 'full' : 'clean') : '';
  const garment = isMercenary ? look?.garment ?? 'jerkin' : '';
  const marks = isMercenary && Array.isArray(look?.marks) ? look.marks : [];
  const bareForearms = isMercenary && (garment === 'bare-forearms' || garment === 'sleeveless');
  if (isMercenary) hat = headgear === 'soft-cap';
  const group = new THREE.Group();
  group.name = `character-${role}`;
  const body = new THREE.Group();
  group.add(body);

  const cloth = material(tunic);
  const clothLight = material(new THREE.Color(tunic).lerp(new THREE.Color(0xe4d3a1), 0.18));
  const linen = material(isWineSeller || slight || isDyer ? 0xe4dccb : isElodiGuard ? 0x46464b : isSoldier ? 0xcdbf9f : isRoadWorker ? 0xc5b79a : isTraveler ? 0xb8a386 : isCook ? 0xd6c4a0 : isDoomsayer ? 0x898474 : role === 'fisher' || isPondFisher ? 0xd5cfb3 : 0xd2ad66);
  const skinMat = material(skin);
  const noseMat = material(new THREE.Color(skin).lerp(new THREE.Color(0xd99476), 0.22));
  const leather = material(0x664833);
  const bootMat = material(isElodiGuard ? 0x2e2824 : 0x49392c);
  const soleMat = material(0x302b24);
  // A hired sword's legs take their colour from his own cloth, so eleven men do
  // not stand in eleven different tunics above one shared pair of olive trousers.
  const trousers = material(isDyer ? 0x8e44ec : isMercenary ? new THREE.Color(tunic).multiplyScalar(0.66).lerp(new THREE.Color(0x585244), 0.45) : isSoldier ? (isSuvaliGuard ? 0x4a4a45 : isElodiGuard ? 0x2c2c30 : 0x5a4a3c) : isLocalWorker ? isReedWorker ? 0x5a685c : 0x655a48 : isWoodcutter ? 0x635846 : isVineKeeper ? 0x584b3a : isWinemaker ? 0x4d4a44 : isRivalKeeper ? 0x232427 : isLightKeeper ? 0x3c4a4e : isBirdWatcher ? 0x3b3129 : isGardenKeeper ? 0x4a4436 : isTraveler ? 0x68523c : role === 'fisher' ? 0x667779 : 0x76714e);
  const hairMat = material(Number.isInteger(look?.hair) ? look.hair : isWineSeller ? 0x241b16 : isWineClerk ? 0xb2461f : isKaty ? 0xead38e : isKeeperKin ? 0x9c8355 : isWinemaker ? 0x53381f : isVineKeeper ? 0x1b1512 : isKeeper ? 0x87301a : isDyer ? 0x6b3a26 : isBirdWatcher ? 0x5c4430 : isGardenKeeper ? 0x877b62 : isShelterKeeper ? 0x797368 : isReedWorker ? 0x403b32 : isMiller ? 0x624731 : isCustodian ? 0x8e8b7d : isBridgeKeeper ? 0x42382e : isClerk ? 0x685445 : isTraveler ? 0x806044 : isCook ? 0x624330 : isDoomsayer ? 0xa2a293 : isPondFisher ? 0x5d5140 : role === 'harbormaster' ? 0x79776b : role === 'warden' ? 0x503d30 : 0x6b462c);
  const dark = material(0x282d23);
  const whites = material(0xf3e9cc);
  const gold = isTraveler || isCook || isDoomsayer || isPondFisher || isRoadWorker ? bootMat : material(0xc8a250, { metalness: 0.28, roughness: 0.52 });
  const bagMat = material(0xa17a4b);
  // Shared stock for the hired company: shaved scalps and jaws, campaign iron,
  // fur bought against a cold nobody warned them about, felt, ink and old scars.
  const stubbleMat = isMercenary ? material(new THREE.Color(skin).lerp(hairMat.color, 0.6)) : null;
  const mercIron = isMercenary ? material(0x8b8d86, { metalness: 0.44, roughness: 0.6 }) : null;
  const mercIronDark = isMercenary ? material(0x5f625c, { metalness: 0.44, roughness: 0.6 }) : null;
  const mercFur = isMercenary ? material(0x8e8066) : null;
  const mercFurDark = isMercenary ? material(0x6a5c46) : null;
  const mercFelt = isMercenary ? material(0x473b30) : null;
  const mercStrap = isMercenary ? material(0x4b3a2b) : null;
  // Half the new company wears spectacles, so the wire and the glass are made once each
  // rather than per face: colour is free inside a finish, another metal is not.
  const mercWire = isMercenary ? material(0x53575c, { metalness: 0.62, roughness: 0.34 }) : null;
  const mercGlass = isMercenary ? material(0xdfe7ea, { roughness: 0.12, metalness: 0.1 }) : null;
  const mercInk = isMercenary ? material(new THREE.Color(skin).multiplyScalar(0.4)) : null;
  const mercScar = isMercenary ? material(new THREE.Color(skin).lerp(new THREE.Color(0x9a5442), 0.5)) : null;

  // Separate hips, knees and ankles keep the planted foot quiet while the
  // trailing heel lifts. The limbs share geometry, never a skinned-mesh shader.
  const legs = [];
  const knees = [];
  const ankles = [];
  for (const side of [-1, 1]) {
    const pivot = new THREE.Group();
    pivot.position.set(side * 0.105, 0.74, 0);
    body.add(pivot);
    legs.push(pivot);
    round(pivot, trousers, [0, -0.155, 0], [0.081, 0.185, 0.085]);
    const knee = new THREE.Group();
    knee.position.y = -0.325;
    pivot.add(knee);
    knees.push(knee);
    round(knee, trousers, [0, 0, 0], [0.077, 0.065, 0.08]);
    box(knee, bootMat, [0, -0.135, 0.014], [0.169, 0.225, 0.184]);
    box(knee, leather, [0, -0.045, 0.016], [0.184, 0.065, 0.20]);
    const ankle = new THREE.Group();
    ankle.position.y = -0.29;
    knee.add(ankle);
    ankles.push(ankle);
    round(ankle, bootMat, [0, -0.045, 0.052], [0.098, 0.085, 0.155]);
    box(ankle, soleMat, [0, -0.105, 0.049], [0.18, 0.035, 0.267]);
  }

  // The traveler wears a short, mended cloth tunic over ordinary trousers.
  const hem = isShelterKeeper ? new THREE.CylinderGeometry(.218, .30, .60, 9) : isMiller ? new THREE.CylinderGeometry(.218, .285, .46, 8) : isDoomsayer ? new THREE.CylinderGeometry(.219, .35, .81, 9) : isCook ? new THREE.CylinderGeometry(0.214, 0.34, 0.69, 10) : isCourier || isClerk ? new THREE.CylinderGeometry(.218, .27, .42, 8) : isTraveler
    ? new THREE.CylinderGeometry(0.218, 0.244, 0.158, 8)
    : new THREE.CylinderGeometry(0.218, 0.285, 0.275, 8);
  part(body, hem, cloth, [0, isShelterKeeper ? .64 : isMiller ? .718 : isDoomsayer ? .563 : isCook ? 0.585 : isCourier || isClerk ? .753 : isTraveler ? 0.881 : 0.814, 0], [1, 1, isCook || isDoomsayer ? 0.79 : 0.72]);
  const torsoShape = new THREE.CylinderGeometry(isCook ? 0.226 : 0.252, isCook ? 0.2 : 0.217, 0.395, 8);
  part(body, torsoShape, cloth, [0, 1.12, 0], [isDyer ? 0.86 : 1, 1, isDyer ? 0.64 : 0.68]);
  if (isMercenary) {
    // The plain laced jerkin is the company's only shared piece, and the two men
    // in a quilted coat or a sleeveless cut do not wear even that.
    if (garment !== 'gambeson') {
      part(body, new THREE.CylinderGeometry(0.262, 0.228, 0.34, 8), leather, [0, 1.105, 0], [1, 1, 0.7]);
      for (const y of [1.2, 1.1, 1.0]) box(body, bootMat, [0, y, 0.187], [0.05, 0.02, 0.012]);
    }
    // A heavy man carries the weight on his shoulders, a slight one does not.
    if (mercBuild.shoulders >= 0.03) for (const side of [-1, 1]) round(body, cloth, [side * 0.185, 1.298, -0.005], [0.145, 0.085, 0.148]);
  }
  part(body, UNIT_CYLINDER, leather, [0, 0.935, 0], [0.23, 0.073, 0.16]);
  box(body, gold, [0, 0.938, 0.166], [0.076, 0.059, 0.024]);
  box(body, leather, [0, 0.939, 0.181], [0.043, 0.031, 0.009]);
  // Linen neckline and an asymmetric laced opening lend the plain tunic detail.
  round(body, linen, [0, 1.294, 0.035], [0.114, 0.039, 0.092]);
  ribbon(body, linen, [-0.078, 1.304, 0.122], [0, 1.224, 0.172], 0.036);
  ribbon(body, linen, [0.078, 1.304, 0.122], [0, 1.224, 0.172], 0.036);
  box(body, leather, [0, 1.2, 0.176], [0.012, 0.05, 0.008]);
  box(body, linen, [0, 1.206, 0.184], [0.037, 0.008, 0.008]);
  box(body, linen, [0, 1.19, 0.184], [0.03, 0.008, 0.008]);
  if (isTraveler) {
    for (const [x, z, tilt] of [[-0.111, 0.16, -0.08], [0.104, -0.163, 0.09]]) {
      const patch = box(body, clothLight, [x, 0.855, z], [0.078, 0.08, 0.018]);
      patch.rotation.z = tilt;
      for (const offset of [-0.024, 0.024]) {
        box(body, linen, [x + offset, 0.883, z + Math.sign(z) * 0.011], [0.008, 0.018, 0.005]);
      }
    }
  }

  const arms = [];
  const elbows = [];
  const wrists = [];
  for (const side of [-1, 1]) {
    const pivot = new THREE.Group();
    pivot.position.set(side * (isCook || slight || isDyer ? 0.233 : 0.258 + (mercBuild ? mercBuild.shoulders : 0) + (isWineSeller ? 0.03 : 0)), 1.265, 0);
    pivot.rotation.z = side * 0.085;
    body.add(pivot);
    arms.push(pivot);
    if (isMercenary && garment === 'sleeveless') {
      // Cut off at the shoulder: bare arms and a leather shoulder cap.
      round(pivot, leather, [side * 0.006, -0.012, 0], [0.1, 0.055, 0.103]);
      round(pivot, skinMat, [side * 0.01, -0.058, 0], [0.09, 0.094, 0.095]);
      part(pivot, new THREE.CylinderGeometry(0.086, 0.07, 0.2, 8), skinMat, [side * 0.018, -0.147, 0], [1, 1, 1.03]);
    } else if (isTraveler || isRoadWorker || isSoldier || isMercenary || isWineSeller || isVineKeeper || isWinemaker || isKeeperKin || slight || isDyer) {
      // Continuous, tapered cloth sleeves avoid a segmented shoulder-pad
      // silhouette. Only an unadorned rolled cuff changes color.
      round(pivot, cloth, [side * 0.01, -0.053, 0], [0.088, 0.09, 0.093]);
      part(pivot, new THREE.CylinderGeometry(0.086, 0.069, 0.208, 8), cloth, [side * 0.018, -0.143, 0], [1, 1, 1.03]);
    } else {
      round(pivot, clothLight, [side * 0.015, -0.065, 0], [0.107, 0.124, 0.117]);
      box(pivot, linen, [side * 0.019, -0.17, 0], [0.133, 0.17, 0.143]);
    }
    const elbow = new THREE.Group();
    elbow.position.set(side * 0.019, -0.245, 0);
    pivot.add(elbow);
    elbows.push(elbow);
    if (isBridgeKeeper || isWoodcutter || isMiller || isReedWorker || bareForearms || isWineSeller || isVineKeeper || isWinemaker || isKeeperKin) {
      // Rolled sleeves show bare working forearms, not bracers or armor.
      part(elbow, UNIT_CYLINDER, garment === 'sleeveless' ? skinMat : linen, [0, -.017, .003], [.085, .067, .088]);
      round(elbow, skinMat, [0, -.103, .007], [.067, .082, .07]);
    } else if (isTraveler || isRoadWorker || isSoldier || isMercenary || slight || isDyer) {
      round(elbow, cloth, [0, -0.055, 0.003], [0.068, 0.083, 0.071]);
      part(elbow, UNIT_CYLINDER, linen, [0, -0.116, 0.006], [0.068, 0.037, 0.073]);
      round(elbow, skinMat, [0, -0.154, 0.006], [0.057, 0.039, 0.06]);
    } else {
      round(elbow, linen, [0, -0.066, 0], [0.067, 0.09, 0.071]);
      box(elbow, clothLight, [0, -0.115, 0.005], [0.142, 0.05, 0.151]);
    }
    const wrist = new THREE.Group();
    wrist.position.set(0, -0.177, 0.011);
    elbow.add(wrist);
    wrists.push(wrist);
    round(wrist, skinMat, [0, 0, 0], [0.074, 0.085, 0.073]);
    round(wrist, skinMat, [-side * 0.059, 0.017, 0.039], [0.035, 0.052, 0.04]);
    if (isAmbroni) {
      // Mail to the wrist, a plate cop at the elbow, and a flared steel gauntlet cuff over the hand's back.
      // Matte, so they bake into the arm's one batch with the sleeve.
      const mail = material(0x7c807b), steel = material(0x9ea19b);
      part(pivot, new THREE.CylinderGeometry(0.093, 0.076, 0.21, 8), mail, [side * 0.018, -0.143, 0], [1, 1, 1.03]);
      round(elbow, steel, [0, -0.005, -0.012], [0.07, 0.06, 0.07]);
      part(elbow, new THREE.CylinderGeometry(0.066, 0.062, 0.12, 8), steel, [0, -0.09, 0.004], [1, 1, 1.04]);
      part(wrist, new THREE.CylinderGeometry(0.07, 0.085, 0.07, 8), steel, [0, 0.03, 0], [1, 1, 1]);
      round(wrist, steel, [0, -0.02, 0.012], [0.07, 0.06, 0.068]);
    }
  }

  const head = new THREE.Group();
  head.position.set(0, 1.365, 0);
  body.add(head);
  // A shaved head keeps the skull, and a shaved side keeps the temple, in the
  // half-tone between skin and hair rather than going bare or going hairy.
  const crownMat = isMercenary && hairStyle === 'none' ? stubbleMat : hairMat;
  const templeMat = isMercenary && ['none', 'shaved-sides', 'topknot'].includes(hairStyle) ? stubbleMat : hairMat;
  part(head, UNIT_CYLINDER, skinMat, [0, -0.035, 0], [0.069, 0.14, 0.069]);
  round(head, crownMat, [0, 0.202, -0.045], [0.224, 0.227, 0.183]);
  round(head, skinMat, [0, 0.181, 0.015], [isCook || slight || isDyer ? 0.187 : 0.195, 0.228, 0.18]);
  for (const side of [-1, 1]) {
    round(head, skinMat, [side * 0.194, 0.186, 0], [0.047, 0.062, 0.044]);
    round(head, noseMat, [side * 0.212, 0.186, 0.027], [0.018, 0.032, 0.014]);
    if (!isTraveler && !isCook && !isSoldier) box(head, templeMat, [side * 0.169, 0.251, -0.009], [0.06, 0.132, 0.127]);
    round(head, whites, [side * 0.068, 0.226, 0.177], [0.046, 0.031, 0.016]);
    round(head, dark, [side * 0.065, 0.226, 0.191], [0.018, 0.025, 0.011]);
    round(head, whites, [side * 0.065 - 0.006, 0.235, 0.2], [0.006, 0.007, 0.004]);
    const brow = box(head, hairMat, [side * 0.069, 0.273, 0.167], [0.078, isCook || slight || isDyer ? 0.013 : 0.018, 0.02]);
    brow.rotation.z = side * -0.075;
  }
  round(head, noseMat, [0, 0.178, 0.207], [0.04, 0.035, 0.044]);
  // A tiny smile rather than a painted texture.
  box(head, leather, [0, 0.116, 0.171], [0.051, 0.01, 0.012]);
  for (const side of [-1, 1]) {
    const mouthCorner = box(head, leather, [side * 0.029, 0.12, 0.168], [0.016, 0.008, 0.01]);
    mouthCorner.rotation.z = side * 0.45;
  }
  if (isMercenary) {
    // Seven ways to wear a jaw. Everything hangs in the head's own batch.
    const jaw = lookGroup(head, 'beard', facialHair);
    const moustache = () => {
      box(jaw, hairMat, [0, 0.147, 0.181], [0.132, 0.027, 0.033]);
      for (const side of [-1, 1]) {
        const droop = round(jaw, hairMat, [side * 0.073, 0.13, 0.172], [0.028, 0.05, 0.03]);
        droop.rotation.z = side * 0.22;
      }
    };
    const chops = () => { for (const side of [-1, 1]) box(jaw, hairMat, [side * 0.166, 0.158, 0.05], [0.05, 0.155, 0.12]); };
    if (facialHair === 'stubble') {
      round(jaw, stubbleMat, [0, 0.108, 0.128], [0.162, 0.098, 0.106]);
      for (const side of [-1, 1]) box(jaw, stubbleMat, [side * 0.166, 0.163, 0.045], [0.046, 0.135, 0.115]);
    } else if (facialHair === 'moustache') {
      moustache();
    } else if (facialHair === 'trimmed') {
      round(jaw, hairMat, [0, 0.096, 0.133], [0.132, 0.084, 0.1]);
      moustache(); chops();
    } else if (facialHair === 'bushy') {
      round(jaw, hairMat, [0, 0.08, 0.126], [0.172, 0.122, 0.128]);
      round(jaw, hairMat, [0, 0.022, 0.108], [0.14, 0.096, 0.104]);
      moustache(); chops();
    } else if (facialHair === 'braided') {
      round(jaw, hairMat, [0, 0.082, 0.128], [0.134, 0.098, 0.1]);
      for (const [y, z, size] of [[-0.018, 0.134, 0.052], [-0.104, 0.126, 0.044], [-0.186, 0.116, 0.035]]) round(jaw, hairMat, [0, y, z], [size, size * 1.1, size]);
      const band = part(jaw, new THREE.TorusGeometry(0.046, 0.012, 4, 8), leather, [0, -0.056, 0.131]);
      band.rotation.x = Math.PI / 2;
      moustache(); chops();
    } else if (facialHair === 'forked') {
      round(jaw, hairMat, [0, 0.078, 0.126], [0.154, 0.108, 0.112]);
      for (const side of [-1, 1]) {
        const fork = round(jaw, hairMat, [side * 0.058, -0.022, 0.116], [0.056, 0.092, 0.056]);
        fork.rotation.z = side * 0.2;
        round(jaw, hairMat, [side * 0.076, -0.115, 0.108], [0.038, 0.058, 0.038]);
      }
      moustache(); chops();
    } else if (facialHair !== 'clean') {
      round(jaw, hairMat, [0, 0.085, 0.13], [0.125, 0.082, 0.094]);
      round(jaw, hairMat, [0, 0.033, 0.11], [0.104, 0.072, 0.08]);
      moustache(); chops();
    }
  }
  if (isTraveler) {
    // Uneven brown locks read clearly from the follow camera without a cap.
    // Shared low-poly geometry is folded into the existing rigid head batches.
    // The marker group is the traveler's alone: no hired sword may carry it.
    const tousled = new THREE.Group();
    tousled.name = 'Traveler tousled hair';
    head.add(tousled);
    const sunlitHair = material(0x9b7955);
    const locks = [
      // Tousled crown, then a broken fringe that leaves the eyes visible.
      [[-0.091, 0.365, -0.031], [0.15, 0.114, 0.16], [0.09, 0, -0.3], true],
      [[0.087, 0.366, -0.051], [0.157, 0.123, 0.148], [-0.11, 0.2, 0.23], false],
      [[0.012, 0.38, 0.07], [0.143, 0.102, 0.128], [0.1, -0.2, -0.12], true],
      [[-0.127, 0.312, 0.127], [0.071, 0.101, 0.092], [-0.24, 0, -0.32], false],
      [[-0.039, 0.313, 0.167], [0.067, 0.083, 0.056], [-0.18, 0, -0.26], true],
      [[0.063, 0.328, 0.152], [0.085, 0.081, 0.069], [-0.25, 0, 0.36], false],
      [[0.15, 0.299, 0.117], [0.06, 0.097, 0.084], [0, 0, 0.3], true],
      // Side tufts and a shaggy nape give the rear silhouette an irregular edge.
      [[-0.208, 0.23, -0.04], [0.065, 0.125, 0.101], [0.14, -0.2, -0.22], true],
      [[0.209, 0.223, -0.052], [0.069, 0.132, 0.097], [-0.14, 0.2, 0.3], false],
      [[-0.154, 0.113, -0.163], [0.077, 0.108, 0.075], [0.25, -0.15, -0.32], false],
      [[-0.055, 0.104, -0.206], [0.077, 0.121, 0.063], [0.25, 0.15, -0.14], true],
      [[0.057, 0.116, -0.205], [0.084, 0.117, 0.069], [0.26, -0.1, 0.15], false],
      [[0.155, 0.122, -0.158], [0.076, 0.101, 0.079], [0.21, 0.2, 0.33], true],
      [[-0.1, 0.265, -0.201], [0.106, 0.131, 0.065], [0.08, 0, -0.2], true],
      [[0.104, 0.265, -0.193], [0.114, 0.137, 0.073], [-0.1, 0, 0.26], false],
    ];
    for (const [position, scale, rotation, sunlit] of locks) {
      const lock = part(tousled, UNIT_HAIR_LOCK, sunlit ? sunlitHair : hairMat, position, scale);
      lock.rotation.set(...rotation);
    }
  } else if (isMercenary || hairStyle) {
    // Thirteen heads of hair, none of them the traveler’s tousled brown.
    const crop = lookGroup(head, 'hair', hairStyle);
    const fringe = (height, width) => {
      const swept = round(crop, hairMat, [-0.028, height, 0.076], [width, 0.056, 0.126]);
      swept.rotation.z = -0.13;
    };
    const nape = () => round(crop, hairMat, [0, 0.096, -0.188], [0.152, 0.108, 0.094]);
    // **Bald.** Not the same thing as having no `hairStyle`: that falls through to the role's own
    // hair. This draws nothing, on purpose, and is Ben's (src/spider-quest.js).
    if (hairStyle === 'bald') { /* nothing on top, which is the whole of it */ }
    else if (hairStyle === 'cropped') { fringe(0.328, 0.194); nape(); }
    else if (hairStyle === 'receding') {
      // A high forehead: hair left only at the temples and the back of the head.
      for (const side of [-1, 1]) {
        const temple = round(crop, hairMat, [side * 0.158, 0.312, 0.032], [0.088, 0.072, 0.128]);
        temple.rotation.z = side * 0.32;
      }
      nape();
    } else if (hairStyle === 'long-tied') {
      fringe(0.33, 0.184);
      round(crop, hairMat, [0, 0.198, -0.222], [0.116, 0.116, 0.1]);
      const tie = part(crop, new THREE.TorusGeometry(0.052, 0.013, 4, 8), linen, [0, 0.174, -0.27]);
      tie.rotation.y = Math.PI / 2;
      for (const [y, z, size] of [[0.088, -0.298, 0.062], [-0.022, -0.312, 0.054], [-0.126, -0.302, 0.042]]) round(crop, hairMat, [0.008, y, z], [size, size * 1.18, size]);
    } else if (hairStyle === 'shaved-sides') {
      const crest = box(crop, hairMat, [0, 0.372, -0.024], [0.116, 0.086, 0.35]);
      crest.rotation.x = 0.05;
      for (const [z, size] of [[0.12, 0.05], [0.02, 0.058], [-0.09, 0.052], [-0.185, 0.04]]) {
        const spike = part(crop, UNIT_HAIR_LOCK, hairMat, [0, 0.412, z], [size, size * 0.9, size * 1.1]);
        spike.rotation.set(0.2, 0.4, 0);
      }
    } else if (hairStyle === 'topknot') {
      round(crop, hairMat, [0, 0.33, -0.058], [0.072, 0.062, 0.072]);
      const band = part(crop, new THREE.TorusGeometry(0.05, 0.013, 4, 8), leather, [0, 0.362, -0.056]);
      band.rotation.x = Math.PI / 2;
      round(crop, hairMat, [0, 0.42, -0.06], [0.085, 0.09, 0.085]);
      round(crop, hairMat, [0.012, 0.478, -0.075], [0.046, 0.055, 0.046]);
    } else if (hairStyle === 'long') {
      // **Hair down the back, and nothing on the jaw.** The company's `mane` was the only long
      // style there was, and it hangs its side locks at jaw height in front of the ear - on Jojo
      // and on Jess that read as a beard, which is not a mistake to make twice about two women
      // somebody real is behind (the user, 22 September 2026).
      //
      // So: a soft fringe across the brow, the crown covered, and the weight of it *behind* the
      // head, falling past the nape to the shoulder line. The sides are swept back level with
      // the ear and stop there; nothing sits forward of it, and nothing comes below the chin.
      fringe(0.342, 0.208);
      round(crop, hairMat, [0, 0.29, -0.03], [0.196, 0.132, 0.196]);
      for (const side of [-1, 1]) {
        const sweep = round(crop, hairMat, [side * 0.178, 0.216, -0.086], [0.07, 0.132, 0.116]);
        sweep.rotation.z = side * 0.14;
      }
      // The fall: four lengths down the back of the head and neck, narrowing to the ends.
      for (const [y, z, w, h] of [[0.15, -0.206, 0.186, 0.13], [0.01, -0.232, 0.176, 0.13],
        [-0.13, -0.236, 0.156, 0.126], [-0.262, -0.228, 0.122, 0.11]]) {
        round(crop, hairMat, [0, y, z], [w, h, 0.104]);
      }
      // And two lengths forward over the shoulders so the hair reads as long from the front as
      // well as behind. They hang beside the neck and start below the chin, which is what keeps
      // them hair and not whiskers.
      for (const side of [-1, 1]) {
        round(crop, hairMat, [side * 0.152, -0.09, -0.108], [0.066, 0.15, 0.084]);
        round(crop, hairMat, [side * 0.146, -0.2, -0.03], [0.058, 0.126, 0.07]);
      }
    } else if (hairStyle === 'curls') {
      for (const [x, y, z] of [[-0.12, 0.34, 0.07], [0.02, 0.365, 0.086], [0.136, 0.332, 0.056], [-0.176, 0.3, -0.05],
        [0.18, 0.298, -0.058], [-0.07, 0.35, -0.11], [0.07, 0.345, -0.118], [-0.1, 0.13, -0.174], [0.1, 0.128, -0.176]]) {
        const curl = part(crop, UNIT_HAIR_LOCK, hairMat, [x, y, z], [0.084, 0.078, 0.082]);
        curl.rotation.set(x, y, z);
      }
    } else if (hairStyle === 'mane') {
      fringe(0.346, 0.212);
      for (const [x, y, z, sx, sy, sz] of [[-0.196, 0.15, -0.055, 0.086, 0.175, 0.15], [0.196, 0.145, -0.06, 0.088, 0.18, 0.148],
        [0, 0.108, -0.212, 0.2, 0.17, 0.09], [-0.12, 0.028, -0.155, 0.09, 0.1, 0.09], [0.126, 0.02, -0.16, 0.088, 0.095, 0.088]]) round(crop, hairMat, [x, y, z], [sx, sy, sz]);
      for (const [x, y, z] of [[-0.15, 0.335, 0.03], [0.155, 0.33, 0.024], [0, 0.375, -0.09]]) {
        const tuft = part(crop, UNIT_HAIR_LOCK, hairMat, [x, y, z], [0.09, 0.08, 0.086]);
        tuft.rotation.set(0.3, x, z);
      }
    } else if (hairStyle === 'lank') {
      fringe(0.332, 0.202);
      for (const side of [-1, 1]) {
        const fall = box(crop, hairMat, [side * 0.186, 0.13, -0.035], [0.07, 0.34, 0.21]);
        fall.rotation.z = side * 0.05;
      }
      box(crop, hairMat, [0, 0.118, -0.182], [0.3, 0.36, 0.085]);
    } else if (hairStyle === 'braid') {
      fringe(0.33, 0.19); nape();
      for (const [y, z, size] of [[0.148, 0.126, 0.052], [0.044, 0.15, 0.047], [-0.062, 0.162, 0.041], [-0.164, 0.166, 0.033]]) round(crop, hairMat, [-0.152, y, z], [size, size * 1.2, size]);
      const knot = part(crop, new THREE.TorusGeometry(0.031, 0.01, 4, 8), linen, [-0.152, -0.208, 0.166]);
      knot.rotation.y = Math.PI / 2;
    } else if (hairStyle === 'fine') {
      // Thin hair combed flat: the crown sits low and close, the fringe is narrow, and
      // the scalp reads through at the front, which is the whole point of it.
      const flat = round(crop, hairMat, [0, 0.318, -0.03], [0.176, 0.052, 0.188]);
      flat.rotation.x = 0.06;
      const swept = round(crop, hairMat, [-0.02, 0.322, 0.082], [0.148, 0.036, 0.1]);
      swept.rotation.z = -0.18;
      nape();
    } else if (hairStyle === 'ponytail') {
      // Drawn back off the face, gathered at the nape, and falling straight from the tie.
      fringe(0.332, 0.176);
      round(crop, hairMat, [0, 0.242, -0.126], [0.19, 0.152, 0.142]);
      const tie = part(crop, new THREE.TorusGeometry(0.048, 0.014, 4, 8), linen, [0, 0.152, -0.252]);
      tie.rotation.y = Math.PI / 2;
      const tail = box(crop, hairMat, [0, -0.018, -0.268], [0.082, 0.36, 0.072]);
      tail.rotation.x = -0.11;
    } else if (hairStyle === 'long-loose') {
      // Long and unbound: it falls past the shoulders on both sides and down the back,
      // and it is the one head of hair here that moves like cloth rather than like a cap.
      fringe(0.334, 0.198);
      for (const side of [-1, 1]) {
        const fall = box(crop, hairMat, [side * 0.192, 0.052, -0.022], [0.078, 0.46, 0.216]);
        fall.rotation.z = side * 0.04;
      }
      box(crop, hairMat, [0, 0.036, -0.192], [0.316, 0.5, 0.094]);
      round(crop, hairMat, [0, 0.3, -0.108], [0.196, 0.15, 0.156]);
    }
  } else if (isCook) {
    // A tied chestnut bun, swept fringe, and loose temple curls distinguish
    // Lysa from the cap-wearing villagers at ordinary conversation distance.
    const hairLight = material(0x80573b);
    round(head, hairMat, [0, 0.253, -0.158], [0.202, 0.176, 0.13]);
    round(head, hairMat, [0.034, 0.255, -0.269], [0.126, 0.112, 0.099]);
    for (const side of [-1, 1]) {
      const swept = round(head, side < 0 ? hairLight : hairMat, [side * 0.083, 0.34, 0.055], [0.135, 0.079, 0.133]);
      swept.rotation.z = side * 0.29;
      round(head, hairMat, [side * 0.18, 0.238, 0.005], [0.035, 0.096, 0.047]);
      round(head, noseMat, [side * 0.121, 0.166, 0.143], [0.046, 0.023, 0.013]);
    }
    const bunTie = part(head, new THREE.TorusGeometry(0.091, 0.012, 4, 10), linen, [0.034, 0.253, -0.267]);
    bunTie.rotation.y = 0.12;
    ribbon(head, linen, [-0.043, 0.254, -0.267], [-0.051, 0.17, -0.272], 0.024, 0.014);
  } else if (isWineSeller) {
    // Juan: thick dark hair swept straight back off a high forehead, heavy brows,
    // a jaw of stubble and a grin you can see from the street.
    const sweep = round(head, hairMat, [0, 0.365, -0.025], [0.206, 0.105, 0.2]);
    sweep.rotation.x = 0.18;
    const quiff = round(head, hairMat, [0.022, 0.362, 0.1], [0.158, 0.074, 0.1]);
    quiff.rotation.x = -0.35;
    for (const side of [-1, 1]) {
      const wing = round(head, hairMat, [side * 0.152, 0.3, -0.09], [0.07, 0.1, 0.14]);
      wing.rotation.x = 0.4;
      box(head, hairMat, [side * 0.07, 0.279, 0.176], [0.088, 0.026, 0.024]);
    }
    round(head, hairMat, [0, 0.2, -0.17], [0.17, 0.14, 0.06]);
    const stubble = material(new THREE.Color(skin).lerp(new THREE.Color(0x241b16), 0.42));
    round(head, stubble, [0, 0.095, 0.045], [0.186, 0.105, 0.156]);
    box(head, dark, [0, 0.117, 0.203], [0.082, 0.021, 0.012]);
    box(head, whites, [0, 0.122, 0.208], [0.066, 0.009, 0.006]);
    for (const side of [-1, 1]) {
      const corner = box(head, dark, [side * 0.043, 0.126, 0.2], [0.022, 0.009, 0.01]);
      corner.rotation.z = side * -0.5;
    }
  } else if (isDyer) {
    // Brandy: a lot of wavy brown hair, half up in a neon scrunchie, rainbow
    // ribbons tied in; heavy, half-shut eyelids; a little pink lipstick; big
    // gold hoops. An ordinary face that nobody quite manages to look away from.
    const scrunchie = material(0xff3fa4), ribbons = [0xffe135, 0x1ec8d8, 0x8e44ec].map(tint => material(tint));
    round(head, hairMat, [0, 0.32, -0.02], [0.215, 0.12, 0.2]);
    for (const side of [-1, 1]) {
      for (const [y, z, s] of [[0.24, -0.03, 0.075], [0.13, -0.06, 0.085], [0.03, -0.09, 0.08]]) round(head, hairMat, [side * 0.2, y, z], [s, 0.09, s * 1.1]);
      const swoop = round(head, hairMat, [side * 0.07, 0.35, 0.1], [0.12, 0.05, 0.1]);
      swoop.rotation.z = side * 0.35;
      const lid = box(head, material(new THREE.Color(skin).multiplyScalar(0.92)), [side * 0.068, 0.246, 0.188], [0.054, 0.026, 0.014]);
      lid.rotation.z = side * -0.12;
      part(head, new THREE.TorusGeometry(0.032, 0.006, 5, 12), material(0xc9a24a, { metalness: 0.6, roughness: 0.35 }), [side * 0.205, 0.12, 0.01], [1, 1, 1]);
    }
    round(head, hairMat, [0, 0.14, -0.17], [0.2, 0.2, 0.1]);
    round(head, hairMat, [0, 0.0, -0.14], [0.16, 0.12, 0.08]);
    part(head, new THREE.TorusGeometry(0.05, 0.022, 6, 12), scrunchie, [0, 0.35, -0.16], [1, 1, 1]);
    round(head, hairMat, [0, 0.4, -0.2], [0.06, 0.08, 0.06]);
    ribbons.forEach((ribbonMat, i) => { const tie = box(head, ribbonMat, [0.13 - i * 0.02, 0.3 - i * 0.07, -0.13 - i * 0.015], [0.015, 0.1, 0.03]); tie.rotation.z = 0.3; });
    box(head, material(0xe0457b), [0, 0.117, 0.173], [0.05, 0.012, 0.012]);
  } else if (isWineClerk) {
    // Nika: a copper-red pixie crop, the fringe choppy and swept to her left,
    // feathered at the ears and the nape; freckles, a pencil behind one ear and a
    // small silver ring in the other.
    round(head, hairMat, [0, 0.3, 0.005], [0.212, 0.125, 0.195]);
    for (const [x, y, z, w, tilt] of [[-0.085, 0.326, 0.135, 0.075, 0.5], [-0.01, 0.332, 0.15, 0.08, 0.35], [0.07, 0.316, 0.14, 0.07, 0.25], [0.13, 0.29, 0.1, 0.05, 0.1]]) {
      const lock = round(head, hairMat, [x, y, z], [w, 0.045, 0.05]);
      lock.rotation.z = tilt;
    }
    for (const side of [-1, 1]) round(head, hairMat, [side * 0.178, 0.215, 0.045], [0.028, 0.07, 0.032]);
    round(head, hairMat, [0, 0.16, -0.14], [0.14, 0.075, 0.07]);
    const freckle = material(new THREE.Color(skin).lerp(new THREE.Color(0x9a5a35), 0.5));
    for (const [x, y] of [[-0.1, 0.19], [-0.076, 0.176], [-0.122, 0.172], [0.1, 0.19], [0.076, 0.176], [0.122, 0.172], [-0.09, 0.16], [0.09, 0.16]]) {
      const z = 0.015 + 0.18 * Math.sqrt(Math.max(0, 1 - (x / 0.187) ** 2 - ((y - 0.181) / 0.228) ** 2)) + 0.003;
      round(head, freckle, [x, y, z], [0.0075, 0.0075, 0.004]);
    }
    const pencil = part(head, UNIT_CYLINDER, material(0xd9b340), [0.2, 0.27, -0.02], [0.009, 0.075, 0.009]);
    pencil.rotation.x = 1.3;
    round(head, material(0xd8dbe0, { metalness: 0.6, roughness: 0.3 }), [-0.205, 0.15, 0.012], [0.012, 0.012, 0.006]);
  } else if (isKeeper) {
    // Troy: a head of tight ginger curls, a full red beard over a broad grin, and the laugh
    // lines that come with a face that is mostly grinning. Curls are lumps, not strands.
    // Thin on top and going back: a few curls round the sides and the back of the head, and
    // a high forehead where they have given up. Nothing over the brow.
    const curls = [[-.145, .315, -.05, .1], [.145, .315, -.05, .1], [-.185, .25, .01, .08], [.185, .25, .01, .08],
      [0, .33, -.15, .125], [-.1, .3, -.16, .095], [.1, .3, -.16, .095], [0, .225, -.185, .1],
      // Thinner than it was, but it still comes forward over the top of his head.
      [0, .352, -.04, .105], [-.08, .348, .03, .09], [.08, .348, .03, .09],
      [0, .338, .085, .095], [-.075, .33, .072, .08], [.075, .33, .072, .08]];
    for (const [x, y, z, r] of curls) round(head, hairMat, [x, y, z], [r, r * .82, r * .9]);
    // The beard: jaw, chin and cheeks, with a moustache over the lip.
    const beard = [[0, .01, .175, .13, .1, .105], [-.115, .055, .15, .085, .09, .085], [.115, .055, .15, .085, .09, .085],
      [-.16, .115, .095, .07, .095, .085], [.16, .115, .095, .07, .095, .085], [0, -.04, .15, .105, .075, .09], [0, .055, .19, .105, .075, .07]];
    for (const [x, y, z, sx, sy, sz] of beard) round(head, hairMat, [x, y, z], [sx, sy, sz]);
    for (const side of [-1, 1]) {
      const tache = round(head, hairMat, [side * .042, .145, .196], [.055, .028, .035]);
      tache.rotation.z = side * .25;
      // Laugh lines, and the cheeks bunched under them.
      round(head, material(new THREE.Color(skin).multiplyScalar(.92)), [side * .118, .155, .175], [.035, .03, .03]);
    }
    // A wide grin, set out in front of the beard so it is not lost in it: the dark of the mouth,
    // a line of teeth in it, and both corners turned up into the cheeks.
    const mouthDark = material(0x53271f), teeth = material(0xf2ece0);
    box(head, mouthDark, [0, .1, .243], [.1, .036, .02]);
    box(head, teeth, [0, .112, .251], [.092, .016, .014]);
    for (const side of [-1, 1]) {
      const corner = box(head, mouthDark, [side * .058, .122, .236], [.036, .018, .016]);
      corner.rotation.z = side * .75;
    }
  } else if (isKaty) {
    // Katy: long, straight, pale-gold hair, parted in the middle and falling flat past her
    // shoulders to the middle of her back, tucked behind neither ear.
    const hair = new THREE.Group(); hair.name = 'Katy’s long straight hair'; head.add(hair);
    round(hair, hairMat, [0, 0.305, -0.01], [0.215, 0.12, 0.2]);
    for (const side of [-1, 1]) {
      const crown = round(hair, hairMat, [side * 0.07, 0.335, 0.07], [0.11, 0.04, 0.11]);
      crown.rotation.z = side * -0.35;
      // The two curtains either side of the face, straight down to the collarbone.
      box(hair, hairMat, [side * 0.182, 0.06, 0.03], [0.05, 0.42, 0.15]);
    }
    // The fall down her back: a flat sheet, a little wider at the shoulders, cut straight across.
    box(hair, hairMat, [0, 0.03, -0.155], [0.36, 0.5, 0.07]);
    box(hair, hairMat, [0, -0.33, -0.19], [0.34, 0.3, 0.05]);
  } else if (isRivalKeeper) {
    // The same dirty blonde, cut off square at the jaw with something sharp and kept there for
    // eleven years. No wave left in it: it is cut too short to be allowed one.
    const hair = new THREE.Group(); hair.name = 'Subtractidaughter’s hair'; head.add(hair);
    round(hair, hairMat, [0, 0.292, -0.03], [0.216, 0.13, 0.206]);
    const swept = round(hair, hairMat, [0, 0.322, 0.062], [0.176, 0.06, 0.14]);
    swept.rotation.x = 0.2;
    for (const side of [-1, 1]) {
      const fall = box(hair, hairMat, [side * 0.184, 0.115, -0.005], [0.06, 0.29, 0.196]);
      fall.rotation.z = side * 0.02;
    }
    box(hair, hairMat, [0, 0.105, -0.16], [0.33, 0.33, 0.1]);
    box(hair, hairMat, [0, -0.04, -0.14], [0.31, 0.055, 0.14]);
  } else if (isLightKeeper) {
    // Addison’s hair: dirty blonde — fair gone dull with salt — to the shoulder, with a wave in
    // it that survives being tied back and does not survive weather. Off the face, because
    // anything in your eyes on a gallery in a blow is a thing that will get you hurt.
    const hair = new THREE.Group(); hair.name = 'Addison’s hair'; head.add(hair);
    round(hair, hairMat, [0, 0.288, -0.035], [0.214, 0.126, 0.202]);
    // Swept off the brow rather than cut across it: low at the temple, high where it is pushed back.
    const swept = round(hair, hairMat, [-0.042, 0.318, 0.058], [0.16, 0.055, 0.132]);
    swept.rotation.z = -0.2; swept.rotation.x = 0.26;
    for (const side of [-1, 1]) {
      // The wave: three lumps down each side, each one a little further in or out than the last,
      // falling past the jaw to the shoulder. It survives being tied and it never lies flat.
      const crest = round(hair, hairMat, [side * 0.184, 0.168, 0.0], [0.066, 0.12, 0.15]);
      crest.rotation.z = side * 0.12;
      const middle = round(hair, hairMat, [side * 0.166, -0.005, -0.03], [0.058, 0.115, 0.138]);
      middle.rotation.z = side * -0.16;
      const end = round(hair, hairMat, [side * 0.182, -0.17, -0.055], [0.062, 0.115, 0.13]);
      end.rotation.z = side * 0.18;
    }
    // The back of it, down to the shoulder blades, and the tie at the nape.
    box(hair, hairMat, [0, 0.055, -0.175], [0.32, 0.44, 0.1]);
    round(hair, hairMat, [0, -0.2, -0.175], [0.14, 0.16, 0.1]);
    const tail = round(hair, hairMat, [0.04, -0.37, -0.19], [0.09, 0.15, 0.085]);
    tail.rotation.z = 0.22;
    round(hair, material(0x6b4a35), [0, -0.11, -0.195], [0.07, 0.03, 0.062]);
  } else if (isWinemaker) {
    // Kat’s hair: brown, straight, medium-long — past the jaw and onto the shoulders, no further,
    // because anything longer goes in a ferment. Parted off centre, one side pushed behind an ear
    // and the other falling forward where it has escaped again.
    const hair = new THREE.Group(); hair.name = 'Kat’s hair'; head.add(hair);
    round(hair, hairMat, [0, 0.3, -0.02], [0.216, 0.135, 0.208]);
    const parting = round(hair, hairMat, [-0.045, 0.338, 0.072], [0.152, 0.062, 0.13]);
    parting.rotation.z = -0.22;
    for (const side of [-1, 1]) {
      // To the shoulder on the loose side; tucked shorter behind the ear on the other.
      const fall = box(hair, hairMat, [side * 0.185, side < 0 ? 0.04 : 0.085, 0.0], [0.055, side < 0 ? 0.38 : 0.28, 0.185]);
      fall.rotation.z = side * 0.06;
    }
    box(hair, hairMat, [0, 0.06, -0.16], [0.33, 0.44, 0.088]);
    round(hair, hairMat, [0.155, -0.145, -0.05], [0.07, 0.11, 0.08]);
  } else if (isVineKeeper) {
    // Imani’s bob: black, straight and blunt — a fringe cut level across the brow, the sides
    // falling to the jaw, the back squared off at the nape. Cut that way because it has to go
    // under a hood in the rain and stay out of her eyes over close work.
    const hair = new THREE.Group(); hair.name = 'Imani’s bob'; head.add(hair);
    round(hair, hairMat, [0, 0.295, -0.025], [0.214, 0.132, 0.206]);
    const fringe = box(hair, hairMat, [0, 0.292, 0.108], [0.286, 0.105, 0.125]);
    fringe.rotation.x = -0.07;
    for (const side of [-1, 1]) {
      // The sides, cut to the jaw, with the ends turned very slightly in.
      const fall = box(hair, hairMat, [side * 0.181, 0.125, 0.005], [0.058, 0.3, 0.192]);
      fall.rotation.z = side * 0.035;
      round(hair, hairMat, [side * 0.152, 0.268, 0.062], [0.065, 0.07, 0.075]);
    }
    box(hair, hairMat, [0, 0.135, -0.155], [0.33, 0.315, 0.095]);
    box(hair, hairMat, [0, -0.015, -0.13], [0.3, 0.06, 0.13]);
  } else if (!isElodiGuard && !isAmbroni) {
    // (Ambron's bascinet covers the brow; a forelock would poke out through it.)
    const fringe = round(head, hairMat, [-0.055, 0.334, 0.08], [0.143, 0.061, 0.123]);
    fringe.rotation.z = -0.18;
  }

  if ((hat || look?.hat === true) && !isDoomsayer && !isWoodcutter && !isMiller && !isShelterKeeper && !isBirdWatcher && !isGardenKeeper) {
    // A soft, rounded country cap, with a short leather peak and folded crown.
    const cap = new THREE.Group();
    cap.position.set(-0.018, 0.371, -0.028);
    cap.rotation.z = -0.11;
    (isMercenary ? lookGroup(head, 'headgear', headgear) : head).add(cap);
    round(cap, cloth, [0, 0.019, 0], [0.234, 0.116, 0.207]);
    round(cap, clothLight, [-0.073, 0.068, -0.027], [0.17, 0.094, 0.157]);
    part(cap, UNIT_CYLINDER, clothLight, [0, -0.031, 0], [0.226, 0.044, 0.189]);
    round(cap, leather, [0, -0.034, 0.15], [0.166, 0.016, 0.109]);
    if (role === 'warden') {
      const badge = box(cap, gold, [0.144, 0.004, 0.139], [0.04, 0.049, 0.014]);
      badge.rotation.z = -0.25;
    }
    if (isPondFisher) {
      part(cap, UNIT_CYLINDER, clothLight, [0, -.028, .004], [.29, .022, .245]);
      ribbon(cap, linen, [-.16, .023, .16], [.11, .02, .183], .021, .013);
    }
  }

  if (isMercenary && headgear !== 'soft-cap') {
    // Six other ways to cover a head, and two ways to leave one uncovered.
    const worn = lookGroup(head, 'headgear', headgear);
    if (headgear === 'bandana') {
      // Bleached sailcloth, knotted at the back: a Selemi habit kept inland.
      const sail = material(0xd8ccae), sailFold = material(0xb5a98c);
      part(worn, UNIT_CYLINDER, sail, [0, 0.312, -0.012], [0.228, 0.078, 0.197]);
      round(worn, sailFold, [0, 0.36, -0.032], [0.212, 0.072, 0.188]);
      round(worn, sail, [-0.176, 0.298, -0.132], [0.052, 0.046, 0.046]);
      ribbon(worn, sail, [-0.19, 0.293, -0.147], [-0.252, 0.163, -0.182], 0.036, 0.02);
      ribbon(worn, sailFold, [-0.183, 0.288, -0.142], [-0.138, 0.148, -0.232], 0.03, 0.018);
    } else if (headgear === 'wide-brim') {
      // A port man's drooping felt brim: rain in Izoli, sun on the Moros.
      part(worn, new THREE.CylinderGeometry(0.2, 0.404, 0.07, 10), mercFelt, [0, 0.352, -0.014]);
      round(worn, mercFelt, [0, 0.392, -0.02], [0.216, 0.128, 0.202]);
      part(worn, UNIT_CYLINDER, leather, [0, 0.368, -0.018], [0.224, 0.034, 0.209]);
      round(worn, mercFelt, [0, 0.462, -0.03], [0.1, 0.05, 0.095]);
    } else if (headgear === 'iron-skullcap') {
      // Old campaign iron: a riveted cap with a nasal bar and a leather liner.
      round(worn, mercIron, [0, 0.292, -0.018], [0.229, 0.188, 0.216]);
      part(worn, UNIT_CYLINDER, mercIronDark, [0, 0.253, -0.008], [0.238, 0.032, 0.224]);
      box(worn, mercIronDark, [0, 0.262, 0.192], [0.034, 0.152, 0.03]);
      for (let i = 0; i < 5; i++) {
        const angle = (i - 2) * 0.6;
        round(worn, mercIronDark, [Math.sin(angle) * 0.216, 0.268, Math.cos(angle) * 0.202 - 0.018], [0.018, 0.018, 0.012]);
      }
    } else if (headgear === 'fur-cap') {
      // Pyrosi hill fur, worn low, with the flaps tied up off the ears.
      part(worn, UNIT_CYLINDER, mercFur, [0, 0.338, -0.02], [0.247, 0.1, 0.224]);
      round(worn, mercFurDark, [0, 0.398, -0.03], [0.208, 0.098, 0.188]);
      for (let i = 0; i < 8; i++) {
        const angle = i / 8 * Math.PI * 2;
        const tuft = part(worn, UNIT_HAIR_LOCK, i % 2 ? mercFur : mercFurDark, [Math.sin(angle) * 0.238, 0.336 + (i % 3) * 0.014, Math.cos(angle) * 0.214 - 0.02], [0.062, 0.058, 0.056]);
        tuft.rotation.set(angle, angle * 0.5, Math.sin(angle) * 0.3);
      }
      for (const side of [-1, 1]) round(worn, mercFur, [side * 0.226, 0.268, -0.024], [0.05, 0.08, 0.072]);
    } else if (headgear === 'hood') {
      // A cowl pushed back off the brow, so the face still carries the talking.
      const hoodMat = material(new THREE.Color(tunic).multiplyScalar(0.66));
      const hoodFold = material(new THREE.Color(tunic).multiplyScalar(0.84));
      round(worn, hoodMat, [0, 0.244, -0.082], [0.278, 0.302, 0.262]);
      round(worn, hoodFold, [0, 0.4, -0.16], [0.16, 0.096, 0.13]);
      for (const side of [-1, 1]) {
        const cheekFold = round(worn, hoodFold, [side * 0.218, 0.212, 0.042], [0.05, 0.238, 0.094]);
        cheekFold.rotation.z = side * 0.1;
      }
      round(body, hoodMat, [0, 1.296, -0.06], [0.3, 0.104, 0.226]);
      for (const side of [-1, 1]) {
        const shoulderFold = round(body, hoodFold, [side * 0.196, 1.278, -0.02], [0.14, 0.07, 0.14]);
        shoulderFold.rotation.z = side * -0.14;
      }
    }
  }

  if (isMercenary) for (const mark of marks) {
    // Small marks, one draw each, put where a face carries them at a distance.
    const marked = lookGroup(head, 'mark', mark);
    if (mark === 'scar') {
      // Brow to jaw, hinged at the cheekbone so both halves stay proud of a
      // face that curves away from them; a straight chord would sink inside it.
      ribbon(marked, mercScar, [0.132, 0.317, 0.125], [0.128, 0.216, 0.158], 0.032, 0.018);
      ribbon(marked, mercScar, [0.128, 0.216, 0.158], [0.108, 0.109, 0.175], 0.03, 0.017);
    } else if (mark === 'earring') {
      const ring = part(marked, new THREE.TorusGeometry(0.031, 0.01, 4, 8), gold, [-0.219, 0.108, 0.006]);
      ring.rotation.y = Math.PI / 2;
    } else if (mark === 'tattoo') {
      for (let i = 0; i < 3; i++) ribbon(marked, mercInk, [-0.15, 0.262 - i * 0.042, 0.11], [-0.196, 0.232 - i * 0.042, 0.048], 0.02, 0.011);
    } else if (mark === 'eye-patch') {
      round(marked, mercStrap, [-0.068, 0.228, 0.183], [0.066, 0.056, 0.032]);
      ribbon(marked, mercStrap, [-0.102, 0.252, 0.158], [-0.166, 0.302, -0.05], 0.024, 0.013);
      ribbon(marked, mercStrap, [-0.092, 0.204, 0.162], [-0.176, 0.236, -0.05], 0.021, 0.012);
    } else if (mark === 'spectacles') {
      // The same round wire pair Troy and Imani wear, which is the only kind anybody
      // in Azhora makes; on a hired sword they are the thing you notice first.
      spectacles(marked, 'Spectacles', mercWire, mercGlass);
    }
  }

  if (!isCook && !isDoomsayer && !isBridgeKeeper && !isCustodian && !isWoodcutter && !isLocalWorker && !isSoldier && (!isMercenary || isPlayer)) {
    // Shoulder strap continues on the back. The pouch hangs clear of the arm.
    ribbon(body, leather, [-0.158, 1.32, 0.121], [0.218, 0.846, 0.17], 0.054);
    ribbon(body, leather, [-0.158, 1.32, -0.121], [0.218, 0.846, -0.138], 0.054);
    box(body, bagMat, [0.253, 0.809, -0.009], [0.165, 0.237, 0.244]);
    round(body, leather, [0.253, 0.918, 0], [0.098, 0.052, 0.139]);
    box(body, leather, [0.253, 0.851, 0.119], [0.052, 0.124, 0.021]);
    box(body, gold, [0.253, 0.818, 0.134], [0.035, 0.029, 0.012]);
  }

  let clothPivot = null;
  if (isTraveler) {
    const cloakMat = material(0x68503b, { side: THREE.DoubleSide });
    const cloakFold = material(0x786047, { side: THREE.DoubleSide });
    const cloakPatch = material(0x8e795b, { side: THREE.DoubleSide });
    const cloakStitch = material(0xd5c6a7, { side: THREE.DoubleSide });
    // Broad folded shoulders and an open front keep the linen, satchel, and
    // working hands visible. The asymmetric patched hem ends above the knees.
    part(body, new THREE.CylinderGeometry(0.155, 0.32, 0.25, 10, 1, true, Math.PI * 0.37, Math.PI * 1.26), cloakMat, [0, 1.205, -0.033], [1, 1, 0.8]);
    for (const side of [-1, 1]) {
      const fold = round(body, cloakFold, [side * 0.18, 1.268, -0.015], [0.15, 0.065, 0.154]);
      fold.rotation.z = side * -0.12;
    }
    ribbon(body, leather, [-0.112, 1.296, 0.117], [0.106, 1.278, 0.121], 0.02, 0.018);
    round(body, leather, [0.052, 1.283, 0.138], [0.025, 0.02, 0.012]);
    clothPivot = new THREE.Group();
    clothPivot.name = 'Traveler cloak hem';
    clothPivot.position.set(0, 1.09, -0.032);
    body.add(clothPivot);
    const drape = new THREE.CylinderGeometry(0.321, 0.36, 0.57, 10, 2, true, Math.PI * 0.4, Math.PI * 1.2);
    const drapePositions = drape.attributes.position;
    for (let i = 0; i < drapePositions.count; i++) {
      const amount = (0.285 - drapePositions.getY(i)) / 0.57;
      // Small broad folds and an uneven hem suggest worn wool, not armor.
      const angle = Math.atan2(drapePositions.getX(i), drapePositions.getZ(i));
      const fold = 1 + Math.cos(angle * 5) * 0.045 * amount;
      drapePositions.setXYZ(i, drapePositions.getX(i) * fold, drapePositions.getY(i) - Math.max(0, amount - 0.6) * 0.032 * Math.sin(angle * 3 + 0.5), drapePositions.getZ(i) * fold);
    }
    drape.computeVertexNormals();
    part(clothPivot, drape, cloakMat, [0, -0.285, 0], [1, 1, 0.8]);
    const hemPatch = box(clothPivot, cloakPatch, [-0.131, -0.445, -0.263], [0.119, 0.105, 0.009]);
    hemPatch.rotation.set(0, -0.33, -0.1);
    for (const x of [-0.166, -0.111]) {
      box(clothPivot, cloakStitch, [x, -0.401, -0.273], [0.008, 0.019, 0.007]);
    }
    // A small folded-down hood sits behind the neck, leaving the shaggy hair
    // and face clear. It is baked with the shoulders, adding no separate draw.
    round(body, cloakFold, [0, 1.277, -0.171], [0.145, 0.096, 0.078]);
  }

  let staff = null;
  /** A bow actually in the hand, the traveler's or a hired archer's, with the shaft on its string. */
  let heldBow = null;
  if (isMiller) {
    const apron = material(0xa69a80), flour = material(0xe3dcc3), wrap = material(0xc8bb99);
    // Enna's apron is work-stained cloth, with a rolled headwrap rather than a
    // military cap. Fixed detail joins the existing chest and head batches.
    part(body, new THREE.CylinderGeometry(.219, .279, .43, 8, 1, true, -Math.PI * .26, Math.PI * .52), apron, [0, .716, .022], [1, 1, .81]);
    box(body, apron, [0, 1.062, .178], [.235, .265, .019]);
    for (const side of [-1, 1]) {
      ribbon(body, wrap, [side * .092, 1.183, .169], [side * .14, 1.292, .071], .031, .013);
      ribbon(body, wrap, [side * .018, .937, -.17], [side * .077, .828, -.18], .027, .013);
    }
    box(body, wrap, [0, .935, .184], [.38, .029, .022]);
    box(body, apron, [-.09, .727, .22], [.14, .118, .022]);
    for (const [x, y, z, sx, sy] of [[-.071, 1.094, .193, .034, .048], [.068, 1.039, .196, .05, .024],
      [-.109, .739, .235, .046, .019], [.096, .623, .241, .038, .037]])
      part(body, UNIT_HAIR_LOCK, flour, [x, y, z], [sx, sy, .006]);
    round(head, wrap, [0, .366, -.039], [.234, .09, .202]);
    part(head, UNIT_CYLINDER, wrap, [0, .333, -.015], [.23, .055, .194]);
    // Several soft folds make the headcloth read as a roll, not a rigid brim.
    for (const [x, y, tilt] of [[-.128, .358, -.23], [0, .373, .08], [.123, .355, .28]]) {
      const fold = round(head, linen, [x, y, .112], [.1, .035, .058]); fold.rotation.z = tilt;
    }
    round(head, wrap, [.113, .285, -.19], [.064, .045, .035]);
    ribbon(head, wrap, [.122, .284, -.204], [.167, .161, -.22], .043, .021);
    round(head, hairMat, [-.013, .199, -.217], [.128, .119, .088]);
    round(head, hairMat, [-.035, .109, -.243], [.069, .091, .058]);
    part(head, UNIT_CYLINDER, linen, [-.035, .111, -.245], [.071, .017, .059]);
    for (const side of [-1, 1]) round(head, hairMat, [side * .187, .254, .061], [.025, .071, .032]);
  } else if (isReedWorker) {
    const cord = material(0xada58a), wetHem = material(0x4d6963), spoolWood = material(0x9a8056);
    // Merren's net spool is secured to a plain belt, leaving both working hands
    // free. The cap is the existing soft country shape in the new teal cloth.
    box(body, leather, [0, .934, .17], [.38, .044, .038]);
    box(body, wetHem, [-.103, .732, .174], [.13, .078, .015]);
    box(body, linen, [.106, 1.048, .18], [.114, .104, .017]);
    for (const x of [-.331, -.205]) {
      const flange = part(body, UNIT_CYLINDER, spoolWood, [x, .858, .038], [.092, .017, .092]); flange.rotation.z = Math.PI / 2;
    }
    const winding = part(body, UNIT_CYLINDER, cord, [-.268, .858, .038], [.072, .112, .072]); winding.rotation.z = Math.PI / 2;
    for (const x of [-.306, -.281, -.254, -.23]) {
      const thread = part(body, UNIT_CYLINDER, linen, [x, .858, .038], [.075, .007, .075]); thread.rotation.z = Math.PI / 2;
    }
    ribbon(body, leather, [-.246, .946, .04], [-.29, .862, .115], .035, .016);
    ribbon(body, cord, [-.286, .817, .089], [-.28, .708, .10], .015, .013);
    ribbon(body, spoolWood, [.23, .798, .035], [.245, .985, .052], .022, .017);
    round(head, hairMat, [0, .198, -.218], [.125, .132, .087]);
    round(head, hairMat, [.026, .079, -.24], [.069, .106, .054]);
    part(head, UNIT_CYLINDER, cord, [.024, .099, -.241], [.072, .023, .056]);
    for (const side of [-1, 1]) ribbon(head, hairMat, [side * .177, .288, -.028], [side * .181, .186, -.071], .027, .031);
  } else if (isShelterKeeper) {
    const wool = material(0x746354, { side: THREE.DoubleSide }), woolLight = material(0x948170, { side: THREE.DoubleSide });
    const greyHair = material(0xb6b0a0);
    // Oda wears a crossed, weathered shawl and a longer plain skirt-coat. Its
    // light drape has its own slow joint; there is no armor or walking weapon.
    part(body, new THREE.CylinderGeometry(.15, .31, .21, 10, 1, true, Math.PI * .34, Math.PI * 1.32), wool, [0, 1.225, -.025], [1, 1, .83]);
    for (const side of [-1, 1]) {
      const fold = round(body, woolLight, [side * .167, 1.269, -.009], [.146, .066, .136]); fold.rotation.z = side * -.10;
    }
    const crossed = new THREE.BufferGeometry();
    crossed.setAttribute('position', new THREE.Float32BufferAttribute([
      -.218, 1.265, .135, -.205, .984, .171, .12, 1.092, .197,
      .215, 1.26, .136, -.07, 1.117, .199, .183, 1.012, .179,
    ], 3)); crossed.computeVertexNormals(); part(body, crossed, wool, [0, 0, 0]);
    ribbon(body, woolLight, [-.214, 1.253, .146], [.103, 1.096, .201], .019, .01);
    ribbon(body, woolLight, [.204, 1.248, .145], [-.06, 1.119, .203], .018, .01);
    round(body, leather, [.074, 1.116, .211], [.026, .023, .013]);
    clothPivot = new THREE.Group(); clothPivot.name = 'Shelter keeper shawl drape';
    clothPivot.position.set(0, 1.172, -.025); body.add(clothPivot);
    part(clothPivot, new THREE.CylinderGeometry(.30, .343, .43, 10, 2, true, Math.PI * .35, Math.PI * 1.3), wool, [0, -.215, 0], [1, 1, .82]);
    const mend = box(clothPivot, woolLight, [.116, -.313, -.257], [.105, .094, .014]); mend.rotation.y = .22;
    for (const x of [.083, .143]) box(clothPivot, linen, [x, -.276, -.27], [.007, .019, .008]);
    // A low bun and visible silver temple strands establish an older neighbor.
    round(head, hairMat, [0, .273, -.137], [.207, .153, .13]);
    round(head, hairMat, [.014, .199, -.243], [.108, .096, .084]);
    for (const [x, y, z, sx, sy, tilt] of [[-.114, .341, .069, .035, .054, -.5], [.112, .339, .079, .038, .052, .4],
      [-.183, .258, .003, .026, .093, -.1], [.183, .249, -.003, .027, .091, .12], [.036, .201, -.305, .022, .068, .2]]) {
      const strand = part(head, UNIT_HAIR_LOCK, greyHair, [x, y, z], [sx, sy, .024]); strand.rotation.z = tilt;
    }
    for (const side of [-1, 1]) ribbon(head, noseMat, [side * .103, .20, .163], [side * .126, .19, .15], .007, .006);
  } else if (isWoodcutter) {
    const apron = material(0x665747), apronPatch = material(0x8a7b61), kerchief = material(0x9a5547);
    // A short cloth apron with a patched corner: practical work clothes, no
    // shoulder bag or military equipment. The tools remain secured at her belt.
    part(body, new THREE.CylinderGeometry(.208, .27, .40, 8, 1, true, -Math.PI * .25, Math.PI * .5), apron, [0, .757, .021], [1, 1, .83]);
    box(body, apron, [0, 1.066, .177], [.21, .26, .023]);
    for (const side of [-1, 1]) {
      ribbon(body, linen, [side * .09, 1.19, .168], [side * .133, 1.296, .075], .029, .016);
      ribbon(body, linen, [side * .02, .935, -.17], [side * .08, .811, -.177], .024, .014);
    }
    box(body, linen, [0, .937, .184], [.33, .028, .02]);
    const patch = box(body, apronPatch, [-.108, .67, .218], [.103, .11, .016]); patch.rotation.z = -.10;
    for (const x of [-.142, -.081]) box(body, linen, [x, .714, .23], [.008, .021, .006]);
    box(body, leather, [.225, .875, .027], [.077, .156, .091]);
    ribbon(body, bagMat, [.222, .84, .035], [.237, 1.052, .041], .034, .029);
    box(body, apronPatch, [.237, 1.049, .041], [.085, .034, .052]);
    const cord = part(body, new THREE.TorusGeometry(.067, .009, 4, 10), linen, [-.242, .852, .043]); cord.rotation.y = -.34;
    // The faded red headcloth and low tied hair read from the rear as well as
    // across a conversation, without making another cap-wearing courier.
    round(head, kerchief, [0, .361, -.027], [.231, .096, .193]);
    part(head, UNIT_CYLINDER, kerchief, [0, .318, -.008], [.223, .045, .188]);
    round(head, kerchief, [.041, .282, -.204], [.047, .04, .037]);
    ribbon(head, kerchief, [.035, .283, -.21], [.088, .139, -.223], .039, .021);
    ribbon(head, kerchief, [.035, .277, -.21], [-.011, .164, -.243], .035, .018);
    for (const [x, y, z, size] of [[-.016, .234, -.24, .074], [-.024, .164, -.265, .065], [-.033, .105, -.258, .046]])
      round(head, hairMat, [x, y, z], [size, size * .94, size * .76]);
    for (const side of [-1, 1]) round(head, hairMat, [side * .19, .257, .054], [.027, .071, .035]);
  } else if (isCourier) {
    const scarf = material(0xa64d3a), scarfFold = material(0x7d3c30);
    part(body, UNIT_CYLINDER, scarf, [0, 1.32, .015], [.145, .10, .117]);
    const tail = box(body, scarf, [-.105, 1.172, .181], [.125, .29, .031]); tail.rotation.z = -.15;
    box(body, scarfFold, [-.11, 1.125, .20], [.095, .022, .013]);
    // A second slim pouch and cloth bedroll make the courier legible from behind.
    box(body, leather, [-.252, .81, .007], [.126, .18, .196]);
    box(body, bagMat, [-.254, .876, .007], [.139, .046, .21]);
    const roll = part(body, UNIT_CYLINDER, linen, [0, 1.06, -.23], [.098, .43, .10]); roll.rotation.z = Math.PI / 2;
    for (const x of [-.14, .14]) ribbon(body, leather, [x, 1.18, -.24], [x, .965, -.26], .033, .025);
    for (const side of [-1, 1]) {
      ribbon(body, clothLight, [side * .03, .929, .168], [side * .05, .56, .197], .018, .013);
      box(body, clothLight, [side * .128, .70, .174], [.086, .105, .023]);
    }
  } else if (isBridgeKeeper) {
    const workApron = material(0x6c6650), bandanna = material(0x975a40), iron = material(0x737570);
    // Short apron and hanging hammer keep the lower silhouette practical.
    box(body, workApron, [0, .799, .189], [.30, .29, .028]);
    box(body, leather, [0, .913, .211], [.34, .066, .037]);
    for (const x of [-.108, .102]) box(body, bagMat, [x, .80, .225], [.095, .114, .036]);
    ribbon(body, leather, [.23, .91, .018], [.25, .56, .025], .04, .033);
    const hammer = box(body, iron, [.244, .806, .025], [.19, .084, .094]); hammer.rotation.z = -.13;
    ribbon(body, linen, [-.228, .91, .055], [-.26, .72, .084], .063, .018);
    part(head, UNIT_CYLINDER, bandanna, [0, .331, -.016], [.219, .06, .188]);
    round(head, bandanna, [-.207, .318, -.073], [.047, .04, .04]);
    ribbon(head, bandanna, [-.222, .31, -.076], [-.261, .191, -.082], .035, .021);
    // The keeper's moustache belongs to the keeper, not to the build: Jess has the boat and the
    // bandanna and no facial hair at all (the user, 22 September 2026).
    if (look?.beard !== false) round(head, hairMat, [0, .067, .112], [.12, .049, .093]);
  } else if (isCustodian) {
    const cloak = material(0x626b81, { side: THREE.DoubleSide });
    const faded = material(0x8a8d96, { side: THREE.DoubleSide });
    part(body, new THREE.CylinderGeometry(.16, .337, .27, 10, 1, true, Math.PI * .37, Math.PI * 1.26), cloak, [0, 1.208, -.03], [1, 1, .84]);
    clothPivot = new THREE.Group(); clothPivot.name = 'Custodian weathered cloak'; clothPivot.position.set(0, 1.095, -.032); body.add(clothPivot);
    part(clothPivot, new THREE.CylinderGeometry(.328, .371, .65, 10, 2, true, Math.PI * .39, Math.PI * 1.22), cloak, [0, -.325, 0], [1, 1, .83]);
    const patch = box(clothPivot, faded, [-.13, -.49, -.29], [.11, .12, .016]); patch.rotation.y = -.24;
    for (const x of [-.165, -.112]) box(clothPivot, linen, [x, -.446, -.299], [.008, .022, .009]);
    ribbon(body, linen, [-.126, 1.254, .138], [.135, 1.247, .131], .024, .018);
    if (look?.beard !== false) round(head, hairMat, [0, .06, .112], [.141, .071, .117]);   // the custodian's beard
    const book = new THREE.Group(); book.name = 'Custodian fieldbook'; book.position.set(0, -.02, .065); book.rotation.set(-.15, .05, .10); wrists[0].add(book);
    box(book, leather, [0, -.012, 0], [.21, .057, .27]);
    box(book, linen, [0, -.011, .008], [.184, .037, .246]);
    box(book, leather, [0, .023, 0], [.216, .016, .278]);
    ribbon(book, faded, [-.084, .034, .04], [.081, .034, .04], .018, .012);
    staff = new THREE.Group(); staff.name = 'Custodian short walking staff'; wrists[1].add(staff);
    const staffWood = material(0x65513b), staffTip = material(0x978163);
    ribbon(staff, staffWood, [.012, -.83, 0], [-.018, .51, 0], .064, .059);
    ribbon(staff, staffWood, [-.018, .51, 0], [.022, .64, .018], .068, .06);
    round(staff, staffTip, [.022, .65, .018], [.049, .042, .044]);
    ribbon(staff, linen, [-.031, .068, .027], [.034, .062, .029], .033, .018);
  } else if (isClerk) {
    const ink = material(0x3e4b50), paper = material(0xded1ac), charcoal = material(0x504636);
    // A worn desk coat with broad pockets, stained where the pen is tucked.
    for (const side of [-1, 1]) {
      box(body, clothLight, [side * .115, .742, .184], [.137, .17, .024]);
      ribbon(body, linen, [side * .082, 1.292, .137], [side * .11, 1.105, .178], .055, .018);
    }
    for (const [x, y, size] of [[-.13, .772, .025], [-.083, .701, .018], [.096, 1.13, .021]])
      part(body, UNIT_HAIR_LOCK, ink, [x, y, y > 1 ? .18 : .20], [size, size * 1.6, .008]);
    const papers = new THREE.Group(); papers.name = 'Relay clerk rolled papers'; papers.position.set(0, -.022, .035); papers.rotation.z = .12; wrists[0].add(papers);
    for (const [x, y, z, length] of [[-.045, -.005, .01, .35], [.029, .008, .028, .30], [.01, -.018, -.035, .39]]) {
      const roll = part(papers, UNIT_CYLINDER, paper, [x, y, z], [.043, length, .043]); roll.rotation.x = Math.PI / 2;
      const hollow = part(papers, UNIT_CYLINDER, bagMat, [x, y, z + length / 2 + .001], [.019, .003, .019]); hollow.rotation.x = Math.PI / 2;
    }
    box(papers, leather, [0, .052, .015], [.17, .018, .033]);
    ribbon(wrists[1], charcoal, [0, -.052, -.045], [.018, .173, .056], .013, .013);
    const capPatch = box(head, linen, [-.098, .426, .126], [.09, .06, .019]); capPatch.rotation.z = -.18;
  } else if (isMercenary) {
    // Eleven garments, one each: what a man wore when he took the Empire's coin.
    const worn = lookGroup(body, 'garment', garment);
    if (garment === 'gambeson') {
      // A fen veteran's quilted coat, stitched in rows, a blanket at the back.
      const quilt = material(new THREE.Color(tunic).lerp(new THREE.Color(0xcdbb92), 0.34));
      const quiltDark = material(new THREE.Color(tunic).multiplyScalar(0.7));
      part(worn, new THREE.CylinderGeometry(0.272, 0.243, 0.47, 8), quilt, [0, 1.07, 0], [1, 1, 0.72]);
      for (let i = 0; i < 5; i++) part(worn, UNIT_CYLINDER, quiltDark, [0, 1.268 - i * 0.094, 0], [0.276 - i * 0.003, 0.014, 0.201]);
      part(worn, UNIT_CYLINDER, quilt, [0, 1.312, 0], [0.163, 0.076, 0.134]);
      box(worn, quiltDark, [0, 1.09, 0.196], [0.03, 0.42, 0.016]);
      const roll = part(worn, UNIT_CYLINDER, linen, [0, 1.005, -0.2], [0.086, 0.36, 0.088]);
      roll.rotation.z = Math.PI / 2;
      for (const x of [-0.13, 0.13]) ribbon(worn, mercStrap, [x, 1.1, -0.208], [x, 0.9, -0.226], 0.032, 0.022);
    } else if (garment === 'archer') {
      // A bracer on the bow arm, a chest strap for the quiver, arrows at the hip.
      part(elbows[0], UNIT_CYLINDER, mercStrap, [0, -0.118, 0.006], [0.088, 0.08, 0.092]);
      for (const y of [-0.084, -0.152]) part(elbows[0], UNIT_CYLINDER, leather, [0, y, 0.006], [0.091, 0.013, 0.095]);
      ribbon(worn, mercStrap, [-0.198, 1.33, -0.07], [0.204, 0.9, 0.128], 0.058, 0.022);
      ribbon(worn, mercStrap, [-0.198, 1.33, -0.07], [0.188, 0.93, -0.126], 0.05, 0.02);
      box(worn, leather, [0.216, 0.888, 0.062], [0.086, 0.096, 0.15]);
      for (const z of [0.02, 0.06, 0.1]) ribbon(worn, linen, [0.218, 0.93, z], [0.226, 1.024, z - 0.02], 0.014, 0.014);
    } else if (garment === 'fur-mantle') {
      // An islander bought a fur in the first cold market he walked past.
      part(worn, new THREE.CylinderGeometry(0.202, 0.332, 0.26, 10), mercFur, [0, 1.198, -0.03], [1, 1, 0.85]);
      for (let i = 0; i < 9; i++) {
        const angle = i / 9 * Math.PI * 2;
        const tuft = part(worn, UNIT_HAIR_LOCK, i % 2 ? mercFur : mercFurDark, [Math.sin(angle) * 0.3, 1.078 + (i % 3) * 0.022, Math.cos(angle) * 0.256], [0.094, 0.104, 0.062]);
        tuft.rotation.z = Math.sin(angle) * 0.26;
      }
      ribbon(worn, mercStrap, [-0.142, 1.3, 0.116], [0.15, 1.294, 0.112], 0.024, 0.016);
      round(worn, gold, [0.154, 1.296, 0.126], [0.031, 0.031, 0.015]);
    } else if (garment === 'sash') {
      // A knife-fighter's wide sash, worn shoulder to hip, with three sheaths.
      const sashMat = material(0x8f4a3e), sashFold = material(0x6d382e);
      ribbon(worn, sashMat, [-0.208, 1.308, 0.108], [0.196, 0.9, 0.144], 0.115, 0.05);
      ribbon(worn, sashFold, [-0.208, 1.308, -0.1], [0.196, 0.9, -0.126], 0.11, 0.046);
      round(worn, sashFold, [0.198, 0.898, 0.13], [0.062, 0.058, 0.05]);
      for (const [x, z] of [[0.21, 0.1], [0.23, 0.02]]) {
        const tail = box(worn, sashMat, [x, 0.79, z], [0.07, 0.19, 0.03]);
        tail.rotation.z = 0.12;
      }
      for (let i = 0; i < 3; i++) {
        const x = -0.14 + i * 0.11;
        const sheath = box(worn, leather, [x, 0.852, 0.186], [0.042, 0.142 + i * 0.022, 0.034]);
        sheath.rotation.z = 0.14 - i * 0.12;
        box(worn, bootMat, [x, 0.935, 0.192], [0.03, 0.044, 0.028]);
      }
    } else if (garment === 'bare-forearms') {
      // Sleeves rolled above the elbow, a second belt and a port man's pouch.
      for (const elbow of elbows) part(elbow, UNIT_CYLINDER, clothLight, [0, 0.018, 0.003], [0.094, 0.052, 0.098]);
      part(worn, UNIT_CYLINDER, leather, [0, 0.862, 0], [0.242, 0.048, 0.174]);
      box(worn, bagMat, [-0.218, 0.83, 0.078], [0.118, 0.152, 0.094]);
      box(worn, leather, [-0.218, 0.9, 0.078], [0.126, 0.03, 0.1]);
      ribbon(worn, mercStrap, [-0.2, 0.94, 0.056], [-0.222, 0.83, 0.078], 0.03, 0.02);
      for (const x of [-0.06, 0.07]) box(worn, bootMat, [x, 0.866, 0.176], [0.024, 0.06, 0.016]);
    } else if (garment === 'short-cloak') {
      // A hill-country half cloak, pinned at the right shoulder, thrown back.
      const cloakMat = material(new THREE.Color(tunic).multiplyScalar(0.6));
      const cloakFold = material(new THREE.Color(tunic).multiplyScalar(0.78));
      const mantle = part(worn, new THREE.CylinderGeometry(0.192, 0.296, 0.22, 9), cloakMat, [0, 1.242, -0.04], [1, 1, 0.8]);
      mantle.rotation.z = 0.06;
      round(worn, cloakFold, [0.212, 1.296, -0.018], [0.142, 0.082, 0.15]);
      const panel = box(worn, cloakMat, [-0.055, 1.0, -0.192], [0.36, 0.43, 0.046]);
      panel.rotation.z = 0.07;
      box(worn, cloakFold, [-0.055, 0.788, -0.19], [0.352, 0.05, 0.052]);
      round(worn, gold, [0.17, 1.292, 0.096], [0.036, 0.036, 0.017]);
    } else if (garment === 'scarf') {
      // Wound twice against the fens' damp, over a bag too full to close.
      const scarfMat = material(0xac8548), scarfFold = material(0x83633a);
      part(worn, UNIT_CYLINDER, scarfMat, [0, 1.33, 0.012], [0.166, 0.08, 0.14]);
      part(worn, UNIT_CYLINDER, scarfFold, [0, 1.264, 0.016], [0.178, 0.06, 0.152]);
      const tail = box(worn, scarfMat, [-0.092, 1.136, 0.204], [0.13, 0.34, 0.034]);
      tail.rotation.z = -0.1;
      const shortTail = box(worn, scarfFold, [0.076, 1.192, 0.206], [0.108, 0.22, 0.032]);
      shortTail.rotation.z = 0.15;
      for (const y of [0.988, 1.086]) box(worn, scarfFold, [-0.094, y, 0.222], [0.124, 0.026, 0.016]);
      box(worn, bagMat, [-0.256, 0.828, 0], [0.192, 0.262, 0.272]);
      round(worn, leather, [-0.256, 0.948, 0], [0.112, 0.06, 0.152]);
      ribbon(worn, leather, [0.156, 1.318, 0.114], [-0.224, 0.868, 0.158], 0.055);
      ribbon(worn, leather, [0.156, 1.318, -0.114], [-0.224, 0.868, -0.13], 0.055);
    } else if (garment === 'wrapped-kilt') {
      // An islander keeps the wrapped kilt over the trousers he had to buy.
      const kiltMat = material(new THREE.Color(tunic).lerp(new THREE.Color(0xdccba0), 0.42));
      const kiltBand = material(new THREE.Color(tunic).multiplyScalar(0.68));
      part(worn, new THREE.CylinderGeometry(0.246, 0.302, 0.42, 9), kiltMat, [0, 0.752, 0], [1, 1, 0.78]);
      for (let i = 0; i < 7; i++) {
        const angle = (i - 3) * 0.42;
        ribbon(worn, kiltBand, [Math.sin(angle) * 0.252, 0.94, Math.cos(angle) * 0.2], [Math.sin(angle) * 0.3, 0.552, Math.cos(angle) * 0.238], 0.024, 0.016);
      }
      part(worn, UNIT_CYLINDER, kiltBand, [0, 0.93, 0], [0.26, 0.042, 0.202]);
      round(worn, kiltMat, [-0.226, 0.898, 0.088], [0.072, 0.062, 0.052]);
      const hangingEnd = box(worn, kiltMat, [-0.244, 0.756, 0.104], [0.092, 0.23, 0.032]);
      hangingEnd.rotation.z = -0.06;
      const coil = part(worn, new THREE.TorusGeometry(0.082, 0.023, 4, 10), linen, [0.226, 0.858, 0.022]);
      coil.rotation.set(0, 0.35, 0.22);
    } else if (garment === 'single-pauldron') {
      // One iron plate over the shield shoulder: the only armor he kept.
      round(arms[0], mercIron, [-0.022, -0.028, 0], [0.148, 0.106, 0.158]);
      part(arms[0], UNIT_CYLINDER, mercIronDark, [-0.028, -0.086, 0], [0.138, 0.026, 0.147]);
      round(arms[0], mercIron, [-0.046, -0.112, 0], [0.122, 0.062, 0.132]);
      ribbon(worn, mercStrap, [-0.206, 1.306, 0.052], [0.118, 1.072, 0.166], 0.05, 0.02);
      ribbon(worn, mercStrap, [-0.206, 1.306, -0.052], [0.128, 1.06, -0.15], 0.044, 0.018);
      box(worn, leather, [0.204, 0.848, 0.118], [0.046, 0.19, 0.052]);
      box(worn, bootMat, [0.208, 0.952, 0.122], [0.036, 0.062, 0.042]);
    } else if (garment === 'sleeveless') {
      // Cut the sleeves off and belt the waist: room for a two-handed swing.
      part(worn, UNIT_CYLINDER, leather, [0, 0.988, 0], [0.256, 0.118, 0.186]);
      for (const x of [-0.14, 0, 0.14]) box(worn, bootMat, [x, 0.988, 0.184], [0.03, 0.15, 0.014]);
      part(worn, UNIT_CYLINDER, bootMat, [0, 1.05, 0], [0.25, 0.022, 0.182]);
    } else if (garment === 'bedroll') {
      // Everything he owns is on his back, and none of it has broken yet.
      const roll = part(worn, UNIT_CYLINDER, linen, [0, 1.1, -0.214], [0.096, 0.39, 0.098]);
      roll.rotation.z = Math.PI / 2;
      for (const x of [-0.386, 0.386]) {
        const end = part(worn, UNIT_CYLINDER, clothLight, [x, 1.1, -0.214], [0.088, 0.022, 0.09]);
        end.rotation.z = Math.PI / 2;
      }
      for (const x of [-0.16, 0.16]) ribbon(worn, mercStrap, [x, 1.302, 0.1], [x * 1.2, 1.01, -0.215], 0.038, 0.018);
      part(worn, UNIT_CYLINDER, linen, [0, 0.902, 0], [0.242, 0.03, 0.174]);
      round(worn, linen, [0.148, 0.848, 0.144], [0.036, 0.05, 0.03]);
      round(worn, bootMat, [0.212, 0.826, 0.098], [0.048, 0.054, 0.048]);
      part(worn, UNIT_CYLINDER, bootMat, [0.212, 0.858, 0.098], [0.05, 0.014, 0.05]);
    } else if (garment === 'robe') {
      // Nobody else in the company wears anything that reaches the ankle. It is not
      // armour and is not pretending to be; it is what a man wears who expects the
      // fighting to be over before it reaches him.
      const robeMat = material(new THREE.Color(tunic).lerp(new THREE.Color(0x2a2f3c), 0.34));
      const hem = material(new THREE.Color(tunic).lerp(new THREE.Color(0xd8c89a), 0.5));
      part(worn, new THREE.CylinderGeometry(0.232, 0.338, 0.86, 10), robeMat, [0, 0.55, 0], [1, 1, 0.82]);
      part(worn, new THREE.CylinderGeometry(0.34, 0.344, 0.048, 10), hem, [0, 0.142, 0], [1, 1, 0.82]);
      // The front opening, and a cord at the waist rather than a belt.
      ribbon(worn, hem, [0, 1.006, 0.196], [0, 0.208, 0.268], 0.046, 0.02);
      part(worn, UNIT_CYLINDER, hem, [0, 0.93, 0], [0.252, 0.018, 0.184]);
      for (const side of [-1, 1]) {
        const tail = part(worn, UNIT_CYLINDER, hem, [side * 0.06, 0.83, 0.182], [0.014, 0.18, 0.014]);
        tail.rotation.x = -0.1;
      }
      // Wide sleeves that hang below the elbow.
      for (const side of [-1, 1]) part(worn, new THREE.CylinderGeometry(0.086, 0.134, 0.24, 8), robeMat, [side * 0.238, 1.02, 0], [1, 1, 0.9]);
    }
  }
  if (isDoomsayer) {
    // A deep cloth hood shades the eyes; his uneven grey beard and repaired
    // robe make an eccentric traveler, not an armored or faceless enemy.
    const hoodShadow = material(0x2d342f), beardShade = material(0x797d72);
    round(head, cloth, [0, .225, -.023], [.287, .315, .265]);
    round(head, hoodShadow, [0, .197, .226], [.197, .229, .033]);
    round(head, clothLight, [0, .418, .109], [.214, .072, .137]);
    for (const side of [-1, 1]) {
      round(head, clothLight, [side * .215, .207, .13], [.043, .221, .11]);
      round(head, material(0xada994), [side * .064, .216, .261], [.021, .013, .008]);
      round(head, dark, [side * .063, .216, .27], [.008, .011, .004]);
    }
    round(head, material(0x9f927a), [0, .164, .278], [.037, .055, .045]);
    const beard = part(head, new THREE.ConeGeometry(.143, .36, 7), hairMat, [0, -.027, .223], [1, 1, .62]); beard.rotation.z = Math.PI;
    round(head, hairMat, [-.057, .109, .273], [.076, .031, .035]);
    round(head, hairMat, [.064, .107, .274], [.074, .031, .032]);
    for (const [x, y, z] of [[-.074, -.025, .267], [.031, -.096, .27], [.076, -.012, .258]])
      round(head, beardShade, [x, y, z], [.033, .076, .026]);
    round(body, cloth, [0, 1.315, -.103], [.283, .11, .175]);
    for (const [x, y, z, angle] of [[-.18, .40, .213, -.12], [.18, .68, .188, .10], [-.14, 1.09, -.16, .08]]) {
      const patch = box(body, linen, [x, y, z], [.10, .12, .017]); patch.rotation.z = angle;
      for (const stitch of [-.027, .027]) box(body, clothLight, [x + stitch, y + .046, z + Math.sign(z) * .012], [.009, .028, .007]);
    }
    ribbon(body, linen, [-.19, .953, .125], [.19, .938, .125], .022, .018);
    ribbon(body, linen, [.05, .94, .181], [.08, .73, .205], .019, .016);
    staff = new THREE.Group(); staff.name = 'Orris gnarled walking staff'; wrists[1].add(staff);
    const staffWood = material(0x66523a), staffPale = material(0x9b865f);
    ribbon(staff, staffWood, [.015, -.82, .0], [-.025, .31, .0], .067, .063);
    ribbon(staff, staffWood, [-.025, .31, .0], [.032, .87, -.02], .074, .067);
    ribbon(staff, staffWood, [.032, .87, -.02], [-.038, 1.16, .025], .067, .062);
    ribbon(staff, staffPale, [-.038, 1.16, .025], [.04, 1.22, .036], .057, .049);
    round(staff, staffWood, [.045, .46, .018], [.083, .10, .074]);
    ribbon(staff, linen, [-.034, .15, .038], [.036, .14, .036], .04, .018);
  } else if (isCook) {
    // A plain apron over an ankle-length working dress, with tied waist and
    // flour-dusted pockets. No travel bag, cap, or borrowed male silhouette.
    part(body, new THREE.CylinderGeometry(0.205, 0.3, 0.565, 8, 1, true, -Math.PI * 0.255, Math.PI * 0.51), linen, [0, 0.634, 0.017], [1, 1, 0.83]);
    box(body, linen, [0, 1.075, 0.174], [0.224, 0.27, 0.019]);
    ribbon(body, linen, [-0.1, 1.2, 0.159], [-0.14, 1.302, 0.055], 0.028);
    ribbon(body, linen, [0.1, 1.2, 0.159], [0.14, 1.302, 0.055], 0.028);
    part(body, UNIT_CYLINDER, linen, [0, 0.935, 0], [0.233, 0.031, 0.17]);
    for (const side of [-1, 1]) {
      const pocket = box(body, clothLight, [side * 0.104, 0.663, 0.215], [0.098, 0.098, 0.016]);
      pocket.rotation.y = side * 0.16;
      ribbon(body, linen, [side * 0.015, 0.925, -0.174], [side * 0.082, 0.818, -0.18], 0.027);
    }
    round(body, linen, [0, 0.93, -0.19], [0.04, 0.027, 0.025]);
    // A tiny wooden kitchen spoon in a pocket makes her role legible.
    ribbon(body, leather, [0.111, 0.67, 0.23], [0.139, 0.839, 0.225], 0.018, 0.014);
    round(body, bagMat, [0.141, 0.842, 0.225], [0.031, 0.044, 0.014]);
  } else if (isGardenKeeper) {
    // A man who kneels for a living: both knees worn pale and dark with soil, sleeves rolled back off
    // the forearms, a twine belt with a trowel through it, and a hat that has been rained on for years.
    const soil = material(0x4a3d2e), twine = material(0xb0a281), steel = material(0x8d8f92), worn = material(0x6b6352);
    for (const side of [-1, 1]) {
      box(body, worn, [side * 0.082, 0.44, 0.06], [0.135, 0.14, 0.135]);
      round(body, soil, [side * 0.082, 0.4, 0.118], [0.07, 0.05, 0.03]);
    }
    box(body, twine, [0, 0.93, 0.17], [0.37, 0.036, 0.036]);
    // The trowel through the belt on his right, blade down.
    const handle = part(body, UNIT_CYLINDER, worn, [0.155, 0.99, 0.185], [0.019, 0.1, 0.019]);
    handle.rotation.set(0.18, 0, 0.12);
    const blade = part(body, new THREE.ConeGeometry(1, 1, 4), steel, [0.166, 0.845, 0.194], [0.036, 0.13, 0.016]);
    blade.rotation.set(Math.PI - 0.18, Math.PI / 4, -0.12);
    // A coil of garden cord on the other hip.
    const coil = part(body, new THREE.TorusGeometry(0.052, 0.016, 5, 12), twine, [-0.16, 0.9, 0.16]);
    coil.rotation.set(Math.PI / 2, 0, 0.2);
    // Hair going grey at the sides, and a broad soft hat over it.
    round(head, hairMat, [0, 0.18, -0.06], [0.152, 0.118, 0.155]);
    const brim = part(head, UNIT_CYLINDER, worn, [0, 0.29, 0], [0.33, 0.016, 0.33]);
    brim.rotation.set(0.07, 0, 0.05);
    part(head, UNIT_CYLINDER, worn, [0, 0.35, 0], [0.175, 0.1, 0.175]);
    part(head, UNIT_CYLINDER, twine, [0, 0.31, 0], [0.181, 0.02, 0.181]);
  } else if (isBirdWatcher) {
    // Tidehaven's bird-watcher, drawn from Michael's sketch (page 231, the Future Panic doodles): a big
    // rounded head under thick upright spiky hair, a long hooked nose, a cream collared shirt buttoned
    // down the front with a breast pocket. He keeps a brass spyglass on a cord and a notebook, and wears
    // a falconer's gauntlet on the left arm, where his red-tailed hawk rides.
    head.scale.setScalar(1.08);
    const spike = new THREE.ConeGeometry(1, 1, 5);
    for (const [x, y, z, lean, twist, length] of [
      [0, 0.44, 0.02, -0.05, 0, 0.19], [-0.08, 0.43, 0.06, -0.28, 0.3, 0.17], [0.08, 0.43, 0.06, -0.28, -0.3, 0.17],
      [-0.13, 0.4, -0.02, -0.1, 0.55, 0.16], [0.13, 0.4, -0.02, -0.1, -0.55, 0.16], [0, 0.42, -0.1, 0.35, 0, 0.17],
      [-0.09, 0.4, -0.12, 0.4, 0.4, 0.15], [0.09, 0.4, -0.12, 0.4, -0.4, 0.15], [-0.17, 0.33, -0.08, 0.2, 0.9, 0.13],
      [0.17, 0.33, -0.08, 0.2, -0.9, 0.13], [-0.04, 0.4, 0.13, -0.55, 0.15, 0.14], [0.05, 0.4, 0.14, -0.6, -0.2, 0.13],
      [0, 0.34, -0.2, 0.9, 0, 0.13],
    ]) {
      const lock = part(head, spike, hairMat, [x, y, z], [0.055, length, 0.05]);
      lock.rotation.set(lean, 0, twist);
    }
    // The long triangular nose, a little hooked at the tip.
    const bridge = round(head, noseMat, [0, 0.175, 0.222], [0.032, 0.078, 0.045]);
    bridge.rotation.x = -0.32;
    round(head, noseMat, [0, 0.139, 0.248], [0.029, 0.025, 0.026]);
    // Collar points, the placket's buttons and the breast pocket.
    const shirtShade = material(0xcfc2a2), button = material(0x8a7a60);
    for (const side of [-1, 1]) {
      const point = box(body, shirtShade, [side * 0.06, 1.3, 0.155], [0.09, 0.075, 0.02]);
      point.rotation.set(-0.35, 0, side * 0.55);
    }
    for (let k = 0; k < 6; k++) round(body, button, [0, 1.25 - k * 0.07, 0.19 - k * 0.002], [0.012, 0.012, 0.008]);
    box(body, shirtShade, [0.1, 1.14, 0.182], [0.085, 0.09, 0.012]);
    round(body, button, [0.1, 1.175, 0.19], [0.009, 0.009, 0.006]);
    // The spyglass on its cord and the notebook, as before.
    ribbon(body, leather, [-0.11, 1.33, 0.1], [0.07, 1.14, 0.2], 0.014, 0.01);
    const brass = material(0xc8a250, { metalness: 0.35, roughness: 0.45 });
    part(body, UNIT_CYLINDER, brass, [0.085, 1.06, 0.205], [0.028, 0.17, 0.028]);
    part(body, UNIT_CYLINDER, brass, [0.085, 0.965, 0.205], [0.034, 0.03, 0.034]);
    box(body, leather, [-0.13, 0.9, 0.175], [0.085, 0.11, 0.022]);
    box(body, whites, [-0.128, 0.905, 0.187], [0.07, 0.095, 0.006]);
    // The falconer's gauntlet: thick leather from mid-forearm over the left hand.
    const gauntlet = material(0x7a5431);
    part(elbows[0], UNIT_CYLINDER, gauntlet, [0, -0.19, 0.004], [0.078, 0.2, 0.08]);
    part(elbows[0], UNIT_CYLINDER, material(0x5e3f24), [0, -0.1, 0.004], [0.085, 0.022, 0.087]);
    round(wrists[0], gauntlet, [0, -0.055, 0.01], [0.062, 0.075, 0.055]);
  } else if (isWineSeller) {
    // An open collar and sleeves rolled to the elbow, a long wine-dark cellar
    // apron, and the silver tasting cup of his trade hung on a ribbon.
    const apron = material(0x4a2a30), ribbonRed = material(0x7a2436), silver = material(0xd8dbe0, { metalness: 0.6, roughness: 0.3 });
    const opening = box(body, skinMat, [0, 1.3, 0.162], [0.075, 0.11, 0.02]);
    opening.rotation.x = -0.2;
    for (const side of [-1, 1]) {
      const point = box(body, clothLight, [side * 0.06, 1.32, 0.16], [0.07, 0.085, 0.02]);
      point.rotation.set(-0.3, 0, side * 0.6);
    }
    box(body, apron, [0, 0.72, 0.172], [0.31, 0.6, 0.02]);
    box(body, apron, [0, 1.08, 0.184], [0.22, 0.2, 0.018]);
    ribbon(body, apron, [-0.1, 1.18, 0.18], [-0.12, 1.31, 0.07], 0.024);
    ribbon(body, apron, [0.1, 1.18, 0.18], [0.12, 1.31, 0.07], 0.024);
    part(body, UNIT_CYLINDER, apron, [0, 1.0, 0], [0.24, 0.03, 0.175]);
    ribbon(body, ribbonRed, [-0.07, 1.33, 0.1], [0, 1.15, 0.2], 0.012, 0.01);
    ribbon(body, ribbonRed, [0.07, 1.33, 0.1], [0, 1.15, 0.2], 0.012, 0.01);
    const tastevin = part(body, UNIT_CYLINDER, silver, [0, 1.13, 0.208], [0.042, 0.012, 0.042]);
    tastevin.rotation.x = Math.PI / 2 * 0.85;
  } else if (isDyer) {
    // A skirt in stripes of every colour she makes, a turquoise top with a yellow
    // belt, a hot pink shawl with black leopard spots, and fingertips stained three colours.
    // A small waist, the skirt flaring quickly to full hips, the upper bands sitting a little further back.
    const rainbow = [0xff3fa4, 0xff8c1a, 0xffe135, 0x7ed321, 0x1ec8d8, 0x8e44ec], radii = [0.18, 0.28, 0.315, 0.325, 0.33, 0.335, 0.34];
    rainbow.forEach((tint, i) => {
      const top = 0.96 - i * 0.1;
      part(body, new THREE.CylinderGeometry(radii[i], radii[i + 1], 0.1, 14, 1, true), material(tint), [0, top - 0.05, i < 3 ? -0.03 : -0.012], [1, 1, i < 3 ? 1 : 0.94]);
    });
    part(body, UNIT_CYLINDER, material(0xffe135), [0, 0.975, 0], [0.19, 0.035, 0.15]);
    // Strong arms under the sleeves, and big calves in her boots.
    arms.forEach((pivot, i) => round(pivot, cloth, [(i ? 1 : -1) * 0.022, -0.14, 0.012], [0.108, 0.125, 0.104]));
    elbows.forEach(elbow => round(elbow, cloth, [0, -0.075, 0.01], [0.088, 0.1, 0.088]));
    knees.forEach(knee => round(knee, bootMat, [0, -0.1, -0.07], [0.09, 0.115, 0.075]));
    const shawl = material(0xff3fa4), spot = material(0x141014), from = 0.75, sweep = Math.PI * 2 - 1.5;
    part(body, new THREE.CylinderGeometry(0.2, 0.31, 0.34, 14, 1, true, from, sweep), shawl, [0, 1.2, -0.01], [1, 1, 0.9]);
    for (let k = 0; k < 18; k++) {
      const theta = from + ((k * 0.618) % 1) * sweep, y = 1.08 + ((k * 0.37) % 1) * 0.24, radius = 0.31 - (y - 1.03) / 0.34 * 0.11 + 0.006;
      round(body, spot, [Math.sin(theta) * radius, y, Math.cos(theta) * radius * 0.9 - 0.01], [0.03, 0.024, 0.03]);
    }
    for (const [i, tints] of [[0, [0xff3fa4, 0x1ec8d8, 0x7ed321]], [1, [0xffe135, 0x8e44ec, 0xff8c1a]]]) {
      tints.forEach((tint, k) => round(wrists[i], material(tint), [(k - 1) * 0.028, -0.075, 0.03], [0.02, 0.018, 0.022]));
    }
  } else if (isWineClerk) {
    // A charcoal shop apron over a green knit, and a book always within reach.
    const apron = material(0x3a3a3c), cover = material(0x7a2e2a);
    box(body, apron, [0, 0.8, 0.176], [0.24, 0.5, 0.018]);
    box(body, apron, [0, 1.09, 0.18], [0.19, 0.18, 0.016]);
    ribbon(body, apron, [-0.085, 1.17, 0.175], [-0.1, 1.3, 0.07], 0.02);
    ribbon(body, apron, [0.085, 1.17, 0.175], [0.1, 1.3, 0.07], 0.02);
    part(body, UNIT_CYLINDER, apron, [0, 0.97, 0], [0.215, 0.025, 0.16]);
    // The book she is reading, open in her hands.
    const book = new THREE.Group(); book.name = 'Nika’s book'; book.position.set(0, 1.0, 0.3); book.rotation.x = -0.9; body.add(book);
    for (const side of [-1, 1]) {
      const leaf = box(book, cover, [side * 0.062, 0, 0], [0.12, 0.012, 0.16]);
      leaf.rotation.z = side * -0.12;
      const pages = box(book, whites, [side * 0.06, 0.012, 0], [0.11, 0.012, 0.15]);
      pages.rotation.z = side * -0.12;
    }
  } else if (isKeeper) {
    // A pale canvas smock to the knee, long gloves, and no hat and no veil at all: the bees know him,
    // and he would rather see what he is doing. The spectacles are his own, and he works in them.
    const canvas = material(0xe7e0c8), tin = material(0x9aa0a4, { metalness: .5, roughness: .45 });
    part(body, new THREE.CylinderGeometry(.245, .33, .56, 10), canvas, [0, .62, 0], [1, 1, .82]);
    part(body, UNIT_CYLINDER, material(0x8a6a42), [0, .93, 0], [.268, .045, .2]);
    for (const side of [-1, 1]) part(arms[side > 0 ? 1 : 0], new THREE.CylinderGeometry(.078, .07, .16, 8), canvas, [side * .02, -.22, 0]);
    for (const wrist of wrists) round(wrist, canvas, [0, .01, 0], [.085, .075, .085]);
    // Spectacles: he works in them, and would rather see what he is doing than wear a veil.
    spectacles(head, 'Troy’s spectacles', material(0x8c7a4e, { metalness: .55, roughness: .4 }), material(0xdfe7ea, { roughness: .12, metalness: .1 }));
    // The smoker in his right hand: a tin with a spout and a little bellows.
    const smoker = new THREE.Group(); smoker.name = 'Troy’s bee smoker'; wrists[1].add(smoker);
    smoker.position.set(-.02, -.12, .03);
    part(smoker, new THREE.CylinderGeometry(.062, .07, .18, 8), tin, [0, -.02, 0]);
    part(smoker, new THREE.ConeGeometry(.055, .09, 8), tin, [0, .1, 0]);
    part(smoker, UNIT_CYLINDER, material(0x2a2622), [0, .15, 0], [.022, .03, .022]);
    for (const side of [-1, 1]) round(smoker, material(0x7a5a3a), [side * .06, -.02, -.05], [.03, .055, .022]);
  } else if (isKaty) {
    // A long dusk-violet dress for walking the rows at dawn, a short black cape whose hem is cut in
    // scallops like a bat's wing, a little black bat on a cord at her throat, and a brass spyglass.
    const dress = material(new THREE.Color(tunic).multiplyScalar(0.9)), black = material(0x1b1a1f);
    part(body, new THREE.CylinderGeometry(0.235, 0.34, 0.62, 10), dress, [0, 0.58, 0], [1, 1, 0.78]);
    const cape = new THREE.Group(); cape.name = 'Katy’s bat-winged cape'; body.add(cape);
    part(cape, new THREE.CylinderGeometry(0.22, 0.3, 0.42, 10, 1, true, Math.PI / 2 + 0.2, Math.PI - 0.4), material(0x1b1a1f, { side: THREE.DoubleSide }), [0, 1.1, -0.02], [1, 1, 0.82]);
    for (let k = 0; k < 7; k++) {
      const angle = Math.PI / 2 + 0.35 + k * (Math.PI - 0.7) / 6, scallop = part(cape, new THREE.ConeGeometry(0.045, 0.11, 4), black, [Math.sin(angle) * 0.296, 0.845, Math.cos(angle) * 0.243]);
      scallop.rotation.x = Math.PI;
    }
    for (const side of [-1, 1]) round(cape, black, [side * 0.2, 1.3, 0.08], [0.06, 0.04, 0.07]);
    const pendant = new THREE.Group(); pendant.name = 'Katy’s bat pendant'; pendant.position.set(0, 1.23, 0.185); body.add(pendant);
    ribbon(body, black, [-0.07, 1.33, 0.14], [0, 1.25, 0.18], 0.008, 0.006);
    ribbon(body, black, [0.07, 1.33, 0.14], [0, 1.25, 0.18], 0.008, 0.006);
    round(pendant, black, [0, 0, 0], [0.014, 0.024, 0.01]);
    for (const side of [-1, 1]) {
      const wing = box(pendant, black, [side * 0.028, 0.004, 0], [0.04, 0.02, 0.006]);
      wing.rotation.z = side * -0.35;
      for (const tip of [0.022, 0.044]) box(pendant, black, [side * tip, -0.012, 0], [0.012, 0.01, 0.006]);
    }
  } else if (isRivalKeeper) {
    // Black oilskins over the same jersey her sister wears, buttoned to the throat, and a lamp
    // held low and away from her face, which is how somebody stands who wants to see and not be seen.
    const oil = material(0x24262b, { roughness: .52 }), horn = material(0x3a3028);
    const brassLamp = material(0xb8923e, { metalness: .5, roughness: .42 }), flame = material(0xf2d9a0);
    part(body, new THREE.CylinderGeometry(.262, .33, .74, 10), oil, [0, .95, 0], [1, 1, .74]);
    part(body, new THREE.CylinderGeometry(.135, .155, .14, 10), oil, [0, 1.315, .01], [1, 1, .84]);
    for (const y of [1.18, 1.05, .92]) box(body, material(0x3d4046), [0, y, .2], [.03, .045, .012]);
    const sheath = new THREE.Group(); sheath.name = 'Her knife'; body.add(sheath);
    sheath.position.set(.2, .84, .1); sheath.rotation.z = .22;
    box(sheath, horn, [0, 0, 0], [.07, .26, .045]);
    // The lamp, down at the end of her left arm where it lights the ground and nothing else.
    const lamp = new THREE.Group(); lamp.name = 'Her lamp'; wrists[0].add(lamp);
    lamp.position.set(0, -.13, .02);
    part(lamp, new THREE.CylinderGeometry(.055, .065, .14, 8), brassLamp, [0, -.06, 0]);
    part(lamp, new THREE.CylinderGeometry(.05, .05, .08, 8), flame, [0, .03, 0]);
    part(lamp, new THREE.ConeGeometry(.07, .08, 8), brassLamp, [0, .11, 0]);
    part(lamp, UNIT_CYLINDER, brassLamp, [0, .17, 0], [.008, .09, .008]);
  } else if (isLightKeeper) {
    // A knitted jersey, close and dark and darned at both elbows; oilskin trousers gone stiff
    // and shiny; a knife on a lanyard where a hand falls on it; and ink on both forearms, four
    // ports' worth, gone soft and blue the way old ink does under weather.
    const jersey = material(new THREE.Color(tunic).multiplyScalar(.92)), oilskin = material(0x3c4a4e, { roughness: .58 });
    const ink = material(new THREE.Color(skin).lerp(new THREE.Color(0x2c3e63), .5)), horn = material(0x4a3a2c);
    const steel = material(0x9aa0a4, { metalness: .55, roughness: .4 }), line = material(0xcfc0a0);
    part(body, new THREE.CylinderGeometry(.256, .3, .42, 10), jersey, [0, 1.05, 0], [1, 1, .7]);
    // The neck of it, which comes up under the jaw and is the entire argument for a jersey.
    part(body, new THREE.CylinderGeometry(.13, .15, .13, 10), jersey, [0, 1.315, .01], [1, 1, .84]);
    for (const side of [-1, 1]) {
      // Ink: bands and marks on the forearms rather than pictures, because that is how it reads.
      round(wrists[side > 0 ? 1 : 0], ink, [0, .04, .004], [.066, .028, .068]);
      round(wrists[side > 0 ? 1 : 0], ink, [0, -.02, .006], [.062, .018, .064]);
    }
    // The knife, hung from the belt on a lanyard at her right hand.
    const sheath = new THREE.Group(); sheath.name = 'Addison’s knife'; body.add(sheath);
    sheath.position.set(.2, .84, .1); sheath.rotation.z = .22;
    box(sheath, horn, [0, 0, 0], [.07, .26, .045]);
    box(sheath, steel, [0, .17, 0], [.03, .1, .028]);
    ribbon(body, line, [.1, .95, .12], [.2, .87, .12], .012, .008);
    // The coil of line over her left shoulder, which she does not put down to talk to anybody.
    const coil = new THREE.Group(); coil.name = 'Addison’s coil of line'; body.add(coil);
    coil.position.set(-.2, 1.16, .02); coil.rotation.set(.3, 0, .42);
    for (const [r, y] of [[.13, 0], [.125, .035], [.12, .07]]) part(coil, new THREE.TorusGeometry(r, .022, 5, 12), line, [0, y, 0]);
  } else if (isWinemaker) {
    // A heavy leather apron, dark and stiff and wet down the front, over a linen shirt with the
    // sleeves rolled; and purple to the elbow, which is the whole autumn on a winemaker's arms.
    const hide = material(0x4a3527), wet = material(0x3a2a20), must = material(0x5b2b52);
    box(body, hide, [0, 1.1, .178], [.23, .3, .03]);
    box(body, hide, [0, .79, .181], [.33, .4, .034]);
    box(body, wet, [-.02, .72, .199], [.19, .26, .01]);
    for (const side of [-1, 1]) ribbon(body, hide, [side * .11, 1.286, .1], [side * .095, 1.2, .174], .03, .016);
    // The must on her: a band at each rolled cuff, and her hands stained past helping.
    for (const wrist of wrists) {
      round(wrist, must, [0, .012, .004], [.074, .05, .076]);
      // Stained skin, not gloves: the colour sits in the hand rather than over it.
      round(wrist, material(new THREE.Color(skin).lerp(new THREE.Color(0x4f2a46), .62)), [0, -.068, .012], [.058, .05, .062]);
    }
  } else if (isVineKeeper) {
    // The shirt sleeves are rolled to the elbow from the thaw to the leaf fall, and over the
    // shirt a heavy canvas apron wiped down the same two places for eleven years: a bib to the
    // collarbone, a skirt to the knee, the shears standing out of the pocket and the block book
    // down beside them.
    const canvas = material(0x8d8165), worn = material(0x776b53), stain = material(0x5f414a);
    const steel = material(0x8d9298, { metalness: .6, roughness: .36 });
    box(body, canvas, [0, 1.11, .176], [.2, .28, .028]);
    box(body, canvas, [0, .8, .178], [.31, .38, .032]);
    box(body, stain, [-.088, .705, .195], [.085, .12, .008]);
    box(body, stain, [.102, .75, .195], [.06, .085, .008]);
    box(body, worn, [0, .78, .196], [.27, .115, .01]);
    for (const side of [-1, 1]) ribbon(body, canvas, [side * .105, 1.286, .1], [side * .088, 1.2, .172], .026, .014);
    // The shears in the apron pocket: two blades and the bow of the handle above them.
    const shears = new THREE.Group(); shears.name = 'Imani’s shears'; body.add(shears);
    shears.position.set(.083, .83, .208); shears.rotation.z = .07;
    for (const side of [-1, 1]) {
      const blade = box(shears, steel, [side * .013, .04, 0], [.019, .16, .012]);
      blade.rotation.z = side * .05;
    }
    part(shears, new THREE.TorusGeometry(.028, .009, 4, 10), material(0x6a4432), [0, .14, 0]);
    // The block book: eleven years of when each block budded, flowered, turned and came in.
    const book = new THREE.Group(); book.name = 'Imani’s block book'; body.add(book);
    book.position.set(-.085, .845, .202); book.rotation.z = -.1;
    box(book, material(0x5c4636), [0, 0, 0], [.1, .13, .022]);
    box(book, material(0xcdc1a4), [0, .004, .004], [.09, .118, .024]);
  } else if (role === 'harbormaster') {
    // The apron and its two straps belong to the pier, not to a particular keeper of it.
    box(body, linen, [0, 0.984, 0.18], [0.225, 0.434, 0.036]);
    ribbon(body, leather, [-0.113, 1.277, 0.126], [-0.101, 1.093, 0.19], 0.027);
    ribbon(body, leather, [0.113, 1.277, 0.126], [0.101, 1.093, 0.19], 0.027);
    // Ovan Kell in Izolveth wears the salt-grey beard; Jojo in Tidehaven wears her hair tied back,
    // so the same apron carries two people rather than one face in two ports.
    if (look?.hairStyle) {
      // She has hair of her own (`look.hairStyle`), so the apron's own scalp shapes are left off:
      // drawn together they close round the jaw and read as a beard (the user, 22 September 2026).
    } else if (look?.beard === false) {
      round(head, hairMat, [0, 0.052, 0], [0.152, 0.128, 0.152]);
      round(head, hairMat, [0, 0.026, -0.126], [0.078, 0.082, 0.08]);
    } else {
      round(head, hairMat, [0, 0.063, 0.101], [0.14, 0.106, 0.122]);
      round(head, hairMat, [-0.047, 0.133, 0.188], [0.057, 0.022, 0.025]);
      round(head, hairMat, [0.047, 0.133, 0.188], [0.057, 0.022, 0.025]);
    }
  } else if (role === 'fisher' || isPondFisher) {
    const scarfMat = material(0xbf7151);
    part(body, UNIT_CYLINDER, scarfMat, [0, 1.324, 0], [0.114, 0.065, 0.098]);
    const scarfEnd = box(body, scarfMat, [-0.052, 1.225, 0.168], [0.084, 0.2, 0.027]);
    scarfEnd.rotation.z = -0.13;
    if (isPondFisher) {
      if (look?.beard !== false) round(head, hairMat, [0, .055, .105], [.134, .078, .113]);   // the pond fisher's beard
      box(body, linen, [-.103, 1.015, .184], [.114, .13, .023]);
    }
  } else if (role === 'warden') {
    const cloakMat = material(new THREE.Color(tunic).multiplyScalar(0.73));
    const cloak = new THREE.CylinderGeometry(0.188, 0.298, 0.596, 7, 1, true, Math.PI / 2, Math.PI);
    const cloakMesh = part(body, cloak, cloakMat, [0, 1.012, -0.018], [1, 1, 0.85]);
    cloakMesh.material.side = THREE.DoubleSide;
    round(body, gold, [-0.152, 1.266, 0.129], [0.031, 0.031, 0.013]);
  } else if (isSoldier) {
    // Ambron's issue: mail under a red tabard with the gold tower of the narrows, big rounded pauldrons,
    // a bascinet with a nasal and a mail aventail, greaves and knee cops, a heater shield, a sheathed sword
    // at the hip and a planted spear. Officers add a plume and a gold-edged cloak and keep a hand on the hilt;
    // Suval's border guards wear a studded jerkin and a plain iron cap.
    const iron = material(isSuvaliGuard ? 0x7b7d78 : isElodiGuard ? 0x55575a : 0x9a9d96, { metalness: 0.46, roughness: 0.6 });
    const ironDark = material(isElodiGuard ? 0x2f3033 : 0x62655f, { metalness: 0.46, roughness: 0.6 });
    const strap = material(isElodiGuard ? 0x1d1c1e : 0x4d3a2a);
    const armor = new THREE.Group();
    armor.name = isSuvaliGuard ? 'Suvali studded jerkin' : isElodiGuard ? 'Elodi black lamellar' : 'Ambroni mail and tabard';
    body.add(armor);
    if (isElodiGuard) {
      // A short coat of small black lacquered plates laced in rows over charcoal wool: lighter than the army's bands.
      const lacquer = material(0x18181a, { metalness: 0.2, roughness: 0.55 });
      part(armor, new THREE.CylinderGeometry(0.258, 0.232, 0.38, 8), strap, [0, 1.12, 0], [1, 1, 0.69]);
      for (let row = 0; row < 4; row++) for (let i = -3; i <= 3; i++) {
        const angle = i * 0.36, y = 1.26 - row * 0.085;
        const plate = box(armor, row % 2 ? lacquer : ironDark, [Math.sin(angle) * 0.25, y, Math.cos(angle) * 0.178], [0.062, 0.07, 0.012]);
        plate.rotation.y = angle;
      }
      for (const side of [-1, 1]) round(armor, lacquer, [side * 0.235, 1.305, 0], [0.11, 0.05, 0.12]);
      box(armor, material(0x6b6d70, { metalness: 0.3, roughness: 0.5 }), [0, 1.2, 0.19], [0.032, 0.05, 0.01]);
    } else if (isSuvaliGuard) {
      part(armor, new THREE.CylinderGeometry(0.262, 0.236, 0.40, 8), strap, [0, 1.115, 0], [1, 1, 0.7]);
      for (let row = 0; row < 3; row++) for (let i = -2; i <= 2; i++) round(armor, iron, [i * 0.072, 1.245 - row * 0.1, 0.176 - Math.abs(i) * 0.022], [0.016, 0.016, 0.01]);
    } else {
      // A mail shirt to mid-thigh, and over it the red tabard of the Empire, gold-hemmed, with the tower of the narrows
      // on the breast. Big rounded pauldrons in two lames; the belt and sword-belt go over the tabard.
      // The plate shares the iron's finish and the mail is matte, so the armour costs the body no extra draws.
      const mail = material(0x7c807b), steel = material(0x9ea19b, { metalness: 0.46, roughness: 0.6 });
      const tabard = material(tunic), gateDark = material(0x3a2a22);
      part(armor, new THREE.CylinderGeometry(0.262, 0.236, 0.41, 10), mail, [0, 1.12, 0], [1, 1, 0.72]);
      part(armor, new THREE.CylinderGeometry(0.25, 0.3, 0.3, 10), mail, [0, 0.8, 0], [1, 1, 0.74]);
      for (const face of [1, -1]) {
        box(armor, tabard, [0, 1.0, face * 0.197], [0.34, 0.66, 0.018]);
        box(armor, gold, [0, 0.675, face * 0.2], [0.34, 0.03, 0.016]);
        for (const side of [-1, 1]) box(armor, gold, [side * 0.163, 1.0, face * 0.2], [0.016, 0.66, 0.016]);
      }
      // The shoulders of the tabard, over the mail.
      for (const side of [-1, 1]) box(armor, tabard, [side * 0.13, 1.315, 0], [0.12, 0.03, 0.4]);
      ambronDevice((mat, [x, y], [sx, sy], turn = 0) => { const piece = box(armor, mat, [x, 1.13 + y, 0.21], [sx, sy, 0.01]); piece.rotation.z = turn; }, gold, gateDark, 1.25);
      part(armor, UNIT_CYLINDER, strap, [0, 0.9, 0], [0.272, 0.05, 0.206]);
      box(armor, steel, [0, 0.9, 0.212], [0.055, 0.045, 0.014]);
      for (const side of [-1, 1]) {
        round(armor, steel, [side * 0.27, 1.33, 0], [0.155, 0.105, 0.165]);
        round(armor, iron, [side * 0.3, 1.255, 0], [0.13, 0.07, 0.15]);
        if (isOfficer) round(armor, gold, [side * 0.27, 1.36, 0], [0.12, 0.08, 0.13]);
      }
    }
    // Leather pteruges hang from the belt around the front and sides; Elod's are short black tassets. Ambron's men have mail there instead.
    if (!isAmbroni) for (let i = 0; i < 7; i++) {
      const angle = (i - 3) * 0.38;
      const strip = box(armor, i % 2 ? strap : isElodiGuard ? material(0x232326) : leather, [Math.sin(angle) * 0.235, isElodiGuard ? 0.9 : 0.86, Math.cos(angle) * 0.19], [0.058, isElodiGuard ? 0.12 : 0.17, 0.014]);
      strip.rotation.y = angle;
    }
    // The sword stays sheathed at the left hip: scabbard, guard and grip. An Elodi guard carries a long knife instead.
    const scabbard = box(armor, isElodiGuard ? strap : leather, [-0.26, isElodiGuard ? 0.92 : 0.84, -0.03], [0.045, isElodiGuard ? 0.26 : 0.42, 0.05]);
    scabbard.rotation.z = 0.12;
    box(armor, ironDark, [-0.283, 1.06, -0.03], [isElodiGuard ? 0.07 : 0.12, 0.02, 0.04]);
    part(armor, UNIT_CYLINDER, strap, [-0.29, 1.11, -0.03], [0.018, 0.09, 0.018]);
    // Greaves for Ambron and Suval, and for Ambron a rounded plate over the knee; soft boots with a black wrap for Elod.
    for (const knee of knees) box(knee, isElodiGuard ? strap : iron, [0, isElodiGuard ? -0.06 : -0.135, 0.104], [isElodiGuard ? 0.17 : 0.15, isElodiGuard ? 0.05 : 0.2, 0.03]);
    if (isAmbroni) for (const knee of knees) round(knee, material(0x9ea19b, { metalness: 0.46, roughness: 0.6 }), [0, 0.01, 0.07], [0.075, 0.07, 0.05]);
    part(elbows[1], UNIT_CYLINDER, strap, [0, -0.1, 0.004], [0.077, 0.09, 0.079]);
    const helmet = new THREE.Group();
    helmet.name = isSuvaliGuard ? 'Suvali iron cap' : isElodiGuard ? 'Elodi open helm' : isOfficer ? 'Ambroni plumed helm' : 'Ambroni helm';
    head.add(helmet);
    if (isElodiGuard) {
      // A black hood drawn over a light open helm: the face bare, the hood falling to the shoulders.
      const hood = material(0x19191b);
      const hoodGroup = new THREE.Group(); hoodGroup.name = 'Elodi black hood'; helmet.add(hoodGroup);
      round(hoodGroup, hood, [0, 0.215, -0.06], [0.235, 0.232, 0.2]);
      for (const side of [-1, 1]) round(hoodGroup, hood, [side * 0.185, 0.14, 0.01], [0.06, 0.16, 0.14]);
      // The hood's tail falls down the back, and its short cape lies over the shoulders.
      const tail = part(hoodGroup, new THREE.ConeGeometry(0.1, 0.36, 5), hood, [0, 0.2, -0.27]);
      tail.rotation.x = -2.3;
      part(hoodGroup, new THREE.CylinderGeometry(0.19, 0.33, 0.2, 9), hood, [0, -0.05, -0.02], [1, 1, 0.78]);
      // A light open helm over the hood: a low iron bowl, a rim and a nasal.
      round(helmet, iron, [0, 0.385, -0.03], [0.205, 0.115, 0.19]);
      part(helmet, UNIT_CYLINDER, ironDark, [0, 0.36, -0.03], [0.215, 0.024, 0.2]);
      box(helmet, ironDark, [0, 0.33, 0.17], [0.024, 0.1, 0.02]);
    } else if (isAmbroni) {
      // A bascinet: a tall rounded bowl drawn up to a low point, a brow band, a nasal, and mail hanging from it
      // round the sides and back of the neck and over the shoulders. The face stays open.
      const steel = material(0x9ea19b, { metalness: 0.46, roughness: 0.6 }), mail = material(0x7c807b);
      round(helmet, steel, [0, 0.29, -0.02], [0.228, 0.23, 0.215]);
      part(helmet, new THREE.ConeGeometry(0.1, 0.14, 8), steel, [0, 0.5, -0.04]);
      part(helmet, UNIT_CYLINDER, ironDark, [0, 0.245, -0.005], [0.236, 0.034, 0.218]);
      box(helmet, steel, [0, 0.17, 0.212], [0.036, 0.14, 0.022]);
      part(helmet, new THREE.CylinderGeometry(0.23, 0.31, 0.27, 12, 1, true, 0.85, Math.PI * 2 - 1.7), mail, [0, 0.115, -0.015], [1, 1, 0.96]);
    } else {
      round(helmet, iron, [0, 0.27, -0.015], [0.222, 0.2, 0.205]);
      part(helmet, UNIT_CYLINDER, ironDark, [0, 0.245, 0], [0.228, 0.036, 0.208]);
    }
    if (isElodiGuard) {
      // Nothing more on the head: the hood is the whole of it.
    } else if (isSuvaliGuard) {
      part(helmet, UNIT_CYLINDER, ironDark, [0, 0.228, 0], [0.27, 0.014, 0.25]);
    }
    if (isOfficer) {
      // An officer's plume, red and white, from a gold socket at the helm's point; and a red cloak to the calf,
      // gold-edged, clasped at both shoulders.
      const plume = new THREE.Group();
      plume.name = 'Officer plume';
      helmet.add(plume);
      part(plume, UNIT_CYLINDER, gold, [0, 0.555, -0.05], [0.03, 0.04, 0.03]);
      // A drill officer's plume is white through (`look.plume === 'white'`): Glun at the practice
      // post is the army's teacher rather than one of its commanders, and reads as his own man
      // at a glance without leaving the Ambroni build (src/instructor.js).
      const white = material(0xe8e2d4), red = look?.plume === 'white' ? white : material(0xa53a2c);
      for (const [x, y, z, mat, lean] of [[0, 0.64, -0.09, red, -0.5], [-0.035, 0.62, -0.12, white, -0.8], [0.035, 0.62, -0.12, white, -0.8], [0, 0.6, -0.16, red, -1.1]]) {
        const feather = round(plume, mat, [x, y, z], [0.045, 0.1, 0.04]);
        feather.rotation.x = lean;
      }
      const cloakMat = material(0x7d2a24, { side: THREE.DoubleSide });
      part(body, new THREE.CylinderGeometry(0.22, 0.36, 0.86, 10, 1, true, Math.PI / 2 + .15, Math.PI - .3), cloakMat, [0, 0.9, -0.04], [1, 1, 0.85]);
      part(body, new THREE.CylinderGeometry(0.362, 0.362, 0.035, 10, 1, true, Math.PI / 2 + .15, Math.PI - .3), material(0xc8a250, { side: THREE.DoubleSide }), [0, 0.475, -0.04], [1, 1, 0.85]);
      for (const side of [-1, 1]) round(body, gold, [side * 0.2, 1.31, 0.16], [0.035, 0.035, 0.014]);
    } else if (isElodiGuard && !armed) {
      // A short spear held close, or a bow across the back; a small round shield either way.
      // Elod's frontier captain carries no spear: a charcoal half-cloak with a silver clasp marks him instead.
      if (look?.officer) {
        const cloak = new THREE.Group(); cloak.name = 'Elodi captain cloak'; body.add(cloak);
        part(cloak, new THREE.CylinderGeometry(0.2, 0.33, 0.66, 8, 1, true, Math.PI / 2, Math.PI), material(0x3a3b3f, { side: THREE.DoubleSide }), [0, 0.98, -0.03], [1, 1, 0.85]);
        round(cloak, material(0xb9bcc0, { metalness: 0.5, roughness: 0.4 }), [0.15, 1.3, 0.14], [0.035, 0.035, 0.012]);
      } else if (look?.kit === 'bow') makeBow(body);
      else staff = makeSpearProp(wrists[1], 'Elodi short spear', 1.72, 0.26);
      const buckler = makeShield(elbows[0], { face: 0x242427, rim: 0x5f6164, round: true, width: 0.23 });
      buckler.name = 'Elodi round shield';
    } else if (!armed) {
      // The spear stays planted beside the right foot while the body breathes.
      staff = new THREE.Group();
      staff.name = isSuvaliGuard ? 'Suvali guard spear' : 'Ambroni spear';
      wrists[1].add(staff);
      const shaft = material(0x6d5439);
      ribbon(staff, shaft, [0, -0.82, 0], [0, 1.18, 0], 0.036, 0.036);
      ribbon(staff, ironDark, [0, 1.18, 0], [0, 1.24, 0], 0.03, 0.03);
      part(staff, new THREE.ConeGeometry(0.03, 0.24, 4), iron, [0, 1.36, 0]);
      round(staff, ironDark, [0, -0.83, 0], [0.024, 0.03, 0.024]);
    }
    if (isLegionary) {
      // The heater shield rides on the left forearm, device outward, held in front of the body at attention.
      makeHeaterShield(elbows[0], { face: tunic });
    }
  } else if (isMercenary) {
    // A hired sword's kit follows the roster: spears and the staff stand planted, the bow rides on the back.
    const kit = look?.weapon;
    if (kit === 'spear') staff = makeSpearProp(wrists[1], 'Ash spear', 2.0);
    else if (kit === 'pike') staff = makeSpearProp(wrists[1], 'Long spear', 2.85, 0.28);
    else if (kit === 'spears') { staff = makeSpearProp(wrists[1], 'Medium spear', 1.8); const javelin = makeSpearProp(body, 'Short spear', 1.25, 0.16); javelin.position.set(-0.18, 1.02, -0.19); javelin.rotation.set(0.12, 0, -0.42); }
    else if (kit === 'staff') staff = makeStaffProp(wrists[1]);
    // The bow rides on the back on a road and comes into the hand for a fight. Jerry standing
    // off at thirty paces has to be seen drawing one, not carrying one (src/archery.js).
    else if (kit === 'bow') { const slung = makeBow(body); if (armed) { slung.visible = false; heldBow = makeHeldBow(makeWeaponMount(wrists[0], 'Bow grip')); } }
    else if (kit === 'sword-shield') makeShield(elbows[0], { face: 0x6b4a2a, rim: 0x3f3128, round: true, width: 0.3 });
  }

  const idleOffset = isMiller ? 1.35 : isReedWorker ? 3.55 : isShelterKeeper ? 5.15 : isWoodcutter ? 2.1 : isCourier ? .8 : isBridgeKeeper ? 2.8 : isCustodian ? 4.4 : isClerk ? 5.6 : isCook ? 2.35 : isDoomsayer ? 1.1 : isPondFisher ? 3.8 : role === 'harbormaster' ? 1.8 : role === 'fisher' ? 3.1 : role === 'warden' ? 4.7 : 0;
  const chest = addChestPivot(body, legs, 0.935);
  // A soldier called to fight draws his sword instead of planting his spear.
  const fights = isSoldier && armed;
  // A villager caught in a fight takes up what is to hand: Tamsin's felling axe comes off her belt.
  const villagerHolds = !isTraveler && !isMercenary && !fights && VILLAGER_WEAPONS[wields] ? wields : null;
  const weapon = isTraveler || isMercenary ? makeWeaponMount(wrists[1], 'Traveler weapon grip') : fights ? makeWeaponMount(wrists[1], 'Soldier weapon grip')
    : villagerHolds ? makeWeaponMount(wrists[1], 'Villager weapon grip') : null;
  // Everything the traveler carries from the start, built once and shown one at a time.
  const weapons = isPlayer ? { 'simple-sword': makeSword(weapon), 'forest-stick': makeStick(weapon), 'iron-mace': makeMace(weapon), 'long-dagger': makeDagger(weapon), 'bearded-axe': makeAxe(weapon), greatsword: makeGreatsword(weapon) }
    : isMercenary ? mercenaryHeldWeapons(weapon, look?.weapon, Boolean(look?.trades)) : fights ? { 'simple-sword': makeSword(weapon) }
    : villagerHolds ? { [villagerHolds]: VILLAGER_WEAPONS[villagerHolds](weapon) } : {};
  const fishingGrip = isPlayer || isPondFisher ? makeWeaponMount(wrists[1], 'Fishing rod grip') : null;
  const fishingRod = fishingGrip ? makeFishingRod(fishingGrip) : null;
  const pivots = [body, chest, head, ...arms, ...elbows, ...wrists, ...legs, ...knees, ...ankles];
  if (weapon) pivots.push(weapon, ...Object.values(weapons));
  if (fishingGrip) pivots.push(fishingGrip, fishingRod);
  if (staff) pivots.push(staff);
  if (clothPivot) pivots.push(clothPivot);
  for (const [kind, joints] of Object.entries({ Shoulder: arms, Elbow: elbows, Wrist: wrists, Hip: legs, Knee: knees, Ankle: ankles })) {
    joints.forEach((joint, i) => { joint.name = `${i ? 'Right' : 'Left'} ${kind}`; });
  }
  body.name = 'Weight and hips';
  head.name = 'Head';
  batchRigidParts(group, pivots);
  if (isElodiGuard) {
    // Lean and quick-looking: a little taller and narrower than a soldier, the head kept to its own size.
    body.scale.set(0.93, 1.03, 0.93);
    head.scale.set(1 / Math.sqrt(0.93), 1 / 1.03, 1 / Math.sqrt(0.93));
  }
  if (isWineSeller) {
    body.scale.set(1.08, 1.13, 1.08);
    head.scale.set(1 / Math.sqrt(1.08), 1 / 1.13, 1 / Math.sqrt(1.08));
  }
  if (isKaty) {
    // The spyglass is at her right eye and looks where she looks: it rides on the head, and her hands come up to it.
    const glass = new THREE.Group(); glass.name = 'Katy’s spyglass'; head.add(glass);
    const brass = material(0xb8923e, { metalness: 0.55, roughness: 0.4 });
    glass.position.set(0.072, 0.205, 0.2); glass.rotation.x = Math.PI / 2;
    part(glass, new THREE.CylinderGeometry(0.026, 0.022, 0.16, 8), brass, [0, 0.07, 0]);
    part(glass, new THREE.CylinderGeometry(0.034, 0.03, 0.12, 8), brass, [0, 0.2, 0]);
    part(glass, UNIT_CYLINDER, material(0x2a2622), [0, 0.262, 0], [0.03, 0.01, 0.03]);
  }
  if (role === 'sorcerer') {
    // Round wire spectacles, a shade larger than Imani's: he reads at arm's length and he is not
    // shy about it. The wand is in the off hand, held the way somebody holds a pen they are about
    // to make a point with, because it is the only thing he carries (src/sorcery.js).
    spectacles(head, 'Ben’s spectacles', material(0x6f6a60, { metalness: .5, roughness: .38 }),
      material(0xe3ecef, { roughness: .1, metalness: .12 }), { radius: .056, y: .222, z: .204, spread: .072 });
    const wandWood = material(0x4a3524, { roughness: .62 });
    const wand = part(wrists[0], new THREE.CylinderGeometry(.012, .017, .42, 7), wandWood, [0, -.16, .04]);
    wand.name = 'Ben’s wand';
    wand.rotation.x = Math.PI * .46;
    part(wand, new THREE.SphereGeometry(.026, 8, 6), material(0xd8b25a, { emissive: 0x6d3f12, emissiveIntensity: .45 }), [0, .21, 0]);
  }
  if (isVineKeeper) {
    // Steel, and smaller than Troy’s: they are for buds, mites and her own handwriting, and they
    // sit far enough down her nose that she can look over them at whoever is talking.
    spectacles(head, 'Imani’s spectacles', material(0x53575c, { metalness: .62, roughness: .34 }),
      material(0xdfe7ea, { roughness: .12, metalness: .1 }), { radius: .049, y: .214, z: .202, spread: .067 });
  }
  if (slight) {
    body.scale.set(0.92, 0.93, 0.92);
    head.scale.set(0.98 / Math.sqrt(0.92), 0.98 / 0.93, 0.98 / Math.sqrt(0.92));
  }
  if (mercBuild) {
    // Build rides on the hips, not on the root, so the combat view's own
    // group scale (it shrinks the fallen) never flattens a man's proportions.
    // The head is scaled back the other way, so a tall man is not a long face.
    body.scale.set(mercBuild.girth, mercBuild.height, mercBuild.girth);
    head.scale.set(1 / Math.sqrt(mercBuild.girth), 1 / mercBuild.height, 1 / Math.sqrt(mercBuild.girth));
  }
  const { animate: animatePose, setArmed, setShield } = makeAnimator({ body, chest, head, arms, elbows, wrists, legs, knees, ankles, weapon, clothPivot, offset: idleOffset, role });
  let fishing = isPondFisher, selectedWeapon = null;
  const rodTipWorld = new THREE.Vector3();
  /**
   * The three poles, made the first time he holds one. They use the props the hired swords
   * already carry (`makeSpearProp`, `makeStaffProp`) rather than new ones, so a spear in his hand
   * is the spear Ciaran was carrying, and they hang off the same wrist mount as the blades, so
   * they swing with the arm instead of standing planted.
   *
   * **Built on demand, like the buckler**: a figure has a draw-call budget
   * (tests/player-characters.test.js holds it at 34 meshes) and these three are only ever reached
   * by taking one off the ground where its owner fell. A traveler who never does pays nothing.
   */
  /**
   * The bow's own mount, on the **off** hand, made the first time he holds one. Everything else
   * hangs off the right wrist because everything else is swung; a bow is held in the left and
   * drawn with the right, and a bow on the sword hand reads as a man waving a harp about.
   */
  let bowHand = null;
  const LATE_WEAPONS = {
    'ash-spear': mount => makeSpearProp(mount, 'Ash spear', 1.9),
    'war-pike': mount => makeSpearProp(mount, 'War pike', 2.7, .26),
    quarterstaff: mount => makeStaffProp(mount),
    'hunting-bow': () => (heldBow = makeHeldBow(bowHand ??= makeWeaponMount(wrists[0], 'Traveler bow grip'))),
  };
  function setWeapon(id) {
    if (isPlayer && weapon && LATE_WEAPONS[id] && !weapons[id]) weapons[id] = LATE_WEAPONS[id](weapon);
    if (id !== null && !Object.hasOwn(weapons, id)) return false;
    selectedWeapon = id;
    for (const [weaponId, model] of Object.entries(weapons)) model.visible = weaponId === id;
    setArmed(id !== null);
    if (weapon && fishing) weapon.visible = false;
    return true;
  }
  function setFishing(value) {
    if (!fishingGrip) return false;
    fishing = Boolean(value); fishingGrip.visible = fishing; fishingGrip.scale.setScalar(fishing ? 1 : 0);
    if (weapon) weapon.visible = !fishing && selectedWeapon !== null;
    return true;
  }
  function animate(time, speed = 0, grounded = true, pose = {}) {
    if (typeof pose.fishing === 'boolean') setFishing(pose.fishing);
    animatePose(time, speed, grounded, { ...pose, fishing });
    if (weapon && fishing) weapon.visible = false;
    // The shaft goes on the string only while he is actually drawing, so a man standing about
    // with a bow is not standing about with an arrow on it. `pose.draw` is 0 to 1, and is the
    // real draw rather than the button (`combat.drawn`). The traveler's bow is one of the things
    // he can be holding; a hired archer's is the only thing he holds, so it needs no check.
    if (heldBow) {
      const nocked = heldBow.getObjectByName(NOCKED_ARROW);
      const holding = !isPlayer || selectedWeapon === 'hunting-bow';
      if (nocked) nocked.visible = holding && (Number(pose.draw) || 0) > 0;
    }
    if (staff) {
      staff.rotation.x = -(arms[1].rotation.x + elbows[1].rotation.x + chest.rotation.x);
      staff.rotation.z = -(arms[1].rotation.z + elbows[1].rotation.z + chest.rotation.z);
    }
  }
  function fishingTip() {
    if (!fishingRod || !fishing) return null;
    fishingRod.updateWorldMatrix(true, false);
    return rodTipWorld.set(.056, 1.625, 0).applyMatrix4(fishingRod.matrixWorld);
  }
  if (isPlayer || fights) setWeapon('simple-sword');
  if (isMercenary && !isPlayer) setWeapon(KIT_HELD[look?.weapon] ?? null);
  if (fishingGrip) setFishing(isPondFisher);
  return { group, animate, setArmed, setShield, setWeapon, setFishing, fishingTip };
}

/** A scrawny woodland raider: a sunken glare, ragged ears and a wary lope. */
/**
 * A bramble goblin. `wine` makes him Puck, the wine goblin of Solis (src/wine-goblin.js): the
 * same rig, a head shorter, in dark glasses, with a long clay pipe in the corner of his mouth
 * and a bottle in his off hand that is certainly not his. He carries no stick; he has never
 * needed one, and the city has never managed to lay a finger on him anyway.
 */
export function createGoblin({ variant = 0, wine = false } = {}) {
  const variation = Math.abs(Math.floor(Number.isFinite(variant) ? variant : 0)) % 3;
  const group = new THREE.Group();
  group.name = wine ? 'Puck' : `goblin-${variation}`;
  const body = new THREE.Group();
  body.name = 'Weight and hips';
  group.add(body);
  const skin = material([0x61734b, 0x77754b, 0x566e55][variation]);
  const cheeks = material([0x78825a, 0x8c8557, 0x70846a][variation]);
  const grime = material([0x414e34, 0x595538, 0x3e5041][variation]);
  const scarMat = material(0x9e8b70);
  const earInner = material(0x746b50);
  const cloth = material([0x584939, 0x535242, 0x645246][variation]);
  const patch = material(0x837253);
  const leather = material(0x463c30);
  const soleMat = material(0x3e3b2d);
  const hair = material(0x343b2a);
  const dark = material(0x24291c);
  const eyeWhite = material(0xbab073);
  const tooth = material(0xcfc096);
  const legs = [], knees = [], ankles = [], arms = [], elbows = [], wrists = [];

  for (const side of [-1, 1]) {
    const hip = new THREE.Group();
    hip.position.set(side * 0.145, 0.5, -0.012);
    body.add(hip);
    legs.push(hip);
    round(hip, skin, [0, -0.08, 0], [0.08, 0.125, 0.082]);
    part(hip, UNIT_HAIR_LOCK, grime, [side * 0.044, -0.14, 0.059], [0.026, 0.041, 0.014]);
    const knee = new THREE.Group();
    knee.position.y = -0.215;
    hip.add(knee);
    knees.push(knee);
    round(knee, skin, [0, -0.043, 0.015], [0.064, 0.101, 0.066]);
    part(knee, UNIT_HAIR_LOCK, cheeks, [0, 0.01, 0.059], [0.061, 0.046, 0.041]);
    part(knee, UNIT_CYLINDER, leather, [0, -0.109, 0.01], [0.077, 0.037, 0.074]);
    const ankle = new THREE.Group();
    ankle.position.y = -0.18;
    knee.add(ankle);
    ankles.push(ankle);
    round(ankle, skin, [0, -0.031, 0.066], [0.091, 0.065, 0.139]);
    box(ankle, soleMat, [0, -0.077, 0.065], [0.176, 0.035, 0.242]);
    for (const toe of [-0.052, 0, 0.052]) {
      round(ankle, cheeks, [toe, -0.031, 0.173], [0.03, 0.034, 0.04]);
    }
    ribbon(ankle, leather, [-0.087, -0.023, 0.039], [0.087, -0.013, 0.06], 0.035, 0.025);
  }

  round(body, skin, [0, 0.758, -0.014], [0.169, 0.185, 0.116]);
  part(body, UNIT_HAIR_LOCK, skin, [0, 0.92, -0.017], [0.247, 0.144, 0.153]);
  round(body, skin, [0, 0.979, -0.074], [0.157, 0.091, 0.113]);
  for (const side of [-1, 1]) {
    ribbon(body, cheeks, [side * 0.027, 0.939, 0.11], [side * 0.19, 0.973, 0.089], 0.022, 0.016);
    for (let i = 0; i < 3; i++) {
      const rib = box(body, cheeks, [side * (0.089 - i * 0.008), 0.853 - i * 0.048, 0.099], [0.092, 0.012, 0.016]);
      rib.rotation.z = side * 0.21;
    }
  }
  part(body, UNIT_HAIR_LOCK, grime, [0.114, 0.819, 0.096], [0.031, 0.043, 0.012]);
  part(body, new THREE.CylinderGeometry(0.191, 0.24, 0.14, 7), cloth, [0, 0.594, -0.01], [1, 1, 0.7]);
  for (let i = 0; i < 7; i++) {
    const angle = i / 7 * Math.PI * 2;
    const rag = part(body, UNIT_HAIR_LOCK, i % 3 === 0 ? patch : cloth, [Math.cos(angle) * 0.169, 0.521 - (i % 3) * 0.018, Math.sin(angle) * 0.112], [0.087, 0.105 + (i % 2) * 0.025, 0.031]);
    rag.rotation.z = Math.sin(angle) * 0.23;
  }
  part(body, UNIT_CYLINDER, leather, [0, 0.658, 0], [0.202, 0.032, 0.143]);
  const buckle = box(body, patch, [-0.065, 0.66, 0.144], [0.053, 0.044, 0.025]);
  buckle.rotation.z = 0.2;
  ribbon(body, leather, [0.147, 1.009, 0.07], [-0.194, 0.63, 0.151], 0.065);
  ribbon(body, leather, [0.147, 1.009, -0.07], [-0.194, 0.63, -0.135], 0.065);
  box(body, leather, [-0.245, 0.625, -0.048], [0.118, 0.157, 0.134]);
  for (const side of [-1, 1]) {
    const shoulder = new THREE.Group();
    shoulder.position.set(side * 0.251, 0.974, 0.013);
    body.add(shoulder);
    arms.push(shoulder);
    round(shoulder, skin, [side * 0.013, -0.085, 0], [0.072, 0.139, 0.077]);
    part(shoulder, UNIT_HAIR_LOCK, cheeks, [side * 0.017, -0.012, -0.001], [0.08, 0.063, 0.078]);
    if (side < 0) {
      ribbon(shoulder, cloth, [-0.033, 0.027, -0.052], [-0.039, -0.11, 0.054], 0.034, 0.016);
    }
    const elbow = new THREE.Group();
    elbow.position.set(side * 0.015, -0.21, 0);
    shoulder.add(elbow);
    elbows.push(elbow);
    round(elbow, skin, [0, -0.078, 0], [0.058, 0.128, 0.062]);
    part(elbow, UNIT_HAIR_LOCK, grime, [side * 0.029, -0.046, 0.046], [0.019, 0.038, 0.012]);
    part(elbow, UNIT_CYLINDER, leather, [0, -0.152, 0], [0.08, 0.043, 0.08]);
    const wrist = new THREE.Group();
    wrist.position.set(0, -0.229, 0.015);
    elbow.add(wrist);
    wrists.push(wrist);
    round(wrist, skin, [0, 0, 0], [0.085, 0.071, 0.078]);
    round(wrist, cheeks, [-side * 0.061, 0.005, 0.041], [0.038, 0.052, 0.039]);
  }

  const head = new THREE.Group();
  head.name = 'Head';
  head.position.set(0, 1.004, 0.094);
  body.add(head);
  part(head, UNIT_HAIR_LOCK, skin, [0, 0.128, -0.018], [0.223, 0.242, 0.194]);
  part(head, UNIT_HAIR_LOCK, cheeks, [0.011, -0.027, 0.092], [0.178, 0.096, 0.134]);
  part(head, UNIT_HAIR_LOCK, skin, [0.021, -0.067, 0.144], [0.116, 0.045, 0.086]);
  for (const side of [-1, 1]) {
    // Torn notches interrupt the ear outline; the eyes sit deep beneath a
    // heavy inward-sloping brow instead of a wide, round cartoon expression.
    const points = [[0.17, 0.139], [0.327, 0.244], [0.444, 0.232], [0.357, 0.106], [0.312, 0.116], [0.321, 0.076], [0.207, 0.023]];
    const earShape = new THREE.Shape(points.map(([x, y]) => new THREE.Vector2(side * x, y + (side < 0 ? -0.022 * variation : 0))));
    part(head, new THREE.ExtrudeGeometry(earShape, { depth: 0.036, bevelEnabled: false }), skin, [0, 0, -0.034]);
    const inner = part(head, UNIT_HAIR_LOCK, earInner, [side * 0.283, 0.15, 0.012], [0.111, 0.041, 0.014]);
    inner.rotation.z = side * 0.45;
    const cheekbone = part(head, UNIT_HAIR_LOCK, cheeks, [side * 0.14, 0.051, 0.127], [0.077, 0.034, 0.062]);
    cheekbone.rotation.z = side * -0.18;
    part(head, UNIT_HAIR_LOCK, grime, [side * 0.137, 0.016, 0.156], [0.035, 0.041, 0.019]);
    const socket = part(head, UNIT_HAIR_LOCK, dark, [side * 0.083, 0.128, 0.157], [0.072, 0.049, 0.034]);
    socket.rotation.z = side * 0.21;
    const eye = round(head, eyeWhite, [side * 0.084, 0.129, 0.18], [0.043, side < 0 && variation === 2 ? 0.012 : 0.019, 0.011]);
    eye.rotation.z = side * 0.24;
    round(head, dark, [side * 0.079, 0.13, 0.19], [0.009, 0.016, 0.004]);
    const brow = part(head, UNIT_HAIR_LOCK, skin, [side * 0.089, 0.173 + (side < 0 ? 0.006 : 0), 0.165], [0.091, 0.036, 0.041]);
    brow.rotation.z = side * 0.27;
    const browRidge = box(head, hair, [side * 0.091, 0.182, 0.184], [0.105, 0.018, 0.013]);
    browRidge.rotation.z = side * 0.27;
  }
  const nose = part(head, UNIT_HAIR_LOCK, skin, [-0.012, 0.086, 0.217], [0.041, 0.109, 0.091]);
  nose.rotation.set(-0.21, 0, -0.16);
  part(head, UNIT_HAIR_LOCK, cheeks, [-0.023, 0.021, 0.28], [0.042, 0.048, 0.037]);
  round(head, dark, [-0.047, 0.018, 0.269], [0.012, 0.009, 0.01]);
  round(head, dark, [0.004, 0.022, 0.273], [0.01, 0.008, 0.01]);
  const mouth = part(head, UNIT_HAIR_LOCK, dark, [0.013, -0.032, 0.204], [0.141, 0.031, 0.018]);
  mouth.rotation.z = -0.11;
  for (const [x, y, length, tilt] of [[-0.073, -0.019, 0.035, 0.17], [-0.014, -0.017, 0.021, -0.15], [0.047, -0.015, 0.028, 0.21], [0.096, -0.026, 0.044, -0.12]]) {
    const fang = part(head, new THREE.ConeGeometry(0.012, length, 4), tooth, [x, y, 0.219]);
    fang.rotation.z = Math.PI + tilt;
  }
  for (const [x, y, z, size] of [[-0.163, 0.205, 0.087, 0.017], [0.145, 0.261, 0.035, 0.019], [0.179, 0.006, 0.088, 0.012]]) {
    part(head, UNIT_HAIR_LOCK, grime, [x, y, z], [size * 1.5, size, size]);
    round(head, cheeks, [x, y, z + size * 0.65], [size * 0.54, size * 0.55, size * 0.6]);
  }
  ribbon(head, scarMat, [0.124, 0.206, 0.182], [0.141, 0.091, 0.181], 0.009, 0.004);
  for (let i = 0; i < 3; i++) {
    const tuft = part(head, UNIT_HAIR_LOCK, hair, [(i - 1) * 0.053 + 0.024, 0.31 + (i % 2) * 0.006, -0.043], [0.025, 0.073, 0.052]);
    tuft.rotation.z = (i - 2) * -0.31;
  }
  if (variation === 1) {
    part(head, new THREE.TorusGeometry(0.026, 0.006, 4, 9), leather, [-0.333, 0.103, 0.014]);
  }

  if (wine) {
    const lens = material(0x101216, { roughness: .15, metalness: .6 }), brass = material(0xc9a24a, { metalness: .6, roughness: .35 });
    const clay = material(0xd8cbb4), bottleGlass = material(0x24402a, { roughness: .3 }), cork = material(0xb08b56);
    // The glasses: two dark lenses, a bridge between them and an arm back over each ear.
    for (const side of [-1, 1]) {
      const eye = round(head, lens, [side * 0.072, 0.152, 0.146], [0.055, 0.042, 0.021]);
      eye.rotation.y = side * 0.24;
      const arm = box(head, brass, [side * 0.122, 0.152, 0.068], [0.012, 0.009, 0.16]);
      arm.rotation.y = side * 0.2;
    }
    box(head, brass, [0, 0.152, 0.153], [0.062, 0.01, 0.012]);
    // The pipe: a stem out of the corner of his mouth, and a bowl on the end of it.
    const stem = part(head, UNIT_CYLINDER, clay, [0.072, 0.07, 0.172], [0.011, 0.19, 0.011]);
    stem.rotation.set(Math.PI / 2 - 0.42, 0, -0.22);
    const bowl = part(head, UNIT_CYLINDER, clay, [0.112, 0.004, 0.258], [0.028, 0.055, 0.028]);
    bowl.rotation.z = -0.22;
    // A bottle in the off hand, held by the neck, the way somebody holds one they mean to finish.
    const bottle = part(wrists[0], UNIT_CYLINDER, bottleGlass, [0, -0.072, 0.03], [0.036, 0.13, 0.036]);
    bottle.rotation.x = 0.35;
    const neck = part(wrists[0], UNIT_CYLINDER, cork, [0, -0.138, 0.055], [0.016, 0.03, 0.016]);
    neck.rotation.x = 0.35;
    group.scale.setScalar(0.82);
  }
  const chest = addChestPivot(body, legs, 0.69);
  const weapon = makeWeaponMount(wrists[1], 'Raider stick grip');
  if (!wine) makeStick(weapon, true);
  const pivots = [body, chest, head, ...arms, ...elbows, ...wrists, ...legs, ...knees, ...ankles, weapon];
  for (const [kind, joints] of Object.entries({ Shoulder: arms, Elbow: elbows, Wrist: wrists, Hip: legs, Knee: knees, Ankle: ankles })) {
    joints.forEach((joint, i) => { joint.name = `${i ? 'Right' : 'Left'} ${kind}`; });
  }
  batchRigidParts(group, pivots);
  const { animate, setArmed } = makeAnimator({ body, chest, head, arms, elbows, wrists, legs, knees, ankles, weapon, goblin: true, offset: variation * 1.91 + 0.7 });
  return { group, animate, setArmed };
}

/** A grey wolf: long muzzle, high shoulders, a low-slung trot. Paws rest at y=0, forward is +Z. */
export function createWolf({ variant = 0, dog = false } = {}) {
  const variation = Math.abs(Math.floor(Number.isFinite(variant) ? variant : 0)) % 3;
  const group = new THREE.Group();
  group.name = `${dog ? 'dog' : 'wolf'}-${variation}`;
  if (dog) group.scale.setScalar(.82);
  const body = new THREE.Group();
  body.name = 'Weight and hips';
  group.add(body);
  const coat = material((dog ? [0xb98a5a, 0xd8c7a8, 0x6b4d33] : [0x6f6a60, 0x7a7266, 0x5f5b55])[variation]);
  const coatLight = material((dog ? [0xe2cfa8, 0xf0e6d2, 0x9e7b57] : [0x9c968a, 0xa39b8c, 0x8b877f])[variation]);
  const coatDark = material((dog ? [0x8a6238, 0xb9a583, 0x4a3323] : [0x4a4740, 0x514c44, 0x3d3b37])[variation]);
  const noseMat = material(0x1f1c1a), eyeMat = material(0xd9b24a), dark = material(0x24211d);
  const tooth = material(0xe6dcc4), tongue = material(0x9c4a49), pad = material(0x3a332d);
  // One spine pivot carries haunches, barrel and withers, and pitches for the lunge.
  const spine = new THREE.Group();
  spine.name = 'Spine';
  spine.position.set(0, 0.62, 0);
  body.add(spine);
  round(spine, coat, [0, 0.02, -0.24], [0.185, 0.19, 0.25]);
  round(spine, coat, [0, 0.06, 0.02], [0.175, 0.195, 0.32]);
  round(spine, coatLight, [0, -0.06, 0.02], [0.145, 0.125, 0.28]);
  round(spine, coatDark, [0, 0.13, 0], [0.125, 0.095, 0.34]);
  round(spine, coat, [0, 0.1, 0.3], [0.19, 0.21, 0.19]);
  const neck = new THREE.Group();
  neck.name = 'Neck';
  neck.position.set(0, 0.16, 0.38);
  spine.add(neck);
  round(neck, coat, [0, 0.03, 0.08], [0.14, 0.14, 0.17]);
  round(neck, coatLight, [0, -0.07, 0.09], [0.11, 0.1, 0.13]);
  const head = new THREE.Group();
  head.name = 'Head';
  head.position.set(0, 0.1, 0.18);
  neck.add(head);
  round(head, coat, [0, 0.02, 0.02], [0.125, 0.115, 0.145]);
  round(head, coat, [0, -0.02, 0.16], [0.072, 0.066, 0.14]);
  round(head, coatLight, [0, -0.055, 0.15], [0.062, 0.042, 0.12]);
  round(head, noseMat, [0, 0.005, 0.295], [0.03, 0.025, 0.028]);
  const jaw = new THREE.Group();
  jaw.name = 'Jaw';
  jaw.position.set(0, -0.05, 0.08);
  head.add(jaw);
  round(jaw, coatLight, [0, -0.02, 0.11], [0.058, 0.033, 0.12]);
  round(jaw, tongue, [0, -0.005, 0.09], [0.028, 0.012, 0.07]);
  for (const side of [-1, 1]) {
    // A dog's ears hang; a wolf's stand.
    const ear = part(head, UNIT_HAIR_LOCK, coatDark, [side * (dog ? 0.09 : 0.072), dog ? 0.06 : 0.125, dog ? -0.01 : -0.03], dog ? [0.03, 0.09, 0.05] : [0.04, 0.075, 0.03]);
    ear.rotation.z = side * (dog ? 0.45 : -0.25);
    part(head, UNIT_HAIR_LOCK, coatLight, [side * 0.072, 0.12, -0.02], [0.02, 0.045, 0.012]);
    round(head, eyeMat, [side * 0.06, 0.045, 0.105], [0.022, 0.018, 0.012]);
    round(head, dark, [side * 0.06, 0.045, 0.115], [0.009, 0.01, 0.006]);
    if (!dog) for (const [z, length] of [[0.19, 0.03], [0.23, 0.022]]) {
      const fang = part(head, new THREE.ConeGeometry(0.008, length, 4), tooth, [side * 0.034, -0.052, z]);
      fang.rotation.z = Math.PI;
    }
  }
  const tail = new THREE.Group();
  tail.name = 'Tail';
  tail.position.set(0, 0.08, -0.44);
  spine.add(tail);
  ribbon(tail, coat, [0, 0, 0], [0, -0.1, -0.26], 0.07, 0.07);
  round(tail, coatLight, [0, -0.11, -0.28], [0.05, 0.05, 0.07]);
  // Four legs: an upper pivot at the body and a lower one at the wrist or hock.
  const legs = [], knees = [];
  for (const [name, side, z] of [['Left Fore', -1, 0.28], ['Right Fore', 1, 0.28], ['Left Hind', -1, -0.28], ['Right Hind', 1, -0.28]]) {
    const hip = new THREE.Group();
    hip.name = `${name} Hip`;
    hip.position.set(side * 0.115, 0.6, z);
    body.add(hip);
    legs.push(hip);
    round(hip, coat, [0, -0.1, z > 0 ? 0 : -0.02], [0.068, 0.16, z > 0 ? 0.08 : 0.11]);
    const knee = new THREE.Group();
    knee.name = `${name} Knee`;
    knee.position.set(0, -0.26, 0);
    hip.add(knee);
    knees.push(knee);
    round(knee, coat, [0, -0.12, 0.01], [0.045, 0.16, 0.05]);
    round(knee, coatDark, [0, -0.3, 0.035], [0.05, 0.035, 0.08]);
    box(knee, pad, [0, -0.325, 0.035], [0.08, 0.012, 0.13]);
  }
  batchRigidParts(group, [body, spine, neck, head, jaw, tail, ...legs, ...knees]);
  const { animate } = makeWolfAnimator({ body, spine, neck, head, jaw, tail, legs, knees, offset: variation * 2.3 + 0.4, dog });
  return { group, animate, setArmed: () => {} };
}

/**
 * Mallec, the ogre who holds the Amod road at the pass stones (src/amod-ogre.js).
 *
 * Half the size of a rock troll and built on a person's plan rather than a boulder's: he
 * stands upright, his legs are as long as his body, his head sits on a neck, and his arms
 * end at his thighs and not past his knees. He is still nobody's idea of a man — a head and
 * a half over a tall one, twice the width, with a jaw that shuts wrong, an underbite with
 * two tusks in it, a brow like a lintel and hands that could close round a cartwheel — but
 * the shape a traveler reads at fifty paces is a person, which is the point of him. He
 * takes three copper and gives change in conversation.
 *
 * The rig is the traveler's own (hip at .74, knee at -.325, ankle at -.29), so the analytic
 * foot solver in `makeAnimator` works on him without the goblin's shortened legs. The figure
 * is scaled inside an outer group so a death fade can scale the group without flattening him.
 *
 * He wears what a creature who sits outdoors for two generations wears: a leather kilt, a
 * belt with the tally board on it and the bowl the copper goes in, and sacking over one
 * shoulder against the rain. The beam with the terrace stone lashed to the end leans where
 * he can reach it and is not in his hands, because he is not expecting to need it.
 */
export function createOgre({ scale = 1.8 } = {}) {
  const group = new THREE.Group();
  group.name = 'ogre';
  const figure = new THREE.Group();
  figure.name = 'Ogre figure';
  figure.scale.setScalar(scale);
  group.add(figure);
  const body = new THREE.Group();
  body.name = 'Weight and hips';
  figure.add(body);

  const hide = material(0x87805f), belly = material(0x9a9270), grime = material(0x6a654c);
  const cloth = material(0x7a6647), leather = material(0x584833), patch = material(0x8a7a58);
  const horn = material(0xcfc4a0), dark = material(0x231f1a), eyeWhite = material(0xc9b47a);
  const stoneMat = material(0xa9a289), nail = material(0xb8ad86);
  const legs = [], knees = [], ankles = [], arms = [], elbows = [], wrists = [];

  // Legs on the traveler's plan, thickened: the solver's lengths, an ogre's meat.
  for (const side of [-1, 1]) {
    const hip = new THREE.Group();
    hip.position.set(side * 0.16, 0.74, 0);
    body.add(hip);
    legs.push(hip);
    round(hip, hide, [0, -0.17, 0], [0.135, 0.2, 0.14]);
    part(hip, UNIT_CYLINDER, cloth, [0, -0.02, 0], [0.155, 0.16, 0.15]);
    const knee = new THREE.Group();
    knee.position.y = -0.325;
    hip.add(knee);
    knees.push(knee);
    round(knee, hide, [0, -0.02, 0.012], [0.115, 0.12, 0.12]);
    round(knee, hide, [0, -0.17, 0], [0.105, 0.155, 0.11]);
    const ankle = new THREE.Group();
    ankle.position.y = -0.29;
    knee.add(ankle);
    ankles.push(ankle);
    round(ankle, hide, [0, -0.02, 0.05], [0.115, 0.065, 0.145]);
    box(ankle, grime, [0, -0.062, 0.055], [0.22, 0.032, 0.25]);
    for (const toe of [-0.068, 0, 0.068]) round(ankle, belly, [toe, -0.028, 0.16], [0.04, 0.04, 0.045]);
  }

  // A heavy trunk that still reads as a chest over a gut, not a boulder on legs.
  part(body, UNIT_HAIR_LOCK, belly, [0, 0.93, 0.045], [0.33, 0.28, 0.29]);
  part(body, UNIT_CYLINDER, leather, [0, 0.79, 0], [0.235, 0.075, 0.205]);    // the belt
  // A kilt of hide, cut to hang: a box here reads as a slab of night across his middle.
  part(body, new THREE.CylinderGeometry(0.225, 0.3, 0.34, 9), cloth, [0, 0.61, 0.01], [1, 1, 0.86]);
  for (const side of [-1, 1]) ribbon(body, leather, [side * 0.1, 0.79, 0.17], [side * 0.13, 0.47, 0.15], 0.03, 0.02);
  const chest = new THREE.Group();
  chest.name = 'Chest';
  chest.position.set(0, 1.06, 0);
  body.add(chest);
  part(chest, UNIT_HAIR_LOCK, hide, [0, 0.1, -0.01], [0.41, 0.28, 0.32]);
  for (const side of [-1, 1]) part(chest, UNIT_HAIR_LOCK, hide, [side * 0.2, 0.18, -0.01], [0.2, 0.17, 0.22]);
  // Sacking over the right shoulder; the tally board and the bowl on the left of the belt.
  ribbon(chest, patch, [0.08, 0.3, 0.06], [0.28, -0.04, 0.09], 0.16, 0.05);
  // A group, not a mesh: hanging the tick marks off a scaled board would scale them with it.
  const tally = new THREE.Group(); tally.name = 'Mallec’s tally';
  tally.position.set(-0.24, 0.74, 0.14); tally.rotation.z = 0.2; body.add(tally);
  box(tally, patch, [0, 0, 0], [0.14, 0.2, 0.03]);
  for (const mark of [-0.04, 0, 0.04]) box(tally, dark, [mark, 0.01, 0.02], [0.012, 0.13, 0.01]);
  part(body, new THREE.CylinderGeometry(0.1, 0.085, 0.08, 8), grime, [0.24, 0.76, 0.12]);

  // Arms: thick, but they stop at the thigh.
  for (const side of [-1, 1]) {
    const shoulder = new THREE.Group();
    shoulder.position.set(side * 0.3, 1.26, 0);
    body.add(shoulder);
    arms.push(shoulder);
    round(shoulder, hide, [side * 0.02, -0.12, 0], [0.13, 0.2, 0.135]);
    const elbow = new THREE.Group();
    elbow.position.set(side * 0.02, -0.3, 0);
    shoulder.add(elbow);
    elbows.push(elbow);
    round(elbow, hide, [0, -0.13, 0], [0.105, 0.185, 0.11]);
    const wrist = new THREE.Group();
    wrist.position.set(0, -0.3, 0.015);
    elbow.add(wrist);
    wrists.push(wrist);
    round(wrist, hide, [0, -0.05, 0.02], [0.12, 0.105, 0.115]);
    for (let f = 0; f < 3; f++) round(wrist, belly, [(f - 1) * 0.055, -0.13, 0.055], [0.03, 0.06, 0.034]);
    round(wrist, belly, [-side * 0.08, -0.06, 0.05], [0.04, 0.055, 0.04]);
  }

  // A neck, and a head on top of it: the single clearest difference from the troll.
  const head = new THREE.Group();
  head.name = 'Head';
  head.position.set(0, 1.4, 0.02);
  body.add(head);
  part(head, UNIT_CYLINDER, hide, [0, -0.06, 0], [0.13, 0.09, 0.13]);
  part(head, UNIT_HAIR_LOCK, hide, [0, 0.09, -0.01], [0.23, 0.21, 0.22]);
  // The brow is a lintel; the eyes are under it and small.
  part(head, UNIT_BOX, hide, [0, 0.11, 0.15], [0.33, 0.07, 0.11]);
  for (const side of [-1, 1]) {
    round(head, eyeWhite, [side * 0.075, 0.065, 0.15], [0.032, 0.026, 0.02]);
    round(head, dark, [side * 0.078, 0.062, 0.166], [0.014, 0.016, 0.01]);
    round(head, hide, [side * 0.2, 0.06, -0.02], [0.05, 0.075, 0.03]);       // ears, one of them wrong
  }
  round(head, belly, [0, 0.02, 0.19], [0.07, 0.06, 0.06]);                    // the nose
  // The jaw shuts wrong, and two tusks come up out of it.
  const jaw = part(head, UNIT_HAIR_LOCK, hide, [0, -0.07, 0.13], [0.2, 0.11, 0.15]);
  jaw.rotation.x = 0.12;
  box(head, dark, [0, -0.04, 0.2], [0.17, 0.035, 0.03]);
  for (const side of [-1, 1]) {
    const tusk = part(head, new THREE.ConeGeometry(0.028, 0.12, 5), horn, [side * 0.072, 0.012, 0.185]);
    tusk.rotation.set(-0.25, 0, side * 0.12);
  }
  for (const side of [-1, 1]) round(head, grime, [side * 0.09, 0.21, -0.03], [0.055, 0.04, 0.05]);

  // The beam stands by him rather than in his hands: he is not expecting to need it.
  const weapon = new THREE.Group();
  weapon.name = 'Weapon';
  wrists[1].add(weapon);
  weapon.position.set(0, -0.13, 0.05);
  const beam = new THREE.Group();
  beam.name = 'Mallec’s beam';
  weapon.add(beam);
  part(beam, UNIT_CYLINDER, patch, [0, -0.35, 0], [0.048, 1.0, 0.048]);
  part(beam, UNIT_BOX, stoneMat, [0, -0.82, 0.01], [0.17, 0.2, 0.15]);
  for (const band of [-0.72, -0.9]) ribbon(beam, leather, [-0.09, band, 0.01], [0.09, band, 0.01], 0.02, 0.018);
  part(beam, UNIT_CYLINDER, nail, [0, 0.16, 0], [0.026, 0.06, 0.026]);

  const pivots = [body, chest, head, ...arms, ...elbows, ...wrists, ...legs, ...knees, ...ankles, weapon];
  for (const [kind, joints] of Object.entries({ Shoulder: arms, Elbow: elbows, Wrist: wrists, Hip: legs, Knee: knees, Ankle: ankles })) {
    joints.forEach((joint, i) => { joint.name = `${i ? 'Right' : 'Left'} ${kind}`; });
  }
  batchRigidParts(group, pivots);
  const { animate, setArmed } = makeAnimator({ body, chest, head, arms, elbows, wrists, legs, knees, ankles, weapon, offset: 1.4 });
  return { group, animate, setArmed, figure, scale };
}

/** A friendly village dog: the wolf's rig with hanging ears, a lighter coat, no fangs and a tail that will not stop. */
export function createDog(options = {}) { return createWolf({ ...options, dog: true }); }

/**
 * A harbour cat: a small striped tabby with a white chest and white feet, a
 * quarter of a metre at the shoulder. Paws rest at y=0, forward is +Z. Its
 * poses come from `pose.posture`: nap, sit, groom, walk, crouch, pounce, eat,
 * rub, low (see src/village-cat.js).
 */
export function createCat({ variant = 0 } = {}) {
  const variation = Math.abs(Math.floor(Number.isFinite(variant) ? variant : 0)) % 2;
  const group = new THREE.Group();
  group.name = `cat-${variation}`;
  const body = new THREE.Group();
  body.name = 'Weight and hips';
  group.add(body);
  const coat = material([0xc8843f, 0x8c8478][variation]);
  const stripe = material([0x8a4f22, 0x4f4a44][variation]);
  const light = material(0xf1e6d4), eyeMat = material(0x9dbb4a), dark = material(0x1c1a18), nose = material(0xc98b86);
  const spine = new THREE.Group();
  spine.name = 'Spine';
  spine.position.set(0, 0.2, 0);
  body.add(spine);
  round(spine, coat, [0, 0.02, -0.14], [0.088, 0.088, 0.1]);
  round(spine, coat, [0, 0.025, -0.02], [0.08, 0.085, 0.17]);
  round(spine, coat, [0, 0.02, 0.1], [0.078, 0.082, 0.09]);
  round(spine, light, [0, -0.025, 0.12], [0.06, 0.06, 0.06]);
  round(spine, light, [0, -0.045, 0.0], [0.055, 0.035, 0.13]);
  // Tabby bands: thin shells a hair wider than the barrel, so they wrap the back and flanks and the white belly covers their ends.
  for (const [z, girth] of [[-0.17, 0.09], [-0.11, 0.086], [-0.05, 0.084], [0.01, 0.084], [0.07, 0.083]]) round(spine, stripe, [0, 0.045, z], [girth, 0.072, 0.014]);
  const neck = new THREE.Group();
  neck.name = 'Neck';
  neck.position.set(0, 0.06, 0.16);
  spine.add(neck);
  round(neck, coat, [0, 0.02, 0.02], [0.05, 0.055, 0.055]);
  round(neck, light, [0, -0.02, 0.035], [0.04, 0.04, 0.04]);
  const head = new THREE.Group();
  head.name = 'Head';
  head.position.set(0, 0.06, 0.05);
  neck.add(head);
  round(head, coat, [0, 0, 0], [0.066, 0.058, 0.06]);
  round(head, coat, [0, -0.018, 0.018], [0.072, 0.042, 0.048]);
  round(head, light, [0, -0.026, 0.05], [0.034, 0.024, 0.024]);
  round(head, nose, [0, -0.012, 0.072], [0.009, 0.007, 0.005]);
  round(head, stripe, [0, 0.05, 0.012], [0.03, 0.012, 0.03]);
  const ear = new THREE.ConeGeometry(1, 1, 4);
  for (const side of [-1, 1]) {
    const outer = part(head, ear, coat, [side * 0.04, 0.065, -0.008], [0.026, 0.05, 0.016]);
    outer.rotation.set(0, Math.PI / 4, -side * 0.28);
    const inner = part(head, ear, nose, [side * 0.039, 0.062, -0.0], [0.014, 0.034, 0.008]);
    inner.rotation.set(0, Math.PI / 4, -side * 0.28);
    round(head, eyeMat, [side * 0.028, 0.012, 0.05], [0.014, 0.012, 0.008]);
    round(head, dark, [side * 0.028, 0.012, 0.056], [0.0035, 0.011, 0.004]);
    for (const tilt of [-0.12, 0.12]) {
      const whisker = ribbon(head, light, [side * 0.02, -0.02, 0.06], [side * 0.075, -0.02 + tilt * 0.12, 0.07], 0.003, 0.003);
      whisker.name = 'Whisker';
    }
  }
  // Two tail pivots: the base carries it up or round the feet, the tip hooks and twitches.
  const tail = new THREE.Group();
  tail.name = 'Tail';
  tail.position.set(0, 0.05, -0.22);
  // Tilt first, then sweep: a tail laid round the feet is lowered and then swung aside.
  tail.rotation.order = 'YXZ';
  spine.add(tail);
  for (let i = 0; i < 4; i++) round(tail, i % 2 ? stripe : coat, [0, 0, -0.025 - i * 0.042], [0.021, 0.021, 0.03]);
  const tailTip = new THREE.Group();
  tailTip.name = 'Tail Tip';
  tailTip.position.set(0, 0, -0.17);
  tailTip.rotation.order = 'YXZ';
  tail.add(tailTip);
  for (let i = 0; i < 4; i++) round(tailTip, i % 2 ? stripe : coat, [0, 0, -0.022 - i * 0.04], [0.019 - i * 0.002, 0.019 - i * 0.002, 0.028]);
  round(tailTip, stripe, [0, 0, -0.175], [0.013, 0.013, 0.02]);
  const legs = [], knees = [];
  for (const [name, side, z] of [['Left Fore', -1, 0.12], ['Right Fore', 1, 0.12], ['Left Hind', -1, -0.13], ['Right Hind', 1, -0.13]]) {
    const hip = new THREE.Group();
    hip.name = `${name} Hip`;
    hip.position.set(side * 0.05, 0.2, z);
    body.add(hip);
    legs.push(hip);
    round(hip, coat, [0, -0.045, z > 0 ? 0 : -0.01], [0.03, 0.065, z > 0 ? 0.032 : 0.045]);
    const knee = new THREE.Group();
    knee.name = `${name} Knee`;
    knee.position.set(0, -0.1, 0);
    hip.add(knee);
    knees.push(knee);
    round(knee, coat, [0, -0.045, 0.004], [0.02, 0.055, 0.022]);
    round(knee, light, [0, -0.088, 0.014], [0.023, 0.013, 0.03]);
  }
  batchRigidParts(group, [body, spine, neck, head, tail, tailTip, ...legs, ...knees]);
  const { animate } = makeCatAnimator({ body, spine, neck, head, tail, tailTip, legs, knees, offset: variation * 1.7 + 0.3 });
  return { group, animate, setArmed: () => {} };
}

// Every pose a cat holds still in, as spine, neck, head, tail and leg angles.
// Legs are [left fore, right fore, left hind, right hind]; a positive hip swings the paw back.
const CAT_STAND = Object.freeze({ spineX: 0, spineY: 0, spineZ: 0, neckX: 0.05, headX: 0, tailX: 0.75, tailY: 0, tipX: 0.55, hips: [0, 0, 0, 0], knees: [0, 0, 0, 0] });
const CAT_SIT = Object.freeze({ spineX: -0.55, spineY: -0.02, spineZ: 0, neckX: 0.3, headX: 0.15, tailX: -0.35, tailY: 1.2, tipX: 0.25, tipY: 1.1,
    hips: [0.3, 0.3, -1.05, -1.05], knees: [-0.25, -0.25, 2.1, 2.1] });
const CAT_POSES = Object.freeze({
  stand: CAT_STAND, walk: CAT_STAND,
  sit: CAT_SIT,
  groom: CAT_SIT,
  nap: { spineX: 0, spineY: -0.1, spineZ: 0.3, neckX: 0.75, headX: 0.35, headY: 0.85, tailX: -0.85, tailY: -2.2, tipX: 0.55, tipY: -1.3,
    hips: [-1.35, -1.35, -1.1, -1.1], knees: [2.5, 2.5, 2.3, 2.3] },
  eat: { spineX: 0.12, spineY: -0.01, spineZ: 0, neckX: 1.0, headX: 0.35, tailX: 0.15, tailY: 0, tipX: 0.6, hips: [0.15, 0.15, 0.1, 0.1], knees: [-0.2, -0.2, 0.25, 0.25] },
  crouch: { spineX: 0.05, spineY: -0.07, spineZ: 0, neckX: 0.3, headX: -0.3, tailX: -0.05, tailY: 0, tipX: 0.1,
    hips: [-0.55, -0.55, -0.6, -0.6], knees: [1.1, 1.1, 1.2, 1.2] },
  pounce: { spineX: -0.3, spineY: 0.03, spineZ: 0, neckX: -0.1, headX: -0.1, tailX: 0.15, tailY: 0, tipX: 0, hips: [-1.2, -1.2, 0.9, 0.9], knees: [0.3, 0.3, -0.2, -0.2] },
  low: { spineX: 0.02, spineY: -0.05, spineZ: 0, neckX: 0.25, headX: -0.1, tailX: -0.3, tailY: 0, tipX: 0, hips: [-0.35, -0.35, -0.4, -0.4], knees: [0.7, 0.7, 0.8, 0.8] },
  rub: { spineX: 0, spineY: -0.01, spineZ: 0.12, neckX: 0.15, headX: 0.1, headY: 0.35, tailX: 1.45, tailY: 0, tipX: 0.6, hips: [0, 0, 0, 0], knees: [0, 0, 0, 0] },
});

function makeCatAnimator({ body, spine, neck, head, tail, tailTip, legs, knees, offset = 0 }) {
  let stridePhase = offset, lastTime, movementBlend = 0;
  const lerp = THREE.MathUtils.lerp;
  function animate(time, speed = 0, grounded = true, pose = {}) {
    const seconds = Number.isFinite(time) ? time : 0;
    const dt = lastTime === undefined ? 1 / 60 : THREE.MathUtils.clamp(seconds - lastTime, 0, 0.1);
    lastTime = seconds;
    const pace = Math.max(0, Number.isFinite(speed) ? speed : 0);
    // A cat that is still sitting when it has to move gets up and walks.
    let posture = CAT_POSES[pose.posture] ? pose.posture : 'stand';
    if (pace > 0.15 && ['sit', 'nap', 'groom', 'eat'].includes(posture)) posture = 'walk';
    const held = CAT_POSES[posture];
    movementBlend = lerp(movementBlend, grounded ? THREE.MathUtils.clamp(pace / 0.9, 0, 1) : 0, 1 - Math.exp(-10 * dt));
    stridePhase += dt * (6 + Math.min(pace, 7) * 2.6);
    const still = 1 - movementBlend, breath = Math.sin(seconds * (posture === 'nap' ? 1.3 : 2.6) + offset);
    const hip = [], knee = [];
    for (let i = 0; i < 4; i++) {
      // A walk: diagonal pairs together, left fore with right hind; the pounce and the crouch keep their legs.
      const phase = stridePhase + (i === 0 || i === 3 ? 0 : Math.PI), fore = i < 2;
      const swing = posture === 'pounce' ? 0 : movementBlend;
      hip[i] = held.hips[i] + Math.sin(phase) * (fore ? 0.5 : 0.55) * swing;
      knee[i] = held.knees[i] + Math.max(0, Math.sin(phase + 0.6)) * (fore ? 0.8 : 0.5) * swing - (fore ? 0 : 0.2) * swing;
    }
    let spineX = held.spineX, spineZ = held.spineZ, neckX = held.neckX + breath * 0.01, headX = held.headX;
    let headY = (held.headY ?? 0) + (posture === 'sit' || posture === 'stand' ? Math.sin(seconds * 0.4 + offset) * 0.45 * still : 0);
    let tailX = held.tailX, tailY = (held.tailY ?? 0), tipX = held.tipX, tipY = held.tipY ?? 0;
    // The tail talks: a slow sway standing, a flick of the tip hunting, a quiver rubbing.
    if (posture === 'stand' || posture === 'walk') { tailY += Math.sin(seconds * 1.3 + offset) * 0.3; tipY += Math.sin(seconds * 2.1 + offset) * 0.35; }
    if (posture === 'crouch') tipY += Math.sin(seconds * 9 + offset) * 0.5;
    if (posture === 'sit') tipX += Math.max(0, Math.sin(seconds * 0.9 + offset)) * 0.5;
    if (posture === 'rub') { tipY += Math.sin(seconds * 14) * 0.08; spineZ *= Math.sin(seconds * 1.7); }
    if (posture === 'groom') {
      // One forepaw up to the face; the head works at it.
      hip[0] = -1.15; knee[0] = 1.5;
      neckX = 0.65; headX = 0.25 + Math.sin(seconds * 9) * 0.12; headY = 0.25;
    }
    if (posture === 'eat') headX += Math.max(0, Math.sin(seconds * 7)) * 0.12;
    const spineY = held.spineY + breath * (posture === 'nap' ? 0.004 : 0.002) + Math.abs(Math.cos(stridePhase)) * 0.01 * movementBlend;
    const damping = 1 - Math.exp(-(posture === 'pounce' || posture === 'low' ? 22 : 9) * dt);
    const rotate = (object, x, y, z) => {
      object.rotation.x = lerp(object.rotation.x, x, damping);
      object.rotation.y = lerp(object.rotation.y, y, damping);
      object.rotation.z = lerp(object.rotation.z, z, damping);
    };
    rotate(spine, spineX, 0, spineZ);
    rotate(neck, neckX, 0, -spineZ * 0.5);
    rotate(head, headX, headY, 0);
    rotate(tail, tailX, tailY, 0);
    rotate(tailTip, tipX, tipY, 0);
    for (let i = 0; i < 4; i++) { rotate(legs[i], hip[i], 0, 0); rotate(knees[i], knee[i], 0, 0); }
    spine.position.y = lerp(spine.position.y, 0.2 + spineY, damping);
    body.position.y = lerp(body.position.y, 0, damping);
  }
  return { animate };
}

// A quadruped gait and the same action vocabulary as the two-legged animator:
// idle, windup (a crouch), attack (a lunge with the jaws), hurt, dead.
function makeWolfAnimator({ body, spine, neck, head, jaw, tail, legs, knees, offset = 0, dog = false }) {
  let stridePhase = offset, lastTime, movementBlend = 0;
  const lerp = THREE.MathUtils.lerp;
  function animate(time, speed = 0, grounded = true, pose = {}) {
    const seconds = Number.isFinite(time) ? time : 0;
    const dt = lastTime === undefined ? 1 / 60 : THREE.MathUtils.clamp(seconds - lastTime, 0, 0.1);
    lastTime = seconds;
    const pace = Math.max(0, Number.isFinite(speed) ? speed : 0);
    const action = pose.action || 'idle';
    const progress = THREE.MathUtils.clamp(Number.isFinite(pose.progress) ? pose.progress : 0, 0, 1);
    const alert = pose.alert ? 1 : 0;
    const damping = 1 - Math.exp(-(action === 'attack' || action === 'hurt' ? 26 : 14) * dt);
    movementBlend = lerp(movementBlend, grounded && action !== 'dead' ? THREE.MathUtils.clamp(pace / 1.4, 0, 1) : 0, 1 - Math.exp(-10 * dt));
    stridePhase += dt * (5.2 + Math.min(pace, 7) * 1.9);
    const idle = 1 - movementBlend, breath = Math.sin(seconds * 2.4 + offset);
    // A trot: diagonal pairs move together, left fore with right hind.
    const hip = [], knee = [];
    for (let i = 0; i < 4; i++) {
      const phase = stridePhase + (i === 0 || i === 3 ? 0 : Math.PI), fore = i < 2;
      hip[i] = Math.sin(phase) * (fore ? 0.55 : 0.6) * movementBlend + (fore ? -0.03 : 0.28) * idle;
      knee[i] = (fore ? 0.08 : -0.4) * idle + Math.max(0, Math.sin(phase + 0.6)) * (fore ? 0.9 : 0.5) * movementBlend - (fore ? 0 : 0.35) * movementBlend;
    }
    let spineX = alert * 0.05 + movementBlend * 0.04, spineZ = 0;
    let neckX = -0.35 - alert * 0.3 + breath * 0.01, headX = 0.15 + alert * 0.1;
    let headY = Math.sin(seconds * 0.5 + offset) * 0.35 * idle * (1 - alert * 0.7);
    // A dog carries its tail high and wags it; a wolf drops it when alert.
    let jawX = 0, tailX = dog ? -0.55 : 0.4 - alert * 0.9, tailY = dog ? Math.sin(seconds * 7 + offset) * 0.55 : Math.sin(seconds * 3.1 + offset) * 0.25 * idle * (1 - alert);
    if (dog && pose.sitting) { spineX = -0.25; neckX = -0.25; headX = 0.05; }
    let bodyY = 0, bodyZ = 0;
    if (action === 'windup') {
      const crouch = THREE.MathUtils.smoothstep(progress, 0, 0.8);
      spineX = -0.12 * crouch; bodyY = -0.1 * crouch; neckX = -0.15 - crouch * 0.25; headX = 0.35 * crouch; jawX = 0.35 * crouch; tailX = -0.5;
      for (let i = 0; i < 4; i++) { hip[i] = i < 2 ? 0.35 * crouch : 0.28 + 0.25 * crouch; knee[i] = i < 2 ? -0.3 * crouch : -0.4 - 0.3 * crouch; }
    } else if (action === 'attack') {
      const lunge = samplePose(progress, [[0, 0], [0.3, 1], [0.6, 0.8], [1, 0]]);
      spineX = 0.28 * lunge; bodyY = 0.16 * lunge; neckX = -0.2 + lunge * 0.3; headX = -0.1; tailX = -0.3;
      jawX = samplePose(progress, [[0, 0.4], [0.35, 0.05], [0.6, 0.45], [1, 0]]);
      for (let i = 0; i < 4; i++) { hip[i] = i < 2 ? -0.9 * lunge : 0.28 + 0.5 * lunge; knee[i] = i < 2 ? 0.2 : -0.4 - 0.3 * lunge; }
    } else if (action === 'hurt') {
      const recoil = Math.sin(Math.min(progress * 1.55, 1) * Math.PI);
      spineX = -0.14 * recoil; spineZ = 0.18 * recoil; neckX = -0.6 * recoil; headX = 0.4 * recoil; jawX = 0.3 * recoil; tailX = -0.6;
    } else if (action === 'dead') {
      const fall = THREE.MathUtils.smoothstep(progress, 0, 0.8);
      bodyZ = (offset > 2 ? -1 : 1) * fall * 1.45; bodyY = 0.12 * fall; neckX = -0.1; headX = 0.3; jawX = 0.2; tailX = -0.2;
      for (let i = 0; i < 4; i++) { hip[i] = i < 2 ? -0.4 : 0.5; knee[i] = i < 2 ? 0.3 : -0.6; }
    }
    const rotate = (object, x, y, z) => {
      object.rotation.x = lerp(object.rotation.x, x, damping);
      object.rotation.y = lerp(object.rotation.y, y, damping);
      object.rotation.z = lerp(object.rotation.z, z, damping);
    };
    rotate(spine, spineX, 0, spineZ);
    rotate(neck, neckX, 0, -spineZ * 0.5);
    rotate(head, headX, headY, 0);
    rotate(jaw, jawX, 0, 0);
    rotate(tail, tailX, tailY, 0);
    for (let i = 0; i < 4; i++) { rotate(legs[i], hip[i], 0, 0); rotate(knees[i], knee[i], 0, 0); }
    rotate(body, 0, Math.sin(stridePhase) * 0.02 * movementBlend, bodyZ);
    const bob = breath * 0.004 * idle + Math.abs(Math.cos(stridePhase)) * 0.03 * movementBlend;
    body.position.y = lerp(body.position.y, bodyY + bob, 1 - Math.exp(-22 * dt));
  }
  return { animate };
}

/**
 * A riding horse for the army's lines and the road: bay, chestnut or grey,
 * saddled or bare. Hooves rest at y=0, forward is +Z, the withers at 1.5 m.
 * It idles and walks; riding is a later mechanic, so there is no rider seat yet.
 */
/**
 * The coats a horse can wear. The first three are the country's, picked by `variant`;
 * `developer` is the testing panel's mount and is meant to be unmistakable, so that a fast
 * horse can never be confused with the bay gelding the army gives you.
 */
export const HORSE_COATS = Object.freeze({
  developer: Object.freeze({ coat: 0x4a3470, light: 0x5f4690, points: 0x201639, mane: 0xd8bff5 }),
  // The natural coats, for the company's remounts (src/company-horses.js). The first three are
  // the unnamed country coats below, given the names they always had; black, dun and roan are
  // the rest of what an army stable turns out. No markings and no names: these are remounts.
  bay: Object.freeze({ coat: 0x6b4a32, light: 0x7d5a3f, points: 0x2f241c, mane: 0x2a201a }),
  chestnut: Object.freeze({ coat: 0x9a5a34, light: 0xad6f45, points: 0x4a3324, mane: 0x3d2a1e }),
  grey: Object.freeze({ coat: 0xb9b3a6, light: 0xcac5ba, points: 0x8c877d, mane: 0xd9d4c9 }),
  black: Object.freeze({ coat: 0x2e2a28, light: 0x3c3735, points: 0x1a1716, mane: 0x171413 }),
  dun: Object.freeze({ coat: 0xc2a778, light: 0xd4bc92, points: 0x4f4034, mane: 0x3a2f26 }),
  roan: Object.freeze({ coat: 0x8f7d74, light: 0xa8988e, points: 0x4a3f39, mane: 0x574b44 }),
});
const COUNTRY_COATS = Object.freeze([
  Object.freeze({ coat: 0x6b4a32, light: 0x7d5a3f, points: 0x2f241c, mane: 0x2a201a }),
  Object.freeze({ coat: 0x9a5a34, light: 0xad6f45, points: 0x4a3324, mane: 0x3d2a1e }),
  Object.freeze({ coat: 0xb9b3a6, light: 0xcac5ba, points: 0x8c877d, mane: 0xd9d4c9 }),
]);
export function createHorse({ variant = 0, saddled = false, coat: coatName = null } = {}) {
  const variation = Math.abs(Math.floor(Number.isFinite(variant) ? variant : 0)) % 3;
  const paint = HORSE_COATS[coatName] ?? COUNTRY_COATS[variation];
  const group = new THREE.Group();
  group.name = `horse-${coatName ?? variation}${saddled ? '-saddled' : ''}`;
  const body = new THREE.Group();
  body.name = 'Weight and hips';
  group.add(body);
  const coat = material(paint.coat);
  const coatLight = material(paint.light);
  const points = material(paint.points);
  const mane = material(paint.mane);
  const hoof = material(0x3a3129), eyeMat = material(0x1d1815), leather = material(0x5b4130), blanket = material(0x8f3b30), brass = material(0xc8a250, { metalness: 0.28, roughness: 0.52 });
  const spine = new THREE.Group();
  spine.name = 'Spine';
  spine.position.set(0, 1.0, 0);
  body.add(spine);
  round(spine, coat, [0, 0.02, -0.5], [0.29, 0.33, 0.42]);
  round(spine, coat, [0, 0.04, 0.02], [0.3, 0.34, 0.62]);
  round(spine, coatLight, [0, -0.12, 0.05], [0.24, 0.2, 0.5]);
  round(spine, coat, [0, 0.12, 0.5], [0.27, 0.34, 0.34]);
  round(spine, coat, [0, 0.3, 0.4], [0.16, 0.14, 0.24]);
  const neck = new THREE.Group();
  neck.name = 'Neck';
  neck.position.set(0, 0.22, 0.55);
  spine.add(neck);
  const neckCore = part(neck, new THREE.CylinderGeometry(0.11, 0.17, 0.62, 8), coat, [0, 0.26, 0.2]);
  neckCore.rotation.x = 0.66;
  for (let i = 0; i < 6; i++) {
    const t = i / 5;
    const lock = part(neck, UNIT_HAIR_LOCK, mane, [(i % 2 ? .02 : -.02), 0.08 + t * 0.46, -0.02 + t * 0.34], [0.05, 0.12, 0.09]);
    lock.rotation.x = -0.5;
  }
  const head = new THREE.Group();
  head.name = 'Head';
  head.position.set(0, 0.44, 0.4);
  neck.add(head);
  round(head, coat, [0, 0.02, 0.02], [0.13, 0.17, 0.2]);
  const face = part(head, new THREE.CylinderGeometry(0.075, 0.115, 0.42, 8), coat, [0, -0.15, 0.2]);
  face.rotation.x = 0.95;
  round(head, coatLight, [0, -0.3, 0.33], [0.085, 0.07, 0.1]);
  round(head, points, [0, -0.28, 0.4], [0.06, 0.04, 0.05]);
  for (const side of [-1, 1]) {
    const ear = part(head, UNIT_HAIR_LOCK, coat, [side * 0.075, 0.2, -0.04], [0.035, 0.09, 0.03]);
    ear.rotation.z = side * -0.2;
    ear.name = `${side < 0 ? 'Left' : 'Right'} Ear`;
    round(head, eyeMat, [side * 0.11, 0.03, 0.12], [0.02, 0.025, 0.018]);
  }
  const forelock = part(head, UNIT_HAIR_LOCK, mane, [0, 0.16, 0.1], [0.07, 0.05, 0.11]);
  forelock.rotation.x = 0.4;
  const tail = new THREE.Group();
  tail.name = 'Tail';
  tail.position.set(0, 0.18, -0.86);
  spine.add(tail);
  ribbon(tail, mane, [0, 0, 0], [0, -0.62, -0.18], 0.09, 0.09);
  ribbon(tail, mane, [0.03, -0.3, -0.1], [0.06, -0.78, -0.22], 0.06, 0.06);
  const legs = [], knees = [];
  for (const [name, side, z] of [['Left Fore', -1, 0.46], ['Right Fore', 1, 0.46], ['Left Hind', -1, -0.5], ['Right Hind', 1, -0.5]]) {
    const hip = new THREE.Group();
    hip.name = `${name} Hip`;
    hip.position.set(side * 0.19, 0.95, z);
    body.add(hip);
    legs.push(hip);
    round(hip, coat, [0, -0.2, z > 0 ? 0 : -0.04], [0.1, 0.3, z > 0 ? 0.11 : 0.17]);
    const knee = new THREE.Group();
    knee.name = `${name} Knee`;
    knee.position.set(0, -0.48, 0);
    hip.add(knee);
    knees.push(knee);
    round(knee, coat, [0, -0.02, 0], [0.07, 0.08, 0.075]);
    part(knee, new THREE.CylinderGeometry(0.048, 0.06, 0.36, 7), variation === 2 ? coat : points, [0, -0.22, 0.01]);
    part(knee, new THREE.CylinderGeometry(0.075, 0.065, 0.1, 7), hoof, [0, -0.42, 0.02]);
  }
  let saddle = null;
  if (saddled) {
    // An army saddle: a red blanket, a leather seat, girth and a bridle.
    saddle = new THREE.Group();
    saddle.name = 'Saddle';
    spine.add(saddle);
    box(saddle, blanket, [0, 0.27, 0.18], [0.66, 0.06, 0.62]);
    round(saddle, leather, [0, 0.36, 0.14], [0.2, 0.09, 0.3]);
    round(saddle, leather, [0, 0.44, -0.04], [0.16, 0.07, 0.09]);
    round(saddle, leather, [0, 0.45, 0.34], [0.15, 0.08, 0.08]);
    part(saddle, UNIT_CYLINDER, leather, [0, 0.02, 0.14], [0.33, 0.05, 0.36]);
    for (const side of [-1, 1]) {
      ribbon(saddle, leather, [side * 0.28, 0.3, 0.16], [side * 0.34, -0.06, 0.18], 0.04, 0.02);
      round(saddle, brass, [side * 0.35, -0.08, 0.18], [0.05, 0.03, 0.06]);
    }
    ribbon(head, leather, [-0.09, -0.24, 0.26], [0.09, -0.24, 0.26], 0.03, 0.015);
    ribbon(head, leather, [-0.12, 0.04, 0.02], [-0.11, -0.25, 0.26], 0.025, 0.015);
    ribbon(head, leather, [0.12, 0.04, 0.02], [0.11, -0.25, 0.26], 0.025, 0.015);
  }
  const pivots = [body, spine, neck, head, tail, ...legs, ...knees];
  if (saddle) pivots.push(saddle);
  batchRigidParts(group, pivots);
  const { animate } = makeHorseAnimator({ body, spine, neck, head, tail, legs, knees, offset: variation * 2.7 + 1.1 });
  return { group, animate, setArmed: () => {}, saddled };
}

// A four-beat walk and a patient idle: a breath, the occasional dip of the head
// to the grass, a tail swish and a shift of weight from one hind leg to the other.
function makeHorseAnimator({ body, spine, neck, head, tail, legs, knees, offset = 0 }) {
  let stridePhase = offset, lastTime, movementBlend = 0;
  const lerp = THREE.MathUtils.lerp;
  function animate(time, speed = 0, grounded = true, pose = {}) {
    const seconds = Number.isFinite(time) ? time : 0;
    const dt = lastTime === undefined ? 1 / 60 : THREE.MathUtils.clamp(seconds - lastTime, 0, 0.1);
    lastTime = seconds;
    const pace = Math.max(0, Number.isFinite(speed) ? speed : 0);
    const damping = 1 - Math.exp(-9 * dt);
    movementBlend = lerp(movementBlend, grounded ? THREE.MathUtils.clamp(pace / 1.2, 0, 1) : 0, 1 - Math.exp(-8 * dt));
    // Above a fast trot the gait gathers into a canter: hind pair and fore pair nearly together, a longer reach, a rocking back.
    const canter = THREE.MathUtils.clamp((pace - 8.5) / 3, 0, 1);
    stridePhase += dt * (3.4 + Math.min(pace, 6) * 1.1 + canter * 2.6);
    const idle = 1 - movementBlend, breath = Math.sin(seconds * 1.3 + offset);
    const graze = pose.grazing === true ? 1 : pose.grazing === false ? 0 : Math.pow(Math.max(0, Math.sin(seconds * .17 + offset)), 12) * idle;
    const shift = Math.sin(seconds * .21 + offset) * idle;
    const hip = [], knee = [];
    for (let i = 0; i < 4; i++) {
      // Walk order: left hind, left fore, right hind, right fore, a quarter cycle apart.
      const phase = stridePhase - lerp([Math.PI / 2, 3 * Math.PI / 2, 0, Math.PI][i], [Math.PI, Math.PI + 0.55, 0, 0.55][i], canter), fore = i < 2;
      hip[i] = Math.sin(phase) * ((fore ? 0.42 : 0.4) + canter * 0.34) * movementBlend + (fore ? 0 : 0.2) * idle + (i === 2 ? shift : i === 3 ? -shift : 0) * 0.05;
      knee[i] = (fore ? 0.02 : -0.32) * idle + (fore ? Math.max(0, Math.sin(phase + 0.7)) * 0.75 : -0.32 + Math.max(0, Math.sin(phase + 0.7)) * 0.4) * movementBlend
        + (i === 2 && shift > 0 ? shift * 0.12 : i === 3 && shift < 0 ? -shift * 0.12 : 0);
    }
    const spineX = movementBlend * 0.02 + graze * 0.05 + Math.sin(stridePhase) * 0.07 * canter, spineZ = shift * 0.012;
    const neckX = -0.05 + breath * 0.01 + graze * 0.75 + movementBlend * 0.08;
    const headX = 0.1 + graze * 0.55 + Math.sin(stridePhase) * 0.06 * movementBlend;
    const headY = Math.sin(seconds * 0.43 + offset) * 0.18 * idle * (1 - graze);
    const tailX = -0.15 + Math.sin(seconds * 0.9 + offset) * 0.05, tailY = Math.sin(seconds * 2.3 + offset) * 0.3 * idle + Math.sin(stridePhase * 2) * 0.05 * movementBlend;
    const rotate = (object, x, y, z) => {
      object.rotation.x = lerp(object.rotation.x, x, damping);
      object.rotation.y = lerp(object.rotation.y, y, damping);
      object.rotation.z = lerp(object.rotation.z, z, damping);
    };
    rotate(spine, spineX, 0, spineZ);
    rotate(neck, neckX, 0, -spineZ);
    rotate(head, headX, headY, 0);
    rotate(tail, tailX, tailY, 0);
    for (let i = 0; i < 4; i++) { rotate(legs[i], hip[i], 0, 0); rotate(knees[i], knee[i], 0, 0); }
    rotate(body, 0, Math.sin(stridePhase) * 0.012 * movementBlend, 0);
    body.position.y = lerp(body.position.y, breath * 0.006 * idle + Math.abs(Math.cos(stridePhase * 2)) * 0.02 * movementBlend * (1 - canter) + Math.max(0, Math.sin(stridePhase + 0.4)) * 0.09 * canter, 1 - Math.exp(-20 * dt));
  }
  return { animate };
}

/** Animated by the caller so all markers share one scene clock. */
/**
 * Take a figure out of the shadow pass. A fighter is twenty-odd separate moving
 * parts, so a crowd of them costs as much again in shadows as it does in itself;
 * in a fight the crowd is close together and a cast shadow apiece buys little.
 * `groundShadow()` is the dark patch that stands in for one.
 */
/**
 * A rock troll: three and a half times a person, grey as the ground it stands on, and
 * the reason nobody in Azhora walks a mountain road alone at dusk. The scale is the whole
 * point of it — it has to read from the far end of a valley and read worse when you are
 * standing under it.
 *
 * Trolls have no names, hold no conversations and keep no tolls. They belong to the high
 * country: the Lotharn Mountains, and the other ranges, none of which are built yet. This
 * model is kept ready for them (src/rock-troll.js has what is known about the kind) and is
 * placed nowhere at present.
 *
 * The rig keeps the goblin's joint offsets, because the analytic foot solver in
 * `makeAnimator` is written against them, and everything else departs from them
 * on purpose — shoulders wider than his torso is tall, arms that reach past his
 * knees, short bowed legs, no neck to speak of, and a head set forward and low
 * so he looks up at you from under a shelf of bone. The figure is scaled inside
 * an outer group, so the caller can go on setting the group's scale for a death
 * fade without flattening him.
 *
 * It carries a beam with a dressed stone lashed into the end. It did not make it.
 */
export function createRockTroll({ scale = 3.55 } = {}) {
  const group = new THREE.Group();
  group.name = 'rock-troll';
  const figure = new THREE.Group();
  figure.name = 'Rock troll figure';
  figure.scale.setScalar(scale);
  group.add(figure);
  const body = new THREE.Group();
  body.name = 'Weight and hips';
  figure.add(body);

  const hide = material(0x7c7a62), belly = material(0x8e8a6e), grime = material(0x5f5f4a);
  const scar = material(0x9a8f72), cloth = material(0x4e4636), patch = material(0x6b5f47);
  const leather = material(0x3f382c), horn = material(0xcfc4a0), dark = material(0x231f1a);
  const eyeWhite = material(0xc9b47a), stoneMat = material(0xa9a289);
  const legs = [], knees = [], ankles = [], arms = [], elbows = [], wrists = [];

  // Short, thick, bowed legs. The joint heights are the goblin's; the meat is not.
  for (const side of [-1, 1]) {
    const hip = new THREE.Group();
    hip.position.set(side * 0.2, 0.5, -0.02);
    body.add(hip);
    legs.push(hip);
    round(hip, hide, [side * 0.02, -0.09, 0], [0.135, 0.15, 0.14]);
    const knee = new THREE.Group();
    knee.position.y = -0.215;
    hip.add(knee);
    knees.push(knee);
    round(knee, hide, [0, -0.05, 0.01], [0.115, 0.115, 0.12]);
    part(knee, UNIT_CYLINDER, cloth, [0, -0.12, 0.01], [0.126, 0.055, 0.126]);
    const ankle = new THREE.Group();
    ankle.position.y = -0.18;
    knee.add(ankle);
    ankles.push(ankle);
    round(ankle, hide, [0, -0.03, 0.06], [0.15, 0.072, 0.18]);
    box(ankle, grime, [0, -0.077, 0.062], [0.29, 0.036, 0.3]);
    for (const toe of [-0.088, 0, 0.088]) round(ankle, belly, [toe, -0.03, 0.2], [0.05, 0.05, 0.055]);
    ribbon(ankle, leather, [-0.14, -0.015, 0.03], [0.14, -0.005, 0.055], 0.05, 0.03);
  }

  // A barrel of a gut, and above it a shoulder yoke that is the widest thing on him.
  part(body, UNIT_HAIR_LOCK, belly, [0, 0.72, 0.03], [0.53, 0.44, 0.47]);
  part(body, UNIT_CYLINDER, cloth, [0, 0.56, 0], [0.3, 0.13, 0.28]);
  ribbon(body, leather, [-0.33, 0.66, 0.2], [0.33, 0.62, 0.19], 0.085, 0.04);
  box(body, patch, [-0.1, 0.63, 0.25], [0.12, 0.1, 0.05]);
  part(body, UNIT_HAIR_LOCK, hide, [0, 1.0, -0.06], [0.78, 0.33, 0.4]);
  for (const side of [-1, 1]) {
    part(body, UNIT_HAIR_LOCK, hide, [side * 0.31, 1.1, -0.02], [0.33, 0.27, 0.35]);
    // Sacking over one shoulder; old ridged scars across the other.
    if (side < 0) for (let i = 0; i < 3; i++) ribbon(body, scar, [-0.22 - i * 0.05, 1.12, 0.14], [-0.34 - i * 0.04, 0.9, 0.1], 0.016, 0.008);
    else ribbon(body, cloth, [0.1, 1.16, 0.06], [0.36, 0.78, 0.1], 0.13, 0.05);
  }
  // Ribs and lumps: at arm's length he stops being a silhouette and starts being skin.
  for (const side of [-1, 1]) for (let i = 0; i < 4; i++) {
    const lump = part(body, UNIT_HAIR_LOCK, grime, [side * (0.2 + i * 0.03), 0.82 - i * 0.055, 0.28], [0.06, 0.045, 0.02]);
    lump.rotation.z = side * 0.3;
  }

  // Long arms, hung forward, ending in hands the size of a person's chest.
  for (const side of [-1, 1]) {
    const shoulder = new THREE.Group();
    shoulder.position.set(side * 0.42, 1.09, 0.01);
    body.add(shoulder);
    arms.push(shoulder);
    round(shoulder, hide, [side * 0.02, -0.13, 0], [0.135, 0.22, 0.145]);
    const elbow = new THREE.Group();
    elbow.position.set(side * 0.02, -0.33, 0);
    shoulder.add(elbow);
    elbows.push(elbow);
    round(elbow, hide, [0, -0.13, 0], [0.108, 0.2, 0.115]);
    part(elbow, UNIT_HAIR_LOCK, grime, [side * 0.05, -0.1, 0.07], [0.03, 0.06, 0.02]);
    const wrist = new THREE.Group();
    wrist.position.set(0, -0.34, 0.02);
    elbow.add(wrist);
    wrists.push(wrist);
    round(wrist, hide, [0, -0.04, 0.02], [0.155, 0.13, 0.145]);
    for (let f = 0; f < 3; f++) round(wrist, belly, [(f - 1) * 0.07, -0.14, 0.07], [0.036, 0.075, 0.042]);
    round(wrist, belly, [-side * 0.1, -0.06, 0.06], [0.05, 0.07, 0.05]);
  }

  // Almost no neck: the head is set forward off the chest, and looks up at you.
  const head = new THREE.Group();
  head.name = 'Head';
  head.position.set(0, 1.19, 0.24);
  body.add(head);
  part(head, UNIT_HAIR_LOCK, hide, [0, 0.08, -0.04], [0.37, 0.33, 0.35]);
  part(head, UNIT_HAIR_LOCK, belly, [0, -0.07, 0.11], [0.32, 0.19, 0.27]);   // the jaw, undershot
  part(head, UNIT_HAIR_LOCK, hide, [0, 0.19, -0.02], [0.33, 0.12, 0.3]);     // the shelf of brow
  for (const side of [-1, 1]) {
    const socket = part(head, UNIT_HAIR_LOCK, dark, [side * 0.1, 0.1, 0.16], [0.075, 0.05, 0.03]);
    socket.rotation.z = side * 0.14;
    round(head, eyeWhite, [side * 0.1, 0.1, 0.185], [0.032, 0.02, 0.012]);
    round(head, dark, [side * 0.097, 0.101, 0.196], [0.011, 0.014, 0.005]);
    // Two lower tusks, one of them broken off short.
    const tusk = part(head, new THREE.ConeGeometry(0.03, side < 0 ? 0.13 : 0.06, 5), horn, [side * 0.11, -0.03, 0.2]);
    tusk.rotation.set(-0.35, 0, side * 0.12);
    // One ear notched, and the other not.
    const ear = part(head, UNIT_HAIR_LOCK, hide, [side * 0.31, 0.09, -0.03], [0.1, 0.13, 0.05]);
    ear.rotation.z = side * -0.4;
    if (side > 0) part(head, UNIT_HAIR_LOCK, dark, [0.35, 0.14, -0.03], [0.035, 0.05, 0.06]);
  }
  part(head, UNIT_HAIR_LOCK, belly, [0, 0.02, 0.21], [0.075, 0.09, 0.09]);   // the nose
  round(head, dark, [-0.03, -0.005, 0.245], [0.017, 0.013, 0.012]);
  round(head, dark, [0.03, -0.005, 0.245], [0.017, 0.013, 0.012]);
  part(head, UNIT_HAIR_LOCK, dark, [0, -0.045, 0.22], [0.2, 0.026, 0.02]);   // the mouth line
  for (let i = 0; i < 4; i++) {
    const tuft = part(head, UNIT_HAIR_LOCK, grime, [(i - 1.5) * 0.06, 0.26, -0.06], [0.03, 0.07, 0.05]);
    tuft.rotation.z = (i - 1.5) * 0.24;
  }
  // The toll bowl, on a cord at his hip. He is never without it.
  const bowl = part(body, UNIT_CYLINDER, patch, [0.32, 0.56, 0.16], [0.09, 0.05, 0.09]);
  bowl.rotation.z = 0.3;

  const chest = addChestPivot(body, legs, 0.7);
  // The beam: a road-mender's timber with a dressed terrace stone lashed in the end.
  const weapon = makeWeaponMount(wrists[1], 'Ogre beam grip');
  const beam = new THREE.Group();
  beam.name = 'Road beam';
  weapon.add(beam);
  part(beam, UNIT_CYLINDER, material(0x6b5136), [0, -0.42, 0.02], [0.05, 0.98, 0.05]);
  part(beam, UNIT_BOX, stoneMat, [0, -0.93, 0.02], [0.2, 0.24, 0.17]);
  for (const band of [-0.83, -1.02]) ribbon(beam, leather, [-0.11, band, 0.02], [0.11, band, 0.02], 0.022, 0.02);

  const pivots = [body, chest, head, ...arms, ...elbows, ...wrists, ...legs, ...knees, ...ankles, weapon];
  for (const [kind, joints] of Object.entries({ Shoulder: arms, Elbow: elbows, Wrist: wrists, Hip: legs, Knee: knees, Ankle: ankles })) {
    joints.forEach((joint, i) => { joint.name = `${i ? 'Right' : 'Left'} ${kind}`; });
  }
  batchRigidParts(group, pivots);
  const { animate, setArmed } = makeAnimator({ body, chest, head, arms, elbows, wrists, legs, knees, ankles, weapon, goblin: true, offset: 2.4 });
  return { group, animate, setArmed, figure, scale };
}

export function setShadowCasting(actor, casting) {
  const group = actor?.group ?? actor;
  if (!group?.traverse) return false;
  group.traverse(object => { if (object.isMesh && !object.userData?.groundShadow) object.castShadow = casting; });
  return true;
}

const SHADOW_DISC = new THREE.CircleGeometry(0.42, 14);
/** A soft dark disc laid on the ground under a figure that no longer casts its own. */
export function groundShadow(opacity = 0.34) {
  const mesh = new THREE.Mesh(SHADOW_DISC, new THREE.MeshBasicMaterial({ color: 0x1d2a22, transparent: true, opacity, depthWrite: false, toneMapped: false }));
  mesh.rotation.x = -Math.PI / 2;
  mesh.renderOrder = -1;
  mesh.userData.groundShadow = true;
  mesh.castShadow = false; mesh.receiveShadow = false;
  return mesh;
}

/**
 * The gold over somebody's head, in one of three kinds (src/quest-markers.js):
 * `main` a cut stone, `plot` a rolled sheet, `skill` a leaf. Different shapes as
 * well as different colours, so the three read apart without colour.
 *
 * `open` is the arc's one variant: the same gold and the same cut stone, hollow — the long
 * road's next stop rather than the muster road's. Two crossed outlines and not one, because a
 * flat ring vanishes every time the marker turns side-on, and it turns all the time.
 */
export function makeQuestMarker(kind = 'main', { open = false } = {}) {
  const look = MARKER_STYLE[kind] ?? MARKER_STYLE.main;
  const hollow = !!open && look.shape === 'diamond';
  const group = new THREE.Group();
  group.name = 'quest-marker';
  group.userData.markerKind = look.kind;
  group.userData.markerOpen = hollow;
  const mat = material(look.colour, { emissive: look.emissive, emissiveIntensity: 0.42, roughness: 0.36, metalness: 0.22 });
  if (hollow) {
    // A torus of four tubular segments is a diamond outline: its corners sit on the axes, so
    // stretched the way the stone is stretched it is exactly the stone's silhouette, empty.
    for (const turn of [0, Math.PI / 2]) {
      const outline = part(group, new THREE.TorusGeometry(0.118, 0.019, 4, 4), mat, [0, 0, 0], [0.85, 1.45, 0.85]);
      outline.rotation.y = turn;
    }
  } else if (look.shape === 'diamond') {
    const diamond = part(group, new THREE.OctahedronGeometry(0.128, 0), mat, [0, 0, 0], [0.85, 1.45, 0.85]);
    diamond.rotation.y = Math.PI / 4;
  } else if (look.shape === 'ring') {
    // A plain ring, open in the middle: the shape of a thing done for somebody rather than for
    // the story. Its hole is what tells it apart from the stone at a glance and at distance.
    const ring = part(group, new THREE.TorusGeometry(0.108, 0.029, 8, 20), mat, [0, 0, 0]);
    ring.rotation.x = Math.PI / 2 * 0.06;
  } else if (look.shape === 'scroll') {
    // A rolled sheet lying across, both ends showing: wide where the stone is tall.
    const roll = part(group, new THREE.CylinderGeometry(0.056, 0.056, 0.23, 10), mat, [0, 0, 0]);
    roll.rotation.z = Math.PI / 2;
    for (const side of [-1, 1]) {
      const cap = part(group, new THREE.TorusGeometry(0.06, 0.019, 5, 14), mat, [side * 0.115, 0, 0]);
      cap.rotation.y = Math.PI / 2;
    }
  } else {
    // A leaf: two cones back to back, flattened, with a stem under it.
    for (const way of [1, -1]) {
      const half = part(group, new THREE.ConeGeometry(0.084, 0.148, 6), mat, [0, way * 0.074, 0], [1, 1, 0.34]);
      if (way < 0) half.rotation.x = Math.PI;
    }
    part(group, new THREE.CylinderGeometry(0.011, 0.011, 0.075, 5), mat, [0, -0.185, 0]);
  }
  const ring = part(group, new THREE.TorusGeometry(0.108, 0.014, 5, 18), material(look.ring, { emissive: look.ringEmissive, emissiveIntensity: 0.45 }), [0, -0.23, 0]);
  ring.rotation.x = Math.PI / 2;
  group.scale.setScalar(look.scale);
  group.traverse((object) => {
    if (object.isMesh) {
      object.castShadow = false;
      object.receiveShadow = false;
    }
  });
  return group;
}

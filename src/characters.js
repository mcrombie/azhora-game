import * as THREE from 'three';

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
// Soldiers of the Ambroni Legion wear a red under-tunic beneath banded iron;
// Suval's border guards wear slate wool and studded leather instead.
const SOLDIER_CLOTH = Object.freeze({
  'legion-soldier': 0x8f3b30,
  'legion-officer': 0x832d2b,
  'suvali-guard': 0x55636f,
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

function ribbon(parent, mat, from, to, width = 0.052, depth = 0.022) {
  const start = new THREE.Vector3(...from);
  const end = new THREE.Vector3(...to);
  const direction = end.clone().sub(start);
  const mesh = box(parent, mat, start.clone().add(end).multiplyScalar(0.5).toArray(), [width, direction.length(), depth]);
  mesh.quaternion.setFromUnitVectors(UP, direction.normalize());
  return mesh;
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
    if (action === 'idle' && movementBlend < .25) {
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
      }
      if (['commons-miller', 'reed-worker', 'shelter-keeper', 'legion-soldier', 'legion-officer', 'suvali-guard'].includes(role))
        for (let i = 0; i < 2; i++) ankle[i] = -hip[i] * .52 - knee[i] * .67;
      if (pose.fishing) {
        const patience = Math.sin(seconds * 1.8 + offset) * .023;
        arm[1] = -.11 + patience; elbow[1] = -.40; armOut[1] = .04;
        arm[0] = -.39 + patience; elbow[0] = -.72; armOut[0] = -.08;
        chestX = .045; chestY = -.025; headX = .09 + patience; headY = .045;
      }
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
      const lift = 0.025 + run * 0.2 + (grounded ? 0 : 0.12) + (action === 'dodge' ? 0.26 : 0);
      clothPivot.rotation.x = THREE.MathUtils.lerp(clothPivot.rotation.x, lift + Math.cos(stridePhase * 2) * movementBlend * 0.025, settle);
      clothPivot.rotation.y = THREE.MathUtils.lerp(clothPivot.rotation.y, -chestY * 0.15, settle);
      clothPivot.rotation.z = THREE.MathUtils.lerp(clothPivot.rotation.z, Math.sin(seconds * 1.35 + offset) * 0.018 + step * movementBlend * 0.035, settle);
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
    const y = action === 'dead' ? THREE.MathUtils.smoothstep(progress, 0, 0.8) * 0.14 : grounded ? -soleHeight + bounce : 0;
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
  return { animate, setArmed };
}

/** An ordinary hired traveler in cloth. Feet rest at y=0, forward is +Z. */
export function createCharacter({ role = 'traveler', tunic = ROAD_CLOTH[role] ?? SOLDIER_CLOTH[role] ?? (role === 'traveler' ? 0x806042 : role === 'doomsayer' ? 0x494d43 : role === 'pond-fisher' ? 0x7e7454 : 0x537a44), skin = role === 'shelter-keeper' ? 0xc8a78a : 0xd7ad7e, hat = !['traveler', 'acorn-cook', 'doomsayer', 'bridge-keeper', 'rise-custodian', 'forest-woodcutter', 'commons-miller', 'shelter-keeper', 'legion-soldier', 'legion-officer', 'suvali-guard'].includes(role) } = {}) {
  const isTraveler = role === 'traveler';
  const isCook = role === 'acorn-cook';
  const isDoomsayer = role === 'doomsayer', isPondFisher = role === 'pond-fisher';
  const isRoadWorker = Object.hasOwn(ROAD_CLOTH, role);
  const isCourier = role === 'field-courier', isBridgeKeeper = role === 'bridge-keeper';
  const isCustodian = role === 'rise-custodian', isClerk = role === 'relay-clerk';
  const isWoodcutter = role === 'forest-woodcutter';
  const isMiller = role === 'commons-miller', isReedWorker = role === 'reed-worker', isShelterKeeper = role === 'shelter-keeper';
  const isLocalWorker = isMiller || isReedWorker || isShelterKeeper;
  const isLegionary = role === 'legion-soldier', isOfficer = role === 'legion-officer', isSuvaliGuard = role === 'suvali-guard';
  const isSoldier = isLegionary || isOfficer || isSuvaliGuard;
  const group = new THREE.Group();
  group.name = `character-${role}`;
  const body = new THREE.Group();
  group.add(body);

  const cloth = material(tunic);
  const clothLight = material(new THREE.Color(tunic).lerp(new THREE.Color(0xe4d3a1), 0.18));
  const linen = material(isSoldier ? 0xcdbf9f : isRoadWorker ? 0xc5b79a : isTraveler ? 0xb8a386 : isCook ? 0xd6c4a0 : isDoomsayer ? 0x898474 : role === 'fisher' || isPondFisher ? 0xd5cfb3 : 0xd2ad66);
  const skinMat = material(skin);
  const noseMat = material(new THREE.Color(skin).lerp(new THREE.Color(0xd99476), 0.22));
  const leather = material(0x664833);
  const bootMat = material(0x49392c);
  const soleMat = material(0x302b24);
  const trousers = material(isSoldier ? (isSuvaliGuard ? 0x4a4a45 : 0x5a4a3c) : isLocalWorker ? isReedWorker ? 0x5a685c : 0x655a48 : isWoodcutter ? 0x635846 : isTraveler ? 0x68523c : role === 'fisher' ? 0x667779 : 0x76714e);
  const hairMat = material(isShelterKeeper ? 0x797368 : isReedWorker ? 0x403b32 : isMiller ? 0x624731 : isCustodian ? 0x8e8b7d : isBridgeKeeper ? 0x42382e : isClerk ? 0x685445 : isTraveler ? 0x806044 : isCook ? 0x624330 : isDoomsayer ? 0xa2a293 : isPondFisher ? 0x5d5140 : role === 'harbormaster' ? 0x79776b : role === 'warden' ? 0x503d30 : 0x6b462c);
  const dark = material(0x282d23);
  const whites = material(0xf3e9cc);
  const gold = isTraveler || isCook || isDoomsayer || isPondFisher || isRoadWorker ? bootMat : material(0xc8a250, { metalness: 0.28, roughness: 0.52 });
  const bagMat = material(0xa17a4b);

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
  part(body, torsoShape, cloth, [0, 1.12, 0], [1, 1, 0.68]);
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
    pivot.position.set(side * (isCook ? 0.233 : 0.258), 1.265, 0);
    pivot.rotation.z = side * 0.085;
    body.add(pivot);
    arms.push(pivot);
    if (isTraveler || isRoadWorker || isSoldier) {
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
    if (isBridgeKeeper || isWoodcutter || isMiller || isReedWorker) {
      // Rolled sleeves show bare working forearms, not bracers or armor.
      part(elbow, UNIT_CYLINDER, linen, [0, -.017, .003], [.085, .067, .088]);
      round(elbow, skinMat, [0, -.103, .007], [.067, .082, .07]);
    } else if (isTraveler || isRoadWorker || isSoldier) {
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
  }

  const head = new THREE.Group();
  head.position.set(0, 1.365, 0);
  body.add(head);
  part(head, UNIT_CYLINDER, skinMat, [0, -0.035, 0], [0.069, 0.14, 0.069]);
  round(head, hairMat, [0, 0.202, -0.045], [0.224, 0.227, 0.183]);
  round(head, skinMat, [0, 0.181, 0.015], [isCook ? 0.187 : 0.195, 0.228, 0.18]);
  for (const side of [-1, 1]) {
    round(head, skinMat, [side * 0.194, 0.186, 0], [0.047, 0.062, 0.044]);
    round(head, noseMat, [side * 0.212, 0.186, 0.027], [0.018, 0.032, 0.014]);
    if (!isTraveler && !isCook && !isSoldier) box(head, hairMat, [side * 0.169, 0.251, -0.009], [0.06, 0.132, 0.127]);
    round(head, whites, [side * 0.068, 0.226, 0.177], [0.046, 0.031, 0.016]);
    round(head, dark, [side * 0.065, 0.226, 0.191], [0.018, 0.025, 0.011]);
    round(head, whites, [side * 0.065 - 0.006, 0.235, 0.2], [0.006, 0.007, 0.004]);
    const brow = box(head, hairMat, [side * 0.069, 0.273, 0.167], [0.078, isCook ? 0.013 : 0.018, 0.02]);
    brow.rotation.z = side * -0.075;
  }
  round(head, noseMat, [0, 0.178, 0.207], [0.04, 0.035, 0.044]);
  // A tiny smile rather than a painted texture.
  box(head, leather, [0, 0.116, 0.171], [0.051, 0.01, 0.012]);
  for (const side of [-1, 1]) {
    const mouthCorner = box(head, leather, [side * 0.029, 0.12, 0.168], [0.016, 0.008, 0.01]);
    mouthCorner.rotation.z = side * 0.45;
  }
  if (isTraveler) {
    // Uneven brown locks read clearly from the follow camera without a cap.
    // Shared low-poly geometry is folded into the existing rigid head batches.
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
      const lock = part(head, UNIT_HAIR_LOCK, sunlit ? sunlitHair : hairMat, position, scale);
      lock.rotation.set(...rotation);
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
  } else {
    const fringe = round(head, hairMat, [-0.055, 0.334, 0.08], [0.143, 0.061, 0.123]);
    fringe.rotation.z = -0.18;
  }

  if (hat && !isDoomsayer && !isWoodcutter && !isMiller && !isShelterKeeper) {
    // A soft, rounded country cap, with a short leather peak and folded crown.
    const cap = new THREE.Group();
    cap.position.set(-0.018, 0.371, -0.028);
    cap.rotation.z = -0.11;
    head.add(cap);
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

  if (!isCook && !isDoomsayer && !isBridgeKeeper && !isCustodian && !isWoodcutter && !isLocalWorker && !isSoldier) {
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
    round(head, hairMat, [0, .067, .112], [.12, .049, .093]);
  } else if (isCustodian) {
    const cloak = material(0x626b81, { side: THREE.DoubleSide });
    const faded = material(0x8a8d96, { side: THREE.DoubleSide });
    part(body, new THREE.CylinderGeometry(.16, .337, .27, 10, 1, true, Math.PI * .37, Math.PI * 1.26), cloak, [0, 1.208, -.03], [1, 1, .84]);
    clothPivot = new THREE.Group(); clothPivot.name = 'Custodian weathered cloak'; clothPivot.position.set(0, 1.095, -.032); body.add(clothPivot);
    part(clothPivot, new THREE.CylinderGeometry(.328, .371, .65, 10, 2, true, Math.PI * .39, Math.PI * 1.22), cloak, [0, -.325, 0], [1, 1, .83]);
    const patch = box(clothPivot, faded, [-.13, -.49, -.29], [.11, .12, .016]); patch.rotation.y = -.24;
    for (const x of [-.165, -.112]) box(clothPivot, linen, [x, -.446, -.299], [.008, .022, .009]);
    ribbon(body, linen, [-.126, 1.254, .138], [.135, 1.247, .131], .024, .018);
    round(head, hairMat, [0, .06, .112], [.141, .071, .117]);
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
  } else if (role === 'harbormaster') {
    // An apron and salt-grey beard distinguish the older keeper of the pier.
    box(body, linen, [0, 0.984, 0.18], [0.225, 0.434, 0.036]);
    ribbon(body, leather, [-0.113, 1.277, 0.126], [-0.101, 1.093, 0.19], 0.027);
    ribbon(body, leather, [0.113, 1.277, 0.126], [0.101, 1.093, 0.19], 0.027);
    round(head, hairMat, [0, 0.063, 0.101], [0.14, 0.106, 0.122]);
    round(head, hairMat, [-0.047, 0.133, 0.188], [0.057, 0.022, 0.025]);
    round(head, hairMat, [0.047, 0.133, 0.188], [0.057, 0.022, 0.025]);
  } else if (role === 'fisher' || isPondFisher) {
    const scarfMat = material(0xbf7151);
    part(body, UNIT_CYLINDER, scarfMat, [0, 1.324, 0], [0.114, 0.065, 0.098]);
    const scarfEnd = box(body, scarfMat, [-0.052, 1.225, 0.168], [0.084, 0.2, 0.027]);
    scarfEnd.rotation.z = -0.13;
    if (isPondFisher) {
      round(head, hairMat, [0, .055, .105], [.134, .078, .113]);
      box(body, linen, [-.103, 1.015, .184], [.114, .13, .023]);
    }
  } else if (role === 'warden') {
    const cloakMat = material(new THREE.Color(tunic).multiplyScalar(0.73));
    const cloak = new THREE.CylinderGeometry(0.188, 0.298, 0.596, 7, 1, true, Math.PI / 2, Math.PI);
    const cloakMesh = part(body, cloak, cloakMat, [0, 1.012, -0.018], [1, 1, 0.85]);
    cloakMesh.material.side = THREE.DoubleSide;
    round(body, gold, [-0.152, 1.266, 0.129], [0.031, 0.031, 0.013]);
  } else if (isSoldier) {
    // Legion issue: banded iron over a red tunic, a helmet with cheek guards
    // and a neck guard, greaves, a sheathed sword at the hip and a planted
    // spear. Officers add a crest and a cloak and keep a hand on the hilt;
    // Suval's border guards wear a studded jerkin and a plain iron cap.
    const iron = material(isSuvaliGuard ? 0x7b7d78 : 0x9a9d96, { metalness: 0.46, roughness: 0.6 });
    const ironDark = material(0x62655f, { metalness: 0.46, roughness: 0.6 });
    const strap = material(0x4d3a2a);
    const armor = new THREE.Group();
    armor.name = isSuvaliGuard ? 'Suvali studded jerkin' : 'Legion banded cuirass';
    body.add(armor);
    if (isSuvaliGuard) {
      part(armor, new THREE.CylinderGeometry(0.262, 0.236, 0.40, 8), strap, [0, 1.115, 0], [1, 1, 0.7]);
      for (let row = 0; row < 3; row++) for (let i = -2; i <= 2; i++) round(armor, iron, [i * 0.072, 1.245 - row * 0.1, 0.176 - Math.abs(i) * 0.022], [0.016, 0.016, 0.01]);
    } else {
      // Five overlapping bands, each a little wider than the one below it.
      for (let i = 0; i < 5; i++) part(armor, UNIT_CYLINDER, i % 2 ? ironDark : iron, [0, 1.275 - i * 0.068, 0], [0.272 - i * 0.008, 0.062, 0.19 - i * 0.005]);
      for (const side of [-1, 1]) {
        round(armor, iron, [side * 0.245, 1.318, 0], [0.135, 0.058, 0.15]);
        round(armor, ironDark, [side * 0.285, 1.262, 0], [0.09, 0.05, 0.14]);
      }
      box(armor, gold, [0, 1.19, 0.198], [0.06, 0.13, 0.012]);
    }
    // Leather pteruges hang from the belt around the front and sides.
    for (let i = 0; i < 7; i++) {
      const angle = (i - 3) * 0.38;
      const strip = box(armor, i % 2 ? strap : leather, [Math.sin(angle) * 0.235, 0.86, Math.cos(angle) * 0.19], [0.058, 0.17, 0.014]);
      strip.rotation.y = angle;
    }
    // The sword stays sheathed at the left hip: scabbard, guard and grip.
    const scabbard = box(armor, leather, [-0.26, 0.84, -0.03], [0.05, 0.42, 0.06]);
    scabbard.rotation.z = 0.12;
    box(armor, ironDark, [-0.283, 1.06, -0.03], [0.12, 0.02, 0.04]);
    part(armor, UNIT_CYLINDER, strap, [-0.29, 1.11, -0.03], [0.018, 0.09, 0.018]);
    for (const knee of knees) box(knee, iron, [0, -0.135, 0.104], [0.15, 0.2, 0.03]);
    part(elbows[1], UNIT_CYLINDER, strap, [0, -0.1, 0.004], [0.077, 0.09, 0.079]);
    const helmet = new THREE.Group();
    helmet.name = isSuvaliGuard ? 'Suvali iron cap' : isOfficer ? 'Legion crested helmet' : 'Legion helmet';
    head.add(helmet);
    round(helmet, iron, [0, 0.27, -0.015], [0.222, 0.2, 0.205]);
    part(helmet, UNIT_CYLINDER, ironDark, [0, 0.245, 0], [0.228, 0.036, 0.208]);
    if (isSuvaliGuard) {
      part(helmet, UNIT_CYLINDER, ironDark, [0, 0.228, 0], [0.27, 0.014, 0.25]);
    } else {
      for (const side of [-1, 1]) {
        const cheek = box(helmet, iron, [side * 0.19, 0.17, 0.05], [0.04, 0.15, 0.12]);
        cheek.rotation.z = side * 0.08;
      }
      const neckGuard = box(helmet, iron, [0, 0.16, -0.21], [0.3, 0.03, 0.12]);
      neckGuard.rotation.x = -0.35;
      box(helmet, ironDark, [0, 0.31, 0.19], [0.14, 0.05, 0.02]);
    }
    if (isOfficer) {
      const crestMat = material(0xa53a2c);
      const crest = new THREE.Group();
      crest.name = 'Officer crest';
      helmet.add(crest);
      box(crest, crestMat, [0, 0.43, -0.03], [0.045, 0.1, 0.3]);
      round(crest, crestMat, [0, 0.46, 0.05], [0.03, 0.06, 0.09]);
      const cloakMat = material(0x7d2a24, { side: THREE.DoubleSide });
      part(body, new THREE.CylinderGeometry(0.2, 0.34, 0.72, 8, 1, true, Math.PI / 2, Math.PI), cloakMat, [0, 0.95, -0.03], [1, 1, 0.85]);
      for (const side of [-1, 1]) round(body, gold, [side * 0.16, 1.3, 0.13], [0.03, 0.03, 0.012]);
    } else {
      // The spear stays planted beside the right foot while the body breathes.
      staff = new THREE.Group();
      staff.name = isSuvaliGuard ? 'Suvali guard spear' : 'Legion spear';
      wrists[1].add(staff);
      const shaft = material(0x6d5439);
      ribbon(staff, shaft, [0, -0.82, 0], [0, 1.18, 0], 0.036, 0.036);
      ribbon(staff, ironDark, [0, 1.18, 0], [0, 1.24, 0], 0.03, 0.03);
      part(staff, new THREE.ConeGeometry(0.03, 0.24, 4), iron, [0, 1.36, 0]);
      round(staff, ironDark, [0, -0.83, 0], [0.024, 0.03, 0.024]);
    }
    if (isLegionary) {
      // A curved rectangular shield rides on the left forearm, boss outward.
      const shield = new THREE.Group();
      shield.name = 'Legion shield';
      // Held in front of the body: the face is perpendicular to the forearm
      // and tipped so it stands vertical in the at-attention pose.
      shield.position.set(0.13, -0.16, 0);
      shield.rotation.x = -0.6;
      elbows[0].add(shield);
      const shieldMat = material(0x35507a), rim = material(0xcbb98e);
      for (const side of [-1, 1]) {
        const half = box(shield, shieldMat, [side * 0.105, 0.012, 0], [0.215, 0.028, 0.62]);
        half.rotation.z = side * 0.24;
      }
      for (const z of [-0.31, 0.31]) box(shield, rim, [0, 0.02, z], [0.43, 0.034, 0.024]);
      round(shield, iron, [0, -0.03, 0], [0.065, 0.022, 0.065]);
      box(shield, gold, [0, -0.026, 0.17], [0.05, 0.008, 0.14]);
    }
  }

  const idleOffset = isMiller ? 1.35 : isReedWorker ? 3.55 : isShelterKeeper ? 5.15 : isWoodcutter ? 2.1 : isCourier ? .8 : isBridgeKeeper ? 2.8 : isCustodian ? 4.4 : isClerk ? 5.6 : isCook ? 2.35 : isDoomsayer ? 1.1 : isPondFisher ? 3.8 : role === 'harbormaster' ? 1.8 : role === 'fisher' ? 3.1 : role === 'warden' ? 4.7 : 0;
  const chest = addChestPivot(body, legs, 0.935);
  const weapon = isTraveler ? makeWeaponMount(wrists[1], 'Traveler weapon grip') : null;
  const weapons = weapon ? { 'simple-sword': makeSword(weapon), 'forest-stick': makeStick(weapon) } : {};
  const fishingGrip = isTraveler || isPondFisher ? makeWeaponMount(wrists[1], 'Fishing rod grip') : null;
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
  const { animate: animatePose, setArmed } = makeAnimator({ body, chest, head, arms, elbows, wrists, legs, knees, ankles, weapon, clothPivot, offset: idleOffset, role });
  let fishing = isPondFisher, selectedWeapon = null;
  const rodTipWorld = new THREE.Vector3();
  function setWeapon(id) {
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
  if (isTraveler) setWeapon('simple-sword');
  if (fishingGrip) setFishing(isPondFisher);
  return { group, animate, setArmed, setWeapon, setFishing, fishingTip };
}

/** A scrawny woodland raider: a sunken glare, ragged ears and a wary lope. */
export function createGoblin({ variant = 0 } = {}) {
  const variation = Math.abs(Math.floor(Number.isFinite(variant) ? variant : 0)) % 3;
  const group = new THREE.Group();
  group.name = `goblin-${variation}`;
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

  const chest = addChestPivot(body, legs, 0.69);
  const weapon = makeWeaponMount(wrists[1], 'Raider stick grip');
  makeStick(weapon, true);
  const pivots = [body, chest, head, ...arms, ...elbows, ...wrists, ...legs, ...knees, ...ankles, weapon];
  for (const [kind, joints] of Object.entries({ Shoulder: arms, Elbow: elbows, Wrist: wrists, Hip: legs, Knee: knees, Ankle: ankles })) {
    joints.forEach((joint, i) => { joint.name = `${i ? 'Right' : 'Left'} ${kind}`; });
  }
  batchRigidParts(group, pivots);
  const { animate, setArmed } = makeAnimator({ body, chest, head, arms, elbows, wrists, legs, knees, ankles, weapon, goblin: true, offset: variation * 1.91 + 0.7 });
  return { group, animate, setArmed };
}

/** A grey wolf: long muzzle, high shoulders, a low-slung trot. Paws rest at y=0, forward is +Z. */
export function createWolf({ variant = 0 } = {}) {
  const variation = Math.abs(Math.floor(Number.isFinite(variant) ? variant : 0)) % 3;
  const group = new THREE.Group();
  group.name = `wolf-${variation}`;
  const body = new THREE.Group();
  body.name = 'Weight and hips';
  group.add(body);
  const coat = material([0x6f6a60, 0x7a7266, 0x5f5b55][variation]);
  const coatLight = material([0x9c968a, 0xa39b8c, 0x8b877f][variation]);
  const coatDark = material([0x4a4740, 0x514c44, 0x3d3b37][variation]);
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
    const ear = part(head, UNIT_HAIR_LOCK, coatDark, [side * 0.072, 0.125, -0.03], [0.04, 0.075, 0.03]);
    ear.rotation.z = side * -0.25;
    part(head, UNIT_HAIR_LOCK, coatLight, [side * 0.072, 0.12, -0.02], [0.02, 0.045, 0.012]);
    round(head, eyeMat, [side * 0.06, 0.045, 0.105], [0.022, 0.018, 0.012]);
    round(head, dark, [side * 0.06, 0.045, 0.115], [0.009, 0.01, 0.006]);
    for (const [z, length] of [[0.19, 0.03], [0.23, 0.022]]) {
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
  const { animate } = makeWolfAnimator({ body, spine, neck, head, jaw, tail, legs, knees, offset: variation * 2.3 + 0.4 });
  return { group, animate, setArmed: () => {} };
}

// A quadruped gait and the same action vocabulary as the two-legged animator:
// idle, windup (a crouch), attack (a lunge with the jaws), hurt, dead.
function makeWolfAnimator({ body, spine, neck, head, jaw, tail, legs, knees, offset = 0 }) {
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
    let jawX = 0, tailX = 0.4 - alert * 0.9, tailY = Math.sin(seconds * 3.1 + offset) * 0.25 * idle * (1 - alert);
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
 * A riding horse for the Legion's lines and the road: bay, chestnut or grey,
 * saddled or bare. Hooves rest at y=0, forward is +Z, the withers at 1.5 m.
 * It idles and walks; riding is a later mechanic, so there is no rider seat yet.
 */
export function createHorse({ variant = 0, saddled = false } = {}) {
  const variation = Math.abs(Math.floor(Number.isFinite(variant) ? variant : 0)) % 3;
  const group = new THREE.Group();
  group.name = `horse-${variation}${saddled ? '-saddled' : ''}`;
  const body = new THREE.Group();
  body.name = 'Weight and hips';
  group.add(body);
  const coat = material([0x6b4a32, 0x9a5a34, 0xb9b3a6][variation]);
  const coatLight = material([0x7d5a3f, 0xad6f45, 0xcac5ba][variation]);
  const points = material([0x2f241c, 0x4a3324, 0x8c877d][variation]);
  const mane = material([0x2a201a, 0x3d2a1e, 0xd9d4c9][variation]);
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
    // A Legion saddle: a red blanket, a leather seat, girth and a bridle.
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
    stridePhase += dt * (3.4 + Math.min(pace, 6) * 1.1);
    const idle = 1 - movementBlend, breath = Math.sin(seconds * 1.3 + offset);
    const graze = pose.grazing === true ? 1 : pose.grazing === false ? 0 : Math.pow(Math.max(0, Math.sin(seconds * .17 + offset)), 12) * idle;
    const shift = Math.sin(seconds * .21 + offset) * idle;
    const hip = [], knee = [];
    for (let i = 0; i < 4; i++) {
      // Walk order: left hind, left fore, right hind, right fore, a quarter cycle apart.
      const phase = stridePhase - [Math.PI / 2, 3 * Math.PI / 2, 0, Math.PI][i], fore = i < 2;
      hip[i] = Math.sin(phase) * (fore ? 0.42 : 0.4) * movementBlend + (fore ? 0 : 0.2) * idle + (i === 2 ? shift : i === 3 ? -shift : 0) * 0.05;
      knee[i] = (fore ? 0.02 : -0.32) * idle + (fore ? Math.max(0, Math.sin(phase + 0.7)) * 0.75 : -0.32 + Math.max(0, Math.sin(phase + 0.7)) * 0.4) * movementBlend
        + (i === 2 && shift > 0 ? shift * 0.12 : i === 3 && shift < 0 ? -shift * 0.12 : 0);
    }
    const spineX = movementBlend * 0.02 + graze * 0.05, spineZ = shift * 0.012;
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
    body.position.y = lerp(body.position.y, breath * 0.006 * idle + Math.abs(Math.cos(stridePhase * 2)) * 0.02 * movementBlend, 1 - Math.exp(-20 * dt));
  }
  return { animate };
}

/** Animated by the caller so all markers share one scene clock. */
export function makeQuestMarker() {
  const group = new THREE.Group();
  group.name = 'quest-marker';
  const mat = material(0xf3c46a, { emissive: 0xc17f24, emissiveIntensity: 0.42, roughness: 0.36, metalness: 0.22 });
  const diamond = part(group, new THREE.OctahedronGeometry(0.128, 0), mat, [0, 0, 0], [0.85, 1.45, 0.85]);
  diamond.rotation.y = Math.PI / 4;
  const ring = part(group, new THREE.TorusGeometry(0.108, 0.014, 5, 18), material(0xffeac1, { emissive: 0xe5be70, emissiveIntensity: 0.45 }), [0, -0.23, 0]);
  ring.rotation.x = Math.PI / 2;
  group.traverse((object) => {
    if (object.isMesh) {
      object.castShadow = false;
      object.receiveShadow = false;
    }
  });
  return group;
}

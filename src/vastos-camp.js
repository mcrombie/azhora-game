import * as THREE from 'three';

/** World metres: an open patch on the eastern tableland, east of the watering pan.
 * This camp adds its own small solids after the world is built. It never clears
 * the atlas terrain, moves an erratic, or removes a river collider. */
export const VASTOS_CAMP = Object.freeze({
  id: 'vastos-herders-camp', name: 'The Common Water', x: -1387, z: -268, radius: 26,
  description: 'Two low hide shelters face the eastern approach across the cold tableland. A firepot, a common trough and a rope corral serve the herders who share this watering place; rival claimants have brought their papers to the same fire.',
});

const spot = (x, z, name, prompt) => Object.freeze({ x, z, name, prompt });
export const VASTOS_POSITIONS = Object.freeze({
  'vastos-herder': spot(-1385, -268, 'The Vastos herder', 'Speak with the herder'),
  'vastos-republican': spot(-1381, -275, 'The republican envoy', 'Speak with the republican envoy'),
  'vastos-monarchist': spot(-1381, -261, 'The monarchist claimant', 'Speak with the monarchist claimant'),
  'vastos-stray-west': spot(-1450, -270, 'The western stray', 'Bring the western stray home'),
  'vastos-stray-east': spot(-1340, -295, 'The eastern stray', 'Bring the eastern stray home'),
  'vastos-stray-ridge': spot(-1372, -322, 'The ridge stray', 'Bring the ridge stray home'),
  'vastos-watering': spot(-1385, -279, 'The common trough', 'Open the common watering place'),
  'vastos-covenant': spot(-1386, -263, 'The watering covenant', 'Read the watering covenant'),
  'vastos-route-notice': spot(-1375, -270, 'The republican route notice', 'Read the route notice'),
  'vastos-levy-manifest': spot(-1390, -273, 'The imperial levy manifest', 'Read the levy manifest'),
});

const OUTCOMES = Object.freeze({ republican: 0x9a3946, monarchist: 0x544575, mediation: 0x4b897c });
const STRAYS = ['west', 'east', 'ridge'];
const CORRAL = [{ x: -1402, z: -255.5 }, { x: -1399.6, z: -253.2 }, { x: -1403, z: -251.8 }];

/** One vertex-coloured draw per assembled prop, without a geometry utility import.
 * Temporary primitives are immediately released; only the merged geometry lives. */
function batch() {
  const positions = [], normals = [], colours = [];
  const matrix = new THREE.Matrix4(), rotation = new THREE.Quaternion(), scale = new THREE.Vector3();
  const point = new THREE.Vector3(), tint = new THREE.Color();
  function add(geometry, colour, x, y, z, sx = 1, sy = 1, sz = 1, rx = 0, ry = 0, rz = 0) {
    const flat = geometry.index ? geometry.toNonIndexed() : geometry;
    rotation.setFromEuler(new THREE.Euler(rx, ry, rz));
    matrix.compose(point.set(x, y, z), rotation, scale.set(sx, sy, sz)); flat.applyMatrix4(matrix);
    const p = flat.attributes.position, n = flat.attributes.normal; tint.set(colour);
    for (let i = 0; i < p.count; i++) {
      positions.push(p.getX(i), p.getY(i), p.getZ(i));
      normals.push(n.getX(i), n.getY(i), n.getZ(i));
      colours.push(tint.r, tint.g, tint.b);
    }
    if (flat !== geometry) flat.dispose(); geometry.dispose();
  }
  return {
    box: (colour, x, y, z, w, h, d, rx = 0, ry = 0, rz = 0) => add(new THREE.BoxGeometry(1, 1, 1), colour, x, y, z, w, h, d, rx, ry, rz),
    round: (colour, x, y, z, r, h, top = r, rx = 0, ry = 0, rz = 0) => add(new THREE.CylinderGeometry(top, r, h, 8), colour, x, y, z, 1, 1, 1, rx, ry, rz),
    finish(material, name) {
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
      geometry.setAttribute('color', new THREE.Float32BufferAttribute(colours, 3));
      geometry.computeBoundingBox(); geometry.computeBoundingSphere();
      const mesh = new THREE.Mesh(geometry, material); mesh.name = name;
      mesh.castShadow = true; mesh.receiveShadow = true; mesh.userData.passable = true;
      return mesh;
    },
  };
}

export function createVastosCamp(scene, world) {
  const group = new THREE.Group(); group.name = VASTOS_CAMP.name; group.userData.vastosCamp = true;
  group.position.set(VASTOS_CAMP.x, 0, VASTOS_CAMP.z); scene.add(group);
  const material = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .94 });
  const waterMaterial = new THREE.MeshStandardMaterial({ color: 0x668e91, roughness: .22, metalness: .08 });
  const fireMaterial = new THREE.MeshStandardMaterial({ color: 0xef922e, emissive: 0xff680d, emissiveIntensity: .7, roughness: 1 });
  const built = batch(), ownedColliders = [], cattle = [], flags = new Map();
  const height = (x, z) => world.heightAt(x, z);
  const local = (x, z) => ({ x: x - VASTOS_CAMP.x, z: z - VASTOS_CAMP.z });
  const box = (colour, x, y, z, w, h, d, rx = 0, ry = 0, rz = 0) => {
    const p = local(x, z); built.box(colour, p.x, y, p.z, w, h, d, rx, ry, rz);
  };
  const round = (colour, x, y, z, r, h, top = r) => {
    const p = local(x, z); built.round(colour, p.x, y, p.z, r, h, top);
  };
  const solid = (x, z, dimensions) => ownedColliders.push({ x, z, ...dimensions, kind: 'vastos-camp' });
  const wood = 0x6c5138, dark = 0x463b30, hide = 0xa28b66, rope = 0xc0b58b;

  // Low, portable shelters face east: the tableland has no timber to build a town.
  for (const [x, z] of [[-1395, -278], [-1392, -258]]) {
    const y = height(x, z);
    for (const dx of [-2, 2]) for (const dz of [-1.4, 1.4]) {
      const poleHeight = dx < 0 ? 1.25 : 2.1;
      box(wood, x + dx, y + poleHeight / 2, z + dz, .14, poleHeight, .14);
    }
    box(hide, x, y + 1.77, z, 4.55, .12, 3.45, 0, 0, .21);
    box(0x887456, x - 2, y + .65, z, .09, 1.3, 2.9);
    box(0x8c7559, x, y + .65, z - 1.4, 4, 1.3, .09);
    box(0x8c7559, x, y + .65, z + 1.4, 4, 1.3, .09);
    box(0x645748, x - .9, y + .12, z, 1.7, .22, .8);
    round(0x917751, x + .6, y + .28, z + .75, .27, .56, .22);
    solid(x, z, { hx: 2.22, hz: 1.6 });
  }

  // Four low rails with a generous eastern gate. Each post follows the real turf.
  const fence = (a, b) => {
    const dx = b.x - a.x, dz = b.z - a.z, length = Math.hypot(dx, dz), count = Math.ceil(length / 2);
    const x = (a.x + b.x) / 2, z = (a.z + b.z) / 2, y = height(x, z), yaw = -Math.atan2(dz, dx);
    for (const level of [.48, .94]) box(rope, x, y + level, z, length, .07, .07, 0, yaw);
    for (let i = 0; i <= count; i++) {
      const px = a.x + dx * i / count, pz = a.z + dz * i / count;
      box(wood, px, height(px, pz) + .58, pz, .14, 1.16, .14);
    }
    solid(x, z, { hx: Math.abs(dx) / 2 + .09, hz: Math.abs(dz) / 2 + .09 });
  };
  fence({ x: -1405, z: -259 }, { x: -1405, z: -250 });
  fence({ x: -1405, z: -259 }, { x: -1397, z: -259 });
  fence({ x: -1405, z: -250 }, { x: -1397, z: -250 });
  fence({ x: -1397, z: -259 }, { x: -1397, z: -257 });
  fence({ x: -1397, z: -252 }, { x: -1397, z: -250 });

  // Firepot and the meeting pole. No point light is needed for a daylight camp.
  const fireX = -1390, fireZ = -268, fireY = height(fireX, fireZ);
  round(0x575652, fireX, fireY + .22, fireZ, .59, .42, .69);
  round(dark, fireX, fireY + .45, fireZ, .5, .08);
  solid(fireX, fireZ, { r: .68 });
  const fire = new THREE.Mesh(new THREE.ConeGeometry(.3, .5, 6), fireMaterial);
  fire.name = 'The common firepot'; fire.position.set(fireX - VASTOS_CAMP.x, fireY + .61, fireZ - VASTOS_CAMP.z); group.add(fire);
  const poleX = -1389, poleZ = -265.5, poleY = height(poleX, poleZ);
  box(wood, poleX, poleY + 1.95, poleZ, .12, 3.9, .12); solid(poleX, poleZ, { r: .12 });

  // The raised trough stays on dry ground; opening it exposes a water surface.
  const troughX = -1388, troughZ = -279, troughY = height(troughX, troughZ);
  box(dark, troughX, troughY + .24, troughZ, 3.2, .18, 1.05);
  for (const side of [-1, 1]) {
    box(wood, troughX, troughY + .52, troughZ + side * .5, 3.2, .55, .12);
    box(wood, troughX + side * 1.55, troughY + .52, troughZ, .12, .55, 1);
    box(dark, troughX + side * 1.1, troughY + .15, troughZ, .25, .3, .85);
  }
  solid(troughX, troughZ, { hx: 1.63, hz: .58 });
  const water = new THREE.Mesh(new THREE.BoxGeometry(2.94, .035, .81), waterMaterial);
  water.name = 'The opened common trough'; water.position.set(troughX - VASTOS_CAMP.x, troughY + .68, troughZ - VASTOS_CAMP.z); group.add(water);
  const stopper = new THREE.Mesh(new THREE.BoxGeometry(.4, .22, .85), material);
  // Reuse the vertex-coloured material by giving this small stopper its own colours.
  const stopperColours = new Float32Array(stopper.geometry.attributes.position.count * 3);
  const stopperTint = new THREE.Color(wood); for (let i = 0; i < stopperColours.length; i += 3) stopperTint.toArray(stopperColours, i);
  stopper.geometry.setAttribute('color', new THREE.BufferAttribute(stopperColours, 3));
  stopper.name = 'The trough stopper'; stopper.position.set(troughX - VASTOS_CAMP.x + 1.2, troughY + .8, troughZ - VASTOS_CAMP.z); group.add(stopper);

  // Papers have distinct silhouettes: covenant board, roadside notice and levy table.
  for (const [x, z, tint] of [[-1388, -262, 0xd6caa6], [-1375, -272, 0xc6b796]]) {
    const y = height(x, z); box(wood, x, y + .73, z, .13, 1.46, .13);
    box(wood, x, y + 1.35, z, 1.25, .92, .12); box(tint, x, y + 1.35, z + .075, 1.03, .73, .035);
    for (let line = 0; line < 3; line++) box(dark, x, y + 1.55 - line * .18, z + .098, .7 - line * .1, .035, .01);
    solid(x, z, { hx: .64, hz: .11 });
  }
  {
    const x = -1391.5, z = -273, y = height(x, z);
    box(wood, x, y + .78, z, 1.3, .12, .9);
    for (const dx of [-.5, .5]) for (const dz of [-.32, .32]) box(dark, x + dx, y + .38, z + dz, .1, .76, .1);
    box(0xd8cfb1, x, y + .85, z, .8, .035, .59); round(0x703f46, x + .22, y + .89, z + .08, .085, .025);
    solid(x, z, { hx: .66, hz: .46 });
  }
  // Small flat mats show where the three visitors have made room around the fire.
  for (const id of ['vastos-herder', 'vastos-republican', 'vastos-monarchist']) {
    const p = VASTOS_POSITIONS[id]; round(0x9b9478, p.x, height(p.x, p.z) + .025, p.z, .75, .035);
  }
  group.add(built.finish(material, 'The Common Water shelters, corral and papers'));

  for (const [outcome, colour] of Object.entries(OUTCOMES)) {
    const cloth = batch(); cloth.box(colour, .64, 0, 0, 1.18, .78, .04);
    if (outcome === 'republican') {
      for (const y of [-.23, .23]) cloth.box(0xe5d3a2, .64, y, .028, .92, .07, .025);
    } else if (outcome === 'monarchist') {
      cloth.box(0xe1bd61, .64, -.12, .028, .58, .12, .025);
      for (const x of [.4, .64, .88]) cloth.box(0xe1bd61, x, .035, .028, .1, .27, .025);
    } else {
      cloth.box(0xe9e5c8, .64, 0, .028, .9, .13, .025);
      cloth.box(0xe9e5c8, .64, 0, .028, .13, .55, .025);
    }
    const flag = cloth.finish(material, `Vastos ${outcome} settlement banner`);
    flag.position.set(poleX - VASTOS_CAMP.x, poleY + 3.23, poleZ - VASTOS_CAMP.z);
    flag.userData.outcome = outcome; group.add(flag); flags.set(outcome, flag);
  }

  // Three stocky longhorns, each in two merged draws so the head can graze.
  STRAYS.forEach((id, index) => {
    const animal = new THREE.Group(); animal.name = `Vastos ${id} stray`; animal.userData.strayId = id;
    const coat = [0x725440, 0x927b59, 0x5f5144][index], body = batch(), head = batch();
    body.box(coat, 0, 1.05, 0, .88, .83, 1.68); body.box(0x483e34, 0, 1.48, -.13, .61, .16, 1.21);
    body.box(coat, 0, 1.3, .76, .62, .68, .48, -.18);
    for (const x of [-.3, .3]) for (const z of [-.57, .56]) {
      body.box(coat, x, .43, z, .2, .83, .22); body.box(0x37352f, x, .075, z + .025, .22, .15, .26);
    }
    body.box(0x493d31, .06, .82, -.98, .08, .75, .08, -.22); body.box(0x39322b, .06, .43, -1.06, .16, .2, .12);
    head.box(coat, 0, 0, .08, .51, .58, .65); head.box(0xb09d7e, 0, -.2, .42, .47, .25, .27);
    for (const side of [-1, 1]) {
      head.box(coat, side * .36, .12, .04, .32, .15, .2, 0, 0, side * .25);
      head.round(0xd9ceb0, side * .45, .31, -.03, .09, .68, .035, 0, 0, -side * 1.1);
      head.round(0xe7ddc1, side * .76, .49, -.03, .05, .32, .008, 0, 0, -side * .28);
      head.box(0x292824, side * .265, .06, .24, .035, .055, .075);
    }
    animal.add(body.finish(material, `${id} longhorn body`));
    const face = head.finish(material, `${id} longhorn head`); face.position.set(0, 1.42, .96); animal.add(face); group.add(animal);
    cattle.push({ id, animal, face, recovered: false, index });
  });

  world.colliders.push(...ownedColliders); world.reindexColliders?.();
  let time = 0, currentOutcome = null, wateringOpened = false, disposed = false;
  function setState(state = {}) {
    if (disposed) return;
    const found = new Set(Array.isArray(state.strays) ? state.strays : []);
    wateringOpened = state.wateringOpened === true;
    currentOutcome = Object.hasOwn(OUTCOMES, state.outcome) ? state.outcome : null;
    water.visible = wateringOpened; stopper.visible = !wateringOpened;
    for (const [outcome, flag] of flags) flag.visible = currentOutcome === outcome;
    for (const cow of cattle) {
      cow.recovered = found.has(cow.id);
      const site = VASTOS_POSITIONS[`vastos-stray-${cow.id}`];
      // Leave a clear place in front of each animal for its interaction prompt.
      const p = cow.recovered ? CORRAL[cow.index] : { x: site.x - 1.6, z: site.z - 1.2 };
      cow.animal.position.set(p.x - VASTOS_CAMP.x, height(p.x, p.z), p.z - VASTOS_CAMP.z);
      cow.animal.rotation.y = cow.recovered ? .6 + cow.index * .75 : -.65 + cow.index * 1.1;
      cow.face.rotation.x = 0;
    }
  }
  setState();
  return {
    group,
    setState,
    update(dt, observer, playing = true) {
      if (disposed) return;
      const p = observer?.position ?? observer;
      group.visible = !p || Math.hypot(p.x - VASTOS_CAMP.x, p.z - VASTOS_CAMP.z) < 360;
      if (!group.visible || !playing) return;
      time += Math.max(0, Math.min(Number.isFinite(dt) ? dt : 0, .1));
      fire.scale.y = .91 + Math.sin(time * 7.1) * .09; fire.rotation.y = time * .2;
      for (const cow of cattle) cow.face.rotation.x = .13 + Math.sin(time * .6 + cow.index * 1.9) * .16;
      for (const flag of flags.values()) if (flag.visible) flag.rotation.y = Math.sin(time * 1.7) * .075;
    },
    metrics() {
      let drawCalls = 0, vertices = 0;
      group.traverse(object => { if (object.isMesh) { drawCalls++; vertices += object.geometry.attributes.position.count; } });
      return {
        id: VASTOS_CAMP.id, shelters: 2, cattle: cattle.length, drawCalls, vertices, colliders: ownedColliders.length,
        recovered: cattle.filter(cow => cow.recovered).length, wateringOpened, outcome: currentOutcome,
        flags: [...flags].filter(([, flag]) => flag.visible).map(([outcome]) => outcome), visible: group.visible, disposed,
        animals: cattle.map(cow => ({ id: cow.id, recovered: cow.recovered, x: cow.animal.position.x + VASTOS_CAMP.x, z: cow.animal.position.z + VASTOS_CAMP.z })),
      };
    },
    dispose() {
      if (disposed) return; disposed = true;
      group.removeFromParent();
      group.traverse(object => { if (object.isMesh) object.geometry.dispose(); });
      material.dispose(); waterMaterial.dispose(); fireMaterial.dispose();
      for (const collider of ownedColliders) {
        const index = world.colliders.indexOf(collider); if (index !== -1) world.colliders.splice(index, 1);
      }
      world.reindexColliders?.();
    },
  };
}

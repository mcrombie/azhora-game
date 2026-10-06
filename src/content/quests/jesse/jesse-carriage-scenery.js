import * as THREE from 'three';
import { createHorse } from '../../characters/characters.js';
import { CARRIAGE_PARTS, JESSE_WORKSHOP, JESSE_HORSE_OFFSET } from './jesse-carriage-world.js';

/** A small two-wheel road carriage, visible lesson stages, and the scattered
 * reusable parts. The horse and both riders share the carriage's saved feet. */
export function createJesseCarriageScenery({ parent, heightAt, colliders = [], movingGroups = new Set() }) {
  const root = new THREE.Group(); root.name = 'Jesse carriage workshop'; parent.add(root); movingGroups.add(root);
  const material = color => new THREE.MeshStandardMaterial({ color, roughness: .95, flatShading: true });
  const wood = material('#a58255'), pale = material('#c4a675'), dark = material('#50402e'), iron = material('#343c3b');
  const leather = material('#694432'), teal = material('#4d6f63'), brass = material('#bc9857');
  const cube = new THREE.BoxGeometry(1, 1, 1);
  function mesh(group, geometry, mat, x, y, z, sx = 1, sy = 1, sz = 1) {
    const m = new THREE.Mesh(geometry, mat); m.position.set(x, y, z); m.scale.set(sx, sy, sz);
    m.castShadow = true; m.receiveShadow = true; group.add(m); return m;
  }
  const box = (group, mat, x, y, z, sx, sy, sz) => mesh(group, cube, mat, x, y, z, sx, sy, sz);
  function wheel() {
    const group = new THREE.Group(); group.name = 'Spoked carriage wheel';
    const rim = mesh(group, new THREE.TorusGeometry(.51, .065, 5, 12), wood, 0, 0, 0); rim.rotation.y = Math.PI / 2;
    const band = mesh(group, new THREE.TorusGeometry(.55, .02, 4, 12), iron, 0, 0, 0); band.rotation.y = Math.PI / 2;
    const hub = mesh(group, new THREE.CylinderGeometry(.105, .105, .25, 8), dark, 0, 0, 0); hub.rotation.z = Math.PI / 2;
    for (let i = 0; i < 6; i++) { const spoke = box(group, pale, 0, 0, 0, .065, .99, .065); spoke.rotation.x = i * Math.PI / 6; }
    return group;
  }
  const bench = new THREE.Group(); root.add(bench);
  bench.position.set(JESSE_WORKSHOP.workbench.x, heightAt(JESSE_WORKSHOP.workbench.x, JESSE_WORKSHOP.workbench.z), JESSE_WORKSHOP.workbench.z);
  box(bench, wood, 0, .9, 0, 2.7, .14, 1);
  for (const x of [-1.05, 1.05]) for (const z of [-.35, .35]) box(bench, dark, x, .43, z, .13, .86, .13);
  box(bench, iron, .55, 1.02, .12, .33, .13, .16); box(bench, dark, .55, .97, -.2, .08, .07, .55);
  box(bench, pale, -.7, 1.02, 0, .5, .08, .25);
  colliders.push({ x: JESSE_WORKSHOP.workbench.x, z: JESSE_WORKSHOP.workbench.z, hx: 1.45, hz: .6, kind: 'jesse-workbench' });

  const loose = new Map();
  for (const part of CARRIAGE_PARTS) {
    const group = new THREE.Group(); group.name = part.name;
    group.position.set(part.x, heightAt(part.x, part.z), part.z); root.add(group); loose.set(part.id, group);
    if (part.kind === 'wheel') { const w = wheel(); w.position.y = .58; w.rotation.z = .2; group.add(w); }
    else if (part.kind === 'axle') {
      box(group, dark, 0, .2, 0, 2.2, .18, .18);
      for (const x of [-.85, .85]) box(group, iron, x, .2, 0, .12, .25, .25);
    } else for (let i = 0; i < 4; i++) box(group, pale, (i % 2) * .38 - .2, .08 + Math.floor(i / 2) * .15, 0, .34, .13, 2.2);
  }

  const carriage = new THREE.Group(); carriage.name = 'Jesse\'s road carriage'; carriage.rotation.order = 'YXZ'; root.add(carriage);
  const frame = new THREE.Group(), axle = new THREE.Group(), finish = new THREE.Group(); carriage.add(frame, axle, finish);
  for (const x of [-.65, .65]) box(frame, dark, x, .83, 0, .17, .22, 2.55);
  for (const z of [-1.05, 0, 1.05]) box(frame, wood, 0, .83, z, 1.5, .18, .16);
  for (let i = 0; i < 7; i++) box(frame, pale, -.7 + i * .23, .99, 0, .21, .12, 2.55);
  box(axle, dark, 0, .58, -.35, 2.35, .14, .14);
  const wheels = [-1, 1].map(side => { const w = wheel(); w.position.set(side * 1.1, .58, -.35); axle.add(w); return w; });
  // Shaped shafts hold the horse ahead of the carriage, not through its body.
  for (const side of [-1, 1]) box(finish, wood, side * .66, .83, 2.1, .09, .1, 2.4);
  for (const x of [-.84, .84]) {
    box(finish, wood, x, 1.25, 0, .09, .46, 2.55);
    for (const z of [-1.12, 1.12]) box(finish, dark, x, 1.45, z, .1, .62, .1);
  }
  for (const z of [-.72, .65]) {
    box(finish, leather, 0, 1.31, z, 1.52, .17, .5);
    box(finish, teal, 0, 1.55, z - .25, 1.5, .4, .08);
  }
  for (const x of [-.87, .87]) mesh(finish, new THREE.SphereGeometry(.06, 6, 4), brass, x, 1.7, 1.12);
  const driverAnchor = new THREE.Object3D(), passengerAnchor = new THREE.Object3D();
  driverAnchor.name = 'Jesse driver seat'; passengerAnchor.name = 'Traveler carriage seat';
  driverAnchor.position.set(0, .56, .65); passengerAnchor.position.set(0, .56, -.72);
  carriage.add(driverAnchor, passengerAnchor);
  const horse = createHorse({ variant: 0, saddled: false }); horse.group.name = 'Jesse carriage horse';
  // The animal keeps its own grounded feet. Parenting it beneath a pitched cart
  // would apply the slope twice and make it hover or sink along hillside roads.
  root.add(horse.group);
  // Narrow reins read as dark straps, with no magical towing gap.
  for (const side of [-1, 1]) {
    const rein = box(finish, leather, side * .26, 1.35, 2.15, .025, .025, 2.7); rein.rotation.x = -.08;
  }
  let turns = 0, lastWood = null;
  function update(time = 0, dt = 0, state) {
    if (!state) return;
    for (const part of CARRIAGE_PARTS) loose.get(part.id).visible = !state.collected.includes(part.id);
    frame.visible = state.assembly >= 1; axle.visible = state.assembly >= 2; finish.visible = state.assembly >= 3;
    const built = state.assembly === 3;
    horse.group.visible = true;
    const at = state.cart, ground = heightAt(at.x, at.z);
    carriage.position.set(at.x, ground, at.z); carriage.rotation.y = at.yaw;
    const dx = Math.sin(at.yaw), dz = Math.cos(at.yaw);
    const ahead = heightAt(at.x + dx, at.z + dz), behind = heightAt(at.x - dx, at.z - dz);
    // The body follows gentle road grade continuously, without camera bob.
    carriage.rotation.x = Math.max(-.22, Math.min(.22, -Math.atan2(ahead - behind, 2)));
    const horseAt = { x: at.x + dx * JESSE_HORSE_OFFSET, z: at.z + dz * JESSE_HORSE_OFFSET };
    horse.group.position.set(horseAt.x, heightAt(horseAt.x, horseAt.z), horseAt.z);
    horse.group.rotation.y = at.yaw;
    turns += Math.max(0, state.cartSpeed || 0) * Math.max(0, dt) / .55;
    wheels.forEach(w => { w.rotation.x = turns; });
    horse.animate(time, built ? state.cartSpeed : 0, true, { grazing: !built });
    if (lastWood !== state.timber) {
      lastWood = state.timber;
      wood.color.set(state.timber === 'walnut' ? '#6d4c34' : state.timber === 'oak' ? '#93714b' : '#a58255');
      pale.color.set(state.timber === 'walnut' ? '#926c4c' : state.timber === 'oak' ? '#af8b58' : '#c4a675');
    }
    carriage.updateMatrixWorld(true);
  }
  update(0, 0, { assembly: 0, collected: [], cart: JESSE_WORKSHOP.carriage });
  return Object.freeze({ root, carriage, horse, driverAnchor, passengerAnchor, update, loose });
}

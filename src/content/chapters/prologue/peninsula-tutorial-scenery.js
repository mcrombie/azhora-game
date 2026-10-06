import * as THREE from 'three';
import { createSceneryBuilder } from '../../../world/scenery/scenery-builder.js';
import { PENINSULA_TUTORIAL_ANCHORS as A, PENINSULA_TUTORIAL_PATHS, PENINSULA_HOME_ROUTE } from './peninsula-tutorial.js';

const distanceToSegment = (x, z, a, b) => {
  const dx = b.x - a.x, dz = b.z - a.z, t = Math.max(0, Math.min(1, ((x - a.x) * dx + (z - a.z) * dz) / (dx * dx + dz * dz || 1)));
  return Math.hypot(x - a.x - dx * t, z - a.z - dz * t);
};
export const PENINSULA_CLEARINGS = Object.freeze([
  [A.arrival, 4], [A.jojo, 4.5], [A.chris, 3], [A.walkingEnd, 4], [A.bear, 3.5],
  [A.ryan, 3], [A.jess, 3.8], [A.glun, 4], [A.dummy, 4], [A.cookfire, 3.4],
  [A.gate, 6], [A.graduation, 4],
].map(([at, r]) => Object.freeze({ ...at, r })));

/** Exclude only trunks along practical lesson paths and small stations; preserve
 * the rest of the oak/pine peninsula. Call before registering/scattering trees. */
export function tutorialSceneryClearAt(x, z, padding = 0) {
  if (x < -42 || x > 190 || z < -100 || z > 65) return false;
  if (Math.abs(x - A.gate.x) < 1.8 + padding && z > -94 - padding && z < -40 + padding) return true;
  if (PENINSULA_CLEARINGS.some(p => Math.hypot(x - p.x, z - p.z) < p.r + padding)) return true;
  for (const path of [...PENINSULA_TUTORIAL_PATHS, PENINSULA_HOME_ROUTE]) {
    for (let i = 1; i < path.length; i++) if (distanceToSegment(x, z, path[i - 1], path[i]) < 2.3 + padding) return true;
  }
  return false;
}

export const PENINSULA_FISHING_SPOT = Object.freeze({
  id: 'peninsula-cove', name: 'The sheltered tutorial cove', x: A.fishingCast.x, z: A.fishingCast.z,
  radius: 8, surfaceY: .06, fishingSpot: Object.freeze({ x: 156, z: 32 }), lessonStand: Object.freeze({ x: 160, z: 29 }),
  castPoint: Object.freeze({ ...A.fishingCast, y: .095 }),
});

function label(text) {
  if (typeof document === 'undefined') return new THREE.MeshStandardMaterial({ color: '#e7d8aa', roughness: 1 });
  const canvas = document.createElement('canvas'); canvas.width = 768; canvas.height = 128;
  const ctx = canvas.getContext('2d'); ctx.fillStyle = '#745539'; ctx.fillRect(0, 0, 768, 128);
  ctx.strokeStyle = '#ac895d'; ctx.lineWidth = 9; ctx.strokeRect(6, 6, 756, 116);
  ctx.font = 'bold 50px Georgia'; ctx.fillStyle = '#f6e6b8'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(text, 384, 66);
  const map = new THREE.CanvasTexture(canvas); map.colorSpace = THREE.SRGBColorSpace;
  return new THREE.MeshStandardMaterial({ map, roughness: .94, side: THREE.DoubleSide });
}

/** A modest teaching camp, not a village. The host reuses the existing six
 * teachers and Chris; this builds no new NPC, house or substitute collision wall. */
export function createPeninsulaTutorialScenery({ parent, heightAt, colliders = [], movingGroups = null } = {}) {
  const root = new THREE.Group(); root.name = 'Peninsula training shore'; parent.add(root);
  const b = createSceneryBuilder('Peninsula pier, lesson posts and camp'), paths = PENINSULA_TUTORIAL_PATHS.map(p => Object.assign(p.map(v => ({ ...v })), { width: p.width, kind: p.kind, id: p.id }));
  paths.push(Object.assign(PENINSULA_HOME_ROUTE.map(v => ({ ...v })), { width: 2.8, kind: 'path', id: 'peninsula-mainland-trail' }));
  const ground = p => heightAt(p.x, p.z), deckY = 1.98;
  const walkSurfaces = [
    { id: 'peninsula-pier-deck', kind: 'deck', a: { x: 142, y: deckY, z: 53 }, b: { x: 156, y: deckY, z: 53 }, width: 3.8 },
    { id: 'peninsula-pier-ramp', kind: 'ramp', a: { x: 156, y: deckY, z: 53 }, b: { x: 162, y: heightAt(162, 53) + .04, z: 53 }, width: 3.8 },
  ];
  for (let x = 142; x <= 156; x += .65) b.box('#9b7c51', x, deckY - .11, 53, .57, .2, 3.8);
  b.beam('#6c5338', [142, deckY - .25, 51.5], [158, deckY - .25, 51.5], .23);
  b.beam('#6c5338', [142, deckY - .25, 54.5], [158, deckY - .25, 54.5], .23);
  for (const x of [142.4, 147, 151.6, 156.2]) for (const z of [51.2, 54.8]) {
    const bottom = heightAt(x, z) - .3; b.cylinder('#675039', x, bottom, z, .18, deckY + .85 - bottom);
    if (x < 155) b.rock('#b39e73', x, deckY + .85, z, .25, .14, .25);
  }
  const ramp = walkSurfaces[1];
  for (let i = 0; i < 10; i++) {
    const t = (i + .5) / 10, x = ramp.a.x + (ramp.b.x - ramp.a.x) * t;
    const y = ramp.a.y + (ramp.b.y - ramp.a.y) * t;
    b.box('#ac8958', x, y - .075, 53, .58, .14, 3.8);
  }
  // The boat is visibly moored at the new arrival pier, facing the open inlet.
  b.frame(143.5, .23, 57.8, Math.PI / 2, () => {
    b.box('#624837', 0, .3, 0, 2.1, .52, 5.8);
    for (const side of [-1, 1]) b.box('#94704d', side * 1.05, .73, 0, .18, .68, 5.9, 0, 0, side * -.13);
    for (const z of [-2, 0, 2]) b.box('#b8935c', 0, .65, z, 2, .14, .3);
    b.triangle('#77583c', [-1.1, .86, 2.9], [1.1, .86, 2.9], [0, .7, 4]);
    b.triangle('#77583c', [1.1, .86, -2.9], [-1.1, .86, -2.9], [0, .7, -4]);
  });
  function sign(at, text, yaw = -Math.PI / 2, width = 2.7) {
    const y = ground(at); b.block('#6f543c', at.x, y, at.z, .16, 1.9, .16);
    const plate = new THREE.Mesh(new THREE.PlaneGeometry(width, .45), label(text)); plate.name = text;
    plate.userData.label = text; plate.position.set(at.x, y + 1.75, at.z); plate.rotation.y = yaw; root.add(plate);
    colliders.push({ x: at.x, z: at.z, r: .16, kind: 'tutorial-sign' });
  }
  sign({ x: 161, z: 56.8 }, 'A first step', -.7);
  sign({ x: 174, z: -4 }, 'Glun — arms practice', -.7, 3.4);
  sign({ x: 160, z: 6 }, 'Jess — sheltered swim', -1.1, 3.4);
  sign({ x: 102.5, z: -61 }, 'Tidewater Haven', Math.PI / 2, 3.2);
  // Low white posts identify the walk destination without an arcade obstacle course.
  for (const x of [178.8, 183.2]) {
    const y = heightAt(x, 44); b.cylinder('#715438', x, y, 44, .13, .9);
    b.cylinder('#e3d9b3', x, y + .66, 44, .139, .24);
  }
  // Ryan's rod rack, a chart table and benches give each clearing a purpose.
  b.frame(A.ryan.x + 2.5, ground({ x: A.ryan.x + 2.5, z: A.ryan.z }), A.ryan.z, 0, () => {
    b.box('#7e6041', 0, .72, 0, 1.5, .12, .18);
    for (const x of [-.65, .65]) b.block('#7e6041', x, 0, 0, .1, .85, .1);
    for (let i = 0; i < 3; i++) b.beam('#bca878', [-.5 + i * .5, .07, .05], [-.7 + i * .5, 2.1, .32], .035);
  });
  b.frame(A.bear.x + 2.3, ground({ x: A.bear.x + 2.3, z: A.bear.z }), A.bear.z, .15, () => {
    b.box('#b2925e', 0, .77, 0, 1.8, .13, 1.1);
    for (const x of [-.7, .7]) for (const z of [-.35, .35]) b.block('#74543a', x, 0, z, .13, .72, .13);
    b.box('#e2d49e', 0, .85, 0, 1.3, .015, .78);
    b.beam('#65847e', [-.4, .862, -.25], [.15, .862, .23], .03);
    b.beam('#65847e', [.15, .862, .23], [.46, .862, -.15], .03);
  });
  // Real straw dummy at the exact combat target exposed to the host.
  const dy = ground(A.dummy);
  b.block('#75563a', A.dummy.x, dy, A.dummy.z, .2, 2.1, .2);
  b.box('#aa8d54', A.dummy.x, dy + 1.35, A.dummy.z, .73, .88, .54);
  b.rock('#c5aa68', A.dummy.x, dy + 2.03, A.dummy.z, .37, .36, .32);
  b.box('#a68953', A.dummy.x, dy + 1.67, A.dummy.z, 1.8, .21, .24);
  b.box('#75563a', A.dummy.x, dy + 1.09, A.dummy.z + .284, .82, .085, .04);
  colliders.push({ ...A.dummy, r: .43, kind: 'tutorial-dummy' });
  const fy = ground(A.cookfire);
  for (let i = 0; i < 10; i++) { const a = i * Math.PI / 5; b.rock('#777b69', A.cookfire.x + Math.sin(a) * .66, fy + .16, A.cookfire.z + Math.cos(a) * .66, .23, .19, .24, a); }
  for (const a of [-.6, .6]) b.box('#624132', A.cookfire.x, fy + .15, A.cookfire.z, 1.05, .18, .17, a);
  for (let i = 0; i < 5; i++) b.cone(i % 2 ? '#f0aa36' : '#e77730', A.cookfire.x + Math.sin(i * 2) * .21, fy + .24, A.cookfire.z + Math.cos(i * 2) * .21, .16, .48 + (i % 2) * .2);
  b.beam('#4c4c43', [A.cookfire.x - .9, fy + .05, A.cookfire.z], [A.cookfire.x - .9, fy + 1.1, A.cookfire.z], .055);
  b.beam('#4c4c43', [A.cookfire.x + .9, fy + .05, A.cookfire.z], [A.cookfire.x + .9, fy + 1.1, A.cookfire.z], .055);
  b.beam('#4c4c43', [A.cookfire.x - .9, fy + 1.1, A.cookfire.z], [A.cookfire.x + .9, fy + 1.1, A.cookfire.z], .055);
  colliders.push({ ...A.cookfire, r: .65, kind: 'tutorial-firepit' });
  // Blue lesson buoy, then widely spaced red markers toward dangerous open water.
  for (const [at, tint] of [[A.swimTurn, '#579fb4'], [{ x: 125, z: 12 }, '#b46751'], [{ x: 130, z: 49 }, '#b46751']]) {
    b.rock(tint, at.x, .28, at.z, .43, .36, .43); b.cylinder('#e0ce9c', at.x, .45, at.z, .045, 1.15);
    b.sheet(tint, [at.x, 1.53, at.z], [at.x + .8, 1.45, at.z], [at.x + .7, .99, at.z], [at.x, 1.05, at.z]);
  }
  // A timber gate across the only dry neck; the boundary model catches climbing
  // and tailgating while keeping the reason visible in the world.
  const gateY = ground(A.gate), gate = new THREE.Group(); gate.name = 'Glun’s training gate'; gate.position.set(A.gate.x, gateY, A.gate.z - 2.2); root.add(gate); movingGroups?.add(gate);
  const gb = createSceneryBuilder('Training gate leaf');
  for (let i = 0; i < 9; i++) gb.stake('#947344', 0, 0, i * .51, .26, 2.15, 0, .16);
  for (const y of [.57, 1.66]) gb.box('#735439', 0, y, 2.15, .2, .16, 4.65);
  gb.beam('#735439', [0, .4, 0], [0, 1.94, 4.3], .14); gb.finish(gate);
  const gateCollider = { ...A.gate, hx: .3, hz: 2.4, kind: 'tutorial-gate' };
  for (const side of [-1, 1]) {
    const z = A.gate.z + side * 2.65, y = heightAt(A.gate.x, z);
    b.block('#64523a', A.gate.x, y, z, .35, 2.75, .35);
    colliders.push({ x: A.gate.x, z, r: .25, kind: 'tutorial-gate-post' });
    for (let j = 1; j <= 16; j++) {
      const zz = z + side * j * 1.4, yy = heightAt(A.gate.x, zz);
      b.stake('#827046', A.gate.x, yy, zz, .24, 1.9, 0, .22);
      colliders.push({ x: A.gate.x, z: zz, hx: .15, hz: .72, kind: 'tutorial-fence' });
      if (j < 16) for (const lift of [.64, 1.48]) b.beam('#827046', [A.gate.x, yy + lift, zz], [A.gate.x, heightAt(A.gate.x, zz + side * 1.4) + lift, zz + side * 1.4], .14);
    }
  }
  b.finish(root);
  let open = true;
  function setOpen(value) {
    open = !!value; gate.rotation.y = open ? Math.PI * .47 : 0;
    const index = colliders.indexOf(gateCollider);
    if (open && index >= 0) colliders.splice(index, 1);
    if (!open && index < 0) colliders.push(gateCollider);
  }
  setOpen(true); // An old save is never fenced in by loading the new scenery.
  root.traverse(object => { if (object.isMesh) { object.castShadow = true; object.receiveShadow = true; object.userData.passable = true; } });
  return { root, anchors: A, paths, walkSurfaces, fishingSpot: PENINSULA_FISHING_SPOT,
    fire: { ...A.cookfire, id: 'peninsula-cookfire', lit: true },
    gate: { setOpen, get open() { return open; } },
  };
}

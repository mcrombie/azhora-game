/**
 * The red-tailed hawk that rides Lakota's glove (her flight: src/hawk-flight.js).
 * Brown back, a cream breast crossed by a dark belly band, the brick-red tail an
 * adult earns in her second year, a hooked dark beak over a yellow cere, yellow
 * feet. About half a metre long, a metre and a quarter across the wings. The
 * group's origin is at her feet and she faces +Z.
 */
import * as THREE from 'three';

const mat = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: .88, flatShading: true, ...extra });

export function createRedTailHawk() {
  const group = new THREE.Group(); group.name = 'Red-tailed hawk';
  const brown = mat(0x6a4a2d), dark = mat(0x3f2b1b), cream = mat(0xeee0c3), rufous = mat(0xb2502e), beak = mat(0x2f2f33), cere = mat(0xe2bd4a), feet = mat(0xdcb445), eye = mat(0x1d1812);
  const sphere = new THREE.SphereGeometry(1, 8, 6), box = new THREE.BoxGeometry(1, 1, 1), cone = new THREE.ConeGeometry(1, 1, 5), cylinder = new THREE.CylinderGeometry(1, 1, 1, 5);
  const add = (parent, geometry, material, position, scale, rotation = [0, 0, 0]) => {
    const mesh = new THREE.Mesh(geometry, material); mesh.position.set(...position); mesh.scale.set(...scale); mesh.rotation.set(...rotation);
    mesh.castShadow = true; parent.add(mesh); return mesh;
  };
  const body = new THREE.Group(); body.name = 'Hawk body'; body.position.set(0, .085, 0); group.add(body);
  add(body, sphere, brown, [0, .03, 0], [.085, .085, .17]);
  add(body, sphere, cream, [0, -.005, .045], [.075, .075, .13]);
  // The belly band: a row of dark streaks across the lower breast.
  for (const x of [-.045, -.015, .015, .045]) add(body, sphere, dark, [x, -.03, .05], [.018, .02, .03]);
  const head = new THREE.Group(); head.name = 'Hawk head'; head.position.set(0, .07, .15); body.add(head);
  add(head, sphere, brown, [0, 0, 0], [.055, .055, .062]);
  add(head, sphere, cream, [0, -.028, .022], [.038, .028, .04]);
  add(head, cone, beak, [0, -.012, .07], [.017, .05, .017], [Math.PI / 2 + .55, 0, 0]);
  add(head, sphere, cere, [0, .006, .055], [.018, .012, .012]);
  for (const side of [-1, 1]) add(head, sphere, eye, [side * .034, .014, .036], [.009, .011, .008]);
  const tail = new THREE.Group(); tail.name = 'Hawk tail'; tail.position.set(0, .03, -.16); body.add(tail);
  add(tail, box, rufous, [0, 0, -.1], [.1, .014, .2]);
  add(tail, box, dark, [0, .001, -.195], [.1, .015, .014]);
  const wings = [-1, 1].map(side => {
    const wing = new THREE.Group(); wing.name = side < 0 ? 'Hawk left wing' : 'Hawk right wing'; wing.position.set(side * .06, .06, .03); body.add(wing);
    add(wing, sphere, brown, [side * .28, 0, -.02], [.29, .016, .12]);
    add(wing, sphere, cream, [side * .26, -.008, -.01], [.25, .008, .1]);
    add(wing, box, dark, [side * .55, 0, -.05], [.1, .012, .1], [0, side * .25, 0]);
    return { wing, side };
  });
  const legs = new THREE.Group(); legs.name = 'Hawk legs'; group.add(legs);
  for (const side of [-1, 1]) {
    add(legs, cylinder, feet, [side * .025, .045, .01], [.011, .09, .011]);
    for (const toe of [-.35, 0, .35]) add(legs, box, feet, [side * .025 + Math.sin(toe) * .02, .004, .02 + Math.cos(toe) * .018], [.008, .008, .04], [0, toe, 0]);
  }

  /** Place her and set her wings: `step` from createHawkFlight().update, `time` in seconds. */
  function pose(step, time = 0) {
    if (!step) return;
    group.position.set(step.x, step.y, step.z);
    group.rotation.y = step.yaw ?? 0;
    const perched = step.wings === 'perched';
    // Upright on the fist; level in the air, banked into the turn.
    body.rotation.x = perched ? -.95 : 0;
    body.rotation.z = perched ? 0 : -(step.bank ?? 0);
    body.position.y = perched ? .1 : 0;
    head.rotation.x = perched ? .85 : 0;
    tail.rotation.x = perched ? .45 : .05;
    tail.scale.x = perched ? 1 : 1.7;
    legs.visible = perched || step.wings === 'braking';
    for (const { wing, side } of wings) {
      if (perched) { wing.rotation.set(0, side * 1.3, side * .45); wing.scale.set(.45, 1, 1); continue; }
      wing.scale.set(1, 1, 1);
      const beat = step.wings === 'flapping' ? Math.sin(time * 11) * .65 : 0;
      const lift = step.wings === 'braking' ? -.55 : step.wings === 'soaring' ? -.12 : -.05;
      wing.rotation.set(0, step.wings === 'braking' ? side * -.3 : 0, side * (lift + beat));
    }
  }
  pose({ x: 0, y: 0, z: 0, yaw: 0, wings: 'perched' });
  return { group, pose };
}

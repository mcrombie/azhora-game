import * as THREE from 'three';

/**
 * Batman, as he actually is rather than as Katy draws him.
 *
 * Not a man in a costume and not a man with wings stuck on: a beast. He stands
 * a head and a half taller than a tall man and never quite upright, hunched
 * forward off long arms, the weight carried on the knuckles when he is still.
 * He is furred everywhere but the membrane — dark, close, rain-matted fur over
 * a chest like a barrel and a gaunt waist. The wings are his arms: the membrane
 * runs from each ankle up to a wrist and out along four finger bones longer than
 * the arm itself, and when he folds them they hang down him like a ragged cloak,
 * which is exactly what every witness has ever called it.
 *
 * The head is a bat's and nothing else: a short muzzle, a nose folded like a leaf,
 * a mouth that does not close over its teeth, and ears the length of a forearm that
 * move independently and are never still. The eyes are small and set deep and take
 * the light like an animal's at the edge of a fire, which is the detail that makes
 * people run.
 *
 * He is a good man, in the sense that matters. He is also plainly a monster, and he
 * knows it, and it is the whole cost of the thing. Speech comes hard — it is the
 * wrong throat for it — so he says as little as will do.
 *
 * `createBatman()` returns { group, update(seconds, { flare }) }. Pure three: no DOM.
 */
const mat = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: .84, flatShading: true, ...extra });
const ball = new THREE.IcosahedronGeometry(1, 1), tube = new THREE.CylinderGeometry(1, 1, 1, 7), cone = new THREE.ConeGeometry(1, 1, 6);
const slab = new THREE.BoxGeometry(1, 1, 1);

function add(parent, geometry, material, [x, y, z], [sx, sy, sz] = [1, 1, 1], [rx, ry, rz] = [0, 0, 0]) {
  const m = new THREE.Mesh(geometry, material);
  m.position.set(x, y, z); m.scale.set(sx, sy, sz); m.rotation.set(rx, ry, rz);
  m.castShadow = true; parent.add(m); return m;
}

/** The fur: clumps rather than strands, the way everything else in this world is made. */
function pelt(parent, material, points) {
  for (const [x, y, z, r] of points) add(parent, ball, material, [x, y, z], [r, r * .86, r * .92]);
}

export const BATMAN_HEIGHT = 2.35;

export function createBatman() {
  const group = new THREE.Group(); group.name = 'Batman';
  const rig = new THREE.Group(); group.add(rig);

  const fur = mat(0x2a221e), darkFur = mat(0x1d1815), membrane = mat(0x3e2f38, { side: THREE.DoubleSide, roughness: .78 });
  const claw = mat(0xb9b2a0, { roughness: .5 }), teeth = mat(0xe4ddc9, { roughness: .45 });
  const inner = mat(0x5a3a3c), eyeMat = mat(0xd9a03c, { emissive: 0x6b4a10, emissiveIntensity: .6, roughness: .3 });

  // The trunk: a deep chest carried forward, a narrow waist, a heavy shoulder girdle.
  const chest = new THREE.Group(); chest.position.set(0, 1.42, .06); rig.add(chest);
  add(chest, ball, fur, [0, 0, 0], [.42, .38, .34]);
  add(chest, ball, darkFur, [0, -.12, .16], [.3, .24, .2]);
  pelt(chest, fur, [[-.3, .2, -.02, .16], [.3, .2, -.02, .16], [0, .24, -.1, .18], [0, -.3, -.02, .2]]);
  add(rig, ball, fur, [0, 1.06, .02], [.24, .26, .22]);
  add(rig, tube, fur, [0, .86, -.02], [.2, .3, .18]);

  // Legs: short thighs, long shins, a bird's backward crook, and feet that grip.
  for (const side of [-1, 1]) {
    const hip = new THREE.Group(); hip.position.set(side * .17, .82, 0); rig.add(hip);
    add(hip, tube, fur, [0, -.16, .04], [.15, .34, .16], [.34, 0, 0]);
    add(hip, ball, fur, [0, -.34, .14], [.13, .12, .13]);
    add(hip, tube, fur, [0, -.56, .05], [.11, .42, .12], [-.26, 0, 0]);
    const foot = new THREE.Group(); foot.position.set(0, -.76, -.02); hip.add(foot);
    add(foot, slab, darkFur, [0, -.03, .06], [.19, .07, .26]);
    for (const toe of [-1, 0, 1]) {
      add(foot, cone, claw, [toe * .06, -.045, .2], [.028, .1, .028], [1.5, 0, 0]);
    }
    add(foot, cone, claw, [0, -.045, -.1], [.026, .08, .026], [-1.5, 0, 0]);
  }

  // The wings are the arms. Each one: upper arm, forearm, a thumb claw at the wrist, and four
  // finger bones that carry the membrane. Folded, they hang down his sides like a torn cloak.
  const wings = [];
  for (const side of [-1, 1]) {
    const shoulder = new THREE.Group(); shoulder.position.set(side * .38, 1.52, .02); rig.add(shoulder);
    shoulder.rotation.z = side * .5;
    wings.push(shoulder);
    add(shoulder, ball, fur, [0, 0, 0], [.16, .15, .16]);
    add(shoulder, tube, fur, [side * .04, -.22, 0], [.1, .44, .1]);
    const elbow = new THREE.Group(); elbow.position.set(side * .07, -.44, 0); shoulder.add(elbow);
    elbow.rotation.z = side * -.35;
    add(elbow, ball, fur, [0, 0, 0], [.1, .1, .1]);
    add(elbow, tube, fur, [0, -.24, 0], [.075, .48, .075]);
    const wrist = new THREE.Group(); wrist.position.set(0, -.5, 0); elbow.add(wrist);
    add(wrist, ball, fur, [0, 0, 0], [.08, .08, .08]);
    // The thumb: the only finger left short, and the only one he can use as a hand. It is a hook.
    add(wrist, cone, claw, [side * .05, .06, .06], [.03, .14, .03], [-.5, 0, side * -.5]);
    // Four finger bones, fanned and swept back, with the membrane slung between them.
    const fingers = [[.06, .62], [.24, .74], [.44, .78], [.64, .66]];
    for (const [spread, length] of fingers) {
      const bone = new THREE.Group(); bone.position.set(0, 0, 0); wrist.add(bone);
      bone.rotation.z = side * spread; bone.rotation.x = -.12;
      add(bone, tube, darkFur, [0, -length / 2, 0], [.022, length, .022]);
      add(bone, cone, claw, [0, -length - .03, 0], [.02, .07, .02], [Math.PI, 0, 0]);
      add(bone, slab, membrane, [side * .13, -length / 2, -.01], [.3, length, .006]);
    }
    // The arm membrane, from the wrist back down to the ankle: the part that makes the cloak.
    const sheet = add(wrist, slab, membrane, [side * -.1, -.18, -.06], [.26, .8, .006]);
    sheet.rotation.z = side * -.16;
  }

  // The head. A bat's, at the end of a thick neck carried forward.
  const head = new THREE.Group(); head.position.set(0, 1.78, .12); rig.add(head);
  add(head, ball, fur, [0, 0, 0], [.2, .19, .2]);
  pelt(head, fur, [[-.14, .1, -.1, .09], [.14, .1, -.1, .09], [0, .04, -.17, .1]]);
  // The muzzle: short, wrinkled, and open. The nose folds back on itself like a leaf.
  add(head, ball, darkFur, [0, -.05, .17], [.12, .1, .12]);
  add(head, ball, inner, [0, -.1, .25], [.07, .05, .05]);
  add(head, cone, darkFur, [0, .01, .26], [.05, .09, .03], [-.2, 0, 0]);
  // The mouth does not close over the teeth.
  add(head, slab, inner, [0, -.13, .24], [.13, .04, .06]);
  for (const side of [-1, 1]) {
    add(head, cone, teeth, [side * .045, -.115, .27], [.016, .05, .016], [Math.PI, 0, 0]);
    add(head, cone, teeth, [side * .085, -.1, .24], [.013, .035, .013], [Math.PI, 0, 0]);
    add(head, cone, teeth, [side * .05, -.16, .26], [.012, .032, .012]);
  }
  // Eyes, small and deep and catching the light the way an animal's does at the edge of a fire.
  const eyes = [];
  for (const side of [-1, 1]) {
    add(head, ball, darkFur, [side * .095, .03, .16], [.05, .045, .04]);
    eyes.push(add(head, ball, eyeMat, [side * .095, .03, .185], [.029, .028, .022]));
  }
  // The ears: as long as a forearm, ribbed, and never still. They move separately.
  const ears = [];
  for (const side of [-1, 1]) {
    const ear = new THREE.Group(); ear.position.set(side * .13, .15, -.02); head.add(ear);
    ear.rotation.z = side * .3; ear.rotation.x = -.18;
    ears.push(ear);
    add(ear, cone, fur, [0, .2, 0], [.075, .44, .045]);
    add(ear, cone, inner, [0, .19, .02], [.05, .38, .02]);
    add(ear, slab, darkFur, [side * .03, .12, .01], [.012, .2, .01], [0, 0, side * -.1]);
  }

  /**
   * He breathes deep and slow, the ears work the whole time, and he shifts his weight without
   * ever standing straight. `flare` (0..1) opens the wings off his sides, for when he means it.
   */
  function update(seconds, { flare = 0 } = {}) {
    const breath = Math.sin(seconds * .9), sway = Math.sin(seconds * .31);
    rig.position.y = breath * .012;
    rig.rotation.x = .2 + breath * .01;
    rig.rotation.y = sway * .05;
    chest.scale.set(1 + breath * .02, 1 + breath * .015, 1 + breath * .025);
    head.rotation.y = Math.sin(seconds * .23 + 1) * .3;
    head.rotation.x = -.05 + Math.sin(seconds * .41) * .06;
    for (const [index, ear] of ears.entries()) {
      const side = index ? 1 : -1;
      ear.rotation.z = side * (.3 + Math.sin(seconds * (index ? 1.7 : 2.3) + index) * .12);
      ear.rotation.x = -.18 + Math.sin(seconds * (index ? 3.1 : 2.6)) * .07;
    }
    for (const [index, wing] of wings.entries()) {
      const side = index ? 1 : -1;
      // Folded, they hang down his sides. Flared, they go out and up and he is suddenly twice as wide,
      // which is the entire point of the gesture and the reason people fall over backwards.
      wing.rotation.z = side * (.5 + flare * 1.15 + Math.sin(seconds * .37 + index) * .02);
      wing.rotation.x = flare * -.28;
      wing.rotation.y = side * flare * -.42;
    }
    for (const eye of eyes) eye.material.emissiveIntensity = .5 + Math.pow(Math.max(0, Math.sin(seconds * .5)), 3) * .5;
  }

  update(0);
  return { group, rig, head, wings, ears, update };
}

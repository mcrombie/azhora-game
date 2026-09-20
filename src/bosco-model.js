import * as THREE from 'three';
import { BOSCO } from './bosco.js';

/**
 * Bosco (src/bosco.js), built small and round on purpose.
 *
 * The shape is the joke and the joke is affectionate: an apple head far too big
 * for the body, ears like a fruit bat with the left one never quite standing,
 * eyes too big for the head, a stub of a muzzle with a wiry terrier beard, and a
 * barrel slung between four legs of almost no length at all. He is plump. The
 * belly clears the ground by about as much as a loaf of bread does.
 *
 * `setDye(colour)` puts one of Brandy's impossible colours on his flank, ear and
 * tail, which is where he keeps getting it. `update(seconds, { speed, sitting })`
 * drives the waddle — short legs mean a high step rate and a lot of side-to-side —
 * the sit, the ear that bounces a beat behind the rest of him, and the tail, which
 * is on whenever he is awake.
 */
const mat = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: .82, flatShading: true, ...extra });
const ball = new THREE.IcosahedronGeometry(1, 2), tube = new THREE.CylinderGeometry(1, 1, 1, 7), cone = new THREE.ConeGeometry(1, 1, 6);

function add(parent, geometry, material, [x, y, z], [sx, sy, sz] = [1, 1, 1], [rx, ry, rz] = [0, 0, 0]) {
  const m = new THREE.Mesh(geometry, material);
  m.position.set(x, y, z); m.scale.set(sx, sy, sz); m.rotation.set(rx, ry, rz);
  m.castShadow = true; parent.add(m); return m;
}

export function createBosco({ dye = 0xff3fa4 } = {}) {
  const group = new THREE.Group(); group.name = 'Bosco';
  const rig = new THREE.Group(); group.add(rig);

  const coat = mat(BOSCO.coat), cream = mat(BOSCO.cream), dark = mat(BOSCO.dark);
  const nose = mat(0x2a2320), eye = mat(0x1b1613), shine = mat(0xf4f1e8), inner = mat(0xd98f93);
  const tongue = mat(0xc96a72), pad = mat(0x4a3a30), dyed = mat(dye);

  // ---- the barrel ------------------------------------------------------------------
  const spine = new THREE.Group(); spine.position.set(0, .165, 0); rig.add(spine);
  add(spine, ball, coat, [0, 0, -.02], [.125, .118, .17]);          // the loaf
  add(spine, ball, coat, [0, .01, .1], [.115, .108, .1]);            // shoulders
  add(spine, ball, cream, [0, -.06, 0], [.1, .075, .15]);            // the pale underside
  // The dye: a print of whatever vat he last slept against, down one flank.
  const flank = add(spine, ball, dyed, [-.085, .015, -.05], [.06, .085, .105]);
  flank.name = 'Bosco’s dye';

  // ---- the head, which is too big ---------------------------------------------------
  const neck = new THREE.Group(); neck.position.set(0, .055, .16); spine.add(neck);
  const head = new THREE.Group(); head.position.set(0, .045, .045); neck.add(head);
  add(head, ball, coat, [0, 0, 0], [.105, .1, .095]);                // the apple
  add(head, ball, cream, [0, -.045, .05], [.07, .05, .07]);
  // A blaze up the middle of the face, which is what makes him look permanently hopeful.
  add(head, ball, cream, [0, .04, .07], [.022, .05, .05]);
  // The muzzle: short, and a wiry beard on it he has not earned.
  const muzzle = add(head, ball, cream, [0, -.025, .085], [.045, .038, .05]);
  add(head, ball, nose, [0, .002, .125], [.019, .016, .015]);
  for (const side of [-1, 1]) {
    add(head, cone, cream, [side * .035, -.045, .1], [.016, .05, .016], [-1.3, 0, side * .35]);   // beard
    add(head, cone, coat, [side * .045, .055, .07], [.02, .035, .012], [-1.1, 0, side * .4]);     // eyebrow tufts
  }
  add(head, tube, tongue, [0, -.055, .105], [.016, .004, .03]);
  // Eyes: too big, and wet-looking, which is the entire face.
  const eyes = [];
  for (const side of [-1, 1]) {
    add(head, ball, eye, [side * .052, .022, .078], [.027, .028, .022]);
    eyes.push(add(head, ball, shine, [side * .059, .034, .094], [.008, .008, .006]));
  }
  // Ears like a fruit bat. The left one has never stood all the way up and never will.
  const ears = [];
  for (const side of [-1, 1]) {
    const ear = new THREE.Group(); ear.position.set(side * .062, .08, -.005); head.add(ear);
    ear.rotation.z = side * .22; ear.rotation.x = -.1;
    if (side < 0) ear.rotation.x = .55;                                // the one that gave up
    ears.push(ear);
    add(ear, cone, side < 0 ? dyed : coat, [0, .055, 0], [.042, .12, .028]);
    add(ear, cone, inner, [0, .05, .012], [.028, .09, .012]);
  }

  // ---- legs, which are not long ------------------------------------------------------
  const legs = [];
  for (const [side, z] of [[-1, .08], [1, .08], [-1, -.1], [1, -.1]]) {
    const hip = new THREE.Group(); hip.position.set(side * .068, .1, z); rig.add(hip);
    legs.push(hip);
    add(hip, tube, coat, [0, -.035, 0], [.032, .075, .034]);
    add(hip, ball, cream, [0, -.075, .008], [.033, .026, .04]);
    add(hip, ball, pad, [0, -.092, .012], [.028, .012, .03]);
  }
  // ---- the tail, which is always on --------------------------------------------------
  // A stub that goes up and then curls forward over his back, thick at the root and
  // tufted at the end, and moving the entire time he is awake.
  const tail = new THREE.Group(); tail.position.set(0, .2, -.15); rig.add(tail);
  add(tail, tube, dyed, [0, .035, -.012], [.026, .085, .026], [-.35, 0, 0]);
  add(tail, tube, dyed, [0, .085, .012], [.022, .07, .022], [-1.0, 0, 0]);
  add(tail, ball, cream, [0, .105, .045], [.03, .028, .03]);

  let clock = 0;
  /**
   * `speed` is how fast the host is actually moving him, `sitting` whether he has
   * parked. Short legs, so: quick steps, a lot of roll, and the whole back end going.
   */
  function update(seconds, { speed = 0, sitting = false } = {}) {
    clock = seconds;
    const moving = speed > .05;
    const step = clock * (moving ? 9 + speed * 1.6 : 2.2);
    const wag = Math.sin(clock * (sitting ? 9 : moving ? 13 : 6.5));
    // The waddle: he rolls, because he is wider than he is tall and has no patience.
    rig.rotation.z = moving ? Math.sin(step * .5) * .1 : Math.sin(clock * 1.1) * .012;
    rig.position.y = moving ? Math.abs(Math.sin(step)) * .012 : 0;
    spine.rotation.x = sitting ? -.5 : Math.sin(step) * .03;
    spine.position.y = sitting ? .135 : .165;
    // Sitting: the back end goes down, the front stays up, the head comes up to look at you.
    for (const [index, hip] of legs.entries()) {
      const front = index < 2, phase = step + (index % 2 ? Math.PI : 0) + (front ? 0 : .7);
      hip.rotation.x = sitting
        ? (front ? .05 : -1.25)
        : moving ? Math.sin(phase) * .7 : Math.sin(clock * 1.3 + index) * .03;
      hip.position.y = sitting && !front ? .062 : .1;
    }
    neck.rotation.x = sitting ? .28 : -.05 + Math.sin(clock * 1.7) * .04;
    head.rotation.x = sitting ? .1 : Math.sin(clock * 2.3) * .05;
    // The head tilt. It is deployed constantly and it works every time.
    head.rotation.z = Math.pow(Math.max(0, Math.sin(clock * .43)), 6) * .5;
    head.rotation.y = Math.sin(clock * .61) * .12;
    // The ear that stands bounces a beat behind the rest of him; the other one does not.
    ears[1].rotation.x = -.1 + (moving ? Math.sin(step - .6) * .16 : Math.sin(clock * 1.9) * .05);
    ears[0].rotation.x = .55 + (moving ? Math.sin(step - .8) * .1 : Math.sin(clock * 1.7) * .03);
    tail.rotation.z = wag * (sitting ? .8 : .95);
    tail.rotation.x = -.35 - Math.abs(wag) * .1;
    for (const shineBall of eyes) shineBall.position.x = Math.sign(shineBall.position.x) * (.059 + Math.sin(clock * .61) * .004);
  }

  /** He has been against another vat. */
  function setDye(colour) { dyed.color.set(colour); }

  update(0);
  return { group, update, setDye, get height() { return BOSCO.height; } };
}

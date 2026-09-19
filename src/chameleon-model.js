import * as THREE from 'three';

/**
 * Ed, the wine chameleon of Solis, as a figure: a big chameleon, tall and thin
 * the way they are, with a helmet crest, a spined back, turret eyes behind a
 * pair of dark wraparound sunglasses, gripping feet, and a tail curled round a
 * bottle that is never his. Drunk, his colours drift (greens, gold, a
 * contented wine-purple) and he sways, hiccups and flicks his tongue; sober,
 * he goes a flat grey and keeps still.
 *
 * `createEdView` puts him in the world at a haunt (src/wine-chameleon.js) and
 * makes the purple puff he leaves behind when he goes.
 */
const mat = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: .7, ...extra });
const ball = new THREE.IcosahedronGeometry(1, 2), tube = new THREE.CylinderGeometry(1, 1, 1, 10), cone = new THREE.ConeGeometry(1, 1, 8);
function add(parent, geometry, material, [x, y, z], [sx, sy, sz] = [1, 1, 1], [rx, ry, rz] = [0, 0, 0]) {
  const m = new THREE.Mesh(geometry, material);
  m.position.set(x, y, z); m.scale.set(sx, sy, sz); m.rotation.set(rx, ry, rz);
  m.castShadow = true; parent.add(m); return m;
}
const DRUNK = [0x5fa84a, 0x3f9e7a, 0xb0a33a, 0x7a3f8f, 0x4f9f52].map(c => new THREE.Color(c)), SOBER = new THREE.Color(0x8a8f86);

export function createEdModel() {
  const group = new THREE.Group(); group.name = 'Ed';
  const rig = new THREE.Group(); group.add(rig);            // his sway and hiccups ride on this
  const skin = mat(0x5fa84a), belly = mat(0xd8d27a), dark = mat(0x1c1d1f), lens = mat(0x101216, { roughness: .15, metalness: .6 });
  const frame = mat(0xc9a24a, { metalness: .6, roughness: .35 }), glass = mat(0x24402a, { roughness: .3, metalness: .1 }), wine = mat(0x6b1f2b);
  const tongue = mat(0xe07a8a);

  // A tall, thin body, the belly lighter, a row of spines down the back.
  add(rig, ball, skin, [0, .42, 0], [.13, .23, .36]);
  add(rig, ball, belly, [0, .33, .02], [.1, .12, .3]);
  for (let k = 0; k < 9; k++) add(rig, cone, skin, [0, .64 - Math.abs(k - 4) * .012, -.3 + k * .075], [.022, .07, .022], [-.2, 0, 0]);
  // The head: a helmet crest swept back, a wide mouth, turret eyes, and the sunglasses over them.
  const head = new THREE.Group(); head.position.set(0, .5, .38); rig.add(head);
  add(head, ball, skin, [0, 0, .06], [.11, .13, .16]);
  add(head, cone, skin, [0, .15, -.06], [.09, .22, .12], [-.9, 0, 0]);
  add(head, tube, dark, [0, -.06, .165], [.06, .005, .045]);                                // the mouth
  for (const side of [-1, 1]) {
    add(head, ball, skin, [side * .1, .04, .08], [.055, .055, .055]);                         // a turret eye, behind the glasses
    // Sunglasses: a dark lens in a gold rim on the front of the face, and an arm back along the side of the head.
    add(head, tube, lens, [side * .062, .045, .19], [.056, .012, .046], [Math.PI / 2, 0, 0]);
    add(head, tube, frame, [side * .062, .045, .186], [.062, .01, .052], [Math.PI / 2, 0, 0]);
    add(head, tube, frame, [side * .112, .05, .09], [.006, .2, .006], [Math.PI / 2, 0, side * .1]);
  }
  add(head, tube, frame, [0, .058, .205], [.006, .03, .006], [0, 0, Math.PI / 2]);           // the bridge
  const tongueTip = add(head, tube, tongue, [0, -.04, .2], [.012, .001, .012], [Math.PI / 2, 0, 0]);
  // Four gripping legs.
  for (const [x, z] of [[-1, 1], [1, 1], [-1, -1], [1, -1]]) {
    const hip = new THREE.Group(); hip.position.set(x * .11, .36, z * .2); rig.add(hip);
    add(hip, tube, skin, [x * .05, -.08, 0], [.035, .18, .035], [0, 0, x * .6]);
    add(hip, tube, skin, [x * .1, -.24, z * .03], [.03, .18, .03], [z * .2, 0, -x * .15]);
    for (const toe of [-1, 1]) add(hip, ball, skin, [x * .1, -.34, z * .03 + toe * .035], [.03, .02, .04]);
  }
  // The tail, curled in a spiral round a bottle of somebody else's wine.
  const tail = new THREE.Group(); tail.position.set(0, .4, -.34); rig.add(tail);
  const curl = [];
  for (let k = 0; k < 22; k++) {
    const t = k / 21, a = t * Math.PI * 2.2, r = .22 * (1 - t * .75);
    curl.push(add(tail, ball, skin, [0, -r * Math.cos(a) + .02 - t * .05, -.12 - r * Math.sin(a) - t * .04], [.055 * (1 - t * .7), .055 * (1 - t * .7), .055 * (1 - t * .7)]));
  }
  const bottle = new THREE.Group(); bottle.name = 'Ed’s bottle'; bottle.position.set(0, -.06, -.2); bottle.rotation.x = .5; tail.add(bottle);
  add(bottle, tube, glass, [0, 0, 0], [.04, .2, .04]); add(bottle, tube, glass, [0, .15, 0], [.014, .1, .014]); add(bottle, tube, wine, [0, -.04, 0], [.042, .07, .042]);

  let hiccup = 0, flick = 0, drift = Math.random() * 10;
  /** A sway, a hiccup, the odd flick of the tongue, colours drifting; a swig flushes him purple. Sober: grey and still. */
  function animate(time, dt = 1 / 60, { sober = false } = {}) {
    const sway = sober ? .01 : .07;
    rig.rotation.z = Math.sin(time * 1.2) * sway;
    rig.rotation.x = Math.sin(time * .8 + 1) * sway * .4;
    if (!sober && hiccup <= 0 && Math.sin(time * .41) > .996) hiccup = .25;
    hiccup = Math.max(0, hiccup - dt);
    rig.position.y = hiccup > 0 ? Math.sin(hiccup / .25 * Math.PI) * .07 : 0;
    if (!sober && flick <= 0 && Math.sin(time * .29 + 2) > .997) flick = .3;
    flick = Math.max(0, flick - dt);
    const out = flick > 0 ? Math.sin(flick / .3 * Math.PI) : 0;
    tongueTip.scale.y = .001 + out * .5; tongueTip.position.z = .2 + out * .25;
    tail.rotation.x = Math.sin(time * .9) * (sober ? .02 : .08);
    head.rotation.y = Math.sin(time * .35) * (sober ? .05 : .25);
    // His colours: drifting while drunk, a purple flush at each swig; flat grey sober.
    drift += dt * .15;
    const i = Math.floor(drift) % DRUNK.length, next = (i + 1) % DRUNK.length, swig = Math.pow(Math.max(0, Math.sin(time * .45)), 8);
    if (sober) skin.color.lerp(SOBER, Math.min(1, dt * 2));
    else skin.color.copy(DRUNK[i]).lerp(DRUNK[next], drift % 1).lerp(DRUNK[3], swig * .7);
    bottle.rotation.x = .5 + swig * .9;
  }
  return { group, animate, get colour() { return skin.color.getHexString(); } };
}

export function createEdView(scene, { heightAt }) {
  const model = createEdModel();
  scene.add(model.group);
  model.group.scale.setScalar(1.35);
  const puffs = [], puffBall = new THREE.IcosahedronGeometry(1, 1);
  /** Put him at a haunt: `lift` raises him onto a perch (the ridge of Tharganhom's roof). */
  function place(haunt, lift = 0) {
    model.group.position.set(haunt.x, heightAt(haunt.x, haunt.z) + lift, haunt.z);
    model.group.rotation.y = haunt.yaw ?? 0;
  }
  /** A puff of purple smoke where he was, and a smell of spilt wine. */
  function puff(at = model.group.position) {
    const cloud = new THREE.Group(); cloud.position.copy(at); scene.add(cloud);
    const parts = [];
    for (let k = 0; k < 16; k++) {
      const material = new THREE.MeshBasicMaterial({ color: k % 3 ? 0x9a5bb8 : 0xc9a0dc, transparent: true, opacity: .85, depthWrite: false });
      const m = new THREE.Mesh(puffBall, material), a = k / 16 * Math.PI * 2;
      m.position.set(Math.cos(a) * .15, .4 + (k % 4) * .15, Math.sin(a) * .15); m.scale.setScalar(.12);
      cloud.add(m); parts.push({ m, v: new THREE.Vector3(Math.cos(a) * (.6 + (k % 5) * .15), .5 + (k % 3) * .35, Math.sin(a) * (.6 + (k % 4) * .15)) });
    }
    puffs.push({ cloud, parts, age: 0 });
  }
  function update(time, dt, state = {}) {
    model.animate(time, dt, state);
    for (let i = puffs.length - 1; i >= 0; i--) {
      const p = puffs[i]; p.age += dt;
      const t = p.age / .9;
      for (const { m, v } of p.parts) { m.position.addScaledVector(v, dt); m.scale.setScalar(.12 + t * .45); m.material.opacity = Math.max(0, .85 * (1 - t)); }
      if (t >= 1) { scene.remove(p.cloud); for (const { m } of p.parts) m.material.dispose(); puffs.splice(i, 1); }
    }
  }
  return { group: model.group, place, puff, update, get puffing() { return puffs.length; } };
}

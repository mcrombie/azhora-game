import * as THREE from 'three';
import { createGoblin } from './characters.js';

/**
 * Puck as a figure: a goblin smaller than the raiders, in a wine-red cap that
 * flops over backwards with a cork on a string at its tip, a sash of vine
 * leaves, a red nose, a purple-stained grin, and a bottle that is never his.
 * He sways on his feet, hiccups, and every so often lifts the bottle.
 *
 * `createPuckView` puts him in the world at a haunt (src/puck.js) and makes the
 * purple puff he leaves behind when he goes.
 */
const mat = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: .8, ...extra });

export function createPuckModel() {
  const actor = createGoblin({ variant: 1 });
  // His sway and hiccups ride on the goblin's root, which the goblin's own animator never touches.
  const group = new THREE.Group(); group.name = 'Puck'; group.add(actor.group);
  actor.setArmed(false);
  const head = group.getObjectByName('Head'), wrist = group.getObjectByName('Right Wrist'), shoulder = group.getObjectByName('Right Shoulder');
  const body = group.getObjectByName('Weight and hips');
  const add = (parent, geometry, material, [x, y, z], [sx, sy, sz] = [1, 1, 1], [rx, ry, rz] = [0, 0, 0]) => {
    const m = new THREE.Mesh(geometry, material); m.position.set(x, y, z); m.scale.set(sx, sy, sz); m.rotation.set(rx, ry, rz); m.castShadow = true; parent.add(m); return m;
  };
  const ball = new THREE.IcosahedronGeometry(1, 1), tube = new THREE.CylinderGeometry(1, 1, 1, 8);
  const capRed = mat(0x7a1f35), cork = mat(0xb08a5a), string = mat(0xd8cfb0), nose = mat(0xc4473c), stain = mat(0x5a2045), leaf = mat(0x5c7a3e), leafDark = mat(0x46613a);
  const glass = mat(0x24402a, { roughness: .3, metalness: .1 }), wine = mat(0x6b1f2b);

  // The cap, flopped backwards, and the cork swinging from its tip.
  const cap = new THREE.Group(); cap.position.set(0, .33, -.02); cap.rotation.x = -.55; head.add(cap);
  add(cap, new THREE.CylinderGeometry(.2, .215, .06, 10), capRed, [0, 0, 0]);
  add(cap, new THREE.ConeGeometry(.19, .42, 10), capRed, [0, .23, -.04], [1, 1, 1], [-.35, 0, 0]);
  add(cap, tube, string, [0, .36, -.2], [.006, .16, .006], [.9, 0, 0]);
  add(cap, tube, cork, [0, .3, -.29], [.028, .06, .028], [.9, 0, 0]);
  // A red nose, and the grin stained purple from a lifetime of other people's wine.
  add(head, ball, nose, [-.023, .035, .295], [.05, .045, .045]);
  add(head, ball, stain, [.013, -.034, .214], [.08, .022, .012]);
  // A sash of vine leaves over one shoulder.
  add(body, new THREE.TorusGeometry(.17, .02, 5, 16), leaf, [0, .66, .03], [1, 1, 1], [1.35, 0, .6]);
  for (let k = 0; k < 7; k++) {
    const t = k / 7 * Math.PI * 2, x = Math.cos(t) * .17, yz = Math.sin(t) * .17;
    add(body, ball, k % 2 ? leaf : leafDark, [x * .82, .66 + yz * .5, .03 + yz * .4], [.045, .032, .016]);
  }
  // The bottle, held by the neck.
  const bottle = new THREE.Group(); bottle.name = 'Puck’s bottle'; bottle.position.set(0, -.07, .04); bottle.rotation.x = Math.PI; wrist.add(bottle);
  add(bottle, tube, glass, [0, .02, 0], [.012, .09, .012]);
  add(bottle, tube, glass, [0, .15, 0], [.042, .17, .042]);
  add(bottle, tube, wine, [0, .18, 0], [.043, .06, .043]);

  let hiccup = 0, swigged = 0;
  /**
   * The goblin's own idle, then his: a sway, a hiccup now and then, and the
   * bottle lifted to drink. The animator eases each joint from where it was,
   * so the last swig is taken off before it runs and put back after.
   */
  function animate(time, dt = 1 / 60, { sober = false } = {}) {
    if (shoulder) { shoulder.rotation.x += swigged * 2.2; shoulder.rotation.z += swigged * .25; }
    head.rotation.x += swigged * .5;
    actor.animate(time, 0, true);
    const sway = sober ? .015 : .09;
    actor.group.rotation.z = Math.sin(time * 1.3) * sway;
    actor.group.rotation.x = Math.sin(time * .9 + 1) * sway * .5;
    if (!sober && hiccup <= 0 && Math.sin(time * .37) > .995) hiccup = .25;
    hiccup = Math.max(0, hiccup - dt);
    actor.group.position.y = hiccup > 0 ? Math.sin(hiccup / .25 * Math.PI) * .08 : 0;
    swigged = sober ? 0 : Math.pow(Math.max(0, Math.sin(time * .45)), 8);
    if (shoulder) { shoulder.rotation.x -= swigged * 2.2; shoulder.rotation.z -= swigged * .25; }
    head.rotation.x -= swigged * .5;
  }
  return { group, animate };
}

export function createPuckView(scene, { heightAt }) {
  const model = createPuckModel();
  scene.add(model.group);
  model.group.scale.setScalar(.82);
  const puffs = [], puffBall = new THREE.IcosahedronGeometry(1, 1);
  /** Stand him at a haunt: `lift` raises him onto a perch (the ridge of Tharganhom's roof). */
  function place(haunt, lift = 0) {
    model.group.position.set(haunt.x, heightAt(haunt.x, haunt.z) + lift, haunt.z);
    model.group.rotation.y = haunt.yaw ?? 0;
  }
  /** A puff of purple smoke where he stood, and a smell of spilt wine. */
  function puff(at = model.group.position) {
    const cloud = new THREE.Group(); cloud.position.copy(at); scene.add(cloud);
    const parts = [];
    for (let k = 0; k < 16; k++) {
      const material = new THREE.MeshBasicMaterial({ color: k % 3 ? 0x9a5bb8 : 0xc9a0dc, transparent: true, opacity: .85, depthWrite: false });
      const m = new THREE.Mesh(puffBall, material), a = k / 16 * Math.PI * 2;
      m.position.set(Math.cos(a) * .15, .5 + (k % 4) * .2, Math.sin(a) * .15); m.scale.setScalar(.12);
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

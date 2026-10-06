import * as THREE from 'three';
import { createSceneryBuilder } from '../scenery/scenery-builder.js';

const ease = value => { const t = Math.max(0, Math.min(1, value)); return t * t * (3 - 2 * t); };

function seaMonster() {
  const root = new THREE.Group(); root.name = 'The immense creature below the training cove';
  const b = createSceneryBuilder('Sea guardian leviathan');
  // Broad, scaled shoulders and an unmistakable open jaw break the surface.
  b.rock('#193f46', 0, 3.9, 0, 5.5, 5.5, 4.5);
  b.rock('#295a59', 0, 7.3, -.4, 4.2, 3.6, 3.7);
  b.rock('#356d62', 0, 8.5, 1, 3.65, 2.15, 2.5);
  b.rock('#101a20', 0, 5.9, 3.16, 3.4, 2.0, .8);
  b.rock('#436c65', 0, 4.55, 3.2, 3.55, .6, 1.6);
  for (const side of [-1, 1]) {
    b.rock('#93b887', side * 2.8, 8.7, 2.15, .72, .59, .43);
    b.rock('#172122', side * 2.85, 8.73, 2.52, .22, .46, .1);
    for (let i = 0; i < 5; i++) b.cone('#bdc6a2', side * (i + .5) * .52, 6.75, 3.5, .21, 1.15, 0, 6);
    for (let i = 0; i < 5; i++) b.cone('#d3cfac', side * (i + .5) * .5, 4.95, 3.65, .18, .7, 0, 6);
    for (let i = 0; i < 4; i++) {
      const x = side * (3.2 + i * 1.45), z = -1.2 + i * 1.0;
      b.beam('#244d4d', [x * .7, 1.1, z], [x, 2.7 + i * .6, z + 1.5], 1.1 - i * .1);
      b.beam('#32625a', [x, 2.7 + i * .6, z + 1.5], [x + side * 1.8, 1.0 + i * .6, z + 3], .76 - i * .08);
      b.cone('#4c7c69', x + side * 1.8, .7 + i * .6, z + 3, .4 - i * .04, 1.65);
    }
  }
  for (let i = 0; i < 6; i++) b.cone('#587b6b', Math.sin(i * 1.9) * 2.2, 9.1, -1.8 + i * .4, .48, 2.2 - i * .18);
  b.finish(root);
  return root;
}

function wingedDemon() {
  const root = new THREE.Group(); root.name = 'The winged shadow at the training boundary';
  const b = createSceneryBuilder('Winged fire and shadow guardian');
  b.rock('#221f26', 0, 4.5, 0, 2.4, 3.1, 1.3);
  b.rock('#393039', 0, 6.3, 0, 3.0, 1.8, 1.35);
  b.rock('#30252d', 0, 8.4, .3, 1.3, 1.6, 1.1);
  b.rock('#bd6736', 0, 8.05, 1.26, .72, .3, .15);
  for (const side of [-1, 1]) {
    b.rock('#fac477', side * .48, 8.7, 1.2, .27, .13, .13);
    b.beam('#3c3038', [side * .8, 9.15, 0], [side * 1.75, 10.2, -.5], .58);
    b.beam('#564341', [side * 1.75, 10.2, -.5], [side * 1.35, 11.5, -.65], .35);
    b.beam('#332630', [side * 2.3, 6.4, 0], [side * 3.6, 4.3, .6], .87);
    b.beam('#30242d', [side * 3.6, 4.3, .6], [side * 3.5, 2.6, 1.3], .68);
    for (let i = 0; i < 3; i++) b.cone('#a18a64', side * (3.15 + i * .34), 1.83, 1.4, .14, .8);
    b.beam('#271f28', [side * 1.2, 2.8, 0], [side * 1.55, .0, -.6], .96);
    b.rock('#261e26', side * 1.5, -.1, .2, .85, .55, 1.2);
    for (let i = 0; i < 5; i++) b.rock(i % 2 ? '#ec983d' : '#a54630', side * (.5 + i * .22), 4.5 + i * .43, 1.25, .11, .33, .06);
  }
  b.finish(root);
  const wings = [];
  for (const side of [-1, 1]) {
    const wing = new THREE.Group(); wing.position.set(side * 1.4, 6.6, -.7); root.add(wing);
    const wb = createSceneryBuilder('Great shadow wing');
    const a = [0, 0, 0], b = [side * 4, 3.1, -1.1], c = [side * 11.5, 3.5, -.7], d = [side * 9, -2, .7], e = [side * 5.9, -2.9, .9], f = [side * 2, -3.5, .6];
    wb.triangle('#503139', a, b, c); wb.triangle('#503139', c, b, a);
    wb.triangle('#672f33', a, c, d); wb.triangle('#672f33', d, c, a);
    wb.triangle('#512834', a, d, e); wb.triangle('#512834', e, d, a);
    wb.triangle('#422632', a, e, f); wb.triangle('#422632', f, e, a);
    for (const p of [b, c, d, e, f]) wb.beam('#271f28', a, p, .16);
    wb.beam('#3b2930', b, c, .2); wb.finish(wing); wings.push({ wing, side });
  }
  const crown = new THREE.Group(); root.add(crown);
  const fire = createSceneryBuilder('Guardian flame mane');
  for (let i = 0; i < 9; i++) fire.cone(i % 2 ? '#ea7b2f' : '#c9472a', Math.sin(i * 2.2) * 1.5, 8.6 + Math.cos(i * 1.7) * .7, -.8 + Math.cos(i * 2.2) * .8, .38, 1.4 + (i % 3) * .4);
  fire.finish(crown);
  return { root, wings, crown };
}

/** Purely staged, invulnerable boundary actors: no loot, XP, targeting or AI.
 * The saved model supplies elapsed time, including after reload or pause. */
export function createTutorialBoundaryVisuals({ parent } = {}) {
  const root = new THREE.Group(); root.name = 'Tutorial escape encounters'; parent.add(root); root.visible = false;
  const sea = seaMonster(), demon = wingedDemon(); root.add(sea, demon.root);
  const rings = [];
  for (let i = 0; i < 3; i++) {
    const ring = new THREE.Mesh(new THREE.RingGeometry(1, 1.05, 48), new THREE.MeshBasicMaterial({ color: '#b3d3c5', transparent: true, opacity: .5, side: THREE.DoubleSide, depthWrite: false }));
    ring.rotation.x = -Math.PI / 2; root.add(ring); rings.push(ring);
  }
  const shadow = new THREE.Mesh(new THREE.CircleGeometry(10, 48), new THREE.MeshBasicMaterial({ color: '#061d27', transparent: true, opacity: .7, depthWrite: false }));
  shadow.rotation.x = -Math.PI / 2; root.add(shadow);
  const portal = new THREE.Mesh(new THREE.TorusGeometry(7.7, .18, 5, 40), new THREE.MeshBasicMaterial({ color: '#eb8742', transparent: true, opacity: .9 }));
  root.add(portal);
  root.traverse(mesh => { if (mesh.isMesh) { mesh.userData.passable = true; mesh.castShadow = true; mesh.frustumCulled = false; } });
  let current = null;
  function sync(encounter, { yaw = 0 } = {}) {
    root.visible = !!encounter;
    if (!encounter) { current = null; return null; }
    const t = encounter.elapsed, air = encounter.kind === 'air';
    if (!current || current.at.x !== encounter.at.x || current.at.z !== encounter.at.z || current.kind !== encounter.kind) current = { at: { ...encounter.at }, kind: encounter.kind, yaw };
    // Spawn in front of the held player and face back toward them. It intercepts
    // a turbo exit; its position never depends on outrunning the player.
    const facing = current.yaw, ahead = air ? 15 : 14, up = air ? Math.max(4, encounter.at.y ?? 4) : .06;
    const x = encounter.at.x + Math.sin(facing) * ahead, z = encounter.at.z + Math.cos(facing) * ahead;
    root.position.set(x, up, z); root.rotation.y = facing + Math.PI;
    sea.visible = !air; demon.root.visible = air; shadow.visible = !air; portal.visible = air;
    shadow.position.set(0, .04, 0); shadow.scale.setScalar(.55 + ease(t / 1.4) * .7);
    for (let i = 0; i < rings.length; i++) {
      const ring = rings[i]; ring.visible = !air; const scale = 3 + ((t * 6 + i * 4) % 14); ring.scale.setScalar(scale); ring.position.set(0, .09 + i * .01, 0); ring.material.opacity = .45 * (1 - scale / 18);
    }
    if (air) {
      const materialize = ease(t / .85); demon.root.scale.setScalar(Math.max(.01, materialize));
      demon.root.position.y = -.6 + Math.sin(t * 2) * .35;
      demon.root.position.z = ease((t - 2.6) / .55) * 8;
      for (const { wing, side } of demon.wings) { wing.rotation.y = side * Math.sin(t * 2.6) * .23; wing.rotation.z = side * (.12 + Math.sin(t * 2.6) * .16); }
      demon.crown.scale.y = 1 + Math.sin(t * 11) * .12;
      portal.position.set(0, 5, -2); portal.scale.setScalar(.45 + materialize * .7); portal.rotation.z = t * .7; portal.material.opacity = .8 * (1 - ease((t - 1.1) / 1.2));
    } else {
      sea.position.y = -10 + ease((t - .3) / 1.6) * 10;
      sea.rotation.x = -.13 * ease((t - 2.2) / .65);
      sea.position.z = ease((t - 2.65) / .5) * 8;
    }
    return { cameraTarget: { x, y: up + (air ? 5 : 4), z },
      cameraPosition: { x: encounter.at.x - Math.sin(facing) * 8 + Math.cos(facing) * 8, y: (encounter.at.y ?? 1) + 6, z: encounter.at.z - Math.cos(facing) * 8 - Math.sin(facing) * 8 },
      title: air ? 'Something has found you in the sky' : 'Something enormous moves below',
    };
  }
  return { root, sync, clear: () => sync(null) };
}

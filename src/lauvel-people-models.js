import * as THREE from 'three';
import { createCharacter } from './characters.js';

/**
 * The people burying the dead at the Lauvel (src/lauvel-aftermath.js): the
 * gravedigger with his spade, who digs whenever he is standing still, and the
 * hurdle the two bearers carry between them, with a shrouded body on it when
 * they are carrying one.
 */
const mat = color => new THREE.MeshStandardMaterial({ color, roughness: .85 });

/** Old Hewe: a valley man with a spade, digging. His arms go through the traveler's own overhead swing, slowly. */
export function createGravedigger({ tunic = 0x5b5140 } = {}) {
  const actor = createCharacter({ role: 'shelter-keeper', tunic, skin: 0xc49a76 });
  const wrist = actor.group.getObjectByName('Right Wrist');
  if (wrist) {
    const spade = new THREE.Group(); spade.name = 'Spade'; wrist.add(spade);
    const haft = new THREE.Mesh(new THREE.CylinderGeometry(.022, .022, 1.15, 6), mat(0x7a5638)); haft.position.set(0, -.3, .12); haft.rotation.x = 1.2; spade.add(haft);
    const blade = new THREE.Mesh(new THREE.BoxGeometry(.2, .03, .26), mat(0x8e9195)); blade.position.set(0, -.52, .66); blade.rotation.x = 1.2; spade.add(blade);
  }
  const animate = actor.animate.bind(actor);
  let dig = 0;
  actor.animate = (time, pace, grounded, pose = {}) => {
    if (pace > .1 || pose.alert) return animate(time, pace, grounded, pose);
    dig = (time * .5) % 1;
    return animate(time, pace, grounded, { ...pose, action: 'attack', progress: dig, combo: 2 });
  };
  return actor;
}

/** The hurdle two bearers carry: two poles and a woven bed, and on it, when there is one, the dead man in his shroud. */
export function createStretcher() {
  const group = new THREE.Group(); group.name = 'Bearers’ hurdle';
  const wood = mat(0x6e5238), wicker = mat(0x9a8058), linen = mat(0xe3dccb), cord = mat(0x7a6a50);
  for (const side of [-1, 1]) { const pole = new THREE.Mesh(new THREE.CylinderGeometry(.03, .03, 2.5, 6), wood); pole.rotation.x = Math.PI / 2; pole.position.x = side * .26; group.add(pole); }
  const bed = new THREE.Mesh(new THREE.BoxGeometry(.52, .03, 1.7), wicker); bed.position.y = .01; group.add(bed);
  const body = new THREE.Group(); body.name = 'The dead man, shrouded'; group.add(body);
  const shroud = new THREE.Mesh(new THREE.IcosahedronGeometry(1, 1), linen); shroud.scale.set(.22, .13, .8); shroud.position.y = .12; body.add(shroud);
  const head = new THREE.Mesh(new THREE.IcosahedronGeometry(1, 1), linen); head.scale.set(.14, .12, .15); head.position.set(0, .14, .72); body.add(head);
  for (const at of [-.4, .1, .45]) { const tie = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 1, 8), cord); tie.scale.set(.23, .03, .14); tie.rotation.x = Math.PI / 2; tie.position.set(0, .12, at); body.add(tie); }
  group.traverse(o => { if (o.isMesh) o.castShadow = true; });
  return { group, set carrying(on) { body.visible = on; } };
}

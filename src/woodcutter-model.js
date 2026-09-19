import * as THREE from 'three';
import { createCharacter } from './characters.js';
import { BOWDEN } from './woodcutting.js';

/**
 * Bowden Koop, King of the Koopwood (src/woodcutting.js), as a figure: the
 * game's own man, made huge, dressed as near to a certain spiky turtle king as
 * a woodcutter in Drent can be. Hair like a bonfire swept back in spikes, big
 * angry brows, a leather band with two ox horns, a spiked collar and spiked
 * cuffs, a banded leather apron down his front like a belly's plates, and on
 * his back a great domed log-basket of green-painted hide, rimmed in white and
 * studded with spikes: his shell. He carries his axe.
 */
const mat = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: .85, ...extra });
const ball = new THREE.IcosahedronGeometry(1, 1), tube = new THREE.CylinderGeometry(1, 1, 1, 12), cube = new THREE.BoxGeometry(1, 1, 1), cone = new THREE.ConeGeometry(1, 1, 8);
function add(parent, geometry, material, [x, y, z], [sx, sy, sz] = [1, 1, 1], [rx, ry, rz] = [0, 0, 0]) {
  const m = new THREE.Mesh(geometry, material);
  m.position.set(x, y, z); m.scale.set(sx, sy, sz); m.rotation.set(rx, ry, rz);
  m.castShadow = true; parent.add(m); return m;
}
/** Hang a piece made in the figure's body frame onto one of its joints, keeping where it is. */
function hang(actor, jointName, build) {
  const body = actor.group.children[0], joint = jointName ? actor.group.getObjectByName(jointName) : body;
  actor.group.updateMatrixWorld(true);
  const at = name => body.worldToLocal(actor.group.getObjectByName(name).getWorldPosition(new THREE.Vector3()));
  const holder = new THREE.Group(); body.add(holder); build(holder, at);
  actor.group.updateMatrixWorld(true);
  for (const child of [...holder.children]) joint.attach(child);
  body.remove(holder);
}
/** How much bigger than an ordinary man he is. */
export const BOWDEN_SIZE = 1.14;

export function createBowden() {
  const actor = createCharacter({ role: 'mercenary', tunic: BOWDEN.color, skin: BOWDEN.skin,
    look: { build: 'bull', hairStyle: 'shaved-sides', facialHair: 'stubble', hair: 0xd9481e, headgear: 'bare', garment: 'plain', weapon: 'axe' } });
  actor.group.name = 'Bowden Koop, King of the Koopwood';
  const shell = mat(0x3f8f3a), shellDark = mat(0x2f6e2c), hide = mat(0x2a2320), apron = mat(0xf0d68f), band = mat(0xc9a55c), bone = mat(0xf1ead6);
  const hair = mat(0xe0521f), brow = mat(0xd9481e), horn = mat(0xeee4c8);
  hang(actor, 'Chest', (h, at) => {
    // The shell: a domed basket on his back, rimmed in white, with spikes, and plates picked out in a darker green.
    const back = new THREE.Group(); back.name = 'Bowden’s shell'; back.position.set(0, 1.08, -.19); h.add(back);
    add(back, new THREE.SphereGeometry(1, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), shell, [0, 0, 0], [.36, .3, .44], [-Math.PI / 2, 0, 0]);
    add(back, new THREE.TorusGeometry(1, .09, 6, 22), bone, [0, 0, 0], [.37, .45, .6]);
    // Plates and spikes sit on the dome's skin: an ellipsoid .36 across, .44 up and down, .3 deep.
    const skin = (x, y) => -.3 * Math.sqrt(Math.max(0, 1 - (x / .36) ** 2 - (y / .44) ** 2));
    for (const [x, y] of [[0, 0], [-.18, .19], [.18, .19], [-.18, -.19], [.18, -.19], [0, .3], [0, -.3]]) {
      const z = skin(x, y), tilt = [-Math.PI / 2 + y * 2.2, 0, -x * 2.2];
      add(back, new THREE.CylinderGeometry(1, 1, 1, 6), shellDark, [x, y, z - .004], [.09, .02, .09], tilt);
      add(back, cone, bone, [x * 1.08, y * 1.08, z - .06], [.045, .13, .045], tilt);
    }
    for (const side of [-1, 1]) add(h, cube, hide, [side * .13, 1.24, .02], [.05, .36, .38], [.1, 0, 0]);   // the straps, over the shoulders
    // The banded apron down his front, like a belly's plates.
    add(h, cube, apron, [0, .98, .175], [.3, .5, .03]);
    for (let k = 0; k < 4; k++) add(h, cube, band, [0, .8 + k * .12, .19], [.3, .018, .012]);
    // A spiked collar.
    add(h, new THREE.TorusGeometry(.13, .035, 6, 16), hide, [0, 1.37, .005], [1, 1, .9], [Math.PI / 2, 0, 0]);
    for (let k = 0; k < 7; k++) { const a = (k / 7 - .5) * Math.PI * 1.6; add(h, cone, bone, [Math.sin(a) * .16, 1.38, Math.cos(a) * .15], [.02, .06, .02], [Math.PI / 2 * Math.cos(a), 0, -Math.PI / 2 * Math.sin(a)]); }
  });
  // Spiked cuffs.
  for (const side of ['Left', 'Right']) hang(actor, `${side} Wrist`, (h, at) => { const w = at(`${side} Wrist`);
    add(h, tube, hide, [w.x, w.y + .05, w.z], [.06, .09, .06]);
    for (let k = 0; k < 5; k++) { const a = k / 5 * Math.PI * 2; add(h, cone, bone, [w.x + Math.sin(a) * .065, w.y + .05, w.z + Math.cos(a) * .065], [.014, .045, .014], [Math.PI / 2 * Math.cos(a), 0, -Math.PI / 2 * Math.sin(a)]); } });
  // The head: a bonfire of hair swept back in spikes, angry brows, a band with two ox horns.
  const head = actor.group.getObjectByName('Head');
  for (const [x, y, z, s, lean] of [[0, .4, .07, 1, -.5], [0, .42, -.04, 1.15, -.9], [0, .38, -.15, 1, -1.3], [-.1, .37, 0, .85, -.9], [.1, .37, 0, .85, -.9], [-.13, .32, -.12, .8, -1.2], [.13, .32, -.12, .8, -1.2], [0, .3, -.22, .8, -1.6]])
    add(head, cone, hair, [x, y, z], [.07 * s, .24 * s, .07 * s], [lean, 0, -x * 2.2]);
  // The rest of the bonfire: a mane falling down the back of his head.
  for (const [x, y, z, s] of [[0, .3, -.2, 1], [-.09, .26, -.19, .85], [.09, .26, -.19, .85], [0, .2, -.21, .8], [-.06, .15, -.19, .65], [.06, .15, -.19, .65]])
    add(head, cone, hair, [x, y, z], [.06 * s, .22 * s, .06 * s], [-2.3, 0, -x * 3]);
  for (const side of [-1, 1]) add(head, cube, brow, [side * .072, .292, .19], [.11, .04, .04], [0, 0, side * -.38]);
  // Two small fangs over his lip when he grins, which is always.
  for (const side of [-1, 1]) add(head, cone, bone, [side * .034, .118, .188], [.011, .034, .011], [Math.PI, 0, 0]);
  add(head, tube, hide, [0, .31, -.01], [.205, .045, .19]);
  for (const side of [-1, 1]) {
    add(head, cone, horn, [side * .23, .38, -.01], [.045, .2, .045], [0, 0, side * -.8]);
    add(head, cone, horn, [side * .28, .47, -.01], [.03, .12, .03], [0, 0, side * -.25]);
  }
  actor.group.scale.setScalar(BOWDEN_SIZE);
  return actor;
}

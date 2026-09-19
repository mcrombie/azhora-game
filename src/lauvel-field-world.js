import * as THREE from 'three';
import { BURIAL, FALLEN, fieldPoint } from './lauvel-aftermath.js';

/**
 * The field at the Lauvel ten days on (src/lauvel-aftermath.js), as scenery:
 * the fallen where they fell, drawn plainly and without gore (a man's shape in
 * the grass, his cloak, his dropped shield or spear); arrows standing in the
 * turf; crows among them; and east of the road, the burial ground: the filled
 * row already marked, new graves being dug with their spoil heaped beside them
 * and a spade left standing in it, and the shrouded dead laid out in a row,
 * waiting their turn. Everything lies low and is passable; nothing here stands
 * in anyone's way but the spoil heaps.
 */
export function createLauvelField({ parent, material, box, mesh, post, groundHeight, colliders, roadDistance }) {
  const root = new THREE.Group(); root.name = 'The field at the Lauvel, after'; parent.add(root);
  const ball = new THREE.IcosahedronGeometry(1, 1), tube = new THREE.CylinderGeometry(1, 1, 1, 8), cone = new THREE.ConeGeometry(1, 1, 6);
  const skin = [material('#c9a27e'), material('#d7ad7e'), material('#b88f6a')], boot = material('#3a3129'), hair = material('#3f3024');
  const cloth = { valley: ['#5d6f86', '#6f7b5e', '#7b6f5a', '#6a5f52', '#586a5c'].map(c => material(c)), empire: [material('#7c3a2f')] };
  const wood = material('#6e5238'), steel = material('#8f9296', { metalness: .5, roughness: .45 }), linen = material('#e3dccb'), cord = material('#7a6a50');
  const soil = material('#4a3b2c'), spoil = material('#6b5238'), dark = material('#2e2620'), shieldPaint = [material('#5d6f86'), material('#8a7a52'), material('#7c3a2f')];
  const crowBlack = material('#16161a'), beak = material('#2a2a2a');
  const ground = (x, z) => groundHeight(x, z);
  const piece = (group, geometry, mat, [x, y, z], [sx, sy, sz], [rx, ry, rz] = [0, 0, 0]) => {
    const m = new THREE.Mesh(geometry, mat); m.position.set(x, y, z); m.scale.set(sx, sy, sz); m.rotation.set(rx, ry, rz); m.castShadow = true; m.receiveShadow = true; group.add(m); return m;
  };
  const placed = (x, z, turn) => { const g = new THREE.Group(); g.position.set(x, ground(x, z), z); g.rotation.y = turn; root.add(g); return g; };
  let seed = 7;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };

  // -------------------------------------------------------------------------
  // The fallen: a man's shape lying in the grass, and what he dropped.
  // -------------------------------------------------------------------------
  FALLEN.forEach((f, i) => {
    const p = fieldPoint(f.dx, f.dz); if (roadDistance(p.x, p.z) < 3) return;
    const g = placed(p.x, p.z, f.turn), coat = cloth[f.side][i % cloth[f.side].length], face = skin[i % skin.length];
    const reach = (i % 3 - 1) * .35;
    piece(g, new THREE.BoxGeometry(1, 1, 1), coat, [0, .13, 0], [.44, .2, .64]);                          // body, in its coat
    piece(g, ball, f.face ? hair : face, [0, .14, .47], [.12, .11, .13]);                                    // head
    for (const s of [-1, 1]) {
      piece(g, new THREE.BoxGeometry(1, 1, 1), coat, [s * .32, .09, .16 + (s > 0 ? reach : -reach) * .3], [.1, .1, .52], [0, s * (.5 + (i % 2) * .5), 0]);   // arms flung out
      piece(g, new THREE.BoxGeometry(1, 1, 1), cloth.valley[(i + 2) % 5], [s * .11, .08, -.62], [.14, .13, .66], [0, s * .08 * (i % 3), 0]);   // legs
      piece(g, new THREE.BoxGeometry(1, 1, 1), boot, [s * .12 + s * .05 * (i % 3), .08, -1.0], [.13, .14, .2]);
    }
    if (f.arms === 'spear') { const s = piece(g, tube, wood, [.6, .03, .2], [.022, 1.9, .022], [Math.PI / 2, 0, .35]); piece(g, cone, steel, [.6 + Math.sin(.35) * .95, .03, .2 + Math.cos(.35) * .95], [.035, .16, .035], [Math.PI / 2, 0, .35]); s.name = 'Dropped spear'; }
    if (f.arms === 'shield') piece(g, tube, shieldPaint[i % 3], [-.55, .04, .35], [.36, .05, .36], [.08, 0, .12]);
    if (f.arms === 'sword') piece(g, new THREE.BoxGeometry(1, 1, 1), steel, [.55, .03, .5], [.05, .02, .85], [0, .6, 0]);
    if (i % 4 === 1) piece(g, new THREE.SphereGeometry(1, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), steel, [-.35, .01, .95], [.14, .12, .15], [Math.PI / 2 + .6, 0, .3]);   // a helmet rolled away
  });

  // -------------------------------------------------------------------------
  // Arrows in the turf, where the volleys came down.
  // -------------------------------------------------------------------------
  for (let k = 0; k < 34; k++) {
    const dx = (rnd() - .5) * 60, dz = (rnd() - .5) * 44, p = fieldPoint(dx, dz);
    if (roadDistance(p.x, p.z) < 2.5 || (dx > -2 && dz > 12)) continue;
    const g = placed(p.x, p.z, rnd() * Math.PI * 2), lean = .35 + rnd() * .35;
    piece(g, tube, wood, [0, .3, .1], [.012, .72, .012], [lean, 0, 0]);
    for (const s of [-1, 1]) piece(g, new THREE.BoxGeometry(1, 1, 1), linen, [s * .018, .63, .1 + Math.sin(lean) * .33], [.03, .09, .004], [lean, s * .5, 0]);
  }

  // -------------------------------------------------------------------------
  // Crows, at work among the fallen.
  // -------------------------------------------------------------------------
  [[15, 5.2, .3], [17.4, 2.8, 2.2], [20.5, 9, 4], [-23, -3.2, 1.3], [-20, 7, 5.5], [13, -13, 2.8], [23.5, 4.2, .9]].forEach(([dx, dz, turn], i) => {
    const p = fieldPoint(dx, dz), g = placed(p.x, p.z, turn), peck = i % 2 ? .5 : 0;
    piece(g, ball, crowBlack, [0, .1, 0], [.07, .065, .13], [peck * .6, 0, 0]);
    piece(g, ball, crowBlack, [0, .16 - peck * .08, .11], [.045, .045, .05]);
    piece(g, cone, beak, [0, .15 - peck * .1, .17], [.014, .06, .014], [Math.PI / 2 + peck, 0, 0]);
    piece(g, new THREE.BoxGeometry(1, 1, 1), crowBlack, [0, .1, -.14], [.06, .015, .1], [-.3, 0, 0]);
    for (const s of [-1, 1]) piece(g, tube, beak, [s * .025, .03, 0], [.005, .06, .005]);
  });

  // -------------------------------------------------------------------------
  // The burial ground: new graves, their spoil, a spade, and the dead laid out in their shrouds.
  // -------------------------------------------------------------------------
  for (const grave of BURIAL.graves) {
    const p = fieldPoint(grave.dx, grave.dz), y = ground(p.x, p.z);
    if (grave.open) {
      // The open grave: trodden soil round it, and the dark of the hole, laid over the turf so the ground's slope cannot swallow them.
      box(soil, p.x, y + .03, p.z, 1.2, .04, 2.3, root);
      box(dark, p.x, y + .06, p.z, .9, .04, 2, root);
      const heap = mesh(ball, spoil, p.x + 1.05, y + .12, p.z, .4, .32, 1.05, root); heap.rotation.y = .1;
      colliders.push({ x: p.x + 1.05, z: p.z, r: .45, kind: 'spoil-heap' });
    } else {
      // A filled grave: its mound, and at its head a board on a stake with the name cut into it, and a strip of cloth tied round.
      mesh(ball, spoil, p.x, y + .08, p.z, .5, .22, 1.05, root);
      const stake = box(wood, p.x, y + .4, p.z - 1.2, .07, .8, .07, root); stake.rotation.z = .04;
      box(material('#8a6d4c'), p.x, y + .62, p.z - 1.16, .34, .26, .035, root);
      box(material(['#8a3a2e', '#5d6f86'][grave.dx % 2 ? 1 : 0]), p.x, y + .44, p.z - 1.2, .09, .05, .09, root);
    }
  }
  { const p = fieldPoint(BURIAL.graves[3].dx + 1.1, BURIAL.graves[3].dz - .3), y = ground(p.x, p.z);
    const handle = post(wood, p.x, y + .72, p.z, .025, 1.2, root); handle.rotation.z = .25;
    const blade = box(steel, p.x - .1, y + .2, p.z, .22, .3, .03, root); blade.rotation.z = .25; }
  BURIAL.shrouds.forEach((s, i) => {
    const p = fieldPoint(s.dx, s.dz), g = placed(p.x, p.z, 0);
    piece(g, ball, linen, [0, .15, 0], [.24, .15, .88]);
    piece(g, ball, linen, [0, .17, .62], [.15, .14, .17]);
    for (const at of [-.45, .1, .45]) piece(g, tube, cord, [0, .15, at], [.25, .03, .16], [Math.PI / 2, 0, 0]);   // the cords round him
    if (i % 3 === 0) piece(g, ball, material(['#c9b07a', '#b8b0d0', '#d8c0c0'][i % 3]), [.08, .3, .15], [.05, .04, .05]);   // a few flowers left on him
  });
  // The world makes any small standing thing solid (src/world.js `standingProps`), which would turn
  // every arrow in the turf into a post to walk round on the one field a chapter is fought over.
  // Nothing here stops anybody: the only colliders on this ground are the spoil heaps, pushed above.
  root.traverse(object => { if (object.isMesh) object.userData.passable = true; });
  return { root };
}

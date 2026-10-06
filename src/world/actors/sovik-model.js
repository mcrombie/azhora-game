import * as THREE from 'three';

/**
 * **Sovik**, the fire spirit in the Elod Light's lantern (src/content/quests/rival-light/rival-light.js), loosely after
 * Calcifer (the user, 26 September 2026): a fire the size of a cabbage with a face in it - two
 * white-hot eyes, a dark mouth - orange at the edges and blue in the heart, never still.
 * Self-lit: every material is unlit and glows, so he reads at the top of a dark tower and in the
 * traveler's arms at night alike. `animate(time)` is his flicker, and the occasional blink.
 */
export function createSovik({ scale = 1 } = {}) {
  const group = new THREE.Group();
  group.name = 'Sovik';
  const glow = (color, opacity = .8) => new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false,
    blending: THREE.AdditiveBlending, toneMapped: false });
  // An opaque body that reads against a pale sky or a lantern's glass, and a glow round it.
  const solid = color => new THREE.MeshBasicMaterial({ color, toneMapped: false });
  const outer = solid(0xff6a1c), middle = solid(0xffb13b), heart = solid(0x6fb6ff), halo = glow(0xff8a2c, .35);
  const white = new THREE.MeshBasicMaterial({ color: 0xfffbe8, toneMapped: false });
  const dark = new THREE.MeshBasicMaterial({ color: 0x2a1206, toneMapped: false });
  const blob = new THREE.IcosahedronGeometry(1, 1), tongue = new THREE.ConeGeometry(1, 1, 7, 1, true);
  const body = new THREE.Group(); body.name = 'Sovik flame'; group.add(body);
  const add = (geometry, mat, [x, y, z], [sx, sy, sz], name) => {
    const mesh = new THREE.Mesh(geometry, mat); mesh.position.set(x, y, z); mesh.scale.set(sx, sy, sz);
    if (name) mesh.name = name; body.add(mesh); return mesh;
  };
  add(blob, halo, [0, .26, 0], [.42, .44, .4], 'Sovik glow');
  add(blob, outer, [0, .2, 0], [.27, .24, .25]);
  add(blob, middle, [0, .19, .02], [.2, .19, .19]);
  add(blob, heart, [0, .13, .03], [.1, .09, .09], 'Sovik heart');
  const tongues = [[0, .52, 0, .15, .42], [-.14, .44, -.02, .09, .3], [.15, .42, .02, .08, .27], [.04, .42, -.12, .08, .26], [-.05, .4, .12, .07, .22]]
    .map(([x, y, z, r, h], i) => add(tongue, i ? middle : outer, [x, y, z], [r, h, r], `Sovik tongue ${i}`));
  // The face: two white-hot eyes, a pupil in each, and a mouth that is mostly teeth.
  const face = new THREE.Group(); face.name = 'Sovik face'; face.position.set(0, .22, .2); group.add(face);
  const eyes = [-1, 1].map(side => {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(.052, 10, 8), white); eye.position.set(side * .075, .03, 0); eye.scale.set(1, 1.25, .6);
    const pupil = new THREE.Mesh(new THREE.SphereGeometry(.022, 8, 6), dark); pupil.position.set(0, -.004, .03); eye.add(pupil);
    face.add(eye); return eye;
  });
  const mouth = new THREE.Mesh(new THREE.TorusGeometry(.06, .016, 5, 12, Math.PI), dark);
  mouth.name = 'Sovik mouth'; mouth.position.set(0, -.07, .01); mouth.rotation.z = Math.PI; face.add(mouth);
  group.scale.setScalar(scale);
  // Drawn after the glass he sits behind.
  group.traverse(mesh => { if (mesh.isMesh) mesh.renderOrder = 5; });

  function animate(time = 0) {
    tongues.forEach((mesh, i) => {
      const beat = Math.sin(time * (7 + i * 1.7) + i * 1.3) * .5 + .5;
      mesh.scale.y = [.42, .3, .27, .26, .22][i] * (.8 + beat * .45);
      mesh.position.y = [.52, .44, .42, .42, .4][i] + beat * .03;
    });
    body.rotation.y = Math.sin(time * 1.3) * .25;
    body.scale.setScalar(1 + Math.sin(time * 11) * .03);
    // A blink every few seconds, which a fire has no business doing.
    const blink = (time % 4.3) < .12 ? .15 : 1;
    for (const eye of eyes) eye.scale.y = 1.25 * blink;
    face.position.y = .22 + Math.sin(time * 2.1) * .012;
  }
  animate(0);
  return { group, animate };
}

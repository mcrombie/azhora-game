/**
 * The Old Tree, drawn (`src/talking-tree.js` is what it does).
 */
import * as THREE from 'three';
import { TALKING_TREE } from './talking-tree.js';

/**
 * Draw the tree: a great trunk flared at the root, limbs, a canopy, and a face
 * on its own pivot at the trunk's centre so it can slide round the bark. `pose`
 * takes the logic's view each frame.
 */
export function buildTalkingTree(scene, world, tree = TALKING_TREE) {
  const root = new THREE.Group(); root.name = 'The Old Tree';
  const y = world.heightAt(tree.x, tree.z);
  root.position.set(tree.x, y, tree.z); scene.add(root);
  const bark = new THREE.MeshStandardMaterial({ color: 0x5a4a3a, roughness: .98, flatShading: true });
  const barkDark = new THREE.MeshStandardMaterial({ color: 0x3f3328, roughness: 1, flatShading: true });
  const leaves = new THREE.MeshStandardMaterial({ color: 0x4a6d3a, roughness: .95, flatShading: true });
  const leavesDeep = new THREE.MeshStandardMaterial({ color: 0x3c5c31, roughness: .95, flatShading: true });
  const add = (geometry, material, x, yy, z, rx = 0, ry = 0, rz = 0, parent = root) => {
    const mesh = new THREE.Mesh(geometry, material); mesh.position.set(x, yy, z); mesh.rotation.set(rx, ry, rz);
    mesh.castShadow = true; mesh.receiveShadow = true; parent.add(mesh); return mesh;
  };
  const r = tree.trunkRadius;
  add(new THREE.CylinderGeometry(r * .78, r * 1.35, 9, 11), bark, 0, 4.5, 0);
  add(new THREE.CylinderGeometry(r * .55, r * .78, 6, 10), bark, 0, 12, 0);
  // Root flare: buttresses running out into the ground.
  for (let i = 0; i < 7; i++) {
    const a = i * Math.PI * 2 / 7 + .3;
    add(new THREE.BoxGeometry(.7, 1.4, 3.2), barkDark, Math.sin(a) * r * 1.2, .5, Math.cos(a) * r * 1.2, 0, a, .35);
  }
  // The great limbs, and a canopy far above the rest of the wood.
  for (let i = 0; i < 5; i++) {
    const a = i * 1.26 + .5;
    add(new THREE.CylinderGeometry(.35, .6, 7, 7), bark, Math.sin(a) * 2.6, 13.5, Math.cos(a) * 2.6, Math.cos(a) * .75, 0, -Math.sin(a) * .75);
  }
  for (let i = 0; i < 9; i++) {
    const a = i * 2.39996, d = i === 0 ? 0 : 3.5 + (i % 3) * 1.6;
    add(new THREE.IcosahedronGeometry(4.2 - (i % 3) * .6, 1), i % 2 ? leaves : leavesDeep,
      Math.sin(a) * d, tree.height - 4 - (i % 3) * 1.4, Math.cos(a) * d);
  }

  // The face, on a pivot at the trunk's centre so it can slide round the bark.
  const pivot = new THREE.Group(); pivot.name = 'The Old Tree’s face'; pivot.position.y = 4.2; root.add(pivot);
  const hollow = new THREE.MeshStandardMaterial({ color: 0x1a130e, roughness: 1 });
  const glint = new THREE.MeshStandardMaterial({ color: 0x3a2c18, emissive: 0xc8913a, emissiveIntensity: 0, roughness: .6 });
  const face = r * .86;
  const brows = [-1, 1].map(side => add(new THREE.BoxGeometry(1.1, .32, .5), barkDark, side * .72, 1.05, face, 0, 0, side * -.28, pivot));
  const eyes = [-1, 1].map(side => {
    const socket = add(new THREE.SphereGeometry(.42, 10, 8), hollow, side * .68, .55, face - .12, 0, 0, 0, pivot);
    socket.scale.set(1, .001, .55);
    const light = add(new THREE.SphereGeometry(.13, 8, 6), glint, side * .66, .55, face + .12, 0, 0, 0, pivot);
    light.scale.setScalar(.001);
    return { socket, light };
  });
  const mouth = add(new THREE.BoxGeometry(1.2, .14, .4), hollow, 0, -.75, face - .05, 0, 0, 0, pivot);
  mouth.scale.set(.001, 1, 1);
  const nose = add(new THREE.BoxGeometry(.5, 1.1, .6), barkDark, 0, .05, face + .05, -.1, 0, 0, pivot);

  function pose(view) {
    pivot.rotation.y = view.faceYaw;
    const open = Math.max(0, Math.min(1, view.open));
    // The bark gathers first, then the eyes open in it; hiding runs the other way.
    const bark = Math.min(1, open * 1.8), eyesOpen = Math.max(0, (open - .45) / .55);
    for (const brow of brows) brow.position.z = face - .3 + bark * .3;
    nose.position.z = face - .45 + bark * .5;
    for (const { socket, light } of eyes) {
      socket.scale.set(1, Math.max(.001, eyesOpen), .55);
      light.scale.setScalar(Math.max(.001, eyesOpen));
    }
    glint.emissiveIntensity = eyesOpen * .9;
    mouth.scale.x = Math.max(.001, bark * .8);
  }
  pose({ faceYaw: 0, open: 0 });

  // One collider for the trunk and its buttresses.
  const collider = { x: tree.x, z: tree.z, r: r * 1.6, kind: 'old-tree' };

  return { root, pose, collider,
    dispose() { root.removeFromParent(); root.traverse(object => { if (object.isMesh) object.geometry.dispose(); }); } };
}

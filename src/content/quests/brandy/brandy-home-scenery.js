import * as THREE from 'three';
import { BRANDY_HOME, BRANDY_HOME_PATH } from './brandy-home-world.js';
import { RAINBOW } from './brandy-boards.js';

function nameplate(text, material) {
  if (typeof document === 'undefined') return material('#f2dfb5');
  const canvas = document.createElement('canvas'); canvas.width = 640; canvas.height = 112;
  const context = canvas.getContext('2d');
  context.fillStyle = '#f2dfb5'; context.fillRect(0, 0, canvas.width, canvas.height);
  context.strokeStyle = '#866a49'; context.lineWidth = 5; context.strokeRect(4, 4, 632, 104);
  context.fillStyle = '#303b35'; context.font = 'bold 56px Georgia'; context.textAlign = 'center'; context.textBaseline = 'middle';
  context.fillText(text, 320, 58);
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
  return new THREE.MeshStandardMaterial({ map: texture, roughness: .95 });
}

/** Brandy's coastal cottage, a shared home for Jon and Bosco. Interior spaces
 * remain abstract; the resident host owns the physical door interaction. */
export function createBrandyHomeScenery({ parent, cottage, material, mesh, box, post, round, cylinder, heightAt, colliders }) {
  const root = new THREE.Group(); root.name = 'Jon and Brandy coastal home'; parent.add(root);
  const h = BRANDY_HOME.house, colliderStart = colliders.length;
  const building = cottage(h.x, h.z, h.width, h.depth, h.height, 0x59696b, 0xe0d6bf, h.yaw, root);
  building.name = 'Jon and Brandy cottage'; building.userData.homeId = BRANDY_HOME.homeId;
  // The shared cottage's broad circular collider is useful for scattered houses,
  // but a resident must reach this actual front door. This cottage is axis aligned.
  for (let i = colliderStart; i < colliders.length; i++) if (colliders[i].kind === 'house') {
    delete colliders[i].r;
    Object.assign(colliders[i], { hx: h.depth / 2 + .18, hz: h.width / 2 + .18, kind: 'brandy-home', homeId: BRANDY_HOME.homeId });
  }
  const wood = material('#76563d'), dark = material('#35473f'), teal = material('#3d969b'), lilac = material('#ad89ac');
  const face = h.depth / 2;
  // A restrained line of her colours around the door, with cloth tied to the
  // porch side. The familiar bright animal boards remain the main display.
  for (const side of [-1, 1]) box(teal, side * .64, 1.45, face + .18, .12, 2.3, .13, building);
  box(lilac, 0, 2.6, face + .18, 1.42, .15, .13, building);
  for (let i = 0; i < RAINBOW.length; i++) box(material(RAINBOW[i]), -.43 + i * .13, 2.4, face + .265, .11, .11, .025, building);
  const bowl = { x: -10.65, z: 113.0 }, bowlY = heightAt(bowl.x, bowl.z);
  mesh(cylinder, teal, bowl.x, bowlY + .12, bowl.z, .28, .19, .28, root);
  mesh(cylinder, dark, bowl.x, bowlY + .216, bowl.z, .22, .012, .22, root);
  colliders.push({ ...bowl, r: .27, kind: 'brandy-dog-bowl' });
  const mat = box(lilac, -10.2, heightAt(-10.2, 112) + .025, 112, .95, .04, .62, root);
  mat.name = 'Bosco porch blanket';

  const mail = BRANDY_HOME.mailbox, mailbox = new THREE.Group(); mailbox.name = 'Jon and Brandy mailbox';
  mailbox.userData.label = mail.name;
  mailbox.position.set(mail.x, heightAt(mail.x, mail.z), mail.z); mailbox.rotation.y = mail.yaw; root.add(mailbox);
  post(wood, 0, .54, 0, .085, 1.08, mailbox);
  box(wood, 0, 1.04, 0, 1.16, .09, .58, mailbox);
  box(teal, 0, 1.32, 0, 1.05, .49, .5, mailbox);
  for (const side of [-1, 1]) box(dark, side * .29, 1.64, 0, .62, .065, .63, mailbox).rotation.z = -side * .2;
  box(dark, 0, 1.47, .262, .57, .035, .024, mailbox);
  const plate = new THREE.Mesh(new THREE.PlaneGeometry(.92, .162), nameplate(mail.name, material));
  plate.name = 'Jon and Brandy mailbox nameplate'; plate.position.set(0, 1.27, .26); mailbox.add(plate);
  mesh(round, material('#ccb477'), .41, 1.34, .266, .033, .045, .026, mailbox);
  colliders.push({ x: mail.x, z: mail.z, r: .59, kind: 'brandy-mailbox', homeId: BRANDY_HOME.homeId });

  // A narrow, ground-following dirt path; the bend leaves the boards and letterbox
  // to the side and provides an uninterrupted approach to the door.
  const vertices = [], indices = [], pathWidth = 1.2;
  for (let i = 1; i < BRANDY_HOME_PATH.length; i++) {
    const a = BRANDY_HOME_PATH[i - 1], b = BRANDY_HOME_PATH[i], dx = b.x - a.x, dz = b.z - a.z, length = Math.hypot(dx, dz), steps = Math.ceil(length / .5);
    for (let k = 0; k < steps; k++) {
      const offset = vertices.length / 3;
      for (const t of [k / steps, (k + 1) / steps]) for (const side of [-1, 1]) {
        const x = a.x + dx * t - dz / length * side * pathWidth / 2, z = a.z + dz * t + dx / length * side * pathWidth / 2;
        vertices.push(x, heightAt(x, z) + .04, z);
      }
      indices.push(offset, offset + 2, offset + 1, offset + 1, offset + 2, offset + 3);
    }
  }
  const geometry = new THREE.BufferGeometry(); geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3)); geometry.setIndex(indices); geometry.computeVertexNormals();
  const trail = new THREE.Mesh(geometry, material('#a6a079', { side: THREE.DoubleSide })); trail.name = 'Brandy shore cottage footpath'; trail.receiveShadow = true; root.add(trail);
  root.traverse(object => { if (object.isMesh) object.userData.passable = true; });
  return { root, building, mailbox, path: Object.assign(BRANDY_HOME_PATH.map(p => ({ ...p })), { kind: 'trail', width: pathWidth }) };
}

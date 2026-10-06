import * as THREE from 'three';
import { INQUEST_HOME, INQUEST_HOME_PATH } from './inquest-home.js';

/** A modest cottage using the existing world's architecture. The resident is
 * still a blank slate; no wizard props or interior are invented here. */
export function createInquestHome({ parent, cottage, material, box, post, heightAt, colliders }) {
  const root = new THREE.Group(); root.name = INQUEST_HOME.name;
  root.userData.homeId = INQUEST_HOME.id; parent.add(root);
  const h = INQUEST_HOME.house, start = colliders.length;
  const building = cottage(h.x, h.z, h.width, h.depth, h.height, 0x566969, 0xdcd8c2, h.yaw, root, { plain: true });
  building.name = INQUEST_HOME.name; building.userData.homeId = INQUEST_HOME.id;
  // The foundation covers the gentle shore slope; use the rendered ground for
  // every piece and keep the entrance outside the actual east-facing walls.
  building.position.y = heightAt(h.x, h.z);
  for (let i = start; i < colliders.length; i++) if (colliders[i].kind === 'house') {
    delete colliders[i].r;
    Object.assign(colliders[i], { hx: h.depth / 2 + .18, hz: h.width / 2 + .18,
      kind: 'inquest-home', homeId: INQUEST_HOME.id });
  }

  const mail = INQUEST_HOME.mailbox, mailbox = new THREE.Group();
  mailbox.name = `${mail.name} mailbox`; mailbox.userData.label = mail.name;
  mailbox.position.set(mail.x, heightAt(mail.x, mail.z), mail.z);
  mailbox.rotation.y = mail.yaw; root.add(mailbox);
  const wood = material('#765e47'), slate = material('#566969'), dark = material('#354341');
  post(wood, 0, .57, 0, .085, 1.14, mailbox);
  box(wood, 0, 1.08, 0, 1.48, .09, .58, mailbox);
  box(slate, 0, 1.36, 0, 1.38, .48, .5, mailbox);
  for (const side of [-1, 1]) box(dark, side * .37, 1.68, 0, .8, .065, .63, mailbox).rotation.z = -side * .2;
  box(dark, 0, 1.53, .262, .66, .035, .024, mailbox);
  let labelMaterial = material('#f2dfb5');
  if (typeof document !== 'undefined') {
    const canvas = document.createElement('canvas'); canvas.width = 768; canvas.height = 128;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#f2dfb5'; ctx.fillRect(0, 0, 768, 128);
    ctx.strokeStyle = '#866a49'; ctx.lineWidth = 5; ctx.strokeRect(4, 4, 760, 120);
    ctx.fillStyle = '#303b35'; ctx.font = 'bold 60px Georgia'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(mail.name, 384, 66, 730);
    const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
    labelMaterial = new THREE.MeshStandardMaterial({ map: texture, roughness: .95 });
  }
  const plate = new THREE.Mesh(new THREE.PlaneGeometry(1.25, .208), labelMaterial);
  plate.name = `${mail.name} nameplate`; plate.position.set(0, 1.33, .26); mailbox.add(plate);
  colliders.push({ x: mail.x, z: mail.z, r: .72, kind: 'inquest-mailbox', homeId: INQUEST_HOME.id });

  const vertices = [], indices = [], width = 1.1;
  for (let i = 1; i < INQUEST_HOME_PATH.length; i++) {
    const a = INQUEST_HOME_PATH[i - 1], b = INQUEST_HOME_PATH[i];
    const dx = b.x - a.x, dz = b.z - a.z, length = Math.hypot(dx, dz), steps = Math.ceil(length / .5);
    for (let j = 0; j < steps; j++) {
      const offset = vertices.length / 3;
      for (const t of [j / steps, (j + 1) / steps]) for (const side of [-1, 1]) {
        const x = a.x + dx * t - dz / length * side * width / 2;
        const z = a.z + dz * t + dx / length * side * width / 2;
        vertices.push(x, heightAt(x, z) + .04, z);
      }
      indices.push(offset, offset + 2, offset + 1, offset + 1, offset + 2, offset + 3);
    }
  }
  const geometry = new THREE.BufferGeometry(); geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setIndex(indices); geometry.computeVertexNormals();
  const trail = new THREE.Mesh(geometry, material('#a6a079', { side: THREE.DoubleSide }));
  trail.name = 'Long Tarn cottage footpath'; trail.receiveShadow = true; root.add(trail);
  root.traverse(object => { if (object.isMesh) object.userData.passable = true; });
  return { root, building, mailbox, path: Object.assign(INQUEST_HOME_PATH.map(p => ({ ...p })), { kind: 'trail', width }) };
}

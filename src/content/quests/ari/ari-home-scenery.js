import * as THREE from 'three';
import { ARI_HOME } from './ari-home.js';
import { createSceneryBuilder } from '../../../world/scenery/scenery-builder.js';

/** Small permanent details around Ari's existing Applegarth cottage. The lesson
 * beds stay separate so planted/harvested flowers keep their actual farm state. */
export function buildAriHome({ parent, heightAt, colliders }) {
  const root = new THREE.Group(); root.name = ARI_HOME.name; root.userData.homeId = ARI_HOME.id; parent.add(root);
  const b = createSceneryBuilder('Ari cottage garden and mailbox'), home = ARI_HOME.house;
  const ground = Math.min(heightAt(home.x, home.z), heightAt(home.x + home.width / 2, home.z),
    heightAt(home.x - home.width / 2, home.z), heightAt(home.x, home.z + home.depth / 2), heightAt(home.x, home.z - home.depth / 2));
  b.frame(home.x, ground, home.z, home.yaw, () => {
    const face = -home.depth / 2;
    b.block('#87719c', 0, .4, face - .113, .9, 1.85, .028);
    b.rock('#d6b968', .29, 1.28, face - .14, .045, .045, .03);
    for (const side of [-1, 1]) {
      const window = side * home.width * .3;
      b.block('#ebdcad', window, 1.44, face - .077, .69, .74, .025);
      b.block('#6c647f', window, 1.44, face - .104, .06, .74, .023);
      b.box('#6c647f', window, 1.81, face - .104, .7, .055, .023);
      for (const edge of [-1, 1]) b.block('#87719c', window + edge * .58, 1.38, face - .068, .28, .96, .065);
    }
    // A small sunflower motif above the door ties the house to her garden.
    for (let i = 0; i < 8; i++) {
      const a = i / 8 * Math.PI * 2;
      b.rock('#dcb34e', Math.cos(a) * .17, 2.58 + Math.sin(a) * .17, face - .08, .09, .09, .035);
    }
    b.rock('#6d5036', 0, 2.58, face - .115, .115, .115, .04);
  });
  for (const stone of ARI_HOME.stones) b.rock('#bcb49a', stone.x, heightAt(stone.x, stone.z) + .035, stone.z, .49, .07, .34, stone.yaw);
  for (const [index, pot] of ARI_HOME.planters.entries()) {
    const y = heightAt(pot.x, pot.z), facing = home.yaw;
    b.cylinder('#ae7960', pot.x, y, pot.z, .34, .42);
    b.cylinder('#624d37', pot.x, y + .42, pot.z, .3, .022);
    b.frame(pot.x, y, pot.z, facing, () => {
      for (const side of [-1, 1]) {
        const x = side * .13, tall = 1.25 + .18 * ((index + side + 1) % 2);
        b.beam('#63834d', [x, .42, 0], [x, tall, 0], .045);
        b.rock('#719454', x - .13, .72, 0, .2, .07, .09, .3);
        b.rock('#719454', x + .12, .94, 0, .18, .065, .09, -.2);
        for (let k = 0; k < 9; k++) {
          const a = k / 9 * Math.PI * 2;
          b.rock('#edc557', x + Math.cos(a) * .2, tall + Math.sin(a) * .2, -.035, .105, .105, .04);
        }
        b.rock('#67442d', x, tall, -.08, .13, .13, .05);
      }
    });
    colliders.push({ ...pot, r: .34, kind: 'ari-sunflower-planter', homeId: ARI_HOME.id });
  }
  const mail = ARI_HOME.mailbox, mailGround = heightAt(mail.x, mail.z);
  b.frame(mail.x, mailGround, mail.z, mail.yaw, () => {
    b.block('#73553d', 0, 0, 0, .14, 1.2, .14);
    b.box('#a38361', 0, 1.14, 0, .99, .09, .61);
    b.block('#87719c', 0, 1.18, 0, .85, .48, .52);
    b.box('#443d52', 0, 1.53, -.271, .46, .035, .018);
    b.roof('#626384', 0, 1.68, 0, 1.03, .69, .2, 0, '#b6a6c2');
    b.rock('#d6b968', .32, 1.32, -.28, .035, .05, .024);
  });
  b.finish(root);
  let material = new THREE.MeshStandardMaterial({ color: '#f0e2bf', roughness: .95 });
  if (typeof document !== 'undefined') {
    const canvas = document.createElement('canvas'); canvas.width = 256; canvas.height = 72;
    const ctx = canvas.getContext('2d'); ctx.fillStyle = '#f0e2bf'; ctx.fillRect(0, 0, 256, 72);
    ctx.fillStyle = '#493d56'; ctx.font = 'bold 46px Georgia'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(mail.name, 128, 37);
    const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
    material.dispose(); material = new THREE.MeshStandardMaterial({ map: texture, roughness: .95 });
  }
  const plate = new THREE.Mesh(new THREE.PlaneGeometry(.65, .18), material);
  plate.name = 'Ari mailbox nameplate'; plate.userData.label = mail.name; plate.rotation.y = mail.yaw + Math.PI;
  plate.position.set(mail.x - Math.sin(mail.yaw) * .282, mailGround + 1.34, mail.z - Math.cos(mail.yaw) * .282); root.add(plate);
  colliders.push({ x: mail.x, z: mail.z, r: .51, kind: 'ari-mailbox', homeId: ARI_HOME.id });
  root.traverse(object => { if (object.isMesh) object.userData.passable = true; });
  return { root, mailbox: mail, nameplate: plate };
}

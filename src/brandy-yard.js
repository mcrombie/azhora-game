import * as THREE from 'three';
import { BRANDY_YARD, BRANDY_SIGN, YARD_LAYOUT, yardPoint, yardColliders } from './brandy.js';

/**
 * Brandy Frank's dye yard (src/brandy.js), on the lane up to Saltwind Lookout:
 * three dye vats of colours Drent has no business having, two drying lines of
 * impossible cloth, a bench of folded bolts, her sign, and three painted boards
 * of the animals the way they ought to be: a rainbow leopard, a pink dolphin
 * leaping a rainbow, and a little bear in a heart with a star on its nose.
 * Everything is passable to the prop pass; the yard's own colliders stand in.
 */
function painted(width, height, draw, fallback) {
  if (typeof document === 'undefined') return new THREE.MeshStandardMaterial({ color: fallback, roughness: .9 });
  const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height;
  draw(canvas.getContext('2d'), width, height);
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
  return new THREE.MeshStandardMaterial({ map: texture, roughness: .9 });
}
const RAINBOW = ['#ff3fa4', '#ff8c1a', '#ffe135', '#7ed321', '#1ec8d8', '#8e44ec'];
function sparkles(g, w, h, count, seed = 1) {
  let s = seed;
  const rnd = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
  for (let k = 0; k < count; k++) {
    const x = rnd() * w, y = rnd() * h, r = 4 + rnd() * 7;
    g.fillStyle = k % 3 ? '#fff6a8' : '#ffffff';
    g.beginPath();
    for (let p = 0; p < 8; p++) { const a = p / 8 * Math.PI * 2, rr = p % 2 ? r * .4 : r; g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
    g.fill();
  }
}
const heart = (g, x, y, s) => { g.beginPath(); g.moveTo(x, y + s * .35); g.bezierCurveTo(x - s, y - s * .35, x - s * .45, y - s, x, y - s * .45); g.bezierCurveTo(x + s * .45, y - s, x + s, y - s * .35, x, y + s * .35); g.fill(); };
const PAINTINGS = {
  leopard: (g, w, h) => {
    const sky = g.createLinearGradient(0, 0, w, h); sky.addColorStop(0, '#ff3fa4'); sky.addColorStop(1, '#8e44ec'); g.fillStyle = sky; g.fillRect(0, 0, w, h);
    sparkles(g, w, h, 26, 7);
    const fur = g.createLinearGradient(w * .2, 0, w * .85, 0); RAINBOW.forEach((c, i) => fur.addColorStop(i / 5, c));
    g.fillStyle = fur;
    g.beginPath(); g.ellipse(w * .52, h * .6, w * .26, h * .17, -.08, 0, Math.PI * 2); g.fill();          // body
    g.beginPath(); g.arc(w * .26, h * .44, h * .15, 0, Math.PI * 2); g.fill();                           // head
    for (const [x, y] of [[w * .19, h * .3], [w * .31, h * .29]]) { g.beginPath(); g.moveTo(x - 12, y + 10); g.lineTo(x, y - 14); g.lineTo(x + 12, y + 10); g.fill(); }
    g.lineWidth = 16; g.strokeStyle = fur; g.beginPath(); g.moveTo(w * .76, h * .56); g.quadraticCurveTo(w * .95, h * .4, w * .88, h * .22); g.stroke();
    for (const [x, y] of [[w * .38, h * .78], [w * .46, h * .8], [w * .6, h * .8], [w * .68, h * .78]]) g.fillRect(x, y - 8, 14, 42);
    g.fillStyle = '#2a1030';
    for (let k = 0; k < 22; k++) { const a = k * 2.4, r = (k % 5) * .045 + .04; g.beginPath(); g.ellipse(w * (.52 + Math.cos(a) * r * 1.6), h * (.6 + Math.sin(a) * r * .9), 9, 6, a, 0, Math.PI * 2); g.fill(); }
    g.fillStyle = '#ffffff'; for (const x of [w * .22, w * .3]) { g.beginPath(); g.arc(x, h * .42, 9, 0, Math.PI * 2); g.fill(); }
    g.fillStyle = '#1a1a2e'; for (const x of [w * .22, w * .3]) { g.beginPath(); g.arc(x + 2, h * .43, 5, 0, Math.PI * 2); g.fill(); }
    g.fillStyle = '#ff7fc4'; g.beginPath(); g.arc(w * .26, h * .5, 6, 0, Math.PI * 2); g.fill();
  },
  dolphin: (g, w, h) => {
    const sea = g.createLinearGradient(0, 0, 0, h); sea.addColorStop(0, '#6ad0ff'); sea.addColorStop(.6, '#b98cff'); sea.addColorStop(1, '#1ec8d8'); g.fillStyle = sea; g.fillRect(0, 0, w, h);
    RAINBOW.forEach((c, i) => { g.strokeStyle = c; g.lineWidth = 12; g.beginPath(); g.arc(w * .5, h * 1.02, w * .44 - i * 12, Math.PI, 0); g.stroke(); });
    sparkles(g, w, h, 20, 3);
    g.fillStyle = '#ff5fb4';
    g.beginPath(); g.moveTo(w * .18, h * .7); g.quadraticCurveTo(w * .4, h * .12, w * .72, h * .34); g.quadraticCurveTo(w * .8, h * .38, w * .84, h * .32);
    g.lineTo(w * .82, h * .42); g.quadraticCurveTo(w * .5, h * .38, w * .26, h * .78); g.closePath(); g.fill();
    g.beginPath(); g.moveTo(w * .45, h * .3); g.lineTo(w * .5, h * .16); g.lineTo(w * .56, h * .3); g.fill();
    g.beginPath(); g.moveTo(w * .2, h * .72); g.lineTo(w * .1, h * .8); g.lineTo(w * .24, h * .84); g.fill();
    g.fillStyle = '#1a1a2e'; g.beginPath(); g.arc(w * .74, h * .35, 5, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#ffffff'; g.fillRect(w * .1, h * .88, w * .8, 6);
  },
  bear: (g, w, h) => {
    g.fillStyle = '#ff3fa4'; g.fillRect(0, 0, w, h);
    sparkles(g, w, h, 24, 11);
    RAINBOW.forEach((c, i) => { g.fillStyle = c; heart(g, w / 2, h * .62, h * (.62 - i * .055)); });
    g.fillStyle = '#ffffff'; heart(g, w / 2, h * .62, h * .3);
    const face = (x, y) => {
      g.fillStyle = '#f2ece0'; g.beginPath(); g.arc(x, y, h * .15, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#2a1030'; for (const s of [-1, 1]) { g.beginPath(); g.arc(x + s * h * .12, y - h * .12, h * .055, 0, Math.PI * 2); g.fill(); g.beginPath(); g.ellipse(x + s * h * .06, y - h * .01, h * .035, h * .045, s * .5, 0, Math.PI * 2); g.fill(); }
      g.fillStyle = '#ffffff'; for (const s of [-1, 1]) { g.beginPath(); g.arc(x + s * h * .055, y - h * .02, 4, 0, Math.PI * 2); g.fill(); }
      g.fillStyle = '#ffe135'; g.beginPath(); for (let p = 0; p < 10; p++) { const a = p / 10 * Math.PI * 2 - Math.PI / 2, r = p % 2 ? 6 : 14; g.lineTo(x + Math.cos(a) * r, y + h * .06 + Math.sin(a) * r); } g.fill();
    };
    face(w / 2, h * .5);
  },
};

export function createBrandyYard(kit) {
  const { parent, material, mesh, box, post, round, cylinder, heightAt, colliders, signs } = kit;
  const group = new THREE.Group(); group.name = 'Brandy Frank’s dye yard'; parent.add(group);
  const yaw = BRANDY_YARD.yaw, ground = (lx, lz) => { const p = yardPoint(lx, lz); return heightAt(p.x, p.z); };
  const wood = material('#7a5638'), woodDark = material('#4f3724'), rope = material('#d8cfb0'), stain = material('#b0508f');
  const at = (lx, lz) => yardPoint(lx, lz);

  // The vats: tubs of colour, a stir-stick in each, a splash of it on the ground.
  for (const v of YARD_LAYOUT.vats) {
    const p = at(v.lx, v.lz), y = ground(v.lx, v.lz), dye = material(`#${v.dye.toString(16).padStart(6, '0')}`, { roughness: .35, emissive: `#${v.dye.toString(16).padStart(6, '0')}`, emissiveIntensity: .25 });
    mesh(cylinder, wood, p.x, y + .32, p.z, v.r, .64, v.r, group);
    for (const h of [.1, .52]) mesh(cylinder, woodDark, p.x, y + h, p.z, v.r + .015, .05, v.r + .015, group);
    mesh(cylinder, dye, p.x, y + .6, p.z, v.r - .04, .03, v.r - .04, group);
    const stick = post(woodDark, p.x + .15, y + .85, p.z, .02, .8, group); stick.rotation.z = .35;
    mesh(cylinder, dye, p.x + v.r + .25, y + .01, p.z + .1, .32, .01, .22, group);
  }
  // Two drying lines of cloth, one of it leopard.
  for (const line of YARD_LAYOUT.lines) {
    const [a0, b0] = line.from, [a1, b1] = line.to, length = Math.hypot(a1 - a0, b1 - b0);
    for (const [lx, lz] of [line.from, line.to]) { const p = at(lx, lz); post(wood, p.x, ground(lx, lz) + 1.1, p.z, .06, 2.2, group); }
    const mid = at((a0 + a1) / 2, (b0 + b1) / 2), top = Math.max(ground(a0, b0), ground(a1, b1)) + 2.1;
    const cord = box(rope, mid.x, top, mid.z, length, .02, .02, group); cord.rotation.y = yaw;
    line.cloths.forEach((cloth, i) => {
      const t = (i + .5) / line.cloths.length, lx = a0 + (a1 - a0) * t, lz = b0 + (b1 - b0) * t, p = at(lx, lz);
      const leopard = cloth === 'leopard', fabric = material(leopard ? '#e8388f' : `#${cloth.toString(16).padStart(6, '0')}`, { side: THREE.DoubleSide });
      const panel = box(fabric, p.x, top - .45, p.z, length / line.cloths.length * .8, .9, .02, group); panel.rotation.y = yaw;
      if (leopard) for (let k = 0; k < 7; k++) {
        const s = at(lx + ((k * .37) % 1 - .5) * .35, lz + .015), spot = round && mesh(round, material('#2a1030'), s.x, top - .1 - ((k * .61) % 1) * .7, s.z, .04, .03, .012, group);
        if (spot) spot.rotation.y = yaw;
      }
    });
  }
  // The bench, with folded bolts in every colour.
  { const b = YARD_LAYOUT.bench, p = at(b.lx, b.lz), y = ground(b.lx, b.lz);
    const top = box(wood, p.x, y + .62, p.z, b.w, .08, b.d, group); top.rotation.y = yaw;
    for (const side of [-1, 1]) for (const end of [-1, 1]) { const q = at(b.lx + side * (b.w / 2 - .1), b.lz + end * (b.d / 2 - .08)); post(woodDark, q.x, y + .3, q.z, .04, .6, group); }
    ['#ff3fa4', '#ffe135', '#1ec8d8', '#8e44ec', '#7ed321'].forEach((tint, i) => { const q = at(b.lx - .55 + i * .27, b.lz); const bolt = box(material(tint), q.x, y + .7 + (i % 2) * .08, q.z, .24, .1 + (i % 2) * .08, .4, group); bolt.rotation.y = yaw; }); }
  // The painted boards.
  for (const board of YARD_LAYOUT.boards) {
    const p = at(board.lx, board.lz), y = ground(board.lx, board.lz), turn = yaw + board.turn;
    const art = box(painted(384, 288, PAINTINGS[board.id], 0xff3fa4), p.x, y + 1.35, p.z, 1.36, 1.02, .06, group); art.rotation.y = turn;
    const frame = box(material('#ffe135'), p.x, y + 1.35, p.z, 1.46, 1.12, .04, group); frame.rotation.y = turn;
    frame.position.x -= Math.sin(turn) * .02; frame.position.z -= Math.cos(turn) * .02;
    for (const side of [-1, 1]) post(woodDark, p.x + Math.cos(turn) * side * .62, y + .9, p.z - Math.sin(turn) * side * .62, .05, 1.8, group);
  }
  // Rainbow on the ground where the dye has been tipped for years.
  RAINBOW.forEach((tint, i) => { const p = at(-2.1 + i * .08, 1.25); mesh(cylinder, material(tint), p.x, ground(-2.1, 1.25) + .012 + i * .001, p.z, .9 - i * .12, .01, .5 - i * .06, group); });
  group.traverse(object => { if (object.isMesh) object.userData.passable = true; });
  for (const c of yardColliders()) colliders.push(c);
  // Her sign, at the lane.
  { const s = at(YARD_LAYOUT.sign.lx, YARD_LAYOUT.sign.lz); signs.place({ x: s.x, z: s.z, label: BRANDY_SIGN, facing: yaw, parent }); }
  return { group };
}

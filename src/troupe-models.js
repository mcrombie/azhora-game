import * as THREE from 'three';
import { createCharacter, createDog, createHorse } from './characters.js';

/**
 * Talaelos, the players of Nylon (src/troupe.js), as figures. Five players dressed in the
 * game's own figures with Elizabethan kit hung on their joints (ruffs, doublet
 * buttons, capes, trunk hose, caps and plumes, props), their dog Understudy
 * in a ruff, The Critic (their grey mare), and a painted pageant wagon whose
 * side comes down to make a stage.
 */
const mat = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: .85, ...extra });
const ball = new THREE.IcosahedronGeometry(1, 1), tube = new THREE.CylinderGeometry(1, 1, 1, 10), cube = new THREE.BoxGeometry(1, 1, 1);
function add(parent, geometry, material, [x, y, z], [sx, sy, sz] = [1, 1, 1], [rx, ry, rz] = [0, 0, 0]) {
  const m = new THREE.Mesh(geometry, material);
  m.position.set(x, y, z); m.scale.set(sx, sy, sz); m.rotation.set(rx, ry, rz);
  m.castShadow = true; parent.add(m); return m;
}
const WHITE = mat(0xf3eee2), GOLD = mat(0xc9a24a, { metalness: .5, roughness: .4 }), BLACK = mat(0x1d1b1f), WOOD = mat(0x7a5638), WOOD_DARK = mat(0x4f3724);

/** Hang a piece made in the figure's body frame onto one of its joints, keeping where it is. */
function hang(actor, jointName, build) {
  const body = actor.group.children[0], joint = jointName ? actor.group.getObjectByName(jointName) : body;
  actor.group.updateMatrixWorld(true);
  /** Where a joint is, in the body frame the pieces are made in. */
  const at = name => body.worldToLocal(actor.group.getObjectByName(name).getWorldPosition(new THREE.Vector3()));
  const holder = new THREE.Group(); body.add(holder); build(holder, at);
  actor.group.updateMatrixWorld(true);
  for (const child of [...holder.children]) joint.attach(child);
  body.remove(holder);
}
/** A pleated ruff round the neck, in the body frame. */
function ruff(parent, { y = 1.33, radius = .2, depth = .07, pleats = 16 } = {}) {
  add(parent, new THREE.TorusGeometry(radius * .8, depth * .5, 6, 20), WHITE, [0, y, .01], [1, 1, 1], [Math.PI / 2, 0, 0]);
  for (let k = 0; k < pleats; k++) {
    const a = k / pleats * Math.PI * 2;
    add(parent, ball, WHITE, [Math.cos(a) * radius, y, .01 + Math.sin(a) * radius * .9], [.055, depth * .75, .055]);
  }
}
function buttons(parent, count = 6, top = 1.24, z = .19) { for (let k = 0; k < count; k++) add(parent, ball, GOLD, [0, top - k * .075, z], [.014, .014, .01]); }
function cape(parent, color, { top = 1.33, length = .85, wide = .34 } = {}) {
  const cloth = mat(color, { side: THREE.DoubleSide });
  add(parent, new THREE.CylinderGeometry(.24, wide, length, 12, 1, true, Math.PI * .5, Math.PI), cloth, [0, top - length / 2, -.02]);
}
/** Puffed trunk hose, one on each hip, striped. */
function trunkHose(actor, color, stripe) {
  for (const side of ['Left', 'Right']) hang(actor, `${side} Hip`, (holder, at) => {
    const p = at(`${side} Hip`);
    add(holder, ball, mat(color), [p.x, p.y - .09, p.z], [.15, .13, .15]);
    for (let k = 0; k < 4; k++) { const a = k / 4 * Math.PI * 2 + .4; add(holder, cube, mat(stripe), [p.x + Math.cos(a) * .14, p.y - .09, p.z + Math.sin(a) * .14], [.03, .22, .03], [0, -a, 0]); }
  });
}
function plume(parent, color, [x, y, z], lean = -.8) {
  const feather = mat(color);
  for (let k = 0; k < 3; k++) add(parent, ball, feather, [x - k * .02, y + .06 + k * .06, z - .04 - k * .07], [.04, .14 - k * .02, .035], [lean - k * .25, 0, .15]);
}

// ---------------------------------------------------------------------------
// The five players
// ---------------------------------------------------------------------------
export const TROUPE = Object.freeze([
  Object.freeze({ id: 'galeon', name: 'Galeon Trell, “the Magnificent”', part: 'Actor-manager', tunic: 0x8c1f2e }),
  Object.freeze({ id: 'isaura', name: 'Isaura Thale', part: 'Tragedian', tunic: 0x1f1d24 }),
  Object.freeze({ id: 'pim', name: 'Pim Belloss', part: 'Clown', tunic: 0xd9a52b }),
  Object.freeze({ id: 'nilor', name: 'Old Nilor', part: 'Book-holder (the book is blank)', tunic: 0x2a3552 }),
  Object.freeze({ id: 'zaela', name: 'Zaela Caeren', part: 'Musician', tunic: 0x3d6b45 }),
]);

export function createPlayer(id) {
  const looks = {
    galeon: { build: 'heavy', hairStyle: 'curls', facialHair: 'forked', hair: 0x6e6254, headgear: 'bare', garment: 'jerkin' },
    isaura: { build: 'tall-lean', hairStyle: 'long-tied', facialHair: 'clean', hair: 0x1c1a1d, headgear: 'bare', garment: 'jerkin' },
    pim: { build: 'short-stocky', hairStyle: 'cropped', facialHair: 'stubble', hair: 0xa0522d, headgear: 'bare', garment: 'jerkin' },
    nilor: { build: 'slight', hairStyle: 'receding', facialHair: 'bushy', hair: 0xdedad0, headgear: 'bare', garment: 'jerkin' },
    zaela: { build: 'slight', hairStyle: 'braid', facialHair: 'clean', hair: 0x7a4a2a, headgear: 'bare', garment: 'jerkin' },
  };
  const entry = TROUPE.find(player => player.id === id);
  const actor = createCharacter({ role: 'mercenary', tunic: entry.tunic, skin: id === 'zaela' ? 0xc99873 : id === 'isaura' ? 0xe9d2bd : id === 'nilor' ? 0xd9b894 : 0xd7ad7e, look: looks[id] });
  actor.group.name = `player-${id}`;
  const head = actor.group.getObjectByName('Head');
  if (id === 'galeon') {
    hang(actor, 'Chest', h => { ruff(h, { radius: .27, depth: .09, pleats: 20 }); buttons(h); cape(h, 0x1c1c22, { wide: .4, length: .95 });
      add(h, new THREE.TorusGeometry(.14, .012, 4, 16), GOLD, [0, 1.16, .14], [1, 1, 1], [1.2, 0, 0]); });
    trunkHose(actor, 0x8c1f2e, 0xc9a24a);
    // A tall hat with a curling white plume.
    add(head, tube, BLACK, [0, .5, -.03], [.15, .2, .15]); add(head, tube, BLACK, [0, .41, -.03], [.27, .02, .27]); add(head, tube, GOLD, [0, .43, -.03], [.152, .025, .152]);
    plume(head, 0xf6f2ea, [.08, .52, -.03]);
    hang(actor, 'Right Wrist', (h, at) => { const w = at('Right Wrist');
      add(h, tube, WOOD_DARK, [w.x, w.y - .05, w.z + .04], [.018, 1.1, .018]); add(h, ball, GOLD, [w.x, w.y + .5, w.z + .04], [.045, .045, .045]); });
  }
  if (id === 'isaura') {
    hang(actor, 'Chest', h => { ruff(h, { radius: .19, depth: .06 }); buttons(h, 7); cape(h, 0x2a2430, { length: 1.1, wide: .38 }); });
    trunkHose(actor, 0x1f1d24, 0x4a3a58);
    // Yorick, more or less: a skull held out in the left hand.
    hang(actor, 'Left Wrist', (h, at) => { const w = at('Left Wrist'), bone = mat(0xe8e0c8);
      add(h, ball, bone, [w.x, w.y - .06, w.z + .1], [.075, .085, .085]); add(h, cube, bone, [w.x, w.y - .13, w.z + .13], [.07, .035, .05]);
      for (const s of [-1, 1]) add(h, ball, BLACK, [w.x + s * .028, w.y - .055, w.z + .175], [.018, .02, .01]); });
  }
  if (id === 'pim') {
    hang(actor, 'Chest', h => {
      ruff(h, { radius: .17, depth: .05, pleats: 12 });
      const colors = [mat(0xc0392b), mat(0xd9a52b), mat(0x3f7f3a)];
      for (let r = 0; r < 4; r++) for (let c = -1; c <= 1; c++) add(h, cube, colors[(r + c + 3) % 3], [c * .1, 1.2 - r * .11, .195 - Math.abs(c) * .02], [.095, .1, .01], [0, c * -.35, Math.PI / 4]);
    });
    trunkHose(actor, 0xc0392b, 0x3f7f3a);
    // A fool's cap with two floppy points and bells.
    const cap = mat(0x3f7f3a), cap2 = mat(0xc0392b);
    add(head, ball, cap, [0, .36, -.03], [.22, .12, .2]);
    for (const s of [-1, 1]) { add(head, new THREE.ConeGeometry(.07, .34, 8), s < 0 ? cap : cap2, [s * .2, .46, -.06], [1, 1, 1], [0, 0, -s * 1.2]); add(head, ball, GOLD, [s * .36, .38, -.06], [.035, .035, .035]); }
    for (const side of ['Left', 'Right']) hang(actor, `${side} Knee`, (h, at) => { const k = at(`${side} Knee`);
      for (let b = 0; b < 3; b++) add(h, ball, GOLD, [k.x + (b - 1) * .05, k.y - .05, k.z + .07], [.022, .022, .022]); });
    // A pig's bladder on a stick, for hitting people with.
    hang(actor, 'Right Wrist', (h, at) => { const w = at('Right Wrist');
      add(h, tube, WOOD, [w.x, w.y + .12, w.z + .06], [.014, .36, .014], [.4, 0, 0]); add(h, ball, mat(0xe0c9a0), [w.x, w.y + .31, w.z + .15], [.07, .085, .07]); });
  }
  if (id === 'nilor') {
    hang(actor, 'Chest', h => { ruff(h, { radius: .15, depth: .045, pleats: 12 });
      add(h, new THREE.CylinderGeometry(.24, .36, 1.05, 12, 1, true), mat(0x2a3552, { side: THREE.DoubleSide }), [0, .78, 0]); });
    // Spectacles, and the book he holds open. Every page is blank.
    for (const s of [-1, 1]) add(head, new THREE.TorusGeometry(.03, .006, 4, 10), GOLD, [s * .066, .226, .205]);
    add(head, cube, GOLD, [0, .228, .21], [.04, .006, .006]);
    hang(actor, 'Left Wrist', (h, at) => { const w = at('Left Wrist');
      for (const s of [-1, 1]) { add(h, cube, mat(0x6b2e22), [w.x + s * .09, w.y - .02, w.z + .14], [.17, .012, .24], [0, 0, s * -.12]); add(h, cube, WHITE, [w.x + s * .085, w.y - .008, w.z + .14], [.15, .014, .22], [0, 0, s * -.12]); } });
  }
  if (id === 'zaela') {
    hang(actor, 'Chest', h => { ruff(h, { radius: .16, depth: .05, pleats: 14 }); buttons(h, 5);
      // A lute slung across the front.
      const lute = new THREE.Group(); lute.position.set(-.02, .98, .24); lute.rotation.set(-.2, 0, .95); h.add(lute);
      add(lute, ball, mat(0xb0763f), [0, 0, 0], [.14, .19, .07]); add(lute, tube, BLACK, [0, .02, .06], [.035, .004, .035], [Math.PI / 2, 0, 0]);
      add(lute, cube, WOOD_DARK, [0, .3, 0], [.045, .34, .025]); add(lute, cube, WOOD_DARK, [0, .5, -.04], [.05, .1, .02], [-.9, 0, 0]);
      add(h, tube, mat(0x5a3a24), [.02, 1.1, .1], [.012, .7, .012], [0, 0, -.95]); });
    trunkHose(actor, 0x3d6b45, 0xc9a24a);
    // A flat cap with a small feather.
    add(head, tube, mat(0x2d4d33), [.03, .41, -.02], [.24, .05, .23], [.1, 0, -.12]); plume(head, 0xc9a24a, [.14, .42, -.02], -1.1);
  }
  return actor;
}

/** Understudy, who plays the dog in every play and understudies every other part. */
export function createUnderstudy() {
  const dog = createDog({ variant: 2 });
  const head = dog.group.getObjectByName('Head');
  if (head) ruff(head, { y: -.02, radius: .13, depth: .05, pleats: 12 });
  return dog;
}
/** The Critic: the troupe's old grey mare, who sighs at every scene. */
export function createCritic() {
  const horse = createHorse({ variant: 2 });
  const head = horse.group.getObjectByName('Head');
  if (head) plume(head, 0x8c1f2e, [0, .25, -.05], -.4);
  return horse;
}

// ---------------------------------------------------------------------------
// The pageant wagon
// ---------------------------------------------------------------------------
function paint(width, height, draw, fallback) {
  if (typeof document === 'undefined') return mat(fallback);
  const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height;
  draw(canvas.getContext('2d'), width, height);
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
  return new THREE.MeshStandardMaterial({ map: texture, roughness: .9 });
}
const backcloth = () => paint(512, 256, (g, w, h) => {
  const sky = g.createLinearGradient(0, 0, 0, h); sky.addColorStop(0, '#6f9fc8'); sky.addColorStop(1, '#e8d9b0'); g.fillStyle = sky; g.fillRect(0, 0, w, h);
  g.fillStyle = '#6d8a4a'; g.beginPath(); g.moveTo(0, h * .75); g.quadraticCurveTo(w * .3, h * .55, w * .55, h * .72); g.quadraticCurveTo(w * .8, h * .85, w, h * .65); g.lineTo(w, h); g.lineTo(0, h); g.fill();
  g.fillStyle = '#b9ad94'; g.fillRect(w * .58, h * .3, w * .22, h * .45); for (let k = 0; k < 5; k++) g.fillRect(w * .58 + k * w * .05, h * .24, w * .03, h * .07);
  g.fillRect(w * .54, h * .18, w * .06, h * .57); g.fillStyle = '#8c1f2e'; g.beginPath(); g.moveTo(w * .54, h * .18); g.lineTo(w * .57, h * .05); g.lineTo(w * .6, h * .18); g.fill();
  g.fillStyle = '#3a2e28'; g.fillRect(w * .66, h * .55, w * .05, h * .2);
  g.fillStyle = '#f6e9b8'; g.beginPath(); g.arc(w * .18, h * .22, h * .09, 0, Math.PI * 2); g.fill();
}, 0x9fb7c9);
const nameboard = () => paint(512, 96, (g, w, h) => {
  g.fillStyle = '#1f1d24'; g.fillRect(0, 0, w, h); g.strokeStyle = '#c9a24a'; g.lineWidth = 6; g.strokeRect(5, 5, w - 10, h - 10);
  g.fillStyle = '#f0d98a'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = '600 44px Georgia, serif'; g.fillText('TALAELOS', w / 2, h * .42);
  g.font = 'italic 22px Georgia, serif'; g.fillText('the players of Nylon', w / 2, h * .78);
}, 0x1f1d24);
const masks = () => paint(512, 256, (g, w, h) => {
  g.fillStyle = '#8c1f2e'; g.fillRect(0, 0, w, h); g.strokeStyle = '#c9a24a'; g.lineWidth = 8; g.strokeRect(8, 8, w - 16, h - 16);
  const face = (x, happy) => { g.fillStyle = '#f3eee2'; g.beginPath(); g.ellipse(x, h / 2, 62, 80, 0, 0, Math.PI * 2); g.fill(); g.fillStyle = '#1f1d24';
    for (const s of [-1, 1]) { g.beginPath(); g.ellipse(x + s * 24, h / 2 - 18, 12, happy ? 8 : 12, 0, 0, Math.PI * 2); g.fill(); }
    g.lineWidth = 8; g.strokeStyle = '#1f1d24'; g.beginPath(); g.arc(x, h / 2 + (happy ? 12 : 52), 30, happy ? .15 * Math.PI : 1.15 * Math.PI, happy ? .85 * Math.PI : 1.85 * Math.PI); g.stroke(); };
  face(w * .36, true); face(w * .64, false);
  g.fillStyle = '#f0d98a'; g.font = '600 30px Georgia, serif'; g.textAlign = 'center'; g.fillText('TALAELOS', w / 2, h - 26);
}, 0x8c1f2e);

/** `open`: the side is down and the wagon is a stage; closed, it is a painted box on wheels for the road. */
export function createPageantWagon({ open = true } = {}) {
  const wagon = new THREE.Group(); wagon.name = 'Talaelos pageant wagon';
  const L = 4.4, W = 2.3, deck = 1.15;
  add(wagon, cube, WOOD, [0, deck - .09, 0], [L, .18, W]);
  add(wagon, cube, WOOD_DARK, [0, deck - .2, 0], [L - .3, .08, W - .3]);
  for (const x of [-1.45, 1.45]) for (const z of [-1.22, 1.22]) {
    add(wagon, new THREE.TorusGeometry(.5, .05, 6, 18), WOOD_DARK, [x, .55, z]);
    add(wagon, tube, WOOD_DARK, [x, .55, z], [.09, .12, .09], [Math.PI / 2, 0, 0]);
    for (let s = 0; s < 6; s++) add(wagon, cube, WOOD, [x, .55, z], [.035, .96, .03], [0, 0, s * Math.PI / 6]);
  }
  add(wagon, cube, WOOD, [0, .55, 0], [.08, .08, W + .2]);
  for (const s of [-1, 1]) add(wagon, cube, WOOD, [L / 2 + 1.1, .95, s * .55], [2.3, .07, .07], [0, 0, -.05]);   // the shafts, forward to the mare
  // The booth: posts, the painted backcloth, a striped canopy with pennants, the name board.
  const striped = [mat(0x8c1f2e), mat(0xf3e6c4)];
  for (const x of [-L / 2 + .1, L / 2 - .1]) for (const z of [-W / 2 + .1, W / 2 - .1]) add(wagon, cube, WOOD_DARK, [x, deck + 1.1, z], [.1, 2.2, .1]);
  add(wagon, cube, backcloth(), [0, deck + 1.1, -W / 2 + .12], [L - .3, 2.1, .04]);
  for (let k = 0; k < 8; k++) add(wagon, cube, striped[k % 2], [-L / 2 + (k + .5) * L / 8, deck + 2.27, 0], [L / 8, .08, W + .3], [0, 0, 0]);
  for (let k = 0; k < 8; k++) add(wagon, new THREE.ConeGeometry(.09, .22, 4), striped[k % 2], [-L / 2 + (k + .5) * L / 8, deck + 2.12, W / 2 + .17], [1, 1, .3], [Math.PI, 0, 0]);
  for (const x of [-L / 2 + .1, L / 2 - .1]) { add(wagon, tube, WOOD_DARK, [x, deck + 2.7, -W / 2 + .1], [.025, .8, .025]); add(wagon, cube, mat(0xd9a52b, { side: THREE.DoubleSide }), [x + .2, deck + 2.95, -W / 2 + .1], [.4, .22, .01]); }
  add(wagon, cube, nameboard(), [0, deck + 2.5, W / 2 + .05], [2.4, .45, .06]);
  if (open) {
    // Red curtains tied back at the front corners, footlights, and what is on stage.
    for (const s of [-1, 1]) {
      add(wagon, new THREE.CylinderGeometry(.12, .3, 2.1, 8), mat(0x8c1f2e), [s * (L / 2 - .3), deck + 1.1, W / 2 - .12], [1, 1, .5]);
      add(wagon, new THREE.TorusGeometry(.12, .025, 4, 10), GOLD, [s * (L / 2 - .3), deck + 1.05, W / 2 - .12], [1, 1, 1], [Math.PI / 2, 0, 0]);
    }
    const flame = mat(0xffd27a, { emissive: 0xffa640, emissiveIntensity: 1 });
    for (let k = 0; k < 6; k++) { const x = -L / 2 + .5 + k * (L - 1) / 5; add(wagon, tube, WHITE, [x, deck + .06, W / 2 - .06], [.025, .12, .025]); add(wagon, ball, flame, [x, deck + .15, W / 2 - .06], [.02, .035, .02]); }
    const throne = mat(0x6b2e22);
    add(wagon, cube, throne, [1.2, deck + .25, -.5], [.55, .5, .5]); add(wagon, cube, throne, [1.2, deck + .75, -.72], [.55, 1.0, .08]);
    add(wagon, cube, WOOD, [-1.4, deck + .22, -.6], [.8, .44, .45]); add(wagon, cube, mat(0x3d6b45), [-1.4, deck + .46, -.6], [.84, .06, .5]);
    add(wagon, new THREE.CylinderGeometry(.12, .12, .1, 8, 1, true), GOLD, [-1.4, deck + .55, -.6]);
    for (const s of [-1, 1]) add(wagon, cube, mat(0xb9b3a6), [-1.1 + s * .08, deck + .5, -.35], [.04, .7, .02], [0, 0, s * .6]);
    // Steps up at the back corner.
    for (let k = 0; k < 3; k++) add(wagon, cube, WOOD, [-L / 2 - .3, (k + .5) * deck / 3, .4], [.6 - k * .12, .08, .7]);
  } else {
    // For the road: the side is up and painted with the two masks.
    add(wagon, cube, masks(), [0, deck + 1.1, W / 2 - .05], [L - .2, 2.1, .06]);
    for (const x of [-L / 2 + .1, L / 2 - .1]) add(wagon, cube, WOOD, [x, deck + 1.1, 0], [.06, 2.1, W - .2]);
  }
  return wagon;
}

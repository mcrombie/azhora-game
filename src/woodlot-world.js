import * as THREE from 'three';
import { treeShapes, mergedGeometry } from './drent-trees.js';
import { KOOPWOOD, WOODLOT_TREES, WOODLOT_LAYOUT, WOODLOT_SIGN, TREE_KINDS, lotPoint, woodlotColliders } from './woodcutting.js';

/**
 * The Koopwood (src/woodcutting.js): Bowden Koop's woodlot on the edge of the
 * wood north-west of Tidehaven. Pines at the front, oaks behind them, two
 * black willows by a little spring, two red maples, and his old black walnut;
 * a keep built of logs with battlements and a round tower flying his flag (a
 * green spiked shell on white); a charcoal kiln smouldering under its turf;
 * the chopping block with an axe in it, a log pile, an axe rack and his sign.
 *
 * The trees are live: `fell(id, from)` drops one away from whoever cut it and
 * leaves the stump, `regrow(id)` brings it back up out of the stump, and
 * `chip(id)` knocks chips off it at a swing. Everything is passable to the prop
 * pass; the lot brings its own colliders.
 */
const PHI = 2.39996;
/** Which of Drent's tree shapes each kind is drawn with, and how big: the lot's trees are younger than the specimens in the wood. */
const LOOKS = { pine: ['loblolly-pine', .62], oak: ['white-oak', .52], maple: ['red-maple', .78], walnut: ['black-walnut', .78] };

function painted(width, height, draw, fallback) {
  if (typeof document === 'undefined') return new THREE.MeshStandardMaterial({ color: fallback, roughness: .9, side: THREE.DoubleSide });
  const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height;
  draw(canvas.getContext('2d'), width, height);
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
  return new THREE.MeshStandardMaterial({ map: texture, roughness: .9, side: THREE.DoubleSide });
}
/** Bowden's flag: a green spiked shell on white, with a red border. */
const shellFlag = () => painted(128, 96, (g, w, h) => {
  g.fillStyle = '#f4efe2'; g.fillRect(0, 0, w, h); g.strokeStyle = '#b8302a'; g.lineWidth = 8; g.strokeRect(4, 4, w - 8, h - 8);
  g.fillStyle = '#3f8f3a'; g.beginPath(); g.ellipse(w / 2, h * .56, w * .27, h * .3, 0, Math.PI, 0); g.lineTo(w * .77, h * .62); g.lineTo(w * .23, h * .62); g.fill();
  g.fillStyle = '#f4efe2'; g.fillRect(w * .22, h * .6, w * .56, h * .07);
  for (const [x, y] of [[.36, .4], [.5, .33], [.64, .4], [.43, .52], [.57, .52]]) { g.beginPath(); g.moveTo(w * x - 6, h * y + 6); g.lineTo(w * x, h * y - 9); g.lineTo(w * x + 6, h * y + 6); g.fill(); }
}, 0x3f8f3a);

/** A black willow: a leaning trunk, a loose crown, and long strands of leaves hanging from it. */
function willowShape() {
  const trunk = new THREE.CylinderGeometry(.7, 1, 1, 8), crown = new THREE.IcosahedronGeometry(1, 1), strand = new THREE.ConeGeometry(1, 1, 5);
  const pieces = [[trunk, 0x5b4a3a, [.3, 2.2, 0], [.42, 4.6, .42], [0, 0, -.14]], [trunk, 0x57473a, [.9, 4.6, .2], [.24, 2.4, .24], [.2, 0, -.5]],
    [trunk, 0x57473a, [-.2, 4.6, -.3], [.22, 2.2, .22], [-.3, 0, .35]]];
  for (let i = 0; i < 7; i++) { const a = i * PHI, r = i ? 1.5 + (i % 3) * .5 : 0; pieces.push([crown, i % 2 ? 0x8aa84e : 0x7d9c46, [Math.sin(a) * r + .5, 5.6 + (i % 3) * .4, Math.cos(a) * r], [1.7, 1.1, 1.7]]); }
  for (let i = 0; i < 26; i++) {
    const a = i * PHI, r = 1.4 + (i % 4) * .55, len = 2.2 + (i % 5) * .45;
    pieces.push([strand, i % 3 ? 0x98b25a : 0x86a34c, [Math.sin(a) * r + .5, 5.4 - len / 2, Math.cos(a) * r], [.28, len, .28], [Math.PI + Math.cos(a) * .12, 0, -Math.sin(a) * .12]]);
  }
  const geometry = mergedGeometry(pieces); trunk.dispose(); crown.dispose(); strand.dispose(); return geometry;
}

export function createWoodlot({ parent, material, mesh, box, post, round, cylinder, heightAt, colliders, signs, movingGroups }) {
  const root = new THREE.Group(); root.name = 'The Koopwood'; parent.add(root);
  const yaw = KOOPWOOD.yaw, at = lotPoint, ground = (lx, lz) => { const p = at(lx, lz); return heightAt(p.x, p.z); };
  const wood = material('#6e5238'), woodDark = material('#4d3a28'), bark = material('#5a4430'), endGrain = material('#caa472');
  const turf = material('#4a4630'), soot = material('#2a2622'), stone = material('#8c8a80'), water = material('#4f8a93', { roughness: .15, metalness: .1 });
  const spikes = material('#ece6d2'), shellGreen = material('#3f8f3a'), steel = material('#a9adb0', { metalness: .6, roughness: .35 });

  // -------------------------------------------------------------------------
  // The trees, live
  // -------------------------------------------------------------------------
  const shapes = treeShapes(), willow = willowShape();
  const leafy = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .92, flatShading: true });
  const trees = new Map();
  for (const t of WOODLOT_TREES) {
    const k = TREE_KINDS[t.kind], y = heightAt(t.x, t.z);
    const group = new THREE.Group(); group.name = `Koopwood ${t.kind} ${t.id}`; group.position.set(t.x, y, t.z); root.add(group); movingGroups.add(group);
    const pivot = new THREE.Group(); pivot.rotation.order = 'YXZ'; group.add(pivot);   // turned to face away, then tipped that way
    const [shape, scale] = LOOKS[t.kind] ?? [null, 1];
    const tree = new THREE.Mesh(shape ? shapes[shape] : willow, leafy); tree.castShadow = true; tree.receiveShadow = true;
    tree.scale.setScalar(t.kind === 'willow' ? .95 : scale); tree.rotation.y = (t.x * 7.3 + t.z * 3.1) % (Math.PI * 2); pivot.add(tree);
    // The stump: bark round a pale cut face with a ring or two.
    const stump = new THREE.Group(); stump.visible = false; group.add(stump);
    const r = k.trunk * 1.05;
    const piece = (geometry, mat, y, sx, sy, sz, rx = 0) => { const m = new THREE.Mesh(geometry, mat); m.position.set(0, y, 0); m.scale.set(sx, sy, sz); m.rotation.x = rx; m.castShadow = true; stump.add(m); };
    piece(cylinder, bark, .25, r, .5, r); piece(cylinder, endGrain, .505, r * .9, .02, r * .9); piece(new THREE.TorusGeometry(r * .5, .012, 3, 14), woodDark, .52, 1, 1, 1, Math.PI / 2);
    trees.set(t.id, { t, group, pivot, tree, stump, falling: -1, fallTurn: 0, growing: -1 });
  }
  // Chips: a handful of small pale flakes knocked off at every swing.
  const chipMat = material('#d7b98a'), chipShape = new THREE.BoxGeometry(.07, .025, .05), chips = [];
  const chipGroup = new THREE.Group(); root.add(chipGroup); movingGroups.add(chipGroup);
  for (let i = 0; i < 24; i++) { const m = new THREE.Mesh(chipShape, chipMat); m.visible = false; chipGroup.add(m); chips.push({ m, v: new THREE.Vector3(), age: 1 }); }
  let nextChip = 0;

  // -------------------------------------------------------------------------
  // The keep: a log house with battlements, and a round tower flying his flag
  // -------------------------------------------------------------------------
  {
    const K = WOODLOT_LAYOUT.keep, base = ground(K.lx, K.lz), courses = Math.round(K.h / .38);
    const log = (lx, lz, y, length, along) => {
      const p = at(lx, lz), m = mesh(cylinder, (Math.round(y * 10) % 2) ? wood : bark, p.x, base + y, p.z, .19, length, .19, root);
      m.rotation.set(0, yaw + (along === 'x' ? 0 : Math.PI / 2), Math.PI / 2);
      for (const end of [-1, 1]) { const q = along === 'x' ? at(lx + end * length / 2, lz) : at(lx, lz + end * length / 2); const cap = mesh(cylinder, endGrain, q.x, base + y, q.z, .17, .02, .17, root); cap.rotation.set(0, yaw + (along === 'x' ? 0 : Math.PI / 2), Math.PI / 2); }
    };
    for (let c = 0; c < courses; c++) {
      const y = .19 + c * .38, over = c % 2 ? .35 : .15;
      // Front wall (toward the lot), with a door in the middle of the lower courses.
      if (c < 6) for (const side of [-1, 1]) { const len = K.w / 2 - .7 + over; log(K.lx + side * (.7 + len / 2), K.lz + K.d / 2, y, len, 'x'); }
      else log(K.lx, K.lz + K.d / 2, y, K.w + over * 2, 'x');
      log(K.lx, K.lz - K.d / 2, y, K.w + over * 2, 'x');
      for (const side of [-1, 1]) log(K.lx + side * K.w / 2, K.lz, y + .19, K.d + (1 - over) * .4, 'z');
    }
    const top = base + courses * .38 + .2;
    { const p = at(K.lx, K.lz); const roof = box(woodDark, p.x, top - .05, p.z, K.w + .2, .12, K.d + .2, root); roof.rotation.y = yaw; }
    // Battlements all the way round.
    for (let i = 0; i <= 6; i++) for (const side of [-1, 1]) {
      const a = at(K.lx - K.w / 2 + i * K.w / 6, K.lz + side * K.d / 2), merlon = box(wood, a.x, top + .3, a.z, .55, .6, .42, root); merlon.rotation.y = yaw;
    }
    for (let i = 1; i < 4; i++) for (const side of [-1, 1]) {
      const a = at(K.lx + side * K.w / 2, K.lz - K.d / 2 + i * K.d / 4), merlon = box(wood, a.x, top + .3, a.z, .42, .6, .55, root); merlon.rotation.y = yaw;
    }
    // The door, iron-banded, and a pair of horns over it.
    { const p = at(K.lx, K.lz + K.d / 2 + .02), door = box(woodDark, p.x, base + 1.05, p.z, 1.3, 2.1, .12, root); door.rotation.y = yaw;
      for (const h of [.5, 1.6]) { const band = box(soot, p.x, base + h, p.z + .01, 1.32, .08, .14, root); band.rotation.y = yaw; }
      for (const side of [-1, 1]) { const q = at(K.lx + side * .45, K.lz + K.d / 2 + .12); const horn = mesh(new THREE.ConeGeometry(.1, .6, 7), spikes, q.x, base + 2.55, q.z, 1, 1, 1, root); horn.rotation.set(0, yaw, side * -.75); } }
    // The round tower at the back corner, crenellated, with the flag.
    { const p = at(K.lx - K.w / 2 + .3, K.lz - K.d / 2 + .3), towerH = top - base + 1.4;
      mesh(new THREE.CylinderGeometry(1.15, 1.25, towerH, 10), bark, p.x, base + towerH / 2, p.z, 1, 1, 1, root);
      for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2; box(wood, p.x + Math.sin(a) * 1.05, base + towerH + .28, p.z + Math.cos(a) * 1.05, .5, .56, .4, root).rotation.y = a; }
      post(woodDark, p.x, base + towerH + 1.6, p.z, .05, 3.2, root);
      const flag = box(shellFlag(), p.x + Math.cos(yaw) * .58, base + towerH + 2.75, p.z - Math.sin(yaw) * .58, 1.1, .8, .02, root); flag.rotation.y = yaw; }
    // His axe rack by the door.
    { const r = at(K.lx + 2.4, K.lz + K.d / 2 + .5), y = base;
      const rail = box(woodDark, r.x, y + 1.05, r.z, 1.4, .1, .1, root); rail.rotation.y = yaw;
      for (const side of [-1, 1]) { const q = at(K.lx + 2.4 + side * .65, K.lz + K.d / 2 + .5); post(woodDark, q.x, y + .55, q.z, .05, 1.1, root); }
      for (const [i, head] of [[-.35, steel], [0, material('#b08a4a', { metalness: .5, roughness: .4 })], [.35, soot]].map(([o, m]) => [o, m])) {
        const q = at(K.lx + 2.4 + i, K.lz + K.d / 2 + .62), haft = post(wood, q.x, y + .6, q.z, .025, 1.1, root); haft.rotation.set(0, yaw, .08);
        box(head, q.x, y + 1.08, q.z + .04, .26, .16, .04, root).rotation.y = yaw;
      } }
  }

  // -------------------------------------------------------------------------
  // The kiln: a charcoal clamp smouldering under its turf
  // -------------------------------------------------------------------------
  const kilnGlow = [], smoke = [];
  {
    const Q = WOODLOT_LAYOUT.kiln, p = at(Q.lx, Q.lz), y = ground(Q.lx, Q.lz);
    mesh(new THREE.SphereGeometry(1, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), turf, p.x, y - .05, p.z, Q.r, 1.35, Q.r, root);
    for (let k = 0; k < 9; k++) { const a = k * PHI, rr = Q.r * (.45 + (k % 3) * .17); mesh(round, soot, p.x + Math.sin(a) * rr, y + .75 - (k % 3) * .22, p.z + Math.cos(a) * rr, .32, .12, .28, root); }
    const glowing = new THREE.Group(); root.add(glowing); movingGroups.add(glowing);
    for (let k = 0; k < 5; k++) {
      const a = k / 5 * Math.PI * 2 + .3, rr = Q.r * .78, vy = y + .45;
      const ember = new THREE.MeshStandardMaterial({ color: 0x3a1a0c, emissive: 0xff5a14, emissiveIntensity: 1.2, roughness: .8 });
      const vent = new THREE.Mesh(round, ember); vent.position.set(p.x + Math.sin(a) * rr, vy, p.z + Math.cos(a) * rr); vent.scale.set(.16, .1, .16); glowing.add(vent);
      kilnGlow.push({ material: ember, phase: k * 1.7 });
    }
    const topVent = new THREE.MeshStandardMaterial({ color: 0x3a1a0c, emissive: 0xff7a20, emissiveIntensity: 1.6 });
    const crown = new THREE.Mesh(round, topVent); crown.position.set(p.x, y + 1.3, p.z); crown.scale.set(.24, .08, .24); glowing.add(crown); kilnGlow.push({ material: topVent, phase: 0 });
    for (let k = 0; k < 8; k++) {
      const m = new THREE.Mesh(round, new THREE.MeshBasicMaterial({ color: 0x9a948a, transparent: true, opacity: 0, depthWrite: false }));
      glowing.add(m); smoke.push({ m, age: k / 8, x: p.x, y: y + 1.35, z: p.z, side: (k % 3 - 1) });
    }
  }

  // -------------------------------------------------------------------------
  // The chopping block, the log pile, the spring, and the sign
  // -------------------------------------------------------------------------
  { const B = WOODLOT_LAYOUT.block, p = at(B.lx, B.lz), y = ground(B.lx, B.lz);
    post(bark, p.x, y + .35, p.z, .42, .7, root); post(endGrain, p.x, y + .71, p.z, .38, .02, root);
    const haft = post(wood, p.x + .05, y + 1.05, p.z + .12, .03, .75, root); haft.rotation.set(.5, yaw, .2);
    box(steel, p.x, y + .76, p.z - .02, .05, .16, .3, root).rotation.y = yaw + .2;
    for (let k = 0; k < 4; k++) { const q = at(B.lx + .6 + (k % 2) * .3, B.lz - .4 + k * .2); const half = mesh(cylinder, endGrain, q.x, y + .12, q.z, .16, .5, .16, root); half.rotation.set(Math.PI / 2, yaw + k, 0); } }
  { const L = WOODLOT_LAYOUT.logpile, y = ground(L.lx, L.lz);
    [[4, 0], [3, 1], [2, 2]].forEach(([count, row]) => { for (let k = 0; k < count; k++) {
      const q = at(L.lx, L.lz - .75 + (k + row * .5) * .5), m = mesh(cylinder, row % 2 ? wood : bark, q.x, y + .22 + row * .4, q.z, .22, L.len, .22, root);
      m.rotation.set(0, yaw, Math.PI / 2);
      for (const end of [-1, 1]) { const e = at(L.lx + end * L.len / 2, L.lz - .75 + (k + row * .5) * .5), cap = mesh(cylinder, endGrain, e.x, y + .22 + row * .4, e.z, .2, .02, .2, root); cap.rotation.set(0, yaw, Math.PI / 2); }
    } }); }
  { const S = WOODLOT_LAYOUT.spring, p = at(S.lx, S.lz), y = ground(S.lx, S.lz);
    post(water, p.x, y + .03, p.z, S.r * .92, .04, root);
    for (let k = 0; k < 11; k++) { const a = k / 11 * Math.PI * 2; mesh(round, stone, p.x + Math.sin(a) * S.r, y + .1, p.z + Math.cos(a) * S.r, .26, .18, .22, root); }
    for (let k = 0; k < 7; k++) { const a = k * PHI; post(material('#6f8a3a'), p.x + Math.sin(a) * S.r * .8, y + .45, p.z + Math.cos(a) * S.r * .8, .02, .9, root); } }
  // The workbench, for Construction: a heavy bench with a vice, a plank on it, and tools hung along its back.
  { const W = WOODLOT_LAYOUT.workbench, p = at(W.lx, W.lz), y = ground(W.lx, W.lz);
    const top = box(wood, p.x, y + .86, p.z, W.w, .1, W.d, root); top.rotation.y = yaw;
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) { const q = at(W.lx + sx * (W.w / 2 - .1), W.lz + sz * (W.d / 2 - .08)); post(woodDark, q.x, y + .42, q.z, .05, .84, root); }
    { const q = at(W.lx, W.lz); const shelf = box(woodDark, q.x, y + .25, q.z, W.w - .2, .05, W.d - .15, root); shelf.rotation.y = yaw; }
    { const q = at(W.lx - W.w / 2 + .12, W.lz + W.d / 2 - .05); box(soot, q.x, y + .96, q.z, .16, .14, .12, root).rotation.y = yaw; }
    { const q = at(W.lx + .15, W.lz); const plank = box(endGrain, q.x, y + .94, q.z, 1.1, .05, .22, root); plank.rotation.y = yaw + .08; }
    { const q = at(W.lx + .55, W.lz + .1); const h = box(steel, q.x, y + .95, q.z, .22, .05, .06, root); h.rotation.y = yaw + .6; const g = post(wood, q.x - .05, y + .93, q.z + .08, .02, .3, root); g.rotation.set(Math.PI / 2, 0, yaw + .6); }
    { const q = at(W.lx, W.lz - W.d / 2 + .04); const back = box(woodDark, q.x, y + 1.25, q.z, W.w, .5, .04, root); back.rotation.y = yaw; } }
  // The saw pit: a log up on two trestles, half sawn through, and the long two-handled pit saw standing in the cut.
  { const S = WOODLOT_LAYOUT.sawpit, y = ground(S.lx, S.lz);
    for (const side of [-1, 1]) { const q = at(S.lx + side * S.len * .38, S.lz);
      for (const lean of [-1, 1]) { const leg = post(woodDark, q.x, y + .38, q.z + lean * .18, .04, .82, root); leg.rotation.set(lean * .4, yaw, 0); }
      const bar = box(woodDark, q.x, y + .74, q.z, .1, .1, .5, root); bar.rotation.y = yaw; }
    const p = at(S.lx, S.lz), log = mesh(cylinder, bark, p.x, y + .98, p.z, .24, S.len, .24, root); log.rotation.set(0, yaw, Math.PI / 2);
    for (const end of [-1, 1]) { const e = at(S.lx + end * S.len / 2, S.lz), cap = mesh(cylinder, endGrain, e.x, y + .98, e.z, .22, .02, .22, root); cap.rotation.set(0, yaw, Math.PI / 2); }
    const blade = box(steel, p.x, y + 1.05, p.z, .02, 1.5, .28, root); blade.rotation.set(0, yaw, .12);
    for (const end of [-1, 1]) { const q = at(S.lx + Math.sin(.12) * end * -.75, S.lz); post(wood, q.x, y + 1.05 + end * .78, q.z, .03, .36, root).rotation.set(Math.PI / 2, yaw, 0); } }
  // Chips and sawdust on the ground by the block, and a trodden patch the length of the lot.
  { const p = at(-2, 5), y = ground(-2, 5); mesh(cylinder, material('#b49a70'), p.x, y + .012, p.z, 3.4, .01, 2.2, root); }

  root.traverse(object => { if (object.isMesh) object.userData.passable = true; });
  for (const c of woodlotColliders()) colliders.push(c);
  { const s = at(WOODLOT_LAYOUT.sign.lx, WOODLOT_LAYOUT.sign.lz); signs.place({ x: s.x, z: s.z, label: WOODLOT_SIGN, facing: yaw, parent }); }

  // -------------------------------------------------------------------------
  // Live
  // -------------------------------------------------------------------------
  /** The tree falls away from `from` (where the woodcutter stands), and leaves its stump. */
  function fell(id, from = null) {
    const entry = trees.get(id); if (!entry) return;
    const g = entry.group.position, away = from ? Math.atan2(g.x - from.x, g.z - from.z) : 0;
    entry.pivot.rotation.set(0, away, 0); entry.fallTurn = 0; entry.falling = 0; entry.growing = -1; entry.stump.visible = true;
  }
  /** Up it comes again out of the stump. */
  function regrow(id) {
    const entry = trees.get(id); if (!entry) return;
    entry.falling = -1; entry.growing = 0; entry.pivot.visible = true; entry.pivot.rotation.set(0, 0, 0); entry.tree.rotation.x = 0; entry.pivot.scale.setScalar(.15);
  }
  /** Put a tree straight up or down at once, for a restore or a review. */
  function set(id, standing) {
    const entry = trees.get(id); if (!entry) return;
    entry.falling = -1; entry.growing = -1; entry.pivot.visible = standing; entry.pivot.scale.setScalar(1); entry.pivot.rotation.set(0, 0, 0); entry.stump.visible = !standing;
  }
  function chip(id) {
    const entry = trees.get(id); if (!entry) return;
    const p = entry.group.position, r = TREE_KINDS[entry.t.kind].trunk;
    for (let k = 0; k < 5; k++) {
      const c = chips[nextChip++ % chips.length], a = Math.random() * Math.PI * 2;
      c.m.position.set(p.x + Math.sin(a) * r, p.y + .9 + Math.random() * .3, p.z + Math.cos(a) * r); c.m.visible = true;
      c.v.set(Math.sin(a) * (1 + Math.random()), 1.5 + Math.random() * 1.5, Math.cos(a) * (1 + Math.random())); c.age = 0;
    }
  }
  function update(dt, time) {
    dt = Number.isFinite(dt) ? Math.min(Math.max(dt, 0), .1) : 0;
    for (const entry of trees.values()) {
      if (entry.falling >= 0) {
        entry.falling += dt;
        // It leans, then goes: gravity takes it the rest of the way, and it lies a moment before it is gone.
        const t = entry.falling, lean = Math.min(Math.PI / 2 * .96, .04 * t + 1.6 * t * t);
        entry.tree.rotation.x = 0; entry.pivot.rotation.x = lean;
        if (t > 2.4) { entry.falling = -1; entry.pivot.visible = false; }
      }
      if (entry.growing >= 0) {
        entry.growing += dt;
        const u = Math.min(1, entry.growing / 2.4), s = .15 + .85 * (1 - (1 - u) ** 3);
        entry.pivot.scale.setScalar(s); if (s > .6) entry.stump.visible = false;
        if (u >= 1) entry.growing = -1;
      }
    }
    for (const c of chips) if (c.age < 1) {
      c.age += dt / .7; c.v.y -= 9 * dt; c.m.position.addScaledVector(c.v, dt); c.m.rotation.x += dt * 9; c.m.rotation.z += dt * 7;
      if (c.age >= 1) c.m.visible = false;
    }
    for (const g of kilnGlow) g.material.emissiveIntensity = 1 + .6 * Math.sin(time * 2.3 + g.phase) + .3 * Math.sin(time * 5.1 + g.phase * 2);
    for (const s of smoke) {
      s.age = (s.age + dt / 6) % 1;
      const t = s.age;
      s.m.position.set(s.x + Math.sin(time * .4 + s.side * 2) * t * .8 + s.side * t * .6, s.y + t * 5, s.z + t * .9);
      s.m.scale.setScalar(.2 + t * 1.2); s.m.material.opacity = .45 * Math.sin(Math.PI * Math.min(1, t * 1.6)) * (1 - t * .6);
    }
  }
  return { root, fell, regrow, set, chip, update, standing: id => !!trees.get(id)?.pivot.visible && trees.get(id)?.falling < 0 };
}

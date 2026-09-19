import * as THREE from 'three';
import { BRANDY_YARD, BRANDY_SIGN, YARD_LAYOUT, yardPoint, yardColliders } from './brandy.js';
import { RAINBOW, BOARD_PAINTINGS, BOARD_CANVAS, HOUSE_EAVES } from './brandy-boards.js';

/**
 * Brandy Frank's dye yard (src/brandy.js), on the lane up to Saltwind Lookout:
 * three dye vats of colours Drent has no business having, two drying lines of
 * impossible cloth, a bench of folded bolts, her sign, and nine painted boards
 * (src/brandy-boards.js): the animals the way they ought to be (a rainbow
 * leopard, a pink dolphin leaping a rainbow, a little bear in a heart, a
 * unicorn, two kittens in a teacup, a panda with a lollipop), and, cut in the
 * shape of houses, the houses the way they ought to be.
 * Everything is passable to the prop pass; the yard's own colliders stand in.
 */
function painted(width, height, draw, fallback, side = THREE.FrontSide) {
  if (typeof document === 'undefined') return new THREE.MeshStandardMaterial({ color: fallback, roughness: .9, side });
  const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height;
  draw(canvas.getContext('2d'), width, height);
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
  return new THREE.MeshStandardMaterial({ map: texture, roughness: .9, side });
}
/** A flat board cut like a house, `w` wide and `h` tall, its roof coming down to the eaves; its UVs cover the painting. */
function houseBoard(w, h) {
  const eaves = h * (1 - HOUSE_EAVES), shape = new THREE.Shape([[-w / 2, 0], [w / 2, 0], [w / 2, eaves], [0, h], [-w / 2, eaves]].map(([x, y]) => new THREE.Vector2(x, y)));
  const geometry = new THREE.ShapeGeometry(shape), position = geometry.attributes.position, uv = geometry.attributes.uv;
  for (let i = 0; i < position.count; i++) uv.setXY(i, position.getX(i) / w + .5, position.getY(i) / h);
  return geometry;
}
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
  const houseShape = houseBoard(1.2, 1.44), houseEdge = houseBoard(1.3, 1.56), yellow = material('#ffe135', { side: THREE.DoubleSide });
  for (const board of YARD_LAYOUT.boards) {
    const p = at(board.lx, board.lz), y = ground(board.lx, board.lz), turn = yaw + board.turn, art = BOARD_PAINTINGS[board.id], [cw, ch] = BOARD_CANVAS[art.shape];
    if (art.shape === 'house') {
      // Cut like a house: painted on both faces, a yellow edge between them, standing on its posts.
      const paint = painted(cw, ch, art.draw, 0xff3fa4);
      for (const face of [1, -1]) {
        const m = new THREE.Mesh(houseShape, paint); m.position.set(p.x + Math.sin(turn) * face * .012, y + .72, p.z + Math.cos(turn) * face * .012);
        m.rotation.y = turn + (face < 0 ? Math.PI : 0); m.castShadow = true; group.add(m);
      }
      const edge = new THREE.Mesh(houseEdge, yellow); edge.position.set(p.x, y + .66, p.z); edge.rotation.y = turn; group.add(edge);
      for (const side of [-1, 1]) post(woodDark, p.x + Math.cos(turn) * side * board.posts, y + .37, p.z - Math.sin(turn) * side * board.posts, .05, .74, group);   // up to its sill, not through it
      continue;
    }
    const painting = box(painted(cw, ch, art.draw, 0xff3fa4), p.x, y + 1.35, p.z, 1.36, 1.02, .06, group); painting.rotation.y = turn;
    const frame = box(material('#ffe135'), p.x, y + 1.35, p.z, 1.46, 1.12, .04, group); frame.rotation.y = turn;
    frame.position.x -= Math.sin(turn) * .02; frame.position.z -= Math.cos(turn) * .02;
    for (const side of [-1, 1]) post(woodDark, p.x + Math.cos(turn) * side * board.posts, y + .9, p.z - Math.sin(turn) * side * board.posts, .05, 1.8, group);
  }
  // Rainbow on the ground where the dye has been tipped for years.
  RAINBOW.forEach((tint, i) => { const p = at(-2.1 + i * .08, 1.25); mesh(cylinder, material(tint), p.x, ground(-2.1, 1.25) + .012 + i * .001, p.z, .9 - i * .12, .01, .5 - i * .06, group); });
  group.traverse(object => { if (object.isMesh) object.userData.passable = true; });
  for (const c of yardColliders()) colliders.push(c);
  // Her sign, at the lane.
  { const s = at(YARD_LAYOUT.sign.lx, YARD_LAYOUT.sign.lz); signs.place({ x: s.x, z: s.z, label: BRANDY_SIGN, facing: yaw, parent }); }
  return { group };
}

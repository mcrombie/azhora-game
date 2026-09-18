import * as THREE from 'three';
import { WINE_ATTIC, atticPoint, atticFloor, atticColliders } from './wine-attic.js';

/**
 * Tharganhom as a building (src/wine-attic.js has the plan): a whitewashed
 * stone ground floor on Solis's main street, a stone stair climbing beside it
 * to the open west gable, and the attic under a steep tiled roof. Inside, the
 * racks step down under the slopes of the roof, bottles lie in rows with their
 * ends to the room, and there is a tasting counter, two barrel tables, lanterns
 * on the collar beams and a string of little lights across the gable. A vine
 * climbs the south wall; the name board hangs in the gable and a plate stands
 * at the foot of the stair.
 *
 * Everything here is passable to the world's prop pass: the attic's walls,
 * racks and furniture have colliders of their own, from the plan.
 */
export function createWineAtticScenery(kit) {
  const { parent, material, mesh, box, post, round, barrel, groundHeight, push, signs } = kit;
  const A = WINE_ATTIC, S = A.stair, P = atticPoint;
  const group = new THREE.Group(); group.name = `${A.name}, the Wine Attic`; parent.add(group);
  let seed = 7145;
  const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };

  const w = A.a1 - A.a0, d = A.b1 - A.b0, ac = (A.a0 + A.a1) / 2, bc = (A.b0 + A.b1) / 2, stairMid = (S.b0 + S.b1) / 2;
  const floor = atticFloor(groundHeight);
  const corners = [[A.a0, A.b0], [A.a1, A.b0], [A.a0, A.b1], [A.a1, A.b1], [S.a0, stairMid]].map(([a, b]) => { const p = P(a, b); return groundHeight(p.x, p.z); });
  const base = corners[4], low = Math.min(...corners) - .3;

  const wall = material('#e8d7b2'), stone = material('#cfc0a0'), stoneDark = material('#b6a785');
  const timber = material('#6b4a32'), timberDark = material('#4a3322'), timberLight = material('#9a7550'), plank = material('#8a6644');
  const tile = material('#a9503a'), tileDark = material('#8c422f'), tileRidge = material('#c26a4a');
  const shutter = material('#5c7f55'), windowDark = material('#2d2a26'), rug = material('#8a3b35'), rugEdge = material('#c9a24a');
  const glass = ['#2f4a2e', '#3b2a1e', '#20331f', '#5a4a2a', '#1f2a24'].map(tint => material(tint, { roughness: .35, metalness: .1 }));
  const wax = material('#7a1f2b'), foil = material('#c9a24a', { metalness: .5, roughness: .4 }), paleGlass = material('#d8d2b0', { roughness: .3 });
  const cheese = material('#e0bf5a'), candle = material('#f2e6c8'), glow = material('#ffd58a', { emissive: '#ffb347', emissiveIntensity: .9 });
  const leaf = material('#5c7a3e'), leafDark = material('#46613a'), vineWood = material('#5a4230');

  const put = (mat, a, b, y, sa, sy, sb, rx = 0, rz = 0) => {
    const p = P(a, b), m = box(mat, p.x, y, p.z, sa, sy, sb, group);
    if (rx) m.rotation.x = rx; if (rz) m.rotation.z = rz;
    return m;
  };
  const bottleLying = new THREE.CylinderGeometry(.038, .038, .3, 6); bottleLying.rotateZ(Math.PI / 2);
  const bottleStanding = new THREE.CylinderGeometry(.04, .04, .24, 6), neck = new THREE.CylinderGeometry(.015, .018, .1, 5);
  const stand = (a, b, y, mat = glass[Math.floor(random() * glass.length)]) => {
    const p = P(a, b);
    mesh(bottleStanding, mat, p.x, y + .12, p.z, 1, 1, 1, group);
    mesh(neck, mat, p.x, y + .29, p.z, 1, 1, 1, group);
    mesh(neck, random() < .5 ? wax : foil, p.x, y + .345, p.z, 1.15, .25, 1.15, group);
  };
  const wineGlass = (a, b, y) => {
    const p = P(a, b);
    post(paleGlass, p.x, y + .005, p.z, .03, .01, group);
    post(paleGlass, p.x, y + .05, p.z, .006, .09, group);
    mesh(round, paleGlass, p.x, y + .12, p.z, .035, .045, .035, group);
  };

  // ---- The ground floor: old stone, whitewashed, a timber band at the attic floor.
  put(stoneDark, ac, bc, low + .35, w + .25, .7, d + .25);
  put(wall, ac, bc, (low + floor - .12) / 2, w, floor - .12 - low, d);
  put(timber, ac, bc, floor - .14, w + .24, .2, d + .24);
  for (const [a, b] of [[A.a0, A.b0], [A.a1, A.b0], [A.a0, A.b1], [A.a1, A.b1]]) for (let y = low + .9; y < floor - .4; y += .7)
    put(stone, a + (a < ac ? .03 : -.03), b + (b < bc ? .03 : -.03), y, .55, .32, .55);
  // A door on the street side for the cellar, and shuttered windows to the plaza and the lane.
  put(timberDark, A.a0 - .03, -15.4, low + .3 + 1.1, .1, 2.2, 1.2);
  put(stone, A.a0 - .05, -15.4, low + .3 + 2.35, .14, .22, 1.6);
  for (const [a, b, face] of [[10.2, A.b1, 1], [14.3, A.b1, 1], [12, A.b0, -1]]) {
    put(windowDark, a, b + face * .03, low + 1.9, .8, 1, .06);
    for (const side of [-1, 1]) put(shutter, a + side * .62, b + face * .05, low + 1.9, .38, 1.05, .06);
  }
  // A vine up the south-west corner, over the plaza, to the eave.
  { const trunk = P(A.a0 + .5, A.b1 + .12); post(vineWood, trunk.x, (low + floor) / 2, trunk.z, .05, floor - low, group);
    for (let k = 0; k < 26; k++) {
      const a = A.a0 + .3 + random() * 4.2, y = floor - .9 + random() * 2.1 - (a - A.a0) * .12, p = P(a, A.b1 + .14);
      mesh(round, k % 3 ? leaf : leafDark, p.x, y, p.z, .22 + random() * .15, .18 + random() * .12, .08, group);
    } }

  // ---- The attic: floor, knee walls, the east gable and its round window.
  put(plank, ac, bc, floor - .05, w, .1, d);
  put(rug, 10.4, -17.2, floor + .012, 2.3, .02, 1.5); put(rugEdge, 10.4, -17.2, floor + .006, 2.45, .012, 1.65);
  const knee = 1.25;
  put(wall, ac, A.b0 + A.wall / 2, floor + knee / 2, w, knee, A.wall);
  put(wall, ac, A.b1 - A.wall / 2, floor + knee / 2, w, knee, A.wall);
  put(wall, A.a1 - A.wall / 2, bc, floor + knee / 2, A.wall, knee, d);
  const ridge = 4.2, eave = 1.0, run = d / 2 + .4, rise = ridge - eave, slope = rise / run, pitch = Math.atan2(rise, run), length = Math.hypot(run, rise);
  const roofAt = b => floor + eave + (run - Math.abs(b - bc)) * slope;
  { const shape = new THREE.Shape();
    shape.moveTo(-d / 2, 0); shape.lineTo(d / 2, 0); shape.lineTo(0, roofAt(bc) - .12 - floor - knee); shape.closePath();
    const gable = new THREE.ExtrudeGeometry(shape, { depth: A.wall, bevelEnabled: false });
    const p = P(A.a1 - A.wall, bc), m = mesh(gable, wall, p.x, floor + knee, p.z, 1, 1, 1, group); m.rotation.y = Math.PI / 2;
    const eye = P(A.a1 + .02, bc), ring = mesh(new THREE.TorusGeometry(.42, .07, 5, 14), timber, eye.x, floor + 2.35, eye.z, 1, 1, 1, group); ring.rotation.y = Math.PI / 2;
    const pane = post(windowDark, eye.x, floor + 2.35, eye.z, .4, .03, group); pane.rotation.z = Math.PI / 2; }

  // ---- The roof: two steep tiled slopes, the ridge running east from the open gable.
  const roofA0 = A.a0 - .6, roofA1 = A.a1 + .4, roofMid = (roofA0 + roofA1) / 2, roofLong = roofA1 - roofA0;
  for (const side of [-1, 1]) {
    const bm = bc + side * run / 2, ym = floor + eave + rise / 2, tilt = side < 0 ? -pitch : pitch;
    put(side < 0 ? tile : tileDark, roofMid, bm, ym, roofLong, .16, length, tilt);
    for (const t of [.2, .4, .6, .8]) put(tileRidge, roofMid, bc + side * (run - t * run), floor + eave + t * rise + .1, roofLong, .045, .1, tilt);
    put(timberDark, roofA0 - .02, bm, ym - .04, .08, .3, length + .1, tilt);   // bargeboards on the open gable
    for (let a = A.a0 + .2; a < A.a1; a += 1.2) put(timber, a, bm + side * .05, ym - .16, .1, .12, length - .2, tilt);   // rafters
  }
  put(tileRidge, roofMid, bc, floor + ridge + .07, roofLong, .14, .3);
  put(timber, roofMid, bc, floor + ridge - .22, roofLong, .18, .18);
  const collarY = floor + 2.85, collarHalf = run - (collarY + .1 - floor - eave) / slope;
  for (const a of [A.a0 - .15, 11, 13.6]) put(timber, a, bc, collarY, .12, .14, collarHalf * 2);

  // The open gable's rail, with a gap at the stair head.
  const railY = floor + 1.0, railA = A.a0 + .08;
  for (const [b0, b1] of [[A.b0 + A.wall, S.b0], [S.b1, A.b1 - A.wall]]) {
    put(timberLight, railA, (b0 + b1) / 2, railY, .1, .08, b1 - b0);
    for (let b = b0 + .05; b <= b1 - .04; b += .28) put(timber, railA, b, floor + .5, .05, 1.0, .05);
  }

  // ---- The stair: stone steps from the street to the gable, a handrail each side.
  const steps = 9, stepRun = (A.a0 - S.a0) / steps, stairWidth = S.b1 - S.b0;
  for (let k = 0; k < steps; k++) {
    const a = S.a0 + (k + .5) * stepRun, top = base + (k + .75) / steps * A.lift;
    put(stone, a, stairMid, (low + top) / 2, stepRun + .01, top - low, stairWidth);
    put(timberLight, a, stairMid, top + .03, stepRun + .04, .06, stairWidth + .08);
  }
  const handRise = Math.atan2(A.lift, A.a0 - S.a0), handLength = Math.hypot(A.a0 - S.a0, A.lift);
  for (const b of [S.b0 - .08, S.b1 + .08]) {
    put(timberLight, (S.a0 + A.a0) / 2, b, base + A.lift / 2 + .95, handLength, .08, .08, 0, handRise);
    for (let k = 0; k <= steps; k += 1.5) {
      const a = S.a0 + k * stepRun, y = base + k / steps * A.lift;
      put(timber, a, b, y + .47, .06, .95, .06);
    }
  }

  // ---- The racks: stepped under the roof along the back wall, bottles lying with their ends to the room.
  const rackA = A.a1 - A.wall - A.shelf / 2;
  for (const h of [.35, .8, 1.25, 1.7, 2.15]) {
    const half = Math.min(d / 2 - A.wall, run - (h + .35 - eave) / slope);
    if (half < .4) continue;
    put(timberLight, rackA, bc, floor + h, A.shelf, .04, half * 2);
    for (let b = bc - half + .07; b <= bc + half - .07; b += .125) {
      const p = P(rackA + .02, b);
      mesh(bottleLying, random() < .12 ? wax : glass[Math.floor(random() * glass.length)], p.x, floor + h + .06, p.z, 1, 1, 1, group);
    }
  }
  for (const b of [-2.4, -1.2, 0, 1.2, 2.4]) {
    const top = Math.min(2.25, roofAt(bc + b) - floor - .3);
    put(timber, rackA - A.shelf / 2 + .03, bc + b, floor + top / 2, .06, top, .06);
  }
  // Low shelves under each slope: cases of wine below, standing bottles on top.
  const lowA0 = A.a0 + 1.4, lowA1 = A.a1 - A.wall - A.shelf;
  for (const side of [-1, 1]) {
    const b = side < 0 ? A.b0 + A.wall + A.shelf / 2 : A.b1 - A.wall - A.shelf / 2;
    put(timberLight, (lowA0 + lowA1) / 2, b, floor + 1.02, lowA1 - lowA0, .05, A.shelf);
    put(timberLight, (lowA0 + lowA1) / 2, b, floor + .5, lowA1 - lowA0, .04, A.shelf);
    for (let a = lowA0 + .1; a < lowA1 - .1; a += .75) put(timber, a, b, floor + .5, .05, 1.0, A.shelf * .9);
    for (let a = lowA0 + .5; a < lowA1 - .4; a += .82) put(random() < .5 ? timberLight : plank, a, b, floor + .72, .62, .38, A.shelf * .8);
    for (let a = lowA0 + .1; a < lowA1 - .05; a += .14) stand(a, b + (random() - .5) * .2, floor + 1.045);
  }

  // ---- The tasting counter, two barrel tables, glasses, a cheese board, a candle.
  const C = A.counter, ca = (C.a0 + C.a1) / 2, cb = (C.b0 + C.b1) / 2;
  put(timber, ca, cb, floor + .5, C.a1 - C.a0, 1.0, C.b1 - C.b0);
  put(timberLight, ca, cb, floor + 1.03, C.a1 - C.a0 + .15, .06, C.b1 - C.b0 + .12);
  for (const a of [C.a0 + .4, C.a0 + .6, C.a1 - .5]) stand(a, cb, floor + 1.06);
  for (const a of [C.a0 + 1.0, C.a0 + 1.25, C.a0 + 1.5, C.a0 + 1.75]) wineGlass(a, cb - .12, floor + 1.06);
  put(timberLight, C.a1 - 1.0, cb, floor + 1.075, .45, .03, .3);
  { const p = P(C.a1 - 1.05, cb); mesh(round, cheese, p.x, floor + 1.13, p.z, .09, .06, .09, group); }
  { const p = P(C.a1 - .2, cb); post(candle, p.x, floor + 1.14, p.z, .03, .16, group); mesh(round, glow, p.x, floor + 1.25, p.z, .018, .03, .018, group); }
  for (const [k, { a, b }] of A.barrels.entries()) {
    const p = P(a, b); barrel(p.x, p.z, 1, group, floor);
    stand(a + .08, b, floor + .99); wineGlass(a - .15, b + .1, floor + .99);
    if (k === 0) wineGlass(a - .05, b - .18, floor + .99);
  }

  // ---- Lanterns on the collar beams, and a string of little lights across the open gable.
  for (const a of [11, 13.6]) {
    const p = P(a, bc);
    post(timberDark, p.x, collarY - .25, p.z, .01, .4, group);
    box(timberDark, p.x, collarY - .5, p.z, .2, .03, .2, group);
    mesh(round, glow, p.x, collarY - .62, p.z, .08, .11, .08, group);
    box(timberDark, p.x, collarY - .74, p.z, .2, .03, .2, group);
  }
  for (let k = 0; k <= 14; k++) {
    const t = k / 14, b = A.b0 + .3 + t * (d - .6), sag = Math.sin(t * Math.PI) * .35, p = P(A.a0 - .2, b);
    mesh(round, glow, p.x, floor + 2.55 - sag, p.z, .03, .04, .03, group);
  }

  // ---- The name board in the gable, and a plate at the foot of the stair.
  { const p = P(A.a0 - .15, bc); signs.hanging({ x: p.x, y: collarY - .52, z: p.z, label: A.name, facing: -Math.PI / 2, parent: group }); }
  { const p = P(S.a0 - .15, S.b0 - .5); signs.plate({ x: p.x, z: p.z, label: A.name, facing: -Math.PI / 2, parent: group }); }

  group.traverse(object => { if (object.isMesh) object.userData.passable = true; });
  for (const collider of atticColliders()) push({ ...collider });
  return { group, floor };
}

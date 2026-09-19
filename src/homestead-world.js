import * as THREE from 'three';
import { HOUSE_PLOT, HOUSE_STAGE_IDS, BIRDHOUSE_POSTS, plotPoint, houseColliders } from './construction.js';

/**
 * The traveler's house on the plot beside the Koopwood, and the birdhouse posts
 * in the Greenway (src/construction.js). The house goes up stage by stage:
 * stakes and string on an empty plot; stone footings and a plank floor with a
 * porch; the frame; plank walls with the door and windows marked; a shingled
 * roof and a porch roof; the door, shutters and a lamp; then, on the porch
 * where anybody walking by can see them, a daybed with a patchwork quilt, a
 * chest and a walnut table; and a stone chimney at the end that smokes.
 * `setStages(n)` shows the first n; the house is solid from its footings.
 * `setPost(id, state)` puts a birdhouse on a post, with a bird in it once
 * somebody has moved in.
 */
export function createHomestead({ parent, material, mesh, box, post, round, cylinder, heightAt, colliders, movingGroups, reindex = () => {} }) {
  const root = new THREE.Group(); root.name = 'Your house'; parent.add(root);
  const { w: W, d: D, porch: P, yaw } = HOUSE_PLOT, at = plotPoint, ground = (lx, lz) => { const p = at(lx, lz); return heightAt(p.x, p.z); };
  const wood = material('#9a7552'), pale = material('#c7a276'), dark = material('#5c4330'), stone = material('#8e8b80'), stoneDark = material('#6f6c63');
  const shingle = material('#6b4a3a'), shingleDark = material('#553a2d'), shutter = material('#3f7a55'), iron = material('#34322f'), glass = material('#ffd98a', { emissive: '#ffb347', emissiveIntensity: .35 });
  const string = material('#e8dcb8'), quilt = ['#c94f4f', '#e8c35a', '#4f7fc9', '#5aa36a', '#e88fb4', '#f2eee2'].map(c => material(c)), walnut = material('#4a3325');

  // Everything on a level floor: the highest ground under the footprint, and a little air under the boards.
  let top = -Infinity;
  for (let lx = -W / 2; lx <= W / 2; lx += .5) for (let lz = -D / 2; lz <= D / 2 + P; lz += .5) top = Math.max(top, ground(lx, lz));
  const floorY = top + .38, wallTop = floorY + 2.6, ridge = wallTop + 1.5;
  const stages = HOUSE_STAGE_IDS.map(id => { const g = new THREE.Group(); g.name = `House: ${id}`; g.visible = false; root.add(g); movingGroups.add(g); return g; });
  const plotMarks = new THREE.Group(); plotMarks.name = 'The empty plot'; root.add(plotMarks); movingGroups.add(plotMarks);
  const place = (m, lx, y, lz, turn = 0) => { const p = at(lx, lz); m.position.set(p.x, y, p.z); m.rotation.y = yaw + turn; return m; };
  const block = (g, mat, lx, y, lz, sx, sy, sz, turn = 0) => place(box(mat, 0, 0, 0, sx, sy, sz, g), lx, y, lz, turn);
  const pole = (g, mat, lx, y, lz, r, h) => place(post(mat, 0, 0, 0, r, h, g), lx, y, lz);
  const [footings, frame, walls, roof, door, bed, hearth, chest, table] = stages;

  // The empty plot: a stake at each corner, string between them, and a little board.
  { const corners = [[-W / 2, -D / 2], [W / 2, -D / 2], [W / 2, D / 2 + P], [-W / 2, D / 2 + P]];
    for (const [lx, lz] of corners) pole(plotMarks, pale, lx, ground(lx, lz) + .35, lz, .04, .7);
    corners.forEach(([ax, az], i) => { const [bx, bz] = corners[(i + 1) % 4], len = Math.hypot(bx - ax, bz - az), y = (ground(ax, az) + ground(bx, bz)) / 2 + .6;
      block(plotMarks, string, (ax + bx) / 2, y, (az + bz) / 2, bx === ax ? .012 : len, .012, bx === ax ? len : .012); });
    const sy = ground(0, D / 2 + P + .6); pole(plotMarks, pale, 0, sy + .45, D / 2 + P + .6, .04, .9);
    block(plotMarks, material('#e9dcb4'), 0, sy + .85, D / 2 + P + .63, .7, .36, .03);
    for (let k = 0; k < 5; k++) place(mesh(round, stone, 0, 0, 0, .28, .2, .24, plotMarks), -2.6 + (k % 3) * .35, ground(-2.6, 3.2) + .12 + Math.floor(k / 3) * .18, 3.2 + (k % 2) * .3); }

  // Footings and a floor: stone piers, a plank floor with the porch in front, and two steps.
  { for (const lx of [-W / 2 + .2, 0, W / 2 - .2]) for (const lz of [-D / 2 + .2, D / 2 - .2, D / 2 + P - .15]) {
      const g = ground(lx, lz), h = floorY - g; block(footings, stone, lx, g + h / 2 - .05, lz, .42, h + .1, .42); }
    block(footings, pale, 0, floorY, D / 4, W, .12, D + P + .02);
    for (let k = 0; k <= 12; k++) block(footings, dark, -W / 2 + k * W / 12, floorY + .065, D / 4, .02, .01, D + P);
    for (let k = 0; k < 2; k++) { const lz = D / 2 + P + .3 + k * .32, g = ground(0, lz); block(footings, wood, 0, g + (floorY - g) * (1 - (k + 1) / 3), lz, 1.4, .1, .32); } }

  // The frame: corner and door posts, the plates along the top, the posts that carry the ridge, and the ridge beam.
  { for (const lx of [-W / 2 + .1, -W / 6, W / 6, W / 2 - .1]) for (const lz of [-D / 2 + .1, D / 2 - .1]) pole(frame, wood, lx, floorY + 1.3, lz, .09, 2.6);
    for (const lz of [-D / 2 + .1, D / 2 - .1]) block(frame, wood, 0, wallTop, lz, W, .16, .16);
    for (const lx of [-W / 2 + .1, W / 2 - .1]) { block(frame, wood, lx, wallTop, 0, .16, .16, D); pole(frame, wood, lx, wallTop + .75, 0, .08, 1.5); }
    block(frame, wood, 0, ridge, 0, W + .2, .16, .16);
    for (const lx of [-W / 2 + .2, W / 2 - .2]) pole(frame, wood, lx, floorY + 1.05, D / 2 + P - .12, .08, 2.1); }

  // Walls of planks, the openings marked dark, and the gable ends.
  { const opening = material('#2b241e');
    for (const [lz, len] of [[-D / 2 + .06, W], [D / 2 - .06, W]]) {
      block(walls, pale, 0, floorY + 1.3, lz, len, 2.6, .12);
      for (let k = 1; k < 9; k++) block(walls, wood, 0, floorY + k * .29, lz + Math.sign(lz) * .065, len, .025, .01);
    }
    for (const lx of [-W / 2 + .06, W / 2 - .06]) { block(walls, pale, lx, floorY + 1.3, 0, .12, 2.6, D); for (let k = 1; k < 9; k++) block(walls, wood, lx + Math.sign(lx) * .065, floorY + k * .29, 0, .01, .025, D); }
    block(walls, opening, 0, floorY + 1.05, D / 2 + .005, 1.1, 2.1, .02);
    for (const lx of [-2.1, 2.1]) block(walls, opening, lx, floorY + 1.5, D / 2 + .005, .9, .85, .02);
    for (const lx of [-1.8, 1.8]) block(walls, opening, lx, floorY + 1.5, -D / 2 - .005, .8, .75, .02);
    const gable = new THREE.ShapeGeometry(new THREE.Shape([new THREE.Vector2(-D / 2, 0), new THREE.Vector2(D / 2, 0), new THREE.Vector2(0, ridge - wallTop)]));
    const gableMat = material('#c7a276', { side: THREE.DoubleSide });
    for (const lx of [-W / 2 + .06, W / 2 - .06]) { const m = new THREE.Mesh(gable, gableMat); place(m, lx, wallTop, 0, Math.PI / 2); m.castShadow = true; walls.add(m); } }

  // The roof: two shingled slopes over the eaves, and a lean-to over the porch.
  { const run = D / 2 + .4, rise = ridge - wallTop + .12, len = Math.hypot(run, rise), tilt = Math.atan2(rise, run);
    for (const side of [-1, 1]) {
      const slab = block(roof, shingle, 0, wallTop + rise / 2 + .05, side * run / 2, W + .7, .12, len); slab.rotation.x = side * tilt;
      for (let k = 1; k < 7; k++) { const f = k / 7, row = block(roof, shingleDark, 0, ridge + .1 - rise * f + .075, side * run * f, W + .72, .03, .06); row.rotation.x = side * tilt; }
    }
    const porchRun = P + .35, drop = .45, porchLen = Math.hypot(porchRun, drop);
    const lean = block(roof, shingle, 0, wallTop - .25 - drop / 2, D / 2 + porchRun / 2, W + .5, .1, porchLen); lean.rotation.x = Math.atan2(drop, porchRun);
    block(roof, wood, 0, wallTop - .72, D / 2 + P - .12, W - .2, .14, .14); }

  // The door and windows: a plank door with iron bands, glazing, green shutters, and a lamp by the door.
  { block(door, dark, 0, floorY + 1.05, D / 2 + .02, 1.05, 2.05, .06);
    for (const h of [.4, 1.65]) block(door, iron, 0, floorY + h, D / 2 + .06, 1.07, .08, .02);
    block(door, iron, .35, floorY + 1.05, D / 2 + .07, .06, .06, .03);
    for (const [lx, lz, sign] of [[-2.1, D / 2, 1], [2.1, D / 2, 1], [-1.8, -D / 2, -1], [1.8, -D / 2, -1]]) {
      block(door, glass, lx, floorY + 1.5, lz + sign * .015, .78, .7, .02);
      block(door, dark, lx, floorY + 1.5, lz + sign * .03, .06, .78, .02); block(door, dark, lx, floorY + 1.5, lz + sign * .03, .84, .06, .02);
      for (const s of [-1, 1]) block(door, shutter, lx + s * .63, floorY + 1.5, lz + sign * .04, .38, .85, .04);
    }
    pole(door, iron, .8, floorY + 1.95, D / 2 + .18, .015, .3);
    place(mesh(round, glass, 0, 0, 0, .09, .12, .09, door), .8, floorY + 1.75, D / 2 + .18); }

  // On the porch: a daybed with a patchwork quilt at one end...
  { const lx = -W / 2 + 1.25, lz = D / 2 + P / 2, y = floorY + .06;
    block(bed, wood, lx, y + .3, lz, 1.9, .12, .85); for (const s of [-1, 1]) block(bed, wood, lx + s * .95, y + .45, lz, .1, .9, .85);
    for (let i = 0; i < 4; i++) for (let j = 0; j < 2; j++) block(bed, quilt[(i + j * 3) % quilt.length], lx - .6 + i * .4, y + .43, lz - .2 + j * .4, .4, .08, .4);
    block(bed, quilt[5], lx + .7, y + .48, lz, .3, .12, .6); }
  // ...a stone chimney at the far end, that smokes...
  const smoke = [];
  { const lx = W / 2 + .45, lz = -.6, g = ground(lx, lz), h = ridge + .8 - g;
    block(hearth, stone, lx, g + h / 2, lz, .85, h, .95);
    for (let k = 0; k < Math.floor(h / .5); k++) block(hearth, stoneDark, lx + .43, g + .25 + k * .5, lz, .02, .04, .96);
    block(hearth, stoneDark, lx, g + h + .06, lz, .95, .12, 1.05);
    for (let k = 0; k < 6; k++) { const m = new THREE.Mesh(round, new THREE.MeshBasicMaterial({ color: 0xb9b3a8, transparent: true, opacity: 0, depthWrite: false })); hearth.add(m); smoke.push({ m, age: k / 6, at: at(lx, lz), y: g + h + .2, side: k % 3 - 1 }); } }
  // ...a chest by the door...
  { const lx = W / 2 - 1.1, lz = D / 2 + P / 2, y = floorY + .06;
    block(chest, wood, lx, y + .3, lz, .9, .5, .55); block(chest, dark, lx, y + .6, lz, .94, .12, .59);
    for (const s of [-1, 1]) block(chest, iron, lx + s * .3, y + .35, lz, .05, .62, .6); block(chest, iron, lx, y + .42, lz + .29, .1, .12, .02); }
  // ...and a walnut table with two stools.
  { const lx = 1.35, lz = D / 2 + P / 2, y = floorY + .06;
    block(table, walnut, lx, y + .72, lz, .95, .06, .62);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) pole(table, walnut, lx + sx * .4, y + .36, lz + sz * .24, .035, .72);
    for (const s of [-1, 1]) { pole(table, walnut, lx + s * .75, y + .22, lz, .17, .06); pole(table, walnut, lx + s * .75, y + .1, lz, .04, .2); }
    place(mesh(cylinder, material('#e8e1d0'), 0, 0, 0, .09, .04, .09, table), lx - .15, y + .77, lz);
    place(mesh(round, material('#d44a3a'), 0, 0, 0, .05, .05, .05, table), lx + .2, y + .78, lz + .05); }

  // -------------------------------------------------------------------------
  // The birdhouse posts
  // -------------------------------------------------------------------------
  const posts = new Map();
  const looks = { birdhouse: [material('#d9b98a'), material('#b8443a')], 'oak-birdhouse': [material('#9a7550'), material('#3f7a55')] };
  for (const spot of BIRDHOUSE_POSTS) {
    const g = heightAt(spot.x, spot.z), group = new THREE.Group(); group.name = `Birdhouse post ${spot.id}`; root.add(group); movingGroups.add(group);
    const turn = Math.atan2(-spot.x, -spot.z);   // facing the way back to the village, near enough
    group.position.set(spot.x, g, spot.z); group.rotation.y = turn;
    const add = (mat, geometry, x, y, z, sx, sy, sz, rx = 0) => { const m = new THREE.Mesh(geometry, mat); m.position.set(x, y, z); m.scale.set(sx, sy, sz); m.rotation.x = rx; m.castShadow = true; group.add(m); return m; };
    const cube = new THREE.BoxGeometry(1, 1, 1);
    add(dark, cylinder, 0, 1.05, 0, .06, 2.1, .06); add(dark, cube, 0, 2.1, 0, .3, .04, .3);
    const house = new THREE.Group(); house.visible = false; group.add(house);
    const body = new THREE.Mesh(cube, looks.birdhouse[0]); body.position.set(0, 2.28, 0); body.scale.set(.26, .32, .26); house.add(body);
    const roofs = [-1, 1].map(s => { const m = new THREE.Mesh(cube, looks.birdhouse[1]); m.position.set(s * .1, 2.49, 0); m.scale.set(.22, .03, .32); m.rotation.z = -s * .6; house.add(m); return m; });
    const hole = new THREE.Mesh(cylinder, material('#1d1712')); hole.position.set(0, 2.3, .131); hole.scale.set(.05, .01, .05); hole.rotation.x = Math.PI / 2; house.add(hole);
    const perch = new THREE.Mesh(cylinder, dark); perch.position.set(0, 2.22, .17); perch.scale.set(.01, .08, .01); perch.rotation.x = Math.PI / 2; house.add(perch);
    const bird = new THREE.Group(); bird.visible = false; bird.position.set(0, 2.3, .13); house.add(bird);
    bird.add(Object.assign(new THREE.Mesh(round, material('#7a5a3a')), {}));
    bird.children[0].scale.set(.045, .045, .045);
    const beak = new THREE.Mesh(new THREE.ConeGeometry(.012, .04, 5), material('#e0a030')); beak.position.set(0, 0, .05); beak.rotation.x = Math.PI / 2; bird.add(beak);
    colliders.push({ x: spot.x, z: spot.z, r: .12, kind: 'birdhouse-post' });
    posts.set(spot.id, { house, body, roofs, bird, phase: 'empty' });
  }

  // -------------------------------------------------------------------------
  // Live
  // -------------------------------------------------------------------------
  let shown = -1, solid = [];
  function setStages(n) {
    if (n === shown) return;
    shown = n;
    stages.forEach((g, i) => { g.visible = i < n; });
    plotMarks.visible = n === 0;
    const had = solid.length;
    for (const c of solid) { const i = colliders.indexOf(c); if (i >= 0) colliders.splice(i, 1); }
    solid = houseColliders(n); colliders.push(...solid);
    if (had || solid.length) reindex();   // never while the world is still being built: the plot starts empty
  }
  function setPost(id, { phase = 'empty', kind = 'birdhouse' } = {}) {
    const entry = posts.get(id); if (!entry) return;
    entry.phase = phase; entry.house.visible = phase !== 'empty'; entry.bird.visible = phase === 'occupied';
    const [body, roofMat] = looks[kind] ?? looks.birdhouse; entry.body.material = body; for (const r of entry.roofs) r.material = roofMat;
  }
  function update(dt, time) {
    for (const entry of posts.values()) if (entry.bird.visible) { const peep = Math.max(0, Math.sin(time * 1.7 + entry.body.id)); entry.bird.position.z = .1 + peep * .06; entry.bird.rotation.y = Math.sin(time * 3.1) * .5; }
    if (hearth.visible) for (const s of smoke) {
      s.age = (s.age + dt / 5) % 1; const t = s.age;
      s.m.position.set(s.at.x + Math.sin(time * .5 + s.side) * t * .6, s.y + t * 3.5, s.at.z + t * .5);
      s.m.scale.setScalar(.15 + t * .7); s.m.material.opacity = .4 * Math.sin(Math.PI * Math.min(1, t * 1.8)) * (1 - t * .5);
    }
  }
  setStages(0);
  return { root, setStages, setPost, update, floorY, get stages() { return shown; } };
}

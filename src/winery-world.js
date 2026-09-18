/**
 * Paradise Springs as scenery (the tables are src/winery.js): the log cabin,
 * the hall, the terrace, the barrels, the spring, the rows and the lane. Built
 * with world.js's toolkit like the rest of West Suval; small things standing in
 * the way (tables, barrels, the vine panels) are made solid by the world's prop
 * pass, and the buildings and the spring carry their own colliders here.
 */
import * as THREE from 'three';
import { WINERY, WINERY_LAYOUT, wineryPoint } from './winery.js';

export function createWineryScenery(kit) {
  const { root, material, mesh, box, post, barrel, groundHeight, colliders, cylinder, round, wornPatch, signs } = kit;
  const group = new THREE.Group(); group.name = 'Paradise Springs'; root.add(group);
  const L = WINERY_LAYOUT;
  const logs = material('#7a5638'), logsDark = material('#5f4129'), chinking = material('#d8ccb0'), stone = material('#8d887c'), stoneDark = material('#6f6a60');
  const boards = material('#8b6d4f'), trim = material('#e8dfca'), roof = material('#4f4a45'), roofRed = material('#6d3530'), door = material('#553a26');
  const flag = material('#b4aa96'), canvas = material('#ece2c8'), vineLeaf = material('#5f8a3c'), vineDark = material('#46692c'), grapes = material('#4b2a4f');
  const water = material('#6f9fae', { roughness: .25, metalness: .1 }), wire = material('#3d3a36');
  const floor = (x, z, w, d) => { let low = Infinity; for (const [dx, dz] of [[-.5, -.5], [.5, -.5], [-.5, .5], [.5, .5], [0, 0]]) low = Math.min(low, groundHeight(x + dx * w, z + dz * d)); return low; };
  const solid = (x, z, w, d, kind) => colliders.push({ x, z, hx: w / 2, hz: d / 2, kind });

  // The cabin: square-hewn logs with pale chinking between, a stone chimney at the west end, a porch on posts.
  {
    const c = L.cabin, y = floor(c.x, c.z, c.width, c.depth);
    box(stone, c.x, y + .2, c.z, c.width + .3, .5, c.depth + .3, group);
    for (let k = 0; k < 9; k++) {
      const h = y + .5 + k * .3;
      box(k % 2 ? logs : logsDark, c.x, h + .13, c.z, c.width, .26, c.depth, group);
      box(chinking, c.x, h + .285, c.z, c.width - .08, .05, c.depth - .08, group);
    }
    const ridgeRise = c.ridge - c.eaves;
    const roofMesh = mesh(new THREE.CylinderGeometry(0, 1, 1, 4, 1), roof, c.x, y + c.eaves + ridgeRise / 2 + .45, c.z, (c.width + 1.2) * .72, ridgeRise, (c.depth + 1.4) * .72, group);
    roofMesh.rotation.y = Math.PI / 4;
    box(stone, c.x - c.width / 2 - .45, y + 2.7, c.z, .9, 5.4, 1.3, group);
    box(stoneDark, c.x - c.width / 2 - .45, y + 5.5, c.z, .7, .4, 1.0, group);
    box(door, c.x + 1.2, y + 1.55, c.z + c.depth / 2 + .02, 1.0, 2.0, .08, group);
    for (const dx of [-2.2, 3]) box(material('#ffe4a0', { emissive: '#ffd287', emissiveIntensity: .35 }), c.x + dx, y + 1.9, c.z + c.depth / 2 + .02, .8, .7, .06, group);
    // The porch: a plank floor, three posts and a lean-to roof.
    box(boards, c.x, y + .45, c.z + c.depth / 2 + c.porch / 2, c.width, .12, c.porch, group);
    for (const dx of [-c.width / 2 + .3, 0, c.width / 2 - .3]) post(logs, c.x + dx, y + 1.9, c.z + c.depth / 2 + c.porch - .2, .09, 2.8, group);
    const lean = box(roof, c.x, y + 3.35, c.z + c.depth / 2 + c.porch / 2, c.width + .4, .1, c.porch + .4, group); lean.rotation.x = .18;
    solid(c.x, c.z, c.width + .4, c.depth + .4, 'winery-cabin');
    solid(c.x - c.width / 2 - .45, c.z, 1, 1.4, 'winery-cabin');
  }

  // The hall: a stone foot, board walls above, a steep barn roof with a cupola, great doors south onto the terrace.
  {
    const h = L.hall, y = floor(h.x, h.z, h.width, h.depth);
    box(stone, h.x, y + h.stone / 2 - .2, h.z, h.width, h.stone + .4, h.depth, group);
    box(boards, h.x, y + h.stone + (h.eaves - h.stone) / 2, h.z, h.width - .1, h.eaves - h.stone, h.depth - .1, group);
    for (let k = -4; k <= 4; k++) box(trim, h.x + k * (h.width / 9), y + (h.eaves + h.stone) / 2, h.z + h.depth / 2 + .03, .12, h.eaves - h.stone, .05, group);
    const rise = h.ridge - h.eaves;
    const gable = new THREE.BufferGeometry();
    const hw = h.width / 2 + .6, hd = h.depth / 2 + .7;
    // A long gable roof along the hall, ridge running east to west.
    const vertices = new Float32Array([
      -hw, 0, -hd, hw, 0, -hd, hw, rise, 0, -hw, 0, -hd, hw, rise, 0, -hw, rise, 0,
      -hw, 0, hd, -hw, rise, 0, hw, rise, 0, -hw, 0, hd, hw, rise, 0, hw, 0, hd,
    ]);
    gable.setAttribute('position', new THREE.BufferAttribute(vertices, 3)); gable.computeVertexNormals();
    const roofMesh = new THREE.Mesh(gable, roofRed); roofMesh.material.side = THREE.DoubleSide; roofMesh.position.set(h.x, y + h.eaves, h.z); roofMesh.castShadow = true; group.add(roofMesh);
    for (const side of [-1, 1]) {
      const end = new THREE.BufferGeometry();
      end.setAttribute('position', new THREE.BufferAttribute(new Float32Array([0, 0, -h.depth / 2, 0, 0, h.depth / 2, 0, rise, 0]), 3)); end.computeVertexNormals();
      const face = new THREE.Mesh(end, boards); face.material.side = THREE.DoubleSide; face.position.set(h.x + side * h.width / 2, y + h.eaves, h.z); group.add(face);
    }
    box(trim, h.x, y + h.ridge + .7, h.z, 1.6, 1.4, 1.6, group);
    mesh(new THREE.CylinderGeometry(0, 1.3, 1.1, 4), roofRed, h.x, y + h.ridge + 1.95, h.z, 1, 1, 1, group).rotation.y = Math.PI / 4;
    for (const dx of [-2.6, 2.6]) box(door, h.x + dx * .55, y + h.stone + 1.6, h.z + h.depth / 2 + .06, 2.6, 3.2, .1, group);
    solid(h.x, h.z, h.width + .2, h.depth + .2, 'winery-hall');
  }

  // The terrace: flagstones, and tables under canvas umbrellas.
  {
    const t = L.terrace;
    box(flag, t.x, floor(t.x, t.z, t.width, t.depth) + .04, t.z, t.width, .1, t.depth, group);
    for (const table of L.tables) {
      const y = groundHeight(table.x, table.z);
      post(boards, table.x, y + .75, table.z, .55, .06, group);
      post(logsDark, table.x, y + .38, table.z, .06, .74, group);
      post(logsDark, table.x, y + 1.6, table.z, .035, 2.2, group);
      mesh(new THREE.ConeGeometry(1.35, .45, 8), canvas, table.x, y + 2.55, table.z, 1, 1, 1, group);
      for (const [dx, dz] of [[.95, 0], [-.95, 0]]) {
        const cy = groundHeight(table.x + dx, table.z + dz);
        box(logs, table.x + dx, cy + .45, table.z + dz, .42, .06, .42, group);
        box(logs, table.x + dx + Math.sign(dx) * .19, cy + .7, table.z + dz, .05, .5, .42, group);
      }
    }
  }

  // Barrels on their chocks at the hall's east end.
  for (const b of L.barrels) barrel(b.x, b.z, 1.05, group);

  // The spring: a stone-lipped pool below the cabin.
  {
    const s = L.spring, y = groundHeight(s.x, s.z);
    mesh(cylinder, water, s.x, y + .12, s.z, s.radius, .08, s.radius, group);
    for (let k = 0; k < 16; k++) {
      const a = k / 16 * Math.PI * 2;
      mesh(round, k % 3 ? stone : stoneDark, s.x + Math.cos(a) * (s.radius + .3), y + .2, s.z + Math.sin(a) * (s.radius + .3), .42, .3, .36, group);
    }
    colliders.push({ x: s.x, z: s.z, r: s.radius + .2, kind: 'winery-spring' });
  }

  // The vines: posts every five metres, a wire, and a panel of leaf and fruit between each pair of posts.
  for (const row of L.rows) {
    for (let b = row.from; b < row.to; b += 5) {
      const p = wineryPoint(row.a, b), q = wineryPoint(row.a, Math.min(row.to, b + 5)), mid = { x: (p.x + q.x) / 2, z: (p.z + q.z) / 2 };
      const y = groundHeight(p.x, p.z), ym = groundHeight(mid.x, mid.z);
      post(logsDark, p.x, y + .85, p.z, .05, 1.7, group);
      // The wire and the fruit are part of the panel: only the leaf is solid.
      box(wire, mid.x, ym + 1.55, mid.z, .02, .02, Math.hypot(q.x - p.x, q.z - p.z), group).userData.passable = true;
      box((b / 5) % 2 ? vineLeaf : vineDark, mid.x, ym + 1.15, mid.z, .55, .75, Math.hypot(q.x - p.x, q.z - p.z) - .3, group);
      for (const f of [-.3, .1, .35]) mesh(round, grapes, mid.x + .3, ym + .92, mid.z + f * 4, .09, .13, .09, group).userData.passable = true;
    }
    const end = wineryPoint(row.a, row.to);
    post(logsDark, end.x, groundHeight(end.x, end.z) + .85, end.z, .05, 1.7, group);
  }

  // The lane across the downs, worn by carts, and the name board where it arrives.
  for (let i = 1; i < L.lane.length; i++) {
    const a = L.lane[i - 1], b = L.lane[i], steps = Math.ceil(Math.hypot(b.x - a.x, b.z - a.z) / 4);
    for (let k = 0; k <= steps; k++) wornPatch(a.x + (b.x - a.x) * k / steps, a.z + (b.z - a.z) * k / steps, 2.2, '#a8966c', 1, group);
  }
  signs?.place?.({ x: L.sign.x, z: L.sign.z, label: WINERY.name, facing: L.sign.facing, parent: group });
  return { group, centre: WINERY.centre };
}

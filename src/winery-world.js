/**
 * Paradise Springs as scenery (the tables are src/winery.js): the log cabin,
 * the hall, the terrace, the barrels, the spring, the rows and the lane. Built
 * with world.js's toolkit beside Port Calos in Luscia; small things standing in
 * the way (tables, barrels, the vine panels) are made solid by the world's prop
 * pass, and the buildings and the spring carry their own colliders here.
 */
import * as THREE from 'three';
import { WINERY, WINERY_LAYOUT, VARIETIES, wineryPoint } from './winery.js';

export function createWineryScenery(kit) {
  const { root, material, mesh, box, post, barrel, groundHeight, colliders, cylinder, round, wornPatch, signs, movingGroups } = kit;
  const group = new THREE.Group(); group.name = WINERY.name; root.add(group);
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

  // The spring: water welling up at the foot of a limestone outcrop on the rise, where the
  // Svaleen say one of Thareth's tears fell on the stone; a stone basin; a rill down the slope; a reedy pool.
  const moving = new THREE.Group(); moving.name = 'The spring, running'; group.add(moving); movingGroups?.add(moving);
  const ripples = [], flecks = [], bubbles = [];
  {
    const s = L.spring, limestone = material('#d9d2bd'), limestoneShade = material('#bdb49c'), pebble = material('#a79d88'), reed = material('#7c8a4a'), cattail = material('#5a3f2a');
    const rillWater = new THREE.MeshStandardMaterial({ color: '#79aebb', roughness: .15, metalness: .15, transparent: true, opacity: .88 });
    // The outcrop: pale boulders heaped against the rise, the water coming out from under the biggest.
    const src = s.source, sy = groundHeight(src.x, src.z);
    for (const [dx, dz, sx, sh, sz, shade] of [[0, 0, 1.6, 1.2, 1.2, 0], [-1.3, -.8, 1.1, .9, 1, 1], [1.1, -1, 1, .75, .9, 1], [-.6, 1.1, .8, .55, .7, 0], [.9, .9, .7, .5, .6, 1], [-2.1, .4, .7, .5, .7, 0]]) {
      const rock = mesh(round, shade ? limestoneShade : limestone, src.x + dx, sy + sh * .55, src.z + dz, sx, sh, sz, group); rock.rotation.set(dx * .2, dz, dz * .15);
    }
    colliders.push({ x: src.x, z: src.z, r: 1.7, kind: 'winery-spring' });
    // The basin, lined with stones; its water surface a little below the lip.
    const bs = s.basin, by = groundHeight(bs.x, bs.z);
    mesh(cylinder, rillWater, bs.x, by + .1, bs.z, bs.radius, .06, bs.radius, group);
    for (let k = 0; k < 14; k++) {
      const a = k / 14 * Math.PI * 2;
      mesh(round, k % 3 ? limestone : limestoneShade, bs.x + Math.cos(a) * (bs.radius + .25), by + .18, bs.z + Math.sin(a) * (bs.radius + .25), .34, .26, .3, group);
    }
    colliders.push({ x: bs.x, z: bs.z, r: bs.radius + .15, kind: 'winery-spring' });
    // Where it wells up: rings spreading and fading on the basin, and bubbles rising.
    const ringGeometry = new THREE.RingGeometry(.2, .26, 20);
    for (let k = 0; k < 3; k++) {
      const ring = new THREE.Mesh(ringGeometry, new THREE.MeshBasicMaterial({ color: '#e8f4f4', transparent: true, opacity: .6, side: THREE.DoubleSide, depthWrite: false }));
      ring.rotation.x = -Math.PI / 2; ring.position.set(bs.x - .5, by + .14, bs.z - .1); moving.add(ring); ripples.push({ ring, phase: k / 3 });
    }
    for (let k = 0; k < 6; k++) {
      const bubble = new THREE.Mesh(new THREE.SphereGeometry(.035, 6, 4), new THREE.MeshBasicMaterial({ color: '#f2fbfb', transparent: true, opacity: .8 }));
      moving.add(bubble); bubbles.push({ bubble, phase: k / 6, x: bs.x - .5 + (k % 3 - 1) * .12, z: bs.z - .1 + (k % 2 - .5) * .14, y: by + .06 });
    }
    // The rill: a narrow run of water between pebbles, down the slope to the pool.
    const path = [{ x: bs.x, z: bs.z }, ...s.rill, { x: s.pool.x, z: s.pool.z }];
    for (let i = 1; i < path.length; i++) {
      const a = path[i - 1], b = path[i], length = Math.hypot(b.x - a.x, b.z - a.z), mid = { x: (a.x + b.x) / 2, z: (a.z + b.z) / 2 };
      const strip = box(rillWater, mid.x, groundHeight(mid.x, mid.z) + .05, mid.z, .5, .04, length + .2, group);
      strip.rotation.y = Math.atan2(b.x - a.x, b.z - a.z); strip.userData.passable = true;
      for (let k = 0; k < length / .9; k++) {
        const f = k / (length / .9), side = k % 2 ? 1 : -1, nx = -(b.z - a.z) / length, nz = (b.x - a.x) / length;
        const px = a.x + (b.x - a.x) * f + nx * side * .38, pz = a.z + (b.z - a.z) * f + nz * side * .38;
        mesh(round, pebble, px, groundHeight(px, pz) + .05, pz, .12, .07, .1, group).userData.passable = true;
      }
    }
    // Light carried on the current: flecks travelling downhill along the rill, over and over.
    let rillLength = 0;
    for (let i = 1; i < path.length; i++) rillLength += Math.hypot(path[i].x - path[i - 1].x, path[i].z - path[i - 1].z);
    for (let k = 0; k < 14; k++) {
      const fleck = new THREE.Mesh(new THREE.BoxGeometry(.14, .01, .05), new THREE.MeshBasicMaterial({ color: '#f4fbfb', transparent: true, opacity: .75 }));
      moving.add(fleck); flecks.push({ fleck, phase: k / 14 });
    }
    flecks.path = path; flecks.total = rillLength;
    // The pool at the end, and the reeds round it.
    const pool = s.pool, py = groundHeight(pool.x, pool.z);
    mesh(cylinder, rillWater, pool.x, py + .06, pool.z, pool.radius, .05, pool.radius * .8, group).userData.passable = true;
    for (let k = 0; k < 16; k++) {
      const a = k / 16 * Math.PI * 2, r = pool.radius + .2 + (k % 3) * .15;
      const rx = pool.x + Math.cos(a) * r, rz = pool.z + Math.sin(a) * r * .8;
      post(reed, rx, groundHeight(rx, rz) + .55, rz, .025, 1.1, group).userData.passable = true;
      if (k % 3 === 0) mesh(cylinder, cattail, rx, groundHeight(rx, rz) + 1.12, rz, .045, .2, .045, group).userData.passable = true;
    }
    colliders.push({ x: pool.x, z: pool.z, r: pool.radius * .85, kind: 'winery-spring' });
  }

  // The vines: eight varietal blocks of two rows, posts every five metres, a wire, and a
  // panel of leaf and fruit between each pair of posts, the fruit white or red with its grape.
  const hex = value => `#${value.toString(16).padStart(6, '0')}`;
  const leafOf = new Map(Object.entries(VARIETIES).map(([id, variety]) => [id, material(hex(variety.leaf))]));
  const fruitOf = new Map(Object.entries(VARIETIES).map(([id, variety]) => [id, material(hex(variety.fruit))]));
  for (const row of L.rows) {
    for (let b = row.from; b < row.to; b += 5) {
      const p = wineryPoint(row.a, b), q = wineryPoint(row.a, Math.min(row.to, b + 5)), mid = { x: (p.x + q.x) / 2, z: (p.z + q.z) / 2 };
      const y = groundHeight(p.x, p.z), ym = groundHeight(mid.x, mid.z);
      post(logsDark, p.x, y + .85, p.z, .05, 1.7, group);
      // The wire and the fruit are part of the panel: only the leaf is solid.
      box(wire, mid.x, ym + 1.55, mid.z, .02, .02, Math.hypot(q.x - p.x, q.z - p.z), group).userData.passable = true;
      box(leafOf.get(row.variety), mid.x, ym + 1.15, mid.z, .55, .75, Math.hypot(q.x - p.x, q.z - p.z) - .3, group);
      for (const f of [-.3, .1, .35]) for (const side of [-1, 1]) mesh(round, fruitOf.get(row.variety), mid.x + side * .29, ym + .9, mid.z + f * 4, .065, .1, .065, group).userData.passable = true;
    }
    const end = wineryPoint(row.a, row.to);
    post(logsDark, end.x, groundHeight(end.x, end.z) + .85, end.z, .05, 1.7, group);
  }
  for (const plate of L.plates) signs?.plate?.({ x: plate.x, z: plate.z, label: VARIETIES[plate.variety].name, facing: plate.facing, parent: group });

  // The lane from Port Calos, worn by carts, and the name board where it arrives.
  for (let i = 1; i < L.lane.length; i++) {
    const a = L.lane[i - 1], b = L.lane[i], steps = Math.ceil(Math.hypot(b.x - a.x, b.z - a.z) / 4);
    for (let k = 0; k <= steps; k++) wornPatch(a.x + (b.x - a.x) * k / steps, a.z + (b.z - a.z) * k / steps, 2.2, '#a8966c', 1, group);
  }
  signs?.place?.({ x: L.sign.x, z: L.sign.z, label: WINERY.name, facing: L.sign.facing, parent: group });
  /** The water moving: rings spreading from where it wells up, bubbles rising, light carried down the rill. */
  function update(time) {
    for (const { ring, phase } of ripples) {
      const k = (time * .45 + phase) % 1;
      ring.scale.setScalar(1 + k * 5); ring.material.opacity = .55 * (1 - k);
    }
    for (const { bubble, phase, x, z, y } of bubbles) {
      const k = (time * .8 + phase) % 1;
      bubble.position.set(x, y + k * .09, z); bubble.material.opacity = .8 * (1 - k);
    }
    const path = flecks.path;
    for (const { fleck, phase } of flecks) {
      let d = (time * .9 + phase * flecks.total) % flecks.total;
      for (let i = 1; i < path.length; i++) {
        const a = path[i - 1], b = path[i], length = Math.hypot(b.x - a.x, b.z - a.z);
        if (d > length) { d -= length; continue; }
        const x = a.x + (b.x - a.x) * d / length, z = a.z + (b.z - a.z) * d / length;
        fleck.position.set(x, groundHeight(x, z) + .08, z); fleck.rotation.y = Math.atan2(b.x - a.x, b.z - a.z); break;
      }
    }
  }
  return { group, centre: WINERY.centre, update };
}

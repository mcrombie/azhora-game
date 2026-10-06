import { finishBuild } from '../loading/build-steps.js';
import * as THREE from 'three';
import { registerWorldTree, worldTreeId } from './tree-registry.js';
import { createSceneryBuilder } from './scenery-builder.js';
import { FARMSTEADS, FARM_LANES, inFarmPolygon } from './regional-farmland.js';

const C = Object.freeze({
  soil: '#837251', furrow: '#746448', grainSoil: '#9b9166', orchard: '#849364', meadow: '#97a171',
  path: '#b1a17a', pathEdge: '#a69b76', timber: '#69583d', paleWood: '#a6936c', roof: '#67694c',
  iron: '#555950', leaf: '#65864c', leafLight: '#7e9955', leafDark: '#4f733d',
  straw: '#c3ad6d', strawLight: '#d5c185', stem: '#9b9e61', sack: '#b9ad84', water: '#688986',
});
const mix = (a, b, t) => ({ x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t });
const midpoint = (a, b) => mix(a, b, .5);
const distance = (a, b) => Math.hypot(b.x - a.x, b.z - a.z);
const hash = (a, b = 0) => {
  const value = Math.sin(a * 127.1 + b * 311.7) * 43758.5453;
  return value - Math.floor(value);
};

/** Ten small, open agricultural places. Land remains the authoritative terrain:
 * every ground vertex, crop foot and tree root samples it independently. Three
 * merged meshes per farm keep distant fields cheap and independently cullable.
 * The playable beds are intentionally bare here: farming-view owns their crops.
 */
export function createRegionalFarmlandScenery(...args) { return finishBuild(createRegionalFarmlandScenerySteps(...args)); }

export function* createRegionalFarmlandScenerySteps({ root, groundHeight, colliders = [], canPlace = () => true }) {
  let buildWork = 0;
  const group = new THREE.Group(); group.name = 'Regional farmland'; root.add(group);
  const metrics = { farms: 0, fields: 0, grainFields: 0, vegetableFields: 0, meadows: 0,
    orchards: 0, orchardTrees: 0, gardenBeds: 0, seedStations: 0, shelters: 0,
    cropTufts: 0, hedgeClumps: 0, lanes: 0, batches: 0, vertices: 0, colliders: 0 };
  const y = (x, z) => groundHeight(x, z);
  const v = (p, lift = .045) => [p.x, y(p.x, p.z) + lift, p.z];
  const addCollider = collider => { colliders.push(collider); metrics.colliders++; };

  // Subdivide an irregular polygon's triangles to follow local contours. Long,
  // rigid fan triangles would bridge shallow hollows and cause floating crops.
  function* groundTriangle(builder, tint, a, b, c, lift, depth = 0) { if (++buildWork % 32 === 0) yield;
    if (depth < 5 && Math.max(distance(a, b), distance(b, c), distance(c, a)) > 2.5) {
      const ab = midpoint(a, b), bc = midpoint(b, c), ca = midpoint(c, a);
      (yield* groundTriangle(builder, tint, a, ab, ca, lift, depth + 1));
      (yield* groundTriangle(builder, tint, ab, b, bc, lift, depth + 1));
      (yield* groundTriangle(builder, tint, ca, bc, c, lift, depth + 1));
      (yield* groundTriangle(builder, tint, ab, bc, ca, lift, depth + 1));
    } else {
      const up = (b.z - a.z) * (c.x - a.x) - (b.x - a.x) * (c.z - a.z);
      builder.triangle(tint, v(a, lift), v(up >= 0 ? b : c, lift), v(up >= 0 ? c : b, lift));
    }
  }
  function* groundPolygon(builder, tint, polygon, lift = .045) {
    const contour = polygon.map(p => new THREE.Vector2(p.x, p.z));
    for (const [a, b, c] of THREE.ShapeUtils.triangulateShape(contour, [])) { if (++buildWork % 32 === 0) yield;
      (yield* groundTriangle(builder, tint, polygon[a], polygon[b], polygon[c], lift));
    }
  }
  function* ribbon(builder, tint, a, b, width, lift = .06) {
    const length = distance(a, b), count = Math.max(1, Math.ceil(length / 1.3));
    if (length < .01) return;
    const nx = -(b.z - a.z) / length * width / 2, nz = (b.x - a.x) / length * width / 2;
    for (let i = 0; i < count; i++) { if (++buildWork % 32 === 0) yield;
      const p = mix(a, b, i / count), q = mix(a, b, (i + 1) / count);
      (yield* groundPolygon(builder, tint, [{ x: p.x + nx, z: p.z + nz }, { x: p.x - nx, z: p.z - nz },
        { x: q.x - nx, z: q.z - nz }, { x: q.x + nx, z: q.z + nz }], lift));
    }
  }
  function cropBasis(field) {
    const centre = field.polygon.reduce((p, v) => ({ x: p.x + v.x / field.polygon.length, z: p.z + v.z / field.polygon.length }), { x: 0, z: 0 });
    const gx = (y(centre.x + 2, centre.z) - y(centre.x - 2, centre.z)) / 4;
    const gz = (y(centre.x, centre.z + 2) - y(centre.x, centre.z - 2)) / 4;
    // On sloping fields the long rows lie across, not straight down, the slope.
    const yaw = Math.hypot(gx, gz) > .055 ? Math.atan2(-gx, gz) : field.yaw;
    return { centre, c: Math.cos(yaw), s: Math.sin(yaw) };
  }
  function cropPoint(basis, u, w) {
    const bow = Math.sin(u * .12) * .24;
    return { x: basis.centre.x + u * basis.c - (w + bow) * basis.s,
      z: basis.centre.z + u * basis.s + (w + bow) * basis.c };
  }
  function* fieldCrops(field, plants, earth, index) {
    const basis = cropBasis(field), grain = field.kind === 'grain';
    const spacing = grain ? 1.05 : 1.3, along = grain ? .76 : 1.05;
    for (let row = -19; row <= 19; row++) { if (++buildWork % 32 === 0) yield;
      let previous = null;
      for (let u = -24; u <= 24; u += along) { if (++buildWork % 32 === 0) yield;
        const p = cropPoint(basis, u, row * spacing);
        if (!inFarmPolygon(field.polygon, p.x, p.z) || !canPlace(p, 'crop')) { previous = null; continue; }
        if (previous) (yield* ribbon(earth, grain ? '#938759' : C.furrow, previous, p, grain ? .15 : .29, .058));
        previous = p;
        const jitter = hash(p.x + index, p.z), h = (grain ? .6 : .17) + jitter * (grain ? .25 : .13);
        const py = y(p.x, p.z) + .06;
        if (grain) {
          // Three tapered, crossed blades and visible ears read as a grain stand,
          // rather than a solid cuboid hedge, from the normal walking camera.
          for (let k = 0; k < 3; k++) { if (++buildWork % 32 === 0) yield;
            const angle = k * Math.PI / 3 + jitter, dx = Math.cos(angle) * .14, dz = Math.sin(angle) * .14;
            const tip = [p.x + dx * .4, py + h, p.z + dz * .4];
            plants.triangle(k % 2 ? C.straw : C.stem, [p.x - dx, py, p.z - dz], [p.x + dx, py, p.z + dz], tip);
            plants.triangle(k % 2 ? C.straw : C.stem, tip, [p.x + dx, py, p.z + dz], [p.x - dx, py, p.z - dz]);
          }
          plants.rock((row + index) % 3 ? C.straw : C.strawLight, p.x, py + h - .04, p.z, .047, .13, .047, jitter * 3);
        } else {
          plants.rock(field.crop === 'beet' ? '#865369' : '#b08044', p.x, py + .06, p.z, .14, .12, .14);
          for (let k = 0; k < 3; k++) { if (++buildWork % 32 === 0) yield;
            const angle = k * 2.094 + jitter, dx = Math.cos(angle) * .28, dz = Math.sin(angle) * .28;
            plants.sheet(k % 2 ? C.leafLight : C.leaf, [p.x, py, p.z], [p.x + dx - dz * .3, py + h, p.z + dz + dx * .3],
              [p.x + dx * 1.2, py + h * .9, p.z + dz * 1.2], [p.x + dx + dz * .3, py + h, p.z + dz - dx * .3]);
          }
        }
        metrics.cropTufts++;
      }
    }
  }
  function orchardTree(tree, props, index) {
    const py = y(tree.x, tree.z), h = tree.height, lean = (index % 3 - 1) * .2;
    props.cylinder(C.timber, tree.x, py, tree.z, .2, h * .67, .2);
    props.beam(C.timber, [tree.x, py + h * .5, tree.z], [tree.x + .95, py + h * .76, tree.z + .3], .17);
    props.beam(C.timber, [tree.x, py + h * .4, tree.z], [tree.x - .8, py + h * .68, tree.z - .3], .15);
    for (const [dx, dz, dh, tint] of [[-.72, -.1, .71, C.leaf], [.64, .24, .77, C.leafLight], [lean, -.35, .91, C.leaf]]) {
      props.rock(tint, tree.x + dx, py + h * dh, tree.z + dz, 1.18, .97, 1.2, index * .6);
    }
    // A few restrained fruit flecks distinguish the orchard from ordinary woods.
    for (let n = 0; n < 5; n++) {
      const a = n * 2.4 + index, radius = .95 + hash(n, index) * .35;
      props.rock(index % 2 ? '#b28d49' : '#a47650', tree.x + Math.cos(a) * radius, py + h * (.65 + (n % 3) * .065),
        tree.z + Math.sin(a) * radius, .095, .11, .095);
    }
    const collider = { x: tree.x, z: tree.z, r: .26, kind: 'farm-orchard-tree', farmTreeId: tree.id }; addCollider(collider);
    registerWorldTree(colliders, { id: tree.id, x: tree.x, z: tree.z, y: py, species: 'apple', radius: .26, harvestable: false,
      reason: 'This cultivated apple tree is kept for its orchard fruit.' }, [], collider);
    metrics.orchardTrees++;
  }
  function workyard(farm, props, earth) {
    const s = farm.shed, w = s.w / 2, d = s.d / 2;
    const corners = [[-w, -d], [w, -d], [w, d], [-w, d]].map(([dx, dz]) => ({ x: s.x + dx, z: s.z + dz }));
    const eave = Math.max(...corners.map(p => y(p.x, p.z))) + s.height;
    for (const p of corners) {
      const py = y(p.x, p.z);
      props.block('#96917a', p.x, py - .06, p.z, .4, .23, .4);
      props.block(C.timber, p.x, py + .1, p.z, .16, eave - py - .1, .16);
      addCollider({ x: p.x, z: p.z, r: .2, kind: 'farm-shelter-post', farmId: farm.id });
    }
    props.roof(farm.index % 3 === 0 ? '#7b7955' : C.roof, s.x, eave, s.z, s.w + .55, s.d + .55, .55);
    for (const [a, b] of [[corners[0], corners[1]], [corners[0], corners[3]], [corners[1], corners[2]]]) {
      props.beam(C.timber, [a.x, eave - .2, a.z], [b.x, eave - .2, b.z], .15);
    }
    const crate = { x: s.x - .6, z: s.z - .85 }, cy = y(crate.x, crate.z);
    props.block(C.paleWood, crate.x, cy, crate.z, 1.1, .6, .8);
    props.box(C.timber, crate.x, cy + .34, crate.z, 1.14, .075, .84);
    addCollider({ ...crate, hx: .6, hz: .45, kind: 'farm-tool-crate', farmId: farm.id });
    for (const dx of [.12, .43]) {
      props.beam(C.paleWood, [s.x + dx, y(s.x + dx, s.z - 1), s.z - 1], [s.x + dx + .2, eave - .35, s.z - 1.45], .055);
    }
    props.box(C.iron, s.x + .25, y(s.x + .25, s.z - 1) + .12, s.z - .99, .35, .12, .16);
    metrics.shelters++;

    const bench = farm.seedStation, by = y(bench.x, bench.z);
    for (const dx of [-.67, .67]) for (const dz of [-.25, .25]) {
      const py = y(bench.x + dx, bench.z + dz);
      props.block(C.timber, bench.x + dx, py, bench.z + dz, .09, by + .86 - py, .09);
    }
    props.box(C.paleWood, bench.x, by + .88, bench.z, 1.65, .12, .76);
    for (let n = 0; n < 3; n++) {
      const sx = bench.x - .47 + n * .47;
      props.rock(n % 2 ? '#c5b792' : C.sack, sx, by + 1.1, bench.z, .19, .23, .2, .2 + n);
      props.cylinder(C.timber, sx, by + 1.28, bench.z, .067, .07);
    }
    addCollider({ x: bench.x, z: bench.z, hx: .84, hz: .4, kind: 'farm-seed-bench', farmId: farm.id });
    const tub = { x: bench.x + 2, z: bench.z - 1.1 }, ty = y(tub.x, tub.z);
    props.cylinder(C.timber, tub.x, ty, tub.z, .43, .55);
    props.cylinder(C.water, tub.x, ty + .47, tub.z, .38, .01);
    props.cylinder(C.iron, tub.x, ty + .16, tub.z, .44, .05);
    addCollider({ ...tub, r: .46, kind: 'farm-water-tub', farmId: farm.id });
    metrics.seedStations++;
    earth.patch(C.path, y, bench.x, bench.z + .8, 2.9, 1.5, 0, .06, 3);
  }

  for (const farm of FARMSTEADS) { if (++buildWork % 32 === 0) yield;
    if (!canPlace(farm, 'farm')) continue;
    const place = new THREE.Group(); place.name = farm.name; place.userData.farmId = farm.id; group.add(place);
    const earth = createSceneryBuilder(`${farm.name} — ground`);
    const plants = createSceneryBuilder(`${farm.name} — crops`);
    const props = createSceneryBuilder(`${farm.name} — orchard and tools`);
    for (const field of farm.fields) { if (++buildWork % 32 === 0) yield;
      if (!canPlace(field.polygon[0], 'field')) continue;
      (yield* groundPolygon(earth, C[field.kind === 'grain' ? 'grainSoil' : field.kind === 'vegetable' ? 'soil' : field.kind], field.polygon));
      metrics.fields++;
      if (field.kind === 'grain' || field.kind === 'vegetable') {
        (yield* fieldCrops(field, plants, earth, farm.index));
        metrics[field.kind === 'grain' ? 'grainFields' : 'vegetableFields']++;
      } else if (field.kind === 'meadow') {
        // The grass close is partly cut: low windrows, a few tied sheaves, open
        // uncut margins. Its warm straw is restrained next to the green orchard.
        const centre = field.polygon.reduce((p, v) => ({ x: p.x + v.x / field.polygon.length, z: p.z + v.z / field.polygon.length }), { x: 0, z: 0 });
        for (let row = -1; row <= 1; row++) { if (++buildWork % 32 === 0) yield;
          const a = { x: centre.x - 3.2, z: centre.z + row * 2.1 }, b = { x: centre.x + 3.2, z: centre.z + row * 2.1 + .4 };
          for (let n = 0; n < 10; n++) { if (++buildWork % 32 === 0) yield;
            const p = mix(a, b, n / 9);
            if (inFarmPolygon(field.polygon, p.x, p.z)) plants.rock('#b3a36f', p.x, y(p.x, p.z) + .09, p.z, .48, .12, .34, .13);
          }
        }
        const hay = { x: centre.x - 2.2, z: centre.z + 2.1 }, hy = y(hay.x, hay.z);
        props.cone(C.straw, hay.x, hy, hay.z, .52, 1.1, farm.index * .5);
        props.cylinder(C.timber, hay.x, hy + .61, hay.z, .23, .045);
        metrics.meadows++;
      } else metrics.orchards++;
    }
    for (const tree of farm.orchardTrees) { if (++buildWork % 32 === 0) yield; if (canPlace(tree, 'tree')) orchardTree(tree, props, farm.index); }
    for (const edge of farm.hedgeEdges) { if (++buildWork % 32 === 0) yield;
      const a = farm.boundary[edge], b = farm.boundary[(edge + 1) % farm.boundary.length];
      const count = Math.floor(distance(a, b) / 2.1);
      for (let i = 0; i < count; i++) { if (++buildWork % 32 === 0) yield;
        if ((i + farm.index) % 7 === 3) continue;
        const p = mix(a, b, (i + .5) / count);
        if (!canPlace(p, 'hedge')) continue;
        const py = y(p.x, p.z), h = .6 + hash(i, farm.index) * .4;
        props.rock(i % 3 ? C.leafDark : C.leaf, p.x, py + h * .55, p.z, 1.15, h * .72, .72, Math.atan2(b.x - a.x, b.z - a.z));
        metrics.hedgeClumps++;
      }
    }
    for (let i = 1; i < farm.approach.length; i++) { if (++buildWork % 32 === 0) yield;
      (yield* ribbon(earth, C.pathEdge, farm.approach[i - 1], farm.approach[i], 1.55, .07));
      (yield* ribbon(earth, C.path, farm.approach[i - 1], farm.approach[i], 1.06, .078));
    }
    const lane = FARM_LANES.find(lane => lane.farmId === farm.id);
    for (let i = 1; i < lane.points.length; i++) { if (++buildWork % 32 === 0) yield;
      (yield* ribbon(earth, C.pathEdge, lane.points[i - 1], lane.points[i], 1.55, .055));
      (yield* ribbon(earth, C.path, lane.points[i - 1], lane.points[i], 1.08, .065));
    }
    metrics.lanes++;
    // Short weathered rail fragments mix with the hedges; never a uniform fence
    // around each farm, and never a rail across the garden's approach.
    if (farm.index % 3 !== 1) {
      const a = farm.boundary[2], b = farm.boundary[3], tint = farm.index % 2 ? '#8e8969' : C.timber;
      const count = Math.floor(distance(a, b) / 3.4);
      for (let n = 0; n < count; n++) { if (++buildWork % 32 === 0) yield;
        if ((n + farm.index) % 4 === 2) continue;
        const p = mix(a, b, n / count), q = mix(a, b, (n + 1) / count);
        const py = y(p.x, p.z), qy = y(q.x, q.z);
        props.stake(tint, p.x, py, p.z, .13, .86, farm.index * .13, .05);
        props.beam(tint, [p.x, py + .61, p.z], [q.x, qy + .61, q.z], .08);
      }
    }
    workyard(farm, props, earth);
    for (const [builder, shadow] of [[earth, false], [plants, false], [props, true]]) { if (++buildWork % 32 === 0) yield;
      if ((yield* builder.finishSteps(place, { castShadow: shadow }))) { metrics.batches++; metrics.vertices += builder.vertexCount; }
    }
    metrics.farms++; metrics.gardenBeds += farm.rows.length;
  }
  return { group, metrics };
}

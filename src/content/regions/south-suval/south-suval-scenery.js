import { forEachBuild } from '../../../world/loading/build-each.js';
import { finishBuild } from '../../../world/loading/build-steps.js';
import * as THREE from 'three';
import { registerWorldTree, worldTreeId } from '../../../world/scenery/tree-registry.js';
import { hexOwnerAt, landDistance, REGION_CELLS } from '../../../world/terrain/region-world.js';
import { WORLD_SCALE } from '../../../world/terrain/world-scale.js';
import {
  STILLWATER, STILLWATER_SHORE, STILLWATER_SURFACE, stillwaterDistance, inStillwater,
  TERRACES, STAIRS, CITY_FEATHER, cityPoint, cityLocal, cityLevel, hexInset, FACING_LAKE, CITY_UP,
  IMLAMDRIS_HOUSES, STILLWATER_TEMPLE, STAR_TERRACE, WATER_STEPS, LANDWARD_GATE, PASS_ROAD_HALF,
  SOUTH_SUVAL_CLIMATE, southSuvalClear, onCliffFoot, imlamdrisPatchLines,
} from './south-suval-world.js';
import { groundTint } from '../../../world/terrain/world-terrain.js';
import { suvalHighlandClear, IMLAMDRIS_REBUILD } from '../suval-highlands/suval-highlands.js';
import { suvalFalsePassClear } from '../minora-frontier/frontier-ridges.js';

const smooth = (a, b, x) => { const v = Math.min(1, Math.max(0, (x - a) / (b - a))); return v * v * (3 - 2 * v); };

/**
 * The scenery of South Suval: the Stillwater, Imlamdris on its north-east shore, and the region's
 * own scatter.
 *
 * `world.js` hands over the same toolkit every region's scenery receives, and everything static
 * goes into the world's batching pass, so the city's stones cost about as many draw calls as there
 * are materials. The scatter is instanced and batched two hexes at a time, as East Suval's is.
 *
 * The look is the lore's (`../world-builder/azhora_lore/geography/regions/svaleen.md`, `suval.md`):
 * pale limestone and thin soil, scrub and aromatic plants, "olive and fig in the warmer
 * microclimates", and a lake country that is "its own microclimate - cooler, with morning mist off
 * the water". Imlamdris is old and quiet, "its streets wider than Solis's, its building less
 * frantic", and it faces the water: every door and window in it is on the lake side.
 */
export function createSouthSuvalScenery(...args) { return finishBuild(createSouthSuvalScenerySteps(...args)); }

export function* createSouthSuvalScenerySteps(kit) {
  let buildWork = 0;
  const { root, material, mesh, box, post, pebble, groundHeight, colliders, dummy, color, cylinder, round, roofGeometry, wornPatch } = kit;
  const group = new THREE.Group(); group.name = 'South Suval scenery'; root.add(group);
  let seed = 7720341;
  const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  const range = (a, b) => a + random() * (b - a);
  const metrics = { buildings: 0, walls: 0, waterColliders: 0, batches: 0, rocks: 0, scrub: 0, tufts: 0, trees: 0, reeds: 0, vines: 0, stones: 0 };
  const push = collider => { colliders.push(collider); return collider; };
  const gy = (x, z) => groundHeight(x, z);

  // Imlamdrissi stone: a warm pale limestone in three courses, a whiter one for the temple, a
  // grey coping, and low roofs of fired tile. Shutters in the grey-green of the lake in the morning.
  const ashlar = material('#d9cfb2'), ashlarWarm = material('#cfc3a4'), ashlarPale = material('#e4dcc5');
  const coping = material('#a9a18b'), footing = material('#a79d84'), templeStone = material('#e8e1cc');
  const column = material('#ece6d2'), templeRoof = material('#8f8b7f');
  const tileA = material('#b36b4b'), tileB = material('#a45f44'), tileC = material('#bd7858');
  const door = material('#4b3b2d'), dark = material('#2c302e'), shutter = material('#5d776f');
  const gnomonStone = material('#d3cab0');

  // ---------------------------------------------------------------------------
  // The Stillwater
  // ---------------------------------------------------------------------------
  /**
   * The water: a fan from the lake's centre to its shore at the lake's own level. Grey-green and
   * still - "a flat grey-green surface in the morning mist, blue in the afternoons" - with a
   * little gloss, and opaque enough to hide the drop of the bed a pace off the shore.
   */
  const waterMaterial = new THREE.MeshStandardMaterial({ color: 0x5b817d, roughness: .16, metalness: .08, transparent: true, opacity: .9 });
  {
    const positions = [STILLWATER.centre.x, STILLWATER_SURFACE + .02, STILLWATER.centre.z], indices = [];
    yield* forEachBuild(STILLWATER_SHORE, function* (p, i) {
      // A metre past the shore, under the bank, so there is never a dry seam at the water's edge.
      const dx = p.x - STILLWATER.centre.x, dz = p.z - STILLWATER.centre.z, n = Math.hypot(dx, dz);
      positions.push(p.x + dx / n * 1.1, STILLWATER_SURFACE + .02, p.z + dz / n * 1.1);
      indices.push(0, 1 + (i + 1) % STILLWATER_SHORE.length, 1 + i);
    });
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setIndex(indices); geometry.computeVertexNormals();
    const water = new THREE.Mesh(geometry, waterMaterial); water.name = 'The Stillwater'; water.receiveShadow = true; group.add(water);
  }
  /**
   * **Water with a level** (the user, 22 September 2026: water is real swimmable water). A close
   * field of `pond-water` over the whole lake, each carrying the lake's surface, so the world's
   * `waterAt` answers the Stillwater's level and not the sea's: the bed a pace off the shore is
   * below that level, so nobody stands in the lake and anybody can swim in it. A second ring
   * sits just inside the shore, so there is no dry seam at the water's edge.
   */
  {
    const c = STILLWATER.centre, reach = 60;
    for (let x = c.x - reach; x <= c.x + reach; x += 5) { if (++buildWork % 32 === 0) yield; for (let z = c.z - reach; z <= c.z + reach; z += 5) { if (++buildWork % 32 === 0) yield;
      if (stillwaterDistance(x, z) > -.5) continue;
      push({ x, z, r: 3.8, kind: 'pond-water', surface: STILLWATER_SURFACE }); metrics.waterColliders++;
    } }
    for (let i = 0; i < STILLWATER_SHORE.length; i++) { if (++buildWork % 32 === 0) yield;
      const p = STILLWATER_SHORE[i], dx = p.x - c.x, dz = p.z - c.z, n = Math.hypot(dx, dz);
      push({ x: p.x - dx / n * 1.5, z: p.z - dz / n * 1.5, r: 3, kind: 'pond-water', surface: STILLWATER_SURFACE }); metrics.waterColliders++;
    }
  }
  /**
   * The mist. "The southern lake country is its own microclimate - cooler, with morning mist off
   * the water that the rest of the peninsula does not experience." Three soft banks lying low on
   * the water, each a disc whose edge fades to nothing, so there is no line where the mist stops.
   */
  const mistMaterial = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false, fog: true });
  function mistBank(cx, cz, radius, height, strength) {
    const segments = 36, positions = [cx, height, cz], colours = [.93, .95, .93, strength], indices = [];
    for (let i = 0; i < segments; i++) {
      const t = i / segments * Math.PI * 2;
      positions.push(cx + Math.cos(t) * radius, height, cz + Math.sin(t) * radius * .78);
      colours.push(.93, .95, .93, 0);
      indices.push(0, 1 + i, 1 + (i + 1) % segments);
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colours, 4));
    geometry.setIndex(indices);
    const bank = new THREE.Mesh(geometry, mistMaterial); bank.name = 'Stillwater mist'; bank.renderOrder = 2; group.add(bank);
    return bank;
  }
  const mist = [
    mistBank(STILLWATER.centre.x - 6, STILLWATER.centre.z + 4, 44, STILLWATER_SURFACE + .7, .2),
    mistBank(STILLWATER.centre.x + 9, STILLWATER.centre.z - 6, 34, STILLWATER_SURFACE + 1.3, .14),
    mistBank(STILLWATER.centre.x - 14, STILLWATER.centre.z - 12, 26, STILLWATER_SURFACE + 2, .1),
  ];

  // ---------------------------------------------------------------------------
  // Imlamdris
  // ---------------------------------------------------------------------------
  /** A group in the city's frame at (a, b), turned to face the lake: local +x is across, +z downhill. */
  function cityGroup(a, b, y, name) {
    const p = cityPoint(a, b), g = new THREE.Group();
    g.position.set(p.x, y, p.z); g.rotation.y = FACING_LAKE; g.name = name; group.add(g);
    return g;
  }
  /** Colliders along a line of the city's frame, one every metre and a half, closer than a walker is wide. */
  function cityLine(a0, a1, b, radius, kind) {
    const length = Math.abs(a1 - a0), steps = Math.max(1, Math.round(length / 1.4));
    for (let s = 0; s <= steps; s++) { const p = cityPoint(a0 + (a1 - a0) * s / steps, b); push({ x: p.x, z: p.z, r: radius, kind }); }
  }
  /**
   * The city's own ground (`IMLAMDRIS_PATCH`): the terraces, the stairs and the road's bed on a
   * lattice laid out in the city's frame, in the world's own tint, sunk beneath which the coarse
   * grid is out of sight. The terraces that are paved - the Lake Walk, the temple's and the Star
   * Terrace - are laid pale, and the two street terraces are the dust of wide streets; the patch is
   * nudged forward in depth, since at its rim it meets the coarse grid at the same height and should
   * win that tie.
   */
  {
    const lines = imlamdrisPatchLines(), columns = lines.a.length, rows = lines.b.length;
    const positions = new Float32Array(columns * rows * 3), colours = new Float32Array(columns * rows * 3);
    const paving = new THREE.Color('#cbc1a2'), dust = new THREE.Color('#b8ad88');
    const PAVED = new Set(['lake-walk', 'temple-terrace', 'star-terrace']);
    let jitter = 51277;
    const shade = () => { jitter = (Math.imul(jitter, 1664525) + 1013904223) >>> 0; return .955 + jitter / 4294967296 * .09; };
    for (let j = 0; j < rows; j++) { if (++buildWork % 32 === 0) yield; for (let i = 0; i < columns; i++) { if (++buildWork % 32 === 0) yield;
      const a = lines.a[i], b = lines.b[j], p = cityPoint(a, b), index = j * columns + i;
      positions.set([p.x, gy(p.x, p.z), p.z], index * 3);
      groundTint(color, p.x, p.z, THREE);
      const terrace = TERRACES.find(t => b >= t.from && b < t.to);
      if (terrace && stillwaterDistance(p.x, p.z) >= 0) {
        const made = smooth(CITY_FEATHER.none, CITY_FEATHER.full, hexInset(a, b));
        color.lerp(PAVED.has(terrace.id) ? paving : dust, made * (PAVED.has(terrace.id) ? .78 : .5));
      }
      color.multiplyScalar(shade());
      colours.set([color.r, color.g, color.b], index * 3);
    } }
    // Wound for the city frame, whose `a` runs across and `b` up: the other way round from the world's x and z.
    const indices = [];
    for (let j = 0; j < rows - 1; j++) { if (++buildWork % 32 === 0) yield; for (let i = 0; i < columns - 1; i++) { if (++buildWork % 32 === 0) yield;
      const k = j * columns + i;
      indices.push(k, k + 1, k + columns, k + 1, k + columns + 1, k + columns);
    } }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colours, 3));
    geometry.setIndex(indices); geometry.computeVertexNormals(); geometry.computeBoundingSphere();
    const ground = new THREE.Mesh(geometry, material('#ffffff', { vertexColors: true, flatShading: true, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 }));
    ground.name = 'Imlamdris made ground'; ground.receiveShadow = true; group.add(ground);
    metrics.batches++; metrics.patchVertices = columns * rows;
  }

  /** How far across a wall runs at a line up the slope: to where its terrace gives way to the hill's slope. */
  function halfWidth(b) { let a = 0; while (hexInset(a + .5, b) > CITY_FEATHER.full - 1 && a < 80) a += .5; return a + .5; }

  /**
   * The retaining walls between terraces: pale ashlar from the lower terrace to a parapet a metre
   * above the upper one, open only where a stair or the temple's steps cross. The wall and its
   * parapet are one line of colliders: nobody climbs it from below or walks off it from above.
   */
  function retainingWall(b, low, high) {
    const half = halfWidth(b);
    const gaps = STAIRS.filter(stair => stair.walls.includes(b)).map(stair => [stair.a - stair.half - .15, stair.a + stair.half + .15]);
    const runs = [];
    let start = -half;
    for (const [g0, g1] of gaps.sort((p, q) => p[0] - q[0])) { if (g0 > start) runs.push([start, g0]); start = Math.max(start, g1); }
    if (start < half) runs.push([start, half]);
    const parapet = b === 8 ? 0 : .95;
    for (const [a0, a1] of runs) {
      const length = a1 - a0; if (length < .6) continue;
      const g = cityGroup((a0 + a1) / 2, b, low, `Imlamdris terrace wall ${b}`);
      const face = high - low + parapet + .35;
      box(length > 12 ? ashlar : ashlarWarm, 0, face / 2 - .3, 0, length, face, .9, g);
      box(coping, 0, face - .26, 0, length + .1, .16, 1.05, g);
      // Courses scored into the face, so a wall five metres high reads as built and not poured.
      for (let y = 1.1; y < high - low - .2; y += 1.1) box(ashlarPale, 0, y, .455, length, .07, .02, g);
      cityLine(a0, a1, b, .72, 'imlamdris-wall');
      metrics.walls++;
    }
  }
  for (let i = 1; i < TERRACES.length; i++) { if (++buildWork % 32 === 0) yield; retainingWall(TERRACES[i].from, TERRACES[i - 1].level, TERRACES[i].level); }

  /** The stairs: a step every thirty centimetres of rise, laid on the ramp the ground already is. */
  for (const stair of STAIRS) { if (++buildWork % 32 === 0) yield; for (const wall of stair.walls) { if (++buildWork % 32 === 0) yield;
    const low = cityLevel(stair.a, wall - stair.run - .01), high = cityLevel(stair.a, wall + stair.run + .01);
    const steps = Math.max(2, Math.round((high - low) / .3));
    for (let s = 0; s < steps; s++) { if (++buildWork % 32 === 0) yield;
      const b = wall + stair.run - (s + .5) * (stair.run * 2 / steps), y = cityLevel(stair.a, b);
      const g = cityGroup(stair.a, b, y, `Imlamdris ${stair.id}`);
      box(s % 2 ? ashlarPale : ashlar, 0, -.08, 0, stair.half * 2, .2, stair.run * 2 / steps + .04, g);
    }
    // Cheek walls up both sides of each flight above the lowest terrace, so a stair reads as cut
    // through its wall rather than laid against it.
    if (wall === 8 && stair.id === 'temple-steps') continue;
    for (const side of [-1, 1]) { if (++buildWork % 32 === 0) yield;
      const cheekA = stair.a + side * (stair.half + .3);
      const g = cityGroup(cheekA, wall, low, `Imlamdris ${stair.id} cheek`);
      box(coping, 0, (high - low) / 2 + .4, 0, .5, high - low + .8, stair.run * 2, g).rotation.x = Math.atan2(high - low, stair.run * 2);
      // Solid up its length, so a flight is walked up its middle and not through its side.
      for (let b = wall - stair.run + .6; b <= wall + stair.run; b += 1.2) { if (++buildWork % 32 === 0) yield; const p = cityPoint(cheekA, b); push({ x: p.x, z: p.z, r: .3, kind: 'imlamdris-wall' }); }
    }
  } }

  // The Lake Walk: its paving, a low parapet along the water, and three flights down into it.
  {
    const half = halfWidth(3);
    for (let a = -half + 2; a <= half - 2; a += 7) { if (++buildWork % 32 === 0) yield;
      const p = cityPoint(a, 1.5); wornPatch(p.x, p.z, 4.6, '#cdc3a6', .7, group);
    }
    const open = a => WATER_STEPS.some(step => Math.abs(a - step.a) < step.half + .2);
    const edge = a => { let b = -8; while (b < 6 && stillwaterDistance(cityPoint(a, b).x, cityPoint(a, b).z) < .55) b += .1; return b; };
    for (let a = -half; a < half; a += 1.2) { if (++buildWork % 32 === 0) yield;
      if (open(a) || open(a + 1.2)) continue;
      const b = edge(a + .6), p = cityPoint(a + .6, b), y = gy(p.x, p.z);
      const g = cityGroup(a + .6, b, y, 'Lake Walk parapet');
      box(a % 2.4 < 1.2 ? ashlarPale : ashlar, 0, .35, 0, 1.24, .7, .5, g);
      box(coping, 0, .74, 0, 1.3, .1, .62, g);
      // The Lake Walk's face under it, from the paving down past the waterline: the city meets the
      // lake in a wall, not a bank. Nothing is moored at it.
      const face = y - STILLWATER_SURFACE + .8;
      box(footing, 0, .02 - face / 2, .5, 1.24, face, .55, g);
      push({ x: p.x, z: p.z, r: .55, kind: 'lake-parapet' });
    }
    // The steps go down past the shore and under the water, which is the only thing a lake stair is for.
    for (const step of WATER_STEPS) { if (++buildWork % 32 === 0) yield;
      const top = edge(step.a);
      for (let s = 0; s < 6; s++) { if (++buildWork % 32 === 0) yield;
        const b = top - .2 - s * .55, y = STILLWATER_SURFACE + 1.05 - s * .3;
        const g = cityGroup(step.a, b, y, 'Lake Walk water steps');
        // Walked down and swum over, never walked into: they stand a metre off the lake bed, which
        // is where world.js looks for things a person would strike.
        box(s < 3 ? ashlar : ashlarWarm, 0, -.1, 0, step.half * 2, .22, .6, g).userData.passable = true;
      }
      for (const side of [-1, 1]) { if (++buildWork % 32 === 0) yield;
        const p = cityPoint(step.a + side * (step.half + .35), top - .8), g = cityGroup(step.a + side * (step.half + .35), top - .8, STILLWATER_SURFACE, 'Lake Walk water steps cheek');
        box(coping, 0, .55, 0, .45, 1.9, 2.4, g);
        push({ x: p.x, z: p.z, r: .5, kind: 'lake-parapet' });
      }
    }
  }

  // The streets, worn paler down their middles: the Wide Street and the Upper City's.
  for (const [b, level, width] of [[37.5, 24.2, 9], [56.5, 29.2, 7]]) { if (++buildWork % 32 === 0) yield;
    const half = halfWidth(b);
    for (let a = -half + 3; a <= half - 3; a += 6) { if (++buildWork % 32 === 0) yield; const p = cityPoint(a, b); wornPatch(p.x, p.z, width * .55, '#cbc1a4', .62, group); }
  }

  /** The Blood Prince's sack left foundations, ragged ashlar and charred roof beams.
   * Keep the old street plan so the ruined city remains recognizable beside its new timber homes.
   * Doors and missing walls really are openings; ruin collision follows surviving stone only.
   */
  const burned = material('#443e37'), ash = material('#6c685d');
  function imlamdrisHouse(h, index) {
    const y = cityLevel(h.a, h.b), g = cityGroup(h.a, h.b, y, `${h.id} burned ruin`);
    const w = h.width, d = h.depth;
    const floor = box(ash, 0, .025, 0, w, .08, d, g); floor.userData.passable = true;
    for (let side = 0; side < 3; side++) {
      const height = .8 + ((index * 7 + side * 3) % 7) * .34;
      const x = side === 0 ? -w / 2 : side === 1 ? w / 2 : 0, z = side === 2 ? -d / 2 : -.8;
      box(side === 1 ? ash : ashlarWarm, x, height / 2, z, side === 2 ? w : .65, height, side === 2 ? .65 : d - 1.6, g);
      const length = side === 2 ? w : d - 1.6;
      for (let s = -length / 2; s <= length / 2; s += 1.2) {
        const p = cityPoint(h.a + (side === 2 ? s : x), h.b - (side === 2 ? z : z + s));
        push({ x: p.x, z: p.z, r: .5, kind: 'imlamdris-ruin' });
      }
    }
    for (let k = 0; k < 4; k++) {
      const x = (k % 2 ? 1 : -1) * (w * .2), z = -d * .28 + k * .85;
      const beam = box(burned, x, .26 + k * .04, z, w * .65, .18, .2, g); beam.rotation.y = (index + k) * .73;
      beam.userData.passable = true;
      const rubble = mesh(round, ashlar, x, .25, z + .3, .46, .42, .53, g); rubble.userData.passable = true;
    }
    metrics.buildings++; metrics.ruinedHomes = (metrics.ruinedHomes ?? 0) + 1;
  }
  IMLAMDRIS_HOUSES.forEach(imlamdrisHouse);

  // The temple's lake-facing foundation survives. Its roof and pediment do not: the archive
  // is an open shell with broken columns and scorched shelves, rather than an intact city hall.
  {
    const T = STILLWATER_TEMPLE, y = cityLevel(T.a, T.b), g = cityGroup(T.a, T.b, y, 'Stillwater Temple ruins');
    const W = T.width, D = T.depth, front = D / 2;
    box(templeStone, 0, .03, 0, W + 1.2, .12, D + 1.2, g).userData.passable = true;
    for (const side of [-1, 1]) { if (++buildWork % 32 === 0) yield;
      box(ash, side * (W / 2 - .45), 1.3, -.3, .9, 2.6, D - .6, g);
      for (let s = -front + .4; s <= front - 1.2; s += 1.4) { if (++buildWork % 32 === 0) yield;
        const p = cityPoint(T.a + side * (W / 2 - .45), T.b - s); push({ x: p.x, z: p.z, r: .6, kind: 'temple-wall' });
      }
    }
    // Broken back wall leaves the old doorway and a wider blast breach open.
    for (const [x, width, height] of [[-8, 5, 2.8], [6, 5, 1.5]]) { if (++buildWork % 32 === 0) yield;
      box(ashlarWarm, x, height / 2, -front + .45, width, height, .9, g);
      cityLine(x - width / 2, x + width / 2, T.b + front - .45, .6, 'temple-wall');
    }
    for (let i = 0; i < T.columns; i++) { if (++buildWork % 32 === 0) yield;
      const cx = -W / 2 + .9 + i * (W - 1.8) / (T.columns - 1), height = .8 + (i % 3) * 1.3;
      post(column, cx, height / 2, front - .6, .42, height, g);
      box(templeStone, cx, .18, front - .6, 1.1, .36, 1.1, g);
      const p = cityPoint(T.a + cx, T.b - (front - .6)); push({ x: p.x, z: p.z, r: .55, kind: 'temple-column' });
      if (i % 2 === 0) {
        const fallen = post(ashlar, cx + .4, .42, front - 2.5, .4, 3.7, g); fallen.rotation.x = Math.PI / 2; fallen.rotation.z = .3;
        fallen.userData.passable = true;
      }
    }
    for (let i = 0; i < 6; i++) { if (++buildWork % 32 === 0) yield;
      const beam = box(burned, -7 + i * 2.7, .28, -2 + i % 3, .3, .45, 6, g); beam.rotation.y = i * .57;
      beam.userData.passable = true;
    }
    metrics.buildings++; metrics.ruinedTemple = true;
  }

  /**
   * The Star Terrace: a gnomon, a half-ring of sighting stones round it toward the southern sky
   * over the lake, a stone table for the night's record, and the back wall with the Landward Gate
   * in it. The wall is the city's back, and the gate is where the road comes in.
   */
  {
    const G = STAR_TERRACE.gnomon, level = TERRACES[TERRACES.length - 1].level;
    const base = cityGroup(G.a, G.b, level, 'Star Terrace gnomon');
    box(coping, 0, .2, 0, 2.6, .4, 2.6, base); box(ashlar, 0, .55, 0, 1.7, .3, 1.7, base);
    mesh(new THREE.CylinderGeometry(.11, .36, 1, 4), gnomonStone, 0, .7 + G.height / 2, 0, 1, G.height, 1, base).rotation.y = Math.PI / 4;
    push({ x: G.x, z: G.z, r: 1.3, kind: 'star-gnomon' });
    for (const stone of STAR_TERRACE.stones) { if (++buildWork % 32 === 0) yield;
      const g = cityGroup(stone.a, stone.b, level, 'Star Terrace sighting stone');
      g.rotation.y = FACING_LAKE + Math.atan2(G.a - stone.a, -(G.b - stone.b));
      box(gnomonStone, 0, stone.height / 2, 0, .55, stone.height, .28, g);
      push({ x: stone.x, z: stone.z, r: .4, kind: 'sighting-stone' }); metrics.stones++;
    }
    const table = cityGroup(STAR_TERRACE.table.a, STAR_TERRACE.table.b, level, 'Star Terrace table');
    for (const side of [-1, 1]) { if (++buildWork % 32 === 0) yield; box(coping, side * .9, .38, 0, .35, .76, .7, table); }
    box(ashlarPale, 0, .82, 0, 2.6, .14, 1.1, table);
    push({ x: STAR_TERRACE.table.x, z: STAR_TERRACE.table.z, r: 1.2, kind: 'star-table' });
    // The back wall and the gate.
    const back = TERRACES[TERRACES.length - 1].to, half = halfWidth(back - 1.5);
    const gate = LANDWARD_GATE.a, opening = PASS_ROAD_HALF + .4;
    for (const [a0, a1] of [[-half, gate - opening], [gate + opening, half]]) { if (++buildWork % 32 === 0) yield;
      if (a1 - a0 < .6) continue;
      const g = cityGroup((a0 + a1) / 2, back, level, 'Imlamdris back wall');
      box(ashlar, 0, 1.2, 0, a1 - a0, 2.4, .8, g); box(coping, 0, 2.45, 0, a1 - a0 + .1, .14, .95, g);
      cityLine(a0, a1, back, .65, 'imlamdris-wall');
    }
    const arch = cityGroup(gate, back, level, 'The Landward Gate');
    for (const side of [-1, 1]) { if (++buildWork % 32 === 0) yield; box(ashlarWarm, side * (opening + .45), 2.1, 0, .9, 4.2, 1.2, arch); }
    box(ashlar, 0, 4.45, 0, opening * 2 + 1.9, .7, 1.3, arch);
    box(coping, 0, 4.88, 0, opening * 2 + 2.1, .16, 1.45, arch);
    metrics.buildings++;
  }

  // ---------------------------------------------------------------------------
  // The country's own scatter, batched two hexes at a time
  // ---------------------------------------------------------------------------
  const per = count => Math.round(count * WORLD_SCALE * WORLD_SCALE);
  /**
   * What grows depends on the hex's climate (the atlas's, `SOUTH_SUVAL_CLIMATE`) and how near the
   * lake it is. The ridge's Csc is stone and low scrub; the Csa hills and grass are the lore's
   * "pale limestone ridges, thin soil, scrub and aromatic plants", with olive and fig where the
   * ground is low and warm; the Cfb northern hills and the lake's margin are green.
   */
  const HABIT = Object.freeze({
    Csc: { rocks: 60, scrub: 34, tufts: 40, trees: 0 },
    Csa: { rocks: 24, scrub: 56, tufts: 70, trees: 7 },
    Cfb: { rocks: 10, scrub: 20, tufts: 120, trees: 3 },
  });
  const grassGeometry = (() => {
    const positions = [], normals = [];
    for (let blade = 0; blade < 5; blade++) {
      const a = blade * 1.7, bx = Math.cos(a) * .13, bz = Math.sin(a) * .13, w = .05, h = .17 + (blade % 3) * .07;
      const cx = Math.cos(a + Math.PI / 2) * w, cz = Math.sin(a + Math.PI / 2) * w;
      positions.push(bx - cx, 0, bz - cz, bx + cx, 0, bz + cz, bx + Math.cos(a) * .06, h, bz + Math.sin(a) * .06);
      for (let j = 0; j < 3; j++) normals.push(0, 1, 0);
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    return geometry;
  })();
  const reedGeometry = new THREE.CylinderGeometry(.018, .03, 1, 3);
  const trunkGeometry = new THREE.CylinderGeometry(.14, .3, 1, 6);
  const grassMaterial = material('#ffffff', { side: THREE.DoubleSide });
  const cushionMaterial = material('#ffffff', { flatShading: true });
  const rockMaterial = material('#ffffff', { flatShading: true });
  const barkMaterial = material('#6a5c49');
  const crownMaterial = material('#ffffff', { flatShading: true });
  const reedMaterial = material('#ffffff');

  const cells = [...REGION_CELLS['South Suval']].filter(cell => cell.terrain !== 'lake').sort((p, q) => p.r - q.r || p.q - q.q);
  const ours = (x, z) => hexOwnerAt(x, z) === 'South Suval';
  const clear = (x, z, margin) => southSuvalClear(x, z, margin) || suvalHighlandClear(x, z, margin) || suvalFalsePassClear(x, z, margin) || Math.hypot(x - IMLAMDRIS_REBUILD.centre.x, z - IMLAMDRIS_REBUILD.centre.z) < 31 + margin;
  for (let index = 0; index < cells.length; index += 2) { if (++buildWork % 32 === 0) yield;
    const block = cells.slice(index, index + 2);
    const rocks = [], scrub = [], tufts = [], trees = [];
    for (const cell of block) { if (++buildWork % 32 === 0) yield;
      const climate = SOUTH_SUVAL_CLIMATE[`${cell.q},${cell.r}`] ?? 'Csa', habit = HABIT[climate];
      const sample = () => ({ x: cell.x + range(-52, 52), z: cell.z + range(-58, 58) });
      for (let i = 0; i < per(habit.rocks); i++) { if (++buildWork % 32 === 0) yield;
        const { x, z } = sample();
        if (!ours(x, z) || landDistance(x, z) < .5 || clear(x, z, 1.5)) continue;
        const high = gy(x, z) > 34;
        rocks.push({ x, z, s: range(.4, high || climate === 'Csc' ? 2.7 : 1.4), rot: range(0, 6.28) });
      }
      for (let i = 0; i < per(habit.scrub); i++) { if (++buildWork % 32 === 0) yield;
        const { x, z } = sample();
        if (!ours(x, z) || landDistance(x, z) < 1 || clear(x, z, 1.2)) continue;
        scrub.push({ x, z, s: range(.5, 1.5), rot: range(0, 6.28), flower: random() < (climate === 'Csa' ? .4 : .18) });
      }
      for (let i = 0; i < per(habit.tufts); i++) { if (++buildWork % 32 === 0) yield;
        const { x, z } = sample();
        if (!ours(x, z) || landDistance(x, z) < 1 || clear(x, z, .6)) continue;
        // Green where the mist lies: the Cfb hexes and anything within forty metres of the lake.
        const green = climate === 'Cfb' || stillwaterDistance(x, z) < 40;
        tufts.push({ x, z, s: range(.6, 1.5), rot: range(0, 6.28), green });
      }
      const wanted = per(habit.trees);
      for (let i = 0, planted = 0; i < wanted * 6 && planted < wanted; i++) { if (++buildWork % 32 === 0) yield;
        const { x, z } = sample();
        if (!ours(x, z) || landDistance(x, z) < 14 || clear(x, z, 4)) continue;
        // Olive and fig "in the warmer microclimates": low, sheltered ground and not the ridge.
        if (gy(x, z) > 30 || trees.some(t => Math.hypot(t.x - x, t.z - z) < 10)) continue;
        const fig = random() < .22;
        trees.push({ x, z, s: range(.85, 1.25), h: fig ? range(3.2, 4.4) : range(3.8, 5.4), rot: range(0, 6.28), fig });
        planted++;
      }
    }
    if (rocks.length) {
      const batch = new THREE.InstancedMesh(round, rockMaterial, rocks.length);
      yield* forEachBuild(rocks, function* (rock, i) {
        dummy.position.set(rock.x, gy(rock.x, rock.z) + rock.s * .2, rock.z);
        dummy.rotation.set(range(-.22, .22), rock.rot, range(-.22, .22));
        dummy.scale.set(rock.s, rock.s * range(.4, .8), rock.s * range(.7, 1.4)); dummy.updateMatrix();
        batch.setMatrixAt(i, dummy.matrix);
        batch.setColorAt(i, color.setHSL(range(.1, .15), range(.06, .13), range(.6, .78)));   // pale limestone
        if (rock.s > 1.6) push({ x: rock.x, z: rock.z, r: rock.s * .6, kind: 'ridge-rock' });
      });
      batch.castShadow = true; batch.receiveShadow = true; batch.computeBoundingSphere(); group.add(batch);
      metrics.rocks += rocks.length; metrics.batches++;
    }
    if (scrub.length) {
      const batch = new THREE.InstancedMesh(round, cushionMaterial, scrub.length);
      yield* forEachBuild(scrub, function* (bush, i) {
        dummy.position.set(bush.x, gy(bush.x, bush.z) + bush.s * .13, bush.z);
        dummy.rotation.set(range(-.15, .15), bush.rot, range(-.15, .15));
        dummy.scale.set(bush.s * .62, bush.s * .32, bush.s * .58); dummy.updateMatrix();
        batch.setMatrixAt(i, dummy.matrix);
        // Thyme, lavender, rosemary and cistus: grey-green cushions, some of them in flower.
        batch.setColorAt(i, bush.flower ? color.setHSL(range(.72, .8), range(.16, .3), range(.46, .6))
          : color.setHSL(range(.16, .24), range(.1, .2), range(.36, .5)));
      });
      batch.castShadow = true; batch.receiveShadow = true; batch.computeBoundingSphere(); group.add(batch);
      metrics.scrub += scrub.length; metrics.batches++;
    }
    if (tufts.length) {
      const batch = new THREE.InstancedMesh(grassGeometry, grassMaterial, tufts.length);
      yield* forEachBuild(tufts, function* (tuft, i) {
        dummy.position.set(tuft.x, gy(tuft.x, tuft.z) + .02, tuft.z);
        dummy.rotation.set(0, tuft.rot, 0); dummy.scale.setScalar(tuft.s); dummy.updateMatrix();
        batch.setMatrixAt(i, dummy.matrix);
        batch.setColorAt(i, tuft.green ? color.setHSL(range(.22, .3), range(.24, .38), range(.34, .46))
          : color.setHSL(range(.11, .16), range(.18, .3), range(.5, .62)));
      });
      batch.receiveShadow = true; batch.computeBoundingSphere(); group.add(batch);
      metrics.tufts += tufts.length; metrics.batches++;
    }
    if (trees.length) {
      const trunks = new THREE.InstancedMesh(trunkGeometry, barkMaterial, trees.length);
      const crowns = new THREE.InstancedMesh(round, crownMaterial, trees.length * 3);
      let crown = 0;
      yield* forEachBuild(trees, function* (tree, i) {
        const y = gy(tree.x, tree.z), height = tree.h * tree.s;
        dummy.position.set(tree.x, y + height * .3, tree.z);
        dummy.rotation.set(.08, tree.rot, .06);
        dummy.scale.set(tree.s * (tree.fig ? 1.1 : 1), height * .6, tree.s * (tree.fig ? 1.1 : 1)); dummy.updateMatrix();
        trunks.setMatrixAt(i, dummy.matrix);
        // An olive is a loose grey-silver crown in lumps; a fig is one broad dark dome.
        const firstCrown = crown;
        const lumps = tree.fig ? 1 : 3;
        for (let c = 0; c < lumps; c++) { if (++buildWork % 32 === 0) yield;
          const off = tree.fig ? 0 : (c - 1) * .7;
          dummy.position.set(tree.x + off * tree.s, y + height * (tree.fig ? .78 : .74 + (c % 2) * .1), tree.z - off * .5 * tree.s);
          dummy.rotation.set(.1, tree.rot + c, .08);
          dummy.scale.set(height * (tree.fig ? .46 : .3), height * (tree.fig ? .3 : .2), height * (tree.fig ? .44 : .28)); dummy.updateMatrix();
          crowns.setMatrixAt(crown, dummy.matrix);
          crowns.setColorAt(crown++, tree.fig ? color.setHSL(range(.24, .3), range(.3, .42), range(.24, .32))
            : color.setHSL(range(.19, .24), range(.08, .16), range(.44, .54)));
        }
        const collider = push({ x: tree.x, z: tree.z, r: .4 * tree.s, kind: 'region-tree' });
        registerWorldTree(colliders, { id: worldTreeId('south-suval', tree.x, tree.z), x: tree.x, z: tree.z, y, species: tree.fig ? 'fig' : 'olive', radius: collider.r },
          [{ mesh: trunks, index: i }, ...Array.from({ length: crown - firstCrown }, (_, c) => ({ mesh: crowns, index: firstCrown + c }))], collider);
      });
      crowns.count = crown;
      for (const batch of [trunks, crowns]) { if (++buildWork % 32 === 0) yield; batch.castShadow = true; batch.receiveShadow = true; batch.computeBoundingSphere(); group.add(batch); metrics.batches++; }
      metrics.trees += trees.length;
    }
  }

  /**
   * Reed on the lake's open shore - everywhere round the Stillwater except in front of the city,
   * where the Lake Walk comes down to the water in stone. A lake that has not run dry in living
   * memory has a reed margin; the lore does not name it, and it is here because the water is.
   */
  {
    const reeds = [];
    for (let i = 0; i < 900 && reeds.length < 420; i++) { if (++buildWork % 32 === 0) yield;
      const t = random() * Math.PI * 2, c = STILLWATER.centre;
      const x = c.x + Math.cos(t) * range(30, 60), z = c.z + Math.sin(t) * range(30, 60);
      const d = stillwaterDistance(x, z);
      if (d < -2.5 || d > 1.2) continue;
      const { a, b } = cityLocal(x, z);
      if (b > -12 && hexInset(a, b) > 0) continue;   // not along the city's lake front
      reeds.push({ x, z, h: range(1.1, 2.1), lean: range(-.14, .14), rot: range(0, 6.28) });
    }
    if (reeds.length) {
      const batch = new THREE.InstancedMesh(reedGeometry, reedMaterial, reeds.length * 3);
      let k = 0;
      for (const reed of reeds) { if (++buildWork % 32 === 0) yield; for (let s = 0; s < 3; s++) { if (++buildWork % 32 === 0) yield;
        const x = reed.x + range(-.35, .35), z = reed.z + range(-.35, .35);
        const y = Math.max(gy(x, z), STILLWATER_SURFACE - .6);
        dummy.position.set(x, y + reed.h / 2, z); dummy.rotation.set(reed.lean, reed.rot, reed.lean * .6);
        dummy.scale.set(1, reed.h * range(.8, 1.1), 1); dummy.updateMatrix();
        batch.setMatrixAt(k, dummy.matrix);
        batch.setColorAt(k++, color.setHSL(range(.16, .22), range(.3, .44), range(.36, .5)));
      } }
      batch.receiveShadow = true; batch.computeBoundingSphere(); group.add(batch);
      metrics.reeds += reeds.length; metrics.batches++;
    }
  }

  /**
   * The lake country's vines, on the slopes east of the water that face the morning sun - the
   * wine catalogue's "Imlamdris Eastern Slopes: eastern lakeside slopes ... facing the morning
   * sun" (svaleen_wines.md). Rows of low bushes on stakes across the hill hex south-east of the
   * lake, stepped with dry-stone terrace walls, and seen from the city across the water.
   */
  {
    const hill = REGION_CELLS['South Suval'].find(cell => cell.q === 7 && cell.r === 120);
    const vines = [], stakes = [];
    const rowYaw = FACING_LAKE + Math.PI / 2, rx = Math.sin(rowYaw), rz = Math.cos(rowYaw);
    for (let row = -5; row <= 5; row++) { if (++buildWork % 32 === 0) yield;
      const ox = hill.x + CITY_UP.x * row * 3.6 + 8, oz = hill.z + CITY_UP.z * row * 3.6 - 6;
      for (let s = -20; s <= 20; s += 1.6) { if (++buildWork % 32 === 0) yield;
        const x = ox + rx * s, z = oz + rz * s;
        if (!ours(x, z) || clear(x, z, 1) || landDistance(x, z) < 8 || gy(x, z) < STILLWATER_SURFACE + 1.5) continue;
        vines.push({ x, z, s: range(.8, 1.1) });
        if (Math.round(s / 1.6) % 4 === 0) stakes.push({ x, z });
      }
    }
    if (vines.length) {
      const batch = new THREE.InstancedMesh(round, cushionMaterial, vines.length);
      yield* forEachBuild(vines, function* (vine, i) {
        dummy.position.set(vine.x, gy(vine.x, vine.z) + .55 * vine.s, vine.z);
        dummy.rotation.set(0, rowYaw, 0); dummy.scale.set(.75 * vine.s, .5 * vine.s, .42 * vine.s); dummy.updateMatrix();
        batch.setMatrixAt(i, dummy.matrix);
        batch.setColorAt(i, color.setHSL(range(.2, .27), range(.34, .46), range(.3, .4)));
      });
      batch.castShadow = true; batch.receiveShadow = true; batch.computeBoundingSphere(); group.add(batch);
      metrics.vines += vines.length; metrics.batches++;
      for (const stake of stakes) { if (++buildWork % 32 === 0) yield; post(material('#6e5a44'), stake.x, gy(stake.x, stake.z) + .6, stake.z, .04, 1.2, group); }
    }
  }

  /**
   * The cliffs' fallen stone: pale limestone boulders, half in the water at the foot of every face,
   * so the coast "with fewer accessible beaches and more cliff faces" has the rubble a real one
   * drops, and reads as rock from the water and from the top.
   */
  {
    const boulders = [];
    for (let i = 0; i < 9000 && boulders.length < 520; i++) { if (++buildWork % 32 === 0) yield;
      const x = range(-330, 230), z = range(900, 1420);
      if (!onCliffFoot(x, z)) continue;
      const d = landDistance(x, z);
      if (boulders.some(b => Math.hypot(b.x - x, b.z - z) < 1.8)) continue;
      boulders.push({ x, z, s: d > -1 ? range(1.4, 3) : range(.9, 2.2), rot: range(0, 6.28) });
    }
    if (boulders.length) {
      const batch = new THREE.InstancedMesh(round, rockMaterial, boulders.length);
      yield* forEachBuild(boulders, function* (rock, i) {
        dummy.position.set(rock.x, gy(rock.x, rock.z) - rock.s * .25, rock.z);
        dummy.rotation.set(range(-.4, .4), rock.rot, range(-.4, .4));
        dummy.scale.set(rock.s, rock.s * range(.7, 1.3), rock.s * range(.8, 1.3)); dummy.updateMatrix();
        batch.setMatrixAt(i, dummy.matrix);
        batch.setColorAt(i, color.setHSL(range(.1, .14), range(.05, .12), range(.58, .74)));
      });
      batch.castShadow = true; batch.receiveShadow = true; batch.computeBoundingSphere(); group.add(batch);
      metrics.rocks += boulders.length; metrics.batches++; metrics.cliffRocks = boulders.length;
    }
  }

  return { group, metrics, water: waterMaterial, mist };
}

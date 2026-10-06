import { finishBuild } from '../../../world/loading/build-steps.js';
import * as THREE from 'three';
import { registerWorldTree, worldTreeId } from '../../../world/scenery/tree-registry.js';
import { BAT_CAVE, SUVAL_HIGHLAND_TRAILS, SUVAL_PASSAGE_ROCKS, SUVAL_PEAK_CRAGS, IMLAMDRIS_REBUILD, NANVIR_SCARS } from './suval-highlands.js';
import { createSuvalHighlandGroundSteps } from './suval-highland-ground.js';

/** Peak barriers are the mountain's exposed bedrock, not rings of detached props.
 * The skin follows the same height field and fades into its existing ground colour. */
function* addHighlandOutcropsSteps(group, rocks, groundHeight, material) {
  let buildWork = 0;
  const passageRocks = rocks.filter(rock => rock.kind !== 'suval-peak-face');
  const hash = value => { const n = Math.sin(value * 12.9898 + 78.233) * 43758.5453; return n - Math.floor(n); };
  // Individual passage obstacles remain low broken boulders beside the walking strip.
  // Their eight-sided tops have no pointed crown and no repeated terraced shelf pattern.
  const positions = [], colours = [], tint = new THREE.Color('#858478');
  const triangle = (a, b, c, shade) => {
    for (const p of [a, b, c]) { positions.push(p.x, p.y, p.z); colours.push(tint.r * shade, tint.g * shade, tint.b * shade); }
  };
  for (const rock of passageRocks) { if ((++buildWork & 31) === 0) yield;
    const seed = rock.seed ?? rock.x * .731 + rock.z * 1.319, count = 8, top = [], bottom = [];
    const y = groundHeight(rock.x, rock.z), relief = Math.min(rock.height, rock.radius * .66);
    for (let i = 0; i < count; i++) { if ((++buildWork & 31) === 0) yield;
      const angle = (rock.yaw ?? 0) + i * Math.PI * 2 / count;
      const radius = rock.radius * (.85 + hash(seed + i * 7) * .14);
      const x = rock.x + Math.cos(angle) * radius, z = rock.z + Math.sin(angle) * radius;
      const ground = groundHeight(x, z), height = Math.min(y + relief * (.8 + hash(seed + i) * .2), ground + relief);
      top.push({ x, y: height, z }); bottom.push({ x, y: Math.min(ground - .8, height - .5), z });
    }
    for (let i = 0; i < count; i++) { if ((++buildWork & 31) === 0) yield;
      const j = (i + 1) % count, shade = .83 + hash(seed + i * 11) * .1;
      triangle(bottom[i], top[i], bottom[j], shade); triangle(bottom[j], top[i], top[j], shade);
    }
    // Triangulate the broken polygon directly instead of raising an artificial central point.
    for (let i = 1; i < count - 1; i++) { if ((++buildWork & 31) === 0) yield; triangle(top[0], top[i + 1], top[i], 1 + hash(seed + i * 13) * .07); }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colours, 3)); geometry.computeVertexNormals();
  const boulders = new THREE.Mesh(geometry, material('#ffffff', { vertexColors: true, flatShading: true }));
  boulders.name = 'Suval fractured passage boulders'; boulders.castShadow = true; boulders.receiveShadow = true;
  boulders.userData.outcropCount = passageRocks.length; group.add(boulders);
}

/** Sparse, readable landmarks on the actual shaped terrain. No new residents are invented. */
export function createSuvalHighlandScenery(...args) { return finishBuild(createSuvalHighlandScenerySteps(...args)); }
export function* createSuvalHighlandScenerySteps({ root, material, mesh, box, post, round, groundHeight, colliders, roofGeometry, wornPatch, fineGround }) {
  let buildWork = 0;
  const group = new THREE.Group(); group.name = 'Suvali highlands and recovery'; root.add(group);
  const stone = material('#848177'), pale = material('#aaa08c'), char = material('#383732');
  const wood = material('#947653'), board = material('#b59870'), slate = material('#605956');
  const metrics = { passageRocks: 0, cave: 1, woodenHomes: 0, buildingFrames: 0, scars: NANVIR_SCARS.length, trailMetres: 0 };
  // Standalone builders retain the same ground; the world supplies its shared job.
  if (!fineGround) yield* createSuvalHighlandGroundSteps({ root, group, material, groundHeight });
  const outcrops = [...SUVAL_PASSAGE_ROCKS, ...SUVAL_PEAK_CRAGS];
  yield* addHighlandOutcropsSteps(group, outcrops, groundHeight, material);
  for (const rock of outcrops) { if ((++buildWork & 31) === 0) yield;
    colliders.push({ x: rock.x, z: rock.z, r: rock.radius, kind: rock.kind }); metrics.passageRocks++;
  }

  // The cave is a usable sheltered chamber behind an irregular limestone arch. The roof is
  // above the player, and its low side/back walls alone supply collision. It is not a painted hole.
  const cave = new THREE.Group(); cave.name = 'Hollow Ridge cave'; cave.position.set(BAT_CAVE.perch.x, BAT_CAVE.floor, 1080); group.add(cave);
  const wall = (x, z, sx, sy, sz) => {
    const m = mesh(round, stone, x, sy * .42, z, sx, sy, sz, cave);
    m.rotation.y = x * .27 + z * .13;
    colliders.push({ x: cave.position.x + x, z: cave.position.z + z, r: Math.min(sx, sz) * .8, kind: 'bat-cave-wall' });
  };
  for (const side of [-1, 1]) { if ((++buildWork & 31) === 0) yield; for (let z = -7; z <= 4; z += 3.1) { if ((++buildWork & 31) === 0) yield; wall(side * 5.5, z, 2.2, 5.8 + ((z + 7) % 3), 2.3); } }
  for (let x = -4; x <= 4; x += 2) { if ((++buildWork & 31) === 0) yield; wall(x, -8, 2.2, 6, 2.1); }
  const roof = mesh(round, stone, 0, 7.5, -1, 8, 3.5, 10, cave); roof.userData.passable = true;
  mesh(round, pale, -4.6, 5.5, 4.7, 2.3, 2.8, 3.1, cave).userData.passable = true;
  mesh(round, stone, 4.9, 5.9, 4.7, 2.3, 2.8, 3.1, cave).userData.passable = true;
  // Worn stone, a bedroll and a rescued child's ribbon suggest somebody kind lives here.
  wornPatch(BAT_CAVE.perch.x, BAT_CAVE.perch.z + 1, 3.7, '#625f56', .72, group);
  const bed = box(material('#514f64'), 2.5, .16, -4, 1.2, .24, 2.3, cave); bed.userData.passable = true;
  box(material('#bbaa76'), 2.5, .31, -4.8, 1.1, .2, .42, cave).userData.passable = true;
  box(material('#858aad'), -3, 1.3, -5.7, .08, .4, .025, cave).rotation.z = .28;

  // Hand-drawn road strips sampled each metre follow the same piecewise linear grades used
  // for walking. They are not splines which can cut over the sides of a hairpin.
  for (const trail of SUVAL_HIGHLAND_TRAILS) { if ((++buildWork & 31) === 0) yield;
    const positions = [], indices = [];
    for (let i = 1; i < trail.points.length; i++) { if ((++buildWork & 31) === 0) yield;
      const a = trail.points[i - 1], b = trail.points[i], dx = b.x - a.x, dz = b.z - a.z, length = Math.hypot(dx, dz);
      metrics.trailMetres += length;
      const steps = Math.ceil(length), start = positions.length / 3;
      for (let k = 0; k <= steps; k++) { if ((++buildWork & 31) === 0) yield; for (const side of [-1, 1]) { if ((++buildWork & 31) === 0) yield;
        const t = k / steps, x = a.x + dx * t - dz / length * side * trail.width / 2, z = a.z + dz * t + dx / length * side * trail.width / 2;
        positions.push(x, groundHeight(x, z) + .075, z);
      } }
      for (let k = 0; k < steps; k++) { if ((++buildWork & 31) === 0) yield;  const n = start + k * 2; indices.push(n, n + 2, n + 1, n + 1, n + 2, n + 3); }
    }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3)); geo.setIndex(indices); geo.computeVertexNormals();
    const strip = new THREE.Mesh(geo, material('#a69c83', { side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }));
    strip.name = trail.id; strip.receiveShadow = true; group.add(strip);
  }
  // A handful of timber homes occupies the open strip west of the razed city. Everything
  // faces a shared dirt court; unfinished framing and salvaged masonry show the rebuilding.
  for (const home of IMLAMDRIS_REBUILD.huts) { if ((++buildWork & 31) === 0) yield;
    const g = new THREE.Group(); g.position.set(home.x, groundHeight(home.x, home.z), home.z); g.name = `Imlamdris ${home.id}`; group.add(g);
    const { width: w, depth: d, height: h } = home;
    box(pale, 0, .12, 0, w + .3, .25, d + .3, g);
    for (const x of [-w / 2, w / 2]) { if ((++buildWork & 31) === 0) yield; for (const z of [-d / 2, d / 2]) { if ((++buildWork & 31) === 0) yield; post(wood, x, h / 2, z, .16, h, g); } }
    if (home.unfinished) {
      box(wood, 0, h, -d / 2, w, .25, .25, g); box(wood, 0, h, d / 2, w, .25, .25, g);
      metrics.buildingFrames++;
    } else {
      box(board, 0, h / 2, 0, w, h, d, g);
      mesh(roofGeometry(d + .65, w + .65, 1.25), slate, 0, h, 0, 1, 1, 1, g).rotation.y = Math.PI / 2;
      box(char, 0, 1.05, d / 2 + .03, 1.05, 2.1, .07, g);
      for (const x of [-w * .32, w * .32]) { if ((++buildWork & 31) === 0) yield; box(material('#c8b66d'), x, 1.65, d / 2 + .05, .8, .8, .07, g); }
      metrics.woodenHomes++;
    }
    colliders.push({ x: home.x, z: home.z, r: Math.hypot(w, d) / 2, kind: 'imlamdris-rebuild' });
    wornPatch(home.x, home.z + d / 2 + 2, 3, '#a59677', .55, group);
  }
  for (const scar of NANVIR_SCARS) { if ((++buildWork & 31) === 0) yield;
    wornPatch(scar.x, scar.z, scar.radius, '#514846', .8, group);
    for (let i = 0; i < 9; i++) { if ((++buildWork & 31) === 0) yield;
      const angle = i * 2.39996, r = 3 + (i % 4) * 3, x = scar.x + Math.cos(angle) * r, z = scar.z + Math.sin(angle) * r;
      const y = groundHeight(x, z), h = 2.3 + i % 3;
      post(char, x, y + h / 2, z, .2, h, group).rotation.z = .12 * (i % 3 - 1);
      const limb = box(char, x + .45, y + h * .7, z, 1.5, .13, .13, group); limb.rotation.z = .4;
      const collider = { x, z, r: .26, kind: 'burned-tree' }; colliders.push(collider);
      registerWorldTree(colliders, { id: worldTreeId('burned-holm-oak', x, z), x, z, y, species: 'holm-oak', radius: .26, harvestable: false,
        reason: 'This burned holm oak has no sound timber left.' }, [], collider);
    }
    const altar = mesh(round, material('#645049'), scar.x, groundHeight(scar.x, scar.z) + .5, scar.z, 1.8, .75, 1.8, group);
    altar.name = 'Abandoned Nanvir offering stone'; colliders.push({ x: scar.x, z: scar.z, r: 1.5, kind: 'nanvir-ruin' });
  }
  return { group, metrics, paths: SUVAL_HIGHLAND_TRAILS.map(trail => Object.assign(trail.points.map(({ x, z }) => ({ x, z })), { kind: 'trail', width: trail.width })) };
}

import { finishBuild } from './build-steps.js';
import * as THREE from 'three';
import { registerWorldTree, worldTreeId } from './tree-registry.js';
import { treeGroundingOffset } from './tree-grounding.js';
import { createWestLotharnGroundSteps } from './west-lotharn-ground.js';
import { hexOwnerAt, REGION_CELLS } from './region-world.js';
import { WORLD_SCALE } from './world-scale.js';
import {
  WEST_LOTHARN, TREE_LINE, LONG_VALLEY, NORTH_VALLEY,
  onBald, onRamp, westLotharnOpen, nearestOn,
} from './west-lotharn-world.js';
import { WEST_LOTHARN_WATERS, KEMRATH_REACH, inWestWater } from './west-regions.js';
import { WEST_PROFILES, westWaterSurface } from './west-ground.js';
import { nearestPlain } from './east-lotharn-caves.js';

/**
 * What the West Lotharn looks like where the ground alone is not enough (the ground is
 * `west-lotharn-world.js` and `west-ground.js`): the massifs' own close-drawn ground, the courses of
 * cliff and the balds on top of them, the caves' rock, the four becks, and the old forest that
 * covers everything up to the tree line.
 *
 * The forest is the lore's and the same seven trees the East Lotharn has, because it is the same
 * forest: "primarily deciduous - oak, chestnut, maple, hickory, walnut, beech, tulip poplar",
 * "individual trees in the Lotharn are centuries old". What is different here is **where it stops**.
 * The East's wood thins toward its four-hundred-metre top; this range is half as tall again, so the
 * wood thins from two hundred and fifty metres and gives out at three hundred and forty-five
 * (`TREE_LINE`), which is the lore's "within a few hundred meters of their highest summits" and
 * leaves five courses of bare stone under the crest's bald. Summer green: the autumn the lore makes
 * so much of is a season the world does not have yet.
 *
 * **Nobody is in any of it, and nothing in it is anybody's** - no field, no wall, no track, no
 * building, no sign.
 */
export function createWestLotharnScenery(...args) { return finishBuild(createWestLotharnScenerySteps(...args)); }
export function* createWestLotharnScenerySteps(kit) {
  let buildWork = 0;
  const { root, material, groundHeight, colliders, dummy, color, round } = kit;
  const group = new THREE.Group(); group.name = 'West Lotharn scenery'; root.add(group);
  let seed = 7712093;
  const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  const range = (a, b) => a + random() * (b - a);
  const gy = (x, z) => groundHeight(x, z);
  const legacyGy = kit.legacyGroundHeight ?? gy;
  // The heightfield and its drawn triangles diverge at a cliff lip. Roots sit on
  // the triangles, never on the invisible analytic shelf above a rendered face.
  let surfaceHeight = kit.renderedGroundHeight ?? gy;
  const push = collider => { colliders.push(collider); return collider; };
  const metrics = { water: 0, trees: 0, tufts: 0, rocks: 0, batches: 0 };
  const own = (x, z) => hexOwnerAt(x, z) === WEST_LOTHARN;

  // -------------------------------------------------------------------------
  // The water
  // -------------------------------------------------------------------------
  /** Mountain water, greyer and greener than the plain's; quicker and broken where it falls fast. */
  const vertexShader = `#include <fog_pars_vertex>
varying vec3 p; void main(){p=position;vec4 mvPosition=modelViewMatrix*vec4(position,1.);gl_Position=projectionMatrix*mvPosition;
#include <fog_vertex>
}`;
  const shader = body => `#include <fog_pars_fragment>
uniform float time; varying vec3 p; void main(){${body}
#include <fog_fragment>
}`;
  const uniforms = () => THREE.UniformsUtils.merge([THREE.UniformsLib.fog, { time: { value: 0 } }]);
  const waterMaterial = new THREE.ShaderMaterial({ uniforms: uniforms(), fog: true, side: THREE.DoubleSide, vertexShader,
    fragmentShader: shader('float w=sin(p.x*.42-time*1.6+p.z*1.1)*sin(p.x*.17+p.z*1.3);vec3 c=vec3(.20,.33,.33)+vec3(.13,.16,.15)*pow(max(w,0.),8.);gl_FragColor=vec4(c,1.);') });
  const quickMaterial = new THREE.ShaderMaterial({ uniforms: uniforms(), fog: true, side: THREE.DoubleSide, vertexShader,
    fragmentShader: shader('float w=sin(p.x*1.1-time*3.4+p.z*1.7)*sin(p.x*.6+p.z*2.2-time*2.6);float f=smoothstep(.25,.8,w);vec3 c=mix(vec3(.22,.35,.36),vec3(.78,.83,.82),clamp(f,0.,1.));gl_FragColor=vec4(c,1.);') });

  /** A ribbon of water over a course's samples, broken wherever the ground rises through it. */
  function ribbon(course, mat) {
    let run = [];
    const flush = () => {
      if (run.length < 2) { run = []; return; }
      const vertices = [], indices = [];
      run.forEach((sample, index) => {
        vertices.push(sample.x - sample.nx * sample.half, sample.y, sample.z - sample.nz * sample.half,
          sample.x + sample.nx * sample.half, sample.y, sample.z + sample.nz * sample.half);
        if (index) { const v = index * 2; indices.push(v - 2, v, v - 1, v - 1, v, v + 1); }
      });
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
      geometry.setIndex(indices); geometry.computeVertexNormals(); geometry.computeBoundingSphere();
      const sheet = new THREE.Mesh(geometry, mat); sheet.name = course.name; group.add(sheet); metrics.water++;
      run = [];
    };
    for (const sample of WEST_PROFILES.get(course.id) ?? []) {
      const y = westWaterSurface(sample.x, sample.z);
      if (y === null) { flush(); continue; }
      run.push({ ...sample, y });
    }
    flush();
  }
  // The Kemrath reach falls one in eight down the notch, so it is drawn quick; the three becks that
  // leave the two valleys' floors are slow water on flat ground.
  for (const course of WEST_LOTHARN_WATERS) { if ((++buildWork & 31) === 0) yield; ribbon(course, course === KEMRATH_REACH ? quickMaterial : waterMaterial); }

  const fineGround=kit.fineGround ?? (yield* createWestLotharnGroundSteps({...kit,group}));
  metrics.batches+=fineGround.metrics.batches;
  if(fineGround.metrics.riverGround)metrics.riverGround=fineGround.metrics.riverGround;
  const candidateSurfaceHeight=fineGround.candidateSurfaceHeight;
  surfaceHeight=fineGround.heightAt;
  const riverGround=fineGround.riverGround;

  // -------------------------------------------------------------------------
  // The caves
  // -------------------------------------------------------------------------
  /**
   * Each cave's rock, seen from inside: a flat floor of trodden grit, walls, and a roof that arches
   * over, bent along the passage and opening out into a room at a chamber's end, which is walled
   * off. At every opening, an arch of heavy stones where the passage meets the cliff. The dark
   * inside is main.js's.
   */
  {
    const caves = kit.caves ?? [];
    const wall = [new THREE.Color('#6f675c'), new THREE.Color('#62605a'), new THREE.Color('#77695a')], grit = new THREE.Color('#57493b'), tone = new THREE.Color();
    const caveMaterial = material('#ffffff', { vertexColors: true, flatShading: true, side: THREE.DoubleSide }), archMaterial = material('#ffffff');
    const ring = [[-1, 0], [1, 0], [1, .42], [.9, .7], [.62, .9], [0, 1], [-.62, .9], [-.9, .7], [-1, .42]];
    for (const cave of caves) { if ((++buildWork & 31) === 0) yield;
      const [inAt, outAt] = cave.portals, end = cave.kind === 'chamber';
      const from = Math.max(0, inAt - 1.4), to = end ? cave.length : Math.min(cave.length, outAt + 1.4);
      const samples = [];
      for (let s = from; s < to; s += 1.2) { if ((++buildWork & 31) === 0) yield; samples.push(s); }
      samples.push(to);
      const positions = [], colours = [], indices = [];
      for (const [k, s] of samples.entries()) { if ((++buildWork & 31) === 0) yield;
        const p = cave.at(s), w = cave.half(s), h = cave.height(s), y = cave.floor(s);
        for (const [r, [a, b]] of ring.entries()) { if ((++buildWork & 31) === 0) yield;
          const bump = r > 1 ? Math.sin(s * 1.7 + r * 2.3) * .12 : 0;
          positions.push(p.x + p.nx * a * (w + bump), y + b * h + (r > 1 ? bump : 0), p.z + p.nz * a * (w + bump));
          tone.copy(r < 2 ? grit : wall[(k + r) % 3]).multiplyScalar(.9 + ((k * 7 + r * 3) % 5) * .04);
          colours.push(tone.r, tone.g, tone.b);
        }
        if (k === 0) continue;
        const a = (k - 1) * ring.length, b = k * ring.length;
        for (let r = 0; r < ring.length; r++) { if ((++buildWork & 31) === 0) yield;
          const r2 = (r + 1) % ring.length;
          if (r === 0) { indices.push(a, b + 1, a + 1, a, b, b + 1); continue; }
          indices.push(a + r, b + r, a + r2, a + r2, b + r, b + r2);
        }
      }
      if (end) {
        const last = (samples.length - 1) * ring.length;
        for (let r = 1; r < ring.length - 1; r++) { if ((++buildWork & 31) === 0) yield; indices.push(last, last + r, last + r + 1); }
      }
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      geometry.setAttribute('color', new THREE.Float32BufferAttribute(colours, 3));
      geometry.setIndex(indices); geometry.computeVertexNormals(); geometry.computeBoundingSphere();
      const rock = new THREE.Mesh(geometry, caveMaterial);
      rock.name = `Cave: ${cave.name}`; rock.receiveShadow = true; rock.castShadow = true; group.add(rock);
      metrics.batches++;
      const mouths = end ? [inAt] : [inAt, outAt];
      for (const at of mouths) { if ((++buildWork & 31) === 0) yield;
        const outward = at === inAt ? -1 : 1, s0 = at + outward * 1.3, s1 = at - outward * 3;
        const frame = [], frameColours = [], frameIndex = [], w = cave.half(at), h = cave.height(at), y = cave.floor(at);
        for (const s of [s0, s1]) { if ((++buildWork & 31) === 0) yield;
          const p = cave.at(Math.max(0, Math.min(cave.length, s)));
          for (const [grow, up] of [[0, 0], [2.2, 3.4]]) { if ((++buildWork & 31) === 0) yield; for (const [buildIndex, [a, b]] of ring.entries()) { if ((++buildWork & 31) === 0) yield;
            frame.push(p.x + p.nx * a * (w + grow), y + b * (h + up) - (b === 0 ? .5 : 0), p.z + p.nz * a * (w + grow));
            tone.copy(wall[frame.length % 3]); frameColours.push(tone.r, tone.g, tone.b);
          } }
        }
        const n = ring.length, inner = (k, r) => k * 2 * n + r, outer = (k, r) => k * 2 * n + n + r;
        for (let r = 1; r < n; r++) { if ((++buildWork & 31) === 0) yield;
          const r2 = (r + 1) % n;
          frameIndex.push(inner(0, r), outer(0, r), inner(0, r2), inner(0, r2), outer(0, r), outer(0, r2));
          frameIndex.push(outer(0, r), outer(1, r), outer(0, r2), outer(0, r2), outer(1, r), outer(1, r2));
        }
        const shape = new THREE.BufferGeometry();
        shape.setAttribute('position', new THREE.Float32BufferAttribute(frame, 3));
        shape.setAttribute('color', new THREE.Float32BufferAttribute(frameColours, 3));
        shape.setIndex(frameIndex); shape.computeVertexNormals(); shape.computeBoundingSphere();
        const collar = new THREE.Mesh(shape, caveMaterial);
        collar.name = `Cave mouth: ${cave.name}`; collar.castShadow = true; collar.receiveShadow = true; group.add(collar);
        metrics.batches++;
      }
      for (const at of mouths) { if ((++buildWork & 31) === 0) yield;
        const p = cave.at(at), w = cave.half(at), h = cave.height(at), y = cave.floor(at);
        const stones = new THREE.InstancedMesh(round, archMaterial, 11);
        for (let i = 0; i < 11; i++) { if ((++buildWork & 31) === 0) yield;
          const t = i / 10, a = Math.cos(Math.PI * t) * (w + .55), b = Math.sin(Math.PI * t) * (h + .35) * .98;
          dummy.position.set(p.x + p.nx * a, y + Math.max(.2, b), p.z + p.nz * a);
          dummy.rotation.set(range(-.3, .3), range(0, 6.28), range(-.3, .3));
          dummy.scale.set(range(.75, 1.1), range(.6, .9), range(.8, 1.2)); dummy.updateMatrix();
          stones.setMatrixAt(i, dummy.matrix); stones.setColorAt(i, color.setHSL(range(.07, .1), range(.06, .12), range(.36, .46)));
        }
        stones.castShadow = true; stones.receiveShadow = true; stones.computeBoundingSphere(); group.add(stones);
        metrics.batches++;
      }
    }
  }

  // -------------------------------------------------------------------------
  // The forest
  // -------------------------------------------------------------------------
  /** The lore's seven trees, told apart by crown and colour, as the East Lotharn draws them. */
  const KINDS = Object.freeze([
    { id: 'oak', tint: '#3f5e31', h: [13, 18], wide: true, weight: 5 },
    { id: 'chestnut', tint: '#58773a', h: [12, 16], wide: true, weight: 4 },
    { id: 'maple', tint: '#4c7438', h: [11, 15], wide: false, weight: 3 },
    { id: 'beech', tint: '#66893f', h: [12, 17], wide: false, weight: 3 },
    { id: 'hickory', tint: '#46673a', h: [14, 19], tall: true, weight: 2 },
    { id: 'walnut', tint: '#51703c', h: [12, 15], wide: true, weight: 2 },
    { id: 'tulip-poplar', tint: '#6d9447', h: [16, 22], tall: true, weight: 2 },
  ]);
  const kindWeights = KINDS.reduce((sum, kind) => sum + kind.weight, 0);
  const chooseKind = () => { let r = random() * kindWeights; for (const kind of KINDS) { r -= kind.weight; if (r <= 0) return kind; } return KINDS[0]; };
  const trunkGeometry = new THREE.CylinderGeometry(.2, .36, 1, 6);
  const crownGeometry = new THREE.IcosahedronGeometry(1, 0);
  const barkMaterial = material('#5f4c38'), leafMaterial = material('#ffffff', { flatShading: true });
  const tuftGeometry = (() => {
    const positions = [], normals = [];
    for (let blade = 0; blade < 4; blade++) {
      const a = blade * 1.9, bx = Math.cos(a) * .15, bz = Math.sin(a) * .15, w = .05, h = .24 + (blade % 3) * .09;
      const cx = Math.cos(a + Math.PI / 2) * w, cz = Math.sin(a + Math.PI / 2) * w;
      positions.push(bx - cx, 0, bz - cz, bx + cx, 0, bz + cz, bx + Math.cos(a) * .08, h, bz + Math.sin(a) * .08);
      for (let j = 0; j < 3; j++) normals.push(0, 1, 0);
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    return geometry;
  })();
  const tuftMaterial = material('#ffffff', { side: THREE.DoubleSide });
  const stoneMaterial = material('#8e8c80');

  function* woodBatchSteps(trees) {
    let buildWork = 0;
    if (!trees.length) return;
    const trunks = new THREE.InstancedMesh(trunkGeometry, barkMaterial, trees.length);
    const crowns = new THREE.InstancedMesh(crownGeometry, leafMaterial, trees.length * 3);
    let crownIndex = 0;
    for (const [index, tree] of trees.entries()) { if ((++buildWork & 31) === 0) yield;
      let y = surfaceHeight(tree.x, tree.z);
      const height = tree.h, kind = tree.kind;
      dummy.position.set(tree.x, y + height * .36, tree.z); dummy.rotation.set(0, tree.rot, 0);
      dummy.scale.set(tree.s, height * .74, tree.s); dummy.updateMatrix();
      const grounding = treeGroundingOffset(dummy.matrix, surfaceHeight, { radius: .36, segments: 6 });
      dummy.position.y += grounding; dummy.updateMatrix();
      y = dummy.position.y - height * .37;
      trunks.setMatrixAt(index, dummy.matrix);
      const parts = [{ mesh: trunks, index }];
      const collider = push({ x: tree.x, z: tree.z, r: .5 * tree.s, kind: 'west-lotharn-tree' });
      for (let lobe = 0; lobe < 3; lobe++) { if ((++buildWork & 31) === 0) yield;
        const a = tree.rot + lobe * 2.1;
        if (kind.tall) {
          dummy.position.set(tree.x + Math.sin(a) * height * .04, y + height * (.55 + lobe * .16), tree.z + Math.cos(a) * height * .04);
          const r = height * (.2 - lobe * .035);
          dummy.scale.set(r, height * .17, r);
        } else {
          const spread = lobe === 2 ? 0 : height * (kind.wide ? .18 : .12);
          dummy.position.set(tree.x + Math.sin(a) * spread, y + height * (lobe === 2 ? .9 : .72), tree.z + Math.cos(a) * spread);
          const r = height * (kind.wide ? .34 : .26);
          dummy.scale.set(r, height * (kind.wide ? .24 : .28), r);
        }
        dummy.rotation.set(range(-.15, .15), a, range(-.14, .14)); dummy.updateMatrix();
        crowns.setMatrixAt(crownIndex, dummy.matrix);
        parts.push({ mesh: crowns, index: crownIndex });
        crowns.setColorAt(crownIndex++, color.set(kind.tint).offsetHSL(range(-.015, .015), range(-.05, .05), range(-.06, .05)));
      }
      const species = { oak: 'white-oak', chestnut: 'sweet-chestnut', maple: 'red-maple', walnut: 'black-walnut' }[kind.id] ?? kind.id;
      registerWorldTree(colliders, { id: worldTreeId('west-lotharn', tree.x, tree.z), x: tree.x, z: tree.z, y, height, species }, parts, collider);
    }
    for (const batch of [trunks, crowns]) { if ((++buildWork & 31) === 0) yield;  batch.castShadow = true; batch.receiveShadow = true; batch.computeBoundingSphere(); group.add(batch); }
    metrics.trees += trees.length; metrics.batches += 2;
  }
  function* tuftBatchSteps(tufts, tint) {
    let buildWork = 0;
    if (!tufts.length) return;
    const batch = new THREE.InstancedMesh(tuftGeometry, tuftMaterial, tufts.length);
    for (const [index, tuft] of tufts.entries()) { if ((++buildWork & 31) === 0) yield;
      dummy.position.set(tuft.x, surfaceHeight(tuft.x, tuft.z) + .02, tuft.z); dummy.rotation.set(0, tuft.rot, 0); dummy.scale.setScalar(tuft.s); dummy.updateMatrix();
      batch.setMatrixAt(index, dummy.matrix); batch.setColorAt(index, tint(tuft));
    }
    batch.receiveShadow = true; batch.computeBoundingSphere(); group.add(batch);
    metrics.tufts += tufts.length; metrics.batches++;
  }
  function* rockBatchSteps(rocks) {
    let buildWork = 0;
    if (!rocks.length) return;
    const batch = new THREE.InstancedMesh(round, stoneMaterial, rocks.length);
    for (const [index, rock] of rocks.entries()) { if ((++buildWork & 31) === 0) yield;
      dummy.position.set(rock.x, surfaceHeight(rock.x, rock.z) + rock.s * .2, rock.z);
      dummy.rotation.set(range(-.2, .2), rock.rot, range(-.2, .2));
      dummy.scale.set(rock.s, rock.s * range(.45, .75), rock.s * range(.75, 1.25)); dummy.updateMatrix();
      batch.setMatrixAt(index, dummy.matrix); batch.setColorAt(index, color.setHSL(range(.08, .13), range(.05, .12), range(.4, .56)));
    }
    batch.castShadow = true; batch.receiveShadow = true; batch.computeBoundingSphere(); group.add(batch);
    metrics.rocks += rocks.length; metrics.batches++;
  }

  // Keep both the walk-in opening and the rock portal clear. Their positions
  // differ, and the square fine-ground patch replaces the coarse mesh around
  // the portal. A root-sized margin also keeps vegetation off that patch seam.
  const mouths = (kit.caves ?? []).flatMap(cave => (cave.kind === 'chamber'
    ? [cave.openings[0], cave.portals[0]] : [...cave.openings, ...cave.portals]).map(at => cave.at(at)));
  const atMouth = (x, z, margin = 0) => mouths.some(m => Math.abs(m.x - x) < 7 + margin && Math.abs(m.z - z) < 7 + margin);
  /** The valley floors, which are meadow rather than wood: grass where a glacier left deep soil. */
  const onFloor = (x, z) => {
    for (const valley of [LONG_VALLEY, NORTH_VALLEY]) {
      const b = valley.line.bounds;
      if (x < b.minX - valley.half || x > b.maxX + valley.half || z < b.minZ - valley.half || z > b.maxZ + valley.half) continue;
      if (nearestOn(valley.line, x, z).distance < valley.half * .72) return true;
    }
    return false;
  };
  // Soil pockets cross the contour lines rather than drawing a ring of equally
  // spaced trees along every ledge. Several scales make groves, openings and
  // scattered smaller trees at their margins, consistently across hex borders.
  const woodland = (x, z) => .5 + .24 * Math.sin(x * .023 + Math.sin(z * .031) * 1.7)
    + .17 * Math.sin(z * .049 - x * .017) + .09 * Math.sin(x * .119 + z * .081);
  const supportGrade = (x, z, reach = 2) => {
    const h = candidateSurfaceHeight(x, z);
    return Math.max(...[[reach, 0], [-reach, 0], [0, reach], [0, -reach]].map(([dx, dz]) => Math.abs(candidateSurfaceHeight(x + dx, z + dz) - h) / reach));
  };
  const occupied = new Map(), spacingCell = 8;
  const nearbyTrees = (x, z) => {
    const result = [], bx = Math.floor(x / spacingCell), bz = Math.floor(z / spacingCell);
    for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) result.push(...(occupied.get(`${bx + dx},${bz + dz}`) ?? []));
    return result;
  };
  const remember = tree => {
    const key = `${Math.floor(tree.x / spacingCell)},${Math.floor(tree.z / spacingCell)}`;
    if (!occupied.has(key)) occupied.set(key, []);
    occupied.get(key).push(tree);
  };
  const cells = [...(REGION_CELLS[WEST_LOTHARN] ?? [])].sort((a, b) => a.z - b.z || a.x - b.x);
  const BLOCK = Math.max(1, Math.round(4 / (WORLD_SCALE * WORLD_SCALE)));
  const candidates = Math.round(460 * WORLD_SCALE * WORLD_SCALE);
  for (let start = 0; start < cells.length; start += BLOCK) { if ((++buildWork & 31) === 0) yield;
    const block = cells.slice(start, start + BLOCK), trees = [], floor = [], open = [], rocks = [];
    for (const cell of block) { if ((++buildWork & 31) === 0) yield;
      for (let i = 0; i < candidates; i++) { if ((++buildWork & 31) === 0) yield;
        const x = cell.x + range(-50, 50), z = cell.z + range(-57, 57);
        if (!own(x, z) || westLotharnOpen(x, z, 1.5) || inWestWater(x, z, 3) || atMouth(x, z) || onFloor(x, z)) continue;
        const y = legacyGy(x, z);
        // The tree line: the wood thins from two hundred and fifty metres and gives out at three
        // hundred and forty-five, which leaves five courses of bare stone under the crest's bald.
        if (y > TREE_LINE.thins && random() < (y - TREE_LINE.thins) / (TREE_LINE.gives - TREE_LINE.thins)) continue;
        if (onBald(x, z, 2) || supportGrade(x, z) > .9) continue;
        const patch = woodland(x, z);
        if (patch < .24 || random() > .25 + .75 * patch) continue;
        const spacing = range(3.8, 5.6);
        if (nearbyTrees(x, z).some(tree => Math.hypot(tree.x - x, tree.z - z) < Math.max(spacing, tree.spacing))) continue;
        const kind = chooseKind(), young = random() < .22;
        const tree = { x, z, kind, spacing, h: range(...kind.h) * (young ? range(.4, .66) : range(.87, 1.12))
          * (y > 120 ? .84 : 1) * (y > 240 ? .74 : 1), s: range(.9, 1.35) * (young ? .65 : 1), rot: range(0, 6.28) };
        trees.push(tree); remember(tree);
      }
      // The forest floor: fern and sorrel in the shade, sparse; the valley floors and the balds grassed.
      for (let i = 0; i < 70; i++) { if ((++buildWork & 31) === 0) yield;
        const x = cell.x + range(-50, 50), z = cell.z + range(-57, 57);
        if (!own(x, z) || inWestWater(x, z, 1.5) || atMouth(x, z) || supportGrade(x, z, .6) > 1.1) continue;
        if (westLotharnOpen(x, z) || onFloor(x, z)) open.push({ x, z, s: range(.8, 1.6), rot: range(0, 6.28), bald: onBald(x, z, 2) });
        else if (i % 3 === 0 || woodland(x, z) < .35) floor.push({ x, z, s: range(1.1, 2.5), rot: range(0, 6.28) });
      }
      // Stone shows where the soil is thin: above the tree line and on the steep ground of the tops.
      for (let i = 0; i < 16; i++) { if ((++buildWork & 31) === 0) yield;
        const x = cell.x + range(-50, 50), z = cell.z + range(-57, 57);
        if (!own(x, z) || inWestWater(x, z, 2) || legacyGy(x, z) < 95 || atMouth(x, z) || onRamp(x, z, 1) || supportGrade(x, z, 1) > 1.8) continue;
        rocks.push({ x, z, s: range(.4, 1.5), rot: range(0, 6.28) });
        if (woodland(x, z) < .3 && i % 2 === 0) {
          for (let j = 0; j < 3; j++) { if ((++buildWork & 31) === 0) yield;
            const sx = x + range(-3, 3), sz = z + range(-3, 3);
            if (own(sx, sz) && !inWestWater(sx, sz, 2) && !atMouth(sx, sz) && !onRamp(sx, sz, 1) && supportGrade(sx, sz, 1) < 1.8)
              rocks.push({ x: sx, z: sz, s: range(.25, .7), rot: range(0, 6.28) });
          }
        }
      }
    }
    yield* woodBatchSteps(trees);
    yield* tuftBatchSteps(floor, () => color.setHSL(range(.24, .31), range(.3, .45), range(.2, .3)));
    yield* tuftBatchSteps(open, tuft => tuft.bald ? color.setHSL(range(.13, .18), range(.25, .36), range(.4, .52)) : color.setHSL(range(.2, .26), range(.3, .42), range(.34, .46)));
    yield* rockBatchSteps(rocks);
  }

  return {
    group, metrics, riverGround, fineGround,
    update(time) { waterMaterial.uniforms.time.value = time; quickMaterial.uniforms.time.value = time; },
  };
}

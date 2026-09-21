import * as THREE from 'three';
import { hexOwnerAt, REGION_CELLS, SURVEY, hexAt, hexCentre, METRES_PER_HEX, landDistance } from './region-world.js';
import { WORLD_SCALE } from './world-scale.js';
import {
  VASTOS_RIVER, VASTOS_BECK, VASTOS_BRAID, VASTOS_PANS, VASTOS_BASINS, VASTOS_SINTER,
  MENETH_BECKS, LIZEEM, CARICA, CARICA_CORRIDOR, ELA_SOUTH_REACH, NESDOR_BECK, WEST_BRAIDS, WEST_POOLS,
  LIZEEM_REACH, EER_CHANNELS, ISAREOS_RIVER, ISAREOS_BECKS, ISAMOUTH_GROUND,
  NETH, NETH_HEAD, NETHEREUM_OUTLET, NETHEREUM_STREAMS, NETHEREUM_HOLLOW,
  westBareGround, courseDistance, caricaCorridorDistance,
} from './west-regions.js';
import { WEST_PROFILES, poolSurface, westWaterSurface, westGroundAt, menethBand, braidThreadOffset, isareosLie, nethereumWet } from './west-ground.js';

/**
 * What the four western regions look like where the ground alone is not enough:
 * the water on top of the channels `west-ground.js` cut for it, the gravel of the
 * braided reach, the sedge at every waterline, the thorn that only grows in the
 * lee of a bank, the erratics the plain carries, and the sulfur ground breathing
 * on Vastos's western fall.
 *
 * `world.js` hands over the same toolkit the other regions' scenery receives.
 * Everything here is placed from `west-regions.js` and `west-ground.js`, so the
 * water is drawn at the height the ground was cut for and cannot float above its
 * own banks, and the tests can ask the same questions of the same numbers.
 *
 * No people, no building, no bridge: these regions are terrain and wildlife.
 */
export function createWestScenery(kit) {
  const { root, material, mesh, pebble, groundHeight, colliders, wornPatch, dummy, color, round } = kit;
  let seed = 4470913;
  const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  const range = (a, b) => a + random() * (b - a);
  const smooth = (a, b, x) => { const v = Math.max(0, Math.min(1, (x - a) / (b - a))); return v * v * (3 - 2 * v); };
  const districts = new Map();
  const district = name => {
    if (!districts.has(name)) { const group = new THREE.Group(); group.name = `${name} scenery`; root.add(group); districts.set(name, group); }
    return districts.get(name);
  };
  const metrics = { water: 0, sedge: 0, gravel: 0, thorn: 0, erratics: 0, vents: 0, trees: 0, rocks: 0, grass: 0 };

  /**
   * Upland water: colder and greyer than the Caloss, because it comes off snow
   * and runs over gravel rather than through a wooded lowland valley.
   */
  const waterMaterial = new THREE.ShaderMaterial({
    uniforms: { time: { value: 0 } }, side: THREE.DoubleSide,
    vertexShader: 'varying vec3 p; void main(){p=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader: 'uniform float time; varying vec3 p; void main(){float w=sin(p.x*.42-time*1.5+p.z*1.1)*sin(p.x*.17+p.z*1.3);vec3 c=vec3(.22,.35,.38)+vec3(.13,.16,.15)*pow(max(w,0.),8.);gl_FragColor=vec4(c,1.);}',
  });

  // -------------------------------------------------------------------------
  // Water surfaces
  // -------------------------------------------------------------------------
  /**
   * A ribbon of water over a line of samples, broken wherever the ground rises
   * back through it. A tapering beck has no channel left at its end, so it has
   * no water there either: `westWaterSurface` is the one authority for both.
   */
  function ribbon(samples, parent, name, halfOf = sample => sample.half) {
    const widthAt = typeof halfOf === 'number' ? () => halfOf : halfOf;
    let run = [];
    const flush = () => {
      if (run.length < 2) { run = []; return; }
      const vertices = [], indices = [];
      run.forEach((sample, index) => {
        const half = widthAt(sample);
        vertices.push(sample.x - sample.nx * half, sample.y, sample.z - sample.nz * half,
          sample.x + sample.nx * half, sample.y, sample.z + sample.nz * half);
        if (index) { const v = index * 2; indices.push(v - 2, v, v - 1, v - 1, v, v + 1); }
      });
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
      geometry.setIndex(indices);
      geometry.computeVertexNormals(); geometry.computeBoundingSphere();
      const sheet = new THREE.Mesh(geometry, waterMaterial);
      sheet.name = name; parent.add(sheet); metrics.water++;
      run = [];
    };
    for (const sample of samples) {
      const y = westWaterSurface(sample.x, sample.z);
      if (y === null) { flush(); continue; }
      run.push({ ...sample, y });
    }
    flush();
  }

  /** A pool's flat sheet, drawn a little inside its own shore. */
  function sheet(pool, parent, name) {
    const geometry = new THREE.CircleGeometry(pool.radius - .4, 40);
    geometry.rotateX(-Math.PI / 2);
    const water = new THREE.Mesh(geometry, waterMaterial);
    water.position.set(pool.x, poolSurface(pool), pool.z);
    water.name = name; parent.add(water); metrics.water++;
  }

  /**
   * The two braid threads, as lines on either side of the main channel. The
   * offset is the same half-wave `west-ground.js` cut the threads along, so the
   * water sits in the beds and not beside them.
   */
  function braidThreads(braid) {
    const profile = WEST_PROFILES.get(braid.course.id);
    return [1, -1].map(side => profile.map(sample => {
      const offset = braidThreadOffset(braid, sample.along);
      if (offset === null) return null;
      return { x: sample.x + sample.nx * offset * side, z: sample.z + sample.nz * offset * side, nx: sample.nx, nz: sample.nz };
    }).filter(Boolean));
  }

  // -------------------------------------------------------------------------
  // Margins: sedge at the waterline, gravel on the bars, thorn in the lee
  // -------------------------------------------------------------------------
  const sedgeGeometry = (() => {
    const positions = [], normals = [];
    for (let blade = 0; blade < 5; blade++) {
      const a = blade * 1.26, lean = .12 + blade % 3 * .05;
      const bx = Math.cos(a) * .05, bz = Math.sin(a) * .05, w = .022, h = .55 + (blade % 3) * .26;
      const cx = Math.cos(a + Math.PI / 2) * w, cz = Math.sin(a + Math.PI / 2) * w;
      positions.push(bx - cx, 0, bz - cz, bx + cx, 0, bz + cz, bx + Math.cos(a) * lean, h, bz + Math.sin(a) * lean);
      for (let i = 0; i < 3; i++) normals.push(0, 1, 0);
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    return geometry;
  })();
  const sedgeMaterial = material('#ffffff', { side: THREE.DoubleSide });

  /** Sedge and rush along a waterline: the one green thing on this plain that is not grass. */
  function sedgeBatch(spots, parent, name) {
    if (!spots.length) return;
    const batch = new THREE.InstancedMesh(sedgeGeometry, sedgeMaterial, spots.length);
    spots.forEach((spot, index) => {
      dummy.position.set(spot.x, groundHeight(spot.x, spot.z) + .02, spot.z);
      dummy.rotation.set(0, spot.rot, 0); dummy.scale.set(spot.s, spot.s * range(.85, 1.3), spot.s);
      dummy.updateMatrix(); batch.setMatrixAt(index, dummy.matrix);
      batch.setColorAt(index, color.setHSL(range(.16, .24), range(.24, .40), range(.28, .44)));
    });
    batch.name = name; batch.receiveShadow = true; batch.computeBoundingSphere();
    parent.add(batch); metrics.sedge += spots.length;
  }

  /** Water-worn stone: flat, pale, and lying the way the current left it. */
  function gravelBatch(spots, parent, name) {
    if (!spots.length) return;
    const batch = new THREE.InstancedMesh(round, material('#a7a496'), spots.length);
    spots.forEach((spot, index) => {
      dummy.position.set(spot.x, groundHeight(spot.x, spot.z) + spot.s * .12, spot.z);
      dummy.rotation.set(range(-.1, .1), spot.rot, range(-.1, .1));
      dummy.scale.set(spot.s, spot.s * range(.22, .38), spot.s * range(.7, 1.25));
      dummy.updateMatrix(); batch.setMatrixAt(index, dummy.matrix);
      batch.setColorAt(index, color.setHSL(.12, range(.03, .09), range(.46, .68)));
    });
    batch.name = name; batch.castShadow = true; batch.receiveShadow = true; batch.computeBoundingSphere();
    parent.add(batch); metrics.gravel += spots.length;
  }

  // -------------------------------------------------------------------------
  // Vastos
  // -------------------------------------------------------------------------
  const vastos = district('Vastos');
  const inVastos = (x, z) => hexOwnerAt(x, z) === 'Vastos';

  ribbon(WEST_PROFILES.get(VASTOS_RIVER.id), vastos, 'The Vastos River');
  ribbon(WEST_PROFILES.get(VASTOS_BECK.id), vastos, 'The snowmelt beck');
  braidThreads(WEST_BRAIDS[0]).forEach((thread, index) => ribbon(thread, vastos, `Vastos braid thread ${index + 1}`, VASTOS_BRAID.half));
  for (const pan of VASTOS_PANS) sheet(pan, vastos, `Watering pan: ${pan.id}`);
  for (const basin of VASTOS_BASINS) sheet(basin, vastos, `Eastern basin: ${basin.id}`);

  /**
   * Sedge stands where water is shallow and still. That is every pan and the
   * shore of both basins; it is not the braided reach, where the gravel moves
   * every spring and nothing gets a root down.
   */
  const panSedge = [];
  for (const pool of [...VASTOS_PANS, ...VASTOS_BASINS]) {
    for (let i = 0; i < 90; i++) {
      const angle = random() * Math.PI * 2, radius = pool.radius + range(-2.5, 3.5);
      const x = pool.x + Math.sin(angle) * radius, z = pool.z + Math.cos(angle) * radius;
      if (!inVastos(x, z)) continue;
      panSedge.push({ x, z, s: range(.7, 1.5), rot: random() * 6.28 });
    }
  }
  sedgeBatch(panSedge, vastos, 'Vastos pan sedge');

  const riverSedge = [], riverGravel = [], thorn = [];
  for (const sample of WEST_PROFILES.get(VASTOS_RIVER.id)) {
    const along = sample.index / (WEST_PROFILES.get(VASTOS_RIVER.id).length - 1);
    const braided = along >= VASTOS_BRAID.from && along <= VASTOS_BRAID.to;
    for (let i = 0; i < (braided ? 5 : 3); i++) {
      const side = random() < .5 ? -1 : 1;
      // Gravel lies out across the braided reach's bars; elsewhere it stays on the bank.
      const offset = braided ? range(2, VASTOS_BRAID.offset + 9) : VASTOS_RIVER.halfWidth + range(.3, 2.6);
      const x = sample.x + sample.nx * offset * side, z = sample.z + sample.nz * offset * side;
      if (!inVastos(x, z) || westWaterSurface(x, z) !== null) continue;
      if (braided) riverGravel.push({ x, z, s: range(.22, .7), rot: random() * 6.28 });
      else if (i < 2) riverSedge.push({ x, z, s: range(.6, 1.35), rot: random() * 6.28 });
    }
    // Thorn grows where the bank gives it shelter from a wind that never stops,
    // which on a river running east means the ground just north of the cut.
    if (sample.index % 7 === 0 && !braided) {
      const x = sample.x - sample.nx * range(7, 16), z = sample.z - sample.nz * range(7, 16);
      if (inVastos(x, z) && !westBareGround(x, z, 1)) thorn.push({ x, z, s: range(.75, 1.5), rot: random() * 6.28 });
    }
  }
  sedgeBatch(riverSedge, vastos, 'Vastos river sedge');
  gravelBatch(riverGravel, vastos, 'Vastos braid gravel');

  /**
   * The thorn: low, dark, wind-shaped and nowhere near tall enough to be a tree.
   * The lore is flat that Vastos has "no significant sheltering terrain", so
   * these are the only woody plants on the plain and they are all in the lee of
   * the one cut in it.
   */
  if (thorn.length) {
    const batch = new THREE.InstancedMesh(round, material('#4f5b3f', { flatShading: true }), thorn.length * 3);
    let at = 0;
    for (const bush of thorn) {
      const y = groundHeight(bush.x, bush.z);
      for (let lobe = 0; lobe < 3; lobe++) {
        const a = bush.rot + lobe * 2.1, spread = lobe === 2 ? 0 : .5 * bush.s;
        dummy.position.set(bush.x + Math.sin(a) * spread, y + bush.s * (lobe === 2 ? .72 : .46), bush.z + Math.cos(a) * spread);
        dummy.rotation.set(range(-.2, .2), a, range(-.2, .2));
        dummy.scale.set(bush.s * .78, bush.s * .42, bush.s * .74);
        dummy.updateMatrix(); batch.setMatrixAt(at, dummy.matrix);
        batch.setColorAt(at++, color.setHSL(range(.20, .27), range(.13, .22), range(.20, .30)));
      }
      colliders.push({ x: bush.x, z: bush.z, r: .62 * bush.s, kind: 'vastos-thorn' });
    }
    batch.castShadow = true; batch.receiveShadow = true; batch.computeBoundingSphere();
    batch.name = 'Vastos bank thorn'; vastos.add(batch); metrics.thorn += thorn.length;
  }

  /**
   * Erratics: the plain carries a scatter of stone that has nothing to do with
   * the ground under it, and on terrain this flat a boulder is a landmark. They
   * are placed off the hex grid, so they never line up with a cell's middle.
   */
  const erratics = [];
  for (let i = 0; i < 26 && erratics.length < 14; i++) {
    const x = -1780 + random() * 520, z = -560 + random() * 480;
    if (!inVastos(x, z) || westBareGround(x, z, 6)) continue;
    if (erratics.some(other => Math.hypot(other.x - x, other.z - z) < 70)) continue;
    erratics.push({ x, z, s: range(1.5, 3.6), rot: random() * 6.28 });
  }
  for (const stone of erratics) {
    const y = groundHeight(stone.x, stone.z);
    const rock = pebble(material('#8d9083'), stone.x, y + stone.s * .34, stone.z, stone.s, stone.s * .72, stone.s * .86, vastos);
    rock.rotation.set(.12, stone.rot, -.09);
    pebble(material('#9aa08d'), stone.x + stone.s * .5, y + stone.s * .18, stone.z - stone.s * .35, stone.s * .38, stone.s * .3, stone.s * .34, vastos);
    colliders.push({ x: stone.x, z: stone.z, r: stone.s * .72, kind: 'vastos-erratic' });
    metrics.erratics++;
  }

  // -------------------------------------------------------------------------
  // The sulfur ground
  // -------------------------------------------------------------------------
  /**
   * Sinter is a crust, so it is drawn as one: overlapping pale patches with no
   * grass between them, ochre-stained stone at the edges where the water has run
   * and dried, and three vents that have not stopped breathing. The lore says the
   * Pyrosi read meaning into this rock "even when they are not actively
   * fumarolic"; what is built here is only the rock and the steam.
   */
  const sinterGroup = new THREE.Group(); sinterGroup.name = 'The sulfur ground'; vastos.add(sinterGroup);
  wornPatch(VASTOS_SINTER.x, VASTOS_SINTER.z, VASTOS_SINTER.radius * .72, '#cfc7a4', 1, sinterGroup);
  for (let i = 0; i < 9; i++) {
    const angle = random() * Math.PI * 2, radius = random() * VASTOS_SINTER.radius * .64;
    wornPatch(VASTOS_SINTER.x + Math.sin(angle) * radius, VASTOS_SINTER.z + Math.cos(angle) * radius,
      range(4, 9), i % 3 ? '#ddd6b0' : '#c6b482', range(.7, 1.3), sinterGroup);
  }
  sheet(WEST_POOLS.find(pool => pool.id === 'sulfur-pool'), sinterGroup, 'The warm pool');
  for (let i = 0; i < 40; i++) {
    const angle = random() * Math.PI * 2, radius = VASTOS_SINTER.pool.radius + random() * 14;
    const x = VASTOS_SINTER.pool.x + Math.sin(angle) * radius, z = VASTOS_SINTER.pool.z + Math.cos(angle) * radius;
    const y = groundHeight(x, z), size = range(.25, .8);
    const stone = pebble(material(i % 4 ? '#c9a45f' : '#b8935a'), x, y + size * .2, z, size, size * .3, size * .8, sinterGroup);
    stone.rotation.set(.1, random() * 6.28, .06);
  }
  const steamMaterial = material('#e9e5d6', { transparent: true, opacity: .26, depthWrite: false, roughness: 1 });
  const plumes = [];
  for (const vent of VASTOS_SINTER.vents) {
    const y = groundHeight(vent.x, vent.z);
    pebble(material('#b8a06a'), vent.x, y + .12, vent.z, 1.5, .28, 1.5, sinterGroup);
    pebble(material('#8f7c52'), vent.x, y + .06, vent.z, .62, .2, .62, sinterGroup);
    const plume = new THREE.Group(); plume.name = 'Vent steam'; plume.position.set(vent.x, y, vent.z); sinterGroup.add(plume);
    for (let i = 0; i < 4; i++) {
      const puff = mesh(round, steamMaterial, 0, .5 + i * .9, 0, .5 + i * .35, .4 + i * .3, .5 + i * .35, plume);
      puff.castShadow = false; puff.receiveShadow = false;
    }
    plumes.push({ group: plume, phase: random() * 6.28 });
    metrics.vents++;
  }

  // -------------------------------------------------------------------------
  // Meneth: three bands of growing on every ridge face, and a beck on every floor
  // -------------------------------------------------------------------------
  const meneth = district('Meneth');
  for (const beck of MENETH_BECKS) ribbon(WEST_PROFILES.get(beck.id), meneth, beck.name);
  const becksedge = [];
  for (const beck of MENETH_BECKS) for (const sample of WEST_PROFILES.get(beck.id)) {
    if (sample.index % 2) continue;
    for (const side of [-1, 1]) {
      const offset = beck.halfWidth + range(.2, 1.9);
      const x = sample.x + sample.nx * offset * side, z = sample.z + sample.nz * offset * side;
      if (hexOwnerAt(x, z) !== 'Meneth' || westWaterSurface(x, z) !== null) continue;
      becksedge.push({ x, z, s: range(.5, 1.1), rot: random() * 6.28 });
    }
  }
  sedgeBatch(becksedge, meneth, 'Meneth beck rushes');

  /**
   * Meneth's own scatter, in three bands read off the ridge field.
   *
   *  - **floor**: hay meadow. The lore has the valley floors "cleared to meadow"
   *    and cut for winter fodder, so nothing woody stands on them at all.
   *  - **grove**: wild chestnut and walnut, "on the lower ridge slopes". Planted
   *    trees stand apart from one another, so these are spaced at seven metres
   *    and carry a broad low crown; the spacing is the thing that reads as an
   *    orchard from across a valley.
   *  - **wood**: the Lotharn-margin hardwood, which the lore is careful to say is
   *    not the Lotharn's own heavy mature timber — "being younger and at the
   *    range's edge, [it produces] the intermediate sizes". So: close-grown,
   *    straight, and none of it enormous.
   */
  const trunkGeometry = new THREE.CylinderGeometry(.19, .32, 1, 6);
  const crownGeometry = new THREE.IcosahedronGeometry(1, 0);
  const barkMaterial = material('#6d573d'), leafMaterial = material('#ffffff', { flatShading: true });
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
  const stoneMaterial = material('#8f9287');
  const BLOCK = Math.max(1, Math.round(6 / (WORLD_SCALE * WORLD_SCALE)));
  const tuftsPerHex = Math.round(27 * WORLD_SCALE * WORLD_SCALE);

  /**
   * One block's trees, as two instanced batches: a trunk each and three crown
   * lobes each. `tint` says what colour a crown is, which is how one region's
   * woodland is told from another's; `kind` is the collider tag, so a test can
   * ask where a region's trees actually stand.
   */
  function woodBatch(trees, parent, tint, kind) {
    if (!trees.length) return;
    const trunks = new THREE.InstancedMesh(trunkGeometry, barkMaterial, trees.length);
    const crowns = new THREE.InstancedMesh(crownGeometry, leafMaterial, trees.length * 3);
    let crownIndex = 0;
    trees.forEach((tree, index) => {
      const y = groundHeight(tree.x, tree.z), height = tree.h * tree.s;
      dummy.position.set(tree.x, y + height * .38, tree.z); dummy.rotation.set(0, tree.rot, 0);
      dummy.scale.set(tree.s, height * .76, tree.s); dummy.updateMatrix();
      trunks.setMatrixAt(index, dummy.matrix);
      colliders.push({ x: tree.x, z: tree.z, r: .48 * tree.s, kind });
      for (let lobe = 0; lobe < 3; lobe++) {
        const a = tree.rot + lobe * 2.1, spread = lobe === 2 ? 0 : height * (tree.wide ? .17 : .11);
        dummy.position.set(tree.x + Math.sin(a) * spread, y + height * (lobe === 2 ? .92 : .74), tree.z + Math.cos(a) * spread);
        dummy.rotation.set(range(-.18, .18), a, range(-.16, .16));
        const spreadWide = tree.wide ? .36 : .25;
        dummy.scale.set(height * spreadWide, height * (tree.wide ? .26 : .30), height * spreadWide); dummy.updateMatrix();
        crowns.setMatrixAt(crownIndex, dummy.matrix);
        crowns.setColorAt(crownIndex++, tint(tree));
      }
    });
    for (const batch of [trunks, crowns]) {
      batch.castShadow = true; batch.receiveShadow = true; batch.computeBoundingSphere(); parent.add(batch);
    }
    metrics.trees += trees.length;
  }

  /** Loose stone, lying the way weather left it. */
  function rockBatch(rocks, parent) {
    if (!rocks.length) return;
    const batch = new THREE.InstancedMesh(round, stoneMaterial, rocks.length);
    rocks.forEach((rock, index) => {
      dummy.position.set(rock.x, groundHeight(rock.x, rock.z) + rock.s * .24, rock.z);
      dummy.rotation.set(range(-.16, .16), rock.rot, range(-.16, .16));
      dummy.scale.set(rock.s, rock.s * range(.4, .7), rock.s * range(.75, 1.25)); dummy.updateMatrix();
      batch.setMatrixAt(index, dummy.matrix);
      batch.setColorAt(index, color.setHSL(.16, .07, range(.44, .6)));
    });
    batch.castShadow = true; batch.receiveShadow = true; batch.computeBoundingSphere(); parent.add(batch);
    metrics.rocks += rocks.length;
  }

  /** Ground cover, tinted by whatever the region says about the ground it is on. */
  function tuftBatch(tufts, parent, tint) {
    if (!tufts.length) return;
    const batch = new THREE.InstancedMesh(tuftGeometry, tuftMaterial, tufts.length);
    tufts.forEach((tuft, index) => {
      dummy.position.set(tuft.x, groundHeight(tuft.x, tuft.z) + .02, tuft.z);
      dummy.rotation.set(0, tuft.rot, 0); dummy.scale.setScalar(tuft.s); dummy.updateMatrix();
      batch.setMatrixAt(index, dummy.matrix);
      batch.setColorAt(index, tint(tuft));
    });
    batch.receiveShadow = true; batch.computeBoundingSphere(); parent.add(batch);
    metrics.grass += tufts.length;
  }

  const menethCells = [...REGION_CELLS.Meneth].sort((a, b) => a.z - b.z || a.x - b.x);
  for (let start = 0; start < menethCells.length; start += BLOCK) {
    const block = menethCells.slice(start, start + BLOCK), trees = [], rocks = [], tufts = [];
    for (const cell of block) {
      for (let i = 0; i < 150; i++) {
        const x = cell.x + range(-50, 50), z = cell.z + range(-55, 55);
        if (hexOwnerAt(x, z) !== 'Meneth' || westBareGround(x, z, 3)) continue;
        const band = menethBand(x, z);
        if (band === 'floor') continue;
        const grove = band === 'grove';
        // A grove is thinner on the ground than a wood, before spacing is even applied.
        if (grove && random() > .45) continue;
        const gap = grove ? 7 : 3.6;
        if (trees.some(tree => Math.hypot(tree.x - x, tree.z - z) < gap)) continue;
        trees.push({ x, z, wide: grove, s: range(.82, 1.24), h: grove ? range(7.5, 10.5) : range(9, 13.5), rot: range(0, 6.28) });
      }
      // Stone shows on the crests, where the soil is thinnest, and nowhere else.
      for (let i = 0; i < 28; i++) {
        const x = cell.x + range(-50, 50), z = cell.z + range(-55, 55);
        if (hexOwnerAt(x, z) !== 'Meneth' || westBareGround(x, z, 2) || menethBand(x, z) !== 'wood') continue;
        rocks.push({ x, z, s: range(.4, 1.5), rot: range(0, 6.28) });
      }
      for (let i = 0; i < tuftsPerHex; i++) {
        const x = cell.x + range(-50, 50), z = cell.z + range(-55, 55);
        if (hexOwnerAt(x, z) !== 'Meneth' || westBareGround(x, z, 1.5)) continue;
        tufts.push({ x, z, s: range(.7, 1.6), rot: range(0, 6.28), floor: menethBand(x, z) === 'floor' });
      }
    }
    // Chestnut and walnut are a warmer, yellower green than the hardwood above them.
    // Both are given as hex: setHSL is read in the renderer's working colour space,
    // and a lightness picked for sRGB comes back two stops paler than it was meant.
    woodBatch(trees, meneth, tree => tree.wide
      ? color.set('#87a052').offsetHSL(range(-.02, .02), range(-.05, .05), range(-.05, .05))
      : color.set('#4a6a43').offsetHSL(range(-.03, .03), range(-.05, .06), range(-.07, .06)),
      'meneth-tree');
    rockBatch(rocks, meneth);
    // Hay meadow on the floor is paler and taller than the grazed ridge turf above it.
    tuftBatch(tufts, meneth, tuft => tuft.floor
      ? color.setHSL(range(.14, .19), range(.26, .38), range(.44, .56))
      : color.setHSL(range(.20, .28), range(.24, .38), range(.32, .46)));
  }

  // -------------------------------------------------------------------------
  // Caricas: two rivers, and a corridor of woodland nobody has ever cleared
  // -------------------------------------------------------------------------
  const caricas = district('Caricas');
  for (const course of [LIZEEM, CARICA]) ribbon(WEST_PROFILES.get(course.id), caricas, course.name);

  /**
   * The Carica's upper section is "quick, cold, running over rock and gravel":
   * bars of it in the channel and a stony bank either side. Below the corridor's
   * head the river slows and the gravel stops, because slow water drops silt and
   * not shingle.
   */
  const caricaGravel = [], caricaSedge = [];
  for (const sample of WEST_PROFILES.get(CARICA.id)) {
    const upper = sample.along < CARICA_CORRIDOR.from;
    for (let i = 0; i < (upper ? 5 : 3); i++) {
      const side = random() < .5 ? -1 : 1, offset = sample.half + range(.2, upper ? 4.5 : 3);
      const x = sample.x + sample.nx * offset * side, z = sample.z + sample.nz * offset * side;
      if (westWaterSurface(x, z) !== null) continue;
      if (upper) caricaGravel.push({ x, z, s: range(.2, .78), rot: random() * 6.28 });
      else caricaSedge.push({ x, z, s: range(.7, 1.6), rot: random() * 6.28 });
    }
  }
  gravelBatch(caricaGravel, caricas, 'Upper Carica gravel');
  sedgeBatch(caricaSedge, caricas, 'Carica corridor sedge');
  const lizeemSedge = [];
  for (const sample of WEST_PROFILES.get(LIZEEM.id)) {
    if (sample.index % 3) continue;
    for (const side of [-1, 1]) {
      const offset = sample.half + range(.3, 3.4);
      const x = sample.x + sample.nx * offset * side, z = sample.z + sample.nz * offset * side;
      if (westWaterSurface(x, z) !== null) continue;
      lizeemSedge.push({ x, z, s: range(.8, 1.8), rot: random() * 6.28 });
    }
  }
  sedgeBatch(lizeemSedge, caricas, 'Lizeem bank reeds');

  /**
   * Caricas's own scatter, which is the whole argument of the region. The lore:
   * "the corridor's distinctive feature is its woodland: old-growth mixed forest
   * along the immediate riverbanks, breaking into managed woodland and farmland
   * above it. This is the fox's habitat. The Caricas have not cleared it."
   *
   * So the density is read off the distance from the Carica and nothing else:
   * closed old growth within a bank's width of the water, opening out to worked
   * woodland above that, and thin stony ground on the shelf the river comes off.
   * The farmland the lore puts between them is somebody's, and is not built.
   */
  const oldGrowthTint = () => color.set('#33512c').offsetHSL(range(-.03, .03), range(-.05, .06), range(-.05, .05));
  const workedTint = () => color.set('#4d6f3f').offsetHSL(range(-.03, .03), range(-.06, .06), range(-.06, .07));
  /**
   * The old growth is planted off the river itself and not off the hex grid. A
   * hex is a hundred metres across and the bank woodland is thirty-four metres
   * wide; scattering the corridor from cell centres puts most of the attempts on
   * ground that is not corridor and leaves the one thing this region is for
   * looking like scrub. Walking the river and planting out from it gives the
   * bank the closed canopy the lore insists nobody has ever cut.
   */
  const corridorTrees = [];
  for (const sample of WEST_PROFILES.get(CARICA.id)) {
    if (sample.along < CARICA_CORRIDOR.from || sample.along > CARICA_CORRIDOR.to) continue;
    for (let i = 0; i < 34; i++) {
      const side = random() < .5 ? -1 : 1, offset = sample.half + range(1.5, CARICA_CORRIDOR.bankReach);
      const x = sample.x + sample.nx * offset * side, z = sample.z + sample.nz * offset * side;
      if (hexOwnerAt(x, z) !== 'Caricas' || westBareGround(x, z, 2.5)) continue;
      if (corridorTrees.some(tree => Math.hypot(tree.x - x, tree.z - z) < 2.9)) continue;
      corridorTrees.push({ x, z, old: true, wide: false, s: range(.9, 1.5), h: range(12, 18), rot: range(0, 6.28) });
    }
  }
  woodBatch(corridorTrees, caricas, oldGrowthTint, 'caricas-tree');

  const caricasWood = (x, z) => {
    const corridor = caricaCorridorDistance(x, z);
    if (corridor < CARICA_CORRIDOR.bankReach) return 0;     // already planted, off the river
    if (corridor < CARICA_CORRIDOR.woodReach) return 34 * (1 - (corridor - CARICA_CORRIDOR.bankReach) / (CARICA_CORRIDOR.woodReach - CARICA_CORRIDOR.bankReach));
    // Off the corridor: a thin riverine band on the Lizeem, and the bare shelf above.
    const lizeem = courseDistance(LIZEEM, x, z, 70);
    if (lizeem < 60) return 16 * (1 - lizeem / 60);
    return 3 * (1 - smooth(-2000, -1750, x));
  };
  const caricasCells = [...REGION_CELLS.Caricas].sort((a, b) => a.z - b.z || a.x - b.x);
  for (let start = 0; start < caricasCells.length; start += BLOCK) {
    const block = caricasCells.slice(start, start + BLOCK), trees = [], rocks = [], tufts = [];
    for (const cell of block) {
      for (let i = 0; i < 110; i++) {
        const x = cell.x + range(-50, 50), z = cell.z + range(-55, 55);
        if (hexOwnerAt(x, z) !== 'Caricas' || westBareGround(x, z, 3)) continue;
        const here = caricasWood(x, z);
        if (random() * 40 > here) continue;
        if (trees.some(tree => Math.hypot(tree.x - x, tree.z - z) < 5.4)) continue;
        if (corridorTrees.some(tree => Math.hypot(tree.x - x, tree.z - z) < 4.4)) continue;
        trees.push({ x, z, old: false, wide: true, s: range(.85, 1.2), h: range(8.5, 12.5), rot: range(0, 6.28) });
      }
      // Stone belongs to the shelf, which the lore calls rougher and less well-watered.
      for (let i = 0; i < 34; i++) {
        const x = cell.x + range(-50, 50), z = cell.z + range(-55, 55);
        if (hexOwnerAt(x, z) !== 'Caricas' || westBareGround(x, z, 2)) continue;
        if (random() > smooth(-2050, -1780, x)) continue;
        rocks.push({ x, z, s: range(.4, 1.7), rot: range(0, 6.28) });
      }
      for (let i = 0; i < tuftsPerHex; i++) {
        const x = cell.x + range(-50, 50), z = cell.z + range(-55, 55);
        if (hexOwnerAt(x, z) !== 'Caricas' || westBareGround(x, z, 1.5)) continue;
        tufts.push({ x, z, s: range(.7, 1.6), rot: range(0, 6.28), floor: caricaCorridorDistance(x, z) < CARICA_CORRIDOR.woodReach });
      }
    }
    woodBatch(trees, caricas, workedTint, 'caricas-tree');
    rockBatch(rocks, caricas);
    tuftBatch(tufts, caricas, tuft => tuft.floor
      ? color.setHSL(range(.22, .30), range(.28, .42), range(.24, .36))
      : color.setHSL(range(.14, .21), range(.16, .28), range(.40, .54)));
  }

  /**
   * The Lizeem cannot be waded and neither can the Carica below its upper
   * section: they are the two edges of this region, and nobody here has built a
   * bridge. The blockers are laid along the water at its own width.
   */
  // The reach below Nesdor is the same wall carried on: Eer's own lore says the great river
  // "cannot be crossed anywhere along the Eer bank", and the atlas gives Eer and Gala not one
  // dry hex edge between them. It is laid from the same loop so the line has no join in it.
  // Isareos's border river is the same case as the Carica and belongs in the same loop:
  // a medium river waded at its head and deep below it. Left out of this at first, and the
  // omission had two faces — a traveler could walk over the deep two-thirds of it, and the
  // otters on it had no water to go into when somebody came at them, which made them a slow
  // land animal that could be run down.
  //
  // The Neth is the third of that shape and the one where it matters most: below its ford it
  // is the border between Nethereum and Ovesos for the whole of its length, and the ford is the
  // only dry way between them. A Neth a traveler could walk over anywhere would make the ford
  // meaningless; a Neth with no blockers at all would make its otters walkable-down.
  //
  // **Nothing in this loop draws from the seeded stream**, so the array can be added to without
  // moving a single thing already built.
  for (const course of [LIZEEM, CARICA, LIZEEM_REACH, ISAREOS_RIVER, NETH]) for (const sample of WEST_PROFILES.get(course.id)) {
    if (sample.ford) continue;
    // Samples are five metres apart, so each blocker has to be wide enough to
    // meet the one in front of it as well as the ones beside it. A gap of even a
    // metre in this line is a place a traveler walks out into a deep river.
    const step = Math.max(1, Math.round(sample.half / 3.2));
    const radius = sample.half / (step + .5) + 1.4;
    for (let k = -step; k <= step; k++) {
      const offset = sample.half * (k / (step + .5));
      colliders.push({ x: sample.x + sample.nx * offset, z: sample.z + sample.nz * offset,
        r: radius, kind: 'west-deep-water' });
    }
  }

  // -------------------------------------------------------------------------
  // Nesdor: the Flats, the braided water on them, and one wooded valley head
  // -------------------------------------------------------------------------
  const nesdor = district('Nesdor');
  for (const course of [ELA_SOUTH_REACH, NESDOR_BECK]) ribbon(WEST_PROFILES.get(course.id), nesdor, course.name);
  // Named, not filtered. This used to read `WEST_BRAIDS.filter(id !== 'vastos')`, which was
  // true of exactly Nesdor's two until Eer added a pair of its own — and had it stayed,
  // Eer's braids would have been drawn into Nesdor's district and, worse, drawn from
  // Nesdor's own place in this module's one seeded stream, moving every tree after them.
  const NESDOR_BRAIDS = WEST_BRAIDS.filter(item => item.id === 'ela-south' || item.id === 'nesdor-beck');
  for (const braid of NESDOR_BRAIDS)
    braidThreads(braid).forEach((thread, index) => ribbon(thread, nesdor, `${braid.course.name} thread ${index + 1}`, braid.half));

  /**
   * Sand, not gravel. The lore is specific about what the Flats are made of —
   * "the dark alluvial material that centuries of river sediment have deposited"
   * — and what a slow river drops on ground like that is sand, in long low bars
   * between the channels rather than banks of shingle.
   */
  const flatsSand = [], flatsSedge = [];
  for (const braid of NESDOR_BRAIDS) {
    for (const sample of WEST_PROFILES.get(braid.course.id)) {
      const offset = braidThreadOffset(braid, sample.along);
      if (offset === null) continue;
      for (let i = 0; i < 6; i++) {
        const side = random() < .5 ? -1 : 1, out = range(sample.half + .5, offset + braid.half + 7);
        const x = sample.x + sample.nx * out * side, z = sample.z + sample.nz * out * side;
        if (hexOwnerAt(x, z) !== 'Nesdor' || westWaterSurface(x, z) !== null) continue;
        if (i < 4) flatsSand.push({ x, z, s: range(.3, .95), rot: random() * 6.28 });
        else flatsSedge.push({ x, z, s: range(.8, 1.7), rot: random() * 6.28 });
      }
    }
  }
  gravelBatch(flatsSand, nesdor, 'Nesdor sand bars');
  sedgeBatch(flatsSedge, nesdor, 'Nesdor braid sedge');

  /**
   * What grows on the Flats is grass and nothing else, and the atlas already says
   * where that starts: its plains hexes are the Flats and its grassland and forest
   * hexes are the valley head in the north-west, where the lore puts "woodland on
   * the slopes" and "the nut crop (primarily hazel, some oak)". So the wood is
   * read off the cell's own authored terrain and the horizon does the rest.
   */
  const nesdorCells = [...REGION_CELLS.Nesdor].sort((a, b) => a.z - b.z || a.x - b.x);
  const nesdorTerrain = new Map(SURVEY.regions.find(region => region.name === 'Nesdor')
    .cells.map(cell => [`${cell.q},${cell.r}`, cell.terrain]));
  const nesdorTerrainAt = (x, z) => { const home = hexAt(x, z); return nesdorTerrain.get(`${home.q},${home.r}`) ?? 'plains'; };
  for (let start = 0; start < nesdorCells.length; start += BLOCK) {
    const block = nesdorCells.slice(start, start + BLOCK), trees = [], tufts = [];
    for (const cell of block) {
      const wooded = cell.terrain === 'forest' ? 58 : cell.terrain === 'grassland' ? 20 : 0;
      for (let i = 0; i < wooded * 2; i++) {
        const x = cell.x + range(-50, 50), z = cell.z + range(-55, 55);
        if (hexOwnerAt(x, z) !== 'Nesdor' || westBareGround(x, z, 4)) continue;
        const kind = nesdorTerrainAt(x, z);
        if (kind === 'plains' || random() * 60 > (kind === 'forest' ? 58 : 20)) continue;
        if (trees.some(tree => Math.hypot(tree.x - x, tree.z - z) < 4.6)) continue;
        // Hazel is a multi-stemmed shrub the height of a house; oak is a tree.
        const oak = random() < .34;
        trees.push({ x, z, oak, wide: oak, s: range(.8, oak ? 1.3 : 1), h: oak ? range(11, 15) : range(6, 8.5), rot: range(0, 6.28) });
      }
      for (let i = 0; i < tuftsPerHex + 6; i++) {
        const x = cell.x + range(-50, 50), z = cell.z + range(-55, 55);
        if (hexOwnerAt(x, z) !== 'Nesdor' || westBareGround(x, z, 1.5)) continue;
        tufts.push({ x, z, s: range(.7, 1.7), rot: range(0, 6.28), floor: nesdorTerrainAt(x, z) === 'plains' });
      }
    }
    // Hazel is a lighter, yellower leaf than oak, and both are given as hex for the
    // same reason the Meneth crowns are.
    woodBatch(trees, nesdor, tree => tree.oak
      ? color.set('#4f6b3e').offsetHSL(range(-.02, .02), range(-.05, .05), range(-.05, .06))
      : color.set('#7d9a4f').offsetHSL(range(-.02, .02), range(-.05, .05), range(-.05, .05)), 'nesdor-tree');
    // The Flats are paler and drier than the valley head, and shade toward the Moros.
    tuftBatch(tufts, nesdor, tuft => tuft.floor
      ? color.setHSL(range(.13, .18), range(.24, .36), range(.44, .58))
      : color.setHSL(range(.19, .26), range(.26, .40), range(.34, .48)));
  }

  // -------------------------------------------------------------------------
  // What a traveler cannot walk into
  // -------------------------------------------------------------------------
  /**
   * Deep water blocks; shallow water does not. The river and the pans are a
   * ford and a puddle — the lore's Vastos River is "relatively shallow", and a
   * herd waters at a pan by standing in it. The two eastern basins are three
   * metres deep and the warm pool is hot, and neither is somewhere to walk.
   */
  for (const pool of [...VASTOS_BASINS, WEST_POOLS.find(item => item.id === 'sulfur-pool')]) {
    const surface = poolSurface(pool), step = pool.radius > 10 ? 3.4 : 2.2;
    for (let x = pool.x - pool.radius; x <= pool.x + pool.radius; x += step)
      for (let z = pool.z - pool.radius; z <= pool.z + pool.radius; z += step) {
        if (Math.hypot(x - pool.x, z - pool.z) > pool.radius - 1) continue;
        if (surface - westGroundAt(x, z) < .75) continue;
        colliders.push({ x, z, r: step * .72, kind: 'west-deep-water' });
      }
  }

  // -------------------------------------------------------------------------
  // Eer: a country the atlas divides once, and two channels across it to the sea
  // -------------------------------------------------------------------------
  /**
   * **Everything below is drawn after Nesdor on purpose.** This module has one seeded
   * stream and it is consumed in region order, so a country added anywhere but the end
   * re-rolls every draw after it and moves scatter that is already built and already
   * tested against. Eer goes last; the six countries after it go later still.
   */
  const eer = district('Eer');

  /**
   * How Mediterranean a point is: 0 on the humid inland loam, 1 on the dry coast.
   *
   * The atlas divides Eer exactly once — twelve `plains` hexes over the north and
   * north-west, thirteen `grassland` over the south and south-east — and its Köppen
   * field draws the same line, `Cfa` against `Csa`. So there is no hand-drawn
   * boundary here and there must not be one: this is the cell terrain, blended over
   * its neighbours by the same weights `terrainMix` uses for the ground colour and
   * the height, which spreads the change across about a hundred metres. A traveler
   * walking south-east crosses it without ever crossing a line, which is the whole
   * point the brief makes about this country: "This is where the game stops being
   * green, and it stops being green in the middle of a country rather than at a
   * border."
   *
   * Only Eer's own hexes count. A sea hex has no terrain to vote with and a Nesdor
   * hex is a different country's weather.
   */
  const eerTerrain = new Map(SURVEY.regions.find(region => region.name === 'Eer')
    .cells.map(cell => [`${cell.q},${cell.r}`, cell.terrain]));
  const EER_NEIGHBOURS = [[0, 0], [1, 0], [1, -1], [0, -1], [-1, 0], [-1, 1], [0, 1]];
  function eerSeaward(x, z) {
    const home = hexAt(x, z);
    let total = 0, dry = 0;
    for (const [dq, dr] of EER_NEIGHBOURS) {
      const q = home.q + dq, r = home.r + dr, terrain = eerTerrain.get(`${q},${r}`);
      if (!terrain) continue;
      const centre = hexCentre(q, r);
      const weight = Math.max(0, 1 - Math.hypot(x - centre.x, z - centre.z) / (METRES_PER_HEX * 1.28));
      if (!weight) continue;
      total += weight;
      if (terrain === 'grassland') dry += weight;
    }
    return total ? dry / total : 1;
  }

  /**
   * Ground in Eer that something may be planted on. Four things have to be true and
   * each of them caught a mistake:
   *
   *  - it is Eer's own hex (`hexOwnerAt`, never `regionAt`: the shore fringe is what
   *    the traveler is *told*, and scatter belongs on the atlas's grid);
   *  - it is not inside a watercourse by that course's widest half-width;
   *  - it is not under water *here*, which `westBareGround` cannot answer, because
   *    that measures from a centre line and knows nothing about braids — and the
   *    last two-fifths of both channels braid out to fifteen metres either side;
   *  - and it is above the waterline. Eer is the first of these regions with a
   *    coast, and nothing else in the west has ever had to ask: photographed from
   *    the shore, the cushion scrub was standing in the surf.
   */
  const eerPlantable = (x, z, margin) => hexOwnerAt(x, z) === 'Eer'
    && !westBareGround(x, z, margin) && westWaterSurface(x, z) === null && landDistance(x, z) > 1.5;

  ribbon(WEST_PROFILES.get(LIZEEM_REACH.id), eer, LIZEEM_REACH.name);
  for (const channel of EER_CHANNELS) ribbon(WEST_PROFILES.get(channel.id), eer, channel.name);
  const EER_BRAIDS = WEST_BRAIDS.filter(item => item.id === 'eer-north' || item.id === 'eer-south');
  for (const braid of EER_BRAIDS)
    braidThreads(braid).forEach((thread, index) => ribbon(thread, eer, `${braid.course.name} thread ${index + 1}`, braid.half));

  /**
   * Sand on the braid bars and sedge at the waterlines, as on the Flats upstream —
   * the same river, the same gradient dying, the same result. Eer's is the paler
   * shell sand of a coast rather than the Flats' river grit, and there is more of
   * it: these channels are within sight of the sea.
   */
  const eerSand = [], eerSedge = [];
  for (const braid of EER_BRAIDS) for (const sample of WEST_PROFILES.get(braid.course.id)) {
    const offset = braidThreadOffset(braid, sample.along);
    if (offset === null) continue;
    for (let i = 0; i < 7; i++) {
      const side = random() < .5 ? -1 : 1, out = range(sample.half + .5, offset + braid.half + 8);
      const x = sample.x + sample.nx * out * side, z = sample.z + sample.nz * out * side;
      if (hexOwnerAt(x, z) !== 'Eer' || westWaterSurface(x, z) !== null) continue;
      if (i < 4) eerSand.push({ x, z, s: range(.25, .8), rot: random() * 6.28 });
      else eerSedge.push({ x, z, s: range(.9, 1.9), rot: random() * 6.28 });
    }
  }
  // The Lizeem's own bank, which carries the reeds the fauna overview's "richest avian
  // assemblage documented on the continent" stands in.
  for (const sample of WEST_PROFILES.get(LIZEEM_REACH.id)) {
    if (sample.index % 3) continue;
    for (const side of [-1, 1]) {
      const offset = sample.half + range(.4, 4);
      const x = sample.x + sample.nx * offset * side, z = sample.z + sample.nz * offset * side;
      if (hexOwnerAt(x, z) !== 'Eer' || westWaterSurface(x, z) !== null) continue;
      eerSedge.push({ x, z, s: range(1, 2.1), rot: random() * 6.28 });
    }
  }
  gravelBatch(eerSand, eer, 'Eer channel sand');
  sedgeBatch(eerSedge, eer, 'Eer channel sedge');

  /**
   * The galleries. The atlas gives Eer no `forest` hex, so nothing here is woodland,
   * and what trees the country has stand where a tree can drink: in a narrow ribbon
   * along the two channels and nowhere else.
   *
   * Which trees is the climate's business, and the channels cross the climate line,
   * so each one changes species along its own length. Above the line — humid `Cfa`,
   * water all year — **alder and willow**, tall, soft and dark. Below it — `Csa`, a
   * bed that runs hard in winter and not at all in August — **tamarisk and
   * oleander**, which is what actually grows in a watercourse like that: shorter,
   * looser, paler, and more shrub than tree.
   *
   * Planted off the water rather than off the hex grid, for the reason the Carica
   * corridor is: a hex is a hundred metres and a gallery is eight, so scattering it
   * from cell centres would put nearly every attempt on open grass and leave the one
   * wooded thing in the country looking like an accident.
   *
   * **A gallery, and nothing more.** The first pass planted this out to sixteen
   * metres at under three metres' spacing, and photographed from the braided reach
   * it was a wood — which is the one thing the atlas says Eer has not got, in a map
   * that has `forest` and uses it two hexes away. So: half the reach, a quarter of
   * the attempts, and spacing wide enough that a traveler on the bank is walking
   * under trees and not through them.
   */
  const galleryTrees = [];
  for (const channel of EER_CHANNELS) for (const sample of WEST_PROFILES.get(channel.id)) {
    for (let i = 0; i < 5; i++) {
      const side = random() < .5 ? -1 : 1, offset = sample.half + range(.8, 7);
      const x = sample.x + sample.nx * offset * side, z = sample.z + sample.nz * offset * side;
      // `westBareGround` measures from a course's own centre line and knows nothing
      // about braids, and the last two-fifths of both channels are braided out to
      // fifteen metres either side — which is exactly the band a gallery grows in.
      // So the water surface is asked as well, and it is the authority: a tree in a
      // side channel is a worse error than a bare metre of bar.
      if (!eerPlantable(x, z, 2)) continue;
      const seaward = eerSeaward(x, z);
      // The gallery thins as it dries: a winter watercourse feeds fewer trees than a
      // river that runs all year, and the thinning is the climate showing on the ground.
      if (random() > 1 - seaward * .55) continue;
      if (galleryTrees.some(tree => Math.hypot(tree.x - x, tree.z - z) < (seaward > .5 ? 6.5 : 4.6))) continue;
      const scrubby = seaward > .5;
      galleryTrees.push({ x, z, scrubby, wide: scrubby, s: range(.8, scrubby ? 1.1 : 1.35),
        h: scrubby ? range(4.5, 7) : range(9, 14), rot: range(0, 6.28) });
    }
  }
  // Alder and willow are a deep cool green; tamarisk and oleander are grey-green and
  // dusty, which is the single most Mediterranean thing a plant can be. Hex, not
  // setHSL: a lightness picked for sRGB comes back two stops paler through the
  // renderer's working space (docs/four-regions-brief.md).
  woodBatch(galleryTrees, eer, tree => tree.scrubby
    ? color.set('#8b9a6d').offsetHSL(range(-.02, .02), range(-.06, .05), range(-.05, .06))
    : color.set('#41633a').offsetHSL(range(-.03, .03), range(-.05, .06), range(-.06, .06)),
    'eer-tree');

  /**
   * Eer's open ground, which is nearly all of Eer. Three things grow on it and the
   * `seaward` blend decides how much of each:
   *
   *  - **Grass**, everywhere. Rank, tall and green on the loam — "the greenest thing
   *    in this quarter of the continent" — going short, thin and tawny toward the sea.
   *  - **Low aromatic cushion scrub**, on the dry half only, and thickest on the sandy
   *    ground behind the bays. The shape East Suval already draws for its limestone,
   *    paler and lower, because this is sand and not rock.
   *  - **Wild olive and holm oak**, singly and in twos on the coastal grass, never
   *    near enough to touch. A wild olive is a tree and not a crop; one standing alone
   *    on open ground is the thing that says Mediterranean at a distance without being
   *    a wood, and the atlas is clear that there is no wood here to be.
   *
   * No rock anywhere. The atlas gives Eer no `hills` hex and the lore gives it deep
   * alluvial loam to the depth of a spade; a boulder on this plain would be a lie.
   */
  const eerCells = [...REGION_CELLS.Eer].sort((a, b) => a.z - b.z || a.x - b.x);
  const oliveTint = () => color.set('#8e9a72').offsetHSL(range(-.02, .02), range(-.05, .05), range(-.04, .06));
  const eerScrub = [], standingTrees = [];
  for (let start = 0; start < eerCells.length; start += BLOCK) {
    const block = eerCells.slice(start, start + BLOCK), tufts = [];
    for (const cell of block) {
      // The standing trees: an attempt every few dozen metres, and a spacing rule that
      // means most of them fail. What survives is a scatter nothing in it touches.
      for (let i = 0; i < 26; i++) {
        const x = cell.x + range(-50, 50), z = cell.z + range(-55, 55);
        if (!eerPlantable(x, z, 4)) continue;
        const seaward = eerSeaward(x, z);
        if (random() > seaward * .5) continue;                 // the loam half carries none
        if (standingTrees.some(tree => Math.hypot(tree.x - x, tree.z - z) < 44)) continue;
        if (galleryTrees.some(tree => Math.hypot(tree.x - x, tree.z - z) < 26)) continue;
        const holm = random() < .38;
        standingTrees.push({ x, z, holm, wide: true, s: range(.9, 1.3),
          h: holm ? range(8, 11) : range(5.5, 7.5), rot: range(0, 6.28) });
      }
      // Cushion scrub: the dry half, and thicker the nearer the sand behind a bay is.
      // Photographed from the shore, the first pass's thirty attempts a hex left the
      // ground behind the bays bare — a bush every six hundred square metres is not a
      // scrub, it is an accident — so there are enough of them now to walk through.
      for (let i = 0; i < 90; i++) {
        const x = cell.x + range(-50, 50), z = cell.z + range(-55, 55);
        if (!eerPlantable(x, z, 2)) continue;
        // Weighted hard toward the coast, because that is where the lore puts it:
        // "aromatic cushion scrub on the sandy ground behind the bays". Inland of the
        // sand it is a scatter on the dry grass and not a cover.
        const seaward = eerSeaward(x, z), shore = 1 - smooth(40, 220, landDistance(x, z));
        if (random() > seaward * (.28 + shore * .62)) continue;
        if (eerScrub.some(bush => Math.hypot(bush.x - x, bush.z - z) < 4.4)) continue;
        eerScrub.push({ x, z, s: range(.55, 1.2), rot: random() * 6.28, seaward });
      }
      for (let i = 0; i < tuftsPerHex + 44; i++) {
        const x = cell.x + range(-50, 50), z = cell.z + range(-55, 55);
        if (!eerPlantable(x, z, 1.5)) continue;
        const seaward = eerSeaward(x, z);
        tufts.push({ x, z, s: range(.7, 1.8) * (1.28 - seaward * .38), rot: range(0, 6.28), seaward });
      }
    }
    // The one continuous thing in the country: deep green and knee-high on the loam,
    // short and tawny on the sea. The height is the wetness as much as the colour is —
    // "the grass on it stands to the knee", and it does not on the dry half.
    tuftBatch(tufts, eer, tuft => color.setHSL(
      .26 - tuft.seaward * .11 + range(-.015, .015),
      .38 - tuft.seaward * .12 + range(-.05, .05),
      .26 + tuft.seaward * .24 + range(-.04, .04)));
  }
  // Holm oak is dark and heavy; a wild olive is pale, grey and open. Both wide-crowned,
  // because a tree that has never had a neighbour grows out rather than up.
  woodBatch(standingTrees, eer, tree => tree.holm
    ? color.set('#3f5733').offsetHSL(range(-.02, .02), range(-.04, .05), range(-.04, .05))
    : oliveTint(), 'eer-tree');

  /**
   * The cushion scrub itself: three low lobes, grey-green, aromatic, and never more
   * than knee high. It is the Vastos thorn's geometry drawn flatter and paler —
   * a thorn grows in the lee of a bank because of the wind, and a cushion grows low
   * because of the summer.
   */
  if (eerScrub.length) {
    const batch = new THREE.InstancedMesh(round, material('#7f8a63', { flatShading: true }), eerScrub.length * 3);
    let at = 0;
    for (const bush of eerScrub) {
      const y = groundHeight(bush.x, bush.z);
      for (let lobe = 0; lobe < 3; lobe++) {
        const a = bush.rot + lobe * 2.1, spread = lobe === 2 ? 0 : .42 * bush.s;
        dummy.position.set(bush.x + Math.sin(a) * spread, y + bush.s * (lobe === 2 ? .40 : .26), bush.z + Math.cos(a) * spread);
        dummy.rotation.set(range(-.16, .16), a, range(-.16, .16));
        dummy.scale.set(bush.s * .72, bush.s * .26, bush.s * .68);
        dummy.updateMatrix(); batch.setMatrixAt(at, dummy.matrix);
        batch.setColorAt(at++, color.setHSL(range(.17, .24), range(.10, .20), range(.32, .46)));
      }
      colliders.push({ x: bush.x, z: bush.z, r: .5 * bush.s, kind: 'eer-scrub' });
    }
    batch.castShadow = true; batch.receiveShadow = true; batch.computeBoundingSphere();
    batch.name = 'Eer cushion scrub'; eer.add(batch); metrics.thorn += eerScrub.length;
  }

  // -------------------------------------------------------------------------
  // Isareos: grass to the top of every shoulder, thorn in every hollow
  // -------------------------------------------------------------------------
  /**
   * After Eer, for the same reason Eer came after Nesdor: one seeded stream, consumed
   * in region order, and a country added anywhere but the end re-rolls every draw
   * after it.
   *
   * This is the simplest country in the west to draw, and that is the point of it.
   * Three rules and no fourth: grass everywhere, thorn where the ground is low or in
   * the lee, and a gallery two trees deep on the water. The atlas gives Isareos no
   * `forest` hex in a map that has `forest` and uses it two hexes west in the
   * Ibenwood, so there is nothing else here and there must not be.
   */
  const isareos = district('Isareos');
  /** Ground left plain for Isamouth, which is a town and is therefore not built. */
  const atIsamouth = (x, z) => Math.hypot(x - ISAMOUTH_GROUND.x, z - ISAMOUTH_GROUND.z) < ISAMOUTH_GROUND.radius;
  ribbon(WEST_PROFILES.get(ISAREOS_RIVER.id), isareos, ISAREOS_RIVER.name);
  for (const beck of ISAREOS_BECKS) ribbon(WEST_PROFILES.get(beck.id), isareos, beck.name);

  const isareosSedge = [], isareosGravel = [];
  for (const course of [ISAREOS_RIVER, ...ISAREOS_BECKS]) for (const sample of WEST_PROFILES.get(course.id)) {
    if (sample.index % 2) continue;
    for (const side of [-1, 1]) {
      const offset = sample.half + range(.3, 2.4);
      const x = sample.x + sample.nx * offset * side, z = sample.z + sample.nz * offset * side;
      if (hexOwnerAt(x, z) !== 'Isareos' || westWaterSurface(x, z) !== null) continue;
      // The river's upper third is the waded part, and a ford is gravel by definition.
      if (course === ISAREOS_RIVER && sample.along < ISAREOS_RIVER.fordUntil) isareosGravel.push({ x, z, s: range(.2, .62), rot: random() * 6.28 });
      else isareosSedge.push({ x, z, s: range(.6, 1.3), rot: random() * 6.28 });
    }
  }
  gravelBatch(isareosGravel, isareos, 'Isareos ford gravel');
  sedgeBatch(isareosSedge, isareos, 'Isareos water rushes');

  /**
   * The gallery, planted off the water and not off the hex grid — the Carica's
   * lesson, and Eer's after it. The lore is exact about the width and this is the
   * whole of the wood in the country: "a narrow gallery of alder and willow on the
   * water". Hazel goes in with them, because the lore's economy has "the wood of the
   * stream galleries" and hazel is what a gallery is cut for.
   */
  const isareosGallery = [];
  for (const course of [ISAREOS_RIVER, ...ISAREOS_BECKS]) {
    const narrow = course !== ISAREOS_RIVER;
    for (const sample of WEST_PROFILES.get(course.id)) for (let i = 0; i < 5; i++) {
      const side = random() < .5 ? -1 : 1, offset = sample.half + range(.8, narrow ? 5 : 8);
      const x = sample.x + sample.nx * offset * side, z = sample.z + sample.nz * offset * side;
      if (hexOwnerAt(x, z) !== 'Isareos' || westBareGround(x, z, 2) || westWaterSurface(x, z) !== null) continue;
      if (atIsamouth(x, z)) continue;
      if (isareosGallery.some(tree => Math.hypot(tree.x - x, tree.z - z) < 4.2)) continue;
      // Hazel is a multi-stemmed shrub the height of a house; alder and willow are trees.
      const hazel = random() < .38;
      isareosGallery.push({ x, z, hazel, wide: hazel, s: range(.85, hazel ? 1.05 : 1.3),
        h: hazel ? range(5.5, 7.5) : range(10, 15), rot: range(0, 6.28) });
    }
  }
  woodBatch(isareosGallery, isareos, tree => tree.hazel
    ? color.set('#7d9a4f').offsetHSL(range(-.02, .02), range(-.05, .05), range(-.05, .05))
    : color.set('#42663c').offsetHSL(range(-.03, .03), range(-.05, .06), range(-.06, .06)),
    'isareos-tree');

  /**
   * The thorn, and the grass. `isareosLie` says where a point stands between the
   * floor of its own valley and the shoulder above it, and the whole of Isareos's
   * scatter is read off that one number:
   *
   *  - **Thorn** below about the half-way mark, thickest on the floor, and in ones
   *    and threes and fours rather than evenly — "thorn in the hollows", and on a
   *    hill with nothing to break the wind the hollow is the only place a woody
   *    thing lives. Nothing tall enough to stand under: this is scrub.
   *  - **Grass** over the whole of it, taller and greener low down where the water
   *    collects, shorter and harder on the tops. `Cfa` grass, which is a different
   *    plant from Vastos's cold tussock and reads greener and softer than anything
   *    in the west before it.
   *  - And on the six `plains` hexes of the western rim, both thinner: the wind
   *    comes off the Ibenwood side and nothing there is sheltered.
   */
  const isareosCells = [...REGION_CELLS.Isareos].sort((a, b) => a.z - b.z || a.x - b.x);
  const isareosTerrain = new Map(SURVEY.regions.find(region => region.name === 'Isareos')
    .cells.map(cell => [`${cell.q},${cell.r}`, cell.terrain]));
  const onRim = (x, z) => { const home = hexAt(x, z); return isareosTerrain.get(`${home.q},${home.r}`) === 'plains'; };
  const hollowThorn = [];
  for (let start = 0; start < isareosCells.length; start += BLOCK) {
    const block = isareosCells.slice(start, start + BLOCK), tufts = [];
    for (const cell of block) {
      for (let i = 0; i < 46; i++) {
        const x = cell.x + range(-50, 50), z = cell.z + range(-55, 55);
        if (hexOwnerAt(x, z) !== 'Isareos' || westBareGround(x, z, 3) || westWaterSurface(x, z) !== null) continue;
        if (atIsamouth(x, z)) continue;
        const lie = isareosLie(x, z), rim = onRim(x, z);
        // Nothing on the tops, everything in the folds, and half as much on the rim.
        if (random() > (1 - smooth(.18, .62, lie)) * (rim ? .38 : .8)) continue;
        if (isareosGallery.some(tree => Math.hypot(tree.x - x, tree.z - z) < 8)) continue;
        if (hollowThorn.some(bush => Math.hypot(bush.x - x, bush.z - z) < 5.5)) continue;
        // A thicket of three or four, or a single bush: both are what the lore describes.
        //
        // **The members of a thicket keep their distance too**, and that is not tidiness.
        // The first pass spaced the parent bushes and let the clump fall where it liked,
        // and clumps merged into mats a deer could not get out of: traced through a chase,
        // a hind wedged between two of them ran on the spot for ten seconds at full speed
        // while somebody walked up to it. Three metres and a fifth between any two bushes
        // leaves a gap the width of a deer, which is what a thicket on open hill country
        // actually has.
        const clump = random() < .45 ? 1 + Math.floor(random() * 3) : 0;
        hollowThorn.push({ x, z, s: range(.85, 1.6), rot: random() * 6.28 });
        for (let k = 0; k < clump; k++) {
          const a = random() * 6.28, out = range(3.4, 5.2);
          const bx = x + Math.sin(a) * out, bz = z + Math.cos(a) * out;
          if (hexOwnerAt(bx, bz) !== 'Isareos' || westBareGround(bx, bz, 2) || westWaterSurface(bx, bz) !== null) continue;
          if (hollowThorn.some(bush => Math.hypot(bush.x - bx, bush.z - bz) < 3.2)) continue;
          hollowThorn.push({ x: bx, z: bz, s: range(.7, 1.3), rot: random() * 6.28 });
        }
      }
      for (let i = 0; i < tuftsPerHex + 30; i++) {
        const x = cell.x + range(-50, 50), z = cell.z + range(-55, 55);
        if (hexOwnerAt(x, z) !== 'Isareos' || westBareGround(x, z, 1.5) || westWaterSurface(x, z) !== null) continue;
        const lie = isareosLie(x, z), rim = onRim(x, z);
        tufts.push({ x, z, s: range(.8, 1.9) * (rim ? .74 : 1.22 - lie * .3), rot: range(0, 6.28), lie, rim });
      }
    }
    // Deep humid green on the floors, harder and paler on the tops, greyer on the rim.
    tuftBatch(tufts, isareos, tuft => color.setHSL(
      (tuft.rim ? .21 : .27) - tuft.lie * .04 + range(-.015, .015),
      (tuft.rim ? .18 : .36) - tuft.lie * .07 + range(-.05, .05),
      (tuft.rim ? .40 : .26) + tuft.lie * .10 + range(-.04, .04)));
  }

  /**
   * Hawthorn and blackthorn: low, dense, dark and wind-shaped, on the Vastos thorn's
   * geometry at a larger size, because a hedge thorn in a sheltered hollow grows
   * where a plain thorn on an open tableland cannot.
   */
  if (hollowThorn.length) {
    const batch = new THREE.InstancedMesh(round, material('#46603c', { flatShading: true }), hollowThorn.length * 3);
    let at = 0;
    for (const bush of hollowThorn) {
      const y = groundHeight(bush.x, bush.z);
      for (let lobe = 0; lobe < 3; lobe++) {
        const a = bush.rot + lobe * 2.1, spread = lobe === 2 ? 0 : .58 * bush.s;
        dummy.position.set(bush.x + Math.sin(a) * spread, y + bush.s * (lobe === 2 ? .96 : .62), bush.z + Math.cos(a) * spread);
        dummy.rotation.set(range(-.2, .2), a, range(-.2, .2));
        dummy.scale.set(bush.s * .86, bush.s * .58, bush.s * .82);
        dummy.updateMatrix(); batch.setMatrixAt(at, dummy.matrix);
        // Dark, but not a hole in the grass: photographed across two valleys the first
        // thorn read as gravel, because a lightness of .18 against a hillside of .45 is
        // a shadow and not a bush.
        batch.setColorAt(at++, color.setHSL(range(.22, .30), range(.19, .30), range(.25, .36)));
      }
      colliders.push({ x: bush.x, z: bush.z, r: .58 * bush.s, kind: 'isareos-thorn' });
    }
    batch.castShadow = true; batch.receiveShadow = true; batch.computeBoundingSphere();
    batch.name = 'Isareos hollow thorn'; isareos.add(batch); metrics.thorn += hollowThorn.length;
  }

  // -------------------------------------------------------------------------
  // Nethereum: the hollow, the meadow in it, and the threads that feed it
  // -------------------------------------------------------------------------
  /**
   * After Isareos, for the reason every country out here goes after the last one: this
   * module has one seeded stream and it is consumed in the order the district blocks are
   * written, so a country added anywhere but the end re-rolls every draw after it.
   *
   * Nethereum is grass and water and nothing else. The atlas gives it twenty-six
   * `grassland` hexes and one `plains`, and it gives it neither a `lake` hex nor a
   * `wetland` hex in a map that has both words and uses each of them twenty-eight times
   * elsewhere. So there is no Nethermere here and no marsh round it, and what is drawn is
   * the dry state of a basin that floods in spring and is grazed by midsummer: rank meadow
   * on the floor, ordinary grass up the sides, wet threads of rush and sedge where the
   * hill-streams run out, and a gallery on the water and nowhere else.
   */
  const nethereum = district('Nethereum');
  const inNethereum = (x, z) => hexOwnerAt(x, z) === 'Nethereum';
  /**
   * Ground in Nethereum something may be planted on. The same four questions Eer's asks,
   * and one more: Isamouth's reserved ground reaches across the Isa onto Nethereum's own
   * hexes — the confluence it is measured from is the corner where Isareos, Nethereum and
   * Caricas meet — so a country built after Isareos has to keep off it too.
   */
  const nethPlantable = (x, z, margin) => inNethereum(x, z)
    && !westBareGround(x, z, margin) && westWaterSurface(x, z) === null && !atIsamouth(x, z);

  const NETHEREUM_WATER = [NETH_HEAD, NETH, NETHEREUM_OUTLET, ...NETHEREUM_STREAMS];
  for (const course of NETHEREUM_WATER) ribbon(WEST_PROFILES.get(course.id), nethereum, course.name);

  /**
   * Rush and sedge at every waterline, and gravel on the Neth's ford, which is gravel by
   * definition — it is the only part of that river shallow enough to walk through.
   *
   * The Isa is in this loop as well as in Isareos's, and only its Nethereum bank comes of
   * it: `hexOwnerAt` is strict, so the far bank's rushes belong to whichever country's hex
   * they stand on. The river was built with Isareos and is not rebuilt here.
   */
  const nethSedge = [], nethGravel = [];
  for (const course of [...NETHEREUM_WATER, ISAREOS_RIVER]) for (const sample of WEST_PROFILES.get(course.id)) {
    if (sample.index % 2) continue;
    for (const side of [-1, 1]) {
      const offset = sample.half + range(.3, 2.6);
      const x = sample.x + sample.nx * offset * side, z = sample.z + sample.nz * offset * side;
      if (!inNethereum(x, z) || westWaterSurface(x, z) !== null) continue;
      if (course === NETH && sample.ford) nethGravel.push({ x, z, s: range(.2, .62), rot: random() * 6.28 });
      else nethSedge.push({ x, z, s: range(.8, 1.7), rot: random() * 6.28 });
    }
  }

  /**
   * **The wet threads**, which are the thing this country has instead of a lake.
   *
   * Each hill-stream gives its channel up on the hollow's floor (`taper`), and what a
   * stream that has stopped being a stream leaves behind is a line of wetter ground running
   * on across the meadow. The lore has them by name — "the wet threads that remain in the
   * basin after the water recedes yield rush and sedge" — and the brief is careful about
   * what they are not: "not a marsh, a wet line in a field, of the kind that tells a walker
   * where to put his feet".
   *
   * So each thread is carried on from where its stream dries, straight down the fall toward
   * the floor's lowest ground, and sown with rush in a band six metres wide that frays as it
   * goes. Nothing is cut and nothing stands in water: the ground under them is the ordinary
   * floor of the hollow.
   */
  for (const stream of NETHEREUM_STREAMS) {
    const end = WEST_PROFILES.get(stream.id).at(-1);
    const toward = Math.atan2(NETHEREUM_HOLLOW.x - end.x, NETHEREUM_HOLLOW.z - end.z);
    for (let along = 4; along < 150; along += 3.5) {
      const fray = 2.2 + along * .035;
      for (let i = 0; i < 3; i++) {
        const across = range(-fray, fray);
        const x = end.x + Math.sin(toward) * along + Math.cos(toward) * across;
        const z = end.z + Math.cos(toward) * along - Math.sin(toward) * across;
        if (!nethPlantable(x, z, 1.5)) continue;
        // The thread is only a thread where the ground is low enough to hold water.
        if (nethereumWet(x, z) < .55) continue;
        nethSedge.push({ x, z, s: range(.7, 1.5), rot: random() * 6.28 });
      }
    }
  }
  gravelBatch(nethGravel, nethereum, 'Neth ford gravel');
  sedgeBatch(nethSedge, nethereum, 'Nethereum rush and sedge');

  /**
   * The gallery: willow and alder on the water and nowhere else, which on the atlas's
   * reading is the whole of the wood in the country. No `forest` hex here either, in a map
   * that uses the word freely in the Ibenwood two hexes west.
   *
   * Planted off the water rather than off the hex grid, for the reason the Carica corridor
   * is and Eer's channels were: a hex is a hundred metres and a gallery is eight, so
   * scattering from cell centres would put nearly every attempt on open meadow. The three
   * hill-streams get a thinner one than the rivers do — a stream a stride across on open
   * grass carries a willow here and there, not a ribbon.
   */
  const nethGallery = [];
  for (const course of [ISAREOS_RIVER, NETH, NETH_HEAD, NETHEREUM_OUTLET, ...NETHEREUM_STREAMS]) {
    const narrow = course !== ISAREOS_RIVER && course !== NETH;
    for (const sample of WEST_PROFILES.get(course.id)) for (let i = 0; i < (narrow ? 2 : 5); i++) {
      const side = random() < .5 ? -1 : 1, offset = sample.half + range(.8, narrow ? 4.5 : 8);
      const x = sample.x + sample.nx * offset * side, z = sample.z + sample.nz * offset * side;
      if (!nethPlantable(x, z, 2)) continue;
      if (nethGallery.some(tree => Math.hypot(tree.x - x, tree.z - z) < (narrow ? 8 : 4.4))) continue;
      // Willow is a low broad-crowned thing on a wet bank; alder goes up straight beside it.
      const willow = random() < .55;
      nethGallery.push({ x, z, willow, wide: willow, s: range(.85, willow ? 1.15 : 1.3),
        h: willow ? range(6.5, 9) : range(10, 14.5), rot: range(0, 6.28) });
    }
  }
  // Willow is a paler, greyer, yellower green than alder, which is about as dark as a
  // broadleaf gets. Hex rather than setHSL, for the reason every crown out here is: a
  // lightness picked for sRGB comes back two stops paler through the working colour space.
  woodBatch(nethGallery, nethereum, tree => tree.willow
    ? color.set('#7f9a58').offsetHSL(range(-.02, .02), range(-.05, .05), range(-.05, .05))
    : color.set('#3e5f38').offsetHSL(range(-.03, .03), range(-.05, .06), range(-.06, .06)),
    'nethereum-tree');

  /**
   * The meadow, which is nearly the whole of Nethereum. One number decides all of it —
   * `nethereumWet`, which is how far into the hollow a point stands — and there are three
   * things to say with it:
   *
   *  - **On the floor**, rank wet meadow: tall, bright, soft, "the richest pasture in the
   *    inner branch country" and the greenest ground anywhere in the west. It is meant to be
   *    a shock two countries east of a desert.
   *  - **Up the sides and over the rim**, ordinary humid grass: shorter, harder, darker.
   *  - **On the one `plains` hex** in the north-western corner, outside the catchment
   *    altogether: thinner, shorter and greyer, the same thing Isareos's western rim does.
   *
   * No thorn, no scrub and no rock. The atlas gives this country no `hills` hex and the lore
   * gives it a basin floor that is under water every spring; a woody thing that is not on the
   * water would be a lie about both.
   */
  const nethereumCells = [...REGION_CELLS.Nethereum].sort((a, b) => a.z - b.z || a.x - b.x);
  const nethereumTerrain = new Map(SURVEY.regions.find(region => region.name === 'Nethereum')
    .cells.map(cell => [`${cell.q},${cell.r}`, cell.terrain]));
  const onDryCorner = (x, z) => { const home = hexAt(x, z); return nethereumTerrain.get(`${home.q},${home.r}`) === 'plains'; };
  for (let start = 0; start < nethereumCells.length; start += BLOCK) {
    const block = nethereumCells.slice(start, start + BLOCK), tufts = [];
    for (const cell of block) {
      // Half again as much grass as Isareos carries, because this is the wettest open
      // ground in the game and it should read as a crop somebody could cut twice.
      for (let i = 0; i < tuftsPerHex + 58; i++) {
        const x = cell.x + range(-50, 50), z = cell.z + range(-55, 55);
        if (!nethPlantable(x, z, 1.5)) continue;
        const wet = nethereumWet(x, z), dry = onDryCorner(x, z);
        tufts.push({ x, z, s: range(.8, 2) * (dry ? .68 : .95 + wet * .45), rot: range(0, 6.28), wet, dry });
      }
    }
    // Deep wet green on the floor, harder and paler up the sides, grey on the dry corner.
    tuftBatch(tufts, nethereum, tuft => color.setHSL(
      (tuft.dry ? .19 : .28) + tuft.wet * .02 + range(-.015, .015),
      (tuft.dry ? .17 : .34) + tuft.wet * .12 + range(-.05, .05),
      (tuft.dry ? .42 : .30) - tuft.wet * .04 + range(-.04, .04)));
  }

  function update(time) {
    waterMaterial.uniforms.time.value = time;
    // Steam rises and thins. The plume is four puffs on one column, so lifting
    // the column and breathing its scale is enough at the distance it is seen from.
    for (const plume of plumes) {
      plume.group.children.forEach((puff, index) => {
        const phase = time * .55 + plume.phase + index * .9;
        puff.position.y = .5 + index * .9 + Math.sin(phase) * .28;
        const breath = 1 + Math.sin(phase * .8) * .13;
        puff.scale.set((.5 + index * .35) * breath, (.4 + index * .3) * breath, (.5 + index * .35) * breath);
      });
    }
  }

  return { metrics, waterMaterial, districts, update };
}

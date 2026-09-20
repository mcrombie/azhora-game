import * as THREE from 'three';
import { regionNameAt, REGION_CELLS, SURVEY, hexAt } from './region-world.js';
import { WORLD_SCALE } from './world-scale.js';
import {
  VASTOS_RIVER, VASTOS_BECK, VASTOS_BRAID, VASTOS_PANS, VASTOS_BASINS, VASTOS_SINTER,
  MENETH_BECKS, LIZEEM, CARICA, CARICA_CORRIDOR, ELA_SOUTH_REACH, NESDOR_BECK, WEST_BRAIDS, WEST_POOLS,
  westBareGround, courseDistance, caricaCorridorDistance,
} from './west-regions.js';
import { WEST_PROFILES, poolSurface, westWaterSurface, westGroundAt, menethBand, braidThreadOffset } from './west-ground.js';

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
  const inVastos = (x, z) => regionNameAt(x, z) === 'Vastos';

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
      if (regionNameAt(x, z) !== 'Meneth' || westWaterSurface(x, z) !== null) continue;
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
        if (regionNameAt(x, z) !== 'Meneth' || westBareGround(x, z, 3)) continue;
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
        if (regionNameAt(x, z) !== 'Meneth' || westBareGround(x, z, 2) || menethBand(x, z) !== 'wood') continue;
        rocks.push({ x, z, s: range(.4, 1.5), rot: range(0, 6.28) });
      }
      for (let i = 0; i < tuftsPerHex; i++) {
        const x = cell.x + range(-50, 50), z = cell.z + range(-55, 55);
        if (regionNameAt(x, z) !== 'Meneth' || westBareGround(x, z, 1.5)) continue;
        tufts.push({ x, z, s: range(.7, 1.6), rot: range(0, 6.28), floor: menethBand(x, z) === 'floor' });
      }
    }
    // Chestnut and walnut are a warmer, yellower green than the hardwood above them.
    woodBatch(trees, meneth, tree => tree.wide
      ? color.setHSL(range(.20, .25), range(.30, .42), range(.33, .43))
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
    for (let i = 0; i < 16; i++) {
      const side = random() < .5 ? -1 : 1, offset = sample.half + range(1.5, CARICA_CORRIDOR.bankReach);
      const x = sample.x + sample.nx * offset * side, z = sample.z + sample.nz * offset * side;
      if (regionNameAt(x, z) !== 'Caricas' || westBareGround(x, z, 2.5)) continue;
      if (corridorTrees.some(tree => Math.hypot(tree.x - x, tree.z - z) < 3.4)) continue;
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
        if (regionNameAt(x, z) !== 'Caricas' || westBareGround(x, z, 3)) continue;
        const here = caricasWood(x, z);
        if (random() * 40 > here) continue;
        if (trees.some(tree => Math.hypot(tree.x - x, tree.z - z) < 5.4)) continue;
        if (corridorTrees.some(tree => Math.hypot(tree.x - x, tree.z - z) < 4.4)) continue;
        trees.push({ x, z, old: false, wide: true, s: range(.85, 1.2), h: range(8.5, 12.5), rot: range(0, 6.28) });
      }
      // Stone belongs to the shelf, which the lore calls rougher and less well-watered.
      for (let i = 0; i < 34; i++) {
        const x = cell.x + range(-50, 50), z = cell.z + range(-55, 55);
        if (regionNameAt(x, z) !== 'Caricas' || westBareGround(x, z, 2)) continue;
        if (random() > smooth(-2050, -1780, x)) continue;
        rocks.push({ x, z, s: range(.4, 1.7), rot: range(0, 6.28) });
      }
      for (let i = 0; i < tuftsPerHex; i++) {
        const x = cell.x + range(-50, 50), z = cell.z + range(-55, 55);
        if (regionNameAt(x, z) !== 'Caricas' || westBareGround(x, z, 1.5)) continue;
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
  for (const course of [LIZEEM, CARICA]) for (const sample of WEST_PROFILES.get(course.id)) {
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
  for (const braid of WEST_BRAIDS.filter(item => item.id !== 'vastos'))
    braidThreads(braid).forEach((thread, index) => ribbon(thread, nesdor, `${braid.course.name} thread ${index + 1}`, braid.half));

  /**
   * Sand, not gravel. The lore is specific about what the Flats are made of —
   * "the dark alluvial material that centuries of river sediment have deposited"
   * — and what a slow river drops on ground like that is sand, in long low bars
   * between the channels rather than banks of shingle.
   */
  const flatsSand = [], flatsSedge = [];
  for (const braid of WEST_BRAIDS.filter(item => item.id !== 'vastos')) {
    for (const sample of WEST_PROFILES.get(braid.course.id)) {
      const offset = braidThreadOffset(braid, sample.along);
      if (offset === null) continue;
      for (let i = 0; i < 6; i++) {
        const side = random() < .5 ? -1 : 1, out = range(sample.half + .5, offset + braid.half + 7);
        const x = sample.x + sample.nx * out * side, z = sample.z + sample.nz * out * side;
        if (regionNameAt(x, z) !== 'Nesdor' || westWaterSurface(x, z) !== null) continue;
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
        if (regionNameAt(x, z) !== 'Nesdor' || westBareGround(x, z, 4)) continue;
        const kind = nesdorTerrainAt(x, z);
        if (kind === 'plains' || random() * 60 > (kind === 'forest' ? 58 : 20)) continue;
        if (trees.some(tree => Math.hypot(tree.x - x, tree.z - z) < 4.6)) continue;
        // Hazel is a multi-stemmed shrub the height of a house; oak is a tree.
        const oak = random() < .34;
        trees.push({ x, z, oak, wide: oak, s: range(.8, oak ? 1.3 : 1), h: oak ? range(11, 15) : range(6, 8.5), rot: range(0, 6.28) });
      }
      for (let i = 0; i < tuftsPerHex + 6; i++) {
        const x = cell.x + range(-50, 50), z = cell.z + range(-55, 55);
        if (regionNameAt(x, z) !== 'Nesdor' || westBareGround(x, z, 1.5)) continue;
        tufts.push({ x, z, s: range(.7, 1.7), rot: range(0, 6.28), floor: nesdorTerrainAt(x, z) === 'plains' });
      }
    }
    woodBatch(trees, nesdor, tree => tree.oak
      ? color.set('#4f6b3e').offsetHSL(range(-.02, .02), range(-.05, .05), range(-.05, .06))
      : color.setHSL(range(.20, .26), range(.28, .40), range(.30, .40)), 'nesdor-tree');
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

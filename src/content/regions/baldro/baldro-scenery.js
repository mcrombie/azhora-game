import { forEachBuild } from '../../../world/loading/build-each.js';
import { finishBuild } from '../../../world/loading/build-steps.js';
import * as THREE from 'three';
import { createSceneryBuilder } from '../../../world/scenery/scenery-builder.js';
import { registerWorldTree, worldTreeId } from '../../../world/scenery/tree-registry.js';
import { treeGroundingOffset } from '../../../world/scenery/tree-grounding.js';
import { BALDRO_KINGDOMS, BALDRO_BOUNDS, BALDRO_PATHS, BALDRO_RIVERS, baldroCellAt, baldroPathDistance, baldroWaterAt } from './baldro-world.js';

const CHUNK = 96, TAU = Math.PI * 2;
const geometry = {
  trunk: new THREE.CylinderGeometry(.72, 1, 1, 7),
  crown: new THREE.IcosahedronGeometry(1, 1),
  cone: new THREE.ConeGeometry(1, 1, 7),
  stone: new THREE.IcosahedronGeometry(1, 0),
  blade: new THREE.ConeGeometry(1, 1, 3),
};
const tones = {
  'stone-pine': ['#78624d', '#4e705a'],
  'silver-fir': ['#706c5a', '#365b4d'],
  'silver-birch': ['#d0cfb7', '#82976b'],
  'common-juniper': ['#786f5a', '#697e67'],
};

/** The surface country is visibly worked and inhabited; the cities themselves
 * are underground. Gate permission and transport belong to the city controller.
 * Every living tree keeps its ordinary species, collision and felling handles. */
export function buildBaldroScenery(...args) { return finishBuild(buildBaldroScenerySteps(...args)); }

export function* buildBaldroScenerySteps(scene, { heightAt, treeGroundAt = heightAt,
  colliders = [], isReserved = () => false } = {}) {
  let buildWork = 0;
  const root = new THREE.Group(); root.name = 'Baldro mountain countries'; scene.add(root);
  const stats = { trees: 0, rocks: 0, tufts: 0, shrubs: 0, flowers: 0, batches: 0,
    entrances: 0, outbuildings: 0, cairns: 0, sluices: 0, rivers: 0, byRegion: {} };
  const landmarks = [], entrances = [], taskSites = [], piecesByChunk = new Map(), pendingTrees = [];
  const reservations = [], matrices = new THREE.Object3D(), colour = new THREE.Color();
  let seed = 582971;
  const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  const range = (a, b) => a + (b - a) * random();
  const reserve = (x, z, hx, hz = hx) => reservations.push({ minX: x - hx, maxX: x + hx, minZ: z - hz, maxZ: z + hz });
  const reserved = (x, z, margin = 0) => isReserved(x, z, margin) || reservations.some(b =>
    x + margin > b.minX && x - margin < b.maxX && z + margin > b.minZ && z - margin < b.maxZ);
  const block = (x, z, hx, hz, minY, maxY, kind = 'baldro-masonry') =>
    colliders.push({ x, z, hx, hz, minY, maxY, kind });
  const groundGrade = (x, z, d = 1.3) => Math.hypot(
    (heightAt(x + d, z) - heightAt(x - d, z)) / (2 * d),
    (heightAt(x, z + d) - heightAt(x, z - d)) / (2 * d));
  function part(type, tint, x, y, z, sx, sy, sz, yaw = 0, roll = 0) {
    const key = `${Math.floor(x / CHUNK)},${Math.floor(z / CHUNK)}:${type}`;
    if (!piecesByChunk.has(key)) piecesByChunk.set(key, { type, pieces: [] });
    matrices.position.set(x, y, z); matrices.scale.set(sx, sy, sz); matrices.rotation.set(0, yaw, roll); matrices.updateMatrix();
    const piece = { matrix: matrices.matrix.clone(), tint }; piecesByChunk.get(key).pieces.push(piece); return piece;
  }
  function lamp(b, x, y, z, brass) {
    b.block('#43494a', x, y, z, .65, 1.2, .65);
    b.block(brass, x, y + 1.2, z, .85, .18, .85);
    b.block('#efc882', x, y + 1.38, z, .38, .72, .38);
    for (const dx of [-.28, .28]) for (const dz of [-.28, .28]) b.block('#4f5552', x + dx, y + 1.35, z + dz, .08, .84, .08);
    b.cone(brass, x, y + 2.13, z, .65, .45, Math.PI / 4, 4);
  }
  function gate(kingdom) {
    const { x, z, y: gateY, yaw = 0 } = kingdom.gate, y = gateY ?? heightAt(x, z);
    const east = kingdom.id === 'east-baldro', stone = east ? '#7d8684' : '#8b8270';
    const pale = east ? '#b5b9aa' : '#beb297', dark = east ? '#535d61' : '#655d51';
    const metal = east ? '#b28d5f' : '#98805b', accent = east ? '#517b78' : '#6a6d79';
    const b = createSceneryBuilder(`${kingdom.name} mountain gate`);
    reserve(x, z - 3, 37, 28);
    b.patch(east ? '#7d8172' : '#92846b', treeGroundAt, x, z + 13, 46, 27, yaw, .03, 12);
    b.frame(x, y, z, yaw, () => {
      // Closed rock and dressed masonry behind the threshold prevent a view
      // into an exposed trench. The separate underground scene owns the city.
      b.block(dark, 0, -13, -10, 64, 41, 18);
      // The dressed front is cut into an irregular rock shoulder. Keep the
      // plain backing below its old roofline and bury its rear corners in
      // stone, rather than displaying a freestanding rectangular box.
      for (const side of [-1, 1]) {
        b.rock(east ? '#7b8379' : '#898a7f', side * 28, 10.5, -10, 7.5, 18, 11, side * .2);
        b.rock(east ? '#859080' : '#979889', side * 20.5, 24, -18, 12, 13, 11, side * .3);
        b.rock(east ? '#737d73' : '#7e8176', side * 31, .9, -3.5, 4.5, 3.8, 5, side * .6);
      }
      b.block(stone, 0, -6, -5, 50, 33, 9);
      for (const side of [-1, 1]) {
        b.block(stone, side * 12.5, -4, -.8, 17, 25, 4);
        b.block(pale, side * 6.1, -.6, .8, 2.4, 14.5, 3.2);
        b.block(dark, side * 6.1, -.3, 2.5, .6, 14.5, .25);
        b.block(pale, side * 23, -4, -1, 4.3, 30, 8);
        b.block(dark, side * 23, 22, 2.8, 5.2, 1, 1.4);
        b.block(pale, side * 23, 26, -1, 5.8, 1.2, 8.7);
        for (let row = 0; row < 6; row++) {
          b.box(dark, side * 14, 2 + row * 3.8, 1.24, 12, .12, .1);
          b.box(pale, side * (11 + row % 2 * 5), 3.7 + row * 3.8, 1.25, .10, 3.3, .12);
        }
        // Monumental abstract hammers west, mineral chevrons east: civic
        // stonework without inventing a named hero or a new religious symbol.
        b.block(dark, side * 14.8, 5.8, 1.4, 5.8, 8.5, .7);
        if (east) for (let i = 0; i < 3; i++) {
          b.beam(metal, [side * 14.8 - 1.8, 8 + i * 1.9, 1.83], [side * 14.8, 6.8 + i * 1.9, 1.83], .3);
          b.beam(metal, [side * 14.8, 6.8 + i * 1.9, 1.83], [side * 14.8 + 1.8, 8 + i * 1.9, 1.83], .3);
        } else {
          b.block(pale, side * 14.8, 7.1, 1.9, .55, 5.4, .55);
          b.box(pale, side * 14.8, 12.3, 1.9, 3.8, 1.5, .9);
        }
        lamp(b, side * 8.5, 0, 7, metal);
        // The retaining parapets flank the approach; the full middle stays open.
        b.block(dark, side * 19.8, -3, 9.5, 1.3, 4, 16);
        b.block(pale, side * 19.8, 1, 9.5, 1.7, .35, 16.5);
      }
      b.block(dark, 0, 0, .3, 9.8, 11.5, 1.2);
      b.block('#343d3d', -2.27, .12, 1, 4.35, 10.8, .42);
      b.block('#343d3d', 2.27, .12, 1, 4.35, 10.8, .42);
      for (const side of [-1, 1]) for (let i = 0; i < 4; i++) {
        b.box(metal, side * 2.27, 1.3 + i * 2.7, 1.26, 4.25, .22, .16);
        b.box(accent, side * (1.05 + i * .8), 5.5, 1.25, .15, 9.5, .13);
      }
      b.block(pale, 0, 11.2, 1, 15.5, 2.1, 4);
      b.block(dark, 0, 13.3, 1.2, 16.5, .5, 4.3);
      b.block(pale, 0, 13.8, -.1, 13, 2.4, 3);
      for (let i = -3; i <= 3; i++) b.box(metal, i * 1.4, 15, 1.49, .3, 1, .12);
      if (east) {
        // Copper-covered stepped pediment and long ventilation slots.
        for (let i = 0; i < 4; i++) b.block(i % 2 ? metal : accent, 0, 16.3 + i * 1.05, -1, 20 - i * 3.6, .7, 4);
        for (let i = -3; i <= 3; i++) b.block('#303e40', i * 3, 23.5, -.45, 1.3, 2, .3);
      } else {
        b.block(pale, 0, 16.3, -1, 9, 5.5, 4);
        b.box(dark, 0, 20, 1.12, 6.5, .45, .25);
        b.block(metal, 0, 17.2, 1.1, .5, 3.6, .3);
        b.box(metal, 0, 20.5, 1.15, 3.5, .8, .3);
      }
      // A single inset pair of doors reads as a threshold. No open exterior
      // street is hidden behind this facade or used to bypass earned admission.
      b.box(pale, 0, .025, 3.7, 9.8, .10, 6);
    });
    const mesh = b.finish(root);
    block(x - 16, z - 3.1, 10.7, 5.1, y - 7, y + 31);
    block(x + 16, z - 3.1, 10.7, 5.1, y - 7, y + 31);
    block(x, z - 10, 32, 8, y - 13, y + 34);
    for (const side of [-1, 1]) {
      colliders.push({ x: x + side * 28, z: z - 10, r: 5.1, minY: y - 7.5, maxY: y + 28.5, kind: 'baldro-buttress' });
      colliders.push({ x: x + side * 20.5, z: z - 18, r: 7.2, minY: y + 11, maxY: y + 37, kind: 'baldro-buttress' });
      colliders.push({ x: x + side * 31, z: z - 3.5, r: 3.2, minY: y - 2.9, maxY: y + 4.7, kind: 'baldro-buttress' });
    }
    // The exterior door stays visibly closed; the host admits and transports
    // the visitor from the clear threshold in front of it. Its solid leaf must
    // not be walk-through even after permission has been earned.
    colliders.push({ id: 'baldro-gate-door', kingdom: kingdom.id, kind: 'baldro-portal',
      x, z: z + .6, hx: 4.9, hz: .7, minY: y, maxY: y + 11.5 });
    for (const side of [-1, 1]) {
      block(x + side * 19.8, z + 9.5, .8, 8.3, y - 3, y + 1.4);
      block(x + side * 8.5, z + 7, .55, .55, y, y + 2.5);
    }
    const entry = { id: `${kingdom.id}-entrance`, kingdom: kingdom.id, region: kingdom.region,
      name: `${kingdom.name} mountain gate`, x, y, z, yaw, mesh, portal: { x, y, z: z + 2.2, width: 8.5, height: 10.8 } };
    entrances.push(entry); landmarks.push({ id: entry.id, name: entry.name, region: kingdom.region, x, z, radius: 34 }); stats.entrances++;
  }
  function task(kingdom, site, index) {
    const east = kingdom.id === 'east-baldro';
    let tangent = { x: 0, z: 1 }, nearest = Infinity;
    for (const path of BALDRO_PATHS) for (let i = 1; i < path.points.length; i++) {
      const a = path.points[i - 1], b = path.points[i], dx = b.x - a.x, dz = b.z - a.z, length = Math.hypot(dx, dz);
      const t = Math.max(0, Math.min(1, ((site.x - a.x) * dx + (site.z - a.z) * dz) / (length * length || 1)));
      const d = Math.hypot(site.x - a.x - dx * t, site.z - a.z - dz * t);
      if (length && d < nearest) { nearest = d; tangent = { x: dx / length, z: dz / length }; }
    }
    // Put the solid working object on the verge and retain the given clear
    // interaction stand. Its side follows the actual curved path, not north.
    const distance = east ? 5.8 : 4.4;
    const centres = [-1, 1].map(side => ({ x: site.x + tangent.z * side * distance, z: site.z - tangent.x * side * distance }));
    centres.sort((a, b) => baldroPathDistance(b.x, b.z) - baldroPathDistance(a.x, a.z));
    const centre = centres[0], x = centre.x, z = centre.z + (east ? 3.8 : 3.4), y = heightAt(centre.x, centre.z);
    reserve(site.x, site.z, 12); reserve(centre.x, centre.z, east ? 4.5 : 2.5);
    const base = createSceneryBuilder(site.name);
    const broken = createSceneryBuilder(`${site.name} awaiting work`);
    const repaired = createSceneryBuilder(`${site.name} maintained`);
    base.patch('#8e8978', treeGroundAt, x, z, 7, 6, 0, .025, 6);
    if (!east) {
      // Work sits north of the arrival point, leaving the marker's south side
      // and the player's interaction position completely clear.
      for (let level = 0; level < 4; level++) for (let i = 0; i < 5 - level; i++) {
        const a = i / (5 - level) * TAU + level * .4, spread = 1.05 - level * .18;
        base.rock(level % 2 ? '#929285' : '#767e79', x + Math.sin(a) * spread, y + .25 + level * .42,
          z - 3.4 + Math.cos(a) * spread, .72 - level * .07, .36, .56 - level * .05, a);
      }
      broken.rock('#b4ac91', x + 2.1, treeGroundAt(x + 2.1, z - 1.4) + .2, z - 1.4, .9, .28, .62, .8);
      repaired.rock('#b4ac91', x, y + 2.05, z - 3.4, .84, .32, .64);
      repaired.block('#b5a477', x, y + 2.26, z - 3.4, .15, 1.6, .15);
      repaired.box('#e2cf9a', x + .24, y + 3.47, z - 3.4, .7, .38, .07);
      block(x, z - 3.4, 1.6, 1.6, y - .4, y + 2.6, 'baldro-cairn'); stats.cairns++;
    } else {
      // Small lined runoff sluices are built works, not invented mapped rivers
      // or lakes. The channel ends in a covered drain beside the clear path.
      base.block('#606d6d', x, y - .45, z - 3.8, 6, .5, 5.6);
      for (const side of [-1, 1]) base.block('#9a9e91', x + side * 2.7, y - .1, z - 3.8, .65, .78, 5.8);
      base.block('#969b8e', x, y - .1, z - 6.4, 6, .8, .65);
      base.block('#444e4e', x, y + .15, z - 1.5, 4.6, .14, .5);
      for (let i = -4; i <= 4; i++) base.block('#b09d76', x + i * .46, y + .28, z - 1.5, .12, .12, .65);
      for (const dx of [-1.7, 1.7]) base.block('#677275', x + dx, y + .1, z - 4.4, .28, 2.4, .3);
      base.box('#938566', x, y + 2.27, z - 4.4, 4.3, .25, .3);
      base.block('#997750', x, y + .18, z - 4.4, 3.2, .95, .22);
      for (let i = 0; i < 7; i++) broken.rock(i % 2 ? '#7c7866' : '#646e68', x - 1.65 + i * .55,
        y + .32 + i % 2 * .12, z - 2.7 + i % 2 * .6, .53, .42, .44, i);
      repaired.box('#477979', x, y + .18, z - 3.5, 4.6, .055, 3.9);
      for (let i = 0; i < 6; i++) repaired.box('#96b5aa', x - 1.9 + i * .71, y + .212, z - 2.1 - i % 3 * .55, .07, .015, .5);
      block(x, z - 3.8, 3.1, 2.9, y - .5, y + .75, 'baldro-sluice'); stats.sluices++;
    }
    base.finish(root); const damagedMesh = broken.finish(root), completeMesh = repaired.finish(root); completeMesh.visible = false;
    taskSites.push({ ...site, region: kingdom.region, kingdom: kingdom.id, prop: { ...centre, y }, damagedMesh, completeMesh });
    landmarks.push({ id: site.id, name: site.name, region: kingdom.region, x: site.x, z: site.z, radius: 10 });
  }
  function workshop(kingdom, site, index) {
    const east = kingdom.id === 'east-baldro';
    // Work yards stand on their own small foundations off the serviced route.
    const candidates = [[16, 9], [-16, 9], [19, -2], [-19, -2]];
    const plot = candidates.map(([dx, dz]) => ({ x: site.x + dx, z: site.z + dz }))
      .find(p => baldroCellAt(p.x, p.z)?.region === kingdom.region && baldroPathDistance(p.x, p.z) > 6 && groundGrade(p.x, p.z) < .8 && !reserved(p.x, p.z, 5));
    if (!plot) return;
    const { x, z } = plot, y = Math.max(...[[-4, -3], [4, -3], [-4, 3], [4, 3]].map(([dx, dz]) => treeGroundAt(x + dx, z + dz)));
    reserve(x, z, 9, 8);
    const b = createSceneryBuilder(`${kingdom.name} ${east ? 'ore sorting shelter' : 'route work shelter'} ${index + 1}`);
    b.block('#777e76', x, y - 5, z, 9, 5.2, 7);
    b.block(east ? '#979c8d' : '#99917b', x, y, z - 2.6, 8.7, 3.7, .7);
    for (const dx of [-3.9, 3.9]) for (const dz of [-2.5, 2.6]) b.block('#695e47', x + dx, y, z + dz, .44, 3.8, .44);
    b.roof(east ? '#536f6d' : '#696d69', x, y + 3.7, z, 10.3, 8, 2.2);
    b.block('#655847', x - 1.7, y + .3, z - 1, 2.7, .7, 1.5);
    b.block('#797669', x + 1.8, y + .2, z - 1, 1.4, .9, 1.4);
    for (let i = 0; i < 5; i++) b.rock(east ? '#947c66' : '#9c9c8b', x - 2.7 + i * .9, y + .36, z + .8, .45, .28, .33, i);
    b.finish(root); block(x, z - 2.6, 4.4, .4, y - 5, y + 4); block(x, z, 4.5, 3.5, y - 5, y + .22);
    stats.outbuildings++; landmarks.push({ id: `${site.id}-workyard`, name: east ? 'Ore sorting shelter' : 'Route work shelter', region: kingdom.region, x, z, radius: 9 });
  }
  for (const kingdom of BALDRO_KINGDOMS) { if (++buildWork % 32 === 0) yield;
    stats.byRegion[kingdom.region] = { trees: 0, rocks: 0, shrubs: 0, tufts: 0 };
    reserve(kingdom.arrival.x, kingdom.arrival.z, 8); gate(kingdom); yield;
    yield* forEachBuild(kingdom.taskSites, function* (site, index) { task(kingdom, site, index); yield; });
    yield* forEachBuild(kingdom.taskSites, function* (site, index) { workshop(kingdom, site, index); yield; });
  }
  function tree(x, z, species, height, region) {
    const y = treeGroundAt(x, z), [bark, leaf] = tones[species];
    const radius = height * (species === 'silver-birch' ? .021 : .029), bole = height * .78;
    const trunk = part('trunk', bark, x, y + bole / 2, z, radius, bole, radius);
    const offset = treeGroundingOffset(trunk.matrix, treeGroundAt, { radius: 1, segments: 7, embed: .035 });
    trunk.matrix.elements[13] += offset;
    const pieces = [trunk], baseY = y + offset;
    if (species === 'silver-fir') {
      for (let level = 0; level < 4; level++) pieces.push(part('cone', leaf,
        x, baseY + height * (.34 + level * .18), z,
        height * (.225 - level * .044), height * .38,
        height * (.225 - level * .044), range(0, TAU)));
    } else {
      const pine = species === 'stone-pine', low = species === 'common-juniper';
      for (let i = 0; i < 3; i++) {
        const a = i * TAU / 3 + x * .019, spread = height * (pine ? .18 : .13);
        pieces.push(part('crown', leaf, x + Math.cos(a) * spread, baseY + height * (low ? .57 : .74) + i * height * .06,
          z + Math.sin(a) * spread, height * (pine ? .25 : .21), height * (pine ? .13 : .24), height * .21, a));
      }
      if (species === 'silver-birch') for (let i = 0; i < 4; i++) pieces.push(part('trunk', '#73796a', x,
        baseY + bole * (.17 + i * .18), z, radius * 1.015, .1, radius * 1.015));
    }
    const collider = { x, z, r: radius, kind: 'baldro-tree' }; colliders.push(collider);
    pendingTrees.push({ descriptor: { id: worldTreeId('baldro-tree', x, z), region, species, x, z, y, height,
      radius, base: { x, y: baseY, z } }, pieces, collider });
    stats.byRegion[region].trees++;
  }
  const b = BALDRO_BOUNDS;
  for (let z0 = b.minZ + 4; z0 < b.maxZ; z0 += 11) { if (++buildWork % 32 === 0) yield; for (let x0 = b.minX + 4; x0 < b.maxX; x0 += 11) { if (++buildWork % 32 === 0) yield;
    const x = x0 + range(-4.2, 4.2), z = z0 + range(-4.2, 4.2), cell = baldroCellAt(x, z);
    if (!cell || reserved(x, z, 6) || baldroPathDistance(x, z) < 6.5 || baldroWaterAt(x, z) !== null) continue;
    const y = heightAt(x, z), grade = groundGrade(x, z), west = cell.region === 52;
    if (grade > .98 || y < 10 || y > (west ? 310 : 285)) continue;
    const patch = .57 + .34 * Math.sin(x * .016 + Math.sin(z * .021)) * Math.cos(z * .022);
    const cover = (west ? .52 : .91) * patch * Math.max(.1, Math.min(1, ((west ? 315 : 295) - y) / 115));
    if (random() > cover) continue;
    const upland = y > 220, v = random();
    const species = upland ? v < .54 ? 'common-juniper' : 'stone-pine'
      : west ? v < .65 ? 'stone-pine' : v < .82 ? 'silver-birch' : 'common-juniper'
        : v < .48 ? 'silver-fir' : v < .77 ? 'silver-birch' : 'stone-pine';
    const height = species === 'common-juniper' ? range(1.8, 3.8) : range(8, 18.5) * (upland ? .62 : 1);
    tree(x, z, species, height, cell.region);
  } }
  for (let z0 = b.minZ + 2; z0 < b.maxZ; z0 += 7.5) { if (++buildWork % 32 === 0) yield; for (let x0 = b.minX + 2; x0 < b.maxX; x0 += 7.5) { if (++buildWork % 32 === 0) yield;
    const x = x0 + range(-2.8, 2.8), z = z0 + range(-2.8, 2.8), cell = baldroCellAt(x, z);
    if (!cell || reserved(x, z, 1.5) || baldroPathDistance(x, z) < 3.8 || baldroWaterAt(x, z) !== null) continue;
    const y = treeGroundAt(x, z), grade = groundGrade(x, z), west = cell.region === 52, local = stats.byRegion[cell.region];
    if (y < 8) continue;
    if (random() < (west ? .41 : .25) + Math.min(.3, grade * .15)) {
      const r = range(.32, 1.2), h = r * range(.35, .68);
      part('stone', west ? random() < .5 ? '#929085' : '#7e847c' : random() < .5 ? '#74817e' : '#958e7c',
        x, y + h * .22, z, r, h, r * range(.65, 1.3), range(0, TAU), range(-.2, .2));
      stats.rocks++; local.rocks++;
    }
    if (grade > .95 || y > 360 || random() > .66) continue;
    for (let i = 0; i < 3; i++) { if (++buildWork % 32 === 0) yield;
      const px = x + range(-.45, .45), pz = z + range(-.45, .45), h = range(.18, .49);
      part('blade', west ? '#8b9669' : '#708968', px, treeGroundAt(px, pz) + h / 2 - .03, pz, .1, h, .075, range(0, TAU));
    }
    stats.tufts++; local.tufts++;
    if (random() < .2 && y < 280) {
      part('crown', west ? '#6f8166' : '#577761', x, y + .24, z, range(.35, .8), .37, .48, range(0, TAU));
      stats.shrubs++; local.shrubs++;
    } else if (west && random() < .23) {
      // Orpine's fleshy rosettes and dull rose flowerheads occupy thin soil in
      // rock pockets rather than a uniform flower meadow over the mountain.
      for (let i = 0; i < 3; i++) { if (++buildWork % 32 === 0) yield; part('stone', '#839476', x + Math.sin(i * 2.1) * .18, y + .11, z + Math.cos(i * 2.1) * .18, .18, .08, .1, i); }
      part('stone', '#b88788', x, y + .28, z, .14, .08, .14); stats.flowers++;
    }
  } }
  const material = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: .98, flatShading: true });
  const batches = [];
  for (const [key, batch] of piecesByChunk) { if (++buildWork % 32 === 0) yield;
    const mesh = new THREE.InstancedMesh(geometry[batch.type], material, batch.pieces.length);
    mesh.name = `Baldro ${key}`; mesh.castShadow = batch.type !== 'blade'; mesh.receiveShadow = true;
    yield* forEachBuild(batch.pieces, function* (piece, index) {
      mesh.setMatrixAt(index, piece.matrix); mesh.setColorAt(index, colour.set(piece.tint)); piece.handle = { mesh, index };
    });
    mesh.computeBoundingBox(); mesh.computeBoundingSphere(); root.add(mesh); batches.push(mesh);
  }
  const trees = pendingTrees.map(t => registerWorldTree(colliders, t.descriptor, t.pieces.map(p => p.handle), t.collider));
  stats.trees = trees.length; stats.batches = batches.length;
  const waterMeshes = [];
  for (const river of BALDRO_RIVERS) { if (++buildWork % 32 === 0) yield;
    const water = createSceneryBuilder(river.name);
    for (let edge = 1; edge < river.points.length; edge++) { if (++buildWork % 32 === 0) yield;
      const a = river.points[edge - 1], c = river.points[edge], dx = c.x - a.x, dz = c.z - a.z;
      const length = Math.hypot(dx, dz), count = Math.max(1, Math.ceil(length / 2.5));
      if (length < 1e-6) continue;
      const at = (t, offset) => [a.x + dx * t - dz / length * offset,
        a.y + (c.y - a.y) * t + .025, a.z + dz * t + dx / length * offset];
      for (let i = 0; i < count; i++) { if (++buildWork % 32 === 0) yield; for (let stripe = 0; stripe < 6; stripe++) { if (++buildWork % 32 === 0) yield;
        const lo = -river.width / 2 + river.width * stripe / 6, hi = lo + river.width / 6;
        const points = [at(i / count, lo), at((i + 1) / count, lo), at((i + 1) / count, hi), at(i / count, hi)];
        if (!points.every(p => baldroCellAt(p[0], p[2]))) continue;
        water.sheet('#537d79', ...points);
      } }
    }
    const mesh = water.finish(root, { castShadow: false }); if (mesh) { waterMeshes.push(mesh); stats.rivers++; }
  }
  function setTaskComplete(id, complete = true) {
    const site = taskSites.find(s => s.id === id); if (!site) return false;
    site.damagedMesh.visible = !complete; site.completeMesh.visible = !!complete; return true;
  }
  return { root, trees, stats, metrics: stats, landmarks, taskSites, entrances, batches, waterMeshes, reservations, setTaskComplete };
}

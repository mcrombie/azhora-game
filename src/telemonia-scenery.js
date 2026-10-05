import * as THREE from 'three';
import { finishBuild } from './build-steps.js';
import { registerWorldTree, worldTreeId } from './tree-registry.js';
import { treeGroundingOffset } from './tree-grounding.js';
import { createTelemoniaGroundSteps } from './telemonia-ground.js';
import { drawCircuit } from './fortworks.js';
import { hexOwnerAt, regions } from './region-world.js';
import {
  TELEMONIA, TELEMONIA_BOX, TERRACES, KETHORN_WALL, ROTHKAR, PASSES, GULLIES, WASHES, KETHORN,
  telemoniaPlace, plainLevel, stairDistance, passAt, gullyAt, washWeight, onPassFloor, kethornLift, onKethornTop, kethornFrame,
  belkethShare, ridgeShare, borderDepth, plainDistance, TELEMONIA_PATCH_REACH, ROTHKAR_WAY, wayAt, onWayFloor, INNER,
} from './telemonia-world.js';
// What stage 2 builds and ploughs over (src/telemonia-town.js), if it says: read through the namespace, so the
// country's own scenery never fails to load for want of it.
import * as Town from './telemonia-town.js';
const townCovers = (x, z) => !!Town.townCovers?.(x, z);

/**
 * What the Telemon highland looks like (its ground is src/telemonia-world.js), stage 1: the rock, the
 * terraces' walls, the wall of Kethorn, and what grows - nothing planted, built for living in, or
 * anybody's.
 *
 * "Hot, dry country ... for most of the year it looks like [the Oves Desert and the Galan steppe]:
 * bunch grass, wormwood and thorn on the slopes, grey scrub oak and juniper in the folds where a little
 * soil has collected, bare stone above." And "only the south-eastern corner ... holds anything a
 * lowlander would call a wood". So:
 *
 *  - **the ground is drawn again here, finer**, a metre and a half apart, because the world's own grid
 *    is seven metres apart out here and a cliff band five metres wide is not drawn on it at all
 *    (`telemoniaTerrainSink` sinks it under this one). Coloured by what it is: the world's own colour,
 *    which is `telemoniaTint`'s, and bare stone wherever it is too steep to stand on, in courses;
 *  - **a dry-stone wall on every terrace riser**, one continuous coursed and capped face along each
 *    course line of the belt, traced from the belt's own slope and stopped squarely at every stair, gully,
 *    pass and the way; a check-wall across every step of the two gullies' floors; and the Rothkar way's
 *    revetment and parapets, in the same stone;
 *  - **the wall of Kethorn**, drawn by the fortification standard's own drawer in the rock's stone, its
 *    gate open;
 *  - **bunch grass** on the plain and the ledges, buff, in tussocks with bare ground between them;
 *    **wormwood** and **thorn** on the slopes; **grey scrub oak (holm oak) and juniper** in the folds -
 *    the valleys between the ridges, the gullies' banks and the foot of the outer faces, where soil
 *    collects; **bare stone** on the crests and every cliff, and fallen rock at the foot of the cliffs;
 *  - **the Belketh**: evergreen oak with pine on its ledges, close enough to be a wood, on the two
 *    `Csb` hexes and nowhere else - the Ascarth hills' own pair, a `Csb` wood of evergreen oak and pine
 *    two countries east, which is the nearest built ground of the same climate;
 *  - **the washes** are washed stones and nothing growing; the passes' floors are gravel.
 *
 * Nothing is planted in rows, cut, stacked or tended, and the terraces' treads are bare earth: stage 2
 * plants them. Its own seeded stream, after Selemis's, so nothing already built moves for it.
 */
export const TELEMONIA_STONE = Object.freeze({
  earth: '#857c6b', earthTop: '#948a77', wall: '#9a9180', wallDark: '#837b6c', cap: '#ada392', deck: '#6f5a44', rail: '#4b3b2c',
  tower: '#958c7b', towerDark: '#7d7568', roof: '#5a5246', ditch: '#4b4940', ditchSide: '#66655a', spike: '#5a4a38', slit: '#22201c',
});

export function createTelemoniaScenery(kit) { return finishBuild(createTelemoniaScenerySteps(kit)); }
export function* createTelemoniaScenerySteps(kit) {
  let buildWork = 0;
  const { root, material, groundHeight, colliders, dummy, color, round } = kit;
  const group = new THREE.Group(); group.name = 'Telemonia scenery'; root.add(group);
  let seed = 5220301;
  const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  const range = (a, b) => a + random() * (b - a);
  const smooth = (a, b, x) => { const v = Math.max(0, Math.min(1, (x - a) / (b - a))); return v * v * (3 - 2 * v); };
  const metrics = { batches: 0, groundVertices: 0, terraceWalls: 0, terraceWallMetres: 0, checkWalls: 0, wallMetres: 0, wallStones: 0, wayWallMetres: 0,
    rockLedgeStones: 0, tufts: 0, shrubs: 0, wormwood: 0, thorn: 0,
    trees: 0, oaks: 0, junipers: 0, pines: 0, belkethTrees: 0, rocks: 0, talus: 0, washStones: 0, gravel: 0, wall: 0, underTown: 0 };
  const push = collider => { colliders.push(collider); return collider; };
  const gy = (x, z) => groundHeight(x, z);
  const ours = (x, z) => hexOwnerAt(x, z) === TELEMONIA;
  const spawns = regions.filter(region => region.name === TELEMONIA).map(region => region.spawn);
  const nearSpawn = (x, z, r) => spawns.some(s => Math.hypot(s.x - x, s.z - z) < r);

  // -------------------------------------------------------------------------
  // The ground, drawn finer; the lattice it is drawn from is what everything else reads
  // -------------------------------------------------------------------------
  const ground = kit.fineGround ?? (yield* createTelemoniaGroundSteps({ ...kit, group }));
  const { STEP, B, cols, rows, owned, heightOf, slopeOf, slopeAt, treeGroundAt } = ground;
  metrics.batches += ground.metrics.batches; metrics.groundVertices += ground.metrics.groundVertices;
  /**
   * Room round a point for something solid: no cliff, riser or wall within `reach`. A tree or a boulder
   * on a ledge a few metres wide, against the cliff above it, can close the ledge, and a traveler who
   * dropped onto the far side of it would have no way off but up (tests/telemonia-world.test.js, "nobody
   * is sealed in"). Solid things stand only where there is room to walk round them.
   */
  const roomy = (x, z, reach = 2.5) => {
    for (let a = 0; a < 8; a++) if (slopeAt(x + Math.cos(a * Math.PI / 4) * reach, z + Math.sin(a * Math.PI / 4) * reach) > .7) return false;
    return slopeAt(x, z) < .5;
  };

  // -------------------------------------------------------------------------
  // The terraces' walls, the gullies' check-walls and the Rothkar way's parapets
  // -------------------------------------------------------------------------
  /**
   * **Dry-stone walls with a finished face** (the user, 2026-10-02: "the terrace walls are plain rows of
   * blocks"). Every wall here is one continuous face along its own line, laid in courses about forty-five
   * centimetres high of stones of their own lengths, the joints broken from course to course, each stone
   * standing a finger's breadth proud of or back from its neighbours, and a cap of flatter, paler stones
   * along the top that overhangs the face a little. The face follows the ground along its foot and the
   * level it holds along its top, and runs a little way into the ground below.
   *
   * - **The terrace walls** are traced, not found: a riser is where the belt's own slope crosses a course
   *   line (`TERRACES`; the middle of the riser of course k is where the ground before the terraces stands
   *   (k + .92) courses over the plain), so each wall is the contour of that line over the lattice, one
   *   polyline round the belt from stair to stair. Its face stands at the riser's foot, its cap on the upper
   *   tread. A wall stops where the ground is not that terrace's - a stair, a pass, a gully, the way, the
   *   rim's outer face - and ends there in a squared end. Nothing is placed by the lattice's own steps any
   *   more, which is what left blocks standing askew where the belt meets the Tarnel's wall.
   * - **The check-walls** are one wall straight across each step of a gully's floor, bank to bank.
   * - **The Rothkar way**: a revetment under its floor where it is built out over lower ground, and over the
   *   crest a parapet faced on the rock lip either side of it and round its landing.
   */
  {
    const T = TERRACES.period, wallMaterial = material('#ffffff', { vertexColors: true, flatShading: true });
    const stoneColour = new THREE.Color(), capColour = new THREE.Color();
    const TILE_M = 128, tiles = new Map();
    const tileOf = (x, z) => { const k = `${Math.floor(x / TILE_M)},${Math.floor(z / TILE_M)}`; if (!tiles.has(k)) tiles.set(k, { p: [], c: [], i: [] }); return tiles.get(k); };
    // The walls draw from their own seeded stream, so what grows round them is where it was.
    let wallSeed = 6630217;
    const wrange = (a, b) => { wallSeed = (Math.imul(wallSeed, 1664525) + 1013904223) >>> 0; return a + wallSeed / 4294967296 * (b - a); };
    /** A quad facing `want`: the winding is turned to face it, so no face is culled from the side it is seen from. */
    const quad = (t, a, b, c, d, col, want) => {
      const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2], vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
      const facing = (uy * vz - uz * vy) * want[0] + (uz * vx - ux * vz) * want[1] + (ux * vy - uy * vx) * want[2];
      const base = t.p.length / 3;
      for (const v of facing >= 0 ? [a, b, c, d] : [a, d, c, b]) { t.p.push(v[0], v[1], v[2]); t.c.push(col.r, col.g, col.b); }
      t.i.push(base, base + 1, base + 2, base, base + 2, base + 3);
    };
    /**
     * One wall: `line` is its face, [{ x, z, nx, nz, top, bottom }] - `n` pointing out of the face, `top` the
     * cap's upper surface, `bottom` below the ground. `depth` is how far back the cap runs.
     */
    const wall = (line, { depth = .6, course = .45, cap = .16, over = .05, tone = [.46, .58], capTone = [.6, .7] } = {}) => {
      if (line.length < 2) return 0;
      const t = tileOf(line[0].x, line[0].z);
      let metres = 0;
      for (let i = 1; i < line.length; i++) {
        const a = line[i - 1], b = line[i], length = Math.hypot(b.x - a.x, b.z - a.z);
        if (length < 1e-3) continue;
        metres += length;
        const at = f => ({ x: a.x + (b.x - a.x) * f, z: a.z + (b.z - a.z) * f, nx: a.nx + (b.nx - a.nx) * f, nz: a.nz + (b.nz - a.nz) * f,
          top: a.top + (b.top - a.top) * f, bottom: a.bottom + (b.bottom - a.bottom) * f });
        // The courses, counted down from under the cap; each course cut into stones of their own lengths.
        const rows = Math.max(1, Math.ceil((Math.max(a.top, b.top) - cap - Math.min(a.bottom, b.bottom)) / course));
        for (let row = 0; row < rows; row++) {
          let f = row % 2 ? wrange(0, .35) * Math.min(1, .9 / length) : 0;
          while (f < 1) {
            const g = Math.min(1, f + wrange(.6, 1.3) / length), p = at(f), q = at(g);
            const proud = wrange(-.025, .035);
            const yTop = s => s.top - cap - row * course, yBottom = s => Math.max(s.bottom, s.top - cap - (row + 1) * course);
            if (yTop(p) > yBottom(p) + .02 || yTop(q) > yBottom(q) + .02) {
              const px = p.x + p.nx * proud, pz = p.z + p.nz * proud, qx = q.x + q.nx * proud, qz = q.z + q.nz * proud;
              stoneColour.setHSL(wrange(.075, .115), wrange(.05, .12), wrange(tone[0], tone[1]), THREE.SRGBColorSpace);
              quad(t, [px, yBottom(p), pz], [qx, yBottom(q), qz], [qx, Math.max(yBottom(q), yTop(q)), qz], [px, Math.max(yBottom(p), yTop(p)), pz], stoneColour, [(p.nx + q.nx) / 2, 0, (p.nz + q.nz) / 2]);
              metrics.wallStones++;
            }
            f = g;
          }
        }
        // The cap: its front and its top, back over the wall's depth.
        capColour.setHSL(wrange(.08, .11), wrange(.04, .09), wrange(capTone[0], capTone[1]), THREE.SRGBColorSpace);
        const fa = [a.x + a.nx * over, a.z + a.nz * over], fb = [b.x + b.nx * over, b.z + b.nz * over];
        const ba = [a.x - a.nx * depth, a.z - a.nz * depth], bb = [b.x - b.nx * depth, b.z - b.nz * depth];
        quad(t, [fa[0], a.top - cap, fa[1]], [fb[0], b.top - cap, fb[1]], [fb[0], b.top, fb[1]], [fa[0], a.top, fa[1]], capColour, [(a.nx + b.nx) / 2, 0, (a.nz + b.nz) / 2]);
        quad(t, [fa[0], a.top, fa[1]], [fb[0], b.top, fb[1]], [bb[0], b.top, bb[1]], [ba[0], a.top, ba[1]], capColour, [0, 1, 0]);
      }
      // Squared ends, facing away along the wall.
      for (const [end, next] of [[line[0], line[1]], [line.at(-1), line.at(-2)]]) {
        const ax = end.x - next.x, az = end.z - next.z, al = Math.hypot(ax, az) || 1;
        const f = [end.x + end.nx * over, end.z + end.nz * over], k = [end.x - end.nx * depth, end.z - end.nz * depth];
        stoneColour.setHSL(wrange(.075, .115), wrange(.05, .12), wrange(tone[0], tone[1]), THREE.SRGBColorSpace);
        quad(t, [f[0], end.bottom, f[1]], [k[0], end.bottom, k[1]], [k[0], end.top, k[1]], [f[0], end.top, f[1]], stoneColour, [ax / al, 0, az / al]);
      }
      return metrics.wallMetres += metres, metres;
    };

    // --- The terrace walls: the course lines traced over the lattice ---------------------------------
    // The belt's own coordinate on the lattice: how far the ground before the terraces stands over the plain.
    const level = new Float32Array(cols * rows).fill(NaN), wallable = new Uint8Array(cols * rows);
    const levelOf = (i, j) => level[j * cols + i];
    for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
      if ((++buildWork & 63) === 0) yield;
      const k = j * cols + i;
      if (!owned[k]) continue;
      const x = B.minX + i * STEP, z = B.minZ + j * STEP, pd = plainDistance(x, z);
      if (pd < -2 || pd > INNER.terraceWidth + 2) continue;
      const place = telemoniaPlace(x, z);
      if (!place) continue;
      level[k] = place.height - place.plain;
      const pass = passAt(x, z), g = gullyAt(x, z);
      wallable[k] = place.terraced && stairDistance(x, z) > TERRACES.stairHalf + .4 && !(pass && pass.distance < pass.half + 4)
        && !(g && g.distance < g.gully.half + 2) ? 1 : 0;
    }
    /** The ground's own gradient of the belt coordinate, for the wall's facing. */
    const levelGradient = (x, z) => {
      const p = telemoniaPlace(x + .5, z), m = telemoniaPlace(x - .5, z), q = telemoniaPlace(x, z + .5), n = telemoniaPlace(x, z - .5);
      if (!p || !m || !q || !n) return null;
      return { gx: (p.height - p.plain - m.height + m.plain), gz: (q.height - q.plain - n.height + n.plain) };
    };
    let runs = 0;
    for (let course = 0; course < Math.round(INNER.terraceTop / T); course++) {
      const L = (course + .92) * T;
      // Marching squares: a segment in every cell the line crosses, its ends keyed by the lattice edge they lie on.
      const ends = new Map(), segments = [];
      const edgeKey = (i0, j0, i1, j1) => (i0 < i1 || (i0 === i1 && j0 < j1)) ? `${i0},${j0},${i1},${j1}` : `${i1},${j1},${i0},${j0}`;
      const cross = (i0, j0, i1, j1) => {
        const a = levelOf(i0, j0), b = levelOf(i1, j1), f = (L - a) / (b - a);
        return { x: B.minX + (i0 + (i1 - i0) * f) * STEP, z: B.minZ + (j0 + (j1 - j0) * f) * STEP, key: edgeKey(i0, j0, i1, j1) };
      };
      for (let j = 0; j < rows - 1; j++) for (let i = 0; i < cols - 1; i++) {
        if ((++buildWork & 63) === 0) yield;
        const c = [[i, j], [i + 1, j], [i + 1, j + 1], [i, j + 1]];
        if (c.some(([a, b]) => Number.isNaN(levelOf(a, b)) || !wallable[b * cols + a])) continue;
        const hits = [];
        for (let e = 0; e < 4; e++) {
          const [i0, j0] = c[e], [i1, j1] = c[(e + 1) % 4], a = levelOf(i0, j0), b = levelOf(i1, j1);
          if ((a < L) !== (b < L)) hits.push(cross(i0, j0, i1, j1));
        }
        if (hits.length === 2) segments.push([hits[0], hits[1]]);
        else if (hits.length === 4) { segments.push([hits[0], hits[1]]); segments.push([hits[2], hits[3]]); }
      }
      segments.forEach((s, n) => { for (const p of s) { if (!ends.has(p.key)) ends.set(p.key, []); ends.get(p.key).push(n); } });
      const used = new Uint8Array(segments.length);
      const chain = start => {
        // Walk one way from the segment, then the other, joining segments that share a lattice edge.
        const line = [segments[start][0], segments[start][1]]; used[start] = 1;
        for (const forward of [true, false]) {
          for (;;) {
            const tip = forward ? line.at(-1) : line[0];
            const next = (ends.get(tip.key) ?? []).find(n => !used[n]);
            if (next === undefined) break;
            used[next] = 1;
            const [p, q] = segments[next], far = p.key === tip.key ? q : p;
            if (forward) line.push(far); else line.unshift(far);
          }
        }
        return line;
      };
      for (let s = 0; s < segments.length; s++) {
        if ((++buildWork & 63) === 0) yield;
        if (used[s]) continue;
        const traced = chain(s);
        // Resample a metre apart and lay the face at the riser's foot; a wall is cut wherever the ground
        // either side of it is not this course's two treads.
        let face = [];
        const flush = () => { if (face.length >= 2) { wall(face); runs++; } face = []; };
        const lengths = [0]; for (let k = 1; k < traced.length; k++) lengths.push(lengths[k - 1] + Math.hypot(traced[k].x - traced[k - 1].x, traced[k].z - traced[k - 1].z));
        const total = lengths.at(-1), count = Math.max(1, Math.round(total / 1));
        for (let n = 0, k = 1; n <= count; n++) {
          if ((++buildWork & 63) === 0) yield;
          const want = total * n / count;
          while (k < traced.length - 1 && lengths[k] < want) k++;
          const a = traced[k - 1], b = traced[k], f = lengths[k] > lengths[k - 1] ? (want - lengths[k - 1]) / (lengths[k] - lengths[k - 1]) : 0;
          const x = a.x + (b.x - a.x) * f, z = a.z + (b.z - a.z) * f, g = levelGradient(x, z);
          if (!g) { flush(); continue; }
          const slope = Math.hypot(g.gx, g.gz);
          if (slope < .05) { flush(); continue; }
          const nx = -g.gx / slope, nz = -g.gz / slope, half = .08 * T / slope;
          const plain = plainLevel(x, z), upper = plain + (course + 1) * T, lower = plain + (course + .03) * T;
          const fx = x + nx * (half + .04), fz = z + nz * (half + .04);
          const below = gy(fx + nx * .35, fz + nz * .35), above = gy(x - nx * (half + .35), z - nz * (half + .35));
          if (Math.abs(below - lower) > .3 || Math.abs(above - upper) > .3) { flush(); continue; }
          face.push({ x: fx, z: fz, nx, nz, top: upper + .1, bottom: Math.min(below, gy(fx, fz)) - .3 });
        }
        flush();
      }
    }
    metrics.terraceWalls = runs; metrics.terraceWallMetres = Math.round(metrics.wallMetres);

    // --- The check-walls: straight across each step of a gully's floor --------------------------------
    for (const g of GULLIES) {
      const a = g.points[0], b = g.points.at(-1), length = Math.hypot(b.x - a.x, b.z - a.z);
      const dx = (b.x - a.x) / length, dz = (b.z - a.z) / length;
      const floorAt = (x, z) => {
        const at = gullyAt(x, z), plain = plainLevel(x, z), t = Math.max(0, Math.min(1, at.along / at.gully.length));
        const top = plain + INNER.terraceTop + 1.4, raw = top + (plain - .5 - top) * t;
        return { raw: raw - (plain - .5), plain };
      };
      let last = floorAt(a.x, a.z).raw;
      for (let s = .1; s < length; s += .1) {
        if ((++buildWork & 63) === 0) yield;
        const x = a.x + dx * s, z = a.z + dz * s, { raw } = floorAt(x, z);
        // The middle of a riser: where the raw floor crosses (k + .95) steps over the bottom, going down.
        const k = Math.floor(last / g.checks - .95);
        if (Math.floor(raw / g.checks - .95) < k && k >= 0) {
          const ux = -dz, uz = dx, line = [];
          for (let off = -(g.half + .7); off <= g.half + .71; off += .7) {
            const px = x + ux * off + dx * .1, pz = z + uz * off + dz * .1;
            line.push({ x: px, z: pz, nx: dx, nz: dz, top: gy(px - dx * .4, pz - dz * .4) + .12, bottom: gy(px + dx * .5, pz + dz * .5) - .3 });
          }
          wall(line, { depth: .5, tone: [.42, .54] });
          metrics.checkWalls++;
        }
        last = raw;
      }
    }

    // --- The Rothkar way: its revetment where it is built out, and the parapets over the crest ----------
    {
      const w = ROTHKAR_WAY, along = s => {
        let i = 1; while (i < w.run.length - 1 && w.run[i] < s) i++;
        const a = w.points[i - 1], b = w.points[i], len = w.run[i] - w.run[i - 1], f = Math.max(0, Math.min(1, (s - w.run[i - 1]) / len));
        return { x: a.x + (b.x - a.x) * f, z: a.z + (b.z - a.z) * f, dx: (b.x - a.x) / len, dz: (b.z - a.z) / len };
      };
      const up = w.lip / w.steep;
      for (const side of [-1, 1]) {
        // The revetment: the built-out side's face, wherever it stands more than half a metre over the
        // ground beside it - at the floor's edge below `lipFrom`, and above it on the outside of the lip.
        let face = [];
        const flush = () => { if (face.length >= 2) { metrics.wayWallMetres += wall(face, { depth: .4 }); } face = []; };
        for (let s = 0; s <= w.length; s += 1) {
          if ((++buildWork & 63) === 0) yield;
          const c = along(s), at = wayAt(c.x, c.z), nx = -c.dz * side, nz = c.dx * side, walled = s >= w.lipFrom;
          const out = at.half + (walled ? up + w.lipTop : 0) + .05, top = at.floor + (walled ? w.lip + .1 : .14);
          const ex = c.x + nx * out, ez = c.z + nz * out, beyond = gy(ex + nx * 1.2, ez + nz * 1.2);
          if (top - beyond < .8) { flush(); continue; }
          face.push({ x: ex, z: ez, nx, nz, top, bottom: beyond - .3 });
        }
        flush();
      }
      // The parapets: faced on the lip either side of the floor from `lipFrom` on, and round the landing.
      const ring = [];
      for (const side of [-1, 1]) {
        const one = [];
        for (let s = w.lipFrom; s <= w.length; s += .8) {
          const c = along(s), at = wayAt(c.x, c.z), nx = -c.dz * side, nz = c.dx * side;
          one.push({ x: c.x + nx * at.half, z: c.z + nz * at.half, nx: -nx, nz: -nz, floor: at.floor });
        }
        ring.push(side < 0 ? one : one.reverse());
      }
      // Round the landing's far end, from one side to the other.
      const end = w.points.at(-1), last = along(w.length), landing = w.stations.at(-1)[2];
      const heading = Math.atan2(last.dz, last.dx), arc = [];
      for (let a = -Math.PI / 2; a <= Math.PI / 2 + 1e-6; a += Math.PI / 16) {
        const ang = heading + a, ox = Math.cos(ang), oz = Math.sin(ang);
        arc.push({ x: end.x + ox * landing, z: end.z + oz * landing, nx: -ox, nz: -oz, floor: w.stations.at(-1)[1] });
      }
      const parapet = [...ring[0], ...arc, ...ring[1]].map(p => ({ x: p.x, z: p.z, nx: p.nx, nz: p.nz, top: p.floor + w.lip + .1, bottom: p.floor - .25 }));
      metrics.wayWallMetres += wall(parapet, { depth: w.lip / w.steep + .2, tone: [.44, .56] });
    }

    for (const t of tiles.values()) {
      yield;
      if (!t.i.length) continue;
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(t.p, 3));
      geometry.setAttribute('color', new THREE.Float32BufferAttribute(t.c, 3));
      geometry.setIndex(t.i); geometry.computeVertexNormals(); geometry.computeBoundingSphere();
      const mesh = new THREE.Mesh(geometry, wallMaterial);
      mesh.name = 'Telemonia dry-stone walls'; mesh.castShadow = true; mesh.receiveShadow = true; group.add(mesh);
      metrics.batches++;
    }
  }

  // -------------------------------------------------------------------------
  // The wall of Kethorn
  // -------------------------------------------------------------------------
  drawCircuit(KETHORN_WALL.circuit, { parent: group, heightAt: groundHeight, colliders, style: 'stone', name: KETHORN_WALL.name, palette: TELEMONIA_STONE, gateLeaves: 'open' });
  colliders.push(...KETHORN_WALL.circuit.colliders);
  metrics.wall = KETHORN_WALL.circuit.colliders.length; metrics.batches++;

  // -------------------------------------------------------------------------
  // What grows, and the stone
  // -------------------------------------------------------------------------
  /** A ledge on the crag's faces: on the rock, off its top and its spur, flat enough to hold a stone. */
  let ledgeSeed = 4410863;
  const ledgeRange = (a, b) => { ledgeSeed = (Math.imul(ledgeSeed, 1664525) + 1013904223) >>> 0; return a + ledgeSeed / 4294967296 * (b - a); };
  const onRockLedge = (x, z) => kethornLift(x, z) > 1.5 && !onKethornTop(x, z, -.5) && kethornFrame(x, z).u < KETHORN.neck - 4 && slopeAt(x, z) < .45
    && Math.hypot(x - KETHORN_WALL.gate.centre.x, z - KETHORN_WALL.gate.centre.z) > 16;
  /** Where nothing is put down: a pass's floor, a wash's floor, a stair, the way, the spur and the gate, the rock's faces, the travel spawn. */
  const clearGround = (x, z) => {
    if (onPassFloor(x, z) > .3 || washWeight(x, z) > .15 || onWayFloor(x, z) > .2 || nearSpawn(x, z, 5)) return false;
    if (stairDistance(x, z) < TERRACES.stairHalf + 1 && telemoniaPlace(x, z)?.terraced) return false;
    const gate = KETHORN_WALL.gate.centre;
    if (Math.hypot(x - gate.x, z - gate.z) < 16) return false;
    if (kethornLift(x, z) > 1.5 && !onKethornTop(x, z, 2)) return false;
    return true;
  };
  const grassGeometry = (() => {
    const positions = [], normals = [];
    for (let blade = 0; blade < 7; blade++) {
      const a = blade * 2.3, bx = Math.cos(a) * .12, bz = Math.sin(a) * .12, w = .05, h = .3 + (blade % 3) * .12;
      const cx = Math.cos(a + Math.PI / 2) * w, cz = Math.sin(a + Math.PI / 2) * w;
      positions.push(bx - cx, 0, bz - cz, bx + cx, 0, bz + cz, bx * 2.2, h, bz * 2.2);
      for (let k = 0; k < 3; k++) normals.push(0, 1, 0);
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    return geometry;
  })();
  const grassMaterial = material('#ffffff', { side: THREE.DoubleSide });
  const shrubMaterial = material('#ffffff', { flatShading: true });
  const rockMaterial = material('#ffffff', { flatShading: true });
  const trunkGeometry = new THREE.CylinderGeometry(.12, .24, 1, 6);
  const barkMaterial = material('#5d5246'), pineBark = material('#6b5644');
  const crownMaterial = material('#ffffff', { flatShading: true });
  /** The rim's stone, a warm grey: chosen in sRGB and said so, as Selemis's is - read in the renderer's working space it comes back white. */
  const stone = (low = .44, high = .56) => color.setHSL(range(.08, .12), range(.06, .13), range(low, high), THREE.SRGBColorSpace);

  const tufts = [], shrubs = [], rocks = [], trees = [], washStones = [];
  const treeClear = (x, z, r) => !trees.some(t => Math.abs(t.x - x) < r && Math.hypot(t.x - x, t.z - z) < r);
  // One pass over the country, a few candidates every square of ground, decided by what the ground is there.
  const cells = [];
  for (let z = B.minZ + 2; z < B.maxZ; z += 6) for (let x = B.minX + 2; x < B.maxX; x += 6) if (ours(x, z)) cells.push([x, z]);
  // Five candidates every six metres, and twice that in the Belketh, which is the one place that grows a wood.
  for (const [cx, cz] of cells) for (let n = 0, count = belkethShare(cx, cz) > .35 ? 10 : 5; n < count; n++) {
    if ((++buildWork & 31) === 0) yield;
    const x = cx + range(-3, 3), z = cz + range(-3, 3);
    if (!ours(x, z) || borderDepth(x, z) < 1.2) continue;
    const place = telemoniaPlace(x, z);
    if (!place) continue;
    const slope = slopeAt(x, z), wood = belkethShare(x, z), pd = place.inner;
    const fold = (1 - ridgeShare(x, z)) * smooth(2, 20, pd) + (1 - smooth(4, 16, borderDepth(x, z))) * .8;
    if (!clearGround(x, z)) {
      if (washWeight(x, z) > .3 && random() < .7) washStones.push({ x, z, s: range(.15, .5), rot: range(0, 6.28) });
      // The crag's ledges keep what has fallen on them, and a little grass: stones nobody walks into, drawn
      // from their own stream so nothing else moves for them.
      else if (onRockLedge(x, z)) {
        const r2 = ledgeRange(0, 1);
        if (r2 < .22) { rocks.push({ x, z, s: ledgeRange(.25, .7), rot: ledgeRange(0, 6.28), talus: true }); metrics.rockLedgeStones++; }
        else if (r2 < .5) tufts.push({ x, z, s: ledgeRange(.5, .9), rot: ledgeRange(0, 6.28), green: false, dry: true });
      }
      continue;
    }
    const steep = slope > .85, ledge = !steep && pd > 2 && !place.terraced;
    const r = random();
    // Bare rock where it is too steep for soil, and a stone or two on everything else.
    if (steep) { if (r < .05) rocks.push({ x, z, s: range(.4, 1), rot: range(0, 6.28) }); continue; }
    if (place.terraced) {
      // The treads are worked earth: a weed or two, nothing more, and no stone on them.
      if (r < .18) tufts.push({ x, z, s: range(.35, .65), rot: range(0, 6.28), green: false, dry: true });
      continue;
    }
    if (wood > .35 && ledge) {
      // **The Belketh**: a wood, on its ledges and its folds.
      if (r < .3 * wood && treeClear(x, z, 3.8) && roomy(x, z, 1.8)) {
        trees.push({ x, z, kind: random() < .26 ? 'pine' : 'oak', s: range(.85, 1.25), h: range(6, 9.5), rot: range(0, 6.28), belketh: true });
        continue;
      }
      if (r < .55) shrubs.push({ x, z, kind: 'maquis', s: range(.7, 1.4), rot: range(0, 6.28) });
      continue;
    }
    if (ledge && fold > .55 && r < .04 * fold && treeClear(x, z, 7) && roomy(x, z)) {
      // Grey scrub oak and juniper in the folds, where a little soil has collected.
      trees.push({ x, z, kind: random() < .45 ? 'juniper' : 'scrub-oak', s: range(.6, 1), h: range(2.6, 4.4), rot: range(0, 6.28) });
      continue;
    }
    if (ledge) {
      if (r < .35) shrubs.push({ x, z, kind: random() < .55 ? 'wormwood' : 'thorn', s: range(.4, .95), rot: range(0, 6.28) });
      else if (r < .75) tufts.push({ x, z, s: range(.6, 1.15), rot: range(0, 6.28), green: false });
      else if (r < .82) rocks.push({ x, z, s: range(.3, 1.1), rot: range(0, 6.28) });
      continue;
    }
    // The Galmeth: bunch grass in tussocks with the bare earth between them, wormwood here and there.
    if (r < .6) tufts.push({ x, z, s: range(.75, 1.3), rot: range(0, 6.28), green: random() < .08 });
    else if (r < .68) shrubs.push({ x, z, kind: 'wormwood', s: range(.4, .8), rot: range(0, 6.28) });
    else if (r < .7) rocks.push({ x, z, s: range(.25, .6), rot: range(0, 6.28) });
  }
  // The fallen rock at the foot of the cliffs: wherever the lattice steps from a cliff onto something flat.
  for (let j = 2; j < rows - 2; j += 2) for (let i = 2; i < cols - 2; i += 2) {
    if ((++buildWork & 63) === 0) yield;
    if (!owned[j * cols + i] || random() > .14) continue;
    const s0 = slopeOf(i, j);
    if (s0 > .5) continue;
    let above = 0;
    for (const [a, b] of [[2, 0], [-2, 0], [0, 2], [0, -2]]) above = Math.max(above, slopeOf(i + a, j + b) > 1.2 ? heightOf(i + a, j + b) - heightOf(i, j) : 0);
    if (above < 1.5) continue;
    const x = B.minX + i * STEP + range(-.6, .6), z = B.minZ + j * STEP + range(-.6, .6);
    if (!(clearGround(x, z) || onRockLedge(x, z)) || telemoniaPlace(x, z)?.terraced) continue;
    rocks.push({ x, z, s: range(.6, 1.7), rot: range(0, 6.28), talus: true });
  }

  if (tufts.length) {
    const batch = new THREE.InstancedMesh(grassGeometry, grassMaterial, tufts.length);
    for (const [i, tuft] of tufts.entries()) {
      if ((++buildWork & 31) === 0) yield;
      // Stage 2 ploughs the plain and builds on the rock (src/telemonia-town.js): what grew there is not drawn,
      // and every number it drew from the stream is still drawn, so nothing after it moves.
      const gone = townCovers(tuft.x, tuft.z); if (gone) metrics.underTown++;
      dummy.position.set(tuft.x, gy(tuft.x, tuft.z) + .02, tuft.z);
      dummy.rotation.set(0, tuft.rot, 0); dummy.scale.setScalar(gone ? 0 : tuft.s); dummy.updateMatrix();
      batch.setMatrixAt(i, dummy.matrix);
      // Buff bunch grass, eleven months of the year; a little green in the hollows.
      batch.setColorAt(i, tuft.green ? color.setHSL(range(.18, .24), range(.22, .32), range(.34, .44))
        : color.setHSL(range(.1, .135), range(.32, .44), tuft.dry ? range(.45, .55) : range(.5, .6), THREE.SRGBColorSpace));
    }
    batch.receiveShadow = true; batch.computeBoundingSphere(); batch.name = 'Telemonia bunch grass'; group.add(batch);
    metrics.tufts = tufts.length; metrics.batches++;
  }
  if (shrubs.length) {
    const batch = new THREE.InstancedMesh(round, shrubMaterial, shrubs.length);
    for (const [i, bush] of shrubs.entries()) {
      if ((++buildWork & 31) === 0) yield;
      const tall = bush.kind === 'maquis' ? .55 : bush.kind === 'thorn' ? .5 : .3, gone = townCovers(bush.x, bush.z);
      if (gone) metrics.underTown++;
      dummy.position.set(bush.x, gy(bush.x, bush.z) + bush.s * tall * .45, bush.z);
      dummy.rotation.set(range(-.15, .15), bush.rot, range(-.15, .15));
      dummy.scale.set(gone ? 0 : bush.s * .6, gone ? 0 : bush.s * tall, gone ? 0 : bush.s * .55); dummy.updateMatrix();
      batch.setMatrixAt(i, dummy.matrix);
      // Wormwood is silver-grey; thorn dark and twiggy; the Belketh's understory a dark glossy green.
      batch.setColorAt(i, bush.kind === 'wormwood' ? color.setHSL(range(.17, .24), range(.06, .13), range(.5, .62), THREE.SRGBColorSpace)
        : bush.kind === 'thorn' ? color.setHSL(range(.08, .14), range(.14, .24), range(.22, .3))
          : color.setHSL(range(.24, .3), range(.22, .32), range(.19, .27)));
      if (bush.kind === 'wormwood') metrics.wormwood++; else if (bush.kind === 'thorn') metrics.thorn++;
    }
    batch.castShadow = true; batch.receiveShadow = true; batch.computeBoundingSphere(); batch.name = 'Telemonia scrub'; group.add(batch);
    metrics.shrubs = shrubs.length; metrics.batches++;
  }
  if (rocks.length) {
    const batch = new THREE.InstancedMesh(round, rockMaterial, rocks.length);
    for (const [i, rock] of rocks.entries()) {
      if ((++buildWork & 31) === 0) yield;
      // Cleared off the fields, the street, and the floors of the halls and the huts (stage 2).
      const gone = townCovers(rock.x, rock.z); if (gone) metrics.underTown++;
      dummy.position.set(rock.x, gy(rock.x, rock.z) + rock.s * .15, rock.z);
      dummy.rotation.set(range(-.3, .3), rock.rot, range(-.3, .3));
      const sy = range(.5, .8), sz = range(.75, 1.3);
      dummy.scale.set(gone ? 0 : rock.s, gone ? 0 : rock.s * sy, gone ? 0 : rock.s * sz); dummy.updateMatrix();
      batch.setMatrixAt(i, dummy.matrix);
      batch.setColorAt(i, stone(rock.talus ? .4 : .44, rock.talus ? .52 : .58));
      // Only a big stone with room round it is solid; fallen rock at a cliff's foot is drawn and walked through.
      if (!gone && rock.s > 1.25 && !rock.talus && !nearSpawn(rock.x, rock.z, 5) && roomy(rock.x, rock.z, rock.s + 1.5)) push({ x: rock.x, z: rock.z, r: rock.s * .55, kind: 'ridge-rock' });
      if (rock.talus) metrics.talus++;
    }
    batch.castShadow = true; batch.receiveShadow = true; batch.computeBoundingSphere(); batch.name = 'Telemonia stone'; group.add(batch);
    metrics.rocks = rocks.length; metrics.batches++;
  }
  if (washStones.length) {
    const batch = new THREE.InstancedMesh(round, rockMaterial, washStones.length);
    for (const [i, rock] of washStones.entries()) {
      if ((++buildWork & 31) === 0) yield;
      dummy.position.set(rock.x, gy(rock.x, rock.z) + rock.s * .1, rock.z);
      dummy.rotation.set(range(-.2, .2), rock.rot, range(-.2, .2));
      dummy.scale.set(rock.s, rock.s * range(.4, .6), rock.s * range(.8, 1.25)); dummy.updateMatrix();
      batch.setMatrixAt(i, dummy.matrix);
      batch.setColorAt(i, stone(.56, .68));
    }
    batch.receiveShadow = true; batch.computeBoundingSphere(); batch.name = 'Telemonia wash stones'; group.add(batch);
    metrics.washStones = washStones.length; metrics.batches++;
  }

  /**
   * The trees, and there are few outside the Belketh: **grey scrub oak** (the holm oak, low and
   * rounded, grey-green) and **juniper** (dark, upright, ragged) singly in the folds; and in the
   * Belketh **evergreen oak** grown to a tree, with **pine** on its ledges, close enough to shade the
   * ground.
   */
  if (trees.length) {
    const lumpsOf = t => (t.kind === 'pine' ? 2 : t.kind === 'juniper' ? 2 : 3);
    const crowns = new THREE.InstancedMesh(round, crownMaterial, trees.reduce((sum, t) => sum + lumpsOf(t), 0));
    let crown = 0;
    for (const [list, bark] of [[trees.filter(t => t.kind !== 'pine'), barkMaterial], [trees.filter(t => t.kind === 'pine'), pineBark]]) {
      if (!list.length) continue;
      const trunks = new THREE.InstancedMesh(trunkGeometry, bark, list.length);
      for (const [i, tree] of list.entries()) {
        if ((++buildWork & 31) === 0) yield;
        let y = gy(tree.x, tree.z);
        const height = tree.h * tree.s;
        const bole = tree.kind === 'pine' ? .7 : tree.kind === 'juniper' ? .3 : .4, length = height * bole;
        dummy.position.set(tree.x, y + length / 2, tree.z);
        dummy.rotation.set(0, tree.rot, 0);
        const girth = tree.kind === 'pine' ? .9 : tree.kind === 'juniper' ? .6 : tree.belketh ? 1.1 : .8;
        dummy.scale.set(tree.s * girth, length, tree.s * girth); dummy.updateMatrix();
        const grounding = treeGroundingOffset(dummy.matrix, treeGroundAt, { radius: .24, segments: 6 });
        y += grounding; dummy.position.y += grounding; dummy.updateMatrix();
        trunks.setMatrixAt(i, dummy.matrix);
        const parts = [{ mesh: trunks, index: i }];
        for (let c = 0; c < lumpsOf(tree); c++) {
          dummy.rotation.set(.05, tree.rot + c * 1.9, .04);
          if (tree.kind === 'pine') {
            dummy.position.set(tree.x + (c ? .7 : 0), y + length + height * (c ? .02 : .1), tree.z + (c ? .4 : 0));
            dummy.scale.set(height * (c ? .2 : .3), height * (c ? .08 : .11), height * (c ? .18 : .28));
            crowns.setColorAt(crown, color.setHSL(range(.27, .33), range(.28, .4), range(.17, .24)));
          } else if (tree.kind === 'juniper') {
            dummy.position.set(tree.x, y + length + height * (c ? .42 : .2), tree.z);
            dummy.scale.set(height * (c ? .13 : .2), height * (c ? .3 : .34), height * (c ? .13 : .2));
            crowns.setColorAt(crown, color.setHSL(range(.3, .38), range(.18, .28), range(.17, .24)));
          } else {
            const off = (c - 1) * .6;
            dummy.position.set(tree.x + off * tree.s, y + length + height * (.18 + (c % 2) * .12), tree.z - off * .5 * tree.s);
            dummy.scale.set(height * .3, height * .22, height * .28);
            // Grey-green: the holm oak's leaf is dark above and felted grey below, and reads grey from a distance.
            crowns.setColorAt(crown, tree.belketh ? color.setHSL(range(.22, .28), range(.2, .3), range(.2, .28))
              : color.setHSL(range(.18, .24), range(.08, .15), range(.34, .44)));
          }
          dummy.updateMatrix(); crowns.setMatrixAt(crown, dummy.matrix);
          parts.push({ mesh: crowns, index: crown++ });
        }
        dummy.rotation.set(0, 0, 0);
        const collider = push({ x: tree.x, z: tree.z, r: (tree.kind === 'juniper' ? .3 : tree.belketh ? .45 : .36) * tree.s, kind: 'telemonia-tree' });
        registerWorldTree(colliders, { id: worldTreeId('telemonia', tree.x, tree.z), x: tree.x, z: tree.z, y, height,
          species: tree.kind === 'pine' ? 'stone-pine' : tree.kind === 'juniper' ? 'common-juniper' : 'holm-oak' }, parts, collider);
        metrics.trees++;
        if (tree.belketh) metrics.belkethTrees++;
        if (tree.kind === 'pine') metrics.pines++; else if (tree.kind === 'juniper') metrics.junipers++; else metrics.oaks++;
      }
      trunks.castShadow = true; trunks.receiveShadow = true; trunks.computeBoundingSphere(); group.add(trunks); metrics.batches++;
    }
    crowns.count = crown;
    crowns.castShadow = true; crowns.receiveShadow = true; crowns.computeBoundingSphere(); crowns.name = 'Telemonia crowns'; group.add(crowns); metrics.batches++;
  }
  void ROTHKAR; void PASSES; void GULLIES; void WASHES; void KETHORN;
  return { group, metrics };
}

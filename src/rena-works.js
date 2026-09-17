import { createSceneryBuilder } from './scenery-builder.js';
import {
  RENA_RUINS, OLD_ROAD_YAW, OLD_ROAD_ACROSS,
  APPLEGARTH_BUILDINGS, APPLEGARTH_WORKS, DRENT_DEEP_PLACES, EAST_RENA_STONE, RENA_SIGNS,
  renaPoint, applePoint, RENA_STANDS,
} from './rena.js';
import { SIGN_COLOURS } from './signs.js';

/**
 * Draws the ruins of Rena, the village of Applegarth, the three small places on
 * the Avrel road and the East Rena stone (`src/rena.js`). One merged,
 * vertex-coloured mesh per place, in the manner of `src/place-works.js`, so a
 * whole ruined town costs a handful of draw calls.
 *
 * Ruin colours are the same woods and stones as the rest of Drent, darkened:
 * eighty years of weather on burnt masonry is grey with a black core, and the
 * timber that is left is charcoal.
 */
const WOOD = '#71523a', WOOD_LIGHT = '#ab7950', WOOD_DARK = '#59432e', THATCH = '#a08a5c';
const STONE = '#8f9087', STONE_DARK = '#77786f', STONE_PALE = '#a3a192', MOSS = '#6d7a5a';
const PLASTER = '#d8c9a4', ROOF = '#6f7a70', CHAR = '#2e2a26', SOOT = '#413a34';
const WATER = '#33453f', IRON = '#4d4b47', APPLE = '#7f9a4c', BARK = '#795e41', HAY = '#bba266';

export function buildRenaWorks({ parent, heightAt, colliders, signs, roadDistance = () => 99 }) {
  const push = collider => { colliders.push(collider); return collider; };
  const circle = (x, z, r, kind) => push({ x, z, r, kind });
  const y = (x, z) => heightAt(x, z);
  /**
   * The yaw of a building on the old street: its long side runs along the
   * street and its front (local -z) faces it, from whichever side it stands on.
   */
  const streetYaw = across => OLD_ROAD_YAW + Math.PI / 2 + (across > 0 ? Math.PI : 0);

  /** Colliders for a turned rectangle: a box square to the world, a chain of circles when it is not. */
  function footprint(x, z, yaw, width, depth, kind) {
    if (Math.abs(Math.sin(yaw * 2)) < 1e-3) {
      const along = Math.abs(Math.cos(yaw)) > .5;
      return push({ x, z, hx: (along ? width : depth) / 2, hz: (along ? depth : width) / 2, kind });
    }
    const long = Math.max(width, depth), short = Math.min(width, depth);
    const axis = width >= depth ? { x: Math.cos(yaw), z: -Math.sin(yaw) } : { x: Math.sin(yaw), z: Math.cos(yaw) };
    const count = Math.max(1, Math.ceil(long / short)), r = short / 2 * 1.08;
    for (let i = 0; i < count; i++) {
      const t = count === 1 ? 0 : -long / 2 + short / 2 + (long - short) * i / (count - 1);
      push({ x: x + axis.x * t, z: z + axis.z * t, r, kind });
    }
  }
  function lineColliders(a, c, half, kind) {
    const dx = c.x - a.x, dz = c.z - a.z, length = Math.hypot(dx, dz);
    if (Math.abs(dx) < .01 || Math.abs(dz) < .01) return push({ x: (a.x + c.x) / 2, z: (a.z + c.z) / 2, hx: Math.abs(dx) / 2 + half, hz: Math.abs(dz) / 2 + half, kind });
    const m = Math.max(1, Math.ceil(length / (half * 2 + .5)));
    for (let i = 0; i <= m; i++) circle(a.x + dx * i / m, a.z + dz * i / m, half, kind);
  }

  /**
   * A ruined footing: a rectangle of tumbled courses `height` high with a
   * doorway gap in the street side, and the floor inside grassed over.
   *
   * The walls are colliders, not the plot, so the traveler walks the streets of
   * Rena and steps into the rooms through their own doorways. A footing under
   * `STEP_OVER` metres is no collider at all: a knee-high course of stones is
   * something you walk over, and the ruins nearest the gate are all that low.
   */
  const STEP_OVER = 0.75;
  function footing(b, { x, z, yaw, width, depth, height, kind = 'rena-footing', tint = STONE_DARK, door = true }) {
    const ground = y(x, z);
    const c = Math.cos(yaw), s = Math.sin(yaw);
    const world = (u, v) => ({ x: x + u * c + v * s, z: z - u * s + v * c });
    const w = width / 2, d = depth / 2;
    const doorAt = width * .12;
    b.frame(x, ground, z, yaw, () => {
      /**
       * One wall: coursed blocks of dressed stone, lowest where it has fallen in
       * and highest at the corners, with rubble along its foot and moss on top.
       */
      const run = (from, to, fixed, axis, gap) => {
        const length = Math.abs(to - from), n = Math.max(2, Math.round(length / .95)), step = (to - from) / n;
        for (let i = 0; i < n; i++) {
          const mid = from + step * (i + .5);
          if (gap !== null && Math.abs(mid - gap) < 1.35) continue;
          const slump = 1 - .42 * Math.sin(Math.PI * (i + .5) / n);
          const top = Math.max(.3, height * slump), seg = Math.abs(step) * .96;
          const sx = axis === 'x' ? seg : .52, sz = axis === 'x' ? .52 : seg;
          const px = axis === 'x' ? mid : fixed, pz = axis === 'x' ? fixed : mid;
          const courses = Math.max(1, Math.round(top / .36));
          for (let c = 0; c < courses; c++) {
            const ch = top / courses;
            b.block((i + c) % 3 ? tint : STONE, px, c * ch, pz, sx * (c % 2 ? 1 : .97), ch * .93, sz * (c % 2 ? .97 : 1));
          }
          b.rock(MOSS, px, top + .04, pz, sx * .34, .11, sz * .34, i * 1.3);
          // Rubble fallen off the outside of the wall.
          if (i % 2) b.rock(STONE_PALE, px + (axis === 'x' ? .2 : Math.sign(fixed) * .78), .12, pz + (axis === 'x' ? Math.sign(fixed) * .78 : .2), .42, .26, .38, i * .7);
        }
      };
      run(-w, w, -d, 'x', door ? doorAt : null);   // the street side, with its doorway
      run(-w, w, d, 'x', null);
      run(-d, d, -w, 'z', null);
      run(-d, d, w, 'z', null);
      // The corners of a stone house stand longest: squared piers a little above the walls.
      if (height >= 1.2) for (const [cx, cz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]])
        b.block(STONE_DARK, cx * w, 0, cz * d, .66, height * ((cx + cz) % 2 ? 1.28 : 1.05), .66);
      // The doorway's own jambs, which is how you can tell it was a door.
      if (door && height >= 1.2) for (const side of [-1, 1])
        b.block(STONE, doorAt + side * 1.25, 0, -d, .34, height * 1.15, .58);
      // The hearth stone, which is what a burnt house leaves.
      b.rock(CHAR, w * .5, .08, d * .45, .8, .12, .7, 1.1);
    });
    if (height < STEP_OVER) return;
    // Four wall lines, the street side split round its doorway.
    const wall = (a1, b1, a2, b2) => lineColliders(world(a1, b1), world(a2, b2), .42, kind);
    if (door) { wall(-w, -d, doorAt - 1.3, -d); wall(doorAt + 1.3, -d, w, -d); } else wall(-w, -d, w, -d);
    wall(-w, d, w, d); wall(-w, -d, -w, d); wall(w, -d, w, d);
  }

  /** One of the three old bound stones, lettered through the game's own sign language (src/signs.js). */
  const boundStone = spot => signs.border({ x: spot.x, z: spot.z, facing: spot.facing, parent,
    faces: spot.faces.map(label => ({ label, paint: SIGN_COLOURS.paint.drent })) });

  /** An orchard tree: kept ones are round and low, wild ones leggy, mossed and half down. */
  function appleTree(b, x, z, { wild = false, scale = 1 } = {}) {
    const ground = y(x, z), lean = ((x * 7 + z * 3) % 10) / 22 - .22;
    // An untended apple grows out rather than up, and half of them are on the floor.
    const height = (wild ? 2.9 : 3.1) * scale, trunk = height * (wild ? .38 : .55);
    b.cylinder(wild ? '#6a5a45' : BARK, x, ground, z, (wild ? .27 : .2) * scale, trunk, 0);
    const limbs = wild ? 5 : 3;
    for (let k = 0; k < limbs; k++) {
      const a = k * (6.283 / limbs) + x * .3, reach = (wild ? 2.1 : 1.5) * scale;
      b.beam(wild ? '#6a5a45' : BARK, [x, ground + trunk * .8, z],
        [x + Math.sin(a) * reach, ground + height * (wild ? .86 : .82), z + Math.cos(a) * reach], .12 * scale);
      if (wild) b.rock('#5f7346', x + Math.sin(a) * reach, ground + height * .92, z + Math.cos(a) * reach, .95 * scale, .62 * scale, .95 * scale, a);
    }
    b.rock(wild ? '#65784c' : APPLE, x, ground + height * (wild ? .88 : .92), z, (wild ? 1.9 : 1.9) * scale, (wild ? .95 : 1.35) * scale, (wild ? 1.9 : 1.9) * scale, x + lean);
    if (wild) b.rock(MOSS, x, ground + trunk * .5, z, .34 * scale, .3 * scale, .34 * scale, x);
    if (wild && (Math.floor(Math.abs(x) + Math.abs(z)) % 3) === 0) {
      // One in three is down: a trunk lying in the grass with its root plate up.
      b.beam('#5b4c3a', [x + .9, ground + .42, z - .6], [x + 3.6 * scale, ground + .26, z + 1.7 * scale], .36, .36);
      b.rock('#6a5a45', x + 3.8 * scale, ground + .5, z + 1.9 * scale, .9, .85, .3, x);
      circle(x + 2.2, z + .5, .5, 'rena-deadfall');
    }
    circle(x, z, (wild ? .42 : .34) * scale, wild ? 'rena-orchard-tree' : 'orchard-tree');
  }

  const fenceLine = (b, a, c, kind, tint = WOOD_LIGHT, height = 1.15) => {
    const length = Math.hypot(c.x - a.x, c.z - a.z), n = Math.max(1, Math.round(length / 2.4));
    for (let i = 0; i <= n; i++) { const px = a.x + (c.x - a.x) * i / n, pz = a.z + (c.z - a.z) * i / n; b.block(WOOD, px, y(px, pz), pz, .14, height + .1, .14); }
    for (const h of [.48, height - .12]) b.beam(tint, [a.x, y(a.x, a.z) + h, a.z], [c.x, y(c.x, c.z) + h, c.z], .09, .11);
    lineColliders(a, c, .28, kind);
  };

  /** A whole cottage in Drent's manner: footing, walls, gable roof, door and windows on its front. */
  function cottage(b, { x, z, yaw, width, depth, height, roof, wall, id }) {
    const ground = Math.min(y(x, z), y(x + width / 2, z), y(x - width / 2, z), y(x, z + depth / 2), y(x, z - depth / 2));
    b.frame(x, ground, z, yaw, () => {
      b.block(STONE_DARK, 0, -.4, 0, width + .3, .8, depth + .3);
      b.block(wall, 0, .35, 0, width, height, depth);
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) b.block(WOOD_DARK, sx * (width / 2 - .05), .35, sz * (depth / 2 - .05), .2, height + .05, .2);
      b.roof(roof, 0, height + .35, 0, width + .9, depth + .9, 1.9, Math.PI / 2, wall);
      b.block(WOOD_DARK, 0, .35, -depth / 2 - .03, 1.1, 2.0, .08);
      b.block('#997348', 0, .4, -depth / 2 - .08, .9, 1.85, .05);
      for (const sx of [-1, 1]) b.block(WOOD_DARK, sx * width * .3, 1.4, -depth / 2 - .03, .9, .9, .07);
      b.block('#b38e77', width * .3, height + .6, depth * .2, .6, 2.4, .6);
    });
    footprint(x, z, yaw, width + .3, depth + .3, `applegarth-${id}`);
  }

  const barrel = (b, x, z) => { const g = y(x, z); b.cylinder('#8c6a47', x, g, z, .38, .95); b.cylinder(IRON, x, g + .2, z, .4, .06); b.cylinder(IRON, x, g + .75, z, .4, .06); circle(x, z, .45, 'applegarth-barrel'); };

  /** A stone well head with a windlass, and dark water in it. */
  function well(b, x, z, { radius = 1.5, kind = 'rena-well', water = true } = {}) {
    const ground = y(x, z);
    for (let i = 0; i < 11; i++) {
      const a = i / 11 * Math.PI * 2;
      b.rock(i % 3 ? STONE : STONE_DARK, x + Math.sin(a) * radius, ground + .35, z + Math.cos(a) * radius, .46, .42, .4, a);
    }
    if (water) b.patch(WATER, () => ground - .35, x, z, radius * 1.5, radius * 1.5, 0, 0, 2);
    for (const s of [-1, 1]) b.block(WOOD, x + s * radius * .92, ground + .55, z, .16, 1.3, .16);
    b.beam(WOOD_DARK, [x - radius, ground + 1.85, z], [x + radius, ground + 1.85, z], .17, .17);
    circle(x, z, radius + .35, kind);
  }

  // -------------------------------------------------------------------------
  // The ruins of Rena
  // -------------------------------------------------------------------------
  {
    const b = createSceneryBuilder('The ruins of Rena');
    const R = RENA_RUINS;
    // The street: worn ground the whole length of the ruins, with broken kerb stones down both sides.
    for (let a = R.street.from; a <= R.street.to; a += 6) {
      const p = renaPoint(a, 0);
      b.patch('#8c8a68', heightAt, p.x, p.z, 6.2, 6.2, OLD_ROAD_YAW, .05, 2);
      for (const side of [-1, 1]) {
        const k = renaPoint(a, side * 4.1);
        if ((a + side * 3) % 4 === 0) continue;   // the kerb is missing in places
        b.rock(STONE_PALE, k.x, y(k.x, k.z) + .07, k.z, .55, .14, .38, a * .7 + side);
      }
    }
    // The burnt gate: one pier standing, one down, the lintel in the grass between them.
    {
      const g = R.gate, sy = y(g.standing.x, g.standing.z);
      // The standing pier: dressed stone in courses, scorched black on the side the fire came up.
      const courses = Math.round(g.height / .45);
      for (let c = 0; c < courses; c++) {
        const ch = g.height / courses, wide = g.width * (1 - c * .04);
        b.block(c % 3 === 2 ? STONE_DARK : STONE, g.standing.x, sy + c * ch, g.standing.z, wide, ch * .95, wide, OLD_ROAD_YAW);
        b.block(SOOT, g.standing.x - OLD_ROAD_ACROSS.x * wide * .5, sy + c * ch, g.standing.z - OLD_ROAD_ACROSS.z * wide * .5, wide * .35, ch * .95, wide * .96, OLD_ROAD_YAW);
      }
      b.block(STONE_PALE, g.standing.x, sy + g.height, g.standing.z, g.width * 1.2, .24, g.width * 1.2, OLD_ROAD_YAW);
      b.rock(MOSS, g.standing.x, sy + g.height + .3, g.standing.z, g.width * .4, .16, g.width * .4, 1.1);
      footprint(g.standing.x, g.standing.z, OLD_ROAD_YAW, g.width + .2, g.width + .2, 'rena-gate-pier');
      // Its twin, down to one course, with the rest of it lying away from the road.
      const fy = y(g.fallen.x, g.fallen.z);
      b.block(STONE, g.fallen.x, fy, g.fallen.z, g.width, .85, g.width, OLD_ROAD_YAW);
      b.block(SOOT, g.fallen.x, fy + .85, g.fallen.z, g.width * .92, .18, g.width * .92, OLD_ROAD_YAW);
      for (let i = 1; i <= 3; i++) {
        const fx = g.fallen.x - OLD_ROAD_ACROSS.x * (i * 1.25), fz = g.fallen.z - OLD_ROAD_ACROSS.z * (i * 1.25);
        b.block(i % 2 ? STONE_DARK : STONE, fx, y(fx, fz) + .05, fz, g.width * .9, .62, g.width * .9, OLD_ROAD_YAW + i * .12);
      }
      footprint(g.fallen.x, g.fallen.z, OLD_ROAD_YAW, g.width + .2, g.width + .2, 'rena-gate-pier');
      const lintelYaw = OLD_ROAD_YAW + Math.PI / 2 + .12, ly = y(g.lintel.x, g.lintel.z);
      b.box(STONE_DARK, g.lintel.x, ly + .35, g.lintel.z, 4.2, .7, .9, lintelYaw);
      footprint(g.lintel.x, g.lintel.z, lintelYaw, 4.2, .9, 'rena-lintel');
    }
    // The house plots down both sides of the street, each one fronting it with its own doorway.
    for (const plot of R.plots) footing(b, { ...plot, yaw: streetYaw(plot.b), height: plot.height });
    // The hall: a bigger room, three courses up, with its roof timbers in the nettles behind it.
    footing(b, { ...R.hall, yaw: streetYaw(R.hall.b), height: R.hall.height, kind: 'rena-hall', tint: STONE });
    {
      const h = R.hall.hearth, hy = y(h.x, h.z);
      b.patch(CHAR, heightAt, h.x, h.z, 3.4, 2.6, OLD_ROAD_YAW, .04, 2);
      for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; b.rock(SOOT, h.x + Math.sin(a) * 1.5, hy + .12, h.z + Math.cos(a) * 1.5, .48, .26, .44, a); }
      for (const [i, p] of R.hall.fallen.entries()) {
        const py = y(p.x, p.z);
        b.beam(CHAR, [p.x - 3, py + .35, p.z - 1.4 + i], [p.x + 3.2, py + .2, p.z + 1.1 + i], .3, .3);
        circle(p.x, p.z, .55, 'rena-fallen-timber');
      }
    }
    // The market place: the broken cross and the well that still holds water.
    {
      const c = R.cross, cy = y(c.x, c.z);
      b.block(STONE, c.x, cy, c.z, 1.9, .34, 1.9, OLD_ROAD_YAW);
      b.block(STONE_DARK, c.x, cy + .34, c.z, 1.35, .3, 1.35, OLD_ROAD_YAW);
      b.block(STONE_PALE, c.x, cy + .64, c.z, .9, .3, .9, OLD_ROAD_YAW + .12);
      // The shaft, snapped off at head height and left where it broke.
      b.block(STONE_PALE, c.x, cy + .94, c.z, .44, 1.85, .44, OLD_ROAD_YAW + .3);
      b.rock(MOSS, c.x, cy + 2.82, c.z, .3, .18, .3, 2.2);
      b.beam(STONE, [c.x + 1.2, cy + .25, c.z + .7], [c.x + 2.9, cy + .2, c.z + 1.6], .42, .42);
      circle(c.x, c.z, 1.1, 'rena-cross');
    }
    well(b, R.well.x, R.well.z, { radius: R.well.radius });
    // The bank the graves were dug behind, and the row of markers.
    {
      const [a, c] = R.graveBank, n = Math.max(2, Math.round(Math.hypot(c.x - a.x, c.z - a.z) / 1.6));
      for (let i = 0; i <= n; i++) {
        const px = a.x + (c.x - a.x) * i / n, pz = a.z + (c.z - a.z) * i / n;
        b.rock('#6d7a4e', px, y(px, pz) + .34, pz, 1.5, .7, 1.25, i * .8);
        b.rock(MOSS, px, y(px, pz) + .82, pz, 1.0, .22, .85, i * 1.4);
      }
    }
    for (const [i, g] of R.graves.entries()) {
      const gy = y(g.x, g.z), lean = ((i * 37) % 11) / 22 - .25;
      b.box(i % 4 ? STONE_PALE : STONE, g.x, gy + .56, g.z, .58, 1.06, .2, OLD_ROAD_YAW + (i % 5) * .05, lean, 0);
      b.rock(MOSS, g.x, gy + .1, g.z, .42, .16, .34, i);
      circle(g.x, g.z, .3, 'rena-grave');
    }
    // The orchard, eighty years untended.
    for (const tree of R.orchard) appleTree(b, tree.x, tree.z, { wild: true, scale: .95 + ((tree.x * 3) % 5) / 18 });
    b.finish(parent);
    boundStone(R.boundStone);
  }

  // -------------------------------------------------------------------------
  // Applegarth
  // -------------------------------------------------------------------------
  {
    const b = createSceneryBuilder('Applegarth');
    for (const building of APPLEGARTH_BUILDINGS) cottage(b, { ...building, yaw: streetYaw(building.b) });
    const W = APPLEGARTH_WORKS;
    well(b, W.well.x, W.well.z, { radius: 1.35, kind: 'applegarth-well' });
    // The drying racks outside the press house: slatted trays of cut apple.
    const rackYaw = OLD_ROAD_YAW + Math.PI / 2;
    for (const rack of W.racks) {
      const ry = y(rack.x, rack.z);
      b.frame(rack.x, ry, rack.z, rackYaw, () => {
        for (const sx of [-1, 1]) for (const sz of [-1, 1]) b.block(WOOD, sx * 1.5, 0, sz * .7, .12, 1.25, .12);
        for (const h of [.75, 1.2]) for (let i = 0; i < 6; i++) b.beam(WOOD_LIGHT, [-1.5, h, -.75 + i * .3], [1.5, h, -.75 + i * .3], .07, .05);
        b.box('#c89a5e', 0, 1.28, 0, 2.9, .06, 1.3);
      });
      footprint(rack.x, rack.z, rackYaw, 3.2, 1.7, 'applegarth-rack');
    }
    for (const spot of W.barrels) barrel(b, spot.x, spot.z);
    // The pound: a hurdled square for the beasts, north of the road.
    for (let i = 0; i < W.pound.length; i++) fenceLine(b, W.pound[i], W.pound[(i + 1) % W.pound.length], 'applegarth-pound', '#8a7a55', 1.05);
    // The orchard, kept: rows inside a hurdle fence, with a hay stack at the corner.
    for (const tree of W.orchard) appleTree(b, tree.x, tree.z, { scale: .95 });
    for (let i = 0; i < W.orchardFence.length; i++) {
      const a = W.orchardFence[i], c = W.orchardFence[(i + 1) % W.orchardFence.length];
      if (i === 0) continue;   // the road side is open, so the village walks into its own orchard
      fenceLine(b, a, c, 'applegarth-orchard-fence', '#8a7a55', 1.1);
    }
    {
      const s = applePoint(-24, -13), sy = y(s.x, s.z);
      b.cylinder(HAY, s.x, sy, s.z, 1.5, 1.7); b.cone('#b39a5e', s.x, sy + 1.7, s.z, 1.65, 1.5);
      circle(s.x, s.z, 1.7, 'applegarth-hay-stack');
    }
    // Lorn's sister keeps a bench and a basket of apples outside her door.
    {
      const stand = RENA_STANDS['rena-hesta'], bench = applePoint(-10.5, 6.6), by = y(bench.x, bench.z);
      b.frame(bench.x, by, bench.z, OLD_ROAD_YAW, () => {
        for (const sx of [-1, 1]) b.block(WOOD, sx * .8, 0, 0, .16, .45, .5);
        b.box(WOOD_LIGHT, 0, .52, 0, 2.0, .12, .55);
      });
      circle(bench.x, bench.z, .75, 'applegarth-bench');
      const basket = applePoint(-8.6, 7.4);
      b.cylinder('#a98a52', basket.x, y(basket.x, basket.z), basket.z, .38, .42);
      b.rock('#9b3f34', basket.x, y(basket.x, basket.z) + .5, basket.z, .34, .16, .34, 1);
      if (Math.hypot(stand.x - basket.x, stand.z - basket.z) > 1.4) circle(basket.x, basket.z, .4, 'applegarth-basket');
    }
    b.finish(parent);
    // The bound stone nobody has recut, and the board that says what the village calls itself now.
    boundStone(W.boundStone);
    signs.place({ x: W.placeBoard.x, z: W.placeBoard.z, label: W.placeBoard.label, facing: W.placeBoard.facing, parent });
  }

  // -------------------------------------------------------------------------
  // Three small places on the Avrel road, and the East Rena stone
  // -------------------------------------------------------------------------
  {
    const b = createSceneryBuilder('Rena’s wayside');
    const lane = DRENT_DEEP_PLACES[0].frame, toll = DRENT_DEEP_PLACES[1].frame, pedlar = DRENT_DEEP_PLACES[2].frame;
    // The sunken lane: two hedge banks with a hollow between them, running away from the road on both sides.
    for (let t = -26; t <= 26; t += 2.2) {
      for (const side of [-1, 1]) {
        const px = lane.x + lane.left.x * t + lane.dir.x * side * 3.2, pz = lane.z + lane.left.z * t + lane.dir.z * side * 3.2;
        if (roadDistance(px, pz) < 3.4) continue;
        const py = y(px, pz);
        b.rock(MOSS, px, py + .5, pz, 1.25, .95, 1.1, t + side);
        b.rock('#5d6d4c', px, py + 1.2, pz, .9, .7, .85, t * .6);
        circle(px, pz, .8, 'drove-bank');
      }
      const hx = lane.x + lane.left.x * t, hz = lane.z + lane.left.z * t;
      if (roadDistance(hx, hz) > 3) b.patch('#7d7a56', heightAt, hx, hz, 4.4, 2.4, Math.atan2(lane.left.x, lane.left.z), -.28, 2);
    }
    {
      const gate = { x: lane.x + lane.left.x * 14, z: lane.z + lane.left.z * 14 };
      b.block(WOOD, gate.x + lane.dir.x * 3, y(gate.x + lane.dir.x * 3, gate.z + lane.dir.z * 3), gate.z + lane.dir.z * 3, .18, 1.35, .18);
      circle(gate.x + lane.dir.x * 3, gate.z + lane.dir.z * 3, .3, 'drove-gatepost');
      const shoe = { x: lane.x + lane.left.x * 7 + lane.dir.x * .8, z: lane.z + lane.left.z * 7 + lane.dir.z * .8 };
      b.cylinder(IRON, shoe.x, y(shoe.x, shoe.z) + .02, shoe.z, .13, .04);
    }
    // The toll house: a roofless stone box with a counter window and a standing chimney.
    {
      const yaw = Math.atan2(toll.left.x, toll.left.z);
      footing(b, { x: toll.x, z: toll.z, yaw, width: 6.2, depth: 4.6, height: 2.0, kind: 'tollhouse', tint: STONE });
      const gy = y(toll.x, toll.z);
      b.frame(toll.x, gy, toll.z, yaw, () => {
        b.block(STONE, 2.6, 0, -1.0, 1.1, 4.4, 1.1);        // the chimney stack, still up
        b.block(SOOT, 2.6, 4.4, -1.0, 1.25, .25, 1.25);
        b.box(STONE_PALE, -1.2, 1.35, -2.35, 1.6, .22, .5); // the counter slab at the window
      });
      footprint(toll.x + Math.sin(yaw) * 2.6 - Math.cos(yaw) * 1.0, toll.z + Math.cos(yaw) * 2.6 + Math.sin(yaw) * 1.0, yaw, 1.4, 1.4, 'tollhouse-chimney');
      // The stream the toll stood over: a wet hollow and three crossing stones.
      for (let i = -1; i <= 1; i++) {
        const sx = toll.x + toll.dir.x * (i * 1.9) - toll.left.x * 7, sz = toll.z + toll.dir.z * (i * 1.9) - toll.left.z * 7;
        b.rock(STONE_PALE, sx, y(sx, sz) + .1, sz, .7, .22, .6, i);
      }
    }
    // The pedlar's stone: a waist-high stone with a hollow in its crown and three green coppers.
    {
      const py = y(pedlar.x, pedlar.z);
      b.rock(STONE, pedlar.x, py + .42, pedlar.z, .85, .5, .8, 1.2);
      b.rock(STONE_DARK, pedlar.x, py + .86, pedlar.z, .62, .28, .6, .4);
      b.cylinder('#5e7a5f', pedlar.x, py + 1.0, pedlar.z, .2, .05);
      for (const [dx, dz] of [[.06, .04], [-.05, .07], [.02, -.06]]) b.cylinder('#6f8f63', pedlar.x + dx, py + 1.05, pedlar.z + dz, .045, .015);
      circle(pedlar.x, pedlar.z, .6, 'pedlars-stone');
    }
    // The fern the East Rena stone leans back into; the stone itself is a sign.
    {
      const s = EAST_RENA_STONE, sy = y(s.x, s.z);
      for (let i = 0; i < 6; i++) { const a = i * 1.4 + 1; b.rock('#5f7a4a', s.x + Math.sin(a) * 1.5, sy + .24, s.z + Math.cos(a) * 1.5, .55, .38, .55, a); }
    }
    b.finish(parent);
    boundStone(EAST_RENA_STONE);
  }

  // -------------------------------------------------------------------------
  // Lorn's work: the crab pots he is mending on the Tidehaven shingle
  // -------------------------------------------------------------------------
  {
    const b = createSceneryBuilder('Lorn’s crab pots');
    // Everything he works with lies inland of him and south of the village
    // trail, so no pot ever ends up on the road the traveler walks in on.
    const stand = RENA_STANDS['rena-lorn'];
    const at = (dx, dz) => ({ x: stand.x + dx, z: stand.z + dz });
    const stool = at(-.4, 1.7), py = y(stool.x, stool.z);
    b.cylinder(WOOD, stool.x, py, stool.z, .26, .42);
    b.cylinder(WOOD_LIGHT, stool.x, py + .42, stool.z, .34, .08);
    circle(stool.x, stool.z, .3, 'lorn-stool');
    // Two finished pots and one half made, and a bundle of withies to work from.
    for (const [i, spot] of [at(-2.4, 2.6), at(-1.2, 3.6), at(-3.4, 3.4)].entries()) {
      const g = y(spot.x, spot.z);
      b.cylinder(i === 2 ? '#9a8355' : '#a98a52', spot.x, g, spot.z, .52, .48, i);
      if (i !== 2) b.cone('#a98a52', spot.x, g + .48, spot.z, .5, .34, i);
      circle(spot.x, spot.z, .55, 'lorn-pot');
    }
    const withies = at(-4.2, 1.9), wy = y(withies.x, withies.z);
    for (let i = 0; i < 7; i++) b.beam('#b09a63', [withies.x - .3 + i * .09, wy + .1, withies.z - .9], [withies.x + .3 + i * .07, wy + .16, withies.z + .9], .04);
    circle(withies.x, withies.z, .5, 'lorn-withies');
    b.finish(parent, { castShadow: false });
  }

  // -------------------------------------------------------------------------
  // The two fingerposts: one on the main road at the fork, one at the ruins' west gate
  // -------------------------------------------------------------------------
  for (const sign of RENA_SIGNS)
    signs.direction({ x: sign.x, z: sign.z, label: sign.label, toward: sign.toward, back: sign.back, backLabel: sign.backLabel, parent });
}

/**
 * The Empire's fortress masonry, as one hand: curtain, tower, gatehouse, keep and banner, drawn into a
 * scenery builder (src/world/scenery/scenery-builder.js). Varn is built with it (src/content/regions/varn/varn-scenery.js) and so is every
 * fort on the Lotharn passes (src/content/regions/west-lotharn/lotharn-forts-scenery.js), a size smaller.
 *
 * **Medieval, never Roman.** The stone is the Empire's own high ashlar, the stone the capital's east and
 * north walls are laid in (src/content/regions/ambron/elagos-scenery.js, `MASONRY.imperial`), under mountain slate; towers are
 * square and crenellated on a corbelled platform, with a steep roof standing on their merlons; a gate is
 * leaves of oak behind a portcullis, under a fighting gallery between two towers; and the colours are the
 * army's red with a bar of gold (src/content/regions/moros/moros-works.js, src/content/regions/ambron/elagos-scenery.js).
 *
 * A circuit is laid out by src/world/scenery/fortification.js, which also gives it its colliders; nothing here adds
 * one. Every wall stands on its own footing piece by piece, so on falling ground it goes down in steps.
 */
export const IMPERIAL_STONE = Object.freeze({ face: '#aaa590', dark: '#8a8674', cap: '#c0baa2', mortar: '#7c7967', foot: '#77735f', paving: '#918d79', court: '#9b9680' });
export const IMPERIAL = Object.freeze({ slate: '#4f5761', slateDark: '#424a54', wood: '#71523a', woodDark: '#4f3c2b', iron: '#3d3c39', slit: '#211f1c', red: '#8c3f38', redDark: '#76332e', gold: '#c9a24a' });

export function imperialMasonry(b, gy) {
  const STONE = IMPERIAL_STONE, { slate: SLATE, slateDark: SLATE_DARK, wood: WOOD, woodDark: WOOD_DARK, iron: IRON, slit: SLIT, red: RED, redDark: RED_DARK, gold: GOLD } = IMPERIAL;
  let towers = 0;
  /** Which way a wall's own frame (z along it) has to look for +x to be outward. */
  const hand = edge => { const turn = Math.atan2(edge.dir.x, edge.dir.z); return { turn, outward: Math.sign(edge.out.x * Math.cos(turn) - edge.out.z * Math.sin(turn)) || 1 }; };
  /** The floor a piece of wall stands on: the lowest ground under it and a little inside it, never the rock outside. */
  const footing = (circuit, edge, along, t) => {
    const inner = circuit.pointOn(edge, along, -t - .6), mid = circuit.pointOn(edge, along, 0);
    return Math.min(gy(inner.x, inner.z), gy(mid.x, mid.z));
  };

  /**
   * A circuit's walls, in pieces of four metres or so, each standing on its own footing - so a wall on
   * falling ground goes down it in steps, coping and all, and a wall that runs into a cliff climbs it
   * until the rock closes over it. Local frame: z along the wall, +x outward. A generator: it yields.
   */
  function* curtain(circuit, S, { slits = true } = {}) {
    const t = S.wallThickness / 2, outerHalf = Math.min(1.3, t * .56), innerHalf = t - outerHalf;
    let work = 0;
    for (const run of circuit.runs) {
      const edge = circuit.edges[run.edge], length = run.to - run.from;
      if (length < .1) continue;
      const pieces = Math.max(1, Math.ceil(length / 4.2)), { turn, outward } = hand(edge);
      for (let k = 0; k < pieces; k++) {
        if ((++work & 15) === 0) yield;
        const a0 = run.from + length * k / pieces, a1 = run.from + length * (k + 1) / pieces, mid = (a0 + a1) / 2, span = a1 - a0;
        const m = circuit.pointOn(edge, mid, 0), ground = footing(circuit, edge, mid, t);
        b.frame(m.x, ground, m.z, turn, () => {
          const X = v => v * outward;
          b.block(STONE.foot, 0, -2.6, 0, S.wallThickness + .7, 3.5, span + .04);                       // the battered footing, well into the ground
          b.block(STONE.face, X(t - outerHalf), .9, 0, outerHalf * 2, S.wallHeight - 2, span + .04);     // the field face, to the foot of the parapet
          b.block(STONE.dark, X(-innerHalf), .9, 0, innerHalf * 2, S.walkHeight - .9, span + .04);        // the town face, to the wall walk
          b.box(STONE.mortar, X(t - outerHalf), S.wallHeight * .42, 0, outerHalf * 2 + .08, .14, span + .06);   // a string course
          b.box(STONE.cap, X(t - outerHalf), S.wallHeight - 1.12, 0, outerHalf * 2 + .12, .14, span + .06);
          const merlons = Math.max(1, Math.round(span / 1.7));
          for (let s = 0; s < merlons; s++)
            b.block(STONE.cap, X(t - .42), S.wallHeight - 1.1, -span / 2 + (s + .5) * span / merlons, .8, 1.1, span / merlons * .56);
          b.box(STONE.dark, X(-.15), S.walkHeight, 0, t * 1.05, .18, span + .04);                         // the wall walk
          b.box(STONE.dark, X(-t + .22), S.walkHeight + .42, 0, .4, .8, span + .04);                      // and its low back wall
          if (slits && k % 2 === 0) b.block(SLIT, X(t + .02), S.wallHeight * .5, 0, .06, 1.2, .22);
        });
      }
    }
  }

  /** A pole with the Empire's banner on it: red, a gold bar across it. In the builder's current frame. */
  function flagpole(x, y, z, height, reach = 1.9) {
    b.block(WOOD_DARK, x, y, z, .12, height, .12);
    const top = y + height - .15, low = top - 1.25;
    b.sheet(RED, [x + .06, top, z], [x + reach, top - .08, z], [x + reach, low + .1, z], [x + .06, low, z]);
    for (const face of [-.012, .012]) b.sheet(GOLD, [x + .25, top - .45, z + face], [x + reach - .2, top - .5, z + face], [x + reach - .2, top - .72, z + face], [x + .25, top - .67, z + face]);
    b.cone(GOLD, x, y + height, z, .12, .28);
  }
  /** A long banner hung down a wall face, `w` wide and `h` long with a point below it, facing local +x at `x`. */
  function hanging(x, y, z, w, h) {
    b.box(WOOD_DARK, x, y, z, .1, .1, w + .3);
    const face = x + .03, tl = [face, y, z - w / 2], tr = [face, y, z + w / 2], br = [face, y - h, z + w / 2], bl = [face, y - h, z - w / 2], tip = [face, y - h - .5, z];
    b.sheet(RED, tl, tr, br, bl);
    b.triangle(RED_DARK, bl, br, tip); b.triangle(RED_DARK, bl, tip, br);
    const gold = x + .05;
    b.sheet(GOLD, [gold, y - h * .32, z - w / 2 + .12], [gold, y - h * .32, z + w / 2 - .12], [gold, y - h * .32 - .34, z + w / 2 - .12], [gold, y - h * .32 - .34, z - w / 2 + .12]);
  }

  /** A square tower: battered foot, shaft, corbelled platform, merlons, slits, and a steep slate roof standing on the merlons. */
  function tower(x, z, yaw, ground, size, top, { roof = SLATE, banner = false, tall = 0 } = {}) {
    const half = size / 2, height = top + tall;
    b.frame(x, ground, z, yaw, () => {
      b.block(STONE.foot, 0, -2.8, 0, size + .9, 3.8, size + .9);
      b.block(STONE.face, 0, .9, 0, size, height - .9, size);
      for (const band of [height * .38, height * .7]) b.box(STONE.mortar, 0, band, 0, size + .08, .14, size + .08);
      // The platform corbels out a hand's breadth all round, on a row of stones.
      b.box(STONE.dark, 0, height - .25, 0, size + .5, .5, size + .5);
      b.box(STONE.cap, 0, height + .12, 0, size + .8, .28, size + .8);
      const n = Math.max(3, Math.round(size / 1.9));
      for (const [sx, sz] of [[0, -1], [0, 1], [-1, 0], [1, 0]]) {
        for (let i = 0; i < n; i++) {
          const offset = (i - (n - 1) / 2) * (size + .5) / n;
          b.block(STONE.cap, sx * (half + .2) + (sz ? offset : 0), height + .26, sz * (half + .2) + (sx ? offset : 0), sz ? (size + .5) / n * .58 : .5, 1.0, sx ? (size + .5) / n * .58 : .5);
        }
        for (const level of [height * .5, height * .82]) b.block(SLIT, sx * (half + .02), level - .6, sz * (half + .02), sz ? .22 : .06, 1.2, sx ? .22 : .06);
      }
      b.cone(roof, 0, height + 1.26, 0, half * 1.42, size * .62, Math.PI / 4, 4);
      if (banner) flagpole(0, height + 1.26 + size * .62 - .3, 0, 3.4);
    });
    towers++;
  }
  /** The ground a circuit's tower stands on: the floor just inside it, never the rock or the ditch outside. */
  function towerGround(circuit, S, t) {
    const edge = circuit.edges[t.edge], inward = { x: -edge.out.x, z: -edge.out.z }, h = S.towerSize / 2 + .6;
    return Math.min(gy(t.x + inward.x * h, t.z + inward.z * h), gy(t.x + inward.x * h + edge.dir.x * 2, t.z + inward.z * h + edge.dir.z * 2), gy(t.x + inward.x * h - edge.dir.x * 2, t.z + inward.z * h - edge.dir.z * 2));
  }
  /** Every tower of a circuit; a gate's two stand `gateRise` taller and fly the banner. */
  function circuitTowers(circuit, S, { gateRise = 2.2, rise = () => 0 } = {}) {
    for (const t of circuit.towers) {
      const edge = circuit.edges[t.edge], gate = t.kind === 'gate';
      tower(t.x, t.z, Math.atan2(edge.dir.x, edge.dir.z), towerGround(circuit, S, t), S.towerSize, S.towerPlatform, { tall: (gate ? gateRise : 0) + rise(t), banner: gate });
    }
  }

  /**
   * A gate, between its two towers: a vaulted passage under a fighting gallery, an arch of voussoirs on
   * both faces, a portcullis in the outer one and leaves of oak behind it. Shut, the portcullis is down
   * and the leaves are closed and barred; open, the grate hangs in the arch's head and the leaves stand
   * back against the passage walls. A shut gate with a `wicket` (`{ side, width }`: which leaf, along the
   * gate's own direction, and how wide) has a door a man wide cut in that leaf at the tower's side,
   * standing open into the town, and keeps its grate up, because a wicket in use wants it so. The Empire's
   * colours hang down the towers either side.
   */
  function gatehouse(circuit, gate, S, { shut = false, rise = 1.2, kerbs = 0, hangings = true, wicket = null } = {}) {
    const edge = circuit.edges[gate.edge], { turn, outward } = hand(edge), t = S.wallThickness / 2, w = gate.halfWidth;
    const ground = gy(gate.centre.x, gate.centre.z), clear = Math.min(4.5, S.wallHeight - 1.9), top = S.wallHeight + rise;
    b.frame(gate.centre.x, ground, gate.centre.z, turn, () => {
      const X = v => v * outward;
      // The wall over the passage, and the gallery on it.
      b.block(STONE.face, 0, clear, 0, S.wallThickness, top - clear - 1.1, w * 2 + .1);
      b.box(STONE.cap, 0, top - 1.1, 0, S.wallThickness + .5, .22, w * 2 + .3);
      for (const face of [1, -1]) for (let s = 0; s < 4; s++) b.block(STONE.cap, X(face * (t + .05)), top - 1.0, -w + (s + .5) * w / 2, .5, 1.0, w / 2 * .56);
      // Corbels under the gallery on the field face: stones a defender drops things between.
      for (let s = 0; s < 5; s++) b.block(STONE.dark, X(t + .22), top - 1.75, -w + .5 + s * (w * 2 - 1) / 4, .5, .65, .42);
      // The arch on both faces, and the passage's vault.
      for (const face of [1, -1]) for (let s = -3; s <= 3; s++)
        b.block(STONE.cap, X(face * (t - .16)), clear - .78 + (3 - Math.abs(s)) * .13, s * (w / 3.6), .36, .7, w / 3.3, s * .1);
      b.block(STONE.dark, 0, clear - .06, 0, S.wallThickness - .4, .2, w * 2);
      // The portcullis: a grate of iron-shod oak in the outer arch, down when the gate is shut and nobody uses a wicket.
      const grate = shut && !wicket ? 0 : clear - 1.25;
      for (let s = -3; s <= 3; s++) b.block(IRON, X(t - .62), grate, s * (w / 3.4), .12, clear - grate, .12);
      for (let level = grate + .35; level < clear; level += .8) b.box(IRON, X(t - .62), level, 0, .1, .12, w * 2 - .1);
      // The leaves, on the town side of the grate.
      if (shut) {
        for (const side of [-1, 1]) {
          const doorway = wicket && side === wicket.side ? wicket.width : 0, leaf = w - .04 - doorway;
          b.block(WOOD_DARK, X(-t + 1.1), 0, side * (leaf + .04) / 2, .3, clear - .2, leaf);
          for (const level of [.7, 1.9, 3.1]) b.box(IRON, X(-t + 1.28), level, side * (leaf + .04) / 2, .06, .16, Math.max(.3, leaf - .25));
          if (doorway) {
            // The leaf goes on over the wicket's head, and the door stands open into the town on its hinge at the tower.
            const head = 2.15;
            b.block(WOOD_DARK, X(-t + 1.1), head, side * (w - doorway / 2), .3, clear - .2 - head, doorway + .06);
            b.block(IRON, X(-t + 1.1), head - .1, side * (w - doorway / 2), .34, .12, doorway + .06);
            b.frame(X(-t + 1.1 - .15), 0, side * (w - .06), side * outward * 1.25, () => {
              b.block(WOOD, 0, .05, -side * (doorway - .12) / 2, .1, head - .15, doorway - .12);
              for (const level of [.6, 1.5]) b.box(IRON, .06, level, -side * (doorway - .12) / 2, .04, .12, doorway - .3);
            });
          }
        }
        // The bar across both leaves - short of the wicket, whose door it would otherwise cross.
        const cut = wicket ? wicket.width : 0;
        b.box(WOOD, X(-t + .85), 1.5, wicket ? -wicket.side * cut / 2 : 0, .24, .26, w * 2 - .3 - cut);
      } else for (const side of [-1, 1]) {
        b.block(WOOD_DARK, X(-t + 1.1 - w * .5), 0, side * (w - .14), w - .1, clear - .25, .22);
        for (const level of [.7, 1.9, 3.1]) b.box(IRON, X(-t + 1.1 - w * .5), level, side * (w - .28), w - .3, .16, .06);
      }
      // The Empire's colours down the towers' faces either side of the arch, and its arms over it.
      if (hangings) for (const side of [-1, 1]) b.frame(X(S.towerProjection / 2 + S.towerSize / 2 + .08), 0, side * (w + S.towerSize / 2), outward > 0 ? 0 : Math.PI, () => hanging(0, S.towerPlatform - 1.2, 0, 1.5, Math.min(5.2, S.towerPlatform - clear - 2)));
      b.block(GOLD, X(t + .12), clear + .55, 0, .1, .9, 1.5);
      b.block(RED, X(t + .16), clear + .68, 0, .1, .64, 1.2);
      // A causeway's kerbs, where there is a ditch to cross.
      if (kerbs > 0) for (const side of [-1, 1]) b.block(STONE.dark, X(t + kerbs / 2), -.5, side * (S.causewayHalf - .25), kerbs, 1.0, .5);
    });
  }

  /**
   * A keep: a square tower on a battered plinth, three string courses, slits low and round-headed lights
   * high, battlements, a turret at each corner under its own cap, a roof within the battlements and the
   * Empire's banner over it. Its door is a storey up on the side `door` looks ([x, z], a unit step), with a
   * stone stair to it. `K` is `{ x, z, size, height, turret }`.
   */
  function keep(K, { door = [1, 0], banner = 5.2 } = {}) {
    const half = K.size / 2, H = K.height, turret = K.turret ?? K.size * .26;
    const ground = Math.min(gy(K.x - half, K.z - half), gy(K.x + half, K.z + half), gy(K.x - half, K.z + half), gy(K.x + half, K.z - half));
    const yaw = Math.atan2(door[0], door[1]) - Math.PI / 2;   // the frame's +x looks the way the door does
    b.frame(K.x, ground, K.z, yaw, () => {
      b.block(STONE.foot, 0, -2.4, 0, K.size + 1.6, 4, K.size + 1.6);
      b.block(STONE.face, 0, 1.6, 0, K.size, H - 1.6, K.size);
      for (const band of [H * .3, H * .56, H * .8]) b.box(STONE.mortar, 0, band, 0, K.size + .1, .16, K.size + .1);
      b.box(STONE.dark, 0, H - .3, 0, K.size + .7, .6, K.size + .7);
      b.box(STONE.cap, 0, H + .14, 0, K.size + 1.1, .3, K.size + 1.1);
      const n = Math.max(4, Math.round(K.size / 2.1));
      for (const [sx, sz] of [[0, -1], [0, 1], [-1, 0], [1, 0]]) {
        for (let i = 0; i < n; i++) {
          const offset = (i - (n - 1) / 2) * (K.size + .6) / n;
          b.block(STONE.cap, sx * (half + .35) + (sz ? offset : 0), H + .28, sz * (half + .35) + (sx ? offset : 0), sz ? (K.size + .6) / n * .56 : .55, 1.15, sx ? (K.size + .6) / n * .56 : .55);
        }
        for (const level of [H * .2, H * .42]) b.block(SLIT, sx * (half + .02), level, sz * (half + .02), sz ? .24 : .06, 1.4, sx ? .24 : .06);
        for (const level of [H * .62, H * .84]) for (const o of [-K.size * .18, K.size * .18]) {
          b.block(SLIT, sx * (half + .03) + (sz ? o : 0), level - .9, sz * (half + .03) + (sx ? o : 0), sz ? .7 : .08, 1.8, sx ? .7 : .08);
          b.block(STONE.cap, sx * (half + .05) + (sz ? o : 0), level + .9, sz * (half + .05) + (sx ? o : 0), sz ? 1.0 : .1, .22, sx ? 1.0 : .1);
        }
      }
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
        b.block(STONE.face, sx * half, 1.2, sz * half, turret, H + 2.6, turret);
        b.box(STONE.cap, sx * half, H + 3.9, sz * half, turret + .5, .24, turret + .5);
        for (const [ax, az] of [[0, -1], [0, 1], [-1, 0], [1, 0]]) b.block(STONE.cap, sx * half + ax * (turret / 2 + .1), H + 4, sz * half + az * (turret / 2 + .1), az ? .9 : .4, .8, ax ? .9 : .4);
        b.cone(SLATE_DARK, sx * half, H + 4.8, sz * half, turret * .86, 3.0, Math.PI / 4, 4);
      }
      b.cone(SLATE, 0, H + .4, 0, half * 1.16, Math.max(3.4, K.size * .43), Math.PI / 4, 4);
      // The door, a storey up, and the stair to it along the same face.
      b.block(WOOD_DARK, half + .04, 3.2, 1.5, .12, 2.5, 1.5);
      b.block(STONE.cap, half + .06, 5.7, 1.5, .14, .3, 2.0);
      for (let s = 0; s < 8; s++) b.block(STONE.dark, half + 1.0, 0, .3 - s * .95, 1.9, .4 + s * .4, .96);
      b.block(STONE.dark, half + 1.0, 0, 1.8, 1.9, 3.2, 2.0);
      // The great banner, on a pole from the roof's point.
      const y = H + .4 + Math.max(3.4, K.size * .43) - .3;
      b.block(WOOD_DARK, 0, y, 0, .16, banner, .16);
      b.sheet(RED, [.08, y + banner - .2, 0], [banner * .62, y + banner - .35, 0], [banner * .62, y + banner * .56, 0], [.08, y + banner * .54, 0]);
      for (const face of [-.015, .015]) b.sheet(GOLD, [.5, y + banner * .82, face], [banner * .55, y + banner * .8, face], [banner * .55, y + banner * .72, face], [.5, y + banner * .73, face]);
      b.cone(GOLD, 0, y + banner, 0, .16, .4);
    });
    // Where a body cannot go: the keep itself, and the stair along its door's face.
    const sideways = { x: -door[1], z: door[0] };
    return [
      { x: K.x, z: K.z, hx: half + .4, hz: half + .4 },
      { x: K.x + door[0] * (half + 1.0) + sideways.x * -2.15, z: K.z + door[1] * (half + 1.0) + sideways.z * -2.15,
        hx: Math.abs(door[0]) * 1.1 + Math.abs(sideways.x) * 4.65, hz: Math.abs(door[1]) * 1.1 + Math.abs(sideways.z) * 4.65 },
    ];
  }

  /**
   * Where a beck goes under a wall: an arch in the wall's foot, grated with iron, and the wall carried
   * over it. The wall's own colliders run on across it - nothing swims through a grate.
   */
  function waterArch(circuit, edge, along, S, water) {
    const { turn, outward } = hand(edge), m = circuit.pointOn(edge, along, 0), t = S.wallThickness / 2;
    b.frame(m.x, water, m.z, turn, () => {
      const X = v => v * outward;
      for (const face of [1, -1]) {
        for (let s = -2; s <= 2; s++) b.block(STONE.cap, X(face * (t + .04)), .5 + (2 - Math.abs(s)) * .22, s * .62, .3, .6, .6, s * .14);
        b.block('#16191b', X(face * (t + .02)), -.6, 0, .1, 1.5, 2.3);
        for (let s = -2; s <= 2; s++) b.block(IRON, X(face * (t + .1)), -.6, s * .46, .08, 1.6, .08);
        b.box(IRON, X(face * (t + .1)), .35, 0, .08, .1, 2.2);
      }
    });
  }

  return { curtain, tower, towerGround, circuitTowers, gatehouse, keep, waterArch, flagpole, hanging, get towers() { return towers; } };
}

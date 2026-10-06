import { createSceneryBuilder } from '../../../world/scenery/scenery-builder.js';
import { SUVAL_RIDGE_EDGES, SUVAL_RIDGE_ROCKS, SUVAL_HILL_PASSES, SUVAL_RIDGE_COLLIDERS, SUVAL_FALSE_PASSES, SUVAL_FALSE_PASS_ROCKS, hillPassPoint } from './frontier-ridges.js';
import { SMUGGLERS_DOOR } from '../../quests/rival-light/rival-light.js';

/** Chunk the kilometre of rock into short runs so distant sections can be culled. */
export function buildFrontierRidges({ parent, heightAt, colliders, signs }) {
  const shades = ['#909386', '#a1a291', '#808579', '#b0afa0'];
  for (const edge of SUVAL_RIDGE_EDGES) {
    const b = createSceneryBuilder(`Elodi limestone ridge ${edge.id}`);
    for (const rock of SUVAL_RIDGE_ROCKS.filter(rock => rock.edge === edge.id)) {
      const y = heightAt(rock.x, rock.z), h = rock.height;
      const scale = rock.radius / 5.4;
      b.rock(shades[rock.tint], rock.x, y + h * .31, rock.z, 7.9 * scale, h * .73, 7.8 * scale, rock.yaw);
      if (!rock.door && rock.shape === 0) {
        // A sloping exposed stratum and a narrow upper tooth break the rounded silhouette.
        b.box(shades[(rock.tint + 1) % 4], rock.x, y + h * .48, rock.z, rock.radius * 1.35, h * .54, rock.radius * .92, rock.yaw, .08, -.14);
        b.rock(shades[rock.tint], rock.x + edge.inward.x, y + h * .77, rock.z + edge.inward.z, rock.radius * .55, h * .46, rock.radius * .65, rock.yaw + .4);
      } else if (!rock.door && rock.shape === 1) {
        b.rock(shades[(rock.tint + 2) % 4], rock.x, y + h * .58, rock.z, rock.radius * 1.08, h * .4, rock.radius * .74, rock.yaw - .35);
      }
      // The broken talus apron gives the barrier a foot in the surrounding ground.
      for (const side of [-1, 1]) {
        const x = rock.x + edge.inward.x * side * 4.7, z = rock.z + edge.inward.z * side * 4.7;
        // Except in front of Addison's smugglers' door and its hatch (src/content/quests/rival-light/rival-light.js), which are in the face itself.
        if ([SMUGGLERS_DOOR.door, SMUGGLERS_DOOR.hatch].some(p => Math.hypot(p.x - x, p.z - z) < 3.6)) continue;
        // Occasional talus fans, rather than the same two boulders beneath every cliff.
        if (rock.shape === 2 || (rock.tint + side) % 2 === 0)
          b.rock(shades[(rock.tint + 1) % 4], x, heightAt(x, z) + .35, z, 2.2 + scale, 1.4 + scale, 2.6, rock.yaw + side * .31);
      }
    }
    b.finish(parent);
  }
  for (const pass of SUVAL_FALSE_PASSES) {
    const b = createSceneryBuilder(`Elodi false passage ${pass.id}`), turn = Math.atan2(pass.inward.x, pass.inward.z);
    for (let i = 1; i < pass.route.length; i++) {
      const from = pass.route[i - 1], to = pass.route[i], dx = to.x - from.x, dz = to.z - from.z, length = Math.hypot(dx, dz);
      b.patch('#a69c7e', heightAt, (from.x + to.x) / 2, (from.z + to.z) / 2, pass.width, length + .3,
        Math.atan2(dx, dz), .08, Math.ceil(length / 1.5));
    }
    for (const rock of SUVAL_FALSE_PASS_ROCKS.filter(rock => rock.pass === pass.id))
      b.rock(shades[rock.tint], rock.x, heightAt(rock.x, rock.z) + rock.height * .3, rock.z,
        rock.radius * 1.3, rock.height * .8, rock.radius * 1.3, rock.yaw);
    const base = heightAt(pass.end.x, pass.end.z);
    if (pass.kind === 'rockfall') {
      for (let k = -3; k <= 3; k++) {
        const p = hillPassPoint(pass, k * 2, -8.5), h = 4.7 + (3 - Math.abs(k)) * .9;
        b.rock(shades[(k + 4) % 4], p.x, heightAt(p.x, p.z) + h * .28, p.z, 2.4, h * .8, 1.65, turn + k * .3);
      }
      b.beam('#5e5444', [pass.end.x - 2, base + 1, pass.end.z], [pass.end.x + 2, base + 2.9, pass.end.z + 1], .27);
    } else {
      b.frame(pass.end.x, base, pass.end.z, turn, () => {
        // The old postern is bolted behind an iron grille. The dark recess suggests a way
        // through until its bars, crossbeam and rubble become visible around the last bend.
        b.block('#373c35', 0, -.4, .55, 5.8, 5.5, .6);
        for (const side of [-1, 1]) {
          b.block('#85887a', side * 4.4, -.5, 0, 3.5, 6.4, 1.7);
          b.block('#abae9c', side * 4.4, 5.9, 0, 3.8, .45, 2);
        }
        b.block('#85887a', 0, 5.1, 0, 6.1, 1.1, 1.8);
        for (let k = -5; k <= 5; k++) b.block('#262d29', k * .5, -.4, -.36, .12, 5.6, .12);
        for (const h of [.8, 3.3]) b.block('#4f483b', 0, h, -.51, 5.8, .24, .3);
        b.block('#c2a05c', .4, 2.25, -.74, .31, .42, .18);
      });
    }
    b.finish(parent);
  }
  for (const gate of SUVAL_HILL_PASSES) {
    const b = createSceneryBuilder(`${gate.name} - locked`), turn = Math.atan2(gate.along.x, gate.along.z);
    // Short foot approaches make these recognisable passes, not unexplained doors in rock.
    for (const side of [-1, 1]) {
      const p = hillPassPoint(gate, 0, side * 7);
      b.patch('#aaa083', heightAt, p.x, p.z, 4.4, 14, Math.atan2(gate.inward.x, gate.inward.z), .06, 4);
    }
    // Dressed limestone stitches each opening into the ridge. Each short piece follows the slope.
    for (const side of [-1, 1]) for (let at = gate.halfWidth; at < gate.wing; at += 2) {
      const span = Math.min(2, gate.wing - at), p = hillPassPoint(gate, side * (at + span / 2));
      const y = heightAt(p.x, p.z), tier = Math.floor((at - gate.halfWidth) / 4), height = 4.1 + ((tier + (side > 0 ? 1 : 0)) % 3) * .8;
      const offset = tier % 2 ? .25 : -.2, px = p.x + gate.inward.x * offset, pz = p.z + gate.inward.z * offset;
      b.block('#868a80', px, y - .45, pz, 1.8, height + .45, span + .12, turn);
      b.block('#adae9e', px, y + height, pz, 2, .5, span + .12, turn);
      if (tier % 2 === 0) b.block('#adae9e', px, y + height + .5, pz, 2, .65, .85, turn);
      if (at === gate.halfWidth + 4 || at === gate.halfWidth + 10)
        b.block('#777e73', px - gate.inward.x * .7, y - .6, pz - gate.inward.z * .7, 3.0, height + 1.1, 1.35, turn);
    }
    const gy = Math.min(...[-3, 0, 3].map(at => { const p = hillPassPoint(gate, at); return heightAt(p.x, p.z); }));
    b.frame(gate.x, gy, gate.z, Math.atan2(gate.inward.x, gate.inward.z), () => {
      for (const side of [-1, 1]) b.block('#777e73', side * 3.4, -.4, 0, 1.3, 6.5, 2.1);
      b.block('#a3a796', 0, 5.35, 0, 7.9, .85, 2.2);
      for (let i = 0; i < 12; i++) b.block(i % 2 ? '#51422e' : '#625038', -2.75 + i * .5, -.35, 0, .48, 5.6, .42);
      for (const h of [1.05, 3.55]) b.block('#353835', 0, h, -.25, 6, .17, .1);
      b.block('#292e2c', 0, 1.5, -.34, .37, .5, .15);
      b.block('#5a4a34', 0, 2.2, .3, 6.7, .29, .3); // the crossbar visible from the inside
      for (const side of [-1, 1]) {
        b.block('#41463f', side * 3.4, 6.1, 0, .09, 2, .09);
        b.sheet('#222629', [side * 3.4, 8, 0], [side * 3.4 + .85, 7.75, 0], [side * 3.4 + .85, 7.1, 0], [side * 3.4, 7.3, 0]);
      }
    });
    b.finish(parent);
    const notice = hillPassPoint(gate, 5.5, -5.8);
    signs?.notice?.({ x: notice.x, z: notice.z, label: 'Closed by Elod', facing: Math.atan2(-gate.inward.x, -gate.inward.z), parent });
  }
  colliders.push(...SUVAL_RIDGE_COLLIDERS);
}

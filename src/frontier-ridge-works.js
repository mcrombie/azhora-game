import { createSceneryBuilder } from './scenery-builder.js';
import { SUVAL_RIDGE_EDGES, SUVAL_RIDGE_ROCKS, SUVAL_HILL_PASSES, SUVAL_RIDGE_COLLIDERS, hillPassPoint } from './frontier-ridges.js';

/** Chunk the kilometre of rock into short runs so distant sections can be culled. */
export function buildFrontierRidges({ parent, heightAt, colliders, signs }) {
  const shades = ['#909386', '#a1a291', '#808579'];
  for (const edge of SUVAL_RIDGE_EDGES) {
    const b = createSceneryBuilder(`Elodi limestone ridge ${edge.id}`);
    for (const rock of SUVAL_RIDGE_ROCKS.filter(rock => rock.edge === edge.id)) {
      const y = heightAt(rock.x, rock.z), h = rock.height;
      b.rock(shades[rock.tint], rock.x, y + h * .31, rock.z, 7.9, h * .73, 7.8, rock.yaw);
      // The broken talus apron gives the barrier a foot in the surrounding ground.
      for (const side of [-1, 1]) {
        const x = rock.x + edge.inward.x * side * 4.7, z = rock.z + edge.inward.z * side * 4.7;
        b.rock(shades[(rock.tint + 1) % 3], x, heightAt(x, z) + .35, z, 3.7, 2.4, 3.4, rock.yaw + side * .31);
      }
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
      const y = heightAt(p.x, p.z);
      b.block('#868a80', p.x, y - .45, p.z, 1.8, 5.1, span + .1, turn);
      b.block('#adae9e', p.x, y + 4.65, p.z, 2, .5, span + .1, turn);
      b.block('#adae9e', p.x, y + 5.15, p.z, 2, .65, .85, turn);
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

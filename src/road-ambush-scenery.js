import { AMBUSH, AMBUSH_REBELS } from './road-ambush.js';
import { createSceneryBuilder } from './scenery-builder.js';

/** Permanent undergrowth around the hiding places, independent of the actors' lives. */
export function createRoadAmbushScenery({ root, groundHeight, roadDistance, colliders }) {
  const build = createSceneryBuilder('Greenway ambush undergrowth');
  const leaves = [0x596d3e, 0x738348, 0x4c633b, 0x859454], bark = 0x65583c;
  const f = AMBUSH.forward;
  for (const [index, rebel] of AMBUSH_REBELS.entries()) {
    const home = rebel.home;
    const side = Math.sign((home.x - AMBUSH.point.x) * f.dz - (home.z - AMBUSH.point.z) * f.dx);
    const at = (along, out) => ({
      x: home.x + f.dx * along + f.dz * out * side,
      z: home.z + f.dz * along - f.dx * out * side,
    });
    // Waist-high shrubs in front and beside each crouching figure. Uneven gaps
    // leave a face or shoulder to spot; flexible stems do not block their exit.
    for (const [i, [along, out, size]] of [
      [-.95, .12, 1.05], [.75, .8, .88], [-.5, 1.45, 1.12], [1.6, .25, .73], [-2.1, .65, .65],
    ].entries()) {
      const p = at(along, out);
      if (roadDistance(p.x, p.z) < .48) continue;
      const y = groundHeight(p.x, p.z), turn = index * 1.3 + i * 2.1;
      for (let branch = 0; branch < 4; branch++) {
        const a = turn + branch * 2.4, dx = Math.sin(a) * size * .31, dz = Math.cos(a) * size * .28;
        build.beam(bark, [p.x, y, p.z], [p.x + dx, y + size * .68, p.z + dz], .032);
        build.rock(leaves[(i + branch + index) % leaves.length], p.x + dx, y + size * (.51 + branch % 2 * .13), p.z + dz,
          size * .46, size * .38, size * .40, a);
      }
    }
    // Young trees bring the canopy down to human height behind the ambushers.
    // Their narrow trunks stay on the woodland side, away from the charge lane.
    for (const [i, [along, out, height]] of [[.65, 2.3, 2.8], [-1.9, 2.55, 2.2]].entries()) {
      const p = at(along, out);
      if (roadDistance(p.x, p.z) < 1.05) continue;
      const y = groundHeight(p.x, p.z);
      build.cylinder(bark, p.x, y, p.z, .085, height * .84);
      for (let branch = 0; branch < 4; branch++) {
        const a = index * 1.6 + i + branch * 2.4, spread = branch === 3 ? .06 : .48;
        const x = p.x + Math.sin(a) * spread, z = p.z + Math.cos(a) * spread;
        const cy = y + height * (branch === 3 ? .84 : .53 + branch * .07);
        build.beam(bark, [p.x, y + height * .40, p.z], [x, cy, z], .045);
        build.rock(leaves[(branch + index + i) % leaves.length], x, cy, z, .66, height * .24, .58, a);
      }
      colliders.push({ ...p, r: .10, height, kind: 'ambush-sapling' });
    }
  }
  const mesh = build.finish(root);
  if (mesh) mesh.userData.passable = true; // Only the individual sapling trunks are solid.
  return mesh;
}

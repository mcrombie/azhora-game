import { createSceneryBuilder } from '../../../world/scenery/scenery-builder.js';
import { SMUGGLERS_DOOR } from '../rival-light/rival-light.js';

/**
 * **The smugglers' door** (src/content/quests/rival-light/rival-light.js): a low iron door in a frame of dressed stones, set
 * into the limestone ridge on the West Suval side, and the hatch it comes out at among the stones on
 * the East Suval side. Scenery only: the ridge's own rocks are what is solid, and the passage
 * between the two is the host's (src/content/quests/rival-light/rival-light-host.js), because it is under the ridge.
 * Each is built in its own frame, `+z` out of the rock towards whoever is using it.
 */
export function createSmugglersDoorScenery({ root, groundHeight }) {
  const build = createSceneryBuilder('The smugglers’ door');
  const stone = 0x958f82, dark = 0x5d5952, iron = 0x34363a, rust = 0x6e4c34, moss = 0x5d6a45;
  const { door, hatch } = SMUGGLERS_DOOR;
  build.frame(door.x, groundHeight(door.x, door.z), door.z, door.yaw, () => {
    build.block(stone, -.74, -.2, 0, .36, 1.95, .6);
    build.block(stone, .74, -.2, 0, .36, 1.95, .6);
    build.block(dark, 0, 1.55, 0, 1.9, .36, .66);                    // the lintel
    build.block(iron, 0, -.1, .14, 1.1, 1.6, .09);                   // the door, low
    for (const y of [.28, 1.08]) build.block(rust, 0, y, .2, 1.12, .09, .03);
    build.block(rust, .36, .66, .21, .15, .22, .03);                 // the lock plate
    build.block(stone, 0, -.12, .7, 1.5, .14, .8);                    // a worn step
    build.rock(stone, -1.35, .75, -.25, .85, 1.25, .75, .5);
    build.rock(dark, 1.4, .6, -.2, .8, 1.05, .8, 1.3);
    build.rock(moss, 0, 2.05, -.25, 1.4, .45, .7, .2);
  });
  build.frame(hatch.x, groundHeight(hatch.x, hatch.z), hatch.z, hatch.yaw, () => {
    // On this side it is barely a door at all: a slab of weathered boards with an iron ring, low
    // among fallen stones, that looks like somebody's old sheep shelter.
    build.block(dark, -.66, -.2, 0, .5, 1.2, .6);
    build.block(dark, .66, -.2, 0, .5, 1.2, .6);
    build.block(stone, 0, .95, 0, 1.6, .3, .64);
    build.block(0x5f4d38, 0, -.15, .12, .86, 1.05, .08);
    build.block(iron, 0, .45, .18, .16, .16, .03);
    build.rock(stone, -1.2, .45, .1, .7, .75, .6, .7);
    build.rock(stone, 1.15, .4, .15, .65, .7, .7, 2.1);
    build.rock(moss, .2, 1.25, -.2, 1.1, .35, .6, 1.1);
  });
  return build.finish(root);
}

/**
 * The two raids of the opening, in world metres: the goblins on the Greenway
 * beside Tidehaven, and the raiders at the tumbled cart in the Avrel clearing.
 * The world keeps their ground clear of props (src/world.js), so a barrel never
 * stands on the spot the traveler restarts from.
 */
import { toWorld, toWorldXIn } from './world-scale.js';

export const GREENWAY_RAID = Object.freeze({ id: 'tidehaven-raiders', center: Object.freeze({ x: -56, z: 29 }), checkpoint: Object.freeze({ x: -45, z: 29 }),
  retreatAxis: 'x', retreatLine: -36, enemies: Object.freeze([
    Object.freeze({ id: 'goblin-scout', x: -56, z: 30.3, hp: 75, entry: .2 }),
    Object.freeze({ id: 'goblin-scrapper', x: -60, z: 27.7, hp: 75, entry: 1.5 }),
    Object.freeze({ id: 'goblin-lookout', x: -64, z: 29, hp: 75, entry: 2.8 }),
  ]) });

export const AVREL_RAID = Object.freeze({ id: 'meadow-raiders', center: Object.freeze(toWorld(-250, 12)), checkpoint: Object.freeze(toWorld(-236, 22)),
  retreatAxis: 'x', retreatLine: toWorldXIn('avrel', -222), enemies: Object.freeze([
    Object.freeze({ id: 'meadow-scout', ...toWorld(-253, 8), hp: 65, entry: .2 }),
    Object.freeze({ id: 'meadow-scrapper', ...toWorld(-256, 18), hp: 65, entry: 1.5 }),
  ]) });

/** The points of both raids that must stay open ground: where the traveler restarts, and where each enemy comes in. */
export const OPENING_FIGHT_GROUND = Object.freeze([GREENWAY_RAID, AVREL_RAID].flatMap(raid => [raid.checkpoint, ...raid.enemies]));

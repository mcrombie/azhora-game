import { BRANDY, BRANDY_STAND, BRANDY_YARD, yardPoint } from './brandy.js';

const point = (x, z) => Object.freeze({ x, z });
const house = Object.freeze({ x: -15, z: 110, width: 6.8, depth: 5.8, height: 3.5, yaw: Math.PI / 2 });

/** Door/porch coordinates are outside the solid cottage. The front looks east
 * over the shore; the painted boards occupy the clear shoulder to its north. */
export const BRANDY_HOME = Object.freeze({
  npcId: BRANDY.id, homeId: 'jon-and-brandy-home', name: 'Jon and Brandy', house,
  yaw: house.yaw, door: point(-10.9, 110), threshold: point(-10.9, 110),
  facade: point(-11.8, 110), porch: point(-9, 110), entry: point(-1, 111),
  visitor: Object.freeze({ x: -7, z: 111, yaw: -Math.PI / 2 }),
  boards: BRANDY_STAND,
  mailbox: Object.freeze({ x: -2.4, z: 108.5, yaw: Math.PI / 2, name: 'Jon and Brandy' }),
  route: Object.freeze([BRANDY_STAND, point(1, 102.6), point(1, 106), point(-1, 111), point(-9, 110), point(-10.9, 110)]),
});

/** A narrow footpath from the existing Saltwind trail, round the open edge of
 * the yard to the front door. It never runs through the work boards or vats. */
export const BRANDY_HOME_PATH = Object.freeze([
  point(-5, 73), point(1, 81), point(2, 91), point(1, 102.6),
  point(1, 106), point(-1, 111), point(-9, 110), BRANDY_HOME.door,
]);

function segmentDistance(x, z, a, b) {
  const dx = b.x - a.x, dz = b.z - a.z, t = Math.max(0, Math.min(1, ((x - a.x) * dx + (z - a.z) * dz) / (dx * dx + dz * dz || 1)));
  return Math.hypot(x - a.x - dx * t, z - a.z - dz * t);
}

/** Shared scatter exclusion, in world coordinates. Keep surrounding trees;
 * reserve only the small working yard, cottage and their walkable approach. */
export function brandyHomeClear(x, z, margin = 0) {
  if (Math.abs(x - house.x) < house.depth / 2 + 1.15 + margin && Math.abs(z - house.z) < house.width / 2 + 1.15 + margin) return true;
  if (Math.abs(x - BRANDY_YARD.x) < 5.9 + margin && Math.abs(z - BRANDY_YARD.z) < 5.8 + margin) return true;
  if (Math.hypot(x - BRANDY_HOME.mailbox.x, z - BRANDY_HOME.mailbox.z) < 1.2 + margin) return true;
  if (Math.hypot(x - BRANDY_HOME.visitor.x, z - BRANDY_HOME.visitor.z) < 1.25 + margin) return true;
  return BRANDY_HOME_PATH.some((b, i) => i && segmentDistance(x, z, BRANDY_HOME_PATH[i - 1], b) < 1.15 + margin)
    || BRANDY_HOME.route.some((b, i) => i && segmentDistance(x, z, BRANDY_HOME.route[i - 1], b) < 1.05 + margin);
}

/** A modest cut-and-fill pad under the house and doorstep, smoothly feathered
 * into the coastal slope. Rendering, vegetation and feet use this same height.
 * `naturalHeight` must be the unmodified world ground callback. */
export function brandyHomeGround(x, z, naturalHeight) {
  const natural = naturalHeight(x, z);
  const localX = -(z - house.z), localZ = x - house.x;
  const outside = Math.max(Math.abs(localX) - (house.width / 2 + .6), -3.5 - localZ, localZ - 4.3, 0);
  if (outside >= 3) return natural;
  const t = outside / 3, blend = t * t * (3 - 2 * t);
  return naturalHeight(house.x, house.z) * (1 - blend) + natural * blend;
}

export const BRANDY_YARD_APPROACH = Object.freeze(yardPoint(.4, 6));

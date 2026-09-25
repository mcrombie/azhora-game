import { ambronPoint } from './region-world.js';
import { AMBRON_BUILDINGS } from './ambron.js';
import { CAGNEY_HOME } from './cagney-quest.js';

const point = (a, b) => Object.freeze(ambronPoint(a, b));

/** Permanent exterior homes. Door points are usable thresholds outside the solid
 * building, not interior coordinates; the host controls entering and residence.
 * The last street approach follows Ela Street and the named cross-lane.
 */
function home(npcId, name, buildingId, { porch, mailbox } = {}) {
  const building = AMBRON_BUILDINGS.find(entry => entry.id === buildingId);
  const [dx, dz, yaw] = { north: [0, -1, 0], south: [0, 1, Math.PI],
    east: [1, 0, -Math.PI / 2], west: [-1, 0, Math.PI / 2] }[building.door];
  const frontA = building.a + dx * building.w / 2, frontB = building.b + dz * building.d / 2;
  const facade = point(frontA, frontB), door = point(frontA + dx * 1.1, frontB + dz * 1.1);
  const entry = point(frontA + dx * 5, frontB + dz * 5);
  const stand = porch ?? point(frontA + dx * 2.5, frontB + dz * 2.5);
  const street = building.a < 0
    ? [point(56, -6), point(34, -6), point(34, 0), point(-34, 0), point(-34, -6), point(-58, -6), point(-58, building.b)]
    : [point(56, -6), point(56, frontB + dz * 5)];
  return Object.freeze({
    npcId, name, homeId: `${name.toLowerCase()}-home`, buildingId,
    facade, door, porch: stand, entry, routeEndpoint: door,
    facing: building.door, yaw,
    mailbox: mailbox ?? point(frontA + Math.cos(yaw) * 2.5 + dx * 1.55,
      frontB - Math.sin(yaw) * 2.5 + dz * 1.55),
    route: Object.freeze([...street, entry, stand, door]),
  });
}

// Cagney's quest destination and mailbox remain exactly where they already were.
export const CAGNEY_RESIDENCE = home('cagney', 'Cagney', 'clerks-house', {
  porch: CAGNEY_HOME, mailbox: point(86.8, -36.55),
});
export const BEN_HOME = home('ben-sorcerer', 'Ben', 'house-ne');
export const TROY_HOME = home('bee-keeper', 'Troy', 'poor-row-1');
export const QUEST_HOMES = Object.freeze(Object.fromEntries(
  [CAGNEY_RESIDENCE, BEN_HOME, TROY_HOME].map(home => [home.npcId, home])));

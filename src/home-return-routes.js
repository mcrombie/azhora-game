import { roadRoute } from './autopilot.js';
import { CALOSS_ELAGOS_ROAD, OSSEN_TRACK } from './elagos-world.js';
import { FERRY_LANDINGS } from './ferry.js';
import { QUEST_HOMES } from './quest-homes.js';
import { AMBRON } from './region-world.js';
import { BODY, stepToward } from './bodies.js';

const point = p => ({ x: p.x, z: p.z });
const distance = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const dedupe = points => points.map(point).filter((p, i, all) => !i || distance(p, all[i - 1]) > .1);

/** The residence state hands out position copies. Local navigation keeps its
 * obstacle detour on the position object's identity, so each walker retains a
 * cursor while synchronizing its coordinates to the authoritative saved feet.
 */
export function createHomeReturnWalker(world) {
  const cursors = new Map();
  return (id, from, target, amount) => {
    if (!cursors.has(id)) cursors.set(id, point(from));
    const cursor = cursors.get(id); cursor.x = from.x; cursor.z = from.z;
    world.moving?.(cursor, BODY.person, id);
    stepToward(cursor, target, amount, world, BODY.person, id.length % 2 ? 1 : -1);
    return point(cursor);
  };
}

function remainingStreet(from, route) {
  let nearest = null;
  for (let i = 1; i < route.length; i++) {
    const a = route[i - 1], b = route[i], dx = b.x - a.x, dz = b.z - a.z;
    const t = Math.max(0, Math.min(1, ((from.x - a.x) * dx + (from.z - a.z) * dz) / (dx * dx + dz * dz || 1)));
    const at = { x: a.x + dx * t, z: a.z + dz * t }, gap = distance(from, at);
    if (!nearest || gap <= nearest.gap) nearest = { at, gap, next: i };
  }
  return nearest ? dedupe([nearest.at, ...route.slice(nearest.next)]) : route.map(point);
}

/** Ben leaves the thorn clearing northward and joins the west road. This is
 * beyond the route graph's 60 m search radius, so the woodland approach is
 * authored explicitly; normal local navigation still steps around each tree.
 */
export const BEN_HOME_ROAD_JOIN = Object.freeze([
  { x: -788, z: 280 }, { x: -804, z: 250 }, { x: -812, z: 216 }, CALOSS_ELAGOS_ROAD[4],
].map(p => Object.freeze(point(p))));

export const TROY_HOME_FERRY = Object.freeze({
  from: 'peblos', to: 'port-calos',
  board: FERRY_LANDINGS.peblos.ashore,
  ashore: FERRY_LANDINGS['port-calos'].ashore,
});

/** Walk through the quay's open working lane, not through the net loft. */
export function homeReturnQuayRoute(world, from) {
  const landing = TROY_HOME_FERRY.board;
  const route = roadRoute(world.paths, from, landing);
  return dedupe([...(route ?? [{ x: 335, z: 426 }, { x: 323.5, z: 428 }]), landing]);
}

/** Land-only route. Troy calls this after disembarking at Port Calos; his sea
 * crossing is a separate, saved journey phase and never a walking chord.
 */
export function homeReturnRoute(world, id, from, residence = QUEST_HOMES[id]) {
  if (!residence) return [];
  if (distance(from, residence.door) < 9) return [point(residence.door)];
  // A restored walker inside the city must continue from the street they have
  // already reached. In particular, the west bank is reached over the actual
  // causeway deck; routing back to the east gate would undo that crossing.
  if (Math.abs(from.x - AMBRON.centre.x) < AMBRON.halfA - 2
    && Math.abs(from.z - AMBRON.centre.z) < AMBRON.halfB - 2)
    return remainingStreet(from, residence.route);
  const gate = OSSEN_TRACK[0];
  let approach = roadRoute(world.paths, from, gate);
  if (id === 'ben-sorcerer' && distance(from, BEN_HOME_ROAD_JOIN[0]) < 65) {
    // Start at the nearest approach point, so older rewards claimed a few
    // strides from the clearing do not first send Ben back to his exact mark.
    let nearest = 0;
    for (let i = 1; i < BEN_HOME_ROAD_JOIN.length; i++)
      if (distance(from, BEN_HOME_ROAD_JOIN[i]) < distance(from, BEN_HOME_ROAD_JOIN[nearest])) nearest = i;
    approach = [...BEN_HOME_ROAD_JOIN.slice(nearest),
      ...CALOSS_ELAGOS_ROAD.slice(5), ...OSSEN_TRACK.slice(0, -1).reverse()];
  }
  // A destination inside a city is approached through its gate and street
  // lanes; appending a direct vector to the porch would cut through buildings.
  return dedupe([...(approach ?? []), gate, ...residence.route]);
}

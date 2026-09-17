/**
 * Wayside life on the empty stretches of road.
 *
 * The scaled world left the first 250 m of forest road beyond Tidehaven and the
 * 270 m of plain between the Moros gate and the Legion's outpost with nothing on
 * them. Each place here is a small landmark with discovery text, set beside the
 * road by its distance along the road and its offset from it (positive to the
 * left of the direction of travel). Drent is level 0: nothing here attacks.
 * Pure: no three, no DOM.
 */
import { MAIN_ROAD, CALOSS_GATE, STORY_SITES } from './region-world.js';

/** A frame on a road `arc` metres past `from`: position, heading and left-hand normal. */
export function roadFrame(road, from, arc, offset = 0) {
  let start = road.findIndex(p => Math.hypot(p.x - from.x, p.z - from.z) < .01);
  if (start < 0) start = 0;
  let remaining = arc;
  for (let i = start + 1; i < road.length; i++) {
    const a = road[i - 1], b = road[i], length = Math.hypot(b.x - a.x, b.z - a.z);
    if (remaining <= length || i === road.length - 1) {
      const t = Math.min(1, remaining / length), dir = { x: (b.x - a.x) / length, z: (b.z - a.z) / length };
      const left = { x: dir.z, z: -dir.x };
      return Object.freeze({ x: a.x + (b.x - a.x) * t + left.x * offset, z: a.z + (b.z - a.z) * t + left.z * offset, dir, left, yaw: Math.atan2(dir.x, dir.z) });
    }
    remaining -= length;
  }
  return null;
}

const drent = (arc, offset) => roadFrame(MAIN_ROAD, CALOSS_GATE, arc, offset);
const moros = (arc, offset) => roadFrame(MAIN_ROAD, STORY_SITES.morosGate, arc, offset);

const place = (id, name, frame, radius, description, extra = {}) => Object.freeze({ id, name, x: frame.x, z: frame.z, radius, description, frame, ...extra });

/** The forest road between the Caloss Gate and the Avrel clearing. Left of the road is south here. */
export const DRENT_WAYSIDE = Object.freeze([
  place('charcoal-burners', 'The Charcoal Burners’ Clearing', drent(48, -22), 11,
    'Two turf-covered stacks smoke gently in a clearing cut back from the road. The burners sleep in a bark hut beside their mound and sell charcoal to the Avrel smith.'),
  place('foresters-hut', 'The Forester’s Hut', drent(92, 21), 9,
    'A low log hut with a porch, a chopping block and a rack of marked poles. The forester counts the oaks for the Empire and the rabbits for himself.'),
  place('wayside-shrine', 'The Wayside Shrine', drent(128, -9), 5,
    'A little roofed shrine on a post, older than the road. Travelers leave a flower, a ribbon or a copper and ask for dry weather.'),
  place('timber-landing', 'The Timber Landing', drent(158, 17), 10,
    'Felled oak waits in stacks beside the road for the ox carts. Each trunk is marked in chalk with the yard it is bound for.'),
]);

/** The plain between the Moros gate and the outpost. Left of the road is south-east here. */
export const MOROS_WAYSIDE = Object.freeze([
  place('moros-ruts', 'The Cart Ruts', moros(40, 8), 8,
    'Wheel ruts cut deep beside the road where the supply carts pull aside for the columns. Nobody fills them; nobody needs to.'),
  place('moros-shepherds-fold', 'The Shepherd’s Fold', moros(95, -36), 11,
    'A ring of dry stone with a hurdle for a gate, and a turf lean-to for the shepherd. The Legion buys his wethers and pays him in scrip.'),
  place('legion-picket', 'The Legion Picket', moros(158, 15), 9,
    'A wattle windbreak, a tent and a cold brazier: two legionaries watch the road for whoever the camp is expecting.'),
  place('dead-campfire', 'A Dead Campfire', moros(128, 12), 6,
    'A ring of blackened stones and a cracked pot. Somebody camped here outside the camp’s rule and left before the horn.'),
]);
/** Milestones counting down to the outpost's gate. */
export const MOROS_MILESTONES = Object.freeze([
  Object.freeze({ label: 'III', frame: moros(62, -4.2) }), Object.freeze({ label: 'II', frame: moros(116, -4.2) }), Object.freeze({ label: 'I', frame: moros(170, -4.2) }),
]);

export const WAYSIDE_PLACES = Object.freeze([...DRENT_WAYSIDE, ...MOROS_WAYSIDE]);
/** Ground the wayside places keep clear of scatter. */
export const WAYSIDE_CLEARINGS = Object.freeze(WAYSIDE_PLACES.map(p => Object.freeze({ x: p.x, z: p.z, r: p.radius + 3 })));
export const WAYSIDE_LANDMARKS = Object.freeze(WAYSIDE_PLACES.map(({ id, name, x, z, radius, description }) => Object.freeze({ id, name, x, z, radius, description })));


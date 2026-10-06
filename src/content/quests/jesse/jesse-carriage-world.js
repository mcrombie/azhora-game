/** Jesse's roadside workshop sits opposite the prophet's north shoulder,
 * a short way west along the road toward Ambron. */
import { CALOSS_ELAGOS_ROAD, OSSEN_TRACK } from '../../regions/ambron/elagos-world.js';
import { AMBRON_CARPENTERS_GUILD } from '../../regions/ambron/ambron.js';

const freeze = Object.freeze;
const point = (x, z) => freeze({ x, z });
export const JESSE = freeze({ id: 'cobble-jessi', name: 'Jesse', role: 'Carriage repairer',
  modelRole: 'carriage-mechanic', color: 0x4d6f63,
  look: freeze({ hair: 0x8c2f2a, hairColors: freeze([0xc83d49, 0xed7139, 0xe7b343, 0xc5d94f,
    0x54a653, 0x329b87, 0x4dc8cc, 0x4086cf, 0x5654a8, 0x9665c0, 0xc04496, 0xee8dac]),
    hairStyle: 'long-tied', glasses: true, beard: false, hat: false }), yaw: Math.PI });
export const JESSE_WORKSHOP = freeze({ x: -693, z: 178, width: 12, depth: 13,
  stand: freeze({ x: -688, z: 175, yaw: Math.PI }),
  workbench: point(-690, 180), carriage: freeze({ x: -696, z: 178, yaw: Math.PI }),
  horse: point(-696, 174.6), join: point(-696, 164.7) });
export const JESSE_CARRIAGE_RADIUS = 1.15;
export const JESSE_HORSE_OFFSET = 3.4;
export const JESSE_GUILD = AMBRON_CARPENTERS_GUILD;
const part = (id, name, item, x, z, kind) => freeze({ id, name, item, x, z, kind, reach: 2.8 });
export const CARRIAGE_PARTS = freeze([
  part('wheel-near', 'Sound carriage wheel', 'carriage-wheel', -682, 182, 'wheel'),
  part('wheel-far', 'Carriage wheel by the verge', 'carriage-wheel', -708, 178, 'wheel'),
  part('axle', 'Iron-bound carriage axle', 'carriage-axle', -706, 188, 'axle'),
  part('timber', 'Jesse\'s prepared pine timber', 'carriage-pine-bundle', -686, 189, 'timber'),
]);
export const JESSE_ITEMS = freeze({
  'carriage-wheel': freeze({ name: 'Carriage wheel', type: 'Quest item', icon: 'plank', stackable: true,
    brief: 'A sound wheel for Jesse\'s carriage.', description: 'One of the wheels scattered round Jesse\'s roadside workshop. Bring two wheels and the axle back for the carriage lesson.' }),
  'carriage-axle': freeze({ name: 'Carriage axle', type: 'Quest item', icon: 'plank', stackable: true,
    brief: 'An iron-bound axle for Jesse\'s carriage.', description: 'Jesse has already checked this axle for cracks. It belongs in the carriage frame.' }),
  'carriage-pine-bundle': freeze({ name: 'Prepared carriage timber', type: 'Quest item', icon: 'plank', stackable: true,
    brief: 'Four pine planks reserved for Jesse\'s lesson.', description: 'Jesse has measured and sawn this pine for the practice carriage. More advanced woodcutters may bring oak or walnut planks instead.' }),
});
function guildParkingRoute() {
  let nearest = { distance: Infinity, end: JESSE_GUILD.route.length };
  for (let i = 1; i < JESSE_GUILD.route.length; i++) {
    const a = JESSE_GUILD.route[i - 1], b = JESSE_GUILD.route[i], p = JESSE_GUILD.cartParking;
    const dx = b.x - a.x, dz = b.z - a.z, t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.z - a.z) * dz) / (dx * dx + dz * dz || 1)));
    const distance = Math.hypot(a.x + dx * t - p.x, a.z + dz * t - p.z);
    if (distance < nearest.distance) nearest = { distance, end: i };
  }
  return [...JESSE_GUILD.route.slice(0, nearest.end), JESSE_GUILD.cartParking];
}
export const JESSE_CARRIAGE_ROUTE = freeze([
  point(JESSE_WORKSHOP.carriage.x, JESSE_WORKSHOP.carriage.z), JESSE_WORKSHOP.join,
  ...CALOSS_ELAGOS_ROAD.slice(2), ...OSSEN_TRACK.slice(0, -1).map((at, i) => {
    if (i !== 1) return at;
    // Kayla waits in the other lane at this bend. The wide carriage must not
    // target a point inside her footprint and then wait forever to reach it.
    const next = OSSEN_TRACK[i + 1], dx = next.x - at.x, dz = next.z - at.z, length = Math.hypot(dx, dz);
    return point(at.x - dz / length * 1.7, at.z + dx / length * 1.7);
  }).reverse(),
  ...guildParkingRoute(),
].filter((p, i, all) => !i || Math.hypot(p.x - all[i - 1].x, p.z - all[i - 1].z) > .1));
export const JESSE_GUILD_WALK = freeze([JESSE_GUILD.cartParking, JESSE_GUILD.entry, JESSE_GUILD.porch, JESSE_GUILD.door]);
export function jesseWorkshopClear(x, z, margin = 0) {
  return Math.abs(x - JESSE_WORKSHOP.x) < JESSE_WORKSHOP.width / 2 + 2 + margin
    && Math.abs(z - JESSE_WORKSHOP.z) < JESSE_WORKSHOP.depth / 2 + 3 + margin
    || CARRIAGE_PARTS.some(p => Math.hypot(x - p.x, z - p.z) < 1.6 + margin);
}

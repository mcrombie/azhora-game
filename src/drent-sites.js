import { villageToWorld } from './region-world.js';

const local = (x, z, extra = {}) => Object.freeze({ ...villageToWorld(x, z), ...extra });
const p = (x, z, extra = {}) => Object.freeze({ x, z, ...extra });

/** Shared, authored interaction points. These are world metres, never village-local metres. */
export const DRENT_SITES = Object.freeze({
  junction: local(-11, -86, { id: 'drent-rebel-junction', name: 'The Greenway junction' }),
  camp: local(-50, -111, { id: 'drent-rebel-camp', name: 'The deserted rebel camp' }),
  evidence: p(-131, 77, { id: 'drent-rebel-evidence', name: 'The rebels’ dispatch chest' }),
  barracks: p(-38, 72, { id: 'tidehaven-barracks', name: 'Tidehaven barracks' }),
  supplies: p(-35, 79, { id: 'drent-armory-supplies', name: 'Barracks supplies' }),
  killian: local(-22, -23, { id: 'killian', name: 'Killian', yaw: -Math.PI / 2 }),
  confrontation: local(-22, -23, { id: 'killian-confrontation', name: 'Killian’s yard' }),
  guardWest: p(-34, 67, { yaw: Math.PI }),
  guardEast: p(-30, 74, { yaw: Math.PI / 2 }),
  entrance: p(-31, 64),
  sneakEntrance: p(-29, 79),
});

export const DRENT_NPCS = Object.freeze([
  Object.freeze({ id: 'killian', name: 'Killian', role: 'Tidehaven resident', modelRole: 'villager', color: 0x83725a,
    skin: 0xcaa17f, look: Object.freeze({ hair: 0x59402a, hairStyle: 'cropped', beard: false, cloak: false, slight: true }) }),
  Object.freeze({ id: 'drent-barracks-west', name: 'Guard Rusk', role: 'Barracks guard', modelRole: 'legion-soldier', color: 0x8f3b30, armed: true, yaw: Math.PI }),
  Object.freeze({ id: 'drent-barracks-east', name: 'Guard Venn', role: 'Barracks guard', modelRole: 'legion-soldier', color: 0x8f3b30, armed: true, yaw: Math.PI / 2 }),
]);
export const DRENT_NPC_POSITIONS = Object.freeze({
  killian: DRENT_SITES.killian,
  'drent-barracks-west': DRENT_SITES.guardWest,
  'drent-barracks-east': DRENT_SITES.guardEast,
});

/** Guards remain in the yard, leaving a screened, walkable route behind the supply lean-to. */
export const DRENT_GUARD_PATROLS = Object.freeze({
  'drent-barracks-west': Object.freeze([p(-34, 67), p(-32, 67), p(-32, 71), p(-34, 71)]),
  'drent-barracks-east': Object.freeze([p(-30, 74), p(-30, 77), p(-32.2, 77), p(-32.2, 74)]),
});

/** The lodging and store stacks screen this route; it remains close enough for guard pressure. */
export const DRENT_SNEAK_ROUTE = Object.freeze([p(-47, 65), p(-47, 81.5), p(-35, 81.5), DRENT_SITES.supplies]);

export const DRENT_LOCAL_PATHS = Object.freeze([
  // A less-traveled way past the junction: taking it never enters the ambush's eight-metre reach.
  Object.freeze([[0, -73], [7, -81], [8, -92], [11, -104], [10, -112], [2, -120]].map(([x, z]) => Object.freeze({ x, z }))),
  // No sign advertises a hidden rebel camp.
  Object.freeze([[-37, -87], [-43, -96], [-48, -105], [-50, -109]].map(([x, z]) => Object.freeze({ x, z }))),
  // The ordinary village lane leading to the barracks yard.
  Object.freeze([[-24, -12], [-31, -12], [-35, -12], [-35, -18]].map(([x, z]) => Object.freeze({ x, z }))),
]);

function segmentDistance(x, z, a, b) {
  const dx = b.x - a.x, dz = b.z - a.z, l = dx * dx + dz * dz;
  const t = l ? Math.max(0, Math.min(1, ((x - a.x) * dx + (z - a.z) * dz) / l)) : 0;
  return Math.hypot(x - a.x - dx * t, z - a.z - dz * t);
}

/** Reserve only these authored clearings; keep all existing tree and collectible IDs stable. */
export function drentFeatureClear(x, z, tree = false) {
  const pad = tree ? 2 : 0;
  return Math.hypot(x + 50, z + 111) < 8 + pad
    || (x > -54 - pad && x < -31 + pad && z > -27 - pad && z < -7 + pad)
    || Math.hypot(x + 22, z + 23) < 4.2 + pad
    || Math.hypot(x + 11, z + 86) < 8.8 + pad
    || DRENT_LOCAL_PATHS.some(path => path.some((b, i) => i > 0 && segmentDistance(x, z, path[i - 1], b) < (tree ? 2.5 : 1.1)));
}

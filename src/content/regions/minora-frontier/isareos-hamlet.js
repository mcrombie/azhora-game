/**
 * **Amalthea's hamlet in the Isareos hills** (docs/lizeem-farmlands-design.md 6.2: "Cheese-maker at a valley-head
 * hamlet in the Isareos hills"; the appendix: "Amalthea at a hamlet in the hills to the north-west"; built
 * 6 October 2026 for Build 5 of the Farmlands of the Lizeem under the user's "keep building everything").
 *
 * The lore's Isareos (geography/regions/isareos.md) is grass to the top of every shoulder, "cattle and sheep on
 * grass that never dries out, and the hides and cheese that come off them", and each valley head has its village
 * and its seasonal camps out on the grazing. Amalthea's family lost their summer camp to the centaur raids, so they
 * winter on the home ground: one house, a byre, the cheese press and a stand where she sells, on the grass shoulder
 * between the heads of the west and middle becks, 230 m north-west of the Muster Gate.
 *
 * Where it stands, and why there: the top of the shoulder (26 m), because Isareos puts its thorn in every hollow
 * and nothing on the tops (src/content/regions/western-regions/west-regions-scenery.js), so the hamlet sits on open grass with no thorn and no
 * trees to clear; well away from the becks; 120 m from the corner of Wilhelm's camp (src/content/regions/minora-frontier/menora-city.js
 * `MENORA_CAMP`) and farther from its tents; and 145 m from the end of the centaurs' raid route, which keeps to the
 * west of x -2700 (src/content/regions/minora-frontier/yunethre-world.js `YUNETHRE_RAID_ROUTE`). The camp sits across the road out of the Muster
 * Gate, so the track starts where the Muster road ends inside it, by Wilhelm, goes out of the camp's west side
 * between its two rows of tents, wades the middle beck below its head and runs along the shoulder to the yard. The
 * ground south of the camp, toward the river, is broken by banks two to seven metres high; this way has none.
 *
 * Nothing here is sown: the hamlet's farm rows are none (`ISAREOS_HAMLET_ROWS`). The buildings sit on plinths
 * that take up the fall of the top, as Haethom's do, so the world's ground is not changed.
 *
 * Pure: no three. src/content/regions/minora-frontier/isareos-hamlet-scenery.js draws it; tests/isareos-hamlet.test.js measures it on a scoped
 * Isareos world.
 */
const freeze = Object.freeze;
const p = (x, z) => freeze({ x, z });

/** The hamlet: its centre, the reach that keeps scatter off it, and where the track comes into the yard. */
export const ISAREOS_HAMLET = freeze({
  id: 'isareos-hamlet', name: 'The cheese-maker’s hamlet', region: 'Isareos', x: -2628, z: 21, radius: 20,
  arrival: p(-2619, 30),
  description: 'Amalthea’s house, byre and cheese press on a grass shoulder in the Isareos hills. The family winters here, within sight of the city walls, since the centaurs took their summer camp.',
});

/**
 * A building as Haethom's are written (src/content/regions/nethereum/nethereum-farm.js): its own width `w` and depth `d`, its door on its
 * local +z, turned by `yaw`; `hx`/`hz` are its footprint on the world's axes.
 */
const building = (id, name, kind, x, z, w, d, h, yaw) => {
  const across = Math.abs(Math.sin(yaw)) > .5;
  return freeze({ id, name, kind, x, z, w, d, h, yaw, hx: across ? d / 2 : w / 2, hz: across ? w / 2 : d / 2 });
};
export const ISAREOS_HAMLET_BUILDINGS = freeze([
  // The house, its door to the south and the yard.
  building('amalthea-house', 'Amalthea’s house', 'house', -2628, 12.5, 7, 5.5, 2.5, 0),
  // The byre, its long side down the west of the yard and its wide door opening east onto it.
  building('amalthea-byre', 'Amalthea’s byre', 'byre', -2637, 24, 9, 5, 2.3, Math.PI / 2),
  // The cheese press under an open lean-to, its open side to the west and the yard.
  building('amalthea-press', 'The cheese press', 'press', -2618.5, 14.5, 3.6, 3, 2.1, -Math.PI / 2),
]);

/**
 * Amalthea's stand, an open stall with its counter on the south side, the side the track comes up. She stands
 * under its awning behind the counter, facing down the track (`ISAREOS_HAMLET_STAND`), as the factors in the
 * Minora market do (src/content/regions/minora-frontier/menora-city.js `LIZEEM_MARKET_STANDS`).
 */
export const ISAREOS_HAMLET_STALL = freeze({ id: 'amalthea-stall', name: 'Amalthea’s stand', x: -2621.5, z: 21, width: 3, depth: 2.2, yaw: 0 });
/** Where Amalthea stands and which way she faces: south, down the track. */
export const ISAREOS_HAMLET_STAND = freeze({ id: 'amalthea', x: -2621.5, z: 20.4, yaw: 0 });
export const ISAREOS_HAMLET_NPC_STANDS = freeze({ amalthea: ISAREOS_HAMLET_STAND });

/** The places the scenery draws and the people module may name. */
export const ISAREOS_HAMLET_SITES = freeze({
  house: freeze({ id: 'amalthea-house', name: 'Amalthea’s house', x: -2628, z: 12.5 }),
  byre: freeze({ id: 'amalthea-byre', name: 'Amalthea’s byre', x: -2637, z: 24 }),
  press: freeze({ id: 'amalthea-press', name: 'The cheese press', x: -2618.5, z: 14.5 }),
  stall: freeze({ id: ISAREOS_HAMLET_STALL.id, name: ISAREOS_HAMLET_STALL.name, x: ISAREOS_HAMLET_STALL.x, z: ISAREOS_HAMLET_STALL.z }),
  /** Trodden earth between the house, the byre and the press. */
  yard: freeze({ id: 'amalthea-yard', x: -2627.5, z: 20.5, width: 12, depth: 8 }),
  /** The hay she buys, stacked where the byre can reach it. */
  rick: freeze({ id: 'amalthea-rick', x: -2631.5, z: 31.5, r: 1.7 }),
  trough: freeze({ id: 'amalthea-trough', x: -2632, z: 27.5, yaw: 0 }),
  /** Cut turves for the fire, stacked against the house's west end: the hills grow grass, not wood. */
  turves: freeze({ id: 'amalthea-turves', x: -2633, z: 12.5, yaw: Math.PI / 2 }),
});

/** Nothing is sown at the hamlet: the hills are grazing, and the farmlands' beds are down the river. */
export const ISAREOS_HAMLET_ROWS = freeze([]);

/** The track, drawn as worn earth and handed to navigation as Haethom's ways are. */
const path = (id, name, width, points) => freeze({ id, name, width, points: freeze(points.map(([x, z]) => p(x, z))) });
export const ISAREOS_HAMLET_PATHS = freeze([
  // From the end of the Muster road in the camp (src/content/regions/minora-frontier/menora-city.js `menora-muster-approach`), out between the tent
  // rows, over the middle beck below its head, and along the shoulder to the yard.
  path('isareos-hamlet-track', 'The cheese-maker’s track', 3, [[-2470, 65], [-2500, 62], [-2524, 38], [-2600, 36], [-2619, 30]]),
]);

export const ISAREOS_HAMLET_LANDMARKS = freeze([
  freeze({ id: ISAREOS_HAMLET.id, name: ISAREOS_HAMLET.name, x: ISAREOS_HAMLET.x, z: ISAREOS_HAMLET.z, radius: ISAREOS_HAMLET.radius,
    description: ISAREOS_HAMLET.description }),
]);

const segmentDistance = (x, z, a, b) => {
  const dx = b.x - a.x, dz = b.z - a.z, t = Math.max(0, Math.min(1, ((x - a.x) * dx + (z - a.z) * dz) / (dx * dx + dz * dz)));
  return Math.hypot(x - a.x - dx * t, z - a.z - dz * t);
};
const BOX = freeze({ minX: -2650, maxX: -2465, minZ: -5, maxZ: 72 });
/**
 * Ground the frontier's scatter keeps off: the hamlet and the track, as `nethereumFarmReserved` keeps it off
 * Haethom. For src/content/regions/western-regions/west-regions-scenery.js `frontierReserved`, which the integrator extends; until it does, the
 * hamlet stands where no thorn grows, and the track passes a bush or two by the beck.
 */
export function isareosHamletReserved(x, z, margin = 0) {
  if (x < BOX.minX - margin || x > BOX.maxX + margin || z < BOX.minZ - margin || z > BOX.maxZ + margin) return false;
  if (Math.hypot(x - ISAREOS_HAMLET.x, z - ISAREOS_HAMLET.z) < ISAREOS_HAMLET.radius + margin) return true;
  return ISAREOS_HAMLET_PATHS.some(q => q.points.some((b, i) => i > 0 && segmentDistance(x, z, q.points[i - 1], b) < q.width / 2 + 1 + margin));
}

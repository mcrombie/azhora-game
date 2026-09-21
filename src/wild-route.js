/**
 * Mus does not use the road. He says so himself - "It goes where everybody knows it goes" - and
 * until now the game did not agree with him: `route: 'wild'` was authored on his roster row and
 * read by nothing, so he waited in the landing ring with everybody else, walked the main road,
 * paused at all three stops, and at his earliest draw mustered at minute 19.8, ahead of a
 * traveler who goes straight there (docs/drent-long-road-probe.md).
 *
 * **The user's ruling, 2026-09-20: his wild route is long, and he cannot beat the road.** He
 * keeps his whole draw, the half-minute before the traveler included - he may well be ashore
 * first - but the wilderness is honestly longer than the road, so a traveler who walks straight
 * to the muster is always in before him. Nothing about the draw is clipped.
 *
 * So: a strand of his own round the headland south of the harbour, then west through the low
 * country behind Drent, up the long way round the head of the bay, and onto the Moros plain from
 * the north-west, coming down on the camp across open ground rather than in at the gate the
 * others use. **1,695 m against the road's 1,295**, and walked at 0.88 m/s rather than his own
 * 1.42, because there is no road under it. He musters between minute 32.3 and minute 96.3,
 * depending on his draw; the direct traveler is in at about 27.
 *
 * Every metre of it was authored against the built world rather than drawn on a map: A* over
 * ground `canStand` accepts, with the main road fenced off at 40 m, then simplified to the
 * fewest waypoints that keep both rules. **It never comes within 89 m of the main road** until
 * it is 41 m from the camp, which is the join and is meant to be. That matters beyond taste:
 * the long road's companion remarks on any mercenary who passes within 40 m, and Mus must never
 * be the one she remarks on.
 *
 * Pure: no DOM, no three. The muster point is appended by `createMercenaryCompany`, so this
 * never has to know where the camp is.
 */
const freeze = Object.freeze;
const point = (x, z) => freeze({ x, z });

/** How a man moves when there is no road under him, and how far he stays off the one there is. */
export const WILD = freeze({
  /** Metres a second through rough country. His road pace is 1.42; this is what the rough costs. */
  pace: .88,
  /** How far his line keeps off the main road, everywhere but the join. Measured: 89 m. */
  clearance: 40,
  /** He waits on his own strand this long before he goes, the same 45 s the roster gives him. */
  beachYaw: -Math.PI / 2,
});

/**
 * The route, bow to stern, ending one waypoint short of the muster: the company appends that.
 * The first point is his beach, which is where `placements()` stands him while he waits.
 */
export const MUS_ROUTE = freeze([
  point(10, -60),      // the strand round the headland, south of the harbour and out of sight of it
  point(-130, -75),    // inland, into the low country behind Drent
  point(-290, -75),
  point(-360, -75),
  point(-730, -75),    // west, well south of the road the whole way
  point(-990, -40),
  point(-1040, -20),
  point(-1060, 0),     // up round the head of the bay
  point(-1070, 110),
  point(-1020, 490),   // down the long slope toward the plain
  point(-1000, 545),   // and onto it from the north-west, across open ground
]);

/** His own beach, where the sea puts him down and where he waits. */
export const MUS_BEACH = MUS_ROUTE[0];

/** The length of a polyline, in metres. */
export const routeMetres = path => {
  let total = 0;
  for (let i = 1; i < path.length; i++) total += Math.hypot(path[i].x - path[i - 1].x, path[i].z - path[i - 1].z);
  return total;
};

/**
 * What the route costs him, given where the muster is. `metres` is the whole line including the
 * last leg onto the camp; `seconds` is that at his rough pace; `musters` is when he arrives,
 * given the moment he was drawn for.
 */
export function wildJourney(muster) {
  const path = muster ? [...MUS_ROUTE, muster] : [...MUS_ROUTE];
  const metres = routeMetres(path);
  return freeze({ path: freeze(path), metres, seconds: metres / WILD.pace });
}

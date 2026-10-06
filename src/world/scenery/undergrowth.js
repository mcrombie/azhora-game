/**
 * **Undergrowth: a deep forest is a country you cannot go straight through.**
 *
 * The user's decision of 30 September 2026, asked directly what a deep forest should be in Azhora:
 * *a country you cannot see far in and cannot go straight through*. The first half is the haze
 * (`palette.hazeDensity` in `src/world/terrain/region-world.js`; Trogo's is `.0144`, which hides a traveler at a
 * hundred and twenty metres). This file is the second half.
 *
 * **It is the shape of `src/gameplay/movement/climbing.js` and deliberately so.** Like the climbing rule it owns no
 * input, no rendering and no saved state; like the climbing rule it gates movement through the
 * `canTraverse` hook that `moveCharacter` already takes (`src/gameplay/movement/game-state.js`), wired in `src/main.js`
 * beside `canWalkSlope`; and like the climbing rule **it applies only inside a named set of regions**,
 * because the rest of Azhora has scrub and thicket sitting on the autoplays' roads and a movement gate
 * that reached them would strand the autopilot, a quest route or a traveler. The climbing rule is
 * Lotharn-and-Suval-only for exactly that reason. This one is Trogo-only today.
 *
 * ## The rule, in three lines
 *
 * A country in `THICKETS` hands over one field: `open(x, z)`, which is 1 on ground a traveler can walk
 * and 0 in thicket they cannot push into. A step is refused when, and only when, **it would take
 * somebody off a way and into the thicket**. Everything else is allowed:
 *
 *  - a step to ground that is open enough is always allowed - that is walking along a way;
 *  - a step *from* ground that is not open enough is always allowed - **so nobody is ever held inside
 *    the thicket**, however they got there. A traveler put down in the middle of the canopy by F8, by a
 *    restored save or by a spawn walks out, and the fence closes behind them.
 *
 * That asymmetry is the same one `canWalkSlope` makes when it refuses an ascent and allows a descent
 * ("a steep descent loses ground support and falls in the traveler controller; it is not an invisible
 * wall"), and it is what makes this rule provably unable to seal anybody in: **the refusal never
 * depends on where a body already is except to let it go.** `tests/trogo-undergrowth.test.js` floods
 * the country in both directions and proves both halves - crossable along the ways, and not crossable
 * without them - and `tests/nobody-sealed-in.test.js` is untouched by it, because this rule adds no
 * collider and `canStand` never asks it anything.
 *
 * ## Why a field and not a geometry
 *
 * `THICKETS` holds a region set and a function, and nothing else. It knows no polyline, no clearing and
 * no watercourse: Trogo's own `trogoWay` (`src/content/regions/southwest/southwest-world.js`) is what knows those, because they
 * belong to the country. **Adding the Ibenwoods is one row here and one field there** - five regions and
 * about a hundred and fifty hexes of `forest` and `deep_forest`, whose ways will be its rides, its
 * streams and its charcoal clearings rather than Trogo's gullies - and nothing in this file changes.
 *
 * Pure: no three, no DOM, no input, no state.
 */
import { trogoWay } from '../../content/regions/southwest/southwest-world.js';

/**
 * `open` is the threshold a step's destination must clear, on the 0-to-1 scale the country's own field
 * answers. Half: a way's field is 1 along its middle and feathers to 0 over about half its width again,
 * so half is roughly the edge of the trodden part of it.
 *
 * `reach` is how far ahead of a body the rule looks when something asks it for a prompt rather than for
 * a step; nothing in the game asks yet, and it is here because `CLIMBING.reach` is.
 */
export const UNDERGROWTH = Object.freeze({ open: .5, reach: 1.1 });

/**
 * Every country with a thicket in it, and the field each one answers with. One row per forest country;
 * the region set carries both the id and the name, because `world.regionAt` answers an object, an id or
 * a name depending on who is asking (the climbing rule's own `CLIMB_REGIONS` does the same).
 */
// The number is `REGION_IDS.Trogo`, written out the way `CLIMB_REGIONS` writes its own, and
// `tests/trogo-undergrowth.test.js` holds the two together. It read 44 for a day after the block was
// renumbered 32-44 -> 39-51 behind the Ibenwood belt, which put Trogo's rule on the West Meroshe
// Desert as well; nothing was ever refused there, because `trogoWay` answers 1 outside Trogo.
const THICKETS = Object.freeze([
  Object.freeze({ id: 'trogo', regions: new Set([51, 'Trogo']), open: trogoWay }),
]);

const region = (world, x, z) => world?.regionAt?.(x, z);
const holds = (set, r) => set.has(r) || set.has(r?.id) || set.has(r?.name);

/** The thicket a point stands in, or null. */
export function thicketAt(world, x, z) {
  const r = region(world, x, z);
  if (r === undefined || r === null) return null;
  for (const thicket of THICKETS) if (holds(thicket.regions, r)) return thicket;
  return null;
}

/** True where this rule has an opinion at all: inside one of the forest countries. */
export const isThicketTerrain = (world, x, z) => thicketAt(world, x, z) !== null;

/**
 * How open a point is, 0 in the thicket and 1 on a way - and **1 everywhere this rule says nothing**,
 * so a caller can read it over a whole map without asking twice whether it applies.
 */
export function undergrowthOpen(world, x, z) {
  const thicket = thicketAt(world, x, z);
  if (!thicket) return 1;
  const open = thicket.open(x, z);
  return Number.isFinite(open) ? Math.max(0, Math.min(1, open)) : 1;
}

/** True where a traveler can walk: on a way, or anywhere this rule has no opinion. */
export const onWayThrough = (world, x, z) => undergrowthOpen(world, x, z) >= UNDERGROWTH.open;

/**
 * The gate. `canTraverse`'s shape exactly, and `canWalkSlope`'s: four numbers, a world, and true when
 * the step may be taken.
 *
 * The walking resolver moves X and Z separately, and that is the whole reason the rule reads the
 * destination and not the direction: a traveler walking diagonally along a gully has the component that
 * leaves it refused and the component that follows it allowed, so they slide along the way instead of
 * stopping at it. There is no diagonal to exploit either - both axes are checked against the same field
 * at their own destinations, so no alternation of two permitted steps arrives anywhere a single step
 * could not.
 */
export function canPushThrough(fromX, fromZ, toX, toZ, world) {
  const thicket = thicketAt(world, toX, toZ);
  if (!thicket) return true;
  const to = thicket.open(toX, toZ);
  if (!Number.isFinite(to) || to >= UNDERGROWTH.open) return true;
  const here = thicketAt(world, fromX, fromZ);
  if (!here) return false;
  const from = here.open(fromX, fromZ);
  // Already in the thicket: never held. This is the clause that makes sealing anybody in impossible.
  return !Number.isFinite(from) || from < UNDERGROWTH.open;
}

/** The region sets this rule holds, for the tests and for whoever adds the next forest. */
export const UNDERGROWTH_REGIONS = Object.freeze(THICKETS.map(thicket => thicket.regions));

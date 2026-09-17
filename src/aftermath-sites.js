/**
 * Where the chapter after the border battle happens (`src/aftermath-chapter.js`
 * names these sites and arenas; this module puts them on the ground).
 * A site is where someone stands; an arena is `{ center, retreatAxis }`, and the
 * combat rules only allow a retreat toward +axis. `null` means the place is not
 * built yet: the chapter then waits, and the journal says so.
 * Pure: no DOM, no three.
 */
const site = (x, z, yaw, name) => Object.freeze({ x, z, yaw, name });
const arena = (x, z, retreatAxis) => Object.freeze({ center: Object.freeze({ x, z }), retreatAxis });

export const AFTERMATH_SITES = Object.freeze({
  // Outside the Legion camp's north-east gate, off the road, clear of the gate guards.
  'camp-gate': site(-518.5, 326.5, 2.2, 'The Legion camp’s gate'),
  // South-west of the border stockade, where the line commanders stood for the battle.
  'stockade-approach': site(-396, 325, 0, 'The border stockade'),
  'solis-gate': null,
  'solis-hall': null,
});

export const AFTERMATH_ARENAS = Object.freeze({
  // The pursuit comes off the plain from the north; the retreat is south through the camp's gate.
  'camp-approach': arena(-521.9, 310.15, 'z'),
  // The ground of the border battle, fought over a second time.
  'stockade-yard': arena(-392, 308, 'z'),
  'solis-square': null,
  'solis-approach': null,
});

export const aftermathSite = id => AFTERMATH_SITES[id] ?? null;
export const aftermathArena = id => AFTERMATH_ARENAS[id] ?? null;

/** Whether every place a variant needs exists yet. */
export function aftermathBuilt(spec) {
  if (!spec) return false;
  return !!aftermathSite(spec.rallySite) && !!aftermathArena(spec.arena) && (spec.reportSite === null || !!aftermathSite(spec.reportSite));
}

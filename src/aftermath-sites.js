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
  // Outside the north-east gate of the Legion's outpost on the Moros, off the road, clear of the gate guards.
  'camp-gate': site(-518.5, 326.5, 2.2, 'The Legion camp’s gate'),
  // On the road east of that gate, behind where the storming party forms up.
  'outpost-approach': site(-478, 318, Math.PI / 2, 'The road to the Legion’s outpost'),
  // The Legate's own place before the command tent, once he has quit it.
  'outpost-command': site(-543.2, 361.1, Math.PI, 'The command tent of the outpost'),
  'solis-gate': null,
  'solis-hall': null,
});

export const AFTERMATH_ARENAS = Object.freeze({
  // The pursuit comes off the plain from the north; the retreat is south through the camp's gate.
  'camp-approach': arena(-521.9, 310.15, 'z'),
  // The defenders stand before the north-east gate; the storming party comes from the east and falls back east along the road.
  'outpost-gate': arena(-497, 323, 'x'),
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

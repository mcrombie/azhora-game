/**
 * Where the chapter after the border battle happens (`src/aftermath-chapter.js`
 * names these sites and arenas; this module puts them on the ground).
 * A site is where someone stands; an arena is `{ center, retreatAxis, retreatSign }`:
 * the traveler falls back along the axis, toward +axis unless the sign is -1.
 * `null` means the place is not built yet: the chapter then waits, and the
 * journal says so.
 * Pure: no DOM, no three.
 */
import { toWorld } from './world-scale.js';

// Coordinates are the authored ones (56 m per hex) and are converted here, at
// the boundary, like every other literal table. `aftermathEncounter` adds its
// offsets after this, so only a site's stand and an arena's centre convert.
const site = (x, z, yaw, name) => Object.freeze({ ...toWorld(x, z), yaw, name });
const arena = (x, z, retreatAxis, retreatSign = 1) => Object.freeze({ center: Object.freeze(toWorld(x, z)), retreatAxis, retreatSign });

export const AFTERMATH_SITES = Object.freeze({
  // Outside the north-east gate of the Legion's outpost on the Moros, off the road, clear of the gate guards.
  'camp-gate': site(-518.5, 326.5, 2.2, 'The Legion camp’s gate'),
  // On the road east of that gate, behind where the storming party forms up.
  'outpost-approach': site(-478, 318, Math.PI / 2, 'The road to the Legion’s outpost'),
  // The Legate's own place before the command tent, once he has quit it.
  'outpost-command': site(-543.2, 361.1, Math.PI, 'The command tent of the outpost'),
  // Solis (src/west-suval.js). Authored points in the `solis` cluster: an offset from (-297, 551) is metres in the city's frame.
  // Outside the Gate of Sun Horses, east of the causeway and beside the road, clear of the watch and the hitching rail.
  'solis-gate': site(-287.5, 497.5, Math.PI, 'The Gate of Sun Horses'),
  // On the road north of the Gate of Sun Horses, out of bowshot, where the Legion forms up to storm it.
  'solis-road': site(-294, 461, 0, 'The Solis road, north of the gate'),
  // On the steps of the Court of Oaths, facing the plaza.
  'solis-hall': site(-279.5, 553, -Math.PI / 2, 'The Court of Oaths'),
});

export const AFTERMATH_ARENAS = Object.freeze({
  // The pursuit comes off the plain from the north; the retreat is south through the camp's gate.
  'camp-approach': arena(-521.9, 310.15, 'z'),
  // The defenders stand before the north-east gate; the storming party comes from the east and falls back east along the road.
  'outpost-gate': arena(-497, 323, 'x'),
  // Before the Gate of Sun Horses, from outside: the Coalition holds the ground in front of the gate and its
  // reserve comes out through the gateway; the storming party falls back north, up the road.
  'solis-gate-assault': arena(-297, 486.9, 'z', -1),
  // The road outside the Gate of Sun Horses; the outriders come down it from the north and the retreat is south to the gate.
  'solis-approach': arena(-297, 473.5, 'z'),
});

export const aftermathSite = id => AFTERMATH_SITES[id] ?? null;
export const aftermathArena = id => AFTERMATH_ARENAS[id] ?? null;

/** Whether every place a variant needs exists yet. */
export function aftermathBuilt(spec) {
  if (!spec) return false;
  return !!aftermathSite(spec.rallySite) && !!aftermathArena(spec.arena) && (spec.reportSite === null || !!aftermathSite(spec.reportSite));
}

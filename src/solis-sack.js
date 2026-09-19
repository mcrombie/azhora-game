/**
 * The sack of Solis, three years on (docs/the-war-and-the-house-of-ambron.md):
 * in 977 Prince Wilhelm stormed the city, burned it, and turned on the allies
 * besieging it beside him. Solis was left mostly destroyed. The Empire held it
 * for three years and mended what it needed: the Gate of Sun Horses and the wall
 * either side of it, the tax house, its own barracks. The Coalition has held it a
 * week. Nobody has had the money to finish the rest.
 *
 * So the walls are only partly repaired. Some stretches stand in old stone still
 * black from the fire, their merlons knocked off; some are new, pale courses laid
 * since; some are going up behind scaffolding; and three breaches are shut with
 * nothing better than a timber palisade and the rubble left where it fell. Towers
 * have lost their roofs, one its whole crown. Half the houses are shells, open to
 * the sky, or heaps; the rest have new roofs over smoke-stained walls.
 *
 * Pure: no three, no DOM. `src/west-suval-world.js` draws it. Nothing here moves
 * a collider: a breach is shut by its palisade, so the two gates are still the
 * only ways in, and a burnt house keeps its footprint.
 */
import { wallRuns, SOLIS_TOWERS, SOLIS_BUILDINGS } from './west-suval.js';

const freeze = Object.freeze;
const span = (face, from, to, state) => freeze({ face, from, to, state });

/**
 * What became of each stretch of curtain wall, by face and span along it (see
 * `wallRuns`). A stretch not listed is old stone that came through.
 *  - 'repaired': rebuilt since the sack, in pale new stone, merlons whole;
 *  - 'scorched': old stone, black from the fire along its top, merlons broken;
 *  - 'scaffold': going up again, new courses below and scaffolding and boarding above;
 *  - 'breach': thrown down to a ragged stump and shut with a timber palisade, rubble spilled out into the ditch.
 */
export const WALL_DAMAGE = freeze([
  // The north face, where the road comes in: the Empire mended the gate and the wall either side of it first.
  span('north', -48, -20, 'scorched'), span('north', -20, -8.3, 'repaired'),
  span('north', 8.3, 20, 'repaired'), span('north', 20, 33, 'breach'), span('north', 33, 41, 'scaffold'), span('north', 41, 48, 'scorched'),
  // The east face, where Wilhelm's rams came through.
  span('east', -40, -3, 'scorched'), span('east', 3, 21, 'breach'), span('east', 21, 40, 'scorched'),
  // The south face above the cliffs.
  span('south', -48, -20, 'scorched'), span('south', -14, 14, 'repaired'), span('south', 20, 34, 'breach'), span('south', 34, 48, 'scaffold'),
  // The sea wall was patched long before anybody sacked anything; the fire reached its northern end.
  span('west', 20, 40, 'scorched'),
]);
export const WALL_STATES = freeze(['sound', 'repaired', 'scorched', 'scaffold', 'breach']);

/** The state of the wall at a point `along` a face. */
export function wallStateAt(face, along) {
  return WALL_DAMAGE.find(entry => entry.face === face && along >= entry.from - 1e-6 && along <= entry.to + 1e-6)?.state ?? 'sound';
}

/**
 * The towers: 'rebuilt' (the gate towers of the Sun Horses, in new stone under new tile), 'roofless'
 * (the cap burned off, charred rafters standing), 'broken' (the crown thrown down, rubble at its foot).
 */
export const TOWER_DAMAGE = freeze({
  'sun-horses-left': 'rebuilt', 'sun-horses-right': 'rebuilt',
  'corner-2': 'broken', 'corner-3': 'roofless', 'south-17': 'roofless', 'east-0': 'roofless',
});
export const towerState = id => TOWER_DAMAGE[id] ?? 'sound';

/**
 * The Gate of Sun Horses was rebuilt by the Empire in new stone, with new oak leaves banded in iron: the old
 * bronze-studded ones burned. Only one of the two bronze horses is still up; the other was pulled down in
 * the sack and melted for coin, and its plinth is empty but for the hooves, sawn off at the fetlock.
 */
export const SUN_HORSE_GATE = freeze({ rebuilt: true, standing: freeze([1]), fallen: freeze([-1]) });

/**
 * The houses: 'shell' (burned out and open to the sky), 'collapsed' (a heap inside its stumps),
 * 'scaffold' (a shell being rebuilt), 'rebuilt' (new roof over smoke-stained walls). Not listed: came through.
 */
export const BUILDING_DAMAGE = freeze({
  'house-nw-1': 'shell', 'house-ne-1': 'shell', 'house-e-3': 'shell', 'house-l-1': 'shell', 'warehouse-1': 'shell', 'house-ne-2': 'shell',
  'house-e-5': 'collapsed',
  'house-nw-2': 'scaffold',
  'tax-house': 'rebuilt', 'legion-barracks': 'rebuilt', 'inn': 'rebuilt', 'counting-house': 'rebuilt',
  'guest-house': 'rebuilt', 'house-l-2': 'rebuilt', 'warehouse-2': 'rebuilt',
});
export const buildingState = id => BUILDING_DAMAGE[id] ?? 'sound';
/** Houses nobody lives in: the sack's ruins. */
export const RUINED_BUILDINGS = freeze(Object.keys(BUILDING_DAMAGE).filter(id => ['shell', 'collapsed', 'scaffold'].includes(BUILDING_DAMAGE[id])));

/** Everything named here exists in the city's plan (checked by tests/solis-sack.test.js). */
export function sackRefersToPlan() {
  const towers = new Set(SOLIS_TOWERS.map(tower => tower.id)), buildings = new Set(SOLIS_BUILDINGS.map(building => building.id));
  const spansFit = WALL_DAMAGE.every(entry => wallRuns(entry.face).some(([from, to]) => entry.from >= from - 1e-6 && entry.to <= to + 1e-6));
  return spansFit && Object.keys(TOWER_DAMAGE).every(id => towers.has(id)) && Object.keys(BUILDING_DAMAGE).every(id => buildings.has(id));
}

/**
 * What each of the townsfolk remembers of the fire. Everyone in Solis has a
 * version of that night; these are the ones they tell a stranger.
 */
export const SACK_MEMORIES = freeze({
  'solis-merchant': 'Three years ago the Blood Prince came through that gate and my warehouse went up with everything in it. I started again with six jars. I have forty now. Do not tell me about hard times.',
  'solis-fountain-woman': 'The night of the fire we carried water from this fountain until our hands bled, and it did no good at all. The whole east quarter went. The fountain never stopped running. I have not forgiven it.',
  'solis-porter': 'Half the lower town burned the night Wilhelm came in. The warehouse by the sea gate is still a shell; we stack the jars in its walls and pray for no rain.',
  'solis-elder': 'I watched the Blood Prince come through the east wall from this bench. He was supposed to be on the same side as the men outside. By morning he had killed them too. The breach is still there. They put a fence in it.',
  'solis-temple-keeper': 'We had the whole lower town in the temple the night of the fire, and they did not burn the temple. I have never known why. The guest house went up, and the old keeper with it; the Empire roofed it again for its own wounded.',
  'solis-innkeeper': 'The Bronze Mare lost its roof in the fire and I lost my husband on the stairs. The Empire paid for the new roof, give them that. They sent a clerk to tell me so every month for three years.',
});

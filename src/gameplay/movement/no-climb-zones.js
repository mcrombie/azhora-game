/**
 * **Rock that gives no hold**: the game's one table of places a climber cannot climb, a row to a place.
 *
 * The climbing rule (src/gameplay/movement/climbing.js) asks the world, `world.unclimbableAt(x, z)`, wherever it decides
 * whether a hand can go somewhere - the surface a grab looks for, and every attached step of a climb - and
 * the world answers from this table. Walking, falling and sliding are not its business: a walker still
 * cannot walk up such a face (`canWalkSlope`), and a faller still comes down it.
 *
 * A row is `{ id, name, where, why, at(x, z) }`. `at` is the place's own function, kept in the place's own
 * module beside the ground it describes; this file only gathers them. Adding a place is one row.
 *
 * Pure: no three, no DOM.
 */
import { varnUnclimbable } from '../../content/regions/varn/varn-world.js';
import { fortUnclimbable } from '../../content/regions/west-lotharn/lotharn-forts.js';
import { kethornUnclimbable } from '../../content/regions/telemonia/telemonia-world.js';

export const NO_CLIMB_ZONES = Object.freeze([
  Object.freeze({ id: 'varn', name: 'The rock within Varn’s reach', where: 'Amod and the East Lotharn Mountains',
    why: 'Varn’s curtain is built into the rock either side of it, and the mountains over the Empire’s ground for half a kilometre either way give no hold on their first cliff or on the rim of their ledges: no climber goes over the wall, round its ends, or up or down the first cliff anywhere near. The one way is the two slabs on the east jamb, which keep their hold, as do the peaks’ own ways. The eastern peak’s own first ramp still leads up to its shelf and its summit, and its fourth ledge, from the peak’s way to the high chimney, keeps its hold off the rims; nothing leads down from them over the Empire’s ground.',
    at: varnUnclimbable }),
  Object.freeze({ id: 'lotharn-forts', name: 'The cliffs the pass forts are built between', where: 'The East and West Lotharn Mountains',
    why: 'Each of the Empire’s forts on the Lotharn passes is one wall from cliff to cliff: the first cliff its two ends die into gives no hold either side of it. The ledges above are left to be climbed.',
    at: fortUnclimbable }),
  Object.freeze({ id: 'kethorn', name: 'Kethorn’s rock', where: 'Telemonia',
    why: 'The crag the Telemon town stands on, with the wall across its spur: the gate is the only way onto the top, for a walker and for a climber. The rim of the country is left to be climbed.',
    at: kethornUnclimbable }),
]);

/** Whether a point is on rock no hand holds. */
export const unclimbableAt = (x, z) => NO_CLIMB_ZONES.some(zone => zone.at(x, z));

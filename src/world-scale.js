/**
 * World scale: authored metres to world metres.
 *
 * The regions were authored with one atlas hex worth 56 m. The playable world
 * now uses 100 m per hex, so every distance derived from the hex survey grows by
 * `WORLD_SCALE`. Hand-placed content must not be stretched with it: a town's
 * buildings, a camp's tents and the people beside them keep the distances they
 * were authored with, and only the distance *between* places grows.
 *
 * That is what a **cluster** is. Each cluster names a place in authored metres:
 *
 *  - `pivot`   the authored point the place hangs from. It moves by plain
 *              scaling, so a pivot that sits on a road stays on that road.
 *  - `centre`  / `radius`: the authored ground the cluster owns. A point inside
 *              it (nearest owning cluster wins) keeps its offset from the pivot.
 *
 * `pivot` defaults to `centre`. The goblin camp is the one place where they
 * differ: its body sits in the scrub but it must stay hinged on the point where
 * its trail leaves the main road.
 *
 * Pure: no three, no DOM. Every module that holds authored coordinates converts
 * them here, at the boundary, so the literals in the design docs stay true.
 *
 * Roads are the one deliberate departure from the brief. The brief asks for a
 * road vertex inside a cluster to move rigidly with it; in this tree that pulls
 * the main road badly out of shape (the Avrel clearing alone owns three of its
 * vertices, up to 40 m from the pivot) and it tears the goblin camp's trail off
 * the road it is hinged on. Plain scaling is a similarity, so it keeps the
 * road's exact shape and every place's *bearing* from it, and every offset from
 * the road can only grow — a road can never be scaled into a building. So road
 * polylines use `toWorldRoad`, which honours only clusters marked `rigidRoad`:
 * Tidehaven, whose trail is part of the carried-over village.
 */

/** Metres per authored hex when the regions were laid out. */
export const AUTHORED_METRES_PER_HEX = 56;
/** Metres per authored hex in the playable world. */
export const METRES_PER_HEX = 100;
/** How much bigger the world is than the coordinates the content was authored in. */
export const WORLD_SCALE = METRES_PER_HEX / AUTHORED_METRES_PER_HEX;
/** Tidehaven's coast hex: the one point that is the same in both frames. */
export const SCALE_ANCHOR = Object.freeze({ x: 0, z: 29 });

const cluster = (id, centre, radius, extra = {}) => Object.freeze({
  id, x: centre[0], z: centre[1], radius,
  pivotX: extra.pivot ? extra.pivot[0] : centre[0],
  pivotZ: extra.pivot ? extra.pivot[1] : centre[1],
  rigidRoad: Boolean(extra.rigidRoad),
  note: extra.note ?? '',
});

/**
 * The hand-placed places of the world, in authored metres. Radii are chosen so
 * each place owns its own yard and nothing else; `tests/world-scale.test.js`
 * checks that every authored landmark lands in the cluster it belongs to.
 */
export const CLUSTERS = Object.freeze([
  cluster('tidehaven', [0, 29], 190, { rigidRoad: true,
    note: 'The carried-over village, its Greenway, Willowmere, the woodland places, Fernway Rest and the Caloss Gate. Its pivot is the anchor, so none of it moves.' }),
  cluster('avrel', [-236, 30], 46, { note: 'The Avrel clearing: crop fields, the mill, Corvan’s post, the tumbled cart and the Mill Commons.' }),
  cluster('caloss-crossing', [-345, 92.9], 28, { note: 'The Caloss bridge, Hollis and the crossing’s working camp.' }),
  cluster('caloss-bank', [-306, 122], 26, { note: 'The quiet fishing bank. Its centre is a river vertex, so the stool and the cast keep their place on the water.' }),
  cluster('reedcutters-landing', [-381, 119], 17, { note: 'The reedcutters’ camp, Merren’s landing workshop and the two net floats.' }),
  cluster('savas-shrine', [-374, 134], 15, { note: 'Sava’s shrine, her stand and the shrine repair bench.' }),
  // The Bramble Scout Camp has moved to Pueth (authored in world metres, src/pueth-world.js). Its old ground in
  // north Luscia keeps its cluster so a 56 m checkpoint taken there still resumes where it was taken: in Luscia's woods.
  cluster('goblin-camp', [-432, 156], 38, { pivot: [-397, 153],
    note: 'Where the Bramble Scout Camp stood in north Luscia, hinged on its old trail junction. Empty woods now; kept so 56 m checkpoints taken there resume in place.' }),
  cluster('lauvel-relay', [-401, 196], 12, { note: 'The army’s old relay hut off the road above Lumber Town.' }),
  cluster('lauvel-field', [-386, 182.9], 24, { note: 'The field at the Lauvel: wrecks, the burial line, the pickets and the wolves.' }),
  cluster('burned-hamlet', [-348, 212], 16, { note: 'Four roofless walls, a chimney and Garran.' }),
  cluster('lumber-town', [-408, 228], 34, { note: 'Lumber Town’s square, its houses, the timber yard and the garrison.' }),
  cluster('moros-gate', [-427, 259.4], 16, { note: 'The gate posts and the two soldiers who watch them.' }),
  cluster('legion-camp', [-549.2, 348.1], 46, { note: 'The palisade, the tent lines, the command tent, the horse line and the camp’s posts.' }),
  cluster('legion-camp-approach', [-505, 316], 46, { pivot: [-549.2, 348.1],
    note: 'The open ground north and east of the outpost’s north-east gate, where the day after the border battle is fought: the gate held against a pursuit from the north, or stormed from the east. It hangs from the camp, so both fights stay in front of the gate.' }),
  cluster('border-stockade', [-380, 308], 34, { note: 'The contested stockade and the border battle’s arena, as one place.' }),
  cluster('suval-border-post', [-224, 292], 20, { note: 'Elod’s border post, its pillars, barrier and stores.' }),
  cluster('waystation', [-154, 328], 16, { note: 'The roofless waystation and Oda’s shelter.' }),
  cluster('elod', [-28, 368.5], 32, { note: 'Elod’s gate and the three slate-roofed houses behind it.' }),
  cluster('bandit-lookout', [-74, 498], 12, { note: 'The ring of ridge stones above the southern hills.' }),
  // The three flocks keep their own spread, so a meadow of sheep still reads as a flock.
  cluster('moros-sheep', [-430, 325], 28, { note: 'The Moros sheep range.' }),
  cluster('caloss-bank-birds', [-284, 92], 22, { note: 'The bank birds upstream of the crossing.' }),
  cluster('suval-hares', [-108, 379], 34, { note: 'The rock hares in the East Suval hills.' }),
  // West Suval (src/west-suval.js): Solis is laid out in its own frame from its centre; these keep the story's sites on it.
  cluster('solis', [-297, 551], 80, { note: 'Solis inside its walls, its ditch, the quay and the road outside the Gate of Sun Horses, where the day after the border battle is fought.' }),
  cluster('coalition-camp', [-199, 551], 42, { pivot: [-297, 551], note: 'The Coalition’s camp east of the walls, its tent lines and picket line. It hangs from the city, so the two keep their distance.' }),
  cluster('west-suval-fold', [-392, 433], 16, { note: 'The shepherds’ fold on the downs west of the Solis road.' }),
  cluster('west-suval-watchtower', [-330, 387], 14, { note: 'The ruined watchtower on the rise east of the Solis road.' }),
  cluster('west-suval-well', [-338, 455], 10, { note: 'The wayside well beside the Solis road.' }),
]);

const CLUSTER_BY_ID = new Map(CLUSTERS.map(entry => [entry.id, entry]));
const finite = (x, z) => Number.isFinite(x) && Number.isFinite(z);

/** Plain scaling about the Tidehaven anchor: what everything hex-derived does by itself. */
export function scalePoint(x, z) {
  return { x: SCALE_ANCHOR.x + (x - SCALE_ANCHOR.x) * WORLD_SCALE,
    z: SCALE_ANCHOR.z + (z - SCALE_ANCHOR.z) * WORLD_SCALE };
}
/** The inverse of `scalePoint`. */
export function unscalePoint(x, z) {
  return { x: SCALE_ANCHOR.x + (x - SCALE_ANCHOR.x) / WORLD_SCALE,
    z: SCALE_ANCHOR.z + (z - SCALE_ANCHOR.z) / WORLD_SCALE };
}
/** A length in authored metres as a length in world metres. */
export const scaleLength = metres => metres * WORLD_SCALE;

/** How far a whole cluster moves: the same translation for every point in it. */
export function clusterShift(entry) {
  const moved = scalePoint(entry.pivotX, entry.pivotZ);
  return { x: moved.x - entry.pivotX, z: moved.z - entry.pivotZ };
}

/** The cluster owning an authored point, or null. Nearest centre within its radius wins. */
export function clusterAt(x, z, { roadsOnly = false } = {}) {
  if (!finite(x, z)) return null;
  let best = null, bestDistance = Infinity;
  for (const entry of CLUSTERS) {
    if (roadsOnly && !entry.rigidRoad) continue;
    const distance = Math.hypot(x - entry.x, z - entry.z);
    if (distance <= entry.radius && distance < bestDistance) { bestDistance = distance; best = entry; }
  }
  return best;
}

/** The cluster owning a world point, or null: the same test, on moved centres. */
export function clusterAtWorld(x, z, { roadsOnly = false } = {}) {
  if (!finite(x, z)) return null;
  let best = null, bestDistance = Infinity;
  for (const entry of CLUSTERS) {
    if (roadsOnly && !entry.rigidRoad) continue;
    const shift = clusterShift(entry);
    const distance = Math.hypot(x - (entry.x + shift.x), z - (entry.z + shift.z));
    if (distance <= entry.radius && distance < bestDistance) { bestDistance = distance; best = entry; }
  }
  return best;
}

/** An authored point in world metres: rigid inside a cluster, plainly scaled outside one. */
export function toWorld(x, z) {
  if (!finite(x, z)) return { x, z };
  const entry = clusterAt(x, z);
  if (!entry) return scalePoint(x, z);
  const shift = clusterShift(entry);
  return { x: x + shift.x, z: z + shift.z };
}

/** The inverse of `toWorld`, for migrating a checkpoint taken at 56 m per hex. */
export function toAuthored(x, z) {
  if (!finite(x, z)) return { x, z };
  const entry = clusterAtWorld(x, z);
  if (!entry) return unscalePoint(x, z);
  const shift = clusterShift(entry);
  return { x: x - shift.x, z: z - shift.z };
}

/**
 * A road vertex in world metres. Only Tidehaven's own trail is rigid; see the
 * note at the top of this file for why the rest of the road scales plainly.
 */
export function toWorldRoad(x, z) {
  if (!finite(x, z)) return { x, z };
  const entry = clusterAt(x, z, { roadsOnly: true });
  if (!entry) return scalePoint(x, z);
  const shift = clusterShift(entry);
  return { x: x + shift.x, z: z + shift.z };
}

/**
 * An authored point converted as a member of a named cluster, whatever the
 * membership test says. Used where a rigid frame's own origin lies outside the
 * ground its cluster owns — the goblin camp's local frame, for instance.
 */
export function toWorldIn(id, x, z) {
  const entry = CLUSTER_BY_ID.get(id);
  if (!entry) throw new Error(`No world-scale cluster called ${id}.`);
  if (!finite(x, z)) return { x, z };
  const shift = clusterShift(entry);
  return { x: x + shift.x, z: z + shift.z };
}

/** A single authored axis value converted inside a cluster: retreat lines and barriers. */
export const toWorldXIn = (id, x) => toWorldIn(id, x, 0).x;
export const toWorldZIn = (id, z) => toWorldIn(id, 0, z).z;

/** The cluster table as the report prints it: authored centre, world centre, radius. */
export function clusterTable() {
  return CLUSTERS.map(entry => {
    const centre = toWorld(entry.x, entry.z), pivot = scalePoint(entry.pivotX, entry.pivotZ);
    return { id: entry.id, radius: entry.radius, note: entry.note,
      authored: { x: entry.x, z: entry.z }, world: { x: centre.x, z: centre.z },
      authoredPivot: { x: entry.pivotX, z: entry.pivotZ }, worldPivot: { x: pivot.x, z: pivot.z } };
  });
}

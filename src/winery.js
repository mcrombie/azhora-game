/**
 * Paradise Springs, the winery in the north-east of West Suval where Lakota
 * worked before he came to Tidehaven. Drawn from the Virginia winery of the
 * same name: an old log cabin that was the first house on the land and is now
 * where the wine is poured, a great timber hall on a stone foot where it is
 * made, a flagstone terrace under the vines, and the spring the place is named
 * for. The rows run down the slope east of the hall.
 *
 * Laid out in world metres around WINERY.centre: `a` metres east, `b` metres
 * south (north is -z). Pure: no three, no DOM. `src/winery-world.js` builds it.
 */
const freeze = Object.freeze;
const point = (x, z) => freeze({ x, z });

export const WINERY = freeze({ id: 'paradise-springs', name: 'Paradise Springs', region: 'West Suval', centre: point(-470, 700), radius: 48 });
export const wineryPoint = (a, b) => point(WINERY.centre.x + a, WINERY.centre.z + b);

export const WINERY_LAYOUT = freeze({
  /** The name board at the lane's end, facing the traveler coming up from the downs. */
  sign: freeze({ ...wineryPoint(-34, 3), facing: -Math.PI / 2 }),
  /** The log cabin: the first house on the land, now the tasting room. Porch on the south side, chimney at the west end. */
  cabin: freeze({ ...wineryPoint(-17, -7), width: 7.5, depth: 5.6, eaves: 3.1, ridge: 5.2, porch: 2.2 }),
  /** The hall: stone foot, timber above, a tall barn roof and a cupola; its great doors open south onto the terrace. */
  hall: freeze({ ...wineryPoint(5, -10), width: 19, depth: 11, stone: 1.3, eaves: 5.4, ridge: 9.4 }),
  /** The terrace in front of the hall, and its tables. */
  terrace: freeze({ ...wineryPoint(5, 2.5), width: 17, depth: 7 }),
  tables: freeze([wineryPoint(-1.5, 2), wineryPoint(3.5, 3.2), wineryPoint(8.5, 2), wineryPoint(12.5, 3.4)]),
  /** Barrels resting on their chocks at the hall's east end. */
  barrels: freeze([wineryPoint(16.5, -6), wineryPoint(16.5, -4.9), wineryPoint(16.5, -3.8), wineryPoint(17.6, -5.45), wineryPoint(17.6, -4.35)]),
  /** The spring: a stone-lipped pool below the cabin that has never been known to fail. */
  spring: freeze({ ...wineryPoint(-19, 11), radius: 3.6 }),
  /** The vines: rows down the slope east and south of the hall, in five-metre panels between posts. */
  rows: freeze(Array.from({ length: 9 }, (_, i) => freeze({ a: 24 + i * 3, from: -18, to: 27 }))),
  /** The lane west to the Solis road across the downs. */
  lane: freeze([wineryPoint(-34, 3), point(-540, 706), point(-590, 712), point(-627, 716)]),
});

export const VINTNER = freeze({ id: 'vintner', name: 'Livia Seravo', role: 'Vintner of Paradise Springs', modelRole: 'shelter-keeper', color: 0x7d3a45, skin: 0xc79a74 });
export const CELLAR_HAND = freeze({ id: 'cellar-hand', name: 'Nico Arrend', role: 'Cellar hand', modelRole: 'reed-worker', color: 0x6a5a44, skin: 0xb88e66 });
export const WINERY_STANDS = freeze({
  vintner: freeze({ ...wineryPoint(-15.5, .4), yaw: 0 }),
  'cellar-hand': freeze({ ...wineryPoint(14.2, -3.4), yaw: -Math.PI / 2 }),
});

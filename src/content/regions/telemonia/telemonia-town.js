/**
 * Telemonia, stage 2: what the Telemon have built and planted, as pure numbers
 * (docs/telemonia-stage2-brief.md). Pure: no three, no DOM. `src/content/regions/telemonia/telemonia-town-scenery.js` draws it;
 * `src/content/regions/telemonia/telemonia-people.js` stands the people in it; the walked ways, the stock and the chart's places are
 * `src/content/regions/telemonia/telemonia-ways.js`'s; `tests/telemonia-town.test.js` holds it.
 *
 * **Kethorn, on the rock.** "The town is built of the stone it stands on. Inside the wall are the halls
 * of the bands, where the fighting men eat and sleep in common; the granaries and the cisterns; and the
 * hall of the king, which is said to be distinguishable from the others mainly by where it stands. There
 * is no inn, no foreign quarter, and no watch" (telemonia.md). So: six halls of the bands down the two
 * long sides of the top, long on the rock's grain; granaries and cisterns in the middle; one street from
 * the gate to the rock's north-eastern end; and at that end, on the highest ground over the cliffs and as
 * far from the gate as the rock goes, a hall built like the others and turned across the head of the
 * street. Nothing else: no market, no temple, no gatehouse ("whoever is nearest the gate is the gate").
 * Everything is in the rock's own frame (`kethornPoint(u, v)`: `u` toward the spur and the gate, `v`
 * across, north-west positive), inside the top's edge with three metres to spare.
 *
 * **The farms.** "Around the rock, the plain is farmed to its edges, and where the plain ends the
 * terraces begin." Barley and pulses on the Galmeth in long blocks laid on the rock's grain, with a baulk
 * between blocks and rows down each; fallow where the kingdom's cattle graze; nothing in a wash ("the
 * Telemon build nothing in a wash"), nothing on a pass's floor, the Rothkar way's foot, a stair's foot or
 * the rock's apron. The dry-country vine on the terraces, one row along the middle of every tread.
 *
 * **Where the field people live** is the builder's (the lore: "bound to the land ... allotted to the band
 * halls and overseen by them", and nothing on where they sleep). Derived: they are the halls' and not any
 * household's, so they live as the halls do, in common, in **rows of low dry-stone huts at the foot of the
 * terraces** - between the plain they plough and the treads they dress, outside the wall the lore implies
 * is for them, and nowhere near a wash. Four rows, one to a quarter of the plain. Poor and low: walls a
 * man's height, a roof of brush and earth on them.
 *
 * **The herds.** "The hill pastures carry cattle and horses" - but the rim is walked onto only by the one
 * way (stage 1), so the kingdom's beasts graze the Galmeth's margins: cattle on the fallow in the south
 * and the compact Telemon horse by the head of the east pass, each with a Telemon man by them. Two folds
 * of dry stone at the plain's edge are theirs (`PENS`; the builder's, as the huts are).
 *
 * **The sites** (`TELEMONIA_TOWN_SITES`, and every one of them in `TOWN_SITE_LIST`): where somebody who
 * belongs to the place stands, as frozen lists of `{ id, kind, x, z, yaw, ... }` on ground a body stands on
 * and walks off - `hallDoors` (`kethorn-band-hall-1-door` ... `-6-door`, `kethorn-king-hall-door`), `gate`
 * (`kethorn-gate-inside`, `kethorn-gate-outside`), `cisterns` (`kethorn-cistern-1-kerb`, `-2-kerb`),
 * `granaries` (`kethorn-granary-N-door`), `plainWork` (`telemonia-plain-work-1` ... `-24`, with `crop`),
 * `terraceWork` (`telemonia-terrace-work-1` ..., with `course`), `hutDoors` (`<hut id>-door`, with
 * `hamlet`) and `pens` (`telemonia-cattle-fold`, `telemonia-horse-fold`: the fold's middle, with `mouth`
 * outside its gateway). The full list, and what each means, is at `TELEMONIA_TOWN_SITES` below.
 *
 * **Kept clear**, every one tested (tests/telemonia-town.test.js): the street from the gate to the king's
 * hall; every wash and its banks; the passes' floors; the Rothkar way; every stair, and a lane ten metres
 * into the plain at each stair's foot; the rock's apron and spur; the travel button's landing.
 */
import {
  TELEMONIA, KETHORN, KETHORN_WALL, PLAIN_MIDDLE, TERRACES, INNER,
  kethornPoint, kethornFrame, onKethornTop, kethornLift, spurAt, plainDistance, washAt,
  passAt, wayAt, gullyAt, stairDistance, telemoniaPlace, inTelemoniaBox,
} from './telemonia-world.js';
import { hexOwnerAt, regions } from '../../../world/terrain/region-world.js';

const freeze = Object.freeze;
const point = (x, z) => freeze({ x, z });
const gap = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);

/** The rock's grain, as the game's people face: a yaw of `YAW_ALONG` looks along `u`, toward the gate. */
export const ALONG = (() => { const a = kethornPoint(0, 0), b = kethornPoint(1, 0); return point(b.x - a.x, b.z - a.z); })();
export const ACROSS = (() => { const a = kethornPoint(0, 0), b = kethornPoint(0, 1); return point(b.x - a.x, b.z - a.z); })();
export const YAW_ALONG = Math.atan2(ALONG.x, ALONG.z);
export const YAW_ACROSS = Math.atan2(ACROSS.x, ACROSS.z);
/** The yaw that faces from `from` to `to`, as the game's people face ({sin(yaw), cos(yaw)}). */
export const facing = (from, to) => Math.atan2(to.x - from.x, to.z - from.z);
const SPAWN = (() => { const r = regions.find(region => region.name === TELEMONIA); return r ? point(r.spawn.x, r.spawn.z) : point(-2016, 1196); })();

// ---------------------------------------------------------------------------
// Kethorn
// ---------------------------------------------------------------------------
/**
 * The street: from just inside the gate (the gate itself is at `u` 36-38) to the forecourt of the hall at
 * the north-eastern end, `half` metres either side of the rock's middle line. Kept clear of everything.
 */
export const KETHORN_STREET = freeze({ from: 33, to: -36, half: 4 });
/** Plain, heavy, stone: the heights of a wall to the eaves and of the roof over it. */
export const KETHORN_STONE = freeze({ eaves: 3.7, roof: .9, plinth: .35 });
const building = (id, kind, name, u, v, along, across, extra = {}) => {
  const c = kethornPoint(u, v);
  return freeze({ id, kind, name, u, v, along, across, x: c.x, z: c.z, yaw: YAW_ALONG,
    height: extra.height ?? KETHORN_STONE.eaves, door: extra.door ?? (v > 0 ? -1 : 1), turned: !!extra.turned, ...extra });
};
const round = (id, kind, name, u, v, radius, height) => {
  const c = kethornPoint(u, v);
  return freeze({ id, kind, name, u, v, radius, height, x: c.x, z: c.z, round: true });
};
/**
 * Every building on the rock. A hall is `along` metres on the grain and `across` metres over it; its door
 * is on the street side (`door`, the sign of `v` it faces). The halls of the bands are the lore's "where
 * the fighting men eat and sleep in common": a band is twenty to forty, and a hall of sixteen metres by
 * six and a half holds a band at its table and on its floor. The hall of the king is a band hall's size
 * and build, turned across the head of the street on the highest ground (`turned`: its long side faces the
 * gate), and that is the whole of the difference.
 */
export const KETHORN_BUILDINGS = freeze([
  building('kethorn-band-hall-1', 'band-hall', 'A hall of the bands', -21.5, 17.5, 16, 6.5),
  building('kethorn-band-hall-2', 'band-hall', 'A hall of the bands', -2.5, 19.5, 15, 6.5),
  building('kethorn-band-hall-3', 'band-hall', 'A hall of the bands', 13, 15.5, 9, 6),
  building('kethorn-band-hall-4', 'band-hall', 'A hall of the bands', -22, -19, 16, 6.5),
  building('kethorn-band-hall-5', 'band-hall', 'A hall of the bands', -2.5, -21, 15, 6.5),
  building('kethorn-band-hall-6', 'band-hall', 'A hall of the bands', 13, -14.5, 9, 6),
  building('kethorn-king-hall', 'king-hall', 'The hall of the king', -41, 2.5, 8, 14, { turned: true, door: 1 }),
  round('kethorn-granary-1', 'granary', 'A granary', -29, 9.5, 2.3, 3.4),
  round('kethorn-granary-2', 'granary', 'A granary', -19, 9.5, 2.3, 3.4),
  round('kethorn-granary-3', 'granary', 'A granary', -29, -9.5, 2.3, 3.4),
  round('kethorn-granary-4', 'granary', 'A granary', -19, -9.5, 2.3, 3.4),
  round('kethorn-granary-5', 'granary', 'A granary', 1, 10, 2.3, 3.4),
  round('kethorn-granary-6', 'granary', 'A granary', 1, -10, 2.3, 3.4),
  building('kethorn-cistern-1', 'cistern', 'A cistern', -8, 10, 7, 4.2, { height: .85 }),
  building('kethorn-cistern-2', 'cistern', 'A cistern', -8, -10, 7, 4.2, { height: .85 }),
]);
/** Where a point is against a building: metres outside its footprint (negative inside). */
export function buildingOutside(b, x, z) {
  const dx = x - b.x, dz = z - b.z;
  if (b.round) return Math.hypot(dx, dz) - b.radius;
  const du = Math.abs(dx * ALONG.x + dz * ALONG.z) - b.along / 2, dv = Math.abs(dx * ACROSS.x + dz * ACROSS.z) - b.across / 2;
  return du > 0 && dv > 0 ? Math.hypot(du, dv) : Math.max(du, dv);
}
/** The building a point is in or within `margin` of, if any. */
export const kethornBuildingAt = (x, z, margin = 0) => KETHORN_BUILDINGS.find(b => Math.abs(x - b.x) < 20 && Math.abs(z - b.z) < 20 && buildingOutside(b, x, z) < margin) ?? null;
/** On the street from the gate to the hall at the end. */
export function onKethornStreet(x, z, margin = 0) {
  const { u, v } = kethornFrame(x, z);
  return u <= KETHORN_STREET.from + margin && u >= KETHORN_STREET.to - margin && Math.abs(v) <= KETHORN_STREET.half + margin;
}
/**
 * The door of a building: a point a metre and a half out from the middle of its street side, where
 * somebody stands who belongs to it. A cistern's is its near end's kerb.
 */
export function doorOf(b) {
  if (b.round) { const c = kethornPoint(b.u, b.v - Math.sign(b.v) * (b.radius + 1.4)); return c; }
  if (b.turned) return kethornPoint(b.u + b.along / 2 + 1.5, b.v);
  return kethornPoint(b.u, b.v + b.door * (b.across / 2 + 1.5));
}
/**
 * Colliders for a building, in the game's two shapes (circles and axis boxes; src/gameplay/movement/game-state.js knows no
 * other): a rotated footprint is filled with circles on a grid a little over a metre apart, inset so their
 * edge is the wall's face - the arrangement the fortification standard uses for a wall that does not run
 * on an axis. Each carries its `height`, so a sightline goes over a low cistern and not through a hall.
 */
export function buildingColliders(b) {
  const kind = b.kind === 'cistern' ? 'kethorn-cistern' : b.kind === 'granary' ? 'kethorn-granary' : 'kethorn-hall';
  const height = b.round ? b.height + b.radius * .7 : b.kind === 'cistern' ? b.height : b.height + KETHORN_STONE.roof;
  if (b.round) return [freeze({ x: b.x, z: b.z, r: b.radius, kind, height, building: b.id })];
  const r = .8, step = 1.1, out = [];
  const nu = Math.max(1, Math.ceil((b.along - 2 * r) / step)), nv = Math.max(1, Math.ceil((b.across - 2 * r) / step));
  for (let i = 0; i <= nu; i++) for (let j = 0; j <= nv; j++) {
    const du = -b.along / 2 + r + (b.along - 2 * r) * i / nu, dv = -b.across / 2 + r + (b.across - 2 * r) * j / nv;
    out.push(freeze({ x: b.x + ALONG.x * du + ACROSS.x * dv, z: b.z + ALONG.z * du + ACROSS.z * dv, r, kind, height, building: b.id }));
  }
  return out;
}

// ---------------------------------------------------------------------------
// The fields
// ---------------------------------------------------------------------------
/**
 * The Galmeth's fields: blocks `along` metres on the grain by `across` over it, laid on the rock's own
 * frame so the rows of the whole plain run one way and read from the rim; a `baulk` between blocks, rows
 * `row` metres apart down each. Which crop a block carries is the block's own (a fixed hash), barley the
 * most; the blocks nearest the south pass's head are fallow, and that is where the cattle are.
 */
export const FIELDS = freeze({ along: 34, across: 22, baulk: 2.4, row: 1.1, edge: 1.4, washBank: 1.6, stairLane: 10, stairLaneHalf: 1.6 });
const CROPS = freeze(['barley', 'barley', 'pulses', 'barley', 'pulses', 'barley', 'pulses', 'barley', 'fallow', 'barley', 'pulses', 'barley']);
const blockHash = (i, j) => { let h = Math.imul(i * 73856093 ^ j * 19349663, 2654435761) >>> 0; h = (h ^ (h >>> 15)) >>> 0; return h % CROPS.length; };
/** The cattle's grazing: fallow ground round the south pass's head and along the plain's southern edge. */
export const CATTLE_RANGE = freeze({ id: 'telemonia-cattle', x: -2070, z: 1336, radius: 34 });
/** The horses: on the plain by the head of the east pass, north of where the washes meet. */
export const HORSE_RANGE = freeze({ id: 'telemonia-horses', x: -2036, z: 1196, radius: 18 });
/** Ground the fields are kept off, whatever block it is in. */
function unworked(x, z) {
  if (!inTelemoniaBox(x, z) || hexOwnerAt(x, z) !== TELEMONIA) return true;
  if (plainDistance(x, z) > -FIELDS.edge) return true;
  const w = washAt(x, z);
  if (w && w.distance < w.wash.half + FIELDS.washBank) return true;
  if (kethornLift(x, z) > 0) return true;
  const p = passAt(x, z);
  if (p && p.distance < p.half + 3) return true;
  const way = wayAt(x, z);
  if (way && way.distance < way.half + 3) return true;
  // A lane at every stair's foot: the stair comes down onto the plain's edge, and the first ten metres in
  // from there are kept as a way into the fields and not ploughed.
  if (plainDistance(x, z) > -FIELDS.stairLane && stairDistance(x, z) < TERRACES.stairHalf + FIELDS.stairLaneHalf) return true;
  if (gap({ x, z }, SPAWN) < 8) return true;
  return false;
}
/**
 * The field a point of the plain is in, or null: `{ id, crop, row }` - `row` true on a row's line, where a
 * plant stands - for every point of a block that is ploughed. Fallow blocks are fields with nothing in rows.
 */
export function fieldAt(x, z) {
  if (unworked(x, z)) return null;
  const { u, v } = kethornFrame(x, z);
  const i = Math.floor(u / FIELDS.along), j = Math.floor(v / FIELDS.across);
  const fu = u - i * FIELDS.along, fv = v - j * FIELDS.across;
  if (fu < FIELDS.baulk / 2 || fu > FIELDS.along - FIELDS.baulk / 2 || fv < FIELDS.baulk / 2 || fv > FIELDS.across - FIELDS.baulk / 2) return null;
  if (HAMLETS.some(h => h.huts.some(hut => gap(hut, { x, z }) < 9)) || gap({ x, z }, HORSE_RANGE) < HORSE_RANGE.radius) return null;
  if (PENS.some(pen => gap(pen, { x, z }) < 20 && penOutside(pen, x, z) < 6)) return null;
  const crop = gap({ x, z }, CATTLE_RANGE) < CATTLE_RANGE.radius + 8 ? 'fallow' : CROPS[blockHash(i, j)];
  const k = (fv - FIELDS.baulk / 2) / FIELDS.row;
  return { id: `${i},${j}`, crop, row: Math.abs(k - Math.round(k)) * FIELDS.row < .3 };
}
/** Ploughed and sown: in a field that is not fallow. What the stage 1 scatter keeps its bunch grass out of. */
export const sownAt = (x, z) => { const f = fieldAt(x, z); return !!f && f.crop !== 'fallow'; };

/**
 * The terraces' vine: "a hard dry-country vine" (telemonia.md, Economy), one row along the middle of each
 * tread. A point is on a vine row when it is on the belt, clear of a stair, a gully, a pass and the way,
 * and the belt's own coordinate (the ground before the terraces, over the plain) is `mid` of the way
 * through its course: the middle of the tread, between the foot of one riser and the next.
 */
export const VINES = freeze({ mid: .42, spacing: 1.8, stairClear: 2.4 });
export function vineCourseLine(x, z) {
  const place = telemoniaPlace(x, z);
  if (!place?.terraced || place.inner < .8) return null;
  if (stairDistance(x, z) < TERRACES.stairHalf + VINES.stairClear) return null;
  const g = gullyAt(x, z); if (g && g.distance < g.gully.half + 3) return null;
  const p = passAt(x, z); if (p && p.distance < p.half + 4) return null;
  const w = wayAt(x, z); if (w && w.distance < w.half + 2.5) return null;
  const wash = washAt(x, z); if (wash && wash.distance < wash.wash.half + 2) return null;
  return (place.height - place.plain) / TERRACES.period;
}

// ---------------------------------------------------------------------------
// The field people's huts
// ---------------------------------------------------------------------------
/** A point on the Galmeth `inside` metres in from its edge, on a bearing (radians, x-east z-south) from its middle. */
export function plainEdgePoint(angle, inside = 7) {
  const dx = Math.cos(angle), dz = Math.sin(angle);
  for (let r = 20; r < 320; r += .25) {
    const x = PLAIN_MIDDLE.x + dx * r, z = PLAIN_MIDDLE.z + dz * r;
    if (plainDistance(x, z) >= -inside) return point(x, z);
  }
  return PLAIN_MIDDLE;
}
/**
 * Four rows of huts, one to a quarter of the plain, at the foot of the terraces: north, east, south and
 * west (`bearing`, degrees from the plain's middle, x east and z south). Each hut is four metres by three
 * and a half, its door toward the plain; they stand seven metres apart along the plain's edge.
 */
export const HUT = freeze({ long: 4.2, deep: 3.4, eaves: 1.75, roof: .45, spacing: 7, inside: 7, stairClear: 5 });
/** Clear for a hut: on the plain, off every wash's banks, a pass, the way and a stair's foot. */
const hutClear = at => {
  if (groundKind(at.x, at.z) !== 'plain' || stairDistance(at.x, at.z) < HUT.stairClear) return false;
  const w = washAt(at.x, at.z), p = passAt(at.x, at.z), way = wayAt(at.x, at.z);
  return !(w && w.distance < w.wash.half + 8) && !(p && p.distance < 25) && !(way && way.distance < 15) && gap(at, SPAWN) > 30;
};
const hamletAt = (id, name, bearing, count) => {
  const centre = bearing * Math.PI / 180, r = gap(plainEdgePoint(centre, HUT.inside), PLAIN_MIDDLE);
  const offsets = [0, 1, -1, 2, -2, 3, -3, 4, -4].map(n => n - (count % 2 ? 0 : .5)), huts = [];
  for (const n of offsets) {
    if (huts.length >= count) break;
    const a = centre + n * HUT.spacing / r, at = plainEdgePoint(a, HUT.inside);
    if (!hutClear(at)) continue;
    huts.push({ at, n });
  }
  huts.sort((p, q) => p.n - q.n);
  const middle = plainEdgePoint(centre, HUT.inside + 6);
  return freeze({ id, name, bearing, huts: freeze(huts.map(({ at }, k) => freeze({ id: `${id}-hut-${k + 1}`, x: at.x, z: at.z, yaw: facing(at, PLAIN_MIDDLE) }))),
    yard: point(middle.x, middle.z) });
};
/**
 * Between two stairs each (they are thirteen degrees apart round the plain, about twenty-eight metres at
 * its edge), so nothing stands at a stair's foot: north, east, south and west of the plain.
 */
export const HAMLETS = freeze([
  hamletAt('telemonia-north-huts', 'The field people’s huts, north', -91.5, 3),
  hamletAt('telemonia-east-huts', 'The field people’s huts, east', -.5, 3),
  hamletAt('telemonia-south-huts', 'The field people’s huts, south', 64.5, 3),
  hamletAt('telemonia-west-huts', 'The field people’s huts, west', 155.5, 3),
]);
export const HUTS = freeze(HAMLETS.flatMap(h => h.huts));
/** A hut's corners' frame: `along` its long side, `across` toward its door. */
export function hutOutside(hut, x, z) {
  const fx = Math.sin(hut.yaw), fz = Math.cos(hut.yaw), dx = x - hut.x, dz = z - hut.z;
  const du = Math.abs(dx * fz - dz * fx) - HUT.long / 2, dv = Math.abs(dx * fx + dz * fz) - HUT.deep / 2;
  return du > 0 && dv > 0 ? Math.hypot(du, dv) : Math.max(du, dv);
}
export function hutColliders(hut) {
  const fx = Math.sin(hut.yaw), fz = Math.cos(hut.yaw), sx = fz, sz = -fx, out = [], r = .75;
  for (let i = 0; i <= 3; i++) for (let j = 0; j <= 2; j++) {
    const a = -HUT.long / 2 + r + (HUT.long - 2 * r) * i / 3, b = -HUT.deep / 2 + r + (HUT.deep - 2 * r) * j / 2;
    out.push(freeze({ x: hut.x + sx * a + fx * b, z: hut.z + sz * a + fz * b, r, kind: 'telemonia-hut', height: HUT.eaves + HUT.roof, building: hut.id }));
  }
  return out;
}

// ---------------------------------------------------------------------------
// The folds
// ---------------------------------------------------------------------------
/**
 * **The folds** (the builder's: the lore has the cattle and the horses and says nothing of where they are
 * shut up). Two pens of dry stone at the plain's margin, at the foot of the terraces between two stairs, each
 * near the ground its beasts graze: the cattle's south of the rock by the fallow (`CATTLE_RANGE`), the
 * horses' on the plain's eastern edge above the east pass's head (`HORSE_RANGE`). A wall chest-high to a man
 * and too high for a beast, one gateway in the side toward the plain with nothing hung in it. `long` runs
 * along the plain's edge, `deep` toward its middle; `yaw` faces the plain's middle, and the gateway is there.
 */
export const PEN = freeze({ wall: 1.3, thick: .6, gateway: 3.2 });
const penAt = (id, name, kind, bearing, inside, long, deep) => {
  const at = plainEdgePoint(bearing * Math.PI / 180, inside), yaw = facing(at, PLAIN_MIDDLE);
  const fx = Math.sin(yaw), fz = Math.cos(yaw);
  return freeze({ id, name, kind, bearing, x: at.x, z: at.z, yaw, long, deep,
    mouth: point(at.x + fx * (deep / 2 + 2.2), at.z + fz * (deep / 2 + 2.2)) });
};
export const PENS = freeze([
  penAt('telemonia-cattle-fold', 'The cattle fold', 'cattle', 77.5, 15, 18, 12),
  penAt('telemonia-horse-fold', 'The horse fold', 'horse', -26.5, 14, 14, 10),
]);
/** Metres outside a pen's footprint (negative inside), its walls' middle line being the footprint's edge. */
export function penOutside(pen, x, z) {
  const fx = Math.sin(pen.yaw), fz = Math.cos(pen.yaw), dx = x - pen.x, dz = z - pen.z;
  const du = Math.abs(dx * fz - dz * fx) - pen.long / 2, dv = Math.abs(dx * fx + dz * fz) - pen.deep / 2;
  return du > 0 && dv > 0 ? Math.hypot(du, dv) : Math.max(du, dv);
}
/** The lines of a pen's walls, as [along0, across0, along1, across1] in its own frame; the front one is broken by the gateway. */
export function penWalls(pen) {
  const L = pen.long / 2, D = pen.deep / 2, g = PEN.gateway / 2;
  return [[-L, -D, L, -D], [-L, -D, -L, D], [L, -D, L, D], [-L, D, -g, D], [g, D, L, D]];
}
/** A pen's colliders: circles down each wall's line half a metre apart, as wide as the wall. */
export function penColliders(pen) {
  const fx = Math.sin(pen.yaw), fz = Math.cos(pen.yaw), sx = fz, sz = -fx, out = [], r = PEN.thick / 2 + .05;
  for (const [a0, b0, a1, b1] of penWalls(pen)) {
    const n = Math.max(1, Math.ceil(Math.hypot(a1 - a0, b1 - b0) / .5));
    for (let i = 0; i <= n; i++) {
      const a = a0 + (a1 - a0) * i / n, b = b0 + (b1 - b0) * i / n;
      out.push(freeze({ x: pen.x + sx * a + fx * b, z: pen.z + sz * a + fz * b, r, kind: 'telemonia-pen', height: PEN.wall, building: pen.id }));
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// The ground the layout reads
// ---------------------------------------------------------------------------
// (The walked ways, the pass mouths, the stock and the chart are src/content/regions/telemonia/telemonia-ways.js's; these two are what
// the huts and the terrace work spots are placed by, kept here so the layout reads nothing back from there.)
/** What kind of ground a point is to somebody on foot: `top`, `way`, `pass`, `terrace`, `plain` or `rim`; null off the country. */
function groundKind(x, z) {
  if (!inTelemoniaBox(x, z) || hexOwnerAt(x, z) !== TELEMONIA) return null;
  const { u } = kethornFrame(x, z);
  if (onKethornTop(x, z) || (u > KETHORN.neck - 3 && u < KETHORN.spurTo + 2 && spurAt(x, z)?.off < 0 && kethornLift(x, z) > .5)) return 'top';
  const w = wayAt(x, z); if (w && w.distance < w.half + .5) return 'way';
  const p = passAt(x, z); if (p && p.distance < p.half + 1 && plainDistance(x, z) > -2) return 'pass';
  const pd = plainDistance(x, z);
  if (pd <= 0 && kethornLift(x, z) < 2) return 'plain';
  if (telemoniaPlace(x, z)?.terraced) return 'terrace';
  if (pd < 1.5 && kethornLift(x, z) < 2) return 'plain';
  return 'rim';
}
const STAIR_ANGLES = (() => { const out = []; for (let a = -180 + 4; a < 180; a += TERRACES.stairEvery) out.push(a * Math.PI / 180); return out; })();
/** The stairs a walker can actually go up: not cut by a pass, a gully, a wash or the way. */
const WALKED_STAIRS = freeze(STAIR_ANGLES.filter(a => {
  for (let out = 1; out < INNER.terraceWidth - 2; out += 2) {
    const p = plainEdgePoint(a, -out), pass = passAt(p.x, p.z), g = gullyAt(p.x, p.z), w = washAt(p.x, p.z), way = wayAt(p.x, p.z);
    if ((pass && pass.distance < 12) || (g && g.distance < 6) || (w && w.distance < w.wash.half + 1) || (way && way.distance < 5)) return false;
  }
  return true;
}));

/** Everything the town takes off the ground that stage 1's grass and stone grew on: what that scatter hides. */
export const townCovers = (x, z) => sownAt(x, z) || !!kethornBuildingAt(x, z, .6) || onKethornStreet(x, z, .5)
  || HUTS.some(hut => Math.abs(hut.x - x) < 6 && Math.abs(hut.z - z) < 6 && hutOutside(hut, x, z) < .6)
  || PENS.some(pen => Math.abs(pen.x - x) < 14 && Math.abs(pen.z - z) < 14 && penOutside(pen, x, z) < 1)
  || TOWN_SITE_LIST.some(s => Math.abs(s.x - x) < 1.6 && Math.abs(s.z - z) < 1.6);

// ---------------------------------------------------------------------------
// The sites: where somebody belonging to the place stands
// ---------------------------------------------------------------------------
const site = (id, kind, at, extra = {}) => freeze({ id, kind, x: at.x, z: at.z, ...extra });
/** A spread of `n` out of `list`, taken evenly round the plain's middle. */
const spread = (list, n) => {
  const sorted = [...list].sort((a, b) => a.angle - b.angle || a.r - b.r);
  if (sorted.length <= n) return sorted;
  return Array.from({ length: n }, (_, k) => sorted[Math.floor((k + .5) * sorted.length / n)]);
};
/** The middle of a sown block, between its eighth and ninth rows, with three metres of the same field round it. */
const PLAIN_WORK = (() => {
  const out = [], mid = FIELDS.baulk / 2 + FIELDS.row * 8.5;
  for (let i = -10; i <= 10; i++) for (let j = -12; j <= 12; j++) {
    const u = (i + .5) * FIELDS.along, v = j * FIELDS.across + mid, at = kethornPoint(u, v), f = fieldAt(at.x, at.z);
    if (!f || f.crop === 'fallow') continue;
    if ([[3, 0], [-3, 0], [0, 3], [0, -3]].some(([a, b]) => { const q = kethornPoint(u + a, v + b); return fieldAt(q.x, q.z)?.id !== f.id; })) continue;
    out.push({ at, crop: f.crop, field: f.id, angle: Math.atan2(at.z - PLAIN_MIDDLE.z, at.x - PLAIN_MIDDLE.x), r: gap(at, PLAIN_MIDDLE) });
  }
  return spread(out, 24);
})();
/**
 * On a tread, between its vine row and the foot of the riser above, a few metres along it from a stair a
 * walker goes up: courses one to five, every other walked stair round the plain, either side in turn.
 */
const TERRACE_WORK = (() => {
  const out = [];
  WALKED_STAIRS.forEach((a, k) => {
    if (k % 2) return;
    const course = 1 + (k / 2) % 5, side = (k / 2) % 2 ? 1 : -1, edge = plainEdgePoint(a, 0), R = gap(edge, PLAIN_MIDDLE);
    const angle = a + side * (TERRACES.stairHalf + VINES.stairClear + 2.5) / R, target = course + .65;
    for (let up = .5; up < INNER.terraceWidth; up += .1) {
      const at = plainEdgePoint(angle, -up), c = vineCourseLine(at.x, at.z);
      if (c === null) continue;
      if (c >= target) {
        if (c < target + .2 && groundKind(at.x, at.z) === 'terrace') out.push({ at: point(at.x, at.z), course, stair: a });
        break;
      }
    }
  });
  return out;
})();
/**
 * **The sites the people stand at**, for `src/content/regions/telemonia/telemonia-people.js` and whoever else places somebody here.
 * Frozen lists of `{ id, kind, x, z, ... }`, every one on ground a body stands on and walks away from
 * (`tests/telemonia-town.test.js` stands on each and walks off it):
 *
 *  - `hallDoors` - a metre and a half out from the door of each hall of the bands and of the king's hall, on
 *    the street side; `building` is the hall's id, `yaw` faces out of the door.
 *  - `gate` - `kethorn-gate-inside` (twelve metres inside the gate, at the street's foot) and
 *    `kethorn-gate-outside` (fourteen metres out on the spur), from stage 1's `KETHORN_WALL`.
 *  - `cisterns` - beside each cistern's kerb on the street side; `granaries` - before each granary's door.
 *  - `plainWork` - twenty-four, in the middle of sown blocks of barley or pulses between two rows, spread
 *    round the plain; `crop` and `field` say which.
 *  - `terraceWork` - on a tread between its vine row and the riser above, a few metres along from a stair
 *    a walker goes up; `course` is which tread (1-5 from the bottom).
 *  - `hutDoors` - a metre and a quarter out from each field people's hut's doorway, toward the plain;
 *    `hamlet` is its row's id.
 *  - `pens` - each fold's middle, inside its walls (`x`, `z`), and `mouth`, just outside its gateway.
 */
export const TELEMONIA_TOWN_SITES = freeze({
  hallDoors: freeze(KETHORN_BUILDINGS.filter(b => b.kind === 'band-hall' || b.kind === 'king-hall').map(b => {
    const at = doorOf(b);
    return site(`${b.id}-door`, b.kind === 'king-hall' ? 'king-hall-door' : 'band-hall-door', at, { building: b.id, yaw: facing(b, at) });
  })),
  gate: freeze([
    site('kethorn-gate-inside', 'gate-inside', KETHORN_WALL.inside, { yaw: facing(KETHORN_WALL.inside, KETHORN_WALL.gate.centre) }),
    site('kethorn-gate-outside', 'gate-outside', KETHORN_WALL.outside, { yaw: facing(KETHORN_WALL.gate.centre, KETHORN_WALL.outside) }),
  ]),
  cisterns: freeze(KETHORN_BUILDINGS.filter(b => b.kind === 'cistern').map(b => site(`${b.id}-kerb`, 'cistern', doorOf(b), { building: b.id, yaw: facing(doorOf(b), b) }))),
  granaries: freeze(KETHORN_BUILDINGS.filter(b => b.kind === 'granary').map(b => site(`${b.id}-door`, 'granary-door', doorOf(b), { building: b.id, yaw: facing(b, doorOf(b)) }))),
  plainWork: freeze(PLAIN_WORK.map((w, k) => site(`telemonia-plain-work-${k + 1}`, 'plain-work', w.at, { crop: w.crop, field: w.field, yaw: YAW_ACROSS }))),
  terraceWork: freeze(TERRACE_WORK.map((w, k) => site(`telemonia-terrace-work-${k + 1}`, 'terrace-work', w.at, { course: w.course, yaw: facing(w.at, PLAIN_MIDDLE) + Math.PI }))),
  hutDoors: freeze(HAMLETS.flatMap(h => h.huts.map(hut => {
    const fx = Math.sin(hut.yaw), fz = Math.cos(hut.yaw);
    return site(`${hut.id}-door`, 'hut-door', point(hut.x + fx * (HUT.deep / 2 + 1.25), hut.z + fz * (HUT.deep / 2 + 1.25)), { hamlet: h.id, building: hut.id, yaw: hut.yaw });
  }))),
  pens: freeze(PENS.map(pen => site(pen.id, `${pen.kind}-fold`, pen, { mouth: pen.mouth, yaw: pen.yaw }))),
});
/** Every site in one list. */
export const TOWN_SITE_LIST = freeze(Object.values(TELEMONIA_TOWN_SITES).flat());

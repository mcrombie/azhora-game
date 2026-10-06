/** The scarred Suvali uplands: real height-field ridges, graded switchbacks and a sheltered cave.
 * All coordinates are world metres. This module is pure and shared by scenery, navigation and
 * the vigilante quest. The barred East Suval frontier and the old Imlamdris pass stay intact.
 */
import { hexOwnerAt, SOLIS_ROAD, seamlessTerrainMix, landDistance } from '../../../world/terrain/region-world.js';
import { passRoadAt, cityLocal, hexInset, stillwaterDistance } from '../south-suval/south-suval-world.js';

const freeze = Object.freeze;
const point = (x, z, grade) => freeze({ x, z, ...(grade == null ? {} : { grade }) });
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

export const BAT_CAVE = freeze({
  entrance: point(-182, 1084), perch: point(-182, 1078), approach: point(-196, 1088), apron: point(-182, 1093),
  yaw: Math.PI, floor: 76, width: 7.2, depth: 12,
});
export const BAT_LANDING = freeze({ x: -404, z: 703, yaw: Math.PI });
/** Fine terrain replaces the coarse seven-metre triangles over the narrow switchbacks. */
export const SUVAL_TERRAIN_PATCHES = freeze([
  freeze({ minX: -610, maxX: -345, minZ: 555, maxZ: 754, step: 1 }),
  freeze({ minX: -480, maxX: 120, minZ: 892, maxZ: 1245, step: 1 }),
  freeze({ minX: -442, maxX: -273, minZ: 754, maxZ: 892, step: 1 }),
]);
export function suvalHighlandTerrainSink(x, z) {
  let sink = 0;
  for (const p of SUVAL_TERRAIN_PATCHES) {
    const inset = Math.min(x - p.minX, p.maxX - x, z - p.minZ, p.maxZ - z);
    if (inset > 0) sink = Math.max(sink, 38 * smooth(3, 18, inset) * (1 - smooth(9, 23, highlandFineDistance(x, z))));
  }
  return sink;
}
export const SUVAL_PEAKS = freeze([
  freeze({ id: 'broken-crown', x: -466, z: 647, radius: 67, rise: 84, along: 1.35, across: .88, angle: -.8, phase: .4 }),
  freeze({ id: 'watchers-spur', x: -357, z: 817, radius: 52, rise: 71, along: 1.30, across: .83, angle: 1.1, phase: 2.7 }),
  freeze({ id: 'ash-tooth', x: -254, z: 977, radius: 69, rise: 99, along: 1.22, across: .92, angle: .8, phase: 1.4 }),
  freeze({ id: 'hollow-ridge', x: -199, z: 1043, radius: 65, rise: 109, along: 1.30, across: .88, angle: .9, phase: 4.1 }),
  freeze({ id: 'stillwater-crown', x: -99, z: 1069, radius: 64, rise: 139, along: 1.28, across: .94, angle: -.3, phase: 2.3 }),
  freeze({ id: 'eastern-needle', x: 47, z: 1081, radius: 37, rise: 97, along: 1.45, across: .78, angle: 1.2, phase: 5.5 }),
  freeze({ id: 'cinder-ridge', x: -248, z: 1151, radius: 46, rise: 68, along: 1.32, across: .93, angle: -.4, phase: 3.2 }),
]);

/** Unequal flanks, bent ridge lines and shallow erosion channels. Each peak has a
 * broad foot and subordinate shoulder, rather than the same circular dome. */
function peakFrame(peak, x, z) {
  const dx = x - peak.x, dz = z - peak.z, c = Math.cos(peak.angle), s = Math.sin(peak.angle);
  const u = (dx * c + dz * s) / (peak.radius * peak.along);
  const rawV = (-dx * s + dz * c) / (peak.radius * peak.across);
  return { u, v: rawV - .14 * Math.sin(u * 3.1) - .07 * u };
}
const shoulder = (u, v) => Math.pow(Math.max(0, 1 - u * u - v * v), 2);
export function suvalLandformRise(x, z) {
  let rise = 0;
  for (const peak of SUVAL_PEAKS) {
    if (Math.abs(x - peak.x) > peak.radius * 1.8 || Math.abs(z - peak.z) > peak.radius * 1.8) continue;
    const { u, v } = peakFrame(peak, x, z), r = Math.hypot(u, v);
    const foot = shoulder(u / 1.12, v / 1.12);
    const crest = Math.pow(Math.max(0, 1 - u * u), 1.35) * Math.pow(Math.max(0, 1 - Math.pow(Math.abs(v), 1.65)), 1.45);
    const gully = Math.pow(.5 + .5 * Math.sin(Math.atan2(v, u) * 5 + peak.phase + r * 3), 3)
      * smooth(.1, .5, r) * (1 - smooth(.65, 1.1, r));
    const flank = shoulder((u + .48) / .78, (v - .22 * Math.sin(peak.phase)) / .8) * .19;
    const height = peak.rise * Math.max(0, .29 * foot + .71 * crest - .13 * foot * gully + flank * smooth(.1, .65, r));
    // A small smooth union joins overlapping shoulders without a hard V seam.
    const blend = Math.max(0, 1 - Math.abs(rise - height) / 9);
    rise = Math.max(rise, height) + 2.25 * blend * blend * smooth(0, 8, Math.min(rise, height));
  }
  return rise;
}

/** Long, narrow paths climb around the faces; taking a straight line meets steep limestone. */
export const SUVAL_HIGHLAND_TRAILS = freeze([
  freeze({ id: 'western-ridge-track', width: 2.4, points: freeze([
    point(-501, 735, 12), point(-487, 710, 21), point(-526, 686, 32),
    point(-509, 659, 43), point(-549, 643, 54), point(-535, 617, 66),
    point(-509, 609, 73), point(-492, 632, 83),
  ]) }),
  freeze({ id: 'hollow-ridge-path', width: 2.3, points: freeze([
    point(-426, 912, 11), point(-372, 930, 12), point(-329, 972, 19),
    point(-326, 1014, 29), point(-280, 1037, 41), point(-302, 1061, 49),
    point(-265, 1095, 61), point(-243, 1065, 70), point(-211, 1110, 75),
    point(-196, 1088, 76), point(-182, 1084, 76), point(-182, 1078, 76),
  ]) }),
  freeze({ id: 'stillwater-recovery-road', width: 2.8, points: freeze([
    point(-326, 1014, 29), point(-342, 1064, 24), point(-319, 1104, 22),
    point(-287, 1125, 27), point(-278, 1178, 29), point(-227, 1200, 23),
    point(-177, 1168, 26), point(-137, 1143, 29), point(-101, 1135, 28),
  ]) }),
]);

export function nearestHighlandTrail(x, z, trails = SUVAL_HIGHLAND_TRAILS) {
  let best = { distance: Infinity, grade: 0, width: 0 };
  for (const trail of trails) for (let i = 1; i < trail.points.length; i++) {
    const a = trail.points[i - 1], b = trail.points[i], dx = b.x - a.x, dz = b.z - a.z;
    const t = clamp(((x - a.x) * dx + (z - a.z) * dz) / (dx * dx + dz * dz), 0, 1);
    const distance = Math.hypot(x - a.x - dx * t, z - a.z - dz * t);
    if (distance < best.distance) best = { distance, grade: a.grade + (b.grade - a.grade) * t, width: trail.width, id: trail.id };
  }
  return best;
}

export function highlandFineDistance(x, z) {
  let distance = Math.min(nearestHighlandTrail(x, z).distance, Math.hypot(x - BAT_CAVE.perch.x, z - BAT_CAVE.perch.z));
  for (const peak of SUVAL_PEAKS) {
    const { u, v } = peakFrame(peak, x, z);
    distance = Math.min(distance, Math.max(0, Math.hypot(u, v) - 1.05) * peak.radius);
  }
  return distance;
}

/** Trails sit on broad natural shoulders. A grade far above the unshaped valley
 * must not create a narrow raised wall that traces the road like an earthwork. */
function trailShoulderRise(x, z, ground) {
  let support = 0;
  for (const trail of SUVAL_HIGHLAND_TRAILS) for (let i = 1; i < trail.points.length; i++) {
    const a = trail.points[i - 1], b = trail.points[i], dx = b.x - a.x, dz = b.z - a.z;
    const t = clamp(((x - a.x) * dx + (z - a.z) * dz) / (dx * dx + dz * dz), 0, 1);
    const distance = Math.hypot(x - a.x - dx * t, z - a.z - dz * t);
    if (distance >= 58) continue;
    const grade = a.grade + (b.grade - a.grade) * t;
    support = Math.max(support, Math.max(0, grade - ground) * (1 - smooth(0, 58, distance)));
  }
  return support;
}

const roadDistance = (x, z) => {
  let best = Infinity;
  for (let i = 1; i < SOLIS_ROAD.length; i++) {
    const a = SOLIS_ROAD[i - 1], b = SOLIS_ROAD[i], dx = b.x - a.x, dz = b.z - a.z;
    const t = clamp(((x - a.x) * dx + (z - a.z) * dz) / (dx * dx + dz * dz), 0, 1);
    best = Math.min(best, Math.hypot(x - a.x - dx * t, z - a.z - dz * t));
  }
  return best;
};

/** Terrain deformation feeds both the rendered ground and the collision height. */
export function suvalHighlandGround(x, z, ground) {
  if (x < -625 || x > 65 || z < 555 || z > 1215) return ground;
  const town = cityLocal(x, z);
  const cityProtection = smooth(-16, -4, hexInset(town.a, town.b))
    * smooth(-24, -12, town.b) * (1 - smooth(103, 125, town.b));
  if (cityProtection >= 1) return ground;
  const lakeFade = smooth(24, 48, stillwaterDistance(x, z));
  if (!lakeFade) return ground;
  const legacyRoad = Math.min(roadDistance(x, z), passRoadAt(x, z).distance);
  // Country labels cannot cut a mountainside into a vertical wall. Blend the
  // shoulders across the survey edge, then ease into the coast and lake basin.
  const mix = seamlessTerrainMix(x, z), land = Math.max(.001, 1 - (mix.weights.outland ?? 0));
  const regionFade = smooth(.12, .8, ((mix.weights['West Suval'] ?? 0) + (mix.weights['South Suval'] ?? 0)) / land);
  const edgeFade = smooth(0, 25, Math.min(x + 625, 65 - x, z - 555, 1215 - z));
  let shaped = ground + Math.max(suvalLandformRise(x, z), trailShoulderRise(x, z, ground)) * regionFade * edgeFade * lakeFade
    * smooth(2, 35, landDistance(x, z)) * smooth(7, 22, legacyRoad);
  const trail = nearestHighlandTrail(x, z);
  if (trail.distance < trail.width / 2 + 12) {
    const weight = 1 - smooth(trail.width / 2 + .7, trail.width / 2 + 12, trail.distance);
    shaped += (trail.grade - shaped) * weight;
  }
  const caveDistance = Math.max(Math.abs(x - BAT_CAVE.perch.x) / 6.5, Math.abs(z - 1082) / 12);
  if (caveDistance < 1.6) shaped += (BAT_CAVE.floor - shaped) * (1 - smooth(1, 1.6, caveDistance));
  const landingDistance = Math.hypot(x - BAT_LANDING.x, z - BAT_LANDING.z);
  if (landingDistance < 8) shaped += (9 - shaped) * (1 - smooth(4, 8, landingDistance));
  return ground + (shaped - ground) * (1 - cityProtection);
}

/** Reserve only the trail itself, the cave apron and safe landing from generic scatter. */
export function suvalHighlandClear(x, z, margin = 0) {
  if (x < -625 - margin || x > 65 + margin || z < 555 - margin || z > 1215 + margin) return false;
  const trail = nearestHighlandTrail(x, z);
  return trail.distance < trail.width / 2 + 1.6 + margin
    || Math.hypot(x - BAT_CAVE.perch.x, z - BAT_CAVE.perch.z) < 14 + margin
    || Math.hypot(x - BAT_LANDING.x, z - BAT_LANDING.z) < 8 + margin;
}

/** Solid outcrops beside the narrow passages: they never occupy the walking strip. */
export const SUVAL_PASSAGE_ROCKS = freeze(SUVAL_HIGHLAND_TRAILS.flatMap(trail => trail.points.slice(2, -1).flatMap((p, i) => {
  const a = trail.points[i + 1], b = trail.points[i + 3] ?? p;
  const dx = b.x - a.x, dz = b.z - a.z, n = Math.hypot(dx, dz) || 1;
  return [-1, 1].map(side => ({ x: p.x - dz / n * side * 6.5, z: p.z + dx / n * side * 6.5,
    radius: 2.6, height: 6 + i % 4, yaw: Math.atan2(dx, dz), kind: 'suval-pass-rock' }));
})).filter(p => !suvalHighlandClear(p.x, p.z, p.radius + .7)).map(freeze));

/** Irregular exposed limestone faces close the tempting straight climbs.
 * Follow bent ridge shoulders, varying the contour of the exposed bedrock;
 * these mark solid steep faces, not an equally spaced crown of upright boulders.
 */
export const SUVAL_PEAK_CRAGS = freeze(SUVAL_PEAKS.flatMap((peak, index) => {
  const radius = peak.radius * .48, count = Math.ceil(2 * Math.PI * radius * peak.along / 3.9);
  return Array.from({ length: count }, (_, i) => {
    const angle = i / count * Math.PI * 2, phase = peak.phase;
    const contour = 1 + .19 * Math.sin(angle * 3 + phase) + .09 * Math.sin(angle * 5 - phase);
    const u = Math.cos(angle) * radius * contour, v = Math.sin(angle) * radius * contour;
    const bend = peak.radius * .14 * Math.sin(u / peak.radius * 3.1);
    const c = Math.cos(peak.angle), s = Math.sin(peak.angle);
    return { x: peak.x + u * peak.along * c - (v * peak.across + bend) * s,
      z: peak.z + u * peak.along * s + (v * peak.across + bend) * c,
      radius: 3.4 + .65 * (1 + Math.sin(i * 1.73 + phase)),
      height: 4.2 + 2.1 * (1 + Math.sin(angle * 2 + phase)) + 1.3 * Math.sin(i * 2.3),
      yaw: peak.angle - angle, seed: index * 317 + i * 13, tint: (i + index) % 4, kind: 'suval-peak-face' };
  });
}).filter(p => ['West Suval', 'South Suval'].includes(hexOwnerAt(p.x, p.z))
  && !suvalHighlandClear(p.x, p.z, p.radius + 1)
  && roadDistance(p.x, p.z) > 11 && passRoadAt(p.x, p.z).distance > 11
  && !(cityLocal(p.x, p.z).b < 104 && hexInset(cityLocal(p.x, p.z).a, cityLocal(p.x, p.z).b) > -10)).map(freeze));

export const IMLAMDRIS_REBUILD = freeze({
  centre: point(-126, 1154),
  huts: freeze([
    freeze({ id: 'rebuild-1', x: -137, z: 1154, width: 6, depth: 5, height: 3.1 }),
    freeze({ id: 'rebuild-2', x: -120, z: 1163, width: 6, depth: 5, height: 3.3 }),
    freeze({ id: 'rebuild-3', x: -111, z: 1155, width: 5, depth: 5, height: 2.9 }),
    freeze({ id: 'rebuild-4', x: -125, z: 1147, width: 6.5, depth: 5, height: 3.2 }),
    freeze({ id: 'rebuild-frame', x: -143, z: 1165, width: 6, depth: 5, height: 3.1, unfinished: true }),
  ]),
});

/** A bounded scar, rather than turning every field into an impassable effect. */
export const NANVIR_SCARS = freeze([
  freeze({ x: -239, z: 1162, radius: 18 }), freeze({ x: -16, z: 1295, radius: 16 }),
  freeze({ x: 89, z: 1099, radius: 15 }), freeze({ x: -46, z: 1114, radius: 10 }),
]);

/** Stanley's small farm pool, beside the Avrel commons. All coordinates are world metres. */
export const AVREL_POND = Object.freeze({
  id: 'avrel-pool', name: 'Avrel farm pond', x: -411, z: 81, radius: 4.2,
  fishingSpot: Object.freeze({ x: -415.8, z: 78 }),
  castPoint: Object.freeze({ x: -413.6, z: 79.2 }),
  teacherStand: Object.freeze({ x: -411.5, z: 75.2 }),
});

export function avrelPondClear(x, z, margin = 0) {
  return Math.hypot(x - AVREL_POND.x, z - AVREL_POND.z) < AVREL_POND.radius + 2.2 + margin;
}

/** The bank blends into the existing hill; the water sits in an actual shallow basin. */
export function avrelPondGround(x, z, original, surface) {
  const d = Math.hypot(x - AVREL_POND.x, z - AVREL_POND.z);
  const smooth = (a, b, value) => { const t = Math.max(0, Math.min(1, (value - a) / (b - a))); return t * t * (3 - 2 * t); };
  if (d < AVREL_POND.radius) return surface - .95 * (1 - smooth(AVREL_POND.radius - 1.5, AVREL_POND.radius, d));
  if (d < AVREL_POND.radius + 2.2) return surface + (original - surface) * smooth(AVREL_POND.radius, AVREL_POND.radius + 2.2, d);
  return original;
}

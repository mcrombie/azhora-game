/** Scenic stops for the carried Suval tour. Chart completion is a landing reward,
 * so the itinerary follows landmarks rather than sweeping every surveyed hex. */
export const SUVAL_TOUR_SIGHTS = Object.freeze([
  { id: 'southern-scars', region: 'South Suval', x: -145, z: 1310 },
  { id: 'stillwater', region: 'South Suval', x: -10, z: 1255 },
  { id: 'imlamdris', region: 'South Suval', x: -85, z: 1140 },
  { id: 'solis', region: 'West Suval', x: -540, z: 960 },
  { id: 'coastal-downs', region: 'West Suval', x: -620, z: 805 },
  { id: 'northern-ridge', region: 'West Suval', x: -510, z: 650 },
  { id: 'eastern-country', region: 'East Suval', x: -180, z: 635 },
  { id: 'closed-frontier', region: 'East Suval', x: -250, z: 810 },
].map(Object.freeze));

/** Keep landmark positions on the authored map. A smaller synthetic/changed map
 * may substitute its nearest available regional cell, without repeating stops. */
export function suvalTourAnchors({ cells, departure, landing }) {
  const available = (cells ?? []).filter(cell => Number.isFinite(cell.x) && Number.isFinite(cell.z));
  const anchors = [{ x: departure.x, z: departure.z, sight: 'departure' }];
  const used = new Set([`${departure.x},${departure.z}`]);
  for (const sight of SUVAL_TOUR_SIGHTS) {
    const nearby = available.filter(cell => cell.region === sight.region).sort((a, b) =>
      Math.hypot(a.x - sight.x, a.z - sight.z) - Math.hypot(b.x - sight.x, b.z - sight.z)
      || a.x - b.x || a.z - b.z)[0];
    if (!nearby) continue;
    const position = Math.hypot(nearby.x - sight.x, nearby.z - sight.z) < 80 ? sight : nearby;
    const key = `${position.x},${position.z}`;
    if (used.has(key)) continue;
    used.add(key);
    anchors.push({ x: position.x, z: position.z, region: sight.region, sight: sight.id });
  }
  anchors.push({ x: landing.x, z: landing.z, sight: 'landing' });
  return anchors;
}

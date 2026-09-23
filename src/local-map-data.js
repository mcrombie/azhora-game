import { regions as authoredRegions, regionAt as authoredRegionAt, isOpenCountry } from './regions.js';

const UNKNOWN_NAME = 'Unexplored place';
const UNKNOWN_DESCRIPTION = 'Follow a side path to see what lies there';
const PAD = 8;
const finitePoint = point => point && Number.isFinite(point.x) && Number.isFinite(point.z);
const copyPoint = point => ({ x: point.x, z: point.z });
const validId = id => typeof id === 'string' && id.length > 0 && id.length <= 128;
const validBounds = b => b && [b.minX, b.maxX, b.minZ, b.maxZ].every(Number.isFinite)
  && b.minX < b.maxX && b.minZ < b.maxZ;
const inside = (point, b) => point.x >= b.minX && point.x <= b.maxX && point.z >= b.minZ && point.z <= b.maxZ;
const overlaps = (a, b) => a.minX <= b.maxX && a.maxX >= b.minX && a.minZ <= b.maxZ && a.maxZ >= b.minZ;
const text = (value, fallback = '') => typeof value === 'string' && value.trim() ? value : fallback;
const identifiers = values => new Set(Array.from(values instanceof Set || Array.isArray(values) ? values : []).filter(validId));

function pointBounds(points) {
  return { minX: Math.min(...points.map(p => p.x)), maxX: Math.max(...points.map(p => p.x)),
    minZ: Math.min(...points.map(p => p.z)), maxZ: Math.max(...points.map(p => p.z)) };
}

/** A segment can cross a map even when neither endpoint is inside it. */
function segmentIntersects(a, b, bounds) {
  let start = 0, end = 1;
  for (const [origin, delta, minimum, maximum] of [
    [a.x, b.x - a.x, bounds.minX, bounds.maxX], [a.z, b.z - a.z, bounds.minZ, bounds.maxZ],
  ]) {
    if (!delta) { if (origin < minimum || origin > maximum) return false; continue; }
    const first = (minimum - origin) / delta, last = (maximum - origin) / delta;
    start = Math.max(start, Math.min(first, last)); end = Math.min(end, Math.max(first, last));
    if (start > end) return false;
  }
  return true;
}

function visiblePaths(paths, bounds) {
  const result = [];
  for (const source of Array.isArray(paths) ? paths : []) {
    if (!Array.isArray(source)) continue;
    let run = [];
    const finish = () => {
      if (run.length > 1 && run.some((point, index) => index && segmentIntersects(run[index - 1], point, bounds))) result.push(run);
      run = [];
    };
    for (const point of source) {
      if (finitePoint(point)) run.push(copyPoint(point));
      else finish(); // Never invent a connection across a missing or invalid path point.
    }
    finish();
  }
  return result;
}

function watersFor(world, bounds) {
  const sources = Array.isArray(world.mapWaters) ? world.mapWaters : finitePoint(world.pond)
    ? [{ id: 'willowmere-water', kind: 'circle', ...world.pond }] : [];
  const result = [];
  for (const water of sources) {
    if (!validId(water?.id)) continue;
    if (water.kind === 'circle' && finitePoint(water) && Number.isFinite(water.radius) && water.radius > 0) {
      const box = { minX: water.x - water.radius, maxX: water.x + water.radius,
        minZ: water.z - water.radius, maxZ: water.z + water.radius };
      if (overlaps(box, bounds)) result.push({ id: water.id, kind: 'circle', ...copyPoint(water), radius: water.radius });
    } else if (water.kind === 'polygon' && Array.isArray(water.points) && water.points.length >= 3 && water.points.every(finitePoint)) {
      if (overlaps(pointBounds(water.points), bounds)) result.push({ id: water.id, kind: 'polygon', points: water.points.map(copyPoint) });
    }
  }
  return result;
}

/**
 * Land inside the sea: an island's outline, drawn over the chart's water so the
 * Pebbles read as ground and not as more of the Stills (`world.mapLands`).
 */
function landsFor(world, bounds) {
  const result = [];
  for (const land of Array.isArray(world.mapLands) ? world.mapLands : []) {
    if (!validId(land?.id) || !Array.isArray(land.points) || land.points.length < 3 || !land.points.every(finitePoint)) continue;
    if (overlaps(pointBounds(land.points), bounds)) result.push({ id: land.id, kind: 'polygon', points: land.points.map(copyPoint) });
  }
  return result;
}

function regionModels(world) {
  const sources = new Map([authoredRegionAt(0, 0), ...authoredRegions].map(region => [region.id, region]));
  for (const region of Array.isArray(world.regions) ? world.regions : []) {
    if (sources.has(region?.id) && Number.isFinite(region.minZ) && Number.isFinite(region.maxZ) && region.minZ < region.maxZ)
      sources.set(region.id, region);
  }
  return [...sources.values()].sort((a, b) => a.id - b.id).map(region => {
    const minX = Number.isFinite(region.minX) ? Math.max(world.bounds.minX, region.minX) : world.bounds.minX;
    const maxX = Number.isFinite(region.maxX) ? Math.min(world.bounds.maxX, region.maxX) : world.bounds.maxX;
    return { id: region.id, name: text(region.name, `Region ${region.id}`), subtitle: text(region.subtitle),
      description: text(region.description), minZ: region.minZ, maxZ: region.maxZ,
      bounds: { minX: minX - PAD, maxX: maxX + PAD, minZ: region.minZ - PAD, maxZ: region.maxZ + PAD } };
  });
}

/**
 * Read-only chart data in actual local metres. North is -Z. Region selection is
 * a view choice: it never moves the player, discovers a place, or unlocks a road.
 * Main goals remain separate from stable locations, so a tracked pin cannot
 * silently change destination when the next main quest starts.
 */
export function buildLocalMapModel({ world, position, heading, discoveries = new Set(), knownIds = [], knownLocations = [],
  goal = null, openGoal = null, regionId, trackedId, globalDetail = false } = {}) {
  if (!world || !validBounds(world.bounds)) throw new TypeError('A local map needs finite world bounds.');
  if (!finitePoint(position)) throw new TypeError('A local map needs a finite player position.');
  const regions = regionModels(world);
  const current = world.regionAt?.(position.x, position.z) || authoredRegionAt(position.x, position.z);
  // Open country has no sheet of its own: half the walkable west is outside every outline the atlas
  // draws (docs/known-issues.md). Rather than pretend he is in the country whose name used to be
  // snapped to him, the tab opens the nearest one's sheet and says he is off it.
  const outside = isOpenCountry(current) || !regions.some(region => region.id === current?.id);
  const nearest = () => {
    let best = regions[0], bestGap = Infinity;
    for (const item of regions) {
      const gap = Math.hypot(Math.max(item.bounds.minX - position.x, 0, position.x - item.bounds.maxX),
        Math.max(item.bounds.minZ - position.z, 0, position.z - item.bounds.maxZ));
      if (gap < bestGap) { bestGap = gap; best = item; }
    }
    return best.id;
  };
  const currentRegionId = outside ? nearest() : current.id;
  const requestedId = Number(regionId);
  const region = regions.find(item => item.id === requestedId) || regions.find(item => item.id === currentRegionId);
  const bounds = { ...(globalDetail ? world.bounds : region.bounds) }, discovered = identifiers(discoveries), known = identifiers(knownIds);
  const markers = new Map();
  const goalPoint = finitePoint(goal) ? goal : null;
  for (const place of Array.isArray(world.landmarks) ? world.landmarks : []) {
    if (!validId(place?.id) || !finitePoint(place) || markers.has(place.id)) continue;
    const seen = discovered.has(place.id), revealed = seen || known.has(place.id) || goalPoint?.id === place.id || openGoal?.id === place.id;
    markers.set(place.id, { id: place.id, name: revealed ? text(place.name, 'Known place') : UNKNOWN_NAME,
      description: revealed ? text(place.description) : UNKNOWN_DESCRIPTION, ...copyPoint(place),
      discovered: seen, known: revealed, trackable: revealed, kind: 'place' });
  }
  for (const location of Array.isArray(knownLocations) ? knownLocations : []) {
    if (!validId(location?.id) || !finitePoint(location) || !text(location.name)) continue;
    const existing = markers.get(location.id);
    // A known-location hint may name an existing landmark, but not move it.
    markers.set(location.id, existing ? { ...existing, known: true, trackable: true,
      name: existing.known ? existing.name : location.name,
      description: existing.known ? existing.description : text(location.description) }
      : { id: location.id, name: location.name, description: text(location.description), ...copyPoint(location),
        discovered: discovered.has(location.id), known: true, trackable: true, kind: text(location.kind, 'location') });
  }
  // A goal, of either gold: the muster road's solid one, and the long road's open one beside it
  // (src/quest-markers.js). They are separate fields so following one never hides the other.
  const objective = (point, kind, fallback) => {
    if (!finitePoint(point)) return null;
    const match = validId(point.id) ? markers.get(point.id) : [...markers.values()].find(marker => marker.known
      && Math.hypot(marker.x - point.x, marker.z - point.z) < .01);
    return { id: match?.id || (validId(point.id) ? point.id : fallback), name: text(point.name, match?.name || 'Current objective'),
      description: text(point.description), ...copyPoint(point), known: true, trackable: !!match?.trackable, kind,
      markerKind: ['main', 'plot', 'deed', 'skill'].includes(point.markerKind) ? point.markerKind : 'main' };
  };
  const mainGoal = objective(goalPoint, 'objective', 'main-objective');
  const openGoalMarker = objective(finitePoint(openGoal) ? openGoal : null, 'objective-open', 'long-road-objective');
  const trackedMarker = validId(trackedId) ? markers.get(trackedId) : null;
  const buildings = (Array.isArray(world.colliders) ? world.colliders : []).filter(c => c?.kind === 'house'
    && finitePoint(c) && Number.isFinite(c.width) && c.width > 0 && Number.isFinite(c.depth) && c.depth > 0
    && (c.angle === undefined || Number.isFinite(c.angle))).filter(c => {
    const angle = c.angle || 0, halfX = (Math.abs(Math.cos(angle)) * c.width + Math.abs(Math.sin(angle)) * c.depth) / 2;
    const halfZ = (Math.abs(Math.sin(angle)) * c.width + Math.abs(Math.cos(angle)) * c.depth) / 2;
    return overlaps({ minX: c.x - halfX, maxX: c.x + halfX, minZ: c.z - halfZ, maxZ: c.z + halfZ }, bounds);
  }).map(c => ({ ...copyPoint(c), width: c.width, depth: c.depth, angle: c.angle || 0 }));
  return { regions, region: { ...region, bounds: { ...region.bounds } }, currentRegionId, bounds, globalDetail: !!globalDetail,
    // True where no country on the atlas owns the ground under him; the sheet is the nearest one's.
    outside,
    // Heading is clockwise from north in radians, independently of Three's yaw.
    player: { ...copyPoint(position), ...(Number.isFinite(heading) ? { heading }
      : Number.isFinite(position.heading) ? { heading: position.heading } : {}) },
    goal: mainGoal, openGoal: openGoalMarker, paths: visiblePaths(world.paths, bounds), landmarks: [...markers.values()].filter(marker => inside(marker, bounds)),
    buildings, waters: watersFor(world, bounds), lands: landsFor(world, bounds),
    tracked: trackedMarker?.trackable ? { ...trackedMarker } : null };
}

/** Fit a north-up chart without stretching metres differently on its two axes. */
export function localMapPoint(point, bounds, { width = 1000, height = 1000, padding = 0, clamp = false } = {}) {
  if (!finitePoint(point) || !validBounds(bounds)) return null;
  if (![width, height, padding].every(Number.isFinite) || padding < 0 || width <= padding * 2 || height <= padding * 2)
    throw new RangeError('Map dimensions must leave a positive drawing area.');
  const spanX = bounds.maxX - bounds.minX, spanZ = bounds.maxZ - bounds.minZ;
  const scale = Math.min((width - padding * 2) / spanX, (height - padding * 2) / spanZ);
  const px = clamp ? Math.max(bounds.minX, Math.min(bounds.maxX, point.x)) : point.x;
  const pz = clamp ? Math.max(bounds.minZ, Math.min(bounds.maxZ, point.z)) : point.z;
  return { x: (width - spanX * scale) / 2 + (px - bounds.minX) * scale,
    y: (height - spanZ * scale) / 2 + (pz - bounds.minZ) * scale, inside: inside(point, bounds) };
}

/** Offset on a north-up bearing ring; angle is clockwise from north in radians. */
export function localMapBearing(from, to, { radius = 1 } = {}) {
  if (!finitePoint(from) || !finitePoint(to) || !Number.isFinite(radius) || radius < 0) return null;
  const dx = to.x - from.x, dz = to.z - from.z, distance = Math.hypot(dx, dz);
  if (!Number.isFinite(distance)) return null;
  if (!distance) return { x: 0, y: 0, angle: 0, distance: 0 };
  return { x: dx / distance * radius, y: dz / distance * radius,
    angle: (Math.atan2(dx, -dz) + Math.PI * 2) % (Math.PI * 2), distance };
}

/** A short carried tour. The complete Suval chart is awarded at landing. */
import { BATMAN_HISTORY } from './batman-quest.js';
import { suvalTourAnchors } from './batman-tour.js';
export const SUVAL_FLIGHT_REGIONS = Object.freeze(['West Suval', 'South Suval', 'East Suval']);
export const BATMAN_FLIGHT_SPEED = 21;
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const distance = (a, b) => Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z);
const cellKey = cell => `${cell.region}:${cell.q},${cell.r}`;
const point = p => ({ x: p.x, y: p.y, z: p.z });
const groundAt = (heightAt, p) => { const h = heightAt(p.x, p.z); return Number.isFinite(h) ? h : 0; };
const fresh = (tourLength, returnLength) => ({ version: 3, tourLength, returnLength, stage: 'idle', distance: 0, returnDistance: 0, landTime: 0, narration: 0, visited: [] });
const copy = s => ({ ...s, visited: [...s.visited] });
function curve(a, b, c, d, t) {
  const result = {};
  for (const axis of ['x', 'z']) result[axis] = .5 * ((2 * b[axis]) + (-a[axis] + c[axis]) * t
    + (2 * a[axis] - 5 * b[axis] + 4 * c[axis] - d[axis]) * t * t
    + (-a[axis] + 3 * b[axis] - 3 * c[axis] + d[axis]) * t * t * t);
  return result;
}
function safeAirPath(anchors, heightAt, clearance) {
  const result = [{ ...anchors[0] }];
  for (let i = 0; i < anchors.length - 1; i++) {
    const a = anchors[Math.max(0, i - 1)], b = anchors[i], c = anchors[i + 1], d = anchors[Math.min(anchors.length - 1, i + 2)];
    const steps = Math.max(1, Math.ceil(Math.hypot(c.x - b.x, c.z - b.z) / 5));
    for (let j = 1; j <= steps; j++) result.push(j === steps ? { ...c } : curve(a, b, c, d, j / steps));
  }
  // Look around each sample as well as underneath it: a cliff cannot appear between
  // two frames and cut through the rider. Raising neighbors makes smooth climbs
  // with a maximum .3 gradient; it never lowers the required terrain clearance.
  for (const p of result) {
    let floor = groundAt(heightAt, p);
    for (let dx = -5; dx <= 5; dx += 5) for (let dz = -5; dz <= 5; dz += 5)
      floor = Math.max(floor, groundAt(heightAt, { x: p.x + dx, z: p.z + dz }));
    p.y = floor + clearance;
  }
  for (let i = 1; i < result.length; i++) {
    const a = result[i - 1], b = result[i]; b.y = Math.max(b.y, a.y - Math.hypot(a.x - b.x, a.z - b.z) * .3);
  }
  for (let i = result.length - 2; i >= 0; i--) {
    const a = result[i], b = result[i + 1]; a.y = Math.max(a.y, b.y - Math.hypot(a.x - b.x, a.z - b.z) * .3);
  }
  return result;
}
/** `cells` are the actual authored regionCells, not invented chart coverage. */
function buildLegacySuvalFlightRoute({ cells, cave, landing, apron, heightAt = () => 0, clearance = 38 }) {
  const unique = new Map();
  for (const cell of cells ?? []) if (SUVAL_FLIGHT_REGIONS.includes(cell.region) && Number.isInteger(cell.q)
    && Number.isInteger(cell.r) && Number.isFinite(cell.x) && Number.isFinite(cell.z)) unique.set(cellKey(cell), cell);
  if (!unique.size || !cave || !landing) throw new Error('The Suval flight needs its authored cells, cave and landing.');
  const departure = apron ?? { x: cave.x, z: cave.z + 15 };
  const ordered = [], anchors = [{ x: departure.x, z: departure.z }];
  for (const region of SUVAL_FLIGHT_REGIONS) {
    const remaining = [...unique.values()].filter(cell => cell.region === region);
    while (remaining.length) {
      const last = anchors.at(-1); remaining.sort((a, b) => Math.hypot(a.x - last.x, a.z - last.z) - Math.hypot(b.x - last.x, b.z - last.z) || a.q - b.q || a.r - b.r);
      const cell = remaining.shift(); ordered.push(cell); anchors.push({ x: cell.x, z: cell.z, cell: { ...cell } });
    }
  }
  anchors.push({ x: landing.x, z: landing.z });
  const air = safeAirPath(anchors, heightAt, clearance);
  const caveGround = { x: cave.x, y: groundAt(heightAt, cave), z: cave.z, phase: 'approach' };
  const apronGround = { x: departure.x, y: groundAt(heightAt, departure), z: departure.z, phase: 'approach' };
  const landingGround = { x: landing.x, y: groundAt(heightAt, landing), z: landing.z, phase: 'landing' };
  const route = [caveGround, apronGround, ...air.map(p => ({ ...p, phase: 'survey' })), landingGround];
  const homeAir = safeAirPath([{ x: landing.x, z: landing.z }, { x: departure.x, z: departure.z }], heightAt, clearance);
  const returnRoute = [{ ...landingGround }, ...homeAir.map(p => ({ ...p, phase: 'home' })), { ...apronGround, phase: 'landing' }, caveGround];
  return { route, returnRoute, cells: ordered.map(cell => ({ ...cell })) };
}
/** Map coverage is a landing reward, independent of the scenic route. The old
 * route is reconstructed only when loading a version-1 flight checkpoint. */
export function buildSuvalFlightRoute(options) {
  const { cells, cave, landing, apron, heightAt = () => 0, clearance = 38 } = options;
  const unique = new Map();
  for (const cell of cells ?? []) if (SUVAL_FLIGHT_REGIONS.includes(cell.region) && Number.isInteger(cell.q)
    && Number.isInteger(cell.r) && Number.isFinite(cell.x) && Number.isFinite(cell.z)) unique.set(cellKey(cell), cell);
  if (!unique.size || !cave || !landing) throw new Error('The Suval flight needs its authored cells, cave and landing.');
  const chartCells = [...unique.values()].map(cell => ({ ...cell }));
  const departure = apron ?? { x: cave.x, z: cave.z + 15 };
  const anchors = suvalTourAnchors({ cells: chartCells, departure, landing });
  const caveGround = { ...point({ ...cave, y: groundAt(heightAt, cave) }), phase: 'approach' };
  const apronGround = { ...point({ ...departure, y: groundAt(heightAt, departure) }), phase: 'approach' };
  const landingGround = { ...point({ ...landing, y: groundAt(heightAt, landing) }), phase: 'landing' };
  const route = [caveGround, apronGround, ...safeAirPath(anchors, heightAt, clearance).map(p => ({ ...p, phase: 'survey' })), landingGround];
  const homeAir = safeAirPath([{ x: landing.x, z: landing.z }, { x: departure.x, z: departure.z }], heightAt, clearance);
  const returnRoute = [{ ...landingGround }, ...homeAir.map(p => ({ ...p, phase: 'home' })), { ...apronGround, phase: 'landing' }, caveGround];
  return { route, returnRoute, cells: chartCells, anchors, legacyRoutes: () => buildLegacySuvalFlightRoute(options) };
}
function indexRoute(route) {
  if (!Array.isArray(route) || route.length < 2 || route.some(p => !['x', 'y', 'z'].every(axis => Number.isFinite(p[axis]))))
    throw new Error('A flight route needs at least two finite 3D points.');
  const ends = [0], horizontalEnds = [0]; let horizontal = 0;
  for (let i = 1; i < route.length; i++) {
    ends.push(ends.at(-1) + distance(route[i - 1], route[i]));
    horizontal += Math.hypot(route[i].x - route[i - 1].x, route[i].z - route[i - 1].z);
    horizontalEnds.push(horizontal);
  }
  return { points: route, ends, length: ends.at(-1), horizontal, horizontalEnds };
}
function sampleRoute(route, traveled) {
  let next = 1;
  while (next < route.ends.length - 1 && route.ends[next] < traveled) next++;
  const a = route.points[next - 1], b = route.points[next];
  const ratio = clamp((traveled - route.ends[next - 1]) / (route.ends[next] - route.ends[next - 1] || 1), 0, 1);
  return { x: a.x + (b.x - a.x) * ratio, y: a.y + (b.y - a.y) * ratio,
    z: a.z + (b.z - a.z) * ratio, next, phase: b.phase };
}
export function validateBatmanFlightSnapshot(s, { allowMissing = true } = {}) {
  if (s === undefined) return allowMissing;
  if (!s || ![1, 2, 3].includes(s.version) || !['idle', 'flying', 'landed', 'returning', 'home'].includes(s.stage)
    || !Number.isFinite(s.distance) || s.distance < 0 || s.distance > 100000
    || !Number.isFinite(s.returnDistance) || s.returnDistance < 0 || s.returnDistance > 100000
    || !Number.isFinite(s.landTime) || s.landTime < 0 || s.landTime > 3
    || !Number.isInteger(s.narration) || s.narration < 0 || s.narration > BATMAN_HISTORY.length
    || !Array.isArray(s.visited) || s.visited.length > 500 || new Set(s.visited).size !== s.visited.length
    || s.visited.some(key => typeof key !== 'string' || !/^(West|South|East) Suval:-?\d+,-?\d+$/.test(key))) return false;
  if (s.stage === 'idle' && (s.distance || s.returnDistance || s.landTime || s.narration || s.visited.length)) return false;
  if (['flying', 'landed'].includes(s.stage) && s.returnDistance !== 0) return false;
  if (s.version >= 2 && s.stage === 'flying' && s.visited.length) return false;
  if (s.version === 3) {
    if (!Number.isFinite(s.tourLength) || s.tourLength <= 0 || s.tourLength > 100000
      || !Number.isFinite(s.returnLength) || s.returnLength <= 0 || s.returnLength > 100000
      || s.distance > s.tourLength + 1e-5 || s.returnDistance > s.returnLength + 1e-5) return false;
    if (['landed', 'returning', 'home'].includes(s.stage) && Math.abs(s.distance - s.tourLength) > 1e-5) return false;
    if (s.stage === 'home' && Math.abs(s.returnDistance - s.returnLength) > 1e-5) return false;
  }
  return true;
}
export function createBatmanFlight({ route, returnRoute, cells: chartCells = [], legacyRoutes, onEvent = () => {}, speed = BATMAN_FLIGHT_SPEED }) {
  const tour = indexRoute(route), home = indexRoute(returnRoute);
  const cells = chartCells.map(cell => ({ ...cell, key: cellKey(cell) }));
  const validCells = new Set(cells.map(cell => cell.key));
  let s = fresh(tour.length, home.length);
  const emit = (type, extra = {}) => onEvent({ type, ...extra });
  function state() {
    const returning = ['returning', 'home'].includes(s.stage), track = returning ? home : tour;
    const traveled = returning ? s.returnDistance : s.distance, p = sampleRoute(track, traveled);
    const ahead = sampleRoute(track, Math.min(track.length, traveled + 10)), behind = sampleRoute(track, Math.max(0, traveled - 4));
    const dx = ahead.x - behind.x, dz = ahead.z - behind.z;
    return { ...copy(s), ...point(p), position: point(p), yaw: Math.atan2(dx, dz), phase: p.phase,
      mounted: s.stage === 'flying', active: ['flying', 'landed', 'returning'].includes(s.stage),
      flying: ['flying', 'returning'].includes(s.stage), airborne: ['flying', 'returning'].includes(s.stage) && p.phase !== 'approach', progress: tour.length ? s.distance / tour.length : 0,
      routeLength: tour.length, cellCount: cells.length, speed: ['flying', 'returning'].includes(s.stage) ? speed : 0 };
  }
  function start() {
    if (s.stage !== 'idle') return false;
    s.stage = 'flying'; emit('flight-started'); narrate(); return true;
  }
  function narrate() {
    while (s.narration < BATMAN_HISTORY.length && s.distance / tour.length >= s.narration / BATMAN_HISTORY.length * .91) {
      const index = s.narration++; emit('narration', { index, ...BATMAN_HISTORY[index] });
    }
  }
  function tick(dt, { playing = true } = {}) {
    if (!playing || !(dt > 0)) return state();
    const step = Math.min(.25, dt);
    if (s.stage === 'flying') {
      const p = sampleRoute(tour, s.distance), a = tour.points[p.next - 1], b = tour.points[p.next];
      const vertical = Math.hypot(b.x - a.x, b.z - a.z) < .1;
      s.distance = Math.min(tour.length, s.distance + step * (b.phase === 'approach' ? 3.8 : vertical ? 7 : speed));
      narrate();
      if (s.distance >= tour.length) {
        // Complete both persistent flight fields before callbacks can autosave.
        // Ordinary exploration still reveals the ground below during the flight;
        // this reward fills every remaining hex without flying a grid over Suval.
        s.stage = 'landed'; s.visited = cells.map(cell => cell.key);
        emit('landed', { position: point(tour.points.at(-1)) });
        for (const cell of cells) emit('cell-revealed', { cell: { ...cell }, region: cell.region, q: cell.q, r: cell.r, x: cell.x, z: cell.z });
        emit('regions-revealed', { regions: [...SUVAL_FLIGHT_REGIONS], cells: cells.length });
      }
    } else if (s.stage === 'landed') {
      s.landTime = Math.min(3, s.landTime + step);
      if (s.landTime >= 3) returnHome();
    } else if (s.stage === 'returning') {
      const p = sampleRoute(home, s.returnDistance), a = home.points[p.next - 1], b = home.points[p.next];
      const vertical = Math.hypot(b.x - a.x, b.z - a.z) < .1;
      s.returnDistance = Math.min(home.length, s.returnDistance + step * (b.phase === 'approach' ? 3.8 : vertical ? 7 : speed));
      if (s.returnDistance >= home.length) { s.stage = 'home'; emit('home', { position: point(home.points.at(-1)) }); }
    }
    return state();
  }
  function returnHome() {
    if (s.stage !== 'landed') return false;
    s.stage = 'returning'; emit('return-started'); return true;
  }
  // Earlier saves omitted their route totals. The authored horizontal route is
  // unchanged; terrain can only add the bounded climbs and graded air segments.
  const legacyCeiling = track => track.horizontal * Math.sqrt(1.09) + 600;
  const plausibleLegacyTotal = (total, track) => total >= track.horizontal - 1e-5 && total <= legacyCeiling(track) + 1e-5;
  function plausibleLegacyHistory(value, track) {
    const beats = total => Math.min(BATMAN_HISTORY.length, Math.floor(value.distance / total / .91 * BATMAN_HISTORY.length + 1e-8) + 1);
    return value.narration >= beats(legacyCeiling(track)) && value.narration <= beats(Math.max(1, track.horizontal));
  }
  function restore(value) {
    if (!validateBatmanFlightSnapshot(value)) return false;
    if (value === undefined) { s = fresh(tour.length, home.length); return true; }
    if (value.visited.some(key => !validCells.has(key))) return false;
    let next = copy(value);
    const finished = ['landed', 'returning', 'home'].includes(value.stage);
    if (value.version === 1) {
      if (!legacyRoutes) return false;
      const old = legacyRoutes(), oldTour = indexRoute(old.route), oldHome = indexRoute(old.returnRoute);
      const waypoints = oldTour.points.flatMap((p, i) => p.cell ? [{ key: cellKey(p.cell), horizontal: oldTour.horizontalEnds[i] }] : []);
      // The old chart was discovered in itinerary order. The exact last cell
      // cannot be recomputed from metres after a height revision, but a skipped,
      // reordered or physically unreachable prefix is still invalid.
      if (value.visited.length > waypoints.length || value.visited.some((key, i) => key !== waypoints[i].key)
        || value.distance > legacyCeiling(oldTour) + 1e-5 || value.returnDistance > legacyCeiling(oldHome) + 1e-5) return false;
      if (finished && (value.visited.length !== waypoints.length || !plausibleLegacyTotal(value.distance, oldTour)
        || value.narration !== BATMAN_HISTORY.length)) return false;
      if (value.stage === 'home' && !plausibleLegacyTotal(value.returnDistance, oldHome)) return false;
      if (value.stage === 'flying') {
        const last = waypoints[value.visited.length - 1], nextCell = waypoints[value.visited.length];
        if ((last && value.distance < last.horizontal - 1e-5)
          || (nextCell && value.distance > nextCell.horizontal * Math.sqrt(1.09) + 600 + 1e-5)
          || !plausibleLegacyHistory(value, oldTour)) return false;
      }
      // Previously charted hexes remain in the map save. Carry elapsed progress
      // and spoken history forward, without replaying rewards during migration.
      next = { ...next, version: 3, tourLength: tour.length, returnLength: home.length,
        distance: finished ? tour.length : Math.min(value.distance / oldTour.length, 1 - 1e-8) * tour.length,
        returnDistance: value.stage === 'home' ? home.length : Math.min(value.returnDistance / oldHome.length, 1 - 1e-8) * home.length,
        visited: finished ? cells.map(cell => cell.key) : [] };
    }
    if (value.version === 2) {
      // Version 2 stored metres but omitted total lengths. Terrain edits alter
      // those 3D totals even when the itinerary is unchanged. Bound old lengths
      // by the fixed horizontal path, the .3 air-path gradient, and at most 300 m
      // of climb/descent at each end. Completed chart/history remain mandatory.
      if (value.distance > legacyCeiling(tour) + 1e-5 || value.returnDistance > legacyCeiling(home) + 1e-5) return false;
      if (finished && (!plausibleLegacyTotal(value.distance, tour) || value.narration !== BATMAN_HISTORY.length)) return false;
      if (value.stage === 'home' && !plausibleLegacyTotal(value.returnDistance, home)) return false;
      if (value.stage === 'flying' && !plausibleLegacyHistory(value, tour)) return false;
      next = { ...next, version: 3, tourLength: tour.length, returnLength: home.length,
        distance: finished ? tour.length : Math.min(value.distance, tour.length * (1 - 1e-8)),
        returnDistance: value.stage === 'home' ? home.length : Math.min(value.returnDistance, home.length * (1 - 1e-8)) };
    } else if (value.version === 3) {
      // Future height and route revisions retain progress using the recorded
      // totals. No landing, discovery or skill callbacks run during restoration.
      next = { ...next, tourLength: tour.length, returnLength: home.length,
        distance: value.distance / value.tourLength * tour.length,
        returnDistance: value.returnDistance / value.returnLength * home.length };
    }
    if (next.distance > tour.length + 1e-5 || next.returnDistance > home.length + 1e-5) return false;
    if (finished && Math.abs(next.distance - tour.length) > 1e-5) return false;
    if (next.stage === 'home' && Math.abs(next.returnDistance - home.length) > 1e-5) return false;
    const expected = finished ? [...validCells] : [];
    if (next.visited.length !== expected.length || expected.some(key => !next.visited.includes(key))) return false;
    s = next; return true;
  }
  return { state, snapshot: () => copy(s), restore, start, tick, returnHome,
    get mounted() { return s.stage === 'flying'; }, get active() { return ['flying', 'landed', 'returning'].includes(s.stage); } };
}

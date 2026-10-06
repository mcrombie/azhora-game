import * as THREE from 'three';
import { canStand, canSwim, moveCharacter } from '../../gameplay/movement/game-state.js';
import { createClimbing, sampleClimbSurface, canWalkSlope } from '../../gameplay/movement/climbing.js';
import { DEVELOPER_BAT } from '../tools/developer-bat.js';
import { SOUTH_OREMINDI, SOUTH_OREMINDI_ARRIVAL, PEAKS, PATHS, LAKES } from '../../content/regions/south-oremindi/south-oremindi-world.js';
import { SOUTH_OREMINDI_WILDLIFE_ZONES } from '../../content/regions/south-oremindi/south-oremindi-wildlife.js';

/** Real renderer/world smoke. Required hooks: world, life, player, travel(at),
 * open(), saved(), state(), frames(n), startFlight(), flight, stopFlight().
 * Mesh lists may be passed explicitly as terrainMeshes and
 * waterMeshes, or exposed by world.southOremindi. The accelerated traversal uses ordinary collision/slope
 * controllers against the actual populated world, without moving its player.
 */
export async function runSouthOremindiChecks(h) {
  const { world, life } = h, checks = [], metrics = {}, started = performance.now(), saved = h.saved();
  let phase = 'arrival';
  const check = (ok, label) => {
    if (!ok) {
      const progress = { phase, checks: [...checks], metrics, elapsedMs: performance.now() - started };
      const error = new Error(`South Oremindi: ${label}\nProgress: ${JSON.stringify(progress)}`);
      Object.assign(error, progress); throw error;
    }
    checks.push(label);
  };
  const ground = p => ({ x: p.x, y: world.heightAt(p.x, p.z), z: p.z });
  const visit = async p => { h.travel(ground(p)); await h.frames(2); };
  h.open(); await h.frames(1);
  const country = document.getElementById('test-country'), place = document.getElementById('test-place');
  check(!!country && !!place, 'The real F8 testing destinations are available');
  country.value = SOUTH_OREMINDI; country.dispatchEvent(new Event('change'));
  place.value = '0'; document.getElementById('test-goto').click(); await h.frames(2);
  check(h.state().testingEnabled && h.state().mode === 'playing', 'Travel uses an isolated ordinary playing session');
  check(world.regionAt(h.player.group.position.x, h.player.group.position.z).id === 37,
    'The actual arrival is registered as South Oremindi');
  check(canStand(h.player.group.position.x, h.player.group.position.z, world)
    && Math.abs(h.player.group.position.y - world.heightAt(h.player.group.position.x, h.player.group.position.z)) < .2,
  'The traveler arrives on clear ground without floating or burial');

  phase = 'visible-surfaces';
  const scenery = world.southOremindi;
  const terrainMeshes = meshList(h.terrainMeshes ?? scenery?.terrainMeshes ?? scenery?.terrainRoot);
  const waterMeshes = meshList(h.waterMeshes ?? scenery?.waterMeshes ?? scenery?.waterRoot);
  check(terrainMeshes.length > 0 && waterMeshes.length > 0, 'The real scene contains mountain ground and lake water meshes');
  const visibleGround = surfaceSampler(terrainMeshes), visibleWater = surfaceSampler(waterMeshes);
  const probes = [SOUTH_OREMINDI_ARRIVAL, ...PEAKS,
    ...PATHS.flatMap(path => [path.points[0], path.points[Math.floor(path.points.length / 2)], path.points.at(-1)])];
  metrics.surfaces = probes.map(p => ({ x: p.x, z: p.z, ground: world.heightAt(p.x, p.z), drawn: visibleGround(p.x, p.z) }));
  check(metrics.surfaces.every(p => Number.isFinite(p.drawn) && Math.abs(p.drawn - p.ground) < .5),
    'Rendered ground agrees with the walking surface at the arrival, cols and three summits');
  metrics.lakes = LAKES.map(lake => {
    const p = lake.centre, floor = world.heightAt(p.x, p.z), surface = world.waterAt(p.x, p.z);
    return { id: lake.id, ...p, floor, surface, drawn: visibleWater(p.x, p.z), swimmable: canSwim(p.x, p.z, world) };
  });
  check(metrics.lakes.length === 2 && metrics.lakes.every(lake => lake.surface > lake.floor + 1 && lake.swimmable),
    'Both real lake basins expose deep, unobstructed swimmable water');
  check(metrics.lakes.every(lake => Number.isFinite(lake.drawn) && Math.abs(lake.drawn - lake.surface) < .12),
    'Both rendered lake surfaces match the swimming water height');

  phase = 'walking-and-climbing';
  const approach = PATHS.find(path => path.id === 'oremindi-tarn-approach');
  check(!!approach, 'The sheltered approach has an actual continuous route');
  const walked = walkRoute(approach.points, world);
  metrics.walking = { route: approach.id, ...walked };
  check(walked.ok && walked.metres > 60, 'Ordinary collision and slope rules traverse the complete sheltered approach');
  phase = 'full-crown-ascent';
  metrics.crownAscent = climbSouthOremindiCrown(world);
  const ascent = metrics.crownAscent;
  check(ascent.ok, `The full crown ascent succeeds against actual terrain and colliders (${ascent.reason ?? 'complete'})`);
  check(ascent.walked > 800 && Math.abs(ascent.position.y - ascent.expectedSummit) < .5 && ascent.phase === 'idle',
    'A beginner reaches the crown standing after more than 800 metres of real walking');
  check(ascent.headwallClimbs >= 5 && ascent.staminaSpent > 200 && ascent.minimumStamina > 0 && ascent.damage === 0,
    'The five headwall climbs use stamina and natural resting shelves without exhaustion or fall damage');
  const highest = Math.max(...PEAKS.map(p => world.heightAt(p.x, p.z)));
  metrics.flight = { highestSummit: highest, ceiling: DEVELOPER_BAT.ceiling, clearance: DEVELOPER_BAT.clearance };
  check(DEVELOPER_BAT.ceiling > highest + DEVELOPER_BAT.clearance + 5,
    'The testing flight ceiling leaves clearance above the highest rendered summit');
  phase = 'summit-flight';
  const summit = [...PEAKS].sort((a, b) => world.heightAt(b.x, b.z) - world.heightAt(a.x, a.z))[0];
  await visit(summit);
  try {
    h.startFlight();
    check(h.flight.active, 'The real testing mount starts above the mountain summit');
    for (let i = 0; i < 20; i++) h.flight.tick(.2, { playing: true, lift: 1 });
    const begin = h.flight.view().position;
    for (let i = 0; i < 8; i++) h.flight.tick(.2, { playing: true, dx: 1 });
    const end = h.flight.view().position;
    Object.assign(metrics.flight, { begin, end, travelled: Math.hypot(end.x - begin.x, end.z - begin.z) });
    check(metrics.flight.travelled > 20 && end.y >= world.heightAt(end.x, end.z) + DEVELOPER_BAT.clearance - .02,
      'The actual flight controller crosses the summit airspace without hitting a ceiling wall');
  } finally { h.stopFlight(); }

  phase = 'wildlife';
  const zones = SOUTH_OREMINDI_WILDLIFE_ZONES;
  const initial = life.snapshot().creatures.filter(animal => animal.region === SOUTH_OREMINDI);
  const wantedSpecies = new Set(zones.map(zone => zone.species));
  const counts = Object.fromEntries([...wantedSpecies].map(species => [species, initial.filter(animal => animal.species === species).length]));
  metrics.wildlife = { counts, animals: initial.length, zones: zones.length, seenGroups: [] };
  check(wantedSpecies.size >= 4 && Object.values(counts).every(count => count > 0),
    'Every registered mountain wildlife species is instantiated in the real world');
  for (const zone of zones) {
    const animal = initial.find(a => a.id.startsWith(`${zone.id}-`));
    if (!animal) continue;
    // Observe from beyond flee range: placing the test observer directly on a
    // duck would deliberately launch it before checking its floating footing.
    const observers = Array.from({ length: 12 }, (_, i) => ({ x: animal.x + Math.sin(i * Math.PI / 6) * 65,
      z: animal.z + Math.cos(i * Math.PI / 6) * 65 }));
    const clearance = p => Math.min(...initial.map(a => Math.hypot(a.x - p.x, a.z - p.z)));
    observers.sort((a, b) => clearance(b) - clearance(a));
    life.update(.04, observers[0], true);
    const group = life.state().groups.find(group => group.id === zone.id);
    if (group?.visible && group.count > 0 && group.ticks > 0) metrics.wildlife.seenGroups.push(zone.id);
  }
  check(metrics.wildlife.seenGroups.length === zones.length,
    'Every populated habitat renders and updates when observed nearby');
  const animals = life.snapshot().creatures.filter(animal => animal.region === SOUTH_OREMINDI);
  const habitatFailures = [];
  let groundCount = 0, airCount = 0, floatingCount = 0;
  for (const animal of animals) {
    const zone = zones.find(zone => animal.id.startsWith(`${zone.id}-`));
    if (!zone) { habitatFailures.push({ id: animal.id, reason: 'unknown-zone' }); continue; }
    const floor = world.heightAt(animal.x, animal.z), water = world.waterAt(animal.x, animal.z);
    if (world.regionAt(animal.x, animal.z).name !== SOUTH_OREMINDI) habitatFailures.push({ id: animal.id, reason: 'outside-region' });
    if (zone.air) { airCount++; if (animal.y <= floor + 2) habitatFailures.push({ id: animal.id, reason: 'airborne-below-ground' }); continue; }
    if (zone.float) {
      floatingCount++;
      if (water <= floor || !canSwim(animal.x, animal.z, world, zone.radius)
        || Math.abs(animal.groundY - (water - .04)) > .1) habitatFailures.push({ id: animal.id, reason: 'floating-footing' });
      continue;
    }
    groundCount++;
    if (!canStand(animal.x, animal.z, world, zone.radius) || Math.abs(animal.groundY - floor) > .15)
      habitatFailures.push({ id: animal.id, reason: 'ground-footing' });
    const s = Math.max(.4, zone.radius), heights = [[s, 0], [-s, 0], [0, s], [0, -s]].map(([dx, dz]) => world.heightAt(animal.x + dx, animal.z + dz));
    const slope = Math.hypot((heights[0] - heights[1]) / (s * 2), (heights[2] - heights[3]) / (s * 2));
    if (slope > (zone.maxSlope ?? .9) + .025 || Math.max(...heights.map(y => Math.abs(y - floor))) > s * (zone.maxSlope ?? .9) + .025)
      habitatFailures.push({ id: animal.id, reason: 'steep-footing', slope });
  }
  Object.assign(metrics.wildlife, { groundCount, airCount, floatingCount, habitatFailures });
  check(groundCount > 0 && airCount > 0 && floatingCount > 0, 'Ground mammals, airborne eagles and floating lake birds are all present');
  check(habitatFailures.length === 0, 'Wildlife stays in its country on dry safe slopes, above terrain or on lake water as appropriate');

  await visit(SOUTH_OREMINDI_ARRIVAL);
  phase = 'complete';
  const state = h.state();
  check(!state.frameErrors?.count, 'No renderer frame errors during South Oremindi checks');
  check(h.saved() === saved, 'Mountain testing leaves the normal saved checkpoint unchanged');
  metrics.elapsedMs = performance.now() - started;
  metrics.observedAverageFrameMs = state.averageFrameMs;
  return { ok: true, checks, metrics };
}

function meshList(value) {
  if (Array.isArray(value)) return value.flatMap(meshList);
  const meshes = [];
  value?.traverse?.(object => { if (object.isMesh) meshes.push(object); });
  return meshes;
}

function surfaceSampler(meshes) {
  const ray = new THREE.Raycaster(new THREE.Vector3(), new THREE.Vector3(0, -1, 0));
  for (const mesh of meshes) mesh.updateWorldMatrix(true, false);
  // Bounds may deliberately describe a tile of a shared world attribute. Never
  // recompute them from that full attribute or clone its arrays per tile.
  const bounds = new Map(meshes.filter(mesh => mesh.geometry.boundingBox)
    .map(mesh => [mesh, mesh.geometry.boundingBox.clone().applyMatrix4(mesh.matrixWorld)]));
  return (x, z) => {
    let top = null;
    ray.ray.origin.set(x, 4000, z);
    for (const mesh of meshes) {
      if (!mesh.visible) continue;
      const b = bounds.get(mesh);
      if (b && (x < b.min.x || x > b.max.x || z < b.min.z || z > b.max.z)) continue;
      const hit = ray.intersectObject(mesh, false)[0];
      if (hit) top = Math.max(top ?? -Infinity, hit.point.y);
    }
    return top;
  };
}

function walkRoute(points, world) {
  const at = { ...points[0], y: world.heightAt(points[0].x, points[0].z) };
  let metres = 0;
  if (!canStand(at.x, at.z, world)) return { ok: false, at, reason: 'blocked-start', metres };
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1], b = points[i], length = Math.hypot(b.x - a.x, b.z - a.z), steps = Math.ceil(length / .25);
    for (let step = 1; step <= steps; step++) {
      const t = step / steps, target = { x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t };
      const before = { ...at };
      moveCharacter(at, target.x - at.x, target.z - at.z, world, .34,
        { canTraverse: (x, z, nx, nz) => canWalkSlope(x, z, nx, nz, world) });
      at.y = world.heightAt(at.x, at.z);
      metres += Math.hypot(at.x - before.x, at.z - before.z);
      if (Math.hypot(at.x - target.x, at.z - target.z) > .06) return { ok: false, at, target, metres, reason: 'blocked-step' };
    }
  }
  return { ok: true, at, metres };
}

/** Same 30 Hz beginner walk/climb algorithm as the terrain ascent test, applied
 * to the actual world supplied by the desktop host. No collision filters, free
 * stamina while climbing, route warps, or surface substitutions are permitted.
 */
export function climbSouthOremindiCrown(world) {
  const distance = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
  const samplePath = path => {
    const samples = [path.points[0]];
    for (let i = 1; i < path.points.length; i++) {
      const a = path.points[i - 1], b = path.points[i], count = Math.ceil(distance(a, b) / .35);
      for (let j = 1; j <= count; j++) samples.push({ x: a.x + (b.x - a.x) * j / count, z: a.z + (b.z - a.z) * j / count });
    }
    return samples;
  };
  const shoulder = PATHS.find(path => path.id === 'oremindi-crown-traverse'), scramble = PATHS.find(path => path.kind === 'scramble');
  if (!shoulder || !scramble) return { ok: false, reason: 'missing-crown-route' };
  const expectedSummit = scramble.points.at(-1).y, headwallStart = scramble.points[0].y;
  const route = [...samplePath(shoulder), ...samplePath(scramble)];
  const at = { ...route[0], y: world.heightAt(route[0].x, route[0].z) }, events = [];
  const climb = createClimbing({ world, onEvent: event => events.push(event) }), dt = 1 / 30;
  let target = 1, frames = 0, stamina = 100, minimumStamina = 100, staminaSpent = 0, staminaRecovered = 0;
  let walked = 0, stalled = 0, damage = 0, restingFrames = 0;
  const result = (ok, reason = null) => {
    const surface = sampleClimbSurface(world, at.x, at.z), state = climb.view();
    return { ok, reason, position: { ...at }, goal: route[target] ? { ...route[target] } : null,
      target, routePoints: route.length, frames, simulatedSeconds: frames * dt, walked,
      phase: state.phase, stamina, minimumStamina, staminaSpent, staminaRecovered, damage,
      expectedSummit, renderedSummit: world.heightAt(route.at(-1).x, route.at(-1).z),
      restingSeconds: restingFrames * dt, stalledSeconds: stalled, slope: surface.slope,
      headwallClimbs: events.filter(event => event.type === 'grabbed' && event.position.y >= headwallStart - .5).length,
      events: events.map(event => ({ type: event.type, position: event.position, phase: event.phase })),
      ...(!ok ? { colliders: (world.nearColliders?.(at.x, at.z, 3) ?? world.colliders ?? [])
        .filter(c => Math.hypot(c.x - at.x, c.z - at.z) < 5 + (c.r ?? Math.max(c.hx ?? 0, c.hz ?? 0)))
        .slice(0, 16).map(c => ({ id: c.id, kind: c.kind, x: c.x, z: c.z, r: c.r, hx: c.hx, hz: c.hz })) } : {}) };
  };
  if (!canStand(at.x, at.z, world)) return result(false, 'blocked-arrival');
  while (target < route.length && frames++ < 30 * 1200) {
    while (target < route.length && distance(at, route[target]) < .2) target++;
    if (target === route.length) break;
    const goal = route[target], d = distance(at, goal), dx = (goal.x - at.x) / d, dz = (goal.z - at.z) / d, before = { ...at };
    const surface = sampleClimbSurface(world, at.x, at.z);
    if (climb.active) {
      const g = surface.gradient, up = (dx * g.x + dz * g.z) * Math.sqrt(1 + surface.slope ** 2), side = -dx * g.z + dz * g.x;
      const frame = climb.tick(dt, { up, side, stamina, level: 1 });
      stamina -= frame.staminaSpent; staminaSpent += frame.staminaSpent; damage += frame.damage;
      Object.assign(at, frame.position);
      if (damage !== 0) return result(false, 'climbing-damage');
    } else {
      const recovered = Math.min(100 - stamina, 24 * dt); stamina += recovered; staminaRecovered += recovered;
      if (surface.resting && stamina - recovered < 95) { restingFrames++; continue; }
      moveCharacter(at, dx * Math.min(d, 4.2 * dt), dz * Math.min(d, 4.2 * dt), world, .34,
        { canTraverse: (x, z, nx, nz) => canWalkSlope(x, z, nx, nz, world) });
      walked += distance(at, before); at.y = world.heightAt(at.x, at.z);
      if (distance(at, before) < .001) climb.grab(at, surface.yaw, { stamina });
    }
    minimumStamina = Math.min(minimumStamina, stamina);
    stalled = distance(at, before) < .001 ? stalled + dt : 0;
    if (stalled >= 4) return result(false, 'stalled-four-seconds');
    if (stamina <= 0 || events.some(event => event.type === 'exhausted')) return result(false, 'exhausted');
    if (world.heightAt(at.x, at.z) < (world.waterAt?.(at.x, at.z) ?? .45)) return result(false, 'entered-water');
    if (!canStand(at.x, at.z, world, .34, at.y)) return result(false, 'collided');
  }
  if (target !== route.length) return result(false, 'route-timeout');
  if (climb.active || Math.abs(at.y - expectedSummit) >= .5 || walked <= 800 || staminaSpent <= 200)
    return result(false, 'incomplete-ascent');
  return result(true);
}

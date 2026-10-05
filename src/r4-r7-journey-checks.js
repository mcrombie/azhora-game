import * as THREE from 'three';
import { canStand } from './game-state.js';
import { canWalkSlope } from './climbing.js';
import { canPushThrough } from './undergrowth.js';
import { TROGO_NORTH_LINK_WALK } from './southwest-world.js';
import { SOUTHWEST_WILDLIFE_ZONES } from './southwest-wildlife.js';
import { GANESH_SHADE_SCRUB } from './ganesh-shade-scrub.js';
import { regionalWildlifeSight } from './regional-wildlife-sight.js';

const gap = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const point = p => ({ x: p.x, y: p.y, z: p.z });
const visible = object => { for (let p = object; p; p = p.parent) if (!p.visible) return false; return true; };
const identities = rows => rows.map(({ id, species, region }) => [id, species, region]).sort((a, b) => a[0].localeCompare(b[0]));
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
export const R4_R7_WILDLIFE_CASES = Object.freeze([
  Object.freeze({ zone: 'navarth-wood-deer', region: 39, id: 'navarth-wood-deer-3', label: 'Navarth north wood', radius: 34, approach: 12, angleSteps: Object.freeze([3, 5, 11, 10, 1, 2, 4, 6, 7, 8, 9, 0]) }),
  Object.freeze({ zone: 'ganesh-ghubr', region: 41, id: 'ganesh-ghubr-1', label: 'Ganesh ghubr scrub pocket', radius: 30, approach: 7 }),
]);

// This bounded planner selects a normal route round existing trees, never
// modifies the traveler or collision, and never crosses a steep return slope.
// Native W input must still traverse every selected segment in both directions.
export function planR4HabitatWalk(world, start, finish, { step = 2, margin = 16 } = {}) {
  const safe = p => {
    const y = world.heightAt(p.x, p.z);
    return canStand(p.x, p.z, world, .34, y);
  };
  const edge = (a, b) => {
    const count = Math.max(1, Math.ceil(gap(a, b) / .18)); let prev = a;
    for (let i = 1; i <= count; i++) {
      const p = { x: a.x + (b.x - a.x) * i / count, z: a.z + (b.z - a.z) * i / count };
      if (!safe(p) || !canWalkSlope(prev.x, prev.z, p.x, p.z, world) || !canWalkSlope(p.x, p.z, prev.x, prev.z, world)
        || !canPushThrough(prev.x, prev.z, p.x, p.z, world) || !canPushThrough(p.x, p.z, prev.x, prev.z, world)
        || Math.abs(world.heightAt(prev.x, prev.z) - world.heightAt(p.x, p.z)) > .12) return false;
      prev = p;
    }
    return true;
  };
  if (!safe(start) || !safe(finish)) throw new Error('Habitat route endpoints lack clear dry support');
  const minX = Math.min(start.x, finish.x) - margin, maxX = Math.max(start.x, finish.x) + margin;
  const minZ = Math.min(start.z, finish.z) - margin, maxZ = Math.max(start.z, finish.z) + margin;
  const root = { ...start, key: '0,0', cost: 0, rank: gap(start, finish), parent: null, ix: 0, iz: 0 };
  const open = [root], best = new Map([[root.key, root]]), closed = new Set();
  while (open.length && closed.size < 3500) {
    open.sort((a, b) => a.rank - b.rank); const current = open.shift();
    if (closed.has(current.key)) continue; closed.add(current.key);
    if (gap(current, finish) <= step * 1.5 && edge(current, finish)) {
      const route = [{ x: finish.x, z: finish.z }];
      for (let p = current; p; p = p.parent) route.push({ x: p.x, z: p.z });
      route.reverse();
      // Preserve selected free-space turns while avoiding needless 2 m stops.
      const simplified = [route[0]]; let at = 0;
      while (at < route.length - 1) {
        let next = Math.min(route.length - 1, at + 8);
        while (next > at + 1 && !edge(route[at], route[next])) next--;
        simplified.push(route[next]); at = next;
      }
      return simplified;
    }
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) {
      const ix = current.ix + dx, iz = current.iz + dz, key = `${ix},${iz}`;
      const p = { x: start.x + ix * step, z: start.z + iz * step, ix, iz, key };
      if (closed.has(key) || p.x < minX || p.x > maxX || p.z < minZ || p.z > maxZ || !edge(current, p)) continue;
      const cost = current.cost + gap(current, p);
      if (best.has(key) && best.get(key).cost <= cost) continue;
      Object.assign(p, { cost, rank: cost + gap(p, finish), parent: current }); best.set(key, p); open.push(p);
    }
  }
  throw new Error('No bounded ordinary habitat route around the existing scenery');
}

/** Native-only review. Hooks are recorded in the companion integration artifact;
 * this module never advances actors manually, relocates a moving traveler,
 * changes stamina/health, or loads missing regions behind an arrival assertion. */
export async function runR4R7JourneyChecks(h, { habitatsOnly = false, onlyHabitat = null } = {}) {
  const checks = [], failures = [], routes = [], habitats = [], views = {};
  const verify = (ok, message) => { if (!ok) throw new Error(message); checks.push(message); };
  const position = () => point(h.player.group.position), state = () => h.read();
  const fauna = () => h.wildlife().creatures;
  const identityBefore = identities(fauna().filter(a => ['Navarth', 'Ganesh Desert', 'Marosh', 'Trogo'].includes(a.region)));
  const result = { ok: false, scope: onlyHabitat ?? (habitatsOnly ? 'habitats' : 'routes-and-habitats'), mode: state().loadingMode, checks, failures, routes, habitats, views };
  const observe = id => fauna().find(a => a.id === id);
  const run = async (name, callback) => {
    try { await callback(); } catch (error) { failures.push({ name, error: error.message, position: position(), fall: state().terrainFall }); }
    finally { h.release('KeyW'); h.release('ShiftLeft'); }
  };
  const capture = async name => {
    // The companion main-process hook acknowledges capturePage completion. No
    // simulation freeze: these are the same live poses and camera as the walk.
    const tag = `${state().loadingMode}-${name}`, began = performance.now();
    window.__r4R7CaptureAck = null;
    console.log('R4_R7_CAPTURE ' + tag);
    while (window.__r4R7CaptureAck?.name !== tag && performance.now() - began < 15000) await h.frames(1);
    const ack = window.__r4R7CaptureAck;
    if (ack?.name !== tag || ack.error) failures.push({ name: 'Native capture ' + tag, error: ack?.error ?? 'Capture was not acknowledged' });
  };
  const travel = async (at, label) => {
    const id = h.world.regionAt(at.x, at.z).id, before = position(), pending = h.world.loading && !h.world.loading.isReady(id);
    h.press('F8'); h.release('F8');
    const input = document.getElementById('test-point'), button = document.getElementById('test-point-go');
    verify(state().mode === 'testing' && input && button && !button.disabled, label + ' opens normal F8 travel');
    input.value = `${at.x}, ${at.z}`; button.click();
    if (pending) verify(gap(position(), before) < .001 && state().waitingForRegion, label + ' waits for all destination jobs');
    await h.ready(); h.world.loading?.stop(); await h.frames(3);
    verify((!h.world.loading || h.world.loading.isReady(id)) && !state().waitingForRegion, label + ' releases only after regional readiness');
    verify(state().mode === 'playing' && !state().inWater && !state().terrainFall.active && gap(position(), at) < .2 && canStand(at.x, at.z, h.world, .34, position().y), label + ' arrives on clear dry ground');
  };
  const walk = async (name, line, onFrame = () => {}, { minimumDistance = 10 } = {}) => {
    const initial = position(), hp = state().hp, began = performance.now(); let walked = 0, rise = 0, leastWind = h.wind(), prior = initial, loadingMs = 0;
    const row = { name, line, start: initial, end: null, walked: 0, seconds: 0, loadingMs: 0, waits: [], maxRise: 0, leastWind, complete: false }; routes.push(row);
    const waitForSupport = async () => {
      if (!state().waitingForRegion) return 0;
      const waitingAt = position(), waitStarted = performance.now(); h.release('KeyW');
      let done = false, error; Promise.resolve(h.ready()).then(() => { done = true; }, reason => { error = reason; done = true; });
      while (!done || state().waitingForRegion) {
        if (error) throw error;
        if (performance.now() - waitStarted > 180000) throw new Error(name + ' destination readiness stalled');
        await h.frames(1);
      }
      if (error) throw error;
      h.world.loading?.stop();
      const milliseconds = performance.now() - waitStarted, after = position();
      const displacement = Math.hypot(after.x - waitingAt.x, after.y - waitingAt.y, after.z - waitingAt.z);
      loadingMs += milliseconds; row.waits.push({ at: waitingAt, milliseconds, displacement }); row.loadingMs = loadingMs;
      verify(displacement <= .001, name + ' remains stationary until the intervening destination is ready');
      return milliseconds;
    };
    verify(gap(initial, line[0]) < .5, name + ' begins at its stated departure');
    h.press('KeyW');
    try {
      for (const target of line.slice(1)) {
        let lastProgress = performance.now(), priorGap = gap(position(), target);
        while (gap(position(), target) > .32) {
          const p = position(); h.face(Math.atan2(p.x - target.x, p.z - target.z)); await h.frames(1);
          if (state().waitingForRegion) { lastProgress += await waitForSupport(); h.press('KeyW'); }
          const now = position(), s = state(), remaining = gap(now, target);
          if (priorGap - remaining > .015) { priorGap = remaining; lastProgress = performance.now(); }
          if (performance.now() - lastProgress > 10000 || performance.now() - began - loadingMs > 600000)
            throw new Error(name + ' stalled with actual collision at ' + JSON.stringify({ now, target, remaining }));
          walked += gap(now, prior); rise = Math.max(rise, now.y - prior.y); prior = now; leastWind = Math.min(leastWind, h.wind());
          Object.assign(row, { end: now, walked, maxRise: rise, leastWind, seconds: (performance.now() - began - loadingMs) / 1000 }); onFrame();
          if (s.mode !== 'playing' || s.terrainFall.active || s.inWater || s.hp !== hp || h.wind() <= 0)
            throw new Error(name + ' lost ordinary dry support: ' + JSON.stringify({ now, hp: s.hp, water: s.inWater, fall: s.terrainFall, wind: h.wind() }));
        }
      }
    } finally { h.release('KeyW'); }
    await h.frames(2); await waitForSupport(); row.complete = true;
    verify(gap(position(), line.at(-1)) < .5 && walked > minimumDistance && !state().inWater && !state().terrainFall.active && state().hp === hp,
      name + ' reaches every waypoint by ordinary W input without falls, water or damage');
    return row;
  };
  const waitGame = async (seconds, callback = () => {}) => {
    const end = state().playSeconds + seconds, start = performance.now();
    while (state().playSeconds < end) {
      if (performance.now() - start > seconds * 12000 + 10000) throw new Error('Native simulation clock stalled');
      await h.frames(1); callback();
    }
  };
  const bodyView = (zone, id) => {
    h.scene.updateMatrixWorld(true); h.camera.updateMatrixWorld(true);
    const group = h.scene.getObjectByName(zone), animal = observe(id);
    const animals = fauna().filter(a => a.id.startsWith(zone + '-')), index = animals.findIndex(a => a.id === id);
    const mesh = group?.children.find(m => m.isInstancedMesh && m.name.endsWith(' bodies'));
    if (!animal || !mesh || index < 0 || index >= mesh.count) return { visible: false, id };
    mesh.geometry.computeBoundingSphere(); const matrix = new THREE.Matrix4(); mesh.getMatrixAt(index, matrix); matrix.premultiply(mesh.matrixWorld);
    const sphere = mesh.geometry.boundingSphere.clone().applyMatrix4(matrix);
    const frustum = new THREE.Frustum().setFromProjectionMatrix(new THREE.Matrix4().multiplyMatrices(h.camera.projectionMatrix, h.camera.matrixWorldInverse));
    const sight = regionalWildlifeSight(h.scene.getObjectByName('Southwest scenery'), h.camera.position, sphere.center, h.world.renderedGroundHeight);
    return { id, visible: visible(mesh), inFrustum: frustum.intersectsSphere(sphere), sight, body: point(sphere.center), radius: sphere.radius,
      distance: gap(position(), animal), action: animal.action, location: { x: animal.x, y: animal.groundY, z: animal.z } };
  };
  const shadeAt = (home, height) => {
    // Actual transformed shrub triangles, not ganeshLie or a zone radius.
    const proxies = [], matrix = new THREE.Matrix4(), centre = new THREE.Vector3();
    h.scene.updateMatrixWorld(true); let sun;
    h.scene.traverse(mesh => {
      if (mesh.isDirectionalLight && mesh.castShadow) sun = mesh;
      if (!mesh.isInstancedMesh || !['Southwest perennial scrub', GANESH_SHADE_SCRUB].includes(mesh.name) || !visible(mesh)) return;
      for (let i = 0; i < mesh.count; i++) {
        mesh.getMatrixAt(i, matrix); matrix.premultiply(mesh.matrixWorld); centre.setFromMatrixPosition(matrix);
        if (gap(centre, home) > 12) continue;
        const proxy = new THREE.Mesh(mesh.geometry, mesh.material); proxy.matrixAutoUpdate = false; proxy.matrixWorld.copy(matrix); proxies.push(proxy);
      }
    });
    const light = sun ? sun.getWorldPosition(new THREE.Vector3()).sub(sun.target.getWorldPosition(new THREE.Vector3())).normalize()
      : new THREE.Vector3(-45, 90, 38).normalize();
    const samples = [{ x: home.x, z: home.z }];
    for (const r of [2.5, 5]) for (let i = 0; i < 12; i++) samples.push({ x: home.x + Math.cos(i * Math.PI / 6) * r, z: home.z + Math.sin(i * Math.PI / 6) * r });
    const ray = new THREE.Raycaster(); ray.far = 20;
    const rows = samples.map(p => {
      ray.set(new THREE.Vector3(p.x, h.world.renderedGroundHeight(p.x, p.z) + height, p.z), light);
      const hit = ray.intersectObjects(proxies, false)[0]; return { ...p, shaded: !!hit, distance: hit?.distance ?? null };
    });
    return { home, bodyHeight: height, nearbyLobes: proxies.length, covered: rows.filter(p => p.shaded).length, samples: rows };
  };
  h.play(); h.world.loading?.stop();
  if (!habitatsOnly && !onlyHabitat) await run('Trogo full inner-bank journey', async () => {
    const outward = [...TROGO_NORTH_LINK_WALK].reverse();
    await travel(outward[0], 'Trogo middle-gully departure');
    await walk('Trogo middle to north gully', outward);
    views['trogo-inner-bank'] = { position: position(), toward: outward.at(-2), eye: 1.7 };
    h.face(Math.atan2(position().x - outward.at(-2).x, position().z - outward.at(-2).z)); await h.frames(3);
    await capture('trogo-north-gully');
    await walk('Trogo north to middle gully', [...outward].reverse());
    await capture('trogo-middle-gully');
    verify(gap(position(), outward[0]) < .5, 'Trogo journey returns continuously to its own departure');
  });
  for (const spec of R4_R7_WILDLIFE_CASES.filter(spec => !onlyHabitat || spec.zone === onlyHabitat)) await run(spec.label, async () => {
    const zone = SOUTHWEST_WILDLIFE_ZONES.find(z => z.id === spec.zone), home = zone.sites[Number(spec.id.split('-').at(-1)) - 1];
    const centre = { x: home[0], z: home[1] };
    await travel(h.world.regions.find(r => r.id === spec.region).spawn, spec.label + ' region arrival');
    let selected;
    for (let i = 0; i < 12 && !selected; i++) {
      const angle = (spec.angleSteps?.[i] ?? i) * Math.PI / 6, start = { x: centre.x + Math.cos(angle) * spec.radius, z: centre.z + Math.sin(angle) * spec.radius };
      const end = { x: centre.x + Math.cos(angle) * spec.approach, z: centre.z + Math.sin(angle) * spec.approach };
      try { selected = planR4HabitatWalk(h.world, start, end); } catch { /* another normal side of the same home */ }
    }
    verify(!!selected, spec.label + ' has an ordinary, reversible approach around existing scenery');
    await travel(selected[0], spec.label + ' off-road departure');
    const initial = observe(spec.id); verify(!!initial, spec.label + ' retains the exact existing animal');
    const row = { ...spec, initial: { ...initial }, route: selected, maxDisplacement: 0, actions: [], views: [], shade: null, nearestTree: null }; habitats.push(row);
    const actions = new Set();
    const sample = () => { const animal = observe(spec.id); if (!animal) throw new Error('The observed resident disappeared');
      row.maxDisplacement = Math.max(row.maxDisplacement, gap(initial, animal)); actions.add(animal.action); row.actions = [...actions]; };
    await walk(spec.label + ' approach', selected, sample);
    const photograph = async label => {
      const trials = [], departure = position();
      const orbit = async () => {
        for (const offset of [0, -.2618, .2618, -.5236, .5236]) {
          const animal = observe(spec.id);
          h.face(Math.atan2(position().x - animal.x, position().z - animal.z) + offset); await h.frames(2); sample();
          const view = bodyView(spec.zone, spec.id); trials.push({ offset, ...view });
          if (view.visible && view.inFrustum && view.sight?.clear) return view;
        }
        return null;
      };
      let view = await orbit(), sideRoute = null;
      if (!view && spec.zone === 'navarth-wood-deer') {
        const animal = observe(spec.id), bearing = Math.atan2(animal.x - departure.x, animal.z - departure.z);
        for (const sign of [-1, 1]) {
          const a = bearing + sign * Math.PI / 2, target = { x: departure.x + Math.sin(a) * 1.8, z: departure.z + Math.cos(a) * 1.8 };
          let route; try { route = planR4HabitatWalk(h.world, departure, target, { step: .5, margin: 2 }); } catch { continue; }
          if (route.slice(1).reduce((sum, p, i) => sum + gap(p, route[i]), 0) > 2.5) continue;
          await walk(spec.label + ' camera sidestep', route, sample, { minimumDistance: 1 });
          sideRoute = route;
          view = await orbit();
          if (view) break;
          await walk(spec.label + ' camera sidestep return', [...route].reverse(), sample, { minimumDistance: 1 }); sideRoute = null;
        }
      }
      try {
        row.cameraTrials ??= []; row.cameraTrials.push({ label, departure, position: position(), trials, sidestep: sideRoute });
        verify(!!view, spec.label + ' ' + label + ' has an unobstructed actual body view');
        row.views.push(view); await capture(spec.zone + '-' + label);
      } finally {
        if (sideRoute) await walk(spec.label + ' camera sidestep return', [...sideRoute].reverse(), sample, { minimumDistance: 1 });
      }
    };
    await photograph('approach');
    await waitGame(8, sample);
    await photograph('response');
    const animal = observe(spec.id);
    views[spec.zone] = { position: position(), toward: { x: animal.x, z: animal.z }, eye: 1.7, animal: spec.id };
    if (spec.zone === 'navarth-wood-deer') {
      const trees = h.world.treeRegistry.trees.filter(tree => h.world.regionAt(tree.x, tree.z).id === 39);
      row.nearestTree = trees.map(tree => ({ id: tree.id, x: tree.x, z: tree.z, distance: gap(tree, initial) })).sort((a, b) => a.distance - b.distance)[0] ?? null;
    } else {
      const body = bodyView(spec.zone, spec.id), bodyHeight = body.body ? Math.max(.25, body.body.y - observe(spec.id).y) : .45;
      row.shade = zone.sites.map(([x, z]) => shadeAt({ x, z }, bodyHeight));
    }
    await walk(spec.label + ' return', [...selected].reverse(), sample);
    verify(gap(position(), selected[0]) < .5, spec.label + ' returns along the same ordinary ground');
    verify(row.views.every(view => view.visible && view.inFrustum && view.sight?.clear), spec.label + ' both live body views are in frame and clear of actual scenery');
    verify(row.maxDisplacement > 3 && row.actions.some(action => ['flee', 'fly', 'withdraw', 'yield'].includes(action)), spec.label + ' responds to the actual approaching traveler');
    if (spec.zone === 'navarth-wood-deer') verify(row.nearestTree && row.nearestTree.distance < 35, 'Navarth woodland deer is encountered beside actual registered woodland');
    if (row.shade) verify(row.shade.every(site => site.covered > 0), 'Every ghubr home patch has actual scrub shade at body height within its stated five metres');
  });
  await run('Final native state', async () => {
    verify(same(identityBefore, identities(fauna().filter(a => ['Navarth', 'Ganesh Desert', 'Marosh', 'Trogo'].includes(a.region)))),
      'The native journeys preserve all existing regional fauna identities');
    verify(state().frameErrors.count === 0, 'R4/R7 native journeys introduce no renderer frame errors');
  });
  result.ok = failures.length === 0; result.evidence = h.evidence(); result.loading = h.world.loading?.state() ?? null;
  window.__r4R7JourneyEvidence = result;
  console.log('R4_R7_JOURNEY_RESULT ' + JSON.stringify(result));
  if (failures.length) throw new Error('R4/R7 native review found: ' + JSON.stringify(failures));
  return result;
}

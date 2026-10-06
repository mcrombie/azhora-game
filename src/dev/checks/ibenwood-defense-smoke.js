import { IBENWOOD_BOUNDARY, boundaryDepth } from '../../content/regions/ibenwood/ibenwood-boundary.js';
import { canStand } from '../../gameplay/movement/game-state.js';
import { forestLineClear, forestSegmentHit } from '../../gameplay/combat/forest-sightline.js';

/** Real-world defense checks. Host/player references survive the session-slot
 * checkpoint reload. Route simulation uses real collision and the host's actual
 * LOS callback; only elapsed walking time is accelerated, at 1.2 metres/second.
 */
export async function runIbenwoodDefenseChecks(h) {
  const checks = [], metrics = {}, started = performance.now(), host = h.host, world = h.world;
  const check = (ok, label) => {
    if (!ok) {
      const progress = { phase, checks: [...checks], metrics, elapsedMs: performance.now() - started };
      const error = new Error(`Ibenwood defense: ${label}\nProgress: ${JSON.stringify(progress)}`);
      Object.assign(error, progress); throw error;
    }
    checks.push(label);
  };
  const ground = p => ({ x: p.x, y: world.heightAt(p.x, p.z), z: p.z });
  const gap = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
  const depth = p => boundaryDepth(p.x, p.z);
  const hp = () => h.combat.state.player.hp;
  const position = () => h.player.group.position;
  const standable = p => canStand(p.x, p.z, world, .34, world.heightAt(p.x, p.z))
    && world.heightAt(p.x, p.z) >= (world.waterAt?.(p.x, p.z) ?? -Infinity);
  const canStep = (a, b) => {
    const n = Math.max(1, Math.ceil(gap(a, b) / .35)); let previous = ground(a);
    for (let i = 1; i <= n; i++) {
      const t = i / n, p = ground({ x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t });
      if (!standable(p) || Math.abs(p.y - previous.y) > .4) return false;
      previous = p;
    }
    return true;
  };
  const clear = (a, b) => forestLineClear(world, a, b);
  const chest = p => ({ ...ground(p), y: world.heightAt(p.x, p.z) + 1 });
  const eye = p => ({ ...ground(p), y: world.heightAt(p.x, p.z) + 1.5 });
  const frame = (dt, p, options = {}) => host.frame(dt, { position: ground(p), sneaking: false,
    taught: false, stealthLevel: 1, disabled: false, ...options });
  const normalBefore = h.normalSaved(), originalFire = host.arrows.fire, shots = [];
  let phase = 'setup';
  host.arrows.fire = function(shot) {
    const bow = host.view.bowOrigin(shot.rangerId);
    shots.push({ phase, rangerId: shot.rangerId, origin: { ...shot.origin }, target: { ...shot.target },
      bowGap: bow ? Math.hypot(bow.x - shot.origin.x, bow.y - shot.origin.y, bow.z - shot.origin.z) : null });
    return originalFire.call(host.arrows, shot);
  };
  try {
    h.enter(); await h.frames(2); host.setTestingDisabled(true); host.reset({ fresh: true });
    check(h.state().testingEnabled, 'Defense checks use the isolated testing session');
    check(h.skills.taught('stealth') && h.skills.level('stealth') >= 70,
      'The real Elfland testing button teaches and prepares level-70 stealth');
    check(host.posts.length > 0 && host.posts.length <= 90, 'Actual grounded ranger posts exist');
    metrics.postCount = host.posts.length; metrics.markers = host.markers.length; metrics.signCount = host.view.signs.length;
    const fresh = host.snapshot(), healthy = hp();
    const reset = () => { host.restore(fresh); h.combat.state.player.hp = healthy; };
    const place = p => { h.warp(ground(p)); return frame(0, p); };
    let fixture = null;
    for (const post of host.posts) {
      const to = post.patrol.find(p => gap(p, post) > .1), length = to ? gap(to, post) : 1;
      const directions = [to ? { x: (to.x - post.x) / length, z: (to.z - post.z) / length } : null,
        { x: Math.sin(post.yaw), z: Math.cos(post.yaw) }].filter(Boolean);
      for (const direction of directions) for (const distance of [8, 6, 10]) {
        const p = ground({ x: post.x + direction.x * distance, z: post.z + direction.z * distance });
        if (depth(p) < 2 || !standable(p) || !clear(eye(post), chest(p))) continue;
        reset(); place(p);
        const sight = frame(.05, p).actors.find(a => a.id === post.id);
        if (!sight?.visible) continue;
        const bow = host.view.bowOrigin(post.id);
        if (bow && clear(bow, chest(p))) { fixture = { post, target: p }; break; }
      }
      if (fixture) break;
    }
    check(!!fixture, 'A standable interior target has an unobstructed real ranger sightline and bow trajectory');
    const actor = host.view.actorFor(fixture.post.id);
    check(!!actor?.group.visible && !!actor.group.getObjectByName('Head')?.userData.elven,
      'The grounded ranger has a rendered elven actor with pointed-ear anatomy');
    check(Math.abs(actor.group.position.y - world.heightAt(actor.group.position.x, actor.group.position.z)) < .08,
      'The ranger actor stands on the actual ground');
    metrics.shotFixture = { post: fixture.post.id, target: fixture.target };

    const outerCandidates = host.markers.flatMap(m => [m, { x: m.x - m.nx * 6, z: m.z - m.nz * 6 }])
      .filter(p => depth(p) < -6 && standable(p)).sort((a, b) => gap(a, fixture.post) - gap(b, fixture.post));
    check(outerCandidates.length > 0, 'A grounded outer-forest warning approach exists');
    const outside = ground(outerCandidates[0]);
    reset(); place(outside); phase = 'outside'; const outsideHp = hp(), outsideShots = shots.length;
    for (let i = 0; i < 40; i++) frame(.1, outside);
    check(shots.length === outsideShots && hp() === outsideHp && !host.state().inside,
      'Standing outside the territorial boundary causes neither arrows nor damage');

    reset(); place(fixture.target); phase = 'paused';
    const bow = host.view.bowOrigin(fixture.post.id);
    host.arrows.fire({ rangerId: fixture.post.id, origin: { x: bow.x, y: bow.y, z: bow.z },
      target: { x: bow.x, y: bow.y + 8, z: bow.z }, damage: 1 });
    const pausedActors = JSON.stringify(host.snapshot()), pausedArrows = JSON.stringify(host.arrows.state()), pausedHp = hp();
    for (let i = 0; i < 12; i++) frame(.1, fixture.target, { paused: true });
    check(JSON.stringify(host.snapshot()) === pausedActors && JSON.stringify(host.arrows.state()) === pausedArrows && hp() === pausedHp,
      'Pause freezes patrol state, airborne arrows and player health');

    reset(); let cover = null; phase = 'cover';
    for (const post of host.posts) {
      if (cover) break;
      const trees = (world.nearColliders?.(post.x, post.z, 26, []) ?? world.colliders)
        .filter(c => c.kind === 'tree' && c.r >= .65 && gap(c, post) > 4 && gap(c, post) < 24);
      for (const tree of trees) {
        const distance = gap(tree, post), dx = (tree.x - post.x) / distance, dz = (tree.z - post.z) / distance;
        const p = ground({ x: tree.x + dx * (tree.r + 2), z: tree.z + dz * (tree.r + 2) });
        if (!standable(p) || depth(p) < 2) continue;
        place(p); const origin = host.view.bowOrigin(post.id);
        if (!origin || clear(eye(post), chest(p))) continue;
        const hit = forestSegmentHit(world, origin, chest(p), { radius: .06 });
        if (hit?.kind === 'tree') { cover = { post, target: p, origin: { x: origin.x, y: origin.y, z: origin.z }, tree: hit.collider.id }; break; }
      }
    }
    check(!!cover, 'An actual forest tree interrupts a grounded ranger-to-player shot');
    const coveredHp = hp();
    host.arrows.fire({ rangerId: cover.post.id, origin: cover.origin, target: chest(cover.target), damage: 30 });
    for (let i = 0; i < 30 && host.arrows.state().length; i++) host.arrows.update(.05);
    check(host.arrows.state().length === 0 && hp() === coveredHp, 'The swept real arrow hits tree cover before the player');
    metrics.treeCover = { post: cover.post.id, tree: cover.tree, position: cover.target };

    reset(); place(fixture.target); phase = 'real-shot'; host.setTestingDisabled(false);
    const beforeShotHp = hp(); let drawn = false, airborne = false, shotFrames = 0;
    const shotDeadline = performance.now() + 60000;
    while (hp() === beforeShotHp && shotFrames < 120 && performance.now() < shotDeadline) {
      await h.frames(1);
      shotFrames++;
      drawn ||= host.state().actors.some(a => a.drawing || a.draw > 0);
      airborne ||= host.arrows.state().length > 0;
    }
    host.setTestingDisabled(true);
    const realShots = shots.filter(s => s.phase === 'real-shot');
    metrics.projectile = { drawSeen: drawn, airborneSeen: airborne, shots: realShots.length, damage: beforeShotHp - hp(), frames: shotFrames,
      observedAverageFrameMs: h.state().averageFrameMs,
      actors: host.state().actors.filter(a => a.id === fixture.post.id).map(a => ({ id: a.id, hp: a.hp,
        suspicion: a.suspicion, detected: a.detected, visible: a.visible, draw: a.draw, cooldown: a.cooldown })) };
    check(drawn && realShots.length > 0, 'An unauthorized visible intruder triggers a real draw and release in the game loop');
    check(realShots.every(s => s.bowGap !== null && s.bowGap < .02), 'Released arrows originate at the rendered bow grip');
    check(hp() < beforeShotHp, 'A real airborne arrow reaches the player and deals combat damage');

    // Find a real walkable crossing. Route choice cannot turn off lineClear or
    // grant admission, and each attempted controller run begins with living guards.
    phase = 'stealth'; reset();
    const routeStarted = performance.now(), contourMarkers = IBENWOOD_BOUNDARY.markers.filter(m => m.kind === 'perimeter');
    const candidates = [...IBENWOOD_BOUNDARY.approaches,
      ...Array.from({ length: 12 }, (_, i) => contourMarkers[Math.floor(i * contourMarkers.length / 12)])];
    let success = null, successfulRoute = null, attempts = 0;
    for (const anchor of candidates) {
      if (performance.now() - routeStarted > 18000) break;
      const route = walkingRoute(anchor, host.posts, standable, canStep, depth);
      if (!route) continue;
      attempts++; reset(); place(route[0]);
      const firstShot = shots.length; let detected = false, travelled = 0, maximumSuspicion = 0;
      host.model.update(0, { position: ground(route[0]), sneaking: true, taught: true, stealthLevel: 70, disabled: false });
      for (let i = 1; i < route.length && !detected; i++) {
        const a = route[i - 1], b = route[i], length = gap(a, b), steps = Math.ceil(length / .24);
        for (let j = 1; j <= steps; j++) {
          const t = j / steps, p = ground({ x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t });
          h.player.group.position.set(p.x, p.y, p.z);
          const state = host.model.update(length / steps / 1.2, { position: p, sneaking: true, taught: true, stealthLevel: 70, disabled: false });
          travelled += length / steps; maximumSuspicion = Math.max(maximumSuspicion, state.suspicion);
          if (state.detected || shots.length !== firstShot) { detected = true; break; }
        }
      }
      if (!detected && depth(position()) >= 55 && shots.length === firstShot) {
        successfulRoute = route;
        success = { attempts, metres: travelled, startDepth: depth(route[0]), endDepth: depth(position()), maximumSuspicion,
          position: { x: position().x, y: position().y, z: position().z }, points: route.length, level: 70, admitted: false };
        break;
      }
    }
    metrics.stealth = { ...(success ?? { attempts }), simulationMs: performance.now() - routeStarted };
    check(!!success, `A level-70 unauthorized walker crosses the actual defended belt undetected (${attempts} real routes tried)`);
    check(success.startDepth < 0 && success.endDepth >= 55 && success.metres > 65,
      'The successful stealth route crosses the border and passes the patrol belt toward the forest heart');

    // Replay the identical crossing and timing from the same fresh guard snapshot.
    // Only proficiency changes; this walker still knows the skill and is sneaking.
    phase = 'stealth-baseline'; reset(); place(successfulRoute[0]);
    const baselineStarted = performance.now(), baselineFirstShot = shots.length;
    let baselineDetected = false, baselineMetres = 0, baselineSuspicion = 0;
    host.model.update(0, { position: ground(successfulRoute[0]), sneaking: true, taught: true, stealthLevel: 1, disabled: false });
    for (let i = 1; i < successfulRoute.length && !baselineDetected; i++) {
      const a = successfulRoute[i - 1], b = successfulRoute[i], length = gap(a, b), steps = Math.ceil(length / .24);
      for (let j = 1; j <= steps; j++) {
        const t = j / steps, p = ground({ x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t });
        h.player.group.position.set(p.x, p.y, p.z);
        const state = host.model.update(length / steps / 1.2, { position: p, sneaking: true, taught: true, stealthLevel: 1, disabled: false });
        baselineMetres += length / steps; baselineSuspicion = Math.max(baselineSuspicion, state.suspicion);
        if (state.detected) { baselineDetected = true; break; }
      }
    }
    metrics.stealthBaseline = { level: 1, taught: true, sneaking: true, sameRoute: true, speed: 1.2,
      detected: baselineDetected, metres: baselineMetres, maximumSuspicion: baselineSuspicion,
      startDepth: depth(successfulRoute[0]), endDepth: depth(position()), shots: shots.length - baselineFirstShot,
      position: { x: position().x, y: position().y, z: position().z }, points: successfulRoute.length,
      simulationMs: performance.now() - baselineStarted };
    check(baselineDetected, 'A level-1 sneaking walker is detected on the identical route that level-70 stealth crossed unseen');

    // Check real checkpoint plumbing last, including dead and wounded records.
    reset(); place(outside); phase = 'persistence';
    const killed = fixture.post.id, wounded = [...host.posts].filter(p => p.id !== killed)
      .sort((a, b) => gap(a, fixture.post) - gap(b, fixture.post))[0].id;
    check(host.damage(killed, 10000).killed && host.damage(wounded, 37).ok, 'Rangers accept lethal and partial counterattack damage');
    const expected = host.snapshot().actors.filter(row => [killed, wounded].includes(row[0])).map(row => [row[0], row[1]]);
    check(h.save(), 'The session checkpoint saves wounded and dead ranger state');
    host.reset({ fresh: true });
    check(h.reload(), 'The real session checkpoint reloads ranger state');
    host.setTestingDisabled(true); place(outside);
    for (let i = 0; i < 10; i++) frame(.1, outside);
    const actual = host.snapshot().actors.filter(row => [killed, wounded].includes(row[0])).map(row => [row[0], row[1]]);
    check(JSON.stringify(actual) === JSON.stringify(expected) && !host.bodies().some(b => b.id === killed),
      'Dead rangers stay dead and wounds survive reload without respawning');
    check(h.normalSaved() === normalBefore, 'Defense testing and checkpoint reload leave the normal saved game unchanged');
    check(!h.state().frameErrors?.count, 'No renderer frame errors during defense checks');
    metrics.persistence = { killed, wounded, health: actual };
    metrics.elapsedMs = performance.now() - started;
    return { ok: true, checks, metrics };
  } finally {
    host.arrows.fire = originalFire;
    host.setTestingDisabled(false);
  }
}

// Bounded local A*: terrain/collider feasibility, no magic passage through trees.
// Guards influence route choice, but only the real controller decides detection.
function walkingRoute(anchor, posts, standable, canStep, depth) {
  const border = anchor.boundary, nx = anchor.nx, nz = anchor.nz, tx = -nz, tz = nx;
  const step = 2, half = 14, last = 48, nodes = new Map();
  function node(i, j) {
    const key = `${i},${j}`;
    if (!nodes.has(key)) {
      const p = { x: border.x + nx * (j * step - 16) + tx * i * step,
        z: border.z + nz * (j * step - 16) + tz * i * step };
      nodes.set(key, { ...p, i, j, key, clear: standable(p), cost: Infinity, parent: null, closed: false });
    }
    return nodes.get(key);
  }
  const starts = Array.from({ length: half * 2 + 1 }, (_, i) => node(i - half, 0)).filter(p => p.clear && depth(p) < -5)
    .sort((a, b) => Math.abs(a.i) - Math.abs(b.i));
  if (!starts.length) return null;
  const start = starts[0], open = [start]; start.cost = 0; start.score = last;
  const steps = [[0, 1], [1, 1], [-1, 1], [1, 0], [-1, 0], [0, -1], [1, -1], [-1, -1]];
  for (let count = 0; open.length && count < 1800; count++) {
    let best = 0; for (let i = 1; i < open.length; i++) if (open[i].score < open[best].score) best = i;
    const at = open.splice(best, 1)[0]; if (at.closed) continue; at.closed = true;
    if (at.j >= 38 && depth(at) >= 55) {
      const route = []; let p = at; while (p) { route.push({ x: p.x, z: p.z }); p = p.parent; }
      return route.reverse();
    }
    for (const [di, dj] of steps) {
      const i = at.i + di, j = at.j + dj;
      if (Math.abs(i) > half || j < 0 || j > last) continue;
      const next = node(i, j);
      if (next.closed || !next.clear || !canStep(at, next)) continue;
      let exposure = 0;
      for (const post of posts) {
        const dx = next.x - post.x, dz = next.z - post.z, distance = Math.hypot(dx, dz);
        if (distance < 5) { exposure += 100; continue; }
        if (distance < 32 && (dx * Math.sin(post.yaw) + dz * Math.cos(post.yaw)) / distance > .6) exposure += .8;
      }
      const cost = at.cost + Math.hypot(di, dj) + exposure;
      if (cost >= next.cost) continue;
      next.cost = cost; next.parent = at; next.score = cost + Math.max(0, 38 - j);
      open.push(next);
    }
  }
  return null;
}

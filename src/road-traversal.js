import { canStand } from './game-state.js';

// Exercise the actual keyboard, camera-relative movement, collision and render
// loop. The harness prepares progress and the starting position; this module
// never teleports, edits movement speed, or changes quest/physics state.
export async function runRoadTraversal(h) {
  const { world, player, press, release, frames, setYaw, readState } = h;
  const assert = (condition, message) => { if (!condition) throw new Error(`Road traversal: ${message}`); };
  assert(world?.routeJourney?.length > 1, 'the road out of Drent is missing');
  for (const [name, hook] of Object.entries({ press, release, frames, setYaw, readState }))
    assert(typeof hook === 'function', `${name} hook is missing`);
  const position = () => player?.group?.position || player?.position || player;
  const copyPosition = () => ({ x: position().x, z: position().z });
  const initial = copyPosition();
  // Out along the main road to the Legion camp, with the Suval branch walked
  // from its junction, so every one of the four regions is entered on foot.
  const junction = (world.suvalRoute ?? [])[0];
  const mainRoad = world.routeJourney.map(point => ({ x: point.x, z: point.z }));
  const suvalRoad = (world.suvalRoute ?? []).map(point => ({ x: point.x, z: point.z }));
  const branchAt = junction ? mainRoad.findIndex(point => Math.hypot(point.x - junction.x, point.z - junction.z) < 1) : -1;
  const road = branchAt >= 0
    ? [...mainRoad.slice(0, branchAt + 1), ...suvalRoad.slice(1), ...suvalRoad.slice(0, -1).reverse(), ...mainRoad.slice(branchAt + 1)]
    : mainRoad;
  assert(road.every(point => Number.isFinite(point.x) && Number.isFinite(point.z)), 'road contains invalid coordinates');
  assert(canStand(initial.x, initial.z, world), 'starting position is blocked');

  const regionSamples = new Map(), enteredRegions = new Set();
  let walkedMeters = 0, traversalChecks = 1, recordedFrames = 0;
  let held = false, heldStarted = 0, heldKeyMs = 0, intervalStarted = performance.now();
  let previousPosition = copyPosition(), previousState = await readState();
  assert(previousState.mode === 'playing', `expected normal play, got ${previousState.mode}`);
  const initialRenderFrame = previousState.frames;
  const runStarted = performance.now();

  function holdRun() {
    if (held) return;
    press('ShiftLeft'); press('KeyW'); held = true; heldStarted = performance.now();
    intervalStarted = performance.now(); previousPosition = copyPosition();
  }
  function stopRun() {
    release('KeyW'); release('ShiftLeft');
    if (held) heldKeyMs += performance.now() - heldStarted;
    held = false;
  }
  async function recordFrame({ allowStationary = false } = {}) {
    await frames(1);
    const now = performance.now(), current = copyPosition(), state = await readState();
    assert(state.mode === 'playing', `play interrupted by ${state.mode}`);
    assert(Number.isFinite(current.x) && Number.isFinite(current.z), 'position became invalid');
    const frameDelta = Number.isFinite(state.frames) && Number.isFinite(previousState.frames)
      ? state.frames - previousState.frames : 1;
    assert(frameDelta >= 1, 'the frame waiter returned before the game rendered');
    const distance = Math.hypot(current.x - previousPosition.x, current.z - previousPosition.z);
    // Actual gameplay caps simulation steps at 50 ms. This catches an accidental
    // harness warp while allowing normal scheduling jitter and batched waits.
    assert(distance <= frameDelta * 7.2 * .05 + .12, `unexpected movement jump of ${distance.toFixed(2)} m over ${frameDelta} frame(s)`);
    if (recordedFrames % 5 === 0 || allowStationary) {
      assert(canStand(current.x, current.z, world), `walk entered a collider or left the map at ${current.x.toFixed(2)}, ${current.z.toFixed(2)}`);
      traversalChecks++;
    }
    const region = world.regionAt(current.x, current.z);
    let sample = regionSamples.get(region.id);
    if (!sample) {
      sample = { id: region.id, name: region.name, frames: 0, observations: 0, wallMs: 0,
        minFrameMs: Infinity, maxFrameMs: 0, walkedMeters: 0 };
      regionSamples.set(region.id, sample);
    }
    const wallMs = now - intervalStarted, observedFrameMs = wallMs / frameDelta;
    sample.frames += frameDelta; sample.observations++; sample.wallMs += wallMs;
    sample.minFrameMs = Math.min(sample.minFrameMs, observedFrameMs);
    sample.maxFrameMs = Math.max(sample.maxFrameMs, observedFrameMs);
    sample.walkedMeters += distance; walkedMeters += distance; recordedFrames += frameDelta;
    previousPosition = current; previousState = state; intervalStarted = now;
    let pausedMs = 0;
    if (!enteredRegions.has(region.id)) {
      enteredRegions.add(region.id);
      if (h.onRegion) {
        const pauseStarted = performance.now();
        const wasHeld = held; stopRun();
        await h.onRegion(region.id);
        previousState = await readState(); previousPosition = copyPosition();
        intervalStarted = performance.now();
        if (wasHeld) holdRun();
        pausedMs = performance.now() - pauseStarted;
      }
    }
    return { current, distance, frameDelta, state, pausedMs };
  }

  async function walkTo(target, label) {
    let nearest = Math.hypot(position().x - target.x, position().z - target.z);
    // The road's longest leg is now a couple of hundred metres, so the limit is
    // the run time that leg needs with room to spare, never less than 30 s.
    const budgetMs = Math.max(30000, nearest / 7.2 * 1000 * 2.5 + 10000);
    let lastProgress = performance.now(), deadline = lastProgress + budgetMs;
    while (Math.hypot(position().x - target.x, position().z - target.z) > .8) {
      const now = performance.now();
      assert(now < deadline, `${Math.round(budgetMs / 1000)}-second limit reaching ${label} (${position().x.toFixed(2)}, ${position().z.toFixed(2)})`);
      assert(now - lastProgress < 5000, `stuck on the way to ${label}; ${nearest.toFixed(2)} m remains`);
      const dx = target.x - position().x, dz = target.z - position().z;
      setYaw(Math.atan2(-dx, -dz)); holdRun();
      const result = await recordFrame();
      const remaining = Math.hypot(result.current.x - target.x, result.current.z - target.z);
      if (remaining < nearest - .025) { nearest = remaining; lastProgress = performance.now(); }
      else lastProgress += result.pausedMs;
      // A screenshot callback intentionally pauses held input; its time is not
      // a movement timeout or a frame observation.
      deadline += result.pausedMs;
    }
    assert(canStand(position().x, position().z, world), `arrival at ${label} is blocked`);
    traversalChecks++;
  }

  try {
    for (let i = 0; i < road.length; i++) await walkTo(road[i], `outbound road point ${i + 1}`);

    // The visible rope stands a little inside the hard map bounds at the western
    // end of the Moros. Push into that real collider, then hold west for 20
    // stationary frames.
    const frontier = world.colliders.find(collider => collider.kind === 'frontier'
      && Math.abs(collider.z - position().z) < (collider.hz ?? collider.r ?? 0));
    const legalEdge = world.bounds.minX + .34;
    const stopEdge = frontier ? Math.max(legalEdge, frontier.x + (frontier.hx ?? frontier.r ?? 0) + .34) : legalEdge;
    let stationaryFrames = 0, stoppedAt = null, edgeDeadline = performance.now() + 15000;
    setYaw(Math.PI / 2); holdRun();
    while (stationaryFrames < 20) {
      assert(performance.now() < edgeDeadline, 'the western frontier did not stop movement');
      const { current, distance, frameDelta } = await recordFrame({ allowStationary: true });
      assert(current.x >= legalEdge - .002, 'crossed the hard western map boundary');
      if (distance < .002) {
        if (stoppedAt === null) stoppedAt = current.x;
        stationaryFrames += frameDelta;
        assert(Math.abs(current.x - stoppedAt) < .002, 'moved through the frontier while continuing to hold west');
      } else { stationaryFrames = 0; stoppedAt = null; }
    }
    assert(Math.abs(position().x - stopEdge) < .25, `stopped at ${position().x.toFixed(2)} before reaching the marked frontier ${stopEdge.toFixed(2)}`);
    traversalChecks += 2;
    stopRun();
    const rested = copyPosition(); await frames(3);
    assert(Math.hypot(position().x - rested.x, position().z - rested.z) < .002, 'releasing movement keys did not stop travel');
    previousState = await readState(); intervalStarted = performance.now(); previousPosition = copyPosition();
    traversalChecks++;

    for (let i = road.length - 1; i >= 0; i--) await walkTo(road[i], `homebound road point ${i + 1}`);
    await walkTo(initial, 'the Drent starting point');
    stopRun();
    const finalState = await readState();
    const returnedToEastreena = world.regionAt(position().x, position().z).id === 1;
    assert(returnedToEastreena, 'the return journey did not re-enter Drent');
    assert([2, 3, 4].every(id => enteredRegions.has(id)), 'the trip skipped one of Luscia, the Moros or East Suval');
    assert(walkedMeters > 1000, `only ${walkedMeters.toFixed(1)} m was recorded for the full return journey`);
    assert(walkedMeters <= heldKeyMs / 1000 * 7.2 + 1, 'distance exceeds the real time spent holding run');
    assert(!Number.isFinite(initialRenderFrame) || finalState.frames > initialRenderFrame + 1000,
      'the trip did not exercise enough actual gameplay frames');
    traversalChecks += 5;
    return {
      traversalChecks, walkedMeters: Math.round(walkedMeters * 10) / 10,
      elapsedSeconds: Math.round((performance.now() - runStarted) / 100) / 10,
      heldRunSeconds: Math.round(heldKeyMs / 100) / 10,
      recordedFrames, returnedToEastreena, frontierBlocked: true,
      regionSamples: [...regionSamples.values()].map(sample => ({
        id: sample.id, name: sample.name, frames: sample.frames, observations: sample.observations,
        minFrameMs: Math.round(sample.minFrameMs * 10) / 10,
        meanFrameMs: Math.round(sample.wallMs / sample.frames * 10) / 10,
        maxFrameMs: Math.round(sample.maxFrameMs * 10) / 10,
        walkedMeters: Math.round(sample.walkedMeters * 10) / 10,
      })),
      timingNote: 'Observed wall-clock render intervals during an automated keyboard traversal, including harness overhead and machine load. Multi-frame waits are normalized by rendered frame count; these figures are not an FPS benchmark.',
    };
  } finally {
    try { release('KeyW'); } finally { release('ShiftLeft'); }
  }
}

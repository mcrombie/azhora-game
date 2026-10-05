/** Cooperative region construction. A job must yield between small pieces of work:
 * the budget cannot interrupt a single expensive iterator.next() call. */
export function createRegionLoading({ initialRegions = [], regionAt = () => null,
  regionCenters = {}, adjacency = {}, budgetMs = 4, nearbyOnly = false, lookAhead = 240,
  requestFrame = callback => requestAnimationFrame(callback), cancelFrame = id => cancelAnimationFrame(id),
  now = () => performance.now(), onComplete = () => {}, onError = () => {} } = {}) {
  const jobs = new Map(), byRegion = new Map(), initial = new Set(initialRegions), requested = new Set(), waiters = new Map();
  let active = null, running = false, frame = null, revision = 0, position = null, region = null, heading = null;
  let longestSliceMs = 0, preloadAll = !nearbyOnly, priorities = new Map(), dirty = true, lastFrame = null, frameGap = 0;
  let wanted = new Set(initialRegions), lastPosition = null, plannedHeading = null;
  let totalTickMs = 0, longestTickMs = 0, ticks = 0;
  const identity = value => value && typeof value === 'object' ? value.id : value;
  const lookup = (source, key) => source instanceof Map ? source.get(key) : source?.[key];
  const regionJobs = id => byRegion.get(id) ?? [];
  const isReady = value => {
    const id = identity(value), relevant = regionJobs(id);
    return relevant.length ? relevant.every(job => job.status === 'ready') : initial.has(id);
  };
  function settle() {
    for (const [id, list] of waiters) {
      const failed = regionJobs(id).find(job => job.status === 'failed');
      if (!failed && !isReady(id)) continue;
      for (const waiter of list) failed ? waiter.reject(failed.error) : waiter.resolve(state());
      waiters.delete(id); requested.delete(id); dirty = true;
    }
  }
  function plan() {
    if (!dirty) return;
    dirty = false; priorities = new Map();
    wanted = new Set(region == null ? initial : [region]);
    for (const id of lookup(adjacency, region) ?? []) wanted.add(id);
    if (position && heading) for (const fraction of [.25, .5, 1]) {
      const id = identity(regionAt(position.x + heading.x * lookAhead * fraction, position.z + heading.z * lookAhead * fraction));
      if (id != null) wanted.add(id);
    }
    const promote = (job, priority, seen = new Set()) => {
      if (!job || seen.has(job.id)) return;
      seen.add(job.id);
      priorities.set(job.id, Math.min(priorities.get(job.id) ?? Infinity, priority));
      for (const id of job.dependencies) promote(jobs.get(id), priority, seen);
    };
    for (const job of jobs.values()) {
      let distance = Infinity;
      for (const id of job.regions) {
        const center = job.center ?? lookup(regionCenters, id);
        if (position && center) distance = Math.min(distance, Math.hypot(center.x - position.x, center.z - position.z));
      }
      const priority = job.regions.some(id => requested.has(id)) ? -1e12
        : job.regions.includes(region) ? -1e11
        : job.regions.some(id => wanted.has(id)) ? -1e8 + (Number.isFinite(distance) ? distance : job.order)
        : preloadAll ? (Number.isFinite(distance) ? distance : job.order) : Infinity;
      if (priority !== Infinity) promote(job, priority);
    }
  }
  const unfinished = job => job.status === 'pending' || job.status === 'loading';
  const eligible = job => unfinished(job) && priorities.has(job.id);
  function choose() {
    plan();
    let next = null;
    for (const job of jobs.values()) if (eligible(job) && dependenciesReady(job)) {
      if (!next || priorities.get(job.id) < priorities.get(next.id)
        || priorities.get(job.id) === priorities.get(next.id) && job.order < next.order) next = job;
    }
    return next;
  }
  function dependenciesReady(job) { return job.dependencies.every(id => jobs.get(id)?.status === 'ready'); }
  function fail(job, cause) {
    job.status = 'failed'; job.error = cause instanceof Error ? cause : new Error(String(cause));
    active = null;
    try { onError(job.error, job.id); } catch { /* Reporting cannot strand the queue. */ }
    settle();
  }
  function schedule() {
    plan();
    if (running && frame === null && [...jobs.values()].some(eligible))
      frame = requestFrame(tick);
  }
  function tick() {
    frame = null;
    if (!running) return;
    const started = now();
    frameGap = lastFrame == null ? 0 : started - lastFrame; lastFrame = started;
    const allowance = nearbyOnly && requested.size ? Math.max(8,budgetMs) : nearbyOnly && frameGap > 30 ? Math.min(.75, budgetMs) : budgetMs;
    // Iterators yield without holding global state; an explicit destination can
    // therefore interrupt a background build at its next safe yield.
    if (choose() !== active) active = null;
    do {
      if (!active) {
        for (const job of jobs.values()) if (eligible(job)) {
          const failed = job.dependencies.map(id => jobs.get(id)).find(dependency => dependency?.status === 'failed');
          if (failed) fail(job, new Error(`${job.id} depends on failed region job ${failed.id}`, { cause: failed.error }));
        }
        active = choose();
        if (!active) {
          // All remaining dependencies are absent or cyclic; never spin an
          // animation frame forever while travel awaits an impossible region.
          for (const job of jobs.values()) if (eligible(job)) fail(job, new Error(`Unresolved dependencies for region job ${job.id}`));
          break;
        }
        active.status = 'loading';
        try {
          active.iterator ??= active.steps();
          if (!active.iterator || typeof active.iterator.next !== 'function') throw new Error(`Region job ${active.id} did not return an iterator`);
        } catch (error) { fail(active, error); continue; }
      }
      const job = active, stepStart = now();
      try {
        const step = job.iterator.next();
        if (step && typeof step.then === 'function') throw new Error(`Region job ${job.id} must use a synchronous generator`);
        if (step.done) {
          job.onComplete?.(step.value);
          job.status = 'ready'; active = null; revision++;
          onComplete({ id: job.id, regions: [...job.regions], value: step.value, revision });
          settle();
        }
      } catch (error) { fail(job, error); }
      finally {
        const elapsed = Math.max(0, now() - stepStart);
        longestSliceMs = Math.max(longestSliceMs, elapsed);
        job.longestSliceMs = Math.max(job.longestSliceMs, elapsed);
        job.buildMs += elapsed; job.stepsRun++;
      }
    } while (now() - started < Math.max(.1, allowance));
    const elapsed = now() - started; totalTickMs += elapsed; longestTickMs = Math.max(longestTickMs, elapsed); ticks++;
    schedule();
  }
  function register({ id, regions = [], steps, onComplete: complete, center, dependencies = [] }) {
    if (typeof id !== 'string' || !id || jobs.has(id) || typeof steps !== 'function' || !regions.length)
      throw new Error('Region jobs need a unique ID, regions, and a generator factory');
    jobs.set(id, { id, regions: [...new Set(regions.map(identity))], steps, onComplete: complete, center,
      dependencies: [...dependencies], order: jobs.size, status: 'pending', iterator: null, error: null,
      longestSliceMs: 0, buildMs: 0, stepsRun: 0 });
    for (const region of jobs.get(id).regions) {
      if (!byRegion.has(region)) byRegion.set(region, []);
      byRegion.get(region).push(jobs.get(id));
    }
    dirty = true; schedule(); return api;
  }
  function ensureRegion(value) {
    const id = identity(value);
    if (isReady(id)) return Promise.resolve(state());
    const relevant = regionJobs(id), failed = relevant.find(job => job.status === 'failed');
    if (failed) return Promise.reject(failed.error);
    if (!relevant.length) return Promise.reject(new Error(`No loading job for region ${id}`));
    requested.add(id); dirty = true;
    const result = new Promise((resolve, reject) => {
      if (!waiters.has(id)) waiters.set(id, []);
      waiters.get(id).push({ resolve, reject });
    });
    api.start(); return result;
  }
  function update(point, direction, speed = 0) {
    const previousRegion = region;
    const ahead = Math.max(240, Math.min(1600, Math.ceil(Math.abs(speed) * 8 / 100) * 100));
    if (lookAhead !== ahead) { lookAhead = ahead; dirty = true; }
    if (point && Number.isFinite(point.x) && Number.isFinite(point.z)) { position = { x: point.x, z: point.z }; region = identity(regionAt(point.x, point.z)); }
    else if (point !== undefined && point !== null) region = identity(point);
    if (Number.isFinite(direction)) heading = { x: Math.sin(direction), z: Math.cos(direction) };
    else if (direction && Number.isFinite(direction.x) && Number.isFinite(direction.z)) {
      const length = Math.hypot(direction.x, direction.z); heading = length ? { x: direction.x / length, z: direction.z / length } : null;
    }
    if (previousRegion !== region || !lastPosition || position && Math.hypot(position.x-lastPosition.x,position.z-lastPosition.z)>32
      || heading && (!plannedHeading || heading.x*plannedHeading.x+heading.z*plannedHeading.z<.9)) {
      dirty = true; lastPosition = position && {...position}; plannedHeading = heading && {...heading};
    }
    schedule(); return api;
  }
  function state() {
    plan();
    return { running, policy: preloadAll ? 'all' : 'nearby', wanted: [...wanted], idle: ![...jobs.values()].some(eligible),
      ticks, totalTickMs, longestTickMs, currentBudgetMs: nearbyOnly && requested.size ? Math.max(8,budgetMs) : nearbyOnly && frameGap > 30 ? Math.min(.75,budgetMs) : budgetMs,
      revision, currentRegion: region, active: active?.id ?? null,
      completed: [...jobs.values()].filter(job => job.status === 'ready').length,
      total: jobs.size, pending: [...jobs.values()].filter(job => job.status === 'pending').length,
      ready: [...new Set([...initial, ...[...jobs.values()].flatMap(job => job.regions)])].filter(isReady),
      jobs: [...jobs.values()].map(job => ({ id: job.id, regions: [...job.regions], status: job.status, error: job.error?.message ?? null,
        longestSliceMs: job.longestSliceMs, buildMs: job.buildMs, stepsRun: job.stepsRun })), longestSliceMs };
  }
  const api = { register, isReady, hasRegion: value => initial.has(identity(value)) || regionJobs(identity(value)).length > 0,
    ensureRegion, requireRegion: ensureRegion, update, setPosition: update, state,
    preloadAll(value = true) { preloadAll = !!value; dirty = true; schedule(); return api; },
    start() { running = true; schedule(); return api; },
    stop() { running = false; if (frame !== null) cancelFrame(frame); frame = null; return api; },
    get revision() { return revision; } };
  return api;
}

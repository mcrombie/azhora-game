/** Native checks for the experimental loading path, using the real world and renderer. */
export async function runFastLoadingChecks(h) {
  const checks = [], assert = (condition, message) => { if (!condition) throw new Error(message); checks.push(message); };
  const loader = h.world.loading;
  assert(!!loader && h.world.loadingMode === 'fast', 'Fast mode exposes the regional loading controller');
  loader.stop();
  const before = loader.state(), liveCounts = { trees: h.world.timberTrees.length, colliders: h.world.colliders.length,
    walkSurfaces: h.world.walkSurfaces.length };
  assert(loader.isReady(1), 'Drent is ready before the title screen becomes playable');
  assert(before.completed < before.total, 'Distant region construction remains queued at the first playable frame');
  h.play();
  const initial = h.read(); await h.frames(5);
  assert(h.read().frames >= initial.frames + 5, 'The player renderer advances while distant scenery is still unloaded');
  const firstPosition = h.player.group.position.clone(); h.press('KeyW'); await h.frames(12); h.release('KeyW');
  assert(h.player.group.position.distanceTo(firstPosition) > .1, 'Walking works before distant regions have loaded');
  const destination = ['Peblos', 'Pueth', 'Luscia'].map(name => h.world.regions.find(region => region.name === name))
    .find(region => region?.spawn && loader.hasRegion(region.id) && !loader.isReady(region.id))
    ?? h.world.regions.find(region => region.spawn && loader.hasRegion(region.id) && !loader.isReady(region.id));
  assert(!!destination, 'An unfinished destination is available to test travel prioritization');
  const oldPosition = h.player.group.position.clone(), count = h.read().frames;
  h.travel(destination.spawn);
  assert(h.player.group.position.distanceTo(oldPosition) < .001, 'Travel holds the player safely in the loaded region until construction finishes');
  assert(h.read().waitingForRegion, 'Unfinished destinations show a loading gate');
  await h.ready(); await h.frames(3);
  assert(loader.isReady(destination.id), 'The requested destination is finished before arrival');
  assert(Math.hypot(h.player.group.position.x - destination.spawn.x, h.player.group.position.z - destination.spawn.z) < .2,
    'Deferred travel arrives at the requested destination');
  assert(!h.read().waitingForRegion && h.read().frames > count, 'Play resumes after the destination commits');
  const dwarfInitiallyReady = loader.isReady(52);
  const dwarf = await h.dwarfAutoplay();
  assert(dwarf.ok, 'The public Dwarfland playtest can load its destination, earn entry and finish its smithing lesson');
  const backgroundFrames = h.read().frames, backgroundStarted = performance.now();
  loader.preloadAll().start();
  while (loader.state().completed < loader.state().total) {
    const failed = loader.state().jobs.filter(job => job.status === 'failed');
    if (failed.length) throw new Error('Background region construction failed: ' + JSON.stringify(failed));
    if (performance.now() - backgroundStarted > 1800000) throw new Error('Background construction exceeded thirty minutes: ' + JSON.stringify(loader.state()));
    await h.frames(5);
  }
  await h.frames(3);
  assert(loader.state().jobs.every(job => job.status === 'ready'), 'Every deferred terrain and scenery job finishes without failure');
  assert(h.world.regions.filter(region => loader.hasRegion(region.id)).every(region => loader.isReady(region.id)),
    'Every supported region becomes available after background construction');
  assert(h.read().frames > backgroundFrames, 'The renderer keeps advancing while the remaining world is completed');
  assert(h.world.timberTrees.length > liveCounts.trees && h.world.colliders.length > liveCounts.colliders,
    'Deferred forests and buildings append to the live tree and collision catalogs');
  assert(h.world.walkSurfaces.length > liveCounts.walkSurfaces, 'Deferred groves and lake-town walkways join the live surface catalog');
  const deck = h.world.walkSurfaces.find(surface => surface.kind === 'deck');
  assert(deck && h.world.supportAt((deck.a.x + deck.b.x) / 2, (deck.a.z + deck.b.z) / 2, { surfaceId: deck.id })?.id === deck.id,
    'The original supportAt function recognizes a walkway built after startup');
  assert(h.world.baldro.landmarks.length > 0 && h.world.baldro.landmarks.every(mark => h.world.landmarks.some(entry => entry.id === mark.id)),
    'Dwarven landmarks appear in the world map after their scenery loads');
  assert(h.world.ibenwoodForest.groves.length > 0 && h.world.yunethre.walkSurfaces.length === 3,
    'Late forest groves and Yunethre expose their complete scenery metadata');
  assert(h.read().frameErrors.count === 0, 'Fast startup and prioritized travel introduce no frame errors');
  return { ok: true, checks, startup: globalThis.__AZHORA_STARTUP__, before, after: loader.state(), destination: destination.name,
    dwarfInitiallyReady, dwarf, liveCounts, backgroundElapsedMs: Math.round(performance.now() - backgroundStarted),
    state: { mode: h.read().mode, frameErrors: h.read().frameErrors, position: h.read().position } };
}

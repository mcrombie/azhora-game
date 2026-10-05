/** Native regional journey review. Uses the actual travel, input, loading and checkpoint paths. */
export async function runR1JourneyChecks(h, expected = null) {
  const checks = [], assert = (ok, message) => { if (!ok) throw new Error(message); checks.push(message); };
  const loader = h.world.loading, mode = h.read().loadingMode;
  const position = () => ({ x: h.player.group.position.x, y: h.player.group.position.y, z: h.player.group.position.z });
  const gap = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
  const until = async (predicate, label, ms = 600000) => {
    const start = performance.now();
    while (!predicate()) { if (performance.now() - start > ms) throw new Error(label + ': ' + JSON.stringify(h.read().position)); await h.frames(1); }
  };
  const catalogs = () => ({ trees: h.world.timberTrees.length, colliders: h.world.colliders.length,
    walkSurfaces: h.world.walkSurfaces.length, landmarks: h.world.landmarks.length });
  const travel = async (point, label) => {
    const before = position(), id = h.world.regionAt(point.x, point.z).id, pending = loader && !loader.isReady(id);
    h.travel(point);
    if (pending) {
      assert(gap(position(), before) < .001 && h.read().waitingForRegion, label + ' holds position while construction is pending');
    }
    await h.ready(); loader?.stop(); await h.frames(2);
    assert(!loader || loader.isReady(id), label + ' finishes terrain, collision and shared jobs before arrival');
    assert(gap(position(), point) < .2 && !h.read().waitingForRegion, label + ' arrives and releases the loading gate');
    assert(Math.abs(position().y - h.world.heightAt(point.x, point.z)) < .2, label + ' stands on its actual surface');
  };
  loader?.stop();
  if (expected) {
    assert(h.resume(), 'Continue accepts the saved regional checkpoint after a fresh renderer load');
    await h.ready(); loader?.stop(); await h.frames(3);
    const saved = h.snapshot();
    assert(gap(position(), expected.position) < .2, 'Continue returns to the explicit safe cave entrance');
    assert(Math.abs(position().y - h.world.heightAt(position().x, position().z)) < .2, 'Continue restores safe surface footing');
    assert(!h.read().lotharnCave, 'Continue does not infer underground ownership from saved map coordinates');
    assert(JSON.stringify(saved.inventory) === JSON.stringify(expected.inventory), 'Continue preserves inventory without duplicate grants');
    assert(JSON.stringify(saved.woodcutting) === JSON.stringify(expected.woodcutting), 'Continue preserves saved tree state');
    if (expected.harvestedTree) assert(h.wood.tree(expected.harvestedTree)?.id === expected.harvestedTree,
      'The previously harvested Lotharn tree still resolves after the regional catalog loads');
    assert(!loader || loader.isReady(20), 'Continue waits for East Lotharn construction before releasing play');
    assert(h.read().frameErrors.count === 0, 'Reload and Continue introduce no renderer frame errors');
    return { ok: true, mode, checks, position: position(), catalogs: catalogs(), evidence: h.evidence(), loading: loader?.state() ?? null };
  }
  h.play(); loader?.stop();
  const initialLoading = loader?.state() ?? null, initialEvidence = h.evidence(), timings = {};
  if (mode === 'fast') assert(!loader.isReady(20), 'Fast begins with East Lotharn queued');
  let began = performance.now();
  await travel({ x: -1330, z: -835 }, 'Developer travel to Kemrath');
  timings.eastArrivalMs = Math.round(performance.now() - began);
  assert(h.world.lotharnCaves.length > 0 && h.world.eastLotharnMetrics.trees > 0, 'East Lotharn caves and forest metadata are ready');
  assert(h.world.colliders.some(c => c.gate === 'fort-vastos-gate'), 'The shared Vastos fort gate collider is present');
  // The shared fort job depends on both ranges. East arrival can make West ready too;
  // test that seam, then use the open Yunethre margin for a genuinely deferred border.
  const westPending = loader && !loader.isReady(27);
  await travel({ x: -1547, z: -690 }, 'Travel to the loaded side of the East/West border');
  h.face(Math.PI / 2); h.press('KeyW'); began = performance.now();
  await until(() => h.read().waitingForRegion || h.world.regionAt(position().x, position().z).id === 27,
    'Walking did not reach the East/West loading boundary', 30000);
  h.release('KeyW');
  if (westPending) {
    assert(h.read().waitingForRegion && h.world.regionAt(position().x, position().z).id === 20,
      'Walking holds the traveler on the loaded side of an unfinished border');
    await h.ready(); loader.stop();
  }
  h.press('KeyW');
  try { await until(() => position().x < -1556, 'Walking did not cross the ready West Lotharn border', 30000); }
  finally { h.release('KeyW'); }
  await h.frames(2); timings.westBorderMs = Math.round(performance.now() - began);
  assert(h.world.regionAt(position().x, position().z).id === 27 && (!loader || loader.isReady(27)),
    'Ordinary movement crosses into West Lotharn only when it is ready');
  assert(h.read().hp > 0 && !h.read().terrainFall.active, 'Border arrival has safe footing');
  await travel({ x: -2547, z: -494 }, 'Travel to the West Lotharn side of the Yunethre border');
  const yunethrePending = loader && !loader.isReady(38);
  if (mode === 'fast') assert(yunethrePending, 'Yunethre remains unfinished before the ordinary border approach');
  h.face(Math.PI / 2); h.press('KeyW'); began = performance.now();
  await until(() => h.read().waitingForRegion || h.world.regionAt(position().x, position().z).id === 38,
    'Walking did not reach the Yunethre loading boundary', 30000);
  h.release('KeyW');
  if (yunethrePending) {
    assert(h.read().waitingForRegion && h.world.regionAt(position().x, position().z).id === 27,
      'Ordinary border approach holds the traveler in West Lotharn while Yunethre builds');
    await h.ready(); loader.stop();
  }
  h.press('KeyW');
  try { await until(() => position().x < -2557, 'Walking did not enter the completed Yunethre margin', 30000); }
  finally { h.release('KeyW'); }
  await h.frames(2); timings.yunethreBorderMs = Math.round(performance.now() - began);
  assert(h.world.regionAt(position().x, position().z).id === 38 && (!loader || loader.isReady(38)),
    'Walking resumes across the border after destination construction completes');
  const vastos = h.world.regions.find(region => region.id === 11);
  await travel(vastos.spawn, 'Departure to Vastos');
  await travel({ x: -1330, z: -835 }, 'Return to Kemrath');
  const once = catalogs();
  await travel(vastos.spawn, 'Second departure to Vastos');
  await travel({ x: -1330, z: -835 }, 'Second return to Kemrath');
  assert(JSON.stringify(catalogs()) === JSON.stringify(once), 'Leaving and returning adds no duplicate trees, colliders, surfaces or landmarks');
  const chamber = h.world.lotharnCaves.find(cave => cave.id === 'eastern-chamber');
  assert(!!chamber, 'The eastern chamber retains its identity');
  const approach = chamber.at(Math.max(0, chamber.openings[0] - .1)), inside = chamber.at(chamber.openings[0] + 2);
  await travel(approach, 'Travel to the eastern chamber approach');
  h.face(Math.atan2(approach.x - inside.x, approach.z - inside.z)); h.press('KeyW');
  try { await until(() => (h.read().lotharnCave?.along ?? -1) > chamber.openings[0] + 1, 'The native traveler did not enter the chamber', 30000); }
  finally { h.release('KeyW'); }
  const legacyTree = h.wood.catalog.find(tree => tree.id.startsWith('lotharn-') && !tree.id.startsWith('lotharn-shelter-') && tree.harvestable);
  assert(!!legacyTree, 'An established Lotharn tree is available for saved harvest-state verification');
  assert(h.wood.restore({ ...h.wood.snapshot(), trees: [{ id: legacyTree.id, logsLeft: 1, stump: 0 }] }),
    'A valid previously harvested Lotharn tree record can be restored before saving');
  const cave = h.read().lotharnCave, saved = h.snapshot();
  assert(cave?.id === chamber.id && gap(saved.position, cave.safeEntrance) < .001,
    'An underground checkpoint records the explicit safe entrance');
  assert(h.persist(saved).ok, 'The isolated native checkpoint store accepts the regional save');
  assert(h.read().frameErrors.count === 0, 'Regional travel and cave entry introduce no renderer frame errors');
  return { ok: true, mode, checks, timings, initialLoading, loading: loader?.state() ?? null, catalogs: catalogs(),
    initialEvidence, evidence: h.evidence(), startup: globalThis.__AZHORA_STARTUP__,
    expected: { position: saved.position, inventory: saved.inventory, woodcutting: saved.woodcutting, harvestedTree: legacyTree.id } };
}

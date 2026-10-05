import * as THREE from 'three';
import { canStand } from './game-state.js';
import { TREE_KINDS, WOODCUTTING_SKILL, CHOP_REACH, SWING } from './woodcutting.js';
import { SKILLS } from './skills.js';
import { SOUTH_CELDER_WILDLIFE_ZONES } from './south-celder-wildlife.js';
import { NORTH_CELDER_WILDLIFE_ZONES } from './north-celder-wildlife.js';

// Reference coordinates are former missing-ground sites, not player landings.
// Travel uses the authored regional spawns; the harbor route was separately
// traversed with the production walking, collision and falling controllers.
export const REGIONAL_GROUND_CASES = Object.freeze([
  Object.freeze({ id: 2, label: 'Luscia', job: 'suvalGround', later: 5, laterJob: 'suvalHighlands',
    meshes: ['Suval switchback ground', 'Suval exposed limestone faces'],
    probes: [{ x: -499.083819, z: 597.812487 }, { x: -490.788522, z: 590.511195 }] }),
  Object.freeze({ id: 22, label: 'Gala', job: 'telemoniaGround', later: 55, laterJob: 'telemoniaScenery',
    meshes: ['Telemonia ground', 'Treloss ground'], probes: [{ x: -1841.317, z: 1417.046 },
      { x: -1808.567, z: 1290.270 }, { x: -1997.919, z: 1011.161 }] }),
  Object.freeze({ id: 28, label: 'South Mithala', job: 'westLotharnGround', later: 27, laterJob: 'westLotharn',
    meshes: ['West Lotharn summits ground'], probes: [{ x: -2032.36328125, z: -973.0420532226562 }, { x: -2036.640, z: -980.477 }] }),
]);
export const REGIONAL_GROUND_HARBOR_WALK = Object.freeze([{ x: 86, z: 1731 }, { x: 100, z: 1716 }]);
// The supplied crossing passed the combined production-controller fixture in
// both directions. Each end is a dry approach; the existing shallow bed stays.
export const REGIONAL_GROUND_CELDER_CROSSING = Object.freeze([
  Object.freeze({ x: -2141.8, z: -1205.7 }), Object.freeze({ x: -2145.8, z: -1233.4 }),
]);
const celderHomes = new Map([...SOUTH_CELDER_WILDLIFE_ZONES, ...NORTH_CELDER_WILDLIFE_ZONES]
  .flatMap(zone => zone.sites.map(([x, z], i) => [`${zone.id}-${i + 1}`, { x, z }])));
const canonical = value => Array.isArray(value) ? value.map(canonical) : value && typeof value === 'object'
  ? Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])])) : value;
const same = (a, b) => JSON.stringify(canonical(a)) === JSON.stringify(canonical(b));
const gap = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const digest = text => { let value = 2166136261; for (let i = 0; i < text.length; i++) value = Math.imul(value ^ text.charCodeAt(i), 16777619); return (value >>> 0).toString(16).padStart(8, '0'); };

/** Native-only, bounded review of the shared ground jobs. Hooks follow
 * runR1JourneyChecks, with scene and inventory added. F8 and ordinary W input
 * use the real DOM handlers. main.cjs supplies the isolated smoke checkpoint
 * store, reloads the renderer, then calls this function with result.expected. */
export async function runRegionalGroundChecks(h, expected = null) {
  const checks = [], assert = (ok, message) => { if (!ok) throw new Error(message); checks.push(message); };
  const loader = h.world.loading, mode = h.read().loadingMode;
  const position = () => ({ x: h.player.group.position.x, y: h.player.group.position.y, z: h.player.group.position.z });
  const job = id => loader?.state().jobs.find(row => row.id === id);
  const spawn = id => { const point = h.world.regions.find(region => region.id === id)?.spawn; if (!point) throw new Error('Missing regional spawn ' + id); return point; };
  const catalogs = () => {
    const ids = h.world.treeRegistry.trees.map(tree => tree.id).sort();
    return { trees: ids.length, uniqueTrees: new Set(ids).size, treeIds: digest(ids.join('\n')),
      colliders: h.world.colliders.length, walkSurfaces: h.world.walkSurfaces.length, landmarks: h.world.landmarks.length };
  };
  const countryTrees = id => h.world.treeRegistry.trees.filter(tree => h.world.regionAt(tree.x, tree.z).id === id)
    .map(({ id, x, y, z, species }) => [id, x, y, z, species]).sort((a, b) => a[0].localeCompare(b[0]));
  // Ambient animals do not have defeated-actor saves. Compare their actual
  // stable identity catalog and authored home records, never moving positions.
  const celderFauna = () => h.wildlife().creatures.filter(animal => celderHomes.has(animal.id))
    .map(({ id, species, region }) => ({ id, species, region, authoredHome: celderHomes.get(id) }))
    .sort((a, b) => a.id.localeCompare(b.id));
  const visible = object => { for (let p = object; p; p = p.parent) if (!p.visible) return false; return true; };
  const fineMeshes = row => {
    const meshes = []; h.scene.traverse(mesh => { if (mesh.isMesh && row.meshes.includes(mesh.name)) meshes.push(mesh); }); return meshes;
  };
  const groundProbe = row => {
    h.scene.updateMatrixWorld(true);
    const meshes = []; h.scene.traverse(mesh => {
      if (mesh.isMesh && visible(mesh) && (mesh.name.startsWith('Terrain ') || row.meshes.includes(mesh.name)
        || mesh.name === 'Treloss ground' || mesh.name.startsWith('West Lotharn beck ground:'))) meshes.push(mesh);
    });
    const ray = new THREE.Raycaster(), down = new THREE.Vector3(0, -1, 0);
    return row.probes.map(point => {
      const physical = h.world.groundHeight(point.x, point.z), sampled = h.world.renderedGroundHeight(point.x, point.z);
      ray.set(new THREE.Vector3(point.x, Math.max(physical, sampled) + 100, point.z), down);
      const hit = ray.intersectObjects(meshes, false)[0];
      assert(!!hit, row.label + ' has an actual visible support triangle at ' + point.x + ',' + point.z);
      assert(Math.abs(hit.point.y - sampled) < .01, row.label + ' native ground agrees with the rendered support callback');
      // The unsunk coarse apron can sit above a fine boundary triangle. Require
      // actual fine coverage independently of whichever surface is uppermost.
      const retained = fineMeshes(row), fineHits = ray.intersectObjects(retained, false), fineHit = fineHits[0];
      const diagnostic = { region: row.label, ...point, physical, sampled, top: hit.object.name, drawn: hit.point.y,
        retained: retained.length, visible: retained.filter(visible).length,
        fineHits: fineHits.slice(0, 3).map(h => ({ y: h.point.y, name: h.object.name, visible: visible(h.object), side: h.object.material.side })) };
      console.log('REGIONAL_GROUND_PROBE ' + JSON.stringify(diagnostic));
      assert(!!fineHit, row.label + ' retained fine coverage: ' + JSON.stringify(diagnostic));
      return { ...point, physical, sampled, drawn: hit.point.y, mesh: hit.object.name,
        fineDrawn: fineHit.point.y, fineMesh: fineHit.object.name };
    });
  };
  const travel = async (point, label) => {
    const before = position(), id = h.world.regionAt(point.x, point.z).id, pending = loader && !loader.isReady(id);
    h.press('F8'); h.release('F8');
    assert(h.read().mode === 'testing', label + ' opens the real F8 travel panel');
    const input = document.getElementById('test-point'), button = document.getElementById('test-point-go');
    assert(!!input && !!button && !button.disabled, label + ' offers coordinate travel');
    input.value = point.x + ', ' + point.z; button.click();
    if (pending) assert(gap(position(), before) < .001 && h.read().waitingForRegion, label + ' holds the traveler while construction is pending');
    await h.ready(); loader?.stop(); await h.frames(2);
    assert(!loader || loader.isReady(id), label + ' finishes required regional jobs before arrival');
    assert(gap(position(), point) < .2 && !h.read().waitingForRegion && h.read().mode === 'playing', label + ' arrives through the real travel handler');
    assert(Math.abs(position().y - h.world.heightAt(point.x, point.z)) < .2, label + ' stands on its physical support');
  };
  const walk = async (end, { label = 'Harbor', water = false } = {}) => {
    const start = position(), initialHp = h.read().hp, began = performance.now(); let walked = 0, prior = start;
    const initialWind = h.wind(); let leastWind = initialWind, wetMetres = 0, wetFrames = 0, spentWhileWet = 0;
    const loadWaits = []; let loadingMilliseconds = 0;
    let previousWet = h.read().inWater, previousWind = initialWind;
    assert(!previousWet && canStand(start.x, start.z, h.world, .34, start.y), label + ' starts on a dry ordinary approach');
    h.press('KeyW');
    try {
      while (gap(position(), end) > .35) {
        if (h.read().waitingForRegion) {
          const held = position(), loadingStarted = performance.now();
          h.release('KeyW');
          await h.ready(); loader?.stop(); await h.frames(1);
          const milliseconds = Math.round(performance.now() - loadingStarted);
          loadingMilliseconds += milliseconds;
          assert(!h.read().waitingForRegion && h.read().mode === 'playing', label + ' completes the actual border loading gate');
          assert(gap(position(), held) < .01 && h.read().hp === initialHp, label + ' holds its position safely during regional construction');
          loadWaits.push({ position: held, milliseconds });
          // The loading overlay deliberately clears input; resume with a real
          // fresh key press, as the player must after dismissing that pause.
          h.press('KeyW');
        }
        const p = position(); h.face(Math.atan2(p.x - end.x, p.z - end.z));
        if (performance.now() - began - loadingMilliseconds > 45000) throw new Error(label + ' walk stalled: ' + JSON.stringify({ p, end, state: h.read().terrainFall }));
        await h.frames(1);
        const current = position(), state = h.read(), wind = h.wind(), distance = gap(current, prior);
        walked += distance; prior = current; leastWind = Math.min(leastWind, wind);
        if (state.inWater) { wetFrames++; wetMetres += distance; }
        if (state.inWater && previousWet) spentWhileWet += Math.max(0, previousWind - wind);
        previousWet = state.inWater; previousWind = wind;
        if (state.mode !== 'playing' || (!water && state.inWater) || state.terrainFall.active || state.hp < initialHp || wind <= 0)
          throw new Error(label + ' walk lost safe ordinary support: ' + JSON.stringify({ current, state: { mode: state.mode, hp: state.hp, water: state.inWater, wind, fall: state.terrainFall } }));
      }
    } finally { h.release('KeyW'); }
    await h.frames(2);
    assert(gap(position(), end) < .5 && walked >= gap(start, end) - .6, label + ' ordinary W input reaches the route endpoint');
    assert(!h.read().terrainFall.active && !h.read().inWater && h.read().hp === initialHp,
      label + ' finishes on dry ground with no fall or damage');
    if (water) {
      assert(wetFrames > 2 && wetMetres > 1, label + ' actually enters swimming and crosses the visible shallow arm');
      assert(spentWhileWet > .5 && leastWind < initialWind - .5 && leastWind > 0, label + ' swimming spends ordinary stamina without exhaustion');
      assert(h.wind() > leastWind + .5, label + ' wind recovers naturally on the dry departure bank');
    }
    return { start, end: position(), walked, wetMetres, wetFrames, initialWind, leastWind, finalWind: h.wind(), spentWhileWet,
      milliseconds: Math.round(performance.now() - began), loadingMilliseconds, loadWaits };
  };
  const harvestCelderTree = async () => {
    const candidates = h.wood.catalog.filter(tree => tree.harvestable && ['oak', 'black-alder'].includes(tree.kind)
      && [61, 62].includes(h.world.regionAt(tree.x, tree.z).id) && h.wood.standing(tree.id))
      .sort((a, b) => gap(a, spawn(61)) - gap(b, spawn(61)) || a.id.localeCompare(b.id));
    let selected = null;
    for (const tree of candidates) {
      const reach = (tree.radius ?? .4) + 1.15;
      for (let i = 0; i < 16; i++) {
        const angle = i * Math.PI / 8, x = tree.x + Math.cos(angle) * reach, z = tree.z + Math.sin(angle) * reach;
        const y = h.world.heightAt(x, z);
        if (!canStand(x, z, h.world, .34, y)) continue;
        if ([[.4, 0], [-.4, 0], [0, .4], [0, -.4]].some(([dx, dz]) => Math.abs(h.world.heightAt(x + dx, z + dz) - y) > .2)) continue;
        selected = { tree, stand: { x, z } }; break;
      }
      if (selected) break;
    }
    assert(!!selected, 'A harvestable Celder oak or alder has a clear dry standing place');
    const { tree, stand } = selected, kind = TREE_KINDS[tree.kind];
    await travel(stand, 'F8 to the Celder harvest witness');
    assert(gap(position(), tree) <= CHOP_REACH + (tree.radius ?? 0) && !h.read().inWater,
      'The traveler stands within ordinary reach of the Celder tree');
    // Only the isolated smoke character receives the prerequisite lesson/tool.
    // The tree's stock, random harvest roll and experience remain production.
    h.skills.learn(WOODCUTTING_SKILL);
    const requiredXp = SKILLS[WOODCUTTING_SKILL].thresholds[kind.level - 1];
    h.skills.gain(WOODCUTTING_SKILL, Math.max(0, requiredXp - h.skills.xp(WOODCUTTING_SKILL)));
    if (!h.inventory.has('bronze-axe')) assert(h.inventory.add('bronze-axe', 1), 'The smoke woodcutter carries a bronze hatchet');
    const can = h.wood.canChop(tree.id, id => h.inventory.has(id));
    assert(can.ok, 'Celder tree accepts the normal woodcutting level and carried axe');
    const logsBefore = h.inventory.count(kind.log), xpBefore = h.skills.xp(WOODCUTTING_SKILL), cutBefore = h.wood.logs;
    let result = null, swings = 0;
    for (; swings < 40; swings++) {
      result = h.wood.swing(tree.id, id => h.inventory.has(id));
      assert(result.ok, 'Production wood.swing accepts Celder attempt ' + (swings + 1));
      if (result.log) { swings++; break; }
      const after = h.read().playSeconds + SWING, started = performance.now();
      while (h.read().playSeconds < after) {
        if (performance.now() - started > 15000) throw new Error('Celder woodcutting game clock stalled');
        await h.frames(1);
      }
    }
    assert(result?.log === kind.log && !result.felled, 'Production wood.swing yields one Celder log and leaves a standing tree');
    assert(h.inventory.add(result.log, 1) && h.inventory.count(result.log) === logsBefore + 1,
      'The actual Celder harvest log enters the inventory exactly once');
    assert(h.wood.logs === cutBefore + 1 && h.skills.xp(WOODCUTTING_SKILL) === xpBefore + kind.xp,
      'Celder harvest records the normal log and experience reward');
    const savedTree = h.wood.snapshot().trees.find(row => row.id === tree.id);
    assert(savedTree?.logsLeft >= 1 && savedTree.logsLeft < kind.logs[1] && savedTree.stump === 0,
      'The Celder tree records its real remaining stock as a partial harvest');
    return { id: tree.id, kind: tree.kind, species: tree.species, region: h.world.regionAt(tree.x, tree.z).id,
      x: tree.x, z: tree.z, saved: savedTree, log: result.log, logCount: h.inventory.count(result.log), swings };
  };
  loader?.stop();
  if (expected) {
    assert(h.resume(), 'Continue accepts the isolated ground-review checkpoint after renderer reload');
    await h.ready(); loader?.stop(); await h.frames(3);
    const saved = h.snapshot();
    assert(gap(position(), expected.position) < .2, 'Continue restores the safe harbor position');
    assert(!loader || loader.isReady(8), 'Continue waits for the West Izol ground and support jobs');
    assert(Math.abs(position().y - h.world.heightAt(position().x, position().z)) < .2, 'Continue restores harbor footing');
    assert(same(saved.inventory, expected.inventory), 'Continue preserves exact inventory quantities without duplicate grants');
    assert(same(saved.woodcutting, expected.woodcutting), 'Continue retains unloaded-region tree state');
    assert(h.inventory.count('forest-stick') === expected.sticks, 'Continue retains the distinct inventory witness');
    await travel(spawn(2), 'Post-Continue travel to Luscia');
    const restored = h.wood.tree(expected.tree.id);
    assert(restored?.id === expected.tree.id && restored.species === expected.tree.species,
      'The saved woodland identity resolves after its country loads');
    assert(h.wood.snapshot().trees.some(tree => tree.id === expected.tree.id && tree.logsLeft === 1 && tree.stump === 0),
      'Loading the woodland preserves its saved partial harvest');
    const support = groundProbe(REGIONAL_GROUND_CASES[0]);
    if (expected.celderTree) {
      const witness = expected.celderTree;
      await travel(spawn(witness.region), 'Post-Continue travel to the Celder harvest country');
      const restored = h.wood.tree(witness.id);
      assert(restored?.id === witness.id && restored.species === witness.species && restored.x === witness.x && restored.z === witness.z,
        'Continue resolves the exact saved Celder tree identity and position after its country loads');
      assert(same(h.wood.snapshot().trees.find(tree => tree.id === witness.id), witness.saved) && h.wood.standing(witness.id),
        'Continue retains the Celder tree remaining logs and standing state');
      assert(h.inventory.count(witness.log) === witness.logCount, 'Continue retains the single actual Celder harvest reward');
      assert(same(celderFauna(), expected.celderFauna), 'Continue retains Celder ambient identities and authored home records');
    }
    assert(h.read().frameErrors.count === 0, 'Continue and subsequent travel introduce no renderer frame errors');
    return { ok: true, mode, checks, position: position(), support, catalogs: catalogs(), evidence: h.evidence(), loading: loader?.state() ?? null };
  }
  h.play(); loader?.stop();
  const initialLoading = loader?.state() ?? null, journeys = [], timings = {};
  let celderCrossing = null, celderTree = null, celderResidents = null;
  // Once Celder is integrated, exercise its newly discovered ownership of the
  // shared mountain ground before West Lotharn loads. Mithala still gets a
  // support/return check below; its independent first-load case is retained for
  // the pre-Celder desktop build.
  const hasCelder = h.world.regions.some(region => region.id === 61 && region.name === 'South Celder');
  const cases = hasCelder ? [...REGIONAL_GROUND_CASES.slice(0, 2), {
    id: 61, label: 'South Celder', job: 'westLotharnGround', later: 27, laterJob: 'westLotharn',
    meshes: ['West Lotharn summits ground'], probes: [{ x: -2087.501928, z: -886.127944 }],
  }] : REGIONAL_GROUND_CASES;
  for (const row of cases) {
    if (mode === 'fast') assert(job(row.laterJob)?.status !== 'ready', row.label + ' is reviewed before its neighbouring detailed scenery');
    const began = performance.now(); await travel(spawn(row.id), 'F8 to ' + row.label);
    timings[row.label] = Math.round(performance.now() - began);
    assert(!loader || job(row.job)?.status === 'ready', row.label + ' shared ground job is ready');
    if (mode === 'fast') assert(job(row.laterJob)?.status !== 'ready', row.label + ' loads shared ground without its neighbour settlement scenery');
    const meshes = fineMeshes(row), trees = countryTrees(row.id), before = groundProbe(row);
    assert(meshes.length > 0, row.label + ' retains fine ground mesh objects');
    if (row.label === 'Gala') assert(before.some(probe => probe.fineMesh === 'Telemonia ground')
      && before.some(probe => probe.fineMesh === 'Treloss ground'), 'Gala probes distinguish its own Treloss surface from shared Telemonia ground');
    await travel(spawn(row.later), 'F8 to the later neighbour of ' + row.label);
    const laterMeshes = fineMeshes(row), after = groundProbe(row);
    assert(meshes.length === laterMeshes.length && meshes.every((mesh, i) => mesh === laterMeshes[i]), row.label + ' neighbour loading reuses the same ground objects');
    assert(same(before, after) && same(trees, countryTrees(row.id)), row.label + ' support and planted tree heights remain stable after neighbour loading');
    journeys.push({ region: row.id, neighbour: row.later, fineMeshes: meshes.length, trees: trees.length, support: after });
  }
  if (hasCelder) {
    if (mode === 'fast') assert(job('mithalaScenery')?.status !== 'ready', 'North Celder precedes Mithala vegetation construction');
    await travel(spawn(62), 'F8 to North Celder');
    assert(countryTrees(62).length > 0, 'North Celder constructs its typed trees before arrival');
    assert(!loader || job('mithalaWater')?.status === 'ready', 'North Celder constructs the shared river before arrival');
    if (mode === 'fast') assert(job('mithalaScenery')?.status !== 'ready', 'North Celder river readiness does not require Mithala vegetation');
    const waterMeshes = [...h.world.mithalaWater.group.children], probe = { x: -2143.8, z: -1219.55 };
    const waterProbe = () => {
      h.scene.updateMatrixWorld(true);
      const ray = new THREE.Raycaster(new THREE.Vector3(probe.x, 100, probe.z), new THREE.Vector3(0, -1, 0));
      const hit = ray.intersectObjects(waterMeshes.filter(visible), false)[0], surface = h.world.waterAt(probe.x, probe.z);
      assert(hit?.object.name === 'The West Arm', 'North Celder has the actual visible West Arm ribbon');
      assert(Math.abs(hit.point.y - surface) < .01, 'The displayed river agrees with runtime water support');
      assert(h.world.groundHeight(probe.x, probe.z) < surface, 'The displayed shallow river has a submerged physical bed');
      return { ...probe, drawn: hit.point.y, surface, bed: h.world.groundHeight(probe.x, probe.z) };
    };
    const riverBefore = waterProbe();
    celderResidents = celderFauna();
    assert(celderResidents.length === celderHomes.size && new Set(celderResidents.map(animal => animal.id)).size === celderHomes.size,
      'Both Celders construct every unique ambient identity and authored home record');
    assert(h.read().swimming.level === 1 && !h.read().swimming.taught, 'The native Celder crossing uses the untaught novice swimmer');
    await travel(REGIONAL_GROUND_CELDER_CROSSING[0], 'F8 to the dry Celder river approach');
    celderCrossing = [await walk(REGIONAL_GROUND_CELDER_CROSSING[1], { label: 'Celder outward crossing', water: true }),
      await walk(REGIONAL_GROUND_CELDER_CROSSING[0], { label: 'Celder return crossing', water: true })];
    await travel(spawn(28), 'F8 to South Mithala after Celder and West Lotharn');
    groundProbe(REGIONAL_GROUND_CASES[2]);
    assert(waterMeshes.length === h.world.mithalaWater.group.children.length && waterMeshes.every((mesh, i) => mesh === h.world.mithalaWater.group.children[i]), 'Later Mithala vegetation reuses the existing water meshes');
    assert(same(riverBefore, waterProbe()), 'Later Mithala loading leaves water height and physical bed unchanged');
    journeys.push({ region: 62, neighbour: 28, river: riverBefore, waterMeshes: waterMeshes.length });
  }
  await travel(REGIONAL_GROUND_HARBOR_WALK[0], 'F8 to the West Izol safe harbor');
  const harbor = [await walk(REGIONAL_GROUND_HARBOR_WALK[1]), await walk(REGIONAL_GROUND_HARBOR_WALK[0])];
  const once = catalogs();
  for (const row of cases) await travel(spawn(row.id), 'Return visit to ' + row.label);
  if (hasCelder) await travel(spawn(62), 'Return visit to North Celder');
  await travel(REGIONAL_GROUND_HARBOR_WALK[0], 'Return visit to West Izol harbor');
  assert(same(catalogs(), once), 'Departure and return add no duplicate trees, colliders, walk surfaces or landmarks');
  assert(once.trees === once.uniqueTrees, 'The revisited tree catalog has unique stable IDs');
  if (hasCelder) {
    assert(same(celderFauna(), celderResidents), 'Departure and return preserve Celder ambient identities and authored homes');
    celderTree = await harvestCelderTree();
    await travel(REGIONAL_GROUND_HARBOR_WALK[0], 'Leave Celder after its actual partial harvest');
    await travel(spawn(celderTree.region), 'Return to the Celder harvest country');
    assert(same(h.wood.snapshot().trees.find(tree => tree.id === celderTree.id), celderTree.saved),
      'Leaving and returning preserves the Celder partial harvest before saving');
    await travel(REGIONAL_GROUND_HARBOR_WALK[0], 'Return to the safe harbor for Continue');
  }

  const tree = h.wood.catalog.find(tree => tree.id.startsWith('country-oak-') && tree.harvestable && tree.kind === 'oak' && h.world.regionAt(tree.x, tree.z).id === 2);
  assert(!!tree, 'A retained Luscian oak is available for the saved harvest witness');
  const prior = h.wood.snapshot();
  assert(h.wood.restore({ ...prior, trees: [...prior.trees.filter(t => t.id !== tree.id), { id: tree.id, logsLeft: 1, stump: 0 }] }),
    'A valid partial harvest is recorded without altering tree identity');
  const sticks = h.inventory.count('forest-stick') + 3;
  assert(h.inventory.add('forest-stick', 3) && h.inventory.count('forest-stick') === sticks, 'A distinct stack quantity is prepared in the isolated smoke inventory');
  const saved = h.snapshot();
  assert(h.persist(saved).ok, 'The isolated native checkpoint accepts the regional ground review save');
  assert(h.read().frameErrors.count === 0, 'Regional ground travel and harbor walking introduce no renderer frame errors');
  return { ok: true, mode, checks, timings, journeys, harbor, celderCrossing, celderTree, initialLoading, loading: loader?.state() ?? null, catalogs: catalogs(),
    evidence: h.evidence(), expected: { position: saved.position, inventory: saved.inventory, woodcutting: saved.woodcutting, sticks,
      tree: { id: tree.id, species: tree.species }, celderTree, celderFauna: celderResidents } };
}

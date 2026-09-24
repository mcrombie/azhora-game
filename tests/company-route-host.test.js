import test from 'node:test';
import assert from 'node:assert/strict';
import { createCompanyRouteDriver } from '../src/company-route-host.js';
import { createLivingStory } from '../src/living-story.js';

const point = (x, z = 0) => ({ x, z });
const gap = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const SITES = { harbor: point(4), instructor: point(8), training: point(11), ambush: point(20),
  chip: point(27), bridge: point(30), bridgeExit: point(39), relay: point(47), hut: point(61),
  ostler: point(49), imperialMuster: point(82), republicanMuster: point(82, 8), republicanRelay: point(47, 8),
  materials: [{ id: 'timber-a', ...point(26, 4), quantity: 2 }, { id: 'timber-b', ...point(30, 4), quantity: 2 }],
  swim: [point(28, -5), point(35, -5), point(40, -2)], landingMateId: 'no-legacy-mate' };

function fixture({ ids = ['merc-matt'], saved = null, travelRoute = null, collectMaterial = null, getMaterials = null, sites = SITES, resolveHut = true } = {}) {
  const roster = ids.map(id => ({ id, name: id, pace: 3, group: null }));
  const story = createLivingStory({ roster, saved });
  const positions = new Map(ids.map(id => [id, { ...(story.actor(id)?.position ?? point(0)), yaw: 0 }]));
  const events = [], motions = [], control = { blocked: false, ambush: true, safe: true, player: point(98, 0), followers: [] };
  const readActor = id => positions.get(id);
  const move = (id, from, target, maximum, opts) => {
    const d = gap(from, target), scale = d ? Math.min(1, maximum / d) : 0;
    const next = control.blocked ? { ...from } : { x: from.x + (target.x - from.x) * scale, z: from.z + (target.z - from.z) * scale };
    motions.push({ id, from: { ...from }, next, target: { ...target }, maximum, ...opts });
    return next;
  };
  const driver = createCompanyRouteDriver({ story, roster, sites,
    paths: [[point(0), point(100)]], readActor, move, travelRoute, collectMaterial, getMaterials,
    ambushResolved: () => control.ambush, onEvent: e => {
      events.push(e);
      if (resolveHut && e.type === 'npc-hut-arrived') {
        story.completeTask(e.id, 'relay-soldier'); story.takeSatchel(e.id, { from: 'relay-republican' });
      }
    } });
  function tick(dt = .1, options = {}) {
    story.tick(dt, { paused: options.paused });
    const placements = driver.update(dt, { player: control.player, playerSafe: control.safe, withPlayer: control.followers,
      legacyPlacements: roster.map(entry => ({ id: entry.id, phase: 'walking', x: 0, z: 0 })), ...options });
    for (const p of placements) if (Number.isFinite(p.x)) positions.set(p.id, { ...positions.get(p.id), x: p.x, z: p.z, yaw: p.yaw });
    return placements;
  }
  function until(predicate, seconds = 500) {
    for (let elapsed = 0; elapsed < seconds && !predicate(); elapsed += .1) tick();
    assert.ok(predicate(), `route did not finish: ${JSON.stringify(story.actors())}`);
  }
  return { story, driver, roster, positions, events, motions, control, tick, until };
}

test('the whole physical route performs harbor, drill, materials, bridge, report, satchel and muster once', () => {
  const f = fixture();
  f.until(() => f.story.actor('merc-matt').stage === 'mustered');
  const actor = f.story.actor('merc-matt'), bridge = f.story.bridge();
  for (const task of ['harbor', 'training', 'ambush', 'chip', 'bridge', 'crossing', 'nothom', 'relay-soldier', 'satchel', 'horse', 'empire-muster'])
    assert.ok(Object.hasOwn(actor.tasks, task), `missing real task ${task}`);
  assert.equal(bridge.completedBy, actor.id); assert.equal(bridge.materials, 3); assert.equal(bridge.work, 20);
  assert.equal(f.story.satchel().completedBy, actor.id);
  assert.equal(f.story.snapshot().horses.filter(h => h.claimed).length, 1);
  assert.equal(f.events.filter(e => e.type === 'npc-bridge-complete').length, 1);
  assert.equal(f.events.filter(e => e.type === 'npc-nothom-report').length, 1);
  const gathered = f.events.filter(e => e.type === 'npc-bridge-gather');
  assert.deepEqual(gathered.map(e => e.count), [2, 1]);
  for (const event of gathered) assert.ok(gap(event.position, SITES.materials.find(m => m.id === event.item)) <= .85);
  for (const m of f.motions) assert.ok(gap(m.from, m.next) <= m.maximum + 1e-8, 'no timestep may teleport to a future timetable position');
});

test('being blocked, in combat or in a menu never completes distant work or an ambush', () => {
  const f = fixture(); f.control.blocked = true;
  for (let i = 0; i < 100; i++) f.tick(1);
  assert.equal(f.story.actor('merc-matt').stage, 'harbor'); assert.deepEqual(f.story.actor('merc-matt').tasks, {});
  assert.equal(f.events.length, 0); assert.equal(f.positions.get('merc-matt').x, 0);
  f.control.blocked = false; f.until(() => f.story.actor('merc-matt').stage === 'training');
  const saved = f.story.actor('merc-matt');
  for (let i = 0; i < 20; i++) f.tick(1, { paused: true });
  assert.deepEqual(f.story.actor('merc-matt').route, saved.route);
  f.positions.get('merc-matt').busy = true;
  for (let i = 0; i < 20; i++) f.tick(1);
  assert.deepEqual(f.story.actor('merc-matt').route, saved.route);
  f.positions.get('merc-matt').busy = false; f.control.ambush = false;
  f.until(() => f.events.some(e => e.type === 'npc-ambush-arrived'));
  assert.ok(gap(f.positions.get('merc-matt'), SITES.ambush) <= 2);
  for (let i = 0; i < 30; i++) f.tick(1);
  assert.equal(f.story.actor('merc-matt').stage, 'ambush');
  assert.equal(f.events.filter(e => e.type === 'npc-ambush-arrived').length, 1);
});

test('a recruited mercenary stays with the player and resumes from actual feet without repeating the drill', () => {
  const f = fixture(); f.until(() => f.story.actor('merc-matt').stage === 'road');
  const taskStamp = f.story.actor('merc-matt').tasks.training;
  f.control.followers = ['merc-matt'];
  f.positions.set('merc-matt', { ...point(-25, 8), yaw: 1 });
  const list = f.tick(20);
  assert.equal(list[0].phase, 'with-traveler'); assert.equal(list[0].x, null);
  assert.equal(f.story.actor('merc-matt').stage, 'road');
  f.control.followers = [];
  const next = f.tick(.1)[0];
  assert.ok(gap(next, point(-25, 8)) <= .31);
  assert.equal(f.story.actor('merc-matt').tasks.training, taskStamp);
});

test('saving during real work retains substep, collected timber and position', () => {
  const f = fixture(); f.until(() => f.story.bridge().work > 5);
  const saved = f.story.snapshot(), at = f.positions.get('merc-matt'), originalWork = saved.bridge.work;
  const restored = fixture({ saved });
  assert.ok(gap(restored.positions.get('merc-matt'), at) < .001);
  restored.tick(.1);
  assert.ok(restored.story.bridge().work >= originalWork);
  restored.until(() => restored.story.actor('merc-matt').stage === 'mustered');
  assert.equal(restored.events.filter(e => e.type === 'npc-bridge-gather').length, 0);
  assert.equal(restored.story.actor('merc-matt').tasks.training, saved.actors[0].tasks.training);
});

test('spent player pickups send a builder physically back to Chip for marked reserve timber', () => {
  const reserve = { id: 'chip-repair-timber', ...point(25, -4), quantity: 3 };
  const sites = { ...SITES, materialReserve: reserve }, collected = new Set(['timber-a', 'timber-b']);
  const woodland = { id: 'forest-stick-1', ...point(27, 3), quantity: 1 };
  let f;
  f = fixture({ sites, getMaterials: () => [...SITES.materials, woodland].filter(m => !collected.has(m.id)),
    collectMaterial: (_id, item, count) => {
      const actual = f.positions.get('merc-matt'), source = item === reserve.id ? reserve : woodland;
      assert.ok(gap(actual, source) <= .85, 'no timber may be obtained remotely');
      assert.ok(!collected.has(item), 'a spent player source must not be reused');
      collected.add(item); return count;
    } });
  f.until(() => f.story.bridge().status === 'complete');
  const pickups = f.events.filter(e => e.type === 'npc-bridge-gather');
  assert.deepEqual(pickups.map(e => [e.item, e.count]), [[woodland.id, 1], [reserve.id, 2]]);
  assert.equal(pickups[1].reserve, true);
  assert.equal(f.story.bridge().completedBy, 'merc-matt');
  assert.equal(f.story.bridge().work, 20);
  const restored = fixture({ saved: f.story.snapshot(), sites, getMaterials: () => [],
    collectMaterial: () => assert.fail('saved completed repair must not draw more reserve timber') });
  restored.until(() => restored.story.actor('merc-matt').reportedAt !== null);
});

test('an exhausted host without a reserve releases bridge ownership so the traveler can repair it', () => {
  const f = fixture({ getMaterials: () => [] });
  f.until(() => f.events.some(e => e.type === 'npc-bridge-materials-unavailable'));
  assert.equal(f.story.bridge().owner, null);
  assert.equal(f.story.bridge().status, 'available');
  assert.equal(f.story.completeBridge('player', { playerRepair: true }).ok, true);
  f.until(() => f.story.actor('merc-matt').reportedAt !== null);
  assert.equal(f.story.bridge().completedBy, 'player');
});

test('swimmers use authored river waypoints and do not repair or collect timber', () => {
  const f = fixture({ ids: ['merc-eliana'] });
  f.until(() => f.story.actor('merc-eliana').stage === 'mustered');
  assert.equal(f.story.bridge().status, 'available');
  assert.equal(f.events.filter(e => e.type === 'npc-bridge-gather').length, 0);
  const strokes = f.motions.filter(m => m.swimming);
  assert.ok(strokes.length > 30); assert.ok(strokes.some(m => m.next.z < -4));
  assert.ok(strokes.every(m => !m.mounted));
});

test('the hut waits for the actual encounter result instead of inventing a kill or taking the satchel', () => {
  const f = fixture({ resolveHut: false });
  f.until(() => f.events.some(e => e.type === 'npc-hut-arrived'));
  for (let i = 0; i < 100; i++) f.tick(1);
  assert.equal(f.story.satchel().carrier, 'relay-republican');
  assert.equal(f.story.actor('merc-matt').stage, 'relay');
  assert.equal(f.events.filter(e => e.type === 'npc-hut-arrived').length, 1);
  f.story.completeTask('merc-matt', 'relay-soldier');
  f.until(() => f.story.satchel().status === 'delivered');
});

test('a persuaded satchel carrier delivers to the Republican contact before the Republican muster', () => {
  const f = fixture({ ids: ['merc-word'], resolveHut: false });
  f.until(() => f.events.some(e => e.type === 'npc-hut-arrived'));
  f.story.experience('merc-word', 'heard-republican-argument');
  f.story.completeTask('merc-word', 'relay-soldier');
  f.story.takeSatchel('merc-word', { from: 'relay-republican' });
  f.until(() => f.story.actor('merc-word').stage === 'mustered');
  assert.equal(f.story.satchel().deliveredSide, 'coalition');
  const delivered = f.events.find(e => e.type === 'npc-satchel-delivered');
  assert.ok(gap(delivered.position, SITES.republicanRelay) <= .85);
  assert.equal(f.story.muster('empire').arrivals.length, 0);
  assert.deepEqual(f.story.muster('coalition').arrivals, ['merc-word']);
});

test('couriers approach physically, wait for safe dialogue, and return with one passenger pose', () => {
  const f = fixture();
  f.story.observe('merc-matt', { stage: 'mustered', position: point(82) });
  f.positions.set('merc-matt', { ...point(82), yaw: 0 });
  f.driver.setCourier({ id: 'merc-matt', mode: 'seek' }); f.control.safe = false;
  for (let i = 0; i < 100; i++) f.tick(.1);
  assert.ok(gap(f.positions.get('merc-matt'), f.control.player) <= 2.8);
  assert.equal(f.events.filter(e => e.type === 'courier-arrived').length, 0);
  f.control.player = point(92, 8); f.control.safe = true;
  f.until(() => f.events.some(e => e.type === 'courier-arrived'));
  assert.ok(gap(f.events.find(e => e.type === 'courier-arrived').position, f.control.player) <= 2.8);
  f.driver.setCourier({ id: 'merc-matt', mode: 'passenger' }); f.tick();
  const passenger = f.driver.passengerPose();
  assert.equal(passenger.id, 'merc-matt');
  assert.ok(gap(passenger, f.positions.get('merc-matt')) <= .55);
  f.until(() => f.events.some(e => e.type === 'courier-returned'));
  assert.ok(gap(f.events.find(e => e.type === 'courier-returned').position, SITES.imperialMuster) <= 1.8);
  f.driver.setCourier(null); assert.equal(f.driver.passengerPose(), null);
});

test('unavailable transport halts a courier at the shore and requests an authored crossing only once', () => {
  const f = fixture({ travelRoute: () => null });
  f.story.observe('merc-matt', { stage: 'mustered' });
  f.driver.setCourier({ id: 'merc-matt', mode: 'seek' });
  for (let i = 0; i < 30; i++) f.tick(1);
  assert.equal(f.positions.get('merc-matt').x, 0);
  assert.equal(f.motions.length, 0);
  const requests = f.events.filter(e => e.type === 'transport-needed');
  assert.equal(requests.length, 1); assert.deepEqual(requests[0].to, f.control.player);
  f.driver.setCourier(null); f.tick();
  assert.equal(f.events.filter(e => e.type === 'courier-arrived').length, 0);
});

test('a coming actor stays hidden while paused and a dead courier cannot keep a passenger pose alive', () => {
  const f = fixture();
  const hidden = f.tick(0, { paused: true, legacyPlacements: [{ id: 'merc-matt', phase: 'coming', x: null, z: null }] });
  assert.equal(hidden[0].phase, 'coming');
  f.story.observe('merc-matt', { stage: 'mustered' });
  f.driver.setCourier({ id: 'merc-matt', mode: 'passenger' }); f.tick();
  assert.ok(f.driver.passengerPose());
  f.story.setAlive('merc-matt', false); f.tick();
  assert.equal(f.driver.passengerPose(), null); assert.deepEqual(f.driver.placements(), []);
});

test('the landing mate keeps the authored pier position before training even at a paused zero-time refresh', () => {
  const roster = [{ id: 'merc-gotwood', name: 'Chris', pace: 1.28 }], story = createLivingStory({ roster });
  const legacy = { id: 'merc-gotwood', phase: 'walking', x: 14, z: 29, yaw: 1, activity: 'on the pier' };
  const driver = createCompanyRouteDriver({ story, roster, paths: [[point(0), point(100)]], sites: { ...SITES, landingMateId: 'merc-gotwood' },
    readActor: () => point(0), move: () => assert.fail('paused landing must not move') });
  assert.deepEqual(driver.update(0, { paused: true, legacyPlacements: [legacy] }), [legacy]);
});

test('the independent muster wave has distinct saved standing places instead of one crowded destination', () => {
  const f = fixture({ ids: ['merc-matt', 'merc-gotwood', 'merc-ciaran', 'merc-word', 'merc-eliana'] });
  for (const actor of f.story.actors()) f.story.observe(actor.id, { stage: 'imperial-muster', position: point(70), allegiance: 'empire' });
  f.until(() => f.story.actors().every(a => a.stage === 'mustered'));
  const arrivals = [...f.positions.values()];
  for (let i = 0; i < arrivals.length; i++) for (let j = i + 1; j < arrivals.length; j++)
    assert.ok(gap(arrivals[i], arrivals[j]) >= 1.7, 'mustered people and their horses need separate footprints');
  assert.equal(f.events.filter(e => e.type === 'npc-muster-arrived').length, arrivals.length);
});

test('a departed company physically advances to its own authored assault stands once and survives reload', () => {
  for (const side of ['empire', 'coalition']) {
    const id = 'merc-matt', target = point(95, side === 'empire' ? -8 : 8);
    const sites = { ...SITES, assaultSpots: { [side]: { [id]: target } },
      imperialAssault: point(99, -20), republicanAssault: point(99, 20) };
    const f = fixture({ sites });
    if (side === 'coalition') f.story.chooseAllegiance(id, side);
    f.story.arriveMuster(id, side); f.positions.set(id, { ...point(82), yaw: 0 });
    f.tick(1); assert.equal(f.positions.get(id).x, 82, 'a gathering company must not advance early');
    f.story.departMuster(side);
    f.until(() => f.events.some(e => e.type === 'npc-assault-arrived'));
    assert.ok(gap(f.positions.get(id), target) <= .7, 'the named standing point overrides the fallback center');
    assert.equal(f.story.actor(id).stage, 'mustered', 'persisted schema and original muster arrival remain valid');
    assert.ok(Object.hasOwn(f.story.actor(id).tasks, `${side}-assault-ground`));
    assert.equal(f.events.filter(e => e.type === 'npc-assault-arrived').length, 1);
    assert.ok(f.story.actor(id).alive, 'marching invents no casualties');
    const restored = fixture({ saved: f.story.snapshot(), sites });
    for (let i = 0; i < 20; i++) restored.tick();
    assert.ok(gap(restored.positions.get(id), target) <= .7);
    assert.equal(restored.events.filter(e => e.type === 'npc-assault-arrived').length, 0);
    for (const m of f.motions) assert.ok(gap(m.from, m.next) <= m.maximum + 1e-8);
  }
});

test('blocked, paused, busy and player-led mercenaries cannot advance a departed army by time alone', () => {
  const id = 'merc-matt', f = fixture({ sites: { ...SITES, imperialAssault: point(95) } });
  f.story.arriveMuster(id, 'empire'); f.positions.set(id, { ...point(82), yaw: 0 });
  f.story.departMuster('empire'); f.control.blocked = true;
  for (let i = 0; i < 20; i++) f.tick(1);
  assert.equal(f.positions.get(id).x, 82);
  assert.ok(!Object.hasOwn(f.story.actor(id).tasks, 'empire-assault-ground'));
  f.control.blocked = false;
  for (let i = 0; i < 5; i++) f.tick(1, { paused: true });
  assert.equal(f.positions.get(id).x, 82);
  f.positions.get(id).busy = true;
  for (let i = 0; i < 5; i++) f.tick(1);
  assert.equal(f.positions.get(id).x, 82, 'player-led combat or a march scene owns busy actors');
  f.positions.get(id).busy = false; f.control.followers = [id];
  assert.equal(f.tick(1)[0].phase, 'with-traveler'); assert.equal(f.positions.get(id).x, 82);
  f.control.followers = [];
  f.until(() => f.events.some(e => e.type === 'npc-assault-arrived'));
});

test('courier duties precede a departed army route, and missing assault sites leave the company in place', () => {
  const id = 'merc-matt', sites = { ...SITES, imperialAssault: point(95) };
  const f = fixture({ sites }); f.story.arriveMuster(id, 'empire'); f.positions.set(id, { ...point(92), yaw: 0 });
  f.story.departMuster('empire'); f.driver.setCourier({ id, mode: 'return' });
  f.tick(); assert.ok(f.positions.get(id).x < 92, 'courier goes back to muster before joining the advance');
  f.until(() => f.events.some(e => e.type === 'courier-returned'));
  assert.ok(!f.events.some(e => e.type === 'npc-assault-arrived'));
  f.driver.setCourier(null); f.until(() => f.events.some(e => e.type === 'npc-assault-arrived'));
  const absent = fixture(); absent.story.arriveMuster(id, 'empire'); absent.positions.set(id, { ...point(82), yaw: 0 });
  absent.story.departMuster('empire'); absent.tick(10);
  assert.equal(absent.positions.get(id).x, 82); assert.equal(absent.motions.length, 0);
});

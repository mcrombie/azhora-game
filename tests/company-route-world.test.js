import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';
import { sourceModule } from './module-loader.js';
import { createCompanyRouteDriver } from '../src/company-route-host.js';
import { createLivingStory, validateLivingStorySnapshot } from '../src/living-story.js';
import { createLusciaCivilWarHost } from '../src/luscia-civil-war-host.js';
import { MERCENARY_ROSTER } from '../src/mercenaries.js';
import { INSTRUCTOR_STAND } from '../src/instructor.js';
import { LUSCIA_SITES } from '../src/luscia-chapter.js';
import { LUMBER_TOWN_STABLE } from '../src/region-world.js';
import { SOLIS_STANDS } from '../src/west-suval.js';
import { MUS_BEACH } from '../src/wild-route.js';
import { BODY, stepToward } from '../src/bodies.js';
import { canStand, moveCharacter } from '../src/game-state.js';
import { AMBUSH, PARTIES, createRoadAmbush } from '../src/road-ambush.js';
import { createCompanyTransport } from '../src/company-transport.js';
import { FERRY_LANDINGS } from '../src/ferry.js';
import { LEGION_POSTS } from '../src/legion-posts.js';
import { RIDE } from '../src/riding.js';

const { createWorld } = await sourceModule('../src/world.js');
const world = createWorld(new THREE.Scene());
const distance = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
function clear(point, offset = 2.2) {
  for (const [x, z] of [[point.x + offset, point.z], [point.x - offset, point.z], [point.x, point.z + offset], [point.x, point.z - offset]])
    if (canStand(x, z, world, BODY.person)) return { x, z };
  assert.fail(`No actual standing point at ${JSON.stringify(point)}`);
}
const bridge = world.journeySites['bridge-repair'], road = world.paths[0];
const index = road.reduce((best, p, i) => distance(p, bridge) < distance(road[best], bridge) ? i : best, 0);
const before = road[Math.max(0, index - 1)], after = road[Math.min(road.length - 1, index + 1)];
const length = distance(before, after), ux = (after.x - before.x) / length, uz = (after.z - before.z) / length;
const sites = {
  chip: clear(world.npcPositions['crossing-keeper']), bridge: clear(world.npcPositions['crossing-keeper'], 1.5),
  bridgeExit: { x: bridge.x + ux * 19, z: bridge.z + uz * 19 },
  swim: [{ x: bridge.x - ux * 18 + uz * 15, z: bridge.z - uz * 18 - ux * 15 },
    { x: bridge.x + ux * 18 + uz * 15, z: bridge.z + uz * 18 - ux * 15 }],
  materials: Object.values(world.journeySites).filter(p => p.type === 'sticks'),
  relay: clear(world.npcPositions['relay-clerk']),
};

function cross(id, { exhausted = false } = {}) {
  world.setJourneySiteState('bridge-repair', false);
  const roster = [{ id, name: id, pace: 3 }], story = createLivingStory({ roster });
  const position = { ...AMBUSH.point }, foot = { ...position }, events = [];
  story.observe(id, { stage: 'bridge', position });
  const reserve = { id: 'chip-repair-timber', ...clear(world.npcPositions['crossing-keeper']), quantity: 3 };
  const driver = createCompanyRouteDriver({ story, roster, paths: world.paths,
    sites: exhausted ? { ...sites, materialReserve: reserve } : sites,
    getMaterials: exhausted ? () => [] : null,
    collectMaterial: exhausted ? (_id, item, count) => {
      assert.equal(item, reserve.id); assert.ok(distance(position, reserve) <= .85, 'builder must actually reach the camp reserve');
      return count;
    } : null,
    readActor: () => position,
    move: (_id, at, target, max, { swimming }) => {
      foot.x = at.x; foot.z = at.z;
      if (swimming) { const d = distance(foot, target) || 1; moveCharacter(foot, (target.x - foot.x) / d * Math.min(max, d), (target.z - foot.z) / d * Math.min(max, d), world, BODY.person, { swimming: true }); }
      else stepToward(foot, target, max, world, BODY.person);
      assert.ok(distance(at, foot) <= max + 1e-6, 'real collision navigation cannot teleport');
      return { ...foot };
    },
    onEvent: event => { events.push(event); if (event.type === 'npc-bridge-complete') world.setJourneySiteState('bridge-repair', true); },
  });
  for (let i = 0; i < 12000 && story.actor(id).reportedAt === null; i++) {
    story.tick(.1);
    const p = driver.update(.1)[0];
    Object.assign(position, { x: p.x, z: p.z });
  }
  const actor = story.actor(id);
  assert.notEqual(actor.reportedAt, null, `stuck at ${JSON.stringify(actor)}; position ${JSON.stringify(position)}`);
  return { story, events, position };
}

test('a builder gathers real nearby timber, repairs the Caloss and walks through Nothom to Iven', () => {
  const result = cross('merc-matt');
  assert.equal(result.story.bridge().status, 'complete');
  assert.equal(result.events.filter(e => e.type === 'npc-bridge-complete').length, 1);
  assert.ok(distance(result.position, sites.relay) <= .85);
});

test('a swimmer crosses the actual broken Caloss bank route and reaches Iven without repairing', () => {
  const result = cross('merc-eliana');
  assert.equal(result.story.bridge().status, 'available');
  assert.equal(result.events.filter(e => e.type === 'npc-bridge-complete').length, 0);
  assert.ok(distance(result.position, sites.relay) <= .85);
});

test('when all loose timber was collected, the builder reaches Chip\u2019s camp reserve on real terrain and completes the crossing', () => {
  const result = cross('merc-matt', { exhausted: true });
  assert.equal(result.story.bridge().status, 'complete');
  assert.deepEqual(result.events.filter(e => e.type === 'npc-bridge-gather').map(e => [e.item, e.count, e.reserve]),
    [['chip-repair-timber', 3, true]]);
  assert.ok(distance(result.position, sites.relay) <= .85);
});

test('a mounted courier uses the real mainland road and Peblos quays, then carries one passenger to Moros', () => {
  world.setJourneySiteState('bridge-repair', true);
  const roster = [{ id: 'merc-word', name: 'Ed', pace: 1.34 }], story = createLivingStory({ roster });
  const position = { ...sites.relay }, foot = { ...position }, events = [];
  const muster = clear(LEGION_POSTS.find(n => n.id === 'post-camp-legate'));
  assert.ok(canStand(muster.x, muster.z, world, RIDE.radius), 'the muster approach accommodates a real mount');
  story.observe('merc-word', { stage: 'mustered', position });
  let driver;
  const transport = createCompanyTransport({ story, world, readActor: () => position,
    onEvent: event => { events.push(event); if (event.type === 'company-ferry-arrived') { Object.assign(position, event.position); driver.clear(); } } });
  driver = createCompanyRouteDriver({ story, roster, paths: world.paths, sites: { imperialMuster: muster },
    readActor: () => ({ ...position, busy: transport.isInTransit('merc-word') }),
    move: (_id, at, target, max, { mounted }) => {
      foot.x = at.x; foot.z = at.z; stepToward(foot, target, max, world, mounted ? RIDE.radius : BODY.person);
      assert.ok(distance(at, foot) <= max + 1e-6); return { ...foot };
    }, travelRoute: transport.chooseRoute, onEvent: e => events.push(e) });
  function run(eventName, limit = 12000) {
    for (let i = 0; i < limit && !events.some(e => e.type === eventName); i++) {
      transport.update(.1);
      const p = driver.update(.1, { player: FERRY_LANDINGS.peblos.ashore })[0];
      Object.assign(position, { x: p.x, z: p.z });
    }
    assert.ok(events.some(e => e.type === eventName), `courier stuck before ${eventName}: ${JSON.stringify(position)}; route=${JSON.stringify(story.actor('merc-word').route)}; events=${JSON.stringify(events)}`);
  }
  driver.setCourier({ id: 'merc-word', mode: 'seek' }); run('courier-arrived');
  driver.setCourier({ id: 'merc-word', mode: 'passenger' }); run('courier-returned');
  assert.equal(events.filter(e => e.type === 'company-ferry-arrived').length, 2);
  assert.ok(distance(position, muster) <= 1.8);
  assert.equal(story.snapshot().horses.length, 0, 'the courier uses a borrowed camp mount, never a fifth player entitlement');
});


// This traversal starts at landfall, rather than staging everyone at the bridge.
// It uses the same shared story, actual collision strides, road/ferry planner,
// offscreen ambush resolution and six-second Davin exchange as normal play.
test('the simultaneous company completes its real mainland errands, survives reload and reaches both musters', () => {
  world.setJourneySiteState('bridge-repair', false);
  const roster = MERCENARY_ROSTER, seed = 3, dt = .2;
  function approach(p, offset = 2.2, radius = BODY.person) {
    for (let reach = offset; reach < 30; reach += 1) for (let n = 0; n < 24; n++) {
      const q = { x: p.x + Math.cos(n * Math.PI / 12) * reach, z: p.z + Math.sin(n * Math.PI / 12) * reach };
      if (canStand(q.x, q.z, world, radius)) return q;
    }
    assert.fail(`No collision-safe approach to ${JSON.stringify(p)}`);
  }
  const routeSites = { ...sites, landingMateId: 'authored-arrival-not-in-this-traversal',
    harbor: approach(world.pierHead), instructor: approach(INSTRUCTOR_STAND), training: approach(world.training, 3),
    ambush: AMBUSH.point, materialReserve: { id: 'chip-repair-timber', ...sites.chip, quantity: 3 },
    republicanRelay: approach(world.npcPositions['timber-stall']), hut: approach(LUSCIA_SITES['courier-satchel']),
    ostler: approach(LUMBER_TOWN_STABLE.stand),
    imperialMuster: approach(LEGION_POSTS.find(p => p.id === 'post-camp-legate'), 3, RIDE.radius),
    republicanMuster: approach(SOLIS_STANDS['solis-captain'], 3, RIDE.radius), musterSpots: {},
  };
  for (const side of ['empire', 'coalition']) {
    const center = side === 'empire' ? routeSites.imperialMuster : routeSites.republicanMuster;
    routeSites.musterSpots[side] = Object.fromEntries(roster.map((entry, i) => [entry.id,
      approach({ x: center.x + i % 4 * 3, z: center.z + Math.floor(i / 4) * 3 }, 2.2, RIDE.radius)]));
  }
  let story = createLivingStory({ roster, seed }), driver, republic, transport;
  const ambush = createRoadAmbush({ seed }), positions = new Map(), feet = new Map(), events = [], collected = new Set();
  function adapters(savedRepublic) {
    republic = createLusciaCivilWarHost({ world, npcById: new Map(), combat: { state: { phase: 'idle' } },
      position: () => world.spawn, living: () => story });
    if (savedRepublic) assert.equal(republic.restore(savedRepublic), true);
    transport = createCompanyTransport({ story, world, readActor: id => positions.get(id), onEvent: event => {
      events.push(event);
      if (event.type === 'company-ferry-arrived') { Object.assign(positions.get(event.id), event.position); driver.clear(); }
    } });
    driver = createCompanyRouteDriver({ story, roster, paths: world.paths, sites: routeSites,
      readActor: id => positions.get(id), travelRoute: transport.chooseRoute,
      getMaterials: () => routeSites.materials.filter(p => !collected.has(p.id)),
      collectMaterial: (_id, item, count) => {
        if (item === 'chip-repair-timber') return count;
        if (collected.has(item)) return 0;
        collected.add(item); return count;
      },
      ambushResolved: id => !ambush.alive || ambush.state.settled.includes(PARTIES.find(p => p.men.includes(id))?.id),
      move: (id, at, target, max, { swimming, mounted }) => {
        let foot = feet.get(id);
        if (!foot) { foot = { ...at }; feet.set(id, foot); }
        foot.x = at.x; foot.z = at.z;
        if (swimming) {
          const d = distance(foot, target) || 1;
          moveCharacter(foot, (target.x - foot.x) / d * Math.min(max, d), (target.z - foot.z) / d * Math.min(max, d), world, BODY.person, { swimming: true });
        } else stepToward(foot, target, max, world, mounted ? RIDE.radius : BODY.person, id.length % 2 ? 1 : -1);
        assert.ok(distance(at, foot) <= max + 1e-6, `${id} must move by a real collision-checked stride`);
        return { ...foot };
      },
      onEvent: event => {
        events.push(event);
        if (event.type === 'npc-hut-arrived') republic.npcHutArrived(event.id);
        if (event.type === 'npc-bridge-complete') world.setJourneySiteState('bridge-repair', true);
      },
    });
  }
  adapters();
  let reloaded = false;
  for (let elapsed = 0; elapsed < 3000 && !story.actors().every(a => !a.alive || a.stage === 'mustered'); elapsed += dt) {
    story.tick(dt);
    for (const entry of roster) if (!positions.has(entry.id) && story.clock() >= entry.arrival) {
      // The initial boat animation is outside this test; thereafter no placement is staged.
      const p = entry.route === 'wild' ? MUS_BEACH : routeSites.harbor;
      positions.set(entry.id, { ...p });
      story.observe(entry.id, { stage: entry.route === 'wild' ? 'road' : 'harbor', position: p });
    }
    for (const party of PARTIES) {
      const alive = party.men.filter(id => story.actor(id)?.alive);
      if (!alive.length || !alive.every(id => positions.has(id) && distance(positions.get(id), AMBUSH.point) < 3)) continue;
      const result = ambush.reach(party.id, { dead: story.actors().filter(a => !a.alive).map(a => a.id) });
      if (!result) continue;
      for (const id of result.fallen) story.setAlive(id, false);
      if (result.met) for (const id of alive) story.experience(id, 'rebel-attack', { weight: -.35 });
    }
    transport.update(dt);
    for (const p of driver.update(dt, { player: world.spawn })) if (Number.isFinite(p.x)) Object.assign(positions.get(p.id), { x: p.x, z: p.z });
    republic.frame(dt, { playing: true });
    if (!reloaded && story.bridge().work > 3) {
      const before = story.snapshot(), savedRepublic = republic.snapshot();
      story.tick(20, { paused: true }); driver.update(20, { paused: true });
      assert.equal(story.clock(), before.seconds, 'menus must not advance the world clock');
      assert.deepEqual(story.bridge(), before.bridge, "menus must not complete another mercenary's repair");
      assert.ok(validateLivingStorySnapshot(story.snapshot()));
      story = createLivingStory({ roster, seed, saved: story.snapshot() });
      feet.clear(); adapters(savedRepublic); reloaded = true;
      assert.deepEqual(story.bridge(), before.bridge, 'loading must preserve performed repair work');
    }
  }
  const actors = story.actors(), survivors = actors.filter(a => a.alive), snapshot = story.snapshot();
  assert.ok(reloaded, 'the test must reload while a real builder is working');
  assert.equal(story.actor('merc-gotwood').alive, false, 'unassisted Chris falls at the ambush');
  assert.equal(survivors.length, 9, 'this seed leaves the other nine alive');
  assert.ok(survivors.every(a => a.stage === 'mustered'), `company stalled: ${JSON.stringify(survivors.filter(a => a.stage !== 'mustered'))}`);
  for (const actor of survivors) {
    const side = actor.allegiance, destination = routeSites.musterSpots[side][actor.id];
    assert.ok(distance(positions.get(actor.id), destination) <= .7, `${actor.id} must actually reach the ${side} muster`);
    if (actor.id !== 'merc-mus') for (const task of ['harbor', 'training', 'ambush', 'chip', 'crossing', 'nothom'])
      assert.ok(Object.hasOwn(actor.tasks, task), `${actor.id} skipped ${task}`);
  }
  assert.ok(story.muster('empire').arrivals.length > 0 && story.muster('coalition').arrivals.length > 0);
  assert.equal(story.recall().status, 'seeking', 'the Imperial survivors summon the absent player after their grace period');
  assert.equal(story.recall().courier, story.muster('empire').arrivals[0], 'the first loyal arrival becomes courier when Ed defects');
  assert.equal(story.bridge().status, 'complete');
  assert.equal(events.filter(e => e.type === 'npc-bridge-complete').length, 1, 'one shared repair');
  assert.equal(story.satchel().status, 'delivered');
  assert.equal(story.satchel().completedBy, 'merc-word', 'the first reporter retrieves the physical satchel');
  assert.equal(story.satchel().deliveredSide, 'coalition', "Davin's actual argument can change a mercenary's allegiance");
  assert.equal(events.filter(e => e.type === 'npc-satchel-delivered' && e.delivered.ok).length, 1);
  assert.equal(snapshot.horses.length, 4);
  assert.ok(snapshot.horses.every(h => h.claimed));
  assert.deepEqual(snapshot.horses.map(h => h.owner), snapshot.reports.slice(0, 4), 'the first four actual reporters receive the finite remounts');
  assert.equal(story.reportNothom('player').horse, null, 'the late player must continue on foot');
  assert.ok(validateLivingStorySnapshot(story.snapshot()));
});

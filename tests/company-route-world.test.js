import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';
import { sourceModule } from './module-loader.js';
import { createCompanyRouteDriver } from '../src/company-route-host.js';
import { createLivingStory } from '../src/living-story.js';
import { BODY, stepToward } from '../src/bodies.js';
import { canStand, moveCharacter } from '../src/game-state.js';
import { AMBUSH } from '../src/road-ambush.js';
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

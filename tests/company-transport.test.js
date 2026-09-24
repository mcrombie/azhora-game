import test from 'node:test';
import assert from 'node:assert/strict';
import { createLivingStory } from '../src/living-story.js';
import { createCompanyRouteDriver } from '../src/company-route-host.js';
import { createCompanyTransport, validCompanyTransit, COMPANY_FERRY_SECONDS } from '../src/company-transport.js';
import { FERRY_LANDINGS } from '../src/ferry.js';

const D = FERRY_LANDINGS.drent.ashore, P = FERRY_LANDINGS.peblos.ashore;
const gap = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const roster = [{ id: 'merc-word', name: 'Ed', pace: 1.34 }];
const paths = [[{ x: -20, z: D.z }, D], [P, { x: P.x + 20, z: P.z }]];

function fixture(saved = null) {
  const story = createLivingStory({ roster, saved }), events = [];
  let position = { ...(story.actor('merc-word').position ?? { x: D.x - 9, z: D.z }), yaw: 0 };
  let driver, transport;
  const world = { paths, regionAt: (x, z) => ({ name: x > 100 ? 'Peblos' : 'Drent' }) };
  transport = createCompanyTransport({ story, world, readActor: () => position,
    onEvent: event => {
      events.push(event);
      if (event.type === 'company-ferry-arrived') { position = { ...event.position }; driver?.clear(); }
    } });
  driver = createCompanyRouteDriver({ story, roster, paths, sites: { imperialMuster: { x: -20, z: D.z } },
    readActor: () => ({ ...position, busy: transport.isInTransit('merc-word') }),
    move: (_id, from, to, length) => { const d = gap(from, to), step = d ? Math.min(1, length / d) : 0; return { x: from.x + (to.x - from.x) * step, z: from.z + (to.z - from.z) * step }; },
    travelRoute: transport.chooseRoute, onEvent: e => events.push(e),
  });
  function tick(dt = .1, paused = false) {
    transport.update(dt, { paused });
    const places = driver.update(dt, { paused, player: P });
    const actor = places.find(p => p.id === 'merc-word');
    if (actor) position = { ...position, x: actor.x, z: actor.z, yaw: actor.yaw };
  }
  return { story, transport, driver, events, tick, get position() { return position; }, place: p => { position = { ...p }; } };
}

test('a courier follows the real quay route, sails for twelve active seconds, then resumes on the island', () => {
  const f = fixture(); f.story.observe('merc-word', { stage: 'mustered' });
  f.driver.setCourier({ id: 'merc-word', mode: 'seek' });
  let sawSailing = false;
  for (let i = 0; i < 220 && !f.events.some(e => e.type === 'courier-arrived'); i++) {
    f.tick();
    if (f.transport.isInTransit('merc-word')) {
      sawSailing = true;
      assert.ok(gap(f.position, D) <= 1.2, 'rider is hidden at quay, not advanced along an ocean chord');
    }
    if (!f.events.some(e => e.type === 'company-ferry-arrived')) assert.ok(f.position.x <= D.x + .1);
  }
  assert.ok(sawSailing);
  assert.equal(f.events.filter(e => e.type === 'company-ferry-departed').length, 1);
  assert.equal(f.events.filter(e => e.type === 'company-ferry-arrived').length, 1);
  assert.ok(f.events.some(e => e.type === 'courier-arrived'));
  assert.ok(gap(f.position, P) < 2.8);
});

test('paused and restored crossings retain elapsed time; the passenger returns on the same courier', () => {
  const f = fixture(); f.story.observe('merc-word', { stage: 'mustered', position: D }); f.place(D);
  f.driver.setCourier({ id: 'merc-word', mode: 'seek' });
  f.tick(); f.tick();
  assert.ok(f.transport.isInTransit('merc-word'));
  for (let i = 0; i < 50; i++) f.tick(.1);
  const before = f.story.actor('merc-word').route.transit.elapsed;
  for (let i = 0; i < 100; i++) f.tick(1, true);
  assert.equal(f.story.actor('merc-word').route.transit.elapsed, before);
  const saved = f.story.snapshot(); assert.ok(validCompanyTransit(saved.actors[0].route.transit));
  const restored = fixture(saved); restored.driver.setCourier({ id: 'merc-word', mode: 'seek' });
  for (let i = 0; i < 80; i++) restored.tick(.1);
  assert.equal(restored.events.filter(e => e.type === 'company-ferry-departed').length, 0, 'restoring midway does not board again');
  assert.equal(restored.events.filter(e => e.type === 'company-ferry-arrived').length, 1);
  restored.driver.setCourier({ id: 'merc-word', mode: 'passenger' });
  for (let i = 0; i < 260 && !restored.events.some(e => e.type === 'courier-returned'); i++) restored.tick(.1);
  const returnLeg = restored.events.filter(e => e.type === 'company-ferry-arrived').at(-1);
  assert.equal(returnLeg.to, 'drent'); assert.equal(returnLeg.passenger, true); assert.equal(returnLeg.id, 'merc-word');
  assert.ok(restored.events.some(e => e.type === 'courier-returned'));
  assert.equal(restored.story.snapshot().horses.length, 0, 'ferry transport does not mint a horse entitlement');
});

test('no boat departs until the actor physically reaches the quay and no dead actor lands', () => {
  const f = fixture();
  const path = f.transport.chooseRoute('merc-word', f.position, P);
  assert.equal(path.terminal, true); assert.deepEqual(path.points.at(-1), { x: D.x, z: D.z });
  f.transport.update(COMPANY_FERRY_SECONDS * 3);
  assert.equal(f.events.length, 0); assert.equal(f.transport.isInTransit('merc-word'), false);
  f.place(D); f.transport.update(.1);
  assert.equal(f.transport.isInTransit('merc-word'), true);
  f.story.setAlive('merc-word', false);
  f.transport.update(COMPANY_FERRY_SECONDS + 1);
  assert.equal(f.transport.isInTransit('merc-word'), false);
  assert.equal(f.events.filter(e => e.type === 'company-ferry-arrived').length, 0);
});

test('a sustained water chord without an authored crossing is rejected', () => {
  const story = createLivingStory({ roster });
  const world = { paths: [[{ x: -100, z: -100 }, { x: -100, z: -300 }]], regionAt: () => ({ name: 'Drent' }),
    heightAt: () => -3, waterAt: () => 0 };
  const transport = createCompanyTransport({ story, world, readActor: () => ({ x: -100, z: -100 }) });
  assert.equal(transport.chooseRoute('merc-word', { x: -100, z: -100 }, { x: -100, z: -300 }), null);
  assert.equal(story.actor('merc-word').route.transit, undefined);
});

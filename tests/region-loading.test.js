import test from 'node:test';
import assert from 'node:assert/strict';
import { createRegionLoading } from '../src/region-loading.js';

function fixture(options = {}) {
  let clock = 0, serial = 0;
  const frames = new Map(), visits = [];
  const loader = createRegionLoading({ initialRegions: [1], budgetMs: 4,
    regionAt: () => ({ id: 1 }), regionCenters: { 2: { x: 10, z: 0 }, 3: { x: -10, z: 0 }, 4: { x: 200, z: 0 } },
    adjacency: { 1: [2, 3] }, now: () => clock,
    requestFrame: callback => { frames.set(++serial, callback); return serial; }, cancelFrame: id => frames.delete(id), ...options });
  function add(id, regions, count = 3, extra = {}) {
    loader.register({ id, regions, steps: function* () { for (let i = 0; i < count; i++) { visits.push(`${id}:${i}`); clock += 2; yield; } return id; }, ...extra });
  }
  function frame() { const [id, callback] = frames.entries().next().value ?? []; if (!callback) return false; frames.delete(id); callback(); return true; }
  function drain() { let i = 0; while (frame()) { if (++i > 100) throw new Error('Queue did not finish'); } }
  return { loader, visits, frames, add, frame, drain };
}

test('background loading budgets each frame and finishes one region before the next', () => {
  const f = fixture(); f.add('far', [4]); f.add('east', [2]); f.add('west', [3]);
  f.loader.update({ x: 0, z: 0 }, { x: 1, z: 0 }).start();
  f.frame(); assert.deepEqual(f.visits, ['east:0', 'east:1']); assert.equal(f.loader.isReady(1), true); assert.equal(f.loader.isReady(2), false);
  f.drain(); assert.deepEqual(f.visits.slice(0, 6), ['east:0', 'east:1', 'east:2', 'west:0', 'west:1', 'west:2']);
  assert.equal(f.loader.isReady(4), true); assert.equal(f.loader.revision, 3); assert.equal(f.loader.state().longestSliceMs, 2);
});

test('travel promotes its destination and dependencies while waiters share the completed region', async () => {
  const f = fixture(); f.add('near', [2]); f.add('base', [4]); f.add('far', [5], 1, { dependencies: ['base'] });
  const first = f.loader.ensureRegion(5), second = f.loader.requireRegion(5);
  f.drain(); await Promise.all([first, second]);
  assert.deepEqual(f.visits.slice(0, 4), ['base:0', 'base:1', 'base:2', 'far:0']);
  assert.equal(f.loader.isReady(5), true);
});

test('position changes reprioritize pending regions without rebuilding completed work', () => {
  const f = fixture({ regionAt: x => ({ id: x > 50 ? 4 : 1 }) });
  f.add('east', [2], 1); f.add('west', [3], 1); f.add('far', [4], 1);
  f.loader.update({ x: 0, z: 0 }, { x: 1, z: 0 }).start(); f.frame();
  f.loader.update({ x: 200, z: 0 }); f.drain();
  assert.equal(new Set(f.visits).size, f.visits.length);
  assert.equal(f.loader.state().currentRegion, 4); assert.equal(f.loader.state().completed, 3);
});

test('a region is ready only after every registered part and its commit have completed', async () => {
  const f = fixture(), commits = [];
  f.add('ground', [2], 1, { onComplete: value => commits.push(value) }); f.add('woods', [2], 3);
  const ready = f.loader.ensureRegion(2); f.frame(); assert.deepEqual(commits, ['ground']); assert.equal(f.loader.isReady(2), false);
  f.drain(); await ready; assert.equal(f.loader.isReady(2), true);
});

test('construction failures reject travel, expose status, and allow other regions to finish', async () => {
  const errors = [], f = fixture({ onError: error => errors.push(error.message) });
  f.add('broken', [2], 1, { steps: function* () { throw new Error('bad terrain'); } }); f.add('okay', [3], 1);
  const result = assert.rejects(f.loader.ensureRegion(2), /bad terrain/); f.drain(); await result;
  assert.deepEqual(errors, ['bad terrain']); assert.equal(f.loader.isReady(3), true); assert.equal(f.loader.state().jobs[0].status, 'failed');
});

test('missing and cyclic dependencies fail instead of leaving travel waiting indefinitely', async () => {
  const f = fixture(); f.add('broken', [2], 1, { dependencies: ['absent'] });
  const result = assert.rejects(f.loader.ensureRegion(2), /Unresolved dependencies/); f.drain(); await result;
  await assert.rejects(f.loader.ensureRegion(99), /No loading job/);
  const cycle = fixture(); cycle.add('a', [2], 1, { dependencies: ['b'] }); cycle.add('b', [3], 1, { dependencies: ['a'] });
  const cyclicResult = assert.rejects(cycle.loader.ensureRegion(2), /Unresolved dependencies/); cycle.drain(); await cyclicResult;
  assert.ok(cycle.loader.state().jobs.every(job => job.status === 'failed'));
});

test('stopping cancels scheduled work and restarting preserves the active iterator', () => {
  const f = fixture(); f.add('east', [2], 5); f.loader.start(); f.frame(); f.loader.stop();
  assert.equal(f.frames.size, 0); assert.equal(f.visits.length, 2);
  f.loader.start(); f.drain(); assert.equal(f.visits.length, 5); assert.equal(f.loader.isReady(2), true);
});

test('construction timings identify each job without counting time waiting between frames', () => {
  const f = fixture(); f.add('short', [2], 1); f.add('long', [3], 5);
  f.loader.start(); f.frame(); f.loader.stop();
  const before = f.loader.state().jobs.map(job => ({ ...job }));
  assert.equal(before[0].buildMs, 2);
  assert.equal(before[0].stepsRun, 2, 'the final commit step is measured too');
  f.loader.start(); f.drain();
  const jobs = f.loader.state().jobs;
  assert.equal(jobs[0].buildMs, 2, 'completed jobs are never charged again');
  assert.equal(jobs[1].buildMs, 10);
  assert.equal(jobs[1].longestSliceMs, 2);
  assert.equal(jobs[1].stepsRun, 6);
  assert.equal(f.visits.length, 6, 'instrumentation does not change deterministic work');
});

test('nearby mode goes idle with distant work pending and wakes when the player travels', () => {
  const f = fixture({ nearbyOnly: true, regionAt: x => ({ id: x > 100 ? 4 : 1 }) });
  f.add('east', [2]); f.add('west', [3]); f.add('far', [4]);
  f.loader.update({ x: 0, z: 0 }).start(); f.drain();
  assert.equal(f.loader.isReady(4), false);
  assert.equal(f.loader.state().idle, true);
  assert.equal(f.frames.size, 0, 'idle loading schedules no frames');
  f.loader.update({ x: 200, z: 0 }); f.drain();
  assert.equal(f.loader.isReady(4), true);
});

test('travel preempts an in-progress background iterator and resumes it without duplicate work', async () => {
  const f = fixture({ nearbyOnly: true });
  f.add('near', [2], 8); f.add('far', [4], 1);
  f.loader.update({ x: 0, z: 0 }).start(); f.frame();
  const ready = f.loader.ensureRegion(4); f.frame();
  assert.equal(f.visits[2], 'far:0');
  f.drain(); await ready;
  assert.equal(f.visits.filter(v=>v.startsWith('near:')).length, 8);
  assert.equal(new Set(f.visits).size, f.visits.length);
});

test('dependencies outside the nearby ring load, while unrelated distant regions stay queued', async () => {
  const f = fixture({ nearbyOnly: true });
  f.add('foundation', [4]); f.add('near', [2], 1, { dependencies: ['foundation'] }); f.add('unrelated', [8]);
  f.loader.update({ x: 0, z: 0 }).start(); f.drain();
  assert.equal(f.loader.isReady(2), true); assert.equal(f.loader.isReady(4), true);
  assert.equal(f.loader.isReady(8), false);
  f.loader.preloadAll(); f.drain(); assert.equal(f.loader.isReady(8), true);
});

test('turning away pauses unwanted work without marking it failed', () => {
  const f = fixture({ nearbyOnly: true, regionAt: x => ({id: x > 100 ? 4 : 1}) });
  f.add('near', [2], 8); f.add('far', [4], 1);
  f.loader.update({x:0,z:0}).start(); f.frame();
  f.loader.update({x:200,z:0}); f.drain();
  assert.equal(f.loader.state().jobs.find(j=>j.id==='near').status, 'loading');
  assert.equal(f.loader.state().idle, true);
  f.loader.update({x:0,z:0}); f.drain();
  assert.equal(f.loader.isReady(2), true);
});

test('fast flight prepares regions ahead even beyond immediate neighbors', () => {
  const f = fixture({ nearbyOnly: true, regionAt: x => ({id:x>500?9:1}) });
  f.add('ahead', [9]); f.add('elsewhere', [10]);
  f.loader.update({x:0,z:0},{x:1,z:0},240).start(); f.drain();
  assert.equal(f.loader.isReady(9), true); assert.equal(f.loader.isReady(10), false);
});


test('gradual turning while stationary replans the flight lookahead', () => {
  const f = fixture({ nearbyOnly: true, regionAt: x => ({id:x>500?9:1}) });
  f.add('ahead', [9]);
  f.loader.update({x:0,z:0},0,240).start(); f.drain();
  assert.equal(f.loader.isReady(9), false);
  for(let angle=.1;angle<1.6;angle+=.1) f.loader.update({x:0,z:0},angle,240);
  f.drain(); assert.equal(f.loader.isReady(9), true);
});

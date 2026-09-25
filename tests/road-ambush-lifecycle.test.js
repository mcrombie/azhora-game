import test from 'node:test';
import assert from 'node:assert/strict';
import { createCombat } from '../src/combat.js';
import { AMBUSH, AMBUSH_REBELS, createRoadAmbush, validateRoadAmbushSnapshot } from '../src/road-ambush.js';
import { createRoadAmbushHost } from '../src/road-ambush-host.js';

const base = { id: 'caloss-rebels', center: AMBUSH.point,
  checkpoint: { x: -92, z: 40 }, retreatAxis: 'x', retreatLine: -80,
  enemies: AMBUSH_REBELS.map(one => ({ ...one, ...one.home })) };
function fixture() {
  const position = { x: -76, y: 1.5, z: 40 }, events = [], history = [];
  const world = { bounds: { minX: -500, maxX: 500, minZ: -500, maxZ: 500 }, colliders: [], heightAt: () => 1.5 };
  const ambush = createRoadAmbush({ seed: 19 });
  const combat = createCombat({ world, position, onEvent: event => events.push(event) });
  const host = createRoadAmbushHost({ ambush, combat, encounter: base, position: () => position });
  const flush = () => { while (events.length) { const event = events.shift(); history.push(event); host.combatEvent(event); } };
  const step = () => { combat.update(1 / 60); flush(); host.update(1 / 60); flush(); };
  const until = (done, seconds = 40) => {
    for (let i = 0; i < seconds * 60 && !done(); i++) step();
    assert.ok(done(), `Condition did not resolve in ${seconds} seconds: ${JSON.stringify({ phase: combat.state.phase, allies: combat.state.allies, events: history.slice(-8) })}`);
  };
  return { ambush, combat, host, position, history, flush, step, until };
}

test('a witnessed ambush ends when Chris falls; the same wounded men return and ambush again', () => {
  const f = fixture();
  assert.ok(f.host.start({ partyIds: ['gotwood'], allies: [{ id: 'merc-gotwood', kind: 'villager', name: 'Chris Scotwood', x: -106, z: 40, currentHp: 1 }] }));
  f.combat.spellHit('rebel-lane', 37, { source: 'ally', sourceId: 'merc-gotwood' }); f.flush();
  f.until(() => f.history.some(e => e.type === 'ally-down' && e.id === 'merc-gotwood'));
  assert.equal(f.combat.state.phase, 'peaceful', 'the enemies do not pursue a distant observer forever');
  assert.equal(f.ambush.alive, true, 'killing their quarry does not clear the ambush');
  assert.equal(f.ambush.fell('merc-gotwood'), true);
  assert.ok(f.ambush.state.settled.includes('gotwood'), 'Chris does not walk into a second statistical outcome');
  assert.ok(f.ambush.actors().some(one => one.mode === 'returning'));
  assert.equal(f.ambush.actors()[0].hp, 83, 'the cut Chris landed is remembered');
  f.until(() => f.ambush.ready);
  f.position.x = -106;
  assert.ok(f.host.start({ player: true }));
  assert.deepEqual(f.combat.state.enemies.map(e => e.id), AMBUSH_REBELS.map(e => e.id));
  assert.equal(f.combat.state.enemies[0].hp, 83, 'the second encounter does not heal the ambusher');
});

test('retreat, save and reload keep a slain ambusher dead and the surviving injuries', () => {
  const f = fixture(); f.position.x = -106;
  assert.ok(f.host.start({ player: true }));
  f.combat.spellHit('rebel-lane', 1000); f.combat.spellHit('rebel-hedge', 41); f.flush();
  f.position.x = -50; f.step();
  assert.equal(f.combat.state.phase, 'peaceful');
  assert.equal(f.ambush.state.rebels, 2);
  const save = f.ambush.snapshot(); assert.equal(validateRoadAmbushSnapshot(save), true);
  assert.ok(f.ambush.restore(JSON.parse(JSON.stringify(save))));
  f.host.reset(); f.until(() => f.ambush.ready);
  f.position.x = -106; assert.ok(f.host.start({ player: true }));
  assert.deepEqual(f.combat.state.enemies.map(e => e.id), ['rebel-hedge', 'rebel-stone']);
  assert.equal(f.combat.state.enemies[0].hp, 79);
  for (const enemy of [...f.combat.state.enemies]) f.combat.spellHit(enemy.id, 1000);
  f.flush();
  assert.equal(f.ambush.alive, false, 'the road clears only when the final living ambusher dies');
  assert.equal(f.host.start({ player: true }), false, 'the completed event never respawns enemies');
  f.ambush.remember(AMBUSH_REBELS.map(e => ({ ...e, ...e.home })));
  assert.equal(f.ambush.alive, false, 'stale full-health combat data cannot resurrect any identity');
});

test('a fight interrupted by loading saves the injury and returns surviving people on foot', () => {
  const f = fixture(); f.position.x = -106; f.host.start({ player: true });
  f.combat.spellHit('rebel-stone', 26); f.flush(); f.host.remember();
  const loaded = createRoadAmbush(); assert.ok(loaded.restore(f.ambush.snapshot()));
  assert.equal(loaded.actors()[2].hp, 94);
  assert.ok(loaded.actors().every(one => one.mode === 'returning'));
  const one = loaded.actors()[2];
  loaded.update(.1);
  assert.ok(Math.hypot(loaded.actors()[2].x - one.x, loaded.actors()[2].z - one.z) <= .221,
    'returning actors move by their walking speed, never teleport to cover');
});

test('legacy ambush saves migrate once, and malformed persistent identities are rejected atomically', () => {
  const ambush = createRoadAmbush();
  const legacy = { version: 1, seed: 1, rebels: 0, settled: ['riders'], fallen: [], sprung: true };
  assert.ok(ambush.restore(legacy));
  assert.ok(ambush.actors().every(one => one.mode === 'dead' && one.hp === 0));
  const saved = ambush.snapshot(), malformed = structuredClone(saved);
  malformed.ambushers[0].hp = 120;
  assert.equal(ambush.restore(malformed), false);
  assert.deepEqual(ambush.snapshot(), saved);
  const fresh = createRoadAmbush(); fresh.reach('gotwood');
  assert.ok(fresh.actors().every(one => one.hp < one.maxHp && one.hp > 0), 'offscreen victims do not leave three factory-fresh attackers');
});

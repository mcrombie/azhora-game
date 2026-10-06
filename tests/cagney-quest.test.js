import {inAmbronOutline} from '../src/content/regions/ambron/ambron-city-layout.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import { CAGNEY, CAGNEY_START, CAGNEY_HOME, CAGNEY_ROUTE, CAGNEY_AMBUSH, CAGNAPPERS, CAGNEY_WAVES, ALL_CAGNAPPERS,
  CAGNEY_QUEST, CAGNEY_HEALTH, createCagneyQuest, validateCagneySnapshot, cagneyGuideTarget, cagneyWave } from '../src/content/quests/cagney/cagney-quest.js';
import { regionAt } from '../src/world/terrain/region-world.js';

test('Cagney only pays once after surviving the cagnappers and reaching her home', () => {
  const quest = createCagneyQuest();
  assert.equal(quest.take(), 0);
  quest.ask(); assert.ok(quest.accept());
  assert.equal(quest.arrive(CAGNEY_HOME), false, 'The ambush cannot be skipped by teleporting her home');
  for (const wave of CAGNEY_WAVES) {
    assert.equal(quest.state.currentWave.id, wave.id);
    assert.ok(quest.begin());
    assert.ok(quest.settle({ hp: 60, enemies: [0, 0, 0] }));
    if (wave.index < 2) assert.equal(quest.arrive(CAGNEY_HOME), false, 'every gang has to be beaten');
  }
  assert.equal(quest.state.ambushCleared, true); assert.equal(quest.state.currentWave, null);
  assert.equal(quest.arrive(CAGNEY_START), false);
  assert.ok(quest.arrive(CAGNEY_HOME));
  assert.equal(quest.take(), CAGNEY_QUEST.reward);
  assert.equal(quest.take(), 0);
  assert.equal(quest.state.over, true);
  assert.equal(quest.accept(), false);
});

test('a retreat or saved encounter preserves health, casualties and walking progress', () => {
  const quest = createCagneyQuest(); quest.accept();
  quest.rememberWalk({ x: -930, z: 202, waypoint: 7, waiting: false });
  quest.begin(); quest.settle({ hp: 42, enemies: [0, 17, 48] }); quest.begin();
  const saved = quest.snapshot(), loaded = createCagneyQuest();
  assert.ok(loaded.restore(saved));
  assert.equal(loaded.state.stage, 'escorting');
  assert.equal(loaded.state.hp, 42);
  assert.deepEqual(loaded.state.enemies, [0, 17, 48]);
  assert.deepEqual(loaded.state.walk, saved.walk);
  saved.enemies[1] = 0; saved.walk.x = 999;
  assert.equal(loaded.state.enemies[1], 17);
  assert.equal(loaded.state.walk.x, -930);
  assert.ok(loaded.begin(), 'The surviving attackers can resume without reviving the fallen one');
});

test('capture and death fail the escort and never grant a reward', () => {
  for (const dead of [false, true]) {
    const quest = createCagneyQuest(); quest.accept(); quest.begin();
    assert.ok(quest.settle({ hp: 0, dead }));
    assert.equal(quest.state.stage, dead ? 'dead' : 'captured');
    assert.equal(quest.arrive(CAGNEY_HOME), false);
    assert.equal(quest.take(), 0);
    assert.equal(quest.begin(), false);
    assert.ok(validateCagneySnapshot(quest.snapshot()));
  }
});

test('saving during combat records actual injuries without ending the active fight', () => {
  const quest = createCagneyQuest(); quest.accept(); quest.begin();
  assert.ok(quest.rememberBattle({ hp: 37, enemies: [0, 9, 48] }));
  assert.equal(quest.state.stage, 'ambushed');
  const loaded = createCagneyQuest(); assert.ok(loaded.restore(quest.snapshot()));
  assert.equal(loaded.state.stage, 'escorting');
  assert.equal(loaded.state.hp, 37); assert.deepEqual(loaded.state.enemies, [0, 9, 48]);
  assert.ok(loaded.begin());
});

test('defeating the gang after Cagney is lost records their deaths without restoring the escort', () => {
  const quest = createCagneyQuest(); quest.accept(); quest.begin(); quest.settle({ hp: 0 });
  assert.ok(quest.rememberEnemies([0, 0, 0]));
  assert.equal(quest.state.stage, 'captured'); assert.equal(quest.state.ambushCleared, false, 'the gangs further on were never met');
  assert.equal(quest.take(), 0); assert.equal(quest.accept(), false);
  const loaded = createCagneyQuest(); assert.ok(loaded.restore(quest.snapshot()));
  assert.deepEqual(loaded.state.enemies, [0, 0, 0]);
});

test('Cagney leads west but waits for the traveler rather than following them off the road', () => {
  const at = CAGNEY_ROUTE[2];
  const close = cagneyGuideTarget(at, { x: at.x + 3, z: at.z }, { waypoint: 2 });
  assert.equal(close.progress.waypoint, 3);
  assert.ok(close.target.x < at.x);
  const far = cagneyGuideTarget(at, { x: at.x + 25, z: at.z }, { waypoint: 2 });
  assert.ok(far.progress.waiting); assert.deepEqual(far.target, at);
  const returnToHer = cagneyGuideTarget(at, { x: at.x + 6, z: at.z }, far.progress);
  assert.equal(returnToHer.progress.waiting, false);
});

test('the cagnappers wait after the roadside hamlet, outside Ambron', () => {
  assert.equal(CAGNAPPERS.length, 3);
  for (const enemy of CAGNAPPERS) assert.equal(regionAt(enemy.x, enemy.z)?.name, 'Elagos');
  assert.equal(regionAt(CAGNEY_AMBUSH.center.x, CAGNEY_AMBUSH.center.z)?.name, 'Elagos');
  assert.ok(CAGNEY_ROUTE.some(p => p.x < CAGNEY_AMBUSH.center.x && regionAt(p.x, p.z)?.name === 'Elagos'));
  assert.equal(CAGNEY.look.hat, false); assert.equal(CAGNEY.look.glasses, true);
  assert.equal(CAGNEY.look.hairStyle, 'long'); assert.equal(CAGNEY.look.shirtRibbons, true);
});

test('invalid and contradictory saves are rejected without changing the live quest', () => {
  const quest = createCagneyQuest(); quest.accept(); const before = quest.snapshot();
  for (const data of [{ ...before, hp: NaN }, { ...before, stage: 'complete' }, { ...before, enemies: [0, 0, 0] },
    { ...before, walk: { ...before.walk, waypoint: 1000 } }, { ...before, enemies: [48, 48] }]) {
    assert.equal(quest.restore(data), false); assert.deepEqual(quest.snapshot(), before);
  }
});

/**
 * Two more waves (the user, 26 September 2026): one midway between the start and the first gang
 * anybody met, one midway between that gang and her door.
 */
const RUNS = [0];
for (let i = 1; i < CAGNEY_ROUTE.length; i++) RUNS.push(RUNS[i - 1] + Math.hypot(CAGNEY_ROUTE[i].x - CAGNEY_ROUTE[i - 1].x, CAGNEY_ROUTE[i].z - CAGNEY_ROUTE[i - 1].z));
function arcOf(p) {
  let best = { distance: Infinity, arc: 0 };
  for (let i = 1; i < CAGNEY_ROUTE.length; i++) {
    const a = CAGNEY_ROUTE[i - 1], b = CAGNEY_ROUTE[i], dx = b.x - a.x, dz = b.z - a.z, l2 = dx * dx + dz * dz || 1;
    const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.z - a.z) * dz) / l2)), distance = Math.hypot(a.x + dx * t - p.x, a.z + dz * t - p.z);
    if (distance < best.distance) best = { distance, arc: RUNS[i - 1] + Math.sqrt(l2) * t };
  }
  return best;
}

test('three concealed gangs wait in order between the hamlet and the city gates', () => {
  assert.equal(CAGNEY_WAVES.length, 3);
  assert.equal(CAGNEY_WAVES[1], cagneyWave(CAGNEY_AMBUSH.id), 'the first gang anybody met is the middle one');
  assert.equal(CAGNEY_WAVES[1].enemies, CAGNAPPERS);
  const start = arcOf(CAGNEY_START).arc, middle = arcOf(CAGNEY_AMBUSH.center).arc, end = RUNS.at(-1);
  const [first, , last] = CAGNEY_WAVES.map(wave => arcOf(wave.center));
  assert.ok(first.distance < .01 && last.distance < .01, 'on the road itself');
  assert.ok(first.arc > start + 20 && first.arc < middle - 20, 'the first attack gives the escort time to leave the hamlet');
  assert.ok(last.arc > middle + 20 && last.arc < end - 100, 'the last gang is fought before the quiet walk through the city');
  for(const wave of CAGNEY_WAVES)assert.equal(inAmbronOutline(wave.center.x,wave.center.z),false,'no ambushers appear inside the protected city');
  assert.equal(new Set(ALL_CAGNAPPERS.map(e => e.id)).size, 9, 'nine different men');
  assert.equal(new Set(CAGNEY_WAVES.map(w => w.id)).size, 3);
  for (const wave of CAGNEY_WAVES) {
    assert.equal(wave.enemies.length, 3);
    assert.deepEqual(wave.enemies.map(e => e.entry), [.3, 1.8, 3.3], 'they break from cover one after another');
    // She is held short of a gang once her next waypoint is past it.
    assert.ok(arcOf(CAGNEY_ROUTE[wave.waypoint]).arc > arcOf(wave.center).arc);
    assert.ok(arcOf(CAGNEY_ROUTE[wave.waypoint - 1]).arc <= arcOf(wave.center).arc);
    for (const foe of wave.enemies) {
      const off = Math.abs((foe.x - wave.center.x) * wave.forward.dz - (foe.z - wave.center.z) * wave.forward.dx);
      assert.ok(off > 6 && off < 9, `${foe.id} waits in cover beside the road, not on it`);
    }
    const back = (wave.checkpoint.x - wave.center.x) * wave.forward.dx + (wave.checkpoint.z - wave.center.z) * wave.forward.dz;
    assert.ok(back < -20, 'the retry point is back up the road');
  }
  assert.ok(CAGNEY_WAVES.every((wave, i) => i === 0 || wave.waypoint >= CAGNEY_WAVES[i - 1].waypoint));
  assert.equal(regionAt(CAGNEY_WAVES[0].center.x, CAGNEY_WAVES[0].center.z)?.name, 'Luscia');
  assert.equal(regionAt(CAGNEY_WAVES[2].center.x, CAGNEY_WAVES[2].center.z)?.name, 'Elagos');
});

test('a beaten gang lets the next one in at full health, and a half-beaten one keeps its wounds', () => {
  const quest = createCagneyQuest(); quest.accept();
  assert.equal(quest.state.wave, 0);
  quest.begin(); quest.settle({ hp: 70, enemies: [0, 20, 48] });
  assert.equal(quest.state.wave, 0); assert.deepEqual(quest.state.enemies, [0, 20, 48]);
  assert.equal(quest.state.hp, 70, 'a fight broken off is not a gang beaten: her wounds stay');
  quest.begin(); quest.settle({ hp: 61, enemies: [0, 0, 0] });
  assert.equal(quest.state.wave, 1); assert.deepEqual(quest.state.enemies, [48, 48, 48]);
  assert.equal(quest.state.hp, CAGNEY_HEALTH, 'she binds her cuts before the next gang');
  assert.equal(quest.state.currentWave, CAGNEY_WAVES[1]);
  assert.match(quest.trackableView().detail, /2 gangs of cagnappers are still waiting/);
  // Saved the moment the last man of a gang fell, the gang is beaten on loading.
  quest.begin(); assert.ok(quest.rememberBattle({ hp: 50, enemies: [0, 0, 0] }));
  const loaded = createCagneyQuest(); assert.ok(loaded.restore(quest.snapshot()));
  assert.equal(loaded.state.stage, 'escorting'); assert.equal(loaded.state.wave, 2); assert.deepEqual(loaded.state.enemies, [48, 48, 48]);
  assert.match(loaded.trackableView().detail, /1 gang of cagnappers is still waiting/);
});

test('saves from before the extra gangs keep their place on the road', () => {
  const v1 = (stage, cleared, enemies, waypoint) => ({ version: 1, stage, ambushCleared: cleared, hp: stage === 'captured' || stage === 'dead' ? 0 : 60, enemies,
    walk: { ...CAGNEY_ROUTE[waypoint], waypoint, waiting: false } });
  const loaded = saved => { const quest = createCagneyQuest(); assert.ok(quest.restore(saved), JSON.stringify(saved)); return quest.state; };
  // Not yet at the first gang: all three still ahead.
  assert.equal(loaded(v1('escorting', false, [48, 48, 48], 0)).wave, 0);
  // Past where the new first gang waits but not through the old one: that one is next, wounds and all.
  const between = CAGNEY_WAVES[0].waypoint;
  const midway = loaded(v1('escorting', false, [0, 30, 48], between));
  assert.equal(midway.wave, 1); assert.deepEqual(midway.enemies, [0, 30, 48]);
  // Through the old one: the last gang is still to come.
  const through = loaded(v1('escorting', true, [0, 0, 0], CAGNEY_WAVES[1].waypoint));
  assert.equal(through.wave, 2); assert.deepEqual(through.enemies, [48, 48, 48]);
  // Home or paid: all done.
  for (const stage of ['home', 'complete']) {
    const done = loaded(v1(stage, true, [0, 0, 0], CAGNEY_ROUTE.length - 1));
    assert.equal(done.wave, 3); assert.equal(done.ambushCleared, true);
  }
  assert.equal(loaded(v1('captured', false, [0, 12, 48], between)).stage, 'captured');
  assert.equal(validateCagneySnapshot(v1('escorting', true, [0, 12, 48], 0)), false, 'a v1 save that contradicts itself');
});

test('Cagney runs home, a little slower than the traveler can', () => {
  assert.ok(CAGNEY_QUEST.pace > 4.2, 'faster than the traveler walks');
  assert.ok(CAGNEY_QUEST.pace < 7.2 && CAGNEY_QUEST.pace > 6, 'a little slower than the traveler runs');
  assert.equal(cagneyGuideTarget(CAGNEY_ROUTE[2], CAGNEY_ROUTE[2], { waypoint: 2 }).pace, CAGNEY_QUEST.pace);
});

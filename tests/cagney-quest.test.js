import test from 'node:test';
import assert from 'node:assert/strict';
import { CAGNEY, CAGNEY_START, CAGNEY_HOME, CAGNEY_ROUTE, CAGNEY_AMBUSH, CAGNAPPERS,
  CAGNEY_QUEST, createCagneyQuest, validateCagneySnapshot, cagneyGuideTarget } from '../src/cagney-quest.js';
import { regionAt } from '../src/region-world.js';

test('Cagney only pays once after surviving the cagnappers and reaching her home', () => {
  const quest = createCagneyQuest();
  assert.equal(quest.take(), 0);
  quest.ask(); assert.ok(quest.accept());
  assert.equal(quest.arrive(CAGNEY_HOME), false, 'The ambush cannot be skipped by teleporting her home');
  assert.ok(quest.begin());
  assert.ok(quest.settle({ hp: 60, enemies: [0, 0, 0] }));
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
  assert.equal(quest.state.stage, 'captured'); assert.equal(quest.state.ambushCleared, true);
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

test('the three cagnappers wait on the Luscian side before the west road enters Elagos', () => {
  assert.equal(CAGNAPPERS.length, 3);
  for (const enemy of CAGNAPPERS) assert.equal(regionAt(enemy.x, enemy.z)?.name, 'Luscia');
  assert.equal(regionAt(CAGNEY_AMBUSH.center.x, CAGNEY_AMBUSH.center.z)?.name, 'Luscia');
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

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import * as THREE from '../vendor/three.module.js';
import { sourceModule } from './module-loader.js';
import { canStand, canSwim, moveCharacter, WATERLINE } from '../src/game-state.js';
import { WORD_BEACH, WORD_SWIM as WORD_CROSSING } from '../src/word-arrival.js';
const WORD_SWIM_FROM = WORD_CROSSING.from;
import { createSkills } from '../src/skills.js';
import {
  SWIM, SWIMMING_SKILL, SWIMMING_LESSON, SWIM_XP, swimSpeed, swimDrain, swimReach, swimGrace, swimRange,
  levelForCrossing, levelForDryCrossing, swimStep, createSwimming, validateSwimmingSnapshot,
} from '../src/swimming.js';

const source = name => readFileSync(fileURLToPath(new URL(`../src/${name}`, import.meta.url)), 'utf8');

let world = null;
const built = async () => (world ??= (async () => {
  const { createWorld } = await sourceModule('../src/world.js');
  return createWorld(new THREE.Scene());
})());

/**
 * The crossings docs/swimming.md is tuned against, measured shore to shore rather than taken from
 * the hex outlines. `shoreOf` is the same flood the table was made with: standable ground with
 * water inside three metres.
 */
const CHAIN = [
  { from: 'Drent', to: 'pilots-stone', metres: 61.3, survives: 1, dry: 7 },
  { from: 'pilots-stone', to: 'gull-scarp', metres: 98.0, survives: 25, dry: 43 },
  { from: 'gull-scarp', to: 'cobble-island', metres: 59.8, survives: 1, dry: 4 },
  { from: 'Drent', to: 'cobble-island', metres: 354.8, survives: null, dry: null },
];

test('the waterline divides the world in two, and nothing is on both sides of it', async () => {
  const w = await built();
  assert.equal(WATERLINE, 0.45, 'the number canStand always used');
  let land = 0, water = 0, solid = 0;
  for (let x = -120; x <= 360; x += 17) for (let z = 120; z <= 560; z += 17) {
    const stands = canStand(x, z, w, .34), swims = canSwim(x, z, w, .34);
    assert.ok(!(stands && swims), `(${x}, ${z}) is both ground and water`);
    if (stands) land++; else if (swims) water++; else solid++;
  }
  assert.ok(land > 100 && water > 100, `the sample found ${land} of land and ${water} of water`);
  // Out of bounds is neither.
  assert.equal(canStand(1e6, 0, w), false);
  assert.equal(canSwim(1e6, 0, w), false);
});

test('the flag is what opens the waterline, and without it a body is stopped at it', async () => {
  const w = await built();
  // A point in the sea east of Tidehaven, and the beach behind it.
  let wet = null;
  for (let x = 60; x < 200 && !wet; x += 2) if (canSwim(x, 300, w, .34)) wet = { x, z: 300 };
  assert.ok(wet, 'there is sea off the Drent coast');
  const walker = { x: wet.x - 8, z: wet.z }, swimmer = { x: wet.x - 8, z: wet.z };
  for (let i = 0; i < 40; i++) moveCharacter(walker, 1, 0, w, .34);
  assert.ok(!canSwim(walker.x, walker.z, w, .34), 'without the flag the primitive stops at the line');
  for (let i = 0; i < 40; i++) moveCharacter(swimmer, 1, 0, w, .34, { swimming: true });
  assert.ok(swimmer.x > walker.x, `with it a body goes on past where the ground stops (${walker.x.toFixed(1)} to ${swimmer.x.toFixed(1)})`);
});

test('a traveler on his own two feet can walk off a beach into the sea', async () => {
  // The bug this is here for: the game moved the traveler with `{swimming: inWater}`, and
  // `inWater` only became true once he was already wet. From dry land that is a closed loop, so
  // the sea was shut to anybody who had not been warped into it - while docs/swimming.md said
  // "walk in, there is no prompt and no key". This walks a body from real dry ground through
  // the same call src/main.js makes, and fails if the loop ever closes again.
  const w = await built();
  const beach = { x: WORD_BEACH.x, z: WORD_BEACH.z };
  assert.ok(canStand(beach.x, beach.z, w, .34), 'he starts on the strand Ed comes out on');
  const walk = (swimming) => {
    const p = { ...beach };
    let inWater = false, metres = 0;
    for (let frame = 0; frame < 900; frame++) {
      const before = { ...p };
      // Exactly main.js: move first, then let swimTick decide whether he is wet.
      moveCharacter(p, 4.2 / 30, 0, w, undefined, { swimming: swimming === 'always' ? true : inWater });
      inWater = canSwim(p.x, p.z, w, .34);
      metres += Math.hypot(p.x - before.x, p.z - before.z);
      if (inWater) break;
    }
    return { inWater, metres, ...p };
  };
  const now = walk('always');
  assert.equal(now.inWater, true, `he walks in: ${now.metres.toFixed(1)} m to (${now.x.toFixed(1)}, ${now.z.toFixed(1)})`);
  assert.ok(w.heightAt(now.x, now.z) < WATERLINE, 'and the ground under him is below the waterline');
  // The shape of the old bug, kept as the thing that must stay false.
  assert.equal(walk('inWater').inWater, false, 'passing the state back to itself is the closed loop');
  // And the game passes the flag unconditionally on foot.
  assert.match(source('main.js'), /moveCharacter\(player\.group\.position,dx,dz,playerWorld,undefined,\{swimming:true\}\)/,
    'the on-foot move opens the water every frame');
});

test('the crossings are where the doc says they are, shore to shore', async () => {
  const w = await built();
  const { PEBLOS_ISLANDS, islandAt } = await sourceModule('../src/peblos-world.js');
  const shoreOf = (test, box, step = 3) => {
    const pts = [];
    for (let x = box.minX; x <= box.maxX; x += step) for (let z = box.minZ; z <= box.maxZ; z += step) {
      if (!test(x, z) || !canStand(x, z, w, .34)) continue;
      if ([[step, 0], [-step, 0], [0, step], [0, -step]].some(([dx, dz]) => !canStand(x + dx, z + dz, w, .34))) pts.push({ x, z });
    }
    return pts;
  };
  const gap = (a, b) => {
    let best = Infinity;
    for (const p of a) for (const q of b) best = Math.min(best, Math.hypot(p.x - q.x, p.z - q.z));
    return best;
  };
  const shores = { Drent: shoreOf((x, z) => islandAt(x, z) === null, { minX: -120, maxX: 140, minZ: 120, maxZ: 560 }) };
  for (const island of PEBLOS_ISLANDS) {
    const xs = island.cells.map(c => c.x), zs = island.cells.map(c => c.z);
    shores[island.id] = shoreOf((x, z) => islandAt(x, z) === island,
      { minX: Math.min(...xs) - 90, maxX: Math.max(...xs) + 90, minZ: Math.min(...zs) - 90, maxZ: Math.max(...zs) + 90 });
  }
  for (const hop of CHAIN) {
    assert.ok(shores[hop.from]?.length && shores[hop.to]?.length, `${hop.from} and ${hop.to} both have a shore`);
    const measured = gap(shores[hop.from], shores[hop.to]);
    assert.ok(Math.abs(measured - hop.metres) < 1.5,
      `${hop.from} to ${hop.to} is ${measured.toFixed(1)} m; docs/swimming.md says ${hop.metres} m`);
  }
});

test('the curve makes the nearest skerry a scrape, the long hop a gate, and the open crossing impossible', () => {
  for (const hop of CHAIN) {
    assert.equal(levelForCrossing(hop.metres), hop.survives, `${hop.from} to ${hop.to}: survivable from`);
    assert.equal(levelForDryCrossing(hop.metres), hop.dry, `${hop.from} to ${hop.to}: on wind alone from`);
  }
  // Level 1 reaches the nearest skerry, and arrives having drowned for a second and a half.
  const nearest = CHAIN[0].metres;
  assert.ok(swimReach(1) < nearest, `a full bar is ${swimReach(1).toFixed(1)} m, which is less than the crossing`);
  assert.ok(swimRange(1) > nearest, 'and the drowning makes up the difference');
  let wind = SWIM.wind, health = 100, metres = 0;
  while (metres < nearest && health > 0) {
    const step = swimStep({ dt: 1 / 30, level: 1, wind, health });
    wind = step.wind; health = step.health; metres += step.metres;
  }
  assert.ok(health > 70 && health < 90, `he lands with ${health.toFixed(0)} health: bruised, not dead`);
  // Nobody ever swims the open crossing, at any level, on any amount of health.
  assert.ok(swimRange(99) < CHAIN[3].metres, `${swimRange(99).toFixed(0)} m at 99 against ${CHAIN[3].metres} m of water`);
  // The two lines, and their product.
  assert.ok(swimSpeed(99) > swimSpeed(1) && swimDrain(99) < swimDrain(1));
  assert.ok(swimReach(99) / swimReach(1) > 4.5, 'the bar carries nearly five times as far at the top');
  for (const bad of [0, -5, 1000, NaN, null, 'seven']) assert.ok(Number.isFinite(swimSpeed(bad)), String(bad));
});

test('a frame in the water spends wind, and only drowns once the wind is gone', () => {
  const easy = swimStep({ dt: 1, level: 1, wind: 100, health: 100 });
  assert.deepEqual([easy.drowning, easy.damage, Math.round(easy.wind)], [false, 0, 96]);
  assert.ok(Math.abs(easy.metres - swimSpeed(1)) < 1e-9, 'one second is one second of swimming');
  // The frame the wind runs out in is only partly drowning.
  const edge = swimStep({ dt: 1, level: 1, wind: 2, health: 100 });
  assert.equal(edge.drowning, true);
  assert.ok(edge.damage > 0 && edge.damage < SWIM.drown, `half a second of drowning is ${edge.damage.toFixed(1)}, not a whole ${SWIM.drown}`);
  assert.equal(edge.wind, 0);
  // Drowning outright.
  const under = swimStep({ dt: 1, level: 1, wind: 0, health: 50 });
  assert.deepEqual([under.drowning, under.damage, under.health], [true, SWIM.drown, 50 - SWIM.drown]);
  // It never takes more than is there.
  assert.equal(swimStep({ dt: 100, level: 1, wind: 0, health: 7 }).health, 0);
  // A frame with no length does nothing at all.
  for (const dt of [0, -1, NaN, undefined]) {
    const still = swimStep({ dt, level: 1, wind: 40, health: 80 });
    assert.deepEqual([still.metres, still.damage, still.wind, still.health], [0, 0, 40, 80]);
  }
});

test('the skill is paid for metres, for waters crossed, and for the Pebbles', () => {
  const heard = [], skills = createSkills();
  const swimming = createSwimming({ skills, onEvent: event => heard.push(event.type) });
  assert.equal(swimming.swam(100).xp, 0, 'nothing counts before Ed has shown you');
  assert.equal(swimming.crossed('Drent to Peblos').first, false, 'nor a crossing made blind');
  assert.equal(swimming.reachedPeblos().first, false, 'nor the Pebbles');
  assert.equal(swimming.metres, 0, 'and the record is not written, so it all still pays once he knows how');
  assert.equal(skills.known(SWIMMING_SKILL), false);
  assert.equal(swimming.learn().first, true);
  assert.equal(swimming.learn().first, false);
  assert.equal(skills.known(SWIMMING_SKILL), true);
  // One point per four metres, paid as they accumulate and never paid twice.
  assert.equal(swimming.swam(3).xp, 0);
  assert.equal(swimming.swam(1).xp, 1, 'the fourth metre pays');
  assert.equal(swimming.swam(20).xp, 5);
  assert.equal(swimming.swam(0).xp, 0);
  assert.equal(swimming.swam(-5).xp, 0);
  const crossing = swimming.crossed('Drent to Peblos');
  assert.deepEqual([crossing.first, crossing.xp], [true, SWIM_XP.water]);
  assert.equal(swimming.crossed('Drent to Peblos').first, false, 'a water is crossed for the first time once');
  assert.equal(swimming.crossed('').first, false);
  const pebbles = swimming.reachedPeblos();
  assert.deepEqual([pebbles.first, pebbles.xp], [true, SWIM_XP.peblos]);
  assert.equal(swimming.reachedPeblos().first, false);
  assert.deepEqual(heard, ['swimming-learned', 'water-crossed', 'peblos-swum']);
  assert.ok(skills.level(SWIMMING_SKILL) > 1, `he is level ${skills.level(SWIMMING_SKILL)} after all that`);
  // And it survives the road.
  const saved = swimming.snapshot(), copy = createSwimming({ skills: createSkills() });
  assert.equal(validateSwimmingSnapshot(saved), true);
  assert.equal(validateSwimmingSnapshot(undefined), true, 'older saves never went in the water');
  assert.equal(copy.restore(saved), true);
  assert.deepEqual([copy.taught, copy.peblos, copy.waters], [true, true, ['Drent to Peblos']]);
  assert.equal(copy.swam(4).xp, 1, 'and what was already paid for is not paid for again');
  for (const bad of [null, [], { ...saved, version: 2 }, { ...saved, metres: -1 }, { ...saved, metres: 1e10 },
    { ...saved, waters: 'the sea' }, { ...saved, waters: [''] }, { ...saved, taught: 'yes' }, { ...saved, peblos: 1 }])
    assert.equal(validateSwimmingSnapshot(bad), false, JSON.stringify(bad));
});

test('drowning ends the way a goblin ends it: the same defeat, the same checkpoint', async () => {
  const { createCombat } = await sourceModule('../src/combat.js');
  const events = [];
  const combat = createCombat({ world: await built(), position: { x: 0, z: 0 }, onEvent: event => events.push(event) });
  combat.state.player.hp = 100; combat.state.player.stamina = 100;
  const spent = combat.exhaust(40, 0);
  assert.deepEqual([spent.stamina, spent.hp, spent.defeated], [60, 100, false]);
  // The bar does not fill itself back up while the water still has him.
  combat.update(1 / 30);
  assert.ok(combat.state.player.stamina <= 60.01, `the bar held at ${combat.state.player.stamina.toFixed(1)}`);
  const hurt = combat.exhaust(0, 40);
  assert.deepEqual([hurt.hp, hurt.defeated], [60, false]);
  const dead = combat.exhaust(0, 100);
  assert.deepEqual([dead.hp, dead.defeated, combat.state.phase], [0, true, 'defeated']);
  const defeat = events.find(event => event.type === 'defeat');
  assert.ok(defeat, 'it goes through the ordinary defeat');
  assert.equal(defeat.drowned, true, 'and says what did it');
  assert.equal(combat.exhaust(10, 10).defeated, true, 'a dead man cannot be drowned twice');
});

test('a drowned traveler does not wake up in somebody else’s fight', async () => {
  // The bug this is here for: `retry()` called `combat.resetEncounter({})`, which moves the
  // traveler to `lastEncounter.checkpoint` and *starts* `lastEncounter` - and that begins life
  // as DEFAULT_ENCOUNTER. A traveler who had never drawn on anybody, drowned at sea, came back
  // a hundred metres away in an active goblin raid with three live goblins in it.
  const { createCombat } = await sourceModule('../src/combat.js');
  const w = await built();
  const position = { x: WORD_SWIM_FROM.x, z: WORD_SWIM_FROM.z };
  const combat = createCombat({ world: w, position, onEvent: () => {} });
  assert.ok(canSwim(position.x, position.z, w, .34), 'he drowns in real water');
  assert.equal(combat.state.phase, 'peaceful', 'and he has never fought anybody');
  combat.exhaust(100, 200);
  assert.equal(combat.state.phase, 'defeated');
  // The old repair, kept as the thing that must not be used for a drowning.
  const shadow = createCombat({ world: w, position: { ...position }, onEvent: () => {} });
  shadow.exhaust(100, 200);
  shadow.resetEncounter({});
  assert.equal(shadow.state.phase, 'active', 'resetEncounter starts a fight, which is the whole bug');
  // What a drowning gets instead: on your feet, whole, with nothing happening and nobody moved.
  const back = combat.revive();
  assert.deepEqual([combat.state.phase, combat.state.enemies.length], ['peaceful', 0]);
  assert.deepEqual([back.hp, back.stamina], [100, 100], 'full health and a full bar of wind');
  assert.equal(combat.state.player.action, 'idle');
  assert.deepEqual([position.x, position.z], [WORD_SWIM_FROM.x, WORD_SWIM_FROM.z], 'revive moves nobody; the host does');
  // And the host puts him on the last dry ground, not at a checkpoint.
  const main = source('main.js');
  assert.match(main, /if\(drownedDefeat\)\{/, 'a drowning takes its own way out of the defeat panel');
  assert.match(main, /combat\.revive\(\);/, 'which revives rather than restarting a fight');
  assert.match(main, /const ashore=lastDry\?\?world\.spawn;/, 'and stands him on the last dry ground he was on');
  assert.match(main, /drownedDefeat=!!e\.drowned;/, 'the defeat says what did it and the host believes it');
  assert.match(main, /if\(!wet&&canStand\(p\.x,p\.z,playerWorld,\.34\)\)lastDry=/, 'which is remembered every dry frame');
});

test('getting wet in the middle of a fight resets nothing', async () => {
  // `swimTick` used to call `combat.resetEncounter({})` the moment the traveler got wet, which
  // carried him back to the fight's checkpoint with every goblin healed: stepping into a pond
  // undid a fight you were losing. It was never needed. Enemies move with `moveCharacter` and
  // no swimming flag, so the water stops them at the shore, and the 45 m leash ends a fight
  // properly for a traveler who swims away from it.
  const main = source('main.js');
  assert.doesNotMatch(main, /if\(combat\.state\.phase==='active'\)combat\.resetEncounter\(\{\}\);/,
    'nothing about water restarts a fight');
  const combatSource = source('combat.js');
  assert.doesNotMatch(combatSource, /moveCharacter\(enemy[^)]*swimming/, 'no enemy is given the water');
  assert.match(combatSource, /distance\(position, lastEncounter\.center\) > 45/, 'and the leash is what lets you leave');
  // A save is never written from the water, so no crossing can be reloaded with a fresh bar of
  // wind - which is also why the save holding health and not wind does not matter.
  assert.match(main, /combat\.state\.player\.hp<=0\|\|inWater\)\{if\(notify\)toast\('Step ashore/,
    'and no checkpoint is written while he is in it');
});

test('the checkpoint takes a save made in deep water, which is now the right answer', async () => {
  // Before swimming, a save in the sea was a save the traveler could never be restored to standing
  // on. Now it is a save in the middle of a crossing, and refusing it would be the bug.
  const { createRoadCheckpoint } = await sourceModule('../src/road-checkpoint.js');
  const checkpoint = source('road-checkpoint.js');
  assert.doesNotMatch(checkpoint, /canStand|canSwim|heightAt/, 'the checkpoint has no opinion about the ground under a save');
  assert.match(checkpoint, /validateSwimmingSnapshot\(data\.swimming\)/, 'it does have one about the swimming in it');
  assert.ok(typeof createRoadCheckpoint === 'function');
});

test('the game refuses the water to a rider, and a sword to a swimmer', () => {
  const main = source('main.js');
  assert.match(main, /const wet=canSwim\(p\.x,p\.z,playerWorld,\.34\);/, 'the water is what canSwim says it is');
  assert.match(main, /if\(riding\.mounted\)\{[\s\S]{0,400}He will not go in, and he is right/, 'a horse will not go in');
  assert.match(main, /if\(inWater\)\{toast\('Both your hands are busy/, 'and a swimmer cannot swing');
  assert.match(main, /riding\.mounted\|\|inWater\)return;/, 'nor dodge');
  assert.match(main, /const speed=inWater\?swimSpeed\(swimLevel\)/, 'and moves at his own pace once he is in');
  assert.match(main, /combat\.exhaust\(step\.spent,step\.damage\)/, 'the wind and the blood are combat’s');
  assert.match(main, /swimming:swimming\.snapshot\(\)/, 'and the skill is saved with the road');
  // He floats at the surface with a swimmer's posture, rather than walking the seabed.
  assert.match(main, /floor<WATERLINE\)\?WATERLINE-SWIM\.sink:/, 'the feet hang below the surface');
  assert.match(main, /swimming:inWater,riding:/, 'and the rig is told');
  assert.match(source('characters.js'), /if \(pose\.swimming\) \{/, 'which the rig has a posture for');
  assert.ok(SWIM.sink > .8 && SWIM.sink < 1.4, `sunk ${SWIM.sink} m: head and shoulders, not a periscope or a drowning`);
  // Nothing pushes him back to shore: that was the first draft and it was overruled.
  assert.doesNotMatch(main, /nearestStandable|pushBackToShore/, 'no free push back to land');
  assert.ok(SWIMMING_LESSON.length >= 4 && SWIMMING_LESSON.join(' ').includes('wind'), 'and somebody has words for it');
});

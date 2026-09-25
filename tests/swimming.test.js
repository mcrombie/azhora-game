import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import * as THREE from '../vendor/three.module.js';
import { sourceModule } from './module-loader.js';
import { canStand, canSwim, moveCharacter, WATERLINE } from '../src/game-state.js';
import { WORD_BEACH, WORD_SWIM as WORD_CROSSING } from '../src/word-arrival.js';
import { BODY } from '../src/bodies.js';
const WORD_SWIM_FROM = WORD_CROSSING.from;
import { createSkills } from '../src/skills.js';
import {
  SWIM, SWIMMING_SKILL, SWIMMING_LESSON, SWIM_XP, swimSpeed, swimDrain, swimReach, swimGrace, swimRange,
  levelForCrossing, levelForDryCrossing, swimStep, createSwimming, validateSwimmingSnapshot,
} from '../src/swimming.js';

const source = name => readFileSync(fileURLToPath(new URL(`../src/${name}`, import.meta.url)), 'utf8');
// Execute these small host boundaries with controlled dependencies. Matching
// their outer indentation keeps unrelated revive calls elsewhere out of a test.
const hostFunction = name => {
  const found = source('main.js').match(new RegExp(`^  function ${name}\\([^\\n]*\\)\\s*\\{[\\s\\S]*?^  \\}`, 'm'))?.[0];
  assert.ok(found, `${name} host boundary exists`);
  return found;
};

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

test('Willowmere uses its local surface and permits swimming from its fishing bank and back', async () => {
  const w = await built(), pond = w.fishingSpots.find(p => p.id === 'willowmere');
  assert.ok(pond, 'the authored fishing pond exists');
  assert.ok(pond.surfaceY > WATERLINE, 'the inland pond is above sea level');
  assert.equal(w.waterAt(pond.x, pond.z), pond.surfaceY);
  assert.ok(w.heightAt(pond.x, pond.z) < pond.surfaceY);
  assert.equal(canStand(pond.x, pond.z, w, BODY.traveler), false, 'its submerged bed is not walkable ground');
  assert.equal(canSwim(pond.x, pond.z, w, BODY.traveler), true);
  const bank = pond.fishingSpot, swimmer = { x: bank.x, z: bank.z };
  assert.ok(canStand(bank.x, bank.z, w, BODY.traveler), 'the fishing bank remains dry and accessible');
  function reach(target) {
    for (let i = 0; i < 200; i++) {
      const dx = target.x - swimmer.x, dz = target.z - swimmer.z, distance = Math.hypot(dx, dz);
      if (distance < .02) return;
      const step = Math.min(.1, distance);
      moveCharacter(swimmer, dx / distance * step, dz / distance * step, w, BODY.traveler, { swimming: true });
    }
    assert.fail(`swimmer stopped at (${swimmer.x}, ${swimmer.z}) before (${target.x}, ${target.z})`);
  }
  reach(pond);
  assert.ok(canSwim(swimmer.x, swimmer.z, w, BODY.traveler), 'walking from the bank enters real water');
  reach(bank);
  assert.ok(canStand(swimmer.x, swimmer.z, w, BODY.traveler), 'the swimmer can climb back onto the fishing bank');
  assert.ok(w.colliders.slice(0, 50).every(c => !canStand(c.x, c.z, w)), 'the native smoke sample no longer admits a walking player');
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
  assert.equal(skills.taught(SWIMMING_SKILL), false);
  assert.equal(swimming.learn().first, true);
  assert.equal(swimming.learn().first, false);
  assert.equal(skills.taught(SWIMMING_SKILL), true);
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
  assert.equal(shadow.resetEncounter({}),true,'resetting before any encounter accepts the default roster');
  assert.equal(shadow.state.phase, 'active', 'resetEncounter starts a fight, which is the whole bug');
  assert.equal(shadow.state.enemies.length,3,'the default raiders are instantiated');
  assert.deepEqual(shadow.state.allies,[],'an encounter with no authored allies starts without them');
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
  // The leash is one named number now (`const LEASH`), because the chase that came in with the
  // archer had to use the same one: an enemy leaves its ground to follow a bowman, and stops
  // exactly where a retreat begins. Read the name and the number both, so neither can drift.
  assert.match(combatSource, /^const LEASH = 45;$/m, 'the leash is 45 m, named once');
  assert.match(combatSource, /distance\(position, lastEncounter\.center\) > LEASH/, 'and the leash is what lets you leave');
  // Disengaging now preserves vitals for walkers and swimmers alike. The host
  // also suppresses ordinary stamina regeneration while a swimmer remains wet.
  // The actual boundary behavior is exercised in the beach-fight test below.
  assert.match(main, /const windBefore=combat\.state\.player\.stamina;/, 'the host remembers what the water had taken');
  assert.match(main, /if\(inWater&&combat\.state\.player\.stamina>windBefore\)combat\.state\.player\.stamina=windBefore;/,
    'and while the water has him his wind only ever goes down');
  // A save is never written from the water, so no crossing can be reloaded with a fresh bar of
  // wind - which is also why the save holding health and not wind does not matter.
  assert.match(main, /combat\.state\.player\.hp<=0\|\|inWater\)\{if\(notify\)toast\('Step ashore/,
    'and no checkpoint is written while he is in it');
});

test('the two ways out of the water both pay for the swim, and drowning ends a quest fight', () => {
  const main = source('main.js');
  // Getting on the horse is a way out of the water: he waits on land and can be reached from the
  // shallows, so a man who pressed G instead of taking one more step used to lose the metres, the
  // water crossed and the checkpoint with them.
  assert.match(main, /function payForTheSwim\(x,z\)\{/, 'the payout has a name of its own');
  assert.match(main, /if\(inWater\)payForTheSwim\(p\.x,p\.z\);[\s\S]{0,40}\s*if\(canSwim\(p\.x,p\.z,playerWorld,RIDE\.radius\)/,
    'and the saddle pays before it takes over');
  assert.match(main, /if\(inWater\)payForTheSwim\(p\.x,p\.z\);[\s\S]{0,40}\s*inWater=false;drowning=false;return;/,
    'as does walking out onto ground');
  assert.ok((main.match(/payForTheSwim\(/g) ?? []).length === 3, 'one payout, called from both ways out');
  // And the payout says he is out of the water before it writes anything, because `saveRoad`
  // refuses while `inWater`. It was the last line of the payout and the flag was cleared by the
  // caller afterwards, so a crossing was paid for in experience and in waters crossed and then
  // never written to the checkpoint - by either way out.
  const payout = main.slice(main.indexOf('function payForTheSwim(x,z){'), main.indexOf('function swimTick('));
  assert.match(payout, /^\s*function payForTheSwim\(x,z\)\{[\s\S]{0,400}?inWater=false;/, 'out of the water first');
  assert.ok(payout.indexOf('inWater=false;') < payout.indexOf('saveRoad(false)'), 'and only then is the checkpoint written');
  assert.match(payout, /saveRoad\(false\)/, 'which the payout does do');
  // A drowning does not restart the fight it interrupted, so whatever was told a fight had begun
  // must be told it has ended. The hideout and the toll are ended in the defeat handler; the
  // aftermath is not, because the ordinary retry restarts its fight and leaves it running.
  const returnDrowned = new Function('combat', 'world', 'lastDry', 'player', 'events', `
    let drownedDefeat=true,inWater=true,drowning=true,swimMetres=23,retriesTaken=0,
      mode='defeated',grounded=false,verticalSpeed=-2,yaw=1;
    const stopAutopilot=()=>{},clearArrows=()=>{},stopInput=()=>{},show=()=>{},toast=()=>{},canvas={focus(){}};
    const inAftermathFight=()=>true,aftermath={endEncounter:id=>events.push(['end',id])};
    ${hostFunction('returnToSafety')}
    returnToSafety();
    return {drownedDefeat,inWater,drowning,swimMetres,mode,grounded};
  `);
  for(const lastDry of [{x:6,z:8},null]) {
    const events=[],world={spawn:{x:1,z:2},heightAt:(x,z)=>x+z};
    const player={group:{position:new THREE.Vector3(20,-1,30),rotation:{y:0}}};
    const combat={state:{encounterId:'water-quest'},revive(){events.push(['revive']);},
      resetEncounter(){assert.fail('drowning must not restart a fight');}};
    const returned=returnDrowned(combat,world,lastDry,player,events),ashore=lastDry??world.spawn;
    assert.deepEqual(events,[['end','water-quest'],['revive']],'quest fight ends before the combat state is revived');
    assert.deepEqual(player.group.position.toArray(),[ashore.x,world.heightAt(ashore.x,ashore.z),ashore.z]);
    assert.deepEqual(returned,{drownedDefeat:false,inWater:false,drowning:false,swimMetres:0,mode:'playing',grounded:true});
  }
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
  const tryDodge=new Function('inWater','mounted','passenger',`
    const mode='playing',grounded=true,riding={mounted},living={recall:()=>({status:passenger?'passenger':'idle'})};
    const keys=new Set(),yaw=0,player={group:{rotation:{y:0}}};
    let dodges=0;
    const getMovementInput=()=>({forward:1,side:0}),combat={dodge(){dodges++;}};
    ${hostFunction('dodge')}
    dodge();return dodges;
  `);
  assert.equal(tryDodge(true,false,false),0,'a swimmer cannot dodge');
  assert.equal(tryDodge(false,true,false),0,'a rider cannot dodge');
  assert.equal(tryDodge(false,false,true),0,'a passenger cannot dodge');
  assert.equal(tryDodge(false,false,false),1,'an ordinary traveler still can dodge');
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

// Fights may be near water. What protects swimming balance is preserving the
// traveler's spent vitals at disengagement, not a restriction on encounter maps.
test('swimming beyond a beach fight leash gives no health or second bar of wind', async () => {
  const { createCombat } = await sourceModule('../src/combat.js');
  const world={bounds:{minX:-100,maxX:100,minZ:-100,maxZ:100},colliders:[],
    heightAt:x=>x<5?1.5:-1,waterAt:()=>WATERLINE};
  const main=source('main.js'),start=main.indexOf('const windBefore=combat.state.player.stamina;');
  const end=main.indexOf('{const casting=magic.pose();',start);
  assert.ok(start>=0&&end>start,'the host combat update and swimming wind guard exist');
  const hostUpdate=new Function('combat','dt','inWater',`let combatClock=0;${main.slice(start,end)}`);
  const events=[],position={x:0,z:0},controlPosition={x:0,z:0};
  const combat=createCombat({world,position,onEvent:event=>events.push(event)});
  const control=createCombat({world,position:controlPosition});
  assert.equal(combat.startEncounter({id:'beach-fight',center:{x:0,z:0},checkpoint:{x:0,z:8},retreatZ:18,
    enemies:[{id:'beach-goblin',x:0,z:-8,hp:75,entry:60}]}),true);
  const enemy=combat.state.enemies[0];enemy.hp=41;
  for(const model of [combat,control])model.exhaust(55,37);
  for(let frame=0;frame<=180;frame++){
    position.x=controlPosition.x=6+frame*.3;
    assert.ok(canSwim(position.x,position.z,world),'the whole retreat is in water');
    for(const model of [combat,control]){
      hostUpdate(model,1/60,true);
      const step=swimStep({dt:1/60,level:1,wind:model.state.player.stamina,health:model.state.player.hp});
      model.exhaust(step.spent,step.damage);
    }
    if(frame===0){
      assert.equal(combat.state.phase,'active','entering water alone does not reset the fight');
      assert.equal(combat.state.enemies[0],enemy,'the same damaged enemy remains');
    }
    assert.equal(combat.state.player.hp,control.state.player.hp,'retreat never heals a swimmer');
    assert.ok(Math.abs(combat.state.player.stamina-control.state.player.stamina)<1e-8,'retreat never refreshes swimming wind');
  }
  assert.equal(combat.state.phase,'peaceful','crossing the outer leash disengages the fight');
  const retreats=events.filter(event=>event.type==='retreat');
  assert.equal(retreats.length,1,'a single retreat is reported');
  assert.equal(retreats[0].enemies[0].hp,41,'the host receives the enemy’s remaining health');
  assert.equal(combat.state.player.hp,63);
  assert.ok(combat.state.player.stamina<45,'the swim continues to spend the original wind');
});

/**
 * **Rivers are water you can be in** (the user, 22 September 2026: all rivers should be real
 * swimmable water). They were not: `canSwim` judged wet against one global sea line, so a river
 * flowing at two and three quarter metres of elevation read as dry land, and every river in the
 * world was walled with colliders to keep people out of it. The beds were carved all along - the
 * Caloss carries 0.96 m of water, the Tarvel 0.79, the Vastos 0.48 - and what was missing was
 * that water has a local surface.
 */
test('a river is water at its own height, and submerged ground cannot be walked on', async () => {
  const { createWorld } = await sourceModule('../src/world.js');
  const world = createWorld(new THREE.Scene());
  const water = world.colliders.filter(collider => collider.kind === 'river-water');
  assert.ok(water.length > 1000, `only ${water.length} river points in the world`);
  // Every one of them says what the water there stands at, and it is not the sea's line.
  assert.ok(water.every(one => Number.isFinite(one.surface)), 'a river point that does not say how high its water is');
  const above = water.filter(one => one.surface > WATERLINE + .5).length;
  assert.ok(above > water.length * .6, `only ${above} of ${water.length} river points run above the sea`);
  // And the world answers it, so the predicates can ask.
  const sample = water.find(one => one.surface > WATERLINE + 1);
  assert.equal(world.waterAt(sample.x, sample.z), sample.surface);
  assert.equal(world.waterAt(0, 0), WATERLINE, 'ground with no water over it is the sea’s line');
  // Which makes the channel swimmable. Measured when this was written: 1,440 of 1,494.
  const wet = water.filter(one => canSwim(one.x, one.z, world, .34)).length;
  assert.ok(wet > water.length * .9, `only ${wet} of ${water.length} river points can be swum`);
  // Marker circles can overlap a dry bank. Height decides what is wet; their
  // broad collision radius must not fence off the last dry step into a river.
  for (const one of water) if (world.heightAt(one.x, one.z) < world.waterAt(one.x, one.z))
    assert.equal(canStand(one.x, one.z, world, BODY.person), false,
      `submerged river bed at ${one.x.toFixed(0)}, ${one.z.toFixed(0)} can be stood on`);
});

test('the Caloss can be swum beside its bridge, and the bridge is still walked', async () => {
  const { createWorld } = await sourceModule('../src/world.js');
  const world = createWorld(new THREE.Scene());
  const crossing = world.journeySites['bridge-repair'];
  // The road's own bearing there, and the channel across it.
  const along = { x: -.849, z: .529 }, across = { x: .529, z: .849 };
  const widest = up => {
    const base = { x: crossing.x + across.x * up, z: crossing.z + across.z * up };
    let run = 0, best = 0;
    for (let t = -20; t <= 20; t += .5) {
      const x = base.x + along.x * t, z = base.z + along.z * t;
      if (canSwim(x, z, world, .34)) { run += .5; best = Math.max(best, run); } else run = 0;
    }
    return best;
  };
  const swim = widest(30);
  assert.ok(swim > 6 && swim < 30, `the swim beside the bridge is ${swim.toFixed(1)} m`);
  // Well inside a level-1 swimmer's reach, and a real bite out of his wind.
  const reach = SWIM.walk * SWIM.shareLow * (SWIM.wind / SWIM.drainLow);
  assert.ok(swim < reach / 2, `${swim.toFixed(1)} m of a ${reach.toFixed(0)} m bar`);
  // And the bridge itself is still dry boards as far as the break, which is what a traveler
  // walks out along to mend it (tests/road-ambush.test.js has the break's own law).
  const onDeck = { x: crossing.x + along.x * -4, z: crossing.z + along.z * -4 };
  assert.equal(canStand(onDeck.x, onDeck.z, world, BODY.person), true, 'the sound half of the deck is not walkable');
  assert.equal(canSwim(onDeck.x, onDeck.z, world, .34), false, 'and it is boards, not water');
});

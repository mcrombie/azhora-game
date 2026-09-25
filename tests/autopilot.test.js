import test from 'node:test';
import assert from 'node:assert/strict';
import { borderGoal, aftermathGoal } from '../src/autopilot.js';
import { QUEST_DONE } from '../src/game-state.js';
import { createAutopilot, planGoal, fightCommand, chooseReply, nextWaypoint, bestTrail, freeDirection, moveInput, nearestVertex, clearLine, CHOICE_PRIORITY } from '../src/autopilot.js';
import { createInventoryState } from '../src/inventory.js';
import { createRiding } from '../src/riding.js';
import { OSTLER_NPC, OSTLER_TOKEN, horseWaiting, redeemHorse, ostlerConversation } from '../src/ostler.js';

/** A small flat world with the same collision rules as the game. */
function fakeWorld() {
  const trail = [{ x: 0, z: 25 }, { x: 0, z: 9 }, { x: 0, z: -5 }, { x: -1.6, z: -20 }, { x: 1.7, z: -34 }, { x: 0, z: -47 }, { x: -1.5, z: -60 }, { x: 0, z: -100 }, { x: 0, z: -156 }, { x: 0, z: -184 }];
  return {
    bounds: { minX: -94, maxX: 94, minZ: -680, maxZ: 48 },
    heightAt: () => 1,
    colliders: [{ x: 6, z: 0, r: 1.2 }, { x: 0, z: -12.5, hx: .5, hz: .5 }],
    paths: [trail, [{ x: -21, z: 13 }, { x: 0, z: 7 }]],
    npcPositions: { harbormaster: { x: 4, z: 20 }, 'bird-watcher': { x: 22, z: 34 }, instructor: { x: 3, z: -10 }, warden: { x: 0, z: -65 }, 'meadow-courier': { x: -7, z: -190 }, 'crossing-keeper': { x: -9, z: -352 } },
    npcNames: { harbormaster: 'Jojo', 'bird-watcher': 'Lakota', warden: 'Eren', 'meadow-courier': 'Corvan', 'crossing-keeper': 'Chip' },
    journeySites: { 'cart-parcel-1': { id: 'cart-parcel-1', x: 15, z: -218, name: 'Cloth parcel' }, 'bridge-repair': { id: 'bridge-repair', x: 0, z: -400, name: 'Reedwater bridge' } },
    stickSites: [{ id: 'bridge-debris-1', x: -8, z: -383, collected: false }, { id: 'bridge-debris-2', x: 8, z: -389, collected: true }],
    repairBenches: [{ x: 3, z: -191 }],
    training: { x: 3, z: -12 }, northTrail: { x: -5, z: -108 }, border: { x: 0, z: -156 },
  };
}

function snapshot(overrides = {}) {
  return {
    mode: 'playing', questStage: 0, practiceHits: 0, practiceDodges: 0,
    position: { x: 0, z: 30 }, combat: { phase: 'peaceful', action: 'idle', stamina: 100, hp: 100, enemies: [] },
    weapon: { usable: true, condition: 24 }, inventory: { sticks: 0, cookedFish: 0, pawpaws: 0 },
    dialogue: null, journey: { started: false, stage: 'not-started', complete: false, destinationIds: [], actions: [] }, interaction: {},
    ...overrides,
  };
}

test('movement input reproduces a world direction under the host’s camera-relative formula', () => {
  for (const yaw of [0, .7, -2.1, Math.PI]) for (const [dx, dz] of [[1, 0], [0, -1], [-.6, .8]]) {
    const { forward, side } = moveInput(yaw, dx, dz);
    const wx = -Math.sin(yaw) * forward + Math.cos(yaw) * side, wz = -Math.cos(yaw) * forward - Math.sin(yaw) * side;
    const length = Math.hypot(dx, dz);
    assert.ok(Math.abs(wx - dx / length) < 1e-9 && Math.abs(wz - dz / length) < 1e-9, `yaw ${yaw} direction ${dx},${dz}`);
  }
  assert.deepEqual(moveInput(1, 0, 0), { forward: 0, side: 0, run: false });
});

test('long trips follow the main trail vertex by vertex and short hops go straight', () => {
  const world = fakeWorld();
  const first = nextWaypoint({ x: 0, z: 30 }, { x: 0, z: -100 }, world);
  assert.equal(first.onTrail, true); assert.deepEqual(first.point, { x: 0, z: 25 });
  const beside = nextWaypoint({ x: .3, z: 25.5 }, { x: 0, z: -100 }, world);
  assert.deepEqual(beside.point, { x: 0, z: 9 }, 'a vertex we are already beside is skipped');
  const past = nextWaypoint({ x: 0, z: 2 }, { x: 0, z: -100 }, world);
  assert.deepEqual(past.point, { x: 0, z: -5 }, 'a vertex behind us is not revisited');
  const last = nextWaypoint({ x: 0, z: -98 }, { x: 0, z: -100 }, world);
  assert.equal(last.onTrail, false);
  const offRoad = nextWaypoint({ x: 40, z: -200 }, { x: 60, z: -240 }, world);
  assert.equal(offRoad.onTrail, false, 'far from the trail the autopilot walks straight');
  const back = nextWaypoint({ x: 0, z: -100 }, { x: 0, z: 25 }, world);
  assert.equal(back.onTrail, true); assert.deepEqual(back.point, { x: -1.5, z: -60 });
  assert.equal(nearestVertex(world.paths[0], { x: 0, z: -33 }).index, 4);
});

test('a blocked straight line is replaced by the nearest free direction', () => {
  const world = fakeWorld();
  const clear = freeDirection({ x: 0, z: 10 }, { x: 0, z: 0 }, world);
  assert.ok(Math.abs(clear.x) < 1e-9 && clear.z < 0);
  const around = freeDirection({ x: 6, z: 1.8 }, { x: 6, z: -3 }, world);
  assert.ok(Math.abs(around.x) > .3, 'the rock at 6,0 forces a sidestep');
  assert.ok(around.z < 0, 'the sidestep still makes progress');
});

test('the planner walks the tutorial: Jojo at the pier, Glun at the post, and the road west', () => {
  const world = fakeWorld();
  assert.equal(planGoal(snapshot({ mode: 'opening' }), world).kind, 'begin');
  assert.equal(planGoal(snapshot({ mode: 'arriving' }), world).kind, 'wait');
  assert.equal(planGoal(snapshot({ mode: 'pause' }), world).kind, 'wait');
  assert.equal(planGoal(snapshot({ mode: 'defeated' }), world).kind, 'retry');
  assert.deepEqual(planGoal(snapshot({ questStage: 0 }), world).target, world.npcPositions.harbormaster);
  assert.equal(planGoal(snapshot({ questStage: 0 }), world).kind, 'talk', 'speaking to the harbourmaster is what brings the traveler ashore');
  const mara = planGoal(snapshot({ questStage: 1 }), world);
  assert.equal(mara.kind, 'talk'); assert.equal(mara.npcId, 'harbormaster');
  // Officer Glun sets the lesson before the straw counts for anything (src/instructor.js).
  assert.equal(planGoal(snapshot({ questStage: 2, lessonSet: false }), world).npcId, 'instructor');
  assert.equal(planGoal(snapshot({ questStage: 2 }), world).kind, 'practice');
  assert.match(planGoal(snapshot({ questStage: 2, practiceHits: 2 }), world).intent, /dodge/);
  // And the third subquest is the road west, which the journey below takes from the boundary.
  // The eight steps that used to sit between - the bell, the fight, the watch, the satchel,
  // Fernway Rest - are off the slate with the quests that needed them (src/quest-slate.js).
  assert.deepEqual(planGoal(snapshot({ questStage: QUEST_DONE }), world).target, world.border);
  assert.equal(planGoal(snapshot({ questStage: QUEST_DONE, combat: { phase: 'active', action: 'idle', stamina: 100, hp: 100, enemies: [] } }), world).kind, 'fight');
  assert.equal(planGoal(snapshot({ mode: 'inventory' }), world).kind, 'close-inventory', 'the satchel is no longer a lesson');
  assert.equal(planGoal(snapshot({ mode: 'dialogue' }), world).kind, 'dialogue');
});

test('the planner follows the road quests, gathers sticks for the bridge, and stops when the road is done', () => {
  const world = fakeWorld();
  const road = (extra, journey) => snapshot({ questStage: QUEST_DONE, journey: { started: true, stage: 'meet-courier', complete: false, destinationIds: ['meadow-courier'], actions: [], ...journey }, ...extra });
  const courier = planGoal(road(), world);
  assert.equal(courier.kind, 'talk'); assert.equal(courier.npcId, 'meadow-courier'); assert.match(courier.intent, /Corvan/);
  const parcel = planGoal(road({}, { stage: 'recover-parcels', destinationIds: ['cart-parcel-1'] }), world);
  assert.equal(parcel.kind, 'use'); assert.equal(parcel.siteId, 'cart-parcel-1');
  const sticks = planGoal(road({ position: { x: 0, z: -380 } }, { stage: 'repair-bridge', destinationIds: ['bridge-repair'] }), world);
  assert.equal(sticks.siteId, 'bridge-debris-1', 'collected driftwood is skipped and the nearest remaining pile is chosen');
  const worldWithoutSticks = { ...world, stickSites: [] };
  const hollis = planGoal(road({ position: { x: 0, z: -380 } }, { stage: 'repair-bridge', destinationIds: ['bridge-repair'] }), worldWithoutSticks);
  assert.equal(hollis.npcId, 'crossing-keeper', 'with no driftwood left, ask Chip for timber');
  const bridge = planGoal(road({ inventory: { sticks: 3, cookedFish: 0, pawpaws: 0 } }, { stage: 'repair-bridge', destinationIds: ['bridge-repair'] }), world);
  assert.equal(bridge.siteId, 'bridge-repair');
  assert.equal(planGoal(road({}, { complete: true }), world).kind, 'done');
  assert.equal(planGoal(road({}, { started: false }), world).target, world.border);
  const broken = planGoal(road({ weapon: { usable: false, condition: 0 }, position: { x: 0, z: -190 } }), world);
  assert.equal(broken.check, 'nearRepair');
  assert.equal(planGoal(road({ weapon: { usable: false, condition: 0 }, inventory: { sticks: 2, cookedFish: 0, pawpaws: 0 } }), world).kind, 'equip');
  assert.equal(planGoal(road({ combat: { phase: 'peaceful', action: 'idle', stamina: 100, hp: 20, enemies: [] }, inventory: { sticks: 0, cookedFish: 1, pawpaws: 0 } }), world).item, 'cooked-fish');
});

test('replies prefer the quest action, ask Chip for wood only when short, and otherwise leave politely', () => {
  const choices = [{ id: 'nessa-caravans', label: 'What travels through these fields?' }, { id: 'meet-courier', label: 'Report for field service' }, { id: 'leave-road-neighbor', label: 'Back to the road.' }];
  assert.equal(chooseReply(choices, snapshot({ journey: { actions: [{ id: 'meet-courier', enabled: true }] } })), 'meet-courier');
  assert.equal(chooseReply(choices, snapshot({ journey: { actions: [] } })), 'leave-road-neighbor');
  const hollis = [{ id: 'hollis-fishing', label: 'Could you teach me to fish?' }, { id: 'hollis-repair-wood', label: 'I need sound wood for the repair.' }, { id: 'leave-road-neighbor', label: 'Back to the road.' }];
  assert.equal(chooseReply(hollis, snapshot({ inventory: { sticks: 1 }, journey: { actions: [] } })), 'hollis-repair-wood');
  assert.equal(chooseReply(hollis, snapshot({ inventory: { sticks: 3 }, journey: { actions: [] } })), 'leave-road-neighbor');
  assert.equal(chooseReply([{ id: 'meet-courier', enabled: false }], snapshot()), null);
  assert.equal(chooseReply([{ id: 'doom-warning', label: 'What waits at the distant cape?' }, { id: 'doom-map', label: 'Show me the cape.' }], snapshot()), 'doom-map', 'with nothing to leave by, the last reply is taken');
  assert.ok(CHOICE_PRIORITY.includes('deliver-report'));
});

test('the computer travels at a run and walks only the last stride', () => {
  const world = fakeWorld();
  const pilot = createAutopilot({ world, read: () => snapshot({ questStage: 1, position: far }), act: () => {} });
  let far = { x: 0, z: 30 };
  pilot.start();
  const step = position => { far = position; return pilot.step(.05).move; };
  assert.equal(step({ x: 4, z: 40 }).run, true, 'a long leg is run');
  assert.equal(step({ x: 4, z: 26 }).run, true, 'still running a few strides out');
  const last = step({ x: 4.6, z: 21.4 });
  assert.equal(last.run, false, 'the last stride up to Jojo is walked');
  assert.ok(Math.hypot(last.forward, last.side) > .9, 'and it is still walking toward her');
  pilot.stop();
});

test('a mount the game refuses is given up after a few seconds, and the leg is walked', () => {
  // An autoplay run stood in Solis asking the horse to take him, over and over, when there was no room to get up.
  const world = fakeWorld(), asked = [];
  const pilot = createAutopilot({ world, act: { mount: () => asked.push('mount') },
    read: () => snapshot({ questStage: 1, position: { x: 0, z: -150 }, riding: { owned: true, mounted: false, horse: { x: .6, z: -150.4, yaw: 0 } } }) });
  pilot.start();
  let walking = 0;
  for (let t = 0; t < 6; t += .1) {
    const move = pilot.step(.1).move;
    if (t > 4 && Math.hypot(move.forward, move.side) > .5) walking++;
  }
  assert.ok(asked.length >= 1, 'it asks to mount first');
  const before = asked.length;
  for (let t = 0; t < 3; t += .1) pilot.step(.1);
  assert.equal(asked.length, before, 'and then stops asking while it walks');
  assert.ok(walking > 5, 'and walks on toward Jojo');
  pilot.stop();
});

test('a horse near as the crow flies but out of reach is given up, and the leg is walked', () => {
  // An autoplay run in Solis spent four minutes walking into the barracks toward a horse on the other side of the wall.
  const world = fakeWorld();
  const pilot = createAutopilot({ world, act: {},
    read: () => snapshot({ questStage: 1, position: { x: 0, z: -150 }, riding: { owned: true, mounted: false, horse: { x: 20, z: -150, yaw: 0 } } }) });
  pilot.start();
  const intents = [];
  for (let t = 0; t < 9; t += .1) intents.push(pilot.step(.1).intent);
  assert.equal(intents[0], 'Going to the horse', 'it goes for the horse first');
  assert.notEqual(intents.at(-1), 'Going to the horse', 'and gives it up when it gets no nearer');
  pilot.stop();
});

test('the computer follows whichever road serves the leg, not only the first one', () => {
  const world = fakeWorld();
  // A second road, far off the first: the way from the outpost to Solis is like this.
  const spur = [{ x: 400, z: -40 }, { x: 430, z: -120 }, { x: 460, z: -200 }, { x: 500, z: -280 }];
  world.paths = [...world.paths, spur];
  const from = { x: 402, z: -44 }, to = { x: 498, z: -276 };
  assert.deepEqual(bestTrail(world.paths, from, to), spur, 'the spur serves this leg');
  // The choice follows the destination, not the traveler, so it cannot flip as they walk.
  for (const where of [{ x: 0, z: 20 }, { x: 200, z: -100 }, { x: 460, z: -150 }, { x: 499, z: -270 }])
    assert.deepEqual(bestTrail(world.paths, where, to), spur, `the same road serves from ${where.x},${where.z}`);
  assert.deepEqual(bestTrail(world.paths, { x: 0, z: 20 }, { x: 0, z: -150 }), world.paths[0], 'the main road still serves its own');
  const step = nextWaypoint(from, to, world);
  assert.equal(step.onTrail, true);
  assert.ok(step.point.z < from.z, `it walks along the spur, not back to the far road (${JSON.stringify(step.point)})`);
});

test('a game begun at a later chapter is played from there, not from the road behind it', () => {
  const world = fakeWorld();
  world.npcPositions['post-camp-legate'] = { x: -20, z: -300 };
  world.npcNames['post-camp-legate'] = 'Marshal Venmor';
  // The road, Luscia and the Moros are behind this traveler: their chapters were never played here.
  const staged = snapshot({
    questStage: QUEST_DONE, position: { x: -18, z: -296 },
    campaign: { chapterId: 'suval-envoy' },
    journey: { started: true, stage: 'meet-courier', complete: false, destinationIds: [], actions: [] },
    border: { stage: 'take-orders', complete: false, destinationIds: ['post-camp-legate'], actions: [], objectiveId: 'post-camp-legate' },
  });
  const goal = planGoal(staged, world);
  assert.equal(goal.kind, 'talk', `it goes to the chapter the campaign is on, not ${goal.intent}`);
  assert.equal(goal.npcId, 'post-camp-legate');
  // Without the campaign it would have nothing left on the road and give up.
  const blind = planGoal({ ...staged, campaign: undefined }, world);
  assert.equal(blind.kind, 'done');

  // Once the side is chosen the campaign moves on to the battle, and the traveler still has
  // the envoy's answer to carry back. The Luscia and Moros chapters are finished behind them
  // and must not stop the walk: the Empire run once gave up here in Drent.
  const reporting = planGoal({ ...staged, position: { x: 200, z: 150 },
    campaign: { chapterId: 'border-battle', side: 'empire' },
    luscia: { complete: true, destinationIds: [] }, moros: { complete: true, destinationIds: [] },
    border: { stage: 'report', complete: false, destinationIds: ['post-camp-legate'], actions: [], objectiveId: 'post-camp-legate' },
  }, world);
  assert.equal(reporting.kind, 'talk', `the report still has to be made, not ${reporting.intent}`);
  assert.equal(reporting.npcId, 'post-camp-legate');
});

test('the fight policy dodges tells, strikes in reach, closes the gap, and waits on stamina', () => {
  const base = { position: { x: 0, z: 0 }, combat: { phase: 'active', action: 'idle', stamina: 100, hp: 100, enemies: [] } };
  const goblin = (x, z, action = 'idle', progress = 0) => ({ id: 'g', x, z, action, progress, active: true, hp: 50 });
  const strike = fightCommand({ ...base, combat: { ...base.combat, enemies: [goblin(0, -2)] } });
  assert.equal(strike.actions[0].type, 'attack'); assert.ok(Math.abs(strike.actions[0].yaw - Math.PI) < 1e-9 || Math.abs(strike.actions[0].yaw + Math.PI) < 1e-9);
  const dodge = fightCommand({ ...base, combat: { ...base.combat, enemies: [goblin(0, -2, 'windup', .7)] } });
  assert.equal(dodge.actions[0].type, 'dodge'); assert.ok(Math.abs(dodge.actions[0].x) > .99, 'the dodge crosses the line of the strike');
  const early = fightCommand({ ...base, combat: { ...base.combat, enemies: [goblin(0, -2, 'windup', .2)] } });
  assert.equal(early.actions[0].type, 'attack', 'an early tell is still time to hit first');
  const close = fightCommand({ ...base, combat: { ...base.combat, enemies: [goblin(0, -6)] } });
  assert.equal(close.actions.length, 0); assert.ok(close.move.forward > .99 && close.move.run === false);
  const winded = fightCommand({ ...base, combat: { ...base.combat, stamina: 3, enemies: [goblin(0, -2)] } });
  assert.equal(winded.actions.length, 0); assert.match(winded.intent, /opening/);
  const nearestFirst = fightCommand({ ...base, combat: { ...base.combat, enemies: [goblin(0, -9), { ...goblin(2, 0), id: 'h' }] } });
  assert.equal(nearestFirst.actions[0].type, 'attack');
  const dead = fightCommand({ ...base, combat: { ...base.combat, enemies: [goblin(0, -2, 'dead', 1)] } });
  assert.equal(dead.actions.length, 0);
});

test('the autopilot drives the host through a talk, paces dialogue, and stops itself when the road is done or when told', () => {
  const world = fakeWorld();
  let state = snapshot({ questStage: 1, position: { x: 4, z: 26 } });
  const calls = [];
  const act = Object.fromEntries(['begin', 'retry', 'continue', 'choose', 'interact', 'attack', 'dodge', 'open-inventory', 'close-inventory', 'select-item', 'equip', 'eat'].map(type => [type, action => calls.push(action)]));
  const events = [];
  const pilot = createAutopilot({ world, read: () => state, act });
  pilot.onEvent(event => events.push(event.type));
  assert.equal(pilot.active, false);
  assert.equal(pilot.step(.016), null, 'inactive autopilot does nothing');
  assert.equal(pilot.start(), true); assert.equal(pilot.start(), false);
  let result = pilot.step(.016);
  assert.equal(result.goal, 'talk'); assert.ok(result.move.forward !== 0 || result.move.side !== 0, 'walks toward Jojo');
  assert.ok(Number.isFinite(pilot.yaw)); assert.match(pilot.intent, /Jojo/);
  state = { ...state, position: { x: 4, z: 21.5 }, interaction: { npcId: 'harbormaster' } };
  result = pilot.step(1);
  assert.deepEqual(calls.map(call => call.type), ['interact']);
  assert.deepEqual(result.move, { forward: 0, side: 0, run: false });
  state = { ...state, mode: 'dialogue', dialogue: { choices: [] } };
  calls.length = 0;
  pilot.step(.5); assert.equal(calls.length, 0, 'a line stays up long enough to read');
  pilot.step(2); assert.equal(calls[0].type, 'continue');
  state = { ...state, dialogue: { choices: [{ id: 'leave-road-neighbor', label: 'Back to the road.' }] } };
  calls.length = 0; pilot.step(2);
  assert.deepEqual(calls[0], { type: 'choose', id: 'leave-road-neighbor' });
  state = snapshot({ questStage: QUEST_DONE, journey: { started: true, stage: 'complete', complete: true, destinationIds: [], actions: [] } });
  assert.equal(pilot.step(.016), null); assert.equal(pilot.active, false); assert.match(pilot.stopReason, /Luscia/);
  assert.deepEqual(events, ['start', 'stop']);
  pilot.start(); assert.equal(pilot.stop('You took the reins.'), true); assert.equal(pilot.stop(), false);
  assert.equal(pilot.stopReason, 'You took the reins.');
});

test('a stalled walk turns into a sidestep and a long stall gives control back', () => {
  const world = fakeWorld();
  const state = snapshot({ questStage: QUEST_DONE, position: { x: 0, z: -12 } });
  const pilot = createAutopilot({ world, read: () => state, act: {}, options: { stuckAfter: .5, idleLimit: 3 } });
  pilot.start();
  const before = pilot.step(.1).move;
  for (let i = 0; i < 8; i++) pilot.step(.1);
  const detoured = pilot.step(.1).move;
  assert.notDeepEqual(before, detoured, 'no progress for half a second changes the heading');
  for (let i = 0; i < 40; i++) pilot.step(.1);
  assert.equal(pilot.active, false); assert.match(pilot.stopReason, /control/);
});

test('the new-region tutorial uses one world map and never asks for a trails screen', () => {
  const world = fakeWorld();
  assert.equal(planGoal(snapshot({ questStage: QUEST_DONE, mapTutorial: 1, journey: { started: true, stage: 'courier', complete: false, destinationIds: ['meadow-courier'], actions: [] } }), world).kind, 'open-chart');
  assert.equal(planGoal(snapshot({ questStage: QUEST_DONE, mapTutorial: 2, journey: { started: true, stage: 'courier', complete: false, destinationIds: ['meadow-courier'], actions: [] } }), world).kind, 'talk', 'the world map completed the lesson');
  assert.equal(planGoal(snapshot({ mode: 'journal', mapTutorial: 2 }), world).kind, 'close-journal', 'a learned lesson closes the journal');
  assert.equal(planGoal(snapshot({ mode: 'journal', mapTutorial: 0 }), world).kind, 'wait', 'a journal the player opened is left alone');
  assert.equal(planGoal(snapshot({ questStage: QUEST_DONE, mapTutorial: 3, journey: { started: true, stage: 'courier', complete: false, destinationIds: ['meadow-courier'], actions: [] } }), world).kind, 'talk', 'a finished tutorial no longer interrupts the road');
  assert.equal(planGoal(snapshot({ questStage: 0 }), world).kind, 'talk', 'no tutorial means the usual first goal');
  assert.equal(planGoal(snapshot({ mapTutorial: 1, combat: { phase: 'active', action: 'idle', stamina: 100, hp: 100, enemies: [] } }), world).kind, 'fight', 'a fight comes before any reading');
});

test('after the border battle the autopilot rallies, reports, and stops where the ground or the story ends', () => {
  const world = { npcPositions: { 'aftermath-tribune': { x: -518.5, z: 326.5 }, 'post-camp-legate': { x: -543.2, z: 361.1 } }, npcNames: { 'aftermath-tribune': 'Captain Oswin Brulan' } };
  const border = { complete: true, destinationIds: [] };
  const at = aftermath => borderGoal({ border, aftermath }, world);
  assert.equal(borderGoal({ border }, world).kind, 'done', 'a host without the chapter still stops at the battle');
  assert.equal(at({ variant: null, stage: 'not-started', complete: false, built: false, destinationIds: [] }).kind, 'done');
  const rally = at({ variant: 'moros-fallback', stage: 'rally', complete: false, built: true, destinationIds: ['aftermath-tribune'] });
  assert.deepEqual([rally.kind, rally.npcId, rally.target], ['talk', 'aftermath-tribune', world.npcPositions['aftermath-tribune']]);
  assert.match(rally.intent, /Oswin Brulan/);
  assert.equal(at({ variant: 'moros-fallback', stage: 'fighting', complete: false, built: true, destinationIds: [] }).kind, 'wait', 'the fight policy has the fight');
  assert.equal(at({ variant: 'moros-fallback', stage: 'report', complete: false, built: true, destinationIds: ['post-camp-legate'] }).npcId, 'post-camp-legate');
  const unbuilt = at({ variant: 'solis-sweep', stage: 'rally', complete: false, built: false, destinationIds: ['aftermath-tribune'] });
  assert.equal(unbuilt.kind, 'done');
  assert.match(unbuilt.reason, /not built yet/);
  const done = aftermathGoal({ aftermath: { variant: 'moros-fallback', stage: 'complete', complete: true, built: true, destinationIds: [] } }, world);
  assert.equal(done.kind, 'done');
  assert.match(done.reason, /pay and your orders/);
  for (const id of ['begin-assault', 'close-aftermath']) assert.ok(CHOICE_PRIORITY.includes(id), `${id} is a reply the autopilot will choose`);
});

test('the autopilot answers every chapter that can put a reply in front of it, not only the road', () => {
  // A chapter's reply is only chosen when the chapter itself offers it, so a
  // snapshot that leaves the chapter out must leave the autopilot walking away.
  const reply = (id, chapter) => chooseReply([{ id, label: 'Get on with it', enabled: true },
    { id: 'leave-it', label: 'Not now.', enabled: true }],
  { journey: { actions: [] }, inventory: { sticks: 0 }, ...chapter });
  for (const [id, chapter] of [
    ['admit-to-camp', { moros: { actions: [{ id: 'admit-to-camp', enabled: true }] } }],
    ['join-muster', { moros: { actions: [{ id: 'join-muster', enabled: true }] } }],
    ['take-legate-terms', { border: { actions: [{ id: 'take-legate-terms', enabled: true }] } }],
    ['enter-solis', { border: { actions: [{ id: 'enter-solis', enabled: true }] } }],
    ['side-empire', { border: { actions: [{ id: 'side-empire', enabled: true }] } }],
    ['march-out', { border: { actions: [{ id: 'march-out', enabled: true }] } }],
    ['reach-line', { border: { actions: [{ id: 'reach-line', enabled: true }] } }],
    ['sound-advance', { border: { actions: [{ id: 'sound-advance', enabled: true }] } }],
    ['begin-assault', { aftermath: { actions: [{ id: 'begin-assault', enabled: true }] } }],
    ['close-aftermath', { aftermath: { actions: [{ id: 'close-aftermath', enabled: true }] } }],
    ['return-courier-satchel', { luscia: { actions: [{ id: 'return-courier-satchel', enabled: true }] } }],
  ]) {
    assert.equal(reply(id, chapter), id, `${id} is answered when its chapter offers it`);
    assert.equal(reply(id, {}), 'leave-it', `${id} is left alone when no chapter offers it`);
  }
  // A reply the chapter has disabled is still not chosen.
  assert.equal(reply('admit-to-camp', { moros: { actions: [{ id: 'admit-to-camp', enabled: false }] } }), 'leave-it');
});

test('the autopilot carries the terms to Solis, keeps the Empire’s contract, reports to the Marshal and marches to the line', async () => {
  const { createBorderChapter } = await import('../src/border-chapter.js');
  const border = createBorderChapter(); border.start();
  const world = { npcPositions: { 'post-camp-legate': { x: 1, z: 1 }, 'solis-gate-captain': { x: 2, z: 2 }, 'coalition-envoy': { x: 3, z: 3 }, 'battle-tribune': { x: 4, z: 4 } }, npcNames: {} };
  const walked = [];
  for (let turn = 0; turn < 8 && !border.view().fighting; turn++) {
    const view = border.view(), goal = borderGoal({ border: { stage: view.stage, complete: view.complete, destinationIds: view.destinationIds, actions: border.availableActions() } }, world);
    assert.equal(goal.kind, 'talk', `at ${view.stage} the autopilot has someone to see`);
    walked.push(goal.npcId);
    const actions = border.availableActions();
    const reply = chooseReply([...actions, { id: 'leave-border', label: 'Not yet.', enabled: true }], { journey: { actions: [] }, inventory: { sticks: 0 }, border: { actions } });
    assert.equal(border.act(reply).ok, true, `${reply} moves the chapter on`);
  }
  assert.deepEqual(walked, ['post-camp-legate', 'solis-gate-captain', 'coalition-envoy', 'post-camp-legate', 'battle-tribune']);
  assert.equal(border.view().side, 'empire');
  assert.equal(border.view().stage, 'fighting');
});

test('walled places are entered and left by their gates, innermost first on the way out', async () => {
  const { enclosureWaypoint } = await import('../src/autopilot.js');
  const box = (id, half, gates) => ({ id, contains: (x, z) => Math.abs(x) < half && Math.abs(z) < half, gates });
  const town = box('town', 50, [{ id: 'north', outer: { x: 0, z: -60 }, inner: { x: 0, z: -40 } }, { id: 'west', outer: { x: -60, z: 0 }, inner: { x: -40, z: 0 } }]);
  const hall = { id: 'hall', contains: (x, z) => x > 20 && x < 40 && Math.abs(z) < 10, gates: [{ id: 'door', outer: { x: 15, z: 0 }, inner: { x: 25, z: 0 } }] };
  const world = { enclosures: [town, hall] };
  assert.equal(enclosureWaypoint({ x: 0, z: -200 }, { x: 5, z: 5 }, { enclosures: [] }), null, 'no walls, no detour');
  assert.equal(enclosureWaypoint({ x: 1, z: 1 }, { x: 5, z: 5 }, world), null, 'both inside: walk straight');
  assert.deepEqual(enclosureWaypoint({ x: 0, z: -200 }, { x: 5, z: 5 }, world).point, { x: 0, z: -60 }, 'from the north, make for the north gate');
  assert.deepEqual(enclosureWaypoint({ x: 0, z: -58 }, { x: 5, z: 5 }, world).point, { x: 0, z: -40 }, 'in the gate’s corridor, go through');
  assert.deepEqual(enclosureWaypoint({ x: -200, z: 3 }, { x: -30, z: 0 }, world).point, { x: -60, z: 0 }, 'the cheaper gate');
  assert.deepEqual(enclosureWaypoint({ x: 0, z: -30 }, { x: 30, z: 0 }, world).point, { x: 15, z: 0 }, 'inside the town, make for the hall’s door');
  assert.deepEqual(enclosureWaypoint({ x: 30, z: 0 }, { x: 0, z: -200 }, world).point, { x: 25, z: 0 }, 'leave the hall before the town');
});

test('a fort’s ditch is outside it: a traveler in front of the wall walks away instead of through it', async () => {
  const { enclosureWaypoint } = await import('../src/autopilot.js');
  const { STOCKADE_CIRCUIT, STOCKADE_CENTRE, enclosureOf } = await import('../src/outpost.js');
  const stockade = enclosureOf(STOCKADE_CIRCUIT, 'stockade', 'The border stockade');
  const world = { enclosures: [stockade] };
  // Where the Empire's autoplay stood after winning the border battle: eight metres
  // west of the stockade, beyond its wall and in its ditch.
  const field = { x: STOCKADE_CENTRE.x - 16, z: STOCKADE_CENTRE.z + 4 };
  const solisGate = { x: -521, z: 908 };
  assert.ok(STOCKADE_CIRCUIT.outward(field.x, field.z) > 0, 'the field is outside the wall line');
  assert.equal(stockade.contains(field.x, field.z), false);
  assert.equal(enclosureWaypoint(field, solisGate, world), null, 'nothing to pass through on the way to Solis');
  // Inside the yard it still leaves by the gate.
  assert.equal(stockade.contains(STOCKADE_CENTRE.x, STOCKADE_CENTRE.z), true);
  assert.equal(enclosureWaypoint(STOCKADE_CENTRE, solisGate, world)?.gate, true);
});

test('the roads are one network: a journey is routed across as many of them as it takes', async () => {
  const { roadRoute } = await import('../src/autopilot.js');
  // Three roads meeting end to end, like the Solis road, the stockade spur and the Moros road.
  const paths = [
    [{ x: 0, z: 0 }, { x: 100, z: 0 }],
    [{ x: 100, z: 0 }, { x: 100, z: 100 }, { x: 100, z: 200 }],
    [{ x: 103, z: 202 }, { x: 250, z: 202 }],
    // A lane inside a camp that joins nothing: nearer the destination, and no use.
    [{ x: 260, z: 230 }, { x: 262, z: 236 }],
  ];
  const route = roadRoute(paths, { x: 5, z: 3 }, { x: 255, z: 225 });
  assert.ok(route, 'there is a way');
  assert.deepEqual(route[0], { x: 5, z: 0 }, 'join at the nearest point on the road, not the previous corner');
  assert.ok(route.some(p => p.x === 100 && p.z === 100), 'it turns up the second road');
  assert.deepEqual(route.at(-1), { x: 250, z: 202 }, 'as near as the connected roads go, not the lane that joins nothing');
  assert.equal(roadRoute(paths, { x: -500, z: -500 }, { x: 255, z: 225 }), null, 'nowhere near a road: no route');
});

test('through journeys prefer the road to a shorter dirt bypass, while trail destinations stay reachable', async () => {
  const { roadRoute } = await import('../src/autopilot.js');
  const road = Object.assign([{ x: 0, z: 0 }, { x: 0, z: 15 }, { x: 50, z: 15 }, { x: 100, z: 15 }, { x: 100, z: 0 }], { kind: 'road' });
  const trail = Object.assign([{ x: 0, z: 0 }, { x: 30, z: 0 }, { x: 70, z: 0 }, { x: 100, z: 0 }], { kind: 'trail' });
  const paths = [road, trail];
  const through = roadRoute(paths, road[0], road.at(-1));
  assert.ok(through.some(point => point.z === 15), 'stay on the road even though the footpath is thirty metres shorter');
  const visiting = roadRoute(paths, road[0], { x: 50, z: 0 });
  assert.deepEqual(visiting.at(-1), { x: 50, z: 0 }, 'the same footpath can still serve a place in the woods');
  assert.ok(visiting.some(point => point.x === 30 && point.z === 0), 'the trail is not removed from navigation');
});

test('a harbour gate is the way to the water, not the way inland', async () => {
  const { enclosureWaypoint } = await import('../src/autopilot.js');
  const city = { id: 'city', contains: (x, z) => Math.abs(x) < 50 && Math.abs(z) < 50, gates: [
    { id: 'land', outer: { x: 0, z: -60 }, inner: { x: 0, z: -40 } },
    { id: 'quay', outer: { x: -60, z: 0 }, inner: { x: -40, z: 0 }, harbour: true },
  ] };
  const world = { enclosures: [city] };
  // Bound somewhere a little nearer the quay in a straight line, but inland.
  assert.deepEqual(enclosureWaypoint({ x: 0, z: 0 }, { x: -400, z: -300 }, world).point, { x: 0, z: -40 }, 'inland: the land gate');
  assert.deepEqual(enclosureWaypoint({ x: 0, z: 0 }, { x: -90, z: 5 }, world).point, { x: -40, z: 0 }, 'to the waterfront: the quay gate');
});

test('the day after, chapter two closes in the place your side took, where you already stand', async () => {
  const { sideSeat } = await import('../src/story-chapters.js');
  const world = { sideSeat: (side, conquest) => sideSeat(side, conquest) };
  const at = (side, variant, position) => aftermathGoal({ campaign: { side }, position, aftermath: { variant, complete: true, built: true, destinationIds: [] } }, world);
  const solis = sideSeat('empire', 'solis-sweep'), outpost = sideSeat('coalition', 'moros-outpost');
  const empire = at('empire', 'solis-sweep', { x: solis.x + 20, z: solis.z });
  assert.equal(empire.kind, 'done', 'the Empire’s traveler reports in Solis and the chapter ends there');
  assert.match(empire.reason, /^Solis is your side’s now, and you are standing in it/);
  const republic = at('coalition', 'moros-outpost', { x: outpost.x, z: outpost.z + 30 });
  assert.equal(republic.kind, 'done');
  assert.match(republic.reason, /^The outpost on the Moros is your side’s now/);
  // A side that took nothing still goes home, and only a side's own conquest moves its ground.
  assert.equal(sideSeat('empire').id, 'outpost'); assert.equal(sideSeat('coalition').id, 'solis');
  assert.equal(sideSeat('empire', 'moros-outpost').id, 'outpost');
  assert.equal(at('empire', 'moros-fallback', { x: solis.x, z: solis.z }).kind, 'walk', 'the Empire that took nothing makes for its outpost');
});

test('from the Court of Oaths the way to the outpost on the Moros goes by the roads', async () => {
  // Twice an autoplay run jammed at Solis's north-west corner: out by the quay gate, or
  // straight along the ditch toward the outpost. The walk now goes by the roads.
  const THREE = await import('../vendor/three.module.js');
  const { sourceModule } = await import('./module-loader.js');
  const { createWorld } = await sourceModule('../src/world.js');
  const { moveCharacter } = await import('../src/game-state.js');
  const { aftermathSite } = await import('../src/aftermath-sites.js');
  const { sideSeat } = await import('../src/story-chapters.js');
  const world = createWorld(new THREE.Scene());
  const adapter = { bounds: world.bounds, colliders: world.colliders, nearColliders: (x, z, r, out) => world.nearColliders(x, z, r, out),
    heightAt: (x, z) => world.heightAt(x, z), paths: world.paths, enclosures: world.enclosures };
  const hall = aftermathSite('solis-hall'), home = sideSeat('empire');
  const position = { x: hall.x, z: hall.z };
  let side = 1, best = Infinity, stalled = 0, arrived = false, waypointKey = '';
  for (let step = 0; step < 6000 && !arrived; step++) {
    const gap = Math.hypot(home.x - position.x, home.z - position.z);
    if (gap < home.reach - 12) { arrived = true; break; }
    const waypoint = nextWaypoint(position, home, adapter);
    const key = `${waypoint.point.x.toFixed(1)},${waypoint.point.z.toFixed(1)}`;
    const leg = Math.hypot(waypoint.point.x - position.x, waypoint.point.z - position.z);
    if (key !== waypointKey || leg < best - .05) { waypointKey = key; best = leg; stalled = 0; } else if ((stalled += .05) > 12) break;
    const dir = freeDirection(position, waypoint.point, adapter, side);
    if (!dir || (!dir.x && !dir.z)) { side = -side; continue; }
    moveCharacter(position, dir.x * 7.2 * .05, dir.z * 7.2 * .05, adapter);
  }
  assert.ok(arrived, `stuck at ${position.x.toFixed(0)},${position.z.toFixed(0)}, ${best.toFixed(0)} m from the outpost`);
});

test('a wrecked cart between the traveler and a nearby field objective is walked round, not routed round by the road', async () => {
  // An autoplay run stood ten metres from the courier's satchel with the Lauvel wreck in the
  // straight line, took that for the river, and paced the road until it gave up.
  const THREE = await import('../vendor/three.module.js');
  const { sourceModule } = await import('./module-loader.js');
  const { createWorld } = await sourceModule('../src/world.js');
  const { moveCharacter } = await import('../src/game-state.js');
  const { toWorld } = await import('../src/world-scale.js');
  const world = createWorld(new THREE.Scene());
  const adapter = { bounds: world.bounds, colliders: world.colliders, nearColliders: (x, z, r, out) => world.nearColliders(x, z, r, out),
    heightAt: (x, z) => world.heightAt(x, z), paths: world.paths, enclosures: world.enclosures };
  // Preserve this geometry regression after the story moved the unique satchel to the relay.
  const satchel = toWorld(-375,177), position = { x: -688.2, z: 299.8 };
  assert.ok(!clearLine(position, satchel, adapter), 'the wreck stands in the straight line');
  let side = 1, arrived = false;
  for (let step = 0; step < 400 && !arrived; step++) {
    if (Math.hypot(satchel.x - position.x, satchel.z - position.z) < 2.4) { arrived = true; break; }
    const waypoint = nextWaypoint(position, satchel, adapter);
    assert.ok(!waypoint.onTrail, `sent to the road at ${position.x.toFixed(1)},${position.z.toFixed(1)}`);
    const dir = freeDirection(position, waypoint.point, adapter, side);
    if (!dir || (!dir.x && !dir.z)) { side = -side; continue; }
    moveCharacter(position, dir.x * 7.2 * .05, dir.z * 7.2 * .05, adapter);
  }
  assert.ok(arrived, `never reached the satchel; stopped at ${position.x.toFixed(1)},${position.z.toFixed(1)}`);
});

test('a broken blade is mended before the next fight, and a fight with one is left to mend it', () => {
  const world = fakeWorld();
  world.repairBenches = [{ x: 40, z: -40 }];
  world.npcPositions['aftermath-tribune'] = { x: 0, z: -10 };
  const broken = { usable: false, condition: 0 };
  const base = snapshot({ questStage: QUEST_DONE, position: { x: 0, z: 0 }, campaign: { chapterId: 'solis-sweep', side: 'empire' },
    aftermath: { stage: 'rally', variant: 'solis-sweep', complete: false, built: true, destinationIds: ['aftermath-tribune'], actions: [] } });
  // In the Solis assault the Empire's sword broke with two raiders left, and the autoplay
  // swung it at them for twenty minutes.
  const fighting = { ...base, weapon: broken, combat: { ...base.combat, phase: 'active', enemies: [{ id: 'raider', x: 2, z: 0, action: 'idle', hp: 70 }] } };
  const fallBack = planGoal(fighting, world);
  assert.equal(fallBack.kind, 'use', `it falls back to a bench, not ${fallBack.intent}`);
  assert.deepEqual(fallBack.target, { x: 40, z: -40 });
  const withStick = planGoal({ ...fighting, inventory: { ...fighting.inventory, sticks: 2 } }, world);
  assert.deepEqual([withStick.kind, withStick.item], ['equip', 'forest-stick'], 'a spare stick will do');
  // Out of the fight, the bench comes before the commander's next order.
  const mended = planGoal({ ...base, weapon: broken }, world);
  assert.equal(mended.kind, 'use', `the blade is mended first, not ${mended.intent}`);
  assert.equal(planGoal({ ...base, weapon: { usable: true, condition: 20 } }, world).kind, 'talk', 'with a sound blade, back to the commander');
});


test('clear open ground is no excuse to cut a road bend or a junction', () => {
  const world = { ...fakeWorld(), bounds: { minX: -200, maxX: 200, minZ: -600, maxZ: 200 }, colliders: [], paths: [
    [{ x: 0, z: 0 }, { x: 0, z: -200 }, { x: 100, z: -200 }],
    [{ x: 100, z: -200 }, { x: 100, z: -400 }],
  ] };
  assert.deepEqual(nextWaypoint({ x: 0, z: -80 }, { x: 100, z: -190 }, world),
    { point: { x: 0, z: -200 }, onTrail: true }, 'keep the bend with a destination just off the road');
  assert.deepEqual(nextWaypoint({ x: 0, z: -80 }, { x: 100, z: -350 }, world),
    { point: { x: 0, z: -200 }, onTrail: true }, 'enter the next road by its junction on open ground');
  assert.deepEqual(nextWaypoint({ x: 7, z: -80 }, { x: 100, z: -350 }, world),
    { point: { x: 0, z: -80 }, onTrail: true }, 'a sidestep round a tree rejoins the road');
  assert.deepEqual(nextWaypoint({ x: 100, z: -340 }, { x: 112, z: -350 }, world),
    { point: { x: 112, z: -350 }, onTrail: false }, 'the last few steps to someone off the road stay direct');
});

test('an early recall follows muster and Solis orders without replaying the unfinished tutorial', () => {
  const world = fakeWorld();
  world.npcPositions['post-camp-legate'] = {x: -20, z: -300};
  world.npcPositions['post-camp-gate-north'] = {x: -20, z: -280};
  for (const questStage of [0, 1, 2]) for (const chartLesson of ['unissued', 'open-map', 'return-to-glun']) {
    const state = snapshot({questStage, chartLesson, mapTutorial: 1,
      campaign: {chapterId: 'suval-envoy', entryOrigin: 'imperial-recall', imperialRecall: true},
      border: {stage: 'take-orders', complete: false, destinationIds: ['post-camp-legate'], actions: []},
      moros: {stage: 'complete', complete: true, destinationIds: []}});
    const unchanged = structuredClone(state);
    assert.equal(planGoal(state, world).npcId, 'post-camp-legate');
    assert.deepEqual(state, unchanged, 'choosing the onward objective awards no skipped lesson');
    assert.equal(planGoal({...state, campaign: {...state.campaign, chapterId: 'moros-camp'},
      moros: {stage: 'report-at-gate', destinationIds: ['post-camp-gate-north']}}, world).npcId, 'post-camp-gate-north');
    assert.equal(planGoal({...state, border: undefined}, world).kind, 'wait', 'chapter initialization cannot send the player back to Jojo');
  }
});

test('Republican recruitment after a recall keeps the onward route despite unfinished Glun lessons', () => {
  const world = fakeWorld(); world.npcPositions['republic-marshal'] = {x: 12, z: -420};
  const state = snapshot({questStage: 0, chartLesson: 'return-to-glun',
    campaign: {chapterId: 'border-battle', entryOrigin: 'luscia', imperialRecall: true, side: 'coalition'},
    border: {stage: 'republic-muster', destinationIds: ['republic-marshal']}});
  assert.equal(planGoal(state, world).npcId, 'republic-marshal');
  assert.equal(planGoal({...state, combat: {...state.combat, phase: 'active'}}, world).kind, 'fight', 'live danger still takes priority');
  assert.equal(planGoal({...state, mode: 'pause'}, world).kind, 'wait', 'recall never resumes a paused game');
});

test('autoplay collects the assigned horse before following the next chapter out of Nothom', () => {
  const world = fakeWorld();
  world.npcPositions[OSTLER_NPC.id] = { x: 12, z: -160 };
  world.npcPositions['moros-gate'] = { x: 0, z: -600 };
  const state = snapshot({ questStage: QUEST_DONE, campaign: { chapterId: 'moros-camp' },
    luscia: { complete: true, destinationIds: [] }, moros: { stage: 'report-at-gate', destinationIds: ['moros-gate'], actions: [] },
    riding: { waiting: true, owned: false, mounted: false, horse: null } });
  const collect = planGoal(state, world);
  assert.equal(collect.npcId, OSTLER_NPC.id); assert.equal(collect.kind, 'talk');
  assert.deepEqual(collect.target, world.npcPositions[OSTLER_NPC.id]);
  const choices = [{ id: 'redeem-horse', enabled: true }, { id: 'leave-ostler', enabled: true }];
  assert.equal(chooseReply(choices, state), 'redeem-horse');
  assert.equal(chooseReply(choices.map(choice => ({ ...choice, enabled: choice.id !== 'redeem-horse' })), state), 'leave-ostler');
  for (const riding of [{ waiting: false, owned: false }, { waiting: false, owned: true }, { waiting: true, owned: true }]) {
    assert.equal(planGoal({ ...state, riding }, world).npcId, 'moros-gate', 'no unowed or second horse');
    assert.equal(chooseReply(choices, { ...state, riding }), 'leave-ostler');
  }
  const fighting = { ...state, combat: { ...state.combat, phase: 'active' } };
  assert.equal(planGoal(fighting, world).kind, 'fight', 'finish the fight before collecting the horse');
});

test('a mustered walker claims the same owed horse at the Moros line without returning to Nothom', () => {
  const world = fakeWorld();
  world.npcPositions[OSTLER_NPC.id] = { x: 12, z: -160 };
  world.morosSites = { 'legion-horse-line': { x: 10, z: -550, name: 'The army horse line' } };
  const state = snapshot({ questStage: QUEST_DONE, campaign: { chapterId: 'moros-camp' }, riding: { waiting: true, owned: false },
    moros: { stage: 'claim-horse', destinationIds: ['legion-horse-line'], actions: [{ id: 'claim-legion-horse', enabled: true }] } });
  assert.equal(planGoal(state, world).siteId, 'legion-horse-line');
  assert.equal(chooseReply([{ id: 'claim-legion-horse' }, { id: 'leave-line' }], state), 'claim-legion-horse');
  assert.equal(planGoal({ ...state, moros: { ...state.moros, actions: [] } }, world).npcId, OSTLER_NPC.id,
    'the camp line must actually offer the handover');
});

test('autoplay redeems the real horse token, approaches the horse and mounts before leaving the stable', () => {
  const world = fakeWorld(), inventory = createInventoryState(), riding = createRiding(), chosen = [];
  inventory.grant(OSTLER_TOKEN);
  const stable = world.npcPositions[OSTLER_NPC.id] = { x: 0, z: -150 }, hitch = { x: 8, z: -150, yaw: 0 };
  world.npcPositions['moros-gate'] = { x: 0, z: -600 };
  let mode = 'playing', dialogue = null, position = { x: 0, z: -149 };
  const read = () => snapshot({ mode, position, questStage: QUEST_DONE, campaign: { chapterId: 'moros-camp' },
    moros: { stage: 'report-at-gate', destinationIds: ['moros-gate'], actions: [] },
    riding: { owned: riding.owned, mounted: riding.mounted, horse: riding.horse, waiting: horseWaiting({ inventory, riding }) },
    dialogue: dialogue ? { choices: dialogue.index === dialogue.lines.length - 1 ? dialogue.choices : [] } : null,
    interaction: { npcId: Math.hypot(position.x - stable.x, position.z - stable.z) < 2.4 ? OSTLER_NPC.id : null } });
  const pilot = createAutopilot({ world, read, options: { dialoguePace: .2, choicePace: .2, interactEvery: .1 }, act: {
    interact: () => ostlerConversation(OSTLER_NPC, { inventory, riding, hitch, playerPosition: position,
      openDialogue: (npc, lines, event, action, options) => { mode = 'dialogue'; dialogue = { lines, index: 0, ...options }; },
      closeDialogue: () => { mode = 'playing'; dialogue = null; },
      act: id => { chosen.push(id); assert.equal(redeemHorse({ inventory, riding, hitch }).ok, true); } }),
    continue: () => { dialogue.index++; },
    choose: ({ id }) => { const choice = dialogue.choices.find(item => item.id === id); assert.ok(choice); choice.action(); },
    mount: () => { const result = riding.mount(position); assert.equal(result.ok, true); position = result.position; },
  } });
  pilot.start();
  let approached = false;
  for (let frame = 0; frame < 200 && !riding.mounted; frame++) {
    const command = pilot.step(.1); assert.ok(command);
    if (riding.owned && !riding.mounted) {
      assert.ok(Math.hypot(position.x - stable.x, position.z - stable.z) < 12, 'the traveler stays in the yard until mounted');
      if (command.intent === 'Going to the horse') approached = true;
    }
    if (!riding.mounted && command.yaw !== null) {
      const { forward, side, run } = command.move, step = (run ? 7.2 : 3) * .1;
      position.x += (-Math.sin(command.yaw) * forward + Math.cos(command.yaw) * side) * step;
      position.z += (-Math.cos(command.yaw) * forward - Math.sin(command.yaw) * side) * step;
    }
  }
  assert.deepEqual(chosen, ['redeem-horse']); assert.equal(inventory.has(OSTLER_TOKEN), false);
  assert.equal(riding.owned, true); assert.equal(riding.mounted, true); assert.equal(approached, true);
  assert.equal(planGoal(read(), world).npcId, 'moros-gate', 'the main quest resumes with the horse');
  pilot.stop();
});

test('clustered road junctions advance beyond every reached node instead of pacing between them', () => {
  const world = fakeWorld();
  world.paths = [[{ x: 0, z: 0 }, { x: 20, z: 0 }],
    [{ x: 19.5, z: .1 }, { x: 19.5, z: 20 }, { x: 50, z: 20 }]];
  const next = nextWaypoint({ x: 19.4, z: 0 }, { x: 50, z: 20 }, world);
  assert.ok(next.onTrail);
  assert.ok(next.point.z > 10, `move through the junction, not back to ${JSON.stringify(next.point)}`);
});

test('autoplay raises a carried shield toward the threat and releases it to attack', () => {
  const threat = { id: 'rebel', x: 0, z: -2.6, action: 'windup', progress: .3, active: true, hp: 50 };
  const state = snapshot({ questStage: QUEST_DONE, position: { x: 0, z: 0 },
    combat: { phase: 'active', action: 'idle', stamina: 100, hp: 100, hasShield: true, guardCost: 18, enemies: [threat] } });
  const block = fightCommand(state);
  assert.equal(block.guard, true);
  assert.ok(Number.isFinite(block.yaw));
  assert.equal(block.actions.length, 0, 'do not start an attack while the shield is needed');
  threat.action = 'attack'; threat.progress = .65;
  assert.equal(fightCommand(state).guard, true, 'hold through the whole swing, including kinds with late contact');
  threat.action = 'windup'; threat.progress = .3;
  // The nearest man is harmless; the one to the side is winding up.
  state.combat.enemies.unshift({ ...threat, id: 'recovering', x: 1, z: 0, action: 'recover' });
  assert.equal(fightCommand(state).yaw, block.yaw, 'face the strike, not simply the nearest enemy');
  const pilot = createAutopilot({ world: fakeWorld(), read: () => state });
  pilot.start(); pilot.step(.5); assert.equal(pilot.guard, true);
  threat.action = 'recover'; threat.x = 0; threat.z = -2;
  const counter = pilot.step(.5);
  assert.equal(pilot.guard, false); assert.equal(counter.actions[0]?.type, 'attack');
  threat.action = 'windup'; threat.progress = .8; state.combat.enemies = [threat]; state.combat.stamina = 26; state.combat.guardCost = 30;
  assert.equal(fightCommand(state).actions[0]?.type, 'dodge', 'an unaffordable block falls back to a dodge');
  state.combat.guardCost = 18; pilot.step(.1); assert.equal(pilot.guard, true);
  pilot.stop(); assert.equal(pilot.guard, false, 'taking manual control never leaves a held shield behind');
});

test('autoplay completes the held-shield lesson before practising its dodge', () => {
  const world = fakeWorld();
  const state = snapshot({ questStage: 2, lessonSet: true, practiceHits: 2, practiceGuards: 0,
    position: { x: world.training.x, z: world.training.z + 1.5 },
    combat: { phase: 'peaceful', action: 'idle', stamina: 100, hp: 100, hasShield: true, enemies: [] } });
  const pilot = createAutopilot({ world, read: () => state });
  pilot.start();
  for (let i = 0; i < 10; i++) {
    const command = pilot.step(.1);
    assert.equal(pilot.guard, true); assert.ok(Number.isFinite(command.yaw));
    assert.deepEqual(command.actions, []);
  }
  state.practiceGuards = 1;
  const dodge = pilot.step(.1);
  assert.equal(pilot.guard, false); assert.equal(dodge.actions[0]?.type, 'dodge');
  state.mode = 'dialogue'; pilot.step(.1); assert.equal(pilot.guard, false);
});


test('a road that first bends away from the goal does not trigger false stuck detours', () => {
  const world = { ...fakeWorld(), bounds: { minX: -200, maxX: 200, minZ: -200, maxZ: 200 }, colliders: [],
    paths: [[{ x: 0, z: 0 }, { x: 0, z: 100 }, { x: 100, z: 100 }, { x: 100, z: 0 }]], border: { x: 100, z: 0 } };
  const state = snapshot({ questStage: QUEST_DONE, position: { x: 0, z: 0 } });
  const pilot = createAutopilot({ world, read: () => state });
  pilot.start();
  for (let i = 0; i < 70; i++) {
    const command = pilot.step(.1), yaw = command.yaw, move = command.move;
    state.position.x += (-Math.sin(yaw) * move.forward + Math.cos(yaw) * move.side) * .72;
    state.position.z += (-Math.cos(yaw) * move.forward - Math.sin(yaw) * move.side) * .72;
    assert.ok(Math.abs(state.position.x) < .01, 'hold the first leg instead of detouring sideways');
  }
  assert.ok(state.position.z > 40); assert.equal(pilot.active, true);
});


test('Glun sends autoplay to the world map and receives the report before the road continues', () => {
  const world = fakeWorld(), trained = snapshot({ questStage: 2, lessonSet: true, practiceHits: 2, practiceGuards: 1, practiceDodges: 1, chartLesson: 'unissued' });
  assert.equal(planGoal(trained, world).npcId, 'instructor', 'report the completed drill to receive the chart');
  assert.equal(planGoal({ ...trained, chartLesson: 'open-map' }, world).kind, 'open-chart');
  const returning = planGoal({ ...trained, chartLesson: 'return-to-glun' }, world);
  assert.equal(returning.kind, 'talk'); assert.equal(returning.npcId, 'instructor');
  assert.deepEqual(returning.target, world.npcPositions.instructor);
  assert.equal(planGoal({ ...trained, questStage: QUEST_DONE, chartLesson: 'complete' }, world).kind, 'walk');
  assert.equal(planGoal({ ...trained, chartLesson: 'open-map', combat: { ...trained.combat, phase: 'active' } }, world).kind, 'fight', 'a live fight still takes priority');
});

test('autoplay leaves the map explanation visible, then closes it and returns to Glun', () => {
  const world = fakeWorld(), state = snapshot({ questStage: 2, chartLesson: 'open-map', lessonSet: true,
    practiceHits: 2, practiceGuards: 1, practiceDodges: 1, position: { x: 3, z: -8.5 }, interaction: { npcId: 'instructor' } });
  const calls = [], act = {
    'open-chart': action => { calls.push(action.type); state.mode = 'journal'; state.chartLesson = 'return-to-glun'; },
    'close-journal': action => { calls.push(action.type); state.mode = 'playing'; },
    interact: action => calls.push(action.type),
  };
  const pilot = createAutopilot({ world, read: () => state, act, options: { mapReadingPace: 3 } });
  pilot.start(); pilot.step(1);
  assert.deepEqual(calls, ['open-chart']);
  pilot.step(1); pilot.step(1); pilot.step(.9);
  assert.deepEqual(calls, ['open-chart'], 'the whole reading interval must pass while the map is actually shown');
  pilot.step(.2); assert.deepEqual(calls, ['open-chart', 'close-journal']);
  pilot.step(1); assert.deepEqual(calls, ['open-chart', 'close-journal', 'interact']);
});

test('the Luscia map explanation also gets reading time and resumes the road without opening trails', () => {
  const world = fakeWorld(), state = snapshot({ questStage: QUEST_DONE, mapTutorial: 1, chartLesson: 'complete',
    journey: { started: true, stage: 'courier', complete: false, destinationIds: ['meadow-courier'], actions: [] } });
  const calls = [], pilot = createAutopilot({ world, read: () => state, act: {
    'open-chart': action => { calls.push(action.type); state.mode = 'journal'; state.mapTutorial = 2; },
    'close-journal': action => { calls.push(action.type); state.mode = 'playing'; },
    'open-trails': () => assert.fail('the removed local-trails screen was requested'),
  } });
  pilot.start(); pilot.step(1); pilot.step(2);
  assert.deepEqual(calls, ['open-chart']);
  pilot.step(1); assert.deepEqual(calls, ['open-chart', 'close-journal']);
  assert.equal(pilot.step(.1).goal, 'talk');
});


test('a nearby gate behind a building is approached along its streets without recursive replanning', () => {
  const world = {
    bounds: { minX: -30, maxX: 30, minZ: -30, maxZ: 30 }, heightAt: () => 1,
    colliders: [{ x: 0, z: 0, hx: 3, hz: 3 }],
    paths: [[{ x: 0, z: -12 }, { x: -8, z: -12 }, { x: -8, z: 8 }, { x: 0, z: 8 }]],
    enclosures: [{ contains: (x, z) => z > 10, gates: [{ outer: { x: 0, z: 8 }, inner: { x: 0, z: 12 } }] }],
  };
  const from = { x: 0, z: -12 }, inside = { x: 0, z: 15 };
  const step = nextWaypoint(from, inside, world);
  assert.equal(step.onTrail, true, 'the nearby gate does not override the street route through a building');
  assert.ok(step.point.x < -3, 'the first leg goes around the building');
  assert.ok(clearLine(from, step.point, world), 'the suggested street leg is traversable');
  const empty = nextWaypoint(from, inside, { ...world, paths: [] });
  assert.deepEqual(empty.point, world.enclosures[0].gates[0].outer, 'a missing street cannot cause recursion on the same blocked gate');
});


test('autoplay does not turn back after advancing two metres across a short road join', () => {
  const world = {
    bounds: { minX: -30, maxX: 30, minZ: -30, maxZ: 30 }, heightAt: () => 1, colliders: [],
    paths: [[{ x: 0, z: -10 }, { x: 0, z: 0 }], [{ x: 0, z: 6 }, { x: 0, z: 20 }]],
  };
  const target = { x: 0, z: 20 };
  for (const z of [1.9, 2.1, 2.7, 3.1, 4.9]) {
    const step = nextWaypoint({ x: .1, z }, target, world);
    assert.ok(step.point.z > z, `the connected road continues forward from z=${z}, instead of returning to ${step.point.z}`);
    assert.ok(clearLine({ x: .1, z }, step.point, world));
  }
});

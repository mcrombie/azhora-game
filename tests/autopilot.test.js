import test from 'node:test';
import assert from 'node:assert/strict';
import { borderGoal, aftermathGoal } from '../src/autopilot.js';
import { createAutopilot, planGoal, fightCommand, chooseReply, nextWaypoint, freeDirection, moveInput, nearestVertex, CHOICE_PRIORITY } from '../src/autopilot.js';

/** A small flat world with the same collision rules as the game. */
function fakeWorld() {
  const trail = [{ x: 0, z: 25 }, { x: 0, z: 9 }, { x: 0, z: -5 }, { x: -1.6, z: -20 }, { x: 1.7, z: -34 }, { x: 0, z: -47 }, { x: -1.5, z: -60 }, { x: 0, z: -100 }, { x: 0, z: -156 }, { x: 0, z: -184 }];
  return {
    bounds: { minX: -94, maxX: 94, minZ: -680, maxZ: 48 },
    heightAt: () => 1,
    colliders: [{ x: 6, z: 0, r: 1.2 }, { x: 0, z: -12.5, hx: .5, hz: .5 }],
    paths: [trail, [{ x: -21, z: 13 }, { x: 0, z: 7 }]],
    npcPositions: { harbormaster: { x: 4, z: 20 }, warden: { x: 0, z: -65 }, 'meadow-courier': { x: -7, z: -190 }, 'crossing-keeper': { x: -9, z: -352 } },
    npcNames: { harbormaster: 'Mara', warden: 'Eren', 'meadow-courier': 'Corvan', 'crossing-keeper': 'Hollis' },
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

test('the planner walks the tutorial: Mara, the straw post, the bell, Eren, the satchel, the boundary', () => {
  const world = fakeWorld();
  assert.equal(planGoal(snapshot({ mode: 'opening' }), world).kind, 'begin');
  assert.equal(planGoal(snapshot({ mode: 'arriving' }), world).kind, 'wait');
  assert.equal(planGoal(snapshot({ mode: 'pause' }), world).kind, 'wait');
  assert.equal(planGoal(snapshot({ mode: 'defeated' }), world).kind, 'retry');
  assert.deepEqual(planGoal(snapshot({ questStage: 0 }), world).target, world.npcPositions.harbormaster);
  assert.equal(planGoal(snapshot({ questStage: 0 }), world).kind, 'talk', 'speaking to Mara is what brings the traveler ashore');
  const mara = planGoal(snapshot({ questStage: 1 }), world);
  assert.equal(mara.kind, 'talk'); assert.equal(mara.npcId, 'harbormaster');
  assert.equal(planGoal(snapshot({ questStage: 2 }), world).kind, 'practice');
  assert.match(planGoal(snapshot({ questStage: 2, practiceHits: 2 }), world).intent, /dodge/);
  assert.equal(planGoal(snapshot({ questStage: 3 }), world).kind, 'walk');
  assert.equal(planGoal(snapshot({ questStage: 4, combat: { phase: 'active', action: 'idle', stamina: 100, hp: 100, enemies: [] } }), world).kind, 'fight');
  assert.equal(planGoal(snapshot({ questStage: 5 }), world).npcId, 'warden');
  assert.equal(planGoal(snapshot({ questStage: 6 }), world).kind, 'open-inventory');
  assert.equal(planGoal(snapshot({ questStage: 6, mode: 'inventory' }), world).kind, 'inspect-letter');
  assert.equal(planGoal(snapshot({ questStage: 7, mode: 'inventory' }), world).kind, 'close-inventory');
  assert.deepEqual(planGoal(snapshot({ questStage: 8 }), world).target, world.northTrail);
  assert.deepEqual(planGoal(snapshot({ questStage: 9 }), world).target, world.border);
  assert.equal(planGoal(snapshot({ mode: 'dialogue' }), world).kind, 'dialogue');
});

test('the planner follows the road quests, gathers sticks for the bridge, and stops when the road is done', () => {
  const world = fakeWorld();
  const road = (extra, journey) => snapshot({ questStage: 10, journey: { started: true, stage: 'meet-courier', complete: false, destinationIds: ['meadow-courier'], actions: [], ...journey }, ...extra });
  const courier = planGoal(road(), world);
  assert.equal(courier.kind, 'talk'); assert.equal(courier.npcId, 'meadow-courier'); assert.match(courier.intent, /Corvan/);
  const parcel = planGoal(road({}, { stage: 'recover-parcels', destinationIds: ['cart-parcel-1'] }), world);
  assert.equal(parcel.kind, 'use'); assert.equal(parcel.siteId, 'cart-parcel-1');
  const sticks = planGoal(road({ position: { x: 0, z: -380 } }, { stage: 'repair-bridge', destinationIds: ['bridge-repair'] }), world);
  assert.equal(sticks.siteId, 'bridge-debris-1', 'collected driftwood is skipped and the nearest remaining pile is chosen');
  const worldWithoutSticks = { ...world, stickSites: [] };
  const hollis = planGoal(road({ position: { x: 0, z: -380 } }, { stage: 'repair-bridge', destinationIds: ['bridge-repair'] }), worldWithoutSticks);
  assert.equal(hollis.npcId, 'crossing-keeper', 'with no driftwood left, ask Hollis for timber');
  const bridge = planGoal(road({ inventory: { sticks: 3, cookedFish: 0, pawpaws: 0 } }, { stage: 'repair-bridge', destinationIds: ['bridge-repair'] }), world);
  assert.equal(bridge.siteId, 'bridge-repair');
  assert.equal(planGoal(road({}, { complete: true }), world).kind, 'done');
  assert.equal(planGoal(road({}, { started: false }), world).target, world.border);
  const broken = planGoal(road({ weapon: { usable: false, condition: 0 }, position: { x: 0, z: -190 } }), world);
  assert.equal(broken.check, 'nearRepair');
  assert.equal(planGoal(road({ weapon: { usable: false, condition: 0 }, inventory: { sticks: 2, cookedFish: 0, pawpaws: 0 } }), world).kind, 'equip');
  assert.equal(planGoal(road({ combat: { phase: 'peaceful', action: 'idle', stamina: 100, hp: 20, enemies: [] }, inventory: { sticks: 0, cookedFish: 1, pawpaws: 0 } }), world).item, 'cooked-fish');
});

test('replies prefer the quest action, ask Hollis for wood only when short, and otherwise leave politely', () => {
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
  assert.equal(result.goal, 'talk'); assert.ok(result.move.forward !== 0 || result.move.side !== 0, 'walks toward Mara');
  assert.ok(Number.isFinite(pilot.yaw)); assert.match(pilot.intent, /Mara/);
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
  state = snapshot({ questStage: 10, journey: { started: true, stage: 'complete', complete: true, destinationIds: [], actions: [] } });
  assert.equal(pilot.step(.016), null); assert.equal(pilot.active, false); assert.match(pilot.stopReason, /Luscia/);
  assert.deepEqual(events, ['start', 'stop']);
  pilot.start(); assert.equal(pilot.stop('You took the reins.'), true); assert.equal(pilot.stop(), false);
  assert.equal(pilot.stopReason, 'You took the reins.');
});

test('a stalled walk turns into a sidestep and a long stall gives control back', () => {
  const world = fakeWorld();
  const state = snapshot({ questStage: 8, position: { x: 0, z: -12 } });
  const pilot = createAutopilot({ world, read: () => state, act: {}, options: { stuckAfter: .5, idleLimit: 3 } });
  pilot.start();
  const before = pilot.step(.1).move;
  for (let i = 0; i < 8; i++) pilot.step(.1);
  const detoured = pilot.step(.1).move;
  assert.notDeepEqual(before, detoured, 'no progress for half a second changes the heading');
  for (let i = 0; i < 40; i++) pilot.step(.1);
  assert.equal(pilot.active, false); assert.match(pilot.stopReason, /control/);
});

test('the map tutorial steers the autopilot through the chart and the trails, then out of the journal', () => {
  const world = fakeWorld();
  assert.equal(planGoal(snapshot({ questStage: 10, mapTutorial: 1, journey: { started: true, stage: 'courier', complete: false, destinationIds: ['meadow-courier'], actions: [] } }), world).kind, 'open-chart');
  assert.equal(planGoal(snapshot({ questStage: 10, mapTutorial: 2, journey: { started: true, stage: 'courier', complete: false, destinationIds: ['meadow-courier'], actions: [] } }), world).kind, 'open-trails');
  assert.equal(planGoal(snapshot({ mode: 'journal', mapTutorial: 2 }), world).kind, 'close-journal', 'a learned lesson closes the journal');
  assert.equal(planGoal(snapshot({ mode: 'journal', mapTutorial: 0 }), world).kind, 'wait', 'a journal the player opened is left alone');
  assert.equal(planGoal(snapshot({ questStage: 10, mapTutorial: 3, journey: { started: true, stage: 'courier', complete: false, destinationIds: ['meadow-courier'], actions: [] } }), world).kind, 'talk', 'a finished tutorial no longer interrupts the road');
  assert.equal(planGoal(snapshot({ questStage: 0 }), world).kind, 'talk', 'no tutorial means the usual first goal');
  assert.equal(planGoal(snapshot({ mapTutorial: 1, combat: { phase: 'active', action: 'idle', stamina: 100, hp: 100, enemies: [] } }), world).kind, 'fight', 'a fight comes before any reading');
});

test('after the border battle the autopilot rallies, reports, and stops where the ground or the story ends', () => {
  const world = { npcPositions: { 'aftermath-tribune': { x: -518.5, z: 326.5 }, 'post-camp-legate': { x: -543.2, z: 361.1 } }, npcNames: { 'aftermath-tribune': 'Tribune Gallus Orso' } };
  const border = { complete: true, destinationIds: [] };
  const at = aftermath => borderGoal({ border, aftermath }, world);
  assert.equal(borderGoal({ border }, world).kind, 'done', 'a host without the chapter still stops at the battle');
  assert.equal(at({ variant: null, stage: 'not-started', complete: false, built: false, destinationIds: [] }).kind, 'done');
  const rally = at({ variant: 'moros-fallback', stage: 'rally', complete: false, built: true, destinationIds: ['aftermath-tribune'] });
  assert.deepEqual([rally.kind, rally.npcId, rally.target], ['talk', 'aftermath-tribune', world.npcPositions['aftermath-tribune']]);
  assert.match(rally.intent, /Gallus Orso/);
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

test('the autopilot carries the terms to Solis, keeps the Empire’s contract, reports to the Legate and marches to the line', async () => {
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

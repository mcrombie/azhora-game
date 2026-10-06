import test from 'node:test';
import assert from 'node:assert/strict';
import { sourceModule } from './module-loader.js';
import { LOCOMOTION } from '../src/gameplay/movement/locomotion-skills.js';
const novice={walking:LOCOMOTION.walkStart,running:LOCOMOTION.runStart};
const mastered={walking:LOCOMOTION.walkCap,running:LOCOMOTION.runCap};

const THREE = await sourceModule('../vendor/three.module.js');
const { createDwarfAutopilot } = await sourceModule('../src/gameplay/autoplay/dwarf-autopilot.js');
const { createBaldroHost } = await sourceModule('../src/content/regions/baldro/baldro-host.js');
const { BALDRO_KINGDOMS, baldroPathDistance } = await sourceModule('../src/content/regions/baldro/baldro-world.js');
const { bodyWorld, BODY } = await sourceModule('../src/gameplay/combat/bodies.js');
const { moveCharacter } = await sourceModule('../src/gameplay/movement/game-state.js');
const WEST = BALDRO_KINGDOMS[0];
const gap = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const still = { forward: 0, side: 0, run: false };

function fixture(movementSpeeds=novice) {
  const scene = new THREE.Scene(), player = { group: new THREE.Group() };
  const world = { bounds: { minX: -20000, maxX: 20000, minZ: -20000, maxZ: 20000 }, colliders: [], heightAt: () => 100 };
  const navigation = bodyWorld(world), rewards = [], choices = [], interactions = [], stages = new Set(), events = [];
  let mode = 'playing', dialogue = null, portals = 0, feetTravel = 0, outsideTravel = 0, maxRoadDistance = 0;
  const closeDialogue = () => { mode = 'playing'; dialogue = null; };
  const host = createBaldroHost({ scene, world, player, reward: value => rewards.push(value), toast: () => {},
    openDialogue: (npc, lines, ignored, label, options = {}) => { mode = 'dialogue'; dialogue = { npc, lines, index: 0, ...options }; },
    closeDialogue, transition: () => { portals++; } });
  const shown = () => dialogue?.index === dialogue?.lines.length - 1 ? dialogue.choices ?? [] : [];
  const reduce = near => near && { kind: near.kind, id: near.id ?? near.hold?.kingdom.id, personId: near.person?.id, siteId: near.site?.id };
  const at = p => player.group.position.set(p.x, p.y ?? 100, p.z);
  at({ x: WEST.gate.x - 5, y: 100, z: WEST.gate.z + 13 });
  const pilot = createDwarfAutopilot({ world: navigation,
    read: () => ({ mode, movementSpeeds, position: player.group.position, quest: host.introductionView(), inside: host.current,
      interaction: reduce(host.nearby()), dialogue: dialogue && { npcId: dialogue.npc.id, choices: shown().map(c => ({ id: c.id, enabled: !c.disabled })) },
      combat: { hp: 100, phase: 'peaceful', action: 'idle' } }),
    options: { choicePace: .1, dialoguePace: .1, interactEvery: .1 },
    act: {
      interact: () => {
        const target = host.nearby(); assert.ok(target, 'F requires a real nearby host interaction');
        interactions.push({ target: reduce(target), stage: host.introductionView().stage, inside: host.current });
        if (target.kind === 'gate') assert.ok(host.model.canEnter('west'), 'the demo earns permission before entering');
        assert.equal(host.interact(), true);
      },
      choose: ({ id }) => {
        const choice = shown().find(c => c.id === id && !c.disabled);
        assert.ok(choice, `only a currently offered enabled reply may be selected: ${id}`);
        choices.push(id); choice.action();
      },
      continue: () => {
        assert.ok(dialogue && !shown().length);
        if (dialogue.index < dialogue.lines.length - 1) dialogue.index++;
        else { const done = dialogue.onComplete; closeDialogue(); done?.(); }
      },
    } });
  pilot.onEvent(event => events.push(event));
  function tick(dt = .1) {
    navigation.setBodies(host.bodies()).moving(player.group.position, BODY.traveler, 'traveler');
    pilot.step(dt);
    if (mode === 'playing') {
      const before = { ...player.group.position }, { forward, side, basisYaw = 0, run } = pilot.move, speed = run ? movementSpeeds.running : movementSpeeds.walking;
      const dx = (-Math.sin(basisYaw) * forward + Math.cos(basisYaw) * side) * speed * dt;
      const dz = (-Math.cos(basisYaw) * forward - Math.sin(basisYaw) * side) * speed * dt;
      if (host.active) host.move(player.group.position, dx, dz);
      else { moveCharacter(player.group.position, dx, dz, navigation); player.group.position.y = 100; }
      const moved = gap(before, player.group.position); feetTravel += moved;
      assert.ok(moved <= speed * dt + .0001, 'movement is ordinary walking/running, never a teleport');
      if (host.active) assert.equal(host.holds.find(h => h.kingdom.id === host.current).walk.canStand(player.group.position.x, player.group.position.z), true, 'the path stays in collision-valid room floors');
      else { outsideTravel += moved; maxRoadDistance = Math.max(maxRoadDistance, baldroPathDistance(player.group.position.x, player.group.position.z)); }
    }
    stages.add(host.introductionView().stage);
  }
  return { host, pilot, player, rewards, choices, interactions, stages, events, tick, at,
    get mode() { return mode; }, set mode(value) { mode = value; }, get portals() { return portals; },
    get feetTravel() { return feetTravel; }, get outsideTravel() { return outsideTravel; }, get maxRoadDistance() { return maxRoadDistance; } };
}

for(const movementSpeeds of [novice,mastered])test(`Dwarfland autoplay at ${movementSpeeds.walking}/${movementSpeeds.running} earns entry, walks the actual hall geometry and makes the three-step rivet through real conversations`, () => {
  const f = fixture(movementSpeeds); f.pilot.start();
  for (let i = 0; i < 5000 && f.pilot.active; i++) f.tick();
  assert.ok(f.host.introductionView().complete, JSON.stringify({ reason: f.pilot.reason, intent: f.pilot.intent, position: f.player.group.position, quest: f.host.introductionView(), choices: f.choices }));
  assert.equal(f.pilot.active, false); assert.equal(f.mode, 'playing'); assert.equal(f.events.at(-1).completed, true);
  assert.equal(f.events.at(-1).questId, 'dwarf-introduction'); assert.equal(f.host.current, WEST.id);
  assert.ok(f.portals >= 1); assert.ok(f.outsideTravel > 200); assert.ok(f.feetTravel > f.outsideTravel + 40);
  assert.ok(f.maxRoadDistance < 15, `the traveler follows the switchback approach instead of cutting across steep mountains: ${f.maxRoadDistance}`);
  assert.deepEqual([...f.stages], ['unoffered', 'service', 'report', 'enter', 'smith', 'forge', 'reward', 'complete']);
  assert.deepEqual(f.choices, ['west-baldro-intro-accept', 'west-baldro-report', 'west-baldro-lesson', 'west-baldro-lesson-finish']);
  assert.equal(f.interactions.filter(e => e.target.kind === 'site').length, 3);
  assert.equal(f.interactions.filter(e => e.target.kind === 'forge').length, 3);
  assert.deepEqual(f.rewards.filter(r => r.skill === 'construction'), [{ skill: 'construction', xp: 30 }]);
  assert.equal(f.rewards.filter(r => r.skill === 'dwarvenSmithing').length, 1);
  assert.equal(f.host.model.canEnter('east'), false, 'the two kingdoms retain independent admission');
});

test('pausing and human takeover freeze input; a saved mid-forge lesson resumes outside, enters normally and rewards once', () => {
  const f = fixture(); let saved = false, paused = false;
  f.pilot.start();
  for (let i = 0; i < 6000 && f.pilot.active; i++) {
    f.tick(); const q = f.host.introductionView();
    if (q.stage === 'forge' && q.forgeStep === 1 && !saved) {
      const snapshot = f.host.snapshot(), before = JSON.parse(JSON.stringify(snapshot)), rewardCount = f.rewards.length;
      f.mode = 'pause'; for (let n = 0; n < 600; n++) f.tick(.25);
      assert.ok(f.pilot.active); assert.deepEqual(f.pilot.move, still); assert.deepEqual(f.host.snapshot(), before); paused = true;
      f.pilot.stop('You took control.'); f.mode = 'playing';
      for (let n = 0; n < 20; n++) f.tick();
      assert.deepEqual(f.host.snapshot(), before); assert.equal(f.rewards.length, rewardCount);
      assert.ok(f.host.restore(snapshot)); assert.equal(f.host.active, false); assert.equal(f.host.introductionView().forgeStep, 1);
      assert.equal(f.host.introductionView().target.kind, 'gate');
      f.pilot.start(); saved = true;
    }
  }
  assert.ok(saved && paused); assert.ok(f.host.introductionView().complete, JSON.stringify({ reason: f.pilot.reason, quest: f.host.introductionView() }));
  assert.equal(f.interactions.filter(e => e.target.kind === 'forge').length, 3);
  assert.equal(f.interactions.filter(e => e.target.kind === 'gate').length, 2);
  assert.equal(f.rewards.filter(r => r.skill === 'dwarvenSmithing').length, 1);
  const count = f.rewards.length; f.pilot.start(); f.tick(); assert.equal(f.pilot.active, false); assert.equal(f.rewards.length, count);
});

function base() {
  return { mode: 'playing', position: { x: WEST.gate.x - 5, y: 100, z: WEST.gate.z + 10 },
    quest: { stage: 'unoffered', complete: false, target: { id: 'west-baldro-guard-0', kind: 'guard', x: WEST.gate.x - 5, z: WEST.gate.z + 9.8 } },
    interaction: { kind: 'guard', personId: 'west-baldro-guard-0' }, combat: { phase: 'peaceful', action: 'idle', hp: 100 } };
}

test('invalid tasks, unrelated conversations, disabled replies and combat return control without skipping the gate', () => {
  for (const failure of ['stage', 'position', 'target', 'speaker', 'reply', 'fight', 'death']) {
    const s = base(), actions = [];
    if (failure === 'stage') s.quest.stage = 'missing';
    if (failure === 'position') s.position.x = NaN;
    if (failure === 'target') s.quest.target = null;
    if (failure === 'speaker') { s.mode = 'dialogue'; s.dialogue = { npcId: 'east-baldro-guard-0', choices: [] }; }
    if (failure === 'reply') { s.mode = 'dialogue'; s.dialogue = { npcId: 'west-baldro-guard-0', choices: [{ id: 'west-baldro-intro-accept', enabled: false }, { id: 'west-baldro-enter' }] }; }
    if (failure === 'fight') s.combat.phase = 'active';
    if (failure === 'death') s.combat.hp = 0;
    const pilot = createDwarfAutopilot({ read: () => s, act: { interact: a => actions.push(a), choose: a => actions.push(a) } });
    pilot.start(); for (let i = 0; i < 12; i++) pilot.step(.25);
    assert.equal(pilot.active, false, failure); assert.deepEqual(actions, [], failure); assert.deepEqual(pilot.move, still);
  }
});

test('blocked approach stops without invoking a portal, granting admission or inventing an interaction', () => {
  const s = base(), actions = [], before = JSON.stringify(s);
  s.interaction = null; s.quest.target = { id: 'west-cairn-1', kind: 'site', ...WEST.taskSites[0] }; s.quest.stage = 'service';
  const expected = JSON.stringify(s), pilot = createDwarfAutopilot({ read: () => s,
    world: { bounds: { minX: -20000, maxX: 20000, minZ: -20000, maxZ: 20000 }, colliders: [], heightAt: () => 100 },
    options: { idleLimit: 1 }, act: { interact: a => actions.push(a), choose: a => actions.push(a), enter: a => actions.push(a), teleport: a => actions.push(a) } });
  pilot.start(); for (let i = 0; i < 12; i++) pilot.step(.25); // Host refuses movement, as a blocked collision would.
  assert.equal(pilot.active, false); assert.match(pilot.reason, /could not make progress/); assert.deepEqual(actions, []);
  assert.equal(JSON.stringify(s), expected); assert.notEqual(before, expected); assert.deepEqual(pilot.move, still);
});

test('saved workshop stages use only the guard entry reply when resuming outside in a gate conversation', () => {
  for (const stage of ['smith', 'forge', 'reward']) {
    const s = base(), choices = []; s.mode = 'dialogue'; s.quest.stage = stage;
    s.dialogue = { npcId: 'west-baldro-guard-0', choices: [{ id: 'west-baldro-enter' }, { id: 'west-baldro-history' }] };
    const pilot = createDwarfAutopilot({ read: () => s, act: { choose: choice => choices.push(choice.id) } });
    pilot.start(); for (let i = 0; i < 4; i++) pilot.step(.25);
    assert.deepEqual(choices, ['west-baldro-enter']); assert.ok(pilot.active);
  }
});

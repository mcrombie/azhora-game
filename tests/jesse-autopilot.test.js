import test from 'node:test';
import assert from 'node:assert/strict';
import { createJesseAutopilot } from '../src/gameplay/autoplay/jesse-autopilot.js';
import { createJesseCarriage, JESSE_QUEST } from '../src/content/quests/jesse/jesse-carriage-quest.js';
import { createJesseCarriageHost } from '../src/content/quests/jesse/jesse-carriage-host.js';
import { CARRIAGE_PARTS, JESSE, JESSE_WORKSHOP, JESSE_GUILD } from '../src/content/quests/jesse/jesse-carriage-world.js';
import { createInventoryState } from '../src/gameplay/inventory/inventory.js';
import { createSkills } from '../src/gameplay/skills/skills.js';
import { PLANKS } from '../src/gameplay/skills/woodcutting/construction.js';
import { BODY, bodyWorld } from '../src/gameplay/combat/bodies.js';
import { moveCharacter, canStand } from '../src/gameplay/movement/game-state.js';

const gap = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const world = () => ({ bounds: { minX: -2000, maxX: 2000, minZ: -2000, maxZ: 2000 }, colliders: [], heightAt: () => 1 });
const still = { forward: 0, side: 0, run: false };
const base = () => ({ mode: 'playing', position: { x: JESSE_WORKSHOP.stand.x + 2, z: JESSE_WORKSHOP.stand.z },
  quest: { stage: 'available', collected: [], assembly: 0, cart: { ...JESSE_WORKSHOP.carriage }, jesse: { ...JESSE_WORKSHOP.stand } },
  jesse: { ...JESSE_WORKSHOP.stand, available: true }, combat: { phase: 'peaceful', action: 'idle', hp: 100 },
  interaction: { npcId: JESSE.id }, riding: { mounted: false }, sneaking: false });
const ticks = (pilot, count, dt = .25) => { let result; for (let i = 0; i < count; i++) result = pilot.step(dt); return result; };

test('Jesse autoplay walks for every part, uses the real lesson choices, and leaves the carriage journey to the quest', () => {
  const terrain = world(), navigation = bodyWorld(terrain), inventory = createInventoryState(), skills = createSkills();
  // The workshop's bench obstructs a direct shortcut across the middle.
  terrain.colliders.push({ x: -691, z: 182, hx: 2.1, hz: .7, kind: 'prop' });
  terrain.npcPositions = {};
  const vector = (x, y, z) => ({ x, y, z, set(a, b, c) { this.x = a; this.y = b; this.z = c; } });
  const player = { group: { position: vector(JESSE_WORKSHOP.stand.x + 2, 1, JESSE_WORKSHOP.stand.z) } };
  const npc = { id: JESSE.id, actor: { group: { position: vector(0, 1, 0), rotation: { y: 0 }, visible: true } } };
  const quest = createJesseCarriage({ inventory, skills });
  let mode = 'playing', dialogue = null, footDistance = 0, rideDistance = 0, mountedFrames = 0, tookOverParts = false, tookOverRide = false;
  const chosen = [], collected = [], events = [], notices = [], pos = player.group.position;
  const closeDialogue = () => { mode = 'playing'; dialogue = null; };
  const shownChoices = () => dialogue?.index === dialogue?.lines.length - 1 ? dialogue.choices : [];
  const ordinaryStep = (from, target, amount) => {
    const distance = gap(from, target), t = Math.min(1, amount / (distance || 1));
    return { x: from.x + (target.x - from.x) * t, z: from.z + (target.z - from.z) * t };
  };
  const host = createJesseCarriageHost({ quest, world: terrain, npc, player, moveCart: ordinaryStep, moveJesse: ordinaryStep,
    openDialogue: (person, lines, unused, title, options) => { mode = 'dialogue'; dialogue = { npcId: person.id, lines, index: 0, ...options }; },
    closeDialogue, toast: text => notices.push(text),
    seatRiders: (view, state) => {
      pos.set(state.cart.x, 2, state.cart.z); npc.actor.group.position.set(state.cart.x, 2, state.cart.z);
    },
    onDismount: at => pos.set(at.x, 1, at.z),
  });
  host.sync();
  const interaction = () => !npc.hidden && gap(pos, npc.actor.group.position) < 2.6
    ? { npcId: JESSE.id } : { siteId: host.nearby()?.id };
  const pilot = createJesseAutopilot({ world: navigation,
    read: () => ({ mode, position: { ...pos }, quest: host.state(), jesse: { ...npc.actor.group.position, available: !npc.hidden },
      interaction: interaction(), dialogue: dialogue && { npcId: dialogue.npcId,
        choices: shownChoices().map(choice => ({ id: choice.id, enabled: !choice.disabled })) },
      riding: { mounted: quest.view().mounted }, combat: { phase: 'peaceful', action: 'idle', hp: 100 } }),
    options: { dialoguePace: .1, choicePace: .1, interactEvery: .1 },
    act: {
      interact: () => {
        const available = interaction();
        if (available.npcId) assert.ok(host.conversation(npc));
        else {
          const site = host.nearby(); assert.ok(site, 'F requires a real nearby interaction');
          if (site.kind === 'part') { assert.ok(gap(pos, site) <= site.reach); collected.push(site.id); }
          assert.ok(host.interact(site));
        }
      },
      continue: () => {
        assert.ok(dialogue && !shownChoices().length);
        if (dialogue.index < dialogue.lines.length - 1) dialogue.index++; else closeDialogue();
      },
      choose: ({ id }) => {
        const reply = shownChoices().find(choice => choice.id === id && !choice.disabled);
        assert.ok(reply, `only a visible, enabled ordinary response may be chosen: ${id}`);
        chosen.push(id); reply.action();
      },
      dismount: () => assert.fail('The pilot must never dismount the quest-owned carriage'),
    },
  });
  pilot.onEvent(event => events.push(event)); pilot.start();
  for (let frame = 0; frame < 10000 && pilot.active; frame++) {
    const dt = .1, old = host.state();
    navigation.setBodies([{ id: JESSE.id, ...npc.actor.group.position, r: BODY.person }, ...host.bodies()])
      .moving(pos, BODY.traveler, 'traveler');
    pilot.step(dt);
    if (host.state().mounted) {
      mountedFrames++; assert.deepEqual(pilot.move, still); assert.equal(pilot.yaw, null);
    } else if (mode === 'playing') {
      const beforeWalk = { ...pos };
      const { forward, side, basisYaw = 0 } = pilot.move;
      moveCharacter(pos, (-Math.sin(basisYaw) * forward + Math.cos(basisYaw) * side) * 4.2 * dt,
        (-Math.cos(basisYaw) * forward - Math.sin(basisYaw) * side) * 4.2 * dt, navigation);
      const moved = gap(beforeWalk, pos); footDistance += moved;
      assert.ok(moved <= .421, 'the pilot has no teleport or direct position-changing action');
      assert.ok(canStand(pos.x, pos.z, terrain));
    }
    host.frame(dt, mode === 'playing', frame * dt);
    rideDistance += gap(old.cart, host.state().cart);
    if ((!tookOverParts && host.state().collected.length === 2) || (!tookOverRide && mountedFrames === 10)) {
      if (mountedFrames) tookOverRide = true; else tookOverParts = true;
      const saved = host.snapshot(), xp = skills.xp('construction');
      pilot.stop('You took control.'); assert.equal(pilot.step(.25), null);
      assert.deepEqual(host.snapshot(), saved); assert.equal(host.restore(saved), true);
      pilot.start(); assert.deepEqual(host.snapshot(), saved); assert.equal(skills.xp('construction'), xp);
    }
  }
  assert.equal(host.state().stage, 'inside', JSON.stringify({ reason: pilot.reason, intent: pilot.intent, state: host.state(), position: pos, chosen }));
  assert.equal(pilot.active, false); assert.equal(events.at(-1).completed, true); assert.equal(events.at(-1).questId, JESSE_QUEST.id);
  assert.deepEqual([...collected].sort(), CARRIAGE_PARTS.map(part => part.id).sort());
  assert.deepEqual(chosen, ['jesse-accept', 'jesse-timber-pine', 'jesse-assemble-frame', 'jesse-assemble-wheels', 'jesse-assemble-braces', 'jesse-leave', 'jesse-board']);
  assert.ok(footDistance > 55); assert.ok(rideDistance > 400); assert.ok(mountedFrames > 100); assert.ok(tookOverParts && tookOverRide);
  assert.equal(skills.xp('construction'), PLANKS['pine-plank'].xp * 4 + 45); assert.equal(inventory.count('carriage-wheel'), 0); assert.equal(inventory.count('carriage-pine-bundle'), 0);
  assert.ok(gap(host.state().jesse, JESSE_GUILD.door) < .15); assert.ok(notices.some(text => text.includes('Knock')));
  assert.deepEqual(pilot.move, still);
});

test('resumed collecting targets only missing parts and does not consume an alternative timber choice', () => {
  const snapshot = base(), calls = [];
  snapshot.quest.stage = 'collecting'; snapshot.quest.collected = CARRIAGE_PARTS.slice(0, 3).map(part => part.id); snapshot.interaction = {};
  const pilot = createJesseAutopilot({ world: world(), read: () => snapshot, act: { choose: action => calls.push(action) } });
  pilot.start(); assert.equal(pilot.step(.1).targetId, 'timber');
  snapshot.mode = 'dialogue'; snapshot.dialogue = { npcId: JESSE.id, choices: [{ id: 'jesse-timber-oak' }, { id: 'jesse-leave' }] };
  ticks(pilot, 5); assert.deepEqual(calls, [{ type: 'choose', id: 'jesse-leave' }]);
  snapshot.quest.collected = CARRIAGE_PARTS.map(part => part.id);
  ticks(pilot, 5); assert.equal(pilot.active, false); assert.match(pilot.reason, /expected reply/);
});

test('all menus freeze Jesse pilot pace and timeouts and manual takeover requires an explicit restart', () => {
  const snapshot = base(), calls = [], pilot = createJesseAutopilot({ world: world(), read: () => snapshot,
    options: { idleLimit: 1, maxSeconds: 1 }, act: { interact: action => calls.push(action) } });
  pilot.start(); pilot.step(.25);
  for (const mode of ['pause', 'journal', 'testing']) {
    snapshot.mode = mode; ticks(pilot, 1000); assert.equal(pilot.active, true); assert.deepEqual(pilot.move, still); assert.equal(pilot.yaw, null);
  }
  snapshot.mode = 'playing'; pilot.step(.25); assert.deepEqual(calls, []);
  pilot.step(.25); assert.deepEqual(calls, [{ type: 'interact' }]);
  pilot.stop('You took control.'); ticks(pilot, 1000); assert.equal(pilot.active, false); assert.equal(pilot.reason, 'You took control.');
  assert.ok(pilot.start()); assert.equal(pilot.active, true);
});

test('disabled or missing expected choices never trigger an unrelated response', () => {
  for (const choices of [[{ id: 'jesse-accept', enabled: false }], [{ id: 'jesse-accept', disabled: true }, { id: 'jesse-leave' }], [{ id: 'leave' }]]) {
    const snapshot = base(), calls = [];
    snapshot.mode = 'dialogue'; snapshot.dialogue = { npcId: JESSE.id, choices };
    const pilot = createJesseAutopilot({ world: world(), read: () => snapshot, act: { choose: action => calls.push(action) } });
    pilot.start(); ticks(pilot, 6); assert.equal(pilot.active, false); assert.match(pilot.reason, /expected reply/); assert.deepEqual(calls, []);
  }
});

test('unavailable Jesse, death, battles, missing carriage and unexpected conversation stop cleanly', () => {
  for (const failure of ['Jesse', 'death', 'battle', 'position', 'stage', 'carriage', 'conversation']) {
    const snapshot = base(), calls = [];
    if (failure === 'Jesse') snapshot.jesse.available = false;
    if (failure === 'death') snapshot.combat.hp = 0;
    if (failure === 'battle') snapshot.combat.phase = 'active';
    if (failure === 'position') snapshot.position.x = NaN;
    if (failure === 'stage') snapshot.quest.stage = 'lost';
    if (failure === 'carriage') { snapshot.quest.stage = 'ready'; snapshot.quest.cart = null; }
    if (failure === 'conversation') { snapshot.mode = 'dialogue'; snapshot.dialogue = { npcId: 'other-person' }; }
    const pilot = createJesseAutopilot({ world: world(), read: () => snapshot, act: { interact: action => calls.push(action) } });
    pilot.start(); ticks(pilot, 10); assert.equal(pilot.active, false, failure); assert.deepEqual(calls, []); assert.deepEqual(pilot.move, still);
  }
});

test('a stalled walk or carriage eventually returns control instead of hanging forever', () => {
  for (const stage of ['available', 'riding', 'entering']) {
    const snapshot = base(); snapshot.quest.stage = stage; snapshot.interaction = {};
    const pilot = createJesseAutopilot({ world: world(), read: () => snapshot, options: { idleLimit: 1 } });
    pilot.start(); ticks(pilot, 8); assert.equal(pilot.active, false); assert.match(pilot.reason, /could not make progress/);
  }
});

test('horse and stealth preparation are ordinary actions while completed visits finish without calling Jesse back out', () => {
  const snapshot = base(), calls = [], events = [];
  snapshot.riding.mounted = true;
  const pilot = createJesseAutopilot({ world: world(), read: () => snapshot, act: {
    dismount: action => calls.push(action), toggleSneak: action => calls.push(action), interact: action => calls.push(action),
  } });
  pilot.onEvent(event => events.push(event)); pilot.start(); ticks(pilot, 3);
  assert.deepEqual(calls, [{ type: 'dismount' }]); assert.deepEqual(pilot.move, still);
  snapshot.riding.mounted = false; snapshot.sneaking = true; ticks(pilot, 3);
  assert.deepEqual(calls.at(-1), { type: 'toggleSneak' });
  for (const stage of ['inside', 'coming-out', 'outside']) {
    snapshot.quest.stage = stage; snapshot.jesse.available = false; pilot.start(); pilot.step(.1);
    assert.equal(pilot.active, false); assert.equal(events.at(-1).completed, true);
  }
  assert.equal(calls.length, 2);
});
